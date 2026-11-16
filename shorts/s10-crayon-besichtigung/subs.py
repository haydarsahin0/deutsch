#!/usr/bin/env python3
"""Burned-in text for s10: the static hook title (top, from frame 1) and the karaoke subtitle line (y≈1690, ≤3 words),
generated from episode 2's alignment (voice segment 116.30–133.60 s). Writes subs.ass next to this file."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ALIGN = os.path.join(HERE, '../../episodes/02-50-woerter-am-tag/build/alignment.json')
T0, T1 = 116.30, 133.60
DUR = T1 - T0
HL, WH = r'{\c&H003AC8FF&}', r'{\c&H00FFFFFF&}'   # highlight = yellow #FFC83A (ASS is BGR)

def ts(t):
    t = max(0.0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'

words = [w for w in json.load(open(ALIGN))['words'] if T0 <= w['start'] < T1]
for w in words:
    w['s'], w['e'] = w['start'] - T0, w['end'] - T0
    w['raw'] = w['raw'].replace('„', '').replace('“', '')

# lines of up to 3 words / ~20 characters, broken at punctuation
lines, cur = [], []
MAXC = 20   # Anton 96 px: about 20 characters fit the safe width
for w in words:
    if cur and len(' '.join(x['raw'] for x in cur + [w])) > MAXC:
        lines.append(cur); cur = []
    cur.append(w)
    if len(cur) == 3 or w['raw'][-1] in '.,!:?–':
        lines.append(cur); cur = []
if cur: lines.append(cur)

ev = []
for li, ln in enumerate(lines):
    nxt = lines[li + 1][0]['s'] if li + 1 < len(lines) else DUR
    for i, w in enumerate(ln):
        s = 0.0 if li == 0 and i == 0 else w['s']
        e = ln[i + 1]['s'] if i + 1 < len(ln) else min(nxt, DUR)
        txt = ' '.join((HL + x['raw'] + WH) if j == i else x['raw'] for j, x in enumerate(ln))
        ev.append(f'Dialogue: 1,{ts(s)},{ts(e)},K,,0,0,0,,{{\\an5\\pos(540,1690)}}{txt}')

head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: K,Anton,96,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,0,0,0,0,100,100,1,0,1,7,3,5,0,0,0,1
Style: T1,Anton,112,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,0,0,0,0,100,100,1,0,1,8,3,5,0,0,0,1
Style: T2,Anton,74,&H003AC8FF,&H003AC8FF,&H00101010,&H80000000,0,0,0,0,100,100,1,0,1,6,3,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 2,{ts(0)},{ts(DUR + 1)},T1,,0,0,0,,{{\\an5\\pos(540,92)}}Nachmieter gesucht!
Dialogue: 2,{ts(0)},{ts(DUR + 1)},T2,,0,0,0,,{{\\an5\\pos(540,192)}}Verstehst du die Anzeige?
"""
open(os.path.join(HERE, 'subs.ass'), 'w').write(head + '\n'.join(ev) + '\n')
print(len(lines), 'lines,', len(ev), 'events')
