// BlackPhage - la signalisation intracellulaire, en maillage, sous le récepteur : une protéine G hétérotrimérique (sous-unité alpha,
// hélice bêta, petit ruban gamma) qui attend à côté puis s'arrime sous le faisceau, la sous-unité alpha qui s'en détache et file vers
// le premier nœud, puis la cascade : quatre nœuds d'enzyme qui s'allument l'un après l'autre, reliés par des tubes fins à pointe de
// flèche où court une impulsion, et une onde qui s'étend sous le dernier nœud. Quelques molécules pâles flottent dans le cytoplasme.
//
//   const sc = createSignalScene(THREE, { quality: 1 });     // 1 = environ 60 000 triangles, 0.5 = 25 000 (appareils faibles)
//   frame.add(sc.group);                                      // même repère et mêmes unités que le récepteur (FRAME)
//   sc.setPose({ show, active, cascade, time });              // trois nombres de 0 à 1, et le temps en secondes
//     show     fondu de l'ensemble (les matériaux deviennent transparents seulement pendant le fondu)
//     active   0 : la protéine G flotte à gauche du faisceau ; 0.5 : arrimée sous le récepteur (FRAME.gprotein) ;
//              de 0.5 à 1 : l'alpha se détache, file en arc et s'enfonce dans la prise du premier nœud
//     cascade  les nœuds s'allument de 0 à 1, l'impulsion descend chaque lien, l'onde finale commence vers 0.94
//   sc.dispose();  sc.precompile(renderer, camera);  sc.bounds, sc.ripple, sc.parked, sc.waiting : repères en unités FRAME
//
// Aucune texture, aucune lumière de la scène : les matériaux sont des shaders qui s'éclairent eux-mêmes (clé en haut à gauche, comme
// les cubes de l'agent) et écrivent des couleurs sRGB telles quelles (ni mappage de tons ni conversion : pas de passe de sortie sRGB
// par-dessus). Les halos et les impulsions sont des carrés tournés vers la caméra, à fondu normal (pas additif : le fond est blanc).
// Les nœuds, la ligne centrale et les liens viennent de shape-stream.js : le flux de cubes et ce maillage coïncident.
import { FRAME } from './frame.js';
import { NODE_FORMS, getSpine, getLinks, sdSphere, sdEllipsoid, sdRoundBox, sdCapsule, smin, smax } from './shape-stream.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (x) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };
const lerp = (a, b, t) => a + (b - a) * t;
const rgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// la palette de la marque
const HAZE = rgb(0xe7eef0); const MIST = rgb(0xc8d1d3); const GLOW = rgb(0xe0a35c); const BLUE = rgb(0x2a5f86); const PINE = rgb(0x27463d);

/* ================================================================== maillage d'un champ de distance (Surface Nets) */
/**
 * Maille la surface f = 0 (f < 0 dedans) dans la boîte b = [x0, y0, z0, x1, y1, z1], pas h.
 * color(x, y, z) -> [r, g, b] ; site(x, y, z) -> 0..1 (zone qui brille). Retourne des tableaux prêts pour une BufferGeometry.
 */
