"use client";

import { useState, useEffect } from "react";
import { getAllGoals } from "@/lib/actions/goals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Circle, Target } from "lucide-react";
import type { GoalRow } from "@/types/volition";
import { cn } from "@/lib/utils";

interface GoalSelectorProps {
  selectedGoalId: string | null;
  onGoalSelect: (goalId: string) => void;
  onClose?: () => void;
}

/**
 * Goal Selector Component
 * 
 * Displays all user goals and allows selection of a goal to view.
 */
export function GoalSelector({ selectedGoalId, onGoalSelect, onClose }: GoalSelectorProps) {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGoals() {
      try {
        setLoading(true);
        setError(null);
        const allGoals = await getAllGoals();
        setGoals(allGoals);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load goals. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadGoals();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-600 dark:text-green-400";
      case "COMPLETED":
        return "text-blue-600 dark:text-blue-400";
      case "QUARANTINE":
        return "text-red-600 dark:text-red-400";
      case "PLANNING":
      case "SCOPING":
      case "PENDING_SCOPE":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "COMPLETED":
        return <Circle className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select a Goal</CardTitle>
          <CardDescription>Loading your goals...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Goals Found</CardTitle>
          <CardDescription>
            You don't have any goals yet. Create a goal to get started!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Start by creating a goal through the Gatekeeper.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Select a Goal</CardTitle>
            <CardDescription>
              Choose a goal to view its jobs and progress
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {goals.map((goal) => (
            <button
              key={goal.id}
              onClick={() => onGoalSelect(goal.id)}
              className={cn(
                "w-full text-left p-4 rounded-lg border transition-all",
                "hover:bg-accent hover:border-accent-foreground/20",
                selectedGoalId === goal.id
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-border"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(goal.status)}
                    <h3 className="font-semibold truncate">{goal.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className={cn("capitalize", getStatusColor(goal.status))}>
                      {goal.status.replace("_", " ").toLowerCase()}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(goal.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {selectedGoalId === goal.id && (
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
