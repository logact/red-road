-- Add work_sessions JSONB column to jobs table
-- This field stores an array of work sessions, each with start and end timestamps
-- Example: [{"start": "2024-01-15T10:00:00Z", "end": "2024-01-15T10:30:00Z"}, {"start": "2024-01-15T11:00:00Z", "end": null}]
-- The last session may have end: null if currently active

ALTER TABLE jobs
ADD COLUMN work_sessions JSONB DEFAULT '[]'::jsonb;

-- Add index for querying jobs with active sessions
CREATE INDEX idx_jobs_work_sessions ON jobs USING GIN (work_sessions);

-- Add comment to document the structure
COMMENT ON COLUMN jobs.work_sessions IS 'Array of work sessions. Each session has start (ISO timestamp) and end (ISO timestamp or null if active). Example: [{"start": "2024-01-15T10:00:00Z", "end": "2024-01-15T10:30:00Z"}]';
