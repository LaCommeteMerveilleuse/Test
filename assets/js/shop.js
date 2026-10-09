// BlackPhage - logique commune de la boutique : données, recherche, panier, illustrations.
import { LANG, BASE, t } from './i18n.js';

const cache = new Map();
export function getJSON(path) {
  if (!cache.has(path)) cache.set(path, fetch(path).then((r) => { if (!r.ok) throw new Error(path); return r.json(); }));
  return cache.get(path);
}
const pick = (o, k) => (LANG === 'en' && o[`${k}_en`] !== undefined ? o[`${k}_en`] : o[k]);

/** Informations de la boutique dans la langue de la page. */
export const loadShop = () => getJSON(`${BASE}assets/data/shop.json`).then((s) => ({
  ...s,
  responseTime: pick(s, 'responseTime'),
  delivery: pick(s, 'delivery'),
  researchOnly: pick(s, 'researchOnly'),
  testimonials: (s.testimonials || []).map((x) => ({ text: pick(x, 'text'), author: pick(x, 'author') })),
}));

/** Catalogue dans la langue de la page. Les champs localisés remplacent les champs français. */
export const loadCatalogue = () => getJSON(`${BASE}assets/data/products.json`).then((c) => {
  if (c._local) return c._local;
  c._local = {
    categories: c.categories.map((x) => ({ id: x.id, label: pick(x, 'label') })),
    products: c.products.map((p) => ({
      ...p,
      name: pick(p, 'name'),
      target: pick(p, 'target'),
      summary: pick(p, 'summary'),
      uses: pick(p, 'uses'),
      formats: p.formats.map((f) => ({ ...f, label: pick(f, 'label'), detail: pick(f, 'detail') })),
    })),
  };
  return c._local;
});

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const money = (n) => new Intl.NumberFormat(LANG === 'en' ? 'en-IE' : 'fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ------------------------------------------------------------------ recherche
function oneTypo(a, b) {
  if (Math.abs(a.length - b.length) > 1 || a === b) return a === b;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

function prepare(p, cats) {
  if (p._h) return p._h;
  const cat = cats.find((c) => c.id === p.category);
  p._h = {
    name: norm(p.name),
    target: norm(p.target),
    targetWords: norm(p.target).split(' '),
    keys: (p.keywords || []).map(norm),
    cat: norm(cat ? cat.label : ''),
    text: norm(`${p.summary} ${(p.uses || []).join(' ')}`),
  };
  return p._h;
}

/** Résultats classés. Chaque mot de la recherche doit se retrouver quelque part (une faute de frappe est tolérée). */
export function searchProducts(catalogue, query, category = 'all') {
  const tokens = norm(query).split(' ').filter(Boolean);
  const out = [];
  for (const p of catalogue.products) {
    if (category !== 'all' && p.category !== category) continue;
    const h = prepare(p, catalogue.categories);
    let total = 0;
    let ok = true;
    for (const t of tokens) {
      let s = 0;
      if (h.target === t) s = Math.max(s, 30);
      else if (h.targetWords.includes(t)) s = Math.max(s, 22);
      else if (h.target.startsWith(t)) s = Math.max(s, 18);
      else if (h.target.includes(t)) s = Math.max(s, 12);
      if (h.name.includes(t)) s = Math.max(s, 9);
      for (const k of h.keys) {
        if (k === t) s = Math.max(s, 20);
        else if (k.startsWith(t)) s = Math.max(s, 14);
        else if (t.length > 2 && k.includes(t)) s = Math.max(s, 8);
      }
      if (h.cat.includes(t)) s = Math.max(s, 6);
      if (t.length > 2 && h.text.includes(t)) s = Math.max(s, 2);
      if (!s && t.length >= 5 && !/\d/.test(t)) {
        if (h.targetWords.some((w) => w.length >= 5 && !/\d/.test(w) && oneTypo(t, w)) || h.keys.some((k) => k.length >= 5 && !/\d/.test(k) && oneTypo(t, k))) s = 5;
      }
      if (!s) { ok = false; break; }
      total += s;
    }
    if (ok) out.push({ p, score: total });
  }
  if (tokens.length) out.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name, LANG));
  return out.map((x) => x.p);
}

