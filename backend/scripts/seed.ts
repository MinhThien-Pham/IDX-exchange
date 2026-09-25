import { createDatabase } from '../src/platform/db/client.js';
import { seedDemo } from './lib/demo-seed.js';
import { databaseUrl, safeError } from './lib/environment.js';

async function main() {
  const { db, pool } = createDatabase(databaseUrl());
  try {
    console.log(
      `Demo seed upserted: ${JSON.stringify(await seedDemo(db))}. Existing non-demo listings were preserved.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(safeError(error));
  process.exitCode = 1;
});
