// BlackPhage - la protéine de l'accueil. Une surface organique en verre liquide : elle réfracte l'aurore
// qui coule derrière elle, avec un peu de dispersion de couleur, un film irisé et des reflets de métal liquide.
// Rendu three.js, organisé comme une scène react-three-fiber : un Canvas, des objets, des useFrame.
// Sans WebGL, une image fixe prend le relais (voir site.css).
import * as THREE from 'three';
import { stage, useFrame, onResize } from './stage.js';
import { AURORA_GLSL, calmFor } from './aurora.js';

const root = document.documentElement;
const canvas = document.getElementById('bg');

function webgl2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }
if (!canvas || !webgl2()) { root.classList.add('no-webgl'); } else { start().catch((e) => { console.warn('bg', e); root.classList.add('no-webgl'); }); }

// ------------------------------------------------------------------ shaders
const NOISE3 = `
vec4 bp_permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 bp_inv(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float bp_noise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = bp_permute(bp_permute(bp_permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = bp_inv(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const VERT = `
attribute vec3 aNormal;
attribute float aAo;
uniform float uTime;
varying vec3 vN; varying vec3 vV; varying float vAo;
${NOISE3}
float wave(vec3 q){ float t = uTime; return bp_noise(q * 1.5 + vec3(0.0, t * 0.12, t * 0.08)) * 0.7 + bp_noise(q * 3.2 - vec3(t * 0.15, 0.0, t * 0.1)) * 0.3; }
void main(){
  vec3 n = normalize(aNormal);
  float e = 0.04; float d0 = wave(position);
  vec3 g = vec3(wave(position + vec3(e,0.,0.)) - d0, wave(position + vec3(0.,e,0.)) - d0, wave(position + vec3(0.,0.,e)) - d0) / e;
  vec3 p = position + n * d0 * 0.030;
  n = normalize(n - 0.07 * (g - dot(g, n) * n));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vV = mv.xyz; vN = normalize(normalMatrix * n); vAo = aAo;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
uniform vec2 uRes; uniform float uTime; uniform float uScroll; uniform float uCalm; uniform vec3 uKey;
varying vec3 vN; varying vec3 vV; varying float vAo;
${AURORA_GLSL}
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(-vV);
  if (dot(N, V) < 0.0) N = -N;
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.4);
  float depth = pow(1.0 - clamp(vAo, 0.0, 1.0), 1.25);           // cavités : le verre y est plus épais
  float thick = clamp((1.0 - ndv) * 0.80 + depth * 0.75, 0.0, 1.0);

  // verre liquide : l'aurore vue à travers la matière, décalée par la courbure, avec dispersion des couleurs
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 off = N.xy * (0.050 + 0.190 * thick);
  vec3 refr = vec3(bp_field(uv - off,        uTime, uScroll, aspect, uCalm).r,
                   bp_field(uv - off * 1.10, uTime, uScroll, aspect, uCalm).g,
                   bp_field(uv - off * 1.21, uTime, uScroll, aspect, uCalm).b);

  // absorption : le verre devient cobalt là où il est épais
  vec3 cobalt = vec3(0.06, 0.19, 0.80);
  vec3 azure  = vec3(0.36, 0.58, 1.00);
  float k = smoothstep(0.12, 0.95, thick);
  vec3 col = refr * mix(vec3(1.0), mix(azure, cobalt, k), 0.30 + 0.80 * k);
  col = mix(col, col * vec3(0.80, 0.86, 1.0), depth * 0.35);

  // lumière douce sur le volume
  vec3 L1 = normalize(uKey);
  vec3 L2 = normalize(vec3(-0.75, -0.25, 0.45));
  float dif = clamp(dot(N, L1) * 0.5 + 0.5, 0.0, 1.0);
  col *= mix(0.80, 1.06, dif);

  // film irisé, comme une bulle de savon
  vec3 iri = 0.5 + 0.5 * cos(6.28318 * (vec3(0.00, 0.33, 0.67) + ndv * 0.9 + thick * 0.45 + uTime * 0.012));
  col = mix(col, col * (0.55 + 0.75 * iri), 0.10 + 0.26 * fres);

  // reflets nets du verre et lisière lumineuse
  float s1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 140.0);
  float s2 = pow(max(dot(N, normalize(L2 + V)), 0.0), 40.0);
  float rim = pow(1.0 - ndv, 3.2);
  col += vec3(1.0) * s1 * 1.05 + vec3(0.75, 0.88, 1.0) * s2 * 0.38 + vec3(0.88, 0.94, 1.0) * rim * 0.50;

  // bandes de métal liquide, très discrètes, qui suivent la courbure
  float band = sin((N.y * 1.3 + N.x * 0.8 + N.z * 0.4) * 4.2 + uTime * 0.18);
  col += vec3(0.92, 0.96, 1.0) * smoothstep(0.55, 1.0, band) * (0.06 + 0.40 * fres) * 0.50;

  // arête sombre du verre, ce qui détache l'objet du fond clair
  col = mix(col, cobalt * 0.62, smoothstep(0.70, 1.0, 1.0 - ndv) * 0.55);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// ------------------------------------------------------------------- scène
