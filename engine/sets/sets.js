// Set registry for full-frame illustrated backgrounds (see docs/PIPELINE.md, "Visual flow v2").
// Each set lives in its own file engine/sets/<name>.js and calls Sets.register(name, def).
// def = {
//   render(opts) -> { bg: '<svg markup for 1920x1080>', fg: '<optional overlay in front of characters>' },
//   slots: { left: {x, y, scale}, right: {...}, ... }   // feet position + scale for characters
//   ambient?: true                                       // render() uses opts.t for small motion
// }
// opts = { t, seed, variant }. render must be a pure function of opts (frames render in parallel).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Sets = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const defs = {};
  const cache = {};
  return {
    register(name, def) { defs[name] = def; },
    has(name) { return !!defs[name]; },
    list() { return Object.keys(defs); },
    slots(name) { return (defs[name] && defs[name].slots) || {}; },
    render(name, opts = {}) {
      const def = defs[name];
      if (!def) return { bg: '', fg: '' };
      // Static sets are cached per seed/variant; ambient sets render every time.
      if (!def.ambient) {
        const key = name + '|' + (opts.seed || 0) + '|' + (opts.variant || '');
        if (!cache[key]) cache[key] = def.render(opts);
        return cache[key];
      }
      return def.render(opts);
    },
  };
});
