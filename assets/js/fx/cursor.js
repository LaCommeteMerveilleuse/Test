// BlackPhage - l'effet de curseur : un point précis, un anneau qui le suit en douceur, qui grossit sur les liens et affiche un mot sur les articles.
import { t, onLang } from '../i18n.js';

export function initCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  const el = document.querySelector('.cursor');
  if (!el) return;
  root.classList.add('has-cursor');
  const dot = el.querySelector('.cursor__dot'); const ring = el.querySelector('.cursor__ring'); const label = el.querySelector('.cursor__label');
  let x = -100; let y = -100; let rx = x; let ry = y; let on = false;
  const bgSpot = document.querySelector('.bg__spot');
  addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    if (!on) { on = true; rx = x; ry = y; }
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (bgSpot) { root.style.setProperty('--mx', `${x}px`); root.style.setProperty('--my', `${y}px`); }
    const target = e.target.closest ? e.target.closest('a, button, [data-cursor], [data-cursor-label], input, select, textarea, label') : null;
    const lab = target && target.dataset.cursorLabel;
    el.classList.toggle('is-link', !!target && !lab);
    el.classList.toggle('has-label', !!lab);
    if (lab) label.textContent = t(lab);
    el.classList.toggle('is-agent', !target && !!window.__agentHot);
  }, { passive: true });
  addEventListener('pointerdown', () => el.classList.add('is-down'));
  addEventListener('pointerup', () => el.classList.remove('is-down'));
  document.addEventListener('pointerleave', () => { on = false; dot.style.transform = 'translate3d(-100px,-100px,0)'; ring.style.transform = 'translate3d(-100px,-100px,0)'; });
  onLang(() => { if (el.classList.contains('has-label')) label.textContent = ''; });
  (function loop() {
    rx += (x - rx) * 0.2; ry += (y - ry) * 0.2;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${el.classList.contains('is-down') ? 0.82 : 1})`;
    requestAnimationFrame(loop);
  })();
}
