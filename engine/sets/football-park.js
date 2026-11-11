/* football-park — sunny park with a small kids' football goal, two schoolbags as the other "goal", trees, bench,
 * bicycle, houses beyond the hedge. variant:'retro' = faded sepia photo (childhood memory): colour remap, vignette,
 * scratches, light leak and a date stamp. Static set. (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var HOR = 560;

  function tree(S, x, y, r, o) {
    o = o || {};
    var s = S.floorShadow(x + 30, y + 6, r * 1.1, 26, 0.22);
    var trunk = U.catmull([[x - 26, y], [x - 18, y - r * 0.8], [x - 30, y - r * 1.5], [x + 4, y - r * 1.2], [x + 30, y - r * 1.55], [x + 18, y - r * 0.8], [x + 28, y]], 5, true);
    s += S.shape(trunk, '#7a5638', { w: 3, extra: 3.4 }) + A.shadeSide(S, trunk, [1, 0], 0.1, { ang: 80, gap: 6 });
    // canopy: overlapping leafy blobs, darker underneath
    var blobs = o.blobs || [[0, -1.9, 1], [-0.8, -1.6, 0.75], [0.85, -1.62, 0.78], [-0.4, -2.45, 0.7], [0.5, -2.4, 0.72], [-1.25, -1.95, 0.55], [1.25, -2.0, 0.55]];
    var cols = o.cols || [P.green, P.greenM, '#7da455', P.greenM, '#7da455', P.green, P.green];
    blobs.forEach(function (b, i) {
      var cx = x + b[0] * r, cy = y + b[1] * r, rr = b[2] * r, pts = [];
      for (var k = 0; k < 44; k++) { var a = k / 44 * Math.PI * 2, q = rr * (0.93 + 0.07 * Math.abs(Math.sin(a * 5.5 + i)) + 0.03 * S.r()); pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q * 0.86]); }
      s += S.shape(pts, cols[i % cols.length], { w: 2.6, extra: 3 });
      s += S.hatch(pts, { ang: 50, gap: 7, w: 1.2, op: 0.4, cond: function (X, Y) { return (X - cx) * 0.5 + (Y - cy) * 0.85 > rr * 0.3; } });
      // leaf ticks
      var tk = [];
      for (k = 0; k < 10; k++) { var a2 = S.r() * Math.PI * 2, q2 = rr * Math.sqrt(S.r()) * 0.8, tx = cx + Math.cos(a2) * q2, ty = cy + Math.sin(a2) * q2 * 0.86; tk.push([[tx, ty], [tx + 8, ty - 6]]); }
      s += S.lines(tk, { w: 2, ta: 0.2, tb: 0.5, min: 0.3 }, P.ink, ' opacity=".5"');
    });
    return s;
  }
  function cloud(S, x, y, w) {
    var pts = [], bumps = [[-0.45, 0.05, 0.22], [-0.2, -0.18, 0.28], [0.12, -0.22, 0.3], [0.38, -0.02, 0.22], [0, 0.08, 0.3]];
    var s = '';
    bumps.forEach(function (b) { s += S.shape(S.ellipse(x + b[0] * w, y + b[1] * w * 0.5, b[2] * w, b[2] * w * 0.62, 30), '#f7f2e4', { w: 0 }); });
    var out = [];
    for (var k = 0; k <= 30; k++) { var a = Math.PI + k / 30 * Math.PI; out.push([x + Math.cos(a) * w * 0.62, y + Math.sin(a) * w * 0.3 + 6 * Math.sin(k * 1.3)]); }
    s += S.line(U.catmull(out, 2, false), { w: 2.4, ta: 0.2, tb: 0.2, min: 0.4 }, P.ink, ' opacity=".55"');
    s += S.line([[x - w * 0.6, y + w * 0.08], [x + w * 0.58, y + w * 0.08]], { w: 2, ta: 0.3, tb: 0.3, min: 0.3 }, '#9fb6c4');
    return s;
  }
  function goal(S, x0, x1, yb, h) {
    var s = '', depth = 70, back = 90;
    s += S.floorShadow((x0 + x1) / 2 + 20, yb + 4, (x1 - x0) * 0.55, 16, 0.2);
    // back frame (behind the net)
    var bx0 = x0 + depth, bx1 = x1 + depth * 0.4, by = yb - back * 0.2;
    var net = [[x0, yb - h], [x1, yb - h], [bx1, by], [bx0 + 10, by], [x0, yb - h]];
    var netArea = S.poly([[x0, yb - h], [x1, yb - h], [x1, yb], [x0, yb]], 30, 0.5);
    var nl = [];
    for (var X = x0; X <= x1; X += 22) nl.push([[X, yb - h], [X + (X - x0) / (x1 - x0) * depth * 0.4 + depth * (1 - (X - x0) / (x1 - x0)) * 0.9, yb - 2]]);
    for (var Y = yb - h; Y <= yb; Y += 20) nl.push([[x0 + (Y - (yb - h)) / h * depth, Y], [x1 + (Y - (yb - h)) / h * depth * 0.4, Y]]);
    s += S.lines(nl, { w: 1.5, ta: 0.05, tb: 0.05, min: 0.6 }, '#f4f1e6', ' opacity=".9"');
    s += S.lines(nl.map(function (l) { return l.map(function (p) { return [p[0] + 1.5, p[1] + 1.5]; }); }), { w: 1, ta: 0.05, tb: 0.05, min: 0.6 }, P.ink, ' opacity=".35"');
    // posts + crossbar (white with ink)
    function post(a, b) { return S.line([a, b], { w: 16, ta: 0.02, tb: 0.02, min: 0.95, jit: 0.05 }) + S.line([a, b], { w: 10, ta: 0.02, tb: 0.02, min: 0.95, jit: 0.05 }, '#f6f3ea'); }
    s += post([x0 + depth, yb - 4], [x0, yb - h]);
    s += post([x0, yb + 4], [x0, yb - h]) + post([x1, yb + 4], [x1, yb - h]) + post([x0 - 4, yb - h], [x1 + 4, yb - h]);
    s += S.lines([[[x0 + 3, yb - h + 10], [x0 + 3, yb]], [[x1 + 3, yb - h + 10], [x1 + 3, yb]]], { w: 2, ta: 0.05, tb: 0.05 }, P.ink, ' opacity=".5"');
    return s;
  }
  function ball(S, x, y, r) {
    var s = S.floorShadow(x + 6, y + r * 0.9, r * 1.1, r * 0.25, 0.25);
    s += S.circ(x, y, r, '#f6f3ea', { w: 2.6, extra: 2.6 });
    var pent = []; for (var k = 0; k < 5; k++) { var a = -Math.PI / 2 + k / 5 * Math.PI * 2; pent.push([x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.32]); }
    s += S.shape(pent, P.ink, { w: 1, extra: 0.6 });
    for (k = 0; k < 5; k++) { a = -Math.PI / 2 + k / 5 * Math.PI * 2; s += S.seg(x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.32, x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86, 2); }
    s += S.hatch(S.ellipse(x, y, r * 0.98, r * 0.98, 30), { ang: 45, gap: 5, w: 1.1, op: 0.4, cond: function (X, Y) { return (X - x) + (Y - y) > r * 0.6; } });
    return s;
  }
  function bag(S, x, y, col) {
    var b = U.catmull([[x - 46, y], [x - 50, y - 50], [x - 30, y - 74], [x + 30, y - 74], [x + 50, y - 50], [x + 46, y]], 5, false);
    var s = S.floorShadow(x, y + 2, 60, 9, 0.25) + S.shape(b, col, { w: 2.6, extra: 3 }) + A.shadeSide(S, b, [1, 0.3], 0.3, { ang: 70, gap: 6 });
    s += S.box(x - 30, y - 44, 60, 30, col, { w: 2, extra: 2, hatch: false }) + S.line(U.catmull([[x - 20, y - 72], [x, y - 92], [x + 20, y - 72]], 4, false), { w: 5, ta: 0.05, tb: 0.05 });
    s += S.box(x - 8, y - 36, 16, 10, P.yellow, { w: 1.4, extra: 1, step: 20, hatch: false });
    return s;
  }
  function bench(S, x, y) {
    var s = S.floorShadow(x, y + 4, 150, 12, 0.22);
    [[x - 120, 0], [x + 100, 0]].forEach(function (l) { s += S.box(l[0], y - 90, 20, 90, '#4a4f4c', { w: 2.2, extra: 2.4, hatch: false }); });
    for (var i = 0; i < 2; i++) s += S.box(x - 150, y - 100 + i * 16, 300, 14, P.woodM, { w: 2.2, extra: 2.4, hatch: 'b', hk: 0.4 });
    for (i = 0; i < 3; i++) s += S.box(x - 150, y - 200 + i * 26, 300, 18, P.wood, { w: 2.2, extra: 2.4, hatch: 'b', hk: 0.4 });
    s += S.box(x - 140, y - 210, 18, 120, '#4a4f4c', { w: 2, extra: 2, hatch: false }) + S.box(x + 122, y - 210, 18, 120, '#4a4f4c', { w: 2, extra: 2, hatch: false });
    // water bottle + jacket
    s += S.bottle(x + 80, y - 102, 70, '#8fc0d0', { cap: P.red });
    var jk = U.catmull([[x - 120, y - 104], [x - 40, y - 112], [x - 10, y - 100], [x - 30, y - 60], [x - 60, y - 40], [x - 110, y - 70]], 5, true);
    s += S.shape(jk, P.red, { w: 2.2, extra: 2.4 }) + A.shadeSide(S, jk, [0.5, 1], 0.3, { ang: 30, gap: 6 });
    return s;
  }
  function bicycle(S, x, y) {
    var s = '', r = 62;
    var w1 = [x - 90, y - r], w2 = [x + 90, y - r];
    [w1, w2].forEach(function (w) {
      s += S.shape(S.ellipse(w[0], w[1], r, r, 40, 0.004), null, { w: 6, extra: 1 });
      var sp = []; for (var k = 0; k < 8; k++) { var a = k / 8 * Math.PI; sp.push([[w[0] - Math.cos(a) * r, w[1] - Math.sin(a) * r], [w[0] + Math.cos(a) * r, w[1] + Math.sin(a) * r]]); }
      s += S.lines(sp, { w: 1, ta: 0.05, tb: 0.05, min: 0.6 }, P.ink, ' opacity=".6"');
    });
    var fr = [[w1, [x - 10, y - r]], [[x - 10, y - r], [x - 30, y - r - 80]], [[x - 30, y - r - 80], w1], [[x - 30, y - r - 80], [x + 60, y - r - 76]], [[x + 60, y - r - 76], [x - 10, y - r]], [[x + 60, y - r - 76], w2], [[x + 56, y - r - 76], [x + 66, y - r - 110]]];
    fr.forEach(function (l) { s += S.line(l, { w: 9, ta: 0.02, tb: 0.02, min: 0.9 }) + S.line(l, { w: 4.5, ta: 0.02, tb: 0.02, min: 0.9 }, P.teal); });
    s += S.line([[x + 46, y - r - 112], [x + 86, y - r - 116]], { w: 6, ta: 0.05, tb: 0.05 }) + S.box(x - 52, y - r - 96, 44, 12, P.ink, { w: 1, extra: 0.6, step: 20, hatch: false });
    return s;
  }

  function build(S, opts) {
    var retro = opts.variant === 'retro', bg = '';
    // ── sky ──
    bg += S.fillOnly(S.rect(-20, -20, 1960, HOR + 40), S.linear([[0, '#a9cbd6'], [0.7, '#dce9e2'], [1, '#efe9d2']], 0, 0, 0, 1));
    bg += S.hatch(S.rect(-20, -20, 1960, 200), { ang: 20, gap: 12, w: 1.2, op: 0.15, color: '#3e6b8a' });
    bg += cloud(S, 520, 150, 300) + cloud(S, 1260, 100, 380) + cloud(S, 1760, 220, 220);
    // ── distant town + hedge ──
    var town = '', tx = -20, k = 0;
    while (tx < 1940) {
      var w = 90 + (k * 37) % 70, h = 70 + (k * 53) % 90;
      if (k === 6) { // church tower
        town += S.shape(S.poly([[tx, HOR], [tx, HOR - 210], [tx + 30, HOR - 270], [tx + 60, HOR - 210], [tx + 60, HOR]], 20, 1), '#9aa8a4', { w: 2, extra: 2 });
        town += S.circ(tx + 30, HOR - 180, 12, '#e8e2c8', { w: 1.4, extra: 1 });
        tx += 60; k++; continue;
      }
      town += S.shape(S.poly([[tx, HOR], [tx, HOR - h], [tx + w / 2, HOR - h - 40], [tx + w, HOR - h], [tx + w, HOR]], 20, 1), k % 2 ? '#a7b3aa' : '#b6beb0', { w: 2, extra: 1.8 });
      town += S.shape(S.poly([[tx - 4, HOR - h + 2], [tx + w / 2, HOR - h - 42], [tx + w + 4, HOR - h + 2]], 20, 0.6), k % 3 ? '#b88468' : '#a87a62', { w: 1.6, extra: 1.6 });
      for (var q = 0; q < 2; q++) town += S.box(tx + 18 + q * (w / 2), HOR - h + 20, 16, 22, '#e8e2c8', { w: 1.2, extra: 0.8, step: 20, hatch: false });
      tx += w + 4; k++;
    }
    bg += '<g opacity=".85">' + town + '</g>';
    var hedge = [[-20, HOR + 30]];
    for (var x = -20; x <= 1960; x += 40) hedge.push([x, HOR - 30 - 18 * Math.abs(Math.sin(x / 70)) - 8 * Math.sin(x / 23)]);
    hedge.push([1960, HOR + 30]);
    bg += S.shape(hedge, '#5d8a45', { w: 2.6, extra: 2.4 }) + S.hatch(hedge, { ang: 60, gap: 7, w: 1.2, op: 0.35 });

    // ── grass with mow stripes (perspective) ──
    var field = [[-20, HOR], [1940, HOR], [1940, 1100], [-20, 1100]];
    bg += S.fillOnly(field, '#86ad5a');
    var stripes = '', vx = 960, vy = 300;
    for (var xb = -2400; xb < 4400; xb += 320) {
      var xa = vx + (xb - vx) * (HOR - vy) / (1100 - vy), xa2 = vx + (xb + 160 - vx) * (HOR - vy) / (1100 - vy);
      stripes += 'M' + f1(xa) + ' ' + HOR + 'L' + f1(xa2) + ' ' + HOR + 'L' + f1(xb + 160) + ' 1100L' + f1(xb) + ' 1100Z';
    }
    bg += '<path d="' + stripes + '" fill="#79a150" opacity=".8"/>';
    bg += S.fillOnly(S.rect(-20, HOR, 1960, 40), 'rgba(40,60,20,.18)');
    // grass tufts (sparser toward the subtitle zone)
    var tufts = [];
    for (var i = 0; i < 160; i++) {
      var gx = S.rand(-20, 1940), gy = HOR + 20 + Math.pow(S.r(), 1.3) * 330, sz = 4 + (gy - HOR) / 40;
      tufts.push([[gx - sz, gy], [gx - sz * 0.6, gy - sz * 1.6]]); tufts.push([[gx, gy], [gx + sz * 0.2, gy - sz * 2]]); tufts.push([[gx + sz, gy], [gx + sz * 0.8, gy - sz * 1.5]]);
    }
    bg += S.lines(tufts, { w: 1.8, ta: 0.05, tb: 0.6, min: 0.3 }, '#3f6329', ' opacity=".6"');
    // chalk touchline + path
    bg += S.line(U.catmull([[-20, 760], [600, 742], [1300, 742], [1940, 760]], 6, false), { w: 6, ta: 0.02, tb: 0.02, min: 0.6, jit: 0.4 }, '#f4f1e6', ' opacity=".75"');
    var path = [[-20, 640], [260, 630], [520, 700], [440, 1100], [-20, 1100]];
    bg += S.shape(U.catmull(path, 6, false), '#d9c79a', { w: 2.2, extra: 2 });
    bg += S.stipple(U.catmull(path, 6, false), 500, { r: 2.4, op: 0.3 });

    // ── trees, bench, bicycle ──
    bg += tree(S, 1660, 640, 150) + tree(S, 160, 660, 170, { cols: [P.greenM, P.green, '#7da455', P.green, P.greenM, '#7da455', P.green] });
    bg += tree(S, 860, 590, 80);
    bg += bicycle(S, 360, 690);
    bg += bench(S, 640, 720);
    // ── goals: kids' goal (right) + schoolbags (left) ──
    bg += goal(S, 1370, 1740, 900, 230);
    bg += bag(S, 230, 930, P.red) + bag(S, 470, 935, P.blue);
    bg += ball(S, 1140, 900, 30);
    // cones
    [[760, 820], [1000, 830]].forEach(function (c) { bg += S.shape(S.poly([[c[0] - 16, c[1]], [c[0], c[1] - 40], [c[0] + 16, c[1]]], 10, 0.6), '#e07a3a', { w: 2, extra: 2 }) + S.box(c[0] - 20, c[1] - 4, 40, 8, '#e07a3a', { w: 1.6, extra: 1.4, step: 20, hatch: false }); });

    var post = null;
    if (retro) {
      // faded photo: scratches, dust, light leak, vignette + date stamp, then colour remap
      var sc = [];
      for (i = 0; i < 14; i++) { var sx = S.rand(0, 1920), sy = S.rand(0, 700); sc.push([[sx, sy], [sx + S.rand(-6, 6), sy + S.rand(60, 260)]]); }
      bg += S.lines(sc, { w: 1.4, ta: 0.3, tb: 0.3, min: 0.2 }, '#fbf3df', ' opacity=".55"');
      bg += S.stipple(S.rect(0, 0, 1920, 1080), 260, { r: 3, op: 0.3, color: '#3b2a18' });
      bg += S.glow(1880, 120, 420, 360, '#ffb070', 0.35);
      bg += '<rect x="-20" y="-20" width="1960" height="1120" fill="url(#football-park-vig)"/>';
      bg += S.T(1660, 860, '’98  7  14', { f: 'Oswald', s: 40, c: '#ff8a3a', ls: 4, a: 'middle', op: 0.85 });
      S.defs += '<radialGradient id="football-park-vig" cx="50%" cy="46%" r="72%"><stop offset=".55" stop-color="#3b2510" stop-opacity="0"/><stop offset="1" stop-color="#3b2510" stop-opacity=".55"/></radialGradient>';
      post = function (m) { return A.sepia(m, 0.82); };
    }
    return { bg: bg, post: post };
  }

  A.define('football-park', {
    seed: 71, build: build, variants: ['retro'],
    slots: {
      left:   A.slot(560, 960, 1.0, { face: 1 }),
      center: A.slot(960, 955, 1.0),
      right:  A.slot(1300, 960, 1.0, { face: -1 }),
      goal:   A.slot(1560, 905, 0.92, { face: -1 }),     // goalkeeper in front of the goal
      kick:   A.slot(1050, 940, 1.0, { face: 1 }),       // next to the ball, facing the goal
      back:   A.slot(820, 800, 0.8)
    }
  });
})(typeof self !== 'undefined' ? self : this);
