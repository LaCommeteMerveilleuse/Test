// BlackPhage - l'œuvre de l'accueil. Deux mains de marbre sous l'eau cherchent à se toucher.
// Des rayons de lumière descendent de la surface, des caustiques glissent sur la pierre, et tout se reflète
// dans une eau noire en dessous. Rendu three.js, organisé comme une scène react-three-fiber :
// un Canvas, des objets, des useFrame. Sans WebGL, une image fixe prend le relais (voir site.css).
import * as THREE from 'three';
import { stage, useFrame, onResize } from './stage.js';
import { ABYSS_GLSL } from './abyss.js';

const root = document.documentElement;
const canvas = document.getElementById('scene');
const BASE = root.dataset.base || '';

function webgl2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }
if (!canvas || !webgl2()) { root.classList.add('no-webgl'); } else { start().catch((e) => { console.warn('hands', e); root.classList.add('no-webgl'); }); }

// ------------------------------------------------------------------ composition
const HORIZON = 0.185;          // ligne du miroir, en part de la hauteur depuis le bas
const TIP_Y = 0.325;            // hauteur des bouts de l'index, de la même façon
const CAM_FOV = 30;
const GAP = { near: 1.05, far: 3.2 };   // écart entre les deux index, en cm

// ------------------------------------------------------------------ matière des mains
const HAND_VERT = `
attribute float aAo; attribute float aTh;
varying vec3 vN; varying vec3 vW; varying float vAo; varying float vTh; varying vec3 vLocal;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vAo = aAo; vTh = aTh; vLocal = position;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const HAND_FRAG = `
uniform vec2 uRes; uniform float uTime; uniform float uAspect; uniform vec3 uCam; uniform float uFlare; uniform float uDim; uniform vec3 uSparkW;
varying vec3 vN; varying vec3 vW; varying float vAo; varying float vTh; varying vec3 vLocal;
${ABYSS_GLSL}
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vW);
  if (dot(N, V) < 0.0) N = -N;
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  float sh = bp_shafts(uv, uAspect, uTime);
  float ao = pow(clamp(vAo, 0.0, 1.0), 1.25);

  // lumière : l'eau éclaire par le haut, et les rayons sculptent la pierre
  vec3 L1 = normalize(vec3(-0.42, 0.82, 0.55));
  float dif = clamp((dot(N, L1) + 0.25) / 1.25, 0.0, 1.0);
  float hemi = 0.5 + 0.5 * N.y;
  float cau = bp_caustic(vW.xy * 0.46 + vec2(vW.z * 0.12, 0.0), uTime);
  // veines de marbre, très discrètes
  float vein = pow(1.0 - abs(bp_snoise(vLocal.xy * 0.30 + vLocal.z * 0.21 + 5.0)), 9.0);
  vec3 albedo = vec3(0.95, 0.92, 0.87) * (1.0 - 0.16 * vein);
  vec3 amb = (vec3(0.008, 0.026, 0.037) + vec3(0.026, 0.080, 0.108) * hemi) * (0.25 + 0.75 * ao);
  float beam = 0.03 + 2.90 * sh;
  vec3 keyCol = mix(vec3(0.46, 0.80, 1.0), vec3(1.0, 0.88, 0.66), smoothstep(0.30, 1.15, sh));
  vec3 key = keyCol * beam * dif * (0.74 + 0.38 * cau);
  vec3 col = albedo * (amb + key * mix(0.45, 1.0, ao));

  // translucidité : la pierre laisse passer une lueur chaude aux endroits fins, quand un rayon la traverse
  float thin = 1.0 - clamp(vTh * 1.25, 0.0, 1.0);
  col += vec3(1.0, 0.74, 0.46) * pow(thin, 3.0) * (0.06 + 1.10 * sh) * 0.46 * ao;

  // reflets de pierre mouillée
  vec3 H = normalize(L1 + V);
  float spec = pow(max(dot(N, H), 0.0), 90.0) * (0.10 + 1.60 * sh);
  float rim = pow(1.0 - ndv, 3.0);
  col += mix(vec3(0.92, 0.99, 1.0), vec3(1.0, 0.93, 0.78), smoothstep(0.5, 1.3, sh)) * spec * 1.0;
  col += vec3(0.30, 0.76, 0.90) * rim * (0.16 + 1.10 * sh) * 0.60;
  col += vec3(1.0, 0.82, 0.56) * pow(max(dot(N, normalize(vec3(0.3, 0.9, -0.3))), 0.0), 18.0) * cau * 0.16;

  // la lueur de l'étincelle sur le bout des doigts
  vec3 toS = uSparkW - vW;
  float dS = length(toS);
  float lit = uFlare * exp(-dS * dS / 10.0);
  col += vec3(1.0, 0.80, 0.52) * albedo * lit * (0.30 + 0.70 * max(dot(N, toS / max(dS, 1e-3)), 0.0)) * 1.5;

  // l'eau absorbe : plus bleue et plus sombre quand on s'éloigne vers le bas
  float yy = clamp(uv.y, 0.0, 1.0);
  col = mix(col * vec3(0.78, 0.92, 1.0), col, smoothstep(0.1, 0.8, yy));
  col *= uDim;
  gl_FragColor = vec4(col, 1.0);
}`;

// ------------------------------------------------------------------ fond de la scène
const BG_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`;
const BG_FRAG = `
uniform vec2 uRes; uniform float uTime; uniform float uScroll; uniform float uAspect; uniform float uHero;
varying vec2 vUv;
${ABYSS_GLSL}
void main(){
  vec2 uv = vUv;
  vec3 c = bp_abyss(uv, uAspect, uTime, uScroll, uHero);
  gl_FragColor = vec4(c, 1.0);
}`;

