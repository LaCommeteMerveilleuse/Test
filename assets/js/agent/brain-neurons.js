// BlackPhage - le réseau de neurones du cerveau. Le cerveau est entièrement transparent : on ne voit que ses neurones et leurs connexions.
// Des neurones sont posés juste sous la peau du cortex (qui suit les circonvolutions, donc dessine le cerveau) et plus profond, dans la substance
// blanche. Ils sont reliés à leurs voisins (connexions courtes) et par de longs faisceaux courbes : association (d'une circonvolution à l'autre),
// commissurales (d'un hémisphère à l'autre), de projection (du cortex vers le centre et le tronc) et du cervelet.
//
// L'influx nerveux saute de neurone en neurone. Quatorze foyers s'allument à tour de rôle ; depuis chacun, le signal gagne ses voisins par un plus court
// chemin (Dijkstra) : une connexion courte prend un instant, un long faisceau est bien plus rapide, et chaque neurone ajoute un petit délai de
// synapse. Chaque neurone s'allume donc une fois par cycle, à l'instant où le signal l'atteint, puis son influx repart sur toutes les connexions
// vers les neurones encore au repos. Tout est calculé ici, une fois ; le shader n'a qu'à lire l'heure de chaque neurone et de chaque connexion.
//
//   makeNeuralNet({ pos, nrm, sdf, tagAt, bbox }, { weak, seed }) ->
//     { nodes: { count, pos (3 n), time (n), tint (n), size (n) },
//       seg: Float32Array (8 s) [x0, y0, z0, x1, y1, z1, s0, s1], fib: Float32Array (4 s) [départ, vitesse, longueur de la connexion, longue ?], count: s, cycle }
//   (positions, longueurs et vitesses sont dans le repère du modèle ; le constructeur les ramène dans le repère final avec le même facteur d'échelle)
import { rng } from './voxel.js';

export const NET_CYCLE = 6.0;                     // secondes : le cycle complet des foyers
const SYN = 0.06;                                 // le délai de synapse d'un neurone
const V_SHORT = 0.55; const V_LONG = 2.2;         // vitesse de l'influx, en unités du modèle par seconde
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** Le premier foyer (au lobe frontal) ; les autres s'en déduisent, voir plus bas. */
const FOCI = [[-0.8, 0.16, 0.5]];

