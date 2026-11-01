// BlackPhage - les objets lisses. Au repos, chaque section montre son objet en maillage lisse et réaliste : le cerveau (translucide, avec ses fibres et ses
// impulsions) et le robot. Entre deux sections, et sous le curseur, l'objet se brise en petits cubes (le moteur de cubes, agent.js, prend le relais).
//
// Les maillages sont calculés dans un worker (mesh.worker.js) à partir des champs de distance des formes. Le fractionnement est un « dissolve » par cases
// cubiques : une case disparaît quand sa valeur de hachage passe sous le seuil, et ses bords brillent en Timber Glow. La même fonction (hoverDis) décide, dans
// ce fichier et dans agent.js, quelle case est lisse et quelle case est en cubes : jamais de trou, jamais de doublon.
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

const HOVER_GLSL = `
uniform vec3 uHit; uniform float uRad; uniform float uDisperse;
float hoverDis(vec2 w) { float d = length(w - uHit.xy); return clamp(uDisperse * 1.6, 0.0, 1.0) * (1.0 - smoothstep(0.45 * uRad, 1.5 * uRad, d)); }
float hash31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }`;

/** Un petit studio de lumière (plafond clair, horizon bleuté, sol sombre, trois boîtes à lumière) prérendu en environnement. */
function studioEnv(THREE, renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const sc = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; void main() { float y = vP.y; vec3 top = vec3(1.0) * 1.15; vec3 hor = vec3(0.78, 0.84, 0.90) * 0.95; vec3 low = vec3(0.20, 0.24, 0.30) * 0.85; vec3 c = y > 0.0 ? mix(hor, top, smoothstep(0.0, 0.8, y)) : mix(hor, low, smoothstep(0.0, -0.7, y)); gl_FragColor = vec4(c, 1.0); }',
  }));
  sc.add(dome);
  const panel = (w, h, pos, k, hex = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); sc.add(m);
  };
  panel(16, 10, [-16, 20, 18], 9);                 // la grande boîte à lumière, en haut à gauche
  panel(5, 26, [30, 6, 12], 6);                    // la bande, à droite
  panel(14, 6, [0, -12, 22], 1.6, 0xdfe9f2);       // l'appoint, en bas
  panel(10, 10, [0, 26, -10], 4);                  // le contre-jour
  const rt = pm.fromScene(sc, 0.035);
  pm.dispose();
  dome.geometry.dispose(); dome.material.dispose();
  return rt.texture;
}

/**
 * Le matériau physique du robot. La matière vient du sommet (aMat : métal, rugosité, émission, vernis ; la couleur contient déjà l'occlusion), la pièce
 * aussi (aPart) : le vertex shader anime chaque pièce autour de son pivot (la tête suit le curseur, les yeux clignent, la main droite salue, l'anneau tourne,
 * l'antenne oscille, la flamme vacille). Les cubes ne bougent pas : l'animation s'efface donc sous le curseur et pendant le fractionnement (k), là où
 * lisse et cubes se remplacent case par case.
 */
function makeRobotMaterial(THREE, env, hover, parts, rig) {
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.4, metalness: 0.3, clearcoat: 1.0, clearcoatRoughness: 0.12,
    envMap: env, envMapIntensity: 1.0,
  });
  const part = (id) => parts.find((q) => q.id === id) || {};
  const V = (a, d = [0, 0, 0]) => new THREE.Vector3(...(a || d));
  // les articulations des bras (épaule, coude, poignet), côté gauche de l'écran puis côté droit
  const R = rig || { shoulder: [[-0.372, -0.297, -0.01], [0.372, -0.297, -0.01]], elbow: [[-0.505, -0.305, 0.04], [0.515, -0.265, 0.04]], wrist: [[-0.64, -0.279, 0.146], [0.73, -0.343, 0.168]] };
  const u = {
    uDis: { value: 0 }, uTime: { value: 0 }, uCell: { value: 0.04 }, uGlow: { value: new THREE.Color(0xe0a35c).convertSRGBToLinear() },
    uLook: { value: new THREE.Vector2() }, uAnim: { value: 1 }, uWave: { value: 0 },
    uShL: { value: V(R.shoulder[0]) }, uElL: { value: V(R.elbow[0]) }, uWbL: { value: V(R.wrist[0]) }, uShR: { value: V(R.shoulder[1]) }, uElR: { value: V(R.elbow[1]) }, uWbR: { value: V(R.wrist[1]) },
    uHeadP: { value: V(part(1).pivot) }, uAntP: { value: V(part(5).pivot) }, uHandLP: { value: V(part(2).pivot) }, uHandRP: { value: V(part(3).pivot) },
    uRingC: { value: V(part(4).center) }, uRingAx: { value: V(part(4).axis, [0, 1, 0]).normalize() }, uFlameP: { value: V(part(6).pivot) },
    uEyeLC: { value: V(part(7).center) }, uEyeRC: { value: V(part(8).center) }, uEyeUp: { value: V(part(7).up, [0, 1, 0]).normalize() },
  };
  mat.userData.u = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, hover);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 aMat; attribute float aPart; attribute float aGlow;
