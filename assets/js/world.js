// BlackPhage - le monde moléculaire de l'accueil. Un chemin traverse six stations, une par section de la page :
// l'air libre des petites molécules, la double hélice d'ADN, la boucle du moteur, une protéine cible entourée de ses liants,
// une membrane et son récepteur, puis une vue d'ensemble. Le poisson suit ce chemin à mesure qu'on descend la page.
// Tout est construit par du code. Les molécules sont instanciées (une seule commande de dessin par modèle), la membrane est un nuage
// de sphères virtuelles, la brume de profondeur fond les formes lointaines dans le fond indigo, et le poisson les éclaire.
import * as THREE from 'three';
import { MOLECULES, moleculeGeometry, dnaGeometry, ribbonProtein, receptorGeometry, tube, ribbonColor } from './molecules.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function rng32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// ------------------------------------------------------------------ le chemin
export const STATIONS = 6;
const PATH = [[0, 0, 0], [-780, -190, -140], [-1580, -450, 150], [-2380, -720, -170], [-3180, -1070, 90], [-3960, -1360, -70]];

export function makePath() {
  return new THREE.CatmullRomCurve3(PATH.map((p) => V3(...p)), false, 'centripetal');
}

/** Le repère du chemin en t : p le point, T la tangente (le sens de la nage), B vers la caméra (toujours de profil), V la verticale. */
export function makeFrame() { return { p: V3(0, 0, 0), T: V3(-1, 0, 0), B: V3(0, 0, 1), V: V3(0, 1, 0) }; }
export function frameAt(curve, t, f) {
  const tt = Math.min(1, Math.max(0, t));
  curve.getPoint(tt, f.p);
  curve.getTangent(tt, f.T).normalize();
  f.B.set(f.T.z, 0, -f.T.x);
  if (f.B.lengthSq() < 1e-4) f.B.set(0, 0, 1);
  f.B.normalize();
  f.V.crossVectors(f.T, f.B).normalize();
  return f;
}

/**
 * La caméra de profil qui suit le poisson. Elle regarde le chemin par le côté, toujours : la droite de l'écran est derrière le poisson,
 * sa gauche est devant lui (il nage vers le texte). Le poisson occupe une place fixe à l'écran : à droite du centre en grand écran,
 * dans la moitié basse en portrait. C'est le monde qui défile.
 */
const _f = makeFrame();
export function cameraRig(curve, t, aspect, out = {}, pull = 1) {
  frameAt(curve, t, _f);
  const wide = aspect >= 1.15;
  const H = wide ? 262 : Math.max(262, 200 / aspect);                 // hauteur visible au plan du poisson
  const D = H / (2 * Math.tan(THREE.MathUtils.degToRad(15)));
  const W = H * aspect;
  const Th = V3(_f.T.x, 0, _f.T.z); if (Th.lengthSq() < 1e-4) Th.set(-1, 0, 0); Th.normalize();
  const B = V3(Th.z, 0, -Th.x).normalize();                           // du poisson vers la caméra
  const right = Th.clone().negate();                                  // la droite de l'écran
  const nx = wide ? 0.30 : 0.0; const ny = wide ? -0.02 : -0.40;     // où le poisson apparaît (coordonnées d'écran, de -1 à 1)
  out.fishPos = _f.p.clone();
  out.T = _f.T.clone(); out.Th = Th; out.B = B; out.right = right; out.H = H; out.D = D; out.W = W;
  const target = _f.p.clone().addScaledVector(right, -nx * W / 2).add(V3(0, -ny * H / 2, 0));
  out.target = target;
  out.camPos = target.clone().addScaledVector(B, D * pull).add(V3(0, D * pull * 0.10, 0));
  return out;
}

// ------------------------------------------------------------------ uniformes et GLSL partagés
export function worldUniforms() {
  return {
    uTime: { value: 0 }, uCam: { value: V3(0, 0, 10) }, uFishPos: { value: V3(0, 0, 0) }, uGlow: { value: 0.4 }, uRes: { value: new THREE.Vector2(1, 1) },
    uDepth: { value: 0 }, uDim: { value: 1 }, uBind: { value: 0 }, uFishUV: { value: new THREE.Vector2(0.6, 0.5) },
    uCamR: { value: V3(1, 0, 0) }, uCamU: { value: V3(0, 1, 0) }, uCamB: { value: V3(0, 0, 1) },
  };
}