let SCR_F = new Float32Array(1 << 18); let SCR_C = new Int32Array(1 << 18); let SCR_V = new Float32Array(3 << 14); let SCR_I = new Uint32Array(6 << 14);   // tampons réutilisés d'un appel à l'autre
export function meshSDF(f, b, h, { color = () => [1, 1, 1], site = () => 0, reach = () => 0 } = {}) {
  const ox = b[0] - h; const oy = b[1] - h; const oz = b[2] - h;
  const nx = Math.ceil((b[3] - b[0]) / h) + 3; const ny = Math.ceil((b[4] - b[1]) / h) + 3; const nz = Math.ceil((b[5] - b[2]) / h) + 3;
  if (SCR_F.length < nx * ny * nz) SCR_F = new Float32Array(Math.ceil(nx * ny * nz * 1.25));
  const F = SCR_F;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[i + nx * (j + ny * k)] = f(ox + i * h, oy + j * h, oz + k * h);
  const cx = nx - 1; const cy = ny - 1; const cz = nz - 1;
  if (SCR_C.length < cx * cy * cz) SCR_C = new Int32Array(Math.ceil(cx * cy * cz * 1.25));
  const vid = SCR_C; vid.fill(-1, 0, cx * cy * cz);
  let nvert = 0;
  const sy = nx; const sz = nx * ny;
  const EDGE = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const val = new Float32Array(8);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    const p = i + nx * (j + ny * k);
    val[0] = F[p]; val[1] = F[p + 1]; val[2] = F[p + sy]; val[3] = F[p + sy + 1]; val[4] = F[p + sz]; val[5] = F[p + sz + 1]; val[6] = F[p + sz + sy]; val[7] = F[p + sz + sy + 1];
    let neg = 0; for (let c = 0; c < 8; c++) if (val[c] < 0) neg++;
    if (neg === 0 || neg === 8) continue;
    let sx = 0; let syy = 0; let szz = 0; let cnt = 0;
    for (let e = 0; e < 12; e++) {
      const c0 = EDGE[e][0]; const c1 = EDGE[e][1]; const a0 = val[c0]; const a1 = val[c1];
      if ((a0 < 0) !== (a1 < 0)) {
        const t = a0 / (a0 - a1);
        sx += (c0 & 1) + ((c1 & 1) - (c0 & 1)) * t; syy += ((c0 >> 1) & 1) + (((c1 >> 1) & 1) - ((c0 >> 1) & 1)) * t; szz += ((c0 >> 2) & 1) + (((c1 >> 2) & 1) - ((c0 >> 2) & 1)) * t; cnt++;
      }
    }
    vid[i + cx * (j + cy * k)] = nvert;
    if (3 * nvert + 3 > SCR_V.length) { const nv2 = new Float32Array(SCR_V.length * 2); nv2.set(SCR_V); SCR_V = nv2; }
    SCR_V[3 * nvert] = ox + (i + sx / cnt) * h; SCR_V[3 * nvert + 1] = oy + (j + syy / cnt) * h; SCR_V[3 * nvert + 2] = oz + (k + szz / cnt) * h; nvert++;
  }
  let nidx = 0;
  const quad = (a, b2, c, d, flip) => {
    if (a < 0 || b2 < 0 || c < 0 || d < 0) return;
    if (nidx + 6 > SCR_I.length) { const ni2 = new Uint32Array(SCR_I.length * 2); ni2.set(SCR_I); SCR_I = ni2; }
    const I = SCR_I;
    if (flip) { I[nidx] = a; I[nidx + 1] = d; I[nidx + 2] = c; I[nidx + 3] = a; I[nidx + 4] = c; I[nidx + 5] = b2; } else { I[nidx] = a; I[nidx + 1] = b2; I[nidx + 2] = c; I[nidx + 3] = a; I[nidx + 4] = c; I[nidx + 5] = d; }
    nidx += 6;
  };
  const cell = (i, j, k) => vid[i + cx * (j + cy * k)];
  for (let k = 1; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 1; i < cx; i++) {
    const p = i + nx * (j + ny * k); const inside = F[p] < 0;
    if (inside !== (F[p + 1] < 0)) quad(cell(i, j - 1, k - 1), cell(i, j, k - 1), cell(i, j, k), cell(i, j - 1, k), !inside);
    if (inside !== (F[p + sy] < 0)) quad(cell(i - 1, j, k - 1), cell(i - 1, j, k), cell(i, j, k), cell(i, j, k - 1), !inside);
    if (inside !== (F[p + sz] < 0)) quad(cell(i - 1, j - 1, k), cell(i, j - 1, k), cell(i, j, k), cell(i - 1, j, k), !inside);
  }
  // raffinement : chaque sommet est ramené sur la surface (Newton), la normale vient du gradient
  const nv = nvert; const V = SCR_V; const pos = new Float32Array(nv * 3); const nrm = new Float32Array(nv * 3); const col = new Float32Array(nv * 3);
  const site1 = new Float32Array(nv); const ao = new Float32Array(nv); const reach1 = new Float32Array(nv);
  const e = h * 0.35;
  const grad = (x, y, z, out) => {
    out[0] = f(x + e, y, z) - f(x - e, y, z); out[1] = f(x, y + e, z) - f(x, y - e, z); out[2] = f(x, y, z + e) - f(x, y, z - e);
  };
  const g = [0, 0, 0];
  for (let v = 0; v < nv; v++) {
    let x = V[v * 3]; let y = V[v * 3 + 1]; let z = V[v * 3 + 2];
    for (let it = 0; it < 2; it++) {
      grad(x, y, z, g); const gl = (g[0] * g[0] + g[1] * g[1] + g[2] * g[2]) / (4 * e * e);
      if (gl < 1e-9) break;
      let s = f(x, y, z) / gl / (2 * e); const step = Math.abs(s) * Math.sqrt(gl) * 2 * e;
      const lim = 0.7 * h; if (step > lim) s *= lim / step;
      x -= g[0] * s; y -= g[1] * s; z -= g[2] * s;
    }
    grad(x, y, z, g); const gl = Math.hypot(g[0], g[1], g[2]) || 1;
    const nxv = g[0] / gl; const nyv = g[1] / gl; const nzv = g[2] / gl;
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z; nrm[v * 3] = nxv; nrm[v * 3 + 1] = nyv; nrm[v * 3 + 2] = nzv;
    const c = color(x, y, z); col[v * 3] = c[0]; col[v * 3 + 1] = c[1]; col[v * 3 + 2] = c[2];
    site1[v] = site(x, y, z); reach1[v] = reach(x, y, z);
    // l'occlusion : le champ à quelques distances le long de la normale
    let occ = 0; const ds = [0.03, 0.07, 0.13]; const ws = [0.5, 0.32, 0.18];
    for (let q = 0; q < 3; q++) occ += ws[q] * clamp01((ds[q] - f(x + nxv * ds[q], y + nyv * ds[q], z + nzv * ds[q])) / ds[q]);
    ao[v] = 1 - clamp01(occ * 1.1);
  }
  return { pos, nrm, col, site: site1, ao, reach: reach1, index: SCR_I.slice(0, nidx) };
}

function sphereData(r, cx, cy, cz, color, siteV, seg = 22) {
  const rows = seg; const cols = seg * 2; const pos = []; const nrm = []; const idx = [];
  for (let i = 0; i <= rows; i++) {
    const th = (i / rows) * Math.PI;
    for (let j = 0; j <= cols; j++) {
      const ph = (j / cols) * Math.PI * 2; const nx = Math.sin(th) * Math.cos(ph); const ny = Math.cos(th); const nz = Math.sin(th) * Math.sin(ph);
      pos.push(cx + r * nx, cy + r * ny, cz + r * nz); nrm.push(nx, ny, nz);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = i * (cols + 1) + j; const b = a + cols + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const n = pos.length / 3; const col = new Float32Array(n * 3); const site = new Float32Array(n).fill(siteV); const ao = new Float32Array(n).fill(1); const reach = new Float32Array(n);
  for (let v = 0; v < n; v++) { col[v * 3] = color[0]; col[v * 3 + 1] = color[1]; col[v * 3 + 2] = color[2]; }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), col, site, ao, reach, index: new Uint32Array(idx) };
}

function mergeData(list) {
  let nv = 0; let ni = 0; for (const d of list) { nv += d.pos.length / 3; ni += d.index.length; }
  const out = { pos: new Float32Array(nv * 3), nrm: new Float32Array(nv * 3), col: new Float32Array(nv * 3), site: new Float32Array(nv), ao: new Float32Array(nv), reach: new Float32Array(nv), index: new Uint32Array(ni) };
  let ov = 0; let oi = 0;
  for (const d of list) {
    const n = d.pos.length / 3;
    out.pos.set(d.pos, ov * 3); out.nrm.set(d.nrm, ov * 3); out.col.set(d.col, ov * 3); out.site.set(d.site, ov); out.ao.set(d.ao, ov); out.reach.set(d.reach, ov);
    for (let i = 0; i < d.index.length; i++) out.index[oi + i] = d.index[i] + ov;
    ov += n; oi += d.index.length;
  }
  return out;
}

