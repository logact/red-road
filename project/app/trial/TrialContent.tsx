"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrialDashboard } from "@/components/volition/trial/TrialDashboard";
import { getGoal, getTrialTasks } from "@/lib/actions/trial";
import type { GoalRow, TrialTaskRow } from "@/types/volition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TrialContentProps {
  goalId: string;
}

export function TrialContent({ goalId }: TrialContentProps) {
  const [goal, setGoal] = useState<GoalRow | null>(null);
  const [tasks, setTasks] = useState<TrialTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [goalData, tasksData] = await Promise.all([
          getGoal(goalId),
          getTrialTasks(goalId),
        ]);

        setGoal(goalData);
        setTasks(tasksData);

        // If goal is already archived, redirect to dashboard
        if (goalData.status === "QUARANTINE") {
          router.push("/dashboard");
          return;
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load trial dashboard. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [goalId, router]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading trial dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load trial dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Goal Not Found</CardTitle>
            <CardDescription>The requested goal could not be found</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <TrialDashboard goal={goal} tasks={tasks} onTasksUpdate={setTasks} />;
}
