"""Vertical Delft-tile Short: Melo carries DEUTSCH up the dike; painted counter 48/49/50/3; proverb cartouche."""
import sys, os
LIB, OUT = sys.argv[1], sys.argv[2]
sys.path.insert(0, LIB)
import numpy as np
from delft import DelftTile, arc

def render(name, big, cart, stages=None, melo=True):
    t = DelftTile(1080, 1920, tile=120, joint=3.4, origin=(0, -20), seed=31)
    R = t.tableau(1, 2, 8, 12)                 # 7 x 10 tiles: x 120..960, y 220..1420
    x0, x1, y0, y1 = 120, 960, 220, 1420
    t.layer('picture')
    cx = (x0 + x1) / 2
    cart_poly = [(cx - 330, 1340), (cx + 330, 1340), (cx + 346, 1352), (cx + 352, 1370), (cx + 346, 1388), (cx + 330, 1400),
                 (cx - 330, 1400), (cx - 346, 1388), (cx - 352, 1370), (cx - 346, 1352)]
    t.occlude(cart_poly, grow=0.5)
    def Y(x): return 1300 - (x - x0) * 0.58     # steep dike
    S = 1.15
    mx = 470
    my = Y(mx + 20 * S) - 300 * S + 40
    def P(u, v): return (mx + u * S, my + v * S)
    if melo:
        hr = 62
        top = [P(np.cos(a) * hr * 0.98, -40 + 18 * np.sin(a)) for a in np.linspace(0, 2 * np.pi, 40)]
        t.closed(top, 2.4); t.wash(top, 0.30, slip=0.4, pool=0.5)
        for (dx, dy) in [(-34, -42), (-12, -47), (10, -40), (30, -45), (-22, -35), (20, -35), (44, -40)]:
            t.dot(*P(dx, dy), 3.0)
        rind = [P(np.cos(a) * hr, -40 + 96 * np.sin(a)) for a in np.linspace(0, np.pi, 34)]
        t.trek(rind, 2.8); t.wash(rind + [P(hr, -40)], 0.14, slip=0.4, pool=0.6)
        for k in range(-3, 4):
            t.trek([P(k * 17, -28), P(k * 18.5, 12), P(k * 15, 46)], 1.8, 0.7, pounce=False)
        sad = big == '3'
        for ex in (-20, 22):
            t.closed([P(ex + 6 * np.cos(a), 4 + 7 * np.sin(a)) for a in np.linspace(0, 6.3, 12)], 1.8); t.dot(*P(ex + 2, 6), 3.4)
        if sad:
            t.trek([P(-30, -14), P(-18, -8), P(-8, -6)], 1.8, pounce=False); t.trek([P(10, -6), P(22, -8), P(34, -14)], 1.8, pounce=False)
            t.trek([P(-8, 34), P(8, 28), P(26, 34)], 2.0, pounce=False)
        else:
            t.trek([P(10, -14), P(22, -21), P(34, -16)], 2.0, pounce=False); t.trek([P(-30, -10), P(-18, -11), P(-8, -10)], 1.8, pounce=False)
            t.trek([P(-8, 30), P(8, 34), P(26, 26)], 2.0, pounce=False)
        t.occlude(rind + top)
        neck, hip = P(0, 56), P(-6, 172)
        t.trek([neck, P(-2, 112), hip], 2.6)
        tee = [P(-34, 66), P(30, 66), P(26, 142), P(-36, 142)]
        t.closed(tee, 2.2); t.wash(tee, 0.10, slip=0.3)
        t.letters('ß', *P(-4, 104), 40, font='serif')
        t.trek([hip, P(30, 228), P(52, 262)], 2.6); t.trek([P(52, 262), P(76, 252)], 2.8)
        t.trek([hip, P(-28, 238), P(-40, 304)], 2.6); t.trek([P(-40, 304), P(-16, 300)], 2.8)
        book = [P(-196, 6), P(-52, -14), P(-40, 152), P(-184, 176)]
        t.closed(book, 2.8); t.wash(book, 0.16, slip=0.6, pool=0.6)
        t.trek([P(-184, 172), P(-176, 190), P(-34, 166), P(-40, 152)], 2.0)
        t.letters('DEUTSCH', *P(-114, 82), 34, font='serif', dens=1.0)
        t.trek([P(-28, 80), P(-60, 98), P(-74, 70)], 2.4); t.trek([P(26, 78), P(54, 122), P(30, 152)], 2.4)
        for (sx, sy) in [(78, -40), (90, -8)]:
            t.closed([P(sx + 5 * np.cos(a), sy + 8 * np.sin(a)) for a in np.linspace(0, 6.3, 10)], 1.4)
        t.occlude(book + tee)
    # the big painted counter in the sky
    t.letters(big, 700, 440, 190 if len(big) <= 3 else 120, font='serif', dens=1.0)
    # dike, mill on top, tulips, clouds, birds
    slope = [(x, Y(x)) for x in (x0, 400, 700, x1)]
    t.trek(slope, 2.2, taper=(0.02, 0.1))
    t.wash(slope + [(x1, 1330), (x0, 1330)], 0.10, angle=0.0, pool=0.4)
    t.grass(150, 940, 1220, n=10, h=10, lean=0.4, yspread=90)
    t.windmill(860, Y(860) + 8, 210, sails=0.3, squash=0.6, cloth=(0, 2))
    for x in (150, 190, 230):
        t.tulip(x, 1322, 46, lean=0.15, width=1.5, tone=0.24)
    t.cloud(330, 330, 300, 90, lean=0.3, seed=8)
    t.birds([(300, 600), (328, 586), (354, 606)], size=9, tilt=0.2)
    t.clear_occlusion()
    t.letters(cart, cx, 1370, 30 if len(cart) < 22 else 24, font='serif', dens=1.05, spacing=2)
    t.layer('frame')
    t.border(R, band=30, inset=8, reserve=[cart_poly])
    t.closed(cart_poly, 2.2)
    t.layer('single')
    t.field(corners='spin', width=1.3)
    if stages:
        t.stage('pounce', hide=('trek', 'wash'))
        t.stage('outline', hide=('wash', 'frame', 'single'))
        t.stage('wash', hide=('frame', 'single'))
    t.fire(); t.set_wall()
    t.age(craze=1.0, chips=8)
    t.light(window=(160, 260, 100, 140), strength=0.5, soft=6.0)
    t.save(os.path.join(OUT, name + '.jpg'), stages_dir=stages)
    print(name, flush=True)

os.makedirs(OUT, exist_ok=True)
import sys as _s
which = _s.argv[3] if len(_s.argv) > 3 else 'nomelo'
if which == 'nomelo':
    render('c50_nm', '50!', 'GESCHAFFT!', melo=False)
    render('d3_nm', '3', 'AM MORGEN: NOCH 3', melo=False)
    render('e_nm', '3', 'ALLER ANFANG IST SCHWER', melo=False)
