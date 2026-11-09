# Owner set-up

These are the one-time steps only the owner can do: accounts, keys, DNS and approvals. Do them in order. Each step says what to click. Nothing here costs money.

Never paste a key or password into a chat, an issue or a file in this repository. Keys go in two places only: **GitHub secrets** (`gh secret set NAME`, which prompts for the value) and **Cloudflare** (the dashboard, or `npx wrangler … secret put`, which also prompts).

Until a secret exists, the job that needs it skips with a warning and CI stays green.

---

## Before you start: two decisions

1. **Public or private repository?** Public is recommended: GitHub Actions minutes are unlimited, and nothing secret lives in the code. Private repositories get US$12 of Actions compute a month (about 2,000 Linux minutes). With a private repository, the hourly uptime job alone uses about 750 minutes a month. In that case, delete `.github/workflows/uptime.yml` and use UptimeRobot's free plan instead (step 13).
2. **Email for enquiries.** The site sends each enquiry to one verified address, normally `hello@glideslopepartners.com`.

---

## 1. GitHub repository

If Claude has not already created it:

1. Go to <https://github.com/new>. Name: `glideslopepartners.com`. Visibility: as decided above. Do not add a README.
2. In this folder, run:

   ```bash
   git remote add origin https://github.com/<your-account>/glideslopepartners.com.git
   ```

   ```bash
   git push -u origin main
   ```

3. **Settings → General → Pull Requests:** tick **Allow auto-merge**. Dependabot updates need this.
4. **Settings → Branches → Add branch ruleset** for `main`. Tick **Require a pull request before merging** and **Require status checks to pass**, then add the check **Build and verify**. This is what stops a failing change reaching production.
5. **Settings → Environments → New environment** named `production`. It can stay empty. Add yourself as a required reviewer only if you want to approve each deploy by hand.

## 2. Cloudflare API token

1. Cloudflare dashboard → your profile icon → **My Profile → API Tokens → Create Token → Create Custom Token**.
2. Name it `glideslope-github`. Permissions:

   | Type | Permission | Access |
   | --- | --- | --- |
   | Account | Cloudflare Pages | Edit |
   | Account | Workers Scripts | Edit (deploys the enquiry mailer) |
   | Account | Account Analytics | Read (Web Analytics and Analytics Engine) |
   | Zone | Zone | Read |
   | Zone | DNS | Edit (only for the cut-over; remove it afterwards) |

   Account resources: your account only. Zone resources: `glideslopepartners.com` only.
3. **Continue → Create Token.** Copy the token, then in this folder run:

   ```bash
   gh secret set CLOUDFLARE_API_TOKEN
   ```

4. Your account ID is on the right-hand side of the account home page (Workers & Pages → Overview). Run:

   ```bash
   gh secret set CLOUDFLARE_ACCOUNT_ID
   ```

## 3. Cloudflare Pages project

Claude may have created this already (see the launch report). If not:

```bash
npx wrangler pages project create glideslope --production-branch main
```

Deploys come from GitHub Actions with `wrangler pages deploy`, not from Cloudflare's own Git integration, so the checks in CI decide what reaches production. Do not connect the project to GitHub in the Cloudflare dashboard.

## 4. Turnstile (spam check on the contact form)

1. Dashboard → **Turnstile → Add widget**. Name: `glideslope contact`. Hostnames: `glideslopepartners.com`, `www.glideslopepartners.com`, `glideslope-d65.pages.dev`. Widget mode: **Managed**. Pre-clearance: **No**.
2. Copy the **site key**:

   ```bash
   gh secret set TURNSTILE_SITE_KEY
   ```

3. Copy the **secret key** into the Pages project (it is used by the form handler at the edge, not by GitHub):

   ```bash
   npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name glideslope
   ```

   Also keep a copy as a GitHub secret named `TURNSTILE_SECRET_KEY` if you want it on record; nothing in CI reads it.

## 5. Web Analytics (visits, pages, Core Web Vitals; no cookies)

1. Dashboard → **Workers & Pages → glideslope → Metrics → Web Analytics → Enable**. Cloudflare then adds its beacon to every page automatically. The beacon is an external script, which the site's Content Security Policy already allows.
2. Dashboard → **Analytics & Logs → Web Analytics**. Open the site and choose **Manage site**. Copy the **site tag**:

   ```bash
   gh secret set CF_WEB_ANALYTICS_SITE_TAG
   ```

   Alternative to step 1: add the site manually, copy the snippet's `token` value, and run `gh secret set CF_WEB_ANALYTICS_SITE_TOKEN`. The build then adds the beacon itself. Use one method, not both.

## 6. Enquiry email (Email Routing on a subdomain)

**Important:** the domain's email runs on Microsoft 365. Turning on Email Routing for `glideslopepartners.com` itself would replace its MX records and stop your email. So Email Routing goes on a subdomain, `notify.glideslopepartners.com`, which only sends.

