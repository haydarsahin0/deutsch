/* Set "kneipe" — German pub at night, seen over the bar: the counter (taps, Pils glasses, beer mats with tally marks)
 * is the FOREGROUND layer, so characters in the bar slots appear waist-up leaning on it. Behind them: nicotine-ochre wall,
 * dark panelling, bullseye-glass window, Stammtisch sign, pennants, team photo, dartboard + chalk score board, green lamps.
 * Slots: bar-left / bar-right (+ left/center/right) are behind the counter (feet hidden); back + dart stand in the room.
 * Illustrator B · see engine/sets/kit-b.js
 */
(function (root) {
  'use strict';
  var K = root.SetKitB || require('./kit-b.js');
  var P = K.P, U = K.U;
  var YW = 470, YF = 700, CT = 752; // wainscot top, wall/floor junction, counter top (back edge)
  var WALL = '#b8955a', PANEL = '#6b4a2f', PANEL_D = '#4e3522', BAR = '#4a3020', BAR_L = '#7a5236', BRASS = '#c9a24a';

  function room(S) {
    var s = '';
    s += S.wall(0, YW + 10, WALL, { top: 70, op: 0.5, side: 0.08, gap: 9 });
    s += S.stripes(40, YW, 46, P.woodDD, 0.08);
    // ceiling beam band
    s += S.fillOnly([[-20, -20], [1940, -20], [1940, 44], [-20, 40]], '#3b2a1c');
    s += S.line([[-20, 40], [1940, 44]], { w: 4, ta: 0.02, tb: 0.02, min: 0.6 });
    s += S.hatch([[-20, -20], [1940, -20], [1940, 44], [-20, 40]], { ang: 0, gap: 6, w: 1.2, op: 0.5 });
    // wainscot panelling
    s += S.fillOnly([[-20, YW], [1940, YW], [1940, YF], [-20, YF]], PANEL);
    s += S.box(-20, YW - 14, 1960, 22, BAR_L, { w: 3, extra: 3.5, hatch: 'b', hk: 0.5 });
    for (var x = 10; x < 1920; x += 150) {
      s += S.box(x, YW + 30, 118, YF - YW - 56, '#77533a', { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.2, hop: 0.5 });
    }
    s += S.hatch([[-20, YW], [1940, YW], [1940, YF], [-20, YF]], { ang: 75, gap: 8, w: 1.1, op: 0.25 });
    // floor strip (dark boards)
    s += S.fillOnly([[-20, YF], [1940, YF], [1940, 1100], [-20, 1100]], '#3e2c1f');
    s += S.line([[-20, YF], [1940, YF + 1]], { w: 4, ta: 0.02, tb: 0.02, min: 0.6 });
    s += S.hatch([[-20, YF + 4], [1940, YF + 4], [1940, 820], [-20, 820]], { ang: 0, gap: 7, w: 1.2, op: 0.45 });
    return s;
  }

  // window with bullseye glass ("Butzenscheiben") and red curtains
  function butzenWindow(S) {
    var s = '', x = 96, y = 104, w = 300, h = 300;
    s += S.drop(x - 10, y - 10, w + 20, h + 20, 10, 12, 'rgba(23,19,15,.35)');
    s += S.box(x - 12, y - 12, w + 24, h + 24, P.woodDD, { w: 3.4, extra: 4 });
    var glass = S.rect(x, y, w, h, 40, 0.6);
    s += S.fillOnly(glass, S.linear([[0, '#2a3346'], [1, '#4a4a52']], 0, 0, 0, 1));
    var g = '';
    g += S.glow(x + w * 0.7, y + h * 0.3, 130, 130, '#f6d48a', 0.55); // street lamp outside
    var rr = 23, L = [];
    for (var j = 0; j < 7; j++) for (var i = 0; i < 7; i++) {
      var cx = x + rr + i * 2 * rr * 0.97 + (j % 2) * rr * 0.5 - 6, cy = y + rr + j * 2 * rr * 0.92;
      g += '<circle cx="' + U.f1(cx) + '" cy="' + U.f1(cy) + '" r="' + (rr - 3) + '" fill="#e9d79a" opacity=".16"/>';
      L.push(S.ellipse(cx, cy, rr - 2, rr - 2, 18, 0.03).concat([S.ellipse(cx, cy, rr - 2, rr - 2, 18)[0]]));
      L.push(S.ellipse(cx, cy, 6, 6, 10, 0.05).concat([S.ellipse(cx, cy, 6, 6, 10)[0]]));
    }
    g += S.lines(L, { w: 1.7, ta: 0, tb: 0, min: 0.6, jit: 0.15 }, '#1b1510', ' opacity=".8"');
    s += '<g clip-path="url(#' + S.clip(glass) + ')">' + g + '</g>';
    s += S.box(x + w / 2 - 6, y, 12, h, P.woodDD, { w: 2, extra: 2, step: 60 });
    s += S.box(x, y + h / 2 - 6, w, 12, P.woodDD, { w: 2, extra: 2, step: 60 });
    s += S.shape(glass, null, { w: 2.6, extra: 2.4 });
    // curtains
    [[x - 40, 1], [x + w + 40, -1]].forEach(function (c) {
      var cx = c[0], d = c[1];
      var cu = U.catmull([[cx - 34 * d, y - 30], [cx + 46 * d, y - 30], [cx + 30 * d, y + 120], [cx + 58 * d, y + h + 40], [cx - 30 * d, y + h + 44], [cx - 38 * d, y + 120]], 5, true);
      s += S.shape(cu, '#8e2c25', { w: 2.6, extra: 3 });
      s += S.hatch(cu, { ang: 88, gap: 9, w: 1.4, op: 0.55 });
      s += S.lines([[[cx, y - 20], [cx + 6 * d, y + h + 30]], [[cx + 22 * d, y - 20], [cx + 30 * d, y + h + 34]]], { w: 2, ta: 0.1, tb: 0.3 }, P.ink, ' opacity=".6"');
    });
    s += S.box(x - 90, y - 44, w + 180, 16, P.woodDD, { w: 2.4, extra: 2.6, step: 60 });
    return s;
  }

  // Stammtisch: table in the back with the wrought-iron sign
  function stammtisch(S) {
    var s = '', x0 = 120, x1 = 470, ty = 612;
    // chair backs behind
    [180, 300, 420].forEach(function (cx) {
      s += S.box(cx - 34, ty - 96, 68, 100, '#5a3d27', { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.3 });
      s += S.box(cx - 22, ty - 82, 44, 30, '#7a5236', { w: 1.6, extra: 1.4, step: 20 });
    });
    s += S.box(x0, ty, x1 - x0, 20, BAR_L, { w: 3, extra: 3.5, hatch: 'b', hk: 0.5 });
    s += S.box(x0 + 20, ty + 20, 22, YF - ty - 14, PANEL_D, { w: 2, extra: 2, step: 40 });
    s += S.box(x1 - 42, ty + 20, 22, YF - ty - 14, PANEL_D, { w: 2, extra: 2, step: 40 });
    // the sign
    var px = 300;
    s += S.line([[px, ty], [px, 452]], { w: 6, ta: 0.02, tb: 0.02, min: 0.8 });
    s += S.line(U.catmull([[px, 470], [px - 30, 462], [px - 40, 440], [px - 22, 430], [px - 12, 446]], 5, false), { w: 3, ta: 0.1, tb: 0.3 });
    s += S.line(U.catmull([[px, 470], [px + 30, 462], [px + 40, 440], [px + 22, 430], [px + 12, 446]], 5, false), { w: 3, ta: 0.1, tb: 0.3 });
    var pl = S.rrect(px - 108, 376, 216, 58, 10);
    s += S.drop(px - 108, 376, 216, 58, 6, 8, 'rgba(23,19,15,.3)');
    s += S.shape(pl, '#2a2420', { w: 3, extra: 3 });
    s += S.shape(S.rrect(px - 100, 383, 200, 44, 7), null, { w: 1.6, extra: 0.6, color: BRASS });
    s += S.T(px, 416, 'STAMMTISCH', { f: 'Fraunces', s: 27, a: 'middle', c: BRASS, ls: 1 });
    s += S.line(U.catmull([[px - 60, 376], [px - 40, 350], [px, 342], [px + 40, 350], [px + 60, 376]], 6, false), { w: 3.4, ta: 0.05, tb: 0.05 });
    // glasses on the table
    [170, 250, 420].forEach(function (gx, i) { s += pils(S, gx, ty + 2, 0.55, i === 1 ? 0.4 : 1); });
    return s;
  }

  // tulip Pils glass (x centre, y bottom), sc scale, fill 0..1
  function pils(S, x, y, sc, fill) {
    var s = '', h = 150 * sc, w = 52 * sc;
    var gl = U.catmull([[x - w * 0.32, y - h * 0.12], [x - w * 0.5, y - h * 0.55], [x - w * 0.42, y - h], [x + w * 0.42, y - h], [x + w * 0.5, y - h * 0.55], [x + w * 0.32, y - h * 0.12]], 5, false);
    var beer = gl.filter(function (p) { return true; });
    var lvl = y - h * (0.12 + 0.8 * (fill == null ? 1 : fill));
    var cid = S.clip(gl.concat([[x + w * 0.32, y - h * 0.12], [x - w * 0.32, y - h * 0.12]]));
    s += S.fillOnly(gl, 'rgba(235,228,205,.35)');
    s += '<g clip-path="url(#' + cid + ')"><rect x="' + (x - w) + '" y="' + U.f1(lvl) + '" width="' + 2 * w + '" height="' + h + '" fill="#e2a334"/>' +
      '<rect x="' + (x - w) + '" y="' + U.f1(lvl - 22 * sc) + '" width="' + 2 * w + '" height="' + U.f1(24 * sc) + '" fill="#f4eedf"/>' +
      S.hatch(gl, { ang: 80, gap: 5 * Math.max(1, sc), w: 1, op: 0.35, cond: function (X) { return X > x + w * 0.15; } }) + '</g>';
    if (fill >= 0.95) s += S.shape(U.catmull([[x - w * 0.44, y - h - 2], [x - w * 0.3, y - h - 20 * sc], [x, y - h - 26 * sc], [x + w * 0.3, y - h - 20 * sc], [x + w * 0.44, y - h - 2]], 4, false), '#f4eedf', { w: 1.6, extra: 1.2 });
    s += S.shape(gl.concat([[x + w * 0.32, y - h * 0.12], [x - w * 0.32, y - h * 0.12]]), null, { w: 1.8 * Math.max(0.7, sc), extra: 1.6 });
    s += S.line([[x - w * 0.22, y - h * 0.8], [x - w * 0.28, y - h * 0.35]], { w: 2.6 * sc + 1, ta: 0.3, tb: 0.3 }, '#ffffff', ' opacity=".5"');
    // stem + foot
    s += S.line([[x, y - h * 0.12], [x, y - 4]], { w: 6 * sc + 2, ta: 0.02, tb: 0.02, min: 0.8 }, 'rgba(225,220,200,.9)');
    s += S.shape(S.ellipse(x, y - 3, w * 0.42, 6 * sc + 2, 20), 'rgba(225,220,200,.9)', { w: 1.4, extra: 1 });
    return s;
  }

  function middleWall(S) {
    var s = '';
    // pennants of the (invented) local club
    var pts = [], x0 = 520, x1 = 1420;
    for (var i = 0; i <= 30; i++) { var t = i / 30; pts.push([x0 + (x1 - x0) * t, 74 + 46 * 4 * t * (1 - t)]); }
    s += S.line(pts, { w: 2.2, ta: 0.02, tb: 0.02, min: 0.6 });
    for (var k = 1; k < 14; k++) {
      var q = pts[Math.round(k / 14 * 30)], tri = S.poly([[q[0] - 22, q[1]], [q[0] + 22, q[1]], [q[0], q[1] + 56]], 12, 1);
      s += S.shape(tri, k % 2 ? P.red : P.cream, { w: 2, extra: 2 });
    }
    // framed sepia team photo
    s += S.frame(560, 170, 300, 196, '#cdb68a', function (x, y, w, h) {
      var g = S.fillOnly(S.rect(x, y + h * 0.62, w, h * 0.4), '#b39b6e');
      for (var r = 0; r < 2; r++) for (var c = 0; c < 6; c++) {
        var hx = x + 30 + c * (w - 60) / 5 + r * 12, hy = y + 50 + r * 46;
        g += S.box(hx - 14, hy + 10, 28, 44, '#6b5638', { w: 1.2, extra: 1, step: 20 });
        g += S.circ(hx, hy, 11, '#8a7350', { w: 1.2, extra: 1 });
      }
      g += S.circ(x + w * 0.5, y + h - 18, 14, '#efe5cc', { w: 1.2, extra: 1 });
      return g + S.hatch(S.rect(x, y, w, h), { ang: 30, gap: 7, w: 1, op: 0.25 });
    }, { frame: P.woodDD });
    s += S.T(710, 392, 'SV Kernstadt 1907', { f: 'Caveat', s: 26, a: 'middle', c: '#2a1d12', op: 0.85 });
    // trophy shelf
    s += S.shelf(1000, 1330, 380, BAR_L);
    [[1050, 1, BRASS], [1130, 1.35, BRASS], [1210, 0.9, '#b9bcb4'], [1280, 1.1, BRASS]].forEach(function (tr) {
      var x = tr[0], k = tr[1], cup = U.catmull([[x - 22 * k, 380 - 70 * k], [x - 18 * k, 380 - 46 * k], [x, 380 - 36 * k], [x + 18 * k, 380 - 46 * k], [x + 22 * k, 380 - 70 * k]], 5, false);
      s += S.box(x - 14 * k, 380 - 16 * k, 28 * k, 16 * k, P.woodDD, { w: 1.6, extra: 1.4, step: 20 });
      s += S.line([[x, 380 - 16 * k], [x, 380 - 38 * k]], { w: 5 * k, ta: 0.02, tb: 0.02, min: 0.8 }, tr[2]);
      s += S.shape(cup, tr[2], { w: 2, extra: 2.2 });
      s += S.hatch(cup, { ang: 80, gap: 5, w: 1, op: 0.45, cond: function (X) { return X > x + 4; } });
      s += S.line([[x - 21 * k, 380 - 62 * k], [x - 34 * k, 380 - 56 * k], [x - 18 * k, 380 - 46 * k]], { w: 2.4, ta: 0.05, tb: 0.05 });
      s += S.line([[x + 21 * k, 380 - 62 * k], [x + 34 * k, 380 - 56 * k], [x + 18 * k, 380 - 46 * k]], { w: 2.4, ta: 0.05, tb: 0.05 });
    });
    // small framed alpine picture
    s += S.frame(1010, 168, 180, 140, '#9fb7b4', function (x, y, w, h) {
      return S.shape([[x - 4, y + h], [x + w * 0.3, y + h * 0.3], [x + w * 0.5, y + h * 0.55], [x + w * 0.72, y + h * 0.2], [x + w + 4, y + h]], '#7f8f86', { w: 1.6, extra: 1.2 }) +
        S.shape([[x + w * 0.24, y + h * 0.42], [x + w * 0.3, y + h * 0.3], [x + w * 0.36, y + h * 0.42]], P.white, { w: 1, extra: 0.6 }) +
        S.shape([[x + w * 0.65, y + h * 0.32], [x + w * 0.72, y + h * 0.2], [x + w * 0.79, y + h * 0.32]], P.white, { w: 1, extra: 0.6 });
    }, { frame: '#a07a3a' });
    // menu chalkboard
    s += S.drop(1220, 166, 120, 150, 8, 10);
    s += S.box(1220, 166, 120, 150, '#2a302b', { w: 3, extra: 3 });
    s += S.T(1280, 200, 'HEUTE', { f: 'Caveat', s: 26, a: 'middle', c: '#eee8d6' });
    s += S.T(1280, 236, 'Schnitzel', { f: 'Caveat', s: 22, a: 'middle', c: '#f2cf5b' });
    s += S.T(1280, 266, 'Pils 3,20', { f: 'Caveat', s: 22, a: 'middle', c: '#eee8d6' });
    s += S.T(1280, 296, 'Korn 2,–', { f: 'Caveat', s: 22, a: 'middle', c: '#eee8d6' });
    return s;
  }

  function dart(S) {
    var s = '', cx = 1586, cy = 282, R = 96;
    // cabinet with open doors
    s += S.drop(cx - 130, cy - 140, 260, 280, 12, 14, 'rgba(23,19,15,.3)');
    s += S.box(cx - 124, cy - 134, 248, 268, '#5a3d27', { w: 3.2, extra: 3.6 });
    s += S.fillOnly(S.rect(cx - 112, cy - 122, 224, 244, 30, 0.6), '#3b2a1c');
    s += S.shape(S.poly([[cx - 124, cy - 134], [cx - 210, cy - 116], [cx - 210, cy + 116], [cx - 124, cy + 134]], 30, 1), '#6b4a2f', { w: 2.8, extra: 3 });
    s += S.shape(S.poly([[cx + 124, cy - 134], [cx + 210, cy - 116], [cx + 210, cy + 116], [cx + 124, cy + 134]], 30, 1), '#6b4a2f', { w: 2.8, extra: 3 });
    s += S.T(cx - 167, cy - 56, 'Melo', { f: 'Caveat', s: 24, a: 'middle', c: '#eee8d6' }) + S.T(cx - 167, cy - 24, '501', { f: 'Caveat', s: 24, a: 'middle', c: '#eee8d6' }) +
      S.T(cx - 167, cy + 6, '437', { f: 'Caveat', s: 24, a: 'middle', c: '#eee8d6' }) + S.T(cx - 167, cy + 36, '380', { f: 'Caveat', s: 24, a: 'middle', c: '#f2cf5b' });
    s += S.T(cx + 167, cy - 56, 'Lena', { f: 'Caveat', s: 24, a: 'middle', c: '#eee8d6' }) + S.T(cx + 167, cy - 24, '501', { f: 'Caveat', s: 24, a: 'middle', c: '#eee8d6' }) +
      S.T(cx + 167, cy + 6, '312', { f: 'Caveat', s: 24, a: 'middle', c: '#eee8d6' }) + S.T(cx + 167, cy + 36, '140', { f: 'Caveat', s: 24, a: 'middle', c: '#f2cf5b' });
    s += S.seg(cx - 196, cy - 36, cx - 140, cy - 36, 1.6, '#eee8d6', ' opacity=".7"') + S.seg(cx + 140, cy - 36, cx + 196, cy - 36, 1.6, '#eee8d6', ' opacity=".7"');
    // board
    s += S.circ(cx, cy, R, '#1e1a16', { w: 3, extra: 3 });
    var seg = '';
    for (var i = 0; i < 20; i++) {
      var a0 = (i - 0.5) / 20 * Math.PI * 2 - Math.PI / 2, a1 = (i + 0.5) / 20 * Math.PI * 2 - Math.PI / 2;
      var col = i % 2 ? '#e8dcb8' : '#1e1a16', ring = i % 2 ? P.green : P.red;
      function wedge(r0, r1, c) { return '<path d="M' + U.f1(cx + r0 * Math.cos(a0)) + ' ' + U.f1(cy + r0 * Math.sin(a0)) + 'L' + U.f1(cx + r1 * Math.cos(a0)) + ' ' + U.f1(cy + r1 * Math.sin(a0)) + 'A' + r1 + ' ' + r1 + ' 0 0 1 ' + U.f1(cx + r1 * Math.cos(a1)) + ' ' + U.f1(cy + r1 * Math.sin(a1)) + 'L' + U.f1(cx + r0 * Math.cos(a1)) + ' ' + U.f1(cy + r0 * Math.sin(a1)) + 'A' + r0 + ' ' + r0 + ' 0 0 0 ' + U.f1(cx + r0 * Math.cos(a0)) + ' ' + U.f1(cy + r0 * Math.sin(a0)) + 'Z" fill="' + c + '"/>'; }
      seg += wedge(10, R * 0.72, col) + wedge(R * 0.72, R * 0.8, ring) + wedge(R * 0.42, R * 0.48, ring);
    }
    s += seg;
    s += S.circ(cx, cy, 10, P.green, { w: 1.2, extra: 0.8 }) + S.circ(cx, cy, 5, P.red, { w: 0.8, extra: 0.4 });
    s += S.shape(S.ellipse(cx, cy, R * 0.8, R * 0.8, 48, 0.005), null, { w: 1.4, extra: 0.6 });
    s += S.hatch(S.ellipse(cx, cy, R * 0.8, R * 0.8, 40), { ang: 40, gap: 6, w: 1, op: 0.25, cond: function (X, Y) { return (X - cx) + (Y - cy) > R * 0.5; } });
    // three darts stuck in it
    [[cx + 18, cy - 30, -20], [cx - 34, cy + 12, -32], [cx + 6, cy + 46, -14]].forEach(function (d) {
      var a = d[2] * Math.PI / 180, ex = d[0] + Math.cos(a) * 46, ey = d[1] + Math.sin(a) * 46 - 18;
      s += S.line([[d[0], d[1]], [ex, ey]], { w: 4, ta: 0.05, tb: 0.05, min: 0.8 }, '#b9bcb4');
      s += S.shape(S.poly([[ex, ey], [ex + 16, ey - 12], [ex + 22, ey + 2]], 8, 0.4), P.mustard, { w: 1.4, extra: 1 });
    });
    // oche line on the floor is out of view; a little lamp above the board
    s += S.pendant(cx, 44, 120, 90, '#2f4d26', { light: false });
    s += S.glow(cx, 230, 220, 190, P.glow, 0.25);
    return s;
  }

  function lamps(S) {
    var s = '';
    [[760, 150], [1170, 136]].forEach(function (l) {
      s += S.glow(l[0], l[1] + 160, 330, 260, P.glow, 0.35);
      s += S.pendant(l[0], 40, l[1], 118, '#2f5a30', { light: false });
    });
    return s;
  }

  // ── foreground: the counter ──
  function counter(S) {
    var s = '';
    // top surface (slight perspective: back edge CT, front edge 800)
    var top = [[-30, CT], [1950, CT - 4], [1950, 808], [-30, 812]];
    s += S.shape(top, '#6d4529', { w: 4, extra: 3 });
    s += S.lines([[[0, CT + 18], [700, CT + 16]], [[900, CT + 20], [1900, CT + 14]], [[200, CT + 38], [1100, CT + 36]]], { w: 2.4, ta: 0.2, tb: 0.3 }, '#e9c38a', ' opacity=".35"');
    s += S.hatch(top, { ang: 2, gap: 7, w: 1.1, op: 0.35 });
    // front: panelled, brass foot rail, very calm (subtitle band)
    var front = [[-30, 810], [1950, 806], [1950, 1100], [-30, 1100]];
    s += S.fillOnly(front, BAR);
    s += S.box(-30, 806, 1980, 26, '#5a3a25', { w: 3, extra: 3.5, hatch: 'b', hk: 0.5 });
    for (var x = 20; x < 1920; x += 240) s += S.box(x, 860, 200, 260, '#55372a', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.15, hop: 0.4 });
    s += S.hatch(front, { ang: 88, gap: 9, w: 1.1, op: 0.25 });
    s += '<rect x="-30" y="806" width="1980" height="300" fill="' + S.linear([[0, '#000', 0], [1, '#000', 0.25]], 0, 0, 0, 1) + '"/>';
    // beer mats + glasses (between the two bar slots, so hands/torsos stay free)
    function mat(cx, cy, tally) {
      var m = S.ellipse(cx, cy, 52, 15, 30, 0.01), g = S.shape(m, '#efe5cc', { w: 2, extra: 1.6 });
      g += S.shape(S.ellipse(cx, cy, 42, 11, 26, 0.01), null, { w: 1.2, extra: 0.4, color: P.red });
      if (tally) {
        var L = [];
        for (var i = 0; i < 7; i++) L.push([[cx - 28 + i * 7, cy - 6], [cx - 30 + i * 7, cy + 6]]);
        L.push([[cx - 32, cy + 4], [cx + 2, cy - 5]]);
        g += S.lines(L, { w: 1.6, ta: 0.1, tb: 0.2 });
      }
      return g;
    }
    s += mat(820, 784, false) + pils(S, 820, 786, 1.05, 1);
    s += mat(1120, 782, false) + pils(S, 1120, 784, 1.05, 0.55);
    s += mat(968, 790, true);
    s += S.line([[930, 778], [1000, 768]], { w: 5, ta: 0.05, tb: 0.4, min: 0.6 }, P.mustard); // pencil
    // peanut bowl on the left
    var bw = U.catmull([[160, 762], [170, 792], [230, 800], [290, 792], [300, 762]], 5, false);
    for (var n = 0; n < 9; n++) s += S.circ(180 + n * 12, 758 - (n % 3) * 6, 9, '#c98e4d', { w: 1.2, extra: 1, ry: 6 });
    s += S.shape(bw.concat([[300, 762]]), P.cream, { w: 2.4, extra: 2.6 });
    s += S.hatch(bw.concat([[300, 762]]), { ang: 80, gap: 6, w: 1, op: 0.4, cond: function (X) { return X > 250; } });
    // tap tower on the right
    var tx = 1650;
    s += S.fillOnly(S.rect(tx - 120, CT + 6, 240, 24, 20, 0.6), 'rgba(23,19,15,.4)');
    s += S.box(tx - 110, CT - 6, 220, 22, '#9a9d96', { w: 2.4, extra: 2.4, step: 40 });
    var col = S.rrect(tx - 32, 560, 64, CT - 560, 12);
    s += S.shape(col, '#b9bcb4', { w: 3, extra: 3.4 });
    s += S.hatch(col, { ang: 90, gap: 5, w: 1.1, op: 0.5, cond: function (X) { return X > tx + 8; } });
    s += S.line([[tx - 18, 576], [tx - 18, CT - 20]], { w: 4, ta: 0.2, tb: 0.2 }, '#ffffff', ' opacity=".6"');
    s += S.box(tx - 92, 560, 184, 26, '#b9bcb4', { w: 2.6, extra: 3, step: 40, hatch: 'b', hk: 0.4 });
    [[tx - 66, 'PILS', P.cream], [tx, 'HELL', P.mustard], [tx + 66, 'WEIZEN', P.red]].forEach(function (h) {
      s += S.line([[h[0], 586], [h[0], 612], [h[0] + 6, 622]], { w: 7, ta: 0.05, tb: 0.05, min: 0.8 }, '#8f928b');
      var hd = S.rrect(h[0] - 12, 446, 24, 110, 10);
      s += S.shape(hd, '#1e1a16', { w: 2, extra: 2 });
      s += S.box(h[0] - 18, 476, 36, 46, h[2], { w: 1.6, extra: 1.4, step: 20 });
      s += S.T(h[0], 504, h[1], { f: 'Oswald', s: h[1].length > 4 ? 9 : 11, a: 'middle', c: P.ink });
    });
    return s;
  }

  K.define('kneipe', {
    seed: 33,
    slots: {
      'bar-left': K.slot(620, 1010, 1.12, { face: 1, behind: 'counter' }),
      'bar-right': K.slot(1310, 1010, 1.12, { face: -1, behind: 'counter' }),
      left: K.slot(520, 1010, 1.12, { behind: 'counter' }), center: K.slot(965, 1012, 1.12, { behind: 'counter' }), right: K.slot(1400, 1010, 1.12, { behind: 'counter' }),
      back: K.slot(400, 745, 0.7, { face: 1 }),          // standing at the Stammtisch, in the room
      dart: K.slot(1500, 748, 0.72, { face: 1 })          // throwing darts
    },
    build: function () {
      return {
        bg: function (S) {
          var s = room(S) + butzenWindow(S) + middleWall(S) + stammtisch(S) + dart(S) + lamps(S);
          s += '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.45, '#1a1008', 0], [1, '#1a1008', 0.5]], { cx: '50%', cy: '40%', r: '75%' }) + '"/>';
          return s;
        },
        fg: function (S) { return counter(S); }
      };
    }
  });
})(typeof self !== 'undefined' ? self : this);
