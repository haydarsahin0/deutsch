"""Vertical cave wall for the 'Ich will ein Bier' Short: caveman demands beer, a kid demands ice cream, the polite scene by the fire."""
import sys, os
LIB, OUT = sys.argv[1], sys.argv[2]
sys.path.insert(0, LIB)
import numpy as np
from cave import CavePainting
os.makedirs(OUT, exist_ok=True)
cv = CavePainting(1080, 1920, seed=11)
cv.wall()
cv.boss(360, 520, 230, 200, 34); cv.boss(720, 1080, 170, 150, 24); cv.boss(540, 1520, 300, 160, 28)
cv.fold([(-20, 820), (300, 780), (700, 860), (1100, 800)], height=10, soft=24, side=-1)
cv.crack([(1000, 200), (960, 260), (950, 330)], width=2.2, depth=6, branches=0)
cv.floor(1800, tilt=0.6)
cv.fire(540, 1880, 300, power=1.9, reach=1900)
cv.lamp(930, 420, 120, power=0.7, reach=900)
cv.stage('wall')

def mug(x, y, s):
    body = [(-0.5, -0.6), (0.5, -0.6), (0.45, 0.6), (-0.45, 0.6)]
    foam = [(-0.6, -0.6), (-0.4, -0.85), (-0.1, -0.75), (0.15, -0.9), (0.45, -0.78), (0.6, -0.6)]
    return cv.shape(x, y, s, polys=[('body', body), ('foam', foam)],
                    strokes=[('handle', [(0.48, -0.35), (0.85, -0.25), (0.85, 0.25), (0.46, 0.35)], [0.12, 0.12, 0.12, 0.12])])
def cone(x, y, s):
    return cv.shape(x, y, s, polys=[('cone', [(-0.35, -0.2), (0.35, -0.2), (0.0, 0.9)]),
                                    ('scoop', [(np.cos(a) * 0.42, -0.45 + np.sin(a) * 0.36) for a in np.linspace(0, 6.28, 20)])])

# figures (drafted), charcoal sketch
cave = cv.hunter(330, 760, 420, facing=1, pose='throw')
g = cave.anchors['grip']; M1 = mug(g[0] - 30, g[1] - 70, 95)
kid = cv.hunter(720, 1260, 240, facing=-1, pose='run')
g = kid.anchors['grip']; C1 = cone(g[0] - 46, g[1] - 4, 64)
h1 = cv.hunter(300, 1700, 300, facing=1, pose='run'); h2 = cv.hunter(790, 1700, 300, facing=-1, pose='run')
g1, g2 = h1.anchors['grip'], h2.anchors['grip']
M2 = mug(g1[0] + 52, g1[1] - 6, 56); M3 = mug(g2[0] - 52, g2[1] - 6, 56)
for f in (cave, kid, h1, h2, M1, M2, M3, C1):
    cv.sketch(f)
cv.stage('sketch')
for h in (cave, h1, h2):
    cv.paint(h, 'red', kind='finger')
cv.paint(kid, 'orange', kind='finger')
for m in (M1, M2, M3):
    cv.blow(m.sel('body'), 'yellow', density=0.95, rim=0.15)
    cv.blow(m.sel('foam'), 'white', density=0.9, edge=3)
    cv.paint(m.sel('handle'), 'yellow', kind='finger')
cv.blow(C1.sel('cone'), 'orange', density=0.95); cv.blow(C1.sel('scoop'), 'pink' if False else 'white', density=0.9)
cv.stage('ochre')
for m in (M1, M2, M3, C1):
    cv.outline(m, 'black', width=4.0, top=0.7, gaps=0.12)
for (x, y, s, rot, side, pig) in ((90, 220, 120, 14, 'right', 'red'), (980, 1000, 110, -10, 'left', 'red'),
                                  (120, 1420, 110, 20, 'right', 'black'), (960, 1460, 120, -18, 'left', 'red')):
    cv.stencil(cv.hand(x, y, s, rot=rot, side=side), pig, density=0.92, spread=24)
cv.dots([(430 + i * 46, 1760 + 5 * np.sin(i)) for i in range(5)], r=11, pigment='red')
cv.stage('contours')
cv.calcite(820, 640, 90, 60, amount=0.35)
cv.flake(20, size=(1.5, 3.5), min_load=0.6)
cv.claws(980, 140, angle=-100, n=4, length=150, spread=17)
cv.soot(540, 1700, amount=0.25, drift=0.2, spread=0.3)
cv.save(os.path.join(OUT, 'final.jpg'), OUT)
print('done')
