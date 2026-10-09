// BlackPhage — the generated binder: poses, pH-driven assembly / binding, and the generation animation.
//
// Data comes from tools/build_binder.py: one idealised two-domain protein, and for each of three copies
// the rigid pose of each domain plus the linker's Cα trace in two states —
//   state 0, "active":     copy 0 clamps the target between its two domains, copies 1 and 2 float free;
//   state 1, "assembled":  the three copies pack together, each domain's binding face hidden inside.
//
// The generation animation is a STAGING of a diffusion process, not the run of a model: starting from
// the final backbone it shows (i) a cloud of noisy Cα positions that condenses, (ii) a smooth, shrunken
// "predicted" backbone that expands and sharpens, and (iii) secondary structure that crystallises residue
// by residue as the noise level drops.
import * as THREE from 'three';
import { Cartoon, makeCartoonMaterial } from './cartoon.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-9))) * Math.cos(2 * Math.PI * r());

// linear-light values: after the shader's tone mapping and sRGB conversion they read as magenta / violet / amber
const COLORS = {
  d1: [0.70, 0.05, 0.34],
  d2: [0.42, 0.08, 0.85],
  link: [0.92, 0.40, 0.07],
};
export const GEN_SECONDS = 7.5;

const POINT_VERT = /* glsl */ `
attribute float aSize;
uniform float uK;
uniform float uScale;
varying float vS;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(1.5, aSize * uScale * uK / max(-mv.z, 0.1));
  vS = aSize;
  gl_Position = projectionMatrix * mv;
}
`;
const POINT_FRAG = /* glsl */ `
uniform float uAlpha;
uniform float uMix;
varying float vS;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0) discard;
  float a = smoothstep(1.0, 0.15, r) * uAlpha;
  vec3 noise = vec3(0.72, 0.84, 1.0);
  vec3 pink = vec3(1.0, 0.45, 0.78);
  gl_FragColor = vec4(mix(noise, pink, uMix) * (0.8 + 0.4 * a), a);
}
`;

export async function loadBinder(url) {
  const data = await (await fetch(url)).json();
  return new BinderSystem(data);
}

class Copy {
  constructor(sys, index, states) {
    this.sys = sys;
    this.index = index;
    const dom = sys.domain;
    const nd = dom.n;
    const L = sys.L;
    this.n = 2 * nd + L;
    const n = this.n;

    this.P = new Float32Array(n * 3);
    this.P0 = new Float32Array(n * 3);          // posed positions, before the generation animation
    this.O = new Float32Array(n * 3);
    this.O0 = new Float32Array(n * 3);
    this.amt = new Float32Array(n).fill(1);
    this.ss = new Uint8Array(n);
    this.col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const isD1 = i < nd;
      const isLink = i >= nd && i < nd + L;
      this.ss[i] = isLink ? 0 : dom.ss[isD1 ? i : i - nd - L];
      const c = isD1 ? COLORS.d1 : isLink ? COLORS.link : COLORS.d2;
      this.col[i * 3] = c[0]; this.col[i * 3 + 1] = c[1]; this.col[i * 3 + 2] = c[2];
    }

    const mq = (a) => new THREE.Quaternion(a[0], a[1], a[2], a[3]);
    const mv = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    this.dom = ['d1', 'd2'].map((key) => {
      const s0 = states[0][key];
      const s1 = states[1][key];
      const t0 = mv(s0.t);
      const t1 = mv(s1.t);
      return { q0: mq(s0.q), q1: mq(s1.q), t0, t1, ctrl: null };
    });
    this.link0 = Float32Array.from(states[0].linker.flat());
    this.link1 = Float32Array.from(states[1].linker.flat());

    // positions of the two linker end residues (D1's C-terminus, D2's N-terminus) in each state
    const v = new THREE.Vector3();
    const endpoint = (d, local, state) => {
      v.set(dom.ca[local * 3], dom.ca[local * 3 + 1], dom.ca[local * 3 + 2])
        .applyQuaternion(state === 0 ? d.q0 : d.q1).add(state === 0 ? d.t0 : d.t1);
      return v.clone();
    };
    this.e1 = [endpoint(this.dom[0], dom.cterm, 0), endpoint(this.dom[0], dom.cterm, 1)];
    this.e2 = [endpoint(this.dom[1], dom.nterm, 0), endpoint(this.dom[1], dom.nterm, 1)];

    // copy 0 travels around the target rather than through it
    if (index === 0) {
      this.dom.forEach((d) => {
        const mid = d.t0.clone().add(d.t1).multiplyScalar(0.5).sub(sys.centre);
        const len = mid.length();
        const want = Math.max(len, sys.radius * 1.55);
        d.ctrl = sys.centre.clone().add(mid.normalize().multiplyScalar(2 * want - len));
      });
    } else {
      this.dom.forEach((d) => { d.ctrl = d.t0.clone().add(d.t1).multiplyScalar(0.5); });
    }

