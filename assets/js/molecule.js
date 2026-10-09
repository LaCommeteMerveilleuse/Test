// BlackPhage — the target protein: a precomputed molecular surface (see tools/build_protein.py).
//
// The mesh is the solvent-excluded surface of the open conformation of adenylate kinase, used here as an
// example target. Shading follows the usual "clay" style of structure figures: a matte surface whose
// cavities are darkened by baked ambient occlusion. A very light undulation is applied along the normals.
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
attribute vec4 aScal;     // site, hydrophobicity, AO(open), AO(closed)
attribute vec4 aPot;      // electrostatic potential

uniform float uTime;
uniform float uAmp;

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vScal;
varying float vPot;

${NOISE}

float bp_wave(vec3 q){
  float t = uTime;
  return bp_noise(q * 0.075 + vec3(0.0, t * 0.16, t * 0.11)) * 0.7
       + bp_noise(q * 0.160 - vec3(t * 0.20, 0.0, t * 0.13)) * 0.3;
}

void main(){
  vec3 p = position;
  vec3 n = normalize(aNormal.xyz);

  // light undulation of the surface along its normal
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
  vScal = aScal;
  vPot = aPot.x;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT = /* glsl */ `
uniform float uElec;       // 0 = neutral clay, 1 = electrostatic potential
uniform vec3 cNeutral;
uniform vec3 cNeg; uniform vec3 cMid; uniform vec3 cPos;
uniform vec2 uFog;

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vScal;
varying float vPot;

void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(-vView);
  if (dot(N, V) < 0.0) N = -N;

  float phi = clamp(vPot * 2.0 / 0.80, -1.0, 1.0);
  vec3 elec = phi > 0.0 ? mix(cMid, cPos, smoothstep(0.0, 1.0, phi))
                        : mix(cMid, cNeg, smoothstep(0.0, 1.0, -phi));
  vec3 base = mix(cNeutral, elec, uElec);

  float ao = pow(clamp(vScal.z, 0.0, 1.0), 1.5);

  vec3 L1 = normalize(vec3(0.45, 0.65, 0.62));
  vec3 L2 = normalize(vec3(-0.75, -0.10, 0.35));
  vec3 L3 = normalize(vec3(-0.30, 0.45, -0.80));
  float d1 = clamp((dot(N, L1) + 0.35) / 1.35, 0.0, 1.0);
  float d2 = clamp(dot(N, L2) * 0.5 + 0.5, 0.0, 1.0);
  vec3 amb = mix(vec3(0.10, 0.10, 0.16), vec3(0.42, 0.50, 0.70), N.y * 0.5 + 0.5);

  vec3 lit = base * (amb * 0.50 * ao + vec3(1.0, 0.97, 0.94) * d1 * (0.22 + 0.78 * ao) * 1.10
                     + vec3(0.55, 0.62, 0.85) * d2 * 0.18 * ao);
  float spec = pow(max(dot(N, normalize(L1 + V)), 0.0), 40.0) * 0.16 * (0.3 + 0.7 * ao);
  lit += vec3(spec);

  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  lit += vec3(0.38, 0.52, 0.95) * fres * 0.26 * (0.4 + 0.6 * ao);
  lit += vec3(0.7, 0.8, 1.0) * pow(max(dot(N, L3), 0.0), 2.0) * fres * 0.40;

  float fog = smoothstep(uFog.x, uFog.y, -vView.z);
  lit *= mix(1.0, 0.55, fog);
  lit = 1.0 - exp(-lit * 1.4);

  gl_FragColor = vec4(lit, 1.0);
  #include <colorspace_fragment>
}
`;

const TYPES = { float32: Float32Array, int8: Int8Array, uint8: Uint8Array, uint32: Uint32Array };

export async function loadMolecule(base = 'assets/data/adk') {
  const [meta, buf] = await Promise.all([
    fetch(`${base}.json`).then((r) => r.json()),
    fetch(`${base}.bin`).then((r) => r.arrayBuffer()),
  ]);
  return new Molecule(meta, buf);
}

export class Molecule {
  constructor(meta, buffer) {
    this.meta = meta;
    const b = meta.buffers;
    const arr = (name) => {
      const d = b[name];
      return new TYPES[d.dtype](buffer, d.offset, d.count * d.item);
    };

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr('position'), 3));
    geo.setAttribute('aNormal', new THREE.BufferAttribute(arr('normal'), 4, true));
    geo.setAttribute('aScal', new THREE.BufferAttribute(arr('scalars'), 4, true));
    geo.setAttribute('aPot', new THREE.BufferAttribute(arr('potential'), 4, true));
    geo.setIndex(new THREE.BufferAttribute(arr('index'), 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), meta.radius * 1.4);

    this.uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0.7 },
      uElec: { value: 0 },
      uFog: { value: new THREE.Vector2(8, 10) },
      cNeutral: { value: new THREE.Color('#6aa6a0') },
      cNeg: { value: new THREE.Color('#ff3d5e') },
      cMid: { value: new THREE.Color('#aab6d0') },
      cPos: { value: new THREE.Color('#2c55ff') },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.object = this.mesh;
    this.elecTarget = 0;
  }

  /** 'neutral' (default) or 'elec' */
  setMode(name) { this.elecTarget = name === 'elec' ? 1 : 0; }

  setFog(near, far) { this.uniforms.uFog.value.set(near, far); }

  update(time, dt) {
    this.uniforms.uTime.value = time;
    const u = this.uniforms.uElec;
    u.value += (this.elecTarget - u.value) * (1 - Math.exp(-dt * 7));
  }
}
