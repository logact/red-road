/**
 * Core TypeScript interfaces for Volition OS
 * 
 * These types match the Supabase database schema exactly.
 * All UUID fields are represented as strings (Supabase returns them as strings).
 * All timestamp fields are represented as ISO string format.
 * JSONB fields use TypeScript interfaces that match the JSON structure.
 */

/**
 * Complexity assessment size categories.
 * Used to determine the structure of goal decomposition.
 */
export type ComplexitySize = "SMALL" | "MEDIUM" | "LARGE";

/**
 * Complexity assessment data structure.
 * Stored as JSONB in the goals.complexity column.
 * 
 * @property size - The complexity category (SMALL < 20h, MEDIUM 20-100h, LARGE > 100h)
 * @property estimated_total_hours - Total estimated hours for the goal
 * @property projected_end_date - Projected completion date (ISO string)
 */
export interface Complexity {
  size: ComplexitySize;
  estimated_total_hours: number;
  projected_end_date: string;
}

/**
 * User background/experience level for a goal.
 * Used to help estimate complexity more accurately.
 */
export type UserBackgroundLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

/**
 * Scope definition data structure.
 * Stored as JSONB in the goals.scope column.
 * 
 * @property hard_constraint_hours_per_week - Maximum hours per week available
 * @property tech_stack - Array of technologies/tools to be used
 * @property definition_of_done - Optional completion criteria
 * @property user_background_level - User's experience level related to this goal
 */
export interface Scope {
  hard_constraint_hours_per_week: number;
  tech_stack: string[];
  definition_of_done?: string;
  user_background_level?: UserBackgroundLevel;
}

/**
 * Job type categories for energy-based filtering.
 * - QUICK_WIN: Low energy tasks (< 30 min)
 * - DEEP_WORK: High energy tasks requiring focus
 * - ANCHOR: Critical path tasks
 */
export type JobType = "QUICK_WIN" | "DEEP_WORK" | "ANCHOR";

/**
 * Job execution status.
 */
export type JobStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "FAILED";

/**
 * Trial task status values.
 * Used for the 3-7 day micro-plan tasks generated during the gatekeeper phase.
 */
export type TrialTaskStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "SKIPPED";

/**
 * Job interface for application logic.
 * Represents an atomic task unit (< 2 hours).
 * 
 * Note: For database operations, use JobRow or JobInsert/JobUpdate types.
 */
export interface Job {
  id: string;
  job_cluster_id: string;
  title: string;
  type: JobType;
  est_minutes: number;
  status: JobStatus;
  failure_count: number;
  deadline: string | null;
  created_at: string;
}

/**
 * Job Cluster interface for application logic.
 * Groups related jobs within a milestone to prevent context switching.
 * 
 * Note: For database operations, use JobClusterRow or JobClusterInsert/JobClusterUpdate types.
 */
export interface JobCluster {
  id: string;
  milestone_id: string;
  title: string;
  created_at: string;
}

/**
 * Milestone status values.
 * QUARANTINE indicates a stalled milestone (14+ days inactive).
 */
export type MilestoneStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "QUARANTINE";

/**
 * Milestone interface for application logic.
 * Represents a major deliverable within a phase.
 * 
 * Note: For database operations, use MilestoneRow or MilestoneInsert/MilestoneUpdate types.
 */
export interface Milestone {
  id: string;
  phase_id: string;
  title: string;
  status: MilestoneStatus;
  created_at: string;
}

/**
 * Phase status values.
 * QUARANTINE indicates a stalled phase (14+ days inactive).
 */
export type PhaseStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "QUARANTINE";

/**
 * Phase interface for application logic.
 * Represents a high-level chapter in large goals (LARGE complexity only).
 * 
 * Note: For database operations, use PhaseRow or PhaseInsert/PhaseUpdate types.
 */
export interface Phase {
  id: string;
  goal_id: string;
  title: string;
  status: PhaseStatus;
  index: number;
  created_at: string;
}

