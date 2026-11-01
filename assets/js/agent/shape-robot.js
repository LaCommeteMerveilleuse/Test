// BlackPhage - mascot robot, variant 1: the soft astronaut-bot (shape slot 2).
// A big egg-rounded head tilted a little, a dark glass visor with two large warm eyes, catch lights and a tiny smile, blue ear modules,
// a glowing antenna bead, a pill body with a blue-framed glowing core, floating hands (one waves hello), a thin hover ring with three
// satellites and a soft thruster. Pure math (no dependency), deterministic from (n, seed), about 0.3 s for n = 59049.
//
// How it is built. The robot is a union of signed-distance parts (shape space: y up, +z toward the camera). The union is voxelized
// on a cubic lattice and only a shell is kept: the skin (every solid voxel that touches empty space, which is watertight from any
// viewpoint) plus backing layers under it (3 layers at n = 59049, 2 at n = 6561). The backing is needed because the engine makes every
// cube breathe by +-0.012, which is more than a one-voxel skin can take without holes. The lattice pitch is calibrated from n
// so that the shell holds a little less than n cubes; the shell is then grown one more layer at a time (invisible backing) until the
// count is exactly n. Details (visor, eyes, seams, panels) are carved or raised by whole voxels in the distance field. The tag of a
// skin voxel comes from feature masks, baked light (key light + glint), ambient occlusion and ordered dithering; backing voxels inherit
// the tag of the skin voxel above them, so a cube that breathes away never shows a hole or a wrong colour.
//
// Returns { pos, tag, cube, extent } as asked, plus two extras: pitch (the lattice pitch) and skin (the number of skin cubes, listed first).
const { abs, sqrt, min, max, sin, cos, floor, ceil, round, PI } = Math;
const BIG = 1e9;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function hash3(i, j, k, s) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177) ^ Math.imul(s, 2246822519);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------- distance primitives
function rbox(x, y, z, bx, by, bz, r) {            // rounded box, half sizes include the rounding radius
  const qx = abs(x) - bx + r, qy = abs(y) - by + r, qz = abs(z) - bz + r;
  const mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0, mz = qz > 0 ? qz : 0;
  const m = qx > qy ? (qx > qz ? qx : qz) : (qy > qz ? qy : qz);
  return sqrt(mx * mx + my * my + mz * mz) + (m < 0 ? m : 0) - r;
}
function rrect(x, y, bx, by, r) {                  // rounded rectangle in 2D, negative inside
  const qx = abs(x) - bx + r, qy = abs(y) - by + r;
  const mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0;
  return sqrt(mx * mx + my * my) + min(max(qx, qy), 0) - r;
}
function rcyl(rad, ax, R, T, rr) {                  // rounded cylinder: radial distance, axial coordinate, radius, half length, edge radius
  const a = rad - R + rr, b = abs(ax) - T + rr;
  const am = a > 0 ? a : 0, bm = b > 0 ? b : 0;
  return sqrt(am * am + bm * bm) + min(max(a, b), 0) - rr;
}
function capsule(x, y, z, ax, ay, az, bx, by, bz, r) {
  const px = x - ax, py = y - ay, pz = z - az, qx = bx - ax, qy = by - ay, qz = bz - az;
  let t = (px * qx + py * qy + pz * qz) / (qx * qx + qy * qy + qz * qz);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = px - qx * t, dy = py - qy * t, dz = pz - qz * t;
  return sqrt(dx * dx + dy * dy + dz * dz) - r;
}
function etorus(x, y, z, R, a, b) {                 // flat ring around the y axis, radial half thickness a, vertical half thickness b
  const q = sqrt(x * x + z * z) - R;
  return (sqrt((q / a) * (q / a) + (y / b) * (y / b)) - 1) * min(a, b);
}

// ---------- rotation frames
function mul3(A, B) {
  const C = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
  return C;
}
function euler(roll, yaw, pitch) {                   // local -> world = Rz(roll) Ry(yaw) Rx(pitch)
  const cr = cos(roll), sr = sin(roll), cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch);
  return mul3([cr, -sr, 0, sr, cr, 0, 0, 0, 1], mul3([cy, 0, sy, 0, 1, 0, -sy, 0, cy], [1, 0, 0, 0, cp, -sp, 0, sp, cp]));
}
class Frame {
  constructor(cx, cy, cz, R) { this.cx = cx; this.cy = cy; this.cz = cz; this.R = R; this.lx = 0; this.ly = 0; this.lz = 0; }
  loc(x, y, z) {
    const R = this.R, px = x - this.cx, py = y - this.cy, pz = z - this.cz;
    this.lx = R[0] * px + R[3] * py + R[6] * pz; this.ly = R[1] * px + R[4] * py + R[7] * pz; this.lz = R[2] * px + R[5] * py + R[8] * pz;
  }
  dir(x, y, z) {
    const R = this.R;
    this.lx = R[0] * x + R[3] * y + R[6] * z; this.ly = R[1] * x + R[4] * y + R[7] * z; this.lz = R[2] * x + R[5] * y + R[8] * z;
  }
}

