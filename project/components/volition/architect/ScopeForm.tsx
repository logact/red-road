"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateGoalScope } from "@/lib/actions/scope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Home } from "lucide-react";

interface ScopeFormProps {
  goalId: string;
  goalTitle: string;
  initialScope?: {
    hard_constraint_hours_per_week: number;
    tech_stack: string[];
    definition_of_done?: string;
    user_background_level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  };
}

export function ScopeForm({ goalId, goalTitle, initialScope }: ScopeFormProps) {
  const router = useRouter();
  const [hoursPerWeek, setHoursPerWeek] = useState<string>(
    initialScope?.hard_constraint_hours_per_week?.toString() || ""
  );
  const [techStack, setTechStack] = useState<string>(
    initialScope?.tech_stack?.join(", ") || ""
  );
  const [definitionOfDone, setDefinitionOfDone] = useState<string>(
    initialScope?.definition_of_done || ""
  );
  const [userBackgroundLevel, setUserBackgroundLevel] = useState<
    "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" | ""
  >(initialScope?.user_background_level || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    hoursPerWeek?: string;
    definitionOfDone?: string;
    userBackgroundLevel?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    // Validate hours per week
    const hoursValue = hoursPerWeek.trim();
    if (!hoursValue) {
      errors.hoursPerWeek = "Hours per week is required";
    } else {
      const hoursNum = Number.parseFloat(hoursValue);
      if (Number.isNaN(hoursNum) || hoursNum <= 0 || !Number.isFinite(hoursNum)) {
        errors.hoursPerWeek = "Hours per week must be a positive number";
      }
    }

    // Validate definition of done
    if (!definitionOfDone.trim()) {
      errors.definitionOfDone = "Definition of Done is required";
    }

    // Validate user background level
    if (!userBackgroundLevel || userBackgroundLevel === "") {
      errors.userBackgroundLevel = "Your experience level is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Parse tech stack from comma-separated string
      const techStackArray = techStack
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      // Parse hours per week
      const hoursNum = Number.parseFloat(hoursPerWeek.trim());

      // Call server action
      const result = await updateGoalScope(
        goalId,
        hoursNum,
        techStackArray,
        definitionOfDone.trim(),
        userBackgroundLevel as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
      );

      if (!result.success) {
        setError(result.error || "Failed to update scope");
        setSubmitting(false);
        return;
      }

      // Success - redirect to complexity estimator (Feature 3.2)
      router.push(`/architect/complexity?goalId=${encodeURIComponent(goalId)}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update scope. Please try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>The Surveyor</CardTitle>
            <CardDescription>
              Define the "Triangle of Scope" for: {goalTitle}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard?goalId=${encodeURIComponent(goalId)}`)}
            className="min-h-[44px] min-w-[44px]"
            title="Back to Dashboard"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Hours per Week */}
          <div className="space-y-2">
            <label htmlFor="hoursPerWeek" className="text-sm font-medium">
              Hours per Week <span className="text-red-500">*</span>
            </label>
            <Input
              id="hoursPerWeek"
              type="number"
              min="0.5"
              step="0.5"
              placeholder="e.g., 10"
              value={hoursPerWeek}
              onChange={(e) => {
                setHoursPerWeek(e.target.value);
                if (fieldErrors.hoursPerWeek) {
                  setFieldErrors((prev) => ({ ...prev, hoursPerWeek: undefined }));
                }
              }}
              className={fieldErrors.hoursPerWeek ? "border-red-500" : ""}
            />
            <p className="text-xs text-muted-foreground">
              Maximum hours you can dedicate to this goal per week
            </p>
            {fieldErrors.hoursPerWeek && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.hoursPerWeek}
              </p>
            )}
          </div>

          {/* Tech Stack */}
          <div className="space-y-2">
            <label htmlFor="techStack" className="text-sm font-medium">
              Tech Stack
            </label>
            <Input
              id="techStack"
              type="text"
              placeholder="e.g., Next.js, Supabase, TypeScript"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of technologies, tools, or resources you plan to use
            </p>
          </div>

          {/* Definition of Done */}
          <div className="space-y-2">
            <label htmlFor="definitionOfDone" className="text-sm font-medium">
              Definition of Done <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="definitionOfDone"
              placeholder="e.g., A working MVP deployed to production with user authentication and basic CRUD operations"
              value={definitionOfDone}
              onChange={(e) => {
                setDefinitionOfDone(e.target.value);
                if (fieldErrors.definitionOfDone) {
                  setFieldErrors((prev) => ({ ...prev, definitionOfDone: undefined }));
                }
              }}
              rows={4}
              className={fieldErrors.definitionOfDone ? "border-red-500" : ""}
            />
            <p className="text-xs text-muted-foreground">
              Clear, binary criteria that defines when this goal is complete
            </p>
            {fieldErrors.definitionOfDone && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.definitionOfDone}
              </p>
            )}
          </div>

          {/* User Background Level */}
          <div className="space-y-2">
            <label htmlFor="userBackgroundLevel" className="text-sm font-medium">
              Your Experience Level <span className="text-red-500">*</span>
            </label>
            <select
              id="userBackgroundLevel"
              value={userBackgroundLevel}
              onChange={(e) => {
                setUserBackgroundLevel(
                  e.target.value as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" | ""
                );
                if (fieldErrors.userBackgroundLevel) {
                  setFieldErrors((prev) => ({ ...prev, userBackgroundLevel: undefined }));
                }
              }}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                fieldErrors.userBackgroundLevel ? "border-red-500" : ""
              }`}
            >
              <option value="">Select your experience level...</option>
              <option value="BEGINNER">Beginner - New to this area</option>
              <option value="INTERMEDIATE">Intermediate - Some experience</option>
              <option value="ADVANCED">Advanced - Experienced</option>
              <option value="EXPERT">Expert - Very experienced</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Your level of experience and background knowledge related to this goal
            </p>
            {fieldErrors.userBackgroundLevel && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.userBackgroundLevel}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving scope...
              </span>
            ) : (
              "Save Scope & Continue"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
