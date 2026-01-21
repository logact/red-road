"use server";

/**
 * Server Action for calculating stress test score and decision
 * 
 * Calculates commitment score from user answers and determines if goal should
 * proceed to trial generator or be rejected.
 * This is the server action wrapper around the core scoring logic.
 */

import { calculateScoreCore, ScoringResult } from "../ai/scoring";
import { StressTestAnswersSchema } from "../ai/schemas";
import { createClient } from "../supabase/server";
import { generateTrialPlan } from "./trial-generator";
import type { GoalInsert } from "@/types/volition";

/**
 * Calculates score and decision from stress test answers
 * 
 * @param answers - Array of 6 user answers with questionIndex and selectedScore
 * @param goalTitle - The goal title (required when decision is PROCEED to create goal and generate trial)
 * @returns Scoring result with calculated score, pain score, drive score, decision, and optional goalId
 * @throws Error if answers are invalid or goal creation/trial generation fails
 */
export async function calculateScoreAndDecision(
  answers: Array<{ questionIndex: number; selectedScore: number }>,
  goalTitle: string
): Promise<ScoringResult> {
  // Validate input against Zod schema
  const validatedAnswers = StressTestAnswersSchema.parse(answers);

  // Calculate score using core logic
  const result = calculateScoreCore(validatedAnswers);

  // If decision is PROCEED, create goal and generate trial plan
  if (result.decision === "PROCEED") {
    if (!goalTitle || goalTitle.trim() === "") {
      throw new Error("Goal title is required when decision is PROCEED");
    }

    // Get Supabase client
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("User authentication required to create goal");
    }

    // Create goal with default values
    const goalInsert: GoalInsert = {
      user_id: user.id,
      title: goalTitle.trim(),
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
      status: "PENDING_SCOPE", // Will be updated to ACTIVE after trial completion
    };

    // Insert goal into database
    const { data: goalData, error: goalError } = await supabase
      .from("goals")
      .insert(goalInsert)
      .select()
      .single();

    if (goalError || !goalData) {
      throw new Error(
        `Failed to create goal: ${goalError?.message || "Unknown error"}`
      );
    }

    // Generate trial plan
    try {
      await generateTrialPlan(goalData.id, goalTitle);
    } catch (trialError) {
      // If trial generation fails, we should still return the goal ID
      // but log the error (in production, you might want to handle this differently)
      console.error("Failed to generate trial plan:", trialError);
      // Re-throw to let caller know something went wrong
      throw new Error(
        `Goal created but trial plan generation failed: ${trialError instanceof Error ? trialError.message : "Unknown error"}`
      );
    }

    // Return result with goalId
    return {
      ...result,
      goalId: goalData.id,
    };
  }

  // If decision is REJECT, just return the result without goalId
  return result;
}
