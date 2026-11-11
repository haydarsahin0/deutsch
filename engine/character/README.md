# Melo character rig (`engine/character/`)

Animation rig for Melo (Concept B) on top of `brand/concepts/b/melo-b.js`: lip sync, blinks, breathing,
gestures, cue-driven expressions/poses, line boil. Deterministic: `render(t)` is a pure function of `t`.

| file | what |
|---|---|
| `rig.js` | the rig (UMD: browser `window.MeloRig` after `melo-b.js`; Node `require()`) |
| `dev.html` | interactive preview with audio, scrubber, mouth/loudness graph |
| `test-render.js` | renders test MP4s / contact sheets / benchmarks with Playwright + ffmpeg |
| `../../tools/envelope.js` | audio → `build/envelope.json` (loudness + brightness per frame and at 100 Hz) |

## API

```js
// node tools/envelope.js episodes/<ep>          → episodes/<ep>/build/envelope.json
var rig = MeloRig.prepare({
  fps: 30,
  envelope,          // build/envelope.json (uses env/envHf @100 Hz if present, else rms/hf per frame)
  words,             // alignment.words  [{text, start, end}, …]   (extra fields ignored)
  cues,              // alignment.cues   [{cue, args, t, prev_end?}, …]
  seed: 7,           // line jitter / blink / glance schedule
  duration,          // optional (defaults to envelope/words length)
  pencil: false,     // optional: the signature pencil in the "hair"
  id: 'mr'           // optional prefix for <defs> ids (only needed for two Melos in one document)
});
var fr = rig.render(t, {
  boardSide: 'right',  // where the board is: look=board and auto glances go there; 'left' mirrors the BODY
                       // geometry (pointing arm goes left; face, ß print and lighting stay correct)
  board: true,         // false: no automatic glances at the board (e.g. title layout)
  visible: [x0,y0,x1,y1], // optional: camera's view in character coords → culls legs/torso, clamps the grain filter
  grain: true,         // cheap tiled-noise edge grain (filter); false = crisp vector lines
  rough: 1,            // ink roughness multiplier (0 = clean lines, no filter at all)
  filter: false,       // true = the brand's original feTurbulence filter (slow; for stills/thumbnails)
  boil: true           // false = no line boil
});
fr.svg      // '<g class="melo-rig">…</g>' with its own <defs>; character coords: feet at (0,0), +y down,
            // same scale as melo-b (figure ≈ x −180…180, y −512…22; head centre ≈ (0,−385))
fr.anchors  // { feet, headCenter, headTop, mouth, eyes, handL, handR, fingerTip|null, bbox }
            //   handL/handR = viewer-left/right wrist; fingerTip only in point/finger poses
fr.state    // { t, expr, pose, look, speaking, mouthOpen, lipOpen, blink, energy }
rig.stateAt(t, hint)   // full internal state (debugging)
MeloRig.tuning         // the tuning table below (mutate before prepare())
MeloRig.visemes('Sorge') // grapheme → viseme segments (debugging)
```

Typical placement: `<g transform="translate(X Y) scale(s)">${fr.svg}</g>` inside the scene SVG, or (as the
engine does) wrap it in an `<svg viewBox="visible region">` and rasterise.

## State model

Everything is precomputed in `prepare()`; `render(t)` only samples arrays and builds the per-frame parts.

**Lip sync** (100 Hz internal, sampled per frame)
1. *Speech mask* = word intervals (padded 30 ms each side, gaps < 120 ms bridged). Without words: envelope
   with hysteresis. Words much longer than their audible part (e.g. stretched over an inserted silence)
   are clipped to it.
2. *Visemes*: each word is split into German graphemes (`sch`, `ch`, `ei`, `au`, `ie`, `pf`, …), each mapped to
   open / round / wide / lipIn (f, v, w) / closed (m, b, p) and spread over the word by weight; coarticulated
   by interpolating between segment centres. m/b/p force a crisp closure (≥ 45 ms).
3. *Target* = 0 outside the mask or below the loudness gate; else `loud^0.6 × (0.3 + 0.7 × visemeOpen)`,
   slightly closed on bright (s/sch) frames.
4. *Filter*: attack 40 ms, release 90 ms, 30 ms snap outside speech; hysteresis (shut below 0.05).
5. *Mouth*: closed = the current expression's resting mouth (smirk line, etc.). While talking the expression's
   mouth is kept (smirk corners stay asymmetric) but narrow mouths are widened, teeth/tongue appear, round /
   wide / lipIn come from the visemes. Expressions with an open resting mouth (laughing, surprised `o`,
   annoyed clench) hold it in pauses and hand the mouth to lip sync while speaking.

**Life**
- Blinks every 2.5–6 s (seeded), 18 % double blinks; expression switches to/from `laughing` are hidden by a blink.
- Breathing (3.9 s): shoulders, torso scale, head bob. Slow idle head drift and body sway.
- *Beats* = prominent loudness peaks inside speech (≥ 0.55 s apart): random subset raises the brow (right
  brow more – "eine Braue immer oben"), nods, and dips the gesturing hand.
- Talking gestures: wrist/elbow/hand-angle offsets ∝ slow speech energy (rise 0.25 s, fall 0.7 s) × per-pose
  amplitude (`explain` 1.0, `idle`/`finger` right hand ~0.6, `crossed`/`chin` ~0.1). Back to rest in pauses.
- Look: `viewer` = the expression's own pupils (e.g. unimpressed side-eye), `board`/`left`/`right`/`up`/`down`
  = directions; micro-saccades every 0.6–2.2 s; during long speech an occasional 1–2 s glance at the board.

