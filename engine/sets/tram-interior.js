/* tram-interior — inside a German Straßenbahn by day, looking across the aisle: long side wall with big windows
 * (the city slides past — ambient), sideways benches in red-orange moquette left and right, double doors in the
 * middle with yellow grab poles, ceiling handrail with hanging straps, amber LED route display
 * „Linie 5 · Hauptbahnhof", line map strip, stop-request button, ticket validator. Cool daylight.
 * fg = the seat cushions' front panels (seated slots `seat-left` / `seat-right` hide the legs). Ambient. (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var FLOOR_Y = 830, WY0 = 230, WY1 = 560;                  // window band
  var WINS = [[70, 560], [700, 930], [990, 1220], [1360, 1850]];   // window x-ranges (doors in the middle two)
  var BL = { x0: 90, x1: 560, seat: 760 }, BR = { x0: 1370, x1: 1840, seat: 760 };   // benches
  var STRIP_W = 2400, SPEED = 260;                        // passing city: strip width, px/s

  function cityStrip(S) {
    var s = '', x = 0, cols = ['#d9b98a', '#c9937a', '#b9c4b0', '#e2cfa6', '#a9b3bf', '#d8a98a', '#c7b59a'], k = 0;
    s += S.fillOnly(S.rect(-10, WY0 - 20, STRIP_W + 20, WY1 - WY0 + 40), S.linear([[0, '#bcd6e6'], [1, '#e6eee8']], 0, 0, 0, 1));
    // far trees / roofs band
    var far = [[0, 420]];
    for (var fx = 0; fx <= STRIP_W; fx += 60) far.push([fx, 360 + Math.sin(fx / 90) * 18 + (S.r() - 0.5) * 16]);
    far.push([STRIP_W, 600], [0, 600]);
    s += S.fillOnly(far, '#9fb3a6', ' opacity=".7"');
    while (x < STRIP_W - 100) {
      var w = 150 + S.r() * 140, h = 180 + S.r() * 170, col = cols[k++ % cols.length], top = WY1 + 30 - h;
      if (x + w > STRIP_W - 20) w = STRIP_W - 20 - x;
      var b = S.rect(x, top, w, h + 40, 40, 1);
      s += S.shape(b, col, { w: 2.2, extra: 2.2 });
      s += S.hatch(b, { ang: 75, gap: 8, w: 1.1, op: 0.3, cond: function (X) { return X > x + w * 0.78; } });
      for (var wy = top + 26; wy < WY1 - 10; wy += 46) for (var wx = x + 20; wx < x + w - 34; wx += 44) s += S.fillOnly(S.rect(wx, wy, 20, 26, 20, 0.5), '#4f6d86', ' opacity=".55"');
      if (S.r() < 0.5) s += S.fillOnly(S.poly([[x - 6, top], [x + w / 2, top - 46], [x + w + 6, top]], 30, 1), '#9d4a3a');
      x += w + 10 + S.r() * 40;
      if (S.r() < 0.35) { s += S.line([[x + 20, WY1 + 40], [x + 20, WY1 - 70]], { w: 6, ta: 0.02, tb: 0.02 }, '#5e3f22') + S.circ(x + 20, WY1 - 110, 48, '#6f9a49', { w: 2, extra: 2, jit: 0.2 }); x += 50; }
    }
    // speed lines (motion)
    var L = [];
    for (var i = 0; i < 14; i++) { var yy = WY0 + 20 + S.r() * (WY1 - WY0 - 40), xx = S.r() * STRIP_W; L.push([[xx, yy], [xx + 120 + S.r() * 160, yy]]); }
    s += S.lines(L, { w: 2.2, ta: 0.3, tb: 0.3, min: 0.2 }, '#ffffff', ' opacity=".5"');
    return s;
  }

  function wallWithHoles(S) {
    var d = U.polyD([[-20, 0], [1940, 0], [1940, FLOOR_Y], [-20, FLOOR_Y]], true);
    WINS.forEach(function (w) { d += U.polyD(S.rrect(w[0], WY0, w[1] - w[0], WY1 - WY0, 26, 0.6), true); });
    return '<path d="' + d + '" fill="#e6e2d4" fill-rule="evenodd"/>';
  }
  function inWin(X, Y) { if (Y < WY0 - 8 || Y > WY1 + 8) return false; for (var i = 0; i < WINS.length; i++) if (X > WINS[i][0] - 8 && X < WINS[i][1] + 8) return true; return false; }

  function bench(S, B, fgOut) {
    var s = '';
    // seat back against the wall (bg)
    var back = S.rrect(B.x0, B.seat - 190, B.x1 - B.x0, 200, [26, 26, 6, 6]);
    s += S.shape(back, '#b8503a', { w: 3, extra: 3.2 }) + mo(S, back) + A.shadeSide(S, back, [0, -1], 0.5, { ang: 15, gap: 7, op: 0.3 });
    var seats = Math.round((B.x1 - B.x0) / 235);
    for (var i = 1; i < seats; i++) s += S.seg(B.x0 + (B.x1 - B.x0) * i / seats, B.seat - 180, B.x0 + (B.x1 - B.x0) * i / seats, B.seat, 2.4, '#7a2e22');
    s += S.box(B.x0 + 10, B.seat - 210, B.x1 - B.x0 - 20, 18, '#9aa3a6', { w: 2, extra: 2, hatch: false });   // grab bar on the backrest
    // fg: cushion top + front panel + plinth
    var top = S.poly([[B.x0, B.seat], [B.x1, B.seat], [B.x1 + 14, B.seat + 36], [B.x0 - 14, B.seat + 36]], 40, 0.8), f = '';
    f += S.floorShadow((B.x0 + B.x1) / 2, B.seat + 222, (B.x1 - B.x0) / 2 + 30, 12, 0.3);
    f += S.shape(top, '#c75e45', { w: 3, extra: 3 }) + mo(S, top);
    var panel = S.rect(B.x0 - 14, B.seat + 36, B.x1 - B.x0 + 28, 70, 40, 0.8);
    f += S.shape(panel, '#a7442f', { w: 3, extra: 3.2 }) + mo(S, panel) + A.shadeSide(S, panel, [0, 1], 0.2, { ang: 20, gap: 6, op: 0.35 });
    f += S.box(B.x0 + 10, B.seat + 106, B.x1 - B.x0 - 20, 110, '#8b9396', { w: 2.6, extra: 2.8, hatch: 'b', hk: 0.4 });
    f += S.box(B.x0 + 40, B.seat + 130, 120, 60, '#7a8285', { w: 1.6, extra: 1.4, hatch: false });   // heater grille
    f += S.lines([0, 1, 2, 3].map(function (j) { return [[B.x0 + 50, B.seat + 142 + j * 12], [B.x0 + 150, B.seat + 142 + j * 12]]; }), { w: 1.4, ta: 0.05, tb: 0.05 }, P.ink, ' opacity=".6"');
    fgOut.push(f);
    return s;
  }
  // moquette pattern (small ochre/teal dashes)
  function mo(S, pts) { return S.stipple(pts, 260, { r: 4, op: 0.55, color: '#e2b13b' }) + S.stipple(pts, 200, { r: 3.4, op: 0.5, color: '#5f8f86' }); }

  function build(S) {
    var bg = '', fgL = [], i;
    var strip = cityStrip(S);
    bg += '<!--amb:city-->';
    bg += wallWithHoles(S);
    bg += S.hatch([[-20, -10], [1940, -10], [1940, FLOOR_Y], [-20, FLOOR_Y]], { ang: 28, gap: 11, w: 1.2, op: 0.22, cond: function (X, Y) { return !inWin(X, Y) && (Y < 120 || Y > 640); } });
    // window frames (rubber gasket + inner ink)
    WINS.forEach(function (w) {
      var r = S.rrect(w[0], WY0, w[1] - w[0], WY1 - WY0, 26, 0.6);
      bg += S.line(r.concat([r[0]]), { w: 9, ta: 0.01, tb: 0.01, min: 0.9 }, '#3a3f42') + S.shape(r, null, { w: 2.4, extra: 2.4 });
      bg += S.hatch(r, { ang: -50, gap: 7, w: 1.4, op: 0.2, color: '#ffffff', cond: function (X, Y) { var u = (X - w[0]) + (Y - WY0) * 0.7; return u > 60 && u < 110; } });
    });
    // tilt-window top strips
    [[90, 540], [1380, 1830]].forEach(function (w) { bg += S.seg(w[0], WY0 + 70, w[1], WY0 + 70, 5, '#3a3f42'); });
    // ── doors (middle) ──
    var DX0 = 680, DX1 = 1240;
    bg += S.box(DX0, 150, DX1 - DX0, FLOOR_Y - 150, '#d7d3c2', { w: 3, extra: 3.4 });
    bg += S.box(DX0 + 20, 170, (DX1 - DX0) / 2 - 26, FLOOR_Y - 170, '#c9c5b4', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.1 }) + S.box((DX0 + DX1) / 2 + 6, 170, (DX1 - DX0) / 2 - 26, FLOOR_Y - 170, '#c9c5b4', { w: 2.4, extra: 2.6, hatch: 'l', hk: 0.1 });
    // re-cut the door windows on top of the door leaves (the city shows through: clip a copy of the amb layer)
    [[700, 930], [990, 1220]].forEach(function (w) {
      var r = S.rrect(w[0] + 10, WY0 - 30, w[1] - w[0] - 20, WY1 - WY0 + 140, 30, 0.6), cid = S.clip(r);
      bg += '<g clip-path="url(#' + cid + ')"><!--amb:city--></g>' + S.line(r.concat([r[0]]), { w: 9, ta: 0.01, tb: 0.01, min: 0.9 }, '#3a3f42') + S.shape(r, null, { w: 2.4, extra: 2.4 });
    });
    bg += S.seg((DX0 + DX1) / 2, 170, (DX0 + DX1) / 2, FLOOR_Y, 6, '#3a3f42');
    // door button (green ring) + "Tür öffnen"
    bg += S.circ(DX1 + 46, 520, 22, '#f4eedf', { w: 2.2, extra: 2 }) + S.circ(DX1 + 46, 520, 14, '#5f8c3c', { w: 1.4, extra: 1 }) + S.T(DX1 + 46, 566, 'Tür', { f: 'Oswald', s: 16, a: 'middle', w: 500 });
    // yellow poles at the door + stop button on the left pole
    [[DX0 - 30], [DX1 + 30]].forEach(function (p) {
      bg += S.line([[p[0], 0], [p[0], FLOOR_Y + 40]], { w: 16, ta: 0.01, tb: 0.01, min: 0.95 }) + S.line([[p[0] - 2, 0], [p[0] - 2, FLOOR_Y + 38]], { w: 9, ta: 0.01, tb: 0.01, min: 0.95 }, '#e0b13a');
    });
    bg += S.box(DX0 - 46, 600, 32, 44, '#c43d33', { w: 2, extra: 2, hatch: false }) + S.T(DX0 - 30, 628, 'STOP', { f: 'Oswald', s: 10, c: P.white, a: 'middle', w: 500 });
    // ticket validator by the right pole
    bg += S.box(DX1 + 60, 380, 70, 90, '#c9a43a', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.3 }) + S.box(DX1 + 72, 396, 46, 14, '#2f2a26', { w: 1.4, extra: 1, hatch: false }) + S.T(DX1 + 95, 452, 'Ticket', { f: 'Oswald', s: 14, a: 'middle', w: 500 });

    // ── ceiling: handrail with straps, LED route display, line map ──
    bg += S.fillOnly(S.rect(-20, -10, 1960, 120), '#d1cdbd') + S.line([[-20, 110], [1940, 110]], { w: 4, ta: 0.02, tb: 0.02 });
    bg += S.line([[-20, 150], [1940, 150]], { w: 14, ta: 0.01, tb: 0.01, min: 0.95 }) + S.line([[-20, 148], [1940, 148]], { w: 7, ta: 0.01, tb: 0.01, min: 0.95 }, '#e0b13a');
    for (var sx = 140; sx < 1900; sx += 170) {
      if (sx > DX0 - 80 && sx < DX1 + 80) continue;
      bg += S.seg(sx, 156, sx, 196, 5, '#3a3f42') + S.shape(S.ellipse(sx, 214, 16, 20, 20), null, { w: 4, extra: 2 });
    }
    // LED display above the doors
    var lx = 760, ly = 30, lw = 400, lh = 70;
    bg += S.box(lx - 10, ly - 10, lw + 20, lh + 20, '#3a3f42', { w: 2.6, extra: 2.8 }) + S.box(lx, ly, lw, lh, '#1d1a17', { w: 1.6, extra: 1 });
    bg += S.T(lx + lw / 2, ly + 48, 'Linie 5 · Hauptbahnhof', { f: 'Oswald', s: 32, c: '#f2a93a', a: 'middle', w: 500, ls: 1 });
    bg += S.glow(lx + lw / 2, ly + 34, 220, 40, '#f2a93a', 0.25);
    // line map strip above the windows (left + right)
    [[100, 560], [1380, 1830]].forEach(function (m, j) {
      bg += S.box(m[0], 168, m[1] - m[0], 44, '#f4eedf', { w: 2, extra: 2, hatch: false });
      bg += S.line([[m[0] + 20, 190], [m[1] - 20, 190]], { w: 5, ta: 0.02, tb: 0.02 }, P.red);
      var n = 7;
      for (var q = 0; q < n; q++) { var px = m[0] + 20 + (m[1] - m[0] - 40) * q / (n - 1); bg += S.circ(px, 190, 6, q === (j ? 2 : 4) ? P.red : '#f4eedf', { w: 1.6, extra: 1 }); }
    });
    bg += S.T(1605, 207, 'Hauptbahnhof', { f: 'Oswald', s: 0.1 });   // (no visible text; keeps glyph set small)

    // ── floor: blue-grey rubber with dots ──
    var fl = [[-20, FLOOR_Y], [1940, FLOOR_Y], [1940, 1100], [-20, 1100]];
    bg += S.fillOnly(fl, '#5d666b') + S.stipple(fl, 900, { r: 5, op: 0.25, color: '#2f3538', cond: function (x, y) { return y < 950 ? 1 : 0.4; } });
    bg += S.line([[-20, FLOOR_Y], [1940, FLOOR_Y]], { w: 5, ta: 0.02, tb: 0.02 }) + S.fillOnly(S.rect(-20, FLOOR_Y, 1960, 26), 'rgba(20,20,30,.2)');
    // door threshold (yellow edge)
    bg += S.fillOnly(S.poly([[DX0, FLOOR_Y], [DX1, FLOOR_Y], [DX1 + 40, FLOOR_Y + 30], [DX0 - 40, FLOOR_Y + 30]], 40, 0.6), '#e0b13a', ' opacity=".8"');
    // daylight wash from the windows
    bg += A.shaft([[70, WY1], [560, WY1], [700, FLOOR_Y + 120], [-40, FLOOR_Y + 120]], '#ffffff', 0.06) + A.shaft([[1360, WY1], [1850, WY1], [1960, FLOOR_Y + 120], [1260, FLOOR_Y + 120]], '#ffffff', 0.06);

    // benches (bg backs, fg cushions)
    bg += bench(S, BL, fgL) + bench(S, BR, fgL);
    // a newspaper left on the right bench back + a bag on the floor
    bg += S.shape(S.poly([[1700, BR.seat - 4], [1790, BR.seat - 10], [1800, BR.seat - 2], [1706, BR.seat + 4]], 20, 0.6), '#efe6cf', { w: 1.6, extra: 1.2 });

    var strip2 = strip;
    var amb = {
      city: function (t) {
        var dx = -((t * SPEED) % STRIP_W);
        return '<g transform="translate(' + f1(dx) + ' 0)">' + strip2 + '</g><g transform="translate(' + f1(dx + STRIP_W) + ' 0)">' + strip2 + '</g>';
      }
    };
    return { bg: bg, fg: fgL.join(''), amb: amb };
  }

  A.define('tram-interior', {
    seed: 203, ambient: true, build: build,
    slots: {
      left:         A.slot(740, 985, 1.0, { face: 1 }),                       // by the left door pole
      center:       A.slot(960, 990, 1.02),                                   // in the door area
      right:        A.slot(1190, 985, 1.0, { face: -1 }),                     // by the right door pole
      standing:     A.slot(1010, 985, 1.0, { face: -1, hold: [DX1hand(), 230] }),   // holding a strap / the pole
      'seat-left':  A.slot(330, 960, 0.95, { face: 1, seated: true, seatY: 780 }),
      'seat-right': A.slot(1600, 960, 0.95, { face: -1, seated: true, seatY: 780 })
    }
  });
  function DX1hand() { return 1080; }
})(typeof self !== 'undefined' ? self : this);
