/* cellar — dim vaulted cellar: stacks of cardboard boxes labelled with years, shelf of preserves, stairs up to a lit
 * door, a bare light bulb on a cord. Ambient: the bulb swings gently, its light pool + the fg darkness follow. (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var WALL_Y = 760, BX = 960, BY0 = 0, BLEN = 330;

  function carton(S, x, y, w, h, label, o) {
    // x,y = bottom-left; slight 3/4 view: top face visible when o.top
    o = o || {};
    var s = '', col = o.col || '#c49a62', d = o.depth == null ? 18 : o.depth;
    var front = S.rect(x, y - h, w, h, 30, 1.2);
    if (o.top !== false) {
      var top = S.poly([[x, y - h], [x + w, y - h], [x + w - d * 0.4, y - h - d], [x + d * 0.4, y - h - d]], 30, 0.8);
      s += S.shape(top, '#d7b07a', { w: 2.2, extra: 2 });
      s += S.line([[x + w / 2, y - h], [x + w / 2, y - h - d]], { w: 7, ta: 0.05, tb: 0.05, min: 0.8 }, '#cdbb8a');
    }
    s += S.shape(front, col, { w: 2.8, extra: 3.2 });
    s += A.shadeSide(S, front, [1, 0.3], 0.35, { ang: 72, gap: 7, op: 0.4 });
    // flap seam + tape
    s += S.seg(x + 4, y - h + 10, x + w - 4, y - h + 10, 1.4, P.ink, ' opacity=".6"');
    s += S.box(x + w / 2 - 12, y - h, 24, Math.min(46, h * 0.4), 'rgba(226,212,170,.85)', { w: 1, extra: 0.6, step: 20, hatch: false });
    if (label) s += S.T(x + w / 2 + (o.lx || 0), y - h * 0.38, label, { f: 'Kalam', s: o.fs || Math.min(44, w * 0.26), c: o.lc || P.ink, r: o.rot || 0, a: 'middle' });
    if (o.arrow) s += S.T(x + w * 0.82, y - h * 0.76, '↑', { f: 'Oswald', s: 26, c: P.ink, op: 0.7 });
    return s;
  }
  function jar(S, x, y, h, fill) {
    var w = h * 0.7, s = '';
    var body = U.catmull([[x - w / 2 + 4, y - h], [x - w / 2, y - h * 0.8], [x - w / 2, y - 4], [x, y], [x + w / 2, y - 4], [x + w / 2, y - h * 0.8], [x + w / 2 - 4, y - h]], 4, false);
    s += S.shape(body, fill, { w: 2, extra: 2 });
    s += S.box(x - w / 2 + 2, y - h - 8, w - 4, 10, '#b8bcbc', { w: 1.6, extra: 1.2, step: 20, hatch: false });
    s += S.line([[x - w / 4, y - h * 0.7], [x - w / 4, y - h * 0.25]], { w: 2.4, ta: 0.3, tb: 0.3 }, '#ffffff', ' opacity=".55"');
    s += S.box(x - w / 2 + 4, y - h * 0.55, w - 8, h * 0.24, '#f1e8d0', { w: 1.2, extra: 0.8, step: 20, hatch: false });
    return s;
  }

  function build(S) {
    var bg = '', fg = '';
    var STONE = '#6f6454', STONE_D = '#5a5043';
    // ── vaulted stone wall ──
    bg += S.fillOnly([[-20, -20], [1940, -20], [1940, WALL_Y], [-20, WALL_Y]], STONE);
    // stone blocks
    var rows = '', y, x, k = 0;
    for (y = 30; y < WALL_Y; y += 56, k++) {
      var off = (k % 2) * 60, L = [];
      L.push([[-20, y], [1940, y + (S.r() - 0.5) * 3]]);
      for (x = -40 + off; x < 1960; x += 120 + S.rand(-14, 14)) L.push([[x, y], [x + S.rand(-3, 3), y + 56]]);
      rows += S.lines(L, { w: 2.2, ta: 0.15, tb: 0.15, min: 0.4, jit: 0.4 }, '#3b3128', ' opacity=".55"');
    }
    bg += rows;
    // some blocks lighter / darker
    for (var i = 0; i < 40; i++) {
      var bx = Math.floor(S.rand(0, 16)) * 120 + (S.r() < 0.5 ? 0 : 60), by = 30 + Math.floor(S.rand(0, 13)) * 56;
      bg += S.fillOnly(S.rect(bx + 4, by + 4, 110, 48, 30, 2), S.r() < 0.5 ? '#7d715f' : STONE_D, ' opacity=".55"');
    }
    bg += S.hatch([[-20, -20], [1940, -20], [1940, WALL_Y], [-20, WALL_Y]], { ang: 30, gap: 9, w: 1.3, op: 0.22 });
    // vault arch (dark ceiling corners)
    var arch = [[-20, -20], [1940, -20], [1940, 260]];
    for (i = 0; i <= 40; i++) { var tt = i / 40; arch.push([1940 - tt * 1960, 260 - Math.sin(tt * Math.PI) * 240]); }
    arch.push([-20, 260]);
    bg += S.fillOnly(arch, '#4a3f35');
    bg += S.hatch(arch, { ang: -20, gap: 7, w: 1.4, op: 0.5 });
    var archLine = [];
    for (i = 0; i <= 40; i++) { tt = i / 40; archLine.push([1940 - tt * 1960, 260 - Math.sin(tt * Math.PI) * 240]); }
    bg += S.line(archLine, { w: 6, ta: 0.02, tb: 0.02, min: 0.6 });
    // little cellar window (left, high) with bars + daylight shaft
    var wx = 240, wy = 160, ww = 230, wh = 120;
    bg += S.box(wx - 16, wy - 16, ww + 32, wh + 32, '#5a4d40', { w: 3, extra: 3 });
    bg += S.box(wx, wy, ww, wh, '#c9d6cf', { w: 2.6, extra: 2.6, hatch: false });
    bg += S.fillOnly(S.poly([[wx, wy + wh], [wx, wy + 70], [wx + 60, wy + 60], [wx + 140, wy + 84], [wx + ww, wy + 66], [wx + ww, wy + wh]], 20, 2), P.greenM);
    var bars = [];
    for (i = 1; i < 5; i++) bars.push([[wx + ww * i / 5, wy - 4], [wx + ww * i / 5, wy + wh + 4]]);
    bg += S.lines(bars, { w: 7, ta: 0.02, tb: 0.02, min: 0.8 });
    bg += S.hatch(S.rect(wx, wy, ww, wh), { ang: -45, gap: 6, w: 1.2, op: 0.35 });
    bg += A.shaft([[wx, wy + wh], [wx + ww, wy + wh], [wx + ww + 360, WALL_Y + 140], [wx + 160, WALL_Y + 140]], '#e9e4c8', 0.12);
    // cobwebs in the vault corners
    function web(cx, cy, sx, sy) {
      var L = [], r;
      for (i = 0; i < 6; i++) { var a = i / 5 * Math.PI / 2; L.push([[cx, cy], [cx + sx * Math.cos(a) * 150, cy + sy * Math.sin(a) * 150]]); }
      for (r = 40; r <= 140; r += 32) { var arc = []; for (i = 0; i <= 5; i++) { a = i / 5 * Math.PI / 2; var rr = r * (i % 5 ? 0.92 : 1); arc.push([cx + sx * Math.cos(a) * rr, cy + sy * Math.sin(a) * rr]); } L.push(arc); }
      return S.lines(L, { w: 1.4, ta: 0.1, tb: 0.1, min: 0.4 }, '#e8e0cc', ' opacity=".55"');
    }
    bg += web(-10, 250, 1, -1) + web(1930, 250, -1, -1);

    // ── floor: concrete with cracks + drain ──
    bg += S.fillOnly([[-20, WALL_Y], [1940, WALL_Y], [1940, 1100], [-20, 1100]], '#635a4e');
    bg += S.hatch([[-20, WALL_Y], [1940, WALL_Y], [1940, 1100], [-20, 1100]], { ang: 0, gap: 10, w: 1.2, op: 0.2 });
    bg += S.stipple([[-20, WALL_Y], [1940, WALL_Y], [1940, 1100], [-20, 1100]], 1400, { r: 2.4, op: 0.25 });
    bg += S.line([[-20, WALL_Y], [1940, WALL_Y]], { w: 5, ta: 0.02, tb: 0.02, min: 0.6 });
    bg += S.lines([[[760, 820], [800, 846], [790, 880], [830, 910]], [[1240, 800], [1214, 836], [1236, 870]]], { w: 1.8, ta: 0.2, tb: 0.5, min: 0.3 }, '#2a2119', ' opacity=".7"');
    bg += S.fillOnly(S.rect(-20, WALL_Y, 1960, 40), 'rgba(20,14,8,.25)');

    // ── stairs up to a lit door (right back) ──
    var sx0 = 1460, steps = 6;
    bg += S.box(1610, 120, 150, 260, '#f3d68a', { w: 3, extra: 3, hatch: false });
    bg += S.glow(1685, 250, 260, 220, '#fbe6a8', 0.45);
    bg += S.box(1598, 108, 174, 20, P.woodD, { w: 2.4, extra: 2.4, hatch: 'b', hk: 0.5 });
    bg += S.box(1592, 116, 18, 270, P.woodD, { w: 2.2, extra: 2.4, hatch: false }) + S.box(1760, 116, 18, 270, P.woodD, { w: 2.2, extra: 2.4, hatch: false });
    var dl = S.poly([[1760, 128], [1840, 96], [1840, 420], [1760, 386]], 30, 1);
    bg += S.shape(dl, '#6b4a2f', { w: 2.8, extra: 3 }) + S.hatch(dl, { ang: 90, gap: 8, w: 1.2, op: 0.45 }) + S.circ(1774, 260, 6, '#c9b06a', { w: 1.4, extra: 1 });
    bg += A.shaft([[1610, 380], [1760, 380], [1700, 560], [1520, 560]], '#fbe6a8', 0.18);
    for (i = 0; i < steps; i++) {
      var sy = WALL_Y - i * 64, sxl = sx0 + i * 30;
      bg += S.box(sxl, sy - 64, 1940 - sxl, 64, i % 2 ? '#8d7a60' : '#97836a', { w: 2.6, extra: 2.8, hatch: 'b', hk: 0.3 });
    }
    bg += S.shape(S.poly([[1440, WALL_Y], [1640, 380], [1660, 380], [1470, WALL_Y]], 30, 1), P.woodDD, { w: 2.4, extra: 2.6 });
    bg += S.line([[1440, WALL_Y - 120], [1720, 380]], { w: 7, ta: 0.02, tb: 0.02, min: 0.85 }, P.woodDD);
    bg += S.lines([[[1450, WALL_Y - 120], [1450, WALL_Y]], [[1580, 560], [1580, 650]]], { w: 6, ta: 0.02, tb: 0.02, min: 0.85 });

    // ── shelf with preserves (left back) ──
    var shx = 90, shw = 400;
    [460, 590].forEach(function (sy2, r) {
      bg += S.shelf(shx, shx + shw, sy2, P.woodD);
      var cols = ['#c0463a', '#d9a641', '#6f9a49', '#8e3a52', '#d77a3a'];
      for (var q = 0; q < 6; q++) bg += jar(S, shx + 40 + q * 62, sy2, 62 + (q % 2) * 10, cols[(q + r * 2) % 5]);
    });
    bg += S.shelf(shx, shx + shw, 720, P.woodD);
    bg += S.box(shx + 10, WALL_Y - 2, 6, 0, P.ink, { hatch: false });

    // ── carton stacks ──
    var cs = '';
    // left stack (in front of the shelf)
    cs += carton(S, 60, 980, 260, 180, '1999', { rot: -3 }) + carton(S, 330, 980, 200, 150, 'OMA', { col: '#bb915a' });
    cs += carton(S, 90, 800, 220, 150, '2004', { rot: 2, col: '#cfa56b' }) + carton(S, 330, 830, 170, 120, 'Kabel!!', { fs: 32, rot: -4 });
    cs += carton(S, 130, 650, 170, 120, '1987', { col: '#b88d56', rot: -2 });
    // right stack
    cs += carton(S, 1500, 990, 260, 170, '2011', { rot: 2 }) + carton(S, 1770, 990, 200, 220, 'XMAS', { col: '#bb915a', fs: 36 });
    cs += carton(S, 1530, 820, 210, 140, 'Fotos', { col: '#cfa56b', rot: -3 }) + carton(S, 1760, 770, 180, 120, '1995', { rot: 3 });
    cs += carton(S, 1560, 680, 160, 110, '2008', { col: '#b88d56' });
    bg += S.floorShadow(300, 986, 260, 16, 0.35) + S.floorShadow(1720, 996, 260, 16, 0.35);
    bg += cs;
    // old suitcase on the floor
    bg += S.floorShadow(1405, 992, 90, 10, 0.3);
    bg += S.box(1330, 900, 150, 92, '#7a4a2c', { w: 2.8, extra: 3.2, hatch: 'r', hk: 0.3 });
    bg += S.box(1360, 900, 14, 92, '#c9a46a', { w: 1.6, extra: 1.2, step: 20, hatch: false }) + S.box(1436, 900, 14, 92, '#c9a46a', { w: 1.6, extra: 1.2, step: 20, hatch: false });
    bg += S.line(U.catmull([[1384, 900], [1392, 884], [1418, 884], [1426, 900]], 4, false), { w: 6, ta: 0.05, tb: 0.05, min: 0.8 });
    bg += S.T(1405, 960, 'Urlaub 92', { f: 'Kalam', s: 18, c: '#f1e8d0', r: -3, a: 'middle' });
    // light pool on the floor + the bulb (ambient)
    bg += '<!--amb:pool-->';
    bg += '<!--amb:bulb-->';
    // fg: darkness toward the edges, following the bulb
    fg += '<!--amb:dark-->';

    var bulbG = '';
    bulbG += S.line([[0, 0], [0, BLEN - 36]], { w: 2.6, ta: 0.02, tb: 0.02, min: 0.8 });
    bulbG += S.box(-11, BLEN - 40, 22, 22, '#3b3631', { w: 1.8, extra: 1.6, step: 20, hatch: false });
    var bulb = U.catmull([[-9, BLEN - 18], [-24, BLEN + 4], [-20, BLEN + 26], [0, BLEN + 36], [20, BLEN + 26], [24, BLEN + 4], [9, BLEN - 18]], 4, false);
    bulbG += S.shape(bulb, '#fff4c8', { w: 2, extra: 1.4 });
    bulbG += S.line(U.catmull([[-6, BLEN - 6], [0, BLEN + 10], [6, BLEN - 6]], 4, false), { w: 2, ta: 0.1, tb: 0.1 }, P.ochre);

    function ang(t) { return Math.sin(t * 1.25) * 5 + Math.sin(t * 0.53 + 1) * 1.5; }
    function bulbPos(t) { var a = ang(t) * Math.PI / 180; return [BX + Math.sin(a) * (BLEN + 10), BY0 + Math.cos(a) * (BLEN + 10)]; }
    var amb = {
      bulb: function (t) {
        var p = bulbPos(t);
        return '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="120" fill="url(#cellar-halo)"/>' +
          '<g transform="translate(' + BX + ' ' + BY0 + ') rotate(' + f1(-ang(t)) + ')">' + bulbG + '</g>';
      },
      pool: function (t) {
        var p = bulbPos(t), px = BX + (p[0] - BX) * 2.2;
        return '<ellipse cx="' + f1(px) + '" cy="880" rx="560" ry="120" fill="url(#cellar-pool)"/>' +
          '<ellipse cx="' + f1(p[0]) + '" cy="' + f1(p[1] + 120) + '" rx="620" ry="460" fill="url(#cellar-wallglow)"/>';
      },
      dark: function (t) {
        var p = bulbPos(t);
        return '<rect x="-400" y="-20" width="2720" height="1120" fill="url(#cellar-dark)" transform="translate(' + f1((p[0] - BX) * 1.6) + ' 0)"/>';
      }
    };
    var defs = '<radialGradient id="cellar-halo"><stop offset="0" stop-color="#fff2b8" stop-opacity=".9"/><stop offset=".35" stop-color="#ffe08a" stop-opacity=".35"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="cellar-pool"><stop offset="0" stop-color="#ffe7a0" stop-opacity=".5"/><stop offset="1" stop-color="#ffe7a0" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="cellar-wallglow"><stop offset="0" stop-color="#ffdf96" stop-opacity=".42"/><stop offset=".6" stop-color="#ffdf96" stop-opacity=".08"/><stop offset="1" stop-color="#ffdf96" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="cellar-dark" gradientUnits="userSpaceOnUse" cx="960" cy="520" r="1150"><stop offset=".3" stop-color="#140d07" stop-opacity="0"/><stop offset=".7" stop-color="#140d07" stop-opacity=".5"/><stop offset="1" stop-color="#140d07" stop-opacity=".8"/></radialGradient>';
    S.defs += defs;
    return { bg: bg, fg: fg, amb: amb };
  }

  A.define('cellar', {
    seed: 31, ambient: true, build: build,
    slots: {
      left:   A.slot(640, 950, 1.0, { face: 1 }),
      center: A.slot(960, 940, 0.98),
      right:  A.slot(1290, 950, 1.0, { face: -1 }),
      boxes:  A.slot(560, 960, 1.02, { face: -1 }),     // next to the left carton stack, turned to the boxes
      stairs: A.slot(1380, 860, 0.9, { face: -1 }),     // at the foot of the stairs
      back:   A.slot(1000, 820, 0.8)
    }
  });
})(typeof self !== 'undefined' ? self : this);
