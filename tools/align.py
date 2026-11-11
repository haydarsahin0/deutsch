#!/usr/bin/env python3
"""Align the spoken text of an episode's script.md to its narration audio.

Usage:
  python3 tools/align.py episodes/<ep> [--audio FILE] [--model NAME] [--retranscribe]

Default audio source:
  * audio/voice.wav together with build/voice-manifest.json (written by
    tools/assemble-audio.py): the cached per-part transcripts are re-used and mapped
    through the manifest, so re-aligning after a script edit takes seconds.
  * otherwise audio/voice.wav (or --audio FILE) is transcribed directly
    (cached in build/transcripts/ by audio hash).

Outputs (atomically written):
  build/alignment.json      words / cues / sentences / sections / stats (docs/PIPELINE.md)
  out/subtitles.de.srt|vtt  subtitles built from the SCRIPT text (correct spelling)

The module is also imported by tools/assemble-audio.py.
"""
import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import time
import difflib

import numpy as np

try:
    from rapidfuzz.fuzz import ratio as _rf_ratio

    def sim(a, b):
        return _rf_ratio(a, b) / 100.0
except ImportError:  # pragma: no cover
    def sim(a, b):
        return difflib.SequenceMatcher(None, a, b).ratio()

DEFAULT_MODEL = os.environ.get("MELO_WHISPER_MODEL", "large-v3-turbo")
TRANSCRIBE_VERSION = 3  # bump to invalidate transcript caches
SR_ANALYSIS = 16000


def warn(*a):
    print("[align] WARNING:", *a, file=sys.stderr, flush=True)


def log(*a):
    print("[align]", *a, file=sys.stderr, flush=True)


# --------------------------------------------------------------------------- utils
def atomic_write_text(path, text):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".tmp-", dir=os.path.dirname(path) or ".")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(text)
    os.chmod(tmp, 0o644)
    os.replace(tmp, path)


def atomic_write_json(path, obj, indent=None):
    atomic_write_text(path, json.dumps(obj, ensure_ascii=False, indent=indent) + "\n")


def file_sha1(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_audio(path, sr=SR_ANALYSIS):
    """Decode any audio file to mono float32 at `sr` using ffmpeg."""
    out = subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr),
         "-f", "f32le", "-"], check=True, stdout=subprocess.PIPE).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


# ------------------------------------------------------------- German normalisation
_UNITS = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun",
          "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn",
          "achtzehn", "neunzehn"]
_TENS = {2: "zwanzig", 3: "dreißig", 4: "vierzig", 5: "fünfzig", 6: "sechzig", 7: "siebzig",
         8: "achtzig", 9: "neunzig"}


def num2de(n):
    n = int(n)
    if n < 0:
        return "minus" + num2de(-n)
    if n < 20:
        return _UNITS[n]
    if n < 100:
        t, u = divmod(n, 10)
        if u == 0:
            return _TENS[t]
        return ("ein" if u == 1 else _UNITS[u]) + "und" + _TENS[t]
    if n < 1000:
        h, r = divmod(n, 100)
        s = ("ein" if h == 1 else _UNITS[h]) + "hundert"
        return s + (num2de(r) if r else "")
    if n < 1000000:
        th, r = divmod(n, 1000)
        s = ("ein" if th == 1 else num2de(th)) + "tausend"
        return s + (num2de(r) if r else "")
    return str(n)


_TRANS = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "é": "e", "è": "e",
                        "à": "a", "ç": "c", "ñ": "n"})


def norm(word):
    """Normalise a word for matching: lowercase, umlauts → ae/oe/ue, ß → ss, digits → German
    number words, all punctuation removed."""
    w = word.lower()
    w = re.sub(r"\d+", lambda m: num2de(m.group(0)) if len(m.group(0)) < 7 else m.group(0), w)
    w = w.translate(_TRANS)
    return re.sub(r"[^a-z0-9]", "", w)


def has_alnum(tok):
    return any(ch.isalnum() for ch in tok)


def strip_punct(tok):
    return re.sub(r"^[^\w]+|[^\w]+$", "", tok, flags=re.UNICODE)


# ------------------------------------------------------------------ script parsing
CUE_RE = re.compile(r"\[\[\s*(.*?)\s*\]\]", re.S)
ARG_RE = re.compile(r'([\w-]+)=("([^"]*)"|\S+)')
SENT_END_RE = re.compile(r"[.!?][\"“”»«’')\]]*$")
CLAUSE_END_RE = re.compile(r"[,;:–—…-][\"“”»«’')\]]*$")
CONJ = set("und aber oder denn sondern dass weil wenn als ob obwohl damit bevor nachdem "
           "während sobald falls wie wo was wer die der das den dem deren dessen mit für "
           "auf zu bei nach von".split())


def parse_cue(inner):
    m = re.match(r"([\w-]+)\s*(.*)$", inner, re.S)
    if not m:
        return None
    name, rest = m.group(1), m.group(2)
    args = {}
    for am in ARG_RE.finditer(rest):
        if am.group(3) is not None:
            args[am.group(1)] = am.group(3)
        else:
            v = am.group(2)
            try:
                v = int(v) if re.fullmatch(r"-?\d+", v) else float(v) if re.fullmatch(r"-?\d*\.\d+", v) else v
            except ValueError:
                pass
            args[am.group(1)] = v
    return name, args


