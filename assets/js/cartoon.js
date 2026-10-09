// BlackPhage - rubans pour les hélices, flèches pour les feuillets, tubes pour les boucles.
//
// The geometry is rebuilt on the CPU from the Cα trace whenever it changes, which is what lets the
// generation animation reshape the backbone every frame. Topology (the index buffer) never changes.
import * as THREE from 'three';

const K = 14;                    // vertices per ring
const SEG = 7;                   // rings per residue
const COIL_R = 0.42;             // tube radius (Å)
const HELIX = [1.55, 0.34];      // ribbon half-width / half-thickness (Å)
const STRAND = [1.45, 0.30];
const ARROW = 1.75;              // arrow head width, relative to the strand width

const VERT = /* glsl */ `
attribute vec3 aColor;
varying vec3 vN;
varying vec3 vV;
varying vec3 vC;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = mv.xyz;
  vN = normalize(normalMatrix * normal);
  vC = aColor;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform float uAlpha;
uniform vec2 uFog;
varying vec3 vN;
varying vec3 vV;
varying vec3 vC;
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(-vV);
  if (dot(N, V) < 0.0) N = -N;

  vec3 L1 = normalize(vec3(0.45, 0.65, 0.62));
  vec3 L2 = normalize(vec3(-0.75, -0.10, 0.35));
  float d1 = clamp((dot(N, L1) + 0.35) / 1.35, 0.0, 1.0);
  float d2 = clamp(dot(N, L2) * 0.5 + 0.5, 0.0, 1.0);
  vec3 amb = mix(vec3(0.10, 0.10, 0.16), vec3(0.42, 0.50, 0.70), N.y * 0.5 + 0.5);

  vec3 lit = vC * (amb * 0.58 + vec3(1.0, 0.97, 0.94) * d1 * 1.05 + vec3(0.55, 0.62, 0.85) * d2 * 0.18);
  float spec = pow(max(dot(N, normalize(L1 + V)), 0.0), 48.0) * 0.38;
  lit += vec3(spec);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  lit += vec3(0.5, 0.6, 1.0) * fres * 0.22;

  float fog = smoothstep(uFog.x, uFog.y, -vV.z);
  lit *= mix(1.0, 0.55, fog);
  lit = 1.0 - exp(-lit * 1.35);
  gl_FragColor = vec4(lit, uAlpha);
  #include <colorspace_fragment>
}
`;

export function makeCartoonMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uAlpha: { value: 1 }, uFog: { value: new THREE.Vector2(8, 10) } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
    transparent: true,
  });
}

// cross-section tables: a circle (coil) blended with a superellipse (ribbons)
const CX = new Float32Array(K);
const CY = new Float32Array(K);
const SX = new Float32Array(K);
const SY = new Float32Array(K);
const SNX = new Float32Array(K);
const SNY = new Float32Array(K);
{
  const e = 2.9;
  const p = 2 / e;
  for (let k = 0; k < K; k++) {
    const th = (k / K) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    CX[k] = c; CY[k] = s;
    SX[k] = Math.sign(c) * Math.pow(Math.abs(c), p);
    SY[k] = Math.sign(s) * Math.pow(Math.abs(s), p);
    SNX[k] = Math.sign(c) * Math.pow(Math.abs(c), p * (e - 1));
    SNY[k] = Math.sign(s) * Math.pow(Math.abs(s), p * (e - 1));
  }
}

