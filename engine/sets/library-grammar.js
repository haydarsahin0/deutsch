/* library-grammar — the reading room of a city library in the late afternoon: tall dark-wood shelves left and right
 * (plates „Grammatik" / „Sprachen", „Bitte leise"), a tall arched window in the back with a light shaft and dust motes,
 * hanging sign „Lesesaal". fg = long reading table with a green banker's lamp, a stack of thick grammar books
 * („Deutsche Grammatik", „Verben A–Z", „Übungsgrammatik B1"), an open book next to a phone with a chat on the screen
 * (check the AI's answer against the book). Slot `table` = behind the table (chest-up), facing the book.
 * Free table top for props: x 1100–1450 at y ≈ 580–650. Ambient: dust motes. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var WALL_Y = 790, TB = { x0: 380, x1: 1560, back: 648, front: 676, apron: 742, panel: 872, yl: 985 }, WIN = { x: 660, y: 100, w: 600, h: 500 };
  var SHAFT = [[WIN.x + 40, WIN.y + 120], [WIN.x + WIN.w - 40, WIN.y + 60], [1500, 1000], [980, 1000]];

  function shelves(S, x0, x1, label) {
    var s = '', y;
    s += S.drop(x0, 50, x1 - x0, WALL_Y - 40, 12, 0);
    s += S.box(x0, 50, x1 - x0, WALL_Y - 44, '#4a3426', { w: 3, extra: 3.4 });
    for (var i = 0; i < 5; i++) {
      y = 200 + i * 132;
      s += S.fillOnly(S.rect(x0 + 18, y - 122, x1 - x0 - 36, 122), '#2b1f17');
      s += S.books(x0 + 24, x1 - 26, y, 110, ['#7a2e2a', '#3e5a3a', '#8a6a2e', '#2f4258', '#c9b48a', '#5a3a4a', '#6b4a2f']);
      s += S.box(x0 + 8, y, x1 - x0 - 16, 14, '#5e4030', { w: 2, extra: 2, hatch: false });
    }
    s += S.box((x0 + x1) / 2 - 80, 60, 160, 36, '#e9dfc4', { w: 2, extra: 1.6 }) + S.T((x0 + x1) / 2, 86, label, { f: 'Oswald', s: 22, a: 'middle' });
    return s;
  }

  function build(S) {
    var bg = '', fg = '', i;
    // wall + floor
    bg += S.wall(0, WALL_Y, '#c7ad82', { top: 60, op: 0.3, side: 0.04 });
    bg += S.glow(960, 360, 760, 420, '#ffe6b0', 0.3);
    bg += S.floor(WALL_Y, { kind: 'boards', fill: '#8a6444', gap: 100, vx: 960, lop: 0.45, hop: 0.22 });
    bg += S.fillOnly(S.poly([[560, 1100], [820, WALL_Y + 4], [1100, WALL_Y + 4], [1360, 1100]], 30, 1), '#7d3b33', ' opacity=".55"');   // runner
    bg += S.skirting(WALL_Y, 18, '#5e4030');

    // ── arched window ──
    var W = WIN, top = U.catmull([[W.x, W.y + 180], [W.x + W.w * 0.15, W.y + 40], [W.x + W.w / 2, W.y - 10], [W.x + W.w * 0.85, W.y + 40], [W.x + W.w, W.y + 180]], 8, false);
    var win = top.concat([[W.x + W.w, W.y + W.h], [W.x, W.y + W.h]]);
    bg += S.fillOnly(win.map(function (p) { return [p[0] + 12, p[1] + 14]; }), P.shadow);
    var view = S.fillOnly(S.rect(W.x - 20, W.y - 30, W.w + 40, W.h + 40), S.linear([[0, '#e8e2c8'], [1, '#f3d9a4']], 0, 0, 0, 1));
    for (i = 0; i < 4; i++) view += S.circ(W.x + 70 + i * 160, W.y + W.h - 60 - (i % 2) * 50, 110, i % 2 ? '#8db15e' : '#6f9a49', { w: 2, extra: 2, jit: 0.25 });
    view += S.hatch(S.rect(W.x, W.y + 260, W.w, 240), { ang: 50, gap: 8, w: 1.1, op: 0.25 });
    bg += '<g clip-path="url(#' + S.clip(win) + ')">' + view + '</g>';
    var mull = [];
    for (i = 1; i < 4; i++) mull.push([[W.x + W.w * i / 4, W.y + 10], [W.x + W.w * i / 4, W.y + W.h]]);
    mull.push([[W.x, W.y + 200], [W.x + W.w, W.y + 200]], [[W.x, W.y + 360], [W.x + W.w, W.y + 360]]);
    bg += S.lines(mull, { w: 7, ta: 0.02, tb: 0.02, min: 0.8 }, '#5e4030');
    bg += S.shape(win, null, { w: 5, extra: 5 }) + S.box(W.x - 30, W.y + W.h, W.w + 60, 22, '#8d6236', { w: 3, extra: 3, hatch: 'b', hk: 0.5 });
    bg += A.shaft(SHAFT, '#fff0c8', 0.16);
    bg += '<!--amb:dust-->';
    // low card-catalogue cabinet under the window
    bg += S.box(700, 640, 520, WALL_Y - 640, '#6b4a2f', { w: 3, extra: 3, hatch: 'r', hk: 0.2 });
    for (i = 0; i < 6; i++) for (var j = 0; j < 2; j++) bg += S.box(716 + i * 84, 656 + j * 62, 72, 50, '#7d5838', { w: 1.6, extra: 1.4, hatch: false }) + S.seg(740 + i * 84, 684 + j * 62, 764 + i * 84, 684 + j * 62, 3, '#c9a043');

    // ── shelves left + right, hanging sign ──
    bg += shelves(S, -20, 440, 'Grammatik') + shelves(S, 1480, 1940, 'Sprachen');
    bg += S.box(1520, 470, 120, 34, '#f4eedf', { w: 1.8, extra: 1.4 }) + S.T(1580, 494, 'Bitte leise', { f: 'Kalam', s: 20, a: 'middle' });
    bg += S.lines([[[900, -10], [900, 28]], [[1020, -10], [1020, 28]]], { w: 2, ta: 0.02, tb: 0.02 }, P.ink);
    bg += S.box(860, 28, 200, 48, '#2f4436', { w: 2.6, extra: 2.4 }) + S.T(960, 62, 'Lesesaal', { f: 'Fraunces', s: 30, c: '#e9dfc4', a: 'middle' });

    // ═════ fg: reading table ═════
    var T = TB;
    fg += S.floorShadow((T.x0 + T.x1) / 2, T.yl + 2, 620, 14, 0.3);
    [T.x0 + 40, T.x1 - 60].forEach(function (x) { fg += S.box(x, T.apron, 26, T.yl - T.apron, '#4a3426', { w: 2.4, extra: 2.4, hatch: 'r', hk: 0.5 }); });
    var pan = S.rect(T.x0 + 70, T.apron, T.x1 - T.x0 - 150, T.panel - T.apron, 40, 0.6);
    fg += S.shape(pan, '#55392a', { w: 2.4, extra: 2.4 }) + S.hatch(pan, { ang: 85, gap: 10, w: 1.2, op: 0.35 });
    var topS = S.poly([[T.x0 + 10, T.back], [T.x1 - 10, T.back], [T.x1, T.front], [T.x0, T.front]], 40, 0.5);
    fg += S.shape(topS, '#8a5a36', { w: 3, extra: 3 }) + S.box(T.x0, T.front, T.x1 - T.x0, T.apron - T.front, '#6b4a2f', { w: 3, extra: 3, hatch: 'b', hk: 0.5 });
    fg += S.fillOnly(S.poly([[T.x0 + 40, T.back + 6], [T.x1 - 40, T.back + 6], [T.x1 - 30, T.front - 4], [T.x0 + 30, T.front - 4]], 40, 0.3), '#3f6329', ' opacity=".55"');   // green leather inlay
    // banker's lamp
    var LX = 1010, ly = T.back + 18;
    fg += S.glow(LX, ly, 260, 40, '#ffe2a0', 0.55);
    fg += S.shape(S.ellipse(LX, ly, 52, 11, 24), '#c9a043', { w: 2, extra: 2 }) + S.line([[LX, ly - 6], [LX, 590]], { w: 7, ta: 0.02, tb: 0.02 }, '#a8842c');
    var shade = U.catmull([[LX - 90, 596], [LX - 70, 560], [LX, 548], [LX + 70, 560], [LX + 90, 596]], 6, false).concat([[LX + 90, 604], [LX - 90, 604]]);
    fg += S.shape(shade, '#2f6b45', { w: 2.6, extra: 2.6 }) + S.hatch(shade, { ang: 70, gap: 6, w: 1.1, op: 0.4, cond: function (X) { return X > LX + 20; } });
    fg += S.line([[LX - 60, 566], [LX + 30, 556]], { w: 3, ta: 0.2, tb: 0.2 }, '#bfe0c4', ' opacity=".7"') + S.line([[LX + 20, 604], [LX + 40, 636]], { w: 2, ta: 0.05, tb: 0.05 }, '#a8842c');
    // stack of thick grammar books (left end)
    var stack = [['Deutsche Grammatik', '#7a2e2a', 46], ['Verben A–Z', '#2f4258', 38], ['Übungsgrammatik B1', '#c9a043', 42]], sy = T.back + 14;
    stack.forEach(function (b, k) {
      var w = 210 - k * 14, x = 430 + k * 10;
      fg += S.box(x, sy - b[2], w, b[2], b[1], { w: 2.4, extra: 2.4 }) + S.fillOnly(S.rect(x + w - 16, sy - b[2] + 4, 12, b[2] - 8), '#efe6cf');
      fg += S.T(x + (w - 16) / 2, sy - b[2] / 2 + 7, b[0], { f: 'Oswald', s: 17, c: k === 2 ? P.ink : P.white, a: 'middle' });
      sy -= b[2];
    });
    // open book
    var bx = 1240, by = T.back + 22;
    var pl = U.catmull([[bx, by - 4], [bx - 60, by - 14], [bx - 130, by - 8], [bx - 128, by + 14], [bx - 60, by + 8], [bx, by + 16]], 5, false);
    var pr = U.catmull([[bx, by + 16], [bx + 60, by + 8], [bx + 128, by + 14], [bx + 130, by - 8], [bx + 60, by - 14], [bx, by - 4]], 5, false);
    fg += S.shape(S.poly([[bx - 140, by - 2], [bx + 140, by - 2], [bx + 136, by + 22], [bx - 136, by + 22]], 30, 0.4), '#7a2e2a', { w: 2, extra: 2 });
    fg += S.shape(pl.concat([[bx, by + 16]]), '#f4eedf', { w: 2, extra: 1.8 }) + S.shape(pr, '#f4eedf', { w: 2, extra: 1.8 });
    fg += S.scribble(bx - 115, by - 4, 95, 2, 7, P.ink, 0.5) + S.scribble(bx + 18, by - 4, 95, 2, 7, P.ink, 0.5);
    // phone with a chat on the screen
    var ph = U.xf(S.rrect(-34, -12, 68, 24, 5), 1440, T.back + 14, -4);
    fg += S.shape(ph, '#232629', { w: 2, extra: 1.6 }) + S.fillOnly(U.xf(S.rect(-28, -8, 56, 16), 1440, T.back + 14, -4), '#cfe6f0');
    fg += S.dot(1428, T.back + 12, 3, '#5f8f86') + S.dot(1446, T.back + 16, 3, '#e9dfc4');
    fg += S.glow(1440, T.back + 4, 60, 18, '#cfe6f0', 0.4);
    // pencil
    fg += S.line([[1340, T.front - 6], [1410, T.front - 12]], { w: 5, ta: 0.02, tb: 0.3, min: 0.5 }, '#d6a03c');

    var motes = [];
    for (i = 0; i < 26; i++) motes.push([S.r(), S.r(), 0.6 + S.r() * 1.6, S.r() * 6]);
    return {
      bg: bg, fg: fg,
      amb: {
        dust: function (t) {
          var d = '';
          motes.forEach(function (m) {
            var v = (m[1] + t * 0.015 * m[2]) % 1, u = m[0] + 0.02 * Math.sin(t * 0.7 + m[3]);
            var yy = WIN.y + 140 + v * 760, half = 140 + v * 300, cx = 960 + v * 260;
            d += 'M' + f1(cx + (u - 0.5) * 2 * half) + ' ' + f1(yy) + 'h0';
          });
          return '<path d="' + d + '" stroke="#fff6dc" stroke-width="3.2" stroke-linecap="round" opacity=".6"/>';
        }
      }
    };
  }

  A.define('library-grammar', {
    seed: 305, ambient: true, build: build,
    slots: {
      table:  A.slot(780, 990, 0.95, { face: 1, seated: true, seatY: 690 }),   // behind the reading table, facing book + phone
      left:   A.slot(250, 995, 1.02, { face: 1 }),                             // in front of the left shelves
      center: A.slot(960, 1000, 1.04),
      right:  A.slot(1690, 995, 1.02, { face: -1 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
