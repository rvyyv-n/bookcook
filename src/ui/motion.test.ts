import { describe, expect, it } from 'vitest';

// The motion scheme (docs/design/MOTION.md): components take their timing from the tokens in
// src/design/motion.css by role (--dur-give, --dur-exit, --dur, --dur-settle, --dur-page, --dur-slow)
// and never write their own milliseconds, Tailwind durations or curves.

const sources = import.meta.glob<string>(['../**/*.{ts,tsx}', '!../design/**', '!../**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const RAW = [
  { what: 'a raw duration like 300ms', re: /\b\d+(\.\d+)?ms\b/ },
  { what: 'a Tailwind duration or delay by number', re: /\b(duration|delay)-(\d|\[)/ },
  { what: 'a hand-written curve', re: /cubic-bezier|\bease-\[/ },
];

/** The code on a line, without // comments or a line of a block comment. */
function code(line: string): string {
  const t = line.trim();
  if (t.startsWith('*') || t.startsWith('/*') || t.startsWith('//')) return '';
  return line.replace(/\s\/\/.*$/, '');
}

describe('motion scheme', () => {
  it('reads the app source', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50);
  });

  it('takes every timing from the motion tokens', () => {
    const found: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      text.split('\n').forEach((line, i) => {
        for (const { what, re } of RAW) if (re.test(code(line))) found.push(`${file}:${i + 1}: ${what}`);
      });
    }
    expect(found).toEqual([]);
  });
});
