import { runSmokeTests } from './smoke-runner.js';

export async function runSmokeCommand(): Promise<void> {
  console.log('🔥 Running smoke tests...\n');

  try {
    const result = await runSmokeTests();

    if (result.success) {
      console.log('\n========================================');
      console.log('✅ All smoke tests passed!');
      console.log('========================================\n');
    } else {
      console.log('\n========================================');
      console.log('❌ Some smoke tests failed');
      console.log('========================================\n');

      if (!result.startgg.passed) {
        console.log(`   Start.gg: ${result.startgg.error || 'failed'}`);
      }
      if (!result.discord.passed) {
        console.log(`   Discord: ${result.discord.error || 'failed'}`);
      }

      process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ ${error.message}`);
    }
    process.exit(1);
  }
}
