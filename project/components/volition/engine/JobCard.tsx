"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { JobRow, JobType, JobStatus } from "@/types/volition";
import { Clock, CheckCircle2, Circle, XCircle } from "lucide-react";
import { isSessionActive } from "@/lib/utils/work-sessions";

interface JobCardProps {
  job: JobRow;
  variant?: "default" | "hero";
  onStart?: (jobId: string) => void;
  onMarkDone?: (jobId: string) => void;
  onMarkFailed?: (jobId: string) => void;
  onClick?: (jobId: string) => void;
}

/**
 * Job Card Component
 * 
 * Displays a job with its details and actions.
 * Supports "hero" variant for the top recommendation.
 */
export function JobCard({
  job,
  variant = "default",
  onStart,
  onMarkDone,
  onMarkFailed,
  onClick,
}: JobCardProps) {
  const isHero = variant === "hero";
  const hasActiveSession = isSessionActive(job.work_sessions || []);
  const isClickable = job.status === "ACTIVE" && onClick !== undefined;

  const getJobTypeBadge = (type: JobType) => {
    const styles = {
      QUICK_WIN: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      DEEP_WORK: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      ANCHOR: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    };
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          styles[type]
        )}
      >
        {type.replace("_", " ")}
      </span>
    );
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "ACTIVE":
        return <Circle className="h-4 w-4 text-blue-600 fill-blue-600" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
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

  return (
    <Card
      className={cn(
        "transition-all duration-300",
        isHero
          ? "max-w-2xl border-2 border-primary shadow-lg"
          : "max-w-md border shadow-sm",
        isClickable && "cursor-pointer hover:shadow-md hover:border-primary/50"
      )}
      onClick={() => {
        if (isClickable) {
          onClick?.(job.id);
        }
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {getJobTypeBadge(job.type)}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {getStatusIcon(job.status)}
                <span>{getStatusLabel(job.status)}</span>
              </div>
              {hasActiveSession && (
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Active Session
                </span>
              )}
            </div>
            <CardTitle className={cn(isHero ? "text-2xl" : "text-xl")}>
              {job.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Estimated: {job.est_minutes} minutes</span>
        </div>

        {/* Action Buttons - Placeholder for feature 4.5 */}
        <div className="flex gap-2 pt-2">
          {job.status === "PENDING" && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onStart?.(job.id);
              }}
              variant="default"
              size={isHero ? "default" : "sm"}
              className="flex-1"
            >
              Start
            </Button>
          )}
          {job.status === "ACTIVE" && (
            <>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkDone?.(job.id);
                }}
                variant="default"
                size={isHero ? "default" : "sm"}
                className="flex-1"
              >
                Mark Done
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkFailed?.(job.id);
                }}
                variant="outline"
                size={isHero ? "default" : "sm"}
                className="flex-1"
              >
                Mark Failed
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
