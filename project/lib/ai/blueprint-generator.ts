/**
 * Core blueprint generator logic
 * 
 * This module contains the core blueprint generation logic that can be used
 * by both server actions and test scripts.
 */

import OpenAI from "openai";
import { BlueprintResponseSchema, BlueprintResponse } from "./schemas";
import { BLUEPRINT_GENERATOR_PROMPT } from "./prompts";
import type { Complexity, Scope } from "@/types/volition";

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
 * Core blueprint generator function
 * 
 * Generates the Phases & Milestones structure based on goal complexity.
 * This is "Prompt B" in the Adaptive Architect flow.
 * 
 * @param goalTitle - The goal title to generate blueprint for
 * @param complexity - The complexity assessment (size, estimated hours, projected end date)
 * @param scope - The scope object containing hours/week, tech stack, and definition of done
 * @returns Object containing both raw LLM response and validated result
 * @throws Error if API key is missing, API call fails, or validation fails
 */
export async function generateBlueprintCore(
  goalTitle: string,
  complexity: Complexity,
  scope: Scope
): Promise<{
  rawResponse: string;
  result: BlueprintResponse;
}> {
  const openai = getOpenAIClient();

  try {
    // Build the user message with goal, complexity, and scope information
    const scopeInfo = {
      hard_constraint_hours_per_week: scope.hard_constraint_hours_per_week,
      tech_stack: scope.tech_stack,
      definition_of_done: scope.definition_of_done || "",
      user_background_level: scope.user_background_level || "INTERMEDIATE",
    };

    const userMessage = `Goal: "${goalTitle}"
Complexity: ${JSON.stringify(complexity, null, 2)}
Scope: ${JSON.stringify(scopeInfo, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: BLUEPRINT_GENERATOR_PROMPT },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.4, // Slightly higher than complexity estimator for more creative structure
      max_tokens: 2000, // Blueprint can be larger than complexity response
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
    // This will enforce Miller's Law (max 7 milestones per phase)
    const validated = BlueprintResponseSchema.parse(parsed);

    // Additional runtime check for Miller's Law (safety net)
    for (const phase of validated) {
      if (phase.milestones.length > 7) {
        throw new Error(
          `Phase "${phase.title}" violates Miller's Law: has ${phase.milestones.length} milestones (max 7)`
        );
      }
    }

    return {
      rawResponse,
      result: validated,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with more context
      throw new Error(`Blueprint generation failed: ${error.message}`);
    }
    throw error;
  }
}
