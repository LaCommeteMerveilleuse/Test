// BlackPhage - l'œuvre de l'accueil. Un enfant joue avec un grand poisson translucide qui nage dans l'air,
// couvert de vagues de bioluminescence. Le poisson suit le pointeur. Un clic sur lui lance une vague de lumière
// sur son corps, et l'enfant sursaute de joie. Au repos, le poisson vient de lui-même toucher le doigt de l'enfant.
// Rendu three.js, organisé comme une scène react-three-fiber : un Canvas, des objets, des useFrame.
// Sans WebGL, une image fixe prend le relais (voir site.css).
import * as THREE from 'three';
import { stage, useFrame, onResize } from './stage.js';
import { MIST_GLSL } from './mist.js';
import { buildFishGeometry, fishUniforms, fishMaterials } from './fish.js';
import { loadChildData, childUniforms, childMaterial, ChildRig, buildScarfGeometry, scarfUniforms, scarfMaterial } from './child.js';

const root = document.documentElement;
const canvas = document.getElementById('scene');
const BASE = root.dataset.base || '';

function webgl2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }
if (!canvas || !webgl2()) { root.classList.add('no-webgl'); } else { start().catch((e) => { console.warn('scene', e); root.classList.add('no-webgl'); }); }

// ------------------------------------------------------------------ composition
const FOV = 30;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const FISH_UNIT = 140;          // longueur du corps du poisson (museau à base de queue 0,78), en cm
const FISH_ABOVE = 0.50;        // ce que le poisson, nageoires déployées, dépasse au-dessus et au-dessous de son centre, en unités de corps
const FISH_BELOW = 0.66;
const FISH_Z = -14;             // le poisson nage un peu derrière l'enfant
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** Où tout se place pour un écran de ce format. Le sol est à y = 0, et l'horizon à la hauteur des pieds de l'enfant. */
function layout(aspect, kv) {
  const wide = aspect >= 1.15;
  const L = { wide };
  if (wide) {
    L.halfH = 193;                                      // l'enfant fait 29 % de la hauteur de l'écran
    L.halfW = L.halfH * aspect;
    L.horizon = 0.335;
    L.childX = 0.14 * Math.min(L.halfW, 193 * 1.78);
    L.fishScale = FISH_UNIT;
  } else {
    // en portrait, le texte occupe le haut de l'écran : l'œuvre tient dans la moitié basse, centrée (le sol à 16 %)
    L.halfH = Math.max(306, 128 / aspect);
    L.halfW = L.halfH * aspect;
    L.horizon = 0.16;
    L.childX = -57;
    L.fishScale = FISH_UNIT * 0.70;
  }
  // si les barres du navigateur cachent le bas du canevas, on cale la composition sur le haut, toujours visible
  L.horizon = (1 - kv) + L.horizon * kv;
  L.D = L.halfH / TAN;
  L.camY = L.halfH * (1 - 2 * L.horizon);
  L.fishPlane = { halfW: (L.D - FISH_Z) * TAN * aspect, halfH: (L.D - FISH_Z) * TAN };
  L.finger = new THREE.Vector3(L.childX + 0.5 + 46 * 0.97, 100, 0);
  L.zone = { xMin: L.childX + 60, xMax: L.halfW - L.fishScale * 0.12, yMin: L.fishScale * FISH_BELOW + 6, yMax: L.camY + L.halfH - L.fishScale * FISH_ABOVE - 6 };
  L.home = new THREE.Vector3(L.finger.x + L.fishScale * 0.52 + 22, Math.max(86, L.zone.yMin + 4), FISH_Z);
  return L;
}

