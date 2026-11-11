# Supporting cast (`engine/cast/`)

Fruit-headed people for the illustrated scenes of "Visual flow v2" (see `docs/PIPELINE.md`). They are drawn in
Melo's exact ink language: the same `MeloB._Ink` brush, ring, tube and hatch primitives, limb and 4-finger hand
construction, shadow-side line weight, stipple and three hatch layers lit from the top-left, and the same
baked roughness, cheap grain tile and boil as `engine/character/rig.js`.

| file | what |
|---|---|
| `cast.js` | the generator (UMD: browser `window.Cast` after `brand/concepts/b/melo-b.js`; Node `require()`) |
| `sheet.html` | check pages: `?page=sheet` (default), `char&id=…`, `exprs&id=…`, `lineup`, `size`; plus `&t= &talk= &flip=1 &grain=0` |
| `render-sheet.js` | Playwright → PNG (`--page --id --scale --out`), or `--bench` |
| `cast-sheet.png` | lineup next to Melo + 4 expressions and 3 poses per character (rendered at 2×) |

## Cast

| id | who | fruit / look | height¹ | default expr / prop |
|---|---|---|---|---|
| `kollegin` | office colleague | pear with a leaf "hair clip"; powder-blue blouse, red lanyard + badge, pencil skirt, heels | 484 | neutral / cup |
| `schwiegermutter` | mother-in-law | red apple; mustard cardigan, pearls, red gingham apron over a blue dress | 430 | skeptical / bowl (potato salad) |
| `kellner` | waiter | banana (crescent, tall, slightly bent); white shirt, black vest, bow tie, long bistro apron, pencil moustache | 553 | tired / notepad |
| `kumpel` | buddy | kiwi with the top cut off (green flesh, cream core, black seeds), fuzzy outline, stubble; rust hoodie, jeans, sneakers | 450 | happy / beer |
| `mitbewohnerin` | flatmate | strawberry, calyx bangs + hair tie; oversized mustard tee, slouch socks, slippers | 477 | tired / phone |
| `kind` | small child | cherry with a cap (stem poking out), big eyes, gap tooth; striped tee, shorts | 311 (≈ 65 % of Melo) | happy / icecream |
| `chefin` | boss | pineapple, crown = hairdo; navy blazer with lapels, brooch, trousers, heels | 564 | skeptical (arms-crossed) / clipboard |
| `oma` | grandma | plum with a bun + hairpin, round glasses on a chain, white brows; sage cardigan, tweed skirt | 420 | happy / plate |
| `arzt` | doctor | coconut with a fibre tuft, ENT head mirror, white bushy brows; white coat, stethoscope, tie | 502 | tired / clipboard |
| `moderator` | game-show host | orange with a slick leaf quiff, showbiz grin; shiny purple suit, red bow tie | 473 | happy (hold) / mic |

¹ Units to the head top (including stem/crown), feet at 0. Melo is ≈ 455 (cut top) in the same units.
No lemons.

## API

```js
var fr = Cast.render(id, {
  expr: 'happy',     // see Cast.EXPRESSIONS (default: the character's default)
  pose: 'talk',      // see Cast.POSES
  talk: 0.0,         // 0..1 mouth openness driver = narrator loudness while this character's quote is spoken
  t: 12.4,           // seconds: blink, breathing, sway, talk-gesture drift, wave, fan, coffee steam, line boil
  seed: 3,           // optional; default is derived from the id (blink schedule, jitter, texture)
  flip: false,       // true = faces left (built with mirrored light, so it is still lit from the top-left)
  scale: 1,          // applied inside the returned group; anchors are scaled too
  id: 'k1',          // <defs> id prefix: REQUIRED to be unique when the same character appears twice in one SVG
  prop: 'fan',       // only in pose 'hold': see Cast.PROPS (default: the character's prop)
  look: [dx, dy],    // optional pupil override, −1..1
  from: { expr, pose }, w: 0..1,   // optional eased blend from a previous state (engine-driven transitions)
  grain: true, rough: 1, boil: true, fps: 30
});
fr.svg      // '<g class="cast cast-<id>">…</g>' with its own <defs>; feet at (0,0), +y down, Melo's units
fr.anchors  // { feet, headCenter, headTop, mouth, eyes, handL, handR, propTip|null, bbox:[x,y,w,h] } (flip+scale applied)
fr.state    // { id, expr, pose, prop, talk, blink, boil }
Cast.list()        // ids
Cast.info(id)      // { id, name, who, fruit, height, headCenter, colours, defaults, bbox }
Cast.EXPRESSIONS / Cast.POSES / Cast.PROPS
```
Placement: `<g transform="translate(X Y) scale(s)">${fr.svg}</g>`, where (X, Y) is the slot's feet position.
`handL`/`handR` are the viewer-left/right wrists. Use `mouth`/`headTop` for speech-bubble tails.

