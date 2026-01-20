#!/usr/bin/env node
/**
 * Classifier Test Script
 * 
 * Tests the classifier with various inputs and logs all LLM invocations.
 * 
 * Usage:
 *   cd project
 *   npm run test:classifier
 * 
 * Requires environment variables:
 *   DEEPSEEK_API_KEY
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { classifyInputCore } from "../lib/ai/classifier";
import { CLASSIFIER_SYSTEM_PROMPT } from "../lib/ai/prompts";

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
  finalOutput: "INCUBATOR" | "GATEKEEPER";
  testCaseId?: string;
  expected?: string;
  passed?: boolean;
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
};

/**
 * Load test cases from JSON file
 */
function loadTestCases() {
  const testCasesPath = path.join(
    __dirname,
    "test-cases/classifier.test-cases.json"
  );
  const content = fs.readFileSync(testCasesPath, "utf-8");
  const data = JSON.parse(content);
  return data.testCases;
}

/**
 * Run a single test case
 */
async function runTestCase(testCase: {
  id: string;
  input: string;
  expected: string;
  description: string;
}) {
  try {
    const { rawResponse, result } = await classifyInputCore(testCase.input);
    const passed = result === testCase.expected;
    const timestamp = new Date().toISOString();

    // Log the invocation
    logInvocation({
      timestamp,
      input: testCase.input,
      rawLLMResponse: rawResponse,
      finalOutput: result,
      testCaseId: testCase.id,
      expected: testCase.expected,
      passed,
    });

    // Display result
    const icon = passed ? "✅" : "❌";
    const color = passed ? colors.green : colors.red;
    console.log(
      `${color}${icon}${colors.reset} ${testCase.id}: "${testCase.input}"`
    );
    console.log(
      `   Expected: ${testCase.expected}, Got: ${result}, Raw: "${rawResponse}"`
    );
    if (!passed) {
      console.log(`   ${colors.yellow}Description: ${testCase.description}${colors.reset}`);
    }

    return { passed, result, expected: testCase.expected };
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(
      `${colors.red}❌${colors.reset} ${testCase.id}: "${testCase.input}" - ERROR`
    );
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);

    // Log error
    logInvocation({
      timestamp,
      input: testCase.input,
      rawLLMResponse: "ERROR",
      finalOutput: "INCUBATOR", // Default for error logging
      testCaseId: testCase.id,
      expected: testCase.expected,
      passed: false,
    });

    return { passed: false, result: null, expected: testCase.expected };
  }
}

/**
 * Main test function
 */
async function main() {
  console.log(`${colors.cyan}=== Classifier Test Suite ===${colors.reset}\n`);

  // Display current prompt
  console.log(`${colors.blue}Current System Prompt:${colors.reset}`);
  console.log(`${CLASSIFIER_SYSTEM_PROMPT.substring(0, 200)}...\n`);

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

  // Initialize log file (clear it for this run, or append if you want history)
  // For append-only, comment out the next line
  if (fs.existsSync(LOG_FILE)) {
    // Append a separator for this test run
    fs.appendFileSync(
      LOG_FILE,
      `\n# Test run started at ${new Date().toISOString()}\n`,
      "utf-8"
    );
  }

  // Run all test cases
  const results = [];
  for (const testCase of testCases) {
    const result = await runTestCase(testCase);
    results.push(result);
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Summary
  console.log(`\n${colors.cyan}=== Test Summary ===${colors.reset}`);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  console.log(
    `Total: ${results.length} | ${colors.green}Passed: ${passed}${colors.reset} | ${colors.red}Failed: ${failed}${colors.reset}`
  );
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
