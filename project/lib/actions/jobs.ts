"use server";

/**
 * Server actions for fetching jobs and job clusters
 */

import { createClient } from "../supabase/server";
import type { JobClusterRow, JobRow, WorkSession } from "@/types/volition";
import {
  startSession,
  endCurrentSession,
  isSessionActive,
} from "@/lib/utils/work-sessions";
import { checkMilestoneCompletion, syncMilestoneStatusIfNeeded } from "./milestone-verification";

export interface JobsData {
  jobClusters: JobClusterRow[];
  jobs: JobRow[];
}

/**
 * Fetches all job clusters and jobs for a milestone
 * 
 * @param milestoneId - The milestone ID to fetch jobs for
 * @returns Object containing job clusters and jobs arrays
 * @throws Error if milestone doesn't exist or user doesn't have access
 */
export async function getJobsForMilestone(milestoneId: string): Promise<JobsData> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User authentication required");
  }

  // Verify milestone exists and user has access
  // First get the milestone with its phase
  const { data: milestoneData, error: milestoneError } = await supabase
    .from("milestones")
    .select("id, phase_id")
    .eq("id", milestoneId)
    .single();

  if (milestoneError || !milestoneData) {
    throw new Error(milestoneError?.message || "Milestone not found");
  }

  // Then verify the phase belongs to a goal owned by the user
  const { data: phaseData, error: phaseError } = await supabase
    .from("phases")
    .select("goal_id")
    .eq("id", milestoneData.phase_id)
    .single();

  if (phaseError || !phaseData) {
    throw new Error("Phase not found for milestone");
  }

  // Verify goal ownership
  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("user_id")
    .eq("id", phaseData.goal_id)
    .single();

  if (goalError || !goalData) {
    throw new Error("Goal not found for phase");
  }

  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to milestone");
  }

  // Fetch job clusters for this milestone, ordered by created_at
  const { data: jobClusters, error: clustersError } = await supabase
    .from("job_clusters")
    .select("*")
    .eq("milestone_id", milestoneId)
    .order("created_at", { ascending: true });

  if (clustersError) {
    throw new Error(`Failed to fetch job clusters: ${clustersError.message}`);
  }

  // If no clusters exist, return empty arrays
  if (!jobClusters || jobClusters.length === 0) {
    return {
      jobClusters: [],
      jobs: [],
    };
  }

  // Get all cluster IDs
  const clusterIds = jobClusters.map((cluster) => cluster.id);

  // Fetch jobs for all clusters, ordered by created_at
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("*")
    .in("job_cluster_id", clusterIds)
    .order("created_at", { ascending: true });

  if (jobsError) {
    throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
  }

  // Parse work_sessions and failure_history for each job
  const parsedJobs: JobRow[] = (jobs || []).map((job) => {
    const workSessions: WorkSession[] = job.work_sessions
      ? (Array.isArray(job.work_sessions) ? job.work_sessions : [])
      : [];
    const failureHistory = job.failure_history
      ? (Array.isArray(job.failure_history) ? job.failure_history : [])
      : [];
    return {
      ...job,
      work_sessions: workSessions,
      failure_history: failureHistory,
    } as JobRow;
  });

  // Sync milestone status if all jobs are completed (handles cases where jobs were updated outside markJobDone)
  try {
    await syncMilestoneStatusIfNeeded(milestoneId);
  } catch (error) {
    // Don't fail the entire request if milestone sync fails - just log it
    console.error("Failed to sync milestone status:", error);
  }

  return {
    jobClusters: (jobClusters || []) as JobClusterRow[],
    jobs: parsedJobs,
  };
}

export interface GoalJobsData {
  jobClusters: JobClusterRow[];
  jobs: JobRow[];
  milestones: Array<{ id: string; title: string }>;
}

/**
 * Fetches all job clusters and jobs for a goal (across all milestones)
 * 
 * @param goalId - The goal ID to fetch jobs for
 * @returns Object containing job clusters, jobs, and milestones arrays
 * @throws Error if goal doesn't exist or user doesn't have access
 */