def parse_script(path):
    """Returns dict(meta_raw, words, cues, sections). Each word:
    {i, text, raw, norm, pos, line, sent_end, clause_end, para_end}. `raw` is the display form
    including attached punctuation tokens. Cues: {cue, args, word, line, pos}; word = index of the
    next spoken word (== len(words) if none follows)."""
    src = open(path, encoding="utf-8").read()
    body_off = 0
    meta_raw = ""
    m = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n?", src)
    if m:
        meta_raw = m.group(1)
        body_off = m.end()
    words, cues, sections = [], [], []
    pending_prefix = ""  # punctuation tokens before the first word of a phrase
    line_no = src[:body_off].count("\n") + 1
    pos = body_off
    in_comment = False
    for line in src[body_off:].split("\n"):
        stripped = line.strip()
        if "<!--" in stripped:
            in_comment = "-->" not in stripped.split("<!--", 1)[1]
            line = re.sub(r"<!--.*?(-->|$)", " ", line)
            stripped = line.strip()
        elif in_comment:
            if "-->" in stripped:
                in_comment = False
                line = line.split("-->", 1)[1]
                stripped = line.strip()
            else:
                pos += len(line) + 1
                line_no += 1
                continue
        if re.match(r"^#{1,6}\s", stripped):
            sections.append({"title": re.sub(r"^#{1,6}\s+", "", stripped), "word": len(words),
                             "line": line_no})
            if words:
                words[-1]["para_end"] = True
        elif not stripped:
            if words:
                words[-1]["para_end"] = True
        else:
            last = 0
            pieces = []
            for cm in CUE_RE.finditer(line):
                pieces.append(("text", line[last:cm.start()], last))
                pieces.append(("cue", cm.group(1), cm.start()))
                last = cm.end()
            pieces.append(("text", line[last:], last))
            for kind, s, off in pieces:
                if kind == "cue":
                    pc = parse_cue(s)
                    if pc is None:
                        warn(f"line {line_no}: cannot parse cue [[{s}]]")
                        continue
                    cues.append({"cue": pc[0], "args": pc[1], "word": len(words),
                                 "line": line_no, "pos": pos + off})
                    continue
                # stray brackets left over from malformed cues are not spoken
                s2 = re.sub(r"\[\[.*", " ", s) if "[[" in s else s
                for tm in re.finditer(r"\S+", s2):
                    tok = tm.group(0)
                    if not has_alnum(tok):
                        if words and not words[-1].get("para_end") and not pending_prefix \
                                and not tok.startswith(("„", "«", "»", "(")):
                            words[-1]["raw"] += " " + tok
                            if CLAUSE_END_RE.search(tok):
                                words[-1]["clause_end"] = True
                        else:
                            pending_prefix += tok + " "
                        continue
                    raw = pending_prefix + tok
                    pending_prefix = ""
                    words.append({"i": len(words), "text": strip_punct(tok) or tok, "raw": raw,
                                  "norm": norm(tok), "pos": pos + off + tm.start(),
                                  "line": line_no,
                                  "sent_end": bool(SENT_END_RE.search(tok)),
                                  "clause_end": bool(CLAUSE_END_RE.search(tok)),
                                  "para_end": False})
        pos += len(line) + 1
        line_no += 1
    if words:
        words[-1]["para_end"] = True
    for w in words:
        if w["para_end"]:
            w["sent_end"] = True
    return {"meta_raw": meta_raw, "words": words, "cues": cues, "sections": sections}


def tts_part_words(text):
    """Spoken words of an ElevenLabs part text (audio tags [..] removed) + list of tags."""
    tags = re.findall(r"\[([^\[\]]+)\]", text)
    clean = re.sub(r"\[[^\[\]]*\]", " ", text)
    return [norm(t) for t in clean.split() if has_alnum(t)], tags


def part_script_ranges(ep, script_words, n_parts):
    """Map tts-elevenlabs/teil-N.txt to script word index ranges [a, b) using a sequence match
    over the normalised words. Returns list (per part) of (a, b, tags) or None if unknown."""
    tdir = os.path.join(ep, "tts-elevenlabs")
    seqs, tags_all = [], []
    k = 1
    while os.path.exists(os.path.join(tdir, f"teil-{k}.txt")):
        ws, tags = tts_part_words(open(os.path.join(tdir, f"teil-{k}.txt"), encoding="utf-8").read())
        seqs.append(ws)
        tags_all.append(tags)
        k += 1
    if not seqs:
        return [None] * n_parts
    flat, owner = [], []
    for pi, ws in enumerate(seqs):
        flat += ws
        owner += [pi] * len(ws)
    snorm = [w["norm"] for w in script_words]
    sm = difflib.SequenceMatcher(None, flat, snorm, autojunk=False)
    t2s = [None] * len(flat)
    for a, b, size in sm.get_matching_blocks():
        for d in range(size):
            t2s[a + d] = b + d
    matched = sum(1 for x in t2s if x is not None)
    if matched < 0.8 * len(flat):
        warn(f"tts-elevenlabs texts match the script poorly ({matched}/{len(flat)} words) – "
             "falling back to free-end alignment")
        return [None] * n_parts
    ranges = []
    start = 0
    for pi, ws in enumerate(seqs):
        idx = [t2s[j] for j in range(len(flat)) if owner[j] == pi and t2s[j] is not None]
        if not idx:
            ranges.append(None)
            continue
        # part ends at the script word just before the first word of the next part
        nxt = [t2s[j] for j in range(len(flat)) if owner[j] == pi + 1 and t2s[j] is not None]
        end = min(nxt) if nxt else (max(idx) + 1 if pi < len(seqs) - 1 else len(script_words))
        if pi == len(seqs) - 1:
            end = max(end, len(script_words)) if max(idx) + 1 >= len(script_words) - 3 else max(idx) + 1
        ranges.append((start, end, tags_all[pi]))
        start = end
    if len(snorm) and ranges and ranges[-1] and ranges[-1][1] < len(snorm):
        warn(f"script has {len(snorm) - ranges[-1][1]} words after the last tts part")
    out = ranges[:n_parts] + [None] * max(0, n_parts - len(ranges))
    return out


# ----------------------------------------------------------------- transcription
_MODEL_CACHE = {}


def get_model(name):
    if name not in _MODEL_CACHE:
        from faster_whisper import WhisperModel
        threads = int(os.environ.get("MELO_WHISPER_THREADS", os.cpu_count() or 4))
        _MODEL_CACHE[name] = WhisperModel(name, device="cpu", compute_type="int8",
                                          cpu_threads=threads)
    return _MODEL_CACHE[name]


