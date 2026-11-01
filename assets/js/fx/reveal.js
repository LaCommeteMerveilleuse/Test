// BlackPhage - les apparitions au défilement. Chaque section a la sienne : des mots qui montent, des cartes qui s'ouvrent en éventail,
// des mots qui s'allument un à un, des bandeaux qui se découvrent, des lignes qui se tracent.
import { wordsOf, onLang } from '../i18n.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initReveal() {
  const root = document.documentElement;
  setTimeout(() => root.classList.add('reveal-fallback'), 4000);
  const targets = document.querySelectorAll('.reveal, .reveal-fan, .reveal-line, .reveal-wipe, .chips--row');
  if (!('IntersectionObserver' in window) || reduce) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  targets.forEach((el) => io.observe(el));

  // le paragraphe de la raison d'être : les mots s'allument pendant qu'on lit
  const p = document.querySelector('[data-words]');
  const steps = document.querySelector('.rescue__steps');
  let words = [];
  const prep = () => { words = p ? wordsOf(p) : []; };
  prep();
  onLang(() => { prep(); onScroll(); });
  const onScroll = () => {
    if (p && words.length) {
      const r = p.getBoundingClientRect();
      const vh = innerHeight;
      const prog = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.3)));
      const n = Math.round(prog * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    }
    if (steps) {
      const r = steps.getBoundingClientRect();
      steps.style.setProperty('--line-p', Math.min(1, Math.max(0, (innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.2))).toFixed(3));
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