// baked light (same direction as the engine key light) and a 4x4 Bayer matrix for ordered dithering of the tones
const LX = -0.4257, LY = 0.681, LZ = 0.596;
const HXH = -0.2365, HYH = 0.378, HZH = 0.887;           // half vector of the key light and a viewer on +z: where the glint sits
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// light plating: white where the baked light is strong, light gray in the middle, mid gray in shade and crevices.
// A darker rim on the sides and underside keeps the outline readable on a white page.
function plate(c, bias) {
  const ndl = c.nx * LX + c.ny * LY + c.nz * LZ;
  let t = 0.55 + 0.45 * ndl - 0.45 * (1 - c.ao) + bias + (c.bay - 0.5) * c.dith + 0.30 * (c.nz < 0 ? -c.nz : 0);
  const side = 1 - clamp(abs(c.nz) / 0.5, 0, 1);
  t -= 0.16 * side * (1 - clamp((c.ny - 0.2) / 0.5, 0, 1));
  if (c.nx * HXH + c.ny * HYH + c.nz * HZH > 0.955 + (c.bay - 0.5) * 0.03 && c.ao > 0.8) return 6;      // glossy glint
  if (t > 0.80) return 6;
  if (t > 0.30) return c.hh < 0.5 ? 0 : 7;
  return 1;
}

