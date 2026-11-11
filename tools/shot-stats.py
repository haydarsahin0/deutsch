#!/usr/bin/env python3
# Shot statistics + shotlist for an episode script (visual flow v2).
# Usage: python3 tools/shot-stats.py <script.md> <alignment.json> [--until S] [--shotlist out.md]
"""Shot-flow QA for an episode script: validates v2 cues and prints pacing stats.
usage: check.py <script.md> <alignment.json> [--until SECONDS] [--shotlist out.md]"""
import json, re, sys, collections
sys.path.insert(0, '/home/user/deutsch/tools')
import align  # noqa

args = sys.argv[1:]
script, alj = args[0], args[1]
until = float(args[args.index('--until') + 1]) if '--until' in args else None
shotlist = args[args.index('--shotlist') + 1] if '--shotlist' in args else None

VOCAB = {'scene', 'camera', 'melo', 'draw', 'next', 'strike', 'highlight', 'tick', 'erase', 'quiz', 'reveal',
         'voice', 'pause', 'sfx', 'shot', 'cast', 'say', 'prop', 'fx', 'pin'}
SHOT_TYPES = {'scene', 'text', 'split', 'board', 'list', 'map', 'chapter', 'melo', 'quiz'}
SETS = set('office-hot dinner-table cellar winter-room living-room cinema-front football-park biergarten '
           'supermarket-checkout doctor-office doorstep quiz-show kneipe job-interview bakery after-work-desk '
           'park-bench university laptop-email wg-kitchen exam-room map-dach board office-plain street-day'.split())
CAST = set('kollegin schwiegermutter kumpel mitbewohnerin kellner chefin kind oma arzt moderator'.split())
CAST_EXPR = set('neutral happy laughing surprised shocked confused annoyed skeptical tired embarrassed talking'.split())
CAST_POSE = set('idle talk point arms-crossed hands-up facepalm hold sit'.split())
MELO_EXPR = set('deadpan smirk talking surprised unimpressed annoyed laughing'.split())
MELO_POSE = set('idle finger point explain crossed chin shrug'.split())
FX = set('shake flash zoom-punch sweat steam hearts question-marks sparkle record-scratch'.split())
IN = set('cut ink whip slide zoom'.split())
CAM = set('wide push pan-left pan-right tilt'.split())
CAMSHOT = set('wide melo board close'.split()) | CAM
DRAW = set('title wrong right word sentence note bubble list icon'.split())
TEXT_STYLES = set('wrong right big question stack'.split())
MELO_MODES = re.compile(r'^(off|corner-left|corner-right|side-left|side-right|in-scene:[\w-]+)$')
EVENT = {'shot', 'draw', 'say', 'prop', 'fx', 'cast', 'camera', 'next', 'strike', 'tick', 'highlight', 'erase',
         'pin', 'reveal', 'quiz'}

al = json.load(open(alj))
sc = align.parse_script(script)
W = al['words']
assert len(sc['words']) == len(W), (len(sc['words']), len(W))
dur = al['duration']
problems = []


def t_of(c):
    w = c['word']
    return W[w]['start'] if w < len(W) else W[-1]['end']


def words_on_screen(s):
    return len([x for x in re.split(r'[\s|]+', s) if re.search(r'\w', x)])


