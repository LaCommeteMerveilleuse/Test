// BlackPhage - fond de la page d'accueil : une petite molécule, et autour d'elle une protéine qui se génère
// par diffusion. Un nuage de points bruités se condense, le squelette apparaît, puis les hélices se forment.
// La scène boucle doucement et dérive pendant le défilement. Sans WebGL, une image fixe prend le relais.
import * as THREE from 'three';
import { Cartoon, makeCartoonMaterial } from './cartoon.js';

const root = document.documentElement;
const BASE = root.dataset.base || '';
const canvas = document.getElementById('bg');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webgl2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }
if (!canvas || !webgl2()) root.classList.add('no-webgl'); else start().catch(() => root.classList.add('no-webgl'));

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const gauss = (r) => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-9))) * Math.cos(2 * Math.PI * r());

// cycle de 20 secondes : génération, repos, retour au bruit
const CYCLE = { gen: 8.0, hold: 7.5, back: 3.2 };
function progressAt(time) {
  if (reduce) return 1;
  const u = time % (CYCLE.gen + CYCLE.hold + CYCLE.back);
  if (u < CYCLE.gen) return ease(u / CYCLE.gen);
  if (u < CYCLE.gen + CYCLE.hold) return 1;
  return 1 - ease((u - CYCLE.gen - CYCLE.hold) / CYCLE.back);
}

const ELEMENT = { C: { c: '#10205f', r: 0.62 }, N: { c: '#2f56d9', r: 0.62 }, O: { c: '#7fa6ff', r: 0.62 }, S: { c: '#f2b134', r: 0.85 } };

const ATOM_VERT = `
varying vec3 vN; varying vec3 vV; varying vec3 vC;
void main(){
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vV = mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  #ifdef USE_INSTANCING_COLOR
  vC = instanceColor;
  #else
  vC = vec3(1.0);
  #endif
  gl_Position = projectionMatrix * mv;
}`;
const ATOM_FRAG = `
varying vec3 vN; varying vec3 vV; varying vec3 vC;
uniform float uAlpha;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(-vV);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L1 = normalize(vec3(0.45, 0.65, 0.62)); vec3 L2 = normalize(vec3(-0.75, -0.10, 0.35));
  float d1 = clamp((dot(N, L1) + 0.35) / 1.35, 0.0, 1.0); float d2 = clamp(dot(N, L2) * 0.5 + 0.5, 0.0, 1.0);
  vec3 amb = mix(vec3(0.12, 0.12, 0.2), vec3(0.45, 0.52, 0.72), N.y * 0.5 + 0.5);
  vec3 lit = vC * (amb * 0.6 + vec3(1.0, 0.97, 0.94) * d1 * 1.1 + vec3(0.55, 0.62, 0.85) * d2 * 0.2);
  lit += vec3(pow(max(dot(N, normalize(L1 + V)), 0.0), 60.0) * 0.5);
  lit += vec3(0.5, 0.6, 1.0) * pow(1.0 - max(dot(N, V), 0.0), 2.6) * 0.2;
  lit = 1.0 - exp(-lit * 1.35);
  gl_FragColor = vec4(lit, uAlpha);
  #include <colorspace_fragment>
}`;
const POINT_VERT = `
attribute float aSize; uniform float uPx;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.5, aSize * uPx); gl_Position = projectionMatrix * mv; }`;
const POINT_FRAG = `
uniform float uAlpha; uniform float uMix;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
  float a = smoothstep(1.0, 0.2, r) * uAlpha;
  vec3 c = mix(vec3(0.62, 0.72, 0.97), vec3(0.18, 0.34, 0.90), uMix);
  gl_FragColor = vec4(c, a);
}`;

