// BlackPhage - outils de voxels, en calcul pur (aucune dépendance à three).
// voxelShell() remplit une coquille de cubes alignés sur une grille autour d'une surface (champ de distance signée), avec
// exactement n cubes : on choisit la taille du cube pour que le compte tombe juste, puis on complète ou on retire.

export function rng(seed) {
  let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const hash = (x, y, z) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Bruit de valeur en 3D, entre 0 et 1. */
export function noise3(x, y, z) {
  const xi = Math.floor(x); const yi = Math.floor(y); const zi = Math.floor(z);
  let fx = x - xi; let fy = y - yi; let fz = z - zi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), fx), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), fx), fy),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), fx), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), fx), fy), fz);
}

export const fbm3 = (x, y, z, oct = 3) => {
  let a = 0.5; let s = 0; let f = 1;
  for (let i = 0; i < oct; i++) { s += a * noise3(x * f + i * 17.3, y * f + i * 5.1, z * f + i * 9.7); a *= 0.5; f *= 2.03; }
  return s / (1 - Math.pow(0.5, oct));
};

export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

/** Distance approchée à un ellipsoïde de centre (cx, cy, cz) et de rayons (rx, ry, rz). */
export function sdEllipsoid(x, y, z, cx, cy, cz, rx, ry, rz) {
  const px = (x - cx) / rx; const py = (y - cy) / ry; const pz = (z - cz) / rz;
  const k0 = Math.hypot(px, py, pz);
  const k1 = Math.hypot(px / rx, py / ry, pz / rz);
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1;
}

export function sdCapsule(x, y, z, ax, ay, az, bx, by, bz, r) {
  const pax = x - ax; const pay = y - ay; const paz = z - az;
  const bax = bx - ax; const bay = by - ay; const baz = bz - az;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}

export function sdTorusY(x, y, z, cx, cy, cz, R, r) {
  const qx = Math.hypot(x - cx, z - cz) - R; const qy = y - cy;
  return Math.hypot(qx, qy) - r;
}

/**
 * Cubes alignés sur une grille, en coquille autour de la surface sdf = 0 (épaisseur thick cubes vers l'intérieur).
 * sdf(x, y, z) -> distance signée (négative dedans). bbox = [x0, y0, z0, x1, y1, z1]. Retourne exactement n cubes :
 * { pos: Float32Array(3n), depth: Float32Array(n) (<= 0 dans la coquille, > 0 pour les cubes ajoutés dehors), v: arête d'un cube }.
 */
export function voxelShell(sdf, bbox, n, { thick = 2.2, band = 2.2 } = {}) {
  const [x0, y0, z0, x1, y1, z1] = bbox;
  // 1. l'aire de la surface, par un balayage grossier
  const cs = Math.max(x1 - x0, y1 - y0, z1 - z0) / 56;
  let c = 0;
  for (let x = x0; x < x1; x += cs) for (let y = y0; y < y1; y += cs) for (let z = z0; z < z1; z += cs) if (Math.abs(sdf(x + cs / 2, y + cs / 2, z + cs / 2)) < cs * 0.5) c++;
  const area = c * cs * cs;
  let v = Math.sqrt(area * thick / n);
  for (let attempt = 0; attempt < 4; attempt++) {
    const xs = []; const ds = [];
    const nx = Math.ceil((x1 - x0) / v); const ny = Math.ceil((y1 - y0) / v); const nz = Math.ceil((z1 - z0) / v);
    const inner = -thick * v; const outer = band * v;
    for (let i = 0; i < nx; i++) {
      const x = x0 + (i + 0.5) * v;
      for (let j = 0; j < ny; j++) {
        const y = y0 + (j + 0.5) * v;
        for (let k = 0; k < nz; k++) {
          const z = z0 + (k + 0.5) * v;
          const d = sdf(x, y, z);
          if (d >= inner && d <= outer) { xs.push(x, y, z); ds.push(d); }
        }
      }
    }
    const m = ds.length;
    const inside = []; const outside = [];
    for (let i = 0; i < m; i++) (ds[i] <= 0 ? inside : outside).push(i);
    if (inside.length + outside.length < n) { v *= 0.93; continue; }
    // trop de cubes : on retire les plus profonds ; pas assez : on ajoute les plus proches de la surface, dehors
    let pick;
    if (inside.length >= n) { inside.sort((a, b) => ds[b] - ds[a]); pick = inside.slice(0, n); }
    else { outside.sort((a, b) => ds[a] - ds[b]); pick = inside.concat(outside.slice(0, n - inside.length)); }
    const pos = new Float32Array(3 * n); const depth = new Float32Array(n);
    for (let i = 0; i < n; i++) { const s = pick[i]; pos[i * 3] = xs[s * 3]; pos[i * 3 + 1] = xs[s * 3 + 1]; pos[i * 3 + 2] = xs[s * 3 + 2]; depth[i] = ds[s]; }
    return { pos, depth, v };
  }
  throw new Error('voxelShell : pas assez de cubes');
}