cues = []
for c in sc['cues']:
    c = dict(c)
    c['t'] = t_of(c)
    cues.append(c)
    n, a, ln = c['cue'], c['args'], c['line']
    where = f"line {ln} [[{n}]]"
    if n not in VOCAB:
        problems.append(f"{where}: unknown cue")
    if n == 'shot':
        ty = a.get('type')
        if ty not in SHOT_TYPES: problems.append(f"{where}: bad type {ty}")
        if ty == 'scene':
            if a.get('set') not in SETS: problems.append(f"{where}: bad set {a.get('set')}")
            for ent in filter(None, [e.strip() for e in str(a.get('cast', '')).split(',')]):
                p = ent.split(':')
                if p[0] not in CAST: problems.append(f"{where}: bad cast id {p[0]}")
                if len(p) > 2 and p[2] not in CAST_EXPR: problems.append(f"{where}: bad cast expr {p[2]}")
        if ty == 'melo' and a.get('framing') not in ('medium', 'wide'): problems.append(f"{where}: framing")
        if ty == 'text' and a.get('style') not in TEXT_STYLES: problems.append(f"{where}: style")
        if ty not in ('chapter', 'melo') and not MELO_MODES.match(str(a.get('melo', ''))):
            problems.append(f"{where}: melo mode missing/bad: {a.get('melo')}")
        if 'in' in a and a['in'] not in IN: problems.append(f"{where}: in={a['in']}")
        if 'cam' in a and a['cam'] not in CAM: problems.append(f"{where}: cam={a['cam']}")
    if n == 'cast':
        if a.get('id') not in CAST: problems.append(f"{where}: bad id")
        if 'expr' in a and a['expr'] not in CAST_EXPR: problems.append(f"{where}: expr {a['expr']}")
        if 'pose' in a and a['pose'] not in CAST_POSE: problems.append(f"{where}: pose {a['pose']}")
    if n == 'say' and a.get('who') not in CAST | {'melo'}: problems.append(f"{where}: who {a.get('who')}")
    if n == 'fx' and a.get('name') not in FX: problems.append(f"{where}: fx {a.get('name')}")
    if n == 'camera' and a.get('shot') not in CAMSHOT: problems.append(f"{where}: camera {a.get('shot')}")
    if n == 'draw' and a.get('type') not in DRAW: problems.append(f"{where}: draw {a.get('type')}")
    if n == 'melo':
        if 'expr' in a and a['expr'] not in MELO_EXPR: problems.append(f"{where}: melo expr {a['expr']}")
        if 'pose' in a and a['pose'] not in MELO_POSE: problems.append(f"{where}: melo pose {a['pose']}")
    for k in ('text', 'sub', 'left', 'right', 'title', 'q'):
        if k in a and isinstance(a[k], str) and words_on_screen(a[k]) > 8:
            problems.append(f"{where}: {k} has > 8 words: {a[k]}")

if until:
    cues = [c for c in cues if c['t'] <= until]
    end = until
else:
    end = dur

shots = [c for c in cues if c['cue'] == 'shot']
# shot spans
spans = []
for i, s in enumerate(shots):
    t1 = shots[i + 1]['t'] if i + 1 < len(shots) else end
    spans.append((s, s['t'], t1))
first_t = shots[0]['t'] if shots else 0


def melo_visible(a):
    ty = a.get('type')
    if ty == 'melo': return True
    m = str(a.get('melo', 'off'))
    return m != 'off'


vis = sum(t1 - t0 for s, t0, t1 in spans if melo_visible(s['args']))
lens = [(t1 - t0, s) for s, t0, t1 in spans]
nonquiz = [(l, s) for l, s in lens if s['args'].get('type') != 'quiz']
types = [s['args'].get('type') for s in shots]
run, maxrun, runs_bad = 1, 1, []
for i in range(1, len(types)):
    run = run + 1 if types[i] == types[i - 1] else 1
    if run > 2: runs_bad.append((shots[i]['line'], types[i], run))
    maxrun = max(maxrun, run)

# visual events (melo cues count only while melo visible)
evt = []
for s, t0, t1 in spans:
    pass
cur_vis = False
shot_iter = iter(spans)
for c in cues:
    if c['cue'] == 'shot':
        cur_vis = melo_visible(c['args'])
    if c['cue'] in EVENT or (c['cue'] == 'melo' and cur_vis):
        evt.append(c['t'])
evt = sorted(set(evt)) + [end]
gaps = [(evt[i + 1] - evt[i], evt[i]) for i in range(len(evt) - 1)]
# quiz countdown windows (inserted pauses) excluded from gap check
qwin = [(p['at'], p['at'] + p['dur'] + 1.5) for p in al.get('inserted_pauses', [])]
gaps_nq = [(g, t) for g, t in gaps if not any(a - 1 <= t <= b for a, b in qwin)]

print(f"range 0–{end:.1f}s: {len(shots)} shots")
if lens:
    print(f"shot length avg {sum(l for l, _ in lens) / len(lens):.2f}s, "
          f"max(non-quiz) {max(nonquiz, key=lambda x: x[0])[0]:.2f}s (line {max(nonquiz, key=lambda x: x[0])[1]['line']}), "
          f"min {min(lens, key=lambda x: x[0])[0]:.2f}s")
    long = [(round(l, 1), s['line']) for l, s in nonquiz if l > 7]
    print(f"shots > 7 s: {long}")
    print(f"shots < 1.5 s: {[(round(l, 1), s['line']) for l, s in lens if l < 1.5]}")
