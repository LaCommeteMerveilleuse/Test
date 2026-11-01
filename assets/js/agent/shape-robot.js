// BlackPhage - the NovaDiff mascot robot (shape slot 2), premium version.
// A friendly astronaut-bot in glossy white ceramic plating, dark graphite and brushed metal joints, with a dark glass visor, two big amber
// eyes with catch lights and a tiny smile, blue ear modules with fine rings, a slender antenna with a glowing bead, a pill body with a
// blue chest panel and a glowing core, shoulder joints with slim arms that end in floating hands (one waves hello), a hover ring with three
// satellites and a soft thruster. Pure math (no dependency), deterministic. The whole robot is ONE signed distance field in ONE frame
// (y up, +z toward the camera, vertically centred, nothing to shift), so the smooth mesh and the cubes always coincide.
//
//   export default build(n, seed)  -> { pos, tag, cube, extent, frame: { yc: 0 }, pitch, skin }                  the small metallic cubes
//   export smoothModel()           -> { sdf, bbox, featureAt, partAt, parts, features, blendAt, glowAt, aoAt }   the smooth glossy mesh (mesher.js)
//   export field(h)                -> { sdf, bbox, tagAt }                                                         older contract, same shape at pitch h
//
// FEATURES are material classes (albedo, metal, roughness, emission, clearcoat), with no light baked in. PARTS are the animation groups.
//   parts    0 body (static torso, neck, collar, shoulder balls, arms, nozzle)   1 head (shell, ears, antenna collar)   2 handL   3 handR
//            4 ring (hover ring with its three satellites)   5 antenna (stem and bead)   6 flame (cone and glow rings)   7 eyeL   8 eyeR
//   L and R are the sides of the screen (L is x < 0). Every animated part is a separate piece of mesh with a clear gap to the rest, except
//   the antenna (it grows from the head collar), the flame (it grows from the nozzle) and the eyes (they are lenses in the visor glass).
//
// How the cubes are built. The union of the parts is voxelized on a cubic lattice and only the skin is kept (every solid voxel that touches
// empty space, watertight from any viewpoint, the engine only lets cubes breathe by a few percent of their size), plus optional backing layers.
// The lattice pitch is estimated from n, corrected by a second pass if needed, then the shell grows one backing layer at a time until the count
// is exactly n. The tag of a skin voxel comes from the FEATURE of the surface, baked light and ambient occlusion for the plating.
const { abs, sqrt, min, max, sin, cos, atan2, floor, ceil, round, PI } = Math;
const BIG = 1e9;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function hash3(i, j, k, s) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177) ^ Math.imul(s, 2246822519);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------- distance primitives
function rbox(x, y, z, bx, by, bz, r) {            // rounded box, the half sizes include the rounding radius
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
function roundCone(qx, qy, r1, r2, h) {            // around an axis: radial qx, axial qy, radius r1 at 0 and r2 at h
  const b = (r1 - r2) / h, a = sqrt(1 - b * b);
  const k = -qx * b + qy * a;
  if (k < 0) return sqrt(qx * qx + qy * qy) - r1;
  if (k > a * h) return sqrt(qx * qx + (qy - h) * (qy - h)) - r2;
  return qx * a + qy * b - r1;
}
function etorus(x, y, z, R, a, b) {                 // flat ring around the y axis, radial half thickness a, vertical half thickness b
  const q = sqrt(x * x + z * z) - R;
  return (sqrt((q / a) * (q / a) + (y / b) * (y / b)) - 1) * min(a, b);
}

// ---------- rotation frames (R is local -> world, row major)
function mul3(A, B) {
  const C = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
  return C;
}
function euler(roll, yaw, pitch) {                   // local -> world = Rz(roll) Ry(yaw) Rx(pitch)
  const cr = cos(roll), sr = sin(roll), cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch);
  return mul3([cr, -sr, 0, sr, cr, 0, 0, 0, 1], mul3([cy, 0, sy, 0, 1, 0, -sy, 0, cy], [1, 0, 0, 0, cp, -sp, 0, sp, cp]));
}
const nrm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function frameVW(v, w0) {                             // columns u, v, w of a hand frame: v along the fingers, w toward the palm side
  const vv = nrm3(v);
  const d = w0[0] * vv[0] + w0[1] * vv[1] + w0[2] * vv[2];
  const w = nrm3([w0[0] - d * vv[0], w0[1] - d * vv[1], w0[2] - d * vv[2]]);
  const u = cross3(vv, w);
  return [u[0], vv[0], w[0], u[1], vv[1], w[1], u[2], vv[2], w[2]];
}
class Frame {
  constructor(o, R) { this.ox = o[0]; this.oy = o[1]; this.oz = o[2]; this.R = R; this.lx = 0; this.ly = 0; this.lz = 0; }
  to(x, y, z) {
    const R = this.R, px = x - this.ox, py = y - this.oy, pz = z - this.oz;
    this.lx = R[0] * px + R[3] * py + R[6] * pz; this.ly = R[1] * px + R[4] * py + R[7] * pz; this.lz = R[2] * px + R[5] * py + R[8] * pz;
  }
  dir(x, y, z) {
    const R = this.R;
    this.lx = R[0] * x + R[3] * y + R[6] * z; this.ly = R[1] * x + R[4] * y + R[7] * z; this.lz = R[2] * x + R[5] * y + R[8] * z;
  }
  world(lx, ly, lz) {
    const R = this.R;
    return [this.ox + R[0] * lx + R[1] * ly + R[2] * lz, this.oy + R[3] * lx + R[4] * ly + R[5] * lz, this.oz + R[6] * lx + R[7] * ly + R[8] * lz];
  }
  box(c, h) {                                         // world box of a local box (centre c, half sizes h)
    const R = this.R, w = this.world(c[0], c[1], c[2]);
    const hx = abs(R[0]) * h[0] + abs(R[1]) * h[1] + abs(R[2]) * h[2];
    const hy = abs(R[3]) * h[0] + abs(R[4]) * h[1] + abs(R[5]) * h[2];
    const hz = abs(R[6]) * h[0] + abs(R[7]) * h[1] + abs(R[8]) * h[2];
    return [w[0] - hx, w[0] + hx, w[1] - hy, w[1] + hy, w[2] - hz, w[2] + hz];
  }
}
const boxC = (cx, cy, cz, hx, hy, hz) => [cx - hx, cx + hx, cy - hy, cy + hy, cz - hz, cz + hz];

