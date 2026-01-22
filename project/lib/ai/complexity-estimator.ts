/**
 * Core complexity estimator logic
 * 
 * This module contains the core complexity estimation logic that can be used
 * by both server actions and test scripts.
 */

import OpenAI from "openai";
import { ComplexitySchema, Complexity } from "./schemas";
import { COMPLEXITY_ESTIMATOR_PROMPT } from "./prompts";
import type { Scope } from "@/types/volition";

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
 * Core complexity estimator function
 * 
 * Analyzes a goal's title and scope to estimate total effort hours and categorize
 * the goal as SMALL, MEDIUM, or LARGE. Also calculates projected end date.
 * 
 * @param goalTitle - The goal title to estimate complexity for
 * @param scope - The scope object containing hours/week, tech stack, and definition of done
 * @returns Object containing both raw LLM response and validated result
 * @throws Error if API key is missing, API call fails, or validation fails
 */
export async function estimateComplexityCore(
  goalTitle: string,
  scope: Scope
): Promise<{
  rawResponse: string;
  result: Complexity;
}> {
  const openai = getOpenAIClient();

  try {
    // Build the user message with goal and scope information
    const scopeInfo = {
      hard_constraint_hours_per_week: scope.hard_constraint_hours_per_week,
      tech_stack: scope.tech_stack,
      definition_of_done: scope.definition_of_done || "",
      user_background_level: scope.user_background_level || "INTERMEDIATE", // Default to INTERMEDIATE if not provided
    };

    const userMessage = `Goal: "${goalTitle}"
Scope: ${JSON.stringify(scopeInfo, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: COMPLEXITY_ESTIMATOR_PROMPT },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, analytical estimates
      max_tokens: 500, // Sufficient for complexity JSON response
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
    const validated = ComplexitySchema.parse(parsed);

    // Enforce size logic based on estimated hours
    // SMALL: < 20 hours, MEDIUM: 20-100 hours, LARGE: > 100 hours
    if (validated.estimated_total_hours > 100) {
      validated.size = "LARGE";
    } else if (validated.estimated_total_hours >= 20) {
      validated.size = "MEDIUM";
    } else {
      validated.size = "SMALL";
    }

    return {
      rawResponse,
      result: validated,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with more context
      throw new Error(`Complexity estimation failed: ${error.message}`);
    }
    throw error;
  }
}