varying vec4 vMat; varying float vGlow; varying float vEm; varying vec3 vLoc; varying vec3 vWorld;
uniform float uTime; uniform float uAnim; uniform vec2 uLook; uniform float uWave;
uniform vec3 uShL; uniform vec3 uElL; uniform vec3 uWbL; uniform vec3 uShR; uniform vec3 uElR; uniform vec3 uWbR;
uniform vec3 uHeadP; uniform vec3 uAntP; uniform vec3 uHandLP; uniform vec3 uHandRP; uniform vec3 uRingC; uniform vec3 uRingAx; uniform vec3 uFlameP;
uniform vec3 uEyeLC; uniform vec3 uEyeRC; uniform vec3 uEyeUp;
${HOVER_GLSL}
vec3 rotA(vec3 v, vec3 ax, float a) { float c = cos(a); float s = sin(a); return v * c + cross(ax, v) * s + ax * dot(ax, v) * (1.0 - c); }
void rotAbout(inout vec3 p, inout vec3 n, vec3 pv, vec3 ax, float a) { p = pv + rotA(p - pv, ax, a); n = rotA(n, ax, a); }
// les bras : l'épaule lève le bras, le coude balance l'avant-bras, le poignet agite la main. Les bras sont du maillage du corps : on les écorche en douceur
// (le poids croît vers l'extérieur de l'épaule, puis au-delà du coude), les mains tournent d'un bloc avec l'avant-bras.
// uWave (0 à 1) : la main droite salue. k : 1 pleine animation, 0 au repos.
void bpArms(inout vec3 p, inout vec3 n, int ip, float k) {
  float t = uTime; float wv = uWave * k;
  vec3 Z = vec3(0.0, 0.0, 1.0);
  float aR = (0.04 + 0.10 * wv + 0.018 * sin(t * 1.3)) * k;
  float eR = (wv * (-0.14 + 0.36 * sin(t * 7.0)) + 0.05 * sin(t * 1.7)) * k;       // la main se penche vers l'extérieur plus qu'elle ne revient vers la tête
  float wR = (0.28 * wv * sin(t * 7.0 - 1.1) + 0.05 * sin(t * 1.1)) * k;
  float aL = (-0.03 + 0.03 * sin(t * 1.1 + 1.0)) * k;
  float eL = 0.10 * sin(t * 1.35 + 0.5) * k;
  float wL = 0.08 * sin(t * 1.05 + 0.7) * k;
  if (ip == 3) {
    rotAbout(p, n, uHandRP, Z, wR); rotAbout(p, n, uElR, Z, eR); rotAbout(p, n, uShR, Z, aR);
  } else if (ip == 2) {
    rotAbout(p, n, uHandLP, Z, wL); rotAbout(p, n, uElL, Z, eL); rotAbout(p, n, uShL, Z, aL);
  } else {
    float wAR = smoothstep(-0.02, 0.04, p.x - uShR.x); float wAL = smoothstep(-0.02, 0.04, uShL.x - p.x);
    float wER = smoothstep(-0.035, 0.045, dot(p - uElR, normalize(uWbR - uElR))); float wEL = smoothstep(-0.035, 0.045, dot(p - uElL, normalize(uWbL - uElL)));
    if (wAR > 0.0) { if (wER > 0.0) rotAbout(p, n, uElR, Z, eR * wER); rotAbout(p, n, uShR, Z, aR * wAR); }
    else if (wAL > 0.0) { if (wEL > 0.0) rotAbout(p, n, uElL, Z, eL * wEL); rotAbout(p, n, uShL, Z, aL * wAL); }
  }
}
// k : 1 pleine animation, 0 au repos (la pose des cubes)
void bpAnimate(inout vec3 p, inout vec3 n, float part, float k, out float em) {
  int ip = int(part + 0.5);
  float t = uTime;
  em = 1.0;
  // le clignement : un coup rapide toutes les quatre secondes, parfois un double
  float b1 = mod(t + 0.7, 4.3); float b2 = mod(t * 0.61 + 3.0, 9.1);
  float blink = max(b1 < 0.17 ? sin(b1 / 0.17 * 3.14159) : 0.0, b2 < 0.15 ? sin(b2 / 0.15 * 3.14159) : 0.0);
  if (ip == 7 || ip == 8) {                                   // les yeux : la lentille s'aplatit le long de la verticale de la tête
    vec3 c = ip == 7 ? uEyeLC : uEyeRC;
    p -= uEyeUp * dot(p - c, uEyeUp) * blink * 0.93 * k;
  } else if (ip == 5) {                                       // l'antenne oscille autour de sa base, et sa perle bat doucement
    vec3 ax = normalize(vec3(0.3, 0.0, 1.0));
    rotAbout(p, n, uAntP, ax, sin(t * 1.7) * 0.10 * k + sin(t * 0.7 + 1.0) * 0.05 * k);
    em = 0.8 + 0.3 * sin(t * 2.6);
  } else if (ip == 2 || ip == 3) {                                // les mains suivent leur bras
    bpArms(p, n, ip, k);
  } else if (ip == 4) {                                       // l'anneau tourne autour de son axe, ses satellites en orbite
    rotAbout(p, n, uRingC, normalize(uRingAx), t * 0.5 * k);
  } else if (ip == 6) {                                       // la flamme vacille sous la tuyère
    float f = 1.0 + (0.09 * sin(t * 19.0) + 0.05 * sin(t * 31.0 + 1.0)) * k;
    p.y = uFlameP.y + (p.y - uFlameP.y) * f;
    p.x += sin(t * 13.0 + p.y * 6.0) * 0.006 * k * clamp(uFlameP.y - p.y, 0.0, 0.4) * 4.0;
    em = 1.0 + 0.22 * sin(t * 23.0) * k;
  } else if (ip == 0) {
    bpArms(p, n, 0, k);                                       // les bras font partie du corps
    if (aMat.z > 0.5) em = 0.88 + 0.2 * sin(t * 1.6) * k;       // le coeur du robot respire
  }
  if (ip == 1 || ip == 5 || ip == 7 || ip == 8) {             // la tête (et ce qui lui est attaché) suit le curseur, un peu en retard sur le corps
    float yaw = uLook.x * 0.30 * k + sin(t * 0.55) * 0.05 * k;
    float pitch = uLook.y * 0.18 * k;
    float roll = -uLook.x * 0.05 * k + sin(t * 0.9) * 0.02 * k;
    rotAbout(p, n, uHeadP, vec3(0.0, 1.0, 0.0), yaw);
    rotAbout(p, n, uHeadP, vec3(1.0, 0.0, 0.0), pitch);
    rotAbout(p, n, uHeadP, vec3(0.0, 0.0, 1.0), roll);
  }
}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
vec3 bpPos = position; float bpEm = 1.0;
vMat = aMat; vGlow = aGlow; vLoc = position; vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
{ float kk = uAnim * (1.0 - hoverDis(vWorld.xy)); bpAnimate(bpPos, objectNormal, aPart, kk, bpEm); }
vEm = bpEm;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = bpPos;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uDis; uniform float uTime; uniform float uCell; uniform vec3 uGlow;
varying vec4 vMat; varying float vGlow; varying float vEm; varying vec3 vLoc; varying vec3 vWorld;
${HOVER_GLSL}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
float hh = hash31(floor(vLoc / uCell)) * 0.93;
float dis = max(uDis, hoverDis(vWorld.xy));
if (dis > 0.001 && hh < dis) discard;
float rimGlow = dis > 0.001 ? (1.0 - smoothstep(dis, dis + 0.08, hh)) * 1.8 : 0.0;`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vMat.x;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vMat.y;')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= vMat.w;\n#endif')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += vColor.rgb * (vMat.z * vEm * 1.1) + uGlow * (vGlow * 0.30 + rimGlow);`);
  };
  mat.customProgramCacheKey = () => 'bp-smooth-robot-2';
  return mat;
}

