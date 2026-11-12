/* cafe-window — cosy café at lunchtime: bottle-green wainscot + warm terracotta walls, big shop window on the left
 * with mirrored gold lettering and a sunny street outside, small window table (newspaper „Tagesblatt — Mieten
 * steigen", magazine „WOHNEN", cappuccino), brass pendant lamps, cake display (Apfelkuchen, Käsekuchen,
 * Schwarzwälder), espresso machine, chalk menu in German. fg = window table (slot `window-seat`) + the counter with
 * the cake display (slot `counter` = behind the counter). Static. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WALL_Y = 810, DADO = 560, WIN = { x: 40, y: 90, w: 600, h: 560 }, TB = { x0: 210, x1: 570, yb: 742, yf: 782 }, CT = { x0: 1330, top: 690 };

  function cake(S, x, y, w, h, sponge, topCol, o) {
    o = o || {};
    var b = S.poly([[x, y], [x + w, y], [x + w, y - h], [x, y - h]], 20, 0.6), s = '';
    s += S.shape(b, sponge, { w: 2, extra: 2 });
    if (o.layers) for (var i = 1; i < o.layers; i++) s += S.seg(x + 2, y - h * i / o.layers, x + w - 2, y - h * i / o.layers, 3, o.lcol || '#efe6cf');
    s += S.shape(S.poly([[x - 2, y - h], [x + w + 2, y - h], [x + w, y - h - 10], [x, y - h - 10]], 20, 0.6), topCol, { w: 1.8, extra: 1.6 });
    if (o.cherries) for (var k = 0; k < 3; k++) s += S.circ(x + w * (k + 0.5) / 3, y - h - 16, 6, P.redD, { w: 1.2, extra: 0.8 });
    return s;
  }

  function build(S) {
    var bg = '', fg = '', i;
    // walls: terracotta above a bottle-green panelled dado
    bg += S.wall(0, WALL_Y, '#c98a64', { top: 46, op: 0.3 });
    bg += S.glow(380, 420, 760, 460, '#ffe2b0', 0.3);
    bg += S.fillOnly(S.rect(-20, DADO, 1960, WALL_Y - DADO), '#3f5a46') + S.line([[-20, DADO], [1940, DADO + 1]], { w: 9, ta: 0.02, tb: 0.02, min: 0.8 }, '#8d6236');
    for (var px = 680; px < 1920; px += 180) bg += S.box(px, DADO + 34, 150, WALL_Y - DADO - 70, '#46644e', { w: 2, extra: 2, hatch: 'r', hk: 0.15 });
    // floor: dark wood boards
    bg += S.floor(WALL_Y, { kind: 'boards', fill: '#7a5638', gap: 110, vx: 900, lop: 0.5, hop: 0.25 });
    bg += S.skirting(WALL_Y, 14, '#2f4436');

    // ── shop window: street at noon + mirrored lettering ──
    var W = WIN, view = '';
    view += S.fillOnly(S.rect(W.x, W.y, W.w, W.h), S.linear([[0, '#cfe0e4'], [1, '#eef0e0']], 0, 0, 0, 1));
    var hs = [[W.x - 20, 120, '#e2cfa6'], [W.x + 170, 200, '#d9a98a'], [W.x + 390, 140, '#b9c4b0']];
    hs.forEach(function (h) {
      var r = S.rect(h[0], W.y + h[1], 200, W.h, 40, 1);
      view += S.shape(r, h[2], { w: 2, extra: 2 }) + S.hatch(r, { ang: 75, gap: 9, w: 1.1, op: 0.25 });
      for (var yy = W.y + h[1] + 30; yy < W.y + W.h - 140; yy += 70) for (var xx = h[0] + 26; xx < h[0] + 180; xx += 56) view += S.box(xx, yy, 30, 44, '#5f7a86', { w: 1.4, extra: 1, hatch: false });
    });
    view += S.fillOnly(S.rect(W.x, W.y + W.h - 120, W.w, 120), '#bdb4a0');   // pavement
    view += S.line([[W.x + 470, W.y + W.h], [W.x + 470, W.y + 300]], { w: 8, ta: 0.02, tb: 0.02 }, '#5e3f22') + S.circ(W.x + 470, W.y + 260, 80, '#8db15e', { w: 2, extra: 2, jit: 0.2 }) + S.hatch(S.ellipse(W.x + 470, W.y + 260, 80, 80, 30, 0.2), { ang: 50, gap: 8, w: 1.1, op: 0.3 });
    view += S.shape(U.catmull([[W.x + 60, W.y + W.h - 60], [W.x + 80, W.y + W.h - 130], [W.x + 130, W.y + W.h - 130], [W.x + 150, W.y + W.h - 60]], 4, true), '#4f6d86', { w: 2, extra: 2 });  // a bike basket-ish blob
    bg += S.window(W.x, W.y, W.w, W.h, { sky: '#e6eee8', view: view, panes: [2, 1], frame: '#2f4436', sillCol: '#8d6236' });
    // mirrored gold lettering on the glass (seen from inside)
    bg += '<g transform="translate(' + (W.x * 2 + W.w) + ' 0) scale(-1 1)">' + S.T(W.x + W.w / 2, W.y + 110, 'Café Kranich', { f: 'Fraunces', s: 64, c: '#d6a03c', a: 'middle', op: 0.85 }) +
      S.T(W.x + W.w / 2, W.y + 160, 'seit 1928', { f: 'Caveat', s: 34, c: '#d6a03c', a: 'middle', op: 0.85 }) + '</g>';
    // sun patch on the floor
    bg += A.shaft([[W.x + 30, WALL_Y + 4], [W.x + W.w, WALL_Y + 4], [W.x + W.w + 280, 905], [W.x + 120, 905]], '#ffe6b0', 0.22);

    // ── brass pendants ──
    [380, 980, 1600].forEach(function (x, j) { bg += S.pendant(x, -10, j === 1 ? 210 : 170, 90, '#c9a043', { cone: 420, op: 0.22 }); });
    // framed prints on the wall
    bg += S.frame(720, 230, 150, 190, '#e9dfc4', function (x, y, w, h) { return S.circ(x + w / 2, y + h / 2, 40, '#c43d33', { w: 2, extra: 2 }) + S.seg(x + 20, y + h - 30, x + w - 20, y + h - 30, 3); });
    bg += S.frame(900, 270, 220, 150, '#e9dfc4', function (x, y, w, h) { return S.fillOnly(S.poly([[x, y + h], [x + 60, y + 40], [x + 110, y + 90], [x + 150, y + 30], [x + w, y + h]], 20, 1), '#6f9a49') + S.circ(x + 160, y + 30, 14, '#e2b13b', { w: 1.4, extra: 1 }); });

    // ── chalk menu above the counter ──
    var MX = 1390, MY = 110, MW = 470, MH = 340;
    bg += S.drop(MX, MY, MW, MH, 8, 10) + S.box(MX - 14, MY - 14, MW + 28, MH + 28, '#6b4a2f', { w: 3, extra: 3.4 }) + S.box(MX, MY, MW, MH, '#2b302c', { w: 2, extra: 1.6 });
    bg += S.hatch(S.rect(MX, MY, MW, MH), { ang: 20, gap: 13, w: 1.4, op: 0.12, color: '#e9e0c8' });
    bg += S.T(MX + MW / 2, MY + 56, 'Mittagstisch', { f: 'Caveat', s: 50, c: '#f4eedf', a: 'middle' });
    var menu = [['Suppe des Tages', '5,50'], ['Quiche mit Salat', '8,90'], ['Apfelkuchen', '3,90'], ['Käsekuchen', '3,60'], ['Cappuccino', '3,40'], ['Kaffee', '2,80']];
    menu.forEach(function (m, k) {
      var y = MY + 104 + k * 38;
      bg += S.T(MX + 34, y, m[0], { f: 'Kalam', s: 25, c: '#ece4cc' }) + S.T(MX + MW - 34, y, m[1] + ' €', { f: 'Kalam', s: 25, c: k < 2 ? '#e9b85c' : '#ece4cc', a: 'end' });
    });
    bg += S.seg(MX + 120, MY + 72, MX + MW - 120, MY + 72, 2, '#ece4cc', ' opacity=".7"');

    // back shelf behind the counter: cups + jars
    bg += S.shelf(1340, 1900, 520, '#8d6236');
    for (i = 0; i < 6; i++) bg += S.mug(1380 + i * 52, 520, 34, 30, i % 2 ? '#f4eedf' : '#e9dfc4', { top: '#d9d0b8' });
    bg += S.bottle(1720, 520, 90, '#c9a46a', { wr: 0.6, cap: P.red }) + S.bottle(1790, 520, 76, '#e8e3b3', { wr: 0.7, cap: P.green }) + S.bottle(1850, 520, 96, '#8a5a36', { wr: 0.4, cap: P.ink });

    // chair behind the window table (bg)
    var cb = U.catmull([[300, 760], [296, 610], [390, 586], [484, 610], [480, 760]], 5, false);
    bg += S.line(cb, { w: 14, ta: 0.02, tb: 0.02, min: 0.9 }, '#2f2a26') + S.line(cb, { w: 7, ta: 0.02, tb: 0.02, min: 0.9 }, '#6b4a2f');
    // empty bentwood chair centre-left + coat stand
    bg += S.line([[700, WALL_Y + 60], [700, 380]], { w: 8, ta: 0.02, tb: 0.02 }, '#5e3f22') + S.lines([[[700, 400], [660, 380]], [[700, 400], [742, 382]], [[700, WALL_Y + 60], [660, WALL_Y + 80]], [[700, WALL_Y + 60], [740, WALL_Y + 80]]], { w: 6, ta: 0.05, tb: 0.3 }, '#5e3f22');
    bg += S.shape(U.catmull([[664, 392], [650, 470], [660, 560], [690, 560], [690, 420]], 5, true), '#7d4a5a', { w: 2.2, extra: 2.4 });
    bg += S.plant(1230, WALL_Y + 10, 190, { n: 11, pot: '#b5562f', tall: 1.2 });

    // ═════ fg 1: window table ═════
    fg += S.floorShadow((TB.x0 + TB.x1) / 2, 985, 200, 12, 0.3);
    fg += S.line([[390, TB.yf], [390, 975]], { w: 16, ta: 0.02, tb: 0.02, min: 0.9 }, '#2f2a26') + S.shape(S.ellipse(390, 976, 90, 12, 30), '#2f2a26', { w: 1.6, extra: 1 });
    var top = S.ellipse((TB.x0 + TB.x1) / 2, TB.yb + 20, (TB.x1 - TB.x0) / 2, 30, 50);
    fg += S.shape(top, '#e9dfc4', { w: 3, extra: 3 }) + S.shape(S.poly([[TB.x0, TB.yb + 20], [TB.x1, TB.yb + 20], [TB.x1 - 4, TB.yb + 38], [TB.x0 + 4, TB.yb + 38]], 40, 0.6), '#b9a27a', { w: 2, extra: 2 });
    fg += S.shape(S.ellipse((TB.x0 + TB.x1) / 2, TB.yb + 20, (TB.x1 - TB.x0) / 2, 30, 50), null, { w: 2.6, extra: 2 });
    // newspaper folded + magazine + cappuccino
    var np = U.xf(S.rect(-80, -26, 160, 52, 30, 0.6), 300, TB.yb + 14, -6);
    fg += S.shape(np, '#efe9da', { w: 2, extra: 2 }) + S.T(300, TB.yb + 6, 'TAGESBLATT', { f: 'Oswald', s: 15, a: 'middle', r: -6 }) + S.T(302, TB.yb + 28, 'Mieten steigen', { f: 'Fraunces', s: 14, a: 'middle', r: -6 });
    var mg = U.xf(S.rect(-56, -24, 112, 48, 30, 0.6), 430, TB.yb + 22, 8);
    fg += S.shape(mg, '#8fb3a6', { w: 2, extra: 2 }) + S.T(430, TB.yb + 28, 'WOHNEN', { f: 'Anton', s: 20, c: P.white, a: 'middle', r: 8 });
    fg += S.mug(520, TB.yb + 22, 40, 30, '#f4eedf', { top: '#c79a60' }) + S.shape(S.ellipse(522, TB.yb + 24, 34, 8, 20), '#efe9da', { w: 1.4, extra: 1 });

    // ═════ fg 2: counter with cake display ═════
    var cx0 = CT.x0, ctop = CT.top;
    fg += S.box(cx0, ctop, 1960 - cx0, 26, '#8d6236', { w: 3, extra: 3.4, hatch: 'b', hk: 0.4 });
    fg += S.box(cx0 + 10, ctop + 26, 1940 - cx0, 990 - ctop - 26, '#3f5a46', { w: 3, extra: 3.2 });
    for (var bx = cx0 + 30; bx < 1900; bx += 160) fg += S.box(bx, ctop + 300, 130, 150, '#46644e', { w: 2, extra: 2, hatch: 'r', hk: 0.15 });
    // vitrine (glass, curved front) with cakes
    var vx0 = cx0 + 20, vx1 = cx0 + 290, vy0 = ctop - 120, vy1 = ctop + 260;
    fg += S.box(vx0, vy1, vx1 - vx0, 30, '#2f2a26', { w: 2, extra: 2, hatch: false });
    var shelf2 = vy0 + 200;
    fg += S.fillOnly(S.rect(vx0, vy0, vx1 - vx0, vy1 - vy0), '#f4eedf', ' opacity=".55"');
    fg += S.seg(vx0 + 8, shelf2, vx1 - 8, shelf2, 4, '#9aa3a6');
    fg += cake(S, vx0 + 18, shelf2 - 4, 76, 60, '#d9a75a', '#b9733a', { layers: 2 }) + cake(S, vx0 + 106, shelf2 - 4, 76, 70, '#f1e6c4', '#e2b46a', {}) + cake(S, vx0 + 194, shelf2 - 4, 76, 76, '#5a3420', '#f4eedf', { layers: 3, cherries: true });
    fg += cake(S, vx0 + 20, vy1 - 10, 110, 56, '#e8d4a0', '#c43d33', { layers: 2 }) + cake(S, vx0 + 150, vy1 - 10, 116, 50, '#d9b27a', '#8a5a36', {});
    // price tags
    [['Apfel', vx0 + 56], ['Käse', vx0 + 144], ['Kirsch', vx0 + 232]].forEach(function (tg) { fg += S.box(tg[1] - 32, shelf2 + 4, 64, 22, '#f4eedf', { w: 1.2, extra: 0.8, hatch: false }) + S.T(tg[1], shelf2 + 21, tg[0], { f: 'Kalam', s: 14, a: 'middle' }); });
    var glass = S.rect(vx0, vy0, vx1 - vx0, vy1 - vy0, 40, 0.6);
    fg += S.shape(glass, null, { w: 2.6, extra: 2.4 }) + S.hatch(glass, { ang: -55, gap: 7, w: 1.4, op: 0.3, color: '#ffffff', cond: function (X, Y) { var u = (X - vx0) + (Y - vy0) * 0.6; return (u > 60 && u < 110) || (u > 300 && u < 320); } });
    // espresso machine on the counter (right)
    var em = 1790;
    fg += S.box(em, ctop - 170, 200, 170, '#b5bcbc', { w: 3, extra: 3.2, hatch: 'r', hk: 0.25 }) + S.box(em + 10, ctop - 186, 180, 18, '#8a9093', { w: 2, extra: 2, hatch: false });
    fg += S.circ(em + 60, ctop - 120, 16, '#f4eedf', { w: 1.8, extra: 1.4 }) + S.circ(em + 140, ctop - 120, 16, '#f4eedf', { w: 1.8, extra: 1.4 });
    fg += S.box(em + 70, ctop - 70, 60, 20, '#2f2a26', { w: 1.6, extra: 1.2, hatch: false }) + S.mug(em + 100, ctop - 4, 34, 26, '#f4eedf') + S.steam(em + 96, ctop - 40, 50, 0, 0.35);
    // tip jar
    fg += S.bottle(1660, ctop, 60, 'rgba(220,235,230,.6)', { wr: 0.7 }) + S.T(1660, ctop - 20, 'Danke!', { f: 'Caveat', s: 18, a: 'middle' });
    return { bg: bg, fg: fg };
  }

  A.define('cafe-window', {
    seed: 204, build: build,
    slots: {
      left:          A.slot(740, 985, 1.0, { face: 1 }),
      center:        A.slot(980, 990, 1.02),
      right:         A.slot(1200, 985, 1.0, { face: -1 }),                          // in front of the counter's left end
      'window-seat': A.slot(390, 990, 0.95, { face: 1, seated: true, seatY: 820 }), // behind the window table, street behind
      counter:       A.slot(1730, 880, 0.9, { face: -1 })                           // behind the counter (barista); legs hidden by fg
    }
  });
})(typeof self !== 'undefined' ? self : this);
