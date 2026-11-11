/* Set "wg-kitchen" — shared-flat kitchen in the evening: old fridge plastered with notes + pizza flyer,
 * pizza boxes on top, sink full of dishes, Putzplan, waste-separation bins, Pfand crate, café curtain.
 * Variants: '' (evening, lamp on, dark window) · 'day'.  Illustrator B · see engine/sets/kit-b.js
 */
(function (root) {
  'use strict';
  var K = root.SetKitB || require('./kit-b.js');
  var P = K.P, U = K.U;
  var YH = 790; // wall/floor junction

  function fridge(S) {
    var s = '', x = 70, y = 318, w = 270, h = YH - y - 6;
    // pizza boxes on top (slightly askew), a bottle and a plant
    [[x + 18, 0, 0], [x + 8, -24, -2], [x + 26, -48, 2.5]].forEach(function (b, i) {
      var r = U.xf(S.rect(0, -22, 236, 24, 40, 0.8), b[0], y + b[1], b[2]);
      s += S.shape(r, i === 1 ? '#d9c39a' : '#e2cfa6', { w: 2.4, extra: 2.6 });
      s += S.hatch(r, { ang: 10, gap: 6, w: 1, op: 0.35, cond: function (X, Y) { return Y > y + b[1] - 8; } });
      if (i === 2) s += S.T(b[0] + 118, y + b[1] - 5, 'PIZZA', { f: 'Oswald', s: 15, a: 'middle', c: P.red, r: b[2], ls: 3 });
    });
    s += S.bottle(x + 236, y - 72, 92, '#4f6d3a', { label: P.cream, cap: P.ochre });
    // body
    s += S.drop(x, y, w, h, 14, 10);
    var body = S.rrect(x, y, w, h, [26, 26, 6, 6]);
    s += S.shape(body, '#ece3cb', { w: 4, extra: 5 });
    s += S.hatch(body, { ang: 80, gap: 7, w: 1.3, op: 0.42, cond: function (X) { return X > x + w - 48; } });
    s += S.hatch(body, { ang: 15, gap: 9, w: 1.1, op: 0.18, cond: function (X, Y) { return Y > y + h - 60; } });
    // freezer split + handles + logo plate
    s += S.seg(x + 4, y + 140, x + w - 4, y + 141, 4);
    s += S.seg(x + 8, y + 146, x + w - 8, y + 147, 1.6, P.ink, ' opacity=".5"');
    s += S.box(x + w - 34, y + 46, 14, 74, '#cfc4a6', { w: 2, extra: 2, step: 20 });
    s += S.box(x + w - 34, y + 170, 14, 120, '#cfc4a6', { w: 2, extra: 2, step: 20 });
    s += S.box(x + 26, y + 18, 70, 16, '#b9ae92', { w: 1.6, extra: 1, step: 20 });
    // notes, flyer, magnets
    // pizza flyer (the hero detail)
    var fx = x + 112, fy = y + 278, fw = 132, fh = 178, fr = 4;
    var fl = U.xf(S.rect(-fw / 2, -fh / 2, fw, fh, 26, 1), fx, fy, fr);
    s += S.fillOnly(U.xf(S.rect(-fw / 2 + 5, -fh / 2 + 7, fw, fh, 26, 1), fx, fy, fr), P.shadow);
    s += S.shape(fl, P.red, { w: 2.4, extra: 2.6 });
    var pz = '';
    pz += S.T(0, -54, 'PIZZA', { f: 'Fraunces', s: 34, a: 'middle', c: P.white });
    pz += S.T(0, -28, 'BELLA', { f: 'Oswald', s: 20, a: 'middle', c: P.yellow, ls: 6 });
    // little pizza drawing
    var pc = S.ellipse(0, 20, 40, 40, 36, 0.02);
    pz += S.shape(pc, '#e7b35a', { w: 2, extra: 2 }) + S.shape(S.ellipse(0, 20, 32, 32, 30, 0.03), '#d9573f', { w: 1.2, extra: 0.6 });
    [[-12, 8], [10, 14], [-4, 32], [16, 30], [-18, 24], [4, 0]].forEach(function (q, i) { pz += S.dot(q[0], q[1] + 4, 5, i % 2 ? '#f1e2b0' : '#7b2a22'); });
    pz += S.seg(-40, 20, 40, 20, 1.4) + S.seg(0, -20, 0, 60, 1.4);
    pz += S.T(0, 82, 'Tel. 0176 · 24/7', { f: 'Oswald', s: 15, a: 'middle', c: P.white, ls: 1 });
    s += '<g transform="translate(' + fx + ' ' + fy + ') rotate(' + fr + ')">' + pz + '</g>';
    s += S.circ(fx - 4, fy - fh / 2 + 10, 9, P.mustard, { w: 1.8, extra: 1.6 });
    // joghurt note
    s += S.note(x + 92, y + 72, 132, 86, -5, P.yellow, ['Wer hat meinen', 'Joghurt gegessen?!'], { fs: 18, top: 34, lh: 1.25, pinCol: P.greenM });
    s += S.note(x + 205, y + 84, 70, 64, 6, P.paperL, [{ t: 'Milch!', c: P.red }], { fs: 22, top: 38, pinCol: P.navy });
    // photo strip + letter magnets
    var ph = U.xf(S.rect(-33, -42, 66, 84, 20, 0.6), x + 40, y + 410, -7);
    s += S.shape(ph, P.paperL, { w: 1.8, extra: 1.6 });
    s += S.fillOnly(U.xf(S.rect(-27, -36, 54, 50, 20, 0.6), x + 40, y + 410, -7), '#9fb08a') + S.circ(x + 30, y + 400, 9, P.red, { w: 1.2, extra: 0.8 }) + S.circ(x + 48, y + 396, 9, P.greenM, { w: 1.2, extra: 0.8 });
    [['W', P.red, 112, 452], ['G', P.mustard, 142, 458], ['!', P.greenM, 168, 450]].forEach(function (m) { s += S.T(x + m[2], y + m[3], m[0], { f: 'Fraunces', s: 34, c: m[1] }) ; });
    s += S.note(x + 206, y + 396, 86, 70, -3, P.paperL, ['Putzen', 'Do!'], { fs: 19, top: 28, tape: true });
    return s;
  }

  function counter(S) {
    var s = '', x0 = 372, x1 = 1468, top = 600;
    // backsplash tiles
    var bs = S.rect(x0, 430, x1 - x0, top - 430, 60, 0.6);
    s += S.fillOnly(bs, '#efe9d8');
    var L = [];
    for (var yy = 430 + 34; yy < top; yy += 34) L.push([[x0, yy], [x1, yy + 0.5]]);
    for (var xx = x0 + 34; xx < x1; xx += 34) L.push([[xx, 430], [xx + 0.5, top]]);
    s += S.lines(L, { w: 1.3, ta: 0.05, tb: 0.05, min: 0.5 }, P.ink, ' opacity=".28"');
    s += S.hatch(bs, { ang: 30, gap: 8, w: 1.1, op: 0.18, cond: function (X, Y) { return Y > top - 40; } });
    s += S.seg(x0, 430, x1, 431, 2.6);
    // base cabinets
    s += S.box(x0, top + 16, x1 - x0, YH - top - 34, '#8fa37a', { w: 3.4, extra: 4 });
    var doors = [x0 + 10, 590, 810, 1030, 1250, x1 - 10];
    for (var i = 0; i < doors.length - 1; i++) {
      var dx = doors[i] + 6, dw = doors[i + 1] - doors[i] - 12;
      s += S.box(dx, top + 52, dw, YH - top - 82, i === 2 ? '#86996f' : '#97ab80', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.18, hop: 0.4 });
      s += S.box(dx, top + 26, dw, 20, '#a3b58b', { w: 1.8, extra: 1.8, step: 40 });
      s += S.box(dx + dw / 2 - 18, top + 32, 36, 7, P.navyL, { w: 1.2, extra: 1, step: 20 });
      var kx = i % 2 ? dx + 18 : dx + dw - 18;
      s += S.circ(kx, top + 96, 6, P.navyL, { w: 1.4, extra: 1.2 });
    }
    s += S.fillOnly(S.rect(x0 + 4, YH - 20, x1 - x0 - 8, 16, 40, 0.5), '#3a3127');
    // tea towel hanging on the oven-door knob
    var tw = U.xf(S.rect(-28, 0, 56, 90, 20, 1), 1030 + 48, top + 104, 3);
    s += S.shape(tw, P.paperL, { w: 2, extra: 2 });
    s += '<g clip-path="url(#' + S.clip(tw) + ')">' + S.lines([[[1040, top + 120], [1120, top + 124]], [[1040, top + 132], [1120, top + 136]], [[1040, top + 170], [1120, top + 174]]], { w: 4, ta: 0.05, tb: 0.05, min: 0.8 }, P.red) + '</g>';
    // worktop
    s += S.box(x0 - 14, top, x1 - x0 + 28, 22, P.woodL, { w: 3.4, extra: 4, hatch: 'b', hk: 0.5, hop: 0.5 });
    s += S.lines([[[x0 + 20, top + 8], [x0 + 300, top + 9]], [[x0 + 520, top + 13], [x0 + 760, top + 12]], [[x1 - 280, top + 9], [x1 - 40, top + 10]]], { w: 1.4, ta: 0.2, tb: 0.3 }, P.ink, ' opacity=".55"');
    return s;
  }

  function counterProps(S) {
    var s = '', top = 600;
    // kettle
    var kx = 430, kb = top;
    var kt = U.catmull([[kx - 44, kb], [kx - 48, kb - 50], [kx - 36, kb - 92], [kx + 36, kb - 92], [kx + 48, kb - 50], [kx + 44, kb]], 5, false);
    s += S.line(U.catmull([[kx - 30, kb - 92], [kx - 20, kb - 128], [kx + 20, kb - 128], [kx + 30, kb - 92]], 5, false), { w: 9, ta: 0.05, tb: 0.05, min: 0.8 });
    s += S.line([[kx + 46, kb - 50], [kx + 76, kb - 82], [kx + 86, kb - 84]], { w: 12, ta: 0.1, tb: 0.2, min: 0.6 }, P.red);
    s += S.shape(kt, P.red, { w: 3, extra: 3.5 });
    s += S.hatch(kt, { ang: 75, gap: 6, w: 1.2, op: 0.5, cond: function (X) { return X > kx + 14; } });
    s += S.line([[kx - 28, kb - 70], [kx - 26, kb - 30]], { w: 3, ta: 0.3, tb: 0.3 }, '#ffffff', ' opacity=".5"');
    // cutting board leaning + bread loaf
    var cb = U.xf(U.catmull([[-50, 0], [-52, -150], [-30, -178], [30, -178], [52, -150], [50, 0]], 4, true), 560, top - 2, -8);
    s += S.shape(cb, P.woodL, { w: 2.8, extra: 3 });
    s += S.hatch(cb, { ang: 95, gap: 9, w: 1.1, op: 0.35 });
    s += S.circ(546, top - 156, 9, '#efe9d8', { w: 2, extra: 1.4 });
    var loaf = U.catmull([[530, top], [528, top - 30], [560, top - 54], [628, top - 56], [662, top - 30], [664, top]], 5, false);
    s += S.shape(loaf, '#c98e4d', { w: 2.8, extra: 3.2 });
    s += S.lines([[[562, top - 46], [576, top - 30]], [[596, top - 52], [610, top - 34]], [[630, top - 48], [642, top - 32]]], { w: 3, ta: 0.2, tb: 0.3 }, P.woodDD);
    s += S.hatch(loaf, { ang: 60, gap: 6, w: 1.1, op: 0.45, cond: function (X, Y) { return Y > top - 18 || X > 640; } });
    // utensil jar
    var jx = 724;
    [[-14, -150, -12], [0, -170, 0], [14, -146, 14], [6, -132, 26]].forEach(function (u, i) {
      s += S.line([[jx + u[0] * 0.3, top - 40], [jx + u[0] + Math.sin(u[2] / 57) * 40, top + u[1] + 20]], { w: 5, ta: 0.05, tb: 0.05, min: 0.8 }, i % 2 ? P.woodD : P.navyL);
    });
    s += S.circ(jx + 6, top - 156, 14, P.woodD, { w: 2, extra: 2, ry: 8 });
    s += S.box(jx - 30, top - 74, 60, 74, P.mustard, { w: 2.6, extra: 3, hatch: 'r', hk: 0.35 });
    // moka pot
    var mx = 808;
    var mk = S.poly([[mx - 22, top], [mx + 22, top], [mx + 14, top - 34], [mx + 22, top - 70], [mx - 22, top - 70], [mx - 14, top - 34]], 12, 0.6);
    s += S.shape(mk, '#a8a594', { w: 2.4, extra: 3 });
    s += S.hatch(mk, { ang: 80, gap: 5, w: 1, op: 0.5, cond: function (X) { return X > mx + 4; } });
    s += S.line([[mx + 22, top - 62], [mx + 38, top - 56], [mx + 34, top - 30]], { w: 6, ta: 0.05, tb: 0.05 });
    s += S.box(mx - 8, top - 80, 16, 10, P.ink, { w: 1, extra: 0.5, step: 10 });
    // sink: faucet + pile of dishes
    var sx = 1010;
    s += S.fillOnly(S.rect(sx - 110, top - 2, 220, 8, 40, 0.4), '#7e8a86');
    s += S.line(U.catmull([[sx + 70, top - 4], [sx + 70, top - 110], [sx + 46, top - 134], [sx + 14, top - 120], [sx + 8, top - 96]], 6, false), { w: 11, ta: 0.02, tb: 0.05, min: 0.8 }, P.ink);
    s += S.line(U.catmull([[sx + 70, top - 4], [sx + 70, top - 110], [sx + 46, top - 134], [sx + 14, top - 120], [sx + 8, top - 96]], 6, false), { w: 5, ta: 0.02, tb: 0.05, min: 0.8 }, '#b9bcb4');
    // leaning plates / pot sticking out of the sink
    [[sx - 70, -16, 46], [sx - 40, -8, 52], [sx - 4, 10, 44]].forEach(function (p, i) {
      var pl = U.xf(S.ellipse(0, 0, p[2], p[2] * 0.95, 30, 0.02), p[0], top - 26 - i * 4, p[1]);
      s += S.shape(pl, i === 1 ? '#e8dfc6' : P.white, { w: 2.2, extra: 2.4 });
      s += S.shape(U.xf(S.ellipse(0, 0, p[2] * 0.6, p[2] * 0.56, 24, 0.02), p[0], top - 26 - i * 4, p[1]), null, { w: 1.2, extra: 0.6 });
    });
    s += S.fillOnly(S.rect(sx - 112, top - 4, 224, 6, 40, 0.3), P.woodL);
    var pot = S.poly([[sx + 18, top - 4], [sx + 98, top - 4], [sx + 92, top - 48], [sx + 24, top - 48]], 14, 0.6);
    s += S.shape(pot, P.navyL, { w: 2.6, extra: 3 });
    s += S.line([[sx + 24, top - 40], [sx - 22, top - 74]], { w: 8, ta: 0.05, tb: 0.05, min: 0.8 });
    s += S.hatch(pot, { ang: 80, gap: 5, w: 1, op: 0.55, cond: function (X) { return X > sx + 70; } });
    // dish rack with plates and a mug
    var rx = 1160;
    for (var i = 0; i < 5; i++) {
      var pl2 = U.xf(S.ellipse(0, 0, 10, 48, 24, 0.02), rx + 18 + i * 20, top - 48, -6 + i * 3);
      s += S.shape(pl2, i % 2 ? P.white : '#dfe5df', { w: 2, extra: 2 });
    }
    s += S.box(rx, top - 30, 128, 28, null, { w: 2.4, extra: 2 });
    s += S.lines([[[rx + 10, top - 30], [rx + 10, top - 2]], [[rx + 40, top - 30], [rx + 40, top - 2]], [[rx + 70, top - 30], [rx + 70, top - 2]], [[rx + 100, top - 30], [rx + 100, top - 2]]], { w: 1.6, ta: 0.1, tb: 0.1 });
    s += S.mug(rx + 104, top - 24, 34, 40, P.mustard);
    // microwave with a note
    var mw = 1306;
    s += S.drop(mw, top - 104, 150, 104, 10, 8);
    s += S.box(mw, top - 104, 150, 104, '#e3dccb', { w: 3, extra: 3.5, hatch: 'r', hk: 0.2 });
    s += S.box(mw + 12, top - 92, 96, 80, '#3d4440', { w: 2.2, extra: 2 });
    s += S.hatch(S.rect(mw + 12, top - 92, 96, 80), { ang: -40, gap: 9, w: 1.2, op: 0.25, color: '#ffffff', cond: function (X, Y) { return X - mw < 60; } });
    for (var b = 0; b < 3; b++) s += S.box(mw + 120, top - 88 + b * 22, 20, 12, P.ink, { w: 1, extra: 0.5, step: 20 });
    s += S.note(mw + 80, top - 112, 76, 42, -4, P.yellow, ['DEFEKT'], { f: 'Oswald', fs: 16, top: 26, tape: true });
    return s;
  }

  function windowView(S, night) {
    return function (x, y, w, h) {
      var v = '';
      // Altbau facade opposite: stucco band, windows (lit in the evening)
      v += S.fillOnly([[x - 10, y + h * 0.28], [x + w + 10, y + h * 0.24], [x + w + 10, y + h + 10], [x - 10, y + h + 10]], night ? '#5a4c4a' : '#d6c3a0');
      v += S.fillOnly([[x - 10, y + h * 0.28], [x + w + 10, y + h * 0.24], [x + w + 10, y + h * 0.24 + 14], [x - 10, y + h * 0.28 + 14]], night ? '#2c2630' : '#9b6b4a');
      v += S.seg(x - 10, y + h * 0.28 + 16, x + w + 10, y + h * 0.24 + 16, 3, P.ink, ' opacity=".5"');
      v += S.box(x + w * 0.62, y + h * 0.06, 26, h * 0.2, night ? '#2c2630' : '#9b6b4a', { w: 1.6, extra: 1.4, step: 20 });
      for (var r = 0; r < 2; r++) for (var c = 0; c < 4; c++) {
        var wx = x + 20 + c * (w / 4), wy = y + h * 0.4 + r * h * 0.32, lit = night && ((r * 4 + c) % 3 !== 1);
        v += S.box(wx, wy, w / 4 - 44, h * 0.2, lit ? P.amber : (night ? '#252a38' : '#8fa7ae'), { w: 1.8, extra: 1.6, step: 20 });
        if (lit) v += S.glow(wx + (w / 4 - 44) / 2, wy + h * 0.1, 50, 40, P.glow, 0.35);
      }
      // roofline + moon / cloud
      if (night) { v += S.circ(x + w * 0.78, y + h * 0.12, 18, '#f3e7c0', { w: 1.6, extra: 1 }); v += S.dot(x + w * 0.2, y + h * 0.08, 2.4, '#f3e7c0') + S.dot(x + w * 0.42, y + h * 0.16, 2, '#f3e7c0') + S.dot(x + w * 0.6, y + h * 0.05, 2, '#f3e7c0'); }
      else v += S.shape(U.catmull([[x + 60, y + 70], [x + 90, y + 40], [x + 130, y + 46], [x + 160, y + 30], [x + 200, y + 56], [x + 190, y + 74]], 5, true), '#f4eedf', { w: 1.6, extra: 1 });
      return v;
    };
  }

  function windowWall(S, night) {
    var s = '', x = 770, y = 118, w = 400, h = 252;
    s += S.window(x, y, w, h, { sky: night ? S.linear([[0, '#1f2840'], [1, '#3b4a66']], 0, 0, 0, 1) : S.linear([[0, '#a9c6cf'], [1, '#d7e3d9']], 0, 0, 0, 1), night: night, panes: [2, 1], frame: P.paperL, sill: true, view: windowView(S, night)(x + 16, y + 16, w - 32, h - 32) });
    // café curtain (red/white check) on a rod across the lower half
    var cy = y + h * 0.55, cur = '';
    s += S.seg(x - 4, cy - 4, x + w + 4, cy - 3, 4, P.woodD);
    var cp = [];
    for (var i = 0; i <= 24; i++) { var t = i / 24; cp.push([x + 8 + (w - 16) * t, cy + (h - (cy - y) - 8) + Math.sin(t * Math.PI * 12) * 5]); }
    var curtain = [[x + 8, cy]].concat(cp).concat([[x + w - 8, cy]]);
    var ccid = S.clip(curtain);
    cur += S.fillOnly(curtain, P.white);
    var chk = '';
    for (var gx = x; gx < x + w; gx += 22) chk += 'M' + gx + ' ' + cy + 'h11v130h-11Z';
    for (var gy = cy; gy < y + h; gy += 22) chk += 'M' + x + ' ' + gy + 'h' + w + 'v11h-' + w + 'Z';
    cur += '<g clip-path="url(#' + ccid + ')"><path d="' + chk + '" fill="' + P.red + '" opacity=".55"/>' + S.hatch(curtain, { ang: 90, gap: 14, w: 1.2, op: 0.4 }) + '</g>';
    cur += S.shape(curtain, null, { w: 2.2, extra: 2 });
    s += cur;
    // herbs on the sill
    s += S.plant(x + 60, y + h + 8, 70, { pot: P.ochre, n: 7, leafW: 0.25 });
    s += S.plant(x + w - 70, y + h + 8, 60, { pot: P.red, n: 6, c: 1 });
    // pendant lamp just in front of the window top
    s += S.pendant(970, -10, 96, 120, P.green, { light: false });
    return s;
  }

  function shelves(S) {
    var s = '';
    s += S.shelf(390, 720, 240, P.wood);
    s += S.shelf(390, 720, 360, P.wood);
    // jars on the upper shelf
    var jars = [[420, 64, 'NUDELN', '#e9d38f'], [490, 54, 'MEHL', P.white], [552, 70, 'REIS', '#efe5cc']];
    jars.forEach(function (j) {
      var jx = j[0], jw = 54, jh = j[1];
      s += S.box(jx, 240 - jh, jw, jh, 'rgba(226,232,222,.9)', { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.25 });
      s += S.fillOnly(S.rect(jx + 4, 240 - jh * 0.75, jw - 8, jh * 0.72, 20, 0.5), j[3]);
      s += S.box(jx - 2, 240 - jh - 10, jw + 4, 12, P.woodD, { w: 1.6, extra: 1.6, step: 20 });
      s += S.T(jx + jw / 2, 240 - jh * 0.35, j[2], { f: 'Oswald', s: 11, a: 'middle', c: P.ink, ls: 1 });
    });
    s += S.books(620, 712, 240, 84, [P.red, P.mustard, P.green, P.navy]);
    // lower shelf: mugs + spice tins + cookbook
    [[410, P.red], [462, P.cream], [514, P.greenM], [566, P.navy]].forEach(function (m, i) { s += S.mug(m[0] + 18, 360, 36, 40 + (i % 2) * 4, m[1]); });
    for (var i = 0; i < 4; i++) s += S.box(612 + i * 26, 360 - 46, 22, 46, [P.mustard, P.red, P.ochre, P.greenM][i], { w: 1.6, extra: 1.6, step: 20 });
    // hanging ladle hooks under shelf
    s += S.seg(400, 376, 710, 377, 3, P.navyL);
    [[440, 70], [500, 92], [560, 60]].forEach(function (h, i) {
      s += S.line([[h[0], 378], [h[0] + 2, 378 + h[1]]], { w: 4.5, ta: 0.05, tb: 0.05, min: 0.8 }, P.navyL);
      s += S.circ(h[0] + 2, 384 + h[1], i === 1 ? 14 : 9, P.navyL, { w: 1.6, extra: 1.4, ry: i === 1 ? 9 : 6 });
    });
    return s;
  }

  function upperCabinet(S) {
    var s = '', x = 1214, y = 112, w = 250, h = 262;
    s += S.drop(x, y, w, h, 12, 12);
    s += S.box(x, y, w, h, '#a3b58b', { w: 3.4, extra: 4, hatch: 'b', hk: 0.12 });
    s += S.box(x + 12, y + 14, w / 2 - 18, h - 28, '#97ab80', { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.15, hop: 0.35 });
    s += S.box(x + w / 2 + 6, y + 14, w / 2 - 18, h - 28, '#97ab80', { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.15, hop: 0.35 });
    s += S.circ(x + w / 2 - 18, y + h - 40, 6, P.navyL, { w: 1.4, extra: 1 }) + S.circ(x + w / 2 + 18, y + h - 40, 6, P.navyL, { w: 1.4, extra: 1 });
    s += S.note(x + w * 0.72, y + 80, 96, 66, 4, P.paperL, [{ t: 'NICHT MEIN', f: 'Oswald', s: 14 }, { t: 'GESCHIRR!', f: 'Oswald', s: 16, c: P.red }], { fs: 16, top: 26, lh: 1.3, tape: true });
    return s;
  }

  function putzplan(S) {
    var s = '', x = 1536, y = 150, w = 300, h = 236;
    s += S.drop(x, y, w, h, 10, 12);
    s += S.box(x, y, w, h, P.paperL, { w: 3, extra: 3.5 });
    s += S.fillOnly(S.rect(x + 3, y + 3, w - 6, 46, 30, 0.5), P.mustard);
    s += S.T(x + w / 2, y + 38, 'PUTZPLAN', { f: 'Oswald', s: 30, a: 'middle', ls: 4 });
    var names = ['Lena', 'Tim', 'Melo', 'Jana'], c0 = x + 96, cw = (w - 106) / 4;
    var L = [];
    for (var r = 0; r <= 4; r++) L.push([[x + 8, y + 58 + r * 42], [x + w - 8, y + 58 + r * 42]]);
    for (var c = 0; c <= 4; c++) L.push([[c0 + c * cw, y + 54], [c0 + c * cw, y + h - 10]]);
    s += S.lines(L, { w: 1.5, ta: 0.05, tb: 0.05, min: 0.5 }, P.ink, ' opacity=".7"');
    names.forEach(function (n, i) {
      s += S.T(x + 16, y + 90 + i * 42, n, { f: 'Caveat', s: 28, c: n === 'Melo' ? P.green : P.ink });
      for (var c2 = 0; c2 < 4; c2++) {
        var cx = c0 + c2 * cw + cw / 2, cy = y + 80 + i * 42;
        if (n === 'Melo' && c2 >= 2) { s += S.line([[cx - 11, cy - 10], [cx + 11, cy + 10]], { w: 4, ta: 0.1, tb: 0.2 }, P.red) + S.line([[cx + 11, cy - 10], [cx - 11, cy + 10]], { w: 4, ta: 0.1, tb: 0.2 }, P.red); }
        else if ((i + c2) % 3 !== 2) s += S.line([[cx - 10, cy], [cx - 2, cy + 9], [cx + 12, cy - 11]], { w: 3.6, ta: 0.1, tb: 0.3 }, P.green);
      }
    });
    s += S.circ(x + w / 2, y + 6, 7, P.red, { w: 1.4, extra: 1 });
    return s;
  }

  function rightCorner(S) {
    var s = '';
    // doorway to the hall (dark), with a coat hook
    var dx = 1748, dy = 410;
    s += S.box(dx - 16, dy - 16, 220, YH - dy + 16, P.paperL, { w: 3, extra: 3.5 });
    s += S.fillOnly(S.rect(dx, dy, 220, YH - dy, 30, 0.6), '#4a3f33');
    s += S.hatch(S.rect(dx, dy, 220, YH - dy), { ang: 60, gap: 7, w: 1.3, op: 0.5 });
    // hall: warm light, a framed picture and a coat on a hook; door leaf swung open
    s += S.glow(dx + 150, dy + 170, 150, 220, P.amber, 0.35);
    s += S.box(dx + 120, dy + 60, 70, 56, P.ochre, { w: 2, extra: 2, step: 20 });
    s += S.seg(dx + 70, dy + 70, dx + 104, dy + 70, 4, P.woodD);
    var coat = U.catmull([[dx + 80, dy + 72], [dx + 58, dy + 110], [dx + 52, dy + 230], [dx + 70, dy + 236], [dx + 98, dy + 232], [dx + 104, dy + 110]], 5, true);
    s += S.shape(coat, '#7b4b3a', { w: 2.4, extra: 2.6 });
    s += S.hatch(coat, { ang: 80, gap: 6, w: 1.1, op: 0.5 });
    var leaf = S.poly([[dx, dy], [dx + 62, dy + 26], [dx + 62, YH - 16], [dx, YH]], 30, 0.8);
    s += S.shape(leaf, '#d8ccb0', { w: 3, extra: 3 });
    s += S.hatch(leaf, { ang: 80, gap: 8, w: 1.2, op: 0.4 });
    s += S.circ(dx + 50, dy + 200, 6, P.ink, { w: 1, extra: 0.6 });
    // waste separation: yellow bag, brown bio bin, blue paper bin
    var by = YH + 6;
    // "Gelber Sack": lumpy, tied with two ears, packaging visible through the foil
    var bag = U.catmull([[1500, by - 2], [1494, by - 50], [1508, by - 92], [1530, by - 104], [1538, by - 132], [1552, by - 112], [1566, by - 136], [1576, by - 106], [1600, by - 94], [1614, by - 52], [1608, by - 2]], 5, false);
    s += S.floorShadow(1554, by + 4, 66, 10);
    s += S.shape(bag, '#ecd36a', { w: 2.6, extra: 3 });
    var bc = S.clip(bag);
    s += '<g clip-path="url(#' + bc + ')" opacity=".55">' + S.box(1512, by - 70, 40, 52, '#e6e0cf', { w: 1.6, extra: 1, step: 20 }) + S.circ(1580, by - 40, 20, P.red, { w: 1.6, extra: 1 }) + S.box(1552, by - 86, 30, 40, P.blueL, { w: 1.6, extra: 1, step: 20 }) + '</g>';
    s += S.lines([[[1508, by - 60], [1530, by - 20]], [[1588, by - 84], [1600, by - 36]], [[1540, by - 100], [1556, by - 104], [1572, by - 98]]], { w: 1.6, ta: 0.2, tb: 0.3 }, P.ink, ' opacity=".6"');
    s += S.hatch(bag, { ang: 70, gap: 6, w: 1.1, op: 0.45, cond: function (X) { return X > 1580; } });
    [[1626, '#6b4a2f', 'BIO'], [1700, P.blue, 'PAPIER']].forEach(function (b) {
      s += S.floorShadow(b[0] + 32, by + 4, 44, 9);
      s += S.box(b[0], by - 120, 66, 120, b[1], { w: 2.6, extra: 3, hatch: 'r', hk: 0.3 });
      s += S.box(b[0] - 4, by - 132, 74, 16, b[1], { w: 2.2, extra: 2.4, step: 30 });
      s += S.T(b[0] + 33, by - 64, b[2], { f: 'Oswald', s: b[2].length > 3 ? 13 : 16, a: 'middle', c: P.white, ls: 1 });
    });
    return s;
  }

  function pfandCrate(S) {
    var s = '', x = 1780, y = YH + 70, w = 150, h = 74;
    s += S.floorShadow(x + w / 2, y + 4, w * 0.6, 12, 0.22);
    for (var i = 0; i < 5; i++) s += S.bottle(x + 18 + i * 28, y - h + 24, 86, i === 2 ? '#7a5a2e' : '#4f6d3a', { cap: P.mustard, label: i % 2 ? P.cream : P.red, wr: 0.3 });
    s += S.box(x, y - h, w, h, P.red, { w: 3, extra: 3.5, hatch: 'r', hk: 0.2 });
    s += S.box(x + 44, y - h + 14, 62, 18, P.ink, { w: 1.2, extra: 1, step: 20 });
    s += S.T(x + w / 2, y - 14, 'PFAND', { f: 'Oswald', s: 18, a: 'middle', c: P.white, ls: 3 });
    return s;
  }

  // Lichterkette: two sagging strings of warm bulbs under the ceiling
  function fairyLights(S, night) {
    var s = '';
    [[-20, 30, 780, 46, 70], [1180, 40, 1940, 26, 64]].forEach(function (sw, j) {
      var pts = [], n = 40;
      for (var i = 0; i <= n; i++) { var t = i / n; pts.push([sw[0] + (sw[2] - sw[0]) * t, sw[1] + (sw[3] - sw[1]) * t + sw[4] * 4 * t * (1 - t)]); }
      s += S.line(pts, { w: 2, ta: 0.02, tb: 0.02, min: 0.6, jit: 0.2 });
      for (var k = 2; k < n; k += 3) {
        var q = pts[k], col = [P.amber, P.yellow, '#f0a35a'][(k + j) % 3];
        if (night) s += S.glow(q[0], q[1] + 12, 26, 26, P.glow, 0.5);
        s += S.circ(q[0], q[1] + 11, 6, col, { w: 1.4, extra: 1, ry: 8 });
        s += S.seg(q[0], q[1], q[0], q[1] + 4, 2.2);
      }
    });
    return s;
  }

  // foreground: corner of the kitchen table with the phone (pizza app open) — depth + the episode's punchline prop
  function tableCorner(S) {
    var s = '';
    var top = [[-30, 930], [300, 948], [372, 1100], [-30, 1100]];
    s += S.shape(top, P.woodM, { w: 4, extra: 4 });
    s += S.lines([[[0, 960], [280, 972]], [[10, 1000], [300, 1014]], [[-10, 1046], [330, 1062]]], { w: 1.4, ta: 0.2, tb: 0.3 }, P.woodDD, ' opacity=".5"');
    s += S.hatch(top, { ang: 4, gap: 7, w: 1.1, op: 0.3 });
    // phone lying on the table, screen up (foreshortened: rotate, then squash vertically)
    function flat(pts, cx, cy) { return U.xf(pts, 0, 0, -16).map(function (q) { return [cx + q[0], cy + q[1] * 0.62]; }); }
    var cx = 168, cy = 1000;
    s += S.fillOnly(flat(S.rrect(-96, -60, 192, 120, 16), cx + 8, cy + 10), P.shadowD);
    s += S.shape(flat(S.rrect(-96, -60, 192, 120, 16), cx, cy), '#1c1c1e', { w: 2.6, extra: 2 });
    s += S.fillOnly(flat(S.rrect(-84, -50, 168, 100, 8), cx, cy), P.red);
    var app = S.T(-26, 4, 'PIZZA', { f: 'Fraunces', s: 34, a: 'middle', c: P.white }) + S.T(-26, 28, 'BELLA', { f: 'Oswald', s: 16, a: 'middle', c: P.yellow, ls: 5 }) +
      '<rect x="34" y="-14" width="42" height="42" rx="21" fill="' + P.yellow + '"/>' + S.T(55, 14, '+1', { f: 'Oswald', s: 20, a: 'middle', c: P.ink }) +
      S.T(-26, -26, '1× Margherita', { f: 'Oswald', s: 13, a: 'middle', c: P.white, ls: 1, op: 0.85 });
    s += '<g transform="translate(' + cx + ' ' + cy + ') scale(1 0.62) rotate(-16)">' + app + '</g>';
    s += S.glow(cx, cy, 150, 80, '#ffb0a0', 0.28);
    return s;
  }

  K.define('wg-kitchen', {
    seed: 21,
    variants: ['', 'day'],
    slots: {
      left: K.slot(540, 978, 1.1), center: K.slot(960, 982, 1.1), right: K.slot(1400, 978, 1.1),
      fridge: K.slot(300, 958, 1.06, { face: 1 }),          // standing by the fridge (legs behind the table corner)
      counter: K.slot(840, 905, 0.96, { face: -1 }),        // further back, at the worktop
      door: K.slot(1700, 945, 1.02, { face: -1 })           // just came in from the hall
    },
    build: function (opts) {
      var night = opts.variant !== 'day';
      return {
        bg: function (S) {
          var s = '';
          s += S.wall(-10, YH, night ? '#ddcfac' : P.paper, { top: 50, op: night ? 0.4 : 0.3 });
          s += S.stripes(0, 410, 64, P.ink, 0.07);
          s += S.floor(YH, { kind: 'tiles', vx: 960, vy: 420, gap: 150, rows: 5, fill: '#e3d8bd', fill2: '#cdbf9c', lop: 0.4 });
          s += S.skirting(YH, 14, P.paperL);
          s += fairyLights(S, night);
          s += windowWall(S, night) + shelves(S) + upperCabinet(S) + putzplan(S);
          s += counter(S) + counterProps(S) + rightCorner(S) + fridge(S) + pfandCrate(S);
          // keep the subtitle band calm: tiles fade out toward the bottom
          s += '<rect x="-10" y="860" width="1940" height="230" fill="' + S.linear([[0, '#e3d8bd', 0], [1, '#e3d8bd', 0.6]], 0, 0, 0, 1) + '"/>';
          // evening: warm light pool under the lamp + darker corners
          if (night) {
            s += S.glow(980, 600, 760, 420, P.glow, 0.22);
            s += '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.5, '#3a2a40', 0], [1, '#2a1d2c', 0.32]], { cx: '50%', cy: '45%', r: '75%' }) + '"/>';
          }
          return s;
        },
        fg: function (S) { return tableCorner(S); }
      };
    }
  });
})(typeof self !== 'undefined' ? self : this);
