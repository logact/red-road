"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateStressTestQuestions } from "@/lib/actions/stress-test-generator";
import { calculateScoreAndDecision } from "@/lib/actions/scoring";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StressTestQuestion } from "@/lib/ai/schemas";
import type { ScoringResult } from "@/lib/ai/scoring";

interface StressTestFormProps {
  goalTitle: string;
}

export function StressTestForm({ goalTitle }: StressTestFormProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<StressTestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoringResult | null>(null);

  // Fetch questions on mount
  useEffect(() => {
    async function fetchQuestions() {
      try {
        setLoadingQuestions(true);
        setError(null);
        const fetchedQuestions = await generateStressTestQuestions(goalTitle);
        setQuestions(fetchedQuestions);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load questions. Please try again."
        );
      } finally {
        setLoadingQuestions(false);
      }
    }

    fetchQuestions();
  }, [goalTitle]);

  const handleAnswerChange = (questionIndex: number, score: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: score,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all questions are answered
    if (Object.keys(answers).length !== 6) {
      setError("Please answer all 6 questions before submitting.");
      return;
    }

    // Verify all indices 0-5 are present
    const answerIndices = Object.keys(answers).map(Number).sort((a, b) => a - b);
    const expectedIndices = [0, 1, 2, 3, 4, 5];
    if (JSON.stringify(answerIndices) !== JSON.stringify(expectedIndices)) {
      setError("Please answer all 6 questions before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Format answers for scoring
      const formattedAnswers = answerIndices.map((questionIndex) => ({
        questionIndex,
        selectedScore: answers[questionIndex],
      }));

      const scoringResult = await calculateScoreAndDecision(formattedAnswers, goalTitle);
      setResult(scoringResult);

      // If decision is PROCEED and goalId is present, redirect to trial dashboard
      if (scoringResult.decision === "PROCEED" && scoringResult.goalId) {
        router.push(`/trial?goalId=${encodeURIComponent(scoringResult.goalId)}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to calculate score. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Group questions by type for display
  const painQuestions = questions.filter((q) => q.type === "PAIN");
  const driveQuestions = questions.filter((q) => q.type === "DRIVE");

  if (loadingQuestions) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Stress Test</CardTitle>
          <CardDescription>
            Generating questions for: {goalTitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <span className="flex items-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading questions...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && questions.length === 0) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Stress Test</CardTitle>
          <CardDescription>
            Error loading questions for: {goalTitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Stress Test Results</CardTitle>
          <CardDescription>Your commitment score for: {goalTitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Score:</span>
              <span className="text-2xl font-bold">{result.score}/100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Pain Score:</span>
              <span className="text-lg">{result.painScore}/5</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Drive Score:</span>
              <span className="text-lg">{result.driveScore}/5</span>
            </div>
          </div>
          <div
            className={`rounded-md p-4 ${
              result.decision === "PROCEED"
                ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                : "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
            }`}
          >
            <p className="font-semibold">
              Decision: {result.decision === "PROCEED" ? "✓ Proceed" : "✗ Reject"}
            </p>
            <p className="text-sm mt-1">
              {result.decision === "PROCEED"
                ? "Your commitment level is sufficient. The goal can proceed to the next phase."
                : "Your commitment level is below the threshold. Consider revisiting this goal later."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Stress Test</CardTitle>
        <CardDescription>
          Answer these questions to validate your commitment to: {goalTitle}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* PAIN Questions Section */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">
                PAIN Questions (3 questions)
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                These questions measure the consequences of not achieving your goal.
              </p>
            </div>
            {painQuestions.map((question, index) => {
              const questionIndex = questions.findIndex((q) => q === question);
              return (
                <div key={questionIndex} className="space-y-3 border-l-4 border-red-500 pl-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      {index + 1}. {question.question}
                    </label>
                  </div>
                  <div className="space-y-2">
                    {question.answerOptions.map((option) => (
                      <label
                        key={option.score}
                        className="flex items-start gap-3 p-3 rounded-md border border-input hover:bg-accent cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`question-${questionIndex}`}
                          value={option.score}
                          checked={answers[questionIndex] === option.score}
                          onChange={() =>
                            handleAnswerChange(questionIndex, option.score)
                          }
                          className="mt-1"
                          required
                        />
                        <span className="text-sm flex-1">{option.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DRIVE Questions Section */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-green-600 dark:text-green-400">
                DRIVE Questions (3 questions)
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                These questions measure your willingness and commitment to achieve your goal.
              </p>
            </div>
            {driveQuestions.map((question, index) => {
              const questionIndex = questions.findIndex((q) => q === question);
              return (
                <div key={questionIndex} className="space-y-3 border-l-4 border-green-500 pl-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      {index + 1}. {question.question}
                    </label>
                  </div>
                  <div className="space-y-2">
                    {question.answerOptions.map((option) => (
                      <label
                        key={option.score}
                        className="flex items-start gap-3 p-3 rounded-md border border-input hover:bg-accent cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`question-${questionIndex}`}
                          value={option.score}
                          checked={answers[questionIndex] === option.score}
                          onChange={() =>
                            handleAnswerChange(questionIndex, option.score)
                          }
                          className="mt-1"
                          required
                        />
                        <span className="text-sm flex-1">{option.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
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
                Calculating score...
              </span>
            ) : (
              "Submit Answers"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