def transcribe(audio_path, ep, model=DEFAULT_MODEL, prompt=None, force=False):
    """faster-whisper transcription with word timestamps, cached in build/transcripts/
    by (audio hash, model, prompt). Returns dict with words [{w,s,e,p}]."""
    sha = file_sha1(audio_path)
    key = hashlib.sha1(f"{sha}|{model}|{prompt}|{TRANSCRIBE_VERSION}".encode()).hexdigest()[:16]
    cdir = os.path.join(ep, "build", "transcripts")
    cpath = os.path.join(cdir, f"{os.path.splitext(os.path.basename(audio_path))[0]}-{key}.json")
    if os.path.exists(cpath) and not force:
        return json.load(open(cpath, encoding="utf-8"))
    log(f"transcribing {audio_path} with {model} …")
    t0 = time.time()
    m = get_model(model)
    # decode with ffmpeg ourselves (PyAV 19 breaks faster-whisper's own decoder)
    segs, info = m.transcribe(load_audio(audio_path, 16000), language="de", word_timestamps=True, vad_filter=True,
                              vad_parameters={"min_silence_duration_ms": 300, "speech_pad_ms": 200},
                              beam_size=5, initial_prompt=prompt,
                              # True makes turbo skip whole phrases at 30-s window
                              # boundaries (measured on ep. 1), False transcribes everything
                              condition_on_previous_text=False)
    words, segments = [], []
    for s in segs:
        segments.append({"s": round(s.start, 3), "e": round(s.end, 3), "text": s.text.strip()})
        for w in s.words or []:
            words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3),
                          "p": round(w.probability, 3)})
    el = time.time() - t0
    res = {"audio": os.path.relpath(audio_path, ep), "sha1": sha, "model": model,
           "duration": round(info.duration, 3), "elapsed": round(el, 1),
           "xrt": round(el / max(info.duration, 1e-6), 3), "prompt": prompt,
           "words": words, "segments": segments}
    log(f"  {len(words)} words, {info.duration:.1f}s audio in {el:.1f}s ({res['xrt']:.2f}× realtime)")
    atomic_write_json(cpath, res)
    return res


def prompt_for(script_words, a, b=None):
    """initial_prompt: a short glossary of the longest distinct words of the part (biases the
    spelling of compounds/names). Not the sentences themselves: a prompt that contains the
    upcoming text makes whisper skip it."""
    ws = script_words[a:(b if b is not None else a + 700)]
    seen, vocab = set(), []
    for w in sorted(ws, key=lambda w: -len(w["text"])):
        t = w["text"]
        if len(t) >= 9 and t.lower() not in seen:
            seen.add(t.lower())
            vocab.append(t)
        if len(vocab) >= 25:
            break
    return ("Deutsch mit Melo. " + ", ".join(vocab) + ".") if vocab else None


# --------------------------------------------------------------------- alignment
GAP = -0.6


def _score(r):
    return 2.0 * r - 0.9


def align_sequences(sn, tn, free_end=False):
    """Banded DP alignment of script norms `sn` to transcript norms `tn`.
    Ops: 1:1, 1:0 (script word unspoken), 0:1 (extra word), 1:2 and 2:1 merges.
    Returns list of (op, si_list, tj_list, r)."""
    n, m = len(sn), len(tn)
    if n == 0 or m == 0:
        return [("s", [i], [], 0.0) for i in range(n)] + [("t", [], [j], 0.0) for j in range(m)]
    NEG = -1e18
    band = int(150 + 0.15 * max(n, m))
    D = np.full((n + 1, m + 1), NEG)
    B = np.zeros((n + 1, m + 1), dtype=np.int8)
    D[0, 0] = 0.0
    slope = m / n if not free_end else 1.0
    for i in range(0, n + 1):
        c = int(i * slope)
        j0, j1 = max(0, c - band), min(m, c + band)
        if i == 0:
            j0 = 0
        for j in range(j0, j1 + 1):
            if i == 0 and j == 0:
                continue
            best, bo = NEG, 0
            if i > 0 and j > 0 and D[i - 1, j - 1] > NEG:
                v = D[i - 1, j - 1] + _score(sim(sn[i - 1], tn[j - 1]))
                if v > best:
                    best, bo = v, 1
            if i > 0 and D[i - 1, j] > NEG:
                v = D[i - 1, j] + GAP
                if v > best:
                    best, bo = v, 2
            if j > 0 and D[i, j - 1] > NEG:
                v = D[i, j - 1] + GAP
                if v > best:
                    best, bo = v, 3
            if i > 0 and j > 1 and D[i - 1, j - 2] > NEG:
                v = D[i - 1, j - 2] + _score(sim(sn[i - 1], tn[j - 2] + tn[j - 1])) - 0.1 + GAP * 0.3
                if v > best:
                    best, bo = v, 4
            if i > 1 and j > 0 and D[i - 2, j - 1] > NEG:
                v = D[i - 2, j - 1] + _score(sim(sn[i - 2] + sn[i - 1], tn[j - 1])) - 0.1 + GAP * 0.3
                if v > best:
                    best, bo = v, 5
            D[i, j], B[i, j] = best, bo
    if free_end:
        i = int(np.argmax(D[:, m]))
    else:
        i = n
    j = m
    ops = []
    while i > 0 or j > 0:
        bo = B[i, j]
        if bo == 1:
            ops.append(("m", [i - 1], [j - 1], sim(sn[i - 1], tn[j - 1])))
            i, j = i - 1, j - 1
        elif bo == 2:
            ops.append(("s", [i - 1], [], 0.0))
            i -= 1
        elif bo == 3:
            ops.append(("t", [], [j - 1], 0.0))
            j -= 1
        elif bo == 4:
            ops.append(("m", [i - 1], [j - 2, j - 1], sim(sn[i - 1], tn[j - 2] + tn[j - 1])))
            i, j = i - 1, j - 2
        elif bo == 5:
            ops.append(("m", [i - 2, i - 1], [j - 1], sim(sn[i - 2] + sn[i - 1], tn[j - 1])))
            i, j = i - 2, j - 1
        else:  # outside band (should not happen) – consume greedily
            if i > 0:
                ops.append(("s", [i - 1], [], 0.0)); i -= 1
            else:
                ops.append(("t", [], [j - 1], 0.0)); j -= 1
    ops.reverse()
    return ops


def align_part(script_words, a, b, rec, free_end=False, tags=()):
    """Align script words [a, b) to recognised words `rec` (times already in the target
    timeline). Returns (timed dict i -> (s, e, kind, r, recognised text), extras, last_i)."""
    sn = [w["norm"] for w in script_words[a:b]]
    tn = [norm(r["w"]) for r in rec]
    keep = [k for k, t in enumerate(tn) if t]
    tn2 = [tn[k] for k in keep]
    ops = align_sequences(sn, tn2, free_end=free_end)
    timed, extras = {}, []
    tagset = set()
    for tg in tags:
        for part in re.split(r"[\s,]+", tg):
            if norm(part):
                tagset.add(norm(part))
    covered = a - 1
    for op, si, tj, r in ops:
        tj = [keep[x] for x in tj]
        if op == "m":
            s = rec[tj[0]]["s"]
            e = rec[tj[-1]]["e"]
            rtext = " ".join(rec[x]["w"] for x in tj)
            if len(si) == 1:
                timed[a + si[0]] = (s, e, "match" if r >= 0.75 else "subst", r, rtext)
            else:  # two script words in one recognised word: split by length
                l1 = len(sn[si[0]]) + 1
                l2 = len(sn[si[1]]) + 1
                mid = s + (e - s) * l1 / (l1 + l2)
                kind = "match" if r >= 0.75 else "subst"
                timed[a + si[0]] = (s, mid, kind, r, rtext)
                timed[a + si[1]] = (mid, e, kind, r, rtext)
            covered = max(covered, a + si[-1])
        elif op == "t":
            for x in tj:
                rw = rec[x]
                extras.append({"text": rw["w"], "start": rw["s"], "end": rw["e"],
                               "after_word": covered if covered >= 0 else None,
                               "tag_spoken": norm(rw["w"]) in tagset})
    return timed, extras, covered


