"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { estimateComplexity } from "@/lib/actions/complexity-estimator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Complexity } from "@/types/volition";
import { Home } from "lucide-react";

interface ComplexityContentProps {
  goalId: string;
  goalTitle: string;
}

export function ComplexityContent({ goalId, goalTitle }: ComplexityContentProps) {
  const router = useRouter();
  const [complexity, setComplexity] = useState<Complexity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function runEstimation() {
      try {
        setLoading(true);
        setError(null);
        const result = await estimateComplexity(goalId);
        setComplexity(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to estimate complexity. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    runEstimation();
  }, [goalId]);

  const getSizeColor = (size: string) => {
    switch (size) {
      case "SMALL":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "LARGE":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>Complexity Estimator</CardTitle>
              <CardDescription>
                Analyzing complexity for: {goalTitle}
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
              Estimating complexity and effort...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>Complexity Estimator</CardTitle>
              <CardDescription>
                Error estimating complexity for: {goalTitle}
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
            onClick={() => router.push(`/architect/scope?goalId=${encodeURIComponent(goalId)}`)}
            className="mt-4"
            variant="outline"
          >
            Back to Scope
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!complexity) {
    return null;
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>Complexity Estimator</CardTitle>
            <CardDescription>
              Complexity analysis complete for: {goalTitle}
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
        {/* Size Badge */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Complexity Size:</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${getSizeColor(complexity.size)}`}
          >
            {complexity.size}
          </span>
        </div>

        {/* Estimated Hours */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Estimated Total Hours:</span>
          <p className="text-2xl font-bold">
            {complexity.estimated_total_hours.toLocaleString()}
            <span className="text-base font-normal text-muted-foreground ml-2">
              hours
            </span>
          </p>
        </div>

        {/* Projected End Date */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Projected Completion Date:</span>
          <p className="text-lg font-semibold">
            {formatDate(complexity.projected_end_date)}
          </p>
        </div>

        {/* Info Box */}
        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
          <p className="font-medium mb-1">What's Next?</p>
          <p>
            Based on this complexity assessment, the system will now generate a
            blueprint (phases and milestones) for your goal. Large goals will be
            broken down into phases, while smaller goals will go directly to
            milestones.
          </p>
        </div>

        {/* Action Button */}
        <Button
          onClick={() => router.push(`/architect/blueprint?goalId=${encodeURIComponent(goalId)}`)}
          className="w-full"
        >
          Generate Blueprint
        </Button>
      </CardContent>
    </Card>
  );
}
