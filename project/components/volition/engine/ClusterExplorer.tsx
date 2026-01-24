"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getActiveGoalAndMilestone } from "@/lib/actions/goals";
import { getJobsForMilestone, startJob, markJobDone } from "@/lib/actions/jobs";
import { getPendingVerificationMilestones } from "@/lib/actions/milestone-verification";
import { JobCard } from "./JobCard";
import { MilestoneVerificationDialog } from "./MilestoneVerificationDialog";
import { FailureInterceptorDialog } from "./FailureInterceptorDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { JobRow, JobStatus } from "@/types/volition";
import { Loader2, List, X } from "lucide-react";

interface ClusterExplorerProps {
  onJobSelect?: (job: JobRow) => void;
}

/**
 * Cluster Explorer Component
 * 
 * A collapsible drawer that displays the full active cluster grouped by status,
 * ignoring the Energy Filter. Allows users to select any job regardless of
 * their current energy state.
 * 
 * Features:
 * - Shows all jobs in the active milestone/cluster
 * - Groups jobs by status (PENDING, ACTIVE, COMPLETED, FAILED)
 * - Visually distinct from the focused Compass view
 * - Override capability: allows selecting Deep Work tasks even in Low energy state
 */
export function ClusterExplorer({ onJobSelect }: ClusterExplorerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [goalTitle, setGoalTitle] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState<string | null>(null);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [verificationMilestoneId, setVerificationMilestoneId] = useState<string | null>(null);
  const [failureDialogJob, setFailureDialogJob] = useState<{ id: string; title: string } | null>(null);

  // Group jobs by status
  const jobsByStatus = useMemo(() => {
    const grouped: Record<JobStatus, JobRow[]> = {
      PENDING: [],
      ACTIVE: [],
      COMPLETED: [],
      FAILED: [],
    };

    jobs.forEach((job) => {
      grouped[job.status].push(job);
    });

    // Sort each group by created_at (oldest first)
    Object.keys(grouped).forEach((status) => {
      grouped[status as JobStatus].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    return grouped;
  }, [jobs]);


  // Load data when drawer opens
  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch active goal and milestone
        const activeData = await getActiveGoalAndMilestone();

        if (!activeData) {
          setError("No active goal or milestone found");
          setLoading(false);
          return;
        }

        setGoalTitle(activeData.goal.title);
        setGoalId(activeData.goal.id);
        setMilestoneTitle(activeData.milestone.title);
        setActiveMilestoneId(activeData.milestoneId);

        // Fetch all jobs for the active milestone (no filtering)
        const jobsData = await getJobsForMilestone(activeData.milestoneId);
        setJobs(jobsData.jobs);

        // Check for milestones pending verification
        try {
          const pendingMilestones = await getPendingVerificationMilestones(activeData.goal.id);
          if (pendingMilestones.length > 0) {
            // Show verification dialog for the first pending milestone
            setVerificationMilestoneId(pendingMilestones[0]);
          }
        } catch (err) {
          // Silently fail - don't block the UI if check fails
          console.error("Failed to check pending verification milestones:", err);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load jobs. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen]);

  // Reload jobs when needed
  const reloadJobs = async () => {
    if (!activeMilestoneId) return;
    try {
      const jobsData = await getJobsForMilestone(activeMilestoneId);
      setJobs(jobsData.jobs);
    } catch (err) {
      console.error("Failed to reload jobs:", err);
    }
  };

  // Handle job actions with optimistic UI updates
  const handleStartJob = async (jobId: string) => {
    // Optimistic update
    setJobs((prevJobs) =>
      prevJobs.map((job) =>
        job.id === jobId ? { ...job, status: "ACTIVE" as const } : job
      )
    );

    startTransition(async () => {
      try {
        await startJob(jobId);
        // Reload to ensure consistency
        await reloadJobs();
      } catch (err) {
        // Revert on error
        await reloadJobs();
        setError(
          err instanceof Error ? err.message : "Failed to start job. Please try again."
        );
      }
    });
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

  const totalJobs = jobs.length;
  const statusCounts = {
    PENDING: jobsByStatus.PENDING.length,
    ACTIVE: jobsByStatus.ACTIVE.length,
    COMPLETED: jobsByStatus.COMPLETED.length,
    FAILED: jobsByStatus.FAILED.length,
  };

  const getStatusLabel = (status: JobStatus) => {
    switch (status) {
      case "PENDING":
        return "Pending";
      case "ACTIVE":
        return "Active";
      case "COMPLETED":
        return "Completed";
      case "FAILED":
        return "Failed";
      default:
        return status;
    }
  };

  // Load goalId on mount for navigation
  useEffect(() => {
    async function loadGoalId() {
      try {
        const activeData = await getActiveGoalAndMilestone();
        if (activeData) {
          setGoalId(activeData.goal.id);
        }
      } catch (err) {
        console.error("Failed to load goal ID:", err);
      }
    }
    loadGoalId();
  }, []);

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case "PENDING":
        return "text-gray-600 dark:text-gray-400";
      case "ACTIVE":
        return "text-blue-600 dark:text-blue-400";
      case "COMPLETED":
        return "text-green-600 dark:text-green-400";
      case "FAILED":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const handleShowAllJobs = () => {
    if (goalId) {
      router.push(`/architect/jobs?goalId=${encodeURIComponent(goalId)}`);
    } else {
      // Fallback: open drawer if goalId is not available
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full sm:w-[600px] lg:w-[700px] bg-background border-l shadow-2xl z-40 transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between bg-muted/30">
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Cluster Explorer</h2>
            <p className="text-sm text-muted-foreground">
              All jobs in active cluster (ignoring energy filter)
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="ml-4"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading && (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading all jobs...</p>
              </div>
            </div>
          )}

          {error && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
            </Card>
          )}

          {!loading && !error && (
            <>
              {/* Summary */}
              {(goalTitle || milestoneTitle) && (
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-lg">{goalTitle}</CardTitle>
                    {milestoneTitle && (
                      <CardDescription>Active Milestone: {milestoneTitle}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total Jobs:</span> {totalJobs}
                      </div>
                      {statusCounts.PENDING > 0 && (
                        <div>
                          <span className="font-medium">Pending:</span> {statusCounts.PENDING}
                        </div>
                      )}
                      {statusCounts.ACTIVE > 0 && (
                        <div>
                          <span className="font-medium">Active:</span> {statusCounts.ACTIVE}
                        </div>
                      )}
                      {statusCounts.COMPLETED > 0 && (
                        <div>
                          <span className="font-medium">Completed:</span> {statusCounts.COMPLETED}
                        </div>
                      )}
                      {statusCounts.FAILED > 0 && (
                        <div>
                          <span className="font-medium">Failed:</span> {statusCounts.FAILED}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Jobs Grouped by Status */}
              {totalJobs === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No Jobs Available</CardTitle>
                    <CardDescription>
                      No jobs have been generated for this milestone yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* PENDING Jobs */}
                  {jobsByStatus.PENDING.length > 0 && (
                    <div>
                      <h3
                        className={cn(
                          "text-lg font-semibold mb-3 flex items-center gap-2",
                          getStatusColor("PENDING")
                        )}
                      >
                        {getStatusLabel("PENDING")} ({jobsByStatus.PENDING.length})
                      </h3>
                      <div className="space-y-3">
                        {jobsByStatus.PENDING.map((job) => (
                          <div
                            key={job.id}
                            onClick={() => onJobSelect?.(job)}
                            className={cn(
                              "cursor-pointer transition-all hover:scale-[1.02]",
                              onJobSelect && "hover:ring-2 hover:ring-primary rounded-lg"
                            )}
                          >
                            <JobCard
                              job={job}
                              variant="default"
                              onStart={handleStartJob}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ACTIVE Jobs */}
                  {jobsByStatus.ACTIVE.length > 0 && (
                    <div>
                      <h3
                        className={cn(
                          "text-lg font-semibold mb-3 flex items-center gap-2",
                          getStatusColor("ACTIVE")
                        )}
                      >
                        {getStatusLabel("ACTIVE")} ({jobsByStatus.ACTIVE.length})
                      </h3>
                      <div className="space-y-3">
                        {jobsByStatus.ACTIVE.map((job) => (
                          <div
                            key={job.id}
                            onClick={() => {
                              // Navigate to work dashboard for active jobs
                              router.push(`/dashboard/work/${job.id}`);
                              onJobSelect?.(job);
                            }}
                            className={cn(
                              "cursor-pointer transition-all hover:scale-[1.02]",
                              "hover:ring-2 hover:ring-primary rounded-lg"
                            )}
                          >
                            <JobCard
                              job={job}
                              variant="default"
                              onMarkDone={handleMarkDone}
                              onMarkFailed={handleMarkFailed}
                              onClick={(jobId) => router.push(`/dashboard/work/${jobId}`)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* COMPLETED Jobs */}
                  {jobsByStatus.COMPLETED.length > 0 && (
                    <div>
                      <h3
                        className={cn(
                          "text-lg font-semibold mb-3 flex items-center gap-2",
                          getStatusColor("COMPLETED")
                        )}
                      >
                        {getStatusLabel("COMPLETED")} ({jobsByStatus.COMPLETED.length})
                      </h3>
                      <div className="space-y-3">
                        {jobsByStatus.COMPLETED.map((job) => (
                          <div key={job.id}>
                            <JobCard job={job} variant="default" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FAILED Jobs */}
                  {jobsByStatus.FAILED.length > 0 && (
                    <div>
                      <h3
                        className={cn(
                          "text-lg font-semibold mb-3 flex items-center gap-2",
                          getStatusColor("FAILED")
                        )}
                      >
                        {getStatusLabel("FAILED")} ({jobsByStatus.FAILED.length})
                      </h3>
                      <div className="space-y-3">
                        {jobsByStatus.FAILED.map((job) => (
                          <div
                            key={job.id}
                            onClick={() => onJobSelect?.(job)}
                            className={cn(
                              "cursor-pointer transition-all hover:scale-[1.02]",
                              onJobSelect && "hover:ring-2 hover:ring-primary rounded-lg"
                            )}
                          >
                            <JobCard job={job} variant="default" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {verificationMilestoneId && (
        <MilestoneVerificationDialog
          milestoneId={verificationMilestoneId}
          onVerified={() => {
            setVerificationMilestoneId(null);
            reloadJobs();
          }}
          onCancel={() => {
            setVerificationMilestoneId(null);
          }}
        />
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
    </>
  );
}
