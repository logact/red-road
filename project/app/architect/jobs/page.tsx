import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { JobsContent } from "./JobsContent";
import { AllJobsContent } from "./AllJobsContent";
import { UserStateProvider } from "@/lib/contexts/UserStateContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function JobsPageContent({ goalId, milestoneId }: { goalId: string; milestoneId: string }) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return (
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please log in to view jobs.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    // Fetch milestone to get its title
    const { data: milestoneData, error: milestoneError } = await supabase
      .from("milestones")
      .select("id, title, status")
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestoneData) {
      return (
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle>Milestone Not Found</CardTitle>
              <CardDescription>
                The milestone you're looking for doesn't exist or you don't have access to it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {milestoneError?.message || "Milestone not found"}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Fetch goal to verify ownership
    const { data: goalData, error: goalError } = await supabase
      .from("goals")
      .select("id, user_id, title")
      .eq("id", goalId)
      .single();

    if (goalError || !goalData) {
      return (
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle>Goal Not Found</CardTitle>
              <CardDescription>
                The goal you're looking for doesn't exist or you don't have access to it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {goalError?.message || "Goal not found"}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (goalData.user_id !== user.id) {
      return (
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle>Unauthorized</CardTitle>
              <CardDescription>You don't have access to this goal.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    return (
      <UserStateProvider>
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <JobsContent
            goalId={goalId}
            goalTitle={goalData.title}
            milestoneId={milestoneId}
            milestoneTitle={milestoneData.title}
          />
        </div>
      </UserStateProvider>
    );
  } catch (error) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle>Error Loading Jobs</CardTitle>
            <CardDescription>Unable to load jobs for this milestone.</CardDescription>
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

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { goalId?: string; milestoneId?: string };
}) {
  const goalId = searchParams.goalId;
  const milestoneId = searchParams.milestoneId;

  if (!goalId) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle>Jobs</CardTitle>
            <CardDescription>View and manage jobs for a goal or milestone.</CardDescription>
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

  // If milestoneId is provided, show jobs for that milestone
  // Otherwise, show all jobs for the goal
  if (milestoneId) {
    return (
      <Suspense
        fallback={
          <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading jobs...</p>
            </div>
          </div>
        }
      >
        <JobsPageContent goalId={goalId} milestoneId={milestoneId} />
      </Suspense>
    );
  }

  // Show all jobs for the goal
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading jobs...</p>
          </div>
        </div>
      }
    >
      <AllJobsPageContent goalId={goalId} />
    </Suspense>
  );
}

async function AllJobsPageContent({ goalId }: { goalId: string }) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return (
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please log in to view jobs.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    // Fetch goal to verify ownership
    const { data: goalData, error: goalError } = await supabase
      .from("goals")
      .select("id, user_id, title")
      .eq("id", goalId)
      .single();

    if (goalError || !goalData) {
      return (
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle>Goal Not Found</CardTitle>
              <CardDescription>
                The goal you're looking for doesn't exist or you don't have access to it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {goalError?.message || "Goal not found"}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (goalData.user_id !== user.id) {
      return (
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle>Unauthorized</CardTitle>
              <CardDescription>You don't have access to this goal.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    return (
      <UserStateProvider>
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <AllJobsContent goalId={goalId} goalTitle={goalData.title} />
        </div>
      </UserStateProvider>
    );
  } catch (error) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle>Error Loading Jobs</CardTitle>
            <CardDescription>Unable to load jobs for this goal.</CardDescription>
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