def build_word_times(script_words, n_cov, timed, extras_by_gap):
    """Fill times for all covered words: matched words take recognised times, unmatched runs
    are interpolated (by character length) inside the span between matched neighbours."""
    out = []
    for i in range(n_cov):
        if i in timed:
            s, e, kind, r, rt = timed[i]
            out.append({"s": s, "e": e, "kind": kind, "r": r, "rec": rt})
        else:
            out.append(None)
    i = 0
    while i < n_cov:
        if out[i] is not None:
            i += 1
            continue
        j = i
        while j < n_cov and out[j] is None:
            j += 1
        lo = out[i - 1]["e"] if i > 0 else (out[j]["s"] - 0.4 * (j - i) if j < n_cov else 0.0)
        hi = out[j]["s"] if j < n_cov else lo + 0.4 * (j - i)
        lo = max(lo, 0.0)
        ex = [x for x in extras_by_gap if lo - 0.01 <= x["start"] and x["end"] <= hi + 0.01]
        if ex:  # recognised-but-unmatched words in this slot are probably these script words
            lo2, hi2 = min(x["start"] for x in ex), max(x["end"] for x in ex)
            if hi2 - lo2 > 0.05:
                lo, hi = lo2, hi2
                for x in ex:
                    x["absorbed"] = True
        if hi < lo:
            hi = lo
        lens = [len(script_words[k]["norm"]) + 2 for k in range(i, j)]
        tot = sum(lens)
        t = lo
        for k, L in zip(range(i, j), lens):
            d = (hi - lo) * L / tot
            out[k] = {"s": t, "e": t + d, "kind": "interp", "r": 0.0, "rec": None}
            t += d
        i = j
    # monotonic clean-up
    for k in range(1, n_cov):
        if out[k]["s"] < out[k - 1]["s"]:
            out[k]["s"] = out[k - 1]["s"]
        if out[k]["e"] < out[k]["s"]:
            out[k]["e"] = out[k]["s"]
    for k in range(n_cov - 1):
        if out[k]["e"] > out[k + 1]["s"]:
            mid = (out[k]["e"] + out[k + 1]["s"]) / 2
            out[k]["e"] = max(out[k]["s"], min(mid, out[k]["e"]))
            out[k + 1]["s"] = max(out[k]["e"], out[k + 1]["s"])
    return out


# ------------------------------------------------------------------ energy refine
def frame_db(audio, sr, win=0.010, hop=0.005):
    w, h = int(sr * win), int(sr * hop)
    n = max(1, 1 + (len(audio) - w) // h)
    idx = np.arange(n) * h
    # vectorised RMS via cumulative sum of squares
    c = np.concatenate([[0.0], np.cumsum(audio.astype(np.float64) ** 2)])
    e = (c[np.minimum(idx + w, len(audio))] - c[idx]) / w
    return 10 * np.log10(e + 1e-12), hop


def voiced_threshold(db):
    floor = np.percentile(db, 5)
    speech = np.percentile(db, 95)
    return max(floor + 12.0, speech - 38.0)


def refine_times(wt, audio, sr):
    """Snap word starts/ends that border silence to the real energy onset/offset.
    Only moves boundaries next to silence; continuous speech keeps whisper's times."""
    db, hop = frame_db(audio, sr)
    thr = voiced_threshold(db)
    voiced = db > thr
    nF = len(voiced)

    def fi(t):
        return min(nF - 1, max(0, int(round(t / hop))))

    moved = 0
    for k, w in enumerate(wt):
        prev_e = wt[k - 1]["e"] if k > 0 else 0.0
        next_s = wt[k + 1]["s"] if k + 1 < len(wt) else len(audio) / sr
        s, e = w["s"], w["e"]
        # --- start
        f = fi(s)
        ns = s
        if not voiced[f]:
            g = f
            lim = fi(e - 0.02)  # first voiced frame inside the word
            while g < lim and not voiced[g]:
                g += 1
            if voiced[g]:
                ns = g * hop
        else:
            g = f
            lim = fi(max(prev_e, s - 0.15))
            while g > lim and voiced[g - 1]:
                g -= 1
            if g > lim and not voiced[g - 1]:  # found a silence→voice transition
                ns = g * hop
        # --- end
        f = fi(e)
        ne = e
        if not voiced[f]:
            g = f
            lim = fi(ns + 0.02)
            while g > lim and not voiced[g]:
                g -= 1
            if voiced[g]:
                ne = (g + 1) * hop
        else:
            g = f
            lim = fi(min(next_s, e + 0.15))
            while g < lim and voiced[g + 1 if g + 1 < nF else g]:
                g += 1
            if g < lim:
                ne = (g + 1) * hop
        ns = max(ns, prev_e)
        ne = min(max(ne, ns + 0.03), max(next_s, ns + 0.03))
        if abs(ns - s) > 0.005 or abs(ne - e) > 0.005:
            moved += 1
        w["s"], w["e"] = ns, ne
    return moved, thr


# --------------------------------------------------------------- full alignment
def align_episode(ep, script, parts, audio=None, sr=SR_ANALYSIS, duration=None, clip_fn=None,
                  model=DEFAULT_MODEL):
    """parts: list of {"words": [...recognised words with times in the target timeline...],
    "range": (a, b, tags) or None}. The tts ranges are only a hint: each part is aligned
    free-end over its expected range + a margin (ElevenLabs parts do not always end exactly
    where teil-N.txt ends), except the last part of the script, which must cover the rest.
    clip_fn(t0, t1) -> 16 kHz audio of the target timeline, used to re-transcribe stretches
    whisper skipped. Returns the alignment dict (without writing)."""
    sw = script["words"]
    N = len(sw)
    timed_all, extras_all = {}, []
    pos = 0
    part_info = []
    for pi, p in enumerate(parts):
        rng = p.get("range")
        tags = tuple(rng[2]) if rng else ()
        a = pos
        if rng is not None and rng[1] >= N and pi == len(parts) - 1:
            b, free = N, False  # last part of the episode: must cover the rest
        else:
            hint = rng[1] if rng is not None else a + len(p["words"])
            b = min(N, max(hint, a + len(p["words"])) + 120)
            free = b < N or pi < len(parts) - 1
        if rng is not None and rng[0] != pos:
            log(f"part {pi + 1}: teil-{pi + 1}.txt starts at script word {rng[0]}, audio of the "
                f"previous part ended at {pos}")
        timed, extras, cov = align_part(sw, a, b, p["words"], free_end=free, tags=tags)
        if not free:
            cov = b - 1
        timed_all.update(timed)
        extras_all += extras
        part_info.append({"part": pi + 1, "script_words": [a, cov + 1], "recognised": len(p["words"]),
                          "tts_range": [rng[0], rng[1]] if rng else None, "free_end": free})
        pos = cov + 1
    n_cov = pos
    wt = build_word_times(sw, n_cov, timed_all, extras_all)
    repaired = []
    if clip_fn is not None and n_cov:
        repaired = repair_gaps(ep, sw, wt, n_cov, timed_all, clip_fn, model)
        if repaired:
            for x in extras_all:
                x.pop("absorbed", None)
            extras_all = [x for x in extras_all
                          if not any(r["t0"] <= x["start"] and x["end"] <= r["t1"] for r in repaired)]
            wt = build_word_times(sw, n_cov, timed_all, extras_all)
    moved, thr = (0, None)
    if audio is not None and n_cov:
        moved, thr = refine_times(wt, audio, sr)
    al = assemble_alignment(ep, script, wt, n_cov, extras_all, part_info,
                            duration=duration, refine_moved=moved, thr=thr)
    al["stats"]["repaired_gaps"] = repaired
    return al


def transcribe_clip(ep, clip, model, prompt):
    """Second-pass transcription of a short clip (no VAD, no conditioning), cached."""
    key = hashlib.sha1(clip.tobytes() + f"|{model}|{prompt}|{TRANSCRIBE_VERSION}".encode()).hexdigest()[:16]
    cpath = os.path.join(ep, "build", "transcripts", f"clip-{key}.json")
    if os.path.exists(cpath):
        return json.load(open(cpath, encoding="utf-8"))
    m = get_model(model)
    segs, _ = m.transcribe(clip, language="de", word_timestamps=True, vad_filter=False,
                           beam_size=5, initial_prompt=prompt, condition_on_previous_text=False)
    words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)}
             for sg in segs for w in (sg.words or [])]
    atomic_write_json(cpath, words)
    return words


