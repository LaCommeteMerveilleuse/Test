// BlackPhage - the RECEPTOR SCENE: a class B GPCR (GLP-1R-like) sitting in a lipid bilayer, with its ligand, drawn as a refined
// 3D illustration on a WHITE background. Everything lives in the FRAME coordinate system (frame.js): y up (towards the outside of
// the cell), the bilayer is the sheet around y = 0, the receptor is the vertical bundle of seven helices on the y axis.
//
//   const scene = createReceptorScene(THREE, { quality: 1, renderer });       // renderer is optional (see initEnvironment)
//   host.add(scene.group);                                                    // the host owns scene.group: move / scale / rotate it freely
//   scene.setPose({ show: 1, dock: 0..1, active: 0..1, time: seconds });      // every field optional, keeps its last value
//   scene.ribbonPath();                                                       // THREE.Vector3[28], axis of the key helix of the binder, docked pose: [0] = its far (top) end .. last = tip (FRAME.ligandTip)
//   scene.precompile(renderer, camera);                                       // optional: environment + shaders ahead of the first frame
//   scene.dispose();
//
// Pose: show 0..1 fades and scales the whole content in (the lipids grow outwards from the receptor); dock 0..1 slides the ligand from
// hovering above the pocket (tilted, rotated) to seated (at dock = 1 the mesh coincides with the cubes of shape-ligand.js); active 0..1 is the
// conformational change (TM6 and TM5 swing out at the cytoplasmic end, the vestibule closes on the ligand, a soft amber glow); time = seconds
// for the idle motions (lipids jiggle, the binder breathes a little). Extra, optional: cut 0..1 forces the cross-section of the bilayer
// (by default it is automatic: when the camera looks along the sheet, up to about 16 deg above or 36 deg below the sheet, the lipids between the camera and the receptor dissolve).
//
// The module does not import three: the host passes its own THREE namespace (r160). Content: a bilayer of ~4100 instanced lipids (heads: small
// spheres, tails: thin kinked capsules, with a clear gap around the receptor and a soft fade at the edge of the sheet), seven smooth glossy
// helices joined by loops (ICL/ECL), a short helix 8 on the cytoplasmic side, an open extracellular pocket with a frosted wall and a darker
// floor, a designed protein binder (binder.js, an AlphaFold style cartoon: three helices, a beta hairpin, loops) and, when docked, a thin glowing
// contact ring on the pocket rim.
//
// HOST NOTES
//  - Lights: a hemisphere light and three directional lights live in scene.group (scene.lights); in three.js lights are global to the three.js
//    scene, so if another scene module adds its own lights to the same THREE.Scene, either render them in separate scenes or hide one rig
//    (scene.lights.visible = false). Written for the default renderer of r160: outputColorSpace sRGB, no tone mapping, useLegacyLights false.
//  - Environment: call scene.initEnvironment(renderer) once (or pass { renderer }) to get soft studio reflections on the helices;
//    otherwise it is built lazily by the first render (onBeforeRender), and the scene is still fine without it.
//  - renderOrder / transparency: the lipids are the only opaque objects (drawn first, they fade by shrinking, no blending). The receptor, the
//    pocket floor and the ligand are `transparent: true` with depthWrite on (so `show` can fade them through `opacity` without rebuilding a shader
//    program; at opacity 1 they look opaque), then come the glass-like pocket wall (renderOrder 2), the cytoplasmic glow sprite (4), the rim halo (5),
//    the rim ring (6) and its core (7), all depthWrite = false with normal blending (additive blending would vanish on white).
//    So if the host mixes this group with other transparent objects, keep these renderOrder values in mind.
//  - Cost: ~107k triangles + ~607k instanced (quality 1, 4099 lipids), quality 0.5 halves the lipids (76k + 303k). Build time ~0.15-0.5 s.
import { FRAME } from './frame.js';
import { binderMesh, binderAxis, binderDirection, CONF_COLORS } from './binder.js';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10); };       // smootherstep

function rng(seed) {
  let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// ------------------------------------------------------------------------------------------------ geometry helpers (no three needed)
/** Uniform Catmull-Rom through control points ([x,y,z]...), perSeg samples per segment, ends reflected. Returns a flat Float64Array. */
function spline(ctrl, perSeg) {
  const n = ctrl.length;
  const ext = [ctrl[0].map((v, i) => 2 * v - ctrl[1][i]), ...ctrl, ctrl[n - 1].map((v, i) => 2 * v - ctrl[n - 2][i])];
  const out = new Float64Array(3 * ((n - 1) * perSeg + 1));
  let o = 0;
  for (let s = 0; s < n - 1; s++) {
    const p0 = ext[s]; const p1 = ext[s + 1]; const p2 = ext[s + 2]; const p3 = ext[s + 3];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg; const t2 = t * t; const t3 = t2 * t;
      for (let c = 0; c < 3; c++) out[o++] = 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
    }
  }
  out[o++] = ctrl[n - 1][0]; out[o++] = ctrl[n - 1][1]; out[o++] = ctrl[n - 1][2];
  return out;
}

/**
 * A tube along a centre line.
 * spec: { P: Float64Array(3M), R: radial segments, shape(i, th, o) -> o[0], o[1] offsets along the section axes e1, e2,
 *         e1?: Float64Array(3M) reference direction for e1, capA/capB?: { rings, len } rounded ends,
 *         color(i, th, o3), glow?(i, th, o2) }
 * Returns { pos, nor, col, glow, idx, nv }.
 */