// ---------- the features (material classes, albedo only, the renderer does the light) and the parts (for animation)
const FT = {
  PLATE: 0, PLATE_G: 1, TRIM: 2, METAL: 3, GLASS: 4, RIM: 5, EYE: 6, CATCH: 7, MOUTH: 8, BLUE: 9, BLUE_RING: 10,
  CORE: 11, CORE_RING: 12, BEAD: 13, FLAME: 14, SAT_A: 15, SAT_B: 16, SAT_W: 17, SEAM: 18,
};
const FEATURES = [
  { id: 0, name: 'plating white', color: '#eef3f4', metal: 0.04, rough: 0.2, emissive: 0, coat: 1 },
  { id: 1, name: 'plating light gray', color: '#c8d1d3', metal: 0.06, rough: 0.28, emissive: 0, coat: 1 },
  { id: 2, name: 'dark trim graphite', color: '#2f383c', metal: 0.5, rough: 0.5, emissive: 0, coat: 0.3 },
  { id: 3, name: 'brushed metal joint', color: '#a3afb5', metal: 0.95, rough: 0.34, emissive: 0, coat: 0 },
  { id: 4, name: 'visor glass', color: '#0f221d', metal: 0.25, rough: 0.07, emissive: 0, coat: 1 },
  { id: 5, name: 'visor rim', color: '#c3ccd0', metal: 0.95, rough: 0.26, emissive: 0, coat: 0 },
  { id: 6, name: 'eye amber', color: '#e0a35c', metal: 0, rough: 0.35, emissive: 1, coat: 1 },
  { id: 7, name: 'eye catch light', color: '#fff7e8', metal: 0, rough: 0.3, emissive: 1, coat: 0 },
  { id: 8, name: 'mouth', color: '#e0a35c', metal: 0, rough: 0.35, emissive: 0.95, coat: 0.5 },
  { id: 9, name: 'blue module', color: '#2a5f86', metal: 0.08, rough: 0.34, emissive: 0, coat: 0.35 },
  { id: 10, name: 'blue module ring', color: '#b4c6d0', metal: 0.9, rough: 0.3, emissive: 0, coat: 0 },
  { id: 11, name: 'core glow', color: '#e0a35c', metal: 0, rough: 0.35, emissive: 1, coat: 1 },
  { id: 12, name: 'core ring white', color: '#f6f9fa', metal: 0.05, rough: 0.16, emissive: 0, coat: 1 },
  { id: 13, name: 'antenna bead', color: '#e0a35c', metal: 0, rough: 0.3, emissive: 1, coat: 1 },
  { id: 14, name: 'flame', color: '#eab06a', metal: 0, rough: 0.5, emissive: 1, coat: 0 },
  { id: 15, name: 'satellite amber', color: '#e0a35c', metal: 0, rough: 0.3, emissive: 0.9, coat: 1 },
  { id: 16, name: 'satellite blue', color: '#2a5f86', metal: 0.1, rough: 0.2, emissive: 0, coat: 0.8 },
  { id: 17, name: 'satellite white', color: '#f6f9fa', metal: 0.05, rough: 0.16, emissive: 0, coat: 1 },
  { id: 18, name: 'seam line', color: '#252c30', metal: 0.2, rough: 0.6, emissive: 0, coat: 0.2 },
];
const PT = { BODY: 0, HEAD: 1, HAND_L: 2, HAND_R: 3, RING: 4, ANTENNA: 5, FLAME: 6, EYE_L: 7, EYE_R: 8 };

// ---------- baked light for the cubes (same direction as the engine key light) and a 4x4 Bayer matrix
const LX = -0.4257, LY = 0.681, LZ = 0.596;
const HXH = -0.2365, HYH = 0.378, HZH = 0.887;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function plate(c, bias) {                           // white where the light is strong, light gray in the middle, mid gray in shade
  const ndl = c.nx * LX + c.ny * LY + c.nz * LZ;
  let t = 0.55 + 0.45 * ndl - 0.45 * (1 - c.ao) + bias + (c.bay - 0.5) * c.dith + 0.30 * (c.nz < 0 ? -c.nz : 0);
  const side = 1 - clamp(abs(c.nz) / 0.5, 0, 1);
  t -= 0.16 * side * (1 - clamp((c.ny - 0.2) / 0.5, 0, 1));
  if (c.nx * HXH + c.ny * HYH + c.nz * HZH > 0.955 + (c.bay - 0.5) * 0.03 && c.ao > 0.8) return 6;
  if (t > 0.80) return 6;
  if (t > 0.30) return c.hh < 0.5 ? 0 : 7;
  return 1;
}
function tagOf(f, c) {                              // cube tag of a surface feature
  switch (f) {
    case FT.PLATE: return plate(c, 0.12);
    case FT.PLATE_G: return plate(c, -0.04);
    case FT.TRIM: return 2;
    case FT.METAL: return 1;
    case FT.GLASS: return 5;
    case FT.RIM: return 7;
    case FT.EYE: case FT.MOUTH: case FT.CORE: case FT.BEAD: case FT.FLAME: case FT.SAT_A: return 3;
    case FT.CATCH: case FT.CORE_RING: case FT.SAT_W: return 6;
    case FT.BLUE: case FT.SAT_B: return 4;
    case FT.BLUE_RING: return 7;
    case FT.SEAM: return 2;
    default: return 0;
  }
}

