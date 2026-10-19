// BlackPhage - accueil : le programme phare reprend ce que dit assets/data/programs.json.
import { $, loadPrograms, esc, ARROW } from './site.js';
import { L } from './i18n.js';

loadPrograms().then((d) => {
  const lead = d.programs.find((p) => p.detail);
  const ul = $('[data-teaser]');
  if (!lead || !ul || !lead.teaser?.length) return;
  ul.innerHTML = lead.teaser.map((x) => `<li class="pair"><span class="pair__from">${esc(L(x.from))}</span>${ARROW}<span class="pair__to">${esc(L(x.to))}</span></li>`).join('');
}).catch(() => { /* le HTML déjà écrit reste */ });
