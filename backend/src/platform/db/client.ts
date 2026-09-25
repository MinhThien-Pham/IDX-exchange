import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { createLogger, type Logger } from '../logging/logger.js';
import * as schema from './schema.js';

// Keep each Function's pool small; production uses Neon's pooled connection URL.
export function createDatabase(connectionString: string, logger: Logger = createLogger()) {
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
    query_timeout: 20_000,
  });
  // An idle connection may disappear while the database scales to zero. Handle
  // its event without logging URLs, credentials, source rows or query parameters.
  pool.on('error', () => logger.error({ event: 'database_idle_connection_error' }));
  return { db: drizzle(pool, { schema }), pool };
}

export type Database = ReturnType<typeof createDatabase>['db'];