def repair_gaps(ep, sw, wt, n_cov, timed_all, clip_fn, model, min_run=2):
    """Whisper (esp. turbo) sometimes skips a phrase at a 30-s window boundary. For every run of
    >= min_run interpolated script words, re-transcribe just that stretch and align it again."""
    runs = []
    k = 0
    while k < n_cov:
        if wt[k]["kind"] != "interp":
            k += 1
            continue
        j = k
        while j < n_cov and wt[j]["kind"] == "interp":
            j += 1
        if j - k >= min_run:
            runs.append((k, j))
        k = j
    done = []
    for i, j in runs:
        lo = wt[i - 1]["e"] if i > 0 else 0.0
        hi = wt[j]["s"] if j < n_cov else wt[j - 1]["e"] + 1.0
        t0, t1 = max(0.0, lo - 0.15), hi + 0.15
        if t1 - t0 < 0.3:
            continue
        clip = clip_fn(t0, t1)
        if clip is None or len(clip) < 1600:
            continue
        ctx = " ".join(w["raw"] for w in sw[max(0, i - 25):i]) or None
        rec = transcribe_clip(ep, clip, model, ctx)
        rec = [dict(r, s=r["s"] + t0, e=r["e"] + t0) for r in rec if norm(r["w"])]
        if not rec:
            continue
        sn = [w["norm"] for w in sw[i:j]]
        tn = [norm(r["w"]) for r in rec]
        ops = align_sequences(sn, tn, free_end=False)
        got = 0
        for op, si, tj, r in ops:
            if op != "m" or r < 0.6:
                continue
            s_, e_ = rec[tj[0]]["s"], rec[tj[-1]]["e"]
            if len(si) == 1:
                timed_all[i + si[0]] = (s_, e_, "match" if r >= 0.75 else "subst", r,
                                        " ".join(rec[x]["w"] for x in tj))
                got += 1
            else:
                mid = (s_ + e_) / 2
                timed_all[i + si[0]] = (s_, mid, "match", r, rec[tj[0]]["w"])
                timed_all[i + si[1]] = (mid, e_, "match", r, rec[tj[0]]["w"])
                got += 2
        done.append({"words": [i, j - 1], "t0": round(t0, 3), "t1": round(t1, 3),
                     "heard": " ".join(r["w"] for r in rec), "recovered": got})
        log(f"repair #{i}-{j - 1} ({t0:.2f}-{t1:.2f}s): recovered {got}/{j - i} – heard „"
            f"{' '.join(r['w'] for r in rec)[:80]}“")
    return done


