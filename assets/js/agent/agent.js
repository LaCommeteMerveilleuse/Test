// BlackPhage - l'agent. Un seul nuage de cubes (jusqu'à 59 049, soit 243 x 243) qui change de forme.
// Chaque cube connaît sa place dans cinq formes (cerveau, trois amas, robot, ruban arrimé, flux de signal) et dans une grille
// analytique qui se subdivise (1 x 1, 3 x 3, 9 x 9 ... jusqu'à l'ensemble des cubes), puis se referme en sphère.
// Les formes n'utilisent que M cubes (de gros cubes métalliques) : les autres restent en réserve, invisibles, et ne naissent qu'en vol.
// Entre deux formes, les cubes partent un à un, filent le long d'une même route courbe (une traînée fine, un trait de cubes) et se posent.
// Tout se passe dans les shaders : le processeur ne touche qu'à des uniformes. Les cubes sont des boîtes dont le biseau, le léger bombé
// des faces et le reflet métallique (un petit studio de lumière) sont calculés dans le fragment shader.
import * as THREE from 'three';

// 0 gris clair, 1 gris moyen, 2 gris sombre, 3 Timber Glow (lumineux), 4 Deep Canyon Blue, 5 Shadow Pine, 6 blanc, 7 Cliff Mist, 8 à 17 les lobes, 18 or métallique
export const PALETTE = ['#cdd4d7', '#a0abb1', '#6a757c', '#e0a35c', '#2a5f86', '#27463d', '#f7f9f9', '#c8d1d3',
  // 8 à 17 : les lobes du cerveau, des gris teintés (frontal bleu, pariétal chaud, temporal vert, occipital turquoise, cervelet sable), clair puis foncé
  '#bccbd8', '#8499ad', '#ddcfb8', '#b39c7c', '#b9cbc0', '#87a195', '#c1d8d7', '#8cb1af', '#dccaa8', '#b99f74',
  // 18 : l'or de Timber Glow en métal (le ruban de cubes), qui ne brille pas : il reflète
  '#e4ac63',
  // 19 : le bleu clair des zones sûres d'une protéine (la couleur AlphaFold des confiances élevées)
  '#79aed0'];
export const GRID_HIGH = 243;      // 243 x 243 = 59 049 cubes
export const GRID_LOW = 81;        // 81 x 81 = 6 561 cubes
const FOV = 28;
const CAM_Z = 14;

