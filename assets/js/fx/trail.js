// BlackPhage - la traînée du curseur, sur toute la page : de petits cubes naissent derrière le curseur, tournent, retombent doucement et s'effacent
// (les mêmes que ceux du bouton Contact). Un seul canevas 2D fixe, qui ne tourne que lorsqu'il y a des cubes à animer. Rien sur écran tactile ni avec
// « réduire les animations ». Le bouton Contact s'en sert aussi pour sa gerbe au clic.
const COLORS = ['#e0a35c', '#2a5f86', '#27463d', '#c8d1d3', '#f2c98f'];
const MAX = 170;

export function initTrail() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const none = { burst() {}, count: () => 0 };
  if (reduce) return none;
  const cv = document.createElement('canvas'); cv.className = 'trail'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const g = cv.getContext('2d');
  if (!g) return none;
  let W = 0; let H = 0; let dpr = 1;
  const resize = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize(); addEventListener('resize', resize);

  const P = [];
  let running = false; let last = 0;
  const spawn = (x, y, vx, vy, n = 1, burst = false) => {
    for (let i = 0; i < n; i++) {
      if (P.length >= MAX) P.shift();
      const a = Math.random() * Math.PI * 2; const sp = burst ? 1.5 + Math.random() * 5 : Math.random() * 0.9;
      P.push({ x, y, vx: vx + Math.cos(a) * sp, vy: vy + Math.sin(a) * sp, s: 3.5 + Math.random() * (burst ? 9 : 6), r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.25, life: 1, d: 0.011 + Math.random() * 0.015, c: COLORS[(Math.random() * COLORS.length) | 0] });
    }
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
  };
  function tick(now) {
    const k = Math.min(2.5, Math.max(0.4, ((now - last) / 1000) * 60)); last = now;      // indépendant de la cadence d'affichage
    g.clearRect(0, 0, W, H);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.x += p.vx * k; p.y += p.vy * k; p.vy += 0.045 * k; p.vx *= Math.pow(0.985, k); p.r += p.vr * k; p.life -= p.d * k;
      if (p.life <= 0) { P.splice(i, 1); continue; }
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.min(1, p.life * 1.6);
      g.fillStyle = p.c; const s = p.s * (0.5 + 0.5 * p.life); g.fillRect(-s / 2, -s / 2, s, s);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-s / 2, -s / 2, s, s * 0.28);
      g.restore();
    }
    if (P.length) requestAnimationFrame(tick); else { running = false; g.clearRect(0, 0, W, H); }
  }

  // la traînée : un cube tous les quelques pixels parcourus, un peu plus quand le curseur va vite
  if (fine) {
    let lx = null; let ly = 0; let acc = 0;
    addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const x = e.clientX; const y = e.clientY;
      if (lx === null) { lx = x; ly = y; return; }
      const d = Math.hypot(x - lx, y - ly);
      acc += d;
      if (acc > 12) { acc = 0; spawn(x, y, (lx - x) * 0.05, (ly - y) * 0.05 - 0.35, 1 + (d > 38 ? 1 : 0)); }
      lx = x; ly = y;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { lx = null; });
  }
  return { burst: (x, y) => spawn(x, y, 0, -1, 34, true), count: () => P.length };
}
