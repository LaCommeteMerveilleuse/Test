// BlackPhage - la poussière du fond : une poignée de minuscules cubes gris qui flottent, avec un peu de parallaxe, que le curseur repousse.
// Il y en a très peu : le seul nuage de cubes de la page est celui de l'agent, et il ne fait qu'une traînée fine.
export function initBackground() {
  const c = document.getElementById('dust');
  if (!c || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const g = c.getContext('2d');
  let W = 0; let H = 0; let dpr = 1;
  const N = innerWidth < 700 ? 6 : 14;
  const P = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const resize = () => { dpr = Math.min(devicePixelRatio || 1, 1.5); W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize(); addEventListener('resize', resize);
  const cols = ['200,209,211', '200,209,211', '39,70,61', '42,95,134', '224,163,92'];
  for (let i = 0; i < N; i++) P.push({ x: rnd(0, 1), y: rnd(0, 1), s: rnd(2, 6.5), z: rnd(0.2, 1), r: rnd(0, Math.PI), v: rnd(-0.00004, -0.00014), c: cols[Math.floor(Math.random() * cols.length)] });
  let mx = -1e4; let my = -1e4; let sy = scrollY;
  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  let last = performance.now();
  (function frame(now) {
    const dt = Math.min(48, now - last); last = now;
    if (!document.hidden) {
      g.clearRect(0, 0, W, H);
      const scroll = scrollY; const dy = (scroll - sy) * 0.0; sy = scroll;
      for (const p of P) {
        p.y += p.v * dt; p.r += 0.0004 * dt; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        let px = p.x * W; let py = ((p.y * H - scroll * 0.06 * p.z) % (H + 60) + H + 60) % (H + 60) - 30;
        const ddx = px - mx; const ddy = py - my; const d2 = ddx * ddx + ddy * ddy;
        if (d2 < 22000) { const f = (1 - d2 / 22000) * 28; const d = Math.sqrt(d2) || 1; px += (ddx / d) * f; py += (ddy / d) * f; }
        g.save(); g.translate(px, py); g.rotate(p.r); g.fillStyle = `rgba(${p.c},${0.1 + p.z * 0.24})`;
        g.fillRect(-p.s / 2, -p.s / 2, p.s * (0.6 + p.z * 0.6), p.s * (0.6 + p.z * 0.6)); g.restore();
      }
    }
    requestAnimationFrame(frame);
  })(last);
}