const VERT = /* glsl */ `
attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec3 aP4;
attribute vec3 aTa; attribute vec2 aTb; attribute vec4 aR; attribute float aPh;
uniform float uA; uniform float uB; uniform float uMix; uniform float uDust; uniform float uTime; uniform float uFade;
uniform mat4 uMA; uniform mat4 uMB; uniform float uSA; uniform float uSB;
uniform float uCube[6];
uniform float uLevel; uniform float uBend; uniform float uG; uniform float uL;
uniform float uGlowAll; uniform float uPulseSpeed; uniform float uKeep;
uniform vec3 uPal[20]; uniform float uFlight; uniform float uBulge;
uniform float uIntro;                                                  // l'ouverture : 0 les cubes sont en poussière, 1 la forme est assemblée
uniform float uDisA; uniform float uDisB; uniform float uCellS[6];       // le fractionnement : 0 l'objet lisse est entier (pas de cubes), 1 il est tout en cubes
varying vec3 vCol; varying float vGlow; varying float vFog; varying float vMet; varying float vThick;
varying vec3 vLocal; varying vec3 vNloc; varying vec3 vM0; varying vec3 vM1; varying vec3 vM2; varying vec3 vWP;
const float PI = 3.14159265;
// la part de métal de chaque couleur : les gris et les bleus sont des métaux, le Timber Glow est surtout de la lumière
const float MET[20] = float[20](0.86, 0.86, 0.82, 0.18, 0.78, 0.6, 0.74, 0.86, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 0.55, 0.78);

mat3 rotAxis(vec3 a, float ang) {
  float c = cos(ang); float s = sin(ang); float t = 1.0 - c;
  return mat3(t * a.x * a.x + c, t * a.x * a.y + s * a.z, t * a.x * a.z - s * a.y,
              t * a.x * a.y - s * a.z, t * a.y * a.y + c, t * a.y * a.z + s * a.x,
              t * a.x * a.z + s * a.y, t * a.y * a.z - s * a.x, t * a.z * a.z + c);
}

struct Sh { vec3 p; float edge; mat3 b; float tag; float born; float thick; };

// le même hachage que le maillage lisse (smooth.js) : une case cubique est soit en cubes, soit en lisse, jamais les deux ni aucun
float hash31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }

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
    s.thick = mix(mix(0.05, 0.9, smoothstep(1.5, 4.5, uLevel)), 0.85, uBend);
    s.tag = 7.0;
  }
  if (s.tag > 99.5) { s.edge = 0.0; s.tag -= 100.0; }       // un cube en réserve : invisible dans cette forme, il naît en vol
  return s;
}

void main() {
  Sh A = shape(uA); Sh B = shape(uB);
  vec3 wA = (uMA * vec4(A.p, 1.0)).xyz; vec3 wB = (uMB * vec4(B.p, 1.0)).xyz;
  vec3 cA = uMA[3].xyz; vec3 cB = uMB[3].xyz;                       // les centres des deux formes
  vec3 dAB = cB - cA;
  float len = length(dAB.xy) + 1e-4;
  vec2 dir = dAB.xy / len; vec2 perp = vec2(-dir.y, dir.x);
  float sizeRef = 0.5 * (uSA + uSB);
  float far = smoothstep(0.6, 2.4, len / sizeRef);                  // 0 : les deux formes sont au même endroit, 1 : la route est longue
  // le départ : les cubes les plus proches de la destination partent les premiers, la forme s'effile vers l'arrivée
  float pA = dot((wA - cA).xy, dir) / max(uSA * 1.5, 1e-4);
  float ord = clamp(0.5 - 0.5 * pA, 0.0, 1.0);
  float w = mix(0.5, uFlight, far);
  float dly = mix(aR.x, ord, 0.78 * far) * (1.0 - w);
  float t = clamp((uMix - dly) / w, 0.0, 1.0);
  float te = t * t * (3.0 - 2.0 * t);
  // l'éclaircie : pendant une transition, seule la fraction uKeep des cubes existe. Les autres se fondent dès le départ et ne reparaissent qu'à l'arrivée,
  // si bien que la traînée et les deux formes ne sont plus qu'un nuage léger (au repos, uMix vaut 0 ou 1 : tous les cubes sont là)
  uint hx = uint(gl_InstanceID); hx ^= hx >> 16; hx *= 0x7feb352du; hx ^= hx >> 15; hx *= 0x846ca68bu; hx ^= hx >> 16;
  float thin = float(hx) * (1.0 / 4294967296.0) < uKeep ? 1.0 : clamp((1.0 - smoothstep(0.0, 0.12, uMix)) + smoothstep(0.88, 1.0, uMix), 0.0, 1.0);
  float mid = sin(PI * t);
  float c = smoothstep(0.0, 0.3, t) * (1.0 - smoothstep(0.7, 1.0, t)) * far;     // 1 : le cube est sur la route
  vec3 rnd = aR.yzw * 2.0 - 1.0;
  float sc = mix(uSA, uSB, t);
  // la route : une courbe douce d'une forme à l'autre. En vol, le cube quitte sa place et se range sur la route ; il la retrouve à l'arrivée.
  vec3 C = mix(cA, cB, te) + vec3(perp * (uBulge * len * sin(PI * te)), 0.0);
  vec3 off = mix(wA - cA, wB - cB, te) * (1.0 - c);
  float ceA = uA < 4.5 ? uCube[int(uA + 0.5)] * uSA : 0.0;
  float ceB = uB < 4.5 ? uCube[int(uB + 0.5)] * uSB : 0.0;
  float ce = (ceA > 0.0 && ceB > 0.0) ? 0.5 * (ceA + ceB) : max(ceA, ceB);          // l'arête d'un cube, en monde
  vec3 trail = rnd * ce * (0.3 + 0.5 * aR.w) * c * uDust;                            // la traînée ne fait que deux ou trois cubes de large
  trail.xy += perp * sin(uTime * 1.7 + te * 11.0 + aR.y * 6.28) * ce * 0.45 * c * uDust;
  vec3 drift = rnd + 0.55 * vec3(sin(uTime * 0.7 + aR.x * 20.0), cos(uTime * 0.6 + aR.y * 20.0), sin(uTime * 0.5 + aR.z * 20.0));
  vec3 pos = C + off + trail + drift * mid * uDust * sc * 0.2 * (1.0 - far);
  vec3 axis = normalize(rnd + vec3(0.001, 0.002, 0.003));
  mat3 rd = rotAxis(axis, mid * uDust * (aR.w * 5.0 + 1.0) * (0.35 + 0.65 * far));    // en vol, le cube tourne sur lui-même
  // le souffle : un léger mouvement de chaque cube, qui reste petit devant sa taille
  float eShape = mix(A.edge, B.edge, t);
  pos += vec3(sin(uTime * 0.9 + aR.x * 40.0), cos(uTime * 0.8 + aR.y * 40.0), sin(uTime * 0.7 + aR.z * 40.0)) * 0.06 * min(eShape, 0.06) * sc;
  // l'ouverture : les cubes arrivent en poussière, en tourbillon autour de l'axe vertical, puis s'assemblent
  float tin = smoothstep(aR.x * 0.5, aR.x * 0.5 + 0.5, uIntro);
  if (uIntro < 0.999) {
    float k = 1.0 - tin;
    vec3 relI = pos - cA;
    vec3 dirI = normalize(rnd + vec3(0.2, 0.1, 0.0));
    relI += dirI * (0.6 + 2.4 * aR.z) * uSA * k * k;
    float angI = k * (2.5 + 3.5 * aR.y);
    float cI = cos(angI); float sI = sin(angI);
    relI.xz = vec2(cI * relI.x - sI * relI.z, sI * relI.x + cI * relI.z);
    pos = cA + relI;
  }
  mat3 bA = mat3(uMA) / uSA * A.b; mat3 bB = mat3(uMB) / uSB * B.b;
  mat3 bas = mat3(mix(bA[0], bB[0], t), mix(bA[1], bB[1], t), mix(bA[2], bB[2], t));
  // les impulsions cérébrales : un front de lumière part d'une source (ou court le long d'un faisceau) puis s'éteint, et des neurones s'allument au hasard
  float wb = (uA < 0.5 ? 1.0 - t : 0.0) + (uB < 0.5 ? t : 0.0);
  float pulse = 0.0;
  if (aPh >= 0.0 && wb > 0.01) {
    float px = fract(uTime * uPulseSpeed - aPh);
    float ring = smoothstep(0.0, 0.025, px) * exp(-px * 24.0);
    pulse = max(ring, 0.22 * smoothstep(0.0, 0.03, px) * exp(-px * 4.0));
    float spark = pow(max(0.0, sin(uTime * 2.1 + aR.x * 91.0)), 70.0) * step(0.9, aR.y);
    pulse = max(pulse, spark) * wb;
  }
  // une grande case de la grille (le carré 1 x 1, les neuf cases du niveau 3 x 3) ne gonfle qu'à l'arrivée et rapetisse dès le départ
  float ke = t;
  if (B.edge > 0.1 && A.edge < 0.1) ke = pow(t, 6.0);
  else if (A.edge > 0.1 && B.edge < 0.1) ke = 1.0 - pow(1.0 - t, 6.0);
  // la visibilité : un cube n'existe que si la case de la forme qu'il quitte est brisée (ou s'il est en vol), et plus quand celle qu'il rejoint se reforme
  float hA = hash31(floor(A.p / uCellS[int(uA + 0.5)])) * 0.93;      // jamais au-dessus de 0,93 : à 1, tous les cubes sont là
  float hB = hash31(floor(B.p / uCellS[int(uB + 0.5)])) * 0.93;
  float visA = smoothstep(hA, hA + 0.07, uDisA);
  float visB = smoothstep(hB, hB + 0.07, uDisB);
  float vis = mix(visA, 1.0, smoothstep(0.0, 0.1, t));
  vis = mix(vis, visB, smoothstep(0.9, 1.0, t));
  float edge = mix(A.edge * uSA, B.edge * uSB, ke) * (0.96 + 0.08 * aR.w) * uFade * vis * thin * smoothstep(0.0, 0.22, tin) * (1.0 + 0.45 * pulse) * mix(1.0, 0.82, c);
  float thick = mix(A.thick, B.thick, t);
  vec3 local = position * vec3(edge, edge, edge * thick);
  mat3 Mx = rd * bas;
  vec3 wp = pos + Mx * local;
  // ce que le fragment shader doit savoir pour biseauter et refléter : la position dans le cube, sa normale, sa rotation
  vLocal = position; vNloc = normal; vThick = thick;
  vM0 = Mx[0]; vM1 = Mx[1]; vM2 = Mx[2];
  vWP = wp;
  float tagF = mix(A.tag, B.tag, step(0.5, t));
  int ti = int(clamp(tagF + 0.5, 0.0, 19.0));
  vCol = uPal[ti] * (0.95 + 0.1 * aR.w);
  vMet = MET[ti];
  float gl = (ti == 3 ? 1.0 : 0.0);
  vGlow = max(max(gl, mix(A.born, B.born, t)), pulse) + uGlowAll * (0.35 + 0.65 * aR.x);
  vFog = smoothstep(0.4, -2.2, wp.z) * 0.3;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const FRAG = /* glsl */ `
