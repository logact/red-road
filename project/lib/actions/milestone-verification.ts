"use server";

/**
 * Server actions for milestone verification
 * 
 * Handles checking milestone completion and verification process
 */

import { createClient } from "../supabase/server";
import type { MilestoneRow } from "@/types/volition";

export interface MilestoneVerificationData {
  milestone: MilestoneRow;
  criteria: string;
  allJobsCompleted: boolean;
}

/**
 * Gets milestones with PENDING_VERIFICATION status for the active goal
 * 
 * @param goalId - The goal ID to check for pending verification milestones
 * @returns Array of milestone IDs that are pending verification
 * @throws Error if goal doesn't exist or user doesn't have access
 */
export async function getPendingVerificationMilestones(
  goalId: string
): Promise<string[]> {
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
    .select("user_id")
    .eq("id", goalId)
    .single();

  if (goalError || !goalData) {
    throw new Error("Goal not found");
  }

  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to goal");
  }

  // Get all phases for this goal
  const { data: phases, error: phasesError } = await supabase
    .from("phases")
    .select("id")
    .eq("goal_id", goalId);

  if (phasesError) {
    throw new Error(`Failed to fetch phases: ${phasesError.message}`);
  }

  if (!phases || phases.length === 0) {
    return [];
  }

  const phaseIds = phases.map((phase) => phase.id);

  // Get milestones with PENDING_VERIFICATION status
  const { data: milestones, error: milestonesError } = await supabase
    .from("milestones")
    .select("id")
    .in("phase_id", phaseIds)
    .eq("status", "PENDING_VERIFICATION");

  if (milestonesError) {
    throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
  }

  return milestones.map((m) => m.id);
}

/**
 * Syncs milestone status to PENDING_VERIFICATION if all jobs are completed
 * This function should be called when jobs are updated outside of markJobDone
 * (e.g., bulk updates, direct database changes)
 * 
 * @param milestoneId - The milestone ID to sync
 * @returns True if milestone was updated, false otherwise
 * @throws Error if milestone doesn't exist or user doesn't have access
 */
export async function syncMilestoneStatusIfNeeded(
  milestoneId: string
): Promise<boolean> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'milestone-verification.ts:94',message:'syncMilestoneStatusIfNeeded called',data:{milestoneId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User authentication required");
  }

  // Get current milestone status
  const { data: milestoneData, error: milestoneError } = await supabase
    .from("milestones")
    .select("id, phase_id, status")
    .eq("id", milestoneId)
    .single();

  if (milestoneError || !milestoneData) {
    throw new Error("Milestone not found");
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'milestone-verification.ts:120',message:'Milestone status check in sync',data:{milestoneId,currentStatus:milestoneData.status},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // Only update if milestone is ACTIVE (don't change if already PENDING_VERIFICATION or COMPLETED)
  if (milestoneData.status !== "ACTIVE") {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'milestone-verification.ts:123',message:'Milestone not ACTIVE, skipping sync',data:{milestoneId,currentStatus:milestoneData.status},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return false;
  }

  // Check if all jobs are completed
  const allCompleted = await checkMilestoneCompletion(milestoneId);

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'milestone-verification.ts:126',message:'Completion check in sync',data:{milestoneId,allCompleted},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (allCompleted) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'milestone-verification.ts:129',message:'All jobs completed, updating milestone in sync',data:{milestoneId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Update milestone status to PENDING_VERIFICATION
    const { error: updateError } = await supabase
      .from("milestones")
      .update({
        status: "PENDING_VERIFICATION",
      })
      .eq("id", milestoneId);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'milestone-verification.ts:137',message:'Milestone update result in sync',data:{milestoneId,updateError:updateError?.message,success:!updateError},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (updateError) {
      // Check if it's a constraint violation (migration not applied)
      if (updateError.message?.includes('milestones_status_check')) {
        throw new Error(
          `Failed to update milestone status: Database migration not applied. ` +
          `Please run migration 006_add_pending_verification_to_milestones.sql in Supabase Dashboard SQL Editor. ` +
          `Original error: ${updateError.message}`
        );
      }
      throw new Error(`Failed to update milestone status: ${updateError.message}`);
    }

    return true;
  }

  return false;
}

/**
 * Checks if all jobs in a milestone are completed
 * 
 * @param milestoneId - The milestone ID to check
 * @returns True if all jobs are completed, false otherwise
 * @throws Error if milestone doesn't exist or user doesn't have access
 */
