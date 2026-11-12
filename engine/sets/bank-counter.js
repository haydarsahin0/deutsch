/* bank-counter — old-fashioned savings-bank branch in cool morning light: pale veined marble wall, dark wood
 * wainscot, round vault door behind the clerk, „Mietkaution?“ poster, red LED waiting-number display (047 → Schalter 2)
 * with ticket stand, ATM („Geldautomat“) set into the right wall, rubber plant, green-and-cream stone floor.
 * The counter with its glass partition, money stacks (€ notes, coins), pen on a chain and Kaution form is the
 * FOREGROUND layer: `counter` stands behind the glass (waist-up).
 * Slots: counter (behind fg glass), atm (at the ATM), left (customer at the counter end), center, right.
 * (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WY = 750, MARB = '#d3cdb8', WOOD = '#5a3b26', BRASS = '#c4a052', GREEN = '#3f5d4a';

  function room(S) {
    var s = '';
    s += S.wall(0, WY, MARB, { top: 50, op: 0.26, hcol: '#3a3528' });
    // marble veins
    var V = [];
    for (var i = 0; i < 16; i++) {
      var x = S.rand(0, 1920), y = S.rand(60, 460), pts = [];
      for (var k = 0; k < 7; k++) pts.push([x + k * S.rand(20, 40), y + Math.sin(k * 1.3 + i) * 18 + k * S.rand(4, 14)]);
      V.push(pts);
    }
    s += S.lines(V, { w: 1.3, ta: 0.3, tb: 0.5, min: 0.2, smooth: 4 }, '#7d7663', ' opacity=".35"');
    // marble slab joints
    var J = [];
    for (x = 240; x < 1920; x += 240) J.push([[x, 40], [x, 520]]);
    J.push([[-20, 280], [1940, 281]]);
    s += S.lines(J, { w: 1.2, ta: 0.05, tb: 0.05, min: 0.4 }, P.ink, ' opacity=".2"');
    // cornice
    s += S.fillOnly([[-20, -20], [1940, -20], [1940, 40], [-20, 40]], '#e6e0cc');
    s += S.box(-20, 34, 1960, 18, '#bdb59c', { w: 2.4, extra: 2.6, step: 80, hatch: 'b', hk: 0.5 });
    // dark wood wainscot with panels
    s += S.fillOnly([[-20, 520], [1940, 520], [1940, WY], [-20, WY]], WOOD);
    s += S.box(-20, 510, 1960, 20, '#7a5236', { w: 2.6, extra: 3, step: 80, hatch: 'b', hk: 0.5 });
    for (x = 20; x < 1920; x += 190) s += S.box(x, 556, 150, WY - 590, '#674530', { w: 2, extra: 2.2, step: 40, hatch: 'r', hk: 0.2, hop: 0.45 });
    // polished stone floor: green / cream checker, reflections, calm
    s += S.floor(WY, { kind: 'tiles', gap: 160, rows: 6, fill: '#d8d0b8', fill2: '#5f7a66', vx: 960, vy: 340, lop: 0.3 });
    s += S.fillOnly([[-20, 880], [1940, 880], [1940, 1100], [-20, 1100]], 'rgba(40,40,30,.16)');
    [380, 1200].forEach(function (lx) { s += A.shaft([[lx - 50, WY + 6], [lx + 50, WY + 6], [lx + 90, 1080], [lx - 90, 1080]], '#fffbe8', 0.1); });
    return s;
  }

  function pendant(S, x) {
    var s = S.seg(x, 0, x, 120, 2);
    s += S.glow(x, 170, 220, 80, '#fff2cf', 0.35);
    var sh = U.catmull([[x - 14, 118], [x - 60, 140], [x - 70, 162], [x + 70, 162], [x + 60, 140], [x + 14, 118]], 5, false);
    s += S.shape(sh, BRASS, { w: 2.4, extra: 2.6 }) + S.hatch(sh, { ang: 70, gap: 6, w: 1.1, op: 0.45, cond: function (X) { return X > x + 10; } });
    s += S.fillOnly(S.ellipse(x, 164, 50, 8, 20), '#fff4cf');
    return s;
  }

  function vault(S) {
    var s = '', cx = 300, cy = 330, R = 150;
    s += S.box(cx - R - 30, cy - R - 30, 2 * R + 60, 2 * R + 60, '#8c8a80', { w: 3, extra: 3.4, hatch: 'r', hk: 0.15 });
    s += S.circ(cx + 8, cy + 10, R, 'rgba(20,18,14,.3)', { w: 0 });
    s += S.circ(cx, cy, R, '#a9a89e', { w: 4, extra: 4.4 });
    s += S.circ(cx, cy, R - 26, '#b9b8ad', { w: 2, extra: 1.6 });
    s += S.hatch(S.ellipse(cx, cy, R - 4, R - 4, 40), { ang: 40, gap: 7, w: 1.2, op: 0.35, cond: function (X, Y) { return (X - cx) + (Y - cy) > R * 0.5; } });
    // bolts + wheel handle
    for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; s += S.circ(cx + Math.cos(a) * (R - 13), cy + Math.sin(a) * (R - 13), 5, '#77756c', { w: 1, extra: 0.6 }); }
    var SP = [];
    for (i = 0; i < 3; i++) { var b = i / 3 * Math.PI; SP.push([[cx + Math.cos(b) * 62, cy + Math.sin(b) * 62], [cx - Math.cos(b) * 62, cy - Math.sin(b) * 62]]); }
    s += S.lines(SP, { w: 6, ta: 0.05, tb: 0.05, min: 0.8 }, '#4f4d46');
    s += S.circ(cx, cy, 20, BRASS, { w: 2, extra: 2 });
    s += S.box(cx + R - 6, cy - 50, 40, 100, '#77756c', { w: 2, extra: 2, step: 30, hatch: false });
    return s;
  }

  function display(S) {
    var s = '', x = 1000, y = 120, w = 330, h = 120;
    s += S.seg(x + 60, 40, x + 60, y, 2) + S.seg(x + w - 60, 40, x + w - 60, y, 2);
    s += S.drop(x, y, w, h, 8, 10, 'rgba(20,18,14,.3)');
    s += S.box(x, y, w, h, '#22201d', { w: 3, extra: 3.4 });
    s += S.T(x + 30, y + 36, 'NUMMER', { f: 'Oswald', s: 16, c: '#a39c88', ls: 2 }) + S.T(x + 210, y + 36, 'SCHALTER', { f: 'Oswald', s: 16, c: '#a39c88', ls: 2 });
    s += S.glow(x + 90, y + 82, 90, 34, '#ff4a2a', 0.25);
    s += S.T(x + 92, y + 100, '047', { f: 'Anton', s: 58, a: 'middle', c: '#ff5b3a' }) + S.T(x + 168, y + 96, '→', { f: 'Oswald', s: 36, a: 'middle', c: '#ff5b3a' }) + S.T(x + 254, y + 100, '2', { f: 'Anton', s: 58, a: 'middle', c: '#ff5b3a' });
    // ticket stand below
    var tx = 1170;
    s += S.floorShadow(tx, 858, 50, 8, 0.25);
    s += S.seg(tx, 640, tx, 852, 7, '#3d3a34') + S.seg(tx - 40, 856, tx + 40, 854, 6, '#3d3a34');
    s += S.box(tx - 46, 560, 92, 90, '#d8d2c0', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.25 }) + S.T(tx, 592, 'Bitte', { f: 'Oswald', s: 16, a: 'middle', c: P.ink }) + S.T(tx, 612, 'Nummer ziehen', { f: 'Oswald', s: 12, a: 'middle', c: P.ink });
    s += S.box(tx - 20, 626, 40, 10, '#3d3a34', { w: 1, extra: 0.6, step: 20, hatch: false });
    s += S.shape(U.xf(S.rect(-12, 0, 24, 30, 20, 0.4), tx, 636, 6), P.white, { w: 1.2, extra: 0.8 });
    return s;
  }

  function kautionPoster(S) {
    return S.frame(560, 150, 260, 300, '#efe5cc', function (x, y, w, h) {
      var s = S.fillOnly(S.rect(x, y, w, h), '#efe5cc');
      s += S.T(x + w / 2, y + 56, 'Mietkaution?', { f: 'Fraunces', s: 34, a: 'middle', c: GREEN });
      // key + house doodle
      var hx = x + w / 2, hy = y + 160;
      s += S.shape([[hx - 60, hy], [hx, hy - 50], [hx + 60, hy], [hx + 60, hy + 60], [hx - 60, hy + 60]], '#e2a96a', { w: 2.4, extra: 2.6 });
      s += S.box(hx - 16, hy + 20, 32, 40, P.woodD, { w: 1.6, extra: 1.4, step: 20, hatch: false });
      s += S.T(x + w / 2, y + 256, 'Kautionskonto', { f: 'Oswald', s: 24, a: 'middle', c: P.ink }) + S.T(x + w / 2, y + 282, 'in 5 Minuten.', { f: 'Caveat', s: 26, a: 'middle', c: P.ink });
      return s;
    }, { frame: BRASS, mat: 10 });
  }

  function atm(S) {
    var s = '', x = 1580, y = 250, w = 270, h = WY - y;
    s += S.box(x - 30, y - 30, w + 60, h + 30, '#8f8b7e', { w: 3, extra: 3.4, hatch: 'r', hk: 0.12 });
    s += S.box(x, y, w, h, '#b9b6aa', { w: 3, extra: 3.4, hatch: 'r', hk: 0.2 });
    s += S.box(x, y, w, 56, GREEN, { w: 2.4, extra: 2.6, step: 60, hatch: false });
    s += S.T(x + w / 2, y + 38, 'GELDAUTOMAT', { f: 'Oswald', s: 26, a: 'middle', c: P.white, ls: 2 });
    // screen
    s += S.box(x + 40, y + 90, w - 80, 140, '#1f2a26', { w: 2.6, extra: 2.8 });
    s += S.glow(x + w / 2, y + 160, 110, 60, '#9fd8c0', 0.3);
    s += S.T(x + w / 2, y + 150, 'Betrag wählen', { f: 'Oswald', s: 20, a: 'middle', c: '#bfe8d4' });
    s += S.T(x + 70, y + 196, '50 €', { f: 'Oswald', s: 18, c: '#bfe8d4' }) + S.T(x + w - 70, y + 196, '500 €', { f: 'Oswald', s: 18, a: 'end', c: '#bfe8d4' });
    // card slot, keypad, cash slot
    s += S.box(x + w - 90, y + 260, 60, 16, '#3a3833', { w: 1.6, extra: 1.4, step: 20, hatch: false });
    s += S.box(x + 50, y + 252, 120, 140, '#9a978b', { w: 2, extra: 2.2, step: 40, hatch: false });
    for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) s += S.box(x + 60 + c * 36, y + 262 + r * 31, 28, 22, r === 3 && c === 2 ? P.greenM : r === 3 && c === 0 ? P.red : '#d8d4c6', { w: 1.2, extra: 0.8, step: 20, hatch: false });
    s += S.box(x + 40, y + 420, w - 80, 26, '#3a3833', { w: 2, extra: 2, step: 40 });
    s += S.fillOnly(S.rect(x + 60, y + 412, 70, 14, 20, 0.4), '#8fae7a') + S.fillOnly(S.rect(x + 66, y + 408, 70, 14, 20, 0.4), '#a3c08c');
    return s;
  }

  function rubberPlant(S, x) {
    var s = '', y = 860;
    s += S.floorShadow(x, y + 2, 60, 9, 0.25);
    var lv = '';
    for (var i = 0; i < 11; i++) {
      var ly = y - 140 - i * 34, side = i % 2 ? 1 : -1, lx = x + side * 8;
      var leaf = U.catmull([[lx, ly], [lx + side * 40, ly - 26], [lx + side * 88, ly - 6], [lx + side * 40, ly + 16]], 6, true);
      lv += S.shape(leaf, i % 3 ? '#3f6329' : '#2f4c20', { w: 1.8, extra: 2 });
    }
    s += S.seg(x, y - 100, x + 4, y - 520, 3.4, P.woodD) + lv;
    var pot = S.poly([[x - 50, y - 110], [x + 50, y - 110], [x + 40, y], [x - 40, y]], 14, 0.8);
    s += S.shape(pot, BRASS, { w: 2.6, extra: 3 }) + S.hatch(pot, { ang: 75, gap: 6, w: 1.1, op: 0.45, cond: function (X) { return X > x + 10; } });
    return s;
  }

  // ── fg: counter + glass partition ──
  function counter(S) {
    var s = '', x0 = -20, x1 = 900, top = 776, gy = 360;
    // glass (slightly tinted, sheen) with brass frame
    var glass = [[x0, gy], [x1 - 20, gy], [x1 - 20, top], [x0, top]];
    s += S.fillOnly(glass, 'rgba(210,230,226,.13)');
    s += S.hatch(glass, { ang: -55, gap: 8, w: 1.4, op: 0.3, color: '#ffffff', cond: function (X, Y) { var u = (X + Y * 0.7) % 520; return (u > 140 && u < 200) || (u > 236 && u < 256); } });
    [x0 + 10, 300, 600, x1 - 26].forEach(function (mx) { s += S.box(mx - 7, gy, 14, top - gy, BRASS, { w: 1.8, extra: 1.8, step: 60, hatch: false }); });
    s += S.box(x0, gy - 16, x1 - x0 - 4, 18, BRASS, { w: 2.4, extra: 2.6, step: 80, hatch: 'b', hk: 0.5 });
    // speak holes + pass-through slot
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) s += S.dot(430 + i * 14, 560 + j * 14, 3, 'rgba(23,19,15,.6)');
    s += S.circ(444, 574, 34, null, { w: 1.6, extra: 1 });
    s += S.box(360, top - 30, 170, 30, 'rgba(23,19,15,.35)', { w: 1.8, extra: 1.6, step: 40, hatch: false });
    // counter body
    var front = [[x0, top + 20], [x1, top + 20], [x1 + 12, 1100], [x0, 1100]];
    s += S.shape(front, WOOD, { w: 3, extra: 3.4 });
    for (var px = 30; px < x1 - 100; px += 220) s += S.box(px, top + 60, 180, 1100 - top, '#674530', { w: 2, extra: 2.2, step: 40, hatch: 'r', hk: 0.2, hop: 0.4 });
    s += S.box(x0 - 10, top, x1 - x0 + 40, 26, '#7a5236', { w: 3, extra: 3.4, hatch: 'b', hk: 0.45 });
    s += S.fillOnly([[x0, top + 26], [x1 + 30, top + 26], [x1 + 30, top + 34], [x0, top + 34]], BRASS);
    // money: stacks of notes + coins, form, pen on a chain, green banker lamp
    function stack(x, y, n, col) {
      var t = '';
      for (var k = 0; k < n; k++) t += S.box(x + (k % 2) * 3, y - 8 - k * 7, 120, 8, col, { w: 1.2, extra: 1, step: 40, hatch: false });
      t += S.box(x + 2, y - 8 - n * 7 - 4, 120, 14, col, { w: 1.6, extra: 1.4, step: 40, hatch: false });
      t += S.box(x + 48, y - 8 - n * 7 - 6, 22, n * 7 + 14, '#efe5cc', { w: 1, extra: 0.6, step: 20, hatch: false });
      return t + S.T(x + 26, y - 8 - n * 7 + 7, '€', { f: 'Oswald', s: 14, a: 'middle', c: P.ink });
    }
    s += stack(80, top, 6, '#9fb88a') + stack(110, top - 52, 4, '#8fa9b8') + stack(230, top, 3, '#d1a77a');
    for (i = 0; i < 6; i++) s += S.circ(612 + (i % 3) * 22, top - 6 - Math.floor(i / 3) * 8, 11, i % 2 ? BRASS : '#b9b8ad', { w: 1.2, extra: 0.8, ry: 5 });
    s += S.shape(U.xf(S.rect(-80, -14, 160, 28, 30, 0.6), 760, top - 10, -3), P.white, { w: 1.6, extra: 1.4 });
    s += S.T(752, top - 4, 'Kaution: 3 × Miete', { f: 'Caveat', s: 20, a: 'middle', c: P.ink, r: -3 });
    s += S.line(U.catmull([[560, top - 2], [580, top + 6], [600, top], [640, top - 18]], 6, false), { w: 1.4, ta: 0.05, tb: 0.05 }) + S.seg(640, top - 18, 700, top - 30, 4, P.ink);
    return s;
  }

  function build(S) {
    var bg = room(S) + pendant(S, 380) + pendant(S, 1200) + vault(S) + kautionPoster(S) + display(S) + atm(S) + rubberPlant(S, 1440);
    // banker lamp on the clerk's desk behind the glass
    bg += S.box(560, 700, 300, 18, '#4a3020', { w: 2.2, extra: 2.4, step: 60 }) + S.seg(700, 700, 702, 640, 3, BRASS);
    bg += S.shape(U.catmull([[640, 646], [700, 620], [760, 646], [750, 660], [650, 660]], 5, true), '#3f6b4a', { w: 2.2, extra: 2.4 }) + S.glow(700, 690, 90, 30, '#fff0b8', 0.4);
    return { bg: bg, fg: counter(S) };
  }

  A.define('bank-counter', {
    seed: 205, build: build,
    slots: {
      counter: A.slot(470, 960, 0.98, { face: 1, behind: 'counter' }),   // clerk behind the fg glass partition
      atm:     A.slot(1700, 945, 1.0, { face: 1 }),                     // at the ATM
      left:    A.slot(1040, 950, 1.0, { face: -1 }),                    // customer at the counter end
      center:  A.slot(1260, 950, 1.0),
      right:   A.slot(1500, 955, 1.0, { face: -1 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
