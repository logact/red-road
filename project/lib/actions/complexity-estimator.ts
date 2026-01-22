"use server";

/**
 * Server Action for estimating goal complexity
 * 
 * Analyzes a goal's title and scope to estimate total effort hours and categorize
 * the goal as SMALL, MEDIUM, or LARGE. Updates the goals.complexity field in the database.
 */

import { estimateComplexityCore } from "../ai/complexity-estimator";
import { createClient } from "../supabase/server";
import type { Complexity } from "@/types/volition";

/**
 * Estimates complexity for a goal and updates the database
 * 
 * @param goalId - The goal ID to estimate complexity for
 * @returns The estimated complexity result
 * @throws Error if goal doesn't exist, user doesn't have access, scope is missing, or estimation fails
 */
export async function estimateComplexity(
  goalId: string
): Promise<Complexity> {
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

  // Fetch goal to verify it exists and get title/scope
  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("id, user_id, title, scope, status")
    .eq("id", goalId)
    .single();

  if (goalError || !goalData) {
    throw new Error(
      goalError?.message || "Goal not found"
    );
  }

  // Verify user owns the goal
  if (goalData.user_id !== user.id) {
    throw new Error("Unauthorized access to goal");
  }

  // Verify goal has scope defined
  if (!goalData.scope) {
    throw new Error("Goal scope must be defined before estimating complexity");
  }

  const scope = goalData.scope as {
    hard_constraint_hours_per_week: number;
    tech_stack: string[];
    definition_of_done?: string;
  };

  // Verify scope has required fields
  if (
    typeof scope.hard_constraint_hours_per_week !== "number" ||
    scope.hard_constraint_hours_per_week <= 0
  ) {
    throw new Error(
      "Scope must have a valid hard_constraint_hours_per_week value"
    );
  }

  if (!scope.definition_of_done || scope.definition_of_done.trim() === "") {
    throw new Error("Scope must have a definition_of_done value");
  }

  // Note: user_background_level is optional, will default to INTERMEDIATE in the AI logic

  // Estimate complexity using AI
  const { result } = await estimateComplexityCore(goalData.title, scope);

  // Update goal with complexity and set status to PLANNING
  const { error: updateError } = await supabase
    .from("goals")
    .update({
      complexity: result,
      status: "PLANNING", // Ready for blueprint generation (Feature 3.3)
    })
    .eq("id", goalId);

  if (updateError) {
    throw new Error(
      `Failed to update goal complexity: ${updateError.message}`
    );
  }

  return result;
}
