// BlackPhage - voxel dioramas for the culture pages (science series).
// scene.html?scene=lab-bench | pipette-plate | data-wall | healthy-years
// Optional: &spp=32 (passes per pixel, default 8), &w=1200&h=800, &az=40&el=28 (camera), &fit=0, &glowless=1, &faces=1 (faster preview), &map=2048 (shadow map)
// Everything is built from unit cubes in a voxel grid, drawn as InstancedMesh cubes with MeshStandardMaterial.
// The render is progressive: every pass jitters the pixel grid (anti-aliasing) and the key light inside a small cone
// (true soft shadows), the passes are averaged in a float target, then composited over a white to Morning Haze gradient.
// No text anywhere in the images. Palette: Morning Haze, Cliff Mist, Timber Glow, Deep Canyon Blue, Shadow Pine and neutral grays.
import * as THREE from 'three';

const Q = new URLSearchParams(location.search);
const qn = (k, d) => (Q.has(k) ? +Q.get(k) : d);
const SCENE = Q.get('scene') || 'lab-bench';
const SPP = Math.max(1, Math.round(qn('spp', 8)));
const VW = Math.max(320, Math.round(qn('w', innerWidth))), VH = Math.max(240, Math.round(qn('h', innerHeight)));
const LOG = (...a) => console.log('ILLUST', ...a);

