// BlackPhage — 3D scene. The molecule is positioned from the layout: each `[data-stage]` element
// tells the scene where, how large and in which orientation to draw it while that element is on screen.
import * as THREE from 'three';
import { loadMolecule } from './molecule.js';
import { initViewer } from './viewer.js';

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('scene');
const stages = [...document.querySelectorAll('[data-stage]')];

function webgl2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

// Orientation and behaviour of the molecule for each kind of stage.
const PRESETS = {
  hero: { euler: [0.32, -0.9, 0.08], spin: 0.05, fill: 1.3, hinge: 'auto' },
  careers: { euler: [-0.2, 0.7, -0.1], spin: 0.04, fill: 1.3, hinge: 'auto' },
  viewer: { face: true, spin: 0, fill: 1.2, hinge: 'ph' },
};

if (!stages.length) {
  // nothing to draw
} else if (!webgl2()) {
  root.classList.add('no-webgl');
  // keep the interactive readouts alive without 3D
  fetch('assets/data/adk.json').then((r) => r.json())
    .then((meta) => initViewer({ meta, setMode() {} }))
    .catch(() => {});
} else {
  start().catch((err) => { console.error(err); root.classList.add('no-webgl'); });
}

async function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.75 : 2));

  const scene = new THREE.Scene();
  const FOV = 28;
  const DIST = 9;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.set(0, 0, DIST);
  const halfH = DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  const mol = await loadMolecule('assets/data/adk');
  const pivot = new THREE.Group();
  pivot.add(mol.object);
  scene.add(pivot);

  const viewer = initViewer(mol);   // binds the pH controls when the page has them

  // orientation that brings the binding region face-on (open conformation)
  const faceQ = new THREE.Quaternion()
    .setFromUnitVectors(mol.anchorNormal, new THREE.Vector3(0, 0, 1))
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, -0.35, 0)));
  const yAxis = new THREE.Vector3(0, 1, 0);

  const cur = { x: 0, y: 0, s: 0.001, opacity: 0, closing: 0.3 };
  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  let W = 0;
  let H = 0;
  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const qTarget = new THREE.Quaternion();
  const qSpin = new THREE.Quaternion();
  const qMouse = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const tmp = new THREE.Vector3();
  const clock = new THREE.Clock();
  let hidden = document.hidden;
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; });

  /** The stage that covers most of the viewport right now, with its visible fraction. */
  function activeStage() {
    let best = null;
    let bestArea = 0;
    for (const el of stages) {
      const r = el.getBoundingClientRect();
      const w = Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0));
      const area = w * h;
      if (area > bestArea) { bestArea = area; best = { el, r, vis: area / Math.max(1, r.width * r.height) }; }
    }
    return best;
  }

  root.classList.add('webgl-ready');

  function frame() {
    requestAnimationFrame(frame);
    if (hidden) return;
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);          // animation step
    const ui = Math.min(raw, 0.25);          // layout-following step: stays correct on slow GPUs
    const t = clock.elapsedTime * (reduceMotion ? 0.2 : 1);
    const k = 1 - Math.exp(-ui * 5.5);

    const st = activeStage();
    const preset = st ? PRESETS[st.el.dataset.stage] || PRESETS.hero : null;

    let target = { x: cur.x, y: cur.y, s: cur.s, opacity: 0 };
    if (st) {
      const { r } = st;
      const small = W < 700 ? 0.84 : 1;
      const px = (Math.min(r.width, r.height) / 2) * preset.fill * small;
      target = {
        x: (((r.left + r.width / 2) - W / 2) / (H / 2)) * halfH,
        y: (-((r.top + r.height / 2) - H / 2) / (H / 2)) * halfH,
        s: (px / (H / 2)) * halfH,
        opacity: Math.min(1, st.vis * 1.8),
      };
    }

    // orientation target (slow spin + a little pointer parallax)
    if (preset) {
      if (preset.face) qTarget.copy(faceQ);
      else qTarget.setFromEuler(euler.set(...preset.euler));
      qTarget.premultiply(qSpin.setFromAxisAngle(yAxis, t * preset.spin));
      qTarget.premultiply(qMouse.setFromEuler(euler.set(mouse.y * 0.10, mouse.x * 0.18, 0)));
    }

    // hinge: driven by the pH when the viewer is on screen, otherwise a slow, shallow breathing motion
    const u = preset && preset.hinge === 'ph' && viewer ? viewer.closing : 0.30 + 0.22 * Math.sin(t * 0.32);

    // first appearance: snap to the layout, then fade in
    if (cur.opacity < 0.01 && target.opacity > 0) {
      cur.x = target.x; cur.y = target.y; cur.s = target.s; cur.closing = u;
      if (preset) pivot.quaternion.copy(qTarget);
    }
    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;
    cur.s += (target.s - cur.s) * k;
    cur.opacity += (target.opacity - cur.opacity) * (1 - Math.exp(-ui * 5));
    cur.closing += (u - cur.closing) * (1 - Math.exp(-ui * 4));
    if (preset) pivot.quaternion.slerp(qTarget, 1 - Math.exp(-ui * 3));

    mol.setClosing(cur.closing);
    mol.setProtonation(viewer ? viewer.protonation : 0.1);
    mol.update(t, dt);

    pivot.position.set(cur.x, cur.y, 0);
    pivot.scale.setScalar(cur.s);
    pivot.updateMatrixWorld(true);
    canvas.style.opacity = cur.opacity.toFixed(3);
    renderer.render(scene, camera);

    // overlays that depend on the 3D state (binding-site label, scale bar)
    if (viewer && st && st.el.dataset.stage === 'viewer') {
      const pxPerAngstrom = ((H / 2) / halfH) * cur.s * mol.unit;
      mol.vertexLocal(mol.anchor, tmp);
      mol.object.localToWorld(tmp);
      const toCam = camera.position.clone().sub(tmp).normalize();
      const nWorld = mol.anchorNormal.clone().applyQuaternion(pivot.quaternion);
      tmp.project(camera);
      viewer.overlay(null, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, nWorld.dot(toCam), pxPerAngstrom);
    }
  }
  frame();
}
