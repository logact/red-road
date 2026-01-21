/**
 * Core stress test generator logic
 * 
 * This module contains the core question generation logic that can be used
 * by both server actions and test scripts.
 */

import OpenAI from "openai";
import { StressTestResponseSchema } from "./schemas";
import { STRESS_TEST_GENERATOR_PROMPT } from "./prompts";

/**
 * DeepSeek API client configuration
 */
const getOpenAIClient = () => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY environment variable is not set");
  }

  return new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: apiKey,
  });
};

/**
 * Core stress test generator function
 * 
 * Generates 3 Pain questions and 3 Drive questions for a given goal title.
 * Each question includes 5 answer options with scores 1-5.
 * Questions are tailored to the specific goal and validated against schema.
 * 
 * @param goalTitle - The goal title to generate questions for
 * @returns Object containing both raw LLM response and validated result
 * @throws Error if API key is missing, API call fails, or validation fails
 */
export async function generateStressTestQuestionsCore(
  goalTitle: string
): Promise<{
  rawResponse: string;
  result: Array<{
    type: "PAIN" | "DRIVE";
    question: string;
    answerOptions: Array<{ text: string; score: number }>;
  }>;
}> {
  const openai = getOpenAIClient();

  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: STRESS_TEST_GENERATOR_PROMPT },
        {
          role: "user",
          content: `Generate stress test questions for this goal: "${goalTitle}"`,
        },
      ],
      temperature: 0.7, // Slightly higher for more creative, goal-specific questions
      max_tokens: 2000, // Increased for 6 questions with 5 answer options each
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim() || "";

    if (!rawResponse) {
      throw new Error("Empty response from LLM");
    }

    // Parse JSON from response (may be wrapped in markdown code blocks)
    let jsonString = rawResponse;
    
    // Remove markdown code blocks if present
    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim();
    }

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseError) {
      throw new Error(
        `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : "Unknown error"}`
      );
    }

    // Validate response against Zod schema
    const validated = StressTestResponseSchema.parse(parsed);

    return {
      rawResponse,
      result: validated,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with more context
      throw new Error(`Stress test generation failed: ${error.message}`);
    }
    throw error;
  }
}