// ---------------------------------------------------------------------------------------------------- utils
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hash3(x, y, z, s = 0) {
  let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ Math.imul(s | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const rgbOf = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const hexOf = (r, g, b) => (clamp((r + 0.5) | 0, 0, 255) << 16) | (clamp((g + 0.5) | 0, 0, 255) << 8) | clamp((b + 0.5) | 0, 0, 255);
function mixc(a, b, t) { const A = rgbOf(a), B = rgbOf(b); return hexOf(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
const lighten = (c, t) => mixc(c, 0xffffff, t);
const darken = (c, t) => mixc(c, 0x10161a, t);
const S2L = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; S2L[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

// brand palette and neutrals (sRGB)
const C = {
  haze: 0xE7EEF0, mist: 0xC8D1D3, glow: 0xE0A35C, blue: 0x2A5F86, pine: 0x27463D,
  n0: 0xF7F9F9, n1: 0xEDF1F2, n2: 0xDFE6E8, n3: 0xC8D1D3, n4: 0xAAB5BA, n5: 0x8B979D, n6: 0x6A757C, n7: 0x4D575D, n8: 0x363E43, n9: 0x22292D,
  white: 0xF6F8F8, ink: 0x1F262A,
};

// paints: a number (0xRRGGBB), or P(hex, {j: jitter, glow: 0..1, glass: true}), or a function (x, y, z) => paint, or ERASE
const ERASE = { erase: true };
const P = (hex, o) => Object.assign({ hex }, o);
const GLOW = (hex, g = 1) => ({ hex, glow: g, j: 0.02 });
const GLASS = (hex) => ({ hex, glass: true, j: 0 });

// ---------------------------------------------------------------------------------------------------- voxel canvas
class Canvas3D {
  box(x, y, z, w, h, d, p) { for (let k = 0; k < d; k++) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.put(x + i, y + j, z + k, p); return this; }
  // rounded box: cells whose centre is inside a box of size w h d with corner radius r (all edges)
  rbox(x, y, z, w, h, d, r, p, mask = 7) {
    const cx = x + (w - 1) / 2, cy = y + (h - 1) / 2, cz = z + (d - 1) / 2, hx = w / 2, hy = h / 2, hz = d / 2;
    for (let k = 0; k < d; k++) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const qx = Math.abs(x + i - cx) - (hx - r), qy = Math.abs(y + j - cy) - (hy - r), qz = Math.abs(z + k - cz) - (hz - r);
      const ax = (mask & 1) ? Math.max(qx, 0) : 0, ay = (mask & 2) ? Math.max(qy, 0) : 0, az = (mask & 4) ? Math.max(qz, 0) : 0;
      if (Math.hypot(ax, ay, az) <= r + 0.001) this.put(x + i, y + j, z + k, p);
    }
    return this;
  }
  sph(cx, cy, cz, r, p) { return this.ell(cx, cy, cz, r, r, r, p); }
  ell(cx, cy, cz, rx, ry, rz, p) {
    for (let z = Math.ceil(cz - rz); z <= Math.floor(cz + rz); z++) for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) for (let x = Math.ceil(cx - rx); x <= Math.floor(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, dz = (z - cz) / rz;
      if (dx * dx + dy * dy + dz * dz <= 1.0001) this.put(x, y, z, p);
    }
    return this;
  }
  // vertical cylinder; centre (cx, cz) may be fractional; ri > 0 makes a tube
  cylY(cx, y, cz, h, r, p, ri = 0) {
    for (let z = Math.ceil(cz - r); z <= Math.floor(cz + r); z++) for (let x = Math.ceil(cx - r); x <= Math.floor(cx + r); x++) {
      const d = Math.hypot(x - cx, z - cz); if (d > r + 0.001 || d < ri - 0.001) continue;
      for (let j = 0; j < h; j++) this.put(x, y + j, z, p);
    }
    return this;
  }
  cylX(x, cy, cz, len, r, p, ri = 0) {
    for (let z = Math.ceil(cz - r); z <= Math.floor(cz + r); z++) for (let y = Math.ceil(cy - r); y <= Math.floor(cy + r); y++) {
      const d = Math.hypot(y - cy, z - cz); if (d > r + 0.001 || d < ri - 0.001) continue;
      for (let i = 0; i < len; i++) this.put(x + i, y, z, p);
    }
    return this;
  }
  cylZ(cx, cy, z, len, r, p, ri = 0) {
    for (let y = Math.ceil(cy - r); y <= Math.floor(cy + r); y++) for (let x = Math.ceil(cx - r); x <= Math.floor(cx + r); x++) {
      const d = Math.hypot(x - cx, y - cy); if (d > r + 0.001 || d < ri - 0.001) continue;
      for (let i = 0; i < len; i++) this.put(x, y, z + i, p);
    }
    return this;
  }
  // round tube along a segment (radius r) ; r1 optional for a taper
  line(x0, y0, z0, x1, y1, z1, r, p, r1 = r) {
    const R = Math.max(r, r1);
    const mnx = Math.floor(Math.min(x0, x1) - R), mxx = Math.ceil(Math.max(x0, x1) + R), mny = Math.floor(Math.min(y0, y1) - R), mxy = Math.ceil(Math.max(y0, y1) + R), mnz = Math.floor(Math.min(z0, z1) - R), mxz = Math.ceil(Math.max(z0, z1) + R);
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L2 = dx * dx + dy * dy + dz * dz || 1;
    for (let z = mnz; z <= mxz; z++) for (let y = mny; y <= mxy; y++) for (let x = mnx; x <= mxx; x++) {
      let t = ((x - x0) * dx + (y - y0) * dy + (z - z0) * dz) / L2; t = clamp(t, 0, 1);
      const px = x0 + dx * t - x, py = y0 + dy * t - y, pz = z0 + dz * t - z;
      if (px * px + py * py + pz * pz <= Math.pow(lerp(r, r1, t), 2) + 0.001) this.put(x, y, z, p);
    }
    return this;
  }
  // square-section limb along a segment: Chebyshev distance, gives blocky staircase limbs
  limb(x0, y0, z0, x1, y1, z1, r, p) {
    const mnx = Math.floor(Math.min(x0, x1) - r), mxx = Math.ceil(Math.max(x0, x1) + r), mny = Math.floor(Math.min(y0, y1) - r), mxy = Math.ceil(Math.max(y0, y1) + r), mnz = Math.floor(Math.min(z0, z1) - r), mxz = Math.ceil(Math.max(z0, z1) + r);
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L2 = dx * dx + dy * dy + dz * dz || 1;
    for (let z = mnz; z <= mxz; z++) for (let y = mny; y <= mxy; y++) for (let x = mnx; x <= mxx; x++) {
      let t = ((x - x0) * dx + (y - y0) * dy + (z - z0) * dz) / L2; t = clamp(t, 0, 1);
      const px = x0 + dx * t - x, py = y0 + dy * t - y, pz = z0 + dz * t - z;
      if (Math.max(Math.abs(px), Math.abs(py), Math.abs(pz)) <= r + 0.001) this.put(x, y, z, p);
    }
    return this;
  }
  // solid of revolution about a vertical axis: prof = [[y, r], ...] (y relative to y0, increasing)
  // mode 'solid' (default), 'shell' (cells outside the inner radius r - wall, plus `bottom` base rows) or 'core' (the inside only, above the base)
  lathe(cx, y0, cz, prof, p, o = {}) {
    const { wall = 0, bottom = 0, mode = 'solid', to = Infinity } = o;
    const yEnd = Math.min(prof[prof.length - 1][0], to);
    const rad = (yy) => { for (let i = 1; i < prof.length; i++) if (yy <= prof[i][0]) { const a = prof[i - 1], b = prof[i]; return lerp(a[1], b[1], (yy - a[0]) / ((b[0] - a[0]) || 1)); } return prof[prof.length - 1][1]; };
    for (let j = Math.ceil(prof[0][0]); j <= Math.floor(yEnd); j++) {
      const r = rad(j), rr = r + 0.5;
      for (let z = Math.ceil(cz - rr); z <= Math.floor(cz + rr); z++) for (let x = Math.ceil(cx - rr); x <= Math.floor(cx + rr); x++) {
        const d = Math.hypot(x - cx, z - cz); if (d > r + 0.001) continue;
        const inner = wall > 0 && d <= r - wall + 0.0005 && j >= bottom;
        if (mode === 'shell' && inner) continue;
        if (mode === 'core' && !(inner || (wall === 0 && j >= bottom))) continue;
        this.put(x, y0 + j, z, p);
      }
    }
    return this;
  }
  // fills every cell of a region with a paint only where predicate(x, y, z) is true
  fill(x, y, z, w, h, d, pred, p) { for (let k = 0; k < d; k++) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (pred(x + i, y + j, z + k)) this.put(x + i, y + j, z + k, p); return this; }
}

class World extends Canvas3D {
  constructor(sx, sy, sz) {
    super();
    this.sx = sx; this.sy = sy; this.sz = sz; this.ox = sx >> 1; this.oz = sz >> 1;
    const n = sx * sy * sz;
    this.occ = new Uint8Array(n);   // 0 air, 1 solid, 2 glass
    this.rgb = new Uint32Array(n);
    this.glw = new Uint8Array(n);
    this.j = 0.03;
  }
  idx(x, y, z) { const gx = x + this.ox, gz = z + this.oz; if (gx < 0 || gx >= this.sx || y < 0 || y >= this.sy || gz < 0 || gz >= this.sz) return -1; return gx + this.sx * (y + this.sy * gz); }
  put(x, y, z, p) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    const i = this.idx(x, y, z); if (i < 0) return;
    if (typeof p === 'function') p = p(x, y, z);
    if (p === null || p === undefined || p === ERASE) { this.occ[i] = 0; this.glw[i] = 0; return; }
    if (typeof p === 'number') p = { hex: p };
    const j = p.j !== undefined ? p.j : this.j;
    let hex = p.hex;
    if (j > 0) { const k = 1 + (hash3(x, y, z, 11) - 0.5) * 2 * j; hex = hexOf(((hex >> 16) & 255) * k, ((hex >> 8) & 255) * k, (hex & 255) * k); }
    this.occ[i] = p.glass ? 2 : 1; this.rgb[i] = hex; this.glw[i] = p.glow ? Math.round(clamp(p.glow, 0, 1) * 255) : 0;
  }
  at(x, y, z) { const i = this.idx(x, y, z); return i < 0 ? 0 : this.occ[i]; }
  colorAt(x, y, z) { const i = this.idx(x, y, z); return i < 0 ? 0 : this.rgb[i]; }
}

// a brush draws in a local frame: origin (ox, oy, oz), facing +z (rot 0), +x (1), -z (2) or -x (3); mirror flips local x
class Brush extends Canvas3D {
  constructor(W, ox, oy, oz, rot = 0, mirror = false) { super(); this.W = W; this.ox = ox; this.oy = oy; this.oz = oz; this.rot = rot; this.mirror = mirror; }
  map(x, y, z) {
    if (this.mirror) x = -x;
    switch (this.rot) {
      case 0: return [this.ox + x, this.oy + y, this.oz + z];
      case 1: return [this.ox + z, this.oy + y, this.oz - x];
      case 2: return [this.ox - x, this.oy + y, this.oz - z];
      default: return [this.ox - z, this.oy + y, this.oz + x];
    }
  }
  put(x, y, z, p) { if (typeof p === 'function') p = p(x, y, z); const m = this.map(x, y, z); this.W.put(m[0], m[1], m[2], p); }
  at(x, y, z) { const m = this.map(x, y, z); return this.W.at(m[0], m[1], m[2]); }
}

const SCENES = {};

// ---------------------------------------------------------------------------------------------------- volumes (occupancy for ambient occlusion)
function boxBlurAxis(src, nx, ny, nz, axis, r) {
  const dst = new Float32Array(src.length);
  const w = 1 / (2 * r + 1);
  const n = axis === 0 ? nx : axis === 1 ? ny : nz;
  const stride = axis === 0 ? 1 : axis === 1 ? nx : nx * ny;
  const A = axis === 0 ? ny : nx, B = axis === 2 ? ny : nz;      // the two other axes
  const sA = axis === 0 ? nx : 1, sB = axis === 2 ? nx : nx * ny;
  for (let b = 0; b < B; b++) for (let a = 0; a < A; a++) {
    const o = a * sA + b * sB;
    let s = 0;
    for (let k = -r; k <= r; k++) s += src[o + clamp(k, 0, n - 1) * stride];
    for (let i = 0; i < n; i++) {
      dst[o + i * stride] = s * w;
      s += src[o + Math.min(n - 1, i + r + 1) * stride] - src[o + Math.max(0, i - r) * stride];
    }
  }
  return dst;
}
function makeVolumes(W) {
  const { sx, sy, sz } = W, N = sx * sy * sz;
  const d = new Uint8Array(N);
  for (let i = 0; i < N; i++) d[i] = W.occ[i] === 1 ? 255 : 0;
  const tOcc = new THREE.Data3DTexture(d, sx, sy, sz);
  tOcc.format = THREE.RedFormat; tOcc.type = THREE.UnsignedByteType; tOcc.minFilter = tOcc.magFilter = THREE.NearestFilter; tOcc.unpackAlignment = 1; tOcc.needsUpdate = true;
  const bx = (sx + 1) >> 1, by = (sy + 1) >> 1, bz = (sz + 1) >> 1;
  let a = new Float32Array(bx * by * bz);
  for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) { let i = sx * (y + sy * z); const row = bx * ((y >> 1) + by * (z >> 1)); for (let x = 0; x < sx; x++, i++) if (d[i]) a[row + (x >> 1)] += 0.125; }
  for (let pass = 0; pass < 2; pass++) for (let ax = 0; ax < 3; ax++) a = boxBlurAxis(a, bx, by, bz, ax, 2);
  const u8 = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) u8[i] = Math.round(clamp(a[i], 0, 1) * 255);
  const tBlur = new THREE.Data3DTexture(u8, bx, by, bz);
  tBlur.format = THREE.RedFormat; tBlur.type = THREE.UnsignedByteType; tBlur.minFilter = tBlur.magFilter = THREE.LinearFilter; tBlur.unpackAlignment = 1; tBlur.needsUpdate = true;
  return { tOcc, tBlur, ext: new THREE.Vector3(bx * 2, by * 2, bz * 2) };
}

// ---------------------------------------------------------------------------------------------------- materials
const FRAG_PARS = /* glsl */ `
uniform highp sampler3D uOcc;
uniform highp sampler3D uBlur;
uniform vec3 uSize;
uniform vec3 uBlurExt;
uniform vec4 uAO;      // x fine AO on ambient, y broad AO strength, z fine AO on direct light, w edge darkening
uniform vec2 uEdge;    // x edge width in cube units
uniform float uGlowK;
varying vec3 vWP;
varying vec3 vWN;
varying float vGlow;
float vxO(vec3 c) {
  if (c.x < 0.0 || c.y < 0.0 || c.z < 0.0 || c.x >= uSize.x || c.y >= uSize.y || c.z >= uSize.z) return 0.0;
  return texelFetch(uOcc, ivec3(c), 0).r;
}
float vxC(float a, float b, float c) { return (a > 0.5 && b > 0.5) ? 0.0 : (3.0 - a - b - c) / 3.0; }
`;
const FRAG_COLOR = /* glsl */ `
#include <color_fragment>
vec3 vxn = floor(vWN + 0.5);
vec3 vxu = abs(vxn.y) > 0.5 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
vec3 vxw = cross(vxn, vxu);
vec3 vxc = floor(vWP + 0.5 + 0.25 * vxn);
vec3 vxq = vWP - vxc;
float vxtu = dot(vxq, vxu) + 0.5;
float vxtw = dot(vxq, vxw) + 0.5;
float vxs1 = vxO(vxc + vxu), vxs2 = vxO(vxc - vxu), vxs3 = vxO(vxc + vxw), vxs4 = vxO(vxc - vxw);
float vxk1 = vxO(vxc + vxu + vxw), vxk2 = vxO(vxc + vxu - vxw), vxk3 = vxO(vxc - vxu + vxw), vxk4 = vxO(vxc - vxu - vxw);
float vxa00 = vxC(vxs2, vxs4, vxk4), vxa10 = vxC(vxs1, vxs4, vxk2), vxa01 = vxC(vxs2, vxs3, vxk3), vxa11 = vxC(vxs1, vxs3, vxk1);
float vxFine = mix(mix(vxa00, vxa10, vxtu), mix(vxa01, vxa11, vxtu), vxtw);
vec3 vxp = vWP + 0.5;
float vxB = texture(uBlur, (vxp + vxn * 2.5) / uBlurExt).r * 0.5 + texture(uBlur, (vxp + vxn * 6.0) / uBlurExt).r * 0.5;
float vxBroad = 1.0 - clamp(vxB * uAO.y, 0.0, 0.92);
float vxe = min(min(vxtu, 1.0 - vxtu), min(vxtw, 1.0 - vxtw));
float vxEdge = smoothstep(0.0, uEdge.x, vxe);
vec3 vxBase = diffuseColor.rgb;
diffuseColor.rgb *= mix(1.0 - uAO.w, 1.0, vxEdge);
`;
function solidMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66, metalness: 0.0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlow;\nvarying float vGlow;\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (instanceMatrix * vec4(position, 1.0)).xyz; vWN = normal; vGlow = aGlow;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_PARS)
      .replace('#include <color_fragment>', FRAG_COLOR)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vxBase * vGlow * uGlowK;')
      .replace('#include <aomap_fragment>', `
        reflectedLight.indirectDiffuse *= mix(1.0, vxFine, uAO.x) * vxBroad;
        reflectedLight.directDiffuse *= mix(1.0, vxFine, uAO.z);
      `);
  };
  return m;
}
function glassMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.0, transparent: true, depthWrite: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uEdge = U.uEdge;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (instanceMatrix * vec4(position, 1.0)).xyz; vWN = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uEdge;\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 n = floor(vWN + 0.5);
          vec3 u = abs(n.y) > 0.5 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
          vec3 w = cross(n, u);
          vec3 c = floor(vWP + 0.5 + 0.25 * n);
          vec3 q = vWP - c;
          float tu = dot(q, u) + 0.5; float tw = dot(q, w) + 0.5;
          float e = min(min(tu, 1.0 - tu), min(tw, 1.0 - tw));
          float ed = 1.0 - smoothstep(0.0, uEdge.x * 1.8, e);
          diffuseColor.a = mix(0.22, 0.7, ed);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), ed * 0.5);
        }`);
  };
  return m;
}

// ---------------------------------------------------------------------------------------------------- the renderer
// Every voxel is a cube. Solid voxels are drawn as one InstancedMesh of BoxGeometry cubes (MeshStandardMaterial), keeping only the
// cubes that show a face to the camera or to the key light (hidden interiors and backs are skipped). Glass shells, which are one cube
// thick, are drawn as their exposed faces so that no inner wall shows through. With ?faces=1 the solids are also drawn as exposed
// faces (one InstancedMesh per face direction): the same picture, quicker previews in software GL.
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function collectFaces(W, wanted, glass) {
  const { sx, sy, sz, occ } = W, sxy = sx * sy, lists = DIRS.map(() => []);
  const off = [1, -1, sx, -sx, sxy, -sxy];
  const want = (glass ? 2 : 1);
  for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) {
    let i = sx * (y + sy * z);
    for (let x = 0; x < sx; x++, i++) {
      if (occ[i] !== want) continue;
      for (let d = 0; d < 6; d++) {
        if (!wanted[d]) continue;
        let n = 0;
        switch (d) { case 0: n = x < sx - 1 ? occ[i + 1] : 0; break; case 1: n = x > 0 ? occ[i - 1] : 0; break; case 2: n = y < sy - 1 ? occ[i + sx] : 0; break; case 3: n = y > 0 ? occ[i - sx] : 0; break; case 4: n = z < sz - 1 ? occ[i + sxy] : 0; break; default: n = z > 0 ? occ[i - sxy] : 0; }
        if (glass ? n === 0 : n !== 1) lists[d].push(i);
      }
    }
  }
  return lists;
}
function faceGeometry(d) {
  const g = new THREE.PlaneGeometry(1, 1); g.deleteAttribute('uv'); g.translate(0, 0, 0.5);
  const n = DIRS[d];
  if (n[0] === 1) g.rotateY(Math.PI / 2); else if (n[0] === -1) g.rotateY(-Math.PI / 2); else if (n[1] === 1) g.rotateX(-Math.PI / 2); else if (n[1] === -1) g.rotateX(Math.PI / 2); else if (n[2] === -1) g.rotateY(Math.PI);
  return g;
}
function makeFaces(W, list, d, mat, glowAttr) {
  const { sx, sy } = W, n = list.length;
  const geo = faceGeometry(d);
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  mesh.count = n;
  const m = mesh.instanceMatrix.array, col = new Float32Array(3 * Math.max(1, n)), glow = new Float32Array(Math.max(1, n));
  for (let k = 0; k < n; k++) {
    const i = list[k], x = i % sx, t = (i / sx) | 0, y = t % sy, z = (t / sy) | 0, o = 16 * k;
    m[o] = 1; m[o + 5] = 1; m[o + 10] = 1; m[o + 15] = 1; m[o + 12] = x; m[o + 13] = y; m[o + 14] = z;
    const h = W.rgb[i]; col[3 * k] = S2L[(h >> 16) & 255]; col[3 * k + 1] = S2L[(h >> 8) & 255]; col[3 * k + 2] = S2L[h & 255];
    glow[k] = W.glw[i] / 255;
  }
  mesh.instanceColor = new THREE.InstancedBufferAttribute(col, 3);
  if (glowAttr) geo.setAttribute('aGlow', new THREE.InstancedBufferAttribute(glow, 1));
  mesh.frustumCulled = false;
  return mesh;
}
// Full cubes (BoxGeometry, one InstancedMesh per material). ?faces=1 switches to exposed faces only (identical picture, quicker previews in software GL).
function makeCubes(W, list, mat, glowAttr) {
  const { sx, sy } = W, n = list.length;
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.deleteAttribute('uv');
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  mesh.count = n;
  const m = mesh.instanceMatrix.array, col = new Float32Array(3 * Math.max(1, n)), glow = new Float32Array(Math.max(1, n));
  for (let k = 0; k < n; k++) {
    const i = list[k], x = i % sx, t = (i / sx) | 0, y = t % sy, z = (t / sy) | 0, o = 16 * k;
    m[o] = 1; m[o + 5] = 1; m[o + 10] = 1; m[o + 15] = 1; m[o + 12] = x; m[o + 13] = y; m[o + 14] = z;
    const h = W.rgb[i]; col[3 * k] = S2L[(h >> 16) & 255]; col[3 * k + 1] = S2L[(h >> 8) & 255]; col[3 * k + 2] = S2L[h & 255];
    glow[k] = W.glw[i] / 255;
  }
  mesh.instanceColor = new THREE.InstancedBufferAttribute(col, 3);
  if (glowAttr) geo.setAttribute('aGlow', new THREE.InstancedBufferAttribute(glow, 1));
  mesh.frustumCulled = false;
  return mesh;
}
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = (i / b) | 0; } return r; };

async function renderWorld(W, cfg) {
  const t0 = performance.now();
  const canvas = document.getElementById('c');
  canvas.style.width = VW + 'px'; canvas.style.height = VH + 'px';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(VW, VH, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();

  // directions of the key light and of the camera (needed to know which cube faces can ever be seen or lit)
  const lt = cfg.light || {};
  const keyDir = new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 - THREE.MathUtils.degToRad(lt.el ?? 52), THREE.MathUtils.degToRad(lt.az ?? -38));
  // (x = sin az cos el, z = cos az cos el: az 0 is +z, positive az turns toward +x)
  const cm = cfg.cam || {};
  const az = THREE.MathUtils.degToRad(qn('az', cm.az ?? 38)), el = THREE.MathUtils.degToRad(qn('el', cm.el ?? 28)), fov = cm.fov ?? 20;
  const camDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const dot3 = (d, v) => d[0] * v.x + d[1] * v.y + d[2] * v.z;
  const camFacing = DIRS.map((d) => dot3(d, camDir) > -0.1), litFacing = DIRS.map((d) => dot3(d, keyDir) > -0.1);
  const wanted = DIRS.map((d, i) => camFacing[i] || litFacing[i]);

  // geometry
  const vol = makeVolumes(W);
  const U = {
    uOcc: { value: vol.tOcc }, uBlur: { value: vol.tBlur }, uSize: { value: new THREE.Vector3(W.sx, W.sy, W.sz) }, uBlurExt: { value: vol.ext },
    uAO: { value: new THREE.Vector4(qn('aof', cfg.aoFine ?? 0.9), qn('aob', cfg.aoBroad ?? 1.5), qn('aod', cfg.aoDirect ?? 0.35), qn('edge', cfg.edgeDark ?? 0.1)) }, uEdge: { value: new THREE.Vector2(cfg.edgeW ?? 0.14, 0) }, uGlowK: { value: cfg.glowK ?? 0.9 },
  };
  const solidMat = solidMaterial(U); solidMat.shadowSide = THREE.FrontSide;
  const glassMat = glassMaterial(U);
  const solidLists = collectFaces(W, wanted, false), glassLists = collectFaces(W, camFacing, true);
  const solidMeshes = [], glassMeshes = [];
  let nSolid = 0, nGlass = 0;
  for (let d = 0; d < 6; d++) {
    if (wanted[d] && solidLists[d].length) { const m = makeFaces(W, solidLists[d], d, solidMat, true); m.userData.d = d; m.castShadow = litFacing[d] && !qn('noshadow', 0); m.receiveShadow = true; scene.add(m); solidMeshes.push(m); nSolid += solidLists[d].length; }
    if (camFacing[d] && glassLists[d].length) { const m = makeFaces(W, glassLists[d], d, glassMat, false); m.renderOrder = 3; m.receiveShadow = true; scene.add(m); glassMeshes.push(m); nGlass += glassLists[d].length; }
  }
  const cells = { solid: [], glass: [] };
  { const seen = new Set(); for (let d = 0; d < 6; d++) { for (const i of solidLists[d]) if (!seen.has(i)) { seen.add(i); cells.solid.push(i); } for (const i of glassLists[d]) if (!seen.has(i)) { seen.add(i); cells.glass.push(i); } } }
  LOG('faces', 'solid', nSolid, 'glass', nGlass, 'cells', cells.solid.length, 'build ms', Math.round(performance.now() - t0));
  if (!qn('faces', 0)) {
    for (const m of solidMeshes) { scene.remove(m); m.geometry.dispose(); }
    solidMeshes.length = 0;
    const m = makeCubes(W, cells.solid, solidMat, true); m.userData.d = -1; m.castShadow = !qn('noshadow', 0); m.receiveShadow = true; scene.add(m); solidMeshes.push(m);
  }

  // bounds of what is drawn (grid coordinates)
  const bmin = new THREE.Vector3(1e9, 1e9, 1e9), bmax = new THREE.Vector3(-1e9, -1e9, -1e9);
  for (const list of [cells.solid, cells.glass]) for (const i of list) {
    const x = i % W.sx, t = (i / W.sx) | 0, y = t % W.sy, z = (t / W.sy) | 0;
    bmin.x = Math.min(bmin.x, x); bmin.y = Math.min(bmin.y, y); bmin.z = Math.min(bmin.z, z); bmax.x = Math.max(bmax.x, x); bmax.y = Math.max(bmax.y, y); bmax.z = Math.max(bmax.z, z);
  }
  bmin.subScalar(0.5); bmax.addScalar(0.5);
  const G = (x, y, z) => new THREE.Vector3(x + W.ox, y, z + W.oz);   // builder coordinates -> grid coordinates

  // lights
  const key = new THREE.DirectionalLight(lt.color ?? 0xfff5e9, lt.key ?? 3.0);
  key.castShadow = true; key.shadow.mapSize.set(qn('map', lt.map ?? 2048), qn('map', lt.map ?? 2048)); key.shadow.bias = -0.00025; key.shadow.normalBias = lt.normalBias ?? 0.3;
  scene.add(key, key.target);
  const hemi = new THREE.HemisphereLight(lt.sky ?? 0xe8f1ff, lt.ground ?? 0xc9c7c2, lt.hemi ?? 1.25); scene.add(hemi);
  const fill = new THREE.DirectionalLight(lt.fillColor ?? 0xdfe9ff, lt.fill ?? 0.5);
  fill.position.set(0.8, 0.35, 0.6).multiplyScalar(300); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, lt.rim ?? 0.3); rim.position.set(-0.4, 0.5, -0.8).multiplyScalar(300); scene.add(rim);
  for (const p of cfg.points || []) { const L = new THREE.PointLight(p.color, p.i ?? 30, p.d ?? 40, p.decay ?? 1.6); L.position.copy(G(...p.at)); scene.add(L); }

  // camera
  const camera = new THREE.PerspectiveCamera(fov, VW / VH, 1, 4000);
  const target = cm.target ? G(...cm.target) : bmin.clone().add(bmax).multiplyScalar(0.5);
  let dist = 400;
  if (qn('fit', 1)) {
    // frame the drawn cubes with the real perspective projection: a few iterations of pan + zoom on the projected bounds
    const fr = cfg.frame || {};
    const mx = fr.margin ?? 0.05, my = fr.marginY ?? mx, aspect = VW / VH;
    const corners3 = []; const v = new THREE.Vector3();
    for (const list of [cells.solid, cells.glass]) for (const i of list) {
      const x = i % W.sx, t = (i / W.sx) | 0, y = t % W.sy, z = (t / W.sy) | 0;
      for (let c = 0; c < 8; c++) corners3.push(x + ((c & 1) ? 0.5 : -0.5), y + ((c & 2) ? 0.5 : -0.5), z + ((c & 4) ? 0.5 : -0.5));
    }
    const tanH = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
    dist = 380;
    for (let it = 0; it < 6; it++) {
      camera.position.copy(target).addScaledVector(camDir, dist); camera.lookAt(target); camera.near = 1; camera.far = dist * 4; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let k = 0; k < corners3.length; k += 3) {
        v.set(corners3[k], corners3[k + 1], corners3[k + 2]).project(camera);
        x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const hx = (x1 - x0) / 2, hy = (y1 - y0) / 2;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(right, cx * dist * tanH * aspect).addScaledVector(up, cy * dist * tanH);
      const sc = Math.max(hx / (1 - 2 * mx), hy / (1 - 2 * my)) / (fr.zoom ?? 1);
      dist *= sc;
    }
    target.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), (fr.dx ?? 0) * dist * tanH * aspect).addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1), (fr.dy ?? 0) * dist * tanH);
    LOG('frame', 'dist', dist.toFixed(1));
  } else dist = cm.dist ?? 380;
  camera.position.copy(target).addScaledVector(camDir, dist); camera.lookAt(target); camera.updateMatrixWorld();
  camera.far = dist * 3; camera.near = dist * 0.2; camera.updateProjectionMatrix();

  // soft ground shadow of the floating plinth (analytic, drawn once per pass)
  const pl = cfg.plinth;
  if (pl) {
    const gap = pl.gap ?? 16;
    const gm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      uniforms: { uRect: { value: new THREE.Vector4(pl.cx + W.ox, pl.cz + W.oz, pl.hx, pl.hz) }, uOff: { value: new THREE.Vector2(-keyDir.x / keyDir.y * (gap + 3), -keyDir.z / keyDir.y * (gap + 3)) }, uR: { value: pl.r ?? 8 }, uCol: { value: new THREE.Color(pl.color ?? 0x5d7482) }, uStr: { value: pl.strength ?? 1 } },
      vertexShader: 'varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `varying vec3 vP; uniform vec4 uRect; uniform vec2 uOff; uniform float uR; uniform vec3 uCol; uniform float uStr;
        float sdRB(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        void main(){
          float d = sdRB(vP.xz - uRect.xy - uOff, uRect.zw, uR);
          float a1 = 0.20 * (1.0 - smoothstep(-8.0, 26.0, d));
          float a2 = 0.30 * (1.0 - smoothstep(-4.0, 9.0, d));
          float a = (1.0 - (1.0 - a1) * (1.0 - a2)) * uStr;
          gl_FragColor = vec4(uCol * a, a);
        }`,
    });
    const gp = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), gm);
    gp.position.set(pl.cx + W.ox, -gap, pl.cz + W.oz); gp.renderOrder = -1; scene.add(gp);
  }


  // glow layer: only emissive cubes are drawn (everything else occludes), blurred, then composited as a coloured haze
  const glowOn = !qn('glowless', 0) && nSolid > 0;
  let glowScene = null;
  if (glowOn) {
    const gmat = new THREE.ShaderMaterial({
      vertexShader: 'attribute float aGlow; varying vec3 vC; void main(){ vC = instanceColor * aGlow; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vC; void main(){ gl_FragColor = vec4(vC, max(vC.r, max(vC.g, vC.b)) > 0.002 ? 1.0 : 0.0); }',
    });
    glowScene = new THREE.Scene();
    for (const m of solidMeshes) {
      if (m.userData.d >= 0 && !camFacing[m.userData.d]) continue;
      const gi = new THREE.InstancedMesh(m.geometry, gmat, m.count);
      gi.instanceMatrix = m.instanceMatrix; gi.instanceColor = m.instanceColor; gi.count = m.count; gi.frustumCulled = false;
      glowScene.add(gi);
    }
  }

  // targets
  const mkT = (type, samples = 0) => new THREE.WebGLRenderTarget(VW, VH, { type, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, samples });
  const gl = renderer.getContext(); gl.getExtension('EXT_color_buffer_float'); gl.getExtension('EXT_float_blend');
  const canFloat = !!gl.getExtension('EXT_color_buffer_float'), canBlend = !!gl.getExtension('EXT_float_blend');
  const rtS = mkT(canFloat ? THREE.FloatType : THREE.HalfFloatType), rtA = mkT(canFloat && canBlend ? THREE.FloatType : THREE.HalfFloatType);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const oc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const VERT = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: rtS.texture }, k: { value: 1 / SPP } }, vertexShader: VERT, fragmentShader: 'varying vec2 vUv; uniform sampler2D tS; uniform float k; void main(){ gl_FragColor = texture2D(tS, vUv) * k; }', depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
  const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(quadGeo, accMat));

  // final composite
  const bg = cfg.bg || {};
  const lin = (h) => new THREE.Color(h);
  const finMat = new THREE.ShaderMaterial({
    uniforms: { tA: { value: rtA.texture }, tG: { value: null }, uGlowMix: { value: cfg.glowMix ?? 0.6 }, uGlowAdd: { value: cfg.glowAdd ?? 0.5 }, uExp: { value: cfg.exposure ?? 1.0 }, uTop: { value: lin(bg.top ?? 0xffffff) }, uBot: { value: lin(bg.bot ?? C.haze) }, uRes: { value: new THREE.Vector2(VW, VH) }, uVig: { value: bg.vig ?? 0.0 } },
    vertexShader: VERT,
    fragmentShader: `varying vec2 vUv; uniform sampler2D tA; uniform sampler2D tG; uniform float uGlowMix; uniform float uGlowAdd; uniform float uExp; uniform vec3 uTop; uniform vec3 uBot; uniform vec2 uRes; uniform float uVig;
      vec3 toS(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main(){
        vec4 a = texture2D(tA, vUv);
        float t = smoothstep(0.0, 1.0, 1.0 - vUv.y);
        float rad = length((vUv - vec2(0.5, 0.58)) * vec2(1.0, 0.75));
        vec3 bgc = mix(uTop, uBot, clamp(t * 0.9 + rad * 0.35 * uVig, 0.0, 1.0));
        vec3 sc = (a.a > 0.001 ? a.rgb / a.a : vec3(0.0)) * uExp;
        float m = max(sc.r, max(sc.g, sc.b));
        if (m > 0.88) sc *= (0.88 + 0.12 * (1.0 - exp(-(m - 0.88) * 9.0))) / m;
        vec3 col = sc * a.a + (1.0 - a.a) * bgc;
        vec4 g = texture2D(tG, vUv);
        vec3 gc = g.a > 0.0005 ? g.rgb / g.a : vec3(0.0);
        col = mix(col, min(gc * 1.15 + 0.06, vec3(1.0)), clamp(g.a * uGlowMix, 0.0, 0.85));
        col += g.rgb * uGlowAdd;
        vec3 s = toS(clamp(col, 0.0, 1.0));
        s += (h21(gl_FragCoord.xy) - 0.5) / 255.0;
        gl_FragColor = vec4(s, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const finScene = new THREE.Scene(); finScene.add(new THREE.Mesh(quadGeo, finMat));

  // progressive passes
  const bsz = new THREE.Box3(bmin, bmax), corners = [];
  for (let c = 0; c < 8; c++) corners.push(new THREE.Vector3(c & 1 ? bmax.x : bmin.x, c & 2 ? bmax.y : bmin.y, c & 4 ? bmax.z : bmin.z));
  const center = bsz.getCenter(new THREE.Vector3()), radius = bsz.getSize(new THREE.Vector3()).length() / 2;
  const t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), lcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2), tmp = new THREE.Vector3();
  const cone = THREE.MathUtils.degToRad(lt.cone ?? 5.5);
  renderer.setClearColor(0x000000, 0);
  const px = canFloat && canBlend ? new Float32Array(4) : new Uint16Array(4);
  for (let k = 0; k < SPP; k++) {
    const jx = (halton(k + 1, 2) - 0.5), jy = (halton(k + 1, 3) - 0.5);
    camera.setViewOffset(VW, VH, jx, jy, VW, VH);
    // light direction inside a cone (area light)
    const ang = k * 2.39996323, rr = Math.sqrt((k + 0.5) / SPP) * cone;
    t1.crossVectors(keyDir, new THREE.Vector3(0, 1, 0)).normalize(); t2.crossVectors(keyDir, t1).normalize();
    const dir = keyDir.clone().addScaledVector(t1, Math.cos(ang) * rr).addScaledVector(t2, Math.sin(ang) * rr).normalize();
    key.position.copy(center).addScaledVector(dir, radius * 2.2); key.target.position.copy(center); key.target.updateMatrixWorld();
    lcam.position.copy(key.position); lcam.up.set(0, 1, 0); lcam.lookAt(center); lcam.updateMatrixWorld();
    const inv = lcam.matrixWorld.clone().invert();
    let l = 1e9, r = -1e9, b = 1e9, tp = -1e9, nr = 1e9, fr = -1e9;
    for (const c of corners) { tmp.copy(c).applyMatrix4(inv); l = Math.min(l, tmp.x); r = Math.max(r, tmp.x); b = Math.min(b, tmp.y); tp = Math.max(tp, tmp.y); nr = Math.min(nr, -tmp.z); fr = Math.max(fr, -tmp.z); }
    const sc = key.shadow.camera; sc.left = l - 2; sc.right = r + 2; sc.bottom = b - 2; sc.top = tp + 2; sc.near = Math.max(1, nr - 4); sc.far = fr + 4; sc.updateProjectionMatrix();

    renderer.setRenderTarget(rtS); renderer.clear(true, true, true);
    renderer.render(scene, camera);
    renderer.setRenderTarget(rtA);
    if (k === 0) { renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true); }
    renderer.autoClear = false; renderer.render(accScene, oc); renderer.autoClear = true;
    if ((k & 1) === 1 || k === SPP - 1) { try { renderer.readRenderTargetPixels(rtA, 0, 0, 1, 1, px); } catch (e) { /* no sync available, harmless */ } }   // keeps the GPU queue short
    document.title = 'pass ' + (k + 1) + '/' + SPP;
    if (k < 3 || k === SPP - 1) LOG('pass', k + 1, Math.round(performance.now() - t0), 'ms');
    if (k % 2 === 1) await new Promise((res) => setTimeout(res, 0));
  }
  camera.clearViewOffset();
  // glow layer + blur
  const hf = (w, h) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  const gw = Math.max(8, VW >> 2), gh = Math.max(8, VH >> 2);
  const rtG = hf(VW >> 1, VH >> 1), rtB1 = hf(gw, gh), rtB2 = hf(gw, gh);
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tS: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: VERT, depthTest: false, depthWrite: false,
    fragmentShader: 'varying vec2 vUv; uniform sampler2D tS; uniform vec2 d; void main(){ vec4 s = texture2D(tS, vUv) * 0.227027; s += (texture2D(tS, vUv + d * 1.3846) + texture2D(tS, vUv - d * 1.3846)) * 0.3162162; s += (texture2D(tS, vUv + d * 3.2308) + texture2D(tS, vUv - d * 3.2308)) * 0.0702703; gl_FragColor = s; }',
  });
  const blurScene = new THREE.Scene(); blurScene.add(new THREE.Mesh(quadGeo, blurMat));
  if (glowScene) {
    renderer.setRenderTarget(rtG); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true); renderer.render(glowScene, camera);
    let src = rtG;
    const iters = cfg.glowIters ?? 3, step = cfg.glowStep ?? 1.6;
    for (let it = 0; it < iters; it++) {
      blurMat.uniforms.tS.value = src.texture; blurMat.uniforms.d.value.set(step / gw, 0);
      renderer.setRenderTarget(rtB1); renderer.render(blurScene, oc);
      blurMat.uniforms.tS.value = rtB1.texture; blurMat.uniforms.d.value.set(0, step / gh);
      renderer.setRenderTarget(rtB2); renderer.render(blurScene, oc);
      src = rtB2;
    }
    finMat.uniforms.tG.value = rtB2.texture;
  } else { renderer.setRenderTarget(rtG); renderer.clear(true, true, true); finMat.uniforms.tG.value = rtG.texture; }
  renderer.setRenderTarget(null); renderer.setViewport(0, 0, VW, VH);
  renderer.render(finScene, oc);
  LOG('rendered', SPP, 'passes in', Math.round(performance.now() - t0), 'ms');
  window.__info = { solidFaces: nSolid, glassFaces: nGlass };
  return renderer;
}