// ------------------------------------------------------------------ neige marine
const SNOW_VERT = `
attribute vec4 aSeed; uniform float uTime; uniform float uPx;
varying float vA; varying vec3 vW;
void main(){
  vec3 p = position;
  float t = uTime * (0.10 + 0.22 * aSeed.x);
  p.y = mod(p.y + t * 4.0 + 30.0, 60.0) - 30.0;
  p.x += sin(uTime * 0.2 + aSeed.y * 6.28) * 0.8;
  p.z += cos(uTime * 0.17 + aSeed.z * 6.28) * 0.8;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vW = p;
  gl_PointSize = max(1.4, (0.10 + 0.30 * aSeed.w) * uPx / -mv.z * 60.0);
  vA = 0.35 + 0.65 * aSeed.w;
  gl_Position = projectionMatrix * mv;
}`;
const SNOW_FRAG = `
uniform vec2 uRes; uniform float uTime; uniform float uAspect;
varying float vA; varying vec3 vW;
${ABYSS_GLSL}
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0) discard;
  vec2 uv = gl_FragCoord.xy / uRes;
  float sh = bp_shafts(uv, uAspect, uTime);
  float a = smoothstep(1.0, 0.0, r) * vA * (0.07 + 0.9 * sh);
  gl_FragColor = vec4(vec3(0.82, 0.97, 1.0) * a, a);
}`;