function makeScene(h) {
  const dep = (h < 0.025 ? 1.9 : 0.9) * h;              // relief depth, in whole voxels (~0.031 at 59049, ~0.036 at 6561)
  const W = max(0.028, 1.1 * h);                        // thinnest line that survives the breathing of the cubes
  const sw = W;                                         // seam width
  const mar = 3.5 * h + 0.02;                           // bounding box margin of the parts
  const parts = [];
  const add = (cx, cy, cz, hx, hy, hz, d, tag) => parts.push({
    uid: parts.length, x0: cx - hx - mar, x1: cx + hx + mar, y0: cy - hy - mar, y1: cy + hy + mar, z0: cz - hz - mar, z1: cz + hz + mar, d, tag,
  });
  const addF = (F, lc, lh, d, tag) => {                // a part given in a rotated frame: local box centre and half sizes
    const R = F.R;
    add(F.cx + R[0] * lc[0] + R[1] * lc[1] + R[2] * lc[2], F.cy + R[3] * lc[0] + R[4] * lc[1] + R[5] * lc[2], F.cz + R[6] * lc[0] + R[7] * lc[1] + R[8] * lc[2],
      abs(R[0]) * lh[0] + abs(R[1]) * lh[1] + abs(R[2]) * lh[2], abs(R[3]) * lh[0] + abs(R[4]) * lh[1] + abs(R[5]) * lh[2],
      abs(R[6]) * lh[0] + abs(R[7]) * lh[1] + abs(R[8]) * lh[2], d, tag);
  };

  // ======================= HEAD (tilted) =======================
  const HF = new Frame(0, 0.44, 0, euler(0.11, -0.09, -0.02));
  const HEAD = { hx: 0.62, hy: 0.44, hz: 0.50, r: 0.40 };
  const VIS = { cy: -0.05, hx: 0.45, hy: 0.265, r: 0.225 };
  const EYE = { x: 0.195, y: -0.005, hx: 0.082, hy: 0.122 };
  const MOUTH = { y: -0.195, k: max(2.6, 1.1 * h / 0.0081), hw: h < 0.025 ? 0.10 : 0.09 };       // the ends stay at least a voxel below the eyes
  const EAR = { x: 0.655, y: -0.05, r: 0.20, t: 0.075, rr: 0.04, cap: 0.085 };
  const bz = max(0.034, W);                             // bezel around the visor
  const g2 = max(0.035, 1.0 * h);                       // gap before the second plating line
  const mt = max(0.017, 0.62 * h);                      // half thickness of the mouth line
  const chs = max(0.04, 1.0 * h);                        // radius of the eye catch light
  const fine = h < 0.025;                               // second plating line and second glare arc only at the fine pitch
  const Z_NONE = 0, Z_GLASS = 1, Z_BEZEL = 2, Z_EYE = 3, Z_CATCH = 4, Z_MOUTH = 5, Z_LINE2 = 6;
  function faceZone(lx, ly) {
    const v = rrect(lx, ly - VIS.cy, VIS.hx, VIS.hy, VIS.r);
    if (fine && v > bz + g2 + sw) return Z_NONE;
    if (fine && v > bz + g2) return Z_LINE2;
    if (v > bz) return Z_NONE;
    if (v > 0) return Z_BEZEL;
    const sx = lx < 0 ? -1 : 1;
    const ex = abs(lx) - EYE.x, ey = ly - EYE.y;
    if (rrect(ex, ey, EYE.hx, EYE.hy, EYE.hx) < 0) {
      const qx = lx - (sx * EYE.x - 0.028), qy = ey - 0.056;
      return (qx * qx + qy * qy < chs * chs) ? Z_CATCH : Z_EYE;
    }
    if (abs(lx) < MOUTH.hw && abs(ly - (MOUTH.y + MOUTH.k * lx * lx)) < mt) return Z_MOUTH;
    return Z_GLASS;
  }
  function seamHead(lx, ly, lz) {                       // 0 none, 1 or 2 = seam tag
    if (abs(lx) > 0.36) {
      const rho = sqrt((ly - EAR.y) * (ly - EAR.y) + lz * lz);
      if (abs(rho - 0.275) < sw * 0.5) return 1;
    }
    if (ly > 0.30 && abs(lx) < sw * 0.5 && lz < 0.05 && lz > -0.40) return 2;   // short ridge from the antenna to the back
    return 0;
  }
  const headD = (x, y, z) => {
    HF.loc(x, y, z);
    const lx = HF.lx, ly = HF.ly, lz = HF.lz;
    const hs = 1 - 0.06 * clamp(ly / HEAD.hy, -1, 1);                    // egg: narrower at the forehead, wider at the cheeks
    let d = rbox(lx / hs, ly, lz / hs, HEAD.hx, HEAD.hy, HEAD.hz, HEAD.r) * (0.5 + 0.5 * hs);
    if (d > -2.2 * h && d < 2.2 * h) {
      let carved = false;
      if (lz > 0.1) {
        const zn = faceZone(lx, ly);
        if (zn === Z_GLASS || zn === Z_LINE2) { d += dep; carved = true; } else if (zn !== Z_NONE) carved = true;
      }
      if (!carved && lz < -0.1) {
        const rr = sqrt(lx * lx + ly * ly);
        if (abs(rr - 0.19) < sw * 0.5) d += dep; else if (rr < 0.095) d -= dep;
        carved = true;
      }
      if (!carved && seamHead(lx, ly, lz) !== 0) d += dep;
    }
    return d;
  };
  const glass = (lx, ly, c) => {
    const v = rrect(lx, ly - VIS.cy, VIS.hx, VIS.hy, VIS.r);        // negative inside, -v = depth below the visor edge
    const ul = -0.6 * lx + 0.8 * (ly - VIS.cy);                        // > 0 toward the upper left
    const a0 = 0.028, wa = max(0.034, 1.6 * h), wb = max(0.02, 1.2 * h);
    if (ul > 0.05 && -v > a0 && -v < a0 + wa) return 2;                // long glare arc along the upper left edge
    if (fine && ul > 0.20 && -v > a0 + wa + wb && -v < a0 + wa + 2 * wb) return 2;   // a short second arc inside it
    if (v > -W && ul < -0.10) return 2;                                // the lower right edge catches a thin rim of light
    if (fine) {                                                         // a halo of glow dust around the lenses
      const e = rrect(abs(lx) - EYE.x, ly - EYE.y, EYE.hx, EYE.hy, EYE.hx);
      if (e < 0.045 && c.bay < 0.6 * (1 - e / 0.045) * (1 - e / 0.045)) return 3;
    }
    return 5;
  };
  const headTag = (c) => {
    HF.loc(c.x, c.y, c.z);
    const lx = HF.lx, ly = HF.ly, lz = HF.lz;
    if (lz > 0.1) {
      switch (faceZone(lx, ly)) {
        case Z_GLASS: return glass(lx, ly, c);
        case Z_BEZEL: return 1;
        case Z_EYE: case Z_MOUTH: return 3;
        case Z_CATCH: return 6;
        case Z_LINE2: return 2;
        default: break;
      }
    }
    if (lz < -0.1) {
      const rr = sqrt(lx * lx + ly * ly);
      if (abs(rr - 0.19) < sw * 0.5) return 1;
      if (rr < 0.095) return 4;
    }
    const sm = seamHead(lx, ly, lz);
    if (sm) return sm;
    return plate(c, 0.02);
  };
  addF(HF, [0, 0, 0], [HEAD.hx, HEAD.hy, HEAD.hz], headD, headTag);

  // ears: two blue modules on the sides of the head
  for (const s of [-1, 1]) {
    const earD = (x, y, z) => {
      HF.loc(x, y, z);
      const ex = s * HF.lx - EAR.x, ey = HF.ly - EAR.y, ez = HF.lz;
      const rad = sqrt(ey * ey + ez * ez);
      let d = rcyl(rad, ex, EAR.r, EAR.t, EAR.rr);
      if (d > -2.2 * h && d < 2.2 * h && ex > 0) {
        if (rad < EAR.cap) d -= dep; else if (rad < EAR.cap + sw) d += dep;
      }
      return d;
    };
    const earTag = (c) => {
      HF.loc(c.x, c.y, c.z);
      const ey = HF.ly - EAR.y, ez = HF.lz;
      const rad = sqrt(ey * ey + ez * ez);
      HF.dir(c.nx, c.ny, c.nz);
      if (s * HF.lx > 0.7) {
        if (rad < EAR.cap) return 6;
        if (rad < EAR.cap + sw) return 2;
        if (rad > EAR.r - max(0.03, 1.0 * h)) return 7;
        return 4;
      }
      return 4;
    };
    addF(HF, [s * EAR.x, EAR.y, 0], [EAR.t + 0.02, EAR.r, EAR.r], earD, earTag);
  }

  // antenna: base, curved stem, glowing bead
  const rs = max(0.022, 1.0 * h);
  const rb = max(0.06, 1.7 * h);
  const AN = [[0, 0.46, 0], [0.008, 0.50, 0], [0.030, 0.54, 0], [0.050, 0.565, 0]];
  const BEAD = [0.056, 0.597, 0];
  addF(HF, [0, 0.46, 0], [0.09, 0.05, 0.09], (x, y, z) => {
    HF.loc(x, y, z);
    return rcyl(sqrt(HF.lx * HF.lx + HF.lz * HF.lz), HF.ly - 0.455, 0.08, 0.032, 0.02);
  }, () => 1);
  addF(HF, [0.03, 0.53, 0], [0.06, 0.09, 0.05], (x, y, z) => {
    HF.loc(x, y, z);
    let d = BIG;
    for (let i = 0; i < 3; i++) d = min(d, capsule(HF.lx, HF.ly, HF.lz, AN[i][0], AN[i][1], AN[i][2], AN[i + 1][0], AN[i + 1][1], AN[i + 1][2], rs));
    return d;
  }, () => 1);
  addF(HF, BEAD, [rb, rb, rb], (x, y, z) => {
    HF.loc(x, y, z);
    const dx = HF.lx - BEAD[0], dy = HF.ly - BEAD[1], dz = HF.lz - BEAD[2];
    return sqrt(dx * dx + dy * dy + dz * dz) - rb;
  }, () => 3);

  // ======================= NECK, COLLAR, TORSO =======================
  add(0, -0.06, 0, 0.14, 0.12, 0.14, (x, y, z) => rcyl(sqrt(x * x + z * z), y + 0.06, 0.135, 0.11, 0.02), () => 2);
  const COLY = -0.13;
  add(0, COLY, 0, 0.23, 0.04, 0.23, (x, y, z) => rcyl(sqrt(x * x + z * z), y - COLY, 0.215, 0.032, 0.028),
    (c) => (c.nx * LX + c.ny * LY + c.nz * LZ > 0.62 ? 7 : 1));

  const TOR = { cy: -0.445, hx: 0.34, hy: 0.31, hz: 0.29, r: 0.25, taper: 0.10 };
  const tScale = (y) => { const t = clamp((TOR.cy + TOR.hy - y) / (2 * TOR.hy), 0, 1); return 1 - TOR.taper * t * (0.4 + 0.6 * t); };
  const CH = fine ? { y: -0.325, hx: 0.17, hy: 0.135, r: 0.07, core: 0.075, ring: max(0.032, 1.0 * h) }
    : { y: -0.34, hx: 0.19, hy: 0.165, r: 0.07, core: 0.062, ring: max(0.032, 1.0 * h) };      // a bigger panel when the cubes are big
  const BELT = -0.585;
  const SIDE = 0.262;
  function chestZone(x, y) {                             // 0 none, 1 blue panel, 2 core ring, 3 core
    const s = tScale(y);
    const px = x / s, py = y - CH.y;
    if (rrect(px, py, CH.hx, CH.hy, CH.r) > 0) return 0;
    const rr = sqrt(px * px + py * py);
    if (rr < CH.core) return 3;
    if (rr < CH.core + CH.ring) return 2;
    return 1;
  }
  function backZone(x, y) {                              // 0 none, 1 blue panel, 2 status light
    const s = tScale(y);
    const px = x / s, py = y + 0.30;
    if (rrect(px, py, 0.13, 0.10, 0.05) > 0) return 0;
    const dx = px - 0.07, dy = py - 0.045;
    return sqrt(dx * dx + dy * dy) < max(0.03, 0.9 * h) ? 2 : 1;
  }
  function seamTorso(x, y, z) {                          // 0 none, 1 or 2 = seam tag
    const s = tScale(y);
    if (abs(y - BELT) < sw * 0.5) return 2;
    if (y < BELT - 0.01 && y > -0.74 && z > 0 && abs(x) < sw * 0.5) return 1;
    if (z > -0.05 && y > BELT + 0.03 && y < -0.17 && abs(abs(x / s) - SIDE) < sw * 0.5 && chestZone(x, y) === 0) return 1;
    return 0;
  }
  const torsoD = (x, y, z) => {
    const s = tScale(y);
    let d = rbox(x / s, y - TOR.cy, z / s, TOR.hx, TOR.hy, TOR.hz, TOR.r) * (0.5 + 0.5 * s);
    if (d > -2.2 * h && d < 2.2 * h) {
      let done = false;
      if (z > 0.1) {
        const zn = chestZone(x, y);
        if (zn === 1 || zn === 3) { d -= dep; done = true; } else if (zn === 2) { d -= 1.5 * dep; done = true; }
      } else if (z < -0.1 && backZone(x, y) > 0) { d -= dep; done = true; }
      if (!done && seamTorso(x, y, z) !== 0) d += dep;
    }
    return d;
  };
  const torsoTag = (c) => {
    if (c.z > 0.1) {
      const zn = chestZone(c.x, c.y);
      if (zn === 1) return 4;
      if (zn === 2) return 6;
      if (zn === 3) return 3;
    }
    if (c.z < -0.1) {
      const bz2 = backZone(c.x, c.y);
      if (bz2 === 2) return 3;
      if (bz2 === 1) return 4;
    }
    const sm = seamTorso(c.x, c.y, c.z);
    if (sm) return sm;
    return plate(c, 0);
  };
  add(0, TOR.cy, 0, TOR.hx + 0.02, TOR.hy + 0.02, TOR.hz + 0.02, torsoD, torsoTag);

  // shoulder joints (balls on the torso) with a groove ring
  const SH = { x: 0.385, y: -0.215, z: -0.01, r: 0.095 };
  for (const s of [-1, 1]) {
    const ax = 0.78 * s, ay = -0.62, az = 0.12, al = sqrt(ax * ax + ay * ay + az * az);
    const shD = (x, y, z) => {
      const dx = x - s * SH.x, dy = y - SH.y, dz = z - SH.z;
      let d = sqrt(dx * dx + dy * dy + dz * dz) - SH.r;
      if (d > -2.2 * h && d < 2.2 * h && abs((dx * ax + dy * ay + dz * az) / al) < sw * 0.5) d += dep;
      return d;
    };
    const shTag = (c) => {
      const dx = c.x - s * SH.x, dy = c.y - SH.y, dz = c.z - SH.z;
      if (abs((dx * ax + dy * ay + dz * az) / al) < sw * 0.5) return 4;
      return plate(c, 0.04);
    };
    add(s * SH.x, SH.y, SH.z, SH.r, SH.r, SH.r, shD, shTag);
  }

  // ======================= FLOATING HANDS =======================
  // one relaxed hand (fingers down) and one waving hello (fingers up), both detached from the body by a visible gap
  const rf = max(0.0225, 0.95 * h);                        // finger radius
  const nf = h < 0.03 ? 3 : 2;                              // fingers (plus the thumb)
  const sp = 2 * rf + max(0.034, 1.0 * h);                  // finger spacing: a visible gap between fingers even when the cubes breathe
  const palmX = (nf - 1) * 0.5 * sp + rf * 0.95;
  const HANDS = [
    { x: -0.72, y: -0.36, z: 0.20, th: PI - 0.40, spread: 0.12 },
    { x: 0.77, y: -0.21, z: 0.24, th: -0.28, spread: 0.17 },
  ];
  for (const H of HANDS) {
    const ct = cos(H.th), st = sin(H.th);
    const loc = (x, y, z, o) => {                           // local frame: v along the fingers, u across, w out of the palm
      const dx = x - H.x, dy = y - H.y;
      o[0] = ct * dx + st * dy; o[1] = -st * dx + ct * dy; o[2] = z - H.z;
    };
    const tmp = [0, 0, 0];
    const handD = (x, y, z) => {
      loc(x, y, z, tmp);
      const u = tmp[0], v = tmp[1], w = tmp[2];
      let d = rbox(u, v, w, palmX, 0.07, 0.05, 0.04);
      for (let i = 0; i < nf; i++) {
        const a = (i - (nf - 1) * 0.5) * H.spread;
        const fu = (i - (nf - 1) * 0.5) * sp;
        const len = (nf === 3 && i === 1) ? 0.115 : 0.095;
        d = min(d, capsule(u, v, w, fu, 0.035, 0.0, fu + sin(a) * len, 0.035 + cos(a) * len, 0.01, rf));
      }
      d = min(d, capsule(u, v, w, -palmX + 0.02, 0.0, 0.012, -palmX - 0.065, 0.045, 0.025, rf * 1.05));
      return d;
    };
    const handTag = (c) => {
      loc(c.x, c.y, c.z, tmp);
      if (tmp[1] < -0.03) return 4;                         // blue cuff at the wrist
      return plate(c, 0.10);
    };
    add(H.x, H.y, H.z, 0.21, 0.23, 0.09, handD, handTag);
  }

  // ======================= HOVER RING, SATELLITES =======================
  const RG = { cy: -0.665, R: 0.53, tilt: 0.16 };
  const RF = new Frame(0, RG.cy, 0, euler(0, 0, RG.tilt));
  const ra = max(0.03, 1.15 * h), rbv = max(0.02, 0.9 * h);
  addF(RF, [0, 0, 0], [RG.R + 0.06, 0.07, RG.R + 0.06], (x, y, z) => {
    RF.loc(x, y, z);
    return etorus(RF.lx, RF.ly, RF.lz, RG.R, ra, rbv);
  }, (c) => plate(c, 0.05));
  const SATR = max(0.05, 1.5 * h);
  const SATS = [[0.55, 3], [2.40, 4], [4.40, 6]];
  for (const [ang, tg] of SATS) {
    const lc = [RG.R * cos(ang), 0, RG.R * sin(ang)];
    addF(RF, lc, [SATR, SATR, SATR], (x, y, z) => {
      RF.loc(x, y, z);
      const dx = RF.lx - lc[0], dy = RF.ly - lc[1], dz = RF.lz - lc[2];
      return sqrt(dx * dx + dy * dy + dz * dz) - SATR;
    }, () => tg);
  }

  // ======================= THRUSTER =======================
  const NOZ = -0.775;
  add(0, NOZ, 0, 0.11, 0.05, 0.11, (x, y, z) => rcyl(sqrt(x * x + z * z), y - NOZ, 0.09, 0.04, 0.028), () => 2);
  const FL = { y: -0.865, rx: 0.06, ry: 0.08 };
  add(0, FL.y, 0, FL.rx, FL.ry, FL.rx, (x, y, z) => {
    const q = sqrt((x / FL.rx) * (x / FL.rx) + ((y - FL.y) / FL.ry) * ((y - FL.y) / FL.ry) + (z / FL.rx) * (z / FL.rx));
    return (q - 1) * FL.rx;
  }, () => 3);
  const exhaust = [[-0.985, 0.08, 3], [-1.035, 0.11, 7]];
  for (const [ey, eR, etag] of exhaust) {
    const yy = round(ey / h) * h;
    add(0, yy, 0, eR + 0.03, 0.03, eR + 0.03, (x, y, z) => etorus(x, y - yy, z, eR, max(0.03, 1.0 * h), 0.5 * h), () => etag);
  }

  const sceneD = (x, y, z) => {
    let d = BIG;
    for (let q = 0; q < parts.length; q++) {
      const p = parts[q];
      if (x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1 || z < p.z0 || z > p.z1) continue;
      const v = p.d(x, y, z);
      if (v < d) d = v;
    }
    return d;
  };
  return { parts, sceneD };
}