varying vec3 vCol; varying float vGlow; varying float vFog; varying float vMet; varying float vThick;
varying vec3 vLocal; varying vec3 vNloc; varying vec3 vM0; varying vec3 vM1; varying vec3 vM2; varying vec3 vWP;
const float BEV = 0.13;

// un petit studio de lumière : un plafond clair, un horizon bleuté, un sol sombre, une grande boîte à lumière en haut à gauche,
// une bande à droite et un appoint en bas. Les faces plates y voient des tons différents, les biseaux accrochent les boîtes.
vec3 studio(vec3 R) {
  float y = R.y;
  vec3 top = vec3(1.0); vec3 hor = vec3(0.66, 0.73, 0.82); vec3 low = vec3(0.17, 0.21, 0.27);
  vec3 c = y > 0.0 ? mix(hor, top, smoothstep(0.0, 0.7, y)) : mix(hor, low, smoothstep(0.0, -0.55, y));
  c += 0.55 * exp(-pow((y - 0.05) / 0.035, 2.0));                                                   // la ligne claire de l'horizon, comme sur du chrome
  c += 1.25 * smoothstep(0.82, 0.90, dot(R, normalize(vec3(-0.45, 0.75, 0.5))));
  c += 1.0 * smoothstep(0.90, 0.955, dot(R, normalize(vec3(0.85, 0.25, 0.45))));
  c += 0.4 * smoothstep(0.88, 0.95, dot(R, normalize(vec3(0.0, -0.6, 0.8))));
  return c;
}

