import { generateMocks } from './mock-generator.js';

export async function generateMocksCommand(): Promise<void> {
  try {
    await generateMocks();
    console.log('\n✅ Mock generation complete!');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ ${error.message}`);
    }
    process.exit(1);
  }
}
