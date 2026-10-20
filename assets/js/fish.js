// BlackPhage - le poisson. Un combattant (Betta) translucide qui nage dans l'air, couvert de vagues de bioluminescence.
// Tout est construit ici, sans fichier de modèle : un corps (une section elliptique qui varie le long de la colonne),
// de grandes nageoires en voile (nappes minces, avec leurs rayons), deux yeux. La nage et l'ondulation des nageoires
// sont animées dans le vertex shader : chaque nageoire porte une onde qui court de sa base vers son bord libre.
// Unité de longueur : 1 pour la longueur du corps du museau (x = +0,5) à la base de la queue (x = -0,28),
// soit environ 0,78 pour le corps seul, et 1,36 avec la queue déployée.
import * as THREE from 'three';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ forme du corps
const T_LEN = 0.78;
export const xOf = (t) => 0.5 - T_LEN * t;          // t = 0 au museau, 1 à la base de la queue

/** Interpolation cubique (tangentes de Catmull-Rom) à travers des points [x, y] triés. */
function spline(pts) {
  const n = pts.length; const m = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(i - 1, 0)]; const b = pts[Math.min(i + 1, n - 1)];
    m.push((b[1] - a[1]) / (b[0] - a[0]));
  }
  return (x) => {
    let i = 0; while (i < n - 2 && x > pts[i + 1][0]) i++;
    const [x0, y0] = pts[i]; const [x1, y1] = pts[i + 1]; const h = x1 - x0; const t = Math.min(1, Math.max(0, (x - x0) / h));
    const t2 = t * t; const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m[i + 1];
  };
}

const hProfile = spline([[0, 0], [0.010, 0.030], [0.035, 0.056], [0.080, 0.080], [0.150, 0.100], [0.250, 0.116], [0.380, 0.124],
  [0.510, 0.118], [0.640, 0.100], [0.770, 0.074], [0.890, 0.050], [1, 0.034]]);
const wRatio = spline([[0, 0.66], [0.2, 0.64], [0.45, 0.56], [0.75, 0.46], [1, 0.40]]);
const gill = (t) => smooth(0.10, 0.19, t) * (1 - smooth(0.255, 0.285, t));      // la joue, que borde l'opercule

/** Demi-hauteur du corps à l'abscisse t. */
export const halfHeight = (t) => Math.max(hProfile(t), 0);
const halfWidth = (t) => halfHeight(t) * wRatio(t) * (1 + 0.13 * gill(t));
const yc = (t) => 0.016 * (1 - smooth(0, 0.20, t));            // le museau se relève un peu
const belly = (t) => 1.10 + 0.04 * Math.sin(t * 3.0);          // le ventre descend un peu plus que le dos ne monte
const back = 0.93;

/** Point de la surface du corps, t le long de la colonne, a l'angle autour (0 = dos). */
function bodyPoint(t, a, out) {
  const h = halfHeight(t); const w = halfWidth(t);
  const c = Math.cos(a); const s = Math.sin(a);
  out.set(xOf(t), yc(t) + h * c * (c > 0 ? back : belly(t)), w * s);
  return out;
}
const ridge = (t) => yc(t) + halfHeight(t) * back;          // le dos
const underside = (t) => yc(t) - halfHeight(t) * belly(t);  // le ventre

// ------------------------------------------------------------------ constructeur de nappes
/**
 * Une grille de points (nu x nv) dont la position dépend de (u, v). En plus de la position, chaque sommet reçoit
 * la direction du rayon (R), la direction en travers (T) et les longueurs locales (M), pour que le shader sache
 * dans quel sens la nageoire ondule.
 */
