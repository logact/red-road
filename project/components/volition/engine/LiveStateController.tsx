"use client";

import { useUserState } from "@/lib/contexts/UserStateContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserState } from "@/types/volition";

/**
 * Live State Controller Component
 * 
 * A persistent toggle for user energy state (High/Med/Low) that:
 * - Provides visual feedback through color themes
 * - Triggers reactive updates when state changes
 * - Is always accessible via sticky positioning
 */
export function LiveStateController() {
  const { userState, setUserState } = useUserState();

  const states: Array<{ value: UserState; label: string; color: string }> = [
    { value: "HIGH", label: "High", color: "blue" },
    { value: "MED", label: "Med", color: "neutral" },
    { value: "LOW", label: "Low", color: "green" },
  ];

  const getButtonStyles = (state: UserState, currentState: UserState) => {
    const isActive = state === currentState;
    
    if (state === "HIGH") {
      return cn(
        "transition-all duration-200 min-h-[44px]",
        isActive
          ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md"
          : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
      );
    }
    
    if (state === "LOW") {
      return cn(
        "transition-all duration-200 min-h-[44px]",
        isActive
          ? "bg-green-500 text-white hover:bg-green-600 shadow-md"
          : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
      );
    }
    
    // MED state
    return cn(
      "transition-all duration-200 min-h-[44px]",
      isActive
        ? "bg-gray-500 text-white hover:bg-gray-600 shadow-md"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
    );
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground mr-2 hidden sm:inline">
        Energy:
      </span>
      <div className="flex gap-1 rounded-lg bg-background p-1 border border-border shadow-sm">
        {states.map((state) => (
          <Button
            key={state.value}
            onClick={() => setUserState(state.value)}
            className={getButtonStyles(state.value, userState)}
            variant="ghost"
            size="default"
            aria-pressed={userState === state.value}
            aria-label={`Set energy level to ${state.label}`}
          >
            {state.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
