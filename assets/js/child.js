// BlackPhage - l'enfant. Un maillage lisse, rigué, que le poisson fait jouer : le bras se tend vers le museau,
// la tête suit, le buste se penche, et un clic le fait sursauter de joie.
// Le modèle vient de assets/data/child.json (tools/child/build.py). Ici : le décodage, la matière et la pose.
import * as THREE from 'three';

const dec64 = (s, Type) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Type(u.buffer); };

/** Le maillage, ses poids de peau et son squelette de repos. */
export function loadChildData(h) {
  const q = dec64(h.position, Int16Array);
  const pos = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) { const a = i % 3; pos[i] = h.min[a] + (q[i] + 32768) / 65535 * (h.max[a] - h.min[a]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(dec64(h.normal, Int8Array), 3, true));
  g.setAttribute('aAo', new THREE.BufferAttribute(dec64(h.ao, Uint8Array), 1, true));
  g.setAttribute('aW0', new THREE.BufferAttribute(dec64(h.matW0, Uint8Array), 4, true));
  g.setAttribute('aW1', new THREE.BufferAttribute(dec64(h.matW1, Uint8Array), 4, true));
  g.setAttribute('aBoneIdx', new THREE.BufferAttribute(dec64(h.boneIndex, Uint8Array), 4, false));
  g.setAttribute('aBoneW', new THREE.BufferAttribute(dec64(h.boneWeight, Uint8Array), 4, true));
  g.setIndex(new THREE.BufferAttribute(h.index32 ? dec64(h.index, Uint32Array) : dec64(h.index, Uint16Array), 1));
  g.computeBoundingSphere();
  return { geometry: g, bones: h.bones, rig: h.rig };
}

// ------------------------------------------------------------------ matière
// Huit matières, avec leurs parts en chaque sommet (aW0 : tunique, peau, cheveux, bottes ; aW1 : écharpe, manchettes, pantalon, ceinture).
// Les parts sont interpolées puis affûtées dans le shader : les limites restent nettes sans escalier.
const CHILD_VERT = /* glsl */ `
attribute vec4 aBoneIdx; attribute vec4 aBoneW; attribute float aAo; attribute vec4 aW0; attribute vec4 aW1;
uniform mat4 uBones[13];
varying vec3 vN; varying vec3 vW; varying vec3 vL; varying float vAo; varying vec4 vW0; varying vec4 vW1;
void main(){
  mat4 sk = aBoneW.x * uBones[int(aBoneIdx.x + 0.5)] + aBoneW.y * uBones[int(aBoneIdx.y + 0.5)]
          + aBoneW.z * uBones[int(aBoneIdx.z + 0.5)] + aBoneW.w * uBones[int(aBoneIdx.w + 0.5)];
  vec4 p = sk * vec4(position, 1.0);
  vec3 n = mat3(sk) * normal;
  vec4 w = modelMatrix * p;
  vW = w.xyz; vL = position; vAo = aAo; vW0 = aW0; vW1 = aW1;
  vN = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const LIGHT_GLSL = /* glsl */ `
