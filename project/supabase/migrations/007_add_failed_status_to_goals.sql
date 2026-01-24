-- Add FAILED status to goals table
-- This status indicates that the user has given up on the goal
--
-- Feature 5.5: Goal Archivist - allows goals to be marked as FAILED when user gives up

-- Drop the existing CHECK constraint
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_status_check;

-- Add the new CHECK constraint with FAILED status
ALTER TABLE goals
ADD CONSTRAINT goals_status_check 
CHECK (status IN ('PENDING_SCOPE', 'SCOPING', 'PLANNING', 'ACTIVE', 'COMPLETED', 'QUARANTINE', 'FAILED'));

-- Add comment to document the new status
COMMENT ON COLUMN goals.status IS 'Goal status: PENDING_SCOPE (awaiting scope definition), SCOPING (defining scope), PLANNING (generating architecture), ACTIVE (in execution), COMPLETED (finished), QUARANTINE (stalled), FAILED (user gave up)';
