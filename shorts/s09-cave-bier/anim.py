"""Torch-lit tour of the cave wall: paint appears section by section (sketch → ochre → contours), lettering painted
on, firelight flickers, the camera climbs down the wall and finally shows all of it."""
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
FONT = lambda s: ImageFont.truetype('/home/user/deutsch/brand/fonts/kalam-latin-700-normal.woff2', s)
D = 'out/'; W, H = 1080, 1920
def L(f): return np.asarray(Image.open(D + f).convert('RGB'), np.float32)
WALL, SK, OC, CT, FN = [L(f) for f in ['00_wall.png', '01_sketch.png', '02_ochre.png', '03_contours.png', '04_final.png']]
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
def noise(scale, seed):
    r = np.random.default_rng(seed).random((H // scale + 2, W // scale + 2)).astype(np.float32)
    return np.asarray(Image.fromarray((r * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
NZ = noise(40, 1) * 0.6 + noise(9, 2) * 0.4
def band(y0, y1, f=40):
    r = ((YY >= y0) & (YY < y1)).astype(np.float32)
    return np.asarray(Image.fromarray((r * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(f)), np.float32) / 255
SEC = [band(0, 900), band(900, 1340), band(1340, 1920)]
RAMP = np.clip(XX / W * 0.5 + (YY % 900) / 900 * 0.5, 0, 1)
def ss(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)
def wipe(A, B, p, m, soft=0.18):
    if p <= 0: return A
    k = ss((p * (1 + soft + 0.35) - (RAMP * 0.65 + NZ * 0.35)) / soft) * m
    return A * (1 - k[..., None]) + B * k[..., None]
def layer(items):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for x, y, s, size, col in items: d.text((x, y), s, font=FONT(size), fill=col, anchor='mm')
    im = im.filter(ImageFilter.GaussianBlur(1.2))
    a = np.asarray(im, np.float32) / 255
    a[..., 3] *= (0.75 + 0.25 * NZ)                     # pigment catches unevenly on the rock
    return a
OCH, CHALK = (176, 52, 34, 255), (244, 232, 205, 255)
TXT = [(layer([(650, 250, 'ICH WILL', 78, OCH), (650, 340, 'BIER!', 96, OCH)]), 0.0, 0.6, 0),
       (layer([(470, 990, 'ICH WILL', 64, OCH), (470, 1062, 'EIS!', 80, OCH)]), 5.6, 6.2, 1),
       (layer([(540, 1290, '„Ich hätte gern ein Bier.“', 48, CHALK)]), 8.3, 9.0, 2),
       (layer([(540, 1345, '„Ich nehme ein Bier.“', 48, CHALK)]), 9.75, 10.3, 2),
       (layer([(540, 1400, '„Für mich ein Bier, bitte.“', 48, CHALK)]), 12.6, 13.2, 2)]
PAINT = [(-0.6, 0.9), (3.4, 5.0), (7.5, 9.0)]                   # per section: sketch→final over this span
CAM = [(0.0, (468, 560), 1.45), (3.1, (468, 590), 1.48), (3.9, (560, 1150), 1.6), (7.2, (560, 1170), 1.64),
       (8.0, (540, 1450), 1.5), (12.2, (540, 1450), 1.55), (13.4, (540, 960), 1.0), (14.2, (540, 960), 1.0)]
def cam(t):
    for (t0, c0, z0), (t1, c1, z1) in zip(CAM, CAM[1:]):
        if t <= t1:
            p = ss((t - t0) / (t1 - t0)); return np.array(c0) * (1 - p) + np.array(c1) * p, z0 * (1 - p) + z1 * p
    return np.array(CAM[-1][1]), CAM[-1][2]
FIRE = np.clip(1 - np.hypot((XX - 540) / 900, (YY - 1880) / 1500), 0, 1)
FPS, DUR = 30, 14.2
rng = np.random.default_rng(9); fl = np.convolve(rng.normal(0, 1, int(DUR * FPS) + 20), np.ones(5) / 5, 'same')
out = sys.stdout.buffer
for f in range(int(DUR * FPS)):
    t = f / FPS
    fr = WALL.copy()
    for k, (a, b) in enumerate(PAINT):
        p = (t - a) / (b - a)
        if p <= 0: continue
        fr = wipe(fr, SK, p * 2.2, SEC[k])
        fr = wipe(fr, OC, p * 1.6 - 0.35, SEC[k], 0.25)
        fr = wipe(fr, FN, p * 1.4 - 0.45, SEC[k], 0.25)
    for lyr, t0, t1, k in TXT:
        if t < t0: continue
        p = min(1, (t - t0) / (t1 - t0)); rev = ss((p * 1.3 - XX / W) / 0.15)
        a = lyr[..., 3] * rev
        fr = fr * (1 - a[..., None]) + lyr[..., :3] * 255 * a[..., None]
    fr = fr * (1 + 0.07 * fl[f] * (0.4 + FIRE))[..., None]          # flickering firelight
    (cx, cy), z = cam(t)
    cw, ch = W / z, H / z; cx = np.clip(cx, cw / 2, W - cw / 2); cy = np.clip(cy, ch / 2, H - ch / 2)
    im = Image.fromarray(np.clip(fr, 0, 255).astype(np.uint8)).crop((cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)).resize((W, H), Image.BICUBIC)
    out.write(im.tobytes())
