"""Fluid animation from the Delft renders: brush-wipe paint-on, Melo climbing with a walking bob, number/cartouche
repaints, slow camera push. Writes raw RGB frames to stdout (1080x1920, 30 fps)."""
import sys, numpy as np
from PIL import Image, ImageFilter
D = 'out/'
def L(f): return np.asarray(Image.open(D + f).convert('RGB').resize((1080, 1920)), np.float32)
BL, O48, W48, W49, F49, F50, D3, E = [L(f) for f in ['st48/00_pounce.png', 'st48/01_outline.png', 'st48/02_wash.png',
                                                    'st49/02_wash.png', 'b49.png', 'c50.png', 'd3.png', 'e.png']]
N50, N3, NE = L('c50_nm.jpg'), L('d3_nm.jpg'), L('e_nm.jpg')
H, W = 1920, 1080
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
rng = np.random.default_rng(3)
def smooth_noise(scale, seed):
    r = np.random.default_rng(seed).random((H // scale + 2, W // scale + 2)).astype(np.float32)
    im = Image.fromarray((r * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(scale / 3))
    return np.asarray(im, np.float32) / 255
NZ = smooth_noise(60, 1) * 0.6 + smooth_noise(14, 2) * 0.4
def melo_mask(full, nm):
    d = np.abs(full - nm).sum(2)
    d[:, :215] = 0; d[:, 625:] = 0; d[:675, :] = 0; d[1165:, :] = 0      # only Melo's own box
    m = Image.fromarray(((d > 45) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(2.5))
    return np.asarray(m, np.float32)[..., None] / 255
M50, M3 = melo_mask(F50, N50), melo_mask(D3, N3)
def ss(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)
def wipe(A, B, p, ramp, soft=0.12, region=None):
    """brush-like reveal of B over A; ramp in 0..1 = order of painting; p 0..1"""
    m = ss((p * (1 + soft + 0.35) - (ramp * 0.65 + NZ * 0.35)) / soft)
    if region is not None: m = m * region
    m = m[..., None]
    return A * (1 - m) + B * m
DIAG = np.clip(((XX / W) * 0.45 + (1 - YY / H) * 0.55), 0, 1)               # bottom-left → top-right
def box(x0, y0, x1, y1, f=18):
    r = np.zeros((H, W), np.float32); r[y0:y1, x0:x1] = 1
    return np.asarray(Image.fromarray((r * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(f)), np.float32) / 255
NUM = box(470, 300, 960, 600); NUMR = np.clip((XX - 470) / 490, 0, 1)
CART = box(160, 1320, 920, 1420, 10); CARTR = np.clip((XX - 160) / 760, 0, 1)
def shift(a, dx, dy):
    dx, dy = int(round(dx)), int(round(dy)); out = np.zeros_like(a)
    ys, yd = (slice(max(0, -dy), H - max(0, dy)), slice(max(0, dy), H - max(0, -dy)))
    xs, xd = (slice(max(0, -dx), W - max(0, dx)), slice(max(0, dx), W - max(0, -dx)))
    out[yd, xd] = a[ys, xs]; return out
def melo_comp(bg, src, mask, t, t0, t1):
    p = np.clip((t - t0) / (t1 - t0), 0, 1)
    dx = 62 * p; dy = -62 * 0.58 * p - 7 * abs(np.sin(np.pi * 1.7 * (t - t0)))
    ms, ss_ = shift(mask, dx, dy), shift(src, dx, dy)
    # remove Melo from his old place is already done (bg has no Melo); paint him at the new place
    return bg * (1 - ms) + ss_ * ms
FPS, DUR = 30, 10.95
out = sys.stdout.buffer
for f in range(int(DUR * FPS)):
    t = f / FPS
    if t < 1.0:   fr = wipe(BL, O48, t / 1.0, DIAG)
    elif t < 2.29: fr = wipe(O48, W48, (t - 1.0) / 1.0, DIAG)
    elif t < 2.75: fr = wipe(W48, W49, (t - 2.29) / 0.4, NUMR, region=NUM)
    elif t < 3.76: fr = wipe(W49, F49, (t - 2.75) / 0.9, DIAG, soft=0.2)
    elif t < 4.10: fr = wipe(F49, F50, (t - 3.76) / 0.3, NUMR, region=NUM)
    else:
        bg = N50
        if t >= 7.60: bg = wipe(N50, N3, (t - 7.60) / 0.35, NUMR, region=NUM)
        if t >= 9.14: bg = wipe(N3, NE, (t - 9.14) / 0.6, CARTR, region=CART)
        if t < 7.60: src, m = F50, M50
        else:
            k = np.clip((t - 7.60) / 0.2, 0, 1); src = F50 * (1 - k) + D3 * k; m = np.maximum(M50, M3)
        fr = melo_comp(bg, src, m, t, 4.10, DUR)
    z = 1 + 0.07 * t / DUR                                                   # slow push-in toward Melo
    im = Image.fromarray(np.clip(fr, 0, 255).astype(np.uint8))
    cw, ch = W / z, H / z; cx, cy = 520, 900
    im = im.crop((cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)).resize((W, H), Image.BICUBIC)
    out.write(im.tobytes())
