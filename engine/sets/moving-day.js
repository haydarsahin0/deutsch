/* moving-day — Saturday morning in front of a peach-coloured Altbau on moving day: stucco cornices, tall windows
 * (one with a „Nachmieter gesucht?“ note), tall entrance door propped open with a wedge, pale spring sky, a small white
 * rental van at the curb with its side door open (boxes inside), a tower of labelled moving boxes, a mustard sofa on the
 * pavement with a lamp and a plant on it, a rolled rug. Long soft morning shadows; quiet asphalt in the subtitle zone.
 * Slots: van (loading at the van door), boxes (next to the box tower), carry (in the doorway, e.g. carrying a box),
 * left, center, right. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var BASE = 772, CURB = 938;              // façade foot, kerb line
  var PEACH = '#e3b99a', PEACHD = '#c99a7a', STUC = '#efe0c8', SAGE = '#b7bea3';

  function sky(S) {
    var s = S.fillOnly(S.rect(-20, -20, 1960, 400), S.linear([[0, '#bcd2d6'], [1, '#f1e3c8']], 0, 0, 0, 1));
    s += S.glow(1500, 40, 420, 160, '#fff1cf', 0.6);
    // a few soft clouds
    [[1380, 60, 120], [1640, 96, 90]].forEach(function (c) {
      var pts = U.catmull([[c[0] - c[2], c[1] + 20], [c[0] - c[2] * 0.6, c[1] - 10], [c[0] - c[2] * 0.1, c[1] - 26], [c[0] + c[2] * 0.4, c[1] - 14], [c[0] + c[2], c[1] + 18]], 6, false);
      s += S.shape(pts, '#f7efdc', { w: 1.6, extra: 1.4 });
    });
    return s;
  }

  function tallWindow(S, x, y, w, h, o) {
    o = o || {};
    var view = S.fillOnly(S.rect(0, 0, 1920, 1080), o.dark ? '#4a4f52' : '#8fa6ad') + S.glow(x + w * 0.3, y + h * 0.3, w, h * 0.6, '#d9e6e4', 0.45);
    if (o.empty) view += S.fillOnly(S.rect(x, y + h * 0.55, w, h), '#6c6a62');
    var s = S.window(x, y, w, h, { view: view, panes: [2, 3], frame: '#f3ead8', sill: true, sillCol: STUC });
    // stucco pediment
    s += S.shape([[x - 30, y - 26], [x + w / 2, y - 66], [x + w + 30, y - 26]], STUC, { w: 2.4, extra: 2.6 });
    s += S.box(x - 34, y - 30, w + 68, 14, STUC, { w: 2, extra: 2.2, step: 40, hatch: 'b', hk: 0.5 });
    return s;
  }

  function facade(S) {
    var s = '';
    // building B (right, set back, sage) + building A (left, peach)
    s += S.fillOnly(S.rect(1250, 150, 700, BASE - 150, 40, 0.6), SAGE);
    s += S.hatch(S.rect(1250, 150, 700, BASE - 150), { ang: 30, gap: 11, w: 1.2, op: 0.22 });
    s += S.box(1240, 130, 720, 28, '#d9d6c2', { w: 2.6, extra: 3, step: 60, hatch: 'b', hk: 0.5 });
    s += tallWindow(S, 1330, 230, 150, 230) + tallWindow(S, 1640, 230, 150, 230, { dark: true });
    s += S.fillOnly(S.rect(-20, -20, 1270, BASE + 20, 40, 0.6), PEACH);
    s += S.hatch(S.rect(-20, -20, 1270, BASE + 20), { ang: 28, gap: 10, w: 1.2, op: 0.26, cond: function (X, Y) { return Y < 30 || X > 1150 || (Y > 380 && Y < 440); } });
    s += S.line([[1250, -20], [1248, BASE]], { w: 3.6, ta: 0.02, tb: 0.02, min: 0.6 });
    // cornice bands
    s += S.box(-30, 300, 1290, 30, STUC, { w: 2.8, extra: 3.2, step: 80, hatch: 'b', hk: 0.45 });
    s += S.box(-30, 330, 1290, 12, PEACHD, { w: 1.8, extra: 1.6, step: 80, hatch: false });
    // ground floor rustication (horizontal grooves)
    s += S.fillOnly(S.rect(-20, 342, 1270, BASE - 342, 40, 0.5), '#dcae8c');
    var G = [];
    for (var y = 390; y < BASE; y += 48) G.push([[-20, y], [1248, y + 0.5]]);
    s += S.lines(G, { w: 1.8, ta: 0.05, tb: 0.05, min: 0.5 }, P.ink, ' opacity=".35"');
    // first-floor windows
    s += tallWindow(S, 110, 60, 150, 210) + tallWindow(S, 420, 60, 150, 210, { empty: true }) + tallWindow(S, 1040, 60, 150, 210);
    s += S.note(495, 160, 116, 70, -4, P.white, [{ t: 'Nachmieter', s: 20 }, { t: 'gesucht?', s: 20 }], { fs: 20, top: 26, tape: true });
    // ground floor windows with flower box
    s += S.window(150, 440, 190, 230, { sky: '#6f7f84', panes: [2, 2], frame: '#f3ead8', sillCol: STUC });
    s += S.box(140, 650, 210, 40, P.woodD, { w: 2.2, extra: 2.4, step: 40, hatch: 'b', hk: 0.4 });
    for (var i = 0; i < 7; i++) s += S.circ(160 + i * 28, 642 - (i % 2) * 8, 14, i % 2 ? P.red : P.greenM, { w: 1.4, extra: 1.2 });
    s += S.window(1100, 440, 110, 230, { sky: '#6f7f84', panes: [1, 2], frame: '#f3ead8', sillCol: STUC });
    return s;
  }

  function door(S) {
    var s = '', x = 760, y = 300, w = 260, h = BASE - y, cx = x + w / 2;
    var arch = [];
    for (var i = 0; i <= 16; i++) { var a = Math.PI + i / 16 * Math.PI; arch.push([cx + Math.cos(a) * (w / 2 + 34), y + 130 + Math.sin(a) * 130]); }
    s += S.shape(arch.concat([[x + w + 34, BASE], [x - 34, BASE]]), STUC, { w: 3, extra: 3.4 });
    var op = [];
    for (i = 0; i <= 16; i++) { var b = Math.PI + i / 16 * Math.PI; op.push([cx + Math.cos(b) * w / 2, y + 130 + Math.sin(b) * 112]); }
    var opening = op.concat([[x + w, BASE], [x, BASE]]);
    s += S.shape(opening, '#3e342b', { w: 2.6, extra: 2.6 });
    // stairwell glimpse inside: first steps, a light
    s += S.glow(cx, y + 150, 120, 110, '#f2d9a0', 0.35);
    var ST = [];
    for (i = 0; i < 5; i++) ST.push([[x + 40 + i * 8, BASE - 30 - i * 34], [x + w - 70, BASE - 30 - i * 34]]);
    s += S.lines(ST, { w: 2, ta: 0.05, tb: 0.05, min: 0.5 }, '#c9b48a', ' opacity=".55"');
    // left leaf closed, right leaf swung open (narrow, seen edge-on) + wedge
    s += S.box(x + 6, y + 120, w / 2 - 10, h - 122, '#6d4a2c', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.2 });
    s += S.box(x + 24, y + 170, w / 2 - 46, 160, '#5a3c23', { w: 1.6, extra: 1.6, step: 40, hatch: false }) + S.box(x + 24, y + 360, w / 2 - 46, 90, '#5a3c23', { w: 1.6, extra: 1.6, step: 40, hatch: false });
    s += S.shape([[x + w - 4, y + 120], [x + w + 46, y + 140], [x + w + 46, BASE + 12], [x + w - 4, BASE]], '#6d4a2c', { w: 2.4, extra: 2.6 });
    s += S.shape([[x + w + 20, BASE + 6], [x + w + 70, BASE + 14], [x + w + 20, BASE + 18]], P.woodL, { w: 1.6, extra: 1.4 });
    s += S.T(cx, y + 30, '12', { f: 'Fraunces', s: 40, a: 'middle', c: P.ink });
    // doorbell panel
    s += S.box(x - 70, 520, 34, 110, '#c9b48a', { w: 1.8, extra: 1.6, step: 30, hatch: false });
    for (i = 0; i < 5; i++) s += S.circ(x - 53, 538 + i * 20, 4, P.ink);
    // step
    s += S.box(x - 50, BASE, w + 100, 18, '#bdb3a0', { w: 2.4, extra: 2.6, step: 60, hatch: 'b', hk: 0.5 });
    return s;
  }

  function street(S) {
    var s = '';
    // pavement slabs (perspective) + kerb + asphalt (calm)
    s += S.floor(BASE + 18, { kind: 'tiles', gap: 170, rows: 4, fill: '#c3b9a5', fill2: '#bab09b', vx: 960, vy: 380, lop: 0.3 });
    s += S.fillOnly([[-20, CURB], [1940, CURB], [1940, 1100], [-20, 1100]], '#77736b');
    s += S.box(-30, CURB - 6, 1980, 18, '#d2cab8', { w: 2.6, extra: 3, step: 80 });
    s += S.hatch([[-20, CURB + 14], [1940, CURB + 14], [1940, 1100], [-20, 1100]], { ang: 0, gap: 12, w: 1.1, op: 0.12 });
    // long morning shadows of the boxes / sofa (towards the left-front)
    s += S.fillOnly([[180, 905], [520, 905], [430, 935], [60, 935]], 'rgba(60,40,25,.16)');
    s += S.fillOnly([[1000, 900], [1360, 900], [1280, 932], [900, 932]], 'rgba(60,40,25,.16)');
    return s;
  }

  // moving box (x left, y bottom); label text
  function mbox(S, x, y, w, h, label, o) {
    o = o || {};
    var s = S.box(x, y - h, w, h, o.col || '#c89a62', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.22, hop: 0.4 });
    s += S.fillOnly(S.rect(x + w / 2 - 12, y - h, 24, h * 0.42, 20, 0.4), 'rgba(235,220,180,.65)');
    s += S.seg(x + 4, y - h + 4, x + w - 4, y - h + 3, 1.6, '#8d6236', ' opacity=".7"');
    if (label) s += S.T(x + w / 2 + (o.dx || 0), y - h * 0.3, label, { f: 'Kalam', s: o.fs || 26, a: 'middle', c: o.lc || P.ink, r: o.r || -3 });
    return s;
  }

  function boxTower(S) {
    var s = '';
    s += mbox(S, 170, 905, 190, 130, 'BÜCHER!!', { fs: 28 }) + mbox(S, 360, 905, 170, 120, 'KÜCHE', { col: '#d2a66c' });
    s += mbox(S, 190, 775, 160, 110, 'Kleidung', { col: '#d2a66c', fs: 24 }) + mbox(S, 360, 785, 150, 106, 'Zerbrechlich', { fs: 20, lc: P.redD });
    s += S.T(470, 718, '↑↑', { f: 'Oswald', s: 22, c: P.redD });
    s += mbox(S, 230, 665, 150, 96, '?', { fs: 40, col: '#c89a62' });
    // rolled rug leaning on the tower + floor lamp
    var rug = U.catmull([[110, 905], [96, 700], [104, 560], [138, 556], [148, 700], [146, 905]], 5, true);
    s += S.shape(rug, P.teal, { w: 2.4, extra: 2.6 }) + S.hatch(rug, { ang: 20, gap: 9, w: 1.2, op: 0.45 }) + S.circ(121, 560, 18, '#4c766e', { w: 2, extra: 2, ry: 8 });
    s += S.seg(590, 905, 586, 560, 3.6) + S.seg(560, 905, 620, 905, 4);
    var sh = [[540, 560], [632, 560], [612, 492], [560, 492]];
    s += S.shape(sh, '#efe2c2', { w: 2.4, extra: 2.6 }) + A.shadeSide(S, sh, [1, 0], 0.2, { gap: 6, op: 0.4 });
    return s;
  }

  function sofa(S) {
    var s = '', x0 = 1020, x1 = 1350, y = 900, MUS = '#c9963b';
    s += S.box(x0 - 10, y - 190, x1 - x0 + 20, 110, MUS, { w: 3, extra: 3.4, hatch: 't', hk: 0.3 });
    s += S.box(x0 + 20, y - 100, x1 - x0 - 40, 50, '#d6a54a', { w: 2.4, extra: 2.6, step: 60 });
    s += S.box(x0 - 30, y - 150, 54, 130, MUS, { w: 2.6, extra: 3, hatch: 'r', hk: 0.3 }) + S.box(x1 - 24, y - 150, 54, 130, MUS, { w: 2.6, extra: 3, hatch: 'r', hk: 0.3 });
    s += S.box(x0 - 20, y - 50, x1 - x0 + 40, 36, '#b27f2e', { w: 2.6, extra: 3, step: 60, hatch: 'b', hk: 0.4 });
    s += S.seg(x0, y - 14, x0 + 4, y, 6, P.woodDD) + S.seg(x1, y - 14, x1 - 4, y, 6, P.woodDD);
    // plant + table lamp on the sofa, a „Zu verschenken?“ joke tag
    s += S.plant(1110, y - 98, 110, { n: 8 });
    s += S.seg(1260, y - 100, 1262, y - 196, 3) + S.shape([[1218, y - 196], [1306, y - 196], [1290, y - 250], [1234, y - 250]], '#e7d3a6', { w: 2.2, extra: 2.4 });
    s += S.note(1185, y - 150, 96, 44, 8, '#f2ecd6', [{ t: 'bleibt!', s: 24 }], { fs: 24, top: 30, pin: false, tape: true });
    return s;
  }

  function van(S) {
    var s = '', x0 = 1380, x1 = 1960, top = 470, bot = 880, WH = '#e9e6dc';
    s += S.fillOnly([[x0 - 10, 945], [1960, 945], [1960, 970], [x0 + 20, 970]], 'rgba(20,18,14,.28)');
    // cargo box + cab (cab cut by the frame)
    var body = S.rrect(x0, top, 430, bot - top, [12, 6, 4, 6]);
    s += S.shape(body, WH, { w: 3.4, extra: 4 });
    s += A.shadeSide(S, [[x0, top], [x0 + 430, top], [x0 + 430, bot], [x0, bot]], [0, 1], 0.5, { gap: 8, op: 0.35, ang: 20 });
    var cab = [[x0 + 430, 560], [x0 + 510, 560], [x0 + 560, 680], [1960, 690], [1960, bot], [x0 + 430, bot]];
    s += S.shape(cab, WH, { w: 3.4, extra: 4 });
    s += S.shape([[x0 + 446, 576], [x0 + 500, 576], [x0 + 540, 676], [x0 + 446, 676]], '#7f9aa3', { w: 2.2, extra: 2.4 });
    s += S.hatch([[x0 + 446, 576], [x0 + 500, 576], [x0 + 540, 676], [x0 + 446, 676]], { ang: -50, gap: 8, w: 1.2, op: 0.3, color: '#ffffff' });
    s += S.box(x0 - 4, 760, 600, 26, P.blue, { w: 2, extra: 2.2, step: 80, hatch: false });
    s += S.T(x0 + 330, 744, 'MIETWAGEN', { f: 'Oswald', s: 30, a: 'middle', c: P.blue, ls: 2 });
    // open side door: dark cargo space with boxes
    var dx = x0 + 40, dw = 220, dy = top + 40, dh = bot - top - 90;
    s += S.box(dx, dy, dw, dh, '#2f2a24', { w: 2.6, extra: 2.6 });
    s += mbox(S, dx + 14, dy + dh - 4, 110, 90, 'Bad', { fs: 20 }) + mbox(S, dx + 120, dy + dh - 4, 90, 140, '', { col: '#b88b56' }) + mbox(S, dx + 24, dy + dh - 94, 90, 80, '', { col: '#b88b56' });
    s += S.box(dx - 14, dy + dh, dw + 28, 16, '#c9c5b8', { w: 2, extra: 2, step: 40 });
    // wheels
    [x0 + 90, x0 + 500].forEach(function (wx) {
      s += S.fillOnly(S.ellipse(wx, bot, 86, 60, 30, 0, Math.PI, Math.PI * 2), '#3a3530');
      s += S.circ(wx, bot + 6, 58, '#2a2622', { w: 3, extra: 3 }) + S.circ(wx, bot + 6, 26, '#a9a59a', { w: 2, extra: 1.6 });
    });
    s += S.box(x0 - 16, bot - 40, 36, 24, '#c9483a', { w: 1.6, extra: 1.4, step: 20, hatch: false });
    return s;
  }

  function build(S) {
    var bg = sky(S) + facade(S) + door(S) + street(S);
    bg += S.note(1150, 392, 124, 58, -4, P.yellow, [{ t: 'Halteverbot', s: 19 }, { t: 'Sa 8–14 Uhr', s: 17 }], { fs: 19, top: 22, tape: true });
    bg += boxTower(S) + sofa(S) + van(S);
    return { bg: bg };
  }

  A.define('moving-day', {
    seed: 203, build: build,
    slots: {
      van:    A.slot(1530, 940, 1.0, { face: -1 }),          // at the open side door of the van
      boxes:  A.slot(640, 935, 1.0, { face: -1 }),           // next to the box tower
      carry:  A.slot(890, 775, 0.84, { face: 1 }),           // in the doorway (e.g. coming out with a box)
      left:   A.slot(420, 945, 1.0, { face: 1 }),
      center: A.slot(900, 945, 1.0),
      right:  A.slot(1240, 945, 1.0, { face: -1 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
