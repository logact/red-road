"use server";

/**
 * Server Actions for Goals
 * 
 * Handles fetching goals and related data for the dashboard.
 */

import { createClient } from "../supabase/server";
import type { GoalRow, MilestoneRow, GoalInsert, GoalUpdate } from "@/types/volition";

export interface ActiveGoalData {
  goal: GoalRow;
  milestone: MilestoneRow;
  milestoneId: string;
}

/**
 * Fetches the user's active goal and its active milestone
 * 
 * @returns Object containing goal, milestone, and milestone ID
 * @throws Error if no active goal/milestone exists or user doesn't have access
 */
export async function getActiveGoalAndMilestone(): Promise<ActiveGoalData | null> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User authentication required");
  }

  // Fetch the user's most recent ACTIVE goal
  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (goalsError) {
    throw new Error(`Failed to fetch goals: ${goalsError.message}`);
  }

  if (!goals || goals.length === 0) {
    return null;
  }

  const goal = goals[0] as GoalRow;

  // Fetch phases for this goal
  const { data: phases, error: phasesError } = await supabase
    .from("phases")
    .select("id")
    .eq("goal_id", goal.id)
    .order("index", { ascending: true });

  if (phasesError) {
    throw new Error(`Failed to fetch phases: ${phasesError.message}`);
  }

  if (!phases || phases.length === 0) {
    return null;
  }

  // Get all phase IDs
  const phaseIds = phases.map((phase) => phase.id);

  // First, try to fetch a PENDING_VERIFICATION milestone (priority)
  let { data: milestones, error: milestonesError } = await supabase
    .from("milestones")
    .select("*")
    .in("phase_id", phaseIds)
    .eq("status", "PENDING_VERIFICATION")
    .order("created_at", { ascending: true })
    .limit(1);

  if (milestonesError) {
    throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
  }

  // If no PENDING_VERIFICATION milestone, fall back to ACTIVE milestone
  if (!milestones || milestones.length === 0) {
    const { data: activeMilestones, error: activeMilestonesError } = await supabase
      .from("milestones")
      .select("*")
      .in("phase_id", phaseIds)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: true })
      .limit(1);

    if (activeMilestonesError) {
      throw new Error(`Failed to fetch active milestones: ${activeMilestonesError.message}`);
    }

    milestones = activeMilestones;
  }

  if (!milestones || milestones.length === 0) {
    return null;
  }

  const milestone = milestones[0] as MilestoneRow;

  return {
    goal,
    milestone,
    milestoneId: milestone.id,
  };
}

/**
 * Fetches all goals for the authenticated user
 * 
 * @returns Array of all user goals, ordered by updated_at descending
 * @throws Error if user is not authenticated
 */
export async function getAllGoals(): Promise<GoalRow[]> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User authentication required");
  }

  // Fetch all goals for the user
  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (goalsError) {
    throw new Error(`Failed to fetch goals: ${goalsError.message}`);
  }

  return (goals || []) as GoalRow[];
}

/**
 * Fetches a specific goal and its active milestone by goal ID
 * 
 * @param goalId - The goal ID to fetch
 * @returns Object containing goal, milestone, and milestone ID, or null if not found
 * @throws Error if user is not authenticated or doesn't have access
 */
export async function getGoalAndMilestone(goalId: string): Promise<ActiveGoalData | null> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User authentication required");
  }

  // Fetch the specific goal
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (goalError || !goal) {
    return null;
  }

  // Fetch phases for this goal
  const { data: phases, error: phasesError } = await supabase
    .from("phases")
    .select("id")
    .eq("goal_id", goal.id)
    .order("index", { ascending: true });

  if (phasesError) {
    throw new Error(`Failed to fetch phases: ${phasesError.message}`);
  }

  if (!phases || phases.length === 0) {
    return null;
  }

  // Get all phase IDs
  const phaseIds = phases.map((phase) => phase.id);

  // First, try to fetch a PENDING_VERIFICATION milestone (priority)
  let { data: milestones, error: milestonesError } = await supabase
    .from("milestones")
    .select("*")
    .in("phase_id", phaseIds)
    .eq("status", "PENDING_VERIFICATION")
    .order("created_at", { ascending: true })
    .limit(1);

  if (milestonesError) {
    throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
  }

  // If no PENDING_VERIFICATION milestone, fall back to ACTIVE milestone
  if (!milestones || milestones.length === 0) {
    const { data: activeMilestones, error: activeMilestonesError } = await supabase
      .from("milestones")
      .select("*")
      .in("phase_id", phaseIds)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: true })
      .limit(1);

    if (activeMilestonesError) {
      throw new Error(`Failed to fetch active milestones: ${activeMilestonesError.message}`);
    }

    milestones = activeMilestones;
  }

  if (!milestones || milestones.length === 0) {
    return null;
  }

  const milestone = milestones[0] as MilestoneRow;

  return {
    goal: goal as GoalRow,
    milestone,
    milestoneId: milestone.id,
  };
}

