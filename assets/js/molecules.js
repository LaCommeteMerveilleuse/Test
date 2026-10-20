// BlackPhage - les molécules du monde de l'accueil. Tout est construit ici par du code, sans fichier de modèle :
// des petites molécules en boules et bâtons (eau, benzène, sucre, purine, chaîne, acide aminé, phosphate), une double hélice d'ADN,
// des protéines en rubans (hélices reliées par des boucles) et un récepteur à sept hélices.
// Les atomes et les liaisons d'une molécule sont fusionnés en une seule géométrie, que le monde instancie ensuite par centaines.
import * as THREE from 'three';

const ANG = 8;                                   // un angström vaut 8 unités du monde
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// rayon (en unités du monde) et couleur de chaque élément : la palette du site, indigo, iris, corail
const ELEMENTS = {
  C: [4.1, [0.80, 0.84, 1.00]],
  N: [4.3, [0.42, 0.56, 1.00]],
  O: [3.9, [1.00, 0.52, 0.44]],
  H: [2.5, [0.96, 0.97, 1.00]],
  P: [5.2, [1.00, 0.54, 0.84]],
  S: [5.2, [1.00, 0.82, 0.46]],
};
const BOND = [0.74, 0.78, 0.98];

const polar = (r, deg, z = 0) => { const a = deg * Math.PI / 180; return [r * Math.cos(a), r * Math.sin(a), z]; };

// ------------------------------------------------------------------ les modèles de molécules (positions en angströms)
function benzene() {
  const atoms = []; const bonds = [];
  for (let k = 0; k < 6; k++) atoms.push(['C', ...polar(1.40, k * 60)]);
  for (let k = 0; k < 6; k++) atoms.push(['H', ...polar(2.48, k * 60)]);
  for (let k = 0; k < 6; k++) { bonds.push([k, (k + 1) % 6, k % 2 ? 1 : 2]); bonds.push([k, 6 + k, 1]); }
  return { atoms, bonds };
}

function toluene() {
  const m = benzene();
  m.atoms[6] = ['C', ...polar(2.92, 0)];                         // le méthyle remplace l'hydrogène
  const c = m.atoms.length;
  m.atoms.push(['H', 3.5, 0.95, 0.55], ['H', 3.5, -0.95, 0.55], ['H', 3.55, 0.0, -1.0]);
  m.bonds.push([6, c, 1], [6, c + 1, 1], [6, c + 2, 1]);
  return m;
}

function sugar() {
  const atoms = []; const bonds = [];
  for (let k = 0; k < 6; k++) atoms.push([k === 5 ? 'O' : 'C', ...polar(1.45, k * 60, k % 2 ? 0.28 : -0.28)]);
  for (let k = 0; k < 6; k++) bonds.push([k, (k + 1) % 6, 1]);
  for (let k = 0; k < 4; k++) {                                   // des groupes hydroxyle, un côté puis l'autre
    const z = k % 2 ? -0.95 : 0.95;
    const o = atoms.length; atoms.push(['O', ...polar(2.55, k * 60, z)]);
    const h = atoms.length; atoms.push(['H', ...polar(3.2, k * 60 + 8, z * 1.25)]);
    bonds.push([k, o, 1], [o, h, 1]);
  }
  const c = atoms.length; atoms.push(['C', ...polar(2.65, 240, 0.4)]);        // le groupe CH2OH
  const o = atoms.length; atoms.push(['O', ...polar(3.8, 232, 0.9)]);
  const h = atoms.length; atoms.push(['H', ...polar(4.35, 238, 1.4)]);
  bonds.push([4, c, 1], [c, o, 1], [o, h, 1]);
  return { atoms, bonds };
}

