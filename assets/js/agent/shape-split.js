// BlackPhage - la forme 1 : l'agent se divise en trois amas, un par famille de médicaments.
// À gauche une orbe et son anneau (le métabolisme), au centre un haltère (le muscle), à droite une étoile (l'inflammation).
// Les trois amas se tiennent à x = -1.7, 0 et 1.7.
import { rng, smin, sdEllipsoid, sdCapsule, sdTorusY, voxelShell } from './voxel.js';

const orb = (x, y, z) => smin(Math.hypot(x, y, z) - 0.4, sdTorusY(x, y, z, 0, 0, 0, 0.66, 0.065), 0.04);
const dumbbell = (x, y, z) => {
  let d = Math.min(Math.hypot(x - 0.4, y, z) - 0.27, Math.hypot(x + 0.4, y, z) - 0.27);
  d = smin(d, sdCapsule(x, y, z, -0.4, 0, 0, 0.4, 0, 0, 0.1), 0.08);
  d = Math.min(d, Math.abs(Math.abs(x) - 0.62) < 0.05 ? Math.hypot(Math.abs(Math.abs(x) - 0.62) * 1.4, Math.hypot(y, z) - 0.2) - 0.1 : 9);
  return d;
};
// douze pointes sur les sommets d'un icosaèdre
const PH = (1 + Math.sqrt(5)) / 2;
const DIRS = [];
for (const [a, b] of [[1, PH], [-1, PH], [1, -PH], [-1, -PH]]) { DIRS.push([0, a, b], [a, b, 0], [b, 0, a]); }
DIRS.forEach((d) => { const l = Math.hypot(...d); d[0] /= l; d[1] /= l; d[2] /= l; });
const star = (x, y, z) => {
  let d = Math.hypot(x, y, z) - 0.3;
  for (const [dx, dy, dz] of DIRS) {
    const t = Math.min(0.62, Math.max(0, x * dx + y * dy + z * dz));          // le long de la pointe
    const r = 0.1 * (1 - t / 0.66);
    d = Math.min(d, Math.hypot(x - dx * t, y - dy * t, z - dz * t) - r);
  }
  return d;
};

export default function build(n, seed = 1) {
  const R = rng(seed);
  const each = n / 3;
  const pos = new Float32Array(3 * n); const tag = new Uint8Array(n);
  const parts = [
    { f: orb, cx: -1.7, bbox: [-0.8, -0.8, -0.8, 0.8, 0.8, 0.8], tagFn: (x, y, z, d, v) => (Math.abs(y) < 0.07 && Math.hypot(x, z) > 0.5 ? 4 : (Math.hypot(x, y, z) < 0.42 && (Math.abs(x * 3.1 + z * 2.3) < 0.09) ? 3 : (Math.hypot(x, y, z) < 0.42 ? (y > 0.1 ? 6 : 0) : 7))) },
    { f: dumbbell, cx: 0, bbox: [-0.9, -0.5, -0.5, 0.9, 0.5, 0.5], tagFn: (x, y, z, d, v) => (Math.abs(Math.abs(x) - 0.62) < 0.05 ? 5 : (Math.abs(x) < 0.08 ? 3 : (Math.abs(x) > 0.3 ? (y > 0.05 ? 0 : 1) : 2))) },
    { f: star, cx: 1.7, bbox: [-0.95, -0.95, -0.95, 0.95, 0.95, 0.95], tagFn: (x, y, z, d, v) => (Math.hypot(x, y, z) > 0.52 ? 3 : (Math.hypot(x, y, z) > 0.33 ? 1 : (y > 0 ? 0 : 6))) },
  ];
  let cube = 0; let o = 0;
  for (const p of parts) {
    const { pos: q, depth, v } = voxelShell(p.f, p.bbox, each, { thick: 3.2 });
    cube = Math.max(cube, v);
    for (let i = 0; i < each; i++) {
      pos[o * 3] = q[i * 3] + p.cx; pos[o * 3 + 1] = q[i * 3 + 1]; pos[o * 3 + 2] = q[i * 3 + 2];
      let t = p.tagFn(q[i * 3], q[i * 3 + 1], q[i * 3 + 2], depth[i], v);
      if (t === 0 && R() < 0.16) t = 1;
      tag[o] = t; o++;
    }
  }
  return { pos, tag, cube: cube * 1.03, extent: [2.5, 0.95, 0.95] };
}
