# Melo – character generator

Melo is the mascot of *Deutsch mit Melo*: a friendly stick figure with a **watermelon head**, a curly stem with a leaf that acts as his cowlick, big shiny eyes, and a coral knit scarf. When his mouth opens, you see red watermelon flesh with seeds inside.

`melo.js` has no dependencies and returns SVG strings. It works the same in the browser (`window.Melo`), in Node (`require`) and in React/Remotion (`dangerouslySetInnerHTML` or `<g dangerouslySetInnerHTML>`).

| File | What it is |
|---|---|
| `melo.js` | The generator |
| `sheet.html` | Model sheet. Render it with `node tools/render.js brand/character/sheet.html brand/out/melo-model-sheet.png 1920 1080 2` |
| `hero.html` | Hero image (`#transparent` for no background, `#avatar` for a 1000×1000 profile picture) |
| `../out/` | `melo-model-sheet.png`, `melo-hero.png`, `melo-hero-transparent.png`, `melo-hero.svg`, `melo-avatar.png` |

## API

```js
const r = Melo.render(opts);   // → { svg: '<g …>', anchors, face, pose }
Melo.group(opts);              // → just the <g> string
Melo.svg(opts);                // → standalone <svg> (viewBox = Melo.bounds(opts))
Melo.blend('happy', 'sad', t);       // tweenable expression object → opts.expression
Melo.blendPose('idle', 'wave', t);   // tweenable pose object       → opts.pose
Melo.walk(phase0to1);                // partial pose for a bouncy front-facing walk
Melo.mouthFromAmplitude(rms, gate=.06, gain=1.6); // audio level → mouthOpen 0..1
Melo.expressions / poses / mouths / palette / geometry / expressionNames / poseNames
```

### Options

| option | values |
|---|---|
| `expression` | `neutral` `happy` `laughing` `surprised` `thinking` `wink` `sad` `confused` `excited` `proud` `embarrassed` `skeptical`, or an expression object (e.g. from `blend`) |
| `face` | Partial overrides that are deep-merged into the expression (e.g. `{browL:{y:-8}}`) |
| `mouthOpen` | `0..1` lip sync. It **replaces** the expression's mouth opening but keeps its smile and width. 0 = closed line, about 0.3 or more shows the red inside and seeds, 1 = wide D-shape |
| `mouth` | Viseme name: `closed` `small` `open` `wide` `O` `U` `E` `M` `smile` (a number works like `mouthOpen`) |
| `blink` | `0..1` (eyes that are already closed in a happy `^` shape stay that way) |
| `look` | `{x,y}` in `-1..1`: pupil offset |
| `turn` | `-1..1`: turns the face and stripes around the sphere for a ¾ view. ±0.6 looks best |
| `headTilt`, `lean`, `shrug`, `bob` | Degrees / degrees / `0..1` / units. These add to what the pose sets |
| `pose` | `idle` `wave` `pointLeft` `pointRight` `pointUpLeft` `pointUpRight` `explain` `thinking` `thumbsUp` `shrug` `celebrate` `handsOnHips` `present` `holdMarker` `writeRight`, or a pose object |
| `armL` `armR` `legL` `legR` | Per-limb overrides (see below) |
| `prop` / `propHand` | `'marker'` puts a whiteboard marker in `armR` (or in `propHand`) |
| `blush` `sweat` `seedPop` `leafDroop` `cheeks` | `0..1` FX. `seedPop` is the seed's flight progress (≈0.6 looks good in a still) |
| `wind` | `0..1`: scarf tails flutter |
| `seed` | Integer jitter seed. Changing it 6–12×/s gives "boiling lines": the shape stays the same and the lines shimmer |
| `wobble` | Jitter amount (default 1; 0 = perfectly clean) |
| `x`, `y`, `scale`, `flip` | Placement of the feet anchor. `flip` mirrors him horizontally |
| `headOnly` | Draws only the head, centred at (0,0). Use it for avatars and close-ups |
| `id` | Prefix for clip/gradient ids. **Set a stable, unique id per instance in React** (otherwise an auto counter is used) |

