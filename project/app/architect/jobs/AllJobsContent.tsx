"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getJobsForGoal } from "@/lib/actions/jobs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { JobClusterRow, JobRow, JobType } from "@/types/volition";
import { Home } from "lucide-react";

interface AllJobsContentProps {
  goalId: string;
  goalTitle: string;
}

interface ClusterWithJobs extends JobClusterRow {
  jobs: JobRow[];
  milestoneTitle: string;
}

export function AllJobsContent({ goalId, goalTitle }: AllJobsContentProps) {
  const router = useRouter();
  const [clusters, setClusters] = useState<ClusterWithJobs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Group clusters by milestone
  const clustersByMilestone = useMemo(() => {
    const grouped = new Map<string, ClusterWithJobs[]>();
    clusters.forEach((cluster) => {
      const existing = grouped.get(cluster.milestone_id) || [];
      grouped.set(cluster.milestone_id, [...existing, cluster]);
    });
    return grouped;
  }, [clusters]);

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        setError(null);
        const data = await getJobsForGoal(goalId);

        // Create a map of milestone IDs to titles
        const milestoneMap = new Map(
          data.milestones.map((m) => [m.id, m.title])
        );

        // Group jobs by cluster and add milestone title
        const clustersWithJobs: ClusterWithJobs[] = data.jobClusters.map(
          (cluster) => ({
            ...cluster,
            jobs: data.jobs.filter(
              (job) => job.job_cluster_id === cluster.id
            ),
            milestoneTitle: milestoneMap.get(cluster.milestone_id) || "Unknown",
          })
        );

        setClusters(clustersWithJobs);
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

    loadJobs();
  }, [goalId]);

  const getJobTypeColor = (type: JobType) => {
    switch (type) {
      case "QUICK_WIN":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700";
      case "DEEP_WORK":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700";
      case "ANCHOR":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-300 dark:border-purple-700";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 border-gray-300 dark:border-gray-700";
    }
  };

  const getJobTypeLabel = (type: JobType) => {
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

  if (loading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>All Jobs</CardTitle>
              <CardDescription>Loading jobs for goal...</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard?goalId=${encodeURIComponent(goalId)}`)}
              className="min-h-[44px] min-w-[44px]"
              title="Back to Dashboard"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Jobs: {goalTitle}</CardTitle>
            <CardDescription>
              Showing all jobs across all milestones for this goal
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/architect/blueprint?goalId=${encodeURIComponent(goalId)}`)}
              variant="outline"
              size="sm"
              className="min-h-[44px]"
            >
              ← Blueprint
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard?goalId=${encodeURIComponent(goalId)}`)}
              className="min-h-[44px] min-w-[44px]"
              title="Back to Dashboard"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400 mb-4">
            {error}
          </div>
        )}

        {clusters.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No jobs have been generated for this goal yet.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(clustersByMilestone.entries()).map(
              ([milestoneId, milestoneClusters]) => (
                <div key={milestoneId} className="space-y-4">
                  <div className="border-b pb-2">
                    <h2 className="text-xl font-semibold">
                      {milestoneClusters[0]?.milestoneTitle || "Unknown Milestone"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {milestoneClusters.reduce(
                        (sum, cluster) => sum + cluster.jobs.length,
                        0
                      )}{" "}
                      job
                      {milestoneClusters.reduce((sum, cluster) => sum + cluster.jobs.length, 0) !== 1
                        ? "s"
                        : ""}
                    </p>
                  </div>
                  {milestoneClusters.map((cluster, clusterIndex) => (
                    <div
                      key={cluster.id}
                      className="rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                          Cluster {clusterIndex + 1}: {cluster.title}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {cluster.jobs.length} job
                          {cluster.jobs.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {cluster.jobs.map((job, jobIndex) => (
                          <div
                            key={job.id}
                            className="flex items-center justify-between p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  J{jobIndex + 1}
                                </span>
                                <span className="font-medium">{job.title}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium border ${getJobTypeColor(
                                    job.type
                                  )}`}
                                >
                                  {getJobTypeLabel(job.type)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {job.est_minutes} min
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Status: {job.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
