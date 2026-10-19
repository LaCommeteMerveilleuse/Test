// BlackPhage - le cadre commun des pages : signe, menu, langue, contact, apparitions au défilement, décor.
// L'en-tête et le pied de page sont écrits dans le HTML (tools/build_site.py). Ici, on les rend vivants.
import { $, $$, loadSite, loadPrograms, copyText } from './site.js';
import { LANG, L, t, otherLangHref, rememberLang } from './i18n.js';
import { mountMarkDefs, markSvg } from './mark.js';
import { initGlass } from './glass.js';
import { initAbyss } from './abyss.js';
import { stage } from './stage.js';

const root = document.documentElement;
setTimeout(() => root.classList.add('reveal-fallback'), 2200);

// ------------------------------------------------------------------ le signe
mountMarkDefs();
let intro = false;   // le signe s'assemble une seule fois par session
try { intro = !sessionStorage.getItem('bp-intro') && !stage.reduce; sessionStorage.setItem('bp-intro', '1'); } catch { /* ignoré */ }
$$('[data-mark]').forEach((el, i) => {
  const small = el.classList.contains('logo__mark');
  el.innerHTML = markSvg({ bold: small, intro: small && intro && i === 0 });
});

// ------------------------------------------------------------------ langue
// Le sélecteur calcule son adresse au moment du clic (l'ancre peut avoir changé) et mémorise le choix.
const other = LANG === 'en' ? 'fr' : 'en';
$$('.langswitch').forEach((a) => {
  const refresh = () => { a.href = otherLangHref(); };
  ['pointerenter', 'focus', 'touchstart'].forEach((ev) => a.addEventListener(ev, refresh, { passive: true }));
  a.addEventListener('click', () => { refresh(); rememberLang(other); });
});

// ------------------------------------------------------------------ menu
const nav = $('#nav');
if (nav) {
  const burger = $('.nav__burger', nav);
  const close = () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => { const o = nav.classList.toggle('is-open'); burger.setAttribute('aria-expanded', String(o)); });
  $$('.nav__pill a', nav).forEach((a) => a.addEventListener('click', close));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.addEventListener('pointerdown', (e) => { if (nav.classList.contains('is-open') && !nav.contains(e.target)) close(); });
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ------------------------------------------------------------------ contact
// Les adresses sont écrites dans le HTML. Si assets/data/site.json change, on les met à jour sans reconstruire.
loadSite().then((site) => {
  $$('[data-mail]').forEach((a) => {
    const addr = site[a.dataset.mail];
    if (!addr) return;
    a.href = `mailto:${addr}${a.dataset.subject ? `?subject=${a.dataset.subject}` : ''}`;
    if (a.textContent.includes('@')) a.textContent = addr;
  });
  $$('.copy[data-mailkey]').forEach((b) => { if (site[b.dataset.mailkey]) b.dataset.copy = site[b.dataset.mailkey]; });
}).catch(() => { /* les adresses du HTML restent */ });

/** Branche les boutons Copier d'une zone. Appelée aussi par les pages qui écrivent leur contenu après coup. */
export function wireCopy(scope = document) {
  $$('.copy', scope).forEach((b) => {
    if (b.dataset.wired) return;
    b.dataset.wired = '1';
    const idle = () => { b.textContent = t('copy_mail'); b.setAttribute('aria-label', t('copy_label', { mail: b.dataset.copy })); b.classList.remove('is-done'); };
    idle();
    b.addEventListener('click', async () => {
      const ok = await copyText(b.dataset.copy);
      b.textContent = ok ? t('copied') : b.dataset.copy;
      b.classList.toggle('is-done', ok);
      setTimeout(idle, 1800);
    });
  });
}
wireCopy();

// la liste des programmes du pied de page suit programs.json
const plist = $('[data-programs-list]');
if (plist) {
  loadPrograms().then((d) => {
    const first = plist.firstElementChild;
    plist.replaceChildren(first, ...d.programs.filter((p) => p.detail).map((p) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `program.html#${p.id}`;
      a.textContent = L(p.name);
      li.append(a);
      return li;
    }));
  }).catch(() => { /* la liste du HTML reste */ });
}

// ------------------------------------------------------------------ apparitions
const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
export function observeReveals(scope = document) {
  $$('.reveal', scope).forEach((el) => { if (io) io.observe(el); else el.classList.add('is-in'); });
}
observeReveals();
window.__observeReveals = observeReveals;

// ------------------------------------------------------------------ couches de l'identité
initGlass();
if (!$('.grain')) { const g = document.createElement('div'); g.className = 'grain'; g.setAttribute('aria-hidden', 'true'); document.body.appendChild(g); }
// l'accueil a sa propre scène (scene.js). Les autres pages reçoivent l'abysse, plus calme.
if (!document.getElementById('scene')) initAbyss();