export async function getJobsForGoal(goalId: string): Promise<GoalJobsData> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User authentication required");
  }

  // Verify goal exists and user owns it
  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("id, user_id")
    .eq("id", goalId)
    .single();

  if (goalError || !goalData) {
    throw new Error(goalError?.message || "Goal not found");
  }

  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to goal");
  }

  // Fetch all phases for this goal
  const { data: phases, error: phasesError } = await supabase
    .from("phases")
    .select("id")
    .eq("goal_id", goalId);

  if (phasesError) {
    throw new Error(`Failed to fetch phases: ${phasesError.message}`);
  }

  if (!phases || phases.length === 0) {
    return {
      jobClusters: [],
      jobs: [],
      milestones: [],
    };
  }

  // Get all phase IDs
  const phaseIds = phases.map((phase) => phase.id);

  // Fetch all milestones for all phases
  const { data: milestones, error: milestonesError } = await supabase
    .from("milestones")
    .select("id, title")
    .in("phase_id", phaseIds);

  if (milestonesError) {
    throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
  }

  if (!milestones || milestones.length === 0) {
    return {
      jobClusters: [],
      jobs: [],
      milestones: [],
    };
  }

  const milestoneIds = milestones.map((m) => m.id);

  // Fetch all job clusters for all milestones
  const { data: jobClusters, error: clustersError } = await supabase
    .from("job_clusters")
    .select("*")
    .in("milestone_id", milestoneIds)
    .order("created_at", { ascending: true });

  if (clustersError) {
    throw new Error(`Failed to fetch job clusters: ${clustersError.message}`);
  }

  // If no clusters exist, return empty arrays
  if (!jobClusters || jobClusters.length === 0) {
    return {
      jobClusters: [],
      jobs: [],
      milestones: milestones.map((m) => ({ id: m.id, title: m.title })),
    };
  }

  // Get all cluster IDs
  const clusterIds = jobClusters.map((cluster) => cluster.id);

  // Fetch all jobs for all clusters
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("*")
    .in("job_cluster_id", clusterIds)
    .order("created_at", { ascending: true });

  if (jobsError) {
    throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
  }

  // Parse work_sessions and failure_history for each job
  const parsedJobs: JobRow[] = (jobs || []).map((job) => {
    const workSessions: WorkSession[] = job.work_sessions
      ? (Array.isArray(job.work_sessions) ? job.work_sessions : [])
      : [];
    const failureHistory = job.failure_history
      ? (Array.isArray(job.failure_history) ? job.failure_history : [])
      : [];
    return {
      ...job,
      work_sessions: workSessions,
      failure_history: failureHistory,
    } as JobRow;
  });

  return {
    jobClusters: (jobClusters || []) as JobClusterRow[],
    jobs: parsedJobs,
    milestones: milestones.map((m) => ({ id: m.id, title: m.title })),
  };
}

/**
 * Verifies that a job belongs to a goal owned by the authenticated user
 * 
 * @param jobId - The job ID to verify
 * @returns The job data if verified
 * @throws Error if job doesn't exist or user doesn't have access
 */
export async function verifyJobAccess(jobId: string): Promise<JobRow> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User authentication required");
  }

  // Get the job
  const { data: jobData, error: jobError } = await supabase
    .from("jobs")
    .select("id, job_cluster_id, status, failure_count")
    .eq("id", jobId)
    .single();

  if (jobError || !jobData) {
    throw new Error(jobError?.message || "Job not found");
  }

  // Get the job cluster
  const { data: clusterData, error: clusterError } = await supabase
    .from("job_clusters")
    .select("id, milestone_id")
    .eq("id", jobData.job_cluster_id)
    .single();

  if (clusterError || !clusterData) {
    throw new Error("Job cluster not found");
  }

  // Get the milestone
  const { data: milestoneData, error: milestoneError } = await supabase
    .from("milestones")
    .select("id, phase_id")
    .eq("id", clusterData.milestone_id)
    .single();

  if (milestoneError || !milestoneData) {
    throw new Error("Milestone not found");
  }

  // Get the phase
  const { data: phaseData, error: phaseError } = await supabase
    .from("phases")
    .select("id, goal_id")
    .eq("id", milestoneData.phase_id)
    .single();

  if (phaseError || !phaseData) {
    throw new Error("Phase not found");
  }

  // Get the goal and verify ownership
  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("id, user_id")
    .eq("id", phaseData.goal_id)
    .single();

  if (goalError || !goalData) {
    throw new Error("Goal not found");
  }

  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to job");
  }

  // Fetch the full job data
  const { data: fullJobData, error: fullJobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (fullJobError || !fullJobData) {
    throw new Error("Failed to fetch job data");
  }

  // Parse work_sessions from JSONB (default to empty array if null/undefined)
  const workSessions: WorkSession[] = fullJobData.work_sessions
    ? (Array.isArray(fullJobData.work_sessions)
        ? fullJobData.work_sessions
        : [])
    : [];

  // Parse failure_history from JSONB (default to empty array if null/undefined)
  const failureHistory = fullJobData.failure_history
    ? (Array.isArray(fullJobData.failure_history)
        ? fullJobData.failure_history
        : [])
    : [];

  return {
    ...fullJobData,
    work_sessions: workSessions,
    failure_history: failureHistory,
  } as JobRow;
}

