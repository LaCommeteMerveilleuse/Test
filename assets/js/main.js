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
  scroll: 0,
  mouseX: 0,
  mouseY: 0,
};

if (webglAvailable()) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  // Coloured rim lights for a premium, cinematic read on a dark background.
  const key = new THREE.DirectionalLight('#ffffff', 1.4);
  key.position.set(3, 4, 5);
  const rimA = new THREE.DirectionalLight('#6d7bff', 2.2);
  rimA.position.set(-5, 2, -3);
  const rimB = new THREE.DirectionalLight('#ff5a8a', 1.4);
  rimB.position.set(4, -3, -4);
  scene.add(key, rimA, rimB, new THREE.AmbientLight('#20203a', 0.6));

  const pivot = new THREE.Group();
  scene.add(pivot);

  const { mesh, uniforms } = createProtein({ resolution: window.innerWidth < 700 ? 84 : 104 });
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

  // Scroll choreography: where the molecule sits for each section.
  const poses = {
    hero:     { x: 0.95, y: 0.0, s: 1.05, rx: 0.0 },
    mission:  { x: 0.0,  y: 0.0, s: 0.75, rx: 0.4 },
    programme:{ x: -1.25, y: 0.0, s: 0.8, rx: 0.8 },
    platform: { x: 1.25, y: 0.05, s: 0.85, rx: 1.2 },
    binders:  { x: 1.05, y: 0.0, s: 1.0, rx: 1.4 },
    journey:  { x: -1.3, y: 0.0, s: 0.7, rx: 1.9 },
    future:   { x: 0.0, y: 0.1, s: 0.9, rx: 2.4 },
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
    current.y += ((mob ? 0.55 : target.y) - current.y) * k;
    current.s += ((mob ? target.s * 0.8 : target.s) - current.s) * k;
    current.rx += (target.rx - current.rx) * k;

    state.open += (state.openTarget - state.open) * (1 - Math.pow(0.08, dt));

    uniforms.uTime.value = t * speed;
    uniforms.uOpen.value = state.open;

    pivot.position.set(current.x, current.y, 0);
    pivot.scale.setScalar(current.s);
    mesh.rotation.y = t * 0.08 * speed + current.rx + state.mouseX * 0.25;
    mesh.rotation.x = Math.sin(t * 0.15) * 0.12 * speed + state.mouseY * 0.15;
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
  const update = () => {
    const v = parseFloat(ph.value);
    // Illustrative model: exposure rises as the environment acidifies.
    const exposure = 1 / (1 + Math.exp((v - 6.8) * 6));
    state.openTarget = exposure;
    phValue.textContent = v.toFixed(1);
    phBar.style.setProperty('--x', `${Math.round(exposure * 100)}%`);
    phState.textContent = exposure > 0.6
      ? 'Site de liaison exposé — interaction recherchée'
      : exposure > 0.3 ? 'Transition conformationnelle' : 'Site de liaison masqué — veille';
    ph.style.setProperty('--fill', `${((v - ph.min) / (ph.max - ph.min)) * 100}%`);
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

document.getElementById('year').textContent = new Date().getFullYear();