/** Le cerveau : une coque translucide (deux passes, face arrière puis face avant) autour de ses fibres. L'alpha monte aux silhouettes et au fond des sillons. */
function makeShell(THREE, env, hover, back, shared) {
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.5, metalness: 0.0, clearcoat: 0.55, clearcoatRoughness: 0.32, envMap: env, envMapIntensity: back ? 0.55 : 0.8,
    transparent: true, depthWrite: false, side: back ? THREE.BackSide : THREE.FrontSide,
  });
  mat.userData.u = shared;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, shared, hover);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAo; varying float vAo; varying vec3 vLoc; varying vec3 vWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAo = aAo; vLoc = position; vWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uDis; uniform float uTime; uniform float uCell; uniform vec3 uGlow; uniform vec3 uSrc[6]; uniform float uSrcOff[6];
varying float vAo; varying vec3 vLoc; varying vec3 vWorld;
${HOVER_GLSL}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
float hh = hash31(floor(vLoc / uCell)) * 0.93;
float dis = max(uDis, hoverDis(vWorld.xy));
if (dis > 0.001 && hh < dis) discard;
float rimGlow = dis > 0.001 ? (1.0 - smoothstep(dis, dis + 0.08, hh)) * 1.6 : 0.0;
// les impulsions : six fronts d'onde qui partent de foyers et balaient tout le cortex
float surf = 0.0;
for (int k = 0; k < 6; k++) {
  float dd = distance(vLoc, uSrc[k]);
  float ph = fract(uTime * 0.24 - dd * 0.45 - uSrcOff[k]);
  surf += smoothstep(0.0, 0.02, ph) * exp(-ph * 36.0);
}
surf = clamp(surf, 0.0, 1.0);`)
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb *= mix(0.62, 1.0, vAo);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += uGlow * (surf * 0.9 + rimGlow);`)
      .replace('#include <opaque_fragment>', `float ndv = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
float rim = pow(1.0 - ndv, 2.0);
outgoingLight = mix(outgoingLight, vec3(0.30, 0.52, 0.72), rim * ${back ? '0.18' : '0.30'});
float alpha = ${back ? '0.10 + 0.22 * rim' : '0.26 + 0.50 * rim'} + 0.30 * (1.0 - vAo) + 0.6 * surf + 0.4 * rimGlow;
gl_FragColor = vec4(outgoingLight, clamp(alpha, 0.0, 0.93));`);
  };
  mat.customProgramCacheKey = () => 'bp-brain-shell' + (back ? '-back' : '-front');
  return mat;
}

