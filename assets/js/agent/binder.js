// BlackPhage - the BINDER, a small de novo designed protein drawn as an AlphaFold or PyMOL cartoon, in the FRAME coordinate system
// (frame.js), docked pose. Pure math, no dependency (no three). receptor.js turns the mesh into a THREE.BufferGeometry and shape-ligand.js
// voxelises the very same triangles into cubes, so the two always coincide.
//
// The fold (about 70 residues) has a long KEY helix H1 whose N-terminal end plunges into the receptor pocket, a loop over its top, a second
// helix H2 running back down, a loop, a shorter third helix H3 running up, a loop, a beta hairpin (two arrow shaped strands), and slightly
// floppy N and C termini (thin tubes). Helices are thick coiled ribbons, strands are flat arrows, loops and termini are round tubes.
// All elements are swept along ONE continuous backbone, so the cartoon is a single clean extrusion. A parallel transport frame runs along
// the whole path, the section is flat with rounded edges (a stadium) and its half sizes change along the chain, the two ends have round caps.
//
// Every vertex carries a confidence value conf in 0..1 (the AlphaFold pLDDT idea). Helix cores are very high, helix ends and strands
// confident, loops low, termini very low. receptor.js maps it to colours (a gentle gradient), shape-ligand.js maps it to palette tags.
import { FRAME } from './frame.js';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

/** The design numbers (frame units, 1 unit is about 20 angstrom). */
export const BINDER = {
  radius: 0.155,          // radius of the helical coil (the cartoon helix is 0.155 + 0.018 = 0.173 wide at most, the pocket is 0.30)
  pitch: 0.31,            // advance along the axis per turn
  bandHalfWidth: 0.074,   // half width of the helix ribbon
  bandHalfThick: 0.018,   // half thickness of the helix ribbon
  taper: 0.11,            // length over which a helix ribbon relaxes into a tube at each end
  strandHalfWidth: 0.062, // half width of a beta strand
  strandHalfThick: 0.016,
  arrowHalfWidth: 0.118,  // half width of the arrow head
  arrowLength: 0.20,      // length of the arrow head
  loopRadius: 0.030,      // radius of the loop tubes
  tailRadius: 0.027,      // radius of the N and C termini
  ringPoints: 28,         // points around a section
  kappa: 2.2,             // the rounded edges get this many times more points than the flat faces
  step: { helix: 0.017, strand: 0.010, tube: 0.016 },   // arc length between two sections
};

/** Confidence classes (the centres) and the colour stops of the gradient (sRGB hex), the AlphaFold look in the brand palette. */
export const CONF = { veryLow: 0.08, low: 0.34, confident: 0.62, veryHigh: 0.95 };
export const CONF_COLORS = [[0.0, '#e0803c'], [0.12, '#e0803c'], [0.34, '#e0a35c'], [0.62, '#79aed0'], [0.92, '#2a5f86'], [1.0, '#2a5f86']];
/** The palette tag of the cube engine for a confidence: 4 very high, 19 confident, 18 loops, 3 termini. */
export const confTag = (c) => (c >= 0.78 ? 4 : c >= 0.49 ? 19 : c >= 0.215 ? 18 : 3);

