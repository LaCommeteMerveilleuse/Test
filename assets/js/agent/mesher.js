// BlackPhage - le mailleur. Il transforme un champ de distance signée (f < 0 dedans) en maillage lisse par Surface Nets, et reporte sur les
// sommets les couleurs et les matières des cubes de la même forme. Maths pures, aucune dépendance : il tourne dans un worker.
//
//   meshSDF(f, bbox, h)         -> { pos: Float32Array(3 v), index: Uint32Array(3 t) }
//   vertexNormals(pos, index)   -> Float32Array(3 v)
//   transferFromCubes(...)      -> { col, mat, phase } par sommet
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

/**
 * Surface Nets sur la boîte b = [x0, y0, z0, x1, y1, z1], pas h. Un échantillonnage grossier (blocs de S pas) saute le vide :
 * un bloc dont les huit coins sont plus loin de la surface que sa diagonale n'est pas évalué, seul son signe compte.
 */
export function meshSDF(f, b, h) {
  const S = 4;
  const ox = b[0] - h; const oy = b[1] - h; const oz = b[2] - h;
  const nx = Math.ceil((b[3] - b[0]) / h) + 3; const ny = Math.ceil((b[4] - b[1]) / h) + 3; const nz = Math.ceil((b[5] - b[2]) / h) + 3;
  const F = new Float32Array(nx * ny * nz).fill(NaN);
  // les coins des blocs
  const bx = Math.ceil((nx - 1) / S); const by = Math.ceil((ny - 1) / S); const bz = Math.ceil((nz - 1) / S);
  const cnx = bx + 1; const cny = by + 1; const cnz = bz + 1;
  const C = new Float32Array(cnx * cny * cnz);
  for (let k = 0; k < cnz; k++) for (let j = 0; j < cny; j++) for (let i = 0; i < cnx; i++) C[i + cnx * (j + cny * k)] = f(ox + Math.min(i * S, nx - 1) * h, oy + Math.min(j * S, ny - 1) * h, oz + Math.min(k * S, nz - 1) * h);
  const thr = S * h * Math.sqrt(3) * 1.3;
  const far = new Uint8Array(bx * by * bz);
  for (let k = 0; k < bz; k++) for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
    let mn = 1e9; let neg = 0;
    for (let c = 0; c < 8; c++) { const v = C[(i + (c & 1)) + cnx * ((j + ((c >> 1) & 1)) + cny * (k + ((c >> 2) & 1)))]; if (Math.abs(v) < mn) mn = Math.abs(v); if (v < 0) neg++; }
    far[i + bx * (j + by * k)] = (mn > thr && (neg === 0 || neg === 8)) ? 1 : 0;
  }
  // d'abord les blocs proches de la surface, évalués noeud par noeud
  for (let k = 0; k < bz; k++) for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
    if (far[i + bx * (j + by * k)]) continue;
    const i1 = Math.min((i + 1) * S, nx - 1); const j1 = Math.min((j + 1) * S, ny - 1); const k1 = Math.min((k + 1) * S, nz - 1);
    for (let kk = k * S; kk <= k1; kk++) for (let jj = j * S; jj <= j1; jj++) for (let ii = i * S; ii <= i1; ii++) {
      const p = ii + nx * (jj + ny * kk);
      if (F[p] !== F[p]) F[p] = f(ox + ii * h, oy + jj * h, oz + kk * h);
    }
  }
  // puis les blocs lointains : le signe suffit
  for (let k = 0; k < bz; k++) for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
    if (!far[i + bx * (j + by * k)]) continue;
    const v = C[i + cnx * (j + cny * k)];
    const i1 = Math.min((i + 1) * S, nx - 1); const j1 = Math.min((j + 1) * S, ny - 1); const k1 = Math.min((k + 1) * S, nz - 1);
    for (let kk = k * S; kk <= k1; kk++) for (let jj = j * S; jj <= j1; jj++) for (let ii = i * S; ii <= i1; ii++) {
      const p = ii + nx * (jj + ny * kk);
      if (F[p] !== F[p]) F[p] = v;
    }
  }
  const cx = nx - 1; const cy = ny - 1; const cz = nz - 1;
  const vid = new Int32Array(cx * cy * cz).fill(-1);
  let V = new Float32Array(3 << 15); let nvert = 0;
  const sy = nx; const sz = nx * ny;
  const EDGE = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const val = new Float32Array(8);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    const p = i + nx * (j + ny * k);
    val[0] = F[p]; val[1] = F[p + 1]; val[2] = F[p + sy]; val[3] = F[p + sy + 1]; val[4] = F[p + sz]; val[5] = F[p + sz + 1]; val[6] = F[p + sz + sy]; val[7] = F[p + sz + sy + 1];
    let neg = 0; for (let c = 0; c < 8; c++) if (val[c] < 0) neg++;
    if (neg === 0 || neg === 8) continue;
    let sx = 0; let syy = 0; let szz = 0; let cnt = 0;
    for (let e = 0; e < 12; e++) {
      const c0 = EDGE[e][0]; const c1 = EDGE[e][1]; const a0 = val[c0]; const a1 = val[c1];
      if ((a0 < 0) !== (a1 < 0)) {
        const t = a0 / (a0 - a1);
        sx += (c0 & 1) + ((c1 & 1) - (c0 & 1)) * t; syy += ((c0 >> 1) & 1) + (((c1 >> 1) & 1) - ((c0 >> 1) & 1)) * t; szz += ((c0 >> 2) & 1) + (((c1 >> 2) & 1) - ((c0 >> 2) & 1)) * t; cnt++;
      }
    }
    vid[i + cx * (j + cy * k)] = nvert;
    if (3 * nvert + 3 > V.length) { const nv2 = new Float32Array(V.length * 2); nv2.set(V); V = nv2; }
    V[3 * nvert] = ox + (i + sx / cnt) * h; V[3 * nvert + 1] = oy + (j + syy / cnt) * h; V[3 * nvert + 2] = oz + (k + szz / cnt) * h; nvert++;
  }
  let I = new Uint32Array(6 << 15); let nidx = 0;
  const quad = (a, b2, c, d, flip) => {
    if (a < 0 || b2 < 0 || c < 0 || d < 0) return;
    if (nidx + 6 > I.length) { const ni2 = new Uint32Array(I.length * 2); ni2.set(I); I = ni2; }
    if (flip) { I[nidx] = a; I[nidx + 1] = d; I[nidx + 2] = c; I[nidx + 3] = a; I[nidx + 4] = c; I[nidx + 5] = b2; } else { I[nidx] = a; I[nidx + 1] = b2; I[nidx + 2] = c; I[nidx + 3] = a; I[nidx + 4] = c; I[nidx + 5] = d; }
    nidx += 6;
  };
  const cell = (i, j, k) => vid[i + cx * (j + cy * k)];
  for (let k = 1; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 1; i < cx; i++) {
    const p = i + nx * (j + ny * k); const inside = F[p] < 0;
    if (inside !== (F[p + 1] < 0)) quad(cell(i, j - 1, k - 1), cell(i, j, k - 1), cell(i, j, k), cell(i, j - 1, k), !inside);
    if (inside !== (F[p + sy] < 0)) quad(cell(i - 1, j, k - 1), cell(i - 1, j, k), cell(i, j, k), cell(i, j, k - 1), !inside);
    if (inside !== (F[p + sz] < 0)) quad(cell(i - 1, j - 1, k), cell(i, j - 1, k), cell(i, j, k), cell(i - 1, j, k), !inside);
  }
  return { pos: V.slice(0, nvert * 3), index: I.slice(0, nidx) };
}

