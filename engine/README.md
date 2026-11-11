# Melo video engine

Renders an episode (`episodes/<ep>/`) to a 1920×1080, 30 fps H.264 + AAC video in the hand-inked
"Deutsch mit Melo" style: a classroom set, a chalkboard with live handwriting, eraser wipes, a
title card, camera moves and burned-in karaoke subtitles. It follows `docs/PIPELINE.md`.

## Commands

```bash
node tools/build.js episodes/01-das-sagt-kein-deutscher            # full pipeline → out/video.mp4
node tools/build.js episodes/<ep> --from 0 --to 60 --out episodes/<ep>/out/preview-60s.mp4
node tools/build.js episodes/<ep> --preview                           # 960×540 draft → out/preview.mp4
node tools/build.js episodes/<ep> --no-render                         # only refresh the timeline

node tools/timeline.js episodes/<ep>                                  # alignment → build/timeline.json (+ .js)
node tools/render-video.js episodes/<ep> [--from s] [--to s] [--preview] [--workers N] [--no-subs] [--out f] [--crf 18] [--preset fast]
node tools/render-video.js episodes/<ep> --stills "12.5:hook,60:item1" [--stills-dir dir]   # PNG stills for review
```

The build steps are `sprechtext → assemble-audio/align → envelope → timeline → render`. Each step
is skipped when its output is newer than its inputs; `--force` re-runs all of them. Subtitles are
**on by default**, and `--no-subs` turns them off.

To preview by hand, open
`engine/player.html?ep=01-das-sagt-kein-deutscher&dev=1` in Chromium. It works from `file://` and
gives you a scrubber plus audio. Add `&t=123` to start at a time and `&scale=0.5` for a small canvas.

## Architecture

| file | role |
|---|---|
| `tools/timeline.js` | Compiler. It reads `build/alignment.json`, `script.md` sections and `build/envelope.json` and writes `build/timeline.json` with scenes, elements, camera keyframes, chapters, quiz states and subtitle cues, all in seconds. It also writes `build/timeline.js` (`window.TIMELINE=…`, envelope embedded) for the `file://` player. Unknown cues produce a warning. When the audio is partial, everything after its end is dropped. |
| `engine/player.html` | Page that loads the fonts (`brand/fonts`), melo-b.js, scene-ink.js, the rig and the engine. It exposes `window.renderFrame(t)` (async, deterministic) and has a dev UI. |
| `engine/js/engine.js` | Renderer: layout, chalk drawing, camera, eraser, title card, subtitles and compositing. |
| `engine/js/set.js` | Static classroom set and title-card background, built with SceneInk/MeloB ink tools and pre-rendered once at 2×. |
| `engine/js/icons.js` | Chalk doodles: sun, plate, house, clock, beer, hand, battery, coffee, heart, question, lightbulb, thumbsup/down, phone, book, calendar, speech, pizza, snowflake, fridge, star, exclamation, thermometer. |
| `engine/lib/script.js` | `script.md` parser (words, cues, sections), shared with the dev tools. |
| `engine/character/` | Melo rig (owned by the rig agent). `engine/stub-rig.js` is the fallback if `rig.js` is missing. The engine uses `window.MeloRig \|\| window.MeloStubRig`. |
| `tools/render-video.js` | Playwright Chromium in N parallel browsers. Each renders a contiguous chunk, sends JPEG frames to ffmpeg (libx264 yuv420p, crf 18, preset fast), then the chunks are concatenated and the audio muxed (`timeline.audio` = `audio/voice.wav`, AAC 192k). |
| `engine/dev/` | Dev aligner (faster-whisper, used only before the real alignment existed) and review stills. |

### How a frame is drawn
1. **World** (1920×1080 units). The camera `{cx, cy, w}` is applied as one canvas transform.
2. **Set**: one pre-rendered 3840×2160 bitmap. In Melo close-ups a blurred copy is cross-faded in for depth of field.
3. **Board**: elements are drawn into an offscreen slate canvas, at 2× world resolution.
   - Text is baked once per element into a chalk bitmap and revealed letter by letter with a clip and a moving chalk stick.
   - Strokes (strike, tick, underline, arrows, bubble outlines, doodles) grow along their length. Fills fade in as coloured chalk hatching.
   - Eraser wipes are `destination-out` masks along a zig-zag sponge path, with chalk dust and a residue haze.
   - Then a chalk-grain mask is applied. It shifts at 8 fps, which makes the lines boil.
   - Paper items (KERNFRAGE tag, word cards) are drawn after the grain.
4. **Melo**: `rig.render(t, {boardSide:'right', visible})` returns SVG, cropped to the visible part, rasterised at screen resolution and drawn at the layout position. Melo eases to his new position between layouts.
5. **Title card** (`layout=title`): dark burst background with rotating rays, words slammed in one by one (Anton, cream and mustard), a red ink underline, Melo in front of the mustard disc, and the note shown as a paper strip. „Nummer 12" becomes a big number card. Transitions to and from the title card are an ink-brush wipe; the old and the new frame are both rendered and masked.
6. **Screen overlays**: paper grain and vignette (multiply), then the subtitle plate. Subtitles come from `alignment.subtitles` (2 lines max) with the current word underlined in mustard. Nothing is shown in silences.

### Layout
Layouts (`LAYOUT` in engine.js) set Melo's position and scale and the board content area:
- `board`: Melo at the board's left edge.
- `split`: Melo bigger and closer.
- `melo`: Melo big, only the right part of the board is used.
- `title`: the full-frame card.

The auto layout places each scene's elements with time-aware first-fit, because erased elements free their space. It keeps reading order (append below the newest element, then a second column), places notes beside their target with an arrow, and puts icons next to the sentence they illustrate. If the scene doesn't fit, everything shrinks uniformly (wrong/right lines shrink least). The block is then centred.

### Camera
Shots (`[[camera shot=…]]`), each eased over 1.05 s plus a slow push-in and organic drift:
- `wide`: Melo plus all board content, between 1250 and 1920 wide.
- `board`: board content plus Melo's upper body.
- `melo`: chest-up close-up with depth of field.
- `close focus=id`: one element.

The compiler adds default shots at scene starts and reframes after about 8 s on the same shot, at sentence starts. It also keeps the whole quiz in view from the question to the reveal.

### Timeline schema (build/timeline.json)
`{duration, fps, audio, partial, scenes[{i, layout, tStart, tEnd, transition: cut|move|erase|ink}], elements[{id, type, scene, appear, writeDur, strike, tick, highlight, erase, eraseEnd, eraseBy, items[{text, t, dur}], q, options, answer (0-based), countdown, countdownEnd, reveal}], camera[{t, shot, focus, auto}], chapters[{t, num, label, kind}], melo[{t, args}], cues, words, sentences, subs[{start, end, lines[[{text, w}]]}]}`

## Performance
4 workers on 4 CPUs take about 65–90 ms per frame overall (260–360 ms per frame per worker), including JPEG capture and x264. The 11.6-minute episode 1 renders in roughly 25–35 min.
