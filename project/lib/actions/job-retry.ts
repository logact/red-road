"use server";

/**
 * Job Retry Handler (Feature 5.2)
 * 
 * Handles "Try Next Time" action from Failure Interceptor.
 * 
 * Features:
 * - Records failure note to history with timestamp
 * - Upgrades difficulty (QUICK_WIN -> ANCHOR, DEEP_WORK -> ANCHOR)
 * - Resets status to PENDING so user can restart the job when ready
 */

import { createClient } from "../supabase/server";
import { verifyJobAccess } from "./jobs";
import type { JobRow, JobType } from "@/types/volition";

export interface JobRetryResult {
  success: boolean;
  job?: JobRow;
  error?: string;
}

/**
 * Handles job retry by upgrading difficulty and resetting status
 * 
 * @param jobId - The job ID to retry
 * @param reason - The failure reason provided by the user
 * @returns Result with updated job or error
 */
export async function handleJobRetry(
  jobId: string,
  reason: string
): Promise<JobRetryResult> {
  const supabase = await createClient();

  try {
    // Verify access and get current job
    const currentJob = await verifyJobAccess(jobId);

    // Verify job is in FAILED status
    if (currentJob.status !== "FAILED") {
      return {
        success: false,
        error: `Cannot retry job: job is in ${currentJob.status} status. Expected FAILED.`,
      };
    }

    // Read current failure_history array (default to empty array if null/undefined)
    const currentHistory = currentJob.failure_history
      ? (Array.isArray(currentJob.failure_history) ? currentJob.failure_history : [])
      : [];

    // Append new failure note with timestamp
    const newFailureNote = {
      timestamp: new Date().toISOString(),
      reason: reason.trim(),
    };

    const updatedHistory = [...currentHistory, newFailureNote];

    // Upgrade difficulty: QUICK_WIN -> ANCHOR, DEEP_WORK -> ANCHOR, ANCHOR stays ANCHOR
    const upgradedType: JobType =
      currentJob.type === "QUICK_WIN" || currentJob.type === "DEEP_WORK"
        ? "ANCHOR"
        : currentJob.type;

    // Update job: record failure history, upgrade type, reset status to PENDING
    const { data: updatedJob, error: updateError } = await supabase
      .from("jobs")
      .update({
        failure_history: updatedHistory,
        type: upgradedType,
        status: "PENDING",
      })
      .eq("id", jobId)
      .select()
      .single();

    if (updateError || !updatedJob) {
      return {
        success: false,
        error: updateError?.message || "Failed to retry job",
      };
    }

    // Parse work_sessions
    const parsedSessions = updatedJob.work_sessions
      ? (Array.isArray(updatedJob.work_sessions) ? updatedJob.work_sessions : [])
      : [];

    // Parse failure_history
    const parsedHistory = updatedJob.failure_history
      ? (Array.isArray(updatedJob.failure_history) ? updatedJob.failure_history : [])
      : [];

    return {
      success: true,
      job: {
        ...updatedJob,
        work_sessions: parsedSessions,
        failure_history: parsedHistory,
      } as JobRow,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}
