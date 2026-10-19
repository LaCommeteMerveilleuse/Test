// BlackPhage - page d'un programme. Le contenu vient de assets/data/programs.json, choisi par l'ancre (program.html#glp-1r).
// Une protéine de verre flotte dans l'eau à côté du titre (protein.js).
import { $, loadPrograms, loadSite, esc, ARROW } from './site.js';
import { L, t } from './i18n.js';
import { wireCopy } from './chrome.js';

const root = document.documentElement;
const box = $('#prog');
const BACK = '<svg class="arr arr--back" viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10H5M9.5 5l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function missing() {
  root.classList.add('prog-miss');
  document.title = `${t('not_found')} · BlackPhage`;
  box.innerHTML = `<section class="pagehead"><div class="container">
  <a class="back" href="pipeline.html">${BACK}${esc(t('back_pipeline'))}</a>
  <h1 class="h1">${esc(t('not_found'))}</h1><p class="lead">${esc(t('not_found_p'))}</p></div></section>`;
}

function view(p, site) {
  root.classList.remove('prog-miss');
  const name = L(p.name);
  document.title = `${name} · BlackPhage`;
  const subject = encodeURIComponent(t('mail_subject', { name }));
  const problems = (p.problems || []).map((x, i) => `<article class="prob glass reveal" style="--i:${i % 3}"><span class="mark-dot" aria-hidden="true"></span><h3>${esc(L(x.h))}</h3><p>${esc(L(x.p))}</p></article>`).join('');
  const answers = (p.answers || []).map((x, i) => `<article class="ans glass reveal" style="--i:${i % 2}"><span class="mark-dot mark-dot--gold" aria-hidden="true"></span><h3>${esc(L(x.h))}</h3><p>${esc(L(x.p))}</p></article>`).join('');
  const where = (p.where || []).map((x, i) => `<li class="reveal" style="--i:${i}"><span class="where__dot" aria-hidden="true"></span>${esc(L(x))}</li>`).join('');
  box.innerHTML = `
<section class="phero">
  <div class="container phero__grid">
    <div class="phero__copy">
      <a class="back" href="pipeline.html">${BACK}${esc(t('back_pipeline'))}</a>
      <p class="eyebrow">${esc(L(p.stage))}</p>
      <h1 class="phero__name">${esc(name)}</h1>
      <p class="phero__tag">${esc(L(p.tagline))}</p>
      <p class="phero__intro">${esc(L(p.intro))}</p>
      <dl class="facts">
        <div><dt>${t('h_area')}</dt><dd>${esc(L(p.area))}</dd></div>
        <div><dt>${t('h_stage')}</dt><dd>${esc(L(p.stage))}</dd></div>
        <div><dt>${t('h_status')}</dt><dd><span class="status">${esc(L(p.status))}</span></dd></div>
      </dl>
    </div>
    <div class="phero__art" aria-hidden="true"></div>
  </div>
</section>

<section class="sec sec--tight" id="problem">
  <div class="container">
    <div class="sec__head">
      <p class="eyebrow reveal">${esc(t('problem_eyebrow'))}</p>
      <h2 class="h2 reveal">${esc(t('problem_h2'))}</h2>
    </div>
    <div class="problems">${problems}</div>
  </div>
</section>

<section class="sec sec--tight" id="answer">
  <div class="container">
    <div class="sec__head">
      <p class="eyebrow eyebrow--gold reveal">${esc(t('answer_eyebrow'))}</p>
      <h2 class="h2 reveal">${esc(t('answer_h2'))}</h2>
    </div>
    <div class="answers">${answers}</div>
  </div>
</section>

<section class="sec sec--tight" id="where">
  <div class="container">
    <div class="sec__head">
      <p class="eyebrow reveal">${esc(t('where_eyebrow'))}</p>
      <h2 class="h2 reveal">${esc(t('where_h2'))}</h2>
    </div>
    <ul class="where">${where}</ul>
  </div>
</section>

<section class="sec end">
  <div class="container">
    <div class="end__in glass reveal">
      <h2 class="end__h end__h--sm">${esc(t('cta_h2'))}</h2>
      <p class="lead">${esc(t('cta_p', { name }))}</p>
      <div class="hero__cta">
        <a class="btn btn--light btn--lg" href="mailto:${esc(site.email)}?subject=${subject}">${esc(t('cta_btn'))}${ARROW}</a>
        <a class="btn btn--ghost btn--lg" href="pipeline.html">${esc(t('cta_all'))}</a>
      </div>
      <p class="mailrow"><a href="mailto:${esc(site.email)}?subject=${subject}">${esc(site.email)}</a><button class="copy" type="button" data-copy="${esc(site.email)}"></button></p>
    </div>
    <p class="disclaimer">${esc(L(p.disclaimer))}</p>
  </div>
</section>`;
  window.__observeReveals?.(box);
  wireCopy(box);
}

Promise.all([loadPrograms(), loadSite()]).then(([data, site]) => {
  const list = data.programs.filter((p) => p.detail);
  const render = () => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    const p = id ? list.find((x) => x.id === id) : list[0];
    if (p) view(p, site); else missing();
    scrollTo(0, 0);
  };
  render();
  addEventListener('hashchange', render);
  import('./protein.js').then((m) => m.initProtein()).catch((e) => { console.warn('protein', e); });
}).catch(() => { box.innerHTML = `<section class="pagehead"><div class="container"><p class="lead">${esc(t('error'))}</p></div></section>`; });
