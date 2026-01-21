"use server";

/**
 * Server Actions for Trial Dashboard
 * 
 * Handles fetching trial tasks, marking tasks as done, and giving up on goals.
 */

import { createClient } from "../supabase/server";
import type { TrialTaskRow, GoalRow } from "@/types/volition";

/**
 * Fetches all trial tasks for a goal, ordered by day_number
 * 
 * @param goalId - The goal ID to fetch tasks for
 * @returns Array of trial tasks ordered by day_number
 * @throws Error if goal doesn't exist or user doesn't have access
 */
export async function getTrialTasks(goalId: string): Promise<TrialTaskRow[]> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User authentication required");
  }

  // Fetch tasks for the goal
  const { data, error } = await supabase
    .from("trial_tasks")
    .select("*")
    .eq("goal_id", goalId)
    .order("day_number", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch trial tasks: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  const tasks = data as TrialTaskRow[];

  // If all tasks are PENDING, activate the first one (trial start)
  if (tasks.length > 0 && tasks.every((task) => task.status === "PENDING")) {
    const firstTask = tasks[0];
    const { error: activateError } = await supabase
      .from("trial_tasks")
      .update({ status: "ACTIVE" })
      .eq("id", firstTask.id);

    if (activateError) {
      // Log error but don't fail - return tasks as-is
      console.error("Failed to activate first task:", activateError);
    } else {
      // Update the first task status in the returned array
      firstTask.status = "ACTIVE";
    }
  }

  return tasks;
}

/**
 * Fetches goal details
 * 
 * @param goalId - The goal ID to fetch
 * @returns Goal details
 * @throws Error if goal doesn't exist or user doesn't have access
 */
export async function getGoal(goalId: string): Promise<GoalRow> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User authentication required");
  }

  // Fetch goal
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch goal: ${error.message}`);
  }

  if (!data) {
    throw new Error("Goal not found");
  }

  // Verify user owns this goal
  if (data.user_id !== user.id) {
    throw new Error("Unauthorized access to goal");
  }

  return data as GoalRow;
}

/**
 * Marks a task as done and activates the next task
 * 
 * @param taskId - The task ID to mark as done
 * @param goalId - The goal ID (for verification)
 * @returns Updated task list
 * @throws Error if task doesn't exist or update fails
 */
export async function markTaskDone(
  taskId: string,
  goalId: string
): Promise<TrialTaskRow[]> {
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

  // Get the task to mark as done
  const { data: taskData, error: taskError } = await supabase
    .from("trial_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("goal_id", goalId)
    .single();

  if (taskError || !taskData) {
    throw new Error("Task not found");
  }

  // Update task to COMPLETED
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("trial_tasks")
    .update({
      status: "COMPLETED",
      completed_at: now,
    })
    .eq("id", taskId);

  if (updateError) {
    throw new Error(`Failed to mark task as done: ${updateError.message}`);
  }

  // Find and activate the next task
  const { data: nextTask, error: nextTaskError } = await supabase
    .from("trial_tasks")
    .select("*")
    .eq("goal_id", goalId)
    .eq("day_number", taskData.day_number + 1)
    .single();

  if (nextTaskError) {
    // No next task found - this is the last task
    // This will be handled by the graduation handler (feature 2.8)
  } else if (nextTask) {
    // Activate the next task
    const { error: activateError } = await supabase
      .from("trial_tasks")
      .update({
        status: "ACTIVE",
      })
      .eq("id", nextTask.id);

    if (activateError) {
      // Log error but don't fail the operation
      console.error("Failed to activate next task:", activateError);
    }
  }

  // Return updated task list
  return getTrialTasks(goalId);
}

/**
 * Archives a goal by setting its status to QUARANTINE
 * 
 * @param goalId - The goal ID to archive
 * @returns Success status
 * @throws Error if goal doesn't exist or update fails
 */
export async function giveUpGoal(goalId: string): Promise<{ success: boolean }> {
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

  // Update goal status to QUARANTINE
  const { error: updateError } = await supabase
    .from("goals")
    .update({
      status: "QUARANTINE",
    })
    .eq("id", goalId);

  if (updateError) {
    throw new Error(`Failed to archive goal: ${updateError.message}`);
  }

  return { success: true };
}