function purine() {
  const R = 1.40;
  const atoms = []; const bonds = [];
  const els = ['C', 'N', 'C', 'N', 'C', 'C'];
  for (let k = 0; k < 6; k++) atoms.push([els[k], ...polar(R, 30 + k * 60)]);
  for (let k = 0; k < 6; k++) bonds.push([k, (k + 1) % 6, k % 2 ? 1 : 2]);
  // le pentagone fusionné sur l'arête de droite
  const cx = 2.176; const Rp = 1.191;
  const pent = [['N', 72], ['C', 0], ['N', -72]];
  const idx = [];
  for (const [el, a] of pent) { idx.push(atoms.length); atoms.push([el, cx + Rp * Math.cos(a * Math.PI / 180), Rp * Math.sin(a * Math.PI / 180), 0]); }
  bonds.push([0, idx[0], 1], [idx[0], idx[1], 2], [idx[1], idx[2], 1], [idx[2], 5, 1]);
  // deux oxygènes doubles et des méthyles
  for (const k of [2, 4]) { const o = atoms.length; atoms.push(['O', ...polar(2.65, 30 + k * 60)]); bonds.push([k, o, 2]); }
  for (const k of [1, 3]) { const c = atoms.length; atoms.push(['C', ...polar(2.95, 30 + k * 60)]); bonds.push([k, c, 1]); }
  return { atoms, bonds };
}

function chain() {
  const atoms = []; const bonds = [];
  for (let i = 0; i < 8; i++) atoms.push(['C', i * 1.25, (i % 2) * 0.55, 0]);
  for (let i = 0; i < 7; i++) bonds.push([i, i + 1, 1]);
  atoms.push(['O', 8 * 1.25, 0.0, 0]); bonds.push([7, 8, 2]);
  atoms.push(['O', 7.4 * 1.25, 1.7, 0.4]); bonds.push([7, 9, 1]);
  return { atoms, bonds };
}

function aminoAcid() {
  const atoms = [['N', -1.25, 0.35, 0], ['C', 0, 0, 0], ['C', 1.3, 0.6, 0], ['O', 1.35, 1.8, 0.2], ['O', 2.4, -0.1, -0.2],
    ['H', -1.9, -0.25, 0.3], ['H', -1.5, 1.25, -0.2], ['H', 0, -0.6, 0.85], ['H', -0.1, -0.7, -0.85], ['H', 3.1, 0.4, 0]];
  const bonds = [[0, 1, 1], [1, 2, 1], [2, 3, 2], [2, 4, 1], [0, 5, 1], [0, 6, 1], [1, 7, 1], [1, 8, 1], [4, 9, 1]];
  return { atoms, bonds };
}

function phosphate() {
  const d = 1.55 / Math.sqrt(3);
  const atoms = [['P', 0, 0, 0], ['O', d, d, d], ['O', -d, -d, d], ['O', -d, d, -d], ['O', d, -d, -d]];
  return { atoms, bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [0, 4, 1]] };
}

function water() {
  return { atoms: [['O', 0, 0, 0], ['H', 0.76, 0.59, 0], ['H', -0.76, 0.59, 0]], bonds: [[0, 1, 1], [0, 2, 1]] };
}

function carbonDioxide() {
  return { atoms: [['O', -1.16, 0, 0], ['C', 0, 0, 0], ['O', 1.16, 0, 0]], bonds: [[0, 1, 2], [1, 2, 2]] };
}

/** Le catalogue : nom, molécule, nombre d'exemplaires par défaut dans le monde. */
export const MOLECULES = {
  water: { build: water, weight: 3.0 },
  co2: { build: carbonDioxide, weight: 1.2 },
  benzene: { build: benzene, weight: 2.0 },
  toluene: { build: toluene, weight: 1.4 },
  sugar: { build: sugar, weight: 1.6 },
  purine: { build: purine, weight: 1.6 },
  chain: { build: chain, weight: 1.2 },
  amino: { build: aminoAcid, weight: 1.6 },
  phosphate: { build: phosphate, weight: 1.2 },
};

// ------------------------------------------------------------------ fusion des atomes et des liaisons en une géométrie
const sphereProto = new THREE.SphereGeometry(1, 10, 6);
const cylProto = new THREE.CylinderGeometry(1, 1, 1, 7, 1, true);

class Builder {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.kind = []; this.idx = []; }

  add(proto, matrix, color, kind) {
    const base = this.pos.length / 3;
    const p = proto.attributes.position; const n = proto.attributes.normal;
    const v = new THREE.Vector3(); const nm = new THREE.Matrix3().getNormalMatrix(matrix);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(matrix); this.pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); this.nor.push(v.x, v.y, v.z);
      this.col.push(color[0], color[1], color[2]); this.kind.push(kind);
    }
    for (const i of proto.index.array) this.idx.push(i + base);
  }

  sphere(c, r, color) { this.add(sphereProto, new THREE.Matrix4().compose(c, new THREE.Quaternion(), V3(r, r, r)), color, 0); }

  bond(a, b, r, color) {
    const d = b.clone().sub(a); const len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.clone().normalize());
    this.add(cylProto, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V3(r, len, r)), color, 1);
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(this.kind, 1));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

