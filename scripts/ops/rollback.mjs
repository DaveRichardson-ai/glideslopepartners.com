// Rolls production back to the previous successful Cloudflare Pages deployment,
// then opens a needs-human issue with the failure output.
//   node scripts/ops/rollback.mjs site-check.json
import { existsSync, readFileSync } from 'node:fs';
import { cf, cfReady, openIssue, PAGES_PROJECT, summary, warn } from './lib.mjs';

const reportFile = process.argv[2];
const report = reportFile && existsSync(reportFile) ? readFileSync(reportFile, 'utf8') : '(no report file)';
const runUrl = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : '';

let outcome;
if (!cfReady()) {
  warn('Cloudflare secrets not set; cannot roll back.');
  outcome = 'Rollback was **not** attempted: CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID is not set.';
} else {
  const { result } = await cf(`/accounts/{account}/pages/projects/${PAGES_PROJECT}/deployments?env=production&per_page=20`);
  const ok = result.filter((d) => d.latest_stage?.name === 'deploy' && d.latest_stage?.status === 'success');
  const [current, previous] = ok;
  if (!previous) {
    outcome = 'Rollback was **not** possible: there is no earlier successful production deployment.';
  } else {
    await cf(`/accounts/{account}/pages/projects/${PAGES_PROJECT}/deployments/${previous.id}/rollback`, { method: 'POST' });
    outcome = `Rolled production back from \`${current.id.slice(0, 8)}\` (${current.deployment_trigger?.metadata?.commit_hash?.slice(0, 7) ?? 'unknown commit'}) to \`${previous.id.slice(0, 8)}\` (${previous.deployment_trigger?.metadata?.commit_hash?.slice(0, 7) ?? 'unknown commit'}), deployed ${previous.created_on}.`;
  }
}

await openIssue(
  'Production check failed after deploy',
  [
    outcome,
    '',
    'The checks that run straight after a production deploy failed. Fix the cause on a branch and merge it; CI will deploy again once every check passes.',
    runUrl ? `\nWorkflow run: ${runUrl}` : '',
    '',
    '<details><summary>Check output</summary>',
    '',
    '```json',
    report.slice(0, 60000),
    '```',
    '</details>',
  ].join('\n'),
);
await summary(`### Rollback\n\n${outcome}`);