function buildTube(spec) {
  const { P, R, shape } = spec; const M = P.length / 3;
  const capA = spec.capA; const capB = spec.capB;
  const ca = capA ? capA.rings : 0; const cb = capB ? capB.rings : 0;
  const rings = ca + M + cb; const nv = rings * R;
  const pos = new Float32Array(nv * 3); const nor = new Float32Array(nv * 3); const col = new Float32Array(nv * 3); const glow = new Float32Array(nv * 2);
  const T = new Float64Array(3 * M); const E1 = new Float64Array(3 * M); const E2 = new Float64Array(3 * M);
  for (let i = 0; i < M; i++) {
    const a = Math.max(i - 1, 0); const b = Math.min(i + 1, M - 1);
    let tx = P[3 * b] - P[3 * a]; let ty = P[3 * b + 1] - P[3 * a + 1]; let tz = P[3 * b + 2] - P[3 * a + 2];
    const l = Math.hypot(tx, ty, tz) || 1; tx /= l; ty /= l; tz /= l;
    T[3 * i] = tx; T[3 * i + 1] = ty; T[3 * i + 2] = tz;
  }
  let px = 0; let py = 0; let pz = 0;
  for (let i = 0; i < M; i++) {
    const tx = T[3 * i]; const ty = T[3 * i + 1]; const tz = T[3 * i + 2];
    let ex; let ey; let ez;
    if (spec.e1) { ex = spec.e1[3 * i]; ey = spec.e1[3 * i + 1]; ez = spec.e1[3 * i + 2]; } else if (i === 0) { ex = Math.abs(tz) < 0.9 ? 0 : 1; ey = 0; ez = Math.abs(tz) < 0.9 ? 1 : 0; } else { ex = px; ey = py; ez = pz; }
    const d = ex * tx + ey * ty + ez * tz; ex -= d * tx; ey -= d * ty; ez -= d * tz;
    const l = Math.hypot(ex, ey, ez) || 1; ex /= l; ey /= l; ez /= l;
    px = ex; py = ey; pz = ez;
    E1[3 * i] = ex; E1[3 * i + 1] = ey; E1[3 * i + 2] = ez;
    E2[3 * i] = ty * ez - tz * ey; E2[3 * i + 1] = tz * ex - tx * ez; E2[3 * i + 2] = tx * ey - ty * ex;
  }
  const so = [0, 0]; const co = [0, 0, 0]; const go = [0, 0];
  const put = (ring, cx, cy, cz, i, f) => {
    for (let j = 0; j < R; j++) {
      const th = TAU * j / R; shape(i, th, so);
      const v = (ring * R + j) * 3; const g = (ring * R + j) * 2;
      pos[v] = cx + (E1[3 * i] * so[0] + E2[3 * i] * so[1]) * f;
      pos[v + 1] = cy + (E1[3 * i + 1] * so[0] + E2[3 * i + 1] * so[1]) * f;
      pos[v + 2] = cz + (E1[3 * i + 2] * so[0] + E2[3 * i + 2] * so[1]) * f;
      spec.color(i, th, co); col[v] = co[0]; col[v + 1] = co[1]; col[v + 2] = co[2];
      if (spec.glow) { spec.glow(i, th, go); glow[g] = go[0]; glow[g + 1] = go[1]; }
    }
  };
  for (let c = 0; c < ca; c++) {     // start cap: from the pole to the first section
    const th = (1 - c / ca) * Math.PI / 2; const back = capA.len * Math.sin(th); const f = Math.cos(th);
    put(c, P[0] - T[0] * back, P[1] - T[1] * back, P[2] - T[2] * back, 0, f);
  }
  for (let i = 0; i < M; i++) put(ca + i, P[3 * i], P[3 * i + 1], P[3 * i + 2], i, 1);
  for (let c = 1; c <= cb; c++) {    // end cap: from the last section to the pole
    const th = (c / cb) * Math.PI / 2; const fwd = capB.len * Math.sin(th); const f = Math.cos(th); const i = M - 1;
    put(ca + M + c - 1, P[3 * i] + T[3 * i] * fwd, P[3 * i + 1] + T[3 * i + 1] * fwd, P[3 * i + 2] + T[3 * i + 2] * fwd, i, f);
  }
  const idx = new Uint32Array((rings - 1) * R * 6); let o = 0;
  for (let r = 0; r < rings - 1; r++) {
    for (let j = 0; j < R; j++) {
      const a = r * R + j; const b = r * R + (j + 1) % R; const c = (r + 1) * R + j; const d = (r + 1) * R + (j + 1) % R;
      idx[o++] = a; idx[o++] = b; idx[o++] = c; idx[o++] = b; idx[o++] = d; idx[o++] = c;
      for (const [p, q, s] of [[a, b, c], [b, d, c]]) {
        const ux = pos[3 * q] - pos[3 * p]; const uy = pos[3 * q + 1] - pos[3 * p + 1]; const uz = pos[3 * q + 2] - pos[3 * p + 2];
        const vx = pos[3 * s] - pos[3 * p]; const vy = pos[3 * s + 1] - pos[3 * p + 1]; const vz = pos[3 * s + 2] - pos[3 * p + 2];
        const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
        for (const w of [p, q, s]) { nor[3 * w] += nx; nor[3 * w + 1] += ny; nor[3 * w + 2] += nz; }
      }
    }
  }
  for (let v = 0; v < nv; v++) {
    const l = Math.hypot(nor[3 * v], nor[3 * v + 1], nor[3 * v + 2]);
    if (l > 1e-12) { nor[3 * v] /= l; nor[3 * v + 1] /= l; nor[3 * v + 2] /= l; }
  }
  if (capA) for (let j = 0; j < R; j++) { nor[3 * j] = -T[0]; nor[3 * j + 1] = -T[1]; nor[3 * j + 2] = -T[2]; }
  if (capB) { const i = M - 1; for (let j = 0; j < R; j++) { const v = (rings - 1) * R + j; nor[3 * v] = T[3 * i]; nor[3 * v + 1] = T[3 * i + 1]; nor[3 * v + 2] = T[3 * i + 2]; } }
  return { pos, nor, col, glow, idx, nv };
}

function mergeParts(parts) {
  let nv = 0; let ni = 0;
  for (const p of parts) { nv += p.nv; ni += p.idx.length; }
  const pos = new Float32Array(nv * 3); const nor = new Float32Array(nv * 3); const col = new Float32Array(nv * 3); const glow = new Float32Array(nv * 2); const idx = new Uint32Array(ni);
  let v = 0; let i = 0;
  for (const p of parts) {
    pos.set(p.pos, v * 3); nor.set(p.nor, v * 3); col.set(p.col, v * 3); glow.set(p.glow, v * 2);
    for (let k = 0; k < p.idx.length; k++) idx[i + k] = p.idx[k] + v;
    v += p.nv; i += p.idx.length;
  }
  return { pos, nor, col, glow, idx, nv };
}

/** A surface of revolution around the y axis: profile = [[r, y], ...] from the bottom pole upwards, S segments around. Same output as buildTube. */
function buildRevolve(profile, S) {
  const J = profile.length; const nv = J * S;
  const pos = new Float32Array(nv * 3); const nor = new Float32Array(nv * 3); const col = new Float32Array(nv * 3).fill(1); const glow = new Float32Array(nv * 2);
  for (let j = 0; j < J; j++) for (let k = 0; k < S; k++) {
    const th = TAU * k / S; const v = (j * S + k) * 3;
    pos[v] = profile[j][0] * Math.cos(th); pos[v + 1] = profile[j][1]; pos[v + 2] = profile[j][0] * Math.sin(th);
  }
  const idx = new Uint32Array((J - 1) * S * 6); let o = 0;
  for (let j = 0; j < J - 1; j++) for (let k = 0; k < S; k++) {
    const a = j * S + k; const b = j * S + (k + 1) % S; const c = (j + 1) * S + k; const d = (j + 1) * S + (k + 1) % S;
    idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
    for (const [p, q, r] of [[a, c, b], [b, c, d]]) {
      const ux = pos[3 * q] - pos[3 * p]; const uy = pos[3 * q + 1] - pos[3 * p + 1]; const uz = pos[3 * q + 2] - pos[3 * p + 2];
      const vx = pos[3 * r] - pos[3 * p]; const vy = pos[3 * r + 1] - pos[3 * p + 1]; const vz = pos[3 * r + 2] - pos[3 * p + 2];
      const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
      for (const w of [p, q, r]) { nor[3 * w] += nx; nor[3 * w + 1] += ny; nor[3 * w + 2] += nz; }
    }
  }
  for (let v = 0; v < nv; v++) {
    const l = Math.hypot(nor[3 * v], nor[3 * v + 1], nor[3 * v + 2]);
    if (l > 1e-12) { nor[3 * v] /= l; nor[3 * v + 1] /= l; nor[3 * v + 2] /= l; }
  }
  for (let k = 0; k < S; k++) { nor[3 * k] = 0; nor[3 * k + 1] = -1; nor[3 * k + 2] = 0; }
  return { pos, nor, col, glow, idx, nv };
}