export const WORLD_GLSL = /* glsl */ `
uniform vec3 uCam; uniform vec3 uFishPos; uniform float uGlow; uniform vec2 uRes; uniform float uDepth; uniform float uDim; uniform float uBind; uniform float uTime;
float wHash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float wHash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float wNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wHash3(i), wHash3(i + vec3(1,0,0)), f.x), mix(wHash3(i + vec3(0,1,0)), wHash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(wHash3(i + vec3(0,0,1)), wHash3(i + vec3(1,0,1)), f.x), mix(wHash3(i + vec3(0,1,1)), wHash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float wFbm(vec3 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++) { s += a * wNoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }

// le fond : un indigo qui s'approfondit à mesure qu'on descend
vec3 bgBase(vec2 uv, float depth){
  vec3 top = mix(vec3(0.20, 0.25, 0.54), vec3(0.085, 0.105, 0.30), depth);
  vec3 mid = mix(vec3(0.27, 0.33, 0.62), vec3(0.140, 0.175, 0.43), depth);
  vec3 low = mix(vec3(0.12, 0.15, 0.36), vec3(0.060, 0.072, 0.21), depth);
  vec3 c = mix(low, mid, smoothstep(0.0, 0.5, uv.y));
  return mix(c, top, smoothstep(0.45, 1.05, uv.y));
}

// la brume de profondeur : les formes lointaines fondent dans le fond, et uDim les y plonge davantage quand le texte passe dessus
vec3 worldFog(vec3 col, float dist, vec2 fragXY){
  float f = 1.0 - exp(-pow(dist / 1750.0, 1.45));
  f = clamp(f + (1.0 - uDim) * (1.0 - f), 0.0, 0.97);
  return mix(col, bgBase(fragXY / uRes, uDepth) * 1.03, f);
}

// l'éclairage commun : le ciel de la profondeur, une lumière douce, et la lueur chaude du poisson qui dépend de sa distance
vec3 worldLight(vec3 albedo, vec3 N, vec3 V, vec3 W, float shin, float spec, float rimK){
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  vec3 skyA = vec3(0.36, 0.42, 0.80); vec3 groundA = vec3(0.12, 0.14, 0.34);
  vec3 amb = mix(groundA, skyA, 0.5 + 0.5 * N.y) * 0.60;
  vec3 L1 = normalize(vec3(-0.35, 0.8, 0.5));
  float dif = pow(clamp(dot(N, L1) * 0.5 + 0.5, 0.0, 1.0), 1.5);
  vec3 key = vec3(0.80, 0.84, 1.0) * dif * 0.62;
  vec3 toF = uFishPos - W; float dF = length(toF); vec3 LF = toF / max(dF, 1e-3);
  float att = 1.0 / (1.0 + dF * dF / 62000.0);
  float wrap = clamp(dot(N, LF) * 0.55 + 0.45, 0.0, 1.0);
  vec3 fishL = vec3(1.0, 0.62, 0.38) * (uGlow * att * wrap * 2.4) + vec3(1.0, 0.44, 0.64) * (uGlow * att * pow(wrap, 3.0) * 0.7);
  vec3 col = albedo * (amb + key + fishL);
  float rim = pow(1.0 - ndv, 2.4);
  col += vec3(0.64, 0.72, 1.0) * rim * rimK * 0.42;
  col += vec3(1.0, 0.66, 0.44) * rim * uGlow * att * 0.9;
  float s1 = pow(max(dot(N, normalize(L1 + V)), 0.0), shin);
  float s2 = pow(max(dot(N, normalize(LF + V)), 0.0), shin * 0.7) * uGlow * att * 2.6;
  col += (vec3(0.84, 0.88, 1.0) * s1 * 0.55 + vec3(1.0, 0.76, 0.54) * s2) * spec;
  return col;
}`;

// ------------------------------------------------------------------ matières
const MOL_VERT = /* glsl */ `
attribute vec3 aColor; attribute float aKind;
attribute vec4 iPos; attribute vec4 iQuat; attribute vec4 iSpin; attribute vec2 iRnd;
uniform float uTime;
varying vec3 vN; varying vec3 vW; varying vec3 vC; varying float vKind;
vec3 qrot(vec4 q, vec3 v){ return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
vec4 qmul(vec4 a, vec4 b){ return vec4(a.w * b.xyz + b.w * a.xyz + cross(a.xyz, b.xyz), a.w * b.w - dot(a.xyz, b.xyz)); }
void main(){
  float ang = uTime * iSpin.w + iRnd.x * 6.2831853;
  vec4 qs = vec4(iSpin.xyz * sin(ang * 0.5), cos(ang * 0.5));
  vec4 q = qmul(iQuat, qs);
  vec3 p = qrot(q, position) * iPos.w;
  vec3 n = qrot(q, normal);
  float k = iRnd.x * 40.0;
  vec3 drift = vec3(sin(uTime * 0.21 + k), sin(uTime * 0.17 + k * 1.7), cos(uTime * 0.19 + k * 0.6)) * 6.0 * iPos.w;
  vec4 w = modelMatrix * vec4(p + iPos.xyz + drift, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * n); vC = aColor; vKind = aKind;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const RIB_VERT = /* glsl */ `
