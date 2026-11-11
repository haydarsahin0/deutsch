---
name: melo-episode
description: Produce a full long YouTube episode for "Deutsch mit Melo" (German B1–C1, code-animated) end to end — topic, German script with visual cues, ElevenLabs voice texts, audio assembly + alignment, visual direction (shot list), render, QA and delivery. Use when the owner asks for a new episode/video/Folge, its script, or to (re)render one.
---

# Long episode (10–15 min, 1920×1080) — end-to-end

Read `CLAUDE.md` first (cost rules, schedule, owner preferences). Contract for cues/files: `docs/PIPELINE.md` (section "Visual flow v2" = current look). Talk to the owner in Turkish; the video is German only.

## 0. Topic (owner decides; offer 3 with a recommendation)
High search demand for B1–C1 learners, evergreen, and must yield **3 strong Shorts** (self-contained 40–55 s moments with a funny situation). Good formats: "Das sagt kein Deutscher"-style lists, "Teil 2" sequels of hits, grammar pain points (Präpositionen, Konjunktiv II, als/wenn/wann, Modalpartikeln), Redewendungen. Check `docs/growth/` for what performed.

## 1. Script — ONE Opus agent, then your own German check
Spawn one `general-purpose` agent with `model: opus` using `prompts/writer.md` (fill in topic + NN-slug). Output: `episodes/NN-slug/script.md`, `meta.md` draft. Then read `sprechtext.md` yourself as a strict German editor (tone, correctness, nothing vulgar) and fix in `script.md`.
- Add `[[voice tag="…"]]` cues for ElevenLabs v3 delivery (deadpan, chuckles, sarcastic, excited, warmly, mischievously, sighs, like a game show host …) — they become `[tag]` only in the ElevenLabs files.
- `node tools/sprechtext.js episodes/NN-slug` → `sprechtext.md`, `tts.txt`, `tts-elevenlabs/teil-1..N.txt` (≤ 4,500 chars each).

## 2. Voice texts → owner
Give the owner the `tts-elevenlabs/teil-*.txt` contents in separate ```code blocks``` (copy-paste ready). Remind: model **Eleven v3**, voice **"Ben – Effortless and Casual"**, Stability "Natural", same settings for all parts, send files as `teil-1`, `teil-2`, … Quiz silences are added by us.

## 3. Audio
Owner uploads MP3s → copy to `episodes/NN-slug/audio/teil-N.mp3` (chmod 644). Then
`python3 tools/assemble-audio.py episodes/NN-slug` (joins parts, inserts silence for `[[pause s≥2]]`, aligns with faster-whisper large-v3-turbo, writes `build/alignment.json` + `out/subtitles.de.srt|vtt`). Check `stats.pause_checks_ok` and match rate (>98 %). Works with partial parts.

## 4. Visual direction — ONE Opus agent
`prompts/director.md`. Rewrites cues only; spoken text must stay byte-identical (diff `tts.txt`). Targets: new `[[shot]]` every 3–6 s (≈ 150–220 per episode), nothing static > 5 s, Melo visible 40–60 % (corner/side/in-scene/off/medium — never huge), every situation shown with sets (`engine/sets/*.js`, 24) + cast (`engine/cast/cast.js`, 10 fruit characters). Check: `python3 tools/shot-stats.py episodes/NN-slug/script.md episodes/NN-slug/build/alignment.json --shotlist episodes/NN-slug/shotlist.md`. Re-align after cue edits: `python3 tools/align.py episodes/NN-slug` (seconds).
If the script needs a set/prop that doesn't exist, prefer an existing one; only then one Opus agent to draw 1–3 new sets in the kit-a/kit-b style (see `engine/sets/kit-a.js`, `kit-b.js`, `office-hot.js` as the pattern).

## 5. Render
`tools/autosave.sh 300` in background (commits). Then `node tools/build.js episodes/NN-slug` (or `node tools/render-video.js episodes/NN-slug --workers 4 --crf 21 --preset medium`). ≈ 55 ms/frame → ~20–25 min for 12 min. Previews: `--from 0 --to 90 --out …`. `tools/timeline.js` enforces readability rules (min shot lengths, text visible ≥ 1.6 s, writing done before cuts) and prints a report.

## 6. QA (cheap)
One low-res contact sheet: `ffmpeg -i out/video.mp4 -vf "fps=1/17,scale=384:-1,tile=8x5" -frames:v 1 sheet.jpg` → Read once. Look for: half-written text, overlapping text/characters, empty frames, wrong speaker, subtitle covering key text, freeze-like effects. Fix → re-render only `--from/--to` ranges.

## 7. Deliver + publish kit
- Video: see skill `melo-deliver` (≤ 500 MiB, ZIP trick for download).
- Metadata: skill `melo-youtube-meta` (title, description with chapters `python3 tools/chapters.py episodes/NN-slug`, tags, pinned comment).
- Thumbnail: skill `melo-thumbnail`. Shorts: skill `melo-shorts` (3 per episode).
