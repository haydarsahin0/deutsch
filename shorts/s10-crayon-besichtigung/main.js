// Page contract (as in lemo-opuscar's demos): window.READY, window.render(t), window.DUR, window.TEXTS(t).
const M = await import('./film.js');
await M.init();
window.DUR = M.DUR;
window.render = t => M.frame(t);
window.TEXTS = t => M.texts(t);
window.READY = true;
