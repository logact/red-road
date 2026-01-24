"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getActiveGoalAndMilestone, getAllGoals } from "@/lib/actions/goals";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, Target, CheckCircle2 } from "lucide-react";
import type { GoalRow } from "@/types/volition";
import { cn } from "@/lib/utils";

/**
 * Compact Goal Selector Dropdown for Top Bar
 * 
 * Displays the current goal and allows switching between goals via dropdown.
 */
export function GoalSelectorDropdown() {
  const [currentGoal, setCurrentGoal] = useState<GoalRow | null>(null);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get goalId from URL params
  const goalIdFromUrl = searchParams.get("goalId");

  // Load current goal and all goals
  useEffect(() => {
    async function loadGoals() {
      try {
        setLoading(true);
        
        // Load all goals for the dropdown
        const allGoals = await getAllGoals();
        setGoals(allGoals);

        // Load current goal (from URL param or active goal)
        if (goalIdFromUrl) {
          const goal = allGoals.find((g) => g.id === goalIdFromUrl);
          if (goal) {
            setCurrentGoal(goal);
          } else {
            // If goalId in URL doesn't exist, load active goal
            const activeData = await getActiveGoalAndMilestone();
            setCurrentGoal(activeData?.goal || null);
          }
        } else {
          // No goalId in URL, load active goal
          const activeData = await getActiveGoalAndMilestone();
          setCurrentGoal(activeData?.goal || null);
        }
      } catch (err) {
        console.error("Failed to load goals:", err);
      } finally {
        setLoading(false);
      }
    }

    loadGoals();
  }, [goalIdFromUrl]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleGoalSelect = (goalId: string) => {
    setIsOpen(false);
    // Update URL with goalId parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set("goalId", goalId);
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
    // Update current goal immediately for better UX
    const selectedGoal = goals.find((g) => g.id === goalId);
    if (selectedGoal) {
      setCurrentGoal(selectedGoal);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-600 dark:text-green-400";
      case "COMPLETED":
        return "text-blue-600 dark:text-blue-400";
      case "QUARANTINE":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-yellow-600 dark:text-yellow-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />;
      default:
        return <Target className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No goals</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-9 px-3 border border-border/50 hover:border-border"
      >
        {currentGoal ? (
          <>
            {getStatusIcon(currentGoal.status)}
            <span className="max-w-[200px] truncate text-sm font-medium">
              {currentGoal.title}
            </span>
          </>
        ) : (
          <>
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Select Goal</span>
          </>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform text-muted-foreground",
            isOpen && "rotate-180"
          )}
        />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          <div className="p-2 space-y-1">
            {goals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleGoalSelect(goal.id)}
                className={cn(
                  "w-full text-left p-3 rounded-md transition-colors",
                  "hover:bg-accent",
                  currentGoal?.id === goal.id
                    ? "bg-accent border border-primary"
                    : ""
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(goal.status)}
                  <span className="font-medium text-sm truncate flex-1">
                    {goal.title}
                  </span>
                  {currentGoal?.id === goal.id && (
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("capitalize", getStatusColor(goal.status))}>
                    {goal.status.replace("_", " ").toLowerCase()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