// ======================================================================================================================================
// The model. hd is the detail pitch: 0.0085 for the smooth mesh, the cube pitch for the cubes (thin lines and small parts grow with it).
// Every part is { part, box, d, feat, partFn }: d is its signed distance (with the carved and raised details), feat gives the feature of a
// surface point, part the animation part. The union is the minimum of the parts. Lines and steps have soft edges (about one voxel) so
// that the mesh stays clean; the features themselves are crisp.
// ======================================================================================================================================
function makeModel(hd) {
  const fine = hd < 0.0125;
  const U = fine ? 0.010 : max(0.010, hd);              // depth of a seam
  const RL = fine ? 0.011 : max(0.011, 0.9 * hd);       // height of a raised plate
  const W = fine ? 0.018 : max(0.018, 1.3 * hd);        // width of a seam line
  const SE = fine ? 0.0035 : max(0.0035, 0.3 * hd);     // half width of the soft edge of a line or a step
  const gr = (sd) => (sd >= SE ? 0 : sd <= -SE ? 1 : 1 - sstep(-SE, SE, sd));      // 1 inside a line (sd < 0), 0 outside, soft edge
  const comps = [];
  const add = (part, box, d, feat, partFn) => comps.push({ id: comps.length, part, x0: box[0], x1: box[1], y0: box[2], y1: box[3], z0: box[4], z1: box[5], d, feat, partFn: partFn || null });

  // ======================= HEAD (tilted a little, ears and eyes ride on it) =======================
  const HF = new Frame([0, 0.40, 0], euler(0.09, -0.07, -0.02));
  const HX = 0.655, HY = 0.50, HZ = 0.50, HRAD = 0.36;
  const VIS = { cy: -0.05, hx: 0.515, hy: 0.30, r: 0.245 };
  const EYE = { x: 0.205, y: -0.01, hx: 0.083, hy: 0.125, r: 0.078 };
  const EAR = { x: 0.68, y: -0.045, r: 0.215, t: 0.065, rr: 0.032 };
  const EPH = 0.30, eca = cos(EPH), esa = sin(EPH);     // the ears turn a little toward the viewer
  const bz = fine ? 0.034 : max(0.034, 1.1 * hd);       // metal bezel around the glass
  const GKW = fine ? 0.013 : max(0.013, 0.7 * hd);      // dark gasket between glass and bezel
  const GD0 = fine ? 0.024 : max(0.024, 1.6 * hd);      // recess of the glass
  const GKD = GD0 * 0.7;                                // recess of the gasket
  const GB = fine ? 0.018 : max(0.018, 0.6 * hd);       // the glass is convex like a lens
  const LENS = fine ? 0.019 : max(0.019, 0.9 * hd);     // the eyes stand proud of the glass
  const CL1 = fine ? 0.027 : max(0.027, 0.8 * hd);      // catch lights
  const CL2 = fine ? 0.0115 : 0;
  const TM = fine ? 0.0125 : max(0.0125, 0.55 * hd);    // half thickness of the smile
  const MC = -0.025, MRAD = 0.20, MTH = 0.50;           // the smile is an arc: centre height, radius, half angle
  const MEX = MRAD * sin(MTH), MEY = MC - MRAD * cos(MTH);
  const ERS = EAR.r + 0.043;                            // seam ring around each ear module
  const BLY = VIS.cy - VIS.hy - bz - W * 0.5;           // the parting line of the face plate continues around the head
  const BP_R = 0.19, BP_IN = 0.10, CAP_R = 0.092;       // back plate, antenna cap
  const TRIM_DY = W * 0.5 + 0.016, TRIM_W = fine ? 0.0085 : max(0.0085, 0.4 * hd);        // silver trim along the parting line of the head
  const SOCK_R = 0.172, SOCK_Y = 0.04;                  // the socket under the head where the neck goes (world frame: the neck stays put, the head can turn)
  const Z_PLATE = 0, Z_GROOVE = 1, Z_BEZEL = 2, Z_GASKET = 3, Z_GLASS = 4, Z_EYE = 5, Z_CATCH = 6, Z_MOUTH = 7;
  let zv = 0, ze = 0;
  function face(lx, ly) {
    const v = rrect(lx, ly - VIS.cy, VIS.hx, VIS.hy, VIS.r);
    zv = v;
    if (v > bz + W + SE) return Z_PLATE;
    if (v > bz - SE) return Z_GROOVE;
    if (v > 0) return Z_BEZEL;
    if (v > -GKW) return Z_GASKET;
    const sg = lx < 0 ? -1 : 1;
    const ey = ly - EYE.y;
    const e = rrect(abs(lx) - EYE.x, ey, EYE.hx, EYE.hy, EYE.r);
    ze = e;
    if (e < 0) {
      const qx = lx - (sg * EYE.x - 0.030), qy = ey - 0.052;
      if (qx * qx + qy * qy < CL1 * CL1) return Z_CATCH;
      if (CL2 > 0) { const px = lx - (sg * EYE.x + 0.034), py = ey + 0.062; if (px * px + py * py < CL2 * CL2) return Z_CATCH; }
      return Z_EYE;
    }
    if (lx * lx < 0.0170 && ly < -0.15 && ly > -0.275) {
      const dy = ly - MC;
      const a = atan2(abs(lx), -dy);
      let dm;
      if (a <= MTH) dm = abs(sqrt(lx * lx + dy * dy) - MRAD);
      else { const qx = abs(lx) - MEX, qy = ly - MEY; dm = sqrt(qx * qx + qy * qy); }
      if (dm < TM) { ze = dm; return Z_MOUTH; }
    }
    return Z_GLASS;
  }
  const glassDepth = (lx, ly) => {
    const a = lx / VIS.hx, b = (ly - VIS.cy) / VIS.hy;
    return GD0 - GB * max(0, 1 - a * a - b * b);
  };
  function faceOff(zn, lx, ly) {
    switch (zn) {
      case Z_GROOVE: {
        const t = zv / bz;
        return U * gr(abs(zv - (bz + W * 0.5)) - W * 0.5) - (t < 1 ? RL * clamp(min(t, 1 - t) * 3.3, 0, 1) : 0);
      }
      case Z_BEZEL: { const t = zv / bz; return -RL * clamp(min(t, 1 - t) * 3.3, 0, 1); }
      case Z_GASKET: return GKD;
      case Z_GLASS: return glassDepth(lx, ly);
      case Z_EYE: case Z_CATCH: return glassDepth(lx, ly) - LENS * sstep(0, -0.03, ze);
      case Z_MOUTH: return glassDepth(lx, ly) - 0.008 * sstep(TM, TM * 0.3, ze);
      default: return 0;
    }
  }
  // the seams of the shell: the parting line, a ring around each ear, the antenna cap and the back plate (sd < 0 inside a line)
  function seamSD(lx, ly, lz) {
    let sd = abs(ly - BLY) - W * 0.5;
    const s = lx < 0 ? -1 : 1;
    const pcx = lx - s * EAR.x, pcy = ly - EAR.y;
    const ex = s * eca * pcx + esa * lz;
    if (ex < 0.08) { const ez = -esa * pcx + s * eca * lz; sd = min(sd, abs(sqrt(pcy * pcy + ez * ez) - ERS) - W * 0.5); }
    if (lz < -0.1) { const rr = sqrt(lx * lx + ly * ly); sd = min(sd, abs(rr - BP_R) - W * 0.5); }
    if (ly > 0.28) { const rr = sqrt(lx * lx + lz * lz); sd = min(sd, abs(rr - CAP_R) - W * 0.5); }
    return sd;
  }
  const headD = (x, y, z) => {
    HF.to(x, y, z);
    const lx = HF.lx, ly = HF.ly, lz = HF.lz;
    const hs = 1 - 0.055 * clamp(ly / HY, -1, 1);                       // egg: narrower at the forehead, wider at the cheeks
    let d = rbox(lx / hs, ly, lz / hs, HX, HY, HZ, HRAD) * (0.5 + 0.5 * hs);
    if (y < SOCK_Y + 0.04) { const rr = sqrt(x * x + z * z); if (rr < SOCK_R + 0.04) { const cav = max(rr - SOCK_R, y - SOCK_Y); if (-cav > d) d = -cav; } }
    if (d > 0.05 || d < -0.06) return d;
    if (lz > 0.1) {
      const zn = face(lx, ly);
      if (zn !== Z_PLATE) return d + faceOff(zn, lx, ly);
    }
    let off = U * gr(seamSD(lx, ly, lz));
    if (lz < -0.1) off -= RL * (1 - sstep(BP_IN - SE, BP_IN + SE, sqrt(lx * lx + ly * ly)));       // the raised inner disc of the back plate
    off -= RL * 0.7 * gr(abs(ly - (BLY + TRIM_DY)) - TRIM_W);                                       // a thin silver trim above the parting line
    return d + off;
  };
  const headF = (x, y, z) => {
    HF.to(x, y, z);
    const lx = HF.lx, ly = HF.ly, lz = HF.lz;
    if (y < SOCK_Y + 0.02 && sqrt(x * x + z * z) < SOCK_R + 0.02) return FT.TRIM;
    if (lz > 0.1) {
      switch (face(lx, ly)) {
        case Z_BEZEL: return FT.RIM;
        case Z_GROOVE: return zv < bz ? FT.RIM : zv <= bz + W ? FT.SEAM : FT.PLATE;
        case Z_GASKET: return FT.TRIM;
        case Z_GLASS: return FT.GLASS;
        case Z_EYE: return FT.EYE;
        case Z_CATCH: return FT.CATCH;
        case Z_MOUTH: return FT.MOUTH;
        default: break;
      }
    }
    if (seamSD(lx, ly, lz) < 0) return FT.SEAM;
    if (lz < -0.1 && sqrt(lx * lx + ly * ly) < BP_IN) return FT.BLUE;
    if (abs(ly - (BLY + TRIM_DY)) < TRIM_W) return FT.RIM;
    return FT.PLATE;
  };
  const headP = (x, y, z) => {                         // the eyes are their own parts (they blink)
    HF.to(x, y, z);
    if (HF.lz > 0.1) { const zn = face(HF.lx, HF.ly); if (zn === Z_EYE || zn === Z_CATCH) return HF.lx < 0 ? PT.EYE_L : PT.EYE_R; }
    return PT.HEAD;
  };
  add(PT.HEAD, HF.box([0, 0, 0], [HX * 1.06 + 0.02, HY + 0.03, HZ + 0.03]), headD, headF, headP);

  // ears: two blue modules turned a little toward the viewer, with fine rings, a silver edge and a white cap
  const CAPR = 0.075;
  const earSeams = fine ? [0.150, 0.127] : [];
  for (const s of [-1, 1]) {
    const earLocal = (x, y, z) => {                    // -> ex along the axis, rad from the axis
      HF.to(x, y, z);
      const pcx = HF.lx - s * EAR.x, pcy = HF.ly - EAR.y;
      const ez = -esa * pcx + s * eca * HF.lz;
      return [s * eca * pcx + esa * HF.lz, sqrt(pcy * pcy + ez * ez)];
    };
    const earD = (x, y, z) => {
      HF.to(x, y, z);
      const pcx = HF.lx - s * EAR.x, pcy = HF.ly - EAR.y;
      const ex = s * eca * pcx + esa * HF.lz, ez = -esa * pcx + s * eca * HF.lz;
      const rad = sqrt(pcy * pcy + ez * ez);
      const d = rcyl(rad, ex, EAR.r, EAR.t, EAR.rr);
      if (ex > 0.02 && d > -0.05 && d < 0.05 && rad < EAR.r - EAR.rr + 0.004) {
        let off = -RL * 1.1 * (1 - sstep(CAPR - SE, CAPR + SE, rad)) * max(0, 1 - (rad / CAPR) * (rad / CAPR));
        off += U * gr(abs(rad - (CAPR + W * 0.4)) - W * 0.4);
        for (let k = 0; k < earSeams.length; k++) off += U * 0.8 * gr(abs(rad - earSeams[k]) - W * 0.35);
        off += U * gr(abs(rad - 0.176) - W * 0.45);
        return d + off;
      }
      return d;
    };
    const earF = (x, y, z) => {
      const [ex, rad] = earLocal(x, y, z);
      if (ex > EAR.t - EAR.rr * 1.3 && rad > EAR.r - EAR.rr * 1.3) return FT.BLUE_RING;      // the silver edge of the outer face
      if (ex < EAR.t - 0.02) return FT.BLUE;                                                  // the barrel and the back
      if (rad < CAPR) return FT.PLATE;
      if (abs(rad - (CAPR + W * 0.4)) < W * 0.4) return FT.SEAM;
      for (let k = 0; k < earSeams.length; k++) if (abs(rad - earSeams[k]) < W * 0.35) return FT.SEAM;
      if (abs(rad - 0.176) < W * 0.45) return FT.SEAM;
      return FT.BLUE;
    };
    add(PT.HEAD, HF.box([s * EAR.x, EAR.y, 0.02], [0.20, EAR.r + 0.03, 0.27]), earD, earF);
  }

  // antenna: graphite collar on the head, a slender brushed metal stem, an amber bead (the stem and the bead sway, part 5)
  const rs = fine ? 0.016 : max(0.016, 0.85 * hd);
  const rb = fine ? 0.050 : max(0.050, 1.2 * hd);
  const AN = [[0, 0.50, 0], [0.004, 0.545, 0], [0.019, 0.584, 0], [0.034, 0.606, 0]];
  const BEAD = [0.040, 0.636, 0];
  add(PT.HEAD, HF.box([0, 0.508, 0], [0.07, 0.03, 0.07]), (x, y, z) => {
    HF.to(x, y, z);
    return rcyl(sqrt(HF.lx * HF.lx + HF.lz * HF.lz), HF.ly - 0.506, 0.052, 0.016, 0.01);
  }, () => FT.TRIM);
  add(PT.ANTENNA, HF.box([0.02, 0.57, 0], [0.05, 0.09, 0.04]), (x, y, z) => {
    HF.to(x, y, z);
    let d = BIG;
    for (let i = 0; i < 3; i++) d = min(d, capsule(HF.lx, HF.ly, HF.lz, AN[i][0], AN[i][1], AN[i][2], AN[i + 1][0], AN[i + 1][1], AN[i + 1][2], rs));
    return d;
  }, () => FT.METAL);
  add(PT.ANTENNA, HF.box(BEAD, [rb + 0.01, rb + 0.01, rb + 0.01]), (x, y, z) => {
    HF.to(x, y, z);
    const dx = HF.lx - BEAD[0], dy = HF.ly - BEAD[1], dz = HF.lz - BEAD[2];
    return sqrt(dx * dx + dy * dy + dz * dz) - rb;
  }, () => FT.BEAD);

  // ======================= NECK AND COLLAR (static) =======================
  const NECK_Y = -0.15;
  add(PT.BODY, boxC(0, NECK_Y, 0, 0.15, 0.13, 0.15), (x, y, z) => {
    const rad = sqrt(x * x + z * z);
    let d = rcyl(rad, y - NECK_Y, 0.118, 0.11, 0.02);
    if (abs(y + 0.135) < 0.012) d = min(d, rcyl(rad, y + 0.135, 0.134, 0.011, 0.008));
    return d;
  }, (x, y, z) => (abs(y + 0.135) < 0.013 ? FT.METAL : FT.TRIM));
  const COL_Y = -0.215;
  add(PT.BODY, boxC(0, COL_Y, 0, 0.23, 0.04, 0.23), (x, y, z) => rcyl(sqrt(x * x + z * z), y - COL_Y, 0.205, 0.022, 0.018), () => FT.METAL);

  // ======================= TORSO (static) =======================
  const TOR = { cy: -0.49, hx: 0.335, hy: 0.29, hz: 0.275, r: 0.225, taper: 0.10 };
  const tScale = (y) => { const t = clamp((TOR.cy + TOR.hy - y) / (2 * TOR.hy), 0, 1); return 1 - TOR.taper * t * (0.4 + 0.6 * t); };
  const CHY = -0.355, CPX = 0.185, CPY = 0.145, CPR = 0.06;     // chest panel
  const CORE_R = 0.060, CRING_R = 0.100;
  const BELT_Y = -0.625, BELT_H = 0.026;
  const SIDE = 0.262;
  const SH = [{ x: -0.372, y: -0.297, z: -0.01 }, { x: 0.372, y: -0.297, z: -0.01 }];
  const SHR = 0.095;
  const BK_X = 0.13, BK_Y = 0.10;
  const BKL = fine ? 0.03 : max(0.03, 0.9 * hd);
  function torsoSeamSD(x, y, z, s) {                   // sd < 0 inside a seam line of the torso
    let sd = abs(abs(y - BELT_Y) - (BELT_H + W * 0.55)) - W * 0.45;
    if (y < BELT_Y - 0.07 && y > -0.74 && z > 0) sd = min(sd, abs(x) - W * 0.5);
    if (z > -0.05 && y > BELT_Y + 0.07 && y < -0.215) {
      const px = x / s, py = y - CHY;
      if (rrect(px, py, CPX, CPY, CPR) > W + SE) sd = min(sd, abs(abs(px) - SIDE) - W * 0.5);
    }
    for (let k = 0; k < 2; k++) {                      // a ring seam around each shoulder socket
      const dx = x - SH[k].x, dy = y - SH[k].y, dz = z - SH[k].z, ds = sqrt(dx * dx + dy * dy + dz * dz);
      if (ds < SHR + 0.06) sd = min(sd, abs(ds - (SHR + 0.012 + W * 0.5)) - W * 0.5);
    }
    return sd;
  }
  const torsoD = (x, y, z) => {
    const s = tScale(y);
    const d = rbox(x / s, y - TOR.cy, z / s, TOR.hx, TOR.hy, TOR.hz, TOR.r) * (0.5 + 0.5 * s);
    if (d > 0.05 || d < -0.06) return d;
    const px = x / s;
    let off = 0;
    if (z > 0.1) {
      const py = y - CHY;
      const v = rrect(px, py, CPX, CPY, CPR);
      if (v < W + SE) {
        off = -RL * (1 - sstep(-SE, SE, v)) + U * gr(abs(v - W * 0.5) - W * 0.5);
        if (v < SE) {
          const r = sqrt(px * px + py * py);
          const ringM = 1 - sstep(CRING_R - SE, CRING_R + SE, r), coreM = 1 - sstep(CORE_R - SE, CORE_R + SE, r);
          off += -0.014 * ringM * (1 - coreM) - coreM * (0.003 + 0.010 * max(0, 1 - (r / CORE_R) * (r / CORE_R)));
          off += U * 0.7 * gr(abs(r - (CRING_R + W * 0.35)) - W * 0.35);
        }
      }
    } else if (z < -0.1) {
      const py = y + 0.33;
      off = -RL * (1 - sstep(-SE, SE, rrect(px, py, BK_X, BK_Y, 0.05)));
    }
    off -= RL * 0.9 * (1 - sstep(BELT_H - SE, BELT_H + SE, abs(y - BELT_Y)));          // the belt
    off += U * 0.8 * gr(torsoSeamSD(x, y, z, s));
    return d + off;
  };
  const torsoF = (x, y, z) => {
    const s = tScale(y);
    const px = x / s;
    if (z > 0.1) {
      const py = y - CHY;
      const v = rrect(px, py, CPX, CPY, CPR);
      if (v < W) {
        if (v > 0) return FT.SEAM;
        const r = sqrt(px * px + py * py);
        if (r < CORE_R) return FT.CORE;
        if (r < CRING_R) return FT.CORE_RING;
        if (r < CRING_R + W * 0.7) return FT.SEAM;
        return FT.BLUE;
      }
    } else if (z < -0.1) {
      const py = y + 0.33;
      if (rrect(px, py, BK_X, BK_Y, 0.05) < 0) {
        const dx = px - 0.07, dy = py - 0.045;
        return sqrt(dx * dx + dy * dy) < BKL ? FT.CORE : FT.BLUE;
      }
    }
    if (abs(y - BELT_Y) < BELT_H) return FT.METAL;
    if (torsoSeamSD(x, y, z, s) < 0) return FT.SEAM;
    return y < BELT_Y ? FT.PLATE_G : FT.PLATE;
  };
  add(PT.BODY, boxC(0, TOR.cy, 0, TOR.hx + 0.04, TOR.hy + 0.04, TOR.hz + 0.04), torsoD, torsoF);

  // ======================= ARMS (static): shoulder ball, upper arm, elbow, forearm, wrist ball, socket =======================
  // the hands float beyond the socket with a clear gap. HANDS gives the palm centre P, the finger direction v and the palm side w.
  const HANDS = [
    { part: PT.HAND_L, P: [-0.70, -0.465, 0.19], v: nrm3([-0.30, -0.93, 0.22]), w: [0, 0, 1], E: [-0.505, -0.305, 0.04], spread: 0.10 },
    { part: PT.HAND_R, P: [0.79, -0.155, 0.20], v: nrm3([0.30, 0.94, 0.16]), w: [0, 0, 1], E: [0.515, -0.265, 0.04], spread: 0.20 },
  ];
  for (let k = 0; k < 2; k++) {
    const H = HANDS[k], S = [SH[k].x, SH[k].y, SH[k].z], E = H.E;
    const v = H.v, P = H.P;
    const Wb = [P[0] - 0.20 * v[0], P[1] - 0.20 * v[1], P[2] - 0.20 * v[2]];       // wrist ball
    const So = [P[0] - 0.162 * v[0], P[1] - 0.162 * v[1], P[2] - 0.162 * v[2]];    // socket centre, along v
    H.Wb = Wb; H.pivot = [P[0] - 0.132 * v[0], P[1] - 0.132 * v[1], P[2] - 0.132 * v[2]];
    const rUp = fine ? 0.060 : max(0.060, 0.9 * hd), rFo = fine ? 0.050 : max(0.050, 0.8 * hd), rEl = rUp * 1.15, rWr = rFo * 1.16;
    const sub = (x, y, z, out) => {                    // the sub-distances, out = [ball, upper, elbow, fore, wrist, socket]
      let dx = x - S[0], dy = y - S[1], dz = z - S[2];
      out[0] = sqrt(dx * dx + dy * dy + dz * dz) - SHR;
      out[1] = capsule(x, y, z, S[0], S[1], S[2], E[0], E[1], E[2], rUp);
      dx = x - E[0]; dy = y - E[1]; dz = z - E[2];
      out[2] = sqrt(dx * dx + dy * dy + dz * dz) - rEl;
      out[3] = capsule(x, y, z, E[0], E[1], E[2], Wb[0], Wb[1], Wb[2], rFo);
      dx = x - Wb[0]; dy = y - Wb[1]; dz = z - Wb[2];
      out[4] = sqrt(dx * dx + dy * dy + dz * dz) - rWr;
      dx = x - So[0]; dy = y - So[1]; dz = z - So[2];
      const ax = dx * v[0] + dy * v[1] + dz * v[2];
      const rad2 = dx * dx + dy * dy + dz * dz - ax * ax;
      out[5] = rcyl(sqrt(rad2 > 0 ? rad2 : 0), ax, rWr * 0.95, 0.021, 0.008);
    };
    const tmp = [0, 0, 0, 0, 0, 0];
    const ax0 = 0.78 * (k ? 1 : -1), ay0 = -0.62, az0 = 0.12, al0 = sqrt(ax0 * ax0 + ay0 * ay0 + az0 * az0);
    const ballSD = (x, y, z) => abs(((x - S[0]) * ax0 + (y - S[1]) * ay0 + (z - S[2]) * az0) / al0) - W * 0.45;      // the groove ring of the shoulder ball
    const armD = (x, y, z) => {
      sub(x, y, z, tmp);
      let d = min(min(tmp[0], tmp[1]), min(min(tmp[2], tmp[3]), min(tmp[4], tmp[5])));
      if (d < 0.03 && d > -0.04 && tmp[0] <= d + 0.001) d += U * 0.8 * gr(ballSD(x, y, z));
      return d;
    };
    const armF = (x, y, z) => {
      sub(x, y, z, tmp);
      let m = 0, best = tmp[0];
      for (let i = 1; i < 6; i++) if (tmp[i] < best) { best = tmp[i]; m = i; }
      if (m === 0) return ballSD(x, y, z) < 0 ? FT.SEAM : FT.METAL;
      if (m === 1 || m === 3) return FT.PLATE;
      if (m === 5) { const dx = x - So[0], dy = y - So[1], dz = z - So[2]; return dx * v[0] + dy * v[1] + dz * v[2] > 0.010 ? FT.TRIM : FT.METAL; }
      return FT.METAL;
    };
    const pad = 0.07;
    add(PT.BODY, [min(S[0], E[0], Wb[0], So[0]) - pad, max(S[0], E[0], Wb[0], So[0]) + pad, min(S[1], E[1], Wb[1], So[1]) - pad, max(S[1], E[1], Wb[1], So[1]) + pad,
      min(S[2], E[2], Wb[2], So[2]) - pad, max(S[2], E[2], Wb[2], So[2]) + pad], armD, armF);
  }

  // ======================= HANDS: blue cuff, white palm, three fingers and a thumb =======================
  const rf = fine ? 0.024 : max(0.024, 0.85 * hd);       // finger radius
  const sp = 2 * rf + (fine ? 0.018 : max(0.018, 0.9 * hd));
  const palmX = sp + rf * 0.95;
  const KN = 0.052;                                     // the knuckle line across the palm
  for (const H of HANDS) {
    const F = new Frame(H.P, frameVW(H.v, H.w));
    const lenF = [0.085, 0.104, 0.085];
    const CUFF_C = 0.082, CUFF_H = 0.030;                // the cuff overlaps the palm by 0.02 so that there is no thin neck between the two
    const cuffD = (u, v, w) => rcyl(sqrt(u * u + w * w), v + CUFF_C, 0.058, CUFF_H, 0.014);
    const palmD = (u, v, w) => rbox(u, v, w, palmX, 0.068, 0.042, 0.036);
    const rest = (u, v, w) => {
      let d = palmD(u, v, w);
      for (let i = 0; i < 3; i++) {
        const fu = (i - 1) * sp, a = (i - 1) * H.spread;
        d = min(d, capsule(u, v, w, fu, KN - 0.004, 0, fu + sin(a) * lenF[i], KN - 0.004 + cos(a) * lenF[i], 0.014, rf));
      }
      return min(d, capsule(u, v, w, -palmX + 0.022, 0.0, 0.012, -palmX - 0.062, 0.050, 0.026, rf * 1.1));      // thumb
    };
    const knuckle = (u, v, w) => (w > 0.005 ? max(abs(v - KN) - W * 0.4, abs(u) - (palmX - 0.01)) : BIG);
    const handD = (x, y, z) => {
      F.to(x, y, z);
      const u = F.lx, v = F.ly, w = F.lz;
      const r2 = u * u + v * v + w * w;
      if (r2 > 0.16) return sqrt(r2) - 0.27;
      let d = min(cuffD(u, v, w), rest(u, v, w));
      if (d < 0.02 && d > -0.03) d += U * 0.7 * gr(knuckle(u, v, w));
      return d;
    };
    const handF = (x, y, z) => {
      F.to(x, y, z);
      const u = F.lx, v = F.ly, w = F.lz;
      const dc = cuffD(u, v, w), dr = rest(u, v, w);
      if (dc < dr - 0.002 && dc < 0.02) return v + CUFF_C < -CUFF_H + 0.012 ? FT.BLUE_RING : FT.BLUE;      // the cuff, with a silver edge
      return knuckle(u, v, w) < 0 ? FT.SEAM : FT.PLATE;
    };
    H.F = F;
    add(H.part, F.box([0, 0.03, 0], [0.17, 0.20, 0.09]), handD, handF);
  }

  // ======================= HOVER RING AND ITS THREE SATELLITES (rigid, spins about its own tilted axis) =======================
  const RG = { cy: -0.625, R: 0.56, tilt: 0.16 };
  const RF = new Frame([0, RG.cy, 0], euler(0, 0, RG.tilt));
  const RA = fine ? 0.042 : max(0.042, 1.25 * hd), RB = fine ? 0.028 : max(0.028, 1.2 * hd);
  const SATR = fine ? 0.056 : max(0.056, 1.1 * hd);
  const SATS = [{ ang: 0.55, f: FT.SAT_A }, { ang: 2.40, f: FT.SAT_B }, { ang: 4.40, f: FT.SAT_W }];
  for (const s of SATS) { s.c = [RG.R * cos(s.ang), RB + 0.012, RG.R * sin(s.ang)]; }
  const NT = fine ? 18 : 0;
  const ringSeamSD = (rx, ry, rz, q) => {              // sd < 0 inside a seam of the ring: the top groove, the tick marks, the satellite sockets
    let sd = BIG;
    if (ry > 0.2 * RB) sd = abs(q) - W * 0.4;
    if (NT && q > 0.3 * RA && abs(ry) < 0.5 * RB) { const t = atan2(rz, rx) / (2 * PI) * NT; sd = min(sd, (abs(t - round(t)) - 0.09) * (2 * PI * RG.R / NT)); }
    for (let k = 0; k < 3; k++) {
      const dx = rx - SATS[k].c[0], dy = ry - SATS[k].c[1], dz = rz - SATS[k].c[2], ds = sqrt(dx * dx + dy * dy + dz * dz);
      if (ds < SATR + 0.05) sd = min(sd, abs(ds - (SATR + 0.005 + W * 0.45)) - W * 0.45);
    }
    return sd;
  };
  const ringD = (x, y, z) => {
    RF.to(x, y, z);
    const rx = RF.lx, ry = RF.ly, rz = RF.lz;
    const q = sqrt(rx * rx + rz * rz) - RG.R;
    let d = (sqrt((q / RA) * (q / RA) + (ry / RB) * (ry / RB)) - 1) * min(RA, RB);
    if (d < 0.03 && d > -0.03) d += U * 0.8 * gr(ringSeamSD(rx, ry, rz, q));
    for (let k = 0; k < 3; k++) {
      const dx = rx - SATS[k].c[0], dy = ry - SATS[k].c[1], dz = rz - SATS[k].c[2];
      const ds = sqrt(dx * dx + dy * dy + dz * dz) - SATR;
      if (ds < d) d = ds;
    }
    return d;
  };
  const ringF = (x, y, z) => {
    RF.to(x, y, z);
    const rx = RF.lx, ry = RF.ly, rz = RF.lz;
    let bk = -1, bd = BIG;
    for (let k = 0; k < 3; k++) {
      const dx = rx - SATS[k].c[0], dy = ry - SATS[k].c[1], dz = rz - SATS[k].c[2];
      const ds = sqrt(dx * dx + dy * dy + dz * dz) - SATR;
      if (ds < bd) { bd = ds; bk = k; }
    }
    const q = sqrt(rx * rx + rz * rz) - RG.R;
    const dr = (sqrt((q / RA) * (q / RA) + (ry / RB) * (ry / RB)) - 1) * min(RA, RB);
    if (bd < dr + 0.001 && bd < 0.02) return SATS[bk].f;
    if (ringSeamSD(rx, ry, rz, q) < 0) return FT.SEAM;
    if (q < -0.45 * RA) return FT.METAL;                // the inner face of the ring is brushed metal
    return FT.PLATE;
  };
  add(PT.RING, RF.box([0, 0, 0], [RG.R + RA + 0.06, 0.08 + SATR, RG.R + RA + 0.06]), ringD, ringF);

  // ======================= THRUSTER: graphite nozzle (static), soft flame and glow rings (part 6) =======================
  const NOZ_Y = -0.805;
  add(PT.BODY, boxC(0, NOZ_Y, 0, 0.12, 0.05, 0.12), (x, y, z) => {
    const rad = sqrt(x * x + z * z);
    let d = rcyl(rad, y - NOZ_Y, 0.092, 0.034, 0.022);
    if (abs(y - (NOZ_Y + 0.016)) < 0.008) d = min(d, rcyl(rad, 0, 0.101, 0.008, 0.006));
    return d;
  }, (x, y) => (abs(y - (NOZ_Y + 0.016)) < 0.011 ? FT.METAL : FT.TRIM));
  const FL_TOP = -0.835, FL_H = 0.18;
  const frR = fine ? 0.074 : max(0.074, 0.9 * hd), frT = fine ? 0.018 : max(0.018, 0.5 * hd);
  const EXH = [{ y: -1.03, R: 0.08, a: 0.026, b: 0.012 }, { y: -1.066, R: 0.108, a: 0.028, b: 0.012 }];
  add(PT.FLAME, boxC(0, -0.96, 0, 0.15, 0.135, 0.15), (x, y, z) => {
    let d = roundCone(sqrt(x * x + z * z), FL_TOP - y, frR, frT, FL_H);
    for (let k = 0; k < 2; k++) { const e = EXH[k]; const ee = etorus(x, y - e.y, z, e.R, max(e.a, 1.0 * hd * 0.9), max(e.b, 0.7 * hd)); if (ee < d) d = ee; }
    return d;
  }, () => FT.FLAME);

  // ---------- the union (parts far from a point are skipped: exact within 0.09 of the surface, which is all a mesher needs)
  const N = comps.length, MG = 0.09;
  const X0 = new Float64Array(N), X1 = new Float64Array(N), Y0 = new Float64Array(N), Y1 = new Float64Array(N), Z0 = new Float64Array(N), Z1 = new Float64Array(N);
  let bx0 = BIG, bx1 = -BIG, by0 = BIG, by1 = -BIG, bz0 = BIG, bz1 = -BIG;
  for (let i = 0; i < N; i++) {
    const c = comps[i];
    X0[i] = c.x0 - MG; X1[i] = c.x1 + MG; Y0[i] = c.y0 - MG; Y1[i] = c.y1 + MG; Z0[i] = c.z0 - MG; Z1[i] = c.z1 + MG;
    bx0 = min(bx0, c.x0); bx1 = max(bx1, c.x1); by0 = min(by0, c.y0); by1 = max(by1, c.y1); bz0 = min(bz0, c.z0); bz1 = max(bz1, c.z1);
  }
  const sdf = (x, y, z) => {
    let d = BIG;
    for (let i = 0; i < N; i++) {
      if (x < X0[i] || x > X1[i] || y < Y0[i] || y > Y1[i] || z < Z0[i] || z > Z1[i]) continue;
      const v = comps[i].d(x, y, z);
      if (v < d) d = v;
    }
    return d;
  };
  const nearest = (x, y, z) => {
    let d = BIG, bi = -1;
    for (let i = 0; i < N; i++) {
      if (x < X0[i] || x > X1[i] || y < Y0[i] || y > Y1[i] || z < Z0[i] || z > Z1[i]) continue;
      const v = comps[i].d(x, y, z);
      if (v < d) { d = v; bi = i; }
    }
    return bi;
  };
  const featureAt = (x, y, z) => { const i = nearest(x, y, z); return i < 0 ? FT.PLATE : comps[i].feat(x, y, z); };
  const partAt = (x, y, z) => { const i = nearest(x, y, z); if (i < 0) return PT.BODY; const c = comps[i]; return c.partFn ? c.partFn(x, y, z) : c.part; };
  // anti-aliased feature: the footprint of a vertex (a disc of radius 0.6 h in the tangent plane) is sampled, and the two most present features
  // come back with their weights, out = [idA, idB, wB] with wB in 0..0.5 (0 when the footprint holds one feature). Boundaries come out clean.
  const cnt = new Float64Array(FEATURES.length + 1);
  const SA = [[0, 0, 1.6], [1, 0, 1], [0.5, 0.866, 1], [-0.5, 0.866, 1], [-1, 0, 1], [-0.5, -0.866, 1], [0.5, -0.866, 1]];
  const blendAt = (x, y, z, nx, ny, nz, h, out) => {
    const r = 0.6 * (h || hd);
    let tx, ty, tz;
    if (abs(nx) <= abs(ny) && abs(nx) <= abs(nz)) { tx = 0; ty = -nz; tz = ny; } else if (abs(ny) <= abs(nz)) { tx = nz; ty = 0; tz = -nx; } else { tx = -ny; ty = nx; tz = 0; }
    const tl = sqrt(tx * tx + ty * ty + tz * tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
    cnt.fill(0);
    let tot = 0;
    for (let k = 0; k < 7; k++) {
      const a = SA[k][0] * r, b = SA[k][1] * r, w = SA[k][2];
      cnt[featureAt(x + tx * a + bx * b, y + ty * a + by * b, z + tz * a + bz * b)] += w; tot += w;
    }
    let ia = 0, ib = -1, wa = -1, wb = 0;
    for (let f = 0; f < FEATURES.length; f++) { const c = cnt[f]; if (c > wa) { ib = ia; wb = wa; ia = f; wa = c; } else if (c > wb) { ib = f; wb = c; } }
    out[0] = ia; out[1] = ib < 0 || wb <= 0 ? ia : ib; out[2] = wb > 0 ? wb / tot : 0;
    return out;
  };
  // ambient occlusion (1 = open, lower in crevices: under the chin, around the neck, between the fingers), from three samples of the field along the normal
  const AOS = [0.015, 0.04, 0.09], AOW = [0.4, 0.35, 0.25];
  const aoAt = (x, y, z, nx, ny, nz) => {
    let occ = 0;
    for (let k = 0; k < 3; k++) { const sk = AOS[k]; occ += AOW[k] * clamp((sk - sdf(x + nx * sk, y + ny * sk, z + nz * sk)) / sk, 0, 1); }
    return 1 - occ;
  };
  // a soft amber glow (0..1) on the glass around the eyes and the smile, for the renderer to add as a faint emission
  const glowAt = (x, y, z) => {
    HF.to(x, y, z);
    const lx = HF.lx, ly = HF.ly;
    if (HF.lz < 0.1 || abs(lx) > 0.5 || ly < -0.33 || ly > 0.25) return 0;
    const e = rrect(abs(lx) - EYE.x, ly - EYE.y, EYE.hx, EYE.hy, EYE.r);
    let g = e > 0 ? Math.exp(-e * e / (2 * 0.045 * 0.045)) : 1;
    if (lx * lx < 0.0170 && ly < -0.14 && ly > -0.29) {
      const dy = ly - MC, a = atan2(abs(lx), -dy);
      let dm; if (a <= MTH) dm = abs(sqrt(lx * lx + dy * dy) - MRAD); else { const qx = abs(lx) - MEX, qy = ly - MEY; dm = sqrt(qx * qx + qy * qy); }
      g = max(g, 0.6 * Math.exp(-dm * dm / (2 * 0.035 * 0.035)));
    }
    return g;
  };

  // ---------- the parts, with their pivots in the final frame
  const eyeC = (s) => HF.world(s * EYE.x, EYE.y, 0.49);
  const eyeUp = [HF.R[1], HF.R[4], HF.R[7]];                    // the eyes' vertical axis in the final frame (the head is a little rolled)
  const ringAxis = RF.world(0, 1, 0).map((v, i) => v - [RF.ox, RF.oy, RF.oz][i]);
  const partsTable = [
    { id: PT.BODY, name: 'body', pivot: [0, -0.40, 0], note: 'static torso, neck, collar, shoulder balls, arms and nozzle' },
    { id: PT.HEAD, name: 'head', pivot: [0, -0.03, 0], note: 'head shell with the ears and the antenna collar, pivot at the neck joint, clear for 0.3 rad about x and y and 0.2 rad about z' },
    { id: PT.HAND_L, name: 'handL', pivot: HANDS[0].pivot.slice(), parent: PT.BODY, palm: HANDS[0].P.slice(), fingers: HANDS[0].v.slice(), note: 'hand on the left of the screen, pivot at the wrist (middle of the gap), clear for 0.3 rad about any axis' },
    { id: PT.HAND_R, name: 'handR', pivot: HANDS[1].pivot.slice(), parent: PT.BODY, palm: HANDS[1].P.slice(), fingers: HANDS[1].v.slice(), note: 'the waving hand on the right of the screen' },
    { id: PT.RING, name: 'ring', pivot: [0, RG.cy, 0], center: [0, RG.cy, 0], axis: ringAxis, parent: PT.BODY, note: 'ring and its satellites, rigid, spins about axis through center' },
    { id: PT.ANTENNA, name: 'antenna', pivot: HF.world(0, 0.506, 0), parent: PT.HEAD, note: 'stem and bead, sways about its base' },
    { id: PT.FLAME, name: 'flame', pivot: [0, FL_TOP, 0], parent: PT.BODY, note: 'flame and glow rings, flickers about the nozzle exit' },
    { id: PT.EYE_L, name: 'eyeL', pivot: eyeC(-1), center: eyeC(-1), up: eyeUp, parent: PT.HEAD, note: 'lens of the eye on the left of the screen, blink by scaling y about center' },
    { id: PT.EYE_R, name: 'eyeR', pivot: eyeC(1), center: eyeC(1), up: eyeUp, parent: PT.HEAD, note: 'lens of the eye on the right of the screen' },
  ];
  // the arm rig for the animation: shoulder, elbow and wrist ball of each arm (index 0 is the left of the screen). The upper arm, the forearm, the wrist
  // ball and the socket are body mesh, so a renderer can skin them softly: rotate about the elbow beyond it, and about the shoulder beyond the ball.
  const rig = { shoulder: SH.map((q) => [q.x, q.y, q.z]), elbow: HANDS.map((h) => h.E.slice()), wrist: HANDS.map((h) => h.Wb.slice()) };
  return { comps, sdf, nearest, featureAt, blendAt, partAt, glowAt, aoAt, bbox: [bx0, by0, bz0, bx1, by1, bz1], parts: partsTable, rig };
}

// ======================================================================================================================================
// The smooth model for the mesher
// ======================================================================================================================================
export function smoothModel(opts = {}) {
  const M = makeModel(0.0085);
  const b = M.bbox, g = 0.05;
  const out = {
    sdf: M.sdf,                                                   // signed distance of the whole robot, negative inside, final frame
    bbox: [b[0] - g, b[1] - g, b[2] - g, b[3] + g, b[4] + g, b[5] + g],
    featureAt: M.featureAt,                                       // (x, y, z, nx, ny, nz) -> feature id, crisp, no light baked in
    blendAt: M.blendAt,                                           // (x, y, z, nx, ny, nz, h, out) -> out = [idA, idB, wB], anti-aliased boundaries (h is the mesh pitch)
    partAt: M.partAt,                                             // (x, y, z) -> part id for the animation
    glowAt: M.glowAt,                                             // (x, y, z) -> 0..1 soft glow on the glass around the eyes and the smile
    aoAt: M.aoAt,                                                 // (x, y, z, nx, ny, nz) -> 0..1 ambient occlusion (1 open), multiply the albedo by it
    parts: M.parts,
    rig: M.rig,                                                   // the arm joints (shoulder, elbow, wrist per arm) for the soft skinning of the arms
    features: FEATURES,
    frame: { yc: Y_CENTER },
  };
  if (opts.debug) { out.comps = M.comps; out.nearest = M.nearest; }
  return out;
}

// ======================================================================================================================================
// The small metallic cubes
// ======================================================================================================================================
const Y_CENTER = 0;                                               // the model already lives in the final frame, nothing to shift

function voxelize(h, layersWanted) {
  const model = makeModel(h);
  const comps = model.comps;
  const mar = 3.5 * h + 0.02;
  let I0 = BIG, I1 = -BIG, J0 = BIG, J1 = -BIG, K0 = BIG, K1 = -BIG;
  for (const c of comps) {
    c.i0 = ceil((c.x0 - mar) / h); c.i1 = floor((c.x1 + mar) / h); c.j0 = ceil((c.y0 - mar) / h); c.j1 = floor((c.y1 + mar) / h);
    c.k0 = ceil((c.z0 - mar) / h); c.k1 = floor((c.z1 + mar) / h);
    I0 = min(I0, c.i0); I1 = max(I1, c.i1); J0 = min(J0, c.j0); J1 = max(J1, c.j1); K0 = min(K0, c.k0); K1 = max(K1, c.k1);
  }
  I0--; I1++; J0--; J1++; K0--; K1++;
  const nx = I1 - I0 + 1, ny = J1 - J0 + 1, nz = K1 - K0 + 1, nxy = nx * ny, N = nx * ny * nz;
  const D = new Float32Array(N).fill(BIG);
  const M = new Uint8Array(N);
  // each part is sampled in blocks of S cells: a block whose eight corners are all far from the surface (and on the same side) is filled
  // without evaluating its cells, only the thin shell near the surface is sampled node by node
  const S = 4, thr = 1.25 * S * h * 1.7320508;
  for (const c of comps) {
    const d = c.d, id = c.id;
    for (let kb = c.k0; kb <= c.k1; kb += S) {
      const kE = min(kb + S - 1, c.k1);
      for (let jb = c.j0; jb <= c.j1; jb += S) {
        const jE = min(jb + S - 1, c.j1);
        for (let ib = c.i0; ib <= c.i1; ib += S) {
          const iE = min(ib + S - 1, c.i1);
          let neg = 0, mn = BIG;
          for (let q = 0; q < 8; q++) {
            const v = d(((q & 1) ? iE + 1 : ib) * h, ((q & 2) ? jE + 1 : jb) * h, ((q & 4) ? kE + 1 : kb) * h);
            if (v < 0) neg++;
            const av = v < 0 ? -v : v;
            if (av < mn) mn = av;
          }
          if (mn > thr && (neg === 0 || neg === 8)) {
            if (neg === 8) {
              for (let k = kb; k <= kE; k++) for (let j = jb; j <= jE; j++) {
                let q = (ib - I0) + nx * (j - J0) + nxy * (k - K0);
                for (let i = ib; i <= iE; i++, q++) if (-thr < D[q]) { D[q] = -thr; M[q] = id; }
              }
            }
            continue;
          }
          for (let k = kb; k <= kE; k++) {
            const z = k * h;
            for (let j = jb; j <= jE; j++) {
              const y = j * h;
              let q = (ib - I0) + nx * (j - J0) + nxy * (k - K0);
              for (let i = ib; i <= iE; i++, q++) {
                const v = d(i * h, y, z);
                if (v < D[q]) { D[q] = v; M[q] = id; }
              }
            }
          }
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
  const vox = { h, model, comps, I0, J0, K0, nx, ny, nz, nxy, D, M, depth: new Uint8Array(N).fill(255), layers: [skin], count: skin.length };
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
  const T = n > 120000 ? 2 : 1;                            // layers of the shell: the skin alone is watertight, the engine's breathing is tiny
  // 1. pitch calibration: the shell holds about KT / h^2 cubes (KT measured on this robot), one fine pass lands near 96 % of n, a second one corrects
  let h = sqrt((T === 1 ? 7.4 : T === 2 ? 14.0 : 20.0) / (0.96 * n));
  let vox = voxelize(h, T);
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
  const { model, comps, I0, J0, K0, nx, ny, nxy, D, M, layers } = vox;

  // 3. tags: skin voxels from the feature of the surface, backing voxels inherit from their parent in the layer above
  const tg = new Uint8Array(D.length);
  const ctx = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 1, ao: 1, bay: 0.5, hh: 0.5, dith: h < 0.025 ? 0.08 : 0.05 };
  const cl = (v) => (v > 3 * h ? 3 * h : v < -3 * h ? -3 * h : v);
  const sceneD = model.sdf;
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
    tg[c] = tagOf(comps[M[c]].feat(x, y, z, gx, gy, gz), ctx);
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

  // 4. output (the model is already in the final frame: no vertical shift), report the extent
  const pos = new Float32Array(3 * n), tag = new Uint8Array(n);
  let w = 0;
  for (let L = 0; L < layers.length; L++) {
    const lay = layers[L];
    for (let q = 0; q < lay.length; q++) {
      const c = lay[q];
      pos[w * 3] = ((c % nx) + I0) * h; pos[w * 3 + 1] = ((floor(c / nx) % ny) + J0) * h - Y_CENTER; pos[w * 3 + 2] = (floor(c / nxy) + K0) * h;
      tag[w] = tg[c];
      w++;
    }
  }
  let ex = 0, ey = 0, ez = 0;
  for (let q = 0; q < n; q++) { ex = max(ex, abs(pos[q * 3])); ey = max(ey, abs(pos[q * 3 + 1])); ez = max(ez, abs(pos[q * 3 + 2])); }
  const cube = h * 1.18;                                   // neighbouring cubes overlap a little
  return { pos, tag, cube, extent: [ex + cube / 2, ey + cube / 2, ez + cube / 2], pitch: h, skin: skin.length, frame: { yc: Y_CENTER } };
}

/** Older contract: the field at pitch h (detail grows with h), the box, and the cube tag of a surface point. */
export function field(h = 0.0125) {
  const M = makeModel(h);
  const ctx = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 1, ao: 1, bay: 0.5, hh: 0.5, dith: 0 };
  const tagAt = (x, y, z, nx = 0, ny = 0, nz = 1) => {
    ctx.x = x; ctx.y = y; ctx.z = z; ctx.nx = nx; ctx.ny = ny; ctx.nz = nz;
    return tagOf(M.featureAt(x, y, z), ctx);
  };
  const b = M.bbox, g = 0.05;
  return { sdf: M.sdf, bbox: [b[0] - g, b[1] - g, b[2] - g, b[3] + g, b[4] + g, b[5] + g], tagAt };
}