// ---------------------------------------------------------------------------------------------------- people
const SKIN = { fair: 0xF0D0B6, light: 0xE9C4A5, tan: 0xD2A279, brown: 0xA8734F, deep: 0x7B4F37 };
const HAIR = { black: 0x2B2724, brown: 0x4E382A, chestnut: 0x7C4F34, blonde: 0xD8B574, gray: 0xB5BCC0, white: 0xEEF1F2, auburn: 0x9B512F, navy: 0x2B3A52 };
const TYPES = {
  adult: { legH: 15, torsoH: 17, headW: 21, headH: 20, headD: 19, sh: 6, td: 3, legW: 5, armLen: 15, armW: 1.5 },
  child: { legH: 9, torsoH: 11, headW: 19, headH: 18, headD: 17, sh: 5, td: 3, legW: 4, armLen: 10, armW: 1.5 },
  elder: { legH: 14, torsoH: 17, headW: 21, headH: 19, headD: 19, sh: 6, td: 3, legW: 5, armLen: 15, armW: 1.5 },
};
const EYE = 0x20282c;

// pose helpers for arms: shoulder-relative elbow and hand offsets (local figure frame, x+ is the figure's left, z+ is forward)
const ARM = {
  down: (L) => ({ e: [0.5, -L * 0.5, 0], h: [1.5, -L, 0] }),
  bend: (L, fw = 5) => ({ e: [1, -L * 0.45, 0], h: [0, -L * 0.45 - 2, fw + 2] }),
  up: (L, out = 4) => ({ e: [out * 0.6, -L * 0.2, 2], h: [out, L * 0.45, 4] }),
};

