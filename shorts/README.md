# Shorts (1080×1920) cut from the weekly episode

One long video per week + 5 Shorts (one per weekday). Each Short is a folder `shorts/NN-slug/` with a small
`short.json`; everything else is generated.

```bash
python3 tools/make-short.py shorts/NN-slug/short.json --plan    # snap times, print text + duration (no render)
python3 tools/make-short.py shorts/NN-slug/short.json --sheet   # render → out/short.mp4 + out/cover.png (+ out/contact.jpg)
python3 tools/make-short.py shorts/NN-slug/short.json --cover   # only the cover
python3 shorts/check-meta.py shorts/NN-slug/meta.md             # title ≤ 60 chars, #shorts, tags literally in title/description
```
Time: ≈ 55 ms per episode frame on 4 workers (≈ 1 min for a 50-s Short) + ≈ 1.5 min graphics/encode.
Engine renders are cached per time range in `build/seg-<from>-<to>.mp4`, so changing title, cover, subtitles or
`crop_x` re-runs in ~1.5 min. Needs the episode's `build/alignment.json`, `build/timeline.json`, `audio/voice.wav`.
`build/` and `out/*.mp4` are git-ignored (big binaries); `out/cover.png` is kept.

## Pipeline (`tools/make-short.py`)
1. **Snap** every `from`/`to` to the nearest word start/end in `alignment.json`, + `pad` (never into the
   neighbouring word), frame-aligned.
2. **Render** each segment WITHOUT burned-in subtitles: `node tools/render-video.js <ep> --from A --to B --no-subs --out build/seg-….mp4`
   (`out/video.mp4` of the episode is not touched).
3. **Graphics** from `tools/short/short.html` via `tools/html-frames.js` (Playwright): `bg.png` (navy, glows, rays,
   grain), title overlay with pop-in (`top/`), end card frames with Melo lip-synced to the CTA (`endcard/`), cover.
4. **Subtitles**: `build/subs.ass` – karaoke from the word times (Anton TTF in `brand/fonts/ttf/`, current word
   yellow `#FFC83A`), pages of ≤ 2 lines × ≤ 4 words, never across a sentence end, centred at x 500 / y 1500
   (clear of YouTube's bottom 300 px and right-hand buttons).
5. **Compose** (ffmpeg): video slot y 600–1360 (1920×1080 → 1352×760, centre crop 1080 + `crop_x`), visual hard
   cuts, 40 ms audio crossfades centred on each cut, end card over the CTA + `hold`, fade-out → `out/short.mp4`
   (H.264 high, crf 20, 30 fps, AAC 192k, +faststart, must be ≤ `max_duration`).

## `short.json`
| field | meaning |
|---|---|
| `episode` | episode folder, e.g. `episodes/01-das-sagt-kein-deutscher` |
| `segments` | `[{from, to, crop_x?, note?}]` episode seconds (word start of the first / word end of the last word; snapped anyway). Visual hard cut between segments. `crop_x` shifts the 1080-px crop window (−136…136 px; + = show more of the right side) |
| `cta` | `{from, to, hold}` the spoken CTA line + seconds of silent end-card hold after it (0.6) |
| `hook` | 2 title lines over the video: white line, yellow line |
| `tag` | small channel tag above the title (default `DEUTSCH MIT MELO`) |
| `endcard` | `{line1, line2, sub, click}` defaults „MEHR DAVON?“ / „ABONNIEREN!“ / „Ganzes Video auf dem Kanal“, cursor click at 1.75 s |
| `loop` | `true` = loop Short: hook title static from frame 1 (no pop-in), no audio fade-out; use with no `cta` (→ no end card). Example `shorts/s01-verb-springt/` |
| `sticker` | `{text, from, to, x, y, rot, size}` small paper sticker with a drawn push-pin (e.g. „Speichern & abonnieren“), fades in/out between `from`–`to` s; default x/y = right end above the video panel |
| `cover` | `{headline, wrong, right, cast, castExpr, castPose, meloExpr, badge}` – `cast` is an id from `engine/cast/cast.js` (kollegin, schwiegermutter, kellner, kumpel, mitbewohnerin, kind, chefin, oma, arzt, moderator) |
| `pad` | seconds of air around each segment (0.15) |
| `subtitle_max_words`, `subtitle_highlight` | 4, `#FFC83A` |
| `max_duration` | 59 |

**Making the next Short:** find the sentence times (`--plan` prints the snapped text; or
`python3 -c "import json;[print(f\"{s['start']:.2f}-{s['end']:.2f} {s['text']}\") for s in json.load(open('episodes/<ep>/build/alignment.json'))['sentences']]"`),
copy a `short.json`, adjust `segments`, `hook`, `cover`, run `--plan`, then `--sheet` and look at `out/contact.jpg`
once (check: nothing important cut off at the sides → `crop_x`). Write `meta.md` like `01-ich-bin-heiss/meta.md`
and run `check-meta.py`. If a Short is too long, split a segment and leave a sentence out (hard cut).

## Episode 1 – the 5 Shorts (configs ready; only #1 rendered)
| # | folder | segments (episode s, snapped) | duration | hook |
|---|---|---|---|---|
| 1 | `01-ich-bin-heiss` | 0.00–11.17 (hook: Büro, Kollegin, „Ich bin heiß.“ … „Lange.“) + 50.43–88.37 (Nr. 1 „Grammatisch ist der Satz perfekt.“ … „ziemlich saftig.“) | 52.6 s | SAG DAS NIE! / „Ich bin heiß.“ |
| 2 | `02-ich-bin-voll` | 90.23–130.97 („Du bist bei deiner deutschen Schwiegermutter zum Essen.“ … „du hättest getrunken.“) | 44.3 s | PEINLICH! / „Ich bin voll.“ |
| 3 | `03-ich-will-ein-bier` | 291.93–334.03 („Freitagabend, Biergarten.“ … „Ich will Arzt bekommen?“ … „Ich will Arzt werden.“) | 45.6 s | SO NICHT BESTELLEN! / „Ich will ein Bier.“ |
| 4 | `04-tschuess-servus` | 423.83–456.93 („…sagst: „Auf Wiedersehen!““ … DACH-Karte Servus/Tschö/Ade/Baba 439.6–448.5 … „Tschüss, schönen Tag noch!“) | 36.6 s | NICHT UNTER FREUNDEN! / „Auf Wiedersehen!“ |
| 5 | `05-doch` | 568.03–620.73 („Das Wort, bei dem sogar Leute mit C1 noch stolpern.“ … „Also perfekt für mich.“) | 56.2 s | SOGAR C1 STOLPERT! / „Ja!“ oder „Doch!“? |

All use the CTA 680.00–682.93 „Wenn dir das Video geholfen hat, abonnier den Kanal.“ + 0.6 s hold.
Before rendering #2–#5: run `--plan`, then check `crop_x` on the contact sheet (#4: the DACH map must stay
readable – if a city label is cut, set `crop_x`), and write each `meta.md` (title with the keyword + `#shorts`,
the „Ganzes Video: 12 Sätze, die dich sofort verraten 👉 [Link zum Video]“ line, hashtags, 10–15 tags).
