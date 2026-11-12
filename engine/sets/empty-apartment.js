/* empty-apartment — viewing an empty Altbau flat at late morning: very high ceiling with stucco cornice + rosette and
 * a bare bulb, off-white walls in cool light, two tall double windows with long light shafts across golden
 * herringbone parquet, old ribbed radiator, open double door (right) to the stairwell with the cardboard sign
 * „Besichtigung 11 Uhr", and a queue of other applicants (ink silhouettes) waiting along the right wall.
 * Slot `queue` = the end of that line. Static. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WALL_Y = 800, CORN = 92, D = { x: 1360, y: 240, w: 330, h: 560 };

  function herringbone(S) {
    // parquet: perspective rows of short slanted planks, alternating direction (cheap: lines only)
    var s = '', L = [], vx = 900, vy = 380;
    var fl = [[-20, WALL_Y], [1940, WALL_Y], [1940, 1100], [-20, 1100]];
    s += S.fillOnly(fl, '#c79a60');
    function xb(xt, y) { return vx + (xt - vx) * (y - vy) / (WALL_Y - vy); }
    var rows = [];
    for (var i = 0; i < 12; i++) { var z = i / 11, y = WALL_Y + (1100 - WALL_Y) * Math.pow(z, 1.35); rows.push(y); }
    for (i = 0; i < rows.length - 1; i++) {
      var ya = rows[i], yb = rows[i + 1], step = 70;
      for (var xt = vx - 4000; xt < vx + 4000; xt += step) {
        var a0 = xb(xt, ya), b0 = xb(xt + step * (i % 2 ? 1 : -1) * 0.6, yb);
        if (Math.max(a0, b0) < -40 || Math.min(a0, b0) > 1960) continue;
        L.push([[a0, ya], [b0, yb]]);
      }
      L.push([[-20, yb], [1940, yb]]);
    }
    s += S.lines(L, { w: 1.4, ta: 0.08, tb: 0.08, min: 0.4 }, '#5e3f22', ' opacity=".45"');
    s += S.hatch(fl, { ang: 0, gap: 10, w: 1.1, op: 0.18, cond: function (X, Y) { return Y < WALL_Y + 70 || S.r() < 0.25; } });
    s += S.fillOnly(S.rect(-20, WALL_Y, 1960, 34), 'rgba(60,40,20,.14)');
    return s;
  }

  function person(S, x, y, h, col, o) {
    o = o || {};
    var s = '', hr = h * 0.11, bw = h * 0.2;
    var body = U.catmull([[x - bw * 0.55, y - h * 0.76], [x - bw * 0.8, y - h * 0.5], [x - bw * 0.7, y - h * 0.02], [x + bw * 0.7, y - h * 0.02], [x + bw * 0.8, y - h * 0.5], [x + bw * 0.55, y - h * 0.76]], 5, true);
    s += S.floorShadow(x, y, bw, 8, 0.2);
    s += S.shape(body, col, { w: 2.4, extra: 2.6 }) + A.shadeSide(S, body, [1, 0], 0.2, { ang: 70, gap: 7, op: 0.4 });
    s += S.circ(x + (o.dx || 0), y - h * 0.76 - hr * 0.9, hr, o.head || '#c9b9a0', { w: 2.2, extra: 2.2 });
    if (o.hair) s += S.shape(S.ellipse(x + (o.dx || 0), y - h * 0.76 - hr * 1.3, hr * 1.02, hr * 0.62, 20, 0, Math.PI, Math.PI * 2), o.hair, { w: 1.6, extra: 1.4 });
    if (o.folder) s += S.box(x - bw * 0.9, y - h * 0.5, bw * 0.7, h * 0.22, o.folder, { w: 1.8, extra: 1.6, hatch: false });
    if (o.phone) s += S.box(x + bw * 0.1, y - h * 0.62, h * 0.05, h * 0.09, '#2a2d30', { w: 1.2, extra: 0.8, hatch: false });
    return s;
  }

  function tallWindow(S, x, y, w, h) {
    var view = S.fillOnly(S.rect(x, y, w, h), S.linear([[0, '#b9d0de'], [1, '#e8eee6']], 0, 0, 0, 1));
    // facade opposite (across the street)
    var f = S.rect(x - 20, y + 120, w + 40, h, 40, 1);
    view += S.shape(f, '#e2d7c0', { w: 2, extra: 2 }) + S.hatch(f, { ang: 70, gap: 9, w: 1.1, op: 0.2 });
    for (var r = 0; r < 4; r++) for (var c = 0; c < 2; c++) view += S.box(x + 30 + c * (w / 2), y + 160 + r * 120, w / 2 - 60, 80, '#8fa2ad', { w: 1.6, extra: 1.2, hatch: false });
    view += S.circ(x + w * 0.7, y + 60, 60, '#8db15e', { w: 2, extra: 2, jit: 0.25 });
    var s = S.window(x, y, w, h, { sky: '#d4e2e8', view: view, panes: [2, 3], frame: '#f4f1e8', sillCol: '#ece7da' });
    // transom bar
    s += S.box(x + 10, y + h * 0.28 - 7, w - 20, 14, '#f4f1e8', { w: 2, extra: 2, hatch: false });
    // espagnolette handle
    s += S.line([[x + w / 2, y + h * 0.5], [x + w / 2 + 6, y + h * 0.58]], { w: 6, ta: 0.05, tb: 0.05 }, '#c9b06a');
    return s;
  }

  function build(S) {
    var bg = '', i;
    // ── walls + ceiling with cornice ──
    bg += S.wall(0, WALL_Y, '#ebe7dc', { top: 160, op: 0.22, side: 0.05 });
    bg += S.fillOnly(S.rect(-20, -20, 1960, CORN + 20), '#f1eee6');
    // cornice: stepped mouldings + egg-and-dart row
    bg += S.line([[-20, CORN], [1940, CORN]], { w: 5, ta: 0.01, tb: 0.01, min: 0.8 }) + S.line([[-20, CORN + 22], [1940, CORN + 22]], { w: 3, ta: 0.01, tb: 0.01, min: 0.8 }) + S.line([[-20, CORN + 34], [1940, CORN + 34]], { w: 2, ta: 0.01, tb: 0.01, min: 0.8 });
    bg += S.fillOnly(S.rect(-20, CORN, 1960, 22), '#e2ddd0');
    var eggs = [];
    for (var ex = 0; ex < 1940; ex += 36) eggs.push(S.ellipse(ex, CORN + 11, 10, 7, 12));
    eggs.forEach(function (e) { bg += S.shape(e, null, { w: 1.2, extra: 0.6 }); });
    bg += S.hatch(S.rect(-20, CORN + 34, 1960, 50), { ang: 90, gap: 6, w: 1, op: 0.18 });
    // rosette + bare bulb
    bg += S.circ(820, 18, 60, '#ece8de', { w: 2, extra: 1.6, ry: 18 });
    for (i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2; bg += S.shape(S.ellipse(820 + Math.cos(a) * 38, 18 + Math.sin(a) * 11, 10, 4, 10), null, { w: 1, extra: 0.6 }); }
    bg += S.seg(820, 30, 820, 180, 2.4) + S.box(812, 178, 16, 22, '#2f2a26', { w: 1.2, extra: 0.8, hatch: false }) + S.circ(820, 214, 18, '#fff6dc', { w: 2, extra: 1.4 });
    // picture rail
    bg += S.line([[-20, 200], [1940, 200]], { w: 3, ta: 0.01, tb: 0.01, min: 0.8 }, '#b9b2a0');
    // ghost marks of removed pictures (paler rectangles) + a nail
    bg += S.box(1000, 330, 200, 150, 'rgba(255,255,255,.35)', { w: 0.8, extra: 0.4, hatch: false, color: '#c9c2ae' }) + S.dot(1100, 316, 3, P.ink);
    // ── windows ──
    bg += tallWindow(S, 120, 200, 300, 520) + tallWindow(S, 600, 200, 300, 520);
    // light shafts across the parquet
    bg += A.shaft([[140, 720], [400, 720], [900, 1080], [420, 1080]], '#fff3d6', 0.22) + A.shaft([[620, 720], [880, 720], [1400, 1080], [900, 1080]], '#fff3d6', 0.22);
    bg += A.shaft([[150, 220], [400, 220], [560, 720], [300, 720]], '#ffffff', 0.05);
    // ── floor ──
    bg += herringbone(S);
    bg += S.skirting(WALL_Y, 30, '#f4f1e8');
    // window shapes of light on the floor
    [[140, 400], [620, 880]].forEach(function (w) {
      var q = [[w[0] + 120, 850], [w[1] + 160, 850], [w[1] + 300, 960], [w[0] + 200, 960]];
      bg += A.shaft(q, '#fff3d6', 0.28) + S.line([[(q[0][0] + q[1][0]) / 2, 850], [(q[2][0] + q[3][0]) / 2, 960]], { w: 10, ta: 0.05, tb: 0.05 }, '#c79a60', ' opacity=".6"');
    });
    // radiator under the left window
    var rx = 150, ry = WALL_Y - 160, rw = 240;
    bg += S.box(rx, ry, rw, 140, '#f1eee6', { w: 2.6, extra: 2.8, hatch: 'b', hk: 0.2 });
    var ribs = [];
    for (var xr = rx + 18; xr < rx + rw - 8; xr += 20) ribs.push([[xr, ry + 10], [xr, ry + 130]]);
    bg += S.lines(ribs, { w: 2, ta: 0.05, tb: 0.05, min: 0.6 }, P.ink, ' opacity=".55"') + S.circ(rx + rw + 14, ry + 30, 9, '#d8d2c2', { w: 1.6, extra: 1 });
    bg += S.seg(rx + 30, ry + 140, rx + 30, WALL_Y, 4) + S.seg(rx + rw - 30, ry + 140, rx + rw - 30, WALL_Y, 4);
    // a stack of moving boxes + a folded ladder (left by the old tenant)
    bg += S.floorShadow(1060, 880, 150, 12, 0.25);
    bg += S.box(960, 760, 180, 120, '#c9a46a', { w: 2.6, extra: 2.8, hatch: 'r', hk: 0.25 }) + S.box(990, 670, 130, 90, '#d4b27a', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.25 });
    bg += S.seg(1050, 670, 1050, 760, 6, 'rgba(240,232,205,.8)') + S.T(1040, 828, 'KÜCHE', { f: 'Kalam', s: 26, a: 'middle', r: -3 });
    // socket + wires hanging from the wall (kitchen not built in)
    bg += S.box(1210, 640, 40, 40, '#f4f1e8', { w: 1.8, extra: 1.2, hatch: false }) + S.circ(1230, 660, 8, '#d8d2c2', { w: 1.2, extra: 0.6 });
    bg += S.line([[1270, 560], [1280, 620], [1270, 660], [1282, 700]], { w: 2.4, ta: 0.1, tb: 0.4, smooth: 4 }, P.red) + S.line([[1278, 560], [1292, 630], [1286, 690]], { w: 2.4, ta: 0.1, tb: 0.4, smooth: 4 }, P.navy);

    // ── open double door to the stairwell + queue ──
    bg += S.box(D.x - 34, D.y - 46, D.w + 68, D.h + 46, '#f4f1e8', { w: 3.2, extra: 3.6, hatch: 'r', hk: 0.06 });
    bg += S.box(D.x - 50, D.y - 76, D.w + 100, 34, '#f1eee6', { w: 2.4, extra: 2.6, hatch: 'b', hk: 0.4 });   // overdoor moulding
    var inside = S.rect(D.x, D.y, D.w, D.h, 40, 0.6), cid = S.clip(inside), hall = '';
    hall += S.fillOnly(S.rect(D.x, D.y, D.w, D.h), '#b9a27a') + S.fillOnly(S.rect(D.x, D.y + D.h - 120, D.w, 120), '#8d7a5c');
    hall += S.line([[D.x + 40, D.y + D.h - 120], [D.x + D.w, D.y + 120]], { w: 6, ta: 0.02, tb: 0.02 }, '#5e3f22');   // stair rail beyond
    hall += person(S, D.x + 110, D.y + D.h - 20, 360, '#7b8792', { hair: '#3a2a1a', folder: '#c43d33' }) + person(S, D.x + 230, D.y + D.h - 30, 330, '#8b7d6b', { hair: '#6b4a2f', phone: true });
    hall += '<rect x="' + D.x + '" y="' + D.y + '" width="' + D.w + '" height="' + D.h + '" fill="#2a2018" opacity=".22"/>';
    bg += '<g clip-path="url(#' + cid + ')">' + hall + '</g>';
    // door leaves swung open (narrow, perspective) left + right
    var ll = S.poly([[D.x, D.y], [D.x + 54, D.y + 30], [D.x + 54, D.y + D.h - 20], [D.x, D.y + D.h]], 30, 0.6);
    var rl = S.poly([[D.x + D.w, D.y], [D.x + D.w - 54, D.y + 30], [D.x + D.w - 54, D.y + D.h - 20], [D.x + D.w, D.y + D.h]], 30, 0.6);
    bg += S.shape(ll, '#ece8de', { w: 2.4, extra: 2.6 }) + S.shape(rl, '#e2ddd0', { w: 2.4, extra: 2.6 }) + A.shadeSide(S, rl, [-1, 0], 0.1, { ang: 80, gap: 6, op: 0.35 });
    // cardboard sign taped next to the door
    var sg = U.xf(S.rect(-110, -64, 220, 128, 30, 2), D.x - 140, 420, -4);
    bg += S.fillOnly(U.xf(S.rect(-106, -58, 220, 128, 30, 2), D.x - 136, 426, -4), P.shadow) + S.shape(sg, '#c9a46a', { w: 2.4, extra: 2.6 });
    bg += S.T(D.x - 140, 405, 'Besichtigung', { f: 'Kalam', s: 30, a: 'middle', r: -4 }) + S.T(D.x - 140, 452, '11 Uhr', { f: 'Kalam', s: 40, a: 'middle', r: -4, c: P.red });
    bg += S.fillOnly(U.xf(S.rect(-24, -9, 48, 18, 20, 0.6), D.x - 220, 360, -30), 'rgba(240,232,205,.8)') + S.fillOnly(U.xf(S.rect(-24, -9, 48, 18, 20, 0.6), D.x - 60, 352, 24), 'rgba(240,232,205,.8)');
    // queue inside the room along the right wall (behind the queue slot)
    bg += person(S, 1790, 860, 470, '#5f6f62', { hair: '#2f2a26', folder: '#efe6cf', dx: -4 }) + person(S, 1890, 880, 500, '#7d4a5a', { hair: '#8a5a36' });
    return { bg: bg };
  }

  A.define('empty-apartment', {
    seed: 206, build: build,
    slots: {
      left:   A.slot(300, 975, 1.0, { face: 1 }),
      center: A.slot(960, 990, 1.02),
      right:  A.slot(1300, 985, 1.0, { face: -1 }),
      window: A.slot(560, 965, 1.0, { face: -1 }),                // between the windows, in the light
      door:   A.slot(1525, 805, 0.82, { face: -1 }),              // in the open doorway (stepping in)
      queue:  A.slot(1690, 985, 1.0, { face: -1 })                // end of the applicants' line (silhouettes behind)
    }
  });
})(typeof self !== 'undefined' ? self : this);
