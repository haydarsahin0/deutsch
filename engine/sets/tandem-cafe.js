/* tandem-cafe — a language café („Sprachcafé") in the evening: exposed brick + deep teal walls, warm string lights
 * (ambient twinkle), chalkboard „Sprachcafé · Tandem · heute 19 Uhr · Deutsch · Französisch · Englisch · Spanisch",
 * a window to the night street, another tandem pair as soft low-contrast silhouettes at a back table, counter with
 * an espresso machine on the right. fg = small round table for two with a cloth (two cups, open notebook; slots
 * `table-left` / `table-right`) + the counter (slot `counter` = behind it). Free table top: x 900–1020, y ≈ 600–660.
 * Ambient: string lights twinkle, steam from the cups. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var WALL_Y = 770, BRICK = 520, TB = { cx: 960, top: 676, rx: 245, ry: 28, cloth: 900 }, CT = { x0: 1530, top: 690 };

  function chair(S, x) {
    var cb = U.catmull([[x - 70, 700], [x - 74, 560], [x, 530], [x + 74, 560], [x + 70, 700]], 6, false);
    return S.line(cb, { w: 15, ta: 0.02, tb: 0.02, min: 0.9 }, '#2a1d14') + S.line(cb, { w: 8, ta: 0.02, tb: 0.02, min: 0.9 }, '#6b4a2f');
  }
  function figure(S, x, y, s, col, face) {   // soft background silhouette (seated, chest-up)
    var b = U.catmull([[x - 52 * s, y], [x - 46 * s, y - 70 * s], [x, y - 90 * s], [x + 46 * s, y - 70 * s], [x + 52 * s, y]], 5, true);
    return '<g opacity=".55">' + S.fillOnly(b, col) + S.fillOnly(S.ellipse(x + face * 6 * s, y - 128 * s, 34 * s, 40 * s, 30, 0.05), col) + '</g>';
  }

  function build(S) {
    var bg = '', fg = '', i;
    // walls: teal + exposed brick on the left, wainscot, floor
    bg += S.wall(0, WALL_Y, '#3d5a58', { top: 50, op: 0.34, side: 0.04 });
    var br = S.rect(-20, -20, BRICK + 20, WALL_Y + 20);
    bg += S.fillOnly(br, '#8a4a38');
    var BL = [];
    for (var by = 10, row = 0; by < WALL_Y; by += 34, row++) {
      BL.push([[-20, by], [BRICK, by + (S.r() - 0.5) * 2]]);
      for (var bx = (row % 2) * 45 - 20; bx < BRICK; bx += 90) BL.push([[bx, by], [bx, by + 34]]);
    }
    bg += S.lines(BL, { w: 1.6, ta: 0.05, tb: 0.05, min: 0.5 }, '#e3c9a8', ' opacity=".35"');
    bg += S.hatch(br, { ang: 28, gap: 9, w: 1.2, op: 0.3, cond: function (X, Y) { return Y < 120 || X < 40 || S.r() < 0.06; } });
    bg += S.line([[BRICK, -10], [BRICK + 2, WALL_Y]], { w: 4, ta: 0.02, tb: 0.02 });
    bg += S.fillOnly(S.rect(-20, 560, 1960, WALL_Y - 560), '#4a3426') + S.line([[-20, 560], [1940, 561]], { w: 7, ta: 0.02, tb: 0.02, min: 0.8 }, '#8d6236');
    for (var px = 20; px < 1920; px += 150) bg += S.box(px, 584, 120, WALL_Y - 610, '#55392a', { w: 1.8, extra: 1.8, hatch: false });
    bg += S.floor(WALL_Y, { kind: 'boards', fill: '#5e4330', gap: 110, vx: 960, lop: 0.5, hop: 0.24 });
    bg += S.skirting(WALL_Y, 12, '#2f2219');
    bg += S.glow(960, 420, 900, 420, '#ffcf80', 0.22);

    // ── chalkboard on the brick ──
    var C = { x: 80, y: 220, w: 380, h: 330 };
    bg += S.drop(C.x, C.y, C.w, C.h, 10, 12, 'rgba(20,10,5,.4)') + S.box(C.x - 14, C.y - 14, C.w + 28, C.h + 28, '#6b4a2f', { w: 3, extra: 3.4 }) + S.box(C.x, C.y, C.w, C.h, '#2b302c', { w: 2, extra: 1.6 });
    bg += S.hatch(S.rect(C.x, C.y, C.w, C.h), { ang: 20, gap: 13, w: 1.4, op: 0.12, color: '#e9e0c8' });
    bg += S.T(C.x + C.w / 2, C.y + 66, 'Sprachcafé', { f: 'Caveat', s: 60, c: '#f4eedf', a: 'middle' });
    bg += S.seg(C.x + 70, C.y + 84, C.x + C.w - 70, C.y + 86, 2, '#e9b85c');
    bg += S.T(C.x + C.w / 2, C.y + 140, 'Tandem', { f: 'Kalam', s: 40, c: '#e9b85c', a: 'middle' }) + S.T(C.x + C.w / 2, C.y + 188, 'heute 19 Uhr', { f: 'Kalam', s: 34, c: '#f4eedf', a: 'middle' });
    bg += S.T(C.x + C.w / 2, C.y + 250, 'Deutsch · Französisch', { f: 'Kalam', s: 24, c: '#cfd8c8', a: 'middle' }) + S.T(C.x + C.w / 2, C.y + 282, 'Englisch · Spanisch', { f: 'Kalam', s: 24, c: '#cfd8c8', a: 'middle' });
    bg += S.lines([U.catmull(S.ellipse(C.x + 50, C.y + 150, 26, 18, 8, 0.1), 3, true), [[C.x + 40, C.y + 166], [C.x + 32, C.y + 182]], U.catmull(S.ellipse(C.x + C.w - 50, C.y + 150, 26, 18, 8, 0.1), 3, true)], { w: 2, ta: 0.1, tb: 0.1 }, '#f4eedf', ' opacity=".8"');

    // ── window to the night street ──
    var W = { x: 600, y: 190, w: 300, h: 320 }, view = '';
    view += S.fillOnly(S.rect(W.x, W.y, W.w, W.h), S.linear([[0, '#1a2232'], [1, '#2e3a4a']], 0, 0, 0, 1));
    view += S.fillOnly(S.rect(W.x - 10, W.y + 120, 140, 220), '#232b38') + S.fillOnly(S.rect(W.x + 160, W.y + 80, 160, 260), '#283040');
    [[W.x + 30, W.y + 160], [W.x + 80, W.y + 220], [W.x + 200, W.y + 120], [W.x + 250, W.y + 200]].forEach(function (q) { view += S.fillOnly(S.rect(q[0], q[1], 24, 30, 20, 0.5), '#e9b85c', ' opacity=".85"'); });
    view += S.glow(W.x + 150, W.y + 60, 80, 60, '#f2c46a', 0.4);
    bg += S.window(W.x, W.y, W.w, W.h, { sky: '#1d2638', view: view, panes: [2, 2], frame: '#2f2219', night: true, sillCol: '#4a3426' });

    // ── background tandem pair (soft) + pendant ──
    bg += S.pendant(1380, -10, 300, 70, '#c9a043', { cone: 320, op: 0.28 });
    bg += figure(S, 1320, 690, 0.9, '#7d6a5a', 1) + figure(S, 1450, 690, 0.86, '#6a6f62', -1);
    bg += S.fillOnly(S.ellipse(1385, 690, 110, 14, 30), '#4a3426', ' opacity=".7"') + S.fillOnly(S.rect(1380, 690, 10, 90), '#2f2219', ' opacity=".7"');
    bg += S.mug(1350, 688, 22, 20, '#e9dfc4') + S.mug(1420, 688, 22, 20, '#e9dfc4');
    // back shelf behind the counter
    bg += S.shelf(1560, 1910, 470, P.woodD);
    for (i = 0; i < 5; i++) bg += S.mug(1590 + i * 44, 470, 30, 28, i % 2 ? '#f4eedf' : '#c9d6d8');
    bg += S.bottle(1830, 470, 80, '#8a5a36', { wr: 0.4, cap: P.ink }) + S.bottle(1880, 470, 70, '#c9a46a', { wr: 0.6, cap: P.red });
    // chairs behind the table slots
    bg += chair(S, 810) + chair(S, 1110);
    // string lights (wire static, bulbs ambient)
    var wire = U.catmull([[-20, 60], [480, 170], [960, 92], [1440, 176], [1940, 70]], 14, false);
    bg += S.line(wire, { w: 2, ta: 0.02, tb: 0.02, min: 0.7 }, '#1d140e');
    var bulbs = [];
    for (i = 3; i < wire.length - 2; i += 3) bulbs.push([wire[i][0], wire[i][1] + 12]);
    bg += '<!--amb:lights-->';

    // ═════ fg 1: round table with cloth ═════
    var T = TB;
    fg += S.floorShadow(T.cx, 985, 230, 14, 0.35);
    fg += S.shape(S.ellipse(T.cx, 975, 90, 12, 24), '#2a1d14', { w: 1.6, extra: 1 }) + S.line([[T.cx, T.cloth - 10], [T.cx, 972]], { w: 16, ta: 0.02, tb: 0.02, min: 0.9 }, '#2a1d14');
    var cl = U.catmull([[T.cx - T.rx - 4, T.top + 4], [T.cx - T.rx - 22, T.top + 120], [T.cx - T.rx - 14, T.cloth], [T.cx, T.cloth + 12], [T.cx + T.rx + 14, T.cloth], [T.cx + T.rx + 22, T.top + 120], [T.cx + T.rx + 4, T.top + 4]], 6, true);
    fg += S.shape(cl, '#d9c49a', { w: 3, extra: 3.2 }) + S.hatch(cl, { ang: 88, gap: 40, w: 1.6, op: 0.28 }) + A.shadeSide(S, cl, [1, 0.3], 0.3, { ang: 70, gap: 7, op: 0.35 });
    fg += S.lines([[[T.cx - T.rx - 10, T.top + 60], [T.cx + T.rx + 10, T.top + 60]], [[T.cx - T.rx - 16, T.top + 140], [T.cx + T.rx + 16, T.top + 140]]], { w: 3, ta: 0.05, tb: 0.05 }, P.red, ' opacity=".45"');
    fg += S.shape(S.ellipse(T.cx, T.top, T.rx, T.ry, 50), '#e6d6ae', { w: 3, extra: 3 });
    // two cups on saucers + open notebook + pen
    [[870, '#f4eedf'], [1050, '#c9d6d8']].forEach(function (c) {
      fg += S.shape(S.ellipse(c[0], T.top + 2, 34, 8, 20), '#efe9da', { w: 1.6, extra: 1 }) + S.mug(c[0], T.top, 40, 32, c[1], { top: '#6b3a1c' });
    });
    fg += '<!--amb:steam-->';
    var nb = U.xf(S.poly([[-70, -10], [70, -10], [78, 14], [-78, 14]], 20, 0.4), 960, T.top + 12, 2);
    fg += S.shape(nb, '#f4eedf', { w: 1.8, extra: 1.4 }) + S.seg(960, T.top + 2, 961, T.top + 26, 1.4) + S.scribble(905, T.top + 10, 46, 2, 6, P.blue, 0.6) + S.scribble(972, T.top + 10, 46, 2, 6, P.red, 0.6);

    // ═════ fg 2: counter ═════
    fg += S.box(CT.x0, CT.top, 1960 - CT.x0, 24, '#8d6236', { w: 3, extra: 3.4, hatch: 'b', hk: 0.4 });
    fg += S.box(CT.x0 + 10, CT.top + 24, 1940 - CT.x0, 990 - CT.top - 24, '#3d5a58', { w: 3, extra: 3.2 });
    for (var cx = CT.x0 + 34; cx < 1900; cx += 130) fg += S.box(cx, CT.top + 60, 100, 220, '#46655f', { w: 1.8, extra: 1.8, hatch: 'r', hk: 0.15 });
    var em = 1760;
    fg += S.box(em, CT.top - 150, 170, 150, '#b5bcbc', { w: 3, extra: 3.2, hatch: 'r', hk: 0.25 }) + S.box(em + 8, CT.top - 166, 154, 18, '#8a9093', { w: 2, extra: 2, hatch: false });
    fg += S.circ(em + 50, CT.top - 104, 14, '#f4eedf', { w: 1.6, extra: 1.2 }) + S.circ(em + 120, CT.top - 104, 14, '#f4eedf', { w: 1.6, extra: 1.2 }) + S.mug(em + 85, CT.top - 6, 30, 24, '#f4eedf');
    fg += S.bottle(1600, CT.top, 56, 'rgba(220,235,230,.6)', { wr: 0.7 }) + S.T(1600, CT.top - 18, 'Trinkgeld', { f: 'Caveat', s: 15, a: 'middle' });

    return {
      bg: bg, fg: fg,
      amb: {
        lights: function (t) {
          var glow = '', on = '';
          bulbs.forEach(function (b, k) {
            var a = 0.75 + 0.25 * Math.sin(t * 2.6 + k * 1.9) * Math.sin(t * 1.1 + k);
            glow += '<circle cx="' + f1(b[0]) + '" cy="' + f1(b[1]) + '" r="' + f1(16 + 7 * a) + '" fill="#ffe7a0" opacity="' + f1(0.22 * a) + '"/>';
            on += 'M' + f1(b[0]) + ' ' + f1(b[1]) + 'h0';
          });
          return glow + '<path d="' + on + '" stroke="' + P.ink + '" stroke-width="14" stroke-linecap="round"/><path d="' + on + '" stroke="#fff3c4" stroke-width="9" stroke-linecap="round"/>';
        },
        steam: function (t) {
          var Sa = A.ambInk('tandem-cafe', 7);
          return Sa.steam(870, TB.top - 40, 46, t, 0.3) + Sa.steam(1050, TB.top - 40, 46, t + 1.3, 0.3);
        }
      }
    };
  }

  A.define('tandem-cafe', {
    seed: 307, ambient: true, build: build,
    slots: {
      'table-left':  A.slot(810, 990, 0.93, { face: 1, seated: true, seatY: 712 }),
      'table-right': A.slot(1110, 990, 0.93, { face: -1, seated: true, seatY: 712 }),
      counter: A.slot(1690, 880, 0.88, { face: -1 }),            // behind the counter (legs hidden)
      left:    A.slot(300, 995, 1.02, { face: 1 }),               // under the chalkboard
      right:   A.slot(1420, 995, 1.02, { face: -1 })              // in front of the back table
    }
  });
})(typeof self !== 'undefined' ? self : this);
