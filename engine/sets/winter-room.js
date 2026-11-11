/* winter-room — cold living room in winter: frosted window with snow outside, broken cast-iron radiator with icicles,
 * armchair with a blanket, scarf on a hook, thermometer at 12 °C. Ambient: snowfall outside, steam from a tea mug.
 * (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var WALL_Y = 780;
  var WIN = { x: 560, y: 120, w: 560, h: 470 };

  function frost(S, x, y, w, h) {
    // frost ferns growing from the pane corners/edges
    var L = [];
    function fern(x0, y0, a, len, depth) {
      var x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      L.push([[x0, y0], [x1, y1]]);
      if (depth <= 0) return;
      for (var k = 1; k <= 3; k++) {
        var t = k / 4, bx = x0 + (x1 - x0) * t, by = y0 + (y1 - y0) * t;
        fern(bx, by, a + 0.7, len * 0.42, depth - 1); fern(bx, by, a - 0.7, len * 0.42, depth - 1);
      }
    }
    [[x, y + h, -0.9, 170], [x + w, y + h, -2.3, 160], [x, y, 0.7, 120], [x + w, y, 2.4, 130], [x + w * 0.5, y + h, -1.4, 110], [x + w * 0.5, y, 1.7, 90]].forEach(function (f) { fern(f[0], f[1], f[2], f[3], 2); });
    var edge = S.hatch(S.rect(x, y, w, h), { ang: 35, gap: 5, w: 1.6, op: 0.6, color: '#ffffff', cond: function (X, Y) { var d = Math.min(X - x, x + w - X, Y - y, y + h - Y); return d < 26 + 14 * Math.sin(X / 23 + Y / 31); } });
    return edge + S.lines(L, { w: 2.6, ta: 0.1, tb: 0.6, min: 0.2 }, '#ffffff', ' opacity=".9"');
  }
  function radiator(S, x, y, w, h) {
    var s = S.floorShadow(x + w / 2, y + 6, w * 0.6, 12, 0.25), n = Math.floor(w / 34);
    s += S.fillOnly(S.rect(x, y - h + 14, n * 34, h - 28), '#4a4f4c');
    // pipes
    s += S.line([[x - 30, y - 30], [x - 30, y + 2]], { w: 14, ta: 0.02, tb: 0.02, min: 0.9 }) + S.line([[x - 30, y - 30], [x - 30, y + 2]], { w: 8, ta: 0.02, tb: 0.02, min: 0.9 }, '#b9b6a8');
    s += S.line([[x - 30, y - 30], [x, y - 30]], { w: 14, ta: 0.02, tb: 0.02, min: 0.9 }) + S.line([[x - 30, y - 30], [x, y - 30]], { w: 8, ta: 0.02, tb: 0.02, min: 0.9 }, '#b9b6a8');
    for (var i = 0; i < n; i++) {
      var fx = x + i * 34;
      var fin = U.catmull([[fx + 2, y - h + 12], [fx + 16, y - h], [fx + 30, y - h + 12], [fx + 30, y - 12], [fx + 16, y], [fx + 2, y - 12]], 4, true);
      s += S.shape(fin, '#d8d4c4', { w: 2.2, extra: 2.4 });
      s += S.hatch(fin, { ang: 80, gap: 5, w: 1, op: 0.45, cond: function (X) { return X > fx + 18; } });
    }
    s += S.box(x - 4, y - h * 0.5 - 8, n * 34 + 8, 16, '#cfcab8', { w: 2, extra: 2, step: 30 });
    // valve knob (frozen)
    s += S.circ(x + n * 34 + 20, y - h + 26, 16, P.red, { w: 2.4, extra: 2 }) + S.seg(x + n * 34 + 8, y - h + 26, x + n * 34 + 32, y - h + 26, 2.4);
    s += S.T(x + n * 34 + 22, y - h - 6, '❄', { f: 'Oswald', s: 18, c: P.blue });
    // icicles hanging from the bottom of the fins + frost rim on top
    var ic = '';
    for (i = 0; i < n; i += 1) {
      if ((i * 7) % 3 === 2) continue;
      var ix = x + i * 34 + 16, len = 18 + ((i * 13) % 5) * 9;
      ic += S.shape(S.poly([[ix - 6, y - 4], [ix + 6, y - 4], [ix + 1, y + len]], 8, 0.4), '#e6f2f4', { w: 1.6, extra: 1.2 });
    }
    s += ic;
    var rim = [];
    for (i = 0; i < n; i++) rim.push([[x + i * 34 + 4, y - h + 6], [x + i * 34 + 28, y - h + 6]]);
    s += S.lines(rim, { w: 6, ta: 0.2, tb: 0.2, min: 0.5 }, '#f4fbfc');
    return s;
  }
  function armchair(S, x, y) {
    var s = S.floorShadow(x, y + 6, 200, 20, 0.25);
    var back = U.catmull([[x - 150, y - 160], [x - 140, y - 330], [x, y - 360], [x + 140, y - 330], [x + 150, y - 160]], 5, false).concat([[x + 150, y - 150], [x - 150, y - 150]]);
    s += S.shape(back, '#7a8a6a', { w: 3.2, extra: 3.6 }) + A.shadeSide(S, back, [1, 0.3], 0.3, { ang: 70, gap: 7 });
    var seat = S.rect(x - 160, y - 170, 320, 90, 30, 1);
    s += S.shape(seat, '#86966f', { w: 3, extra: 3.4 }) + A.shadeSide(S, seat, [0, 1], 0.3, { ang: 10, gap: 6 });
    [[x - 190, -1], [x + 140, 1]].forEach(function (a) {
      var arm = U.catmull([[a[0], y - 210], [a[0] + 25, y - 236], [a[0] + 50, y - 210], [a[0] + 50, y - 60], [a[0], y - 60]], 4, true);
      s += S.shape(arm, '#7a8a6a', { w: 3, extra: 3.4 }) + A.shadeSide(S, arm, [1, 0.2], 0.2, { ang: 75, gap: 6 });
    });
    s += S.box(x - 170, y - 70, 340, 60, '#6c7b5d', { w: 3, extra: 3.4, hatch: 'b', hk: 0.5 });
    [[x - 150, y - 10], [x + 130, y - 10]].forEach(function (l) { s += S.box(l[0], l[1], 20, 16, P.woodDD, { w: 1.8, extra: 1.6, step: 20, hatch: false }); });
    // knitted blanket draped over
    var bl = U.catmull([[x - 150, y - 300], [x - 70, y - 336], [x - 40, y - 290], [x - 80, y - 220], [x - 130, y - 120], [x - 170, y - 50], [x - 200, y - 70], [x - 196, y - 190]], 5, true);
    s += S.shape(bl, '#c4553f', { w: 2.6, extra: 3 }) + S.hatch(bl, { ang: 0, gap: 22, w: 5, op: 0.35, color: '#f0dfc0' }) + S.hatch(bl, { ang: 90, gap: 22, w: 5, op: 0.35, color: '#f0dfc0' });
    s += S.lines([[[x - 196, y - 64], [x - 198, y - 40]], [[x - 184, y - 58], [x - 184, y - 34]], [[x - 172, y - 54], [x - 170, y - 32]]], { w: 2.4, ta: 0.1, tb: 0.4 }, '#c4553f');
    return s;
  }

  function build(S) {
    var bg = '';
    var WALL = '#cdd2c4';
    bg += S.wall(0, WALL_Y, WALL, { top: 50, op: 0.34 });
    bg += S.stripes(0, WALL_Y, 70, '#5f7a80', 0.14);
    bg += S.skirting(WALL_Y, 26, '#e4e2d4');
    bg += S.floor(WALL_Y, { kind: 'boards', gap: 100, fill: '#a99474', vx: 960, vy: 400, lop: 0.5, hop: 0.22 });
    var rug = S.poly([[420, 880], [1180, 880], [1260, 1040], [340, 1040]], 40, 1.2);
    bg += S.shape(rug, '#7d8c96', { w: 2.4, extra: 2.4 }) + S.hatch(rug, { ang: 0, gap: 12, w: 1.1, op: 0.25 });
    // cold blue cast over everything
    bg += A.shaft([[-20, -20], [1940, -20], [1940, 1100], [-20, 1100]], '#8fb0c4', 0.12);

    // ── frosty window with snow ──
    var sky = S.linear([[0, '#9fb3c2'], [1, '#dfe7e8']], 0, 0, 0, 1);
    var v = '';
    v += S.fillOnly(S.poly([[WIN.x, WIN.y + 380], [WIN.x + 200, WIN.y + 340], [WIN.x + 420, WIN.y + 372], [WIN.x + 600, WIN.y + 330], [WIN.x + 600, WIN.y + 600], [WIN.x, WIN.y + 600]], 30, 3), '#f4f7f6');
    // snowy roofs + bare tree
    v += S.shape(S.poly([[WIN.x + 40, WIN.y + 360], [WIN.x + 130, WIN.y + 260], [WIN.x + 220, WIN.y + 360]], 20, 1), '#7d6a5a', { w: 2, extra: 2 });
    v += S.shape(U.catmull([[WIN.x + 40, WIN.y + 362], [WIN.x + 130, WIN.y + 254], [WIN.x + 222, WIN.y + 362], [WIN.x + 130, WIN.y + 280]], 4, true), '#f4f7f6', { w: 1.6, extra: 1.2 });
    var tr = [[[WIN.x + 420, WIN.y + 380], [WIN.x + 424, WIN.y + 200]], [[WIN.x + 424, WIN.y + 260], [WIN.x + 380, WIN.y + 200]], [[WIN.x + 424, WIN.y + 240], [WIN.x + 480, WIN.y + 170]], [[WIN.x + 400, WIN.y + 220], [WIN.x + 380, WIN.y + 170]], [[WIN.x + 460, WIN.y + 190], [WIN.x + 470, WIN.y + 150]]];
    v += S.lines(tr, { w: 5, ta: 0.05, tb: 0.7, min: 0.2 }, '#3b3128');
    v += '<!--amb:snow-->';
    v += frost(S, WIN.x + 16, WIN.y + 16, WIN.w - 32, WIN.h - 32);
    bg += S.window(WIN.x, WIN.y, WIN.w, WIN.h, { sky: sky, view: v, panes: [2, 2], frame: '#efeee6' });
    // snow on the sill outside edge + frost hatch on glass corners
    bg += S.shape(U.catmull([[WIN.x - 24, WIN.y + WIN.h + 6], [WIN.x + 100, WIN.y + WIN.h - 4], [WIN.x + 300, WIN.y + WIN.h], [WIN.x + 584, WIN.y + WIN.h + 4]], 5, false).concat([[WIN.x + 584, WIN.y + WIN.h + 10], [WIN.x - 24, WIN.y + WIN.h + 12]]), '#f6fafa', { w: 1.6, extra: 1.2 });
    // curtains (thin, pale)
    bg += S.line([[WIN.x - 90, WIN.y - 34], [WIN.x + WIN.w + 90, WIN.y - 34]], { w: 8, ta: 0.02, tb: 0.02, min: 0.9 }, P.woodDD);
    [[WIN.x - 100, WIN.x - 10], [WIN.x + WIN.w + 10, WIN.x + WIN.w + 100]].forEach(function (c) {
      var pts = S.poly([[c[0], WIN.y - 34], [c[1], WIN.y - 34], [c[1] + 6, WIN.y + WIN.h + 60], [c[0] - 6, WIN.y + WIN.h + 60]], 40, 2);
      bg += S.shape(pts, '#b9c7c4', { w: 2.4, extra: 2.6 }) + S.hatch(pts, { ang: 90, gap: 14, w: 1.6, op: 0.4 });
    });

    // ── broken radiator under the window ──
    bg += radiator(S, WIN.x + 90, WALL_Y - 6, WIN.w - 180, 150);
    bg += S.note(WIN.x + WIN.w + 190, 560, 190, 76, 5, '#f6efd9', [], { pin: false, tape: true });
    bg += S.T(WIN.x + WIN.w + 190, 574, 'KAPUTT!', { f: 'Kalam', s: 38, c: P.red, r: 5, a: 'middle' });
    bg += S.line(U.catmull([[WIN.x + WIN.w + 120, 610], [WIN.x + WIN.w + 70, 650], [WIN.x + WIN.w - 40, 662]], 5, false), { w: 4, ta: 0.05, tb: 0.3, min: 0.4 }, P.red);
    bg += S.lines([[[WIN.x + WIN.w - 40, 662], [WIN.x + WIN.w - 18, 648]], [[WIN.x + WIN.w - 40, 662], [WIN.x + WIN.w - 20, 676]]], { w: 4, ta: 0.05, tb: 0.3, min: 0.4 }, P.red);

    // ── thermometer + scarf on a hook (left wall) ──
    var tx = 300, ty = 200;
    bg += S.drop(tx - 34, ty, 68, 280, 8, 10);
    bg += S.box(tx - 34, ty, 68, 280, '#efeee6', { w: 2.6, extra: 3, hatch: 'r', hk: 0.25 });
    bg += S.line([[tx, ty + 30], [tx, ty + 236]], { w: 16, ta: 0.04, tb: 0.04, min: 0.95, jit: 0.05 }) + S.line([[tx, ty + 32], [tx, ty + 236]], { w: 10, ta: 0.04, tb: 0.04, min: 0.95, jit: 0.05 }, '#f7f7f0');
    bg += S.line([[tx, ty + 186], [tx, ty + 244]], { w: 6, ta: 0.02, tb: 0.02, min: 0.95 }, P.blue) + S.circ(tx, ty + 250, 17, P.blue, { w: 2.4, extra: 2 });
    var tk = []; for (var i = 0; i < 8; i++) tk.push([[tx - 12, ty + 44 + i * 24], [tx - (i % 2 ? 20 : 26), ty + 44 + i * 24]]);
    bg += S.lines(tk, { w: 1.8, ta: 0.05, tb: 0.05, min: 0.6 });
    bg += S.T(tx + 96, ty + 210, '12°', { f: 'Fraunces', s: 70, c: P.blue, r: -5, a: 'middle' });
    // coat hook with scarf + woolly hat
    bg += S.box(110, 300, 150, 22, P.woodD, { w: 2.4, extra: 2.6, hatch: 'b', hk: 0.5 });
    bg += S.line([[150, 312], [150, 336], [168, 340]], { w: 4, ta: 0.05, tb: 0.05 }) + S.line([[220, 312], [220, 336], [238, 340]], { w: 4, ta: 0.05, tb: 0.05 });
    var scarf = U.catmull([[140, 334], [168, 330], [176, 420], [170, 560], [148, 566], [146, 440]], 5, true);
    bg += S.shape(scarf, P.mustard, { w: 2.6, extra: 3 });
    var stp = []; for (i = 0; i < 6; i++) stp.push([[146, 380 + i * 30], [174, 384 + i * 30]]);
    bg += S.lines(stp, { w: 7, ta: 0.05, tb: 0.05, min: 0.8 }, P.red);
    bg += S.lines([[[150, 566], [148, 590]], [[160, 566], [160, 592]], [[170, 564], [172, 588]]], { w: 2.4, ta: 0.05, tb: 0.4 }, P.mustard);
    var hat = U.catmull([[200, 380], [206, 342], [230, 330], [254, 342], [260, 380]], 4, false).concat([[260, 386], [200, 386]]);
    bg += S.shape(hat, P.teal, { w: 2.4, extra: 2.6 }) + S.circ(230, 326, 12, '#f1e8d0', { w: 1.8, extra: 1.4 });
    bg += S.box(198, 376, 64, 16, '#4a7a78', { w: 1.8, extra: 1.6, step: 20, hatch: false });

    // ── sideboard with a hot-water bottle, candle and a pile of woolly socks (left) ──
    bg += S.floorShadow(250, WALL_Y + 8, 190, 14, 0.25);
    bg += S.box(90, WALL_Y - 200, 320, 200, P.woodD, { w: 3, extra: 3.4, hatch: 'r', hk: 0.15 });
    bg += S.box(80, WALL_Y - 214, 340, 22, P.woodM, { w: 2.6, extra: 3, hatch: 'b', hk: 0.4 });
    bg += S.box(110, WALL_Y - 180, 130, 160, '#9a6a44', { w: 2, extra: 2, hatch: false }) + S.box(260, WALL_Y - 180, 130, 160, '#9a6a44', { w: 2, extra: 2, hatch: false });
    bg += S.circ(225, WALL_Y - 100, 6, '#c9b06a', { w: 1.4, extra: 1 }) + S.circ(275, WALL_Y - 100, 6, '#c9b06a', { w: 1.4, extra: 1 });
    var hwb = U.catmull([[340, WALL_Y - 214], [328, WALL_Y - 260], [340, WALL_Y - 300], [380, WALL_Y - 306], [414, WALL_Y - 290], [420, WALL_Y - 250], [410, WALL_Y - 214]], 5, false);
    bg += S.shape(hwb, '#c4553f', { w: 2.6, extra: 3 }) + S.hatch(hwb, { ang: 0, gap: 8, w: 1.2, op: 0.35 }) + S.box(366, WALL_Y - 330, 30, 26, '#c4553f', { w: 2, extra: 2, hatch: false }) + S.box(362, WALL_Y - 340, 38, 12, P.ink, { w: 1, extra: 0.6, step: 20, hatch: false });
    bg += S.box(220, WALL_Y - 290, 34, 76, '#f1e8d0', { w: 2, extra: 2, hatch: 'r', hk: 0.3 }) + S.shape(U.catmull([[237, WALL_Y - 290], [230, WALL_Y - 306], [237, WALL_Y - 326], [244, WALL_Y - 306]], 3, true), '#f0b84a', { w: 1.4, extra: 1 }) + S.glow(237, WALL_Y - 306, 70, 70, '#ffd98a', 0.4);
    // frost creeping in from the wall corners + pendant lamp
    bg += S.hatch([[-20, -20], [1940, -20], [1940, WALL_Y], [-20, WALL_Y]], { ang: -35, gap: 6, w: 1.4, op: 0.5, color: '#ffffff', cond: function (X, Y) { var e = Math.min(X, 1920 - X); return e + Y * 0.35 < 70 + 30 * Math.sin(Y / 40) || (Y < 40 && e < 260 + 40 * Math.sin(X / 30)); } });
    bg += S.line([[1330, -10], [1330, 50]], { w: 2.4 }) + S.shape(S.poly([[1290, 50], [1370, 50], [1400, 92], [1260, 92]], 14, 0.6), '#efeee6', { w: 2.4, extra: 2.6 }) + S.circ(1330, 96, 12, '#fff3cf', { w: 1.4, extra: 1 });
    // ── armchair + side table with tea (right) ──
    bg += armchair(S, 1560, 900);
    bg += S.floorShadow(1300, 902, 70, 10, 0.22);
    bg += S.box(1270, 740, 60, 160, P.woodD, { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.35 });
    bg += S.box(1220, 724, 160, 22, P.woodM, { w: 2.6, extra: 3, hatch: 'b', hk: 0.4 });
    bg += S.mug(1300, 724, 54, 62, P.blue, { label: '' });
    bg += '<!--amb:steam-->';
    // picture above the armchair
    bg += S.frame(1460, 170, 220, 170, '#d6e2e6', function (x, y, w, h) {
      return S.fillOnly(S.rect(x, y, w, h), '#c9d8de') + S.shape(S.poly([[x - 6, y + h], [x + 70, y + 50], [x + 120, y + 100], [x + 170, y + 40], [x + w + 6, y + h]], 14, 1), '#eef3f3', { w: 1.6, extra: 1.4 });
    }, { frame: P.woodDD });

    // ── ambient ──
    var flakes = [];
    var r = U.rng(77);
    for (i = 0; i < 70; i++) flakes.push([r(), r(), 2 + r() * 3.5, 0.5 + r() * 0.8, r() * 6]);
    var amb = {
      snow: function (t) {
        var d = '';
        flakes.forEach(function (fl) {
          var y = WIN.y + ((fl[1] * 520 + t * 40 * fl[3]) % 520) - 20, x = WIN.x + fl[0] * WIN.w + Math.sin(t * 1.1 + fl[4]) * 10;
          d += 'M' + f1(x) + ' ' + f1(y) + 'h0';
        });
        return '<path d="' + d + '" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity=".9"/>';
      },
      steam: function (t) { var Sa = A.ambInk('winter-room', 1 + Math.floor(t * 10)); return Sa.steam(1296, 650, 70, t, 0.4); }
    };
    return { bg: bg, amb: amb };
  }

  A.define('winter-room', {
    seed: 41, ambient: true, build: build,
    slots: {
      left:      A.slot(480, 950, 1.0, { face: 1 }),
      center:    A.slot(960, 950, 1.0),
      right:     A.slot(1240, 950, 1.0, { face: -1 }),
      radiator:  A.slot(560, 945, 1.0, { face: 1 }),     // beside the radiator, turned to it
      armchair:  A.slot(1560, 900, 0.95, { face: -1, seated: true, seatY: 740 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
