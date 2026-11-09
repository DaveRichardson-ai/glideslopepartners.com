export interface Env {
  ASSETS: Fetcher;
  /** Service binding to the glideslope-mailer Worker (Email Routing send_email). */
  MAILER?: Fetcher;
  /** Workers Analytics Engine dataset for count-only events. */
  EVENTS?: AnalyticsEngineDataset;
  TURNSTILE_SECRET_KEY?: string;
  /** Local development and tests only: accept enquiries without sending email. */
  DEV_SKIP_EMAIL?: string;
}

// Cloudflare's published always-pass test secret. Used only when no secret is set,
// so previews work before setup; production must set TURNSTILE_SECRET_KEY.
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

export function track(env: Env, event: string, blobs: string[] = []) {
  try {
    env.EVENTS?.writeDataPoint({ indexes: [event], blobs: [event, ...blobs], doubles: [1] });
  } catch {
    // Analytics must never break a request.
  }
}
