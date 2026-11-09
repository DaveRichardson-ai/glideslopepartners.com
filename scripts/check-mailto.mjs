// Checks every mailto: link in a built site: valid address syntax, and the
// domain publishes an MX record (so mail to it can be delivered).
//   node scripts/check-mailto.mjs dist
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Resolver, resolveMx as systemMx } from 'node:dns/promises';

// System DNS first, then public resolvers if the local one is unreachable.
const publicDns = new Resolver();
publicDns.setServers(['1.1.1.1', '8.8.8.8']);
const resolveMx = (d) => systemMx(d).catch(() => publicDns.resolveMx(d));

const dir = process.argv[2] || 'dist';
const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) files.push(p);
  }
};
walk(dir);

const RE = /href="mailto:([^"?]+)/g;
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@([a-z0-9-]+(\.[a-z0-9-]+)+)$/i;
const found = new Map();
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(RE)) found.set(m[1], [...(found.get(m[1]) ?? []), f]);

let failed = 0;
for (const [addr, where] of found) {
  const m = addr.match(EMAIL);
  if (!m) {
    console.log(`FAIL  ${addr}: not a valid address (${where.length} pages)`);
    failed++;
    continue;
  }
  try {
    const mx = await resolveMx(m[1]);
    if (!mx.length) throw new Error('no MX records');
    console.log(`OK    ${addr} on ${where.length} pages; MX ${mx.map((r) => r.exchange).join(', ')}`);
  } catch (e) {
    console.log(`FAIL  ${addr}: ${e.message}`);
    failed++;
  }
}
if (!found.size) console.log('No mailto: links found.');
process.exit(failed ? 1 : 0);
