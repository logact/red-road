-- Add acceptance_criteria column to milestones table
-- This field stores the acceptance criteria for milestone completion verification
ALTER TABLE milestones
ADD COLUMN acceptance_criteria TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN milestones.acceptance_criteria IS 'Clear, measurable criteria for what constitutes milestone completion. Used during milestone verification process.';
