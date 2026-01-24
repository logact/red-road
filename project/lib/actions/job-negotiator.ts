"use server";

/**
 * Job Negotiator Handler (Feature 5.3)
 * 
 * Handles "Change Content" action from Failure Interceptor.
 * Uses AI to analyze the user's change reason and job context,
 * then recommends whether to insist on the current job or agree to change it.
 */

import { createClient } from "../supabase/server";
import { verifyJobAccess } from "./jobs";
import { negotiateJobCore } from "../ai/job-negotiator";
import type { JobRow } from "@/types/volition";

export interface JobNegotiationResult {
  success: boolean;
  advice?: string;
  recommendation?: "INSIST" | "CHANGE";
  error?: string;
}

/**
 * Fetches full job context including goal and milestone information
 * 
 * @param jobId - The job ID to fetch context for
 * @returns Job context with goal and milestone information
 */
async function fetchJobContext(jobId: string): Promise<{
  job: JobRow;
  goal: {
    title: string;
    scope?: {
      tech_stack?: string[];
      user_background_level?: string;
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

  // Get the goal with scope
  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("id, title, scope")
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
      } | undefined,
    },
    milestone: {
      title: milestoneData.title,
      acceptance_criteria: milestoneData.acceptance_criteria || undefined,
    },
  };
}

/**
 * Handles job negotiation request
 * 
 * @param jobId - The job ID to negotiate
 * @param reason - The user's reason for wanting to change the job
 * @returns Result with AI advice and recommendation
 */
export async function handleJobNegotiation(
  jobId: string,
  reason: string
): Promise<JobNegotiationResult> {
  try {
    // Verify access and get current job
    await verifyJobAccess(jobId);

    // Fetch full job context (job, goal, milestone)
    const context = await fetchJobContext(jobId);

    // Call AI negotiator to analyze the reason and context
    const { result } = await negotiateJobCore(reason, {
      job: {
        title: context.job.title,
        type: context.job.type,
        est_minutes: context.job.est_minutes,
      },
      goal: context.goal,
      milestone: context.milestone,
    });

    return {
      success: true,
      advice: result.advice,
      recommendation: result.recommendation,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}
