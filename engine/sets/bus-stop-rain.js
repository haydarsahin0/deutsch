/* bus-stop-rain — a glass bus shelter on a rainy evening: dusky blue sky, wet houses with warm windows across the street,
 * a street lamp with rain glittering in its cone, lit advertising box („Volkshochschule · Deutschkurse"), timetable
 * („Fahrplan · Linie 42") on the back glass, fluorescent tube under the roof, green-on-yellow „H" stop sign
 * („Lindenplatz"), wet pavement with reflections and puddles. fg = the concrete bench block (slot `bench`, legs hidden)
 * + puddles + rain. Ambient: rain streaks, puddle rings, flickering tube. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var SH = { x0: 430, x1: 1540, roof: 196, glassB: 900 }, BENCH = { x0: 720, x1: 1210, seat: 892, front: 912, bot: 1046 };
  var PUD = [[300, 1046, 140, 16], [1480, 1052, 170, 18], [980, 1068, 120, 10]];

  function build(S) {
    var bg = '', fg = '', i;
    // sky
    bg += S.fillOnly(S.rect(-20, -20, 1960, 700), S.linear([[0, '#283246'], [0.7, '#4c5266'], [1, '#6d6874']], 0, 0, 0, 1));
    bg += S.hatch(S.rect(-20, -20, 1960, 300), { ang: 20, gap: 10, w: 1.2, op: 0.2, color: '#10141c' });
    // houses across the street
    var H = [[-20, 250, 300, '#3c4150'], [270, 160, 360, '#45495a'], [620, 230, 330, '#3a3e4c'], [940, 140, 380, '#474a58'], [1310, 210, 300, '#3d4150'], [1600, 170, 360, '#44485a']];
    H.forEach(function (h, k) {
      var r = S.rect(h[0], h[1], h[2], 640 - h[1], 40, 1);
      bg += S.shape(r, h[3], { w: 2, extra: 1.6 }) + S.hatch(r, { ang: 75, gap: 9, w: 1.1, op: 0.3, color: '#0e1118' });
      bg += S.fillOnly(S.poly([[h[0] - 10, h[1]], [h[0] + h[2] + 10, h[1]], [h[0] + h[2] - 20, h[1] - 26], [h[0] + 20, h[1] - 26]], 30, 0.8), '#2a2e3a');
      for (var yy = h[1] + 40; yy < 560; yy += 86) for (var xx = h[0] + 34; xx < h[0] + h[2] - 50; xx += 82) {
        var lit = S.r() < 0.45;
        bg += S.box(xx, yy, 40, 54, lit ? '#e9b85c' : '#2b3140', { w: 1.4, extra: 1, hatch: false });
        if (lit) bg += S.glow(xx + 20, yy + 27, 46, 46, '#f2c46a', 0.25);
      }
    });
    // road behind the shelter: wet, light smears
    bg += S.fillOnly(S.rect(-20, 600, 1960, 70), '#2b2f38');
    for (i = 0; i < 14; i++) { var lx = S.r() * 1920; bg += S.seg(lx, 614 + S.r() * 40, lx + 40 + S.r() * 80, 618 + S.r() * 40, 2, S.r() < 0.5 ? '#f2c46a' : '#c43d33', ' opacity=".5"'); }
    // pavement (wet slabs) — reflections
    bg += S.fillOnly(S.rect(-20, 660, 1960, 440), '#4a4e58');
    var sl = [];
    for (var py = 700; py < 1100; py += 46 + (py - 700) * 0.12) sl.push([[-20, py], [1940, py + 2]]);
    for (var px = -400; px < 2300; px += 150) sl.push([[px, 660], [960 + (px - 960) * 2.2, 1100]]);
    bg += S.lines(sl, { w: 1.4, ta: 0.05, tb: 0.05, min: 0.4 }, P.ink, ' opacity=".35"');
    bg += S.fillOnly(S.rect(-20, 660, 1960, 16), '#2e323b');   // kerb at the back
    // street lamp (left) with cone
    var LX = 250;
    bg += A.shaft([[LX - 20, 150], [LX + 20, 150], [LX + 170, 1000], [LX - 170, 1000]], '#f2c46a', 0.12);
    bg += S.line([[LX, 1000], [LX + 2, 160], [LX + 40, 120]], { w: 9, ta: 0.02, tb: 0.02, min: 0.9 }, '#262a31');
    bg += S.glow(LX + 40, 150, 120, 90, '#ffe2a0', 0.5) + S.shape(S.poly([[LX + 6, 118], [LX + 76, 118], [LX + 64, 146], [LX + 18, 146]], 12, 0.4), '#2f343c', { w: 2, extra: 2 });
    bg += S.glow(LX, 990, 220, 40, '#f2c46a', 0.35);
    // lit advertising box (left of the shelter)
    var AD = { x: 120, y: 360, w: 250, h: 380 };
    bg += S.glow(AD.x + AD.w / 2, AD.y + AD.h / 2, 260, 300, '#ffeac0', 0.3);
    bg += S.box(AD.x - 12, AD.y - 12, AD.w + 24, AD.h + 24, '#2a2f36', { w: 3, extra: 3 });
    bg += S.fillOnly(S.rect(AD.x, AD.y, AD.w, AD.h), '#f3ead2');
    bg += S.fillOnly(S.rect(AD.x, AD.y, AD.w, 150), '#5f8f86');
    bg += S.T(AD.x + AD.w / 2, AD.y + 70, 'Deutsch', { f: 'Anton', s: 50, c: P.white, a: 'middle' }) + S.T(AD.x + AD.w / 2, AD.y + 122, 'lernen', { f: 'Caveat', s: 44, c: P.white, a: 'middle' });
    bg += S.T(AD.x + AD.w / 2, AD.y + 210, 'Volkshochschule', { f: 'Oswald', s: 24, a: 'middle' }) + S.T(AD.x + AD.w / 2, AD.y + 246, 'Deutschkurse A1–C1', { f: 'Kalam', s: 22, a: 'middle' });
    bg += S.circ(AD.x + AD.w / 2, AD.y + 310, 34, P.red, { w: 2, extra: 1.6 }) + S.T(AD.x + AD.w / 2, AD.y + 318, 'B1', { f: 'Anton', s: 26, c: P.white, a: 'middle' });
    bg += S.line([[AD.x + 60, AD.y + AD.h + 12], [AD.x + 60, 1000]], { w: 10, ta: 0.02, tb: 0.02 }, '#2a2f36') + S.line([[AD.x + AD.w - 60, AD.y + AD.h + 12], [AD.x + AD.w - 60, 1000]], { w: 10, ta: 0.02, tb: 0.02 }, '#2a2f36');
    // reflections of lights in the wet pavement
    [[AD.x + AD.w / 2, '#ffeac0', 120], [LX + 40, '#f2c46a', 70], [1680, '#e2c84e', 50], [960, '#cfe6f0', 260]].forEach(function (r) {
      for (var k = 0; k < 6; k++) bg += S.seg(r[0] + (S.r() - 0.5) * r[2], 1010 + k * 12, r[0] + (S.r() - 0.5) * r[2] * 0.6, 1018 + k * 12, 3 - k * 0.3, r[1], ' opacity="' + f1(0.45 - k * 0.06) + '"');
    });

    // ── the shelter ──
    var back = S.rect(SH.x0, SH.roof + 40, SH.x1 - SH.x0, SH.glassB - SH.roof - 40, 50, 0.6);
    bg += S.fillOnly(back, '#a9c4cf', ' opacity=".28"');
    bg += S.hatch(back, { ang: -55, gap: 8, w: 1.4, op: 0.22, color: '#ffffff', cond: function (X, Y) { var u = X + Y * 0.8; return (u > 900 && u < 980) || (u > 1500 && u < 1530) || (u > 1900 && u < 1960); } });
    bg += S.lines([[[SH.x0, SH.roof + 40], [SH.x1, SH.roof + 40]], [[SH.x0, SH.glassB], [SH.x1, SH.glassB]], [[SH.x0, 560], [SH.x1, 560]], [[985, SH.roof + 40], [985, SH.glassB]]], { w: 4, ta: 0.02, tb: 0.02, min: 0.8 }, '#2a2f36');
    bg += S.glow(985, 300, 560, 160, '#e6f2f5', 0.28);
    // timetable on the glass
    var TT = { x: 1330, y: 390, w: 160, h: 230 };
    bg += S.box(TT.x, TT.y, TT.w, TT.h, '#f0e3b0', { w: 2.2, extra: 2 }) + S.fillOnly(S.rect(TT.x, TT.y, TT.w, 44), '#3f6329');
    bg += S.T(TT.x + TT.w / 2, TT.y + 30, 'Fahrplan', { f: 'Oswald', s: 22, c: P.white, a: 'middle' }) + S.T(TT.x + TT.w / 2, TT.y + 72, 'Linie 42', { f: 'Oswald', s: 20, a: 'middle' });
    for (i = 0; i < 6; i++) bg += S.scribble(TT.x + 16, TT.y + 100 + i * 21, TT.w - 32, 1, 10, P.ink, 0.6);
    // roof + posts + light tube
    var roof = S.poly([[SH.x0 - 40, SH.roof], [SH.x1 + 40, SH.roof], [SH.x1 + 40, SH.roof + 40], [SH.x0 - 40, SH.roof + 40]], 40, 0.6);
    bg += S.shape(roof, '#3a404a', { w: 3.2, extra: 3.4 }) + A.shadeSide(S, roof, [0, 1], 0.1, { ang: 10, gap: 6, op: 0.5 });
    bg += '<!--amb:tube-->';
    [SH.x0, SH.x1].forEach(function (x) { bg += S.box(x - 9, SH.roof + 38, 18, 1000 - SH.roof - 38, '#2a2f36', { w: 2.4, extra: 2.4, hatch: false }); });
    bg += S.fillOnly(S.rect(-20, 996, 1960, 104), 'rgba(20,24,30,.18)');
    // bench backrest (wooden slats on two steel brackets, against the back glass)
    [BENCH.x0 + 40, BENCH.x1 - 40].forEach(function (x) { bg += S.line([[x, 900], [x, 780]], { w: 9, ta: 0.02, tb: 0.02, min: 0.9 }, '#2a2f36'); });
    for (i = 0; i < 3; i++) { var by = 784 + i * 30; bg += S.box(BENCH.x0 - 4, by, BENCH.x1 - BENCH.x0 + 8, 20, '#9a7a56', { w: 2, extra: 2, hatch: 'b', hk: 0.5 }); }

    // ── H stop sign ──
    var HX = 1690;
    bg += S.line([[HX, 1004], [HX + 2, 220]], { w: 10, ta: 0.02, tb: 0.02, min: 0.9 }, '#4a5058');
    bg += S.circ(HX, 220, 58, '#e2c84e', { w: 3.2, extra: 3 }) + S.circ(HX, 220, 48, '#e2c84e', { w: 2, extra: 1.6, color: '#3f6329' });
    bg += S.T(HX, 246, 'H', { f: 'Anton', s: 70, c: '#3f6329', a: 'middle' });
    bg += S.box(HX - 90, 290, 180, 40, '#f3ead2', { w: 2.2, extra: 2 }) + S.T(HX, 318, 'Lindenplatz', { f: 'Oswald', s: 22, a: 'middle' });
    bg += S.box(HX - 50, 340, 100, 34, '#3f6329', { w: 2, extra: 1.6 }) + S.T(HX, 364, '42', { f: 'Anton', s: 24, c: P.white, a: 'middle' });
    // litter bin at the post
    bg += S.box(HX + 22, 760, 70, 110, '#5a6068', { w: 2.4, extra: 2.4, hatch: 'r', hk: 0.4 });

    // ═════ fg: bench block, puddles ═════
    var B = BENCH;
    fg += S.floorShadow((B.x0 + B.x1) / 2, B.bot + 4, (B.x1 - B.x0) / 2 + 30, 10, 0.4);
    var seat = S.poly([[B.x0 - 6, B.seat], [B.x1 + 6, B.seat], [B.x1 + 14, B.front], [B.x0 - 14, B.front]], 30, 0.5);
    fg += S.shape(seat, '#9a7a56', { w: 2.6, extra: 2.6 }) + S.lines([[[B.x0, B.seat + 9], [B.x1, B.seat + 9]], [[B.x0 - 8, B.seat + 19], [B.x1 + 8, B.seat + 19]]], { w: 1.4, ta: 0.05, tb: 0.05 }, P.ink, ' opacity=".6"');
    var face = S.rect(B.x0 - 14, B.front, B.x1 - B.x0 + 28, B.bot - B.front, 40, 0.6);
    fg += S.shape(face, '#7c808a', { w: 3, extra: 3.2 }) + S.hatch(face, { ang: 75, gap: 8, w: 1.2, op: 0.4 });
    fg += S.stipple(face, 160, { r: 2.4, op: 0.35, color: '#2a2f36' });
    fg += S.fillOnly(S.rect(B.x0 - 14, B.bot - 20, B.x1 - B.x0 + 28, 20), 'rgba(160,190,205,.25)');
    PUD.forEach(function (p) {
      var e = S.ellipse(p[0], p[1], p[2], p[3], 40, 0.15);
      fg += S.fillOnly(e, '#6d7a8a', ' opacity=".7"') + S.hatch(e, { ang: 0, gap: 5, w: 1.1, op: 0.35, color: '#cfe0ea' }) + S.shape(e, null, { w: 1.6, extra: 1 });
    });
    fg += '<!--amb:rain-->';

    var drops = [];
    for (i = 0; i < 90; i++) drops.push([S.r() * 2100 - 90, S.r(), 0.7 + S.r() * 0.6, 26 + S.r() * 30]);
    var amb = {
      rain: function (t) {
        var d = '', d2 = '';
        drops.forEach(function (q, k) {
          var y = ((q[1] + t * q[2] * 1.4) % 1) * 1180 - 60, x = q[0] - y * 0.12;
          var seg = 'M' + f1(x) + ' ' + f1(y) + 'l' + f1(-q[3] * 0.12) + ' ' + f1(q[3]);
          if (k % 3) d += seg; else d2 += seg;
        });
        var s = '<path d="' + d + '" stroke="#d9e4ea" stroke-width="2" stroke-linecap="round" opacity=".38"/><path d="' + d2 + '" stroke="#1d2531" stroke-width="2" stroke-linecap="round" opacity=".3"/>';
        PUD.forEach(function (p, k) {
          for (var j = 0; j < 2; j++) {
            var ph = (t * 0.9 + k * 0.37 + j * 0.5) % 1, cx = p[0] + (j ? 0.3 : -0.25) * p[2];
            s += '<ellipse cx="' + f1(cx) + '" cy="' + f1(p[1]) + '" rx="' + f1(8 + ph * 34) + '" ry="' + f1(2 + ph * 6) + '" fill="none" stroke="#e6f0f5" stroke-width="1.6" opacity="' + f1(0.6 * (1 - ph)) + '"/>';
          }
        });
        return s;
      },
      tube: function (t) {
        var fl = (Math.sin(t * 23) * Math.sin(t * 3.1) > 0.92) ? 0.45 : 1;
        return '<rect x="700" y="' + (SH.roof + 42) + '" width="570" height="10" rx="5" fill="#f4fbff" stroke="#2a2f36" stroke-width="2.5" opacity="' + f1(fl) + '"/>' +
          '<ellipse cx="985" cy="' + (SH.roof + 60) + '" rx="420" ry="30" fill="#e6f2f5" opacity="' + f1(0.18 * fl) + '"/>';
      }
    };
    return { bg: bg, fg: fg, amb: amb };
  }

  A.define('bus-stop-rain', {
    seed: 304, ambient: true, build: build,
    slots: {
      bench:  A.slot(965, 1000, 0.95, { seated: true, seatY: 905 }),     // on the bench block (fg hides the legs)
      left:   A.slot(590, 992, 1.0, { face: 1 }),                         // standing inside the shelter, left
      right:  A.slot(1360, 995, 1.0, { face: -1 }),                       // standing inside the shelter, right
      center: A.slot(965, 1000, 1.0)
    }
  });
})(typeof self !== 'undefined' ? self : this);
