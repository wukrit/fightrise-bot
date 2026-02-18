import type { LoadTestConfig, LoadTestResult, LoadTestMetrics } from '../types.js';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export class MetricsCollector {
  private latencies: number[] = [];
  private errors: Error[] = [];
  private requests = 0;
  private queueDepths: number[] = [];
  private memorySnapshots: number[] = [];
  private startTime: number = 0;
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    this.startTime = Date.now();
    this.latencies = [];
    this.errors = [];
    this.requests = 0;
    this.queueDepths = [];
    this.memorySnapshots = [];

    // Record memory every 5 seconds
    this.intervalId = setInterval(() => {
      this.recordMemory();
    }, 5000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  recordLatency(ms: number): void {
    this.latencies.push(ms);
  }

  recordRequest(): void {
    this.requests++;
  }

  recordError(err: Error): void {
    this.errors.push(err);
  }

  recordQueueDepth(depth: number): void {
    this.queueDepths.push(depth);
  }

  recordMemory(): void {
    const used = process.memoryUsage();
    this.memorySnapshots.push(used.heapUsed / 1024 / 1024);
  }

  getResults(config: LoadTestConfig): LoadTestResult {
    const durationMs = Date.now() - this.startTime;
    const sorted = [...this.latencies].sort((a, b) => a - b);

    const memoryGrowth =
      this.memorySnapshots.length > 1
        ? this.memorySnapshots[this.memorySnapshots.length - 1] - this.memorySnapshots[0]
        : 0;

    return {
      scenario: config.scenario,
      durationMs,
      totalRequests: this.requests,
      totalErrors: this.errors.length,
      errorRate: this.requests > 0 ? this.errors.length / this.requests : 0,
      latencyP50: percentile(sorted, 50),
      latencyP95: percentile(sorted, 95),
      latencyP99: percentile(sorted, 99),
      throughput: durationMs > 0 ? (this.requests / durationMs) * 1000 : 0,
      memoryUsedMB: Math.max(...this.memorySnapshots, 0),
      memoryGrowthMB: memoryGrowth,
      peakQueueDepth: Math.max(...this.queueDepths, 0),
      rateLimitHits: this.errors.filter((e) => e.message.includes('429')).length,
      apiCallsPerMinute: durationMs > 0 ? (this.requests / durationMs) * 60000 : 0,
    };
  }

  getMetrics(): LoadTestMetrics {
    return {
      latencies: this.latencies,
      errors: this.errors,
      requests: this.requests,
      queueDepths: this.queueDepths,
      memorySnapshots: this.memorySnapshots,
    };
  }

  reset(): void {
    this.stop();
    this.latencies = [];
    this.errors = [];
    this.requests = 0;
    this.queueDepths = [];
    this.memorySnapshots = [];
    this.startTime = 0;
  }
}
