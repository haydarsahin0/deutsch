/* Set "laptop-email" — close-up of a laptop on a desk with a large email window (new message). The engine writes the
 * email into the exported rects: slots.screen / Sets.laptopText = body text area; slots.subject, slots.to, slots.from =
 * header field areas (left-aligned, baseline ≈ y + h*0.72). The background room is drawn soft/low-contrast (depth of
 * field) so the screen reads at phone size. Side slots let a character stand next to the laptop (cut at the frame).
 * Variants: '' (day) · 'night' (dark room, screen glow). Illustrator B · see engine/sets/kit-b.js
 */
(function (root) {
  'use strict';
  var K = root.SetKitB || require('./kit-b.js');
  var P = K.P, U = K.U;
  var SX = 400, SY = 58, SW = 1120, SH = 650;          // screen glass
  var WIN = { x: SX + 40, y: SY + 36, w: SW - 80, h: SH - 66 }; // mail window
  var HDR = { y: WIN.y + 64, row: 58 };                  // header rows: An, Betreff (From is in the title)
  var BODY = { x: WIN.x + 40, y: HDR.y + HDR.row * 2 + 26, w: WIN.w - 80, h: WIN.h - (HDR.y - WIN.y) - HDR.row * 2 - 110 };

  function room(S, night) {
    var s = '';
    s += S.fillOnly([[-20, -20], [1940, -20], [1940, 1100], [-20, 1100]], night ? '#283040' : '#d8cdb0');
    // soft, out-of-focus shapes: window, shelf, lamp, plant (no hatching, low contrast)
    var soft = night ? 0.35 : 0.45;
    s += '<g opacity="' + soft + '">';
    s += '<rect x="60" y="40" width="300" height="420" rx="18" fill="' + (night ? '#3c4a66' : '#eef0e2') + '"/>';
    s += '<rect x="1600" y="160" width="320" height="22" rx="8" fill="' + (night ? '#3a3020' : '#a07650') + '"/>';
    [1620, 1660, 1700, 1745, 1790, 1830].forEach(function (x, i) { s += '<rect x="' + x + '" y="' + (70 + (i % 3) * 8) + '" width="34" height="' + (90 - (i % 3) * 8) + '" rx="4" fill="' + [P.red, P.green, P.mustard, P.navy, P.teal, P.cream][i] + '"/>'; });
    s += '<circle cx="1740" cy="420" r="120" fill="' + (night ? '#f2c46a' : '#f4eedf') + '"' + (night ? ' opacity=".7"' : '') + '/>';
    s += '</g>';
    if (night) s += S.glow(1740, 420, 260, 260, P.glow, 0.25);
    // desk surface
    var desk = [[-20, 760], [1940, 760], [1940, 1100], [-20, 1100]];
    s += S.fillOnly(desk, night ? '#5a4030' : '#b98a52');
    s += S.line([[-20, 760], [1940, 760]], { w: 3, ta: 0.02, tb: 0.02, min: 0.6 });
    var G = [];
    for (var i = 0; i < 12; i++) { var y = 780 + i * 26 + S.r() * 8; G.push([[-20, y], [600 + S.r() * 400, y + 2]], [[1100 + S.r() * 300, y + 6], [1940, y + 4]]); }
    s += S.lines(G, { w: 1.4, ta: 0.2, tb: 0.3 }, P.woodDD, ' opacity=".35"');
    return s;
  }

  function laptop(S, night) {
    var s = '';
    // soft shadow + screen glow on the desk
    s += '<ellipse cx="960" cy="905" rx="760" ry="70" fill="rgba(23,19,15,.35)"/>';
    s += S.glow(960, 820, 700, 160, night ? '#9fd0ff' : '#ffffff', night ? 0.35 : 0.15);
    // lid / bezel
    var lid = S.rrect(SX - 34, SY - 34, SW + 68, SH + 70, [26, 26, 8, 8]);
    s += S.shape(lid, '#2a2e36', { w: 4, extra: 4.5 });
    s += S.circ(960, SY - 17, 5, '#555a64', { w: 1, extra: 0.6 });
    var glass = S.rect(SX, SY, SW, SH, 60, 0.4);
    s += S.fillOnly(glass, night ? '#3a5a6e' : '#7fa3b4');
    // desktop wallpaper hint (watermelon slice!) under the window
    s += S.seed(SX + SW - 70, SY + SH - 40, 40, -60, '#c9e0e8');
    // mail window
    s += '<rect x="' + (WIN.x + 10) + '" y="' + (WIN.y + 14) + '" width="' + WIN.w + '" height="' + WIN.h + '" rx="10" fill="rgba(0,0,0,.25)"/>';
    s += S.shape(S.rrect(WIN.x, WIN.y, WIN.w, WIN.h, 10), '#fbf8ef', { w: 2.4, extra: 2 });
    s += '<path d="M' + (WIN.x + 10) + ' ' + WIN.y + 'H' + (WIN.x + WIN.w - 10) + 'Q' + (WIN.x + WIN.w) + ' ' + WIN.y + ' ' + (WIN.x + WIN.w) + ' ' + (WIN.y + 10) + 'V' + (WIN.y + 48) + 'H' + WIN.x + 'V' + (WIN.y + 10) + 'Q' + WIN.x + ' ' + WIN.y + ' ' + (WIN.x + 10) + ' ' + WIN.y + 'Z" fill="#2f5d74"/>';
    [[P.red, 0], [P.mustard, 1], [P.greenM, 2]].forEach(function (d) { s += '<circle cx="' + (WIN.x + 28 + d[1] * 26) + '" cy="' + (WIN.y + 24) + '" r="8" fill="' + d[0] + '"/>'; });
    s += S.T(WIN.x + WIN.w / 2, WIN.y + 34, 'Neue E-Mail', { f: 'Oswald', s: 24, a: 'middle', c: P.white, ls: 2 });
    // header rows
    [['An:', 0], ['Betreff:', 1]].forEach(function (r) {
      var y = HDR.y + r[1] * HDR.row;
      s += S.T(WIN.x + 40, y + 38, r[0], { f: 'Oswald', s: 26, c: '#6b7a80', ls: 1 });
      s += S.seg(WIN.x + 30, y + HDR.row, WIN.x + WIN.w - 30, y + HDR.row, 1.6, '#c9c2ae');
    });
    // toolbar + send button
    var by = WIN.y + WIN.h - 70;
    s += S.seg(WIN.x + 30, by - 10, WIN.x + WIN.w - 30, by - 10, 1.4, '#c9c2ae');
    s += '<rect x="' + (WIN.x + 40) + '" y="' + by + '" width="150" height="48" rx="24" fill="#2f5d74"/>';
    s += S.T(WIN.x + 115, by + 33, 'Senden', { f: 'Oswald', s: 24, a: 'middle', c: P.white, ls: 1 });
    ['B', 'I', 'U'].forEach(function (c, i) { s += S.T(WIN.x + 240 + i * 44, by + 34, c, { f: 'Fraunces', s: 26, a: 'middle', c: '#6b7a80' }); });
    s += S.line(U.catmull([[WIN.x + 400, by + 34], [WIN.x + 392, by + 14], [WIN.x + 404, by + 6], [WIN.x + 412, by + 18], [WIN.x + 398, by + 40]], 4, false), { w: 3, ta: 0.1, tb: 0.1 }, '#6b7a80');
    s += '<rect x="' + (WIN.x + WIN.w - 90) + '" y="' + (by + 8) + '" width="40" height="32" rx="4" fill="none" stroke="#6b7a80" stroke-width="3"/>';
    // glass reflection
    s += S.hatch(glass, { ang: -48, gap: 9, w: 1.6, op: night ? 0.06 : 0.1, color: '#ffffff', cond: function (X, Y) { var u = (X - SX) + (Y - SY) * 0.9; return u > 900 && u < 1040; } });
    // keyboard deck (strongly foreshortened) + hinge
    s += S.box(SX - 40, SY + SH + 32, SW + 80, 14, '#3a3f48', { w: 2.4, extra: 2.6, step: 60 });
    var deck = [[SX - 60, SY + SH + 46], [SX + SW + 60, SY + SH + 46], [SX + SW + 170, 880], [SX - 170, 880]];
    s += S.shape(deck, '#b9bcb4', { w: 3.4, extra: 4 });
    var keys = '';
    for (var r = 0; r < 4; r++) {
      var y0 = SY + SH + 58 + r * 26, y1 = y0 + 18, t0 = (y0 - (SY + SH + 46)) / (880 - (SY + SH + 46)), t1 = (y1 - (SY + SH + 46)) / (880 - (SY + SH + 46));
      var xl0 = SX - 30 - 110 * t0, xr0 = SX + SW + 30 + 110 * t0, xl1 = SX - 30 - 110 * t1, xr1 = SX + SW + 30 + 110 * t1, n = 14;
      for (var k = 0; k < n; k++) {
        var a = k / n, b = (k + 0.86) / n;
        keys += 'M' + U.f1(xl0 + (xr0 - xl0) * a) + ' ' + y0 + 'L' + U.f1(xl0 + (xr0 - xl0) * b) + ' ' + y0 + 'L' + U.f1(xl1 + (xr1 - xl1) * b) + ' ' + y1 + 'L' + U.f1(xl1 + (xr1 - xl1) * a) + ' ' + y1 + 'Z';
      }
    }
    s += '<path d="' + keys + '" fill="#2a2e36"/>';
    s += S.shape([[860, 850], [1060, 850], [1066, 872], [854, 872]], '#a8aba4', { w: 1.6, extra: 1.4 });
    // desk props: mug, sticky note on bezel, pen, plant
    s += S.mug(1720, 900, 110, 128, P.red, { label: 'DOCH!', ls: 26 });
    s += S.note(SX - 4, SY + 120, 120, 100, -8, P.yellow, ['Bewerbung', { t: 'abschicken!', c: P.red }], { fs: 20, top: 40, lh: 1.2, pin: false, tape: true });
    s += S.line([[220, 980], [420, 940]], { w: 9, ta: 0.05, tb: 0.5, min: 0.5 }, P.navy);
    s += S.plant(170, 880, 150, { pot: P.ochre, n: 9 });
    return s;
  }

  var SLOTS = {
    'side-left': K.slot(170, 1150, 1.05, { face: 1 }),
    'side-right': K.slot(1760, 1150, 1.05, { face: -1 }),
    left: K.slot(170, 1150, 1.05, { face: 1 }), center: K.slot(1760, 1150, 1.05, { face: -1 }), right: K.slot(1760, 1150, 1.05, { face: -1 }),
    screen: { x: BODY.x, y: BODY.y, w: BODY.w, h: BODY.h },                 // email body text area
    to: { x: WIN.x + 150, y: HDR.y, w: WIN.w - 190, h: HDR.row },
    subject: { x: WIN.x + 150, y: HDR.y + HDR.row, w: WIN.w - 190, h: HDR.row }
  };
  var Sets = root.Sets || (typeof module === 'object' && module.exports ? require('./sets.js') : null);
  if (Sets) Sets.laptopText = SLOTS.screen;

  K.define('laptop-email', {
    seed: 163,
    variants: ['', 'night'],
    slots: SLOTS,
    build: function (opts) {
      var night = opts.variant === 'night';
      return {
        bg: function (S) {
          return room(S, night) + laptop(S, night) +
            '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.55, '#2a2018', 0], [1, '#2a2018', night ? 0.5 : 0.28]], { cx: '50%', cy: '45%', r: '75%' }) + '"/>';
        }
      };
    }
  });
})(typeof self !== 'undefined' ? self : this);