/**
 * Starts a job (changes status to ACTIVE)
 * 
 * @param jobId - The job ID to start
 * @returns The updated job
 * @throws Error if job doesn't exist, user doesn't have access, or job is not in PENDING status
 */
export async function startJob(jobId: string): Promise<JobRow> {
  const supabase = await createClient();

  // Verify access and get current job
  const currentJob = await verifyJobAccess(jobId);

  // Verify job is in PENDING status
  if (currentJob.status !== "PENDING") {
    throw new Error(`Cannot start job: job is in ${currentJob.status} status`);
  }

  // Start a new work session
  const updatedSessions = startSession(currentJob.work_sessions || []);

  // Update job status to ACTIVE and add work session
  const { data: updatedJob, error: updateError } = await supabase
    .from("jobs")
    .update({
      status: "ACTIVE",
      work_sessions: updatedSessions,
    })
    .eq("id", jobId)
    .select()
    .single();

  if (updateError || !updatedJob) {
    throw new Error(updateError?.message || "Failed to start job");
  }

  // Parse work_sessions
  const workSessions: WorkSession[] = updatedJob.work_sessions
    ? (Array.isArray(updatedJob.work_sessions)
        ? updatedJob.work_sessions
        : [])
    : [];

  // Parse failure_history
  const parsedFailureHistory = updatedJob.failure_history
    ? (Array.isArray(updatedJob.failure_history)
        ? updatedJob.failure_history
        : [])
    : [];

  return {
    ...updatedJob,
    work_sessions: workSessions,
    failure_history: parsedFailureHistory,
  } as JobRow;
}

export interface MarkJobDoneResult {
  job: JobRow;
  milestoneReadyForVerification: boolean;
  milestoneId: string | null;
}

/**
 * Marks a job as done (changes status to COMPLETED)
 * 
 * @param jobId - The job ID to mark as done
 * @returns The updated job and milestone verification status
 * @throws Error if job doesn't exist, user doesn't have access, or job is not in ACTIVE status
 */
