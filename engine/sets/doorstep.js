/* doorstep — apartment-house landing: flat door with name plate + doormat, doorbell panel with names, stairwell
 * banister, timer light switch, terrazzo floor, stacked empty pizza boxes. variant:'open' = door open with a warm
 * hallway behind (slot `door` stands in the doorway). Static. (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var WALL_Y = 800, D = { x: 560, y: 260, w: 330, h: 540 };

  function pizzaBox(S, x, y, w, rot, logo) {
    var h = 26, pts = U.xf(S.poly([[-w / 2, -h], [w / 2, -h], [w / 2, 0], [-w / 2, 0]], 30, 0.8), x, y, rot);
    var top = U.xf(S.poly([[-w / 2, -h], [w / 2, -h], [w / 2 - 30, -h - 28], [-w / 2 + 30, -h - 28]], 30, 0.8), x, y, rot);
    var s = S.shape(top, '#e2c48e', { w: 2, extra: 2 }) + S.shape(pts, '#d8b67a', { w: 2.2, extra: 2.4 }) + S.hatch(pts, { ang: 80, gap: 7, w: 1.1, op: 0.35 });
    if (logo) s += S.T(x, y - h - 6, 'PIZZA', { f: 'Anton', s: 18, c: P.red, a: 'middle', r: rot });
    return s;
  }

  function build(S, opts) {
    var open = opts.variant === 'open', bg = '';
    bg += S.wall(0, WALL_Y, '#e6dcc0', { top: 36, op: 0.3 });
    // lower wall: oil-paint dado (classic German stairwell) with a dark line
    bg += S.fillOnly(S.rect(-20, 500, 1960, WALL_Y - 500), '#a9b89a') + S.line([[-20, 500], [1940, 501]], { w: 5, ta: 0.02, tb: 0.02, min: 0.6 }, '#5a6a4a');
    bg += S.hatch(S.rect(-20, 504, 1960, WALL_Y - 504), { ang: 80, gap: 14, w: 1.2, op: 0.18 });
    // terrazzo floor
    var fl = [[-20, WALL_Y], [1940, WALL_Y], [1940, 1100], [-20, 1100]];
    bg += S.fillOnly(fl, '#cbbfa6');
    bg += S.stipple(fl, 2200, { r: 4, op: 0.35, color: '#7a6a52' }) + S.stipple(fl, 1200, { r: 3.4, op: 0.5, color: '#efe6d0' });
    bg += S.line([[-20, WALL_Y], [1940, WALL_Y]], { w: 5, ta: 0.02, tb: 0.02, min: 0.6 }) + S.fillOnly(S.rect(-20, WALL_Y, 1960, 30), 'rgba(60,40,20,.15)');
    bg += S.skirting(WALL_Y, 16, '#6b5a46');

    // ── door ──
    bg += S.box(D.x - 30, D.y - 30, D.w + 60, D.h + 30, '#d8cfb6', { w: 3.2, extra: 3.6, hatch: 'r', hk: 0.08 });
    if (open) {
      // warm hallway inside: coat hooks, runner, lamp light
      var inside = S.rect(D.x, D.y, D.w, D.h, 40, 0.8), cid = S.clip(inside), hall = '';
      hall += S.fillOnly(S.rect(D.x, D.y, D.w, D.h), '#f0d79a') + S.glow(D.x + D.w / 2, D.y + 120, 220, 200, '#fff3cf', 0.7);
      hall += S.fillOnly(S.poly([[D.x, D.y + D.h], [D.x + 60, D.y + 420], [D.x + D.w - 60, D.y + 420], [D.x + D.w, D.y + D.h]], 20, 0.5), '#b98a52');
      hall += S.fillOnly(S.poly([[D.x + 90, D.y + D.h], [D.x + 120, D.y + 430], [D.x + D.w - 120, D.y + 430], [D.x + D.w - 90, D.y + D.h]], 20, 0.5), P.red);
      hall += S.box(D.x + 120, D.y + 140, 90, 120, P.woodD, { w: 1.6, extra: 1.4, hatch: false }) + S.box(D.x + 130, D.y + 150, 70, 100, '#e6c88a', { w: 1, extra: 0.6, hatch: false });
      hall += S.lines([[[D.x + 40, D.y + 200], [D.x + 40, D.y + 380]], [[D.x + D.w - 40, D.y + 210], [D.x + D.w - 40, D.y + 370]]], { w: 3, ta: 0.05, tb: 0.05 }, P.woodD, ' opacity=".7"');
      bg += '<g clip-path="url(#' + cid + ')">' + hall + '</g>';
      // door leaf swung inward (narrow, dark, perspective)
      var leaf = S.poly([[D.x + D.w, D.y], [D.x + D.w - 70, D.y + 40], [D.x + D.w - 70, D.y + D.h - 30], [D.x + D.w, D.y + D.h]], 30, 0.8);
      bg += S.shape(leaf, '#7d5a3a', { w: 2.8, extra: 3 }) + S.hatch(leaf, { ang: 80, gap: 7, w: 1.2, op: 0.4 });
      bg += A.shaft([[D.x, D.y + D.h], [D.x + D.w, D.y + D.h], [D.x + D.w + 160, 1080], [D.x - 140, 1080]], '#ffe7a6', 0.25);
    } else {
      var lf = S.rect(D.x, D.y, D.w, D.h, 40, 0.8);
      bg += S.shape(lf, '#8a5a36', { w: 3.4, extra: 4 });
      bg += S.hatch(lf, { ang: 88, gap: 9, w: 1.3, op: 0.3 });
      bg += S.box(D.x + 36, D.y + 40, D.w - 72, 200, '#94643e', { w: 2.2, extra: 2.2, hatch: 'l', hk: 0.12 }) + S.box(D.x + 36, D.y + 280, D.w - 72, 220, '#94643e', { w: 2.2, extra: 2.2, hatch: 'l', hk: 0.12 });
      bg += S.circ(D.x + D.w / 2, D.y + 130, 8, '#2f2a26', { w: 1.4, extra: 1 });   // peephole
      bg += S.box(D.x + D.w - 60, D.y + 270, 16, 60, '#c9b06a', { w: 1.6, extra: 1.4, hatch: false }) + S.line([[D.x + D.w - 52, D.y + 282], [D.x + D.w - 96, D.y + 284]], { w: 9, ta: 0.05, tb: 0.1, min: 0.8 }) + S.line([[D.x + D.w - 52, D.y + 282], [D.x + D.w - 94, D.y + 284]], { w: 5, ta: 0.05, tb: 0.1, min: 0.8 }, '#d8bf72');
      bg += S.box(D.x + D.w / 2 - 60, D.y + 180, 120, 30, '#e8dcb8', { w: 1.6, extra: 1.4, hatch: false }) + S.T(D.x + D.w / 2, D.y + 202, 'Melo', { f: 'Kalam', s: 22, a: 'middle' });
    }
    // doormat
    bg += S.shape(S.poly([[D.x - 10, WALL_Y + 14], [D.x + D.w + 10, WALL_Y + 14], [D.x + D.w + 34, WALL_Y + 62], [D.x - 34, WALL_Y + 62]], 30, 1), '#7a5a34', { w: 2.4, extra: 2.6 });
    bg += S.hatch(S.poly([[D.x - 10, WALL_Y + 14], [D.x + D.w + 10, WALL_Y + 14], [D.x + D.w + 34, WALL_Y + 62], [D.x - 34, WALL_Y + 62]], 30, 1), { ang: 90, gap: 5, w: 1, op: 0.35 });

    // ── doorbell panel ──
    var bx = 960, by = 420;
    bg += S.drop(bx, by, 150, 240, 6, 8) + S.box(bx, by, 150, 240, '#c9c4b2', { w: 2.6, extra: 2.8, hatch: 'r', hk: 0.15 });
    ['Müller', 'Schmidt', 'Yilmaz', 'Nowak', 'Melo'].forEach(function (n, k) {
      var yy = by + 26 + k * 42;
      bg += S.box(bx + 16, yy, 82, 28, '#f3ead3', { w: 1.2, extra: 0.8, step: 20, hatch: false }) + S.T(bx + 57, yy + 21, n, { f: 'Kalam', s: 17, a: 'middle', c: n === 'Melo' ? P.red : P.ink });
      bg += S.circ(bx + 120, yy + 14, 11, '#d8bf72', { w: 1.6, extra: 1.2 }) + S.circ(bx + 120, yy + 14, 4, '#a98a40', { w: 0 });
    });
    // timer light switch (orange glow)
    bg += S.box(1160, 560, 50, 70, '#efeadb', { w: 2, extra: 2, hatch: false }) + S.box(1170, 574, 30, 42, '#f0a04a', { w: 1.6, extra: 1.2, hatch: false }) + S.glow(1185, 595, 40, 40, '#ffb86a', 0.5);
    // stack of empty pizza boxes by the wall
    bg += S.floorShadow(1180, 862, 120, 10, 0.25);
    for (var i = 0; i < 4; i++) bg += pizzaBox(S, 1180 + (i % 2) * 8 - 4, 860 - i * 28, 220, (i % 2 ? 2 : -2), i === 3);

    // ── stairwell: banister going down (right) + window ──
    bg += S.window(1460, 120, 240, 320, { sky: '#c9dbe0', panes: [2, 2], frame: '#f1ead8' });
    var rail = [[1300, 720], [1940, 520]];
    var balusters = [];
    for (var x = 1320; x < 1960; x += 34) { var yt = 720 - (x - 1300) * 200 / 640; balusters.push([[x, yt + 6], [x, Math.min(1080, yt + 300)]]); }
    // steps going down behind the balusters (dark)
    var steps = '';
    for (i = 0; i < 6; i++) steps += S.box(1320 + i * 110, 800 + i * 40, 700, 40, i % 2 ? '#a99a80' : '#b5a68a', { w: 1.8, extra: 2, hatch: false });
    bg += '<g opacity=".9">' + steps + '</g>';
    // balusters + rail in front of the steps
    bg += S.lines(balusters, { w: 7, ta: 0.02, tb: 0.02, min: 0.9 }) + S.lines(balusters, { w: 3, ta: 0.02, tb: 0.02, min: 0.9 }, '#6b4a2f');
    bg += S.line(rail, { w: 22, ta: 0.02, tb: 0.02, min: 0.9 }) + S.line(rail.map(function (p) { return [p[0], p[1] - 2]; }), { w: 14, ta: 0.02, tb: 0.02, min: 0.9 }, '#8d6236');
    bg += S.box(1286, 700, 30, 330, '#6b4a2f', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.4 }) + S.circ(1301, 694, 20, '#8d6236', { w: 2, extra: 2 });
    // ceiling lamp
    bg += S.line([[300, -10], [300, 120]], { w: 2.4 }) + S.circ(300, 150, 36, '#f6efd9', { w: 2.4, extra: 2.4 }) + S.glow(300, 150, 160, 120, '#fff3cf', 0.35);
    // shoe rack + shoes left of the door
    bg += S.box(250, 760, 220, 40, P.woodM, { w: 2.2, extra: 2.4, hatch: 'b', hk: 0.4 });
    bg += S.shape(U.catmull([[270, 760], [272, 730], [300, 724], [340, 744], [344, 760]], 4, false), P.red, { w: 2, extra: 2 }) + S.shape(U.catmull([[360, 760], [362, 726], [392, 720], [440, 744], [444, 760]], 4, false), P.navy, { w: 2, extra: 2 });
    bg += S.plant(140, 800, 160, { n: 9, pot: '#b5562f' });
    return { bg: bg };
  }

  A.define('doorstep', {
    seed: 111, build: build, variants: ['open'],
    slots: {
      door:    A.slot(725, 805, 0.9, { face: 1 }),        // in the doorway (use with variant 'open')
      left:    A.slot(420, 960, 1.0, { face: 1 }),
      center:  A.slot(880, 960, 1.0, { face: -1 }),       // the visitor / delivery person in front of the door
      right:   A.slot(1100, 965, 1.0, { face: -1 }),
      bell:    A.slot(1010, 955, 1.0, { face: -1 }),      // at the doorbell panel
      stairs:  A.slot(1560, 960, 1.0, { face: -1 })       // coming up the stairs
    }
  });
})(typeof self !== 'undefined' ? self : this);