// ------------------------------------------------------------------ fond de la scène
const SKY_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`;
const SKY_FRAG = `
uniform float uTime; uniform float uScroll; uniform float uAspect; uniform float uHero; uniform float uHorizon;
varying vec2 vUv;
${MIST_GLSL}
void main(){ gl_FragColor = vec4(bp_mist(vUv, uAspect, uTime, uScroll, uHero, uHorizon), 1.0); }`;

// ------------------------------------------------------------------ étincelles de lumière
const SPARK_VERT = `
attribute vec4 aData;   // x : taille, y : teinte, z : intensité
uniform float uPx;
varying float vA; varying float vH;
void main(){
  vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
  gl_PointSize = max(2.0, aData.x * uPx * 900.0 / -mv.z);
  vA = aData.z; vH = aData.y;
  gl_Position = projectionMatrix * mv;
}`;
const SPARK_FRAG = `
varying float vA; varying float vH;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0) discard;
  float a = 1.0 - smoothstep(0.0, 1.0, r); a = a * a * vA;
  vec3 c = mix(vec3(1.0, 0.58, 0.28), vec3(1.0, 0.38, 0.64), vH);
  gl_FragColor = vec4(mix(c, vec3(1.0, 0.95, 0.85), smoothstep(0.7, 1.0, vA) * 0.7) * a * 1.7, a);
}`;

// ------------------------------------------------------------------ passe finale : sol brillant et reflet, halo, grain
const FIN_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FIN_FRAG = `
uniform sampler2D tScene; uniform vec2 uRes; uniform float uTime; uniform float uHorizon; uniform float uAspect;
uniform vec3 uRip[4]; uniform float uDim; uniform float uMirror; uniform vec2 uFoot;
varying vec2 vUv;
${MIST_GLSL}
vec2 keep(vec2 uv){ return clamp(uv, vec2(0.001), vec2(0.999)); }
vec3 sampleScene(vec2 uv){ return texture2D(tScene, keep(uv)).rgb; }
// version floue de la scène (mipmaps) : sert de halo lumineux
vec3 halo(vec2 uv){ return texture2D(tScene, keep(uv), 3.0).rgb * 0.55 + texture2D(tScene, keep(uv), 5.0).rgb * 0.45; }
void main(){
  vec2 uv = vUv;
  float H = uHorizon;
  // ondes déclenchées par le pointeur
  vec2 wob = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 r = uRip[i];
    float age = uTime - r.z;
    if (age > 0.0 && age < 3.2) {
      vec2 d = (uv - r.xy) * vec2(uAspect, 1.0);
      float dist = length(d);
      float front = age * 0.30;
      float w = exp(-pow((dist - front) / 0.045, 2.0)) * (1.0 - age / 3.2) * 0.010;
      wob += normalize(d + 1e-4) * w;
    }
  }
  vec3 col = sampleScene(uv + wob);
  vec3 bloom = halo(uv);
  if (uv.y < H && uMirror > 0.001) {
    // sous la ligne : un sol brillant qui reflète la scène, en stries horizontales comme sur une eau à peine ridée
    float d = H - uv.y;
    float k = clamp(d / H, 0.0, 1.0);
    vec3 floorNear = vec3(0.250, 0.310, 0.520);
    vec3 floorFar = vec3(0.115, 0.135, 0.265);
    vec3 floorCol = mix(floorNear, floorFar, pow(k, 0.65));
    float nb = bp_vnoise(vec3(uv.x * 1.6, d * 26.0, uTime * 0.10));
    float bandId = floor(d * 118.0 + nb * 3.0);
    float jr = bp_hash(vec2(bandId, 17.3)) - 0.5;
    float xo = jr * (0.012 + 0.050 * k) + (bp_vnoise(vec3(uv.x * 9.0 + uTime * 0.2, d * 40.0, 2.0)) - 0.5) * 0.010 * (0.4 + k);
    float yo = (bp_vnoise(vec3(uv.x * 7.0 - uTime * 0.1, d * 60.0, 5.0)) - 0.5) * 0.008 * (0.4 + k);
    vec2 ruv = vec2(uv.x + xo, H + d * 1.10 + yo) + wob * 1.6;
    vec3 acc = vec3(0.0); float tot = 0.0;
    for (int i = -4; i <= 4; i++) {
      float fi = float(i);
      float wgt = exp(-fi * fi * 0.20);
      acc += sampleScene(ruv + vec2(fi * (0.0032 + 0.0060 * k), 0.0)) * wgt;
      tot += wgt;
    }
    vec3 refl = acc / tot;
    float fade = pow(1.0 - k, 0.95) * 0.82;
    vec3 mir = floorCol + refl * fade * 0.62;
    mir += vec3(0.34, 0.40, 0.62) * exp(-pow(d / 0.030, 2.0)) * 0.12;           // un reflet de brume juste sous l'horizon
    mir *= 1.0 - 0.42 * exp(-pow((uv.x - uFoot.x) / 0.045, 2.0)) * exp(-pow(d / 0.014, 2.0));   // l'ombre au pied de l'enfant
    col = mix(col, mir, uMirror);
    bloom = mix(bloom, halo(ruv) * fade, uMirror);
  }
  col += max(bloom - 0.40, 0.0) * 0.55;

  // la ligne d'horizon : un trait de lumière très doux
  float line = exp(-pow((uv.y - H) / 0.0030, 2.0));
  col += (vec3(0.66, 0.72, 0.95) * line * 0.22 + vec3(0.30, 0.37, 0.62) * exp(-pow((uv.y - H) / 0.030, 2.0)) * 0.06) * uMirror;

  // finition : vignette, courbe douce, grain
  vec2 vq = (uv - vec2(0.55, 0.5)) * vec2(uAspect * 0.62, 1.0);
  col *= 1.0 - (0.18 + 0.32 * uMirror) * smoothstep(0.30, 1.05, length(vq));
  col *= 1.0 - 0.28 * (1.0 - smoothstep(0.0, 0.30, uv.y)) * uMirror;                       // le bas s'enfonce dans l'ombre
  col = col / (1.0 + col * 0.14) * 1.08;
  col *= uDim;
  col += (bp_hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.022;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// ------------------------------------------------------------------ scène
async function start() {
  const childData = loadChildData(await (await fetch(`${BASE}assets/data/child.json`)).json());

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x14183a, 1);
  const rt = new THREE.WebGLRenderTarget(4, 4, { samples: 4, depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  rt.texture.colorSpace = THREE.NoColorSpace;

  const shared = {
    uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uAspect: { value: 1.6 }, uScroll: { value: 0 },
    uHero: { value: 1 }, uHorizon: { value: 0.335 }, uPx: { value: 1 }, uDim: { value: 1 }, uMirror: { value: 1 },
    uFoot: { value: new THREE.Vector2(0.57, 0.335) }, tScene: { value: rt.texture },
    uRip: { value: [new THREE.Vector3(-9, -9, -9), new THREE.Vector3(-9, -9, -9), new THREE.Vector3(-9, -9, -9), new THREE.Vector3(-9, -9, -9)] },
  };

  // décor
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: shared, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, depthTest: false, depthWrite: false }));
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  // l'enfant
  const cu = childUniforms();
  const child = new THREE.Mesh(childData.geometry, childMaterial(cu));
  child.frustumCulled = false;
  const rig = new ChildRig(childData, cu);
  scene.add(child);
  // son écharpe : deux pans qui flottent dans le vent, ancrés sur le buste
  const su = scarfUniforms(cu);
  const scarf = new THREE.Mesh(buildScarfGeometry(), scarfMaterial(su));
  scarf.frustumCulled = false;
  scene.add(scarf);

  // le poisson
  const fg = buildFishGeometry();
  const fu = fishUniforms();
  fu.uSeed.value = 3.7;
  const fm = fishMaterials(fu);
  const fish = new THREE.Group();
  fish.matrixAutoUpdate = false;
  const part = (geo, mat, order) => { const m = new THREE.Mesh(geo, mat); m.renderOrder = order; m.frustumCulled = false; fish.add(m); return m; };
  const mid = part(fg.mid, fm.fins, 11);
  const pecR = part(fg.right, fm.fins, 12);
  part(fg.body, fm.back, 13);
  part(fg.body, fm.front, 14);
  const pecL = part(fg.left, fm.fins, 15);
  part(fg.eyes, fm.eyes, 16);
  scene.add(fish);

  // étincelles : un petit réservoir de particules animées sur le processeur
  const SP = 160;
  const spPos = new Float32Array(SP * 3); const spData = new Float32Array(SP * 4);
  const spVel = new Float32Array(SP * 3); const spLife = new Float32Array(SP).fill(1); const spAge = new Float32Array(SP).fill(9);
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3).setUsage(THREE.DynamicDrawUsage));
  spGeo.setAttribute('aData', new THREE.BufferAttribute(spData, 4).setUsage(THREE.DynamicDrawUsage));
  const sparks = new THREE.Points(spGeo, new THREE.ShaderMaterial({ uniforms: shared, vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.frustumCulled = false; sparks.renderOrder = 20;
  scene.add(sparks);
  let spNext = 0;
  const emit = (p, n, speed, life) => {
    for (let i = 0; i < n; i++) {
      const k = spNext++ % SP;
      const a = Math.random() * Math.PI * 2; const b = (Math.random() - 0.3) * 1.2;
      const sp = speed * (0.35 + Math.random());
      spPos[k * 3] = p.x + (Math.random() - 0.5) * 6; spPos[k * 3 + 1] = p.y + (Math.random() - 0.5) * 6; spPos[k * 3 + 2] = p.z + (Math.random() - 0.5) * 6;
      spVel[k * 3] = Math.cos(a) * sp; spVel[k * 3 + 1] = Math.abs(Math.sin(b)) * sp * 0.8 + sp * 0.25; spVel[k * 3 + 2] = Math.sin(a) * sp * 0.5;
      spLife[k] = life * (0.6 + Math.random() * 0.8); spAge[k] = 0;
      spData[k * 4] = 1.2 + Math.random() * 2.2; spData[k * 4 + 1] = Math.random();
    }
  };

  // finale
  const fin = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: shared, vertexShader: FIN_VERT, fragmentShader: FIN_FRAG, depthTest: false, depthWrite: false }));
  fin.frustumCulled = false;
  const finScene = new THREE.Scene(); finScene.add(fin);
  const finCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const camera = new THREE.PerspectiveCamera(FOV, 1.6, 10, 4000);
  let L = layout(1.6, 1);

  function frame() {
    const aspect = stage.w / stage.h;
    L = layout(aspect, stage.vh / stage.h);
    camera.aspect = aspect;
    camera.position.set(0, L.camY, L.D);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    cu.uCam.value.copy(camera.position); fu.uCam.value.copy(camera.position);
    shared.uAspect.value = aspect; shared.uHorizon.value = L.horizon;
  }

  onResize((s) => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75) * s.quality);
    renderer.setSize(s.w, s.h, false);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    // si l'appareil peine, on abandonne le lissage des bords : c'est ce qui coûte le plus
    const samples = s.quality < 0.99 ? 0 : 4;
    if (rt.samples !== samples) { rt.samples = samples; rt.dispose(); }
    rt.setSize(size.x, size.y);
    shared.uRes.value.copy(size);
    shared.uPx.value = size.y / 900;
    frame();
  });

  // ---------------------------------------------------------------- le poisson : état, direction, clics
  const F = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), fwd: new THREE.Vector3(-1, 0.1, 0.2).normalize(),
    phase: 0, fin: 0, amp: 0.045, bend: 0, roll: 0, energy: 0, hover: 0, visited: false, lastYaw: 0,
  };
  const tmp = new THREE.Vector3(); const tmp2 = new THREE.Vector3(); const tmp3 = new THREE.Vector3();
  const nose = new THREE.Vector3();
  const tapAt = { t: -99 };               // dernier clic ou dernière visite, pour le sursaut de l'enfant
  let waveN = 0;

  /** Balade au repos, en fonction du temps seul : elle sert aussi à l'image fixe. Retourne la part de « visite » au doigt. */
  function idle(t, out) {
    const cyc = 11.5; const ph = (t % cyc) / cyc;
    const visit = smooth(0.50, 0.60, ph) * (1 - smooth(0.76, 0.88, ph));
    out.copy(L.home);
    out.x += Math.sin(t * 0.37) * 20 + Math.sin(t * 0.91) * 6;
    out.y += Math.sin(t * 0.53) * 15 + Math.cos(t * 0.71) * 5;
    out.z += Math.sin(t * 0.29) * 9;
    // la visite : le museau vient toucher le doigt
    tmp3.set(-1, 0.06, 0.16).normalize();
    tmp2.copy(L.finger).addScaledVector(tmp3, -L.fishScale * 0.5); tmp2.z = FISH_Z; tmp2.x += 8;
    out.lerp(tmp2, visit);
    return visit;
  }

  const waves = fu.uWave.value;
  function triggerWave(u0, v0, strength, t) {
    waves[waveN % 4].set(u0, t, strength, v0);
    waveN++;
    F.energy = Math.min(1.4, F.energy + 0.6 * strength);
  }

  // projection du poisson à l'écran, pour savoir s'il est sous le pointeur : des disques le long de son corps et de ses nageoires
  // [x, y, rayon, abscisse de la vague (0 museau, 1 queue), côté (1 dos, -1 ventre)], dans le repère du poisson
  const spine = [
    [0.40, 0.00, 0.11, 0.12, 0.0], [0.27, 0.00, 0.13, 0.30, 0.0], [0.12, 0.00, 0.13, 0.50, 0.0], [-0.04, 0.00, 0.12, 0.70, 0.0], [-0.20, 0.00, 0.09, 0.95, 0.0],
    [-0.40, 0.00, 0.20, 1.00, 0.0], [-0.58, -0.04, 0.24, 1.00, 0.0], [-0.58, 0.26, 0.17, 1.00, 0.4], [-0.60, -0.32, 0.17, 1.00, -0.4],
    [0.02, 0.24, 0.14, 0.50, 1.0], [-0.18, 0.21, 0.11, 0.80, 1.0], [-0.10, -0.22, 0.13, 0.70, -1.0], [-0.24, -0.20, 0.10, 0.90, -1.0], [0.18, -0.30, 0.10, 0.35, -1.0],
  ];
  const proj = spine.map(() => ({ x: 0, y: 0, r: 0 }));
  function updateProjection() {
    const pxPerUnit = stage.h / (2 * L.halfH) * (L.D / (L.D - F.pos.z));
    for (let i = 0; i < spine.length; i++) {
      tmp.set(spine[i][0], spine[i][1], 0).applyMatrix4(fish.matrix).project(camera);
      proj[i].x = (tmp.x * 0.5 + 0.5) * stage.w; proj[i].y = (0.5 - tmp.y * 0.5) * stage.h;
      proj[i].r = spine[i][2] * L.fishScale * pxPerUnit;
    }
  }
  function hitFish(px, py) {
    let best = -1; let bd = 1e9;
    for (let i = 0; i < proj.length; i++) {
      const d = Math.hypot(px - proj[i].x, py - proj[i].y) - proj[i].r;
      if (d < bd) { bd = d; best = i; }
    }
    return bd < 0 ? best : -1;
  }

  // ---------------------------------------------------------------- pointeur
  const ptr = { moved: -99, touch: false, over: false, rip: -1 };
  const interactive = 'a, button, input, textarea, select, summary, label, [role="button"]';
  addEventListener('pointermove', (e) => {
    ptr.moved = stage.time; ptr.touch = e.pointerType === 'touch';
    ptr.over = !!(e.target.closest && e.target.closest(interactive));
    // des rides sur le sol quand le pointeur le survole
    if (e.clientY / stage.h > 1 - L.horizon && stage.time - ptr.rip > 0.28) {
      ptr.rip = stage.time;
      const v = shared.uRip.value; v[Math.floor(stage.time * 3.7) % 4].set(e.clientX / stage.w, 1 - e.clientY / stage.h, stage.time);
    }
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    ptr.moved = stage.time; ptr.touch = e.pointerType === 'touch';
    ptr.over = !!(e.target.closest && e.target.closest(interactive));
    if (ptr.over || scrollY > stage.h * 0.7) return;
    updateProjection();
    const i = hitFish(e.clientX, e.clientY);
    if (i < 0) return;
    const t = stage.time;
    // l'endroit touché, déduit du disque le plus proche
    triggerWave(spine[i][3], spine[i][4], 1.0, t);
    tapAt.t = t; F.hover = 1;
    emit(tmp.set(spine[i][0], spine[i][1], 0).applyMatrix4(fish.matrix), 34, 70, 1.4);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.moved = -99; });

  // geste au clavier : un bouton caché, pour que tout le monde puisse toucher le poisson
  document.querySelectorAll('[data-fish-wave]').forEach((b) => b.addEventListener('click', () => {
    const t = stage.time; triggerWave(0.30, 0.0, 1.0, t); tapAt.t = t;
    emit(tmp.set(0.1, 0, 0).applyMatrix4(fish.matrix), 34, 70, 1.4);
  }));

  // ---------------------------------------------------------------- boucle
  let skip = 0; let last = 0; let first = true;
  const target = new THREE.Vector3(); const wantDir = new THREE.Vector3();
  const reachLocal = new THREE.Vector3(); const fishCenter = new THREE.Vector3();
  const basis = new THREE.Matrix4(); const sideV = new THREE.Vector3(); const upV = new THREE.Vector3(); const UP = new THREE.Vector3(0, 1, 0);

  useFrame((s) => {
    const t = s.time;
    const dt = first ? 0.016 : clamp(t - last, 0.001, 0.05); last = t;
    const sp = Math.min(2, scrollY / Math.max(1, s.h));
    const lift = smooth(0.0, 1.0, sp);
    const dim = smooth(0.10, 0.90, sp);
    const away = sp > 1.05;
    if (away && !s.reduce && (skip ^= 1)) return;
    child.visible = scarf.visible = fish.visible = sparks.visible = !away;
    shared.uDim.value = 1 - 0.30 * dim;
    shared.uHero.value = 1 - dim;
    shared.uMirror.value = 1 - smooth(0.45, 0.95, sp);
    shared.uTime.value = t;
    shared.uScroll.value = Math.min(1, sp * 0.3);
    fu.uTime.value = t; cu.uTime.value = t;
    const lyOff = lift * L.halfH * 1.25;                // l'œuvre monte quand la page défile
    const reduce = s.reduce;

    // ---- le poisson : où il va
    let visit = 0;
    if (reduce || first) { visit = idle(reduce ? t : 0, F.pos); F.vel.set(0, 0, 0); }
    const active = !reduce && (t - ptr.moved) < 3.2 && !ptr.over && sp < 0.6;
    if (!reduce) {
      if (active) {
        // le pointeur, projeté sur le plan du poisson, et borné à sa zone de jeu
        const px = (s.pointer.px / s.w * 2 - 1) * L.fishPlane.halfW;
        const py = L.camY + (1 - s.pointer.py / s.h * 2) * L.fishPlane.halfH;
        target.set(clamp(px, L.zone.xMin + L.fishScale * 0.45, L.zone.xMax), clamp(py, L.zone.yMin, L.zone.yMax), FISH_Z + Math.sin(t * 0.8) * 6);
      } else {
        visit = idle(t, target);
      }
      // la visite au doigt déclenche une vague et fait sursauter l'enfant
      if (visit > 0.96 && !F.visited) { F.visited = true; triggerWave(0.0, 0.0, 0.85, t); tapAt.t = t; }
      if (visit < 0.2) F.visited = false;
      // on file vers la cible, avec de l'inertie
      wantDir.copy(target).sub(F.pos);
      const speed = Math.min(150, wantDir.length() * 2.4);
      wantDir.normalize().multiplyScalar(speed);
      F.vel.lerp(wantDir, 1 - Math.exp(-2.4 * dt));
      F.pos.addScaledVector(F.vel, dt);
    }
    const speedNow = F.vel.length();

    // ---- le cap : le museau regarde l'enfant au repos, et où le poisson file quand le pointeur le mène
    const horSpeed = Math.hypot(F.vel.x, F.vel.z);
    if (!active) {
      wantDir.set(-1, 0.05, 0.36);
    } else if (horSpeed > 34) {
      // un combattant nage presque à plat : le tangage reste modéré, et un peu de face garde le volume
      const pitch = clamp(Math.atan2(F.vel.y, Math.max(horSpeed, 40)), -0.45, 0.45);
      wantDir.set(F.vel.x / horSpeed * Math.cos(pitch), Math.sin(pitch), F.vel.z / horSpeed * Math.cos(pitch) + 0.18);
    } else {
      wantDir.copy(F.fwd);                                                 // arrivé près du pointeur, il garde son cap
    }
    wantDir.normalize();
    if (reduce || first) F.fwd.set(-1, 0.07, 0.22 + 0.06 * Math.sin(t * 0.3)).normalize();
    else F.fwd.lerp(wantDir, 1 - Math.exp(-3.4 * dt)).normalize();
    F.fwd.z = clamp(F.fwd.z, -0.55, 0.65); F.fwd.normalize();
    // de face ou de dos, le tangage s'aplatit : sinon le poisson se dresse à la verticale à l'écran pendant un demi-tour
    F.fwd.y *= smooth(0.2, 0.65, Math.abs(F.fwd.x)); F.fwd.normalize();
    const yaw = Math.atan2(F.fwd.z, F.fwd.x);
    let dy = yaw - F.lastYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const yawRate = reduce || first ? 0 : dy / Math.max(dt, 1e-3);
    F.lastYaw = yaw;
    F.bend += (clamp(-yawRate * 0.07, -0.16, 0.16) - F.bend) * (1 - Math.exp(-4 * dt));
    F.roll += (clamp(-yawRate * 0.18, -0.5, 0.5) - F.roll) * (1 - Math.exp(-3 * dt));

    // ---- la nage et l'énergie de la lumière
    const sp01 = clamp(speedNow / 90, 0, 1);
    F.phase += dt * Math.PI * 2 * (0.75 + 1.5 * sp01);
    F.fin += dt * (2.0 + 1.5 * sp01);
    F.amp += ((0.040 + 0.045 * sp01) - F.amp) * (1 - Math.exp(-3 * dt));
    F.energy += ((0.12 + 0.55 * sp01 + 0.3 * visit) - F.energy) * (1 - Math.exp(-0.9 * dt));
    F.hover += (0 - F.hover) * (1 - Math.exp(-1.5 * dt));
    if (reduce) { F.phase = t * 4.0; F.fin = t * 2.4; F.amp = 0.05; F.bend = 0; F.roll = 0; F.energy = 0.45; }

    // la base du poisson : x = cap, y = haut, z = côté (z = x × y), avec un roulis autour du cap
    sideV.crossVectors(F.fwd, UP); if (sideV.lengthSq() < 1e-4) sideV.set(0, 0, 1); sideV.normalize();
    upV.crossVectors(sideV, F.fwd).normalize();
    const cr = Math.cos(F.roll); const sr = Math.sin(F.roll);
    tmp.copy(upV).multiplyScalar(cr).addScaledVector(sideV, sr);
    tmp2.copy(sideV).multiplyScalar(cr).addScaledVector(upV, -sr);
    basis.makeBasis(F.fwd, tmp, tmp2).scale(tmp3.setScalar(L.fishScale)).setPosition(F.pos.x, F.pos.y + lyOff, F.pos.z);
    fish.matrix.copy(basis);
    fish.matrixWorldNeedsUpdate = true;

    fu.uPhase.value = F.phase; fu.uSwimAmp.value = F.amp; fu.uBend.value = F.bend; fu.uEnergy.value = clamp(F.energy, 0, 1.3); fu.uHover.value = F.hover;
    fu.uFinPhase.value = F.fin; fu.uFlutter.value = 1.05 + 0.9 * sp01;
    // la nageoire pectorale du côté caméra passe devant le corps
    pecL.renderOrder = sideV.z > 0 ? 12 : 15; pecR.renderOrder = sideV.z > 0 ? 15 : 12;
    mid.renderOrder = 11;
    // pour l'image fixe : une vague en cours, au moment où le museau touche le doigt
    if (reduce) waves[0].set(0.0, t - 0.95, 0.9, 0.0);

    // ---- l'enfant : le bras vers le museau, la tête vers le poisson, un saut de joie quand on le touche
    nose.set(0.5, 0, 0).applyMatrix4(fish.matrix);
    fishCenter.set(-0.1, 0.0, 0).applyMatrix4(fish.matrix);
    child.position.set(L.childX, lyOff, 0);
    reachLocal.copy(nose).sub(child.position); reachLocal.z = 1;
    const dToFish = reachLocal.distanceTo(rig.shoulder);
    const reachAmt = clamp(1.2 - (dToFish - 55) / 150, 0.45, 1) * (1 - 0.35 * smooth(0.5, 1, sp));
    const lean = 0.03 + clamp((dToFish - 50) / 260, 0, 1) * 0.26;
    tmp.copy(fishCenter).sub(child.position); tmp.x -= rig.neck.x + 2; tmp.y -= 98;
    const lookYaw = clamp(Math.atan2(-tmp.z, tmp.x) * 0.5, -0.5, 0.5);
    const lookPitch = clamp(Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)) - 0.05, -0.2, 0.6);
    const age = t - tapAt.t;
    const hop = age > 0 && age < 0.7 ? Math.sin(Math.PI * age / 0.7) * 5.5 * Math.exp(-age * 1.2) : 0;
    const joy = age > 0 && age < 1.6 ? Math.exp(-age * 2.2) : 0;
    rig.pose({
      bounce: hop, lean: lean + 0.06 * joy, yaw: lookYaw, pitch: lookPitch + 0.12 * joy, twist: Math.sin(t * 0.4) * 0.03,
      sway: Math.sin(t * 0.33) * 0.02, swing: 0.10 + 0.07 * Math.sin(t * 0.6) + 0.5 * joy, reach: reachLocal, reachAmt,
    });
    cu.uFishPos.value.copy(fishCenter);
    cu.uGlow.value = clamp(0.30 + 0.55 * F.energy + 0.5 * joy + 0.4 * visit, 0, 1.6);
    // l'écharpe suit le buste ; le vent forcit quand le poisson file ou qu'un clic le fait vibrer, et un saut la soulève
    scarf.position.copy(child.position);
    su.uAnchor.value.copy(rig.mats[rig.idx.chest]);
    su.uWind.value = clamp(0.30 + 0.55 * sp01 + 0.40 * F.energy + 0.9 * joy, 0, 1.6);
    su.uLift.value = (hop / 5.5) * 0.7 + joy * 0.25;
    shared.uFoot.value.set((L.childX / L.halfW) * 0.5 + 0.5, L.horizon);

    // ---- les étincelles
    for (let i = 0; i < SP; i++) {
      if (spAge[i] >= spLife[i]) { spData[i * 4 + 2] = 0; continue; }
      spAge[i] += dt;
      const k = spAge[i] / spLife[i];
      spVel[i * 3] *= 1 - 0.8 * dt; spVel[i * 3 + 1] = spVel[i * 3 + 1] * (1 - 0.6 * dt) + 14 * dt; spVel[i * 3 + 2] *= 1 - 0.8 * dt;
      spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] += spVel[i * 3 + 1] * dt; spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
      spData[i * 4 + 2] = (1 - k) * smooth(0, 0.08, k) * (0.6 + 0.4 * Math.sin(t * 20 + i));
    }
    spGeo.attributes.position.needsUpdate = true; spGeo.attributes.aData.needsUpdate = true;
    if (visit > 0.9 && Math.random() < 0.25) emit(nose, 1, 30, 1.0);       // quelques braises pendant les visites au doigt

    // l'horizon et le sol suivent l'œuvre quand elle monte
    shared.uHorizon.value = L.horizon + lyOff / (2 * L.halfH);

    // curseur : une main quand le pointeur est sur le poisson
    if (!reduce && !away) { updateProjection(); root.classList.toggle('over-fish', !ptr.over && !ptr.touch && hitFish(s.pointer.px, s.pointer.py) >= 0); }

    first = false;
    // 1. la scène vers la cible
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    // 2. le sol, le reflet et les finitions vers l'écran
    renderer.setRenderTarget(null);
    renderer.render(finScene, finCam);
  });
  root.classList.add('webgl-ready');
}
