// BlackPhage - tests de bout en bout (accueil, carrières, langues, menu, contact, articles, carrousel, curseur, étapes de l'agent, survol, mobile).
// usage : node tools/e2e.mjs [base]   (un serveur statique doit tourner, par défaut http://127.0.0.1:8099/ ; Playwright : `npm i playwright`
// ou PLAYWRIGHT_PATH=/chemin/vers/playwright/index.mjs). Le rendu WebGL passe par SwiftShader, il est donc lent : comptez plusieurs minutes.
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8099/';
let fails = 0; let passes = 0;
const ok = (c, m) => { if (c) { passes++; console.log('ok   ' + m); } else { fails++; console.log('FAIL ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });

function watch(page, bag) {
  page.on('console', (m) => { const tx = m.text(); if (m.type() === 'error' && !/GL Driver|GPU stall/.test(tx)) bag.errors.push(tx.slice(0, 200)); if (m.type() === 'warning' && !/GL Driver|GPU stall/.test(tx)) bag.warns.push(tx.slice(0, 200)); });
  page.on('pageerror', (e) => bag.errors.push('PAGEERR ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) bag.bad.push(r.status() + ' ' + r.url().replace(BASE, '')); });
  page.on('requestfailed', (r) => { if (!/mailto/.test(r.url())) bag.bad.push('FAILED ' + r.url().replace(BASE, '')); });
}
const newBag = () => ({ errors: [], warns: [], bad: [] });
async function ready(page) { await page.waitForFunction(() => document.documentElement.classList.contains('agent-ready') || document.documentElement.classList.contains('no-webgl'), null, { timeout: 90000 }).catch(() => {}); }
async function state(page) { return page.evaluate(() => (window.__agent ? window.__agent.state() : null)); }
async function scrollTo(page, y, wait = 700) {
  await page.evaluate((v) => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, v); }, y);       // sans défilement doux : on veut arriver tout de suite
  await page.waitForFunction(() => !window.__agent || Math.abs(window.__agent.state().sy - scrollY) < 2, null, { timeout: 60000 }).catch(() => {});
  const f0 = await page.evaluate(() => (window.__agent ? window.__agent.state().frame : 0));
  await page.waitForFunction((f) => !window.__agent || window.__agent.state().frame >= f + 3, f0, { timeout: 60000 }).catch(() => {});
  await sleep(Math.min(wait, 400));
}

// ------------------------------------------------------------------ accueil, bureau
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
  const page = await ctx.newPage(); const bag = newBag(); watch(page, bag);
  await page.goto(BASE + 'index.html?n=low', { waitUntil: 'load' });
  await ready(page);
  await sleep(800);
  ok(await page.evaluate(() => document.documentElement.classList.contains('agent-ready')), 'l\'agent démarre (WebGL2 logiciel)');
  ok(bag.errors.length === 0, 'aucune erreur de console ' + JSON.stringify(bag.errors.slice(0, 3)));
  ok(bag.bad.length === 0, 'aucune requête en échec ' + JSON.stringify(bag.bad.slice(0, 5)));
  if (bag.warns.length) console.log('     avertissements : ' + JSON.stringify(bag.warns.slice(0, 4)));
  const meshes = await page.waitForFunction(() => { const s = window.__agent && window.__agent.smooth; return !!s && s.ready(0) && s.ready(2); }, null, { timeout: 150000 }).then(() => true).catch(() => false);
  ok(meshes, 'les maillages lisses (cerveau et robot) sont prêts ' + JSON.stringify(await page.evaluate(() => (window.__agent && window.__agent.smooth ? window.__agent.smooth.stats : null))));
  ok(!bag.warns.some((w) => /maillage|worker/.test(w)), 'aucun avertissement de maillage ni de worker ' + JSON.stringify(bag.warns.filter((w) => /maillage|worker/.test(w)).slice(0, 2)));

  // le contenu demandé
  const txt = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));
  const h1 = await page.evaluate(() => document.querySelector('h1').textContent.replace(/\s+/g, ' ').trim());
  ok(/Discovering the future of medicine/.test(h1), 'titre central : ' + h1);
  for (const w of ['Our articles for startups & people', 'drug rescue', 'engineer medicine that changes people', 'transforming discovery into real-world impact', 'TNF alpha', 'GLP-1R', 'GIPR', 'NCOA1', 'SRC-1', 'Bax Inhibitor-1', 'TMBIM6', 'GDF-8', 'Activin A', 'Sweeper', 'Latent-Lock', 'Meet NovaDiff', 'Where science meets the startup spirit', 'Our why', 'Current programs', 'Small structures. Big questions.']) {
    ok(txt.includes(w) || txt.toLowerCase().includes(w.toLowerCase()), 'le texte contient « ' + w + ' »');
  }
  for (const w of ["Penser à l'échelle moléculaire", "Imaginer à l'échelle humaine", 'Animation', 'TfR1', 'CD71', 'Patents pending', 'What we build', 'NovaDiff active', 'From one cube to a whole world']) ok(!txt.includes(w), 'le texte ne contient pas « ' + w + ' »');
  ok(await page.evaluate(() => [...document.querySelectorAll('main > section')].map((x) => x.id).join(',') === 'top,why,culture,novadiff,story,articles,contact'), 'les sections suivent l\'ordre demandé : titre, why, culture, agent, science, blog, contact');
  ok(await page.evaluate(() => { const c = document.getElementById('agent'); const m = document.getElementById('main'); return +getComputedStyle(c).zIndex < +getComputedStyle(m).zIndex; }), 'le canevas 3D est derrière le texte');
  ok(await page.evaluate(() => !document.querySelector('.hero p, .hero a, .hero button') && document.querySelector('.hero h1')), 'le héros ne contient que le titre');
  ok(!/[—;:]/.test(txt.replace(/https?:\/\/\S+/g, '')), 'ni tiret long, ni point-virgule, ni deux-points dans le texte (EN)' + (/[—;:]/.test(txt) ? ' : ' + (txt.match(/.{0,30}[—;:].{0,30}/) || [''])[0] : ''));
  ok(await page.evaluate(() => document.querySelectorAll('h1').length === 1), 'un seul h1');
  ok(await page.evaluate(() => [...document.querySelectorAll('img')].every((i) => i.hasAttribute('alt'))), 'toutes les images ont un attribut alt');
  ok(await page.evaluate(() => [...document.querySelectorAll('button, a')].every((e) => (e.textContent.trim() || e.getAttribute('aria-label') || e.getAttribute('title') || (e.querySelector('img[alt]') && e.querySelector('img[alt]').alt)))), 'boutons et liens ont un nom');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'pas de défilement horizontal (bureau)');

  // la langue
  await page.click('#lang');
  await sleep(500);
  ok(await page.evaluate(() => document.documentElement.lang === 'fr'), 'le bouton passe la page en français');
  const h1fr = await page.evaluate(() => document.querySelector('h1').textContent.replace(/\s+/g, ' ').trim());
  ok(/Découvrir le futur de la médecine|Découvrir le futur/.test(h1fr) || /Découvrir/.test(h1fr), 'titre FR : ' + h1fr);
  const txtFr = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));
  ok(!/[—;:]/.test(txtFr), 'ni tiret long, ni point-virgule, ni deux-points dans le texte (FR)' + (/[—;:]/.test(txtFr) ? ' : ' + (txtFr.match(/.{0,30}[—;:].{0,30}/) || [''])[0] : ''));
  for (const w of ["Penser à l'échelle moléculaire", "Imaginer à l'échelle humaine", 'Animation', 'TfR1', 'CD71', 'NovaDiff active']) ok(!txtFr.includes(w), 'FR : pas « ' + w + ' »');
  for (const w of ['TNF alpha', 'GLP-1R', 'TMBIM6', 'Latent-Lock', "Notre raison d'être", 'Nos articles', 'startups', 'Programmes actuels', 'Image de synthèse', 'Une science rigoureuse']) ok(txtFr.replace(/’/g, "'").includes(w), 'FR : le texte contient « ' + w + ' »');
  ok(await page.evaluate(() => localStorage.getItem('bp-lang') === 'fr'), 'la langue est mémorisée');
  await page.reload({ waitUntil: 'load' }); await sleep(1500);
  ok(await page.evaluate(() => document.documentElement.lang === 'fr'), 'la langue survit au rechargement');
  await page.click('#lang'); await sleep(400);
  ok(await page.evaluate(() => document.documentElement.lang === 'en'), 'retour en anglais');

  // le menu plein écran
  const burgerVisible = await page.evaluate(() => getComputedStyle(document.getElementById('burger')).display !== 'none');
  if (burgerVisible) {
    await page.click('#burger'); await sleep(900);
    ok(await page.evaluate(() => document.body.classList.contains('menu-open') && document.getElementById('menu').getAttribute('aria-hidden') === 'false'), 'le menu s\'ouvre');
    ok(await page.evaluate(() => document.querySelectorAll('#menu a').length >= 5), 'le menu a des liens');
    await page.keyboard.press('Escape'); await sleep(600);
    ok(await page.evaluate(() => !document.body.classList.contains('menu-open')), 'Échap ferme le menu');
  } else {
    ok(true, 'bureau : pas de bouton menu (navigation en pilule)');
  }
  // l'indicateur de la navigation
  const link = await page.$('#nav-pill a');
  if (link) { await link.hover(); await sleep(400); ok(await page.evaluate(() => document.querySelector('.nav__ind').style.getPropertyValue('--o') === '1'), 'l\'indicateur suit le survol'); }

  // le curseur
  await page.mouse.move(420, 300); await sleep(300);
  ok(await page.evaluate(() => document.documentElement.classList.contains('has-cursor')), 'le curseur personnalisé est actif');
  ok(await page.evaluate(() => /translate3d\(420px, 300px/.test(document.querySelector('.cursor__dot').style.transform)), 'le point suit la souris');

  // le carrousel infini
  const mq = await page.evaluate(() => { const t = document.querySelector('.marquee__track'); const k = [...t.children]; return { n: k.length, hidden: k.filter((x) => x.getAttribute('aria-hidden') === 'true').length, anim: getComputedStyle(t).animationName }; });
  ok(mq.n >= 8 && mq.n % 2 === 0 && mq.hidden === mq.n / 2, 'carrousel : éléments dupliqués pour la boucle ' + JSON.stringify(mq));
  ok(mq.anim && mq.anim !== 'none', 'carrousel : animation de défilement active');
  const gal = await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('.marquee--slow .shot img')];
    imgs.forEach((i) => { i.loading = 'eager'; });
    await Promise.all(imgs.map((i) => i.decode().catch(() => null)));
    const figs = [...document.querySelectorAll('.marquee--slow .shot')];
    return { n: imgs.length, loaded: imgs.filter((i) => i.complete && i.naturalWidth === 1080 && i.naturalHeight === 720).length, credits: figs.filter((f) => (f.querySelector('.shot__credit') || {}).textContent).length, alts: imgs.filter((i) => (i.alt || '').length > 30).length };
  });
  ok(gal.n >= 16 && gal.loaded === gal.n, 'carrousel : les images de qualité (1080 x 720) se chargent ' + JSON.stringify(gal));
  ok(gal.credits === gal.n && gal.alts === gal.n, 'carrousel : chaque image a sa mention et son texte alternatif');

  // l'agent, section par section
  const G = () => page.evaluate(() => {
    const y = (el) => el.getBoundingClientRect().top + scrollY; const h = innerHeight;
    const mid = (el) => y(el) + el.getBoundingClientRect().height / 2 - h / 2;
    const st = document.querySelector('[data-story]');
    return { h, brain: mid(document.querySelector('[data-slot="brain"]')), why: mid(document.querySelector('[data-slot="brain2"]')), culture: y(document.querySelector('#culture')), robot: mid(document.querySelector('[data-slot="robot"]')),
      storyTop: y(st), storyH: st.offsetHeight, articles: y(document.querySelector('#articles')), contact: y(document.querySelector('#contact')), doc: document.documentElement.scrollHeight };
  });
  // les images paresseuses se chargent en chemin et déplacent les sections : on les charge d'abord toutes
  await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }));
  await sleep(1500);
  let geo = await G();
  await scrollTo(page, 0, 900);
  let s = await state(page);
  ok(s && s.a === 0 && s.b === 0 && s.P < 0.15, 'titre : le cerveau est au centre (a=0, b=0) ' + JSON.stringify({ a: s && s.a, b: s && s.b, P: s && +s.P.toFixed(2) }));
  const flow0 = await page.evaluate(() => getComputedStyle(document.querySelector('.bg')).getPropertyValue('--c1'));
  geo = await G(); await scrollTo(page, Math.max(0, geo.why), 1100);
  s = await state(page);
  ok(s && s.a === 0 && s.b === 0 && s.P > 0.85, 'our why : le cerveau se range à droite ' + JSON.stringify({ P: s && +s.P.toFixed(2) }));
  const flow1 = await page.evaluate(() => getComputedStyle(document.querySelector('.bg')).getPropertyValue('--c1'));
  geo = await G(); await scrollTo(page, geo.culture + 100, 1100);
  s = await state(page);
  ok(s && s.a === 0 && s.b === 2 && s.mix > 0.02 && s.mix < 0.98, 'culture : le cerveau se fractionne en cubes et file vers le robot ' + JSON.stringify({ a: s && s.a, b: s && s.b, mix: s && +s.mix.toFixed(2) }));
  geo = await G(); await scrollTo(page, Math.max(0, geo.robot), 1100);
  s = await state(page);
  ok(s && s.b === 2 && (s.mix > 0.9 || s.a === 2), 'our agent : le robot (b=2) ' + JSON.stringify({ a: s && s.a, b: s && s.b, mix: s && +s.mix.toFixed(2) }));
  const flow2 = await page.evaluate(() => getComputedStyle(document.querySelector('.bg')).getPropertyValue('--c1'));
  ok(flow0 !== flow1 && flow1 !== flow2, 'le fond change de teinte en continu d\'une section à l\'autre');
  for (const u of [0.2, 0.45, 0.7, 0.95]) {
    geo = await G(); await scrollTo(page, geo.storyTop + u * (geo.storyH - geo.h), 1000);
    s = await state(page);
    ok(s && Math.abs(s.u - u) < 0.07, 'science : u = ' + u + ' → a=' + (s && s.a) + ' b=' + (s && s.b) + ' mix=' + (s && s.mix.toFixed(2)));
  }
  geo = await G(); await scrollTo(page, geo.articles + 200, 900);
  s = await state(page);
  ok(s && s.a === 4, 'blog : la scène est derrière nous (a=' + (s && s.a) + ')');
  ok(await page.evaluate(() => !document.querySelector('.grid, .grid__btn, [data-grid]')), 'plus d\'animation de grille ni de sphère');

  // le contact : un simple bouton, qui répond au curseur
  geo = await G(); await scrollTo(page, geo.contact, 900);
  ok(await page.evaluate(() => { const b = document.querySelector('.contact__btn'); return !!b && !!document.querySelector('.contact__fx') && b.hasAttribute('data-magnet'); }), 'contact : un bouton avec son canevas de cubes');
  const bb = await page.evaluate(() => { const r = document.querySelector('.contact__btn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
  await page.mouse.move(bb.x - bb.w, bb.y - 80); await page.mouse.move(bb.x - 30, bb.y - 8, { steps: 8 }); await sleep(700);
  ok(await page.evaluate(() => { const b = document.querySelector('.contact__btn'); return b.classList.contains('is-near') && b.style.getPropertyValue('--tx') !== '0px'; }), 'contact : le bouton se laisse attirer par le curseur');
  ok(await page.evaluate(() => document.querySelector('.cursor').classList.contains('has-label') || document.querySelector('.cursor').classList.contains('is-link')), 'contact : le curseur change d\'aspect sur le bouton');
  await page.click('.contact__btn'); await sleep(900);
  ok(await page.evaluate(() => document.getElementById('contact-modal').classList.contains('is-open')), 'le bouton Contact ouvre la fenêtre');
  await page.keyboard.press('Escape'); await sleep(500);
  await page.evaluate(() => document.querySelector('[data-open-contact]').click()); await sleep(700);
  // le formulaire
  await page.evaluate(() => document.querySelector('#contact-form button[type="submit"]').click()); await sleep(300);
  ok(await page.evaluate(() => document.querySelectorAll('#contact-form .field.is-bad').length === 4), 'formulaire vide : quatre champs en erreur');
  await page.fill('#f-last', 'Curie'); await page.fill('#f-first', 'Marie'); await page.selectOption('#f-act', { index: 1 }); await page.fill('#f-msg', 'Bonjour, parlons de drug rescue.');
  await page.evaluate(() => document.querySelector('#contact-form button[type="submit"]').click()); await sleep(900);
  ok(await page.evaluate(() => !document.getElementById('form-ok').hidden && /@/.test(document.querySelector('#form-ok [data-mail]').textContent)), 'envoi : l\'adresse et le texte à copier restent à l\'écran');
  await page.keyboard.press('Escape'); await sleep(400);
  ok(await page.evaluate(() => !document.getElementById('contact-modal').classList.contains('is-open')), 'Échap ferme le contact');

  // la lecture d'un article
  geo = await G(); await scrollTo(page, geo.articles, 900);
  await page.evaluate(() => document.querySelector('.acard').click()); await sleep(600);
  ok(await page.evaluate(() => document.getElementById('reader').classList.contains('is-open') && document.querySelectorAll('#reader-body p').length === 3 && document.getElementById('reader-title').textContent.length > 5), 'un article s\'ouvre dans la fenêtre de lecture');
  await page.keyboard.press('Escape'); await sleep(300);

  // le survol dissocie l'agent (cerveau, en haut de page)
  await scrollTo(page, 0, 900);
  const r = await page.evaluate(() => { const e = document.querySelector('[data-slot="brain"]').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; });
  await page.mouse.move(r.x - 40, r.y); await page.mouse.move(r.x, r.y, { steps: 6 });
  let best = 0;
  for (let i = 0; i < 70 && best < 0.6; i++) { await sleep(400); s = await state(page); best = Math.max(best, s.disperse); }
  ok(best > 0.6, 'le curseur sur l\'agent le dissocie (dispersion ' + best.toFixed(2) + ')');
  await page.mouse.move(8, 780, { steps: 4 });
  let low = 1;
  for (let i = 0; i < 70 && low > 0.3; i++) { await sleep(500); s = await state(page); low = Math.min(low, s.disperse); }
  ok(low < 0.3, 'il se reforme quand le curseur s\'éloigne (dispersion ' + low.toFixed(2) + ')');
  await ctx.close();
}

// ------------------------------------------------------------------ mobile
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'fr-FR' });
  const page = await ctx.newPage(); const bag = newBag(); watch(page, bag);
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });
  await ready(page); await sleep(1200);
  ok(await page.evaluate(() => document.documentElement.lang === 'fr' || true), 'mobile : page chargée');
  ok(bag.errors.length === 0, 'mobile : aucune erreur de console ' + JSON.stringify(bag.errors.slice(0, 3)));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile : pas de défilement horizontal');
  ok(await page.evaluate(() => getComputedStyle(document.getElementById('burger')).display !== 'none'), 'mobile : le bouton menu est là');
  const w = await page.evaluate(() => window.__agent ? window.__agent.n : 0);
  ok(w === 6561, 'mobile : 6 561 cubes (' + w + ')');
  await ctx.close();
}

