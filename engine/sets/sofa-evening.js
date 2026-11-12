/* sofa-evening — late-evening living room in dark blue light, lit only by a big TV playing a series with subtitles:
 * cool TV glow across the floor and the sofa, a night window with lit city windows, sideboard (candle, router lights,
 * game pad, plant), a sofa with a plaid blanket and cushions, and in front (FOREGROUND layer) a low coffee table with
 * popcorn, crisps, tea and the remote. Ambient: TV flicker.
 * Exports text rects: slots.tv = subtitle strip on the TV (the engine writes the subtitle line there),
 * slots.screen = whole TV picture. Variant 'subs' draws a sample subtitle line itself.
 * Slots: sofa-left, sofa-right (seated, facing the TV), left, center, right, tv, screen. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WY = 760, WALL = '#28324a', WALLD = '#1e2638', GLOW = '#cfe4ff';
  var SCR = { x: 150, y: 196, w: 620, h: 350 };                 // TV picture
  var SUB = { x: 180, y: 468, w: 560, h: 62 };                  // subtitle strip (text rect)

  function room(S) {
    var s = '';
    s += S.wall(0, WY, WALL, { top: 70, op: 0.45, hcol: '#0c1018', side: 0.1 });
    s += S.stripes(0, WY, 70, '#9fb4d4', 0.07);
    s += S.skirting(WY, 20, '#323d56');
    s += S.floor(WY, { kind: 'boards', gap: 100, fill: '#3a3a44', vx: 900, vy: 420, lop: 0.45, hop: 0.2 });
    s += S.fillOnly([[-20, 900], [1940, 900], [1940, 1100], [-20, 1100]], 'rgba(8,10,18,.3)');
    // rug
    var rug = S.poly([[700, 860], [1820, 860], [1900, 1000], [600, 1000]], 50, 1.4);
    s += S.shape(rug, '#5a4560', { w: 2.4, extra: 2.4 }) + S.hatch(rug, { ang: 0, gap: 11, w: 1.1, op: 0.25 });
    return s;
  }

  function nightWindow(S) {
    var x = 1480, y = 110, w = 320, h = 360;
    var view = S.fillOnly(S.rect(0, 0, 1920, 1080), S.linear([[0, '#141b2a'], [1, '#2b3850']], 0, 0, 0, 1));
    view += S.circ(x + 240, y + 70, 26, '#e9e2c6', { w: 1.2, extra: 0.6 }) + S.glow(x + 240, y + 70, 80, 80, '#e9e2c6', 0.25);
    // block opposite with a few lit windows
    view += S.fillOnly(S.rect(x - 10, y + 170, w + 20, h), '#1a2030');
    for (var j = 0; j < 4; j++) for (var i = 0; i < 6; i++) {
      var lit = ((i * 7 + j * 3) % 5) < 2;
      view += S.fillOnly(S.rect(x + 14 + i * 52, y + 196 + j * 44, 30, 26, 20, 0.4), lit ? '#f2c46a' : '#2a3246', lit ? ' opacity=".85"' : '');
    }
    var s = S.window(x, y, w, h, { view: view, panes: [2, 2], frame: '#3d4862', night: true, sillCol: '#3d4862' });
    // dark curtains
    [[x - 50, 1], [x + w + 50, -1]].forEach(function (c) {
      var cx = c[0], d = c[1];
      var cu = U.catmull([[cx - 40 * d, y - 40], [cx + 40 * d, y - 40], [cx + 26 * d, y + 160], [cx + 46 * d, y + h + 120], [cx - 40 * d, y + h + 124], [cx - 44 * d, y + 160]], 5, true);
      s += S.shape(cu, '#3a2f4a', { w: 2.4, extra: 2.8 }) + S.hatch(cu, { ang: 88, gap: 8, w: 1.3, op: 0.5 });
    });
    return s;
  }

  // the series on TV: warm kitchen at night, two figures (one with a suitcase), dramatic
  function series(S, subs) {
    var x = SCR.x, y = SCR.y, w = SCR.w, h = SCR.h, s = '';
    s += S.fillOnly(S.rect(x, y, w, h), S.linear([[0, '#3a4a5c'], [1, '#6a5a4a']], 0, 0, 0, 1));
    s += S.glow(x + w * 0.62, y + h * 0.28, 200, 120, '#ffd99a', 0.55);
    s += S.fillOnly(S.rect(x + w * 0.5, y + 30, 120, 160), '#8aa0b0', ' opacity=".6"');     // window in the scene
    s += S.fillOnly(S.rect(x, y + h * 0.72, w, h * 0.3), '#3b2f28');                        // table / floor
    // two silhouettes
    s += S.shape(U.catmull([[x + 170, y + h], [x + 160, y + 170], [x + 190, y + 130], [x + 230, y + 170], [x + 222, y + h]], 6, true), '#1a1714', { w: 1.6, extra: 1.2 });
    s += S.circ(x + 196, y + 108, 30, '#1a1714', { w: 1.4, extra: 1 });
    s += S.shape(U.catmull([[x + 410, y + h], [x + 400, y + 180], [x + 432, y + 142], [x + 470, y + 182], [x + 462, y + h]], 6, true), '#1a1714', { w: 1.6, extra: 1.2 });
    s += S.circ(x + 436, y + 116, 28, '#1a1714', { w: 1.4, extra: 1 });
    s += S.box(x + 480, y + 230, 70, 90, '#5a2c26', { w: 1.6, extra: 1.4, step: 30, hatch: false });
    // scan-line grain
    s += S.hatch(S.rect(x, y, w, h), { ang: 0, gap: 5, w: 1, op: 0.08, color: '#000000' });
    // subtitle strip
    s += S.fillOnly(S.rect(SUB.x, SUB.y, SUB.w, SUB.h, 40, 0.3), 'rgba(0,0,0,.55)');
    if (subs) s += S.T(SUB.x + SUB.w / 2, SUB.y + SUB.h * 0.7, 'Ich hab’ dich vermisst.', { f: 'Oswald', s: 34, a: 'middle', c: '#ffffff', w: 500 });
    s += '<!--amb:flicker-->';
    return s;
  }

  function tvWall(S, subs) {
    var s = '', g = S.radial([[0, GLOW, 0.32], [0.6, GLOW, 0.1], [1, GLOW, 0]], { user: true, cx: 460, cy: 400, r: 1100 });
    // light from the TV across the room (behind everything else)
    s += '<rect x="0" y="0" width="1920" height="1080" fill="' + g + '"/>';
    s += A.shaft([[SCR.x + SCR.w, SCR.y + 40], [SCR.x + SCR.w, SCR.y + SCR.h], [1900, 1000], [1700, 640]], GLOW, 0.06);
    s += S.fillOnly(S.ellipse(480, 780, 520, 70, 40), GLOW, ' opacity=".09"');
    // TV
    s += S.drop(SCR.x - 22, SCR.y - 22, SCR.w + 44, SCR.h + 44, 10, 12, 'rgba(0,0,0,.4)');
    s += S.box(SCR.x - 22, SCR.y - 22, SCR.w + 44, SCR.h + 44, '#121418', { w: 3.2, extra: 3.6 });
    var r = S.rect(SCR.x, SCR.y, SCR.w, SCR.h, 60, 0.4);
    s += '<g clip-path="url(#' + S.clip(r) + ')">' + series(S, subs) + '</g>';
    s += S.shape(r, null, { w: 1.6, extra: 0.8 });
    s += S.seg(SCR.x + SCR.w / 2, SCR.y + SCR.h + 22, SCR.x + SCR.w / 2, 600, 10, '#121418');
    // sideboard
    var sx = 90, sw = 740, sy = 600;
    s += S.box(sx, sy, sw, 140, '#3b2e2a', { w: 3, extra: 3.4, hatch: 'r', hk: 0.15, hop: 0.4 });
    s += S.box(sx + 20, sy + 26, sw / 2 - 30, 96, '#46362f', { w: 2, extra: 2, step: 40, hatch: false }) + S.box(sx + sw / 2 + 10, sy + 26, sw / 2 - 30, 96, '#46362f', { w: 2, extra: 2, step: 40, hatch: false });
    s += S.seg(sx + 20, sy + 140, sx + 26, sy + 158, 5) + S.seg(sx + sw - 20, sy + 140, sx + sw - 26, sy + 158, 5);
    s += S.box(sx - 10, sy - 14, sw + 20, 16, '#4c3b34', { w: 2.4, extra: 2.6, step: 60 });
    // candle, router, game pad, plant
    s += S.box(140, sy - 64, 30, 50, '#e9dfc4', { w: 1.6, extra: 1.4, step: 20, hatch: false }) + S.glow(155, sy - 80, 50, 50, P.amber, 0.6);
    s += S.shape(U.catmull([[155, sy - 64], [150, sy - 76], [155, sy - 90], [160, sy - 76]], 4, true), P.amber, { w: 1, extra: 0.6 });
    s += S.box(640, sy - 34, 90, 20, '#22252a', { w: 1.8, extra: 1.6, step: 30, hatch: false });
    [652, 666, 680].forEach(function (lx, i) { s += S.dot(lx, sy - 24, 3, i === 1 ? '#ffb347' : '#7fe08a'); });
    s += S.shape(U.catmull([[520, sy - 16], [540, sy - 34], [580, sy - 34], [600, sy - 16], [585, sy - 12], [535, sy - 12]], 4, true), '#2a2c32', { w: 1.6, extra: 1.4 });
    s += S.plant(790, sy - 14, 90, { n: 7, pot: '#4c5a74' });
    return s;
  }

  function sofa(S) {
    var s = '', x0 = 1000, x1 = 1780, seat = 770, base = 900, COL = '#4a5a6e', COLD = '#3a4758';
    s += S.floorShadow((x0 + x1) / 2, base + 6, 440, 22, 0.35);
    // back
    s += S.box(x0 + 30, 560, x1 - x0 - 60, 200, COL, { w: 3, extra: 3.4, hatch: 't', hk: 0.25 });
    // back cushions
    s += S.box(x0 + 70, 590, 330, 180, '#56677c', { w: 2.4, extra: 2.6, hatch: 'b', hk: 0.25 }) + S.box(x0 + 400, 590, 330, 180, '#56677c', { w: 2.4, extra: 2.6, hatch: 'b', hk: 0.25 });
    // throw cushions
    s += S.shape(U.xf(S.rrect(-60, -55, 120, 110, 26), x0 + 130, 690, -12), P.mustard, { w: 2.4, extra: 2.6 });
    s += S.shape(U.xf(S.rrect(-55, -50, 110, 100, 24), x1 - 140, 694, 10), '#8e3a34', { w: 2.4, extra: 2.6 });
    // seat
    s += S.box(x0 + 40, seat, x1 - x0 - 80, 60, '#5c6d82', { w: 2.6, extra: 3, step: 60, hatch: 'b', hk: 0.3 });
    s += S.seg((x0 + x1) / 2, seat + 4, (x0 + x1) / 2, seat + 56, 1.8);
    s += S.box(x0 + 30, seat + 60, x1 - x0 - 60, base - seat - 70, COLD, { w: 2.6, extra: 3, step: 60, hatch: 'b', hk: 0.4 });
    // arms
    s += S.shape(S.rrect(x0 - 20, 650, 80, base - 650 - 10, [30, 30, 6, 6]), COL, { w: 3, extra: 3.4 }) + S.shape(S.rrect(x1 - 60, 650, 80, base - 650 - 10, [30, 30, 6, 6]), COL, { w: 3, extra: 3.4 });
    s += A.shadeSide(S, [[x1 - 60, 650], [x1 + 20, 650], [x1 + 20, base], [x1 - 60, base]], [1, 0], 0, { gap: 7, op: 0.4 });
    // plaid blanket over the right arm, spilling onto the seat
    var bl = U.catmull([[x1 - 260, seat + 6], [x1 - 120, seat - 18], [x1 - 40, 640], [x1 + 30, 660], [x1 + 30, 860], [x1 - 30, 880], [x1 - 70, 830], [x1 - 180, seat + 54], [x1 - 270, seat + 40]], 6, true);
    s += S.shape(bl, '#9a4a3a', { w: 2.6, extra: 3 });
    var PL = [];
    for (var i = 0; i < 9; i++) { PL.push([[x1 - 270 + i * 34, seat - 30], [x1 - 250 + i * 34, 890]]); PL.push([[x1 - 280, 640 + i * 28], [x1 + 40, 650 + i * 28]]); }
    s += '<g clip-path="url(#' + S.clip(bl) + ')">' + S.lines(PL, { w: 2.4, ta: 0.05, tb: 0.05, min: 0.6 }, P.mustard, ' opacity=".55"') + '</g>';
    s += S.lines([[[x1 - 20, 680], [x1 - 6, 860]], [[x1 - 110, seat], [x1 - 70, 820]]], { w: 2, ta: 0.2, tb: 0.3, min: 0.4 }, P.ink, ' opacity=".55"');
    // TV light on the sofa front
    s += S.fillOnly([[x0 - 20, 560], [x0 + 300, 560], [x0 + 200, base], [x0 - 20, base]], GLOW, ' opacity=".08"');
    return s;
  }

  // ── fg: coffee table with snacks ──
  function table(S) {
    var s = '', x0 = 1130, x1 = 1640, top = 884;
    s += S.floorShadow((x0 + x1) / 2, 972, 280, 14, 0.4);
    s += S.seg(x0 + 30, top + 18, x0 + 26, 968, 7, '#2a2220') + S.seg(x1 - 30, top + 18, x1 - 26, 968, 7, '#2a2220');
    s += S.box(x0, top, x1 - x0, 22, '#5a4436', { w: 2.8, extra: 3.2, step: 60, hatch: 'b', hk: 0.4 });
    // popcorn bowl
    var bw = U.catmull([[x0 + 60, top - 40], [x0 + 72, top - 6], [x0 + 140, top + 2], [x0 + 208, top - 6], [x0 + 220, top - 40]], 5, false);
    for (var i = 0; i < 16; i++) s += S.circ(x0 + 74 + (i % 8) * 19 + (i > 7 ? 9 : 0), top - 46 - (i > 7 ? 14 : 0) - (i % 3) * 3, 11, i % 4 ? '#f1e3b6' : '#e7cf86', { w: 1.2, extra: 0.8 });
    s += S.shape(bw.concat([[x0 + 220, top - 40]]), P.red, { w: 2.2, extra: 2.4 });
    s += S.fillOnly(S.rect(x0 + 90, top - 34, 18, 26, 20, 0.4), P.white, ' opacity=".7"') + S.fillOnly(S.rect(x0 + 150, top - 34, 18, 28, 20, 0.4), P.white, ' opacity=".7"');
    // crisps bag (open, tipped)
    var bag = U.xf(S.rect(-50, -38, 100, 76, 30, 2), x0 + 300, top - 30, -18);
    s += S.shape(bag, P.yellow, { w: 2.2, extra: 2.4 }) + S.T(x0 + 300, top - 22, 'CHIPS', { f: 'Anton', s: 22, a: 'middle', c: P.redD, r: -18 });
    [[x0 + 360, top - 4], [x0 + 380, top - 8], [x0 + 352, top - 12]].forEach(function (c) { s += S.circ(c[0], c[1], 9, '#e7c068', { w: 1, extra: 0.6, ry: 4 }); });
    // tea mug + remote
    s += S.mug(x0 + 440, top, 48, 56, '#c7d3df');
    s += S.box(x1 - 120, top - 14, 90, 14, '#1d1f24', { w: 1.6, extra: 1.4, step: 30, hatch: false }) + S.dot(x1 - 106, top - 7, 3, '#d9583f');
    return s;
  }

  function build(S, opts) {
    var subs = opts.variant === 'subs';
    var bg = room(S) + nightWindow(S) + tvWall(S, subs) + sofa(S);
    // floor lamp (off) + picture frame catching the glow
    bg += S.seg(1880, 900, 1876, 330, 4, '#1a1e28') + S.shape([[1830, 330], [1920, 330], [1900, 260], [1850, 260]], '#3d4862', { w: 2.2, extra: 2.4 }) + S.seg(1840, 904, 1916, 902, 5, '#1a1e28');
    bg += S.frame(1040, 220, 200, 150, '#5a6a80', function (x, y, w, h) { return S.fillOnly(S.rect(x, y, w, h), '#4c5d74') + S.shape(S.poly([[x - 4, y + h], [x + 50, y + 60], [x + 100, y + 90], [x + 150, y + 40], [x + w + 4, y + h]], 14, 1), '#2f3c50', { w: 1.4, extra: 1 }); }, { frame: '#141820' });
    // whole-room night tint, darker at the corners
    bg += '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.4, '#0a0e18', 0], [1, '#05070c', 0.55]], { cx: '35%', cy: '45%', r: '80%' }) + '"/>';
    var flickG = S.radial([[0, GLOW, 0.5], [1, GLOW, 0]], { user: true, cx: 460, cy: 380, r: 900 });
    return {
      bg: bg + '<!--amb:roomFlicker-->', fg: table(S),
      amb: {
        // cheap per-frame TV flicker: one rect on the picture + one soft room glow
        flicker: function (t) {
          var f = 0.5 + 0.5 * Math.sin(t * 7.3) * Math.sin(t * 2.1 + 1), cut = (Math.floor(t / 4.2) % 3);
          return '<rect x="' + SCR.x + '" y="' + SCR.y + '" width="' + SCR.w + '" height="' + (SUB.y - SCR.y) + '" fill="' + ['#ffffff', '#9fc0ff', '#ffd9a0'][cut] + '" opacity="' + (0.03 + 0.07 * f).toFixed(3) + '"/>';
        },
        roomFlicker: function (t) {
          var f = 0.5 + 0.5 * Math.sin(t * 7.3) * Math.sin(t * 2.1 + 1);
          return '<rect x="0" y="0" width="1920" height="1080" fill="' + flickG + '" opacity="' + (0.06 + 0.1 * f).toFixed(3) + '"/>';
        }
      }
    };
  }

  A.define('sofa-evening', {
    seed: 206, ambient: true, build: build, variants: ['subs'],
    slots: {
      'sofa-left':  A.slot(1220, 900, 0.95, { face: -1, seated: true, seatY: 770 }),   // watching TV (screen is on the left)
      'sofa-right': A.slot(1500, 900, 0.95, { face: -1, seated: true, seatY: 770 }),
      left:   A.slot(880, 945, 1.0, { face: -1 }),
      center: A.slot(980, 950, 1.0),
      right:  A.slot(1800, 955, 1.0, { face: -1 }),
      tv:     { x: SUB.x, y: SUB.y, w: SUB.w, h: SUB.h },          // subtitle strip on the TV (text rect)
      screen: { x: SCR.x, y: SCR.y, w: SCR.w, h: SCR.h }           // whole TV picture
    }
  });
})(typeof self !== 'undefined' ? self : this);