attribute vec3 aColor; attribute float aKind;
varying vec3 vN; varying vec3 vW; varying vec3 vC; varying float vKind;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = aColor; vKind = aKind;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SOLID_FRAG = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vC; varying float vKind;
${WORLD_GLSL}
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(uCam - vW);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float bond = step(0.5, vKind) * (1.0 - step(1.5, vKind));
  vec3 col = worldLight(vC, N, V, vW, mix(46.0, 22.0, bond), mix(0.9, 0.4, bond), 0.75);
  col += vC * pow(1.0 - ndv, 1.8) * 0.30;                        // un liseré de verre sur les bords
  col = worldFog(col, length(uCam - vW), gl_FragCoord.xy);
  gl_FragColor = vec4(col, 1.0);
}`;

const LIP_VERT = /* glsl */ `
attribute vec3 aColor; attribute float aSize;
uniform float uTime; uniform vec2 uRes;
varying vec3 vC; varying vec3 vW;
void main(){
  vec3 p = position; p.y += sin(uTime * 0.5 + position.x * 0.021 + position.z * 0.017) * 2.4;     // la membrane ondule à peine
  vec4 w = modelMatrix * vec4(p, 1.0); vec4 mv = viewMatrix * w;
  gl_PointSize = max(2.0, aSize * uRes.y * 0.5 * projectionMatrix[1][1] / -mv.z);
  vW = w.xyz; vC = aColor;
  gl_Position = projectionMatrix * mv;
}`;
const LIP_FRAG = /* glsl */ `
uniform vec3 uCamR; uniform vec3 uCamU; uniform vec3 uCamB;
varying vec3 vC; varying vec3 vW;
${WORLD_GLSL}
void main(){
  vec2 c = gl_PointCoord * 2.0 - 1.0; float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  vec3 nv = vec3(c.x, -c.y, sqrt(1.0 - r2));
  vec3 N = normalize(uCamR * nv.x + uCamU * nv.y + uCamB * nv.z);
  vec3 V = normalize(uCam - vW);
  vec3 col = worldLight(vC, N, V, vW, 30.0, 0.7, 0.6);
  col += vC * pow(1.0 - nv.z, 1.8) * 0.28;
  col = worldFog(col, length(uCam - vW), gl_FragCoord.xy);
  gl_FragColor = vec4(col, 1.0);
}`;

const MOTE_VERT = /* glsl */ `
attribute float aSize; attribute vec3 aColor; attribute float aPhase;
uniform float uTime; uniform vec2 uRes;
varying vec3 vC; varying float vA;
void main(){
  vec3 p = position + vec3(sin(uTime * 0.13 + aPhase * 20.0), sin(uTime * 0.11 + aPhase * 13.0), cos(uTime * 0.12 + aPhase * 17.0)) * 16.0;
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
  gl_PointSize = max(1.5, aSize * uRes.y * 0.5 * projectionMatrix[1][1] / -mv.z);
  vC = aColor;
  vA = (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.5 + aPhase * 1.6) + aPhase * 60.0))) * exp(-(-mv.z) / 2600.0);
  gl_Position = projectionMatrix * mv;
}`;
const MOTE_FRAG = /* glsl */ `
uniform float uDim;
varying vec3 vC; varying float vA;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0) discard;
  float a = pow(1.0 - r, 2.0) * vA * (0.4 + 0.6 * uDim);
  gl_FragColor = vec4(vC * a * 1.5, a);
}`;

const GLASS_VERT = /* glsl */ `
attribute vec3 aNormal; attribute float aAo;
uniform float uTime;
varying vec3 vN; varying vec3 vW; varying float vAo; varying vec3 vP;
void main(){
  vec3 n = normalize(aNormal);
  vec4 w = modelMatrix * vec4(position + n * sin(uTime * 0.5 + position.x * 5.0 + position.y * 3.0) * 0.012, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * n); vAo = aAo; vP = position;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const GLASS_FRAG = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying float vAo; varying vec3 vP;
${WORLD_GLSL}
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(uCam - vW);
  if (dot(N, V) < 0.0) N = -N;
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.4);
  float depth = pow(1.0 - clamp(vAo, 0.0, 1.0), 1.25);
  float thick = clamp((1.0 - ndv) * 0.80 + depth * 0.75, 0.0, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  // le fond vu à travers la matière, décalé par la courbure
  vec2 off = N.xy * (0.030 + 0.12 * thick);
  vec3 refr = bgBase(uv - off, uDepth) * 1.25;
  vec3 pale = vec3(0.84, 0.88, 1.0); vec3 deep = vec3(0.30, 0.34, 0.78);
  float k = smoothstep(0.10, 0.95, thick);
  vec3 col = refr * mix(pale, deep, k) * (0.90 + 0.9 * k) + vec3(0.04, 0.05, 0.12) * (0.4 + 1.1 * thick);
  // l'intérieur s'allume, du corail du poisson : plus fort quand le liant est là
  float n1 = wFbm(vP * 1.7 + vec3(uTime * 0.05, 0.0, uTime * 0.03));
  float blot = smoothstep(0.46, 0.78, n1);
  float vein = pow(1.0 - abs(wNoise(vP * 5.5 + vec3(0.0, uTime * 0.15, 3.0)) * 2.0 - 1.0), 8.0);
  float bio = (blot * (0.30 + 0.65 * thick) + vein * 0.35 * thick) * (0.55 + 0.9 * uBind);
  col += mix(vec3(0.86, 0.36, 0.78), vec3(1.0, 0.58, 0.28), smoothstep(0.1, 0.7, bio)) * bio * 0.85;
  // la lueur du poisson et les reflets
  vec3 toF = uFishPos - vW; float dF = length(toF); float att = 1.0 / (1.0 + dF * dF / 90000.0);
  col += vec3(1.0, 0.56, 0.36) * uGlow * att * (0.25 + 0.75 * pow(clamp(dot(N, normalize(toF)) * 0.5 + 0.5, 0.0, 1.0), 2.0)) * 0.6;
  vec3 L1 = normalize(vec3(-0.5, 0.8, 0.5));
  col += vec3(1.0, 0.94, 0.9) * pow(max(dot(N, normalize(L1 + V)), 0.0), 110.0) * 0.9;
  col += mix(vec3(0.62, 0.72, 1.0), vec3(1.0, 0.66, 0.5), 0.5) * pow(1.0 - ndv, 3.0) * 0.6;
  float a = clamp(0.38 + 0.40 * thick + 0.30 * fres + 0.25 * bio, 0.0, 0.92);
  float dist = length(uCam - vW);
  float fog = clamp((1.0 - exp(-pow(dist / 1750.0, 1.45))) + (1.0 - uDim) * 0.6, 0.0, 0.95);
  a *= 1.0 - fog * 0.85;
  gl_FragColor = vec4(col * a, a);
}`;

const SKY_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`;
const SKY_FRAG = /* glsl */ `
varying vec2 vUv;
uniform vec2 uFishUV;
${WORLD_GLSL}
float wMotes(vec2 uv, float aspect, float t){
  vec2 g = vec2(uv.x * aspect, uv.y) * 11.0; g.y -= t * 0.18;
  vec2 id = floor(g); vec2 f = fract(g) - 0.5;
  float h = wHash(id);
  vec2 o = (vec2(wHash(id + 1.7), wHash(id + 9.1)) - 0.5) * 0.7;
  float r = length(f - o);
  float size = 0.045 + 0.08 * wHash(id + 4.3);
  float tw = 0.5 + 0.5 * sin(t * (0.4 + h * 1.4) + h * 40.0);
  return step(0.86, h) * pow(1.0 - smoothstep(0.0, size, r), 1.6) * tw;
}
void main(){
  float aspect = uRes.x / uRes.y;
  vec3 col = bgBase(vUv, uDepth);
  vec2 p = vec2(vUv.x * aspect, vUv.y);
  float n = wFbm(vec3(p * 1.1, uTime * 0.012 + uDepth * 3.0));
  col += vec3(0.20, 0.26, 0.52) * smoothstep(0.40, 0.85, n) * 0.16;
  float n2 = wFbm(vec3(p * 2.1 + 7.0, uTime * 0.02));
  col += vec3(0.60, 0.34, 0.52) * smoothstep(0.60, 0.90, n2) * 0.06 * (0.5 + 0.5 * uBind);
  // la lueur du poisson dans le milieu
  vec2 d = (vUv - uFishUV) * vec2(aspect, 1.0);
  col += vec3(1.0, 0.52, 0.40) * exp(-pow(length(d) / 0.30, 2.0)) * 0.10 * uGlow;
  float m = wMotes(vUv, aspect, uTime);
  col += mix(vec3(0.70, 0.78, 1.0), vec3(1.0, 0.72, 0.60), wHash(floor(vec2(vUv.x * aspect, vUv.y) * 11.0))) * m * 0.22;
  gl_FragColor = vec4(col, 1.0);
}`;

