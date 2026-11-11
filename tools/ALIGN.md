# Audio assembly, alignment & subtitles

The owner of these tools is the audio/alignment pipeline. The contract is `docs/PIPELINE.md`.

## Commands
```bash
pip install -r tools/requirements.txt          # + ffmpeg on PATH
python3 tools/assemble-audio.py episodes/<ep>  # parts → voice.wav + alignment + subtitles
python3 tools/align.py episodes/<ep>           # re-align only (e.g. after a script edit)
```
* `assemble-audio.py` options: `--max-parts N` (build only parts 1..N, e.g. for a quick preview),
  `--gap 0.35`, `--lufs -16`, `--min-pause 2`, `--model NAME`, `--retranscribe`.
* `align.py` options: `--audio FILE` (align any file directly, free-end), `--model`, `--retranscribe`.
* Both are idempotent. Re-run `assemble-audio.py` whenever a new `audio/teil-N.*` arrives (it
  uses parts 1..N up to the first missing number; only the new part gets transcribed, the others
  come from the cache) or when `[[pause s≥2]]` cues change.
* `align.py` with no `--audio` reuses `build/voice-manifest.json` + the cached part transcripts,
  so it takes seconds and needs no transcription. It warns if long pause cues no longer match
  what was put into voice.wav (then re-run assemble-audio.py).
* All outputs are written atomically (temp file + rename): readers never see half a file.

## Outputs
| file | content |
|---|---|
| `audio/voice.wav` | 48 kHz mono s16. Parts joined (0.35 s gap), long pauses inserted, 50 Hz high-pass, linear gain to −16 LUFS (a soft limiter only if the true peak would exceed −1 dBTP) |
| `build/alignment.json` | see below. Times are in seconds relative to voice.wav |
| `build/voice-manifest.json` | parts (sha1, trim, offset), inserted silences, loudness, voice.wav sha1 |
| `build/transcripts/*.json` | faster-whisper cache per audio file (key = audio sha1 + model + prompt) |
| `out/subtitles.de.srt`, `.vtt` | subtitles from the SCRIPT text (correct spelling), the same as `alignment.subtitles` |

`alignment.json`:
```
duration, partial, covered_until_word, audio, model,
words:     [{i, text, start, end, raw, match: match|subst|interp, line, para_end?}]
           text = word without punctuation, raw = display form with punctuation/quotes/dashes
cues:      [{cue, args, word, t, at: start|end, line, prev_end?}]   args: unquoted numbers are numbers
           t = start of the next spoken word; prev_end = end of the word before (for pauses)
sentences: [{text, start, end, words:[first_i,last_i]}]
sections:  [{title, word, t}]                                       (## headings)
subtitles: [{start, end, lines:[..], words:[first_i,last_i]}]       (= SRT chunking)
parts, inserted_pauses: [{at, dur, pause_s, word, gap_before}]      (at = before the shift)
stats:     match_rate, matched/substituted/interpolated, deviations (script vs heard),
           unmatched_script_words, extra_words (heard, not in the script), tags_spoken
           (an [audio tag] read out loud), cues_dropped, parts, refine, transcription
```
For a partial build (not all parts present) `partial: true`, words stop at
`covered_until_word` and cues after it are dropped.

## How it works
1. **Script parsing**: front matter is skipped. `## headings` become sections. `[[cues]]` are
   parsed (`key=value`, `key="quoted value"`); each is anchored to the index of the next spoken
   word. Tokens with no letter or digit (`–`, `…`, a lone `„`) are attached to the word next to
   them for display. A sentence ends at `.!?` (with any closing quotes after it) or at a
   paragraph end.
2. **Part ↔ script mapping**: `tts-elevenlabs/teil-N.txt` (audio tags removed) is matched to the
   script words, so each audio part is aligned to exactly its own script range. Without those
   files the tool falls back to free-end alignment.
3. **Transcription**: faster-whisper `large-v3-turbo` int8 on CPU, `language=de`,
   `word_timestamps=True`, Silero VAD on, beam 5, and `initial_prompt` = the first ~45 script
   words of the part (to bias spelling). Audio is decoded with ffmpeg, because PyAV 19 is not
   compatible with faster-whisper 1.2.1's decoder.
4. **Matching**: words are normalised (lowercase, ä→ae, ö→oe, ü→ue, ß→ss, punctuation and
   quotes removed, digits → German number words, so `35` = `fünfunddreißig` and `C1` = `C eins`).
   A banded DP alignment with fuzzy similarity (rapidfuzz) is used, with ops 1:1, 1:2, 2:1
   (split or compound words such as `Lehrbuch-Deutsch` / `Lehrbuch Deutsch`), skip-script and
   skip-heard. A misread word keeps the time of the word heard in its place (`subst`). A script
   word that was not heard is interpolated by character length between its neighbours
   (`interp`). Heard words that are not in the script are reported as `extra_words`, and as
   `tags_spoken` if they are a word of that part's `[audio tags]`.
5. **Boundary refinement**: a word start or end that borders silence is snapped to the energy
   onset or offset (10 ms frames, adaptive gate, `stats.refine.gate_db`). Times inside
   continuous speech keep Whisper's values.
6. **Long pauses**: for each `[[pause s=X]]` with X ≥ 2, silence is inserted at the quietest
   point between the word before the cue and the next word, so that this gap becomes X s
   (only the missing amount is added). 4 ms fades are applied at the cut.
7. **Subtitles**: the text is split into runs at paragraph ends, `[[pause]]` and `[[scene]]`
   cues, and real pauses ≥ 0.6 s. Each run is cut into blocks by a DP, under these rules: at
   most 2 lines × 42 chars, at most 7 s; break at a sentence end first, then a clause (`, ; : –`),
   then before a conjunction; short blocks are penalised and too-fast reading speed (> 20 cps)
   is penalised. Blocks shorter than 1 s are merged with a neighbour when the text fits. Line
   breaks are balanced and prefer punctuation. A block is shown from the first word's start to
   the last word's end + 0.25 s (at least 1 s, never past the next block).

## Model choice (4-core CPU, int8, 60 s German test clip)
| model | × realtime | notes |
|---|---|---|
| small | 0.23 | good text, but word timing is less exact |
| large-v3-turbo | 0.29–0.35 | **default**. Best words and timing, fast enough |
| medium | slower than turbo | no benefit, so not used |

## Accuracy notes
See the report in the episode's `build/alignment.json → stats`. Whisper's word timestamps
are about ±50–100 ms inside continuous speech, and more exact at word edges next to pauses
(after the energy snap). For lip sync, the envelope gate plus the word intervals is plenty.
For frame-exact phoneme timing a forced aligner (wav2vec2/MMS) would be the next step.
