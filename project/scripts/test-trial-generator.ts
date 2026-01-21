#!/usr/bin/env node
/**
 * Trial Generator Test Script
 * 
 * Tests the trial generator with various goal titles and logs all LLM invocations.
 * 
 * Usage:
 *   cd project
 *   npm run test:trial-generator
 * 
 * Requires environment variables:
 *   DEEPSEEK_API_KEY
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { generateTrialPlanCore } from "../lib/ai/trial-generator";
import { TRIAL_GENERATOR_PROMPT } from "../lib/ai/prompts";

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
    day_number: number;
    task_title: string;
    est_minutes: number;
    acceptance_criteria: string;
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
    "test-cases/trial-generator.test-cases.json"
  );
  const content = fs.readFileSync(testCasesPath, "utf-8");
  const data = JSON.parse(content);
  return data.testCases;
}

/**
 * Validate the generated trial plan
 */
function validateTrialPlan(
  tasks: Array<{
    day_number: number;
    task_title: string;
    est_minutes: number;
    acceptance_criteria: string;
  }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check task count (3-7)
  if (tasks.length < 3) {
    errors.push(`Expected at least 3 tasks, got ${tasks.length}`);
  }
  if (tasks.length > 7) {
    errors.push(`Expected at most 7 tasks, got ${tasks.length}`);
  }

  // Check that all tasks have required fields
  tasks.forEach((task, index) => {
    if (!task.task_title || task.task_title.trim().length === 0) {
      errors.push(`Task ${index + 1} has empty task_title`);
    }
    if (task.day_number < 1 || task.day_number > 7) {
      errors.push(
        `Task ${index + 1} has invalid day_number: ${task.day_number} (must be 1-7)`
      );
    }
    if (task.est_minutes < 1 || task.est_minutes >= 20) {
      errors.push(
        `Task ${index + 1} has invalid est_minutes: ${task.est_minutes} (must be 1-19)`
      );
    }
    if (!task.acceptance_criteria || task.acceptance_criteria.trim().length === 0) {
      errors.push(`Task ${index + 1} has empty acceptance_criteria`);
    }
  });

  // Check that day_numbers are sequential starting from 1
  const dayNumbers = tasks.map((t) => t.day_number).sort((a, b) => a - b);
  const expectedDays = Array.from({ length: tasks.length }, (_, i) => i + 1);
  if (JSON.stringify(dayNumbers) !== JSON.stringify(expectedDays)) {
    errors.push(
      `Day numbers must be sequential starting from 1. Got: [${dayNumbers.join(", ")}], expected: [${expectedDays.join(", ")}]`
    );
  }

  // Check for duplicate day numbers
  const dayNumberSet = new Set(tasks.map((t) => t.day_number));
  if (dayNumberSet.size !== tasks.length) {
    errors.push("Duplicate day numbers found");
  }

  // Check that tasks are executable (not vague)
  const vaguePhrases = [
    "research",
    "think about",
    "consider",
    "plan",
    "brainstorm",
    "explore",
    "look into",
    "figure out",
  ];
  let vagueCount = 0;
  tasks.forEach((task) => {
    const lowerTitle = task.task_title.toLowerCase();
    if (vaguePhrases.some((phrase) => lowerTitle.includes(phrase))) {
      vagueCount++;
    }
  });

  // Allow some vague tasks, but flag if too many
  if (vagueCount > tasks.length / 2) {
    errors.push(
      `Warning: ${vagueCount} tasks contain vague phrases - tasks may not be executable enough`
    );
  }

  // Check that tasks are specific to the goal (not generic)
  const genericPhrases = [
    "work on your goal",
    "do something",
    "make progress",
    "take action",
  ];
  let genericCount = 0;
  tasks.forEach((task) => {
    const lowerTitle = task.task_title.toLowerCase();
    if (genericPhrases.some((phrase) => lowerTitle.includes(phrase))) {
      genericCount++;
    }
  });

  if (genericCount > 0) {
    errors.push(
      `Warning: ${genericCount} tasks contain generic phrases - tasks may not be specific enough`
    );
  }

  // Check that acceptance criteria are specific and measurable
  const vagueCriteriaPhrases = [
    "done",
    "complete",
    "finished",
    "working",
    "set up",
  ];
  let vagueCriteriaCount = 0;
  tasks.forEach((task, index) => {
    const lowerCriteria = task.acceptance_criteria.toLowerCase();
    // Check if criteria is too short (likely vague)
    if (task.acceptance_criteria.length < 20) {
      vagueCriteriaCount++;
      errors.push(
        `Warning: Task ${index + 1} acceptance criteria is too short (${task.acceptance_criteria.length} chars) - may not be specific enough`
      );
    }
    // Check for vague phrases without context
    if (
      vagueCriteriaPhrases.some(
        (phrase) =>
          lowerCriteria.includes(phrase) &&
          task.acceptance_criteria.length < 50
      )
    ) {
      vagueCriteriaCount++;
    }
  });

  if (vagueCriteriaCount > tasks.length / 2) {
    errors.push(
      `Warning: ${vagueCriteriaCount} acceptance criteria may be too vague - criteria should be specific and measurable`
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
    const { rawResponse, result } = await generateTrialPlanCore(
      testCase.goalTitle
    );
    const validation = validateTrialPlan(result);
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
    console.log(`   ${colors.blue}Generated ${result.length} tasks${colors.reset}`);

    // Display tasks
    console.log(`\n   ${colors.magenta}Generated Tasks:${colors.reset}`);
    result.forEach((task) => {
      console.log(
        `     Day ${task.day_number}: ${task.task_title} (${task.est_minutes} min)`
      );
      console.log(`       Acceptance Criteria: ${task.acceptance_criteria}`);
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
    `${colors.cyan}=== Trial Generator Test Suite ===${colors.reset}\n`
  );

  // Display current prompt (truncated)
  console.log(`${colors.blue}Current System Prompt (first 300 chars):${colors.reset}`);
  console.log(`${TRIAL_GENERATOR_PROMPT.substring(0, 300)}...\n`);

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
      `\n# Trial Generator test run started at ${new Date().toISOString()}\n`,
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

  // Show task count distribution
  const taskCounts: Record<number, number> = {};
  results.forEach((r) => {
    if (r.result) {
      const count = r.result.length;
      taskCounts[count] = (taskCounts[count] || 0) + 1;
    }
  });
  if (Object.keys(taskCounts).length > 0) {
    console.log(`\n${colors.blue}Task Count Distribution:${colors.reset}`);
    Object.entries(taskCounts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([count, frequency]) => {
        console.log(`   ${count} tasks: ${frequency} test case(s)`);
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