function person(W, o = {}) {
  const D = Object.assign({}, TYPES[o.size || 'adult'], o.dims || {}); D.headW |= 1; D.headD |= 1;
  const B = new Brush(W, o.x | 0, o.y | 0, o.z | 0, o.rot | 0, !!o.mirror);
  const skin = o.skin ?? SKIN.fair, hairC = o.hairColor ?? HAIR.brown, shirt = o.shirt ?? C.blue, pants = o.pants ?? 0x424c53, shoe = o.shoe ?? 0x2a3237, coat = o.coat, coatC = coat === true ? 0xF4F6F7 : coat;
  const shoeH = 3, yHip = shoeH + D.legH, yNeck = yHip + D.torsoH, yHead = yNeck + 1;
  const sh = D.sh, td = D.td;

  // legs and shoes
  const lz = (o.walk || 0) * 2;
  for (const [x0, x1, dz] of [[1, D.legW, lz], [-D.legW, -1, -lz]]) {
    const w = x1 - x0 + 1;
    B.box(x0, shoeH, -2 + dz, w, D.legH, 5, pants);
    B.box(x0, 0, -2 + dz, w, shoeH, 7, shoe);
    B.box(x0, 0, -2 + dz, w, 1, 7, 0xe9eef0);                     // sole
    B.box(x0, 1, 3 + dz, w, 2, 2, lighten(shoe, 0.18));           // toe cap
  }
  B.box(-D.legW, yHip - 3, -2, 2 * D.legW + 1, 3, 5, pants);        // hips
  // torso
  B.rbox(-sh, yHip, -td, 2 * sh + 1, D.torsoH, 2 * td + 1, 2, shirt);
  B.box(-sh, yHip, -td, 2 * sh + 1, 2, 2 * td + 1, darken(shirt, 0.12));      // hem
  B.box(-1, yHip, td, 3, 1, 1, darken(shirt, 0.3));                            // belt buckle hint
  // coat
  if (coatC !== undefined && coatC !== null && coatC !== false) {
    const cb = yHip - 6;
    B.rbox(-sh - 1, cb, -td - 1, 2 * sh + 3, yNeck - cb, 2 * td + 3, 2, coatC);
    // flared hem
    B.box(-sh - 1, cb, td + 1, 2 * sh + 3, 1, 1, darken(coatC, 0.04));
    const zf = td + 1;
    // opening V at the neck, seam, buttons, pockets
    for (let y = yNeck - 7; y < yNeck; y++) for (let x = -3; x <= 3; x++) { if (Math.abs(x) <= (y - (yNeck - 8)) / 2 + 0.5) B.put(x, y, zf, shirt); }
    for (let y = cb + 1; y < yNeck - 7; y++) B.put(0, y, zf, darken(coatC, 0.13));
    for (const by of [cb + 3, cb + 8, cb + 13]) if (by < yNeck - 8) B.put(0, by, zf, 0x8798a2);
    for (const sx of [1, -1]) { // hip pockets
      for (let x = 2; x <= 6; x++) B.put(sx * x, cb + 5, zf, darken(coatC, 0.1));
      for (let y = cb + 2; y <= cb + 5; y++) B.put(sx * 6, y, zf, darken(coatC, 0.1));
    }
    // breast pocket with pen
    for (let x = 3; x <= 6; x++) { B.put(x, yNeck - 10, zf, darken(coatC, 0.1)); }
    B.put(3, yNeck - 11, zf, darken(coatC, 0.1)); B.put(6, yNeck - 11, zf, darken(coatC, 0.1));
    B.box(4, yNeck - 10, zf, 1, 3, 1, o.pen ?? C.glow);
    // collar
    B.box(-4, yNeck - 1, td + 1, 3, 2, 1, lighten(coatC, 0.5)); B.box(2, yNeck - 1, td + 1, 3, 2, 1, lighten(coatC, 0.5));
  }
  // neck
  B.box(-2, yNeck, -2, 5, 1, 5, skin);

  // arms
  const sleeve = coatC ?? shirt;
  const glove = o.glove ?? skin;
  const sx0 = sh + (coatC !== undefined && coatC !== null && coatC !== false ? 3.5 : 2.5);
  const hands = {};
  for (const [side, key] of [[1, 'L'], [-1, 'R']]) {
    const pose = (o.arms && o.arms[key]) || ARM.down(D.armLen);
    const S = [side * sx0, yNeck - 2, 0], E = [S[0] + side * pose.e[0], S[1] + pose.e[1], S[2] + pose.e[2]], H = [S[0] + side * pose.h[0], S[1] + pose.h[1], S[2] + pose.h[2]];
    B.limb(S[0], S[1], S[2], E[0], E[1], E[2], D.armW, sleeve);
    B.limb(E[0], E[1], E[2], H[0], H[1], H[2], D.armW, sleeve);
    B.sph(E[0], E[1], E[2], D.armW + 0.6, sleeve);
    B.sph(S[0], S[1], S[2], D.armW + 0.6, sleeve);
    // cuff and hand
    B.limb(H[0], H[1], H[2], H[0], H[1], H[2], D.armW + 0.4, darken(sleeve, 0.06));
    const dx = H[0] - E[0], dy = H[1] - E[1], dz = H[2] - E[2], dl = Math.hypot(dx, dy, dz) || 1;
    const hx = H[0] + dx / dl * 3.0, hy = H[1] + dy / dl * 3.0 - 0.5, hz = H[2] + dz / dl * 3.0;
    hands[key] = [hx, hy, hz];
    if (!o.noHands) B.rbox(Math.round(hx) - 1, Math.round(hy) - 1, Math.round(hz) - 1, 3, 3, 3, 0.8, glove, 7);
  }

  // head: rounded box skin, hair shell, face features
  const hw = (D.headW - 1) / 2, hd = (D.headD - 1) / 2, hh = D.headH, cy = yHead + (hh - 1) / 2, rr = o.headR ?? 5;
  const sdf = (x, y, z, e = 0) => {
    const qx = Math.abs(x) - (hw + 0.5 + e - rr), qy = Math.abs(y - cy) - (hh / 2 + e - rr), qz = Math.abs(z) - (hd + 0.5 + e - rr);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) - rr;
  };
  const cells = new Map(); const K = (x, y, z) => ((x + 64) << 16) | ((y + 8) << 8) | (z + 64);
  const set = (x, y, z, p) => cells.set(K(x, y, z), [x, y, z, p]);
  const hairStyle = o.hair || 'short';
  const skinP = { hex: skin, j: 0.015, skin: true };
  for (let z = -hd - 2; z <= hd + 2; z++) for (let y = yHead - 1; y <= yHead + hh; y++) for (let x = -hw - 2; x <= hw + 2; x++) if (sdf(x, y, z) <= 0.001) set(x, y, z, skinP);
  const isHair = (x, yy, z) => {
    const ax = Math.abs(x);
    switch (hairStyle) {
      case 'bald': return false;
      case 'short': return yy >= hh - 4 || (z <= -2 && yy >= 3) || (ax >= hw - 1 && yy >= hh - 8 && z < hd - 2) || (yy >= hh - 7 && z >= hd - 3 && (yy >= hh - 6 || ax >= 6 || (x > -3 && x < 4)));
      case 'fringe': return yy >= hh - 4 || (z <= -1 && yy >= 3) || (ax >= hw - 1 && yy >= hh - 11) || (yy >= hh - 8 && z >= hd - 3 && (yy >= hh - 7 || ax >= 7 || (x % 4 !== 0)));
      case 'bob': return yy >= hh - 4 || (z <= 0 && yy >= 1) || (ax >= hw - 1 && yy >= 3 && z < hd - 2) || (yy >= hh - 8 && z >= hd - 3 && (yy >= hh - 7 || ax >= 6));
      case 'curly': return yy >= hh - 5 || (z <= -1 && yy >= 3) || (ax >= hw - 1 && yy >= hh - 10) || (yy >= hh - 8 && z >= hd - 3 && (yy >= hh - 7 || ax >= 6));
      case 'elder': return yy >= hh - 4 || (z <= -2 && yy >= 4) || (ax >= hw - 1 && yy >= hh - 12 && z < hd - 3) || (yy >= hh - 6 && z >= hd - 3 && (ax >= 5 || yy >= hh - 5));
      case 'kid': return yy >= hh - 4 || (z <= -2 && yy >= 3) || (ax >= hw - 1 && yy >= hh - 9 && z < hd - 2) || (yy >= hh - 7 && z >= hd - 3 && (yy >= hh - 6 || ax >= 5));
      default: return yy >= hh - 4;
    }
  };
  const hairP = (x, y, z) => ({ hex: (hash3(x, y, z, 3) > 0.5 ? hairC : darken(hairC, 0.1)), j: 0.05 });
  const bump = (x, yy, z) => hairStyle === 'curly' || hairStyle === 'kid' ? (hash3(x, yy, z, 5) > 0.55 ? 1.9 : 1.0) : (o.tousle && yy >= hh - 5 && hash3(x, yy, z, 5) > 1 - o.tousle ? 1.7 : 1.0);
  for (let z = -hd - 3; z <= hd + 3; z++) for (let y = yHead - 1; y <= yHead + hh + 2; y++) for (let x = -hw - 3; x <= hw + 3; x++) {
    const yy = y - yHead;
    if (!isHair(x, yy, z)) continue;
    const e = bump(x, yy, z);
    if (sdf(x, y, z, e) <= 0.001) set(x, y, z, hairP(x, y, z));
  }
  // ears
  if (hairStyle !== 'bob') for (const s of [1, -1]) for (let yy = 7; yy <= 10; yy++) for (let z = -1; z <= 2; z++) { const x = s * (hw + 1); if (!cells.has(K(x, yHead + yy, z))) set(x, yHead + yy, z, { hex: darken(skin, 0.05), j: 0.01, skin: true }); }
  // surface lookup: front-most skin cell for a given (x, y)
  const frontZ = (x, y) => { for (let z = hd + 3; z >= -hd; z--) { const e = cells.get(K(x, y, z)); if (e) return e[3].skin ? z : null; } return null; };
  const feat = (x, yy, p, dz = 0) => { const y = yHead + yy, z = frontZ(x, y); if (z === null) return; set(x, y, z + dz, p); };
  const eyeP = { hex: EYE, j: 0 };
  const ex = o.eyeX ?? Math.round(hw * 0.42), eyeY = o.eyeY ?? Math.round(hh * 0.3);
  const eyeH = o.eyeH ?? 3;
  for (let i = 0; i < eyeH; i++) for (const sx of [1, -1]) for (let k = 0; k < 2; k++) feat(sx * (ex + k), eyeY + i, eyeP);
  // brows
  const browP = { hex: darken(hairC, 0.0), j: 0.02 };
  const by = eyeY + eyeH + 1;
  for (const sx of [1, -1]) for (let k = 0; k < 4; k++) feat(sx * (ex - 1 + k), by + (o.brow === 'up' && k >= 2 ? 1 : 0), browP);
  // nose
  feat(0, eyeY - 1, { hex: mixc(skin, 0xd88f7d, 0.22), j: 0.01, skin: true }, 1);
  // mouth
  const mouthP = { hex: o.mouthColor ?? 0x9a4a46, j: 0 };
  const my = Math.max(2, eyeY - 3);
  if (o.mouth === 'open') { for (let x = -2; x <= 2; x++) feat(x, my + 1, mouthP); for (let x = -1; x <= 1; x++) feat(x, my, { hex: 0x7d3a3a, j: 0 }); for (const sx of [-2, 2]) feat(sx, my, mouthP); }
  else { for (let x = -1; x <= 1; x++) feat(x, my, mouthP); for (const sx of [-2, 2]) feat(sx, my + 1, mouthP); }
  // blush
  const blushP = { hex: mixc(skin, 0xe9807a, 0.4), j: 0, skin: true };
  for (const sx of [1, -1]) for (let yy = my; yy <= my + 1; yy++) for (let k = 0; k < 2; k++) feat(sx * (ex + 3 + k), yy, blushP);
  // beard / moustache
  if (o.beard) for (let x = -5; x <= 5; x++) for (let yy = 0; yy <= my + 1; yy++) { if (yy >= my - 1 && Math.abs(x) < 3 && yy <= my) continue; if (yy > my + 1) continue; if (Math.abs(x) + yy * 0.4 > 7) continue; feat(x, yy, { hex: o.beard, j: 0.05 }, 1); }
  // accessories
  if (o.goggles) {
    const fr = o.goggles.frame ?? 0xf4f8fa, lens = o.goggles.lens ?? 0xbfe3f5, strap = o.goggles.strap ?? C.blue;
    const gx0 = ex - 2, gx1 = ex + 4, gy0 = eyeY - 2, gy1 = eyeY + 3;
    for (const sx of [1, -1]) for (let xx = gx0; xx <= gx1; xx++) for (let yy = gy0; yy <= gy1; yy++) {
      const x = sx * xx, ring = xx === gx0 || xx === gx1 || yy === gy0 || yy === gy1;
      if ((xx === gx0 || xx === gx1) && (yy === gy0 || yy === gy1)) continue;
      const y = yHead + yy, z = frontZ(x, y); if (z === null) continue;
      if (ring) { set(x, y, z + 1, { hex: fr, j: 0.01 }); set(x, y, z + 2, { hex: fr, j: 0.01 }); } else set(x, y, z + 1, { hex: lens, glass: true, j: 0 });
    }
    for (let x = -gx0 + 1 - 2; x <= gx0 - 1 + 2; x++) { const y = yHead + eyeY + 1, z = frontZ(x, y); if (z !== null && Math.abs(x) < gx0) set(x, y, z + 2, { hex: fr, j: 0.01 }); }
    for (let z = -hd - 2; z <= hd + 2; z++) for (let y = yHead + eyeY - 1; y <= yHead + eyeY + 2; y++) for (let x = -hw - 2; x <= hw + 2; x++) {
      if (sdf(x, y, z, 1.0) <= 0.001 && sdf(x, y, z, 0) > 0.001 && (Math.abs(x) >= gx1 + 1 || z < hd - 1)) set(x, y, z, { hex: strap, j: 0.02 });
    }
  }
  if (o.glasses) {
    const fr = o.glasses.frame ?? 0x2d3a42, gx0 = ex - 2, gx1 = ex + 3, gy0 = eyeY - 1, gy1 = eyeY + eyeH;
    for (const sx of [1, -1]) for (let xx = gx0; xx <= gx1; xx++) for (let yy = gy0; yy <= gy1; yy++) {
      const ring = xx === gx0 || xx === gx1 || yy === gy0 || yy === gy1; if (!ring) continue;
      if ((xx === gx0 || xx === gx1) && (yy === gy0 || yy === gy1)) continue;
      const x = sx * xx, y = yHead + yy, z = frontZ(x, y); if (z === null) continue; set(x, y, z + 1, { hex: fr, j: 0 });
    }
    for (let x = -gx0 + 1; x <= gx0 - 1; x++) { const y = yHead + eyeY + 2, z = frontZ(x, y); if (z !== null) set(x, y, z + 1, { hex: fr, j: 0 }); }
    for (const s of [1, -1]) for (let z = -2; z <= hd; z++) { const x = s * (hw + 1), y = yHead + eyeY + 2; if (!cells.has(K(x, y, z)) && (sdf(x, y, z, 1) <= 0.001)) set(x, y, z, { hex: fr, j: 0 }); }
  }
  for (const [x, y, z, p] of cells.values()) B.put(x, y, z, p);
  if (hairStyle === 'bun') B.sph(0, yHead + hh + 1, -4, 4.4, HAIRP(hairC));
  if (hairStyle === 'ponytail') { B.line(0, yHead + hh - 3, -hd - 1, 0, yHead + hh - 7, -hd - 4, 2.4, HAIRP(hairC)); B.line(0, yHead + hh - 7, -hd - 4, 0, yHead + hh - 17, -hd - 3, 2.6, HAIRP(hairC), 1.5); }
  return { B, hands, D, top: yHead + hh, yHead, yNeck, yHip, hw, hd, hh };
}
const HAIRP = (c) => (x, y, z) => ({ hex: hash3(x, y, z, 3) > 0.5 ? c : darken(c, 0.1), j: 0.05 });

