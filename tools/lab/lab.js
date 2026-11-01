// Le labo : montre une forme (ou le passage de l'une à l'autre) dans le vrai moteur de l'agent.
// ?a=2          la forme A (0 cerveau, 1 trois amas, 2 robot, 3 ruban arrimé, 4 flux, 5 grille)
// ?b=3&mix=0.5  la forme B et l'avancement du passage
// ?n=low        6 561 cubes au lieu de 59 049
// ?ry=0.4&rx=0.1 rotation, ?s=0.34 taille (part de la hauteur), ?level=2.5&bend=0.5 pour la grille, ?disperse=0.8&hx=0.5&hy=0.5 pour le curseur
// ?spin=1 fait tourner la forme, ?t=3 fige le temps
// ?m2=/tools/lab/variants/robot-1.js charge une variante à la place du module de la forme 2 (m0 à m4)
import { createAgent, GRID_HIGH, GRID_LOW } from '../../assets/js/agent/agent.js';
import { loadShapes, SHAPE_NAMES } from '../../assets/js/agent/shapes.js';

const q = new URLSearchParams(location.search);
const num = (k, d) => (q.has(k) ? +q.get(k) : d);
const canvas = document.getElementById('c');
const hud = document.getElementById('hud');
const G = q.get('n') === 'low' ? GRID_LOW : GRID_HIGH;
const n = G * G;
const dpr = Math.min(devicePixelRatio, q.has('dpr') ? +q.get('dpr') : 1.5);

const t0 = performance.now();
const overrides = {};
for (let k = 0; k < 5; k++) if (q.has('m' + k)) overrides[k] = new URL(q.get('m' + k), location.origin + '/').href;
const shapes = await loadShapes(n, 1, overrides);
const tShapes = performance.now() - t0;
const agent = createAgent({ canvas, n, shapes });
agent.resize(innerWidth, innerHeight, dpr);
window.__lab = { agent, shapes, ready: false };

const a = num('a', 0); const b = q.has('b') ? num('b', a) : a;
function draw(time) {
  const w = innerWidth; const h = innerHeight;
  const scale = num('s', 0.34) * Math.min(w, h * 1.4);
  const spin = q.has('spin') ? time * 0.4 : 0;
  const anc = { x: w / 2, y: h / 2, scale, rx: num('rx', 0.12), ry: num('ry', 0) + spin, rz: num('rz', 0) };
  const anc2 = { ...anc, x: w / 2 + num('bx', 0) * w, y: h / 2 + num('by', 0) * h, scale: scale * num('bs', 1), ry: num('bry', anc.ry) };
  agent.set({ a, b, mix: num('mix', 0), dust: num('dust', 1), time, anchorA: anc, anchorB: anc2, level: num('level', 0), bend: num('bend', 0),
    disperse: num('disperse', 0), hit: { x: w * num('hx', 0.5), y: h * num('hy', 0.5) }, radius: num('hr', 0.18) * Math.min(w, h), glow: num('glow', 0) });
  agent.render();
}
const frozen = q.has('t');
function loop(now) { draw(frozen ? num('t', 3) : now / 1000); if (!frozen || !window.__lab.ready) { window.__lab.ready = true; } if (!frozen) requestAnimationFrame(loop); }
requestAnimationFrame(loop);
hud.textContent = `${SHAPE_NAMES[a] || 'grille'} -> ${SHAPE_NAMES[b] || 'grille'}  mix ${num('mix', 0)}  n ${n}  formes ${tShapes.toFixed(0)} ms`;
addEventListener('resize', () => { agent.resize(innerWidth, innerHeight, dpr); if (frozen) draw(num('t', 3)); });
