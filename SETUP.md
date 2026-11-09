# Owner set-up

These are the one-time steps only the owner can do: accounts, keys, DNS and approvals. Do them in order. Each step says what to click. Nothing here costs money.

Never paste a key or password into a chat, an issue or a file in this repository. Keys go in two places only: **GitHub secrets** (`gh secret set NAME`, which prompts for the value) and **Cloudflare** (the dashboard, or `npx wrangler … secret put`, which also prompts).

Until a secret exists, the job that needs it skips with a warning and CI stays green.

---

## Status on 9 November 2026

Steps 0–7, 9–11 and 15 are done, and the site is live on `glideslopepartners.com`. Still open: the GitHub ruleset in step 1, most of step 8, and the dated reminders (DMARC in step 9, HSTS preload in step 8, Figma clean-up in step 15). The steps below are kept as a record and for rebuilding from scratch.

## Decisions already made

1. **Repository:** public, at <https://github.com/DaveRichardson-ai/glideslopepartners.com>. GitHub Actions minutes are unlimited for public repositories, and nothing secret lives in the code.
2. **Enquiries go to `hello@glideslopepartners.com`**, set up as a free shared mailbox that Dave and Phil both see (step 0).

---

## 0. Make hello@ a shared mailbox (Microsoft 365, free)

The domain's email runs on Microsoft 365. A **shared mailbox** costs nothing: it needs no licence and no password, holds up to 50 GB, and appears automatically in the Outlook of everyone you give access to. Both partners see the same inbox, can reply as `hello@`, and can see what the other has answered.

### First, check what hello@ is today

1. Go to <https://admin.microsoft.com> and sign in as a Microsoft 365 admin.
2. In the search box at the top, type `hello@glideslopepartners.com`.
   - **Nothing found:** go to "Create the shared mailbox" below.
   - **It is a user** (it has its own licence and password): you can convert it instead. **Users → Active users →** select it → **Mail** tab → **Convert to shared mailbox → Convert**. Its existing mail is kept. Then, under **Licences and apps**, untick the licence and **Save** so you stop paying for it. Skip to "Give both partners access".
   - **It is an alias on someone's mailbox** (it shows under a person's **Username and email → Aliases**): remove the alias first (**Users → Active users →** that person → **Manage username and email** → delete `hello@` → **Save changes**). Wait 15 minutes, then create the shared mailbox below.
   - **It is a distribution list or Microsoft 365 group:** delete or rename it under **Teams & groups**, then create the shared mailbox.

### Create the shared mailbox

1. Admin centre → **Teams & groups → Shared mailboxes → Add a shared mailbox**.
2. **Name:** `Glideslope Partners`. This is the name people see when you reply. **Email:** `hello`, domain `glideslopepartners.com`. **Save changes**.

### Give both partners access

1. On the confirmation page, choose **Add members to this mailbox** (or later: **Shared mailboxes →** `Glideslope Partners` **→ Members → Edit**).
2. **Add members:** Dave and Phil. **Save**. This gives each of them **Read and manage** and **Send as**.
3. Optional, so replies show who answered: **Shared mailboxes →** `Glideslope Partners` → **Sent items** → tick **Copy items sent as this mailbox** so sent replies are visible to both partners, not just the sender.

### Use it

- **Outlook on the web or desktop:** the mailbox appears in each partner's folder list within an hour, with no sign-in. To reply as hello@, open the message and reply. To start a new email from it, click **From** (turn it on under **Options → Show From**) and choose `hello@glideslopepartners.com`.
- **iPhone (Outlook app):** **Settings → Add shared mailbox →** `hello@glideslopepartners.com`. The built-in iPhone Mail app does not support shared mailboxes; use the Outlook app.

### Things a shared mailbox cannot do

- **No password, so no direct sign-in.** That is why the weekly report is sent from a separate free Gmail account (step 12) rather than from hello@.
- **It can still receive verification emails.** Cloudflare's "verify destination address" email (step 6) and the DMARC reports (step 9) arrive in the shared inbox like any other mail. Either partner can click the link.

---

## 1. GitHub repository

Created and pushed. Remaining settings:

Open <https://github.com/DaveRichardson-ai/glideslopepartners.com/settings>. You land on **General**.

**A. Allow auto-merge** (Dependabot updates need it)

