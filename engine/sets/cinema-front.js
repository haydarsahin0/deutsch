/* cinema-front — cinema entrance at night: neon "KINO" sign, marquee with chasing bulbs, film posters, glass doors
 * with warm light, ticket booth, neighbouring houses, street lamp, wet street. Ambient: bulbs chase, neon flickers.
 * (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var WALK_Y = 860, CURB_Y = 1000;
  var MQ = { x0: 400, x1: 1520, y0: 330, y1: 470 };

  function poster(S, x, y, w, h, kind) {
    var s = S.box(x - 12, y - 12, w + 24, h + 24, '#3b2f25', { w: 3, extra: 3.5, hatch: false });
    s += S.box(x - 4, y - 4, w + 8, h + 8, '#d8b25a', { w: 1.6, extra: 1.2, hatch: false });
    var r = S.rect(x, y, w, h, 30, 0.6), cid = S.clip(r), art = '';
    if (kind === 0) { // romance in Berlin: TV tower + heart
      art += S.fillOnly(S.rect(x, y, w, h), '#e7a07a') + S.circ(x + w / 2, y + h * 0.36, w * 0.3, '#f3d27a', { w: 0 });
      art += S.line([[x + w * 0.5, y + h * 0.82], [x + w * 0.5, y + h * 0.12]], { w: 6, ta: 0.02, tb: 0.3, min: 0.5 }) + S.circ(x + w * 0.5, y + h * 0.36, 14, '#c9c2b0', { w: 2, extra: 1.6 });
      art += S.fillOnly(S.poly([[x, y + h], [x, y + h * 0.78], [x + w * 0.2, y + h * 0.72], [x + w * 0.4, y + h * 0.8], [x + w * 0.7, y + h * 0.7], [x + w, y + h * 0.76], [x + w, y + h]], 20, 2), '#3a3040');
      art += S.T(x + w / 2, y + h * 0.95, 'LIEBE IN BERLIN', { f: 'Oswald', s: w * 0.11, c: '#f3ead3', ls: 1, a: 'middle' });
    } else if (kind === 1) { // monster melon
      art += S.fillOnly(S.rect(x, y, w, h), '#2a3a34') + S.circ(x + w / 2, y + h * 0.48, w * 0.36, P.greenM, { w: 3, extra: 3 });
      art += S.fillOnly(S.poly([[x + w * 0.2, y + h * 0.42], [x + w * 0.8, y + h * 0.42], [x + w * 0.7, y + h * 0.52], [x + w * 0.3, y + h * 0.52]], 20, 1), P.red);
      art += S.dot(x + w * 0.4, y + h * 0.36, 6, P.yellow) + S.dot(x + w * 0.6, y + h * 0.36, 6, P.yellow);
      art += S.T(x + w / 2, y + h * 0.12, 'DIE MONSTER-', { f: 'Anton', s: w * 0.13, c: P.yellow, a: 'middle' }) + S.T(x + w / 2, y + h * 0.93, 'MELONE', { f: 'Anton', s: w * 0.2, c: P.red, a: 'middle' });
    } else if (kind === 2) { // western
      art += S.fillOnly(S.rect(x, y, w, h), '#e3b866') + S.circ(x + w * 0.5, y + h * 0.42, w * 0.32, '#f2d58a', { w: 0 });
      art += S.fillOnly(S.poly([[x, y + h], [x, y + h * 0.66], [x + w, y + h * 0.7], [x + w, y + h]], 20, 2), '#a8642e');
      art += S.line([[x + w * 0.3, y + h * 0.68], [x + w * 0.3, y + h * 0.44], [x + w * 0.22, y + h * 0.5]], { w: 7, ta: 0.05, tb: 0.05 }) + S.line([[x + w * 0.3, y + h * 0.52], [x + w * 0.38, y + h * 0.46]], { w: 7, ta: 0.05, tb: 0.05 });
      art += S.T(x + w / 2, y + h * 0.16, 'DER LETZTE ZUG', { f: 'Fraunces', s: w * 0.11, c: '#3b2f25', a: 'middle' });
    } else { // comedy: falling piano
      art += S.fillOnly(S.rect(x, y, w, h), '#9fc3c9') + S.box(x + w * 0.3, y + h * 0.3, w * 0.4, h * 0.2, P.ink, { w: 2, extra: 2, hatch: false });
      art += S.lines([[[x + w * 0.35, y + h * 0.26], [x + w * 0.3, y + h * 0.16]], [[x + w * 0.65, y + h * 0.26], [x + w * 0.7, y + h * 0.16]]], { w: 3, ta: 0.05, tb: 0.6 });
      art += S.T(x + w / 2, y + h * 0.75, 'NA UND?', { f: 'Anton', s: w * 0.22, c: P.red, a: 'middle' }) + S.T(x + w / 2, y + h * 0.88, 'eine Komödie', { f: 'Caveat', s: w * 0.12, a: 'middle' });
    }
    s += '<g clip-path="url(#' + cid + ')">' + art + '</g>' + S.shape(r, null, { w: 2, extra: 1.4 });
    return s;
  }
  function house(S, x0, x1, top, col, lit) {
    var s = '', pts = S.poly([[x0, WALK_Y], [x0, top], [x1, top], [x1, WALK_Y]], 40, 1);
    s += S.shape(pts, col, { w: 3, extra: 3.4 });
    s += S.hatch(pts, { ang: 70, gap: 9, w: 1.2, op: 0.35 });
    var cols = Math.max(1, Math.floor((x1 - x0 - 40) / 110)), k = 0;
    for (var r = 0; r < 4; r++) for (var c = 0; c < cols; c++) {
      var wx = x0 + 40 + c * 110, wy = top + 50 + r * 150;
      if (wy + 90 > WALK_Y - 140) continue;
      var on = lit.indexOf(k++) >= 0;
      if (on) s += S.glow(wx + 30, wy + 45, 70, 80, '#ffd98a', 0.35);
      s += S.box(wx, wy, 60, 90, on ? '#f6d48a' : '#2c3644', { w: 2.4, extra: 2.4, hatch: false });
      s += S.seg(wx + 30, wy, wx + 30, wy + 90, 2) + S.seg(wx, wy + 40, wx + 60, wy + 40, 2);
      if (on) s += S.box(wx + 2, wy + 2, 24, 86, '#c4553f', { w: 1, extra: 0.6, step: 30, hatch: false });
    }
    return s;
  }

  function build(S) {
    var bg = '';
    var NIGHT = '#1f2a3a';
    // ── night sky, moon, stars ──
    bg += S.fillOnly(S.rect(-20, -20, 1960, 1120), NIGHT);
    bg += S.glow(1700, 120, 300, 200, '#5a6a86', 0.4);
    bg += S.circ(1730, 110, 44, '#f1e8c8', { w: 2.4, extra: 2 }) + S.circ(1748, 100, 40, NIGHT, { w: 0 });
    var st = '', rr = U.rng(5);
    for (var i = 0; i < 60; i++) { var sx = rr() * 1920, sy = rr() * 300; st += 'M' + f1(sx) + ' ' + f1(sy) + 'h0'; }
    bg += '<path d="' + st + '" stroke="#f1e8c8" stroke-width="3.2" stroke-linecap="round" opacity=".7"/>';
    bg += S.hatch(S.rect(-20, -20, 1960, 420), { ang: 25, gap: 10, w: 1.3, op: 0.25, color: '#0c1118' });

    // ── neighbours ──
    bg += house(S, -40, 340, 120, '#4a3a3a', [1, 4]);
    bg += house(S, 1580, 1960, 210, '#3a4448', [0, 3, 5]);

    // ── cinema facade ──
    var fx0 = 330, fx1 = 1590, ftop = 70;
    var fac = S.poly([[fx0, WALK_Y], [fx0, ftop + 40], [fx0 + 40, ftop], [fx1 - 40, ftop], [fx1, ftop + 40], [fx1, WALK_Y]], 50, 1);
    bg += S.shape(fac, '#6b3f3a', { w: 3.6, extra: 4 });
    bg += S.hatch(fac, { ang: 0, gap: 14, w: 1.2, op: 0.25 });
    bg += A.shadeSide(S, fac, [0, -1], 0.5, { ang: 30, gap: 8, op: 0.4 });
    // art deco ribs
    [fx0 + 60, fx1 - 60].forEach(function (rx) { bg += S.box(rx - 20, ftop + 40, 40, MQ.y0 - ftop - 40, '#7d4a43', { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.4 }); });
    // neon KINO sign (glow = wide translucent strokes; ambient flicker)
    bg += S.box(760, 120, 400, 180, '#241c22', { w: 3, extra: 3.5, hatch: false });
    bg += '<!--amb:neon-->';
    // marquee
    var mq = S.poly([[MQ.x0 - 30, MQ.y1], [MQ.x0, MQ.y0], [MQ.x1, MQ.y0], [MQ.x1 + 30, MQ.y1]], 60, 1);
    bg += S.shape(mq, '#e6c26a', { w: 3.6, extra: 4 });
    bg += A.shadeSide(S, mq, [0, 1], 0.5, { ang: 10, gap: 6, op: 0.35 });
    bg += S.box(MQ.x0 + 60, MQ.y0 + 26, MQ.x1 - MQ.x0 - 120, MQ.y1 - MQ.y0 - 52, '#f6efd9', { w: 2.4, extra: 2.4, hatch: false });
    bg += S.T(960, MQ.y0 + 70, 'HEUTE: DIE MONSTER-MELONE', { f: 'Oswald', s: 40, ls: 3, a: 'middle' });
    bg += S.T(960, MQ.y0 + 108, '20:00 · 22:30 Uhr', { f: 'Oswald', s: 24, ls: 2, c: P.red, a: 'middle' });
    bg += '<!--amb:bulbs-->';
    // under-marquee soffit light
    bg += S.fillOnly(S.rect(MQ.x0 - 30, MQ.y1, MQ.x1 - MQ.x0 + 60, 24), 'rgba(20,14,10,.55)');
    // entrance: glass doors with warm interior
    var ex0 = 720, ex1 = 1200, ey = 520;
    bg += S.glow(960, 700, 520, 260, '#ffd98a', 0.4);
    bg += S.box(ex0 - 16, ey - 16, ex1 - ex0 + 32, WALK_Y - ey + 16, '#2e2420', { w: 3, extra: 3.5, hatch: false });
    var inside = S.linear([[0, '#ffe3a0'], [1, '#e9a85a']], 0, 0, 0, 1);
    // lobby behind the glass: warm light, ceiling lamp, popcorn machine, carpet
    bg += S.box(ex0, ey, ex1 - ex0, WALK_Y - ey - 4, inside, { w: 0, extra: 0, hatch: false });
    bg += S.fillOnly(S.rect(ex0, WALK_Y - 90, ex1 - ex0, 86), '#b5503e') + S.hatch(S.rect(ex0, WALK_Y - 90, ex1 - ex0, 86), { ang: 0, gap: 9, w: 1.2, op: 0.3 });
    bg += S.circ(820, ey + 40, 26, '#fff6d8', { w: 1.6, extra: 1.2 }) + S.circ(1100, ey + 40, 26, '#fff6d8', { w: 1.6, extra: 1.2 });
    bg += S.box(990, 630, 100, 140, '#c43d33', { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.3 }) + S.box(998, 640, 84, 66, '#fff3c4', { w: 1.6, extra: 1.2, hatch: false });
    bg += S.stipple(S.rect(1000, 660, 76, 40), 40, { r: 7, op: 0.9, color: '#f6e7b0' });
    bg += S.T(1040, 750, 'POPCORN', { f: 'Oswald', s: 16, c: '#f3ead3', a: 'middle' });
    bg += S.box(800, 680, 140, 90, '#7d4a43', { w: 2, extra: 2, hatch: 'b', hk: 0.4 }) + S.T(870, 730, 'SNACKS', { f: 'Oswald', s: 18, c: '#f3ead3', a: 'middle' });
    for (i = 0; i < 3; i++) {
      var dx = ex0 + i * (ex1 - ex0) / 3 + 8, dw = (ex1 - ex0) / 3 - 16;
      var gl = S.rect(dx, ey, dw, WALK_Y - ey - 4, 40, 0.8);
      bg += S.fillOnly(gl, 'rgba(255,240,200,.18)') + S.shape(gl, null, { w: 5, extra: 3 });
      bg += S.hatch(gl, { ang: -55, gap: 9, w: 1.4, op: 0.3, color: '#ffffff', cond: function (X, Y) { var u = X - dx + (Y - ey) * 0.4; return u > dw * 0.2 && u < dw * 0.45; } });
      bg += S.seg(dx + dw - 22, ey + 150, dx + dw - 22, ey + 230, 6, '#c9b06a');
    }
    // posters in display cases
    bg += poster(S, 430, 520, 180, 260, 1) + poster(S, 1310, 520, 180, 260, 0);
    bg += poster(S, 620 - 10, 600, 80, 120, 2);
    // ticket booth
    var bx = 1640, bw = 200;
    bg += S.box(bx, 560, bw, WALK_Y - 560, '#7d4a43', { w: 3, extra: 3.5, hatch: 'r', hk: 0.2 });
    bg += S.box(bx + 20, 600, bw - 40, 120, '#ffe3a0', { w: 2.4, extra: 2.4, hatch: false });
    bg += S.box(bx - 10, 520, bw + 20, 50, '#e6c26a', { w: 2.6, extra: 3, hatch: 'b', hk: 0.4 });
    bg += S.T(bx + bw / 2, 556, 'KASSE', { f: 'Oswald', s: 30, ls: 4, a: 'middle' });
    bg += S.box(bx + 70, 690, 60, 30, '#3b2f25', { w: 1.6, extra: 1.2, hatch: false });

    // ── street lamp (left) ──
    var lx = 230;
    bg += S.glow(lx, 330, 220, 260, '#ffd98a', 0.35);
    bg += S.line([[lx, WALK_Y + 40], [lx, 360]], { w: 12, ta: 0.02, tb: 0.02, min: 0.9 }) + S.line([[lx, WALK_Y + 40], [lx, 360]], { w: 6, ta: 0.02, tb: 0.02, min: 0.9 }, '#3a4a4a');
    var lamp = S.poly([[lx - 34, 310], [lx + 34, 310], [lx + 22, 370], [lx - 22, 370]], 14, 0.8);
    bg += S.shape(lamp, '#ffe7a6', { w: 2.6, extra: 2.6 }) + S.box(lx - 40, 296, 80, 16, '#3a4a4a', { w: 2, extra: 2, hatch: false });

    // ── sidewalk + street ──
    bg += S.fillOnly(S.rect(-20, WALK_Y, 1960, CURB_Y - WALK_Y), '#5a5550');
    var pv = [];
    for (var y = WALK_Y + 34; y < CURB_Y; y += 34) pv.push([[-20, y], [1940, y]]);
    for (i = 0; i < 30; i++) { var px = i * 70 + (i % 2) * 35; pv.push([[px, WALK_Y], [px - 30, CURB_Y]]); }
    bg += S.lines(pv, { w: 1.4, ta: 0.05, tb: 0.05, min: 0.5 }, '#2a2622', ' opacity=".6"');
    bg += S.glow(960, WALK_Y + 60, 700, 90, '#ffd98a', 0.4);
    bg += S.line([[-20, WALK_Y], [1940, WALK_Y]], { w: 4, ta: 0.02, tb: 0.02, min: 0.6 });
    bg += S.box(-20, CURB_Y - 6, 1960, 18, '#8a847c', { w: 2.6, extra: 3, hatch: false });
    bg += S.fillOnly(S.rect(-20, CURB_Y + 12, 1960, 100), '#23262c');
    // wet reflections of the neon on the street (calm, low contrast)
    var refl = [];
    for (i = 0; i < 9; i++) { var rx = 420 + i * 135 + S.rand(-20, 20); refl.push([[rx, CURB_Y + 22], [rx + S.rand(-6, 6), CURB_Y + 60 + S.rand(0, 20)]]); }
    bg += S.lines(refl, { w: 6, ta: 0.3, tb: 0.6, min: 0.2 }, '#e6c26a', ' opacity=".22"');
    bg += S.lines([[[880, CURB_Y + 24], [884, CURB_Y + 70]], [[960, CURB_Y + 24], [958, CURB_Y + 76]], [[1040, CURB_Y + 24], [1044, CURB_Y + 66]]], { w: 10, ta: 0.3, tb: 0.6, min: 0.2 }, '#ff6a55', ' opacity=".25"');

    // ── ambient: chasing bulbs + neon flicker ──
    var bulbs = [];
    for (i = 0; i <= 28; i++) bulbs.push([MQ.x0 + (MQ.x1 - MQ.x0) * i / 28, MQ.y0 + 12]);
    for (i = 0; i <= 28; i++) bulbs.push([MQ.x0 - 26 + (MQ.x1 - MQ.x0 + 52) * i / 28, MQ.y1 - 12]);
    var neonPath = function (Sx) {
      var d = '';
      // K
      d += 'M800 160V270M800 215L860 160M812 205L862 270';
      // I
      d += 'M905 160V270';
      // N
      d += 'M950 270V160L1020 270V160';
      // O
      d += 'M1110 162C1150 162 1150 268 1110 268C1070 268 1070 162 1110 162Z';
      return d;
    };
    var amb = {
      bulbs: function (t) {
        var step = Math.floor(t * 8), on = '', off = '';
        bulbs.forEach(function (b, k) { var lit = (k + step) % 3 !== 0; (lit ? (on += 'M' + f1(b[0]) + ' ' + f1(b[1]) + 'h0') : (off += 'M' + f1(b[0]) + ' ' + f1(b[1]) + 'h0')); });
        return '<path d="' + on + '" stroke="#fff3b0" stroke-width="22" stroke-linecap="round" opacity=".35"/>' +
          '<path d="' + on + '" stroke="#fff6cf" stroke-width="11" stroke-linecap="round"/>' +
          '<path d="' + off + '" stroke="#8a6a3a" stroke-width="10" stroke-linecap="round"/>';
      },
      neon: function (t) {
        var fl = (Math.floor(t * 12) % 37 === 5 || Math.floor(t * 12) % 53 === 11) ? 0.35 : 1, d = neonPath();
        return '<g fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="' + fl + '">' +
          '<path d="' + d + '" stroke="#ff5a4a" stroke-width="34" opacity=".18"/>' +
          '<path d="' + d + '" stroke="#ff6a55" stroke-width="18" opacity=".45"/>' +
          '<path d="' + d + '" stroke="#ffd2c4" stroke-width="7"/></g>';
      }
    };
    return { bg: bg, amb: amb };
  }

  A.define('cinema-front', {
    seed: 61, ambient: true, build: build,
    slots: {
      left:     A.slot(520, 960, 1.0, { face: 1 }),
      center:   A.slot(960, 955, 1.0),
      right:    A.slot(1400, 960, 1.0, { face: -1 }),
      entrance: A.slot(960, 862, 0.86),                    // in the doorway
      kasse:    A.slot(1590, 965, 1.0, { face: 1 }),       // queuing at the ticket booth
      lamp:     A.slot(300, 965, 1.0, { face: 1 })         // under the street lamp
    }
  });
})(typeof self !== 'undefined' ? self : this);