function makeFibers(THREE, data, hover, shared) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
  g.setAttribute('corner', new THREE.BufferAttribute(new Float32Array([0, -1, 1, -1, 1, 1, 0, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const ib = new THREE.InstancedInterleavedBuffer(data.seg, 8);
  g.setAttribute('iA', new THREE.InterleavedBufferAttribute(ib, 3, 0));
  g.setAttribute('iB', new THREE.InterleavedBufferAttribute(ib, 3, 3));
  g.setAttribute('iS', new THREE.InterleavedBufferAttribute(ib, 2, 6));
  g.setAttribute('iF', new THREE.InstancedBufferAttribute(data.fib, 3));
  g.instanceCount = data.count;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
  const uniforms = { uRes: { value: new THREE.Vector2(1, 1) }, uWidth: { value: 1.6 }, uBase: { value: new THREE.Color(0x2a5f86) }, uGlow2: { value: new THREE.Color(0xffb04d) }, uTime: shared.uTime, uDis: shared.uDis, ...hover };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: `attribute vec2 corner; attribute vec3 iA; attribute vec3 iB; attribute vec2 iS; attribute vec3 iF;
uniform vec2 uRes; uniform float uWidth;
varying float vU; varying vec3 vF; varying vec3 vWorld;
void main() {
  vec4 a = projectionMatrix * modelViewMatrix * vec4(iA, 1.0);
  vec4 b = projectionMatrix * modelViewMatrix * vec4(iB, 1.0);
  vec2 sa = a.xy / a.w * uRes * 0.5; vec2 sb = b.xy / b.w * uRes * 0.5;
  vec2 dir = sb - sa; float L = length(dir); dir = L > 1e-4 ? dir / L : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec4 pos = mix(a, b, corner.x);
  pos.xy += nrm * corner.y * uWidth / uRes * pos.w;
  gl_Position = pos;
  vU = mix(iS.x, iS.y, corner.x); vF = iF;
  vWorld = (modelMatrix * vec4(mix(iA, iB, corner.x), 1.0)).xyz;
}`,
    fragmentShader: `precision highp float;
varying float vU; varying vec3 vF; varying vec3 vWorld;
uniform float uTime; uniform float uDis; uniform vec3 uBase; uniform vec3 uGlow2;
${HOVER_GLSL}
void main() {
  float head = fract(uTime * vF.y + vF.x);
  float d = vU - head;
  float pulse = exp(-d * d / 0.003);
  float tail = d < 0.0 ? exp(d * 8.0) * 0.4 : 0.0;
  float p = clamp(pulse + tail, 0.0, 1.0);
  float dis = max(uDis, hoverDis(vWorld.xy));
  float a = (0.13 + 0.87 * p) * (1.0 - smoothstep(0.0, 0.5, dis));
  vec3 c = mix(uBase, uGlow2, clamp(p * 1.25, 0.0, 1.0));
  gl_FragColor = vec4(c, a);
}`,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  return mesh;
}

function geometryFrom(THREE, p) {
  const g = new THREE.BufferGeometry();
  const nv = p.pos.length / 3;
  const col = new Float32Array(nv * 3);
  for (let i = 0; i < col.length; i++) col[i] = srgbToLinear(p.col[i]);
  g.setAttribute('position', new THREE.BufferAttribute(p.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(p.nrm, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (p.ao) g.setAttribute('aAo', new THREE.BufferAttribute(p.ao, 1));
  else {
    g.setAttribute('aMat', new THREE.BufferAttribute(p.mat4, 4));
    g.setAttribute('aPart', new THREE.BufferAttribute(p.part, 1));
    g.setAttribute('aGlow', new THREE.BufferAttribute(p.glow, 1));
  }
  g.setIndex(new THREE.BufferAttribute(p.index, 1));
  g.computeBoundingSphere();
  return g;
}

/**
 * agent : celui de createAgent (scene, renderer, toWorld, pxw, uniforms). shapes : les formes (pour la taille des cubes, donc des cases du fractionnement).
 * Rend { group, place, set, ready, stats } ; les maillages arrivent plus tard, forme après forme (onReady(k)).
 */
export function createSmooth(THREE, agent, shapes, { palette, weak = false, onReady = () => {} }) {
  const group = new THREE.Group(); group.name = 'smooth';
  agent.scene.add(group);
  const env = studioEnv(THREE, agent.renderer);
  const hover = { uHit: agent.uniforms.uHit, uRad: agent.uniforms.uRad, uDisperse: agent.uniforms.uDisperse };       // les mêmes uniformes que les cubes
  const rgbSRGB = palette.map((h) => { const c = new THREE.Color().setStyle(h, THREE.SRGBColorSpace); const o = {}; c.getRGB(o, THREE.SRGBColorSpace); return [o.r, o.g, o.b]; });

  const slots = [0, 2].map((k) => ({ k, group: new THREE.Group(), shared: null, fibers: null, meshes: [], ready: false, cell: 0.04 }));
  const byK = {}; for (const s of slots) { s.group.visible = false; group.add(s.group); byK[s.k] = s; }
  const size = new THREE.Vector2();

  const stats = { ms: {}, where: 'worker' };
  const hFor = { brain: weak ? 0.02 : 0.0125, robot: weak ? 0.0135 : 0.0095 };
  const order = [[0, 'brain'], [2, 'robot']];
  const cubesOf = (k) => {
    const sh = shapes[k]; const m = sh.count === undefined ? sh.tag.length : sh.count;
    byK[k].cell = sh.cube * 1.6;
    return { pos: sh.pos.slice(0, m * 3), tag: sh.tag.slice(0, m), phase: sh.phase ? sh.phase.slice(0, m) : undefined, cube: sh.cube, frame: sh.frame };
  };
  const addParts = (k, kind, parts, ms) => {
    const slot = byK[k]; stats.ms[kind] = Math.round(ms);
    if (kind === 'brain') {
      const p = parts[0];
      const geo = geometryFrom(THREE, p);
      const shared = {
        uDis: { value: 0 }, uTime: { value: 0 }, uCell: { value: slot.cell }, uGlow: { value: new THREE.Color(0xffb04d).convertSRGBToLinear() },
        uSrc: { value: Array.from({ length: 6 }, (_, i) => new THREE.Vector3(p.src.pos[i * 3], p.src.pos[i * 3 + 1], p.src.pos[i * 3 + 2])) }, uSrcOff: { value: Array.from(p.src.off) },
      };
      slot.shared = shared;
      const back = new THREE.Mesh(geo, makeShell(THREE, env, hover, true, shared)); back.renderOrder = 0;
      const fibers = makeFibers(THREE, p.fibers, hover, shared); fibers.renderOrder = 1; slot.fibers = fibers;
      const front = new THREE.Mesh(geo, makeShell(THREE, env, hover, false, shared)); front.renderOrder = 2;
      for (const m of [back, fibers, front]) { m.frustumCulled = false; slot.group.add(m); slot.meshes.push(m); }
    } else {
      for (const p of parts) {
        const mesh = new THREE.Mesh(geometryFrom(THREE, p), makeRobotMaterial(THREE, env, hover, p.parts || [], p.rig));
        mesh.frustumCulled = false;
        mesh.material.userData.u.uCell.value = slot.cell;
        slot.group.add(mesh); slot.meshes.push(mesh);
      }
    }
    slot.ready = true; onReady(k);
  };
  let worker = null; let fell = false;
  const onMain = async () => {
    if (fell) return; fell = true; stats.where = 'main';
    const { buildSmooth } = await import('./smooth-build.js');
    for (const [k, kind] of order) {
      if (byK[k].ready) continue;
      await new Promise((r) => setTimeout(r, 300));
      const t0 = performance.now();
      try { addParts(k, kind, await buildSmooth(kind, cubesOf(k), rgbSRGB, hFor[kind]), performance.now() - t0); } catch (e) { console.warn('maillage', kind, e && e.message); }
    }
  };
  try { worker = new Worker(new URL('./mesh.worker.js', import.meta.url), { type: 'module' }); } catch (e) { console.warn('worker des maillages indisponible', e && e.message); worker = null; }
  if (worker) {
    const pending = new Map();
    worker.onmessage = (e) => {
      const { id, kind, parts, error, ms } = e.data;
      const k = pending.get(id); pending.delete(id);
      if (error) { console.warn('maillage', kind, error); onMain(); return; }
      addParts(k, kind, parts, ms);
    };
    worker.onerror = (e) => { console.warn('worker des maillages', e && e.message); worker && worker.terminate(); worker = null; onMain(); };
    let id = 0;
    for (const [k, kind] of order) { pending.set(++id, k); worker.postMessage({ id, kind, cubes: cubesOf(k), palette: rgbSRGB, h: hFor[kind] }); }
  } else onMain();

  const place = (k, a) => {
    const s = byK[k]; if (!s || !a) return;
    const [wx, wy] = agent.toWorld(a.x, a.y);
    s.group.position.set(wx, wy, a.z || 0); s.group.scale.setScalar(a.scale * agent.pxw); s.group.rotation.set(a.rx || 0, a.ry || 0, a.rz || 0, 'YXZ');
  };

  /** Règle un objet : visible (oui, non), dissolve (0 entier, 1 tout en cubes), temps pour les impulsions. */
  const set = (k, { visible, dissolve = 0, time = 0, look = null, wave = 0 }) => {
    const s = byK[k]; if (!s) return;
    const show = !!visible && s.ready && dissolve < 0.999;
    s.group.visible = show;
    if (!show) return;
    if (s.shared) { s.shared.uDis.value = dissolve; s.shared.uTime.value = time; }
    if (s.fibers) { agent.renderer.getDrawingBufferSize(size); s.fibers.material.uniforms.uRes.value.copy(size); s.fibers.material.uniforms.uWidth.value = 1.5 * (size.y / Math.max(1, agent.renderer.domElement.clientHeight)); }
    for (const m of s.meshes) { const u = m.material.userData && m.material.userData.u; if (u && u.uDis && m.material.userData.u !== s.shared) { u.uDis.value = dissolve; u.uTime.value = time; if (u.uLook) { u.uLook.value.set(look ? look.x : 0, look ? look.y : 0); u.uAnim.value = 1 - clamp(dissolve * 2.5); u.uWave.value = wave; } } }
  };

  return { group, place, set, ready: (k) => !!(byK[k] && byK[k].ready), stats, dispose() { worker && worker.terminate(); env.dispose && env.dispose(); } };
}
