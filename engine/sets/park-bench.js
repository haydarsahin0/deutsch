/* Set "park-bench" — autumn park, overcast and a little melancholic (break-up mood): rust/ochre trees, a row of distant
 * trees, a gravel path curving away, an old lamppost, a wooden bench with cast-iron legs (bg — characters sit on it),
 * leaves on the ground. Ambient: leaves falling in the foreground layer. Illustrator B · see engine/sets/kit-b.js
 */
(function (root) {
  'use strict';
  var K = root.SetKitB || require('./kit-b.js');
  var P = K.P, U = K.U;
  var HZ = 600, SEAT = 872, GROUND = 986;
  var LEAF = ['#c8692e', '#d9a03c', '#a8432c', '#b8862e', '#8a4e2a'];

  function canopy(S, blobs, cols) {
    var s = '';
    blobs.forEach(function (b, i) {
      var pts = [];
      for (var k = 0; k < 11; k++) { var a = k / 11 * Math.PI * 2, rr = b[2] * (0.86 + 0.1 * Math.sin(k * 1.9 + i * 3) + 0.06 * S.r()); pts.push([b[0] + rr * Math.cos(a), b[1] + rr * 0.78 * Math.sin(a)]); }
      pts = U.catmull(pts, 5, true);
      s += S.shape(pts, cols[i % cols.length], { w: 2.2, extra: 2.6 });
      s += S.hatch(pts, { ang: 50, gap: 7, w: 1.1, op: 0.45, cond: function (X, Y) { return (X - b[0]) * 0.5 + (Y - b[1]) > b[2] * 0.2; } });
      for (var d = 0; d < 7; d++) { var a2 = S.r() * Math.PI * 2, r2 = b[2] * 0.7 * Math.sqrt(S.r()); s += S.dot(b[0] + r2 * Math.cos(a2), b[1] + r2 * 0.7 * Math.sin(a2), 3.5, LEAF[(d + i) % 5]); }
    });
    return s;
  }
  function trunk(S, x, y0, y1, w, lean) {
    var s = S.line(U.catmull([[x, y1], [x - 6 + lean * 0.3, (y0 + y1) / 2], [x + lean, y0]], 6, false), { w: w, ta: 0.02, tb: 0.5, min: 0.4 }, '#4e3a2c');
    s += S.line([[x + lean * 0.5, (y0 + y1) / 2 - 40], [x + lean * 0.5 + w * 2.6, y0 + 30]], { w: w * 0.4, ta: 0.05, tb: 0.6, min: 0.3 }, '#4e3a2c');
    s += S.line([[x + lean * 0.4, (y0 + y1) / 2], [x + lean * 0.4 - w * 2.4, y0 + 60]], { w: w * 0.35, ta: 0.05, tb: 0.6, min: 0.3 }, '#4e3a2c');
    s += S.hatch(S.rect(x - w / 2, y0, w, y1 - y0), { ang: 85, gap: 5, w: 1.1, op: 0.5, cond: function (X) { return X > x; } });
    return s;
  }

  function scene(S) {
    var s = '';
    s += S.fillOnly([[-20, -20], [1940, -20], [1940, HZ + 20], [-20, HZ + 20]], S.linear([[0, '#cfcabb'], [1, '#e2dac4']], 0, 0, 0, 1));
    s += S.hatch([[-20, -20], [1940, -20], [1940, 260], [-20, 260]], { ang: 12, gap: 10, w: 1.2, op: 0.18 });
    // distant tree line + city hint
    s += S.box(1240, 420, 60, 190, '#b7b3a4', { w: 1.6, extra: 1.2, step: 40 }) + S.box(1310, 470, 90, 140, '#c2bdac', { w: 1.6, extra: 1.2, step: 40 });
    var far = [];
    for (var x = -40; x < 1980; x += 70) far.push([x, HZ - 60 - 50 * Math.abs(Math.sin(x * 0.013)) - 30 * S.r()]);
    var fl = [[-40, HZ + 20]].concat(U.catmull(far, 4, false)).concat([[1980, HZ + 20]]);
    s += S.shape(fl, '#a9ab8e', { w: 2, extra: 1.6 });
    s += S.hatch(fl, { ang: 70, gap: 7, w: 1, op: 0.3 });
    // meadow
    var mead = [[-20, HZ], [1940, HZ], [1940, 1100], [-20, 1100]];
    s += S.fillOnly(mead, '#9c9a6a');
    s += S.hatch(mead, { ang: 0, gap: 8, w: 1.1, op: 0.25, cond: function (X, Y) { return Y < HZ + 120 || S.r() < 0.25; } });
    // grass tufts
    var T = [];
    for (var i = 0; i < 90; i++) { var gx = S.r() * 1920, gy = HZ + 20 + Math.pow(S.r(), 0.8) * 300; T.push([[gx, gy], [gx - 3, gy - 10 - S.r() * 8]], [[gx + 4, gy], [gx + 7, gy - 9]]); }
    s += S.lines(T, { w: 1.4, ta: 0.05, tb: 0.6 }, '#4f5a2e', ' opacity=".6"');
    // gravel path: from bottom-left curving to the back right
    var pl = U.catmull([[200, 1100], [520, 960], [900, 760], [1180, 650], [1320, HZ + 4]], 6, false), pr = U.catmull([[1120, 1100], [1160, 960], [1220, 790], [1320, 670], [1370, HZ + 4]], 6, false);
    var path = pl.concat(pr.slice().reverse());
    s += S.shape(path, '#d6c8a6', { w: 2.4, extra: 1.6 });
    s += S.stipple(path, 500, { r: 2, op: 0.35, color: '#6b5a3a' });
    // trees
    s += trunk(S, 230, 120, 990, 46, 20) + trunk(S, 1720, 160, 960, 40, -24) + trunk(S, 1520, 360, 640, 16, 6);
    s += canopy(S, [[1520, 320, 90], [1580, 380, 70], [1460, 380, 70]], ['#b8862e', '#c8692e', '#a8432c']);
    s += canopy(S, [[120, 60, 190], [330, 120, 170], [40, 260, 140], [260, 290, 130], [470, 40, 120]], ['#c8692e', '#d9a03c', '#a8432c', '#b8862e']);
    s += canopy(S, [[1800, 90, 190], [1600, 70, 150], [1880, 300, 130], [1700, 260, 120]], ['#a8432c', '#c8692e', '#8a4e2a', '#d9a03c']);
    // leaves on the ground (+ a pile on the left)
    var lv = '';
    for (var j = 0; j < 160; j++) {
      var lx = S.r() * 1920, ly = HZ + 30 + Math.pow(S.r(), 0.7) * 470, sz = 4 + (ly - HZ) / 60;
      lv += '<ellipse cx="' + U.f1(lx) + '" cy="' + U.f1(ly) + '" rx="' + U.f1(sz) + '" ry="' + U.f1(sz * 0.45) + '" transform="rotate(' + Math.round(S.r() * 180) + ' ' + U.f1(lx) + ' ' + U.f1(ly) + ')" fill="' + LEAF[j % 5] + '"/>';
    }
    s += lv;
    var pile = U.catmull([[60, 1000], [120, 960], [230, 950], [330, 980], [380, 1010]], 5, false).concat([[380, 1012], [60, 1012]]);
    s += S.shape(pile, '#b8712f', { w: 2, extra: 2 });
    for (var k = 0; k < 30; k++) { var px = 80 + S.r() * 290, py = 960 + S.r() * 44; s += '<ellipse cx="' + U.f1(px) + '" cy="' + U.f1(py) + '" rx="9" ry="4" transform="rotate(' + Math.round(S.r() * 180) + ' ' + U.f1(px) + ' ' + U.f1(py) + ')" fill="' + LEAF[k % 5] + '" stroke="' + P.ink + '" stroke-width="1"/>'; }
    return s;
  }

  function lamppost(S, x) {
    var s = S.floorShadow(x, 990, 50, 8, 0.25);
    s += S.box(x - 18, 940, 36, 50, '#2c333b', { w: 2, extra: 2.2, step: 20 });
    s += S.line([[x, 945], [x, 420]], { w: 12, ta: 0.02, tb: 0.02, min: 0.7 }, '#2c333b');
    var lan = S.poly([[x - 26, 360], [x + 26, 360], [x + 34, 420], [x - 34, 420]], 12, 0.5);
    s += S.shape(lan, '#e8e0c8', { w: 2.4, extra: 2.6 });
    s += S.shape(S.poly([[x - 36, 360], [x + 36, 360], [x, 330]], 10, 0.4), '#2c333b', { w: 2, extra: 2 });
    s += S.box(x - 38, 418, 76, 10, '#2c333b', { w: 1.6, extra: 1.6, step: 20 });
    return s;
  }

  function bench(S) {
    var s = '', x0 = 650, x1 = 1270;
    s += S.floorShadow(960, GROUND + 4, 340, 20, 0.28);
    // cast iron side frames
    [x0 + 30, x1 - 30].forEach(function (lx) {
      s += S.line(U.catmull([[lx - 30, GROUND], [lx - 20, SEAT + 40], [lx, SEAT + 8]], 5, false), { w: 10, ta: 0.02, tb: 0.02, min: 0.8 }, '#2a2622');
      s += S.line(U.catmull([[lx + 34, GROUND], [lx + 22, SEAT + 40], [lx, SEAT + 8]], 5, false), { w: 10, ta: 0.02, tb: 0.02, min: 0.8 }, '#2a2622');
      s += S.line(U.catmull([[lx + 12, SEAT], [lx + 20, 760], [lx + 8, 690]], 5, false), { w: 10, ta: 0.02, tb: 0.02, min: 0.8 }, '#2a2622');
      s += S.line(U.catmull([[lx - 10, SEAT - 20], [lx - 26, SEAT - 40], [lx - 20, SEAT - 60], [lx + 4, SEAT - 50]], 5, false), { w: 5, ta: 0.05, tb: 0.3 }, '#2a2622');
    });
    // back slats
    [700, 740, 780].forEach(function (y) { s += S.box(x0, y, x1 - x0, 26, '#8a6040', { w: 2.4, extra: 2.6, step: 60, hatch: 'b', hk: 0.4 }); });
    // seat slats (seen slightly from above)
    s += S.box(x0 - 10, SEAT - 12, x1 - x0 + 20, 14, '#a07650', { w: 2.2, extra: 2.4, step: 60 });
    s += S.box(x0 - 14, SEAT, x1 - x0 + 28, 20, '#8a6040', { w: 2.6, extra: 3, step: 60, hatch: 'b', hk: 0.5 });
    // small plaque + a forgotten scarf
    s += S.box(930, 748, 60, 18, '#c9a24a', { w: 1.2, extra: 1, step: 20 });
    var sc = U.catmull([[1190, SEAT - 6], [1210, SEAT + 30], [1200, SEAT + 80], [1214, SEAT + 100]], 5, false);
    s += S.line(sc, { w: 18, ta: 0.05, tb: 0.1, min: 0.7 }) + S.line(sc, { w: 13, ta: 0.05, tb: 0.1, min: 0.7 }, P.red);
    // trash bin with a crumpled paper heart? (break-up hint: a torn photo)
    s += S.box(1340, 900, 64, 86, '#4f5a4a', { w: 2.2, extra: 2.6, hatch: 'r', hk: 0.3 });
    s += S.box(1334, 894, 76, 12, '#3f4a3a', { w: 1.6, extra: 1.6, step: 20 });
    s += S.shape(U.xf(S.rect(-22, -16, 44, 32, 20, 1), 1370, 888, -12), P.paperL, { w: 1.4, extra: 1.2 });
    s += S.line([[1366, 873], [1374, 902]], { w: 1.6, ta: 0.1, tb: 0.1 }, P.red);
    return s;
  }

  // falling leaves (ambient, foreground): deterministic paths, cheap shapes
  var FALL = (function () { var r = U.rng(4242), a = []; for (var i = 0; i < 12; i++) a.push({ x: r() * 1920, y: r() * 1100, sp: 40 + r() * 50, sw: 30 + r() * 50, ph: r() * 6, s: 0.8 + r() * 0.8, c: LEAF[i % 5] }); return a; })();
  function fallingLeaves(t) {
    var s = '';
    FALL.forEach(function (l) {
      var y = ((l.y + t * l.sp) % 1180) - 60, x = l.x + Math.sin(t * 0.9 + l.ph) * l.sw + t * 12;
      x = ((x % 2000) + 2000) % 2000 - 40;
      var rot = Math.round(Math.sin(t * 1.7 + l.ph) * 70 + l.ph * 30), k = l.s;
      s += '<g transform="translate(' + U.f1(x) + ' ' + U.f1(y) + ') rotate(' + rot + ') scale(' + U.f1(k) + ' ' + U.f1(k * (0.55 + 0.45 * Math.abs(Math.cos(t * 1.3 + l.ph)))) + ')">' +
        '<path d="M-14 0Q-6 -9 0 -8Q8 -9 14 0Q8 9 0 8Q-6 9 -14 0Z" fill="' + l.c + '" stroke="#17130f" stroke-width="1.8"/><path d="M-14 0L12 0" stroke="#17130f" stroke-width="1.1"/></g>';
    });
    return s;
  }

  K.define('park-bench', {
    seed: 131,
    ambient: true,
    slots: {
      'bench-left': K.slot(850, GROUND, 1.0, { face: 1, seated: true, seatY: SEAT }),
      'bench-right': K.slot(1070, GROUND, 1.0, { face: -1, seated: true, seatY: SEAT }),
      left: K.slot(470, 992, 1.06, { face: 1 }), center: K.slot(960, 1000, 1.08), right: K.slot(1500, 992, 1.06, { face: -1 }),
      path: K.slot(1280, 700, 0.6, { face: -1 })          // walking away along the path
    },
    build: function () {
      return {
        bg: function (S) {
          return scene(S) + lamppost(S, 1460) + bench(S) +
            '<rect x="0" y="0" width="1920" height="1080" fill="' + S.linear([[0, '#5a6a7a', 0.12], [1, '#3a2a18', 0.1]], 0, 0, 0, 1) + '"/>' +
            '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.55, '#2a2018', 0], [1, '#2a2018', 0.3]], { cx: '50%', cy: '50%', r: '75%' }) + '"/>';
        },
        fg: function () { return '<!--amb:leaves-->'; },
        amb: { leaves: function (t) { return fallingLeaves(t || 0); } }
      };
    }
  });
})(typeof self !== 'undefined' ? self : this);