/* ================================================================== les shaders */
const LIGHTING = /* glsl */ `
vec3 shadeBody(vec3 base, vec3 N, vec3 V, float ao, float spec) {
  vec3 L = normalize(vec3(-0.5, 0.8, 0.7));
  float ndl = dot(N, L);
  float lam = max(ndl, 0.0);
  float hemi = 0.5 + 0.5 * N.y;
  float shade = (0.55 + 0.4 * lam + 0.15 * hemi) * mix(0.62, 1.0, ao);
  vec3 col = base * shade;
  col += vec3(0.03, 0.05, 0.07) * (1.0 - lam) * ao;
  vec3 H = normalize(L + V);
  float nh = max(dot(N, H), 0.0);
  col += vec3(1.0, 0.97, 0.92) * (pow(nh, 90.0) * 0.6 + pow(nh, 16.0) * 0.07) * spec;
  float ndv = max(dot(N, V), 0.0);
  float fr = pow(1.0 - ndv, 2.4);
  col = mix(col, base * 0.36, fr * 0.4);
  col += vec3(0.9, 0.95, 1.0) * pow(1.0 - ndv, 3.5) * 0.10 * hemi;
  return col;
}
vec3 lampLook(vec3 N, vec3 V) {
  float ndv = max(dot(N, V), 0.0);
  vec3 deep = vec3(0.89, 0.60, 0.28); vec3 mid = vec3(0.94, 0.70, 0.42); vec3 hot = vec3(1.0, 0.94, 0.78);
  return mix(deep, mix(mid, hot, smoothstep(0.3, 1.0, ndv)), smoothstep(0.0, 0.65, ndv));
}`;

const BODY_VERT = /* glsl */ `
attribute vec3 aCol; attribute float aSite; attribute float aAO; attribute float aReach;
varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying float vSite; varying float vAO; varying float vReach;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = mv.xyz; vN = normalize(normalMatrix * normal); vCol = aCol; vSite = aSite; vAO = aAO; vReach = aReach;
  gl_Position = projectionMatrix * mv;
}`;
const BODY_FRAG = /* glsl */ `
uniform float uShow; uniform float uLit; uniform float uFlash; uniform float uBody; uniform float uSpec;
varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying float vSite; varying float vAO; varying float vReach;
${LIGHTING}
void main() {
  vec3 N = normalize(vN); vec3 V = normalize(-vV);
  vec3 col = shadeBody(vCol, N, V, vAO, uSpec);
  vec3 lamp = lampLook(N, V);
  vec3 Lk = normalize(vec3(-0.5, 0.8, 0.7));
  vec3 lampBody = lamp * (0.84 + 0.16 * max(dot(N, Lk), 0.0)) * mix(0.82, 1.0, vAO);
  lampBody += vec3(1.0, 0.97, 0.9) * pow(max(dot(N, normalize(Lk + V)), 0.0), 60.0) * 0.5;
  // l'allumage part du cœur et gagne la surface : un front qui avance, pas un mélange terne
  float loc = clamp((uLit * 1.3 - vReach * 0.95 + 0.04) / 0.32, 0.0, 1.0);
  float front = loc * (1.0 - loc) * 4.0;
  col = mix(col, lampBody, uBody * loc);
  col += vec3(0.85, 0.55, 0.2) * front * 0.3 * uBody;
  vec3 siteDim = vec3(0.80, 0.85, 0.86) * (0.7 + 0.3 * max(dot(N, V), 0.0));
  vec3 siteOn = mix(lamp, vec3(1.0, 0.95, 0.80), 0.35 + 0.5 * uFlash);
  col = mix(col, mix(siteDim, siteOn, loc), vSite * mix(0.55, 1.0, loc));
  col += vec3(0.5, 0.36, 0.14) * uFlash * 0.5 * (0.25 + 0.75 * vSite);
  gl_FragColor = vec4(col, uShow);
}`;

const LINK_VERT = /* glsl */ `
attribute float aT; attribute float aKind;
uniform float uHead; uniform float uPW; uniform float uRad; uniform float uHead2; uniform float uAmp2;
varying vec3 vN; varying vec3 vV; varying float vT; varying float vKind; varying float vGlow; varying float vGlow2;
void main() {
  float d = aT - uHead; float d2 = aT - uHead2;
  float g = exp(-d * d / (uPW * uPW)) * step(0.0, uHead) * (1.0 - smoothstep(1.0, 1.1, uHead));
  float g2 = exp(-d2 * d2 / (uPW * uPW * 1.6)) * step(0.0, uHead2) * uAmp2;
  vec3 p = position + normal * uRad * (0.8 * g + 0.5 * g2) * (1.0 - aKind);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vV = mv.xyz; vN = normalize(normalMatrix * normal); vT = aT; vKind = aKind; vGlow = g; vGlow2 = g2;
  gl_Position = projectionMatrix * mv;
}`;
const LINK_FRAG = /* glsl */ `
uniform float uShow; uniform float uHead; uniform vec3 uTube; uniform vec3 uArrow;
varying vec3 vN; varying vec3 vV; varying float vT; varying float vKind; varying float vGlow; varying float vGlow2;
${LIGHTING}
void main() {
  vec3 N = normalize(vN); vec3 V = normalize(-vV);
  vec3 base = mix(uTube, uArrow, vKind);
  float trail = smoothstep(uHead, uHead - 0.02, vT) * step(0.0, uHead);
  vec3 col = shadeBody(base, N, V, 1.0, 0.9);
  vec3 lamp = lampLook(N, V);
  col = mix(col, lamp, trail * (0.5 + 0.42 * vKind));
  col = mix(col, vec3(0.93, 0.58, 0.18), clamp(vGlow2 * 0.9, 0.0, 1.0));
  col = mix(col, vec3(1.0, 0.93, 0.76), clamp(vGlow * 0.9, 0.0, 1.0));
  gl_FragColor = vec4(col, uShow);
}`;

const BILL_VERT = /* glsl */ `
uniform float uSize; varying vec2 vUv;
void main() {
  vUv = uv;
  float sc = length(vec3(modelMatrix[0].x, modelMatrix[0].y, modelMatrix[0].z));
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uSize * sc;
  gl_Position = projectionMatrix * mv;
}`;
const HALO_FRAG = /* glsl */ `
uniform float uShow; uniform float uAlpha; uniform float uTime; uniform float uWarm;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = exp(-r * r * 5.0) * 0.5 + exp(-r * r * 22.0) * 0.5;
  a *= smoothstep(1.0, 0.7, r);
  vec3 col = mix(vec3(0.90, 0.62, 0.28), vec3(1.0, 0.86, 0.58), exp(-r * r * 10.0) * uWarm);
  gl_FragColor = vec4(col, a * uAlpha * uShow);
}`;
const PHOTON_FRAG = /* glsl */ `
uniform float uShow; uniform float uAlpha;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float core = exp(-r * r * 30.0);
  float halo = exp(-r * r * 6.0) * 0.62;
  vec3 col = mix(vec3(0.92, 0.62, 0.26), vec3(1.0, 0.97, 0.88), core);
  gl_FragColor = vec4(col, clamp(core + halo, 0.0, 1.0) * smoothstep(1.0, 0.8, r) * uAlpha * uShow);
}`;

