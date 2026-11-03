// BlackPhage - le défilement infini des images de la culture. Le HTML ne contient qu'une seule série d'images (le texte n'est lu qu'une fois par les
// moteurs de recherche et les aperçus de liens) ; ce script la répète, en copies masquées aux lecteurs d'écran, jusqu'à remplir le plus grand écran,
// puis ajoute la seconde moitié qui boucle. Sans script, la rangée reste une bande qu'on fait défiler à la main.
export function initMarquees() {
  document.querySelectorAll('[data-marquee]').forEach((m) => {
    const track = m.querySelector('.marquee__track');
    if (!track || m.dataset.ready) return;
    const set = [...track.children];
    if (!set.length) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 20;
    const one = set.reduce((w, el) => w + el.getBoundingClientRect().width + gap, 0) || 1;
    const reps = Math.max(1, Math.ceil(4400 / one));          // une moitié plus large que le plus grand écran
    const copy = () => set.map((el) => { const c = el.cloneNode(true); c.setAttribute('aria-hidden', 'true'); return c; });
    for (let r = 1; r < reps; r++) copy().forEach((c) => track.appendChild(c));
    const half = [...track.children];
    half.forEach((el) => { const c = el.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
    m.dataset.ready = '1';
  });
}
