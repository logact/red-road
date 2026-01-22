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

/**
 * Answer option schema
 * Validates individual answer options with text and score (1-5)
 */
export const AnswerOptionSchema = z.object({
  text: z.string().min(1, "Answer option text cannot be empty"),
  score: z.number().int().min(1).max(5, "Score must be between 1 and 5"),
});

/**
 * Stress test question schema
 * Validates individual questions with type (PAIN or DRIVE), question text, and answer options
 */
export const StressTestQuestionSchema = z.object({
  type: z.enum(["PAIN", "DRIVE"], {
    errorMap: () => ({
      message: "Question type must be either 'PAIN' or 'DRIVE'",
    }),
  }),
  question: z.string().min(1, "Question text cannot be empty"),
  answerOptions: z
    .array(AnswerOptionSchema)
    .length(5, "Must contain exactly 5 answer options")
    .refine(
      (options) => {
        const scores = options.map((opt) => opt.score).sort((a, b) => a - b);
        // Check that scores are 1, 2, 3, 4, 5
        return (
          scores.length === 5 &&
          scores[0] === 1 &&
          scores[1] === 2 &&
          scores[2] === 3 &&
          scores[3] === 4 &&
          scores[4] === 5
        );
      },
      {
        message: "Answer options must have scores 1, 2, 3, 4, 5",
      }
    ),
});

/**
 * Stress test response schema
 * Validates that the response contains exactly 6 questions:
 * - 3 PAIN questions (negative consequences/obstacles)
 * - 3 DRIVE questions (commitment/willingness)
 * Each question must have 5 answer options with scores 1-5
 */
export const StressTestResponseSchema = z
  .array(StressTestQuestionSchema)
  .length(6, "Must contain exactly 6 questions")
  .refine(
    (questions) => {
      const painCount = questions.filter((q) => q.type === "PAIN").length;
      const driveCount = questions.filter((q) => q.type === "DRIVE").length;
      return painCount === 3 && driveCount === 3;
    },
    {
      message: "Must contain exactly 3 PAIN questions and 3 DRIVE questions",
    }
  );

/**
 * Type inferred from AnswerOptionSchema
 */
export type AnswerOption = z.infer<typeof AnswerOptionSchema>;

/**
 * Type inferred from StressTestQuestionSchema
 */
export type StressTestQuestion = z.infer<typeof StressTestQuestionSchema>;

/**
 * Type inferred from StressTestResponseSchema
 */
export type StressTestResponse = z.infer<typeof StressTestResponseSchema>;

/**
 * Stress test answer schema
 * Validates individual user answer with question index and selected score
 */
export const StressTestAnswerSchema = z.object({
  questionIndex: z.number().int().min(0).max(5, "Question index must be between 0 and 5"),
  selectedScore: z.number().int().min(1).max(5, "Selected score must be between 1 and 5"),
});

/**
 * Stress test answers schema
 * Validates that the response contains exactly 6 answers (one for each question)
 */
export const StressTestAnswersSchema = z
  .array(StressTestAnswerSchema)
  .length(6, "Must contain exactly 6 answers")
  .refine(
    (answers) => {
      // Check that all question indices are present (0-5)
      const indices = answers.map((a) => a.questionIndex).sort((a, b) => a - b);
      const expectedIndices = [0, 1, 2, 3, 4, 5];
      return JSON.stringify(indices) === JSON.stringify(expectedIndices);
    },
    {
      message: "Answers must cover all question indices from 0 to 5",
    }
  );

/**
 * Scoring decision schema
 * Validates that the decision is either REJECT or PROCEED
 */
export const ScoringDecisionSchema = z.enum(["REJECT", "PROCEED"], {
  errorMap: () => ({
    message: "Decision must be either 'REJECT' or 'PROCEED'",
  }),
});

/**
 * Type inferred from StressTestAnswerSchema
 */
export type StressTestAnswer = z.infer<typeof StressTestAnswerSchema>;

/**
 * Type inferred from StressTestAnswersSchema
 */
export type StressTestAnswers = z.infer<typeof StressTestAnswersSchema>;

/**
 * Type inferred from ScoringDecisionSchema
 */
export type ScoringDecision = z.infer<typeof ScoringDecisionSchema>;

/**
 * Trial task schema
 * Validates individual trial task with day_number, task_title, and est_minutes
 * Each task must be < 20 minutes and executable
 */
export const TrialTaskSchema = z.object({
  day_number: z
    .number()
    .int()
    .min(1, "Day number must be at least 1")
    .max(7, "Day number must be at most 7"),
  task_title: z.string().min(1, "Task title cannot be empty"),
  est_minutes: z
    .number()
    .int()
    .min(1, "Estimated minutes must be at least 1")
    .max(19, "Estimated minutes must be less than 20"),
  acceptance_criteria: z.string().min(1, "Acceptance criteria cannot be empty"),
});

/**
 * Trial plan response schema
 * Validates that the response contains 3-7 daily tasks
 * Each task must be < 20 minutes and executable
 */
export const TrialPlanResponseSchema = z
  .array(TrialTaskSchema)
  .min(3, "Must contain at least 3 tasks")
  .max(7, "Must contain at most 7 tasks")
  .refine(
    (tasks) => {
      // Check that day_numbers are unique and sequential from 1
      const dayNumbers = tasks.map((t) => t.day_number).sort((a, b) => a - b);
      const expectedDays = Array.from({ length: dayNumbers.length }, (_, i) => i + 1);
      return JSON.stringify(dayNumbers) === JSON.stringify(expectedDays);
    },
    {
      message: "Day numbers must be unique and sequential starting from 1",
    }
  );

