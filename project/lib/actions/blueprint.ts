"use server";

/**
 * Server Actions for Blueprint Renderer (Feature 3.4)
 * 
 * Handles fetching phases and milestones for a goal to display in the blueprint tree.
 */

import { createClient } from "../supabase/server";
import type { PhaseRow, MilestoneRow } from "@/types/volition";

export interface BlueprintData {
  phases: PhaseRow[];
  milestones: MilestoneRow[];
}

/**
 * Fetches all phases and milestones for a goal
 * 
 * @param goalId - The goal ID to fetch blueprint data for
 * @returns Object containing phases and milestones arrays
 * @throws Error if goal doesn't exist or user doesn't have access
 */
export async function getBlueprint(goalId: string): Promise<BlueprintData> {
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

  // Fetch phases for this goal, ordered by index
  const { data: phases, error: phasesError } = await supabase
    .from("phases")
    .select("*")
    .eq("goal_id", goalId)
    .order("index", { ascending: true });

  if (phasesError) {
    throw new Error(`Failed to fetch phases: ${phasesError.message}`);
  }

  // If no phases exist, return empty arrays
  if (!phases || phases.length === 0) {
    return {
      phases: [],
      milestones: [],
    };
  }

  // Get all phase IDs
  const phaseIds = phases.map((phase) => phase.id);

  // Fetch milestones for all phases, ordered by created_at
  const { data: milestones, error: milestonesError } = await supabase
    .from("milestones")
    .select("*")
    .in("phase_id", phaseIds)
    .order("created_at", { ascending: true });

  if (milestonesError) {
    throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
  }

  return {
    phases: (phases || []) as PhaseRow[],
    milestones: (milestones || []) as MilestoneRow[],
  };
}

/**
 * Sets a milestone as active
 * 
 * @param milestoneId - The milestone ID to activate
 * @param goalId - The goal ID (for verification)
 * @throws Error if milestone doesn't exist or update fails
 */
export async function setActiveMilestone(
  milestoneId: string,
  goalId: string
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

  // Verify goal ownership
  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("id, user_id")
    .eq("id", goalId)
    .single();

  if (goalError || !goalData) {
    throw new Error("Goal not found");
  }

  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to goal");
  }

  // Verify milestone exists and belongs to this goal
  // First get the milestone with its phase
  const { data: milestoneData, error: milestoneError } = await supabase
    .from("milestones")
    .select("id, phase_id")
    .eq("id", milestoneId)
    .single();

  if (milestoneError || !milestoneData) {
    throw new Error("Milestone not found");
  }

  // Then verify the phase belongs to this goal
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

  // Set all milestones in the same phase to PENDING first
  const { error: resetError } = await supabase
    .from("milestones")
    .update({ status: "PENDING" })
    .eq("phase_id", milestoneData.phase_id);

  if (resetError) {
    throw new Error(`Failed to reset milestone statuses: ${resetError.message}`);
  }

  // Set the selected milestone to ACTIVE
  const { error: updateError } = await supabase
    .from("milestones")
    .update({ status: "ACTIVE" })
    .eq("id", milestoneId);

  if (updateError) {
    throw new Error(`Failed to activate milestone: ${updateError.message}`);
  }
}
