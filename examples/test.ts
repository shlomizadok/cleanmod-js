/**
 * Simple test script for @cleanmod/js SDK
 *
 * Usage (from root):
 *   CLEANMOD_API_KEY=your_key_here pnpm tsx packages/sdk-js/examples/test.ts
 *
 * Or from packages/sdk-js:
 *   CLEANMOD_API_KEY=your_key_here pnpm tsx examples/test.ts
 */

import { createCleanModClient } from "@cleanmod/js";

async function main() {
  const apiKey = process.env.CLEANMOD_API_KEY;

  if (!apiKey) {
    console.error("Error: CLEANMOD_API_KEY environment variable is required");
    process.exit(1);
  }

  const client = createCleanModClient({
    apiKey,
    // baseUrl: "http://localhost:3000", // uncomment for local testing
  });

  const testTexts = [
    "you are an idiot",
    "Hello, how are you today?",
    "This is a test message",
  ];

  console.log("Testing CleanMod SDK...\n");

  // Test 1: Basic moderation (uses org default mode)
  console.log("=== Test 1: Basic moderation (org default mode) ===\n");
  for (const text of testTexts) {
    try {
      console.log(`Moderating: "${text}"`);
      const result = await client.moderate({ text });

      console.log(`  Decision: ${result.decision}`);
      console.log(`  Overall Score: ${result.overallScore}`);
      console.log(`  Mode: ${result.mode || "default"}`);
      console.log(
        `  Thresholds: flag=${result.thresholds.flag}, block=${result.thresholds.block}`
      );
      console.log(`  Categories:`, result.categories);
      console.log(`  ID: ${result.id}`);
      console.log();
    } catch (error: any) {
      console.error(`  Error: ${error.message}`);
      console.log();
    }
  }

  // Test 2 & 3: Strict and Lenient modes
  const textForModeTests = "you are an idiot";
  for (const mode of ["strict", "lenient"] as const) {
    console.log(`\n=== Test for ${mode} mode ===\n`);
    try {
      console.log(`Moderating with ${mode} mode: "${textForModeTests}"`);
      const result = await client.moderate({ text: textForModeTests, mode });

      console.log(`  Decision: ${result.decision}`);
      console.log(`  Overall Score: ${result.overallScore}`);
      console.log(`  Mode: ${result.mode}`);
      console.log(
        `  Thresholds: flag=${result.thresholds.flag}, block=${result.thresholds.block}`
      );
      console.log(`  Categories:`, result.categories);
      console.log(`  ID: ${result.id}`);
      console.log();
    } catch (error: any) {
      console.error(`  Error: ${error.message}`);
      console.log();
    }
  }

  console.log("Test completed!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