**Expressions** (14): neutral, happy, laughing, surprised, shocked (dread lines), confused, annoyed (anger
ticks), skeptical (side-eye, one brow up), tired (heavy lids, bags), embarrassed (blush, sweat drop, wobbly
mouth), sweaty (3 drops), drunk (blush, red nose, uneven eyes), sad, smug.
Aliases: smirk→smug, unimpressed→skeptical, deadpan/talking→neutral, angry→annoyed, scared→shocked.

**Poses** (12): idle, talk (gesturing, animated by `t`), point, arms-crossed, hands-up, facepalm (the hand
tracks the face), hold, sit, wave (animated), shrug, think (hand on chin), hands-hips.
Aliases: crossed, explain, gesture, chin, finger.
`sit` keeps the feet at (0,0) and lowers the hips to ≈ −112·S (chair-seat height); knees show as foreshortened caps.

**Props** (`pose:'hold'`): notepad, mic, phone, plate, bowl (potato salad), cup (steaming coffee), beer (Maß),
clipboard, fan (flaps with `t`), glass, icecream. `propTip` is the top of the prop (mic head, steam start).

**Mouth / lip sync.** `talk` > 0.04 opens the mouth (`talk^0.8 · 0.85`), widens narrow resting mouths, shows
teeth and tongue, and varies round/wide with `t` noise. There are no visemes: the engine only has loudness for
supporting characters. `talk = 0` holds the expression's resting mouth, so there is no flapping in pauses.
The engine should pass 0 outside the quote's words. Talking also adds small head bobs.

**Life.** Blinks are hash-scheduled per 0.95 s slot (≈ every 3 s, rare doubles), so a frame needs no history.
Breathing lasts 3.7 s (shoulders and torso scale), with a slow head drift and body sway, plus talk-pose arm drift.

## Implementation notes
- Heads are star-shaped silhouettes. A radial profile gives an inside test and sphere-like shading (`lum`)
  for any shape, which drives the stipple, mottling and Melo's three hatch layers. Each fruit adds texture
  (lenticels, meridian streaks, seeds, fruitlet lattice, pores, fibres, fuzz, cut flesh) plus back and front
  extras (leaves, crown, stem, cap, bun). Head spec `k` scales a design down without thinning the outline.
- Bodies reuse Melo's pose skeleton (Melo units). They are mapped per character by `S` (overall; `kind` 0.5),
  `legK`, `torsoK`, `wK`, `armK` and `bend`. Garments are built from the mapped torso (`topPoly`/`garment`,
  `skirtPoly`, lapels, collars, V-necks, bow ties, stripes, gingham).
- **Caching** (module-level LRU, 1500 entries): displacement fields, the head per boil variant and flip, legs
  plus lower garments keyed on quantised leg geometry, and torso garments keyed on quantised torso geometry.
  Built per frame: face, neck, arms, sleeves, hands and props.
- **Performance** (Chromium): JS ≈ 0.8–1.4 ms per character per frame. JS plus DOM insertion ≈ 2.2–3.3 ms.
  SVG ≈ 75–135 KB. Paint for a 1000 px-tall figure ≈ 15–28 ms over a blank page (grain filter included);
  `grain:false` is cheaper.
- **Determinism**: the output depends only on the inputs (verified by rendering frames in reverse order with a
  cleared cache and getting identical strings). Every part builds its own `Ink(seed + k)`.

## Known limits
- No visemes for the cast: the mouth shape comes from loudness plus noise.
- Expressions switch instantly unless the engine passes `from` + `w`.
- Front view only (the heads turn via `flip`, the pupils and the face asymmetry). There are no profile views or walk cycles.
- `arms-crossed` and `facepalm` read best at ≥ 40 % frame height. At ~30 % the faces stay readable but the props get tiny.
- In `sit`, skirts and aprons only cover the lap. Sets should put a table or chair in front.