// ------------------------------------------------------------------------------------------------ the receptor, as a function of the activation
// Ring order (as seen from the outside) TM1 .. TM7. Alternate helices run in opposite directions, joined by ICL1, ECL1, ICL2, ECL2, ICL3, ECL3.
const TM = [
  { ang: 0, top: 0.97, bot: -0.68, dR: 0.010, swing: -0.010, close: 1.0, cyto: 0.20, ph: 0.3 },     // TM1
  { ang: 0, top: 1.00, bot: -0.78, dR: 0.000, swing: 0.000, close: 1.0, cyto: 0.20, ph: 1.4 },       // TM2
  { ang: 0, top: 0.90, bot: -0.92, dR: -0.012, swing: 0.030, close: 0.8, cyto: 0.30, ph: 2.5 },      // TM3 (the long, central one)
  { ang: 0, top: 0.80, bot: -0.74, dR: 0.012, swing: 0.000, close: 0.8, cyto: 0.15, ph: 3.6 },       // TM4 (in front: its low top opens the pocket to the camera)
  { ang: 0, top: 0.96, bot: -0.96, dR: 0.000, swing: 0.140, close: 1.0, cyto: 0.75, ph: 4.7 },       // TM5 (swings out a little)
  { ang: 0, top: 1.00, bot: -1.00, dR: 0.004, swing: 0.330, close: 1.0, cyto: 1.00, ph: 5.8 },       // TM6 (swings out a lot)
  { ang: 0, top: 1.00, bot: -0.70, dR: 0.000, swing: -0.030, close: 1.0, cyto: 0.35, ph: 0.9 },     // TM7
];
TM.forEach((t, k) => { t.ang = Math.PI - (5 - k) * TAU / 7; });                         // TM6 on the -x side, TM4 at the front, TM1 and TM7 behind
const A_RAD = 0.092; const A_TAN = 0.108;                                               // half sizes of a helix section (radial, tangential)

const ringR = (y) => 0.255 + 0.145 * sm(0.26, 0.72, y) - 0.030 * sm(0.80, 1.0, y) + 0.045 * sm(-0.30, -1.0, y);
function helixPoint(k, y, act, out) {
  const t = TM[k];
  let R = ringR(y) + t.dR;
  let ang = t.ang + 0.10 * y;                                                           // a gentle supercoil of the bundle
  R -= act * 0.050 * sm(0.40, 1.0, y) * t.close;                                        // the vestibule closes around the ligand
  const low = clamp((-0.12 - y) / 0.88, 0, 1);
  R += act * t.swing * Math.pow(low, 1.1);                                              // the cytoplasmic ends swing outward
  ang += act * (k === 5 ? -0.10 : k === 4 ? -0.05 : 0) * low;
  out[0] = R * Math.cos(ang); out[1] = y; out[2] = R * Math.sin(ang); out[3] = ang; out[4] = R;
  return out;
}

