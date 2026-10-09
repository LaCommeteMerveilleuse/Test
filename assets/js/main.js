// BlackPhage — 3D scene. The complex (target surface + generated binder) is positioned from the layout:
// each `[data-stage]` element tells the scene where, how large and from which side to draw it while that
// element is on screen.
import * as THREE from 'three';
import { loadMolecule } from './molecule.js';
import { loadBinder } from './binder.js';
import { initViewer } from './viewer.js';

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('scene');
const stages = [...document.querySelectorAll('[data-stage]')];

function webgl2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

// How the complex is framed for each kind of stage.
const PRESETS = {
  hero: { extent: 'bound', roll: 2.9, yaw: -0.4, pitch: 0.25, sway: 0.30, margin: 1.3, mode: 'hero' },
  careers: { extent: 'bound', roll: 3.45, yaw: 0.45, pitch: 0.18, sway: 0.28, margin: 1.3, mode: 'hero' },
  viewer: { extent: 'all', roll: 0.0, sway: 0.10, margin: 1.02, mode: 'viewer' },
};

if (!stages.length) {
  // nothing to draw
} else if (!webgl2()) {
  root.classList.add('no-webgl');
  initViewer({ binder: null, mol: null });   // keep the interactive readouts alive without 3D
} else {
  start().catch((err) => { console.error(err); root.classList.add('no-webgl'); initViewer({ binder: null, mol: null }); });
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

  const [mol, binder] = await Promise.all([
    loadMolecule('assets/data/adk'),
    loadBinder('assets/data/binder.json'),
  ]);
  const data = binder.data;

  const complex = new THREE.Group();
  complex.add(mol.object, binder.group);
  const pivot = new THREE.Group();
  pivot.add(complex);
  scene.add(pivot);

  const viewer = initViewer({ binder, mol });

  // orientation: the view axes computed by tools/build_binder.py map onto the screen axes
  const ax = new THREE.Vector3(...data.view.x);
  const ay = new THREE.Vector3(...data.view.y);
  const az = new THREE.Vector3(...data.view.z);
  const qView = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(
    ax.x, ax.y, ax.z, 0, ay.x, ay.y, ay.z, 0, az.x, az.y, az.z, 0, 0, 0, 0, 1));
  const c0 = new THREE.Vector3(...data.centre);

  // label anchors: the top of the target, and the left-hand edge of the assembly
  const posAttr = mol.mesh.geometry.getAttribute('position');
  const targetAnchor = new THREE.Vector3();
  {
    let best = -Infinity;
    for (let i = 0; i < posAttr.count; i++) {
      const d = (posAttr.getX(i) - c0.x) * ay.x + (posAttr.getY(i) - c0.y) * ay.y + (posAttr.getZ(i) - c0.z) * ay.z;
      if (d > best) { best = d; targetAnchor.fromBufferAttribute(posAttr, i); }
    }
  }
  const clusterAnchor = new THREE.Vector3(...data.anchors.cluster).addScaledVector(ax, -38).addScaledVector(ay, 8);

  const zAxis = new THREE.Vector3(0, 0, 1);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const xAxis = new THREE.Vector3(1, 0, 0);

  const cur = { x: 0, y: 0, s: 0.001, cx: 0, cy: 0, opacity: 0, roll: 0.4 };
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
  const q1 = new THREE.Quaternion();
  const q2 = new THREE.Quaternion();
  const tmp = new THREE.Vector3();
  const clock = new THREE.Clock();
  let hidden = document.hidden;
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; });
  let introPlayed = false;

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

  const project = (v) => {
    tmp.copy(v);
    complex.localToWorld(tmp);
    tmp.project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H };
  };

  if (viewer) viewer.onReplay(() => { if (!reduceMotion) binder.replay(); });
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

    let target = { x: cur.x, y: cur.y, s: cur.s, cx: cur.cx, cy: cur.cy, opacity: 0 };
    if (st) {
      const { r } = st;
      const ext = data.extent[preset.extent];
      const ew = ext.x[1] - ext.x[0];
      const eh = ext.y[1] - ext.y[0];
      const pxPerA = Math.min(r.width / (ew * preset.margin), r.height / (eh * preset.margin));
      target = {
        x: (((r.left + r.width / 2) - W / 2) / (H / 2)) * halfH,
        y: (-((r.top + r.height / 2) - H / 2) / (H / 2)) * halfH,
        s: pxPerA * (halfH / (H / 2)),
        cx: (ext.x[0] + ext.x[1]) / 2,
        cy: (ext.y[0] + ext.y[1]) / 2,
        opacity: Math.min(1, st.vis * 1.8),
      };
      binder.setMode(preset.mode);
      binder.setAggregation(preset.mode === 'viewer' && viewer ? viewer.aggregation : 0);
    }

    // first appearance: snap to the layout, then fade in
    if (cur.opacity < 0.01 && target.opacity > 0) {
      cur.x = target.x; cur.y = target.y; cur.s = target.s; cur.cx = target.cx; cur.cy = target.cy;
      if (preset) { cur.roll = preset.roll; qTarget.identity(); pivot.quaternion.copy(qView); }
    }
    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;
    cur.s += (target.s - cur.s) * k;
    cur.cx += (target.cx - cur.cx) * k;
    cur.cy += (target.cy - cur.cy) * k;
    cur.opacity += (target.opacity - cur.opacity) * (1 - Math.exp(-ui * 5));

    if (preset) {
      cur.roll += (preset.roll - cur.roll) * (1 - Math.exp(-ui * 2.5));
      const sway = preset.sway * Math.sin(t * 0.21);
      q1.setFromAxisAngle(zAxis, cur.roll);
      qTarget.copy(qView).premultiply(q1);
      q2.setFromAxisAngle(yAxis, sway + mouse.x * 0.16 + (preset.yaw || 0));
      qTarget.premultiply(q2);
      q2.setFromAxisAngle(xAxis, mouse.y * 0.10 + 0.04 * Math.sin(t * 0.17) + (preset.pitch || 0));
      qTarget.premultiply(q2);
      pivot.quaternion.slerp(qTarget, 1 - Math.exp(-ui * 3));
    }

    // the generation plays once, when the first stage appears
    if (!introPlayed && cur.opacity > 0.55) {
      introPlayed = true;
      if (!reduceMotion) binder.replay();
    }

    mol.update(t, dt);
    binder.update(clock.elapsedTime, ui, reduceMotion);

    // keep the rotation centre on the middle of the framed extent
    complex.position.copy(c0).addScaledVector(ax, cur.cx).addScaledVector(ay, cur.cy).negate();
    pivot.position.set(cur.x, cur.y, 0);
    pivot.scale.setScalar(cur.s);
    pivot.updateMatrixWorld(true);

    const worldHalf = cur.s * 75;
    mol.setFog(DIST - worldHalf, DIST + worldHalf * 1.7);
    binder.setFog(DIST - worldHalf, DIST + worldHalf * 1.7);
    binder.setPointScale(renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2))), cur.s);

    canvas.style.opacity = cur.opacity.toFixed(3);
    renderer.render(scene, camera);

    if (viewer) {
      viewer.setGeneration(binder.generating);
      if (st && st.el.dataset.stage === 'viewer') {
        const an = binder.anchors();
        viewer.overlay({
          a: project(an.a), b: project(an.b), cluster: project(clusterAnchor), target: project(targetAnchor),
          u: binder.u, k: binder.k, pxPerAngstrom: ((H / 2) / halfH) * cur.s,
        });
      }
    }
  }
  frame();
}
