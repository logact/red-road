/**
 * Core job mutator logic
 * 
 * Feature 5.4: Generates a new version of a job based on user feedback.
 * This module contains the core job mutation logic that can be used
 * by both server actions and test scripts.
 */

import OpenAI from "openai";
import { JobMutationSchema, type JobMutation } from "./schemas";
import { JOB_MUTATOR_PROMPT } from "./prompts";

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
 * Job context for mutator analysis
 */
export interface JobMutationContext {
  job: {
    title: string;
    type: string;
    est_minutes: number;
  };
  goal: {
    title: string;
    scope?: {
      tech_stack?: string[];
      user_background_level?: string;
      hard_constraint_hours_per_week?: number;
      definition_of_done?: string;
    };
    complexity?: {
      size: string;
      estimated_total_hours?: number;
    };
  };
  milestone?: {
    title: string;
    acceptance_criteria?: string;
  };
}

/**
 * Core job mutator function
 * 
 * Generates a new version of a job based on user feedback.
 * This is "Feature 5.4" in the Recalibrator flow.
 * 
 * @param userReason - The user's reason for wanting to change the job
 * @param context - The job context (job, goal, milestone)
 * @returns Object containing both raw LLM response and validated result
 * @throws Error if API key is missing, API call fails, or validation fails
 */
export async function mutateJobCore(
  userReason: string,
  context: JobMutationContext
): Promise<{
  rawResponse: string;
  result: JobMutation;
}> {
  const openai = getOpenAIClient();

  try {
    // Build the user message with job context and user reason
    const scopeInfo = context.goal.scope
      ? {
          tech_stack: context.goal.scope.tech_stack || [],
          user_background_level: context.goal.scope.user_background_level || "INTERMEDIATE",
          hard_constraint_hours_per_week: context.goal.scope.hard_constraint_hours_per_week || 0,
          definition_of_done: context.goal.scope.definition_of_done || "",
        }
      : {
          tech_stack: [],
          user_background_level: "INTERMEDIATE",
          hard_constraint_hours_per_week: 0,
          definition_of_done: "",
        };

    const contextMessage = `Original Job:
- Title: "${context.job.title}"
- Type: ${context.job.type}
- Est Minutes: ${context.job.est_minutes}
- Goal: "${context.goal.title}"
${context.goal.complexity ? `- Complexity Size: ${context.goal.complexity.size}` : ""}
${scopeInfo.tech_stack.length > 0 ? `- Tech Stack: ${scopeInfo.tech_stack.join(", ")}` : ""}
${scopeInfo.user_background_level ? `- User Background: ${scopeInfo.user_background_level}` : ""}
${context.milestone ? `- Milestone: "${context.milestone.title}"` : ""}
${context.milestone?.acceptance_criteria ? `- Acceptance Criteria: "${context.milestone.acceptance_criteria}"` : ""}
${scopeInfo.definition_of_done ? `- Definition of Done: "${scopeInfo.definition_of_done}"` : ""}

User Reason: "${userReason}"`;

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: JOB_MUTATOR_PROMPT },
        {
          role: "user",
          content: contextMessage,
        },
      ],
      temperature: 0.4, // Similar to job atomizer for consistent structure
      max_tokens: 500, // Single job, so smaller response
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
    const validated = JobMutationSchema.parse(parsed);

    // Additional runtime check for atomic constraint (safety net)
    if (validated.est_minutes > 120) {
      throw new Error(
        `Mutated job violates atomic constraint: has ${validated.est_minutes} minutes (max 120)`
      );
    }

    return {
      rawResponse,
      result: validated,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with more context
      throw new Error(`Job mutation failed: ${error.message}`);
    }
    throw error;
  }
}