export function createReceptorScene(THREE, { quality = 1, renderer = null } = {}) {
  const q = clamp(quality, 0.25, 1.6);
  // `group` belongs to the host (position, scale, rotation are never touched here); the content lives in `content`, which pops in with `show`
  const group = new THREE.Group(); group.name = 'receptor-scene';
  const content = new THREE.Group(); content.name = 'receptor-content'; group.add(content);
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };
  const stats = { instancedTriangles: 0, triangles: 0, lipids: 0, buildMs: 0 };
  const tmpA = [0, 0, 0];
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();

  // ---- the brand palette (linear working space), used for vertex colours
  const P = {
    haze: new THREE.Color('#E7EEF0'), mist: new THREE.Color('#C8D1D3'), glow: new THREE.Color('#E0A35C'),
    blue: new THREE.Color('#2A5F86'), pine: new THREE.Color('#27463D'), slate: new THREE.Color('#6A757C'),
  };
  const mixc = (a, b, t, out) => { out[0] = lerp(a.r, b.r, t); out[1] = lerp(a.g, b.g, t); out[2] = lerp(a.b, b.b, t); return out; };

  // ================================================================================================ lights (inside the group)
  const lights = new THREE.Group(); lights.name = 'receptor-lights';
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb9c8d0, 0.55); hemi.position.set(0, 1000, 0);
  const key = new THREE.DirectionalLight(0xfff3e4, 2.5); key.position.set(-3.2, 5.6, 4.6);
  const fill = new THREE.DirectionalLight(0xe4eeff, 0.45); fill.position.set(5.0, 1.0, 3.0);
  const rim = new THREE.DirectionalLight(0xffffff, 1.5); rim.position.set(1.2, 3.2, -5.5);
  lights.add(hemi, key, key.target, fill, fill.target, rim, rim.target);
  group.add(lights);

  // the materials that receive the studio environment (reflections), with their envMapIntensity
  const lit = [];
  let envTex = null; let envRT = null; let envTried = false;
  /**
   * Builds a small procedural studio environment (a pale gradient dome and a few soft boxes) with the renderer's PMREM generator and
   * applies it to the materials, for soft reflections on the glossy helices. Idempotent. Without it the scene is still lit by its lights.
   */
  function initEnvironment(renderer) {
    if (envTex || !renderer) return !!envTex;
    envTried = true;
    try {
      const envScene = new THREE.Scene();
      const dg = new THREE.SphereGeometry(30, 32, 18); const cols = []; const pa = dg.attributes.position; const c = new THREE.Color();
      for (let i = 0; i < pa.count; i++) {
        const y = pa.getY(i) / 30; const w = y > 0 ? sm(0, 1, y) : -sm(0, 1, -y);
        if (w >= 0) c.setRGB(lerp(0.26, 0.40, w), lerp(0.29, 0.43, w), lerp(0.32, 0.47, w)); else c.setRGB(lerp(0.26, 0.08, -w), lerp(0.29, 0.10, -w), lerp(0.32, 0.12, -w));
        cols.push(c.r, c.g, c.b);
      }
      dg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      envScene.add(new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
      const panel = (w, h, x, y, z, k) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
      };
      panel(2.2, 14, -9, 3, 7, 5.0);      // a tall soft box, upper left in front: the long highlight on the helices
      panel(12, 12, 0, 14, 3, 2.6);       // the big soft box above
      panel(1.8, 12, 10, 2, -6, 3.6);     // a rim strip, right and behind
      panel(5, 12, 12, 3, 6, 1.2);        // a gentle fill, right in front
      envRT = new THREE.PMREMGenerator(renderer);
      const rt = envRT.fromScene(envScene, 0.015);
      envTex = rt.texture;
      envScene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      for (const [m, k] of lit) { m.envMap = envTex; m.envMapIntensity = k; m.needsUpdate = true; }
      group.userData.envRenderTarget = rt;
    } catch (e) { if (typeof console !== 'undefined') console.warn('receptor: environment not available', e && e.message); envTex = null; }
    return !!envTex;
  }

  // shared uniforms of the lipid shader
  const lipU = {
    uTime: { value: 0 }, uShow: { value: 1 }, uHalf: { value: FRAME.halfSize }, uCamDir: { value: new THREE.Vector2(0, 1) },
    uCut: { value: 0 }, uCutAt: { value: 0.04 }, uJig: { value: 0.006 },
  };
  let cutOverride = -1;

  // ================================================================================================ the membrane
  const members = { heads: null, tails: null };
  (function buildMembrane() {
    const half = FRAME.halfSize; const yHead = FRAME.thickness / 2 - 0.05;
    const d = 0.145 / Math.sqrt(q);
    const rand = rng(90210);
    const items = [];
    const rowH = d * 0.866;
    for (let leaf = 0; leaf < 2; leaf++) {
      const ox = leaf ? 0.5 * d : 0; const oz = leaf ? 0.37 * rowH : 0;
      const nj = Math.ceil(half / rowH) + 1; const ni = Math.ceil(half / d) + 2;
      for (let j = -nj; j <= nj; j++) {
        for (let i = -ni; i <= ni; i++) {
          const x = i * d + ((j & 1) ? 0.5 * d : 0) + ox + (rand() - 0.5) * 0.5 * d;
          const z = j * rowH + oz + (rand() - 0.5) * 0.5 * d;
          const r4 = Math.pow(Math.pow(Math.abs(x), 4) + Math.pow(Math.abs(z), 4), 0.25) / half;
          const fade = 1 - sm(0.52, 1.0, r4);
          if (fade < 0.04) continue;
          const rr = Math.hypot(x, z); const an = Math.atan2(z, x);
          const hole = 0.47 + 0.022 * Math.sin(3 * an + 1.0) + 0.012 * Math.sin(7 * an + 0.4);
          if (rr < hole) continue;
          items.push({ x, z, leaf, rnd: [rand(), rand(), rand(), rand(), rand()] });
        }
      }
    }
    const N = items.length; stats.lipids = N;

    // the head: a small sphere. the tails: two thin kinked capsules (both with their origin at the centre of the head)
    const headGeo = track(new THREE.SphereGeometry(0.055, 8, 4));
    const tailParts = [];
    for (const s of [-1, 1]) {
      const pts = spline([[s * 0.020, -0.035, 0], [s * 0.031, -0.105, 0.006 * s], [s * 0.017, -0.165, -0.007], [s * 0.032, -0.220, 0.004], [s * 0.022, -0.262, 0]], 1);
      tailParts.push(buildTube({
        P: pts, R: 5, shape: (i, th, o) => { const r = 0.0118 - 0.0022 * (i / (pts.length / 3 - 1)); o[0] = r * Math.cos(th); o[1] = r * Math.sin(th); },
        capB: { rings: 1, len: 0.010 }, color: (i, th, o) => { o[0] = 1; o[1] = 1; o[2] = 1; },
      }));
    }
    const tm = mergeParts(tailParts);
    const tailGeo = track(new THREE.BufferGeometry());
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tm.pos, 3)); tailGeo.setAttribute('normal', new THREE.BufferAttribute(tm.nor, 3));
    tailGeo.setIndex(new THREE.BufferAttribute(tm.idx, 1));
    const aLip = new Float32Array(N * 3);

    const headMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48, metalness: 0.0 }));
    const tailMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.0 }));
    const patch = (mat) => {
      mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, lipU);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>
attribute vec3 aLip;
uniform float uTime; uniform float uShow; uniform float uHalf; uniform vec2 uCamDir; uniform float uCut; uniform float uCutAt; uniform float uJig;
varying float vFade; varying float vAO;`)
          .replace('#include <project_vertex>', `