/** La géométrie d'une molécule du catalogue, centrée sur son centre de masse approché. */
export function moleculeGeometry(name) {
  const m = MOLECULES[name].build();
  const P = m.atoms.map(([, x, y, z]) => V3(x * ANG, y * ANG, z * ANG));
  const c = P.reduce((s, p) => s.add(p), V3(0, 0, 0)).multiplyScalar(1 / P.length);
  P.forEach((p) => p.sub(c));
  const b = new Builder();
  m.atoms.forEach(([el], i) => b.sphere(P[i], ELEMENTS[el][0], ELEMENTS[el][1]));
  for (const [i, j, order] of m.bonds) {
    const d = P[j].clone().sub(P[i]);
    if (order === 2) {                                           // une double liaison : deux bâtons côte à côte
      const side = d.clone().cross(V3(0, 0, 1)); if (side.lengthSq() < 1e-4) side.set(0, 1, 0);
      side.normalize().multiplyScalar(1.5);
      b.bond(P[i].clone().add(side), P[j].clone().add(side), 0.8, BOND);
      b.bond(P[i].clone().sub(side), P[j].clone().sub(side), 0.8, BOND);
    } else b.bond(P[i], P[j], 1.05, BOND);
  }
  return b.geometry();
}

// ------------------------------------------------------------------ l'ADN : une double hélice qui tourne sur son axe (x)
/** longueur et rayon en unités du monde. Les deux brins sont des chapelets de billes, reliés par des paires de bases. */
export function dnaGeometry(length = 1100, radius = 60, pitch = 190) {
  const b = new Builder();
  const per = 14;                                                // paires de bases par tour
  const n = Math.round(length / pitch * per);
  const bases = [[0.46, 0.60, 1.0], [1.0, 0.56, 0.46], [0.62, 0.82, 1.0], [1.0, 0.80, 0.52]];
  for (let i = 0; i <= n; i++) {
    const x = (i / n - 0.5) * length;
    const a = i / per * Math.PI * 2;
    const p1 = V3(x, radius * Math.cos(a), radius * Math.sin(a));
    const p2 = V3(x, -radius * Math.cos(a), -radius * Math.sin(a));
    b.sphere(p1, 6.6, [0.70, 0.76, 1.0]);
    b.sphere(p2, 6.6, [1.0, 0.70, 0.62]);
    const mid = p1.clone().add(p2).multiplyScalar(0.5);
    const c1 = bases[i % 4]; const c2 = bases[(i + 2) % 4];
    b.bond(p1, mid, 1.9, c1);
    b.bond(mid, p2, 1.9, c2);
    if (i > 0) {                                                 // le squelette de chaque brin
      const x0 = ((i - 1) / n - 0.5) * length; const a0 = (i - 1) / per * Math.PI * 2;
      b.bond(V3(x0, radius * Math.cos(a0), radius * Math.sin(a0)), p1, 2.3, [0.66, 0.72, 1.0]);
      b.bond(V3(x0, -radius * Math.cos(a0), -radius * Math.sin(a0)), p2, 2.3, [1.0, 0.64, 0.58]);
    }
  }
  return b.geometry();
}

// ------------------------------------------------------------------ une protéine en rubans
/** Un tube de rayon variable le long d'une courbe, avec une couleur par sommet. */
export function tube(points, radiusAt, colorAt, radial = 8, samples = 260) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const frames = curve.computeFrenetFrames(samples, false);
  const pos = []; const nor = []; const col = []; const idx = [];
  const p = new THREE.Vector3(); const n = new THREE.Vector3();
  for (let i = 0; i <= samples; i++) {
    const t = i / samples; curve.getPointAt(t, p);
    const r = radiusAt(t); const c = colorAt(t);
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2;
      n.copy(frames.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      nor.push(n.x, n.y, n.z); col.push(c[0], c[1], c[2]);
    }
  }
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j; const b = a + 1; const c = a + radial + 1; const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(2), 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

