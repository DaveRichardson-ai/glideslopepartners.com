import { defineConfig, devices } from '@playwright/test';

// Two local Cloudflare Pages runtimes (wrangler pages dev), so _headers,
// _redirects and the Functions behave as in production:
//  - default:   the site as it is (all insights are drafts)
//  - published: the same site built with fixture articles published
const BASE = process.env.BASE_URL;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  projects: [
    {
      name: 'default',
      use: { baseURL: BASE ?? 'http://127.0.0.1:8788' },
      testIgnore: /published\.spec/,
    },
    {
      name: 'published',
      use: { baseURL: 'http://127.0.0.1:8789' },
      testMatch: /(published|crawl|a11y|compat)\.spec/,
    },
    // Cross-browser and device coverage.
    ...(
      [
        ['firefox', devices['Desktop Firefox']],
        ['webkit-desktop-safari', devices['Desktop Safari']],
        ['iphone-15', devices['iPhone 15']],
        ['iphone-se', devices['iPhone SE']],
        ['ipad', devices['iPad (gen 7)']],
        ['android-pixel-7', devices['Pixel 7']],
        ['edge', { ...devices['Desktop Edge'], channel: process.env.CI ? undefined : 'msedge' }],
        ['chrome', { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' }],
      ] as const
    ).map(([name, device]) => ({
      name,
      use: {
        ...device,
        // HTTPS locally too: the CSP's upgrade-insecure-requests makes Safari/WebKit
        // upgrade every subresource, exactly as in production.
        baseURL: BASE ?? 'https://127.0.0.1:8790',
        ignoreHTTPSErrors: !BASE,
        // PW_REMOTE runs Firefox/WebKit in the official Playwright Docker image
        // (for Windows machines where those browsers cannot run natively).
        ...(process.env.PW_REMOTE && device.defaultBrowserType !== 'chromium'
          ? { connectOptions: { wsEndpoint: process.env.PW_REMOTE, exposeNetwork: '<loopback>' } }
          : {}),
      },
      testMatch: /compat\.spec/,
    })),
  ],
  webServer: BASE
    ? undefined
    : [
        {
          command: 'npx wrangler pages dev dist --port 8788 --inspector-port 9288 --ip 127.0.0.1 --binding DEV_SKIP_EMAIL=1',
          url: 'http://127.0.0.1:8788/',
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: 'npx wrangler pages dev dist --port 8790 --inspector-port 9290 --ip 127.0.0.1 --local-protocol https --binding DEV_SKIP_EMAIL=1',
          url: 'https://127.0.0.1:8790/',
          ignoreHTTPSErrors: true,
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: 'npx wrangler pages dev dist-published --port 8789 --inspector-port 9289 --ip 127.0.0.1 --binding DEV_SKIP_EMAIL=1',
          url: 'http://127.0.0.1:8789/',
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
});