/**
 * Result type for create/update/delete operations
 */
export interface GoalActionResult {
  success: boolean;
  error?: string;
  goal?: GoalRow;
}

/**
 * Creates a new goal with default values
 * 
 * @param title - The title of the goal
 * @returns Result object with success status and created goal or error
 */
export async function createGoal(title: string): Promise<GoalActionResult> {
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

  // Validate title
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return {
      success: false,
      error: "Goal title is required",
    };
  }

  // Create goal with default values
  const newGoal: GoalInsert = {
    user_id: user.id,
    title: trimmedTitle,
    complexity: {
      size: "SMALL",
      estimated_total_hours: 0,
      projected_end_date: "",
    },
    scope: {
      hard_constraint_hours_per_week: 0,
      tech_stack: [],
    },
    architecture: {
      current_phase_index: 0,
      phases: [],
    },
    status: "PENDING_SCOPE",
  };

  const { data: goal, error: insertError } = await supabase
    .from("goals")
    .insert(newGoal)
    .select()
    .single();

  if (insertError || !goal) {
    return {
      success: false,
      error: insertError?.message || "Failed to create goal",
    };
  }

  return {
    success: true,
    goal: goal as GoalRow,
  };
}

/**
 * Updates a goal
 * 
 * @param goalId - The ID of the goal to update
 * @param updates - Partial goal update object
 * @returns Result object with success status and updated goal or error
 */
export async function updateGoal(
  goalId: string,
  updates: Partial<GoalUpdate>
): Promise<GoalActionResult> {
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

  // Validate goalId
  if (!goalId || !goalId.trim()) {
    return {
      success: false,
      error: "Goal ID is required",
    };
  }

  // Validate title if provided
  if (updates.title !== undefined) {
    const trimmedTitle = updates.title.trim();
    if (!trimmedTitle) {
      return {
        success: false,
        error: "Goal title cannot be empty",
      };
    }
    updates.title = trimmedTitle;
  }

  // Prepare update object (exclude id from updates)
  const { id, ...updateData } = updates as any;
  if (Object.keys(updateData).length === 0) {
    return {
      success: false,
      error: "No fields to update",
    };
  }

  // Update the goal (RLS will ensure user owns it)
  const { data: goal, error: updateError } = await supabase
    .from("goals")
    .update(updateData)
    .eq("id", goalId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError || !goal) {
    return {
      success: false,
      error: updateError?.message || "Failed to update goal",
    };
  }

  return {
    success: true,
    goal: goal as GoalRow,
  };
}

/**
 * Deletes a goal and all related data (cascade delete)
 * 
 * @param goalId - The ID of the goal to delete
 * @returns Result object with success status or error
 */
export async function deleteGoal(goalId: string): Promise<GoalActionResult> {
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

  // Validate goalId
  if (!goalId || !goalId.trim()) {
    return {
      success: false,
      error: "Goal ID is required",
    };
  }

  // Delete the goal (RLS will ensure user owns it, cascade will delete related data)
  const { error: deleteError } = await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (deleteError) {
    return {
      success: false,
      error: deleteError.message || "Failed to delete goal",
    };
  }

  return {
    success: true,
  };
}

/**
 * Goal Archivist (Feature 5.5)
 * 
 * Handles "Give Up Goal" action from the Failure Interceptor.
 * Marks the goal as FAILED. The current job is already marked as failed
 * before this function is called.
 * 
 * @param goalId - The ID of the goal to archive
 * @returns Result object with success status or error
 */
export async function archiveGoal(goalId: string): Promise<GoalActionResult> {
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

  // Validate goalId
  if (!goalId || !goalId.trim()) {
    return {
      success: false,
      error: "Goal ID is required",
    };
  }

  // Verify goal exists and user owns it
  const { data: goalData, error: goalError } = await supabase
    .from("goals")
    .select("id, user_id, status")
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

  // Update goal status to FAILED
  const { data: updatedGoal, error: updateError } = await supabase
    .from("goals")
    .update({
      status: "FAILED",
    })
    .eq("id", goalId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError || !updatedGoal) {
    return {
      success: false,
      error: updateError?.message || "Failed to archive goal",
    };
  }

  return {
    success: true,
    goal: updatedGoal as GoalRow,
  };
}
