// BlackPhage - forme 4 : le flux de signal. Le nuage de cubes gris devient un signal : une tresse de quatre brins (trois sur les
// appareils faibles) qui sort du bas du récepteur, passe par quatre nœuds (chacun une grappe poreuse de cubes : coque Deep Canyon
// Blue et gris, cœur Timber Glow qu'on aperçoit par les pores) et se défait en une dispersion de cubes vers y = -6. Les perles
// Timber Glow qui courent sur les brins sont des impulsions figées.
// Repère de la forme = repère FRAME (frame.js), SANS recentrage : l'origine est celle de la membrane, la forme occupe y de -0.87 à -6.3,
// aux mêmes x et z que les nœuds de signal.js. Le résultat porte aussi center et bounds ([x0, y0, z0, x1, y1, z1]).
// Export par défaut : build(n, seed). Exports nommés pour signal.js (le maillage et les cubes coïncident) : getSpine() (la ligne
// centrale), getLinks() (les quatre liens), NODE_FORMS (les quatre nœuds en champ de distance), BUD_FORM et les distances signées.
// Calcul pur, aucune dépendance à three.
import { FRAME } from './frame.js';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function rng(seed) {
  let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function hash3(x, y, z, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177) + Math.imul(s | 0, 1103515245)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, s) {   // bruit de valeur 1D, entre 0 et 1
  const i = Math.floor(x); let f = x - i; f = f * f * (3 - 2 * f);
  const a = hash3(i, 7, 3, s); const b = hash3(i + 1, 7, 3, s);
  return a + (b - a) * f;
}

