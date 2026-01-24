"use server";

/**
 * Server Action for generating blueprint (Phases & Milestones)
 * 
 * Generates the Phases & Milestones structure based on goal complexity.
 * This is "Prompt B" in the Adaptive Architect flow, following the Complexity Estimator.
 */

import { generateBlueprintCore } from "../ai/blueprint-generator";
import { createClient } from "../supabase/server";
import type { PhaseRow, MilestoneRow, Complexity, Scope } from "@/types/volition";

export interface GenerateBlueprintResult {
  phases: PhaseRow[];
  milestones: MilestoneRow[];
}

/**
 * Generates blueprint (phases and milestones) for a goal and inserts them into the database
 * 
 * @param goalId - The goal ID to generate blueprint for
 * @returns Object containing inserted phases and milestones
 * @throws Error if goal doesn't exist, user doesn't have access, complexity is missing, or generation fails
 */
export async function generateBlueprint(
  goalId: string
): Promise<GenerateBlueprintResult> {
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

  // Fetch goal to verify it exists and get title/complexity/scope
  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("id, user_id, title, complexity, scope, status")
    .eq("id", goalId)
    .single();

  if (goalError || !goalData) {
    throw new Error(goalError?.message || "Goal not found");
  }

  // Verify user owns the goal
  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to goal");
  }

  // Verify goal status is PLANNING (after complexity estimation)
  if (goalData.status !== "PLANNING") {
    throw new Error(
      `Goal must be in PLANNING status to generate blueprint. Current status: ${goalData.status}`
    );
  }

  // Verify goal has complexity defined
  if (!goalData.complexity) {
    throw new Error(
      "Goal complexity must be defined before generating blueprint. Run complexity estimation first."
    );
  }

  const complexity = goalData.complexity as Complexity;

  // Verify complexity has required fields
  if (!complexity.size || !complexity.estimated_total_hours) {
    throw new Error("Goal complexity is incomplete");
  }

  // Verify goal has scope defined
  if (!goalData.scope) {
    throw new Error("Goal scope must be defined before generating blueprint");
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

  // Generate blueprint using AI
  const { result: blueprint } = await generateBlueprintCore(
    goalData.title,
    complexity,
    scope
  );

  // Additional runtime check for Miller's Law (safety net)
  for (const phase of blueprint) {
    if (phase.milestones.length > 7) {
      throw new Error(
        `Phase "${phase.title}" violates Miller's Law: has ${phase.milestones.length} milestones (max 7)`
      );
    }
  }

  // Prepare phases for insertion
  const phasesToInsert = blueprint.map((phase, index) => ({
    goal_id: goalId,
    title: phase.title,
    status: "PENDING" as const,
    index: index, // 0-based index for ordering
  }));

  // Bulk insert phases first
  const { data: insertedPhases, error: phasesError } = await supabase
    .from("phases")
    .insert(phasesToInsert)
    .select();

  if (phasesError) {
    throw new Error(`Failed to insert phases: ${phasesError.message}`);
  }

  if (!insertedPhases || insertedPhases.length === 0) {
    throw new Error("No phases were inserted");
  }

  // Verify we got the expected number of phases
  if (insertedPhases.length !== blueprint.length) {
    throw new Error(
      `Expected ${blueprint.length} phases but got ${insertedPhases.length}`
    );
  }

  // Prepare milestones for insertion
  // Map milestone titles to phase_ids from inserted phase data
  const milestonesToInsert: Array<{
    phase_id: string;
    title: string;
    status: "PENDING";
    acceptance_criteria: string;
  }> = [];

  for (let i = 0; i < blueprint.length; i++) {
    const phaseBlueprint = blueprint[i];
    const insertedPhase = insertedPhases[i];

    // Verify phase titles match (safety check)
    if (insertedPhase.title !== phaseBlueprint.title) {
      throw new Error(
        `Phase title mismatch: expected "${phaseBlueprint.title}" but got "${insertedPhase.title}"`
      );
    }

    // Add milestones for this phase
    for (const milestone of phaseBlueprint.milestones) {
      milestonesToInsert.push({
        phase_id: insertedPhase.id,
        title: milestone.title,
        status: "PENDING",
        acceptance_criteria: milestone.acceptance_criteria,
      });
    }
  }

  // Bulk insert milestones
  const { data: insertedMilestones, error: milestonesError } = await supabase
    .from("milestones")
    .insert(milestonesToInsert)
    .select();

  if (milestonesError) {
    throw new Error(`Failed to insert milestones: ${milestonesError.message}`);
  }

  if (!insertedMilestones) {
    throw new Error("No data returned from milestones insertion");
  }

  // Update goal status to ACTIVE (ready for Feature 3.4: Blueprint Renderer)
  const { error: updateError } = await supabase
    .from("goals")
    .update({
      status: "ACTIVE",
    })
    .eq("id", goalId);

  if (updateError) {
    throw new Error(
      `Failed to update goal status: ${updateError.message}`
    );
  }

  return {
    phases: insertedPhases as PhaseRow[],
    milestones: insertedMilestones as MilestoneRow[],
  };
}
