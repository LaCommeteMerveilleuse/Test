// BlackPhage - la forme 0 : un cerveau numérique fait de cubes, vu de profil comme sur une planche d'anatomie (le lobe frontal à gauche).
// Quatre lobes (frontal, pariétal, temporal, occipital) séparés par le sillon latéral et le sillon central, un cervelet rayé, un tronc cérébral.
// Chaque lobe a sa teinte de gris (bleutée, chaude, verte, turquoise, sable). Des faisceaux de Deep Canyon Blue courent d'un lobe à l'autre,
// et chaque cube porte une phase : le moteur s'en sert pour faire courir des impulsions de lumière (fronts qui partent de six foyers,
// signaux qui suivent les faisceaux, neurones qui s'allument au hasard).
import { rng, noise3, smin, sdEllipsoid, sdCapsule, voxelShell } from './voxel.js';

const ridge = (x, y, z) => {
  const wx = noise3(x * 3.0 + 3.1, y * 3.0, z * 3.0) - 0.5; const wy = noise3(x * 3.0, y * 3.0 + 7.7, z * 3.0) - 0.5; const wz = noise3(x * 3.0, y * 3.0, z * 3.0 + 4.3) - 0.5;
  const n = noise3(x * 7.4 + wx * 2.6, y * 7.4 + wy * 2.6, z * 7.4 + wz * 2.6);
  return Math.pow(1 - Math.abs(2 * n - 1), 1.5);
};

// les sillons, en (x, y) vus de profil
const SYLV = [[-0.52, -0.27], [-0.2, -0.2], [0.14, -0.13], [0.42, -0.05], [0.64, 0.02]];     // le sillon latéral, qui sépare le lobe temporal
const CENT = [[0.1, 0.8], [0.04, 0.55], [-0.04, 0.28], [-0.14, -0.02]];                  // le sillon central, entre frontal et pariétal
const PARO = [[0.6, 0.66], [0.52, 0.4], [0.46, 0.14]];                                      // le sillon pariéto-occipital

function dPoly(px, py, poly) {
  let best = 1e9;
  for (let i = 0; i < poly.length - 1; i++) {
    const ax = poly[i][0]; const ay = poly[i][1]; const abx = poly[i + 1][0] - ax; const aby = poly[i + 1][1] - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)));
    const dx = px - ax - abx * t; const dy = py - ay - aby * t; const d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
function yOf(poly, x) {                       // y d'une ligne brisée triée en x, prolongée au-delà de ses bouts
  if (x <= poly[0][0]) return poly[0][1] + (x - poly[0][0]) * 0.18;
  for (let i = 0; i < poly.length - 1; i++) if (x <= poly[i + 1][0]) { const k = (x - poly[i][0]) / (poly[i + 1][0] - poly[i][0]); return poly[i][1] + (poly[i + 1][1] - poly[i][1]) * k; }
  const l = poly.length - 1; return poly[l][1] + (x - poly[l][0]) * 0.1;
}
function xOfDesc(poly, y) {                   // x d'une ligne brisée triée en y décroissant
  if (y >= poly[0][1]) return poly[0][0];
  for (let i = 0; i < poly.length - 1; i++) if (y >= poly[i + 1][1]) { const k = (poly[i][1] - y) / (poly[i][1] - poly[i + 1][1]); return poly[i][0] + (poly[i + 1][0] - poly[i][0]) * k; }
  const l = poly.length - 1; return poly[l][0] + (poly[l][1] - y) * 0.55 * -1;
}

const cerebrum = (x, y, z) => {
  const az = Math.abs(z);
  let d = sdEllipsoid(x, y, az, -0.52, 0.14, 0, 0.52, 0.6, 0.7);                       // le lobe frontal
  d = smin(d, sdEllipsoid(x, y, az, 0.16, 0.2, 0, 0.68, 0.6, 0.74), 0.14);             // le dessus, pariétal
  d = smin(d, sdEllipsoid(x, y, az, 0.66, -0.06, 0, 0.33, 0.44, 0.58), 0.12);           // le lobe occipital
  d = smin(d, sdEllipsoid(x, y, az, -0.56, -0.2, 0, 0.44, 0.32, 0.56), 0.1);           // le dessous du frontal
  d = smin(d, sdEllipsoid(x, y - 0.1 * (x - 0.18), az, 0.18, -0.4, 0.4, 0.58, 0.21, 0.3), 0.05);   // le lobe temporal, plus bas en avant
  return Math.max(d, -0.62 - y);
};
const cerebellum = (x, y, z) => {
  const az = Math.abs(z);
  const d = sdEllipsoid(x, y, az, 0.6, -0.7, 0, 0.3, 0.19, 0.44);
  const s = Math.abs(Math.cos(y * 72));
  return d + 0.016 * Math.max(0, (s - 0.82) / 0.18);                                   // les folia, de fines rainures horizontales
};
const stem = (x, y, z) => Math.min(sdCapsule(x, y, Math.abs(z), 0.3, -0.5, 0, 0.36, -1.12, 0, 0.095), sdEllipsoid(x, y, Math.abs(z), 0.33, -0.6, 0, 0.13, 0.13, 0.11));

