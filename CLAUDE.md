# Deutsch mit Melo — YouTube channel production

German lessons (B1–C1) as 10–15 min horizontal YouTube videos, 100 % code-drawn. Host: **Melo** (watermelon head with sliced-off top, Concept B). Owner speaks Turkish; videos are German only. Full pipeline contract: `docs/PIPELINE.md` (read the "Visual flow v2" section for the current look).

## Where we are
Read `docs/CHANNEL-STATUS.md` first (what's published, what's ready, what's next) and keep it updated after every publish/decision.

## Fresh container setup (only what a step needs)
- Node deps: `npm install` (roughjs, fontsource; Playwright + Chromium are preinstalled — don't install them).
- Alignment (step 3): `pip install -r tools/requirements.txt`; the whisper model downloads from huggingface.co (needs the „deutsch“ cloud environment, which allows the HF hosts).
- `audio/voice.wav` and `out/*.mp4` are not in git: rebuild voice.wav with `python3 tools/assemble-audio.py episodes/NN` (uses cached transcripts in `build/transcripts/`), re-render videos with `node tools/build.js`.

## Skills (use them — they encode the whole method)
`.claude/skills/`: **channel-studio** (owner profile, quality bar, new-channel-from-zero), **melo-episode** (long video end-to-end, writer/director prompt templates), **melo-shorts**, **melo-youtube-meta**, **melo-thumbnail**, **melo-growth**, **melo-deliver**. Helpers: `tools/chapters.py`, `tools/check-long-meta.py`, `shorts/check-meta.py`.

## Cost rules (the owner's usage limit is tight)
- The tools are built. A new episode should NOT need new engine work — reuse the 24 sets (`engine/sets/`), 10 cast (`engine/cast/cast.js`), Melo rig (`engine/character/rig.js`).
- Model choice (owner's rule): **Opus 5.5** for the important, quality-defining work — script writing, German review, visual direction, engine/animation/illustration changes, final visual QA. **Sonnet 5.5** for medium routine work (applying a clear list of small fixes, SEO metadata, validation scripts). **Haiku 5.5** for trivial mechanical tasks (file housekeeping, format checks, renaming, simple greps/reports).
- Prefer running scripts over agents. Spawn at most 1–2 agents at a time, never for things a script does.
- Image checks: one low-res contact sheet (ffmpeg `tile`), not many full-size stills.
- Don't re-read big files (`engine/js/*.js`, `melo-b.js`, `cast.js`); grep for what you need.
- Git: `tools/autosave.sh 300` (run in background) commits + pushes every 5 min; don't spend turns on commits.

## Publishing schedule (owner's plan, from 2026-11-12)
- 4-day cycle: **day 1 = long video, days 2–4 = one Short per day, always at 17:05 (Europe/Berlin)**; next long video on day 5.
- So every long episode needs **3 Shorts** (the 3 strongest moments; `tools/make-short.py`, layout `fit: full`, single-line subtitles).
- Episode N+1 must be fully rendered (+ thumbnail, meta, 3 Shorts) before its publish day → start its script right after episode N is published.

## Episode workflow
1. **Script** (one writer pass + one German check): `episodes/NN-slug/script.md` (spoken German + `[[cues]]`), then `node tools/sprechtext.js episodes/NN-slug` → `tts-elevenlabs/teil-*.txt` (owner pastes into ElevenLabs v3, voice "Ben – Effortless and Casual") + `meta.md` (YouTube title/description/tags).
2. **Voice**: owner uploads `audio/teil-1.mp3 …` → `python3 tools/assemble-audio.py episodes/NN-slug` (joins parts, inserts quiz silences, aligns with faster-whisper, writes subtitles). Seconds-fast re-align after cue edits: `python3 tools/align.py episodes/NN-slug`.
3. **Direction**: rewrite cues only (spoken text must stay byte-identical — diff `tts.txt`): a new `[[shot]]` every **~5–10 s** (owner, ep. 2), with things happening inside each shot; every episode tells a **story in its own NEW sets** (draw 10–15 new sets per episode for its storyline, reuse earlier episodes' sets only rarely, avoid repeating a set inside the episode unless the story returns there); Melo visible ~50 % and never huge. Check pacing: `python3 tools/shot-stats.py <script.md> <alignment.json>`.
4. **Render**: `node tools/build.js episodes/NN-slug` (envelope → timeline → render → mux; `--from/--to`, `--preview`). Output `out/video.mp4` (gitignored). ~25 min for 12 min of video.
5. **QA**: one contact sheet, fix, re-render only affected ranges.

## Owner preferences (learned)
- Constant visual flow, everything mentioned is shown; no long static board shots. **Scene changes every ~5–10 s (not faster)**, and **big scene variety**: each episode lives in its own new locations like a story (the viewer should feel inside a story), not the same few sets again.
- But text must be readable: chapter/text cards stay long enough; writing finishes before cuts.
- Melo not too big, not always on screen. No freeze-frame gags (they look like bugs).
- Burned-in synced subtitles (karaoke highlight) + separate `.srt` for YouTube.
- Style: adult ink-illustration (hatching, grain, muted vintage), not childish.
