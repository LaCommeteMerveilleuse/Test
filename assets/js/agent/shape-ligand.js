// BlackPhage - shape 3 of the agent, the LIGAND. A small designed protein (the binder, see binder.js) docked in the receptor pocket,
// made of n cubes in the colours of an AlphaFold cartoon (Deep Canyon Blue helix cores, light blue helix ends and strands,
// metallic gold loops, glowing Timber Glow termini).
// The cubes are the voxelisation of exactly the same triangles that receptor.js draws as a smooth mesh (both read binder.js), in the
// FRAME coordinate system (frame.js), docked pose. The key helix is planted in the pocket and the bundle sits above the rim. So the host
// places this cloud with the same anchor as the receptor scene and cross-fades the cubes into the mesh.
//
// Method, a voxel shell. The triangles are sampled densely (about two samples per voxel edge) and every voxel they touch becomes a cube.
// The voxel size comes from a few secant steps so that the shell holds just under n voxels. The remaining cubes are taken, in a seeded random
// order, from the layer of voxels right next to the shell (samples pushed along the normal), so the surface never has holes.
// Tags (palette of agent.js) are 4 very high confidence, 19 confident, 18 loops, 3 termini, from the mean confidence of the samples of a voxel.
//
// Returns { pos, tag, cube, extent, center, min, max, voxel }. extent is the half size of the bounding box of the cubes (|p - center| <= extent),
// min and max are the box itself, in FRAME units (the cloud is NOT re-centred, y runs from about 0.55 to 2.5).
import { binderMesh, confTag } from './binder.js';