/** Un lissage de Laplace doux (garde le volume à peu près) pour effacer l'escalier des Surface Nets. */
export function smoothMesh(pos, index, passes = 2, lambda = 0.5) {
  const nv = pos.length / 3;
  const acc = new Float32Array(pos.length); const cnt = new Uint16Array(nv);
  for (let p = 0; p < passes; p++) {
    acc.fill(0); cnt.fill(0);
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t]; const b = index[t + 1]; const c = index[t + 2];
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        acc[u * 3] += pos[v * 3]; acc[u * 3 + 1] += pos[v * 3 + 1]; acc[u * 3 + 2] += pos[v * 3 + 2]; cnt[u]++;
        acc[v * 3] += pos[u * 3]; acc[v * 3 + 1] += pos[u * 3 + 1]; acc[v * 3 + 2] += pos[u * 3 + 2]; cnt[v]++;
      }
    }
    for (let i = 0; i < nv; i++) {
      if (!cnt[i]) continue;
      pos[i * 3] += (acc[i * 3] / cnt[i] - pos[i * 3]) * lambda; pos[i * 3 + 1] += (acc[i * 3 + 1] / cnt[i] - pos[i * 3 + 1]) * lambda; pos[i * 3 + 2] += (acc[i * 3 + 2] / cnt[i] - pos[i * 3 + 2]) * lambda;
    }
  }
}

