"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAllGoals, createGoal, updateGoal, deleteGoal } from "@/lib/actions/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GoalRow, GoalStatus } from "@/types/volition";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Target,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

interface GoalsContentProps {
  initialGoals: GoalRow[];
}

type FormMode = "create" | "edit" | null;

export function GoalsContent({ initialGoals }: GoalsContentProps) {
  const router = useRouter();
  const [goals, setGoals] = useState<GoalRow[]>(initialGoals);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingGoal, setEditingGoal] = useState<GoalRow | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formStatus, setFormStatus] = useState<GoalStatus>("PENDING_SCOPE");
  const [formErrors, setFormErrors] = useState<{ title?: string }>({});

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-600 dark:text-green-400";
      case "COMPLETED":
        return "text-blue-600 dark:text-blue-400";
      case "QUARANTINE":
        return "text-red-600 dark:text-red-400";
      case "PLANNING":
      case "SCOPING":
      case "PENDING_SCOPE":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "COMPLETED":
        return <Circle className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace("_", " ").toLowerCase();
  };

  const refreshGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const updatedGoals = await getAllGoals();
      setGoals(updatedGoals);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to refresh goals. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setFormMode("create");
    setFormTitle("");
    setFormStatus("PENDING_SCOPE");
    setFormErrors({});
    setEditingGoal(null);
  };

  const openEditForm = (goal: GoalRow) => {
    setFormMode("edit");
    setFormTitle(goal.title);
    setFormStatus(goal.status);
    setFormErrors({});
    setEditingGoal(goal);
  };

  const closeForm = () => {
    setFormMode(null);
    setFormTitle("");
    setFormStatus("PENDING_SCOPE");
    setFormErrors({});
    setEditingGoal(null);
  };

  const validateForm = (): boolean => {
    const errors: { title?: string } = {};
    const trimmedTitle = formTitle.trim();

    if (!trimmedTitle) {
      errors.title = "Goal title is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormErrors({});

    if (!validateForm()) {
      return;
    }

    setFormSubmitting(true);

    try {
      if (formMode === "create") {
        const result = await createGoal(formTitle.trim());

        if (!result.success) {
          setError(result.error || "Failed to create goal");
          setFormSubmitting(false);
          return;
        }

        // Refresh goals list
        await refreshGoals();
        closeForm();
      } else if (formMode === "edit" && editingGoal) {
        const result = await updateGoal(editingGoal.id, {
          id: editingGoal.id,
          title: formTitle.trim(),
          status: formStatus,
        });

        if (!result.success) {
          setError(result.error || "Failed to update goal");
          setFormSubmitting(false);
          return;
        }

        // Refresh goals list
        await refreshGoals();
        closeForm();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${formMode === "create" ? "create" : "update"} goal. Please try again.`
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGoalId) return;

    setDeleteSubmitting(true);
    setError(null);

    try {
      const result = await deleteGoal(deletingGoalId);

      if (!result.success) {
        setError(result.error || "Failed to delete goal");
        setDeleteSubmitting(false);
        return;
      }

      // Refresh goals list
      await refreshGoals();
      setDeletingGoalId(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete goal. Please try again."
      );
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const getArchitectRoute = (goal: GoalRow): string => {
    const goalId = encodeURIComponent(goal.id);
    switch (goal.status) {
      case "PENDING_SCOPE":
      case "SCOPING":
        return `/architect/scope?goalId=${goalId}`;
      case "PLANNING":
        return `/architect/blueprint?goalId=${goalId}`;
      case "ACTIVE":
        return `/architect/jobs?goalId=${goalId}`;
      case "COMPLETED":
      case "QUARANTINE":
      default:
        // For completed/quarantine, show blueprint as a safe default
        return `/architect/blueprint?goalId=${goalId}`;
    }
  };

  const handleCardClick = (goal: GoalRow) => {
    const route = getArchitectRoute(goal);
    router.push(route);
  };

  const handleViewGoal = (goalId: string) => {
    router.push(`/dashboard?goalId=${encodeURIComponent(goalId)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goals Management</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit, and manage your goals
          </p>
        </div>
        <Button onClick={openCreateForm} className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-2" />
          Create Goal
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Goals List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first goal to get started
            </p>
            <Button onClick={openCreateForm} className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />
              Create Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <Card
              key={goal.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleCardClick(goal)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(goal.status)}
                    <CardTitle className="truncate">{goal.title}</CardTitle>
                  </div>
                </div>
                <CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={cn(
                        "text-xs font-medium capitalize",
                        getStatusColor(goal.status)
                      )}
                    >
                      {formatStatus(goal.status)}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      Updated {new Date(goal.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewGoal(goal.id);
                    }}
                    className="flex-1 min-h-[44px]"
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditForm(goal);
                    }}
                    className="min-h-[44px]"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingGoalId(goal.id);
                    }}
                    className="min-h-[44px]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {formMode && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={closeForm}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md relative z-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {formMode === "create" ? "Create Goal" : "Edit Goal"}
                    </CardTitle>
                    <CardDescription>
                      {formMode === "create"
                        ? "Enter the details for your new goal"
                        : "Update the goal details"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeForm}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {/* Title Input */}
                  <div className="space-y-2">
                    <label htmlFor="formTitle" className="text-sm font-medium">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="formTitle"
                      type="text"
                      placeholder="e.g., Build a SaaS Platform"
                      value={formTitle}
                      onChange={(e) => {
                        setFormTitle(e.target.value);
                        if (formErrors.title) {
                          setFormErrors((prev) => ({ ...prev, title: undefined }));
                        }
                      }}
                      className={formErrors.title ? "border-red-500" : ""}
                      disabled={formSubmitting}
                    />
                    {formErrors.title && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {formErrors.title}
                      </p>
                    )}
                  </div>

                  {/* Status Select (only for edit mode) */}
                  {formMode === "edit" && (
                    <div className="space-y-2">
                      <label htmlFor="formStatus" className="text-sm font-medium">
                        Status
                      </label>
                      <select
                        id="formStatus"
                        value={formStatus}
                        onChange={(e) =>
                          setFormStatus(e.target.value as GoalStatus)
                        }
                        disabled={formSubmitting}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="PENDING_SCOPE">Pending Scope</option>
                        <option value="SCOPING">Scoping</option>
                        <option value="PLANNING">Planning</option>
                        <option value="ACTIVE">Active</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="QUARANTINE">Quarantine</option>
                      </select>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeForm}
                      disabled={formSubmitting}
                      className="flex-1 min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={formSubmitting}
                      className="flex-1 min-h-[44px]"
                    >
                      {formSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {formMode === "create" ? "Creating..." : "Updating..."}
                        </span>
                      ) : formMode === "create" ? (
                        "Create Goal"
                      ) : (
                        "Update Goal"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deletingGoalId && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setDeletingGoalId(null)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md relative z-50 border-2 border-destructive">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-destructive">Delete Goal</CardTitle>
                    <CardDescription>
                      This action cannot be undone. All related data (phases,
                      milestones, jobs) will be permanently deleted.
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingGoalId(null)}
                    disabled={deleteSubmitting}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm">
                    Are you sure you want to delete this goal? This will
                    permanently delete the goal and all associated data.
                  </p>
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDeletingGoalId(null)}
                      disabled={deleteSubmitting}
                      className="flex-1 min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteSubmitting}
                      className="flex-1 min-h-[44px]"
                    >
                      {deleteSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Deleting...
                        </span>
                      ) : (
                        "Delete Goal"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