function rng(seed) {
  let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const hash3 = (x, y, z) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// a small open-addressing hash of voxel keys, with the sum of the confidences of the samples that fall in each voxel
function makeHash(pow) {
  const size = 1 << pow;
  return { pow, mask: size - 1, keys: new Int32Array(size).fill(-1), sum: new Float32Array(size), cnt: new Uint16Array(size), n: 0 };
}
function put(h, key, c) {
  let i = Math.imul(key, 0x9e3779b1) >>> (32 - h.pow);
  for (;;) {
    const k = h.keys[i];
    if (k === key) { h.sum[i] += c; if (h.cnt[i] < 65535) h.cnt[i]++; return false; }
    if (k === -1) { h.keys[i] = key; h.sum[i] = c; h.cnt[i] = 1; h.n++; return true; }
    i = (i + 1) & h.mask;
  }
}
const has = (h, key) => {
  let i = Math.imul(key, 0x9e3779b1) >>> (32 - h.pow);
  for (;;) { const k = h.keys[i]; if (k === key) return true; if (k === -1) return false; i = (i + 1) & h.mask; }
};

/**
 * Walks over the surface of the mesh with samples about `spacing` voxel apart (barycentric lattice of every triangle).
 * mode 0: every sample marks its voxel in h (with its confidence). mode 1: the samples are first pushed along the interpolated normal by off,
 * and the voxels that are not in h yet are collected once in `seen` (the candidates for the top up).
 */
function sweep(M, a, org, off, spacing, h, seen, mode) {
  const { pos, nor, conf, idx } = M; const inv = 1 / a; const hs = spacing * a; const nt = idx.length / 3;
  for (let t = 0; t < nt; t++) {
    const i0 = idx[3 * t]; const i1 = idx[3 * t + 1]; const i2 = idx[3 * t + 2];
    const x0 = pos[3 * i0]; const y0 = pos[3 * i0 + 1]; const z0 = pos[3 * i0 + 2];
    const x1 = pos[3 * i1]; const y1 = pos[3 * i1 + 1]; const z1 = pos[3 * i1 + 2];
    const x2 = pos[3 * i2]; const y2 = pos[3 * i2 + 1]; const z2 = pos[3 * i2 + 2];
    const e = Math.max(Math.hypot(x1 - x0, y1 - y0, z1 - z0), Math.hypot(x2 - x1, y2 - y1, z2 - z1), Math.hypot(x0 - x2, y0 - y2, z0 - z2));
    const m = Math.min(40, Math.max(1, Math.ceil(e / hs)));
    const c0 = conf[i0]; const c1 = conf[i1]; const c2 = conf[i2];
    for (let u = 0; u <= m; u++) {
      for (let v = 0; v <= m - u; v++) {
        const bu = u / m; const bv = v / m; const bw = 1 - bu - bv;
        let x = bw * x0 + bu * x1 + bv * x2; let y = bw * y0 + bu * y1 + bv * y2; let z = bw * z0 + bu * z1 + bv * z2;
        if (mode === 1) {
          let nx = bw * nor[3 * i0] + bu * nor[3 * i1] + bv * nor[3 * i2]; let ny = bw * nor[3 * i0 + 1] + bu * nor[3 * i1 + 1] + bv * nor[3 * i2 + 1]; let nz = bw * nor[3 * i0 + 2] + bu * nor[3 * i1 + 2] + bv * nor[3 * i2 + 2];
          const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
          x += nx * off; y += ny * off; z += nz * off;
        }
        const key = Math.floor((x - org[0]) * inv) + 1024 * Math.floor((y - org[1]) * inv) + 1048576 * Math.floor((z - org[2]) * inv);
        const c = bw * c0 + bu * c1 + bv * c2;
        if (mode === 0) put(h, key, c);
        else if (!has(h, key)) put(seen, key, c);
      }
    }
  }
}

export default function build(n, seed = 1) {
  const r = rng(seed * 7919 + 3);
  const M = binderMesh({ step: 1 });
  // the area of the surface starts the search of the voxel size
  let area = 0;
  for (let t = 0; t < M.idx.length; t += 3) {
    const a = M.idx[t]; const b = M.idx[t + 1]; const c = M.idx[t + 2];
    const ux = M.pos[3 * b] - M.pos[3 * a]; const uy = M.pos[3 * b + 1] - M.pos[3 * a + 1]; const uz = M.pos[3 * b + 2] - M.pos[3 * a + 2];
    const vx = M.pos[3 * c] - M.pos[3 * a]; const vy = M.pos[3 * c + 1] - M.pos[3 * a + 1]; const vz = M.pos[3 * c + 2] - M.pos[3 * a + 2];
    area += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
  }
  const lo = M.min; const jitter = [r(), r(), r()];
  const hashPow = Math.max(15, Math.ceil(Math.log2(n * 3.2)));
  let a = Math.sqrt((1.22 + 0.10 * Math.min(1, Math.max(0, Math.log10(n / 2800) / 1.32))) * area / n);      // (a first guess, about 1.2 voxels per cell of the shell)
  let base = null; let best = null;
  const orgOf = (a) => [lo[0] - 3 * a - jitter[0] * a, lo[1] - 3 * a - jitter[1] * a, lo[2] - 3 * a - jitter[2] * a];
  const shell = (a, org) => { const h = makeHash(hashPow); sweep(M, a, org, 0, 0.55, h, null, 0); return h; };
  for (let it = 0; it < 12; it++) {
    const org = orgOf(a); const h = shell(a, org); const c = h.n;
    if (c <= n && (!best || c > best.h.n)) best = { h, a, org };
    if (c <= n && c >= 0.93 * n) { base = { h, a, org }; break; }
    a = Math.max(a * Math.sqrt(c / (0.965 * n)) ** 0.9, 0.0021);               // (the voxel keys hold 1024 cells per axis, so n up to about 100 000)
  }
  if (!base) base = best;
  if (!base) {                                                                  // pathological case, grow the voxel until the shell fits
    for (let it = 0; it < 8 && !base; it++) { a *= 1.15; const org = orgOf(a); const h = shell(a, org); if (h.n <= n) base = { h, a, org }; }
    if (!base) { a *= 3; const org = orgOf(a); base = { h: shell(a, org), a, org }; }
  }
  ({ a } = base);
  const { h, org } = base;
  // the layer of voxels just outside and just inside the shell holds the candidates to reach exactly n
  const need = n - h.n;
  let seen = null;
  if (need > 0) {
    seen = makeHash(hashPow);
    sweep(M, a, org, 0.62 * a, 1.1, h, seen, 1);
    sweep(M, a, org, -0.62 * a, 1.1, h, seen, 1);
  }
  // the shell, then `need` candidates taken in a seeded random order (a partial Fisher-Yates)
  const keys = new Int32Array(n); const confs = new Float32Array(n); let m = 0;
  for (let i = 0; i < h.keys.length; i++) if (h.keys[i] !== -1 && m < n) { keys[m] = h.keys[i]; confs[m] = h.sum[i] / h.cnt[i]; m++; }
  if (seen) {
    const ck = []; const cc = [];
    for (let i = 0; i < seen.keys.length; i++) if (seen.keys[i] !== -1) { ck.push(seen.keys[i]); cc.push(seen.sum[i] / seen.cnt[i]); }
    for (let i = 0; i < need && i < ck.length; i++) {
      const j = i + Math.floor(r() * (ck.length - i));
      const tk = ck[i]; ck[i] = ck[j]; ck[j] = tk; const tc = cc[i]; cc[i] = cc[j]; cc[j] = tc;
      keys[m] = ck[i]; confs[m] = cc[i]; m++;
    }
  }
  // (if the candidates ran short, which should not happen, duplicate shell voxels so that we always return n cubes)
  for (let i = 0; m < n; i++, m++) { keys[m] = keys[i % h.n]; confs[m] = confs[i % h.n]; }
  // a stable order that does not depend on the hash, sorted by key (the index travels in the low bits of a double)
  const packed = new Float64Array(n); for (let i = 0; i < n; i++) packed[i] = keys[i] * 262144 + i;
  packed.sort();
  const order = new Int32Array(n); for (let i = 0; i < n; i++) order[i] = packed[i] % 262144;

  const pos = new Float32Array(3 * n); const tag = new Uint8Array(n);
  const mn = [1e9, 1e9, 1e9]; const mx = [-1e9, -1e9, -1e9];
  for (let t = 0; t < n; t++) {
    const k = keys[order[t]];
    const iz = Math.floor(k / 1048576); const iy = Math.floor((k - iz * 1048576) / 1024); const ix = k - iz * 1048576 - iy * 1024;
    const x = org[0] + (ix + 0.5) * a; const y = org[1] + (iy + 0.5) * a; const z = org[2] + (iz + 0.5) * a;
    pos[3 * t] = x; pos[3 * t + 1] = y; pos[3 * t + 2] = z;
    if (x < mn[0]) mn[0] = x; if (x > mx[0]) mx[0] = x; if (y < mn[1]) mn[1] = y; if (y > mx[1]) mx[1] = y; if (z < mn[2]) mn[2] = z; if (z > mx[2]) mx[2] = z;
    tag[t] = confTag(confs[order[t]] + (hash3(ix, iy, iz) - 0.5) * 0.10);        // a little grain, so that the classes blend instead of forming hard bands
  }
  // the engine draws every cube with a random size between 0.9 and 1.1 of `cube`, so a little more than the voxel keeps neighbours touching
  const h2 = a * 1.06 / 2; const min = [mn[0] - h2, mn[1] - h2, mn[2] - h2]; const max = [mx[0] + h2, mx[1] + h2, mx[2] + h2];
  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const extent = [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2];
  return { pos, tag, cube: a * 1.06, extent, center, min, max, voxel: a };
}
