// Le labo du signal : montre la scène de signalisation (assets/js/agent/signal.js) sous un faux récepteur de repère.
// ?yaw=20&pitch=20      la caméra tourne autour de la cascade, en DEGRÉS (pitch 0 : de profil, > 0 : on regarde d'en haut, < 0 : d'en bas)
// ?active=0..1          la protéine G s'arrime (0 à 0.5), puis l'alpha file vers le premier nœud (0.5 à 1)
// ?cascade=0..1         les nœuds s'allument, l'impulsion descend, l'onde finale     ?show=0..1  le fondu
// ?t=3                  fige le temps (sinon il court)     ?ghost=1  un faux récepteur et la membrane pour se repérer
// ?q=1                  qualité du maillage     ?ty=-3.3&tx=0&d=13.5   point regardé (unités FRAME) et distance de la caméra
// ?cubes=0.6            superpose le flux de cubes (forme 4, shape-stream.js) au maillage, avec cette opacité : contrôle de la coïncidence
//                       (n=low pour 6 561 cubes ; ppu = pixels par unité, px et py = point du repère FRAME mis au centre ; la caméra est alors celle de l'agent)
import * as THREE from 'three';
import { createSignalScene } from '../../assets/js/agent/signal.js';
import { FRAME } from '../../assets/js/agent/frame.js';

const q = new URLSearchParams(location.search);
const num = (k, d) => (q.has(k) ? +q.get(k) : d);
const canvas = document.getElementById('c'); const hud = document.getElementById('hud');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setClearColor(0xffffff, 1);
renderer.setPixelRatio(Math.min(devicePixelRatio, q.has('dpr') ? +q.get('dpr') : 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 100);

const t0 = performance.now();
const sig = createSignalScene(THREE, { quality: num('q', 1) });
const tBuild = performance.now() - t0;
const frame = new THREE.Group();   // le repère FRAME : la scène du signal et les repères pâles ; en mode contrôle, il prend l'ancre de l'agent
frame.add(sig.group); scene.add(frame);

// mode contrôle : les cubes de l'agent par-dessus, avec la même ancre que le maillage
let agent = null; let anchor = null; let cubeCanvas = null;
if (q.has('cubes')) {
  const { createAgent, GRID_HIGH, GRID_LOW } = await import('../../assets/js/agent/agent.js');
  const { loadShapes } = await import('../../assets/js/agent/shapes.js');
  const G = q.get('n') === 'low' ? GRID_LOW : GRID_HIGH;
  const shapes = await loadShapes(G * G, 1, { 4: new URL(q.get('m4') || '/assets/js/agent/shape-stream.js', location.origin + '/').href });
  cubeCanvas = document.createElement('canvas'); cubeCanvas.style.cssText = `position:fixed;inset:0;width:100vw;height:100vh;display:block;opacity:${num('cubes', 0.6)};pointer-events:none`;
  document.body.appendChild(cubeCanvas);
  agent = createAgent({ canvas: cubeCanvas, n: G * G, shapes });
  camera.near = 1; camera.far = 80; camera.position.set(0, 0, 14); camera.lookAt(0, 0, 0);
  frame.matrixAutoUpdate = false;
}

if (q.get('ghost') === '1') {   // repères : la membrane (vue de profil) et le faisceau du récepteur, en pâle
  const g = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(FRAME.halfSize * 2, FRAME.thickness, FRAME.halfSize * 2), new THREE.MeshBasicMaterial({ color: 0xc8d1d3, transparent: true, opacity: 0.35, depthWrite: false }));
  g.add(slab);
  const mat = new THREE.MeshBasicMaterial({ color: 0x2a5f86, transparent: true, opacity: 0.35 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI * 2; const r = i === 6 ? 0 : FRAME.receptor.radius * 0.62;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, FRAME.receptor.top - FRAME.receptor.bottom, 14), mat);
    c.position.set(Math.cos(a) * r, (FRAME.receptor.top + FRAME.receptor.bottom) / 2, Math.sin(a) * r); g.add(c);
  }
  frame.add(g);
}

const params = () => ({ show: num('show', 1), active: num('active', 0), cascade: num('cascade', 0) });
const DEG = Math.PI / 180;
let state = params(); let pitch = num('pitch', 0) * DEG; let yaw = num('yaw', 0) * DEG;
const ty = num('ty', -3.3); const tx = num('tx', 0); const dist = num('d', num('dist', 13.5));
const frozen = q.has('t'); let tFix = num('t', 3);

const dpr = Math.min(devicePixelRatio, q.has('dpr') ? +q.get('dpr') : 1.5);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  if (agent) agent.resize(innerWidth, innerHeight, dpr);
}
function draw(time) {
  if (agent) {
    // la même ancre pour les deux : l'origine du repère FRAME placée de sorte que (px, py) tombe au centre de l'écran
    const ppu = num('ppu', 150); const px = num('px', 0.15); const py = num('py', -3.5);
    anchor = { x: innerWidth / 2 - px * ppu, y: innerHeight / 2 + py * ppu, scale: ppu, rx: pitch, ry: -yaw, rz: 0 };
    frame.matrix.copy(agent.anchorMatrix(anchor, new THREE.Matrix4())); frame.matrixWorldNeedsUpdate = true;
    agent.set({ a: 4, b: 4, mix: 1, dust: 0, time, anchorA: anchor, anchorB: anchor });
    agent.render();
  } else {
    const d = dist * (innerWidth / innerHeight < 0.62 ? 0.62 / (innerWidth / innerHeight) : 1);
    camera.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * d, ty + Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d);
    camera.lookAt(tx, ty, 0);
  }
  sig.setPose({ ...state, time });
  renderer.render(scene, camera);
}
resize();
addEventListener('resize', () => { resize(); if (frozen) draw(tFix); });
window.__sig = {
  sig, THREE, scene, camera, renderer,
  set(o) {
    if (o.yaw !== undefined) yaw = o.yaw * DEG; if (o.pitch !== undefined) pitch = o.pitch * DEG;
    for (const k of ['show', 'active', 'cascade']) if (o[k] !== undefined) state[k] = o[k];
    if (o.t !== undefined) tFix = o.t;
    draw(tFix);
  },
};
function loop(now) { draw(frozen ? tFix : now / 1000); window.__ready = true; if (!frozen) requestAnimationFrame(loop); }
requestAnimationFrame(loop);
const info = renderer.info;
hud.textContent = `signal  build ${tBuild.toFixed(0)} ms  show ${state.show}  active ${state.active}  cascade ${state.cascade}  yaw ${num('yaw', 0)}  pitch ${num('pitch', 0)}`;
setTimeout(() => { hud.textContent += `  triangles ${info.render.triangles}`; }, 400);
