import { getAllGoals } from "@/lib/actions/goals";
import { GoalsContent } from "./GoalsContent";

/**
 * Goals Management Page
 * 
 * Server component that fetches all goals and passes them to the client component.
 * Protected by dashboard layout (requires authentication).
 */
export default async function GoalsPage() {
  const goals = await getAllGoals();

  return (
    <div className="container mx-auto px-4 py-8">
      <GoalsContent initialGoals={goals} />
    </div>
  );
}