function sheet(nu, nv, fn, part, attach) {
  const N = (nu + 1) * (nv + 1);
  const pos = new Float32Array(N * 3); const att = new Float32Array(N * 4); const fin = new Float32Array(N * 3);
  const rr = new Float32Array(N * 3); const tt = new Float32Array(N * 3); const mm = new Float32Array(N * 2);
  const p = new THREE.Vector3(); const f = {};
  const K = (i, j) => i * (nv + 1) + j;
  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= nv; j++) {
      const k = K(i, j); const u = i / nu; const v = j / nv;
      f.r = v; f.u = u; f.flex = 0;
      fn(u, v, p, f);
      pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
      const at = attach(u, v, f);                    // [tAttache, côté, éloignement du corps]
      att[k * 4] = at[0]; att[k * 4 + 1] = at[1]; att[k * 4 + 2] = at[2]; att[k * 4 + 3] = part;
      fin[k * 3] = f.r; fin[k * 3 + 1] = f.u; fin[k * 3 + 2] = f.flex;
    }
  }
  const R = new THREE.Vector3(); const U = new THREE.Vector3(); const T = new THREE.Vector3();
  const at3 = (k, o) => o.set(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
  const a3 = new THREE.Vector3(); const b3 = new THREE.Vector3();
  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= nv; j++) {
      const k = K(i, j);
      const i0 = Math.max(i - 1, 0); const i1 = Math.min(i + 1, nu); const j0 = Math.max(j - 1, 0); const j1 = Math.min(j + 1, nv);
      R.copy(at3(K(i, j1), a3)).sub(at3(K(i, j0), b3)).multiplyScalar(nv / (j1 - j0));       // d P / d v
      U.copy(at3(K(i1, j), a3)).sub(at3(K(i0, j), b3)).multiplyScalar(nu / (i1 - i0));       // d P / d u
      const lr = Math.max(R.length(), 1e-4); const lu = Math.max(U.length(), 1e-4);
      R.divideScalar(lr);
      T.copy(U).addScaledVector(R, -U.dot(R));
      if (T.lengthSq() < 1e-8) T.set(-R.y, R.x, 0);
      T.normalize();
      rr[k * 3] = R.x; rr[k * 3 + 1] = R.y; rr[k * 3 + 2] = R.z;
      tt[k * 3] = T.x; tt[k * 3 + 1] = T.y; tt[k * 3 + 2] = T.z;
      mm[k * 2] = lr; mm[k * 2 + 1] = lu;
    }
  }
  const idx = [];
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = K(i, j); const b = a + 1; const c = a + nv + 1; const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  return { pos, att, fin, rr, tt, mm, idx };
}

/** Une nageoire : des points d'attache B(u), une direction D(u) et une longueur l(u). Le point (u, v) est B + v l D. */
function fin({ nu, nr, base, dir, len, part, side, tOf, flex, shape }) {
  const B = new THREE.Vector3(); const D = new THREE.Vector3();
  return sheet(nu, nr, (u, v, p, f) => {
    base(u, B); dir(u, D);
    const l = len(u);
    p.copy(B).addScaledVector(D, v * l);
    if (shape) shape(u, v, p, f);
    f.flex = flex ? flex(u, v) : 1;
  }, part, (u, v) => [tOf(u), side, v * len(u)]);
}

