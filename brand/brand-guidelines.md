# Glideslope Partners

Brand guidelines for Glideslope Partners, a Sydney M&A transition and transformation advisory. These rules cover the logo, colour, type, layout, voice and the Office templates. They apply to the website, LinkedIn, proposals, reports, decks and email.

The idea behind the identity is the approach to a runway. A glideslope is the path an aircraft follows from entry to touchdown. Pilots confirm they are on it by reading four lights beside the runway: two white and two red means on slope. Our mark uses those four lights, with amber in place of red, as the visible sign of a transition that is on track.

## Logo

There are two logo forms. Use the wordmark wherever there is room for it; use the tile where the space is square or very small.

![Wordmark on ink](/_blob/90689e1a78c7111e749f3e395ac4337c)

**Wordmark.** The name in lower-case Inter Tight Medium, ending in the four lights set on the baseline like a full stop. The lights read neutral, neutral, amber, amber from left to right, always in that order.

![Tile](/_blob/a911db9430fd34a897276c5f76f5b149)

**Tile.** The four lights centred on an ink square with rounded corners (`radius-tile`, 22% of the side). Use it for the LinkedIn avatar, app and bookmark icons, and slide footers. At 32 px and below, use the favicon version, where the lights fold into a 2×2 grid so they stay legible.

**Partners descriptor.** For formal documents (engagement letters, report covers, business cards), use the lockup with PARTNERS set beneath the wordmark, aligned left. Elsewhere the wordmark stands alone and the full name appears in text.

### Colour versions

| Ground | Wordmark | Neutral lights | Amber lights | File |
| --- | --- | --- | --- | --- |
| `ink` | `white` | `white` | `amber` | glideslope-wordmark-on-dark |
| `paper` or `white` | `ink` | `ink` | `amber-deep` | glideslope-wordmark-on-light |
| Single colour, dark | `white` | filled | outlined rings | glideslope-wordmark-mono-white |
| Single colour, light | `ink` | filled | outlined rings | glideslope-wordmark-mono-ink |

In single-colour use, the two amber lights become outlined rings so the two-and-two pattern survives without colour.

### Clear space and size

- Clear space on every side equals the width of two lights plus the gap between them. Nothing else sits inside it.
- Minimum width for the wordmark: 96 px on screen, 25 mm in print. Below that, use the tile.
- Minimum tile size: 48 px for the row version; below 48 px use the 2×2 favicon.

### Do not

- Re-type the wordmark. Always use the supplied files, which are outlined and kerned.
- Change the order, colour or number of the lights, or animate them on the logo.
- Capitalise the wordmark, add a full stop after the lights, or set the logo in any other face.
- Place the logo on photographs, on `amber`, or on any ground other than ink, paper or white.
- Stretch, rotate, outline or add a shadow.

## Colour

The palette is deliberately small: ink and paper carry almost everything, and amber is a signal, used sparingly.

| Role | Token | Hex | Use |
| --- | --- | --- | --- |
| Primary dark | `ink` | #0F1C2E | Dark sections, covers, wordmark on light |
| Primary light | `paper` | #F5F4F0 | Page and document ground |
| Raised | `white` | #FFFFFF | Panels on paper |
| Text | `text` | #18212B | Body and headings on light grounds |
| Secondary text | `text-muted` | #4A5563 | Captions and labels on light grounds |
| Rule | `rule` | #DDD9CF | Hairlines and table rules on light grounds |
| Signal on ink | `amber` | #D9A441 | Lights, primary buttons, accent rules on ink |
| Signal on light | `amber-deep` | #B7791F | Lights, chart highlight, accent rules on paper |
| Accent text | `amber-text` | #7A4F12 | Links and eyebrow labels on paper |

Rules:

- Amber is never text on a light ground; use `amber-text` for that. `amber-deep` measures 3.2:1 on white, which is enough for graphics and not for words.
- On ink, buttons are `amber` with `ink` text. On paper, a primary action is an `ink` button with `white` text.
- Aim for roughly 60% paper, 30% ink, under 10% amber across a document or page.

### Charts

Series take colours in this order: `ink`, `amber-deep`, `chart-slate`, `chart-sage`, `chart-stone`. The first two differ strongly in lightness, so the main comparison survives greyscale printing. Highlight one series in amber and leave the rest in ink and stone where the chart has a single point to make. Label lines directly instead of using a legend where space allows.

### Status

Programme status uses the lights before it uses colour. Two neutral and two amber means on track. Three neutral and one amber means ahead or over-scoped. One neutral and three amber means behind. Where a client's reporting requires RAG, use `status-ok`, `amber-deep` and `status-risk`, always with the word written beside the colour.

## Type

| Use | Web face | Office face | Style |
| --- | --- | --- | --- |
| Headings | Inter Tight SemiBold | Arial Bold | Tight tracking (−0.02em) at large sizes |
| Body | Inter Regular | Arial | 17 px on screen, 10.5 pt in documents |
| Labels and eyebrows | IBM Plex Mono Medium | Arial Bold, small caps tracking | Upper case, +0.14em tracking, 12 px |

All three web faces are free from Google Fonts. Office documents use Arial because they travel to client machines where brand fonts are not installed. The logo is always an image, so the identity holds whatever the body face.

Headings are sentence case. Never set body text in Inter Tight or headings in Inter.

## Layout

- Spacing follows the scale `space-1` to `space-28` (4, 8, 16, 24, 32, 48, 64, 112 px). Section padding on the web is `space-28`; card padding is `space-6`.
- Content width on the web is 1200 px with a 24 px gutter, 16 px on phones.
- Structure comes from hairline rules (`rule`) and whitespace, not boxes and shadows. A 2 px `text`-coloured rule above a heading marks the start of a group.
- Corners are small: `radius-sm` for controls, `radius-md` for cards. Nothing is pill-shaped except the lights.
- Alternate paper and ink sections to pace a long page. Do not put two ink sections next to each other.

## Imagery

No stock photography of handshakes, skylines or people pointing at screens. Use the partners' own portraits, shot in natural light on a neutral ground, and diagrams built from the palette. Where a page needs an image and none exists, leave space rather than filling it.

## Voice

See the Voice section. In short: plain, specific, Australian English, and nothing that cannot be substantiated.

## Templates

See the Office templates section for the PowerPoint and Word files and how to use them.
