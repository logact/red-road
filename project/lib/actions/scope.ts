"use server";

/**
 * Server Action for updating goal scope
 * 
 * Updates the "Triangle of Scope" data (hard_constraint_hours_per_week,
 * tech_stack, definition_of_done) in the goals.scope JSONB column.
 */

import { createClient } from "../supabase/server";
import type { Scope } from "@/types/volition";

export interface UpdateScopeResult {
  success: boolean;
  error?: string;
}

/**
 * Updates the scope for a goal
 * 
 * @param goalId - The goal ID to update
 * @param hoursPerWeek - Hours per week constraint (must be > 0)
 * @param techStack - Array of technology/tool names (can be empty)
 * @param definitionOfDone - Definition of done criteria (required, non-empty)
 * @param userBackgroundLevel - User's experience level related to this goal (optional)
 * @returns Success status or error message
 * @throws Error if validation fails or update fails
 */
export async function updateGoalScope(
  goalId: string,
  hoursPerWeek: number,
  techStack: string[],
  definitionOfDone: string,
  userBackgroundLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
): Promise<UpdateScopeResult> {
  // Validate hoursPerWeek
  if (typeof hoursPerWeek !== "number" || hoursPerWeek <= 0 || !Number.isFinite(hoursPerWeek)) {
    return {
      success: false,
      error: "Hours per week must be a positive number",
    };
  }

  // Validate definitionOfDone
  const trimmedDefinition = definitionOfDone.trim();
  if (!trimmedDefinition || trimmedDefinition.length === 0) {
    return {
      success: false,
      error: "Definition of Done cannot be empty",
    };
  }

  // Validate goalId
  if (!goalId || goalId.trim() === "") {
    return {
      success: false,
      error: "Goal ID is required",
    };
  }

  // Get Supabase client
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "User authentication required",
    };
  }

  // Verify goal exists and user owns it
  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("id, user_id, scope")
    .eq("id", goalId)
    .single();

  if (goalError || !goalData) {
    return {
      success: false,
      error: goalError?.message || "Goal not found",
    };
  }

  if (goalData.user_id !== user.id) {
    return {
      success: false,
      error: "Unauthorized access to goal",
    };
  }

  // Build the updated scope object
  // Preserve existing scope data and update with new values
  const existingScope = (goalData.scope as Scope) || {
    hard_constraint_hours_per_week: 0,
    tech_stack: [],
  };

  const updatedScope: Scope = {
    hard_constraint_hours_per_week: hoursPerWeek,
    tech_stack: techStack.filter((item) => item.trim().length > 0), // Remove empty strings
    definition_of_done: trimmedDefinition,
    user_background_level: userBackgroundLevel,
  };

  // Update goal scope and status
  const { error: updateError } = await supabase
    .from("goals")
    .update({
      scope: updatedScope,
      status: "SCOPING", // Update status to indicate scope is being defined
    })
    .eq("id", goalId);

  if (updateError) {
    return {
      success: false,
      error: `Failed to update scope: ${updateError.message}`,
    };
  }

  return {
    success: true,
  };
}
