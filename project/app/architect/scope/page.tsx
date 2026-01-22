import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGoal } from "@/lib/actions/trial";
import { ScopeContent } from "./ScopeContent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function ScopePageContent({ goalId }: { goalId: string }) {
  try {
    // Fetch goal to verify it exists and get title/scope
    const goal = await getGoal(goalId);

    // Verify goal status is appropriate for scoping
    if (goal.status !== "PENDING_SCOPE" && goal.status !== "SCOPING") {
      return (
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Invalid Goal Status</CardTitle>
              <CardDescription>
                This goal is not ready for scope definition.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                Current status: {goal.status}. The goal must be in PENDING_SCOPE or SCOPING status to define scope.
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <ScopeContent goalId={goalId} goalTitle={goal.title} initialScope={goal.scope} />
      </div>
    );
  } catch (error) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Error Loading Goal</CardTitle>
            <CardDescription>
              Unable to load the goal for scope definition.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error instanceof Error ? error.message : "An unknown error occurred"}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

export default async function ScopePage({
  searchParams,
}: {
  searchParams: { goalId?: string };
}) {
  const goalId = searchParams.goalId;

  if (!goalId) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>The Surveyor</CardTitle>
            <CardDescription>
              Define the "Triangle of Scope" for your goal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
              No goal ID provided. Please provide a goal ID in the URL parameter.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading goal...</p>
          </div>
        </div>
      }
    >
      <ScopePageContent goalId={goalId} />
    </Suspense>
  );
}
