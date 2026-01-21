#!/usr/bin/env node
/**
 * Scoring Unit Test Script
 * 
 * Tests the scoring calculation logic with various test cases.
 * 
 * Usage:
 *   cd project
 *   npm run test:scoring
 */

import { calculateScoreCore } from "../lib/ai/scoring";
import { StressTestAnswer } from "../lib/ai/schemas";

/**
 * Color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

/**
 * Test case interface
 */
interface TestCase {
  id: string;
  description: string;
  answers: StressTestAnswer[];
  expectedScore?: number;
  expectedPainScore?: number;
  expectedDriveScore?: number;
  expectedDecision: "REJECT" | "PROCEED";
  shouldThrow?: boolean;
  expectedError?: string;
}

/**
 * Helper function to create answers array
 */
function createAnswers(
  painScores: [number, number, number],
  driveScores: [number, number, number]
): StressTestAnswer[] {
  return [
    { questionIndex: 0, selectedScore: painScores[0] },
    { questionIndex: 1, selectedScore: painScores[1] },
    { questionIndex: 2, selectedScore: painScores[2] },
    { questionIndex: 3, selectedScore: driveScores[0] },
    { questionIndex: 4, selectedScore: driveScores[1] },
    { questionIndex: 5, selectedScore: driveScores[2] },
  ];
}

/**
 * Test cases
 */
