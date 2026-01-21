import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrialContent } from "./TrialContent";

export default async function TrialPage({
  searchParams,
}: {
  searchParams: { goalId?: string };
}) {
  const goalId = searchParams.goalId;

  if (!goalId) {
    redirect("/dashboard");
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading trial dashboard...</p>
          </div>
        </div>
      }
    >
      <TrialContent goalId={goalId} />
    </Suspense>
  );
}