void main() {
  vec3 Nl = normalize(vNloc);
  vec3 tl = vLocal - Nl * dot(vLocal, Nl);                              // l'écart au centre de la face
  vec3 bev = sign(tl) * smoothstep(0.5 - BEV, 0.5, abs(tl));            // 0 sur la face, 1 au bord : la pente du biseau
  vec3 Nb = normalize(Nl + 1.15 * bev + 0.85 * tl);                     // le biseau et un léger bombé de la face
  vec3 N = normalize(mat3(vM0, vM1, vM2) * (Nb * vec3(1.0, 1.0, 1.0 / max(vThick, 0.03))));
  vec3 V = normalize(cameraPosition - vWP);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  vec3 R = reflect(-V, N);
  vec3 env = studio(R);
  float F = pow(1.0 - ndv, 3.0);
  vec3 metal = vCol * env * 0.92 + env * F * 0.3;                      // un métal : le reflet prend la teinte du cube
  vec3 L = normalize(vec3(-0.5, 0.8, 0.7));
  float lam = max(dot(N, L), 0.0);
  vec3 dif = vCol * (0.36 + 0.5 * lam + 0.14 * (0.5 + 0.5 * N.y));
  vec3 c = mix(dif, metal, vMet);
  vec3 H = normalize(L + V);
  c += pow(max(dot(N, H), 0.0), 60.0) * 0.5 * mix(vec3(1.0), vCol, 0.3) * vMet;   // l'éclat de la clé
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
  const M = Math.min(n, Math.max(...shapes.map((sh) => (sh.count === undefined ? n : sh.count))));     // le plus grand nombre de cubes visibles d'une forme ; les autres sont en réserve
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
  geo.instanceCount = M;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  // toutes les formes sont classées de gauche à droite : un cube de la gauche d'une forme va vers la gauche de la suivante
  const attrs = [];
  const tagA = new Float32Array(n * 3); const tagB = new Float32Array(n * 2);
  const cubes = new Float32Array(6);
  const cellS = new Float32Array(6).fill(0.03);                  // la taille des cases du fractionnement, par forme (la grille : 0,03 sur la sphère unité)
  const phase = new Float32Array(n).fill(-1);
  shapes.forEach((sh, k) => {
    const m = sh.count === undefined ? n : sh.count;
    const order = new Uint32Array(n);
    for (let i = 0; i < n; i++) order[i] = i;
    const cmp = (a, b) => sh.pos[a * 3] - sh.pos[b * 3] || sh.pos[a * 3 + 1] - sh.pos[b * 3 + 1];
    order.subarray(0, m).sort(cmp); order.subarray(m).sort(cmp);          // les cubes visibles d'abord, la réserve ensuite
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const j = order[i];
      p[i * 3] = sh.pos[j * 3]; p[i * 3 + 1] = sh.pos[j * 3 + 1]; p[i * 3 + 2] = sh.pos[j * 3 + 2];
      const tg = sh.tag[j] + (j >= m ? 100 : 0);
      if (k < 3) tagA[i * 3 + k] = tg; else tagB[i * 2 + (k - 3)] = tg;
      if (k === 0 && sh.phase) phase[i] = sh.phase[j];
    }
    geo.setAttribute('aP' + k, new THREE.InstancedBufferAttribute(p, 3));
    cubes[k] = sh.cube; cellS[k] = sh.cube * 1.6;
    attrs.push(p);
  });
  geo.setAttribute('aPh', new THREE.InstancedBufferAttribute(phase, 1));
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
    uGlowAll: { value: 0 }, uPulseSpeed: { value: 0.24 }, uKeep: { value: 1 }, uFlight: { value: 0.16 }, uBulge: { value: 0.12 }, uDisA: { value: 1 }, uDisB: { value: 1 }, uIntro: { value: 1 }, uCellS: { value: cellS },
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

  /** Règle l'agent. p : { a, b, mix, dust, fade, time, anchorA, anchorB, level, bend, glow, intro, disA, disB, keep } */
  function set(p) {
    uniforms.uA.value = p.a; uniforms.uB.value = p.b; uniforms.uMix.value = p.mix;
    if (p.dust !== undefined) uniforms.uDust.value = p.dust;
    if (p.fade !== undefined) uniforms.uFade.value = p.fade;
    if (p.flight !== undefined) uniforms.uFlight.value = p.flight;
    if (p.bulge !== undefined) uniforms.uBulge.value = p.bulge;
    if (p.intro !== undefined) uniforms.uIntro.value = p.intro;
    if (p.keep !== undefined) uniforms.uKeep.value = p.keep;
    if (p.disA !== undefined) uniforms.uDisA.value = p.disA;
    if (p.disB !== undefined) uniforms.uDisB.value = p.disB;
    geo.instanceCount = (p.a === 5 || p.b === 5) ? n : M;               // la grille a besoin de tous les cubes, les formes seulement des visibles
    uniforms.uTime.value = p.time || 0;
    anchorMatrix(p.anchorA, uniforms.uMA.value); uniforms.uSA.value = p.anchorA.scale * pxw;
    anchorMatrix(p.anchorB || p.anchorA, uniforms.uMB.value); uniforms.uSB.value = (p.anchorB || p.anchorA).scale * pxw;
    if (p.level !== undefined) uniforms.uLevel.value = p.level;
    if (p.bend !== undefined) uniforms.uBend.value = p.bend;
    uniforms.uGlowAll.value = p.glow || 0;
  }

  const render = () => renderer.render(scene, camera);

  return { renderer, scene, camera, uniforms, mesh, resize, set, render, toWorld, anchorMatrix, get pxw() { return pxw; }, n, M, G, L,
    dispose() { geo.dispose(); material.dispose(); renderer.dispose(); } };
}
