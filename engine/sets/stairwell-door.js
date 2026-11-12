/* stairwell-door — German Altbau Treppenhaus in the evening: warm ochre walls over a Jugendstil tile dado,
 * red/cream checker floor, wooden stairs rising to the left with turned balusters and a landing window (dusk),
 * open apartment door (warm lit hallway behind, door leaf swung in) with brass nameplate „Weber" and doormat,
 * doorbell panel, row of brass mailboxes, a parked pram, globe lamp + orange timer switch.
 * fg = the door casing (slot `door` stands in the doorway, framed). Static. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WALL_Y = 820, DADO = 600, D = { x: 870, y: 250, w: 320, h: 570 };
  var ST = { x0: 660, x1: 60, n: 11, rise: 36 };          // stairs: bottom step at x0, rising leftwards

  function build(S) {
    var bg = '', fg = '', i;
    // ── walls ──
    bg += S.wall(0, WALL_Y, '#d6b47a', { top: 60, op: 0.32, side: 0.06 });
    bg += S.glow(1040, 160, 760, 420, '#ffd58a', 0.35);
    // Jugendstil tile dado: diamond pattern + border
    var dado = S.rect(-20, DADO, 1960, WALL_Y - DADO), dd = '';
    bg += S.fillOnly(dado, '#e9dfc4');
    for (var tx = -20; tx < 1960; tx += 60) for (var ty = DADO + 40; ty < WALL_Y; ty += 60) {
      var cx = tx + 30, cy = ty + 30;
      dd += 'M' + cx + ' ' + (cy - 22) + 'L' + (cx + 22) + ' ' + cy + 'L' + cx + ' ' + (cy + 22) + 'L' + (cx - 22) + ' ' + cy + 'Z';
    }
    bg += '<g clip-path="url(#' + S.clip(S.rect(-20, DADO + 40, 1960, WALL_Y - DADO - 40)) + ')"><path d="' + dd + '" fill="#5f8f86" opacity=".55"/></g>';
    bg += S.fillOnly(S.rect(-20, DADO, 1960, 40), '#8d4a3a');
    var flw = '';
    for (var fx = 0; fx < 1960; fx += 60) flw += S.circ(fx + 30, DADO + 20, 8, '#d6a03c', { w: 1, extra: 0.5 });
    bg += flw + S.line([[-20, DADO], [1940, DADO]], { w: 4, ta: 0.01, tb: 0.01 }) + S.line([[-20, DADO + 40], [1940, DADO + 40]], { w: 3, ta: 0.01, tb: 0.01 });
    bg += S.hatch(dado, { ang: 80, gap: 15, w: 1.1, op: 0.12 });
    // ── floor: checker tiles ──
    bg += S.floor(WALL_Y, { kind: 'tiles', gap: 110, rows: 7, fill: '#e6d8b8', fill2: '#a9503c', vx: 1030, vy: 400, lop: 0.3 });
    bg += S.skirting(WALL_Y, 14, '#5e3f22');

    // ── stairs rising to the left ──
    var stw = (ST.x0 - ST.x1) / ST.n, prof = [[ST.x0 + 20, WALL_Y + 10]];
    for (i = 0; i < ST.n; i++) {
      var sx = ST.x0 - i * stw, sy = WALL_Y - i * ST.rise;
      prof.push([sx, sy - ST.rise]); prof.push([sx - stw, sy - ST.rise]);
    }
    var topY = WALL_Y - ST.n * ST.rise;
    prof.push([-20, topY], [-20, WALL_Y + 10]);
    // stair mass (side stringer) + treads
    bg += S.shape(prof, '#8d6236', { w: 3, extra: 3.4 }) + S.hatch(prof, { ang: 70, gap: 9, w: 1.2, op: 0.3 });
    for (i = 0; i < ST.n; i++) {
      var tx0 = ST.x0 - i * stw, ty0 = WALL_Y - (i + 1) * ST.rise;
      bg += S.box(tx0 - stw - 4, ty0 - 8, stw + 14, 12, '#b98a52', { w: 1.8, extra: 1.6, hatch: false });
    }
    bg += S.fillOnly(S.rect(-20, topY - 8, 80, 12), '#b98a52');
    // runner carpet (red) on the treads
    var run = [];
    for (i = 0; i < ST.n; i++) run.push([[ST.x0 - i * stw - stw * 0.85, WALL_Y - (i + 1) * ST.rise - 4], [ST.x0 - i * stw - stw * 0.15, WALL_Y - (i + 1) * ST.rise - 4]]);
    bg += S.lines(run, { w: 8, ta: 0.05, tb: 0.05, min: 0.7 }, '#9d2c27', ' opacity=".85"');
    // balusters + handrail (near side)
    var bal = [];
    for (i = 0; i < ST.n; i++) { var bx = ST.x0 - i * stw - stw / 2, by = WALL_Y - (i + 1) * ST.rise - 4; bal.push([[bx, by], [bx, by - 230]]); }
    bg += S.lines(bal, { w: 9, ta: 0.02, tb: 0.02, min: 0.9 }) + S.lines(bal, { w: 4.5, ta: 0.02, tb: 0.02, min: 0.9 }, '#6b4a2f');
    var railA = [ST.x0 + 30, WALL_Y - 250], railB = [-20, topY - 260];
    bg += S.line([railA, railB], { w: 22, ta: 0.01, tb: 0.01, min: 0.95 }) + S.line([[railA[0], railA[1] - 2], [railB[0], railB[1] - 2]], { w: 13, ta: 0.01, tb: 0.01, min: 0.95 }, '#8d6236');
    bg += S.box(ST.x0 + 12, WALL_Y - 270, 36, 280, '#6b4a2f', { w: 2.6, extra: 2.8, hatch: 'r', hk: 0.4 }) + S.circ(ST.x0 + 30, WALL_Y - 282, 24, '#8d6236', { w: 2.2, extra: 2.2 });
    // landing window (dusk)
    var wv = S.fillOnly(S.rect(120, 120, 240, 300), S.linear([[0, '#3d4a6a'], [0.6, '#8a7392'], [1, '#e7a07a']], 0, 0, 0, 1));
    wv += S.fillOnly(S.poly([[100, 420], [100, 340], [170, 330], [200, 300], [260, 330], [380, 320], [380, 420]], 30, 2), '#3a3448');
    wv += S.dot(300, 180, 3, '#f6ecc8') + S.dot(180, 160, 2, '#f6ecc8');
    bg += S.window(120, 120, 240, 300, { sky: '#8a7392', view: wv, panes: [2, 2], frame: '#e9dfc4', night: true });

    // ── apartment door (open) ──
    bg += S.fillOnly(S.rect(D.x - 40, D.y - 40, D.w + 80, D.h + 40), 'rgba(60,40,20,.15)');
    var inside = S.rect(D.x, D.y, D.w, D.h, 40, 0.6), cid = S.clip(inside), hall = '';
    hall += S.fillOnly(S.rect(D.x, D.y, D.w, D.h), '#e9c88a') + S.glow(D.x + D.w / 2, D.y + 110, 230, 200, '#fff3cf', 0.75);
    hall += S.fillOnly(S.poly([[D.x - 10, D.y + D.h], [D.x + 40, D.y + 440], [D.x + D.w - 40, D.y + 440], [D.x + D.w + 10, D.y + D.h]], 20, 0.5), '#9a7448');
    hall += S.fillOnly(S.poly([[D.x + 90, D.y + D.h], [D.x + 120, D.y + 450], [D.x + D.w - 120, D.y + 450], [D.x + D.w - 90, D.y + D.h]], 20, 0.5), '#3f5a58');
    hall += S.frame(D.x + 190, D.y + 150, 80, 100, '#e9dfc4', function (x, y, w, h) { return S.circ(x + w / 2, y + h / 2, 18, P.red, { w: 1.4, extra: 1 }); }, { mat: 8 });
    hall += S.line([[D.x + 40, D.y + 170], [D.x + 140, D.y + 170]], { w: 6, ta: 0.05, tb: 0.05 }, '#5e3f22');   // coat rail
    hall += S.shape(U.catmull([[D.x + 60, D.y + 172], [D.x + 48, D.y + 260], [D.x + 56, D.y + 340], [D.x + 96, D.y + 340], [D.x + 92, D.y + 176]], 5, true), '#4f6d86', { w: 2, extra: 2 });
    hall += S.shape(U.catmull([[D.x + 104, D.y + 172], [D.x + 100, D.y + 240], [D.x + 108, D.y + 300], [D.x + 136, D.y + 300], [D.x + 132, D.y + 176]], 5, true), '#c9a46a', { w: 2, extra: 2 });
    bg += '<g clip-path="url(#' + cid + ')">' + hall + '</g>';
    var leaf = S.poly([[D.x + D.w, D.y], [D.x + D.w - 80, D.y + 46], [D.x + D.w - 80, D.y + D.h - 36], [D.x + D.w, D.y + D.h]], 30, 0.6);
    bg += S.shape(leaf, '#6b3f2a', { w: 2.8, extra: 3 }) + S.hatch(leaf, { ang: 80, gap: 7, w: 1.2, op: 0.4 });
    bg += A.shaft([[D.x, D.y + D.h], [D.x + D.w, D.y + D.h], [D.x + D.w + 170, 1000], [D.x - 150, 1000]], '#ffe7a6', 0.22);
    // doormat
    var mat = S.poly([[D.x - 10, WALL_Y + 12], [D.x + D.w + 10, WALL_Y + 12], [D.x + D.w + 36, WALL_Y + 62], [D.x - 36, WALL_Y + 62]], 30, 1);
    bg += S.shape(mat, '#8a6a3c', { w: 2.4, extra: 2.6 }) + S.hatch(mat, { ang: 90, gap: 5, w: 1, op: 0.35 });
    // doorbell + nameplate panel right of the door
    var bx2 = D.x + D.w + 70;
    bg += S.drop(bx2, 470, 70, 110, 5, 6) + S.box(bx2, 470, 70, 110, '#c9b06a', { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.2 });
    bg += S.box(bx2 + 10, 484, 50, 22, '#f3ead3', { w: 1.2, extra: 0.8, hatch: false }) + S.T(bx2 + 35, 501, 'Weber', { f: 'Kalam', s: 14, a: 'middle' });
    bg += S.circ(bx2 + 35, 540, 14, '#e9dfc4', { w: 1.8, extra: 1.4 }) + S.circ(bx2 + 35, 540, 6, '#a98a40', { w: 0 });
    // timer switch (orange glow) + globe lamp
    bg += S.box(D.x - 120, 520, 44, 62, '#efeadb', { w: 2, extra: 2, hatch: false }) + S.box(D.x - 111, 532, 26, 38, '#f0a04a', { w: 1.4, extra: 1, hatch: false }) + S.glow(D.x - 98, 551, 40, 40, '#ffb86a', 0.5);
    bg += S.seg(1040, -10, 1040, 70, 2.4) + S.circ(1040, 110, 44, '#f6efd9', { w: 2.4, extra: 2.4 }) + S.glow(1040, 110, 200, 150, '#fff3cf', 0.4);

    // ── mailboxes (right wall) ──
    var MX = 1440, MY = 330, names = ['Hoffmann', 'Öztürk', 'Nguyen', 'Becker', 'Wagner', 'Kaya', 'Lange', 'frei'];
    bg += S.drop(MX - 14, MY - 14, 4 * 104 + 18, 2 * 120 + 18, 8, 10) + S.box(MX - 14, MY - 14, 4 * 104 + 18, 2 * 120 + 18, '#6b4a2f', { w: 2.6, extra: 2.8 });
    names.forEach(function (n, k) {
      var x = MX + (k % 4) * 104, y = MY + Math.floor(k / 4) * 120;
      bg += S.box(x, y, 96, 112, '#c9a043', { w: 2, extra: 2.2, hatch: 'r', hk: 0.15 }) + S.box(x + 10, y + 16, 76, 12, '#5e3f22', { w: 1.2, extra: 0.8, hatch: false });
      bg += S.box(x + 12, y + 50, 72, 24, '#f3ead3', { w: 1.2, extra: 0.8, hatch: false }) + S.T(x + 48, y + 68, n, { f: 'Kalam', s: n.length > 6 ? 13 : 15, a: 'middle', c: n === 'frei' ? P.red : P.ink });
      bg += S.circ(x + 48, y + 92, 5, '#8d6236', { w: 1, extra: 0.6 });
    });
    bg += S.box(MX + 60, MY + 260, 300, 40, '#e9dfc4', { w: 1.6, extra: 1.2, hatch: false }) + S.T(MX + 210, MY + 288, 'Bitte keine Werbung', { f: 'Kalam', s: 18, a: 'middle' });
    // pram under the mailboxes
    var pxm = 1700, pym = 900;
    bg += S.floorShadow(pxm, pym + 6, 150, 12, 0.3);
    var tub = U.catmull([[pxm - 130, pym - 170], [pxm - 120, pym - 80], [pxm + 110, pym - 80], [pxm + 130, pym - 180]], 6, false);
    bg += S.shape(tub.concat([[pxm + 130, pym - 180], [pxm - 130, pym - 170]]), '#3f5a58', { w: 2.8, extra: 3 }) + A.shadeSide(S, tub.concat([[pxm - 130, pym - 170]]), [0, 1], 0.2, { ang: 20, gap: 6, op: 0.4 });
    var hood = U.catmull([[pxm + 10, pym - 176], [pxm + 30, pym - 260], [pxm + 110, pym - 280], [pxm + 140, pym - 182]], 6, false);
    bg += S.shape(hood.concat([[pxm + 10, pym - 176]]), '#2f4436', { w: 2.6, extra: 2.8 });
    bg += S.line([[pxm - 128, pym - 168], [pxm - 200, pym - 280], [pxm - 230, pym - 282]], { w: 6, ta: 0.05, tb: 0.05 }, '#2f2a26');
    bg += S.circ(pxm - 80, pym - 30, 32, '#2f2a26', { w: 2.4, extra: 2 }) + S.circ(pxm + 80, pym - 30, 32, '#2f2a26', { w: 2.4, extra: 2 }) + S.circ(pxm - 80, pym - 30, 12, '#9aa3a6', { w: 0 }) + S.circ(pxm + 80, pym - 30, 12, '#9aa3a6', { w: 0 });
    bg += S.lines([[[pxm - 80, pym - 62], [pxm - 60, pym - 82]], [[pxm + 80, pym - 62], [pxm + 60, pym - 82]]], { w: 4, ta: 0.05, tb: 0.05 }, '#2f2a26');
    // shoes on the mat by the door + umbrella
    bg += S.shape(U.catmull([[1250, 830], [1252, 806], [1278, 800], [1314, 818], [1318, 830]], 4, false), '#5e3f22', { w: 2, extra: 2 });
    bg += S.line([[1340, 830], [1356, 640]], { w: 6, ta: 0.05, tb: 0.05 }, P.red) + S.line([[1356, 640], [1350, 626], [1362, 622]], { w: 4, ta: 0.05, tb: 0.05 }, '#2f2a26');

    // ═════ fg: door casing (frames whoever stands in the doorway) ═════
    var cw = 34;
    fg += S.box(D.x - cw, D.y - cw, cw, D.h + cw, '#e9dfc4', { w: 3, extra: 3.2, hatch: 'l', hk: 0.4 });
    fg += S.box(D.x + D.w, D.y - cw, cw, D.h + cw, '#e9dfc4', { w: 3, extra: 3.2, hatch: 'r', hk: 0.4 });
    fg += S.box(D.x - cw - 10, D.y - cw - 26, D.w + 2 * cw + 20, 30, '#e9dfc4', { w: 3, extra: 3.2, hatch: 'b', hk: 0.4 });
    fg += S.box(D.x + D.w / 2 - 50, D.y - cw - 70, 100, 34, '#c9b06a', { w: 2, extra: 2, hatch: false }) + S.T(D.x + D.w / 2, D.y - cw - 46, '3. OG links', { f: 'Kalam', s: 16, a: 'middle' });
    return { bg: bg, fg: fg };
  }

  A.define('stairwell-door', {
    seed: 207, build: build,
    slots: {
      left:   A.slot(560, 990, 1.0, { face: 1 }),                 // at the foot of the stairs
      center: A.slot(1030, 990, 1.02, { face: -1 }),              // in front of the door (the visitor)
      right:  A.slot(1400, 985, 1.0, { face: -1 }),
      door:   A.slot(1030, 822, 0.88, { face: 1 }),               // in the doorway, framed by the fg casing
      stairs: A.slot(325, WALL_Y - 7 * ST.rise, 0.95, { face: 1 })       // standing on the 7th step
    }
  });
})(typeof self !== 'undefined' ? self : this);