float hash31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x), mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x), mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// l'éclairage commun : le ciel du soir, une lumière douce, et la lueur chaude du poisson qui dépend de sa distance
vec3 childLight(vec3 albedo, vec3 N, vec3 V, vec3 W, float ao, float shin, float spec, float rimK, vec3 fishPos, float glow){
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float rim = pow(1.0 - ndv, 2.6);
  float aoc = pow(clamp(ao, 0.0, 1.0), 1.2);
  vec3 skyA = vec3(0.30, 0.37, 0.66); vec3 groundA = vec3(0.10, 0.12, 0.28);
  vec3 amb = mix(groundA, skyA, 0.5 + 0.5 * N.y) * (0.30 + 0.70 * aoc);
  vec3 L1 = normalize(vec3(-0.35, 0.75, 0.55));
  float dif = pow(clamp(dot(N, L1) * 0.5 + 0.5, 0.0, 1.0), 1.6);
  vec3 key = vec3(0.74, 0.80, 1.0) * dif * 0.52;
  vec3 toF = fishPos - W; float dF = length(toF);
  vec3 LF = toF / max(dF, 1e-3);
  float att = 1.0 / (1.0 + dF * dF / 4800.0);
  float wrap = clamp(dot(N, LF) * 0.55 + 0.45, 0.0, 1.0);
  vec3 fishLight = vec3(1.0, 0.60, 0.34) * (glow * att * wrap * 2.0) + vec3(1.0, 0.45, 0.60) * (glow * att * pow(wrap, 3.0) * 0.5);
  vec3 col = albedo * (amb + key + fishLight + vec3(0.11, 0.075, 0.04) * (0.55 + 0.45 * N.y)) * (0.82 + 0.18 * aoc);
  col += vec3(0.62, 0.70, 1.0) * rim * rimK * (0.4 + 0.6 * aoc);                   // liseré froid qui détache la silhouette
  col += vec3(1.0, 0.66, 0.42) * rim * glow * att * 0.9;                           // et chaud du côté du poisson
  // un éclat doux : la lumière du ciel et celle du poisson
  float s1 = pow(max(dot(N, normalize(L1 + V)), 0.0), shin);
  float s2 = pow(max(dot(N, normalize(LF + V)), 0.0), shin * 0.7) * glow * att * 2.2;
  col += (vec3(0.80, 0.86, 1.0) * s1 * 0.45 + vec3(1.0, 0.72, 0.48) * s2) * spec;
  return col;
}`;

const CHILD_FRAG = /* glsl */ `
uniform vec3 uCam; uniform vec3 uFishPos; uniform float uGlow; uniform float uTime;
varying vec3 vN; varying vec3 vW; varying vec3 vL; varying float vAo; varying vec4 vW0; varying vec4 vW1;
${LIGHT_GLSL}
const vec3 HAIR_C = vec3(2.0, 101.0, 0.0);
const vec3 EYE_P = vec3(9.70, 100.0, 5.10);       // l'œil du côté +z ; l'autre est son symétrique

// un disque doux, plus haut que large
float blob(vec3 d, vec3 k, float r, float soft){ return 1.0 - smoothstep(r - soft, r, length(d * k)); }