const testCases: TestCase[] = [
  // Edge case: All minimum scores (all 1s)
  {
    id: "test-1",
    description: "All minimum scores (all 1s) - should REJECT",
    answers: createAnswers([1, 1, 1], [1, 1, 1]),
    expectedScore: 20.0, // (1*0.4 + 1*0.6) * 20 = 20
    expectedPainScore: 1.0,
    expectedDriveScore: 1.0,
    expectedDecision: "REJECT",
  },

  // Edge case: All maximum scores (all 5s)
  {
    id: "test-2",
    description: "All maximum scores (all 5s) - should PROCEED",
    answers: createAnswers([5, 5, 5], [5, 5, 5]),
    expectedScore: 100.0, // (5*0.4 + 5*0.6) * 20 = 100
    expectedPainScore: 5.0,
    expectedDriveScore: 5.0,
    expectedDecision: "PROCEED",
  },

  // Boundary case: Score exactly 60 (should PROCEED)
  {
    id: "test-3",
    description: "Score exactly 60 - should PROCEED",
    answers: createAnswers([3, 3, 3], [3, 3, 3]),
    expectedScore: 60.0, // (3*0.4 + 3*0.6) * 20 = 60
    expectedPainScore: 3.0,
    expectedDriveScore: 3.0,
    expectedDecision: "PROCEED",
  },

  // Boundary case: Score just below 60 (should REJECT)
  {
    id: "test-4",
    description: "Score just below 60 - should REJECT",
    answers: createAnswers([2, 3, 3], [3, 3, 3]),
    // Pain: (2+3+3)/3 = 2.67, Drive: (3+3+3)/3 = 3
    // Score: (2.67*0.4 + 3*0.6) * 20 = (1.068 + 1.8) * 20 = 2.868 * 20 = 57.36
    expectedScore: 57.36,
    expectedPainScore: 2.67,
    expectedDriveScore: 3.0,
    expectedDecision: "REJECT",
  },

  // Boundary case: Score just above 60 (should PROCEED)
  {
    id: "test-5",
    description: "Score just above 60 - should PROCEED",
    answers: createAnswers([3, 3, 3], [3, 3, 4]),
    // Pain: (3+3+3)/3 = 3, Drive: (3+3+4)/3 = 3.33
    // Score: (3*0.4 + 3.33*0.6) * 20 = (1.2 + 1.998) * 20 = 3.198 * 20 = 63.96
    expectedScore: 63.96,
    expectedPainScore: 3.0,
    expectedDriveScore: 3.33,
    expectedDecision: "PROCEED",
  },

  // Normal case: Moderate scores
  {
    id: "test-6",
    description: "Moderate scores - should PROCEED",
    answers: createAnswers([4, 4, 3], [4, 4, 4]),
    // Pain: (4+4+3)/3 = 3.67, Drive: (4+4+4)/3 = 4
    // Score: (3.67*0.4 + 4*0.6) * 20 = (1.468 + 2.4) * 20 = 3.868 * 20 = 77.36
    expectedPainScore: 3.67,
    expectedDriveScore: 4.0,
    expectedDecision: "PROCEED",
  },

  // Case: High pain, low drive
  {
    id: "test-7",
    description: "High pain, low drive - should REJECT",
    answers: createAnswers([5, 5, 5], [1, 1, 1]),
    // Pain: (5+5+5)/3 = 5, Drive: (1+1+1)/3 = 1
    // Score: (5*0.4 + 1*0.6) * 20 = (2 + 0.6) * 20 = 2.6 * 20 = 52
    expectedScore: 52.0,
    expectedPainScore: 5.0,
    expectedDriveScore: 1.0,
    expectedDecision: "REJECT",
  },

  // Case: Low pain, high drive
  {
    id: "test-8",
    description: "Low pain, high drive - should PROCEED",
    answers: createAnswers([1, 1, 1], [5, 5, 5]),
    // Pain: (1+1+1)/3 = 1, Drive: (5+5+5)/3 = 5
    // Score: (1*0.4 + 5*0.6) * 20 = (0.4 + 3) * 20 = 3.4 * 20 = 68
    expectedScore: 68.0,
    expectedPainScore: 1.0,
    expectedDriveScore: 5.0,
    expectedDecision: "PROCEED",
  },

  // Case: Mixed scores
  {
    id: "test-9",
    description: "Mixed scores - should PROCEED",
    answers: createAnswers([3, 4, 2], [4, 3, 5]),
    // Pain: (3+4+2)/3 = 3, Drive: (4+3+5)/3 = 4
    // Score: (3*0.4 + 4*0.6) * 20 = (1.2 + 2.4) * 20 = 3.6 * 20 = 72
    expectedScore: 72.0,
    expectedPainScore: 3.0,
    expectedDriveScore: 4.0,
    expectedDecision: "PROCEED",
  },

  // Invalid case: Wrong number of answers
  {
    id: "test-10",
    description: "Wrong number of answers - should throw",
    answers: [
      { questionIndex: 0, selectedScore: 3 },
      { questionIndex: 1, selectedScore: 3 },
      { questionIndex: 2, selectedScore: 3 },
    ],
    shouldThrow: true,
    expectedError: "Must provide exactly 6 answers",
  },

  // Invalid case: Missing question index
  {
    id: "test-11",
    description: "Missing question index - should throw",
    answers: [
      { questionIndex: 0, selectedScore: 3 },
      { questionIndex: 1, selectedScore: 3 },
      { questionIndex: 2, selectedScore: 3 },
      { questionIndex: 3, selectedScore: 3 },
      { questionIndex: 4, selectedScore: 3 },
      { questionIndex: 6, selectedScore: 3 }, // Missing index 5
    ],
    shouldThrow: true,
    expectedError: "Answers must cover all question indices from 0 to 5",
  },

  // Invalid case: Duplicate question index
  {
    id: "test-12",
    description: "Duplicate question index - should throw",
    answers: [
      { questionIndex: 0, selectedScore: 3 },
      { questionIndex: 1, selectedScore: 3 },
      { questionIndex: 2, selectedScore: 3 },
      { questionIndex: 3, selectedScore: 3 },
      { questionIndex: 4, selectedScore: 3 },
      { questionIndex: 4, selectedScore: 3 }, // Duplicate index 4
    ],
    shouldThrow: true,
    expectedError: "Answers must cover all question indices from 0 to 5",
  },

  // Case: Unsorted answers (should still work)
  {
    id: "test-13",
    description: "Unsorted answers - should work correctly",
    answers: [
      { questionIndex: 5, selectedScore: 4 },
      { questionIndex: 2, selectedScore: 3 },
      { questionIndex: 0, selectedScore: 3 },
      { questionIndex: 4, selectedScore: 4 },
      { questionIndex: 1, selectedScore: 3 },
      { questionIndex: 3, selectedScore: 4 },
    ],
    // Same as test-9: Pain: (3+3+3)/3 = 3, Drive: (4+4+4)/3 = 4
    // Score: (3*0.4 + 4*0.6) * 20 = 72
    expectedScore: 72.0,
    expectedPainScore: 3.0,
    expectedDriveScore: 4.0,
    expectedDecision: "PROCEED",
  },
];

