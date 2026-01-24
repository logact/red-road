"use server";

/**
 * Job Mutator Handler (Feature 5.4)
 * 
 * Handles job mutation/regeneration when user confirms they want to change a job.
 * Uses AI to generate an improved version of the job based on user feedback.
 */

import { createClient } from "../supabase/server";
import { verifyJobAccess } from "./jobs";
import { mutateJobCore } from "../ai/job-mutator";
import type { JobRow } from "@/types/volition";

export interface JobMutationResult {
  success: boolean;
  job?: JobRow;
  error?: string;
}

/**
 * Fetches full job context including goal and milestone information
 * 
 * @param jobId - The job ID to fetch context for
 * @returns Job context with goal and milestone information
 */
async function fetchJobContextForMutation(jobId: string): Promise<{
  job: JobRow;
  goal: {
    title: string;
    scope?: {
      tech_stack?: string[];
      user_background_level?: string;
      hard_constraint_hours_per_week?: number;
      definition_of_done?: string;
    };
    complexity?: {
      size: string;
      estimated_total_hours?: number;
    };
  };
  milestone?: {
    title: string;
    acceptance_criteria?: string;
  };
}> {
  const supabase = await createClient();

  // Get the job with full details
  const { data: jobData, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !jobData) {
    throw new Error(jobError?.message || "Job not found");
  }

  const job = jobData as JobRow;

  // Get the job cluster
  const { data: clusterData, error: clusterError } = await supabase
    .from("job_clusters")
    .select("id, milestone_id")
    .eq("id", job.job_cluster_id)
    .single();

  if (clusterError || !clusterData) {
    throw new Error("Job cluster not found");
  }

  // Get the milestone
  const { data: milestoneData, error: milestoneError } = await supabase
    .from("milestones")
    .select("id, title, acceptance_criteria, phase_id")
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

  // Get the goal with scope and complexity
  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("id, title, scope, complexity")
    .eq("id", phaseData.goal_id)
    .single();

  if (goalError || !goalData) {
    throw new Error("Goal not found");
  }

  return {
    job,
    goal: {
      title: goalData.title,
      scope: goalData.scope as {
        tech_stack?: string[];
        user_background_level?: string;
        hard_constraint_hours_per_week?: number;
        definition_of_done?: string;
      } | undefined,
      complexity: goalData.complexity as {
        size: string;
        estimated_total_hours?: number;
      } | undefined,
    },
    milestone: {
      title: milestoneData.title,
      acceptance_criteria: milestoneData.acceptance_criteria || undefined,
    },
  };
}

/**
 * Generates a preview of a mutated job without saving it
 * 
 * @param jobId - The job ID to mutate
 * @param userReason - The user's reason for wanting to change the job
 * @returns Result with preview job data or error
 */
export async function previewJobMutation(
  jobId: string,
  userReason: string
): Promise<{
  success: boolean;
  preview?: {
    title: string;
    type: "QUICK_WIN" | "DEEP_WORK" | "ANCHOR";
    est_minutes: number;
  };
  error?: string;
}> {
  try {
    // Verify access
    await verifyJobAccess(jobId);

    // Fetch full job context
    const context = await fetchJobContextForMutation(jobId);

    // Call AI mutator to generate new job (preview only, no save)
    const { result: mutatedJob } = await mutateJobCore(
      userReason,
      {
        job: {
          title: context.job.title,
          type: context.job.type,
          est_minutes: context.job.est_minutes,
        },
        goal: context.goal,
        milestone: context.milestone,
      }
    );

    return {
      success: true,
      preview: {
        title: mutatedJob.title,
        type: mutatedJob.type,
        est_minutes: mutatedJob.est_minutes,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

/**
 * Mutates a job by generating a new version based on user feedback and saving it
 * 
 * @param jobId - The job ID to mutate
 * @param userReason - The user's reason for wanting to change the job
 * @returns Result with updated job or error
 */
export async function mutateJob(
  jobId: string,
  userReason: string
): Promise<JobMutationResult> {
  const supabase = await createClient();

  try {
    // Verify access and get current job
    const currentJob = await verifyJobAccess(jobId);

    // Fetch full job context (job, goal, milestone)
    const context = await fetchJobContextForMutation(jobId);

    // Call AI mutator to generate new job
    const { result: mutatedJob } = await mutateJobCore(
      userReason,
      {
        job: {
          title: context.job.title,
          type: context.job.type,
          est_minutes: context.job.est_minutes,
        },
        goal: context.goal,
        milestone: context.milestone,
      }
    );

    // Update the job in-place (overwrite old job)
    // Preserve: job_cluster_id, created_at, work_sessions
    // Update: title, type, est_minutes
    // Reset: status to ACTIVE
    // Increment: failure_count
    const { data: updatedJob, error: updateError } = await supabase
      .from("jobs")
      .update({
        title: mutatedJob.title,
        type: mutatedJob.type,
        est_minutes: mutatedJob.est_minutes,
        status: "ACTIVE",
        failure_count: currentJob.failure_count + 1,
        // Preserve work_sessions (don't reset them)
        work_sessions: context.job.work_sessions || [],
      })
      .eq("id", jobId)
      .select()
      .single();

    if (updateError || !updatedJob) {
      return {
        success: false,
        error: updateError?.message || "Failed to update job",
      };
    }

    // Parse work_sessions
    const parsedSessions = updatedJob.work_sessions
      ? (Array.isArray(updatedJob.work_sessions) ? updatedJob.work_sessions : [])
      : [];

    return {
      success: true,
      job: {
        ...updatedJob,
        work_sessions: parsedSessions,
      } as JobRow,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}