void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vW);
  // les parts de matière : affûtées, puis ramenées à une somme de 1
  vec4 a = smoothstep(0.30, 0.70, vW0); vec4 b = smoothstep(0.30, 0.70, vW1);
  float tot = dot(a, vec4(1.0)) + dot(b, vec4(1.0)) + 1e-4;
  a /= tot; b /= tot;
  float wTunic = a.x; float wSkin = a.y; float wHair = a.z; float wBoot = a.w;
  float wScarf = b.x; float wTrim = b.y; float wPants = b.z; float wBelt = b.w;

  float fold = vnoise(vL * 0.13) * 2.0 - 1.0;
  float fold2 = vnoise(vL * 0.31 + 4.0) * 2.0 - 1.0;
  N = normalize(N + 0.10 * (wTunic + wPants) * vec3(fold, fold2, fold * fold2));

  vec3 albedo = vec3(0.0); float shin = 0.0; float spec = 0.0; float rimK = 0.0;
  if (wTunic > 0.003) {
    albedo += wTunic * vec3(0.32, 0.60, 0.34) * (0.96 + 0.04 * fold);          // tunique verte
    shin += wTunic * 18.0; rimK += wTunic * 0.38;
  }
  if (wSkin > 0.003) {
    vec3 skin = vec3(1.00, 0.78, 0.62);
    vec3 q = vec3(vL.x, vL.y, abs(vL.z));
    vec3 d = q - EYE_P;
    float eye = blob(d, vec3(1.0, 0.70, 1.0), 1.15, 0.30);
    float glint = blob(d - vec3(0.35, 0.55, 0.15), vec3(1.0), 0.36, 0.2);
    float brow = blob(d - vec3(-0.35, 3.1, -0.1), vec3(0.55, 2.4, 0.55), 1.0, 0.45);
    float blush = blob(d - vec3(0.3, -3.5, 0.4), vec3(0.5), 1.2, 1.1);
    float mouthY = 92.8 - 0.20 + 0.75 * pow(vL.z / 1.7, 2.0);
    float mouth = exp(-pow((vL.y - mouthY) / 0.17, 2.0)) * (1.0 - smoothstep(1.3, 1.9, abs(vL.z))) * (1.0 - smoothstep(1.0, 2.2, abs(vL.x - 10.0))) * step(vL.x, 11.4) * step(90.0, vL.y);
    skin = mix(skin, vec3(1.0, 0.58, 0.56), blush * 0.55);
    skin = mix(skin, vec3(0.62, 0.42, 0.16), brow * 0.8);
    skin = mix(skin, vec3(0.20, 0.09, 0.08), mouth * 0.7);
    skin = mix(skin, vec3(0.07, 0.05, 0.10), eye);
    skin = mix(skin, vec3(1.0), glint * eye);
    albedo += wSkin * skin;
    spec += wSkin * 0.25; shin += wSkin * 26.0; rimK += wSkin * 0.30;
  }
  if (wHair > 0.003) {
    float rad = length((vL - HAIR_C) / vec3(10.3, 10.6, 9.5));
    float tip = smoothstep(1.05, 1.9, rad);
    float strand = vnoise(vL * vec3(1.3, 0.8, 1.3) + 3.0);
    float strand2 = vnoise(vL * vec3(3.2, 1.6, 3.2) + 9.0);
    albedo += wHair * mix(vec3(1.0, 0.82, 0.36), vec3(1.0, 0.90, 0.52), tip) * (0.86 + 0.24 * strand + 0.10 * strand2);
    spec += wHair * 0.35; shin += wHair * 22.0; rimK += wHair * 0.30;
  }
  if (wBoot > 0.003) {
    albedo += wBoot * vec3(0.50, 0.32, 0.22) * (0.9 + 0.2 * vnoise(vL * 0.8));  // bottes
    spec += wBoot * 0.5; shin += wBoot * 30.0; rimK += wBoot * 0.38;
  }
  if (wScarf > 0.003) {
    float w = vnoise(vL * 2.2);
    float wrap = 0.93 + 0.07 * sin(vL.y * 6.5 + atan(vL.z, vL.x - 1.2) * 3.0);   // les tours de l'écharpe
    albedo += wScarf * vec3(1.0, 0.76, 0.24) * (0.92 + 0.10 * w) * wrap;        // écharpe dorée
    spec += wScarf * 0.5; shin += wScarf * 24.0; rimK += wScarf * 0.5;
  }
  if (wTrim > 0.003) {
    albedo += wTrim * vec3(0.98, 0.92, 0.78);                                   // manchettes
    spec += wTrim * 0.2; shin += wTrim * 18.0; rimK += wTrim * 0.38;
  }
  if (wPants > 0.003) {
    albedo += wPants * vec3(0.25, 0.48, 0.32);                                  // pantalon
    shin += wPants * 18.0; rimK += wPants * 0.38;
  }
  if (wBelt > 0.003) {
    float buckle = blob(vec3(vL.x - 9.4, vL.y - 61.5, vL.z), vec3(0.6, 1.0, 1.0), 1.7, 0.4) * step(0.0, vL.x);
    albedo += wBelt * mix(vec3(0.60, 0.40, 0.18), vec3(1.0, 0.82, 0.30), buckle);
    spec += wBelt * 0.6; shin += wBelt * 40.0; rimK += wBelt * 0.38;
  }
  vec3 col = childLight(albedo, N, V, vW, vAo, max(shin, 4.0), spec, rimK, uFishPos, uGlow);
  gl_FragColor = vec4(col, 1.0);
}`;

export function childUniforms() {
  const bones = []; for (let i = 0; i < 13; i++) bones.push(new THREE.Matrix4());
  return { uBones: { value: bones }, uCam: { value: new THREE.Vector3(0, 0, 10) }, uFishPos: { value: new THREE.Vector3(100, 80, 0) }, uGlow: { value: 0.4 }, uTime: { value: 0 } };
}

export function childMaterial(uniforms) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader: CHILD_VERT, fragmentShader: CHILD_FRAG });
}

// ------------------------------------------------------------------ l'écharpe : deux pans qui flottent dans le vent
// La géométrie est une grille (u le long du pan, v en travers, k le pan). Tout le mouvement est calculé dans le vertex shader :
// une ligne médiane qui part du noeud vers l'arrière, des ondes qui grandissent avec la distance, et un ruban qui tourne sur lui-même.
const SCARF_KNOTS = [[-3.2, 85.2, 4.6], [-3.0, 84.6, -2.6]];
export function buildScarfGeometry() {
  const NU = 72; const NV = 6; const pos = []; const idx = [];
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) pos.push(i / NU, (j / NV) * 2 - 1, k);
    const base = k * (NU + 1) * (NV + 1);
    for (let i = 0; i < NU; i++) {
      for (let j = 0; j < NV; j++) {
        const a = base + i * (NV + 1) + j; const b = a + 1; const c = a + NV + 1; const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(-30, 85, 0), 70);
  return g;
}

const SCARF_VERT = /* glsl */ `
uniform mat4 uAnchor; uniform float uTime; uniform float uWind; uniform float uLift;
varying vec3 vN; varying vec3 vW; varying vec3 vL; varying float vU; varying float vV; varying float vK;
const vec3 K0 = vec3(${SCARF_KNOTS[0].join(', ')});
const vec3 K1 = vec3(${SCARF_KNOTS[1].join(', ')});
vec3 ribbon(float u, float v, float k){
  vec3 S = k < 0.5 ? K0 : K1;
  float side = k < 0.5 ? 1.0 : -1.0;
  float len = k < 0.5 ? 60.0 : 44.0;
  float s = u * len;
  float t = uTime;
  float wind = 0.55 + 0.45 * uWind;
  float ph1 = t * (3.1 + 0.5 * k) - u * 6.4 + k * 1.7;
  float ph2 = t * (2.5 + 0.4 * k) - u * 5.4 + k * 0.9;
  float grow = u * (0.35 + 0.65 * u);
  vec3 c = S;
  c.x -= s * 0.93 + 3.0 * grow * sin(ph2 + 0.6) * wind;
  c.y += s * 0.16 * (1.0 - u) - s * 0.10 * u * u + (2.2 + 7.5 * grow) * sin(ph1) * wind + uLift * (2.0 + 16.0 * u * u);
  c.z += side * (1.2 + 3.4 * u) + 7.5 * grow * sin(ph2) * wind;
  // direction de la ligne médiane, par différence finie
  float e = 0.01;
  float u2 = min(u + e, 1.0 + e);
  float s2 = u2 * len;
  float q1 = t * (3.1 + 0.5 * k) - u2 * 6.4 + k * 1.7;
  float q2 = t * (2.5 + 0.4 * k) - u2 * 5.4 + k * 0.9;
  float g2 = u2 * (0.35 + 0.65 * u2);
  vec3 c2 = S;
  c2.x -= s2 * 0.93 + 3.0 * g2 * sin(q2 + 0.6) * wind;
  c2.y += s2 * 0.16 * (1.0 - u2) - s2 * 0.10 * u2 * u2 + (2.2 + 7.5 * g2) * sin(q1) * wind + uLift * (2.0 + 16.0 * u2 * u2);
  c2.z += side * (1.2 + 3.4 * u2) + 7.5 * g2 * sin(q2) * wind;
  vec3 T = normalize(c2 - c + vec3(-1e-4, 0.0, 0.0));
  // le ruban : à plat dans le vent, avec une torsion qui court le long du pan
  vec3 a0 = normalize(cross(T, vec3(0.0, 0.0, 1.0)));
  float tw = (0.7 * sin(t * 2.2 - u * 4.6 + k * 2.0) * (0.3 + u) + 0.5 * u) * wind;
  vec3 b0 = cross(T, a0);
  vec3 across = a0 * cos(tw) + b0 * sin(tw);
  float width = 3.7 * (1.0 - 0.18 * u) * smoothstep(0.0, 0.05, u + 0.04);
  return c + across * v * width;
}
void main(){
  float u = position.x; float v = position.y; float k = position.z;
  vec3 P = ribbon(u, v, k);
  vec3 dU = ribbon(min(u + 0.01, 1.0), v, k) - ribbon(max(u - 0.01, 0.0), v, k);
  vec3 dV = ribbon(u, min(v + 0.1, 1.0), k) - ribbon(u, max(v - 0.1, -1.0), k);
  vec3 n = normalize(cross(dU, dV) + 1e-5);
  vec4 pw = uAnchor * vec4(P, 1.0);
  vec4 w = modelMatrix * pw;
  vW = w.xyz; vL = P; vU = u; vV = v; vK = k;
  vN = normalize(mat3(modelMatrix) * mat3(uAnchor) * n);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SCARF_FRAG = /* glsl */ `
uniform vec3 uCam; uniform vec3 uFishPos; uniform float uGlow; uniform float uTime;
varying vec3 vN; varying vec3 vW; varying vec3 vL; varying float vU; varying float vV; varying float vK;
${LIGHT_GLSL}
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vW);
  if (dot(N, V) < 0.0) N = -N;
  // un tissu doré : des fils fins dans le sens de la longueur, un ourlet plus clair sur les bords, et deux rayures près du bout
  float thread = 0.92 + 0.08 * sin(vV * 38.0 + vU * 3.0);
  float weave = 0.97 + 0.03 * sin(vU * 140.0);
  float hem = smoothstep(0.80, 1.0, abs(vV));
  float stripe = (1.0 - smoothstep(0.0, 0.012, abs(vU - 0.90))) + (1.0 - smoothstep(0.0, 0.010, abs(vU - 0.935)));
  vec3 base = mix(vec3(0.98, 0.72, 0.20), vec3(1.0, 0.86, 0.46), vU * 0.6);
  vec3 albedo = base * thread * weave * (1.0 + 0.10 * hem);
  albedo = mix(albedo, vec3(0.86, 0.46, 0.18), stripe * 0.75);
  float ao = 0.78 + 0.22 * smoothstep(0.0, 0.12, vU);
  vec3 col = childLight(albedo, N, V, vW, ao, 22.0, 0.5, 0.55, uFishPos, uGlow);
  // la lumière traverse un peu le tissu quand le poisson est derrière
  vec3 LF = normalize(uFishPos - vW);
  float back = max(dot(-N, LF), 0.0);
  col += albedo * vec3(1.0, 0.62, 0.34) * back * uGlow * 0.35 / (1.0 + length(uFishPos - vW) * length(uFishPos - vW) / 4800.0);
  gl_FragColor = vec4(col, 1.0);
}`;

export function scarfUniforms(childU) {
  return { uAnchor: { value: new THREE.Matrix4() }, uTime: childU.uTime, uWind: { value: 0.3 }, uLift: { value: 0 },
    uCam: childU.uCam, uFishPos: childU.uFishPos, uGlow: childU.uGlow };
}

export function scarfMaterial(uniforms) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader: SCARF_VERT, fragmentShader: SCARF_FRAG, side: THREE.DoubleSide });
}

