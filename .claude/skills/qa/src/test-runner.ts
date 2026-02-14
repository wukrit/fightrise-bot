import { NPM_COMMANDS } from './lib/constants.js';
import { findProjectRoot, runNpmCommand } from './lib/project.js';
import { TestExecutionError } from './lib/errors.js';

export interface LayerResult {
  layer: string;
  passed: boolean;
  exitCode: number;
  duration: number;
}

export interface TestRunResult {
  success: boolean;
  layers: LayerResult[];
}

// Map command to test layer
function getLayerFromCommand(command: string): string {
  const map: Record<string, string> = {
    [NPM_COMMANDS.DOCKER_TEST]: 'unit',
    [NPM_COMMANDS.DOCKER_TEST_INTEGRATION]: 'integration',
    [NPM_COMMANDS.DOCKER_TEST_E2E]: 'e2e',
    [NPM_COMMANDS.DOCKER_LINT]: 'lint',
  };
  return map[command] || 'unit';
}

// Run all test layers
export async function runTestSuite(): Promise<TestRunResult> {
  const layers: LayerResult[] = [];

  // Commands to run in order
  const setupCommands = [
    NPM_COMMANDS.DOCKER_INFRA,
    NPM_COMMANDS.DOCKER_DB_PUSH,
  ];

  // Note: E2E tests are excluded by default as they require:
  // - Running web server (USE_EXISTING_SERVER=true)
  // - Playwright browsers installed
  // - Additional infrastructure setup
  // Run them separately with: npm run docker:test:e2e
  const testCommands = [
    NPM_COMMANDS.DOCKER_TEST,
    NPM_COMMANDS.DOCKER_TEST_INTEGRATION,
    NPM_COMMANDS.DOCKER_LINT,
  ];

  console.log('🔧 Setting up test infrastructure...\n');

  // Run setup commands
  for (const cmd of setupCommands) {
    console.log(`▶ npm run ${cmd}`);
    const startTime = Date.now();
    const exitCode = await runNpmCommand(cmd);
    const duration = Date.now() - startTime;

    if (exitCode !== 0) {
      throw new TestExecutionError(cmd, exitCode);
    }
    console.log(`✅ Completed in ${duration}ms\n`);
  }

  console.log('🧪 Running tests...\n');
  console.log('📝 Note: E2E tests are skipped. Run separately with: npm run docker:test:e2e\n');

  // Run test commands
  for (const cmd of testCommands) {
    console.log(`▶ npm run ${cmd}`);
    const startTime = Date.now();
    const exitCode = await runNpmCommand(cmd);
    const duration = Date.now() - startTime;

    const layer = getLayerFromCommand(cmd);
    const passed = exitCode === 0;

    layers.push({
      layer,
      passed,
      exitCode,
      duration,
    });

    if (passed) {
      console.log(`✅ ${layer} tests passed in ${duration}ms\n`);
    } else {
      console.log(`❌ ${layer} tests failed in ${duration}ms\n`);
      throw new TestExecutionError(cmd, exitCode);
    }
  }

  return {
    success: true,
    layers,
  };
}