// ------------------------------------------------------------------ construction
const premultiplied = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function glassGeometry(data) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(b64(data.position).buffer), 3));
  geo.setAttribute('aNormal', new THREE.BufferAttribute(new Int8Array(b64(data.normal).buffer), 3, true));
  geo.setAttribute('aAo', new THREE.BufferAttribute(b64(data.ao), 1, true));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(b64(data.index).buffer), 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.6);
  return geo;
}

function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** Un modèle de molécule dessiné autant de fois qu'il y a d'instances : position et échelle, orientation, rotation propre, phase. */
function instanced(base, items, material) {
  const n = items.length;
  const g = new THREE.InstancedBufferGeometry().copy(base);
  const pos = new Float32Array(n * 4); const quat = new Float32Array(n * 4); const spin = new Float32Array(n * 4); const rn = new Float32Array(n * 2);
  items.forEach((it, i) => {
    pos.set([it.p.x, it.p.y, it.p.z, it.s], i * 4); quat.set([it.q.x, it.q.y, it.q.z, it.q.w], i * 4);
    spin.set([it.axis.x, it.axis.y, it.axis.z, it.speed], i * 4); rn.set([it.phase, it.glow || 0], i * 2);
  });
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(pos, 4));
  g.setAttribute('iQuat', new THREE.InstancedBufferAttribute(quat, 4));
  g.setAttribute('iSpin', new THREE.InstancedBufferAttribute(spin, 4));
  g.setAttribute('iRnd', new THREE.InstancedBufferAttribute(rn, 2));
  g.instanceCount = n;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const m = new THREE.Mesh(g, material);
  m.frustumCulled = false;
  m.userData.total = n;
  return m;
}