// ------------------------------------------------------------------ pose
const v = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const _q = new THREE.Quaternion(); const _m = new THREE.Matrix4(); const _a = new THREE.Vector3(); const _b = new THREE.Vector3();

/** Matrice d'un os : il tourne de q autour de son articulation de repos r, qui se retrouve en p. */
function boneMatrix(out, p, q, r) {
  out.makeRotationFromQuaternion(q);
  out.setPosition(_a.copy(p).sub(_b.copy(r).applyQuaternion(q)));
  return out;
}

export class ChildRig {
  constructor(data, uniforms) {
    this.names = data.bones;
    this.idx = Object.fromEntries(this.names.map((n, i) => [n, i]));
    this.rest = Object.fromEntries(this.names.map((n) => [n, [v(data.rig[n][0]), v(data.rig[n][1])]]));
    this.mats = uniforms.uBones.value;
    const r = this.rest;
    this.L1 = r.armN_u[0].distanceTo(r.armN_u[1]);
    this.L2 = r.armN_f[0].distanceTo(r.armN_f[1]);
    this.Lh = r.armN_h[0].distanceTo(r.armN_h[1]);
    this.shoulder = r.armN_u[0].clone();
    this.neck = r.head[0].clone();
    this.out = {};          // positions utiles après la pose : la pointe du doigt, la tête
  }

