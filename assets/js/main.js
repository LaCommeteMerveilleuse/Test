// BlackPhage - le point d'entrée. Les petits effets d'abord, puis l'agent en 3D (qui ne bloque jamais la page).
import { initLanguage, t, apply, onLang } from './i18n.js';
import { initNav } from './fx/nav.js';
import { initReveal } from './fx/reveal.js';
import { initCursor } from './fx/cursor.js';
import { initBackground } from './fx/background.js';
import { initFlow } from './fx/flow.js';
import { initContact } from './fx/contact.js';
import { initTrail } from './fx/trail.js';
import { initModals } from './fx/modal.js';

const root = document.documentElement;
const q = new URLSearchParams(location.search);

async function site() {
  try { return await (await fetch('assets/data/site.json')).json(); } catch (e) { return { email: 'partners@blackphage.com', careersEmail: 'careers@blackphage.com' }; }
}

initLanguage();
initNav();
initReveal();
initCursor();
const trail = initTrail();            // la traînée de petits cubes du curseur, sur toute la page
window.__trail = trail;
initBackground();
initFlow();
initContact(trail);
const heroEl = document.querySelector('.hero');
const showTitle = () => heroEl && heroEl.classList.add('is-in');       // le titre n'apparaît qu'après l'animation 3D d'ouverture
if (matchMedia('(prefers-reduced-motion: reduce)').matches) showTitle();
setTimeout(showTitle, 14000);                                           // filet de sécurité

// les adresses, les boutons Copier
site().then((s) => {
  document.querySelectorAll('[data-mail]').forEach((a) => {
    const addr = s[a.dataset.mail]; if (!addr) return;
    a.href = `mailto:${addr}${a.dataset.subject ? `?subject=${encodeURIComponent(a.dataset.subject)}` : ''}`;
    if (a.textContent.includes('@')) a.textContent = addr;
  });
  document.querySelectorAll('.copy[data-mailkey]').forEach((b) => { if (s[b.dataset.mailkey]) b.dataset.copy = s[b.dataset.mailkey]; });
  const idle = (b) => { b.textContent = t('copy_mail'); b.setAttribute('aria-label', `${t('copy_label')} ${b.dataset.copy}`); b.classList.remove('is-done'); };
  document.querySelectorAll('.copy').forEach((b) => {
    idle(b);
    b.addEventListener('click', async () => {
      let ok = true;
      try { await navigator.clipboard.writeText(b.dataset.copy); } catch (e) { ok = false; }
      b.textContent = ok ? t('copied') : b.dataset.copy; b.classList.toggle('is-done', ok);
      setTimeout(() => idle(b), 1800);
    });
  });
  onLang(() => document.querySelectorAll('.copy').forEach(idle));
  initModals(s);
});

// l'agent : WebGL2 obligatoire, sinon les images fixes prennent le relais
(async () => {
  const canvas = document.getElementById('agent');
  if (!canvas) return;
  let gl2 = false;
  try { gl2 = !!document.createElement('canvas').getContext('webgl2'); } catch (e) { /* rien */ }
  if (!gl2 || q.has('nogl')) { root.classList.add('no-webgl'); showTitle(); return; }
  try {
    const { startAgent } = await import('./agent/director.js');
    await startAgent({ canvas, low: q.get('n') === 'low', frozen: q.has('t') ? +q.get('t') : null, onTitle: showTitle });
    root.classList.add('agent-ready');
  } catch (e) {
    console.warn('agent', e);
    root.classList.add('no-webgl'); showTitle();
  }
})();
