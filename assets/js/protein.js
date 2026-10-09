// BlackPhage — procedural protein surface
// Builds a solvent-excluded-like molecular surface from a pseudo-protein chain
// (marching cubes over metaballs), then animates it with a gentle undulating
// displacement and a pulsing "smart binding site" directly in the shader.

import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

// Deterministic RNG so the protein is always the same fold.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomUnit(rand, out = new THREE.Vector3()) {
  const u = rand() * 2 - 1;
  const phi = rand() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return out.set(s * Math.cos(phi), s * Math.sin(phi), u);
}

// Surface palette — inspired by electrostatic surface maps, tuned for a dark UI.
const PALETTE = {
  positive: new THREE.Color('#4f6bff'),
  negative: new THREE.Color('#ff4d6d'),
  polar: new THREE.Color('#e9e4f5'),
  hydrophobic: new THREE.Color('#ffc46b'),
};

// Generates a compact, globular backbone with helical stretches and side-chain bumps.
function buildChain({ seed = 11, residues = 210 } = {}) {
  const rand = mulberry32(seed);
  const center = new THREE.Vector3(0.5, 0.5, 0.5);
  const R = 0.27;
  const step = 0.036;
  const minDist = 0.038;

  const backbone = [];
  const p = center.clone().add(new THREE.Vector3(-0.12, 0.05, 0.02));
  const dir = randomUnit(rand);
  const tmp = new THREE.Vector3();
  const cand = new THREE.Vector3();
  let helix = 0;
  let helixAxis = new THREE.Vector3();
  let helixPhase = 0;

  for (let i = 0; i < residues; i++) {
    if (helix <= 0 && rand() < 0.06) {
      helix = 8 + Math.floor(rand() * 10);
      helixAxis = dir.clone();
    }
    let placed = false;
    for (let tries = 0; tries < 60 && !placed; tries++) {
      const nd = new THREE.Vector3();
      if (helix > 0) {
        // coil around the helix axis
        helixPhase += 1.75;
        const perp = new THREE.Vector3(1, 0, 0).cross(helixAxis).normalize();
        const perp2 = helixAxis.clone().cross(perp);
        nd.copy(helixAxis).multiplyScalar(0.45)
          .addScaledVector(perp, Math.cos(helixPhase))
          .addScaledVector(perp2, Math.sin(helixPhase));
        nd.addScaledVector(randomUnit(rand, tmp), 0.15 + tries * 0.05);
      } else {
        nd.copy(dir).multiplyScalar(0.7).addScaledVector(randomUnit(rand, tmp), 0.9 + tries * 0.03);
      }
      const toC = center.clone().sub(p);
      const dc = toC.length();
      if (dc > R * 0.55) nd.addScaledVector(toC.normalize(), (dc / R) * 1.4);
      nd.normalize();
      cand.copy(p).addScaledVector(nd, step);

      let ok = cand.distanceTo(center) < R;
      for (let j = 0; ok && j < backbone.length - 2; j++) {
        if (backbone[j].pos.distanceTo(cand) < minDist) ok = false;
      }
      if (ok || tries === 59) {
        dir.copy(nd);
        p.copy(cand);
        placed = true;
      }
    }
    helix--;
    backbone.push({ pos: p.clone() });
  }

  // Residue chemistry: smooth patches so the surface reads like a real
  // electrostatic map rather than random speckle.
  const atoms = [];
  const cog = new THREE.Vector3();
  backbone.forEach((r) => cog.add(r.pos));
  cog.divideScalar(backbone.length);

  backbone.forEach((r, i) => {
    const q = r.pos;
    const f1 = Math.sin(q.x * 23 + 1.3) + Math.sin(q.y * 19 - 0.7) + Math.sin(q.z * 21 + 2.1);
    const f2 = Math.sin(q.x * 13 - q.z * 17 + 0.4) + Math.cos(q.y * 15 + q.x * 7);
    let color;
    if (f1 > 1.1) color = PALETTE.positive;
    else if (f1 < -1.15) color = PALETTE.negative;
    else if (f2 > 1.05) color = PALETTE.hydrophobic;
    else color = PALETTE.polar;

    atoms.push({ pos: q.clone(), r: 0.034, color });

    // side chain pointing outward
    const out = q.clone().sub(cog).normalize().addScaledVector(randomUnit(rand, tmp), 0.8).normalize();
    const len = 0.018 + rand() * 0.022;
    atoms.push({ pos: q.clone().addScaledVector(out, len), r: 0.022 + rand() * 0.012, color });
    if (rand() < 0.35) {
      atoms.push({ pos: q.clone().addScaledVector(out, len * 2.0), r: 0.016 + rand() * 0.008, color });
    }
    void i;
  });

  return { atoms, cog };
}

