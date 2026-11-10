# YouTube channel art – Deutsch mit Melo

Everything is drawn with code: Melo comes from `../concepts/b/melo-b.js`, and the scenery uses `scene-ink.js`, which is built on the same ink primitives (`MeloB._Ink`).

| Page | Output | Size |
|---|---|---|
| `banner.html` | `../out/youtube-banner.png` | 2560×1440, PNG under 6 MB |
| `banner-safe-preview.html` | `../out/youtube-banner-safe-preview.png` | 1600×1000: TV, desktop and safe-area outlines |
| `banner-mobile-preview.html` | `../out/youtube-banner-mobile-preview.png` | 1546×423: the safe crop that phones show |
| `profile.html` | `../out/youtube-profile.png`, `../out/youtube-profile-2048.png` | 800×800 and a 2048×2048 master |
| `profile-preview.html` | `../out/youtube-profile-preview.png` | The avatar as a circle at 800, 176, 98 and 48 px, on white and on #0f0f0f |

## Render (from the repo root)

```bash
node tools/render.js brand/channel/banner.html brand/out/youtube-banner.png 2560 1440
node tools/render.js brand/channel/banner-safe-preview.html brand/out/youtube-banner-safe-preview.png 1600 1000
node tools/render.js brand/channel/banner-mobile-preview.html brand/out/youtube-banner-mobile-preview.png 1546 423

node tools/render.js brand/channel/profile.html brand/out/youtube-profile.png 800 800
node tools/render.js brand/channel/profile.html brand/out/youtube-profile-2048.png 800 800 2.56
node tools/render.js brand/channel/profile-preview.html brand/out/youtube-profile-preview.png 1400 1800
```

Render the banner and the profile picture before their preview pages, because the preview pages load the PNGs from `../out/`.
To check the layout, open `banner.html#guides`, which outlines the safe area in blue and the desktop strip in red, or `profile.html#guides`, which outlines the visible circle.

## Banner zones (2560×1440)

- **Safe area, shown on every device:** x 507–2053, y 508.5–931.5 (1546×423). It holds the wordmark *Deutsch mit Melo*, the slogan *Deutsch mit Kern*, the tagline *B1 · B2 · C1 — Deutsch lernen. Nur auf Deutsch.*, the badge *Jede Woche neue Videos* and Melo's face. The right edge of this area is left calm.
- **Desktop strip:** y 508.5–931.5 across the full width. It adds the chalkboard (der/die/das, Wo?/Wohin?, ~~Ich bin heiß.~~ → Mir ist heiß.) and the desk (sticky notes "Na, alles klar?" and "ä · ö · ü / ß ≠ B", a mug that says "DOCH!", and a stack of books).
- **TV only:** the area above and below the strip. It has bunting with Ä Ö Ü ß, the sign "Redewendung der Woche: „Das ist mir Wurst.“", a clock at *fünf vor zwölf*, the board header "Heute: Konjunktiv II", Melo's full figure, a sideboard with a globe, a watermelon tagged "Nicht essen!" and a box of vocabulary cards, a wastebasket and the floor.

## Tuning

- `window.LAYOUT` (set it before the script runs) can override the type layout: `wx` sets the left edge, `w1` the width of "Deutsch", `b1`/`b2` the baselines, `fsS` the slogan size, `bx`/`by`/`br` the badge position and radius, and `badge:false` hides the badge.
- `window.PFP` in `profile.html` sets the avatar framing: `cx`/`cy` place the centre of the head, `h` is the head height in px, `tilt` the head tilt, `outline` the width of the bold silhouette, plus `pencil` and `look`.
- **File size:** the fine paper grain (`#gFine`, opacity .34) costs the most bytes. The banner PNG is about 5.6 MB. If later additions push it over 6 MB, lower that opacity or export a JPG: `python3 -c "from PIL import Image; Image.open('brand/out/youtube-banner.png').convert('RGB').save('brand/out/youtube-banner.jpg', quality=93, subsampling=0)"` gives about 1.5 MB.

## Fonts

The wordmark uses **Fraunces 900**, upright and italic, from `@fontsource/fraunces` under the SIL OFL. Its woff2 files are copied into `../fonts/`. The other type uses Oswald, which matches the earlier material, and Caveat and Kalam for handwriting and chalk.
