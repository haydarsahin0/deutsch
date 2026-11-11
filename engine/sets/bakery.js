/* Set "bakery" — German Bäckerei: bread shelves with baskets behind the seller, hanging guild pretzel sign, chalk price
 * board, glass display counter (Brezeln, Brötchen, Kuchen with price tags) as the FOREGROUND layer, shop door with
 * "OFFEN" sign and the checkered floor on the customer side. Seller stands behind the counter (behind-counter),
 * the customer stands free to the right of the counter end (customer). Illustrator B · see engine/sets/kit-b.js
 */
(function (root) {
  'use strict';
  var K = root.SetKitB || require('./kit-b.js');
  var P = K.P, U = K.U;
  var YH = 760, WALL = '#ead9b6', CRUST = '#b8712f', CRUST_D = '#8a4e1e', CRUST_L = '#d9a15a';

  // ── baked goods ──
  function rope(S, pts, w) {
    var q = U.catmull(pts, 6, false);
    return S.line(q, { w: w + 6, ta: 0.06, tb: 0.06, min: 0.7, jit: 0.15 }) + S.line(q, { w: w, ta: 0.06, tb: 0.06, min: 0.7, jit: 0.15 }, CRUST) +
      S.line(q.map(function (p) { return [p[0] - w * 0.12, p[1] - w * 0.18]; }), { w: w * 0.3, ta: 0.2, tb: 0.2, min: 0.4 }, CRUST_L, ' opacity=".8"');
  }
  function pretzel(S, x, y, s, rot) {
    function T(list) { return U.xf(list.map(function (p) { return [p[0] * s, p[1] * s]; }), x, y, rot || 0); }
    var w = s * 0.2, g = '';
    g += rope(S, T([[-0.9, -0.1], [-0.75, 0.4], [0, 0.62], [0.75, 0.4], [0.9, -0.1]]), w * 1.25);
    g += rope(S, T([[0.9, -0.1], [0.62, -0.6], [0.15, -0.55], [-0.1, -0.15], [-0.28, 0.36]]), w);
    g += rope(S, T([[-0.9, -0.1], [-0.62, -0.6], [-0.15, -0.55], [0.1, -0.15], [0.28, 0.36]]), w);
    // salt
    var salt = T([[-0.7, 0.3], [-0.3, 0.52], [0.2, 0.55], [0.6, 0.35], [-0.55, -0.45], [0.5, -0.5], [0, -0.3]]);
    salt.forEach(function (p) { g += '<rect x="' + U.f1(p[0] - 2) + '" y="' + U.f1(p[1] - 2) + '" width="4" height="4" fill="#f4eedf"/>'; });
    return g;
  }
  function roll(S, x, y, r, col, kind) {
    var g = S.shape(S.ellipse(x, y, r, r * 0.68, 26, 0.04), col || CRUST_L, { w: 2, extra: 2.4 });
    if (kind === 'kaiser') for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI * 2; g += S.line([[x, y], [x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.5]], { w: 2, ta: 0.2, tb: 0.4 }, CRUST_D); }
    else if (kind === 'mohn') g += S.stipple(S.ellipse(x, y - r * 0.15, r * 0.8, r * 0.45, 16), 26, { r: 2.2, op: 0.9, color: '#2a2a32' });
    else g += S.line([[x - r * 0.6, y - r * 0.05], [x + r * 0.6, y - r * 0.12]], { w: 2.4, ta: 0.2, tb: 0.3 }, CRUST_D);
    g += S.hatch(S.ellipse(x, y, r, r * 0.68, 20), { ang: 70, gap: 5, w: 1, op: 0.4, cond: function (X, Y) { return (X - x) + (Y - y) > r * 0.4; } });
    return g;
  }
  function loaf(S, x, y, l, h, rot, col) {
    var pts = U.xf(S.ellipse(0, 0, l, h, 30, 0.03), x, y, rot || 0), g = S.shape(pts, col || CRUST, { w: 2.4, extra: 2.8 });
    for (var i = -2; i <= 2; i++) g += S.line(U.xf([[i * l * 0.32 - l * 0.08, -h * 0.4], [i * l * 0.32 + l * 0.1, h * 0.25]], x, y, rot || 0), { w: 2.4, ta: 0.2, tb: 0.4 }, CRUST_D);
    g += S.hatch(pts, { ang: 75, gap: 6, w: 1.1, op: 0.4, cond: function (X, Y) { return Y > y + h * 0.2; } });
    return g;
  }
  // cake slice seen from the front: layered block (x centre, y bottom)
  function slice(S, x, y, w, h, layers, top) {
    var g = '', yy = y;
    layers.forEach(function (L) { var lh = h * L[1]; g += S.box(x - w / 2, yy - lh, w, lh, L[0], { w: 1.6, extra: 1.6, step: 20 }); yy -= lh; });
    if (top === 'cherry') g += S.circ(x, yy - 7, 8, P.red, { w: 1.4, extra: 1.2 }) + S.circ(x - 12, yy - 4, 6, '#f4eedf', { w: 1, extra: 0.6 });
    if (top === 'almond') g += S.hatch(S.rect(x - w / 2, yy, w, h * 0.22), { ang: 30, gap: 5, w: 1.2, op: 0.5, color: CRUST_D });
    return g;
  }
  function tag(S, x, y, name, price) {
    var g = S.box(x - 46, y - 18, 92, 34, P.white, { w: 1.6, extra: 1.2, step: 20 });
    g += S.T(x, y - 3, name, { f: 'Caveat', s: 16, a: 'middle' }) + S.T(x, y + 13, price, { f: 'Oswald', s: 12, a: 'middle', c: P.red });
    g += S.seg(x, y + 16, x, y + 30, 1.6);
    return g;
  }

  function room(S) {
    var s = '';
    s += S.wall(-10, YH, WALL, { top: 46, op: 0.3 });
    // tiled lower wall on the customer side
    var tl = [[1180, 470], [1940, 470], [1940, YH], [1180, YH]];
    s += S.fillOnly(tl, '#e6eadb');
    var L = [];
    for (var y = 470; y <= YH; y += 36) L.push([[1180, y], [1940, y + 0.5]]);
    for (var x = 1180; x < 1940; x += 36) L.push([[x, 470], [x + 0.5, YH]]);
    s += S.lines(L, { w: 1.2, ta: 0.05, tb: 0.05, min: 0.5 }, P.ink, ' opacity=".25"');
    s += S.box(1180, 458, 760, 14, '#5f8f86', { w: 2, extra: 2.2, step: 60 });
    // checkered floor
    s += S.floor(YH, { kind: 'tiles', vx: 1100, vy: 380, gap: 120, rows: 6, fill: '#ece4cf', fill2: '#6a6d66', lop: 0.35 });
    s += '<rect x="-10" y="860" width="1940" height="230" fill="' + S.linear([[0, '#ece4cf', 0], [1, '#ece4cf', 0.55]], 0, 0, 0, 1) + '"/>';
    s += S.skirting(YH, 12, '#5f8f86');
    return s;
  }

  function breadWall(S) {
    var s = '', x0 = 60, x1 = 1140;
    // shelf unit
    s += S.drop(x0, 150, x1 - x0, YH - 150, 14, 0);
    s += S.box(x0, 150, x1 - x0, YH - 150, '#8a6040', { w: 3.4, extra: 4 });
    s += S.fillOnly(S.rect(x0 + 16, 166, x1 - x0 - 32, YH - 182, 40, 0.5), '#5e3f22');
    s += S.hatch(S.rect(x0 + 16, 166, x1 - x0 - 32, YH - 182), { ang: 90, gap: 9, w: 1.2, op: 0.4 });
    var rows = [300, 450, 600];
    rows.forEach(function (ry, i) {
      // goods sitting on the shelf
      if (i === 0) {
        for (var k = 0; k < 5; k++) s += loaf(S, x0 + 110 + k * 200, ry - 40, 82, 40, (k % 2 ? 4 : -4), k % 2 ? CRUST : '#a6652a');
      } else if (i === 1) {
        // wicker baskets with rolls and baguettes
        for (var b = 0; b < 4; b++) {
          var bx = x0 + 150 + b * 255;
          for (var r = 0; r < 4; r++) s += roll(S, bx - 54 + r * 36, ry - 50 - (r % 2) * 10, 26, CRUST_L, ['kaiser', 'plain', 'mohn', 'kaiser'][(r + b) % 4]);
          if (b % 2) for (var q = 0; q < 3; q++) s += S.shape(U.xf(S.rrect(-10, -90, 20, 120, 10), bx + 60 - q * 14, ry - 50, 14 + q * 6), CRUST_L, { w: 1.8, extra: 2 });
          var bk = S.poly([[bx - 96, ry - 56], [bx + 96, ry - 56], [bx + 82, ry], [bx - 82, ry]], 20, 0.8);
          s += S.shape(bk, '#c9a466', { w: 2.4, extra: 2.6 });
          s += S.hatch(bk, { ang: 60, gap: 7, w: 1.2, op: 0.55, color: CRUST_D }) + S.hatch(bk, { ang: -60, gap: 7, w: 1.2, op: 0.4, color: CRUST_D });
        }
      } else {
        // bottom shelf: paper bags + flour sacks
        for (var p = 0; p < 6; p++) {
          var px = x0 + 90 + p * 170;
          s += S.box(px - 40, ry - 110, 80, 110, p % 2 ? '#d9c39a' : P.white, { w: 2, extra: 2.2, step: 30, hatch: 'r', hk: 0.3 });
          if (!(p % 2)) s += pretzel(S, px, ry - 56, 26, 0);
        }
      }
      s += S.box(x0 + 10, ry, x1 - x0 - 20, 16, '#a07650', { w: 2.4, extra: 2.6, step: 60, hatch: 'b', hk: 0.5 });
    });
    return s;
  }

  function signs(S) {
    var s = '';
    // shop sign
    s += S.drop(260, 40, 680, 96, 10, 12);
    s += S.box(260, 40, 680, 96, P.green, { w: 3.4, extra: 4 });
    s += S.shape(S.rect(272, 52, 656, 72, 40, 0.5), null, { w: 1.6, extra: 0.6, color: '#c9a24a' });
    s += S.T(600, 112, 'BÄCKEREI MÜLLER', { f: 'Fraunces', s: 52, a: 'middle', c: P.cream });
    // guild pretzel hanging from a bracket
    s += S.line([[1170, 60], [1340, 60]], { w: 6, ta: 0.02, tb: 0.02, min: 0.8 });
    s += S.line(U.catmull([[1180, 60], [1210, 100], [1250, 70], [1230, 60]], 5, false), { w: 3, ta: 0.1, tb: 0.3 });
    s += S.seg(1320, 60, 1320, 96, 2.4) + S.seg(1280, 60, 1280, 96, 2.4);
    s += '<g>' + pretzel(S, 1300, 160, 90, 0).replace(new RegExp(CRUST, 'g'), '#c9a24a').replace(new RegExp(CRUST_L, 'g'), '#f2d27a') + '</g>';
    // chalk price board
    var bx = 1394, by = 140;
    s += S.drop(bx, by, 300, 250, 10, 12);
    s += S.box(bx, by, 300, 250, '#8a6040', { w: 3, extra: 3.5 });
    s += S.fillOnly(S.rect(bx + 14, by + 14, 272, 222, 30, 0.5), '#28322c');
    s += S.T(bx + 150, by + 56, 'ANGEBOT', { f: 'Caveat', s: 36, a: 'middle', c: '#f2cf5b' });
    s += S.T(bx + 30, by + 104, '6 Brötchen', { f: 'Caveat', s: 28, c: '#eee8d6' }) + S.T(bx + 270, by + 104, '2,–', { f: 'Caveat', s: 28, a: 'end', c: '#eee8d6' });
    s += S.T(bx + 30, by + 146, 'Brezel', { f: 'Caveat', s: 28, c: '#eee8d6' }) + S.T(bx + 270, by + 146, '0,90', { f: 'Caveat', s: 28, a: 'end', c: '#eee8d6' });
    s += S.T(bx + 30, by + 188, 'Kaffee', { f: 'Caveat', s: 28, c: '#eee8d6' }) + S.T(bx + 270, by + 188, '1,80', { f: 'Caveat', s: 28, a: 'end', c: '#eee8d6' });
    s += S.line([[bx + 40, by + 70], [bx + 260, by + 66]], { w: 3, ta: 0.2, tb: 0.3 }, '#f08a7a');
    return s;
  }

  function door(S) {
    var s = '', x = 1720, y = 250, w = 230, h = YH - y;
    s += S.box(x - 16, y - 16, w + 32, h + 16, P.paperL, { w: 3, extra: 3.5 });
    s += S.box(x, y, w, h, '#5f8f86', { w: 3, extra: 3.5, hatch: 'r', hk: 0.15 });
    var gl = S.rect(x + 24, y + 24, w - 48, h * 0.55, 30, 0.5);
    s += S.fillOnly(gl, S.linear([[0, '#d7e3d9'], [1, '#a9c6cf']], 0, 0, 0, 1));
    s += '<g clip-path="url(#' + S.clip(gl) + ')">' + S.box(x + 30, y + 160, 80, 140, '#c9b28a', { w: 1.6, extra: 1.4, step: 30 }) + S.box(x + 120, y + 120, 90, 180, '#b7a07a', { w: 1.6, extra: 1.4, step: 30 }) + '</g>';
    s += S.shape(gl, null, { w: 2.2, extra: 2 });
    s += S.box(x + 30, y + 24 + h * 0.55 + 30, 18, 70, '#c9a24a', { w: 1.6, extra: 1.4, step: 20 });
    // OFFEN sign + bell
    s += S.seg(x + 80, y + 60, x + w / 2, y + 40, 1.4) + S.seg(x + w - 80, y + 60, x + w / 2, y + 40, 1.4);
    s += S.box(x + 60, y + 60, w - 120, 46, P.white, { w: 2, extra: 2, step: 30 });
    s += S.T(x + w / 2, y + 94, 'OFFEN', { f: 'Oswald', s: 28, a: 'middle', c: P.red, ls: 3 });
    var bell = U.catmull([[x - 30, y - 6], [x - 26, y - 30], [x - 14, y - 38], [x - 2, y - 30], [x + 2, y - 6]], 5, false);
    s += S.seg(x - 14, y - 38, x - 14, y - 60, 2.4);
    s += S.shape(bell, '#c9a24a', { w: 2, extra: 2 });
    return s;
  }

  // ── foreground: the display counter ──
  function counter(S) {
    var s = '', x0 = -30, x1 = 1190, gT = 690, gB = 872, base = 1010;
    s += S.floorShadow(600, base + 6, 680, 18, 0.3);
    // base cabinet
    var bs = [[x0, gB], [x1, gB], [x1, base], [x0, base]];
    s += S.shape(bs, '#e2d6b8', { w: 3.6, extra: 4 });
    for (var x = 20; x < x1 - 40; x += 196) s += S.box(x, gB + 30, 170, base - gB - 56, '#d6c8a6', { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.15, hop: 0.35 });
    s += S.box(x0, gB - 6, x1 - x0, 22, '#8a6040', { w: 3, extra: 3.5, hatch: 'b', hk: 0.4 });
    // display interior (shelves + goods)
    var inner = [[x0, gT + 10], [x1 - 6, gT + 10], [x1 - 6, gB - 4], [x0, gB - 4]];
    s += S.fillOnly(inner, 'rgba(236,228,206,.86)');
    s += S.box(x0, gT + 84, x1 - x0 - 10, 8, '#e8e2d2', { w: 1.6, extra: 1.4, step: 60 });
    // upper tier: pretzels + rolls
    for (var i = 0; i < 4; i++) s += pretzel(S, 70 + i * 92, gT + 48, 40, (i % 2 ? 8 : -6));
    for (var r = 0; r < 6; r++) s += roll(S, 470 + r * 58, gT + 60, 26, CRUST_L, ['kaiser', 'mohn', 'plain'][r % 3]);
    for (var c = 0; c < 4; c++) s += S.shape(U.xf(S.rrect(-56, -12, 112, 24, 12), 860 + c * 18, gT + 40 + c * 6, -8 + c * 3), CRUST_L, { w: 1.8, extra: 2 }); // Laugenstangen / Croissant-ish
    s += S.shape(U.catmull([[990, gT + 54], [1000, gT + 26], [1040, gT + 16], [1080, gT + 26], [1092, gT + 54]], 5, false), '#d9a15a', { w: 2, extra: 2.2 });
    // lower tier: cake slices
    var cakes = [
      [[['#e9d38f', 0.5], ['#f4eedf', 0.3], ['#d9a15a', 0.2]], 'almond'],
      [[['#4a2b20', 0.35], ['#f4eedf', 0.3], ['#4a2b20', 0.35]], 'cherry'],
      [[['#d9c39a', 0.25], ['#f2e3b0', 0.75]], ''],
      [[['#d9c39a', 0.3], ['#e2a3a0', 0.4], ['#f4eedf', 0.3]], ''],
      [[['#e9d38f', 0.5], ['#f4eedf', 0.3], ['#d9a15a', 0.2]], 'almond'],
      [[['#4a2b20', 0.35], ['#f4eedf', 0.3], ['#4a2b20', 0.35]], 'cherry']
    ];
    cakes.forEach(function (ck, k) { s += slice(S, 80 + k * 180, gB - 8, 100, 70, ck[0], ck[1]); });
    s += tag(S, 400, gT + 72, 'Brezel', '0,90 €') + tag(S, 790, gT + 72, 'Brötchen', '0,45 €');
    s += tag(S, 170, gB - 40, 'Bienenstich', '2,80 €') + tag(S, 530, gB - 40, 'Käsekuchen', '2,60 €') + tag(S, 890, gB - 40, 'Schwarzw.', '3,20 €');
    // glass: slanted front pane, reflections, steel frame
    var glass = [[x0, gT], [x1 - 30, gT], [x1, gB - 6], [x0, gB - 6]];
    s += S.fillOnly(glass, 'rgba(210,228,228,.22)');
    s += S.hatch(glass, { ang: -55, gap: 8, w: 1.6, op: 0.35, color: '#ffffff', cond: function (X, Y) { var u = X + (Y - gT) * 0.8; return (u % 420) > 330 && (u % 420) < 380; } });
    s += S.box(x0, gT - 10, x1 - x0 - 24, 14, '#b9bcb4', { w: 2.4, extra: 2.6, step: 60 });
    s += S.line([[x1 - 30, gT], [x1, gB - 6]], { w: 5, ta: 0.02, tb: 0.02, min: 0.8 }, '#8f928b');
    // on top of the counter: cash register + tongs + a cake stand
    var rx = 1010;
    s += S.box(rx, gT - 110, 150, 100, '#5f8f86', { w: 2.8, extra: 3, hatch: 'r', hk: 0.25 });
    s += S.box(rx + 14, gT - 96, 122, 30, '#1d1c28', { w: 1.6, extra: 1.4, step: 30 });
    s += S.T(rx + 75, gT - 74, '4,30', { f: 'Oswald', s: 20, a: 'middle', c: '#9fe08a' });
    for (var kk = 0; kk < 8; kk++) s += S.box(rx + 18 + (kk % 4) * 30, gT - 56 + Math.floor(kk / 4) * 20, 22, 14, P.cream, { w: 1, extra: 0.6, step: 20 });
    s += S.line([[860, gT - 14], [920, gT - 30], [940, gT - 26]], { w: 4, ta: 0.05, tb: 0.05 }, '#9a9d96');
    var st = U.catmull([[120, gT - 10], [150, gT - 40], [230, gT - 50], [310, gT - 40], [340, gT - 10]], 5, false);
    s += S.seg(230, gT - 10, 230, gT - 40, 6, '#b9bcb4');
    s += S.shape(S.ellipse(230, gT - 46, 90, 14, 30), '#e8e2d2', { w: 2, extra: 2 });
    s += S.shape(U.catmull([[160, gT - 50], [164, gT - 100], [230, gT - 112], [296, gT - 100], [300, gT - 50]], 5, false), '#f4eedf', { w: 2.2, extra: 2.4 });
    s += S.circ(200, gT - 110, 9, P.red, { w: 1.2, extra: 1 }) + S.circ(250, gT - 112, 9, P.red, { w: 1.2, extra: 1 });
    s += S.lines([[[168, gT - 76], [292, gT - 78]]], { w: 3, ta: 0.1, tb: 0.1 }, '#4a2b20');
    return s;
  }

  K.define('bakery', {
    seed: 71,
    slots: {
      'behind-counter': K.slot(600, 896, 1.0, { face: 1, behind: 'counter' }),
      customer: K.slot(1400, 986, 1.08, { face: -1 }),
      left: K.slot(330, 896, 1.0, { face: 1, behind: 'counter' }),
      center: K.slot(1290, 986, 1.08, { face: -1 }),
      right: K.slot(1640, 986, 1.08, { face: -1 }),
      queue: K.slot(1760, 940, 0.96, { face: -1 })          // next in line, by the door
    },
    build: function () {
      return {
        bg: function (S) {
          return room(S) + breadWall(S) + signs(S) + door(S) +
            S.glow(600, 260, 700, 300, P.glow, 0.18) +
            '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.55, '#3a2410', 0], [1, '#3a2410', 0.3]], { cx: '45%', cy: '40%', r: '75%' }) + '"/>';
        },
        fg: function (S) { return counter(S); }
      };
    }
  });
})(typeof self !== 'undefined' ? self : this);
