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
nonword_sounds: [{start, end, after_word}]   loud audio not inside any word (chuckles/laughs
           from [audio tags]) – the mouth stays closed there; the rig may show an expression
parts, inserted_pauses: [{at, dur, pause_s, word, gap_before}]      (at = before the shift)
stats:     match_rate, matched/substituted/interpolated, deviations (script vs heard),
           unmatched_script_words, extra_words (heard, not in the script), tags_spoken
           (an [audio tag] read out loud), cues_dropped, parts, refine, transcription,
           repaired_gaps, pause_checks + pause_checks_ok (self-check: after every
           [[pause s>=2]] the next word AND its cues start >= s - 0.3 s later, no subtitle
           starts inside the silence)
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
   script words to get each part's expected range. That is only a hint: each part is aligned
   free-end over its range + 120 words (the last part of the script must cover the rest), so
   a part that ends a little earlier or later than its text file is still handled.
3. **Transcription**: faster-whisper `large-v3-turbo` int8 on CPU, `language=de`,
   `word_timestamps=True`, Silero VAD on, beam 5, **`condition_on_previous_text=False`**.
   With `True`, turbo skipped whole phrases at the 30-s window boundaries in ep. 1 („Nummer
   zehn ist kein Fehler, sondern“, the quiz-3 question, „Und hast du's gemerkt?“).
   `initial_prompt` is a short glossary of the part's longest words. It is not the sentences
   themselves, because a prompt that contains the upcoming text makes whisper skip that text.
   Audio is decoded with ffmpeg, because PyAV 19 is not compatible with faster-whisper 1.2.1's
   decoder.
   *Repair pass*: any run of ≥ 2 script words left unmatched is re-transcribed from just that
   stretch of audio (no VAD, cached) and aligned again (`stats.repaired_gaps`).
4. **Matching**: words are normalised (lowercase, ä→ae, ö→oe, ü→ue, ß→ss, punctuation and
   quotes removed, digits → German number words, so `35` = `fünfunddreißig` and `C1` = `C eins`).
   A banded DP alignment with fuzzy similarity (rapidfuzz) is used, with ops 1:1, 1:2, 2:1
   (split or compound words such as `Lehrbuch-Deutsch` / `Lehrbuch Deutsch`), skip-script and
   skip-heard. A misread word keeps the time of the word heard in its place (`subst`). A script
   word that was not heard is interpolated by character length between its neighbours
   (`interp`). Heard words that are not in the script are reported as `extra_words`, and as
   `tags_spoken` if they are a word of that part's `[audio tags]`.
5. **Boundary refinement** runs once, on the final voice.wav, so align.py and
   assemble-audio.py give identical results. (a) A word edge that lies in near-digital silence
   moves to the energy onset or offset. (b) *Pause snapping*: real pauses are runs of at least
   110 ms that are more than 24 dB below the loud-speech level, so breaths count as pauses.
   Each word boundary within 0.35 s of a pause is moved onto that pause: the previous word ends
   where the pause starts, and the next word starts where speech resumes. Whisper often puts a
   boundary 0.1–0.4 s next to the pause, or lets a word swallow a breath before it. (c) Small
   gaps with no pause inside are speech, so they are closed at their quietest frame. (d) A
   pause of 0.2 s or more inside one word means a chuckle or laugh was glued to it, so the word
   is cut there. What is left uncovered is reported in `nonword_sounds`.
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

## Accuracy (episode 1, 3 parts, 693.7 s)
* Match rate 99.9 % (1688/1689). The only deviation is „Ciao“, heard as „Tschau“ (timing
  is correct). No audio tag was spoken aloud and no extra words were heard. One non-word sound
  was found: the [chuckles] after „Beziehung.“ (491.25–491.50 s).
* Speech coverage: of the frames above the speech gate, all but 49 × 5 ms lie inside a word
  interval. The only uncovered stretch ≥ 120 ms is that chuckle.
* Spot check of 21 words: a 1.5 s clip cut at our word start was re-transcribed and starts
  with that word in 20/21 cases. The miss is „sagt“ in „In Bayern und Österreich sagt man“:
  whisper misheard the cut clip, and the waveform looks right. For words after a pause, the
  start is within 0–40 ms of the energy onset (Δ 0, −0.04, +0.01, +0.005, −0.015 s). Waveform
  plots with word boundaries were checked at 12 places.
* Inside continuous speech (no pause between words) the boundaries are whisper's DTW times,
  about ±50–100 ms. For frame-exact phoneme timing, a CTC forced aligner (wav2vec2/MMS)
  would be the next step.
* Quiz silences: 5.00 s between „Sekunden.“ and „Richtig“ / „Als“, with all three
  pause_checks OK.
* Loudness of voice.wav: −16.1 LUFS integrated, −1.3 dBFS peak. The limiter touches only
  about 1 % of 10-ms frames, by at most 3 dB.