const RIPPLE_VERT = /* glsl */ `
uniform float uR; varying vec3 vN; varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position * vec3(uR, uR * 0.62, uR), 1.0);
  vV = mv.xyz; vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;
const RIPPLE_FRAG = /* glsl */ `
uniform float uShow; uniform float uAlpha; uniform float uPhase;
varying vec3 vN; varying vec3 vV;
void main() {
  float ndv = max(dot(normalize(vN), normalize(-vV)), 0.0);
  float rim = pow(1.0 - ndv, 2.8);
  float a = rim * uAlpha * pow(1.0 - uPhase, 1.6) * smoothstep(0.0, 0.1, uPhase) * 1.0;
  vec3 col = mix(vec3(0.88, 0.60, 0.26), vec3(0.96, 0.78, 0.50), uPhase);
  gl_FragColor = vec4(col, a * uShow);
}`;

const MOL_VERT = /* glsl */ `
attribute vec4 aI0; attribute vec4 aI1; attribute vec4 aI2; attribute float aTone;
uniform float uTime; uniform vec3 uCenter;
varying vec3 vN; varying vec3 vV; varying float vTone; varying float vFog;
mat3 rotAxis(vec3 a, float ang) {
  float c = cos(ang); float s = sin(ang); float t = 1.0 - c;
  return mat3(t * a.x * a.x + c, t * a.x * a.y + s * a.z, t * a.x * a.z - s * a.y,
              t * a.x * a.y - s * a.z, t * a.y * a.y + c, t * a.y * a.z + s * a.x,
              t * a.x * a.z + s * a.y, t * a.y * a.z - s * a.x, t * a.z * a.z + c);
}
void main() {
  float w = aI1.w;
  vec3 drift = vec3(sin(uTime * 0.23 * w + aI1.x), cos(uTime * 0.19 * w + aI1.y), sin(uTime * 0.17 * w + aI1.z)) * vec3(0.17, 0.22, 0.13);
  mat3 R = rotAxis(normalize(aI2.xyz), uTime * aI2.w + aI1.x * 3.0);
  vec3 wp = aI0.xyz + drift + R * (position * aI0.w);
  vec4 mv = modelViewMatrix * vec4(wp, 1.0);
  vec4 mc = modelViewMatrix * vec4(uCenter, 1.0);
  float sc = length(vec3(modelMatrix[0].x, modelMatrix[0].y, modelMatrix[0].z));
  vFog = smoothstep(-0.3, 1.6, (mc.z - mv.z) / sc);
  vV = mv.xyz; vN = normalize(normalMatrix * (R * normal)); vTone = aTone;
  gl_Position = projectionMatrix * mv;
}`;
const MOL_FRAG = /* glsl */ `
uniform float uShow;
varying vec3 vN; varying vec3 vV; varying float vTone; varying float vFog;
${LIGHTING}
void main() {
  vec3 N = normalize(vN); vec3 V = normalize(-vV);
  vec3 base = mix(vec3(0.84, 0.88, 0.89), vec3(0.70, 0.78, 0.83), vTone);
  vec3 col = shadeBody(base, N, V, 1.0, 0.5);
  col = mix(col, vec3(1.0), vFog * 0.55);
  gl_FragColor = vec4(col, uShow * (0.5 - 0.22 * vFog));
}`;

/* ================================================================== la scène */
export function createSignalScene(THREE, { quality = 1 } = {}) {
  const q = Math.max(0.4, Math.min(1.1, quality));   // 1 = environ 62 000 triangles, 0.6 = 26 000
  const group = new THREE.Group(); group.name = 'signal';
  const disposables = [];
  const U = { show: { value: 0 }, time: { value: 0 } };   // uniformes partagés
  const solids = [];   // matériaux opaques (passent en transparent seulement pendant le fondu)
  const sp = getSpine(); const links = getLinks(); const C = FRAME.cascade; const G0 = FRAME.gprotein;

  const toGeo = (d) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(d.pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(d.nrm, 3));
    geo.setAttribute('aCol', new THREE.BufferAttribute(d.col, 3)); geo.setAttribute('aSite', new THREE.BufferAttribute(d.site, 1)); geo.setAttribute('aAO', new THREE.BufferAttribute(d.ao, 1)); geo.setAttribute('aReach', new THREE.BufferAttribute(d.reach, 1));
    geo.setIndex(new THREE.BufferAttribute(d.index, 1)); geo.computeBoundingSphere(); disposables.push(geo);
    return geo;
  };
  const bodyMat = ({ body = 0, spec = 1 } = {}) => {
    const m = new THREE.ShaderMaterial({
      uniforms: { uShow: U.show, uLit: { value: 0 }, uFlash: { value: 0 }, uBody: { value: body }, uSpec: { value: spec } },
      vertexShader: BODY_VERT, fragmentShader: BODY_FRAG, transparent: true, depthWrite: true,
    });
    disposables.push(m); solids.push(m); return m;
  };
  const billMat = (frag, uniforms) => {
    const m = new THREE.ShaderMaterial({
      uniforms: { uShow: U.show, uSize: { value: 1 }, uAlpha: { value: 0 }, uTime: U.time, uWarm: { value: 1 }, ...uniforms },
      vertexShader: BILL_VERT, fragmentShader: frag, transparent: true, depthWrite: false, depthTest: true,
    });
    disposables.push(m); return m;
  };
  const planeGeo = new THREE.PlaneGeometry(1, 1); disposables.push(planeGeo);
  const bill = (frag, size, order, uniforms) => {
    const mat = billMat(frag, uniforms); mat.uniforms.uSize.value = size;
    const m = new THREE.Mesh(planeGeo, mat); m.renderOrder = order; m.frustumCulled = false; group.add(m); return m;
  };
  const addMesh = (data, mat, order = 0) => { const m = new THREE.Mesh(toGeo(data), mat); m.renderOrder = order; group.add(m); return m; };
  const res = (h) => h / Math.pow(q, 0.6);

  /* ---------------------------------------------------------------- la protéine G, dans son repère d'arrimage (origine = FRAME.gprotein) */
  // sous-unité alpha : un domaine Ras arrondi, un domaine hélicoïdal, la fente du nucléotide et l'hélice qui s'enfonce dans le récepteur
  const CS = Math.cos(0.6); const SN = Math.sin(0.6);
  const alphaF = (x, y, z) => {
    let d = smin(sdEllipsoid(x, y + 0.02, z, 0.25, 0.22, 0.22), sdEllipsoid(x + 0.17, y - 0.1, z + 0.05, 0.14, 0.12, 0.12), 0.06);
    d = smax(d, -sdEllipsoid(CS * (x + 0.11) + SN * (y - 0.03), -SN * (x + 0.11) + CS * (y - 0.03), z - 0.14, 0.1, 0.024, 0.1), 0.025);
    d = smin(d, sdCapsule(x, y, z, 0.02, 0.1, 0, 0.07, 0.44, 0, 0.05), 0.09);
    return d + 0.005 * Math.sin(x * 37) * Math.sin(y * 33 + 1.3) * Math.sin(z * 35);
  };
  const BLUE_S = mixc(BLUE, MIST, 0.12);
  const alphaCol = (x, y, z) => mixc(BLUE_S, mixc(BLUE_S, HAZE, 0.5), sstep(0.04, -0.12, x + 0.04 * y) * 0.7 * sstep(-0.05, 0.05, y + 0.1));
  const alphaData = mergeData([
    meshSDF(alphaF, [-0.34, -0.26, -0.28, 0.28, 0.5, 0.28], res(0.019), { color: alphaCol }),
    sphereData(0.036, -0.11, 0.03, 0.115, GLOW, 1, 9),
  ]);
  const alphaMat = bodyMat({ body: 0.1, spec: 1 });
  const alpha = addMesh(alphaData, alphaMat, 0);

  // sous-unité bêta : une hélice à sept pales, un pinceau d'hélice, trouée au centre
  const betaF = (x, y, z) => {
    const r = Math.hypot(x, y); const th = Math.atan2(y, x);
    const R = 0.2 + 0.042 * Math.cos(7 * th - 7.5 * r);
    const dO = r - R; const dZ = Math.abs(z) - (0.062 + 0.014 * Math.cos(7 * th - 7.5 * r));
    const rr = 0.032; const qx = dO + rr; const qy = dZ + rr;
    let d = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - rr;
    d = smax(d, 0.036 - r, 0.02);
    d += 0.004 * Math.cos(26 * r + 3 * th) * Math.sin(z * 30);
    return d;
  };
  const betaCol = (x, y) => { const r = Math.hypot(x, y); const th = Math.atan2(y, x); return mixc(PINE, MIST, 0.18 + 0.4 * sstep(0.5, 1, Math.cos(7 * th - 7.5 * r)) * sstep(0.05, 0.19, r)); };
  const beta = addMesh(meshSDF(betaF, [-0.27, -0.27, -0.11, 0.27, 0.27, 0.11], res(0.0155), { color: betaCol }), bodyMat({ spec: 1 }), 0);
  const BETA_AXIS = new THREE.Vector3(0.36, 0.3, 0.88).normalize();

  // sous-unité gamma : un petit ruban torsadé qui monte vers la membrane, avec une bille au bout
  const GN = 20; const gPts = []; for (let i = 0; i <= GN; i++) { const t = i / GN; gPts.push([0.43 + 0.1 * Math.sin(t * 3.2) - 0.06 * t, -0.04 + 0.66 * t, -0.04 + 0.05 * Math.sin(t * 9) + 0.07 * t]); }
  const gSeg = [];
  for (let i = 0; i < GN; i++) {
    const a = gPts[i]; const b = gPts[i + 1]; let tx = b[0] - a[0]; let ty = b[1] - a[1]; let tz = b[2] - a[2]; const L = Math.hypot(tx, ty, tz); tx /= L; ty /= L; tz /= L;
    let n0x = ty; let n0y = -tx; const nl = Math.hypot(n0x, n0y) || 1; n0x /= nl; n0y /= nl;   // une perpendiculaire à la tangente
    const b0x = ty * 0 - tz * n0y; const b0y = tz * n0x - tx * 0; const b0z = tx * n0y - ty * n0x;
    const phi = 3.3 * (i / (GN - 1)) + 0.5; const cp = Math.cos(phi); const sp2 = Math.sin(phi);
    gSeg.push({ a, t: [tx, ty, tz], w: [cp * n0x + sp2 * b0x, cp * n0y + sp2 * b0y, sp2 * b0z], n: [-sp2 * n0x + cp * b0x, -sp2 * n0y + cp * b0y, cp * b0z], L });
  }
  const gammaF = (x, y, z) => {
    let d = 1e9;
    const ic = Math.floor(((y + 0.04) / 0.66) * GN);   // le chemin monte régulièrement : seuls les segments voisins comptent
    for (let i = Math.max(0, ic - 2); i <= Math.min(GN - 1, ic + 2); i++) {
      const g = gSeg[i]; const px = x - g.a[0]; const py = y - g.a[1]; const pz = z - g.a[2];
      const u = px * g.t[0] + py * g.t[1] + pz * g.t[2] - g.L / 2; const w = px * g.w[0] + py * g.w[1] + pz * g.w[2]; const nn = px * g.n[0] + py * g.n[1] + pz * g.n[2];
      d = smin(d, sdRoundBox(u, w, nn, g.L / 2 + 0.022, 0.038, 0.011, 0.01), 0.03);
    }
    return smin(d, sdSphere(x - gPts[GN][0], y - gPts[GN][1], z - gPts[GN][2], 0.04), 0.03);
  };
  const gammaCol = (x, y) => mixc(mixc(MIST, BLUE, 0.16), BLUE, sstep(0.5, 0.64, y));
  const gamma = addMesh(meshSDF(gammaF, [0.28, -0.12, -0.2, 0.7, 0.72, 0.2], res(0.0105), { color: gammaCol }), bodyMat({ spec: 1 }), 0);

  // le trimère = bêta et gamma ; l'alpha se déplace seul
  const trimer = new THREE.Group(); group.remove(beta); group.remove(gamma); trimer.add(beta); trimer.add(gamma); group.add(trimer);
  const BETA_C = [0.3, -0.06, 0.02]; beta.position.set(BETA_C[0], BETA_C[1], BETA_C[2]); beta.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), BETA_AXIS);
  const betaQ0 = beta.quaternion.clone(); const zAxis = new THREE.Vector3(0, 0, 1); const qSpin = new THREE.Quaternion();
  const ALPHA_C = [-0.09, 0.04, 0];

  /* ---------------------------------------------------------------- les quatre nœuds */
  const nodeCol = [BLUE_S, mixc(PINE, BLUE, 0.35), mixc(BLUE, MIST, 0.2), mixc(PINE, MIST, 0.08)];
  const nodes = []; const nodeHalos = [];
  for (let i = 0; i < 4; i++) {
    const F = NODE_FORMS[i]; const base = nodeCol[i]; const lite = mixc(base, HAZE, 0.42);
    const body = meshSDF(F.shell, [-0.34, -0.34, -0.34, 0.34, 0.34, 0.34], res(0.0185), {
      color: (x, y, z) => mixc(base, lite, 0.5 * sstep(-0.05, 0.22, y) + 0.2 * sstep(0.1, 0.3, Math.hypot(x, z))),
      site: (x, y, z) => sstep(0.05, 0.0, F.glow(x, y, z)),
      reach: (x, y, z) => clamp01(Math.max(F.glow(x, y, z), 0) / 0.3),
    });
    const core = meshSDF(F.glow, [-0.14, -0.14, -0.14, 0.14, 0.14, 0.14], res(0.0105), { color: () => GLOW, site: () => 1 });
    const mat = bodyMat({ body: 1, spec: 1 });
    const mesh = addMesh(mergeData([body, core]), mat, 1);
    mesh.position.set(C[i][0], C[i][1], C[i][2]);
    nodes.push({ mesh, mat, lit: 0 });
    const halo = bill(HALO_FRAG, 1.5, 3, {}); halo.position.set(C[i][0], C[i][1], C[i][2]); nodeHalos.push(halo);
  }

  /* ---------------------------------------------------------------- les liens : un tube fin, une pointe de flèche, une impulsion */
  const linkObjs = []; const linkPts = [];
  const TUBE_R = 0.0165; const ARROW_L = 0.15; const ARROW_R = 0.052;
  const tmp12 = new Float32Array(12);
  for (let li = 0; li < 4; li++) {
    const { a, b } = links[li]; const sT = b - ARROW_L; const RING = 10; const SEG = Math.max(14, Math.round(36 * q));
    const P = []; const N = []; const T = []; const K = []; const I = [];
    const ring = (s, rad, nrmMode, kind) => {
      sp.at(s, tmp12); const t = (s - a) / (b - a); const base = P.length / 3;
      for (let r = 0; r <= RING; r++) {
        const th = (r / RING) * Math.PI * 2; const cn = Math.cos(th); const sn = Math.sin(th);
        const rx = cn * tmp12[6] + sn * tmp12[9]; const ry = cn * tmp12[7] + sn * tmp12[10]; const rz = cn * tmp12[8] + sn * tmp12[11];
        P.push(tmp12[0] + rx * rad, tmp12[1] + ry * rad, tmp12[2] + rz * rad);
        if (nrmMode === 0) N.push(rx, ry, rz);
        else if (nrmMode === 1) N.push(-tmp12[3], -tmp12[4], -tmp12[5]);
        else { const l = Math.hypot(ARROW_L, ARROW_R); N.push((rx * ARROW_L + tmp12[3] * ARROW_R) / l, (ry * ARROW_L + tmp12[4] * ARROW_R) / l, (rz * ARROW_L + tmp12[5] * ARROW_R) / l); }
        T.push(t); K.push(kind);
      }
      return base;
    };
    const bands = [];
    for (let m = 0; m <= SEG; m++) bands.push(ring(a + (sT - a) * (m / SEG), TUBE_R, 0, 0));
    const shoulderIn = ring(sT, TUBE_R, 1, 1); const shoulderOut = ring(sT, ARROW_R, 1, 1);
    const coneBase = ring(sT, ARROW_R, 2, 1); const coneTip = ring(b, 0.0005, 2, 1);
    const strip = (r0, r1) => { for (let r = 0; r < RING; r++) { I.push(r0 + r, r0 + r + 1, r1 + r, r0 + r + 1, r1 + r + 1, r1 + r); } };
    for (let m = 0; m < SEG; m++) strip(bands[m], bands[m + 1]);
    strip(shoulderOut, shoulderIn); strip(coneBase, coneTip);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N), 3));
    geo.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(T), 1)); geo.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(K), 1));
    geo.setIndex(I); geo.computeBoundingSphere(); disposables.push(geo);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uShow: U.show, uHead: { value: -1 }, uHead2: { value: -1 }, uAmp2: { value: 0 }, uPW: { value: 0.06 }, uRad: { value: TUBE_R }, uTube: { value: new THREE.Vector3(...mixc(MIST, BLUE, 0.28)) }, uArrow: { value: new THREE.Vector3(...BLUE) } },
      vertexShader: LINK_VERT, fragmentShader: LINK_FRAG, transparent: true, depthWrite: true,
    });
    disposables.push(mat); solids.push(mat);
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 1; group.add(mesh);
    // les points du lien, pour poser la bille lumineuse de l'impulsion
    const pts = []; for (let m = 0; m <= 48; m++) { sp.at(a + (sT - a) * (m / 48), tmp12); pts.push([tmp12[0], tmp12[1], tmp12[2], (a + (sT - a) * (m / 48) - a) / (b - a)]); }
    linkPts.push(pts);
    const photon = bill(PHOTON_FRAG, 0.3, 4, {}); linkObjs.push({ mesh, mat, photon, head: -1 });
  }

  /* ---------------------------------------------------------------- l'onde sous le dernier nœud */
  const endS = sp.knotArc[6]; sp.at(endS, tmp12); const RIP = [tmp12[0], tmp12[1], tmp12[2]];
  const rippleGeo = new THREE.SphereGeometry(1, 36, 20); disposables.push(rippleGeo);
  const ripples = [];
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.ShaderMaterial({ uniforms: { uShow: U.show, uR: { value: 0.1 }, uAlpha: { value: 0 }, uPhase: { value: 0 } }, vertexShader: RIPPLE_VERT, fragmentShader: RIPPLE_FRAG, transparent: true, depthWrite: false, side: THREE.FrontSide });
    disposables.push(mat); const m = new THREE.Mesh(rippleGeo, mat); m.position.set(RIP[0], RIP[1], RIP[2]); m.renderOrder = 3; m.frustumCulled = false; group.add(m); ripples.push({ mesh: m, mat });
  }
  const ripHalo = bill(HALO_FRAG, 0.9, 3, {}); ripHalo.position.set(RIP[0], RIP[1], RIP[2]);

  /* ---------------------------------------------------------------- les molécules pâles du cytoplasme */
  const molDefs = [
    { f: (x, y, z) => sdSphere(x, y, z, 1) + 0.12 * Math.sin(x * 3.1 + 1) * Math.sin(y * 2.7) * Math.sin(z * 3.3), n: 5 },
    { f: (x, y, z) => Math.hypot(Math.hypot(x, y) - 0.78, z) - 0.3, n: 4 },
    { f: (x, y, z) => smin(sdSphere(x - 0.55, y, z, 0.62), sdSphere(x + 0.5, y + 0.1, z, 0.5), 0.4), n: 4 },
  ];
  const molCenter = new THREE.Vector3(0.05, -3.5, 0); const molMeshes = [];
  { let s = 7; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (const def of molDefs) {
      const d = meshSDF(def.f, [-1.4, -1.4, -1.4, 1.4, 1.4, 1.4], res(0.23), { color: () => [1, 1, 1] });
      const base = new THREE.BufferGeometry(); base.setAttribute('position', new THREE.BufferAttribute(d.pos, 3)); base.setAttribute('normal', new THREE.BufferAttribute(d.nrm, 3)); base.setIndex(new THREE.BufferAttribute(d.index, 1));
      const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('normal', base.attributes.normal);
      const cnt = def.n; const i0 = new Float32Array(cnt * 4); const i1 = new Float32Array(cnt * 4); const i2 = new Float32Array(cnt * 4); const tone = new Float32Array(cnt);
      for (let k = 0; k < cnt; k++) {
        let x; let y; let z; let tries = 0;
        do { x = (rnd() - 0.5) * 3.4; y = -1.5 - rnd() * 4.4; z = (rnd() - 0.5) * 1.6 - 0.2; tries++; }
        while (tries < 40 && (C.some((c) => Math.hypot(x - c[0], y - c[1], (z - c[2]) * 0.8) < 0.8) || Math.hypot(x - G0[0], y - G0[1]) < 0.9 || Math.abs(x - 0.05) < 0.28 && y > -2.0));
        i0.set([x, y, z, 0.06 + 0.055 * rnd()], k * 4); i1.set([rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, 0.6 + rnd() * 0.9], k * 4);
        i2.set([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5, (rnd() - 0.5) * 0.7], k * 4); tone[k] = rnd();
      }
      geo.setAttribute('aI0', new THREE.InstancedBufferAttribute(i0, 4)); geo.setAttribute('aI1', new THREE.InstancedBufferAttribute(i1, 4)); geo.setAttribute('aI2', new THREE.InstancedBufferAttribute(i2, 4));
      geo.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 1)); geo.instanceCount = cnt; disposables.push(geo, base);
      const mat = new THREE.ShaderMaterial({ uniforms: { uShow: U.show, uTime: U.time, uCenter: { value: molCenter } }, vertexShader: MOL_VERT, fragmentShader: MOL_FRAG, transparent: true, depthWrite: false });
      disposables.push(mat); const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 0; group.add(m); molMeshes.push(m);
    } }

  /* ---------------------------------------------------------------- les petits halos de la protéine G */
  const alphaHalo = bill(HALO_FRAG, 0.75, 3, {});

  // quelques constantes de pose
  const WAIT = [-1.12, 0.12, 0.24];          // décalage de l'attente par rapport à l'arrimage
  const PARK_OFF = [-0.63, -0.02, 0.04];     // où l'alpha se pose, dans le repère du premier nœud (le bout de l'hélice entre dans sa prise)
  const PARK = [C[0][0] + PARK_OFF[0], C[0][1] + PARK_OFF[1], C[0][2] + PARK_OFF[2]];
  const vTrim = new THREE.Vector3(); const vDock = new THREE.Vector3(); const vMid = new THREE.Vector3(); const vPark = new THREE.Vector3(); const vTmp = new THREE.Vector3();
  const eul = new THREE.Euler(0, 0, 0, 'YXZ'); const qTrim = new THREE.Quaternion(); const qPark = new THREE.Quaternion(); const qTmp = new THREE.Quaternion(); const qPlug = new THREE.Quaternion();
  const alphaLocal = new THREE.Vector3(ALPHA_C[0], ALPHA_C[1], ALPHA_C[2]); const yAxis = new THREE.Vector3(0, 1, 0);
  const linkPoint = (li, t, out) => {
    const pts = linkPts[li]; const f = clamp01(t) * 48; const i = Math.min(47, Math.floor(f)); const u = f - i;
    out.set(lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u), lerp(pts[i][2], pts[i + 1][2], u)); return out;
  };

  // la fenêtre de chaque événement de la cascade (valeur de cascade, de 0 à 1)
  const NODE_ON = [[0.0, 0.08], [0.26, 0.34], [0.54, 0.62], [0.78, 0.86]];
  const LINK_RUN = [[0.06, 0.28], [0.32, 0.56], [0.6, 0.8], [0.84, 0.96]];
  let lastTransparent = true;

  /** show : fondu de l'ensemble ; active : la protéine G s'arrime (0 à 0.5) puis l'alpha file vers le premier nœud (0.5 à 1) ;
   *  cascade : les nœuds s'allument l'un après l'autre, l'impulsion descend les liens, l'onde finale ; time : secondes (mouvement au repos). */
  function setPose({ show = 1, active = 0, cascade = 0, time = 0 } = {}) {
    const s = clamp01(show); const a = clamp01(active); const c = clamp01(cascade); const t = time;
    U.show.value = s; U.time.value = t;
    group.visible = s > 0.002;
    const transp = s < 0.999;
    if (transp !== lastTransparent) { for (const m of solids) m.transparent = transp; lastTransparent = transp; }
    const dk = ease(a / 0.5); const dt = ease((a - 0.5) / 0.5); const wait = 1 - dk;

    // les nœuds : ils respirent, se balancent un peu, et s'allument l'un après l'autre
    for (let i = 0; i < 4; i++) {
      const lit = sstep(NODE_ON[i][0], NODE_ON[i][1], c); const nd = nodes[i]; const pulse = 4 * lit * (1 - lit);
      nd.lit = lit; nd.mat.uniforms.uLit.value = lit; nd.mat.uniforms.uFlash.value = pulse * 0.85;
      nd.mesh.scale.setScalar((1 + 0.015 * Math.sin(t * 0.9 + i * 1.7) + 0.02 * pulse) * lerp(0.9, 1, s));
      const sw = i === 0 ? 0.35 : 1;   // le premier nœud porte l'alpha : il bouge moins
      eul.set(0.07 * sw * Math.sin(t * 0.45 + i), 0.16 * sw * Math.sin(t * 0.37 + i * 2.1), 0.05 * sw * Math.sin(t * 0.5 + i * 0.7)); nd.mesh.quaternion.setFromEuler(eul);
      nd.mesh.position.set(C[i][0], C[i][1] + 0.012 * Math.sin(t * 0.8 + i * 1.3), C[i][2]);
      const h = nodeHalos[i]; h.position.copy(nd.mesh.position);
      h.material.uniforms.uAlpha.value = lit * (0.78 + 0.1 * Math.sin(t * 1.5 + i)) * (1 + 0.3 * pulse);
      h.material.uniforms.uSize.value = 1.45 + 0.36 * pulse + 0.05 * Math.sin(t * 1.1 + i);
    }

    // la protéine G : l'attente (flottement), le glissement vers le faisceau, l'arrimage
    const lift = Math.sin(Math.PI * dk);
    vTrim.set(G0[0] + WAIT[0] * wait + 0.05 * lift,
      G0[1] + WAIT[1] * wait + 0.14 * lift + wait * 0.035 * Math.sin(t * 0.9) + 0.004 * Math.sin(t * 1.3) * dk,
      G0[2] + WAIT[2] * wait + 0.2 * lift + wait * 0.02 * Math.cos(t * 0.7));
    eul.set(0.18 * wait + wait * 0.05 * Math.sin(t * 0.6), -0.6 * wait + wait * 0.07 * Math.sin(t * 0.5 + 1), 0.34 * wait + wait * 0.05 * Math.cos(t * 0.8));
    qTrim.setFromEuler(eul);
    const trimerS = 1 + 0.006 * Math.sin(t * 1.4);
    trimer.position.copy(vTrim); trimer.quaternion.copy(qTrim); trimer.scale.setScalar(trimerS);
    qSpin.setFromAxisAngle(zAxis, t * 0.18); beta.quaternion.copy(betaQ0).multiply(qSpin);   // l'hélice bêta tourne lentement

    // l'alpha : arrimée avec le trimère, puis elle s'en détache, file en arc et se pose contre le premier nœud (sa prise de gauche)
    vDock.copy(alphaLocal).multiplyScalar(trimerS).applyQuaternion(qTrim).add(vTrim);
    const n0 = nodes[0].mesh;
    vPark.set(PARK_OFF[0] + 0.01 * Math.sin(t * 0.9), PARK_OFF[1] + 0.016 * Math.sin(t * 0.7 + 1), PARK_OFF[2]).applyQuaternion(n0.quaternion).add(n0.position);
    eul.set(0.05 * Math.sin(t * 0.6), 0.1 * Math.sin(t * 0.5), -1.42 + 0.05 * Math.sin(t * 0.8)); qPlug.setFromEuler(eul);
    qPark.copy(n0.quaternion).multiply(qPlug);
    vMid.set(lerp(vDock.x, vPark.x, 0.5) - 0.62, lerp(vDock.y, vPark.y, 0.5) + 0.1, lerp(vDock.z, vPark.z, 0.5) + 0.42);
    const iu = 1 - dt;
    alpha.position.set(iu * iu * vDock.x + 2 * iu * dt * vMid.x + dt * dt * vPark.x, iu * iu * vDock.y + 2 * iu * dt * vMid.y + dt * dt * vPark.y, iu * iu * vDock.z + 2 * iu * dt * vMid.z + dt * dt * vPark.z);
    qTmp.copy(qTrim).slerp(qPark, dt);
    alpha.quaternion.copy(qTmp.premultiply(qPlug.setFromAxisAngle(yAxis, 1.6 * Math.sin(Math.PI * dt))));
    alpha.scale.setScalar(trimerS * lerp(1, 0.92, dt));
    const gtp = sstep(0.32, 0.62, a);
    alphaMat.uniforms.uLit.value = gtp; alphaMat.uniforms.uFlash.value = 0.9 * 4 * gtp * (1 - gtp);
    alphaHalo.position.copy(alpha.position); alphaHalo.material.uniforms.uAlpha.value = 0.6 * gtp * (0.3 + 0.7 * dt); alphaHalo.material.uniforms.uSize.value = 0.8;

    // les liens et l'impulsion qui descend
    const flow = sstep(0.97, 1.0, c);
    for (let li = 0; li < 4; li++) {
      const lk = linkObjs[li]; const head = (c - LINK_RUN[li][0]) / (LINK_RUN[li][1] - LINK_RUN[li][0]);
      const done = c >= LINK_RUN[li][1]; const run = c > LINK_RUN[li][0] && !done;
      lk.mat.uniforms.uHead.value = done ? 1.2 : (run ? head : -1);
      lk.mat.uniforms.uHead2.value = flow > 0 ? ((t * 0.2 + li * 0.27) % 1.7) - 0.35 : -1; lk.mat.uniforms.uAmp2.value = 0.55 * flow;
      const amp = run ? sstep(0, 0.06, head) * (1 - sstep(0.94, 1.02, head)) : 0;
      lk.photon.visible = amp > 0.001;
      if (lk.photon.visible) { linkPoint(li, head, lk.photon.position); lk.photon.material.uniforms.uAlpha.value = amp; lk.photon.material.uniforms.uSize.value = 0.36; }
    }
    // l'onde : trois fronts qui s'étendent en boucle, de plus en plus pâles
    const amp = sstep(0.94, 1.0, c);
    for (let i = 0; i < 3; i++) {
      const ph = ((t * 0.3 + i / 3) % 1 + 1) % 1; const rp = ripples[i];
      rp.mesh.visible = amp > 0.002; rp.mat.uniforms.uR.value = 0.1 + 0.85 * Math.pow(ph, 0.8); rp.mat.uniforms.uAlpha.value = amp; rp.mat.uniforms.uPhase.value = ph;
    }
    ripHalo.material.uniforms.uAlpha.value = 0.65 * amp * (0.8 + 0.2 * Math.sin(t * 2.1)); ripHalo.material.uniforms.uSize.value = 0.7;
    ripHalo.visible = amp > 0.002;
  }

  setPose({ show: 0, active: 0, cascade: 0, time: 0 });
  function dispose() {
    for (const d of disposables) d.dispose();
    group.traverse((o) => { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
    group.clear();
  }
  /** Compile les shaders avant la première image visible (le groupe est invisible tant que show = 0) : renderer.compile(group, camera). */
  const precompile = (renderer, camera) => renderer.compile(group, camera);
  // l'emprise de tout ce que la scène peut montrer, en unités FRAME (l'onde descend jusqu'à y = -6.4, la protéine G attend à gauche)
  const bounds = { min: [-1.45, -6.45, -0.9], max: [1.1, -0.85, 0.9] };
  return { group, setPose, dispose, precompile, bounds, ripple: RIP, parked: PARK, waiting: [G0[0] + WAIT[0], G0[1] + WAIT[1], G0[2] + WAIT[2]] };
}
