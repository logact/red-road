import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompassView } from "@/components/volition/engine/CompassView";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <CompassView />;
}
