import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseInsertLine, readDumpRows } from '../../scripts/lib/dump-reader.js';

describe('MLS dump reader', () => {
  test('parses strings, escapes, NULLs and numbers into a keyed row', () => {
    const [row] = parseInsertLine(
      "INSERT INTO `t` (`id`, `a`, `b`, `c`, `d`) VALUES(7, 'O''Brien \\\\ \\'x\\' line\\nbreak', NULL, '', -1.50);",
      't',
    )!;
    expect(row).toEqual({ id: '7', a: "O'Brien \\ 'x' line\nbreak", b: null, c: '', d: '-1.50' });
  });

  test('keeps commas, parentheses and JSON inside quoted values', () => {
    const [row] = parseInsertLine(
      'INSERT INTO `t` (`id`, `json`) VALUES(1, \'{"a":"x, (y)","b":null}\');',
      't',
    )!;
    expect(row?.json).toBe('{"a":"x, (y)","b":null}');
  });

  test('reads several tuples from one statement', () => {
    const rows = parseInsertLine("INSERT INTO `t` (`id`, `n`) VALUES(1, 'a'),(2, 'b');", 't')!;
    expect(rows.map((row) => row.n)).toEqual(['a', 'b']);
  });

  test('ignores other tables and rejects rows that do not match their columns', () => {
    expect(parseInsertLine('INSERT INTO `other` (`id`) VALUES(1);', 't')).toBeNull();
    expect(() => parseInsertLine('INSERT INTO `t` (`id`, `n`) VALUES(1);', 't')).toThrow(/values/);
  });

  test('streams only the requested table from a dump file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'idx-dump-'));
    try {
      const file = join(directory, 'dump.sql');
      await writeFile(
        file,
        [
          '-- phpMyAdmin SQL Dump',
          'CREATE TABLE `t` (`id` int(11) NOT NULL);',
          "INSERT INTO `t` (`id`, `n`) VALUES(1, 'a');",
          'INSERT INTO `u` (`id`) VALUES(9);',
          "INSERT INTO `t` (`id`, `n`) VALUES(2, 'b');",
        ].join('\n'),
      );
      const rows = [];
      for await (const row of readDumpRows(file, 't')) rows.push(row);
      expect(rows).toEqual([
        { id: '1', n: 'a' },
        { id: '2', n: 'b' },
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
