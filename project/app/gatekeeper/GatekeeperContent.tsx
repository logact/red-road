"use client";

import { useSearchParams } from "next/navigation";
import { StressTestForm } from "@/components/volition/gatekeeper/StressTestForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function GatekeeperContent() {
  const searchParams = useSearchParams();
  const goal = searchParams.get("goal");

  if (!goal) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>GATEKEEPER</CardTitle>
            <CardDescription>
              The action path - for when you have a specific goal or project to execute.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
              No goal specified. Please provide a goal in the URL parameter.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
      <StressTestForm goalTitle={goal} />
    </div>
  );
}
