// Parse an episode script.md into spoken words, cues and sections (Node + browser UMD).
// words:    [{i, text}]                     spoken tokens (punctuation attached, cues removed)
// cues:     [{cue, args, word, index}]      word = index of the first spoken word after the cue
//                                            (words.length if nothing follows); index = order in script
// sections: [{title, word, cue}]            '## …' headings (labels only, not spoken)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MeloScript = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function parseArgs(str) {
    const args = {};
    const re = /([\w-]+)=("([^"]*)"|“([^”]*)”|\S+)/g;
    let m;
    while ((m = re.exec(str))) args[m[1]] = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[2];
    return args;
  }
  function stripFrontMatter(src) {
    const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    return m ? src.slice(m[0].length) : src;
  }
  function isWord(tok) { return /[\p{L}\p{N}]/u.test(tok); }
  function parse(src) {
    const body = stripFrontMatter(src);
    const words = [], cues = [], sections = [];
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const h = line.match(/^#{1,6}\s+(.*)$/);
      if (h) { sections.push({ title: h[1].trim(), word: words.length, cue: cues.length }); continue; }
      const re = /\[\[\s*([\w-]+)([^\]]*?)\]\]/g;
      let last = 0, m;
      const pushText = (txt) => {
        for (const tok of txt.split(/\s+/)) if (tok && isWord(tok)) words.push({ i: words.length, text: tok });
      };
      while ((m = re.exec(line))) {
        pushText(line.slice(last, m.index));
        cues.push({ cue: m[1], args: parseArgs(m[2] || ''), word: words.length, index: cues.length });
        last = m.index + m[0].length;
      }
      pushText(line.slice(last));
    }
    return { words, cues, sections };
  }
  // normalise a token for fuzzy matching
  function norm(t) {
    return String(t).toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
  return { parse, parseArgs, norm };
});