// ---------------------------------------------------------------------------------------------------- shared props
function plinth(W, x0, z0, w, d, th = 5, o = {}) {
  const top = o.top ?? 0xDCE5E8, side = o.side ?? 0xB9C5C9, tile = o.tile ?? 8;
  W.rbox(x0, 0, z0, w, th, d, o.r ?? 3, (x, y, z) => {
    if (y === th - 1) { const a = ((Math.floor((x + 400) / tile) + Math.floor((z + 400) / tile)) & 1); return { hex: a ? top : darken(top, 0.03), j: 0.012 }; }
    return { hex: y === th - 2 ? lighten(side, 0.12) : side, j: 0.015 };
  }, 5);
}

// ---------------------------------------------------------------------------------------------------- lab props
const GLASS_TINT = 0xD3E8F3;
const LIQ = { blue: GLOW(0x56B2E8, 0.9), deepBlue: GLOW(0x2F7FBF, 0.7), amber: GLOW(0xE0A35C, 0.85), clear: GLOW(0xCFE8F4, 0.25), pale: GLOW(0x9AD0EE, 0.6) };
const scaleProf = (prof, s) => prof.map(([y, r]) => [y * s, r * s]);
const ERL = [[0, 7], [1, 7.4], [13, 3.4], [21, 3.4], [22, 4.4], [23, 4.4]];
function sphereProf(R, neckR, neckH, n = 20, tEnd = 0.78) {
  const pts = [];
  for (let k = 0; k <= n; k++) { const t = Math.PI * tEnd * k / n; pts.push([R - R * Math.cos(t), Math.max(0.5, R * Math.sin(t))]); }
  const yEnd = pts[pts.length - 1][0];
  pts.push([yEnd + 2, neckR + 0.6], [yEnd + 4, neckR]); pts.push([yEnd + neckH, neckR], [yEnd + neckH + 1, neckR + 1], [yEnd + neckH + 2, neckR + 1]);
  return pts;
}
function vessel(W, cx, y0, cz, prof, o = {}) {
  const wall = o.wall ?? 1, bottom = o.bottom ?? 1;
  if (o.liquid) W.lathe(cx, y0, cz, prof, o.liquid, { wall, bottom, mode: 'core', to: o.level ?? 1e9 });
  W.lathe(cx, y0, cz, prof, GLASS(o.glass ?? GLASS_TINT), { wall, bottom, mode: 'shell' });
}
function erlenmeyer(W, cx, y0, cz, s, liquid, level) { vessel(W, cx, y0, cz, scaleProf(ERL, s), { liquid, level: level * s }); }
function roundFlask(W, cx, y0, cz, R, liquid, levelFrac = 0.6) { const prof = sphereProf(R, Math.max(2.4, R * 0.36), R * 1.0); vessel(W, cx, y0, cz, prof, { liquid, level: R * 2 * levelFrac }); }
function beaker(W, cx, y0, cz, r, h, liquid, levelFrac = 0.7) { vessel(W, cx, y0, cz, [[0, r], [h, r], [h + 1, r + 0.6]], { liquid, level: h * levelFrac }); }
function testTube(W, cx, y0, cz, h, liquid, levelFrac = 0.6) { vessel(W, cx, y0, cz, [[0, 1.6], [1, 2.1], [2, 2.2], [h, 2.2], [h + 1, 2.8]], { liquid, level: h * levelFrac, bottom: 1 }); }
function rack(W, x0, y0, z0, liquids, o = {}) {
  const n = liquids.length, pitch = o.pitch ?? 7, len = n * pitch + 3, col = o.color ?? C.blue, h = o.h ?? 22;
  W.box(x0, y0, z0, len, 2, 9, col);
  W.box(x0, y0 + 9, z0, len, 2, 9, col);
  W.box(x0, y0, z0, 2, 11, 9, col); W.box(x0 + len - 2, y0, z0, 2, 11, 9, col);
  for (let i = 0; i < n; i++) {
    const cx = x0 + 2 + pitch * (i + 0.5), cz = z0 + 4;
    for (let z = cz - 3; z <= cz + 3; z++) for (let x = Math.floor(cx - 3); x <= Math.ceil(cx + 3); x++) if (Math.hypot(x - cx, z - cz) <= 2.7) W.put(x, y0 + 9, z, ERASE), W.put(x, y0 + 10, z, ERASE);
    if (liquids[i]) testTube(W, cx, y0 + 2, cz, h, liquids[i], 0.55 + 0.1 * ((i * 7) % 4) / 3);
  }
  return len;
}
function petri(W, cx, y0, cz, r, gel, spots) {
  W.lathe(cx, y0, cz, [[0, r], [3, r]], gel, { wall: 1, bottom: 1, mode: 'core', to: 1 });
  W.lathe(cx, y0, cz, [[0, r], [3, r]], GLASS(GLASS_TINT), { wall: 1, bottom: 1, mode: 'shell' });
  for (const [dx, dz, c] of spots || []) W.put(Math.round(cx + dx), y0 + 1, Math.round(cz + dz), c);
}
function jar(W, cx, y0, cz, r, h, content, lid = C.n6, level = 0.75) {
  W.lathe(cx, y0, cz, [[0, r], [h, r]], content, { wall: 1, bottom: 1, mode: 'core', to: h * level });
  W.lathe(cx, y0, cz, [[0, r], [h, r]], GLASS(GLASS_TINT), { wall: 1, bottom: 1, mode: 'shell' });
  W.cylY(cx, y0 + h, cz, 2, r + 0.4, lid);
}
function book(W, x, y, z, w, d, h, color, pages = 0xF1F3F2) {
  W.box(x, y, z, w, h, d, color);
  W.box(x + 1, y + 1, z + 1, w - 2, h - 2, d - 1, pages);
  W.box(x, y, z, 2, h, d, darken(color, 0.12));
}
function miniRobot(W, x, y, z, rot = 0, wave = true) {
  const B = new Brush(W, x, y, z, rot);
  B.box(-4, 0, -2, 3, 2, 5, C.n6); B.box(2, 0, -2, 3, 2, 5, C.n6);
  B.box(-4, 2, -1, 2, 3, 3, C.n7); B.box(3, 2, -1, 2, 3, 3, C.n7);
  B.rbox(-5, 5, -3, 11, 8, 7, 1.2, C.n3);
  B.box(-1, 8, 4, 3, 3, 1, GLOW(C.glow, 1));
  B.box(-5, 11, -3, 11, 1, 7, C.n5);
  B.box(-8, 6, -1, 3, 6, 3, C.n4); B.box(6, 6, -1, 3, 6, 3, C.n4);
  if (wave) { B.box(7, 12, -1, 3, 4, 3, C.n4); B.box(7, 16, -1, 3, 2, 3, C.n3); }
  B.rbox(-6, 13, -4, 13, 10, 9, 2, C.n2);
  B.rbox(-5, 15, 4, 11, 6, 2, 1, C.n9);
  B.box(-3, 17, 5, 2, 2, 2, GLOW(0x9fe4ff, 1)); B.box(2, 17, 5, 2, 2, 2, GLOW(0x9fe4ff, 1));
  B.box(-8, 17, -1, 2, 3, 3, C.n5); B.box(8, 17, -1, 2, 3, 3, C.n5);
  B.line(0, 23, 0, 0, 27, 0, 0.7, C.n6);
  B.sph(0, 28, 0, 2, GLOW(C.glow, 1));
}
function microscope(W, x, y, z, rot = 0) {
  const B = new Brush(W, x, y, z, rot);
  const white = 0xF1F4F5;
  B.rbox(-6, 0, -9, 13, 3, 19, 1.2, white);
  B.box(-6, 0, -9, 13, 1, 19, C.n5);
  B.rbox(-3, 3, -10, 7, 17, 5, 1.2, white);
  B.limb(0, 19, -8, 0, 25, -6, 2.5, white);
  B.limb(0, 25, -6, 0, 26, -1, 2.5, white);
  B.rbox(-3, 21, -3, 7, 8, 8, 1.5, white);
  B.cylY(0, 18, 0, 3, 3.4, C.n6);
  B.cylY(0, 14, 2, 4, 1.4, C.n4); B.cylY(0, 15, -3, 3, 1.2, C.blue); B.cylY(3, 15, 0, 3, 1.2, C.glow);
  B.line(0, 27, 1, 0, 33, 5, 2, C.n7);
  B.sph(0, 34, 5.6, 2.7, C.n8);
  B.box(-5, 9, -6, 11, 2, 13, C.n7);
  B.cylY(0, 3, 0, 5, 2.6, C.n6);
  B.cylY(0, 8, 0, 1, 2.1, GLOW(C.glow, 1));
  B.box(-3, 11, -1, 7, 1, 3, GLASS(0xcfe9f6)); B.box(0, 11, 0, 2, 1, 1, GLOW(C.glow, 0.9));
  B.box(-5, 11, -4, 1, 1, 2, C.n8); B.box(5, 11, -4, 1, 1, 2, C.n8);
  B.cylX(-8, 7, -8, 3, 3.4, C.blue); B.cylX(6, 7, -8, 3, 3.4, C.blue);
  B.cylX(-9, 7, -8, 1, 1.5, lighten(C.blue, 0.55)); B.cylX(8, 7, -8, 1, 1.5, lighten(C.blue, 0.55));
}
function benchIsland(W, x0, z0, w, d, h, o = {}) {
  const top = o.top ?? C.n7, body = o.body ?? 0xF1F4F5, y0 = 5;
  W.box(x0 + 2, y0, z0 + 2, w - 4, 3, d - 4, C.n8);                       // toe kick
  W.rbox(x0 + 1, y0 + 3, z0 + 1, w - 2, h - 5, d - 2, 0.8, body);
  W.rbox(x0, y0 + h - 2, z0, w, 2, d, 0.8, top);
  W.box(x0, y0 + h - 2, z0 + d - 1, w, 1, 1, lighten(top, 0.12));          // lit front edge
  const zf = z0 + d - 1, gl = darken(body, 0.16);
  const doors = Math.floor((w - 4) / 24);
  for (let i = 0; i <= doors; i++) { const gx = x0 + 2 + Math.round(i * (w - 4) / doors) - (i === doors ? 1 : 0); W.box(gx, y0 + 3, zf, 1, h - 6, 1, gl); }
  for (let i = 0; i < doors; i++) { const gx = x0 + 2 + Math.round((i + 0.5) * (w - 4) / doors); W.box(gx - 1, y0 + h - 12, zf, 2, 6, 1, C.n4); }
  W.box(x0 + 2, y0 + h - 5, zf, w - 4, 1, 1, gl);
  const xf = x0 + w - 1;
  for (let i = 0; i < 2; i++) { W.box(xf, y0 + 3 + i * 8, z0 + 3, 1, 1, d - 6, gl); W.box(xf, y0 + 7 + i * 8, z0 + Math.floor(d / 2) - 2, 1, 1, 5, C.n4); }
  W.box(xf, y0 + 3, z0 + 3, 1, h - 7, 1, gl); W.box(xf, y0 + 3, z0 + d - 4, 1, h - 7, 1, gl);
}
// a molecule drawn flat on a wall (z fixed): hexagon rings and atoms
function hexRing(W, cx, cy, z, R, col, th = 0.8, atom = null) {
  const pts = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
  for (let k = 0; k < 6; k++) { const a = pts[k], b = pts[(k + 1) % 6]; W.line(a[0], a[1], z, b[0], b[1], z, th, col); }
  return pts;
}

// honeycomb pattern: returns {edge: distance to the nearest hexagon edge, id: hash of the hexagon} for a point in the plane
function hexCell(x, y, R) {
  const sq = Math.sqrt(3), q = (sq / 3 * x - y / 3) / R, r = (2 / 3 * y) / R;
  let best = null;
  for (let dq = -1; dq <= 1; dq++) for (let dr = -1; dr <= 1; dr++) {
    const qi = Math.round(q) + dq, ri = Math.round(r) + dr;
    const cx = R * sq * (qi + ri / 2), cy = R * 1.5 * ri, d = Math.hypot(x - cx, y - cy);
    if (!best || d < best.d) best = { d, cx, cy, qi, ri };
  }
  const px = x - best.cx, py = y - best.cy;
  const hd = Math.max(Math.abs(px), Math.abs(px * 0.5 + py * sq / 2), Math.abs(px * 0.5 - py * sq / 2));
  return { edge: R * sq / 2 - hd, id: hash3(best.qi, best.ri, 0, 77) };
}

