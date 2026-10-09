// BlackPhage - catalogue : moteur de recherche, filtres par univers, tri.
import { t } from './i18n.js';
import { LANG } from './i18n.js';
import { loadCatalogue, searchProducts, productCard, esc, vial, $, $$ } from './shop.js';

const catalogue = await loadCatalogue();
const input = $('#q');
const chips = $('#cats');
const sortSel = $('#sort');
const results = $('#results');
const count = $('#count');
const empty = $('#empty');

const params = new URLSearchParams(location.search);
let initial = params.get('q') || '';
try { if (!initial) initial = sessionStorage.getItem('bp-q') || ''; sessionStorage.removeItem('bp-q'); } catch { /* ignoré */ }
const state = { q: initial, cat: params.get('cat') || 'all', sort: 'pertinence' };
input.value = state.q;

chips.innerHTML = [{ id: 'all', label: t('all_catalogue') }, ...catalogue.categories]
  .map((c) => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${c.id === state.cat}">${esc(c.label)}</button>`).join('');

function minPrice(p) { return Math.min(...p.formats.map((f) => f.price)); }

function render() {
  let list = searchProducts(catalogue, state.q, state.cat);
  if (state.sort === 'prix') list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
  if (state.sort === 'nom') list = [...list].sort((a, b) => a.target.localeCompare(b.target, LANG));
  count.textContent = list.length === 0 ? t('no_result') : t('n_binders', { n: list.length, s: list.length > 1 ? 's' : '' });
  results.innerHTML = list.map((p) => productCard(p, catalogue, state.q)).join('');
  empty.hidden = list.length > 0;
  results.hidden = list.length === 0;
  if (!list.length) {
    const q = state.q.trim();
    $('#empty-title').textContent = q ? t('no_binder_for', { q }) : t('no_result');
    $('#empty-cta').href = 'sur-mesure.html';
    $('#empty-cta').onclick = () => { try { sessionStorage.setItem('bp-cible', q); } catch { /* ignoré */ } };
    $('#empty-vial').innerHTML = vial({ name: t('new_target') });
  }
  $$('.chip', chips).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === state.cat)));
  window.__observeReveals?.(results);
  try {
    const u = new URL(location.href);
    state.q ? u.searchParams.set('q', state.q) : u.searchParams.delete('q');
    state.cat !== 'all' ? u.searchParams.set('cat', state.cat) : u.searchParams.delete('cat');
    history.replaceState(null, '', u);
  } catch { /* ignoré */ }
}

input.addEventListener('input', () => { state.q = input.value; render(); });
chips.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { state.cat = b.dataset.cat; render(); } });
sortSel.addEventListener('change', () => { state.sort = sortSel.value; render(); });
$('#clear').addEventListener('click', () => { state.q = ''; state.cat = 'all'; input.value = ''; render(); input.focus(); });
addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== input && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
});
render();
