# Launch report

Built and verified on 9 November 2026.

**Preview:** <https://glideslope-d65.pages.dev> (Cloudflare Pages project `glideslope`). The live domain still serves the Figma site. The cut-over is SETUP.md step 15, after the owner approves the preview.

Every result below comes from a command run on this date. The raw output is in [`docs/evidence/`](evidence/).

Two builds are tested throughout:

- **`dist/`**, the site as it is. All three insight articles are `draft: true` pending partner review, so Insights is hidden everywhere.
- **`dist-published/`**, the same site built from test copies of the three articles marked as published (`tests/fixtures/insights-published/`). This proves the Insights index, topic pages, article template, RSS and sitemap entries work before any article goes live. The test copies have the `[verify …]` notes removed; the real articles still contain them, and the build guard will stop them going live until the notes are resolved.

## Summary against the definition of done

| # | Requirement | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Zero broken links (internal, external, mailto, anchors) | **Pass.** 0 errors: 213 links in `dist`, 469 in `dist-published`, plus the mailto address and MX record | [08-links.txt](evidence/08-links.txt) |
| 2 | Zero console errors or warnings in Chromium | **Pass** on every page of both builds (one documented exception: the 404 page itself) | [07-playwright.txt](evidence/07-playwright.txt) |
| 3 | Zero HTML validation and type errors | **Pass.** html-validate: 0 errors in 21 files. `astro check` and Functions `tsc`: 0 errors, 0 warnings | [05-html-validate.txt](evidence/05-html-validate.txt), [01-check.txt](evidence/01-check.txt) |
| 4 | Lighthouse 100/100/100/100 mobile on every template | **Pass.** 100 in all four categories on all 9 templates, 3 runs each (lowest score shown) | [10-lighthouse.md](evidence/10-lighthouse.md) |
| 5 | LCP < 1.5 s, CLS < 0.02, INP < 100 ms; JS < 15 KB; no third-party render-blocking | **Pass.** LCP 0.77–0.80 s; CLS 0.000–0.015; TBT 0 ms (lab stand-in for INP); JS 358 B to 1.5 KB a page; no third-party render-blocking | [10-lighthouse.md](evidence/10-lighthouse.md), Playwright JS budget test |
| 6 | WCAG 2.2 AA: axe and pa11y zero; keyboard; focus; skip link; reduced motion | **Pass.** axe: 0 violations on 19 URLs. pa11y (axe + HTML_CodeSniffer): 19/19. Keyboard, focus, skip link and reduced-motion tests pass | [09-pa11y.txt](evidence/09-pa11y.txt), [07-playwright.txt](evidence/07-playwright.txt) |
| 7 | Security headers on every response | **Pass** on the live preview: static pages, Function responses, redirects and video | [12-preview-headers.txt](evidence/12-preview-headers.txt), [11-preview-site-check.txt](evidence/11-preview-site-check.txt) |
| 8 | Full site map; robots; two clicks from home | **Pass.** Sitemap lists exactly the indexable pages; noindex pages are excluded; every page is within two clicks | Playwright `site.spec`, `crawl.spec` |
| 9 | No horizontal scroll at 320–1440 px; screenshots | **Pass** at 320, 375, 768, 1024 and 1440 px. 42 screenshots at 375 and 1440 px | [screenshots/](screenshots/) |
| 10 | Old URLs 301; no traffic lost at cut-over | **Pass on the preview** (all five 301 to the right page). The `www` redirect and DNS switch are SETUP.md step 15 | [12-preview-headers.txt](evidence/12-preview-headers.txt) |

Also added at the owner's request during the build:

| Request | Result |
| --- | --- |
| Works in other browsers and on iPhones | **Pass.** 82 tests across Chromium, Google Chrome, Microsoft Edge, Firefox, Safari's engine (WebKit), iPhone 15, iPhone SE, iPad and Android (Pixel 7), on both builds. 34 tests repeated against the live Cloudflare preview. See "Cross-browser" below |
| Use the brand sting video | On the About page, in a new "Why Glideslope" section. See "Brand video" below |
| Add Melbourne and Brisbane | Added to the home-page eyebrow: "M&A transition · Transformation · Sydney · Melbourne · Brisbane". Also on the home-page social sharing image |

## Commands run

```bash
npm run check                          # 01: 0 errors
npx vitest run                         # 02: 18 passed
node scripts/test-insight-states.mjs   # 03: both bad articles stop the build
bash scripts/build-states.sh           # 04: 7 + 14 pages, placeholder guard clean
npx html-validate "dist/**/*.html" "dist-published/**/*.html"   # 05
npm audit --audit-level=high           # 06: exit 0 (2 moderate, build-time only)
PW_REMOTE=ws://127.0.0.1:3000/ npx playwright test --workers=3  # 07: 82 passed
bash scripts/check-links.sh dist && bash scripts/check-links.sh dist-published && node scripts/check-mailto.mjs dist   # 08
node scripts/pa11y.mjs                 # 09: 19/19 URLs
npx lhci autorun --config=lighthouserc.cjs   # 10: all assertions pass, 27 runs
node scripts/ops/site-check.mjs https://glideslope-d65.pages.dev --tls   # 11
curl -sI … (headers, redirects, byte ranges, Function responses)        # 12
BASE_URL=https://glideslope-d65.pages.dev npx playwright test compat site …   # 13: 34 passed
```

