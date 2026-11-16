"""Pen & wash comic cards on an oak table (vertical 1080x1920) for the ep3 hook: Tag 30 / Wow, toller Text! / 11 Fehler / der eine Satz."""
import sys, os, json
LIB, OUT = sys.argv[1], sys.argv[2]
sys.path.insert(0, LIB)
import numpy as np
from penwash import PenWash
O, S, T, B = PenWash.oval, PenWash.smooth, PenWash.turn, PenWash.box
os.makedirs(OUT, exist_ok=True)
CW, CH = 470, 780
CARDS = [(272, 470, -3.0), (806, 520, 2.6), (276, 1388, 2.0), (808, 1356, -2.4)]

def melo_head(pw, cx, cy, r, z, smirk=True, big_brow=True):
    P = {}
    P['rind'] = pw.part(O(cx, cy + r * 0.15, r, r * 0.95), z=z)
    P['flesh'] = pw.part(O(cx, cy - r * 0.62, r * 0.97, r * 0.26), z=z + 1)
    for (dx, dy) in [(-0.55, -0.66), (-0.2, -0.72), (0.15, -0.6), (0.5, -0.7), (-0.35, -0.55), (0.32, -0.52)]:
        pw.dot(cx + dx * r, cy + dy * r, r * 0.045, z=z + 2)
    for k in (-0.62, -0.31, 0, 0.31, 0.62):
        pw.stroke([(cx + k * r, cy - r * 0.38), (cx + k * r * 1.08, cy + r * 0.3), (cx + k * r * 0.9, cy + r * 0.95)], z=z + 0.5,
                  width=pw.width * 0.8, double=0)
    pw.dot(cx - r * 0.3, cy + r * 0.05, r * 0.085, z=z + 3); pw.dot(cx + r * 0.32, cy + r * 0.05, r * 0.085, z=z + 3)
    pw.stroke([(cx + r * 0.15, cy - r * 0.2), (cx + r * 0.32, cy - r * (0.3 if big_brow else 0.22)), (cx + r * 0.5, cy - r * 0.22)], z=z + 3)
    pw.stroke([(cx - r * 0.48, cy - r * 0.15), (cx - r * 0.3, cy - r * 0.17), (cx - r * 0.14, cy - r * 0.15)], z=z + 3)
    if smirk: pw.stroke([(cx - r * 0.12, cy + r * 0.45), (cx + r * 0.12, cy + r * 0.5), (cx + r * 0.38, cy + r * 0.36)], z=z + 3)
    return P

def wash_head(pw, P):
    pw.wash(P['rind'], 'green', 0.9); pw.wash(P['flesh'], 'coral', 1.0)

def card1(pw):   # Tag 30: Melo at the laptop at night
    P = {}
    pw.frame(22, 22, CW - 22, CH - 22)
    P['win'] = pw.part(B(340, 190, 170, 200), z=-5, corners=True, smooth=False)
    pw.stroke([(340, 92), (340, 288)], z=-4, double=0); pw.stroke([(256, 190), (424, 190)], z=-4, double=0)
    P['moon'] = pw.part(O(380, 140, 22), z=-3)
    P['desk'] = pw.part(B(235, 600, 410, 34), z=5, corners=True, smooth=False)
    pw.stroke([(60, 617), (66, 740)], z=4, double=0); pw.stroke([(410, 617), (404, 740)], z=4, double=0)
    P['screen'] = pw.part(T(B(320, 470, 170, 120), 320, 470, 8), z=8, corners=True, smooth=False)
    P['base'] = pw.part(B(300, 575, 190, 18), z=9, corners=True, smooth=False)
    P['mug'] = pw.part(B(420, 560, 34, 42), z=9, corners=True, smooth=False)
    P['head'] = melo_head(pw, 140, 380, 74, z=12)
    P['body'] = pw.part(B(140, 520, 96, 120), z=11, corners=True, smooth=False)
    P['arm'] = pw.limb([(170, 490), (230, 540), (280, 568)], 14, 11, z=13)
    return P
def card1_wash(pw, P):
    pw.wash(P['win'], 'cobalt', 1.1); pw.wash(P['moon'], 'yellow', 1.0)
    pw.wash(P['desk'], 'brown', 0.9); pw.wash(P['screen'], 'sky', 0.7); pw.wash(P['base'], 'grey', 0.6)
    pw.wash(P['mug'], 'terracotta', 0.9); wash_head(pw, P['head']); pw.wash(P['body'], 'cobalt', 0.8)
    pw.wash(P['arm'], 'cobalt', 0.8)
    pw.background_block(40, 40, CW - 40, 420, 'bluegrey', 0.55, rough=4, corner=6, halo=3.5)

