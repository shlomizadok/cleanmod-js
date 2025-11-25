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

  for (const text of testTexts) {
    try {
      console.log(`Moderating: "${text}"`);
      const result = await client.moderate({ text });

      console.log(`  Decision: ${result.decision}`);
      console.log(`  Overall Score: ${result.overall_score}`);
      console.log(`  Categories:`, result.categories);
      console.log(`  ID: ${result.id}`);
      console.log(`  Created: ${result.created_at}`);
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