// ---------------------------------------------------------------------------------------------------------- the fold (docked pose)
// Control points are in FRAME coordinates. Helices give their axis (a smooth curve through the points), the other elements their centre line.
const TIP = FRAME.ligandTip;
const FOLD = {
  // H1, the key helix, in front. It starts in the pocket, rises through the rim (y = 1) and leans a little to the left higher up
  h1: { axis: [[0.0, 0.82, 0.0], [-0.03, 1.15, 0.012], [-0.08, 1.56, 0.032], [-0.13, 2.04, 0.05]], phase: 0.5, core: 0.96, end: 0.64, r0: 0.027, r1: 0.030 },
  // H2 (down) and H3 (up), side by side behind H1, so the three helices make a triangle
  h2: { axis: [[-0.34, 2.30, -0.36], [-0.33, 1.90, -0.355], [-0.31, 1.48, -0.35]], phase: 2.3, core: 0.92, end: 0.62, r0: 0.030, r1: 0.030 },
  h3: { axis: [[0.10, 1.40, -0.34], [0.11, 1.76, -0.34], [0.12, 2.10, -0.33]], phase: 4.1, core: 0.82, end: 0.60, r0: 0.030, r1: 0.030 },
  // the beta hairpin, at the right of H3, both strands share a sheet normal that looks at the viewer and the bundle
  sheet: { normal: [-0.6, 0.0, 0.8], twist: 0.32 },
  b1: { pts: [[0.41, 2.12, -0.22], [0.415, 1.82, -0.218], [0.42, 1.52, -0.215]], conf: 0.62 },
  b2: { pts: [[0.62, 1.52, -0.08], [0.625, 1.82, -0.078], [0.63, 2.12, -0.075]], conf: 0.60 },
  // the thin round elements, from the end of one element to the start of the next (the next start is appended automatically)
  nTail: [[0.012, 0.76, 0.025], [-0.03, 0.69, 0.03], [0.02, 0.64, -0.015], [0.0, TIP[1] + 0.027, 0.0]],
  l1: [[-0.148, 2.12, 0.03], [-0.22, 2.30, -0.12], [-0.30, 2.41, -0.27], [-0.34, 2.37, -0.34]],
  l2: [[-0.30, 1.40, -0.35], [-0.22, 1.30, -0.36], [-0.08, 1.25, -0.37], [0.04, 1.30, -0.36]],
  l3: [[0.13, 2.17, -0.33], [0.24, 2.25, -0.30], [0.34, 2.23, -0.25], [0.40, 2.18, -0.23]],
  turn: [[0.44, 1.44, -0.20], [0.52, 1.40, -0.15], [0.60, 1.44, -0.10]],
  cTail: [[0.63, 2.20, -0.06], [0.69, 2.28, 0.0], [0.66, 2.37, 0.10], [0.60, 2.42, 0.17], [0.55, 2.43, 0.20]],
};

// ---------------------------------------------------------------------------------------------------------- curves
function crPoint(p0, p1, p2, p3, t, out) {
  const d = (a, b) => Math.sqrt(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])) || 1e-6;
  const t0 = 0; const t1 = t0 + d(p0, p1); const t2 = t1 + d(p1, p2); const t3 = t2 + d(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  for (let i = 0; i < 3; i++) {
    const a1 = ((t1 - tt) * p0[i] + (tt - t0) * p1[i]) / (t1 - t0);
    const a2 = ((t2 - tt) * p1[i] + (tt - t1) * p2[i]) / (t2 - t1);
    const a3 = ((t3 - tt) * p2[i] + (tt - t2) * p3[i]) / (t3 - t2);
    const b1 = ((t2 - tt) * a1 + (tt - t0) * a2) / (t2 - t0);
    const b2 = ((t3 - tt) * a2 + (tt - t1) * a3) / (t3 - t1);
    out[i] = ((t2 - tt) * b1 + (tt - t1) * b2) / (t2 - t1);
  }
  return out;
}

/** Centripetal Catmull-Rom through the control points: a dense polyline with its cumulative arc length. */
function curve(ctrl, sub = 48) {
  const n = ctrl.length;
  const ext = [ctrl[0].map((v, i) => 2 * v - ctrl[1][i]), ...ctrl, ctrl[n - 1].map((v, i) => 2 * v - ctrl[n - 2][i])];
  const m = (n - 1) * sub + 1; const P = new Float64Array(3 * m); const S = new Float64Array(m); const o = [0, 0, 0];
  let k = 0;
  for (let s = 0; s < n - 1; s++) {
    for (let j = 0; j < sub; j++) { crPoint(ext[s], ext[s + 1], ext[s + 2], ext[s + 3], j / sub, o); P[3 * k] = o[0]; P[3 * k + 1] = o[1]; P[3 * k + 2] = o[2]; k++; }
  }
  P[3 * k] = ctrl[n - 1][0]; P[3 * k + 1] = ctrl[n - 1][1]; P[3 * k + 2] = ctrl[n - 1][2];
  for (let i = 1; i < m; i++) S[i] = S[i - 1] + Math.hypot(P[3 * i] - P[3 * i - 3], P[3 * i + 1] - P[3 * i - 2], P[3 * i + 2] - P[3 * i - 1]);
  return { P, S, m, L: S[m - 1] };
}

