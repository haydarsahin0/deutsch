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
  'reveal', 'voice', 'pause', 'sfx']);
const DRAW_TYPES = new Set(['title', 'wrong', 'right', 'word', 'sentence', 'note', 'bubble', 'list', 'icon']);
const LAYOUTS = new Set(['board', 'melo', 'split', 'title']);
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
  const scriptPath = path.join(ep, 'script.md');
  let scriptCues = [];
  if (fs.existsSync(scriptPath)) {
    const P = Script.parse(fs.readFileSync(scriptPath, 'utf8'));
    sections = P.sections; scriptCues = P.cues;
  }

  const cues = (AL.cues || []).map((c, k) => ({ ...c, args: c.args || {}, k })).filter(c => isFinite(c.t));
  // stable sort by time (keep script order for equal times)
  cues.sort((a, b) => a.t - b.t || a.k - b.k);
  const dropped = cues.filter(c => c.t > duration).length;
  const live = cues.filter(c => c.t <= duration);
  if (dropped) console.log(`  timeline: partial build – ${dropped} cues after ${duration.toFixed(1)} s dropped`);

  const wordStartAfter = (t) => { const w = words.find(w => w.start >= t - 1e-6); return w ? w.start : null; };

  const scenes = [], elements = [], camera = [], melo = [], warnings = [];
  const byId = new Map();
  let scene = null, autoId = 0, lastDrawStart = -1;

  function newScene(c) {
    const layout = LAYOUTS.has(c.args.layout) ? c.args.layout : (warn(`unknown layout "${c.args.layout}" → board`), 'board');
    const prev = scene;
    const t = c.t;
    const sc = { i: scenes.length, layout, start: t, end: null, transition: 'cut', tStart: t, tEnd: t, contentStart: t };
    if (prev) {
      prev.end = t;
      const prevAlive = elements.filter(e => e.scene === prev.i && (e.erase == null || e.erase > t - ERASE_LEAD));
      if (prev.layout === 'title' || layout === 'title') {
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

  for (const c of live) {
    const a = c.args;
    switch (c.cue) {
      case 'scene': newScene(c); break;
      case 'camera': {
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

  // camera: scene default shot when the scene has no camera cue at its start
  for (const sc of scenes) {
    const has = camera.some(k => Math.abs(k.t - (sc.i === 0 ? 0 : sc.tStart)) < 0.05 || (k.t >= sc.tStart - 0.05 && k.t <= sc.tStart + 0.6));
    if (!has) camera.push({ t: r3(sc.tStart), shot: DEFAULT_SHOT[sc.layout], focus: null, auto: 'scene' });
  }
  camera.sort((a, b) => a.t - b.t);
  if (!camera.length || camera[0].t > 0) camera.unshift({ t: 0, shot: DEFAULT_SHOT[scenes[0].layout], focus: null, auto: 'start' });
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
      if (sc.layout === 'title') break;
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

  const TL = {
    version: 1, episode: path.basename(path.resolve(ep)), fps: 30, width: 1920, height: 1080,
    duration: r3(duration), partial: !!(AL.duration && duration < AL.duration - 0.5) || dropped > 0,
    audio: audio ? path.relative(ep, audio) : null, alignment: path.relative(ep, alPath), dev: !!AL.dev,
    scenes, elements, camera, chapters, melo,
    cues: live.map(c => ({ cue: c.cue, args: c.args, word: c.word, t: c.t })),
    words: words.filter(w => w.start <= duration),
    sentences: (AL.sentences || []).filter(s => s.start <= duration),
    subs: AL.subtitles && AL.subtitles.length ? subsFromAlignment(AL.subtitles, words, duration) : buildSubs(words.filter(w => w.start <= duration))
  };
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
