-- Add acceptance_criteria column to trial_tasks table
ALTER TABLE trial_tasks
ADD COLUMN acceptance_criteria TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN trial_tasks.acceptance_criteria IS 'Clear criteria for what constitutes task completion';