/** Point of a curve at arc length s (clamped), written to out. The search starts from the index hint (sequential calls are cheap). */
function curveAt(c, s, out, hint = { i: 0 }) {
  let i = hint.i;
  if (s <= 0) { out[0] = c.P[0]; out[1] = c.P[1]; out[2] = c.P[2]; hint.i = 0; return out; }
  if (s >= c.L) { out[0] = c.P[3 * c.m - 3]; out[1] = c.P[3 * c.m - 2]; out[2] = c.P[3 * c.m - 1]; hint.i = c.m - 2; return out; }
  while (i > 0 && c.S[i] > s) i--;
  while (i < c.m - 2 && c.S[i + 1] < s) i++;
  hint.i = i;
  const f = (s - c.S[i]) / ((c.S[i + 1] - c.S[i]) || 1);
  for (let j = 0; j < 3; j++) out[j] = c.P[3 * i + j] + (c.P[3 * i + 3 + j] - c.P[3 * i + j]) * f;
  return out;
}

/** The axis of a helix with a parallel transport frame, tabulated by arc length. */
function makeAxis(ctrl) {
  const c = curve(ctrl, 64); const NA = 900; const L = c.L; const dl = L / (NA - 1);
  const P = new Float64Array(3 * NA); const T = new Float64Array(3 * NA); const N = new Float64Array(3 * NA); const B = new Float64Array(3 * NA);
  const h = { i: 0 }; const o = [0, 0, 0];
  for (let i = 0; i < NA; i++) { curveAt(c, i * dl, o, h); P[3 * i] = o[0]; P[3 * i + 1] = o[1]; P[3 * i + 2] = o[2]; }
  for (let i = 0; i < NA; i++) {
    const a = Math.max(i - 1, 0); const b = Math.min(i + 1, NA - 1);
    let tx = P[3 * b] - P[3 * a]; let ty = P[3 * b + 1] - P[3 * a + 1]; let tz = P[3 * b + 2] - P[3 * a + 2]; const l = Math.hypot(tx, ty, tz) || 1;
    T[3 * i] = tx / l; T[3 * i + 1] = ty / l; T[3 * i + 2] = tz / l;
  }
  let nx; let ny; let nz;
  { const rx = Math.abs(T[2]) < 0.9 ? 0 : 1; const rz = Math.abs(T[2]) < 0.9 ? 1 : 0;
    nx = T[1] * rz; ny = T[2] * rx - T[0] * rz; nz = -T[1] * rx; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l; }
  for (let i = 0; i < NA; i++) {
    const tx = T[3 * i]; const ty = T[3 * i + 1]; const tz = T[3 * i + 2];
    const d = nx * tx + ny * ty + nz * tz; nx -= d * tx; ny -= d * ty; nz -= d * tz;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    N[3 * i] = nx; N[3 * i + 1] = ny; N[3 * i + 2] = nz;
    B[3 * i] = ty * nz - tz * ny; B[3 * i + 1] = tz * nx - tx * nz; B[3 * i + 2] = tx * ny - ty * nx;     // B = T x N, so (N, B, T) is right handed
  }
  return { L, dl, NA, P, T, N, B };
}
function axisAt(ax, l, o) {
  const x = clamp(l / ax.dl, 0, ax.NA - 1 - 1e-9); const i = Math.floor(x); const f = x - i;
  for (let j = 0; j < 3; j++) {
    o.P[j] = ax.P[3 * i + j] * (1 - f) + ax.P[3 * i + 3 + j] * f; o.T[j] = ax.T[3 * i + j] * (1 - f) + ax.T[3 * i + 3 + j] * f;
    o.N[j] = ax.N[3 * i + j] * (1 - f) + ax.N[3 * i + 3 + j] * f; o.B[j] = ax.B[3 * i + j] * (1 - f) + ax.B[3 * i + 3 + j] * f;
  }
  return o;
}