// ---------- voxelization of the union at pitch h, then the shell (skin + backing layers)
function voxelize(h, layersWanted) {
  const scene = makeScene(h);
  const parts = scene.parts;
  let I0 = BIG, I1 = -BIG, J0 = BIG, J1 = -BIG, K0 = BIG, K1 = -BIG;
  for (const p of parts) {
    p.i0 = ceil(p.x0 / h); p.i1 = floor(p.x1 / h); p.j0 = ceil(p.y0 / h); p.j1 = floor(p.y1 / h); p.k0 = ceil(p.z0 / h); p.k1 = floor(p.z1 / h);
    I0 = min(I0, p.i0); I1 = max(I1, p.i1); J0 = min(J0, p.j0); J1 = max(J1, p.j1); K0 = min(K0, p.k0); K1 = max(K1, p.k1);
  }
  I0--; I1++; J0--; J1++; K0--; K1++;
  const nx = I1 - I0 + 1, ny = J1 - J0 + 1, nz = K1 - K0 + 1, nxy = nx * ny, N = nx * ny * nz;
  const D = new Float32Array(N).fill(BIG);
  const M = new Uint8Array(N);
  for (const p of parts) {
    const d = p.d, id = p.uid;
    for (let k = p.k0; k <= p.k1; k++) {
      const z = k * h;
      for (let j = p.j0; j <= p.j1; j++) {
        const y = j * h;
        let c = (p.i0 - I0) + nx * (j - J0) + nxy * (k - K0);
        for (let i = p.i0; i <= p.i1; i++, c++) {
          const v = d(i * h, y, z);
          if (v < D[c]) { D[c] = v; M[c] = id; }
        }
      }
    }
  }
  const skin = [];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) {
    let c = 1 + nx * j + nxy * k;
    for (let i = 1; i < nx - 1; i++, c++) {
      if (D[c] > 0) continue;
      if (D[c - 1] > 0 || D[c + 1] > 0 || D[c - nx] > 0 || D[c + nx] > 0 || D[c - nxy] > 0 || D[c + nxy] > 0) skin.push(c);
    }
  }
  const vox = { h, scene, parts, I0, J0, K0, nx, ny, nz, nxy, D, M, depth: new Uint8Array(N).fill(255), layers: [skin], count: skin.length };
  for (const c of skin) vox.depth[c] = 0;
  while (vox.layers.length < layersWanted) growLayer(vox, Infinity);
  return vox;
}

