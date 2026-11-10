/*
 * Melo – Konzept C „Das Stück“
 * Code-only SVG generator for the watermelon-slice mascot of „Deutsch mit Melo“.
 *
 * Browser:  <script src="melo-c.js"></script>  →  MeloC.svg({...}) / MeloC.avatar({...})
 * Node:     const MeloC = require('./melo-c.js')
 *
 * Options (all optional):
 *   expression : 'deadpan' | 'smirk' | 'talking' | 'surprised' | 'unimpressed' | 'annoyed' | 'laughing'
 *   mouthOpen  : 0..1   overrides the mouth opening of the expression (lip sync)
 *   blink      : 0..1   closes the lids on top of the expression
 *   look       : [x,y]  pupil direction, -1..1 (overrides expression)
 *   pose       : 'idle' | 'pointing' | 'explaining' | 'chin' | 'shrug' | 'crossed'
 *   view       : 'full' | 'head' | 'bust'
 *   seed       : integer – drives line jitter, hatching and stipple
 *   seedDrop   : bool – a seed pops off the face (default: true for 'surprised')
 *   bite       : bool – the bitten-off corner of the rind (signature), default true
 *   width/height : output size attributes, uid : id prefix (auto)
 *
 * Every animatable part is its own <g class="melo-…"> group with a transform-origin
 * hint in data-pivot ("x,y" in character units).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MeloC = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const PAL = {
    ink: '#191312',
    flesh: '#d2463e',
    fleshLight: '#e9776a',
    fleshPale: '#f0b3a0',
    fleshDark: '#9f2c2c',
    lid: '#c23a35',
    rind: '#ece9c4',
    rindShade: '#cbd09a',
    skin: '#2f6b3c',
    skinDark: '#173f22',
    skinLight: '#6aa356',
    white: '#f8f1e2',
    limb: '#e4e3b8',
    shirt: '#d9a23f',
    shirtDark: '#a8761f',
    pants: '#2a3442',
    shoe: '#efe6d0',
    sole: '#191312',
    mouth: '#2a0b0d',
    tongue: '#ee8d80',
  };

  // ---------- utils ----------
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f = (n) => Math.round(n * 100) / 100;
  const P = (p) => f(p[0]) + ',' + f(p[1]);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };
  const lerp = (a, b, t) => a + (b - a) * t;

  function catmull(pts, n) {
    if (pts.length < 2) return pts.slice();
    const out = [];
    if (pts.length === 2) {
      for (let i = 0; i <= n; i++) out.push([lerp(pts[0][0], pts[1][0], i / n), lerp(pts[0][1], pts[1][1], i / n)]);
      return out;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        const c = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        out.push([c(0), c(1)]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function quadPts(a, c, b, n) {
    const o = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      o.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
    }
    return o;
  }
  function cubicPts(a, b, c, d, n) {
    const o = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      o.push([0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]));
    }
    return o;
  }
  // control point so that a quadratic passes through `mid` at t=.5
  const qc = (a, mid, b) => [2 * mid[0] - (a[0] + b[0]) / 2, 2 * mid[1] - (a[1] + b[1]) / 2];
  function polyD(pts, close = true) {
    let d = 'M' + P(pts[0]);
    for (let i = 1; i < pts.length; i++) d += 'L' + P(pts[i]);
    return d + (close ? 'Z' : '');
  }

  /** Tapered, slightly wobbly ink stroke → filled polygon path data. */
  function brushD(pts, w, o = {}) {
    const s = o.raw ? pts : catmull(pts, o.n || 8);
    const N = s.length; if (N < 2) return '';
    const L = [0];
    for (let i = 1; i < N; i++) L.push(L[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
    const tot = L[N - 1] || 1;
    const ts = o.ts ?? 0.3, te = o.te ?? 0.3, mn = o.min ?? 0.12, ph = o.phase ?? 0, jit = o.jitter ?? 0.14;
    const lf = [], rt = [];
    for (let i = 0; i < N; i++) {
      const t = L[i] / tot; let k = 1;
      if (ts > 0 && t < ts) k = mn + (1 - mn) * Math.sin((t / ts) * Math.PI / 2);
      if (te > 0 && t > 1 - te) k = Math.min(k, mn + (1 - mn) * Math.sin(((1 - t) / te) * Math.PI / 2));
      const wob = 1 + jit * Math.sin(t * 7.3 + ph) * Math.sin(t * 3.1 + ph * 1.7);
      const a = s[Math.max(0, i - 1)], b = s[Math.min(N - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const hw = (w * k * wob) / 2;
      lf.push([s[i][0] - ty * hw, s[i][1] + tx * hw]);
      rt.push([s[i][0] + ty * hw, s[i][1] - tx * hw]);
    }
    let d = 'M' + P(lf[0]);
    for (let i = 1; i < N; i++) d += 'L' + P(lf[i]);
    for (let i = N - 1; i >= 0; i--) d += 'L' + P(rt[i]);
    return d + 'Z';
  }

  /** Procedural hatching: short tapered strokes whose density follows shade(x,y). */
  function hatchD(R, box, o) {
    const ang = ((o.angle ?? -40) * Math.PI) / 180, sp = o.spacing ?? 5, seg = o.seg ?? 20, w = o.w ?? 1.5;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
    const rad = Math.hypot(box[2] - box[0], box[3] - box[1]) / 2;
    let d = '';
    for (let off = -rad; off <= rad; off += sp * (0.85 + R() * 0.3)) {
      let t = -rad - R() * seg;
      while (t < rad) {
        const len = seg * (0.7 + R() * 0.6);
        const mx = cx - sa * off + ca * (t + len / 2), my = cy + ca * off + sa * (t + len / 2);
        if (mx > box[0] - 4 && mx < box[2] + 4 && my > box[1] - 4 && my < box[3] + 4) {
          const sh = o.shade ? o.shade(mx, my) : 1;
          if (sh > (o.thr ?? 0.3) + (R() - 0.5) * 0.25) {
            const L2 = len * Math.min(1, 0.5 + sh * 0.6);
            const j = (R() - 0.5) * 1.4;
            const p0 = [mx - (ca * L2) / 2 - sa * j, my - (sa * L2) / 2 + ca * j];
            const p1 = [mx + (ca * L2) / 2, my + (sa * L2) / 2];
            const bow = (R() - 0.5) * 2;
            const pm = [(p0[0] + p1[0]) / 2 - sa * bow, (p0[1] + p1[1]) / 2 + ca * bow];
            d += brushD([p0, pm, p1], w * (0.65 + sh * 0.55), { ts: 0.2, te: 0.5, min: 0.25, n: 3, jitter: 0 });
          }
        }
        t += len + (o.gap ?? 2.5) + R() * 3;
      }
    }
    return d;
  }

  function stippleD(R, box, n, shade, r0 = 0.6, r1 = 1.5) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = lerp(box[0], box[2], R()), y = lerp(box[1], box[3], R());
      const s = shade(x, y);
      if (R() < s * s) {
        const r = lerp(r0, r1, R());
        d += `M${f(x - r)},${f(y)}a${f(r)},${f(r)} 0 1,0 ${f(2 * r)},0a${f(r)},${f(r)} 0 1,0 ${f(-2 * r)},0`;
      }
    }
    return d;
  }
  const path = (d, fill, extra = '') => (d ? `<path d="${d}" fill="${fill}"${extra}/>` : '');

  // ---------- expressions ----------
  const EXPR = {
    deadpan: {
      eyes: [{ lid: 0.46, tilt: 0.05 }, { lid: 0.42, tilt: 0.05 }], look: [0.8, 0.15], pupil: 7.5,
      brows: [{ y: 2, inner: 2, outer: 3, arch: 2 }, { y: -4, inner: 2, outer: 1, arch: 5 }],
      mouth: { w: 40, smile: 0.12, skew: 0.35, open: 0, dx: 8 }, tilt: 0,
    },
    smirk: {
      eyes: [{ lid: 0.5, tilt: 0.04 }, { lid: 0.34, tilt: 0.0 }], look: [0.85, 0.05], pupil: 7.5,
      brows: [{ y: 4, inner: 4, outer: 2, arch: 1 }, { y: -12, inner: 5, outer: 1, arch: 9 }],
      mouth: { w: 46, smile: 0.5, skew: 1, open: 0, dx: 10 }, tilt: -4,
    },
    talking: {
      eyes: [{ lid: 0.3, tilt: 0 }, { lid: 0.3, tilt: 0 }], look: [0.25, 0.05], pupil: 7.5,
      brows: [{ y: -6, inner: 1, outer: 3, arch: 6 }, { y: -8, inner: 2, outer: 2, arch: 6 }],
      mouth: { w: 50, smile: 0.25, skew: 0.25, open: 0.7, dx: 5 }, tilt: 3,
    },
    surprised: {
      eyes: [{ lid: 0.0 }, { lid: 0.0 }], look: [0, -0.1], pupil: 5.5,
      brows: [{ y: -18, inner: 3, outer: 6, arch: 9 }, { y: -20, inner: 3, outer: 6, arch: 9 }],
      mouth: { w: 26, smile: -0.25, skew: 0, open: 0.5, dx: 2, round: true }, tilt: 0, seedDrop: true,
    },
    unimpressed: {
      eyes: [{ lid: 0.56, tilt: 0.0 }, { lid: 0.56, tilt: 0.0 }], look: [0, 0.2], pupil: 7,
      brows: [{ y: 4, inner: 0, outer: 0, arch: 0 }, { y: 4, inner: 0, outer: 0, arch: 0 }],
      mouth: { w: 34, smile: -0.1, skew: 0, open: 0, dx: 0 }, tilt: 0,
    },
    annoyed: {
      eyes: [{ lid: 0.5, tilt: -0.2 }, { lid: 0.5, tilt: -0.2 }], look: [-0.25, 0.15], pupil: 7,
      brows: [{ y: 2, inner: 13, outer: -5, arch: 0 }, { y: 2, inner: 13, outer: -5, arch: 0 }],
      mouth: { w: 36, smile: -0.5, skew: -0.35, open: 0, dx: -4 }, tilt: 0, stress: true,
    },
    laughing: {
      eyes: [{ happy: true }, { happy: true }], look: [0, 0], pupil: 7,
      brows: [{ y: -12, inner: 2, outer: 4, arch: 7 }, { y: -12, inner: 2, outer: 4, arch: 7 }],
      mouth: { w: 84, smile: 1.1, skew: 0.15, open: 0.95, dx: 4 }, tilt: -8,
    },
  };

  // ---------- head geometry (head space; chin ≈ (0,332)) ----------
  const topY = (x) => -34 + 44 * (x / 160) ** 2;
  const arc1 = (x) => topY(x) + 34;  // dark skin → pale rind
  const arc2 = (x) => topY(x) + 52;  // pale rind → flesh
  function headPathD() {
    const pts = [];
    for (let i = 0; i <= 24; i++) { const x = -160 + (320 * i) / 24; pts.push([x, topY(x)]); }
    let d = 'M' + P(pts[0]);
    for (let i = 1; i < pts.length; i++) d += 'L' + P(pts[i]);
    d += 'C168,108 84,284 15,326Q0,337 -15,326C-84,284 -168,108 -160,10Z';
    return d;
  }
  const HEAD_D = headPathD();
  // the bite: three overlapping circles out of the top-right corner
  const BITE = [[150, -16, 30], [116, -38, 21], [170, 30, 22]];

  const SEEDS = [
    [-120, 132, 0.95], [122, 128, 1.0], [-96, 196, 0.9], [104, 196, 0.95], [-34, 258, 0.85],
    [44, 262, 0.9], [-4, 296, 0.75], [-132, 82, 0.75], [10, 158, 0.75],
  ];
  const DROP_SEED = 1;

  function seedShape(x, y, s, R, pocketOnly) {
    // teardrop pointing toward the slice tip (0,340)
    const ang = Math.atan2(340 - y, 0 - x) * 180 / Math.PI - 90;
    const L = 10 * s, W = 6 * s;
    const drop = `M0,${f(-L)}C${f(W)},${f(-L * 0.25)} ${f(W * 0.8)},${f(L * 0.8)} 0,${f(L)}C${f(-W * 0.8)},${f(L * 0.8)} ${f(-W)},${f(-L * 0.25)} 0,${f(-L)}Z`;
    let g = `<g transform="translate(${f(x)},${f(y)}) rotate(${f(ang + 180 + (R() - 0.5) * 16)})">`;
    g += `<ellipse cx="0" cy="${f(L * 0.1)}" rx="${f(W * 1.55)}" ry="${f(L * 1.45)}" fill="${PAL.fleshPale}" opacity=".55"/>`;
    if (!pocketOnly) {
      g += `<path d="${drop}" fill="${PAL.ink}"/>`;
      g += path(brushD([[-W * 0.45, -L * 0.2], [-W * 0.35, L * 0.35]], 1.6 * s, { jitter: 0 }), '#efe2c8', ' opacity=".8"');
    } else {
      g += `<path d="${drop}" fill="${PAL.fleshDark}" opacity=".55" transform="scale(.8)"/>`;
    }
    return g + '</g>';
  }

  function eyeSVG(cx, cy, e, look, pupilR, side, uid, R) {
    const rx = 31, ry = 21;
    let s = `<g class="melo-eye melo-eye-${side < 0 ? 'l' : 'r'}" data-pivot="${cx},${cy}">`;
    if (e.happy) {
      s += path(brushD([[cx - rx, cy + 10], [cx - rx * 0.45, cy - 6], [cx, cy - 10], [cx + rx * 0.45, cy - 6], [cx + rx, cy + 10]], 10, { ts: 0.2, te: 0.25, min: 0.3, phase: R() * 6 }), PAL.ink);
      s += path(brushD([[cx + side * rx * 0.6, cy + 20], [cx + side * rx * 1.0, cy + 17], [cx + side * rx * 1.25, cy + 10]], 2.6, { phase: R() * 6 }), PAL.ink, ' opacity=".85"');
      return s + '</g>';
    }
    const lid = clamp(e.lid);
    const tilt = e.tilt || 0;
    const half = (x) => ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
    const chord = (x) => cy - ry + lid * 2 * ry + tilt * (x - cx) * side + (lid > 0.04 ? 3 * (1 - ((x - cx) / rx) ** 2) : 0);
    const lidPts = [];
    for (let k = 0; k <= 12; k++) {
      const x = cx - rx + (2 * rx * k) / 12;
      lidPts.push([x, clamp(chord(x), cy - half(x), cy + half(x))]);
    }
    const clip = `${uid}-eye${side}`;
    s += `<clipPath id="${clip}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${PAL.white}"/>`;
    s += `<g clip-path="url(#${clip})">`;
    // shading in the eyeball (lower outer corner)
    s += path(brushD([[cx - rx + 4, cy + ry - 3], [cx, cy + ry + 1], [cx + rx - 3, cy + ry - 5]], 6, { jitter: 0 }), '#d9cdb4');
    const px = cx + look[0] * (rx - 10), py = cy + 4 + look[1] * 8;
    s += `<g class="melo-pupil"><circle cx="${f(px)}" cy="${f(py)}" r="${pupilR}" fill="${PAL.ink}"/>`;
    s += '</g>';
    // eyelid (flesh coloured) + soft lid shadow on the white
    const cover = lidPts.concat([[cx + rx + 6, cy - ry - 10], [cx - rx - 6, cy - ry - 10]]);
    s += `<g class="melo-lid">`;
    s += path(brushD(lidPts.map((p) => [p[0], p[1] + 3]), 7, { raw: true, ts: 0.1, te: 0.1, jitter: 0 }), PAL.ink, ' opacity=".18"');
    s += path(polyD(cover), PAL.flesh) + path(polyD(cover), `url(#${uid}-hl)`);
    s += '</g></g>';
    // lower lid line (thin) + upper lid line (heavy, flicks at the outer corner)
    const low = [];
    for (let k = 1; k <= 9; k++) { const x = cx - rx + (2 * rx * k) / 10; low.push([x, cy + half(x)]); }
    s += path(brushD(low, 3, { ts: 0.35, te: 0.35, phase: R() * 6 }), PAL.ink);
    const outerIdx = side > 0 ? lidPts.length - 1 : 0;
    const lp = lidPts.slice();
    const o = lp[outerIdx];
    const flick = [o[0] + side * 5, o[1] + 1.5];
    const inner = side > 0 ? lp[0] : lp[lp.length - 1];
    const inn = [inner[0] - side * 2, inner[1] + 1];
    let line = side > 0 ? [inn].concat(lp.slice(1), [flick]) : [inn].concat(lp.slice(0, -1).reverse(), [flick]);
    s += `<g class="melo-lidline">` + path(brushD(line, 9.5, { raw: false, n: 3, ts: 0.12, te: 0.2, min: 0.45, phase: R() * 6 }), PAL.ink) + '</g>';
    // lid crease (heavy-lidded, grown-up look)
    if (lid > 0.15 && lid < 0.9) {
      const cy0 = cy - ry - 4;
      s += path(brushD([[cx - side * rx * 0.55, cy0 + 4], [cx + side * rx * 0.1, cy0 - 1], [cx + side * rx * 0.85, cy0 + 3]], 2.6, { ts: 0.4, te: 0.4, phase: R() * 6 }), PAL.ink, ' opacity=".85"');
    }
    // tired little bag under the outer half
    s += path(brushD([[cx - side * 4, cy + ry + 8], [cx + side * 10, cy + ry + 9], [cx + side * 20, cy + ry + 5]], 2.2, { phase: R() * 6 }), PAL.ink, ' opacity=".8"');
    return s + '</g>';
  }

  function browSVG(cx, by, b, side, R) {
    const inner = [cx - side * 26, by + b.inner], mid = [cx + side * 4, by - b.arch], outer = [cx + side * 34, by + b.outer];
    return `<g class="melo-brow melo-brow-${side < 0 ? 'l' : 'r'}" data-pivot="${cx},${by}">` +
      path(brushD([inner, mid, outer], 16, { ts: 0.06, te: 0.5, min: 0.3, phase: R() * 6, jitter: 0.2 }), PAL.ink) + '</g>';
  }

  function mouthSVG(cx, cy, m, uid, R) {
    const w = m.w, sm = m.smile, sk = m.skew, op = clamp(m.open);
    const Lc = [cx - w / 2, cy - sm * 6 + sk * 3], Rc = [cx + w / 2, cy - sm * 6 - sk * 6];
    let s = `<g class="melo-mouth" data-pivot="${cx},${cy}">`;
    if (op < 0.06) {
      const mid = [cx + sk * 3, cy + sm * 4];
      const pts = [Lc, [lerp(Lc[0], mid[0], 0.5), lerp(Lc[1], mid[1], 0.5) + sm * 2], mid, [lerp(mid[0], Rc[0], 0.5), lerp(mid[1], Rc[1], 0.5) + sm * 2], Rc];
      s += path(brushD(pts, 7.5, { ts: 0.25, te: 0.35, min: 0.2, phase: R() * 6 }), PAL.ink);
      if (sm > 0.2 || Math.abs(sk) > 0.3) {
        const c = sk >= 0 ? Rc : Lc, dir = sk >= 0 ? 1 : -1, dn = sm < 0 ? -1 : 1;
        s += path(brushD([[c[0] + dir * 1, c[1] - 7 * dn], [c[0] + dir * 6, c[1] - 1 * dn], [c[0] + dir * 3, c[1] + 6 * dn]], 3.2, { phase: R() * 6 }), PAL.ink);
      }
      // lower lip shadow
      s += path(brushD([[cx - 9 + sk * 2, cy + 11 + sm * 3], [cx + 1 + sk * 3, cy + 13 + sm * 3], [cx + 10 + sk * 3, cy + 11 + sm * 2]], 3, { phase: R() * 6 }), PAL.ink, ' opacity=".75"');
    } else {
      let L = Lc, Rr = Rc;
      if (m.round) { L = [cx - w / 2, cy]; Rr = [cx + w / 2, cy]; }
      const upMid = [cx + sk * 3, cy - op * 4 + sm * 2 - (m.round ? op * 10 : 0)];
      const loMid = [cx + sk * 4, cy + op * 46 + sm * 6];
      const uc = qc(L, upMid, Rr), lc = qc(L, loMid, Rr);
      const shape = `M${P(L)}Q${P(uc)} ${P(Rr)}Q${P(lc)} ${P(L)}Z`;
      const clip = `${uid}-mouth`;
      s += `<clipPath id="${clip}"><path d="${shape}"/></clipPath>`;
      s += `<path d="${shape}" fill="${PAL.mouth}"/>`;
      s += `<g clip-path="url(#${clip})">`;
      s += `<ellipse cx="${f(loMid[0] + 4)}" cy="${f(loMid[1] - 2)}" rx="${f(w * 0.32)}" ry="${f(6 + op * 8)}" fill="${PAL.tongue}"/>`;
      if (op > 0.25 && !m.round) {
        const tp = quadPts(L, uc, Rr, 10).map((p) => [p[0], p[1] + 6.5]);
        s += path(polyD(quadPts(L, uc, Rr, 10).concat(tp.reverse())), PAL.white);
      }
      s += '</g>';
      s += path(brushD(quadPts(L, uc, Rr, 10), 7, { raw: true, ts: 0.15, te: 0.15, min: 0.4, phase: R() * 6 }), PAL.ink);
      s += path(brushD(quadPts(Rr, lc, L, 12), 5.5, { raw: true, ts: 0.15, te: 0.15, min: 0.4, phase: R() * 6 }), PAL.ink);
      s += path(brushD([[loMid[0] - 10, loMid[1] + 8], [loMid[0], loMid[1] + 10], [loMid[0] + 10, loMid[1] + 7]], 3, { phase: R() * 6 }), PAL.ink, ' opacity=".7"');
    }
    return s + '</g>';
  }

  function headSVG(o, ex, uid, R) {
    const bite = o.bite !== false;
    const shade = (x, y) => {
      const side = smooth((x - 20) / 135) * 0.95;
      const low = smooth((y - 210) / 120) * 0.55;
      const leftRim = smooth((-x - 125) / 30) * 0.5;
      const a2 = arc2(x);
      const rindSh = y > a2 ? Math.max(0, 1 - (y - a2) / 30) * 0.9 : 0;
      return clamp(Math.max(side + low * 0.6, rindSh, leftRim, low));
    };
    let s = '';
    const hc = `${uid}-hc`, bm = `${uid}-bite`;
    s += `<clipPath id="${hc}"><path d="${HEAD_D}"/></clipPath>`;
    if (bite) {
      s += `<mask id="${bm}" maskUnits="userSpaceOnUse" x="-260" y="-160" width="520" height="560"><rect x="-260" y="-160" width="520" height="560" fill="#fff"/>`;
      BITE.forEach((c) => (s += `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}" fill="#000"/>`));
      s += '</mask>';
    }
    s += `<g class="melo-headshape"${bite ? ` mask="url(#${bm})"` : ''}>`;
    // ink silhouette (thicker on the shadow side through the offset fill)
    s += `<path d="${HEAD_D}" fill="${PAL.ink}" stroke="${PAL.ink}" stroke-width="13" stroke-linejoin="round"/>`;
    s += `<g transform="translate(-2,-2)"><g clip-path="url(#${hc})">`;
    // flesh
    s += `<rect x="-200" y="-60" width="400" height="420" fill="${PAL.flesh}"/>`;
    s += `<radialGradient id="${uid}-hl" cx="-70" cy="110" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${PAL.fleshLight}" stop-opacity=".55"/><stop offset="1" stop-color="${PAL.fleshLight}" stop-opacity="0"/></radialGradient>`;
    s += `<rect x="-200" y="-60" width="400" height="420" fill="url(#${uid}-hl)"/>`;
    // pale transition under rind
    const pale = [];
    for (let i = 0; i <= 20; i++) { const x = -180 + 18 * i; pale.push([x, arc2(x) + 16]); }
    s += path(polyD(pale.concat([[180, -80], [-180, -80]])), PAL.fleshPale, ' opacity=".55"');
    // fibres radiating to the tip
    let fib = '';
    for (let i = 0; i < 70; i++) {
      const x = lerp(-150, 150, R()), y = lerp(40, 320, R());
      const dx = -x, dy = 345 - y, l = Math.hypot(dx, dy) || 1, len = 7 + R() * 12;
      fib += brushD([[x, y], [x + (dx / l) * len, y + (dy / l) * len]], 1.6, { jitter: 0, ts: 0.4, te: 0.4 });
    }
    s += path(fib, PAL.fleshLight, ' opacity=".55"');
    // seed pockets & seeds
    const drop = o.seedDrop;
    SEEDS.forEach((sd, i) => (s += seedShape(sd[0], sd[1], sd[2], R, drop && i === DROP_SEED)));
    // stubble – fine stipple round the chin
    const stub = (x, y) => {
      const d = ((x - 2) / 92) ** 2 + ((y - 262) / 74) ** 2;
      const nearMouth = Math.abs(y - 222) < 16 && Math.abs(x) < 40;
      return y > 196 && d < 1 && !nearMouth ? 0.85 - d * 0.35 : 0;
    };
    s += path(stippleD(R, [-100, 190, 100, 340], 1400, stub, 0.55, 1.05), PAL.ink, ' opacity=".55"');
    // stipple + hatching (ink)
    s += path(stippleD(R, [-170, 0, 170, 340], 1500, shade, 0.5, 1.4), PAL.ink, ' opacity=".8"');
    s += path(stippleD(R, [-170, 20, 170, 340], 900, () => 0.42, 0.45, 0.9), PAL.fleshDark, ' opacity=".7"');
    s += path(hatchD(R, [-170, -10, 175, 345], { angle: -58, spacing: 5.2, seg: 18, w: 1.7, thr: 0.38, shade }), PAL.ink);
    s += path(hatchD(R, [-170, -10, 175, 345], { angle: 22, spacing: 6, seg: 16, w: 1.5, thr: 0.72, shade }), PAL.ink);
    // pale rind band
    const band2 = [];
    for (let i = 0; i <= 24; i++) { const x = -190 + (380 * i) / 24; band2.push([x, arc2(x)]); }
    s += path(polyD(band2.concat([[190, -90], [-190, -90]])), PAL.rind);
    s += path(hatchD(R, [40, -40, 175, 80], { angle: -60, spacing: 4.5, seg: 10, w: 1.2, thr: 0.4, shade: (x, y) => (y < arc2(x) - 1 ? smooth((x - 60) / 90) : 0) }), PAL.rindShade);
    // dark skin band + stripes
    const band1 = [];
    for (let i = 0; i <= 24; i++) { const x = -190 + (380 * i) / 24; band1.push([x, arc1(x)]); }
    s += path(polyD(band1.concat([[190, -90], [-190, -90]])), PAL.skin);
    let st = '';
    for (let i = -7; i <= 7; i++) {
      const x0 = i * 24 + (R() - 0.5) * 6;
      const pts = [];
      for (let k = 0; k <= 4; k++) {
        const y = lerp(topY(x0) - 10, arc1(x0) + 4, k / 4);
        pts.push([x0 + (k % 2 ? 4 : -4) + x0 * 0.06 * (k / 4), y]);
      }
      st += brushD(pts, 10 + R() * 3, { ts: 0.05, te: 0.5, min: 0.3, phase: R() * 6, jitter: 0.25 });
    }
    s += path(st, PAL.skinDark);
    let hl = '';
    for (let i = 0; i < 9; i++) {
      const x = -140 + i * 20 + R() * 6;
      hl += brushD([[x, topY(x) + 9], [x + 9, topY(x + 9) + 7]], 2.6, { jitter: 0 });
    }
    s += path(hl, PAL.skinLight, ' opacity=".8"');
    s += path(hatchD(R, [-170, -45, 175, 50], { angle: -62, spacing: 4, seg: 12, w: 1.4, thr: 0.35, shade: (x, y) => (y < arc1(x) ? smooth((x - 30) / 100) : 0) }), PAL.ink);
    // band separation lines
    s += path(brushD(band1.slice(2, 23), 3.2, { ts: 0.15, te: 0.15, raw: true, phase: R() * 6 }), PAL.ink);
    s += path(brushD(band2.slice(3, 22), 1.8, { ts: 0.2, te: 0.2, raw: true, phase: R() * 6 }), PAL.ink, ' opacity=".7"');
    s += '</g></g>';
    // calligraphic accents on the shadow side of the silhouette
    const side = cubicPts([160, 10], [168, 108], [84, 284], [15, 326], 24).map((p) => [p[0] + 3.5, p[1] + 3]);
    s += path(brushD(side.slice(3), 8, { raw: true, ts: 0.2, te: 0.35, phase: R() * 6 }), PAL.ink);
    s += path(brushD([[-163, 30], [-160, 120]], 3.5, { ts: 0.4, te: 0.4 }), PAL.ink);
    s += '</g>';
    // bite edge: ink rims of the bite circles inside the slice + exposed flesh rim
    if (bite) {
      const bc = `${uid}-bclip`;
      s += `<clipPath id="${bc}"><path d="${HEAD_D}"/></clipPath>`;
      // ring mask: only the parts of each circle's rim that lie outside the other circles
      let ring = `<mask id="${bm}-ring" maskUnits="userSpaceOnUse" x="-260" y="-160" width="520" height="560"><rect x="-260" y="-160" width="520" height="560" fill="#fff"/>`;
      BITE.forEach((c) => (ring += `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2] - 0.5}" fill="#000"/>`));
      ring += '</mask>';
      let rims = '';
      BITE.forEach((c, i) => {
        const pts = [];
        for (let k = 0; k <= 36; k++) { const a = (k / 36) * Math.PI * 2; pts.push([c[0] + Math.cos(a) * (c[2] + 2.5), c[1] + Math.sin(a) * (c[2] + 2.5)]); }
        rims += brushD(pts, 7.5, { raw: true, ts: 0, te: 0, jitter: 0.3, phase: i * 2 });
      });
      s += ring + `<g clip-path="url(#${bc})" mask="url(#${bm}-ring)">` + path(rims, PAL.ink) + '</g>';
    }
    // face
    const look = o.look || ex.look;
    const eyes = ex.eyes.map((e) => Object.assign({}, e, e.happy ? {} : { lid: Math.max(e.lid || 0, o.blink || 0) }));
    const blinkHappy = (o.blink || 0) > 0.5;
    s += `<g class="melo-face" data-pivot="0,180">`;
    const ey = 108;
    s += browSVG(-58, ey - 40 + ex.brows[0].y, ex.brows[0], -1, R);
    s += browSVG(58, ey - 40 + ex.brows[1].y, ex.brows[1], 1, R);
    s += eyeSVG(-58, ey, blinkHappy ? { lid: 1 } : eyes[0], look, ex.pupil || 7.5, -1, uid, R);
    s += eyeSVG(58, ey, blinkHappy ? { lid: 1 } : eyes[1], look, ex.pupil || 7.5, 1, uid, R);
    const m = Object.assign({}, ex.mouth);
    if (typeof o.mouthOpen === 'number') m.open = o.mouthOpen;
    s += mouthSVG(m.dx || 0, 218, m, uid, R);
    if (ex.stress) {
      // dry little stress marks next to the head (no anime vein)
      s += path(brushD([[176, 60], [196, 44]], 4, {}) + brushD([[182, 82], [206, 78]], 4, {}) + brushD([[178, 104], [198, 112]], 4, {}), PAL.ink);
    }
    s += '</g>';
    if (o.seedDrop) {
      const sd = SEEDS[DROP_SEED];
      s += `<g class="melo-seeddrop">`;
      s += `<g transform="translate(184,176) rotate(-40)"><path d="M0,-15C9,-5 8,11 0,15C-8,11 -9,-5 0,-15Z" fill="${PAL.ink}"/></g>`;
      s += path(brushD([[150, 140], [166, 156]], 3.5, {}) + brushD([[160, 128], [176, 146]], 3.5, {}) + brushD([[190, 200], [204, 214]], 3, {}) + brushD([[204, 168], [222, 172]], 3, {}), PAL.ink);
      s += '</g>';
    }
    return s;
  }

  // ---------- body ----------
  const LIMB_W = 15, INK = 6;
  function tube(pts, w, color, n = 6) {
    const s = catmull(pts, n);
    const d = polyD(s, false);
    return {
      d,
      ink: `<path d="${d}" fill="none" stroke="${PAL.ink}" stroke-width="${w + INK * 2}" stroke-linecap="round" stroke-linejoin="round"/>`,
      fill: `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-1.6,-1.4)"/>`,
    };
  }
  // hatched crescent on the shadow side of a stroked tube
  function tubeShade(R, uid, key, pts, w, box, dense) {
    const t = tube(pts, w, '#fff');
    const id = `${uid}-sh-${key}`;
    let s = `<mask id="${id}" maskUnits="userSpaceOnUse" x="${box[0]}" y="${box[1]}" width="${box[2] - box[0]}" height="${box[3] - box[1]}">`;
    s += `<path d="${t.d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="${t.d}" fill="none" stroke="#000" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${-w * 0.42},${-w * 0.35})"/></mask>`;
    s += `<g mask="url(#${id})">` + path(hatchD(R, box, { angle: -50, spacing: dense ? 3.4 : 4.2, seg: 12, w: 1.3, thr: 0.1, shade: () => 1 }), PAL.ink) + '</g>';
    return s;
  }

  function fingerPaths(type) {
    // hand space: wrist at 0,0 pointing +x, thumb towards -y
    const F = [];
    const open = [[[24, -9], -24, 17], [[27, -3], -8, 21], [[27, 3.5], 7, 20], [[24, 9.5], 22, 16]];
    if (type === 'open' || type === 'shrug') {
      open.forEach(([b, a, l]) => { const r = (a * Math.PI) / 180; F.push([b, [b[0] + Math.cos(r) * l, b[1] + Math.sin(r) * l]]); });
      F.push([[9, -10], [15, -20], [22, -27]]);
    } else if (type === 'point') {
      F.push([[26, -6], [40, -7], [52, -8]]);
      F.push([[26, 0], [32, 3], [29, 7]]);
      F.push([[25, 5], [30, 9], [26, 12]]);
      F.push([[22, 10], [26, 14], [21, 16]]);
      F.push([[10, -10], [18, -14], [25, -8]]);
    } else if (type === 'fist') {
      F.push([[24, -7], [29, -5]]); F.push([[25, -1], [30, 1]]); F.push([[24, 5], [29, 7]]); F.push([[22, 10], [26, 12]]);
      F.push([[10, -11], [19, -11], [25, -6]]);
    } else if (type === 'chin') {
      F.push([[24, -7], [33, -9], [38, -4]]); F.push([[25, -1], [31, 2], [28, 6]]); F.push([[24, 5], [28, 9], [24, 11]]); F.push([[21, 10], [24, 14], [19, 15]]);
      F.push([[10, -10], [20, -16], [28, -18]]);
    } else { // relaxed
      F.push([[24, -8], [34, -8], [41, -3]]); F.push([[26, -2], [37, -1], [43, 5]]); F.push([[25, 4], [35, 6], [39, 12]]); F.push([[22, 9], [30, 12], [32, 17]]);
      F.push([[10, -10], [17, -16], [24, -15]]);
    }
    return F;
  }
  function handSVG(x, y, ang, type, flip, R, cls) {
    const sc = 1.6;
    let s = `<g class="${cls}" data-pivot="${f(x)},${f(y)}" transform="translate(${f(x)},${f(y)}) rotate(${f(ang)}) scale(${sc},${flip ? -sc : sc})">`;
    const palm = 'M2,-9C10,-14 24,-13 28,-6C31,0 30,8 25,12C18,16 6,15 2,9C-2,4 -2,-5 2,-9Z';
    const fw = 8.2;
    s += `<path d="${palm}" fill="${PAL.ink}" stroke="${PAL.ink}" stroke-width="${INK * 1.5}" stroke-linejoin="round"/>`;
    fingerPaths(type).forEach((fp) => {
      const d = polyD(catmull(fp, 4), false);
      s += `<path d="${d}" fill="none" stroke="${PAL.ink}" stroke-width="${fw + 4.4}" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="${d}" fill="none" stroke="${PAL.limb}" stroke-width="${fw}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-.8,-.8)"/>`;
    });
    s += `<path d="${palm}" fill="${PAL.limb}" transform="translate(-.6,-.8) scale(.97)"/>`;
    // knuckle / palm hatching
    s += path(brushD([[6, 8], [16, 11], [24, 8]], 1.6, {}) + brushD([[9, 4], [19, 6]], 1.2, {}), PAL.ink, ' opacity=".8"');
    return s + '</g>';
  }

  function shoeSVG(x, y, dir) {
    const d = 'M-14,-16C-8,-26 14,-24 24,-14C40,-12 52,-4 50,5L-16,5C-20,-2 -18,-10 -14,-16Z';
    let s = `<g class="melo-shoe" transform="translate(${x},${y}) scale(${dir * 1.25},1.25)">`;
    s += `<path d="${d}" fill="${PAL.ink}" stroke="${PAL.ink}" stroke-width="10" stroke-linejoin="round"/>`;
    s += `<path d="${d}" fill="${PAL.shoe}" transform="translate(-1,-1.5)"/>`;
    s += `<path d="M-17,-1L51,-1L50,6L-16,6Z" fill="${PAL.sole}"/>`;
    s += path(brushD([[2, -18], [10, -12], [18, -16]], 2.2, {}) + brushD([[26, -10], [40, -6]], 1.6, {}), PAL.ink);
    return s + '</g>';
  }

  const POSES = {
    idle: {
      arms: [
        { side: -1, pts: [[-48, 396], [-70, 502], [-74, 606]], hand: 'relaxed', ha: 100, flip: true, layer: 'back' },
        { side: 1, pts: [[48, 396], [76, 508], [30, 628]], hand: 'pocket', layer: 'mid' },
      ],
      legs: [[[-20, 640], [-24, 782], [-30, 930]], [[20, 640], [44, 778], [44, 928]]], lean: 3,
    },
    pointing: {
      arms: [
        { side: -1, pts: [[-50, 396], [-112, 478], [-52, 566]], hand: 'fist', ha: 10, flip: false, layer: 'back' },
        { side: 1, pts: [[50, 396], [126, 352], [192, 288]], hand: 'point', ha: -40, flip: false, layer: 'front' },
      ],
      legs: [[[-20, 640], [-40, 780], [-56, 928]], [[20, 640], [36, 782], [50, 930]]], lean: -3,
    },
    explaining: {
      arms: [
        { side: -1, pts: [[-50, 396], [-88, 502], [-150, 446]], hand: 'open', ha: -150, flip: false, layer: 'front' },
        { side: 1, pts: [[50, 396], [90, 502], [152, 444]], hand: 'open', ha: -30, flip: true, layer: 'front' },
      ],
      legs: [[[-20, 640], [-30, 782], [-40, 930]], [[20, 640], [40, 776], [36, 928]]], lean: 0,
    },
    chin: {
      arms: [
        { side: -1, pts: [[-48, 396], [-66, 500], [58, 494]], hand: 'fist', ha: -15, flip: true, layer: 'front' },
        { side: 1, pts: [[48, 396], [74, 488], [26, 372]], hand: 'chin', ha: -112, flip: true, layer: 'front2' },
      ],
      legs: [[[-20, 640], [-26, 782], [-30, 930]], [[20, 640], [34, 780], [42, 928]]], lean: 4,
    },
    shrug: {
      arms: [
        { side: -1, pts: [[-50, 396], [-104, 470], [-150, 420]], hand: 'open', ha: -165, flip: false, layer: 'front' },
        { side: 1, pts: [[50, 396], [104, 470], [150, 420]], hand: 'open', ha: -15, flip: true, layer: 'front' },
      ],
      legs: [[[-20, 640], [-26, 782], [-30, 930]], [[20, 640], [26, 782], [30, 930]]],
      shoulders: -10,
    },
    crossed: {
      arms: [
        { side: 1, pts: [[50, 396], [72, 488], [-30, 470]], hand: 'fist', ha: 190, flip: false, layer: 'front' },
        { side: -1, pts: [[-50, 396], [-72, 494], [36, 478]], hand: 'fist', ha: -10, flip: true, layer: 'front2' },
      ],
      legs: [[[-20, 640], [-34, 782], [-44, 930]], [[20, 640], [34, 782], [44, 930]]], lean: -2,
    },
  };

  function armSVG(a, R, uid, key) {
    let s = `<g class="melo-arm melo-arm-${a.side < 0 ? 'l' : 'r'}" data-pivot="${a.pts[0][0]},${a.pts[0][1]}">`;
    const t = tube(a.pts, LIMB_W, PAL.limb);
    const sl = catmull(a.pts, 10).slice(0, 5);
    const sleeve = tube(sl, 27, PAL.shirt, 2);
    const xs = a.pts.map((p) => p[0]), ys = a.pts.map((p) => p[1]);
    const box = [Math.min(...xs) - 25, Math.min(...ys) - 25, Math.max(...xs) + 25, Math.max(...ys) + 25];
    s += t.ink + t.fill + tubeShade(R, uid, key, a.pts, LIMB_W, box, false);
    s += sleeve.ink + sleeve.fill + tubeShade(R, uid, key + 's', sl, 27, box, true);
    const sEnd = sl[sl.length - 1];
    s += path(brushD([[sEnd[0] - 10, sEnd[1] - 4], [sEnd[0] + 10, sEnd[1] + 4]], 2.2, {}), PAL.ink, ' opacity=".6"');
    if (a.hand === 'pocket') {
      const w = a.pts[a.pts.length - 1];
      s += `<g class="melo-hand"><path d="M${w[0] - 14},${w[1] - 6}L${w[0] + 12},${w[1] - 10}L${w[0] + 10},${w[1] + 22}L${w[0] - 12},${w[1] + 24}Z" fill="${PAL.pants}"/>`;
      s += path(brushD([[w[0] - 15, w[1] - 4], [w[0], w[1] - 9], [w[0] + 13, w[1] - 11]], 4, {}), PAL.ink) + '</g>';
    } else {
      const w = a.pts[a.pts.length - 1], e = a.pts[a.pts.length - 2];
      const ang = a.ha ?? (Math.atan2(w[1] - e[1], w[0] - e[0]) * 180) / Math.PI;
      s += handSVG(w[0], w[1], ang, a.hand, a.flip, R, 'melo-hand');
    }
    return s + '</g>';
  }

  function bodySVG(o, R, uid) {
    const pose = POSES[o.pose] || POSES.idle;
    const layers = { back: '', mid: '', front: '', front2: '' };
    pose.arms.forEach((a, i) => (layers[a.layer] += armSVG(a, R, uid, 'a' + i)));
    let s = '';
    // ground shadow
    const gid = `${uid}-gnd`;
    s += `<clipPath id="${gid}"><ellipse cx="6" cy="938" rx="120" ry="13"/></clipPath>`;
    s += `<g class="melo-shadow" clip-path="url(#${gid})">` + path(hatchD(R, [-120, 920, 130, 955], { angle: -20, spacing: 3.5, seg: 14, w: 1.3, thr: 0.1, shade: () => 1 }), PAL.ink, ' opacity=".7"') + '</g>';
    // legs + shoes
    s += `<g class="melo-legs">`;
    pose.legs.forEach((lp, i) => {
      const a = lp[2];
      s += shoeSVG(a[0] + (i ? 4 : -4), a[1] + 4, i ? 1 : -1);
    });
    const hip = 'M-44,598L44,598L46,652L-46,652Z';
    s += `<path d="${hip}" fill="${PAL.ink}" stroke="${PAL.ink}" stroke-width="${INK * 2}" stroke-linejoin="round"/>`;
    const legT = pose.legs.map((lp) => tube(lp, 27, PAL.pants));
    legT.forEach((t) => (s += t.ink));
    s += `<path d="${hip}" fill="${PAL.pants}" transform="translate(-1.5,-1.5)"/>`;
    legT.forEach((t) => (s += t.fill));
    pose.legs.forEach((lp, i) => (s += tubeShade(R, uid, 'l' + i, lp, 27, [lp[0][0] - 40, 600, lp[0][0] + 50, 950], true)));
    // pant creases + fly
    s += path(brushD([[0, 640], [1, 668]], 2.6, {}), PAL.ink);
    pose.legs.forEach((lp) => {
      const k = lp[1];
      s += path(brushD([[k[0] - 8, k[1] - 6], [k[0] + 2, k[1] + 2], [k[0] + 10, k[1] - 2]], 2, {}), PAL.white, ' opacity=".35"');
    });
    s += '</g>';
    const lower = s;
    s = '';
    // neck
    const neck = tube([[0, 312], [1, 345], [0, 385]], 14, PAL.limb);
    s += `<g class="melo-neck">` + neck.ink + neck.fill + path(hatchD(R, [-10, 315, 12, 380], { angle: -45, spacing: 3, seg: 8, w: 1.2, thr: 0, shade: () => 1 }), PAL.ink) + '</g>';
    // torso (t-shirt)
    const sh = pose.shoulders || 0;
    const torso = `M-14,378C-30,380 -44,${384 + sh} -50,${396 + sh}C-44,450 -40,530 -43,606C-16,614 16,614 43,606C40,530 44,450 50,${396 + sh}C44,${384 + sh} 30,380 14,378C8,388 -8,388 -14,378Z`;
    const tid = `${uid}-torso`;
    s += `<g class="melo-torso" data-pivot="0,600">`;
    s += `<path d="${torso}" fill="${PAL.ink}" stroke="${PAL.ink}" stroke-width="${INK * 2}" stroke-linejoin="round"/>`;
    s += `<path d="${torso}" fill="${PAL.shirt}" transform="translate(-1.5,-1.5)"/>`;
    s += `<clipPath id="${tid}"><path d="${torso}"/></clipPath><g clip-path="url(#${tid})">`;
    const tShade = (x, y) => clamp(Math.max(smooth((x - 10) / 40), smooth((420 - y) / 40) * 0.9, smooth((y - 570) / 40) * 0.6));
    s += path(hatchD(R, [-60, 375, 60, 615], { angle: -50, spacing: 4.2, seg: 14, w: 1.4, thr: 0.35, shade: tShade }), PAL.ink);
    s += path(hatchD(R, [-60, 375, 60, 615], { angle: 30, spacing: 4.6, seg: 12, w: 1.3, thr: 0.75, shade: tShade }), PAL.ink);
    s += '</g>';
    // signature item: red correction marker clipped in the chest pocket
    s += `<g class="melo-marker" transform="translate(25 446) rotate(10) scale(1.45) translate(-25 -446)">`;
    s += `<rect x="19" y="404" width="12" height="40" rx="3" fill="${PAL.ink}"/>`;
    s += `<rect x="21" y="408" width="8" height="15" rx="2.5" fill="${PAL.flesh}"/>`;
    s += `<rect x="27.5" y="409" width="2.2" height="20" fill="${PAL.ink}"/>`;
    s += '</g>';
    const pocket = 'M8,432L42,428L43,462C34,467 18,468 10,464Z';
    s += `<path d="${pocket}" fill="${PAL.ink}" stroke="${PAL.ink}" stroke-width="4.5" stroke-linejoin="round"/>`;
    s += `<path d="${pocket}" fill="${PAL.shirt}" transform="translate(-.8,-.8)"/>`;
    s += path(hatchD(R, [8, 428, 44, 468], { angle: -50, spacing: 3.6, seg: 10, w: 1.2, thr: 0.3, shade: (x) => smooth((x - 22) / 18) }), PAL.ink);
    s += path(brushD([[9, 437], [42, 433]], 2, {}), PAL.ink, ' opacity=".8"');
    // collar + folds
    s += path(brushD([[-15, 380], [-6, 391], [6, 391], [15, 380]], 3.2, {}), PAL.ink);
    s += path(brushD([[-30, 560], [-12, 574], [-4, 590]], 1.8, {}) + brushD([[20, 520], [30, 545]], 1.8, {}), PAL.ink, ' opacity=".8"');
    s += '</g>';
    return { lower, back: layers.back, upper: s, mid: layers.mid, front: layers.front, front2: layers.front2, lean: pose.lean || 0 };
  }

  let COUNTER = 0;
  function defs(uid, seed) {
    return `<defs><filter id="${uid}-ink" filterUnits="userSpaceOnUse" x="-400" y="-300" width="800" height="1400" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="${seed % 97}" result="w"/>
<feDisplacementMap in="SourceGraphic" in2="w" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="d"/>
<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${(seed * 7) % 97}" result="g"/>
<feColorMatrix in="g" type="matrix" values="0.55 0 0 0 0.62  0.55 0 0 0 0.62  0.55 0 0 0 0.62  0 0 0 0 1" result="gg"/>
<feBlend in="d" in2="gg" mode="multiply" result="b"/>
<feComposite in="b" in2="d" operator="in"/>
</filter></defs>`;
  }

  /** Character group (no <svg>), in character units. */
  function group(opts = {}) {
    const o = Object.assign({ expression: 'deadpan', pose: 'idle', seed: 7, blink: 0, view: 'full', bite: true }, opts);
    const ex = EXPR[o.expression] || EXPR.deadpan;
    if (o.seedDrop === undefined) o.seedDrop = !!ex.seedDrop;
    const uid = o.uid || `mc${++COUNTER}s${o.seed}`;
    const R = rng(o.seed * 9973 + 17);
    const tilt = (o.headTilt ?? ex.tilt ?? 0) + (o.pose === 'shrug' ? -6 : 0) + (o.pose === 'chin' ? 5 : 0);
    let s = defs(uid, o.seed);
    s += `<g class="melo" filter="url(#${uid}-ink)">`;
    let b = { lower: '', back: '', upper: '', mid: '', front: '', front2: '', lean: 0 };
    if (o.view !== 'head') b = bodySVG(o, R, uid);
    const lean = o.lean ?? b.lean;
    s += `<g class="melo-lower">${b.lower}</g>`;
    s += `<g class="melo-upper" data-pivot="0,630" transform="rotate(${f(lean)} 0 630)">`;
    s += `<g class="melo-body">${b.back}${b.upper}${b.mid}</g>`;
    s += `<g class="melo-head" data-pivot="0,330" transform="rotate(${f(tilt)} 0 330)">${headSVG(o, ex, uid, R)}</g>`;
    s += `<g class="melo-front">${b.front}${b.front2}</g>`;
    s += '</g></g>';
    return s;
  }

  const VIEWS = { full: [-270, -90, 540, 1060], head: [-215, -95, 430, 450], bust: [-230, -95, 460, 560] };
  function svg(opts = {}) {
    const vb = opts.viewBox || VIEWS[opts.view || 'full'];
    const w = opts.width ? ` width="${opts.width}"` : '', h = opts.height ? ` height="${opts.height}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}"${w}${h} preserveAspectRatio="${opts.preserve || 'xMidYMid meet'}">${group(opts)}</svg>`;
  }
  /** Profile picture: head + shoulders inside a coloured circle. */
  function avatar(opts = {}) {
    const uid = `av${++COUNTER}`;
    const bg = opts.bg || '#e9b949';
    const inner = group(Object.assign({ view: 'bust', pose: 'idle' }, opts, { uid: uid + 'm' }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-250 -130 500 500"${opts.size ? ` width="${opts.size}" height="${opts.size}"` : ''}>
<defs><clipPath id="${uid}c"><circle cx="0" cy="120" r="246"/></clipPath></defs>
<g clip-path="url(#${uid}c)"><rect x="-250" y="-130" width="500" height="500" fill="${bg}"/>
<g transform="translate(0,${opts.dy ?? -30}) scale(${opts.zoom ?? 1.04})">${inner}</g></g>
<circle cx="0" cy="120" r="244" fill="none" stroke="${PAL.ink}" stroke-width="${opts.ring ?? 0}"/></svg>`;
  }

  return { svg, group, avatar, PAL, EXPRESSIONS: Object.keys(EXPR), POSES: Object.keys(POSES), VIEWS };
});