function sdf(x, y, z) {
  const az = Math.abs(z);
  const d0 = Math.min(cerebrum(x, y, z), cerebellum(x, y, z), stem(x, y, z));
  if (d0 > 0.1 || d0 < -0.22) return d0;                                                // loin de la peau, on ne cherche pas le détail
  let d = cerebrum(x, y, z);
  if (d < 0.1 && d > -0.2) {
    d -= 0.04 * ridge(x, y, z);                                                         // les circonvolutions
    const lat = Math.min(1, Math.max(0, (az - 0.1) / 0.15));                           // les sillons n'entament que les flancs
    const dl = dPoly(x, y, SYLV); if (dl < 0.07) d += 0.065 * (1 - dl / 0.07) * lat;     // sillon latéral
    const dc = dPoly(x, y, CENT); if (dc < 0.04) d += 0.032 * (1 - dc / 0.04) * lat;   // sillon central
    const dp = dPoly(x, y, PARO); if (dp < 0.04) d += 0.028 * (1 - dp / 0.04) * lat;   // sillon pariéto-occipital
    if (y > -0.05) d += 0.035 * Math.max(0, 1 - az / 0.03);                             // fissure longitudinale, entre les hémisphères
  }
  return Math.min(d, cerebellum(x, y, z), stem(x, y, z));
}

// le lobe d'un point, d'après les sillons
function lobeOf(x, y, z, dCer, dCb, dSt) {
  if (dSt < dCb - 0.005 && dSt < dCer - 0.005) return 'stem';
  if (dCb < dCer - 0.005) return 'cb';
  if (y < yOf(SYLV, x) - 0.005 && x < 0.64) return 'temporal';
  if (x < -0.5) return 'frontal';
  if (x > xOfDesc(PARO, y) + 0.0) return 'occipital';
  if (x < xOfDesc(CENT, y)) return 'frontal';
  return 'parietal';
}
const LOBE_TAG = { frontal: 8, parietal: 10, temporal: 12, occipital: 14, cb: 16 };

