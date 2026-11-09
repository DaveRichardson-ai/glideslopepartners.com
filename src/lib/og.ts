import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p));

type Tok = { name: string; value: string | { light: string; dark: string } };
const tokens = JSON.parse(read('brand/tokens.json').toString()) as { color: { tokens: Tok[] } };
const colour = (name: string) => {
  const t = tokens.color.tokens.find((x) => x.name === name);
  if (!t || typeof t.value !== 'string') throw new Error(`Unknown colour token ${name}`);
  return t.value;
};

const fonts = [
  { name: 'Inter Tight', weight: 600 as const, data: read('node_modules/@fontsource/inter-tight/files/inter-tight-latin-600-normal.woff') },
  { name: 'Inter Tight', weight: 500 as const, data: read('node_modules/@fontsource/inter-tight/files/inter-tight-latin-500-normal.woff') },
  { name: 'IBM Plex Mono', weight: 500 as const, data: read('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff') },
].map((f) => ({ ...f, style: 'normal' as const }));

const wordmark = `data:image/svg+xml;base64,${read('assets/logo/glideslope-wordmark-on-dark.svg').toString('base64')}`;

type El = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): El => ({
  type,
  props: { style, children, ...extra },
});

export async function renderOg({ eyebrow, title, byline }: { eyebrow: string; title: string; byline?: string }) {
  const size = title.length > 70 ? 54 : title.length > 45 ? 62 : 72;
  const tree = h(
    'div',
    {
      width: 1200,
      height: 630,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      background: colour('ink'),
      fontFamily: 'Inter Tight',
      position: 'relative',
    },
    [
      h('div', { position: 'absolute', left: 520, top: 0, width: 760, height: 1, background: colour('ink-line'), transform: 'rotate(28deg)', transformOrigin: '0 0' }),
      h('img', { width: 312, height: 56 }, undefined, { src: wordmark, width: 312, height: 56 }),
      h('div', { display: 'flex', flexDirection: 'column' }, [
        h(
          'div',
          {
            fontFamily: 'IBM Plex Mono',
            fontSize: 22,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: colour('amber-text-on-ink'),
            marginBottom: 24,
          },
          eyebrow,
        ),
        h('div', { fontSize: size, lineHeight: 1.08, fontWeight: 600, letterSpacing: '-0.025em', color: colour('white'), maxWidth: 1000 }, title),
      ]),
      h(
        'div',
        {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `1px solid ${colour('ink-line')}`,
          paddingTop: 24,
          fontSize: 24,
          fontWeight: 500,
          color: colour('text-muted-on-ink'),
        },
        [h('div', {}, byline ?? 'Glideslope Partners · Sydney'), h('div', {}, 'glideslopepartners.com')],
      ),
    ],
  );
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
