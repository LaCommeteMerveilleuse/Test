// BlackPhage - ma commande : récapitulatif et demande de devis par e-mail.
import { loadCatalogue, loadShop, cart, cartLines, money, esc, vial, mailto, copyText, $, $$ } from './shop.js';

const [catalogue, shop] = await Promise.all([loadCatalogue(), loadShop()]);
const listEl = $('#cartlist');
const form = $('#orderform');

function summaryText(lines, f) {
  const rows = lines.map((l) => `- ${l.product.name}, ${l.fmt.label} (${l.fmt.detail}), quantité ${l.qty}, ${money(l.total)}`);
  const total = lines.reduce((n, l) => n + l.total, 0);
  return `Bonjour,\n\nJe souhaite recevoir un devis pour la commande suivante.\n\n${rows.join('\n')}\n\nTotal estimé ${money(total)}\n\nNom ${f.nom}\nE-mail ${f.email}\nOrganisation ${f.org || 'non précisée'}\n${f.msg ? `\nMessage\n${f.msg}\n` : ''}\nMerci.`;
}

function render() {
  const lines = cartLines(catalogue);
  $('#empty-cart').hidden = lines.length > 0;
  $('#cartwrap').hidden = lines.length === 0;
  if (!lines.length) return;
  listEl.innerHTML = lines.map((l) => `<div class="line" data-id="${l.id}" data-f="${l.format}">
<a class="line__img" href="produit.html#${l.id}">${vial(l.product)}</a>
<div><h3><a href="produit.html#${l.id}">${esc(l.product.name)}</a></h3><small>${esc(l.fmt.label)}, ${esc(l.fmt.detail)}</small><br><button class="x" type="button" data-act="rm">Retirer</button></div>
<div class="qty" role="group" aria-label="Quantité"><button type="button" data-act="dec" aria-label="Moins">−</button><output>${l.qty}</output><button type="button" data-act="inc" aria-label="Plus">+</button></div>
<div class="price lineprice">${money(l.total)}</div></div>`).join('');
  const total = lines.reduce((n, l) => n + l.total, 0);
  $('#subtotal').textContent = money(total);
  $('#total').textContent = money(total);
  $('#nb').textContent = lines.reduce((n, l) => n + l.qty, 0);
}

listEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const row = b.closest('.line');
  const { id, f } = row.dataset;
  const cur = cart.items().find((x) => x.id === id && x.format === f);
  if (b.dataset.act === 'rm') cart.remove(id, f);
  if (b.dataset.act === 'inc') cart.setQty(id, f, cur.qty + 1);
  if (b.dataset.act === 'dec') cart.setQty(id, f, cur.qty - 1);
});
cart.onChange(render);

function fields() {
  const v = (n) => form.elements[n].value.trim();
  return { nom: v('nom'), email: v('email'), org: v('org'), msg: v('msg') };
}
function validate() {
  let ok = true;
  [['nom', (x) => x.length > 1, 'Indiquez votre nom.'], ['email', (x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x), 'Indiquez une adresse e-mail valide.']].forEach(([n, test, msg]) => {
    const el = form.elements[n];
    const good = test(el.value.trim());
    el.setAttribute('aria-invalid', String(!good));
    $(`#err-${n}`).textContent = good ? '' : msg;
    ok = ok && good;
  });
  return ok;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validate()) { (form.querySelector('[aria-invalid="true"]') || form).focus(); return; }
  const f = fields();
  const text = summaryText(cartLines(catalogue), f);
  const sent = $('#sent');
  sent.hidden = false;
  $('#sent-text').value = text;
  $('#sent-mail').href = mailto(shop.email, `Demande de devis de ${f.nom}`, text);
  $('#sent-to').textContent = shop.email;
  sent.scrollIntoView({ behavior: 'smooth', block: 'center' });
  location.href = $('#sent-mail').href;
});
$('#sent-copy').addEventListener('click', async () => {
  const ok = await copyText($('#sent-text').value, $('#sent-text'));
  $('#sent-copy').textContent = ok ? 'Texte copié' : 'Sélectionnez le texte puis copiez-le';
});
$('#clear-cart').addEventListener('click', () => cart.clear());
render();
