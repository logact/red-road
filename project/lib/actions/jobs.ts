"use server";

/**
 * Server actions for fetching jobs and job clusters
 */

import { createClient } from "../supabase/server";
import type { JobClusterRow, JobRow } from "@/types/volition";

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

  return {
    jobClusters: (jobClusters || []) as JobClusterRow[],
    jobs: (jobs || []) as JobRow[],
  };
}