**Cues** (eased over 0.32 s, chained transitions start from the blended state)
- `melo expr/pose/look` → expression parameters are blended numerically (brows, lids, pupils, mouth corners,
  tilt), poses blend arm points, hand angles and finger specs.
- `voice tag` hints (only if no explicit `melo` cue overrides within the window): laughs/chuckles → laughing
  1.3 s, sighs → unimpressed, sarcastic/smug/mischievous → smirk, surprised → surprised, excited/cheerful →
  talking, deadpan → deadpan.
- Auto reactions: `draw type=wrong` → unimpressed side-eye + glance at board; `type=right` → smirk + nod;
  `pause s≥2` after a `quiz` (countdown, interval `[prev_end, t]`) → chin pose, look at board;
  `reveal` → brow raise + raised finger for 1.8 s. Explicit cues always win; an overlay that would end
  < 0.7 s before the next explicit cue is held until it (no flicker).

**Line quality / boil**
The brand's SVG displacement filter is too slow for video (≈ 20 ms at full figure, ≈ 100 ms in close-ups),
so the wobble is *baked into the geometry* through `MeloB.parts.displace()` (2-octave value noise ≈ the
filter's 0.035 frequency) plus a cheap edge-grain filter using a 32 px BMP noise tile (`feImage`+`feTile`).
Boil: 4 line variants cycled every 4th frame (≈ 7.5 fps); stipple dots are not displaced → no texture flicker.

## Performance (Chromium, 1920×1080)
- `rig.render()` JS: ≈ 1–2 ms/frame (static layers cached per boil variant: skull, cut, shadow, legs, torso;
  face, arms and neck rebuilt per frame). Output ≈ 110 KB SVG per frame.
- Paint (measured as screenshot time minus an empty page, full figure 1000 px tall): ≈ 8–12 ms baked+grain,
  vs ≈ 30 ms with the original filter; close-up (head 900 px wide): grain dominates; pass `visible` and/or
  `grain:false` to stay cheap. (Numbers were taken on a shared, heavily loaded 4-core box; see the report.)

## Tuning (`MeloRig.tuning`)
| key | default | meaning |
|---|---|---|
| `attack` / `release` / `snap` | 0.040 / 0.090 / 0.030 s | mouth open / close / close-outside-speech time constants |
| `bridgeGap` | 0.12 s | word gaps shorter than this keep the mouth "in speech" |
| `padStart` / `padEnd` | 0.03 s | speech mask padding |
| `gate` | 0.06 | loudness gate (normalised envelope) |
| `closeBelow` | 0.05 | hysteresis: snap shut below |
| `openMax` | 0.9 | max lip-sync openness |
| `transition` | 0.32 s | expression / pose / look easing |
| `blinkMin` / `blinkMax` / `doubleBlink` | 2.5 / 6 s / 0.18 | blink schedule |
| `breathPeriod` | 3.9 s | breathing |
| `boilEvery` | 4 frames | line boil rate |
| `roughFreq` / `roughAmp` | 0.035 / 0.75 | baked wobble |
| `grainFreq` / `grainAmp` / `grainAmpWithFilter` | 0.45 / 0.32 / 0.12 | baked fine grain |
| `grainTile` / `grainTilePx` / `grainFilter` | 24 / 32 / 1.4 | grain filter tile (units / px), displacement |

Per-expression resting mouths: `REST` in `rig.js`; per-pose gesture amplitude: `GESTURE`; grapheme table: `VIS`.

## melo-b.js additions (backward compatible; `svg()` output byte-identical)
- `MeloB.parts`: `skull`, `cut`, `face`, `shadow`, `legs`, `neck`, `torso`, `arm`, `filter`, `displace`,
  plus `HEAD`, `HEAD_Y`, `HANDS`; `MeloB._HANDS`.
- `svg()` options `exprParams` / `poseParams` (full parameter objects instead of names);
  `hand.g` may be a finger-spec object.
- Mouth extras `round`, `wide`, `lipIn`; brow extra `lift` (applied after the dy clamp).

## Testing
```
node tools/envelope.js episodes/01-das-sagt-kein-deutscher
node engine/character/test-render.js episodes/01-das-sagt-kein-deutscher --from 0 --to 20          # MP4 with audio
node engine/character/test-render.js episodes/01-das-sagt-kein-deutscher --from 8 --to 10.4 --sheet 2 \
     --sheet-cols 6 --crop 640:640:590:0 --tile-w 330 --sheet-out sheet.png                       # contact sheet
node engine/character/test-render.js episodes/01-das-sagt-kein-deutscher --from 12 --to 15 --bench --size 1920x1080 --layout full
python3 -m http.server 8000   # → http://localhost:8000/engine/character/dev.html?ep=episodes/01-das-sagt-kein-deutscher
```
Options: `--layout split|full|head`, `--board left|right`, `--workers N`, `--size WxH`, `--align/--env/--audio`
(relative to the episode), `--rough 0`, `--filter`, `--blank` (bench baseline). Output defaults to
`episodes/<ep>/build/character-test/`.

## Known limits
- Visemes come from spelling, not phonemes (no G2P); timing inside a word is proportional, so long words with
  uneven syllables can be off by a syllable. Loudness gating keeps it honest.
- The hands are drawn ×1.22 so their baked wobble is slightly stronger than elsewhere.
- Mirroring (`boardSide:'left'`) swaps which arm is drawn on top in the `crossed` pose.