**Limb rig.** Each arm is `{a, e, hand, front}`.
- `a` is the shoulder angle in degrees: 0 = hanging down, 90 = horizontal and pointing outward, 180 = straight up.
- `e` is the elbow bend. The forearm's angle is `a+e`.
- `hand` is one of `rest` `fist` `open` `point` `thumb` `peace` `hold`.
- `front:true` draws that arm in front of the head (e.g. hand on chin).

`armL`/`armR` mean screen-left and screen-right before `flip`. Both arms use mirrored angles, so a symmetric pose uses the same numbers on both sides. Legs are `{a, k, foot}`, where `k` is the knee bend. All values are numbers, so the engine can tween between poses with `blendPose` or its own lerp.

### Coordinate system and anchors
Units are character units (before `scale`), with +y pointing down. The origin **(0,0) is the ground point between the feet**.

| Point | Position |
|---|---|
| Head centre | ≈ (0,−217), radii 72×63 |
| Neck | (0,−158) |
| Shoulders | (0,−143) |
| Hip | (0,−80) |

The full figure fits in `x −165…165, y −352…16`.

`render().anchors` gives output-space coordinates for `feet`, `hip`, `neck`, `headCenter`, `headTop`, `mouth`, `handL`, `handR`, `elbowL`, `elbowR`, `footL`, `footR`, and `markerTipL`/`markerTipR` when a marker is held. They already include lean, tilt, scale and flip. Use them to attach props, place speech bubbles, or start "writing" strokes on the board.

## Palette

| token | hex | use |
|---|---|---|
| ink | `#1E1E1E` | Outlines, body, seeds |
| paper | `#FBF8F1` | Background |
| rind | `#5DB04E` | Head skin |
| stripe | `#2E7D32` | Zig-zag stripes |
| rindLight | `#8ED07A` | Soft top-left light |
| flesh | `#F0524F` | Mouth inside |
| fleshDark | `#C93A41` | Shadow under the upper lip |
| pith | `#E9F5CF` | Pale rind band around the mouth (the "watermelon slice" look) |
| cheek | `#FF9AA2` | Cheeks, blush |
| leaf / leafDark | `#79C452` / `#3E8A34` | Leaf |
| stem | `#7A5A2B` | Stem |
| scarf / scarfDark | `#FF7A59` / `#E2553C` | Signature scarf (brand accent) |
| sweat | `#8FD3F4` | Sweat drop |
| marker | `#2F6FB5` | Marker cap |

## Design notes
- **Line style.** Lines are hand-authored marker strokes: seeded, low-frequency wobble with round caps, and tapered brush fills for brows, closed eyes and the mouth line. They stay clean and readable at 60 px (avatar) and in 1080p close-ups. Line weights are 4.6 for the head, 6.2 for limbs and 3.2 for the eyes; they scale with `scale`.
- **The head reads as a watermelon instantly.** The stripes are sphere-projected meridians with zig-zag edges, clipped to the head, plus a soft radial shade, a white marker shine, and a few hatch marks at the lower right.
- **Eyes stay alive.** They always have two shine dots, and pupils are clipped to the eye shape, so lids (sleepy, sad, happy-squint) cut the pupil correctly.
- **The open mouth is a watermelon slice.** You see the pale rind band, red flesh and up to four seeds. Seeds fade in as the mouth opens. As `mouthOpen` rises, the mouth gets slightly rounder through the middle range, so one amplitude value still produces varied shapes. Recommended smoothing in the engine: an attack of about 40 ms, a release of about 90 ms, and holding the mouth closed for at least 2 frames on silence.
- **Signature traits.** `seedPop` (a seed flies out of the head when he is surprised), `blush` (a pink band plus cheek hatching — an overlay on the whole head turned muddy brown, so it was dropped), `leafDroop` (the leaf lies flat when he is sad), `sweat` (self-ironic moments), and blinking.

## Known limitations
- **Front view only.** `turn` fakes up to about a ¾ view of the face, but the body has no side view. `walk()` is a bouncy front-facing walk.
- **Arms behind the head.** Arms are drawn behind the head unless `front:true`. Because the head is big, a raised hand only clears it when the arm reaches outward first (see the `wave` and `celebrate` presets).
- **Pose blending.** `blendPose` lerps angles linearly and snaps non-numeric fields (hand type) at t=0.5.
- **SVG ids.** Each instance creates clipPath/gradient ids, so give each one a unique `id` when several Melos share a page.
