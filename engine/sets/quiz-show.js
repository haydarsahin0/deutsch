/* Set "quiz-show" — retro TV game-show studio: sunburst back wall, big screen framed by marquee bulbs, light truss with
 * spotlight cones, glossy stage with a round host platform. The two contestant podiums (buzzers, score displays) are the
 * FOREGROUND layer, so characters in podium-left / podium-right appear waist-up behind them; the host stands free.
 * slots.screen = {x, y, w, h} text area on the big screen (for the engine's quiz text).
 * Ambient: marquee bulbs chase slowly. Illustrator B · see engine/sets/kit-b.js
 */
(function (root) {
  'use strict';
  var K = root.SetKitB || require('./kit-b.js');
  var P = K.P, U = K.U;
  var YF = 700;                                   // wall/stage junction
  var SCR = { x: 640, y: 96, w: 640, h: 340 };    // screen bezel
  var NAVY = '#262838', PLUM = '#3d3350', PLUM_L = '#4a3f60', STAGE = '#2a2433', BULB = '#f2d27a', BULB_OFF = '#8a7a52';

  // bulb positions around the screen (computed once)
  var BULBS = (function () {
    var b = [], x0 = SCR.x - 26, y0 = SCR.y - 26, x1 = SCR.x + SCR.w + 26, y1 = SCR.y + SCR.h + 26, step = 38;
    for (var x = x0; x <= x1; x += step) b.push([x, y0]);
    for (var y = y0 + step; y <= y1; y += step) b.push([x1, y]);
    for (x = x1 - step; x >= x0; x -= step) b.push([x, y1]);
    for (y = y1 - step; y > y0; y -= step) b.push([x0, y]);
    return b;
  })();

  function backWall(S) {
    var s = '';
    s += S.fillOnly([[-20, -20], [1940, -20], [1940, YF], [-20, YF]], NAVY);
    // sunburst rays from the screen centre
    var cx = 960, cy = 270, n = 28, rays = '';
    for (var i = 0; i < n; i++) {
      if (i % 2) continue;
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, R = 1500;
      rays += 'M' + cx + ' ' + cy + 'L' + U.f1(cx + R * Math.cos(a0)) + ' ' + U.f1(cy + R * Math.sin(a0)) + 'L' + U.f1(cx + R * Math.cos(a1)) + ' ' + U.f1(cy + R * Math.sin(a1)) + 'Z';
    }
    s += '<path d="' + rays + '" fill="' + PLUM + '"/>';
    s += '<rect x="0" y="0" width="1920" height="' + YF + '" fill="' + S.radial([[0, '#c43d33', 0.35], [0.5, '#7d3a4a', 0.15], [1, NAVY, 0]], { cx: '50%', cy: '38%', r: '60%' }) + '"/>';
    s += S.hatch([[-20, -20], [1940, -20], [1940, YF], [-20, YF]], { ang: 28, gap: 10, w: 1.3, op: 0.35, color: '#0d0b14', cond: function (X, Y) { var e = Math.min(X, 1920 - X); return e < 260 || Y > YF - 120; } });
    // arch frame (stage portal) left and right
    [[0, 1], [1920, -1]].forEach(function (c) {
      var x = c[0], d = c[1], col = [[x, -20], [x + 210 * d, -20], [x + 210 * d, YF], [x, YF]];
      s += S.shape(col, '#1d1c28', { w: 3, extra: 3 });
      for (var k = 0; k < 6; k++) {
        var yy = 60 + k * 104, bx = x + 105 * d;
        s += S.box(bx - 46, yy, 92, 74, k % 2 ? P.red : P.mustard, { w: 2.4, extra: 2.6, hatch: d > 0 ? 'r' : 'l', hk: 0.3 });
        s += S.T(bx, yy + 52, ['?', '!', 'A', 'B', 'C', '?'][k], { f: 'Fraunces', s: 46, a: 'middle', c: k % 2 ? P.white : P.ink });
      }
      s += S.hatch(col, { ang: 70, gap: 7, w: 1.1, op: 0.5, color: '#000' });
    });
    return s;
  }

  function screen(S) {
    var s = '', x = SCR.x, y = SCR.y, w = SCR.w, h = SCR.h;
    s += S.drop(x - 40, y - 40, w + 80, h + 80, 16, 18, 'rgba(0,0,0,.4)');
    s += S.box(x - 44, y - 44, w + 88, h + 88, '#c9a24a', { w: 3.6, extra: 4 });
    s += S.box(x - 30, y - 30, w + 60, h + 60, '#1d1c28', { w: 2.4, extra: 2 });
    var glass = S.rect(x, y, w, h, 40, 0.5);
    s += S.fillOnly(glass, S.linear([[0, '#2f5d74'], [1, '#1d3346']], 0, 0, 0, 1));
    // faint scanlines + logo watermark (engine text goes on top)
    var sc = '';
    for (var yy = y + 6; yy < y + h; yy += 8) sc += 'M' + x + ' ' + yy + 'h' + w;
    s += '<path d="' + sc + '" stroke="#000" stroke-width="2" opacity=".18"/>';
    s += S.T(x + w / 2, y + h * 0.5 + 12, 'DEUTSCH-QUIZ', { f: 'Fraunces', s: 58, a: 'middle', c: '#5c8aa0', op: 0.45 });
    s += S.T(x + w / 2, y + h * 0.5 + 56, 'B1 · B2 · C1', { f: 'Oswald', s: 22, a: 'middle', c: '#5c8aa0', op: 0.45, ls: 6 });
    s += S.hatch(glass, { ang: -50, gap: 9, w: 1.4, op: 0.12, color: '#ffffff', cond: function (X, Y) { var u = (X - x) + (Y - y); return u > 60 && u < 170; } });
    s += S.shape(glass, null, { w: 2.6, extra: 2.4, dir: [-0.55, -0.83] });
    // bulbs (unlit sockets; lit ones are ambient)
    BULBS.forEach(function (b) { s += S.circ(b[0], b[1], 9, BULB_OFF, { w: 1.6, extra: 1.2 }); });
    s += '<!--amb:bulbs-->';
    return s;
  }

  function truss(S) {
    var s = '';
    s += S.box(-20, 0, 1960, 30, '#4a4a52', { w: 2.6, extra: 2.6, step: 60 });
    var L = [];
    for (var x = 0; x < 1920; x += 40) L.push([[x, 2], [x + 40, 28]]);
    s += S.lines(L, { w: 1.8, ta: 0.05, tb: 0.05 }, '#1a1a20');
    return s;
  }
  // spotlight fixture on the truss aimed at (tx, ty); cone drawn separately
  function spot(S, x, tx, ty) {
    var a = Math.atan2(ty - 40, tx - x) * 180 / Math.PI - 90, s = '';
    var body = U.xf(S.poly([[-24, -10], [24, -10], [30, 46], [-30, 46]], 12, 0.6), x, 38, a);
    s += S.seg(x, 26, x, 40, 6, '#1a1a20');
    s += S.shape(body, '#2c2c34', { w: 2.4, extra: 2.4 });
    var lens = U.xf([[0, 46]], x, 38, a)[0];
    s += S.circ(lens[0], lens[1], 16, '#fff1c4', { w: 2, extra: 1.6 });
    return s;
  }
  function cone(S, x, tx, ty, spread, op, col) {
    var dx = tx - x, dy = ty - 60, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    var g = S.linear([[0, col || '#fff1c4', op], [1, col || '#fff1c4', op * 0.15]], x, 60, tx, ty, true);
    return '<path d="M' + U.f1(x - nx * 14) + ' 60L' + U.f1(x + nx * 14) + ' 60L' + U.f1(tx + nx * spread) + ' ' + U.f1(ty + ny * spread * 0.2) + 'L' + U.f1(tx - nx * spread) + ' ' + U.f1(ty - ny * spread * 0.2) + 'Z" fill="' + g + '"/>' +
      '<ellipse cx="' + U.f1(tx) + '" cy="' + U.f1(ty) + '" rx="' + spread + '" ry="' + U.f1(spread * 0.22) + '" fill="' + (col || '#fff1c4') + '" opacity="' + (op * 0.9) + '"/>';
  }

  function stage(S) {
    var s = '';
    var fl = [[-20, YF], [1940, YF], [1940, 1100], [-20, 1100]];
    s += S.fillOnly(fl, STAGE);
    s += S.line([[-20, YF], [1940, YF + 1]], { w: 4, ta: 0.02, tb: 0.02, min: 0.6 });
    // glossy floor: perspective seams + reflection of the screen
    var L = [];
    for (var bx = -2400; bx < 4400; bx += 180) L.push([[960 + (bx - 960) * 0.3, YF + 2], [bx, 1100]]);
    s += S.lines(L, { w: 1.6, ta: 0.05, tb: 0.05, min: 0.5 }, '#0e0c14', ' opacity=".7"');
    s += '<rect x="' + (SCR.x - 30) + '" y="' + (YF + 6) + '" width="' + (SCR.w + 60) + '" height="150" fill="' + S.linear([[0, '#3d6f86', 0.35], [1, '#3d6f86', 0]], 0, 0, 0, 1) + '"/>';
    s += S.hatch(fl, { ang: 0, gap: 8, w: 1.1, op: 0.3, color: '#000', cond: function (X, Y) { return Y < YF + 60 || Y > 990; } });
    // round host platform with a bulb rim
    var cx = 960, cy = 930, rx = 300, ry = 62;
    s += '<ellipse cx="' + cx + '" cy="' + (cy + 22) + '" rx="' + (rx + 12) + '" ry="' + (ry + 8) + '" fill="rgba(0,0,0,.45)"/>';
    var side = S.ellipse(cx, cy + 16, rx, ry, 72, 0.003).filter(function (p) { return p[1] > cy + 16 - 1; });
    var band = [[cx - rx, cy], [cx - rx, cy + 16]].concat(side.sort(function (a, b) { return a[0] - b[0]; })).concat([[cx + rx, cy + 16], [cx + rx, cy]]);
    s += S.shape(band, P.red, { w: 2.6, extra: 2.6 });
    s += S.shape(S.ellipse(cx, cy, rx, ry, 72, 0.003), '#3b3048', { w: 3, extra: 2.6 });
    s += S.shape(S.ellipse(cx, cy, rx * 0.8, ry * 0.8, 60, 0.003), null, { w: 1.6, extra: 0.6, color: '#c9a24a' });
    for (var i = 0; i < 26; i++) { var a = i / 26 * Math.PI; s += S.dot(cx + rx * 0.98 * Math.cos(a), cy + 8 + ry * Math.sin(a), 4, BULB); }
    return s;
  }

  function podium(S, x, num, name, col) {
    var s = '', top = 818, bot = 1004, w = 320;
    var body = S.poly([[x - w / 2, top], [x + w / 2, top], [x + w / 2 - 24, bot], [x - w / 2 + 24, bot]], 30, 1);
    s += '<ellipse cx="' + x + '" cy="' + (bot + 6) + '" rx="' + (w * 0.55) + '" ry="18" fill="rgba(0,0,0,.45)"/>';
    s += S.shape(body, P.cream, { w: 3.6, extra: 4 });
    var cid = S.clip(body);
    s += '<g clip-path="url(#' + cid + ')">' +
      '<path d="M' + (x - w) + ' ' + (top + 94) + 'L' + (x + w) + ' ' + (top + 94) + 'L' + (x + w) + ' ' + (top + 116) + 'L' + (x - w) + ' ' + (top + 116) + 'Z" fill="' + col + '"/>' +
      '<path d="M' + (x - w) + ' ' + (top + 124) + 'L' + (x + w) + ' ' + (top + 124) + 'L' + (x + w) + ' ' + (top + 132) + 'L' + (x - w) + ' ' + (top + 132) + 'Z" fill="' + P.mustard + '"/>' +
      S.hatch(body, { ang: 80, gap: 7, w: 1.2, op: 0.4, cond: function (X) { return X > x + w * 0.3; } }) + '</g>';
    // top slab
    s += S.box(x - w / 2 - 14, top - 18, w + 28, 24, '#c9a24a', { w: 3, extra: 3.5, hatch: 'b', hk: 0.4 });
    // score display
    s += S.box(x - 74, top + 16, 148, 66, '#1d1c28', { w: 2.6, extra: 2.6 });
    s += S.T(x, top + 70, num, { f: 'Anton', s: 50, a: 'middle', c: '#f08a5a' });
    s += S.T(x, top + 170, name, { f: 'Oswald', s: 26, a: 'middle', c: P.ink, ls: 4 });
    // buzzer
    var bx = x + (x < 960 ? 104 : -104);
    s += S.box(bx - 34, top - 40, 68, 24, '#2c2c34', { w: 2.4, extra: 2.4, step: 30 });
    var dome = U.catmull([[bx - 30, top - 40], [bx - 26, top - 64], [bx, top - 74], [bx + 26, top - 64], [bx + 30, top - 40]], 5, false);
    s += S.shape(dome, P.red, { w: 2.6, extra: 3 });
    s += S.line([[bx - 14, top - 62], [bx - 4, top - 68]], { w: 4, ta: 0.3, tb: 0.3 }, '#ffffff', ' opacity=".7"');
    return s;
  }

  K.define('quiz-show', {
    seed: 47,
    ambient: true,
    slots: {
      host: K.slot(960, 936, 1.0, { face: 1 }),
      'podium-left': K.slot(330, 1004, 1.05, { face: 1, behind: 'podium' }),
      'podium-right': K.slot(1590, 1004, 1.05, { face: -1, behind: 'podium' }),
      left: K.slot(330, 1004, 1.05, { face: 1, behind: 'podium' }), center: K.slot(960, 936, 1.0), right: K.slot(1590, 1004, 1.05, { face: -1, behind: 'podium' }),
      screen: { x: SCR.x + 30, y: SCR.y + 24, w: SCR.w - 60, h: SCR.h - 48 }   // text area on the big screen (not a character slot)
    },
    build: function () {
      return {
        bg: function (S) {
          var s = backWall(S) + screen(S) + stage(S);
          s += cone(S, 470, 960, 930, 230, 0.16) + cone(S, 1450, 960, 930, 230, 0.12);
          s += cone(S, 180, 330, 990, 170, 0.14, '#ffd9a0') + cone(S, 1740, 1590, 990, 170, 0.14, '#ffd9a0');
          s += truss(S) + spot(S, 470, 960, 930) + spot(S, 1450, 960, 930) + spot(S, 180, 330, 990) + spot(S, 1740, 1590, 990) + spot(S, 960, 960, 400);
          s += '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.5, '#000', 0], [1, '#000', 0.45]], { cx: '50%', cy: '45%', r: '75%' }) + '"/>';
          return s;
        },
        fg: function (S) { return podium(S, 330, '120', 'KANDIDAT 1', P.red) + podium(S, 1590, '95', 'KANDIDAT 2', P.green); },
        amb: {
          // marquee chase: every 3rd bulb lit, pattern steps 4×/s
          bulbs: function (t, opts, S) {
            var s = '', ph = Math.floor((t || 0) * 4) % 3;
            BULBS.forEach(function (b, i) {
              if ((i + ph) % 3 === 0) return;
              s += '<circle cx="' + U.f1(b[0]) + '" cy="' + U.f1(b[1]) + '" r="16" fill="' + BULB + '" opacity=".28"/><circle cx="' + U.f1(b[0]) + '" cy="' + U.f1(b[1]) + '" r="7.5" fill="' + BULB + '"/>';
            });
            return s;
          }
        }
      };
    }
  });
})(typeof self !== 'undefined' ? self : this);