/**
 * Run a single test case
 */
function runTestCase(testCase: TestCase): { passed: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    if (testCase.shouldThrow) {
      // Test that it throws
      try {
        const result = calculateScoreCore(testCase.answers);
        errors.push(`Expected error but got result: ${JSON.stringify(result)}`);
        return { passed: false, errors };
      } catch (error) {
        if (testCase.expectedError) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes(testCase.expectedError)) {
            errors.push(
              `Expected error to contain "${testCase.expectedError}" but got "${errorMessage}"`
            );
          }
        }
        return { passed: errors.length === 0, errors };
      }
    }

    // Test normal execution
    const result = calculateScoreCore(testCase.answers);

    // Check decision
    if (result.decision !== testCase.expectedDecision) {
      errors.push(
        `Expected decision "${testCase.expectedDecision}" but got "${result.decision}"`
      );
    }

    // Check score (with tolerance for floating point)
    if (testCase.expectedScore !== undefined) {
      const tolerance = 0.01;
      if (Math.abs(result.score - testCase.expectedScore) > tolerance) {
        errors.push(
          `Expected score ${testCase.expectedScore} but got ${result.score}`
        );
      }
    }

    // Check pain score
    if (testCase.expectedPainScore !== undefined) {
      const tolerance = 0.01;
      if (Math.abs(result.painScore - testCase.expectedPainScore) > tolerance) {
        errors.push(
          `Expected pain score ${testCase.expectedPainScore} but got ${result.painScore}`
        );
      }
    }

    // Check drive score
    if (testCase.expectedDriveScore !== undefined) {
      const tolerance = 0.01;
      if (Math.abs(result.driveScore - testCase.expectedDriveScore) > tolerance) {
        errors.push(
          `Expected drive score ${testCase.expectedDriveScore} but got ${result.driveScore}`
        );
      }
    }

    return { passed: errors.length === 0, errors };
  } catch (error) {
    if (!testCase.shouldThrow) {
      errors.push(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return { passed: false, errors };
  }
}

/**
 * Main test function
 */
function main() {
  console.log(`${colors.cyan}=== Scoring Unit Test Suite ===${colors.reset}\n`);

  let passedCount = 0;
  let failedCount = 0;

  for (const testCase of testCases) {
    const { passed, errors } = runTestCase(testCase);

    const icon = passed ? "✅" : "❌";
    const color = passed ? colors.green : colors.red;
    console.log(
      `${color}${icon}${colors.reset} ${testCase.id}: ${testCase.description}`
    );

    if (!passed) {
      failedCount++;
      errors.forEach((error) => {
        console.log(`   ${colors.red}✗${colors.reset} ${error}`);
      });
    } else {
      passedCount++;
      if (!testCase.shouldThrow) {
        const result = calculateScoreCore(testCase.answers);
        console.log(
          `   Score: ${result.score}, Pain: ${result.painScore}, Drive: ${result.driveScore}, Decision: ${result.decision}`
        );
      }
    }
  }

  // Summary
  console.log(`\n${colors.cyan}=== Test Summary ===${colors.reset}`);
  console.log(
    `Total: ${testCases.length} | ${colors.green}Passed: ${passedCount}${colors.reset} | ${colors.red}Failed: ${failedCount}${colors.reset}`
  );

  // Exit with error code if any tests failed
  if (failedCount > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
