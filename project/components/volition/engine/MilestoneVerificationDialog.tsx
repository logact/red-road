"use client";

/**
 * Milestone Verification Dialog Component
 * 
 * Displays milestone acceptance criteria for user confirmation when all jobs are completed
 */

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getMilestoneVerificationData,
  confirmMilestoneVerification,
} from "@/lib/actions/milestone-verification";
import type { MilestoneRow } from "@/types/volition";

interface MilestoneVerificationDialogProps {
  milestoneId: string;
  onVerified?: () => void;
  onCancel?: () => void;
}

export function MilestoneVerificationDialog({
  milestoneId,
  onVerified,
  onCancel,
}: MilestoneVerificationDialogProps) {
  const [loading, setLoading] = useState(true);
  const [verifying, startVerifying] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<MilestoneRow | null>(null);
  const [criteria, setCriteria] = useState<string>("");

  // Load milestone verification data
  useEffect(() => {
    getMilestoneVerificationData(milestoneId)
      .then((data) => {
        setMilestone(data.milestone);
        setCriteria(data.criteria);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load milestone data");
        setLoading(false);
      });
  }, [milestoneId]);

  const handleConfirm = () => {
    startVerifying(async () => {
      try {
        await confirmMilestoneVerification(milestoneId);
        onVerified?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to verify milestone"
        );
      }
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-2xl p-6 m-4">
          <div className="text-center">Loading milestone criteria...</div>
        </Card>
      </div>
    );
  }

  if (error && !milestone) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-2xl p-6 m-4">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Close
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Milestone Verification</h2>

        {milestone && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{milestone.title}</h3>
            <p className="text-sm text-gray-600 mb-4">
              All jobs for this milestone have been completed. Please review the
              acceptance criteria below and confirm that the milestone is complete.
            </p>
          </div>
        )}

        <div className="mb-6">
          <h4 className="font-semibold mb-3">Acceptance Criteria:</h4>
          {criteria ? (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="whitespace-pre-wrap text-sm">{criteria}</p>
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                No acceptance criteria defined for this milestone.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={verifying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={verifying}
            className="min-w-[120px]"
          >
            {verifying ? "Verifying..." : "Confirm Complete"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