def assemble_alignment(ep, script, wt, n_cov, extras, part_info, duration=None,
                       refine_moved=0, thr=None):
    sw = script["words"]
    N = len(sw)
    words = []
    for k in range(n_cov):
        w = sw[k]
        t = wt[k]
        words.append({"i": k, "text": w["text"], "start": round(t["s"], 3), "end": round(t["e"], 3),
                      "raw": w["raw"], "match": t["kind"], "line": w["line"]})
        if w["para_end"]:
            words[-1]["para_end"] = True
    if duration is None:
        duration = words[-1]["end"] + 0.5 if words else 0.0
    partial = n_cov < N
    cues = []
    dropped = 0
    for c in script["cues"]:
        wi = c["word"]
        if wi < n_cov:
            t = words[wi]["start"]
            at = "start"
        elif wi == N and not partial and words:
            wi, t, at = n_cov - 1, words[-1]["end"], "end"
        else:
            dropped += 1
            continue
        entry = {"cue": c["cue"], "args": c["args"], "word": wi, "t": round(t, 3), "at": at,
                 "line": c["line"]}
        if wi > 0 and at == "start":
            entry["prev_end"] = words[wi - 1]["end"]
        cues.append(entry)
    sentences = []
    cur = []
    for k in range(n_cov):
        cur.append(k)
        if sw[k]["sent_end"] or k == n_cov - 1:
            sentences.append({"text": " ".join(sw[x]["raw"] for x in cur),
                              "start": words[cur[0]]["start"], "end": words[cur[-1]]["end"],
                              "words": [cur[0], cur[-1]]})
            cur = []
    sections = [{"title": s["title"], "word": s["word"], "t": words[s["word"]]["start"]}
                for s in script["sections"] if s["word"] < n_cov]
    kinds = {}
    for w in words:
        kinds[w["match"]] = kinds.get(w["match"], 0) + 1
    deviations = [{"i": k, "script": sw[k]["text"], "heard": wt[k]["rec"], "sim": round(wt[k]["r"], 2),
                   "t": words[k]["start"]}
                  for k in range(n_cov) if wt[k]["kind"] == "subst"]
    unspoken = [{"i": k, "script": sw[k]["text"], "t": words[k]["start"]}
                for k in range(n_cov) if wt[k]["kind"] == "interp"]
    extra = [{"text": x["text"], "start": round(x["start"], 3), "end": round(x["end"], 3),
              "after_word": x["after_word"], "tag_spoken": x["tag_spoken"]}
             for x in extras if not x.get("absorbed")]
    stats = {"script_words": N, "covered_words": n_cov,
             "matched": kinds.get("match", 0), "substituted": kinds.get("subst", 0),
             "interpolated": kinds.get("interp", 0),
             "match_rate": round(kinds.get("match", 0) / max(n_cov, 1), 4),
             "deviations": deviations, "unmatched_script_words": unspoken,
             "extra_words": extra, "tags_spoken": [x for x in extra if x["tag_spoken"]],
             "cues_dropped": dropped, "parts": part_info,
             "refine": {"moved_words": refine_moved, "gate_db": None if thr is None else round(float(thr), 1)}}
    out = {"duration": round(duration, 3), "partial": partial,
           "covered_until_word": n_cov - 1, "words": words, "cues": cues,
           "sentences": sentences, "sections": sections, "stats": stats}
    return out


# ------------------------------------------------------------------ subtitles
MAX_LINE = 42
MAX_DUR = 7.0
MIN_DUR = 1.0
HARD_GAP = 0.6


def _join(tokens):
    return " ".join(tokens)


def break_lines(tokens):
    """Return list of 1–2 lines (each ≤ 42 chars) or None if impossible."""
    txt = _join(tokens)
    if len(txt) <= MAX_LINE:
        return [txt]
    best, bl = None, None
    for k in range(1, len(tokens)):
        l1, l2 = _join(tokens[:k]), _join(tokens[k:])
        if len(l1) > MAX_LINE or len(l2) > MAX_LINE:
            continue
        cost = abs(len(l1) - len(l2))
        if SENT_END_RE.search(tokens[k - 1]):
            cost -= 22
        elif CLAUSE_END_RE.search(tokens[k - 1]):
            cost -= 10
        elif strip_punct(tokens[k]).lower() in CONJ:
            cost -= 5
        if len(l1) > len(l2) + 6:
            cost += 2  # slight preference for a longer bottom line
        if best is None or cost < best:
            best, bl = cost, [l1, l2]
    return bl


def make_subtitles(al):
    words = al["words"]
    n = len(words)
    if not n:
        return []
    # hard runs: never across a paragraph end, a [[pause]] / [[scene]] cue or a real pause
    brk = {c["word"] for c in al.get("cues", []) if c["cue"] in ("pause", "scene") and c.get("at") == "start"}
    runs, cur = [], [0]
    for k in range(1, n):
        gap = words[k]["start"] - words[k - 1]["end"]
        if gap >= HARD_GAP or words[k - 1].get("para_end") or k in brk:
            runs.append(cur)
            cur = []
        cur.append(k)
    runs.append(cur)
    blocks = []
    for run in runs:
        a, b = run[0], run[-1] + 1
        best = {a: (0.0, None)}
        for j in range(a + 1, b + 1):
            cand = None
            for i in range(j - 1, a - 1, -1):
                toks = [words[x]["raw"] for x in range(i, j)]
                L = len(_join(toks))
                if L > 2 * MAX_LINE + 2 and j - i > 1:
                    break
                if i not in best:
                    continue
                dur = words[j - 1]["end"] - words[i]["start"]
                if dur > MAX_DUR and j - i > 1:
                    break
                lines = break_lines(toks)
                if lines is None and j - i > 1:
                    continue
                last = words[j - 1]["raw"]
                if j == b:
                    c = 0.0
                elif SENT_END_RE.search(last):
                    c = 0.0
                elif CLAUSE_END_RE.search(last):
                    c = 1.0
                elif strip_punct(words[j]["raw"]).lower() in CONJ:
                    c = 2.5
                else:
                    c = 6.0
                c += 1.0  # per block
                if dur < MIN_DUR:
                    c += 3.0 * (MIN_DUR - dur) + 1.0
                if L < 14 and (b - a) > (j - i):
                    c += 1.0
                cps = L / max(dur, 0.3)
                if cps > 20:
                    c += (cps - 20) * 0.25
                inner_sent = sum(1 for x in range(i, j - 1) if SENT_END_RE.search(words[x]["raw"]))
                c += 1.2 * inner_sent
                tot = best[i][0] + c
                if cand is None or tot < cand[0]:
                    cand = (tot, i)
            if cand is not None:
                best[j] = cand
        if b not in best:  # should not happen: fall back to per-word blocks
            for x in range(a, b):
                blocks.append((x, x + 1))
            continue
        segs = []
        j = b
        while j != a:
            i = best[j][1]
            segs.append((i, j))
            j = i
        blocks += reversed(segs)
    # merge blocks that would be too short (< MIN_DUR) with a neighbour when the text fits
    def bdur(i, j):
        return words[j - 1]["end"] - words[i]["start"]

    def fits(i, j):
        return bdur(i, j) <= MAX_DUR and break_lines([words[x]["raw"] for x in range(i, j)]) is not None

    k = 0
    while k < len(blocks):
        i, j = blocks[k]
        nxt_s = words[blocks[k + 1][0]]["start"] if k + 1 < len(blocks) else 1e9
        avail = min(words[j - 1]["end"] + 0.25, nxt_s - 0.04) - words[i]["start"]
        if avail < MIN_DUR:
            cands = []
            if k > 0 and fits(blocks[k - 1][0], j):
                cands.append((bdur(blocks[k - 1][0], j), k - 1))
            if k + 1 < len(blocks) and fits(i, blocks[k + 1][1]):
                cands.append((bdur(i, blocks[k + 1][1]), k))
            if cands:
                _, m = min(cands)
                blocks[m:m + 2] = [(blocks[m][0], blocks[m + 1][1])]
                k = max(0, m - 1)
                continue
        k += 1
    subs = []
    for bi, (i, j) in enumerate(blocks):
        toks = [words[x]["raw"] for x in range(i, j)]
        lines = break_lines(toks) or [_join(toks)]
        s = words[i]["start"]
        e = words[j - 1]["end"] + 0.25
        nxt = words[blocks[bi + 1][0]]["start"] if bi + 1 < len(blocks) else None
        if e - s < MIN_DUR:
            e = s + MIN_DUR
        if nxt is not None:
            e = min(e, nxt - 0.04)
        e = min(e, s + MAX_DUR)
        e = max(e, words[j - 1]["end"] if nxt is None or words[j - 1]["end"] < nxt else s + 0.3)
        subs.append({"start": round(s, 3), "end": round(e, 3), "lines": lines, "words": [i, j - 1]})
    return subs