def card2(pw):   # the phone with the over-friendly answer
    P = {}
    pw.frame(22, 22, CW - 22, CH - 22)
    P['phone'] = pw.part(B(235, 400, 300, 560), z=2, corners=True, smooth=False)
    P['screen'] = pw.part(B(235, 395, 262, 470), z=3, corners=True, smooth=False)
    P['bubble'] = pw.part(S([(110, 210), (360, 210), (372, 330), (300, 340), (262, 372), (262, 340), (110, 340)], closed=True), z=6)
    P['stars'] = [pw.part([(x + 18 * np.cos(a) * (1 if i % 2 == 0 else 0.45), 450 + 18 * np.sin(a) * (1 if i % 2 == 0 else 0.45))
                           for i, a in enumerate(np.linspace(-np.pi / 2, 1.5 * np.pi, 10, endpoint=False))], z=7, corners=True, smooth=False)
                  for x in (170, 235, 300)]
    P['mini'] = pw.part(S([(140, 520), (330, 520), (336, 580), (140, 580)], closed=True), z=6)
    return P
def card2_wash(pw, P):
    pw.wash(P['phone'], 'black', 0.9); pw.wash(P['screen'], 'mint', 0.35)
    pw.wash(P['bubble'], 'teal', 0.75); pw.wash(P['stars'], 'yellow', 1.1); pw.wash(P['mini'], 'teal', 0.35)
    pw.background_block(40, 40, CW - 40, CH - 40, 'pink', 0.45, rough=4, corner=6, halo=3.5)

def card3(pw):   # the text with 11 errors
    P = {}
    pw.frame(22, 22, CW - 22, CH - 22)
    P['sheet'] = pw.part(T(B(235, 430, 330, 520), 235, 430, -3), z=2, corners=True, smooth=False)
    for k in range(10):
        y = 230 + k * 44
        xs = np.linspace(100, 360 - (60 if k % 3 == 2 else 0), 9)
        pw.stroke([(x, y + 4 * np.sin(x / 13 + k)) for x in xs], z=3, width=pw.width * 0.7, double=0)
    return P
def card3_wash(pw, P):
    pw.wash(P['sheet'], 'warmgrey', 0.18, gaps=0)
    pw.background_block(40, 40, CW - 40, CH - 40, 'ochre', 0.5, rough=4, corner=6, halo=3.5)

def card4(pw):   # Melo close-up, smirking: the one sentence
    P = {}
    pw.frame(22, 22, CW - 22, CH - 22)
    P['head'] = melo_head(pw, 235, 500, 150, z=10)
    P['bubble'] = pw.part(S([(70, 70), (400, 70), (410, 220), (300, 230), (250, 280), (250, 230), (70, 230)], closed=True), z=12)
    return P
def card4_wash(pw, P):
    wash_head(pw, P['head']); pw.wash(P['bubble'], 'yellow', 0.35)
    pw.background_block(40, 260, CW - 40, CH - 40, 'teal', 0.7, rough=4, corner=6, halo=3.5)

DRAW = [(card1, card1_wash), (card2, card2_wash), (card3, card3_wash), (card4, card4_wash)]
pw = PenWash(1080, 1920, seed=33, keep_stages=True, stages_dir=OUT)
pw.table('oak')
cards = [pw.card(cx, cy, CW, CH, rot=r, corner=6.0, seed=200 + k) for k, (cx, cy, r) in enumerate(CARDS)]
pw.stage('cards')
parts = []
for k, c in enumerate(cards):
    pw.use(c); parts.append(DRAW[k][0](pw)); pw.ink(); pw.stage(f'ink{k}')
for k, c in enumerate(cards):
    pw.use(c); DRAW[k][1](pw, parts[k])
pw.stage('wash')
pw.pen(560, 1880, 160, length=520, r=14)
pw.save(os.path.join(OUT, 'final.jpg'), stages_dir=OUT)
json.dump({'cards': CARDS, 'cw': CW, 'ch': CH}, open(os.path.join(OUT, 'layout.json'), 'w'))
print('done')
