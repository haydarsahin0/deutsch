#!/usr/bin/env python3
"""Cut a vertical YouTube Short (1080×1920) from a finished episode.

    python3 tools/make-short.py shorts/<id>/short.json            # render → shorts/<id>/out/short.mp4 + cover.png
    python3 tools/make-short.py shorts/<id>/short.json --plan     # only snap + print segments/text/duration
    python3 tools/make-short.py shorts/<id>/short.json --cover    # only the cover
    python3 tools/make-short.py shorts/<id>/short.json --sheet    # + low-res contact sheet out/contact.jpg (QA)

Pipeline: snap segment times to word boundaries (+pad) → render each segment WITHOUT subtitles with the engine
(tools/render-video.js --no-subs, cached in build/) → static background + hook-title/frame overlay + end card
(tools/short/short.html via tools/html-frames.js) → ASS karaoke subtitles from build/alignment.json (libass,
brand TTFs in brand/fonts/ttf) → ffmpeg compose (visual hard cuts, 40 ms audio crossfades) → out/short.mp4
(H.264 high crf 20, 30 fps, AAC 192k, +faststart). See shorts/README.md for the config fields.
"""
import argparse, hashlib, json, math, os, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
W, H = 1080, 1920
SLOT_Y, SLOT_H = 600, 760            # video window
SCALED_W = 1352                       # 1920×1080 → 1352×760 (height-fit ×1.25), centre crop to 1080
SUB_X, SUB_Y = 500, 1500              # subtitle block centre (kept left of YouTube's right-hand buttons)
SUB_MAXW, SUB_SIZE = 800, 150         # px per line, ASS font size (Anton: cap height ≈ 0.5 × size)
SUB_GAP = 118                         # baseline distance of the two subtitle lines
XFADE = 0.04
FONTS = ROOT / 'brand' / 'fonts' / 'ttf'


def run(cmd, **kw):
    print('  $', ' '.join(str(c) for c in cmd)[:240])
    subprocess.run([str(c) for c in cmd], check=True, cwd=ROOT, **kw)


def ensure_fonts():
    FONTS.mkdir(parents=True, exist_ok=True)
    for name, src in (('Anton-Regular', 'anton-latin-400-normal'), ('Oswald-Bold', 'oswald-latin-700-normal')):
        out = FONTS / f'{name}.ttf'
        if not out.exists():  # needs: pip install fonttools brotli
            from fontTools.ttLib import TTFont
            f = TTFont(ROOT / 'brand' / 'fonts' / f'{src}.woff2'); f.flavor = None; f.save(out)


# ── timing ────────────────────────────────────────────────────────────────────
def snap(words, t_from, t_to, pad):
    """Nearest word start / word end, padded but never into the neighbouring word; frame-aligned."""
    i0 = min(range(len(words)), key=lambda i: abs(words[i]['start'] - t_from))
    i1 = min(range(len(words)), key=lambda i: abs(words[i]['end'] - t_to))
    prev_end = words[i0 - 1]['end'] if i0 > 0 else 0.0
    next_start = words[i1 + 1]['start'] if i1 + 1 < len(words) else words[i1]['end'] + 1
    a = max(words[i0]['start'] - pad, (prev_end + words[i0]['start']) / 2, 0.0)
    b = min(words[i1]['end'] + pad, (words[i1]['end'] + next_start) / 2)
    a = math.floor(a * FPS + 1e-6) / FPS
    b = math.ceil(b * FPS - 1e-6) / FPS
    return a, b, i0, i1


def plan(cfg, al):
    words = al['words']
    pad = cfg.get('pad', 0.15)
    segs, t = [], 0.0
    items = [dict(s, kind='seg') for s in cfg['segments']]
    if cfg.get('cta'):
        items.append(dict(cfg['cta'], kind='cta'))
    for s in items:
        a, b, i0, i1 = snap(words, s['from'], s['to'], pad)
        segs.append(dict(s, a=a, b=b, i0=i0, i1=i1, dur=b - a, t0=t,
                         text=' '.join(w['raw'] for w in words[i0:i1 + 1])))
        t += b - a
    hold = cfg.get('cta', {}).get('hold', 0.6) if cfg.get('cta') else 0.0
    return segs, t + hold, hold


