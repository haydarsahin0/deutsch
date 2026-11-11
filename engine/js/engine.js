/* MeloEngine — deterministic frame renderer for "Deutsch mit Melo".
 *   await MeloEngine.init(timeline, {scale, subs})   (fonts, set, layouts, rig)
 *   await MeloEngine.renderFrame(t)                   draws one 1920×1080 frame (× scale) into #frame
 * World = 1920×1080 units (classroom set, see set.js). Camera = {cx, cy, w} (h = w·9/16) in world units.
 * Board content is drawn into an offscreen "slate" canvas (chalk), erased via masks, grain-textured,
 * then composited with the camera transform. Melo comes from MeloRig (engine/character/rig.js) as SVG.
 */
(function (root) {
  'use strict';
  var GEO = MeloSet.GEO, COL = MeloSet.COL, W = 1920, H = 1080;
  var CHALK = { w: '#f1ecdd', y: '#f4d061', r: '#f2806c', g: '#a5e07f', b: '#93c6f2', o: '#f4a85a', p: '#f3a3bb', k: '#25332b' };
  var ARTICLE = { der: CHALK.b, die: CHALK.r, das: CHALK.g };
  var HAND = 'Kalam', NOTE = 'Caveat';
  var CREAM = '#f3ead3', MUSTARD = '#e0a93b', INK = COL.INK, RED = COL.RED;

  // ───────────────────────── utils ─────────────────────────
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sat(x) { return clamp(x, 0, 1); }
  function smooth(x) { x = sat(x); return x * x * (3 - 2 * x); }
  function ease(x) { x = sat(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function easeOut(x) { x = sat(x); return 1 - Math.pow(1 - x, 3); }
  function easeOutBack(x) { x = sat(x); var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function svgImage(str) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function (e) { root.__badSvg = str; rej(new Error('svg image failed (' + str.length + ' chars)')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
    });
  }
  var MC = mk(4, 4).getContext('2d');
  function measure(text, font) { MC.font = font; return MC.measureText(text).width; }
  function wrap(text, font, maxW) {
    var words = String(text).split(/\s+/).filter(Boolean), lines = [], cur = '';
    words.forEach(function (w) {
      var tryL = cur ? cur + ' ' + w : w;
      if (cur && measure(tryL, font) > maxW) { lines.push(cur); cur = w; } else cur = tryL;
    });
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }
  function polyLen(p) { var L = 0; for (var i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
  // resample + hand wobble
  function handLine(pts, seed, step, wob) {
    var r = rng(seed), out = [];
    step = step || 6; wob = wob == null ? 0.8 : wob;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
      for (var k = 0; k < n; k++) { var t = k / n; out.push([a[0] + (b[0] - a[0]) * t + (r() - 0.5) * wob, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * wob]); }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  function prefix(pts, p) { // polyline prefix by length fraction → {pts, tip, ang}
    if (p >= 1) { var n = pts.length; return { pts: pts, tip: pts[n - 1], ang: Math.atan2(pts[n - 1][1] - pts[n - 2 >= 0 ? n - 2 : 0][1], pts[n - 1][0] - pts[Math.max(0, n - 2)][0]) }; }
    var L = polyLen(pts) * Math.max(0, p), acc = 0, out = [pts[0]];
    for (var i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + d >= L) { var f = d ? (L - acc) / d : 0; var q = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; out.push(q); return { pts: out, tip: q, ang: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]) }; }
      acc += d; out.push(pts[i]);
    }
    return { pts: out, tip: out[out.length - 1], ang: 0 };
  }
  function pathOf(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }
  function catmull(pts, steps) { return MeloB._util.catmull(pts, steps || 6, false); }
  function rrectPts(x, y, w, h, r) {
    var p = [], seg = function (cx, cy, a0, a1) { for (var i = 0; i <= 6; i++) { var a = (a0 + (a1 - a0) * i / 6) * Math.PI / 180; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    seg(x + w - r, y + r, -90, 0); seg(x + w - r, y + h - r, 0, 90); seg(x + r, y + h - r, 90, 180); seg(x + r, y + r, 180, 270); p.push([x + w - r, y]);
    return p;
  }

  // ───────────────────────── state ─────────────────────────
  var E = { ready: false };

  // ───────────────────────── chalk drawing ─────────────────────────
  function chalkStroke(ctx, pts, w, color, alpha) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = (alpha == null ? 1 : alpha) * 0.95;
    ctx.strokeStyle = color; ctx.lineWidth = w;
    pathOf(ctx, pts); ctx.stroke();
    ctx.globalAlpha = (alpha == null ? 1 : alpha) * 0.35; ctx.lineWidth = w * 1.7;
    ctx.translate(w * 0.12, w * 0.1); pathOf(ctx, pts); ctx.stroke();
    ctx.restore();
  }
  function hatchFill(ctx, pts, color, alpha, gap, seed) {
    var xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    var r = rng(seed || 3);
    ctx.save(); pathOf(ctx, pts); ctx.closePath(); ctx.clip();
    ctx.globalAlpha = alpha * 0.28; ctx.fillStyle = color; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.globalAlpha = alpha * 0.85; ctx.strokeStyle = color; ctx.lineWidth = gap * 0.42; ctx.lineCap = 'round';
    ctx.beginPath();
    var D = (x1 - x0) + (y1 - y0);
    for (var o = -D; o < D; o += gap) { var j = (r() - 0.5) * gap * 0.5; ctx.moveTo(x0 + o + j, y1 + 4); ctx.lineTo(x0 + o + j + (y1 - y0) + 8, y0 - 4); }
    ctx.stroke(); ctx.restore();
  }
  // bake text lines into a chalk bitmap. lines: [{text, x, y}] world coords; colorFn(lineIndex, charIndex) optional runs
  function bakeText(lines, font, color, runs) {
    var BS = E.BS, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, fs = parseFloat(font.match(/(\d+(\.\d+)?)px/)[1]);
    lines.forEach(function (l) { x0 = Math.min(x0, l.x - fs * 0.3); x1 = Math.max(x1, l.x + l.w + fs * 0.4); y0 = Math.min(y0, l.y - fs * 1.15); y1 = Math.max(y1, l.y + fs * 0.5); });
    var c = mk((x1 - x0) * BS, (y1 - y0) * BS), g = c.getContext('2d');
    g.setTransform(BS, 0, 0, BS, -x0 * BS, -y0 * BS);
    g.font = font; g.textBaseline = 'alphabetic';
    if (!E.inkMode) { g.shadowColor = 'rgba(240,236,220,0.22)'; g.shadowBlur = 5 * BS; }
    lines.forEach(function (l, li) {
      if (runs && runs[li]) {
        var x = l.x;
        runs[li].forEach(function (r) { g.fillStyle = r.color; g.fillText(r.text, x, l.y); x += measure(r.text, font); });
      } else { g.fillStyle = color; g.fillText(l.text, l.x, l.y); }
    });
    return { c: c, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function textLines(strs, font, x, yBase, lh, align, boxW) {
    return strs.map(function (s, i) {
      var w = measure(s, font), lx = align === 'center' ? x + (boxW - w) / 2 : align === 'right' ? x + boxW - w : x;
      var cum = [0]; for (var k = 1; k <= s.length; k++) cum.push(measure(s.slice(0, k), font));
      return { text: s, x: lx, y: yBase + i * lh, w: w, cum: cum };
    });
  }
  // a text part (handwriting reveal)
  function TextPart(lines, font, color, t0, dur, runs) {
    var fs = parseFloat(font.match(/(\d+(\.\d+)?)px/)[1]);
    var n = 0; lines.forEach(function (l) { n += l.text.length; });
    return { kind: 'text', lines: lines, font: font, fs: fs, t0: t0, t1: t0 + dur, n: n, bmp: bakeText(lines, font, color, runs) };
  }
  function drawText(ctx, p, t, bmp) {
    bmp = bmp || p.bmp;
    if (t < p.t0) return null;
    var prog = sat((t - p.t0) / (p.t1 - p.t0)), chars = prog * p.n, tip = null;
    if (prog >= 1) { ctx.drawImage(bmp.c, bmp.x, bmp.y, bmp.w, bmp.h); return null; }
    ctx.save(); ctx.beginPath();
    var acc = 0;
    for (var i = 0; i < p.lines.length; i++) {
      var l = p.lines[i], top = l.y - p.fs * 1.15, hh = p.fs * 1.65;
      if (chars >= acc + l.text.length) { ctx.rect(l.x - p.fs * 0.3, top, l.w + p.fs * 0.7, hh); }
      else {
        var k = chars - acc, ki = Math.floor(k), f = k - ki;
        var xr = l.x + lerp(l.cum[ki], l.cum[Math.min(ki + 1, l.text.length)], f);
        ctx.rect(l.x - p.fs * 0.3, top, xr - l.x + p.fs * 0.3, hh);
        // pen bobs along the letter
        tip = [xr, l.y - p.fs * (0.25 + 0.3 * Math.abs(Math.sin(f * Math.PI * 2.0)))];
        break;
      }
      acc += l.text.length;
    }
    ctx.clip();
    ctx.drawImage(bmp.c, bmp.x, bmp.y, bmp.w, bmp.h);
    ctx.restore();
    return tip;
  }
  function StrokePart(pts, w, color, t0, dur, seed, opts) {
    opts = opts || {};
    return { kind: 'stroke', pts: opts.raw ? pts : handLine(pts, seed || 1, opts.step || 6, opts.wob), w: w, color: color, t0: t0, t1: t0 + dur, alpha: opts.alpha };
  }
  function drawStroke(ctx, p, t) {
    if (t < p.t0) return null;
    var prog = p.t1 > p.t0 ? ease((t - p.t0) / (p.t1 - p.t0)) : 1, pr = prefix(p.pts, prog);
    chalkStroke(ctx, pr.pts, p.w, p.color, p.alpha);
    return prog < 1 ? pr.tip : null;
  }
  function FillPart(pts, color, t0, dur, seed) { return { kind: 'fill', pts: pts, color: color, t0: t0, t1: t0 + dur, seed: seed || 1 }; }
  function drawFill(ctx, p, t) { if (t < p.t0) return null; hatchFill(ctx, p.pts, p.color, smooth((t - p.t0) / (p.t1 - p.t0)), 7, p.seed); return null; }

  function drawParts(ctx, el, t) {
    var tip = null;
    for (var i = 0; i < el.parts.length; i++) {
      var p = el.parts[i], r = null;
      if (p.kind === 'text') r = drawText(ctx, p, t, p.alt && t >= p.altT ? p.alt : null);
      else if (p.kind === 'stroke') r = drawStroke(ctx, p, t);
      else if (p.kind === 'fill') r = drawFill(ctx, p, t);
      else if (p.kind === 'custom') r = p.draw(ctx, t);
      if (r && !p.noTip) tip = r;
    }
    return tip;
  }

  // ───────────────────────── layouts ─────────────────────────
  var LAYOUT = {
    board: { melo: { x: 455, y: 1046, s: 1.52 }, ca: { x0: 630, y0: 168, x1: 1840, y1: 794 } },
    split: { melo: { x: 400, y: 1120, s: 1.86 }, ca: { x0: 690, y0: 168, x1: 1840, y1: 794 } },
    melo: { melo: { x: 600, y: 1205, s: 2.36 }, ca: { x0: 1030, y0: 178, x1: 1836, y1: 790 } },
    title: { melo: { x: 1500, y: 1250, s: 2.7 }, ca: { x0: 650, y0: 178, x1: 1836, y1: 790 } }
  };

  // element blocks: measure at scale k → {w, h, build(x, y)}
  function block(el, k, CA) {
    var a = el.args || {}, T0 = el.appear, id = el.id, sd = hashStr(id);
    var maxW = (CA.x1 - CA.x0) * 0.94;
    function txt(type) {
      var k0 = k; if (type === 'wrong' || type === 'right' || type === 'title') k = Math.min(1, k * 1.22);
      var fs = { wrong: 118, right: 118, sentence: 98, title: 126, note: 76 }[type] * k, fam = type === 'note' || type === 'title' ? NOTE : HAND;
      var font = '700 ' + fs + 'px ' + fam, lh = fs * (fam === NOTE ? 1.0 : 1.18);
      var mw = type === 'note' ? Math.min(maxW * 0.6, 640 * k) : maxW - (type === 'right' ? 120 * k : 0);
      var strs = wrap(el.text, font, mw);
      var lw = Math.max.apply(0, strs.map(function (s) { return measure(s, font); }));
      var kUsed = k; k = k0;
      return { font: font, fs: fs, lh: lh, strs: strs, lw: lw, k: kUsed };
    }
    var t = el.type;
    if (t === 'wrong' || t === 'right' || t === 'sentence' || t === 'note' || t === 'title') {
      var m = txt(t);
      var w = m.lw + (t === 'right' ? 100 * k : 20 * k), h = m.strs.length * m.lh + m.fs * 0.35;
      return { w: t === 'title' ? maxW : w, h: h + (t === 'title' ? 24 * k : 0), build: function (x, y) {
        var parts = [], base = y + m.fs * 0.92;
        var color = t === 'note' ? CHALK.y : CHALK.w;
        var lines = textLines(m.strs, m.font, x, base, m.lh, t === 'title' ? 'center' : 'left', maxW);
        var dur = el.writeDur || 1;
        if (t === 'sentence' && a.highlight) {
          // runs: highlighted substring in yellow (baked as alternative bitmap, swapped at highlight time)
          var full = m.strs.join(' '), hi = String(a.highlight), idx = full.toLowerCase().indexOf(hi.toLowerCase());
          var tp = TextPart(lines, m.font, CHALK.w, T0, dur);
          if (idx >= 0) {
            var runs = [], off = 0;
            m.strs.forEach(function (s, li) {
              var a0 = clamp(idx - off, 0, s.length), a1 = clamp(idx + hi.length - off, 0, s.length), r = [];
              if (a0 > 0) r.push({ text: s.slice(0, a0), color: CHALK.w });
              if (a1 > a0) r.push({ text: s.slice(a0, a1), color: CHALK.y });
              if (a1 < s.length) r.push({ text: s.slice(a1), color: CHALK.w });
              runs.push(r);
              if (a1 > a0) {
                var L = lines[li], ux0 = L.x + L.cum[a0], ux1 = L.x + L.cum[a1], uy = L.y + m.fs * 0.16;
                parts.push(StrokePart([[ux0 - 4, uy + 2], [(ux0 + ux1) / 2, uy - 1], [ux1 + 6, uy + 1]], 5.5 * k, CHALK.y, (el.highlight || T0 + dur) + 0.05, 0.35, sd + li));
                parts.push(StrokePart([[ux0 + 6, uy + 9], [ux1 - 2, uy + 7]], 3.5 * k, CHALK.y, (el.highlight || T0 + dur) + 0.3, 0.25, sd + li + 9));
              }
              off += s.length + 1;
            });
            tp.alt = bakeText(lines, m.font, CHALK.w, runs); tp.altT = el.highlight || T0 + dur;
          }
          parts.unshift(tp);
        } else parts.push(TextPart(lines, m.font, color, T0, dur));
        var last = lines[lines.length - 1];
        if (t === 'wrong' && el.strike != null) {
          lines.forEach(function (L, li) {
            var ym = L.y - m.fs * 0.3, ts = el.strike + li * 0.18;
            parts.push(StrokePart([[L.x - 12 * k, ym + 6 * k], [L.x + L.w * 0.5, ym - 2 * k], [L.x + L.w + 14 * k, ym - 8 * k]], 7.5 * k, CHALK.r, ts, 0.3, sd + 11 + li));
            parts.push(StrokePart([[L.x + L.w + 8 * k, ym + 6 * k], [L.x + L.w * 0.45, ym + 10 * k], [L.x - 4 * k, ym + 2 * k]], 5 * k, CHALK.r, ts + 0.28, 0.22, sd + 19 + li));
          });
        }
        if (t === 'right' && el.tick != null) {
          var tx = last.x + last.w + 26 * k, ty = last.y, s = m.fs;
          parts.push(StrokePart([[tx, ty - s * 0.38], [tx + s * 0.24, ty - s * 0.06], [tx + s * 0.78, ty - s * 0.92]], 8.5 * k, CHALK.g, el.tick, 0.38, sd + 3, { step: 4 }));
          lines.forEach(function (L, li) {
            parts.push(StrokePart([[L.x - 6 * k, L.y + m.fs * 0.2], [L.x + L.w * 0.5, L.y + m.fs * 0.17], [L.x + L.w + 4 * k, L.y + m.fs * 0.21]], 4.5 * k, CHALK.g, el.tick + 0.3 + li * 0.15, 0.35, sd + 7 + li, { alpha: 0.85 }));
          });
        }
        if (t === 'title') {
          var ux0 = lines[0].x, ux1 = lines[0].x + lines[0].w, uy = last.y + m.fs * 0.22;
          parts.push(StrokePart(catmull([[ux0 - 10, uy + 4], [lerp(ux0, ux1, 0.35), uy - 3], [lerp(ux0, ux1, 0.7), uy + 3], [ux1 + 16, uy - 4]]), 6.5 * k, CHALK.y, T0 + dur + 0.05, 0.45, sd + 5));
        }
        return { parts: parts, box: { x: x, y: y, w: t === 'title' ? maxW : w, h: h }, lines: lines, fs: m.fs };
      } };
    }
    if (t === 'bubble') {
      var fsb = 74 * k, fontb = '700 ' + fsb + 'px ' + HAND, lhb = fsb * 1.16, padX = 30 * k, padY = 20 * k, tail = 34 * k;
      var sb = wrap(el.text, fontb, maxW * 0.66), lwb = Math.max.apply(0, sb.map(function (s) { return measure(s, fontb); }));
      var bw = lwb + 2 * padX, bh = sb.length * lhb + 2 * padY + fsb * 0.15;
      return { w: bw, h: bh + tail + 8 * k, side: a.who === 'right' ? 'right' : 'left', build: function (x, y) {
        var right = a.who === 'right', col = right ? CHALK.y : CHALK.w, r = 22 * k;
        var outline = rrectPts(x, y, bw, bh, r);
        var tx = right ? x + bw - 64 * k : x + 64 * k;
        var tl = right ? [[tx - 6 * k, y + bh], [tx + 26 * k, y + bh + tail], [tx - 34 * k, y + bh]] : [[tx + 6 * k, y + bh], [tx - 26 * k, y + bh + tail], [tx + 34 * k, y + bh]];
        var parts = [StrokePart(outline, 5 * k, col, T0, 0.45, sd + 1, { step: 8 }), StrokePart(tl, 5 * k, col, T0 + 0.4, 0.18, sd + 2)];
        var lines = textLines(sb, fontb, x + padX, y + padY + fsb * 0.95, lhb, 'left');
        parts.push(TextPart(lines, fontb, CHALK.w, T0 + 0.35, el.writeDur || 1));
        return { parts: parts, box: { x: x, y: y, w: bw, h: bh + tail }, lines: lines, fs: fsb };
      } };
    }
    if (t === 'list') {
      var fsl = 90 * k, fontl = '700 ' + fsl + 'px ' + HAND, lhl = fsl * 1.2, ind = 46 * k, gapl = 10 * k;
      var availH = (CA.y1 - CA.y0) - 150 * k;
      var nIt = (el.items || []).length, cols = 1;
      var oneH = nIt * (lhl + gapl);
      if (nIt > 5 && oneH > availH) cols = 2;
      var colW = cols === 2 ? (maxW - 40 * k) / 2 : maxW;
      var items = (el.items || []).map(function (it) { return { it: it, strs: wrap(it.text, fontl, colW - ind) }; });
      var per = Math.ceil(items.length / cols), lw = 0, hl = 0, colH = [0, 0];
      items.forEach(function (o, i) { var c = Math.floor(i / per); o.col = c; o.strs.forEach(function (s) { lw = Math.max(lw, measure(s, fontl)); }); colH[c] += o.strs.length * lhl + gapl; });
      hl = Math.max(colH[0], colH[1]);
      var bwl = cols === 2 ? maxW : lw + ind;
      return { w: bwl, h: hl + fsl * 0.2, build: function (x, y) {
        var parts = [], yy = [y, y];
        items.forEach(function (o, i) {
          var c = o.col, xx = x + c * (colW + 40 * k);
          if (o.it.t == null) { yy[c] += o.strs.length * lhl + gapl; return; }
          var t0 = o.it.t, base = yy[c] + fsl * 0.92;
          parts.push(StrokePart([[xx + 4 * k, base - fsl * 0.3], [xx + 26 * k, base - fsl * 0.33]], 7 * k, CHALK.y, t0, 0.15, sd + i));
          parts.push(TextPart(textLines(o.strs, fontl, xx + ind, base, lhl), fontl, CHALK.w, t0 + 0.1, o.it.dur || 1));
          yy[c] += o.strs.length * lhl + gapl;
        });
        return { parts: parts, box: { x: x, y: y, w: bwl, h: hl } };
      } };
    }
    if (t === 'icon') {
      var S = 270 * k;
      return { w: S, h: S, icon: true, build: function (x, y) {
        var ic = MeloIcons.get(a.name || el.text), sc = S / 100, parts = [], tot = 0;
        var strokes = ic.strokes.map(function (s) { var p = s.pts.map(function (q) { return [x + q[0] * sc, y + q[1] * sc]; }); var L = polyLen(p); tot += L; return { p: p, L: L, s: s }; });
        var t = T0, D = 0.85;
        strokes.forEach(function (o, i) {
          var d = Math.max(0.06, D * o.L / tot);
          parts.push(StrokePart(o.p, 5.2 * k * o.s.w, CHALK[o.s.col] || CHALK.w, t, d, sd + i, { step: 5, wob: 1.2 }));
          t += d;
        });
        ic.fills.forEach(function (f, i) {
          parts.unshift(FillPart(f.pts.map(function (q) { return [x + q[0] * sc, y + q[1] * sc]; }), CHALK[f.col] || CHALK.w, T0 + D * 0.7, 0.5, sd + 30 + i));
        });
        return { parts: parts, box: { x: x, y: y, w: S, h: S } };
      } };
    }
    if (t === 'word') {
      var cw = 460 * k, ch = 236 * k;
      return { w: cw + 20 * k, h: ch + 20 * k, paper: true, build: function (x, y) {
        var art = String(a.article || '').toLowerCase(), word = a.word || el.text, plural = a.plural ? 'die ' + a.plural : '';
        var rot = ((sd % 7) - 3) * 0.7;
        var part = { kind: 'custom', paper: true, t0: T0, t1: T0 + 0.5, noTip: true, draw: function (ctx, t) {
          if (t < T0) return null;
          var p = easeOutBack((t - T0) / 0.35), cx = x + cw / 2, cy = y + ch / 2;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180); ctx.scale(lerp(1.35, 1, p), lerp(1.35, 1, p)); ctx.globalAlpha = sat((t - T0) / 0.12);
          ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-cw / 2 + 10 * k, -ch / 2 + 12 * k, cw, ch);
          ctx.fillStyle = '#efe6cf'; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
          ctx.strokeStyle = 'rgba(196,61,51,.45)'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(-cw / 2, -ch / 2 + 54 * k); ctx.lineTo(cw / 2, -ch / 2 + 54 * k); ctx.stroke();
          ctx.strokeStyle = 'rgba(80,110,160,.25)'; ctx.lineWidth = 1.5 * k;
          for (var yy = -ch / 2 + 92 * k; yy < ch / 2; yy += 36 * k) { ctx.beginPath(); ctx.moveTo(-cw / 2, yy); ctx.lineTo(cw / 2, yy); ctx.stroke(); }
          ctx.strokeStyle = INK; ctx.lineWidth = 3 * k; ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);
          var acol = { der: '#2f6fb3', die: '#c43d33', das: '#3f7d2f' }[art] || INK;
          ctx.textAlign = 'center'; ctx.fillStyle = acol; ctx.font = '700 ' + (40 * k) + 'px Oswald';
          ctx.fillText(art.toUpperCase(), 0, -ch / 2 + 42 * k);
          ctx.fillStyle = INK; ctx.font = '900 ' + (66 * k) + 'px Fraunces'; ctx.fillText(word, 0, 26 * k);
          if (plural) { ctx.font = '700 ' + (38 * k) + 'px Caveat'; ctx.fillStyle = '#5a4a3a'; ctx.fillText(plural, 0, 80 * k); }
          ctx.fillStyle = acol; ctx.beginPath(); ctx.arc(-cw / 2 + 26 * k, -ch / 2 + 18 * k, 10 * k, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore(); return null;
        } };
        return { parts: [part], box: { x: x, y: y, w: cw, h: ch } };
      } };
    }
    if (t === 'quiz') return quizBlock(el, k, CA);
    return { w: 10, h: 10, build: function (x, y) { return { parts: [], box: { x: x, y: y, w: 10, h: 10 } }; } };
  }

  function paperTag(ctx, x, y, w, h, rot, fill, label, font, color, p) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180);
    var s = lerp(1.5, 1, easeOutBack(p)); ctx.scale(s, s); ctx.globalAlpha = sat(p * 5);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-w / 2 + 7, -h / 2 + 9, w, h);
    ctx.fillStyle = fill; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = INK; ctx.lineWidth = 3.2; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font; ctx.fillStyle = color; ctx.fillText(label, 0, 2);
    ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(0, -h / 2 + 2, 8, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  function quizBlock(el, k, CA) {
    var T0 = el.appear, sd = hashStr(el.id);
    var cw = CA.x1 - CA.x0, chh = CA.y1 - CA.y0;
    return { w: cw, h: chh, build: function (x, y) {
      var parts = [], R = 92;
      R = 128; var ringX = x + cw - R - 30, ringY = y + chh * 0.6;
      // header tag
      parts.push({ kind: 'custom', paper: true, noTip: true, t0: T0, t1: T0 + 0.4, draw: function (ctx, t) {
        if (t < T0) return null;
        paperTag(ctx, x + 175, y + 38, 320, 78, -4, MUSTARD, 'KERNFRAGE', '700 48px Oswald', INK, (t - T0) / 0.35); return null;
      } });
      var fq = 80, fontq = '700 ' + fq + 'px ' + HAND, qs = wrap(el.q, fontq, cw - 40);
      var ql = textLines(qs, fontq, x + 10, y + 165, fq * 1.12);
      var t = T0 + 0.35, dq = Math.min(2.2, 0.25 + el.q.length * 0.045);
      parts.push(TextPart(ql, fontq, CHALK.w, t, dq)); t += dq + 0.2;
      var oy = ql[ql.length - 1].y + 130, fo = 80, fonto = '700 ' + fo + 'px ' + HAND, rows = [];
      el.options.forEach(function (o, i) {
        var cy = oy + i * 118, cx = x + 52;
        var circle = []; for (var q = 0; q <= 30; q++) { var a = -1.7 + q / 30 * 6.5; circle.push([cx + 40 * Math.cos(a), cy - 26 + 40 * Math.sin(a)]); }
        parts.push(StrokePart(circle, 4.5, CHALK.y, t, 0.3, sd + i * 3));
        var lt = textLines(['ABC'[i] || String(i + 1)], '700 52px Oswald', cx - 15, cy - 7, 52);
        parts.push(TextPart(lt, '700 52px Oswald', CHALK.y, t + 0.15, 0.15));
        var ot = textLines([o], fonto, cx + 72, cy, fo);
        parts.push(TextPart(ot, fonto, CHALK.w, t + 0.25, Math.min(1.2, 0.2 + o.length * 0.05)));
        rows.push({ x: cx - 50, y: cy - 80, w: 90 + 72 + ot[0].w + 20, h: 110, cy: cy, tx: cx + 72, tw: ot[0].w });
        t += 0.6 + Math.min(1.2, o.length * 0.05);
      });
      // countdown ring
      var cs = el.countdown, ce = el.countdownEnd || (cs + el.seconds);
      parts.push({ kind: 'custom', noTip: true, t0: cs, t1: ce, draw: function (ctx, tt) {
        if (cs == null || tt < Math.min(cs - 0.6, T0 + 1.5)) return null;
        var appear = sat((tt - Math.min(cs - 0.6, T0 + 1.5)) / 0.5);
        ctx.save();
        ctx.globalAlpha = appear * 0.35; ctx.strokeStyle = CHALK.w; ctx.lineWidth = 3; ctx.setLineDash([6, 10]);
        ctx.beginPath(); ctx.arc(ringX, ringY, R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        var rem = tt < cs ? 1 : sat(1 - (tt - cs) / (ce - cs));
        var done = el.reveal != null && tt >= el.reveal;
        ctx.globalAlpha = appear;
        if (!done) {
          var pts = [], a0 = -Math.PI / 2;
          for (var q = 0; q <= 60; q++) { var a = a0 + rem * Math.PI * 2 * q / 60; pts.push([ringX + R * Math.cos(a), ringY + R * Math.sin(a)]); }
          if (rem > 0.002) chalkStroke(ctx, pts, 11, rem < 0.3 ? CHALK.r : CHALK.y, 1);
          var n = tt < cs ? Math.round(el.seconds) : Math.max(1, Math.ceil((ce - tt) - 1e-6));
          var frac = tt < cs ? 0 : ((ce - tt) % 1), pop = tt < cs ? 1 : 1 + 0.25 * Math.pow(sat((frac - 0.75) / 0.25), 2);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '400 ' + Math.round(150 * pop) + 'px Anton';
          ctx.fillStyle = rem < 0.3 ? CHALK.r : CHALK.w; ctx.fillText(tt >= ce ? '0' : String(n), ringX, ringY + 6);
        } else {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 170px Caveat'; ctx.fillStyle = CHALK.g;
          ctx.globalAlpha = sat((tt - el.reveal) / 0.3); ctx.fillText('!', ringX, ringY + 6);
          chalkStroke(ctx, (function () { var p = []; for (var q = 0; q <= 60; q++) { var a = q / 60 * Math.PI * 2; p.push([ringX + R * Math.cos(a), ringY + R * Math.sin(a)]); } return p; })(), 9, CHALK.g, sat((tt - el.reveal) / 0.3));
        }
        ctx.restore(); return null;
      } });
      // [[highlight id=q option=i]]: marker sweep behind the option being read
      if (el.optHi && el.optHi.length) parts.unshift({ kind: 'custom', noTip: true, t0: el.optHi[0].t, t1: el.optHi[0].t + 0.3, draw: function (ctx, tt) {
        var cur = null; el.optHi.forEach(function (h) { if (h.t <= tt) cur = h; });
        if (!cur || (el.reveal != null && tt >= el.reveal) || (el.countdown != null && tt >= el.countdown)) return null;
        var ro = rows[cur.i]; if (!ro) return null;
        var a = sat((tt - cur.t) / 0.25);
        ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#f4d061'; ctx.fillRect(ro.x, ro.y + 12, (ro.w + 40) * ease(a), ro.h - 16); ctx.restore();
        return null;
      } });
      // reveal: circle the right answer, dim the others
      if (el.reveal != null) {
        var rr = rows[el.answer];
        if (rr) {
          var ell = []; for (var q = 0; q <= 40; q++) { var a = -2.6 + q / 40 * 6.9; ell.push([rr.tx + rr.tw / 2 - 30 + (rr.tw / 2 + 140) * Math.cos(a), rr.cy - 26 + 66 * Math.sin(a)]); }
          parts.push(StrokePart(ell, 6.5, CHALK.y, el.reveal + 0.05, 0.5, sd + 77));
          var tx = rr.tx + rr.tw + 70, ty = rr.cy;
          parts.push(StrokePart([[tx, ty - 22], [tx + 16, ty], [tx + 52, ty - 56]], 9, CHALK.g, el.reveal + 0.5, 0.3, sd + 78));
          rows.forEach(function (ro, i) {
            if (i === el.answer) return;
            parts.push({ kind: 'custom', noTip: true, t0: el.reveal, t1: el.reveal + 0.4, draw: function (ctx, tt) {
              if (tt < el.reveal) return null;
              ctx.save(); ctx.globalAlpha = 0.55 * sat((tt - el.reveal) / 0.4); ctx.fillStyle = '#25332b';
              ctx.fillRect(ro.x, ro.y, ro.w + 40, ro.h); ctx.restore(); return null;
            } });
          });
        }
      }
      return { parts: parts, box: { x: x, y: y, w: cw, h: chh } };
    } };
  }

  // auto layout per scene: first fit with time-aware occupancy, shrink until everything fits
  function layoutScene(sc, els) {
    CHALK = isBoardScene(sc) ? CHALK_BOARD : INKP; E.inkMode = !isBoardScene(sc);
    try { layoutScene0(sc, els); } finally { CHALK = CHALK_BOARD; E.inkMode = false; }
  }
  function layoutScene0(sc, els) {
    var L = LAYOUT[sc.layout] || LAYOUT.board, CA = L.ca, best = null;
    // icons are placed last (they then move next to the element they illustrate)
    els = els.filter(function (e) { return e.type !== 'icon'; }).concat(els.filter(function (e) { return e.type === 'icon'; }));
    var scales = [1, 0.92, 0.85, 0.78, 0.72, 0.66, 0.6, 0.55];
    for (var si = 0; si < scales.length; si++) {
      var k = scales[si], placed = [], ok = true, prevMain = null;
      for (var i = 0; i < els.length; i++) {
        var el = els[i], b = block(el, k, CA), from = el.appear, to = el.eraseEnd != null ? el.eraseEnd : 1e9;
        var gap = 22 * k;
        var conflicts = function (x, y, w, h) {
          if (x < CA.x0 - 1 || x + w > CA.x1 + 1 || y < CA.y0 - 1 || y + h > CA.y1 + 1) return true;
          for (var j = 0; j < placed.length; j++) {
            var p = placed[j];
            if (p.to <= from || p.from >= to) continue;
            if (x < p.x + p.w + gap && x + w + gap > p.x && y < p.y + p.h + gap && y + h + gap > p.y) return true;
          }
          return false;
        };
        var pos = null;
        if (el.type === 'quiz') pos = [CA.x0, CA.y0];
        else if (el.type === 'icon') {
          var cands = [[CA.x1 - b.w, CA.y0], [CA.x1 - b.w, CA.y0 + 200 * k], [CA.x0, CA.y0]];
          for (var c = 0; c < cands.length && !pos; c++) if (!conflicts(cands[c][0], cands[c][1], b.w, b.h)) pos = cands[c];
        } else if (el.type === 'note' && prevMain) {
          var nx = prevMain.x + prevMain.w + 120 * k, ny = prevMain.y + Math.max(0, (prevMain.h - b.h) / 2);
          if (!conflicts(nx, ny, b.w, b.h)) pos = [nx, ny];
          if (!pos) for (var yy = prevMain.y + prevMain.h + gap; yy + b.h <= CA.y1; yy += 8) if (!conflicts(CA.x0 + 120 * k, yy, b.w, b.h)) { pos = [CA.x0 + 120 * k, yy]; break; }
        } else if (el.type === 'title') {
          if (!conflicts(CA.x0, CA.y0, b.w, b.h)) pos = [CA.x0, CA.y0];
        }
        if (!pos) {
          var x0 = el.type === 'bubble' && b.side === 'right' ? CA.x1 - b.w - 10 * k : CA.x0 + (el.type === 'bubble' ? 10 * k : 0);
          var half = (CA.x1 - CA.x0) / 2, xR = CA.x0 + half + 24 * k, twoCol = el.type !== 'bubble' && b.w <= half - 24 * k;
          // continue below the newest element still on the board (same column), else first free slot
          var cursor = CA.y0, curX = x0;
          for (var q = placed.length - 1; q >= 0; q--) { var pq = placed[q]; if (pq.to > from && pq.el.type !== 'icon' && pq.el.type !== 'note') { cursor = pq.y + pq.h + gap; if (twoCol && pq.x >= xR - 1) curX = xR; break; } }
          if (el.type === 'bubble' && b.side === 'right' && prevMain && prevMain.el.type === 'bubble' && prevMain.b.side !== 'right') cursor = prevMain.y + prevMain.h * 0.55;
          var tries = [[curX, cursor], [x0, CA.y0]];
          if (twoCol) tries.push([xR, CA.y0]);
          for (var tr = 0; tr < tries.length && !pos; tr++)
            for (var y = tries[tr][1]; y + b.h <= CA.y1 + 0.5; y += 8) if (!conflicts(tries[tr][0], y, b.w, b.h)) { pos = [tries[tr][0], y]; break; }
        }
        if (!pos) { ok = false; pos = [CA.x0, Math.max(CA.y0, CA.y1 - b.h)]; }
        var rec = { el: el, b: b, x: pos[0], y: pos[1], w: b.w, h: b.h, from: from, to: to };
        placed.push(rec);
        if (el.type !== 'note' && el.type !== 'icon') prevMain = rec;
        if (el.type === 'note') rec.target = prevMain && prevMain !== rec ? prevMain : null;
      }
      best = { k: k, placed: placed };
      if (ok) break;
    }
    if (best && best.k < 1) console.warn('layout: scene', sc.i, 'shrunk to', best.k);
    var P = best.placed, kq = best.k;
    function freeAt(rec, x, y) {
      if (x < CA.x0 || x + rec.w > CA.x1 || y < CA.y0 || y + rec.h > CA.y1) return false;
      for (var j = 0; j < P.length; j++) { var o = P[j]; if (o === rec || o.to <= rec.from || o.from >= rec.to) continue; if (x < o.x + o.w + 16 && x + rec.w + 16 > o.x && y < o.y + o.h + 16 && y + rec.h + 16 > o.y) return false; }
      return true;
    }
    // icons sit right next to the element they illustrate (the next text element)
    P.forEach(function (rec, i) {
      if (rec.el.type !== 'icon') return;
      var tgt = P.filter(function (o) { return o.el.type !== 'icon' && o.el.type !== 'note' && o.from >= rec.from - 0.01 && o.from < rec.to; }).sort(function (a, b) { return a.from - b.from; })[0];
      if (!tgt) return;
      for (var cx = tgt.x + tgt.w + 40 * kq; cx + rec.w <= CA.x1; cx += 30) {
        var ys = [tgt.y + tgt.h / 2 - rec.h / 2, tgt.y - 10, tgt.y + tgt.h - rec.h];
        for (var c = 0; c < ys.length; c++) { var yy = Math.max(CA.y0, ys[c]); if (freeAt(rec, cx, yy)) { rec.x = cx; rec.y = yy; return; } }
      }
    });
    // centre the whole block horizontally (if it does not fill the width)
    if (P.length && P[0].el.type !== 'quiz') {
      var bx0 = 1e9, bx1 = -1e9;
      P.forEach(function (o) { bx0 = Math.min(bx0, o.x); bx1 = Math.max(bx1, o.x + o.w); });
      var dx = Math.max(0, ((CA.x1 - CA.x0) - (bx1 - bx0)) / 2 * 0.8);
      P.forEach(function (o) { o.x += dx; });
    }
    // vertical balance: push a sparse board a bit down
    var bottom = 0, top = 1e9;
    best.placed.forEach(function (p) { bottom = Math.max(bottom, p.y + p.h); top = Math.min(top, p.y); });
    var dy = best.placed.length && best.placed[0].el.type !== 'quiz' ? Math.max(0, (CA.y1 - bottom) * 0.42) : 0;
    best.placed.forEach(function (p) {
      var r = p.b.build(p.x, p.y + dy);
      p.el.parts = r.parts; p.el.box = r.box; p.el.k = best.k;
      var sdd = hashStr(p.el.id), kk = best.k;
      if (p.el.strike != null && p.el.type !== 'wrong') {
        var Ls = r.lines || [{ x: r.box.x + 10, y: r.box.y + r.box.h * 0.62, w: r.box.w - 20 }], fsS = r.fs || r.box.h * 0.5;
        Ls.forEach(function (L, li) {
          var ym = L.y - fsS * 0.3, ts = p.el.strike + li * 0.18;
          r.parts.push(StrokePart([[L.x - 12 * kk, ym + 6 * kk], [L.x + L.w * 0.5, ym - 2 * kk], [L.x + L.w + 14 * kk, ym - 8 * kk]], 7.5 * kk, CHALK.r, ts, 0.3, sdd + 11 + li));
          r.parts.push(StrokePart([[L.x + L.w + 8 * kk, ym + 6 * kk], [L.x + L.w * 0.45, ym + 10 * kk], [L.x - 4 * kk, ym + 2 * kk]], 5 * kk, CHALK.r, ts + 0.28, 0.22, sdd + 19 + li));
        });
      }
      if (p.el.tick != null && p.el.type !== 'right') {
        var bx = r.box.x + r.box.w + 18 * kk, by = r.box.y + Math.min(r.box.h, 90 * kk) * 0.8, sT = 70 * kk;
        r.parts.push(StrokePart([[bx, by - sT * 0.38], [bx + sT * 0.24, by - sT * 0.06], [bx + sT * 0.78, by - sT * 0.92]], 8.5 * kk, CHALK.g, p.el.tick, 0.38, sdd + 3, { step: 4 }));
      }
      if (p.el.type === 'note' && p.target && Math.hypot((p.target.x + p.target.w) - r.box.x, (p.target.y + p.target.h / 2 + dy) - (r.box.y + r.box.h / 2)) < 420) {
        // arrow from the note to its target
        var tb = { x: p.target.x, y: p.target.y + dy, w: p.target.w, h: p.target.h }, nb = r.box, T1 = p.el.appear + (p.el.writeDur || 1);
        var a0, a1;
        if (nb.x > tb.x + tb.w) { a0 = [nb.x - 14, nb.y + nb.h * 0.5]; a1 = [tb.x + tb.w + 10, tb.y + tb.h * 0.45]; }
        else { a0 = [nb.x - 16, nb.y + nb.h * 0.4]; a1 = [Math.min(tb.x + 60, nb.x - 50), tb.y + tb.h + 6]; }
        var mid = [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2 + (nb.x > tb.x + tb.w ? -40 : 10)];
        var shaft = catmull([a0, mid, a1], 8), n = shaft.length, ang = Math.atan2(a1[1] - shaft[n - 3][1], a1[0] - shaft[n - 3][0]);
        var hl = 22 * best.k;
        p.el.parts.push(StrokePart(shaft, 4 * best.k, CHALK.w, T1, 0.35, hashStr(p.el.id) + 5));
        p.el.parts.push(StrokePart([[a1[0] - hl * Math.cos(ang - 0.5), a1[1] - hl * Math.sin(ang - 0.5)], a1, [a1[0] - hl * Math.cos(ang + 0.5), a1[1] - hl * Math.sin(ang + 0.5)]], 4 * best.k, CHALK.w, T1 + 0.33, 0.15, hashStr(p.el.id) + 6));
      }
    });
  }

  // ───────────────────────── eraser ─────────────────────────
  function eraserPath(box, seed) {
    var r = rng(seed), pad = 30, x0 = box.x - pad, x1 = box.x + box.w + pad, y0 = box.y - 10, y1 = box.y + box.h + 10;
    var rows = Math.max(1, Math.ceil((y1 - y0) / 95)), pts = [], rh = (y1 - y0) / rows;
    for (var i = 0; i < rows; i++) {
      var y = y0 + rh * (i + 0.5), ltr = i % 2 === 0, n = 18;
      for (var q = 0; q <= n; q++) {
        var f = q / n, x = ltr ? lerp(x0, x1, f) : lerp(x1, x0, f);
        pts.push([x, y + Math.sin(f * Math.PI) * (ltr ? -16 : 16) + (r() - 0.5) * 6]);
      }
    }
    return { pts: pts, w: rh * 1.45 + 12 };
  }
  function boxUnion(boxes) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    boxes.forEach(function (b) { if (!b) return; x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); });
    return x1 < x0 ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  // ───────────────────────── camera ─────────────────────────
  function sceneAt(t) {
    if (E.sceneOverride) return E.sceneOverride;
    var sc = E.scenes[0];
    for (var i = 0; i < E.scenes.length; i++) if (E.scenes[i].tStart <= t) sc = E.scenes[i];
    return sc;
  }
  function meloPos(t) {
    var sc = sceneAt(t), L = (LAYOUT[sc.layout] || {}).melo || null, i = E.scenes.indexOf(sc);
    if (L && i > 0 && sc.transition !== 'ink' && !sc.isShot) {
      var prev = E.scenes[i - 1], P = (LAYOUT[prev.layout] || {}).melo;
      if (prev.layout === 'title' || !P) return L;
      var p = ease((t - sc.tStart - (sc.transition === 'erase' ? 0.15 : 0)) / 0.95);
      if (p < 1) return { x: lerp(P.x, L.x, p), y: lerp(P.y, L.y, p) - Math.sin(p * Math.PI) * 10, s: lerp(P.s, L.s, p) };
    }
    return L;
  }
  function fitFrame(r, safeBottom) {
    var h = Math.max(r.h / (safeBottom ? 0.84 : 1), (r.w * 9 / 16)), w = h * 16 / 9;
    return { cx: r.x + r.w / 2, cy: r.y + r.h / 2 + (safeBottom ? h * 0.06 : 0), w: w };
  }
  function visibleBoxes(sc, t) {
    return E.els.filter(function (e) { return e.scene === sc.i && e.appear <= t + 0.4 && (e.eraseEnd == null || e.eraseEnd > t) && e.box; }).map(function (e) { return e.box; });
  }
  function shotFrame(k, t) {
    var sc = sceneAt(t), L = LAYOUT[sc.layout] || LAYOUT.board, M = meloPos(t) || { x: 330, y: 1044, s: 0.84 }, CA = L.ca;
    var head = E.headY || -385;
    switch (k.shot) {
      case 'melo': {
        var h = 385 * M.s, w = Math.max(sc.isShot ? 980 : 760, h * 16 / 9);
        return { cx: M.x + 0.22 * w, cy: M.y + (head + 95) * M.s, w: w };
      }
      case 'board': {
        // visible chalk + Melo's upper body at the board edge, as tight as the content allows
        var vb = boxUnion(visibleBoxes(sc, t)) || { x: CA.x0, y: CA.y0 + 120, w: 520, h: 200 };
        var hx0 = M.x - 120 * M.s, hy0 = M.y + (head - 110) * M.s;
        var x0 = Math.min(vb.x - 60, hx0), x1 = Math.max(vb.x + vb.w + 70, x0 + 1150);
        var y0 = Math.min(vb.y - 60, hy0, GEO.board.y - 50), y1 = Math.max(vb.y + vb.h + 50, y0 + 1150 * 9 / 16 * 0.84);
        if (sc.layout === 'melo') { x0 = Math.max(x0, CA.x0 - 260); }
        return fitFrame({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, true);
      }
      case 'close': {
        var el = k.focus && E.byId[k.focus];
        var b = el && el.box ? el.box : boxUnion(visibleBoxes(sc, t));
        if (!b) return shotFrame({ shot: 'board' }, t);
        if (el && el.type === 'quiz') return fitFrame({ x: b.x - 60, y: b.y - 50, w: b.w + 100, h: b.h + 70 }, false);
        var f = fitFrame({ x: b.x - 90, y: b.y - 70, w: b.w + 180, h: b.h + 140 }, true);
        f.w = Math.max(f.w, 1250); return f;
      }
      default: {
        // wide: Melo (head to knees) + everything on the board, never wider than the set
        if (sc.layout === 'melo') return { cx: 960, cy: 540, w: 1920 };
        var vbw = boxUnion(visibleBoxes(sc, t));
        var wx0 = M.x - 150 * M.s, wy0 = M.y + (head - 120) * M.s, wx1 = M.x + 150 * M.s, wy1 = M.y - 175 * M.s;
        if (vbw) { wx0 = Math.min(wx0, vbw.x - 70); wy0 = Math.min(wy0, vbw.y - 70); wx1 = Math.max(wx1, vbw.x + vbw.w + 70); wy1 = Math.max(wy1, vbw.y + vbw.h + 60); }
        else wx1 = Math.max(wx1, CA.x0 + 600);
        wy0 = Math.min(wy0, GEO.board.y - 60);
        var fw = fitFrame({ x: wx0, y: wy0, w: wx1 - wx0, h: wy1 - wy0 }, true);
        fw.w = clamp(fw.w, 1250, 1920);
        return fw;
      }
    }
  }
  function clampFrame(f) {
    var w = Math.min(1920, f.w), h = w * 9 / 16;
    return { cx: clamp(f.cx, w / 2, 1920 - w / 2), cy: clamp(f.cy, h / 2, 1080 - h / 2), w: w };
  }
  function mixFrame(a, b, p) { return { cx: lerp(a.cx, b.cx, p), cy: lerp(a.cy, b.cy, p), w: Math.exp(lerp(Math.log(a.w), Math.log(b.w), p)) }; }
  var CAM_DUR = 1.05;
  function camRaw(t) {
    var K = E.cam, i = -1;
    for (var j = 0; j < K.length; j++) if (K[j].t <= t) i = j;
    if (i < 0) return clampFrame(shotFrame(K[0], t));
    var target = clampFrame(shotFrame(K[i], t));
    var p = (t - K[i].t) / CAM_DUR;
    if (p >= 1 || !K[i].start) return target;
    return mixFrame(K[i].start, target, ease(p));
  }
  // depth of field: 1 while the camera holds a Melo close-up (background chalk + set go soft)
  function dofAt(t) {
    if (E.quizzes && E.quizzes.some(function (q) { return t >= q.appear && t <= (q.reveal || q.countdownEnd || q.appear) + 3; })) return 0;
    var K = E.cam, i = -1;
    for (var j = 0; j < K.length; j++) if (K[j].t <= t) i = j;
    if (i < 0) return K[0].shot === 'melo' ? 1 : 0;
    var cur = K[i].shot === 'melo' ? 1 : 0, prev = i > 0 && K[i - 1].shot === 'melo' ? 1 : 0;
    var d = lerp(prev, cur, ease((t - K[i].t) / CAM_DUR));
    // focus pull onto the board while the sponge wipes it
    (E.erases || []).forEach(function (er) { var f = Math.min(smooth((t - er.t0 + 0.45) / 0.4), smooth((er.t1 + 0.6 - t) / 0.4)); d *= 1 - f; });
    return d;
  }
  function camera(t) {
    var f = camRaw(t), K = E.cam, i = 0;
    for (var j = 0; j < K.length; j++) if (K[j].t <= t) i = j;
    var held = Math.max(0, t - (K[i] ? K[i].t : 0));
    // slow push-in while a shot holds + organic drift
    var push = 1 - 0.045 * smooth(held / 12);
    var w = f.w * push * (1 - 0.01 * (0.5 + 0.5 * Math.sin(t * 0.23)));
    var cx = f.cx + 7 * Math.sin(t * 0.19 + 1.3) + 3 * Math.sin(t * 0.57);
    var cy = f.cy + 5 * Math.sin(t * 0.15 + 0.4) + 2 * Math.sin(t * 0.71 + 2);
    if (E.shake) { var sh = E.shake(t); cx += sh[0]; cy += sh[1]; }
    return clampFrame({ cx: cx, cy: cy, w: w });
  }

  // ───────────────────────── Melo ─────────────────────────
  var BB = { x0: -215, y0: -560, x1: 215, y1: 40 };
  async function drawMelo(ctx, t, M, cam, opts) {
    opts = opts || {};
    // visible part only (camera frame → character coords)
    var fh = cam.w * 9 / 16, fx0 = cam.cx - cam.w / 2, fy0 = cam.cy - fh / 2;
    var vx0 = Math.max(BB.x0, (fx0 - M.x) / M.s), vx1 = Math.min(BB.x1, (fx0 + cam.w - M.x) / M.s);
    var vy0 = Math.max(BB.y0, (fy0 - M.y) / M.s), vy1 = Math.min(BB.y1, (fy0 + fh - M.y) / M.s);
    if (vx1 <= vx0 || vy1 <= vy0) return null;
    var fr = E.rig.render(t, { boardSide: opts.boardSide || 'right', board: opts.board != null ? opts.board : !opts.title, visible: [vx0, vy0, vx1, vy1] });
    var g = fr.svg;
    var zoom = 1920 / cam.w * E.scale, ps = M.s * zoom;
    var pw = Math.ceil((vx1 - vx0) * ps), ph = Math.ceil((vy1 - vy0) * ps);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + pw + '" height="' + ph + '" viewBox="' + vx0.toFixed(2) + ' ' + vy0.toFixed(2) + ' ' + (pw / ps).toFixed(2) + ' ' + (ph / ps).toFixed(2) + '">' + g + '</svg>';
    var img = await svgImage(svg);
    // contact shadow
    ctx.drawImage(img, M.x + vx0 * M.s, M.y + vy0 * M.s, pw / ps * M.s, ph / ps * M.s);
    return fr;
  }

  // ───────────────────────── board content ─────────────────────────
  function drawBoard(ctx, t, cam, surf) {
    // surf (optional): an ink surface of a non-board shot {rect, cc, cg, BS, scene, ink:true}
    var ink = !!surf, sl = surf ? surf.rect : GEO.slate, BS = surf ? surf.BS : E.BS, cc = surf ? surf.cc : E.cc, g = surf ? surf.cg : E.cg;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cc.width, cc.height);
    g.setTransform(BS, 0, 0, BS, -sl.x * BS, -sl.y * BS);
    var vis = E.els.filter(function (e) {
      if (!(e.parts && e.appear <= t && (e.eraseEnd == null || t < e.eraseEnd) && e.layout !== 'title')) return false;
      return ink ? e.scene === surf.scene.i : isBoardScene(E.scenes[e.scene]);
    });
    if (ink && !vis.length) return;
    if (ink && surf.panel) {
      // paper card behind the ink writing (grows with the content)
      var u = boxUnion(vis.map(function (e) { return e.box; }));
      if (u) {
        var a0 = Math.min.apply(0, vis.map(function (e) { return e.appear; })), pp = easeOutBack((t - a0) / 0.35);
        ctx.save(); var pcx = u.x + u.w / 2, pcy = u.y + u.h / 2; ctx.translate(pcx, pcy); ctx.rotate(-0.012); ctx.scale(lerp(0.85, 1, pp), lerp(0.85, 1, pp)); ctx.globalAlpha = sat((t - a0) / 0.15);
        var pw2 = u.w + 90, ph2 = u.h + 60;
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-pw2 / 2 + 9, -ph2 / 2 + 11, pw2, ph2);
        ctx.fillStyle = '#f1e8d0'; ctx.fillRect(-pw2 / 2, -ph2 / 2, pw2, ph2);
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.strokeRect(-pw2 / 2, -ph2 / 2, pw2, ph2);
        ctx.fillStyle = 'rgba(214,160,60,.85)'; ctx.save(); ctx.rotate(-0.06); ctx.fillRect(-60, -ph2 / 2 - 14, 120, 30); ctx.restore();
        ctx.restore();
      }
    }
    var erasing = vis.filter(function (e) { return e.erase != null && t >= e.erase && e.eraseBy !== 'ink'; });
    var normal = vis.filter(function (e) { return erasing.indexOf(e) < 0; });
    var tip = null, tipT = -1;
    function drawSet(list, paper) {
      list.forEach(function (e) {
        e.parts.forEach(function (p) {
          if (!!p.paper !== paper) return;
          var r = null;
          if (p.kind === 'text') r = drawText(g, p, t, p.alt && t >= p.altT ? p.alt : null);
          else if (p.kind === 'stroke') r = drawStroke(g, p, t);
          else if (p.kind === 'fill') r = drawFill(g, p, t);
          else if (p.kind === 'custom') r = p.draw(g, t);
          if (r && !p.noTip && p.t0 > tipT) { tip = r; tipT = p.t0; }
        });
      });
    }
    // residue haze from finished erases
    if (!ink) E.erases.forEach(function (er) {
      if (t < er.t1 || t > er.t1 + 3) return;
      g.save(); g.globalAlpha = 0.07 * (1 - (t - er.t1) / 3); g.strokeStyle = '#d8dccf'; g.lineWidth = er.w; g.lineCap = 'round'; g.lineJoin = 'round';
      pathOf(g, er.pts); g.stroke(); g.restore();
    });
    drawSet(erasing, false);
    // erase masks
    var sponge = null;
    if (!ink) E.erases.forEach(function (er) {
      if (t < er.t0 || t >= er.t1) return;
      var p = ease((t - er.t0) / (er.t1 - er.t0)), pr = prefix(er.pts, p);
      g.save(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = er.w; g.lineCap = 'round'; g.lineJoin = 'round';
      pathOf(g, pr.pts); g.stroke();
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.09; g.strokeStyle = '#d8dccf'; pathOf(g, pr.pts); g.stroke();
      g.restore();
      sponge = { x: pr.tip[0], y: pr.tip[1], er: er, p: p };
    });
    drawSet(normal, false);
    // chalk grain (boils at 8 fps)
    var bi = Math.floor(t * 8) % 4;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = ink ? 0.22 : 0.62; g.fillStyle = E.grainPat;
    g.translate((bi * 97) % 256, (bi * 61) % 256); g.fillRect(-256, -256, cc.width + 512, cc.height + 512);
    g.restore();
    drawSet(normal.concat(erasing), true);
    var dof = ink ? 0 : (E.dof || 0);
    if (dof > 0.01) {
      var sm = E.ccSmall, sg = E.ccSmallCtx;
      sg.clearRect(0, 0, sm.width, sm.height); sg.drawImage(cc, 0, 0, sm.width, sm.height);
      ctx.save(); ctx.globalAlpha = 1 - dof; ctx.drawImage(cc, sl.x, sl.y, cc.width / BS, cc.height / BS);
      ctx.globalAlpha = dof * 0.9; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(sm, sl.x, sl.y, cc.width / BS, cc.height / BS); ctx.restore();
    } else ctx.drawImage(cc, sl.x, sl.y, cc.width / BS, cc.height / BS);
    // chalk dust while erasing
    if (sponge) {
      var er = sponge.er, r = rng(er.seed), n = 90;
      ctx.save(); ctx.fillStyle = '#e9e6da';
      for (var i = 0; i < n; i++) {
        var ti = er.t0 + (er.t1 - er.t0) * (i / n), age = t - ti;
        if (age < 0 || age > 1.1) { r(); r(); r(); continue; }
        var pp = prefix(er.pts, ease(i / n)).tip, vx = (r() - 0.5) * 60, vy = 20 + r() * 40, sz = 1.5 + r() * 3;
        ctx.globalAlpha = 0.55 * (1 - age / 1.1);
        ctx.beginPath(); ctx.arc(pp[0] + vx * age, pp[1] + er.w * 0.3 + vy * age + 160 * age * age, sz, 0, 7); ctx.fill();
      }
      ctx.restore();
      // sponge
      var sw = 200, sh = 72, ang = Math.sin(sponge.p * 40) * 0.12 - 0.05;
      ctx.save(); ctx.translate(sponge.x, sponge.y); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-sw / 2 + 8, -sh / 2 + 10, sw, sh);
      ctx.drawImage(E.sponge, -sw / 2 - 10, -sh / 2 - 10, sw + 20, sh + 20);
      ctx.restore();
    }
    if (tip) { if (ink) drawPencil(ctx, tip, t); else drawChalkStick(ctx, tip, t); }
  }
  function drawPencil(ctx, tip, t) {
    ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(-0.95 + 0.05 * Math.sin(t * 21));
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(14, 4, 110, 16);
    ctx.fillStyle = '#e9c99a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, -8); ctx.lineTo(22, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#17130f'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(7, -2.6); ctx.lineTo(7, 2.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e2b13b'; ctx.fillRect(22, -8, 76, 16); ctx.fillStyle = '#a97b23'; ctx.fillRect(22, 3, 76, 5);
    ctx.fillStyle = '#a8a594'; ctx.fillRect(98, -8, 9, 16); ctx.fillStyle = '#d9877b'; ctx.fillRect(107, -8, 13, 16);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.strokeRect(22, -8, 98, 16);
    ctx.restore();
  }
  function drawChalkStick(ctx, tip, t) {
    ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(-0.62 + 0.06 * Math.sin(t * 23));
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(6, -2, 64, 15);
    ctx.fillStyle = '#f5f0e2'; ctx.fillRect(0, -7, 62, 14);
    ctx.fillStyle = '#d6d0bf'; ctx.fillRect(0, 2, 62, 5);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.strokeRect(0, -7, 62, 14);
    ctx.restore();
  }

  function drawChapterBadge(ctx, t) {
    var ch = null;
    for (var i = 0; i < E.chapters.length; i++) if (E.chapters[i].t <= t) ch = E.chapters[i];
    if (!ch || ch.kind !== 'item') return;
    var sc = sceneAt(t); if (sc.layout === 'title') return;
    var p = (t - ch.t) / 0.4;
    paperTag(ctx, GEO.board.x + 120, GEO.board.y - 6, 150, 56, -5, MUSTARD, 'NR. ' + ch.num, '400 38px Anton', INK, p);
  }

  // ───────────────────────── title card ─────────────────────────
  function titleLayout(el) {
    var txt = String(el.text || ''), m = txt.match(/^(Nummer|Nr\.?)\s*(\d+)\s*$/i);
    if (m) return { number: m[2], kicker: 'NUMMER' };
    var words = txt.toUpperCase().split(/\s+/), maxW = 1000, fs = 190, lines;
    for (; fs > 70; fs -= 6) {
      lines = []; var cur = '';
      words.forEach(function (w) { var tr = cur ? cur + ' ' + w : w; if (cur && measure(tr, '400 ' + fs + 'px Anton') > maxW) { lines.push(cur); cur = w; } else cur = tr; });
      lines.push(cur);
      if (lines.length <= 3 && lines.every(function (l) { return measure(l, '400 ' + fs + 'px Anton') <= maxW; })) break;
    }
    return { lines: lines, fs: fs };
  }
  async function drawTitleCard(ctx, t, sc) {
    var els = E.els.filter(function (e) { return e.scene === sc.i; });
    var dt = t - sc.tStart, z = 1.04 + 0.03 * smooth(dt / 20);
    var cam = { cx: 960 + 10 * Math.sin(t * 0.3), cy: 540 + 6 * Math.sin(t * 0.23), w: 1920 / z };
    // background (zoom drift)
    ctx.save(); camTransform(ctx, cam);
    ctx.drawImage(E.titleBg, -40, -22, 2000, 1125);
    ctx.save(); ctx.translate(1400, 470); ctx.rotate(t * 0.035); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.5;
    ctx.drawImage(E.rays, -1400, -1400, 2800, 2800); ctx.restore();
    var M = LAYOUT.title.melo, hy = M.y + (E.headY || -385) * M.s;
    // mustard disc behind Melo's head (banner motif)
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(M.x + 16, hy + 2, 330, 0, 7); ctx.fill();
    ctx.fillStyle = '#d9a23c'; ctx.beginPath(); ctx.arc(M.x + 6, hy - 10, 330, 0, 7); ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(23,19,15,.32)'; ctx.lineWidth = 2.4;
    for (var o = -700; o < 700; o += 13) { ctx.beginPath(); ctx.moveTo(M.x + o, hy + 340); ctx.lineTo(M.x + o + 400, hy - 60); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
    // shake on slams
    var shake = [0, 0];
    // title text
    els.forEach(function (el) {
      if (el.type === 'title' && t >= el.appear) {
        var L = el.titleL || (el.titleL = titleLayout(el));
        ctx.save(); camTransform(ctx, cam);
        if (L.number) {
          var p1 = (t - el.appear) / 0.3, p2 = (t - el.appear - 0.35) / 0.35;
          drawSlam(ctx, L.kicker, 120, 420, '400 120px Anton', CREAM, p1, 'left');
          drawSlam(ctx, L.number, 120, 860, '400 480px Anton', MUSTARD, p2, 'left');
          if (p2 > 0) { ctx.save(); ctx.globalAlpha = sat(p2 * 3); underlineInk(ctx, 130, 900, 520, hashStr(el.id)); ctx.restore(); }
        } else {
          var y = 285 + (3 - L.lines.length) * L.fs * 0.45, wi = 0;
          L.lines.forEach(function (line, li) {
            var x = 110, ws = line.split(' ');
            ws.forEach(function (w) {
              var p = (t - el.appear - wi * 0.17) / 0.3;
              var col = li === L.lines.length - 1 ? MUSTARD : CREAM;
              drawSlam(ctx, w, x, y, '400 ' + L.fs + 'px Anton', col, p, 'left');
              x += measure(w + ' ', '400 ' + L.fs + 'px Anton');
              wi++;
            });
            y += L.fs * 1.02;
          });
          var nW = wi;
          if (t > el.appear + nW * 0.17 + 0.2) { ctx.save(); ctx.globalAlpha = sat((t - el.appear - nW * 0.17 - 0.2) * 3); underlineInk(ctx, 112, y - L.fs * 0.78, Math.min(1000, measure(L.lines[L.lines.length - 1], '400 ' + L.fs + 'px Anton')), hashStr(el.id)); ctx.restore(); }
          el.titleBottom = y - L.fs * 0.78;
        }
        ctx.restore();
      }
    });
    // Melo
    ctx.save(); camTransform(ctx, cam);
    await drawMelo(ctx, t, LAYOUT.title.melo, cam, { title: true });
    ctx.restore();
    // notes as paper strips
    els.forEach(function (el, i) {
      if (el.type === 'title' || t < el.appear) return;
      var title = els.find(function (e) { return e.type === 'title'; });
      var y = title && title.titleBottom ? title.titleBottom + 92 : 800;
      var fs = 54, font = '700 ' + fs + 'px Caveat', w = measure(el.text, font) + 70;
      ctx.save(); camTransform(ctx, cam);
      var p = (t - el.appear) / 0.35;
      ctx.translate(110 + w / 2, y); ctx.rotate(-2.5 * Math.PI / 180);
      var s = lerp(1.4, 1, easeOutBack(p)); ctx.scale(s, s); ctx.globalAlpha = sat(p * 4);
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-w / 2 + 8, -48 + 10, w, 96);
      ctx.fillStyle = '#efe6cf'; ctx.fillRect(-w / 2, -48, w, 96);
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.strokeRect(-w / 2, -48, w, 96);
      ctx.fillStyle = INK; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(el.text, 0, 4);
      ctx.restore();
    });
  }
  function drawSlam(ctx, text, x, y, font, color, p, align) {
    if (p <= 0) return;
    var s = lerp(2.1, 1, easeOutBack(p)), a = sat(p * 4);
    ctx.save(); ctx.font = font; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    var w = measure(text, font), cx = x + w / 2;
    ctx.translate(cx, y); ctx.scale(s, s); ctx.translate(-cx, -y); ctx.globalAlpha = a;
    var fs = parseFloat(font.match(/(\d+)px/)[1]);
    ctx.fillStyle = '#120b07'; ctx.fillText(text, x + fs * 0.045, y + fs * 0.05);
    ctx.lineWidth = fs * 0.05; ctx.strokeStyle = '#120b07'; ctx.lineJoin = 'round'; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
    ctx.restore();
  }
  function underlineInk(ctx, x, y, w, seed) {
    var pts = catmull([[x, y + 6], [x + w * 0.3, y - 2], [x + w * 0.65, y + 5], [x + w + 20, y - 6]], 8);
    var path = new Path2D(MeloB._Ink.prototype.brush.call(new MeloB._Ink(seed), pts, { w: 16, ta: 0.08, tb: 0.5, min: 0.25 }));
    ctx.fillStyle = '#c43d33'; ctx.fill(path);
  }

  // ───────────────────────── subtitles ─────────────────────────
  function drawSubs(ctx, t) {
    var subs = E.tl.subs || [], s = null;
    for (var i = 0; i < subs.length; i++) if (subs[i].start <= t && t < subs[i].end) { s = subs[i]; break; }
    if (!s) return;
    var words = E.tl.words, fs = 60, font = '500 ' + fs + 'px Oswald', lh = fs * 1.22, sp = measure(' ', font);
    var a = sat(Math.min((t - s.start) / 0.12, (s.end - t) / 0.12));
    var widths = s.lines.map(function (line) { return line.reduce(function (acc, tok) { return acc + measure(tok.text, font); }, 0) + sp * (line.length - 1); });
    var maxW = Math.max.apply(0, widths), padX = 30, padY = 12;
    var boxH = s.lines.length * lh + padY * 2, y0 = 1080 - 34 - boxH;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(16,11,8,.88)';
    var bx = 960 - maxW / 2 - padX, bw = maxW + 2 * padX, r = 14;
    ctx.beginPath(); ctx.moveTo(bx + r, y0); ctx.arcTo(bx + bw, y0, bx + bw, y0 + boxH, r); ctx.arcTo(bx + bw, y0 + boxH, bx, y0 + boxH, r); ctx.arcTo(bx, y0 + boxH, bx, y0, r); ctx.arcTo(bx, y0, bx + bw, y0, r); ctx.fill();
    ctx.font = font; ctx.textBaseline = 'alphabetic';
    var lastState = 1;
    s.lines.forEach(function (line, li) {
      var x = 960 - widths[li] / 2, y = y0 + padY + lh * (li + 0.8);
      line.forEach(function (tok) {
        var w = tok.w != null ? words[tok.w] : null, tw = measure(tok.text, font), state = lastState;
        if (w) state = t >= w.end ? 2 : t >= w.start ? 1.5 : 0;
        lastState = state;
        ctx.fillStyle = state > 0 ? '#f6eedb' : 'rgba(246,238,219,.55)';
        ctx.fillText(tok.text, x, y);
        if (w && state === 1.5) { ctx.fillStyle = MUSTARD; ctx.fillRect(x, y + 9, tw, 5); }
        x += tw + sp;
      });
    });
    ctx.restore();
  }

  // ───────────────────────── v2: shots ─────────────────────────
  // Every [[shot]] is a full-frame composition (scene, text, split, board, list, map, chapter, melo, quiz).
  var CHALK_BOARD = CHALK;
  var INKP = { w: '#1d1712', y: '#b07a1c', r: '#c43d33', g: '#3f7d2f', b: '#2f6fb3', o: '#d0782a', p: '#c86a8a', k: '#efe6cf' };
  var PROPC = { w: '#f3ead3', y: '#f0c74e', r: '#d2433a', g: '#6f9a49', b: '#5d8fc4', o: '#e08a2c', p: '#e9a596', k: '#1d1712' };
  var BGC = { mustard: '#d9a23c', red: '#c43d33', green: '#557f3c', navy: '#2c333b', paper: '#e9dfc4', ink: '#22170f', teal: '#3e6b6a', cream: '#efe5cc' };
  var FULL = { cx: 960, cy: 540, w: 1920 };
  var DEFAULT_SLOTS = {
    left: { x: 560, y: 1010, scale: 1.12 }, center: { x: 960, y: 1010, scale: 1.12 }, right: { x: 1360, y: 1010, scale: 1.12 },
    back: { x: 960, y: 860, scale: 0.78 }, 'table-left': { x: 620, y: 990, scale: 1.05 }, 'table-right': { x: 1300, y: 990, scale: 1.05 },
    'far-left': { x: 300, y: 1010, scale: 1.12 }, 'far-right': { x: 1620, y: 1010, scale: 1.12 },
    waiter: { x: 1380, y: 1010, scale: 1.12 }, host: { x: 960, y: 1000, scale: 1.08 }, 'podium-left': { x: 520, y: 1000, scale: 1.0 }, 'podium-right': { x: 1400, y: 1000, scale: 1.0 },
    'bar-left': { x: 620, y: 1010, scale: 1.12 }, 'bar-right': { x: 1300, y: 1010, scale: 1.12 }, customer: { x: 600, y: 1010, scale: 1.12 }, 'behind-counter': { x: 1150, y: 960, scale: 1.0 },
    interviewer: { x: 1350, y: 1000, scale: 1.08 }, candidate: { x: 580, y: 1000, scale: 1.08 }, fridge: { x: 1500, y: 1000, scale: 1.1 }, counter: { x: 1200, y: 990, scale: 1.0 }, door: { x: 300, y: 1000, scale: 1.1 }
  };
  var MAP_FALLBACK = { norden: [930, 230], hamburg: [930, 250], berlin: [1170, 330], rheinland: [700, 470], koeln: [700, 470], 'köln': [700, 470],
    schwaben: [880, 690], stuttgart: [880, 690], bayern: [1060, 660], 'münchen': [1080, 720], muenchen: [1080, 720], wien: [1400, 660],
    oesterreich: [1290, 730], 'österreich': [1290, 730], schweiz: [800, 820], zuerich: [820, 800], 'zürich': [820, 800], sachsen: [1230, 470], center: [960, 520] };

  function isBoardScene(sc) { return !sc || sc.type === 'board' || sc.type === 'quiz' || (!sc.isShot && sc.layout !== 'title'); }
  function shotEnd(sc) { return sc.end != null ? sc.end : E.tl.duration; }
  function sceneIndexAt(t) { var k = 0; for (var i = 0; i < E.scenes.length; i++) if (E.scenes[i].tStart <= t) k = i; return k; }

  // camera of an illustrated shot: base move (push/pan/tilt/wide) + [[camera]] keys aimed at characters + drift + fx
  function focusPoint(sc, focus) {
    if (!focus) return null;
    if (focus === 'melo') return E.heads.melo || null;
    if (E.heads[focus]) return E.heads[focus];
    var sl = slotsOf(sc)[focus];
    if (sl) return [sl.x, sl.y - 330 * sl.scale];
    if (focus === 'table') { var a = slotsOf(sc)['table-left'], b = slotsOf(sc)['table-right']; if (a && b) return [(a.x + b.x) / 2, Math.min(a.y, b.y) - 200]; }
    return null;
  }
  function baseShotCam(sc, t) {
    var d = Math.max(0, t - sc.tStart), D = Math.max(1.5, shotEnd(sc) - sc.tStart), p = smooth(d / D);
    var m = (sc.args && sc.args.cam) || (sc.type === 'scene' ? ['push', 'pan-right', 'push', 'pan-left'][sc.i % 4] : 'push');
    var cam = { cx: 960, cy: 540, w: 1920 / 1.03 };
    if (m === 'push') cam.w = 1920 / lerp(1.03, 1.11, p);
    else if (m === 'pan-left') { cam.w = 1920 / 1.09; cam.cx = 960 + lerp(60, -60, p); }
    else if (m === 'pan-right') { cam.w = 1920 / 1.09; cam.cx = 960 + lerp(-60, 60, p); }
    else if (m === 'tilt') { cam.w = 1920 / 1.09; cam.cy = 540 + lerp(-36, 30, p); }
    else cam.w = 1920 / lerp(1.02, 1.05, p);
    return cam;
  }
  function keyCam(sc, k, t) {
    var f = focusPoint(sc, k.focus), base = baseShotCam(sc, t);
    var held = smooth((t - k.t) / Math.max(2, shotEnd(sc) - k.t));
    switch (k.shot) {
      case 'wide': return { cx: 960, cy: 540, w: 1920 / lerp(1.02, 1.05, held) };
      case 'tilt': { var c = f || [960, 420]; return { cx: lerp(960, c[0], 0.5), cy: lerp(470, 600, held), w: 1920 / 1.22 }; }
      case 'pan-left': return { cx: lerp(1040, 880, held), cy: 540, w: 1920 / 1.12 };
      case 'pan-right': return { cx: lerp(880, 1040, held), cy: 540, w: 1920 / 1.12 };
      case 'board': case 'close': {
        var u = boxUnion(E.els.filter(function (e) { return e.scene === sc.i && e.box && e.appear <= t + 0.5; }).map(function (e) { return e.box; }));
        if (u) { var fr = fitFrame({ x: u.x - 120, y: u.y - 90, w: u.w + 240, h: u.h + 180 }, false); fr.w = Math.max(fr.w, 1920 / 1.6); return fr; }
        return base;
      }
      default: { // push / melo: frame the focus character's upper body
        var c2 = f || (k.shot === 'melo' ? E.heads.melo : null) || [960, 480];
        var z = lerp(1.32, 1.45, held);
        return { cx: c2[0], cy: c2[1] + 150, w: 1920 / z };
      }
    }
  }
  function shotCam(sc, t) {
    var cams = sc.cams || [], i = -1;
    for (var j = 0; j < cams.length; j++) if (cams[j].t <= t) i = j;
    var cam;
    if (i < 0) cam = baseShotCam(sc, t);
    else {
      var prevT = cams[i].t, from = i > 0 ? keyCam(sc, cams[i - 1], prevT) : baseShotCam(sc, prevT);
      cam = mixFrame(from, keyCam(sc, cams[i], t), ease((t - prevT) / 0.85));
    }
    cam = { cx: cam.cx + 6 * Math.sin(t * 0.37 + sc.i) + 2.5 * Math.sin(t * 1.1), cy: cam.cy + 4 * Math.sin(t * 0.29 + 1 + sc.i), w: cam.w };
    // fx: shake / zoom-punch
    (sc.fx || []).forEach(function (f) {
      var a = t - f.t;
      if (f.name === 'shake' && a >= 0 && a < 0.55) { var k = 1 - a / 0.55; cam.cx += 16 * k * Math.sin(a * 83); cam.cy += 11 * k * Math.sin(a * 67 + 1); }
      if (f.name === 'zoom-punch' && a >= 0 && a < 0.6) { var b = a < 0.08 ? a / 0.08 : 1 - smooth((a - 0.08) / 0.52); cam.w /= 1 + 0.14 * b; }
      if (f.name === 'record-scratch' && a >= 0 && a < 0.12) cam.cx += 10 * Math.sin(a * 200);
    });
    return clampFrame(cam);
  }

  // ── sets (engine/sets via Sets.render) with a cached raster; missing set → paper backdrop with a doodle sign
  function slotsOf(sc) {
    var s = {}, k;
    for (k in DEFAULT_SLOTS) s[k] = DEFAULT_SLOTS[k];
    if (sc.set && root.Sets && Sets.has && Sets.has(sc.set)) { var o = Sets.slots(sc.set) || {}; for (k in o) s[k] = o[k]; }
    return s;
  }
  function slotPos(sc, name) {
    var S = slotsOf(sc);
    if (S[name]) return S[name];
    var m = String(name || '').match(/^(-?\d+)\s*,\s*(-?\d+)$/);
    if (m) return { x: +m[1], y: +m[2], scale: 1.1 };
    if (!E.warned['slot' + name]) { E.warned['slot' + name] = 1; console.warn('slot "' + name + '" unknown → center'); }
    return S.center;
  }
  async function rasterSvg(str, w, h) {
    if (!str) return null;
    var k = E.SS2;
    if (!/^\s*(<\?xml[^>]*>\s*)?<svg/.test(str)) str = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + w + ' ' + h + '">' + str + '</svg>';
    str = str.replace(/(<svg[^>]*?)\swidth="[\d.]+(px)?"/, '$1').replace(/(<svg[^>]*?)\sheight="[\d.]+(px)?"/, '$1').replace('<svg', '<svg width="' + (w * k) + '" height="' + (h * k) + '"');
    var img = await svgImage(str), c = mk(w * k, h * k);
    c.getContext('2d').drawImage(img, 0, 0, w * k, h * k);
    return c;
  }
  function fallbackSet(name) {
    var key = 'fb|' + name;
    if (E.setCache[key]) return E.setCache[key];
    var k = E.SS2, c = mk(1920 * k, 1080 * k), g = c.getContext('2d');
    g.scale(k, k);
    g.drawImage(E.setC, 0, 0, 1920, 1080);
    g.fillStyle = 'rgba(233,223,196,.86)'; g.fillRect(0, 0, 1920, 1080);
    g.strokeStyle = 'rgba(23,19,15,.18)'; g.lineWidth = 2;
    for (var x = -1080; x < 1920; x += 14) { g.beginPath(); g.moveTo(x, 1080); g.lineTo(x + 1080, 0); g.stroke(); }
    g.fillStyle = 'rgba(205,185,143,.9)'; g.fillRect(0, 980, 1920, 100);
    g.save(); g.translate(960, 150); g.rotate(-0.03);
    var label = String(name || 'Szene').replace(/-/g, ' '); g.font = '700 54px Caveat'; var lw = g.measureText(label).width + 80;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-lw / 2 + 8, -44 + 10, lw, 88);
    g.fillStyle = '#c79a60'; g.fillRect(-lw / 2, -44, lw, 88); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(-lw / 2, -44, lw, 88);
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 0, 4);
    g.restore();
    return (E.setCache[key] = { bg: c, fg: null });
  }
  async function setLayers(sc, t) {
    var name = sc.set;
    if (!name || !(root.Sets && Sets.has && Sets.has(name))) {
      if (name && name !== 'paper' && !E.warned['set' + name]) { E.warned['set' + name] = 1; console.warn('set "' + name + '" missing → fallback'); }
      return fallbackSet(name && name !== 'paper' ? name : '');
    }
    var tq = Math.floor(t * 4) / 4, r;  // ambient sets: re-rasterised at 4 fps
    try { r = Sets.render(name, { t: tq, seed: 1, variant: sc.args && sc.args.variant }); } catch (e) { console.warn('set ' + name + ' failed: ' + e.message); return fallbackSet(name); }
    var key = name + '|' + (sc.args && sc.args.variant || ''), ent = E.setCache[key];
    if (ent && ent.src === r.bg && ent.srcFg === r.fg) return ent;
    ent = { src: r.bg, srcFg: r.fg, bg: await rasterSvg(r.bg, 1920, 1080), fg: r.fg ? await rasterSvg(r.fg, 1920, 1080) : null };
    if (!ent.bg) return fallbackSet(name);
    E.setCache[key] = ent;
    return ent;
  }

  // ── characters: supporting cast (engine/cast) and Melo, rasterised from SVG at screen resolution
  function envAt(t) { var env = E.tl.envelope; if (!env || !env.rms) return 0; return env.rms[Math.max(0, Math.min(env.rms.length - 1, Math.floor(t * (env.fps || 30))))] || 0; }
  function talkLevel(id, t, sc) {
    // [[cast id=.. talk=on]] → mouth follows the narrator's loudness until talk=off
    var forced = null;
    if (sc) (sc.castCues || []).forEach(function (c) { if (c.id === id && c.talk && c.t <= t) forced = c.talk === 'on' || c.talk === 'true' || c.talk === '1'; });
    if (forced === true) { var v0 = envAt(t); return v0 < 0.06 ? 0 : clamp((v0 - 0.06) * 1.6, 0, 1); }
    var qs = E.quotesBy[id]; if (!qs) return 0;
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i];
      if (q.w0 == null) { // gag bubble (not in the narration): soft talk while the text writes on
        var wd2 = Math.max(0.6, Math.min(2.2, q.text.length * 0.05));
        if (t >= q.t && t <= q.t + wd2) return 0.25 + 0.3 * Math.abs(Math.sin((t - q.t) * 11)) * (0.6 + 0.4 * Math.sin((t - q.t) * 3.7));
        continue;
      }
      if (t < q.start - 0.03 || t > q.end + 0.05) continue;
      // only inside the quote's words (closed in pauses)
      var inside = q.w0 == null;
      for (var w = q.w0; !inside && w <= q.w1; w++) { var wd = E.tl.words[w]; if (wd && t >= wd.start - 0.03 && t <= wd.end + 0.03) inside = true; }
      if (!inside) return 0;
      var v = envAt(t); return v < 0.06 ? 0 : clamp((v - 0.06) * 1.6, 0, 1);
    }
    return 0;
  }
  function castState(sc, m, t) {
    var st = { expr: m.expr || 'neutral', pose: m.pose || 'idle', flip: !!m.flip, from: null, w: 1 };
    (sc.castCues || []).forEach(function (c) {
      if (c.id !== m.id || c.t > t) return;
      if ((c.expr && c.expr !== st.expr) || (c.pose && c.pose !== st.pose)) {
        var w = (t - c.t) / 0.3;
        if (w < 1) { st.from = { expr: st.expr, pose: st.pose }; st.w = Math.max(0, w); } else { st.from = null; st.w = 1; }
      }
      if (c.expr) st.expr = c.expr; if (c.pose) st.pose = c.pose;
      if (c.flip != null) st.flip = c.flip === true || c.flip === 'true' || c.flip === '1';
    });
    return st;
  }
  function bboxOf(a) {
    if (!a) return { x0: -220, y0: -580, x1: 220, y1: 40 };
    if (Array.isArray(a)) return { x0: a[0], y0: a[1], x1: a[0] + a[2], y1: a[1] + a[3] };  // cast: [x, y, w, h]
    if (a.w != null) return { x0: a.x, y0: a.y, x1: a.x + a.w, y1: a.y + a.h };
    if (a.x0 != null) return a;
    return { x0: -220, y0: -580, x1: 220, y1: 40 };
  }
  function placeholderCast(id, o) {
    var talk = o.talk || 0, mouthH = 4 + 18 * talk;
    var g = '<g><ellipse cx="0" cy="8" rx="80" ry="10" fill="rgba(40,25,10,.18)"/>' +
      '<path d="M-14 -10 L-10 -180 M14 -10 L10 -180" stroke="#2b2420" stroke-width="16" stroke-linecap="round"/>' +
      '<path d="M-48 -300 Q0 -320 48 -300 L40 -170 L-40 -170 Z" fill="#4a4038" stroke="#17130f" stroke-width="6"/>' +
      '<path d="M-44 -290 L-80 -200 M44 -290 L80 -200" stroke="#2b2420" stroke-width="13" stroke-linecap="round"/>' +
      '<circle cx="0" cy="-385" r="92" fill="#6b5f55" stroke="#17130f" stroke-width="7"/>' +
      '<ellipse cx="-30" cy="-395" rx="9" ry="12" fill="#f3ead3"/><ellipse cx="30" cy="-395" rx="9" ry="12" fill="#f3ead3"/>' +
      '<ellipse cx="0" cy="-340" rx="18" ry="' + mouthH.toFixed(1) + '" fill="#35110e"/>' +
      '<text x="0" y="-480" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#17130f">' + id + '</text></g>';
    return { placeholder: true, svg: g, anchors: { headCenter: [0, -385], mouth: [0, -340], bbox: [-120, -520, 240, 550] } };
  }
  async function drawFigure(ctx, svgG, bb, pos, cam) {
    // pos {x,y,s,flip}; rasterise only the visible part of the figure's bbox
    var fh = cam.w * 9 / 16, fx0 = cam.cx - cam.w / 2, fy0 = cam.cy - fh / 2, s = pos.s, fl = pos.flip ? -1 : 1;
    var X0 = pos.x + (fl > 0 ? bb.x0 : -bb.x1) * s, X1 = pos.x + (fl > 0 ? bb.x1 : -bb.x0) * s;
    var vx0 = Math.max(X0, fx0), vx1 = Math.min(X1, fx0 + cam.w), vy0 = Math.max(pos.y + bb.y0 * s, fy0), vy1 = Math.min(pos.y + bb.y1 * s, fy0 + fh);
    if (vx1 <= vx0 || vy1 <= vy0) return;
    var zoom = 1920 / cam.w * E.scale, pw = Math.ceil((vx1 - vx0) * zoom), ph = Math.ceil((vy1 - vy0) * zoom);
    // world rect → character coords
    var cx0 = fl > 0 ? (vx0 - pos.x) / s : -(vx1 - pos.x) / s, cy0 = (vy0 - pos.y) / s, cw = (vx1 - vx0) / s, ch = (vy1 - vy0) / s;
    var inner = fl > 0 ? svgG : '<g transform="scale(-1 1)">' + svgG + '</g>';
    if (fl < 0) cx0 = (vx0 - pos.x) / s;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + pw + '" height="' + ph + '" viewBox="' + cx0.toFixed(2) + ' ' + cy0.toFixed(2) + ' ' + cw.toFixed(2) + ' ' + ch.toFixed(2) + '">' + inner + '</svg>';
    var img = await svgImage(svg);
    ctx.drawImage(img, vx0, vy0, vx1 - vx0, vy1 - vy0);
  }
  async function drawCast(ctx, sc, m, t, cam) {
    var st = castState(sc, m, t), sl = slotPos(sc, m.slot), talk = talkLevel(m.id, t, sc), r;
    if (sl.seated && (!m.pose || m.pose === 'idle') && !(sc.castCues || []).some(function (c) { return c.id === m.id && c.pose && c.t <= t; })) st.pose = 'sit';
    var have = root.Cast && Cast.list && Cast.list().indexOf(m.id) >= 0;
    // face the slot's direction (or Melo / the screen centre); eyes toward Melo
    var tgt = E.heads.melo || [960, 400];
    var faceLeft = (sc.castCues || []).some(function (c) { return c.id === m.id && c.flip != null && c.t <= t; }) ? st.flip : sl.face === -1 ? true : sl.face === 1 ? false : tgt[0] < sl.x - 40;
    var lk = [clamp(Math.abs(tgt[0] - sl.x) / 500, 0, 1), 0.08];
    var feetY = sl.seated && sl.seatY && st.pose === 'sit' ? sl.seatY + 112 * (sl.scale || 1) : sl.y;
    try { r = have ? Cast.render(m.id, { expr: st.expr, pose: st.pose, talk: talk, t: t, seed: 3, flip: faceLeft, scale: 1, look: lk, from: st.from, w: st.from ? st.w : undefined, id: 'c' + m.id }) : null; } catch (e) { if (!E.warned['ce' + m.id]) { E.warned['ce' + m.id] = 1; console.warn('cast ' + m.id + ': ' + e.message); } }
    if (!r) { if (!have && !E.warned['c' + m.id]) { E.warned['c' + m.id] = 1; console.warn('cast "' + m.id + '" missing → placeholder'); } r = placeholderCast(m.id, { talk: talk }); }
    var a = r.anchors || {}, bb = bboxOf(a.bbox), s = sl.scale || 1.1, fl = st.flip ? -1 : 1;
    bb = { x0: bb.x0 - 30, y0: bb.y0 - 30, x1: bb.x1 + 30, y1: bb.y1 + 20 };
    // the cast flips itself (anchors already flipped) → place unflipped
    var flipSelf = have && r !== null && !r.placeholder;
    await drawFigure(ctx, r.svg, bb, { x: sl.x, y: feetY, s: s, flip: flipSelf ? false : st.flip }, cam);
    fl = flipSelf ? 1 : fl;
    var hc = a.headCenter || [0, -385], mo = a.mouth || [hc[0], hc[1] + 50];
    E.heads[m.id] = [sl.x + fl * hc[0] * s, feetY + hc[1] * s];
    E.mouths[m.id] = [sl.x + fl * mo[0] * s, feetY + mo[1] * s];
    E.headR[m.id] = 95 * s;
  }
  async function drawMeloFig(ctx, t, M, cam, hint) {
    var fr = await drawMelo(ctx, t, M, cam, hint);
    var head = E.headY || -385;
    E.heads.melo = [M.x, M.y + head * M.s]; E.headR.melo = 95 * M.s;
    E.mouths.melo = fr && fr.anchors && fr.anchors.mouth ? [M.x + fr.anchors.mouth[0] * M.s, M.y + fr.anchors.mouth[1] * M.s] : [M.x, M.y + (head + 60) * M.s];
    return fr;
  }

  // ── speech bubbles ([[say]]): ink outline, paper fill, tail to the speaker's mouth, text writes on
  function drawBubbles(ctx, sc, t) {
    var says = (sc.says || []).filter(function (q) { return q.t <= t; });
    // newest per speaker, at most 2
    var by = {}; says.forEach(function (q) { by[q.who] = q; });
    var list = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.t - b.t; }).slice(-2);
    list.forEach(function (q, qi) {
      var fs = 60, font = '700 ' + fs + 'px ' + HAND, maxW = 760, lines = wrap(q.text, font, maxW), lh = fs * 1.15;
      var tw = Math.max.apply(0, lines.map(function (l) { return measure(l, font); })), bw = tw + 70, bh = lines.length * lh + 44;
      var head = E.heads[q.who], mouth = E.mouths[q.who] || head, hr = E.headR[q.who] || 120;
      var bx, by2;
      if (head) { bx = head[0] - bw / 2 + (head[0] < 960 ? 120 : -120); by2 = head[1] - hr - 70 - bh; }
      else { bx = 960 - bw / 2; by2 = 160; }
      bx = clamp(bx, 50, 1870 - bw); by2 = clamp(by2, 40, 1080 - 210 - bh);
      var p = easeOutBack((t - q.t) / 0.28), cxm = bx + bw / 2, cym = by2 + bh / 2;
      ctx.save(); ctx.translate(cxm, cym); ctx.scale(lerp(0.5, 1, p), lerp(0.5, 1, p)); ctx.translate(-cxm, -cym); ctx.globalAlpha = sat((t - q.t) / 0.1);
      var pts = rrectPts(bx, by2, bw, bh, 34);
      // tail
      var tail = null;
      if (mouth) {
        var ax = clamp(mouth[0], bx + 60, bx + bw - 60), ay = by2 + bh, tx = lerp(ax, mouth[0], 0.7), ty = lerp(ay, mouth[1] - 20, 0.75);
        if (ty > ay + 20) tail = [[ax - 26, ay - 4], [tx, ty], [ax + 26, ay - 4]];
      }
      ctx.fillStyle = 'rgba(23,19,15,.22)'; ctx.beginPath(); pts.forEach(function (q2, i) { ctx[i ? 'lineTo' : 'moveTo'](q2[0] + 8, q2[1] + 10); }); ctx.fill();
      ctx.fillStyle = q.who === 'melo' ? '#fbf3dc' : '#f6efdc';
      ctx.beginPath(); pts.forEach(function (q2, i) { ctx[i ? 'lineTo' : 'moveTo'](q2[0], q2[1]); }); ctx.closePath(); ctx.fill();
      if (tail) { ctx.beginPath(); ctx.moveTo(tail[0][0], tail[0][1]); ctx.lineTo(tail[1][0], tail[1][1]); ctx.lineTo(tail[2][0], tail[2][1]); ctx.closePath(); ctx.fill(); }
      var ink = new MeloB._Ink(hashStr(q.text) % 1000 + 3);
      var outline = pts.slice(); outline.push(pts[0], pts[1]);
      if (tail) {
        // outline with a gap where the tail joins
        ctx.fillStyle = INK;
        ctx.fill(new Path2D(ink.brush(handLine(outline, 5, 10, 1.2), { w: 6.5, ta: 0.02, tb: 0.02, min: 0.6, jit: 0.25 })));
        ctx.fillStyle = q.who === 'melo' ? '#fbf3dc' : '#f6efdc';
        ctx.beginPath(); ctx.moveTo(tail[0][0] + 5, tail[0][1] - 7); ctx.lineTo(tail[2][0] - 5, tail[2][1] - 7); ctx.lineTo(tail[2][0] - 5, tail[2][1] + 8); ctx.lineTo(tail[0][0] + 5, tail[0][1] + 8); ctx.fill();
        ctx.fillStyle = INK;
        ctx.fill(new Path2D(ink.brush([tail[0], tail[1]], { w: 6, ta: 0.05, tb: 0.3, min: 0.4 })));
        ctx.fill(new Path2D(ink.brush([tail[2], tail[1]], { w: 6, ta: 0.05, tb: 0.3, min: 0.4 })));
      } else { ctx.fillStyle = INK; ctx.fill(new Path2D(ink.brush(handLine(outline, 5, 10, 1.2), { w: 6.5, ta: 0.02, tb: 0.02, min: 0.6, jit: 0.25 }))); }
      // text writes on over the quote (min 0.45 s)
      var dur = q.w0 == null ? Math.max(0.6, Math.min(2.2, q.text.length * 0.05)) : Math.max(0.45, Math.min(2.2, (q.end - q.start) || 0.6)), prog = sat((t - q.t - 0.08) / dur);
      var total = lines.join('').length, shown = prog * total, acc = 0;
      ctx.font = font; ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic';
      lines.forEach(function (l, li) {
        var y = by2 + 22 + lh * (li + 0.82), x = bx + 35;
        if (shown <= acc) return;
        var n = Math.min(l.length, shown - acc), whole = Math.floor(n);
        ctx.fillText(l.slice(0, whole), x, y);
        if (whole < l.length && n > whole) { ctx.save(); ctx.globalAlpha *= n - whole; ctx.fillText(l[whole], x + measure(l.slice(0, whole), font), y); ctx.restore(); }
        acc += l.length;
      });
      ctx.restore();
    });
  }

  // ── props: ink doodles ([[prop]]), coloured fills
  function drawDoodle(ctx, name, x, y, size, t0, t, seed) {
    var ic = MeloIcons.get(name), sc2 = size / 100, D = 0.45, tot = 0;
    var strokes = ic.strokes.map(function (s) { var p = s.pts.map(function (q) { return [x + (q[0] - 50) * sc2, y + (q[1] - 50) * sc2]; }); var L = polyLen(p); tot += L; return { p: p, L: L, s: s }; });
    var pf = sat((t - t0 - D * 0.5) / 0.3);
    ic.fills.forEach(function (f, i) {
      if (pf <= 0) return;
      var pts = f.pts.map(function (q) { return [x + (q[0] - 50) * sc2, y + (q[1] - 50) * sc2]; });
      ctx.save(); ctx.globalAlpha = pf; ctx.fillStyle = PROPC[f.col] || PROPC.w; pathOf(ctx, pts); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.save(); pathOf(ctx, pts); ctx.closePath(); ctx.clip(); ctx.globalAlpha = 0.35 * pf; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      for (var o = -size; o < size; o += 9) { ctx.beginPath(); ctx.moveTo(x + o + size * 0.2, y + size); ctx.lineTo(x + o + size * 1.2, y); ctx.stroke(); }
      ctx.restore();
    });
    var tt = t0;
    strokes.forEach(function (o, i) {
      var d = Math.max(0.03, D * o.L / tot), p = sat((t - tt) / d); tt += d;
      if (p <= 0) return;
      var pr = prefix(handLine(o.p, seed + i, 5, 1.2), p);
      var col = o.s.col === 'w' || o.s.col === 'k' ? INK : darken(PROPC[o.s.col] || INK);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, 3.4 * sc2 * o.s.w);
      pathOf(ctx, pr.pts); ctx.stroke(); ctx.restore();
    });
  }
  function darken(hex) { var n = parseInt(hex.slice(1), 16), r = (n >> 16) * 0.62, g = ((n >> 8) & 255) * 0.62, b = (n & 255) * 0.62; return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; }
  var SCREEN_AT = { center: [960, 150], left: [210, 330], right: [1710, 330], top: [960, 150], back: [960, 160], 'top-left': [210, 200], 'top-right': [1710, 200], 'bottom-left': [210, 760], 'bottom-right': [1710, 760] };
  function propPos(sc, at) {
    if (sc.type === 'scene') {
      var S = slotsOf(sc);
      if (S[at]) { var sl = S[at], base = sl.seated && sl.seatY ? sl.seatY + 140 * (sl.scale || 1) : sl.y; return [sl.x + (sl.seated ? 170 : 0), base - (at === 'back' ? 420 : 560) * (sl.scale || 1)]; }
    }
    var m = String(at || '').match(/^(-?\d+)\s*,\s*(-?\d+)$/);
    if (m) return [+m[1], +m[2]];
    return SCREEN_AT[at] || SCREEN_AT.center;
  }
  function drawProps(ctx, sc, t) {
    (sc.props || []).forEach(function (pr, i) {
      if (t < pr.t) return;
      if (!MeloIcons.has(pr.name) && !E.warned['p' + pr.name]) { E.warned['p' + pr.name] = 1; console.warn('prop "' + pr.name + '" unknown → doodle'); }
      var pos = propPos(sc, pr.at), a = t - pr.t, size = (sc.type === 'scene' ? 230 : 260) * (pr.scale || 1), x = pos[0], y = pos[1], rot = 0, s = 1;
      if (pr.anim === 'drop') { var pd = sat(a / 0.45); y -= (1 - easeOutBack(pd)) * 380; }
      else if (pr.anim === 'wiggle') { rot = 0.12 * Math.sin(a * 9) * Math.exp(-a * 0.5) + 0.03 * Math.sin(a * 3); }
      else { s = lerp(0.3, 1, easeOutBack(a / 0.3)); }
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot + 0.04 * Math.sin(t * 1.3 + i)); ctx.scale(s, s);
      // soft paper halo so doodles read on busy sets
      if (sc.type === 'scene') { ctx.fillStyle = 'rgba(246,239,220,.35)'; ctx.beginPath(); ctx.arc(0, 0, size * 0.52, 0, 7); ctx.fill(); }
      drawDoodle(ctx, pr.name, 0, 0, size, pr.t, t, hashStr(pr.id) % 997);
      ctx.restore();
    });
  }

  // ── fx
  function fxAnchor(sc, f) {
    var w = f.who || (E.heads.melo && E.meloInShot ? 'melo' : (sc.cast && sc.cast[0] ? sc.cast[0].id : null));
    return { p: (w && E.heads[w]) || [960, 380], r: (w && E.headR[w]) || 110 };
  }
  function drawFx(ctx, sc, t) {
    (sc.fx || []).forEach(function (f, fi) {
      var a = t - f.t, A = fxAnchor(sc, f), hx = A.p[0], hy = A.p[1], R = A.r, r = rng(fi * 31 + 7);
      if (a < 0) return;
      if (f.name === 'sweat' && a < 2.2) {
        for (var i = 0; i < 4; i++) {
          var ph = (a * 0.9 + i * 0.27) % 1, x = hx + (i % 2 ? 1 : -1) * R * (0.75 + 0.1 * i), y = hy - R * 0.3 + ph * R * 0.9;
          ctx.save(); ctx.globalAlpha = sat((2.2 - a) / 0.3) * (1 - ph * 0.6); ctx.translate(x, y); ctx.fillStyle = '#8fc3ea'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(12, 2, 0, 10); ctx.quadraticCurveTo(-12, 2, 0, -18); ctx.fill(); ctx.stroke(); ctx.restore();
        }
      }
      if (f.name === 'steam' && a < 2.4) {
        for (var j = 0; j < 5; j++) {
          var ph2 = (a * 0.7 + j * 0.2) % 1, x2 = hx + (j - 2) * R * 0.35 + 14 * Math.sin(a * 3 + j), y2 = hy - R * 1.05 - ph2 * R * 1.1;
          ctx.save(); ctx.globalAlpha = 0.75 * (1 - ph2) * sat((2.4 - a) / 0.4); ctx.strokeStyle = '#f3ead3'; ctx.lineWidth = 7; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(x2, y2, 14 + ph2 * 18, Math.PI * 0.9, Math.PI * 2.2); ctx.stroke(); ctx.restore();
        }
      }
      if ((f.name === 'hearts' || f.name === 'question-marks' || f.name === 'sparkle') && a < 2.2) {
        var n = f.name === 'sparkle' ? 7 : 5;
        for (var k = 0; k < n; k++) {
          var d0 = k * 0.12, aa = a - d0; if (aa < 0) continue;
          var ang = -Math.PI / 2 + (k - (n - 1) / 2) * 0.55, dist = R * (1.15 + 0.25 * (k % 2)) + aa * 20;
          var x3 = hx + Math.cos(ang) * dist, y3 = hy + Math.sin(ang) * dist - aa * 26, sc3 = easeOutBack(aa / 0.25) * (f.name === 'sparkle' ? 0.6 + 0.4 * Math.abs(Math.sin(aa * 9 + k)) : 1);
          ctx.save(); ctx.translate(x3, y3); ctx.rotate(0.25 * Math.sin(aa * 4 + k)); ctx.scale(sc3, sc3); ctx.globalAlpha = sat((2.2 - a) / 0.4);
          if (f.name === 'hearts') { ctx.fillStyle = '#d2433a'; ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, 14); ctx.bezierCurveTo(-30, -8, -14, -30, 0, -14); ctx.bezierCurveTo(14, -30, 30, -8, 0, 14); ctx.fill(); ctx.stroke(); }
          else if (f.name === 'question-marks') { ctx.font = '900 64px Fraunces'; ctx.textAlign = 'center'; ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.strokeText('?', 0, 20); ctx.fillStyle = '#f0c74e'; ctx.fillText('?', 0, 20); }
          else { ctx.fillStyle = '#f6e7a8'; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); for (var q = 0; q < 8; q++) { var rr = q % 2 ? 7 : 24, an = q / 8 * Math.PI * 2; ctx[q ? 'lineTo' : 'moveTo'](rr * Math.cos(an), rr * Math.sin(an)); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
          ctx.restore();
        }
      }
    });
  }
  // screen-space fx: flash, record-scratch (freeze + vinyl + desaturate)
  function freezeT(sc, t) {
    var tc = t;
    (sc.fx || []).forEach(function (f) { if (f.name === 'record-scratch' && t >= f.t && t < f.t + (f.dur || 0.9)) tc = f.t; });
    return tc;
  }
  function drawScreenFx(ctx, sc, t) {
    (sc.fx || []).forEach(function (f) {
      var a = t - f.t;
      if (f.name === 'flash' && a >= 0 && a < 0.25) { ctx.save(); ctx.fillStyle = '#fff8e6'; ctx.globalAlpha = 0.85 * (1 - a / 0.25); ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); }
      var D = f.dur || 0.9;
      if (f.name === 'record-scratch' && a >= 0 && a < D) {
        ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.globalAlpha = 0.75 * sat(a / 0.08) * sat((D - a) / 0.15); ctx.fillRect(0, 0, 1920, 1080); ctx.restore();
        ctx.save(); ctx.globalAlpha = sat(a / 0.06) * sat((D - a) / 0.15); ctx.translate(1730, 720); ctx.rotate(-a * 6);
        ctx.fillStyle = '#17130f'; ctx.beginPath(); ctx.arc(0, 0, 110, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(243,234,211,.25)'; ctx.lineWidth = 2; for (var rr = 40; rr < 105; rr += 9) { ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.stroke(); }
        ctx.fillStyle = '#c43d33'; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill(); ctx.fillStyle = '#f3ead3'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill();
        ctx.rotate(a * 6); ctx.strokeStyle = '#f3ead3'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-150, -60); ctx.lineTo(-120, -80); ctx.lineTo(-130, -40); ctx.lineTo(-95, -62); ctx.stroke();
        ctx.restore();
      }
    });
  }

  // ── ink surface (draw cues inside non-board shots)
  function surfaceFor(sc) {
    var L = LAYOUT[sc.layout]; if (!L || !L.ca) return null;
    var key = sc.layout, s = E.surfs[key];
    if (!s) {
      var CA = L.ca, rect = { x: CA.x0 - 70, y: CA.y0 - 60, w: CA.x1 - CA.x0 + 140, h: CA.y1 - CA.y0 + 120 }, BS = E.scale;
      var cc = mk(rect.w * BS, rect.h * BS);
      s = E.surfs[key] = { rect: rect, cc: cc, cg: cc.getContext('2d'), BS: BS };
    }
    s.scene = sc; s.panel = sc.type !== 'list';
    return s;
  }

  // ── Melo overlay modes (corner / side / peek / walk-in) in screen space
  function overlayMelo(sc) {
    var m = sc.melo || 'off';
    if (/^corner-left|walk-in-left|walk-in$/.test(m)) return { x: 210, y: 1080 + 120, s: 0.96, side: 'right', anim: m.indexOf('walk') === 0 ? 'walk' : 'slide', from: -1 };
    if (/^corner-right|walk-in-right/.test(m)) return { x: 1710, y: 1080 + 120, s: 0.96, side: 'left', anim: m.indexOf('walk') === 0 ? 'walk' : 'slide', from: 1 };
    if (m === 'side-left' && !isBoardScene(sc)) return { x: 300, y: 1030, s: 1.02, side: 'right', anim: 'slide', from: -1 };
    if (m === 'side-right' && !isBoardScene(sc)) return { x: 1620, y: 1030, s: 1.02, side: 'left', anim: 'slide', from: 1 };
    if (m === 'peek-left' || m === 'peek') return { x: 20, y: 1080 + 60, s: 1.15, side: 'right', anim: 'peek', from: -1, rot: 0.18 };
    if (m === 'peek-right') return { x: 1900, y: 1080 + 60, s: 1.15, side: 'left', anim: 'peek', from: 1, rot: -0.18 };
    return null;
  }
  async function drawOverlayMelo(ctx, t, sc) {
    var o = overlayMelo(sc); if (!o) return;
    var i = E.scenes.indexOf(sc), prev = E.scenes[i - 1], same = prev && prev.melo === sc.melo;
    var a = t - sc.tStart, x = o.x, y = o.y;
    if (!same) {
      if (o.anim === 'walk') { var pw = ease(a / 1.2); x = lerp(o.from < 0 ? -260 : 2180, o.x, pw); y -= Math.abs(Math.sin(pw * Math.PI * 4)) * 14 * (1 - pw); }
      else if (o.anim === 'peek') { x = o.x - o.from * 220 * (1 - easeOutBack(a / 0.5)); }
      else y += (1 - easeOutBack(a / 0.4)) * 420;
    }
    y += 3 * Math.sin(t * 1.7);
    ctx.save();
    if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); ctx.translate(-x, -y); }
    await drawMeloFig(ctx, t, { x: x, y: y, s: o.s }, FULL, { boardSide: o.side, board: true });
    ctx.restore();
  }

  // ── backgrounds
  function paperBg(ctx, tint, t) {
    ctx.fillStyle = tint || '#ece2c8'; ctx.fillRect(-60, -60, 2040, 1200);
    ctx.drawImage(E.paperTex, -60, -60, 2040, 1200);
  }
  function darkBg(ctx, t, col) {
    if (col) { ctx.fillStyle = col; ctx.fillRect(-60, -60, 2040, 1200); }
    else ctx.drawImage(E.titleBg, -60, -40, 2040, 1160);
    ctx.save(); ctx.translate(1300, 470); ctx.rotate(t * 0.035); ctx.globalCompositeOperation = col ? 'soft-light' : 'screen'; ctx.globalAlpha = col ? 0.6 : 0.5;
    ctx.drawImage(E.rays, -1500, -1500, 3000, 3000); ctx.restore();
    if (col) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(E.vigTex, -60, -60, 2040, 1200); ctx.restore(); }
  }

  // ── kinetic typography
  function fitWords(tokens, lineOf, maxW, maxH, fam, nLines) {
    for (var fs = 210; fs >= 64; fs -= 6) {
      var font = '900 ' + fs + 'px ' + fam, lines = [], cur = [], curW = 0, sp = measure(' ', font);
      tokens.forEach(function (tk, i) {
        var w = measure(tk.text, font);
        var forced = lineOf && i > 0 && tk.line !== tokens[i - 1].line;
        if (cur.length && (forced || (!lineOf && curW + sp + w > maxW))) { lines.push(cur); cur = []; curW = 0; }
        cur.push({ tk: tk, w: w }); curW += (cur.length > 1 ? sp : 0) + w;
      });
      if (cur.length) lines.push(cur);
      var ok = lines.length <= (nLines || 3) && lines.every(function (l) { return l.reduce(function (a, b) { return a + b.w; }, 0) + sp * (l.length - 1) <= maxW; }) && lines.length * fs * 1.08 <= maxH;
      if (ok || fs <= 70) return { fs: fs, font: font, lines: lines, sp: sp };
    }
  }
  function brushStroke(ctx, pts, w, color, p, seed) {
    if (p <= 0) return;
    var pr = prefix(handLine(pts, seed, 8, 2), p);
    if (pr.pts.length < 2) return;
    ctx.fillStyle = color; ctx.fill(new Path2D(new MeloB._Ink(seed).brush(pr.pts, { w: w, ta: 0.06, tb: 0.3, min: 0.35, jit: 0.25 })));
  }
  function drawTextShot(ctx, t, sc) {
    var a = sc.args || {}, style = a.style || 'big', toks = sc.tokens || [], dark = (style === 'big' || style === 'question') && sc.i % 2 === 0;
    var cam = shotCam(sc, t); camTransform(ctx, cam);
    if (style === 'wrong') paperBg(ctx, '#f0d9cc', t); else if (style === 'right') paperBg(ctx, '#dfe6c8', t);
    else if (dark) darkBg(ctx, t); else paperBg(ctx, style === 'stack' ? '#efe0b4' : '#ece2c8', t);
    var fam = 'Fraunces', stack = style === 'stack' || (sc.lineCount || 1) > 1;
    var sideProps = (sc.props || []).some(function (p) { return /left|right/.test(p.at); });
    var topProp = (sc.props || []).some(function (p) { return !/left|right|^\d/.test(p.at); });
    // keep clear of a corner/side Melo: narrower text, shifted away from him
    var om = overlayMelo(sc), cx0 = 960, maxW = sideProps ? 1100 : 1500;
    if (om) { maxW = Math.min(maxW, 1260); cx0 = om.x < 960 ? 1060 : 860; }
    var L = fitWords(toks, stack, maxW, (sc.args.sub ? 520 : 640) - (topProp ? 90 : 0), fam, stack ? 5 : 3);
    var lh = L.fs * 1.08, top = 540 - (L.lines.length * lh) / 2 - (a.sub ? 70 : 20) + L.fs * 0.8 + (topProp ? 60 : 0);
    var colMain = dark ? CREAM : INK, colAcc = dark ? MUSTARD : (style === 'wrong' ? RED : style === 'right' ? '#3f7d2f' : '#b5402f');
    var lastT = toks.length ? toks[toks.length - 1].t : sc.tStart, ends = [];
    L.lines.forEach(function (line, li) {
      var lw = line.reduce(function (s, b) { return s + b.w; }, 0) + L.sp * (line.length - 1), x = cx0 - lw / 2, y = top + li * lh;
      line.forEach(function (o, wi) {
        var p = (t - o.tk.t) / 0.26;
        var col = stack ? (li % 2 ? colAcc : colMain) : (li === L.lines.length - 1 && L.lines.length > 1 && !dark ? colMain : (li === L.lines.length - 1 && dark ? MUSTARD : colMain));
        if (style === 'wrong' || style === 'right') col = INK;
        if (p > 0) {
          var s = lerp(1.7, 1, easeOutBack(p)), rot = (1 - sat(p)) * (wi % 2 ? 0.12 : -0.12);
          ctx.save(); var cx = x + o.w / 2; ctx.translate(cx, y - L.fs * 0.35); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-cx, -(y - L.fs * 0.35)); ctx.globalAlpha = sat(p * 4);
          ctx.font = L.font; ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = dark ? '#120b07' : (style === 'wrong' ? 'rgba(196,61,51,.45)' : style === 'right' ? 'rgba(63,125,47,.45)' : 'rgba(214,160,60,.85)');
          ctx.fillText(o.tk.text, x + L.fs * 0.045, y + L.fs * 0.05);
          ctx.fillStyle = col; ctx.fillText(o.tk.text, x, y);
          ctx.restore();
        }
        x += o.w + L.sp;
      });
      ends.push({ x0: cx0 - lw / 2, x1: cx0 + lw / 2, y: y });
    });
    var strikeT = sc.strikeT, tickT = sc.tickT;
    if (strikeT != null && t >= strikeT) ends.forEach(function (e, i) {
      var p = sat((t - strikeT - i * 0.15) / 0.3), ym = e.y - L.fs * 0.32;
      brushStroke(ctx, [[e.x0 - 30, ym + 14], [e.x1 + 30, ym - 12]], L.fs * 0.13, RED, p, 11 + i);
      brushStroke(ctx, [[e.x1 + 20, ym + 8], [e.x0 - 10, ym + 22]], L.fs * 0.08, RED, sat((t - strikeT - 0.3 - i * 0.15) / 0.22), 17 + i);
    });
    if (tickT != null && t >= tickT) {
      var e = ends[ends.length - 1], tx = e.x1 + 30, ty = e.y - L.fs * 0.1, S = L.fs * 0.9, pt = sat((t - tickT) / 0.35);
      brushStroke(ctx, [[tx, ty - S * 0.38], [tx + S * 0.25, ty - S * 0.05], [tx + S * 0.8, ty - S * 0.95]], L.fs * 0.14, '#3f7d2f', pt, 23);
      ends.forEach(function (e2, i) { brushStroke(ctx, [[e2.x0 - 10, e2.y + L.fs * 0.2], [e2.x1 + 10, e2.y + L.fs * 0.16]], L.fs * 0.06, '#3f7d2f', sat((t - tickT - 0.3) / 0.3), 31 + i); });
    }
    if (style === 'question') {
      var pq = sat((t - (toks.length ? toks[0].t : sc.tStart)) / 0.4);
      ctx.save(); ctx.translate(1680, 300); ctx.rotate(0.15 + 0.05 * Math.sin(t * 2)); ctx.scale(easeOutBack(pq), easeOutBack(pq));
      ctx.font = '900 300px Fraunces'; ctx.textAlign = 'center'; ctx.fillStyle = dark ? 'rgba(0,0,0,.4)' : 'rgba(214,160,60,.5)'; ctx.fillText('?', 12, 110); ctx.fillStyle = dark ? MUSTARD : RED; ctx.fillText('?', 0, 100); ctx.restore();
    }
    if (a.sub) {
      var ps = sat((t - lastT - 0.25) / 0.3), ys = top + (L.lines.length - 1) * lh + L.fs * 0.55 + 70;
      ctx.save(); ctx.globalAlpha = ps; ctx.font = '700 76px Caveat'; ctx.textAlign = 'center'; ctx.fillStyle = dark ? CREAM : (style === 'wrong' ? RED : style === 'right' ? '#3f7d2f' : '#5a4a3a');
      ctx.translate(cx0, ys); ctx.rotate(-0.025); ctx.fillText(a.sub, 0, 0); ctx.restore();
    }
    return cam;
  }

  // ── wrong vs right split
  function drawSplitShot(ctx, t, sc) {
    var a = sc.args || {}, cam = shotCam(sc, t); camTransform(ctx, cam);
    paperBg(ctx, '#ece2c8', t);
    ctx.save(); ctx.fillStyle = 'rgba(196,61,51,.16)'; ctx.fillRect(-60, -60, 1020, 1200); ctx.fillStyle = 'rgba(79,125,58,.17)'; ctx.fillRect(960, -60, 1020, 1200); ctx.restore();
    brushStroke(ctx, [[962, -20], [956, 540], [964, 1100]], 14, INK, 1, 5);
    var pv = easeOutBack((t - sc.tStart) / 0.3);
    ctx.save(); ctx.translate(960, 470); ctx.scale(pv, pv); ctx.fillStyle = MUSTARD; ctx.beginPath(); ctx.arc(0, 0, 58, 0, 7); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
    ctx.font = '400 54px Anton'; ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.fillText('VS', 0, 20); ctx.restore();
    function panel(cx, label, text, t0, good) {
      if (t < t0) return null;
      var p = (t - t0) / 0.3, lab = label || (good ? 'RICHTIG' : 'FALSCH');
      // stamp label
      ctx.save(); ctx.translate(cx, 230); ctx.rotate(good ? 0.04 : -0.05); var sp = lerp(1.8, 1, easeOutBack(p)); ctx.scale(sp, sp); ctx.globalAlpha = sat(p * 4);
      ctx.font = '400 66px Anton'; var lw = measure(lab.toUpperCase(), '400 66px Anton') + 60;
      ctx.strokeStyle = good ? '#3f7d2f' : RED; ctx.lineWidth = 7; ctx.strokeRect(-lw / 2, -50, lw, 96);
      ctx.fillStyle = good ? '#3f7d2f' : RED; ctx.textAlign = 'center'; ctx.fillText(lab.toUpperCase(), 0, 26); ctx.restore();
      // text
      var fs = 120, font; for (; fs > 50; fs -= 4) { font = '900 ' + fs + 'px Fraunces'; if (wrap(text, font, 760).length <= 2 && Math.max.apply(0, wrap(text, font, 760).map(function (l) { return measure(l, font); })) <= 760) break; }
      font = '900 ' + fs + 'px Fraunces'; var lines = wrap(text, font, 760), y0 = 560 - (lines.length - 1) * fs * 0.55;
      var pt = (t - t0 - 0.12) / 0.3;
      ctx.save(); ctx.globalAlpha = sat(pt * 4); var st = lerp(1.4, 1, easeOutBack(pt)); ctx.translate(cx, y0); ctx.scale(st, st); ctx.translate(-cx, -y0);
      ctx.font = font; ctx.textAlign = 'center';
      lines.forEach(function (l, i) { ctx.fillStyle = good ? 'rgba(63,125,47,.35)' : 'rgba(196,61,51,.3)'; ctx.fillText(l, cx + 5, y0 + i * fs * 1.08 + 6); ctx.fillStyle = INK; ctx.fillText(l, cx, y0 + i * fs * 1.08); });
      ctx.restore();
      return { lines: lines, font: font, fs: fs, y0: y0 };
    }
    var L = panel(480, a.leftLabel, a.left || '', sc.leftT || sc.tStart, false);
    if (L) {
      var ts = (sc.leftT || sc.tStart) + 0.9;
      L.lines.forEach(function (l, i) { var w = measure(l, L.font), y = L.y0 + i * L.fs * 1.08 - L.fs * 0.32; brushStroke(ctx, [[480 - w / 2 - 25, y + 12], [480 + w / 2 + 25, y - 10]], L.fs * 0.12, RED, sat((t - ts - i * 0.15) / 0.3), 41 + i); });
    }
    var R = panel(1440, a.rightLabel, a.right || '', sc.rightT || sc.tStart + 2, true);
    if (R) {
      var tt = sc.tickT != null ? sc.tickT : (sc.rightT || 0) + 0.6, l2 = R.lines[R.lines.length - 1], w2 = measure(l2, R.font), y2 = R.y0 + (R.lines.length - 1) * R.fs * 1.08;
      var tx = Math.min(1440 + w2 / 2 + 30, 1860), S2 = R.fs * 0.8;
      brushStroke(ctx, [[tx - S2 * 0.6, y2 + 50], [tx - S2 * 0.35, y2 + 50 + S2 * 0.3], [tx + S2 * 0.2, y2 + 50 - S2 * 0.6]], R.fs * 0.12, '#3f7d2f', sat((t - tt) / 0.35), 51);
    }
    return cam;
  }

  // ── chapter card („Nr. 3 – …")
  function drawChapterShot(ctx, t, sc) {
    var a = sc.args || {}, d = t - sc.tStart, z = 1.03 + 0.05 * smooth(d / 4);
    var cam = { cx: 960 + 8 * Math.sin(t * 0.4), cy: 540, w: 1920 / z }; camTransform(ctx, cam);
    darkBg(ctx, t);
    var t0 = sc.contentStart || sc.tStart;
    if (a.num != null && a.num !== '') {
      drawSlam(ctx, 'NR.', 150, 470, '400 150px Anton', CREAM, (t - t0 + 0.1) / 0.25, 'left');
      drawSlam(ctx, String(a.num), 150, 860, '400 440px Anton', MUSTARD, (t - t0 + 0.05) / 0.3, 'left');
      var tl = String(a.title || ''), fs = 120, font;
      for (; fs > 56; fs -= 4) { font = '900 ' + fs + 'px Fraunces'; var ls = wrap(tl, font, 1000); if (ls.length <= 2 && ls.every(function (l) { return measure(l, font) <= 1000; })) break; }
      font = '900 ' + fs + 'px Fraunces';
      var lines = wrap(tl, font, 1000);
      lines.forEach(function (l, i) { drawSlam(ctx, l, 760, 560 + i * fs * 1.1 - (lines.length - 1) * fs * 0.5, font, CREAM, (t - t0 - 0.4 - i * 0.12) / 0.3, 'left'); });
      if (t > t0 + 0.7) { ctx.save(); ctx.globalAlpha = sat((t - t0 - 0.7) * 3); underlineInk(ctx, 760, 560 + lines.length * fs * 0.62, Math.min(1000, Math.max.apply(0, lines.map(function (l) { return measure(l, font); }))), 77); ctx.restore(); }
    } else {
      var el = { id: 'ch' + sc.i, text: a.title || '' }, L = sc.titleL || (sc.titleL = titleLayout(el)), y = 330 + (3 - L.lines.length) * L.fs * 0.45, wi = 0;
      L.lines.forEach(function (line, li) {
        var x = 160; line.split(' ').forEach(function (w) { drawSlam(ctx, w, x, y, '400 ' + L.fs + 'px Anton', li === L.lines.length - 1 ? MUSTARD : CREAM, (t - t0 - wi * 0.14) / 0.28, 'left'); x += measure(w + ' ', '400 ' + L.fs + 'px Anton'); wi++; });
        y += L.fs * 1.02;
      });
    }
    return cam;
  }

  // ── list (notebook page)
  function drawListShot(ctx, t, sc) {
    var cam = shotCam(sc, t); camTransform(ctx, cam);
    ctx.drawImage(E.notebook, -60, -40, 2040, 1160);
    var title = (sc.args && sc.args.title) || '';
    if (title) {
      var fs = 104, font = '900 ' + fs + 'px Fraunces'; while (measure(title, font) > 1300 && fs > 50) { fs -= 4; font = '900 ' + fs + 'px Fraunces'; }
      drawSlam(ctx, title, 360, 190, font, INK, (t - sc.tStart - 0.05) / 0.3, 'left');
      if (t > sc.tStart + 0.3) { ctx.save(); ctx.globalAlpha = sat((t - sc.tStart - 0.3) * 3); brushStroke(ctx, [[356, 216], [360 + Math.min(1300, measure(title, font)) * 0.5, 208], [370 + Math.min(1300, measure(title, font)), 214]], 14, MUSTARD, sat((t - sc.tStart - 0.3) / 0.35), 9); ctx.restore(); }
    }
    return cam;
  }

  // ── map
  function drawMapShot(ctx, t, sc) {
    var cam = shotCam(sc, t); camTransform(ctx, cam);
    var bg = E.mapLayer;
    if (bg) ctx.drawImage(bg.bg, 0, 0, 1920, 1080); else ctx.drawImage(fallbackSet('Karte: DACH').bg, 0, 0, 1920, 1080);
    (sc.pins || []).forEach(function (p, i) {
      if (t < p.t) return;
      var pt = null, key = String(p.at || '').toLowerCase();
      try { if (root.Sets && Sets.mapPoint) { var q = Sets.mapPoint(key); if (q) pt = Array.isArray(q) ? q : [q.x, q.y]; } } catch (e) { }
      if (!pt) { pt = MAP_FALLBACK[key] || MAP_FALLBACK.center; if (!E.warned['pin' + key]) { E.warned['pin' + key] = 1; if (!MAP_FALLBACK[key]) console.warn('pin at "' + key + '" unknown'); } }
      var a = t - p.t, dy = (1 - easeOutBack(a / 0.4)) * -260;
      ctx.save(); ctx.translate(pt[0], pt[1] + dy);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(6, 4 - dy, 16, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = RED; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-30, -40, -30, -76, 0, -76); ctx.bezierCurveTo(30, -76, 30, -40, 0, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = CREAM; ctx.beginPath(); ctx.arc(0, -52, 9, 0, 7); ctx.fill();
      var fs = 58, font = '700 ' + fs + 'px Caveat', w = measure(p.text, font) + 44, pl = sat((a - 0.25) / 0.25);
      if (pl > 0) {
        ctx.translate(34, -112); ctx.rotate(-0.04 + (i % 2) * 0.06); ctx.scale(easeOutBack(pl), easeOutBack(pl));
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(6, 8, w, 76); ctx.fillStyle = '#f3ead3'; ctx.fillRect(0, 0, w, 76); ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.strokeRect(0, 0, w, 76);
        ctx.fillStyle = INK; ctx.font = font; ctx.textBaseline = 'middle'; ctx.fillText(p.text, 22, 40);
      }
      ctx.restore();
    });
    return cam;
  }

  // ── Melo medium shot
  async function drawMeloShot(ctx, t, sc) {
    var a = sc.args || {}, right = sc.i % 2 === 1, cam = shotCam(sc, t); camTransform(ctx, cam);
    var bgName = a.bg || 'mustard';
    if (BGC[bgName]) darkBg(ctx, t, BGC[bgName]);
    else { sc.set = sc.set || bgName; var lay = await setLayers(sc, t); ctx.drawImage(lay.bg, 0, 0, 1920, 1080); }
    var M = a.framing === 'wide' ? { x: right ? 1320 : 600, y: 1150, s: 1.3 } : { x: right ? 1300 : 620, y: 1150 + 0, s: 1.85 };
    M.y = 440 - (E.headY || -385) * M.s; if (a.framing === 'wide') M.y = 1060;
    E.meloInShot = true;
    await drawMeloFig(ctx, t, M, cam, { boardSide: right ? 'left' : 'right', board: true });
    return cam;
  }

  // ── illustrated scene
  async function drawSceneShot(ctx, t, sc) {
    var tc = freezeT(sc, t), cam = shotCam(sc, tc); camTransform(ctx, cam);
    var lay = await setLayers(sc, tc);
    ctx.drawImage(lay.bg, 0, 0, 1920, 1080);
    drawProps(ctx, sc, tc);
    // characters back to front (slot y)
    var figs = (sc.cast || []).map(function (m) { var s = slotPos(sc, m.slot); return { kind: 'cast', m: m, y: s.y }; });
    var mm = String(sc.melo || ''), mslot = mm.indexOf('in-scene') === 0 ? (mm.split(':')[1] || 'center') : null;
    if (mslot) figs.push({ kind: 'melo', slot: mslot, y: slotPos(sc, mslot).y });
    figs.sort(function (a, b) { return a.y - b.y; });
    E.meloInShot = !!mslot;
    for (var i = 0; i < figs.length; i++) {
      var f = figs[i];
      if (f.kind === 'cast') await drawCast(ctx, sc, f.m, tc, cam);
      else {
        var sl = slotPos(sc, f.slot), side = sl.face === -1 ? 'left' : sl.face === 1 ? 'right' : (sc.cast && sc.cast.length && slotPos(sc, sc.cast[0].slot).x < sl.x) ? 'left' : 'right';
        var my = sl.seated && sl.seatY ? sl.seatY + 165 * (sl.scale || 1) : sl.y;  // seated: legs hidden by the table
        await drawMeloFig(ctx, tc, { x: sl.x, y: my, s: sl.scale || 1.1 }, cam, { boardSide: side, board: false });
      }
    }
    if (lay.fg) ctx.drawImage(lay.fg, 0, 0, 1920, 1080);
    drawFx(ctx, sc, tc);
    drawBubbles(ctx, sc, tc);
    return cam;
  }

  async function drawShot(ctx, t, sc) {
    E.heads = {}; E.mouths = {}; E.headR = {}; E.meloInShot = false;
    ctx.save();
    var cam;
    switch (sc.type) {
      case 'scene': cam = await drawSceneShot(ctx, t, sc); break;
      case 'text': cam = drawTextShot(ctx, t, sc); drawProps(ctx, sc, t); break;
      case 'split': cam = drawSplitShot(ctx, t, sc); drawProps(ctx, sc, t); break;
      case 'chapter': cam = drawChapterShot(ctx, t, sc); break;
      case 'list': cam = drawListShot(ctx, t, sc); drawProps(ctx, sc, t); break;
      case 'map': cam = drawMapShot(ctx, t, sc); drawProps(ctx, sc, t); break;
      case 'melo': cam = await drawMeloShot(ctx, t, sc); drawProps(ctx, sc, t); drawFx(ctx, sc, t); break;
      default: cam = FULL;
    }
    // draw cues of this shot (ink on a paper card / notebook)
    var surf = surfaceFor(sc);
    if (surf) drawBoard(ctx, freezeT(sc, t), cam, surf);
    if (sc.type !== 'scene' && sc.type !== 'melo') drawFx(ctx, sc, t);
    ctx.restore();
    ctx.save(); ctx.setTransform(E.scale, 0, 0, E.scale, 0, 0);
    await drawOverlayMelo(ctx, t, sc);
    drawScreenFx(ctx, sc, t);
    ctx.restore();
  }

  // ── transitions between shots
  function composite(ctx, sc, t) {
    var b = E.buf, p = (t - sc.tStart) / Math.max(0.01, sc.tEnd - sc.tStart), S = E.scale, W2 = 1920 * S, H2 = 1080 * S;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    switch (sc.transition) {
      case 'whip': {
        var e = ease(p), old = E.buf2;
        old.getContext('2d').drawImage(ctx.canvas, 0, 0);
        ctx.fillStyle = '#17130f'; ctx.fillRect(0, 0, W2, H2);
        for (var k = 0; k < 4; k++) {
          ctx.globalAlpha = k ? 0.22 : 1;
          ctx.drawImage(old, -e * W2 - k * 40 * S * Math.sin(p * Math.PI), 0);
          ctx.drawImage(b, (1 - e) * W2 - k * 40 * S * Math.sin(p * Math.PI), 0);
        }
        break;
      }
      case 'slide': {
        var es = easeOut(p), x = (1 - es) * W2;
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.fillRect(x - 30 * S, 0, 30 * S, H2); ctx.globalAlpha = 1;
        ctx.save(); ctx.translate(x, 0); ctx.rotate(-0.02 * (1 - es)); ctx.drawImage(b, 0, 0); ctx.strokeStyle = '#17130f'; ctx.lineWidth = 6 * S; ctx.strokeRect(0, 0, W2, H2); ctx.restore();
        break;
      }
      case 'zoom': {
        var old2 = E.buf2; old2.getContext('2d').drawImage(ctx.canvas, 0, 0);
        var zo = 1 + 2.2 * Math.pow(sat(p / 0.6), 2), zn = lerp(0.6, 1, easeOut(sat((p - 0.3) / 0.7)));
        ctx.fillStyle = '#17130f'; ctx.fillRect(0, 0, W2, H2);
        ctx.globalAlpha = 1 - sat((p - 0.25) / 0.35); ctx.drawImage(old2, W2 / 2 - W2 * zo / 2, H2 / 2 - H2 * zo / 2, W2 * zo, H2 * zo);
        ctx.globalAlpha = sat((p - 0.3) / 0.4); ctx.drawImage(b, W2 / 2 - W2 * zn / 2, H2 / 2 - H2 * zn / 2, W2 * zn, H2 * zn);
        break;
      }
      case 'flash': { ctx.drawImage(b, 0, 0); ctx.fillStyle = '#fff8e6'; ctx.globalAlpha = 1 - p; ctx.fillRect(0, 0, W2, H2); break; }
      default: { // ink-brush wipe
        var edge = lerp(-500, 2400, ease(p)), r = rng(sc.i * 31 + 7), pts = [];
        ctx.setTransform(S, 0, 0, S, 0, 0);
        var poly = new Path2D(), band = new Path2D();
        poly.moveTo(-10, -10);
        for (var y = -20; y <= 1100; y += 30) pts.push([edge - (y - 540) * 0.35 + (r() - 0.5) * 36, y]);
        pts.forEach(function (q) { poly.lineTo(q[0], q[1]); }); poly.lineTo(-10, 1100); poly.closePath();
        ctx.save(); ctx.clip(poly); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(b, 0, 0); ctx.restore();
        band.moveTo(pts[0][0] - 150, pts[0][1]);
        pts.forEach(function (q) { band.lineTo(q[0] + 8, q[1]); });
        for (var k2 = pts.length - 1; k2 >= 0; k2--) band.lineTo(pts[k2][0] - 170 + (r() - 0.5) * 40, pts[k2][1]);
        ctx.fillStyle = '#17130f'; ctx.fill(band);
        for (var d = 0; d < 26; d++) { var q = pts[Math.floor(r() * pts.length)]; ctx.beginPath(); ctx.arc(q[0] + 10 + r() * 60, q[1] + (r() - 0.5) * 30, 2 + r() * 9, 0, 7); ctx.fill(); }
      }
    }
    ctx.restore();
  }

  // ───────────────────────── frame ─────────────────────────
  function camTransform(ctx, cam) {
    var z = 1920 / cam.w * E.scale, h = cam.w * 9 / 16;
    ctx.setTransform(z, 0, 0, z, -(cam.cx - cam.w / 2) * z, -(cam.cy - h / 2) * z);
  }
  async function drawWorld(ctx, t) {
    var cam = camera(t);
    ctx.save(); camTransform(ctx, cam);
    ctx.drawImage(E.setC, 0, 0, W, H);
    E.dof = dofAt(t);
    if (E.dof > 0.01) { ctx.save(); ctx.globalAlpha = E.dof; ctx.drawImage(E.setBlur, 0, 0, W, H); ctx.restore(); }
    drawBoard(ctx, t, cam);
    drawChapterBadge(ctx, t);
    var M = meloPos(t), sc = sceneAt(t);
    if (M) await drawMelo(ctx, t, M, cam, { boardSide: sc.melo === 'side-right' ? 'left' : 'right' });
    ctx.restore();
  }
  async function renderInto(ctx, t, mode) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#e9dfc4'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (mode.layout === 'title') await drawTitleCard(ctx, t, mode);
    else if (isBoardScene(mode)) {
      await drawWorld(ctx, t);
      if (mode.isShot) { ctx.save(); ctx.setTransform(E.scale, 0, 0, E.scale, 0, 0); E.heads = {}; await drawOverlayMelo(ctx, t, mode); drawScreenFx(ctx, mode, t); ctx.restore(); }
    } else await drawShot(ctx, t, mode);
  }
  async function renderFrame(t) {
    if (!E.ready) throw new Error('MeloEngine not initialised');
    t = clamp(t, 0, E.tl.duration);
    var ctx = E.ctx, sc = sceneAt(t), idx = E.scenes.indexOf(sc);
    var animated = { ink: 1, whip: 1, slide: 1, zoom: 1, flash: 1 };
    if (animated[sc.transition] && t < sc.tEnd && idx > 0) {
      var prev = E.scenes[idx - 1];
      E.sceneOverride = prev;
      try { await renderInto(ctx, t, prev); } finally { E.sceneOverride = null; }
      E.sceneOverride = sc;
      try { await renderInto(E.bufCtx, t, sc); } finally { E.sceneOverride = null; }
      composite(ctx, sc, t);
    } else await renderInto(ctx, t, sc);
    // grain + vignette, subtitles
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(E.grain, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
    if (E.subs) { ctx.save(); ctx.setTransform(E.scale, 0, 0, E.scale, 0, 0); drawSubs(ctx, t); ctx.restore(); }
    return true;
  }

  async function initTextures() {
    var S = new SceneInk(77), hatch = S.hatch([[-20, -20], [1940, -20], [1940, 1100], [-20, 1100]], { ang: 30, gap: 10, w: 1.4, op: 0.35, cond: function (X, Y) { return X < 70 || X > 1850 || Y < 60 || Y > 1020; } });
    var paper = '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs>' + S.defs +
      '<filter id="c" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".005" numOctaves="4" seed="19"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .37  0 0 0 0 .2  0 0 0 -1.1 .5"/></filter>' +
      '<filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .27  0 0 0 0 .16  0 0 0 -1.3 .74"/></filter>' +
      '<radialGradient id="v" cx="50%" cy="48%" r="75%"><stop offset=".5" stop-color="#5a3c14" stop-opacity="0"/><stop offset="1" stop-color="#5a3c14" stop-opacity=".35"/></radialGradient></defs>' +
      '<rect width="1920" height="1080" filter="url(#c)" opacity=".7"/><rect width="1920" height="1080" filter="url(#f)" opacity=".3"/><rect width="1920" height="1080" fill="url(#v)"/>' + hatch + '</svg>';
    var pi = await svgImage(paper); E.paperTex = mk(1920 * E.scale, 1080 * E.scale); E.paperTex.getContext('2d').drawImage(pi, 0, 0, 1920 * E.scale, 1080 * E.scale);
    var vg = mk(960, 540), vgc = vg.getContext('2d'), gr = vgc.createRadialGradient(480, 260, 120, 480, 270, 560);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(60,35,15,1)'); vgc.fillStyle = gr; vgc.fillRect(0, 0, 960, 540); E.vigTex = vg;
    // notebook page
    var nb = mk(1920 * E.scale, 1080 * E.scale), nc = nb.getContext('2d'); nc.scale(E.scale, E.scale);
    nc.fillStyle = '#2c333b'; nc.fillRect(0, 0, 1920, 1080);
    nc.save(); nc.translate(960, 545); nc.rotate(-0.012);
    nc.fillStyle = 'rgba(0,0,0,.4)'; nc.fillRect(-850 + 14, -500 + 16, 1700, 1000);
    nc.fillStyle = '#f4ecd6'; nc.fillRect(-850, -500, 1700, 1000);
    nc.strokeStyle = 'rgba(70,110,170,.35)'; nc.lineWidth = 2; for (var y = -250; y < 500; y += 72) { nc.beginPath(); nc.moveTo(-850, y); nc.lineTo(850, y); nc.stroke(); }
    nc.strokeStyle = 'rgba(196,61,51,.55)'; nc.lineWidth = 3; nc.beginPath(); nc.moveTo(-640, -500); nc.lineTo(-640, 500); nc.stroke();
    for (var k = -440; k < 500; k += 90) { nc.fillStyle = '#2c333b'; nc.beginPath(); nc.arc(-790, k, 16, 0, 7); nc.fill(); nc.strokeStyle = '#8a8f96'; nc.lineWidth = 6; nc.beginPath(); nc.arc(-820, k, 28, -0.6, 0.6); nc.stroke(); }
    nc.strokeStyle = '#17130f'; nc.lineWidth = 4; nc.strokeRect(-850, -500, 1700, 1000);
    nc.restore(); nc.drawImage(E.paperTex, 0, 0, 1920, 1080);
    E.notebook = nb;
    E.mapLayer = null;
    if (root.Sets && Sets.has && Sets.has('map-dach')) { try { var ml = await setLayers({ set: 'map-dach', args: {} }, 0); E.mapLayer = ml; } catch (e) { } }
  }

  // ───────────────────────── init ─────────────────────────
  async function init(tl, opts) {
    opts = opts || {};
    E.tl = tl; E.scale = opts.scale || 1; E.subs = opts.subs !== false; E.BS = opts.scale && opts.scale < 1 ? 1.25 : 2;
    var fonts = ['700 40px Kalam', '400 40px Kalam', '700 40px Caveat', '400 40px Anton', '500 40px Oswald', '700 40px Oswald', '900 40px Fraunces'];
    await Promise.all(fonts.map(function (f) { return document.fonts.load(f, 'AaÄßü„“'); }));
    var cv = opts.canvas || document.getElementById('frame');
    cv.width = W * E.scale; cv.height = H * E.scale;
    E.ctx = cv.getContext('2d');
    E.buf = mk(cv.width, cv.height); E.bufCtx = E.buf.getContext('2d');
    // static set (2× for camera zooms)
    var SS = E.scale < 1 ? 1.25 : 2;
    var setImg = await svgImage(MeloSet.svg().replace('width="1920" height="1080"', 'width="' + W * SS + '" height="' + H * SS + '"'));
    E.setC = mk(W * SS, H * SS); var sg = E.setC.getContext('2d'); sg.drawImage(setImg, 0, 0); sg.setTransform(SS, 0, 0, SS, 0, 0); MeloSet.texts(sg);
    E.setBlur = mk(W * SS / 2, H * SS / 2); var sbg = E.setBlur.getContext('2d'); sbg.filter = 'blur(' + (3 * SS / 2) + 'px)'; sbg.drawImage(E.setC, 0, 0, W * SS / 2, H * SS / 2);
    var tb = await svgImage(MeloSet.titleSvg()); E.titleBg = mk(1920, 1080); E.titleBg.getContext('2d').drawImage(tb, 0, 0);
    var rc = mk(1400, 1400), rg = rc.getContext('2d'); rg.translate(700, 700); rg.fillStyle = '#c86a24';
    for (var ri = 0; ri < 28; ri++) { var a0 = ri / 28 * Math.PI * 2; rg.beginPath(); rg.moveTo(0, 0); rg.arc(0, 0, 700, a0, a0 + Math.PI / 28 * 0.9); rg.closePath(); rg.fill(); }
    rg.globalCompositeOperation = 'destination-in'; var rgr = rg.createRadialGradient(0, 0, 60, 0, 0, 700); rgr.addColorStop(0, 'rgba(0,0,0,.9)'); rgr.addColorStop(1, 'rgba(0,0,0,0)'); rg.fillStyle = rgr; rg.fillRect(-700, -700, 1400, 1400);
    E.rays = rc;
    var gi = await svgImage(MeloSet.grainSvg()); E.grain = mk(W * E.scale, H * E.scale); E.grain.getContext('2d').drawImage(gi, 0, 0, W * E.scale, H * E.scale);
    var sp = await svgImage(MeloSet.spongeSvg()); E.sponge = mk(170 * 2, 74 * 2); E.sponge.getContext('2d').drawImage(sp, 0, 0, 340, 148);
    // chalk grain pattern
    var gc = mk(256, 256), gg = gc.getContext('2d'), r = rng(99);
    for (var i = 0; i < 2600; i++) { gg.fillStyle = 'rgba(0,0,0,' + (0.25 + r() * 0.75).toFixed(2) + ')'; var s2 = r() < 0.85 ? 1 : 2; gg.fillRect(r() * 256, r() * 256, s2 + r() * 2, s2); }
    for (i = 0; i < 70; i++) { gg.fillStyle = 'rgba(0,0,0,' + (0.15 + r() * 0.3).toFixed(2) + ')'; gg.fillRect(r() * 256, r() * 256, 6 + r() * 22, 1); }
    E.grainPat = E.ctx.createPattern(gc, 'repeat');
    var sl = GEO.slate; E.cc = mk(sl.w * E.BS, sl.h * E.BS); E.cg = E.cc.getContext('2d');
    E.ccSmall = mk(sl.w / 5, sl.h / 5); E.ccSmallCtx = E.ccSmall.getContext('2d');
    // scenes, elements, layout
    E.scenes = tl.scenes; E.els = tl.elements.slice(); E.byId = {}; E.els.forEach(function (e) { E.byId[e.id] = e; });
    // v2 shots: layout keys for board shots (Melo side/off) and ink surfaces of the other shot types
    LAYOUT['board-left'] = { melo: { x: 470, y: 1044, s: 0.84 }, ca: { x0: 640, y0: 168, x1: 1840, y1: 794 } };
    LAYOUT['board-right'] = { melo: { x: 1745, y: 1044, s: 0.84 }, ca: { x0: 620, y0: 168, x1: 1590, y1: 794 } };
    LAYOUT['board-off'] = { melo: null, ca: { x0: 620, y0: 168, x1: 1840, y1: 794 } };
    var TOP = { x0: 380, y0: 60, x1: 1540, y1: 300 };
    ['scene', 'text', 'split', 'chapter', 'map'].forEach(function (k) { LAYOUT['surf-' + k] = { melo: null, ca: TOP }; });
    LAYOUT['surf-list'] = { melo: null, ca: { x0: 380, y0: 270, x1: 1560, y1: 880 } };
    LAYOUT['surf-melo-l'] = { melo: null, ca: { x0: 1000, y0: 110, x1: 1820, y1: 820 } };
    LAYOUT['surf-melo-r'] = { melo: null, ca: { x0: 100, y0: 110, x1: 920, y1: 820 } };
    E.scenes.forEach(function (sc) {
      if (!sc.isShot) return;
      if (sc.type === 'board' || sc.type === 'quiz') sc.layout = sc.melo === 'side-right' ? 'board-right' : (sc.melo === 'side-left' || sc.melo === 'in-scene' || (sc.type === 'quiz' && !/corner|off|peek|walk/.test(sc.melo))) ? 'board-left' : 'board-off';
      else if (sc.type === 'melo') sc.layout = sc.i % 2 === 1 ? 'surf-melo-r' : 'surf-melo-l';
      else sc.layout = 'surf-' + sc.type;
    });
    E.quotesBy = {}; (tl.quotes || []).forEach(function (q) { (E.quotesBy[q.who] = E.quotesBy[q.who] || []).push(q); });
    E.heads = {}; E.mouths = {}; E.headR = {}; E.warned = {}; E.setCache = {}; E.surfs = {};
    E.SS2 = Math.min(1.3, 1.15 * E.scale + 0.0001) || 1;
    E.buf2 = mk(cv.width, cv.height);
    await initTextures();
    E.chapters = tl.chapters || [];
    E.quizzes = E.els.filter(function (e) { return e.type === 'quiz'; });
    E.scenes.forEach(function (sc) { if (sc.layout !== 'title') layoutScene(sc, E.els.filter(function (e) { return e.scene === sc.i; })); });
    // erase ops
    E.erases = [];
    E.scenes.forEach(function (sc, i) {
      if (sc.transition !== 'erase') return;
      var boxes = E.els.filter(function (e) { return e.eraseBy === 'scene' && Math.abs(e.erase - sc.tStart) < 0.01 && e.box; }).map(function (e) { return e.box; });
      var u = boxUnion(boxes); if (!u) return;
      var ep = eraserPath(u, i * 13 + 1); E.erases.push({ t0: sc.tStart, t1: sc.tEnd, pts: ep.pts, w: ep.w, seed: i * 7 + 3 });
    });
    E.els.forEach(function (e, i) {
      if (e.eraseBy !== 'cue' || !e.box) return;
      var ep = eraserPath(e.box, i * 17 + 5); E.erases.push({ t0: e.erase, t1: e.eraseEnd, pts: ep.pts, w: ep.w, seed: i * 5 + 1 });
    });
    // rig (engine/character/rig.js; falls back to the stub)
    var Rig = root.MeloRig || root.MeloStubRig;
    // words of quotes "spoken" by other characters are left out → Melo keeps his mouth shut there
    E.rig = Rig.prepare({ fps: tl.fps || 30, envelope: tl.envelope, words: tl.rigWords || tl.words, cues: tl.cues, seed: 7, duration: tl.duration });
    try { var a0 = E.rig.render(0, { boardSide: 'right', board: true }).anchors; if (a0 && a0.headCenter) E.headY = a0.headCenter[1]; } catch (e) { }
    // camera keyframes: start states
    E.cam = (tl.camera || []).map(function (k) { return { t: k.t, shot: k.shot, focus: k.focus }; });
    if (!E.cam.length) E.cam = [{ t: 0, shot: 'wide' }];
    for (var c = 0; c < E.cam.length; c++) {
      if (c === 0) { E.cam[c].start = null; continue; }
      E.cam[c].start = null;
      E.cam[c].start = (function (tt) { var save = E.cam.slice(0, c); var K = E.cam; E.cam = save; var f = camRaw(tt); E.cam = K; return f; })(E.cam[c].t);
    }
    E.ready = true;
    return { duration: tl.duration, scenes: E.scenes.length, elements: E.els.length };
  }

  root.MeloEngine = { init: init, renderFrame: renderFrame, _E: E, LAYOUT: LAYOUT };
  root.renderFrame = renderFrame;
})(typeof self !== 'undefined' ? self : this);
