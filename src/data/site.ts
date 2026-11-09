export const site = {
  name: 'Glideslope Partners',
  url: 'https://glideslopepartners.com',
  email: 'hello@glideslopepartners.com',
  abn: '19 690 995 585',
  abnDigits: '19690995585',
  locality: 'Sydney',
  region: 'NSW',
  regionName: 'New South Wales',
  linkedin: 'https://www.linkedin.com/company/glideslope-partners',
  clarityIntel: 'https://clarityintel.ai/',
  // Set on the day the site goes live. Shown as "Last updated" on /privacy/.
  privacyUpdated: '2026-11-09',
} as const;

export const topicLabels: Record<string, string> = {
  wealth: 'Wealth',
  regulation: 'Regulation',
  diligence: 'Diligence',
};

export const topicLabel = (t: string) =>
  topicLabels[t] ?? t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ');

/** 9 November 2026 */
export const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' }).format(d);
