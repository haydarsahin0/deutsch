"""Deutsch mit Melo as a Delft tile tableau: 'Aller Anfang ist schwer' – Melo carries the big book DEUTSCH up a dike."""
import sys, time
LIB, out = sys.argv[1], sys.argv[2]
sys.path.insert(0, LIB)
import numpy as np
from delft import DelftTile, arc, ellipse_pts

t0 = time.time()
t = DelftTile(1920, 1080, tile=128, joint=3.6, origin=(0, -36), seed=21)
R = t.tableau(2, 1, 13, 8)                       # x 256..1664, y 92..988
t.layer('picture')
cart = [(700, 924), (1220, 924), (1234, 934), (1240, 951), (1234, 968), (1220, 978), (700, 978), (686, 968), (680, 951), (686, 934)]
t.occlude(cart, grow=0.5)

# ---------------- Melo, big, climbing the dike to the right with the heavy book DEUTSCH on his back
S = 1.45
def Y(x): return 980 - (x - 256) * 0.26          # the slope line
mx = 900
def P(u, v): return (mx + u * S, my + v * S)
my = Y(mx + 20 * S) - 300 * S + 38                      # feet on the slope
hr = 62
top = [P(*q) for q in [(np.cos(a) * hr * 0.98, -40 + 18 * np.sin(a)) for a in np.linspace(0, 2 * np.pi, 40)]]
t.closed(top, 2.4); t.wash(top, 0.30, slip=0.4, pool=0.5)
for (dx, dy) in [(-34, -42), (-12, -47), (10, -40), (30, -45), (-22, -35), (20, -35), (44, -40)]:
    t.dot(*P(dx, dy), 3.0)
rind = [P(np.cos(a) * hr, -40 + 96 * np.sin(a)) for a in np.linspace(0, np.pi, 34)]
t.trek(rind, 2.8)
t.wash(rind + [P(hr, -40)], 0.14, slip=0.4, pool=0.6)
for k in range(-3, 4):
    t.trek([P(k * 17, -28), P(k * 18.5, 12), P(k * 15, 46)], 1.8, 0.7, pounce=False)
t.closed([P(-20 + 6 * np.cos(a), 4 + 7 * np.sin(a)) for a in np.linspace(0, 6.3, 12)], 1.8); t.dot(*P(-18, 6), 3.4)
t.closed([P(22 + 6 * np.cos(a), 4 + 7 * np.sin(a)) for a in np.linspace(0, 6.3, 12)], 1.8); t.dot(*P(24, 6), 3.4)
t.trek([P(10, -14), P(22, -21), P(34, -16)], 2.0, pounce=False)
t.trek([P(-30, -10), P(-18, -11), P(-8, -10)], 1.8, pounce=False)
t.trek([P(-8, 30), P(8, 34), P(26, 26)], 2.0, pounce=False)
t.occlude(rind + top)
neck, hip = P(0, 56), P(-6, 172)
t.trek([neck, P(-2, 112), hip], 2.6)
tee = [P(-34, 66), P(30, 66), P(26, 142), P(-36, 142)]
t.closed(tee, 2.2); t.wash(tee, 0.10, slip=0.3)
t.letters('ß', *P(-4, 104), 44, font='serif')
t.trek([hip, P(30, 228), P(52, 268)], 2.6); t.trek([P(52, 268), P(76, 262)], 2.8)        # front foot higher
t.trek([hip, P(-28, 238), P(-40, 300)], 2.6); t.trek([P(-40, 300), P(-16, 296)], 2.8)
book = [P(-196, 6), P(-52, -14), P(-40, 152), P(-184, 176)]
t.closed(book, 2.8); t.wash(book, 0.16, slip=0.6, pool=0.6)
t.trek([P(-184, 172), P(-176, 190), P(-34, 166), P(-40, 152)], 2.0)
t.letters('DEUTSCH', *P(-114, 82), 40, font='serif', dens=1.0)
t.trek([P(-28, 80), P(-60, 98), P(-74, 70)], 2.4)
t.trek([P(26, 78), P(54, 122), P(30, 152)], 2.4)
for (sx, sy) in [(78, -40), (90, -8)]:
    t.closed([P(sx + 5 * np.cos(a), sy + 8 * np.sin(a)) for a in np.linspace(0, 6.3, 10)], 1.4)
t.occlude(book + tee)

# ---------------- the dike path rising to the right, tulips, a mill, clouds
slope = [(x, 980 - (x - 256) * 0.26) for x in (256, 700, 1100, 1400, 1664)]
t.trek(slope, 2.2, taper=(0.02, 0.1))
t.wash(slope + [(1664, 988), (256, 988)], 0.10, angle=0.0, pool=0.4)
t.grass(300, 1640, 900, n=14, h=10, lean=0.4, yspread=40)
rng = np.random.default_rng(3)
for x in np.linspace(300, 620, 7) + rng.normal(0, 6, 7):
    t.tulip(x, 930 + rng.normal(0, 4), 52 * rng.uniform(0.85, 1.1), lean=0.15, width=1.5, tone=0.24)
t.windmill(1500, 660, 230, sails=0.25, squash=0.6, cloth=(0, 2))
t.tree(1300, 712, 140, w=110, lean=0.2, clumps=6, seed=4)
t.cloud(560, 230, 360, 110, lean=0.3, seed=8)
t.cloud(1050, 230, 240, 76, lean=0.3, seed=9)
t.closed([(1330 + 40 * np.cos(a), 170 + 40 * np.sin(a)) for a in np.linspace(0, 6.3, 30)], 2.0)
for k in range(10):
    a = k * np.pi / 5
    t.trek([(1330 + 54 * np.cos(a), 170 + 54 * np.sin(a)), (1330 + 72 * np.cos(a), 170 + 72 * np.sin(a))], 1.8)
t.birds([(1050, 300), (1078, 286), (1104, 306)], size=9, tilt=0.2)
t.clear_occlusion()
t.letters('ALLER ANFANG IST SCHWER', 960, 951, 26, font='serif', dens=1.05, spacing=3)

# ---------------- frame + single tiles
t.layer('frame')
t.border(R, band=34, inset=9, reserve=[cart])
t.closed(cart, 2.2)
t.layer('single')
t.field(corners='spin', width=1.35)
t.fire(); t.set_wall()
t.age(craze=1.0, chips=10, cracks=[[(1500, 300), (1530, 340), (1560, 360)]])
t.light(window=(300, 160, 110, 150), strength=0.55, soft=6.0)
t.save(out)
print(out, round(time.time() - t0, 1))