function labCart(W, x0, z0, w, d, h) {
  const y0 = 5, post = C.n6, tray = 0xF3F6F7;
  for (const [px, pz] of [[0, 0], [w - 2, 0], [0, d - 2], [w - 2, d - 2]]) { W.box(x0 + px, y0 + 2, z0 + pz, 2, h, 2, post); W.cylY(x0 + px + 0.5, y0, z0 + pz + 0.5, 2, 2, C.n8); }
  for (const ty of [5, h - 3]) { W.rbox(x0 - 1, y0 + ty, z0 - 1, w + 2, 2, d + 2, 0.8, tray); W.box(x0 - 1, y0 + ty + 2, z0 - 1, w + 2, 1, 1, C.blue); W.box(x0 - 1, y0 + ty + 2, z0 + d, w + 2, 1, 1, C.blue); W.box(x0 - 1, y0 + ty + 2, z0 - 1, 1, 1, d + 2, C.blue); W.box(x0 + w, y0 + ty + 2, z0 - 1, 1, 1, d + 2, C.blue); }
  W.box(x0 - 1, y0 + h + 1, z0 + d - 1, w + 2, 2, 2, post);                         // push handle
  return y0 + h;
}
function centrifuge(W, cx, y0, cz) {
  W.rbox(cx - 8, y0, cz - 7, 17, 9, 15, 3, 0xF6F8F9);
  W.cylY(cx, y0 + 9, cz, 2, 6.5, C.blue); W.cylY(cx, y0 + 11, cz, 1, 4.5, lighten(C.blue, 0.45));
  W.box(cx - 5, y0 + 3, cz + 8, 4, 2, 1, GLOW(C.glow, 1)); W.box(cx + 1, y0 + 3, cz + 8, 5, 2, 1, C.n8);
}
// ======================================================================================= scene 1: lab-bench
SCENES['lab-bench'] = {
  dims: [240, 112, 150],
  build(W) {
    const WALL_H = 72, WX0 = -92, WX1 = 92, AX = 40;   // AX: where the Deep Canyon Blue accent wall starts
    plinth(W, WX0, -55, WX1 - WX0, 60, 5, { top: 0xE3EBEE, side: 0xB7C4C9, tile: 8 });
    // back wall: Morning Haze on the left, Deep Canyon Blue honeycomb accent on the right
    const blueW = mixc(C.blue, 0xffffff, 0.04);
    W.box(WX0, 5, -55, WX1 - WX0, WALL_H, 4, (x, y, z) => {
      if (y === 4 + WALL_H) return { hex: x >= AX ? lighten(C.blue, 0.2) : C.n3, j: 0.01 };
      if (x >= AX) {
        if (y < 9) return { hex: darken(C.blue, 0.2), j: 0.012 };
        const h = hexCell(x, y, 8);
        if (h.edge < 0.62) return { hex: lighten(C.blue, 0.22), j: 0.015 };
        if (h.id > 0.9) return { hex: lighten(C.blue, 0.1), j: 0.02 };
        return { hex: blueW, j: 0.015 };
      }
      if (y < 9) return { hex: C.n3, j: 0.012 };
      return { hex: mixc(0xF0F5F6, 0xE1EAED, (y - 9) / WALL_H), j: 0.012 };
    });
    W.box(AX - 1, 5, -52, 1, WALL_H - 1, 1, C.n3);                     // trim between the two wall colours
    // window on the left: sky, hills, a single cloud
    const wx = -88, wy = 42, ww = 36, wh = 34;
    W.box(wx - 2, wy - 2, -52, ww + 4, wh + 4, 2, 0xF8FAFA);
    W.box(wx, wy, -52, ww, wh, 2, (x, y, z) => {
      const t = (y - wy) / wh, hill = 6 + 3.2 * Math.sin((x - wx) * 0.17) + 1.6 * Math.sin((x - wx) * 0.07 + 1);
      if (y - wy < hill - 3) return { hex: 0x9DBBAA, j: 0.03 };
      if (y - wy < hill) return { hex: 0xB4CFBF, j: 0.03 };
      return { hex: mixc(0xA3CCE8, 0xEEF6FB, t * 1.15), j: 0.012 };
    });
    W.box(wx + ww / 2 - 1, wy, -50, 2, wh, 1, 0xF8FAFA); W.box(wx, wy + wh / 2 - 1, -50, ww, 2, 1, 0xF8FAFA);
    W.box(wx - 4, wy - 4, -51, ww + 8, 2, 5, C.n2);
    // shelf with jars
    const sy = 61;
    W.box(-34, sy, -51, 60, 2, 8, C.n6); for (const bx of [-30, 22]) W.box(bx, sy - 4, -51, 3, 4, 7, C.n4);
    const jars = [[-27, 5, 9, LIQ.pale], [-17, 4, 7, 0xE9EEF0], [-9, 5, 10, LIQ.amber], [1, 4, 6, LIQ.deepBlue], [11, 5, 8, 0xC8D1D3], [19, 3.6, 6, LIQ.blue]];
    for (const [jx, r, h, c] of jars) jar(W, jx, sy + 2, -47, r, h, c, C.n6);
    // bench
    benchIsland(W, -82, -49, 120, 27, 26);
    const bt = 31;
    microscope(W, -64, bt, -36, 1);
    miniRobot(W, -39, bt, -35, 0);
    rack(W, -28, bt, -43, [LIQ.blue, LIQ.amber, LIQ.pale, LIQ.amber, LIQ.deepBlue], { h: 16 });
    erlenmeyer(W, 18, bt, -36, 1.0, LIQ.blue, 10);
    roundFlask(W, 30, bt, -37, 6, LIQ.amber, 0.55);
    beaker(W, 5, bt, -28, 4.6, 10, LIQ.clear, 0.5);
    petri(W, -15, bt, -28, 6.5, GLOW(0x8CC4E8, 0.25), [[-2, -1, C.glow], [2, 1, 0xffffff], [1, -3, C.glow], [-3, 2, 0xffffff]]);
    book(W, -54, bt, -32, 11, 15, 3, C.pine);
    // researcher: holds up a glowing flask with the left hand (towards the blue wall), the other hand points at the bench
    const R = person(W, { x: 62, y: 5, z: -12, skin: SKIN.fair, hair: 'short', hairColor: HAIR.brown, coat: true, shirt: C.blue, goggles: {}, brow: 'up', tousle: 0.14,
      arms: { L: { e: [7, -2, 3], h: [10, 9, 7] }, R: { e: [5, -5, -1], h: [1, -10, 3] } } });
    const hh = R.hands.L;
    vessel(R.B, hh[0], Math.round(hh[1]) - 2, hh[2] + 1, scaleProf(ERL, 0.62), { liquid: LIQ.blue, level: 8 });
    // a few bubbles rising from the glowing flask
    { const rr = rng(11); for (let k = 0; k < 13; k++) { const t = k / 13; R.B.put(Math.round(hh[0] + (rr() - 0.5) * 5 * (0.4 + t)), Math.round(hh[1] + 13 + t * 24 + rr() * 3), Math.round(hh[2] + 1 + (rr() - 0.5) * 5 * (0.4 + t)), GLOW(mixc(0x56B2E8, 0xFFFFFF, t * 0.6), 0.9)); } }
    // a rolling cart with a centrifuge, far left in front of the bench
    const top = labCart(W, -88, -14, 22, 14, 28);
    centrifuge(W, -77, top + 3, -7);
    jar(W, -84, 5 + 8, -9, 3.6, 8, LIQ.amber, C.n6); jar(W, -75, 5 + 8, -6, 4, 6, 0xE9EEF0, C.blue);
    return {
      cam: { az: 34, el: 24, fov: 20 }, frame: { margin: 0.04 },
      light: { az: -40, el: 52 }, plinth: { cx: 0, cz: -25, hx: 92, hz: 30, r: 5, gap: 16 },
      points: [{ at: [80, 58, -4], color: 0x6EC6FF, i: 26, d: 42 }, { at: [18, 42, -33], color: 0x6EC6FF, i: 14, d: 34 }],
      glowAmt: 0.5, exposure: 1.03,
    };
  },
};
// ======================================================================================= scene 2: pipette-plate
function bigTube(W, cx, y0, cz, h, r, liquid, levelFrac) {
  vessel(W, cx, y0, cz, [[0, r * 0.55], [1, r * 0.85], [2, r], [h, r], [h + 1, r + 0.8]], { liquid, level: h * levelFrac, bottom: 1 });
}
function tubeRack(W, x0, y0, z0, cols, rows, pitch, liquids, o = {}) {
  const r = o.r ?? 3.2, h = o.h ?? 34, col = o.color ?? C.blue;
  const len = cols * pitch + 4, dep = rows * pitch + 4, up = 12;
  W.rbox(x0, y0, z0, len, 3, dep, 1, col);
  W.rbox(x0, y0 + up, z0, len, 3, dep, 1, col);
  for (const [px, pz] of [[0, 0], [len - 3, 0], [0, dep - 3], [len - 3, dep - 3]]) W.box(x0 + px, y0, z0 + pz, 3, up + 3, 3, col);
  let k = 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++, k++) {
    const cx = x0 + 2 + pitch * (i + 0.5) - 0.5, cz = z0 + 2 + pitch * (j + 0.5) - 0.5;
    for (let z = Math.floor(cz - 4); z <= Math.ceil(cz + 4); z++) for (let x = Math.floor(cx - 4); x <= Math.ceil(cx + 4); x++) if (Math.hypot(x - cx, z - cz) <= r + 0.5) W.put(x, y0 + up, z, ERASE), W.put(x, y0 + up + 1, z, ERASE), W.put(x, y0 + up + 2, z, ERASE);
    const liq = liquids[k % liquids.length];
    if (liq) bigTube(W, cx, y0 + 3, cz, h, r, liq, 0.4 + 0.3 * hash3(i, j, 4, 5));
  }
}
function microtube(W, cx, y0, cz, capColor, liquid) {
  vessel(W, cx, y0, cz, [[0, 1.2], [3, 1.8], [8, 2.9], [14, 3.1]], { liquid, level: 8, bottom: 1 });
  W.cylY(cx, y0 + 15, cz, 2, 3.5, capColor); W.cylY(cx, y0 + 17, cz, 1, 2.4, lighten(capColor, 0.25));
  W.box(Math.round(cx) + 3, y0 + 15, Math.round(cz) - 1, 3, 1, 2, capColor);
}

function glassBox(W, x0, y0, z0, w, h, d, liquid, levelRows, tint = GLASS_TINT) {
  for (let z = z0; z < z0 + d; z++) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const wall = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1 || y === y0;
    if (wall) W.put(x, y, z, GLASS(tint)); else if (liquid && y - y0 <= levelRows) W.put(x, y, z, liquid);
  }
}
function tipBox(W, x0, y0, z0, cols, rows, pitch) {
  const w = cols * pitch + 4, d = rows * pitch + 4;
  W.rbox(x0, y0, z0, w, 5, d, 1, C.pine);
  W.rbox(x0 + 1, y0 + 5, z0 + 1, w - 2, 2, d - 2, 0.8, 0xE4ECEF);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cx = x0 + 2 + Math.round(pitch * (c + 0.5)), cz = z0 + 2 + Math.round(pitch * (r + 0.5));
    W.lathe(cx, y0 + 6, cz, [[0, 0.9], [4, 1.3], [8, 1.8], [11, 2.1]], GLASS(0xE4F1F8));
  }
}
function bottle(W, cx, y0, cz, liquid, capColor = C.n8) {
  const prof = [[0, 5.2], [1, 5.8], [16, 5.8], [20, 3.4], [26, 3.0]];
  vessel(W, cx, y0, cz, prof, { liquid, level: 15, glass: 0xD3E3E8 });
  W.cylY(cx, y0 + 26, cz, 4, 3.6, capColor);
  W.cylY(cx, y0 + 5, cz, 8, 5.9, 0xFAFBFB, 5.0);          // label band
}
function pipetteTip(W, cx, y0, cz, len, liquid, fill = 9) {
  const prof = [[0, 0.9], [len * 0.4, 1.3], [len * 0.75, 1.9], [len, 2.4]];
  W.lathe(cx, y0, cz, prof, GLASS(0xE4F1F8));
  if (liquid) W.lathe(cx, y0, cz, prof, liquid, { to: fill });
}

