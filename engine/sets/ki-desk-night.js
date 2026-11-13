/* ki-desk-night — Melo's desk late at night, the only light is the laptop: cold blue-white screen spill on the wall,
 * the desk top and Melo's face (fg glow), the desk lamp is OFF. Chat window on the laptop (bubbles + blinking cursor),
 * tea mug with steam, sticky notes „Tag 1 … 3" over the desk, dark bookshelf on the left, window with venetian blinds
 * and a warm street lamp behind them on the right (light stripes on the wall).
 * Variant `tag30`: the wall above the desk is covered with notes „Tag 1 … Tag 30", crumpled paper, more mugs.
 * fg = desk + laptop + mug (slot `desk` = behind the desk, chest-up, facing the laptop).
 * Free desk top for props: x 1150–1460 at y ≈ 560–650. Ambient: cursor / typing dots / steam. (Set A, kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var WALL_Y = 800, DK = { x0: 470, x1: 1560, top: 668, yf: 694, yl: 975 };
  var SCR = [[884, 452], [1078, 458], [1062, 646], [866, 644]];   // laptop screen quad
  var WIN = { x: 1500, y: 150, w: 340, h: 410 };
  var COLD = '#bfe6f5';

  function crumple(S, x, y, r) {
    var pts = [], n = 9;
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, rr = r * (0.75 + S.r() * 0.4); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85]); }
    return S.shape(pts, '#e9e2cf', { w: 1.6, extra: 1.4 }) + S.lines([[[x - r * 0.5, y - r * 0.2], [x + r * 0.1, y + r * 0.3]], [[x, y - r * 0.5], [x + r * 0.4, y]]], { w: 1.1, ta: 0.2, tb: 0.2 }, P.ink, ' opacity=".6"');
  }

  function build(S, opts) {
    var bg = '', fg = '', i, v30 = opts.variant === 'tag30';
    // ── wall: cold slate, brightened by the screen ──
    bg += S.wall(0, WALL_Y, '#34404c', { top: 60, op: 0.38, side: 0.1 });
    bg += S.stripes(0, WALL_Y, 72, '#222a33', 0.2);
    bg += S.glow(980, 470, 780, 430, '#9fd0e6', 0.32);
    bg += S.glow(980, 560, 360, 220, COLD, 0.28);
    // floor: dark boards, screen pool
    bg += S.floor(WALL_Y, { kind: 'boards', fill: '#2c2f36', gap: 130, vx: 980, lop: 0.5, hop: 0.22 });
    bg += S.glow(1000, 870, 520, 70, '#9fd0e6', 0.16);
    bg += S.skirting(WALL_Y, 16, '#1f262e');

    // ── bookshelf in the shadow (left) ──
    var BX = 40, BW = 330;
    bg += S.drop(BX, 130, BW, WALL_Y - 120, 14, 0);
    bg += S.box(BX, 130, BW, WALL_Y - 120 + 6, '#3b3029', { w: 3, extra: 3.4 });
    for (i = 0; i < 4; i++) {
      var sy = 300 + i * 150;
      bg += S.fillOnly(S.rect(BX + 16, sy - 140, BW - 32, 140), '#241d19');
      bg += S.books(BX + 22, BX + BW - (i === 1 ? 120 : 30), sy, 118, ['#5a3a3a', '#3e4f45', '#6b5a3a', '#34404c', '#7a6a55', '#4a3f5a']);
      bg += S.box(BX + 8, sy, BW - 16, 14, '#4a3a2e', { w: 2, extra: 2, hatch: false });
    }
    bg += S.plant(BX + BW - 64, 296, 110, { n: 7, pot: '#7a5a4a' });
    bg += S.hatch(S.rect(BX, 130, BW, WALL_Y - 114), { ang: 62, gap: 7, w: 1.4, op: 0.45, color: '#0e1218' });   // in shadow

    // ── window with venetian blinds + warm street lamp outside (right) ──
    var W = WIN, view = '';
    view += S.fillOnly(S.rect(W.x, W.y, W.w, W.h), S.linear([[0, '#141b28'], [1, '#2a3346']], 0, 0, 0, 1));
    view += S.glow(W.x + 230, W.y + 150, 170, 170, '#f2b860', 0.55) + S.dot(W.x + 230, W.y + 150, 9, '#ffe2a0');
    view += S.fillOnly([[W.x - 10, W.y + W.h], [W.x - 10, W.y + 300], [W.x + 90, W.y + 280], [W.x + 90, W.y + 250], [W.x + 170, W.y + 250], [W.x + 170, W.y + 300], [W.x + W.w + 10, W.y + 310], [W.x + W.w + 10, W.y + W.h]], '#10141c');
    [[W.x + 30, W.y + 330], [W.x + 120, W.y + 290], [W.x + 250, W.y + 345]].forEach(function (q) { view += S.fillOnly(S.rect(q[0], q[1], 16, 20, 20, 0.5), '#e9b85c', ' opacity=".8"'); });
    var sl = [];
    for (var by = W.y + 20; by < W.y + W.h - 10; by += 24) view += S.fillOnly(S.rect(W.x, by, W.w, 15, 60, 0.4), '#c9c2ae', ' opacity=".82"'), sl.push([[W.x + 16, by + 15], [W.x + W.w - 16, by + 15]]);
    view += S.lines(sl, { w: 1.4, ta: 0.05, tb: 0.05, min: 0.5 }, P.ink, ' opacity=".55"');
    bg += S.window(W.x, W.y, W.w, W.h, { sky: '#1a2130', view: view, panes: [1, 1], frame: '#8f8a7c', night: true, sillCol: '#7d786c' });
    bg += S.seg(W.x + 60, W.y - 4, W.x + 60, W.y + W.h - 40, 1.4, '#d8d0bc') + S.circ(W.x + 60, W.y + W.h - 34, 5, '#d8d0bc', { w: 1, extra: 0.6 });
    // warm blind stripes on the wall left of the window + on the floor
    for (i = 0; i < 6; i++) bg += A.shaft([[W.x - 40 - i * 4, 300 + i * 42], [W.x - 330, 360 + i * 46], [W.x - 330, 372 + i * 46], [W.x - 40 - i * 4, 312 + i * 42]], '#f2b860', 0.08);

    // ── office chair behind the desk (bg) ──
    var cb = U.catmull([[620, 720], [608, 560], [700, 530], [792, 560], [780, 720]], 5, true);
    bg += S.shape(cb, '#2a2d33', { w: 2.6, extra: 2.6 }) + S.hatch(cb, { ang: 70, gap: 7, w: 1.2, op: 0.4, color: '#000' });

    // ── sticky notes on the wall ──
    var notes = '';
    if (!v30) {
      notes += S.note(1150, 360, 92, 80, -5, P.yellow, ['Tag 1'], { fs: 26 });
      notes += S.note(1262, 352, 92, 80, 4, '#bfe0c4', ['Tag 2'], { fs: 26 });
      notes += S.note(1206, 446, 92, 80, -2, '#f2b6a6', ['Tag 3'], { fs: 26, tape: true });
    } else {
      var cols = [P.yellow, '#bfe0c4', '#f2b6a6', '#a9cde0'], k = 1;
      for (var r = 0; r < 5; r++) for (var c = 0; c < 6; c++, k++) {
        var x = 520 + c * 162 + (r % 2) * 40 + (S.r() - 0.5) * 20, y = 150 + r * 92 + (S.r() - 0.5) * 12;
        if (x > 830 && x < 1110 && y > 400) continue;            // keep the screen glow clear
        notes += S.note(x, y, 96, 74, (S.r() - 0.5) * 12, cols[(r + c) % 4], ['Tag ' + k], { fs: 24, tape: S.r() < 0.4 });
        if (k <= 29 && S.r() < 0.35) notes += S.lines([[[x - 30, y - 18], [x + 30, y + 22]], [[x + 30, y - 18], [x - 30, y + 22]]], { w: 3, ta: 0.1, tb: 0.2 }, P.red, ' opacity=".7"');
      }
      for (i = 0; i < 5; i++) bg += crumple(S, 560 + S.r() * 1100, 960 + S.r() * 80, 18 + S.r() * 8);
    }
    bg += notes;
    bg += S.fillOnly(S.rect(0, 0, 1920, WALL_Y), 'rgba(20,30,48,.18)');            // night veil over the notes

    // ═════ fg: desk ═════
    fg += S.floorShadow(1010, 985, 560, 16, 0.35);
    var top = S.poly([[DK.x0 - 10, DK.top], [DK.x1 + 10, DK.top], [DK.x1 + 4, DK.yf], [DK.x0 - 4, DK.yf]], 40, 0.6);
    fg += S.box(DK.x0 + 10, DK.yf, 40, DK.yl - DK.yf, '#3a302a', { w: 2.4, extra: 2.4, hatch: 'r', hk: 0.5 });           // left leg
    fg += S.box(DK.x1 - 290, DK.yf, 280, DK.yl - DK.yf, '#4a3c33', { w: 3, extra: 3.2, hatch: 'r', hk: 0.25 });           // drawer unit
    for (i = 0; i < 3; i++) fg += S.box(DK.x1 - 274, DK.yf + 16 + i * 92, 248, 80, '#55463b', { w: 1.8, extra: 1.6, hatch: false }) + S.seg(DK.x1 - 180, DK.yf + 54 + i * 92, DK.x1 - 120, DK.yf + 54 + i * 92, 4, '#9a8a70');
    var mod = S.rect(DK.x0 + 50, DK.yf, DK.x1 - DK.x0 - 340, 230, 40, 0.6);                                              // modesty panel (hides the sitter's legs)
    fg += S.shape(mod, '#41352d', { w: 2.4, extra: 2.4 }) + S.hatch(mod, { ang: 80, gap: 9, w: 1.2, op: 0.35 }) + S.fillOnly(S.rect(DK.x0 + 50, DK.yf, DK.x1 - DK.x0 - 340, 30), 'rgba(0,0,0,.25)');
    fg += S.shape(top, '#5e4a3c', { w: 3, extra: 3.4 }) + A.shadeSide(S, top, [0, 1], 0.2, { ang: 10, gap: 6, op: 0.4 });
    fg += S.glow(990, DK.top + 10, 300, 22, COLD, 0.55);
    // laptop: base + screen (chat window)
    var base = S.poly([[848, 652], [1088, 652], [1110, 674], [826, 674]], 30, 0.5);
    fg += S.shape(base, '#9aa3ab', { w: 2.4, extra: 2.4 }) + S.hatch(base, { ang: 0, gap: 4, w: 1, op: 0.3 });
    var lid = [[876, 444], [1088, 450], [1070, 652], [858, 650]];
    fg += S.shape(S.poly(lid, 30, 0.5), '#6f7880', { w: 3, extra: 3 });
    var scr = S.poly(SCR, 30, 0.4), cl = S.clip(scr), ui = '';
    ui += S.fillOnly(S.rect(850, 440, 240, 220), '#dcecf0');
    ui += S.fillOnly(S.rect(850, 440, 240, 26), '#3d5866') + S.dot(898, 466, 0, '#fff');
    ui += S.T(970, 461, 'KI-Chat', { f: 'Oswald', s: 15, c: '#e6f2f5', a: 'middle' });
    ui += S.fillOnly(S.rrect(882, 480, 110, 34, 9), '#f6f2e6') + S.scribble(892, 493, 86, 2, 11, '#3a4a55', 0.6);
    ui += S.fillOnly(S.rrect(950, 524, 104, 26, 9), '#8fc3b4') + S.scribble(960, 537, 80, 1, 10, '#24413a', 0.7);
    ui += S.fillOnly(S.rrect(880, 560, 124, 34, 9), '#f6f2e6') + S.scribble(890, 573, 100, 2, 11, '#3a4a55', 0.6);
    ui += S.fillOnly(S.rrect(880, 606, 168, 24, 7), '#ffffff') + S.seg(880, 630, 1048, 630, 1, '#9fb3bb');
    ui += '<!--amb:scr-->';
    fg += '<g clip-path="url(#' + cl + ')">' + ui + '</g>' + S.shape(scr, null, { w: 2.2, extra: 1.6 });
    fg += S.hatch(scr, { ang: -50, gap: 7, w: 1.3, op: 0.18, color: '#ffffff', cond: function (X, Y) { var u = X + Y * 0.7; return u > 1270 && u < 1300; } });
    // tea mug + spoon + phone face-down
    fg += S.mug(1150, DK.top + 6, 50, 52, '#c9d6d8', { top: '#8a5a2a' }) + '<!--amb:tea-->';
    fg += S.shape(S.poly([[620, 676], [740, 672], [744, 690], [624, 692]], 30, 0.5), '#232629', { w: 1.8, extra: 1.4 });   // phone (left of Melo's hands)
    // desk lamp — switched OFF
    var lb = [1490, DK.top];
    fg += S.shape(S.ellipse(lb[0], lb[1] - 4, 48, 10, 24), '#3d4348', { w: 2, extra: 2 });
    fg += S.line([[lb[0], lb[1] - 8], [lb[0] - 20, 520], [lb[0] - 90, 470]], { w: 7, ta: 0.02, tb: 0.02, min: 0.9 }, '#3d4348');
    var sh = U.catmull([[lb[0] - 120, 450], [lb[0] - 70, 440], [lb[0] - 40, 500], [lb[0] - 140, 530]], 5, true);
    fg += S.shape(sh, '#2f4a3a', { w: 2.4, extra: 2.6 }) + S.hatch(sh, { ang: 60, gap: 6, w: 1.1, op: 0.5 });
    if (v30) {
      fg += S.mug(560, DK.top + 6, 44, 46, '#e9dfc4', { top: '#3a1c12' }) + S.mug(1400, DK.top + 6, 44, 48, '#c43d33', { top: '#3a1c12' });
      fg += crumple(S, 790, DK.top - 4, 16) + crumple(S, 1250, DK.top - 6, 18) + crumple(S, 1330, DK.top - 2, 14);
    }
    // cold light on Melo's face / chest (in front of the characters)
    fg += S.glow(760, 520, 190, 230, COLD, 0.2);

    var amb = {
      scr: function (t) {
        var on = Math.floor(t * 1.8) % 2 === 0, s = '';
        if (on) s += '<rect x="890" y="611" width="3" height="14" fill="#2c333b"/>';
        for (var k = 0; k < 3; k++) {
          var a = Math.max(0, Math.sin(t * 5 - k * 0.9));
          s += '<circle cx="' + f1(974 + k * 12) + '" cy="' + f1(588 - a * 3) + '" r="3.4" fill="#5f8f86" opacity="' + f1(0.35 + 0.6 * a) + '"/>';
        }
        s += '<rect x="850" y="440" width="240" height="220" fill="#ffffff" opacity="' + f1(0.04 + 0.03 * Math.sin(t * 7.3) * Math.sin(t * 2.1)) + '"/>';
        return s;
      },
      tea: function (t) {
        var Sa = A.ambInk('ki-desk-night', 3);
        return Sa.steam(1150, DK.top - 52, 60, t, 0.35);
      }
    };
    return { bg: bg, fg: fg, amb: amb };
  }

  A.define('ki-desk-night', {
    seed: 301, ambient: true, build: build, variants: ['tag30'],
    slots: {
      desk:   A.slot(700, 990, 0.95, { face: 1, seated: true, seatY: 700 }),   // behind the desk, facing the laptop
      left:   A.slot(250, 990, 1.02, { face: 1 }),                             // in front of the dark bookshelf
      center: A.slot(980, 995, 1.02),
      right:  A.slot(1700, 995, 1.02, { face: -1 })                            // under the window
    }
  });
})(typeof self !== 'undefined' ? self : this);
