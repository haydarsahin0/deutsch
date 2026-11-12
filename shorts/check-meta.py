#!/usr/bin/env python3
"""Check a Short's meta.md: title ≤ 60 chars and ends with #shorts, description has the full-video line,
every tag literally appears (case-insensitive) in title or description.  python3 shorts/check-meta.py shorts/<id>/meta.md
Original Shorts (no long episode; meta.md has a line „Typ: Original“): no „Ganzes Video“ line needed, description up to 7 lines
(room for a mini cheat sheet)."""
import re, sys
md = open(sys.argv[1], encoding='utf-8').read()
blocks = dict((h.strip(), b.strip()) for h, b in re.findall(r'^## ([^\n]+)\n```\n(.*?)\n```', md, re.S | re.M))
title = next(v for k, v in blocks.items() if k.startswith('Titel'))
desc = next(v for k, v in blocks.items() if k.startswith('Beschreibung'))
tags = [t.strip() for t in next(v for k, v in blocks.items() if k.startswith('Tags')).split(',') if t.strip()]
hay = (title + '\n' + desc).lower()
ok = True
def chk(cond, msg):
    global ok
    print(('✓ ' if cond else '✗ ') + msg); ok &= cond
chk(len(title) <= 60, f'title {len(title)} chars: {title}')
chk(title.rstrip().endswith('#shorts'), 'title ends with #shorts')
original = re.search(r'^Typ: Original', md, re.M) is not None
chk(original or 'Ganzes Video:' in desc, 'description has the „Ganzes Video“ line' + (' (original Short: not needed)' if original else ''))
chk(2 <= len(desc.splitlines()) <= (7 if original else 5), f'description {len(desc.splitlines())} lines')
chk(10 <= len(tags) <= 15, f'{len(tags)} tags, {sum(len(t) for t in tags) + 2 * (len(tags) - 1)} chars')
for t in tags:
    chk(t.lower() in hay, f'tag „{t}“ in title/description')
sys.exit(0 if ok else 1)
