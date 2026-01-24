-- Add failure_history JSONB column to jobs table
-- This field stores an array of failure notes, each with a timestamp and reason
-- Example: [{"timestamp": "2024-01-15T10:00:00Z", "reason": "Too complex, need more time"}]

ALTER TABLE jobs
ADD COLUMN failure_history JSONB DEFAULT '[]'::jsonb;

-- Add index for querying jobs with failure history
CREATE INDEX idx_jobs_failure_history ON jobs USING GIN (failure_history);

-- Add comment to document the structure
COMMENT ON COLUMN jobs.failure_history IS 'Array of failure notes. Each entry has timestamp (ISO string) and reason (string). Example: [{"timestamp": "2024-01-15T10:00:00Z", "reason": "User-provided failure reason"}]';
