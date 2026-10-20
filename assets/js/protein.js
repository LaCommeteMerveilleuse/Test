// BlackPhage - la protéine de la page d'un programme. Une surface organique en verre, dans la brume du soir :
// elle réfracte le ciel derrière elle, laisse passer un peu de couleur, et s'allume de l'intérieur par endroits,
// de la même lumière corail que le poisson de l'accueil.
// Rendu three.js, organisé comme une scène react-three-fiber : un Canvas, des objets, des useFrame.
// La protéine suit la zone .phero__art de la page : elle défile avec elle et disparaît quand elle sort de l'écran.
import * as THREE from 'three';
import { stage, useFrame, onResize } from './stage.js';
import { MIST_GLSL } from './mist.js';

const root = document.documentElement;
const BASE = root.dataset.base || '';

const VERT = `
attribute vec3 aNormal;
attribute float aAo;
uniform float uTime;
varying vec3 vN; varying vec3 vV; varying float vAo; varying vec3 vP;
${MIST_GLSL}
// une respiration lente : la surface ondule à peine
float wave(vec3 q){ float t = uTime; return (bp_vnoise(vec3(q.xy * 1.5 + vec2(t * 0.10, q.z * 1.3), t * 0.05)) * 0.7 + bp_vnoise(vec3(q.yz * 3.2 - vec2(t * 0.14, q.x * 2.1), 7.0)) * 0.3) * 2.0 - 1.0; }
void main(){
  vec3 n = normalize(aNormal);
  float e = 0.04; float d0 = wave(position);
  vec3 g = vec3(wave(position + vec3(e, 0., 0.)) - d0, wave(position + vec3(0., e, 0.)) - d0, wave(position + vec3(0., 0., e)) - d0) / e;
  vec3 p = position + n * d0 * 0.028;
  n = normalize(n - 0.07 * (g - dot(g, n) * n));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vV = mv.xyz; vN = normalize(normalMatrix * n); vAo = aAo; vP = p;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
uniform vec2 uRes; uniform float uTime; uniform float uAspect; uniform vec3 uKey;
varying vec3 vN; varying vec3 vV; varying float vAo; varying vec3 vP;
${MIST_GLSL}
// le ciel vu à travers le verre
vec3 seen(vec2 uv){ return bp_mist(uv, uAspect, uTime, 0.0, 0.0, 0.2) * 1.15 + vec3(0.04, 0.05, 0.10); }
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(-vV);
  if (dot(N, V) < 0.0) N = -N;
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.4);
  float depth = pow(1.0 - clamp(vAo, 0.0, 1.0), 1.25);          // cavités : le verre y est plus épais
  float thick = clamp((1.0 - ndv) * 0.80 + depth * 0.75, 0.0, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;

  // le ciel passe à travers la matière, décalé par la courbure, avec un peu de dispersion
  vec2 off = N.xy * (0.040 + 0.160 * thick);
  vec3 refr = vec3(seen(uv - off).r, seen(uv - off * 1.10).g, seen(uv - off * 1.21).b);

  // absorption : le verre devient indigo là où il est épais
  vec3 pale = vec3(0.84, 0.88, 1.0);
  vec3 deep = vec3(0.26, 0.30, 0.72);
  float k = smoothstep(0.10, 0.95, thick);
  vec3 col = refr * mix(pale, deep, k) * (0.90 + 0.9 * k);
  col += vec3(0.030, 0.040, 0.110) * (0.4 + 1.1 * thick);       // lueur de l'intérieur

  // l'intérieur s'allume par endroits, comme la peau du poisson : de grandes taches et de fines veines qui dérivent
  float n1 = bp_fbm(vec3(vP * 1.7 + vec3(uTime * 0.07, 0.0, uTime * 0.03)));
  float blot = smoothstep(0.46, 0.78, n1);
  float vein = pow(1.0 - abs(bp_vnoise(vec3(vP * 5.5 + vec3(0.0, uTime * 0.2, 3.0))) * 2.0 - 1.0), 8.0);
  float bio = blot * (0.35 + 0.65 * thick) + vein * 0.35 * thick;
  col += mix(vec3(0.86, 0.36, 0.78), vec3(1.0, 0.58, 0.28), smoothstep(0.1, 0.7, bio)) * bio * 0.85;

  // film irisé très discret
  vec3 iri = 0.5 + 0.5 * cos(6.28318 * (vec3(0.00, 0.33, 0.67) + ndv * 0.9 + thick * 0.45 + uTime * 0.012));
  col = mix(col, col * (0.55 + 0.75 * iri), 0.07 + 0.20 * fres);

  // reflets nets : la lumière du soir sur les arêtes, tiède du côté du poisson
  vec3 L1 = normalize(uKey);
  vec3 L2 = normalize(vec3(-0.75, -0.25, 0.45));
  float s1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 130.0);
  float s2 = pow(max(dot(N, normalize(L2 + V)), 0.0), 36.0);
  float rim = pow(1.0 - ndv, 3.0);
  col += vec3(1.0, 0.92, 0.88) * s1 * 1.0;
  col += vec3(0.60, 0.70, 1.0) * s2 * 0.34;
  col += mix(vec3(0.62, 0.72, 1.0), vec3(1.0, 0.66, 0.50), 0.55) * rim * 0.70;

  // arête sombre du verre, qui détache l'objet du fond
  col = mix(col, deep * 0.32, smoothstep(0.72, 1.0, 1.0 - ndv) * 0.35);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// une lueur qui s'ajoute à la page derrière la protéine : alpha 0 avec une couleur, le canevas s'ajoute au lieu de recouvrir
const HALO_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const HALO_FRAG = `
uniform float uAspect; uniform vec3 uHalo;
varying vec2 vUv;
void main(){
  vec2 d = (vUv - uHalo.xy) * vec2(uAspect, 1.0);
  float aura = exp(-pow(length(d) / (uHalo.z * 1.45), 2.0));
  gl_FragColor = vec4(vec3(0.95, 0.52, 0.62) * aura * 0.13 + vec3(0.45, 0.55, 1.0) * exp(-pow(length(d) / (uHalo.z * 2.4), 2.0)) * 0.10, 0.0);
}`;

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let started = false;

export async function initProtein() {
  if (started) return;
  const canvas = document.getElementById('protein');
  if (!canvas) return;
  try { if (!document.createElement('canvas').getContext('webgl2')) return; } catch { return; }
  started = true;

  const data = await (await fetch(`${BASE}assets/data/surface.json`)).json();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(b64(data.position).buffer), 3));
  geo.setAttribute('aNormal', new THREE.BufferAttribute(new Int8Array(b64(data.normal).buffer), 3, true));
  geo.setAttribute('aAo', new THREE.BufferAttribute(b64(data.ao), 1, true));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(b64(data.index).buffer), 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.6);

  const uniforms = {
    uTime: { value: 0 }, uAspect: { value: 1.6 }, uRes: { value: new THREE.Vector2(1, 1) }, uKey: { value: new THREE.Vector3(0.5, 0.7, 0.6) },
    uHalo: { value: new THREE.Vector3(0.7, 0.5, 0.2) },
  };
  const protein = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide }));
  protein.frustumCulled = false;
  const pivot = new THREE.Group();
  pivot.add(protein);
  const scene = new THREE.Scene();
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms, vertexShader: HALO_VERT, fragmentShader: HALO_FRAG, depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  }));
  halo.frustumCulled = false; halo.renderOrder = -5;
  scene.add(halo, pivot);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
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
    uniforms.uAspect.value = s.w / s.h;
  });

  useFrame((s) => {
    const art = document.querySelector('.phero__art');
    const r = art ? art.getBoundingClientRect() : null;
    const seen = r && r.width > 40 && r.bottom > -40 && r.top < s.h + 40;
    if (!seen) { canvas.style.opacity = '0'; return; }
    // la protéine occupe la zone .phero__art : centre et taille suivent le cadre à l'écran
    const cx = ((r.left + r.width / 2) / s.w * 2 - 1) * halfH * (s.w / s.h);
    const cy = (1 - (r.top + r.height / 2) / s.h * 2) * halfH;
    const diameter = Math.min(r.width * 0.92, r.height * 1.02);
    const scale = (diameter / s.h * 2 * halfH) / 1.93;       // le maillage tient dans une sphère de rayon 0,965
    uniforms.uHalo.value.set((r.left + r.width / 2) / s.w, 1 - (r.top + r.height / 2) / s.h, diameter / 2 / s.h);
    pivot.scale.setScalar(scale);
    pivot.position.set(cx, cy, 0);
    const t = s.time;
    pivot.rotation.set(0.35 + s.pointer.y * 0.12 + 0.10 * Math.sin(t * 0.21), -0.55 + t * 0.05 + s.pointer.x * 0.20, 0.12 + 0.05 * Math.sin(t * 0.17));
    uniforms.uTime.value = t;
    uniforms.uKey.value.set(0.5 + s.pointer.x * 0.9, 0.7 - s.pointer.y * 0.9, 0.62);   // la lumière suit le pointeur
    const edge = smooth(-40, 140, r.bottom) * (1 - smooth(s.h - 160, s.h + 40, r.top));
    canvas.style.opacity = edge.toFixed(3);
    renderer.render(scene, camera);
  });
  root.classList.add('webgl-ready');
}
