// Proves the build guards: a published article with no publishDate, or with an
// unresolved [verify …] note, must fail the build with a clear message.
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const clearCache = () => {
  rmSync('.astro/data-store.json', { force: true });
  rmSync('node_modules/.astro', { recursive: true, force: true });
};

const cases = [
  { dir: 'tests/fixtures/insights-bad-date', expect: /needs a publishDate/ },
  { dir: 'tests/fixtures/insights-bad-marker', expect: /still contains "\[verify"/ },
];

let failed = 0;
for (const c of cases) {
  clearCache();
  const r = spawnSync('npx', ['astro', 'build'], {
    env: { ...process.env, INSIGHTS_DIR: c.dir, ASTRO_OUT_DIR: 'dist-guard-test' },
    encoding: 'utf8',
    shell: true,
  });
  const out = `${r.stdout}\n${r.stderr}`;
  const ok = r.status !== 0 && c.expect.test(out);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.dir}: build ${r.status === 0 ? 'succeeded' : 'failed'}${ok ? ' with the expected message' : ''}`);
  if (!ok) {
    failed++;
    console.log(out.slice(-2000));
  }
}
clearCache();
rmSync('dist-guard-test', { recursive: true, force: true });
process.exit(failed ? 1 : 0);