// one more backing layer (6-connected), at most `limit` cells (a pseudo-random subset when the layer is larger)
function growLayer(vox, limit, seed = 1) {
  const { D, depth, nx, nxy } = vox;
  const L = vox.layers.length;
  const prev = vox.layers[L - 1], next = [];
  const off = [-1, 1, -nx, nx, -nxy, nxy];
  for (let q = 0; q < prev.length; q++) {
    const c = prev[q];
    for (let o = 0; o < 6; o++) {
      const e = c + off[o];
      if (depth[e] === 255 && D[e] <= 0) { depth[e] = L; next.push(e); }
    }
  }
  if (next.length > limit) {
    const keys = next.map((c) => hash3(c, 5, 9, seed));
    const order = next.map((_, q) => q).sort((a, b) => keys[a] - keys[b]);
    const keep = order.slice(0, limit).map((q) => next[q]);
    const kept = new Set(keep);
    for (const c of next) if (!kept.has(c)) depth[c] = 255;
    vox.layers.push(keep);
    vox.count += keep.length;
  } else {
    vox.layers.push(next);
    vox.count += next.length;
  }
}

export default function build(n, seed = 1) {
  const T = n > 20000 ? 3 : 2;                            // layers of the shell (skin + backing)
  // 1. pitch calibration: a coarse pass measures the shell, a fine pass lands at ~96 % of n
  let vox = voxelize(0.0173 * sqrt(59049 / n) * 1.8, T);
  let h = vox.h * sqrt(vox.count / (0.965 * n));
  vox = voxelize(h, T);
  for (let it = 0; it < 3 && (vox.count > n || vox.count < 0.92 * n); it++) {
    h = vox.h * sqrt(vox.count / (0.96 * n));
    vox = voxelize(h, T);
  }
  while (vox.count > n) vox = voxelize(vox.h * 1.015, T);
  h = vox.h;

  // 2. top up with more backing layers until the count is exactly n (if the solid ran out, repeat random skin cubes)
  while (vox.count < n) {
    const before = vox.count;
    growLayer(vox, n - vox.count, seed);
    if (vox.count === before) {
      const skin = vox.layers[0], extraLayer = [];
      for (let q = 0; vox.count + extraLayer.length < n; q++) extraLayer.push(skin[floor(hash3(q, 3, 5, seed) * skin.length)]);
      vox.layers.push(extraLayer); vox.count = n;
    }
  }
  const { scene, parts, I0, J0, K0, nx, ny, nxy, D, M, layers } = vox;

  // 3. tags: skin voxels from the feature masks, backing voxels inherit from their parent in the layer above
  const tg = new Uint8Array(D.length);
  const ctx = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 1, ao: 1, bay: 0.5, hh: 0.5, dith: h < 0.025 ? 0.08 : 0.05 };
  const cl = (v) => (v > 3 * h ? 3 * h : v < -3 * h ? -3 * h : v);
  const sceneD = scene.sceneD;
  const AO_S = [max(0.03, 1.4 * h), max(0.07, 2.6 * h), max(0.12, 4 * h)], AO_W = [0.45, 0.32, 0.23];
  const skin = layers[0];
  for (let q = 0; q < skin.length; q++) {
    const c = skin[q];
    const i = c % nx, j = floor(c / nx) % ny, k = floor(c / nxy);
    const x = (i + I0) * h, y = (j + J0) * h, z = (k + K0) * h;
    let gx = cl(D[c + 1]) - cl(D[c - 1]), gy = cl(D[c + nx]) - cl(D[c - nx]), gz = cl(D[c + nxy]) - cl(D[c - nxy]);
    const gl = sqrt(gx * gx + gy * gy + gz * gz) || 1;
    gx /= gl; gy /= gl; gz /= gl;
    let occ = 0;
    for (let s = 0; s < 3; s++) {
      const dd = sceneD(x + gx * AO_S[s], y + gy * AO_S[s], z + gz * AO_S[s]);
      occ += AO_W[s] * clamp((AO_S[s] + D[c] - dd) / AO_S[s], 0, 1);
    }
    const ax = abs(gx), ay = abs(gy), az = abs(gz);
    let bi, bj;
    if (az >= ax && az >= ay) { bi = i; bj = j; } else if (ax >= ay) { bi = j; bj = k; } else { bi = i; bj = k; }
    ctx.x = x; ctx.y = y; ctx.z = z; ctx.nx = gx; ctx.ny = gy; ctx.nz = gz;
    ctx.ao = 1 - clamp(occ, 0, 1);
    ctx.bay = (BAYER[(bi & 3) + 4 * (bj & 3)] + 0.5) / 16;
    ctx.hh = hash3(i, j, k, seed);
    tg[c] = parts[M[c]].tag(ctx);
  }
  const off = [-1, 1, -nx, nx, -nxy, nxy];
  const dirs = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
  for (let L = 1; L < layers.length; L++) {
    const lay = layers[L];
    for (let q = 0; q < lay.length; q++) {
      const c = lay[q];
      const gx = cl(D[c + 1]) - cl(D[c - 1]), gy = cl(D[c + nx]) - cl(D[c - nx]), gz = cl(D[c + nxy]) - cl(D[c - nxy]);
      let best = -BIG, par = -1;
      for (let o = 0; o < 6; o++) {
        const e = c + off[o];
        if (vox.depth[e] !== L - 1) continue;
        const sc = dirs[o][0] * gx + dirs[o][1] * gy + dirs[o][2] * gz;
        if (sc > best) { best = sc; par = e; }
      }
      tg[c] = par >= 0 ? tg[par] : 1;
    }
  }

  // 4. output: centre vertically (x stays on the body axis), report the extent
  const pos = new Float32Array(3 * n), tag = new Uint8Array(n);
  let w = 0;
  for (let L = 0; L < layers.length; L++) {
    const lay = layers[L];
    for (let q = 0; q < lay.length; q++) {
      const c = lay[q];
      pos[w * 3] = ((c % nx) + I0) * h; pos[w * 3 + 1] = ((floor(c / nx) % ny) + J0) * h; pos[w * 3 + 2] = (floor(c / nxy) + K0) * h;
      tag[w] = tg[c];
      w++;
    }
  }
  let ymin = BIG, ymax = -BIG;
  for (let q = 0; q < n; q++) { const y = pos[q * 3 + 1]; if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
  const yc = 0.5 * (ymin + ymax);
  let ex = 0, ey = 0, ez = 0;
  for (let q = 0; q < n; q++) {
    pos[q * 3 + 1] -= yc;
    ex = max(ex, abs(pos[q * 3])); ey = max(ey, abs(pos[q * 3 + 1])); ez = max(ez, abs(pos[q * 3 + 2]));
  }
  const cube = h * 1.18;                                   // neighbouring cubes overlap a little: covers the gaps when the cubes breathe
  return { pos, tag, cube, extent: [ex + cube / 2, ey + cube / 2, ez + cube / 2], pitch: h, skin: skin.length, frame: { yc } };
}