## Lighthouse (mobile, local Cloudflare runtime)

| Page | Perf | A11y | Best practice | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| / | 100 | 100 | 100 | 100 | 0.78 s | 0.000 | 0 ms |
| /about/ | 100 | 100 | 100 | 100 | 0.80 s | 0.012 | 0 ms |
| /contact/ | 100 | 100 | 100 | 100 | 0.78 s | 0.000 | 0 ms |
| /contact/thanks/ | 100 | 100 | 100 | 100 | 0.77 s | 0.001 | 0 ms |
| /privacy/ | 100 | 100 | 100 | 100 | 0.78 s | 0.003 | 0 ms |
| /services/ | 100 | 100 | 100 | 100 | 0.78 s | 0.011 | 0 ms |
| /insights/ | 100 | 100 | 100 | 100 | 0.78 s | 0.015 | 0 ms |
| /insights/topic/regulation/ | 100 | 100 | 100 | 100 | 0.78 s | 0.015 | 0 ms |
| /insights/wealth-re-entry/ | 100 | 100 | 100 | 100 | 0.78 s | 0.011 | 0 ms |

The weekly report repeats this against production, so real-network scores are on record from the first Monday after launch.

## Cross-browser

| Browser or device | Engine | Pages render, fonts and styles load, no errors, no sideways scroll | Contact form sends | Video decodes |
| --- | --- | --- | --- | --- |
| Google Chrome (installed) | Chromium | Pass | Pass | Pass, plays |
| Microsoft Edge (installed) | Chromium | Pass | Pass | Pass, plays |
| Firefox | Gecko | Pass | Pass | Format check only* |
| Safari, desktop | WebKit | Pass | Pass | Pass (decoded)** |
| iPhone 15 | WebKit, touch, 393 px | Pass | Pass | Pass (decoded)** |
| iPhone SE | WebKit, touch, 320 px | Pass | Pass | Pass (decoded)** |
| iPad | WebKit, touch | Pass | Pass | Pass (decoded)** |
| Android, Pixel 7 | Chromium, touch | Pass | Pass | Pass, plays |

\* Playwright's test build of Firefox ships without the H.264 decoder that the Firefox you download includes. The test confirms the file is served correctly and skips playback.
\*\* Headless WebKit decodes the video fully (`readyState` 4, no media error) but does not advance the playback clock, so playback progress is asserted in Chromium only.

Also checked on every device: tap targets of 24 px or more; form fields at 16 px so iOS Safari does not zoom on focus; `playsinline` on the video. All colour tints are mixed at build time rather than with `color-mix()`, and JavaScript targets Safari 14+, so iOS 14 and later render the site correctly.

The cross-browser tests found three real problems, all fixed:

1. **Video on iPhone and iPad.** Cloudflare Pages answers byte-range requests with the whole file (`200`). Safari on iOS will not play video without `206 Partial Content`. The video now comes from `/media/`, through a small Function that answers ranges properly. Verified live: `206`, `Content-Range: bytes 0-1/114312`.
2. **Older Safari and iOS 15.** My first stylesheet used `color-mix()`, which Safari before 16.2 ignores, so the footer background and some text colours would have disappeared. The tints are now computed from the brand tokens at build time.
3. **Logo link name.** HTML_CodeSniffer, through pa11y, flagged that the logo link's image had empty alt text. The image now carries the link's name.

## Brand video

`glideslope-brand-sting.mp4` (24 seconds, silent) sits on the About page in a new ink section, "Why Glideslope", between "Why we started" and "Partners". The text beside it is the brand guidelines' own explanation of the name, so no new claims are added.

- Re-encoded from 1080p High@5.0 (258 KB) to 720p H.264 High@4.0 (112 KB), with `faststart`, so every iPhone can play it.
- No autoplay. It has controls, `playsinline` and `preload="none"`, so it costs nothing at page load and respects reduced motion.
- The poster is the wordmark frame. A WebVTT captions track describes what happens on screen.
- Plays are counted as a `video` event in the weekly report.

## Departures from the brief, and why