export async function markJobDone(jobId: string): Promise<MarkJobDoneResult> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:428',message:'markJobDone called',data:{jobId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const supabase = await createClient();

  // Verify access and get current job
  const currentJob = await verifyJobAccess(jobId);

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:432',message:'Current job status before update',data:{jobId,status:currentJob.status,jobClusterId:currentJob.job_cluster_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // Verify job is in ACTIVE status
  if (currentJob.status !== "ACTIVE") {
    throw new Error(`Cannot mark job as done: job is in ${currentJob.status} status`);
  }

  // End active session if there is one
  const workSessions = currentJob.work_sessions || [];
  const updatedSessions = isSessionActive(workSessions)
    ? endCurrentSession(workSessions)
    : workSessions;

  // Update job status to COMPLETED and end active session
  const { data: updatedJob, error: updateError } = await supabase
    .from("jobs")
    .update({
      status: "COMPLETED",
      work_sessions: updatedSessions,
    })
    .eq("id", jobId)
    .select()
    .single();

  if (updateError || !updatedJob) {
    throw new Error(updateError?.message || "Failed to mark job as done");
  }

  // Parse work_sessions
  const parsedSessions: WorkSession[] = updatedJob.work_sessions
    ? (Array.isArray(updatedJob.work_sessions)
        ? updatedJob.work_sessions
        : [])
    : [];

  // Parse failure_history
  const parsedFailureHistory = updatedJob.failure_history
    ? (Array.isArray(updatedJob.failure_history)
        ? updatedJob.failure_history
        : [])
    : [];

  const completedJob = {
    ...updatedJob,
    work_sessions: parsedSessions,
    failure_history: parsedFailureHistory,
  } as JobRow;

  // Get the milestone ID for this job
  const { data: clusterData, error: clusterError } = await supabase
    .from("job_clusters")
    .select("milestone_id")
    .eq("id", currentJob.job_cluster_id)
    .single();

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:473',message:'Cluster lookup result',data:{jobId,clusterError:clusterError?.message,clusterData,milestoneId:clusterData?.milestone_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  let milestoneReadyForVerification = false;
  let milestoneId: string | null = null;

  if (!clusterError && clusterData) {
    milestoneId = clusterData.milestone_id;

    // Get current milestone status before check
    // #region agent log
    const { data: milestoneStatusBefore, error: statusErrorBefore } = await supabase
      .from("milestones")
      .select("status")
      .eq("id", milestoneId)
      .single();
    fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:485',message:'Milestone status before completion check',data:{milestoneId,currentStatus:milestoneStatusBefore?.status,statusError:statusErrorBefore?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // Check if all jobs in the milestone are now completed
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:487',message:'Calling checkMilestoneCompletion',data:{milestoneId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const allCompleted = await checkMilestoneCompletion(milestoneId!);
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:488',message:'checkMilestoneCompletion result',data:{milestoneId,allCompleted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      if (allCompleted) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:490',message:'All jobs completed, updating milestone',data:{milestoneId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        // Update milestone status to PENDING_VERIFICATION
        const { error: milestoneUpdateError } = await supabase
          .from("milestones")
          .update({
            status: "PENDING_VERIFICATION",
          })
          .eq("id", milestoneId);

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:496',message:'Milestone update result',data:{milestoneId,updateError:milestoneUpdateError?.message,success:!milestoneUpdateError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        if (milestoneUpdateError) {
          // Check if it's a constraint violation (migration not applied)
          if (milestoneUpdateError.message?.includes('milestones_status_check')) {
            console.error(
              "Failed to update milestone status: Database migration not applied. " +
              "Please run migration 006_add_pending_verification_to_milestones.sql in Supabase Dashboard SQL Editor."
            );
          } else {
            console.error("Failed to update milestone status:", milestoneUpdateError);
          }
          // Continue even if milestone update fails - don't block job completion
        } else {
          milestoneReadyForVerification = true;
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:504',message:'Not all jobs completed yet',data:{milestoneId,allCompleted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:505',message:'checkMilestoneCompletion threw error',data:{milestoneId,error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // If check fails, continue without verification status
      // This shouldn't block the job completion
      console.error("Failed to check milestone completion:", error);
    }
  }

  return {
    job: completedJob,
    milestoneReadyForVerification,
    milestoneId,
  };
}

/**
 * Marks a job as failed (changes status to FAILED and increments failure_count)
 * 
 * @param jobId - The job ID to mark as failed
 * @param reason - Optional reason for failure (for future use with Module E)
 * @returns The updated job
 * @throws Error if job doesn't exist, user doesn't have access, or job is not in ACTIVE status
 */
export async function markJobFailed(
  jobId: string,
  reason?: string
): Promise<JobRow> {
  const supabase = await createClient();

  // Verify access and get current job
  const currentJob = await verifyJobAccess(jobId);

  // Verify job is in ACTIVE status
  if (currentJob.status !== "ACTIVE") {
    throw new Error(`Cannot mark job as failed: job is in ${currentJob.status} status`);
  }

  // End active session if there is one
  const workSessions = currentJob.work_sessions || [];
  const updatedSessions = isSessionActive(workSessions)
    ? endCurrentSession(workSessions)
    : workSessions;

  // Increment failure_count and update status to FAILED
  const { data: updatedJob, error: updateError } = await supabase
    .from("jobs")
    .update({
      status: "FAILED",
      failure_count: currentJob.failure_count + 1,
      work_sessions: updatedSessions,
    })
    .eq("id", jobId)
    .select()
    .single();

  if (updateError || !updatedJob) {
    throw new Error(updateError?.message || "Failed to mark job as failed");
  }

  // Parse work_sessions
  const parsedSessions: WorkSession[] = updatedJob.work_sessions
    ? (Array.isArray(updatedJob.work_sessions)
        ? updatedJob.work_sessions
        : [])
    : [];

  // Parse failure_history
  const parsedFailureHistory = updatedJob.failure_history
    ? (Array.isArray(updatedJob.failure_history)
        ? updatedJob.failure_history
        : [])
    : [];

  // TODO: Store failure reason when we add a failure_reason field to the database
  // For now, we just increment failure_count which is used by Module E (Recalibrator)

  return {
    ...updatedJob,
    work_sessions: parsedSessions,
    failure_history: parsedFailureHistory,
  } as JobRow;
}