/** Normales de sommet : la somme des normales de faces, pondérées par l'aire. */
export function vertexNormals(pos, index) {
  const n = new Float32Array(pos.length);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t] * 3; const b = index[t + 1] * 3; const c = index[t + 2] * 3;
    const ux = pos[b] - pos[a]; const uy = pos[b + 1] - pos[a + 1]; const uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a]; const vy = pos[c + 1] - pos[a + 1]; const vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
    for (const q of [a, b, c]) { n[q] += nx; n[q + 1] += ny; n[q + 2] += nz; }
  }
  for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
  return n;
}

// la matière d'une étiquette : [métal, rugosité, émission]
const MATERIAL = (() => {
  const m = new Array(20).fill(null);
  m[0] = [0.5, 0.34, 0]; m[1] = [0.55, 0.36, 0]; m[2] = [0.7, 0.3, 0]; m[3] = [0.0, 0.5, 1.0]; m[4] = [0.55, 0.26, 0]; m[5] = [0.25, 0.1, 0];
  m[6] = [0.3, 0.26, 0]; m[7] = [0.5, 0.32, 0]; for (let t = 8; t <= 17; t++) m[t] = [0.0, 0.5, 0]; m[18] = [0.9, 0.25, 0]; m[19] = [0.4, 0.3, 0];
  return m;
})();
// les étiquettes « de recouvrement » : des zones aux bords nets (faisceaux, foyers, verre, yeux), posées sur un fond qui se mélange en douceur
const OVERLAY = new Set([2, 3, 4, 5, 18, 19]);

/**
 * Reporte sur chaque sommet la couleur (palette en sRGB 0..1, une entrée par étiquette), la matière et la phase des cubes voisins.
 * cubes : { pos (3 m), tag (m), phase? (m) }, pitch : l'arête d'un cube, verts : les sommets dans le même repère que les cubes.
 * Le fond (gris, lobes) se mélange par un poids gaussien autour de chaque cube ; les zones de recouvrement (sombre, lumineux, bleu, vert, or) gardent un
 * bord net : on prend la plus présente et on la découpe par un seuil.
 */
