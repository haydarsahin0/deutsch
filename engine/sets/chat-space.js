/* chat-space — abstract „inside the chatbot" space: deep night-blue paper with grain and a soft vignette, empty speech
 * bubbles floating at the edges (ink outlines, faint fills), a chat input bar at the bottom („Nachricht schreiben …")
 * with a blinking cursor and a typing-dots bubble. The whole centre (x 520–1880, y 150–900) stays calm for [[cards]].
 * Melo normally sits in corner-left / corner-right. Ambient: cursor blink, typing dots, slow bubble drift. (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  // floating bubbles [x, y, w, h, tail side (-1 left / 1 right), colour, opacity]
  var BUB = [[60, 70, 300, 110, -1, '#8fb3a6', 0.22], [1560, 60, 290, 100, 1, '#e9dfc4', 0.18], [80, 300, 210, 80, -1, '#e9dfc4', 0.14],
    [1690, 250, 190, 76, 1, '#8fb3a6', 0.16], [330, 170, 150, 60, 1, '#e9dfc4', 0.1], [1400, 180, 130, 52, -1, '#e9dfc4', 0.1], [1700, 470, 170, 66, 1, '#e9dfc4', 0.1]];

  function bubble(S, b, dy) {
    var x = b[0], y = b[1] + (dy || 0), w = b[2], h = b[3], s = '';
    var body = S.rrect(x, y, w, h, Math.min(28, h / 2.4), 0.6);
    var tx = b[4] < 0 ? x + 34 : x + w - 34, tail = [[tx - 14, y + h - 2], [tx + 14, y + h - 2], [tx + b[4] * -22, y + h + 26]];
    s += S.fillOnly(body, b[5], ' opacity="' + b[6] + '"') + S.fillOnly(tail, b[5], ' opacity="' + b[6] + '"');
    s += '<g opacity="' + Math.min(0.75, b[6] * 3) + '">' + S.shape(body, null, { w: 2, extra: 1.6, color: '#d9e4e6' }) + S.line(tail.slice(1).concat([[tx - 14, y + h]]).reverse(), { w: 2, ta: 0.1, tb: 0.1, min: 0.5 }, '#d9e4e6') + '</g>';
    s += S.scribble(x + 24, y + h * 0.42, w - 60, Math.max(1, Math.floor(h / 36)), 18, '#d9e4e6', b[6] * 1.4);
    return s;
  }

  function build(S) {
    var bg = '', i;
    bg += S.fillOnly(S.rect(-20, -20, 1960, 1120), S.linear([[0, '#1a2232'], [0.6, '#222c3f'], [1, '#2b3346']], 0, 0, 0, 1));
    bg += S.glow(1200, 520, 900, 520, '#4a5f7a', 0.35);
    // paper grain + faint engraved hatching toward the edges (vignette)
    bg += S.stipple(S.rect(0, 0, 1920, 1080), 2600, { r: 1.6, op: 0.18, color: '#c9d4e0' });
    bg += S.hatch(S.rect(-20, -20, 1960, 1120), { ang: 28, gap: 11, w: 1.3, op: 0.35, color: '#0b0f18', cond: function (X, Y) {
      var dx = (X - 1150) / 1100, dy = (Y - 520) / 640; return dx * dx + dy * dy > 0.82 + 0.05 * Math.sin(X / 90);
    } });
    // floating bubbles (static ones + two drifting ones spliced per frame)
    BUB.forEach(function (b) { bg += bubble(S, b); });
    bg += '<!--amb:drift-->';
    // faint connection threads between the edge bubbles
    bg += S.lines([[[360, 125], [520, 140], [480, 170]], [[1560, 110], [1450, 160], [1480, 200]]], { w: 1.4, ta: 0.2, tb: 0.2, min: 0.3, smooth: 5 }, '#d9e4e6', ' opacity=".18"');

    // ── chat input bar (bottom centre) ──
    var bar = S.rrect(560, 958, 800, 70, 34, 0.6);
    bg += S.fillOnly(S.rrect(566, 966, 800, 70, 34, 0.6), 'rgba(0,0,0,.35)');
    bg += S.shape(bar, '#e9e4d6', { w: 2.6, extra: 2.2 });
    bg += S.T(612, 1003, 'Nachricht schreiben …', { f: 'Kalam', s: 26, c: '#8a8578' });
    bg += S.circ(1318, 993, 24, '#5f8f86', { w: 2, extra: 1.6 }) + S.line([[1306, 1000], [1318, 982], [1330, 1000]], { w: 3.4, ta: 0.05, tb: 0.05 }, P.white) + S.seg(1318, 984, 1318, 1006, 3, P.white);
    // typing-dots bubble (right of the bar)
    var tb = S.rrect(1410, 962, 130, 60, 28, 0.5);
    bg += S.shape(tb, '#8fb3a6', { w: 2.2, extra: 1.8 }) + S.fillOnly([[1420, 1010], [1444, 1018], [1404, 1036]], '#8fb3a6');
    bg += '<!--amb:typing-->';
    return {
      bg: bg,
      amb: {
        typing: function (t) {
          var s = '', on = Math.floor(t * 1.7) % 2 === 0;
          for (var k = 0; k < 3; k++) {
            var a = Math.max(0, Math.sin(t * 5.2 - k * 0.9));
            s += '<circle cx="' + f1(1445 + k * 30) + '" cy="' + f1(992 - a * 6) + '" r="8" fill="#1d2531" opacity="' + f1(0.35 + 0.6 * a) + '"/>';
          }
          if (on) s += '<rect x="905" y="978" width="4" height="32" fill="#2c333b"/>';
          return s;
        },
        drift: function (t) {
          var Sa = A.ambInk('chat-space', 5), d1 = Math.sin(t * 0.6) * 10, d2 = Math.sin(t * 0.5 + 2) * 12;
          return bubble(Sa, [230, 520, 170, 64, -1, '#8fb3a6', 0.12], d1).replace(/<g clip-path[^]*?<\/g>/g, '') +
                 bubble(Sa, [1590, 760, 200, 70, 1, '#e9dfc4', 0.1], d2).replace(/<g clip-path[^]*?<\/g>/g, '');
        }
      }
    };
  }

  A.define('chat-space', {
    seed: 303, ambient: true, build: build,
    slots: {
      left:   A.slot(330, 1000, 1.02, { face: 1 }),
      center: A.slot(960, 1000, 1.04),
      right:  A.slot(1590, 1000, 1.02, { face: -1 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
