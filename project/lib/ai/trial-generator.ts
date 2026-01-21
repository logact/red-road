/**
 * Core trial generator logic
 * 
 * This module contains the core trial plan generation logic that can be used
 * by both server actions and test scripts.
 */

import OpenAI from "openai";
import { TrialPlanResponseSchema } from "./schemas";
import { TRIAL_GENERATOR_PROMPT } from "./prompts";

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
 * Core trial plan generator function
 * 
 * Generates a 3-7 day micro-plan with short, executable tasks (<20 min) for a given goal title.
 * Tasks are tailored to the specific goal and validated against schema.
 * 
 * @param goalTitle - The goal title to generate trial plan for
 * @returns Object containing both raw LLM response and validated result
 * @throws Error if API key is missing, API call fails, or validation fails
 */
export async function generateTrialPlanCore(
  goalTitle: string
): Promise<{
  rawResponse: string;
  result: Array<{
    day_number: number;
    task_title: string;
    est_minutes: number;
    acceptance_criteria: string;
  }>;
}> {
  const openai = getOpenAIClient();

  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: TRIAL_GENERATOR_PROMPT },
        {
          role: "user",
          content: `Generate a trial plan for this goal: "${goalTitle}"`,
        },
      ],
      temperature: 0.7, // Slightly higher for more creative, goal-specific tasks
      max_tokens: 1500, // Sufficient for 3-7 tasks with descriptions
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
    const validated = TrialPlanResponseSchema.parse(parsed);

    return {
      rawResponse,
      result: validated,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with more context
      throw new Error(`Trial plan generation failed: ${error.message}`);
    }
    throw error;
  }
}
