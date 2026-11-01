// Startup culture dioramas. Four voxel scenes rendered with three.js InstancedMesh cubes (MeshStandardMaterial),
// soft shadows, smooth voxel ambient occlusion (a 3D occupancy texture read in the fragment shader) and a light isometric camera.
//   ?scene=whiteboard-sprint | founders-table | pitch-day | partners-handshake
//   ?w=1200&h=800  canvas size      ?ss=2  supersampling      ?az=35&el=28&fov=22  camera      ?zoom=2&fx=0.3&fy=0  detail framing
// No text anywhere in the images. Units: 1 voxel = 1 world unit, y is up, +z points toward the viewer, floor top is y = 0.
import * as THREE from 'three';

/* ======================================================================== */
/* parameters                                                                */
/* ======================================================================== */
const Q = new URLSearchParams(location.search);
const qn = (k, d) => (Q.has(k) && Q.get(k) !== '' ? +Q.get(k) : d);
const SCENE = Q.get('scene') || 'whiteboard-sprint';
const OUT_W = qn('w', 1200);
const OUT_H = qn('h', 800);
const SS = Math.max(1, Math.min(3, qn('ss', Math.min(2, window.devicePixelRatio || 1))));
const D2R = Math.PI / 180;

/* ======================================================================== */
/* small helpers                                                             */
/* ======================================================================== */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function hash3(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function rng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const h2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2h = (c) => '#' + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mixHex = (a, b, t) => { const A = h2rgb(a), B = h2rgb(b); return rgb2h(A.map((v, i) => v + (B[i] - v) * t)); };
const lite = (h, t) => mixHex(h, '#ffffff', t);
const dark = (h, t) => mixHex(h, '#0f1619', t);

/* ======================================================================== */
/* palette. Index 0 is "empty". Materials: m matte, s satin, g glow (Timber Glow), l lit (screens, windows) */
/* ======================================================================== */
const PAL = [null];
const PKEY = new Map();
function C(hex, mat = 'm', jit = 0.03) {
  const key = hex + '|' + mat + '|' + jit;
  let i = PKEY.get(key);
  if (i === undefined) {
    i = PAL.length;
    PAL.push({ hex, mat, jit, col: new THREE.Color(hex) });
    PKEY.set(key, i);
  }
  return i;
}
const BR = { haze: '#E7EEF0', mist: '#C8D1D3', glow: '#E0A35C', blue: '#2A5F86', pine: '#27463D' };
const K = {
  white: C('#FBFCFC', 'm', 0.012), paper: C('#F3F6F7', 'm', 0.015),
  haze: C(BR.haze, 'm', 0.015), mist: C(BR.mist, 'm', 0.02),
  g1: C('#EEF2F3', 'm', 0.018), g2: C('#DCE3E5', 'm', 0.02), g3: C('#BAC5C9', 'm', 0.025), g4: C('#97A5AA', 'm', 0.025),
  g5: C('#6A757C', 'm', 0.025), g6: C('#4B565C', 'm', 0.025), g7: C('#313B41', 'm', 0.025), ink: C('#1F272B', 'm', 0.02),
  blue: C(BR.blue, 'm', 0.035), blueL: C(lite(BR.blue, 0.28), 'm', 0.035), blueXL: C(lite(BR.blue, 0.62), 'm', 0.03), blueD: C(dark(BR.blue, 0.3), 'm', 0.03),
  pine: C(lite(BR.pine, 0.1), 'm', 0.035), pineL: C(lite(BR.pine, 0.35), 'm', 0.04), pineXL: C(lite(BR.pine, 0.66), 'm', 0.04), pineD: C(dark(BR.pine, 0.25), 'm', 0.03),
  amber: C(BR.glow, 'm', 0.03), amberL: C(lite(BR.glow, 0.38), 'm', 0.03), amberXL: C(lite(BR.glow, 0.7), 'm', 0.025), amberD: C(dark(BR.glow, 0.25), 'm', 0.03),
  glow: C(BR.glow, 'g', 0.02), glowL: C(lite(BR.glow, 0.45), 'g', 0.02),
  lit: C('#F4FAFC', 'l', 0.0), litBlue: C(lite(BR.blue, 0.82), 'l', 0.0), sky: C('#EAF4F8', 'l', 0.0),
  // woods (light oak family, derived from Timber Glow so it stays in the palette)
  oak: C('#D8B98C', 'm', 0.04), oakL: C('#E6CDA6', 'm', 0.04), oakD: C('#B8935F', 'm', 0.04), walnut: C('#8E6B49', 'm', 0.04),
  // tools
  metal: C('#AEB9BD', 's', 0.03), metalD: C('#7D8A90', 's', 0.03),
  coffee: C('#4A3427', 'm', 0.03), steam: C('#F2F6F7', 'm', 0.0),
  eye: C('#1B2328', 'm', 0), mouth: C('#7A3B35', 'm', 0), teeth: C('#FFFFFF', 'm', 0),
  leaf1: C('#3F6B56', 'm', 0.07), leaf2: C('#58846B', 'm', 0.07), leaf3: C('#7FA98C', 'm', 0.06), leaf4: C('#2F5645', 'm', 0.06),
  air: -1,
};
const SKIN = ['#F6D2B4', '#EBB78F', '#CE956B', '#A06B47', '#6F4730'];
const HAIRC = { black: '#252021', brown: '#5B3A26', auburn: '#A8552F', blond: '#E2BE76', gray: '#A0A9AD', white: '#ECE9E3', ink: '#1C2531' };

/* ======================================================================== */
/* voxel grid and rasterisers                                                */
/* ======================================================================== */
let G = null;
function newGrid(x0, y0, z0, nx, ny, nz) {
  G = { x0, y0, z0, nx, ny, nz, d: new Uint16Array(nx * ny * nz) };
}
function put(x, y, z, c) {
  if (!c) return;
  if (x < G.x0 || y < G.y0 || z < G.z0 || x >= G.x0 + G.nx || y >= G.y0 + G.ny || z >= G.z0 + G.nz) return;
  G.d[x - G.x0 + G.nx * (y - G.y0 + G.ny * (z - G.z0))] = c < 0 ? 0 : c;
}
function at(x, y, z) {
  if (x < G.x0 || y < G.y0 || z < G.z0 || x >= G.x0 + G.nx || y >= G.y0 + G.ny || z >= G.z0 + G.nz) return 0;
  return G.d[x - G.x0 + G.nx * (y - G.y0 + G.ny * (z - G.z0))];
}
// local coordinates / parameter exposed to colour callbacks (set by the last primitive test)
let QX = 0, QY = 0, QZ = 0, QT = 0;
// inclusive integer bounds, test(cx, cy, cz) on voxel centres, col = palette index or function(x, y, z) -> index (0 keeps, -1 erases)
function fill(x0, y0, z0, x1, y1, z1, test, col, only) {
  x0 = Math.max(x0, G.x0); y0 = Math.max(y0, G.y0); z0 = Math.max(z0, G.z0);
  x1 = Math.min(x1, G.x0 + G.nx - 1); y1 = Math.min(y1, G.y0 + G.ny - 1); z1 = Math.min(z1, G.z0 + G.nz - 1);
  const isF = typeof col === 'function';
  const d = G.d;
  for (let z = z0; z <= z1; z++) {
    for (let y = y0; y <= y1; y++) {
      let i = x0 - G.x0 + G.nx * (y - G.y0 + G.ny * (z - G.z0));
      for (let x = x0; x <= x1; x++, i++) {
        if (only && !only.has(d[i])) continue;
        if (!test(x + 0.5, y + 0.5, z + 0.5)) continue;
        const c = isF ? col(x, y, z) : col;
        if (c) d[i] = c < 0 ? 0 : c;
      }
    }
  }
}
const ALWAYS = () => true;
// axis-aligned block: position and size in voxels
function box(x, y, z, w, h, d, col, only) { fill(x, y, z, x + w - 1, y + h - 1, z + d - 1, ALWAYS, col, only); }

/* rotations and frames: columns of R are the local axes expressed in world coordinates */
function mm(A, B) {
  const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
  return R;
}
const RY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
const RX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
const RZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
// yaw about y (turns toward +x), pitch about x (positive leans or looks down), roll about z
const rot = (yaw = 0, pitch = 0, roll = 0) => mm(mm(RY(yaw), RX(pitch)), RZ(roll));
class Frame {
  constructor(o, R) { this.o = o; this.R = R; }
  pt(x, y, z) {
    const R = this.R, o = this.o;
    return [o[0] + R[0][0] * x + R[0][1] * y + R[0][2] * z, o[1] + R[1][0] * x + R[1][1] * y + R[1][2] * z, o[2] + R[2][0] * x + R[2][1] * y + R[2][2] * z];
  }
  dir(x, y, z) {
    const R = this.R;
    return [R[0][0] * x + R[0][1] * y + R[0][2] * z, R[1][0] * x + R[1][1] * y + R[1][2] * z, R[2][0] * x + R[2][1] * y + R[2][2] * z];
  }
  child(off, r) { return new Frame(this.pt(off[0], off[1], off[2]), r ? mm(this.R, r) : this.R); }
}
const IDF = new Frame([0, 0, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
const frameAt = (x, y, z, yaw = 0) => new Frame([x, y, z], rot(yaw));

// oriented super-ellipsoid (p = 2 ellipsoid, 3 to 5 rounded block, 99 sharp box). c = centre in frame coordinates, h = half sizes
function sq(F, c, h, p, col, only) {
  let mnx = 1e9, mny = 1e9, mnz = 1e9, mxx = -1e9, mxy = -1e9, mxz = -1e9;
  for (let k = 0; k < 8; k++) {
    const w = F.pt(c[0] + (k & 1 ? h[0] : -h[0]), c[1] + (k & 2 ? h[1] : -h[1]), c[2] + (k & 4 ? h[2] : -h[2]));
    if (w[0] < mnx) mnx = w[0]; if (w[0] > mxx) mxx = w[0];
    if (w[1] < mny) mny = w[1]; if (w[1] > mxy) mxy = w[1];
    if (w[2] < mnz) mnz = w[2]; if (w[2] > mxz) mxz = w[2];
  }
  const R = F.R, o = F.o, i0 = 1 / h[0], i1 = 1 / h[1], i2 = 1 / h[2];
  fill(Math.floor(mnx), Math.floor(mny), Math.floor(mnz), Math.ceil(mxx), Math.ceil(mxy), Math.ceil(mxz), (cx, cy, cz) => {
    const dx = cx - o[0], dy = cy - o[1], dz = cz - o[2];
    const qx = R[0][0] * dx + R[1][0] * dy + R[2][0] * dz - c[0];
    const qy = R[0][1] * dx + R[1][1] * dy + R[2][1] * dz - c[1];
    const qz = R[0][2] * dx + R[1][2] * dy + R[2][2] * dz - c[2];
    const ax = Math.abs(qx) * i0, ay = Math.abs(qy) * i1, az = Math.abs(qz) * i2;
    let v;
    if (p === 2) v = ax * ax + ay * ay + az * az;
    else if (p >= 12) v = Math.max(ax, ay, az);
    else v = Math.pow(ax, p) + Math.pow(ay, p) + Math.pow(az, p);
    if (v > 1) return false;
    QX = qx; QY = qy; QZ = qz;
    return true;
  }, col, only);
}
const ell = (c, r, col, only) => sq(IDF, c, r, 2, col, only);
const ball = (c, r, col, only) => sq(IDF, c, [r, r, r], 2, col, only);
const obox = (F, c, h, col, only) => sq(F, c, h, 99, col, only);
// tapered capsule between two world points
function cap(a, b, r0, r1, col, only) {
  if (r1 === undefined) r1 = r0;
  const rm = Math.max(r0, r1) + 1;
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const L2 = dx * dx + dy * dy + dz * dz || 1e-6;
  fill(Math.floor(Math.min(a[0], b[0]) - rm), Math.floor(Math.min(a[1], b[1]) - rm), Math.floor(Math.min(a[2], b[2]) - rm),
    Math.ceil(Math.max(a[0], b[0]) + rm), Math.ceil(Math.max(a[1], b[1]) + rm), Math.ceil(Math.max(a[2], b[2]) + rm), (cx, cy, cz) => {
      let t = ((cx - a[0]) * dx + (cy - a[1]) * dy + (cz - a[2]) * dz) / L2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a[0] + dx * t - cx, py = a[1] + dy * t - cy, pz = a[2] + dz * t - cz;
      const r = r0 + (r1 - r0) * t;
      if (px * px + py * py + pz * pz > r * r) return false;
      QT = t;
      return true;
    }, col, only);
}
// vertical cylinder (elliptic if rz given). y0 = bottom, h = height, rTop = radius factor at the top
function cyl(cx, y0, cz, rx, h, col, rz = rx, rTop = 1, only) {
  fill(Math.floor(cx - rx - 1), Math.floor(y0), Math.floor(cz - rz - 1), Math.ceil(cx + rx + 1), Math.ceil(y0 + h) - 1, Math.ceil(cz + rz + 1), (x, y, z) => {
    if (y < y0 || y > y0 + h) return false;
    const t = (y - y0) / h, s = lerp(1, rTop, t);
    const dx = (x - cx) / (rx * s), dz = (z - cz) / (rz * s);
    if (dx * dx + dz * dz > 1) return false;
    QT = t; QX = x - cx; QY = y - y0; QZ = z - cz;
    return true;
  }, col, only);
}
// one-voxel line between voxel indices
function line(a, b, col, th = 1) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 2) + 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = Math.floor(a[0] + (b[0] - a[0]) * t + 0.5), y = Math.floor(a[1] + (b[1] - a[1]) * t + 0.5), z = Math.floor(a[2] + (b[2] - a[2]) * t + 0.5);
    if (th <= 1) put(x, y, z, typeof col === 'function' ? col(x, y, z) : col);
    else box(x, y, z, th, th, th, col);
  }
}
// pixel art on a plane: rows[] of characters, legend maps a character to a palette index ('.' and ' ' skip)
function pix(o, u, v, rows, legend) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const ch = rows[r][c];
      if (ch === '.' || ch === ' ') continue;
      const col = legend[ch];
      if (col === undefined) continue;
      put(o[0] + u[0] * c + v[0] * r, o[1] + u[1] * c + v[1] * r, o[2] + u[2] * c + v[2] * r, col);
    }
  }
}
const ONLY = (...ids) => new Set(ids);

