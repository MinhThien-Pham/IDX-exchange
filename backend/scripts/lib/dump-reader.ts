import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type { MlsRow } from './normalize-mls.js';

const insertPrefix = /^INSERT INTO `([^`]+)` \(([^)]*)\) VALUES\s*/;

const escapes: Record<string, string> = {
  n: '\n',
  r: '\r',
  t: '\t',
  '0': '\0',
  b: '\b',
  Z: '\x1a',
};

/** Values of one SQL tuple that starts at `start` (a "(") and the index after its ")". */
function readTuple(sql: string, start: number): { values: (string | null)[]; end: number } {
  const values: (string | null)[] = [];
  let i = start + 1;
  for (;;) {
    while (sql[i] === ' ') i += 1;
    if (sql[i] === "'") {
      let value = '';
      i += 1;
      for (;;) {
        const char = sql[i];
        if (char === undefined) throw new Error('Unterminated string in dump row.');
        if (char === '\\') {
          const next = sql[i + 1] ?? '';
          value += escapes[next] ?? next;
          i += 2;
        } else if (char === "'") {
          if (sql[i + 1] === "'") {
            value += "'";
            i += 2;
          } else {
            i += 1;
            break;
          }
        } else {
          value += char;
          i += 1;
        }
      }
      values.push(value);
    } else {
      let end = i;
      while (end < sql.length && sql[end] !== ',' && sql[end] !== ')') end += 1;
      const token = sql.slice(i, end).trim();
      values.push(token.toUpperCase() === 'NULL' ? null : token);
      i = end;
    }
    while (sql[i] === ' ') i += 1;
    if (sql[i] === ',') {
      i += 1;
    } else if (sql[i] === ')') {
      return { values, end: i + 1 };
    } else {
      throw new Error('Unexpected character in dump row.');
    }
  }
}

/** Rows of every `INSERT INTO table (...) VALUES (...)[, (...)];` statement on one line. */
export function parseInsertLine(line: string, table: string): MlsRow[] | null {
  const match = insertPrefix.exec(line);
  if (!match || match[1] !== table) return null;
  const columns = match[2]!.split(',').map((column) => column.trim().replace(/^`|`$/g, ''));
  const rows: MlsRow[] = [];
  let position = match[0].length;
  while (line[position] === '(') {
    const { values, end } = readTuple(line, position);
    if (values.length !== columns.length)
      throw new Error(`Dump row has ${values.length} values for ${columns.length} columns.`);
    rows.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
    position = end;
    if (line[position] === ',') position += 1;
    while (line[position] === ' ') position += 1;
  }
  return rows;
}

/**
 * Streams one table's rows from a phpMyAdmin/mysqldump file without a database server.
 * Dates, times and numbers stay as the strings written in the dump, matching what the
 * normalizers expect.
 */
export async function* readDumpRows(file: string, table: string): AsyncGenerator<MlsRow> {
  const lines = createInterface({
    input: createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (!line.startsWith('INSERT INTO')) continue;
    const rows = parseInsertLine(line, table);
    if (rows) yield* rows;
  }
}
