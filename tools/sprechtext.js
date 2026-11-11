#!/usr/bin/env node
// Usage: node tools/sprechtext.js episodes/<ep>
// Reads episodes/<ep>/script.md and writes episodes/<ep>/sprechtext.md:
// clean spoken text for the voice actor (all [[...]] cues removed, pauses shown as
// "(Pause)" / "(lange Pause …)", section headings kept, reading tips on top).
// Also writes episodes/<ep>/tts.txt: only the words to be spoken, ready to paste into an
// AI voice (no headings, no pause/laugh markers, no notes). Quiz countdown silences are
// added later in the video pipeline, not by the voice.
// Also prints the spoken word count and an estimated duration (130 words/min + pauses).
// No dependencies. Unknown cues are simply stripped (never crash).
'use strict';
const fs = require('fs');
const path = require('path');

const WPM = 130;

function parseFrontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  let listKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const item = raw.match(/^\s+-\s+(.*)$/);
    if (item && listKey) { meta[listKey].push(unquote(item[1])); continue; }
    const kv = raw.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    if (kv[2] === '') { listKey = kv[1]; meta[listKey] = []; }
    else { listKey = null; meta[kv[1]] = unquote(kv[2]); }
  }
  return { meta, body: src.slice(m[0].length) };
}

function unquote(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  return s.replace(/\\"/g, '"');
}

function parseArgs(str) {
  const args = {};
  const re = /([\w-]+)=("([^"]*)"|\S+)/g;
  let m;
  while ((m = re.exec(str))) args[m[1]] = m[3] !== undefined ? m[3] : m[2];
  return args;
}

// Replace cues in one paragraph; returns { text, pauseSeconds }
function renderParagraph(par) {
  let pauseSeconds = 0;
  const text = par.replace(/\[\[\s*([\w-]+)([^\]]*?)\]\]/g, (_, name, rest) => {
    const args = parseArgs(rest || '');
    if (name === 'pause') {
      const s = parseFloat(args.s);
      const sec = isFinite(s) ? s : 1;
      pauseSeconds += sec;
      if (sec >= 2) return ` (lange Pause, ca. ${String(Math.round(sec * 10) / 10).replace('.', ',')} Sek.) `;
      return ' (Pause) ';
    }
    if (name === 'melo' && args.expr === 'laughing') return ' _(lachend)_ ';
    return ' ';
  });
  // any malformed leftover brackets
  const clean = text.replace(/\[\[[\s\S]*?\]\]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/(_\(lachend\)_\s*)+/g, '_(lachend)_ ')
    .trim();
  return { text: clean, pauseSeconds };
}

// Spoken text only, for AI text-to-speech: drop markers, keep sentences and paragraphs.
function toTTS(text) {
  return text
    .replace(/\(lange Pause[^)]*\)/g, '\n\n')
    .replace(/\(Pause\)|_\(lachend\)_/g, ' ')
    .split('\n\n')
    .map(p => p.replace(/[ \t]+/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim())
    .filter(Boolean)
    .join('\n\n');
}

function countWords(text) {
  return text
    .replace(/_\(lachend\)_/g, ' ')
    .replace(/\((lange )?Pause[^)]*\)/g, ' ')
    .split(/\s+/)
    .filter(w => /[\p{L}\p{N}]/u.test(w)).length;
}

function main() {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: node tools/sprechtext.js episodes/<ep>'); process.exit(1); }
  const scriptPath = path.join(dir, 'script.md');
  if (!fs.existsSync(scriptPath)) { console.error('not found: ' + scriptPath); process.exit(1); }
  const { meta, body } = parseFrontMatter(fs.readFileSync(scriptPath, 'utf8'));

  const out = [];
  const tts = [];
  let words = 0, pauses = 0;
  const sections = [];
  // paragraphs = blocks separated by blank lines; headings are their own blocks
  const lines = body.split(/\r?\n/);
  let buf = [];
  const flush = () => {
    if (!buf.length) return;
    const { text, pauseSeconds } = renderParagraph(buf.join(' '));
    buf = [];
    pauses += pauseSeconds;
    if (!text || /^(\(Pause\)|\(lange Pause[^)]*\)|\s)*$/.test(text)) return;
    const w = countWords(text);
    words += w;
    if (sections.length) sections[sections.length - 1].words += w;
    out.push(text, '');
    tts.push(toTTS(text));
  };
  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      out.push('## ' + h[2].trim(), '');
      sections.push({ name: h[2].trim(), words: 0 });
    } else if (!line.trim()) {
      flush();
    } else {
      buf.push(line.trim());
    }
  }
  flush();

  const minutes = words / WPM + pauses / 60;
  const fmt = m => { const s = Math.round(m * 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  const head = [];
  head.push('---');
  head.push(`title: ${JSON.stringify(meta.title || path.basename(dir))}`);
  if (meta.episode) head.push(`episode: ${meta.episode}`);
  head.push('source: script.md (generiert mit tools/sprechtext.js – nicht von Hand bearbeiten)');
  head.push(`words: ${words}`);
  head.push(`estimated_duration: "${fmt(minutes)} min (bei ${WPM} Wörtern/Min. + ${Math.round(pauses)} s Pausen)"`);
  head.push('---', '');
  head.push(`# Sprechtext: ${meta.title || path.basename(dir)}`, '');
  head.push('## Hinweise für den Sprecher', '');
  const tips = Array.isArray(meta.voice_notes) && meta.voice_notes.length ? meta.voice_notes : [
    'Tempo: ruhig und klar, ca. 130 Wörter pro Minute.',
    'Haltung: locker, trocken, freundlich – nie Lehrer-Ton.',
  ];
  for (const t of tips) head.push('- ' + t);
  head.push('- Legende: „(Pause)“ = kurz absetzen (ca. 0,5–1,5 Sek.), „(lange Pause …)“ = Sekunden abwarten (Quiz-Countdown läuft), „_(lachend)_“ = mit einem Lachen/Schmunzeln in der Stimme weitersprechen.');
  head.push('- Überschriften (##) werden nicht gesprochen – sie dienen nur der Orientierung. Nach jedem Abschnitt gern 1–2 Sekunden Luft lassen; das wird im Schnitt angepasst.');
  head.push('- Versprecher sind kein Problem: Satz einfach noch einmal von vorn lesen, die Software findet die passende Stelle.');
  head.push('', '---', '');

  fs.writeFileSync(path.join(dir, 'sprechtext.md'), head.concat(out).join('\n').replace(/\n{3,}/g, '\n\n'));
  console.log(`wrote ${path.join(dir, 'sprechtext.md')}`);
  const ttsText = tts.join('\n\n') + '\n';
  fs.writeFileSync(path.join(dir, 'tts.txt'), ttsText);
  console.log(`wrote ${path.join(dir, 'tts.txt')} (${ttsText.length} characters)`);
  console.log(`spoken words: ${words}`);
  console.log(`pauses: ${Math.round(pauses * 10) / 10} s`);
  console.log(`estimated duration: ${fmt(words / WPM)} min speech @ ${WPM} wpm, ${fmt(minutes)} min incl. pauses`);
  if (process.argv.includes('--sections')) for (const s of sections) console.log(`  ${String(s.words).padStart(4)}  ${s.name}`);
}

main();
