---
name: melo-thumbnail
description: Design click-worthy YouTube thumbnails (long video 16:9, 4K) and Shorts covers for "Deutsch mit Melo" in the owner's preferred style, code-rendered. Use when the owner asks for kapak, küçük resim, thumbnail, cover.
---

# Thumbnails

Delegate to ONE Opus agent (design is quality-defining). Source pattern: `episodes/01-das-sagt-kein-deutscher/thumb/thumb.html` (variants via `#a`…`#e`; `#eg` overlays the mobile badge zone; `compare.html` = side-by-side at 1280/360/168 px). Copy it to `episodes/NN/thumb/` and adapt. Render: `node tools/render.js "thumb.html#x" out.png 1280 720 [scale]`.

## Owner-approved style (C3 of episode 1 is the template)
- Genre like Avenox / Forn AI (genre only): **one big expressive Melo** (smug raised-brow side-eye, pointing), **giant condensed text** (Anton, white + yellow `#FFC83A`, thick black outline + soft shadow), saturated dark background with glow; for wrong-vs-right topics a **diagonal red ✗ / green ✓ split** with ink-stamp discs under each text; translucent **German flag** (≈30 %) waving behind; small „B1–C1“ tag top-centre; optional supporting cast reaction (e.g. shocked pear `kollegin`) + tiny red „FALSCH!“ stamp.
- **Hard rules** (owner feedback): text never overlaps the character; keep the **mobile duration badge zone (bottom-right ~22 % × 18 %) empty**; readable at 168 px wide; correct caps orthography („HEIẞ“ with U+1E9E — load `brand/fonts/anton-latin-ext-400-normal.woff2` via unicode-range so ẞ renders in Anton); ≤ 4 words per text block.
- Make 2–3 variants (main + challenger for YouTube „Test & Compare“) and a comparison image incl. the badge overlay; Read at most 3 images.

## Export
`thumbnail.png` 1280×720 + **4K master**: render at scale 3 → `*-4k.png` (3840×2160) and `*-4k.jpg` with quality tuned **< 2 MB** (YouTube upload limit; upload the JPG).

## Shorts covers
Produced by `tools/make-short.py` from the `cover` block (1080×1920; key content inside the central 1080×1080).
- **Every Short cover is hand-designed and different** (owner: identical-template covers look like copies). Own HTML per Short in `shorts/NN/cover/cover.html` (patterns: `shorts/01-ich-bin-heiss/cover/` diagonal fire split, `shorts/02-ich-bin-voll/cover/` 3-row beer-hall table); own colour world, layout and headline per Short; key content in central 1080×1080, top 180 / bottom 420 px decoration only; PNG < 2 MB (or JPG). The owner's favourite style is the ep2 long thumbnail B (diagonal warm/cold split, „HEUTE 50 | MORGEN 3“).
