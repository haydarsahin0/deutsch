# Deutsch mit Melo – video pipeline (shared spec)

Every agent works against this spec. If you need to change it, keep it backward compatible and note the change here.

## Look
- 1920×1080, 30 fps, H.264 + AAC, horizontal YouTube video, 10–15 min.
- Style = the chosen mascot **Concept B** (`brand/concepts/b/melo-b.js`) and the banner (`brand/channel/banner.html`, `brand/out/youtube-banner.png`): warm paper, black ink with variable width, hatching, stipple, paper grain, muted vintage colours (mustard #E0A93B-ish, watermelon red, greens, navy/charcoal). Display type Fraunces Black / Anton / Oswald, handwriting Caveat / Kalam (all in `brand/fonts/`).
- Melo stands in front of a big board (dark-green chalkboard or paper whiteboard in the banner's classroom). Everything on the board appears **as if being drawn/written right now** (stroke reveal, handwriting reveal), and gets **erased** (eraser/sponge wipe) when the topic changes. Camera moves: wide, close-up on Melo, zoom into board, slow drift.
- **Lip sync rule:** the mouth moves ONLY while Melo is speaking (inside word intervals AND above a loudness gate). In pauses the mouth is closed (or holds the expression's resting mouth). No flapping on breath noise.

## Episode folder
```
episodes/<NN-slug>/
  script.md            # source of truth: spoken German + inline cues (written by script team)
  sprechtext.md        # generated: clean text for the voice actor (cues stripped)
  audio/voice.(wav|mp3|m4a)   # recorded by the owner
  build/alignment.json # words with start/end + resolved cue times
  build/envelope.json  # per-frame loudness for lip sync
  build/timeline.json  # final resolved timeline the renderer consumes
  out/video.mp4, out/subtitles.de.srt, out/subtitles.de.vtt
```
`audio/` and `out/` large files are not committed if > 90 MB.

## script.md format
YAML front matter, then the spoken text with inline cues in double square brackets. A cue fires at the start time of the **first spoken word after it** (or at the end of the previous word if nothing follows). Text outside `[[...]]` is exactly what gets spoken. Markdown headings (`## ...`) are section labels only (not spoken).

```
---
title: "Das sagt kein Deutscher!"
level: B1–C1
---
## Hook
[[scene layout=melo]] [[melo expr=smirk pose=idle]]
Stell dir vor: Juli, 35 Grad. [[draw type=wrong id=w1 text="Ich bin heiß."]] Und du sagst zu deiner Kollegin: Ich bin heiß. [[melo expr=surprised]] [[pause s=1]]
```

### Cue vocabulary
| cue | meaning |
|---|---|
| `[[scene layout=board\|melo\|split\|title]]` | new scene; board content of previous scene is erased (eraser wipe) |
| `[[camera shot=wide\|melo\|board\|close focus=<id>]]` | camera move (eased, ~0.8 s) |
| `[[melo expr=<deadpan\|smirk\|talking\|surprised\|unimpressed\|annoyed\|laughing> pose=<idle\|finger\|point\|explain\|crossed\|chin\|shrug> look=<board\|viewer\|left\|right>]]` | character state (any subset) |
| `[[draw type=title text="..."]]` | big handwritten heading on the board |
| `[[draw type=wrong id=.. text="..."]]` | sentence written, then crossed out in red (strike follows ~0.6 s later unless `strike=manual`) |
| `[[draw type=right id=.. text="..."]]` | correct version, green tick |
| `[[draw type=word id=.. article=der\|die\|das word="..." plural="..."]]` | vocab card, article colour (der blue, die red, das green) |
| `[[draw type=sentence id=.. text="..." highlight="part"]]` | example sentence, highlighted part underlined/coloured |
| `[[draw type=note id=.. text="..."]]` | small handwritten side note / arrow comment |
| `[[draw type=bubble id=.. who=left\|right text="..."]]` | speech bubble (mini dialogue) |
| `[[draw type=list id=.. items="a\|b\|c"]]` | list written item by item (each item appears on the next `[[next id=..]]` or all at once if `stagger=auto`) |
| `[[draw type=icon id=.. name=sun\|beer\|coffee\|clock\|house\|heart\|question\|... ]]` | hand-drawn doodle |
| `[[next id=..]]` | reveal next item of a list |
| `[[strike id=..]]`, `[[highlight id=..]]`, `[[tick id=..]]`, `[[erase id=..]]` | act on an element |
| `[[quiz id=.. q="..." options="a\|b\|c" answer=<index> seconds=5]]` | "Kernfrage": question + options + countdown; answer revealed on `[[reveal id=..]]` |
| `[[reveal id=..]]` | reveal quiz answer |
| `[[pause s=1.5]]` | the speaker pauses (shown as "(Pause)" in sprechtext); visuals keep going |
| `[[sfx name=pop\|swoosh\|chalk\|erase]]` | optional sound effect (later) |

Unknown cues must be ignored with a warning, never crash.

## Alignment
`tools/align.py episodes/<ep>`: transcribe `audio/voice.*` with faster-whisper (German, word timestamps), align the transcript to the spoken text of `script.md` (fuzzy, tolerant of small reading deviations), output `build/alignment.json`:
```
{ "duration": 742.3,
  "words": [ {"i":0,"text":"Stell","start":0.52,"end":0.71}, ... ],   // script words, times interpolated if unmatched
  "cues":  [ {"cue":"scene","args":{...},"word":0,"t":0.52}, ... ],
  "sentences": [ {"text":"...","start":..,"end":..}, ... ] }
```
Also writes `out/subtitles.de.srt|vtt` (max 2 lines × 42 chars, 1–7 s each, split at sentence/clause boundaries).

## Lip sync envelope
`tools/envelope.js episodes/<ep>` → `build/envelope.json` `{fps:30, rms:[...] }` one normalised value per video frame.

## Rendering
`node tools/build.js episodes/<ep>` runs: sprechtext → align → envelope → timeline → render → mux. The renderer is a self-contained HTML page with `window.renderFrame(t)`; Playwright captures frames in parallel workers and pipes them to ffmpeg. `--from/--to` seconds for partial renders, `--preview` for 960×540 fast drafts.
