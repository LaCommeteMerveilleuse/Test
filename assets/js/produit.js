// BlackPhage - fiche produit.
import { t } from './i18n.js';
import { loadCatalogue, loadShop, cart, money, esc, vial, availabilityTag, productCard, mailto, toast, $, $$ } from './shop.js';

const [catalogue, shop] = await Promise.all([loadCatalogue(), loadShop()]);
const root = $('#product');

function show() {
  const id = decodeURIComponent(location.hash.slice(1));
  const p = catalogue.products.find((x) => x.id === id);
  if (!p) {
    document.title = t('not_found');
    root.innerHTML = `<div class="empty"><h1 style="font-size:1.8rem">${t('not_exist')}</h1><p>${t('find_or_custom')}</p><div class="buyrow"><a class="btn btn--primary" href="catalogue.html">${t('see_catalogue')}</a><a class="btn btn--ghost" href="sur-mesure.html">${t('request_target')}</a></div></div>`;
    return;
  }
  document.title = `${p.name} | BlackPhage`;
  const cat = catalogue.categories.find((c) => c.id === p.category);
  let fmt = p.formats.find((f) => f.id === 'standard') || p.formats[0];
  let qty = 1;

  root.innerHTML = `
<nav class="crumbs" aria-label="${t('crumbs')}"><a href="catalogue.html">${t('nav_catalogue')}</a><span>/</span><a href="catalogue.html?cat=${p.category}">${esc(cat.label)}</a><span>/</span><span>${esc(p.target)}</span></nav>
<div class="pdp">
  <div class="pdp__img">${vial(p)}</div>
  <div class="pdp__info">
    <div><span class="eyebrow">${esc(cat.label)}</span><h1 style="font-size:clamp(2rem,4vw,3rem)">${esc(p.name)}</h1></div>
    <p class="lead">${esc(p.summary)}</p>
    <div>${availabilityTag(p)}</div>
    <div>
      <h2 style="font-size:1.05rem;margin-bottom:12px">${t('choose_format')}</h2>
      <div class="formats" role="radiogroup" aria-label="${t('format')}">
        ${p.formats.map((f) => `<button type="button" class="format" role="radio" data-f="${f.id}" aria-checked="${f.id === fmt.id}">${f.id === 'standard' ? `<em>${t('our_advice')}</em>` : ''}<b>${esc(f.label)}</b><span>${esc(f.detail)}</span><i>${money(f.price)}</i></button>`).join('')}
      </div>
    </div>
    <div class="buyrow">
      <div class="qty" role="group" aria-label="${t('quantity')}"><button type="button" data-d="-1" aria-label="${t('less')}">−</button><output id="qty">1</output><button type="button" data-d="1" aria-label="${t('more')}">+</button></div>
      <button type="button" class="btn btn--primary btn--lg" id="add">${t('add_to_order')} <span id="addprice"></span></button>
    </div>
    <ul class="ticks">
      <li>${t('tick_delivery')} <span data-shop="delivery"></span></li>
      <li>${t('tick_question')} <span data-shop="responseTime"></span>.</li>
      <li>${t('tick_quote')}</li>
    </ul>
    <div>
      <h2 style="font-size:1.05rem;margin-bottom:12px">${t('ideal_for')}</h2>
      <ul class="ticks">${p.uses.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>
    </div>
    <p class="note">${esc(shop.researchOnly)}</p>
    <p><a class="link" href="${mailto(shop.email, t('q_subject', { n: p.name }), t('q_body', { n: p.name }))}">${t('ask_team')}</a></p>
  </div>
</div>
<section class="tight" style="padding-bottom:0"><div class="head"><h2>${t('same_world')}</h2></div><div class="grid grid--products" id="related"></div></section>`;

  const price = () => { $('#addprice').textContent = `(${money(fmt.price * qty)})`; };
  price();
  $$('.format', root).forEach((b) => b.addEventListener('click', () => {
    fmt = p.formats.find((f) => f.id === b.dataset.f);
    $$('.format', root).forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    price();
  }));
  $$('.qty button', root).forEach((b) => b.addEventListener('click', () => {
    qty = Math.max(1, Math.min(99, qty + Number(b.dataset.d)));
    $('#qty').textContent = qty; price();
  }));
  $('#add').addEventListener('click', () => {
    cart.add(p.id, fmt.id, qty);
    toast(t('added', { n: p.name }), 'panier.html', t('see_order'));
  });
  const related = catalogue.products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  $('#related').innerHTML = related.map((x) => productCard(x, catalogue)).join('');
  window.__observeReveals?.(root);
  document.querySelectorAll('[data-shop="delivery"]').forEach((e) => { e.textContent = shop.delivery; });
  document.querySelectorAll('[data-shop="responseTime"]').forEach((e) => { e.textContent = shop.responseTime; });
  scrollTo(0, 0);
}
addEventListener('hashchange', show);
show();
