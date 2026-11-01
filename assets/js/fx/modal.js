// BlackPhage - les fenêtres : le formulaire de contact (nom, prénom, activité, message) et la lecture d'un article.
import { t, number, LANG } from '../i18n.js';

const body = document.body;
let lastFocus = null;

function open(m) {
  lastFocus = document.activeElement;
  m.classList.add('is-open'); m.setAttribute('aria-hidden', 'false'); body.style.overflow = 'hidden';
  setTimeout(() => (m.querySelector('input, select, textarea, button, [href]') || m).focus({ preventScroll: true }), 80);
}
function close(m) {
  m.classList.remove('is-open'); m.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.modal.is-open')) body.style.overflow = '';
  lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
}

export function initModals(site) {
  const contact = document.getElementById('contact-modal');
  const reader = document.getElementById('reader');
  document.querySelectorAll('.modal').forEach((m) => {
    m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => close(m)));
    m.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = [...m.querySelectorAll('button, [href], input, select, textarea')].filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0]; const lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    });
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal.is-open').forEach(close); });

  // le contact
  const form = document.getElementById('contact-form'); const ok = document.getElementById('form-ok'); const wrap = document.getElementById('form-wrap');
  document.querySelectorAll('[data-open-contact]').forEach((b) => b.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    if (wrap) { wrap.hidden = false; ok.hidden = true; }
    open(contact);
  }));
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    let bad = 0;
    form.querySelectorAll('.field').forEach((f) => {
      const i = f.querySelector('input, select, textarea');
      const miss = !i.value.trim();
      f.classList.toggle('is-bad', miss); if (miss) bad++;
    });
    if (bad) { form.querySelector('.is-bad input, .is-bad select, .is-bad textarea')?.focus(); return; }
    const d = Object.fromEntries(new FormData(form));
    const act = form.querySelector('#f-act'); const actText = act.options[act.selectedIndex].textContent;
    const text = `${t('form_last')} / ${t('form_first')}\n${d.last.trim()} ${d.first.trim()}\n\n${t('form_activity')}\n${actText}\n\n${t('form_msg')}\n${d.message.trim()}\n`;
    const addr = site.email;
    document.getElementById('form-copy').value = text;
    wrap.hidden = true; ok.hidden = false;
    document.querySelectorAll('#form-ok [data-mail]').forEach((a) => { a.href = `mailto:${addr}`; a.textContent = addr; });
    // le lien mailto: ne s'ouvre pas partout : l'adresse et le texte à copier restent à l'écran
    try { location.href = `mailto:${addr}?subject=${encodeURIComponent(t('form_subject'))}&body=${encodeURIComponent(text)}`; } catch (err) { /* sans application de messagerie */ }
  });
  form?.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-bad'));
  document.getElementById('form-copy-btn')?.addEventListener('click', async (e) => {
    const ta = document.getElementById('form-copy');
    let done = false;
    try { await navigator.clipboard.writeText(ta.value); done = true; } catch (err) { ta.select(); try { done = document.execCommand('copy'); } catch (er) { /* rien */ } }
    const b = e.currentTarget; const old = b.textContent; b.textContent = t('copied');
    setTimeout(() => { b.textContent = t('form_copy'); }, done ? 1800 : 800);
  });

  // la lecture d'un article
  document.querySelectorAll('.acard').forEach((c) => c.addEventListener('click', () => {
    const i = c.dataset.article;
    document.getElementById('reader-tag').textContent = t(`a${i}_tag`);
    document.getElementById('reader-title').textContent = t(`a${i}_title`);
    document.getElementById('reader-meta').textContent = `${c.dataset.min} ${t('art_min')}`;
    const b = document.getElementById('reader-body'); b.textContent = '';
    for (let k = 1; k <= 8; k++) { const x = t(`a${i}_p${k}`); if (!x || x === `a${i}_p${k}`) break; const p = document.createElement('p'); p.textContent = x; b.appendChild(p); }
    reader.scrollTop = 0;
    open(reader);
  }));
}