async function start() {
  const data = await (await fetch(`${BASE}assets/data/pocket.json`)).json();
  const n = data.n;
  const P0 = Float32Array.from(data.ca.flat());
  const O0 = Float32Array.from(data.o.flat());
  const ss = Uint8Array.from(data.ss);
  const P = new Float32Array(P0);
  const O = new Float32Array(O0);
  const amt = new Float32Array(n).fill(1);
  const col = new Float32Array(n * 3);
  const c0 = new THREE.Color(0.006, 0.025, 0.26);
  const c1 = new THREE.Color(0.10, 0.26, 0.86);
  const tmpc = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const w = 0.5 + 0.5 * Math.sin(data.t[i] * Math.PI * 6 - 0.8);          // alternance par hélice
    tmpc.copy(c0).lerp(c1, 0.18 + 0.7 * w);
    col[i * 3] = tmpc.r; col[i * 3 + 1] = tmpc.g; col[i * 3 + 2] = tmpc.b;
  }

  const scene = new THREE.Scene();
  const pivot = new THREE.Group();
  scene.add(pivot);

  // protéine
  const cartoon = new Cartoon(n, makeCartoonMaterial());
  cartoon.mesh.material.uniforms.uFog.value.set(1e3, 1e4);
  pivot.add(cartoon.mesh);

  // molécule en boules et bâtons
  const lig = data.ligand;
  const atomMat = new THREE.ShaderMaterial({ uniforms: { uAlpha: { value: 1 } }, vertexShader: ATOM_VERT, fragmentShader: ATOM_FRAG });
  const atoms = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 28, 20), atomMat, lig.el.length);
  const m4 = new THREE.Matrix4();
  const colr = new THREE.Color();
  lig.el.forEach((e, i) => {
    const d = ELEMENT[e] || ELEMENT.C;
    m4.makeScale(d.r, d.r, d.r).setPosition(...lig.xyz[i]);
    atoms.setMatrixAt(i, m4);
    atoms.setColorAt(i, colr.set(d.c).convertSRGBToLinear());
  });
  atoms.frustumCulled = false;
  const bondList = [];
  lig.bonds.forEach(([a, b, order]) => {
    const pa = new THREE.Vector3(...lig.xyz[a]);
    const pb = new THREE.Vector3(...lig.xyz[b]);
    const dir = pb.clone().sub(pa);
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0.3, 0.9, 0.2)).normalize().multiplyScalar(0.2);
    const offsets = order >= 2 ? [side.clone(), side.clone().negate()] : [new THREE.Vector3()];
    offsets.forEach((o) => bondList.push([pa.clone().add(o), pb.clone().add(o), a, b]));
  });
  const bonds = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true), atomMat, bondList.length);
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  bondList.forEach(([pa, pb, a, b], i) => {
    const mid = pa.clone().add(pb).multiplyScalar(0.5);
    const dir = pb.clone().sub(pa);
    const len = dir.length();
    q.setFromUnitVectors(up, dir.normalize());
    m4.compose(mid, q, new THREE.Vector3(0.2, len, 0.2));
    bonds.setMatrixAt(i, m4);
    bonds.setColorAt(i, colr.set('#3a4a8a').convertSRGBToLinear());
  });
  bonds.frustumCulled = false;
  pivot.add(atoms, bonds);

  // nuage de bruit
  const AMB = 140;
  const pp = new Float32Array((n + AMB) * 3);
  const sizes = new Float32Array(n + AMB);
  const rand = rng(77);
  const rnd = new Float32Array(n * 3).map(() => gauss(rand));
  const noiseO = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const x = gauss(rand); const y = gauss(rand); const z = gauss(rand); const l = Math.hypot(x, y, z) || 1; noiseO[i * 3] = x / l; noiseO[i * 3 + 1] = y / l; noiseO[i * 3 + 2] = z / l; }
  const hash = new Float32Array(n).map(() => rand());
  const ambDir = new Float32Array(AMB * 3);
  const ambR = new Float32Array(AMB);
  for (let j = 0; j < AMB; j++) { const x = gauss(rand); const y = gauss(rand); const z = gauss(rand); const l = Math.hypot(x, y, z) || 1; ambDir[j * 3] = x / l; ambDir[j * 3 + 1] = y / l; ambDir[j * 3 + 2] = z / l; ambR[j] = 0.3 + 0.7 * Math.cbrt(rand()); sizes[n + j] = 0.9 + 0.8 * rand(); }
  for (let i = 0; i < n; i++) sizes[i] = 2.1;
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3).setUsage(THREE.DynamicDrawUsage));
  pg.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const pointMat = new THREE.ShaderMaterial({ uniforms: { uPx: { value: 1 }, uAlpha: { value: 1 }, uMix: { value: 0 } }, vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true, depthWrite: false });
  const points = new THREE.Points(pg, pointMat);
  points.frustumCulled = false;
  pivot.add(points);
  const nph = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  const nsp = [0.9 + rand() * 0.6, 1.3 + rand() * 0.8, 1.9 + rand];
  nsp[2] = 1.9 + rand();
  const ndir = new Float32Array(9).map(() => gauss(rand));

  function diffuse(g, time) {
    let cx = 0; let cy = 0; let cz = 0;
    for (let i = 0; i < n; i++) { cx += P0[i * 3]; cy += P0[i * 3 + 1]; cz += P0[i * 3 + 2]; }
    cx /= n; cy /= n; cz /= n;
    const e1 = ease(clamp01((g - 0.14) / 0.78));
    const S = 0.28 + 0.72 * e1;
    const sigma = (1 - e1) * 11;
    const AMP = [1, 0.65, 0.4];
    for (let i = 0; i < n; i++) {
      const f = i / n;
      let nx = 0; let ny = 0; let nz = 0;
      for (let h = 0; h < 3; h++) {
        const sv = Math.sin(6.2832 * (h + 1) * f * 0.9 + nph[h] + nsp[h] * time) * AMP[h];
        nx += ndir[h * 3] * sv; ny += ndir[h * 3 + 1] * sv; nz += ndir[h * 3 + 2] * sv;
      }
      P[i * 3] = cx + (P0[i * 3] - cx) * S + nx * sigma;
      P[i * 3 + 1] = cy + (P0[i * 3 + 1] - cy) * S + ny * sigma;
      P[i * 3 + 2] = cz + (P0[i * 3 + 2] - cz) * S + nz * sigma;
      const a = smooth(0.50 + 0.22 * hash[i], 0.76 + 0.18 * hash[i], g);
      amt[i] = a;
      const ox = noiseO[i * 3] * (1 - a) + O0[i * 3] * a;
      const oy = noiseO[i * 3 + 1] * (1 - a) + O0[i * 3 + 1] * a;
      const oz = noiseO[i * 3 + 2] * (1 - a) + O0[i * 3 + 2] * a;
      const l = Math.hypot(ox, oy, oz) || 1;
      O[i * 3] = ox / l; O[i * 3 + 1] = oy / l; O[i * 3 + 2] = oz / l;
    }
    const sc = 22 * Math.pow(1 - smooth(0, 0.95, g), 1.3);
    for (let i = 0; i < n; i++) {
      const fl = 1 + 0.10 * Math.sin(time * 5 + i * 1.7);
      pp[i * 3] = P0[i * 3] + rnd[i * 3] * sc * fl;
      pp[i * 3 + 1] = P0[i * 3 + 1] + rnd[i * 3 + 1] * sc * fl;
      pp[i * 3 + 2] = P0[i * 3 + 2] + rnd[i * 3 + 2] * sc * fl;
    }
    const ra = 18 + 36 * (1 - smooth(0, 0.9, g));
    for (let j = 0; j < AMB; j++) {
      const rr = ra * ambR[j] * (1 + 0.08 * Math.sin(time * 2 + j));
      const p = (n + j) * 3;
      pp[p] = cx + ambDir[j * 3] * rr; pp[p + 1] = cy + ambDir[j * 3 + 1] * rr; pp[p + 2] = cz + ambDir[j * 3 + 2] * rr;
    }
    pg.attributes.position.needsUpdate = true;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0xffffff, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const FOV = 28;
  const DIST = 9;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);
  camera.position.set(0, 0, DIST);
  const halfH = DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  let W = 0; let H = 0;
  const resize = () => { W = innerWidth; H = innerHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize);
  resize();

  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX / W - 0.5; mouse.y = e.clientY / H - 0.5; }, { passive: true });

  const cur = { p: 0 };
  const clock = new THREE.Clock();
  let visible = !document.hidden;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
  let lastG = -1;

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.25);
    const time = clock.elapsedTime;
    const max = Math.max(1, document.documentElement.scrollHeight - H);
    cur.p += (Math.min(1, scrollY / max) - cur.p) * (1 - Math.exp(-dt * 4));
    const p = cur.p;

    const small = W < 820;
    const halfW = halfH * W / H;
    const s = (small ? 0.5 : 0.8) * halfH / data.radius * 1.0;
    pivot.scale.setScalar(s);
    pivot.position.set((small ? 0.18 : 0.52 - 0.5 * p) * halfW, (small ? 0.30 - 0.5 * p : 0.04 - 0.28 * p) * halfH, 0);
    pivot.rotation.set(0.38 + p * 0.7 + mouse.y * 0.12, -0.5 + p * 2.2 + (reduce ? 0 : time * 0.05) + mouse.x * 0.2, 0.1 - p * 0.4);

    const g = progressAt(time);
    if (g !== lastG) {
      lastG = g;
      if (g >= 1) {
        P.set(P0); O.set(O0); amt.fill(1);
        points.visible = false;
        cartoon.mesh.material.uniforms.uAlpha.value = 1;
      } else {
        P.set(P0);
        diffuse(g, time);
        points.visible = true;
        pointMat.uniforms.uAlpha.value = 1 - smooth(0.55, 0.97, g);
        pointMat.uniforms.uMix.value = smooth(0.15, 0.9, g);
        cartoon.mesh.material.uniforms.uAlpha.value = smooth(0.10, 0.34, g);
      }
      cartoon.update(P, O, ss, amt, col);
    } else if (g < 1) { diffuse(g, time); cartoon.update(P, O, ss, amt, col); }
    pointMat.uniforms.uPx.value = (renderer.domElement.height / (2 * halfH)) * s;
    renderer.render(scene, camera);
  }
  root.classList.add('webgl-ready');
  frame();
}