/**
 * Pauses a job by ending the current active session
 * Job status remains ACTIVE, but the work session is closed
 * 
 * @param jobId - The job ID to pause
 * @returns The updated job
 * @throws Error if job doesn't exist, user doesn't have access, or job is not in ACTIVE status
 */
export async function pauseJob(jobId: string): Promise<JobRow> {
  const supabase = await createClient();

  // Verify access and get current job
  const currentJob = await verifyJobAccess(jobId);

  // Verify job is in ACTIVE status
  if (currentJob.status !== "ACTIVE") {
    throw new Error(`Cannot pause job: job is in ${currentJob.status} status`);
  }

  // End current active session
  const workSessions = currentJob.work_sessions || [];
  const updatedSessions = endCurrentSession(workSessions);

  // Update work_sessions (status remains ACTIVE)
  const { data: updatedJob, error: updateError } = await supabase
    .from("jobs")
    .update({
      work_sessions: updatedSessions,
    })
    .eq("id", jobId)
    .select()
    .single();

  if (updateError || !updatedJob) {
    throw new Error(updateError?.message || "Failed to pause job");
  }

  // Parse work_sessions
  const parsedSessions: WorkSession[] = updatedJob.work_sessions
    ? (Array.isArray(updatedJob.work_sessions)
        ? updatedJob.work_sessions
        : [])
    : [];

  // Parse failure_history
  const parsedFailureHistory = updatedJob.failure_history
    ? (Array.isArray(updatedJob.failure_history)
        ? updatedJob.failure_history
        : [])
    : [];

  return {
    ...updatedJob,
    work_sessions: parsedSessions,
    failure_history: parsedFailureHistory,
  } as JobRow;
}

/**
 * Resumes a paused job by starting a new work session
 * Job must be in ACTIVE status but have no active session
 * 
 * @param jobId - The job ID to resume
 * @returns The updated job
 * @throws Error if job doesn't exist, user doesn't have access, or job is not in ACTIVE status
 */
export async function resumeJob(jobId: string): Promise<JobRow> {
  const supabase = await createClient();

  // Verify access and get current job
  const currentJob = await verifyJobAccess(jobId);

  // Verify job is in ACTIVE status
  if (currentJob.status !== "ACTIVE") {
    throw new Error(`Cannot resume job: job is in ${currentJob.status} status`);
  }

  // Start a new work session
  const workSessions = currentJob.work_sessions || [];
  const updatedSessions = startSession(workSessions);

  // Update work_sessions (status remains ACTIVE)
  const { data: updatedJob, error: updateError } = await supabase
    .from("jobs")
    .update({
      work_sessions: updatedSessions,
    })
    .eq("id", jobId)
    .select()
    .single();

  if (updateError || !updatedJob) {
    throw new Error(updateError?.message || "Failed to resume job");
  }

  // Parse work_sessions
  const parsedSessions: WorkSession[] = updatedJob.work_sessions
    ? (Array.isArray(updatedJob.work_sessions)
        ? updatedJob.work_sessions
        : [])
    : [];

  // Parse failure_history
  const parsedFailureHistory = updatedJob.failure_history
    ? (Array.isArray(updatedJob.failure_history)
        ? updatedJob.failure_history
        : [])
    : [];

  return {
    ...updatedJob,
    work_sessions: parsedSessions,
    failure_history: parsedFailureHistory,
  } as JobRow;
}
