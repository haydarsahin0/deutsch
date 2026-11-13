#!/usr/bin/env node
// Usage: node tools/timeline.js episodes/<ep> [--alignment file] [--envelope file] [--to seconds]
// Compiles build/alignment.json (+ script.md sections, build/envelope.json) into
// build/timeline.json (and build/timeline.js = `window.TIMELINE = {...}` for the file:// player).
// All times in seconds. Unknown cues → warning, never a crash. Partial audio → everything after the
// end of the audio is dropped (partial build). Quiz `answer` is 0-based.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const Script = require('../engine/lib/script.js');

const KNOWN = new Set(['scene', 'camera', 'melo', 'draw', 'next', 'strike', 'highlight', 'tick', 'erase', 'quiz',
  'reveal', 'voice', 'pause', 'sfx', 'shot', 'cast', 'say', 'prop', 'fx', 'pin', 'cards']);
const SHOT_TYPES = new Set(['scene', 'text', 'split', 'board', 'list', 'map', 'chapter', 'melo', 'quiz', 'cards']);
const MELO_MODES = /^(off|corner-left|corner-right|side-left|side-right|in-scene(:[\w-]+)?|walk-in(-left|-right)?|peek(-left|-right)?|medium)$/;
const IN_DUR = { cut: 0, ink: 0.6, whip: 0.35, slide: 0.45, zoom: 0.45, flash: 0.12 };
const FX = new Set(['shake', 'flash', 'zoom-punch', 'sweat', 'steam', 'hearts', 'question-marks', 'sparkle', 'record-scratch']);
const DRAW_TYPES = new Set(['title', 'wrong', 'right', 'word', 'sentence', 'note', 'bubble', 'list', 'icon']);
const LAYOUTS = new Set(['board', 'melo', 'split', 'title']);

// ── word cards (`[[cards id=.. text="…"]]`, see docs/PIPELINE.md "Word cards") ──
// rows split by " | ", cards by spaces; "a+b" = cards that touch (no gap). Per card:
//   grey:word / blue: / red: / green: / ink: / mustard: = coloured card (no brackets: cue args can't hold "]"), *word* = VERB (red, glowing), !word = ink badge,
//   #word = card in the strip's accent colour, ___ = empty slot, "_" inside a word = space,
//   suffix @N = small position number under the card, suffix ~key = identity for morphs (default: text + occurrence).
const CARD_COLORS = new Set(['grey', 'gray', 'blue', 'red', 'green', 'ink', 'mustard', 'paper']);
function parseCards(text) {
  const seen = {};
  return String(text || '').split(/\s*\|\s*/).map(row => row.trim()).filter(Boolean).map(row => {
    const out = [];
    row.split(/\s+/).filter(Boolean).forEach(tok => {
      const parts = tok.length > 1 ? tok.split(/\+(?=.)/) : [tok];
      parts.forEach((raw, pi) => {
        let x = raw, key = null, num = null, color = null, kind = 'plain';
        let m = x.match(/~([\w-]+)$/); if (m) { key = m[1]; x = x.slice(0, m.index); }
        m = x.match(/@([^@\s]{1,6})$/); if (m) { num = m[1]; x = x.slice(0, m.index); }
        m = x.match(/^([a-z]+):(?=.)/); if (m && CARD_COLORS.has(m[1])) { color = m[1] === 'gray' ? 'grey' : m[1]; x = x.slice(m[0].length); kind = 'color'; }
        if (/^\*.+\*$/.test(x)) { kind = 'verb'; x = x.slice(1, -1); }
        else if (x[0] === '!' && x.length > 1) { kind = 'badge'; x = x.slice(1); }
        else if (x[0] === '#' && x.length > 1) { kind = 'accent'; x = x.slice(1); }
        if (/^_+$/.test(x)) { kind = 'slot'; x = '   '; }
        else x = x.replace(/_/g, ' ');
        const base = x.toLowerCase().replace(/[^\p{L}\p{N}=]+/gu, '') || x;
        if (!key) { seen[base] = (seen[base] || 0) + 1; key = base + '#' + seen[base]; }
        out.push({ key, text: x, kind, color, num, joinPrev: pi > 0 });
      });
    });
    return out;
  });
}
const SHOTS = new Set(['wide', 'melo', 'board', 'close']);
const DEFAULT_SHOT = { board: 'board', melo: 'melo', split: 'wide', title: 'wide' };

const ERASE_DUR = 1.0;       // board wipe between scenes
const ERASE_LEAD = 0.35;     // wipe starts this long before the scene cue
const INK_DUR = 0.6;         // ink-brush wipe to/from title cards
const ELEM_ERASE_DUR = 0.6;  // [[erase id=..]]
const STRIKE_DELAY = 0.6;

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : def;
}
const warn = (...a) => console.warn('  ⚠ timeline:', ...a);
const r3 = x => Math.round(x * 1000) / 1000;

function probeDuration(file) {
  try {
    return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
  } catch (e) { return null; }
}

function findAudio(ep) {
  const a = path.join(ep, 'audio');
  for (const f of ['voice.wav', 'voice.flac', 'voice.mp3']) if (fs.existsSync(path.join(a, f))) return path.join(a, f);
  if (!fs.existsSync(a)) return null;
  const parts = fs.readdirSync(a).filter(f => /^teil-\d+\.(wav|mp3|flac)$/i.test(f)).sort((x, y) => parseInt(x.match(/\d+/)[0]) - parseInt(y.match(/\d+/)[0]));
  return parts.length ? path.join(a, parts[0]) : null;
}

function writeDur(text) {
  const n = String(text || '').length;
  return Math.min(2.2, Math.max(0.5, 0.25 + n * 0.05));
}

