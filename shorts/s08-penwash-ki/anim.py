"""Comic-reading animation over the pen & wash cards: camera travels card to card, ink and washes appear, lettering is written."""
import sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
R = '/home/user/deutsch/brand/fonts/'
FONT = lambda s: ImageFont.truetype(R + 'kalam-latin-700-normal.woff2', s)
D = 'out/'
lay = json.load(open(D + 'layout.json')); CARDS = lay['cards']; CW, CH = lay['cw'], lay['ch']
W, H = 1080, 1920
def L(f): return np.asarray(Image.open(D + f).convert('RGB'), np.float32)
BASE, I0, I1, I2, I3, WASH = [L(f) for f in ['00_cards.png', '01_ink0.png', '02_ink1.png', '03_ink2.png', '04_ink3.png', '05_wash.png']]
INK = [I0, I1, I2, I3]
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
def noise(scale, seed):
    r = np.random.default_rng(seed).random((H // scale + 2, W // scale + 2)).astype(np.float32)
    return np.asarray(Image.fromarray((r * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
NZ = noise(40, 1) * 0.6 + noise(10, 2) * 0.4
def card_uv(k):
    cx, cy, rot = CARDS[k]; a = np.radians(rot)
    dx, dy = XX - cx, YY - cy
    u = dx * np.cos(a) + dy * np.sin(a) + CW / 2; v = -dx * np.sin(a) + dy * np.cos(a) + CH / 2
    return u, v
UV = [card_uv(k) for k in range(4)]
MASK = [((u > 0) & (u < CW) & (v > 0) & (v < CH)).astype(np.float32) for u, v in UV]
RAMP = [np.clip((v / CH) * 0.7 + (u / CW) * 0.3, 0, 1) for u, v in UV]
def ss(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)
def wipe(A, B, p, ramp, m, soft=0.15):
    if p <= 0: return A
    k = ss((p * (1 + soft + 0.3) - (ramp * 0.7 + NZ * 0.3)) / soft) * m
    return A * (1 - k[..., None]) + B * k[..., None]
# lettering layers in card units, rotated onto the canvas
def text_layer(k, items):
    im = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for (x, y, s, size, col) in items:
        d.text((x, y), s, font=FONT(size), fill=col)
    cx, cy, rot = CARDS[k]
    big = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    r = im.rotate(-rot, resample=Image.BICUBIC, expand=True)
    big.paste(r, (int(cx - r.width / 2), int(cy - r.height / 2)), r)
    return np.asarray(big, np.float32) / 255
INKC, RED = (24, 24, 30, 255), (214, 48, 40, 255)
TXT = [  # (card, items, t0, t1)
    (0, [(48, 44, 'TAG 30', 84, INKC)], 0.0, 0.7),
    (1, [(122, 236, '„Wow, toller', 42, INKC), (150, 284, 'Text!“', 42, INKC)], 4.84, 5.8),
    (1, [(152, 530, 'Nur ein paar', 24, INKC), (170, 555, 'Kleinigkeiten.', 24, INKC)], 6.39, 7.0),
    (2, [(60, 640, '11 FEHLER!', 78, RED)], 8.96, 9.6),
    (2, [(250, 712, 'selbst eingebaut ;)', 26, INKC)], 11.6, 12.2),
    (3, [(96, 92, 'Der EINE Satz,', 40, INKC), (96, 140, 'der die KI', 40, INKC), (96, 186, 'ehrlich macht …?', 34, INKC)], 14.19, 16.9),
]
TL = [(text_layer(k, it), k, t0, t1) for k, it, t0, t1 in TXT]
# red rings on the text card, popping one by one (11)
rng = np.random.default_rng(4)
RINGS = []
for i in range(11):
    row = i % 10; x = 110 + rng.uniform(0, 200); y = 232 + row * 44
    im = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((x - 26, y - 16, x + 26, y + 16), outline=RED, width=5)
    cx, cy, rot = CARDS[2]; r = im.rotate(-rot, resample=Image.BICUBIC, expand=True)
    big = Image.new('RGBA', (W, H), (0, 0, 0, 0)); big.paste(r, (int(cx - r.width / 2), int(cy - r.height / 2)), r)
    RINGS.append((np.asarray(big, np.float32) / 255, 7.95 + i * 0.12))
STAGE = [((0.0, 1.0), (1.0, 2.3)), ((3.6, 4.6), (4.6, 5.5)), ((7.0, 7.8), (7.8, 8.5)), ((12.4, 13.3), (13.3, 14.1))]
CAM = [(0.0, 0, 1.7), (4.3, 0, 1.7), (4.95, 1, 1.7), (7.5, 1, 1.72), (8.15, 2, 1.7), (12.5, 2, 1.74), (13.15, 3, 1.7),
       (16.3, 3, 1.75), (17.4, -1, 1.0), (18.2, -1, 1.0)]
def cam(t):
    pos = lambda k: (np.array(CARDS[k][:2], float) if k >= 0 else np.array([540.0, 930.0]))
    for (t0, k0, z0), (t1, k1, z1) in zip(CAM, CAM[1:]):
        if t <= t1:
            p = ss((t - t0) / max(1e-6, t1 - t0)); c = pos(k0) * (1 - p) + pos(k1) * p
            return c, z0 * (1 - p) + z1 * p
    return pos(-1), 1.0
FPS, DUR = 30, 18.2
out = sys.stdout.buffer
for f in range(int(DUR * FPS)):
    t = f / FPS
    fr = BASE.copy()
    for k in range(4):
        (a0, a1), (b0, b1) = STAGE[k]
        pi = 1.0 if t >= a1 else max(0.0, (t - a0) / (a1 - a0))
        if k == 0: pi = max(pi, 0.3 + 0.7 * min(1, t / 1.0))
        pwv = 1.0 if t >= b1 else max(0.0, (t - b0) / (b1 - b0))
        if pi > 0: fr = wipe(fr, INK[k], pi, RAMP[k], MASK[k])
        if pwv > 0: fr = wipe(fr, WASH, pwv, RAMP[k], MASK[k], soft=0.25)
    for lyr, k, t0, t1 in TL:
        if t < t0: continue
        p = min(1.0, (t - t0) / max(0.2, (t1 - t0)))
        u, v = UV[k]; reveal = ss((p * 1.3 - (u / CW) * 0.7 - (v / CH) * 0.3) / 0.12)
        a = lyr[..., 3] * reveal
        fr = fr * (1 - a[..., None]) + lyr[..., :3] * 255 * a[..., None]
    for lyr, t0 in RINGS:
        if t < t0: continue
        p = ss((t - t0) / 0.15); a = lyr[..., 3] * p
        fr = fr * (1 - a[..., None]) + lyr[..., :3] * 255 * a[..., None]
    (cx, cy), z = cam(t)
    z *= 1 + 0.015 * np.sin(t * 0.7)                      # breathing hand-held drift
    cw, ch = W / z, H / z
    cx = np.clip(cx, cw / 2, W - cw / 2); cy = np.clip(cy, ch / 2, H - ch / 2)
    im = Image.fromarray(np.clip(fr, 0, 255).astype(np.uint8)).crop((cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)).resize((W, H), Image.BICUBIC)
    out.write(im.tobytes())
