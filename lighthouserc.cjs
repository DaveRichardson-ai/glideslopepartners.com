// Lighthouse CI: mobile (the default), every page template, budgets from the brief.
// LHCI_BASE / LHCI_BASE_PUBLISHED override the local wrangler servers (e.g. in CI or against production).
const base = process.env.LHCI_BASE || 'http://127.0.0.1:8788';
const pub = process.env.LHCI_BASE_PUBLISHED || 'http://127.0.0.1:8789';
const urls = [
  `${base}/`,
  `${base}/services/`,
  `${base}/about/`,
  `${base}/contact/`,
  `${base}/contact/thanks/`,
  `${base}/privacy/`,
  ...(process.env.LHCI_SKIP_PUBLISHED ? [] : [`${pub}/insights/`, `${pub}/insights/topic/regulation/`, `${pub}/insights/wealth-re-entry/`]),
];

module.exports = {
  ci: {
    collect: {
      url: urls,
      numberOfRuns: Number(process.env.LHCI_RUNS || 3),
      settings: {
        chromeFlags: '--headless=new --no-sandbox',
        // noindex pages are deliberately not indexable; that is not an SEO fault.
        skipAudits: ['is-crawlable'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 1, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 1500, aggregationMethod: 'median-run' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.02 }],
        'total-blocking-time': ['error', { maxNumericValue: 100, aggregationMethod: 'median-run' }],

        'errors-in-console': ['error', { maxLength: 0 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports' },
  },
};