export class Cartoon {
  /**
   * @param {number} n number of residues
   * @param {THREE.Material} material
   */
  constructor(n, material) {
    this.n = n;
    this.rings = (n - 1) * SEG + 1;
    const nv = this.rings * K;
    this.pos = new Float32Array(nv * 3);
    this.nor = new Float32Array(nv * 3);
    this.col = new Float32Array(nv * 3);

    const idx = new Uint32Array((this.rings - 1) * K * 6);
    let o = 0;
    for (let r = 0; r < this.rings - 1; r++) {
      for (let k = 0; k < K; k++) {
        const a = r * K + k;
        const b = r * K + ((k + 1) % K);
        const c = (r + 1) * K + k;
        const d = (r + 1) * K + ((k + 1) % K);
        idx[o++] = a; idx[o++] = c; idx[o++] = b;
        idx[o++] = b; idx[o++] = c; idx[o++] = d;
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.geometry = g;
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
  }

  /**
   * Rebuild the ribbon.
   * @param {Float32Array} P   Cα positions (n×3)
   * @param {Float32Array} O   ribbon orientation guide (n×3) — width direction before projection
   * @param {Uint8Array}   ss  0 coil, 1 helix, 2 strand
   * @param {Float32Array} amt 0..1: how far each residue has "crystallised" from tube to ribbon
   * @param {Float32Array} col per-residue colour (n×3)
   */
  update(P, O, ss, amt, col) {
    const n = this.n;
    const R = this.rings;
    const { pos, nor, col: vcol } = this;
    let pnx = 0;
    let pny = 0;
    let pnz = 0;
    let havePrev = false;

    const dimW = (j) => {
      const a = amt[j];
      return ss[j] === 1 ? COIL_R + (HELIX[0] - COIL_R) * a
        : ss[j] === 2 ? COIL_R + (STRAND[0] - COIL_R) * a : COIL_R;
    };
    const dimH = (j) => {
      const a = amt[j];
      return ss[j] === 1 ? COIL_R + (HELIX[1] - COIL_R) * a
        : ss[j] === 2 ? COIL_R + (STRAND[1] - COIL_R) * a : COIL_R;
    };

    for (let r = 0; r < R; r++) {
      let i = Math.floor(r / SEG);
      let t = (r - i * SEG) / SEG;
      if (i >= n - 1) { i = n - 2; t = 1; }
      const i0 = Math.max(i - 1, 0);
      const i1 = i;
      const i2 = i + 1;
      const i3 = Math.min(i + 2, n - 1);

      const t2 = t * t;
      const t3 = t2 * t;
      const c0 = -0.5 * t3 + t2 - 0.5 * t;
      const c1 = 1.5 * t3 - 2.5 * t2 + 1;
      const c2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
      const c3 = 0.5 * t3 - 0.5 * t2;
      const d0 = -1.5 * t2 + 2 * t - 0.5;
      const d1 = 4.5 * t2 - 5 * t;
      const d2 = -4.5 * t2 + 4 * t + 0.5;
      const d3 = 1.5 * t2 - t;

      const cx = c0 * P[i0 * 3] + c1 * P[i1 * 3] + c2 * P[i2 * 3] + c3 * P[i3 * 3];
      const cy = c0 * P[i0 * 3 + 1] + c1 * P[i1 * 3 + 1] + c2 * P[i2 * 3 + 1] + c3 * P[i3 * 3 + 1];
      const cz = c0 * P[i0 * 3 + 2] + c1 * P[i1 * 3 + 2] + c2 * P[i2 * 3 + 2] + c3 * P[i3 * 3 + 2];
      let tx = d0 * P[i0 * 3] + d1 * P[i1 * 3] + d2 * P[i2 * 3] + d3 * P[i3 * 3];
      let ty = d0 * P[i0 * 3 + 1] + d1 * P[i1 * 3 + 1] + d2 * P[i2 * 3 + 1] + d3 * P[i3 * 3 + 1];
      let tz = d0 * P[i0 * 3 + 2] + d1 * P[i1 * 3 + 2] + d2 * P[i2 * 3 + 2] + d3 * P[i3 * 3 + 2];
      let tl = Math.hypot(tx, ty, tz);
      if (tl < 1e-6) { tx = P[i2 * 3] - P[i1 * 3]; ty = P[i2 * 3 + 1] - P[i1 * 3 + 1]; tz = P[i2 * 3 + 2] - P[i1 * 3 + 2]; tl = Math.hypot(tx, ty, tz) || 1; }
      tx /= tl; ty /= tl; tz /= tl;

      // orientation guide, smoothly interpolated (sign-aligned) and made perpendicular to the tangent
      const s = t * t * (3 - 2 * t);
      let o1x = O[i1 * 3]; let o1y = O[i1 * 3 + 1]; let o1z = O[i1 * 3 + 2];
      let o2x = O[i2 * 3]; let o2y = O[i2 * 3 + 1]; let o2z = O[i2 * 3 + 2];
      if (o1x * o2x + o1y * o2y + o1z * o2z < 0) { o2x = -o2x; o2y = -o2y; o2z = -o2z; }
      let ox = o1x + (o2x - o1x) * s;
      let oy = o1y + (o2y - o1y) * s;
      let oz = o1z + (o2z - o1z) * s;
      const od = ox * tx + oy * ty + oz * tz;
      let nx = ox - od * tx;
      let ny = oy - od * ty;
      let nz = oz - od * tz;
      let nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-3) {
        if (havePrev) {
          const pd = pnx * tx + pny * ty + pnz * tz;
          nx = pnx - pd * tx; ny = pny - pd * ty; nz = pnz - pd * tz;
        } else {
          nx = Math.abs(tx) < 0.9 ? 1 : 0; ny = Math.abs(tx) < 0.9 ? 0 : 1; nz = 0;
          const pd = nx * tx + ny * ty + nz * tz;
          nx -= pd * tx; ny -= pd * ty; nz -= pd * tz;
        }
        nl = Math.hypot(nx, ny, nz) || 1;
      }
      nx /= nl; ny /= nl; nz /= nl;
      if (havePrev && nx * pnx + ny * pny + nz * pnz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      pnx = nx; pny = ny; pnz = nz; havePrev = true;
      const bx = ty * nz - tz * ny;
      const by = tz * nx - tx * nz;
      const bz = tx * ny - ty * nx;

      // cross-section size
      let w;
      let h;
      const wi = dimW(i1);
      const wj = dimW(i2);
      const hi = dimH(i1);
      const hj = dimH(i2);
      if (ss[i1] === 2 && ss[i2] !== 2) {            // arrow head at the end of a strand
        w = ARROW * wi * (1 - t) + COIL_R * t;
        h = hi + (hj - hi) * s;
      } else {
        w = wi + (wj - wi) * s;
        h = hi + (hj - hi) * s;
      }
      const endScale = Math.min(1, 0.22 + r / (SEG * 0.7), 0.22 + (R - 1 - r) / (SEG * 0.7));
      w *= endScale; h *= endScale;
      const rb = Math.min(1, Math.max(0, (w / Math.max(h, 1e-3) - 1.0) / 2.2));

      // colour
      const cr = col[i1 * 3] + (col[i2 * 3] - col[i1 * 3]) * s;
      const cg = col[i1 * 3 + 1] + (col[i2 * 3 + 1] - col[i1 * 3 + 1]) * s;
      const cb = col[i1 * 3 + 2] + (col[i2 * 3 + 2] - col[i1 * 3 + 2]) * s;

      const base = r * K;
      for (let k = 0; k < K; k++) {
        const xl = CX[k] + (SX[k] - CX[k]) * rb;
        const yl = CY[k] + (SY[k] - CY[k]) * rb;
        const px = (base + k) * 3;
        const xw = xl * w;
        const yw = yl * h;
        pos[px] = cx + nx * xw + bx * yw;
        pos[px + 1] = cy + ny * xw + by * yw;
        pos[px + 2] = cz + nz * xw + bz * yw;

        const nlx = (CX[k] + (SNX[k] - CX[k]) * rb) / w;
        const nly = (CY[k] + (SNY[k] - CY[k]) * rb) / h;
        const ln = Math.hypot(nlx, nly) || 1;
        const a = nlx / ln;
        const b = nly / ln;
        nor[px] = nx * a + bx * b;
        nor[px + 1] = ny * a + by * b;
        nor[px + 2] = nz * a + bz * b;

        vcol[px] = cr; vcol[px + 1] = cg; vcol[px + 2] = cb;
      }
    }
    const g = this.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.mesh.material.dispose();
  }
}