// ---------------------------------------------------------------------------------------------------------- the elements
// Every element appends samples to the chain. A sample has a position, the wanted direction of the thin side of the section (or none), the half sizes and the confidence.
function newChain() { return { P: [], V: [], has: [], hw: [], ht: [], conf: [], id: [] }; }
function push(ch, p, v, hw, ht, conf, id) {
  const n = ch.hw.length;
  if (n && Math.hypot(p[0] - ch.P[3 * n - 3], p[1] - ch.P[3 * n - 2], p[2] - ch.P[3 * n - 1]) < 1e-7) return;      // the junction sample is shared with the previous element
  ch.P.push(p[0], p[1], p[2]);
  if (v) { ch.V.push(v[0], v[1], v[2]); ch.has.push(1); } else { ch.V.push(0, 0, 0); ch.has.push(0); }
  ch.hw.push(hw); ch.ht.push(ht); ch.conf.push(conf); ch.id.push(id);
}

/** A helix: a flat ribbon coiled around a smooth axis, relaxing into a round tube of radius r0 / r1 at its ends. */
function addHelix(ch, h, step, id) {
  const ax = makeAxis(h.axis); const L = ax.L; const eps = BINDER.taper;
  const te = (l) => sm(0, eps, l) * sm(0, eps, L - l);
  const o = { P: [0, 0, 0], T: [0, 0, 0], N: [0, 0, 0], B: [0, 0, 0] };
  const coil = (l, out) => {
    axisAt(ax, l, o);
    const phi = h.phase + TAU * l / BINDER.pitch; const c = Math.cos(phi); const s = Math.sin(phi); const R = BINDER.radius * te(l);
    for (let j = 0; j < 3; j++) { out.rho[j] = c * o.N[j] + s * o.B[j]; out.p[j] = o.P[j] + R * out.rho[j]; }
    return out;
  };
  // the centre line of the coil, tabulated to sample it at a constant arc length
  const NT = 3200; const tab = new Float64Array(NT); const w = { p: [0, 0, 0], rho: [0, 0, 0] };
  let px = 0; let py = 0; let pz = 0;
  for (let i = 0; i < NT; i++) {
    coil((i / (NT - 1)) * L, w);
    if (i) tab[i] = tab[i - 1] + Math.hypot(w.p[0] - px, w.p[1] - py, w.p[2] - pz);
    px = w.p[0]; py = w.p[1]; pz = w.p[2];
  }
  const total = tab[NT - 1]; const M = Math.max(6, Math.ceil(total / (BINDER.step.helix * step)));
  let k = 0;
  for (let j = 0; j <= M; j++) {
    const s = (j / M) * total;
    while (k < NT - 2 && tab[k + 1] < s) k++;
    const f = (s - tab[k]) / ((tab[k + 1] - tab[k]) || 1); const l = ((k + f) / (NT - 1)) * L;
    coil(l, w); const t = te(l);
    const rEnd = l < L / 2 ? h.r0 : h.r1;
    const edge = Math.min(l, L - l);
    push(ch, w.p, w.rho, mix(rEnd, BINDER.bandHalfWidth, t), mix(rEnd, BINDER.bandHalfThick, t), mix(h.end, h.core, sm(0.02, 0.30, edge)), id);
  }
  return ax;
}

/** A round tube (a loop or a terminus) through the control points, from the last sample of the chain, with a confidence profile. */
function addTube(ch, pts, radius, confs, step, id, from) {
  const first = from || [ch.P[ch.P.length - 3], ch.P[ch.P.length - 2], ch.P[ch.P.length - 1]];
  const c = curve([first, ...pts], 40); const M = Math.max(4, Math.ceil(c.L / (BINDER.step.tube * step)));
  const o = [0, 0, 0]; const h = { i: 0 };
  for (let j = 1; j <= M; j++) {
    const u = j / M; curveAt(c, u * c.L, o, h);
    const conf = mix(mix(confs[0], confs[1], sm(0, 0.14, u)), confs[2], sm(0.86, 1, u));     // short transitions, because the mid colours of the gradient are pale
    push(ch, o, null, radius, radius, conf, id);
  }
}