export async function checkMilestoneCompletion(
  milestoneId: string
): Promise<boolean> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'milestone-verification.ts:92',message:'checkMilestoneCompletion called',data:{milestoneId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
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
  const { data: milestoneData, error: milestoneError } = await supabase
    .from("milestones")
    .select("id, phase_id")
    .eq("id", milestoneId)
    .single();

  if (milestoneError || !milestoneData) {
    throw new Error("Milestone not found");
  }

  // Verify user has access through goal ownership
  const { data: phaseData, error: phaseError } = await supabase
    .from("phases")
    .select("goal_id")
    .eq("id", milestoneData.phase_id)
    .single();

  if (phaseError || !phaseData) {
    throw new Error("Phase not found for milestone");
  }

  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("user_id")
    .eq("id", phaseData.goal_id)
    .single();

  if (goalError || !goalData) {
    throw new Error("Goal not found");
  }

  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to milestone");
  }

  // Get all job clusters for this milestone
  const { data: jobClusters, error: clustersError } = await supabase
    .from("job_clusters")
    .select("id")
    .eq("milestone_id", milestoneId);

  if (clustersError) {
    throw new Error(`Failed to fetch job clusters: ${clustersError.message}`);
  }

  // If no clusters exist, milestone is not ready for verification
  if (!jobClusters || jobClusters.length === 0) {
    return false;
  }

  const clusterIds = jobClusters.map((cluster) => cluster.id);

  // Get all jobs for this milestone
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("status")
    .in("job_cluster_id", clusterIds);

  if (jobsError) {
    throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'milestone-verification.ts:161',message:'Jobs fetched for milestone',data:{milestoneId,clusterIds,clusterCount:clusterIds.length,jobsCount:jobs?.length || 0,jobStatuses:jobs?.map(j => j.status) || [],allStatuses:jobs?.map(j => ({status:j.status})) || []},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  // If no jobs exist, milestone is not ready for verification
  if (!jobs || jobs.length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'milestone-verification.ts:172',message:'No jobs found for milestone',data:{milestoneId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return false;
  }

  // Check if all jobs are completed
  const allCompleted = jobs.every((job) => job.status === "COMPLETED");

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'milestone-verification.ts:176',message:'Completion check result',data:{milestoneId,jobsCount:jobs.length,allCompleted,jobStatuses:jobs.map(j => j.status)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  return allCompleted;
}

/**
 * Gets milestone verification data including criteria
 * 
 * @param milestoneId - The milestone ID to get verification data for
 * @returns Milestone verification data with criteria
 * @throws Error if milestone doesn't exist or user doesn't have access
 */
export async function getMilestoneVerificationData(
  milestoneId: string
): Promise<MilestoneVerificationData> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User authentication required");
  }

  // Fetch milestone with acceptance criteria
  const { data: milestone, error: milestoneError } = await supabase
    .from("milestones")
    .select("*")
    .eq("id", milestoneId)
    .single();

  if (milestoneError || !milestone) {
    throw new Error("Milestone not found");
  }

  // Verify user has access through goal ownership
  const { data: phaseData, error: phaseError } = await supabase
    .from("phases")
    .select("goal_id")
    .eq("id", milestone.phase_id)
    .single();

  if (phaseError || !phaseData) {
    throw new Error("Phase not found for milestone");
  }

  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("user_id")
    .eq("id", phaseData.goal_id)
    .single();

  if (goalError || !goalData) {
    throw new Error("Goal not found");
  }

  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to milestone");
  }

  // Check if all jobs are completed
  const allJobsCompleted = await checkMilestoneCompletion(milestoneId);

  return {
    milestone: milestone as MilestoneRow,
    criteria: milestone.acceptance_criteria || "",
    allJobsCompleted,
  };
}

/**
 * Activates the next pending milestone after a milestone is completed
 * 
 * @param goalId - The goal ID
 * @param completedMilestoneId - The milestone ID that was just completed
 * @returns True if next milestone was activated, false if no pending milestone found
 * @throws Error if goal doesn't exist or user doesn't have access
 */
export async function activateNextPendingMilestone(
  goalId: string,
  completedMilestoneId: string
): Promise<boolean> {
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
    .select("user_id")
    .eq("id", goalId)
    .single();

  if (goalError || !goalData) {
    throw new Error("Goal not found");
  }

  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to goal");
  }

  // Get all phases for this goal, ordered by index
  const { data: phases, error: phasesError } = await supabase
    .from("phases")
    .select("id")
    .eq("goal_id", goalId)
    .order("index", { ascending: true });

  if (phasesError) {
    throw new Error(`Failed to fetch phases: ${phasesError.message}`);
  }

  if (!phases || phases.length === 0) {
    return false;
  }

  const phaseIds = phases.map((phase) => phase.id);

  // Get all milestones for all phases, ordered by created_at
  const { data: allMilestones, error: milestonesError } = await supabase
    .from("milestones")
    .select("id, phase_id, created_at, status")
    .in("phase_id", phaseIds)
    .order("created_at", { ascending: true });

  if (milestonesError) {
    throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
  }

  if (!allMilestones || allMilestones.length === 0) {
    return false;
  }

  // Find the completed milestone's position
  const completedIndex = allMilestones.findIndex(
    (m) => m.id === completedMilestoneId
  );

  if (completedIndex === -1) {
    return false;
  }

  // Find the next PENDING milestone after the completed one
  const nextPendingMilestone = allMilestones
    .slice(completedIndex + 1)
    .find((m) => m.status === "PENDING");

  if (!nextPendingMilestone) {
    return false;
  }

  // Activate the next pending milestone
  // First, set all milestones in the same phase to PENDING
  const { error: resetError } = await supabase
    .from("milestones")
    .update({ status: "PENDING" })
    .eq("phase_id", nextPendingMilestone.phase_id);

  if (resetError) {
    throw new Error(
      `Failed to reset milestone statuses: ${resetError.message}`
    );
  }

  // Set the next pending milestone to ACTIVE
  const { error: activateError } = await supabase
    .from("milestones")
    .update({ status: "ACTIVE" })
    .eq("id", nextPendingMilestone.id);

  if (activateError) {
    throw new Error(
      `Failed to activate next milestone: ${activateError.message}`
    );
  }

  return true;
}

