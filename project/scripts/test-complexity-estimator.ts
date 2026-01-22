#!/usr/bin/env node
/**
 * Complexity Estimator Test Script
 * 
 * Tests the complexity estimator with various goal titles and scopes, and logs all LLM invocations.
 * 
 * Usage:
 *   cd project
 *   npm run test:complexity-estimator
 * 
 * Requires environment variables:
 *   DEEPSEEK_API_KEY
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { estimateComplexityCore } from "../lib/ai/complexity-estimator";
import { COMPLEXITY_ESTIMATOR_PROMPT } from "../lib/ai/prompts";
import type { Scope } from "@/types/volition";

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
  input: {
    goalTitle: string;
    scope: Scope;
  };
  rawLLMResponse: string;
  finalOutput: {
    size: string;
    estimated_total_hours: number;
    projected_end_date: string;
  };
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
    "test-cases/complexity-estimator.test-cases.json"
  );
  const content = fs.readFileSync(testCasesPath, "utf-8");
  const data = JSON.parse(content);
  return data.testCases;
}

/**
 * Validate the complexity estimation result
 */
function validateComplexity(
  result: {
    size: string;
    estimated_total_hours: number;
    projected_end_date: string;
  },
  testCase: {
    expectedSize?: string;
    expectedMinHours?: number;
    expectedMaxHours?: number;
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that all required fields are present
  if (!result.size || typeof result.size !== "string") {
    errors.push("Missing or invalid size field");
  }

  if (
    typeof result.estimated_total_hours !== "number" ||
    result.estimated_total_hours <= 0 ||
    !Number.isFinite(result.estimated_total_hours)
  ) {
    errors.push(
      `Invalid estimated_total_hours: ${result.estimated_total_hours} (must be a positive finite number)`
    );
  }

  if (!result.projected_end_date || typeof result.projected_end_date !== "string") {
    errors.push("Missing or invalid projected_end_date field");
  }

  // Validate size enum
  const validSizes = ["SMALL", "MEDIUM", "LARGE"];
  if (!validSizes.includes(result.size)) {
    errors.push(
      `Invalid size: ${result.size} (must be one of: ${validSizes.join(", ")})`
    );
  }

  // Validate size logic based on hours
  if (result.estimated_total_hours > 100 && result.size !== "LARGE") {
    errors.push(
      `Size logic violation: estimated_total_hours (${result.estimated_total_hours}) > 100 but size is ${result.size} (should be LARGE)`
    );
  } else if (
    result.estimated_total_hours >= 20 &&
    result.estimated_total_hours <= 100 &&
    result.size !== "MEDIUM"
  ) {
    errors.push(
      `Size logic violation: estimated_total_hours (${result.estimated_total_hours}) is 20-100 but size is ${result.size} (should be MEDIUM)`
    );
  } else if (
    result.estimated_total_hours < 20 &&
    result.size !== "SMALL"
  ) {
    errors.push(
      `Size logic violation: estimated_total_hours (${result.estimated_total_hours}) < 20 but size is ${result.size} (should be SMALL)`
    );
  }

  // Validate projected_end_date format (should be ISO date string)
  try {
    const date = new Date(result.projected_end_date);
    if (isNaN(date.getTime())) {
      errors.push(
        `Invalid projected_end_date format: ${result.projected_end_date} (not a valid date)`
      );
    }
  } catch {
    errors.push(
      `Invalid projected_end_date format: ${result.projected_end_date}`
    );
  }

  // Check against test case expectations
  if (testCase.expectedSize && result.size !== testCase.expectedSize) {
    errors.push(
      `Expected size ${testCase.expectedSize} but got ${result.size}`
    );
  }

  if (
    testCase.expectedMinHours !== undefined &&
    result.estimated_total_hours < testCase.expectedMinHours
  ) {
    errors.push(
      `Expected at least ${testCase.expectedMinHours} hours but got ${result.estimated_total_hours}`
    );
  }

  if (
    testCase.expectedMaxHours !== undefined &&
    result.estimated_total_hours > testCase.expectedMaxHours
  ) {
    errors.push(
      `Expected at most ${testCase.expectedMaxHours} hours but got ${result.estimated_total_hours}`
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
  scope: Scope;
  expectedSize?: string;
  expectedMinHours?: number;
  expectedMaxHours?: number;
}) {
  try {
    const { rawResponse, result } = await estimateComplexityCore(
      testCase.goalTitle,
      testCase.scope
    );
    const validation = validateComplexity(result, testCase);
    const timestamp = new Date().toISOString();

    // Log the invocation
    logInvocation({
      timestamp,
      input: {
        goalTitle: testCase.goalTitle,
        scope: testCase.scope,
      },
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
    console.log(
      `   ${colors.blue}Size: ${result.size} | Hours: ${result.estimated_total_hours} | Date: ${result.projected_end_date}${colors.reset}`
    );

    // Display raw response (truncated if too long)
    console.log(`\n   ${colors.cyan}Raw LLM Response:${colors.reset}`);
    const truncatedResponse =
      rawResponse.length > 500
        ? rawResponse.substring(0, 500) + "... (truncated)"
        : rawResponse;
    console.log(`   ${truncatedResponse}`);

    // Display validation details
    if (validation.valid) {
      console.log(`\n   ${colors.green}✓ Validation passed${colors.reset}`);
    } else {
      console.log(`\n   ${colors.red}Validation Errors:${colors.reset}`);
      validation.errors.forEach((error) => {
        console.log(`     - ${error}`);
      });
    }

    // Display size logic verification
    console.log(`\n   ${colors.magenta}Size Logic Verification:${colors.reset}`);
    if (result.estimated_total_hours > 100) {
      console.log(
        `     Hours (${result.estimated_total_hours}) > 100 → Size should be LARGE: ${
          result.size === "LARGE" ? colors.green + "✓" : colors.red + "✗"
        }${colors.reset}`
      );
    } else if (result.estimated_total_hours >= 20) {
      console.log(
        `     Hours (${result.estimated_total_hours}) is 20-100 → Size should be MEDIUM: ${
          result.size === "MEDIUM" ? colors.green + "✓" : colors.red + "✗"
        }${colors.reset}`
      );
    } else {
      console.log(
        `     Hours (${result.estimated_total_hours}) < 20 → Size should be SMALL: ${
          result.size === "SMALL" ? colors.green + "✓" : colors.red + "✗"
        }${colors.reset}`
      );
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
      input: {
        goalTitle: testCase.goalTitle,
        scope: testCase.scope,
      },
      rawLLMResponse: "ERROR",
      finalOutput: {
        size: "UNKNOWN",
        estimated_total_hours: 0,
        projected_end_date: "",
      },
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
    `${colors.cyan}=== Complexity Estimator Test Suite ===${colors.reset}\n`
  );

  // Display current prompt (truncated)
  console.log(
    `${colors.blue}Current System Prompt (first 300 chars):${colors.reset}`
  );
  console.log(`${COMPLEXITY_ESTIMATOR_PROMPT.substring(0, 300)}...\n`);

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
      `\n# Complexity Estimator test run started at ${new Date().toISOString()}\n`,
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

  // Show size distribution
  const sizeCounts: Record<string, number> = {};
  const hourRanges: Record<string, number> = {
    "0-20": 0,
    "20-100": 0,
    "100+": 0,
  };
  results.forEach((r) => {
    if (r.result) {
      const size = r.result.size;
      sizeCounts[size] = (sizeCounts[size] || 0) + 1;

      const hours = r.result.estimated_total_hours;
      if (hours < 20) {
        hourRanges["0-20"]++;
      } else if (hours <= 100) {
        hourRanges["20-100"]++;
      } else {
        hourRanges["100+"]++;
      }
    }
  });
  if (Object.keys(sizeCounts).length > 0) {
    console.log(`\n${colors.blue}Size Distribution:${colors.reset}`);
    Object.entries(sizeCounts)
      .sort(([a], [b]) => {
        const order = { SMALL: 1, MEDIUM: 2, LARGE: 3 };
        return (order[a as keyof typeof order] || 0) - (order[b as keyof typeof order] || 0);
      })
      .forEach(([size, count]) => {
        console.log(`   ${size}: ${count} test case(s)`);
      });
  }
  if (Object.values(hourRanges).some((count) => count > 0)) {
    console.log(`\n${colors.blue}Hour Range Distribution:${colors.reset}`);
    Object.entries(hourRanges).forEach(([range, count]) => {
      if (count > 0) {
        console.log(`   ${range} hours: ${count} test case(s)`);
      }
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
