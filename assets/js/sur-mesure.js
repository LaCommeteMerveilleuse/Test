// BlackPhage - demande de création d'un Smart Binder pour une nouvelle cible, en trois étapes.
import { loadCatalogue, loadShop, searchProducts, esc, mailto, copyText, $, $$ } from './shop.js';

const [catalogue, shop] = await Promise.all([loadCatalogue(), loadShop()]);
const form = $('#customform');
const steps = $$('[data-step]', form);
const bars = $$('#stepper i');
let current = 0;

const params = new URLSearchParams(location.search);
let preset = params.get('cible') || '';
try { if (!preset) preset = sessionStorage.getItem('bp-cible') || ''; sessionStorage.removeItem('bp-cible'); } catch { /* ignoré */ }
if (preset) form.elements.cible.value = preset;

function go(n) {
  current = Math.max(0, Math.min(steps.length - 1, n));
  steps.forEach((s, i) => { s.hidden = i !== current; });
  bars.forEach((b, i) => b.classList.toggle('on', i <= current));
  $('#step-label').textContent = `Étape ${current + 1} sur ${steps.length}`;
  steps[current].querySelector('input:not([type=radio]), textarea, select')?.focus({ preventScroll: true });
}

// si la cible existe déjà, on le dit tout de suite
const hint = $('#exists');
function check() {
  const q = form.elements.cible.value.trim();
  const found = q.length >= 2 ? searchProducts(catalogue, q).slice(0, 2) : [];
  hint.hidden = found.length === 0;
  hint.innerHTML = found.length ? `<strong>Bonne nouvelle.</strong> Ce Smart Binder existe déjà, vous pouvez le commander tout de suite. ${found.map((p) => `<a class="link" href="produit.html#${p.id}">${esc(p.name)}</a>`).join(' ou ')}` : '';
}
form.elements.cible.addEventListener('input', check);
check();

function need(el, msg, test) {
  const good = test(el.value.trim());
  el.setAttribute('aria-invalid', String(!good));
  $(`#err-${el.name}`).textContent = good ? '' : msg;
  return good;
}

$$('[data-next]', form).forEach((b) => b.addEventListener('click', () => {
  if (current === 0 && !need(form.elements.cible, 'Indiquez la cible qui vous intéresse.', (x) => x.length > 1)) return;
  go(current + 1);
}));
$$('[data-back]', form).forEach((b) => b.addEventListener('click', () => go(current - 1)));

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const a = need(form.elements.nom, 'Indiquez votre nom.', (x) => x.length > 1);
  const b = need(form.elements.email, 'Indiquez une adresse e-mail valide.', (x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
  if (!a || !b) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
  const v = (n) => form.elements[n].value.trim();
  const usage = form.elements.usage.value || 'Non précisé';
  const text = `Bonjour,\n\nJe souhaite faire créer un Smart Binder sur mesure.\n\nCible ${v('cible')}\nUsage ${usage}\nQuantité souhaitée ${v('quantite')}\nÉchéance ${v('delai')}\n${v('msg') ? `\nPrécisions\n${v('msg')}\n` : ''}\nNom ${v('nom')}\nE-mail ${v('email')}\nOrganisation ${v('org') || 'non précisée'}\n\nMerci.`;
  const sent = $('#sent');
  sent.hidden = false;
  $('#sent-text').value = text;
  $('#sent-mail').href = mailto(shop.email, `Demande sur mesure pour ${v('cible')}`, text);
  $('#sent-to').textContent = shop.email;
  sent.scrollIntoView({ behavior: 'smooth', block: 'center' });
  location.href = $('#sent-mail').href;
});
$('#sent-copy').addEventListener('click', async () => {
  const ok = await copyText($('#sent-text').value, $('#sent-text'));
  $('#sent-copy').textContent = ok ? 'Texte copié' : 'Sélectionnez le texte puis copiez-le';
});
go(0);