/* ======================================================================== */
/* two-bone inverse kinematics (elbows, knees)                               */
/* ======================================================================== */
function ik2(S, T, L1, L2, pole) {
  let dx = T[0] - S[0], dy = T[1] - S[1], dz = T[2] - S[2];
  const dRaw = Math.hypot(dx, dy, dz) || 1e-6;
  const d = Math.min(dRaw, (L1 + L2) * 0.999);
  const u = [dx / dRaw, dy / dRaw, dz / dRaw];
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const pd = pole[0] * u[0] + pole[1] * u[1] + pole[2] * u[2];
  let p = [pole[0] - pd * u[0], pole[1] - pd * u[1], pole[2] - pd * u[2]];
  const pl = Math.hypot(p[0], p[1], p[2]) || 1;
  p = [p[0] / pl, p[1] / pl, p[2] / pl];
  return {
    E: [S[0] + u[0] * a + p[0] * h, S[1] + u[1] * a + p[1] * h, S[2] + u[2] * a + p[2] * h],
    T: [S[0] + u[0] * d, S[1] + u[1] * d, S[2] + u[2] * d],
  };
}

/* ======================================================================== */
/* people: chibi voxel figures built from rounded blocks and capsules.        */
/* Local frame: +z is where the figure looks, +y up, +x is the figure's left. */
/* yaw 0 faces the viewer (+z), yaw PI faces the back wall (-z).              */
/* ======================================================================== */

function hairdo(head, style, hc, skC, o) {
  const hairVol = (centre, half, p, keep) => sq(head, centre, half, p, () => (keep(QX + centre[0], QY + centre[1], QZ + centre[2]) ? hc : 0));
  const fr = o.fringe ?? 0;
  const crown = 3.3 - fr;
  const short = (extra = 0) => hairVol([0, 0.7, -0.6], [8.5 + extra, 8.0 + extra, 7.9 + extra], 3.2, (x, y, z) =>
    (y > crown + (o.sweep ? 0.14 * x : 0)) || (z < -2.3 && y > -4.6) || (Math.abs(x) > 5.7 && y > 1.0 && z < 4.2));
  switch (style) {
    case 'short': short(); break;
    case 'buzz': hairVol([0, 0.5, -0.5], [7.95, 7.4, 7.35], 3.2, (x, y, z) => y > 3.4 || (z < -2.6 && y > -3) || (Math.abs(x) > 6.2 && y > 1.6 && z < 3)); break;
    case 'long':
      short();
      sq(head, [0, -7.0, -4.6], [7.4, 6.6, 3.3], 4, hc);
      for (const s of [1, -1]) sq(head, [s * 7.2, -3.2, -1.2], [1.7, 5.4, 5.2], 3.4, hc);
      break;
    case 'bob':
      short();
      sq(head, [0, -3.2, -3.0], [8.4, 4.8, 5.4], 3.4, hc);
      for (const s of [1, -1]) sq(head, [s * 7.6, -2.6, -0.5], [1.5, 4.2, 5.8], 3.4, hc);
      break;
    case 'bun':
      short();
      ball(head.pt(0, 8.4, -3.6), 3.7, hc);
      break;
    case 'pony':
      short();
      cap(head.pt(0, 2.8, -7.4), head.pt(0, -7.0, -11.4), 2.5, 1.4, hc);
      break;
    case 'curly': {
      const r = rng(7 + (o.seed || 0));
      sq(head, [0, 1.6, -0.5], [9.4, 8.6, 8.8], 2.4, (x, y, z) => ((QY + 1.6 > 2.2 - fr) || (QZ - 0.5 < -2.2 && QY + 1.6 > -3.5) || (Math.abs(QX) > 6 && QY + 1.6 > 0.4 && QZ - 0.5 < 3.2)) ? hc : 0);
      for (let i = 0; i < 26; i++) {
        const th = r() * Math.PI * 2, ph = Math.acos(1 - r() * 1.15);
        const dx = Math.sin(ph) * Math.cos(th), dy = Math.cos(ph), dz = Math.sin(ph) * Math.sin(th);
        if (dz > 0.55 && dy < 0.75) continue;
        ball(head.pt(dx * 8.6, 1.6 + dy * 8.0, -0.5 + dz * 8.2), 2.3 + r() * 1.0, hc);
      }
      break;
    }
    case 'beanie': {
      const brim = o.hat2 ?? hc;
      short(-0.4);
      sq(head, [0, 1.6, -0.2], [8.6, 6.9, 8.3], 3, (x, y, z) => { const y2 = QY + 1.6; return y2 < 2.6 ? 0 : (y2 < 4.7 ? brim : o.hat ?? hc); });
      ball(head.pt(0, 8.9, -0.4), 2.5, brim);
      break;
    }
    case 'cap': {
      short(-0.3);
      sq(head, [0, 1.8, -0.3], [8.4, 6.5, 8.2], 3, (x, y, z) => (QY + 1.8 < 2.6 ? 0 : (o.hat ?? hc)));
      const vf = head.child([0, 2.8, 6.2], rot(0, 0.18, 0));
      sq(vf, [0, 0, 3.4], [5.6, 0.9, 3.8], 4, o.hat2 ?? o.hat ?? hc);
      break;
    }
    default: break;
  }
  if (o.beard) {
    const bc = o.beardColor ?? hc;
    sq(head, [0, -3.7, 0.6], [7.3, 3.6, 6.5], 3, () => { const y = QY - 3.7, z = QZ + 0.6; return (y < -2.8 && z > -2.5) ? bc : 0; }, ONLY(skC));
  }
  if (o.stache) box2(head, [0, -2.2, 6.9], [2.8, 0.7, 1.6], o.beardColor ?? hc, ONLY(skC));
}
const box2 = (F, c, h, col, only) => sq(F, c, h, 99, col, only);

// returns paint(a, b, colour, out): column a (positive toward the figure's left), row b (0 = head centre height), out = voxels in front of the skin
function faceKit(head, skSet) {
  const R = head.R;
  const n = [R[0][2], R[1][2], R[2][2]], hx = [R[0][0], R[1][0], R[2][0]];
  const alongX = Math.abs(n[0]) >= Math.abs(n[2]);
  const sN = (alongX ? Math.sign(n[0]) : Math.sign(n[2])) || 1;
  const Hs = (alongX ? Math.sign(hx[2]) : Math.sign(hx[0])) || 1;
  const p = head.pt(0, 0, 6.9);
  const cx = Math.floor(p[0]), cy = Math.floor(p[1]), cz = Math.floor(p[2]);
  return (a, b, col, out = 0) => {
    const y = cy + b;
    for (let d = 4; d >= -4; d--) {
      let x, z;
      if (alongX) { x = cx + sN * d; z = cz + Hs * a; } else { z = cz + sN * d; x = cx + Hs * a; }
      const c = at(x, y, z);
      if (c && skSet.has(c)) {
        if (out) { if (alongX) x += sN * out; else z += sN * out; }
        put(x, y, z, col);
        return;
      }
    }
  };
}

