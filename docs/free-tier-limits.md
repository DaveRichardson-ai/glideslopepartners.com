# Free-tier limits

Date checked for every entry: **9 November 2026**. All figures come from official docs. Where the docs say nothing, we say so. Check again before relying on a number.

## 1. Cloudflare Pages (free)

Source: https://developers.cloudflare.com/pages/platform/limits/

- Builds: 500 a month, 1 at a time, 20-minute timeout.
- Files: 20,000 per site. Max file size: 25 MiB per asset.
- Custom domains: 100 per project.
- `_headers`: 100 rules, and each header value can be up to 2,000 characters.
- `_redirects`: 2,000 static + 100 dynamic (2,100 in total), with a 1,000-character limit per line. Put static rules first. For duplicate sources, the top rule wins. Supported codes are 301, 302, 303, 307 and 308. The default is 302. Source: https://developers.cloudflare.com/pages/configuration/redirects/
- `/index.html / 301`: the docs don't cover this case or redirect loops. Pages already redirects `/about/index.html` to `/about/` and `/contact.html` to `/contact` on its own, so the rule isn't needed. Leave it out.
- Trailing slashes and `.html`: Pages strips `.html` (`/contact.html` → `/contact`) and sends `/dir/index.html` → `/dir/`. The Pages docs **don't state the status code**. The Workers static-assets docs (same engine, `auto-trailing-slash`) show **307**, not 308. Confirm with `curl -I` on a deploy. Source: https://developers.cloudflare.com/pages/configuration/serving-pages/ and https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/

**What it means for us:** there's plenty of headroom. Use `/about/` style links so we never hit the built-in redirect, and don't add our own `index.html` rules.

## 2. Pages Functions / Workers (free)

Source: https://developers.cloudflare.com/workers/platform/limits/

- 100,000 requests a day, shared across Workers and Pages Functions. The count resets at midnight UTC. Over the limit, requests get error 1027.
- 10 ms CPU per request. Time spent waiting on the network doesn't count.
- 50 subrequests per request and 128 MB memory.

**What it means for us:** a contact form and a few API routes won't come close. Keep Functions light because 10 ms is tight.

## 3. Sending email from a Pages Function (`send_email`)

Sources: https://developers.cloudflare.com/pages/functions/bindings/ , https://developers.cloudflare.com/pages/functions/wrangler-configuration/ , https://developers.cloudflare.com/email-service/configuration/send-bindings/ , https://developers.cloudflare.com/email-service/platform/pricing/ , https://developers.cloudflare.com/email-service/platform/limits/

- **Pages Functions don't list `send_email`.** It's missing from both the Pages bindings page and the Pages wrangler.toml key list. The supported keys are `vars`, `d1_databases`, `durable_objects`, `hyperdrive`, `kv_namespaces`, `queues.producers`, `r2_buckets`, `vectorize`, `services`, `analytics_engine_datasets` and `ai`. Treat it as Workers-only.
- The setup that works: a small separate **Worker** with the `send_email` binding, which the Pages Function calls through a **service binding**.

Worker (`mailer/wrangler.toml`):

```toml
name = "glideslope-mailer"
main = "src/index.ts"
compatibility_date = "2026-11-01"

[[send_email]]
name = "EMAIL"
destination_address = "owner@example.com.au"   # lock to one verified address
# or: allowed_destination_addresses = ["a@example.com.au", "b@example.com.au"]
# or: allowed_sender_addresses = ["noreply@example.com.au"]
```

Pages project (`wrangler.toml`):

```toml
name = "glideslope"
pages_build_output_dir = "./dist"
compatibility_date = "2026-11-01"

[[services]]
binding = "MAILER"
service = "glideslope-mailer"
```

