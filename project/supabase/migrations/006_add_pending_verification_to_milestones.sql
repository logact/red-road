-- Add PENDING_VERIFICATION status to milestones table
-- This status indicates that all jobs in the milestone are completed and waiting for user verification
--
-- NOTE: This migration only updates the status constraint.
-- If you get an error about acceptance_criteria, that's from migration 005 which should already be applied.

-- Drop the existing CHECK constraint
ALTER TABLE milestones
DROP CONSTRAINT IF EXISTS milestones_status_check;

-- Add the new CHECK constraint with PENDING_VERIFICATION status
ALTER TABLE milestones
ADD CONSTRAINT milestones_status_check 
CHECK (status IN ('PENDING', 'ACTIVE', 'PENDING_VERIFICATION', 'COMPLETED', 'QUARANTINE'));

-- Add comment to document the new status
COMMENT ON COLUMN milestones.status IS 'Milestone status: PENDING (not started), ACTIVE (in progress), PENDING_VERIFICATION (all jobs completed, waiting for verification), COMPLETED (verified and complete), QUARANTINE (stalled)';