function person(o) {
  const skI = o.skin ?? 1;
  const skC = C(SKIN[skI], 'm', 0.02);
  const cheekC = C(mixHex(SKIN[skI], '#E8857C', 0.34), 'm', 0.01);
  const earC = C(mixHex(SKIN[skI], '#D8776B', 0.12), 'm', 0.02);
  const hc = o.hairColor === undefined ? C(HAIRC.brown, 'm', 0.05) : (typeof o.hairColor === 'number' ? o.hairColor : C(HAIRC[o.hairColor], 'm', 0.05));
  const yaw = o.yaw || 0;
  const root = new Frame([o.x, o.y || 0, o.z], rot(yaw));
  const seated = o.seat !== undefined;
  const hipY = seated ? o.seat + 3.4 : 17.4;
  const chest = root.child([0, hipY, 0], rot(o.twist || 0, o.lean || 0, o.roll || 0));
  const top = o.top ?? K.blue;
  const topHex = PAL[top].hex;
  const trim = o.trim ?? C(lite(topHex, 0.18), 'm', 0.04);
  const pants = o.pants ?? K.g6;
  const shoe = o.shoe ?? K.white;
  const sole = o.sole ?? K.g2;
  const kind = o.kind || 'hoodie';
  const ONSK = ONLY(skC, cheekC);

  // legs and shoes
  const hipJ = hipY - 1.6;
  const feet = [];
  for (const s of [1, -1]) {
    const f = o.feet && o.feet[s > 0 ? 0 : 1];
    const A = f ? root.pt(f[0], f[1] ?? 3.0, f[2]) : seated ? root.pt(s * 3.6, 3.0, 11.5) : root.pt(s * 3.6, 3.0, 0);
    const H = root.pt(s * 3.6, hipJ, 0);
    const { E, T } = ik2(H, A, 7.0, 7.0, root.dir(s * 0.1, 0.3, 1));
    cap(H, E, 3.2, 2.9, pants);
    cap(E, T, 2.8, 2.45, pants);
    const sf = new Frame(T, rot(yaw + (f && f[3] ? f[3] : s * -0.08)));
    sq(sf, [0, -0.5, 1.9], [2.85, 2.2, 4.5], 3.2, shoe);
    sq(sf, [0, -2.3, 2.0], [2.95, 0.9, 4.7], 8, sole);
    feet.push(T);
  }
  sq(root, [0, hipY - 2.0, 0], [6.3, 3.6, 4.3], 3, pants);

  // torso and clothes
  if (kind === 'coat') {
    sq(chest, [0, 3.2, 0], [7.0, 11.4, 4.8], 3.4, (x, y, z) => {
      const yc = QY + 3.2;
      const vw = clamp((yc - 1.0) / 11.0, 0, 1) * 3.6;
      if (QZ > 1.5 && Math.abs(QX) < vw && yc > 0.5) return o.under ?? K.blue;
      if (QZ > 3.2 && Math.abs(QX) < 0.55 && yc <= 0.5) return K.g2;
      if (QZ > 3.4 && yc > 0.5 && Math.abs(Math.abs(QX) - vw - 0.8) < 0.7) return K.g2;     // lapel edge
      return top;
    });
    for (const s of [1, -1]) {
      sq(chest, [s * 2.9, 13.2, 1.2], [1.6, 1.3, 3.1], 3, top);         // collar wings
      sq(chest, [s * 4.2, -1.0, 4.6], [2.2, 1.7, 0.55], 99, K.g2);       // pocket flaps
    }
  } else if (kind === 'blazer') {
    sq(chest, [0, 5.4, 0], [6.9, 8.6, 4.7], 3.2, (x, y, z) => {
      const yc = QY + 5.4;
      const vw = clamp((yc - 2.0) / 10.0, 0, 1) * 3.4;
      if (QZ > 1.5 && Math.abs(QX) < vw && yc > 1.5) return o.under ?? K.white;
      if (QZ > 3.4 && yc > 1.5 && Math.abs(Math.abs(QX) - vw - 0.8) < 0.8) return trim;
      return top;
    });
  } else {
    sq(chest, [0, 6.2, 0], [6.7, 7.9, 4.5], 3.0, (x, y, z) => {
      if (o.stripe && QY + 6.2 > o.stripe[0] && QY + 6.2 < o.stripe[1] && kind !== 'coat') return o.stripe[2];
      if (QY < -6.2 && (kind === 'hoodie' || kind === 'sweater')) return trim;
      return top;
    });
    if (kind === 'hoodie') {
      sq(chest, [0, 13.2, -2.4], [5.8, 3.1, 3.7], 2.6, top);
      sq(chest, [0, 1.4, 4.1], [4.8, 2.3, 1.1], 4, C(dark(topHex, 0.13), 'm', 0.035));
      cap(chest.pt(-1.8, 12.4, 4.4), chest.pt(-2.4, 8.6, 4.8), 0.6, 0.6, K.g1);
      cap(chest.pt(1.8, 12.4, 4.4), chest.pt(1.6, 6.8, 4.8), 0.6, 0.6, K.g1);
    } else if (kind === 'sweater') {
      sq(chest, [0, 13.6, 0.2], [4.3, 1.8, 3.6], 2.6, trim);
    } else if (kind === 'shirt') {
      sq(chest, [0, 13.7, 0.3], [4.0, 1.5, 3.4], 2.6, o.collar ?? K.white);
    }
  }
  if (o.lanyard) {
    const lc = o.lanyard;
    for (const s of [1, -1]) cap(chest.pt(s * 2.4, 13.5, 3.7), chest.pt(s * 0.4, 5.2, 4.7), 0.65, 0.65, lc);
    sq(chest, [0, 3.0, 4.7], [2.0, 2.6, 0.6], 99, K.white);
    sq(chest, [0, 4.4, 4.9], [2.0, 0.8, 0.6], 99, K.blue);
  }
  if (o.scarf) {
    sq(chest, [0, 13.3, 0.2], [5.1, 2.1, 4.9], 2.6, o.scarf);
    sq(chest, [2.3, 9.8, 4.6], [1.6, 4.6, 0.9], 4, o.scarf);
  }

  // neck, head
  cap(chest.pt(0, 12.5, 0.2), chest.pt(0, 16.6, 0.5), 2.5, 2.3, skC);
  const head = chest.child([0, 22.6, 0.5], rot(o.hy || 0, o.hp || 0, o.hr || 0));
  sq(head, [0, 0, 0], [7.6, 6.9, 6.9], 3.2, skC);
  for (const s of [1, -1]) ball(head.pt(s * 7.5, -0.5, 0.2), 1.45, earC);
  hairdo(head, o.hair || 'short', hc, skC, o);
  // face: pixel art projected on the dominant grid plane of the head, painted on the real skin surface
  const face = faceKit(head, ONSK);
  const eyeStyle = o.eyes || 'dot';
  for (const s of [-1, 1]) {
    if (eyeStyle === 'dot') for (const a of [2, 3]) for (const b of [0, 1]) face(s * a, b, K.eye);
    else if (eyeStyle === 'tall') for (const a of [2, 3]) for (const b of [0, 1, 2]) face(s * a, b, K.eye);
    else if (eyeStyle === 'happy') { face(s * 3, 1, K.eye); face(s * 2, 0, K.eye); face(s * 4, 0, K.eye); face(s * 2, 1, K.eye, 0); }
    else if (eyeStyle === 'look') { for (const a of [2, 3]) for (const b of [0, 1]) face(s * a, b, K.white); face(s * (o.gaze > 0 ? 3 : 2), 0, K.eye); face(s * (o.gaze > 0 ? 3 : 2), 1, K.eye); }
    if (o.brows) for (const a of [2, 3]) face(s * a, 2 + (o.browLift || 0), hc);
    if (o.cheeks !== false) { face(s * 4, -2, cheekC); face(s * 5, -2, cheekC); }
  }
  face(0, -1, skC, 1);
  const mouth = o.mouth || 'smile';
  if (mouth === 'smile') { for (const a of [-1, 0, 1]) face(a, -4, K.mouth); face(-2, -3, K.mouth); face(2, -3, K.mouth); }
  else if (mouth === 'open') { for (const a of [-1, 0, 1]) { face(a, -4, K.mouth); face(a, -3, K.mouth); } }
  else if (mouth === 'laugh') {
    for (const a of [-2, -1, 0, 1, 2]) face(a, -3, K.teeth);
    for (const a of [-1, 0, 1]) face(a, -4, K.mouth);
    face(-3, -3, K.mouth); face(3, -3, K.mouth);
  } else if (mouth === 'o') { face(0, -3, K.mouth); face(0, -4, K.mouth); }
  else if (mouth === 'flat') { for (const a of [-1, 0, 1]) face(a, -4, K.mouth); }
  if (o.glasses !== undefined) {
    const gc = o.glasses;
    for (const s of [-1, 1]) {
      for (let a = 1; a <= 4; a++) { face(s * a, 2, gc); face(s * a, -1, gc); }
      for (const b of [0, 1]) { face(s * 1, b, gc); face(s * 4, b, gc); }
    }
    face(0, 1, gc, 1);
  }
  if (o.headphones) {
    const hp = o.headphones;
    for (const s of [1, -1]) sq(head, [s * 8.2, -0.3, 0.2], [1.7, 3.3, 3.3], 3, hp);
    let prev = null;
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI;
      const p = head.pt(Math.cos(a) * 8.3, 0.4 + Math.sin(a) * 8.1, 0.2);
      if (prev) cap(prev, p, 0.95, 0.95, hp);
      prev = p;
    }
  }

  // arms
  const hands = [];
  for (const s of [1, -1]) {
    const A = o.arms && o.arms[s > 0 ? 'l' : 'r'];
    const S = chest.pt(s * 6.9, 11.4, 0);
    const hand = A && A.w ? A.w : A && A.hand ? root.pt(A.hand[0], A.hand[1], A.hand[2]) : root.pt(s * 9.3, hipY - 3.2, 1.2);
    const pole = A && A.pole ? (A.poleW ? A.pole : root.dir(A.pole[0], A.pole[1], A.pole[2])) : root.dir(s * 0.7, -0.45, -0.9);
    const { E, T } = ik2(S, hand, 6.9 * (o.armScale || 1), 6.7 * (o.armScale || 1), pole);
    const shortSleeve = kind === 'tee';
    cap(S, E, 2.65, 2.4, top);
    cap(E, T, 2.4, 2.05, () => (shortSleeve ? skC : QT > 0.84 ? trim : top));
    ball(T, 2.15, skC);
    if (A && A.point) {
      const dv = [T[0] - E[0], T[1] - E[1], T[2] - E[2]], dl = Math.hypot(dv[0], dv[1], dv[2]) || 1;
      cap(T, [T[0] + (dv[0] / dl) * 4.2, T[1] + (dv[1] / dl) * 4.2, T[2] + (dv[2] / dl) * 4.2], 0.95, 0.6, skC);
    }
    hands.push(T);
  }

  return { root, chest, head, hands, feet, eye: head.pt(0, 0.5, 8), top: head.pt(0, 8, 0) };
}

/*@@PEOPLE-END@@*/

/* ======================================================================== */
/* drawing on a plane (walls, boards, screens)                               */
/* ======================================================================== */
class Plane {
  // o = world voxel of (u=0, v=0), U and V = integer step vectors, N = outward normal (integer)
  constructor(o, U, V, N) { this.o = o; this.U = U; this.V = V; this.N = N; }
  w(u, v, d = 0) {
    const o = this.o, U = this.U, V = this.V, N = this.N;
    return [o[0] + U[0] * u + V[0] * v + N[0] * d, o[1] + U[1] * u + V[1] * v + N[1] * d, o[2] + U[2] * u + V[2] * v + N[2] * d];
  }
  dot(u, v, c, d = 0) { const p = this.w(u, v, d); put(p[0], p[1], p[2], c); }
  rect(u, v, w, h, c, d = 0, depth = 1) {
    for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) for (let k = 0; k < depth; k++) this.dot(u + a, v + b, typeof c === 'function' ? c(a, b) : c, d + k);
  }
  outline(u, v, w, h, c, d = 0) {
    for (let a = 0; a < w; a++) { this.dot(u + a, v, c, d); this.dot(u + a, v + h - 1, c, d); }
    for (let b = 1; b < h - 1; b++) { this.dot(u, v + b, c, d); this.dot(u + w - 1, v + b, c, d); }
  }
  line(u0, v0, u1, v1, c, d = 0) {
    const n = Math.max(Math.abs(u1 - u0), Math.abs(v1 - v0), 1);
    for (let i = 0; i <= n; i++) this.dot(Math.round(u0 + ((u1 - u0) * i) / n), Math.round(v0 + ((v1 - v0) * i) / n), c, d);
  }
  disc(u, v, r, c, d = 0) {
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r + r * 0.7) this.dot(u + a, v + b, c, d);
  }
  discf(u, v, r, fn, d = 0, depth = 1) {
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      const q = Math.sqrt(a * a + b * b);
      if (q <= r + 0.2) for (let k = 0; k < depth; k++) this.dot(u + a, v + b, fn(a, b, q), d + k);
    }
  }
  ring(u, v, r, c, d = 0) {
    for (let a = -r - 1; a <= r + 1; a++) for (let b = -r - 1; b <= r + 1; b++) {
      const q = Math.sqrt(a * a + b * b);
      if (q <= r + 0.5 && q >= r - 0.6) this.dot(u + a, v + b, c, d);
    }
  }
  arrow(u0, v0, u1, v1, c, d = 0, head = 3) {
    this.line(u0, v0, u1, v1, c, d);
    const ang = Math.atan2(v1 - v0, u1 - u0);
    for (const s of [-1, 1]) this.line(u1, v1, Math.round(u1 - head * Math.cos(ang + s * 0.55)), Math.round(v1 - head * Math.sin(ang + s * 0.55)), c, d);
  }
  scribble(u, v, len, c, d = 0, seed = 1) {
    const r = rng(seed * 977 + len);
    let x = 0;
    while (x < len) {
      const w = 2 + Math.floor(r() * 4);
      for (let i = 0; i < w && x + i < len; i++) this.dot(u + x + i, v + ((i + x) % 3 === 1 ? 1 : 0) * (r() < 0.25 ? 1 : 0), c, d);
      x += w + 1 + Math.floor(r() * 2);
    }
  }
  pixels(u, v, rows, legend, d = 0) {
    for (let r = 0; r < rows.length; r++) for (let k = 0; k < rows[r].length; k++) {
      const ch = rows[r][k];
      if (ch === '.' || ch === ' ') continue;
      const col = legend[ch];
      if (col !== undefined) this.dot(u + k, v + rows.length - 1 - r, col, d);
    }
  }
}

