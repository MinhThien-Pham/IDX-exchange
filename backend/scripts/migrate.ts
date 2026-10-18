import { fileURLToPath } from 'node:url';
import { createDatabase } from '../src/platform/db/client.js';
import { applyMigrations } from '../src/platform/db/migrate.js';
import { databaseUrl, safeError } from './lib/environment.js';

async function main() {
  const { pool } = createDatabase(databaseUrl(true));
  try {
    const applied = await applyMigrations(
      pool,
      fileURLToPath(new URL('../db/migrations/', import.meta.url)),
    );
    console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(safeError(error));
  process.exitCode = 1;
});
