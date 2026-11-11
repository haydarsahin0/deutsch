/* map-dach — stylised paper map of Germany, Austria and Switzerland (ink outlines, subtle inner borders incl. the
 * old inner-German line, Rhine/Danube/Elbe, hatched seas, compass rose, cartouche). Static.
 * Exports Sets.mapPoint(name) → {x, y} (frame coords) for pins, and Sets.mapProject(lon, lat) → {x, y}.
 * Names: bayern, rheinland, schwaben, wien, oesterreich, schweiz, berlin, hamburg, norden, sueden, sachsen
 *        (+ muenchen, koeln, frankfurt, stuttgart, zuerich, bern, salzburg, deutschland, osten, westen). (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var Sets = root.Sets || require('./sets.js');
  var P = A.P, U = A.U, f1 = U.f1;

  // equirectangular-ish projection centred on DACH; map spans y ≈ 70 … 900 (bottom 170 px stay calm)
  var K = 88, LON0 = 10.6, LAT0 = 50.6, CX = 960, CY = 470, COS = Math.cos(50.5 * Math.PI / 180);
  function proj(lon, lat) { return [CX + (lon - LON0) * COS * K, CY - (lat - LAT0) * K]; }
  function pp(list) { return list.map(function (q) { return proj(q[0], q[1]); }); }

  var DE = [[8.6, 55.0], [9.4, 54.83], [9.95, 54.55], [10.15, 54.33], [10.9, 54.1], [11.1, 54.0], [11.5, 54.08], [12.1, 54.18], [12.6, 54.45], [13.2, 54.55], [13.65, 54.6], [13.45, 54.1], [14.2, 53.95], [14.4, 53.3], [14.15, 52.85], [14.6, 52.6], [14.7, 52.1], [14.75, 51.65], [15.0, 51.25], [14.8, 50.9], [14.3, 50.95], [13.5, 50.65], [12.95, 50.4], [12.2, 50.3], [12.5, 49.95], [12.4, 49.65], [12.9, 49.35], [13.4, 48.95], [13.8, 48.75], [13.45, 48.57], [13.0, 48.3], [12.75, 48.1], [13.0, 47.75], [12.95, 47.5], [12.75, 47.65], [12.2, 47.6], [11.6, 47.58], [11.1, 47.4], [10.6, 47.55], [10.2, 47.3], [9.95, 47.55], [9.55, 47.55], [8.9, 47.65], [8.6, 47.75], [8.3, 47.6], [7.6, 47.58], [7.55, 47.9], [7.8, 48.6], [8.2, 48.98], [7.6, 49.08], [6.9, 49.2], [6.4, 49.5], [6.15, 49.95], [6.45, 50.35], [6.05, 50.75], [5.9, 51.05], [6.2, 51.4], [5.95, 51.8], [6.8, 51.95], [7.05, 52.4], [6.75, 52.6], [7.05, 52.9], [7.2, 53.25], [7.0, 53.55], [7.6, 53.68], [8.1, 53.55], [8.5, 53.6], [8.65, 53.9], [9.0, 53.88], [8.85, 54.25], [8.6, 54.4], [8.9, 54.6], [8.6, 55.0]];
  var AT = [[9.55, 47.55], [9.95, 47.55], [10.2, 47.3], [10.6, 47.55], [11.1, 47.4], [11.6, 47.58], [12.2, 47.6], [12.75, 47.65], [12.95, 47.5], [13.0, 47.75], [12.75, 48.1], [13.0, 48.3], [13.45, 48.57], [13.8, 48.75], [14.7, 48.6], [15.0, 49.0], [15.9, 48.8], [16.9, 48.65], [17.1, 48.05], [16.95, 47.75], [16.5, 47.5], [16.5, 47.0], [16.1, 46.85], [15.7, 46.7], [14.9, 46.6], [14.55, 46.4], [13.7, 46.52], [12.7, 46.65], [12.2, 47.05], [11.6, 46.98], [11.1, 46.75], [10.5, 46.87], [10.15, 46.85], [9.6, 47.05], [9.55, 47.3], [9.55, 47.55]];
  var CH = [[6.0, 46.15], [6.15, 46.5], [6.45, 46.95], [6.95, 47.3], [7.0, 47.5], [7.6, 47.58], [8.3, 47.6], [8.6, 47.75], [8.9, 47.65], [9.55, 47.55], [9.55, 47.3], [9.6, 47.05], [10.15, 46.85], [10.45, 46.55], [10.1, 46.25], [9.3, 46.5], [9.0, 45.85], [8.6, 46.1], [8.4, 46.3], [7.9, 45.95], [7.05, 45.92], [6.8, 46.2], [6.15, 46.25], [6.0, 46.15]];
  var INNER = [ // subtle Bundesländer lines (approximate)
    [[10.9, 54.0], [10.8, 53.6], [11.3, 53.15], [10.95, 52.85], [11.0, 52.3], [10.6, 51.9], [10.2, 51.6], [10.0, 51.05], [10.05, 50.6], [10.6, 50.35]],  // old inner-German border
    [[8.9, 53.9], [9.6, 53.6], [10.3, 53.42], [10.6, 53.4], [10.9, 53.8]],                                                                         // Schleswig-Holstein
    [[9.5, 49.7], [9.6, 50.2], [10.05, 50.6], [10.6, 50.35], [11.3, 50.45], [12.2, 50.3]],                                                          // Bavaria north
    [[9.85, 47.6], [10.1, 48.0], [10.0, 48.5], [10.3, 48.9], [10.1, 49.3], [9.6, 49.6], [9.5, 49.7]],                                             // BW / Bavaria
    [[8.2, 48.98], [8.5, 49.4], [8.6, 49.55], [9.1, 49.55], [9.5, 49.7]],                                                                          // BW north
    [[7.05, 52.4], [7.9, 52.3], [8.5, 52.5], [9.1, 52.2], [9.45, 51.65], [9.0, 51.35], [8.6, 51.25], [8.2, 50.85], [7.75, 50.65], [7.2, 50.35], [6.45, 50.35]], // NRW
    [[12.2, 50.3], [12.3, 50.8], [12.15, 51.1], [12.6, 51.6], [13.2, 51.65], [14.0, 51.5], [14.75, 51.6]],                                          // Saxony north
    [[11.3, 53.15], [12.0, 53.25], [13.0, 53.2], [14.2, 53.3]],                                                                                    // MV / Brandenburg
    [[9.6, 49.6], [8.9, 50.1], [8.0, 50.1], [7.75, 50.65]]                                                                                         // Hesse / RP
  ];
  var RIVERS = [
    [[8.6, 47.68], [7.6, 47.58], [7.8, 48.6], [8.4, 49.3], [8.3, 50.0], [7.6, 50.3], [7.0, 50.9], [6.6, 51.5], [6.1, 51.85]],                   // Rhein
    [[8.5, 48.0], [9.9, 48.4], [11.4, 48.75], [12.1, 49.0], [13.45, 48.57], [14.3, 48.3], [15.6, 48.4], [16.37, 48.21], [17.1, 48.1]],          // Donau
    [[14.3, 50.9], [13.7, 51.05], [12.6, 51.9], [11.9, 52.3], [11.6, 52.9], [10.6, 53.4], [10.0, 53.55], [9.0, 53.88]]                          // Elbe
  ];
  var LAKES = [[[9.15, 47.75], [9.55, 47.6], [9.75, 47.55], [9.55, 47.45], [9.15, 47.62], [9.0, 47.7]]];
  var POINTS = {
    berlin: [13.4, 52.52], hamburg: [10.0, 53.55], bayern: [11.6, 48.9], muenchen: [11.58, 48.14], rheinland: [7.0, 50.75], koeln: [6.96, 50.94],
    schwaben: [9.6, 48.6], stuttgart: [9.18, 48.78], frankfurt: [8.68, 50.11], sachsen: [13.25, 51.05], norden: [9.3, 52.95], sueden: [10.9, 47.85],
    osten: [13.0, 52.0], westen: [7.3, 51.3], deutschland: [10.3, 51.3], wien: [16.37, 48.21], salzburg: [13.05, 47.8], oesterreich: [14.3, 47.5],
    schweiz: [8.2, 46.8], zuerich: [8.54, 47.37], bern: [7.45, 46.95]
  };

  function build(S) {
    var bg = '';
    // ── paper sheet on a dark desk edge ──
    bg += S.fillOnly(S.rect(-20, -20, 1960, 1120), '#3b2f25');
    var sheet = S.poly([[60, 30], [1860, 24], [1872, 1050], [52, 1056]], 60, 2);
    bg += S.fillOnly(sheet.map(function (q) { return [q[0] + 12, q[1] + 14]; }), 'rgba(0,0,0,.35)');
    bg += S.shape(sheet, '#efe3c4', { w: 3, extra: 3 });
    bg += S.glow(960, 480, 900, 560, '#f8efd6', 0.6);
    // fold lines + foxing
    bg += S.lines([[[960, 30], [962, 1052]], [[56, 540], [1868, 536]]], { w: 2, ta: 0.05, tb: 0.05, min: 0.4 }, '#b8a77e', ' opacity=".55"');
    bg += S.stipple(sheet, 500, { r: 3, op: 0.18, color: '#9a7a42' });
    // double border
    bg += S.shape(S.rect(100, 70, 1720, 940, 60, 0.8), null, { w: 2.6, extra: 1.6 }) + S.shape(S.rect(116, 86, 1688, 908, 60, 0.6), null, { w: 1.2, extra: 0.6 });
    // graticule
    var gr = [];
    for (var lon = 6; lon <= 17; lon += 2) gr.push(pp([[lon, 45.4], [lon, 55.4]]));
    for (var lat = 46; lat <= 55; lat += 2) gr.push(pp([[5.2, lat], [17.6, lat]]));
    bg += S.lines(gr, { w: 1.2, ta: 0.05, tb: 0.05, min: 0.5 }, '#8a7a5a', ' opacity=".35"');
    // seas (hatched)
    var north = pp([[8.6, 55.0], [8.9, 54.6], [8.6, 54.4], [8.85, 54.25], [9.0, 53.88], [8.65, 53.9], [8.5, 53.6], [8.1, 53.55], [7.6, 53.68], [7.0, 53.55], [6.2, 53.45], [5.2, 53.4], [4.6, 53.9], [4.5, 54.6], [5.2, 55.2], [6.4, 55.5], [7.8, 55.45]]);
    var baltic = pp([[9.95, 54.55], [10.15, 54.33], [10.9, 54.1], [11.1, 54.0], [11.5, 54.08], [12.1, 54.18], [12.6, 54.45], [13.2, 54.55], [13.65, 54.6], [13.45, 54.1], [14.2, 53.95], [15.3, 54.15], [16.3, 54.5], [16.4, 55.0], [15.4, 55.35], [13.6, 55.45], [12.3, 55.3], [11.0, 55.25], [10.3, 55.0]]);
    north = U.catmull(north, 4, true); baltic = U.catmull(baltic, 4, true);
    [north, baltic].forEach(function (sea) {
      bg += S.fillOnly(sea, '#cddbd0') + S.hatch(sea, { ang: 0, gap: 9, w: 1.3, op: 0.4, color: '#5f8f86' }) + S.shape(sea, null, { w: 1.4, extra: 0.6, color: '#5f8f86' });
    });
    bg += S.T(proj(6.6, 54.4)[0], proj(6.6, 54.4)[1], 'Nordsee', { f: 'Caveat', s: 38, c: '#3e6b6a', r: -8, a: 'middle' });
    bg += S.T(proj(13.6, 55.0)[0], proj(13.6, 55.0)[1], 'Ostsee', { f: 'Caveat', s: 38, c: '#3e6b6a', r: -6, a: 'middle' });
    // neighbours: faint stipple outside DACH
    var de = pp(DE), at = pp(AT), ch = pp(CH);
    // countries
    bg += S.fillOnly(de.map(function (q) { return [q[0] + 8, q[1] + 10]; }), 'rgba(80,55,20,.18)');
    bg += S.shape(de, '#ecd391', { w: 3.6, extra: 4 });
    bg += S.shape(at, '#e8b49a', { w: 3.6, extra: 4 });
    bg += S.shape(ch, '#c5d6a8', { w: 3.6, extra: 4 });
    bg += S.hatch(de, { ang: 45, gap: 9, w: 1.2, op: 0.22 });
    bg += S.hatch(at, { ang: -45, gap: 9, w: 1.2, op: 0.22 }) + S.hatch(ch, { ang: 30, gap: 9, w: 1.2, op: 0.22 });
    // inner borders (dashed, subtle)
    var dash = '';
    INNER.forEach(function (ln) {
      var pts = U.catmull(pp(ln), 4, false);
      for (var i = 0; i < pts.length - 1; i += 2) dash += 'M' + f1(pts[i][0]) + ' ' + f1(pts[i][1]) + 'L' + f1(pts[i + 1][0]) + ' ' + f1(pts[i + 1][1]);
    });
    bg += '<path d="' + dash + '" stroke="' + P.ink + '" stroke-width="2" stroke-linecap="round" fill="none" opacity=".45"/>';
    // rivers + lakes
    RIVERS.forEach(function (r) { bg += S.line(U.catmull(pp(r), 5, false), { w: 4, ta: 0.1, tb: 0.05, min: 0.4 }, '#4f78a8', ' opacity=".8"'); });
    LAKES.forEach(function (l) { bg += S.shape(U.catmull(pp(l), 4, true), '#9fc0cf', { w: 1.6, extra: 1.2 }); });
    // Alps: little ink mountain marks across the south
    var mt = '';
    [[10.3, 47.35], [11.0, 47.2], [11.8, 47.25], [12.6, 47.2], [13.4, 47.15], [14.2, 47.3], [7.6, 46.5], [8.4, 46.6], [9.2, 46.7], [10.0, 46.6], [12.0, 47.0], [13.0, 46.95], [8.0, 46.3], [9.6, 46.45]].forEach(function (m) {
      var c = proj(m[0], m[1]);
      mt += S.line([[c[0] - 18, c[1] + 8], [c[0], c[1] - 14], [c[0] + 18, c[1] + 8]], { w: 2.4, ta: 0.1, tb: 0.1, min: 0.5 });
      mt += S.line([[c[0] + 2, c[1] - 10], [c[0] + 12, c[1] + 6]], { w: 1.4, ta: 0.1, tb: 0.1, min: 0.5 }, P.ink, ' opacity=".6"');
    });
    bg += mt;
    // capitals: small ink dots with ring (pins add names)
    ['berlin', 'wien', 'bern'].forEach(function (n) { var c = proj(POINTS[n][0], POINTS[n][1]); bg += S.circ(c[0], c[1], 9, '#efe3c4', { w: 2.4, extra: 1.6 }) + S.dot(c[0], c[1], 4.5); });
    // country names (light, letter-spaced — pins use the same font in front)
    function cname(t, lon, lat, sz, rot) { var c = proj(lon, lat); return S.T(c[0], c[1], t, { f: 'Oswald', s: sz, ls: sz * 0.3, c: '#6b5a3a', op: 0.38, r: rot || 0, a: 'middle' }); }
    bg += cname('DEUTSCHLAND', 10.2, 50.9, 34, 0) + cname('ÖSTERREICH', 14.4, 47.1, 26, 0) + cname('SCHWEIZ', 7.9, 46.45, 22, 0);
    function nb(t, lon, lat, rot) { var c = proj(lon, lat); return S.T(c[0], c[1], t, { f: 'Caveat', s: 30, c: '#8a7a5a', op: 0.75, r: rot || 0, a: 'middle' }); }
    bg += nb('Frankreich', 5.6, 48.6, -8) + nb('Polen', 16.3, 52.6, 0) + nb('Tschechien', 15.2, 50.0, -4) + nb('Italien', 11.4, 46.1, 0) + nb('Niederlande', 5.0, 52.3, -10);
    // compass rose (top right) + cartouche (top left)
    var cx = 1640, cy = 220, R = 90, rose = '';
    for (var k = 0; k < 8; k++) {
      var a = k / 8 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? R * 0.55 : R, a1 = a - 0.18, a2 = a + 0.18;
      var tri = [[cx, cy], [cx + Math.cos(a1) * rr * 0.28, cy + Math.sin(a1) * rr * 0.28], [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr], [cx + Math.cos(a2) * rr * 0.28, cy + Math.sin(a2) * rr * 0.28]];
      rose += S.shape(tri, k % 2 ? '#efe3c4' : (k === 0 ? P.red : '#3b2f25'), { w: 1.6, extra: 1.2 });
    }
    rose += S.shape(S.ellipse(cx, cy, R * 0.72, R * 0.72, 48), null, { w: 1.4, extra: 0.6 }) + S.T(cx, cy - R - 12, 'N', { f: 'Fraunces', s: 34, a: 'middle' });
    bg += rose;
    var ct = S.poly([[170, 120], [600, 120], [600, 230], [170, 230]], 40, 1);
    bg += S.shape(ct, '#f4ead0', { w: 2.6, extra: 3 }) + S.shape(S.rect(182, 132, 406, 86, 40, 0.6), null, { w: 1.2, extra: 0.6 });
    bg += S.T(385, 182, 'D · A · CH', { f: 'Fraunces', s: 46, a: 'middle' }) + S.T(385, 210, 'Deutschland · Österreich · Schweiz', { f: 'Caveat', s: 24, c: '#6b5a3a', a: 'middle' });
    // scale bar (calm, small) bottom left above the subtitle zone
    bg += S.box(1540, 860, 200, 12, '#efe3c4', { w: 1.8, extra: 1.2, hatch: false }) + S.box(1540, 860, 100, 12, '#3b2f25', { w: 1.6, extra: 1, hatch: false }) + S.T(1640, 900, '100 km', { f: 'Oswald', s: 18, c: '#6b5a3a', a: 'middle' });
    return { bg: bg };
  }

  function mapPoint(name) {
    var k = String(name || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z]/g, '');
    if (k === 'austria') k = 'oesterreich'; if (k === 'switzerland') k = 'schweiz'; if (k === 'sued' || k === 'sueddeutschland') k = 'sueden'; if (k === 'nord' || k === 'norddeutschland') k = 'norden';
    var q = POINTS[k];
    if (!q) return null;
    var c = proj(q[0], q[1]);
    return { x: Math.round(c[0]), y: Math.round(c[1]) };
  }

  A.define('map-dach', {
    seed: 121, build: build, wobble: 0.6,
    slots: {
      'corner-left':  A.slot(230, 1000, 0.62, { face: 1 }),    // small narrator over the map, bottom left
      'corner-right': A.slot(1700, 1000, 0.62, { face: -1 }),
      left:   A.slot(330, 990, 0.8, { face: 1 }),
      center: A.slot(960, 990, 0.8),
      right:  A.slot(1600, 990, 0.8, { face: -1 })
    }
  });
  Sets.mapPoint = mapPoint;
  Sets.mapProject = function (lon, lat) { var c = proj(lon, lat); return { x: Math.round(c[0]), y: Math.round(c[1]) }; };
  Sets.mapPoints = function () { return Object.keys(POINTS); };
})(typeof self !== 'undefined' ? self : this);
