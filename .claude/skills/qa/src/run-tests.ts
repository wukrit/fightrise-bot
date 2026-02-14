import { runTestSuite } from './test-runner.js';

export async function runTestsCommand(): Promise<void> {
  console.log('🧪 Running test suite...\n');

  try {
    const result = await runTestSuite();

    console.log('\n========================================');
    console.log('✅ All tests passed!');
    console.log('========================================\n');

    console.log('Summary:');
    for (const layer of result.layers) {
      console.log(`  ${layer.layer}: ${layer.duration}ms`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ ${error.message}`);
    }
    process.exit(1);
  }
}
