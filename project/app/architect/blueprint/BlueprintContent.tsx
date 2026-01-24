"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBlueprint, setActiveMilestone } from "@/lib/actions/blueprint";
import { generateBlueprint } from "@/lib/actions/blueprint-generator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PhaseRow, MilestoneRow, PhaseStatus, MilestoneStatus } from "@/types/volition";
import { Home } from "lucide-react";

interface BlueprintContentProps {
  goalId: string;
  goalTitle: string;
}

interface PhaseWithMilestones extends PhaseRow {
  milestones: MilestoneRow[];
}

export function BlueprintContent({ goalId, goalTitle }: BlueprintContentProps) {
  const router = useRouter();
  const [phases, setPhases] = useState<PhaseWithMilestones[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activatingMilestone, setActivatingMilestone] = useState<string | null>(null);

  useEffect(() => {
    async function loadBlueprint() {
      try {
        setLoading(true);
        setError(null);
        const data = await getBlueprint(goalId);
        
        // Group milestones by phase
        const phasesWithMilestones: PhaseWithMilestones[] = data.phases.map((phase) => ({
          ...phase,
          milestones: data.milestones.filter((m) => m.phase_id === phase.id),
        }));

        setPhases(phasesWithMilestones);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load blueprint. Please try again."
        );
      } finally {
        setLoading(false);
      }
  }

    loadBlueprint();
  }, [goalId]);

  const handleGenerateBlueprint = async () => {
    try {
      setGenerating(true);
      setError(null);
      await generateBlueprint(goalId);
      
      // Reload blueprint after generation
      const data = await getBlueprint(goalId);
      const phasesWithMilestones: PhaseWithMilestones[] = data.phases.map((phase) => ({
        ...phase,
        milestones: data.milestones.filter((m) => m.phase_id === phase.id),
      }));
      setPhases(phasesWithMilestones);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate blueprint. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleMilestoneClick = async (milestoneId: string) => {
    try {
      setActivatingMilestone(milestoneId);
      await setActiveMilestone(milestoneId, goalId);
      
      // Reload blueprint to get updated statuses
      const data = await getBlueprint(goalId);
      const phasesWithMilestones: PhaseWithMilestones[] = data.phases.map((phase) => ({
        ...phase,
        milestones: data.milestones.filter((m) => m.phase_id === phase.id),
      }));
      setPhases(phasesWithMilestones);
      
      // Navigate to job view (Feature 3.5) - placeholder for now
      router.push(`/architect/jobs?goalId=${encodeURIComponent(goalId)}&milestoneId=${encodeURIComponent(milestoneId)}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to activate milestone. Please try again."
      );
    } finally {
      setActivatingMilestone(null);
    }
  };

  const getPhaseStatusColor = (status: PhaseStatus) => {
    switch (status) {
      case "ACTIVE":
        return "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
      case "COMPLETED":
        return "border-green-500 bg-green-50 dark:bg-green-900/20";
      case "QUARANTINE":
        return "border-red-500 bg-red-50 dark:bg-red-900/20";
      case "PENDING":
      default:
        return "border-gray-300 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const getMilestoneStatusColor = (status: MilestoneStatus) => {
    switch (status) {
      case "ACTIVE":
        return "border-blue-500 bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/40";
      case "COMPLETED":
        return "border-green-500 bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200";
      case "QUARANTINE":
        return "border-red-500 bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200";
      case "PENDING":
      default:
        return "border-gray-300 bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";
    }
  };

  const isPhaseLocked = (phase: PhaseWithMilestones, phaseIndex: number) => {
    // First phase is never locked
    if (phaseIndex === 0) {
      return false;
    }
    
    // Phase is locked if previous phase is not completed
    const previousPhase = phases[phaseIndex - 1];
    return previousPhase.status !== "COMPLETED";
  };

  const isMilestoneLocked = (
    milestone: MilestoneRow,
    phase: PhaseWithMilestones,
    milestoneIndex: number
  ) => {
    // First milestone in a phase is never locked (if phase is not locked)
    if (milestoneIndex === 0) {
      return false;
    }
    
    // Milestone is locked if previous milestone is not completed
    const previousMilestone = phase.milestones[milestoneIndex - 1];
    return previousMilestone.status !== "COMPLETED";
  };

  if (loading || generating) {
    return (
      <Card className="w-full max-w-6xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>The Map</CardTitle>
              <CardDescription>
                {generating ? "Generating blueprint for" : "Loading blueprint for"}: {goalTitle}
              </CardDescription>
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
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent mb-4" />
            <p className="text-sm text-muted-foreground">
              {generating
                ? "Generating phases and milestones structure..."
                : "Loading blueprint structure..."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-6xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>The Map</CardTitle>
              <CardDescription>
                Error loading blueprint for: {goalTitle}
              </CardDescription>
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
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
          <Button
            onClick={() => router.push(`/architect/complexity?goalId=${encodeURIComponent(goalId)}`)}
            className="mt-4"
            variant="outline"
          >
            Back to Complexity
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phases.length === 0) {
    return (
      <Card className="w-full max-w-6xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>The Map</CardTitle>
              <CardDescription>
                Blueprint for: {goalTitle}
              </CardDescription>
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
          <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 mb-4">
            <p className="font-medium mb-1">No Blueprint Generated</p>
            <p>
              The blueprint (phases and milestones) has not been generated yet. Click the button below to generate it.
            </p>
          </div>
          <Button
            onClick={handleGenerateBlueprint}
            disabled={generating}
            className="w-full"
          >
            {generating ? "Generating..." : "Generate Blueprint"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>The Map</CardTitle>
            <CardDescription>
              Blueprint visualization for: {goalTitle}
            </CardDescription>
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
      <CardContent className="space-y-6">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-100 dark:bg-blue-900/30" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-gray-300 bg-white dark:bg-gray-800" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-100 dark:bg-green-900/30" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-gray-300 bg-gray-100 dark:bg-gray-700 opacity-50" />
            <span>Locked</span>
          </div>
        </div>

        {/* Phases and Milestones Tree */}
        <div className="space-y-6">
          {phases.map((phase, phaseIndex) => {
            const isLocked = isPhaseLocked(phase, phaseIndex);
            
            return (
              <div
                key={phase.id}
                className={`rounded-lg border-2 p-4 transition-all ${
                  isLocked
                    ? "opacity-50 cursor-not-allowed"
                    : getPhaseStatusColor(phase.status)
                }`}
              >
                {/* Phase Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Phase {phase.index + 1}
                    </span>
                    <h3 className="text-lg font-semibold">{phase.title}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        phase.status === "ACTIVE"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                          : phase.status === "COMPLETED"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {phase.status}
                    </span>
                  </div>
                </div>

                {/* Milestones */}
                {phase.milestones.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic pl-4">
                    No milestones yet
                  </div>
                ) : (
                  <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    {phase.milestones.map((milestone, milestoneIndex) => {
                      const milestoneLocked = isMilestoneLocked(
                        milestone,
                        phase,
                        milestoneIndex
                      );
                      const isActivating = activatingMilestone === milestone.id;
                      // ACTIVE milestones should always be clickable (to view jobs), regardless of locking
                      // Locking only prevents activating new milestones, not clicking already-active ones
                      const isClickable =
                        milestone.status === "ACTIVE" ||
                        (!isLocked && !milestoneLocked && milestone.status !== "COMPLETED");

                      return (
                        <button
                          key={milestone.id}
                          onClick={() => {
                            if (isClickable && !isActivating) {
                              handleMilestoneClick(milestone.id);
                            }
                          }}
                          disabled={!isClickable || isActivating}
                          className={`w-full text-left rounded-lg border-2 p-3 transition-all min-h-[44px] ${
                            milestoneLocked || isLocked
                              ? "opacity-50 cursor-not-allowed"
                              : isClickable
                              ? "cursor-pointer"
                              : "cursor-default"
                          } ${getMilestoneStatusColor(milestone.status)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-muted-foreground">
                                M{milestoneIndex + 1}
                              </span>
                              <span className="font-medium">{milestone.title}</span>
                            </div>
                            {isActivating && (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            )}
                            {milestone.status === "ACTIVE" && !isActivating && (
                              <span className="text-xs font-medium">Click to view jobs →</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
