# Build glideslopepartners.com — brief for a Claude Code session

You are building the production website for **Glideslope Partners**, a Sydney M&A transition and transformation advisory. The design, copy, brand and content are finished and are in this build pack. Your job is to turn them into a fast, secure, findable static site on free infrastructure, with automated weekly reporting and automated remediation of common faults.

Work autonomously. Where a step genuinely needs the owner (creating an account, approving DNS, entering a secret), stop at that step, write exactly what they must click in `SETUP.md`, and carry on with everything else. Never ask for passwords or tokens in chat; secrets go in via `gh secret set` or the Cloudflare dashboard.

Owner: Dave Richardson, Managing Partner. Co-founder: Philip Hyde. Business: Glideslope Partners, ABN 19 690 995 585, Sydney NSW. Public email: hello@glideslopepartners.com. Language: Australian English throughout.

---

## 1. What is in the build pack

| Path | What it is | How to use it |
| --- | --- | --- |
| `design/*.dc.html` | The approved page designs, one file per page, plus `Header` and `Footer` components | The visual and copy source of truth. Reproduce layout, spacing, type and copy faithfully. They are self-contained HTML with inline styles and a small templating syntax (`<x-dc>`, `<dc-import>`, `{{accent}}` = `#D9A441`). Do not ship them; rebuild them as clean components. Links like `Services.dc.html` map to the real routes in section 3. Images referenced as `/_blob/3429c4…` are `assets/portraits/david-richardson.jpg`; `/_blob/08a74b…` is `assets/portraits/philip-hyde.jpg`. |
| `brand/tokens.json` | Colour, type, spacing and radius tokens | Generate CSS custom properties from this file at build time. Do not hand-copy hex values. |
| `brand/brand-guidelines.md` | Logo, colour, type, layout and imagery rules | Follow it. Image references inside it point to an internal store; ignore those. |
| `brand/voice.md` | Writing rules and banned words | Any copy you add (meta descriptions, alt text, error messages, 404, form states) must follow it. |
| `assets/logo/` | Outlined SVG logos, PNG exports, favicon set | Use the SVGs inline or as files. Never re-typeset the wordmark. |
| `assets/portraits/` | Partner portraits, 600×600 JPEG | Serve as responsive AVIF/WebP with JPEG fallback. |
| `content/insights/*.md` | Three insight articles with front matter | Load as a content collection (section 5). All three are `draft: true` pending partner review. |

Read every file in `design/` and `brand/` before writing code.

## 2. Non-negotiables (definition of done)

The site is not done until every item passes, verified by commands you run and record in `docs/launch-report.md`:

1. **Zero broken links**, internal and external, including `mailto:`, anchors and every link in the footer and articles (lychee).
2. **Zero console errors or warnings** on every page in Chromium (Playwright).
3. **Zero HTML validation errors** (html-validate) and zero `astro check` / TypeScript errors.
4. **Lighthouse 100 / 100 / 100 / 100** (Performance, Accessibility, Best Practices, SEO) on mobile for every page template; never below 95 on any page.
5. **Core Web Vitals budgets**: LCP < 1.5 s, CLS < 0.02, INP < 100 ms on Lighthouse mobile; total JS shipped < 15 KB on every page except Contact; no render-blocking third-party resources.
6. **WCAG 2.2 AA**: axe and pa11y report zero violations; keyboard-only navigation works; visible focus; skip link; `prefers-reduced-motion` respected; contrast per tokens.
7. **Security headers grade A+** equivalent: the header set in section 8 present on every response, verified with curl.
8. **Full site map**: `sitemap.xml` lists every indexable URL and nothing else; `robots.txt` references it; every page reachable within two clicks of home.
9. **Responsive**: no horizontal scroll at 320, 375, 768, 1024, 1440 px; screenshots of every page at 375 and 1440 committed to `docs/screenshots/`.
10. **Old URLs redirect** with 301 (section 3) and the domain cut-over loses no traffic.

## 3. Site map and routes