def _ts(t, sep):
    t = max(0.0, t)
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def write_subtitles(ep, al):
    subs = make_subtitles(al)
    srt, vtt = [], ["WEBVTT", ""]
    for k, s in enumerate(subs, 1):
        srt += [str(k), f"{_ts(s['start'], ',')} --> {_ts(s['end'], ',')}", *s["lines"], ""]
        vtt += [f"{_ts(s['start'], '.')} --> {_ts(s['end'], '.')}", *s["lines"], ""]
    od = os.path.join(ep, "out")
    atomic_write_text(os.path.join(od, "subtitles.de.srt"), "\n".join(srt))
    atomic_write_text(os.path.join(od, "subtitles.de.vtt"), "\n".join(vtt))
    return subs


def write_outputs(ep, al):
    subs = write_subtitles(ep, al)
    al["subtitles"] = subs  # identical chunking to out/subtitles.de.srt (engine burn-in)
    atomic_write_json(os.path.join(ep, "build", "alignment.json"), al)
    return subs


def report(al, subs=None):
    st = al["stats"]
    log(f"covered {st['covered_words']}/{st['script_words']} script words"
        f"{' (PARTIAL)' if al['partial'] else ''}; duration {al['duration']:.1f}s")
    log(f"match rate {st['match_rate'] * 100:.1f}%  (matched {st['matched']}, substituted "
        f"{st['substituted']}, interpolated {st['interpolated']}); refine moved "
        f"{st['refine']['moved_words']} boundaries, gate {st['refine']['gate_db']} dB")
    for d in st["deviations"]:
        log(f"  deviation  #{d['i']} @{d['t']:.2f}s  script „{d['script']}“  heard „{d['heard']}“ ({d['sim']})")
    for d in st["unmatched_script_words"]:
        log(f"  not heard  #{d['i']} @{d['t']:.2f}s  „{d['script']}“")
    for x in st["extra_words"]:
        log(f"  extra      @{x['start']:.2f}s  „{x['text']}“{'  <- AUDIO TAG SPOKEN' if x['tag_spoken'] else ''}")
    for pc in st.get("pause_checks", []):
        log(f"  pause s={pc['pause_s']:g} @{pc['prev_end']:.2f}s: silence {pc['silence']:.2f}s, next cue "
            f"{pc['first_cue_t']:.2f}s  {'OK' if pc['ok'] else 'FAIL'}")
    log(f"cues: {len(al['cues'])} kept, {st['cues_dropped']} dropped; "
        f"sentences {len(al['sentences'])}; subtitles {len(subs) if subs else 0}")


# ------------------------------------------------------------------- manifest mode
def recompute_derived(al):
    """Re-derive cue times, sentence/section times and deviation times from the words."""
    W = al["words"]
    for c in al["cues"]:
        wi = c["word"]
        if c.get("at") == "end":
            c["t"] = W[wi]["end"]
        else:
            c["t"] = W[wi]["start"]
            if wi > 0:
                c["prev_end"] = W[wi - 1]["end"]
    for x in al["sentences"]:
        x["start"], x["end"] = W[x["words"][0]]["start"], W[x["words"][1]]["end"]
    for x in al["sections"]:
        x["t"] = W[x["word"]]["start"]
    for d in al["stats"]["deviations"] + al["stats"]["unmatched_script_words"]:
        d["t"] = W[d["i"]]["start"]


def apply_insertions(al, insertions):
    """Shift the alignment for silences inserted into the audio. Word-index based: every word
    at or after the cue's word moves by the inserted duration (start AND end), the word before
    is clamped to the insertion point, so no word can stretch over an inserted silence."""
    ins = [x for x in insertions if x["dur"] > 0]
    W = al["words"]
    for x in ins:
        if 0 < x["word"] <= len(W):
            wb = W[x["word"] - 1]
            wb["end"] = min(wb["end"], x["at"])
            wb["start"] = min(wb["start"], wb["end"])
        if x["word"] < len(W):
            wa = W[x["word"]]
            wa["start"] = max(wa["start"], x["at"])
            wa["end"] = max(wa["end"], wa["start"])
    for w in W:
        sh = sum(x["dur"] for x in ins if w["i"] >= x["word"])
        w["start"] = round(w["start"] + sh, 3)
        w["end"] = round(w["end"] + sh, 3)
    f = map_time_fn({"insertions": ins})
    for x in al["stats"]["extra_words"] + al["stats"]["tags_spoken"]:
        x["start"], x["end"] = round(f(x["start"]), 3), round(f(x["end"]), 3)
    recompute_derived(al)


def refine_alignment(al, audio, sr):
    """Energy-snap word boundaries on the FINAL audio and re-derive cue/sentence times."""
    wt = [{"s": w["start"], "e": w["end"]} for w in al["words"]]
    moved, thr = refine_times(wt, audio, sr)
    for w, t in zip(al["words"], wt):
        w["start"], w["end"] = round(t["s"], 3), round(t["e"], 3)
    recompute_derived(al)
    al["stats"]["refine"]["moved_words_final"] = moved
    al["stats"]["refine"]["gate_db_final"] = round(float(thr), 1)
    return moved


