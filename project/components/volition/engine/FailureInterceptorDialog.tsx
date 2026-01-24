"use client";

/**
 * Failure Interceptor Dialog Component
 * 
 * Feature 5.1: Intercepts job failures and routes to appropriate recovery path.
 * Displays a modal with three action options when a user marks a job as failed.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { handleJobRetry } from "@/lib/actions/job-retry";
import { handleJobNegotiation } from "@/lib/actions/job-negotiator";
import { archiveGoal } from "@/lib/actions/goals";
import { markJobFailed } from "@/lib/actions/jobs";
import { JobMutationDialog } from "./JobMutationDialog";
import { Loader2, RotateCcw, Edit, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import type { JobRow } from "@/types/volition";

interface FailureInterceptorDialogProps {
  jobId: string;
  jobTitle?: string;
  goalId?: string;
  onClose?: () => void;
  onActionComplete?: () => void;
}

type ActionType = "retry" | "negotiate" | "giveup" | null;

interface NegotiationResult {
  advice: string;
  recommendation: "INSIST" | "CHANGE";
}

export function FailureInterceptorDialog({
  jobId,
  jobTitle,
  goalId,
  onClose,
  onActionComplete,
}: FailureInterceptorDialogProps) {
  const [reason, setReason] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [processing, startProcessing] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [negotiationResult, setNegotiationResult] = useState<NegotiationResult | null>(null);
  const [showMutationDialog, setShowMutationDialog] = useState(false);
  const router = useRouter();

  const handleAction = (action: ActionType) => {
    if (!reason.trim()) {
      setError("Please provide a reason for the failure");
      return;
    }

    setSelectedAction(action);
    setError(null);

    startProcessing(async () => {
      try {
        // Mark job as failed first (before executing the chosen action)
        await markJobFailed(jobId);

        if (action === "retry") {
          // Feature 5.2: Retry Handler
          const result = await handleJobRetry(jobId, reason);
          if (!result.success) {
            throw new Error(result.error || "Failed to retry job");
          }
          onActionComplete?.();
          onClose?.();
        } else if (action === "negotiate") {
          // Feature 5.3: The Negotiator
          const result = await handleJobNegotiation(jobId, reason);
          if (!result.success) {
            throw new Error(result.error || "Failed to start negotiation");
          }
          // Store negotiation result
          if (result.advice && result.recommendation) {
            setNegotiationResult({
              advice: result.advice,
              recommendation: result.recommendation,
            });
            setSelectedAction(null); // Reset selected action
            
            // If recommendation is CHANGE, open mutation dialog (Feature 5.4)
            if (result.recommendation === "CHANGE") {
              setShowMutationDialog(true);
            }
          } else {
            throw new Error("Invalid negotiation response");
          }
        } else if (action === "giveup") {
          // Feature 5.5: Goal Archivist
          if (!goalId) {
            throw new Error("Goal ID is required to give up goal");
          }
          const result = await archiveGoal(goalId);
          if (!result.success) {
            throw new Error(result.error || "Failed to archive goal");
          }
          // Redirect to incubator after giving up goal (Feature 5.5 requirement)
          router.push("/incubator");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to process action. Please try again."
        );
        setSelectedAction(null);
      }
    });
  };

  const handleCancel = () => {
    if (!processing) {
      setNegotiationResult(null);
      setShowMutationDialog(false);
      onClose?.();
    }
  };

  const handleMutationComplete = (updatedJob: JobRow) => {
    // Job has been successfully mutated
    setShowMutationDialog(false);
    setNegotiationResult(null);
    onActionComplete?.();
    onClose?.();
  };

  const handleMutationCancel = () => {
    setShowMutationDialog(false);
    // Keep negotiation result visible so user can see advice
  };

  const handleBackToActions = () => {
    setNegotiationResult(null);
    setShowMutationDialog(false);
    setSelectedAction(null);
  };

  // Show mutation dialog if recommendation is CHANGE
  if (showMutationDialog && negotiationResult && jobTitle) {
    return (
      <JobMutationDialog
        jobId={jobId}
        jobTitle={jobTitle}
        userReason={reason}
        negotiationAdvice={negotiationResult.advice}
        onClose={handleMutationCancel}
        onConfirm={handleMutationComplete}
      />
    );
  }

  // Show negotiation result UI if negotiation is complete and not showing mutation dialog
  if (negotiationResult && !showMutationDialog) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">Negotiation Advice</h2>

          {jobTitle && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Job:</p>
              <p className="text-lg font-semibold">{jobTitle}</p>
            </div>
          )}

          <div className="mb-6">
            <div className={`p-4 rounded-lg mb-4 ${
              negotiationResult.recommendation === "CHANGE"
                ? "bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                : "bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
            }`}>
              <div className="flex items-start gap-3">
                {negotiationResult.recommendation === "CHANGE" ? (
                  <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-semibold mb-2 text-sm uppercase tracking-wide">
                    {negotiationResult.recommendation === "CHANGE" ? "Recommendation: Change" : "Recommendation: Insist"}
                  </div>
                  <p className="text-sm leading-relaxed">
                    {negotiationResult.advice}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {negotiationResult.recommendation === "INSIST" && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-4">
                The analysis suggests keeping the current job structure. However, you can still choose to change the job if you believe it's necessary.
              </p>
              <Button
                onClick={() => setShowMutationDialog(true)}
                variant="outline"
                className="w-full"
                disabled={processing}
              >
                Change Anyway
              </Button>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              onClick={handleBackToActions}
              variant="outline"
              disabled={processing}
            >
              Back
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={processing}
            >
              Close
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Job Failed</h2>

        {jobTitle && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Job:</p>
            <p className="text-lg font-semibold">{jobTitle}</p>
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-4">
            Please provide a reason for marking this job as failed and choose how you'd like to proceed. The job will be marked as failed when you select an action.
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="failure-reason" className="block text-sm font-semibold mb-2">
            Reason for Failure <span className="text-red-500">*</span>
          </label>
          <Textarea
            id="failure-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            placeholder="Explain why this job failed (e.g., too complex, missing information, wrong approach)..."
            className="min-h-[100px]"
            disabled={processing}
          />
          {error && !selectedAction && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>

        <div className="mb-6 space-y-3">
          <h3 className="font-semibold mb-3">Choose an action:</h3>
          
          <Button
            onClick={() => handleAction("retry")}
            disabled={processing || !reason.trim()}
            variant="outline"
            className="w-full justify-start h-auto py-3"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            <div className="text-left flex-1">
              <div className="font-semibold">Try Next Time</div>
              <div className="text-xs text-muted-foreground">
                Upgrade difficulty and reschedule for later
              </div>
            </div>
            {processing && selectedAction === "retry" && (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            )}
          </Button>

          <Button
            onClick={() => handleAction("negotiate")}
            disabled={processing || !reason.trim()}
            variant="outline"
            className="w-full justify-start h-auto py-3"
          >
            <Edit className="h-4 w-4 mr-2" />
            <div className="text-left flex-1">
              <div className="font-semibold">Change Content</div>
              <div className="text-xs text-muted-foreground">
                Get AI suggestions to modify the job
              </div>
            </div>
            {processing && selectedAction === "negotiate" && (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            )}
          </Button>

          <Button
            onClick={() => handleAction("giveup")}
            disabled={processing || !reason.trim() || !goalId}
            variant="outline"
            className="w-full justify-start h-auto py-3 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <XCircle className="h-4 w-4 mr-2" />
            <div className="text-left flex-1">
              <div className="font-semibold">Give Up Goal</div>
              <div className="text-xs text-muted-foreground">
                Archive this goal and all associated tasks
              </div>
            </div>
            {processing && selectedAction === "giveup" && (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            )}
          </Button>
        </div>

        {error && selectedAction && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={processing}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