/* ------------------------------------------------------------------ distances signées (exportées pour signal.js) */
export const hyp3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
export const sdSphere = (x, y, z, r) => hyp3(x, y, z) - r;
export function sdEllipsoid(x, y, z, rx, ry, rz) {
  const k0 = hyp3(x / rx, y / ry, z / rz); const k1 = hyp3(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
export function sdRoundBox(x, y, z, bx, by, bz, r) {
  const qx = Math.abs(x) - bx; const qy = Math.abs(y) - by; const qz = Math.abs(z) - bz;
  return hyp3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
export function sdCylZ(x, y, z, r, h) {   // cylindre d'axe z, rayon r, demi-hauteur h
  const dx = Math.hypot(x, y) - r; const dz = Math.abs(z) - h;
  return Math.min(Math.max(dx, dz), 0) + Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
}
export const sdCylX = (x, y, z, r, h) => sdCylZ(y, z, x, r, h);
export const sdTorusZ = (x, y, z, R, r) => Math.hypot(Math.hypot(x, y) - R, z) - r;
export function sdCapsule(x, y, z, ax, ay, az, bx, by, bz, r) {
  const pax = x - ax; const pay = y - ay; const paz = z - az; const bax = bx - ax; const bay = by - ay; const baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}
export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const smax = (a, b, k) => -smin(-a, -b, k);

/* ------------------------------------------------------------------ les quatre nœuds, une forme d'enzyme chacun
   shell(x, y, z) : distance signée du corps ; glow(x, y, z) : distance signée du volume qui brille (cœur, fente, bille).
   Coordonnées locales, centrées sur le nœud (unités FRAME). rIn / rOut : de combien la ligne centrale s'enfonce dans le nœud. */
const KS = 1.12;   // échelle commune des nœuds
const C_ = Math.cos(0.55); const S_ = Math.sin(0.55);
const FORMS = [
  { // 0 : cube arrondi, une prise ronde devant (le site actif brille dedans) et une prise à gauche, où la sous-unité alpha s'amarre
    name: 'cube', rIn: 0.225, rOut: 0.225,
    shell(x, y, z) {
      let d = sdRoundBox(x, y, z, 0.12, 0.12, 0.12, 0.075);
      d = smax(d, -sdCylZ(x, y, z - 0.19, 0.058, 0.05), 0.02);
      d = smax(d, -sdCylX(x + 0.19, y, z, 0.047, 0.04), 0.02);
      return d;
    },
    glow: (x, y, z) => sdSphere(x, y, z - 0.098, 0.064),
    core2: (x, y, z) => sdRoundBox(x, y, z - 0.01, 0.03, 0.03, 0.03, 0.026),
  },
  { // 1 : deux lobes (une kinase), une fente de devant où le site actif brille
    name: 'kinase', rIn: 0.225, rOut: 0.225,
    shell(x, y, z) {
      const a = sdEllipsoid(x + 0.03, y - 0.105, z, 0.135, 0.095, 0.125);
      const b = sdEllipsoid(x - 0.015, y + 0.07, z, 0.17, 0.125, 0.15);
      let d = smin(a, b, 0.07);
      d = smin(d, sdSphere(x + 0.14, y + 0.13, z - 0.05, 0.055), 0.04);
      d = smax(d, -sdEllipsoid(x - 0.07, y - 0.03, z - 0.14, 0.1, 0.03, 0.085), 0.03);
      return d;
    },
    glow: (x, y, z) => sdEllipsoid(x - 0.065, y - 0.032, z - 0.085, 0.075, 0.022, 0.055),
    core2: (x, y, z) => Math.min(sdEllipsoid(x + 0.03, y - 0.1, z, 0.05, 0.03, 0.045), sdEllipsoid(x - 0.015, y + 0.07, z, 0.075, 0.045, 0.06)),
  },
  { // 2 : une pince en anneau ouverte en bas, une bille lumineuse enfilée dedans
    name: 'clamp', rIn: 0.22, rOut: 0.22,
    shell(x, y, z) {
      const yy = C_ * y - S_ * z; const zz = S_ * y + C_ * z;
      let d = sdTorusZ(x, yy, zz, 0.158, 0.06);
      d = smax(d, -sdRoundBox(x, yy + 0.158, zz, 0.034, 0.06, 0.12, 0.01), 0.015);
      d = smin(d, sdSphere(x, yy - 0.158, zz, 0.074), 0.05);
      return d;
    },
    glow: (x, y, z) => sdSphere(x, y, z, 0.056),
    core2: (x, y, z) => { const yy = C_ * y - S_ * z; const zz = S_ * y + C_ * z; return sdTorusZ(x, yy, zz, 0.158, 0.026); },
  },
  { // 3 : quatre lobes en tétraèdre autour d'un cœur qui brille entre eux
    name: 'tetra', rIn: 0.26, rOut: 0.26,
    shell(x, y, z) {
      const a = 0.15 / Math.sqrt(3); const r = 0.092;
      return Math.min(sdSphere(x - a, y - a, z - a, r), sdSphere(x - a, y + a, z + a, r), sdSphere(x + a, y - a, z + a, r), sdSphere(x + a, y + a, z - a, r));
    },
    glow: (x, y, z) => sdSphere(x, y, z, 0.086),
    core2: (x, y, z) => { const a = 0.15 / Math.sqrt(3); const r = 0.04; return Math.min(sdSphere(x - a, y - a, z - a, r), sdSphere(x - a, y + a, z + a, r), sdSphere(x + a, y - a, z + a, r), sdSphere(x + a, y + a, z - a, r)); },
  },
];
export const NODE_FORMS = FORMS.map((f) => ({
  name: f.name, rIn: f.rIn * KS, rOut: f.rOut * KS, r: f.rIn * KS + 0.03,
  shell: (x, y, z) => f.shell(x / KS, y / KS, z / KS) * KS,
  glow: (x, y, z) => f.glow(x / KS, y / KS, z / KS) * KS,
  core2: (x, y, z) => f.core2(x / KS, y / KS, z / KS) * KS,
}));
/** Le petit bourgeon du départ, à la place de la protéine G. */
export const BUD_FORM = { name: 'bud', rIn: 0.16, rOut: 0.16, r: 0.19, shell: (x, y, z) => sdSphere(x, y, z, 0.135), glow: (x, y, z) => sdSphere(x, y, z, 0.05), core2: (x, y, z) => sdSphere(x, y, z, 0.085) };

/* ------------------------------------------------------------------ la ligne centrale du flux */
let SPINE = null;
/**
 * Courbe lisse qui passe par la sortie du récepteur, la protéine G, les quatre nœuds, le centre de l'onde et la fin de la dispersion.
 * { count, ds, len, P, T, N, B (Float32Array 3 * count), knotArc[8] (abscisse curviligne de chaque point de passage), at(s, out) }
 * Points de passage : 0 sortie du récepteur, 1 protéine G, 2 à 5 les nœuds, 6 centre de l'onde, 7 fin de la dispersion.
 */
export function getSpine() {
  if (SPINE) return SPINE;
  const G = FRAME.gprotein; const C = FRAME.cascade;
  const K = [[G[0], FRAME.receptor.bottom + 0.1, G[2]], G, C[0], C[1], C[2], C[3], [C[3][0] + 0.03, -5.45, C[3][2] + 0.05], [C[3][0] + 0.2, -6.0, C[3][2] - 0.04]];
  const m = K.length;
  const dir = K.map((p, i) => {
    const a = K[Math.max(i - 1, 0)]; const b = K[Math.min(i + 1, m - 1)];
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const dz = b[2] - a[2]; const l = Math.hypot(dx, dy, dz) || 1;
    return [dx / l, dy / l, dz / l];
  });
  const raw = []; const knotRaw = []; const SUB = 64;
  for (let i = 0; i < m - 1; i++) {
    const p0 = K[i]; const p1 = K[i + 1]; const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    knotRaw.push(raw.length);
    for (let s = 0; s < SUB; s++) {
      const t = s / SUB; const t2 = t * t; const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1; const h10 = t3 - 2 * t2 + t; const h01 = -2 * t3 + 3 * t2; const h11 = t3 - t2;
      raw.push([0, 1, 2].map((c) => h00 * p0[c] + h10 * dir[i][c] * d + h01 * p1[c] + h11 * dir[i + 1][c] * d));
    }
  }
  knotRaw.push(raw.length); raw.push(K[m - 1].slice());
  const arc = [0];
  for (let i = 1; i < raw.length; i++) arc.push(arc[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1], raw[i][2] - raw[i - 1][2]));
  const len = arc[arc.length - 1];
  const count = Math.round(len / 0.004) + 1; const ds = len / (count - 1);
  const P = new Float32Array(3 * count);
  let j = 0;
  for (let i = 0; i < count; i++) {
    const s = i * ds;
    while (j < raw.length - 2 && arc[j + 1] < s) j++;
    const f = clamp((s - arc[j]) / ((arc[j + 1] - arc[j]) || 1), 0, 1);
    for (let c = 0; c < 3; c++) P[i * 3 + c] = raw[j][c] + (raw[j + 1][c] - raw[j][c]) * f;
  }
  const T = new Float32Array(3 * count); const N = new Float32Array(3 * count); const B = new Float32Array(3 * count);
  for (let i = 0; i < count; i++) {
    const a = Math.max(i - 1, 0) * 3; const b = Math.min(i + 1, count - 1) * 3;
    const dx = P[b] - P[a]; const dy = P[b + 1] - P[a + 1]; const dz = P[b + 2] - P[a + 2]; const l = Math.hypot(dx, dy, dz) || 1;
    T[i * 3] = dx / l; T[i * 3 + 1] = dy / l; T[i * 3 + 2] = dz / l;
  }
  // repère sans torsion (double réflexion)
  { const tx = T[0]; const ty = T[1]; const tz = T[2]; let rx = 1 - tx * tx; let ry = -tx * ty; let rz = -tx * tz; const l = Math.hypot(rx, ry, rz); N[0] = rx / l; N[1] = ry / l; N[2] = rz / l; }
  for (let i = 0; i < count - 1; i++) {
    const i0 = i * 3; const i1 = i0 + 3;
    const v1x = P[i1] - P[i0]; const v1y = P[i1 + 1] - P[i0 + 1]; const v1z = P[i1 + 2] - P[i0 + 2]; const c1 = v1x * v1x + v1y * v1y + v1z * v1z || 1;
    const rd = v1x * N[i0] + v1y * N[i0 + 1] + v1z * N[i0 + 2]; const td = v1x * T[i0] + v1y * T[i0 + 1] + v1z * T[i0 + 2];
    const rLx = N[i0] - (2 / c1) * rd * v1x; const rLy = N[i0 + 1] - (2 / c1) * rd * v1y; const rLz = N[i0 + 2] - (2 / c1) * rd * v1z;
    const tLx = T[i0] - (2 / c1) * td * v1x; const tLy = T[i0 + 1] - (2 / c1) * td * v1y; const tLz = T[i0 + 2] - (2 / c1) * td * v1z;
    const v2x = T[i1] - tLx; const v2y = T[i1 + 1] - tLy; const v2z = T[i1 + 2] - tLz; const c2 = v2x * v2x + v2y * v2y + v2z * v2z || 1;
    const d2 = v2x * rLx + v2y * rLy + v2z * rLz;
    N[i1] = rLx - (2 / c2) * d2 * v2x; N[i1 + 1] = rLy - (2 / c2) * d2 * v2y; N[i1 + 2] = rLz - (2 / c2) * d2 * v2z;
  }
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    B[o] = T[o + 1] * N[o + 2] - T[o + 2] * N[o + 1]; B[o + 1] = T[o + 2] * N[o] - T[o] * N[o + 2]; B[o + 2] = T[o] * N[o + 1] - T[o + 1] * N[o];
  }
  const knotArc = knotRaw.map((r) => arc[r]);
  let minX = 1e9; let maxX = -1e9; let minZ = 1e9; let maxZ = -1e9;
  for (let i = 0; i < count; i++) { minX = Math.min(minX, P[i * 3]); maxX = Math.max(maxX, P[i * 3]); minZ = Math.min(minZ, P[i * 3 + 2]); maxZ = Math.max(maxZ, P[i * 3 + 2]); }
  SPINE = {
    count, ds, len, P, T, N, B, knotArc, minX, maxX, minZ, maxZ,
    /** position, tangente, normale et binormale à l'abscisse curviligne s -> out (12 nombres) */
    at(s, out = new Float32Array(12)) {
      const f = clamp(s / ds, 0, count - 1.0001); const i = Math.floor(f); const t = f - i;
      for (let c = 0; c < 3; c++) {
        out[c] = P[i * 3 + c] + (P[i * 3 + 3 + c] - P[i * 3 + c]) * t;
        out[3 + c] = T[i * 3 + c] + (T[i * 3 + 3 + c] - T[i * 3 + c]) * t;
        out[6 + c] = N[i * 3 + c] + (N[i * 3 + 3 + c] - N[i * 3 + c]) * t;
        out[9 + c] = B[i * 3 + c] + (B[i * 3 + 3 + c] - B[i * 3 + c]) * t;
      }
      return out;
    },
  };
  return SPINE;
}

/** Les quatre liens entre les nœuds (et le dernier vers le centre de l'onde) : abscisses curvilignes de départ et d'arrivée. */
export function getLinks() {
  const sp = getSpine(); const k = sp.knotArc; const out = [];
  for (let i = 0; i < 4; i++) out.push({ a: k[2 + i] + NODE_FORMS[i].rOut * 0.8, b: i < 3 ? k[3 + i] - NODE_FORMS[i + 1].rIn : k[6] - 0.07 });
  return out;
}

/* ------------------------------------------------------------------ la tresse */
// le rayon d'orbite des brins le long de la ligne centrale : une lentille entre deux nœuds, qui se referme sur chaque nœud
function makeOrbit(sp) {
  const k = sp.knotArc; const L = sp.len;
  const segs = [
    { a: 0, b: k[1] - 0.1, rmax: 0.095, r0: 0.045 },
    { a: k[1] + 0.12, b: k[2] - NODE_FORMS[0].rIn, rmax: 0.115, r0: 0 },
    { a: k[2] + NODE_FORMS[0].rOut, b: k[3] - NODE_FORMS[1].rIn, rmax: 0.15, r0: 0 },
    { a: k[3] + NODE_FORMS[1].rOut, b: k[4] - NODE_FORMS[2].rIn, rmax: 0.17, r0: 0 },
    { a: k[4] + NODE_FORMS[2].rOut, b: k[5] - NODE_FORMS[3].rIn, rmax: 0.16, r0: 0 },
    { a: k[5] + NODE_FORMS[3].rOut, b: L, rmax: 0, r0: 0, tail: true },
  ];
  return { segs, at(s) {
    for (let i = 0; i < segs.length; i++) {
      const g = segs[i];
      if (s >= g.a && s <= g.b) {
        const u = (s - g.a) / (g.b - g.a);
        if (g.tail) return { r: 0.03 + 0.3 * Math.pow(u, 1.15), u, seg: i, tail: true };
        return { r: g.r0 * (1 - u) + g.rmax * Math.pow(Math.sin(Math.PI * u), 0.75), u, seg: i, tail: false };
      }
    }
    return { r: 0, u: 0, seg: -1, tail: false };
  } };
}

const mk = (pairs) => {   // table de 16 entrées : tag + 1 selon un nombre au hasard
  const t = new Uint8Array(16); let acc = 0; let p = 0;
  for (const [tag, w] of pairs) { acc += w; const e = Math.round(acc * 16); while (p < e && p < 16) t[p++] = tag + 1; }
  while (p < 16) t[p++] = pairs[pairs.length - 1][0] + 1;
  return t;
};
const TAB = {
  s: [mk([[0, 0.55], [1, 0.25], [7, 0.2]]), mk([[7, 0.45], [0, 0.35], [1, 0.2]]), mk([[1, 0.45], [0, 0.25], [2, 0.12], [7, 0.18]]), mk([[0, 0.4], [7, 0.4], [1, 0.2]])],
  sd: [mk([[1, 0.55], [0, 0.15], [2, 0.15], [7, 0.15]]), mk([[1, 0.5], [7, 0.25], [2, 0.25]]), mk([[2, 0.4], [1, 0.45], [0, 0.15]]), mk([[1, 0.6], [0, 0.2], [2, 0.2]])],
  collar: mk([[4, 0.62], [1, 0.16], [0, 0.12], [5, 0.1]]),
  bead: mk([[3, 0.94], [1, 0.06]]),
  out: mk([[4, 0.42], [7, 0.17], [1, 0.13], [0, 0.1], [5, 0.07], [2, 0.04], [3, 0.07]]),
  inn: mk([[4, 0.45], [1, 0.25], [5, 0.15], [2, 0.15]]),
  core: mk([[3, 1]]),
};

let SCRATCH = null;   // la grille de cases, réutilisée d'un appel à l'autre
function voxelize(v, seed, K) {
  const sp = getSpine(); const L = sp.len; const k = sp.knotArc; const orb = makeOrbit(sp); const iv = 1 / v;
  const ox = sp.minX - 0.62; const oy = -6.32; const oz = sp.minZ - 0.62;
  const nx = Math.ceil((sp.maxX + 0.62 - ox) * iv); const ny = Math.ceil((-0.7 - oy) * iv); const nz = Math.ceil((sp.maxZ + 0.62 - oz) * iv);
  if (!SCRATCH || SCRATCH.length < nx * ny * nz) SCRATCH = new Uint8Array(Math.ceil(nx * ny * nz * 1.1));
  const grid = SCRATCH; grid.fill(0, 0, nx * ny * nz);
  const dense = clamp(smooth(0.034, 0.011, v), 0, 1);   // 1 = finesse maximale (59 049 cubes), 0 = grossier (6 561)
  const rho0 = v * (1.25 + 1.1 * dense);                  // rayon d'un brin
  const stamp = (cx, cy, cz, rad, tab) => {
    const r2 = rad * rad;
    const i0 = Math.max(0, Math.floor((cx - rad - ox) * iv)); const i1 = Math.min(nx - 1, Math.floor((cx + rad - ox) * iv));
    const j0 = Math.max(0, Math.floor((cy - rad - oy) * iv)); const j1 = Math.min(ny - 1, Math.floor((cy + rad - oy) * iv));
    const k0 = Math.max(0, Math.floor((cz - rad - oz) * iv)); const k1 = Math.min(nz - 1, Math.floor((cz + rad - oz) * iv));
    for (let kk = k0; kk <= k1; kk++) {
      const dz = oz + (kk + 0.5) * v - cz; const dz2 = dz * dz; if (dz2 > r2) continue;
      for (let jj = j0; jj <= j1; jj++) {
        const dy = oy + (jj + 0.5) * v - cy; const dyz = dz2 + dy * dy; if (dyz > r2) continue;
        const base = nx * (jj + ny * kk);
        for (let ii = i0; ii <= i1; ii++) {
          const dx = ox + (ii + 0.5) * v - cx;
          if (dx * dx + dyz <= r2) grid[base + ii] = tab[(hash3(ii, jj, kk, seed) * 16) | 0];
        }
      }
    }
  };
  const phase = (s, kk) => TAU * kk / K + TAU * s / 0.78 + 0.45 * Math.sin(s * 2.7 + kk * 2.1);
  const strandPos = (s, kk, o, out) => {
    const a = orb.at(s); sp.at(s, o);
    let r = a.r;
    if (a.tail) r += 0.05 * Math.sin(s * 17 + kk * 4.1) * a.u;
    const ph = phase(s, kk); const c = Math.cos(ph) * r; const sn = Math.sin(ph) * r;
    out[0] = o[0] + c * o[6] + sn * o[9]; out[1] = o[1] + c * o[7] + sn * o[10]; out[2] = o[2] + c * o[8] + sn * o[11];
    return a;
  };
  const o12 = new Float32Array(12); const q = [0, 0, 0];
  const step = Math.max(0.5 * v, sp.ds);

  // 1. les brins
  for (let kk = 0; kk < K; kk++) {
    let sIdx = 0;
    for (let s = 0; s <= L; s += step, sIdx++) {
      const a = strandPos(s, kk, o12, q);
      let rho = rho0;
      let tabs = TAB.s[kk % 4];
      if (vnoise(s * 11 + kk * 31, 5) > 0.6) tabs = TAB.sd[kk % 4];
      if (a.tail) {
        rho *= 1 - 0.5 * a.u;
        const pd = smooth(0.28, 0.95, a.u) * 0.95;
        if (vnoise(s * 46 + kk * 13, 9) < pd * 1.1 - 0.05 + 0.3 * (hash3(sIdx, kk, 1, seed) - 0.5) * a.u) continue;
      } else if (a.seg >= 0) {
        const g = orb.segs[a.seg]; const dEnd = Math.min(s - g.a, g.b - s);
        if (dEnd < 0.1 && a.seg > 0 && hash3(sIdx >> 1, kk, 2, seed) < 0.55) tabs = TAB.collar;
      }
      stamp(q[0], q[1], q[2], rho, tabs);
    }
  }
  // 2. les perles : des impulsions figées sur les brins, de plus en plus nombreuses vers le bas
  const links = getLinks();
  const beadN = [3, 4, 4, 5];
  for (let li = 0; li < 4; li++) {
    const { a, b } = links[li]; const M = beadN[li];
    for (let m = 0; m < M; m++) {
      const s = a + (b - a) * (m + 0.55) / M; const kk = (li + m) % K;
      strandPos(s, kk, o12, q);
      stamp(q[0], q[1], q[2], rho0 * (1.3 + 0.1 * dense), TAB.bead);
    }
  }

  // 3. les nœuds : on vide l'intérieur (les brins le traversent), on pose la coquille, puis le cœur
  const t = (1.0 + 0.25 * dense) * v;
  const bs = dense > 0.5 ? 3 : 2;   // taille des pores en cubes
  const addForm = (form, cx, cy, cz, pore) => {
    const R = form.r + 3 * v; const B = 4;
    const I0 = Math.max(0, Math.floor((cx - R - ox) * iv)); const I1 = Math.min(nx - 1, Math.ceil((cx + R - ox) * iv));
    const J0 = Math.max(0, Math.floor((cy - R - oy) * iv)); const J1 = Math.min(ny - 1, Math.ceil((cy + R - oy) * iv));
    const K0 = Math.max(0, Math.floor((cz - R - oz) * iv)); const K1 = Math.min(nz - 1, Math.ceil((cz + R - oz) * iv));
    for (let kb = K0; kb <= K1; kb += B) for (let jb = J0; jb <= J1; jb += B) for (let ib = I0; ib <= I1; ib += B) {
      const ie = Math.min(ib + B - 1, I1); const je = Math.min(jb + B - 1, J1); const ke = Math.min(kb + B - 1, K1);
      const bx = ox + ((ib + ie) * 0.5 + 0.5) * v - cx; const by = oy + ((jb + je) * 0.5 + 0.5) * v - cy; const bz = oz + ((kb + ke) * 0.5 + 0.5) * v - cz;
      const half = 0.5 * v * Math.sqrt((ie - ib + 1) ** 2 + (je - jb + 1) ** 2 + (ke - kb + 1) ** 2) * 1.15;
      const dS = form.shell(bx, by, bz); const dG = form.glow(bx, by, bz);
      const farS = dS > half + v; const farG = dG > half + 1.4 * v;
      if (farS && farG) continue;
      const deep = dS < -half - t;
      for (let kk = kb; kk <= ke; kk++) for (let jj = jb; jj <= je; jj++) for (let ii = ib; ii <= ie; ii++) {
        const idx = ii + nx * (jj + ny * kk);
        if (deep && farG) { grid[idx] = 0; continue; }
        const x = ox + (ii + 0.5) * v - cx; const y = oy + (jj + 0.5) * v - cy; const z = oz + (kk + 0.5) * v - cz;
        const hh = hash3(ii, jj, kk, seed + 5);
        let ds = deep ? -1 : (farS ? 1 : form.shell(x, y, z));
        if (ds < 0) {
          if (ds >= -t) {
            const pr = pore ? hash3(Math.floor(ii / bs), Math.floor(jj / bs), Math.floor(kk / bs), seed + 9) : 1;
            grid[idx] = pr < 0.34 ? 0 : (ds >= -0.9 * v ? TAB.out : TAB.inn)[(hh * 16) | 0];
          } else grid[idx] = 0;
        }
        const g = farG ? 1 : form.glow(x, y, z);
        if (ds < -t && form.core2) { const c2 = form.core2(x, y, z); if (c2 < 0 && c2 > -1.0 * v) grid[idx] = TAB.core[0]; }
        if (g < 0) { if (g > -1.2 * v) grid[idx] = TAB.core[0]; else if (deep || ds < -t) grid[idx] = 0; }
        else if (g < 1.1 * v && ds >= 0 && hh < 0.3 * (1 - g / (1.1 * v))) grid[idx] = TAB.core[0];   // quelques braises à la bouche de la fente
      }
    }
  };
  const nodePos = FRAME.cascade;
  for (let i = 0; i < 4; i++) addForm(NODE_FORMS[i], nodePos[i][0], nodePos[i][1], nodePos[i][2], true);
  addForm(BUD_FORM, FRAME.gprotein[0], FRAME.gprotein[1], FRAME.gprotein[2], false);

  let count = 0; const total = nx * ny * nz;
  for (let i = 0; i < total; i++) if (grid[i]) count++;
  return { grid, nx, ny, nz, ox, oy, oz, count, total, sp, orb, rho0, dense };
}

/** Le flux de signal : exactement n cubes. */
export default function build(n, seed = 1) {
  const R = rng(seed * 7919 + 13);
  const K = n > 20000 ? 4 : 3;
  const target = Math.round(n * 0.955);
  let v = 0.0107 * Math.pow(59049 / n, 0.446);
  let vox = null; let lastV = 0; let lastC = 0; let usedV = v; let best = null;
  for (let it = 0; it < 7; it++) {
    vox = voxelize(v, seed, K); usedV = v;
    const c = vox.count; const err = Math.abs(c - target) / target;
    if (!best || err < best.err) best = { v, err };
    if (err < 0.02) break;
    let p = 2.3;
    if (lastV) p = clamp(-Math.log(c / lastC) / Math.log(v / lastV), 1.3, 3.6);
    lastV = v; lastC = c;
    v *= Math.pow(c / target, 1 / p);
  }
  if (usedV !== best.v) { vox = voxelize(best.v, seed, K); usedV = best.v; }   // la grille en mémoire doit être celle du cube retenu
  v = usedV;
  const { grid, nx, ny, nz, ox, oy, oz, sp, total } = vox;
  const cells = [];   // indices des cases pleines
  for (let i = 0; i < total; i++) if (grid[i]) cells.push(i);
  // trop de cubes : on retire au hasard des cubes gris (les moins visibles)
  if (cells.length > n) {
    let extra = cells.length - n; let guard = 0;
    while (extra > 0 && guard++ < 50 * n) {
      const p = (R() * cells.length) | 0; const idx = cells[p];
      const tg = grid[idx] - 1;
      if (tg === 0 || tg === 1 || tg === 7) { grid[idx] = 0; cells[p] = cells[cells.length - 1]; cells.pop(); extra--; }
    }
  }
  // pas assez : une dispersion de cubes, surtout dans la queue, un peu le long de la tresse et autour des nœuds
  const need = n - cells.length;
  const tabScatter = mk([[0, 0.34], [1, 0.22], [7, 0.24], [2, 0.05], [3, 0.1], [4, 0.03], [5, 0.02]]);
  const tabSpray = mk([[0, 0.4], [7, 0.3], [1, 0.22], [2, 0.04], [3, 0.04]]);
  const o12 = new Float32Array(12);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - R())) * Math.cos(TAU * R());
  const L = sp.len; const kArc = sp.knotArc; const sTail = kArc[5] + 0.2;
  const nodeC = FRAME.cascade;
  let placed = 0; let guard = 0;
  const iv = 1 / v;
  while (placed < need && guard++ < 80 * need + 1000) {
    const w = R(); let x; let y; let z; let tab;
    if (w < 0.62) {   // la queue
      const u = Math.pow(R(), 0.85); const s = sTail + (L - sTail) * u;
      sp.at(s, o12);
      const sg = 0.05 + 0.3 * Math.pow(u, 1.2);
      const gx = gauss() * sg; const gy = gauss() * sg; const gt = gauss() * 0.06;
      x = o12[0] + gx * o12[6] + gy * o12[9] + gt * o12[3]; y = o12[1] + gx * o12[7] + gy * o12[10] + gt * o12[4]; z = o12[2] + gx * o12[8] + gy * o12[11] + gt * o12[5];
      tab = tabScatter;
    } else if (w < 0.88) {   // des cubes qui se détachent de la tresse
      const s = R() * (sTail - 0.1); sp.at(s, o12);
      const a = TAU * R(); const rr = 0.06 + 0.16 * R() * R() + 0.02 * gauss();
      x = o12[0] + Math.cos(a) * rr * o12[6] + Math.sin(a) * rr * o12[9]; y = o12[1] + Math.cos(a) * rr * o12[7] + Math.sin(a) * rr * o12[10]; z = o12[2] + Math.cos(a) * rr * o12[8] + Math.sin(a) * rr * o12[11];
      tab = tabSpray;
    } else {   // un halo autour des nœuds
      const i = (R() * 4) | 0; const a = TAU * R(); const b = Math.acos(2 * R() - 1); const rr = NODE_FORMS[i].r + (0.03 + 0.12 * R() * R());
      x = nodeC[i][0] + rr * Math.sin(b) * Math.cos(a); y = nodeC[i][1] + rr * Math.cos(b); z = nodeC[i][2] + rr * Math.sin(b) * Math.sin(a);
      tab = tabSpray;
    }
    const ii = Math.floor((x - ox) * iv); const jj = Math.floor((y - oy) * iv); const kk = Math.floor((z - oz) * iv);
    if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
    const idx = ii + nx * (jj + ny * kk);
    if (grid[idx]) continue;
    grid[idx] = tab[(R() * 16) | 0]; cells.push(idx); placed++;
  }
  // dernier recours (ne devrait pas arriver) : on double quelques cubes de la tresse
  for (let g = 0; cells.length < n && g < n; g++) {
    const idx = cells[(R() * cells.length) | 0] + 1;
    if (idx < total && !grid[idx]) { grid[idx] = 1; cells.push(idx); }
  }
  const pos = new Float32Array(3 * n); const tag = new Uint8Array(n);
  let x0 = 1e9; let x1 = -1e9; let y0 = 1e9; let y1 = -1e9; let z0 = 1e9; let z1 = -1e9;
  for (let i = 0; i < n; i++) {
    const idx = cells[i]; const ii = idx % nx; const rest = (idx - ii) / nx; const jj = rest % ny; const kk = (rest - jj) / ny;
    const jit = 0.05 * v;
    const x = ox + (ii + 0.5) * v + (R() - 0.5) * jit; const y = oy + (jj + 0.5) * v + (R() - 0.5) * jit; const z = oz + (kk + 0.5) * v + (R() - 0.5) * jit;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; tag[i] = grid[idx] - 1;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  const h = v * 0.55;
  const extent = [(x1 - x0) / 2 + h, (y1 - y0) / 2 + h, (z1 - z0) / 2 + h];
  return { pos, tag, cube: v, extent, center: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], bounds: [x0 - h, y0 - h, z0 - h, x1 + h, y1 + h, z1 + h] };
}
