#!/usr/bin/env node
/**
 * Stress Test Generator Test Script
 * 
 * Tests the stress test generator with various goal titles and logs all LLM invocations.
 * 
 * Usage:
 *   cd project
 *   npm run test:stress-test-generator
 * 
 * Requires environment variables:
 *   DEEPSEEK_API_KEY
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { generateStressTestQuestionsCore } from "../lib/ai/stress-test-generator";
import { STRESS_TEST_GENERATOR_PROMPT } from "../lib/ai/prompts";

// Load environment variables from .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Log file path
const LOG_FILE = path.join(__dirname, "../llm-invoke.log");

/**
 * Log an LLM invocation to the log file
 */
function logInvocation(logEntry: {
  timestamp: string;
  input: string;
  rawLLMResponse: string;
  finalOutput: Array<{
    type: "PAIN" | "DRIVE";
    question: string;
    answerOptions: Array<{ text: string; score: number }>;
  }>;
  testCaseId?: string;
  passed?: boolean;
  error?: string;
}) {
  const logLine = JSON.stringify(logEntry) + "\n";
  fs.appendFileSync(LOG_FILE, logLine, "utf-8");
}

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
  magenta: "\x1b[35m",
};

/**
 * Load test cases from JSON file
 */
function loadTestCases() {
  const testCasesPath = path.join(
    __dirname,
    "test-cases/stress-test-generator.test-cases.json"
  );
  const content = fs.readFileSync(testCasesPath, "utf-8");
  const data = JSON.parse(content);
  return data.testCases;
}

/**
 * Validate the generated questions
 */
