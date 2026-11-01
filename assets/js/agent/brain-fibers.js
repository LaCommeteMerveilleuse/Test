// BlackPhage - les fibres du cerveau. À l'intérieur du cortex translucide courent des faisceaux de substance blanche : des fibres d'association
// (d'une circonvolution à l'autre, dans le même hémisphère), des fibres commissurales (d'un hémisphère à l'autre, en arches sous la fissure),
// des fibres de projection (du cortex vers le tronc cérébral, en éventail) et des fibres du cervelet. Maths pures : tout vient du champ de
// distance (pour rester à l'intérieur) et des sommets du maillage (pour partir de la surface). Le résultat sert à dessiner, dans smooth.js,
// des rubans fins où courent des impulsions.
import { rng } from './voxel.js';

const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** Les six foyers d'activité, posés sur la peau du côté visible (z > 0). Retourne des positions et un décalage de temps par foyer. */
export function pickSources(pos) {
  const nv = pos.length / 3;
  const targets = [[-0.8, 0.16, 0.5], [0.16, 0.66, 0.3], [0.92, 0.0, 0.2], [0.2, -0.54, 0.5], [0.62, -0.8, 0.3], [0.34, -1.0, 0.08]];
  const out = new Float32Array(18); const off = new Float32Array(6);
  targets.forEach((t, k) => {
    let best = -1; let bd = 1e9;
    for (let i = 0; i < nv; i += 3) {                          // un sommet sur trois suffit
      if (pos[i * 3 + 2] < 0.04) continue;
      const dx = pos[i * 3] - t[0]; const dy = pos[i * 3 + 1] - t[1]; const dz = pos[i * 3 + 2] - t[2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    out[k * 3] = pos[best * 3]; out[k * 3 + 1] = pos[best * 3 + 1]; out[k * 3 + 2] = pos[best * 3 + 2];
    off[k] = k / 6;
  });
  return { pos: out, off };
}

/**
 * pos, nrm : les sommets du maillage de la surface ; sdf : la distance signée (négative dedans) ; src : les foyers (pickSources).
 * Retourne { seg: Float32Array(8 * n) [x0,y0,z0,x1,y1,z1,s0,s1], fib: Float32Array(3 * n) [phase, vitesse, famille], count: n }.
 */
export function makeFibers({ pos, nrm, sdf, src }, seed = 5, scale = 1) {
  const R = rng(seed);
  const nv = pos.length / 3;
  const center = [0.15, -0.05, 0.0];
  const K = 20;                                                  // points par fibre
  const segs = []; const info = [];
  const V = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  const N = (i) => [nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]];
  const keep = (p) => {                                          // ramène un point à l'intérieur du cerveau
    let q = p;
    for (let it = 0; it < 8 && sdf(q[0], q[1], q[2]) > -0.02; it++) q = [q[0] + (center[0] - q[0]) * 0.12, q[1] + (center[1] - q[1]) * 0.12, q[2] + (center[2] - q[2]) * 0.12];
    return q;
  };
  const bez = (a, c, b, t) => { const u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1], u * u * a[2] + 2 * u * t * c[2] + t * t * b[2]]; };
  const phaseOf = (a) => {                                       // le temps que met l'onde du foyer le plus proche à atteindre le début de la fibre
    let bd = 1e9; let bo = 0;
    for (let k = 0; k < 6; k++) { const d = Math.hypot(a[0] - src.pos[k * 3], a[1] - src.pos[k * 3 + 1], a[2] - src.pos[k * 3 + 2]); if (d < bd) { bd = d; bo = src.off[k]; } }
    return (bo + bd * 0.32) % 1;
  };
  const add = (a, c, b, family, speed) => {
    const pts = []; let len = 0;
    for (let k = 0; k < K; k++) { const p = keep(bez(a, c, b, k / (K - 1))); if (k) len += Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1], p[2] - pts[k - 1][2]); pts.push(p); }
    const ph = phaseOf(a); let acc = 0;
    for (let k = 0; k < K - 1; k++) {
      const d = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1], pts[k + 1][2] - pts[k][2]);
      segs.push([pts[k][0], pts[k][1], pts[k][2], pts[k + 1][0], pts[k + 1][1], pts[k + 1][2], acc / len, (acc + d) / len]);
      info.push([ph, speed * (0.85 + 0.3 * R()), family]);
      acc += d;
    }
  };

  // des faisceaux : plusieurs fibres presque parallèles, du même point d'attache au même point d'arrivée, comme de vrais tractus
  const nearIdx = (c, r, max) => {
    const out = []; const r2 = r * r;
    for (let i = 0; i < nv && out.length < 400; i++) {
      const dx = pos[i * 3] - c[0]; const dy = pos[i * 3 + 1] - c[1]; const dz = pos[i * 3 + 2] - c[2];
      if (dx * dx + dy * dy + dz * dz < r2) out.push(i);
    }
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out.slice(0, max);
  };
  const bundle = (a0, b0, count, spread, depth, family, speed) => {
    const na = nearIdx(a0, spread, count); const nb = nearIdx(b0, spread, count);
    for (let q = 0; q < Math.min(na.length, nb.length); q++) {
      const a = V(na[q]); const b = V(nb[q]);
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      const inw = norm3([center[0] - mid[0], center[1] - mid[1], center[2] - mid[2]]);
      const dp = depth * (0.9 + 0.2 * R());
      add(a, [mid[0] + inw[0] * dp, mid[1] + inw[1] * dp, mid[2] + inw[2] * dp], b, family, speed);
    }
  };
  const randSurface = (pred) => { for (let t = 0; t < 400; t++) { const i = Math.floor(R() * nv); const a = V(i); if (pred(a)) return a; } return null; };

  // association : de longs arcs d'une circonvolution à l'autre, dans le même hémisphère, qui plongent sous le cortex
  const nAssoc = Math.round(30 * scale);
  for (let f = 0; f < nAssoc; f++) {
    const a = randSurface((v) => !(v[1] < -0.5 && v[0] > 0.3));
    if (!a) continue;
    const want = 0.5 + 0.9 * R();
    let b = null;
    for (let q = 0; q < 60 && !b; q++) { const c = V(Math.floor(R() * nv)); const d = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]); if ((c[2] > 0) === (a[2] > 0) && d > want * 0.85 && d < want * 1.2 && !(c[1] < -0.5 && c[0] > 0.3)) b = c; }
    if (!b) continue;
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    bundle(a, b, Math.round(9 * Math.min(1, scale + 0.4)), 0.09, 0.14 + 0.32 * dist, 0, 0.17);
  }
  // commissurales : en arche d'un hémisphère à l'autre, sous la fissure longitudinale
  const nComm = Math.round(16 * scale);
  for (let f = 0; f < nComm; f++) {
    const a = randSurface((v) => v[2] > 0.22 && v[1] > -0.12 && v[1] < 0.6);
    if (!a) continue;
    for (let q = 0; q < Math.round(8 * Math.min(1, scale + 0.4)); q++) {
      const a2 = [a[0] + (R() - 0.5) * 0.12, a[1] + (R() - 0.5) * 0.1, a[2]]; const b = [a2[0] + (R() - 0.5) * 0.04, a2[1] + (R() - 0.5) * 0.04, -a2[2]];
      add(a2, [(a2[0] + b[0]) / 2 - 0.03, Math.min(0.5, a2[1] + 0.14 + 0.1 * R()), 0], b, 1, 0.22);
    }
  }
  // projection : du cortex vers le tronc cérébral, en éventail (corona radiata), par faisceaux
  const nProj = Math.round(22 * scale);
  for (let f = 0; f < nProj; f++) {
    const a0 = randSurface((v) => v[1] > -0.1);
    if (!a0) continue;
    const idx = nearIdx(a0, 0.1, Math.round(7 * Math.min(1, scale + 0.4)));
    for (const i of idx) {
      const a = V(i);
      const t = [0.3 + 0.1 * (R() - 0.5), -0.52 + 0.1 * (R() - 0.5), 0.14 * (R() - 0.5)];
      add(a, [(a[0] + t[0]) / 2 + 0.05, (a[1] + t[1]) / 2 + 0.2, (a[2] + t[2]) / 2 * 0.9], t, 2, 0.2);
    }
  }
  // le cervelet vers le tronc
  const nCer = Math.round(46 * scale);
  for (let f = 0, tries = 0; f < nCer && tries < nCer * 40; tries++) {
    const i = Math.floor(R() * nv); const a = V(i);
    if (!(a[1] < -0.55 && a[0] > 0.32)) continue;
    const t = [0.34, -0.7 + 0.1 * (R() - 0.5), 0.04 * (R() - 0.5)];
    add(a, [(a[0] + t[0]) / 2 + 0.04, (a[1] + t[1]) / 2 + 0.04, (a[2] + t[2]) / 2 * 0.8], t, 3, 0.2);
    f++;
  }
  // le tronc : de longues fibres droites
  const nStem = Math.round(24 * scale);
  for (let f = 0; f < nStem; f++) {
    const z = (R() - 0.5) * 0.12; const x = 0.31 + (R() - 0.5) * 0.06;
    add([x, -0.52, z], [x + 0.02, -0.8, z], [x + 0.05, -1.06, z * 0.8], 4, 0.24);
  }

  const count = segs.length;
  const seg = new Float32Array(count * 8); const fib = new Float32Array(count * 3);
  for (let k = 0; k < count; k++) { seg.set(segs[k], k * 8); fib.set(info[k], k * 3); }
  return { seg, fib, count };
}
