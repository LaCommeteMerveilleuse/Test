// BlackPhage - page Pipeline. La liste vient de assets/data/programs.json : notre agent l'enrichit, la page suit.
import { $, loadPrograms, esc, ARROW } from './site.js';
import { LANG, L, t } from './i18n.js';

function row(p, i) {
  const linked = !!p.detail;
  const tag = linked ? 'a' : 'div';
  const href = linked ? ` href="program.html#${esc(p.id)}"` : '';
  return `<${tag} class="prow glass reveal${linked ? '' : ' prow--quiet'}"${href} style="--i:${i}">
  <div class="prow__name"><h2>${esc(L(p.name))}</h2><p>${esc(L(p.summary))}</p></div>
  <dl class="prow__facts">
    <div><dt>${t('h_area')}</dt><dd>${esc(L(p.area))}</dd></div>
    <div><dt>${t('h_stage')}</dt><dd>${esc(L(p.stage))}</dd></div>
    <div><dt>${t('h_status')}</dt><dd><span class="status${linked ? '' : ' status--quiet'}">${esc(L(p.status))}</span></dd></div>
  </dl>
  ${linked ? `<span class="prow__go">${t('view_program')}${ARROW}</span>` : ''}
</${tag}>`;
}

const box = $('#plist');
loadPrograms().then((d) => {
  box.innerHTML = d.programs.map(row).join('');
  window.__observeReveals?.(box);
  const meta = $('[data-updated]');
  if (meta && d.updated) {
    const date = new Intl.DateTimeFormat(LANG, { dateStyle: 'long' }).format(new Date(`${d.updated}T12:00:00`));
    meta.innerHTML = `<span class="dotlive" aria-hidden="true"></span>${esc(t('updated', { date }))}`;
  }
}).catch(() => { box.innerHTML = `<p class="note">${esc(t('error'))}</p>`; });
