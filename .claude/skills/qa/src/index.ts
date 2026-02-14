#!/usr/bin/env node

import { runTestsCommand } from './run-tests.js';
import { generateMocksCommand } from './generate-mocks.js';
import { runSmokeCommand } from './run-smoke.js';

// Main CLI
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'run-tests':
      await runTestsCommand();
      break;
    case 'generate-mocks':
      await generateMocksCommand();
      break;
    case 'smoke':
      await runSmokeCommand();
      break;
    default:
      console.log('QA Skill Commands:');
      console.log('  run-tests      - Run full test suite in Docker');
      console.log('  generate-mocks - Generate MSW handlers from Start.gg API');
      console.log('  smoke          - Run smoke tests against real APIs');
      console.log('\nUsage:');
      console.log('  ./src/index.ts run-tests');
      console.log('  ./src/index.ts generate-mocks');
      console.log('  ./src/index.ts smoke');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