export function makeNeuralNet({ pos, nrm, sdf, tagAt, bbox }, { weak = false, seed = 11 } = {}) {
  const R = rng(seed);
  const nv = pos.length / 3;
  const rC = weak ? 0.1 : 0.064;                  // l'écart entre deux neurones du cortex
  const P = [];                                   // x, y, z des neurones
  const kind = [];                                // 0 cortex, 1 profond

  // 1. le cortex : un échantillonnage à disque de Poisson sur la peau, puis chaque neurone est enfoncé de quelques centièmes sous la surface
  {
    const lo = [bbox[0] - 0.08, bbox[1] - 0.08, bbox[2] - 0.08];
    const dim = [Math.ceil((bbox[3] - bbox[0] + 0.16) / rC), Math.ceil((bbox[4] - bbox[1] + 0.16) / rC), Math.ceil((bbox[5] - bbox[2] + 0.16) / rC)];
    const head = new Int32Array(dim[0] * dim[1] * dim[2]).fill(-1); const nxt = [];
    const order = new Uint32Array(nv); for (let i = 0; i < nv; i++) order[i] = i;
    for (let i = nv - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    const r2 = rC * rC;
    for (let o = 0; o < nv; o++) {
      const idx = order[o];
      const depth = 0.012 + 0.04 * R() * R();
      let x = pos[idx * 3] - nrm[idx * 3] * depth; let y = pos[idx * 3 + 1] - nrm[idx * 3 + 1] * depth; let z = pos[idx * 3 + 2] - nrm[idx * 3 + 2] * depth;
      if (sdf(x, y, z) > -0.006) { x = pos[idx * 3] - nrm[idx * 3] * 0.012; y = pos[idx * 3 + 1] - nrm[idx * 3 + 1] * 0.012; z = pos[idx * 3 + 2] - nrm[idx * 3 + 2] * 0.012; }
      const ix = Math.floor((x - lo[0]) / rC); const iy = Math.floor((y - lo[1]) / rC); const iz = Math.floor((z - lo[2]) / rC);
      let ok = true;
      for (let dz = -1; dz <= 1 && ok; dz++) for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) {
        const cx = ix + dx; const cy = iy + dy; const cz = iz + dz;
        if (cx < 0 || cy < 0 || cz < 0 || cx >= dim[0] || cy >= dim[1] || cz >= dim[2]) continue;
        for (let q = head[cx + dim[0] * (cy + dim[1] * cz)]; q >= 0; q = nxt[q]) {
          const ex = P[q * 3] - x; const ey = P[q * 3 + 1] - y; const ez = P[q * 3 + 2] - z;
          if (ex * ex + ey * ey + ez * ez < r2) { ok = false; break; }
        }
      }
      if (!ok) continue;
      const id = P.length / 3; P.push(x, y, z); kind.push(0);
      const c = ix + dim[0] * (iy + dim[1] * iz); nxt.push(head[c]); head[c] = id;
    }
  }
  const nCortex = P.length / 3;

  // 2. la substance blanche : quelques neurones plus profonds, plus espacés (des relais), qui donnent du volume
  {
    const want = Math.round(nCortex * (weak ? 0.1 : 0.13)); const rD = weak ? 0.2 : 0.15;
    const D = [];
    for (let tries = 0; tries < want * 60 && D.length < want * 3; tries++) {
      const x = bbox[0] + (bbox[3] - bbox[0]) * R(); const y = bbox[1] + (bbox[4] - bbox[1]) * R(); const z = bbox[2] + (bbox[5] - bbox[2]) * R();
      if (sdf(x, y, z) > -0.17) continue;
      let ok = true;
      for (let q = 0; q < D.length; q += 3) { const ex = D[q] - x; const ey = D[q + 1] - y; const ez = D[q + 2] - z; if (ex * ex + ey * ey + ez * ez < rD * rD) { ok = false; break; } }
      if (ok) D.push(x, y, z);
    }
    for (let q = 0; q < D.length; q += 3) { P.push(D[q], D[q + 1], D[q + 2]); kind.push(1); }
  }
  const N = P.length / 3;
  const V = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];

  // 3. les connexions. Une arête : { a, b, long, ctrl (point de contrôle d'une courbe, ou null) }
  const edges = []; const seen = new Set();
  const addEdge = (a, b, long, ctrl) => {
    if (a === b) return false;
    const k = a < b ? a * N + b : b * N + a;
    if (seen.has(k)) return false;
    seen.add(k); edges.push({ a, b, long, ctrl }); return true;
  };
  // 3a. les voisins : chaque neurone du cortex se relie à ses trois plus proches
  {
    const cs = 0.16; const lo = [bbox[0] - 0.2, bbox[1] - 0.2, bbox[2] - 0.2];
    const dim = [Math.ceil((bbox[3] - bbox[0] + 0.4) / cs), Math.ceil((bbox[4] - bbox[1] + 0.4) / cs), Math.ceil((bbox[5] - bbox[2] + 0.4) / cs)];
    const cells = new Map();
    const key = (ix, iy, iz) => ix + dim[0] * (iy + dim[1] * iz);
    for (let i = 0; i < nCortex; i++) {
      const k = key(Math.floor((P[i * 3] - lo[0]) / cs), Math.floor((P[i * 3 + 1] - lo[1]) / cs), Math.floor((P[i * 3 + 2] - lo[2]) / cs));
      let l = cells.get(k); if (!l) { l = []; cells.set(k, l); } l.push(i);
    }
    for (let i = 0; i < nCortex; i++) {
      const ix = Math.floor((P[i * 3] - lo[0]) / cs); const iy = Math.floor((P[i * 3 + 1] - lo[1]) / cs); const iz = Math.floor((P[i * 3 + 2] - lo[2]) / cs);
      const cand = [];
      for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const l = cells.get(key(ix + dx, iy + dy, iz + dz)); if (!l) continue;
        for (const j of l) { if (j === i) continue; const ex = P[j * 3] - P[i * 3]; const ey = P[j * 3 + 1] - P[i * 3 + 1]; const ez = P[j * 3 + 2] - P[i * 3 + 2]; const d = ex * ex + ey * ey + ez * ez; if (d < cs * cs) cand.push([d, j]); }
      }
      cand.sort((p, q) => p[0] - q[0]);
      for (let c = 0; c < Math.min(3, cand.length); c++) addEdge(i, cand[c][1], false, null);
    }
  }
  // 3b. les relais profonds se parlent entre eux (trois plus proches), en courbes douces
  const center = [0.15, -0.1, 0.0];
  const keep = (p) => {                                          // ramène un point à l'intérieur du cerveau
    let q = p;
    for (let it = 0; it < 8 && sdf(q[0], q[1], q[2]) > -0.02; it++) q = [q[0] + (center[0] - q[0]) * 0.12, q[1] + (center[1] - q[1]) * 0.12, q[2] + (center[2] - q[2]) * 0.12];
    return q;
  };
  const nearest = (p, from, to, maxD, count, skip) => {          // les `count` neurones les plus proches de p parmi from..to-1
    const out = [];
    for (let j = from; j < to; j++) {
      if (skip && skip(j)) continue;
      const ex = P[j * 3] - p[0]; const ey = P[j * 3 + 1] - p[1]; const ez = P[j * 3 + 2] - p[2]; const d = ex * ex + ey * ey + ez * ez;
      if (d < maxD * maxD) out.push([d, j]);
    }
    out.sort((a, b) => a[0] - b[0]);
    return out.slice(0, count).map((o) => o[1]);
  };
  for (let i = nCortex; i < N; i++) {
    for (const j of nearest(V(i), nCortex, N, 0.45, 4, (j) => j === i)) {
      const a = V(i); const b = V(j); const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      const off = norm3([R() - 0.5, R() - 0.5, R() - 0.5]); const L = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      addEdge(i, j, true, [mid[0] + off[0] * L * 0.18, mid[1] + off[1] * L * 0.18, mid[2] + off[2] * L * 0.18]);
    }
  }
  // 3c. les faisceaux longs : des fibres presque parallèles entre deux régions, qui plongent sous le cortex
  const bundle = (a0, b0, count, spread, depth) => {
    const na = nearest(a0, 0, nCortex, spread, count * 2); const nb = nearest(b0, 0, nCortex, spread, count * 2);
    for (let q = na.length - 1; q > 0; q--) { const j = Math.floor(R() * (q + 1)); const t = na[q]; na[q] = na[j]; na[j] = t; }
    for (let q = nb.length - 1; q > 0; q--) { const j = Math.floor(R() * (q + 1)); const t = nb[q]; nb[q] = nb[j]; nb[j] = t; }
    let made = 0;
    for (let q = 0; q < Math.min(na.length, nb.length) && made < count; q++) {
      const a = V(na[q]); const b = V(nb[q]);
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      const inw = norm3([center[0] - mid[0], center[1] - mid[1], center[2] - mid[2]]);
      const dp = depth * (0.9 + 0.2 * R());
      if (addEdge(na[q], nb[q], true, [mid[0] + inw[0] * dp, mid[1] + inw[1] * dp, mid[2] + inw[2] * dp])) made++;
    }
  };
  const surf = (pred) => { for (let t = 0; t < 400; t++) { const i = Math.floor(R() * nCortex); const a = V(i); if (pred(a)) return a; } return null; };
  const scale = weak ? 0.55 : 1;
  for (let f = 0, nA = Math.round(26 * scale); f < nA; f++) {            // association : d'une circonvolution à l'autre, dans le même hémisphère
    const a = surf((v) => !(v[1] < -0.5 && v[0] > 0.3)); if (!a) continue;
    const want = 0.5 + 0.9 * R(); let b = null;
    for (let q = 0; q < 60 && !b; q++) { const c = V(Math.floor(R() * nCortex)); const d = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]); if ((c[2] > 0) === (a[2] > 0) && d > want * 0.85 && d < want * 1.2 && !(c[1] < -0.5 && c[0] > 0.3)) b = c; }
    if (b) bundle(a, b, 6, 0.1, 0.14 + 0.32 * Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  for (let f = 0, nC = Math.round(12 * scale); f < nC; f++) {            // commissurales : en arche d'un hémisphère à l'autre
    const a = surf((v) => v[2] > 0.2 && v[1] > -0.12 && v[1] < 0.6); if (!a) continue;
    bundle(a, [a[0], a[1], -a[2]], 5, 0.12, 0.2);
  }
  for (let f = 0, nP = Math.round(14 * scale); f < nP; f++) {            // projection : du cortex vers le tronc cérébral
    const a = surf((v) => v[1] > -0.1); if (!a) continue;
    bundle(a, [0.3, -0.52, 0.0], 5, 0.12, 0.25);
  }
  for (let f = 0, nB = Math.round(5 * scale); f < nB; f++) {             // le cervelet vers le tronc
    const a = surf((v) => v[1] < -0.55 && v[0] > 0.32); if (!a) continue;
    bundle(a, [0.34, -0.7, 0.0], 5, 0.1, 0.1);
  }
  // 3d. les relais profonds rejoignent aussi le cortex par quelques longues fibres
  for (let i = nCortex; i < N; i++) {
    const a = V(i);
    const far = nearest(a, 0, nCortex, 0.8, 40, (j) => Math.hypot(P[j * 3] - a[0], P[j * 3 + 1] - a[1], P[j * 3 + 2] - a[2]) < 0.3);
    for (let c = 0; c < 2 && far.length; c++) {
      const j = far[Math.floor(R() * far.length)]; const b = V(j);
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; const off = norm3([R() - 0.5, R() - 0.5, R() - 0.5]);
      addEdge(i, j, true, [mid[0] + off[0] * 0.08, mid[1] + off[1] * 0.08, mid[2] + off[2] * 0.08]);
    }
  }
  // 3e. un seul réseau : toute composante isolée est reliée à la plus proche des autres
  {
    const par = new Int32Array(N); for (let i = 0; i < N; i++) par[i] = i;
    const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    for (const e of edges) par[find(e.a)] = find(e.b);
    for (let guard = 0; guard < 60; guard++) {
      const root = new Map(); for (let i = 0; i < N; i++) { const r = find(i); root.set(r, (root.get(r) || 0) + 1); }
      if (root.size <= 1) break;
      let big = -1; let bn = 0; root.forEach((n, r) => { if (n > bn) { bn = n; big = r; } });
      for (const r of root.keys()) {
        if (r === big) continue;
        let best = 1e9; let ba = -1; let bb = -1;
        for (let i = 0; i < N; i++) { if (find(i) !== r) continue; for (let j = 0; j < N; j++) { if (find(j) !== big) continue; const d = (P[i * 3] - P[j * 3]) ** 2 + (P[i * 3 + 1] - P[j * 3 + 1]) ** 2 + (P[i * 3 + 2] - P[j * 3 + 2]) ** 2; if (d < best) { best = d; ba = i; bb = j; } } }
        if (ba >= 0 && addEdge(ba, bb, false, null)) par[find(ba)] = find(bb);
      }
    }
  }

  // 4. la géométrie des connexions : une droite pour une courte, une courbe de Bézier gardée à l'intérieur pour les autres
  const K = 12;
  const lines = edges.map((e) => {
    const a = V(e.a); const b = V(e.b);
    if (!e.ctrl) return { pts: [a, b], len: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) };
    const pts = []; let len = 0;
    for (let k = 0; k < K; k++) {
      const t = k / (K - 1); const u = 1 - t;
      let p = [u * u * a[0] + 2 * u * t * e.ctrl[0] + t * t * b[0], u * u * a[1] + 2 * u * t * e.ctrl[1] + t * t * b[1], u * u * a[2] + 2 * u * t * e.ctrl[2] + t * t * b[2]];
      if (k > 0 && k < K - 1) p = keep(p);
      if (k) len += Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1], p[2] - pts[k - 1][2]);
      pts.push(p);
    }
    return { pts, len };
  });

  // 5. Dijkstra depuis chaque foyer : l'instant où le signal atteint chaque neurone. Le poids d'une connexion : sa durée de parcours + le délai de synapse.
  const adjStart = new Int32Array(N + 1);
  for (const e of edges) { adjStart[e.a + 1]++; adjStart[e.b + 1]++; }
  for (let i = 0; i < N; i++) adjStart[i + 1] += adjStart[i];
  const adjTo = new Int32Array(adjStart[N]); const adjW = new Float32Array(adjStart[N]); const fill = adjStart.slice(0, N);
  edges.forEach((e, k) => {
    const w = lines[k].len / (e.long ? V_LONG : V_SHORT) + SYN;
    adjTo[fill[e.a]] = e.b; adjW[fill[e.a]++] = w; adjTo[fill[e.b]] = e.a; adjW[fill[e.b]++] = w;
  });
  const dist = new Float32Array(N).fill(1e9);
  // les foyers : le premier au lobe frontal, chacun des suivants le plus loin possible des précédents (l'activité se promène d'une région à l'autre), et un relais
  // profond au milieu de la liste.
  const nFoci = weak ? 6 : 8;
  const foci = [];
  {
    const d2 = (i, j) => (P[i * 3] - P[j * 3]) ** 2 + (P[i * 3 + 1] - P[j * 3 + 1]) ** 2 + (P[i * 3 + 2] - P[j * 3 + 2]) ** 2;
    let first = 0; let bd = 1e9;
    for (let i = 0; i < nCortex; i++) { const d = (P[i * 3] - FOCI[0][0]) ** 2 + (P[i * 3 + 1] - FOCI[0][1]) ** 2 + (P[i * 3 + 2] - FOCI[0][2]) ** 2; if (d < bd) { bd = d; first = i; } }
    foci.push(first);
    const near = new Float32Array(nCortex).fill(1e9);
    while (foci.length < nFoci - 1) {
      const last = foci[foci.length - 1]; let far = -1; let fd = -1;
      for (let i = 0; i < nCortex; i++) { const d = d2(i, last); if (d < near[i]) near[i] = d; if (near[i] > fd) { fd = near[i]; far = i; } }
      foci.push(far);
    }
    let deep = nCortex; let dd = 1e9;                              // le relais profond le plus proche du centre
    for (let i = nCortex; i < N; i++) { const d = (P[i * 3] - 0.1) ** 2 + (P[i * 3 + 1] + 0.15) ** 2 + P[i * 3 + 2] ** 2; if (d < dd) { dd = d; deep = i; } }
    foci.splice(Math.floor(nFoci / 2), 0, deep);
  }
  const heapN = []; const heapD = [];
  const push = (n, d) => { let i = heapN.length; heapN.push(n); heapD.push(d); while (i > 0) { const p = (i - 1) >> 1; if (heapD[p] <= heapD[i]) break; [heapN[p], heapN[i]] = [heapN[i], heapN[p]]; [heapD[p], heapD[i]] = [heapD[i], heapD[p]]; i = p; } };
  const pop = () => {
    const n = heapN[0]; const d = heapD[0]; const ln = heapN.pop(); const ld = heapD.pop();
    if (heapN.length) { heapN[0] = ln; heapD[0] = ld; let i = 0; for (;;) { let m = i; const l = 2 * i + 1; const r = l + 1; if (l < heapN.length && heapD[l] < heapD[m]) m = l; if (r < heapN.length && heapD[r] < heapD[m]) m = r; if (m === i) break; [heapN[m], heapN[i]] = [heapN[i], heapN[m]]; [heapD[m], heapD[i]] = [heapD[i], heapD[m]]; i = m; } }
    return [n, d];
  };
  foci.forEach((src, k) => {
    const t0 = k * 0.35;                                            // les foyers partent presque ensemble : autant de fronts qui s'étendent à la fois
    const D = new Float32Array(N).fill(1e9); D[src] = 0; push(src, 0);
    while (heapN.length) {
      const [u, d] = pop();
      if (d > D[u]) continue;
      for (let q = adjStart[u]; q < adjStart[u + 1]; q++) { const v = adjTo[q]; const nd = d + adjW[q]; if (nd < D[v]) { D[v] = nd; push(v, nd); } }
    }
    for (let i = 0; i < N; i++) if (t0 + D[i] < dist[i]) dist[i] = t0 + D[i];
  });
  // L'égalisation du temps : l'influx met environ deux secondes à gagner tout le cerveau, et la plupart des neurones s'allument au milieu de ce temps ; le
  // reste du cycle serait vide. On répartit donc les instants de façon uniforme sur tout le cycle par une transformation croissante g (la fonction de
  // répartition des instants de tir). Elle s'applique à tous les événements, et la vitesse de chaque connexion est recalculée pour que l'influx arrive
  // juste quand le neurone qui le reçoit s'allume : le calendrier reste exact, seule la vitesse de l'influx varie d'une région du cycle à l'autre.
  const sorted = Float32Array.from(dist).sort();
  const g = (t) => {
    let lo = 0; let hi = N;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < t) lo = m + 1; else hi = m; }
    if (lo <= 0) return 0;
    if (lo >= N) return NET_CYCLE * (N - 0.5) / N;
    const a0 = sorted[lo - 1]; const a1 = sorted[lo];
    return NET_CYCLE * (lo - 1 + (a1 > a0 ? (t - a0) / (a1 - a0) : 0.5)) / N;
  };
  const fire = (i) => Math.min(NET_CYCLE - 0.001, g(dist[i]));

  // 6. les tableaux pour le dessin : chaque connexion est orientée du neurone qui s'allume le premier vers l'autre. L'influx part un délai de synapse après le tir
  // et arrive à l'instant où le neurone reçoit le signal (jamais en moins de 0,12 s : on veut voir la progression de neurone en neurone).
  const segs = []; const fibs = [];
  edges.forEach((e, k) => {
    const { pts, len } = lines[k];
    let from = e.a; let line = pts;
    if (dist[e.b] < dist[e.a]) { from = e.b; line = pts.slice().reverse(); }
    const w = len / (e.long ? V_LONG : V_SHORT) + SYN;                // la durée physique du trajet et de la synapse
    const start = fire(from) + SYN;
    const arrive = Math.min(NET_CYCLE, g(dist[from] + w));          // l'instant (égalisé) où le signal arrive
    const speed = len / Math.max(0.12, arrive - start);
    let acc = 0;
    for (let s = 0; s < line.length - 1; s++) {
      const d = Math.hypot(line[s + 1][0] - line[s][0], line[s + 1][1] - line[s][1], line[s + 1][2] - line[s][2]);
      segs.push(line[s][0], line[s][1], line[s][2], line[s + 1][0], line[s + 1][1], line[s + 1][2], acc / len, (acc + d) / len);
      fibs.push(start, speed, len, e.long ? 1 : 0);
      acc += d;
    }
  });
  const tint = new Float32Array(N); const size = new Float32Array(N); const time = new Float32Array(N); const npos = new Float32Array(N * 3);
  const isFocus = new Set(foci);
  for (let i = 0; i < N; i++) {
    npos[i * 3] = P[i * 3]; npos[i * 3 + 1] = P[i * 3 + 1]; npos[i * 3 + 2] = P[i * 3 + 2];
    time[i] = fire(i);
    const tag = kind[i] ? -1 : tagAt(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    tint[i] = kind[i] ? 5 : tag === 8 || tag === 9 ? 0 : tag === 10 || tag === 11 ? 1 : tag === 12 || tag === 13 ? 2 : tag === 14 || tag === 15 ? 3 : 4;
    size[i] = isFocus.has(i) ? 2.1 : kind[i] ? 1.55 : 1.0;
  }
  return { nodes: { count: N, pos: npos, time, tint, size }, seg: new Float32Array(segs), fib: new Float32Array(fibs), count: fibs.length / 4, cycle: NET_CYCLE, nCortex, edges: edges.length, foci };
}
