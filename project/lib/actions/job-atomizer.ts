"use server";

/**
 * Server Action for generating jobs (Job Clusters & Jobs)
 * 
 * Generates Job Clusters and Jobs for an active milestone.
 * This is "Prompt C" in the Adaptive Architect flow.
 */

import { generateJobsCore } from "../ai/job-atomizer";
import { createClient } from "../supabase/server";
import type { JobClusterRow, JobRow, Complexity, Scope } from "@/types/volition";

export interface GenerateJobsResult {
  jobClusters: JobClusterRow[];
  jobs: JobRow[];
}

/**
 * Generates jobs (clusters and jobs) for a milestone and inserts them into the database
 * 
 * @param milestoneId - The milestone ID to generate jobs for
 * @param goalId - The goal ID (for verification)
 * @returns Object containing inserted job clusters and jobs
 * @throws Error if milestone doesn't exist, user doesn't have access, or generation fails
 */
export async function generateJobs(
  milestoneId: string,
  goalId: string
): Promise<GenerateJobsResult> {
  // Get Supabase client
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User authentication required");
  }

  // Fetch milestone to verify it exists and get its details
  const { data: milestoneData, error: milestoneError } = await supabase
    .from("milestones")
    .select("id, phase_id, title, status")
    .eq("id", milestoneId)
    .single();

  if (milestoneError || !milestoneData) {
    throw new Error(milestoneError?.message || "Milestone not found");
  }

  // Verify milestone is ACTIVE
  if (milestoneData.status !== "ACTIVE") {
    throw new Error(
      `Milestone must be ACTIVE to generate jobs. Current status: ${milestoneData.status}`
    );
  }

  // Verify the phase belongs to this goal
  const { data: phaseData, error: phaseError } = await supabase
    .from("phases")
    .select("goal_id")
    .eq("id", milestoneData.phase_id)
    .single();

  if (phaseError || !phaseData) {
    throw new Error("Phase not found for milestone");
  }

  if (phaseData.goal_id !== goalId) {
    throw new Error("Milestone does not belong to this goal");
  }

  // Fetch goal to verify ownership and get title/complexity/scope
  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("id, user_id, title, complexity, scope")
    .eq("id", goalId)
    .single();

  if (goalError || !goalData) {
    throw new Error(goalError?.message || "Goal not found");
  }

  // Verify user owns the goal
  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to goal");
  }

  // Verify goal has complexity defined
  if (!goalData.complexity) {
    throw new Error(
      "Goal complexity must be defined before generating jobs. Run complexity estimation first."
    );
  }

  const complexity = goalData.complexity as Complexity;

  // Verify complexity has required fields
  if (!complexity.size || !complexity.estimated_total_hours) {
    throw new Error("Goal complexity is incomplete");
  }

  // Verify goal has scope defined
  if (!goalData.scope) {
    throw new Error("Goal scope must be defined before generating jobs");
  }

  const scope = goalData.scope as Scope;

  // Verify scope has required fields
  if (
    typeof scope.hard_constraint_hours_per_week !== "number" ||
    scope.hard_constraint_hours_per_week <= 0
  ) {
    throw new Error(
      "Scope must have a valid hard_constraint_hours_per_week value"
    );
  }

  // Check if jobs already exist for this milestone
  const { data: existingClusters, error: checkError } = await supabase
    .from("job_clusters")
    .select("id")
    .eq("milestone_id", milestoneId);

  if (checkError) {
    throw new Error(`Failed to check existing jobs: ${checkError.message}`);
  }

  if (existingClusters && existingClusters.length > 0) {
    throw new Error(
      "Jobs already exist for this milestone. Delete existing jobs before generating new ones."
    );
  }

  // For now, we don't have acceptance_criteria stored in the database
  // Use milestone title as context (the LLM will infer from the title and goal context)
  const milestoneAcceptanceCriteria = milestoneData.title;

  // Generate jobs using AI
  const { result: jobClusters } = await generateJobsCore(
    goalData.title,
    milestoneData.title,
    milestoneAcceptanceCriteria,
    scope,
    complexity
  );

  // Additional runtime check for atomic constraint (safety net)
  for (const cluster of jobClusters) {
    for (const job of cluster.jobs) {
      if (job.est_minutes > 120) {
        throw new Error(
          `Job "${job.title}" violates atomic constraint: has ${job.est_minutes} minutes (max 120)`
        );
      }
    }
  }

  // Prepare job clusters for insertion
  const clustersToInsert = jobClusters.map((cluster) => ({
    milestone_id: milestoneId,
    title: cluster.title,
  }));

  // Bulk insert job clusters first
  const { data: insertedClusters, error: clustersError } = await supabase
    .from("job_clusters")
    .insert(clustersToInsert)
    .select();

  if (clustersError) {
    throw new Error(`Failed to insert job clusters: ${clustersError.message}`);
  }

  if (!insertedClusters || insertedClusters.length === 0) {
    throw new Error("No job clusters were inserted");
  }

  // Verify we got the expected number of clusters
  if (insertedClusters.length !== jobClusters.length) {
    throw new Error(
      `Expected ${jobClusters.length} clusters but got ${insertedClusters.length}`
    );
  }

  // Prepare jobs for insertion
  // Map job titles to cluster_ids from inserted cluster data
  const jobsToInsert: Array<{
    job_cluster_id: string;
    title: string;
    type: "QUICK_WIN" | "DEEP_WORK" | "ANCHOR";
    est_minutes: number;
    status: "PENDING";
    failure_count: number;
    deadline: null;
  }> = [];

  for (let i = 0; i < jobClusters.length; i++) {
    const clusterBlueprint = jobClusters[i];
    const insertedCluster = insertedClusters[i];

    // Verify cluster titles match (safety check)
    if (insertedCluster.title !== clusterBlueprint.title) {
      throw new Error(
        `Cluster title mismatch: expected "${clusterBlueprint.title}" but got "${insertedCluster.title}"`
      );
    }

    // Add jobs for this cluster
    for (const job of clusterBlueprint.jobs) {
      jobsToInsert.push({
        job_cluster_id: insertedCluster.id,
        title: job.title,
        type: job.type,
        est_minutes: job.est_minutes,
        status: "PENDING",
        failure_count: 0,
        deadline: null,
      });
    }
  }

  // Bulk insert jobs
  const { data: insertedJobs, error: jobsError } = await supabase
    .from("jobs")
    .insert(jobsToInsert)
    .select();

  if (jobsError) {
    throw new Error(`Failed to insert jobs: ${jobsError.message}`);
  }

  if (!insertedJobs) {
    throw new Error("No data returned from jobs insertion");
  }

  return {
    jobClusters: insertedClusters as JobClusterRow[],
    jobs: insertedJobs as JobRow[],
  };
}