SCENES['pipette-plate'] = {
  dims: [230, 130, 150],
  build(W) {
    const PT = 6, MX0 = -86, MX1 = 86, MZ0 = -52, MZ1 = 50;
    // bench mat with a fine measuring grid and a Deep Canyon Blue edge
    W.rbox(MX0, 0, MZ0, MX1 - MX0, PT, MZ1 - MZ0, 3, (x, y, z) => {
      if (y === PT - 1) {
        if (x < MX0 + 3 || x > MX1 - 4 || z < MZ0 + 3 || z > MZ1 - 4) return { hex: C.blue, j: 0.015 };
        const major = ((x + 400) % 50 === 0) || ((z + 400) % 50 === 0), minor = ((x + 400) % 10 === 0) || ((z + 400) % 10 === 0);
        return { hex: major ? 0xC9D6DB : minor ? 0xDCE5E8 : 0xEEF3F4, j: 0.01 };
      }
      return { hex: y === PT - 2 ? 0xCBD6DA : 0xB5C2C7, j: 0.015 };
    }, 5);
    // 96-well plate (dark plastic: the glowing wells stand out). 8 rows along x, 12 columns along z.
    const x0 = -31, z0 = -45, pw = 62, pd = 90, top = 10;
    W.rbox(x0 + 1, PT, z0 + 1, pw - 2, 2, pd - 2, 1, 0x2B3338, 5);
    W.rbox(x0, PT + 2, z0, pw, 3, pd, 1.5, (x, y, z) => ({ hex: y === top ? 0x5A666E : 0x3E484E, j: 0.012 }), 5);
    for (let k = 0; k < 4; k++) for (let m = 0; m < 4 - k; m++) for (let y = PT; y <= top; y++) W.put(x0 + m, y, z0 + k, ERASE);      // chamfered A1 corner
    const wx = (j) => x0 + 6 + 7 * j, wz = (c) => z0 + 6 + 7 * c;
    const inWell = (x, z, cx, cz) => Math.hypot(x - cx, z - cz) <= 2.5;
    const wellCells = (cx, cz, fn) => { for (let z = cz - 3; z <= cz + 3; z++) for (let x = cx - 3; x <= cx + 3; x++) if (inWell(x, z, cx, cz)) fn(x, z); };
    const PIP_COL = 5;
    for (let c = 0; c < 12; c++) for (let j = 0; j < 8; j++) {
      const cx = wx(j), cz = wz(c);
      wellCells(cx, cz, (x, z) => { W.put(x, top, z, ERASE); W.put(x, top - 1, z, ERASE); W.put(x, top - 2, z, 0x252D32); });
      if (c > PIP_COL) {
        // filled wells in front of the pipette: blue for the first rows, amber for the last ones, fading away from the pipette
        const base = j < 4 ? 0x56B2E8 : 0xE0A35C, fade = 1 - (c - PIP_COL - 1) * 0.13 - (j % 4) * 0.03;
        const col = mixc(0xFFFFFF, base, clamp(fade, 0.3, 1));
        wellCells(cx, cz, (x, z) => { W.put(x, top - 1, z, GLOW(col, 0.8)); if (c === 11 || c === 10) W.put(x, top, z, GLOW(col, 0.8)); });
      }
    }
    for (const [c, j, base] of [[1, 6, 0x56B2E8], [2, 1, 0xE0A35C], [3, 4, 0x56B2E8], [0, 2, 0xE0A35C]]) wellCells(wx(j), wz(c), (x, z) => W.put(x, top - 1, z, GLOW(mixc(0xffffff, base, 0.6), 0.7)));

    // multichannel pipette hovering over column PIP_COL (the tips line up along x)
    const ZT = wz(PIP_COL), white = 0xF6F8F9, TY0 = 19, TL = 28, XC = Math.round((wx(0) + wx(7)) / 2);
    const liqs = [LIQ.blue, LIQ.blue, LIQ.blue, LIQ.blue, LIQ.amber, LIQ.amber, LIQ.amber, LIQ.amber];
    for (let j = 0; j < 8; j++) {
      const cx = wx(j);
      pipetteTip(W, cx, TY0, ZT, TL, liqs[j], j === 5 ? 3 : 10);
      W.cylY(cx, TY0 + TL, ZT, 3, 2.5, 0xE9EEF0);
    }
    const by = TY0 + TL + 3;
    W.rbox(wx(0) - 5, by, ZT - 4, wx(7) - wx(0) + 11, 7, 9, 2.5, white);                 // bar
    W.box(wx(0) - 3, by, ZT + 3, wx(7) - wx(0) + 7, 3, 2, C.blue);                        // ejector strip on the front
    W.rbox(XC - 4, by + 7, ZT - 3, 9, 6, 7, 2.2, white);                                   // neck
    W.rbox(XC - 6, by + 13, ZT - 5, 13, 28, 11, 4.5, white);                               // grip
    W.rbox(XC - 4, by + 17, ZT + 5, 9, 6, 4, 1.5, C.blue);                                 // finger hook (front)
    W.rbox(XC - 4, by + 29, ZT + 6, 9, 10, 2, 0.8, C.n9);                                  // display
    W.box(XC - 3, by + 31, ZT + 8, 6, 1, 1, GLOW(C.glow, 1)); for (let k = 0; k < 6; k++) W.box(XC - 3 + k, by + 35, ZT + 8, 1, 1, 1, C.n4);
    W.rbox(XC - 5, by + 41, ZT - 4, 11, 4, 9, 1.5, C.blue);                                // collar
    W.cylY(XC, by + 45, ZT, 9, 2.6, white);                                                // plunger
    W.cylY(XC, by + 54, ZT, 3, 4.0, C.blue); W.cylY(XC, by + 57, ZT, 1, 3, lighten(C.blue, 0.4));
    W.cylX(XC + 7, by + 24, ZT, 3, 2.2, C.glow);                                           // ejector button
    // falling drops under two tips
    W.sph(wx(4), 14, ZT, 1.7, GLOW(0xE0A35C, 1)); W.sph(wx(4), 11.6, ZT, 1.0, GLOW(0xE0A35C, 1));
    W.sph(wx(1), 15, ZT, 1.7, GLOW(0x56B2E8, 1));

    // test tube rack with blue and amber liquids (back left)
    tubeRack(W, -80, PT, -34, 3, 2, 9, [LIQ.blue, LIQ.amber, LIQ.pale, LIQ.amber, LIQ.deepBlue, LIQ.blue], { h: 34, r: 3.2 });
    // microtubes in a holder at the front right
    W.rbox(36, PT, 12, 28, 5, 15, 1, C.n3);
    const caps = [C.blue, C.glow, 0xF6F8F9, C.pine];
    for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) microtube(W, 42 + 8 * i, PT + 3, 17 + 7 * j, caps[(i + j) % 4], (i + j) % 2 ? LIQ.blue : LIQ.amber);
    // a few bubbles rising above the reservoir
    { const rr = rng(21); for (let k = 0; k < 12; k++) { const t = k / 12; W.put(Math.round(38 + rr() * 34), Math.round(PT + 17 + t * 24 + rr() * 3), Math.round(-31 + (rr() - 0.5) * 8), GLOW(mixc(0x56B2E8, 0xFFFFFF, t * 0.6), 0.9)); } }
    // pipette tip box (front left), reagent reservoir and amber bottle (back right)
    tipBox(W, -78, PT, 10, 8, 6, 5);
    glassBox(W, 34, PT + 2, -36, 42, 10, 13, LIQ.blue, 6);
    W.rbox(32, PT, -38, 46, 2, 17, 1, 0xF2F5F6);
    bottle(W, 73, PT, -45, LIQ.amber);
    miniRobot(W, 74, PT, 28, 0);
    return {
      cam: { az: 28, el: 32, fov: 20 }, frame: { margin: 0.04 },
      light: { az: -38, el: 54 }, plinth: { cx: 0, cz: -1, hx: 86, hz: 51, r: 5, gap: 18 },
      points: [{ at: [XC, 30, ZT], color: 0x6EC6FF, i: 16, d: 40 }, { at: [XC, 18, ZT + 30], color: 0xFFC27A, i: 10, d: 36 }],
      glowAmt: 0.5, exposure: 1.03,
    };
  },
};
// ======================================================================================= scene 3: data-wall
function helix(W, cx, y0, cz, h, r, turns, o = {}) {
  const A = o.a ?? C.blue, Bc = o.b ?? GLOW(C.glow, 0.5);
  const th = (y) => (y - y0) / h * turns * Math.PI * 2;
  const pos = (y, k) => [cx + r * Math.cos(th(y) + k * Math.PI), y, cz + r * Math.sin(th(y) + k * Math.PI)];
  for (let y = y0; y <= y0 + h; y += 0.5) { const a = pos(y, 0), b = pos(y, 1); W.sph(a[0], a[1], a[2], 2.3, A); W.sph(b[0], b[1], b[2], 2.3, Bc); }
  const step = o.step ?? 5.5;
  for (let y = y0 + 2; y <= y0 + h - 2; y += step) {
    const a = pos(y, 0), b = pos(y, 1), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    W.line(a[0], a[1], a[2], m[0], m[1], m[2], 1.0, o.c1 ?? 0xE9EEF0); W.line(m[0], m[1], m[2], b[0], b[1], b[2], 1.0, o.c2 ?? C.n3);
    W.sph(a[0], a[1], a[2], 3.1, A); W.sph(b[0], b[1], b[2], 3.1, Bc);
  }
}
function rotXYZ(p, rx, ry) {
  let [x, y, z] = p;
  const c1 = Math.cos(rx), s1 = Math.sin(rx); [y, z] = [y * c1 - z * s1, y * s1 + z * c1];
  const c2 = Math.cos(ry), s2 = Math.sin(ry); [x, z] = [x * c2 + z * s2, -x * s2 + z * c2];
  return [x, y, z];
}
function moleculeRelief(W, cx, cy, cz, S = 1) {
  const R = 10 * S, rx = -0.62, ry = 0.44, atoms = [], bonds = [];
  const ring = [];
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3; ring.push(rotXYZ([R * Math.cos(a), R * Math.sin(a), 0], rx, ry)); }
  ring.forEach((p, k) => atoms.push({ p, r: (k % 3 === 0 ? 4.6 : 4.2) * S, kind: k % 3 === 0 ? 'N' : 'C' }));
  for (let k = 0; k < 6; k++) bonds.push([k, (k + 1) % 6]);
  const sub = (k, len, kind, r) => { len *= S; r *= S; const d = rotXYZ([Math.cos(k * Math.PI / 3 + 0.3), Math.sin(k * Math.PI / 3 + 0.3), 0], rx, ry); const p = [ring[k][0] + d[0] * len, ring[k][1] + d[1] * len, ring[k][2] + d[2] * len]; atoms.push({ p, r, kind }); bonds.push([k, atoms.length - 1]); return atoms.length - 1; };
  const o1 = sub(0, 11, 'O', 4.4), c1 = sub(3, 11, 'C', 4.2), h1 = sub(1, 8, 'H', 2.7), h2 = sub(4, 8, 'H', 2.7), h3 = sub(2, 8, 'H', 2.7);
  const extra = (from, dx, dy, dz, kind, r) => { const q = atoms[from].p; atoms.push({ p: [q[0] + dx * S, q[1] + dy * S, q[2] + dz * S], r: r * S, kind }); bonds.push([from, atoms.length - 1]); return atoms.length - 1; };
  const c2 = extra(c1, -7, 4, 6, 'C', 4.2); extra(c2, -1, 8, 2, 'O', 4.4); extra(o1, 7, 5, 3, 'H', 2.7);
  const P = (a) => [cx + a.p[0], cy + a.p[1], cz + a.p[2]];
  for (const [a, b] of bonds) { const p = P(atoms[a]), q = P(atoms[b]); W.line(p[0], p[1], p[2], q[0], q[1], q[2], 1.2, GLOW(0xDDE6EA, 0.3)); }
  for (const a of atoms) {
    const p = P(a);
    const paint = a.kind === 'N' ? GLOW(0x3F8FCB, 0.55) : a.kind === 'O' ? GLOW(C.glow, 0.95) : a.kind === 'H' ? GLOW(0xF4F8FA, 0.5) : GLOW(0x9AA7AD, 0.3);
    W.sph(p[0], p[1], p[2], a.r, paint);
  }
}
function screenUI(W, SX0, SY0, SW, SH, SZ) {
  const grid = (x, y) => ((x - SX0) % 8 === 0 || (y - SY0) % 8 === 0);
  W.box(SX0, SY0, SZ - 1, SW, SH, 2, (x, y, z) => {
    const t = (y - SY0) / SH, base = mixc(0x102233, 0x1B3A55, 1 - t * 0.9);
    return { hex: grid(x, y) && z === SZ ? lighten(base, 0.07) : base, j: 0.01 };
  });
  const put = (x, y, p) => W.put(x, y, SZ, p), bx = (x, y, w, h, p) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, p); };
  const BL = GLOW(0x56B2E8, 0.95), AM = GLOW(C.glow, 0.95), WH = GLOW(0xF4F8FA, 0.8), DIM = GLOW(0x7FA2BD, 0.35);
  // window dots and a title bar made of squares
  for (let k = 0; k < 3; k++) bx(SX0 + 4 + k * 5, SY0 + SH - 6, 3, 3, [AM, BL, WH][k]);
  bx(SX0 + 26, SY0 + SH - 5, 40, 1, DIM);
  // left: horizontal bars
  const lens = [27, 18, 30, 12, 22];
  lens.forEach((L, k) => { const y = SY0 + SH - 18 - k * 8; bx(SX0 + 4, y, 3, 3, DIM); bx(SX0 + 10, y, L, 4, k === 2 ? AM : k % 2 ? WH : BL); bx(SX0 + 10 + L, y + 1, 2, 2, DIM); });
  // bottom centre: ring gauge with an amber arc
  const gx = SX0 + 57, gy = SY0 + 9;
  for (let a = 0; a < 360; a += 3) { const r = 6.5, x = Math.round(gx + r * Math.cos(a * Math.PI / 180)), y = Math.round(gy + r * Math.sin(a * Math.PI / 180)); put(x, y, a > 20 && a < 250 ? AM : DIM); put(x + 1, y, a > 20 && a < 250 ? AM : DIM); }
  bx(gx - 1, gy - 1, 3, 3, WH);
  // right: line chart
  const lx = SX0 + 76, ly = SY0 + 24, pts = [[0, 2], [5, 5], [10, 4], [16, 10], [21, 9], [27, 17], [33, 21]];
  bx(lx - 1, ly - 1, 37, 1, DIM); bx(lx - 1, ly - 1, 1, 26, DIM);
  for (let i = 0; i < pts.length - 1; i++) W.line(lx + pts[i][0], ly + pts[i][1], SZ, lx + pts[i + 1][0], ly + pts[i + 1][1], SZ, 0.8, AM);
  for (const p of pts) bx(lx + p[0] - 1, ly + p[1] - 1, 3, 3, WH);
  // right: histogram
  [4, 7, 10, 6, 12, 9, 14, 8].forEach((h, k) => bx(SX0 + 76 + k * 4.5 | 0, SY0 + 5, 3, h, k === 6 ? AM : BL));
  // rotation icon (circular arrow) in the top right
  const rx = SX0 + SW - 13, ry = SY0 + SH - 11;
  for (let a = 40; a < 330; a += 4) { const x = Math.round(rx + 5.5 * Math.cos(a * Math.PI / 180)), y = Math.round(ry + 5.5 * Math.sin(a * Math.PI / 180)); put(x, y, WH); }
  bx(rx + 3, ry + 4, 5, 2, WH); bx(rx + 5, ry + 2, 2, 5, WH);
}

