// BlackPhage - le fond qui coule. Chaque section porte une teinte (data-tone) : trois lueurs, leurs couleurs et leurs places. Pendant le défilement, le fond
// fixe passe en douceur d'une teinte à la suivante, de milieu de section en milieu de section : il n'y a ni coupure ni panneau entre les sections.
const rgba = (c) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${c[3].toFixed(3)})`;

// couleur (r, g, b, alpha) de chaque lueur, puis leurs places (x1, y1, x2, y2, x3, y3) en centièmes de la fenêtre
const TONES = {
  haze:  { c: [[231, 238, 240, 1.0], [224, 163, 92, 0.20], [42, 95, 134, 0.10]], p: [-2, 2, 100, 6, 102, 104] },
  warm:  { c: [[247, 238, 224, 0.95], [224, 163, 92, 0.20], [231, 238, 240, 0.9]], p: [8, 34, 96, 10, 4, 100] },
  mist:  { c: [[214, 223, 227, 0.9], [231, 238, 240, 1.0], [42, 95, 134, 0.13]], p: [-4, 40, 92, 8, 100, 96] },
  blue:  { c: [[206, 223, 234, 0.85], [231, 238, 240, 1.0], [224, 163, 92, 0.16]], p: [100, 40, 8, 10, 4, 100] },
  aqua:  { c: [[221, 235, 239, 0.95], [199, 222, 235, 0.65], [39, 70, 61, 0.07]], p: [6, 20, 96, 60, 50, 108] },
  warm2: { c: [[248, 239, 226, 0.95], [224, 163, 92, 0.24], [231, 238, 240, 0.95]], p: [94, 18, 4, 52, 52, 106] },
  deep:  { c: [[205, 219, 228, 0.95], [42, 95, 134, 0.20], [224, 163, 92, 0.16]], p: [50, 8, 100, 84, 0, 92] },
};
const mixTone = (a, b, k) => ({
  c: a.c.map((col, i) => col.map((v, j) => v + (b.c[i][j] - v) * k)),
  p: a.p.map((v, i) => v + (b.p[i] - v) * k),
});

export function initFlow() {
  const bg = document.querySelector('.bg');
  const secs = [...document.querySelectorAll('[data-tone]')];
  if (!bg || !secs.length) return;
  let want = TONES.haze; let cur = mixTone(TONES.haze, TONES.haze, 0);
  const ease = (k) => k * k * (3 - 2 * k);
  function target() {
    const vc = innerHeight * 0.5;
    const mids = secs.map((s) => { const r = s.getBoundingClientRect(); return r.top + r.height / 2; });
    let i = 0;
    while (i < secs.length - 1 && mids[i + 1] <= vc) i++;
    if (vc <= mids[0]) return TONES[secs[0].dataset.tone] || TONES.haze;
    if (i >= secs.length - 1) return TONES[secs[secs.length - 1].dataset.tone] || TONES.haze;
    const k = ease(Math.min(1, Math.max(0, (vc - mids[i]) / Math.max(1, mids[i + 1] - mids[i]))));
    return mixTone(TONES[secs[i].dataset.tone] || TONES.haze, TONES[secs[i + 1].dataset.tone] || TONES.haze, k);
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    want = target();
    const k = 1 - Math.exp(-dt * 6);                    // la teinte rattrape le défilement en douceur
    cur = { c: cur.c.map((col, i) => col.map((v, j) => v + (want.c[i][j] - v) * k)), p: cur.p.map((v, i) => v + (want.p[i] - v) * k) };
    const s = bg.style;
    s.setProperty('--c1', rgba(cur.c[0])); s.setProperty('--c2', rgba(cur.c[1])); s.setProperty('--c3', rgba(cur.c[2]));
    s.setProperty('--x1', cur.p[0].toFixed(2)); s.setProperty('--y1', cur.p[1].toFixed(2));
    s.setProperty('--x2', cur.p[2].toFixed(2)); s.setProperty('--y2', cur.p[3].toFixed(2));
    s.setProperty('--x3', cur.p[4].toFixed(2)); s.setProperty('--y3', cur.p[5].toFixed(2));
    requestAnimationFrame(frame);
  }
  cur = mixTone(target(), target(), 0);
  requestAnimationFrame(frame);
}
