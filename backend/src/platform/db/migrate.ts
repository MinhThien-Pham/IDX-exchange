import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool } from 'pg';

// Transaction-scoped advisory locks work through both direct and pooled Neon URLs.
// Never edit an applied migration: add another numbered file instead.
export async function applyMigrations(pool: Pool, directory: string): Promise<string[]> {
  const files = (await readdir(directory)).filter((file) => /^\d+_[\w-]+\.sql$/.test(file)).sort();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(104428119, 1)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS _idx_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const { rows } = await client.query<{ name: string; checksum: string }>(
      'SELECT name, checksum FROM _idx_migrations',
    );
    const applied = new Map(rows.map((row) => [row.name, row.checksum]));
    const completed: string[] = [];
    for (const file of files) {
      const content = await readFile(join(directory, file), 'utf8');
      const checksum = createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex');
      if (applied.has(file)) {
        if (applied.get(file) !== checksum)
          throw new Error(`Applied migration ${file} has changed; create a new migration instead.`);
        continue;
      }
      await client.query(content);
      await client.query('INSERT INTO _idx_migrations(name, checksum) VALUES ($1, $2)', [
        file,
        checksum,
      ]);
      completed.push(file);
    }
    await client.query('COMMIT');
    return completed;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