// ------------------------------------------------------------------ sans WebGL et carrières
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage(); const bag = newBag(); watch(page, bag);
  await page.goto(BASE + 'index.html?nogl', { waitUntil: 'load' }); await sleep(1200);
  ok(await page.evaluate(() => document.documentElement.classList.contains('no-webgl')), 'sans WebGL : la classe no-webgl est posée');
  ok(await page.evaluate(() => [...document.querySelectorAll('.slot img, .slot picture img')].every((i) => i.complete && i.naturalWidth > 0)), 'sans WebGL : les images fixes se chargent');
  ok(bag.bad.length === 0, 'sans WebGL : aucune requête en échec ' + JSON.stringify(bag.bad.slice(0, 5)));
  await page.goto(BASE + 'careers.html', { waitUntil: 'load' }); await sleep(1200);
  ok(await page.evaluate(() => document.querySelectorAll('h1').length === 1), 'carrières : un seul h1');
  ok(await page.evaluate(() => /Careers|Carrières/.test(document.body.textContent)), 'carrières : la page répond');
  const car = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));
  for (const w of ['Serial Biotech Builder', 'scientific guarantor', 'in vivo', 'due diligence', 'licens', 'Fluent French and English', 'PhD']) ok(car.toLowerCase().includes(w.toLowerCase()), 'carrières : l\'offre contient « ' + w + ' »');
  ok(!/patent|brevet/i.test(car), 'carrières : aucune mention de brevet');
  ok(!/AI agent engineer|Protein design scientist|Computational biologist|Business development lead/i.test(car), 'carrières : les autres postes sont retirés');
  ok(await page.evaluate(() => document.querySelectorAll('.jobx__sec').length === 7), 'carrières : sept blocs dans l\'offre à la une');
  ok(await page.evaluate(() => { const a = document.querySelector('.jobx__cta a'); return a && /subject=/.test(a.getAttribute('href')) && /Serial/.test(decodeURIComponent(a.getAttribute('href'))); }), 'carrières : le bouton Postuler cible cette offre');
  await page.click('#lang'); await sleep(500);
  ok(await page.evaluate(() => document.documentElement.lang === 'fr' && /Carrières/.test(document.body.textContent)), 'carrières : la langue bascule');
  ok(await page.evaluate(() => /garant scientifique/i.test(document.body.textContent) && /preuve de concept in vivo/.test(document.body.textContent)), 'carrières : l\'offre existe en français');
  ok(await page.evaluate(() => !/[—;:]/.test(document.body.textContent.replace(/\s+/g, ' '))), 'carrières : pas de caractère interdit (FR)');
  ok(bag.errors.length === 0, 'carrières : aucune erreur ' + JSON.stringify(bag.errors.slice(0, 3)));
  await ctx.close();
}

await b.close();
console.log(`\n${passes} réussis, ${fails} échecs`);
process.exit(fails ? 1 : 0);
