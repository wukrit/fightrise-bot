export type LoadTestScenario =
  | 'baseline'
  | 'smallScale'
  | 'mediumScale'
  | 'highScale'
  | 'burst'
  | 'concurrency'
  | 'rateLimit';

export interface LoadTestConfig {
  scenario: LoadTestScenario;
  tournamentCount: number;
  matchCount: number;
  eventCount: number;
  durationMinutes: number;
  mockLatencyMs: number;
  rateLimitInjection?: number; // % of requests that return 429
  concurrency?: number; // BullMQ concurrency setting
}

export interface LoadTestResult {
  scenario: LoadTestScenario;
  durationMs: number;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  throughput: number; // requests/second
  memoryUsedMB: number;
  memoryGrowthMB: number;
  peakQueueDepth: number;
  rateLimitHits: number;
  apiCallsPerMinute: number;
}

export interface LoadTestMetrics {
  latencies: number[];
  errors: Error[];
  requests: number;
  queueDepths: number[];
  memorySnapshots: number[];
}

export const DEFAULT_LOAD_TEST_CONFIG: Partial<LoadTestConfig> = {
  durationMinutes: 5,
  mockLatencyMs: 100,
  concurrency: 1,
};

export const SCENARIO_CONFIGS: Record<LoadTestScenario, LoadTestConfig> = {
  baseline: {
    scenario: 'baseline',
    tournamentCount: 1,
    matchCount: 10,
    eventCount: 1,
    durationMinutes: 5,
    mockLatencyMs: 100,
    concurrency: 1,
  },
  smallScale: {
    scenario: 'smallScale',
    tournamentCount: 10,
    matchCount: 50,
    eventCount: 5,
    durationMinutes: 5,
    mockLatencyMs: 100,
    concurrency: 1,
  },
  mediumScale: {
    scenario: 'mediumScale',
    tournamentCount: 50,
    matchCount: 200,
    eventCount: 4,
    durationMinutes: 5,
    mockLatencyMs: 100,
    concurrency: 5,
  },
  highScale: {
    scenario: 'highScale',
    tournamentCount: 100,
    matchCount: 500,
    eventCount: 5,
    durationMinutes: 5,
    mockLatencyMs: 100,
    concurrency: 10,
  },
  burst: {
    scenario: 'burst',
    tournamentCount: 10,
    matchCount: 100,
    eventCount: 10,
    durationMinutes: 2,
    mockLatencyMs: 50,
    concurrency: 1,
  },
  concurrency: {
    scenario: 'concurrency',
    tournamentCount: 10,
    matchCount: 50,
    eventCount: 5,
    durationMinutes: 3,
    mockLatencyMs: 100,
    concurrency: 1,
  },
  rateLimit: {
    scenario: 'rateLimit',
    tournamentCount: 10,
    matchCount: 50,
    eventCount: 5,
    durationMinutes: 3,
    mockLatencyMs: 100,
    rateLimitInjection: 30,
    concurrency: 1,
  },
};