/* ======================================================================== */
/* props                                                                     */
/* ======================================================================== */
// potted plant. kind 'bushy' (many leaves) or 'tall' (trunk with leaves)
function plant(x, z, o = {}) {
  const y = o.y || 0, h = o.h || 26, pot = o.pot ?? K.white, r = rng((o.seed || 3) * 31 + Math.round(x * 3 + z));
  const pr = o.potR || 5.2, ph = o.potH || 8;
  cyl(x, y, z, pr, ph, pot, pr, 0.78 + 0.0);
  cyl(x, y + ph - 1, z, pr * 0.78 + 0.2, 1, C('#3C3128', 'm', 0.08));
  const base = [x, y + ph, z];
  const leafCols = o.leaves || [K.leaf1, K.leaf2, K.leaf3, K.leaf4];
  const n = o.n || (o.kind === 'tall' ? 22 : 18);
  for (let i = 0; i < n; i++) {
    const th = i * 2.399 + r() * 0.5;
    let top, rad;
    if (o.kind === 'tall') { top = base[1] + h * (0.28 + 0.72 * (i / n)); rad = 2.5 + 7.5 * (0.5 + 0.5 * Math.sin(i * 1.7)) * (1 - 0.45 * (i / n)); }
    else { top = base[1] + h * (0.35 + 0.65 * r()); rad = 3 + r() * h * 0.45 * (1.25 - (top - base[1]) / h * 0.7); }
    const cx = x + Math.cos(th) * rad, cz = z + Math.sin(th) * rad;
    const stemFrom = o.kind === 'tall' ? [x, Math.max(base[1], top - 4), z] : [x, base[1] + 1, z];
    cap(stemFrom, [cx, top - 0.5, cz], 0.95, 0.8, leafCols[3]);
    const lf = new Frame([cx, top, cz], rot(Math.PI / 2 - th + (r() - 0.5) * 0.5, -0.5 + r() * 0.6, (r() - 0.5) * 0.7));
    const L = (o.leafL || 4.6) * (0.8 + 0.4 * r());
    sq(lf, [0, 0, L * 0.85], [L * 0.55, 1.05, L], 2, leafCols[Math.floor(r() * 3)]);
  }
}
function cupTakeaway(x, y, z, o = {}) {
  cyl(x, y, z, 2.1, 5.2, o.body ?? K.white, 2.1, 1.22);
  cyl(x, y + 1.7, z, 2.3, 2.2, o.sleeve ?? K.amber, 2.3, 1.1);
  cyl(x, y + 5.2, z, 2.75, 1, K.g2);
  put(Math.floor(x), Math.floor(y + 6.2), Math.floor(z), K.g2);
}
function mug(x, y, z, col = K.white, yaw = 0) {
  cyl(x, y, z, 2.2, 4, col);
  cyl(x, y + 3, z, 1.5, 1, K.coffee);
  const F = frameAt(x, y, z, yaw);
  sq(F, [2.9, 2.0, 0], [0.8, 1.6, 0.8], 99, col);
}
function laptop(x, z, yaw, o = {}) {
  const F = frameAt(x, o.y || 0, z, yaw);
  const y = 0;
  obox(F, [0, y + 0.6, 0], [6.6, 0.6, 4.6], o.col ?? K.metal);
  obox(F, [0, y + 1.3, 0.6], [4.8, 0.2, 2.4], K.metalD);
  const open = o.open ?? -0.2;
  const H = F.child([0, y + 1.2, -4.2], rot(0, open, 0));
  obox(H, [0, 4.6, 0], [6.6, 4.6, 0.95], o.col ?? K.metal);
  sq(H, [0, 4.6, 1.0], [6.0, 4.0, 0.3], 99, o.screen ?? K.litBlue);
  if (o.ui !== false) {
    sq(H, [-2.4, 6.2, 1.25], [2.4, 0.6, 0.2], 99, K.blue);
    sq(H, [2.2, 3.6, 1.25], [2.8, 1.8, 0.2], 99, K.blueL);
    sq(H, [-2.6, 3.0, 1.25], [2.0, 1.4, 0.2], 99, K.amberL);
  }
  ball(H.pt(0, 4.8, -1.1), 1.0, K.glow);
}
function chair(x, z, yaw, col = K.mist, legs = K.g5, o = {}) {
  const F = frameAt(x, 0, z, yaw);
  const sh = o.seat ?? 9;
  sq(F, [0, sh - 0.9, 0], [5.6, 1.0, 5.4], 4, col);
  sq(F, [0, sh + 4.6, -5.1], [5.5, 4.7, 0.9], 4, col);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cap(F.pt(sx * 4.4, 0, sz * 4.2), F.pt(sx * 4.8, sh - 1.7, sz * 4.6), 0.75, 0.75, legs);
}
function stool(x, z, h, col, legs = K.g5) {
  cyl(x, h - 1.6, z, 4.6, 1.6, col);
  for (let k = 0; k < 3; k++) {
    const a = k * 2.094 + 0.4;
    cap([x + Math.cos(a) * 3.2, h - 1.6, z + Math.sin(a) * 3.2], [x + Math.cos(a) * 4.6, 0, z + Math.sin(a) * 4.6], 0.95, 0.95, legs);
  }
}

/*@@PROPS-END@@*/

const SCENES = {};

/* ------------------------------------------------------------------------ */
/* scene 1: whiteboard sprint                                                */
/* ------------------------------------------------------------------------ */
function sticky(B, u, v, col, mark = 0, seed = 1) {
  B.rect(u, v, 8, 8, col, 1);
  B.rect(u, v + 7, 8, 1, C(dark(PAL[col].hex, 0.1), 'm', 0.02), 1);
  if (mark === 1) { B.scribble(u + 1, v + 4, 6, K.g6, 1, seed); B.scribble(u + 1, v + 2, 4, K.g6, 1, seed + 5); }
  else if (mark === 2) { B.disc(u + 4, v + 3, 2, K.blue, 1); }
  else if (mark === 3) { B.line(u + 1, v + 1, u + 6, v + 5, K.g6, 1); B.line(u + 1, v + 5, u + 3, v + 2, K.g6, 1); }
  else if (mark === 4) { B.rect(u + 1, v + 1, 6, 4, K.white, 1); B.rect(u + 2, v + 2, 4, 2, K.amberL, 1); }
}
// a lit floor lamp with a warm shade
function stringLights(xa, xb, z, y, swags) {
  const span = (xb - xa) / swags;
  let prev = null;
  for (let k = 0; k < swags; k++) {
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, x = xa + span * (k + t), yy = y - 6.5 * Math.sin(Math.PI * t);
      const pt = [x, yy, z];
      if (prev) cap(prev, pt, 0.55, 0.55, K.g5);
      prev = pt;
      if (i % 2 === 1 && i < 14) { ball([x, yy - 1.8, z + 0.2], 1.35, K.glow); }
    }
  }
}

