export class MissingCredentialsError extends Error {
  constructor(missing: string[]) {
    super(`Missing required credentials: ${missing.join(', ')}`);
    this.name = 'MissingCredentialsError';
  }
}

export class MockGenerationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'MockGenerationError';
  }
}

export class TestExecutionError extends Error {
  constructor(public readonly layer: string, public readonly exitCode: number) {
    super(`Test layer "${layer}" failed with exit code ${exitCode}`);
    this.name = 'TestExecutionError';
  }
}
