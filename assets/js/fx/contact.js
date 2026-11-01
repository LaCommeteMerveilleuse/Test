// BlackPhage - le bouton Contact et son curseur. Quand le curseur s'approche, le bouton se laisse attirer (effet magnétique), une lueur ambrée suit le curseur
// sur sa surface et de petits cubes s'envolent derrière lui ; un clic en lance une gerbe. Les cubes sont dessinés sur un canevas 2D léger qui ne tourne
// que lorsqu'il y a des cubes à animer.
export function initContact() {
  const btn = document.querySelector('.contact__btn');
  const sec = document.querySelector('.contact');
  if (!btn || !sec) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cv = document.createElement('canvas'); cv.className = 'contact__fx'; cv.setAttribute('aria-hidden', 'true');
  btn.parentElement.insertBefore(cv, btn.parentElement.firstChild);
  const g = cv.getContext('2d');
  let W = 0; let H = 0; let dpr = 1;
  const resize = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize(); addEventListener('resize', resize);
  const COLORS = ['#e0a35c', '#2a5f86', '#27463d', '#c8d1d3', '#f2c98f'];
  const P = [];
  let running = false;
  const spawn = (x, y, vx, vy, n = 1, burst = false) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2; const sp = burst ? 1.5 + Math.random() * 5 : Math.random() * 0.9;
      P.push({ x, y, vx: vx + Math.cos(a) * sp, vy: vy + Math.sin(a) * sp, s: 3 + Math.random() * (burst ? 9 : 6), r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.25, life: 1, d: 0.012 + Math.random() * 0.016, c: COLORS[(Math.random() * COLORS.length) | 0] });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  };
  function tick() {
    g.clearRect(0, 0, W, H);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.045; p.vx *= 0.985; p.r += p.vr; p.life -= p.d;
      if (p.life <= 0) { P.splice(i, 1); continue; }
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.min(1, p.life * 1.6);
      g.fillStyle = p.c; const s = p.s * (0.5 + 0.5 * p.life); g.fillRect(-s / 2, -s / 2, s, s);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-s / 2, -s / 2, s, s * 0.28);
      g.restore();
    }
    if (P.length) requestAnimationFrame(tick); else running = false;
  }
  const local = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)]; };
  let lx = 0; let ly = 0; let acc = 0;
  addEventListener('pointermove', (e) => {
    const b = btn.getBoundingClientRect();
    const cx = b.left + b.width / 2; const cy = b.top + b.height / 2;
    const dx = e.clientX - cx; const dy = e.clientY - cy;
    const reach = Math.max(b.width, b.height) / 2 + 150;
    const d = Math.hypot(dx, dy);
    if (d < reach && !reduce && fine) {
      const pull = 1 - d / reach;
      btn.style.setProperty('--tx', `${(dx * 0.22 * pull + dx * 0.06).toFixed(1)}px`); btn.style.setProperty('--ty', `${(dy * 0.28 * pull + dy * 0.06).toFixed(1)}px`);
      btn.style.setProperty('--mx', `${(e.clientX - b.left).toFixed(0)}px`); btn.style.setProperty('--my', `${(e.clientY - b.top).toFixed(0)}px`);
      btn.classList.add('is-near');
      const [x, y] = local(e);
      acc += Math.hypot(x - lx, y - ly);
      if (acc > 14) { acc = 0; spawn(x, y, (lx - x) * 0.06, (ly - y) * 0.06 - 0.4, 1 + (pull > 0.5 ? 1 : 0)); }
      lx = x; ly = y;
    } else if (btn.classList.contains('is-near')) {
      btn.classList.remove('is-near'); btn.style.setProperty('--tx', '0px'); btn.style.setProperty('--ty', '0px');
    }
  }, { passive: true });
  btn.addEventListener('click', (e) => {
    if (reduce) return;
    const [x, y] = e.clientX || e.clientY ? local(e) : [W / 2, H / 2];
    spawn(x, y, 0, -1, 34, true);
  });
}
