import { REQUIRED_CREDENTIALS } from './lib/constants.js';
import { findProjectRoot, runNpmCommand } from './lib/project.js';
import { MissingCredentialsError } from './lib/errors.js';

export interface SmokeTestResult {
  success: boolean;
  startgg: { passed: boolean; error?: string };
  discord: { passed: boolean; error?: string };
}

// Check if credentials exist
function hasCredentials(credentials: string[]): boolean {
  return credentials.every(key => !!process.env[key]);
}

// Run smoke tests
export async function runSmokeTests(): Promise<SmokeTestResult> {
  console.log('🔥 Running smoke tests against real APIs...\n');

  const result: SmokeTestResult = {
    success: false,
    startgg: { passed: false },
    discord: { passed: false },
  };

  // Check Start.gg credentials
  const startggRequired = [...REQUIRED_CREDENTIALS['smoke']].filter(
    k => k.includes('STARTGG')
  );
  const hasStartggCreds = hasCredentials(startggRequired);

  if (!hasStartggCreds) {
    console.log('⚠️  Skipping Start.gg smoke tests - credentials not found');
    console.log(`   Required: ${startggRequired.join(', ')}`);
    result.startgg.passed = true; // Skip is considered pass
  } else {
    console.log('▶ Running Start.gg smoke tests...');
    try {
      const exitCode = await runNpmCommand('test:smoke');
      result.startgg.passed = exitCode === 0;
      if (exitCode === 0) {
        console.log('✅ Start.gg smoke tests passed\n');
      } else {
        console.log('❌ Start.gg smoke tests failed\n');
        result.startgg.error = `Exit code: ${exitCode}`;
      }
    } catch (error) {
      result.startgg.error = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ Start.gg smoke tests error: ${result.startgg.error}\n`);
    }
  }

  // Check Discord credentials
  const discordRequired = [...REQUIRED_CREDENTIALS['smoke']].filter(
    k => k.includes('DISCORD')
  );
  const hasDiscordCreds = hasCredentials(discordRequired);

  if (!hasDiscordCreds) {
    console.log('⚠️  Skipping Discord smoke tests - credentials not found');
    console.log(`   Required: ${discordRequired.join(', ')}`);
    result.discord.passed = true; // Skip is considered pass
  } else {
    console.log('▶ Running Discord smoke tests...');
    try {
      const exitCode = await runNpmCommand('test:smoke');
      result.discord.passed = exitCode === 0;
      if (exitCode === 0) {
        console.log('✅ Discord smoke tests passed\n');
      } else {
        console.log('❌ Discord smoke tests failed\n');
        result.discord.error = `Exit code: ${exitCode}`;
      }
    } catch (error) {
      result.discord.error = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ Discord smoke tests error: ${result.discord.error}\n`);
    }
  }

  // Overall success
  result.success = result.startgg.passed && result.discord.passed;

  return result;
}
