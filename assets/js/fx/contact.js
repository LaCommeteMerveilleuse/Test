// BlackPhage - le bouton Contact. Quand le curseur s'approche, le bouton se laisse attirer (effet magnétique) et une lueur ambrée suit le curseur sur sa
// surface ; un clic lance une gerbe de petits cubes. La traînée de cubes qui suit le curseur est maintenant celle de toute la page (trail.js).
export function initContact(trail) {
  const btn = document.querySelector('.contact__btn');
  const sec = document.querySelector('.contact');
  if (!btn || !sec) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
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
    } else if (btn.classList.contains('is-near')) {
      btn.classList.remove('is-near'); btn.style.setProperty('--tx', '0px'); btn.style.setProperty('--ty', '0px');
    }
  }, { passive: true });
  btn.addEventListener('click', (e) => {
    if (reduce || !trail) return;
    const b = btn.getBoundingClientRect();
    const real = e.clientX || e.clientY;
    trail.burst(real ? e.clientX : b.left + b.width / 2, real ? e.clientY : b.top + b.height / 2);
  });
}
