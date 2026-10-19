import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

// Resolve the backend .env consistently from the repo root or the workspace.
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export function databaseUrl(migration = false): string {
  const value =
    (migration ? process.env.DATABASE_MIGRATION_URL : undefined) || process.env.DATABASE_URL;
  if (!value)
    throw new Error(
      'Set DATABASE_URL in backend/.env first. Migrations may also use DATABASE_MIGRATION_URL.',
    );
  const parsed = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol))
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
  return value;
}

export function safeError(error: unknown): string {
  // Drizzle's wrapper includes SQL parameter values, potentially the full source
  // record. Report only a safe database error code, never that wrapper or detail.
  const candidate = error instanceof Error && error.cause ? error.cause : error;
  if (
    candidate &&
    typeof candidate === 'object' &&
    'code' in candidate &&
    typeof candidate.code === 'string' &&
    /^[A-Z0-9_]+$/i.test(candidate.code)
  ) {
    return `Database command failed (${candidate.code}); verify the connection and migrated schema.`;
  }
  const message = error instanceof Error ? error.message : 'Database command failed';
  if (message.startsWith('Failed query:'))
    return 'Database query failed; verify the connection and migrated schema.';
  return message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted connection URL]');
}
