/* bedroom-night — Melo's small bedroom late at night: desk with a warm lamp pool, laptop (lid toward us, glowing
 * screen spill), a wall full of sticky notes with flat-hunting words, flashcards on desk + floor, chair, bed with a
 * checked duvet, window with moon over dark rooftops. Indigo night palette, one amber light source.
 * fg = the desk (slot `desk` sits behind it, chest-up). Static. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WALL_Y = 790, DK = { x0: 430, x1: 1050, yb: 728, yf: 772, yl: 968 };
  var LAMP = { x: 520, y: 520 };   // lamp shade (light source)

  function card(S, x, y, w, h, rot, txt, col, fs) {
    var r = U.xf(S.rect(-w / 2, -h / 2, w, h, 24, 0.8), x, y, rot), s = '';
    s += S.fillOnly(U.xf(S.rect(-w / 2 + 3, -h / 2 + 4, w, h, 24, 0.8), x, y, rot), 'rgba(10,8,20,.35)');
    s += S.shape(r, col || '#efe6cf', { w: 1.6, extra: 1.4 });
    s += S.line(U.xf([[-w / 2 + 6, -h / 2 + 10], [w / 2 - 6, -h / 2 + 10]], x, y, rot), { w: 1.2, ta: 0.1, tb: 0.1, min: 0.4 }, P.red, ' opacity=".55"');
    if (txt) s += S.T(x, y + (fs || 16) * 0.35, txt, { f: 'Kalam', s: fs || 16, a: 'middle', r: rot });
    return s;
  }

  function build(S) {
    var bg = '', fg = '', i;
    // ── wall: deep indigo, warmed around the lamp ──
    bg += S.wall(0, WALL_Y, '#323d55', { top: 50, op: 0.35, side: 0.08 });
    bg += S.stripes(0, WALL_Y, 64, '#1c2333', 0.22);
    bg += S.glow(LAMP.x + 260, 470, 720, 420, '#f2b860', 0.38);
    bg += S.glow(LAMP.x + 120, 640, 360, 200, '#ffd98a', 0.35);
    // floor: dark boards, lamp pool
    bg += S.floor(WALL_Y, { kind: 'boards', fill: '#4a3a30', gap: 130, vx: 900, lop: 0.55, hop: 0.25 });
    bg += S.glow(760, 860, 520, 90, '#f2b860', 0.25);
    bg += S.skirting(WALL_Y, 18, '#2a3142');

    // ── window with moon over rooftops ──
    var wx = 90, wy = 120, ww = 300, wh = 420, view = '';
    view += S.fillOnly(S.rect(wx, wy, ww, wh), S.linear([[0, '#141b2b'], [0.7, '#2d3b5c'], [1, '#4a4a62']], 0, 0, 0, 1));
    view += S.glow(wx + 200, wy + 110, 120, 120, '#f6ecc8', 0.35);
    view += S.circ(wx + 200, wy + 110, 34, '#f3e9c6', { w: 1.6, extra: 1 }) + S.circ(wx + 214, wy + 102, 28, '#2a3654', { w: 0 });
    for (i = 0; i < 26; i++) view += S.dot(wx + 20 + S.r() * (ww - 40), wy + 20 + S.r() * 230, 1.2 + S.r() * 1.6, '#f3e9c6');
    var roofs = [[wx - 10, wy + wh], [wx - 10, wy + 300], [wx + 40, wy + 270], [wx + 90, wy + 300], [wx + 90, wy + 250], [wx + 130, wy + 250], [wx + 130, wy + 290],
      [wx + 180, wy + 240], [wx + 230, wy + 280], [wx + 230, wy + 320], [wx + 270, wy + 300], [wx + ww + 10, wy + 310], [wx + ww + 10, wy + wh]];
    view += S.fillOnly(roofs, '#121826');
    view += S.box(wx + 104, wy + 222, 14, 30, '#121826', { w: 1.2, extra: 0.6, hatch: false });   // chimney
    [[wx + 50, wy + 330], [wx + 150, wy + 320], [wx + 250, wy + 350], [wx + 196, wy + 372]].forEach(function (q) { view += S.fillOnly(S.rect(q[0], q[1], 16, 20, 20, 0.5), '#e9b85c', ' opacity=".85"'); });
    bg += S.window(wx, wy, ww, wh, { sky: '#1d2638', view: view, panes: [2, 3], frame: '#c9c2ae', night: true, sillCol: '#b9b29e' });
    // curtain (left) with folds
    var cur = U.catmull([[wx - 70, wy - 40], [wx + 20, wy - 40], [wx + 4, wy + 200], [wx + 36, wy + 470], [wx - 70, wy + 490]], 6, true);
    bg += S.shape(cur, '#6b4a5a', { w: 2.6, extra: 3 }) + S.hatch(cur, { ang: 88, gap: 14, w: 1.6, op: 0.4 });
    bg += S.line([[wx - 90, wy - 44], [wx + ww + 40, wy - 44]], { w: 6, ta: 0.02, tb: 0.02, min: 0.8 }, '#8a7a62');
    // moonlight on the floor
    bg += A.shaft([[wx + 30, WALL_Y + 6], [wx + ww - 20, WALL_Y + 6], [wx + ww + 120, 900], [wx + 60, 900]], '#c9d6f0', 0.1);

    // ── sticky-note wall above the desk ──
    var words = [['die Miete', P.yellow], ['die Kaution', '#f2b6a6'], ['der Vermieter', '#bfe0c4'], ['die Nebenkosten', P.yellow], ['kündigen', '#a9cde0'],
      ['einziehen', '#f2b6a6'], ['die Besichtigung', P.yellow], ['warm / kalt', '#bfe0c4'], ['der Mietvertrag', '#a9cde0'], ['die WG', P.yellow],
      ['möbliert', '#f2b6a6'], ['der Altbau', '#bfe0c4'], ['die Anzeige', P.yellow], ['ausziehen', '#a9cde0'], ['die Bude', '#f2b6a6']];
    var nx = 470, ny = 150, k = 0;
    for (var row = 0; row < 3; row++) for (var col = 0; col < 5; col++) {
      var w = words[k++]; if (!w) break;
      var x = nx + col * 116 + (row % 2) * 30 + (S.r() - 0.5) * 14, y = ny + row * 112 + (S.r() - 0.5) * 12;
      if (row === 2 && col === 4) continue;
      bg += S.note(x + 50, y + 44, 104, 88, (S.r() - 0.5) * 12, w[1], [w[0]], { fs: w[0].length > 12 ? 14 : 17, top: 50, f: 'Kalam', pin: S.r() > 0.4, tape: S.r() > 0.5 });
    }
    // big goal note + tally
    bg += S.note(1020, 200, 150, 120, 5, '#efe6cf', [{ t: '50 Wörter', f: 'Caveat', s: 34 }, { t: 'pro Tag!', f: 'Caveat', s: 34, c: P.red }], { fs: 34, top: 48, lh: 1.1 });
    var tal = [];
    for (i = 0; i < 4; i++) tal.push([[960 + i * 14, 300], [962 + i * 14, 344]]);
    bg += S.lines(tal, { w: 3, ta: 0.1, tb: 0.2, min: 0.5 }, '#e9e0c8', ' opacity=".8"') + S.seg(950, 336, 1020, 304, 3, '#e9e0c8', ' opacity=".8"');
    // string of fairy lights along the top
    var bulbs = '', wire = [];
    for (i = 0; i <= 14; i++) { var bx = 450 + i * 46, by = 112 + Math.sin(i / 14 * Math.PI) * 26; wire.push([bx, by]); }
    bg += S.line(wire, { w: 1.6, ta: 0.02, tb: 0.02, min: 0.6, smooth: 4 }, '#141824');
    wire.forEach(function (q, j) { if (j % 2) return; bulbs += S.glow(q[0], q[1] + 8, 24, 24, '#ffd98a', 0.6) + S.circ(q[0], q[1] + 8, 5, '#ffe3a0', { w: 1, extra: 0.6 }); });
    bg += bulbs;

    // ── desk chair back (behind the seated character) ──
    var ch = U.catmull([[640, 790], [636, 600], [660, 560], [740, 552], [820, 560], [844, 600], [840, 790]], 5, true);
    bg += S.shape(ch, '#3f5a58', { w: 3, extra: 3.4 }) + A.shadeSide(S, ch, [1, 0.3], 0.2, { ang: 70, gap: 7, op: 0.45 });

    // ── bed (right, against the wall) ──
    var BX = 1330;
    bg += S.box(BX, 470, 600, 300, '#5a3f2c', { w: 3.2, extra: 3.6, hatch: 'r', hk: 0.15 });           // headboard
    bg += S.box(BX + 24, 494, 552, 120, '#664a34', { w: 2, extra: 2, hatch: false });
    bg += S.shelf(BX + 60, BX + 420, 300, '#6b4a2f') + S.books(BX + 80, BX + 300, 300, 80, [P.redD, P.navyL, P.ochre, '#5f7a6a', P.cream]);
    bg += S.plant(BX + 370, 300, 90, { n: 7, pot: '#8a5a3a' });
    // pillow + mattress + duvet
    var pil = U.catmull([[BX + 60, 640], [BX + 70, 600], [BX + 230, 592], [BX + 260, 630], [BX + 240, 666], [BX + 80, 672]], 5, true);
    bg += S.shape(pil, '#d9d3c0', { w: 2.4, extra: 2.6 }) + A.shadeSide(S, pil, [0.4, 1], 0.3, { ang: 20, gap: 6, op: 0.35 });
    var mat = S.poly([[BX - 20, 700], [1940, 700], [1940, 790], [BX - 30, 790]], 40, 1);
    bg += S.shape(mat, '#c9c1aa', { w: 2.6, extra: 3 });
    var duv = U.catmull([[BX + 180, 690], [BX + 300, 650], [BX + 480, 660], [1950, 640], [1950, 880], [BX + 400, 892], [BX - 40, 878], [BX - 30, 760], [BX + 40, 700]], 6, true);
    bg += S.shape(duv, '#8a3b38', { w: 3, extra: 3.4 });
    bg += '<g clip-path="url(#' + S.clip(duv) + ')">' + S.stripes(600, 900, 70, '#efe6cf', 0.4, BX - 60, 1940) +
      S.hatch(S.rect(BX - 60, 600, 700, 300), { ang: 0, gap: 70, w: 5, op: 0.22, color: '#efe6cf' }) + '</g>';
    bg += A.shadeSide(S, duv, [0, 1], 0.35, { ang: 20, gap: 7, op: 0.45 });
    bg += S.floorShadow(BX + 300, 892, 360, 12, 0.35);
    // open book + phone on the duvet
    bg += S.shape(S.poly([[BX + 330, 700], [BX + 400, 690], [BX + 470, 704], [BX + 466, 730], [BX + 400, 718], [BX + 334, 726]], 20, 0.8), '#efe6cf', { w: 1.8, extra: 1.6 });
    // nightstand cut by the bed? → alarm clock on the window sill instead
    bg += S.circ(330, 572, 18, '#c9b06a', { w: 1.8, extra: 1.4 }) + S.circ(330, 572, 12, '#efe6cf', { w: 1, extra: 0.6 }) + S.seg(330, 572, 330, 564, 1.4) + S.seg(330, 572, 337, 574, 1.4);
    bg += S.T(330, 612, '01:47', { f: 'Oswald', s: 14, c: '#e9b85c', a: 'middle', w: 500 });

    // ── flashcards on the floor (stay above the subtitle band) ──
    [[300, 860, -14, 'die Miete'], [380, 884, 9, ''], [1140, 856, 18, 'kündigen'], [1210, 880, -6, ''], [260, 896, 30, '']].forEach(function (c) { bg += card(S, c[0], c[1], 92, 54, c[2], c[3], '#e6dcc4', 14); });
    // trash bin with crumpled paper
    bg += S.shape(S.poly([[1180, 780], [1250, 780], [1242, 860], [1188, 860]], 20, 0.8), '#3f4a5c', { w: 2.4, extra: 2.6 }) + S.hatch(S.poly([[1180, 780], [1250, 780], [1242, 860], [1188, 860]], 20, 0.8), { ang: 90, gap: 9, w: 1.1, op: 0.4 });
    bg += S.circ(1205, 776, 14, '#e6dcc4', { w: 1.6, extra: 1.2, jit: 0.25 }) + S.circ(1230, 772, 12, '#e6dcc4', { w: 1.6, extra: 1.2, jit: 0.25 });

    // ── lamp (bg: stands on the desk, behind the character's plane) ──
    bg += S.line([[470, 726], [490, 600], [LAMP.x, LAMP.y + 20]], { w: 6, ta: 0.02, tb: 0.02, min: 0.8 }, '#2a2a2a');
    var shade = U.xf(U.catmull([[-30, -20], [30, -26], [56, 30], [-50, 40]], 4, true), LAMP.x + 4, LAMP.y + 20, 24);
    bg += S.shape(shade, '#3f5a58', { w: 2.4, extra: 2.6 });
    bg += '<path d="M' + (LAMP.x - 10) + ' ' + (LAMP.y + 60) + 'L' + (LAMP.x - 60) + ' ' + DK.yb + 'L' + (LAMP.x + 330) + ' ' + DK.yb + 'L' + (LAMP.x + 60) + ' ' + (LAMP.y + 40) + 'Z" fill="' +
      S.linear([[0, '#ffe3a0', 0.45], [1, '#ffe3a0', 0.05]], 0, 0, 0, 1) + '"/>';

    // ═════ fg: the desk ═════
    var top = S.poly([[DK.x0 + 20, DK.yb], [DK.x1 - 20, DK.yb], [DK.x1, DK.yf], [DK.x0, DK.yf]], 40, 0.8);
    fg += S.floorShadow((DK.x0 + DK.x1) / 2, DK.yl + 4, 360, 14, 0.35);
    fg += S.shape(top, '#a77a4c', { w: 3, extra: 3.2 }) + S.hatch(top, { ang: 0, gap: 8, w: 1, op: 0.25 });
    fg += S.glow(LAMP.x + 120, DK.yb + 22, 260, 34, '#ffe3a0', 0.6);
    var front = S.rect(DK.x0, DK.yf, DK.x1 - DK.x0, 34, 40, 0.8);
    fg += S.shape(front, '#7d5a3a', { w: 3, extra: 3.2 });
    // legs + drawer unit
    fg += S.box(DK.x0 + 10, DK.yf + 34, 26, DK.yl - DK.yf - 34, '#6b4a2f', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.4 });
    fg += S.box(DK.x1 - 200, DK.yf + 34, 190, DK.yl - DK.yf - 34, '#7d5a3a', { w: 2.8, extra: 3, hatch: 'r', hk: 0.2 });
    [0, 1, 2].forEach(function (j) {
      var y0 = DK.yf + 46 + j * 62;
      fg += S.box(DK.x1 - 188, y0, 166, 52, '#8a6542', { w: 1.8, extra: 1.6, hatch: false }) + S.seg(DK.x1 - 125, y0 + 26, DK.x1 - 85, y0 + 26, 4, '#c9b06a');
    });
    // laptop seen from behind (lid toward us, right part of the desk) + screen spill on the wall
    var lid = S.poly([[870, DK.yb + 10], [1010, DK.yb + 10], [1000, DK.yb - 126], [884, DK.yb - 120]], 30, 0.8);
    fg += A.shaft([[884, DK.yb - 120], [1000, DK.yb - 126], [1060, DK.yb - 300], [820, DK.yb - 290]], '#bfe0f0', 0.1);
    fg += S.shape(lid, '#9aa3a6', { w: 2.6, extra: 2.8 }) + A.shadeSide(S, lid, [1, 0], 0.3, { ang: 75, gap: 6, op: 0.4 });
    fg += S.circ(942, DK.yb - 60, 18, '#5f8c3c', { w: 1.6, extra: 1.2 }) + S.circ(942, DK.yb - 60, 12, '#c43d33', { w: 0 });   // melon sticker
    fg += S.line([[860, DK.yb + 12], [1020, DK.yb + 12]], { w: 6, ta: 0.05, tb: 0.05, min: 0.8 }, '#6a7275');
    // flashcards on the desk: a banded stack + loose cards
    fg += card(S, 560, DK.yb + 22, 100, 30, -4, '', '#e6dcc4') + card(S, 560, DK.yb + 14, 100, 30, 3, 'Vokabeln', '#efe6cf', 13);
    fg += S.seg(548, DK.yb + 2, 552, DK.yb + 30, 3, P.red);
    fg += card(S, 700, DK.yb + 24, 96, 30, 8, 'die Kaution', '#f2b6a6', 13) + card(S, 800, DK.yb + 22, 90, 30, -10, 'die WG', P.yellow, 13);
    // mug with tea + pen
    fg += S.mug(1035, DK.yb + 8, 40, 46, '#c9b06a', { top: '#5a3a1a' });
    fg += S.line([[640, DK.yf - 10], [700, DK.yf - 18]], { w: 5, ta: 0.05, tb: 0.4, min: 0.5 }, P.redD);
    return { bg: bg, fg: fg, post: function (m) { return m; } };
  }

  A.define('bedroom-night', {
    seed: 201, build: build,
    slots: {
      left:   A.slot(270, 975, 1.0, { face: 1 }),                       // by the window
      center: A.slot(1130, 985, 1.02, { face: -1 }),                   // open floor between desk and bed
      right:  A.slot(1520, 990, 1.0, { face: -1 }),                    // in front of the bed
      desk:   A.slot(740, 990, 0.95, { face: 1, seated: true, seatY: 820 }),   // behind the desk (fg), chest-up
      bed:    A.slot(1700, 960, 0.95, { face: -1, seated: true, seatY: 790 })  // on the bed edge
    }
  });
})(typeof self !== 'undefined' ? self : this);
