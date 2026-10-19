// BlackPhage - scène partagée. Une seule boucle d'animation pour tout le site, sur le modèle de useFrame
// de react-three-fiber. Chaque effet s'abonne avec useFrame(). La boucle s'arrête quand l'onglet est caché,
// suit le défilement et le pointeur, et baisse la qualité toute seule si l'appareil peine.

export const stage = {
  time: 0,            // secondes d'animation
  dt: 0,
  w: 0,
  h: 0,
  scroll: 0,          // défilement lissé, de 0 (haut) à 1 (bas)
  pointer: { x: 0, y: 0, px: -1e4, py: -1e4 },   // x et y entre -0.5 et 0.5, px et py en pixels
  quality: 1,         // 1 plein, puis 0.75, 0.5
  reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
};

// ?t=4.4 fige l'animation sur cet instant (captures d'écran, tests). C'est aussi l'image de « réduire les animations ».
const FROZEN = new URLSearchParams(location.search).get('t');
if (FROZEN !== null && !Number.isNaN(+FROZEN)) stage.reduce = true;
const STILL = FROZEN !== null && !Number.isNaN(+FROZEN) ? +FROZEN : 4.4;

const frames = new Set();
const watchers = new Set();

/** S'abonne à la boucle. Retourne la fonction de désabonnement. */
export function useFrame(fn) {
  frames.add(fn);
  start();
  return () => frames.delete(fn);
}

/** Appelé quand la taille ou la qualité change. */
export function onResize(fn) {
  watchers.add(fn);
  fn(stage);
  return () => watchers.delete(fn);
}

const notify = () => watchers.forEach((fn) => fn(stage));

function measure() {
  stage.w = innerWidth;
  stage.h = innerHeight;
  notify();
  redraw();
}

// Avec « réduire les animations », la boucle ne tourne pas. On redessine une image quand la page change.
let pending = false;
function redraw() {
  if (!stage.reduce || pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; frames.forEach((fn) => fn(stage)); });
}
addEventListener('resize', measure);
measure();

addEventListener('pointermove', (e) => {
  stage.pointer.x = e.clientX / Math.max(1, stage.w) - 0.5;
  stage.pointer.y = e.clientY / Math.max(1, stage.h) - 0.5;
  stage.pointer.px = e.clientX;
  stage.pointer.py = e.clientY;
}, { passive: true });
document.addEventListener('pointerleave', () => { stage.pointer.px = -1e4; stage.pointer.py = -1e4; });

// ------------------------------------------------------------------ boucle
let running = false;
let last = 0;
let slow = 0;
let smooth = 0;
const visible = { page: !document.hidden };
document.addEventListener('visibilitychange', () => { visible.page = !document.hidden; if (visible.page) last = 0; start(); });

function start() {
  if (stage.reduce) { redraw(); return; }
  if (running || !frames.size || !visible.page) return;
  running = true;
  requestAnimationFrame(tick);
}

function tick(now) {
  if (!visible.page || !frames.size) { running = false; return; }
  const dt = last ? Math.min((now - last) / 1000, 0.25) : 0.016;
  last = now;
  stage.dt = dt;
  if (!stage.reduce) stage.time += dt;

  const max = Math.max(1, document.documentElement.scrollHeight - stage.h);
  const target = Math.min(1, Math.max(0, scrollY / max));
  stage.scroll += (target - stage.scroll) * (1 - Math.exp(-dt * 4));

  // qualité adaptative : si la moyenne dépasse 34 ms pendant 1,5 seconde, on allège
  smooth = smooth ? smooth * 0.95 + dt * 0.05 : dt;
  slow = smooth > 0.034 ? slow + 1 : Math.max(0, slow - 2);
  if (slow > 90 && stage.quality > 0.5) {
    stage.quality = stage.quality > 0.75 ? 0.75 : 0.5;
    slow = 0; smooth = 0;
    document.documentElement.classList.add('perf-low');
    notify();
  }

  frames.forEach((fn) => fn(stage));
  requestAnimationFrame(tick);
}

if (stage.reduce) {
  stage.time = STILL;
  addEventListener('scroll', () => {
    stage.scroll = Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - stage.h));
    redraw();
  }, { passive: true });
}