SCENES['whiteboard-sprint'] = {
  grid: [-84, -8, -56, 168, 100, 112],
  build() {
    const X0 = -75, W0 = 150, Z0 = -44, D = 76, WH = 80;
    const rug = { cx: -6, cz: -6, rx: 60, rz: 25 };
    platform(X0, Z0, W0, D, (x, y, z) => {
      const e = ((x - rug.cx) / rug.rx) ** 2 + ((z - rug.cz) / rug.rz) ** 2;
      if (e < 1) return e > 0.88 ? K.blueL : K.blueXL;
      return (((x - X0) >> 4) + ((z - Z0) >> 4)) & 1 ? C('#E1E8EA', 'm', 0.02) : K.g1;
    });
    const wall = W(C('#E3E9EB', 'm', 0.015)), wallTop = W(K.g2), skirt = W(K.g3);
    box(X0, 0, Z0, W0, WH, 4, wall);
    box(X0, 0, Z0 + 4, 4, WH, D - 4, W(C('#F0F4F5', 'm', 0.012)));
    box(X0, WH, Z0, W0, 2, 4, wallTop);
    box(X0, WH, Z0 + 4, 4, 2, D - 4, wallTop);
    // pale blue wainscot with a white rail
    const wain = W(C(lite(BR.blue, 0.74), 'm', 0.02)), rail = W(K.white);
    box(X0 + 4, 4, Z0 + 4, W0 - 4, 14, 1, wain); box(X0 + 4, 18, Z0 + 4, W0 - 4, 1, 2, rail);
    box(X0 + 4, 4, Z0 + 5, 1, 14, D - 5, wain); box(X0 + 4, 18, Z0 + 5, 2, 1, D - 5, rail);
    box(X0 + 4, 0, Z0 + 4, W0 - 4, 4, 1, skirt);
    box(X0 + 4, 0, Z0 + 5, 1, 4, D - 5, skirt);

    // whiteboard
    const BX = -52, BY = 22, BW = 104, BH = 44, BZ = Z0 + 4;
    box(BX - 2, BY - 2, BZ, BW + 4, BH + 4, 2, K.g3);
    box(BX, BY, BZ, BW, BH, 2, K.white);
    box(BX + 24, BY - 4, BZ, 56, 2, 4, K.g3);
    [K.blue, K.amber, K.pine, K.ink, K.blueL].forEach((c, i) => box(BX + 31 + i * 6, BY - 2, BZ + 1, 4, 1, 1, c));
    const B = new Plane([BX, BY, BZ + 1], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    // kanban columns
    const cols = [2, 22, 42];
    [K.blue, K.amber, K.pine].forEach((c, i) => B.rect(cols[i], 38, 18, 3, c, 0));
    B.rect(20, 2, 1, 35, K.g3, 0); B.rect(40, 2, 1, 35, K.g3, 0);
    const sky = C('#BFD8E8', 'm', 0.025), mint = C('#C3DDD0', 'm', 0.025), cream = C('#F7E4BE', 'm', 0.02);
    const noteCols = [K.amberL, cream, sky, mint, K.white, K.amberL, sky];
    const rr = rng(11);
    const layout = [[0, 7], [1, 5], [2, 3]];
    let seed = 1;
    for (const [ci, count] of layout) {
      for (let k = 0; k < count; k++) {
        const row = k >> 1, side = k & 1;
        const u = cols[ci] + 1 + side * 9 + (rr() < 0.4 ? 1 : 0), v = 28 - row * 9 + (rr() < 0.4 ? 1 : 0);
        sticky(B, u, v, ci === 0 ? noteCols[(k * 2 + 1) % noteCols.length] : ci === 1 ? noteCols[(k * 3) % noteCols.length] : mint, 1 + (k % 4), seed++);
      }
    }
    // sketches on the right
    const ink = K.g6, bl = K.blue, am = K.amberD;
    B.ring(70, 31, 5, am, 0); B.rect(67, 23, 7, 2, ink, 0); B.rect(68, 21, 5, 1, ink, 0);
    B.line(68, 26, 68, 28, am, 0); B.line(72, 26, 72, 28, am, 0); B.line(69, 28, 72, 28, am, 0);
    [[70, 39, 70, 41], [64, 37, 62, 39], [76, 37, 78, 39], [62, 31, 60, 31], [78, 31, 80, 31]].forEach((l) => B.line(...l, am, 0));
    B.pixels(84, 18, [
      '.....oooo.....',
      '....oXXXXo....',
      '...oXXXXXXo...',
      '...oXXXXXXo...',
      '..oXXXooXXXo..',
      '..oXXoWWoXXo..',
      '..oXXoWWoXXo..',
      '..oXXXooXXXo..',
      '..oXXXXXXXXo..',
      '.boXXXXXXXXob.',
      '.bbooXXXXoobb.',
      '.bb.oXXXXo.bb.',
      '.b..oooooo..b.',
      '......fff.....',
      '......fFf.....',
      '.......f......',
    ], { o: ink, X: K.white, W: K.blueL, b: bl, f: am, F: K.amber }, 0);
    [[80, 38], [100, 36], [82, 22], [101, 24], [96, 40]].forEach(([a, b]) => { B.dot(a, b, am, 0); B.dot(a - 1, b, am, 0); B.dot(a + 1, b, am, 0); B.dot(a, b - 1, am, 0); B.dot(a, b + 1, am, 0); });
    B.outline(64, 6, 11, 8, ink, 0); B.outline(80, 6, 11, 8, ink, 0); B.outline(96, 6, 8, 8, bl, 0);
    B.arrow(75, 10, 80, 10, ink, 0, 2); B.arrow(91, 10, 96, 10, ink, 0, 2);
    B.scribble(66, 10, 7, ink, 0, 3); B.scribble(82, 10, 7, ink, 0, 4);
    B.scribble(4, 33, 13, ink, 0, 8);

    // left wall: a framed picture and a small shelf with a rocket
    const LW = new Plane([X0 + 4, 0, Z0 + 4], [0, 0, 1], [0, 1, 0], [1, 0, 0]);
    // window with a lit sky
    const winU = 8, winV = 28, winW = 40, winH = 40;
    LW.rect(winU - 2, winV - 2, winW + 4, winH + 4, K.white, 0, 2);
    LW.rect(winU, winV, winW, winH, K.sky, 0, 2);
    LW.rect(winU + winW / 2 - 1, winV, 2, winH, K.white, 1, 1); LW.rect(winU, winV + winH / 2 - 1, winW, 2, K.white, 1, 1);
    LW.rect(winU - 3, winV - 4, winW + 6, 2, K.white, 0, 5);
    // shelf with a rocket and books
    LW.rect(56, 30, 18, 2, K.oak, 0, 5);
    LW.rect(58, 32, 2, 8, K.blue, 2, 3); LW.rect(61, 32, 2, 10, K.pine, 2, 3); LW.rect(64, 32, 2, 7, K.amberL, 2, 3);
    cap([X0 + 9, 32, Z0 + 4 + 70], [X0 + 9, 42, Z0 + 4 + 70], 2.0, 1.2, K.white);
    ball([X0 + 9, 43.5, Z0 + 4 + 70], 1.5, K.amber);
    cap([X0 + 9, 32, Z0 + 4 + 70], [X0 + 9, 34.5, Z0 + 4 + 70], 3.2, 2.4, K.blueL);

    // summit poster right of the board, and a skateboard on the floor
    const PO = new Plane([BX + BW + 6, 30, BZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    PO.rect(0, 0, 14, 26, K.white, 0, 2); PO.outline(0, 0, 14, 26, K.g4, 1);
    PO.pixels(1, 1, [
      '............',
      '.....A......',
      '....AAA.....',
      '.A..AAAA....',
      '.AA.AAAAA...',
      '.AAAAAAAAA..',
      '.AAAAAAAAAAA',
      'bbbbbbbbbbbb',
      'bbbbbbbbbbbb',
    ], { A: K.blueL, b: K.blueXL }, 1);
    PO.rect(5, 16, 1, 6, K.g6, 1); PO.rect(6, 19, 4, 3, K.amber, 1);
    PO.disc(8, 13, 2, K.amberL, 1);
    {
      const sk = frameAt(22, 0, 22, 0.45);
      obox(sk, [0, 3.2, 0], [3.8, 0.55, 10.5], K.amber);
      obox(sk, [0, 3.7, 10.2], [3.6, 0.5, 1.2], K.amber); obox(sk, [0, 3.7, -10.2], [3.6, 0.5, 1.2], K.amber);
      for (const zz of [-6.5, 6.5]) for (const xx of [-3, 3]) ball(sk.pt(xx, 1.6, zz), 1.5, K.white);
      obox(sk, [0, 2.4, -6.5], [2.4, 0.4, 0.5], K.g5); obox(sk, [0, 2.4, 6.5], [2.4, 0.4, 0.5], K.g5);
    }
    // beanbag in the front left corner
    {
      const bb = frameAt(-55, 0, 24, 0.5);
      sq(bb, [0, 6.4, 0], [10.5, 6.6, 9.5], 2.3, K.blueL);
      sq(bb, [0, 11.2, 1.0], [6.8, 2.2, 6.2], 2.2, K.blueXL);
      sq(bb, [3.5, 13.4, -3.2], [3.0, 1.0, 2.2], 2.2, K.white);
    }
    // props
    plant(-64, -30, { kind: 'tall', h: 42, pot: K.g1, leafL: 5.6, seed: 5 });
    stringLights(X0 + 6, X0 + W0 - 6, Z0 + 5.5, WH - 3, 3);
    cyl(60, 0, -22, 1.3, 24, K.g5); cyl(60, 0, -22, 7, 1, K.g5); cyl(60, 24, -22, 10, 2, K.white);
    laptop(60, -22, 0.0, { y: 26 });
    cupTakeaway(66, 26, -18);
    stool(66, 6, 16, K.amber);

    // people
    const P1 = person({ x: -42, z: -8, yaw: 1.05, hy: 0.22, kind: 'hoodie', top: K.blue, hair: 'short', hairColor: 'black', skin: 2, glasses: K.amber, mouth: 'smile',
      arms: { l: { w: [-36, 48, -36], point: true, pole: [0, -1, 0], poleW: true } } });
    const P2 = person({ x: -8, z: 10, yaw: 0.75, kind: 'sweater', top: K.pine, hair: 'bun', hairColor: 'auburn', skin: 0, mouth: 'smile', pants: K.g3,
      arms: { l: { hand: [7.5, 26.5, 8.5], pole: [0.5, -1, -0.2] }, r: { hand: [-7.5, 17, 5] } } });
    cupTakeaway(P2.hands[0][0], P2.hands[0][1] - 2.8, P2.hands[0][2]);
    const P3 = person({ x: 18, z: -26, yaw: Math.PI - 0.3, kind: 'hoodie', top: K.g7, hair: 'beanie', hairColor: 'black', hat: K.amber, hat2: K.amberL, skin: 4, mouth: 'smile',
      arms: { r: { w: [27, 44, -37], pole: [0, -1, 0], poleW: true } } });
    sticky(B, 74, 18, K.amberL, 1, 40);
    const P4 = person({ x: 50, z: 2, yaw: -0.3, kind: 'hoodie', top: K.mist, hair: 'curly', hairColor: 'brown', skin: 3, pants: K.blueD, mouth: 'laugh',
      arms: { l: { hand: [-5.5, 23.5, 6.5], pole: [0, -1, 0.2] }, r: { hand: [5.5, 21.5, 7.5], pole: [0, -1, 0.2] } } });
    return { az: 25, el: 25, fov: 22, fit: [0.95, 0.92], footprint: [X0, Z0, W0, D], shadowDrop: 14, shadowOpacity: 0.3 };
  },
};

/* ------------------------------------------------------------------------ */
/* scene 2: founders table (bright loft)                                      */
/* ------------------------------------------------------------------------ */
function notebook(x, y, z, yaw, col) {
  const F = frameAt(x, y, z, yaw);
  obox(F, [0, 0.6, 0], [4.6, 0.6, 6], col);
  obox(F, [0, 0.9, -5.4], [4.3, 0.3, 0.5], K.white);
  cap(F.pt(-1.5, 1.6, 3.8), F.pt(1.5, 1.6, -1.8), 0.5, 0.5, K.amber);
}
// a sleepy voxel dog, lying down with its head up. yaw 0 looks toward +z
function dog(x, z, yaw, o = {}) {
  const F = frameAt(x, 0, z, yaw);
  const fur = o.fur ?? K.amberXL, ear = o.ear ?? K.amber, scarf = o.scarf ?? K.blue;
  sq(F, [0, 4.2, -0.5], [5.4, 4.4, 8.2], 2.6, fur);
  sq(F, [0, 5.6, 6.2], [4.5, 4.7, 4.3], 2.4, fur);
  sq(F, [0, 8.4, 10.4], [4.0, 3.7, 3.8], 2.6, fur);
  sq(F, [0, 6.9, 13.8], [2.2, 1.8, 2.5], 2.6, K.white);
  ball(F.pt(0, 7.7, 16.1), 1.0, K.ink);
  for (const s of [-1, 1]) {
    sq(F, [s * 3.5, 11.6, 9.6], [1.3, 2.9, 1.7], 2.2, ear);
    ball(F.pt(s * 2.1, 9.4, 13.4), 0.85, K.eye);
    cap(F.pt(s * 2.7, 1.8, 5), F.pt(s * 2.7, 1.7, 12), 1.8, 1.6, fur);
    ell(F.pt(s * 4.6, 2.7, -3.2), [2.2, 2.6, 3.8], fur);
  }
  sq(F, [0, 6.5, 7.6], [5.0, 2.3, 1.5], 2.4, scarf);
  sq(F, [1.6, 7.9, -1.5], [3.2, 1.3, 4.2], 2, ear);
  cap(F.pt(0, 4.6, -8), F.pt(2.4, 6.6, -12), 1.4, 1.0, fur);
}
function sparkle(x, y, z) {
  put(x, y, z, K.glowL);
  for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) put(x + a, y + b, z + c, K.glow);
}
function brickFn(u, v) {
  const row = Math.floor(v / 4), off = (row & 1) * 5, uu = u + off;
  if (v % 4 === 3 || uu % 11 === 10) return C('#C9D2D5', 'w', 0.02);
  const h = hash3(Math.floor(uu / 11), row, 7);
  return h < 0.33 ? C('#F4F6F7', 'w', 0.03) : h < 0.66 ? C('#ECF0F1', 'w', 0.03) : C('#E3E9EB', 'w', 0.03);
}

SCENES['founders-table'] = {
  grid: [-84, -8, -56, 168, 106, 108],
  build() {
    const X0 = -66, W0 = 132, Z0 = -44, D = 64, WH = 70;
    const rug = { x0: -52, x1: 52, z0: -30, z1: 14 };
    platform(X0, Z0, W0, D, (x, y, z) => {
      if (x >= rug.x0 && x < rug.x1 && z >= rug.z0 && z < rug.z1) {
        const edge = x < rug.x0 + 2 || x >= rug.x1 - 2 || z < rug.z0 + 2 || z >= rug.z1 - 2;
        return edge ? K.blueL : (((x >> 2) + (z >> 2)) & 1 ? K.blueXL : C('#B9D2E2', 'm', 0.02));
      }
      return (((x - X0) / 20 | 0) + ((z - Z0) / 20 | 0)) & 1 ? C('#E1E8EA', 'm', 0.015) : C('#E9EEEF', 'm', 0.015);
    });
    const wall = W(C('#EEF2F3', 'm', 0.012));
    box(X0, 0, Z0, W0, WH, 4, wall);
    box(X0, 0, Z0 + 4, 4, WH, D - 4, wall);
    box(X0, WH - 3, Z0, W0, 3, 7, W(K.oak));
    box(X0, WH - 3, Z0 + 7, 4, 3, D - 7, W(K.oak));
    box(X0, WH, Z0, W0, 1, 7, W(K.oakL)); box(X0, WH, Z0 + 7, 4, 1, D - 7, W(K.oakL));
    box(X0 + 4, 0, Z0 + 4, W0 - 4, 4, 1, W(K.g2));
    // brick wall on the left
    const LW = new Plane([X0 + 4, 0, Z0 + 4], [0, 0, 1], [0, 1, 0], [1, 0, 0]);
    LW.rect(0, 0, D - 4, WH - 3, (a, b) => brickFn(a, b), -1, 1);
    LW.rect(0, 0, D - 4, 4, W(K.g3), 0, 1);
    // back wall: three steel windows, one behind each founder
    const BW = new Plane([X0, 0, Z0 + 4], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    [-28, 0, 28].forEach((cx, wi) => {
      const u0 = cx - 12 - X0, w = 24, v0 = 24, h = 40;
      const wcol = (a, b) => { const t = b / h; return C(t < 0.5 ? mixHex('#F1F8FB', '#D2E6F2', t / 0.5) : mixHex('#D2E6F2', '#B5D3E8', (t - 0.5) / 0.5), 'l', 0); };
      BW.rect(u0, v0, w, h, K.air, -4, 4);
      BW.rect(u0, v0, w, h, wcol, -3, 1);
      const rr = rng(40 + wi);
      let a = 0;
      while (a < w) {
        const bw = 4 + Math.floor(rr() * 5), bh = 5 + Math.floor(rr() * 14);
        BW.rect(u0 + a, v0, Math.min(bw, w - a), bh, C(mixHex('#B7CFDF', '#9DBBD0', rr()), 'l', 0), -2, 1);
        for (let k = 3; k < bh - 2; k += 4) for (let q = 1; q < bw - 1; q += 3) if (rr() < 0.55) BW.dot(u0 + a + q, v0 + k, C('#E3EFF6', 'l', 0), -1);
        a += bw + 1 + Math.floor(rr() * 2);
      }
      BW.rect(u0 + 3 + wi * 5, v0 + h - 12, 9, 2, K.lit, -1, 1); BW.rect(u0 + 6 + wi * 5, v0 + h - 10, 8, 2, K.lit, -1, 1);
      const st = W(K.g6);
      BW.rect(u0 - 2, v0 - 2, w + 4, 2, st, -2, 2); BW.rect(u0 - 2, v0 + h, w + 4, 2, st, -2, 2);
      BW.rect(u0 - 2, v0, 2, h, st, -2, 2); BW.rect(u0 + w, v0, 2, h, st, -2, 2);
      for (const f of [0.5, 0.78]) BW.rect(u0, v0 + Math.round(h * f), w, 1, st, -2, 2);
      BW.rect(u0 - 4, v0 - 4, w + 8, 2, W(K.oak), 0, 3);
    });

    // long oak table
    const T = { x0: -42, z0: -16, w: 84, d: 22, y: 17 };
    const wood = (x, y, z) => ((z - T.z0) % 6 === 0 ? K.oakD : hash3(x >> 3, 3, z) < 0.5 ? K.oak : K.oakL);
    box(T.x0, T.y, T.z0, T.w, 3, T.d, wood);
    for (const lx of [T.x0 + 5, T.x0 + T.w - 9]) { box(lx, 0, T.z0 + 3, 4, T.y, T.d - 6, K.oakD); box(lx - 1, 0, T.z0 + 3, 6, 1, T.d - 6, K.g6); }
    box(T.x0 + 9, 8, T.z0 + T.d / 2 - 1, T.w - 18, 2, 2, K.g5);

    // chairs
    chair(-28, -22, 0, K.mist, K.g5); chair(0, -22, 0, K.blueL, K.g5); chair(28, -22, 0, K.mist, K.g5);
    chair(-52, -5, Math.PI / 2, K.pineL, K.g5);

    // table things
    const y0 = T.y + 3;
    laptop(-28, -6, Math.PI, { y: y0 });
    laptop(2, -5, Math.PI, { y: y0 });
    laptop(27, -6, Math.PI, { y: y0 });
    laptop(-37, -3, -Math.PI / 2, { y: y0 });
    mug(-15, y0, -2, K.white, 0.4); mug(14, y0, 0, K.amber, 2.2); mug(38, y0, 0, K.white, 0); mug(16, y0, -11, K.blueXL, 1);
    notebook(-8, y0, 0, 0, K.blue); notebook(36, y0, -8, 0, K.pine);
    plant(-14, -4, { y: y0, h: 7, potR: 2.8, potH: 4, leafL: 3, n: 10, pot: K.white, seed: 9 });
    cyl(-22, y0, 1, 2.4, 7, K.blueXL); cyl(-22, y0 + 7, 1, 1.2, 2, K.blueXL);
    cyl(10, y0, 3, 5.4, 1, K.white); ell([8.5, y0 + 2, 3], [2.6, 1.6, 1.8], K.amberL); ell([12.2, y0 + 2, 4], [2.4, 1.5, 1.7], K.amber); ell([10.3, y0 + 3.4, 2.2], [2.3, 1.4, 1.6], K.amberL);

    // pendant cords from the header beam
    for (const [px, py] of [[-14, 54], [14, 54], [0, 58]]) { cap([px, WH - 3, Z0 + 3.5], [px, py + 3, Z0 + 3.5], 0.95, 0.95, K.g6); sq(IDF, [px, py + 2.2, Z0 + 3.5], [4.4, 2.8, 4.4], 3, K.white); ball([px, py - 0.6, Z0 + 3.5], 2.6, K.glow); }

    // room things
    plant(57, -36, { kind: 'tall', h: 42, n: 32, pot: K.white, leafL: 5.8, seed: 12, potR: 5.6, potH: 9 });
    dog(-14, 9, 0.75);
    // low shelf under the brick wall
    box(X0 + 4, 0, 6, 10, 12, 26, K.oakD); box(X0 + 4, 12, 6, 11, 2, 27, K.oak);
    box(X0 + 6, 14, 10, 5, 9, 3, K.blue); box(X0 + 6, 14, 14, 5, 11, 3, K.amberL); box(X0 + 6, 14, 18, 5, 7, 3, K.pine);
    cyl(X0 + 9, 14, 26, 3.2, 7, K.white); ball([X0 + 9, 22, 26], 3.4, K.leaf2);

    // founders
    const F1 = person({ x: -28, z: -22.6, yaw: 0.12, seat: 9, lean: 0.08, kind: 'hoodie', top: K.blue, hair: 'short', hairColor: 'black', skin: 2, mouth: 'open', brows: true, browLift: 1,
      arms: { l: { hand: [12, 36, 9], pole: [0.6, -1, -0.3] }, r: { hand: [-9, 22.4, 13] } } });
    const F2 = person({ x: 0, z: -22.6, yaw: -0.1, seat: 9, lean: -0.05, hp: -0.12, kind: 'sweater', top: K.pine, hair: 'bun', hairColor: 'auburn', skin: 0, eyes: 'happy', mouth: 'laugh', glasses: K.amber, trim: K.pineL,
      arms: { l: { hand: [5, 24.5, 12], pole: [0.2, -1, -0.5] }, r: { hand: [-5.5, 24.5, 12.5], pole: [-0.2, -1, -0.5] } } });
    mug((F2.hands[0][0] + F2.hands[1][0]) / 2, F2.hands[0][1] - 3.2, F2.hands[0][2] + 0.5, K.white, 0);
    const F3 = person({ x: 28, z: -22.6, yaw: 0.18, seat: 9, lean: 0.12, kind: 'hoodie', top: K.mist, hair: 'curly', hairColor: 'brown', skin: 3, pants: K.blueD, mouth: 'open', brows: true,
      arms: { l: { hand: [10, 22.8, 16], point: true, pole: [0.3, -1, -0.2] }, r: { hand: [-12, 31, 10], pole: [-0.5, -1, -0.3] } } });
    const F4 = person({ x: -52, z: -5, yaw: 1.28, seat: 9, lean: 0.1, hy: -0.1, kind: 'hoodie', top: K.g7, hair: 'long', hairColor: 'black', skin: 1, mouth: 'smile', brows: true,
      arms: { l: { hand: [8, 31, 11], pole: [0.3, -1, -0.3] }, r: { hand: [-8, 22.4, 12] } } });
    sparkle(-14, 52, -12); sparkle(15, 57, -10); sparkle(-42, 50, -6); sparkle(40, 52, -8);
    return { az: 18, el: 29, fov: 22, fit: [0.95, 0.92], footprint: [X0, Z0, W0, D], shadowDrop: 14, shadowOpacity: 0.3 };
  },
};

/* ------------------------------------------------------------------------ */
/* scene 3: pitch day                                                         */
/* ------------------------------------------------------------------------ */
function curtain(x0, x1, y0, y1, z0, cols) {
  for (let x = x0; x < x1; x++) {
    const f = Math.sin(x * 0.72 + 0.4);
    const thick = 2 + Math.round(1.5 + 1.5 * f);
    const col = f > 0.35 ? cols[0] : f < -0.35 ? cols[2] : cols[1];
    for (let z = z0; z < z0 + thick; z++) for (let y = y0; y < y1; y++) put(x, y, z, col);
  }
}

SCENES['pitch-day'] = {
  grid: [-84, -8, -58, 168, 106, 108],
  build() {
    const X0 = -70, W0 = 140, Z0 = -46, D = 68, WH = 74;
    platform(X0, Z0, W0, D, (x, y, z) => {
      if (x >= -14 && x < 14 && z >= -14) return (x < -12 || x >= 12) ? K.blueL : K.blueXL;
      return (((x - X0) / 20 | 0) + ((z - Z0) / 20 | 0)) & 1 ? C('#E1E8EA', 'm', 0.015) : C('#E9EEEF', 'm', 0.015);
    });
    const wall = W(C('#E6ECEE', 'm', 0.012));
    box(X0, 0, Z0, W0, WH, 4, wall);
    box(X0, 0, Z0 + 4, 4, WH, D - 4, W(C('#F0F4F5', 'm', 0.012)));
    box(X0, WH, Z0, W0, 2, 4, W(K.g2)); box(X0, WH, Z0 + 4, 4, 2, D - 4, W(K.g2));
    box(X0 + 4, 0, Z0 + 4, W0 - 4, 4, 1, W(K.g3)); box(X0 + 4, 0, Z0 + 5, 1, 4, D - 5, W(K.g3));

    // stage riser in light oak, with a step
    const ST = { z0: Z0 + 4, d: 28, h: 7 };
    box(X0 + 4, 0, ST.z0, W0 - 4, ST.h, ST.d, (x, y, z) => (y === ST.h - 1 ? ((x + 3) % 8 === 0 ? K.oakD : hash3(x >> 3, 5, 0) < 0.5 ? K.oak : K.oakL) : K.oakD));
    box(-12, 0, ST.z0 + ST.d, 24, 3, 4, (x, y, z) => (y === 2 ? K.oakL : K.oakD));
    // curtains in Shadow Pine
    curtain(X0 + 4, X0 + 22, ST.h, WH, Z0 + 4, [K.pineL, K.pine, K.pineD]);
    curtain(X0 + W0 - 24, X0 + W0, ST.h, WH, Z0 + 4, [K.pineL, K.pine, K.pineD]);
    // projection screen with a growth chart made of cubes
    const SX0 = -44, SW = 76, SV0 = 26, SH = 42, SZ = Z0 + 4;
    const S = new Plane([SX0, SV0, SZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    S.rect(-2, -2, SW + 4, SH + 4, K.g6, 0, 3);
    S.rect(0, 0, SW, SH, K.air, 2, 1);
    S.rect(0, 0, SW, SH, K.lit, 1, 1);
    for (let v = 8; v < SH - 2; v += 8) S.rect(6, v + 3, SW - 12, 1, C('#E3EBEF', 'l', 0), 1, 1);
    S.rect(5, 2, 1, SH - 6, K.g4, 1, 1); S.rect(5, 2, SW - 10, 1, K.g4, 1, 1);
    const colsB = [K.blueXL, K.blueXL, K.blueL, K.blueL, K.blue, K.blue, K.blue];
    const heights = [1, 1, 2, 2, 3, 4, 5];
    heights.forEach((hh, k) => {
      for (let j = 0; j < hh; j++) {
        const last = k === heights.length - 1 && j === hh - 1;
        const u = 10 + k * 9, v = 4 + j * 6;
        for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) for (let d = 2; d < 7; d++) S.dot(u + a, v + b, last ? K.glow : colsB[k], d);
      }
    });
    // trend arrow of small amber dots above the columns
    const dots = [[12, 14], [22, 17], [31, 22], [40, 26], [49, 32], [58, 38]];
    dots.forEach(([u, v]) => S.rect(u, v, 2, 2, K.amber, 2, 2));
    S.arrow(60, 37, 70, 41, K.amber, 2, 3); S.arrow(60, 38, 70, 42, K.amber, 3, 3);

    // projector on a little table, audience chairs
    // a plant in the front corner
    plant(60, 13, { kind: 'bushy', h: 20, pot: K.g2, leafL: 4.4, seed: 14, potR: 5, potH: 8 });
    const rows = [
      { z: 9, xs: [-36, -4, 28], cols: [K.blueL, K.white, K.mist] },
      { z: -5, xs: [-20, 12], cols: [K.mist, K.blueL] },
    ];
    rows.forEach((r) => r.xs.forEach((x, i) => chair(x, r.z, Math.PI, r.cols[i], K.g5)));
    plant(-58, -22, { y: ST.h, kind: 'tall', h: 30, pot: K.white, leafL: 5, seed: 17, potR: 5, potH: 8 });
    // wall art on the left wall
    const LWp = new Plane([X0 + 4, 0, Z0 + 4], [0, 0, 1], [0, 1, 0], [1, 0, 0]);
    [[10, 38, K.blue], [32, 38, K.amber], [54, 38, K.pine]].forEach(([u, v, c], i) => {
      LWp.rect(u, v, 16, 20, K.white, 0, 1); LWp.outline(u, v, 16, 20, K.g4, 1);
      LWp.disc(u + 8, v + 12, 4 + (i === 1 ? 1 : 0), c, 1); LWp.rect(u + 3, v + 4, 10, 2, K.g3, 1); LWp.rect(u + 3, v + 7, 6, 1, K.g3, 1);
    });
    sparkle(33, 70, -33); sparkle(39, 58, -32); sparkle(25, 74, -33);
    // presenter
    const PR = person({ x: 44, y: ST.h, z: -28, yaw: -0.5, kind: 'sweater', top: K.g1, trim: K.g3, hair: 'pony', hairColor: 'black', skin: 3, pants: K.blue, scarf: K.amber, mouth: 'open', brows: true,
      arms: { r: { w: [24, 58, -38], point: true, pole: [0, -1, 0], poleW: true }, l: { hand: [9, 24, 9], pole: [0.6, -1, -0.2] } } });
    cap([PR.hands[0][0], PR.hands[0][1], PR.hands[0][2]], [PR.hands[0][0] + 1.5, PR.hands[0][1] + 1, PR.hands[0][2] + 3], 0.8, 0.8, K.g6);

    // an applauding colleague at the front left, facing us
    person({ x: -54, z: 8, yaw: 0.42, kind: 'hoodie', top: K.amber, trim: K.amberL, hair: 'bob', hairColor: 'auburn', skin: 1, pants: K.g6, eyes: 'happy', mouth: 'laugh',
      arms: { l: { hand: [2.4, 28, 10], pole: [0.8, -1, -0.2] }, r: { hand: [-2.4, 27.5, 10], pole: [-0.8, -1, -0.2] } } });
    // audience, seen from behind
    const A = (o) => person({ y: 0, yaw: Math.PI, seat: 9, ...o });
    A({ x: -36, z: 9.6, lean: 0.04, kind: 'hoodie', top: K.blue, hair: 'short', hairColor: 'black', skin: 2, hy: -0.35, mouth: 'smile', arms: { r: { hand: [-9, 40, 2], pole: [0, -1, -0.2] }, l: { hand: [8, 22.4, 10] } } });
    A({ x: -4, z: 9.6, lean: 0.05, kind: 'sweater', top: K.mist, hair: 'long', hairColor: 'brown', skin: 0, hy: -1.25, hp: 0.05, eyes: 'happy', mouth: 'laugh', arms: { r: { hand: [-7, 22.5, 11] }, l: { hand: [7, 22.5, 11] } } });
    A({ x: 28, z: 9.6, lean: -0.12, kind: 'hoodie', top: K.pine, hair: 'beanie', hairColor: 'black', hat: K.amber, hat2: K.amberL, skin: 4, hy: 0.75, mouth: 'smile', arms: { l: { hand: [7, 36, -4], pole: [1, 0, -0.2] }, r: { hand: [-7, 36, -4], pole: [-1, 0, -0.2] } } });
    A({ x: -20, z: -4.4, lean: 0.03, kind: 'sweater', top: K.blueL, hair: 'bun', hairColor: 'blond', skin: 1, hy: 0.15, mouth: 'smile', arms: { l: { hand: [6, 28, 8], pole: [0.4, -1, -0.2] }, r: { hand: [-7, 22.5, 11] } } });
    A({ x: 12, z: -4.4, lean: 0.05, kind: 'hoodie', top: K.g6, hair: 'curly', hairColor: 'black', skin: 3, glasses: K.amber, hy: -0.5, mouth: 'open', arms: { l: { hand: [7, 22.5, 11] }, r: { hand: [-7, 22.5, 11] } } });
    return { az: 20, el: 28, fov: 22, fit: [0.95, 0.92], footprint: [X0, Z0, W0, D], shadowDrop: 14, shadowOpacity: 0.3 };
  },
};

/* ------------------------------------------------------------------------ */
/* scene 4: partners handshake                                                */
/* ------------------------------------------------------------------------ */
// ball-and-stick molecule on a little base. o = base centre, atoms in local coordinates
function moleculeModel(ox, oy, oz) {
  cyl(ox, oy, oz, 4.8, 1.4, K.white); cyl(ox, oy + 1.4, oz, 3.4, 0.8, K.g2);
  const A = [
    [0, 17, 0, 2.3, K.white], [0, 27, 0, 3.5, K.glow], [-7.6, 33, 2, 2.9, K.blue],
    [7.6, 34, -2, 2.7, K.pine], [-3.4, 40.5, -4, 2.3, K.mist], [4.2, 41.5, 3, 2.1, K.amberL],
  ];
  const B = [[1, 2], [1, 3], [1, 4], [3, 5]];
  cap([ox, oy + 1, oz], [ox, oy + A[1][1], oz], 0.9, 0.9, K.g3);
  B.forEach(([i, j]) => cap([ox + A[i][0], oy + A[i][1], oz + A[i][2]], [ox + A[j][0], oy + A[j][1], oz + A[j][2]], 0.95, 0.95, K.g3));
  A.forEach(([x, y, z, r, c]) => ball([ox + x, oy + y, oz + z], r, c));
}

SCENES['partners-handshake'] = {
  grid: [-84, -8, -58, 168, 112, 108],
  build() {
    const X0 = -58, W0 = 116, Z0 = -40, D = 56, WH = 74;
    const RC = { cx: 0, cz: 0, r: 30 };
    platform(X0, Z0, W0, D, (x, y, z) => {
      const q = Math.hypot((x - RC.cx), (z - RC.cz) * 1.25);
      if (q < RC.r) return q > RC.r - 3 ? K.blueL : q > RC.r - 6 ? K.blueXL : C('#E3ECF1', 'm', 0.02);
      return (((z - Z0) / 6 | 0) & 1) ? C('#E9D6B3', 'm', 0.03) : C('#ECDCBE', 'm', 0.03);
    });
    const warmWall = W(C('#F4F0E8', 'm', 0.012)), coolWall = W(C('#F0F4F5', 'm', 0.012));
    box(X0, 0, Z0, W0, WH, 4, warmWall);
    box(X0, 0, Z0 + 4, 4, WH, D - 4, coolWall);
    box(X0, WH, Z0, W0, 2, 4, W(K.oakL)); box(X0, WH, Z0 + 4, 4, 2, D - 4, W(K.oakL));
    box(X0 + 4, 0, Z0 + 4, W0 - 4, 4, 1, W(K.oakL)); box(X0 + 4, 0, Z0 + 5, 1, 4, D - 5, W(K.oakL));

    // round window with a warm sky
    const BW = new Plane([X0, 0, Z0 + 4], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const WU = 58, WV = 48, WR = 21;
    BW.discf(WU, WV, WR + 3, () => K.air, -4, 4);
    BW.discf(WU, WV, WR + 3, (a, b, q) => (q > WR + 0.5 ? W(K.oak) : K.air), 0, 2);
    const sky = (a, b, q) => {
      const t = Math.min(1, q / WR);
      let c = mixHex('#FFF8EA', '#F6DDB4', Math.pow(t, 1.4));
      if (b < -9 + 3 * Math.sin(a * 0.22)) c = mixHex('#E9D3AC', '#DBC094', clamp((-b - 9) / 16, 0, 1));
      else if (b < -5 + 4 * Math.sin(a * 0.15 + 2)) c = mixHex('#F0DEC0', '#E2C99C', 0.4);
      const dx = a + 8, dy = b - 7;
      if (dx * dx + dy * dy < 30) c = '#FFFDF4';
      return C(c, 'l', 0);
    };
    BW.discf(WU, WV, WR, sky, -3, 1);
    // left wall: sofa, frames
    const LW = new Plane([X0 + 4, 0, Z0 + 4], [0, 0, 1], [0, 1, 0], [1, 0, 0]);
    [[8, 40, K.blue], [30, 40, K.amber]].forEach(([u, v, c]) => { LW.rect(u, v, 16, 18, K.white, 0, 1); LW.outline(u, v, 16, 18, K.g4, 1); LW.disc(u + 8, v + 9, 4, c, 1); });
    // armchair and side table with a lamp against the left wall
    const ac = frameAt(X0 + 12, 0, -6, 1.5708);
    sq(ac, [0, 5, 0], [8, 3.4, 8], 4, K.blueL); sq(ac, [0, 12, -6.4], [8, 7.5, 2.2], 4, K.blueL); for (const sd of [-1, 1]) sq(ac, [sd * 7.2, 9, 0], [1.8, 3, 7], 4, K.blue);
    sq(ac, [0, 8.6, 0.5], [5.2, 1.5, 5.6], 3, K.amberL);
    cyl(X0 + 12, 0, 12, 5, 1, K.g5); cyl(X0 + 12, 1, 12, 1.1, 14, K.g5); cyl(X0 + 12, 15, 12, 6, 2, K.oak);
    cyl(X0 + 12, 17, 12, 2.6, 1.5, K.white); cap([X0 + 12, 18, 12], [X0 + 12, 24, 12], 0.9, 0.9, K.g6); cyl(X0 + 12, 23, 12, 4.4, 6, K.glow, 4.4, 0.8);
    // plants
    plant(-44, -34, { kind: 'tall', h: 40, n: 28, pot: K.white, leafL: 5.4, seed: 31, potR: 5.6, potH: 9 });
    plant(46, -34, { kind: 'bushy', h: 24, pot: K.g2, leafL: 4.8, seed: 8, potR: 5.4, potH: 9 });
    plant(48, 2, { kind: 'bushy', h: 15, pot: K.amberL, leafL: 3.6, seed: 3, potR: 4.2, potH: 7 });

    // small round table with the molecule
    cyl(0, 0, -3, 6.4, 1, K.g5); cyl(0, 1, -3, 1.7, 17, K.g5); cyl(0, 18, -3, 10.4, 3, K.oakL); cyl(0, 18, -3, 10.4, 1, K.oakD);
    moleculeModel(0, 21, -9);
    mug(-6.5, 21, -4, K.white, 0.5); mug(6.5, 21, -3, K.amberL, 2.6);
    for (const [x, y, z] of [[-12, 60, -6], [12, 64, -6], [-16, 52, -4]]) sparkle(x, y, z);

    // handshake: both on the same line, turned a little toward the camera
    const H = [0.5, 27.6, 5.5], HD = [-1.3, 27.6, 5.9], HF = [2.1, 27.9, 5.2];
    const DOC = person({ x: -13, z: 0, yaw: 0.95, lean: 0.15, hy: -0.28, kind: 'coat', top: K.white, under: K.blue, hair: 'bun', hairColor: 'gray', skin: 1, glasses: K.amber, mouth: 'smile', pants: K.g5, armScale: 1.28,
      arms: { r: { w: HD, pole: [0, -1, 0.4], poleW: true }, l: { hand: [8.5, 20.5, 7], pole: [0.6, -1, -0.2] } } });
    {
      const hl = DOC.hands[0];
      const cf = frameAt(hl[0] + 1.2, hl[1] + 0.8, hl[2] + 2, 0.4);
      obox(cf, [0, 0, 0], [4.4, 6.0, 0.55], K.oak);
      obox(cf, [0, 0, 0.5], [3.8, 5.4, 0.2], K.white);
      obox(cf, [0, 6.3, 0.6], [1.4, 0.7, 0.5], K.g5);
    }
    {
      const c = DOC.chest;
      for (const sd of [-1, 1]) cap(c.pt(sd * 3.6, 14, 3.4), c.pt(sd * 1.4, 4.2, 5.2), 0.75, 0.75, K.g7);
      cap(c.pt(-1.4, 4.2, 5.2), c.pt(1.4, 4.2, 5.2), 0.75, 0.75, K.g7);
      ball(c.pt(0, 3.6, 5.6), 1.5, K.metal);
    }
    const FOU = person({ x: 14.5, z: 0, yaw: -0.95, lean: 0.15, hy: 0.28, kind: 'hoodie', top: K.pine, trim: K.pineL, hair: 'short', hairColor: 'brown', skin: 3, beard: true, mouth: 'laugh', pants: K.g3, lanyard: K.amber, armScale: 1.28,
      arms: { r: { w: HF, pole: [0, -1, -0.4], poleW: true }, l: { hand: [-8.5, 21, 6], pole: [-0.6, -1, -0.2] } } });
    cupTakeaway(FOU.hands[0][0], FOU.hands[0][1] - 2.8, FOU.hands[0][2]);
    // backpack leaning near the founder
    {
      const bf = frameAt(32, 0, 2, -0.7);
      sq(bf, [0, 8.5, 0], [6, 8.5, 3.6], 4, K.blue);
      sq(bf, [0, 5.0, 3.8], [4.4, 3.4, 1.0], 4, K.blueD);
      sq(bf, [0, 13.5, 3.7], [1.2, 0.5, 0.4], 99, K.amber);
      cap(bf.pt(-3.4, 14, 0), bf.pt(-3.8, 4, 3.5), 0.7, 0.7, K.blueD);
    }
    return { az: 6, el: 24, fov: 22, fit: [0.95, 0.92], footprint: [X0, Z0, W0, D], shadowDrop: 14, shadowOpacity: 0.3, keyColor: 0xffefd6 };
  },
};
/*@@SCENES@@*/

/* ======================================================================== */
/* base platform shared by all dioramas                                      */
/* ======================================================================== */
// same colour, but in the matte class that does not cast shadows (walls, floors: lets the key light into the room)
const W = (i) => (i > 0 ? C(PAL[i].hex, 'w', PAL[i].jit) : i);
function platform(x, z, w, d, top) {
  const t = top || K.g1;
  box(x, -1, z, w, 1, d, typeof t === 'function' ? (a, b, c) => W(t(a, b, c)) : W(t));
  const layers = [K.haze, K.mist, K.mist, K.g3, K.g4];
  for (let i = 0; i < layers.length; i++) box(x, -2 - i, z, w, 1, d, W(layers[i]));
}

/* ======================================================================== */
/* rendering: instanced cubes, smooth voxel AO, shadows, camera fitting      */
/* ======================================================================== */
function collectVoxels() {
  const { nx, ny, nz, x0, y0, z0, d } = G;
  const out = { m: [], w: [], s: [], g: [], l: [] };
  const sy = nx, sz = nx * ny;
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      let i = nx * (y + ny * z);
      for (let x = 0; x < nx; x++, i++) {
        const c = d[i];
        if (!c) continue;
        const hidden = x > 0 && x < nx - 1 && y > 0 && y < ny - 1 && z > 0 && z < nz - 1 &&
          d[i - 1] && d[i + 1] && d[i - sy] && d[i + sy] && d[i - sz] && d[i + sz];
        if (hidden) continue;
        out[PAL[c].mat].push(x + x0, y + y0, z + z0, c);
      }
    }
  }
  return out;
}

const VX_DECL = `
varying vec3 vWP;
varying vec3 vWN;
flat varying vec3 vCtr;
uniform highp sampler3D uOcc;
uniform vec3 uGMin;
uniform vec3 uGDim;
uniform float uAOMin;
uniform float uAOdir;
uniform float uSeam;
uniform float uEmit;
uniform float uUnlit;
float vxOcc( ivec3 c ) {
  vec3 f = vec3( c ) - uGMin;
  if ( f.x < 0.0 || f.y < 0.0 || f.z < 0.0 || f.x >= uGDim.x || f.y >= uGDim.y || f.z >= uGDim.z ) return 0.0;
  return texelFetch( uOcc, ivec3( f ), 0 ).r > 0.5 ? 1.0 : 0.0;
}
float vxCorner( float s1, float s2, float c ) { return ( s1 > 0.5 && s2 > 0.5 ) ? 0.0 : ( 3.0 - s1 - s2 - c ) / 3.0; }
`;
const VX_EARLY = `
vec3 vxN = normalize( vWN );
vec3 vxAb = abs( vxN );
ivec3 vxIn = ivec3( round( vxN ) );
ivec3 vxCell = ivec3( floor( vCtr ) );
vec3 vxF = vWP - vec3( vxCell );
ivec3 vxT1 = vxAb.x > 0.5 ? ivec3( 0, 1, 0 ) : ivec3( 1, 0, 0 );
ivec3 vxT2 = vxAb.z > 0.5 ? ivec3( 0, 1, 0 ) : ivec3( 0, 0, 1 );
float vxU = clamp( dot( vxF, vec3( vxT1 ) ), 0.0, 1.0 );
float vxV = clamp( dot( vxF, vec3( vxT2 ) ), 0.0, 1.0 );
ivec3 vxL = vxCell + vxIn;
float vs1 = vxOcc( vxL - vxT1 ), vs2 = vxOcc( vxL + vxT1 ), vt1 = vxOcc( vxL - vxT2 ), vt2 = vxOcc( vxL + vxT2 );
float va00 = vxCorner( vs1, vt1, vxOcc( vxL - vxT1 - vxT2 ) );
float va10 = vxCorner( vs2, vt1, vxOcc( vxL + vxT1 - vxT2 ) );
float va01 = vxCorner( vs1, vt2, vxOcc( vxL - vxT1 + vxT2 ) );
float va11 = vxCorner( vs2, vt2, vxOcc( vxL + vxT1 + vxT2 ) );
float vxAO = mix( mix( va00, va10, vxU ), mix( va01, va11, vxU ), vxV );
float vxEdge = min( min( vxU, 1.0 - vxU ), min( vxV, 1.0 - vxV ) );
diffuseColor.rgb *= mix( 1.0 - uSeam, 1.0, smoothstep( 0.0, 0.1, vxEdge ) );
`;
const VX_LATE = `
float vxAm = mix( uAOMin, 1.0, vxAO );
reflectedLight.indirectDiffuse *= vxAm;
reflectedLight.indirectSpecular *= vxAm;
reflectedLight.directDiffuse *= mix( 1.0, vxAm, uAOdir );
reflectedLight.directSpecular *= mix( 1.0, vxAm, uAOdir );
`;

function voxMaterial(kind, shared) {
  const base = { m: [0.93, 0], w: [0.93, 0], s: [0.36, 0.25], g: [0.6, 0], l: [0.85, 0] }[kind];
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: base[0], metalness: base[1] });
  const u = {
    uOcc: { value: shared.tex }, uGMin: { value: shared.gmin }, uGDim: { value: shared.gdim },
    uAOMin: { value: shared.aoMin }, uAOdir: { value: shared.aoDir }, uSeam: { value: kind === 'm' || kind === 's' || kind === 'w' ? shared.seam : 0 },
    uEmit: { value: kind === 'g' ? 0.95 : kind === 'l' ? 1.0 : 0 }, uUnlit: { value: kind === 'l' ? 1 : 0 },
  };
  mat.customProgramCacheKey = () => 'vox-' + kind;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;\nflat varying vec3 vCtr;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 vxw = vec4( transformed, 1.0 );
        vec4 vxc = vec4( 0.0, 0.0, 0.0, 1.0 );
        #ifdef USE_INSTANCING
          vxw = instanceMatrix * vxw;
          vxc = instanceMatrix * vxc;
        #endif
        vxw = modelMatrix * vxw;
        vxc = modelMatrix * vxc;
        vWP = vxw.xyz; vCtr = vxc.xyz; vWN = normal;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + VX_DECL)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + VX_EARLY)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uEmit;\ndiffuseColor.rgb *= ( 1.0 - uUnlit );')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + VX_LATE);
  };
  return mat;
}

