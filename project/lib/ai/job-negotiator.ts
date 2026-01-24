/**
 * AI-powered job negotiator
 * 
 * Feature 5.3: Analyzes user's change reason and job context to recommend
 * whether to insist on the current job or agree to change it.
 */

import OpenAI from "openai";
import { NegotiatorResponseSchema, type NegotiatorResponse } from "./schemas";
import { NEGOTIATOR_PROMPT } from "./prompts";
import type { JobRow } from "@/types/volition";

/**
 * DeepSeek API client configuration
 */
const getOpenAIClient = (): OpenAI => {
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
 * Job context for negotiator analysis
 */
export interface JobNegotiationContext {
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
    };
  };
  milestone?: {
    title: string;
    acceptance_criteria?: string;
  };
}

/**
 * Core negotiator function
 * 
 * Analyzes the user's change reason and job context to provide
 * a recommendation (INSIST or CHANGE) with advice.
 * 
 * @param userReason - The user's reason for wanting to change the job
 * @param context - The job context (job, goal, milestone)
 * @returns Object containing both raw LLM response and validated result
 * @throws Error if API key is missing, API call fails, or validation fails
 */
export async function negotiateJobCore(
  userReason: string,
  context: JobNegotiationContext
): Promise<{
  rawResponse: string;
  result: NegotiatorResponse;
}> {
  const openai = getOpenAIClient();

  try {
    // Build the user message with job context and user reason
    const contextMessage = `Job Context:
- Title: "${context.job.title}"
- Type: ${context.job.type}
- Est Minutes: ${context.job.est_minutes}
- Goal: "${context.goal.title}"
${context.goal.scope?.tech_stack ? `- Tech Stack: ${context.goal.scope.tech_stack.join(", ")}` : ""}
${context.goal.scope?.user_background_level ? `- User Background: ${context.goal.scope.user_background_level}` : ""}
${context.milestone ? `- Milestone: "${context.milestone.title}"` : ""}
${context.milestone?.acceptance_criteria ? `- Acceptance Criteria: "${context.milestone.acceptance_criteria}"` : ""}

User Reason: "${userReason}"`;

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: NEGOTIATOR_PROMPT },
        {
          role: "user",
          content: contextMessage,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, analytical responses
      max_tokens: 300, // Advice should be concise (2-4 sentences)
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
    const validated = NegotiatorResponseSchema.parse(parsed);

    return {
      rawResponse,
      result: validated,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with more context
      throw new Error(`Job negotiation failed: ${error.message}`);
    }
    throw error;
  }
}
