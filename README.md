# glideslopepartners.com

The website for Glideslope Partners: a static Astro site on Cloudflare Pages, with a contact form, cookieless click tracking, automated checks on every change, and scheduled jobs that report weekly and fix common faults.

- **Owner set-up (one time):** [SETUP.md](SETUP.md)
- **Evidence that the site meets the brief:** [docs/launch-report.md](docs/launch-report.md)
- **Free-tier limits we rely on:** [docs/free-tier-limits.md](docs/free-tier-limits.md)
- **The original brief:** [docs/brief.md](docs/brief.md)

## Run it locally

You need Node 24 or later.

```bash
npm ci
npm run dev            # http://localhost:4321, live reload
```

To run it the way Cloudflare runs it (headers, redirects and the contact form Functions included):

```bash
npm run build
cp .dev.vars.example .dev.vars   # accepts enquiries locally without sending email
npm run preview                  # http://127.0.0.1:8788
```

## Check everything

```bash
npm run check                    # astro check + TypeScript for the Functions
npx vitest run                   # unit tests
node scripts/test-insight-states.mjs   # build guards must stop bad articles
bash scripts/build-states.sh     # builds dist/ and dist-published/ (fixture articles published)
npx html-validate "dist/**/*.html" "dist-published/**/*.html"
npx playwright test              # pages, console, axe, layout, forms, 10 browsers and devices
bash scripts/check-links.sh dist # lychee: every internal and external link
node scripts/check-mailto.mjs dist
node scripts/pa11y.mjs           # needs the two local servers (npm run preview, and dist-published on 8789)
npx lhci autorun --config=lighthouserc.cjs
```

CI runs all of this on every pull request. On Windows, if Firefox and WebKit will not start (some antivirus tools remove their executables), run them in Docker:

```bash
docker run -d --name pw -p 127.0.0.1:3000:3000 --init --ipc=host -w /home/pwuser mcr.microsoft.com/playwright:v1.65.0-noble npx -y playwright@1.65.0 run-server --port 3000 --host 0.0.0.0
```

```bash
PW_REMOTE=ws://127.0.0.1:3000/ npx playwright test
```

## How it fits together

| Part | Where |
| --- | --- |
| Pages and layout | `src/pages/`, `src/layouts/Base.astro`, `src/components/` |
| Styles | `src/styles/global.css` (one stylesheet). Colours, type, spacing and radii come from `brand/tokens.json` through `src/integrations/tokens.mjs` |
| Insight articles | `src/content/insights/*.md`, schema in `src/content.config.ts` |
| Partners | `src/data/authors.ts` |
| Contact form handler | `functions/api/contact.ts`; error messages without JavaScript in `functions/contact/_middleware.ts` |
| Click events | `src/scripts/track.ts` (under 1 KB) → `functions/api/event.ts` → Workers Analytics Engine |
| Enquiry email | `workers/mailer` (a separate Worker: Pages Functions cannot send email themselves) |
| Security headers, cache rules, redirects | `public/_headers`, `public/_redirects` |
| Build guards | `src/integrations/guards.mjs` (placeholder text), `src/lib/insights.ts` (article checks) |
| Workflows | `.github/workflows/` |
| Scheduled job scripts | `scripts/ops/` |

## Publish a new insight

1. Add a markdown file to `src/content/insights/`, for example `src/content/insights/day-one-checklist.md`. Copy the front matter from an existing article:

   ```yaml
   ---
   title: "Your Day 1 checklist"
   description: "One or two sentences, 160 characters or fewer. This is the search snippet and the card text."
   slug: day-one-checklist
   topic: diligence        # wealth, regulation, diligence, or a new lower-case topic
   author: philip-hyde     # or david-richardson
   publishDate: 2026-12-01
   draft: false
   featured: true          # optional: pins it to the top of Insights
   ---
   ```

2. Write the article in markdown below the front matter. Use `##` headings, normal markdown tables (they scroll sideways on phones), and a `## Sources` section with links.
3. Open a pull request. CI checks the article and every page. A partner reviews the preview link that CI posts.
4. Merge. The site deploys, the sitemap is resubmitted to Google, and the new or changed pages are sent to Bing through IndexNow (`scripts/ops/indexnow.mjs`; the key file `public/d5768351a0ab8b16050a54556b60b791.txt` must stay in place).

**To schedule an article,** set `draft: false` and a future `publishDate`, then merge as usual. The build leaves the article out until that date (Sydney time). The Scheduled publish workflow runs at about 7 am each morning and redeploys the site when an article is due. Because a scheduled article is checked when it is merged, it must be finished by then.

The build stops with a clear message if a published or scheduled article (`draft: false`) has no `publishDate`, or still contains `[verify`, `[check`, `[Date]`, `[Name]` or `TODO`. Keep `draft: true` until both partners have reviewed it.

While every article is a draft, the site hides Insights everywhere: navigation, footer, home page, sitemap and RSS. The first published article brings all of it back on the next build. A new topic gets its own page at `/insights/topic/<topic>/` automatically.

## Where reports appear

- **Weekly report:** Mondays at 07:00 Sydney time, as a GitHub issue labelled `weekly-report` and by email to `REPORT_RECIPIENTS`.
- **Problems automation cannot fix:** GitHub issues labelled `needs-human`, assigned to the repository owner.
- **Dead external links:** pull requests labelled `auto-fix`.
- **Every CI run:** the run summary has the Lighthouse table; full reports are kept as run artifacts for 14 days.
