// BlackPhage - accueil : recherche avec suggestions, sélection de produits, témoignages éventuels.
import { loadCatalogue, loadShop, searchProducts, highlight, productCard, esc, $ } from './shop.js';

const [catalogue, shop] = await Promise.all([loadCatalogue(), loadShop()]);

// sélection de l'équipe
const featured = $('#featured');
if (featured) {
  featured.innerHTML = catalogue.products.filter((p) => p.featured).slice(0, 4).map((p) => productCard(p, catalogue)).join('');
  window.__observeReveals?.(featured);
}

// témoignages, affichés uniquement s'il y en a dans shop.json
const quotes = $('#quotes');
if (quotes && Array.isArray(shop.testimonials) && shop.testimonials.length) {
  quotes.hidden = false;
  $('#quotes-list').innerHTML = shop.testimonials.map((t) => `<figure class="card quote reveal"><p>${esc(t.text)}</p><footer>${esc(t.author)}</footer></figure>`).join('');
  window.__observeReveals?.(quotes);
}

// recherche avec suggestions
const form = $('#home-search');
const input = $('#home-q');
const list = $('#home-suggest');
let active = -1;
let items = [];

function go(q) {
  try { sessionStorage.setItem('bp-q', q); } catch { /* ignoré */ }
  location.href = q ? `catalogue.html?q=${encodeURIComponent(q)}` : 'catalogue.html';
}

function render() {
  const q = input.value.trim();
  if (!q) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
  const res = searchProducts(catalogue, q);
  items = res.slice(0, 6);
  active = -1;
  list.innerHTML = items.length
    ? items.map((p, i) => `<a role="option" id="sg-${i}" href="produit.html#${p.id}" aria-selected="false"><span>${highlight(p.name, q)}</span><small>${esc(catalogue.categories.find((c) => c.id === p.category)?.label || '')}</small></a>`).join('')
      + (res.length > 6 ? `<a role="option" href="catalogue.html?q=${encodeURIComponent(q)}" data-all="1"><span><strong>Voir les ${res.length} résultats</strong></span></a>` : '')
    : `<div class="suggest__empty">Pas encore de Smart Binder pour « ${esc(q)} ». <a class="link" href="sur-mesure.html" data-custom="1">Nous pouvons le créer pour vous</a></div>`;
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}

function mark(i) {
  const opts = [...list.querySelectorAll('a')];
  opts.forEach((o, k) => o.setAttribute('aria-selected', String(k === i)));
  active = i;
  if (opts[i]) input.setAttribute('aria-activedescendant', opts[i].id || '');
}

input.addEventListener('input', render);
input.addEventListener('focus', render);
input.addEventListener('keydown', (e) => {
  const n = list.querySelectorAll('a').length;
  if (e.key === 'ArrowDown' && n) { e.preventDefault(); mark((active + 1) % n); }
  else if (e.key === 'ArrowUp' && n) { e.preventDefault(); mark((active - 1 + n) % n); }
  else if (e.key === 'Escape') { list.hidden = true; }
});
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const opts = [...list.querySelectorAll('a')];
  if (active >= 0 && opts[active]) { location.href = opts[active].getAttribute('href'); return; }
  go(input.value.trim());
});
document.addEventListener('click', (e) => { if (!form.contains(e.target)) list.hidden = true; });

// exemples cliquables
document.querySelectorAll('[data-try]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.try; input.focus(); render(); }));