SCENES['data-wall'] = {
  dims: [240, 124, 150],
  build(W) {
    const WALL_H = 78, WX0 = -92, WX1 = 86, WZ = -52;
    plinth(W, WX0, WZ, WX1 - WX0, 58, 5, { top: 0xE3EBEE, side: 0xB7C4C9, tile: 8 });
    W.box(WX0, 5, WZ, WX1 - WX0, WALL_H, 4, (x, y, z) => {
      if (y === 4 + WALL_H) return { hex: C.n3, j: 0.01 };
      if (y < 9) return { hex: C.n3, j: 0.012 };
      return { hex: mixc(0xF1F6F7, 0xDEE8EB, (y - 9) / WALL_H), j: 0.012 };
    });
    // the display: dark frame, glowing pixel-art content, a rotating cube-molecule coming out of the screen
    const SX0 = -66, SY0 = 20, SW = 114, SH = 58, SZ = WZ + 7;
    W.rbox(SX0 - 4, SY0 - 4, WZ + 4, SW + 8, SH + 8, 3, 1.5, C.n8);
    W.rbox(SX0 - 2, SY0 - 2, WZ + 5, SW + 4, SH + 4, 3, 1, C.n9);
    screenUI(W, SX0, SY0, SW, SH, SZ);
    const mcx = SX0 + 57, mcy = SY0 + 31, mcz = SZ + 10, MS = 0.9;
    moleculeRelief(W, mcx, mcy, mcz, MS);
    // orbit rings around the molecule
    const ringPts = (R, n, tilt, spin, fn) => { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; let q = rotXYZ([R * Math.cos(a), R * Math.sin(a), 0], tilt, 0.35); const c = Math.cos(spin), sn = Math.sin(spin); q = [q[0] * c - q[1] * sn, q[0] * sn + q[1] * c, q[2]]; fn(q, a); } };
    ringPts(24, 140, 0, 0, (q) => W.sph(mcx + q[0], mcy + q[1], mcz + q[2] - 4, 0.8, GLOW(0xE9F2F7, 0.6)));
    ringPts(25, 160, 1.05, 0.45, (q, a) => { const z = mcz + q[2]; if (z > SZ + 2) W.sph(mcx + q[0], mcy + q[1], z, 0.85, GLOW(C.glow, 0.8)); });
    for (const a of [0.7, 3.85]) { let q = rotXYZ([25 * Math.cos(a), 25 * Math.sin(a), 0], 1.05, 0.35); const c = Math.cos(0.45), sn = Math.sin(0.45); q = [q[0] * c - q[1] * sn, q[0] * sn + q[1] * c, q[2]]; if (mcz + q[2] > SZ + 2) W.sph(mcx + q[0], mcy + q[1], mcz + q[2], 2.3, GLOW(C.glow, 1)); }
    // DNA double helix sculpture on a pedestal (left front)
    const hx = -74, hz = -12;
    W.cylY(hx, 5, hz, 3, 15, 0xF4F7F8); W.cylY(hx, 8, hz, 2, 13, C.n3); W.cylY(hx, 10, hz, 1, 11, 0xF4F7F8);
    helix(W, hx, 14, hz, 66, 11, 1.6, { c1: 0xD6DEE1, c2: 0xAAB6BB });
    W.cylY(hx, 80, hz, 2, 4, 0xF4F7F8);
    for (let k = 0; k < 14; k++) { const a = k * 0.95, r = 6 + k * 0.5; W.put(Math.round(hx + Math.cos(a) * r), Math.round(83 + k * 0.4 + (k % 3)), Math.round(hz + Math.sin(a) * r), k % 2 ? GLOW(C.glow, 0.9) : GLOW(0x56B2E8, 0.9)); }
    // blue rug under the presenter
    W.rbox(4, 5, -34, 78, 1, 33, 1, (x, y, z) => ({ hex: (x < 7 || x > 78 || z < -31 || z > -4) ? lighten(C.blue, 0.35) : mixc(C.blue, 0xffffff, 0.12), j: 0.012 }), 5);
    // researcher presenting
    const R = person(W, { x: 64, y: 6, z: -14, skin: SKIN.tan, hair: 'bun', hairColor: HAIR.black, coat: true, shirt: C.pine, glasses: {}, mouth: 'smile', pants: 0x3b454b,
      arms: { R: { e: [8, 1, 3], h: [15, 6, 5] }, L: { e: [5, -6, 1], h: [1, -10, 3] } } });
    miniRobot(W, 36, 6, -4, 0);
    return {
      cam: { az: 34, el: 24, fov: 20 }, frame: { margin: 0.045 },
      light: { az: -40, el: 52 }, plinth: { cx: -3, cz: -23, hx: 89, hz: 29, r: 5, gap: 16 },
      points: [{ at: [mcx, mcy, SZ + 10], color: 0x6EB8F0, i: 40, d: 70 }, { at: [-40, 20, -10], color: 0x6EB8F0, i: 10, d: 50 }, { at: [-72, 50, -8], color: 0xFFC27A, i: 14, d: 40 }],
      glowAmt: 0.5, glowMix: 0.45, exposure: 1.03,
    };
  },
};
// ======================================================================================= scene 4: healthy-years
const GRASS = [0x94CCAA, 0x9FD4B3, 0x8AC3A2, 0xA9D9BA];
const LEAF = [0x74BA9B, 0x84C8AA, 0x68AC8D, 0x94D3B5];
function vnoise(x, z, s, seed = 0) {
  const gx = x / s, gz = z / s, ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash3(ix, 0, iz, seed), b = hash3(ix + 1, 0, iz, seed), c = hash3(ix, 0, iz + 1, seed), d = hash3(ix + 1, 0, iz + 1, seed);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sz);
}
function tree(W, cx, cz, trunkH, R, o = {}) {
  const pal = o.pal ?? LEAF, y0 = 5;
  for (let y = 0; y < trunkH; y++) { const r = 3.6 - y / trunkH * 1.0 + (y < 4 ? 1.2 : 0); W.cylY(cx, y0 + y, cz, 1, r, (x, yy, z) => ({ hex: hash3(x, 0, z, 2) > 0.5 ? 0x8D7A68 : 0x7C6A5A, j: 0.04 })); }
  const cy = y0 + trunkH + R * 0.55;
  const blobs = [[0, 0, 0, 1], [0.62, -0.1, 0.1, 0.72], [-0.6, -0.05, -0.2, 0.7], [0.1, 0.35, 0.6, 0.65], [-0.15, 0.1, -0.65, 0.68], [0.25, 0.62, -0.2, 0.62], [-0.4, 0.5, 0.3, 0.55]];
  const col = (x, y, z) => { const t = clamp((y - (cy - R)) / (2 * R), 0, 1), k = hash3(x, y, z, 6); const base = pal[(k * pal.length) | 0]; return { hex: mixc(darken(base, 0.18), lighten(base, 0.12), t), j: 0.06 }; };
  for (const [dx, dy, dz, s] of blobs) W.sph(cx + dx * R, cy + dy * R, cz + dz * R, R * s, col);
}
function parkBench(W, x, y, z, rot) {
  const B = new Brush(W, x, y, z, rot);
  const wood = 0xD9AE72, wood2 = 0xC99A5E, metal = C.n6;
  for (const sx of [-15, 14]) { B.box(sx, 0, -5, 2, 11, 2, metal); B.box(sx, 0, 4, 2, 11, 2, metal); B.box(sx, 11, -5, 2, 1, 11, metal); B.box(sx, 12, -6, 2, 1, 2, metal); B.box(sx, 12, -6, 2, 12, 1, metal); }
  for (let k = 0; k < 3; k++) B.box(-16, 12, -6 + k * 4, 33, 2, 3, (k % 2 ? wood2 : wood));
  for (let k = 0; k < 2; k++) B.box(-16, 17 + k * 4, -7, 33, 3, 2, (k ? wood2 : wood));
  B.box(-16, 13, -6, 33, 1, 11, wood2);
}
function flowerBed(W, cx, cz, hw, hd, seed) {
  const r = rng(seed), cols = [0xFFFFFF, C.glow, 0xF3C98B, 0xAFCFE6, 0xFFFFFF];
  for (let z = cz - hd; z <= cz + hd; z++) for (let x = cx - hw; x <= cx + hw; x++) {
    const d = Math.hypot((x - cx) / hw, (z - cz) / hd); if (d > 1) continue;
    if (d > 0.82) { W.put(x, 5, z, { hex: lighten(0xA7B2B7, hash3(x, 0, z, 3) * 0.2), j: 0.03 }); continue; }
    W.put(x, 5, z, P(0x5F9F82, { j: 0.05 }));
    if (r() < 0.62) { W.put(x, 6, z, P(0x5F9F82, { j: 0.05 })); if (r() < 0.8) W.put(x, 7, z, P(cols[(r() * cols.length) | 0], { j: 0.02 })); }
  }
}
function puppy(W, x, y, z, rot) {
  const B = new Brush(W, x, y, z, rot), cream = 0xF2E8D6, tan = 0xCF9A5A, dark = 0x2A3237;
  for (const sx of [-3, 2]) for (const sz of [-5, 2]) B.box(sx, 0, sz, 2, 6, 2, (sz < 0 ? cream : cream));
  B.rbox(-4, 5, -7, 9, 7, 14, 2, (x, yy, zz) => ({ hex: (zz < -3 && x > 0) || (zz > 1 && x < -1 && yy > 8) ? tan : cream, j: 0.03 }));
  B.rbox(-4, 9, 4, 9, 8, 8, 2.5, cream);                        // head
  B.rbox(-2, 10, 11, 5, 4, 3, 1, 0xFFF7EA); B.box(0, 12, 14, 1, 1, 1, dark);   // snout + nose
  B.box(-2, 14, 12, 1, 1, 1, dark); B.box(2, 14, 12, 1, 1, 1, dark);              // eyes
  B.box(0, 10, 13, 1, 1, 1, 0xE8928A);                           // tongue
  B.rbox(-6, 11, 6, 3, 6, 4, 1, tan); B.rbox(4, 11, 6, 3, 6, 4, 1, tan);          // floppy ears
  B.box(-4, 8, 5, 9, 1, 3, C.blue);                              // collar
  B.line(0, 10, -7, 0, 15, -10, 1.0, cream); B.sph(0, 16, -10, 1.2, tan);       // tail
}
SCENES['healthy-years'] = {
  dims: [220, 120, 140],
  build(W) {
    const X0 = -66, X1 = 66, Z0 = -42, Z1 = 26;
    const pathX = (z) => 6 + 17 * Math.sin((z + 8) / 17);
    // ground: grass with a paved path
    W.rbox(X0, 0, Z0, X1 - X0, 5, Z1 - Z0, 3, (x, y, z) => {
      if (y < 4) return { hex: y === 3 ? 0x9C8B78 : 0x8A7B69, j: 0.02 };
      const d = Math.abs(x - pathX(z));
      if (d < 18) { const edge = d > 16; const paver = ((Math.floor((x + 400) / 5) + Math.floor((z + 400) / 4) * 2) & 3); return { hex: edge ? 0xCFC6B8 : [0xF1ECE2, 0xE9E3D8, 0xF5F1E9, 0xE2DACB][paver], j: 0.015 }; }
      const n = vnoise(x, z, 9, 3) * 0.6 + vnoise(x, z, 3.5, 4) * 0.4;
      return { hex: mixc(0x84BD9B, 0xB4E0C2, n), j: 0.03 };
    }, 5);
    // trees, bench, lamp, flowers
    tree(W, -46, -20, 30, 15);
    tree(W, 50, -30, 26, 12, { pal: [0x7CC3A4, 0x8BD0B1, 0x6DB394, 0x9BDABB] });
    parkBench(W, 54, 5, -8, 3);
    flowerBed(W, -38, 10, 9, 5, 1); flowerBed(W, -52, 18, 7, 4, 2); flowerBed(W, 40, 18, 8, 4, 4); flowerBed(W, -16, -24, 8, 4, 5);
    for (const [x, z, rr] of [[-30, -4, 3.2], [-27, -2, 2], [36, 18, 3]]) W.sph(x, 5, z, rr, (xx, yy, zz) => ({ hex: lighten(0xA7B2B7, hash3(xx, yy, zz, 3) * 0.15), j: 0.03 }));
    // the pair, walking hand in hand on the path
    const cz = 6, pcx = Math.round(pathX(cz));
    const G = person(W, { x: pcx - 15, y: 5, z: cz + 2, size: 'elder', skin: SKIN.light, hair: 'elder', hairColor: 0xC4CBCF, glasses: { frame: 0x3A4A53 }, shirt: C.blue, pants: 0x74838A, shoe: 0xF1F4F5, walk: 1, mouth: 'smile', brow: 'up',
      arms: { L: { e: [1, -7, 2], h: [5, -17, 3] }, R: ARM.down(15) } });
    const K = person(W, { x: pcx + 14, y: 5, z: cz - 2, size: 'child', skin: SKIN.brown, hair: 'curly', hairColor: HAIR.black, shirt: C.glow, pants: C.blue, shoe: 0xF1F4F5, walk: -1, mouth: 'open',
      arms: { R: { e: [-2, -4, 1], h: [1, -6, 3] }, L: { e: [4, 3, 1], h: [6, 11, 3] } } });
    // shrubs
    for (const [bx, bz, br] of [[-56, -4, 5.5], [-52, 0, 4], [60, 10, 5], [14, -34, 5]]) W.ell(bx, 5 + br * 0.6, bz, br, br * 0.75, br, (x, y, z) => ({ hex: mixc(darken(LEAF[(hash3(x, y, z, 6) * 4) | 0], 0.1), lighten(LEAF[1], 0.1), clamp((y - 5) / (br * 1.2), 0, 1)), j: 0.06 }));
    puppy(W, pcx - 30, 5, cz + 12, 0);
    // balloon held by the child (left hand)
    const bh = K.hands.L;
    K.B.line(bh[0], bh[1] + 1, bh[2], bh[0] + 2, bh[1] + 30, bh[2] + 1, 0.55, 0xE9EEF0);
    K.B.sph(bh[0] + 2, bh[1] + 38, bh[2] + 1, 7.5, (x, y, z) => ({ hex: mixc(C.glow, 0xFFD9A3, clamp((y - (bh[1] + 30)) / 16, 0, 1) * 0.5), glow: 0.25, j: 0.02 }));
    K.B.box(Math.round(bh[0]) + 1, Math.round(bh[1]) + 30, Math.round(bh[2]), 3, 2, 2, C.glow);
    return {
      cam: { az: 34, el: 26, fov: 20 }, frame: { margin: 0.04 },
      light: { az: -42, el: 44, color: 0xFFEBCB, key: 3.1 }, plinth: { cx: 0, cz: -8, hx: 66, hz: 34, r: 5, gap: 16 },
      points: [{ at: [70, 36, 14], color: 0xFFC27A, i: 10, d: 34 }],
      glowAmt: 0.3, exposure: 1.02,
    };
  },
};

// ---------------------------------------------------------------------------------------------------- main
(async () => {
  try {
    const def = SCENES[SCENE];
    if (!def) throw new Error('unknown scene ' + SCENE);
    const t0 = performance.now();
    const W = new World(def.dims[0], def.dims[1], def.dims[2]);
    const cfg = def.build(W) || {};
    LOG('scene', SCENE, 'built in', Math.round(performance.now() - t0), 'ms');
    await renderWorld(W, cfg);
    document.title = 'done ' + SCENE;
    window.__done = true;
  } catch (e) {
    console.error('ILLUST ERROR', e && e.stack || e);
    window.__error = String(e && e.message || e);
  }
})();
