// BlackPhage - l'agent. Un seul nuage de cubes (jusqu'à 59 049, soit 243 x 243) qui change de forme.
// Chaque cube connaît sa place dans cinq formes (cerveau, trois amas, robot, ruban arrimé, flux de signal) et dans une grille
// analytique qui se subdivise (1 x 1, 3 x 3, 9 x 9 ... jusqu'à l'ensemble des cubes), puis se referme en sphère.
// Entre deux formes, les cubes voyagent en poussière. Le curseur les disperse, puis ils se rassemblent.
// Tout se passe dans le vertex shader : le processeur ne touche qu'à des uniformes.
import * as THREE from 'three';

// 0 gris clair, 1 gris moyen, 2 gris sombre, 3 Timber Glow (lumineux), 4 Deep Canyon Blue, 5 Shadow Pine, 6 blanc, 7 Cliff Mist
export const PALETTE = ['#cdd4d7', '#a0abb1', '#6a757c', '#e0a35c', '#2a5f86', '#27463d', '#f7f9f9', '#c8d1d3'];
export const GRID_HIGH = 243;      // 243 x 243 = 59 049 cubes
export const GRID_LOW = 81;        // 81 x 81 = 6 561 cubes
const FOV = 28;
const CAM_Z = 14;

const VERT = /* glsl */ `
attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec3 aP4;
attribute vec3 aTa; attribute vec2 aTb; attribute vec4 aR;
uniform float uA; uniform float uB; uniform float uMix; uniform float uDust; uniform float uTime; uniform float uFade;
uniform mat4 uMA; uniform mat4 uMB; uniform float uSA; uniform float uSB;
uniform float uCube[6];
uniform float uLevel; uniform float uBend; uniform float uG; uniform float uL;
uniform vec3 uHit; uniform float uRad; uniform float uDisperse; uniform float uGlowAll;
uniform vec3 uPal[8];
varying vec3 vCol; varying float vShade; varying vec2 vUv; varying float vGlow; varying float vFog;
const float PI = 3.14159265;

mat3 rotAxis(vec3 a, float ang) {
  float c = cos(ang); float s = sin(ang); float t = 1.0 - c;
  return mat3(t * a.x * a.x + c, t * a.x * a.y + s * a.z, t * a.x * a.z - s * a.y,
              t * a.x * a.y - s * a.z, t * a.y * a.y + c, t * a.y * a.z + s * a.x,
              t * a.x * a.z + s * a.y, t * a.y * a.z - s * a.x, t * a.z * a.z + c);
}

struct Sh { vec3 p; float edge; mat3 b; float tag; float born; float thick; };

bool isRep(vec2 id, float st) { return mod(id.x, st) < 0.5 && mod(id.y, st) < 0.5; }

Sh shape(float k) {
  Sh s; s.b = mat3(1.0); s.born = 0.0; s.thick = 1.0; s.tag = 7.0; s.edge = 0.0; s.p = vec3(0.0);
  if (k < 0.5) { s.p = aP0; s.tag = aTa.x; s.edge = uCube[0]; }
  else if (k < 1.5) { s.p = aP1; s.tag = aTa.y; s.edge = uCube[1]; }
  else if (k < 2.5) { s.p = aP2; s.tag = aTa.z; s.edge = uCube[2]; }
  else if (k < 3.5) { s.p = aP3; s.tag = aTb.x; s.edge = uCube[3]; }
  else if (k < 4.5) { s.p = aP4; s.tag = aTb.y; s.edge = uCube[4]; }
  else {
    // la grille : 1 x 1, 3 x 3, 9 x 9 ... chaque case se divise en neuf, puis le plan se referme en sphère (projection octaédrale)
    float gi = float(gl_InstanceID);
    vec2 id = vec2(mod(gi, uG), floor(gi / uG));
    float lv = clamp(uLevel, 0.0, uL);
    float s0 = min(floor(lv), uL); float f = lv - s0; float s1 = min(s0 + 1.0, uL);
    float e = f * f * (3.0 - 2.0 * f);
    float st0 = pow(3.0, uL - s0); float st1 = pow(3.0, uL - s1);
    bool r0 = isRep(id, st0); bool r1 = isRep(id, st1);
    vec2 c0 = (floor(id / st0) + 0.5) * st0 / uG;
    vec2 c1 = (floor(id / st1) + 0.5) * st1 / uG;
    vec2 c = mix(c0, c1, e);
    float cell = mix(r0 ? st0 : 0.0, r1 ? st1 : 0.0, e) / uG;
    // des cubes « nés » à ce niveau brillent, puis s'éteignent quand le niveau suivant arrive
    bool new0 = r0 && (s0 < 0.5 || !isRep(id, pow(3.0, uL - max(s0 - 1.0, 0.0))));
    bool new1 = r1 && !r0;
    s.born = (new0 ? (1.0 - e) : 0.0) + (new1 ? e : 0.0);
    vec3 plane = vec3((c - 0.5) * 2.0, 0.0);
    vec2 o = c * 2.0 - 1.0;
    vec3 v = vec3(o.x, o.y, 1.0 - abs(o.x) - abs(o.y));
    if (v.z < 0.0) v.xy = (1.0 - abs(v.yx)) * sign(v.xy);
    vec3 nS = normalize(v);
    s.p = mix(plane, nS, uBend);
    vec3 up = abs(nS.y) > 0.95 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
    vec3 tt = normalize(cross(up, nS)); vec3 bb = cross(nS, tt);
    s.b = mat3(mix(vec3(1.0, 0.0, 0.0), tt, uBend), mix(vec3(0.0, 1.0, 0.0), bb, uBend), mix(vec3(0.0, 0.0, 1.0), nS, uBend));
    s.edge = cell * 2.0 * 0.9 * mix(1.0, 1.85, uBend);
    s.thick = mix(0.3, 0.8, uBend);
    s.tag = 7.0;
  }
  return s;
}

void main() {
  Sh A = shape(uA); Sh B = shape(uB);
  float d = aR.x * 0.34;
  float t = smoothstep(d, d + 0.66, uMix);
  vec3 wA = (uMA * vec4(A.p, 1.0)).xyz; vec3 wB = (uMB * vec4(B.p, 1.0)).xyz;
  vec3 pos = mix(wA, wB, t);
  float mid = sin(PI * t);
  vec3 rnd = aR.yzw * 2.0 - 1.0;
  float sc = mix(uSA, uSB, t);
  // la poussière : chaque cube s'écarte de sa route, tourne un peu, puis se pose
  vec3 drift = rnd + 0.55 * vec3(sin(uTime * 0.7 + aR.x * 20.0), cos(uTime * 0.6 + aR.y * 20.0), sin(uTime * 0.5 + aR.z * 20.0));
  pos += drift * mid * uDust * sc * 0.85;
  vec3 axis = normalize(rnd + vec3(0.001, 0.002, 0.003));
  mat3 rd = rotAxis(axis, mid * uDust * (aR.w * 5.0 + 1.0));
  // le souffle : de petits mouvements de chaque cube, pour que la forme respire
  pos += vec3(sin(uTime * 0.9 + aR.x * 40.0), cos(uTime * 0.8 + aR.y * 40.0), sin(uTime * 0.7 + aR.z * 40.0)) * 0.012 * sc;
  // le curseur : les cubes proches s'écartent, tournent, puis reviennent
  vec2 dh = pos.xy - uHit.xy;
  float r = length(dh);
  float fh = exp(-(r * r) / (uRad * uRad)) * uDisperse;
  vec3 dir = normalize(vec3(dh, (aR.z - 0.5) * uRad * 1.4) + vec3(0.0001));
  pos += dir * fh * uRad * (0.45 + 1.7 * aR.x);
  pos += vec3(sin(aR.y * 50.0 + uTime * 2.0), cos(aR.z * 50.0 + uTime * 2.3), sin(aR.w * 50.0 + uTime * 1.7)) * fh * uRad * 0.3;
  mat3 rh = rotAxis(normalize(rnd + vec3(0.003)), fh * 5.0 * (aR.w + 0.4));
  mat3 bA = mat3(uMA) / uSA * A.b; mat3 bB = mat3(uMB) / uSB * B.b;
  mat3 bas = mat3(mix(bA[0], bB[0], t), mix(bA[1], bB[1], t), mix(bA[2], bB[2], t));
  float edge = mix(A.edge * uSA, B.edge * uSB, t) * (0.9 + 0.2 * aR.w) * uFade;
  float thick = mix(A.thick, B.thick, t);
  vec3 local = position * vec3(edge, edge, edge * thick);
  mat3 rot = rd * rh;
  vec3 wp = pos + rot * (bas * local);
  vec3 nrm = normalize(rot * (bas * normal));
  // la lumière : une clé en haut à gauche, un fond doux, un reflet sur le dessus
  vec3 L = normalize(vec3(-0.5, 0.8, 0.7));
  float lam = max(dot(nrm, L), 0.0);
  float hemi = 0.5 + 0.5 * nrm.y;
  vShade = 0.58 + 0.34 * lam + 0.14 * hemi;
  float tagF = mix(A.tag, B.tag, step(0.5, t));
  int ti = int(clamp(tagF + 0.5, 0.0, 7.0));
  vCol = uPal[ti] * (0.93 + 0.12 * aR.w);
  float gl = (ti == 3 ? 1.0 : 0.0);
  vGlow = max(gl, mix(A.born, B.born, t)) + uGlowAll * (0.35 + 0.65 * aR.x);
  vUv = uv;
  vFog = smoothstep(0.4, -2.2, wp.z) * 0.4;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const FRAG = /* glsl */ `
