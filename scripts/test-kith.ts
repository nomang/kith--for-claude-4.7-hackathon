#!/usr/bin/env tsx
/**
 * CLI smoke test: npx tsx scripts/test-kith.ts "your utterance here"
 * Or run with no args to use the default test utterance.
 */

import 'dotenv/config';
import { chat } from '../src/services/safeConversation';

async function main() {
  const utterance = process.argv[2] ?? "Hello, who am I speaking with?";
  console.log(`\nMaggie: "${utterance}"\n`);

  const response = await chat(utterance, []);

  console.log(`Kith: "${response.spoken_response}"\n`);
  console.log(`Observation: ${response.observation}`);
  if (response.risk_flag) {
    console.log('⚠️  RISK FLAG raised');
  }
  if (Object.keys(response.notebook_updates).length > 0) {
    console.log('Notebook updates:', response.notebook_updates);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
