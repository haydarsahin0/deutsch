#!/usr/bin/env python3
"""Assemble the narration of an episode and align it.

Usage:
  python3 tools/assemble-audio.py episodes/<ep> [--max-parts N] [--model NAME] [--gap 0.35]
                                                [--lufs -16] [--retranscribe]

Steps (idempotent – re-run whenever a new audio/teil-N.* arrives):
  1. audio/teil-1..N.{wav,mp3,m4a,flac} in numeric order (stops at the first missing number),
     decoded to 48 kHz mono; leading/trailing silence trimmed conservatively (pre-roll 0.15 s,
     post-roll 0.25 s, so breaths/onsets/tails survive), joined with --gap seconds of silence.
  2. Each part is transcribed with faster-whisper (cached per part hash in build/transcripts/)
     and aligned to the script words that teil-N.txt covers (tools/align.py).
  3. For every [[pause s=X]] with X ≥ 2 real silence is inserted after the last word before the
     cue, so that the silence before the next word is X seconds (only the missing amount).
  4. 50 Hz high-pass + linear gain to --lufs (ffmpeg loudnorm measurement; a gentle limiter
     only if the true peak would exceed −1 dBTP). No dynamics processing otherwise.
  5. Writes (atomically) audio/voice.wav (48 kHz mono s16), build/alignment.json (times
     relative to voice.wav), build/voice-manifest.json, out/subtitles.de.srt|vtt.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import align as A  # noqa: E402

SR = 48000


def log(*a):
    print("[assemble]", *a, file=sys.stderr, flush=True)


def find_parts(ep, max_parts=None):
    adir = os.path.join(ep, "audio")
    found = {}
    for f in os.listdir(adir):
        m = re.fullmatch(r"teil-(\d+)\.(wav|mp3|m4a|flac|ogg)", f)
        if m:
            n = int(m.group(1))
            # prefer wav over compressed if both exist
            if n not in found or f.endswith(".wav"):
                found[n] = os.path.join(adir, f)
    parts = []
    n = 1
    while n in found and (max_parts is None or n <= max_parts):
        parts.append(found[n])
        n += 1
    extra = sorted(k for k in found if k >= n)
    if extra and (max_parts is None or extra[0] <= max_parts):
        log(f"WARNING: teil-{n} missing – ignoring later parts {extra}")
    return parts


def trim_bounds(x, sr):
    db, hop = A.frame_db(x, sr, win=0.020, hop=0.005)
    floor = np.percentile(db, 3)
    speech = np.percentile(db, 95)
    thr = max(floor + 8.0, speech - 48.0)  # low gate: breaths count as signal
    v = np.where(db > thr)[0]
    if len(v) == 0:
        return 0, len(x)
    # ignore isolated clicks: require 30 ms of signal
    def first_run(idx_iter):
        run = 0
        for k in idx_iter:
            if db[k] > thr:
                run += 1
                if run >= 6:
                    return k
            else:
                run = 0
        return None
    f0 = first_run(range(len(db)))
    f1 = first_run(range(len(db) - 1, -1, -1))
    f0 = (f0 - 5) if f0 is not None else v[0]
    f1 = (f1 + 5) if f1 is not None else v[-1]
    s = max(0, int((f0 * hop - 0.15) * sr))
    e = min(len(x), int((f1 * hop + 0.020 + 0.25) * sr))
    return s, e


def fade(x, n_in, n_out):
    if n_in:
        n_in = min(n_in, len(x))
        x[:n_in] *= np.linspace(0, 1, n_in, dtype=np.float32)
    if n_out:
        n_out = min(n_out, len(x))
        x[len(x) - n_out:] *= np.linspace(1, 0, n_out, dtype=np.float32)
    return x


def measure_loudness(x, sr):
    p = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-f", "f32le", "-ar", str(sr), "-ac", "1",
                        "-i", "-", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
                        "-f", "null", "-"], input=x.astype(np.float32).tobytes(),
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    txt = p.stderr.decode("utf-8", "replace")
    j = json.loads(txt[txt.rindex("{"):txt.rindex("}") + 1])
    return float(j["input_i"]), float(j["input_tp"])


def write_wav(path, x, sr, af):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".tmp-", suffix=".wav", dir=os.path.dirname(path))
    os.close(fd)
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1",
                    "-i", "-", "-af", af, "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le",
                    "-map_metadata", "-1", "-fflags", "+bitexact", tmp],
                   input=x.astype(np.float32).tobytes(), check=True)
    os.chmod(tmp, 0o644)
    os.replace(tmp, path)


def shift_alignment(al, f):
    for w in al["words"]:
        w["start"], w["end"] = round(f(w["start"]), 3), round(f(w["end"]), 3)
    for c in al["cues"]:
        c["t"] = round(f(c["t"]), 3)
        if "prev_end" in c:
            c["prev_end"] = round(f(c["prev_end"]), 3)
    for s in al["sentences"]:
        s["start"], s["end"] = round(f(s["start"]), 3), round(f(s["end"]), 3)
    for s in al["sections"]:
        s["t"] = round(f(s["t"]), 3)
    for x in al["stats"]["extra_words"] + al["stats"]["tags_spoken"]:
        x["start"], x["end"] = round(f(x["start"]), 3), round(f(x["end"]), 3)
    for d in al["stats"]["deviations"] + al["stats"]["unmatched_script_words"]:
        d["t"] = round(f(d["t"]), 3)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ep")
    ap.add_argument("--max-parts", type=int)
    ap.add_argument("--model", default=A.DEFAULT_MODEL)
    ap.add_argument("--gap", type=float, default=0.35)
    ap.add_argument("--lufs", type=float, default=-16.0)
    ap.add_argument("--min-pause", type=float, default=2.0)
    ap.add_argument("--retranscribe", action="store_true")
    args = ap.parse_args()
    ep = args.ep.rstrip("/")
    t0 = time.time()
    script = A.parse_script(os.path.join(ep, "script.md"))
    sw = script["words"]
    files = find_parts(ep, args.max_parts)
    if not files:
        sys.exit(f"no audio/teil-1.* in {ep}")
    ranges = A.part_script_ranges(ep, sw, len(files))

    # 1. decode, trim, join
    chunks, man_parts, parts = [], [], []
    offset = 0.0
    for k, path in enumerate(files):
        x = A.load_audio(path, SR)
        s, e = trim_bounds(x, SR)
        y = x[s:e].copy()
        fade(y, int(0.005 * SR) if s > 0 else 0, int(0.030 * SR) if e < len(x) else 0)
        if k:
            chunks.append(np.zeros(int(round(args.gap * SR)), dtype=np.float32))
            offset += round(args.gap * SR) / SR
        mp = {"file": os.path.relpath(path, ep), "sha1": A.file_sha1(path),
              "source_duration": round(len(x) / SR, 3),
              "trim_start": round(s / SR, 4), "trim_end": round(e / SR, 4), "offset": round(offset, 4)}
        man_parts.append(mp)
        log(f"{mp['file']}: {mp['source_duration']:.2f}s, trimmed {mp['trim_start']:.3f}s / "
            f"{mp['source_duration'] - mp['trim_end']:.3f}s, at {offset:.2f}s")
        chunks.append(y)
        offset += len(y) / SR
    joined = np.concatenate(chunks)
    manifest = {"parts": man_parts, "gap": args.gap, "sample_rate": SR}

    # 2. transcribe + align (times in the joined timeline)
    parts = A.parts_from_manifest(ep, script, manifest, args.model, args.retranscribe)
    xrts = [(p["transcript"]["duration"], p["transcript"]["elapsed"]) for p in parts]
    al = A.align_episode(ep, script, parts, audio=joined, sr=SR, duration=len(joined) / SR)
    n_cov = len(al["words"])

    # 3. long pauses
    insertions = []
    db, hop = A.frame_db(joined, SR, win=0.010, hop=0.005)
    for c in script["cues"]:
        if c["cue"] != "pause":
            continue
        try:
            ps = float(c["args"].get("s", 0))
        except (TypeError, ValueError):
            continue
        w = c["word"]
        if ps < args.min_pause or w == 0 or w - 1 >= n_cov:
            continue
        prev_end = al["words"][w - 1]["end"]
        nxt = al["words"][w]["start"] if w < n_cov else len(joined) / SR
        gap = nxt - prev_end
        need = ps - gap
        if w >= n_cov and al["partial"]:
            need = ps - gap  # end of available audio: still give the countdown its silence
        if need <= 0.02:
            insertions.append({"at": prev_end, "dur": 0.0, "pause_s": ps, "word": w, "gap_before": round(gap, 3)})
            continue
        lo, hi = prev_end + 0.08, nxt - 0.08
        if hi > lo:
            f0, f1 = int(lo / hop), int(hi / hop)
            at = (f0 + int(np.argmin(db[f0:f1 + 1]))) * hop + 0.005
        else:
            at = prev_end + max(gap, 0) / 2
        insertions.append({"at": round(at, 4), "dur": round(need, 4), "pause_s": ps, "word": w,
                           "gap_before": round(gap, 3)})
        log(f"pause s={ps:g} after word #{w - 1} „{sw[w - 1]['text']}“ @{prev_end:.2f}s: "
            f"existing gap {gap:.2f}s → insert {need:.2f}s")
    insertions.sort(key=lambda x: x["at"])
    out_chunks, last = [], 0
    for ins in insertions:
        if ins["dur"] <= 0:
            continue
        cut = int(round(ins["at"] * SR))
        seg = joined[last:cut].copy()
        fade(seg, 0, int(0.004 * SR))
        if out_chunks:
            fade(seg, int(0.004 * SR), 0)
        out_chunks.append(seg)
        out_chunks.append(np.zeros(int(round(ins["dur"] * SR)), dtype=np.float32))
        last = cut
    seg = joined[last:].copy()
    if out_chunks:
        fade(seg, int(0.004 * SR), 0)
    out_chunks.append(seg)
    voice = np.concatenate(out_chunks)
    manifest["insertions"] = [x for x in insertions if x["dur"] > 0]
    f = A.map_time_fn(manifest)
    shift_alignment(al, f)
    al["duration"] = round(len(voice) / SR, 3)

    # 4. loudness
    li, tp = measure_loudness(joined, SR)
    gain = args.lufs - li
    af = f"highpass=f=50:poles=2,volume={gain:.2f}dB"
    limited = tp + gain > -1.0
    if limited:
        af += ",alimiter=limit=0.89:attack=3:release=60:level=false"
    manifest["loudness"] = {"input_lufs": li, "input_true_peak": tp, "gain_db": round(gain, 2),
                            "limiter": limited, "target_lufs": args.lufs}
    log(f"loudness {li:.1f} LUFS (TP {tp:.1f}) → gain {gain:+.2f} dB{' + limiter' if limited else ''}")
    vpath = os.path.join(ep, "audio", "voice.wav")
    write_wav(vpath, voice, SR, af)
    manifest["voice_sha1"] = A.file_sha1(vpath)
    manifest["duration"] = al["duration"]

    # 5. outputs
    al["audio"] = "audio/voice.wav"
    al["model"] = args.model
    al["parts"] = man_parts
    al["inserted_pauses"] = manifest["insertions"]
    tot_d = sum(d for d, _ in xrts)
    tot_e = sum(e for _, e in xrts)
    al["stats"]["transcription"] = {"model": args.model, "audio_s": round(tot_d, 1),
                                    "elapsed_s": round(tot_e, 1),
                                    "xrt": round(tot_e / max(tot_d, 1e-6), 3),
                                    "note": "elapsed from cache creation time"}
    subs = A.write_outputs(ep, al)
    A.atomic_write_json(os.path.join(ep, "build", "voice-manifest.json"), manifest, indent=1)
    A.report(al, subs)
    log(f"wrote {vpath} ({al['duration']:.2f}s), build/alignment.json, out/subtitles.de.srt|vtt "
        f"in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