- **Recipients on free:** sending to *verified destination addresses* (set up in Email Routing) is free on every plan and doesn't count toward any quota. Sending to arbitrary recipients ("Email Sending") **needs Workers Paid**. Paid includes 3,000 emails a month, then costs US$0.35 per 1,000.
- The From address must be on our Email Routing / onboarded domain. Each account can have 200 destination addresses.
- Per message: up to 50 recipients (to + cc + bcc), 25 MiB total and 32 attachments. Daily quota for paid sending: "conservative" for new accounts, with no number published.

**What it means for us:** contact-form mail to our own verified inbox is free, but it needs a separate Worker. We can't send confirmation emails to visitors on the free plan.

## 4. Workers Analytics Engine

Sources: https://developers.cloudflare.com/analytics/analytics-engine/pricing/ , https://developers.cloudflare.com/analytics/analytics-engine/limits/ , https://developers.cloudflare.com/analytics/analytics-engine/sql-api/

- Available on Workers Free: 100,000 data points written a day and 10,000 read queries a day.
- 250 data points per request. Each point holds up to 20 blobs (16 KB in total), 20 doubles and 1 index (96 bytes).
- Retention: 3 months. Data may be sampled at high volume, so use `_sample_interval` in sums.
- Supported in Pages Functions (listed key `analytics_engine_datasets`), but it can't be used in local dev.

```toml
[[analytics_engine_datasets]]
binding = "AE"
dataset = "glideslope_events"
```

- SQL API: `POST https://api.cloudflare.com/client/v4/accounts/<account_id>/analytics_engine/sql`, with header `Authorization: Bearer <token>`. The token needs **Account > Account Analytics > Read**.

**What it means for us:** good for counting form submissions and custom events. Keep in mind the data only lasts 3 months.

## 5. Cloudflare Web Analytics

Sources: https://developers.cloudflare.com/web-analytics/faq/ , https://developers.cloudflare.com/data-localization/metadata-boundary/graphql-datasets/

- Free. Soft limit of 10 sites per account. Unsampled data is kept for 7 days, then about 10% is kept. The dashboard shows 6 months. Queries are sampled adaptively.
- GraphQL datasets (account-scoped): `rumPageloadEventsAdaptiveGroups` (page views and visits), `rumPerformanceEventsAdaptiveGroups` (load timings), `rumWebVitalsEventsAdaptiveGroups` / `rumWebVitalsEventsAdaptive` (Core Web Vitals). Endpoint: `https://api.cloudflare.com/client/v4/graphql`. Token: Account Analytics Read. This isn't stated on the RUM pages. It's the standard permission for account analytics.
- Manual snippet (an external script, no inline JS):

```html
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon='{"token": "SITE_TOKEN"}'></script>
```

- CSP: `script-src https://static.cloudflareinsights.com` and `connect-src https://cloudflareinsights.com`. Use `connect-src 'self'` only if the beacon is auto-injected on a proxied site.

**What it means for us:** works with a strict CSP and no `'unsafe-inline'`. Note the newer `type="module"`.

## 6. Cloudflare Turnstile

Sources: https://developers.cloudflare.com/turnstile/plans/ , https://developers.cloudflare.com/turnstile/troubleshooting/testing/

- Free: unlimited challenges, 20 widgets, 10 hostnames per widget, 7 days of analytics.
- Test site keys:
  - `1x00000000000000000000AA` always passes (visible)
  - `2x00000000000000000000AB` always fails (visible)
  - `1x00000000000000000000BB` always passes (invisible)
  - `2x00000000000000000000BB` always fails (invisible)
  - `3x00000000000000000000FF` forces an interactive challenge
- Test secret keys:
  - `1x0000000000000000000000000000000AA` always passes
  - `2x0000000000000000000000000000000AA` always fails
  - `3x0000000000000000000000000000000AA` returns "token already spent"
