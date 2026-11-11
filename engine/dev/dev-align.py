#!/usr/bin/env python3
"""DEV ONLY provisional alignment (the real one is tools/align.py by the audio agent).
usage: python3 engine/dev/dev-align.py <audio> <script-words.json> <out.json> [model]
Transcribes with faster-whisper (word timestamps), matches script words to the transcript with
difflib, interpolates unmatched words, resolves cue times. Output = PIPELINE alignment.json format.
Script words that lie beyond the end of the transcript are dropped (partial build)."""
import json, sys, re, unicodedata, difflib, subprocess

def norm(t):
    t = t.lower().replace('ß', 'ss')
    t = unicodedata.normalize('NFD', t)
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', t)

audio, sw, out = sys.argv[1:4]
model_name = sys.argv[4] if len(sys.argv) > 4 else 'small'
S = json.load(open(sw))
from faster_whisper import WhisperModel
m = WhisperModel(model_name, device='cpu', compute_type='int8')
import numpy as np
pcm = np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',audio,'-ac','1','-ar','16000','-f','s16le','-']), np.int16).astype(np.float32)/32768
segs, info = m.transcribe(pcm, language='de', word_timestamps=True, beam_size=1, vad_filter=False)
tw = []
for s in segs:
    for w in s.words:
        tw.append({'text': w.word.strip(), 'start': w.start, 'end': w.end})
    print('%.1f' % s.end, s.text[:60], flush=True)
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio]).decode())
# numbers: whisper may write "35" where script has "35" — fine; spelled-out vs digits mismatch is interpolated.
a = [norm(w['text']) for w in S['words']]
b = [norm(w['text']) for w in tw]
sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
T = [None] * len(a)
for blk in sm.get_matching_blocks():
    for k in range(blk.size):
        T[blk.a + k] = (tw[blk.b + k]['start'], tw[blk.b + k]['end'])
# last matched script word → cut there (partial)
last = max([i for i, x in enumerate(T) if x] or [0])
n = last + 1
# interpolate gaps
i = 0
while i < n:
    if T[i] is None:
        j = i
        while j < n and T[j] is None: j += 1
        t0 = T[i - 1][1] if i > 0 else 0.0
        t1 = T[j][0] if j < n else dur
        L = sum(len(S['words'][k]['text']) for k in range(i, j)) or 1
        acc = t0
        for k in range(i, j):
            d = (t1 - t0) * len(S['words'][k]['text']) / L
            T[k] = (acc, acc + d * 0.9); acc += d
        i = j
    else:
        i += 1
words = [{'i': k, 'text': S['words'][k]['text'], 'start': round(T[k][0], 3), 'end': round(T[k][1], 3)} for k in range(n)]
cues = []
for c in S['cues']:
    if c['word'] < n: t = words[c['word']]['start']
    elif c['word'] == n and n == len(S['words']): t = words[-1]['end']
    else: continue
    cues.append({'cue': c['cue'], 'args': c['args'], 'word': c['word'], 't': round(t, 3)})
# sentences
sents, cur = [], []
for w in words:
    cur.append(w)
    if re.search(r'[.!?…][“”"»«]?$', w['text']):
        sents.append({'text': ' '.join(x['text'] for x in cur), 'start': cur[0]['start'], 'end': cur[-1]['end']}); cur = []
if cur: sents.append({'text': ' '.join(x['text'] for x in cur), 'start': cur[0]['start'], 'end': cur[-1]['end']})
json.dump({'duration': round(dur, 3), 'source': audio, 'dev': True, 'words': words, 'cues': cues, 'sentences': sents},
          open(out, 'w'), ensure_ascii=False, indent=0)
print('matched', sum(1 for x in T[:n] if x), 'of', n, 'words; cues', len(cues), '->', out)