print(f"max time without visual event: {max(gaps_nq)[0]:.2f}s at {max(gaps_nq)[1]:.1f}s; "
      f"gaps > 5 s: {[(round(g, 1), round(t, 1)) for g, t in gaps_nq if g > 5]}")
covered = end - first_t
print(f"Melo visible {100 * vis / covered:.1f}% of {covered:.1f}s")
print("per type:", dict(collections.Counter(types)))
modes = collections.Counter((s['args'].get('melo') or ('medium' if s['args'].get('type') == 'melo' else 'off')).split(':')[0]
                            for s in shots)
print("melo modes:", dict(modes))
print("sets:", dict(collections.Counter(s['args'].get('set') for s in shots if s['args'].get('type') == 'scene')))
print(f"max same-type run {maxrun}; runs > 2: {runs_bad}")
print("cue counts:", dict(collections.Counter(c['cue'] for c in cues)))
props = sorted({c['args'].get('name') for c in cues if c['cue'] == 'prop'})
print("prop names:", props)
print("PROBLEMS:" if problems else "no problems", *problems, sep='\n  ')

if shotlist:
    def fmt(t): return f"{int(t // 60)}:{t % 60:04.1f}"
    rows = ["| # | Zeit | Dauer | Typ | Set / Cast | Melo | Was ist zu sehen |", "|---|---|---|---|---|---|---|"]
    secs = [(W[x['word']]['start'] if x['word'] < len(W) else end, x['title']) for x in sc['sections']]
    for i, (s, t0, t1) in enumerate(spans):
        while secs and secs[0][0] <= t0 + 0.01:
            rows.append(f"| | | | **{secs.pop(0)[1]}** | | | |")
        a = s['args']
        ty = a.get('type')
        setcast = ''
        if ty == 'scene':
            setcast = a.get('set', '') + (' · ' + ', '.join(e.split(':')[0] for e in a.get('cast', '').split(',') if e.strip()) if a.get('cast') else '')
        elif ty == 'map': setcast = 'map-dach'
        melo = 'medium' if ty == 'melo' and a.get('framing') == 'medium' else ('wide' if ty == 'melo' else a.get('melo', '–'))
        inner = [c for c in cues if t0 <= c['t'] < t1 and c is not s and c['cue'] not in ('voice', 'pause', 'melo', 'sfx')
                 and not (c['cue'] == 'shot')]
        desc = []
        for k in ('title', 'text', 'sub'):
            if a.get(k): desc.append(f"„{a[k]}“" if k != 'sub' else f"({a[k]})")
        if ty == 'split': desc.append(f"✗ {a.get('left')} ↔ ✓ {a.get('right')}")
        if ty == 'chapter' and a.get('num'): desc.insert(0, f"Nr. {a.get('num')}")
        for c in inner:
            ca = c['args']
            if c['cue'] == 'say': desc.append(f"{ca.get('who')}: „{ca.get('text')}“")
            elif c['cue'] == 'draw': desc.append(f"{ca.get('type')}: " + (ca.get('text') or ca.get('items') or ca.get('name') or ''))
            elif c['cue'] == 'prop': desc.append(f"prop {ca.get('name')}")
            elif c['cue'] == 'fx': desc.append(f"fx {ca.get('name')}")
            elif c['cue'] == 'pin': desc.append(f"pin {ca.get('at')}: {ca.get('text')}")
            elif c['cue'] == 'quiz': desc.append(f"Quiz: {ca.get('q')}")
            elif c['cue'] == 'camera': desc.append(f"cam {ca.get('shot')}" + (f"→{ca['focus']}" if 'focus' in ca else ''))
            elif c['cue'] == 'cast': desc.append(f"{ca.get('id')} {ca.get('expr', '')}{' ' + ca['pose'] if 'pose' in ca else ''}".strip())
            elif c['cue'] in ('next', 'strike', 'tick', 'reveal', 'highlight', 'erase'): desc.append(f"{c['cue']} {ca.get('id')}")
        cam = a.get('cam')
        if cam and cam != 'wide': desc.insert(0, f"cam {cam}")
        rows.append(f"| {i + 1} | {fmt(t0)} | {t1 - t0:.1f}s | {ty}{'/' + a['style'] if a.get('style') else ''} | {setcast} | {melo} | "
                    + ' · '.join(d.replace('|', '/') for d in desc) + " |")
    open(shotlist, 'w').write('\n'.join(rows) + '\n')
