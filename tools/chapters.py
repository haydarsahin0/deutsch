#!/usr/bin/env python3
"""Print YouTube chapter timestamps for an episode: start time of the first spoken word after
every '## heading' in script.md (needs build/alignment.json).
Usage: python3 tools/chapters.py episodes/<ep> [--skip "Zwischen-CTA"]"""
import json, sys
ep = sys.argv[1]
skip = set(sys.argv[sys.argv.index('--skip') + 1].split(',')) if '--skip' in sys.argv else {'Zwischen-CTA'}
a = json.load(open(f'{ep}/build/alignment.json'))
lines = open(f'{ep}/script.md', encoding='utf-8').read().split('\n')
heads = [(i + 1, l[3:].strip()) for i, l in enumerate(lines) if l.startswith('## ')]
for L, h in heads:
    if h in skip:
        continue
    t = next((w['start'] for w in a['words'] if w.get('line', 0) > L), None)
    if t is not None:
        print(f"{int(t // 60)}:{int(t % 60):02d} {h}")