1. Dashboard → `glideslopepartners.com` → **Email → Email Routing → Get started**. When it asks for the domain, choose **Add subdomain** and enter `notify`. Let Cloudflare add the records it lists; they are all on `notify.` and leave the root domain alone. Check afterwards that the root domain's MX record still points to `glideslopepartners-com.mail.protection.outlook.com`.
2. **Email Routing → Destination addresses → Add destination address:** `hello@glideslopepartners.com` (or wherever enquiries should land). Click the link in the verification email.
3. Store the destination as a secret on the mailer Worker:

   ```bash
   cd workers/mailer
   npx wrangler deploy
   npx wrangler secret put CONTACT_DESTINATION
   cd ../..
   ```

   For your records, also run `gh secret set CONTACT_DESTINATION` (CI does not read it).
4. Send a test enquiry from the preview site. The email arrives from `website@notify.glideslopepartners.com` with Reply-To set to the person who wrote it.

## 7. Rate limit on the contact form

The Free plan allows one rate-limiting rule with a **10-second** window only, so the brief's "5 per 10 minutes" is not available. The closest setting:

1. Dashboard → `glideslopepartners.com` → **Security → WAF → Rate limiting rules → Create rule**.
2. Name: `contact form`. **If incoming requests match:** URI Path equals `/api/contact` AND Request Method equals `POST`.
3. **With the same characteristics:** IP. **When rate exceeds:** 5 requests per 10 seconds. **Then:** Block for 10 seconds. **Deploy.**

Turnstile, the hidden honeypot field and the three-second minimum fill time do the rest.

## 8. Cloudflare security settings

On `glideslopepartners.com`:

1. **SSL/TLS → Overview:** Full (strict).
2. **SSL/TLS → Edge Certificates:** Always Use HTTPS **on**; Minimum TLS Version **1.2**; TLS 1.3 **on**; Automatic HTTPS Rewrites **on**. Leave HSTS off here: the site sends its own HSTS header.
3. **DNS → Settings:** DNSSEC → **Enable**. Cloudflare Registrar adds the DS record for you.
4. **Security → Bots:** Bot Fight Mode **on**.
5. **After four clean weeks live:** submit the domain at <https://hstspreload.org>. The header is already preload-ready. This is hard to undo, so wait until you are sure every subdomain serves HTTPS.

## 9. Email authentication (SPF, DKIM, DMARC)

Checked on 9 November 2026: SPF is correct for Microsoft 365; **DKIM is not turned on; there is no DMARC record.**

1. **DKIM.** Microsoft Defender portal → **Email & collaboration → Policies & rules → Threat policies → Email authentication settings → DKIM** → select `glideslopepartners.com`. It shows two CNAME records (`selector1._domainkey` and `selector2._domainkey`). Add both in Cloudflare DNS with **proxy off**, then switch **Sign messages for this domain with DKIM signatures** on.
2. **DMARC.** Cloudflare DNS → **Add record**: Type `TXT`, Name `_dmarc`, Content:

   ```
   v=DMARC1; p=none; rua=mailto:hello@glideslopepartners.com; adkim=r; aspf=r
   ```

3. After four weeks of clean reports (only Microsoft 365 and Cloudflare passing), change `p=none` to `p=quarantine`. The weekly report reminds you. Set the launch date so it can count:

   ```bash
   gh variable set LAUNCH_DATE --body 2026-11-16
   ```

## 10. Google Search Console (reports and sitemap submission)

1. <https://console.cloud.google.com> → create a project named `glideslope-reporting` → **APIs & Services → Library** → enable **Google Search Console API**.
2. **IAM & Admin → Service accounts → Create service account** named `search-console-reader`. No roles. Open it → **Keys → Add key → JSON**. A file downloads.
3. Search Console → the `glideslopepartners.com` property → **Settings → Users and permissions → Add user**: the service account's email address, permission **Full** (needed to submit sitemaps).
4. Store the key, then delete the downloaded file:

   ```bash
   gh secret set GSC_SERVICE_ACCOUNT_JSON < path/to/downloaded-key.json
   ```

   If your property is a URL-prefix property rather than a domain property, also run `gh variable set GSC_PROPERTY --body https://glideslopepartners.com/`.

## 11. Bing Webmaster Tools

<https://www.bing.com/webmasters> → sign in → **Import from Google Search Console** → choose the property. Bing then reads the same sitemap. Nothing to configure in this repository.

## 12. Weekly report email

The report goes to Dave and Phil. The simplest sender is a dedicated Gmail account with an app password (Google limits personal accounts to about 500 messages a day; we send one a week, plus rare alerts).