vec3 ip = instanceMatrix[3].xyz;
float sq = pow(pow(abs(ip.x), 4.0) + pow(abs(ip.z), 4.0), 0.25) / uHalf;
float fade = 1.0 - smoothstep(0.52, 1.0, sq);
float rr = uShow * (uHalf * 1.4142 + 0.9);
float rev = 1.0 - smoothstep(rr - 0.9, rr, length(ip.xz));
float cutAt = mix(4.9, uCutAt, uCut);
float cutF = 1.0 - smoothstep(cutAt, cutAt + 0.32, dot(ip.xz, uCamDir));
float sc = fade * rev * cutF;
vFade = min(fade, cutF);
vAO = smoothstep(0.44, 1.10, length(ip.xz));
vec4 mvPosition = instanceMatrix * vec4(transformed * sc, 1.0);
float w1 = uTime * (0.9 + aLip.y * 0.8) + aLip.x;
mvPosition.xyz += uJig * sc * vec3(sin(w1) * 0.9, sin(w1 * 1.3 + 1.7) * 0.35, cos(w1 * 0.8 + aLip.z * 6.0) * 0.9);
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vFade; varying float vAO;')
          .replace('#include <dithering_fragment>', `#include <dithering_fragment>
gl_FragColor.rgb *= mix(0.80, 1.0, vAO);
gl_FragColor.rgb = mix(vec3(1.0), gl_FragColor.rgb, smoothstep(0.0, 0.8, vFade));`);
      };
      mat.customProgramCacheKey = () => 'receptor-lipid-v1';
    };
    patch(headMat); patch(tailMat); lit.push([headMat, 0.32], [tailMat, 0.4]);

    const heads = new THREE.InstancedMesh(headGeo, headMat, N); heads.name = 'lipid-heads';
    const tails = new THREE.InstancedMesh(tailGeo, tailMat, N); tails.name = 'lipid-tails';
    const m4 = new THREE.Matrix4(); const qt = new THREE.Quaternion(); const eu = new THREE.Euler(); const pv = new THREE.Vector3(); const sv = new THREE.Vector3();
    const cH = new THREE.Color(); const cT = new THREE.Color();
    const wave = (x, z) => 0.020 * Math.sin(0.9 * x + 1.7) * Math.cos(0.8 * z - 0.4) + 0.012 * Math.sin(2.1 * x + 1.3 * z);
    items.forEach((it, i) => {
      const [r0, r1, r2, r3, r4] = it.rnd; const top = it.leaf === 0;
      const y = (top ? 1 : -1) * (yHead + (r0 - 0.5) * 0.020) + wave(it.x, it.z);
      eu.set((r1 - 0.5) * 0.34 + (top ? 0 : Math.PI), r2 * TAU, (r3 - 0.5) * 0.34, 'XYZ'); qt.setFromEuler(eu);
      const sc = 0.92 + 0.16 * r4; pv.set(it.x, y, it.z); sv.set(sc, sc, sc);
      m4.compose(pv, qt, sv); heads.setMatrixAt(i, m4); tails.setMatrixAt(i, m4);
      // heads: Deep Canyon Blue accents among Cliff Mist (the outer leaflet is paler, the inner one bluer); tails: Morning Haze and Cliff Mist
      const blueShare = top ? 0.17 : 0.34;
      if (rand() < blueShare) mixc(P.blue, P.mist, 0.10 + rand() * 0.45, tmpA);
      else { mixc(P.mist, P.slate, 0.10 + rand() * 0.22, tmpA); const hz = rand() * 0.35; tmpA[0] = lerp(tmpA[0], P.haze.r, hz); tmpA[1] = lerp(tmpA[1], P.haze.g, hz); tmpA[2] = lerp(tmpA[2], P.haze.b, hz); }
      cH.setRGB(tmpA[0], tmpA[1], tmpA[2]);
      mixc(P.haze, P.mist, rand() < 0.45 ? 0.55 + rand() * 0.4 : rand() * 0.35, tmpA); cT.setRGB(tmpA[0], tmpA[1], tmpA[2]);
      heads.setColorAt(i, cH); tails.setColorAt(i, cT);
      aLip[3 * i] = rand() * TAU; aLip[3 * i + 1] = rand(); aLip[3 * i + 2] = rand();
    });
    headGeo.setAttribute('aLip', new THREE.InstancedBufferAttribute(aLip, 3));
    tailGeo.setAttribute('aLip', new THREE.InstancedBufferAttribute(aLip.slice(), 3));
    heads.instanceMatrix.needsUpdate = true; tails.instanceMatrix.needsUpdate = true;
    heads.frustumCulled = false; tails.frustumCulled = false;
    stats.instancedTriangles = N * (headGeo.index.count / 3 + tm.idx.length / 3);
    // camera-relative cross-section: when the camera looks along the sheet, the lipids in front of the receptor dissolve
    const cw = new THREE.Vector3(); const lw = new THREE.Vector3();
    const camUpdate = (renderer, scene, camera) => {
      if (!envTried) initEnvironment(renderer);
      camera.getWorldPosition(cw); lw.copy(cw); heads.worldToLocal(lw);
      const hz = Math.hypot(lw.x, lw.z) || 1e-6;
      lipU.uCamDir.value.set(lw.x / hz, lw.z / hz);
      const elev = Math.atan2(lw.y, hz) * 180 / Math.PI;
      lipU.uCut.value = cutOverride >= 0 ? cutOverride : (elev >= 0 ? 1 - sm(9, 25, elev) : 1 - sm(24, 48, -elev));   // fully cut up to ~16 deg above the sheet and ~36 deg below it
    };
    heads.onBeforeRender = camUpdate; tails.onBeforeRender = camUpdate;
    content.add(heads, tails);
    members.heads = heads; members.tails = tails;
  })();

  // ================================================================================================ the receptor
  const RAD = q >= 0.7 ? 20 : 14;
  const recMat = track(new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.36, metalness: 0.0, clearcoat: 0.4, clearcoatRoughness: 0.18,
    emissive: P.glow, emissiveIntensity: 0.0, transparent: true, opacity: 1,      // (always transparent: toggling it would rebuild the shader; depthWrite stays on)
  }));
  const recU = { uRim: { value: 0 }, uAct: { value: 0 }, uGlowCol: { value: new THREE.Color('#E0A35C') } };
  recMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, recU);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aGlow; varying vec2 vGlowW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlowW = aGlow;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGlowW; uniform float uRim; uniform float uAct; uniform vec3 uGlowCol;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uGlowCol * (vGlowW.x * uRim * 0.20 + vGlowW.y * uAct * 0.20);');
  };
  recMat.customProgramCacheKey = () => 'receptor-body-v1';
  lit.push([recMat, 0.8]);

  function helixPart(k, act) {
    const t = TM[k]; const rnd = rng(500 + k);
    const M = Math.ceil((t.top - t.bot) / 0.0120) + 1;
    const Pp = new Float64Array(3 * M); const E1 = new Float64Array(3 * M); const ys = new Float64Array(M);
    const o = [0, 0, 0, 0, 0];
    for (let i = 0; i < M; i++) {
      const y = lerp(t.bot + A_RAD, t.top - A_RAD, i / (M - 1)); helixPoint(k, y, act, o);
      Pp[3 * i] = o[0]; Pp[3 * i + 1] = o[1]; Pp[3 * i + 2] = o[2]; ys[i] = y;
      E1[3 * i] = Math.cos(o[3]); E1[3 * i + 1] = 0; E1[3 * i + 2] = Math.sin(o[3]);
    }
    const ar = A_RAD * (0.97 + 0.06 * rnd()); const at = A_TAN * (0.97 + 0.06 * rnd());
    return buildTube({
      P: Pp, R: RAD, e1: E1,
      shape: (i, th, so) => {
        const y = ys[i]; const g = 1 + 0.007 * Math.cos(th - TAU * y / 0.15 - t.ph);
        so[0] = ar * g * Math.cos(th); so[1] = (at + 0.032 * sm(0.35, 1.0, y)) * g * Math.sin(th);
      },
      capA: { rings: 7, len: ar }, capB: { rings: 7, len: ar },
      color: (i, th, c3) => {
        const y = ys[i];
        mixc(P.blue, P.pine, k / 6, c3); const base = [c3[0], c3[1], c3[2]];
        const hz = 0.12 * sm(0.30, 1.0, y) + 0.05 * sm(-0.35, -1.0, y);
        c3[0] = lerp(base[0], P.haze.r, hz); c3[1] = lerp(base[1], P.haze.g, hz); c3[2] = lerp(base[2], P.haze.b, hz);
      },
      glow: (i, th, g2) => { const y = ys[i]; g2[0] = sm(0.78, 1.0, y); g2[1] = sm(-0.30, -1.0, y) * t.cyto; },
    });
  }

  /** a loop between the ends of two neighbouring helices: a rope that bridges the gap along the rim, rising (side = +1, extracellular) or dropping (side = -1, cytoplasmic) */
  function loopPart(a, b, side, act, extra = 0) {
    const ta = TM[a]; const tb = TM[b]; const o = [0, 0, 0, 0, 0];
    const yEnd = (t) => (side > 0 ? t.top - A_RAD * 0.45 : t.bot + A_RAD * 0.45);
    helixPoint(a, yEnd(ta), act, o); const ya = o[1]; const ra = o[3]; const Ra = o[4];
    helixPoint(b, yEnd(tb), act, o); const yb = o[1]; const rb = o[3]; const Rb = o[4];
    let dAng = rb - ra; while (dAng > Math.PI) dAng -= TAU; while (dAng < -Math.PI) dAng += TAU;
    const N = 16; const S = new Float64Array(3 * (N + 1));
    for (let i = 0; i <= N; i++) {
      const t = i / N; const hump = Math.sin(Math.PI * t);
      const ang = ra + dAng * t; const R = lerp(Ra, Rb, t) + (0.028 + extra) * hump; const y = lerp(ya, yb, t) + side * (0.050 + extra * 0.8) * Math.pow(hump, 0.8);
      S[3 * i] = R * Math.cos(ang); S[3 * i + 1] = y; S[3 * i + 2] = R * Math.sin(ang);
    }
    const rad = 0.033;
    return buildTube({
      P: S, R: Math.max(8, RAD - 8),
      shape: (i, th, so) => { const w = Math.sin(Math.PI * i / N); const r = rad * (0.80 + 0.20 * w); so[0] = r * Math.cos(th); so[1] = r * Math.sin(th); },
      capA: { rings: 3, len: 0.02 }, capB: { rings: 3, len: 0.02 },
      color: (i, th, c3) => { mixc(P.blue, P.pine, (a + (b - a) * i / N) / 6, c3); const b0 = [c3[0], c3[1], c3[2]]; mixc({ r: b0[0], g: b0[1], b: b0[2] }, P.mist, 0.34, c3); },
      glow: (i, th, g2) => { g2[0] = side > 0 ? 0.55 : 0; g2[1] = side < 0 ? (a === 4 ? 0.9 : 0.2) : 0; },
    });
  }

  /** helix 8: a short amphipathic helix lying along the cytoplasmic face of the membrane, after TM7 */
  function helix8Part(act) {
    const o = [0, 0, 0, 0, 0]; const t = TM[6];
    helixPoint(6, t.bot + A_RAD * 0.5, act, o); const a0 = o[3]; const r0 = o[4];
    const cyl = (R, ang, y) => [R * Math.cos(ang), y, R * Math.sin(ang)];
    const ctrl = [
      cyl(r0, a0, t.bot + A_RAD * 0.5), cyl(r0 + 0.08, a0 + 0.20, t.bot + 0.10), cyl(0.50, a0 + 0.46, -0.565), cyl(0.60, a0 + 0.80, -0.525), cyl(0.68, a0 + 1.10, -0.505),
    ];
    const S = spline(ctrl, 14); const Mn = S.length / 3;
    return buildTube({
      P: S, R: RAD,
      shape: (i, th, so) => { const u = i / (Mn - 1); const g = 1 + 0.03 * Math.cos(th - TAU * u * 3.4); const r = (0.034 + 0.026 * sm(0.0, 0.3, u)) * g; so[0] = r * Math.cos(th); so[1] = r * Math.sin(th); },
      capA: { rings: 4, len: 0.034 }, capB: { rings: 6, len: 0.060 },
      color: (i, th, c3) => { mixc(P.pine, P.blue, 0.25, c3); const b0 = [c3[0], c3[1], c3[2]]; mixc({ r: b0[0], g: b0[1], b: b0[2] }, P.mist, 0.18, c3); },
      glow: (i, th, g2) => { g2[0] = 0; g2[1] = 0.55; },
    });
  }

  function receptorParts(act) {
    const parts = [];
    for (let k = 0; k < 7; k++) parts.push(helixPart(k, act));
    parts.push(loopPart(0, 1, -1, act), loopPart(1, 2, +1, act), loopPart(2, 3, -1, act), loopPart(3, 4, +1, act), loopPart(4, 5, -1, act, 0.04), loopPart(5, 6, +1, act));
    parts.push(helix8Part(act));
    return parts;
  }

  const recA = mergeParts(receptorParts(0)); const recB = mergeParts(receptorParts(1));
  const recGeo = track(new THREE.BufferGeometry());
  recGeo.setAttribute('position', new THREE.BufferAttribute(recA.pos, 3)); recGeo.setAttribute('normal', new THREE.BufferAttribute(recA.nor, 3));
  recGeo.setAttribute('color', new THREE.BufferAttribute(recA.col, 3)); recGeo.setAttribute('aGlow', new THREE.BufferAttribute(recA.glow, 2));
  recGeo.setIndex(new THREE.BufferAttribute(recA.idx, 1));
  recGeo.morphAttributes.position = [new THREE.BufferAttribute(recB.pos, 3)]; recGeo.morphAttributes.normal = [new THREE.BufferAttribute(recB.nor, 3)];
  recGeo.morphTargetsRelative = false;
  const receptor = new THREE.Mesh(recGeo, recMat); receptor.name = 'receptor-helices'; receptor.frustumCulled = false;
  content.add(receptor);
  stats.triangles += recA.idx.length / 3;

  // the vestibule: a frosted glass wall just inside the helices (it fills the slits between them and closes the pocket into a cup),
  // with a darker floor. The wall is transparent: the ligand is seen through it. It follows the conformational change (morph target).
  function shellProfile(act) {
    const J = 30; const yF = 0.40; const yR = FRAME.pocket.rim - 0.012; const prof = [];
    for (let j = 0; j <= J; j++) {
      const t = j / J; const y = lerp(yF, yR, t);
      const R = ringR(y) - 0.040 - act * 0.050 * sm(0.40, 1.0, y);
      prof.push([R * Math.sin(clamp(t / 0.24, 0, 1) * Math.PI / 2), y]);
    }
    return prof;
  }
  const shA = buildRevolve(shellProfile(0), 64); const shB = buildRevolve(shellProfile(1), 64);
  const shellGeo = track(new THREE.BufferGeometry());
  shellGeo.setAttribute('position', new THREE.BufferAttribute(shA.pos, 3)); shellGeo.setAttribute('normal', new THREE.BufferAttribute(shA.nor, 3));
  shellGeo.setIndex(new THREE.BufferAttribute(shA.idx, 1));
  shellGeo.morphAttributes.position = [new THREE.BufferAttribute(shB.pos, 3)]; shellGeo.morphAttributes.normal = [new THREE.BufferAttribute(shB.nor, 3)];
  const shellMat = track(new THREE.MeshStandardMaterial({
    color: new THREE.Color().copy(P.mist).lerp(P.haze, 0.35), roughness: 0.22, metalness: 0, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false,
  }));
  shellMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
      'float fr = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));\ndiffuseColor.a *= mix(0.45, 1.0, fr * fr);\n#include <opaque_fragment>');
  };
  shellMat.customProgramCacheKey = () => 'receptor-shell-v1';
  lit.push([shellMat, 0.5]);
  const shell = new THREE.Mesh(shellGeo, shellMat); shell.name = 'pocket-wall'; shell.renderOrder = 2; shell.frustumCulled = false;
  content.add(shell); stats.triangles += shA.idx.length / 3;
  const floorMat = track(new THREE.MeshStandardMaterial({ color: new THREE.Color().copy(P.pine).lerp(P.blue, 0.4), roughness: 0.4, metalness: 0, transparent: true }));
  const floorGeo = track(new THREE.SphereGeometry(1, 36, 16));
  lit.push([floorMat, 0.8]);
  const floor = new THREE.Mesh(floorGeo, floorMat); floor.scale.set(0.17, 0.065, 0.17); floor.position.set(0, FRAME.pocket.y - 0.29, 0); floor.name = 'pocket-floor';
  content.add(floor); stats.triangles += floorGeo.index.count / 3;

  // ================================================================================================ the ligand, a designed protein (the binder), an AlphaFold style cartoon
  // binder.js sweeps one clean mesh along the whole chain (helices, strands, loops, termini). Every vertex has a confidence 0..1 that gives its colour
  // (pLDDT style, in the brand palette) and, for the loops, a metallic gold sheen, for the termini a soft glow.
  const tip = FRAME.ligandTip;
  const ligand = new THREE.Group(); ligand.name = 'ligand'; ligand.position.set(tip[0], tip[1], tip[2]);
  const ligMat = track(new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.34, metalness: 0.0, clearcoat: 0.55, clearcoatRoughness: 0.16, transparent: true, opacity: 1,
  }));
  const ligU = { uGlowAmt: { value: 0.3 }, uGlowCol: { value: new THREE.Color('#E0A35C') } };
  ligMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, ligU);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aConf; varying float vConf;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvConf = aConf;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vConf; uniform float uGlowAmt; uniform vec3 uGlowCol;')
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
float vMet = smoothstep(0.12, 0.24, vConf) * (1.0 - smoothstep(0.42, 0.52, vConf));
metalnessFactor = max(metalnessFactor, 0.62 * vMet);
roughnessFactor = mix(roughnessFactor, 0.27, vMet);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uGlowCol * uGlowAmt * (1.0 - smoothstep(0.10, 0.26, vConf));');
  };
  ligMat.customProgramCacheKey = () => 'receptor-binder-v1';
  lit.push([ligMat, 0.7]);
  (function buildLigand() {
    const M = binderMesh({ step: q >= 0.6 ? 1 : 1.5 });
    const nv = M.nv; const pos = new Float32Array(3 * nv); const col = new Float32Array(3 * nv);
    const stops = CONF_COLORS.map(([c, hex]) => [c, new THREE.Color(hex)]);
    for (let v = 0; v < nv; v++) {
      pos[3 * v] = M.pos[3 * v] - tip[0]; pos[3 * v + 1] = M.pos[3 * v + 1] - tip[1]; pos[3 * v + 2] = M.pos[3 * v + 2] - tip[2];
      const c = M.conf[v]; let k = 0; while (k < stops.length - 2 && c > stops[k + 1][0]) k++;
      const f = clamp((c - stops[k][0]) / ((stops[k + 1][0] - stops[k][0]) || 1), 0, 1); const a = stops[k][1]; const b = stops[k + 1][1];
      col[3 * v] = lerp(a.r, b.r, f); col[3 * v + 1] = lerp(a.g, b.g, f); col[3 * v + 2] = lerp(a.b, b.b, f);
    }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(M.nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aConf', new THREE.BufferAttribute(M.conf, 1)); g.setIndex(new THREE.BufferAttribute(M.idx, 1));
    const mesh = new THREE.Mesh(g, ligMat); mesh.name = 'ligand-binder'; mesh.frustumCulled = false;
    ligand.add(mesh); stats.triangles += M.nt;
  })();
  content.add(ligand);

  // ================================================================================================ the rim of the pocket: a thin glowing contact ring and a soft halo
  const rimY = FRAME.pocket.rim - 0.035; const rimR = FRAME.pocket.radius + 0.02;
  const ringMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color('#F2B56A'), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const ringGeo = track(new THREE.TorusGeometry(rimR, 0.0105, 10, 120)); ringGeo.rotateX(Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.set(0, rimY, 0); ring.renderOrder = 6; ring.name = 'rim-ring';
  const coreMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE6C2'), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const coreGeo = track(new THREE.TorusGeometry(rimR, 0.0042, 8, 120)); coreGeo.rotateX(Math.PI / 2);
  const core = new THREE.Mesh(coreGeo, coreMat); core.position.set(0, rimY, 0); core.renderOrder = 7; core.name = 'rim-ring-core';
  const haloMat = track(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uA: { value: 0 }, uR: { value: rimR }, uW: { value: 0.085 }, uCol: { value: new THREE.Color('#EDAA5C') } },
    vertexShader: 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; uniform float uA; uniform float uR; uniform float uW; uniform vec3 uCol; void main() { float d = (length(vP.xz) - uR) / uW; float a = exp(-d * d) * uA; if (a < 0.004) discard; gl_FragColor = vec4(uCol, a); }',
  }));
  const haloGeo = track(new THREE.RingGeometry(rimR - 0.32, rimR + 0.34, 120, 1)); haloGeo.rotateX(-Math.PI / 2);
  const halo = new THREE.Mesh(haloGeo, haloMat); halo.position.set(0, rimY, 0); halo.renderOrder = 5; halo.name = 'rim-halo';
  // a soft glow behind the cytoplasmic end of the bundle (a camera-facing sprite with a procedural radial gradient)
  const gTex = (() => {
    const N = 64; const d = new Uint8Array(N * N * 4);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const r = Math.hypot((x + 0.5) / N * 2 - 1, (y + 0.5) / N * 2 - 1); const a = Math.exp(-r * r * 3.2) * (1 - sm(0.75, 1.0, r));
      const k = (y * N + x) * 4; d[k] = 255; d[k + 1] = 255; d[k + 2] = 255; d[k + 3] = Math.round(255 * a);
    }
    const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
    return track(t);
  })();
  const halo2Mat = track(new THREE.SpriteMaterial({ map: gTex, color: new THREE.Color('#EDAA5C'), transparent: true, opacity: 0, depthWrite: false }));
  const halo2 = new THREE.Sprite(halo2Mat); halo2.position.set(-0.22, FRAME.receptor.bottom + 0.05, 0.0); halo2.scale.set(1.9, 1.9, 1); halo2.renderOrder = 4; halo2.name = 'cytoplasmic-glow';
  content.add(halo, ring, core, halo2);
  stats.triangles += ringGeo.index.count / 3 + coreGeo.index.count / 3 + haloGeo.index.count / 3;

  // ================================================================================================ the pose
  const dirB = binderDirection(); const uAxis = new THREE.Vector3(dirB[0], dirB[1], dirB[2]);          // the key helix at the pocket, tip to top
  const qTilt = new THREE.Quaternion(); const qTilt2 = new THREE.Quaternion(); const qTwist = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1); const xAxis = new THREE.Vector3(1, 0, 0);
  const lat = new THREE.Vector3(-0.30, 0.0, 0.20);
  const HOVER = 1.05;

  const state = { show: 1, dock: 1, active: 0, time: 0, cut: undefined };
  /** All fields are optional and keep their last value: show, dock, active in 0..1, time in seconds, cut (0..1) to force the bilayer cross-section. */
  function setPose(p = {}) {
    for (const k of ['show', 'dock', 'active', 'time', 'cut']) if (p[k] !== undefined) state[k] = p[k];
    const { show, dock, active, time, cut } = state;
    const sh = clamp(show, 0, 1); const dk = clamp(dock, 0, 1); const ac = clamp(active, 0, 1);
    content.visible = sh > 0.001;
    const eShow = ease(sh);
    content.scale.setScalar(lerp(0.88, 1, eShow));
    lipU.uTime.value = time; lipU.uShow.value = sh;
    cutOverride = cut === undefined || cut === null ? -1 : clamp(cut, 0, 1);
    // opacity of the receptor and the ligand during the fade-in
    const aRec = sm(0.12, 0.75, sh); const aLig = sm(0.30, 1.0, sh);
    recMat.opacity = aRec; floorMat.opacity = aRec; shellMat.opacity = 0.5 * aRec; ligMat.opacity = aLig;
    // the conformational change
    const breathe = 0.018 * Math.sin(time * 1.15);
    const infl = ac + breathe * (0.4 + 0.6 * (1 - ac)); receptor.morphTargetInfluences[0] = infl; shell.morphTargetInfluences[0] = infl;
    recU.uAct.value = ac * (0.80 + 0.20 * Math.sin(time * 2.0)); recU.uRim.value = sm(0.55, 1.0, dk);
    recMat.emissiveIntensity = 0.05 * ac;
    // the ligand slides in along its own axis; a little tilt, sway and twist away from the pocket die out before the contact
    const e = ease(dk); const r = 1 - e; const r2 = r * r;
    ligand.position.set(tip[0] + uAxis.x * HOVER * r + lat.x * r2, tip[1] + uAxis.y * HOVER * r + lat.y * r2, tip[2] + uAxis.z * HOVER * r + lat.z * r2);
    qTilt.setFromAxisAngle(zAxis, -0.52 * r2); qTilt2.setFromAxisAngle(xAxis, 0.16 * r2); qTwist.setFromAxisAngle(uAxis, 2.3 * r);
    ligand.quaternion.copy(qTilt).multiply(qTilt2).multiply(qTwist);
    const sway = (0.0010 + 0.016 * r) * Math.sin(time * 1.3);
    ligand.scale.setScalar(1 + (0.0008 + 0.010 * r) * Math.sin(time * 1.7 + 0.6));
    ligand.rotateOnWorldAxis(zAxis, sway);
    ligU.uGlowAmt.value = 0.28 + 0.22 * sm(0.5, 1.0, dk) + 0.04 * Math.sin(time * 2.2);
    // the contact ring and halo on the rim
    const g = sm(0.55, 1.0, dk) * sh; const pulse = 1 + 0.12 * Math.sin(time * 2.4);
    ringMat.opacity = clamp(g * 0.95 * pulse, 0, 1); ring.visible = g > 0.004; coreMat.opacity = clamp(g * 0.9, 0, 1); core.visible = ring.visible;
    haloMat.uniforms.uA.value = g * 0.42 * pulse * (1 - 0.35 * ac); halo.visible = g > 0.004;
    ring.scale.setScalar(1 - 0.10 * ac); core.scale.setScalar(1 - 0.10 * ac); halo.scale.setScalar(1 - 0.10 * ac);
    const ga = sm(0.05, 0.95, ac) * sh; halo2Mat.opacity = ga * 0.40 * (1 + 0.15 * Math.sin(time * 2.0)); halo2.visible = ga > 0.004;
  }

  // bounding boxes (frame units) of the whole group in the docked pose and in the hovering pose (lipids: the sheet is faded out beyond ~3.0)
  const bounds = (() => {
    const out = {};
    for (const [name, dk] of [['docked', 1], ['hover', 0]]) {
      setPose({ show: 1, dock: dk, active: 0, time: 0 }); group.updateMatrixWorld(true);
      const b = new THREE.Box3(); const bb = new THREE.Box3();
      group.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || o.visible === false) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); b.union(bb);
      });
      b.min.x = Math.min(b.min.x, -FRAME.halfSize); b.max.x = Math.max(b.max.x, FRAME.halfSize); b.min.z = Math.min(b.min.z, -FRAME.halfSize); b.max.z = Math.max(b.max.z, FRAME.halfSize);
      out[name] = { min: b.min.toArray(), max: b.max.toArray() };
    }
    return out;
  })();
  state.dock = 1; setPose({ show: 1, dock: 1, active: 0, time: 0 });

  const axisPts = binderAxis(28).map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  function ribbonPath() { return axisPts.map((v) => v.clone()); }

  /**
   * Optional, to avoid a hitch on the first frame: builds the studio environment and compiles every shader of the scene ahead of time.
   * Call it once after the group has been added to the host scene (renderer: the THREE.WebGLRenderer, camera: the one that will render it).
   */
  function precompile(renderer, camera) {
    initEnvironment(renderer);
    try { renderer.compile(group, camera); } catch (e) { /* the first render will compile what is missing */ }
  }

  function dispose() {
    for (const d of disposables) d.dispose();
    if (group.userData.envRenderTarget) group.userData.envRenderTarget.dispose();
    if (envRT) envRT.dispose();
    group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    group.removeFromParent();
  }

  if (renderer) initEnvironment(renderer);
  stats.buildMs = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
  return { group, setPose, ribbonPath, dispose, initEnvironment, precompile, bounds, lit, lightRig: { hemi, key, fill, rim }, stats, ligand, receptor, lipids: members, lights, uniforms: { lipid: lipU, receptor: recU }, pocket: FRAME.pocket };
}
