#!/usr/bin/env node
/**
 * Blueprint Generator Test Script
 * 
 * Tests the blueprint generator with various goal titles, complexities, and scopes, and logs all LLM invocations.
 * 
 * Usage:
 *   cd project
 *   npm run test:blueprint-generator
 * 
 * Requires environment variables:
 *   DEEPSEEK_API_KEY
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { generateBlueprintCore } from "../lib/ai/blueprint-generator";
import { BLUEPRINT_GENERATOR_PROMPT } from "../lib/ai/prompts";
import type { BlueprintResponse } from "../lib/ai/schemas";
import type { Complexity, Scope } from "@/types/volition";

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
    complexity: Complexity;
    scope: Scope;
  };
  rawLLMResponse: string;
  finalOutput: BlueprintResponse;
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
    "test-cases/blueprint-generator.test-cases.json"
  );
  const content = fs.readFileSync(testCasesPath, "utf-8");
  const data = JSON.parse(content);
  return data.testCases;
}

/**
 * Validate the blueprint generation result
 */
function validateBlueprint(
  result: BlueprintResponse,
  testCase: {
    expectedMinPhases?: number;
    expectedMaxPhases?: number;
    expectedComplexitySize?: string;
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that result is an array
  if (!Array.isArray(result)) {
    errors.push("Result must be an array of phases");
    return { valid: false, errors };
  }

  if (result.length === 0) {
    errors.push("Blueprint must have at least 1 phase");
  }

  // Validate each phase
  result.forEach((phase, phaseIndex) => {
    // Check phase title
    if (!phase.title || typeof phase.title !== "string" || phase.title.trim() === "") {
      errors.push(`Phase ${phaseIndex + 1}: Missing or empty title`);
    }

    // Check milestones array
    if (!phase.milestones || !Array.isArray(phase.milestones)) {
      errors.push(`Phase ${phaseIndex + 1} ("${phase.title}"): Missing or invalid milestones array`);
      return;
    }

    // Miller's Law: max 7 milestones per phase
    if (phase.milestones.length > 7) {
      errors.push(
        `Phase ${phaseIndex + 1} ("${phase.title}") violates Miller's Law: has ${phase.milestones.length} milestones (max 7)`
      );
    }

    if (phase.milestones.length === 0) {
      errors.push(`Phase ${phaseIndex + 1} ("${phase.title}"): Must have at least 1 milestone`);
    }

    // Validate each milestone
    phase.milestones.forEach((milestone, milestoneIndex) => {
      if (!milestone.title || typeof milestone.title !== "string" || milestone.title.trim() === "") {
        errors.push(
          `Phase ${phaseIndex + 1} ("${phase.title}"), Milestone ${milestoneIndex + 1}: Missing or empty title`
        );
      }
      
      // Validate acceptance_criteria
      if (!milestone.acceptance_criteria || typeof milestone.acceptance_criteria !== "string" || milestone.acceptance_criteria.trim() === "") {
        errors.push(
          `Phase ${phaseIndex + 1} ("${phase.title}"), Milestone ${milestoneIndex + 1} ("${milestone.title}"): Missing or empty acceptance_criteria`
        );
      }
    });
  });

  // Check against test case expectations
  if (testCase.expectedMinPhases !== undefined && result.length < testCase.expectedMinPhases) {
    errors.push(
      `Expected at least ${testCase.expectedMinPhases} phase(s) but got ${result.length}`
    );
  }

  if (testCase.expectedMaxPhases !== undefined && result.length > testCase.expectedMaxPhases) {
    errors.push(
      `Expected at most ${testCase.expectedMaxPhases} phase(s) but got ${result.length}`
    );
  }

  // Validate structure based on complexity size
  if (testCase.expectedComplexitySize) {
    const totalMilestones = result.reduce((sum, phase) => sum + phase.milestones.length, 0);
    
    if (testCase.expectedComplexitySize === "SMALL") {
      // SMALL goals should typically have 1 phase (linear structure)
      if (result.length > 2) {
        errors.push(
          `SMALL goal should have 1-2 phases (linear structure), but got ${result.length}`
        );
      }
    } else if (testCase.expectedComplexitySize === "MEDIUM") {
      // MEDIUM goals should have 1-2 phases (functional structure)
      if (result.length > 3) {
        errors.push(
          `MEDIUM goal should have 1-3 phases (functional structure), but got ${result.length}`
        );
      }
    } else if (testCase.expectedComplexitySize === "LARGE") {
      // LARGE goals should have multiple phases (phased structure)
      if (result.length < 2) {
        errors.push(
          `LARGE goal should have multiple phases (phased structure), but got ${result.length}`
        );
      }
    }
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
  complexity: Complexity;
  scope: Scope;
  expectedMinPhases?: number;
  expectedMaxPhases?: number;
  expectedComplexitySize?: string;
}) {
  try {
    const { rawResponse, result } = await generateBlueprintCore(
      testCase.goalTitle,
      testCase.complexity,
      testCase.scope
    );
    const validation = validateBlueprint(result, testCase);
    const timestamp = new Date().toISOString();

    // Log the invocation
    logInvocation({
      timestamp,
      input: {
        goalTitle: testCase.goalTitle,
        complexity: testCase.complexity,
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
      `   ${colors.blue}Complexity: ${testCase.complexity.size} (${testCase.complexity.estimated_total_hours}h)${colors.reset}`
    );
    console.log(
      `   ${colors.blue}Phases: ${result.length} | Total Milestones: ${result.reduce((sum, p) => sum + p.milestones.length, 0)}${colors.reset}`
    );

    // Display structure
    console.log(`\n   ${colors.cyan}Blueprint Structure:${colors.reset}`);
    result.forEach((phase, phaseIndex) => {
      console.log(
        `   ${colors.magenta}Phase ${phaseIndex + 1}: "${phase.title}" (${phase.milestones.length} milestone(s))${colors.reset}`
      );
      phase.milestones.forEach((milestone, milestoneIndex) => {
        console.log(
          `      ${colors.yellow}${milestoneIndex + 1}. ${milestone.title}${colors.reset}`
        );
        if (milestone.acceptance_criteria) {
          const truncatedCriteria = milestone.acceptance_criteria.length > 100
            ? milestone.acceptance_criteria.substring(0, 100) + "..."
            : milestone.acceptance_criteria;
          console.log(
            `         ${colors.cyan}Criteria: ${truncatedCriteria}${colors.reset}`
          );
        }
      });
    });

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

    // Display Miller's Law verification
    console.log(`\n   ${colors.magenta}Miller's Law Verification:${colors.reset}`);
    let millersLawViolations = 0;
    result.forEach((phase, phaseIndex) => {
      const compliant = phase.milestones.length <= 7;
      if (!compliant) {
        millersLawViolations++;
      }
      console.log(
        `     Phase ${phaseIndex + 1} ("${phase.title}"): ${phase.milestones.length} milestone(s) ${
          compliant ? colors.green + "✓" : colors.red + "✗ (VIOLATION)"
        }${colors.reset}`
      );
    });
    if (millersLawViolations === 0) {
      console.log(`     ${colors.green}✓ All phases comply with Miller's Law (max 7 milestones)${colors.reset}`);
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
        complexity: testCase.complexity,
        scope: testCase.scope,
      },
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
    `${colors.cyan}=== Blueprint Generator Test Suite ===${colors.reset}\n`
  );

  // Display current prompt (truncated)
  console.log(
    `${colors.blue}Current System Prompt (first 300 chars):${colors.reset}`
  );
  console.log(`${BLUEPRINT_GENERATOR_PROMPT.substring(0, 300)}...\n`);

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
      `\n# Blueprint Generator test run started at ${new Date().toISOString()}\n`,
      "utf-8"
    );
  }

  // Run all test cases
  const results = [];
  for (const testCase of testCases) {
    const result = await runTestCase(testCase);
    results.push(result);
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
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

  // Show structure distribution
  const phaseCounts: Record<string, number> = {};
  const milestoneCounts: Record<string, number> = {};
  const complexityDistribution: Record<string, number> = {};
  
  results.forEach((r) => {
    if (r.result) {
      const phaseCount = r.result.length;
      phaseCounts[phaseCount] = (phaseCounts[phaseCount] || 0) + 1;
      
      const totalMilestones = r.result.reduce((sum, p) => sum + p.milestones.length, 0);
      milestoneCounts[totalMilestones] = (milestoneCounts[totalMilestones] || 0) + 1;
    }
  });

  // Get complexity sizes from test cases
  testCases.forEach((tc: { complexity: { size: string } }) => {
    const size = tc.complexity.size;
    complexityDistribution[size] = (complexityDistribution[size] || 0) + 1;
  });

  if (Object.keys(phaseCounts).length > 0) {
    console.log(`\n${colors.blue}Phase Count Distribution:${colors.reset}`);
    Object.entries(phaseCounts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([count, occurrences]) => {
        console.log(`   ${count} phase(s): ${occurrences} test case(s)`);
      });
  }

  if (Object.keys(complexityDistribution).length > 0) {
    console.log(`\n${colors.blue}Complexity Size Distribution:${colors.reset}`);
    Object.entries(complexityDistribution)
      .sort(([a], [b]) => {
        const order = { SMALL: 1, MEDIUM: 2, LARGE: 3 };
        return (order[a as keyof typeof order] || 0) - (order[b as keyof typeof order] || 0);
      })
      .forEach(([size, count]) => {
        console.log(`   ${size}: ${count} test case(s)`);
      });
  }

  // Check Miller's Law compliance across all results
  let totalMillersLawViolations = 0;
  results.forEach((r) => {
    if (r.result) {
      r.result.forEach((phase) => {
        if (phase.milestones.length > 7) {
          totalMillersLawViolations++;
        }
      });
    }
  });

  if (totalMillersLawViolations === 0) {
    console.log(`\n${colors.green}✓ All test cases comply with Miller's Law${colors.reset}`);
  } else {
    console.log(
      `\n${colors.red}✗ Found ${totalMillersLawViolations} Miller's Law violation(s)${colors.reset}`
    );
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