- Siteverify: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`, with `secret` and `response` (and optionally `remoteip`).

**What it means for us:** free with no cap. Use the test keys in local and preview builds.

## 7. Rate limiting rules (Free plan)

Source: https://developers.cloudflare.com/waf/rate-limiting-rules/

- 1 rule. Counts by IP only. Period: **10 seconds only**. Mitigation timeout: **10 seconds only**. No custom counting expression.

**What it means for us:** **5 requests per 10 minutes isn't possible on free.** The closest is something like 5 requests per 10 seconds per IP, blocked for 10 seconds. For a stricter cap, count in the Function itself (KV or a Durable Object) or rely on Turnstile.

## 8. Single Redirect rules (www → apex)

Source: https://developers.cloudflare.com/rules/url-forwarding/

- Free: 10 Single Redirect rules per zone. Bulk Redirects: 15 rules, 5 lists, 10,000 URLs.

**What it means for us:** one rule handles www → apex (301, keep the query string), and 9 are left over.

## 9. Pages deployments API

Sources: https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/list/ , https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/rollback/

- List: `GET /accounts/{account_id}/pages/projects/{project_name}/deployments` (options: `env=production|preview`, `page`, `per_page`). Needs Pages Read (or Write).
- Rollback: `POST /accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}/rollback`. Needs **Pages Write**.
- Base URL: `https://api.cloudflare.com/client/v4`.

**What it means for us:** the path is confirmed. A rollback script needs a token with Pages Write.

## 10. GitHub Actions

Sources: https://docs.github.com/en/billing/concepts/product-billing/github-actions , https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows

- Public repos: standard GitHub-hosted runners are free and unlimited.
- Private repos (Free plan): now **US$12 of included compute a month**, not a fixed number of minutes. That's roughly 2,000 Linux 2-core minutes at US$0.006 a minute (our sum). Windows costs about 1.7× and macOS about 10×. Usage is blocked once the allowance is spent if there's no card on file. Storage: 500 MB for artifacts and 10 GB of cache per repo.
- Schedules: the shortest interval is every 5 minutes. Runs can be delayed under load, worst at the top of the hour. They only run on the default branch. In public repos, scheduled workflows are switched off after 60 days with no repo activity.

**What it means for us:** schedule jobs at odd minutes (for example `17 * * *`). If the repo is public, commit something at least every 60 days or re-enable the workflow.

## 11. Google Search Console API

Sources: https://developers.google.com/webmaster-tools/limits , https://developers.google.com/search/apis/indexing-api/v3/prereqs , https://support.google.com/webmasters/answer/7687615

- searchanalytics.query: 1,200 queries a minute per site and per user. Per project: 40,000 a minute and 30,000,000 a day. There are also unpublished "load" quotas, measured over 10-minute and 1-day windows.
- URL Inspection: **2,000 a day and 600 a minute per property**. Per project: 10,000,000 a day and 15,000 a minute.
- sitemaps.submit and other calls: 20 a second and 200 a minute per user, plus 100,000,000 a day per project.
- Service account: in Search Console, go to Settings > Users and permissions > Add user. Paste the `client_email` from the JSON key and pick Full (Restricted is read-only, so it can't submit sitemaps). You must be a verified owner to do this.

**What it means for us:** inspecting every page daily is fine below 2,000 URLs.

## 12. UptimeRobot (free)

Source: https://uptimerobot.com/pricing/

- 50 monitors, checked every 5 minutes. Commercial use is allowed ("personal and commercial projects").

**What it means for us:** free is enough for the site plus key endpoints.

## 13. Gmail SMTP with an app password

Sources: https://support.google.com/mail/answer/22839 , https://support.google.com/a/answer/166852 , https://support.google.com/mail/answer/185833

- Personal Gmail: about 500 emails or recipients a day (Google says these limits can change). SMTP via POP/IMAP: 100 recipients per message. Workspace: 2,000 a day over a rolling 24 hours.
- App passwords need 2-Step Verification and are revoked when the Google password changes. Google advises against using them.

**What it means for us:** fine as a backup for low-volume alerts. Expect it to break when the password changes.