def check_pauses(al, script, min_pause=2.0, tol=0.3):
    """Self-check: for every [[pause s>=min_pause]] the next word/cue starts >= s - tol after
    the previous word's end. Result goes to stats.pause_checks."""
    W = al["words"]
    res = []
    for c in script["cues"]:
        if c["cue"] != "pause" or _pause_s(c) < min_pause:
            continue
        w = c["word"]
        if w == 0 or w > len(W):
            continue
        prev_end = W[w - 1]["end"]
        if w == len(W):
            nxt = al["duration"]
            cue_ts = []
        else:
            nxt = W[w]["start"]
            cue_ts = [x["t"] for x in al["cues"] if x["word"] == w and x.get("at") == "start"]
        need = _pause_s(c)
        first_cue = min(cue_ts) if cue_ts else nxt
        sub_bad = [s_ for s_ in al.get("subtitles", []) if prev_end + 0.3 < s_["start"] < nxt - 0.05]
        ok = (nxt - prev_end) >= need - tol and (first_cue - prev_end) >= need - tol and not sub_bad
        res.append({"word": w, "pause_s": need, "prev_end": prev_end, "next_start": nxt,
                    "silence": round(nxt - prev_end, 3), "first_cue_t": first_cue, "ok": ok,
                    "line": c["line"]})
        if not ok:
            warn(f"PAUSE CHECK FAILED line {c['line']}: s={need} but next word/cue after "
                 f"{nxt - prev_end:.2f}s / {first_cue - prev_end:.2f}s")
    al["stats"]["pause_checks"] = res
    al["stats"]["pause_checks_ok"] = all(r["ok"] for r in res)
    return res


def map_time_fn(manifest):
    ins = sorted(manifest.get("insertions", []), key=lambda x: x["at"])

    def f(t):
        return t + sum(x["dur"] for x in ins if x["at"] <= t + 1e-9)
    return f


def clip_fn_from_manifest(ep, manifest):
    """clip(t0, t1) in the joined (pre-pause-insertion) timeline -> 16 kHz audio."""
    cache = {}

    def clip(t0, t1):
        for k, p in enumerate(manifest["parts"]):
            L = p["trim_end"] - p["trim_start"]
            if p["offset"] - 0.2 <= t0 < p["offset"] + L:
                if k not in cache:
                    cache[k] = load_audio(os.path.join(ep, p["file"]), SR_ANALYSIS)
                x = cache[k]
                a = int(max(0.0, t0 - p["offset"] + p["trim_start"]) * SR_ANALYSIS)
                b = int(min(p["trim_end"], t1 - p["offset"] + p["trim_start"]) * SR_ANALYSIS)
                return x[a:b].copy() if b > a else None
        return None
    return clip


def parts_from_manifest(ep, script, manifest, model, force=False):
    sw = script["words"]
    ranges = part_script_ranges(ep, sw, len(manifest["parts"]))
    parts = []
    for pi, p in enumerate(manifest["parts"]):
        path = os.path.join(ep, p["file"])
        rng = ranges[pi]
        prompt = prompt_for(sw, rng[0], rng[1]) if rng else prompt_for(sw, 0)
        tr = transcribe(path, ep, model=model, prompt=prompt, force=force)
        rec = []
        for w in tr["words"]:
            s = w["s"] - p["trim_start"]
            e = w["e"] - p["trim_start"]
            L = p["trim_end"] - p["trim_start"]
            if e <= 0 or s >= L:
                continue
            rec.append({"w": w["w"], "s": p["offset"] + max(0.0, s), "e": p["offset"] + min(L, e),
                        "p": w["p"]})
        parts.append({"words": rec, "range": rng, "transcript": tr})
    return parts


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ep")
    ap.add_argument("--audio", help="audio file to align instead of audio/voice.wav")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--retranscribe", action="store_true")
    args = ap.parse_args()
    ep = args.ep.rstrip("/")
    script = parse_script(os.path.join(ep, "script.md"))
    voice = os.path.join(ep, "audio", "voice.wav")
    man_path = os.path.join(ep, "build", "voice-manifest.json")
    audio_path = args.audio or voice
    if not os.path.exists(audio_path):
        sys.exit(f"no audio: {audio_path} (run tools/assemble-audio.py {ep} first, or pass --audio)")
    audio = load_audio(audio_path)
    dur = len(audio) / SR_ANALYSIS
    manifest = None
    if not args.audio and os.path.exists(man_path):
        manifest = json.load(open(man_path, encoding="utf-8"))
        if manifest.get("voice_sha1") != file_sha1(voice):
            warn("voice-manifest.json does not match voice.wav – transcribing voice.wav directly")
            manifest = None
    if manifest:
        parts = parts_from_manifest(ep, script, manifest, args.model, args.retranscribe)
        # pause cues must still match what was inserted
        want = sorted(round(float(c["args"].get("s", 0)), 2) for c in script["cues"]
                      if c["cue"] == "pause" and _pause_s(c) >= 2 and c["word"] <= len(script["words"]))
        have = sorted(round(x["pause_s"], 2) for x in manifest.get("insertions", []))
        if want[:len(have)] != have:
            warn("long [[pause]] cues changed since voice.wav was assembled – re-run tools/assemble-audio.py")
    else:
        sw = script["words"]
        tr = transcribe(audio_path, ep, model=args.model, prompt=prompt_for(sw, 0), force=args.retranscribe)
        ranges = part_script_ranges(ep, sw, 1)
        rng = ranges[0]
        if rng is not None:
            rng = None  # a single arbitrary file: we do not know which parts it covers
        parts = [{"words": tr["words"], "range": rng}]
    if manifest:
        al = align_episode(ep, script, parts, audio=None, duration=dur,
                           clip_fn=clip_fn_from_manifest(ep, manifest), model=args.model)
        apply_insertions(al, manifest.get("insertions", []))
        al["inserted_pauses"] = manifest.get("insertions", [])
        al["parts"] = manifest["parts"]
    else:
        al = align_episode(ep, script, parts, audio=None, duration=dur)
    al["duration"] = round(dur, 3)
    refine_alignment(al, audio, SR_ANALYSIS)
    al["subtitles"] = make_subtitles(al)
    check_pauses(al, script)
    al["audio"] = os.path.relpath(audio_path, ep)
    al["model"] = args.model
    subs = write_outputs(ep, al)
    report(al, subs)


def _pause_s(c):
    try:
        return float(c["args"].get("s", 0))
    except (TypeError, ValueError):
        return 0.0


if __name__ == "__main__":
    main()