1. Create a Gmail account, for example `glideslope.reports@gmail.com`. Turn on 2-Step Verification, then <https://myaccount.google.com/apppasswords> → create an app password named `github`.
2. Set the secrets:

   ```bash
   gh secret set SMTP_HOST --body smtp.gmail.com
   gh secret set SMTP_PORT --body 465
   gh secret set SMTP_USER
   gh secret set SMTP_PASSWORD
   gh secret set REPORT_RECIPIENTS
   ```

   `REPORT_RECIPIENTS` is a comma-separated list, for example Dave's and Phil's addresses. Optional: `ALERT_RECIPIENTS` for uptime alerts, if they should go somewhere different.

   Microsoft 365 alternative: `smtp.office365.com`, port `587`, a licensed mailbox with SMTP AUTH enabled for it.

## 13. Uptime alternative (private repository only)

Skip this if the repository is public. Otherwise: <https://uptimerobot.com> → free account → **Add New Monitor** → HTTP(s), `https://glideslopepartners.com/`, every 5 minutes, keyword `Deal value is decided`. Add a second for `/contact/` with keyword `Talk to a partner.` Alert contacts: Dave and Phil. Then delete `.github/workflows/uptime.yml`.

## 14. Optional: let auto-fix pull requests run CI

Pull requests opened with GitHub's built-in token do not trigger other workflows, so CI will not start on an auto-fix pull request until someone closes and reopens it. To avoid that, create a fine-grained token (GitHub → Settings → Developer settings → Fine-grained tokens) for this repository only, with **Contents: Read and write** and **Pull requests: Read and write**, then run `gh secret set AUTOFIX_TOKEN`.

## 15. Approve the preview, then cut over from Figma Sites

1. Open the preview URL from the launch report on a phone and a computer. Check every page, the contact form and the brand video.
2. Tell Claude (or run the steps yourself) when it is approved.
3. Dashboard → **Workers & Pages → glideslope → Custom domains → Set up a domain** → `glideslopepartners.com`. Cloudflare offers to replace the existing `A 204.69.207.1` (Figma) record. Accept.
4. Repeat for `www.glideslopepartners.com`. It replaces the `www` CNAME to `sites.figma.net`.
5. Redirect `www` to the root domain: **Rules → Redirect Rules → Create rule** → name `www to apex` → **Custom filter**: Hostname equals `www.glideslopepartners.com` → **Then:** Dynamic, expression `concat("https://glideslopepartners.com", http.request.uri.path)`, status **301**, **Preserve query string** on. Deploy.
6. Set the production URL so the scheduled jobs check the real domain:

   ```bash
   gh variable set PRODUCTION_URL --body https://glideslopepartners.com
   ```

7. Run **Actions → Daily checks → Run workflow**. It checks every page, the redirects, headers and the certificate on the live domain.
8. Search Console → **Sitemaps** → submit `https://glideslopepartners.com/sitemap.xml` (CI also does this on every deploy that changes it). Then **URL inspection** → `https://glideslopepartners.com/` → **Request indexing**.
9. Remove **DNS Edit** from the Cloudflare API token (step 2).
10. Keep the Figma Sites project for 30 days, then delete it.

## 16. Optional: a weekly Claude task that acts on the report

In Claude, create a scheduled task for Monday at 09:00 Sydney time with a prompt such as:

> Read the newest GitHub issue labelled `weekly-report` in `<account>/glideslopepartners.com`. For each item under Actions that a code change can fix (a broken link, a page that is not indexed because of a page problem, a slow page), open a pull request with the fix. Do not merge anything. List what you did as a comment on the issue.

This uses your existing Claude plan and adds no cost.

---

## Secrets and variables at a glance

| Name | Kind | Where it comes from | Used by |
| --- | --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | GitHub secret | Step 2 | Deploys, rollback, analytics, report |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub secret | Step 2 | Same |
| `CF_WEB_ANALYTICS_SITE_TAG` | GitHub secret | Step 5 | Weekly report |
| `CF_WEB_ANALYTICS_SITE_TOKEN` | GitHub secret, optional | Step 5 alternative | Build (beacon) |
| `TURNSTILE_SITE_KEY` | GitHub secret | Step 4 | Build |
| `TURNSTILE_SECRET_KEY` | Pages project secret | Step 4 | Contact form handler |
| `CONTACT_DESTINATION` | Mailer Worker secret | Step 6 | Enquiry email |
| `GSC_SERVICE_ACCOUNT_JSON` | GitHub secret | Step 10 | Sitemap submission, weekly report |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `REPORT_RECIPIENTS` | GitHub secrets | Step 12 | Weekly report, uptime alerts |
| `ALERT_RECIPIENTS` | GitHub secret, optional | Step 12 | Uptime alerts |
| `AUTOFIX_TOKEN` | GitHub secret, optional | Step 14 | Dead-link pull requests |
| `PRODUCTION_URL` | GitHub variable | Step 15 | Scheduled checks (defaults to the pages.dev address) |
| `LAUNCH_DATE` | GitHub variable | Step 9 | DMARC reminder |
| `GSC_PROPERTY` | GitHub variable, optional | Step 10 | Only for a URL-prefix property |