# ── subtitles ─────────────────────────────────────────────────────────────────
class Measure:
    """Advance width in px of a string as libass draws it (libass sizes fonts by winAscent+winDescent)."""
    def __init__(self, ttf, size):
        from fontTools.ttLib import TTFont
        f = TTFont(ttf)
        o = f['OS/2']
        self.cmap, self.hmtx = f.getBestCmap(), f['hmtx']
        self.k = size / (o.usWinAscent + o.usWinDescent)

    def __call__(self, s):
        return sum(self.hmtx[self.cmap.get(ord(c), self.cmap[ord('n')])][0] for c in s) * self.k


def ass_time(t):
    t = max(0.0, t); cs = int(round(t * 100))
    return f'{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}'


def _txt(w):
    return w['raw'].strip()


def fill_lines(ws, meas, max_words):
    """1 line if it fits, else the best 2-line split (balanced, preferring breaks after punctuation or before an
    opening quote), else greedy lines (> 2 lines tells build_pages to split the page)."""
    width = lambda line: meas(' '.join(_txt(x) for x in line))
    ok = lambda line: len(line) <= max_words and width(line) <= SUB_MAXW
    if ok(ws):
        return [ws]
    best = None
    for k in range(1, len(ws)):
        l1, l2 = ws[:k], ws[k:]
        if not (ok(l1) and ok(l2)):
            continue
        t1, t2 = _txt(l1[-1]).rstrip('“"»«‘’)'), _txt(l2[0])
        cost = abs(width(l1) - width(l2)) / SUB_MAXW
        if not (t1.endswith((',', ':', ';', '–', '.', '!', '?')) or t2.startswith(('„', '–', '"', '»'))):
            cost += 0.45
        if min(len(l1), len(l2)) == 1 and max(len(l1), len(l2)) >= 3:
            cost += 0.3
        if best is None or cost < best[0]:
            best = (cost, [l1, l2])
    if best:
        return best[1]
    lines, line = [], []
    for w in ws:
        if line and not ok(line + [w]):
            lines.append(line); line = []
        line.append(w)
    return lines + [line]


def build_pages(words, seg, meas, max_words):
    """Pages of ≤ 2 lines (≤ max_words words and ≤ SUB_MAXW px per line). A page never crosses a sentence end
    or a pause > 0.55 s; long sentences are split at commas/colons/dashes first, then evenly by words."""
    ws = words[seg['i0']:seg['i1'] + 1]
    fits = lambda c: len(fill_lines(c, meas, max_words)) <= 2
    sents, cur = [], []
    for k, w in enumerate(ws):
        cur.append(w)
        nxt = ws[k + 1] if k + 1 < len(ws) else None
        end = _txt(w).rstrip('“"»«‘’)').endswith(('.', '!', '?'))
        if end or nxt is None or nxt['start'] - w['end'] > 0.55:
            sents.append(cur); cur = []
    pages = []
    for sent in sents:
        if fits(sent):
            pages.append(fill_lines(sent, meas, max_words)); continue
        clauses, cl = [], []
        for w in sent:
            t = _txt(w)
            if t.startswith(('–', '-')) and cl:
                clauses.append(cl); cl = []
            cl.append(w)
            if t.rstrip('“"»«‘’)').endswith((',', ':', ';', '–')):
                clauses.append(cl); cl = []
        if cl:
            clauses.append(cl)
        acc = []
        for cl in clauses:
            if fits(acc + cl):
                acc += cl; continue
            if acc:
                pages.append(fill_lines(acc, meas, max_words)); acc = []
            if fits(cl):
                acc = cl; continue
            n = 2
            while True:
                chunks = [cl[round(i * len(cl) / n):round((i + 1) * len(cl) / n)] for i in range(n)]
                if all(fits(c) for c in chunks):
                    break
                n += 1
            pages += [fill_lines(c, meas, max_words) for c in chunks[:-1]]
            acc = chunks[-1]
        if acc:
            pages.append(fill_lines(acc, meas, max_words))
    return pages


