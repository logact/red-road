import { Suspense } from "react";
import { GatekeeperContent } from "./GatekeeperContent";

export default function GatekeeperPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <GatekeeperContent />
    </Suspense>
  );
}
