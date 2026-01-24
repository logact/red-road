import type { WorkSession } from "@/types/volition";

/**
 * Utility functions for managing work sessions
 */

/**
 * Starts a new work session by adding it to the sessions array
 * @param workSessions - Current array of work sessions
 * @returns Updated array with new active session
 */
export function startSession(workSessions: WorkSession[]): WorkSession[] {
  const now = new Date().toISOString();
  return [...workSessions, { start: now, end: null }];
}

/**
 * Ends the current active session (if any) by setting its end timestamp
 * @param workSessions - Current array of work sessions
 * @returns Updated array with active session closed
 */
export function endCurrentSession(workSessions: WorkSession[]): WorkSession[] {
  if (workSessions.length === 0) {
    return workSessions;
  }

  const lastSession = workSessions[workSessions.length - 1];
  
  // If last session is already closed, return as-is
  if (lastSession.end !== null) {
    return workSessions;
  }

  // Close the active session
  const now = new Date().toISOString();
  const updatedSessions = [...workSessions];
  updatedSessions[updatedSessions.length - 1] = {
    ...lastSession,
    end: now,
  };

  return updatedSessions;
}

/**
 * Calculates total duration across all completed sessions in seconds
 * @param workSessions - Array of work sessions
 * @returns Total duration in seconds
 */
export function getTotalDuration(workSessions: WorkSession[]): number {
  return workSessions.reduce((total, session) => {
    if (session.end === null) {
      // Active session - calculate from start to now
      const start = new Date(session.start).getTime();
      const now = Date.now();
      return total + Math.floor((now - start) / 1000);
    } else {
      // Completed session - calculate duration
      const start = new Date(session.start).getTime();
      const end = new Date(session.end).getTime();
      return total + Math.floor((end - start) / 1000);
    }
  }, 0);
}

/**
 * Gets the current active session (if any)
 * @param workSessions - Array of work sessions
 * @returns Active session or null
 */
export function getCurrentSession(workSessions: WorkSession[]): WorkSession | null {
  if (workSessions.length === 0) {
    return null;
  }

  const lastSession = workSessions[workSessions.length - 1];
  return lastSession.end === null ? lastSession : null;
}

/**
 * Checks if there is an active session
 * @param workSessions - Array of work sessions
 * @returns True if there is an active session
 */
export function isSessionActive(workSessions: WorkSession[]): boolean {
  return getCurrentSession(workSessions) !== null;
}

/**
 * Gets the duration of the current active session in seconds
 * @param workSessions - Array of work sessions
 * @returns Duration in seconds, or 0 if no active session
 */
export function getCurrentSessionDuration(workSessions: WorkSession[]): number {
  const currentSession = getCurrentSession(workSessions);
  if (!currentSession) {
    return 0;
  }

  const start = new Date(currentSession.start).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
}
