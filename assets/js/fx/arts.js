// BlackPhage - la rangée d'articles se fait défiler à la main : une flèche de chaque côté fait avancer d'une carte, la molette horizontale, le doigt, les
// flèches du clavier et le glissé à la souris fonctionnent aussi. Les flèches se grisent aux deux bouts. Rien ne défile tout seul.
export function initArts() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-arts]').forEach((box) => {
    const sc = box.querySelector('.arts__scroll');
    const prev = box.querySelector('[data-dir="-1"]');
    const next = box.querySelector('[data-dir="1"]');
    if (!sc || !prev || !next) return;
    const step = () => {
      const c = sc.querySelector('.acard');
      const gap = parseFloat(getComputedStyle(sc.firstElementChild).columnGap) || 20;
      return c ? c.getBoundingClientRect().width + gap : sc.clientWidth * 0.8;
    };
    const sync = () => {
      const max = sc.scrollWidth - sc.clientWidth;
      prev.disabled = sc.scrollLeft <= 2;
      next.disabled = sc.scrollLeft >= max - 2;
    };
    const go = (dir) => {
      // on avance d'une carte, ou de deux quand l'écran en montre au moins trois
      const n = sc.clientWidth > step() * 3.2 ? 2 : 1;
      sc.scrollBy({ left: dir * step() * n, behavior: reduce ? 'auto' : 'smooth' });
    };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    sc.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    sync();

    // le glissé à la souris (le doigt et le pavé tactile défilent déjà seuls) ; un glissé ne doit pas ouvrir la carte sous le curseur
    let down = false; let sx = 0; let sl = 0; let moved = 0;
    sc.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0; sx = e.clientX; sl = sc.scrollLeft;
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 6) { sc.classList.add('is-drag'); sc.scrollLeft = sl - dx; }
    }, { passive: true });
    const end = () => { if (!down) return; down = false; sc.classList.remove('is-drag'); };
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
    sc.addEventListener('click', (e) => { if (moved > 6) { e.stopPropagation(); e.preventDefault(); moved = 0; } }, true);
  });
}
