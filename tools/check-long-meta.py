#!/usr/bin/env python3
"""Check a long-video meta.md: every tag must appear literally (punctuation-insensitive) in the
final title or the description; tag list must fit YouTube's 500-char limit (tags with spaces count +2).
Expects sections '## Titel (final)' with **title**, '## Beschreibung' and '## Tags' with ``` blocks.
Usage: python3 tools/check-long-meta.py episodes/<ep>/meta.md"""
import re, sys
m = open(sys.argv[1], encoding='utf-8').read()
title = re.search(r'## Titel \(final\)\n\*\*(.+?)\*\*', m).group(1)
desc = m[m.index('## Beschreibung'):m.index('## Tags')]
tags = m[m.index('## Tags'):].split('```')[1].strip().split(', ')
norm = lambda s: ' '.join(re.sub(r'[„“"\-–·,.?!:()✓✗→]', ' ', s.lower()).split())
hay = norm(title + ' ' + desc)
miss = [t for t in tags if norm(t) not in hay]
cost = sum(len(t) + (2 if ' ' in t else 0) for t in tags) + len(tags) - 1
print(f'title: {len(title)} chars | tags: {len(tags)}, {cost}/500 chars')
for t in miss:
    print('✗ tag not in title/description:', t)
sys.exit(1 if miss or cost > 500 or len(title) > 70 else 0)
