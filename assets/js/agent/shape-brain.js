// BlackPhage - la forme 0 : un cerveau numérique fait de cubes. Vue de profil (le lobe frontal à gauche), avec ses circonvolutions,
// un cervelet rayé, un tronc cérébral, des traces de circuit en Deep Canyon Blue et des points de lumière Timber Glow.
import { rng, noise3, fbm3, smin, sdEllipsoid, sdCapsule, voxelShell } from './voxel.js';

const ridge = (x, y, z) => {
  const wx = noise3(x * 2.6 + 3.1, y * 2.6, z * 2.6) - 0.5; const wy = noise3(x * 2.6, y * 2.6 + 7.7, z * 2.6) - 0.5; const wz = noise3(x * 2.6, y * 2.6, z * 2.6 + 4.3) - 0.5;
  const n = noise3(x * 6.2 + wx * 2.4, y * 6.2 + wy * 2.4, z * 6.2 + wz * 2.4);
  return Math.pow(1 - Math.abs(2 * n - 1), 1.6);
};

function sdf(x, y, z) {
  const az = Math.abs(z);
  let d = sdEllipsoid(x, y, az, 0.03, 0.12, 0, 0.98, 0.62, 0.72);
  d = smin(d, sdEllipsoid(x, y, az, -0.5, 0.02, 0, 0.58, 0.54, 0.62), 0.14);
  d = smin(d, sdEllipsoid(x, y, az, 0.6, 0.06, 0, 0.42, 0.5, 0.58), 0.14);
  d = smin(d, sdEllipsoid(x, y, az, -0.02, -0.34, 0.33, 0.52, 0.2, 0.26), 0.1);        // le lobe temporal
  d = Math.max(d, -0.6 - y);                                                            // le dessous, à plat
  d -= 0.052 * ridge(x, y, z);                                                          // les circonvolutions
  if (y > -0.22) d = Math.max(d, 0.03 - az);                                            // la fissure du dessus
  const cb = sdEllipsoid(x, y, az, 0.66, -0.5, 0, 0.34, 0.2, 0.4) - 0.013 * Math.abs(Math.sin(y * 70));
  d = smin(d, cb, 0.05);
  d = smin(d, sdCapsule(x, y, az, 0.34, -0.38, 0, 0.42, -0.98, 0, 0.1), 0.08);
  return d;
}

export default function build(n, seed = 1) {
  const R = rng(seed);
  const { pos, depth, v } = voxelShell(sdf, [-1.1, -1.05, -0.85, 1.1, 0.8, 0.85], n, { thick: 2.3 });
  const tag = new Uint8Array(n);
  // recentrer et mesurer
  let x0 = 1e9; let x1 = -1e9; let y0 = 1e9; let y1 = -1e9; let z0 = 1e9; let z1 = -1e9;
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3]; const y = pos[i * 3 + 1]; const z = pos[i * 3 + 2];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2; const cz = (z0 + z1) / 2;
  const sc = 1.0 / Math.max((x1 - x0) / 2, 1e-6);
  // des points de lumière sur la peau
  const nodes = [];
  const surface = [];
  for (let i = 0; i < n; i++) if (depth[i] > -1.2 * v) surface.push(i);
  for (let k = 0; k < 34 && surface.length; k++) { const i = surface[Math.floor(R() * surface.length)]; nodes.push([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], (0.9 + R() * 1.1) * v]); }
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3]; const y = pos[i * 3 + 1]; const z = pos[i * 3 + 2];
    let t;
    const isCb = x > 0.38 && y < -0.28 && Math.abs(Math.sin(y * 70)) < 0.5;
    if (y < -0.42 && x > 0.28 && x < 0.52 && Math.abs(z) < 0.14 && y < -0.8) t = 7;            // le tronc
    else if (x > 0.34 && y < -0.3) t = isCb ? 2 : 1;                                          // le cervelet
    else {
      const r = ridge(x, y, z);
      t = r > 0.86 ? 6 : r > 0.62 ? 0 : r > 0.4 ? 1 : 2;
      if (Math.abs(fbm3(x * 2.0 + 11, y * 2.0, z * 2.0) - 0.5) < 0.02 && depth[i] > -1.5 * v) t = 4;   // les traces de circuit
    }
    for (let k = 0; k < nodes.length; k++) { const nd = nodes[k]; const dx = x - nd[0]; const dy = y - nd[1]; const dz = z - nd[2]; if (dx * dx + dy * dy + dz * dz < nd[3] * nd[3]) { t = 3; break; } }
    tag[i] = t;
    pos[i * 3] = (x - cx) * sc; pos[i * 3 + 1] = (y - cy) * sc; pos[i * 3 + 2] = (z - cz) * sc;
  }
  return { pos, tag, cube: v * sc * 1.03, extent: [1.0, ((y1 - y0) / 2) * sc, ((z1 - z0) / 2) * sc] };
}
