// BlackPhage - en-tête, pied de page, menu mobile, compteur de commande, apparitions au défilement.
import { loadShop, cart, markSvg, $, $$ } from './shop.js';
import { LANG, t, otherLangHref } from './i18n.js';

const root = document.documentElement;
setTimeout(() => root.classList.add('reveal-fallback'), 3500);

const page = document.body.dataset.page || '';
const switchLink = (cls = '') => `<a class="langlink${cls}" href="${otherLangHref()}" hreflang="${LANG === 'en' ? 'fr' : 'en'}" lang="${LANG === 'en' ? 'fr' : 'en'}" aria-label="${t('lang_switch_label')}">${t('lang_switch')}</a>`;
const link = (href, label, key) => `<a href="${href}"${page === key ? ' aria-current="page"' : ''}>${label}</a>`;

const wordmark = '<span class="wordmark">BLACKPH<i class="lam"></i>GE</span>';

const header = $('#site-header');
if (header) {
  header.outerHTML = `<header class="nav" id="nav"><div class="container nav__in">
<a class="logo" href="index.html" aria-label="${t('home_aria')}">${markSvg()}<span>${wordmark}</span></a>
<button class="nav__burger" type="button" aria-label="${t('nav_menu')}" aria-expanded="false" aria-controls="nav-links"><span></span></button>
<nav class="nav__links" id="nav-links" aria-label="${t('nav_main')}">
${link('catalogue.html', t('nav_catalogue'), 'catalogue')}
${link('a-propos.html', t('nav_about'), 'a-propos')}
${link('careers.html', t('nav_careers'), 'carrieres')}
<a class="cartlink" href="panier.html"${page === 'panier' ? ' aria-current="page"' : ''}>${t('nav_order')} <span class="badge-count" data-n="0" aria-label="${t('nav_items')}">0</span></a>
${switchLink()}
<a class="btn btn--primary" href="sur-mesure.html">${t('nav_request')}</a>
</nav></div></header>`;
}

const footer = $('#site-footer');
if (footer) {
  footer.outerHTML = `<footer class="site-footer"><div class="container">
<div class="site-footer__top">
<div><a class="logo logo--stack" href="index.html" aria-label="${t('home_aria')}"><span style="display:flex;align-items:center;gap:12px">${markSvg()}${wordmark}</span><span class="tagline">Smart Binders</span></a>
<p class="muted" style="margin-top:16px;max-width:30ch">${t('foot_tagline')}</p></div>
<div><h4>${t('foot_shop')}</h4><ul><li><a href="catalogue.html">${t('nav_catalogue')}</a></li><li><a href="sur-mesure.html">${t('nav_request')}</a></li><li><a href="panier.html">${t('nav_order')}</a></li></ul></div>
<div><h4>${t('foot_company')}</h4><ul><li><a href="a-propos.html">${t('nav_about')}</a></li><li><a href="a-propos.html#questions">${t('foot_faq')}</a></li><li><a href="careers.html">${t('nav_careers')}</a></li></ul></div>
<div><h4>${t('foot_contact')}</h4><ul><li><a data-shop="mail" href="#"></a></li><li class="muted" data-shop="response"></li><li>${switchLink()}</li></ul></div>
</div>
<div class="legal"><span data-shop="research"></span><span>© ${new Date().getFullYear()} BlackPhage</span></div>
</div></footer>`;
}

loadShop().then((shop) => {
  $$('[data-shop="mail"]').forEach((a) => { a.textContent = shop.email; a.href = `mailto:${shop.email}`; });
  $$('[data-shop="mailhref"]').forEach((a) => { a.href = `mailto:${shop.email}`; });
  $$('[data-shop="mail-text"]').forEach((e) => { e.textContent = shop.email; });
  $$('[data-shop="response"]').forEach((e) => { e.textContent = t('reply_within', { x: shop.responseTime }); });
  $$('[data-shop="research"]').forEach((e) => { e.textContent = shop.researchOnly; });
  $$('[data-shop="delivery"]').forEach((e) => { e.textContent = shop.delivery; });
  $$('[data-shop="responseTime"]').forEach((e) => { e.textContent = shop.responseTime; });
}).catch(() => {});

// menu mobile
const nav = $('#nav');
if (nav) {
  const burger = $('.nav__burger', nav);
  const close = () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => { const o = nav.classList.toggle('is-open'); burger.setAttribute('aria-expanded', String(o)); });
  $$('.nav__links a', nav).forEach((a) => a.addEventListener('click', close));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// compteur de commande
const paint = () => $$('.badge-count').forEach((b) => { const n = cart.count(); b.textContent = n; b.dataset.n = n; b.setAttribute('aria-label', `${n} ${LANG === 'en' ? (n === 1 ? 'item' : 'items') : `article${n > 1 ? 's' : ''}`}`); });
paint();
cart.onChange(paint);

// apparitions
const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
}, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' }) : null;
export function observeReveals(scope = document) {
  $$('.reveal', scope).forEach((el) => { if (io) io.observe(el); else el.classList.add('is-in'); });
}
observeReveals();
window.__observeReveals = observeReveals;
