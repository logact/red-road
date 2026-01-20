/**
 * Core classifier logic
 * 
 * This module contains the core classification logic that can be used
 * by both server actions and test scripts.
 */

import OpenAI from "openai";
import { ClassifierResponseSchema } from "./schemas";
import { CLASSIFIER_SYSTEM_PROMPT } from "./prompts";

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
 * Core classifier function
 * 
 * Classifies user input as either INCUBATOR (reflective/emotional) or
 * GATEKEEPER (intent/ambition).
 * 
 * @param input - User input text to classify
 * @returns Object containing both raw LLM response and validated result
 * @throws Error if API key is missing, API call fails, or validation fails
 */
export async function classifyInputCore(
  input: string
): Promise<{ rawResponse: string; result: "INCUBATOR" | "GATEKEEPER" }> {
  const openai = getOpenAIClient();

  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
        { role: "user", content: input },
      ],
      temperature: 0.3, // Lower temperature for more consistent classification
      max_tokens: 10, // Only need one word response
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim() || "";

    if (!rawResponse) {
      throw new Error("Empty response from LLM");
    }

    // Validate response against Zod schema
    const validated = ClassifierResponseSchema.parse(rawResponse);

    return {
      rawResponse,
      result: validated,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with more context
      throw new Error(`Classification failed: ${error.message}`);
    }
    throw error;
  }
}