  /** Trouve le coude qui permet à une chaîne épaule - coude - poignet de longueurs l1 et l2 d'atteindre le poignet w. */
  solveElbow(s, w, pole, out) {
    const d = _a.copy(w).sub(s); let D = d.length();
    const max = this.L1 + this.L2 - 0.02; const min = Math.abs(this.L1 - this.L2) + 0.5;
    D = Math.min(max, Math.max(min, D));
    d.normalize();
    const a = (this.L1 * this.L1 - this.L2 * this.L2 + D * D) / (2 * D);
    const hgt = Math.sqrt(Math.max(this.L1 * this.L1 - a * a, 0));
    const pv = _b.copy(pole).addScaledVector(d, -pole.dot(d)).normalize();
    out.copy(s).addScaledVector(d, a).addScaledVector(pv, hgt);
    return out;
  }

  /**
   * Pose l'enfant. p : bounce (cm), lean (rad, vers l'avant), yaw et pitch du regard, reach : le point à désigner du doigt
   * (dans le repère de l'enfant, ou null), reachAmt de 0 à 1, swing de l'autre bras (rad).
   */
  pose(p) {
    const r = this.rest; const M = this.mats; const I = this.idx;
    // bassin
    const qPel = _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.sway || 0).clone();
    const pelP = r.pelvis[0].clone().add(new THREE.Vector3(0, p.bounce || 0, 0));
    boneMatrix(M[I.pelvis], pelP, qPel, r.pelvis[0]);
    // jambes : elles suivent le bassin, sauf quand l'enfant est au sol (le rebond les soulève)
    for (const n of ['legN_u', 'legN_l', 'legF_u', 'legF_l']) M[I[n]].copy(M[I.pelvis]);
    // buste : se penche autour du bas du dos
    const qChest = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -(p.lean || 0))
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.twist || 0));
    const qChestW = qPel.clone().multiply(qChest);
    const chP = r.chest[0].clone().applyMatrix4(M[I.pelvis]);
    boneMatrix(M[I.chest], chP, qChestW, r.chest[0]);
    // tête : tourne autour de la base du cou
    const qLook = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw || 0)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), p.pitch || 0));
    const qHead = qChestW.clone().multiply(qLook);
    const hdP = r.head[0].clone().applyMatrix4(M[I.chest]);
    boneMatrix(M[I.head], hdP, qHead, r.head[0]);
    this.out.head = r.head[1].clone().sub(r.head[0]).applyQuaternion(qHead).add(hdP);

    // bras proche : cinématique inverse vers le point désigné
    const S = r.armN_u[0].clone().applyMatrix4(M[I.chest]);
    const restDirs = { u: r.armN_u[1].clone().sub(r.armN_u[0]).normalize(), f: r.armN_f[1].clone().sub(r.armN_f[0]).normalize(), h: r.armN_h[1].clone().sub(r.armN_h[0]).normalize() };
    const E = new THREE.Vector3(); const W = new THREE.Vector3(); const F = new THREE.Vector3();
    const amt = p.reachAmt ?? 0;
    if (p.reach && amt > 0.001) {
      const T = p.reach.clone();
      const dirST = T.clone().sub(S); const dist = dirST.length(); dirST.normalize();
      // le doigt prolonge l'avant-bras : le poignet est en retrait du bout du doigt
      const maxReach = this.L1 + this.L2 + this.Lh * 0.95;
      const tipDist = Math.min(dist, maxReach);
      const Ft = S.clone().addScaledVector(dirST, tipDist);
      const Wt = Ft.clone().addScaledVector(dirST, -this.Lh);
      this.solveElbow(S, Wt, new THREE.Vector3(0.1, -1, 0.45), E);
      // mélange avec la pose de repos selon reachAmt
      const Er = r.armN_u[1].clone().applyMatrix4(M[I.chest]); const Wr = r.armN_f[1].clone().applyMatrix4(M[I.chest]); const Fr = r.armN_h[1].clone().applyMatrix4(M[I.chest]);
      E.lerpVectors(Er, E, amt); W.lerpVectors(Wr, Wt, amt); F.lerpVectors(Fr, Ft, amt);
    } else {
      E.copy(r.armN_u[1]).applyMatrix4(M[I.chest]); W.copy(r.armN_f[1]).applyMatrix4(M[I.chest]); F.copy(r.armN_h[1]).applyMatrix4(M[I.chest]);
    }
    const setBone = (name, start, end, key, P0) => {
      const nd = _a.copy(end).sub(start).normalize();
      _q.setFromUnitVectors(restDirs[key], nd);
      boneMatrix(M[I[name]], P0, _q, r[name][0]);
    };
    setBone('armN_u', S, E, 'u', S);
    setBone('armN_f', E, W, 'f', E);
    setBone('armN_h', W, F, 'h', W);
    this.out.tip = F.clone();

    // bras lointain : il suit le buste et se balance un peu
    const qSw = qChestW.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), p.swing || 0));
    const Sf = r.armF_u[0].clone().applyMatrix4(M[I.chest]);
    for (const n of ['armF_u', 'armF_f', 'armF_h']) boneMatrix(M[I[n]], Sf, qSw, r.armF_u[0]);
    return this;
  }
}