1. On the **General** page, scroll down past **Features** to the **Pull Requests** section.
2. Tick **Allow auto-merge**. Also tick **Automatically delete head branches** to keep the branch list tidy. Both save as soon as you tick them.

**B. Protect `main`** (stops a failing change reaching production)

Do this after the first CI run has finished: the check you need to pick only appears once it has run.

1. Left sidebar, under **Code, planning, and automation**: click **Rulesets** (not Branches).
2. **New ruleset → New branch ruleset**.
3. **Ruleset name:** `main`. **Enforcement status:** Active.
4. **Bypass list → Add bypass → Repository admin → Add selected.** This lets you, as the owner, still push straight to `main` in an emergency. Leave it empty if you would rather everything goes through a pull request.
5. **Target branches → Add target → Include default branch.**
6. Under **Rules**, leave **Restrict deletions** and **Block force pushes** ticked, then tick:
   - **Require a pull request before merging.** Set **Required approvals** to **0**. GitHub does not let you approve your own pull request, so 1 would block you whenever you work alone.
   - **Require status checks to pass → Add checks →** type `Build and verify` and pick it (source: GitHub Actions). Leave **Require branches to be up to date before merging** unticked.
7. Click **Create** at the bottom.

**C. Production environment**

1. Left sidebar: **Environments → New environment**. Name: `production` → **Configure environment**.
2. Leave everything as it is and click **Save protection rules**. Tick **Required reviewers** and add yourself only if you want to approve every deploy by hand.

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

The site adds the Cloudflare beacon itself, on `glideslopepartners.com` only (Cloudflare rejects it on preview addresses). So the dashboard's automatic injection must stay **off**, or every visit is counted twice.

1. Dashboard → **Observability → Analytics → Web analytics** → **Add a site** (or the existing `glideslopepartners.com` site → **Manage site**). Choose **Enable with JS Snippet installation** → **Update**.
2. From the snippet, copy the **token** value (32 letters and numbers). Pasting the whole snippet also works; the build extracts the token.

   ```bash
   gh secret set CF_WEB_ANALYTICS_SITE_TOKEN
   ```

3. Open the site's charts. The address bar contains `siteTag~in=` followed by the **site tag**, which the weekly report uses.

   ```bash
   gh secret set CF_WEB_ANALYTICS_SITE_TAG
   ```

## 6. Enquiry email (Email Sending on a subdomain)

**Important:** the domain's email runs on Microsoft 365. **Do not onboard `glideslopepartners.com` to Email _Routing_**: its "Verify DNS records" screen adds Cloudflare MX records and a new SPF record on the root domain, which would stop your email. The website only needs to *send*, so it uses Cloudflare **Email Sending** on the `notify.` subdomain.

1. Dashboard → **Compute → Email Service → Email Sending → Onboard domain**. **Zone:** `glideslopepartners.com`. **Subdomain:** `notify`. **Continue**.
2. On **Verify DNS records**, check that every hostname ends in `notify.glideslopepartners.com`: three MX and one SPF on `cf-bounce.notify.…`, DKIM on `cf-bounce._domainkey.notify.…`, and DMARC `p=reject` on `_dmarc.notify.…`. The strict DMARC policy covers only the subdomain, and the website's mail passes it because Cloudflare signs it. Then **Activate**.
3. **Email Service → Email Routing → Destination addresses → Add destination address:** `hello@glideslopepartners.com`. This list belongs to the account and does not onboard the domain to routing. The verification email lands in the shared mailbox (step 0); either partner clicks the link. Sending to a verified destination address is free on every plan.
4. Store the destination as a secret on the mailer Worker:

   ```bash
   cd workers/mailer
   npx wrangler secret put CONTACT_DESTINATION
   cd ../..
   ```

   For your records, also run `gh secret set CONTACT_DESTINATION` (CI does not read it).
5. Send a test enquiry from the preview site. The email arrives from `website@notify.glideslopepartners.com` with Reply-To set to the person who wrote it.

## 7. Rate limit on the contact form

The Free plan allows one rate-limiting rule with a **10-second** window only, so the brief's "5 per 10 minutes" is not available. The closest setting:

1. Dashboard → `glideslopepartners.com` → **Security → Security rules** (older screens: WAF) → **Create rule → Rate limiting rule**.
2. Name: `contact form`. **If incoming requests match:** URI Path equals `/api/contact`. The free plan does not offer Request Method here, and it is not needed: only the form posts to that address.
3. **With the same characteristics:** IP. **When rate exceeds:** 5 requests per 10 seconds. **Then:** Block for 10 seconds. **Deploy.**

Turnstile, the hidden honeypot field and the three-second minimum fill time do the rest.

## 8. Cloudflare security settings

On `glideslopepartners.com`:

1. **SSL/TLS → Overview:** Full (strict).
2. **SSL/TLS → Edge Certificates:** Always Use HTTPS **on**; Minimum TLS Version **1.2**; TLS 1.3 **on**; Automatic HTTPS Rewrites **on**. Leave HSTS off here: the site sends its own HSTS header.
3. **DNS → Settings:** DNSSEC → **Enable**. Cloudflare Registrar adds the DS record for you.
4. **Bot Fight Mode: leave off.** On the free plan it challenges every automated visitor and cannot exempt our own uptime, daily and Lighthouse checks from GitHub. Turnstile and the rate limit protect the form.
5. **Email Address Obfuscation** (Security → Settings, or Scrape Shield): **off**. When on, Cloudflare rewrites every `mailto:` link into a `/cdn-cgi/l/email-protection` link that fails without JavaScript. Turned off on 9 November 2026.
6. **After four clean weeks live (from 7 December 2026):** submit the domain at <https://hstspreload.org>. The header is already preload-ready. This is hard to undo, so wait until you are sure every subdomain serves HTTPS.

## 9. Email authentication (SPF, DKIM, DMARC)

Done on 9 November 2026: SPF (already correct for Microsoft 365), DKIM signing on, DMARC `p=none`.

1. **DKIM.** <https://security.microsoft.com/dkimv2> → select `glideslopepartners.com` → **Create DKIM keys**. It shows two CNAME records (`selector1._domainkey` and `selector2._domainkey`, pointing to `…glideslopepartners.e-v1.dkim.mail.microsoft`). Add both in Cloudflare DNS with **proxy off** (DNS only). Wait 15–60 minutes, then switch **Sign messages for this domain with DKIM signatures** on. A "CNAME record does not exist" error only means Microsoft has not seen the records yet.
2. **DMARC.** Cloudflare DNS → **Add record**: Type `TXT`, Name `_dmarc`, Content:

   ```
   v=DMARC1; p=none; rua=mailto:hello@glideslopepartners.com; adkim=r; aspf=r
   ```

3. After four weeks of clean reports (only Microsoft 365 and Cloudflare passing), change `p=none` to `p=quarantine`, from **7 December 2026**. The weekly report reminds you; it counts from the `LAUNCH_DATE` variable (2026-11-09).

## 10. Google Search Console (reports and sitemap submission)

1. <https://console.cloud.google.com> → project picker (top left) → **New project** → `glideslope-reporting`. New projects appear under the picker's **All** tab, not Recent. Then **APIs & Services → Library** → enable **Google Search Console API** in *that* project. A 403 "API has not been used in project …" means it was enabled somewhere else.
2. **IAM & Admin → Service accounts → Create service account** named `search-console-reader`. No roles. Open it → **Keys → Add key → JSON**. A file downloads.
3. Search Console → the `glideslopepartners.com` property → **Settings → Users and permissions → Add user**: the service account's email address, permission **Full** (needed to submit sitemaps).
4. Store the key, then delete the downloaded file:

   In PowerShell:

   ```powershell
   Get-Content -Raw "C:/Users/<you>/Downloads/<key-file>.json" | gh secret set GSC_SERVICE_ACCOUNT_JSON
   ```

   In Git Bash or macOS: `gh secret set GSC_SERVICE_ACCOUNT_JSON < path/to/key.json`

   To test it: **Actions → Submit sitemap → Run workflow**.

   If your property is a URL-prefix property rather than a domain property, also run `gh variable set GSC_PROPERTY --body https://glideslopepartners.com/`.

## 11. Bing Webmaster Tools

<https://www.bing.com/webmasters> → sign in → **Import from Google Search Console** → choose the property. Bing then reads the same sitemap. Nothing to configure in this repository.

## 12. Weekly report and alerts by email

**Default, with no extra account: GitHub notifications.** Every report and alert is a GitHub issue assigned to the repository owner, and GitHub emails the owner about it.