def write_ass(path, segs, al, cfg):
    meas = Measure(FONTS / 'Anton-Regular.ttf', SUB_SIZE)
    words = al['words']
    hi = cfg.get('subtitle_highlight', '#FFC83A').lstrip('#')
    hi_ass = f'&H00{hi[4:6]}{hi[2:4]}{hi[0:2]}&'
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Kara,Anton,{SUB_SIZE},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,10,5,5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for seg in segs:
        if seg['kind'] == 'cta':
            continue
        off = seg['t0'] - seg['a']
        seg_end = seg['t0'] + seg['dur']
        pages = build_pages(words, seg, meas, cfg.get('subtitle_max_words', 4))
        for pi, page in enumerate(pages):
            flat = [w for line in page for w in line]
            p_start = flat[0]['start'] + off
            if pi == 0:
                p_start = max(seg['t0'], p_start - 0.1)
            nxt = pages[pi + 1][0][0]['start'] + off if pi + 1 < len(pages) else None
            p_end = flat[-1]['end'] + off + 0.35
            if nxt is not None:
                p_end = nxt if nxt - (flat[-1]['end'] + off) < 0.8 else min(p_end, nxt)
            p_end = min(p_end, seg_end)
            ys = [SUB_Y] if len(page) == 1 else [SUB_Y - SUB_GAP / 2, SUB_Y + SUB_GAP / 2]
            for k, w in enumerate(flat):
                a = p_start if k == 0 else w['start'] + off
                b = flat[k + 1]['start'] + off if k + 1 < len(flat) else p_end
                if b - a < 0.01:
                    continue
                for line, y in zip(page, ys):
                    parts = []
                    for x in line:
                        t = _txt(x).replace('{', '(').replace('}', ')')
                        parts.append(f'{{\\c{hi_ass}}}{t}{{\\c&H00FFFFFF&}}' if x is w else t)
                    ev.append(f'Dialogue: 0,{ass_time(a)},{ass_time(b)},Kara,,0,0,0,,{{\\an5\\pos({SUB_X},{y:.0f})}}' + ' '.join(parts))
    path.write_text(head + '\n'.join(ev) + '\n', encoding='utf-8')
    return len(ev)


# ── audio envelope for Melo's lip sync on the end card ───────────────────────
def mouth_env(wav, a, dur):
    import numpy as np
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(a), '-t', str(dur), '-i', str(wav), '-ac', '1', '-ar', '24000',
                          '-f', 's16le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    hop = 24000 // FPS
    out = []
    for f in range(int(dur * FPS) + 1):
        seg = x[f * hop:(f + 1) * hop]
        db = 20 * math.log10(float(np.sqrt(np.mean(seg ** 2))) + 1e-6) if len(seg) else -90
        out.append(max(0.0, min(1.0, (db + 42) / 26)))
    return [round(v, 3) for v in out]


# ── graphics ──────────────────────────────────────────────────────────────────
def html_frames(params, out, frames=1, transparent=False, build=None):
    pj = build / f'params-{params["mode"]}.json'
    pj.write_text(json.dumps(params, ensure_ascii=False), encoding='utf-8')
    cmd = ['node', 'tools/html-frames.js', '--page', 'tools/short/short.html', '--params', pj, '--out', out,
           '--w', W, '--h', H, '--frames', frames]
    if transparent:
        cmd.append('--transparent')
    run(cmd)


def base_params(cfg):
    return {'slot': {'y': SLOT_Y, 'h': SLOT_H}, 'hook': cfg.get('hook', []), 'tag': cfg.get('tag', 'DEUTSCH MIT MELO')}


