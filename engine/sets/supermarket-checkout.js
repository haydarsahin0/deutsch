/* supermarket-checkout — checkout lane: counter with conveyor belt, groceries, register (fg, cashier sits behind it),
 * candy rack ("Quengelware"), ice-cream freezer, shelves and aisle signs behind, fluorescent light. Static. (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var WALL_Y = 720;

  function shelfUnit(S, x0, x1, y0, y1, seed) {
    var s = S.box(x0, y0, x1 - x0, y1 - y0, '#d9d4c4', { w: 3, extra: 3.4, hatch: false });
    var r = U.rng(seed), rows = 4, rh = (y1 - y0 - 20) / rows;
    var cols = [P.red, P.mustard, P.blue, P.greenM, '#e07a3a', P.cream, '#8e3a52', P.teal, '#f0c74e'];
    for (var i = 0; i < rows; i++) {
      var by = y0 + 10 + (i + 1) * rh;
      s += S.fillOnly(S.rect(x0 + 8, by - rh + 6, x1 - x0 - 16, rh - 6), '#a9a495');
      var x = x0 + 14;
      while (x < x1 - 30) {
        var kind = r(), w = kind < 0.5 ? 28 + r() * 16 : 20 + r() * 10, h = rh * (0.5 + r() * 0.35), col = cols[Math.floor(r() * cols.length)];
        if (x + w > x1 - 12) break;
        if (kind < 0.5) { s += S.box(x, by - h, w, h, col, { w: 1.6, extra: 1.6, step: 30, hatch: 'r', hk: 0.3 }); s += S.box(x + 4, by - h * 0.62, w - 8, h * 0.24, '#f3ead3', { w: 0.8, extra: 0.4, step: 30, hatch: false }); }
        else { s += S.bottle(x + w / 2, by, h * 1.1, col, { label: '#f3ead3', cap: P.ink }); }
        x += w + 4;
      }
      s += S.box(x0 + 4, by - 2, x1 - x0 - 8, 12, '#efeee6', { w: 1.8, extra: 1.8, step: 40, hatch: false });
      // price tags
      for (var t = x0 + 30; t < x1 - 30; t += 90) s += S.box(t, by + 1, 30, 9, P.yellow, { w: 0.8, extra: 0.4, step: 20, hatch: false });
    }
    return s;
  }
  function hangSign(S, x, y, txt, col) {
    var w = txt.length * 19 + 60;
    var s = S.lines([[[x - w / 2 + 20, 0], [x - w / 2 + 20, y]], [[x + w / 2 - 20, 0], [x + w / 2 - 20, y]]], { w: 2, ta: 0.05, tb: 0.05 });
    s += S.box(x - w / 2, y, w, 54, col, { w: 2.6, extra: 3, hatch: 'b', hk: 0.3 }) + S.T(x, y + 38, txt, { f: 'Oswald', s: 28, ls: 3, c: '#f3ead3', a: 'middle' });
    return s;
  }
  function freezer(S, x0, x1, top, y) {
    var s = S.floorShadow((x0 + x1) / 2, y + 6, (x1 - x0) * 0.55, 14, 0.25);
    var body = S.rect(x0, top + 40, x1 - x0, y - top - 40, 40, 1);
    s += S.shape(body, '#e9e6dc', { w: 3.2, extra: 3.6 }) + A.shadeSide(S, body, [1, 0.3], 0.5, { ang: 75, gap: 7, op: 0.35 });
    s += S.box(x0 + 20, top + 70, x1 - x0 - 40, 70, '#3e6b8a', { w: 2.2, extra: 2.4, hatch: false });
    s += S.T((x0 + x1) / 2, top + 122, 'EIS', { f: 'Fraunces', s: 52, c: '#f3ead3', a: 'middle' });
    // flakes on the panel
    s += S.T(x0 + 70, top + 120, '❄', { f: 'Oswald', s: 34, c: '#cfe3ee', a: 'middle' }) + S.T(x1 - 70, top + 120, '❄', { f: 'Oswald', s: 34, c: '#cfe3ee', a: 'middle' });
    // glass lid (top) with ice-cream packs seen through
    var lid = S.poly([[x0, top + 40], [x1, top + 40], [x1 - 40, top - 30], [x0 + 40, top - 30]], 40, 1);
    s += S.shape(lid, '#bcd6de', { w: 2.8, extra: 3 });
    var packs = [P.red, '#f0c74e', '#e9a596', P.greenL, '#8e6a4a', P.cream];
    for (var i = 0; i < 9; i++) {
      var px = x0 + 70 + i * (x1 - x0 - 120) / 9, py = top - 6 + (i % 2) * 18;
      s += S.box(px, py, 46, 26, packs[i % packs.length], { w: 1.4, extra: 1.2, step: 20, hatch: false });
      if (i % 3 === 0) s += S.shape(S.poly([[px + 10, py + 2], [px + 22, py - 30], [px + 34, py + 2]], 10, 0.6), '#e2b56a', { w: 1.2, extra: 1 }) + S.circ(px + 22, py - 30, 11, packs[(i + 2) % 6], { w: 1.2, extra: 1 });
    }
    s += S.hatch(lid, { ang: -30, gap: 9, w: 1.4, op: 0.35, color: '#ffffff', cond: function (X, Y) { var u = X - x0 + (Y - top) * 1.2; return (u > 120 && u < 200) || (u > 460 && u < 500); } });
    s += S.line([[(x0 + x1) / 2, top + 40], [(x0 + x1) / 2, top - 30]], { w: 3, ta: 0.05, tb: 0.05 });
    // frost puff
    s += S.lines([[[x0 + 60, top - 40], [x0 + 70, top - 70]], [[x0 + 100, top - 44], [x0 + 104, top - 80]]], { w: 3, ta: 0.4, tb: 0.6, min: 0.2 }, '#bcd6de');
    return s;
  }
  function candyRack(S, x, y, w, h) {
    var s = S.floorShadow(x + w / 2, y + 4, w * 0.6, 10, 0.25);
    s += S.box(x, y - h, w, h, P.red, { w: 3, extra: 3.4, hatch: 'r', hk: 0.15 });
    s += S.box(x - 6, y - h - 50, w + 12, 50, '#f3ead3', { w: 2.4, extra: 2.6, hatch: false }) + S.T(x + w / 2, y - h - 16, 'SÜSSES', { f: 'Oswald', s: 26, ls: 3, c: P.red, a: 'middle' });
    var cols = ['#f0c74e', '#c43d33', '#6f9a49', '#e9a596', '#4f78a8', '#8e3a52', '#e07a3a'];
    for (var r = 0; r < 4; r++) {
      var by = y - h + 20 + (r + 1) * (h - 30) / 4;
      for (var c = 0; c < 4; c++) {
        var bx = x + 14 + c * (w - 20) / 4, bw = (w - 20) / 4 - 8, col = cols[(r * 4 + c) % cols.length];
        if ((r + c) % 3 === 0) { // lollipop / bar
          s += S.box(bx, by - 46, bw, 46, col, { w: 1.4, extra: 1.2, step: 20, hatch: false }) + S.seg(bx + 4, by - 26, bx + bw - 4, by - 26, 2, '#f3ead3');
        } else {
          var bag = U.catmull([[bx, by], [bx - 2, by - 30], [bx + 4, by - 48], [bx + bw - 4, by - 48], [bx + bw + 2, by - 30], [bx + bw, by]], 4, false);
          s += S.shape(bag, col, { w: 1.4, extra: 1.4 }) + S.circ(bx + bw / 2, by - 24, 7, '#f3ead3', { w: 1, extra: 0.6, n: 14 });
        }
      }
      s += S.seg(x + 6, by + 2, x + w - 6, by + 2, 4, '#efeee6');
    }
    return s;
  }

  function build(S) {
    var bg = '', fg = '';
    // ── back wall, ceiling lights, floor ──
    bg += S.wall(0, WALL_Y, '#e3e6dc', { top: 30, op: 0.25 });
    bg += S.fillOnly(S.rect(-20, -20, 1960, 70), '#cfd2c6') + S.line([[-20, 50], [1940, 52]], { w: 3.6, ta: 0.02, tb: 0.02, min: 0.6 });
    [300, 960, 1620].forEach(function (lx) { bg += S.box(lx - 170, 12, 340, 26, '#fbf7e8', { w: 2.4, extra: 2.4, hatch: false }); bg += S.glow(lx, 60, 420, 140, '#fffbe6', 0.45); });
    bg += shelfUnit(S, -20, 620, 170, WALL_Y - 10, 3) + shelfUnit(S, 1300, 1940, 170, WALL_Y - 10, 9);
    bg += shelfUnit(S, 640, 1280, 300, WALL_Y - 10, 5);
    bg += '<rect x="-20" y="160" width="1960" height="' + (WALL_Y - 160) + '" fill="#e3e6dc" opacity=".3"/>';   // aerial haze: push the shelves back
    bg += hangSign(S, 330, 92, 'GETRÄNKE', P.blue) + hangSign(S, 1600, 92, 'OBST & GEMÜSE', P.greenM);
    bg += S.floor(WALL_Y, { kind: 'tiles', gap: 120, rows: 8, fill: '#ece8dc', fill2: '#d9d4c6', vx: 960, vy: 380, lop: 0.3 });
    bg += S.skirting(WALL_Y, 16, '#bdb8a8');
    // ── "KASSE 3" pole light ──
    bg += S.line([[500, 70], [500, 230]], { w: 6, ta: 0.02, tb: 0.02, min: 0.9 });
    bg += S.box(430, 200, 140, 90, '#2c333b', { w: 2.6, extra: 3, hatch: false }) + S.T(500, 268, '3', { f: 'Anton', s: 64, c: P.yellow, a: 'middle' }) + S.T(500, 222, 'KASSE', { f: 'Oswald', s: 16, ls: 3, c: '#f3ead3', a: 'middle' });
    bg += S.glow(500, 250, 120, 80, P.yellow, 0.25);
    // candy rack + freezer
    bg += candyRack(S, 1090, 880, 180, 320);
    bg += freezer(S, 1360, 1900, 700, 930);

    // ═════ fg: checkout counter with belt, groceries, register ═════
    var cx0 = 60, cx1 = 1040, ctop = 700, cfront = 760, cbot = 930;
    fg += S.floorShadow((cx0 + cx1) / 2, cbot + 4, (cx1 - cx0) * 0.55, 16, 0.28);
    var face = S.rect(cx0, cfront, cx1 - cx0, cbot - cfront, 40, 1);
    fg += S.shape(face, '#5f7a80', { w: 3.2, extra: 3.6 }) + A.shadeSide(S, face, [0, 1], 0.3, { ang: 10, gap: 7, op: 0.35 });
    fg += S.box(cx0 + 30, cfront + 40, cx1 - cx0 - 60, 60, '#6d8a8a', { w: 2, extra: 2, hatch: false });
    fg += S.T((cx0 + cx1) / 2 + 60, cfront + 82, 'Danke für Ihren Einkauf!', { f: 'Caveat', s: 34, c: '#f3ead3', a: 'middle' });
    var top = S.poly([[cx0 + 20, ctop], [cx1 - 20, ctop], [cx1, cfront], [cx0, cfront]], 40, 1);
    fg += S.shape(top, '#cfcbbd', { w: 3, extra: 3.2 });
    // conveyor belt
    var belt = S.poly([[cx0 + 480, ctop + 8], [cx1 - 30, ctop + 8], [cx1 - 16, cfront - 10], [cx0 + 470, cfront - 10]], 40, 0.8);
    fg += S.shape(belt, '#2f3236', { w: 2.4, extra: 2 });
    var bl = []; for (var x = cx0 + 500; x < cx1 - 30; x += 34) bl.push([[x, ctop + 10], [x - 4, cfront - 12]]);
    fg += S.lines(bl, { w: 1.4, ta: 0.05, tb: 0.05, min: 0.6 }, '#6a6e72');
    // groceries on the belt
    var gy = cfront - 16;
    fg += S.box(640, gy - 86, 50, 86, '#f3f1ea', { w: 2, extra: 2.2, hatch: 'r', hk: 0.3 }) + S.shape(S.poly([[640, gy - 86], [665, gy - 104], [690, gy - 86]], 10, 0.5), '#f3f1ea', { w: 1.8, extra: 1.6 }) + S.box(646, gy - 60, 38, 22, P.blue, { w: 1, extra: 0.6, step: 20, hatch: false }) + S.T(665, gy - 44, 'MILCH', { f: 'Oswald', s: 10, c: '#f3ead3', a: 'middle' });
    var ban = U.catmull([[720, gy - 30], [740, gy - 6], [790, gy - 2], [828, gy - 26]], 5, false);
    fg += S.line(ban, { w: 26, ta: 0.3, tb: 0.3, min: 0.5 }) + S.line(ban, { w: 19, ta: 0.3, tb: 0.3, min: 0.5 }, '#f0c74e');
    var bread = U.catmull([[850, gy], [852, gy - 40], [900, gy - 56], [945, gy - 40], [948, gy]], 5, false);
    fg += S.shape(bread, '#c98f4a', { w: 2.2, extra: 2.4 }) + S.lines([[[870, gy - 40], [884, gy - 22]], [[898, gy - 48], [912, gy - 28]], [[924, gy - 44], [934, gy - 24]]], { w: 2.4, ta: 0.2, tb: 0.2 }, '#f1d9a8');
    fg += S.box(960, gy - 58, 44, 58, '#e07a3a', { w: 2, extra: 2.2, hatch: 'r', hk: 0.3 }) + S.T(982, gy - 22, 'Chips', { f: 'Caveat', s: 20, c: '#f3ead3', a: 'middle' });
    // divider bar
    fg += S.box(570, cfront - 34, 60, 16, P.red, { w: 1.8, extra: 1.6, step: 20, hatch: false }) + S.T(600, cfront - 21, 'NÄCHSTER', { f: 'Oswald', s: 8, c: '#f3ead3', a: 'middle' });
    // register + card terminal + scanner glass
    fg += S.box(cx0 + 190, ctop - 120, 170, 110, '#3a3f44', { w: 2.6, extra: 3, hatch: 'r', hk: 0.2 });
    fg += S.box(cx0 + 206, ctop - 106, 138, 50, '#9fd0a8', { w: 1.8, extra: 1.6, hatch: false }) + S.T(cx0 + 275, ctop - 70, '€ 12,49', { f: 'Oswald', s: 28, c: '#1f3a24', a: 'middle' });
    fg += S.line([[cx0 + 275, ctop - 10], [cx0 + 275, ctop + 6]], { w: 12, ta: 0.02, tb: 0.02, min: 0.9 });
    fg += S.box(cx0 + 384, ctop - 46, 60, 50, '#2c333b', { w: 2, extra: 2.2, hatch: false }) + S.box(cx0 + 392, ctop - 40, 44, 16, '#9fd0a8', { w: 1, extra: 0.6, step: 20, hatch: false });
    fg += S.box(cx0 + 380, ctop + 14, 80, 30, '#4a6a70', { w: 1.6, extra: 1.6, hatch: false }) + S.hatch(S.rect(cx0 + 382, ctop + 16, 76, 26), { ang: 0, gap: 4, w: 1, op: 0.5, color: '#ff6a55' });
    return { bg: bg, fg: fg };
  }

  A.define('supermarket-checkout', {
    seed: 91, build: build,
    slots: {
      cashier:  A.slot(190, 905, 0.92, { face: 1, seated: true, seatY: 790 }),  // behind the counter (fg hides the lower body)
      customer: A.slot(1310, 955, 1.0, { face: -1 }),                          // at the end of the belt, facing the cashier
      freezer:  A.slot(1500, 960, 1.02, { face: 1 }),                          // in front of the ice-cream freezer
      left:     A.slot(190, 905, 0.92, { face: 1 }),
      center:   A.slot(1310, 955, 1.0),
      right:    A.slot(1700, 965, 1.04, { face: -1 }),
      candy:    A.slot(1180, 965, 0.8, { face: 1 })                             // the kid at the candy rack
    }
  });
})(typeof self !== 'undefined' ? self : this);
