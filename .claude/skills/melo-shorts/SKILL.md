---
name: melo-shorts
description: Cut vertical YouTube Shorts (1080×1920) from a rendered "Deutsch mit Melo" episode with tools/make-short.py — pick the 3 strongest moments, config, render, cover, Shorts metadata, delivery. Use when the owner asks for Shorts / short video / dikey video.
---

# Shorts from an episode (3 per long video, one per day at 17:05 CET)

Full tool docs: `shorts/README.md`. Needs the episode's `build/alignment.json`, `build/timeline.json`, `audio/voice.wav`. No agent needed — this is a script job (cheap).

## 1. Pick moments
Self-contained 40–55 s pieces with a funny situation + the lesson (wrong sentence shown in the first 1–2 s). Find times: grep `episodes/NN/script.md` for the item, then word times in `build/alignment.json` (or `python3 tools/chapters.py episodes/NN`). CTA = the episode's outro sentence „Wenn dir das Video geholfen hat, abonnier den Kanal.“ (find its times; reuse in every Short).

## 2. Config `shorts/NN-slug/short.json`
Copy `shorts/02-ich-bin-voll/short.json` (the approved template) and change: `id`, `segments [{from,to}]`, `cta`, `hook` (2 lines: white punchy word + yellow quoted wrong sentence, e.g. „PEINLICH!“ / „„Ich bin voll.““), `cover` (`headline`, `wrong`, `right`, `cast` id + `castExpr/castPose`, `meloExpr`, `badge`). Keep the owner-approved defaults:
- `"fit": "full"` — whole 16:9 frame, no zoom/crop (owner rejected the zoomed look).
- `"subtitle_style": {"lines":1,"size":110,"x":540,"y":1375,"max_width":760}`, `"subtitle_max_words": 3` — single line, small, centred under the video panel, clear of YouTube's bottom/right UI.
- `"endcard": {"line1":"GEFÄLLT'S DIR?","line2":"LIKE & ABONNIEREN!","sub":"Ganzes Video auf dem Kanal"}`.
- ≤ 59 s (`--plan` shows the duration; trim a sentence if over).

## 3. Render
```
python3 tools/make-short.py shorts/NN-slug/short.json --plan
python3 tools/make-short.py shorts/NN-slug/short.json        # → out/short.mp4 + out/cover.png
```
≈ 3–5 min first time (engine segment renders are cached in `build/`; later tweaks ≈ 1.5 min). Run several Shorts sequentially in ONE background command.

## 4. QA
One strip: `ffmpeg -ss 2 -i out/short.mp4 -vf "fps=1/6,scale=180:-1,tile=7x1" -frames:v 1 strip.jpg` + cover thumbnail, hstack, Read once. Check subtitles readable/in sync, nothing cut, end card clean.

## 5. Metadata `shorts/NN-slug/meta.md`
Title ≤ 60 chars incl. `#shorts`, curiosity hook with the keyword (e.g. „„Ich bin voll“ heißt NICHT satt! 😳 #shorts“); description 2–4 lines (lesson in one breath, keyword sentence „Typische Fehler im Deutschen … Deutsch für Fortgeschrittene (B1–C1) bei Deutsch mit Melo.“, line „Ganzes Video: <episode title>“, hashtags `#shorts #deutschlernen #deutschmitmelo` + 2 topical); ≤ 15 tags that appear literally; pinned comment in German with a question. Validate: `python3 shorts/check-meta.py shorts/NN-slug/meta.md` (0 ✗).

## 6. Deliver
MP4 (for viewing) + cover PNG + uncompressed ZIP of mp4+cover+meta (for download) → `SendUserFile`. In the message: every text in its own code block, remind to set **"Related video" = the long episode** (only clickable Short→long link) and the publish slot (17:05).

## Hook rule (data, Short #1: only 38.7 % viewed vs 61.3 % swiped)
The first segment must START on the wrong sentence or the provocative claim (spoken within the first 0.5–1 s, hook text on screen from frame 1). No scene-setting („Juli, 35 Grad …“, „Freitagabend, Biergarten …“) before it; the hook overlay gives the context. Target 30–40 s total. Check the start word with the episode's `build/alignment.json`.