1. **Rate limit is 5 requests per 10 seconds, not per 10 minutes.** The Free plan's single rate-limiting rule allows only a 10-second window. Turnstile, the honeypot field and the 3-second minimum fill time cover the rest. SETUP.md step 7.
2. **Enquiry email goes through a separate Worker, from `website@notify.glideslopepartners.com`.** Pages Functions cannot hold a `send_email` binding, so a small private Worker (`workers/mailer`, no public URL) sends it through a service binding. The domain's email runs on Microsoft 365, and enabling Email Routing on the root domain would replace its MX records and stop the firm's email. So Email Routing goes on the `notify.` subdomain only.
3. **The contact form needs JavaScript for its spam check.** Turnstile only runs with JavaScript. The form still posts without it, and the no-JavaScript error summary works (rendered at the edge), but a submission without a Turnstile token is refused. A `<noscript>` note gives the email address instead. Accepting tokenless posts would let every script-free spam bot through.
4. **The header and footer use the supplied SVG wordmark,** not the live-typeset "glideslope" text in the mock-ups. The brand guidelines forbid re-typesetting the wordmark.
5. **Placeholder durations resolved, not invented.** The home page's "[2–3 weeks]", "[2 weeks]" and "[3–4 weeks]" use the same figures that `Services.dc.html` already states without brackets. "[launch date]" on Privacy is 9 November 2026. "[Date]" on insight cards comes from each article's `publishDate`.
6. **Unique visitors are not reported.** Cloudflare Web Analytics is cookieless and has no unique-visitor count. The report says so rather than estimating.
7. **Privacy policy: one sentence added** under Site analytics, disclosing the first-party click and enquiry counts (no cookies, IP addresses or identifiers). The brief asked for an update only where the build differs from the design, and this is that difference.
8. **Article titles over 38 characters are shortened in `<title>`** (ending in "…") to keep `Page — Glideslope Partners` within 60 characters. The full title stays in the H1, Open Graph tags and structured data.
9. **Trailing slashes.** The five old Figma URLs and `/index.html` return 301. A missing trailing slash (`/about` → `/about/`) is Cloudflare's built-in `308`, which search engines treat the same as a 301.
10. **pa11y "needs review" results are warnings.** axe cannot compute contrast for text over a background image (the home hero's approach lines), so it marks that text "needs review", and pa11y reports those as errors by default. I set pa11y's `levelCapWhenNeedsReview: "warning"` and checked the hero by hand. The text sits on ink at 15:1 or better, and the amber button's ink text at about 8:1. Real violations still fail the build.
11. **The 404 page logs one console message.** A browser always logs "Failed to load resource: 404" for a page served with status 404, which the brief requires. The console test allows that one message on that one page only. Lighthouse cannot audit a 404 response at all, so the 404 page is covered by axe, pa11y, html-validate and Playwright instead.
12. **INP in the lab is measured as Total Blocking Time** (0 ms on every page). INP needs real interactions. The weekly report shows the real-visitor p75 INP from Cloudflare.
13. **Firefox and WebKit ran in Docker on this PC.** Something on this machine, probably antivirus, deletes their executables after install. They ran in Microsoft's official Playwright image instead, and CI runs them natively on Linux.
14. **Melbourne and Brisbane** were added only to the home eyebrow and its share image. The footer, contact details and the structured-data address still say Sydney, New South Wales, because they describe where the business is based. Say if you want offices listed there too.

## Needs the owner

In order. Full click-by-click steps are in [SETUP.md](../SETUP.md).

1. **Approve the preview** at <https://glideslope-d65.pages.dev>. Until steps 4–6 are done, it runs on Cloudflare's always-pass Turnstile test key, and the contact form answers "not taking messages yet".
2. **Shared mailbox:** make `hello@glideslopepartners.com` a free Microsoft 365 shared mailbox for both partners (SETUP.md step 0), then finish the GitHub settings (step 1). The public repository is at <https://github.com/DaveRichardson-ai/glideslopepartners.com>.
3. **Secrets:** Cloudflare API token and account ID, Turnstile keys, Web Analytics site tag, Search Console service account, SMTP for the weekly report.
4. **Email Routing on `notify.glideslopepartners.com`** and the verified destination address (step 6). Do **not** enable it on the root domain.
5. **DKIM and DMARC.** Checked today: DKIM is not turned on for Microsoft 365, and there is no DMARC record (step 9).
6. **Privacy policy check.** It says email is handled by Google, but the domain's mail runs on **Microsoft 365**. That is a statement about your business, so I have not changed it. Change "Google (email)" to "Microsoft (email)" if Microsoft 365 is your only email provider.
7. **Confirm the three engagement durations** (2–3 weeks, 2 weeks, 3–4 weeks) still hold.
8. **Partner review of the three insights.** Each still contains `[verify …]` or `[check …]` notes; the build will not publish an article until they are resolved.
9. **Cut-over** (step 15), then HSTS preload after four clean weeks.

## What is deployed now

- Cloudflare Pages project `glideslope`, production branch `main`, at <https://glideslope-d65.pages.dev>. Not yet attached to any custom domain.
- Worker `glideslope-mailer`, with no public URL. It is reachable only from the Pages project and sends nothing until `CONTACT_DESTINATION` is set.
- Public GitHub repository <https://github.com/DaveRichardson-ai/glideslopepartners.com>, with no secrets set yet, so the deploy jobs skip with a warning.
- Nothing has changed in DNS, Email Routing, Turnstile or Web Analytics.
