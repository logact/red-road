"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExecutionTimer } from "./ExecutionTimer";
import { pauseJob, resumeJob, markJobDone } from "@/lib/actions/jobs";
import { MilestoneVerificationDialog } from "./MilestoneVerificationDialog";
import { FailureInterceptorDialog } from "./FailureInterceptorDialog";
import { getPendingVerificationMilestones } from "@/lib/actions/milestone-verification";
import { createClient } from "@/lib/supabase/client";
import type { JobRow } from "@/types/volition";
import { isSessionActive } from "@/lib/utils/work-sessions";
import { ArrowLeft, CheckCircle2, XCircle, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkDashboardContentProps {
  job: JobRow;
  goalId?: string; // Optional: if provided, avoids re-querying the ownership chain
}

/**
 * Work Dashboard Content Component
 * 
 * Displays a focused view of the current job with:
 * - Execution timer (current session + total time)
 * - Pause/Resume buttons
 * - Mark Done/Failed buttons
 * - Auto-pause on page unload
 */
export function WorkDashboardContent({ job: initialJob, goalId: providedGoalId }: WorkDashboardContentProps) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [verificationMilestoneId, setVerificationMilestoneId] = useState<string | null>(null);
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [goalId, setGoalId] = useState<string | null>(providedGoalId || null);

  const hasActiveSession = isSessionActive(job.work_sessions || []);

  // Check for pending verification milestones on mount
  useEffect(() => {
    async function checkPendingVerification() {
      // #region agent log
      const effectStartTime = performance.now();
      fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorkDashboardContent.tsx:40',message:'checkPendingVerification effect start',data:{jobId:job.id,hasProvidedGoalId:!!providedGoalId,effectStartTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      try {
        let goalIdToUse = providedGoalId;

        // Only query if goalId wasn't provided (optimization: avoid re-querying)
        if (!goalIdToUse) {
          // Get goal ID from job through job_cluster -> milestone -> phase -> goal
          const supabase = createClient();
          // #region agent log
          const clientQuery1Start = performance.now();
          // #endregion
          const { data: clusterData } = await supabase
            .from("job_clusters")
            .select("milestone_id")
            .eq("id", job.job_cluster_id)
            .single();
          // #region agent log
          const clientQuery1End = performance.now();
          fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorkDashboardContent.tsx:52',message:'Client Query 1: job_clusters (fallback)',data:{jobId:job.id,duration:clientQuery1End-clientQuery1Start},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion

          if (!clusterData) return;

          // #region agent log
          const clientQuery2Start = performance.now();
          // #endregion
          const { data: milestoneData } = await supabase
            .from("milestones")
            .select("phase_id")
            .eq("id", clusterData.milestone_id)
            .single();
          // #region agent log
          const clientQuery2End = performance.now();
          fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorkDashboardContent.tsx:67',message:'Client Query 2: milestones (fallback)',data:{jobId:job.id,duration:clientQuery2End-clientQuery2Start},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion

          if (!milestoneData) return;

          // #region agent log
          const clientQuery3Start = performance.now();
          // #endregion
          const { data: phaseData } = await supabase
            .from("phases")
            .select("goal_id")
            .eq("id", milestoneData.phase_id)
            .single();
          // #region agent log
          const clientQuery3End = performance.now();
          fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorkDashboardContent.tsx:79',message:'Client Query 3: phases (fallback)',data:{jobId:job.id,duration:clientQuery3End-clientQuery3Start},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion

          if (!phaseData) return;
          goalIdToUse = phaseData.goal_id;
          setGoalId(phaseData.goal_id);
        }

        // Check for pending verification milestones
        // #region agent log
        const getPendingStart = performance.now();
        // #endregion
        const pendingMilestones = await getPendingVerificationMilestones(goalIdToUse!);
        // #region agent log
        const getPendingEnd = performance.now();
        const effectEndTime = performance.now();
        const totalEffectTime = effectEndTime - effectStartTime;
        fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorkDashboardContent.tsx:95',message:'getPendingVerificationMilestones + total effect time',data:{jobId:job.id,getPendingDuration:getPendingEnd-getPendingStart,totalEffectTime,usedProvidedGoalId:!!providedGoalId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        if (pendingMilestones.length > 0) {
          setVerificationMilestoneId(pendingMilestones[0]);
        }
      } catch (err) {
        // Silently fail - don't block the UI
        console.error("Failed to check pending verification milestones:", err);
      }
    }

    checkPendingVerification();
  }, [job.id, job.job_cluster_id, providedGoalId]);

  // Auto-pause on page unload if session is active
  useEffect(() => {
    if (!hasActiveSession) {
      return;
    }

    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      // Try to pause the job before leaving
      // Note: This is best-effort as we can't await async operations in beforeunload
      pauseJob(job.id).catch(() => {
        // Silently fail - the session will be paused on next page load if needed
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Also pause when component unmounts (navigation away)
      if (hasActiveSession) {
        pauseJob(job.id).catch(() => {
          // Silently fail
        });
      }
    };
  }, [job.id, hasActiveSession]);

  const handlePause = async () => {
    setError(null);
    startTransition(async () => {
      try {
        const updatedJob = await pauseJob(job.id);
        setJob(updatedJob);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to pause job. Please try again."
        );
      }
    });
  };

  const handleResume = async () => {
    setError(null);
    startTransition(async () => {
      try {
        const updatedJob = await resumeJob(job.id);
        setJob(updatedJob);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to resume job. Please try again."
        );
      }
    });
  };

  const handleMarkDone = async () => {
    setError(null);
    startTransition(async () => {
      try {
        await markJobDone(job.id);
        
        // Get goal ID and check for pending verification milestones
        try {
          const supabase = createClient();
          const { data: clusterData } = await supabase
            .from("job_clusters")
            .select("milestone_id")
            .eq("id", job.job_cluster_id)
            .single();

          if (clusterData) {
            const { data: milestoneData } = await supabase
              .from("milestones")
              .select("phase_id")
              .eq("id", clusterData.milestone_id)
              .single();

            if (milestoneData) {
              const { data: phaseData } = await supabase
                .from("phases")
                .select("goal_id")
                .eq("id", milestoneData.phase_id)
                .single();

              if (phaseData) {
                const pendingMilestones = await getPendingVerificationMilestones(phaseData.goal_id);
                if (pendingMilestones.length > 0) {
                  setVerificationMilestoneId(pendingMilestones[0]);
                  return; // Don't navigate away if showing verification dialog
                }
              }
            }
          }
        } catch (err) {
          console.error("Failed to check pending verification milestones:", err);
        }

        // Only navigate away if not showing verification dialog
        router.push("/dashboard");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to mark job as done. Please try again."
        );
      }
    });
  };

  const handleMarkFailed = () => {
    // Open dialog immediately without marking job as failed
    // The dialog will mark the job as failed when user chooses an action
    setShowFailureDialog(true);
  };

  const handleFailureDialogClose = () => {
    setShowFailureDialog(false);
  };

  const handleFailureDialogComplete = () => {
    setShowFailureDialog(false);
    // Navigate back to dashboard after action completes
    router.push("/dashboard");
  };

  const getJobTypeBadge = (type: string) => {
    const styles = {
      QUICK_WIN: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      DEEP_WORK: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      ANCHOR: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    };
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
          styles[type as keyof typeof styles] || "bg-gray-100 text-gray-700"
        )}
      >
        {type.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/dashboard")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      {/* Main Card */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {getJobTypeBadge(job.type)}
                {hasActiveSession && (
                  <span className="inline-flex items-center gap-1 text-sm text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Active Session
                  </span>
                )}
              </div>
              <CardTitle className="text-3xl">{job.title}</CardTitle>
              <CardDescription>
                Estimated: {job.est_minutes} minutes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Execution Timer */}
          <div className="py-4 border-t border-b">
            <ExecutionTimer workSessions={job.work_sessions || []} />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {hasActiveSession ? (
              <Button
                onClick={handlePause}
                disabled={isPending}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button
                onClick={handleResume}
                disabled={isPending}
                variant="default"
                size="lg"
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}

            <Button
              onClick={handleMarkDone}
              disabled={isPending}
              variant="default"
              size="lg"
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Done
            </Button>

            <Button
              onClick={handleMarkFailed}
              disabled={isPending}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Mark Failed
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {verificationMilestoneId && (
        <MilestoneVerificationDialog
          milestoneId={verificationMilestoneId}
          onVerified={() => {
            setVerificationMilestoneId(null);
            router.push("/dashboard");
          }}
          onCancel={() => {
            setVerificationMilestoneId(null);
            router.push("/dashboard");
          }}
        />
      )}

      {/* Failure Interceptor Dialog */}
      {showFailureDialog && (
        <FailureInterceptorDialog
          jobId={job.id}
          jobTitle={job.title}
          goalId={goalId || undefined}
          onClose={handleFailureDialogClose}
          onActionComplete={handleFailureDialogComplete}
        />
      )}
    </div>
  );
}
