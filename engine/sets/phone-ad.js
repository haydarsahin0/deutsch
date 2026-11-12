/* phone-ad — close-up of a hand-held smartphone (landscape) filling most of the frame, showing a flat-listing app
 * „Wohnungsanzeige": status bar, header with back arrow + heart, photo placeholder (ink sketch of an Altbau facade,
 * „1/12"), title + price lines (Kaltmiete / Nebenkosten / Kaution), and an empty description area that the engine
 * fills: slots.screen = {x, y, w, h} (also Sets.phoneAdText). Background: warm café bokeh, out of focus.
 * Melo's green hand grips the right edge (navy sleeve). Small Melo goes in `corner-left`. Static. (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var PH = { x: 330, y: 70, w: 1400, h: 790 };           // phone body
  var SC = { x: PH.x + 46, y: PH.y + 40, w: PH.w - 92, h: PH.h - 80 };   // glass
  var TXT = { x: SC.x + 640, y: SC.y + 300, w: SC.w - 640 - 36, h: SC.h - 300 - 28 };   // ad description (engine text)

  function build(S) {
    var bg = '', i;
    // ── bokeh background (out-of-focus café) ──
    bg += S.fillOnly(S.rect(-20, -20, 1960, 1120), S.linear([[0, '#3b3a35'], [0.6, '#5a4a3a'], [1, '#2e2a26']], 0, 0, 0, 1));
    var cols = ['#e9b85c', '#8fb3a6', '#d98a5a', '#f2d49a', '#6f9a49'];
    for (i = 0; i < 34; i++) {
      var bx = S.r() * 1920, by = S.r() * 1080, br = 30 + S.r() * 90, c = cols[i % cols.length];
      bg += '<circle cx="' + U.f1(bx) + '" cy="' + U.f1(by) + '" r="' + U.f1(br) + '" fill="' + c + '" opacity="' + U.f1(0.08 + S.r() * 0.18) + '"/>';
    }
    bg += S.glow(300, 260, 520, 380, '#ffd98a', 0.25) + S.glow(1700, 900, 600, 300, '#8fb3a6', 0.15);
    bg += S.hatch(S.rect(-20, -20, 1960, 1120), { ang: 28, gap: 14, w: 1.2, op: 0.08, color: '#e9dfc4' });
    // phone shadow
    bg += S.fillOnly(S.rrect(PH.x + 26, PH.y + 34, PH.w, PH.h, 70), 'rgba(10,8,6,.45)');

    // ── phone body ──
    var body = S.rrect(PH.x, PH.y, PH.w, PH.h, 70);
    bg += S.shape(body, '#2a2d30', { w: 4, extra: 4.5 });
    bg += S.line(S.rrect(PH.x + 10, PH.y + 10, PH.w - 20, PH.h - 20, 62).concat([[PH.x + 10, PH.y + 72]]), { w: 2, ta: 0.02, tb: 0.02, min: 0.6 }, '#5a6064');
    bg += S.box(PH.x + PH.w * 0.3, PH.y - 8, 120, 10, '#3a3f42', { w: 1.4, extra: 1, hatch: false }) + S.box(PH.x + PH.w * 0.3 + 150, PH.y - 8, 80, 10, '#3a3f42', { w: 1.4, extra: 1, hatch: false });  // buttons
    var glass = S.rrect(SC.x, SC.y, SC.w, SC.h, 34);
    bg += S.shape(glass, '#f4eedf', { w: 2, extra: 1.4 });
    var ui = '';
    // status bar
    ui += S.T(SC.x + 40, SC.y + 32, '12:41', { f: 'Oswald', s: 22, w: 500 });
    ui += S.box(SC.x + SC.w - 80, SC.y + 14, 44, 20, 'none', { w: 1.6, extra: 1, hatch: false }) + S.fillOnly(S.rect(SC.x + SC.w - 77, SC.y + 17, 26, 14), P.ink) + S.box(SC.x + SC.w - 36, SC.y + 19, 5, 10, P.ink, { w: 0.8, extra: 0.4, hatch: false });
    for (i = 0; i < 4; i++) ui += S.fillOnly(S.rect(SC.x + SC.w - 140 + i * 10, SC.y + 32 - 6 - i * 4, 6, 6 + i * 4), P.ink);
    ui += S.circ(SC.x + SC.w / 2, SC.y + 22, 9, '#1d1a17', { w: 0 });   // camera dot
    // header bar
    ui += S.fillOnly(S.rect(SC.x, SC.y + 46, SC.w, 74), '#3f6329');
    ui += S.line([[SC.x + 54, SC.y + 70], [SC.x + 38, SC.y + 84], [SC.x + 54, SC.y + 98]], { w: 4, ta: 0.05, tb: 0.05 }, '#f4eedf');
    ui += S.T(SC.x + 84, SC.y + 98, 'Wohnungsanzeige', { f: 'Oswald', s: 34, c: '#f4eedf' });
    var hx = SC.x + SC.w - 70, hy = SC.y + 86;
    ui += S.shape(U.catmull([[hx, hy + 16], [hx - 22, hy - 2], [hx - 16, hy - 16], [hx, hy - 8], [hx + 16, hy - 16], [hx + 22, hy - 2]], 5, true), P.red, { w: 2, extra: 1.6, color: '#f4eedf' });
    ui += S.T(SC.x + SC.w - 140, SC.y + 96, '⋯', { f: 'Fraunces', s: 30, c: '#f4eedf', a: 'middle' });
    // photo placeholder: Altbau facade sketch
    var fx = SC.x + 30, fy = SC.y + 140, fw = 580, fh = 400;
    var photo = '';
    photo += S.fillOnly(S.rect(fx, fy, fw, fh), S.linear([[0, '#bcd6e6'], [1, '#e6eee8']], 0, 0, 0, 1));
    var fac = S.rect(fx + 60, fy + 60, fw - 120, fh, 40, 1);
    photo += S.shape(fac, '#e2cfa6', { w: 2.4, extra: 2.4 }) + S.hatch(fac, { ang: 75, gap: 8, w: 1.1, op: 0.25, cond: function (X) { return X > fx + fw - 160; } });
    photo += S.fillOnly(S.poly([[fx + 40, fy + 64], [fx + fw / 2, fy + 10], [fx + fw - 40, fy + 64]], 30, 1), '#9d4a3a') + S.shape(S.poly([[fx + 40, fy + 64], [fx + fw / 2, fy + 10], [fx + fw - 40, fy + 64]], 30, 1), null, { w: 2.2, extra: 2 });
    for (var r = 0; r < 3; r++) for (var c2 = 0; c2 < 4; c2++) {
      var wx = fx + 96 + c2 * 104, wy = fy + 100 + r * 98, hl = (r === 1 && c2 === 2);
      photo += S.box(wx, wy, 58, 74, hl ? '#e9b85c' : '#5f7a86', { w: 1.8, extra: 1.6, hatch: false }) + S.seg(wx - 6, wy + 80, wx + 64, wy + 80, 3);
    }
    photo += S.fillOnly(S.rect(fx, fy + fh - 40, fw, 40), '#bdb4a0') + S.plant(fx + 40, fy + fh, 90, { n: 7, pot: P.ochre });
    ui += S.shape(S.rect(fx, fy, fw, fh, 40, 0.4), '#bcd6e6', { w: 0 }) + '<g clip-path="url(#' + S.clip(S.rect(fx, fy, fw, fh, 40, 0.4)) + ')">' + photo + '</g>' + S.shape(S.rect(fx, fy, fw, fh, 40, 0.4), null, { w: 2.2, extra: 1.4 });
    ui += S.box(fx + fw - 86, fy + fh - 44, 70, 30, 'rgba(23,19,15,.7)', { w: 0, hatch: false }) + S.T(fx + fw - 51, fy + fh - 22, '1/12', { f: 'Oswald', s: 20, c: '#f4eedf', a: 'middle', w: 500 });
    // thumbnail dots
    for (i = 0; i < 5; i++) ui += S.circ(fx + fw / 2 - 40 + i * 20, fy + fh + 22, 5, i ? '#c9c2ae' : '#3f6329', { w: 0 });
    // title + price lines (right column, above the description area)
    var tx = TXT.x;
    ui += S.T(tx, SC.y + 180, 'Helle Altbauwohnung', { f: 'Fraunces', s: 40 });
    ui += S.T(tx, SC.y + 220, '2 Zimmer · 54 m² · 3. OG', { f: 'Oswald', s: 26, c: '#5a5148', w: 500 });
    [['Kaltmiete', '780 €'], ['Nebenkosten', '190 €'], ['Kaution', '3 KM']].forEach(function (l, k) {
      var x0 = tx + k * 212;
      ui += S.box(x0, SC.y + 238, 198, 50, k ? '#ece4cc' : '#dfe8d4', { w: 1.6, extra: 1, step: 30, hatch: false });
      ui += S.T(x0 + 12, SC.y + 258, l[0], { f: 'Oswald', s: 15, c: '#6b6156', w: 500 }) + S.T(x0 + 186, SC.y + 280, l[1], { f: 'Oswald', s: 22, a: 'end', c: k ? P.ink : '#3f6329' });
    });
    // description area (engine writes the ad text here): faint lined card
    ui += S.box(TXT.x - 10, TXT.y - 6, TXT.w + 20, TXT.h + 6, '#fbf7ec', { w: 1.4, extra: 0.8, step: 40, hatch: false });
    ui += S.T(fx, fy + fh + 66, 'Besichtigung: Sa, 11 Uhr', { f: 'Oswald', s: 24, c: P.red, w: 500 });
    ui += S.box(fx, fy + fh + 84, 260, 54, '#3f6329', { w: 1.8, extra: 1.4, hatch: false }) + S.T(fx + 130, fy + fh + 120, 'Kontakt', { f: 'Oswald', s: 26, c: '#f4eedf', a: 'middle' });
    ui += S.box(fx + 280, fy + 84 + fh, 260, 54, '#f4eedf', { w: 1.8, extra: 1.4, hatch: false }) + S.T(fx + 410, fy + fh + 120, 'Merken', { f: 'Oswald', s: 26, a: 'middle', c: '#3f6329' });
    bg += '<g clip-path="url(#' + S.clip(glass) + ')">' + ui +
      S.hatch(glass, { ang: -50, gap: 8, w: 1.4, op: 0.12, color: '#ffffff', cond: function (X, Y) { var u = (X - SC.x) + (Y - SC.y) * 0.8; return (u > 160 && u < 260) || (u > 330 && u < 360); } }) + '</g>';
    bg += S.shape(glass, null, { w: 2.2, extra: 1.6 });

    // ── hand gripping the right edge (Melo green, navy sleeve) ──
    var hd = '', HX = PH.x + PH.w;
    var sleeve = S.poly([[HX + 10, 1100], [HX + 60, 760], [1960, 700], [1960, 1100]], 40, 1.4);
    hd += S.shape(sleeve, '#2c333b', { w: 3, extra: 3.4 }) + A.shadeSide(S, sleeve, [1, 0.4], 0.0, { ang: 70, gap: 8, op: 0.35, color: '#0b0e14' });
    var palm = U.catmull([[HX - 30, 600], [HX + 30, 520], [HX + 120, 520], [HX + 170, 640], [HX + 160, 800], [HX + 60, 830], [HX - 10, 760]], 6, true);
    hd += S.shape(palm, '#6a9644', { w: 3, extra: 3.2 }) + A.shadeSide(S, palm, [1, 0.3], 0.2, { ang: 60, gap: 7, op: 0.4 });
    // thumb over the glass edge
    var th = U.catmull([[HX - 20, 610], [HX - 90, 560], [HX - 120, 520], [HX - 96, 500], [HX - 40, 530], [HX + 20, 560]], 5, true);
    hd += S.shape(th, '#6a9644', { w: 2.8, extra: 3 }) + S.line([[HX - 104, 512], [HX - 92, 520]], { w: 2, ta: 0.2, tb: 0.2 }, '#3f6329');
    // fingers wrapping behind the right edge (only tips visible on the left of the bezel? → knuckles on the edge)
    [[HX - 6, 360], [HX - 4, 430], [HX - 2, 500]].forEach(function (k) { hd += S.shape(S.ellipse(k[0] + 18, k[1], 30, 26, 24, 0.05), '#6a9644', { w: 2.4, extra: 2.4 }); });
    bg += hd;
    // vignette
    bg += '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.6, '#120e0a', 0], [1, '#120e0a', 0.45]], { cx: '50%', cy: '45%', r: '75%' }) + '"/>';
    return { bg: bg };
  }

  var SLOTS = {
    left:          A.slot(170, 1000, 0.6, { face: 1 }),
    center:        A.slot(170, 1000, 0.6, { face: 1 }),
    right:         A.slot(1800, 1060, 0.6, { face: -1 }),
    'corner-left': A.slot(165, 1010, 0.55, { face: 1 }),          // small Melo beside the phone, looking at it
    screen: { x: TXT.x, y: TXT.y, w: TXT.w, h: TXT.h },             // ad description text area (engine writes here)
    photo:  { x: SC.x + 30, y: SC.y + 140, w: 580, h: 400 }         // listing photo area
  };
  var Sets = root.Sets || (typeof module === 'object' && module.exports ? require('./sets.js') : null);
  if (Sets) Sets.phoneAdText = SLOTS.screen;
  A.define('phone-ad', { seed: 205, build: build, slots: SLOTS });
})(typeof self !== 'undefined' ? self : this);