export function transferFromCubes(verts, cubes, pitch, palette, baseTags = null) {
  const nv = verts.length / 3; const m = cubes.tag.length;
  const R = pitch * 2.4; const inv = 1 / R;
  const key = (i, j, k) => ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512);
  const cells = new Map();
  for (let q = 0; q < m; q++) {
    const k = key(Math.floor(cubes.pos[q * 3] * inv), Math.floor(cubes.pos[q * 3 + 1] * inv), Math.floor(cubes.pos[q * 3 + 2] * inv));
    let arr = cells.get(k); if (!arr) { arr = []; cells.set(k, arr); } arr.push(q);
  }
  const col = new Float32Array(nv * 3); const mat = new Float32Array(nv * 3); const phase = new Float32Array(nv).fill(-1);
  const sgBase = 1 / (2 * (pitch * 1.0) * (pitch * 1.0)); const sgOver = 1 / (2 * (pitch * 0.7) * (pitch * 0.7));
  const ow = new Float32Array(20);
  for (let v = 0; v < nv; v++) {
    const x = verts[v * 3]; const y = verts[v * 3 + 1]; const z = verts[v * 3 + 2];
    const ci = Math.floor(x * inv); const cj = Math.floor(y * inv); const ck = Math.floor(z * inv);
    let Wb = 0; let r = 0; let g = 0; let bl = 0; let me = 0; let ro = 0; let Wall = 0; let near = 1e9; let nearTag = 0;
    let sB = 0; let cB = 0; let wB = 0; let sO = 0; let cO = 0; let wO = 0;          // la phase se moyenne sur le cercle : le fond d'un côté, les faisceaux de l'autre
    ow.fill(0);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (let dk = -1; dk <= 1; dk++) {
      const arr = cells.get(key(ci + di, cj + dj, ck + dk)); if (!arr) continue;
      for (let a = 0; a < arr.length; a++) {
        const q = arr[a];
        const dx = cubes.pos[q * 3] - x; const dy = cubes.pos[q * 3 + 1] - y; const dz = cubes.pos[q * 3 + 2] - z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < near) { near = d2; nearTag = cubes.tag[q]; }
        const t = cubes.tag[q];
        const wo = Math.exp(-d2 * sgOver); Wall += wo;
        if (OVERLAY.has(t)) {
          ow[t] += wo;
          if (cubes.phase && cubes.phase[q] >= 0) { const a = cubes.phase[q] * 6.2831853; sO += wo * Math.sin(a); cO += wo * Math.cos(a); wO += wo; }
          continue;
        }
        const w = Math.exp(-d2 * sgBase); if (w < 0.02) continue;
        if (!baseTags) {
          const c = palette[t] || palette[0]; const mt = MATERIAL[t] || MATERIAL[0];
          Wb += w; r += w * c[0]; g += w * c[1]; bl += w * c[2]; me += w * mt[0]; ro += w * mt[1];
        }
        if (cubes.phase && cubes.phase[q] >= 0) { const a = cubes.phase[q] * 6.2831853; sB += w * Math.sin(a); cB += w * Math.cos(a); wB += w; }
      }
    }
    if (baseTags) { const bt0 = baseTags[v]; const c = palette[bt0] || palette[0]; const mt = MATERIAL[bt0] || MATERIAL[0]; r = c[0]; g = c[1]; bl = c[2]; me = mt[0]; ro = mt[1]; Wb = 1; }
    if (Wb < 1e-6) { const c = palette[OVERLAY.has(nearTag) ? 0 : nearTag] || palette[0]; const mt = MATERIAL[OVERLAY.has(nearTag) ? 0 : nearTag] || MATERIAL[0]; r = c[0]; g = c[1]; bl = c[2]; me = mt[0]; ro = mt[1]; Wb = 1; }
    let cr = r / Wb; let cg = g / Wb; let cb = bl / Wb; let cm = me / Wb; let cro = ro / Wb; let em = 0;
    // la zone de recouvrement la plus présente, découpée net
    let bt = -1; let bf = 0;
    for (const t of OVERLAY) { const f = ow[t] / Math.max(Wall, 1e-6); if (f > bf) { bf = f; bt = t; } }
    if (bt >= 0) {
      const k = Math.min(1, Math.max(0, (bf - 0.3) / 0.22)); const e = k * k * (3 - 2 * k);
      const c = palette[bt]; const mt = MATERIAL[bt];
      cr += (c[0] - cr) * e; cg += (c[1] - cg) * e; cb += (c[2] - cb) * e; cm += (mt[0] - cm) * e; cro += (mt[1] - cro) * e; em = mt[2] * e;
    }
    col[v * 3] = cr; col[v * 3 + 1] = cg; col[v * 3 + 2] = cb;
    mat[v * 3] = cm; mat[v * 3 + 1] = cro; mat[v * 3 + 2] = em;
    // sur un faisceau c'est sa phase, ailleurs celle du fond
    const useO = bt === 4 && wO > 0 && bf > 0.3;
    const ss = useO ? sO : sB; const cc = useO ? cO : cB; const ww = useO ? wO : wB;
    phase[v] = ww > 1e-4 ? ((Math.atan2(ss, cc) / 6.2831853) + 1) % 1 : -1;
  }
  return { col, mat, phase };
}

/** Un lissage doux d'un attribut par sommet (moyenne des voisins du maillage) : adoucit les marches des couleurs reportées. */
export function smoothAttr(index, attr, comps, nv, passes = 1, k = 0.5) {
  const acc = new Float32Array(nv * comps); const cnt = new Uint16Array(nv);
  for (let p = 0; p < passes; p++) {
    acc.fill(0); cnt.fill(0);
    for (let t = 0; t < index.length; t += 3) {
      const tri = [index[t], index[t + 1], index[t + 2]];
      for (let e = 0; e < 3; e++) {
        const u = tri[e]; const v = tri[(e + 1) % 3];
        for (let c = 0; c < comps; c++) { acc[u * comps + c] += attr[v * comps + c]; acc[v * comps + c] += attr[u * comps + c]; }
        cnt[u]++; cnt[v]++;
      }
    }
    for (let i = 0; i < nv; i++) { if (!cnt[i]) continue; for (let c = 0; c < comps; c++) attr[i * comps + c] += (acc[i * comps + c] / cnt[i] - attr[i * comps + c]) * k; }
  }
}

export { clamp };