function gradientTexture(w, h, spec) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const lg = g.createLinearGradient(0, 0, w * spec.dx, h * spec.dy);
  spec.stops.forEach(([t, c]) => lg.addColorStop(t, c));
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  const rg = g.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.46, Math.max(w, h) * 0.62);
  rg.addColorStop(0, 'rgba(255,255,255,' + spec.glow + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function blobShadowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  g.filter = 'blur(14px)';
  g.fillStyle = 'rgba(40,62,74,1)';
  g.fillRect(52, 52, 152, 152);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function fitCamera(cam, pts, o) {
  const azr = o.az * D2R, elr = o.el * D2R;
  const dir = new THREE.Vector3(Math.sin(azr) * Math.cos(elr), Math.sin(elr), Math.cos(azr) * Math.cos(elr));
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < pts.length; i += 3) for (let a = 0; a < 3; a++) { if (pts[i + a] < mn[a]) mn[a] = pts[i + a]; if (pts[i + a] > mx[a]) mx[a] = pts[i + a]; }
  const target = new THREE.Vector3((mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2);
  const diag = Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
  const tf = Math.tan(o.fov * D2R / 2);
  let dist = (diag / 2) / tf * 1.6;
  cam.fov = o.fov; cam.aspect = o.aspect; cam.near = 1; cam.far = dist * 4 + 800; cam.updateProjectionMatrix();
  const v = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  for (let it = 0; it < 14; it++) {
    cam.position.copy(target).addScaledVector(dir, dist);
    cam.lookAt(target); cam.updateMatrixWorld();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < pts.length; i += 3) {
      v.set(pts[i], pts[i + 1], pts[i + 2]).project(cam);
      if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y;
    }
    const ex = (x1 - x0) / 2, ey = (y1 - y0) / 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    dist *= Math.max(ex / o.fit[0], ey / o.fit[1]);
    const half = tf * dist;
    right.setFromMatrixColumn(cam.matrixWorld, 0); up.setFromMatrixColumn(cam.matrixWorld, 1);
    target.addScaledVector(right, cx * half * o.aspect).addScaledVector(up, cy * half);
  }
  dist /= o.zoom;
  const half = tf * dist;
  right.setFromMatrixColumn(cam.matrixWorld, 0); up.setFromMatrixColumn(cam.matrixWorld, 1);
  target.addScaledVector(right, o.fx * half * o.aspect).addScaledVector(up, o.fy * half);
  cam.position.copy(target).addScaledVector(dir, dist);
  cam.lookAt(target); cam.updateMatrixWorld();
  cam.far = dist * 4 + 800; cam.updateProjectionMatrix();
  return { target, dist };
}