| Route | Source design | Index? | Notes |
| --- | --- | --- | --- |
| `/` | `Main.dc.html` | yes | Home. The "Talk to a partner" form section posts to the contact endpoint. |
| `/services/` | `Services.dc.html` | yes | In-page anchors `#transition`, `#transformation`, `#start`. |
| `/about/` | `About.dc.html` | yes | Two partners only: David Richardson and Philip Hyde. |
| `/insights/` | `Insights.dc.html` | yes | Index of published articles, newest first. Feature the newest. |
| `/insights/topic/{wealth,regulation,diligence}/` | `Insights.dc.html` | yes | Topic chips on the index are real links to these pages (no client-side filter). Generate only topics that have published articles. |
| `/insights/{slug}/` | `Article.dc.html` | yes | Article template rendering the markdown; author box, related articles, sources, disclaimer. |
| `/contact/` | `Contact.dc.html` | yes | Contact form. |
| `/contact/thanks/` | new, styled like Contact | no (`noindex`) | Confirmation after submission. |
| `/privacy/` | `Privacy.dc.html` | yes | Set "Last updated" to the launch date. |
| `/404` | `NotFound.dc.html` | no | Served for all unknown paths with status 404. |
| `/rss.xml` | generated | n/a | RSS of published insights. |
| `/.well-known/security.txt` | generated | n/a | Contact `mailto:hello@glideslopepartners.com`, expiry one year out, canonical URL. |

Primary navigation: Services · About · Insights · **Talk to a partner** (button to `/contact/`). Footer per `Footer.dc.html`, including the ABN and the Privacy link. On small screens the nav may wrap as designed or collapse into a `<details>` disclosure; either way it must work without JavaScript.

**If no insights are published** (all `draft: true`), the build must automatically: hide "Insights" from nav and footer, hide the home page insights section, skip generating `/insights/**` and `/rss.xml`, and omit them from the sitemap. When the first article is set to `draft: false`, everything appears on the next build. Add a test for both states.

**Redirects (301)** from the current Figma Sites URLs, in Cloudflare `_redirects`:

```
/what-we-do        /services/    301
/who-we-are        /about/       301
/get-in-touch      /contact/     301
/privacy_policy    /privacy/     301
/index.html        /             301
```

Also redirect `www.glideslopepartners.com/*` to the apex with a 301 (Cloudflare redirect rule), and enforce trailing-slash consistency.

## 4. Stack (all free)

- **Astro** (latest stable) with `output: 'static'`, TypeScript strict, no UI framework. Components in `.astro`. Zero client JavaScript except: the analytics beacon, the click-tracking snippet (section 9, < 1 KB, inline-hashed or external file), and Cloudflare Turnstile on the contact form.
- **CSS**: plain CSS with custom properties generated from `brand/tokens.json`. No Tailwind, no CSS-in-JS. One stylesheet, hashed and cached.
- **Fonts**: self-host via `@fontsource-variable/inter-tight`, `@fontsource-variable/inter` and `@fontsource/ibm-plex-mono` (500). Latin subset only, `font-display: swap`, preload only the Inter Tight file used above the fold. No Google Fonts requests at runtime.
- **Images**: `astro:assets` with AVIF and WebP, explicit width and height, `loading="lazy"` below the fold, `fetchpriority="high"` on none unless an image is the LCP element.
- **Hosting**: Cloudflare Pages (free), deployed from GitHub. The domain `glideslopepartners.com` is registered with Cloudflare Registrar (confirm in the dashboard), so DNS is already on Cloudflare. The current site is on Figma Sites; cut over only after the preview passes section 2.
- **Forms and events**: Cloudflare Pages Functions (Workers free tier).
- **CI/CD and scheduled jobs**: GitHub Actions. Recommend a **public** repository (unlimited free minutes; nothing secret lives in the code). If the owner wants it private, keep scheduled jobs within the 2,000 free minutes a month and say so in `SETUP.md`.

