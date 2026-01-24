import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkDashboardContent } from "@/components/volition/engine/WorkDashboardContent";
import type { WorkSession, JobRow } from "@/types/volition";

/**
 * Work Dashboard Page
 * 
 * Displays a focused view of a single active job with execution timer.
 * Only accessible for ACTIVE jobs that the user owns.
 */
export default async function WorkDashboardPage({
  params,
}: {
  params: { jobId: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  try {
    // #region agent log
    const pageLoadStartTime = Date.now();
    // #endregion
    // Optimized: Fetch job and ownership chain in parallel where possible
    // #region agent log
    const query1Start = Date.now();
    // #endregion
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", params.jobId)
      .single();
    // #region agent log
    const query1End = Date.now();
    fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'work/[jobId]/page.tsx:35',message:'Query 1: jobs',data:{jobId:params.jobId,duration:query1End-query1Start},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (jobError || !jobData) {
      redirect("/dashboard");
    }

    // Only allow ACTIVE jobs
    if (jobData.status !== "ACTIVE") {
      redirect("/dashboard");
    }

    // Optimized: Single query to get goal_id through the chain for ownership verification
    // This replaces 4 sequential queries (cluster -> milestone -> phase -> goal) with 1 query
    // #region agent log
    const ownershipQueryStart = Date.now();
    // #endregion
    const { data: ownershipData, error: ownershipError } = await supabase
      .from("job_clusters")
      .select(`
        milestone_id,
        milestones!inner(
          phase_id,
          phases!inner(
            goal_id,
            goals!inner(
              user_id
            )
          )
        )
      `)
      .eq("id", jobData.job_cluster_id)
      .eq("milestones.phases.goals.user_id", user.id)
      .single();
    // #region agent log
    const ownershipQueryEnd = Date.now();
    const pageLoadEndTime = Date.now();
    const totalPageLoadTime = pageLoadEndTime - pageLoadStartTime;
    fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'work/[jobId]/page.tsx:60',message:'Optimized ownership query + total page load',data:{jobId:params.jobId,ownershipQueryDuration:ownershipQueryEnd-ownershipQueryStart,totalPageLoadTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (ownershipError || !ownershipData) {
      redirect("/dashboard");
    }

    // Extract goal_id from the nested structure to pass to component (avoids re-querying)
    const goalId = (ownershipData as any)?.milestones?.phases?.goal_id;

    // Parse work_sessions
    const workSessions: WorkSession[] = jobData.work_sessions
      ? (Array.isArray(jobData.work_sessions) ? jobData.work_sessions : [])
      : [];

    return (
      <WorkDashboardContent
        job={{
          ...jobData,
          work_sessions: workSessions,
        } as JobRow}
        goalId={goalId}
      />
    );
  } catch (error) {
    // On any error, redirect to dashboard
    redirect("/dashboard");
  }
}