/**
 * Architecture structure stored as JSONB in the goals.architecture column.
 * 
 * This nested structure represents the full decomposition hierarchy:
 * - Phases (only for LARGE goals)
 *   - Milestones
 *     - Job Clusters
 *       - Jobs
 * 
 * Note: This is a denormalized view. The normalized structure is stored
 * in separate tables (phases, milestones, job_clusters, jobs).
 * 
 * @property current_phase_index - Index of the currently active phase
 * @property phases - Array of phases with nested milestones, clusters, and jobs
 */
export interface Architecture {
  current_phase_index: number;
  phases: Array<{
    id: string;
    title: string;
    status: PhaseStatus;
    milestones: Array<{
      id: string;
      title: string;
      status: MilestoneStatus;
      job_clusters: Array<{
        title: string;
        jobs: Array<{
          id: string;
          title: string;
          type: JobType;
          est_minutes: number;
          status: JobStatus;
        }>;
      }>;
    }>;
  }>;
}

/**
 * Trial task interface for application logic.
 * Represents a single task in the 3-7 day micro-plan.
 * 
 * Note: For database operations, use TrialTaskRow or TrialTaskInsert/TrialTaskUpdate types.
 */
export interface TrialTask {
  id: string;
  goal_id: string;
  day_number: number;
  task_title: string;
  est_minutes: number;
  status: TrialTaskStatus;
  scheduled_date: string;
  completed_at: string | null;
  notes: string | null;
  acceptance_criteria: string | null;
  created_at: string;
}

/**
 * Goal status lifecycle values.
 * - PENDING_SCOPE: Goal created, awaiting scope definition
 * - SCOPING: Currently defining scope (Triangle of Scope)
 * - PLANNING: Scope complete, generating architecture
 * - ACTIVE: Architecture complete, in execution phase
 * - COMPLETED: Goal finished
 * - QUARANTINE: Stalled goal (14+ days inactive)
 */
export type GoalStatus =
  | "PENDING_SCOPE"
  | "SCOPING"
  | "PLANNING"
  | "ACTIVE"
  | "COMPLETED"
  | "QUARANTINE";

/**
 * Goal interface for application logic.
 * Represents a user's goal with full decomposition structure.
 * 
 * Note: For database operations, use GoalRow or GoalInsert/GoalUpdate types.
 */
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  complexity: Complexity;
  scope: Scope;
  architecture: Architecture;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Database Row Types (for Supabase queries)
// ============================================================================
// These types represent the exact structure returned from Supabase queries.
// Use these when working directly with database results.

/**
 * Database row type for goals table.
 * Matches the exact structure of the goals table in Supabase.
 */
export interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  complexity: Complexity;
  scope: Scope;
  architecture: Architecture;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for phases table.
 * Matches the exact structure of the phases table in Supabase.
 */
export interface PhaseRow {
  id: string;
  goal_id: string;
  title: string;
  status: PhaseStatus;
  index: number;
  created_at: string;
}

/**
 * Database row type for milestones table.
 * Matches the exact structure of the milestones table in Supabase.
 */
export interface MilestoneRow {
  id: string;
  phase_id: string;
  title: string;
  status: MilestoneStatus;
  created_at: string;
}

/**
 * Database row type for job_clusters table.
 * Matches the exact structure of the job_clusters table in Supabase.
 */
export interface JobClusterRow {
  id: string;
  milestone_id: string;
  title: string;
  created_at: string;
}

/**
 * Database row type for jobs table.
 * Matches the exact structure of the jobs table in Supabase.
 */
export interface JobRow {
  id: string;
  job_cluster_id: string;
  title: string;
  type: JobType;
  est_minutes: number;
  status: JobStatus;
  failure_count: number;
  deadline: string | null;
  created_at: string;
}

/**
 * Database row type for trial_tasks table.
 * Matches the exact structure of the trial_tasks table in Supabase.
 */
export interface TrialTaskRow {
  id: string;
  goal_id: string;
  day_number: number;
  task_title: string;
  est_minutes: number;
  status: TrialTaskStatus;
  scheduled_date: string;
  completed_at: string | null;
  notes: string | null;
  acceptance_criteria: string | null;
  created_at: string;
}

// ============================================================================
// Database Operation Helper Types
// ============================================================================
// These utility types help with INSERT and UPDATE operations by omitting
// auto-generated fields or making fields optional as appropriate.

