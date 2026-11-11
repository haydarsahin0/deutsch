/* post-office — German post sorting room, daylight from high windows: a big wall of pigeonholes (PLZ tags, letters
 * sticking out), "Briefverteilung" enamel sign with a posthorn, fluorescent tubes, parcel shelf, yellow mail crates on a
 * sorting table and, under it, one sad heap of envelopes with „?“ (letters without address). The transfer counter
 * (scale, stamp, parcels) is the FOREGROUND layer: the `counter` slot stands behind it (waist-up).
 * Slots: counter (behind fg), sorting (at the pigeonholes), left, center, right. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WY = 740;                                   // wall / floor junction
  var YEL = '#d6aa3e', YELD = '#b88a2a', METAL = '#6f7b68', METALD = '#4d5848', WALL = '#d3cdb2';

  // envelope (centre x,y), rot deg; o: {q: '?', stamp, flap}
  function env(S, x, y, w, h, rot, col, o) {
    o = o || {};
    var r = U.xf(S.rect(-w / 2, -h / 2, w, h, 30, 0.8), x, y, rot), s = S.shape(r, col || P.white, { w: 1.6, extra: 1.4 });
    if (o.flap !== false) s += S.line(U.xf([[-w / 2 + 2, -h / 2 + 2], [0, h * 0.08], [w / 2 - 2, -h / 2 + 2]], x, y, rot), { w: 1.1, ta: 0.1, tb: 0.1, min: 0.4 }, P.ink, ' opacity=".6"');
    if (o.stamp) s += S.fillOnly(U.xf(S.rect(w / 2 - w * 0.22, -h / 2 + 4, w * 0.16, h * 0.3, 20, 0.4), x, y, rot), o.stamp);
    if (o.q) s += S.T(x, y + h * 0.3, o.q, { f: 'Fraunces', s: h * 0.75, a: 'middle', c: P.redD, r: rot });
    return s;
  }

  function room(S) {
    var s = '';
    s += S.wall(0, WY, WALL, { top: 46, op: 0.32 });
    s += S.fillOnly([[-20, 0], [1940, 0], [1940, 34], [-20, 34]], '#a9a58e');
    s += S.line([[-20, 34], [1940, 36]], { w: 3.4, ta: 0.02, tb: 0.02, min: 0.6 });
    // muted post-yellow dado band + lower wall
    s += S.fillOnly([[-20, 600], [1940, 600], [1940, WY], [-20, WY]], '#c9b98c');
    s += S.box(-20, 586, 1960, 34, YEL, { w: 2.8, extra: 3, hatch: 'b', hk: 0.4, step: 80 });
    s += S.hatch([[-20, 620], [1940, 620], [1940, WY], [-20, WY]], { ang: 75, gap: 10, w: 1.1, op: 0.18 });
    s += S.skirting(WY, 20, '#8f8a72');
    // floor: worn grey linoleum tiles, quiet toward the viewer (subtitle zone)
    s += S.floor(WY, { kind: 'tiles', gap: 150, rows: 6, fill: '#b4ad96', fill2: '#aaa38b', vx: 960, vy: 330, lop: 0.28 });
    s += S.fillOnly([[-20, 900], [1940, 900], [1940, 1100], [-20, 1100]], 'rgba(60,50,30,.10)');
    return s;
  }

  function highWindow(S, x, w) {
    var view = S.fillOnly(S.rect(0, 0, 1920, 1080), S.linear([[0, '#d8e3df'], [1, '#bccfcf']], 0, 0, 0, 1));
    view += S.fillOnly(S.poly([[x - 20, 250], [x + w * 0.2, 170], [x + w * 0.45, 190], [x + w * 0.62, 140], [x + w * 0.9, 175], [x + w + 20, 160], [x + w + 20, 300], [x - 20, 300]], 20, 2), '#a9b9b4');
    var s = S.window(x, 70, w, 170, { view: view, panes: [4, 1], frame: '#e6e0cc', sill: false });
    // daylight shaft down the wall
    s += A.shaft([[x + 30, 240], [x + w - 30, 240], [x + w + 140, WY], [x - 60, WY]], '#fff6dc', 0.16);
    return s;
  }

  function lamp(S, x) {
    var s = S.seg(x - 120, 0, x - 110, 92, 1.8) + S.seg(x + 120, 0, x + 110, 92, 1.8);
    s += S.glow(x, 130, 320, 90, '#fff6da', 0.35);
    s += S.box(x - 150, 92, 300, 22, '#e9e6da', { w: 2.4, extra: 2.6, step: 60, hatch: 'b', hk: 0.4 });
    s += S.fillOnly(S.rect(x - 140, 112, 280, 7, 40, 0.4), '#fffbe8');
    return s;
  }

  // the big pigeonhole wall
  function pigeonholes(S) {
    var s = '', x0 = 520, x1 = 1420, y0 = 160, y1 = WY - 6, cols = 9, rows = 6, cw = (x1 - x0) / cols, top = y0 + 30, ch = (y1 - 40 - top) / rows;
    s += S.drop(x0, y0, x1 - x0, y1 - y0, 16, 14, 'rgba(40,35,20,.25)');
    s += S.box(x0 - 14, y0, x1 - x0 + 28, y1 - y0, METAL, { w: 3.4, extra: 4 });
    s += S.box(x0 - 24, y0 - 6, x1 - x0 + 48, 30, METALD, { w: 3, extra: 3.4, hatch: 'b', hk: 0.5 });
    var cells = '', letters = '', tags = '', k = 0;
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var cx = x0 + i * cw, cy = top + j * ch, r = S.r();
      cells += S.box(cx + 5, cy + 5, cw - 10, ch - 22, '#3d4338', { w: 1.8, extra: 1.6, step: 40, hatch: false });
      // letters in the cell: a stack seen edge-on + a few sticking up/out
      var n = r < 0.12 ? 0 : 1 + Math.floor(S.r() * 4);
      for (var q = 0; q < n; q++) {
        var lw = cw * S.rand(0.5, 0.74), lh = ch * S.rand(0.42, 0.62), lx = cx + cw / 2 + S.rand(-10, 10), ly = cy + ch - 22 - lh / 2 - S.rand(0, 8);
        var col = [P.white, '#efe4c6', '#dde3df', '#f2d9a8', P.white][(k++) % 5];
        letters += S.shape(U.xf(S.rect(-lw / 2, -lh / 2, lw, lh, 30, 0.6), lx, ly, S.rand(-9, 9)), col, { w: 1.3, extra: 1 });
      }
      if (n > 2) letters += S.lines([[[cx + 14, cy + ch - 26], [cx + cw - 14, cy + ch - 27]], [[cx + 16, cy + ch - 31], [cx + cw - 18, cy + ch - 32]]], { w: 1.2, ta: 0.1, tb: 0.1, min: 0.4 }, P.ink, ' opacity=".5"');
      // PLZ tag under the cell
      tags += S.box(cx + cw / 2 - 30, cy + ch - 16, 60, 14, '#ece6cf', { w: 1.1, extra: 0.8, step: 30, hatch: false });
      tags += S.T(cx + cw / 2, cy + ch - 5, String(10115 + (j * cols + i) * 2), { f: 'Oswald', s: 11, a: 'middle', c: P.ink });
    }
    s += cells + letters + tags;
    // shading: right side of the shelf in shadow
    s += A.shadeSide(S, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], [1, 0.2], 0.55, { gap: 9, op: 0.35, ang: 65 });
    // a few letters dropped on the floor at its foot
    s += env(S, 700, WY + 40, 60, 36, -12, P.white) + env(S, 1290, WY + 52, 56, 34, 18, '#efe4c6');
    return s;
  }

  function sign(S) {
    var s = '', x = 735, y = 74, w = 470, h = 64;
    s += S.drop(x, y, w, h, 8, 9);
    s += S.box(x, y, w, h, YEL, { w: 3, extra: 3.4 });
    s += S.shape(S.rrect(x + 8, y + 8, w - 16, h - 16, 8), null, { w: 1.6, extra: 0.8 });
    // posthorn doodle
    var hx = x + 52, hy = y + h / 2;
    s += S.line(U.catmull([[hx - 26, hy - 4], [hx - 10, hy - 16], [hx + 10, hy - 14], [hx + 18, hy], [hx + 6, hy + 12], [hx - 8, hy + 6], [hx - 4, hy - 4], [hx + 8, hy - 2]], 5, false), { w: 4.2, ta: 0.1, tb: 0.2, min: 0.6 });
    s += S.shape([[hx - 30, hy - 14], [hx - 22, hy - 2], [hx - 36, hy + 6]], P.ink, { w: 1.4, extra: 1 });
    s += S.T(x + w / 2 + 28, y + h / 2 + 13, 'BRIEFVERTEILUNG', { f: 'Oswald', s: 34, a: 'middle', c: P.ink, ls: 2 });
    return s;
  }

  function parcelShelf(S) {
    var s = '', x0 = 40, x1 = 470;
    s += S.box(x0, 300, x1 - x0, WY - 300, '#8b7f63', { w: 3, extra: 3.4, hatch: 'r', hk: 0.15 });
    [400, 520, 640].forEach(function (y, j) {
      s += S.fillOnly(S.rect(x0 + 12, y - 100, x1 - x0 - 24, 100, 40, 0.5), '#5a5240');
      var x = x0 + 22;
      while (x < x1 - 90) {
        var w = S.rand(70, 120), h = S.rand(50, 92);
        if (x + w > x1 - 18) break;
        s += S.box(x, y - h, w, h, [P.woodL, '#c9a170', '#d8bc8a', P.woodM][Math.floor(S.r() * 4)], { w: 2, extra: 2, step: 40, hatch: 'r', hk: 0.25, hop: 0.35 });
        s += S.seg(x + w / 2, y - h, x + w / 2, y, 3, '#b48a5a', ' opacity=".8"');
        if (S.r() < 0.5) s += S.box(x + 8, y - h + 10, w * 0.42, 18, P.white, { w: 1, extra: 0.6, step: 20, hatch: false });
        x += w + 6;
      }
      s += S.box(x0 + 6, y, x1 - x0 - 12, 14, '#a3967a', { w: 2.2, extra: 2.4, step: 60 });
    });
    return s;
  }

  // mail crate (x left, y bottom)
  function crate(S, x, y, w, h) {
    var s = '';
    for (var i = 0; i < 6; i++) s += env(S, x + 18 + i * (w - 36) / 5, y - h - 10 + (i % 2) * 8, 46, 60, S.rand(-14, 14), [P.white, '#efe4c6', '#dde3df'][i % 3], { flap: false });
    s += S.box(x, y - h, w, h, YEL, { w: 2.6, extra: 3, hatch: 'r', hk: 0.25 });
    s += S.box(x + w * 0.3, y - h + 12, w * 0.4, 16, YELD, { w: 1.4, extra: 1, step: 20, hatch: false });
    return s;
  }

  function sortingTable(S) {
    var s = '', x0 = 1470, x1 = 1890, ty = 690;
    s += S.floorShadow((x0 + x1) / 2, 905, 250, 24, 0.2);
    [x0 + 24, x1 - 40].forEach(function (lx) { s += S.box(lx, ty + 22, 16, 880 - ty, METALD, { w: 2, extra: 2, step: 60, hatch: false }); });
    s += S.box(x0 + 30, 830, x1 - x0 - 60, 10, METALD, { w: 1.6, extra: 1.6, step: 60, hatch: false });
    s += crate(S, x0 + 20, ty, 170, 80) + crate(S, x0 + 210, ty, 170, 70);
    s += S.box(x0, ty, x1 - x0, 24, '#9a8c6a', { w: 3, extra: 3.4, hatch: 'b', hk: 0.5 });
    // the sad heap: letters without address, under the table
    var heap = '', cols = [P.white, '#efe4c6', '#e4ddd0', '#dde3df'];
    for (var i = 0; i < 26; i++) {
      var u = i / 25, hx = 1540 + u * 270 + S.rand(-14, 14), hh = 1 - Math.pow(Math.abs(u - 0.5) * 2, 1.6), hy = 892 - hh * S.rand(30, 78);
      heap += env(S, hx, hy, S.rand(54, 70), S.rand(34, 44), S.rand(-28, 28), cols[i % 4], { q: i % 3 === 0 ? '?' : null });
    }
    s += S.floorShadow(1680, 896, 170, 14, 0.25) + heap;
    s += env(S, 1676, 798, 72, 46, -6, P.white, { q: '?' });
    // drooping label stuck in the heap
    s += S.seg(1790, 900, 1802, 800, 2.4, P.woodD);
    s += S.note(1806, 790, 128, 46, 6, '#ece6cf', [{ t: 'ohne Adresse' }], { fs: 24, top: 30, pin: false });
    return s;
  }

  // ── fg: transfer counter (left) ──
  function counter(S) {
    var s = '', x1 = 610, ct = 780;
    s += S.fillOnly([[-20, ct + 14], [x1 + 8, ct + 14], [x1 + 18, 1100], [-20, 1100]], '#9a8f72');
    s += S.hatch([[-20, ct + 20], [x1 + 8, ct + 20], [x1 + 18, 1100], [-20, 1100]], { ang: 90, gap: 12, w: 1.1, op: 0.16 });
    s += S.line([[x1 + 8, ct + 14], [x1 + 18, 1100]], { w: 3.6, ta: 0.02, tb: 0.02, min: 0.6 });
    s += S.box(-30, 860, x1 + 30, 26, YEL, { w: 2.4, extra: 2.6, step: 80 });
    s += S.box(-30, ct, x1 + 50, 22, '#c8bd9a', { w: 3.2, extra: 3.6, hatch: 'b', hk: 0.45 });
    // letter scale
    s += S.box(70, ct - 26, 150, 26, '#cfd2c8', { w: 2.2, extra: 2.4, step: 40, hatch: 'r', hk: 0.3 });
    s += S.box(96, ct - 60, 98, 30, '#2f352f', { w: 2, extra: 2, step: 30, hatch: false });
    s += S.T(145, ct - 37, '0,020 kg', { f: 'Oswald', s: 17, a: 'middle', c: '#a8d6a0' });
    s += S.box(84, ct - 76, 122, 14, '#b8bcb2', { w: 1.8, extra: 1.6, step: 40 });
    s += env(S, 145, ct - 92, 84, 40, -3, '#f2d9a8', { stamp: P.red });
    // stamp + ink pad
    s += S.box(262, ct - 18, 86, 18, '#3b3f48', { w: 1.8, extra: 1.6, step: 30, hatch: false });
    s += S.box(286, ct - 74, 22, 52, P.woodD, { w: 1.8, extra: 1.6, step: 30 }) + S.circ(297, ct - 84, 16, P.woodM, { w: 1.8, extra: 1.6 });
    // small parcel stack + tray with forms
    s += S.box(392, ct - 92, 150, 92, '#c9a170', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.25 }) + S.seg(467, ct - 92, 467, ct, 3, '#b48a5a');
    s += S.box(410, ct - 150, 112, 58, '#d8bc8a', { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.25 }) + S.box(424, ct - 140, 50, 18, P.white, { w: 1, extra: 0.6, step: 20, hatch: false });
    s += S.T(490, ct - 108, 'Paket', { f: 'Caveat', s: 22, a: 'middle', c: P.ink, r: -4 });
    return s;
  }

  function build(S) {
    var bg = room(S) + highWindow(S, 90, 340) + highWindow(S, 1500, 340) + lamp(S, 640) + lamp(S, 1300);
    bg += parcelShelf(S) + pigeonholes(S) + sign(S) + sortingTable(S);
    // wall clock + calendar on the right wall strip
    bg += S.clock(1500, 410, 50, 9, 40);
    bg += S.box(1620, 330, 150, 190, P.white, { w: 2.2, extra: 2.4, hatch: false }) + S.box(1620, 330, 150, 46, P.red, { w: 2.2, extra: 2.4, hatch: false, step: 60 });
    bg += S.T(1695, 365, 'MÄRZ', { f: 'Oswald', s: 26, a: 'middle', c: P.white }) + S.T(1695, 470, '14', { f: 'Fraunces', s: 84, a: 'middle', c: P.ink });
    return { bg: bg, fg: counter(S) };
  }

  A.define('post-office', {
    seed: 201, build: build,
    slots: {
      counter: A.slot(330, 960, 0.98, { face: 1, behind: 'counter' }),   // clerk behind the fg transfer counter
      sorting: A.slot(1010, 935, 0.95, { face: 1 }),                    // sorting letters at the pigeonhole wall
      left:    A.slot(700, 950, 1.0, { face: 1 }),
      center:  A.slot(960, 950, 1.0),
      right:   A.slot(1330, 955, 1.0, { face: -1 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