export function buildWorld({ surface, seed = 7 } = {}) {
  const U = worldUniforms();
  const group = new THREE.Group();
  const curve = makePath();
  const rnd = rng32(seed);
  const fr = makeFrame();
  const place = (t, db, dv, dt, out = V3(0, 0, 0)) => { frameAt(curve, t, fr); return out.copy(fr.p).addScaledVector(fr.B, db).addScaledVector(fr.V, dv).addScaledVector(fr.T, dt); };
  const randQuat = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6.283, rnd() * 6.283, rnd() * 6.283));
  const randAxis = () => V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();

  const molMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: MOL_VERT, fragmentShader: SOLID_FRAG });
  const ribMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: RIB_VERT, fragmentShader: SOLID_FRAG, side: THREE.DoubleSide });
  const meshes = { molecules: [], dna: [], ribbons: [], receptors: [], lipids: null, motes: null };
  const spinners = [];                                           // les objets que le processeur fait tourner
  const regions = [];                                            // chaque ensemble n'est dessiné que près de l'endroit du chemin où il se trouve
  const region = (o, t, reach) => { regions.push({ o, t, reach }); return o; };

  // un point du couloir autour du chemin : la profondeur par rapport au poisson (db), la hauteur (dv), le long du chemin (dt).
  // Une voie reste libre autour de la ligne de visée du poisson, pour qu'il se lise et que le texte reste lisible : les objets
  // se placent au-dessus ou au-dessous, jamais devant ni derrière lui.
  const D0 = 520;
  const corridor = (t, near = 0.05, spread = 1.0) => {
    const nearOne = rnd() < near;
    const db = nearOne ? 90 + rnd() * 110 : -(120 + 1450 * Math.pow(rnd(), 1.5));
    const lane = 0.17 * (D0 - db) + 40;                          // le demi-couloir libre, à cette profondeur
    const dv = (rnd() < 0.5 ? -1 : 1) * (lane + rnd() * (260 + 0.28 * Math.abs(db)) * spread);
    const dt = (rnd() * 2 - 1) * 380;
    // le coin haut gauche du premier écran reste dégagé : c'est là que sont le logo et le titre
    return place(t, db, t < 0.05 && db > 0 && dt > 60 && dv > 0 ? -dv : dv, dt);
  };

  // ---- les petites molécules : un modèle de chaque, instancié
  {
    const names = Object.keys(MOLECULES);
    const totalW = names.reduce((s, k) => s + MOLECULES[k].weight, 0);
    const N = 340;
    for (const name of names) {
      const n = Math.round(N * MOLECULES[name].weight / totalW);
      const items = [];
      for (let i = 0; i < n; i++) {
        const t = rnd();
        const p = corridor(t);
        const far = -fr.B.dot(p.clone().sub(fr.p));
        items.push({ t, p, s: (1.4 + 1.0 * rnd()) * (far < 0 ? 0.6 : 1.0) * (1 + Math.min(0.9, Math.max(0, far - 500) / 1400)), q: randQuat(), axis: randAxis(), speed: (rnd() - 0.5) * 0.4, phase: rnd() });
      }
      shuffle(items, rnd);
      const geo = moleculeGeometry(name);
      const CH = 8;
      for (let c = 0; c < CH; c++) {
        const part = items.filter((it) => Math.min(CH - 1, Math.floor(it.t * CH)) === c);
        if (!part.length) continue;
        const mesh = instanced(geo, part, molMat); mesh.userData.kind = 'mol';
        region(mesh, (c + 0.5) / CH, 0.5 / CH + 0.30);
        group.add(mesh); meshes.molecules.push(mesh);
      }
    }
  }

  // ---- l'ADN : trois hélices, qui tournent sur leur axe
  {
    const dna = dnaGeometry(1150, 60, 190);
    const q = new THREE.Quaternion();
    const defs = [
      { t: 0.215, db: -520, dv: 370, dt: -60, s: 1.0, tilt: 0.10 },
      { t: 0.30, db: -1100, dv: -600, dt: 200, s: 1.7, tilt: -0.25 },
      { t: 0.055, db: -1250, dv: 580, dt: 80, s: 1.5, tilt: -0.30 },
      { t: 0.005, db: -1000, dv: -460, dt: -150, s: 1.15, tilt: 0.18 },
    ];
    for (const d of defs) {
      const p = place(d.t, d.db, d.dv, d.dt);
      frameAt(curve, d.t, fr);
      q.setFromUnitVectors(V3(1, 0, 0), fr.T.clone().applyAxisAngle(V3(0, 0, 1), d.tilt).normalize());
      const mesh = instanced(dna, [{ p, s: d.s, q: q.clone(), axis: V3(1, 0, 0), speed: 0.22, phase: rnd() }], molMat);
      mesh.userData.kind = 'dna';
      region(mesh, d.t, 0.16 + 0.12 * d.s);
      group.add(mesh); meshes.dna.push(mesh);
    }
  }

  // ---- des protéines en rubans, de toutes tailles, qui tournent lentement
  {
    const geos = [];
    for (let i = 0; i < 8; i++) geos.push(ribbonProtein(rnd, 5 + (i % 4)));
    for (let i = 0; i < 24; i++) {
      const t = rnd();
      const p = corridor(t, 0.03);
      frameAt(curve, t, fr);
      const far = -fr.B.dot(p.clone().sub(fr.p));
      const m = new THREE.Mesh(geos[i % geos.length], ribMat);
      m.position.copy(p); m.scale.setScalar(0.9 + 1.3 * rnd() + Math.max(0, far - 400) / 900);
      m.rotation.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28);
      m.frustumCulled = false; m.userData.kind = 'rib';
      spinners.push({ o: m, w: V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.12) });
      region(m, t, 0.34);
      group.add(m); meshes.ribbons.push(m);
    }
    // le premier écran : trois pièces maîtresses placées à la main autour du poisson, hors de sa voie
    for (const [t, db, dv, dt, sc] of [[0.002, -760, -340, 280, 1.6], [0.01, -950, 430, -330, 1.9], [0.0, -440, -310, -140, 1.15]]) {
      frameAt(curve, t, fr);
      const m = new THREE.Mesh(geos[(Math.round(t * 1000) + 3) % geos.length], ribMat);
      m.position.copy(place(t, db, dv, dt)); m.scale.setScalar(sc);
      m.rotation.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28); m.frustumCulled = false; m.userData.kind = 'rib';
      spinners.push({ o: m, w: V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.10) });
      region(m, t, 0.34);
      group.add(m); meshes.ribbons.push(m);
    }
  }

  // ---- la boucle du moteur (station 2) : un anneau de molécules et un cycle de lumière qui tournent
  {
    const ring = new THREE.Group();
    const c = place(0.4, -640, 40, -40);
    frameAt(curve, 0.4, fr);
    ring.position.copy(c);
    ring.quaternion.setFromUnitVectors(V3(0, 0, 1), fr.B);
    const R = 270;
    const names = ['benzene', 'purine', 'sugar', 'amino', 'toluene', 'phosphate'];
    const per = {};
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2;
      const name = names[i % names.length];
      (per[name] = per[name] || []).push({ p: V3(Math.cos(a) * R, Math.sin(a) * R, (rnd() - 0.5) * 40), s: 2.5, q: randQuat(), axis: randAxis(), speed: 0.4, phase: rnd() });
    }
    for (const name of Object.keys(per)) { const m = instanced(moleculeGeometry(name), per[name], molMat); ring.add(m); meshes.molecules.push(m); }
    const pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; pts.push(V3(Math.cos(a) * R, Math.sin(a) * R, 0)); }
    pts.push(pts[0].clone());
    const loop = new THREE.Mesh(tube(pts, () => 2.4, (t) => ribbonColor(t), 8, 200), ribMat);
    loop.frustumCulled = false;
    ring.add(loop);
    ring.userData.kind = 'ring';
    region(ring, 0.4, 0.32);
    spinners.push({ o: ring, z: 0.10 });
    group.add(ring);
  }

  // ---- la protéine cible (station 3) et celle du récepteur (station 4), de verre
  const glass = [];
  if (surface) {
    const gg = glassGeometry(surface);
    const gm = new THREE.ShaderMaterial({ uniforms: U, vertexShader: GLASS_VERT, fragmentShader: GLASS_FRAG, side: THREE.DoubleSide, ...premultiplied });
    const defs = [
      { t: 0.02, db: -1100, dv: -140, dt: -520, s: 230 },
      { t: 0.60, db: -700, dv: 40, dt: 90, s: 250 },
      { t: 0.80, db: -420, dv: -40, dt: 130, s: 205 },
      { t: 0.99, db: -900, dv: 120, dt: 0, s: 260 },
    ];
    for (const d of defs) {
      const m = new THREE.Mesh(gg, gm);
      m.position.copy(place(d.t, d.db, d.dv, d.dt)); m.scale.setScalar(d.s);
      m.rotation.set(rnd() * 6.28, rnd() * 6.28, rnd() * 3);
      m.frustumCulled = false; m.renderOrder = 6; m.userData.kind = 'glass';
      spinners.push({ o: m, w: V3(0.02, 0.06, 0.015) });
      region(m, d.t, 0.40);
      group.add(m); glass.push(m);
    }
  }

  // ---- la membrane (station 4) : deux feuillets de sphères, et des récepteurs qui la traversent.
  // Elle est posée dans le repère du chemin : sous le poisson, loin derrière lui, jamais près de la caméra.
  {
    frameAt(curve, 0.8, fr);
    const F = { p: fr.p.clone(), T: fr.T.clone(), B: fr.B.clone() };
    const at = (a, b, h) => F.p.clone().addScaledVector(F.T, a).addScaledVector(F.B, b).add(V3(0, h - 215, 0));
    const rec = [];
    for (let i = 0; i < 13; i++) rec.push({ a: (rnd() - 0.5) * 1300, b: -150 - rnd() * 700 });
    const heads = []; const cols = []; const sizes = [];
    const step = 17;
    for (let ga = -750; ga <= 750; ga += step) {
      for (let gb = -1000; gb <= -90; gb += step) {
        for (const leaflet of [1, -1]) {
          const a = ga + (rnd() - 0.5) * 6 + (leaflet < 0 ? step * 0.5 : 0); const b = gb + (rnd() - 0.5) * 6 + (leaflet < 0 ? step * 0.5 : 0);
          if (rec.some((r) => (r.a - a) ** 2 + (r.b - b) ** 2 < 24 * 24)) continue;
          const h = 20 * Math.sin(a * 0.004) * Math.cos(b * 0.0033) + 8 * Math.sin(b * 0.011 + a * 0.006);
          const p = at(a, b, h + leaflet * 15);
          heads.push(p.x, p.y, p.z);
          const k = rnd();
          if (leaflet > 0) cols.push(1.0, 0.70 + 0.16 * k, 0.60 + 0.12 * k); else cols.push(0.60 + 0.12 * k, 0.66 + 0.12 * k, 1.0);
          sizes.push(7 + rnd() * 1.6);
        }
      }
    }
    const order = shuffle(Array.from({ length: sizes.length }, (_, i) => i), rnd);
    const P = new Float32Array(order.length * 3); const C = new Float32Array(order.length * 3); const S = new Float32Array(order.length);
    order.forEach((o, i) => { P.set(heads.slice(o * 3, o * 3 + 3), i * 3); C.set(cols.slice(o * 3, o * 3 + 3), i * 3); S[i] = sizes[o]; });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(C, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(S, 1));
    g.boundingSphere = new THREE.Sphere(F.p.clone(), 4000);
    const lipMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: LIP_VERT, fragmentShader: LIP_FRAG });
    const pts = new THREE.Points(g, lipMat); pts.frustumCulled = false; pts.userData.kind = 'lip';
    region(pts, 0.8, 0.40);
    group.add(pts); meshes.lipids = pts; pts.userData.total = order.length;
    const rg = receptorGeometry();
    for (const r of rec) {
      const m = new THREE.Mesh(rg, ribMat);
      m.position.copy(at(r.a, r.b, 10 + 5 * Math.sin(r.a * 0.004)));
      m.rotation.set((rnd() - 0.5) * 0.2, rnd() * 6.28, (rnd() - 0.5) * 0.2); m.scale.setScalar(0.85 + 0.5 * rnd());
      m.frustumCulled = false; m.userData.kind = 'rec';
      region(m, 0.8, 0.36);
      group.add(m); meshes.receptors.push(m);
    }
  }

  // ---- les poussières lumineuses du couloir
  {
    const n = 900;
    const P = new Float32Array(n * 3); const C = new Float32Array(n * 3); const S = new Float32Array(n); const Ph = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = place(rnd(), -(1300 * Math.pow(rnd(), 1.3)) + 120, (rnd() * 2 - 1) * 520, (rnd() * 2 - 1) * 500);
      P.set([p.x, p.y, p.z], i * 3);
      const warm = rnd() < 0.35; C.set(warm ? [1.0, 0.72, 0.60] : [0.70, 0.78, 1.0], i * 3);
      S[i] = 1.6 + 3.6 * rnd() * rnd(); Ph[i] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(C, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(S, 1)); g.setAttribute('aPhase', new THREE.BufferAttribute(Ph, 1));
    g.boundingSphere = new THREE.Sphere(V3(-2000, -700, 0), 6000);
    const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 18; pts.userData.kind = 'mote';
    group.add(pts); meshes.motes = pts;
  }

  // ---- le fond
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: U, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, depthTest: false, depthWrite: false }));
  sky.frustumCulled = false; sky.renderOrder = -10;

  const world = {
    group, sky, curve, uniforms: U, glass,
    /** Le nombre d'éléments dessinés suit la qualité : les modèles sont mélangés, on peut donc couper la fin sans creux. */
    setQuality(q) {
      for (const m of meshes.molecules) m.geometry.instanceCount = Math.max(1, Math.round(m.userData.total * q));
      if (meshes.lipids) meshes.lipids.geometry.setDrawRange(0, Math.round(meshes.lipids.userData.total * Math.min(1, 0.35 + 0.65 * q)));
      meshes.ribbons.forEach((m, i) => { m.visible = i < Math.ceil(meshes.ribbons.length * Math.min(1, 0.3 + 0.7 * q)); });
      meshes.receptors.forEach((m, i) => { m.visible = i < Math.ceil(meshes.receptors.length * Math.min(1, 0.3 + 0.7 * q)); });
    },
    /** À appeler à chaque image : le temps, la base de la caméra, les rotations lentes. */
    update(time, dt, camera, tPath) {
      if (tPath !== undefined) for (const r of regions) r.o.visible = Math.abs(tPath - r.t) < r.reach;
      U.uTime.value = time;
      U.uCam.value.copy(camera.position);
      camera.matrixWorld.extractBasis(U.uCamR.value, U.uCamU.value, U.uCamB.value);
      for (const s of spinners) {
        if (s.w) { s.o.rotation.x += s.w.x * dt; s.o.rotation.y += s.w.y * dt; s.o.rotation.z += s.w.z * dt; }
        if (s.z) s.o.rotateZ(s.z * dt);
      }
    },
  };
  return world;
}

export { smooth };
