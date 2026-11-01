// BlackPhage - le bouton FR / EN. Le texte est écrit en anglais dans la page. Le dictionnaire (assets/data/strings.js,
// généré par tools/build_site.py) contient les deux langues, et le bouton échange tout le texte sans recharger.
import STRINGS from '../data/strings.js';

const root = document.documentElement;
export let LANG = root.dataset.lang === 'fr' ? 'fr' : 'en';
const subs = new Set();

export const t = (key, lang = LANG) => (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS.en && STRINGS.en[key]) || key;
export const onLang = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const number = (n) => new Intl.NumberFormat(LANG === 'fr' ? 'fr-FR' : 'en-US').format(n);

/** Coupe un texte en mots, chacun dans deux boîtes, pour les animations. */
export function splitWords(el) {
  let w = 0;
  el.querySelectorAll('[data-i18n]').forEach((part) => {
    const words = part.textContent.trim().split(/\s+/);
    part.textContent = '';
    words.forEach((word, i) => {
      const o = document.createElement('span'); o.className = 'word'; o.style.setProperty('--w', w++);
      const n = document.createElement('span'); n.className = 'word__i'; n.textContent = word;
      o.appendChild(n); part.appendChild(o);
      if (i < words.length - 1) part.appendChild(document.createTextNode(' '));
    });
  });
}

/** Coupe un paragraphe en mots allumés un à un par le défilement. */
export function wordsOf(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((word, i) => {
    const s = document.createElement('span'); s.className = 'wd'; s.textContent = word;
    el.appendChild(s);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
  return [...el.querySelectorAll('.wd')];
}

export function apply(lang) {
  LANG = lang === 'fr' ? 'fr' : 'en';
  root.lang = LANG; root.dataset.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('*').forEach((el) => {
    if (!el.attributes || !el.hasAttributes()) return;
    for (const a of el.getAttributeNames()) {
      if (a.startsWith('data-i18n-') && a !== 'data-i18n-html') el.setAttribute(a.slice(10), t(el.getAttribute(a)));
    }
  });
  const tk = document.body.dataset.titleKey;
  if (tk) document.title = document.body.dataset.home === '1' ? t(tk) : `${t(tk)} · BlackPhage`;
  const dk = document.body.dataset.descKey; const meta = document.querySelector('meta[name="description"]');
  if (dk && meta) meta.setAttribute('content', t(dk));
  document.querySelectorAll('[data-split]').forEach(splitWords);
  document.querySelectorAll('[data-words]').forEach((el) => { el.dataset.ready = '1'; });
  try { localStorage.setItem('bp-lang', LANG); } catch (e) { /* stockage indisponible */ }
  subs.forEach((fn) => fn(LANG));
}

export function initLanguage() {
  apply(LANG);
  root.classList.remove('i18n-pending');
  document.getElementById('lang')?.addEventListener('click', () => apply(LANG === 'fr' ? 'en' : 'fr'));
}
