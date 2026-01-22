"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { markTaskDone, giveUpGoal } from "@/lib/actions/trial";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GoalRow, TrialTaskRow } from "@/types/volition";

interface TrialDashboardProps {
  goal: GoalRow;
  tasks: TrialTaskRow[];
  onTasksUpdate: (tasks: TrialTaskRow[]) => void;
}

export function TrialDashboard({
  goal,
  tasks,
  onTasksUpdate,
}: TrialDashboardProps) {
  const router = useRouter();
  const [markingDone, setMarkingDone] = useState(false);
  const [givingUp, setGivingUp] = useState(false);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine active task: first task with status PENDING or ACTIVE, ordered by day_number
  const activeTask = tasks.find(
    (task) => task.status === "PENDING" || task.status === "ACTIVE"
  );

  // Future tasks: all tasks with day_number > activeTask.day_number
  const futureTasks = activeTask
    ? tasks.filter((task) => task.day_number > activeTask.day_number)
    : [];

  // Completed tasks: all tasks with status COMPLETED
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED");

  // Check if all tasks are completed
  const allTasksCompleted = tasks.length > 0 && tasks.every((task) => task.status === "COMPLETED");

  // Auto-redirect to scope form when all tasks are completed (Feature 3.1)
  useEffect(() => {
    if (allTasksCompleted) {
      // The graduation handler has already updated the goal status to PENDING_SCOPE
      router.push(`/architect/scope?goalId=${encodeURIComponent(goal.id)}`);
    }
  }, [allTasksCompleted, goal.id, router]);

  const handleMarkDone = async () => {
    if (!activeTask) return;

    setMarkingDone(true);
    setError(null);

    try {
      const updatedTasks = await markTaskDone(activeTask.id, goal.id);
      onTasksUpdate(updatedTasks);

      // If this was the last task, all tasks are now completed
      // Feature 2.8 (Graduation Handler) will be triggered elsewhere
      // For now, we just show a message
      if (updatedTasks.every((task) => task.status === "COMPLETED")) {
        // All tasks completed - graduation will be handled by feature 2.8
        // For now, we can show a success message or redirect
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to mark task as done. Please try again."
      );
    } finally {
      setMarkingDone(false);
    }
  };

  const handleGiveUp = async () => {
    setGivingUp(true);
    setError(null);

    try {
      await giveUpGoal(goal.id);
      // Redirect to dashboard after successful archive
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to archive goal. Please try again."
      );
      setGivingUp(false);
      setShowGiveUpConfirm(false);
    }
  };

  // Edge case: No tasks found
  if (tasks.length === 0) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Trial Dashboard</CardTitle>
            <CardDescription>No trial tasks found for this goal</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              It looks like no trial tasks have been generated for this goal yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edge case: All tasks completed
  if (allTasksCompleted) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Congratulations!</CardTitle>
            <CardDescription>You've completed all trial tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              <p className="font-semibold">All trial tasks completed!</p>
              <p className="text-sm mt-1">
                Redirecting to scope definition...
              </p>
            </div>
            <div className="flex items-center justify-center">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edge case: No active task found (shouldn't happen, but handle gracefully)
  if (!activeTask) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Trial Dashboard</CardTitle>
            <CardDescription>Unable to determine active task</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              There seems to be an issue with the trial tasks. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Goal Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{goal.title}</CardTitle>
            <CardDescription>Trial Period - Day {activeTask.day_number}</CardDescription>
          </CardHeader>
        </Card>

        {/* Active Task */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Day {activeTask.day_number} - Active Task</CardTitle>
                <CardDescription>
                  Estimated time: {activeTask.est_minutes} minutes
                </CardDescription>
              </div>
              <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                ACTIVE
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{activeTask.task_title}</h3>
              {activeTask.acceptance_criteria && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-1">Acceptance Criteria:</p>
                  <p className="text-sm text-muted-foreground">
                    {activeTask.acceptance_criteria}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleMarkDone}
                disabled={markingDone}
                className="flex-1 min-h-[44px]"
              >
                {markingDone ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Marking as done...
                  </span>
                ) : (
                  "Mark Done"
                )}
              </Button>
              <Button
                onClick={() => setShowGiveUpConfirm(true)}
                variant="destructive"
                disabled={markingDone || givingUp}
                className="flex-1 min-h-[44px]"
              >
                Give Up
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Give Up Confirmation Dialog */}
        {showGiveUpConfirm && (
          <Card className="border-2 border-destructive">
            <CardHeader>
              <CardTitle>Confirm Give Up</CardTitle>
              <CardDescription>
                Are you sure you want to give up on this goal?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This will archive the goal and you won't be able to continue the trial period.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleGiveUp}
                  variant="destructive"
                  disabled={givingUp}
                  className="flex-1 min-h-[44px]"
                >
                  {givingUp ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Archiving...
                    </span>
                  ) : (
                    "Yes, Give Up"
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowGiveUpConfirm(false);
                    setError(null);
                  }}
                  variant="outline"
                  disabled={givingUp}
                  className="flex-1 min-h-[44px]"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Future Tasks (Blurred/Hidden) */}
        {futureTasks.length > 0 && (
          <Card className="relative">
            <div className="filter blur-sm opacity-30 pointer-events-none">
              <CardHeader>
                <CardTitle>Future Tasks</CardTitle>
                <CardDescription>
                  {futureTasks.length} task{futureTasks.length > 1 ? "s" : ""} remaining
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {futureTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 border rounded-md"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          Day {task.day_number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {task.est_minutes} min
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.task_title}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 border">
                <p className="text-sm font-medium text-center">
                  Complete the current task to unlock
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Completed Tasks (Optional - show progress) */}
        {completedTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completed Tasks</CardTitle>
              <CardDescription>
                {completedTasks.length} of {tasks.length} tasks completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-2 border rounded-md bg-muted/50"
                  >
                    <span className="text-green-600 dark:text-green-400">✓</span>
                    <span className="text-sm flex-1">
                      Day {task.day_number}: {task.task_title}
                    </span>
                    {task.completed_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