function merge(parts) {
  const cat = (key) => { const out = []; for (const s of parts) for (let i = 0; i < s[key].length; i++) out.push(s[key][i]); return out; };
  const idx = []; let base = 0;
  for (const s of parts) { for (const i of s.idx) idx.push(i + base); base += s.pos.length / 3; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(cat('pos'), 3));
  g.setAttribute('aBody', new THREE.Float32BufferAttribute(cat('att'), 4));
  g.setAttribute('aFin', new THREE.Float32BufferAttribute(cat('fin'), 3));
  g.setAttribute('aR', new THREE.Float32BufferAttribute(cat('rr'), 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(cat('tt'), 3));
  g.setAttribute('aM', new THREE.Float32BufferAttribute(cat('mm'), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------------------ corps
const NC = 21;                                           // écailles autour du corps

/** Périmètre approché de la section (formule de Ramanujan). */
function circumference(t) {
  const a = halfHeight(t) * (back + belly(t)) * 0.5; const b = halfWidth(t);
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

function buildBody() {
  const NT = 130; const NA = 56;
  const N = (NT + 1) * (NA + 1);
  const pos = new Float32Array(N * 3); const att = new Float32Array(N * 4); const fn = new Float32Array(N * 3);
  const rr = new Float32Array(N * 3); const tt = new Float32Array(N * 3); const mm = new Float32Array(N * 2);
  // les écailles rapetissent vers la queue : on cumule le nombre de rangées le long du corps
  const rows = new Float32Array(NT + 1);
  for (let i = 1; i <= NT; i++) rows[i] = rows[i - 1] + (T_LEN / NT) / Math.max(circumference((i - 0.5) / NT) / NC, 0.0065);
  const p = new THREE.Vector3(); const idx = [];
  for (let i = 0; i <= NT; i++) {
    const t = i / NT;
    for (let j = 0; j <= NA; j++) {
      const k = i * (NA + 1) + j; const a = (j / NA) * Math.PI * 2;
      bodyPoint(t, a, p);
      pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
      att[k * 4] = t; att[k * 4 + 1] = Math.cos(a);
      fn[k * 3] = rows[i]; fn[k * 3 + 1] = (j / NA) * NC;
    }
  }
  for (let i = 0; i < NT; i++) {
    for (let j = 0; j < NA; j++) {
      const a = i * (NA + 1) + j; const b = a + 1; const c = a + NA + 1; const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  return { pos, att, fin: fn, rr, tt, mm, idx };
}

// ------------------------------------------------------------------ nageoires
/** Dorsale : naît sur le dos, se dresse, et file loin derrière en un long voile. */
function buildDorsal() {
  const t0 = 0.36; const t1 = 0.72;
  const tOf = (u) => lerp(t0, t1, u);
  return fin({
    nu: 64, nr: 24, part: 1, side: 1, tOf,
    base: (u, o) => o.set(xOf(tOf(u)), ridge(tOf(u)) * 0.92, 0),
    dir: (u, o) => { const a = lerp(0.04, 0.88, Math.pow(u, 1.05)); return o.set(-Math.sin(a), Math.cos(a), 0); },
    len: (u) => 0.070 + 0.190 * Math.pow(Math.sin(Math.PI * 0.5 * Math.min(u / 0.55, 1)), 0.85) + 0.080 * smooth(0.50, 1.0, u),
    shape: (u, v, p) => { p.y -= 0.040 * v * v * (0.20 + u); p.z = 0.011 * Math.sin(u * 11.0 + v * 3.0); },
    flex: (u) => 0.40 + 0.60 * u,
  });
}

/** Queue : un grand éventail de voile, qui retombe en drapé. */
function buildTail() {
  const xp = xOf(1.0) + 0.004;
  return fin({
    nu: 76, nr: 32, part: 2, side: 0, tOf: () => 1.0,
    base: (u, o) => o.set(xp, yc(1.0) + (u * 2 - 1) * 0.030, 0),
    dir: (u, o) => { const a = (u * 2 - 1) * 1.20; return o.set(-Math.cos(a), Math.sin(a) - 0.02, 0); },
    len: (u) => 0.53 * (0.84 + 0.16 * Math.pow(Math.abs(u * 2 - 1), 1.6)) * (u < 0.5 ? 1.0 : 0.88),    // les rayons du bas, plus courts, gardent la queue loin du sol
    shape: (u, v, p) => {
      const e = v * v; const s = u * 2 - 1;
      p.y -= 0.050 * e;
      p.z += 0.05 * Math.sin(s * 4.2 + v * 6.0) * e + 0.018 * Math.sin(v * 13.0 + s * 5.0) * e;
    },
    flex: (u) => 0.70 + 0.30 * Math.abs(u * 2 - 1),
  });
}

/** Pectorale : un petit éventail transparent sur le flanc, qui bat sans cesse. */
function buildPectoral(side) {
  const t0 = 0.30;
  return fin({
    nu: 16, nr: 14, part: 3, side: -0.2, tOf: () => t0,
    base: (u, o) => bodyPoint(t0 + 0.035 * u, side * 2.0, o),
    dir: (u, o) => { const a = (u - 0.5) * 1.3; return o.set(-0.82 * Math.cos(a), -0.30 + 0.55 * Math.sin(a), side * 0.40).normalize(); },
    len: (u) => 0.20 * Math.pow(Math.sin(Math.PI * (0.10 + 0.80 * u)), 0.6),
    flex: () => 1,
  });
}

/** Pelviennes : deux longs rubans, dont le premier rayon file en filament. Ils pendent sous le menton et traînent. */
function buildPelvic(side) {
  const t0 = 0.285;
  return fin({
    nu: 10, nr: 36, part: 4, side: -1, tOf: () => t0 + 0.02,
    base: (u, o) => { const t = t0 + 0.05 * u; return o.set(xOf(t), underside(t) * 0.92, side * halfWidth(t) * 0.40); },
    dir: (u, o) => o.set(-0.24 - 0.09 * u, -0.93, side * (0.10 + 0.03 * u)).normalize(),
    len: (u) => 0.44 * (1 - 0.55 * Math.pow(u, 0.8)),
    shape: (u, v, p) => { p.x -= 0.20 * v * v; p.y += 0.05 * v * v; p.z += side * 0.02 * v * Math.sin(u * 3.0 + v * 4.0); },
    flex: () => 1,
  });
}

/** Anale : un long voile sous le ventre, qui se prolonge jusqu'à la queue. */
function buildAnal() {
  const t0 = 0.45; const t1 = 0.94;
  const tOf = (u) => lerp(t0, t1, u);
  return fin({
    nu: 60, nr: 22, part: 5, side: -1, tOf,
    base: (u, o) => o.set(xOf(tOf(u)), underside(tOf(u)) * 0.94, 0),
    dir: (u, o) => { const a = lerp(0.18, 1.10, Math.pow(u, 1.05)); return o.set(-Math.sin(a), -Math.cos(a), 0); },
    len: (u) => 0.060 + 0.200 * Math.pow(Math.sin(Math.PI * 0.5 * Math.min(u / 0.60, 1)), 0.9) + 0.050 * smooth(0.55, 1.0, u),
    shape: (u, v, p) => { p.y += 0.02 * v * v; p.z = 0.011 * Math.sin(u * 9.0 + v * 3.0); },
    flex: (u) => 0.40 + 0.60 * u,
  });
}

// ------------------------------------------------------------------ yeux
const EYE_T = 0.092;
function buildEyes() {
  const pos = []; const nor = []; const idx = []; let base = 0;
  for (const side of [-1, 1]) {
    const gg = new THREE.SphereGeometry(0.031, 28, 20);
    gg.scale(1, 1.04, 0.86);
    gg.translate(xOf(EYE_T), yc(EYE_T) + halfHeight(EYE_T) * 0.30, side * halfWidth(EYE_T) * 0.90);
    for (const v of gg.attributes.position.array) pos.push(v);
    for (const v of gg.attributes.normal.array) nor.push(v);
    for (const i of gg.index.array) idx.push(i + base);
    base += gg.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}

/** Les géométries du poisson. body : le corps, mid : dorsale, queue et anale, left et right : pectorale et pelvienne de chaque côté. */
export function buildFishGeometry() {
  return {
    body: merge([buildBody()]),
    mid: merge([buildDorsal(), buildTail(), buildAnal()]),
    left: merge([buildPectoral(-1), buildPelvic(-1)]),
    right: merge([buildPectoral(1), buildPelvic(1)]),
    eyes: buildEyes(),
  };
}

export const FISH_LENGTH = 1.36;    // museau au bout de la queue, en unités de corps
const EYE_C = [xOf(EYE_T), yc(EYE_T) + halfHeight(EYE_T) * 0.30];

// ------------------------------------------------------------------ matière
// Le corps est translucide : une teinte violette qui se densifie sur les bords, et dessus une lumière vivante.
// La bioluminescence se compose de quatre choses : de grandes taches orange qui dérivent vers la queue, de fines
// veines, des vagues régulières qui descendent le long du corps, et les vagues que déclenche un clic.
// Sur les nageoires, la lumière descend les rayons par impulsions, et un reflet suit l'ondulation du voile.
const FISH_VERT = /* glsl */ `
attribute vec4 aBody;   // x : abscisse du point d'attache sur le corps (0 museau, 1 queue), y : côté (-1 ventre, 1 dos), z : éloignement du corps, w : pièce
attribute vec3 aFin;    // nageoire : x de la base (0) au bord libre (1), y en travers, z souplesse. Corps : x rangée d'écailles, y colonne
attribute vec3 aR;      // direction du rayon (de la base vers le bord libre)
attribute vec3 aT;      // direction en travers, dans le plan de la nageoire
attribute vec2 aM;      // longueurs locales : le long du rayon, en travers
uniform float uPhase; uniform float uFinPhase; uniform float uSwimAmp; uniform float uBend; uniform float uFlutter;
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec4 vBody; varying vec3 vFin; varying float vRip;
void main(){
  vec3 p = position;
  vec3 n = normal;
  float part = aBody.w;
  float rip = 0.0;
  if (part > 0.5) {
    // l'ondulation du voile : une onde court de la base vers le bord libre et d'un bout à l'autre de la base,
    // en travers du plan (elle se voit au relief et à la lumière) et dans le plan (elle se voit à la silhouette)
    float r = aFin.x; float a = aFin.y; float fl = aFin.z;
    float kr; float ka; float ao; float ai; float sp;
    if (part < 1.5)      { kr = 5.4; ka = 3.4; ao = 0.090; ai = 0.060; sp = 1.00; }   // dorsale
    else if (part < 2.5) { kr = 4.6; ka = 3.6; ao = 0.100; ai = 0.048; sp = 0.92; }   // queue
    else if (part < 3.5) { kr = 4.0; ka = 4.0; ao = 0.045; ai = 0.030; sp = 3.40; }   // pectorale
    else if (part < 4.5) { kr = 6.0; ka = 1.6; ao = 0.050; ai = 0.045; sp = 1.15; }   // pelvienne
    else                 { kr = 5.4; ka = 3.4; ao = 0.085; ai = 0.050; sp = 1.00; }   // anale
    float ph = uFinPhase * sp - r * kr - a * ka;
    float ph2 = uFinPhase * sp * 1.63 - r * kr * 1.9 + a * ka * 0.8 + 1.7;
    float rc = max(r, 1e-3);
    float rr = pow(rc, 1.2);
    float k = fl * uFlutter;
    float s1 = sin(ph); float s2 = sin(ph2); float c1 = cos(ph); float c2 = cos(ph2);
    float hOut = ao * k * rr * (s1 + 0.45 * s2);
    float hIn = ai * k * rr * (sin(ph + 1.2) + 0.40 * sin(ph2 + 0.6));
    p += n * hOut + aT * hIn;
    // la normale suit la pente du relief : c'est elle qui fait courir la lumière sur le voile
    float dhdr = ao * k * (1.2 * pow(rc, 0.2) * (s1 + 0.45 * s2) - rr * kr * (c1 + 0.45 * 1.9 * c2));
    float dhda = ao * k * rr * (-ka * c1 + 0.45 * 0.8 * ka * c2);
    n = normalize(n - (dhdr / max(aM.x, 1e-3)) * aR - (dhda / max(aM.y, 1e-3)) * aT);
    rip = s1;
  }
  // la nage : une onde le long du corps, qui grandit vers la queue
  float s = clamp((0.5 - position.x) / 1.36, 0.0, 1.0);          // du museau (0) au bout de la queue (1)
  float amp = uSwimAmp * (0.04 + 0.96 * s * s);
  float ph = uPhase - s * 5.4;
  float dz = amp * sin(ph) + uBend * s * s;
  float dzds = uSwimAmp * 1.92 * s * sin(ph) - amp * 5.4 * cos(ph) + uBend * 2.0 * s;
  p.z += dz;
  // vue de profil, l'ondulation en profondeur ne se voit pas : on lui ajoute un léger roulis vertical
  p.y += uSwimAmp * 0.55 * (0.04 + 0.96 * s * s) * sin(ph + 1.3);
  n.x += dzds / 1.36 * n.z;
  vN = normalize(mat3(modelMatrix) * n);
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz; vP = position; vBody = aBody; vFin = aFin; vRip = rip;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FISH_FRAG = /* glsl */ `
uniform float uTime; uniform float uEnergy; uniform float uHover; uniform vec3 uCam; uniform vec4 uWave[4]; uniform float uPass; uniform float uSeed;
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec4 vBody; varying vec3 vFin; varying float vRip;

float hash31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float hash21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x), mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x), mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }

vec3 bioColor(float b){
  vec3 pink = vec3(0.86, 0.36, 0.78);
  vec3 orange = vec3(1.00, 0.56, 0.22);
  vec3 hot = vec3(1.00, 0.90, 0.72);
  vec3 c = mix(pink, orange, smoothstep(0.10, 0.65, b));
  return mix(c, hot, smoothstep(1.25, 2.4, b));
}

// un trait de largeur w au centre de chaque case de x, adouci selon la résolution de l'écran
float lineAt(float x, float w){
  float d = abs(fract(x + 0.5) - 0.5);
  float aa = fwidth(x) * 0.8 + 1e-4;
  float l = 1.0 - smoothstep(w - aa, w + aa, d);
  return mix(2.0 * w, l, 1.0 - smoothstep(0.30, 0.85, fwidth(x)));       // quand les traits se serrent trop, on garde leur moyenne
}

// écailles : des rangées serrées, chacune décalée d'une demi-case de la précédente ; chaque écaille montre son arc arrière,
// posé sur celle de derrière. g : (rangée, colonne), la rangée comptée en cases entières.
// Retourne x : l'arc (1 sur le bord libre), y : un éclat doux au bord de l'écaille, z : l'ombre portée sur l'écaille de derrière
vec3 scalePattern(vec2 g){
  const float R = 0.52;
  float gx = g.x * 2.0;                                // le pas des rangées est la moitié de celui des colonnes
  float row = floor(gx);
  float sh0 = 0.5 * mod(row, 2.0);
  float cy0 = floor(g.y - sh0 + 0.5) + sh0;
  float d0 = length(vec2((gx - row) * 0.5, g.y - cy0));
  float arc = exp(-pow((d0 - R) / 0.045, 2.0));
  float shine = (1.0 - smoothstep(R * 0.35, R, d0)) * smoothstep(0.0, 0.3, d0 - R * 0.35 + 0.3);
  float shade = exp(-pow((d0 - R - 0.07) / 0.07, 2.0)) * step(R, d0);
  return vec3(arc, shine, shade);
}

// le squelette vu à travers le corps : l'épine et ses vertèbres, les côtes, la vessie natatoire
float xray(vec3 p, float tb){
  float ysp = 0.016 - 0.050 * smoothstep(0.25, 1.0, tb);
  float dy = p.y - ysp;
  float spineLine = exp(-pow(dy / 0.0075, 2.0)) * smoothstep(0.17, 0.26, tb) * (1.0 - smoothstep(0.94, 1.0, tb));
  float seg = pow(0.5 + 0.5 * cos(p.x * 170.0), 2.0);
  float vert = spineLine * (0.35 + 0.65 * seg);
  float down = clamp(-dy, 0.0, 0.2);
  float ribMask = smoothstep(0.26, 0.31, tb) * (1.0 - smoothstep(0.50, 0.58, tb)) * smoothstep(0.0, 0.012, down) * (1.0 - smoothstep(0.06, 0.095, down));
  float rib = pow(0.5 + 0.5 * cos(6.2831853 * (p.x * 24.0 + down * 7.0)), 8.0) * ribMask;
  vec2 bq = (p.xy - vec2(0.5 - 0.78 * 0.43, -0.035)) / vec2(0.075, 0.034);
  float bladder = (1.0 - smoothstep(0.55, 1.0, length(bq))) * 0.22;
  return vert * 0.9 + rib * 0.45 + bladder;
}

void main(){
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vW);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.0);
  float t = uTime;
  float part = vBody.w;
  bool isFin = part > 0.5;
  vec3 p = vP;

  // ---- la bioluminescence du corps
  vec3 q = p * vec3(2.3, 3.1, 2.6) + vec3(-t * 0.15, 0.0, t * 0.04) + uSeed;
  float n1 = fbm(q);
  float blot = smoothstep(0.36, 0.68, n1);                         // grandes taches
  float n2 = vnoise(p * vec3(7.5, 9.0, 7.5) + vec3(-t * 0.55, t * 0.1, uSeed));
  float vein = pow(1.0 - abs(n2 * 2.0 - 1.0), 8.0);                // fines veines
  float bandPh = p.x * 8.5 + 1.1 * sin(p.y * 6.0 + t * 0.7) + 2.4 * (n1 - 0.5) - t * (1.25 + 1.6 * uEnergy);
  float band = pow(0.5 + 0.5 * sin(bandPh), 6.0);                  // vagues qui descendent le corps
  float lateral = 1.0 - 0.55 * abs(vBody.y);                       // plus vives sur les flancs que sur le ventre
  float spine = exp(-pow((p.y - 0.17 * (0.5 - p.x) * 0.5) / 0.018, 2.0)) * (1.0 - smoothstep(0.05, 0.30, p.x)) * 0.30;   // un trait de lumière sur le dos
  float bio = blot * (0.70 + 1.20 * band) * lateral + vein * (0.25 + 0.60 * blot) + band * 0.22 * blot + spine * (0.4 + band);

  float edge = 0.0; float rays = 0.0; float memb = 0.0; float tipGlow = 0.0;
  float detail = 0.0; float xr = 0.0;
  if (isFin) {
    float r = vFin.x; float a = vFin.y;
    float rayN = part < 1.5 ? 34.0 : (part < 2.5 ? 46.0 : (part < 3.5 ? 15.0 : (part < 4.5 ? 4.0 : 38.0)));
    float x = a * rayN;
    float wRay = 0.06 + 0.07 * r;
    float ray1 = lineAt(x, wRay);
    float ray2 = lineAt(x * 2.0 + 0.5, wRay * 1.15);               // les rayons se divisent vers le bord
    float fork = smoothstep(0.40, 0.62, r);
    rays = max(ray1, ray2 * fork * 0.8);
    // bord libre festonné : chaque rayon dépasse un peu de la membrane
    float scallop = 0.5 + 0.5 * cos(x * 6.2831853);
    float rEdge = 1.0 - (part > 3.5 && part < 4.5 ? 0.0 : 0.012) * (1.0 - scallop);
    edge = smoothstep(0.84, 1.0, r);
    memb = 1.0 - smoothstep(rEdge - 0.025, rEdge, r);
    tipGlow = smoothstep(0.93, 1.0, r) * rays;
    // la lumière descend les rayons par impulsions qui partent de la base
    float pulse = pow(0.5 + 0.5 * sin(r * 11.0 - t * (1.7 + 2.4 * uEnergy) + a * 5.0 + uSeed * 3.0), 6.0);
    float pulse2 = pow(0.5 + 0.5 * sin(r * 6.0 - t * (1.1 + 1.4 * uEnergy) - a * 2.0 + 2.0), 10.0);
    float fr = 1.0 - 0.45 * r;
    float ripl = 0.5 + 0.5 * vRip;                                    // le reflet qui suit l'ondulation du voile
    float soften = part > 3.5 && part < 4.5 ? 0.55 : 1.0;
    bio = (0.16 * blot * (0.6 + 0.8 * band) + vein * 0.06 + rays * (0.14 + 0.62 * pulse + 0.30 * pulse2) * fr + tipGlow * 0.55 + edge * (0.10 + 0.20 * band)
        + rays * ripl * 0.10 + pulse2 * 0.08 * memb) * soften;
    bio *= memb;
  } else {
    float tb = vBody.x;
    // ---- les écailles
    vec3 sc = scalePattern(vec2(vFin.x, vFin.y));
    float scaleFade = smoothstep(0.17, 0.30, tb) * (1.0 - smoothstep(0.93, 0.995, tb)) * (1.0 - smoothstep(0.2, 0.65, fwidth(vFin.x) * 4.0)) * (uPass > 0.5 ? 1.0 : 0.0);
    float glint = pow(vnoise(vec3(vFin.x * 0.7, vFin.y * 0.7, t * 0.35 + uSeed)), 3.0);
    bio += sc.x * scaleFade * (0.10 + 0.50 * band * lateral + 0.35 * blot + 0.35 * glint);
    detail += (sc.x * 0.20 + sc.y * 0.05 - sc.z * 0.10) * scaleFade;
    if (uPass < 0.5) xr = xray(p, tb);
    // ---- la tête : l'opercule, l'arc de l'œil, la bouche
    float yn = clamp(p.y / 0.12, -1.0, 1.0);
    float gillT = 0.272 - 0.052 * yn * yn;
    float gl = exp(-pow((tb - gillT) / 0.0050, 2.0)) * smoothstep(0.0, 0.3, abs(vBody.y) * 0.0 + 1.0);
    float cheek = smoothstep(0.255, 0.285, tb) * 0.0;
    vec2 ed = vec2(p.x - ${EYE_C[0].toFixed(4)}, p.y - ${EYE_C[1].toFixed(4)});
    float eyeRing = exp(-pow((length(ed) - 0.044) / 0.0065, 2.0)) * smoothstep(0.02, 0.06, abs(vP.z));
    float mouthY = -0.018 - 0.26 * tb;
    float mouth = exp(-pow((p.y - mouthY) / 0.0042, 2.0)) * (1.0 - smoothstep(0.03, 0.075, tb)) * smoothstep(0.0, 0.012, tb);
    bio += gl * (0.20 + 0.7 * band) + eyeRing * (0.55 + 0.4 * uEnergy) + mouth * 0.35;
    detail += gl * 0.10 + mouth * 0.25;
    // ---- la ligne latérale : un fil de lumière d'un opercule à la queue
    float latLine = exp(-pow((p.y - (0.012 - 0.050 * smoothstep(0.2, 1.0, tb) + 0.012 * sin(tb * 9.0))) / 0.0085, 2.0)) * smoothstep(0.26, 0.36, tb) * (1.0 - smoothstep(0.85, 1.0, tb));
    bio += latLine * (0.10 + 0.75 * band) * smoothstep(0.0, 0.05, abs(vP.z));
  }

  // ---- les vagues d'un clic : un anneau qui s'étend depuis le point touché, avec une traîne
  // La distance compte le long du corps, un peu en travers, et davantage le long des nageoires : elles s'allument après.
  float wave = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 w = uWave[i];
    float age = t - w.y;
    if (w.z > 0.0 && age > 0.0 && age < 4.5) {
      float dt = (vBody.x - w.x) * 0.78;
      float dv = (vBody.y - w.w) * 0.16;
      float d = length(vec3(dt, dv, vBody.z * 1.50));
      float front = age * 0.85;
      float ring = exp(-pow((d - front) / (0.040 + 0.035 * age), 2.0));
      float trail = exp(-age * 0.9) * (1.0 - smoothstep(0.0, front + 0.04, d));
      float spark = pow(vnoise(vec3(p.x * 30.0, p.y * 30.0, p.z * 30.0 + t * 3.0)), 3.0) * ring;
      float onRay = isFin ? (0.55 + 0.9 * rays) : 1.0;
      wave += w.z * (ring * 0.95 * onRay + trail * (isFin ? 0.12 : 0.30) + spark * 0.9) * (isFin ? memb : 1.0);
    }
  }
  bio += wave;
  bio *= (isFin ? 1.0 : 0.84) * (1.0 + 0.55 * uEnergy + 0.45 * uHover);
  float cap = isFin ? 1.35 : 1.7;
  bio = cap * tanh(bio / cap);

  // ---- la teinte
  vec3 deep = vec3(0.26, 0.30, 0.78);
  vec3 violet = vec3(0.50, 0.40, 0.86);
  vec3 pale = vec3(0.72, 0.78, 1.00);
  float belly = smoothstep(-0.12, 0.10, p.y);
  vec3 tint = mix(deep, violet, belly * 0.8 + 0.1 * blot);
  float alpha; vec3 base;
  if (isFin) {
    float r = vFin.x;
    vec3 fa = mix(vec3(0.30, 0.30, 0.84), vec3(0.62, 0.50, 0.96), smoothstep(0.0, 0.7, r));
    fa = mix(fa, vec3(0.92, 0.58, 0.86), smoothstep(0.55, 1.0, r) * 0.55);
    float ripl = 0.5 + 0.5 * vRip;
    float root = 1.0 - smoothstep(0.0, 0.34, r);                    // la membrane est plus dense là où elle naît du corps
    float seam = exp(-pow(r / 0.020, 2.0));
    alpha = (0.060 + 0.20 * fres + 0.10 * edge + 0.05 * ripl + 0.27 * root + 0.30 * seam) * memb + rays * (0.16 + 0.12 * (1.0 - r) + 0.14 * root) * memb;
    base = fa * (0.60 + 0.65 * fres + 0.25 * ripl) + pale * (rays * 0.55 + fres * 0.30 + root * 0.40 + seam * 0.5);
  } else {
    alpha = 0.26 + 0.40 * fres;
    base = tint * (0.55 + 0.7 * fres) + pale * fres * 0.45;
    base += vec3(0.70, 0.78, 1.0) * max(detail, 0.0) * 0.8 - base * max(-detail, 0.0);
    alpha += max(detail, 0.0) * 0.5;
    // un reflet irisé sur les écailles
    base += (0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + vFin.x * 0.05 + ndv * 0.6 + t * 0.02))) * 0.05 * fres;
  }
  if (uPass < 0.5) { alpha *= 0.55; base *= 0.8; bio *= 0.7; }      // l'intérieur, vu à travers le corps

  vec3 emit = bioColor(bio) * bio * (isFin ? 0.88 : 1.0) + vec3(0.78, 0.84, 1.0) * xr * 0.55;
  float a = clamp(alpha + 0.55 * min(bio, 1.0), 0.0, 0.96);
  gl_FragColor = vec4(base * alpha + emit, a);
}`;

const EYE_VERT = /* glsl */ `
uniform float uPhase; uniform float uSwimAmp; uniform float uBend;
varying vec3 vN; varying vec3 vW; varying vec3 vL; varying float vSide;
void main(){
  vec3 p = position;
  float s = clamp((0.5 - p.x) / 1.36, 0.0, 1.0);
  float amp = uSwimAmp * (0.04 + 0.96 * s * s);
  float ph = uPhase - s * 5.4;
  p.z += amp * sin(ph) + uBend * s * s;
  p.y += uSwimAmp * 0.55 * (0.04 + 0.96 * s * s) * sin(ph + 1.3);
  vN = normalize(mat3(modelMatrix) * normal);
  vL = normal; vSide = position.z >= 0.0 ? 1.0 : -1.0;
  vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const EYE_FRAG = /* glsl */ `
uniform vec3 uCam; uniform float uTime; uniform float uEnergy; varying vec3 vN; varying vec3 vW; varying vec3 vL; varying float vSide;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(uCam - vW);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  vec3 axis = normalize(vec3(0.30, 0.10, vSide));
  float c = dot(normalize(vL), axis);                           // 1 au centre de la pupille
  float pupil = smoothstep(0.915, 0.935, c);
  float irisR = smoothstep(0.70, 0.74, c) * (1.0 - pupil);
  float ringB = exp(-pow((c - 0.935) / 0.016, 2.0));
  vec3 head = mix(vec3(0.05, 0.04, 0.16), vec3(0.20, 0.16, 0.45), pow(1.0 - ndv, 2.0));
  float rad = clamp((0.935 - c) / 0.235, 0.0, 1.0);           // 0 au bord de la pupille, 1 au bord de l'iris
  vec3 iris = mix(vec3(1.0, 0.72, 0.28), vec3(0.78, 0.26, 0.40), rad);
  float fleck = 0.6 + 0.4 * sin(atan(vL.y - 0.10, vL.x + 0.30 * vSide) * 17.0 + rad * 5.0 + uTime * 0.6);
  iris *= (0.55 + 0.55 * fleck) * (0.75 + 0.5 * uEnergy);
  vec3 col = head;
  col = mix(col, iris, irisR);
  col += vec3(1.0, 0.62, 0.36) * ringB * 0.55;
  col = mix(col, vec3(0.012, 0.010, 0.04), pupil);
  vec3 L = normalize(vec3(-0.5, 0.8, 0.6));
  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 90.0);
  float spec2 = pow(max(dot(N, normalize(vec3(0.6, -0.3, 0.7) + V)), 0.0), 40.0) * 0.25;
  col += vec3(1.0, 0.96, 0.92) * (spec + spec2);
  gl_FragColor = vec4(col, 1.0);
}`;

/** Les uniformes partagés par toutes les pièces du poisson. */
export function fishUniforms() {
  return {
    uTime: { value: 0 }, uPhase: { value: 0 }, uFinPhase: { value: 0 }, uSwimAmp: { value: 0.05 }, uBend: { value: 0 }, uFlutter: { value: 1 },
    uEnergy: { value: 0 }, uHover: { value: 0 }, uCam: { value: new THREE.Vector3(0, 0, 10) }, uSeed: { value: 0 },
    uWave: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
  };
}

const premultiplied = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };

/** Les matières : l'intérieur du corps (faces arrière), l'extérieur (faces avant), les nageoires, les yeux. */
export function fishMaterials(uniforms) {
  const mk = (side, pass) => new THREE.ShaderMaterial({ uniforms: { ...uniforms, uPass: { value: pass } }, vertexShader: FISH_VERT, fragmentShader: FISH_FRAG, side, ...premultiplied });
  return {
    back: mk(THREE.BackSide, 0),
    front: mk(THREE.FrontSide, 1),
    fins: mk(THREE.DoubleSide, 1),
    eyes: new THREE.ShaderMaterial({ uniforms, vertexShader: EYE_VERT, fragmentShader: EYE_FRAG }),
  };
}
