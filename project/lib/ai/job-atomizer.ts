/**
 * Core job atomizer logic
 * 
 * This module contains the core job generation logic that can be used
 * by both server actions and test scripts.
 */

import OpenAI from "openai";
import { JobAtomizerResponseSchema, JobAtomizerResponse } from "./schemas";
import { JOB_ATOMIZER_PROMPT } from "./prompts";
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
 * Core job atomizer function
 * 
 * Generates Job Clusters and Jobs for a specific milestone.
 * This is "Prompt C" in the Adaptive Architect flow.
 * 
 * @param goalTitle - The goal title
 * @param milestoneTitle - The milestone title
 * @param milestoneAcceptanceCriteria - The milestone acceptance criteria
 * @param scope - The scope object containing hours/week, tech stack, and definition of done
 * @param complexity - The complexity assessment (size, estimated hours, projected end date)
 * @returns Object containing both raw LLM response and validated result
 * @throws Error if API key is missing, API call fails, or validation fails
 */
export async function generateJobsCore(
  goalTitle: string,
  milestoneTitle: string,
  milestoneAcceptanceCriteria: string,
  scope: Scope,
  complexity: Complexity
): Promise<{
  rawResponse: string;
  result: JobAtomizerResponse;
}> {
  const openai = getOpenAIClient();

  try {
    // Build the user message with goal, milestone, scope, and complexity information
    const scopeInfo = {
      hard_constraint_hours_per_week: scope.hard_constraint_hours_per_week,
      tech_stack: scope.tech_stack,
      definition_of_done: scope.definition_of_done || "",
      user_background_level: scope.user_background_level || "INTERMEDIATE",
    };

    const userMessage = `Goal: "${goalTitle}"
Milestone: "${milestoneTitle}"
Acceptance Criteria: "${milestoneAcceptanceCriteria}"
Scope: ${JSON.stringify(scopeInfo, null, 2)}
Complexity: ${JSON.stringify(complexity, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: JOB_ATOMIZER_PROMPT },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.4, // Similar to blueprint generator for consistent structure
      max_tokens: 2000, // Jobs can be numerous, so allow larger response
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
    // This will enforce atomic constraint (est_minutes ≤ 120)
    const validated = JobAtomizerResponseSchema.parse(parsed);

    // Additional runtime check for atomic constraint (safety net)
    for (const cluster of validated) {
      for (const job of cluster.jobs) {
        if (job.est_minutes > 120) {
          throw new Error(
            `Job "${job.title}" violates atomic constraint: has ${job.est_minutes} minutes (max 120)`
          );
        }
      }
    }

    return {
      rawResponse,
      result: validated,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with more context
      throw new Error(`Job generation failed: ${error.message}`);
    }
    throw error;
  }
}
