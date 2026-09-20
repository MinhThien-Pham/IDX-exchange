import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { boundaryViolation, importsFrom } from './architecture-rules.mjs';

const root = path.resolve(import.meta.dirname, '..');
const violations = [];
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'test') await walk(file);
    } else if (/\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file)) {
      const relative = path.relative(root, file).replaceAll('\\', '/');
      const source = await readFile(file, 'utf8');
      for (const dependency of importsFrom(source)) {
        const reason = boundaryViolation(relative, dependency);
        if (reason) violations.push(`${relative}: ${dependency} — ${reason}`);
      }
    }
  }
}
for (const directory of ['backend/src', 'frontend/src', 'packages/contracts/src']) {
  await walk(path.join(root, directory));
}
if (violations.length > 0) {
  process.stderr.write(`${violations.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    'Backend layers, frontend features, and shared-contract boundaries passed.\n',
  );
}