Before relying on any free tier below, check the provider's current documentation and record the limit you found in `docs/free-tier-limits.md`. If a free tier has changed, pick the nearest free alternative and note it.

## 5. Content model

Content collection `insights` with a Zod schema:

```ts
{
  title: string; description: string (≤ 160 chars); slug: string;
  topic: 'wealth' | 'regulation' | 'diligence' | string;
  author: 'david-richardson' | 'philip-hyde';
  publishDate: Date | null; updatedDate?: Date; draft: boolean;
}
```

Authors in `src/data/authors.ts`:

- `david-richardson`: David Richardson, Managing Partner, portrait `david-richardson.jpg`, LinkedIn `https://www.linkedin.com/in/david-p-richardson/`, author-box line: "Led the AMP Advice separation and the AMP Capital separations to DigitalBridge and Dexus in prior roles."
- `philip-hyde`: Philip Hyde, Founding Partner, portrait `philip-hyde.jpg`, LinkedIn `https://www.linkedin.com/in/philip-hyde-sydney/`, author-box line: "Led technology and data separations across more than 270 applications, including AMP Life to Resolution Life."

Build-time guards (fail the build with a clear message):

- A non-draft article with `publishDate: null`.
- A non-draft article containing `[verify`, `[check`, `[Date]`, `[Name]` or `TODO`.
- Any page containing a square-bracket placeholder from the designs (`[launch date]`, `[Date]`, etc.) at build time.

Reading time = words ÷ 230, rounded up. Tables in articles render in a horizontally scrollable wrapper as in `Article.dc.html`. Pull quotes are optional; do not invent them.

## 6. Contact form

- Progressive enhancement: a normal `<form method="post" action="/api/contact">` that works without JavaScript, redirecting to `/contact/thanks/` on success and back to `/contact/?error=…` with an accessible error summary on failure.
- Fields as designed: name (required), organisation, work email (required, validated), transaction stage (select), message (required, 20–5,000 chars). Add a hidden honeypot field and a minimum time-to-submit check.
- **Cloudflare Turnstile** (free), verified server-side in the function. Load the Turnstile script on `/contact/` and the home contact section only.
- Delivery: Cloudflare Email Routing with an Email Worker `send_email` binding, sending to the owner's verified destination address with `Reply-To` set to the enquirer. Subject: `Website enquiry: {name}, {organisation}`. No database, no storage of submissions.
- Rate limit: one Cloudflare rate-limiting rule (free plan) on `/api/contact`, e.g. 5 requests per 10 minutes per IP.
- Log a count-only event (no personal data) to Analytics Engine for reporting.

## 7. Search and discoverability

- Unique `<title>` (≤ 60 chars, pattern `Page — Glideslope Partners`) and meta description (≤ 155 chars) for every page, written to `brand/voice.md`.
- Canonical URLs, `lang="en-AU"`, Open Graph and Twitter tags, and a branded 1200×630 OG image per page and per article, generated at build time (Satori or equivalent) from the tokens and the on-dark wordmark.
- JSON-LD: `ProfessionalService` on home (name, url, logo, email, `taxID` = ABN, `address.addressLocality` Sydney, `addressRegion` NSW, `addressCountry` AU, `areaServed` AU, `sameAs` LinkedIn company page); `Person` for each partner on About; `Article` with author and dates on each insight; `BreadcrumbList` on insights and articles. Validate with the Schema.org validator.
- `@astrojs/sitemap` with `lastmod`; exclude `noindex` pages. `robots.txt` allows all and points to the sitemap.
- Favicons: SVG favicon, `favicon.ico` (16/32/48), 180 px apple-touch-icon, and a web manifest using the tile.
- Google Search Console: a property for the domain already exists for the owner. After cut-over, submit the sitemap via the API in CI (section 10). Import the property into Bing Webmaster Tools (free) and note the step in `SETUP.md`.
- Semantic HTML: one `h1` per page, logical heading order, descriptive link text, `alt` text on portraits ("David Richardson", "Philip Hyde").

