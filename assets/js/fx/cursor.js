// BlackPhage - le curseur : un point précis, sans anneau autour. Il grossit un peu et prend l'ambre sur les liens et les boutons.
// La traînée de petits cubes qui le suit sur toute la page est dans trail.js.
export function initCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  const el = document.querySelector('.cursor');
  if (!el) return;
  root.classList.add('has-cursor');
  const dot = el.querySelector('.cursor__dot');
  const bgSpot = document.querySelector('.bg__spot');
  addEventListener('pointermove', (e) => {
    dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    if (bgSpot) { root.style.setProperty('--mx', `${e.clientX}px`); root.style.setProperty('--my', `${e.clientY}px`); }
    const target = e.target.closest ? e.target.closest('a, button, [data-cursor], input, select, textarea, label') : null;
    el.classList.toggle('is-link', !!target);
  }, { passive: true });
  addEventListener('pointerdown', () => el.classList.add('is-down'));
  addEventListener('pointerup', () => el.classList.remove('is-down'));
  document.addEventListener('pointerleave', () => { dot.style.transform = 'translate3d(-100px,-100px,0)'; });
}
