"use client";

import { ScopeForm } from "@/components/volition/architect/ScopeForm";
import type { Scope } from "@/types/volition";

interface ScopeContentProps {
  goalId: string;
  goalTitle: string;
  initialScope?: Scope;
}

export function ScopeContent({ goalId, goalTitle, initialScope }: ScopeContentProps) {
  return (
    <ScopeForm
      goalId={goalId}
      goalTitle={goalTitle}
      initialScope={initialScope}
    />
  );
}