/** A beta strand: a flat ribbon along the control points, an arrow head at its end, its thin side along the sheet normal (with a twist). */
function addStrand(ch, pts, conf, radii, step, id) {
  const c = curve(pts, 48); const L = c.L;
  const sh = FOLD.sheet; const n0 = sh.normal; const nl = Math.hypot(n0[0], n0[1], n0[2]);
  const M = Math.max(6, Math.ceil(L / (BINDER.step.strand * step)));
  const o = [0, 0, 0]; const h = { i: 0 }; const pp = [0, 0, 0]; const pn = [0, 0, 0];
  const sHw = BINDER.strandHalfWidth; const sHt = BINDER.strandHalfThick; const hHw = BINDER.arrowHalfWidth; const hL = BINDER.arrowLength; const shoulder = 0.026;
  const sHead = L - hL;
  for (let j = 1; j <= M; j++) {
    const s = (j / M) * L; curveAt(c, s, o, h);
    curveAt(c, Math.max(s - 0.01, 0), pp, { i: 0 }); curveAt(c, Math.min(s + 0.01, L), pn, { i: 0 });
    let tx = pn[0] - pp[0]; let ty = pn[1] - pp[1]; let tz = pn[2] - pp[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    // the sheet normal, made orthogonal to the strand and twisted a little around it
    let vx = n0[0] / nl; let vy = n0[1] / nl; let vz = n0[2] / nl; const d = vx * tx + vy * ty + vz * tz; vx -= d * tx; vy -= d * ty; vz -= d * tz;
    const vl = Math.hypot(vx, vy, vz) || 1; vx /= vl; vy /= vl; vz /= vl;
    const wx = ty * vz - tz * vy; const wy = tz * vx - tx * vz; const wz = tx * vy - ty * vx;          // T x V
    const a = sh.twist * (s / L - 0.5); const ca = Math.cos(a); const sa = Math.sin(a);
    const V = [ca * vx + sa * wx, ca * vy + sa * wy, ca * vz + sa * wz];
    let hw = mix(radii[0], sHw, sm(0, 0.07, s)); let ht = mix(radii[0], sHt, sm(0, 0.07, s));
    if (s > sHead) {
      const q = (s - sHead) / hL;
      if (s < sHead + shoulder) hw = mix(sHw, hHw, sm(0, 1, (s - sHead) / shoulder));
      else hw = mix(hHw, radii[1], (s - sHead - shoulder) / (hL - shoulder));
      ht = mix(sHt, radii[1], sm(0.45, 1, q));
    }
    push(ch, o, V, hw, ht, conf - 0.04 * sm(sHead, L, s), id);
  }
}

// ---------------------------------------------------------------------------------------------------------- the chain and the mesh
let KEY = null;
function buildChain(step) {
  const ch = newChain(); const F = FOLD; const lr = BINDER.loopRadius; const tr = BINDER.tailRadius;
  // N terminus, a tube that starts at the tip and rises to the start of H1
  const h1 = F.h1;
  const start = h1.axis[0];
  const tip = [TIP[0], TIP[1] + tr, TIP[2]];
  push(ch, tip, null, tr, tr, CONF.veryLow, 0);
  { const c = curve([tip, ...F.nTail.slice(0, -1).reverse(), start], 40); const M = Math.max(4, Math.ceil(c.L / (BINDER.step.tube * step))); const o = [0, 0, 0]; const h = { i: 0 };
    for (let j = 1; j <= M; j++) { const u = j / M; curveAt(c, u * c.L, o, h); push(ch, o, null, tr, tr, mix(CONF.veryLow, h1.end, sm(0.15, 0.95, u)), 0); } }
  const ax1 = addHelix(ch, h1, step, 1);
  addTube(ch, [...F.l1, F.h2.axis[0]], lr, [h1.end, CONF.low, F.h2.end], step, 2);
  addHelix(ch, F.h2, step, 3);
  addTube(ch, [...F.l2, F.h3.axis[0]], lr, [F.h2.end, CONF.low, F.h3.end], step, 4);
  addHelix(ch, F.h3, step, 5);
  addTube(ch, [...F.l3, F.b1.pts[0]], lr, [F.h3.end, CONF.low, F.b1.conf], step, 6);
  addStrand(ch, F.b1.pts, F.b1.conf, [lr, lr], step, 7);
  addTube(ch, [...F.turn, F.b2.pts[0]], lr, [F.b1.conf, CONF.low, F.b2.conf], step, 8);
  addStrand(ch, F.b2.pts, F.b2.conf, [lr, lr], step, 9);
  addTube(ch, F.cTail, tr, [F.b2.conf, CONF.veryLow + 0.12, CONF.veryLow], step, 10);
  KEY = { ax: ax1, start };
  return ch;
}

/**
 * The stadium like section: u in [0, 1) goes around, starting at the middle of the face on the +V side, first towards +W.
 * The rounded edges get kappa times more points than the flat faces, so a flat ribbon keeps smooth edges and a tube is a regular circle.
 */
function section(u, hw, ht, out) {
  const f = Math.max(hw - ht, 0); const arc = Math.PI * ht; const k = BINDER.kappa;
  const total = 4 * f + 2 * k * arc; let q = u * total;
  if (q < f) { out[0] = q; out[1] = ht; return out; }
  q -= f;
  if (q < k * arc) { const a = Math.PI / 2 - (q / (k * arc)) * Math.PI; out[0] = f + ht * Math.cos(a); out[1] = ht * Math.sin(a); return out; }
  q -= k * arc;
  if (q < 2 * f) { out[0] = f - q; out[1] = -ht; return out; }
  q -= 2 * f;
  if (q < k * arc) { const a = -Math.PI / 2 - (q / (k * arc)) * Math.PI; out[0] = -f + ht * Math.cos(a); out[1] = ht * Math.sin(a); return out; }
  q -= k * arc;
  out[0] = -f + q; out[1] = ht; return out;
}

const MESHES = new Map();
/**
 * The cartoon as a triangle mesh: { pos, nor, conf (per vertex), idx, nv, nt, min, max }. step multiplies the distance between two
 * sections (1 is the fine mesh used for the cubes, 1.5 a lighter one). The result is cached.
 */
export function binderMesh({ step = 1 } = {}) {
  if (MESHES.has(step)) return MESHES.get(step);
  const ch = buildChain(step);
  const n = ch.hw.length; const K = BINDER.ringPoints;
  const P = ch.P;
  // tangents
  const T = new Float64Array(3 * n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(i - 1, 0); const b = Math.min(i + 1, n - 1);
    let tx = P[3 * b] - P[3 * a]; let ty = P[3 * b + 1] - P[3 * a + 1]; let tz = P[3 * b + 2] - P[3 * a + 2]; const l = Math.hypot(tx, ty, tz) || 1;
    T[3 * i] = tx / l; T[3 * i + 1] = ty / l; T[3 * i + 2] = tz / l;
  }
  // a parallel transport frame along the whole chain, then the twist that brings its V onto the wanted direction wherever there is one
  const Nb = new Float64Array(3 * n); const Bb = new Float64Array(3 * n); const tau = new Float64Array(n); const known = new Uint8Array(n);
  { let nx; let ny; let nz; const rx = Math.abs(T[2]) < 0.9 ? 0 : 1; const rz = Math.abs(T[2]) < 0.9 ? 1 : 0;
    nx = T[1] * rz; ny = T[2] * rx - T[0] * rz; nz = -T[1] * rx; const l0 = Math.hypot(nx, ny, nz); nx /= l0; ny /= l0; nz /= l0;
    for (let i = 0; i < n; i++) {
      const tx = T[3 * i]; const ty = T[3 * i + 1]; const tz = T[3 * i + 2];
      const d = nx * tx + ny * ty + nz * tz; nx -= d * tx; ny -= d * ty; nz -= d * tz; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      Nb[3 * i] = nx; Nb[3 * i + 1] = ny; Nb[3 * i + 2] = nz;
      Bb[3 * i] = ty * nz - tz * ny; Bb[3 * i + 1] = tz * nx - tx * nz; Bb[3 * i + 2] = tx * ny - ty * nx;
    } }
  let prev = null;
  for (let i = 0; i < n; i++) {
    if (!ch.has[i]) continue;
    let vx = ch.V[3 * i]; let vy = ch.V[3 * i + 1]; let vz = ch.V[3 * i + 2];
    const d = vx * T[3 * i] + vy * T[3 * i + 1] + vz * T[3 * i + 2]; vx -= d * T[3 * i]; vy -= d * T[3 * i + 1]; vz -= d * T[3 * i + 2];
    let a = Math.atan2(vx * Bb[3 * i] + vy * Bb[3 * i + 1] + vz * Bb[3 * i + 2], vx * Nb[3 * i] + vy * Nb[3 * i + 1] + vz * Nb[3 * i + 2]);
    if (prev !== null) a += TAU * Math.round((prev - a) / TAU);
    tau[i] = a; known[i] = 1; prev = a;
  }
  // between two known samples (the tubes) the twist is interpolated, before the first and after the last it is held
  { let last = -1;
    for (let i = 0; i < n; i++) {
      if (!known[i]) continue;
      if (last < 0) for (let j = 0; j < i; j++) tau[j] = tau[i];
      else if (i - last > 1) for (let j = last + 1; j < i; j++) tau[j] = mix(tau[last], tau[i], (j - last) / (i - last));
      last = i;
    }
    for (let j = last + 1; j < n; j++) tau[j] = tau[last]; }
  // the rings
  const capN = 6; const nr = n + 2 * capN; const nv = nr * K;
  const pos = new Float32Array(3 * nv); const nor = new Float32Array(3 * nv); const conf = new Float32Array(nv);
  const sc = [0, 0]; const us = new Float64Array(K); for (let j = 0; j < K; j++) us[j] = j / K;
  const ring = (r, i, f, back) => {          // ring r from sample i, section scaled by f, centre moved along the tangent by back
    const ct = Math.cos(tau[i]); const st = Math.sin(tau[i]);
    const vx = ct * Nb[3 * i] + st * Bb[3 * i]; const vy = ct * Nb[3 * i + 1] + st * Bb[3 * i + 1]; const vz = ct * Nb[3 * i + 2] + st * Bb[3 * i + 2];
    const tx = T[3 * i]; const ty = T[3 * i + 1]; const tz = T[3 * i + 2];
    const wx = vy * tz - vz * ty; const wy = vz * tx - vx * tz; const wz = vx * ty - vy * tx;       // W = V x T
    const cx = P[3 * i] + tx * back; const cy = P[3 * i + 1] + ty * back; const cz = P[3 * i + 2] + tz * back;
    const hw = ch.hw[i] * f; const ht = ch.ht[i] * f;
    for (let j = 0; j < K; j++) {
      section(us[j], hw, ht, sc); const v = (r * K + j) * 3;
      pos[v] = cx + sc[0] * wx + sc[1] * vx; pos[v + 1] = cy + sc[0] * wy + sc[1] * vy; pos[v + 2] = cz + sc[0] * wz + sc[1] * vz;
      conf[r * K + j] = ch.conf[i];
    }
  };
  for (let c = 0; c < capN; c++) { const th = (1 - c / capN) * Math.PI / 2; ring(c, 0, Math.cos(th), -ch.hw[0] * Math.sin(th)); }
  for (let i = 0; i < n; i++) ring(capN + i, i, 1, 0);
  for (let c = 1; c <= capN; c++) { const th = (c / capN) * Math.PI / 2; ring(capN + n + c - 1, n - 1, Math.cos(th), ch.hw[n - 1] * Math.sin(th)); }
  // triangles (the ring runs clockwise around T, so the winding is reversed), then smooth normals by accumulation
  const idx = new Uint32Array((nr - 1) * K * 6); let o = 0;
  for (let r = 0; r < nr - 1; r++) for (let j = 0; j < K; j++) {
    const a = r * K + j; const b = r * K + (j + 1) % K; const c = (r + 1) * K + j; const d = (r + 1) * K + (j + 1) % K;
    idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
  }
  for (let t = 0; t < idx.length; t += 3) {
    const i0 = idx[t]; const i1 = idx[t + 1]; const i2 = idx[t + 2];
    const ux = pos[3 * i1] - pos[3 * i0]; const uy = pos[3 * i1 + 1] - pos[3 * i0 + 1]; const uz = pos[3 * i1 + 2] - pos[3 * i0 + 2];
    const vx = pos[3 * i2] - pos[3 * i0]; const vy = pos[3 * i2 + 1] - pos[3 * i0 + 1]; const vz = pos[3 * i2 + 2] - pos[3 * i0 + 2];
    const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
    for (const w of [i0, i1, i2]) { nor[3 * w] += nx; nor[3 * w + 1] += ny; nor[3 * w + 2] += nz; }
  }
  for (let v = 0; v < nv; v++) {
    const l = Math.hypot(nor[3 * v], nor[3 * v + 1], nor[3 * v + 2]);
    if (l > 1e-14) { nor[3 * v] /= l; nor[3 * v + 1] /= l; nor[3 * v + 2] /= l; }
  }
  // the poles of the caps, where the normal is the tangent
  for (let j = 0; j < K; j++) {
    nor[3 * j] = -T[0]; nor[3 * j + 1] = -T[1]; nor[3 * j + 2] = -T[2];
    const v = (nr - 1) * K + j; nor[3 * v] = T[3 * n - 3]; nor[3 * v + 1] = T[3 * n - 2]; nor[3 * v + 2] = T[3 * n - 1];
  }
  // the winding must give normals that point away from the centre line, so check one ring of the middle and flip everything if needed
  { const r = capN + (n >> 1); const v = r * K + (K >> 2); const i = n >> 1;
    const dot = (pos[3 * v] - P[3 * i]) * nor[3 * v] + (pos[3 * v + 1] - P[3 * i + 1]) * nor[3 * v + 1] + (pos[3 * v + 2] - P[3 * i + 2]) * nor[3 * v + 2];
    if (dot < 0) { for (let t = 0; t < idx.length; t += 3) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x; } for (let q = 0; q < nor.length; q++) nor[q] = -nor[q]; } }
  const min = [1e9, 1e9, 1e9]; const max = [-1e9, -1e9, -1e9];
  for (let v = 0; v < nv; v++) for (let c = 0; c < 3; c++) { const x = pos[3 * v + c]; if (x < min[c]) min[c] = x; if (x > max[c]) max[c] = x; }
  const mesh = { pos, nor, conf, idx, nv, nt: idx.length / 3, min, max, rings: nr };
  MESHES.set(step, mesh);
  return mesh;
}

