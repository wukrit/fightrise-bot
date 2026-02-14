import type { TestLayer } from '../lib/constants.js';

// Result types
export interface CommandResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  duration?: number;
}

export interface TestRunResult {
  success: boolean;
  layers: LayerResult[];
}

export interface LayerResult {
  layer: TestLayer;
  passed: number;
  failed: number;
  duration: number;
}

export interface MockGeneratorOptions {
  queries: string[];
  dryRun?: boolean;
}

export interface MockGenerationResult {
  success: boolean;
  handlersGenerated: number;
  stagingPath: string;
}

export interface SmokeTestResult {
  success: boolean;
  startggPassed: boolean;
  discordPassed: boolean;
  errors: string[];
}
