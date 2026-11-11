/* Set "after-work-desk" — late night at the desk: dark room, window with the sleeping city, wall calendar with crossed-out
 * days and deadline notes, a monitor (inbox: 137 unread) as the only real light. The desk is the FOREGROUND layer:
 * keyboard, too many coffee cups, energy drink, crumpled paper, digital clock 23:47. One character sits behind it (desk).
 * Ambient: monitor flicker, blinking cursor, steam from the last coffee. Illustrator B · see engine/sets/kit-b.js
 */
(function (root) {
  'use strict';
  var K = root.SetKitB || require('./kit-b.js');
  var P = K.P, U = K.U;
  var YH = 780, WALL = '#2c3442', WALL_D = '#1f2531', SCREEN = '#cfe4ef', GLOW = '#9fd0ff';
  var MON = { x: 300, y: 430, w: 520, h: 320 };

  function room(S) {
    var s = '';
    s += S.wall(-10, YH, WALL, { top: 80, op: 0.5, hcol: '#0b0e14', side: 0.1 });
    s += S.stripes(0, YH, 90, '#0b0e14', 0.2);
    s += S.fillOnly([[-20, YH], [1940, YH], [1940, 1100], [-20, 1100]], '#232833');
    s += S.hatch([[-20, YH], [1940, YH], [1940, 1100], [-20, 1100]], { ang: 0, gap: 8, w: 1.1, op: 0.4, color: '#0b0e14' });
    s += S.skirting(YH, 12, '#3a4252');
    return s;
  }

  function nightWindow(S) {
    var x = 1430, y = 100, w = 400, h = 430;
    var view = (function () {
      var v = '';
      v += S.circ(x + w * 0.75, y + 80, 30, '#f3e7c0', { w: 1.6, extra: 1 });
      v += S.glow(x + w * 0.75, y + 80, 110, 110, '#f3e7c0', 0.25);
      for (var k = 0; k < 14; k++) v += S.dot(x + 20 + S.r() * (w - 40), y + 20 + S.r() * 140, 1.6 + S.r() * 1.2, '#f3e7c0');
      var bx = x - 10, i = 0;
      while (bx < x + w) {
        var bw = 50 + S.r() * 70, bh = 120 + S.r() * 200;
        v += S.box(bx, y + h - bh, bw, bh + 10, ['#1b2230', '#232b3a', '#1e2533'][i % 3], { w: 1.6, extra: 1.2, step: 40 });
        for (var r = 0; r < 8; r++) for (var c = 0; c < 3; c++) {
          if (S.r() < 0.72) continue;
          v += '<rect x="' + U.f1(bx + 8 + c * (bw - 16) / 3) + '" y="' + U.f1(y + h - bh + 14 + r * 22) + '" width="' + U.f1((bw - 16) / 3 - 6) + '" height="10" fill="' + P.amber + '" opacity=".85"/>';
        }
        bx += bw + 4; i++;
      }
      return v;
    })();
    var s = S.window(x, y, w, h, { sky: S.linear([[0, '#141b2b'], [1, '#2a3550']], 0, 0, 0, 1), night: true, panes: [2, 2], frame: '#4a5262', view: view, sillCol: '#4a5262' });
    // moonlight on the wall/floor
    s += '<path d="M' + x + ' ' + (y + h) + 'L' + (x + w) + ' ' + (y + h) + 'L' + (x + w - 160) + ' 1060L' + (x - 420) + ' 1060Z" fill="#9fb6d0" opacity=".05"/>';
    return s;
  }

  function wallStuff(S) {
    var s = '';
    // calendar with crossed-out days
    var cx = 960, cy = 150;
    s += S.drop(cx, cy, 250, 290, 10, 12, 'rgba(0,0,0,.35)');
    s += S.box(cx, cy, 250, 290, '#d9d2bd', { w: 3, extra: 3.5 });
    s += S.fillOnly(S.rect(cx + 4, cy + 4, 242, 50, 30, 0.5), P.red);
    s += S.T(cx + 125, cy + 40, 'NOVEMBER', { f: 'Oswald', s: 28, a: 'middle', c: P.white, ls: 3 });
    var L = [];
    for (var r = 0; r < 5; r++) for (var c = 0; c < 7; c++) {
      var gx = cx + 16 + c * 32, gy = cy + 72 + r * 40;
      if (r * 7 + c < 30) L.push([[gx, gy], [gx + 22, gy + 26]], [[gx + 22, gy], [gx, gy + 26]]);
      if (r * 7 + c === 31) s += S.shape(S.ellipse(gx + 11, gy + 13, 18, 16, 20, 0.05), null, { w: 2.6, extra: 1, color: P.red });
    }
    s += S.lines(L, { w: 1.8, ta: 0.1, tb: 0.2 }, P.ink, ' opacity=".7"');
    s += S.circ(cx + 125, cy + 10, 6, P.ink, { w: 1, extra: 0.6 });
    // deadline notes
    s += S.note(1290, 210, 120, 100, 5, P.yellow, ['DEADLINE', { t: 'MORGEN!!', c: P.red }], { fs: 22, top: 40, lh: 1.3, f: 'Caveat' });
    s += S.note(1280, 340, 110, 90, -6, '#f08a7a', ['8:00', 'Meeting'], { fs: 22, top: 38, lh: 1.2, pinCol: P.navy });
    // shelf with binders (silhouette-ish)
    s += S.shelf(60, 260, 300, '#3a4252');
    for (var b = 0; b < 5; b++) s += S.box(74 + b * 36, 300 - 120, 32, 120, ['#3c4a5c', '#5a3a3a', '#3a5040', '#4a4a5a', '#5a5040'][b], { w: 1.8, extra: 1.8, step: 30 });
    s += S.plant(210, 300, 64, { pot: '#5a5040', n: 6, wilt: true });
    return s;
  }

  // office chair behind the seated character (bg)
  function chair(S, x) {
    var back = S.rrect(x - 110, 520, 220, 300, [50, 50, 20, 20]);
    var s = S.shape(back, '#1b1f27', { w: 3, extra: 3.4 });
    s += S.hatch(back, { ang: 80, gap: 7, w: 1.2, op: 0.4, color: '#000' });
    s += S.line([[x - 90, 560], [x - 96, 760]], { w: 3, ta: 0.2, tb: 0.2 }, GLOW, ' opacity=".25"');
    return s;
  }

  function monitorScreen(S) {
    var x = MON.x, y = MON.y, w = MON.w, h = MON.h, s = '';
    var scr = [[x + 18, y + 18], [x + w - 18, y + 26], [x + w - 18, y + h - 22], [x + 18, y + h - 18]];
    s += S.fillOnly(scr, SCREEN);
    var g = '';
    // mail client: title bar, sidebar, unread rows
    g += '<rect x="' + (x + 18) + '" y="' + (y + 18) + '" width="' + (w - 36) + '" height="44" fill="#2f5d74"/>';
    g += S.T(x + 40, y + 50, 'Posteingang (137)', { f: 'Oswald', s: 24, c: P.white, ls: 1 });
    g += '<rect x="' + (x + 18) + '" y="' + (y + 62) + '" width="110" height="' + (h - 80) + '" fill="#b7cfdb"/>';
    for (var i = 0; i < 6; i++) {
      var ry = y + 84 + i * 36;
      g += '<rect x="' + (x + 144) + '" y="' + ry + '" width="' + (w - 180) + '" height="28" fill="' + (i < 4 ? '#e8f2f7' : '#d8e6ee') + '"/>';
      g += '<circle cx="' + (x + 160) + '" cy="' + (ry + 14) + '" r="6" fill="' + (i < 3 ? P.red : '#2f5d74') + '"/>';
      g += S.scribble(x + 178, ry + 14, 200 + (i * 37) % 120, 1, 10, '#2c333b', 0.6);
      if (i === 0) g += S.T(x + w - 48, ry + 21, 'DRINGEND', { f: 'Oswald', s: 14, a: 'end', c: P.red, ls: 1 });
    }
    for (var j = 0; j < 5; j++) g += S.scribble(x + 34, y + 90 + j * 30, 70, 1, 10, '#2c333b', 0.45);
    s += '<g clip-path="url(#' + S.clip(scr) + ')">' + g + '<!--amb:cursor--></g>';
    s += S.hatch(scr, { ang: -50, gap: 8, w: 1.4, op: 0.12, color: '#ffffff', cond: function (X, Y) { var u = (X - x) + (Y - y); return u > 340 && u < 420; } });
    return s;
  }

  function desk(S) {
    var s = '', x0 = 220, x1 = 1520, top = 830;
    // monitor (stands on the desk)
    var x = MON.x, y = MON.y, w = MON.w, h = MON.h;
    s += S.glow(x + w / 2, y + h / 2, 560, 420, GLOW, 0.22);
    s += S.box(x + w / 2 - 22, y + h - 10, 44, top - (y + h) + 6, '#2a2e36', { w: 2.4, extra: 2.6, step: 30 });
    s += S.box(x + w / 2 - 100, top - 18, 200, 16, '#2a2e36', { w: 2.4, extra: 2.6, step: 40 });
    var bez = [[x, y], [x + w, y + 10], [x + w, y + h - 4], [x, y + h]];
    s += S.shape(bez, '#1d2028', { w: 3.4, extra: 4 });
    s += monitorScreen(S);
    s += S.note(x + w - 10, y + 40, 70, 62, 8, P.yellow, ['!!!'], { fs: 26, top: 40, pin: false });
    s += S.note(x + 6, y + h - 30, 64, 58, -10, '#9fe08a', ['Mama', 'anrufen'], { fs: 15, top: 24, lh: 1.1, pin: false });
    // stuff behind the front edge: coffee cups, can, lamp (off), papers
    s += S.mug(940, top - 6, 54, 66, P.red, { label: 'MONTAG' , ls: 11 });
    s += S.mug(1010, top - 2, 46, 56, P.white);
    s += S.mug(1250, top - 4, 50, 60, P.mustard);
    s += '<!--amb:steam-->';
    // tipped-over mug
    var tm = U.xf(U.catmull([[-23, -30], [-22, 0], [0, 4], [22, 0], [23, -30]], 4, false), 1110, top - 10, 92);
    s += S.shape(tm, P.navyL, { w: 2.2, extra: 2.6 });
    s += S.fillOnly(S.ellipse(1060, top - 2, 46, 8, 20), '#3a1c12');
    // energy drink can
    s += S.box(860, top - 92, 40, 86, '#4f7a37', { w: 2.2, extra: 2.6, hatch: 'r', hk: 0.3 });
    s += S.T(880, top - 44, 'ZZZ', { f: 'Anton', s: 16, a: 'middle', c: P.yellow, r: -90 });
    // desk lamp (off)
    s += S.line([[1380, top - 10], [1404, top - 180], [1330, top - 236]], { w: 7, ta: 0.02, tb: 0.02, min: 0.8 }, '#4a4f5a');
    s += S.shape(U.xf(S.poly([[-40, 0], [40, 0], [22, -50], [-22, -50]], 12, 0.6), 1316, top - 214, -128), '#4a4f5a', { w: 2.4, extra: 2.6 });
    s += S.box(1350, top - 22, 64, 16, '#4a4f5a', { w: 2, extra: 2, step: 20 });
    // paper stack
    for (var p = 0; p < 5; p++) s += S.box(1440 - p * 3, top - 14 - p * 8, 120, 9, p % 2 ? P.white : '#e6e0cf', { w: 1.4, extra: 1.2, step: 30 });
    // desk top surface
    var tp = [[x0 - 16, top - 20], [x1 + 16, top - 20], [x1 + 30, top + 8], [x0 - 30, top + 8]];
    s += S.shape(tp, '#4e3a2c', { w: 3, extra: 3 });
    s += S.hatch(tp, { ang: 2, gap: 6, w: 1, op: 0.4 });
    // keyboard + mouse + phone + crumpled paper + clock (flat on the top)
    var kb = [[480, top - 16], [780, top - 16], [796, top + 4], [466, top + 4]];
    s += S.shape(kb, '#2a2e36', { w: 2, extra: 2 });
    var KL = [];
    for (var kx = 482; kx < 790; kx += 16) KL.push([[kx, top - 12], [kx + 2, top]]);
    s += S.lines(KL, { w: 1.2, ta: 0.1, tb: 0.1 }, GLOW, ' opacity=".35"');
    s += S.shape(S.ellipse(840, top - 6, 18, 9, 16), '#2a2e36', { w: 1.6, extra: 1.4 });
    [[640, top - 30, 22], [1180, top - 26, 20], [1500, top - 24, 18]].forEach(function (b) {
      var pts = [];
      for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2, rr = b[2] * (0.8 + S.r() * 0.35); pts.push([b[0] + rr * Math.cos(a), b[1] + rr * Math.sin(a)]); }
      s += S.shape(pts, '#e6e0cf', { w: 2, extra: 2.2 }) + S.lines([[[b[0] - 8, b[1] - 4], [b[0] + 2, b[1] + 3], [b[0] + 8, b[1] - 6]]], { w: 1.4, ta: 0.2, tb: 0.3 });
    });
    // digital clock 23:47
    s += S.box(260, top - 64, 150, 56, '#1d2028', { w: 2.4, extra: 2.6 });
    s += S.T(335, top - 22, '23:47', { f: 'Anton', s: 38, a: 'middle', c: '#f08a5a', ls: 2 });
    s += S.glow(335, top - 36, 110, 40, '#f08a5a', 0.25);
    // front panel
    var fr = [[x0 - 30, top + 8], [x1 + 30, top + 8], [x1 + 18, 1010], [x0 - 18, 1010]];
    s += S.shape(fr, '#3a2c22', { w: 3.4, extra: 3.6 });
    s += S.box(x0 + 30, top + 40, 380, 120, '#463428', { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.15, hop: 0.4 });
    s += S.box(x0 + 30, top + 40, 380, 50, '#463428', { w: 1.6, extra: 1.4, step: 40 });
    s += S.circ(x0 + 220, top + 66, 7, '#8a7a62', { w: 1.2, extra: 1 });
    s += S.hatch(fr, { ang: 2, gap: 9, w: 1.1, op: 0.3, color: '#000' });
    // crumpled balls on the floor + bin
    s += S.box(1600, 900, 110, 120, '#3a4252', { w: 2.6, extra: 3, hatch: 'r', hk: 0.3 });
    [[1630, 892, 26], [1680, 886, 24], [1760, 1010, 22]].forEach(function (b) { s += S.circ(b[0], b[1], b[2], '#d6d0be', { w: 2, extra: 2 }); });
    return s;
  }

  K.define('after-work-desk', {
    seed: 83,
    ambient: true,
    slots: {
      desk: K.slot(1080, 992, 1.02, { face: -1, seated: true, seatY: 878 }),   // behind the desk, turned to the monitor
      left: K.slot(140, 1000, 1.06, { face: 1 }),
      center: K.slot(1080, 992, 1.02, { face: -1 }),                            // standing behind the desk
      right: K.slot(1760, 1000, 1.06, { face: -1 }),
      screen: { x: MON.x + 144, y: MON.y + 76, w: MON.w - 180, h: MON.h - 110 } // text area on the monitor (not a character slot)
    },
    build: function () {
      return {
        bg: function (S) {
          return room(S) + nightWindow(S) + wallStuff(S) + chair(S, 1080) +
            S.glow(MON.x + MON.w / 2, 650, 900, 520, GLOW, 0.16) +
            '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.4, '#06080d', 0], [1, '#06080d', 0.55]], { cx: '40%', cy: '55%', r: '75%' }) + '"/>';
        },
        fg: function (S) { return desk(S) + '<!--amb:flicker-->'; },
        amb: {
          cursor: function (t) {
            return (Math.floor((t || 0) * 2) % 2) ? '' : '<rect x="' + (MON.x + 392) + '" y="' + (MON.y + 32) + '" width="4" height="24" fill="#ffffff"/>';
          },
          flicker: function (t) {
            var f = 0.035 + 0.025 * Math.max(0, Math.sin((t || 0) * 23) * Math.sin((t || 0) * 7.3));
            return '<rect x="' + (MON.x + 18) + '" y="' + (MON.y + 18) + '" width="' + (MON.w - 36) + '" height="' + (MON.h - 36) + '" fill="#ffffff" opacity="' + f.toFixed(3) + '"/>';
          },
          steam: function (t, o, S) { return S.steam(1252, 830 - 70, 70, t, 0.35); }
        }
      };
    }
  });
})(typeof self !== 'undefined' ? self : this);
