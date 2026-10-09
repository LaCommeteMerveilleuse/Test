// BlackPhage — renders the precomputed molecular surface (see tools/build_protein.py).
//
// The mesh is the solvent-excluded surface of the open conformation. Opening and closing
// the hinge is done on the GPU: each vertex follows a blend of the three rigid domains
// (CORE, NMP, LID) whose screw motions were fitted on the two real structures, plus a
// small per-vertex residual so the end state matches the closed atomic model.
import * as THREE from 'three';

const NOISE = /* glsl */ `
// Simplex 3D noise — Ashima Arts / Stefan Gustavson (MIT)
vec4 bp_permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 bp_inv(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float bp_noise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = bp_permute(bp_permute(bp_permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = bp_inv(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const VERTEX = /* glsl */ `
attribute vec4 aNormal;
attribute vec4 aResidual;
attribute vec4 aWeights;
attribute vec4 aScal;     // site, hydrophobicity, AO(open), AO(closed)
attribute vec4 aPot;      // potential, protonation term

uniform mat4 uDom[3];
uniform float uResK;
uniform float uTime;
uniform float uAmp;

varying vec3 vNormal;
varying vec3 vView;
varying vec3 vWeights;
varying vec4 vScal;
varying vec2 vPot;

${NOISE}

float bp_wave(vec3 q){
  float t = uTime;
  return bp_noise(q * 0.075 + vec3(0.0, t * 0.16, t * 0.11)) * 0.7
       + bp_noise(q * 0.160 - vec3(t * 0.20, 0.0, t * 0.13)) * 0.3;
}

