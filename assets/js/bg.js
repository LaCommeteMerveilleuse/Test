// BlackPhage - fond de la page d'accueil : une surface organique bleu et blanc, qui ondule doucement
// et dérive pendant le défilement. Rendu three.js. Sans WebGL, une image fixe prend le relais (voir site.css).
import * as THREE from 'three';

const root = document.documentElement;
const canvas = document.getElementById('bg');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webgl2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }
if (!canvas || !webgl2()) { root.classList.add('no-webgl'); } else { start().catch(() => root.classList.add('no-webgl')); }

const NOISE = `
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
${NOISE}
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
varying vec3 vN; varying vec3 vV; varying float vAo;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(-vV);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L1 = normalize(vec3(0.5, 0.7, 0.6)); vec3 L2 = normalize(vec3(-0.7, -0.2, 0.4));
  float key = clamp(dot(N, L1) * 0.5 + 0.5, 0.0, 1.0);
  float fill = clamp(dot(N, L2) * 0.5 + 0.5, 0.0, 1.0);
  float ao = pow(clamp(vAo, 0.0, 1.0), 2.4);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.2);

  // couleurs en lumière linéaire (la conversion finale les éclaircit)
  vec3 white = vec3(0.93, 0.95, 1.00);
  vec3 sky   = vec3(0.30, 0.47, 0.92);
  vec3 blue  = vec3(0.017, 0.07, 0.56);
  vec3 deep  = vec3(0.004, 0.012, 0.20);

  float light = key * 0.55 + ao * 0.60;
  vec3 col = mix(blue, white, smoothstep(0.42, 0.95, light));
  col = mix(col, sky, fres * 0.40 * (1.0 - smoothstep(0.5, 1.0, light)));
  col = mix(deep, col, smoothstep(0.02, 0.45, ao + fill * 0.20));
  float spec = pow(max(dot(N, normalize(L1 + V)), 0.0), 60.0) * 0.55;
  col += vec3(spec);
  float fog = smoothstep(7.4, 11.0, -vV.z);
  col = mix(col, vec3(1.0), fog * 0.30);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

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

  const uniforms = { uTime: { value: 0 } };
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide }));
  mesh.frustumCulled = false;
  const pivot = new THREE.Group();
  pivot.add(mesh);
  const scene = new THREE.Scene();
  scene.add(pivot);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0xffffff, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const FOV = 28;
  const DIST = 9;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);
  camera.position.set(0, 0, DIST);
  const halfH = DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  let W = 0; let H = 0;
  const resize = () => { W = innerWidth; H = innerHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize);
  resize();

  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX / W - 0.5; mouse.y = e.clientY / H - 0.5; }, { passive: true });

  const cur = { p: 0 };
  const clock = new THREE.Clock();
  let visible = !document.hidden;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.25);
    const t = clock.elapsedTime * (reduce ? 0.15 : 1);
    const max = Math.max(1, document.documentElement.scrollHeight - H);
    const target = Math.min(1, scrollY / max);
    cur.p += (target - cur.p) * (1 - Math.exp(-dt * 4));
    const p = cur.p;

    const small = W < 820;
    const size = (small ? 0.62 : 0.75) * halfH * 1.18;                    // rayon en unités monde
    const halfW = halfH * W / H;
    const ox = (small ? 0.2 : 0.66 - 0.55 * p) * halfW;
    const oy = (small ? 0.26 - 0.5 * p : 0.06 - 0.30 * p) * halfH;
    pivot.scale.setScalar(size);
    pivot.position.set(ox, oy, 0);
    pivot.rotation.set(0.35 + p * 0.9 + mouse.y * 0.12, -0.55 + p * 2.6 + t * 0.045 + mouse.x * 0.18, 0.12 - p * 0.5);
    uniforms.uTime.value = t;
    renderer.render(scene, camera);
  }
  root.classList.add('webgl-ready');
  frame();
}
