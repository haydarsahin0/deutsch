/* MeloSet — static classroom set for the video engine (world = 1920×1080 units).
 * Built with SceneInk (brand/channel/scene-ink.js) so lines match the banner and Melo.
 * MeloSet.GEO: geometry shared with the renderer (board, slate, floor …).
 * MeloSet.svg() → SVG markup of the whole set (no text; texts are drawn by MeloSet.texts(ctx)).
 * MeloSet.titleSvg() → background of the full-frame title card.
 */
(function (root) {
  'use strict';
  var C = MeloB.PALETTE, U = MeloB._util;
  var INK = C.ink, RED = '#c43d33', MUSTARD = '#dca842', GREEN = '#3f6329', PAPER = '#e9dfc4',
    SLATE = '#25332b', WOOD = '#b98a52', WOOD_D = '#8d6236';

  var GEO = {
    W: 1920, H: 1080,
    board: { x: 560, y: 112, w: 1330, h: 716, frame: 24 },
    wainscot: 884, floor: 1012
  };
  GEO.slate = { x: GEO.board.x + GEO.board.frame, y: GEO.board.y + GEO.board.frame,
    w: GEO.board.w - 2 * GEO.board.frame, h: GEO.board.h - 2 * GEO.board.frame };

  function defs() {
    return '<defs>' +
      '<filter id="rough" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="blur8"><feGaussianBlur stdDeviation="9"/></filter>' +
      '<filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>' +
      '<filter id="gFine" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .27  0 0 0 0 .16  0 0 0 -1.3 .74"/></filter>' +
      '<filter id="gCloud" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".005" numOctaves="4" seed="9"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .37  0 0 0 0 .2  0 0 0 -1.1 .5"/></filter>' +
      '<filter id="slateTex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="21"/><feColorMatrix values="0 0 0 0 .78  0 0 0 0 .84  0 0 0 0 .78  0 0 0 -1.4 .62"/></filter>' +
      '<radialGradient id="disc" cx="42%" cy="38%" r="70%"><stop offset="0" stop-color="#e6b552"/><stop offset=".6" stop-color="#d6a03c"/><stop offset="1" stop-color="#bf862b"/></radialGradient>' +
      '</defs>';
  }

  function wall(S) {
    var s = '', wy = GEO.wainscot, fy = GEO.floor;
    s += S.fillOnly([[-20, -20], [1940, -20], [1940, wy], [-20, wy]], PAPER);
    s += S.fillOnly([[-20, wy], [1940, wy], [1940, fy], [-20, fy]], '#e0d2b0');
    s += S.line([[-20, wy], [1940, wy + 2]], { w: 4.5, ta: 0.02, tb: 0.02, min: 0.6 });
    s += S.line([[-20, wy + 13], [1940, wy + 14]], { w: 2, ta: 0.02, tb: 0.02, min: 0.5 });
    for (var x = 30; x < 1920; x += 210) {
      var r = S.rect(x, wy + 34, 160, fy - wy - 58, 40, 1.5);
      s += S.shape(r, null, { w: 2, extra: 2 });
      s += S.hatch(S.rect(x + 3, wy + 37, 24, fy - wy - 64), { ang: 70, gap: 8, w: 1.3, op: 0.45 });
    }
    s += S.fillOnly([[-20, fy], [1940, fy], [1940, 1100], [-20, 1100]], '#cdb98f');
    s += S.line([[-20, fy], [1940, fy - 1]], { w: 5, ta: 0.02, tb: 0.02, min: 0.6 });
    s += S.hatch([[-20, fy + 5], [1940, fy + 5], [1940, 1100], [-20, 1100]], { ang: 0, gap: 11, w: 1.4, op: 0.5 });
    for (x = 40; x < 1920; x += 260) s += S.line([[x, fy + 6], [x - 6, 1090]], { w: 1.8, ta: 0.1, tb: 0.1 });
    // engraved shading toward ceiling + corners
    var R = [[-20, -20], [1940, -20], [1940, wy], [-20, wy]];
    s += S.hatch(R, { ang: 28, gap: 10, w: 1.3, op: 0.28, cond: function (X, Y) {
      var e = Math.min(X, 1920 - X) / 1920;
      return (Y < 26 + 18 * Math.sin(X / 170)) || (e < 0.03 && Y > 90);
    } });
    return s;
  }

  function bunting(S) {
    var s = '', letters = ['Ä', 'Ö', 'Ü', 'ß'], cols = [MUSTARD, RED, '#6f9a49', '#efe5cc'];
    function swag(x0, y0, x1, y1, sag, startIdx) {
      var pts = [];
      for (var i = 0; i <= 40; i++) { var t = i / 40; pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)]); }
      var str = S.line(pts, { w: 2.4, ta: 0.02, tb: 0.02, min: 0.6 });
      var n = Math.floor((x1 - x0) / 84), fl = '';
      for (var k = 0; k < n; k++) {
        var t0 = (k + 0.5) / n, cx = x0 + (x1 - x0) * t0, cy = y0 + (y1 - y0) * t0 + sag * 4 * t0 * (1 - t0);
        var slope = Math.atan2((y1 - y0) + sag * 4 * (1 - 2 * t0), x1 - x0) * 180 / Math.PI;
        var w = 30, h = 72, idx = (startIdx + k) % 4, col = cols[idx];
        var tri = U.xf(S.poly([[-w, 0], [w, 0], [0, h]], 14, 1.2), cx, cy, slope * 0.8 + (S.r() - 0.5) * 6);
        fl += S.shape(tri, col, { w: 2, extra: 2.2 });
        fl += S.hatch(tri, { ang: -60, gap: 7, w: 1.1, op: 0.45, cond: function (X) { return X > cx + 4; } });
        GEO.flags.push({ x: cx, y: cy + 34, rot: slope * 0.8, ch: letters[idx], col: idx === 3 || idx === 0 ? INK : '#f3ead3' });
      }
      return str + fl;
    }
    GEO.flags = [];
    s += swag(-30, 16, 960, 26, 60, 0);
    s += swag(950, 26, 1950, 12, 60, 2);
    return s;
  }

  function clock(S) {
    var cx = 150, cy = 210, R = 74, s = '';
    s += S.shape(S.ellipse(cx + 7, cy + 8, R + 5, R + 5, 64), 'rgba(80,55,20,.18)', { w: 0 });
    s += S.shape(S.ellipse(cx, cy, R, R, 72, 0.01), '#efe6cf', { w: 4, extra: 5 });
    s += S.shape(S.ellipse(cx, cy, R - 11, R - 11, 72, 0.01), null, { w: 1.6, extra: 1.2 });
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * Math.PI * 2, r0 = R - 19, r1 = R - (i % 3 ? 25 : 33);
      s += S.line([[cx + r0 * Math.sin(a), cy - r0 * Math.cos(a)], [cx + r1 * Math.sin(a), cy - r1 * Math.cos(a)]], { w: i % 3 ? 2.4 : 4.2, ta: 0.05, tb: 0.05, min: 0.6 });
    }
    s += S.line([[cx, cy], [cx - 0.26 * 34, cy - 0.966 * 34]], { w: 6, ta: 0.02, tb: 0.5, min: 0.5 });
    s += S.line([[cx, cy], [cx - 0.5 * 50, cy - 0.866 * 50]], { w: 4, ta: 0.02, tb: 0.6, min: 0.4 });
    s += S.shape(S.ellipse(cx, cy, 5, 5, 16), RED, { w: 1.2, extra: 1 });
    s += S.hatch(S.ellipse(cx, cy, R - 12, R - 12, 48), { ang: 40, gap: 7, w: 1, op: 0.35, cond: function (X, Y) { return (X - cx) + (Y - cy) > R * 0.55; } });
    GEO.clock = { x: cx, y: cy + 36 };
    return s;
  }

  function board(S) {
    var B = GEO.board, s = '', x0 = B.x, y0 = B.y, x1 = B.x + B.w, y1 = B.y + B.h, fw = B.frame;
    s += S.fillOnly(S.rect(x0 + 12, y0 + 14, B.w, B.h + 6), 'rgba(80,55,20,.24)');
    var frame = S.rect(x0, y0, B.w, B.h, 40, 1.2);
    s += S.shape(frame, WOOD, { w: 4, extra: 4.5 });
    s += S.hatch(frame, { ang: 0, gap: 6, w: 1.1, op: 0.33 });
    var sl = GEO.slate, slate = S.rect(sl.x, sl.y, sl.w, sl.h, 40, 1);
    s += S.fillOnly(slate, SLATE);
    var sid = S.clip(slate), sm = '';
    // old wiped chalk arcs
    for (var i = 0; i < 16; i++) {
      var cx = S.rand(sl.x, sl.x + sl.w), cy = S.rand(sl.y + 40, sl.y + sl.h - 30), rr = S.rand(70, 190), pts = [];
      for (var k = 0; k <= 24; k++) { var a = -2.4 + k / 24 * 1.9; pts.push([cx + rr * Math.cos(a), cy + rr * 0.5 * Math.sin(a)]); }
      sm += S.line(pts, { w: S.rand(34, 70), ta: 0.3, tb: 0.3, min: 0.2, jit: 0.5 }, '#5d6b62', ' opacity="' + U.f1(S.rand(0.1, 0.22)) + '"');
    }
    s += '<g clip-path="url(#' + sid + ')"><rect x="' + sl.x + '" y="' + sl.y + '" width="' + sl.w + '" height="' + sl.h + '" filter="url(#slateTex)" opacity=".5"/>' +
      '<g filter="url(#blur8)">' + sm + '</g>' +
      // inner shadow under the top frame edge
      '<rect x="' + sl.x + '" y="' + sl.y + '" width="' + sl.w + '" height="18" fill="#000" opacity=".22" filter="url(#blur3)"/></g>';
    s += S.shape(slate, null, { w: 3, extra: 1.8, dir: [-0.55, -0.83] });
    // tray + chalk + sponge
    var tray = S.rect(x0 - 10, y1 - 6, B.w + 20, 22, 40, 1);
    s += S.shape(tray, WOOD_D, { w: 3, extra: 3 });
    s += S.shape(S.rect(x0 + 120, y1 - 18, 54, 11, 20, 0.5), '#f4efe0', { w: 1.6, extra: 1.2 });
    s += S.shape(S.rect(x0 + 196, y1 - 17, 36, 10, 20, 0.5), '#f2cf5b', { w: 1.6, extra: 1.2 });
    s += S.shape(S.rect(x0 + 246, y1 - 17, 30, 10, 20, 0.5), '#f08a7a', { w: 1.6, extra: 1.2 });
    GEO.sponge = { x: x1 - 230, y: y1 - 36, w: 96, h: 30 };
    return s;
  }

  function sponge(S, x, y, w, h) {
    var s = S.shape(S.rect(x, y, w, h, 25, 1), '#5a4a3a', { w: 2.6, extra: 2.6 });
    s += S.shape(S.rect(x, y, w, h * 0.38, 25, 1), '#b9b1a0', { w: 2, extra: 1.6 });
    return s;
  }

  function sideTable(S) {
    var s = '', top = 792, x0 = 6, x1 = 236, fl = GEO.floor;
    [24, 196].forEach(function (lx) {
      var leg = S.rect(lx, top + 24, 26, fl - top - 24, 40, 1);
      s += S.shape(leg, WOOD, { w: 2.8, extra: 3 });
      s += S.hatch(leg, { ang: 90, gap: 7, w: 1.1, op: 0.5, cond: function (X) { return X > lx + 16; } });
    });
    var body = S.rect(36, top + 24, 170, 84, 40, 1);
    s += S.shape(body, '#c79a60', { w: 2.8, extra: 3 });
    s += S.hatch(body, { ang: 0, gap: 8, w: 1, op: 0.32 });
    s += S.shape(S.ellipse(121, top + 66, 7, 6, 16), INK, { w: 0 });
    s += S.fillOnly(S.rect(30, top + 24, 190, 10), 'rgba(23,19,15,.33)');
    var slab = S.rect(x0, top - 4, x1 - x0, 28, 40, 1);
    s += S.shape(slab, WOOD, { w: 3.4, extra: 4 });
    // book stack
    var books = [{ x: 18, w: 176, h: 42, col: GREEN }, { x: 30, w: 160, h: 34, col: '#e7dcc0' }, { x: 14, w: 178, h: 38, col: RED }];
    var by = top - 4;
    GEO.books = [];
    books.forEach(function (b) {
      var y = by - b.h, r = S.rect(b.x, y, b.w, b.h, 30, 1);
      s += S.shape(r, b.col, { w: 2.8, extra: 3 });
      s += S.hatch(r, { ang: 90, gap: 7, w: 1, op: 0.4, cond: function (X, Y) { return Y > y + b.h - 10; } });
      s += S.line([[b.x + 16, y + 5], [b.x + 16, y + b.h - 5]], { w: 1.6, ta: 0.1, tb: 0.1 });
      s += S.line([[b.x + b.w - 16, y + 5], [b.x + b.w - 16, y + b.h - 5]], { w: 1.6, ta: 0.1, tb: 0.1 });
      GEO.books.push({ x: b.x + b.w / 2, y: y + b.h / 2, h: b.h });
      by = y;
    });
    // whole watermelon on top
    var wx = 104, wry = 44, wrx = 74, wy = by - wry + 6, wm = S.ellipse(wx, wy, wrx, wry, 60, 0.01);
    s += S.shape(wm, C.rind, { w: 0 });
    var wid = S.clip(wm), st = '';
    for (var i = -4; i <= 4; i++) {
      var pts = [];
      for (var k = 0; k <= 20; k++) { var t = k / 20, yy = wy - wry + t * 2 * wry; pts.push([wx + i * 18 * Math.sqrt(Math.max(0.15, 1 - Math.pow((yy - wy) / wry, 2))) + 3.5 * Math.sin(t * 18 + i), yy]); }
      st += S.line(pts, { w: 9, ta: 0.3, tb: 0.3, min: 0.4, jit: 0.4 }, C.stripe);
    }
    s += '<g clip-path="url(#' + wid + ')">' + st + S.hatch(wm, { ang: 40, gap: 6, w: 1.1, op: 0.6, cond: function (X, Y) { return (X - wx) / wrx * 0.6 + (Y - wy) / wry * 0.8 > 0.25; } }) + '</g>';
    s += S.shape(wm, null, { w: 3, extra: 4 });
    s += S.line([[wx - 3, wy - wry + 2], [wx + 2, wy - wry - 10], [wx + 10, wy - wry - 13]], { w: 4, ta: 0.1, tb: 0.4 });
    return s;
  }

  function stickyNotes(S) {
    var s = '';
    GEO.notes = [];
    function note(x, y, w, h, rot, col) {
      var r = U.xf(S.rect(-w / 2, -h / 2, w, h, 30, 1.3), x, y, rot);
      s += S.fillOnly(U.xf(S.rect(-w / 2 + 6, -h / 2 + 8, w, h, 30, 1.3), x, y, rot), 'rgba(80,55,20,.2)');
      s += S.shape(r, col, { w: 2.2, extra: 2.4 });
      s += S.hatch(r, { ang: 35, gap: 8, w: 1, op: 0.28, cond: function (X, Y) { return (X - x) + (Y - y) > w * 0.45; } });
      var pin = U.xf([[0, -h / 2 + 13]], x, y, rot)[0];
      s += S.shape(S.ellipse(pin[0], pin[1], 7, 7, 16), RED, { w: 1.6, extra: 1.2 });
    }
    note(392, 268, 138, 120, -5, '#f0c74e'); GEO.notes.push({ x: 392, y: 268, rot: -5, lines: ['Na, alles', 'klar?'], fs: 34, col: [INK, INK] });
    note(330, 430, 118, 104, 4, '#efe5cc'); GEO.notes.push({ x: 330, y: 430, rot: 4, lines: ['ä · ö · ü', 'ß ≠ B'], fs: 30, col: [INK, RED] });
    return s;
  }

  function svg() {
    var S = new SceneInk(11);
    var scene = wall(S) + bunting(S) + clock(S) + stickyNotes(S) + board(S) + sideTable(S);
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + GEO.W + '" height="' + GEO.H + '" viewBox="0 0 ' + GEO.W + ' ' + GEO.H + '">' +
      defs() + '<defs>' + S.defs + '</defs>' +
      '<rect width="1920" height="1080" fill="' + PAPER + '"/>' +
      '<g filter="url(#rough)">' + scene + '</g>' +
      '<rect width="1920" height="' + GEO.wainscot + '" filter="url(#gCloud)" opacity=".55"/>' +
      '</svg>';
  }

  function spongeSvg() {
    var S = new SceneInk(5), w = 150, h = 54;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (w + 20) + '" height="' + (h + 20) + '" viewBox="-10 -10 ' + (w + 20) + ' ' + (h + 20) + '">' + defs() +
      '<defs>' + S.defs + '</defs><g filter="url(#rough)">' + sponge(S, 0, 0, w, h) + '</g></svg>';
  }

  // texts on set props (SVG-as-image cannot use web fonts → drawn with canvas)
  function texts(ctx) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    (GEO.flags || []).forEach(function (f) {
      ctx.save(); ctx.translate(f.x, f.y - 6); ctx.rotate(f.rot * Math.PI / 180);
      ctx.font = '900 30px Fraunces'; ctx.fillStyle = f.col; ctx.fillText(f.ch, 0, 0); ctx.restore();
    });
    (GEO.notes || []).forEach(function (n) {
      ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.rot * Math.PI / 180);
      ctx.font = '700 ' + n.fs + 'px Caveat';
      n.lines.forEach(function (l, i) { ctx.fillStyle = n.col[i]; ctx.fillText(l, 0, -6 + i * (n.fs + 2)); });
      ctx.restore();
    });
    if (GEO.clock) { ctx.font = '700 18px Caveat'; ctx.fillStyle = 'rgba(23,19,15,.8)'; ctx.fillText('fünf vor zwölf', GEO.clock.x, GEO.clock.y); }
    var bt = [['WÖRTERBUCH', MUSTARD, '900 19px Fraunces'], ['GRAMMATIK', INK, '700 19px Oswald'], ['DER · DIE · DAS', '#f3ead3', '700 17px Oswald']];
    (GEO.books || []).forEach(function (b, i) { ctx.font = bt[i][2]; ctx.fillStyle = bt[i][1]; ctx.fillText(bt[i][0], b.x, b.y + 1); });
    ctx.restore();
  }

  // full-frame title card background (dark, burst rays, ink texture) — thumbnail look
  function titleSvg() {
    var S = new SceneInk(41), s = '', cx = 1400, cy = 470;
    s += '<rect width="1920" height="1080" fill="#20140d"/>';
    var rays = '';
    for (var i = 0; i < 28; i++) {
      var a0 = i / 28 * Math.PI * 2, a1 = a0 + Math.PI / 28 * 0.9, R = 2600;
      rays += '<path d="M' + cx + ' ' + cy + 'L' + U.f1(cx + R * Math.cos(a0)) + ' ' + U.f1(cy + R * Math.sin(a0)) + 'L' + U.f1(cx + R * Math.cos(a1)) + ' ' + U.f1(cy + R * Math.sin(a1)) + 'Z"/>';
    }
    s += '<radialGradient id="tglow" cx="' + (cx / 19.2) + '%" cy="' + (cy / 10.8) + '%" r="70%"><stop offset="0" stop-color="#c8641e"/><stop offset=".45" stop-color="#8a3a14"/><stop offset="1" stop-color="#2a170d"/></radialGradient>';
    s += '<rect width="1920" height="1080" fill="url(#tglow)"/>';
    s += '<g fill="#e08a2c" opacity=".07">' + rays + '</g>';
    // engraved hatch vignette
    var R2 = [[-20, -20], [1940, -20], [1940, 1100], [-20, 1100]];
    s += S.hatch(R2, { ang: 32, gap: 9, w: 1.6, op: 0.55, cond: function (X, Y) { var d = Math.hypot((X - cx) / 1.4, Y - cy); return d > 760; } });
    s += S.hatch(R2, { ang: -28, gap: 11, w: 1.4, op: 0.4, cond: function (X, Y) { var d = Math.hypot((X - cx) / 1.4, Y - cy); return d > 980; } });
    // mustard disc behind Melo's head
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">' + defs() + '<defs>' + S.defs + '</defs>' +
      '<g filter="url(#rough)">' + s + '</g><rect width="1920" height="1080" filter="url(#gFine)" opacity=".35"/></svg>';
  }

  // screen overlay: paper grain + warm vignette (multiplied over every frame)
  function grainSvg() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">' + defs() +
      '<radialGradient id="vig" cx="50%" cy="48%" r="75%"><stop offset=".55" stop-color="#5a3c14" stop-opacity="0"/><stop offset="1" stop-color="#5a3c14" stop-opacity=".30"/></radialGradient>' +
      '<rect width="1920" height="1080" fill="#fff"/>' +
      '<rect width="1920" height="1080" filter="url(#gFine)" opacity=".30"/>' +
      '<rect width="1920" height="1080" fill="url(#vig)"/></svg>';
  }

  root.MeloSet = { GEO: GEO, svg: svg, texts: texts, titleSvg: titleSvg, grainSvg: grainSvg, spongeSvg: spongeSvg,
    COL: { INK: INK, RED: RED, MUSTARD: MUSTARD, GREEN: GREEN, PAPER: PAPER, SLATE: SLATE } };
})(typeof self !== 'undefined' ? self : this);
