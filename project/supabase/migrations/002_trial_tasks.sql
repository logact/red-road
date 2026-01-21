-- Trial tasks table
-- Stores the 3-7 day micro-plan tasks generated for goals that pass the stress test
CREATE TABLE trial_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  task_title TEXT NOT NULL,
  est_minutes INTEGER NOT NULL CHECK (est_minutes > 0 AND est_minutes < 20),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'SKIPPED')),
  scheduled_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_trial_tasks_goal_id ON trial_tasks(goal_id);
CREATE INDEX idx_trial_tasks_day_number ON trial_tasks(day_number);
CREATE INDEX idx_trial_tasks_scheduled_date ON trial_tasks(scheduled_date);
CREATE INDEX idx_trial_tasks_status ON trial_tasks(status);

-- Enable Row Level Security
ALTER TABLE trial_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trial_tasks
CREATE POLICY "Users can view trial tasks of their goals"
  ON trial_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = trial_tasks.goal_id
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert trial tasks for their goals"
  ON trial_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = trial_tasks.goal_id
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update trial tasks of their goals"
  ON trial_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = trial_tasks.goal_id
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete trial tasks of their goals"
  ON trial_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = trial_tasks.goal_id
      AND goals.user_id = auth.uid()
    )
  );