const ACCENTS = { a: 'aàâä', e: 'eéèêë', i: 'iîï', o: 'oôö', u: 'uùûü', c: 'cç' };
export function highlight(text, query) {
  const tokens = norm(query).split(' ').filter((t) => t.length > 0);
  const safe = esc(text);
  if (!tokens.length) return safe;
  const pattern = tokens.map((t) => [...t].map((ch) => (ACCENTS[ch] ? `[${ACCENTS[ch]}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('')).join('|');
  try { return safe.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>'); } catch { return safe; }
}

// -------------------------------------------------------------------- panier
const KEY = 'blackphage-commande';
let memory = null;
const listeners = new Set();
function read() {
  if (memory) return memory;
  try { memory = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { memory = []; }
  if (!Array.isArray(memory)) memory = [];
  return memory;
}
function write(items) {
  memory = items;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* stockage indisponible, on garde la mémoire */ }
  listeners.forEach((fn) => fn(items));
}
addEventListener('storage', (e) => { if (e.key === KEY) { memory = null; listeners.forEach((fn) => fn(read())); } });

export const cart = {
  items: () => read().map((x) => ({ ...x })),
  count: () => read().reduce((n, x) => n + x.qty, 0),
  add(id, format, qty = 1) {
    const items = read().map((x) => ({ ...x }));
    const found = items.find((x) => x.id === id && x.format === format);
    if (found) found.qty = Math.min(99, found.qty + qty); else items.push({ id, format, qty: Math.min(99, qty) });
    write(items);
  },
  setQty(id, format, qty) {
    const items = read().map((x) => ({ ...x }));
    const found = items.find((x) => x.id === id && x.format === format);
    if (found) found.qty = Math.max(1, Math.min(99, qty));
    write(items);
  },
  remove(id, format) { write(read().filter((x) => !(x.id === id && x.format === format))); },
  clear() { write([]); },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

/** Lignes détaillées du panier avec prix. */
export function cartLines(catalogue) {
  return cart.items().map((it) => {
    const p = catalogue.products.find((x) => x.id === it.id);
    const f = p && p.formats.find((x) => x.id === it.format);
    return p && f ? { ...it, product: p, fmt: f, total: f.price * it.qty } : null;
  }).filter(Boolean);
}

// ----------------------------------------------------------- illustrations
export function markSvg() {
  return `<svg viewBox="0 0 36 36" aria-hidden="true"><g stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M13 8l11 4M24 12l-6 8M18 20l-9-3M18 20l-5 11M24 12l6 12"/></g><g fill="currentColor"><circle cx="13" cy="8" r="4.2"/><circle cx="25" cy="12.5" r="3.4"/><circle cx="8" cy="17" r="3.2"/><circle cx="18" cy="20" r="4.6"/><circle cx="12.5" cy="31" r="3.2"/><circle cx="30" cy="24.5" r="3.6"/></g></svg>`;
}

/** Photo de synthèse du flacon. Les cibles personnalisées utilisent le flacon générique. */
export function vial(p) {
  const file = p.id ? `${BASE}assets/img/vials/${p.id}.webp` : `${BASE}assets/img/vials/custom-${LANG}.webp`;
  return `<img class="vialimg" src="${file}" alt="${esc(p.name)}" width="200" height="420" loading="lazy" decoding="async">`;
}

export function availabilityTag(p) {
  if (typeof p.stockRestant === 'number' && p.stockRestant > 0 && p.stockRestant <= 5) return `<span class="tag tag--warn">${t('only_left', { n: p.stockRestant })}</span>`;
  return p.availability === 'stock' ? `<span class="tag tag--ok">${t('in_stock')}</span>` : `<span class="tag">${t('on_demand')}</span>`;
}

export function productCard(p, catalogue, query = '') {
  const cat = catalogue.categories.find((c) => c.id === p.category);
  const from = Math.min(...p.formats.map((f) => f.price));
  return `<article class="card pcard reveal">
<a class="pcard__img" href="produit.html#${p.id}" aria-label="${esc(p.name)}">${vial(p)}</a>
<div class="pcard__body">
<span class="pcard__cat">${esc(cat ? cat.label : '')}</span>
<h3><a href="produit.html#${p.id}">${highlight(p.name, query)}</a></h3>
<p>${esc(p.summary)}</p>
<div class="pcard__foot"><span class="price"><small>${t('from')}</small>${money(from)}</span>${availabilityTag(p)}</div>
</div>
</article>`;
}

// ----------------------------------------------------------- courrier et copie
export function mailto(email, subject, body) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function copyText(text, field) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    if (field) { field.focus(); field.select(); try { return document.execCommand('copy'); } catch { return false; } }
    return false;
  }
}

export function toast(message, linkHref, linkText) {
  let el = $('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = `<span>${esc(message)}</span>${linkHref ? `<a href="${linkHref}">${esc(linkText)}</a>` : ''}`;
  el.classList.add('is-on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('is-on'), 4200);
}
