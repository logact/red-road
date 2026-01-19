/**
 * Core TypeScript interfaces for Volition OS
 * These types match the Supabase database schema exactly.
 */

// Complexity assessment types
export type ComplexitySize = "SMALL" | "MEDIUM" | "LARGE";

export interface Complexity {
  size: ComplexitySize;
  estimated_total_hours: number;
  projected_end_date: string;
}

// Scope definition types
export interface Scope {
  hard_constraint_hours_per_week: number;
  tech_stack: string[];
  definition_of_done?: string;
}

// Job types
export type JobType = "QUICK_WIN" | "DEEP_WORK" | "ANCHOR";
export type JobStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "FAILED";

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

// Job Cluster types
export interface JobCluster {
  id: string;
  milestone_id: string;
  title: string;
  created_at: string;
}

// Milestone types
export type MilestoneStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "QUARANTINE";

export interface Milestone {
  id: string;
  phase_id: string;
  title: string;
  status: MilestoneStatus;
  created_at: string;
}

// Phase types
export type PhaseStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "QUARANTINE";

export interface Phase {
  id: string;
  goal_id: string;
  title: string;
  status: PhaseStatus;
  index: number;
  created_at: string;
}

// Architecture structure (nested JSONB in goals table)
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

// Goal types
export type GoalStatus =
  | "PENDING_SCOPE"
  | "SCOPING"
  | "PLANNING"
  | "ACTIVE"
  | "COMPLETED"
  | "QUARANTINE";

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

// Database row types (for Supabase queries)
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

export interface PhaseRow {
  id: string;
  goal_id: string;
  title: string;
  status: PhaseStatus;
  index: number;
  created_at: string;
}

export interface MilestoneRow {
  id: string;
  phase_id: string;
  title: string;
  status: MilestoneStatus;
  created_at: string;
}

export interface JobClusterRow {
  id: string;
  milestone_id: string;
  title: string;
  created_at: string;
}

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
