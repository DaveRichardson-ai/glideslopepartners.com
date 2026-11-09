// Generates CSS custom properties from brand/tokens.json at build time.
// Exposed to the app as the virtual module `virtual:tokens.css`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TOKENS_PATH = fileURLToPath(new URL('../../brand/tokens.json', import.meta.url));
const VIRTUAL_ID = 'virtual:tokens.css';
// Vite only runs CSS transforms on ids that end in .css.
const RESOLVED_ID = '\0virtual-tokens.css';

// [variable, colour A, colour B, share of A]. Colours are token names or hex.
const DERIVED = [
  ['on-ink-strong', 'text-on-ink', 'text-muted-on-ink', 0.55],
  ['footer-ground', 'ink', '#000000', 0.78],
  ['ink-guide', 'ink-line', 'ink-border', 0.7],
  ['chip-border', 'rule', 'text-muted', 0.82],
  ['image-ground', 'rule', 'paper', 0.55],
  ['link-hover', 'amber-text', '#000000', 0.74],
  ['link-hover-on-ink', 'amber-text-on-ink', 'white', 0.55],
  ['amber-hover', 'amber', 'white', 0.85],
];

/** sRGB mix, the same as CSS color-mix(in srgb, a w, b). */
export function mix(a, b, w) {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v * w + y[i] * (1 - w)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function tokensToCss(tokens) {
  const root = [];
  const ink = [];
  for (const t of tokens.color.tokens) {
    if (typeof t.value === 'string') {
      root.push(`  --${t.name}: ${t.value};`);
    } else {
      root.push(`  --${t.name}: ${t.value.light};`);
      ink.push(`  --${t.name}: ${t.value.dark};`);
    }
  }
  for (const [name, stack] of Object.entries(tokens.type.families)) {
    root.push(`  --font-${name}: ${stack};`);
  }
  for (const group of tokens.type.groups) {
    for (const s of group.styles) {
      root.push(`  --type-${s.name}-size: ${s.fontSize};`);
      root.push(`  --type-${s.name}-line: ${s.lineHeight};`);
      root.push(`  --type-${s.name}-weight: ${s.fontWeight};`);
      if (s.letterSpacing) root.push(`  --type-${s.name}-tracking: ${s.letterSpacing};`);
    }
  }
  for (const t of tokens.spacing.tokens) root.push(`  --${t.name}: ${t.value};`);
  for (const t of tokens.radius.tokens) root.push(`  --${t.name}: ${t.value};`);

  // Design-only tints, mixed from tokens at build time (no color-mix() at
  // runtime, so older Safari and iOS 15 render them too).
  const scalar = Object.fromEntries(
    tokens.color.tokens.filter((t) => typeof t.value === 'string').map((t) => [t.name, t.value]),
  );
  for (const [name, a, b, weight] of DERIVED) {
    const [ca, cb] = [scalar[a] ?? a, scalar[b] ?? b];
    if (!ca.startsWith('#') || !cb.startsWith('#')) continue; // token set without these colours (tests)
    root.push(`  --${name}: ${mix(ca, cb, weight)};`);
  }

  // Home hero approach lines, as a CSS background (no overlay element).
  if (scalar['amber'] && scalar['ink-line']) {
    const guide = mix(scalar['ink-line'], scalar['ink-border'], 0.7);
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 560' preserveAspectRatio='none'>` +
      `<g fill='none' vector-effect='non-scaling-stroke'>` +
      `<line x1='560' y1='40' x2='1440' y2='500' stroke='${guide}' stroke-width='1'/>` +
      `<line x1='760' y1='40' x2='1440' y2='395' stroke='${scalar['amber']}' stroke-width='1.5' stroke-dasharray='2 10'/>` +
      `<line x1='900' y1='500' x2='1440' y2='500' stroke='${guide}' stroke-width='1'/></g></svg>`;
    root.push(`  --hero-lines: url("data:image/svg+xml,${encodeURIComponent(svg)}");`);
  }

  return [
    `/* Generated from brand/tokens.json (${tokens.name}, v${tokens.version}). Do not edit. */`,
    `:root {\n${root.join('\n')}\n}`,
    `/* Themed tokens on ink sections */`,
    `.ink {\n${ink.join('\n')}\n}`,
    '',
  ].join('\n');
}

export function loadTokensCss() {
  return tokensToCss(JSON.parse(readFileSync(TOKENS_PATH, 'utf8')));
}

/** @returns {import('vite').Plugin} */
export function tokensPlugin() {
  return {
    name: 'glideslope-tokens',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        this.addWatchFile(TOKENS_PATH);
        return loadTokensCss();
      }
    },
  };
}
