/**
 * Core scoring logic
 * 
 * This module contains the core scoring calculation logic that can be used
 * by both server actions and test scripts.
 */

import { StressTestAnswer, ScoringDecision } from "./schemas";

/**
 * Scoring result interface
 */
export interface ScoringResult {
  score: number;
  painScore: number;
  driveScore: number;
  decision: ScoringDecision;
  goalId?: string; // Optional goal ID, set when decision is PROCEED and goal is created
}

/**
 * Core scoring function
 * 
 * Calculates commitment score from user answers to stress test questions.
 * Formula: (Pain*0.4 + Drive*0.6) * 20
 * 
 * Assumptions:
 * - First 3 answers (indices 0-2) are PAIN questions
 * - Last 3 answers (indices 3-5) are DRIVE questions
 * 
 * @param answers - Array of 6 user answers with questionIndex and selectedScore
 * @returns Scoring result with calculated score, pain score, drive score, and decision
 * @throws Error if answers are invalid or incomplete
 */
export function calculateScoreCore(
  answers: StressTestAnswer[]
): ScoringResult {
  if (answers.length !== 6) {
    throw new Error("Must provide exactly 6 answers");
  }

  // Sort answers by questionIndex to ensure correct order
  const sortedAnswers = [...answers].sort((a, b) => a.questionIndex - b.questionIndex);

  // Verify all indices are present (0-5)
  const indices = sortedAnswers.map((a) => a.questionIndex);
  const expectedIndices = [0, 1, 2, 3, 4, 5];
  if (JSON.stringify(indices) !== JSON.stringify(expectedIndices)) {
    throw new Error("Answers must cover all question indices from 0 to 5");
  }

  // Separate into PAIN (indices 0-2) and DRIVE (indices 3-5)
  const painAnswers = sortedAnswers.slice(0, 3);
  const driveAnswers = sortedAnswers.slice(3, 6);

  // Calculate sums
  const painSum = painAnswers.reduce((sum, answer) => sum + answer.selectedScore, 0);
  const driveSum = driveAnswers.reduce((sum, answer) => sum + answer.selectedScore, 0);

  // Normalize to 1-5 range by dividing by 3 (since we have 3 questions)
  const painScore = painSum / 3;
  const driveScore = driveSum / 3;

  // Apply weighted formula: (Pain*0.4 + Drive*0.6) * 20
  // This scales the result from 1-5 range to 20-100 range
  const score = (painScore * 0.4 + driveScore * 0.6) * 20;

  // Determine decision: score < 60 ? REJECT : PROCEED
  const decision: ScoringDecision = score < 60 ? "REJECT" : "PROCEED";

  return {
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    painScore: Math.round(painScore * 100) / 100,
    driveScore: Math.round(driveScore * 100) / 100,
    decision,
  };
}
