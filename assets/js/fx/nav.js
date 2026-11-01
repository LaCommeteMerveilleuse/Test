// BlackPhage - la navigation : l'indicateur qui suit le survol, la section courante, le menu plein écran.
const body = document.body;

export function initNav() {
  // la barre se voile en douceur quand le contenu défile dessous : le logo et les liens ne se superposent plus aux titres
  const bar = document.getElementById('nav');
  const stick = () => bar && bar.classList.toggle('is-stuck', scrollY > 40);
  addEventListener('scroll', stick, { passive: true }); stick();
  const pill = document.getElementById('nav-pill');
  const ind = pill && pill.querySelector('.nav__ind');
  const links = pill ? [...pill.querySelectorAll('a')] : [];
  let current = null;
  const place = (a) => {
    if (!a || !ind) { ind && ind.style.setProperty('--o', '0'); return; }
    ind.style.setProperty('--x', `${a.offsetLeft}px`); ind.style.setProperty('--w', `${a.offsetWidth}px`); ind.style.setProperty('--o', '1');
  };
  links.forEach((a) => {
    a.addEventListener('pointerenter', () => place(a));
    a.addEventListener('focus', () => place(a));
  });
  pill?.addEventListener('pointerleave', () => place(current));
  const setCurrent = (a) => { current = a; links.forEach((l) => l.classList.toggle('is-active', l === a)); place(a); };
  const aria = links.find((l) => l.hasAttribute('aria-current'));
  if (aria) setCurrent(aria);

  // la section visible allume son lien
  const ids = links.map((a) => (a.getAttribute('href') || '').split('#')[1]).filter(Boolean);
  const secs = ids.map((id) => document.getElementById(id)).filter(Boolean);
  if (secs.length && 'IntersectionObserver' in window) {
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
      let best = null; let bv = 0.12;
      seen.forEach((v, id) => { if (v > bv) { bv = v; best = id; } });
      const a = best ? links.find((l) => (l.getAttribute('href') || '').endsWith('#' + best)) : null;
      if (!aria) setCurrent(a || null);
    }, { threshold: [0, 0.12, 0.3, 0.5, 0.8] });
    secs.forEach((s) => io.observe(s));
  }
  addEventListener('resize', () => place(current));
  document.fonts && document.fonts.ready.then(() => place(current));

  // le menu
  const burger = document.getElementById('burger'); const menu = document.getElementById('menu');
  const set = (open) => {
    body.classList.toggle('menu-open', open);
    burger?.setAttribute('aria-expanded', String(open));
    menu?.setAttribute('aria-hidden', String(!open));
  };
  burger?.addEventListener('click', () => set(!body.classList.contains('menu-open')));
  menu?.querySelectorAll('a, button').forEach((el) => el.addEventListener('click', () => set(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  addEventListener('resize', () => { if (innerWidth > 1120) set(false); });
}