// ------------------------------------------------------------------ passe finale : reflet, rides, grain
const FIN_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FIN_FRAG = `
uniform sampler2D tScene; uniform vec2 uRes; uniform float uTime; uniform float uHorizon; uniform float uAspect;
uniform vec3 uRip[4]; uniform float uDim; uniform float uScroll; uniform vec3 uSpark; uniform float uMirror;
varying vec2 vUv;
${ABYSS_GLSL}
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
  vec3 col;
  vec3 bloom;
  // au-dessus du miroir : la scène, à peine ondulée
  vec2 o0 = vec2(bp_snoise(vec2(uv.x * 6.0, uv.y * 5.0 + uTime * 0.15)), bp_snoise(vec2(uv.x * 5.0 + 3.0, uv.y * 6.0 - uTime * 0.13))) * 0.0016;
  col = sampleScene(uv + o0 + wob);
  bloom = halo(uv);
  if (uv.y < H && uMirror > 0.001) {
    // sous la ligne : un sol d'eau noire qui reflète l'œuvre, brouillée et fondue vers l'obscurité
    float d = H - uv.y;
    float k = clamp(d / H, 0.0, 1.0);
    float amp = 0.004 + 0.020 * k;
    vec2 o = vec2(bp_snoise(vec2(uv.x * 7.0 + uTime * 0.10, uv.y * 24.0 - uTime * 0.40)) * amp,
                  bp_snoise(vec2(uv.x * 9.0 - uTime * 0.12, uv.y * 30.0 + uTime * 0.35)) * amp * 0.5);
    vec2 ruv = vec2(uv.x, H + d * 1.28) + o + wob * 1.8;
    vec3 acc = vec3(0.0);
    float tot = 0.0;
    for (int i = -3; i <= 3; i++) {
      float fi = float(i);
      float wgt = exp(-fi * fi * 0.28);
      acc += sampleScene(ruv + vec2(fi * 0.0035 * (0.4 + k), fi * 0.0060 * (0.3 + k * 1.8))) * wgt;
      tot += wgt;
    }
    vec3 refl = acc / tot;
    float fade = pow(1.0 - k, 0.85) * 0.80;
    vec3 floorCol = vec3(0.002, 0.008, 0.012) + vec3(0.010, 0.040, 0.055) * (1.0 - k);
    // petites rides lumineuses sur le sol
    float rides = bp_caustic(vec2(uv.x * uAspect * 3.2, uv.y * 8.0), uTime * 0.8) * 0.5 * (1.0 - k);
    // un voile de lumière qui glisse sur l'eau, plus fort sous les rayons
    float shf = bp_shafts(vec2(uv.x, H + d), uAspect, uTime);
    vec3 mir = floorCol + refl * fade + vec3(0.2, 0.6, 0.75) * rides * 0.10 + vec3(1.0, 0.86, 0.62) * shf * (1.0 - k) * 0.10;
    col = mix(col, mir, uMirror);
    bloom = mix(bloom, halo(ruv) * fade, uMirror);
  }
  col += max(bloom - 0.36, 0.0) * 0.50;

  // la ligne d'eau : un trait de lumière qui frémit
  float line = exp(-pow((uv.y - H) / 0.0042, 2.0));
  float sparkle = 0.55 + 0.45 * bp_snoise(vec2(uv.x * uAspect * 9.0 + uTime * 0.5, uTime * 0.3));
  col += (vec3(0.55, 0.88, 0.98) * line * sparkle * 0.42 + vec3(0.20, 0.52, 0.62) * exp(-pow((uv.y - H) / 0.045, 2.0)) * 0.10) * uMirror;

  // l'étincelle, là où les deux doigts se rejoignent
  vec2 sd = (uv - uSpark.xy) * vec2(uAspect, 1.0);
  float sr = length(sd);
  float core = exp(-sr * sr / 0.00010);
  float hal = exp(-sr * sr / 0.0030);
  float wide = exp(-sr * sr / 0.030);
  float stH = exp(-abs(sd.y) / 0.0030) * exp(-abs(sd.x) / 0.15);
  float stV = exp(-abs(sd.x) / 0.0030) * exp(-abs(sd.y) / 0.065);
  col += (vec3(1.0, 0.84, 0.58) * (core * 2.4 + hal * 0.55 + wide * 0.11) + vec3(1.0, 0.93, 0.82) * (stH * 0.55 + stV * 0.30)) * uSpark.z;

  // finition : vignette, courbe douce, grain
  vec2 vq = (uv - 0.5) * vec2(uAspect * 0.62, 1.0);
  col *= 1.0 - (0.14 + 0.44 * uMirror) * smoothstep(0.30, 1.05, length(vq));
  col = col / (1.0 + col * 0.18) * 1.12;
  col *= uDim;
  col += (bp_hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.020;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// ------------------------------------------------------------------ chargement des maillages
const dec64 = (s, Type) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Type(u.buffer); };

function buildHand(h, material) {
  const q = dec64(h.position, Int16Array);
  const pos = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) { const a = i % 3; pos[i] = h.min[a] + (q[i] + 32768) / 65535 * (h.max[a] - h.min[a]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(dec64(h.normal, Int8Array), 3, true));
  g.setAttribute('aAo', new THREE.BufferAttribute(dec64(h.ao, Uint8Array), 1, true));
  g.setAttribute('aTh', new THREE.BufferAttribute(dec64(h.thick, Uint8Array), 1, true));
  g.setIndex(new THREE.BufferAttribute(h.index32 ? dec64(h.index, Uint32Array) : dec64(h.index, Uint16Array), 1));
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, material);
  m.frustumCulled = false;
  return m;
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ scène
async function start() {
  const data = await (await fetch(`${BASE}assets/data/hands.json`)).json();
  const byName = Object.fromEntries(data.hands.map((h) => [h.name, h]));

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x02070a, 1);
  const rt = new THREE.WebGLRenderTarget(4, 4, { samples: 4, depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  rt.texture.colorSpace = THREE.NoColorSpace;

  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uAspect: { value: 1.6 }, uScroll: { value: 0 },
    uCam: { value: new THREE.Vector3(0, 0, 60) }, uFlare: { value: 0 }, uDim: { value: 1 },
    uSpark: { value: new THREE.Vector3(0.5, 0.4, 0) }, uSparkW: { value: new THREE.Vector3() }, uHero: { value: 1 }, uMirror: { value: 1 },
    uHorizon: { value: HORIZON }, uRip: { value: [new THREE.Vector3(-9, -9, -9), new THREE.Vector3(-9, -9, -9), new THREE.Vector3(-9, -9, -9), new THREE.Vector3(-9, -9, -9)] },
    uPx: { value: 1 }, tScene: { value: rt.texture },
  };

  // décor
  const scene = new THREE.Scene();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms, vertexShader: BG_VERT, fragmentShader: BG_FRAG, depthTest: false, depthWrite: false }));
  bg.frustumCulled = false; bg.renderOrder = -10;
  scene.add(bg);

  // mains
  const handMat = new THREE.ShaderMaterial({ uniforms, vertexShader: HAND_VERT, fragmentShader: HAND_FRAG, side: THREE.DoubleSide });
  const left = new THREE.Group(); const right = new THREE.Group();
  left.add(buildHand(byName.adam, handMat));
  right.add(buildHand(byName.maker, handMat));
  const world = new THREE.Group();
  world.add(left, right);
  scene.add(world);

  // neige marine
  const N = 900;
  const sp = new Float32Array(N * 3); const seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    sp[i * 3] = (Math.random() - 0.5) * 120; sp[i * 3 + 1] = (Math.random() - 0.5) * 60; sp[i * 3 + 2] = (Math.random() - 0.5) * 70 - 6;
    seed[i * 4] = Math.random(); seed[i * 4 + 1] = Math.random(); seed[i * 4 + 2] = Math.random(); seed[i * 4 + 3] = Math.pow(Math.random(), 2.2);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const snow = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms, vertexShader: SNOW_VERT, fragmentShader: SNOW_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  snow.frustumCulled = false;
  scene.add(snow);

  const camera = new THREE.PerspectiveCamera(CAM_FOV, 1.6, 1, 600);

  // passe finale
  const fin = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms, vertexShader: FIN_VERT, fragmentShader: FIN_FRAG, depthTest: false, depthWrite: false }));
  fin.frustumCulled = false;
  const finScene = new THREE.Scene(); finScene.add(fin);
  const finCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // cadrage : la caméra s'éloigne sur les écrans étroits pour garder les deux mains
  let halfH = 1;
  function frame() {
    const aspect = stage.w / stage.h;
    const needHalfW = aspect < 0.8 ? 17 : aspect < 1.2 ? 21 : 28.5;   // demi-largeur à montrer, en cm
    const dist = Math.max(52, needHalfW / (aspect * Math.tan(THREE.MathUtils.degToRad(CAM_FOV / 2)))) * 1.08;
    camera.aspect = aspect; camera.position.set(0, 0, dist); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    uniforms.uCam.value.copy(camera.position);
    halfH = dist * Math.tan(THREE.MathUtils.degToRad(CAM_FOV / 2));
    uniforms.uAspect.value = aspect;
  }

  onResize((s) => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75) * s.quality);
    renderer.setSize(s.w, s.h, false);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    rt.setSize(size.x, size.y);
    uniforms.uRes.value.copy(size);
    uniforms.uPx.value = size.y / 900;
    frame();
  });

  // le décor de la pose : roulis, inclinaison, position, jusqu'à ce que les index se fassent face
  const ROLL = THREE.MathUtils.degToRad(48);
  const adamTip = new THREE.Vector3(...byName.adam.tip);
  const makerTip = new THREE.Vector3(...byName.maker.tip);
  function place(group, tip, pitchDeg, rollRad, target, mirror) {
    group.rotation.set(0, 0, 0);
    const R = new THREE.Matrix4().makeRotationZ(THREE.MathUtils.degToRad(pitchDeg)).multiply(new THREE.Matrix4().makeRotationX(rollRad));
    const t = tip.clone().applyMatrix4(R);
    group.matrixAutoUpdate = false;
    const M = new THREE.Matrix4().makeTranslation(target.x - t.x, target.y - t.y, target.z - t.z).multiply(R);
    group.matrix.copy(M);
    group.matrixWorldNeedsUpdate = true;
    if (mirror) { group.matrix.premultiply(new THREE.Matrix4().makeScale(-1, 1, 1)); }
  }

  const ripples = []; let ripT = -1;
  const tipL = new THREE.Vector3(), tipR = new THREE.Vector3(), mid = new THREE.Vector3();
  addEventListener('pointermove', (e) => {
    if (stage.time - ripT < 0.28) return;
    ripT = stage.time;
    const v = uniforms.uRip.value;
    const k = ripples.length % 4; ripples.push(0);
    v[k].set(e.clientX / stage.w, 1 - e.clientY / stage.h, stage.time);
  }, { passive: true });

  let skip = 0;
  useFrame((s) => {
    const t = s.time;
    // la page défile : l'œuvre monte, s'assombrit et laisse place au décor calme des autres pages
    const sp = Math.min(2, scrollY / Math.max(1, s.h));      // défilement, en hauteurs d'écran
    const lift = smooth(0.0, 1.0, sp);
    const dim = smooth(0.10, 0.90, sp);
    const away = sp > 1.05;
    if (away && !s.reduce && (skip ^= 1)) return;             // hors de vue : une image sur deux suffit
    left.visible = right.visible = !away;
    uniforms.uDim.value = 1 - 0.38 * dim;
    uniforms.uHero.value = 1 - dim;
    uniforms.uMirror.value = 1 - smooth(0.45, 0.95, sp);
    uniforms.uTime.value = t;
    uniforms.uScroll.value = Math.min(1, sp * 0.3);
    const p = lift;
    // deux tentatives pour se toucher, puis un retrait
    const cyc = (t % 16) / 16;
    const reach = Math.max(smooth(0.06, 0.24, cyc) * (1 - smooth(0.30, 0.40, cyc)), smooth(0.52, 0.70, cyc) * (1 - smooth(0.76, 0.92, cyc)) * 1.0);
    const gap = GAP.far + (GAP.near - GAP.far) * reach + 0.18 * Math.sin(t * 0.7);
    uniforms.uFlare.value = reach;
    // placer les mains
    const yTip = (TIP_Y - 0.5) * halfH * 2 + p * halfH * 1.3;
    const bob = Math.sin(t * 0.55) * 0.35;
    const px = s.pointer.x * 1.2; const py = -s.pointer.y * 0.6;
    place(left, adamTip, 7 + 1.2 * Math.sin(t * 0.4), ROLL, new THREE.Vector3(-gap / 2 + px * 0.2, yTip + bob - 0.8 + py, 0), false);
    place(right, makerTip, 4 + 1.0 * Math.sin(t * 0.35 + 1.0), ROLL, new THREE.Vector3(-gap / 2 - px * 0.2, yTip - bob + 0.5 + py, -1.2), true);
    uniforms.uHorizon.value = HORIZON + p * 0.65;
    scene.updateMatrixWorld(true);
    // l'étincelle : au milieu des deux index, plus vive quand ils sont tout près
    tipL.copy(adamTip).applyMatrix4(left.matrix);
    tipR.copy(makerTip).applyMatrix4(right.matrix);
    mid.addVectors(tipL, tipR).multiplyScalar(0.5);
    uniforms.uSparkW.value.copy(mid);
    mid.project(camera);
    const flick = 0.86 + 0.14 * Math.sin(t * 9.0 + Math.sin(t * 3.1) * 2.0);
    uniforms.uSpark.value.set(mid.x * 0.5 + 0.5, mid.y * 0.5 + 0.5, Math.pow(reach, 3.0) * flick * (1 - smooth(0.0, 0.5, sp)));
    // 1. la scène vers la cible
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    // 2. le miroir et les finitions vers l'écran
    renderer.setRenderTarget(null);
    renderer.render(finScene, finCam);
  });
  root.classList.add('webgl-ready');
}
