"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { classifyInput } from "@/lib/actions/classifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function IntentInput() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) {
      setError("Please enter some text");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await classifyInput(input.trim());
      
      // Redirect based on classification result
      if (result === "INCUBATOR") {
        router.push("/incubator");
      } else if (result === "GATEKEEPER") {
        // Pass the input as the goal parameter
        router.push(`/gatekeeper?goal=${encodeURIComponent(input.trim())}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to classify input. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>What's on your mind?</CardTitle>
        <CardDescription>
          Share your thoughts, goals, or feelings. We'll help you find the right path.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="intent-input" className="text-sm font-medium">
              Your input
            </label>
            <Input
              id="intent-input"
              type="text"
              placeholder="I'm feeling overwhelmed..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
              disabled={loading}
              className="min-h-[44px]"
            />
          </div>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Classifying...
              </span>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
