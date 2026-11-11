/* MeloIcons — hand-drawn chalk doodles in a 100×100 box (centre 50,50).
 * MeloIcons.get(name) → { strokes:[{pts,w,col}], fills:[{pts,col}] }  (col = chalk colour key)
 * Strokes are drawn in order (stroke reveal), fills fade in as coloured chalk hatching after.
 * Colour keys: w (white), y (yellow), r (red), g (green), b (blue), o (orange), p (pink)
 */
(function (root) {
  'use strict';
  function arc(cx, cy, rx, ry, a0, a1, n) {
    n = n || 28; var p = [];
    for (var i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return p;
  }
  function circ(cx, cy, r, ry) { return arc(cx, cy, r, ry || r, -90, 275, 36); }
  function rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y + 1]]; }
  function rrect(x, y, w, h, r) {
    var p = [];
    p = p.concat(arc(x + w - r, y + r, r, r, -90, 0, 6), arc(x + w - r, y + h - r, r, r, 0, 90, 6),
      arc(x + r, y + h - r, r, r, 90, 180, 6), arc(x + r, y + r, r, r, 180, 272, 6));
    return p;
  }
  function S(pts, col, w) { return { pts: pts, col: col || 'w', w: w || 1 }; }
  function F(pts, col) { return { pts: pts, col: col }; }

  var I = {};
  I.sun = function () {
    var s = [S(circ(50, 50, 20), 'y', 1.2)], f = [F(circ(50, 50, 20), 'y')];
    for (var i = 0; i < 10; i++) {
      var a = i / 10 * Math.PI * 2, r0 = 28, r1 = i % 2 ? 38 : 44;
      s.push(S([[50 + r0 * Math.cos(a), 50 + r0 * Math.sin(a)], [50 + r1 * Math.cos(a), 50 + r1 * Math.sin(a)]], 'y', 1));
    }
    s.push(S([[43, 47], [44, 48]], 'w', 1.2), S([[56, 47], [57, 48]], 'w', 1.2), S(arc(50, 52, 8, 6, 20, 160, 10), 'w', 0.9));
    return { strokes: s, fills: f };
  };
  I.plate = function () {
    var s = [S(arc(50, 58, 34, 12, 0, 362, 40), 'w', 1.2), S(arc(50, 58, 22, 7, 0, 362, 30), 'w', 0.8),
      // fork
      S([[8, 30], [8, 74]], 'w'), S([[4, 30], [4, 44], [12, 44], [12, 30]], 'w', 0.8),
      // knife
      S([[92, 74], [92, 30], [96, 36], [96, 50], [92, 52]], 'w'),
      // potato salad mound
      S([[34, 56], [38, 46], [46, 42], [56, 43], [63, 48], [66, 56]], 'y', 1)];
    var f = [F([[34, 56], [38, 46], [46, 42], [56, 43], [63, 48], [66, 56]], 'y')];
    s.push(S([[42, 50], [44, 49]], 'g', 1.3), S([[53, 47], [55, 48]], 'g', 1.3), S([[58, 52], [60, 52]], 'r', 1.3));
    return { strokes: s, fills: f };
  };
  I.house = function () {
    var body = [[22, 46], [22, 86], [78, 86], [78, 46]], roof = [[14, 50], [50, 16], [86, 50]];
    return { strokes: [S(roof, 'r', 1.3), S(body, 'w', 1.2), S(rect(42, 62, 16, 24), 'w', 0.9), S(rect(28, 54, 10, 10), 'w', 0.8),
      S(rect(62, 54, 10, 10), 'w', 0.8), S([[66, 30], [66, 18], [73, 18], [73, 36]], 'w', 0.9), S([[69, 12], [72, 6], [68, 1]], 'w', 0.6)],
      fills: [F([[14, 50], [50, 16], [86, 50]], 'r'), F(rect(28, 54, 10, 10), 'y'), F(rect(62, 54, 10, 10), 'y')] };
  };
  I.clock = function () {
    var s = [S(circ(50, 52, 36), 'w', 1.3), S([[50, 52], [50, 30]], 'w', 1.2), S([[50, 52], [64, 60]], 'w', 1.2),
      S([[28, 16], [20, 10], [12, 18], [18, 26]], 'w', 1), S([[72, 16], [80, 10], [88, 18], [82, 26]], 'w', 1),
      S([[30, 84], [24, 94]], 'w'), S([[70, 84], [76, 94]], 'w')];
    for (var i = 0; i < 12; i += 3) { var a = i / 12 * Math.PI * 2; s.push(S([[50 + 29 * Math.sin(a), 52 - 29 * Math.cos(a)], [50 + 33 * Math.sin(a), 52 - 33 * Math.cos(a)]], 'w', 1)); }
    return { strokes: s, fills: [F(circ(50, 52, 36), 'y')] };
  };
  I.beer = function () {
    var glass = [[24, 22], [28, 90], [68, 90], [72, 22]];
    return { strokes: [S(glass, 'w', 1.3), S(arc(72, 52, 16, 18, -80, 80, 14), 'w', 1.2),
      S([[20, 24], [26, 12], [36, 10], [42, 4], [54, 8], [62, 4], [72, 12], [78, 22], [70, 28], [56, 24], [44, 30], [30, 26], [20, 24]], 'w', 1),
      S([[38, 46], [38, 78]], 'w', 0.7), S([[52, 46], [52, 78]], 'w', 0.7)],
      fills: [F([[26, 30], [29, 88], [67, 88], [70, 30]], 'y'), F([[22, 24], [28, 12], [42, 6], [62, 6], [76, 20], [56, 24], [30, 26]], 'w')] };
  };
  I.hand = function () { // waving hand
    var s = [S([[34, 92], [32, 62], [22, 46], [26, 42], [36, 52], [36, 22], [42, 20], [44, 46], [46, 14], [52, 13], [54, 44], [57, 18], [63, 19], [62, 46], [66, 26], [72, 28], [70, 62], [64, 80], [62, 92]], 'w', 1.2),
      S(arc(50, 40, 44, 40, -150, -120, 6), 'y', 0.9), S(arc(50, 40, 52, 48, -150, -125, 6), 'y', 0.9),
      S(arc(50, 40, 44, 40, -60, -30, 6), 'y', 0.9), S(arc(50, 40, 52, 48, -55, -30, 6), 'y', 0.9)];
    return { strokes: s, fills: [] };
  };
  I.battery = function () {
    return { strokes: [S(rrect(10, 30, 72, 40, 6), 'w', 1.3), S(rect(82, 42, 8, 16), 'w', 1.1), S(rect(16, 36, 13, 28), 'r', 1),
      S([[52, 8], [46, 20], [56, 20], [50, 30]], 'y', 1), S([[40, 82], [44, 92]], 'w', 0.7), S([[56, 82], [52, 92]], 'w', 0.7)],
      fills: [F(rect(16, 36, 13, 28), 'r')] };
  };
  I.coffee = function () {
    return { strokes: [S([[22, 40], [26, 84], [64, 84], [68, 40]], 'w', 1.3), S(arc(68, 58, 14, 13, -80, 90, 12), 'w', 1.1),
      S(arc(45, 40, 23, 6, 0, 362, 26), 'w', 1), S([[36, 30], [32, 20], [38, 10]], 'w', 0.7), S([[50, 30], [46, 18], [52, 6]], 'w', 0.7),
      S([[12, 90], [80, 90]], 'w', 1)], fills: [F([[23, 46], [26, 84], [64, 84], [67, 46]], 'o')] };
  };
  I.heart = function () {
    var p = [[50, 86], [20, 58], [12, 38], [20, 22], [36, 18], [50, 32], [64, 18], [80, 22], [88, 38], [80, 58], [50, 86]];
    return { strokes: [S(p, 'r', 1.4), S([[24, 36], [30, 28]], 'w', 0.8)], fills: [F(p, 'r')] };
  };
  I.question = function () {
    return { strokes: [S([[30, 32], [34, 18], [50, 10], [66, 16], [70, 32], [60, 44], [50, 52], [50, 66]], 'y', 1.6), S(circ(50, 82, 4), 'y', 1.6)], fills: [] };
  };
  I.lightbulb = function () {
    var p = [[38, 70], [36, 58], [24, 44], [24, 26], [36, 12], [50, 9], [64, 12], [76, 26], [76, 44], [64, 58], [62, 70]];
    var s = [S(p, 'y', 1.3), S([[38, 70], [62, 70]], 'w', 1), S([[39, 78], [61, 78]], 'w', 1), S([[42, 86], [58, 86]], 'w', 1), S([[46, 92], [54, 92]], 'w', 1),
      S([[44, 58], [44, 40], [50, 46], [56, 40], [56, 58]], 'w', 0.8),
      S([[6, 30], [14, 32]], 'y', 0.9), S([[94, 30], [86, 32]], 'y', 0.9), S([[16, 6], [22, 12]], 'y', 0.9), S([[84, 6], [78, 12]], 'y', 0.9)];
    return { strokes: s, fills: [F(p, 'y')] };
  };
  function thumb(flip) {
    var p = [[20, 48], [20, 86], [34, 86], [34, 48], [20, 48]];
    var h = [[34, 50], [48, 40], [54, 18], [62, 16], [64, 30], [60, 44], [82, 44], [86, 52], [82, 58], [84, 66], [80, 72], [80, 80], [74, 86], [34, 84]];
    var tr = function (a) { return a.map(function (q) { return flip ? [q[0], 100 - q[1]] : q; }); };
    return { strokes: [S(tr(p), 'w', 1.2), S(tr(h), flip ? 'r' : 'g', 1.3), S(tr([[62, 58], [80, 58]]), 'w', 0.7), S(tr([[62, 70], [80, 70]]), 'w', 0.7)],
      fills: [F(tr(h), flip ? 'r' : 'g')] };
  }
  I.thumbsup = function () { return thumb(false); };
  I.thumbsdown = function () { return thumb(true); };
  I.phone = function () {
    return { strokes: [S(rrect(28, 6, 44, 88, 8), 'w', 1.3), S(rect(33, 16, 34, 62), 'w', 0.8), S(circ(50, 86, 3), 'w', 1),
      S([[38, 30], [60, 30]], 'b', 0.8), S([[38, 40], [54, 40]], 'b', 0.8), S([[44, 52], [62, 52]], 'g', 0.8)], fills: [F(rect(33, 16, 34, 62), 'b')] };
  };
  I.book = function () {
    return { strokes: [S([[50, 24], [34, 16], [10, 18], [10, 80], [34, 78], [50, 86], [66, 78], [90, 80], [90, 18], [66, 16], [50, 24], [50, 86]], 'w', 1.3),
      S([[18, 32], [40, 32]], 'w', 0.6), S([[18, 44], [40, 44]], 'w', 0.6), S([[18, 56], [36, 56]], 'w', 0.6), S([[60, 32], [82, 32]], 'w', 0.6), S([[60, 44], [80, 44]], 'w', 0.6)],
      fills: [F([[10, 18], [34, 16], [50, 24], [50, 86], [34, 78], [10, 80]], 'b')] };
  };
  I.calendar = function () {
    var s = [S(rect(14, 20, 72, 70), 'w', 1.3), S([[14, 36], [86, 36]], 'w', 1.1), S([[30, 12], [30, 26]], 'w', 1.2), S([[70, 12], [70, 26]], 'w', 1.2)];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) s.push(S([[22 + c * 17, 48 + r * 13], [25 + c * 17, 48 + r * 13]], 'w', 1.2));
    s.push(S(circ(56, 61, 8), 'r', 1.1));
    return { strokes: s, fills: [F(rect(14, 20, 72, 16), 'r')] };
  };
  I.speech = function () {
    var p = [[12, 20], [88, 20], [88, 66], [44, 66], [26, 86], [30, 66], [12, 66], [12, 20]];
    return { strokes: [S(p, 'w', 1.3), S([[26, 36], [72, 36]], 'w', 0.7), S([[26, 50], [60, 50]], 'w', 0.7)], fills: [F(p, 'b')] };
  };
  I.pizza = function () {
    var p = [[50, 92], [14, 22], [86, 22], [50, 92]];
    return { strokes: [S(p, 'y', 1.3), S(arc(50, 22, 38, 10, 180, 360, 16), 'o', 1.4), S(circ(44, 40, 6), 'r', 1), S(circ(58, 54, 5), 'r', 1), S(circ(48, 66, 4), 'r', 1)],
      fills: [F(p, 'y'), F(circ(44, 40, 6), 'r'), F(circ(58, 54, 5), 'r')] };
  };
  I.snowflake = function () {
    var s = [];
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      var P = function (r, o) { return [50 + r * c - o * sn, 50 + r * sn + o * c]; };
      s.push(S([P(0, 0), P(40, 0)], 'b', 1.2), S([P(22, 0), P(30, 8)], 'b', 0.9), S([P(22, 0), P(30, -8)], 'b', 0.9));
    }
    return { strokes: s, fills: [] };
  };
  I.fridge = function () {
    return { strokes: [S(rrect(24, 6, 52, 90, 5), 'w', 1.3), S([[24, 38], [76, 38]], 'w', 1.1), S([[66, 18], [66, 30]], 'w', 1.3), S([[66, 48], [66, 64]], 'w', 1.3),
      S([[86, 20], [92, 26], [86, 32]], 'b', 0.8), S([[86, 44], [92, 50], [86, 56]], 'b', 0.8)], fills: [F(rrect(24, 6, 52, 90, 5), 'b')] };
  };
  I.star = function () {
    var p = [];
    for (var i = 0; i <= 10; i++) { var a = -Math.PI / 2 + i / 10 * Math.PI * 2, r = i % 2 ? 18 : 42; p.push([50 + r * Math.cos(a), 52 + r * Math.sin(a)]); }
    return { strokes: [S(p, 'y', 1.3)], fills: [F(p, 'y')] };
  };
  I.exclamation = function () { return { strokes: [S([[50, 10], [52, 64]], 'r', 2), S(circ(51, 84, 4), 'r', 1.8)], fills: [] }; };
  I.thermometer = function () {
    return { strokes: [S([[44, 70], [44, 14], [50, 8], [56, 14], [56, 70]], 'w', 1.2), S(circ(50, 80, 12), 'w', 1.2), S([[50, 76], [50, 30]], 'r', 2)],
      fills: [F(circ(50, 80, 10), 'r')] };
  };

  I['badge-c1'] = function () {
    var p = []; for (var i = 0; i <= 24; i++) { var a = i / 24 * Math.PI * 2, r = i % 2 ? 34 : 42; p.push([50 + r * Math.cos(a), 46 + r * Math.sin(a)]); }
    return { strokes: [S(p, 'y', 1.3), S([[36, 78], [30, 98], [42, 92], [48, 98], [46, 82]], 'r', 1), S([[64, 78], [70, 98], [58, 92], [52, 98], [54, 82]], 'r', 1),
      S([[48, 34], [38, 34], [34, 42], [34, 52], [38, 58], [48, 58]], 'w', 1.3), S([[56, 38], [62, 32], [62, 60]], 'w', 1.3)], fills: [F(p, 'y')] };
  };
  I['broken-ac'] = function () {
    var box = rrect(6, 20, 88, 34, 5);
    return { strokes: [S(box, 'w', 1.3), S([[14, 44], [86, 44]], 'w', 0.7), S([[14, 49], [86, 49]], 'w', 0.7), S(circ(80, 30, 3), 'g', 1),
      S([[30, 56], [26, 66], [32, 72]], 'r', 1), S([[48, 56], [52, 66], [46, 74], [50, 82]], 'r', 1), S([[70, 56], [66, 64]], 'r', 1),
      S([[38, 8], [44, 16], [36, 14], [42, 22]], 'y', 1), S([[60, 10], [56, 18], [64, 16], [58, 24]], 'y', 1)], fills: [F(box, 'b')] };
  };
  I['calendar-july'] = function () {
    var s = [S(rect(12, 18, 76, 72), 'w', 1.3), S([[12, 38], [88, 38]], 'w', 1.1), S([[30, 10], [30, 24]], 'w', 1.2), S([[70, 10], [70, 24]], 'w', 1.2),
      S([[40, 52], [40, 76], [34, 80]], 'w', 1.6), S([[50, 52], [50, 80], [60, 80]], 'w', 1.6), S([[64, 52], [70, 64], [76, 52]], 'w', 1.4), S([[70, 64], [70, 80]], 'w', 1.4),
      S(circ(80, 82, 9), 'y', 1)];
    return { strokes: s, fills: [F(rect(12, 18, 76, 20), 'r'), F(circ(80, 82, 9), 'y')] };
  };
  I.football = function () {
    var s = [S(circ(50, 52, 38), 'w', 1.4)], pent = [];
    for (var i = 0; i <= 5; i++) { var a = -Math.PI / 2 + i / 5 * Math.PI * 2; pent.push([50 + 12 * Math.cos(a), 52 + 12 * Math.sin(a)]); }
    s.push(S(pent, 'w', 1.2));
    for (i = 0; i < 5; i++) { var a2 = -Math.PI / 2 + i / 5 * Math.PI * 2; s.push(S([[50 + 12 * Math.cos(a2), 52 + 12 * Math.sin(a2)], [50 + 30 * Math.cos(a2), 52 + 30 * Math.sin(a2)]], 'w', 1)); }
    s.push(S([[4, 70], [12, 72]], 'w', 0.8), S([[2, 80], [12, 80]], 'w', 0.8));
    return { strokes: s, fills: [F(circ(50, 52, 38), 'w'), F(pent, 'k')] };
  };
  I['green-face'] = function () {
    var f = circ(50, 50, 38);
    return { strokes: [S(f, 'g', 1.3), S([[34, 40], [42, 44]], 'w', 1.2), S([[66, 40], [58, 44]], 'w', 1.2), S([[36, 68], [42, 62], [50, 68], [58, 62], [64, 68]], 'w', 1.2),
      S([[80, 18], [84, 28]], 'b', 1), S(circ(84, 32, 3), 'b', 1)], fills: [F(f, 'g')] };
  };
  I['juice-drops'] = function () {
    function drop(x, y, k) { var p = []; for (var i = 0; i <= 20; i++) { var a = i / 20 * Math.PI * 2, r = (1 - Math.sin(a)) * 0.5; p.push([x + Math.cos(a) * 10 * k * (0.4 + r), y + Math.sin(a) * 14 * k]); } return p; }
    var d1 = drop(30, 40, 1.5), d2 = drop(64, 30, 1.1), d3 = drop(56, 72, 1.3);
    return { strokes: [S(d1, 'r', 1.2), S(d2, 'r', 1.2), S(d3, 'r', 1.2), S([[24, 36], [26, 30]], 'w', 0.8)], fills: [F(d1, 'r'), F(d2, 'r'), F(d3, 'r')] };
  };
  I['melon-seed'] = function () {
    var p = []; for (var i = 0; i <= 28; i++) { var t = i / 28 * Math.PI * 2, u = Math.cos(t) * 30, v = Math.sin(t) * 18 * (0.5 + 0.5 * (1 - Math.cos(t)) / 2); p.push([50 + v, 50 - u]); }
    return { strokes: [S(p, 'w', 1.4), S([[46, 34], [44, 42]], 'y', 1)], fills: [F(p, 'k')] };
  };
  I['plate-stack'] = function () {
    var s = [];
    for (var i = 0; i < 4; i++) s.push(S(arc(50, 80 - i * 13, 40, 8, 0, 362, 30), 'w', 1.2));
    s.push(S([[34, 30], [40, 20], [50, 16], [60, 20], [66, 30]], 'y', 1.1));
    return { strokes: s, fills: [F([[34, 30], [40, 20], [50, 16], [60, 20], [66, 30]], 'y')] };
  };
  I['speech-bubbles'] = function () {
    var a = [[6, 12], [58, 12], [58, 46], [24, 46], [12, 58], [16, 46], [6, 46], [6, 12]], b = [[42, 52], [94, 52], [94, 84], [84, 84], [88, 96], [74, 84], [42, 84], [42, 52]];
    return { strokes: [S(a, 'w', 1.2), S(b, 'y', 1.2), S([[16, 26], [48, 26]], 'w', 0.6), S([[16, 34], [40, 34]], 'w', 0.6), S([[52, 66], [84, 66]], 'y', 0.6)], fills: [F(a, 'b'), F(b, 'o')] };
  };
  I.sunglasses = function () {
    var l = [[8, 40], [44, 40], [42, 58], [32, 64], [16, 62], [10, 52]], r = [[56, 40], [92, 40], [90, 52], [84, 62], [68, 64], [58, 58]];
    return { strokes: [S(l, 'w', 1.3), S(r, 'w', 1.3), S([[44, 44], [50, 40], [56, 44]], 'w', 1.2), S([[8, 40], [2, 34]], 'w', 1), S([[92, 40], [98, 34]], 'w', 1), S([[16, 46], [24, 46]], 'y', 0.8)],
      fills: [F(l, 'k'), F(r, 'k')] };
  };
  I.textbook = function () {
    var cover = [[18, 10], [80, 10], [80, 88], [18, 88]];
    return { strokes: [S(cover.concat([[18, 10]]), 'w', 1.3), S([[26, 10], [26, 88]], 'w', 0.9), S([[34, 28], [72, 28]], 'w', 1), S([[34, 38], [64, 38]], 'w', 0.8),
      S([[80, 14], [86, 18], [86, 92], [24, 92], [18, 88]], 'w', 0.9), S([[40, 60], [62, 60]], 'y', 1)], fills: [F(cover, 'r')] };
  };
  I['thermometer-35'] = function () {
    var r = I.thermometer();
    r.strokes.push(S([[64, 22], [70, 18], [74, 22], [70, 28], [74, 32], [70, 36], [64, 32]], 'r', 1.1), S([[80, 18], [90, 18], [80, 28], [88, 28], [90, 34], [82, 38]], 'r', 1.1), S(circ(94, 14, 3), 'r', 0.8));
    return r;
  };
  I.zzz = function () {
    return { strokes: [S([[14, 60], [36, 60], [14, 84], [38, 84]], 'b', 1.4), S([[46, 34], [64, 34], [46, 54], [66, 54]], 'b', 1.2), S([[72, 10], [86, 10], [72, 26], [88, 26]], 'b', 1)], fills: [] };
  };
  I.doodle = function () { // generic fallback: a sparkle burst
    var s = [];
    for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2, r0 = 12, r1 = i % 2 ? 30 : 44; s.push(S([[50 + r0 * Math.cos(a), 50 + r0 * Math.sin(a)], [50 + r1 * Math.cos(a), 50 + r1 * Math.sin(a)]], 'y', 1.2)); }
    return { strokes: s, fills: [] };
  };
  // aliases
  I['thumbs-up'] = I.thumbup = I.thumbsup; I['thumbs-down'] = I.thumbdown = I.thumbsdown; I.bulb = I.idea = I.lightbulb;
  I.bubble = I.speechbubble = I['speech-bubble'] = I.speech; I.kaffee = I.coffee; I.bier = I.beer; I.sonne = I.sun;
  I.wave = I.hand; I.cold = I.snow = I.snowflake; I.hot = I.thermometer;

  root.MeloIcons = {
    names: Object.keys(I),
    has: function (name) { return !!I[String(name || '').toLowerCase()]; },
    get: function (name) {
      var f = I[String(name || '').toLowerCase()];
      if (!f) { console.warn('MeloIcons: unknown icon "' + name + '" → doodle'); f = I.doodle; }
      return f();
    }
  };
})(typeof self !== 'undefined' ? self : this);