export default function build(n, seed = 1) {
  const R = rng(seed);
  const { pos, depth, v } = voxelShell(sdf, [-1.12, -1.3, -0.95, 1.12, 0.9, 0.95], n, { thick: 2.3 });
  const tag = new Uint8Array(n); const phase = new Float32Array(n).fill(-1);
  let x0 = 1e9; let x1 = -1e9; let y0 = 1e9; let y1 = -1e9; let z0 = 1e9; let z1 = -1e9;
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3]; const y = pos[i * 3 + 1]; const z = pos[i * 3 + 2];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
  }

  // les teintes, par lobe, clair sur les crêtes et foncé au fond des sillons
  const surface = [];
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3]; const y = pos[i * 3 + 1]; const z = pos[i * 3 + 2];
    const lobe = lobeOf(x, y, z, cerebrum(x, y, z), cerebellum(x, y, z), stem(x, y, z));
    let t;
    if (lobe === 'stem') t = 7;
    else if (lobe === 'cb') t = Math.abs(Math.cos(y * 72)) > 0.7 ? 17 : 16;
    else {
      const r = ridge(x, y, z);
      t = LOBE_TAG[lobe] + (r > 0.5 || R() < 0.06 ? 0 : 1);
      if (r > 0.93) t = 6;
      if (Math.abs(z) > 0.25 && (dPoly(x, y, SYLV) < 0.03 || dPoly(x, y, CENT) < 0.017 || dPoly(x, y, PARO) < 0.017)) t = LOBE_TAG[lobe] + 1;   // le fond des sillons est plus sombre
    }
    tag[i] = t;
    if (depth[i] > -1.7 * v) surface.push(i);
  }

  // des foyers d'activité et des faisceaux, posés sur la peau du côté visible (z > 0)
  const near = (tx, ty) => {
    let best = -1; let bd = 1e9;
    for (const i of surface) { const z = pos[i * 3 + 2]; if (z < 0.05) continue; const dx = pos[i * 3] - tx; const dy = pos[i * 3 + 1] - ty; const d = dx * dx + dy * dy - 0.002 * z; if (d < bd) { bd = d; best = i; } }
    return best;
  };
  const A = {
    front: near(-0.8, 0.16), frontTop: near(-0.36, 0.64), parietal: near(0.16, 0.66), parietalBack: near(0.46, 0.46), occipital: near(0.92, 0.0),
    temporalPole: near(-0.34, -0.46), temporalMid: near(0.2, -0.54), temporalBack: near(0.58, -0.4), cerebellum: near(0.62, -0.8), stem: near(0.34, -1.0),
  };
  const P = (k) => [pos[A[k] * 3], pos[A[k] * 3 + 1], pos[A[k] * 3 + 2]];
  const sources = ['front', 'parietal', 'occipital', 'temporalMid', 'cerebellum', 'stem'].map((k, s) => ({ p: P(k), off: s / 6 + R() * 0.04 }));
  // les fronts : la phase d'un cube est le temps que met le front à l'atteindre depuis le foyer le plus proche
  for (const i of surface) {
    let bd = 1e9; let bo = 0;
    for (const s of sources) { const d = Math.hypot(pos[i * 3] - s.p[0], pos[i * 3 + 1] - s.p[1], pos[i * 3 + 2] - s.p[2]); if (d < bd) { bd = d; bo = s.off; } }
    phase[i] = (bo + bd * 0.34) % 1;
  }
  // les faisceaux : des lignes de cubes bleus d'un lobe à l'autre, que parcourt un signal
  const arcs = [['front', 'parietal'], ['parietal', 'occipital'], ['front', 'temporalPole'], ['temporalMid', 'occipital'],
    ['cerebellum', 'occipital'], ['stem', 'temporalMid'], ['front', 'temporalMid'], ['frontTop', 'parietal']];
  const S = 64;
  const side = surface.filter((i) => pos[i * 3 + 2] > 0.04);
  const rr = (0.95 * v) * (0.95 * v);
  arcs.forEach(([ka, kb], ai) => {
    const a = P(ka); const b = P(kb);
    const base = (ai * 0.37 + R() * 0.2) % 1;
    const lift = (ai % 2 ? 1 : -1) * (0.05 + 0.03 * (ai % 3));
    for (let s = 0; s < S; s++) {
      const k = s / (S - 1);
      const qx = a[0] + (b[0] - a[0]) * k; const qy = a[1] + (b[1] - a[1]) * k + Math.sin(Math.PI * k) * lift;
      let m = -1; let bd = 1e9;
      for (const i of side) { const dx = pos[i * 3] - qx; const dy = pos[i * 3 + 1] - qy; const d = dx * dx + dy * dy - 0.00002 * pos[i * 3 + 2]; if (d < bd) { bd = d; m = i; } }
      if (m < 0) continue;
      const mx = pos[m * 3]; const my = pos[m * 3 + 1]; const mz = pos[m * 3 + 2];
      for (const i of side) {
        const dx = pos[i * 3] - mx; const dy = pos[i * 3 + 1] - my; const dz = pos[i * 3 + 2] - mz;
        if (dx * dx + dy * dy + dz * dz < rr) { tag[i] = 4; phase[i] = (base + k * 0.4) % 1; }
      }
    }
  });
  // les foyers brillent
  for (const s of sources) {
    const rr = (1.7 * v) * (1.7 * v);
    for (const i of surface) {
      const dx = pos[i * 3] - s.p[0]; const dy = pos[i * 3 + 1] - s.p[1]; const dz = pos[i * 3 + 2] - s.p[2];
      if (dx * dx + dy * dy + dz * dz < rr) tag[i] = 3;
    }
  }

  // recentrer
  const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2; const cz = (z0 + z1) / 2;
  const sc = 1.0 / Math.max((x1 - x0) / 2, 1e-6);
  for (let i = 0; i < n; i++) { pos[i * 3] = (pos[i * 3] - cx) * sc; pos[i * 3 + 1] = (pos[i * 3 + 1] - cy) * sc; pos[i * 3 + 2] = (pos[i * 3 + 2] - cz) * sc; }
  return { pos, tag, phase, cube: v * sc * 1.03, extent: [1.0, ((y1 - y0) / 2) * sc, ((z1 - z0) / 2) * sc], frame: { cx, cy, cz, sc } };
}

/**
 * Le champ du cerveau pour le maillage lisse : la distance signée, la boîte qui l'entoure et la teinte (étiquette) d'un point de la peau.
 * Les faisceaux et les foyers ne sont pas dans ce champ : ils viennent des cubes, reportés sur les sommets du maillage.
 */
export function field() {
  const lobeTag = (x, y, z) => {
    const lobe = lobeOf(x, y, z, cerebrum(x, y, z), cerebellum(x, y, z), stem(x, y, z));
    if (lobe === 'stem') return 7;
    if (lobe === 'cb') return Math.abs(Math.cos(y * 72)) > 0.7 ? 17 : 16;
    const r = ridge(x, y, z);
    let t = LOBE_TAG[lobe] + (r > 0.5 ? 0 : 1);
    if (r > 0.93) t = 6;
    if (Math.abs(z) > 0.25 && (dPoly(x, y, SYLV) < 0.03 || dPoly(x, y, CENT) < 0.017 || dPoly(x, y, PARO) < 0.017)) t = LOBE_TAG[lobe] + 1;
    return t;
  };
  return { sdf, bbox: [-1.12, -1.3, -0.95, 1.12, 0.9, 0.95], tagAt: lobeTag };
}
