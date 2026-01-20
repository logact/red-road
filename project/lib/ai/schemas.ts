/**
 * Zod schemas for validating LLM outputs
 * 
 * CRITICAL: Every LLM output must be validated against a Zod schema
 * before being used in the application.
 */

import { z } from "zod";

/**
 * Classifier response schema
 * Validates that the LLM returns either "INCUBATOR" or "GATEKEEPER"
 */
export const ClassifierResponseSchema = z.enum(["INCUBATOR", "GATEKEEPER"], {
  errorMap: () => ({
    message: "Response must be either 'INCUBATOR' or 'GATEKEEPER'",
  }),
});

/**
 * Type inferred from ClassifierResponseSchema
 */
export type ClassifierResponse = z.infer<typeof ClassifierResponseSchema>;