/**
 * Le champ du robot pour le maillage lisse, au pas fin h : la distance signée de l'union, la boîte, et l'étiquette de la pièce la plus proche
 * (sans la lumière cuite ni le tramage des cubes : le rendu lisse a sa propre lumière). Le repère est celui de build() avant le recentrage vertical.
 */
export function field(h = 0.0125) {
  const scene = makeScene(h);
  const parts = scene.parts;
  const ctx = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 1, ao: 1, bay: 0.5, hh: 0.5, dith: 0 };
  const tagAt = (x, y, z, nx = 0, ny = 0, nz = 1) => {
    let best = BIG, bp = null;
    for (let q = 0; q < parts.length; q++) {
      const p = parts[q];
      if (x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1 || z < p.z0 || z > p.z1) continue;
      const v = p.d(x, y, z);
      if (v < best) { best = v; bp = p; }
    }
    if (!bp) return 0;
    ctx.x = x; ctx.y = y; ctx.z = z; ctx.nx = nx; ctx.ny = ny; ctx.nz = nz;
    return bp.tag(ctx);
  };
  let x0 = BIG, x1 = -BIG, y0 = BIG, y1 = -BIG, z0 = BIG, z1 = -BIG;
  for (const p of parts) { x0 = min(x0, p.x0); x1 = max(x1, p.x1); y0 = min(y0, p.y0); y1 = max(y1, p.y1); z0 = min(z0, p.z0); z1 = max(z1, p.z1); }
  return { sdf: scene.sceneD, bbox: [x0, y0, z0, x1, y1, z1], tagAt };
}
