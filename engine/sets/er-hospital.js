/* er-hospital — comedic „Notaufnahme“ corridor at night under cold fluorescent light: hanging red NOTAUFNAHME sign,
 * swing doors with portholes, a half-drawn cubicle curtain (IV stand, stool), wheelchair, and in front a stretcher on
 * which a big WORD CARD lies like a patient (pillow, blanket, bandage) next to a monitor with a heartbeat line (ambient).
 * Variant '' = card reads „das Wort“; 'blank' = empty card, the engine can write into slots.card {x,y,w,h}.
 * Slots: stretcher (standing next to it), nurse (by the monitor), left, center, right. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WY = 720, MINT = '#bccfc0', MINTD = '#93ad9e', CURT = '#9fbcc0';
  var CARD = { x: 1010, y: 560, w: 420, h: 128 };          // word card on the stretcher (text area)
  var MON = { x: 1592, y: 396, w: 118, h: 82 };            // monitor screen

  function room(S) {
    var s = '';
    s += S.wall(0, WY, MINT, { top: 40, op: 0.3, hcol: '#2a3a33' });
    s += S.fillOnly([[-20, 470], [1940, 470], [1940, WY], [-20, WY]], MINTD);
    s += S.hatch([[-20, 470], [1940, 470], [1940, WY], [-20, WY]], { ang: 80, gap: 11, w: 1.1, op: 0.15 });
    // ceiling with fluorescent panels
    s += S.fillOnly([[-20, -20], [1940, -20], [1940, 40], [-20, 40]], '#d7ddd2');
    s += S.line([[-20, 40], [1940, 42]], { w: 3.4, ta: 0.02, tb: 0.02, min: 0.6 });
    [260, 960, 1660].forEach(function (x) {
      s += S.glow(x, 60, 360, 120, '#effff4', 0.4);
      s += S.box(x - 170, 18, 340, 20, '#f4fbf2', { w: 2.2, extra: 2.4, step: 60, hatch: false });
    });
    // bumper rail
    s += S.box(-20, 452, 1960, 22, '#c8b48a', { w: 2.8, extra: 3, hatch: 'b', hk: 0.4, step: 80 });
    s += S.skirting(WY, 22, '#6f8a7c');
    // glossy pale-green linoleum: plain, light reflections, calm in the subtitle zone
    s += S.fillOnly([[-20, WY], [1940, WY], [1940, 1100], [-20, 1100]], S.linear([[0, '#a9bfae'], [1, '#97ae9d']], 0, 0, 0, 1));
    [260, 960, 1660].forEach(function (x) { s += A.shaft([[x - 60, WY + 4], [x + 60, WY + 4], [x + 110, 1080], [x - 110, 1080]], '#f2fff4', 0.13); });
    var L = [];
    for (var y = WY + 30; y < 900; y += 34 + (y - WY) * 0.25) L.push([[-20, y], [1940, y + 1]]);
    s += S.lines(L, { w: 1.4, ta: 0.05, tb: 0.05, min: 0.4 }, P.ink, ' opacity=".18"');
    s += S.fillOnly([[-20, WY], [1940, WY], [1940, WY + 30], [-20, WY + 30]], 'rgba(30,50,40,.12)');
    return s;
  }

  function hangingSign(S) {
    var s = '', x = 700, y = 78, w = 520, h = 92;
    s += S.seg(x + 60, 40, x + 60, y, 2) + S.seg(x + w - 60, 40, x + w - 60, y, 2);
    s += S.drop(x, y, w, h, 8, 10, 'rgba(20,30,25,.25)');
    s += S.box(x, y, w, h, P.red, { w: 3.2, extra: 3.6, hatch: 'b', hk: 0.25 });
    s += S.box(x + 22, y + 18, 56, 56, P.white, { w: 1.6, extra: 1.2, step: 30, hatch: false });
    s += S.fillOnly(S.rect(x + 44, y + 24, 12, 44, 20, 0.3), P.red) + S.fillOnly(S.rect(x + 28, y + 40, 44, 12, 20, 0.3), P.red);
    s += S.T(x + w / 2 + 34, y + 64, 'NOTAUFNAHME', { f: 'Oswald', s: 48, a: 'middle', c: P.white, ls: 3 });
    return s;
  }

  function swingDoors(S) {
    var s = '', x = 720, y = 230, w = 480, h = WY - y;
    s += S.box(x - 20, y - 20, w + 40, h + 20, '#d9ded3', { w: 3.2, extra: 3.6 });
    s += S.T(x + w / 2, y - 34, 'OP · KEIN ZUTRITT', { f: 'Oswald', s: 24, a: 'middle', c: '#36463e', ls: 2 });
    [[x, 1], [x + w / 2, -1]].forEach(function (d) {
      var dx = d[0], dw = w / 2;
      s += S.box(dx + 4, y, dw - 8, h, '#a7c2b4', { w: 2.8, extra: 3, hatch: d[1] > 0 ? 'r' : 'l', hk: 0.15, hop: 0.3 });
      s += S.box(dx + 16, y + h - 120, dw - 32, 96, '#c5cfc4', { w: 2, extra: 2, step: 40, hatch: false });
      var cx = dx + dw / 2, cy = y + 150;
      s += S.circ(cx, cy, 58, '#33413b', { w: 4, extra: 4 });
      s += S.glow(cx, cy, 50, 50, '#e9f6ee', 0.3);
      s += S.hatch(S.ellipse(cx, cy, 50, 50, 30), { ang: -50, gap: 7, w: 1.2, op: 0.25, color: '#ffffff', cond: function (X, Y) { var u = X - cx + Y - cy; return u > -20 && u < 6; } });
      s += S.box(dx + (d[1] > 0 ? dw - 34 : 18), y + 270, 16, 70, '#8f9a92', { w: 1.6, extra: 1.4, step: 30, hatch: false });
    });
    return s;
  }

  function curtainBay(S) {
    var s = '', x0 = 40, x1 = 560, top = 70;
    s += S.box(x0 - 10, top, x1 - x0 + 30, 12, '#c9cfc6', { w: 2.2, extra: 2.4, step: 60 });
    // behind: bay with IV stand + stool
    s += S.fillOnly(S.rect(x0, top + 12, x1 - x0, WY - top - 12, 40, 0.5), '#a9bdb3');
    var iv = 430;
    s += S.seg(iv, 180, iv, 700, 4) + S.seg(iv - 50, 180, iv + 50, 180, 3) + S.seg(iv - 50, 700, iv + 50, 704, 3.4);
    s += S.shape(S.rrect(iv - 44, 188, 40, 66, 10), '#e6efe9', { w: 2, extra: 2 }) + S.fillOnly(S.rect(iv - 40, 218, 32, 32, 20, 0.4), '#c9e1d6');
    s += S.line(U.catmull([[iv - 24, 254], [iv - 30, 340], [iv + 20, 420], [iv + 6, 520]], 6, false), { w: 1.6, ta: 0.1, tb: 0.3, min: 0.4 });
    // curtain, drawn to the left with deep folds
    var cx1 = 330, folds = 8, cu = [];
    for (var i = 0; i <= folds * 4; i++) { var u = i / (folds * 4); cu.push([x0 + (cx1 - x0) * u + Math.sin(u * folds * Math.PI * 2) * 6, top + 14 + Math.abs(Math.sin(u * folds * Math.PI)) * 5]); }
    var bot = [];
    for (i = folds * 4; i >= 0; i--) { var v = i / (folds * 4); bot.push([x0 + (cx1 + 30 - x0) * v + Math.sin(v * folds * Math.PI * 2) * 14, WY - 70 + Math.sin(v * 9) * 6]); }
    var poly = cu.concat(bot);
    s += S.shape(poly, CURT, { w: 2.6, extra: 3 });
    var FL = [];
    for (i = 1; i < folds * 2; i++) { var fx = x0 + (cx1 - x0) * i / (folds * 2); FL.push([[fx, top + 22], [fx + (i % 2 ? 4 : -2) + i * 1.5, WY - 76]]); }
    s += S.lines(FL, { w: 2, ta: 0.1, tb: 0.4, min: 0.3 }, P.ink, ' opacity=".55"');
    s += S.hatch(poly, { ang: 88, gap: 8, w: 1.1, op: 0.25 });
    for (i = 0; i < 9; i++) s += S.circ(x0 + 12 + i * (cx1 - x0) / 8, top + 6, 5, '#e3e7df', { w: 1, extra: 0.6 });
    return s;
  }

  function wheelchair(S, x, y) {
    var s = '', R = 92;
    s += S.floorShadow(x + 30, y + 4, 150, 16, 0.18);
    s += S.box(x - 40, y - 210, 18, 120, '#3b4540', { w: 1.6, extra: 1.4, step: 30, hatch: false });
    s += S.box(x - 34, y - 200, 120, 80, '#355a6a', { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.3 });
    s += S.box(x - 30, y - 124, 160, 22, '#355a6a', { w: 2.2, extra: 2.4, step: 40 });
    s += S.circ(x, y - R, R, null, { w: 4.6, extra: 3.6 }) + S.circ(x, y - R, R - 12, null, { w: 1.8, extra: 1 });
    var SP = [];
    for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI; SP.push([[x + Math.cos(a) * (R - 12), y - R + Math.sin(a) * (R - 12)], [x - Math.cos(a) * (R - 12), y - R - Math.sin(a) * (R - 12)]]); }
    s += S.lines(SP, { w: 1.1, ta: 0.05, tb: 0.05, min: 0.4 }, P.ink, ' opacity=".7"');
    s += S.circ(x + 132, y - 22, 22, '#3b4540', { w: 2, extra: 2 }) + S.seg(x + 128, y - 104, x + 132, y - 44, 3.2) + S.seg(x + 116, y - 104, x + 160, y - 60, 3);
    return s;
  }

  function stretcher(S, blank) {
    var s = '', x0 = 960, x1 = 1520, my = 712;
    s += S.floorShadow((x0 + x1) / 2, 900, 320, 24, 0.22);
    [[x0 + 50], [x1 - 60]].forEach(function (l) {
      s += S.box(l[0] - 8, my + 30, 16, 140, '#a6aca7', { w: 2, extra: 2, step: 40, hatch: false });
      s += S.circ(l[0], 886, 16, '#3b4540', { w: 2, extra: 2 });
    });
    s += S.seg(x0 + 50, my + 110, x1 - 60, my + 106, 4, '#a6aca7');
    s += S.box(x0, my + 18, x1 - x0, 20, '#c0c6c1', { w: 2.6, extra: 3, step: 60, hatch: 'b', hk: 0.4 });
    s += S.box(x0 + 6, my - 10, x1 - x0 - 12, 30, '#eef0ea', { w: 2.4, extra: 2.6, step: 60, hatch: 'b', hk: 0.4 });
    // raised backrest at the head (right) + pillow
    s += S.seg(x1 - 20, my - 4, x1 - 10, my - 180, 4, '#a6aca7');
    s += S.shape(U.catmull([[x1 - 120, my - 120], [x1 - 60, my - 150], [x1 + 4, my - 132], [x1 + 2, my - 76], [x1 - 70, my - 66], [x1 - 128, my - 86]], 6, true), '#f2f1ea', { w: 2.4, extra: 2.6 });
    // the patient: a big word card, half under the blanket
    var cr = U.xf(S.rect(-CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h, 40, 1), CARD.x + CARD.w / 2, CARD.y + CARD.h / 2, -3);
    s += S.fillOnly(U.xf(S.rect(-CARD.w / 2 + 8, -CARD.h / 2 + 10, CARD.w, CARD.h, 40, 1), CARD.x + CARD.w / 2, CARD.y + CARD.h / 2, -3), 'rgba(20,30,25,.25)');
    s += S.shape(cr, '#fbf7ea', { w: 3.4, extra: 3.8 });
    if (!blank) s += S.T(CARD.x + CARD.w / 2 + 14, CARD.y + CARD.h / 2 + 24, 'das Wort', { f: 'Fraunces', s: 66, a: 'middle', c: P.ink, r: -3 });
    // bandage strip across a corner
    s += S.shape(U.xf(S.rect(-70, -14, 140, 28, 30, 0.6), CARD.x + CARD.w - 46, CARD.y + 26, 34), '#efe2c8', { w: 1.6, extra: 1.4 });
    s += S.lines([[[CARD.x + CARD.w - 66, CARD.y + 6], [CARD.x + CARD.w - 54, CARD.y + 22]], [[CARD.x + CARD.w - 46, CARD.y + 18], [CARD.x + CARD.w - 34, CARD.y + 34]]], { w: 1.2, ta: 0.1, tb: 0.1, min: 0.4 }, P.ink, ' opacity=".6"');
    // blanket over the lower half, hanging off the foot end
    var bl = U.catmull([[x0 - 6, my - 28], [x0 + 140, my - 60], [x0 + 330, my - 70], [x0 + 400, my - 40], [x0 + 380, my + 24], [x0 + 200, my + 30], [x0 + 10, my + 64], [x0 - 14, my + 40]], 6, true);
    s += S.shape(bl, '#7f9fb4', { w: 2.6, extra: 3 });
    s += S.hatch(bl, { ang: 70, gap: 8, w: 1.2, op: 0.4, cond: function (X, Y) { return Y > my - 20; } });
    s += S.lines([[[x0 + 60, my - 40], [x0 + 70, my + 30]], [[x0 + 210, my - 58], [x0 + 230, my + 20]]], { w: 1.6, ta: 0.2, tb: 0.3, min: 0.4 }, P.ink, ' opacity=".5"');
    // chart clipboard hanging at the foot
    s += S.box(x0 + 20, my + 46, 70, 90, P.woodL, { w: 2, extra: 2, step: 30, hatch: false }) + S.box(x0 + 28, my + 58, 54, 70, P.white, { w: 1.2, extra: 0.8, step: 30, hatch: false });
    s += S.scribble(x0 + 34, my + 74, 40, 4, 12, P.ink, 0.6);
    return s;
  }

  function monitor(S) {
    var s = '', cx = MON.x + MON.w / 2;
    s += S.floorShadow(cx, 902, 90, 12, 0.2);
    s += S.seg(cx, MON.y + MON.h + 40, cx, 880, 5, '#7c847f');
    s += S.seg(cx - 70, 886, cx + 70, 884, 5, '#7c847f') + S.circ(cx - 70, 890, 9, '#3b4540', { w: 1.4, extra: 1 }) + S.circ(cx + 70, 890, 9, '#3b4540', { w: 1.4, extra: 1 });
    s += S.box(MON.x - 18, MON.y - 16, MON.w + 36, MON.h + 58, '#d2d6cf', { w: 3, extra: 3.4, hatch: 'r', hk: 0.15 });
    s += S.box(MON.x, MON.y, MON.w, MON.h, '#13201b', { w: 2, extra: 2, step: 40, hatch: false });
    s += S.T(MON.x + MON.w - 6, MON.y + 18, '72', { f: 'Oswald', s: 16, a: 'end', c: '#8fe3a2' });
    s += '<!--amb:beat-->';
    [0, 1, 2].forEach(function (i) { s += S.circ(MON.x + 14 + i * 22, MON.y + MON.h + 22, 6, ['#d9583f', '#e2c25a', '#7fbf8a'][i], { w: 1.2, extra: 0.8 }); });
    // lead to the card
    s += S.line(U.catmull([[MON.x, MON.y + MON.h + 30], [MON.x - 40, MON.y + 160], [1480, 640], [1424, 610]], 6, false), { w: 1.8, ta: 0.05, tb: 0.1, min: 0.5 });
    return s;
  }

  function beat(t) {
    var Sa = A.ambInk('er-hospital', 1), pts = [], x0 = MON.x + 6, w = MON.w - 12, base = MON.y + MON.h * 0.62, head = (t * 0.9) % 1;
    for (var i = 0; i <= 48; i++) {
      var u = i / 48, k = (u * 3) % 1, y = base;
      if (k > 0.35 && k < 0.42) y = base - 6; else if (k > 0.46 && k < 0.5) y = base + 6; else if (k >= 0.5 && k < 0.55) y = base - 34; else if (k >= 0.55 && k < 0.6) y = base + 12;
      pts.push([x0 + u * w, y]);
    }
    var s = '', seg = [];
    // trail: bright just behind the scan head, fading out; gap right in front of it
    for (i = 0; i < pts.length - 1; i++) {
      var d = (head - (pts[i][0] - x0) / w + 1) % 1;
      if (d < 0.06) continue;
      seg.push('M' + U.f1(pts[i][0]) + ' ' + U.f1(pts[i][1]) + 'L' + U.f1(pts[i + 1][0]) + ' ' + U.f1(pts[i + 1][1]));
    }
    s += '<path d="' + seg.join('') + '" stroke="#8fe3a2" stroke-width="2.4" fill="none" stroke-linejoin="round" opacity=".9"/>';
    var hx = x0 + head * w;
    s += Sa.glow(hx, base - 4, 16, 16, '#c8ffd4', 0.7);
    return s;
  }

  function build(S, opts) {
    var blank = opts.variant === 'blank';
    var bg = room(S) + hangingSign(S) + swingDoors(S) + curtainBay(S);
    // details on the wall
    bg += S.clock(1350, 250, 46, 3, 12);
    bg += S.box(1440, 300, 34, 70, '#eef0ea', { w: 1.8, extra: 1.6, step: 30, hatch: false }) + S.box(1446, 352, 22, 10, '#7fa3c4', { w: 1, extra: 0.6, step: 20, hatch: false });
    bg += S.note(1790, 300, 170, 120, 3, '#f2ecd6', [{ t: 'Bitte warten' }, { t: '— bis zu 4 Std. —', s: 20 }], { fs: 30, top: 44, tape: true });
    bg += S.box(1250, 520, 120, 150, '#eef0ea', { w: 2, extra: 2, hatch: 'r', hk: 0.2 }) + S.T(1310, 600, 'Desinfektion', { f: 'Oswald', s: 15, a: 'middle', c: '#36463e' });
    bg += wheelchair(S, 300, 905) + stretcher(S, blank) + monitor(S);
    return { bg: bg, amb: { beat: beat } };
  }

  A.define('er-hospital', {
    seed: 202, ambient: true, build: build, variants: ['blank'],
    slots: {
      stretcher: A.slot(860, 945, 1.0, { face: 1 }),      // standing next to the stretcher, looking at the card
      nurse:     A.slot(1790, 945, 1.0, { face: -1 }),    // by the monitor, facing the stretcher
      left:      A.slot(600, 945, 1.0, { face: 1 }),
      center:    A.slot(960, 950, 1.0),
      right:     A.slot(1640, 950, 1.0, { face: -1 }),
      card:      { x: CARD.x, y: CARD.y, w: CARD.w, h: CARD.h }    // text rect on the word card (use variant 'blank')
    }
  });
})(typeof self !== 'undefined' ? self : this);