async function start() {
  const data = await (await fetch((root.dataset.base || '') + 'assets/data/surface.json')).json();
  const pos = new Float32Array(b64(data.position).buffer);
  const nor = new Int8Array(b64(data.normal).buffer);
  const ao = b64(data.ao);
  const idx = new Uint16Array(b64(data.index).buffer);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aNormal', new THREE.BufferAttribute(nor, 3, true));
  geo.setAttribute('aAo', new THREE.BufferAttribute(ao, 1, true));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.6);

  const uniforms = {
    uTime: { value: 0 }, uScroll: { value: 0 }, uCalm: { value: calmFor(stage.w) },
    uRes: { value: new THREE.Vector2(1, 1) }, uKey: { value: new THREE.Vector3(0.5, 0.7, 0.6) },
  };
  const protein = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide }));
  protein.frustumCulled = false;
  const pivot = new THREE.Group();
  pivot.add(protein);
  const scene = new THREE.Scene();
  scene.add(pivot);

  // <Canvas>
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0xffffff, 0);
  const FOV = 28;
  const DIST = 9;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);
  camera.position.set(0, 0, DIST);
  const halfH = DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const buffer = new THREE.Vector2();
  onResize((s) => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75) * s.quality);
    renderer.setSize(s.w, s.h, false);
    camera.aspect = s.w / s.h;
    camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(buffer);
    uniforms.uRes.value.copy(buffer);
    uniforms.uCalm.value = calmFor(s.w);
  });

  // useFrame
  useFrame((s) => {
    const p = s.scroll;
    const small = s.w < 820;
    const size = (small ? 0.62 : 0.70) * halfH * 1.18;
    const halfW = halfH * s.w / s.h;
    pivot.scale.setScalar(size);
    pivot.position.set((small ? 0.2 : 0.60 - 0.50 * p) * halfW, (small ? 0.26 - 0.5 * p : 0.06 - 0.30 * p) * halfH, 0);
    pivot.rotation.set(0.35 + p * 0.9 + s.pointer.y * 0.12, -0.55 + p * 2.6 + s.time * 0.045 + s.pointer.x * 0.18, 0.12 - p * 0.5);
    // la protéine appartient à l'accueil : elle s'efface en douceur quand on descend dans la page
    const fade = 1 - THREE.MathUtils.smoothstep(p, 0.02, 0.20);
    canvas.style.opacity = fade.toFixed(3);
    if (fade < 0.015) return;                                     // invisible : on ne dessine plus rien
    uniforms.uTime.value = s.time;
    uniforms.uScroll.value = s.scroll;
    uniforms.uKey.value.set(0.5 + s.pointer.x * 0.9, 0.7 - s.pointer.y * 0.9, 0.62);   // la lumière suit le pointeur
    renderer.render(scene, camera);
  });
  root.classList.add('webgl-ready');
}
