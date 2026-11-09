// Cookieless click tracking. Sends event name, path, label and a 10-minute
// timestamp bucket for clicks on [data-track] (and plays of tracked videos).
// No identifiers, no storage.
const send = (el: HTMLElement) => {
  if (!navigator.sendBeacon) return;
  const body = JSON.stringify({
    e: el.dataset.track,
    p: location.pathname,
    l: (el.dataset.trackLabel || el.textContent || '').trim().slice(0, 80),
    b: Math.floor(Date.now() / 6e5),
  });
  navigator.sendBeacon('/api/event', new Blob([body], { type: 'application/json' }));
};

document.addEventListener(
  'click',
  (e) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-track]');
    if (el && el.dataset.track !== 'video') send(el);
  },
  { capture: true },
);

// 'play' does not bubble, so listen in the capture phase.
document.addEventListener(
  'play',
  (e) => {
    const el = e.target as HTMLElement;
    if (el.dataset?.track === 'video' && !el.dataset.played) {
      el.dataset.played = '1';
      send(el);
    }
  },
  { capture: true },
);

// Cloudflare Web Analytics, on the production domain only. The analytics site
// is registered for glideslopepartners.com, and Cloudflare rejects (with
// console errors) beacons from preview and local addresses.
const beaconToken = document.body.dataset.cfBeacon;
if (beaconToken && /(^|\.)glideslopepartners\.com$/.test(location.hostname)) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.dataset.cfBeacon = JSON.stringify({ token: beaconToken });
  document.head.append(s);
}
