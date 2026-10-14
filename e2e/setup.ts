import { fileURLToPath } from 'node:url';
import { createDatabase } from '../backend/src/platform/db/client.js';
import { applyMigrations } from '../backend/src/platform/db/migrate.js';
import { seedDemo } from '../backend/scripts/lib/demo-seed.js';

export default async function setup() {
  const url = process.env.E2E_DATABASE_URL;
  if (
    !url ||
    !/(?:^|[_-])test(?:$|[_-])/.test(decodeURIComponent(new URL(url).pathname.slice(1)))
  ) {
    throw new Error(
      'E2E_DATABASE_URL must name an isolated database containing a separate test segment, e.g. idx_test.',
    );
  }
  const { db, pool } = createDatabase(url);
  try {
    await applyMigrations(
      pool,
      fileURLToPath(new URL('../backend/db/migrations/', import.meta.url)),
    );
    await seedDemo(db);
  } finally {
    await pool.end();
  }
}