## 8. Security

`public/_headers` for every path:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com https://challenges.cloudflare.com; connect-src 'self' https://cloudflareinsights.com; frame-src https://challenges.cloudflare.com; img-src 'self' data:; style-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
X-Frame-Options: DENY
```

No inline scripts or styles (configure Astro so stylesheets are external; if a tiny inline script is unavoidable, add its SHA-256 hash to the CSP rather than `'unsafe-inline'`). Long-lived `Cache-Control: public, max-age=31536000, immutable` on hashed assets; short cache on HTML.

Cloudflare settings to apply (via API where possible, otherwise list in `SETUP.md`): Always Use HTTPS, minimum TLS 1.2, TLS 1.3 on, automatic HTTPS rewrites, DNSSEC on, Bot Fight Mode on, HSTS preload submission once stable. Email DNS: SPF, DKIM and DMARC records for the domain's mail provider (start DMARC at `p=none` with reporting to hello@, move to `p=quarantine` after four clean weeks; the weekly job should remind).

Dependabot for npm and GitHub Actions. `npm audit --audit-level=high` in CI.

## 9. Analytics and click tracking (free, cookieless)

- **Cloudflare Web Analytics** (free, no cookies, no consent banner required) for visits, page views, referrers, countries, devices and Core Web Vitals. Add the beacon via Pages settings or the snippet.
- **Click tracking**: a sub-1 KB first-party script that sends `navigator.sendBeacon('/api/event', …)` for clicks on elements with `data-track` (all CTAs, "Talk to a partner" buttons, `mailto:` links, LinkedIn and ClarityIntel outbound links, insight cards, form submit success). Payload: event name, page path, target label, timestamp bucket. No cookies, no IP storage, no user identifiers. The `/api/event` Pages Function writes to **Workers Analytics Engine** (free tier) and drops bots by user-agent.
- **Google Search Console API** for impressions, clicks, CTR, average position, top queries and top pages.
- Update the privacy policy text only if what you implement differs from what `Privacy.dc.html` says; it currently describes exactly this set-up.

## 10. Automation: weekly reports and self-healing

Implement these as GitHub Actions workflows with clear names. Everything a workflow cannot fix itself becomes a GitHub Issue assigned to the repo owner with the label `needs-human`.

### On every pull request and push to `main`

`astro check` → build → html-validate → lychee (internal links blocking; external links warn) → Playwright console-error crawl of every built page → axe + pa11y → Lighthouse CI with the budgets in section 2 as assertions → header check against the Cloudflare preview URL. Deploy to production only if all pass (`wrangler pages deploy` from the workflow, not Cloudflare's own Git build, so the gate is enforced).

### Daily (02:00 AEST)

- Crawl the live site: every sitemap URL returns 200, 301s still resolve, no 404s from internal links, security headers intact, TLS certificate > 14 days to expiry, `robots.txt` and `sitemap.xml` reachable.
- External link check. For a dead external link: open a PR that swaps it for a Wayback Machine snapshot if one exists, otherwise removes the link and keeps the text; label `auto-fix`.
- If any production check fails right after a deploy: automatically roll back to the previous successful Cloudflare Pages deployment via the API, then open a `needs-human` issue with the failure output.

### Hourly uptime

A lightweight check of `/` and `/contact/` (status 200, expected text present, < 1 s). Two consecutive failures open an issue and email the owner. If the repo is private and minutes are tight, use UptimeRobot's free plan instead and document it.

### Weekly report (Mondays 07:00 Sydney time)

Collect for the previous Monday–Sunday and compare with the week before:

- Visits, page views and unique visitors (Cloudflare Web Analytics GraphQL API); top pages; top referrers; countries; devices.
- Core Web Vitals (p75 LCP, CLS, INP) from real visitors.
- Click events by type and page (Analytics Engine SQL API): CTA clicks, mailto clicks, outbound clicks, insight card clicks, contact form submissions.
- Search Console: impressions, clicks, CTR, position, top 10 queries, top 10 pages, any URLs not indexed (URL Inspection API across the sitemap, within quota).
- Health: uptime percentage, failed checks, auto-fix PRs opened and merged, dependency updates applied, open `needs-human` issues.
- Lighthouse scores for each page template, run against production.

Output: a concise markdown report (headline numbers first, then tables, then "what changed and why it matters" in three to five plain sentences, then actions). Deliver it two ways: as a GitHub Issue labelled `weekly-report`, and by email to the addresses in the `REPORT_RECIPIENTS` secret (Dave and Phil) using free SMTP (a Gmail app password on a dedicated sender, or Cloudflare Email Routing if it can send to both verified destinations). Write all report numbers from API data; never estimate.

### Auto-remediation scope

| Fault | Automatic action |
| --- | --- |
| Dependency patch or minor update | Dependabot PR, auto-merged when CI passes |
| Dependency major update or failed auto-merge | `needs-human` issue |
| Dead external link | PR with archive link or link removed |
| Broken internal link, validation, accessibility or performance regression | Blocked in CI; never reaches production |
| Production check fails after deploy | Automatic rollback plus issue |
| Sitemap changed | Resubmit to Search Console via API |
| URL not indexed | Listed in weekly report with the inspection reason |
| Security header missing | CI fails; headers are in the repo, so the next deploy restores them |
| Uptime failure | Issue and email after two consecutive failures |

Optionally, document in `SETUP.md` how the owner can add a weekly Claude scheduled task that reads the latest `weekly-report` issue and opens fix PRs for anything still open. This uses the owner's existing Claude plan and adds no cost.

## 11. Secrets and owner setup

Create `SETUP.md` with numbered, click-by-click steps for the owner, and list each secret with where to get it and the minimum permissions:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Pages deploys and APIs |
| `CLOUDFLARE_API_TOKEN` | Scoped token: Pages Edit, Account Analytics Read, Zone Read, DNS Edit (cut-over only), Analytics Engine Read |
| `CF_WEB_ANALYTICS_SITE_TAG` | Web Analytics queries |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Contact form |
| `CONTACT_DESTINATION` | Verified Email Routing destination for enquiries |
| `GSC_SERVICE_ACCOUNT_JSON` | Google Cloud service account added as a user on the Search Console property |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `REPORT_RECIPIENTS` | Weekly report email |

Use placeholders and skip-with-warning behaviour until each secret exists, so CI stays green while setup is in progress.

## 12. Cut-over from Figma Sites

1. Build and verify everything on the `*.pages.dev` preview.
2. Owner confirms the preview.
3. Add the custom domain in Cloudflare Pages; switch DNS records from Figma Sites; confirm HTTPS.
4. Verify every redirect in section 3 and every route in the sitemap on the live domain.
5. Submit the sitemap in Search Console; request indexing for the home page.
6. Keep the Figma Sites project for 30 days, then remove it.

## 13. Copy and content rules

- Use the copy in the designs verbatim, except placeholders in square brackets, which must be resolved or removed before launch (the build guard enforces this).
- Australian English (organisation, programme, analyse, licence). Dates as 9 November 2026.
- Do not add statistics, client names, testimonials or claims not in the pack. Track record is always described as "led by our partners in prior roles".
- Only two people appear on the site: David Richardson (Managing Partner) and Philip Hyde (Founding Partner).

## 14. Deliverables

1. The repository with the site, functions, workflows, tests and `README.md` (how to run, add an article, publish an article, and where reports appear).
2. `SETUP.md` for the owner's one-time steps.
3. `docs/launch-report.md` with evidence for every item in section 2: commands run, outputs, Lighthouse scores per page, screenshots.
4. `docs/free-tier-limits.md`.
5. A short "how to publish a new insight" section: add a markdown file to `src/content/insights/`, set `draft: false` and `publishDate`, open a PR; CI does the rest.

Report back with: the preview URL, the launch report, anything that needs the owner, and any place you departed from this brief and why.