    // randomness for the generation animation
    const r = rng(4242 + 977 * index);
    this.rnd = new Float32Array(n * 3).map(() => gauss(r));
    this.noiseO = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = gauss(r); const y = gauss(r); const z = gauss(r);
      const l = Math.hypot(x, y, z) || 1;
      this.noiseO[i * 3] = x / l; this.noiseO[i * 3 + 1] = y / l; this.noiseO[i * 3 + 2] = z / l;
    }
    this.hash = new Float32Array(n).map(() => r());
    this.nph = [r() * 6.28, r() * 6.28, r() * 6.28];
    this.nsp = [0.9 + r() * 0.6, 1.3 + r() * 0.8, 1.9 + r() * 1.0];
    this.ndir = new Float32Array(9).map(() => gauss(r));

    this.cartoon = new Cartoon(n, makeCartoonMaterial());
    this.mesh = this.cartoon.mesh;

    // noise particles: one per residue + ambient specks
    this.AMB = 140;
    const np = n + this.AMB;
    this.pp = new Float32Array(np * 3);
    this.ambDir = new Float32Array(this.AMB * 3);
    this.ambR = new Float32Array(this.AMB);
    for (let j = 0; j < this.AMB; j++) {
      const x = gauss(r); const y = gauss(r); const z = gauss(r);
      const l = Math.hypot(x, y, z) || 1;
      this.ambDir[j * 3] = x / l; this.ambDir[j * 3 + 1] = y / l; this.ambDir[j * 3 + 2] = z / l;
      this.ambR[j] = 0.25 + 0.75 * Math.cbrt(r());
    }
    const sizes = new Float32Array(np);
    for (let i = 0; i < n; i++) sizes[i] = 2.4;
    for (let j = 0; j < this.AMB; j++) sizes[n + j] = 1.0 + 0.9 * r();
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pp, 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.pointMat = new THREE.ShaderMaterial({
      uniforms: { uK: { value: 1 }, uScale: { value: 1 }, uAlpha: { value: 1 }, uMix: { value: 0 } },
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(pg, this.pointMat);
    this.points.frustumCulled = false;
    this.points.visible = false;

    this.opacity = index === 0 ? 1 : 0;
    this.opacityTarget = this.opacity;
    this.g = 1;                 // generation progress, 1 = finished
    this.genClock = 0;
    this.genDelay = 0;
    this.k1 = -1;
    this.k2 = -1;
    this._q = new THREE.Quaternion();
    this._t = new THREE.Vector3();
    this._v = new THREE.Vector3();
    this.dirty = true;
  }

  /** Centroid of domain `di` (0 or 1) for closing parameter k. */
  centre(di, k, out = new THREE.Vector3()) {
    const d = this.dom[di];
    const a = (1 - k) * (1 - k);
    const b = 2 * (1 - k) * k;
    const c = k * k;
    return out.set(
      a * d.t0.x + b * d.ctrl.x + c * d.t1.x,
      a * d.t0.y + b * d.ctrl.y + c * d.t1.y,
      a * d.t0.z + b * d.ctrl.z + c * d.t1.z);
  }

  pose(k1, k2) {
    const sys = this.sys;
    const { ca, o, n: nd } = sys.domain;
    const L = sys.L;
    const P = this.P0;
    const O = this.O0;
    const v = this._v;
    const t = this._t;
    const q = this._q;

    [k1, k2].forEach((k, di) => {
      const d = this.dom[di];
      q.slerpQuaternions(d.q0, d.q1, k);
      this.centre(di, k, t);
      const off = di === 0 ? 0 : nd + L;
      for (let i = 0; i < nd; i++) {
        v.set(ca[i * 3], ca[i * 3 + 1], ca[i * 3 + 2]).applyQuaternion(q).add(t);
        const p = (off + i) * 3;
        P[p] = v.x; P[p + 1] = v.y; P[p + 2] = v.z;
        v.set(o[i * 3], o[i * 3 + 1], o[i * 3 + 2]).applyQuaternion(q);
        O[p] = v.x; O[p + 1] = v.y; O[p + 2] = v.z;
      }
    });

    // linker: blend of the two stored traces, pinned to the domains' current end residues
    const m = 0.5 * (k1 + k2);
    const a1 = (nd - 1) * 3;
    const a2 = (nd + L) * 3;
    const d1x = P[a1] - ((1 - m) * this.e1[0].x + m * this.e1[1].x);
    const d1y = P[a1 + 1] - ((1 - m) * this.e1[0].y + m * this.e1[1].y);
    const d1z = P[a1 + 2] - ((1 - m) * this.e1[0].z + m * this.e1[1].z);
    const d2x = P[a2] - ((1 - m) * this.e2[0].x + m * this.e2[1].x);
    const d2y = P[a2 + 1] - ((1 - m) * this.e2[0].y + m * this.e2[1].y);
    const d2z = P[a2 + 2] - ((1 - m) * this.e2[0].z + m * this.e2[1].z);
    const ox = O[a1]; const oy = O[a1 + 1]; const oz = O[a1 + 2];
    for (let j = 0; j < L; j++) {
      const s = (j + 1) / (L + 1);
      const p = (nd + j) * 3;
      for (let c = 0; c < 3; c++) {
        const base = (1 - m) * this.link0[j * 3 + c] + m * this.link1[j * 3 + c];
        const dd = c === 0 ? [d1x, d2x] : c === 1 ? [d1y, d2y] : [d1z, d2z];
        P[p + c] = base + dd[0] * (1 - s) + dd[1] * s;
      }
      O[p] = ox; O[p + 1] = oy; O[p + 2] = oz;
    }
  }

  /** Turn the posed backbone into a diffusion-style intermediate for progress g in [0, 1). */
  diffuse(g, time) {
    const n = this.n;
    const P = this.P;
    const P0 = this.P0;
    const O = this.O;
    const O0 = this.O0;
    let cx = 0; let cy = 0; let cz = 0;
    for (let i = 0; i < n; i++) { cx += P0[i * 3]; cy += P0[i * 3 + 1]; cz += P0[i * 3 + 2]; }
    cx /= n; cy /= n; cz /= n;

    const e1 = ease(clamp01((g - 0.14) / 0.78));
    const S = 0.28 + 0.72 * e1;
    const sigma = (1 - e1) * 13;
    const AMP = [1, 0.65, 0.4];
    for (let i = 0; i < n; i++) {
      const f = i / n;
      let nx = 0; let ny = 0; let nz = 0;
      for (let h = 0; h < 3; h++) {
        const sv = Math.sin(6.2832 * (h + 1) * f * 0.9 + this.nph[h] + this.nsp[h] * time) * AMP[h];
        nx += this.ndir[h * 3] * sv; ny += this.ndir[h * 3 + 1] * sv; nz += this.ndir[h * 3 + 2] * sv;
      }
      P[i * 3] = cx + (P0[i * 3] - cx) * S + nx * sigma;
      P[i * 3 + 1] = cy + (P0[i * 3 + 1] - cy) * S + ny * sigma;
      P[i * 3 + 2] = cz + (P0[i * 3 + 2] - cz) * S + nz * sigma;

      const a = smooth(0.52 + 0.22 * this.hash[i], 0.78 + 0.18 * this.hash[i], g);
      this.amt[i] = a;
      let ox = this.noiseO[i * 3] * (1 - a) + O0[i * 3] * a;
      let oy = this.noiseO[i * 3 + 1] * (1 - a) + O0[i * 3 + 1] * a;
      let oz = this.noiseO[i * 3 + 2] * (1 - a) + O0[i * 3 + 2] * a;
      const l = Math.hypot(ox, oy, oz) || 1;
      O[i * 3] = ox / l; O[i * 3 + 1] = oy / l; O[i * 3 + 2] = oz / l;
    }

    // the noise cloud: every Cα is displaced by a Gaussian whose width shrinks to zero
    const sc = 24 * Math.pow(1 - smooth(0, 0.95, g), 1.3);
    const pp = this.pp;
    for (let i = 0; i < n; i++) {
      const fl = 1 + 0.10 * Math.sin(time * 5.0 + i * 1.7);
      pp[i * 3] = P0[i * 3] + this.rnd[i * 3] * sc * fl;
      pp[i * 3 + 1] = P0[i * 3 + 1] + this.rnd[i * 3 + 1] * sc * fl;
      pp[i * 3 + 2] = P0[i * 3 + 2] + this.rnd[i * 3 + 2] * sc * fl;
    }
    const ra = (20 + 40 * (1 - smooth(0, 0.9, g)));
    for (let j = 0; j < this.AMB; j++) {
      const rr = ra * this.ambR[j] * (1 + 0.08 * Math.sin(time * 2 + j));
      const p = (n + j) * 3;
      pp[p] = cx + this.ambDir[j * 3] * rr;
      pp[p + 1] = cy + this.ambDir[j * 3 + 1] * rr;
      pp[p + 2] = cz + this.ambDir[j * 3 + 2] * rr;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

export class BinderSystem {
  constructor(data) {
    this.data = data;
    this.domain = {
      n: data.domain.n, ss: Uint8Array.from(data.domain.ss),
      ca: Float32Array.from(data.domain.ca.flat()), o: Float32Array.from(data.domain.o.flat()),
      nterm: data.domain.nterm, cterm: data.domain.cterm,
    };
    this.L = data.linker.n;
    this.centre = new THREE.Vector3(...data.centre);
    this.radius = data.radius;
    this.group = new THREE.Group();
    this.copies = data.copies.map((st, i) => new Copy(this, i, st));
    this.copies.forEach((c) => this.group.add(c.mesh, c.points));
    this.u = 0;
    this.uTarget = 0;
    this.instant = false;
    this.mode = 'hero';
    this.time = 0;
    this._v = new THREE.Vector3();
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.copies.forEach((c, i) => { c.opacityTarget = i === 0 || mode === 'viewer' ? 1 : 0; });
  }

  /** u = 0: bound / dispersed (acidic) — u = 1: assembled (physiological). */
  setAggregation(u) { this.uTarget = clamp01(u); }

  /** Restart the generation animation on every visible copy, slightly staggered. */
  replay() {
    this.copies.forEach((c, i) => {
      if (c.opacityTarget > 0 || i === 0) {
        c.g = 0; c.genClock = 0; c.genDelay = i * 0.9; c.dirty = true;
      }
    });
  }

  /** Progress of the slowest running generation, or null when idle. */
  get generating() {
    let g = null;
    this.copies.forEach((c) => { if (c.g < 1 && c.opacityTarget > 0) g = g === null ? c.g : Math.min(g, c.g); });
    return g;
  }

  /** closing parameters of the two domains of the principal copy */
  get k() { return this._k || [0, 0]; }

  anchors() {
    const c = this.copies[0];
    const [k1, k2] = this.k;
    return {
      a: c.centre(0, k1, new THREE.Vector3()),
      b: c.centre(1, k2, new THREE.Vector3()),
      cluster: new THREE.Vector3(...this.data.anchors.cluster),
      target: new THREE.Vector3(...this.data.anchors.target),
    };
  }

  setPointScale(k, scale) {
    this.copies.forEach((c) => { c.pointMat.uniforms.uK.value = k; c.pointMat.uniforms.uScale.value = scale; });
  }

  setFog(near, far) {
    this.copies.forEach((c) => c.mesh.material.uniforms.uFog.value.set(near, far));
  }

  update(time, dt, reduceMotion = false) {
    this.time = time;
    const rate = reduceMotion ? 1000 : 2.4;
    const du = this.uTarget - this.u;
    if (Math.abs(du) > 1e-4) this.u += du * (1 - Math.exp(-dt * rate));
    else this.u = this.uTarget;
    const u = this.u;
    const k1 = smooth(0.30, 0.90, u);
    const k2 = smooth(0.10, 0.70, u);
    const kc = smooth(0.15, 0.85, u);
    this._k = [k1, k2];

    for (const c of this.copies) {
      const a = c.opacityTarget - c.opacity;
      if (Math.abs(a) > 1e-3) { c.opacity += a * (1 - Math.exp(-dt * 4)); c.dirty = true; } else c.opacity = c.opacityTarget;

      let g = c.g;
      if (g < 1) {
        c.genClock += dt;
        const e = c.genClock - c.genDelay;
        g = reduceMotion ? 1 : clamp01(e / GEN_SECONDS);
        c.g = g;
        c.dirty = true;
      }

      const ck1 = c.index === 0 ? k1 : kc;
      const ck2 = c.index === 0 ? k2 : kc;
      if (Math.abs(ck1 - c.k1) > 1e-4 || Math.abs(ck2 - c.k2) > 1e-4) { c.k1 = ck1; c.k2 = ck2; c.dirty = true; }

      const visible = c.opacity > 0.01;
      c.mesh.visible = visible;
      if (!visible) { c.points.visible = false; continue; }
      if (!c.dirty) continue;
      c.dirty = false;

      c.pose(ck1, ck2);
      let alpha = c.opacity;
      if (g < 1) {
        if (g <= 0 && c.genClock < c.genDelay) { c.mesh.visible = false; c.points.visible = false; c.dirty = true; continue; }
        c.P.set(c.P0); c.O.set(c.O0);
        c.diffuse(g, time);
        c.points.visible = true;
        c.pointMat.uniforms.uAlpha.value = c.opacity * (1 - smooth(0.5, 0.97, g));
        c.pointMat.uniforms.uMix.value = smooth(0.2, 0.9, g);
        alpha *= smooth(0.10, 0.34, g);
      } else {
        c.P.set(c.P0); c.O.set(c.O0); c.amt.fill(1);
        c.points.visible = false;
      }
      c.mesh.material.uniforms.uAlpha.value = alpha;
      c.mesh.visible = alpha > 0.01;
      c.cartoon.update(c.P, c.O, c.ss, c.amt, c.col);
    }
  }
}
