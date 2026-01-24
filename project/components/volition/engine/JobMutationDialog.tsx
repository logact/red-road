"use client";

/**
 * Job Mutation Dialog Component
 * 
 * Feature 5.4: Displays negotiation result and allows job regeneration.
 * Supports regeneration loop (Reject → Regenerate → Confirm).
 */

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mutateJob, previewJobMutation } from "@/lib/actions/job-mutator";
import type { JobRow } from "@/types/volition";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface JobMutationDialogProps {
  jobId: string;
  jobTitle: string;
  userReason: string;
  negotiationAdvice: string;
  onClose?: () => void;
  onConfirm?: (updatedJob: JobRow) => void;
}

interface MutatedJobPreview {
  title: string;
  type: "QUICK_WIN" | "DEEP_WORK" | "ANCHOR";
  est_minutes: number;
}

export function JobMutationDialog({
  jobId,
  jobTitle,
  userReason,
  negotiationAdvice,
  onClose,
  onConfirm,
}: JobMutationDialogProps) {
  const [mutatedJob, setMutatedJob] = useState<MutatedJobPreview | null>(null);
  const [regenerating, startRegenerating] = useTransition();
  const [confirming, startConfirming] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Generate initial mutation on mount
  const generateMutation = async () => {
    setError(null);
    startRegenerating(async () => {
      try {
        const result = await previewJobMutation(jobId, userReason);
        if (!result.success) {
          throw new Error(result.error || "Failed to generate new job");
        }
        if (!result.preview) {
          throw new Error("No preview returned from mutation");
        }
        // Store preview (we'll confirm later)
        setMutatedJob(result.preview);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate new job. Please try again."
        );
      }
    });
  };

  // Confirm and save the mutation
  const handleConfirm = () => {
    if (!mutatedJob) {
      setError("No job to confirm. Please regenerate first.");
      return;
    }

    startConfirming(async () => {
      try {
        const result = await mutateJob(jobId, userReason);
        if (!result.success) {
          throw new Error(result.error || "Failed to update job");
        }
        if (!result.job) {
          throw new Error("No job returned from mutation");
        }
        onConfirm?.(result.job);
        onClose?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to confirm job mutation. Please try again."
        );
      }
    });
  };

  const handleCancel = () => {
    if (!regenerating && !confirming) {
      onClose?.();
    }
  };

  // Auto-generate on mount
  useEffect(() => {
    generateMutation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case "QUICK_WIN":
        return "Quick Win";
      case "DEEP_WORK":
        return "Deep Work";
      case "ANCHOR":
        return "Anchor";
      default:
        return type;
    }
  };

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case "QUICK_WIN":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "DEEP_WORK":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "ANCHOR":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-3xl p-6 m-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Change Job Content</h2>

        {/* Original Job Info */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Original Job:</p>
          <p className="text-lg font-semibold">{jobTitle}</p>
        </div>

        {/* Negotiation Advice */}
        <div className="mb-6">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold mb-2 text-sm uppercase tracking-wide text-blue-800 dark:text-blue-400">
                  AI Recommendation
                </div>
                <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-300">
                  {negotiationAdvice}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Regenerated Job Preview */}
        {mutatedJob && (
          <div className="mb-6">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold mb-2 text-sm uppercase tracking-wide text-green-800 dark:text-green-400">
                    New Job Preview
                  </div>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-green-900 dark:text-green-300">
                      {mutatedJob.title}
                    </p>
                    <div className="flex gap-3 items-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getJobTypeColor(
                          mutatedJob.type
                        )}`}
                      >
                        {getJobTypeLabel(mutatedJob.type)}
                      </span>
                      <span className="text-sm text-green-700 dark:text-green-400">
                        {mutatedJob.est_minutes} minutes
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {regenerating && !mutatedJob && (
          <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-900/20 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-gray-600 dark:text-gray-400" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Generating improved job version...
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={regenerating || confirming}
          >
            Cancel
          </Button>
          {mutatedJob && (
            <Button
              onClick={generateMutation}
              variant="outline"
              disabled={regenerating || confirming}
            >
              {regenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              )}
            </Button>
          )}
          {mutatedJob && (
            <Button
              onClick={handleConfirm}
              disabled={regenerating || confirming}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Change
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
