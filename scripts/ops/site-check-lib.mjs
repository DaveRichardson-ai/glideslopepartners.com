import { writeFileSync } from 'node:fs';
export { checkHeaders, REDIRECTS, SITE, summary } from './lib.mjs';

export function writeResult(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}
