"use client";

import { useState, useEffect } from "react";
import type { WorkSession } from "@/types/volition";
import {
  getTotalDuration,
  getCurrentSessionDuration,
  isSessionActive,
} from "@/lib/utils/work-sessions";
import { Clock } from "lucide-react";

interface ExecutionTimerProps {
  workSessions: WorkSession[];
}

/**
 * Formats seconds into HH:MM:SS or MM:SS format
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  } else {
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
}

/**
 * ExecutionTimer Component
 * 
 * Displays the current session time (if active) and total accumulated time
 * across all work sessions. Updates every second when a session is active.
 */
export function ExecutionTimer({ workSessions }: ExecutionTimerProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const hasActiveSession = isSessionActive(workSessions);

  // Update timer every second if there's an active session
  useEffect(() => {
    if (!hasActiveSession) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [hasActiveSession]);

  const totalSeconds = getTotalDuration(workSessions);
  const currentSessionSeconds = hasActiveSession
    ? getCurrentSessionDuration(workSessions)
    : 0;

  return (
    <div className="flex items-center gap-6">
      {hasActiveSession && (
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm text-muted-foreground">Current Session</div>
            <div className="text-2xl font-bold tabular-nums">
              {formatTime(currentSessionSeconds)}
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div>
          <div className="text-sm text-muted-foreground">Total Time</div>
          <div className="text-2xl font-bold tabular-nums">
            {formatTime(totalSeconds)}
          </div>
        </div>
      </div>
    </div>
  );
}