function validateQuestions(
  questions: Array<{
    type: "PAIN" | "DRIVE";
    question: string;
    answerOptions: Array<{ text: string; score: number }>;
  }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (questions.length !== 6) {
    errors.push(`Expected 6 questions, got ${questions.length}`);
  }

  const painCount = questions.filter((q) => q.type === "PAIN").length;
  const driveCount = questions.filter((q) => q.type === "DRIVE").length;

  if (painCount !== 3) {
    errors.push(`Expected 3 PAIN questions, got ${painCount}`);
  }

  if (driveCount !== 3) {
    errors.push(`Expected 3 DRIVE questions, got ${driveCount}`);
  }

  // Check that all questions have non-empty question text
  questions.forEach((q, index) => {
    if (!q.question || q.question.trim().length === 0) {
      errors.push(`Question ${index + 1} has empty question text`);
    }
  });

  // Check that all questions have exactly 5 answer options
  questions.forEach((q, index) => {
    if (!q.answerOptions || q.answerOptions.length !== 5) {
      errors.push(
        `Question ${index + 1} has ${q.answerOptions?.length || 0} answer options, expected 5`
      );
    }
  });

  // Check that answer options have valid scores (1-5) and non-empty text
  questions.forEach((q, qIndex) => {
    if (q.answerOptions) {
      q.answerOptions.forEach((option, oIndex) => {
        if (!option.text || option.text.trim().length === 0) {
          errors.push(
            `Question ${qIndex + 1}, option ${oIndex + 1} has empty text`
          );
        }
        if (option.score < 1 || option.score > 5) {
          errors.push(
            `Question ${qIndex + 1}, option ${oIndex + 1} has invalid score: ${option.score} (must be 1-5)`
          );
        }
      });

      // Check that scores are 1, 2, 3, 4, 5
      const scores = q.answerOptions.map((opt) => opt.score).sort((a, b) => a - b);
      const expectedScores = [1, 2, 3, 4, 5];
      if (JSON.stringify(scores) !== JSON.stringify(expectedScores)) {
        errors.push(
          `Question ${qIndex + 1} has incorrect score sequence: [${scores.join(", ")}], expected [1, 2, 3, 4, 5]`
        );
      }
    }
  });

  // Check that questions are specific (not generic)
  const genericPhrases = [
    "your goal",
    "this goal",
    "the goal",
    "achieve this",
    "complete this",
  ];
  let genericCount = 0;
  questions.forEach((q) => {
    const lowerText = q.question.toLowerCase();
    if (genericPhrases.some((phrase) => lowerText.includes(phrase))) {
      genericCount++;
    }
  });

  // Allow some generic references, but flag if too many
  if (genericCount > 4) {
    errors.push(
      `Warning: ${genericCount} questions contain generic phrases - questions may not be specific enough`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Run a single test case
 */
async function runTestCase(testCase: {
  id: string;
  goalTitle: string;
  description: string;
}) {
  try {
    const { rawResponse, result } = await generateStressTestQuestionsCore(
      testCase.goalTitle
    );
    const validation = validateQuestions(result);
    const timestamp = new Date().toISOString();

    // Log the invocation
    logInvocation({
      timestamp,
      input: testCase.goalTitle,
      rawLLMResponse: rawResponse,
      finalOutput: result,
      testCaseId: testCase.id,
      passed: validation.valid,
      error: validation.errors.length > 0 ? validation.errors.join("; ") : undefined,
    });

    // Display result
    const icon = validation.valid ? "✅" : "❌";
    const color = validation.valid ? colors.green : colors.red;
    console.log(
      `${color}${icon}${colors.reset} ${testCase.id}: "${testCase.goalTitle}"`
    );
    console.log(`   ${colors.cyan}Description: ${testCase.description}${colors.reset}`);

    // Display questions
    console.log(`\n   ${colors.magenta}Generated Questions:${colors.reset}`);
    const painQuestions = result.filter((q) => q.type === "PAIN");
    const driveQuestions = result.filter((q) => q.type === "DRIVE");

    console.log(`   ${colors.yellow}PAIN Questions (${painQuestions.length}):${colors.reset}`);
    painQuestions.forEach((q, i) => {
      console.log(`     ${i + 1}. ${q.question}`);
      q.answerOptions.forEach((option) => {
        console.log(`        [${option.score}] ${option.text}`);
      });
    });

    console.log(`   ${colors.blue}DRIVE Questions (${driveQuestions.length}):${colors.reset}`);
    driveQuestions.forEach((q, i) => {
      console.log(`     ${i + 1}. ${q.question}`);
      q.answerOptions.forEach((option) => {
        console.log(`        [${option.score}] ${option.text}`);
      });
    });

    // Display raw response (truncated if too long)
    console.log(`\n   ${colors.cyan}Raw LLM Response:${colors.reset}`);
    const truncatedResponse =
      rawResponse.length > 500
        ? rawResponse.substring(0, 500) + "... (truncated)"
        : rawResponse;
    console.log(`   ${truncatedResponse}`);

    if (!validation.valid) {
      console.log(`\n   ${colors.red}Validation Errors:${colors.reset}`);
      validation.errors.forEach((error) => {
        console.log(`     - ${error}`);
      });
    }

    console.log(""); // Empty line for readability

    return { passed: validation.valid, result, errors: validation.errors };
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(
      `${colors.red}❌${colors.reset} ${testCase.id}: "${testCase.goalTitle}" - ERROR`
    );
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);

    // Log error
    logInvocation({
      timestamp,
      input: testCase.goalTitle,
      rawLLMResponse: "ERROR",
      finalOutput: [],
      testCaseId: testCase.id,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      passed: false,
      result: null,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Main test function
 */
async function main() {
  console.log(
    `${colors.cyan}=== Stress Test Generator Test Suite ===${colors.reset}\n`
  );

  // Display current prompt (truncated)
  console.log(`${colors.blue}Current System Prompt (first 300 chars):${colors.reset}`);
  console.log(`${STRESS_TEST_GENERATOR_PROMPT.substring(0, 300)}...\n`);

  // Check for API key
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error(
      `${colors.red}Error: DEEPSEEK_API_KEY environment variable is not set${colors.reset}`
    );
    console.error(
      `Please set it in ${path.join(__dirname, "../.env.local")}`
    );
    process.exit(1);
  }

  // Load test cases
  const testCases = loadTestCases();
  console.log(
    `${colors.cyan}Running ${testCases.length} test cases...${colors.reset}\n`
  );

  // Initialize log file (append separator for this test run)
  if (fs.existsSync(LOG_FILE)) {
    fs.appendFileSync(
      LOG_FILE,
      `\n# Stress Test Generator test run started at ${new Date().toISOString()}\n`,
      "utf-8"
    );
  }

  // Run all test cases
  const results = [];
  for (const testCase of testCases) {
    const result = await runTestCase(testCase);
    results.push(result);
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  console.log(`\n${colors.cyan}=== Test Summary ===${colors.reset}`);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  console.log(
    `Total: ${results.length} | ${colors.green}Passed: ${passed}${colors.reset} | ${colors.red}Failed: ${failed}${colors.reset}`
  );

  // Show validation errors summary
  const allErrors = results
    .filter((r) => !r.passed && r.errors)
    .flatMap((r) => r.errors || []);
  if (allErrors.length > 0) {
    console.log(`\n${colors.yellow}Validation Issues Found:${colors.reset}`);
    const errorCounts: Record<string, number> = {};
    allErrors.forEach((error) => {
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`   ${error} (${count} times)`);
    });
  }

  console.log(`\nLog file: ${LOG_FILE}`);

  // Exit with error code if any tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
    process.exit(1);
  });
}
