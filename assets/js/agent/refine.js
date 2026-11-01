// BlackPhage - le raffinement des bords. Le maillage lisse porte ses couleurs aux sommets : un liseré plus fin que l'écart entre deux sommets sort
// dentelé (un sommet est noir, son voisin blanc, et le triangle les mélange en escalier). On recoupe donc, une ou deux fois, les seuls triangles
// qui touchent une frontière entre deux matières. Les nouveaux sommets sont ramenés sur la surface par le champ de distance, si bien que la
// frontière est décrite au quart du pas là où il le faut, sans alourdir le reste du maillage. Maths pures, tourne dans le worker.
//
//   refineBoundaries(pos, index, sdf, h, touches, levels) -> { pos, index, level }
//     touches(i, pos, hLocal) : vrai si une frontière passe à moins d'un pas hLocal du sommet i (de coordonnées pos[3 i..3 i + 2])
//     level (Uint8Array, un par sommet) : 0 sommet d'origine, 1 coupé une fois, 2 coupé deux fois (le pas local vaut h / 2^level)

/**
 * Un point de la surface le plus proche d'un point voisin : un pas de Newton sur le champ de distance. Le pas est refusé quand le gradient s'annule
 * (l'axe médian d'une pièce plus fine que le maillage : l'antenne, l'anneau, un doigt) ou quand il serait plus long que max : mieux vaut garder le
 * milieu de l'arête que lancer un sommet au loin.
 */
function toSurface(sdf, p, e, max) {
  const x = p[0]; const y = p[1]; const z = p[2];
  const d = sdf(x, y, z);
  const gx = sdf(x + e, y, z) - sdf(x - e, y, z); const gy = sdf(x, y + e, z) - sdf(x, y - e, z); const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
  const g2 = gx * gx + gy * gy + gz * gz;
  if (!(g2 > 0)) return;
  const gl = Math.sqrt(g2) / (2 * e);                                  // la norme du gradient : 1 pour une vraie distance
  if (gl < 0.5 || gl > 1.6) return;
  const step = Math.abs(d) / gl;
  if (!(step <= max)) return;
  const k = d * 2 * e / g2;                                            // le gradient centré vaut 2 e ∇f, donc ∇f / |∇f|² = g * 2 e / |g|²
  p[0] = x - k * gx; p[1] = y - k * gy; p[2] = z - k * gz;
}

export function refineBoundaries(pos0, index0, sdf, h, touches, levels = 2) {
  let pos = pos0; let index = index0;
  let level = new Uint8Array(pos.length / 3);
  for (let L = 1; L <= levels; L++) {
    const nv = pos.length / 3; const hl = h / (1 << (L - 1));          // le pas des sommets qu'on teste ce tour-ci
    const flagged = new Uint8Array(nv);
    let any = 0;
    for (let i = 0; i < nv; i++) {
      if (level[i] !== L - 1) continue;                                // seuls les sommets du dernier tour décident d'une nouvelle coupe
      if (touches(i, pos, hl)) { flagged[i] = 1; any++; }
    }
    if (!any) break;
    const nt = index.length / 3;
    const edge = new Map(); const mids = []; const key = (a, b) => (a < b ? a * nv + b : b * nv + a);
    const mid = (a, b) => {
      const k = key(a, b); let m = edge.get(k);
      if (m === undefined) { m = nv + mids.length; edge.set(k, m); mids.push([a, b]); }
      return m;
    };
    for (let t = 0; t < nt; t++) {
      const a = index[t * 3]; const b = index[t * 3 + 1]; const c = index[t * 3 + 2];
      if (flagged[a] || flagged[b] || flagged[c]) { mid(a, b); mid(b, c); mid(c, a); }
    }
    const out = [];
    const e = 0.3 * hl;
    const np = new Float32Array((nv + mids.length) * 3); np.set(pos);
    for (let m = 0; m < mids.length; m++) {
      const a = mids[m][0]; const b = mids[m][1];
      const p = [(pos[a * 3] + pos[b * 3]) / 2, (pos[a * 3 + 1] + pos[b * 3 + 1]) / 2, (pos[a * 3 + 2] + pos[b * 3 + 2]) / 2];
      toSurface(sdf, p, e, 0.8 * hl);
      np[(nv + m) * 3] = p[0]; np[(nv + m) * 3 + 1] = p[1]; np[(nv + m) * 3 + 2] = p[2];
    }
    const dist2 = (i, j) => { const dx = np[i * 3] - np[j * 3]; const dy = np[i * 3 + 1] - np[j * 3 + 1]; const dz = np[i * 3 + 2] - np[j * 3 + 2]; return dx * dx + dy * dy + dz * dz; };
    for (let t = 0; t < nt; t++) {
      const a = index[t * 3]; const b = index[t * 3 + 1]; const c = index[t * 3 + 2];
      const ab = edge.get(key(a, b)); const bc = edge.get(key(b, c)); const ca = edge.get(key(c, a));
      const n = (ab !== undefined) + (bc !== undefined) + (ca !== undefined);
      if (n === 0) out.push(a, b, c);
      else if (n === 3) out.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
      else if (n === 1) {
        if (ab !== undefined) out.push(a, ab, c, ab, b, c);
        else if (bc !== undefined) out.push(b, bc, a, bc, c, a);
        else out.push(c, ca, b, ca, a, b);
      } else {                                                          // deux arêtes coupées : un petit triangle au sommet commun, et le quadrilatère par sa plus courte diagonale
        let s; let m1; let m2; let o1; let o2;                          // s : le sommet entre les deux arêtes coupées ; o1, o2 : les deux autres sommets
        if (ab !== undefined && bc !== undefined) { s = b; m1 = ab; m2 = bc; o1 = a; o2 = c; }
        else if (bc !== undefined && ca !== undefined) { s = c; m1 = bc; m2 = ca; o1 = b; o2 = a; }
        else { s = a; m1 = ca; m2 = ab; o1 = c; o2 = b; }
        out.push(m1, s, m2);
        // le quadrilatère o1, m1, m2, o2 (dans cet ordre autour du triangle)
        if (dist2(o1, m2) <= dist2(m1, o2)) out.push(o1, m1, m2, o1, m2, o2); else out.push(o1, m1, o2, m1, m2, o2);
      }
    }
    const lv = new Uint8Array(nv + mids.length); lv.set(level); lv.fill(L, nv);
    pos = np; index = Uint32Array.from(out); level = lv;
  }
  return { pos, index, level };
}