const RIBBON_COLORS = [[0.62, 0.68, 1.0], [0.80, 0.66, 1.0], [1.0, 0.62, 0.78], [1.0, 0.60, 0.50], [1.0, 0.80, 0.62]];
export const ribbonColor = (t) => {
  const x = Math.min(0.9999, Math.max(0, t)) * (RIBBON_COLORS.length - 1); const i = Math.floor(x); const f = x - i;
  const a = RIBBON_COLORS[i]; const b = RIBBON_COLORS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
};

/** Une chaîne d'hélices reliées par des boucles, de taille moyenne 1 (environ 150 unités de large). */
export function ribbonProtein(rnd, helices = 6) {
  const pts = []; const flags = [];                              // flags : 1 dans une hélice, 0 dans une boucle
  let pos = V3(0, 0, 0);
  let dir = V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
  for (let h = 0; h < helices; h++) {
    const len = 34 + rnd() * 28; const turns = len / 11; const r = 7.5;
    const u = dir.clone().cross(Math.abs(dir.y) < 0.9 ? V3(0, 1, 0) : V3(1, 0, 0)).normalize();
    const w = dir.clone().cross(u);
    const steps = Math.ceil(turns * 8);
    for (let s = 0; s <= steps; s++) {
      const f = s / steps; const a = f * turns * Math.PI * 2;
      pts.push(pos.clone().addScaledVector(dir, f * len).addScaledVector(u, Math.cos(a) * r).addScaledVector(w, Math.sin(a) * r)); flags.push(1);
    }
    pos = pos.clone().addScaledVector(dir, len);
    // une boucle, qui change de cap
    const turn = V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    const nd = dir.clone().multiplyScalar(0.25).add(turn).normalize();
    for (let s = 1; s <= 3; s++) { pts.push(pos.clone().addScaledVector(nd, s * 9).addScaledVector(turn, Math.sin(s * 1.7) * 6)); flags.push(0); }
    pos = pos.clone().addScaledVector(nd, 28);
    dir = nd;
  }
  const n = pts.length;
  const center = pts.reduce((s, p) => s.add(p), V3(0, 0, 0)).multiplyScalar(1 / n);
  pts.forEach((p) => p.sub(center));
  const flagAt = (t) => { const x = t * (n - 1); const i = Math.floor(x); const f = x - i; return flags[Math.min(i, n - 1)] * (1 - f) + flags[Math.min(i + 1, n - 1)] * f; };
  return tube(pts, (t) => 1.5 + 2.7 * flagAt(t), ribbonColor);
}

/** Un récepteur à sept hélices, debout (axe y), de la taille d'une protéine de membrane : 70 unités de haut. */
export function receptorGeometry() {
  const R = 15;
  const parts = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const cx = Math.cos(a) * R * (k % 2 ? 1.0 : 0.85); const cz = Math.sin(a) * R * (k % 2 ? 1.0 : 0.85);
    const pts = [];
    for (let s = 0; s <= 24; s++) {
      const f = s / 24; const turn = f * 6 * Math.PI * 2;
      pts.push(V3(cx + Math.cos(turn) * 3.2, -34 + f * 68, cz + Math.sin(turn) * 3.2));
    }
    parts.push({ pts, k });
  }
  const geos = parts.map(({ pts, k }) => tube(pts, () => 3.4, () => ribbonColor(k / 6), 7, 72));
  // les boucles du haut, qui relient les hélices voisines
  const loops = [];
  for (let k = 0; k < 7; k++) {
    const a0 = (k / 7) * Math.PI * 2; const a1 = ((k + 1) / 7) * Math.PI * 2;
    const p0 = V3(Math.cos(a0) * R, 34, Math.sin(a0) * R); const p1 = V3(Math.cos(a1) * R, 34, Math.sin(a1) * R);
    const up = k % 2 ? 54 : 46;
    const mid = p0.clone().add(p1).multiplyScalar(0.5).multiplyScalar(1.1); mid.y = up;
    loops.push(tube([p0, p0.clone().setY(38), mid, p1.clone().setY(38), p1], () => 1.9, () => ribbonColor(0.78 + k / 40), 6, 24));
  }
  return mergeGeometries([...geos, ...loops]);
}

function mergeGeometries(list) {
  const pos = []; const nor = []; const col = []; const kind = []; const idx = []; let base = 0;
  for (const g of list) {
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); col.push(...g.attributes.aColor.array); kind.push(...g.attributes.aKind.array);
    for (const i of g.index.array) idx.push(i + base);
    base += g.attributes.position.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
