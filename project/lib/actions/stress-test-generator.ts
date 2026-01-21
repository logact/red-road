"use server";

/**
 * Server Action for generating stress test questions
 * 
 * Generates 3 Pain questions and 3 Drive questions for a goal title.
 * This is the server action wrapper around the core generator logic.
 */

import { generateStressTestQuestionsCore } from "../ai/stress-test-generator";

/**
 * Generates stress test questions for a goal title
 * 
 * @param goalTitle - The goal title to generate questions for
 * @returns Array of 6 questions (3 PAIN, 3 DRIVE) with type, question text, and answer options
 */
export async function generateStressTestQuestions(
  goalTitle: string
): Promise<
  Array<{
    type: "PAIN" | "DRIVE";
    question: string;
    answerOptions: Array<{ text: string; score: number }>;
  }>
> {
  const { result } = await generateStressTestQuestionsCore(goalTitle);
  return result;
}
