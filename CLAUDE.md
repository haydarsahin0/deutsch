# Deutsch mit Melo — YouTube channel production

German lessons (B1–C1) as 10–15 min horizontal YouTube videos, 100 % code-drawn. Host: **Melo** (watermelon head with sliced-off top, Concept B). Owner speaks Turkish; videos are German only. Full pipeline contract: `docs/PIPELINE.md` (read the "Visual flow v2" section for the current look).

## Cost rules (the owner's usage limit is tight)
- The tools are built. A new episode should NOT need new engine work — reuse the 24 sets (`engine/sets/`), 10 cast (`engine/cast/cast.js`), Melo rig (`engine/character/rig.js`).
- Prefer running scripts over agents. Spawn at most 1–2 agents at a time, never for things a script does.
- Image checks: one low-res contact sheet (ffmpeg `tile`), not many full-size stills.
- Don't re-read big files (`engine/js/*.js`, `melo-b.js`, `cast.js`); grep for what you need.
- Git: `tools/autosave.sh 300` (run in background) commits + pushes every 5 min; don't spend turns on commits.

## Episode workflow
1. **Script** (one writer pass + one German check): `episodes/NN-slug/script.md` (spoken German + `[[cues]]`), then `node tools/sprechtext.js episodes/NN-slug` → `tts-elevenlabs/teil-*.txt` (owner pastes into ElevenLabs v3, voice "Ben – Effortless and Casual") + `meta.md` (YouTube title/description/tags).
2. **Voice**: owner uploads `audio/teil-1.mp3 …` → `python3 tools/assemble-audio.py episodes/NN-slug` (joins parts, inserts quiz silences, aligns with faster-whisper, writes subtitles). Seconds-fast re-align after cue edits: `python3 tools/align.py episodes/NN-slug`.
3. **Direction**: rewrite cues only (spoken text must stay byte-identical — diff `tts.txt`): a new `[[shot]]` every ~3–6 s, show every situation with sets + cast, Melo visible ~50 % and never huge. Check pacing: `python3 tools/shot-stats.py <script.md> <alignment.json>`.
4. **Render**: `node tools/build.js episodes/NN-slug` (envelope → timeline → render → mux; `--from/--to`, `--preview`). Output `out/video.mp4` (gitignored). ~25 min for 12 min of video.
5. **QA**: one contact sheet, fix, re-render only affected ranges.

## Owner preferences (learned)
- Constant visual flow (short-form retention), everything mentioned is shown; no long static board shots.
- But text must be readable: chapter/text cards stay long enough; writing finishes before cuts.
- Melo not too big, not always on screen. No freeze-frame gags (they look like bugs).
- Burned-in synced subtitles (karaoke highlight) + separate `.srt` for YouTube.
- Style: adult ink-illustration (hatching, grain, muted vintage), not childish.
