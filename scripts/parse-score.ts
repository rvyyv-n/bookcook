/** Prints the parser's accuracy on the fixture corpus: `npm run parse:score` (add --verbose for failures). */
import { runFixtures, summarise } from '../src/lib/parse/__fixtures__/score';

const results = runFixtures();
const { pass, total, accuracy, suites } = summarise(results);

console.log('\nBookcook parser accuracy\n');
for (const [suite, s] of suites) {
  console.log(
    `  ${suite.padEnd(24)} ${String(s.pass).padStart(3)}/${String(s.total).padEnd(3)} ${((s.pass / s.total) * 100).toFixed(0).padStart(4)}%`,
  );
}
console.log(
  `\n  ${'Overall'.padEnd(24)} ${String(pass).padStart(3)}/${String(total).padEnd(3)} ${(accuracy * 100).toFixed(1).padStart(5)}%\n`,
);

const failures = results.filter((r) => !r.pass);
if (failures.length && process.argv.includes('--verbose')) {
  console.log('Failures:');
  for (const f of failures) console.log(`  [${f.suite}] ${f.input}\n      → ${f.detail}`);
} else if (failures.length) {
  console.log(`${failures.length} failing case(s). Run with --verbose to list them.`);
}