1. <https://github.com/settings/notifications> → **Email** → choose the address reports should go to.
2. To include Phil: <https://github.com/DaveRichardson-ai/glideslopepartners.com/settings/access> → **Add people** (he needs a free GitHub account). On the repository page he clicks **Watch → Custom → Issues**.

The SMTP secrets below stay unset, and the jobs skip their own email with a warning.

**Optional: direct email from the jobs**, only if you want the report as a plain email rather than a GitHub notification. A dedicated Gmail account with an app password works (Google limits personal accounts to about 500 messages a day):

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

   Microsoft 365 alternative: `smtp.office365.com`, port `587`, with a *licensed* mailbox that has SMTP AUTH turned on. The shared hello@ mailbox cannot do this, because it has no password.

## 13. Uptime alternative (private repository only)

Skip this if the repository is public. Otherwise: <https://uptimerobot.com> → free account → **Add New Monitor** → HTTP(s), `https://glideslopepartners.com/`, every 5 minutes, keyword `We plan and run separations`. Add a second for `/contact/` with keyword `Talk to a partner.` Alert contacts: Dave and Phil. Then delete `.github/workflows/uptime.yml`.

## 14. Optional: let auto-fix pull requests run CI

Pull requests opened with GitHub's built-in token do not trigger other workflows, so CI will not start on an auto-fix pull request until someone closes and reopens it. To avoid that, create a fine-grained token (GitHub → Settings → Developer settings → Fine-grained tokens) for this repository only, with **Contents: Read and write** and **Pull requests: Read and write**, then run `gh secret set AUTOFIX_TOKEN`.

## 15. Cut over from Figma Sites (done 9 November 2026)

1. Approve the preview on a phone and a computer.
2. **Workers & Pages → glideslope → Custom domains → Set up a custom domain** → `glideslopepartners.com`. Cloudflare replaces `A 204.69.207.1` (Figma) with a CNAME to `glideslope-d65.pages.dev`; MX, SPF, DKIM and DMARC records are untouched. **Activate domain.**
3. **DNS → Records → `www`** (was a CNAME to `sites.figma.net`) → target `glideslopepartners.com`, proxy **on**.
4. **Rules → Redirect Rules → Create rule** → `www to apex` → **Wildcard pattern**. Request URL `http*://www.glideslopepartners.com/*` (covers http and https), Target URL `https://glideslopepartners.com/${2}`, **301**, **Preserve query string** on. If Cloudflare warns that the rule "may not apply to your traffic", choose **Ignore and deploy rule anyway**: the warning misreads `http*`.
5. **SSL/TLS → Edge Certificates → Always Use HTTPS: on.**
6. Set the production URL so the scheduled jobs check the real domain:

   ```bash
   gh variable set PRODUCTION_URL --body https://glideslopepartners.com
   ```

7. Run **Actions → Daily checks → Run workflow** to check every page, the redirects, headers and the certificate on the live domain.
8. **Actions → Submit sitemap → Run workflow** (deploys also resubmit it when the pages change). Then in Search Console: **URL inspection** → `https://glideslopepartners.com/` → **Request indexing**. The API cannot do this step.
9. Remove **DNS Edit** from the Cloudflare API token (step 2); nothing automated needs it any more.
10. Keep the Figma Sites project until **9 December 2026**, then delete it.

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
| `CONTACT_DESTINATION` | Mailer Worker secret | Step 6 | Enquiry email (`hello@glideslopepartners.com`) |
| `GSC_SERVICE_ACCOUNT_JSON` | GitHub secret | Step 10 | Sitemap submission, weekly report |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `REPORT_RECIPIENTS` | GitHub secrets | Step 12 | Weekly report, uptime alerts |
| `ALERT_RECIPIENTS` | GitHub secret, optional | Step 12 | Uptime alerts |
| `AUTOFIX_TOKEN` | GitHub secret, optional | Step 14 | Dead-link pull requests |
| `PRODUCTION_URL` | GitHub variable | Step 15 | Scheduled checks (defaults to the pages.dev address) |
| `LAUNCH_DATE` | GitHub variable | Step 9 | DMARC reminder |
| `GSC_PROPERTY` | GitHub variable, optional | Step 10 | Only for a URL-prefix property |
