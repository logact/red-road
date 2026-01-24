"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getActiveGoalAndMilestone, getGoalAndMilestone } from "@/lib/actions/goals";
import { getJobsForMilestone, startJob, markJobDone } from "@/lib/actions/jobs";
import { getPendingVerificationMilestones } from "@/lib/actions/milestone-verification";
import { useContextEngine } from "@/lib/hooks/useContextEngine";
import { useUserState } from "@/lib/contexts/UserStateContext";
import { JobCard } from "./JobCard";
import { GoalSelector } from "./GoalSelector";
import { MilestoneVerificationDialog } from "./MilestoneVerificationDialog";
import { FailureInterceptorDialog } from "./FailureInterceptorDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { JobRow, JobClusterRow } from "@/types/volition";
import { Loader2, Target, List } from "lucide-react";

/**
 * Compass View Component
 * 
 * The default dashboard view that displays the top 1-3 recommended job cards
 * based on the user's current energy state. The first job is shown as a
 * "Hero Card" with emphasis, and includes smooth animations when state changes.
 */
export function CompassView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobClusters, setJobClusters] = useState<JobClusterRow[]>([]);
  const [goalTitle, setGoalTitle] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState<string | null>(null);
  const [hasActiveGoal, setHasActiveGoal] = useState(true);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showGoalSelector, setShowGoalSelector] = useState(false);
  const [verificationMilestoneId, setVerificationMilestoneId] = useState<string | null>(null);
  const [failureDialogJob, setFailureDialogJob] = useState<{ id: string; title: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get userState to track changes for animations
  const { userState } = useUserState();

  // Use Context Engine to filter jobs based on user energy state
  const { filteredJobs, isEmpty, emptyStateMessage } = useContextEngine(jobs, jobClusters);

  // Get top 1-3 jobs for display
  const displayJobs = useMemo(() => {
    return filteredJobs.slice(0, 3);
  }, [filteredJobs]);

  // Track animation key to force re-render with animations
  const [animationKey, setAnimationKey] = useState(0);

  // Detect when userState or filtered jobs change to trigger animations
  useEffect(() => {
    const jobIds = filteredJobs.slice(0, 3).map((j) => j.id).join(",");
    setAnimationKey((prev) => prev + 1);
  }, [userState, filteredJobs]);

  const loadGoalData = async (goalIdToLoad?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      setVerificationMilestoneId(null);

      let activeData;
      if (goalIdToLoad) {
        // Load specific goal
        activeData = await getGoalAndMilestone(goalIdToLoad);
      } else {
        // Load active goal
        activeData = await getActiveGoalAndMilestone();
      }

      if (!activeData) {
        setHasActiveGoal(false);
        setLoading(false);
        return;
      }

      setGoalTitle(activeData.goal.title);
      setGoalId(activeData.goal.id);
      setHasActiveGoal(true);

      // Check for milestones pending verification FIRST
      // If found, show ONLY verification dialog (no jobs)
      try {
        const pendingMilestones = await getPendingVerificationMilestones(activeData.goal.id);
        if (pendingMilestones.length > 0) {
          // Show verification dialog for the first pending milestone
          // Don't load jobs - verification dialog will be shown instead
          setVerificationMilestoneId(pendingMilestones[0]);
          setMilestoneTitle(null);
          setActiveMilestoneId(null);
          setJobs([]);
          setJobClusters([]);
          setLoading(false);
          return;
        }
      } catch (err) {
        // Silently fail - don't block the UI if check fails
        console.error("Failed to check pending verification milestones:", err);
      }

      // No pending verification milestone - proceed with normal flow
      setMilestoneTitle(activeData.milestone.title);
      setActiveMilestoneId(activeData.milestoneId);

      // Fetch jobs for the milestone
      const jobsData = await getJobsForMilestone(activeData.milestoneId);
      setJobs(jobsData.jobs);
      setJobClusters(jobsData.jobClusters);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load jobs. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Read goalId from URL params if present
    const goalIdFromUrl = searchParams.get("goalId");
    loadGoalData(goalIdFromUrl || undefined);
  }, [searchParams]);

  const handleGoalSelect = (selectedGoalId: string) => {
    setShowGoalSelector(false);
    // Update URL to keep top bar selector in sync
    const params = new URLSearchParams(searchParams.toString());
    params.set("goalId", selectedGoalId);
    router.push(`/dashboard?${params.toString()}`);
    // loadGoalData will be called when searchParams changes
  };

  // Reload jobs when needed
  const reloadJobs = async () => {
    if (!activeMilestoneId) return;
    try {
      const jobsData = await getJobsForMilestone(activeMilestoneId);
      setJobs(jobsData.jobs);
      setJobClusters(jobsData.jobClusters);
    } catch (err) {
      console.error("Failed to reload jobs:", err);
    }
  };

  // Handle job actions with optimistic UI updates
  const handleStartJob = async (jobId: string) => {
    // #region agent log
    const startTime = performance.now();
    fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompassView.tsx:154',message:'handleStartJob entry',data:{jobId,startTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Optimistic update
    setJobs((prevJobs) =>
      prevJobs.map((job) =>
        job.id === jobId ? { ...job, status: "ACTIVE" as const } : job
      )
    );

    startTransition(async () => {
      try {
        // #region agent log
        const startJobStartTime = performance.now();
        fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompassView.tsx:163',message:'startJob call begin',data:{jobId,startJobStartTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        await startJob(jobId);
        // #region agent log
        const startJobEndTime = performance.now();
        const startJobDuration = startJobEndTime - startJobStartTime;
        fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompassView.tsx:164',message:'startJob call complete',data:{jobId,startJobDuration,startJobEndTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // #region agent log
        const navigationStartTime = performance.now();
        fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompassView.tsx:166',message:'Navigation begin',data:{jobId,navigationStartTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        // Navigate to work dashboard
        router.push(`/dashboard/work/${jobId}`);
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompassView.tsx:168',message:'handleStartJob error',data:{jobId,error:err instanceof Error ? err.message : String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // Revert on error
        await reloadJobs();
        setError(
          err instanceof Error ? err.message : "Failed to start job. Please try again."
        );
      }
    });
  };

  // Handle clicking on active job cards
  const handleJobClick = (jobId: string) => {
    router.push(`/dashboard/work/${jobId}`);
  };

  const handleMarkDone = async (jobId: string) => {
    // Optimistic update: remove the job immediately (it vanishes)
    setJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId));

    startTransition(async () => {
      try {
        await markJobDone(jobId);
        // Reload to ensure consistency (job should be filtered out by status)
        await reloadJobs();
        
        // Check for milestones pending verification after job completion
        if (goalId) {
          try {
            const pendingMilestones = await getPendingVerificationMilestones(goalId);
            if (pendingMilestones.length > 0) {
              setVerificationMilestoneId(pendingMilestones[0]);
            }
          } catch (err) {
            console.error("Failed to check pending verification milestones:", err);
          }
        }
      } catch (err) {
        // Revert on error
        await reloadJobs();
        setError(
          err instanceof Error ? err.message : "Failed to mark job as done. Please try again."
        );
      }
    });
  };

  const handleMarkFailed = (jobId: string) => {
    // Find the job to get its title
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      return;
    }

    // Open dialog immediately without marking job as failed
    // The dialog will mark the job as failed when user chooses an action
    setFailureDialogJob({ id: jobId, title: job.title });
  };

  const handleFailureDialogClose = () => {
    setFailureDialogJob(null);
  };

  const handleFailureDialogComplete = async () => {
    setFailureDialogJob(null);
    // Reload jobs to reflect any changes from the dialog actions
    await reloadJobs();
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading your compass...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // No active goal state
  if (!hasActiveGoal) {
    return (
      <div className="container mx-auto p-4">
        {showGoalSelector ? (
          <GoalSelector
            selectedGoalId={goalId}
            onGoalSelect={handleGoalSelect}
            onClose={() => setShowGoalSelector(false)}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Active Goal</CardTitle>
              <CardDescription>
                You don't have any active goals yet. Create a goal to get started!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Start by creating a goal through the Gatekeeper, or select an existing goal below.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowGoalSelector(true)}
                  className="w-full"
                >
                  View All Goals
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // If there's a pending verification milestone, show ONLY the dialog (no jobs)
  if (verificationMilestoneId) {
    return (
      <div className="container mx-auto p-4">
        {/* Goal Context */}
        {goalTitle && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold">{goalTitle}</h2>
          </div>
        )}
        <MilestoneVerificationDialog
          milestoneId={verificationMilestoneId}
          onVerified={() => {
            setVerificationMilestoneId(null);
            // Reload goal data to reflect new milestone state
            const goalIdToLoad = goalId || searchParams.get("goalId");
            loadGoalData(goalIdToLoad || undefined);
          }}
          onCancel={() => {
            setVerificationMilestoneId(null);
            // Reload to show jobs for active milestone
            const goalIdToLoad = goalId || searchParams.get("goalId");
            loadGoalData(goalIdToLoad || undefined);
          }}
        />
      </div>
    );
  }

  // Empty state (no jobs available for current energy level)
  if (isEmpty && emptyStateMessage) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              No Jobs Available
            </CardTitle>
            <CardDescription>{emptyStateMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Consider breaking down a task or adjusting your energy level.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if there's an active milestone but no jobs generated yet
  const hasActiveMilestoneWithoutJobs = 
    activeMilestoneId !== null && 
    jobs.length === 0 && 
    jobClusters.length === 0;

  // No jobs at all
  if (displayJobs.length === 0) {
    // Show advice if there's an active milestone without jobs
    if (hasActiveMilestoneWithoutJobs && goalId && activeMilestoneId) {
      return (
        <div className="container mx-auto p-4">
          {/* Goal and Milestone Context */}
          {(goalTitle || milestoneTitle) && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold">{goalTitle}</h2>
              </div>
              {milestoneTitle && (
                <p className="text-muted-foreground">Active Milestone: {milestoneTitle}</p>
              )}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Generate Jobs for Your Milestone
              </CardTitle>
              <CardDescription>
                {milestoneTitle
                  ? `You have an active milestone "${milestoneTitle}" but no jobs have been generated yet.`
                  : "You have an active milestone but no jobs have been generated yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Jobs break down your milestone into actionable tasks. Generate jobs to start working on your milestone.
              </p>
              <Button
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("goalId", goalId);
                  params.set("milestoneId", activeMilestoneId);
                  router.push(`/architect/jobs?${params.toString()}`);
                }}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Generate Jobs
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Default "No Jobs Yet" message
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>No Jobs Yet</CardTitle>
            <CardDescription>
              {goalTitle && milestoneTitle
                ? `No jobs have been generated for "${milestoneTitle}" yet.`
                : "No jobs available."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Jobs will appear here once they are generated for your active milestone.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main view with job cards
  return (
    <div className="container mx-auto p-4">
      {/* Goal Selector */}
      {showGoalSelector && (
        <div className="mb-6">
          <GoalSelector
            selectedGoalId={goalId}
            onGoalSelect={handleGoalSelect}
            onClose={() => setShowGoalSelector(false)}
          />
        </div>
      )}

      {/* Goal and Milestone Context */}
      {(goalTitle || milestoneTitle) && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold">{goalTitle}</h2>
          </div>
          {milestoneTitle && (
            <p className="text-muted-foreground">Active Milestone: {milestoneTitle}</p>
          )}
        </div>
      )}

      {/* Hero Card (First Job) */}
      <div className="mb-6">
        <div
          key={`hero-${displayJobs[0].id}-${animationKey}`}
          className="compass-card-enter"
        >
          <JobCard
            job={displayJobs[0]}
            variant="hero"
            onStart={handleStartJob}
            onMarkDone={handleMarkDone}
            onMarkFailed={handleMarkFailed}
            onClick={handleJobClick}
          />
        </div>
      </div>

      {/* Secondary Cards (Up to 2 more jobs) */}
      {displayJobs.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayJobs.slice(1).map((job, index) => (
            <div
              key={`secondary-${job.id}-${animationKey}`}
              className="compass-card-enter"
              style={{
                animationDelay: `${(index + 1) * 100}ms`,
              }}
            >
              <JobCard
                job={job}
                variant="default"
                onStart={handleStartJob}
                onMarkDone={handleMarkDone}
                onMarkFailed={handleMarkFailed}
                onClick={handleJobClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* Failure Interceptor Dialog */}
      {failureDialogJob && (
        <FailureInterceptorDialog
          jobId={failureDialogJob.id}
          jobTitle={failureDialogJob.title}
          goalId={goalId || undefined}
          onClose={handleFailureDialogClose}
          onActionComplete={handleFailureDialogComplete}
        />
      )}
    </div>
  );
}
