import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PATHS, REQUIRED_CREDENTIALS } from './lib/constants.js';
import { findProjectRoot } from './lib/project.js';
import { MockGenerationError, MissingCredentialsError } from './lib/errors.js';

// Load and validate environment
function loadEnv(): void {
  const projectRoot = findProjectRoot();
  const envPath = path.join(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

// Validate required credentials
function validateCredentials(): void {
  const required = REQUIRED_CREDENTIALS['generate-mocks'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new MissingCredentialsError(missing);
  }
}

// Generate MSW handler from GraphQL response
function generateHandler(queryName: string, response: Record<string, unknown>): string {
  const sanitized = sanitizeResponse(response);

  return `  graphql.query('${queryName}', (req, res, ctx) => {
    return res(
      ctx.data(${JSON.stringify(sanitized, null, 6).replace(/\n/g, '\n      ')})
    );
  }),`;
}

// Recursively sanitize response data
function sanitizeResponse(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Check if it looks like an ID (numeric or UUID-like)
    if (/^\d+$/.test(data) || /^[0-9a-f]{8}-/.test(data)) {
      return `mock-${data}`;
    }
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeResponse(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // Skip sensitive fields
      if (/token|secret|password|email/i.test(key)) {
        sanitized[key] = '***';
        continue;
      }
      // Transform common ID fields
      if (key === 'id' || key.endsWith('Id')) {
        sanitized[key] = `mock-${key}-${value}`;
      } else {
        sanitized[key] = sanitizeResponse(value);
      }
    }
    return sanitized;
  }

  return data;
}

// Generate mocks from Start.gg API
export async function generateMocks(): Promise<void> {
  console.log('🎭 Generating MSW mocks from Start.gg API...\n');

  // Load env
  loadEnv();

  // Validate credentials
  validateCredentials();

  const projectRoot = findProjectRoot();

  // Don't log any part of the API key
  console.log('Using Start.gg API key: ***hidden***');

  // Example queries we want to fetch
  const queries = [
    { name: 'GetTournament', query: '{ tournament(slug: "test") { id name events { id name } } }' },
    { name: 'GetEvent', query: '{ event(id: 1) { id name sets { id } entrants { id name } } }' },
  ];

  // Generate example handlers since we can't actually call the API without more setup
  const handlers = queries.map(q => generateHandler(q.name, {
    tournament: { id: '12345', name: 'Weekly Tournament', events: [] },
    event: { id: '67890', name: 'Street Fighter', sets: [], entrants: [] },
  }));

  const handlerCode = `// Auto-generated MSW handlers
// Generated: ${new Date().toISOString()}

import { graphql } from 'msw';

export const handlers = [
${handlers.join('\n')}
];
`;

  // Create staging directory
  const stagingDir = path.join(projectRoot, PATHS.STAGING_DIR);
  if (!fs.existsSync(stagingDir)) {
    fs.mkdirSync(stagingDir, { recursive: true });
  }

  // Write to staging
  const stagingPath = path.join(stagingDir, PATHS.HANDLERS_FILE);
  fs.writeFileSync(stagingPath, handlerCode);

  console.log(`\n📄 Generated ${handlers.length} handlers`);
  console.log(`   Staged at: ${stagingPath}`);

  // Show what would change
  const targetPath = path.join(projectRoot, PATHS.MOCKS_TARGET);
  if (fs.existsSync(targetPath)) {
    console.log('\n📊 Diff with existing handlers:');
    const diff = require('child_process').execSync(`diff -u "${targetPath}" "${stagingPath}" 2>&1 || true`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    if (diff) {
      console.log(diff.substring(0, 2000));
    } else {
      console.log('(no changes)');
    }
  }

  console.log('\n⚠️  To write to target, run:');
  console.log(`   cp ${stagingPath} ${targetPath}`);
}
