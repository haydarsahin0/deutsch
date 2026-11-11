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
      img.onerror = function (e) { rej(new Error('svg image failed')); };
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
    g.shadowColor = 'rgba(240,236,220,0.22)'; g.shadowBlur = 5 * BS;
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
    board: { melo: { x: 455, y: 1046, s: 1.52 }, ca: { x0: 650, y0: 178, x1: 1836, y1: 790 } },
    split: { melo: { x: 400, y: 1120, s: 1.86 }, ca: { x0: 720, y0: 178, x1: 1836, y1: 790 } },
    melo: { melo: { x: 600, y: 1205, s: 2.36 }, ca: { x0: 1030, y0: 178, x1: 1836, y1: 790 } },
    title: { melo: { x: 1500, y: 1250, s: 2.7 }, ca: { x0: 650, y0: 178, x1: 1836, y1: 790 } }
  };

  // element blocks: measure at scale k → {w, h, build(x, y)}
  function block(el, k, CA) {
    var a = el.args || {}, T0 = el.appear, id = el.id, sd = hashStr(id);
    var maxW = (CA.x1 - CA.x0) * 0.94;
    function txt(type) {
      var fs = { wrong: 82, right: 82, sentence: 68, title: 108, note: 58 }[type] * k, fam = type === 'note' || type === 'title' ? NOTE : HAND;
      var font = '700 ' + fs + 'px ' + fam, lh = fs * (fam === NOTE ? 1.0 : 1.18);
      var mw = type === 'note' ? Math.min(maxW, 560 * k) : maxW - (type === 'right' ? 90 * k : 0);
      var strs = wrap(el.text, font, mw);
      var lw = Math.max.apply(0, strs.map(function (s) { return measure(s, font); }));
      return { font: font, fs: fs, lh: lh, strs: strs, lw: lw };
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
        return { parts: parts, box: { x: x, y: y, w: t === 'title' ? maxW : w, h: h }, lines: lines };
      } };
    }
    if (t === 'bubble') {
      var fsb = 56 * k, fontb = '700 ' + fsb + 'px ' + HAND, lhb = fsb * 1.16, padX = 30 * k, padY = 20 * k, tail = 34 * k;
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
        return { parts: parts, box: { x: x, y: y, w: bw, h: bh + tail } };
      } };
    }
    if (t === 'list') {
      var fsl = 64 * k, fontl = '700 ' + fsl + 'px ' + HAND, lhl = fsl * 1.2, ind = 46 * k, gapl = 10 * k;
      var items = (el.items || []).map(function (it) { return { it: it, strs: wrap(it.text, fontl, maxW - ind) }; });
      var lw = 0, hl = 0;
      items.forEach(function (o) { o.strs.forEach(function (s) { lw = Math.max(lw, measure(s, fontl)); }); hl += o.strs.length * lhl + gapl; });
      return { w: lw + ind, h: hl + fsl * 0.2, build: function (x, y) {
        var parts = [], yy = y;
        items.forEach(function (o, i) {
          if (o.it.t == null) { yy += o.strs.length * lhl + gapl; return; }
          var t0 = o.it.t, base = yy + fsl * 0.92;
          parts.push(StrokePart([[x + 4 * k, base - fsl * 0.3], [x + 26 * k, base - fsl * 0.33]], 7 * k, CHALK.y, t0, 0.15, sd + i));
          parts.push(TextPart(textLines(o.strs, fontl, x + ind, base, lhl), fontl, CHALK.w, t0 + 0.1, o.it.dur || 1));
          yy += o.strs.length * lhl + gapl;
        });
        return { parts: parts, box: { x: x, y: y, w: lw + ind, h: hl } };
      } };
    }
    if (t === 'icon') {
      var S = 210 * k;
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
          ctx.fillStyle = acol; ctx.beginPath(); ctx.arc(0, -ch / 2 + 6 * k, 10 * k, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
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
      var ringX = x + cw - R - 40, ringY = y + chh * 0.56;
      // header tag
      parts.push({ kind: 'custom', paper: true, noTip: true, t0: T0, t1: T0 + 0.4, draw: function (ctx, t) {
        if (t < T0) return null;
        paperTag(ctx, x + 150, y + 30, 270, 66, -4, MUSTARD, 'KERNFRAGE', '700 40px Oswald', INK, (t - T0) / 0.35); return null;
      } });
      var fq = 54, fontq = '700 ' + fq + 'px ' + HAND, qs = wrap(el.q, fontq, cw - 2 * R - 140);
      var ql = textLines(qs, fontq, x + 10, y + 140, fq * 1.15);
      var t = T0 + 0.35, dq = Math.min(2.2, 0.25 + el.q.length * 0.045);
      parts.push(TextPart(ql, fontq, CHALK.w, t, dq)); t += dq + 0.2;
      var oy = ql[ql.length - 1].y + 100, fo = 54, fonto = '700 ' + fo + 'px ' + HAND, rows = [];
      el.options.forEach(function (o, i) {
        var cy = oy + i * 98, cx = x + 46;
        var circle = []; for (var q = 0; q <= 30; q++) { var a = -1.7 + q / 30 * 6.5; circle.push([cx + 30 * Math.cos(a), cy - 18 + 30 * Math.sin(a)]); }
        parts.push(StrokePart(circle, 4.5, CHALK.y, t, 0.3, sd + i * 3));
        var lt = textLines(['ABC'[i] || String(i + 1)], '700 40px Oswald', cx - 12, cy - 4, 40);
        parts.push(TextPart(lt, '700 40px Oswald', CHALK.y, t + 0.15, 0.15));
        var ot = textLines([o], fonto, cx + 56, cy, fo);
        parts.push(TextPart(ot, fonto, CHALK.w, t + 0.25, Math.min(1.2, 0.2 + o.length * 0.05)));
        rows.push({ x: cx - 40, y: cy - 58, w: 70 + 56 + ot[0].w + 20, h: 84, cy: cy, tx: cx + 56, tw: ot[0].w });
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
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '400 ' + Math.round(110 * pop) + 'px Anton';
          ctx.fillStyle = rem < 0.3 ? CHALK.r : CHALK.w; ctx.fillText(tt >= ce ? '0' : String(n), ringX, ringY + 6);
        } else {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 120px Caveat'; ctx.fillStyle = CHALK.g;
          ctx.globalAlpha = sat((tt - el.reveal) / 0.3); ctx.fillText('!', ringX, ringY + 6);
          chalkStroke(ctx, (function () { var p = []; for (var q = 0; q <= 60; q++) { var a = q / 60 * Math.PI * 2; p.push([ringX + R * Math.cos(a), ringY + R * Math.sin(a)]); } return p; })(), 9, CHALK.g, sat((tt - el.reveal) / 0.3));
        }
        ctx.restore(); return null;
      } });
      // reveal: circle the right answer, dim the others
      if (el.reveal != null) {
        var rr = rows[el.answer];
        if (rr) {
          var ell = []; for (var q = 0; q <= 40; q++) { var a = -2.6 + q / 40 * 6.9; ell.push([rr.tx + rr.tw / 2 - 20 + (rr.tw / 2 + 120) * Math.cos(a), rr.cy - 18 + 52 * Math.sin(a)]); }
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
    var L = LAYOUT[sc.layout] || LAYOUT.board, CA = L.ca, best = null;
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
          var nx = prevMain.x + prevMain.w + 70 * k, ny = prevMain.y + Math.max(0, (prevMain.h - b.h) / 2);
          if (!conflicts(nx, ny, b.w, b.h)) pos = [nx, ny];
          if (!pos) for (var yy = prevMain.y + prevMain.h + gap; yy + b.h <= CA.y1; yy += 8) if (!conflicts(CA.x0 + 120 * k, yy, b.w, b.h)) { pos = [CA.x0 + 120 * k, yy]; break; }
        } else if (el.type === 'title') {
          if (!conflicts(CA.x0, CA.y0, b.w, b.h)) pos = [CA.x0, CA.y0];
        }
        if (!pos) {
          var x0 = el.type === 'bubble' && b.side === 'right' ? CA.x1 - b.w - 10 * k : CA.x0 + (el.type === 'bubble' ? 10 * k : 0);
          for (var y = CA.y0; y + b.h <= CA.y1 + 0.5; y += 8) if (!conflicts(x0, y, b.w, b.h)) { pos = [x0, y]; break; }
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
    // vertical balance: push a sparse board a bit down
    var bottom = 0, top = 1e9;
    best.placed.forEach(function (p) { bottom = Math.max(bottom, p.y + p.h); top = Math.min(top, p.y); });
    var dy = best.placed.length && best.placed[0].el.type !== 'quiz' ? Math.max(0, (CA.y1 - bottom) * 0.3) : 0;
    best.placed.forEach(function (p) {
      var r = p.b.build(p.x, p.y + dy);
      p.el.parts = r.parts; p.el.box = r.box; p.el.k = best.k;
      if (p.el.type === 'note' && p.target) {
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
    var sc = E.scenes[0];
    for (var i = 0; i < E.scenes.length; i++) if (E.scenes[i].tStart <= t) sc = E.scenes[i];
    return sc;
  }
  function meloPos(t) {
    var sc = sceneAt(t), L = LAYOUT[sc.layout].melo, i = E.scenes.indexOf(sc);
    if (i > 0 && sc.transition !== 'ink') {
      var prev = E.scenes[i - 1], P = LAYOUT[prev.layout].melo;
      if (prev.layout === 'title') return L;
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
    var sc = sceneAt(t), L = LAYOUT[sc.layout], M = meloPos(t), CA = L.ca;
    var head = E.headY || -385;
    switch (k.shot) {
      case 'melo': {
        var h = 385 * M.s, w = Math.max(760, h * 16 / 9);
        return { cx: M.x + 0.22 * w, cy: M.y + (head + 95) * M.s, w: w };
      }
      case 'board': {
        // visible chalk + Melo's upper body at the board edge, as tight as the content allows
        var vb = boxUnion(visibleBoxes(sc, t)) || { x: CA.x0, y: CA.y0 + 120, w: 520, h: 200 };
        var hx0 = M.x - 120 * M.s, hy0 = M.y + (head - 110) * M.s;
        var x0 = Math.min(vb.x - 60, hx0), x1 = Math.max(vb.x + vb.w + 70, x0 + 1150);
        var y0 = Math.min(vb.y - 60, hy0), y1 = Math.max(vb.y + vb.h + 50, y0 + 1150 * 9 / 16 * 0.84);
        if (sc.layout === 'melo') { x0 = Math.max(x0, CA.x0 - 260); }
        return fitFrame({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, true);
      }
      case 'close': {
        var el = k.focus && E.byId[k.focus];
        var b = el && el.box ? el.box : boxUnion(visibleBoxes(sc, t));
        if (!b) return shotFrame({ shot: 'board' }, t);
        var f = fitFrame({ x: b.x - 90, y: b.y - 70, w: b.w + 180, h: b.h + 140 }, true);
        f.w = Math.max(f.w, 900); return f;
      }
      default: return { cx: 960, cy: 540, w: 1920 };
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
    var fr = E.rig.render(t, { boardSide: 'right', board: !opts.title });
    var g = fr.svg;
    // visible part only (camera frame → character coords)
    var fh = cam.w * 9 / 16, fx0 = cam.cx - cam.w / 2, fy0 = cam.cy - fh / 2;
    var vx0 = Math.max(BB.x0, (fx0 - M.x) / M.s), vx1 = Math.min(BB.x1, (fx0 + cam.w - M.x) / M.s);
    var vy0 = Math.max(BB.y0, (fy0 - M.y) / M.s), vy1 = Math.min(BB.y1, (fy0 + fh - M.y) / M.s);
    if (vx1 <= vx0 || vy1 <= vy0) return fr;
    var zoom = 1920 / cam.w * E.scale, ps = M.s * zoom;
    var pw = Math.ceil((vx1 - vx0) * ps), ph = Math.ceil((vy1 - vy0) * ps);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + pw + '" height="' + ph + '" viewBox="' + vx0.toFixed(2) + ' ' + vy0.toFixed(2) + ' ' + (pw / ps).toFixed(2) + ' ' + (ph / ps).toFixed(2) + '">' + g + '</svg>';
    var img = await svgImage(svg);
    // contact shadow
    if (!opts.title && M.y < 1180) {
      ctx.save(); ctx.fillStyle = 'rgba(40,25,10,.22)'; ctx.beginPath(); ctx.ellipse(M.x + 8 * M.s, M.y + 6 * M.s, 70 * M.s, 9 * M.s, 0, 0, 7); ctx.fill(); ctx.restore();
    }
    ctx.drawImage(img, M.x + vx0 * M.s, M.y + vy0 * M.s, pw / ps * M.s, ph / ps * M.s);
    return fr;
  }

  // ───────────────────────── board content ─────────────────────────
  function drawBoard(ctx, t, cam, opts) {
    var sl = GEO.slate, BS = E.BS, cc = E.cc, g = E.cg;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cc.width, cc.height);
    g.setTransform(BS, 0, 0, BS, -sl.x * BS, -sl.y * BS);
    var vis = E.els.filter(function (e) { return e.parts && e.appear <= t && (e.eraseEnd == null || t < e.eraseEnd) && e.layout !== 'title'; });
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
    E.erases.forEach(function (er) {
      if (t < er.t1 || t > er.t1 + 3) return;
      g.save(); g.globalAlpha = 0.07 * (1 - (t - er.t1) / 3); g.strokeStyle = '#d8dccf'; g.lineWidth = er.w; g.lineCap = 'round'; g.lineJoin = 'round';
      pathOf(g, er.pts); g.stroke(); g.restore();
    });
    drawSet(erasing, false);
    // erase masks
    var sponge = null;
    E.erases.forEach(function (er) {
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
    g.globalAlpha = 0.62; g.fillStyle = E.grainPat;
    g.translate((bi * 97) % 256, (bi * 61) % 256); g.fillRect(-256, -256, cc.width + 512, cc.height + 512);
    g.restore();
    drawSet(normal.concat(erasing), true);
    ctx.drawImage(cc, sl.x, sl.y, cc.width / BS, cc.height / BS);
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
      var sw = 150, sh = 54, ang = Math.sin(sponge.p * 40) * 0.12 - 0.05;
      ctx.save(); ctx.translate(sponge.x, sponge.y); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-sw / 2 + 8, -sh / 2 + 10, sw, sh);
      ctx.drawImage(E.sponge, -sw / 2 - 10, -sh / 2 - 10, sw + 20, sh + 20);
      ctx.restore();
    }
    if (tip) drawChalkStick(ctx, tip, t);
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
    paperTag(ctx, GEO.board.x + 120, GEO.board.y + 2, 150, 56, -5, MUSTARD, 'NR. ' + ch.num, '400 38px Anton', INK, p);
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
    var words = E.tl.words, fs = 44, font = '500 ' + fs + 'px Oswald', lh = fs * 1.28, sp = measure(' ', font);
    var a = sat(Math.min((t - s.start) / 0.12, (s.end - t) / 0.12));
    var widths = s.lines.map(function (line) { return line.reduce(function (acc, tok) { return acc + measure(tok.text, font); }, 0) + sp * (line.length - 1); });
    var maxW = Math.max.apply(0, widths), padX = 26, padY = 12;
    var boxH = s.lines.length * lh + padY * 2, y0 = 1080 - 44 - boxH;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,14,10,.74)';
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
        if (w && state === 1.5) { ctx.fillStyle = MUSTARD; ctx.fillRect(x, y + 7, tw, 4); }
        x += tw + sp;
      });
    });
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
    drawBoard(ctx, t, cam);
    drawChapterBadge(ctx, t);
    var M = meloPos(t);
    await drawMelo(ctx, t, M, cam);
    ctx.restore();
  }
  async function renderInto(ctx, t, mode) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#e9dfc4'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (mode.layout === 'title') await drawTitleCard(ctx, t, mode);
    else await drawWorld(ctx, t);
  }
  async function renderFrame(t) {
    if (!E.ready) throw new Error('MeloEngine not initialised');
    t = clamp(t, 0, E.tl.duration);
    var ctx = E.ctx, sc = sceneAt(t);
    if (sc.transition === 'ink' && t < sc.tEnd) {
      // ink-brush wipe between title card and classroom
      var prev = E.scenes[E.scenes.indexOf(sc) - 1];
      await renderInto(ctx, t, prev);
      var b = E.buf, bg = E.bufCtx;
      await renderInto(bg, t, sc);
      var p = ease((t - sc.tStart) / (sc.tEnd - sc.tStart)), S = E.scale;
      var edge = lerp(-500, 2400, p), r = rng(sc.i * 31 + 7);
      ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0);
      var poly = new Path2D(), band = new Path2D();
      poly.moveTo(-10, -10);
      var pts = [];
      for (var y = -20; y <= 1100; y += 30) pts.push([edge - (y - 540) * 0.35 + (r() - 0.5) * 36, y]);
      pts.forEach(function (q) { poly.lineTo(q[0], q[1]); }); poly.lineTo(-10, 1100); poly.closePath();
      ctx.save(); ctx.clip(poly); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(b, 0, 0); ctx.restore();
      // the ink band itself
      band.moveTo(pts[0][0] - 150, pts[0][1]);
      pts.forEach(function (q) { band.lineTo(q[0] + 8, q[1]); });
      for (var k = pts.length - 1; k >= 0; k--) band.lineTo(pts[k][0] - 170 + (r() - 0.5) * 40, pts[k][1]);
      ctx.fillStyle = '#17130f'; ctx.fill(band);
      for (var d = 0; d < 26; d++) { var q = pts[Math.floor(r() * pts.length)]; ctx.beginPath(); ctx.arc(q[0] + 10 + r() * 60, q[1] + (r() - 0.5) * 30, 2 + r() * 9, 0, 7); ctx.fill(); }
      ctx.restore();
    } else await renderInto(ctx, t, sc);
    // grain + vignette, subtitles
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(E.grain, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
    if (E.subs) { ctx.save(); ctx.setTransform(E.scale, 0, 0, E.scale, 0, 0); drawSubs(ctx, t); ctx.restore(); }
    return true;
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
    // scenes, elements, layout
    E.scenes = tl.scenes; E.els = tl.elements.slice(); E.byId = {}; E.els.forEach(function (e) { E.byId[e.id] = e; });
    E.chapters = tl.chapters || [];
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
    E.rig = Rig.prepare({ fps: tl.fps || 30, envelope: tl.envelope, words: tl.words, cues: tl.cues, seed: 7, duration: tl.duration });
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