/**
 * Type helper to omit auto-generated fields for INSERT operations.
 * Removes id, created_at, and updated_at fields.
 */
type OmitAutoGenerated<T> = Omit<T, "id" | "created_at" | "updated_at">;

/**
 * Type helper to make all fields optional except identifiers for UPDATE operations.
 */
type MakeUpdateFieldsOptional<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

/**
 * Insert type for goals table.
 * Omits: id, created_at, updated_at (auto-generated)
 * 
 * @example
 * const newGoal: GoalInsert = {
 *   user_id: "user-uuid",
 *   title: "Build SaaS Platform",
 *   complexity: { size: "LARGE", estimated_total_hours: 150, projected_end_date: "2024-12-01" },
 *   scope: { hard_constraint_hours_per_week: 10, tech_stack: ["Next.js"] },
 *   architecture: { current_phase_index: 0, phases: [] },
 *   status: "PENDING_SCOPE"
 * };
 */
export type GoalInsert = OmitAutoGenerated<GoalRow>;

/**
 * Update type for goals table.
 * All fields optional except id (required for WHERE clause).
 * 
 * @example
 * const update: GoalUpdate = {
 *   id: "goal-uuid",
 *   status: "ACTIVE"
 * };
 */
export type GoalUpdate = MakeUpdateFieldsOptional<GoalRow, "id">;

/**
 * Insert type for phases table.
 * Omits: id, created_at (auto-generated)
 */
export type PhaseInsert = OmitAutoGenerated<PhaseRow>;

/**
 * Update type for phases table.
 * All fields optional except id (required for WHERE clause).
 */
export type PhaseUpdate = MakeUpdateFieldsOptional<PhaseRow, "id">;

/**
 * Insert type for milestones table.
 * Omits: id, created_at (auto-generated)
 */
export type MilestoneInsert = OmitAutoGenerated<MilestoneRow>;

/**
 * Update type for milestones table.
 * All fields optional except id (required for WHERE clause).
 */
export type MilestoneUpdate = MakeUpdateFieldsOptional<MilestoneRow, "id">;

/**
 * Insert type for job_clusters table.
 * Omits: id, created_at (auto-generated)
 */
export type JobClusterInsert = OmitAutoGenerated<JobClusterRow>;

/**
 * Update type for job_clusters table.
 * All fields optional except id (required for WHERE clause).
 */
export type JobClusterUpdate = MakeUpdateFieldsOptional<JobClusterRow, "id">;

/**
 * Insert type for jobs table.
 * Omits: id, created_at (auto-generated)
 * 
 * @example
 * const newJob: JobInsert = {
 *   job_cluster_id: "cluster-uuid",
 *   title: "Init Supabase Project",
 *   type: "QUICK_WIN",
 *   est_minutes: 15,
 *   status: "PENDING",
 *   failure_count: 0,
 *   deadline: null
 * };
 */
export type JobInsert = OmitAutoGenerated<JobRow>;

/**
 * Update type for jobs table.
 * All fields optional except id (required for WHERE clause).
 * 
 * @example
 * const update: JobUpdate = {
 *   id: "job-uuid",
 *   status: "COMPLETED"
 * };
 */
export type JobUpdate = MakeUpdateFieldsOptional<JobRow, "id">;

/**
 * Insert type for trial_tasks table.
 * Omits: id, created_at (auto-generated)
 * 
 * @example
 * const newTrialTask: TrialTaskInsert = {
 *   goal_id: "goal-uuid",
 *   day_number: 1,
 *   task_title: "Research API documentation",
 *   est_minutes: 15,
 *   status: "PENDING",
 *   scheduled_date: "2024-01-15",
 *   completed_at: null,
 *   notes: null
 * };
 */
export type TrialTaskInsert = OmitAutoGenerated<TrialTaskRow>;

/**
 * Update type for trial_tasks table.
 * All fields optional except id (required for WHERE clause).
 * 
 * @example
 * const update: TrialTaskUpdate = {
 *   id: "task-uuid",
 *   status: "COMPLETED",
 *   completed_at: "2024-01-15T10:30:00Z"
 * };
 */
export type TrialTaskUpdate = MakeUpdateFieldsOptional<TrialTaskRow, "id">;