def make_cover(cfg, sdir, build):
    c = dict({'headline': 'SAG DAS NIE!', 'cast': 'kollegin', 'castExpr': 'shocked', 'castPose': 'hands-up',
              'meloExpr': 'smirk', 'badge': 'B1–C1'}, **cfg.get('cover', {}))
    html_frames(dict(base_params(cfg), mode='cover', cover=c), sdir / 'out' / 'cover.png', build=build)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('config')
    ap.add_argument('--plan', action='store_true')
    ap.add_argument('--cover', action='store_true', help='only (re)render the cover')
    ap.add_argument('--sheet', action='store_true', help='also write out/contact.jpg (12 frames, low-res)')
    ap.add_argument('--workers', default='4')
    o = ap.parse_args()

    cfg_path = (ROOT / o.config) if not os.path.isabs(o.config) else Path(o.config)
    cfg = json.loads(cfg_path.read_text(encoding='utf-8'))
    sdir = cfg_path.parent
    build, out = sdir / 'build', sdir / 'out'
    build.mkdir(exist_ok=True); out.mkdir(exist_ok=True)
    ep = ROOT / cfg['episode']
    al = json.loads((ep / 'build' / 'alignment.json').read_text(encoding='utf-8'))
    wav = ep / 'audio' / 'voice.wav'

    segs, total, hold = plan(cfg, al)
    print(f'short {sdir.name}: {len(segs)} segments, {total:.2f} s (max {cfg.get("max_duration", 59)})')
    for s in segs:
        print(f"  [{s['kind']}] {s['a']:7.2f}–{s['b']:7.2f}  ({s['dur']:5.2f} s, at {s['t0']:5.2f})  {s['text'][:110]}")
    if total > cfg.get('max_duration', 59):
        sys.exit(f'✗ too long: {total:.2f} s – drop a sentence (split a segment) or shorten the CTA hold')
    if o.plan:
        return
    ensure_fonts()
    if o.cover:
        make_cover(cfg, sdir, build); return

    # 1. engine renders (no subtitles), cached by time range
    for s in segs:
        f = build / f"seg-{s['a']:.3f}-{s['b']:.3f}.mp4"
        s['file'] = f
        if not f.exists():
            run(['node', 'tools/render-video.js', cfg['episode'], '--from', f"{s['a']:.4f}", '--to', f"{s['b']:.4f}",
                 '--no-subs', '--workers', o.workers, '--out', f])
        else:
            print(f'  cached {f.name}')

    # 2. graphics: background, title/frame overlay (pop-in), end card, cover
    bg = build / 'bg.png'
    html_frames(dict(base_params(cfg), mode='bg'), bg, build=build)
    bg_panel = build / 'bg-panel.png'
    html_frames(dict(base_params(cfg), mode='bg', noSlot=True), bg_panel, build=build)
    for d in ('top', 'endcard'):
        shutil.rmtree(build / d, ignore_errors=True)
    html_frames(dict(base_params(cfg), mode='top'), build / 'top', frames=21, transparent=True, build=build)
    cta = next((s for s in segs if s['kind'] == 'cta'), None)
    if cta:
        ec = dict({'line1': 'MEHR DAVON?', 'line2': 'ABONNIEREN!', 'sub': 'Ganzes Video auf dem Kanal', 'panelTop': 580,
                   'click': 1.75}, **cfg.get('endcard', {}))
        n_ec = int(math.ceil((cta['dur'] + hold) * FPS)) + 1
        html_frames(dict(base_params(cfg), mode='endcard', endcard=ec, bg='file://' + str(bg_panel),
                         mouth=mouth_env(wav, cta['a'], cta['dur'] + hold)), build / 'endcard', frames=n_ec,
                    transparent=True, build=build)
    make_cover(cfg, sdir, build)

    # 3. subtitles
    ass = build / 'subs.ass'
    n = write_ass(ass, segs, al, cfg)
    print(f'  subtitles: {n} karaoke events → {ass.relative_to(ROOT)}')

    # 4. compose
    inp = ['-loop', '1', '-framerate', FPS, '-t', f'{total:.3f}', '-i', bg]
    fc, vl = [], []
    for k, s in enumerate(segs):
        inp += ['-i', s['file']]
        cx = (SCALED_W - W) // 2 + int(s.get('crop_x', 0))
        cx = max(0, min(SCALED_W - W, cx))
        fc.append(f"[{k + 1}:v]trim=end_frame={round(s['dur'] * FPS)},setpts=PTS-STARTPTS,"
                  f"scale={SCALED_W}:{SLOT_H}:flags=lanczos,crop={W}:{SLOT_H}:{cx}:0,setsar=1,fps={FPS}[v{k}]")
        vl.append(f'[v{k}]')
    nseg = len(segs)
    fc.append(''.join(vl) + f'concat=n={nseg}:v=1:a=0,tpad=stop_mode=clone:stop_duration={hold + 0.1:.3f}[vid]')
    i_top = nseg + 1
    inp += ['-framerate', FPS, '-i', build / 'top' / 'f_%04d.png']
    fc.append(f'[0:v][vid]overlay=0:{SLOT_Y}:shortest=0[c1]')
    fc.append(f'[c1][{i_top}:v]overlay=0:0:eof_action=repeat:format=auto[c2]')
    fonts_dir = str(FONTS).replace(':', r'\:')
    fc.append(f"[c2]subtitles='{ass}':fontsdir='{fonts_dir}'[c3]")
    last = '[c3]'
    if cta:
        i_ec = nseg + 2
        inp += ['-framerate', FPS, '-i', build / 'endcard' / 'f_%04d.png']
        fc.append(f'[{i_ec}:v]setpts=PTS+{cta["t0"]:.4f}/TB[ec]')
        fc.append(f'{last}[ec]overlay=0:0:eof_action=repeat:format=auto[c4]')
        last = '[c4]'
    fc.append(f'{last}format=yuv420p[vout]')
    # audio: each segment cut from voice.wav, internal joins extended by XFADE/2 and cross-faded (centred on the cut)
    i_wav = len([x for x in inp if x == '-i'])
    inp += ['-i', wav]
    al_ = []
    for k, s in enumerate(segs):
        a = s['a'] - (XFADE / 2 if k > 0 else 0)
        b = s['b'] + (XFADE / 2 if k < nseg - 1 else 0)
        fc.append(f'[{i_wav}:a]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,aresample=48000[a{k}]')
        al_.append(f'[a{k}]')
    cur = al_[0]
    for k in range(1, nseg):
        fc.append(f'{cur}{al_[k]}acrossfade=d={XFADE}:c1=tri:c2=tri[x{k}]')
        cur = f'[x{k}]'
    fc.append(f'{cur}afade=t=in:d=0.02,apad=whole_dur={total:.3f},afade=t=out:st={total - 0.35:.3f}:d=0.35[aout]')

    mp4 = out / 'short.mp4'
    run(['ffmpeg', '-y', '-v', 'error', *inp, '-filter_complex', ';'.join(fc), '-map', '[vout]', '-map', '[aout]',
         '-t', f'{total:.3f}', '-r', FPS, '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium', '-crf', '20',
         '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', mp4])
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4],
                               capture_output=True, text=True).stdout)
    print(f'✓ {mp4.relative_to(ROOT)}  {dur:.2f} s  {mp4.stat().st_size / 1e6:.1f} MB')

    if o.sheet:
        n = 12
        sel = '+'.join(f'eq(n\\,{int((i + 0.5) * dur * FPS / n)})' for i in range(n))
        run(['ffmpeg', '-y', '-v', 'error', '-i', mp4, '-vf', f"select='{sel}',scale=270:480,tile=6x2", '-frames:v', '1',
             '-q:v', '4', out / 'contact.jpg'])


if __name__ == '__main__':
    main()