/**
 * Checks if all milestones for a goal are completed and marks goal as COMPLETED if so
 * 
 * @param goalId - The goal ID to check
 * @returns True if goal was marked as COMPLETED, false otherwise
 * @throws Error if goal doesn't exist or user doesn't have access
 */
export async function checkAndCompleteGoalIfAllMilestonesDone(
  goalId: string
): Promise<boolean> {
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
    .select("user_id, status")
    .eq("id", goalId)
    .single();

  if (goalError || !goalData) {
    throw new Error("Goal not found");
  }

  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to goal");
  }

  // Don't update if goal is already COMPLETED
  if (goalData.status === "COMPLETED") {
    return false;
  }

  // Get all phases for this goal
  const { data: phases, error: phasesError } = await supabase
    .from("phases")
    .select("id")
    .eq("goal_id", goalId);

  if (phasesError) {
    throw new Error(`Failed to fetch phases: ${phasesError.message}`);
  }

  if (!phases || phases.length === 0) {
    return false;
  }

  const phaseIds = phases.map((phase) => phase.id);

  // Get all milestones for all phases
  const { data: allMilestones, error: milestonesError } = await supabase
    .from("milestones")
    .select("status")
    .in("phase_id", phaseIds);

  if (milestonesError) {
    throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
  }

  if (!allMilestones || allMilestones.length === 0) {
    return false;
  }

  // Check if all milestones are COMPLETED
  const allCompleted = allMilestones.every(
    (m) => m.status === "COMPLETED"
  );

  if (allCompleted) {
    // Update goal status to COMPLETED
    const { error: updateError } = await supabase
      .from("goals")
      .update({ status: "COMPLETED" })
      .eq("id", goalId);

    if (updateError) {
      throw new Error(
        `Failed to mark goal as completed: ${updateError.message}`
      );
    }

    return true;
  }

  return false;
}

/**
 * Confirms milestone verification and marks milestone as completed
 * 
 * @param milestoneId - The milestone ID to verify
 * @throws Error if milestone doesn't exist, user doesn't have access, or not all jobs are completed
 */
export async function confirmMilestoneVerification(
  milestoneId: string
): Promise<void> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User authentication required");
  }

  // Verify milestone is in PENDING_VERIFICATION status
  const { data: milestoneStatus, error: statusError } = await supabase
    .from("milestones")
    .select("status")
    .eq("id", milestoneId)
    .single();

  if (statusError || !milestoneStatus) {
    throw new Error("Failed to fetch milestone status");
  }

  if (milestoneStatus.status !== "PENDING_VERIFICATION") {
    throw new Error(
      `Milestone must be in PENDING_VERIFICATION status to verify. Current status: ${milestoneStatus.status}`
    );
  }

  // Verify all jobs are completed (double-check)
  const allCompleted = await checkMilestoneCompletion(milestoneId);
  if (!allCompleted) {
    throw new Error("Cannot verify milestone: not all jobs are completed");
  }

  // Verify milestone exists and user has access
  const { data: milestoneData, error: milestoneError } = await supabase
    .from("milestones")
    .select("id, phase_id")
    .eq("id", milestoneId)
    .single();

  if (milestoneError || !milestoneData) {
    throw new Error("Milestone not found");
  }

  // Verify user has access through goal ownership
  const { data: phaseData, error: phaseError } = await supabase
    .from("phases")
    .select("goal_id")
    .eq("id", milestoneData.phase_id)
    .single();

  if (phaseError || !phaseData) {
    throw new Error("Phase not found for milestone");
  }

  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("user_id")
    .eq("id", phaseData.goal_id)
    .single();

  if (goalError || !goalData) {
    throw new Error("Goal not found");
  }

  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to milestone");
  }

  // Update milestone status to COMPLETED
  const { error: updateError } = await supabase
    .from("milestones")
    .update({
      status: "COMPLETED",
    })
    .eq("id", milestoneId);

  if (updateError) {
    throw new Error(
      `Failed to mark milestone as completed: ${updateError.message}`
    );
  }

  // Activate the next pending milestone (if any)
  try {
    await activateNextPendingMilestone(phaseData.goal_id, milestoneId);
  } catch (err) {
    // Log error but don't fail the verification
    console.error("Failed to activate next pending milestone:", err);
  }

  // Check if all milestones are completed and mark goal as COMPLETED if so
  try {
    await checkAndCompleteGoalIfAllMilestonesDone(phaseData.goal_id);
  } catch (err) {
    // Log error but don't fail the verification
    console.error("Failed to check and complete goal:", err);
  }
}