// ── subtitles: chunk words into cues of max 2 lines × 42 chars, split at sentence/clause ends
function buildSubs(words, maxChars = 42) {
  const subs = [];
  let cur = [];
  const len = ws => ws.map(w => w.text).join(' ').length;
  const flush = () => {
    if (!cur.length) return;
    subs.push({ start: cur[0].start, end: cur[cur.length - 1].end, words: cur.map(w => w.i) });
    cur = [];
  };
  for (let k = 0; k < words.length; k++) {
    const w = words[k], prev = cur[cur.length - 1];
    if (prev && (w.start - prev.end > 1.1 || len(cur.concat([w])) > maxChars * 2 - 4 || w.end - cur[0].start > 7)) flush();
    cur.push(w);
    const t = w.text, L = len(cur);
    const sentenceEnd = /[.!?…]["“”»«‘’]*$/.test(t);
    const clauseEnd = /[,;:–—]["“”»«]?$/.test(t) || (words[k + 1] && /^[–—]$/.test(words[k + 1].text));
    if (sentenceEnd && (L > 18 || (words[k + 1] && words[k + 1].start - w.end > 0.5))) flush();
    else if (clauseEnd && L > 44) flush();
  }
  flush();
  // split into balanced lines, set display window (min 1 s, extend a little into silence)
  for (let i = 0; i < subs.length; i++) {
    const s = subs[i], ws = s.words.map(i2 => words[i2]);
    const full = ws.map(w => w.text).join(' ');
    if (full.length > maxChars) {
      let best = 1, bestScore = 1e9;
      for (let b = 1; b < ws.length; b++) {
        const a = ws.slice(0, b).map(w => w.text).join(' ').length, c = full.length - a - 1;
        let score = Math.abs(a - c) + (Math.max(a, c) > maxChars ? 1000 : 0);
        if (/[,;:.!?]["“”]?$/.test(ws[b - 1].text)) score -= 6;
        if (score < bestScore) { bestScore = score; best = b; }
      }
      s.lines = [s.words.slice(0, best), s.words.slice(best)];
    } else s.lines = [s.words];
    s.lines = s.lines.map(l => l.map(i2 => ({ text: (words[i2].raw || words[i2].text), w: i2 })));
    const next = subs[i + 1];
    s.end = Math.max(s.end + 0.35, s.start + 1.0);
    if (next) s.end = Math.min(s.end, next.start - 0.02);
    s.start = r3(Math.max(0, s.start - 0.08)); s.end = r3(s.end);
  }
  return subs;
}

// alignment.subtitles [{start,end,lines:[str],words:[i,j]}] → [{start,end,lines:[[{text,w}]]}]
// (w = word index for karaoke highlighting; punctuation-only tokens such as "–" get w = null)
function subsFromAlignment(subs, words, duration) {
  const out = [];
  for (const s of subs) {
    if (s.start > duration) continue;
    let wi = s.words ? s.words[0] : null;
    const lines = (s.lines || []).map(line => line.split(/\s+/).filter(Boolean).map(tok => {
      const isW = /[\p{L}\p{N}]/u.test(tok);
      const o = { text: tok, w: isW && wi != null && (!s.words || wi <= s.words[1]) ? wi : null };
      if (isW && wi != null) wi++;
      return o;
    }));
    out.push({ start: r3(s.start), end: r3(Math.min(s.end, duration)), lines });
  }
  return out;
}

function compile(ep, opts = {}) {
  const build = path.join(ep, 'build');
  fs.mkdirSync(build, { recursive: true });
  let alPath = opts.alignment || arg('alignment');
  if (!alPath) alPath = path.join(build, 'alignment.json');
  if (!fs.existsSync(alPath)) {
    const dev = path.join(__dirname, '..', 'engine', 'dev', 'alignment.json');
    if (fs.existsSync(dev)) { warn('no build/alignment.json – using DEV alignment', path.relative(process.cwd(), dev)); alPath = dev; }
    else throw new Error('no alignment found (build/alignment.json). Run tools/align.py first.');
  }
  const AL = JSON.parse(fs.readFileSync(alPath, 'utf8'));
  const scriptPath = opts.script || arg('script') || path.join(ep, 'script.md');
  const words = (AL.words || []).map((w, i) => ({ i: w.i != null ? w.i : i, text: w.text, start: +w.start, end: +w.end }));
  let audio = AL.source && fs.existsSync(AL.source) ? AL.source : (AL.audio && fs.existsSync(path.join(ep, AL.audio)) ? path.join(ep, AL.audio) : findAudio(ep));
  if (AL.source && !fs.existsSync(AL.source) && fs.existsSync(path.join(ep, AL.source))) audio = path.join(ep, AL.source);
  const audioDur = audio ? probeDuration(audio) : null;
  let duration = Math.min(AL.duration || Infinity, audioDur || Infinity);
  if (!isFinite(duration)) duration = words.length ? words[words.length - 1].end + 1 : 10;
  const toArg = parseFloat(opts.to || arg('to'));
  if (isFinite(toArg)) duration = Math.min(duration, toArg);

  // script sections → chapters (cue order in script = cue order in alignment)
  let sections = [];
  let scriptCues = [];
  if (fs.existsSync(scriptPath)) {
    const P = Script.parse(fs.readFileSync(scriptPath, 'utf8'));
    sections = P.sections; scriptCues = P.cues;
  }

  let alCues = AL.cues || [];
  // re-cue: the spoken words never change, so cue times can be recomputed from script.md word indices
  // (the visual director can edit cues without re-running the aligner)
  if (fs.existsSync(scriptPath) && opts.recue !== false && !process.argv.includes('--no-recue')) {
    const P = Script.parse(fs.readFileSync(scriptPath, 'utf8'));
    const same = P.words.length >= words.length && words.every((w, i) => Script.norm(w.text) === Script.norm(P.words[i].text));
    if (same) {
      const full = P.words.length === words.length;
      alCues = P.cues.filter(c => c.word < words.length || (full && c.word === words.length)).map(c => {
        const w = words[c.word];
        const prevEnd = c.word > 0 ? words[c.word - 1].end : 0;
        return { cue: c.cue, args: c.args, word: c.word, t: w ? w.start : words[words.length - 1].end, prev_end: prevEnd };
      });
    } else warn('script.md words differ from alignment words – using alignment cues (re-run tools/align.py)');
  }
  const cues = alCues.map((c, k) => ({ ...c, args: c.args || {}, k })).filter(c => isFinite(c.t));
  // stable sort by time (keep script order for equal times)
  cues.sort((a, b) => a.t - b.t || a.k - b.k);
  const dropped = cues.filter(c => c.t > duration).length;
  const live = cues.filter(c => c.t <= duration);
  if (dropped) console.log(`  timeline: partial build – ${dropped} cues after ${duration.toFixed(1)} s dropped`);

  const wordStartAfter = (t) => { const w = words.find(w => w.start >= t - 1e-6); return w ? w.start : null; };

  const scenes = [], elements = [], camera = [], melo = [], warnings = [];
  const byId = new Map();
  let scene = null, autoId = 0, lastDrawStart = -1;

  function newScene(c, spec) {
    spec = spec || {};
    const layout = spec.layout || (LAYOUTS.has(c.args.layout) ? c.args.layout : (warn(`unknown layout "${c.args.layout}" → board`), 'board'));
    const prev = scene;
    const t = c.t;
    const sc = { i: scenes.length, type: spec.type || (layout === 'title' ? 'title' : 'board'), layout, start: t, end: null, transition: 'cut', tStart: t, tEnd: t, contentStart: t,
      melo: spec.melo || (layout === 'title' ? 'title' : 'legacy-' + layout), args: spec.args || c.args, word: c.word,
      cast: [], castCues: [], says: [], props: [], fx: [], pins: [] };
    if (spec.type) {
      // v2 shot: explicit transition (default cut); board → board with chalk on it still gets the eraser
      sc.isShot = true;
      let tin = String(c.args.in || 'cut');
      if (!(tin in IN_DUR)) { warn(`shot: unknown transition in=${tin} → cut`); tin = 'cut'; }
      const prevAlive = prev ? elements.filter(e => e.scene === prev.i && (e.erase == null || e.erase > t)) : [];
      if (prev && prev.type === 'board' && sc.type === 'board' && prevAlive.length && !c.args.in) tin = 'erase';
      sc.transition = tin;
      if (prev) {
        prev.end = t;
        if (tin === 'erase') { sc.tStart = Math.max(prev.start + 0.3, t - ERASE_LEAD); sc.tEnd = sc.tStart + ERASE_DUR; sc.contentStart = sc.tEnd - 0.1; }
        else { sc.tStart = t; sc.tEnd = t + IN_DUR[tin]; sc.contentStart = t + IN_DUR[tin] * 0.6; }
        for (const e of prevAlive) {
          if (tin === 'erase') { if (e.erase == null || e.erase > sc.tStart) { e.erase = sc.tStart; e.eraseBy = 'scene'; } }
          else if (e.erase == null || e.erase > sc.tEnd) { e.erase = sc.tEnd; e.eraseBy = 'ink'; }
        }
      }
      sc.start = sc.tStart;
      scenes.push(sc); scene = sc; lastDrawStart = -1;
      return sc;
    }
    if (prev) {
      prev.end = t;
      const prevAlive = elements.filter(e => e.scene === prev.i && (e.erase == null || e.erase > t - ERASE_LEAD));
      if (prev.layout === 'title' || layout === 'title' || prev.isShot) {
        sc.transition = 'ink'; sc.tStart = Math.max(prev.start + 0.2, t - INK_DUR * 0.5); sc.tEnd = sc.tStart + INK_DUR;
        sc.contentStart = sc.tStart + INK_DUR * 0.6;
      } else if (prevAlive.length) {
        sc.transition = 'erase'; sc.tStart = Math.max(prev.start + 0.3, t - ERASE_LEAD); sc.tEnd = sc.tStart + ERASE_DUR;
        sc.contentStart = sc.tEnd - 0.1;
      } else { sc.transition = 'move'; sc.tStart = t; sc.tEnd = t + 0.9; sc.contentStart = t + 0.2; }
      for (const e of prevAlive) {
        if (sc.transition === 'ink') { if (e.erase == null || e.erase > sc.tEnd) { e.erase = sc.tEnd; e.eraseBy = 'ink'; } }
        else if (e.erase == null || e.erase > sc.tStart) { e.erase = sc.tStart; e.eraseBy = 'scene'; }
      }
    }
    sc.start = sc.tStart;
    scenes.push(sc); scene = sc; lastDrawStart = -1;
    return sc;
  }

  function addElement(c, type, extra) {
    if (!scene) newScene({ t: 0, args: { layout: 'board' } });
    let id = c.args.id || `${type}${++autoId}`;
    if (byId.has(id)) { warn(`duplicate element id "${id}" – renamed`); id = id + '_' + (++autoId); }
    const start = Math.max(c.t, scene.contentStart, lastDrawStart + 0.4);
    lastDrawStart = start;
    const el = { id, type, scene: scene.i, layout: scene.layout, args: c.args, appear: r3(start), cueT: r3(c.t),
      erase: null, strike: null, tick: null, highlight: null, ...extra };
    elements.push(el); byId.set(id, el);
    return el;
  }

  const quotes = [];
  const shotById = new Map();
  // time each token of an on-screen text to where it is spoken (within the next ~60 words), else stagger
  function timeTokens(text, c, minT) {
    const toks = String(text).split(/\s+/).filter(Boolean);
    const out = [];
    let wi = Math.max(0, (c.word || 0) - 2), prevT = minT;
    for (const tok of toks) {
      const n = Script.norm(tok);
      let found = null;
      if (n) for (let j = wi; j < Math.min(words.length, wi + 60); j++) if (Script.norm(words[j].text) === n) { found = j; break; }
      if (found != null && words[found].start + 0.05 >= minT - 1.5 && words[found].start <= minT + 4) {
        const t = Math.max(words[found].start - 0.05, prevT);
        out.push({ text: tok, t: r3(t), end: r3(words[found].end), w: found, matched: true });
        wi = found + 1; prevT = t;
      } else {
        const t = prevT + (out.length ? 0.18 : 0);
        out.push({ text: tok, t: r3(t), end: r3(t + 0.3), w: null, matched: false });
        prevT = t;
      }
    }
    return out;
  }
  const listMatch = (el, c) => { // stagger=auto: time each list item to where its words are spoken
    const items = el.items;
    let wi = Math.max(0, c.word || 0);
    let prevT = el.appear;
    for (let k = 0; k < items.length; k++) {
      const toks = items[k].text.split(/\s+/).map(Script.norm).filter(Boolean).slice(0, 3);
      let found = null;
      for (let j = wi; j < Math.min(words.length, wi + 90) && toks.length; j++) {
        let ok = true;
        for (let q = 0; q < Math.min(2, toks.length); q++) if (!words[j + q] || Script.norm(words[j + q].text) !== toks[q]) { ok = false; break; }
        if (ok) { found = j; break; }
      }
      let t = found != null ? words[found].start - 0.15 : prevT + 1.3;
      t = Math.max(t, prevT + (k ? 0.45 : 0));
      items[k].t = r3(t); prevT = t;
      if (found != null) wi = found + toks.length;
    }
  };

  // ── readability rules (global): minimum shot lengths, text fully visible before the cut ──
  // A shot that would start too early is DELAYED (narration keeps running over the held shot) and its
  // early elements snap to its new start; a shot that cannot fit before its own next anchor is merged away
  // (text cards give way to scenes).
  function wordsOn(sc) {
    const n = x => String(x || '').split(/[\s|]+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
    if (sc.type === 'text') return (sc.tokens ? sc.tokens.length : n(sc.args.text)) + n(sc.args.sub);
    if (sc.type === 'split') return n(sc.args.left) + n(sc.args.right);
    if (sc.type === 'list') return n(sc.args.title) + elements.filter(e => e.scene === sc.i).reduce((k, e) => k + (e.items ? e.items.reduce((q, it) => q + n(it.text), 0) : n(e.text)), 0);
    return 0;
  }
  function minDur(sc) {
    if (!sc.isShot) return 0;
    switch (sc.type) {
      case 'chapter': return 2.8;
      case 'text': case 'split': case 'list': return Math.max(2.0, 0.35 * wordsOn(sc) + 0.8);
      case 'scene': case 'board': case 'map': case 'cards': return 2.0;
      case 'melo': return 1.5;
      default: return 0;
    }
  }
  // earliest moment the shot's own text is complete (kinetic words / split sides) → must stay ≥1.0–1.6 s
  function readyAt(sc) {
    const c0 = sc.contentStart != null ? sc.contentStart : sc.tStart;
    if (sc.type === 'chapter') return c0 + 0.5 + 1.6;
    if (sc.type === 'text' && sc.tokens && sc.tokens.length) {
      const last = Math.min(...[sc.tokens[sc.tokens.length - 1].t, c0 + 0.12 + 0.24 * (sc.tokens.length - 1)]);
      return last + 0.3 + 1.0 + (sc.args.sub ? 0.3 : 0) + (sc.args.style === 'wrong' || sc.args.style === 'right' ? 0.8 : 0);
    }
    if (sc.type === 'split') return Math.min(sc.rightT || c0 + 2, c0 + 1.2) + 0.4 + 1.2;
    return c0;
  }
  function shiftShot(sc, nt) {
    const d = nt - sc.tStart; if (d <= 0) return;
    const old = sc.tStart, inDur = sc.tEnd - sc.tStart;
    sc.tStart = r3(nt); sc.start = sc.tStart; sc.tEnd = r3(nt + inDur); sc.contentStart = r3(Math.max(sc.contentStart, nt + inDur * 0.6));
    const snap = (t, i) => r3(Math.max(t, sc.contentStart + (i || 0) * 0.12));
    if (sc.tokens) sc.tokens.forEach((k, i) => { if (k.t < sc.contentStart + 0.12 + i * 0.24) k.t = r3(sc.contentStart + 0.12 + i * 0.24); });
    if (sc.leftT != null) sc.leftT = snap(sc.leftT); if (sc.rightT != null) sc.rightT = r3(Math.max(sc.rightT, sc.leftT + 0.8));
    if (sc.strikeT != null) sc.strikeT = snap(sc.strikeT); if (sc.tickT != null) sc.tickT = snap(sc.tickT);
    ['castCues', 'says', 'props', 'fx', 'pins', 'cams'].forEach(k => (sc[k] || []).forEach((x, i) => { if (x.t < sc.contentStart) x.t = snap(x.t, k === 'props' ? i : 0); }));
    (sc.strips || []).forEach(st => st.states.forEach(x => { if (x.t < sc.contentStart && !x.static) x.t = snap(x.t); (x.cards || []).forEach(r => r.forEach(cd => { if (cd.t != null && cd.t < x.t) cd.t = x.t; })); }));
    for (const e of elements) if (e.scene === sc.i) {
      if (e.appear < sc.contentStart) { const dd = sc.contentStart - e.appear; e.appear = r3(sc.contentStart); ['strike', 'tick', 'highlight'].forEach(k => { if (e[k] != null) e[k] = r3(e[k] + dd); }); }
      if (e.items) e.items.forEach(it => { if (it.t != null && it.t < e.appear) it.t = e.appear; });
    }
    for (const k of camera) if (k.t >= old - 0.05 && k.t < nt) k.t = r3(nt);
    sc.delayed = r3((sc.delayed || 0) + d);
  }
  function enforceReadability() {
    const order = scenes.filter(x => !x.dropped);
    let extended = 0, merged = 0;
    const prio = sc => sc.type === 'chapter' ? 4 : sc.type === 'scene' ? 3 : sc.type === 'board' || sc.type === 'quiz' || sc.type === 'map' ? 2 : sc.type === 'melo' ? 1.5 : 1;
    const droppable = sc => sc.type !== 'chapter' && sc.type !== 'quiz' && !elements.some(e => e.scene === sc.i && e.type === 'quiz');
    // delay order[k] to t; if it then gets too short, cascade into the following shots (max 3 deep)
    function cascade(k, t, depth) {
      const sc = order[k]; if (!sc || sc.tStart >= t - 1e-3) return true;
      if (!sc.isShot) return false;
      const after = order[k + 1], limit = (after ? after.tStart : duration) - minDur(sc);
      if (t <= limit) { shiftShot(sc, t); return true; }
      if (depth < 3 && after && after.isShot && cascade(k + 1, t + minDur(sc), depth + 1)) { shiftShot(sc, t); return true; }
      return false;
    }
    for (let i = 0; i + 1 < order.length; i++) {
      const cur = order[i], nxt = order[i + 1];
      if (!cur.isShot || !nxt.isShot) continue;
      const need = Math.max(cur.tStart + minDur(cur), readyAt(cur));
      if (nxt.tStart >= need - 1e-3) continue;
      if (cascade(i + 1, need, 0)) { extended++; continue; }
      // relaxed: at least 2 s (or the text just readable)
      const relaxed = Math.max(cur.tStart + Math.min(minDur(cur), 2.0), cur.type === 'text' ? readyAt(cur) - 0.5 : 0);
      if (relaxed <= nxt.tStart + 1e-3) continue;
      if (cascade(i + 1, relaxed, 0)) { extended++; continue; }
      if (prio(nxt) <= prio(cur) && droppable(nxt)) { nxt.dropped = true; merged++; order.splice(i + 1, 1); i--; continue; }
      if (droppable(cur) && i > 0) { cur.dropped = true; merged++; order.splice(i, 1); i = Math.max(-1, i - 2); continue; }
    }
    // ends + elements of dropped shots, erase times follow the (new) cut
    const live2 = scenes.filter(x => !x.dropped);
    live2.forEach((sc, k) => { sc.end = k + 1 < live2.length ? live2[k + 1].tStart : duration; });
    for (const sc of scenes) if (sc.dropped) { const nx = live2.find(x => x.tStart >= sc.tStart) || live2[live2.length - 1]; sc.tStart = sc.start = sc.tEnd = sc.contentStart = nx.tStart; sc.end = nx.tStart; }
    for (const e of elements) {
      const sc = scenes[e.scene];
      if (sc.dropped) { e.dropped = true; continue; }
      if (e.eraseBy === 'scene' || e.eraseBy === 'ink') {
        const k = live2.indexOf(sc), nx = live2[k + 1];
        if (nx) e.erase = r3(e.eraseBy === 'scene' ? nx.tStart : nx.tEnd);
      }
    }
    const lens = live2.map(x => x.end - x.tStart);
    return { extended, merged, shots: live2.length, min: r3(Math.min(...lens)), avg: r3(lens.reduce((a, b) => a + b, 0) / lens.length) };
  }

  for (const c of live) {
    const a = c.args;
    switch (c.cue) {
      case 'scene': newScene(c); break;
      case 'shot': {
        let type = a.type;
        if (!SHOT_TYPES.has(type)) { warn(`unknown shot type "${type}" → scene`); type = 'scene'; }
        if (type === 'melo' && a.bg === 'board') { type = 'board'; a.melo = a.melo || 'side-left'; a.framing = a.framing || 'wide'; }
        let mm = a.melo || (type === 'melo' ? 'medium' : type === 'board' ? 'side-left' : type === 'chapter' ? 'off' : 'off');
        if (!MELO_MODES.test(mm)) { warn(`shot: unknown melo mode "${mm}" → off`); mm = 'off'; }
        if (type === 'board' && a.framing) mm = a.melo || 'side-left';
        const sc = newScene(c, { type, layout: type === 'board' || type === 'quiz' ? 'board' : type, melo: mm, args: a });
        sc.cams = [];
        if (a.id) { if (byId.has(a.id)) warn(`duplicate id "${a.id}" on shot`); shotById.set(a.id, sc); }
        if (type === 'board' && a.framing === 'wide') camera.push({ t: r3(sc.tStart), shot: 'wide', focus: null });
        if (type === 'scene' || type === 'melo') {
          sc.set = a.set || (type === 'melo' ? null : 'paper');
          sc.cast = String(a.cast || '').split(',').map(x => x.trim()).filter(Boolean).map(x => {
            const [id, slot, expr, pose] = x.split(':').map(y => y && y.trim());
            return { id, slot: slot || 'center', expr: expr || null, pose: pose || null };
          });
        }
        if (type === 'text') {
          // style=stack: lines separated by "|"; tokens remember their line
          const lines = String(a.text || '').split('|').map(x => x.trim()).filter(Boolean);
          sc.tokens = timeTokens(lines.join(' '), c, sc.contentStart);
          let k = 0; lines.forEach((ln, li) => ln.split(/\s+/).filter(Boolean).forEach(() => { if (sc.tokens[k]) sc.tokens[k].line = li; k++; }));
          sc.lineCount = lines.length;
          const last = sc.tokens.length ? sc.tokens[sc.tokens.length - 1].t : sc.contentStart;
          if (a.style === 'wrong' && a.strike !== 'manual') sc.strikeT = r3(last + 0.7);
          if (a.style === 'right') sc.tickT = r3(last + 0.5);
        }
        if (type === 'split') {
          sc.leftT = r3(sc.contentStart + 0.1);
          const rt = timeTokens(String(a.right || ''), c, sc.contentStart + 0.8);
          sc.rightT = r3(Math.max(sc.leftT + 0.8, rt.length && rt[0].matched ? rt[0].t - 0.1 : sc.leftT + 2.2));
        }
        if (type === 'chapter') { sc.num = a.num != null ? a.num : null; sc.title = a.title || ''; }
        break;
      }
      case 'cast': {
        if (!scene) break;
        scene.castCues.push({ t: r3(c.t), id: a.id, expr: a.expr || null, pose: a.pose || null, talk: a.talk || null, flip: a.flip || null });
        if (!scene.cast.some(m => m.id === a.id)) warn(`cast: "${a.id}" is not in the current shot's cast`);
        break;
      }
      case 'say': {
        if (!scene) break;
        const toks = timeTokens(String(a.text || ''), c, c.t);
        const m = toks.filter(x => x.matched);
        const q = { t: r3(c.t), who: a.who || 'melo', text: String(a.text || ''), id: a.id || null,
          start: m.length ? m[0].t : r3(c.t), end: m.length ? m[m.length - 1].end : r3(c.t + 0.3 * toks.length),
          w0: m.length ? m[0].w : null, w1: m.length ? m[m.length - 1].w : null };
        scene.says.push(q); quotes.push(q);
        break;
      }
      case 'prop': {
        if (!scene) break;
        // anim=none: already in place (fully drawn) when the shot starts (e.g. the first/last frame of a loop)
        const still = a.anim === 'none';
        scene.props.push({ t: still ? r3(scene.tStart - 5) : r3(c.t), id: a.id || 'prop' + (++autoId), name: a.name || 'question', at: a.at || 'center', anim: a.anim || 'pop', scale: parseFloat(a.scale) || 1 });
        break;
      }
      case 'fx': {
        if (!scene) break;
        if (!FX.has(a.name)) warn(`fx: unknown effect "${a.name}"`);
        scene.fx.push({ t: r3(c.t), name: a.name, who: a.who || null, dur: parseFloat(a.dur) || null });
        break;
      }
      case 'pin': {
        if (!scene) break;
        scene.pins.push({ t: r3(c.t), id: a.id || 'pin' + (++autoId), at: a.at || '', text: a.text || a.at || '' });
        break;
      }
      case 'cards': {
        // word-card strip in the current shot; the same id again = new state (cards morph, the verb card jumps)
        if (!scene) break;
        scene.strips = scene.strips || [];
        const id = a.id || 'cards';
        let st = scene.strips.find(x => x.id === id);
        const prev = st ? st.states[st.states.length - 1] : null;
        if (!st) { st = { id, states: [] }; scene.strips.push(st); }
        const inherit = ['x', 'y', 'size', 'band', 'accent', 'maxw', 'align', 'stair', 'gap', 'label', 'labelColor'];
        const S = {};
        inherit.forEach(k => { if (a[k] != null) S[k] = a[k]; else if (prev && prev[k] != null) S[k] = prev[k]; });
        if (S.label === '' || S.label === 'none') delete S.label;
        const text = a.text != null ? String(a.text) : (prev ? prev.text : '');
        S.text = text;
        S.cards = parseCards(text);
        S.t = r3(c.t);
        // in=none: the state is already complete at the shot start (loop first frame)
        if (!prev && a.in === 'none') { S.t = r3(scene.tStart - 2); S.static = true; }
        S.mark = a.mark != null ? (a.mark === 'none' ? null : a.mark) : (prev && a.text == null ? prev.mark : null);
        S.markT = S.mark ? (prev && prev.mark === S.mark && a.mark == null ? prev.markT : S.static ? S.t : r3(S.t + (parseFloat(a.markDelay) || 0))) : null;
        if (a.join != null) S.join = a.join === 'none' ? null : a.join; else if (prev && a.text == null) S.join = prev.join;
        // card appear times: sync=words → each new card pops in when its word is spoken; else quick stagger
        const flat = [].concat(...S.cards);
        const old = new Map(prev ? [].concat(...prev.cards).map(cd => [cd.key, cd]) : []);
        const sync = a.sync === 'words';
        const tt = sync ? timeTokens(flat.map(cd => cd.text.replace(/\s+/g, '')).join(' '), c, S.t) : null;
        let k = 0;
        flat.forEach((cd, i) => {
          const o = old.get(cd.key);
          if (o && o.t != null) { cd.t = o.t; return; }
          if (S.static) { cd.t = S.t; return; }
          cd.t = sync ? r3(Math.max(S.t, tt[i].t)) : r3(S.t + (prev ? 0.12 : 0) + 0.07 * k);
          k++;
        });
        st.states.push(S);
        break;
      }
      case 'camera': {
        if (scene && scene.isShot && scene.type !== 'board' && scene.type !== 'quiz') {
          // camera moves inside an illustrated shot (push/tilt/pan aimed at a character or anchor)
          scene.cams.push({ t: r3(c.t), shot: a.shot || 'push', focus: a.focus || null });
          break;
        }
        const shot = SHOTS.has(a.shot) ? a.shot : (a.focus ? 'close' : (warn(`unknown camera shot "${a.shot}" → wide`), 'wide'));
        camera.push({ t: r3(c.t), shot, focus: a.focus || null });
        break;
      }
      case 'melo': melo.push({ t: r3(c.t), args: a }); break;
      case 'draw': {
        const type = DRAW_TYPES.has(a.type) ? a.type : null;
        if (!type) { warn(`unknown draw type "${a.type}" – drawn as note`); }
        const T = type || 'note';
        const extra = {};
        if (T === 'list') {
          const items = String(a.items || '').split('|').map(s => s.trim()).filter(Boolean);
          extra.items = items.map(text => ({ text, t: null }));
          extra.stagger = a.stagger || null;
          extra.nextCount = 0;
        }
        if (T === 'word') extra.text = `${a.article || ''} ${a.word || ''}`.trim();
        else extra.text = a.text != null ? a.text : (T === 'icon' ? a.name : '');
        const el = addElement(c, T, extra);
        el.writeDur = r3(T === 'icon' ? 1.1 : T === 'list' ? 0 : writeDur(el.text));
        if (T === 'wrong' && a.strike !== 'manual') el.strike = r3(el.appear + el.writeDur + STRIKE_DELAY);
        if (T === 'right') el.tick = r3(el.appear + el.writeDur + 0.15);
        if (T === 'sentence' && a.highlight) el.highlight = r3(el.appear + el.writeDur + 0.1);
        if (T === 'list') {
          if (a.stagger === 'auto') listMatch(el, c);
          else el.items.forEach((it, k) => { it.t = null; });
          el.writeDur = 0;
        }
        break;
      }
      case 'next': {
        const el = byId.get(a.id);
        if (!el || el.type !== 'list') { warn(`next: no list "${a.id}"`); break; }
        const it = el.items.find(x => x.t == null);
        if (!it) { warn(`next: list "${a.id}" has no more items`); break; }
        const prev = el.items.filter(x => x.t != null).map(x => x.t);
        it.t = r3(Math.max(c.t, el.appear, prev.length ? Math.max(...prev) + 0.4 : 0));
        break;
      }
      case 'strike': case 'tick': case 'highlight': {
        const el = byId.get(a.id);
        if (el && el.type === 'quiz' && c.cue === 'highlight' && a.option != null) { (el.optHi = el.optHi || []).push({ t: r3(c.t), i: parseInt(a.option, 10) }); break; }
        if (!el && shotById.has(a.id)) { const sh = shotById.get(a.id); sh[c.cue + 'T'] = r3(Math.max(c.t, sh.contentStart + 0.3)); break; }
        if (!el) { warn(`${c.cue}: unknown id "${a.id}"`); break; }
        const minT = el.appear + (el.writeDur || 0);
        el[c.cue] = r3(Math.max(c.t, minT));
        break;
      }
      case 'erase': {
        const el = byId.get(a.id);
        if (!el) { warn(`erase: unknown id "${a.id}"`); break; }
        if (el.erase == null) { el.erase = r3(Math.max(c.t, el.appear + 0.3)); el.eraseBy = 'cue'; }
        break;
      }
      case 'quiz': {
        const options = String(a.options || '').split('|').map(s => s.trim()).filter(Boolean);
        let answer = parseInt(a.answer, 10);
        if (!(answer >= 0 && answer < options.length)) { warn(`quiz ${a.id}: answer index ${a.answer} out of range (0-based) → 0`); answer = 0; }
        const el = addElement(c, 'quiz', { text: a.q || '', q: a.q || '', options, answer, seconds: parseFloat(a.seconds) || 5,
          countdown: null, reveal: null });
        el.writeDur = r3(writeDur(el.q) + options.length * 0.6);
        // countdown = the long pause that follows (inserted silence ends at the next word's start)
        const p = live.find(x => x.cue === 'pause' && x.t > c.t && parseFloat(x.args.s) >= 2);
        if (p) {
          const prevWord = words[Math.max(0, (p.word || 0) - 1)];
          const s = parseFloat(p.args.s);
          let cs = prevWord ? prevWord.end + 0.15 : p.t - s;
          el.countdown = r3(Math.max(cs, el.appear + 1));
          el.seconds = parseFloat(a.seconds) || s;
        } else el.countdown = r3(el.appear + el.writeDur + 1);
        break;
      }
      case 'reveal': {
        const el = byId.get(a.id);
        if (!el || el.type !== 'quiz') { warn(`reveal: no quiz "${a.id}"`); break; }
        el.reveal = r3(Math.max(c.t, el.appear + 0.5));
        break;
      }
      case 'voice': case 'pause': case 'sfx': break; // rig / audio only
      default:
        if (!KNOWN.has(c.cue)) { warn(`unknown cue "${c.cue}" ignored`); warnings.push(c.cue); }
    }
  }
  if (!scenes.length) newScene({ t: 0, args: { layout: 'board' } });
  scene.end = duration;
  const readability = enforceReadability();
  // on-screen words matched too late (after their shot ends) → simple stagger from the shot start
  for (const sc of scenes) {
    if (!sc.tokens || !sc.tokens.length) continue;
    const end = sc.end != null ? sc.end : duration;
    if (sc.tokens.some(k => k.t > end - 0.4)) sc.tokens.forEach((k, i) => { k.t = r3(sc.contentStart + 0.05 + i * 0.16); k.matched = false; });
    // never an empty frame: words pop in at least on a brisk cadence from the shot start, earlier if spoken earlier
    sc.tokens.forEach((k, i) => { k.t = r3(Math.min(k.t, sc.contentStart + 0.12 + i * 0.24)); });
    const last = sc.tokens[sc.tokens.length - 1].t;
    if (sc.args.style === 'wrong' && sc.args.strike !== 'manual') sc.strikeT = r3(Math.max(last + 0.3, Math.min(last + 0.7, end - 1.0)));
    if (sc.args.style === 'right') sc.tickT = r3(Math.max(last + 0.3, Math.min(last + 0.5, end - 1.0)));
  }
  scenes[0].start = 0; scenes[0].tStart = 0; scenes[0].tEnd = 0; scenes[0].transition = 'cut';

  // finish lists: items never revealed by `next` show up at the end of their scene? → stagger after appear
  for (const el of elements) {
    if (el.type === 'list') {
      let prev = el.appear;
      el.items.forEach((it, k) => {
        if (it.t == null) {
          it.t = el.stagger || el.nextCount === undefined ? r3(prev + (k ? 0.9 : 0)) : null;
          if (el.args.stagger !== 'auto' && !live.some(x => x.cue === 'next' && x.args.id === el.id)) it.t = r3(prev + (k ? 0.9 : 0));
        }
        if (it.t != null) prev = it.t;
      });
      el.items.forEach(it => { it.dur = r3(writeDur(it.text)); });
      // list without reveals (pending `next` beyond partial end) keeps hidden items
    }
    if (el.type === 'quiz') {
      el.countdownEnd = r3(el.countdown + el.seconds);
      // the countdown runs in the inserted silence; never reveal before it ends (dev audio without silence: cap)
      if (el.reveal != null && el.reveal < el.countdownEnd) {
        if (el.countdownEnd - el.reveal < 6) el.reveal = el.countdownEnd; else el.countdownEnd = el.reveal;
      }
    }
    if (el.erase != null) el.eraseEnd = r3(el.erase + (el.eraseBy === 'scene' ? ERASE_DUR : el.eraseBy === 'ink' ? 0 : ELEM_ERASE_DUR));
  }

  // ── handwriting must finish ≥0.8 s before the cut (write speed adapts; late cues move earlier) ──
  let hwFixed = 0;
  const shotEndOf = e => { const sc = scenes[e.scene]; return Math.min(sc.end != null ? sc.end : duration, e.erase != null ? e.erase : 1e9); };
  for (const e of elements) {
    if (e.dropped) continue;
    const end = shotEndOf(e), sc = scenes[e.scene], c0 = sc.contentStart != null ? sc.contentStart : sc.tStart;
    const lim = end - 0.8 - (e.strike != null || e.tick != null || e.highlight != null ? 0.65 : 0);  // room for strike/tick
    if (e.writeDur && e.appear + e.writeDur > lim) {
      hwFixed++;
      if (lim - e.appear >= 0.3) e.writeDur = r3(lim - e.appear);
      else { e.appear = r3(Math.max(c0, lim - 0.35)); e.writeDur = r3(Math.max(0.2, lim - e.appear)); }
    }
    if (e.items) e.items.forEach(it => {
      if (it.t == null) return;
      if (it.t > lim - 0.2) { it.t = r3(Math.max(c0, lim - 0.35)); hwFixed++; }
      if (it.t + it.dur > lim) it.dur = r3(Math.max(0.2, lim - it.t));
    });
    ['strike', 'tick', 'highlight'].forEach(k => { if (e[k] != null && e[k] > end - 1.45) { e[k] = r3(Math.max(e.appear + (e.writeDur || 0), Math.min(e[k], end - 1.45))); hwFixed++; } });
    if (e.erase != null) e.eraseEnd = r3(e.erase + (e.eraseBy === 'scene' ? ERASE_DUR : e.eraseBy === 'ink' ? 0 : ELEM_ERASE_DUR));
  }
  for (const sc of scenes) {
    const end = sc.end != null ? sc.end : duration;
    const c0 = sc.contentStart != null ? sc.contentStart : sc.tStart;
    (sc.says || []).forEach(q => {
      const d = q.w0 == null ? Math.max(0.6, Math.min(2.2, q.text.length * 0.05)) : Math.max(0.45, Math.min(2.2, (q.end - q.start) || 0.6));
      if (q.t + 0.08 + d > end - 0.8) { q.t = r3(Math.max(c0, Math.min(q.t, end - 0.9 - d))); hwFixed++; }
      q.maxDur = r3(Math.max(0.3, end - 0.88 - q.t));
    });
  }
  readability.handwritingFixed = hwFixed;
  if (scenes.some(x => x.isShot)) console.log(`  timeline: readability – ${readability.extended} shots delayed, ${readability.merged} merged; ${readability.shots} shots, min ${readability.min.toFixed(2)} s, avg ${readability.avg.toFixed(2)} s; ${hwFixed} write-ons sped up/moved`);

  // camera: scene default shot when the scene has no camera cue at its start
  for (const sc of scenes) {
    if (sc.isShot && sc.type !== 'board' && sc.type !== 'quiz') continue;
    const has = camera.some(k => Math.abs(k.t - (sc.i === 0 ? 0 : sc.tStart)) < 0.05 || (k.t >= sc.tStart - 0.05 && k.t <= sc.tStart + 0.6));
    if (!has) camera.push({ t: r3(sc.tStart), shot: sc.type === 'quiz' ? 'close' : (DEFAULT_SHOT[sc.layout] || 'board'), focus: null, auto: 'scene' });
  }
  camera.sort((a, b) => a.t - b.t);
  if (!camera.length || camera[0].t > 0) camera.unshift({ t: 0, shot: DEFAULT_SHOT[scenes[0].layout] || 'board', focus: null, auto: 'start' });
  // never static for long: insert a reframe at a sentence start after ~8 s of the same shot
  const sentStarts = (AL.sentences || []).map(s => s.start).filter(isFinite);
  const VAR = { board: ['wide', 'close'], wide: ['board', 'melo'], melo: ['wide', 'board'], close: ['board'] };
  const autos = [];
  for (let i = 0; i < camera.length; i++) {
    const k = camera[i], nextT = i + 1 < camera.length ? camera[i + 1].t : duration;
    let t = k.t, n = 0;
    while (true) {
      const cand = sentStarts.find(s => s > t + 7.5 && s < nextT - 3);
      if (cand == null) break;
      const sc = [...scenes].reverse().find(s => s.start <= cand) || scenes[0];
      if (sc.layout === 'title' || (sc.isShot && sc.type !== 'board')) break;
      const opts2 = VAR[k.shot] || ['wide'];
      let shot = opts2[(n + i) % opts2.length];
      const vis = elements.filter(e => e.scene === sc.i && e.appear <= cand && (e.erase == null || e.erase > cand + 2));
      if ((shot === 'board' || shot === 'close') && !vis.length) shot = sc.layout === 'melo' ? 'wide' : 'melo';
      let focus = null;
      if (shot === 'close') { focus = vis.length ? vis[vis.length - 1].id : null; if (!focus) shot = 'board'; }
      autos.push({ t: r3(cand), shot, focus, auto: 'variety' });
      // and come back to the scripted shot a few seconds later
      const back = sentStarts.find(s => s > cand + 4.5 && s < nextT - 2.5);
      if (back == null) break;
      autos.push({ t: r3(back), shot: k.shot, focus: k.focus, auto: 'return' });
      t = back; n++;
    }
  }
  camera.push(...autos);
  camera.sort((a, b) => a.t - b.t);
  // quiz: the board (question, options, countdown ring) stays in view from question to reveal
  for (const q of elements.filter(e => e.type === 'quiz')) {
    const end = (q.reveal != null ? q.reveal : q.countdownEnd) + 0.5;
    for (let i = camera.length - 1; i >= 0; i--) if (camera[i].auto && camera[i].t > q.appear - 0.5 && camera[i].t < end + 3) camera.splice(i, 1);
    for (const k of camera) if (k.t >= q.appear + 0.3 && k.t < end && k.shot === 'melo') { k.shot = 'board'; k.quiz = q.id; }
    camera.push({ t: r3(q.appear + 0.3), shot: 'board', focus: null, auto: 'quiz' });
    if (q.countdown != null) camera.push({ t: r3(q.countdown - 0.3), shot: 'close', focus: q.id, auto: 'quiz-countdown' });
  }
  camera.sort((a, b) => a.t - b.t);

  // chapters from '## N – …' / '## Kernfrage N' headings
  const chapters = [];
  if (AL.sections && AL.sections.length && AL.sections.every(s => isFinite(s.t))) sections = AL.sections.map(s => ({ ...s, cue: -1 }));
  for (const s of sections) {
    let t = isFinite(s.t) ? s.t : null;
    const sc = t == null ? scriptCues[s.cue] : null;
    if (sc) {
      const match = cues.find(c => c.k === s.cue && c.cue === sc.cue) || cues.find(c => (c.word || 0) >= s.word);
      if (match) t = match.t;
    }
    if (t == null && words[s.word]) t = words[s.word].start;
    if (t == null || t > duration) continue;
    const m = s.title.match(/^(\d+)\s*[–-]\s*(.*)$/);
    const q = s.title.match(/^Kernfrage\s*(\d+)/i);
    chapters.push({ t: r3(t), title: s.title, num: m ? +m[1] : null, label: m ? m[2] : q ? `Kernfrage ${q[1]}` : s.title, kind: m ? 'item' : q ? 'quiz' : 'section' });
  }

  // envelope (lip sync) – embedded for the player
  let envelope = null;
  const envPath = opts.envelope || arg('envelope') || path.join(build, 'envelope.json');
  if (fs.existsSync(envPath)) envelope = JSON.parse(fs.readFileSync(envPath, 'utf8'));
  else warn('no envelope.json – rig gets no lip-sync loudness');

  // Melo keeps his mouth shut while another character "speaks" a quote: the rig gets those words removed
  const silent = new Set();
  for (const q of quotes) if (q.who !== 'melo' && q.w0 != null) for (let w = q.w0; w <= q.w1; w++) silent.add(w);
  const rigWords = words.filter(w => !silent.has(w.i));
  const listJs = d => { try { return fs.readdirSync(path.join(__dirname, '..', d)).filter(f => /\.js$/.test(f) && !/render|sheet|test|^dev|tool|bench/.test(f)).sort(); } catch (e) { return []; } };
  const assets = { sets: listJs('engine/sets').filter(f => f !== 'sets.js'), cast: listJs('engine/cast') };
  const TL = {
    version: 1, episode: path.basename(path.resolve(ep)), fps: 30, width: 1920, height: 1080,
    duration: r3(duration), partial: !!(AL.duration && duration < AL.duration - 0.5) || dropped > 0,
    audio: audio ? path.relative(ep, audio) : null, alignment: path.relative(ep, alPath), dev: !!AL.dev,
    scenes, elements, camera, chapters, melo, quotes, rigWords, assets, readability,
    cues: live.map(c => ({ cue: c.cue, args: c.args, word: c.word, t: c.t })),
    words: words.filter(w => w.start <= duration),
    sentences: (AL.sentences || []).filter(s => s.start <= duration),
    subs: AL.subtitles && AL.subtitles.length ? subsFromAlignment(AL.subtitles, words, duration) : buildSubs(words.filter(w => w.start <= duration))
  };
  // `format: vertical` in the script front matter → 1080×1920 portrait render (Shorts)
  if (fs.existsSync(scriptPath) && /^---[\s\S]*?^format:\s*["']?vertical\b[\s\S]*?^---/m.test(fs.readFileSync(scriptPath, 'utf8'))) Object.assign(TL, { format: 'vertical', width: 1080, height: 1920 });
  fs.writeFileSync(path.join(build, 'timeline.json'), JSON.stringify(TL, null, 1));
  fs.writeFileSync(path.join(build, 'timeline.js'), 'window.TIMELINE = ' + JSON.stringify({ ...TL, envelope }) + ';\n');
  console.log(`  timeline: ${scenes.length} scenes, ${elements.length} elements, ${camera.length} camera keys, ${chapters.length} chapters, ${TL.subs.length} subtitle cues, ${TL.duration.toFixed(1)} s${TL.partial ? ' (partial)' : ''} → ${path.join(build, 'timeline.json')}`);
  return TL;
}

if (require.main === module) {
  const ep = process.argv[2];
  if (!ep || ep.startsWith('--')) { console.error('usage: node tools/timeline.js episodes/<ep> [--alignment f] [--envelope f] [--to s]'); process.exit(1); }
  try { compile(ep); } catch (e) { console.error('timeline failed:', e.message); process.exit(1); }
}
module.exports = { compile, buildSubs };