async function main() {
  const t0 = performance.now();
  const def = SCENES[SCENE];
  if (!def) throw new Error('unknown scene ' + SCENE);
  newGrid(...def.grid);
  const meta = def.build() || {};
  const tBuild = performance.now() - t0;

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(SS);
  renderer.setSize(OUT_W, OUT_H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();

  // occupancy texture for ambient occlusion
  const occ = new Uint8Array(G.d.length);
  for (let i = 0; i < occ.length; i++) occ[i] = G.d[i] ? 255 : 0;
  const tex = new THREE.Data3DTexture(occ, G.nx, G.ny, G.nz);
  tex.format = THREE.RedFormat; tex.type = THREE.UnsignedByteType;
  tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.unpackAlignment = 1; tex.needsUpdate = true;
  const shared = {
    tex, gmin: new THREE.Vector3(G.x0, G.y0, G.z0), gdim: new THREE.Vector3(G.nx, G.ny, G.nz),
    aoMin: meta.aoMin ?? 0.36, aoDir: meta.aoDir ?? 0.4, seam: meta.seam ?? 0.05,
  };

  const lists = collectVoxels();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  let total = 0;
  const pts = [];
  for (const kind of ['m', 'w', 's', 'g', 'l']) {
    const L = lists[kind];
    const n = L.length / 4;
    if (!n) continue;
    const mesh = new THREE.InstancedMesh(geo, voxMaterial(kind, shared), n);
    for (let i = 0; i < n; i++) {
      const x = L[i * 4], y = L[i * 4 + 1], z = L[i * 4 + 2], p = PAL[L[i * 4 + 3]];
      m4.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
      mesh.setMatrixAt(i, m4);
      col.copy(p.col).multiplyScalar(1 + (hash3(x, y, z) - 0.5) * 2 * p.jit);
      mesh.setColorAt(i, col);
      if (i % 2 === 0 || kind !== 'm') pts.push(x + 0.5, y + 0.5, z + 0.5);
    }
    mesh.castShadow = kind !== 'w'; mesh.receiveShadow = true; mesh.frustumCulled = false;
    scene.add(mesh);
    total += n;
  }

  // background and floating ground shadow
  const bgW = Math.round(OUT_W * SS), bgH = Math.round(OUT_H * SS);
  scene.background = gradientTexture(Math.min(bgW, 1600), Math.min(bgH, 1067), meta.bg || { dx: 0.55, dy: 1, glow: 0.7, stops: [[0, '#FFFFFF'], [0.5, '#F5F8F9'], [1, '#E7EEF0']] });
  const fp = meta.footprint || [G.x0, G.z0, G.nx, G.nz];
  const shadowMat = new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false, opacity: meta.shadowOpacity ?? 0.34 });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(fp[2] * 1.3, fp[3] * 1.3), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(fp[0] + fp[2] / 2 + 4, -(meta.shadowDrop ?? 18), fp[1] + fp[3] / 2 + 6);
  scene.add(shadow);
  pts.push(shadow.position.x, shadow.position.y, shadow.position.z);

  const cam = new THREE.PerspectiveCamera(22, OUT_W / OUT_H, 1, 4000);
  const fit = fitCamera(cam, new Float32Array(pts), {
    az: qn('az', meta.az ?? 35), el: qn('el', meta.el ?? 28), fov: qn('fov', meta.fov ?? 22), aspect: OUT_W / OUT_H,
    fit: meta.fit || [0.93, 0.9], zoom: qn('zoom', 1), fx: qn('fx', 0), fy: qn('fy', 0),
  });

  // lights
  const centre = new THREE.Vector3((G.x0 + G.nx / 2), 20, (G.z0 + G.nz / 2));
  const radius = Math.hypot(G.nx, G.nz) * 0.55 + 20;
  scene.add(new THREE.HemisphereLight(meta.sky ?? 0xf4f9ff, meta.ground ?? 0xdde5e8, qn('hemi', meta.hemi ?? 1.55)));
  // soft shadows: several key lights with slightly different directions share the intensity (an area-light look)
  const kd = new THREE.Vector3(...(meta.keyDir || [-0.62, 1, 0.5])).normalize();
  const nKey = qn('ks', meta.keySamples ?? 3);
  const spread = qn('kspread', meta.keySpread ?? 0.085);
  const offs = nKey === 1 ? [[0, 0]] : nKey === 2 ? [[-1, -0.6], [1, 0.6]] : [[0, 0], [-1, 0.7], [1, -0.7]];
  const side = new THREE.Vector3().crossVectors(kd, new THREE.Vector3(0, 1, 0)).normalize();
  const fwd = new THREE.Vector3().crossVectors(side, kd).normalize();
  const smSize = qn('sm', meta.shadowMap ?? 1280);
  for (const [ox, oz] of offs) {
    const l = new THREE.DirectionalLight(meta.keyColor ?? 0xfff2e2, qn('key', meta.key ?? 2.65) / nKey);
    const dir = kd.clone().addScaledVector(side, ox * spread).addScaledVector(fwd, oz * spread).normalize();
    l.position.copy(centre).addScaledVector(dir, radius * 2);
    l.target.position.copy(centre);
    l.castShadow = true;
    l.shadow.mapSize.set(smSize, smSize);
    const sc = l.shadow.camera;
    sc.left = -radius; sc.right = radius; sc.top = radius; sc.bottom = -radius; sc.near = 1; sc.far = radius * 5;
    l.shadow.bias = -0.0006; l.shadow.normalBias = 0.35;
    scene.add(l, l.target);
  }
  const fill = new THREE.DirectionalLight(meta.fillColor ?? 0xdfeeff, qn('fill', meta.fill ?? 1.05));
  fill.position.copy(centre).add(new THREE.Vector3(0.8, 0.35, 0.9).multiplyScalar(radius));
  scene.add(fill);

  renderer.render(scene, cam);
  window.__png = () => canvas.toDataURL('image/png');
  window.__stats = { scene: SCENE, voxels: total, buildMs: Math.round(tBuild), totalMs: Math.round(performance.now() - t0), w: canvas.width, h: canvas.height, dist: Math.round(fit.dist) };
  window.__ready = true;
}

main().catch((e) => { console.error(e); window.__fail = String(e && e.stack || e); });
