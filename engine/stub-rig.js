/* MeloStubRig — minimal fallback with the MeloRig API (used only if engine/character/rig.js is missing).
 * prepare({fps, envelope, words, cues}) → { render(t, hint) → {svg:'<g>…</g>', anchors} }
 * Blinks, envelope-driven mouth gated by word intervals (closed in silence), melo cues (expr/pose/look). */
(function (root) {
  'use strict';
  function prepare(o) {
    var env = o.envelope || {}, rms = env.rms || [], fps = env.fps || o.fps || 30, words = o.words || [];
    var melo = (o.cues || []).filter(function (c) { return c.cue === 'melo'; });
    function speaking(t) { for (var i = 0; i < words.length; i++) { if (words[i].start - 0.03 <= t && t <= words[i].end + 0.03) return true; if (words[i].start > t) break; } return false; }
    function render(t, hint) {
      var st = { expr: 'smirk', pose: 'idle', look: 'viewer' };
      melo.forEach(function (c) { if (c.t <= t) { if (c.args.expr) st.expr = c.args.expr; if (c.args.pose) st.pose = c.args.pose; if (c.args.look) st.look = c.args.look; } });
      var lv = rms[Math.floor(t * fps)] || 0, mo = speaking(t) && lv > 0.08 ? Math.min(1, (lv - 0.08) * 1.8) : 0;
      var ph = (t % 3.7) / 3.7, blink = ph < 0.04 ? 1 : 0;
      var look = { viewer: [0, 0], board: [0.8, -0.1], left: [-0.8, 0], right: [0.8, 0] }[st.look] || [0, 0];
      var s = MeloB.svg({ expression: st.expr, pose: st.pose === 'finger' ? 'point' : st.pose, mouthOpen: mo, blink: blink, look: look, pencil: true, seed: 7 + (Math.floor(t * 8) % 3), id: 'stub' });
      var inner = s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      return { svg: '<g class="melo-stub">' + inner + '</g>', anchors: { headCenter: [0, -352], feet: [0, 0] }, state: st };
    }
    return { render: render };
  }
  root.MeloStubRig = { prepare: prepare };
})(typeof self !== 'undefined' ? self : this);