/**
 * Type inferred from TrialTaskSchema
 */
export type TrialTask = z.infer<typeof TrialTaskSchema>;

/**
 * Type inferred from TrialPlanResponseSchema
 */
export type TrialPlanResponse = z.infer<typeof TrialPlanResponseSchema>;

/**
 * Complexity size categories
 * SMALL: < 20 hours
 * MEDIUM: 20-100 hours
 * LARGE: > 100 hours
 */
export const ComplexitySizeSchema = z.enum(["SMALL", "MEDIUM", "LARGE"], {
  errorMap: () => ({
    message: "Size must be either 'SMALL', 'MEDIUM', or 'LARGE'",
  }),
});

/**
 * Complexity assessment schema
 * Validates the complexity estimation result from the LLM
 * 
 * @property size - The complexity category (SMALL < 20h, MEDIUM 20-100h, LARGE > 100h)
 * @property estimated_total_hours - Total estimated hours for the goal (must be positive)
 * @property projected_end_date - Projected completion date (ISO string format)
 */
export const ComplexitySchema = z.object({
  size: ComplexitySizeSchema,
  estimated_total_hours: z
    .number()
    .positive("Estimated total hours must be a positive number")
    .finite("Estimated total hours must be a finite number"),
  projected_end_date: z.string().min(1, "Projected end date cannot be empty"),
});

/**
 * Type inferred from ComplexitySizeSchema
 */
export type ComplexitySize = z.infer<typeof ComplexitySizeSchema>;

/**
 * Type inferred from ComplexitySchema
 */
export type Complexity = z.infer<typeof ComplexitySchema>;

/**
 * Milestone blueprint schema
 * Validates individual milestone in the blueprint structure
 */
export const MilestoneBlueprintSchema = z.object({
  title: z.string().min(1, "Milestone title cannot be empty"),
  acceptance_criteria: z.string().min(1, "Acceptance criteria cannot be empty"),
});

/**
 * Phase blueprint schema
 * Validates phase with milestones array (enforces Miller's Law: max 7 milestones)
 */
export const PhaseBlueprintSchema = z.object({
  title: z.string().min(1, "Phase title cannot be empty"),
  milestones: z
    .array(MilestoneBlueprintSchema)
    .min(1, "Phase must have at least 1 milestone")
    .max(7, "Phase cannot have more than 7 milestones (Miller's Law)"),
});

/**
 * Blueprint response schema
 * Validates the full blueprint structure with phases array
 * Each phase must have ≤ 7 milestones (Miller's Law)
 */
export const BlueprintResponseSchema = z
  .array(PhaseBlueprintSchema)
  .min(1, "Blueprint must have at least 1 phase")
  .refine(
    (phases) => {
      // Additional safety check: ensure all phases comply with Miller's Law
      return phases.every((phase) => phase.milestones.length <= 7);
    },
    {
      message: "All phases must comply with Miller's Law (max 7 milestones per phase)",
    }
  );

/**
 * Type inferred from MilestoneBlueprintSchema
 */
export type MilestoneBlueprint = z.infer<typeof MilestoneBlueprintSchema>;

/**
 * Type inferred from PhaseBlueprintSchema
 */
export type PhaseBlueprint = z.infer<typeof PhaseBlueprintSchema>;

/**
 * Type inferred from BlueprintResponseSchema
 */
export type BlueprintResponse = z.infer<typeof BlueprintResponseSchema>;

/**
 * Job type schema for atomizer
 * Validates that job type is one of: QUICK_WIN, DEEP_WORK, ANCHOR
 */
export const JobTypeSchema = z.enum(["QUICK_WIN", "DEEP_WORK", "ANCHOR"], {
  errorMap: () => ({
    message: "Job type must be either 'QUICK_WIN', 'DEEP_WORK', or 'ANCHOR'",
  }),
});

/**
 * Job atomizer schema
 * Validates individual job with atomic constraint (est_minutes ≤ 120)
 */
export const JobAtomizerSchema = z.object({
  title: z.string().min(1, "Job title cannot be empty"),
  type: JobTypeSchema,
  est_minutes: z
    .number()
    .int()
    .min(1, "Estimated minutes must be at least 1")
    .max(120, "Estimated minutes must be at most 120 (atomic constraint)"),
});

/**
 * Job cluster atomizer schema
 * Validates job cluster with jobs array
 */
export const JobClusterAtomizerSchema = z.object({
  title: z.string().min(1, "Job cluster title cannot be empty"),
  jobs: z
    .array(JobAtomizerSchema)
    .min(1, "Job cluster must have at least 1 job"),
});

/**
 * Job atomizer response schema
 * Validates the full response (array of clusters with jobs)
 */
export const JobAtomizerResponseSchema = z
  .array(JobClusterAtomizerSchema)
  .min(1, "Must contain at least 1 job cluster")
  .refine(
    (clusters) => {
      // Additional runtime check: ensure all jobs comply with atomic constraint
      for (const cluster of clusters) {
        for (const job of cluster.jobs) {
          if (job.est_minutes > 120) {
            return false;
          }
        }
      }
      return true;
    },
    {
      message: "All jobs must comply with atomic constraint (est_minutes ≤ 120)",
    }
  );

/**
 * Type inferred from JobAtomizerSchema
 */
export type JobAtomizer = z.infer<typeof JobAtomizerSchema>;

/**
 * Type inferred from JobClusterAtomizerSchema
 */
export type JobClusterAtomizer = z.infer<typeof JobClusterAtomizerSchema>;

/**
 * Type inferred from JobAtomizerResponseSchema
 */
export type JobAtomizerResponse = z.infer<typeof JobAtomizerResponseSchema>;
