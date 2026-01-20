"use server";

/**
 * Server Action for classifying user input
 * 
 * Routes user input to either INCUBATOR or GATEKEEPER.
 * This is the server action wrapper around the core classifier logic.
 */

import { classifyInputCore } from "../ai/classifier";

/**
 * Classifies user input and returns the result
 * 
 * @param input - User input text to classify
 * @returns "INCUBATOR" or "GATEKEEPER"
 */
export async function classifyInput(
  input: string
): Promise<"INCUBATOR" | "GATEKEEPER"> {
  const { result } = await classifyInputCore(input);
  return result;
}
