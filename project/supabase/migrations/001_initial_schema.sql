  -- Enable UUID extension
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- Goals table
  CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    complexity JSONB NOT NULL DEFAULT '{"size": "SMALL", "estimated_total_hours": 0, "projected_end_date": ""}',
    scope JSONB NOT NULL DEFAULT '{"hard_constraint_hours_per_week": 0, "tech_stack": []}',
    architecture JSONB NOT NULL DEFAULT '{"current_phase_index": 0, "phases": []}',
    status TEXT NOT NULL DEFAULT 'PENDING_SCOPE' CHECK (status IN ('PENDING_SCOPE', 'SCOPING', 'PLANNING', 'ACTIVE', 'COMPLETED', 'QUARANTINE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Phases table
  CREATE TABLE phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'QUARANTINE')),
    index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Milestones table
  CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'QUARANTINE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Job clusters table
  CREATE TABLE job_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Jobs table
  CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_cluster_id UUID NOT NULL REFERENCES job_clusters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('QUICK_WIN', 'DEEP_WORK', 'ANCHOR')),
    est_minutes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED')),
    failure_count INTEGER NOT NULL DEFAULT 0,
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create indexes for better query performance
  CREATE INDEX idx_goals_user_id ON goals(user_id);
  CREATE INDEX idx_goals_status ON goals(status);
  CREATE INDEX idx_phases_goal_id ON phases(goal_id);
  CREATE INDEX idx_milestones_phase_id ON milestones(phase_id);
  CREATE INDEX idx_job_clusters_milestone_id ON job_clusters(milestone_id);
  CREATE INDEX idx_jobs_job_cluster_id ON jobs(job_cluster_id);
  CREATE INDEX idx_jobs_status ON jobs(status);
  CREATE INDEX idx_jobs_deadline ON jobs(deadline);

  -- Enable Row Level Security
  ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
  ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
  ALTER TABLE job_clusters ENABLE ROW LEVEL SECURITY;
  ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

  -- RLS Policies for goals
  CREATE POLICY "Users can view their own goals"
    ON goals FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own goals"
    ON goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own goals"
    ON goals FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own goals"
    ON goals FOR DELETE
    USING (auth.uid() = user_id);

  -- RLS Policies for phases
  CREATE POLICY "Users can view phases of their goals"
    ON phases FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM goals
        WHERE goals.id = phases.goal_id
        AND goals.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can insert phases for their goals"
    ON phases FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM goals
        WHERE goals.id = phases.goal_id
        AND goals.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update phases of their goals"
    ON phases FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM goals
        WHERE goals.id = phases.goal_id
        AND goals.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete phases of their goals"
    ON phases FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM goals
        WHERE goals.id = phases.goal_id
        AND goals.user_id = auth.uid()
      )
    );

  -- RLS Policies for milestones
  CREATE POLICY "Users can view milestones of their goals"
    ON milestones FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM phases
        JOIN goals ON goals.id = phases.goal_id
        WHERE phases.id = milestones.phase_id
        AND goals.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can insert milestones for their goals"
    ON milestones FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM phases
        JOIN goals ON goals.id = phases.goal_id
        WHERE phases.id = milestones.phase_id
        AND goals.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update milestones of their goals"
    ON milestones FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM phases
        JOIN goals ON goals.id = phases.goal_id
        WHERE phases.id = milestones.phase_id
        AND goals.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete milestones of their goals"
    ON milestones FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM phases
        JOIN goals ON goals.id = phases.goal_id
        WHERE phases.id = milestones.phase_id
        AND goals.user_id = auth.uid()
      )
    );

  -- RLS Policies for job_clusters
  CREATE POLICY "Users can view job clusters of their goals"
    ON job_clusters FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM milestones
        JOIN phases ON phases.id = milestones.phase_id
        JOIN goals ON goals.id = phases.goal_id
        WHERE milestones.id = job_clusters.milestone_id
        AND goals.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can insert job clusters for their goals"
    ON job_clusters FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM milestones
        JOIN phases ON phases.id = milestones.phase_id
        JOIN goals ON goals.id = phases.goal_id
        WHERE milestones.id = job_clusters.milestone_id
        AND goals.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update job clusters of their goals"
    ON job_clusters FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM milestones
        JOIN phases ON phases.id = milestones.phase_id
        JOIN goals ON goals.id = phases.goal_id
        WHERE milestones.id = job_clusters.milestone_id
        AND goals.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete job clusters of their goals"
    ON job_clusters FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM milestones
        JOIN phases ON phases.id = milestones.phase_id
        JOIN goals ON goals.id = phases.goal_id
        WHERE milestones.id = job_clusters.milestone_id
        AND goals.user_id = auth.uid()
      )
    );

  -- RLS Policies for jobs
  CREATE POLICY "Users can view jobs of their goals"
    ON jobs FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM job_clusters
        JOIN milestones ON milestones.id = job_clusters.milestone_id
        JOIN phases ON phases.id = milestones.phase_id
        JOIN goals ON goals.id = phases.goal_id
        WHERE job_clusters.id = jobs.job_cluster_id
        AND goals.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can insert jobs for their goals"
    ON jobs FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM job_clusters
        JOIN milestones ON milestones.id = job_clusters.milestone_id
        JOIN phases ON phases.id = milestones.phase_id
        JOIN goals ON goals.id = phases.goal_id
        WHERE job_clusters.id = jobs.job_cluster_id
        AND goals.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update jobs of their goals"
    ON jobs FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM job_clusters
        JOIN milestones ON milestones.id = job_clusters.milestone_id
        JOIN phases ON phases.id = milestones.phase_id
        JOIN goals ON goals.id = phases.goal_id
        WHERE job_clusters.id = jobs.job_cluster_id
        AND goals.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete jobs of their goals"
    ON jobs FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM job_clusters
        JOIN milestones ON milestones.id = job_clusters.milestone_id
        JOIN phases ON phases.id = milestones.phase_id
        JOIN goals ON goals.id = phases.goal_id
        WHERE job_clusters.id = jobs.job_cluster_id
        AND goals.user_id = auth.uid()
      )
    );

  -- Function to update updated_at timestamp
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ language 'plpgsql';

  -- Trigger to automatically update updated_at on goals
  CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
