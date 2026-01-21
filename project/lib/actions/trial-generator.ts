"use server";

/**
 * Server Action for generating trial plan tasks
 * 
 * Generates a 3-7 day micro-plan with short, executable tasks (<20 min) for a goal.
 * This is the server action wrapper around the core generator logic.
 */

import { generateTrialPlanCore } from "../ai/trial-generator";
import { createClient } from "../supabase/server";
import type { TrialTaskRow } from "@/types/volition";

/**
 * Generates trial plan tasks for a goal and inserts them into the database
 * 
 * @param goalId - The goal ID to generate tasks for
 * @param goalTitle - The goal title to generate tasks for
 * @returns Array of inserted trial tasks
 * @throws Error if generation fails or database insertion fails
 */
export async function generateTrialPlan(
  goalId: string,
  goalTitle: string
): Promise<TrialTaskRow[]> {
  // Generate trial plan using AI
  const { result } = await generateTrialPlanCore(goalTitle);

  // Get Supabase client
  const supabase = await createClient();

  // Calculate scheduled dates (today + day_number - 1)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day

  // Prepare tasks for insertion
  const tasksToInsert = result.map((task) => {
    const scheduledDate = new Date(today);
    scheduledDate.setDate(today.getDate() + task.day_number - 1);
    
    // Format date as YYYY-MM-DD
    const scheduledDateStr = scheduledDate.toISOString().split("T")[0];

    return {
      goal_id: goalId,
      day_number: task.day_number,
      task_title: task.task_title,
      est_minutes: task.est_minutes,
      status: "PENDING" as const,
      scheduled_date: scheduledDateStr,
      completed_at: null,
      notes: null,
      acceptance_criteria: task.acceptance_criteria,
    };
  });

  // Insert tasks into database
  const { data, error } = await supabase
    .from("trial_tasks")
    .insert(tasksToInsert)
    .select();

  if (error) {
    throw new Error(`Failed to insert trial tasks: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from trial tasks insertion");
  }

  return data as TrialTaskRow[];
}
