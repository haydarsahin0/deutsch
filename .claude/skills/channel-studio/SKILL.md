---
name: channel-studio
description: The owner's playbook for building and running AI-produced, code-animated YouTube channels (first one: "Deutsch mit Melo"). Use at the start of ANY session with this owner, when they ask to create a new channel (other language/topic/mascot), or when unsure how they want to work — it captures who they are, how they communicate, their quality bar, and the full channel-from-zero process.
---

# Channel studio — the owner and the method

## Who the owner is and how to work with him
- Turkish speaker, casual ("kanka", "brom"); answer in **Turkish**, short and clear, outcome first. He checks in from an iPad, often mid-work: give status as "ne durumdayız" summaries (what's done, what's running, ETA).
- Wants an **orchestrated team of subagents** with clear roles. Model rule: **Opus** for quality-defining work (scripts, German/language review, visual direction, engine/illustration, final QA), **Sonnet** for routine fixes/SEO/scripts, **Haiku** for trivial mechanics.
- **Usage limit is tight** — he noticed burn and asked to cut it. Prefer scripts over agents, 1–2 agents at a time, low-res contact sheets instead of many image reads, keep the orchestrator context lean (start a fresh session per episode; `CLAUDE.md` holds the essentials), autosave script for git.
- When the limit hits, **resume automatically**: he tells you the reset time (e.g. "21:11'de yenilenecek") → `send_later` a few minutes after it, in **Europe/Berlin** time; resume interrupted agents with `SendMessage` (they continue from their transcript). Keep a recurring check-in trigger only while work is in flight; delete it when done.
- Wants to **approve style early**: deliver a 60–90 s preview before any full render. After approval he gives concrete, visual feedback (often with screenshots) — fix exactly that, globally, so it never recurs, and remember it in `CLAUDE.md` "Owner preferences".
- Wants **copy-paste-ready** deliverables: every text in its own ```code block``` (titles, descriptions, tags, pinned comments, TTS parts). Files as downloads (see `melo-deliver`: ZIP trick; 500 MiB send limit).
- Values **honest estimates** (e.g. monetization timeline) with numbers and scenarios, not hype.
- Ambitious about growth: SEO-heavy metadata where **tags literally match title/description**, Shorts funnel, consistent schedule (daily 17:05 CET posts).

## Quality bar (learned the hard way)
- Style: **adult editorial ink illustration** (variable line weight, hatching, stipple, paper grain, muted vintage palette, strong contrast). He rejected a cute/kawaii first version ("çok çocuksu"). Reference genre he loves: channels like Avenox / Forn AI — one huge expressive mascot, giant condensed bold text, dark background with orange/blue glow, one clear prop. Take the genre, never copy their characters.
- Video: **constant visual flow** (short-form retention in long form): new shot every 3–6 s, everything mentioned is shown (illustrated scenes acted out by a supporting cast), kinetic typography, wrong-vs-right splits, chapter cards, quizzes. He rejected a static classroom/board look. Mascot not too big, not always on screen.
- But **readability first**: text must be fully visible long enough; handwriting must finish before cuts; no half-glyph leaks, no markers before their text, no freeze-frame gags (look like bugs).
- Subtitles always: burned-in karaoke (long: bottom; Shorts: **single line, small, centred, under the video panel**, clear of YouTube UI) + `.srt` for YouTube.
- Shorts: show the **full 16:9 frame** (no zoom/crop), hook title on top, end card asking to **like + subscribe**.
- Thumbnails: nothing overlapping the character, keep the **mobile duration-badge zone** (bottom-right ~22 %×18 %) empty, readable at 168 px, export **4K JPEG < 2 MB**. Correct orthography in caps (German: „HEIẞ“ with capital Eszett).

## New channel from zero (what we did for Melo — repeat this order)
1. **Plan** (one message): concept, audience/levels, format (long horizontal + Shorts), mascot idea, channel name + slogan options, pipeline, team, risks. Ask only the decisions that matter (mascot, voice gender, name).
2. **Mascot**: 3 parallel Opus concept artists, each a different direction, each delivering a concept sheet (hero, 5–6 expressions, profile-pic test at 48 px, mock thumbnail). Owner picks one.
3. **Brand pack**: banner 2560×1440 (safe area 1546×423 centred, mobile preview), profile picture 800×800 (+2048 master, small-size test), German (target-language) channel description ≤ 1000 chars + channel keywords ≤ 500 chars, handle suggestion.
4. **Pipeline** (reuse this repo's tools — copy `engine/`, `tools/`, `brand/fonts`, `docs/PIPELINE.md` into the new repo and swap the mascot/sets): script format with inline cues → TTS texts (ElevenLabs v3 audio tags) → audio assembly + whisper alignment → visual direction → deterministic browser renderer (Playwright frames → ffmpeg) → Shorts tool → metadata/thumbnail/growth skills.
5. **Episode 1** with preview approval, then **Shorts**, **thumbnail**, **metadata**, **growth analyst**.
6. Record every preference in the new repo's `CLAUDE.md`; create the same skill set (these files are the template).

## Skills in this repo
`melo-episode` (long video), `melo-shorts`, `melo-youtube-meta`, `melo-thumbnail`, `melo-growth`, `melo-deliver`. For another channel, copy `.claude/skills/` and replace Melo/German specifics.
