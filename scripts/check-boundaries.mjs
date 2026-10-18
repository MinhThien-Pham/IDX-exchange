import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const violations = [];
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (file.endsWith('.ts')) {
      const relative = path.relative(root, file).replaceAll('\\', '/');
      if (!/\/(domain|application)\//.test(relative)) continue;
      const source = await readFile(file, 'utf8');
      const imports = [...source.matchAll(/(?:from\s+|import\s*\()['"]([^'"]+)['"]/g)].map(
        (match) => match[1],
      );
      for (const dependency of imports) {
        if (
          /^(express|zod|drizzle-orm|pg|@idx\/contracts)(\/|$)/.test(dependency) ||
          /(?:infrastructure|presentation|platform)\//.test(dependency)
        ) {
          violations.push(`${relative}: inner layer imports ${dependency}`);
        }
      }
    }
  }
}
await walk(path.join(root, 'backend/src/modules'));
if (violations.length > 0) {
  process.stderr.write(`${violations.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Domain and application boundaries passed.\n');
}
