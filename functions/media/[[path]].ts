// Serves /media/* with HTTP byte-range support. Cloudflare Pages' static
// serving answers Range requests with the whole file (200), and Safari on
// iPhone and iPad will not play video without 206 Partial Content.
// Files in /media/ carry a version in their name, so they cache for a year.
import type { Env } from '../_lib/env';
import { secure } from '../_lib/headers';

const TYPES: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm', vtt: 'text/vtt; charset=utf-8' };

export function parseRange(header: string | null, size: number): { start: number; end: number } | 'invalid' | null {
  if (!header) return null;
  const m = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (m[1] === '' && m[2] === '')) return 'invalid';
  let start: number;
  let end: number;
  if (m[1] === '') {
    // Suffix range: the last N bytes.
    const n = Number(m[2]);
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return 'invalid';
  return { start, end };
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return secure(new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } }));
  }
  const url = new URL(request.url);
  const asset = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
  if (!asset.ok) return secure(asset);

  const body = await asset.arrayBuffer();
  const size = body.byteLength;
  const ext = url.pathname.split('.').pop() ?? '';
  const headers = new Headers({
    'Content-Type': TYPES[ext] ?? asset.headers.get('Content-Type') ?? 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  const etag = asset.headers.get('ETag');
  if (etag) headers.set('ETag', etag);

  const range = parseRange(request.headers.get('Range'), size);
  if (range === 'invalid') {
    headers.set('Content-Range', `bytes */${size}`);
    return secure(new Response(null, { status: 416, headers }));
  }
  if (range) {
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
    headers.set('Content-Length', String(range.end - range.start + 1));
    const part = request.method === 'HEAD' ? null : body.slice(range.start, range.end + 1);
    return secure(new Response(part, { status: 206, headers }));
  }
  headers.set('Content-Length', String(size));
  return secure(new Response(request.method === 'HEAD' ? null : body, { status: 200, headers }));
};