/**
 * The axis of the key helix, from its far end (the top of H1) down to the tip planted in the pocket (the tail of the N terminus):
 * an array of [x, y, z], tail first, tip last. The last point is FRAME.ligandTip.
 */
export function binderAxis(count = 28) {
  if (!KEY) binderMesh();
  const ax = KEY.ax; const pts = [];
  const o = { P: [0, 0, 0], T: [0, 0, 0], N: [0, 0, 0], B: [0, 0, 0] };
  for (let i = 0; i < ax.NA; i += 4) { axisAt(ax, ax.L - i * ax.dl, o); pts.push(o.P.slice()); if (ax.L - i * ax.dl <= 0) break; }
  axisAt(ax, 0, o); pts.push(o.P.slice());
  for (const p of FOLD.nTail) pts.push(p.slice());
  pts[pts.length - 1] = TIP.slice();
  // resample by arc length
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  const out = []; let k = 0;
  for (let j = 0; j < count; j++) {
    const s = (j / (count - 1)) * cum[cum.length - 1];
    while (k < pts.length - 2 && cum[k + 1] < s) k++;
    const f = (s - cum[k]) / ((cum[k + 1] - cum[k]) || 1);
    out.push([0, 1, 2].map((c) => pts[k][c] + (pts[k + 1][c] - pts[k][c]) * f));
  }
  return out;
}

/** The unit vector along the key helix at the pocket (tip to top), the direction in which the binder slides into the pocket. */
export function binderDirection() {
  const a = binderAxis(40); const p = a[a.length - 1]; const q = a[a.length - 14];
  const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]]; const l = Math.hypot(d[0], d[1], d[2]);
  return [d[0] / l, d[1] / l, d[2] / l];
}