const NOISE_GLSL = /* glsl */ `
// Simplex 3D noise — Ashima Arts / Stefan Gustavson (MIT)
vec4 bp_permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 bp_taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float bp_snoise(vec3 v){
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
  vec4 norm = bp_taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

export function createProtein({ resolution = 104, seed = 11 } = {}) {
  const { atoms } = buildChain({ seed });

  const mc = new MarchingCubes(resolution, new THREE.MeshBasicMaterial(), false, true, 260000);
  mc.isolation = 80;
  mc.reset();
  const subtract = 12;
  for (const a of atoms) {
    // strength chosen so the isosurface radius ≈ atom radius
    const strength = a.r * a.r * (mc.isolation + subtract);
    mc.addBall(a.pos.x, a.pos.y, a.pos.z, strength, subtract, a.color);
  }
  mc.update();

  // Copy the triangulated surface into a compact, static geometry.
  const count = mc.count;
  const src = mc.geometry;
  const geometry = new THREE.BufferGeometry();
  const pos = src.getAttribute('position').array.slice(0, count * 3);
  const nor = src.getAttribute('normal').array.slice(0, count * 3);
  const col = src.getAttribute('color').array.slice(0, count * 3);
  // The accumulated palette is washed out towards white; renormalise and push
  // the saturation back up so the surface reads like an electrostatic map.
  const SAT = 1.55;
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const m = Math.max(col[i3], col[i3 + 1], col[i3 + 2], 1e-5);
    const r = col[i3] / m, g = col[i3 + 1] / m, b = col[i3 + 2] / m;
    const lum = 0.3 * r + 0.6 * g + 0.1 * b;
    const DIM = 0.72;
    col[i3] = Math.min(1, Math.max(0, lum + (r - lum) * SAT)) * DIM;
    col[i3 + 1] = Math.min(1, Math.max(0, lum + (g - lum) * SAT)) * DIM;
    col[i3 + 2] = Math.min(1, Math.max(0, lum + (b - lum) * SAT)) * DIM;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geometry.computeBoundingSphere();
  const bs = geometry.boundingSphere;
  geometry.translate(-bs.center.x, -bs.center.y, -bs.center.z);
  const scale = 1 / bs.radius;
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingSphere();
  mc.geometry.dispose();

  // Binding pocket: pick a surface point facing the viewer-right side.
  const pocketDir = new THREE.Vector3(0.55, 0.35, 0.75).normalize();
  let best = -Infinity;
  const pocket = new THREE.Vector3();
  const v = new THREE.Vector3();
  const posAttr = geometry.getAttribute('position');
  for (let i = 0; i < posAttr.count; i += 3) {
    v.fromBufferAttribute(posAttr, i);
    const s = v.dot(pocketDir);
    if (s > best) { best = s; pocket.copy(v); }
  }

  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.022 },
    uPocket: { value: pocket },
    uPocketColor: { value: new THREE.Color('#38f2d0') },
    uOpen: { value: 0.35 }, // 0 = binding site masked, 1 = fully exposed
  };

  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.46,
    metalness: 0.0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.4,
    sheen: 0.45,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#9fb4ff'),
    iridescence: 0.25,
    iridescenceIOR: 1.3,
    envMapIntensity: 0.5,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uTime;
uniform float uAmp;
uniform vec3 uPocket;
uniform float uOpen;
varying float vPocket;
${NOISE_GLSL}
float bp_wave(vec3 p){
  float t = uTime;
  float w = bp_snoise(p * 1.6 + vec3(0.0, t * 0.22, t * 0.15)) * 0.65
          + bp_snoise(p * 3.4 - vec3(t * 0.28, 0.0, t * 0.2)) * 0.35;
  // slow breathing over the whole molecule
  w += sin(t * 0.6 + p.y * 2.0) * 0.25;
  return w;
}
// Depth of the binding cleft at p: shallow when closed, open under acidity.
float bp_cleft(vec3 p){
  float d = distance(p, uPocket);
  float k = exp(-d * d * 7.0);
  return k * (0.025 + 0.075 * uOpen) * (0.92 + 0.08 * sin(uTime * 1.4));
}`)
      .replace('#include <beginnormal_vertex>', `
float bpE = 0.03;
float bpD0 = bp_wave(position) * uAmp - bp_cleft(position);
vec3 bpG = vec3(
  (bp_wave(position + vec3(bpE, 0.0, 0.0)) * uAmp - bp_cleft(position + vec3(bpE, 0.0, 0.0))) - bpD0,
  (bp_wave(position + vec3(0.0, bpE, 0.0)) * uAmp - bp_cleft(position + vec3(0.0, bpE, 0.0))) - bpD0,
  (bp_wave(position + vec3(0.0, 0.0, bpE)) * uAmp - bp_cleft(position + vec3(0.0, 0.0, bpE))) - bpD0) / bpE;
vec3 objectNormal = normalize(normal);
objectNormal = normalize(objectNormal - (bpG - dot(bpG, objectNormal) * objectNormal));
#ifdef USE_TANGENT
  vec3 objectTangent = vec3( tangent.xyz );
#endif`)
      .replace('#include <begin_vertex>', `
vec3 transformed = position + normal * bpD0;
float bpPd = distance(position, uPocket);
vPocket = exp(-bpPd * bpPd * 7.0);`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime;
uniform float uOpen;
uniform vec3 uPocketColor;
varying float vPocket;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float bpPulse = 0.65 + 0.35 * sin(uTime * 1.7);
float bpCore = smoothstep(0.35, 0.95, vPocket);
float bpRim = max(0.0, smoothstep(0.30, 0.62, vPocket) - bpCore);
// the cavity darkens as it opens; its edge picks up the binding-site colour
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02, 0.07, 0.08), bpCore * (0.45 + 0.45 * uOpen));
totalEmissiveRadiance += uPocketColor * bpRim * (0.25 + 1.6 * uOpen) * bpPulse;`);
  };

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  // --- binding-site marker: a ring on the surface plus a soft halo.
  const site = new THREE.Group();
  const normal = pocket.clone().normalize();
  site.position.copy(normal).multiplyScalar(pocket.length() * 0.97);
  site.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  const ringMat = new THREE.MeshBasicMaterial({
    color: uniforms.uPocketColor.value,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 12, 72), ringMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.006, 10, 60), ringMat.clone());
  ring2.material.opacity = 0.55;

  // radial halo sprite
  const halo = document.createElement('canvas');
  halo.width = halo.height = 128;
  const hctx = halo.getContext('2d');
  const hg = hctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  hg.addColorStop(0, 'rgba(56, 242, 208, 0.85)');
  hg.addColorStop(0.35, 'rgba(56, 242, 208, 0.28)');
  hg.addColorStop(1, 'rgba(56, 242, 208, 0)');
  hctx.fillStyle = hg;
  hctx.fillRect(0, 0, 128, 128);
  const haloTex = new THREE.CanvasTexture(halo);
  haloTex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9,
  }));
  glow.scale.setScalar(1.1);

  site.add(ring, ring2);
  mesh.add(site, glow);
  glow.position.copy(site.position);

  function updateSite(open, t) {
    const pulse = 0.72 + 0.28 * Math.sin(t * 1.7);
    const k = 0.25 + 0.75 * open;
    site.scale.setScalar(0.55 + 0.65 * open);
    ring.material.opacity = (0.12 + 0.42 * open) * pulse;
    ring2.material.opacity = (0.07 + 0.3 * open) * pulse;
    ring2.rotation.z = t * 0.5;
    glow.scale.setScalar((0.75 + 0.75 * open) * (0.96 + 0.04 * Math.sin(t * 2.1)));
    glow.material.opacity = (0.08 + 0.5 * open) * pulse * k;
  }

  return { mesh, uniforms, pocket, updateSite };
}
