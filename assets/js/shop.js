// BlackPhage - logique commune de la boutique : données, recherche, panier, illustrations.

const cache = new Map();
export function getJSON(path) {
  if (!cache.has(path)) cache.set(path, fetch(path).then((r) => { if (!r.ok) throw new Error(path); return r.json(); }));
  return cache.get(path);
}
export const loadShop = () => getJSON('assets/data/shop.json');
export const loadCatalogue = () => getJSON('assets/data/products.json');

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const money = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

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
  if (tokens.length) out.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name, 'fr'));
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

let vialId = 0;
/** Flacon illustré aux couleurs de la marque, avec le nom de la cible sur l'étiquette. */
export function vial(p) {
  const id = `v${vialId++}`;
  const words = p.target.split(' ');
  const long = p.target.length > 9 && words.length > 1;
  const lines = long ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [p.target];
  const longest = Math.max(...lines.map((l) => l.length));
  const fs = longest <= 6 ? 15 : longest <= 8 ? 13 : longest <= 11 ? 10.5 : 8.6;
  const text = lines.map((l, i) => `<text x="70" y="${(lines.length === 1 ? 143 : 138 + i * (fs + 2))}" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="700" font-size="${fs}" fill="#0b1a4f">${esc(l)}</text>`).join('');
  return `<svg viewBox="0 0 140 220" role="img" aria-label="${esc(p.name)}">
<defs>
<linearGradient id="${id}c" x1="0" x2="1"><stop offset="0" stop-color="#1a339a"/><stop offset=".42" stop-color="#4b74f0"/><stop offset="1" stop-color="#18308f"/></linearGradient>
<linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#e7eefc"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe8fb"/></linearGradient>
<linearGradient id="${id}l" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#eef3ff"/><stop offset="1" stop-color="#d7e3fd"/></linearGradient>
</defs>
<ellipse cx="70" cy="212" rx="42" ry="6" fill="#0b1a4f" opacity=".13"/>
<rect x="34" y="8" width="72" height="40" rx="9" fill="url(#${id}c)"/>
<g stroke="#fff" stroke-opacity=".22" stroke-width="1.4"><path d="M46 14v28M54 14v28M62 14v28M70 14v28M78 14v28M86 14v28M94 14v28"/></g>
<rect x="44" y="46" width="52" height="14" fill="url(#${id}g)" stroke="#cdd9f3"/>
<path d="M28 66q0-8 8-8h68q8 0 8 8v132q0 12-12 12H40q-12 0-12-12z" fill="url(#${id}g)" stroke="#cdd9f3" stroke-width="1.4"/>
<path d="M32 104h76v94q0 8-8 8H40q-8 0-8-8z" fill="url(#${id}l)"/>
<rect x="30" y="96" width="80" height="86" rx="3" fill="#fff" stroke="#e1e8f8"/>
<g fill="#1e3ca8"><circle cx="63" cy="109" r="2.3"/><circle cx="70" cy="111" r="1.9"/><circle cx="76" cy="108" r="2.1"/><circle cx="69" cy="116" r="2.5"/></g>
<text x="70" y="128" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="600" font-size="6" textLength="58" lengthAdjust="spacing" fill="#1e3ca8">BLACKPHAGE</text>
${text}
<text x="70" y="${lines.length === 1 ? 160 : 166}" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="500" font-size="4.6" textLength="40" lengthAdjust="spacing" fill="#6a75a0">SMART BINDER</text>
<rect x="36" y="64" width="6" height="128" rx="3" fill="#fff" opacity=".75"/>
</svg>`;
}

export function availabilityTag(p) {
  if (typeof p.stockRestant === 'number' && p.stockRestant > 0 && p.stockRestant <= 5) return `<span class="tag tag--warn">Plus que ${p.stockRestant} en stock</span>`;
  return p.availability === 'stock' ? '<span class="tag tag--ok">En stock</span>' : '<span class="tag">Sur commande</span>';
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
<div class="pcard__foot"><span class="price"><small>À partir de</small>${money(from)}</span>${availabilityTag(p)}</div>
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