varying vec3 vCol; varying float vShade; varying vec2 vUv; varying float vGlow; varying float vFog;
void main() {
  float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float bevel = mix(0.74, 1.0, smoothstep(0.0, 0.14, e));
  vec3 c = vCol * vShade * bevel;
  vec3 glow = vec3(0.93, 0.62, 0.28);
  c = mix(c, glow, clamp(vGlow, 0.0, 1.0) * 0.8) + glow * clamp(vGlow, 0.0, 1.5) * 0.18;
  c = mix(c, vec3(1.0), vFog);
  gl_FragColor = vec4(c, 1.0);
}`;

/**
 * Crée l'agent. shapes : un tableau de cinq formes { pos, tag, cube } (voir shapes.js).
 * n : nombre de cubes, GRID_HIGH^2 ou GRID_LOW^2.
 */
export function createAgent({ canvas, n, shapes, alpha = true }) {
  const G = Math.round(Math.sqrt(n));
  const L = Math.round(Math.log(G) / Math.log(3));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'high-performance' });
  renderer.setClearColor(0xffffff, alpha ? 0 : 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 80);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(0, 0, 0);

  const box = new THREE.BoxGeometry(1, 1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = box.index;
  geo.setAttribute('position', box.attributes.position);
  geo.setAttribute('normal', box.attributes.normal);
  geo.setAttribute('uv', box.attributes.uv);
  geo.instanceCount = n;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  // toutes les formes sont classées de gauche à droite : un cube de la gauche d'une forme va vers la gauche de la suivante
  const attrs = [];
  const tagA = new Float32Array(n * 3); const tagB = new Float32Array(n * 2);
  const cubes = new Float32Array(6);
  shapes.forEach((sh, k) => {
    const order = new Uint32Array(n);
    for (let i = 0; i < n; i++) order[i] = i;
    order.sort((a, b) => sh.pos[a * 3] - sh.pos[b * 3] || sh.pos[a * 3 + 1] - sh.pos[b * 3 + 1]);
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const j = order[i];
      p[i * 3] = sh.pos[j * 3]; p[i * 3 + 1] = sh.pos[j * 3 + 1]; p[i * 3 + 2] = sh.pos[j * 3 + 2];
      if (k < 3) tagA[i * 3 + k] = sh.tag[j]; else tagB[i * 2 + (k - 3)] = sh.tag[j];
    }
    geo.setAttribute('aP' + k, new THREE.InstancedBufferAttribute(p, 3));
    cubes[k] = sh.cube;
    attrs.push(p);
  });
  geo.setAttribute('aTa', new THREE.InstancedBufferAttribute(tagA, 3));
  geo.setAttribute('aTb', new THREE.InstancedBufferAttribute(tagB, 2));
  const rnd = new Float32Array(n * 4);
  let s = 12345;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < n * 4; i++) rnd[i] = rand();
  geo.setAttribute('aR', new THREE.InstancedBufferAttribute(rnd, 4));

  const uniforms = {
    uA: { value: 0 }, uB: { value: 0 }, uMix: { value: 0 }, uDust: { value: 1 }, uTime: { value: 0 }, uFade: { value: 1 },
    uMA: { value: new THREE.Matrix4() }, uMB: { value: new THREE.Matrix4() }, uSA: { value: 1 }, uSB: { value: 1 },
    uCube: { value: cubes },
    uLevel: { value: 0 }, uBend: { value: 0 }, uG: { value: G }, uL: { value: L },
    uHit: { value: new THREE.Vector3(1e4, 1e4, 0) }, uRad: { value: 1 }, uDisperse: { value: 0 }, uGlowAll: { value: 0 },
    uPal: { value: PALETTE.map((h) => { const c = new THREE.Color().setStyle(h, THREE.LinearSRGBColorSpace); return new THREE.Vector3(c.r, c.g, c.b); }) },   // sRGB tel quel, sans conversion
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  let W = 1; let H = 1; let pxw = 0.01;
  const visibleH = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360);
  const tmpQ = new THREE.Quaternion(); const tmpE = new THREE.Euler(0, 0, 0, 'YXZ');
  const tmpP = new THREE.Vector3(); const tmpS = new THREE.Vector3();

  function resize(w, h, dpr) {
    W = w; H = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pxw = visibleH / h;
  }

  /** Pixels de l'écran (y vers le bas) vers le monde. */
  const toWorld = (x, y) => [(x - W / 2) * pxw, -(y - H / 2) * pxw];

  /** Une ancre : où et avec quelle taille une forme se pose. x, y en pixels du viewport, scale en pixels par unité de la forme. */
  function anchorMatrix(a, out) {
    const [wx, wy] = toWorld(a.x, a.y);
    const sw = a.scale * pxw;
    tmpE.set(a.rx || 0, a.ry || 0, a.rz || 0, 'YXZ');
    tmpQ.setFromEuler(tmpE);
    tmpP.set(wx, wy, a.z || 0);
    tmpS.set(sw, sw, sw);
    return out.compose(tmpP, tmpQ, tmpS);
  }

  /** Règle l'agent. p : { a, b, mix, dust, fade, time, anchorA, anchorB, level, bend, disperse, hit:{x,y}, glow, radius } */
  function set(p) {
    uniforms.uA.value = p.a; uniforms.uB.value = p.b; uniforms.uMix.value = p.mix;
    if (p.dust !== undefined) uniforms.uDust.value = p.dust;
    if (p.fade !== undefined) uniforms.uFade.value = p.fade;
    uniforms.uTime.value = p.time || 0;
    anchorMatrix(p.anchorA, uniforms.uMA.value); uniforms.uSA.value = p.anchorA.scale * pxw;
    anchorMatrix(p.anchorB || p.anchorA, uniforms.uMB.value); uniforms.uSB.value = (p.anchorB || p.anchorA).scale * pxw;
    if (p.level !== undefined) uniforms.uLevel.value = p.level;
    if (p.bend !== undefined) uniforms.uBend.value = p.bend;
    uniforms.uDisperse.value = p.disperse || 0;
    if (p.hit) { const [hx, hy] = toWorld(p.hit.x, p.hit.y); uniforms.uHit.value.set(hx, hy, 0); }
    uniforms.uRad.value = (p.radius || 120) * pxw;
    uniforms.uGlowAll.value = p.glow || 0;
  }

  const render = () => renderer.render(scene, camera);

  return { renderer, scene, camera, uniforms, mesh, resize, set, render, toWorld, anchorMatrix, get pxw() { return pxw; }, n, G, L,
    dispose() { geo.dispose(); material.dispose(); renderer.dispose(); } };
}
