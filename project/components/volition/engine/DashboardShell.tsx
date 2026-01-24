"use client";

import Link from "next/link";
import { UserStateProvider } from "@/lib/contexts/UserStateContext";
import { LiveStateController } from "./LiveStateController";
import { ClusterExplorer } from "./ClusterExplorer";
import { GoalSelectorDropdown } from "./GoalSelectorDropdown";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

/**
 * Client-side wrapper for dashboard that provides UserState context
 * and includes the sticky header with LiveStateController
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <UserStateProvider>
      <div className="min-h-screen flex flex-col">
        {/* Sticky Header with Live State Controller */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <h1 className="text-lg font-semibold cursor-pointer hover:opacity-80 transition-opacity">Volition OS</h1>
              </Link>
              <GoalSelectorDropdown />
              <Link href="/dashboard/goals">
                <Button variant="ghost" size="sm" className="min-h-[44px]">
                  <Settings className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Manage Goals</span>
                </Button>
              </Link>
            </div>
            <LiveStateController />
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Cluster Explorer - Always available via floating button */}
        <ClusterExplorer />
      </div>
    </UserStateProvider>
  );
}
