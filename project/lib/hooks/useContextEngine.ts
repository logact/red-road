"use client";

import { useMemo } from "react";
import { useUserState } from "@/lib/contexts/UserStateContext";
import type { JobRow, JobType, JobStatus, JobClusterRow } from "@/types/volition";

/**
 * Result interface for the useContextEngine hook
 */
export interface UseContextEngineResult {
  filteredJobs: JobRow[];
  isEmpty: boolean;
  emptyStateMessage: string | null;
}

/**
 * Job type priority order for HIGH energy state
 * Higher priority = lower number (sorted first)
 */
const JOB_TYPE_PRIORITY_HIGH: Record<JobType, number> = {
  DEEP_WORK: 1,
  ANCHOR: 2,
  QUICK_WIN: 3,
};

/**
 * Job status priority order
 * ACTIVE jobs should be shown first, then PENDING
 */
const JOB_STATUS_PRIORITY: Record<JobStatus, number> = {
  ACTIVE: 1,
  PENDING: 2,
  COMPLETED: 3,
  FAILED: 4,
};

/**
 * Context Engine Hook
 * 
 * Filters and prioritizes jobs based on the user's current energy state.
 * Reactively updates when userState changes without requiring page reload.
 * 
 * Filtering Logic:
 * - ACTIVE jobs are ALWAYS shown regardless of energy state (user is currently working on them)
 * - Energy-based filtering applies only to PENDING jobs:
 *   - HIGH: Show all job types (QUICK_WIN, DEEP_WORK, ANCHOR), prioritize DEEP_WORK
 *   - MED: Show ANCHOR and QUICK_WIN only (exclude DEEP_WORK)
 *   - LOW: Show QUICK_WIN only
 * 
 * Ordering Logic:
 * 1. Status: ACTIVE first, then PENDING
 * 2. Cluster order: By cluster created_at (if clusters provided)
 * 3. Job order: By job created_at within cluster
 * 
 * @param jobs - Array of jobs to filter (typically from active milestone/cluster)
 * @param clusters - Optional array of job clusters for ordering by cluster created_at
 * @returns Filtered and prioritized jobs with empty state information
 */
export function useContextEngine(
  jobs: JobRow[],
  clusters?: JobClusterRow[]
): UseContextEngineResult {
  const { userState } = useUserState();

  const result = useMemo(() => {
    // Create cluster order map if clusters provided
    const clusterOrderMap = new Map<string, number>();
    if (clusters) {
      // Sort clusters by created_at and assign order index
      const sortedClusters = [...clusters].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      sortedClusters.forEach((cluster, index) => {
        clusterOrderMap.set(cluster.id, index);
      });
    }

    // ALWAYS include ACTIVE jobs regardless of energy state (user is currently working on them)
    const activeJobs = jobs.filter((job) => job.status === "ACTIVE");
    
    // Filter PENDING jobs based on user energy state
    const pendingJobs = jobs.filter((job) => job.status === "PENDING");
    let filteredPending: JobRow[];

    switch (userState) {
      case "HIGH":
        // HIGH: Show all types, prioritize DEEP_WORK
        filteredPending = [...pendingJobs];
        break;

      case "MED":
        // MED: Show ANCHOR and QUICK_WIN only (exclude DEEP_WORK)
        filteredPending = pendingJobs.filter(
          (job) => job.type === "ANCHOR" || job.type === "QUICK_WIN"
        );
        break;

      case "LOW":
        // LOW: Show QUICK_WIN only
        filteredPending = pendingJobs.filter((job) => job.type === "QUICK_WIN");
        break;

      default:
        // Fallback: show all PENDING jobs
        filteredPending = [...pendingJobs];
    }

    // Sort function: status → cluster order → job created_at
    const sortJobs = (a: JobRow, b: JobRow) => {
      // 1. Sort by status (ACTIVE first)
      const statusDiff = JOB_STATUS_PRIORITY[a.status] - JOB_STATUS_PRIORITY[b.status];
      if (statusDiff !== 0) return statusDiff;

      // 2. Sort by cluster order (if clusters provided)
      if (clusters && clusterOrderMap.size > 0) {
        const clusterOrderA = clusterOrderMap.get(a.job_cluster_id) ?? Infinity;
        const clusterOrderB = clusterOrderMap.get(b.job_cluster_id) ?? Infinity;
        const clusterDiff = clusterOrderA - clusterOrderB;
        if (clusterDiff !== 0) return clusterDiff;
      }

      // 3. Sort by job created_at within cluster
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeA - timeB;
    };

    // Combine ACTIVE and PENDING jobs, then sort
    const filtered = [...activeJobs, ...filteredPending];
    filtered.sort(sortJobs);

    // Check for empty state: LOW energy + no QUICK_WIN jobs (check both ACTIVE and PENDING)
    const isEmpty = userState === "LOW" && filtered.length === 0;
    const emptyStateMessage = isEmpty
      ? "No quick wins available. Consider breaking down a task."
      : null;

    return {
      filteredJobs: filtered,
      isEmpty,
      emptyStateMessage,
    };
  }, [jobs, userState, clusters]);

  return result;
}