void main(){
  vec3 p0 = position;
  vec3 n0 = normalize(aNormal.xyz);
  vec3 w = aWeights.xyz;
  w /= max(w.x + w.y + w.z, 1e-4);

  vec3 p = w.x * (uDom[0] * vec4(p0, 1.0)).xyz
         + w.y * (uDom[1] * vec4(p0, 1.0)).xyz
         + w.z * (uDom[2] * vec4(p0, 1.0)).xyz
         + aResidual.xyz * uResK;
  vec3 n = normalize(w.x * (mat3(uDom[0]) * n0)
                   + w.y * (mat3(uDom[1]) * n0)
                   + w.z * (mat3(uDom[2]) * n0));

  // light thermal-like undulation of the surface along its normal
  float e = 0.9;
  float d0 = bp_wave(p);
  vec3 g = vec3(bp_wave(p + vec3(e, 0.0, 0.0)) - d0,
                bp_wave(p + vec3(0.0, e, 0.0)) - d0,
                bp_wave(p + vec3(0.0, 0.0, e)) - d0) / e;
  p += n * d0 * uAmp;
  n = normalize(n - 2.2 * uAmp * (g - dot(g, n) * n));

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = mv.xyz;
  vNormal = normalize(normalMatrix * n);
  vWeights = w;
  vScal = aScal;
  vPot = aPot.xy;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uClosing;   // 0 = open, 1 = closed
uniform float uProt;      // fraction of protonated histidines
uniform vec3 uMode;       // mix of electrostatic / hydrophobicity / domains
uniform float uSite;      // site highlight strength (0..1)
uniform vec3 cNeg; uniform vec3 cMid; uniform vec3 cPos;
uniform vec3 cPhil; uniform vec3 cPhob;
uniform vec3 cDom0; uniform vec3 cDom1; uniform vec3 cDom2;
uniform vec3 cSite;
uniform vec2 uFog;

varying vec3 vNormal;
varying vec3 vView;
varying vec3 vWeights;
varying vec4 vScal;
varying vec2 vPot;

void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(-vView);
  if (dot(N, V) < 0.0) N = -N;

  // --- colour layers ------------------------------------------------------
  float phi = (vPot.x + uProt * vPot.y) * 2.0 / 0.80;
  phi = clamp(phi, -1.0, 1.0);
  vec3 elec = phi > 0.0 ? mix(cMid, cPos, smoothstep(0.0, 1.0, phi))
                        : mix(cMid, cNeg, smoothstep(0.0, 1.0, -phi));

  float h = vScal.y * 2.0 - 1.0;
  vec3 hyd = h > 0.0 ? mix(cMid, cPhob, smoothstep(0.0, 0.75, h))
                     : mix(cMid, cPhil, smoothstep(0.0, 0.75, -h));

  vec3 dom = cDom0 * vWeights.x + cDom1 * vWeights.y + cDom2 * vWeights.z;

  vec3 base = elec * uMode.x + hyd * uMode.y + dom * uMode.z;

  // --- lighting (view space) ----------------------------------------------
  float ao = mix(vScal.z, vScal.w, uClosing);
  ao = pow(clamp(ao, 0.0, 1.0), 1.25);

  vec3 L1 = normalize(vec3(0.45, 0.65, 0.62));
  vec3 L2 = normalize(vec3(-0.75, -0.10, 0.35));
  vec3 L3 = normalize(vec3(-0.30, 0.45, -0.80));
  float d1 = clamp((dot(N, L1) + 0.35) / 1.35, 0.0, 1.0);
  float d2 = clamp(dot(N, L2) * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky = vec3(0.42, 0.50, 0.70);
  vec3 gnd = vec3(0.10, 0.10, 0.16);
  vec3 amb = mix(gnd, sky, N.y * 0.5 + 0.5);

  vec3 lit = base * (amb * 0.46 * ao + vec3(1.0, 0.97, 0.94) * d1 * (0.25 + 0.75 * ao) * 1.15
                     + vec3(0.55, 0.62, 0.85) * d2 * 0.20 * ao);

  vec3 Hh = normalize(L1 + V);
  float spec = pow(max(dot(N, Hh), 0.0), 54.0) * 0.30 * (0.35 + 0.65 * ao);
  lit += vec3(spec);

  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  lit += vec3(0.38, 0.52, 0.95) * fres * 0.34 * (0.4 + 0.6 * ao);
  lit += vec3(0.7, 0.8, 1.0) * pow(max(dot(N, L3), 0.0), 2.0) * fres * 0.45;

  // --- binding region: exposed only when the hinge is open -----------------
  float s = vScal.x * uSite;
  float pulse = 0.78 + 0.22 * sin(uTime * 1.6);
  lit = mix(lit, lit * 0.45 + cSite * 0.65, s * 0.7);
  lit += cSite * s * (0.30 + 0.40 * pulse) * (0.5 + 0.5 * ao);

  // depth cue
  float z = -vView.z;
  float fog = smoothstep(uFog.x, uFog.y, z);
  lit *= mix(1.0, 0.42, fog);

  // soft highlight roll-off
  lit = 1.0 - exp(-lit * 1.4);

  gl_FragColor = vec4(lit, 1.0);
  #include <colorspace_fragment>
}
`;

const PALETTE = {
  cNeg: '#ff3d5e', cMid: '#aab6d0', cPos: '#2c55ff',
  cPhil: '#2f86e6', cPhob: '#f0a52e',
  cDom0: '#8d9bb8', cDom1: '#5a78f0', cDom2: '#f0a65a',
  cSite: '#5eead4',
};

export const MODES = {
  elec: new THREE.Vector3(1, 0, 0),
  hyd: new THREE.Vector3(0, 1, 0),
  dom: new THREE.Vector3(0, 0, 1),
};

export async function loadMolecule(base = 'assets/data/adk') {
  const [meta, buf] = await Promise.all([
    fetch(`${base}.json`).then((r) => r.json()),
    fetch(`${base}.bin`).then((r) => r.arrayBuffer()),
  ]);
  return new Molecule(meta, buf);
}

const TYPES = {
  float32: Float32Array, int8: Int8Array, uint8: Uint8Array,
  int16: Int16Array, uint32: Uint32Array,
};

export class Molecule {
  constructor(meta, buffer) {
    this.meta = meta;
    const b = meta.buffers;
    const arr = (name) => {
      const d = b[name];
      return new TYPES[d.dtype](buffer, d.offset, d.count * d.item);
    };

    const geo = new THREE.BufferGeometry();
    this.position = arr('position');
    this.residual = arr('residual');
    this.weights = arr('weights');
    geo.setAttribute('position', new THREE.BufferAttribute(this.position, 3));
    geo.setAttribute('aNormal', new THREE.BufferAttribute(arr('normal'), 4, true));
    geo.setAttribute('aResidual', new THREE.BufferAttribute(this.residual, 4, false));
    geo.setAttribute('aWeights', new THREE.BufferAttribute(this.weights, 4, true));
    geo.setAttribute('aScal', new THREE.BufferAttribute(arr('scalars'), 4, true));
    geo.setAttribute('aPot', new THREE.BufferAttribute(arr('potential'), 4, true));
    geo.setIndex(new THREE.BufferAttribute(arr('index'), 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), meta.radius * 1.4);

    this.domains = meta.domains.map((d) => ({
      axis: new THREE.Vector3(...d.axis),
      angle: d.angle,
      pivot: new THREE.Vector3(...d.pivot),
      shift: d.shift,
    }));
    this.matrices = this.domains.map(() => new THREE.Matrix4());

    const uniforms = {
      uDom: { value: this.matrices },
      uResK: { value: 0 },
      uTime: { value: 0 },
      uAmp: { value: 0.85 },
      uClosing: { value: 0 },
      uProt: { value: 0 },
      uMode: { value: MODES.elec.clone() },
      uSite: { value: 0 },
      uFog: { value: new THREE.Vector2(5.2, 7.4) },
    };
    for (const [k, v] of Object.entries(PALETTE)) uniforms[k] = { value: new THREE.Color(v) };
    this.uniforms = uniforms;

    this.material = new THREE.ShaderMaterial({
      uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;

    // the pivot object is scaled so the molecule has unit radius
    this.object = new THREE.Group();
    this.object.add(this.mesh);
    this.unit = 1 / meta.radius;
    this.object.scale.setScalar(this.unit);

    this.residualScale = meta.residualScale;
    this.closing = 0;
    this.prot = 0;
    this.modeTarget = MODES.elec.clone();
    this.setClosing(0);

    // orientation that brings the binding region towards the camera when open
    this.anchor = meta.anchor;
    const n = new THREE.Vector3(...[0, 1, 2].map((i) => geo.getAttribute('aNormal').getComponent(this.anchor, i)));
    this.anchorNormal = n.normalize();
  }

  /** u = 0: open conformation, u = 1: closed conformation. */
  setClosing(u) {
    this.closing = u;
    this.domains.forEach((d, i) => {
      const m = this.matrices[i];
      if (i === 0) { m.identity(); return; }
      const R = new THREE.Matrix4().makeRotationAxis(d.axis, u * d.angle);
      const T = new THREE.Matrix4().makeTranslation(
        d.pivot.x + u * d.shift * d.axis.x,
        d.pivot.y + u * d.shift * d.axis.y,
        d.pivot.z + u * d.shift * d.axis.z);
      const T0 = new THREE.Matrix4().makeTranslation(-d.pivot.x, -d.pivot.y, -d.pivot.z);
      m.copy(T).multiply(R).multiply(T0);
    });
    this.uniforms.uClosing.value = u;
    this.uniforms.uResK.value = u * this.residualScale;
  }

  setProtonation(f) {
    this.prot = f;
    this.uniforms.uProt.value = f;
  }

  setMode(name) {
    this.modeTarget.copy(MODES[name] || MODES.elec);
  }

  update(time, dt) {
    this.uniforms.uTime.value = time;
    this.uniforms.uMode.value.lerp(this.modeTarget, 1 - Math.exp(-dt * 7));
    this.uniforms.uSite.value = 1 - this.closing;
  }

  /** Position of vertex `i` in local (Å) coordinates for the current hinge state. */
  vertexLocal(i, out = new THREE.Vector3()) {
    const p = new THREE.Vector3(this.position[i * 3], this.position[i * 3 + 1], this.position[i * 3 + 2]);
    const w = [0, 1, 2].map((k) => this.weights[i * 4 + k] / 255);
    const s = w[0] + w[1] + w[2] || 1;
    out.set(0, 0, 0);
    const tmp = new THREE.Vector3();
    for (let k = 0; k < 3; k++) out.addScaledVector(tmp.copy(p).applyMatrix4(this.matrices[k]), w[k] / s);
    const rk = this.closing * this.residualScale;
    out.x += this.residual[i * 4] * rk;
    out.y += this.residual[i * 4 + 1] * rk;
    out.z += this.residual[i * 4 + 2] * rk;
    return out;
  }
}
