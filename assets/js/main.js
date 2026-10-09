// BlackPhage — scene, scroll choreography and UI interactions.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createProtein } from './protein.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('scene');

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch (e) {
    return false;
  }
}

/* ---------------------------------------------------------------- 3D scene */
const state = {
  open: 0.3,          // current binding-site exposure (driven by pH)
  openTarget: 0.3,
  mouseX: 0,
  mouseY: 0,
};

if (webglAvailable()) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  // Coloured rim lights for a premium, cinematic read on a dark background.
  const key = new THREE.DirectionalLight('#ffffff', 0.95);
  key.position.set(3, 4, 5);
  const rimA = new THREE.DirectionalLight('#6d7bff', 1.7);
  rimA.position.set(-5, 2, -3);
  const rimB = new THREE.DirectionalLight('#ff5a8a', 1.1);
  rimB.position.set(4, -3, -4);
  scene.add(key, rimA, rimB, new THREE.AmbientLight('#20203a', 0.35));

  const pivot = new THREE.Group();
  scene.add(pivot);

  const { mesh, uniforms, pocket, updateSite } = createProtein({ resolution: window.innerWidth < 700 ? 84 : 104 });
  // Heading that brings the binding site round to face the camera.
  const faceOn = -Math.atan2(pocket.x, pocket.z);
  pivot.add(mesh);

  // Floating particles — "solvent" around the molecule.
  const pCount = 420;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const r = 1.6 + Math.random() * 3.2;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(Math.random() * 2 - 1);
    pPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pPos[i * 3 + 2] = r * Math.cos(ph);
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: '#9fb0ff', size: 0.018, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true,
  }));
  scene.add(particles);

  // Scroll choreography. `o` keeps the molecule from fighting with the text:
  // it only comes forward on the sections that are about the molecule itself.
  const poses = {
    hero:     { x: 1.25, y: 0.00, s: 1.05, rx: 0.0, o: 1.00 },
    mission:  { x: 1.30, y: 0.05, s: 0.70, rx: 0.4, o: 0.34 },
    programme:{ x: -1.70, y: 0.10, s: 0.55, rx: 0.8, o: 0.12 },
    platform: { x: 1.45, y: 0.05, s: 0.70, rx: 1.2, o: 0.20 },
    binders:  { x: 1.25, y: 0.00, s: 1.05, rx: faceOn, o: 1.00 },
    journey:  { x: 1.70, y: 0.10, s: 0.60, rx: 1.9, o: 0.10 },
    future:   { x: -1.55, y: 0.05, s: 0.65, rx: 2.4, o: 0.18 },
    cta:      { x: 0.00, y: 0.05, s: 0.95, rx: 2.8, o: 0.55 },
  };
  const target = { ...poses.hero };
  const current = { ...poses.hero };
  const isMobile = () => window.innerWidth < 900;

  const sections = [...document.querySelectorAll('[data-pose]')];
  const poseObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) Object.assign(target, poses[e.target.dataset.pose] || poses.hero);
    });
  }, { threshold: 0.35 });
  sections.forEach((s) => poseObserver.observe(s));

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('pointermove', (e) => {
    state.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const clock = new THREE.Clock();
  let visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const speed = reduceMotion ? 0.15 : 1;

    const k = 1 - Math.pow(0.04, dt);
    const mob = isMobile();
    current.x += ((mob ? 0 : target.x) - current.x) * k;
    current.y += ((mob ? 0.42 : target.y) - current.y) * k;
    current.s += ((mob ? target.s * 0.75 : target.s) - current.s) * k;
    current.rx += (target.rx - current.rx) * k;
    current.o += ((mob ? Math.min(target.o, 0.35) : target.o) - current.o) * k;
    canvas.style.opacity = current.o.toFixed(3);

    state.open += (state.openTarget - state.open) * (1 - Math.pow(0.08, dt));

    uniforms.uTime.value = t * speed;
    uniforms.uOpen.value = state.open;
    updateSite(state.open, t * speed);

    pivot.position.set(current.x, current.y, 0);
    pivot.scale.setScalar(current.s);
    // A slow sway rather than a full spin: the binding site stays readable.
    mesh.rotation.y = current.rx + Math.sin(t * 0.11 * speed) * 0.3 + state.mouseX * 0.25;
    mesh.rotation.x = Math.sin(t * 0.15 * speed) * 0.1 + state.mouseY * 0.15;
    particles.rotation.y = t * 0.012 * speed;
    particles.rotation.x = t * 0.006 * speed;

    renderer.render(scene, camera);
  }
  frame();
  document.documentElement.classList.add('webgl-ready');
} else {
  document.documentElement.classList.add('no-webgl');
}

/* ---------------------------------------------------------------- pH slider */
const ph = document.getElementById('ph');
if (ph) {
  const phValue = document.getElementById('ph-value');
  const phState = document.getElementById('ph-state');
  const phBar = document.getElementById('ph-exposure');
  const phPct = document.getElementById('ph-pct');
  const update = () => {
    const v = parseFloat(ph.value);
    // Illustrative model only: exposure rises as the environment acidifies.
    const exposure = 1 / (1 + Math.exp((v - 6.6) * 5));
    state.openTarget = exposure;
    phValue.textContent = v.toFixed(1);
    const pct = Math.round(exposure * 100);
    phBar.style.setProperty('--x', `${pct}%`);
    if (phPct) phPct.textContent = `${pct} %`;
    phState.textContent = exposure > 0.6
      ? 'Site de liaison exposé — interaction recherchée dans ces conditions.'
      : exposure > 0.3
        ? 'Transition conformationnelle — le site commence à s’ouvrir.'
        : 'Site de liaison masqué — la protéine reste en veille.';
    const min = parseFloat(ph.min);
    const max = parseFloat(ph.max);
    ph.style.setProperty('--fill', `${((v - min) / (max - min)) * 100}%`);
  };
  ph.addEventListener('input', update);
  update();
}

/* ---------------------------------------------------------------- reveal */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('is-in');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

/* ---------------------------------------------------------------- nav */
const nav = document.querySelector('.nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const burger = document.querySelector('.nav__burger');
burger?.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.nav__links a').forEach((a) => a.addEventListener('click', () => {
  nav.classList.remove('is-open');
  burger?.setAttribute('aria-expanded', 'false');
}));

/* ---------------------------------------------------------------- headline word cycle */
const cycle = document.querySelector('[data-cycle]');
if (cycle && !reduceMotion) {
  const words = cycle.dataset.cycle.split('|');
  let i = 0;
  setInterval(() => {
    i = (i + 1) % words.length;
    cycle.classList.add('is-out');
    setTimeout(() => {
      cycle.textContent = words[i];
      cycle.classList.remove('is-out');
    }, 380);
  }, 2600);
}

/* ---------------------------------------------------------------- sector filters */
const chips = [...document.querySelectorAll('.chip[data-filter]')];
if (chips.length) {
  const cards = [...document.querySelectorAll('#sectors-grid .sector')];
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    cards.forEach((card) => {
      const show = f === 'all' || card.dataset.kind === f;
      card.hidden = !show;
      if (show) card.classList.add('is-in');
    });
  }));
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
