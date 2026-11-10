import { describe, expect, it } from 'vitest';
import { findPlaceholders } from '../../src/integrations/guards.mjs';
import { loadTokensCss, tokensToCss } from '../../src/integrations/tokens.mjs';
import { readingTime } from '../../src/lib/reading-time';
import { isDue, sydneyToday } from '../../src/lib/schedule.mjs';

describe('placeholder guard', () => {
  it('finds design placeholders in visible text', () => {
    expect(findPlaceholders('<p>Last updated: [launch date]</p>')).toEqual(['[launch date]']);
    expect(findPlaceholders('<p>Wealth · [Date]</p><p>[2–3 weeks] pre-signing</p>')).toEqual(['[Date]', '[2–3 weeks]']);
    expect(findPlaceholders('<p>TODO</p>')).toEqual(['TODO']);
  });
  it('ignores brackets inside scripts, styles and attributes', () => {
    expect(findPlaceholders('<script type="application/ld+json">{"a":["b"]}</script><a href="x[1]">Link</a>')).toEqual([]);
  });
});

describe('tokens', () => {
  it('turns colour tokens into custom properties, with ink overrides for themed ones', () => {
    const css = tokensToCss({
      name: 'T',
      version: 1,
      color: { tokens: [{ name: 'ink', value: '#000' }, { name: 'fg', value: { light: '#111', dark: '#eee' } }] },
      type: { families: { sans: 'Inter' }, groups: [{ styles: [{ name: 'body', fontSize: '17px', lineHeight: '27px', fontWeight: 400 }] }] },
      spacing: { tokens: [{ name: 'space-1', value: '4px' }] },
      radius: { tokens: [{ name: 'radius-sm', value: '4px' }] },
    });
    expect(css).toContain('--ink: #000;');
    expect(css).toMatch(/:root \{[^}]*--fg: #111;/);
    expect(css).toMatch(/\.ink \{[^}]*--fg: #eee;/);
    expect(css).toContain('--font-sans: Inter;');
    expect(css).toContain('--space-1: 4px;');
  });
  it('generates the real brand tokens', () => {
    const css = loadTokensCss();
    expect(css).toContain('--amber: #D9A441;');
    expect(css).toContain('--amber-text: #7A4F12;');
  });
});

describe('reading time', () => {
  it('is words divided by 230, rounded up', () => {
    expect(readingTime('word '.repeat(230))).toBe(1);
    expect(readingTime('word '.repeat(231))).toBe(2);
    expect(readingTime('')).toBe(1);
  });
});

describe('scheduled publishing', () => {
  it('uses the Sydney calendar date', () => {
    // 13:30 UTC on 11 November is 00:30 on 12 November in Sydney (AEDT).
    expect(sydneyToday(new Date('2026-11-11T13:30:00Z'))).toBe('2026-11-12');
    expect(sydneyToday(new Date('2026-11-11T12:30:00Z'))).toBe('2026-11-11');
  });
  it('publishes on or after the publish date only', () => {
    const d = new Date('2026-11-12'); // front matter dates parse as UTC midnight
    expect(isDue(d, '2026-11-11')).toBe(false);
    expect(isDue(d, '2026-11-12')).toBe(true);
    expect(isDue(d, '2026-11-20')).toBe(true);
  });
});

describe('links to articles that are not live yet', () => {
  it('lists only non-draft articles whose date has arrived', async () => {
    const { liveSlugs } = await import('../../src/lib/schedule.mjs');
    const live = liveSlugs('src/content/insights', '2026-11-11');
    expect(live.has('wealth-re-entry')).toBe(true);
    expect(live.has('advice-reforms-bank-re-entry')).toBe(false);
    expect(live.has('stranded-cost')).toBe(true);
    expect(live.has('tsa-material-arrangement')).toBe(true);
    expect(liveSlugs('src/content/insights', '2026-11-12').has('advice-reforms-bank-re-entry')).toBe(true);
  });
});
