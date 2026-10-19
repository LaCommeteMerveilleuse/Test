// BlackPhage - l'abysse. Le décor sous-marin de tout le site : une eau profonde, des rayons de lumière qui
// descendent de la surface, des caustiques qui dansent et de la neige marine.
// Sur les pages intérieures, un petit rendu WebGL2 sans bibliothèque. Sur l'accueil, la scène des mains
// (hands.js) réutilise exactement les mêmes fonctions GLSL, pour que les rayons éclairent aussi les mains.
import { stage, useFrame, onResize } from './stage.js';

export const ABYSS_GLSL = /* glsl */ `
vec3 bp_perm(vec3 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
float bp_snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = bp_perm(bp_perm(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float bp_hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// Caustiques : la lumière que des vaguelettes concentrent en un réseau de lignes brillantes.
// On somme quelques ondes sinusoïdales (la hauteur de l'eau), puis on cherche là où la courbure du fond de la
// surface focalise la lumière : le déterminant de la matrice (I + hessienne) s'annule le long des lignes brillantes.
float bp_caustic(vec2 p, float t){
  float hxx = 0.0, hyy = 0.0, hxy = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float a = 0.7 + fi * 2.399963;
    float kk = 1.0 + 0.42 * fi + 0.25 * sin(fi * 1.7);
    vec2 k = vec2(cos(a), sin(a)) * kk;
    float ph = dot(k, p) + t * (0.50 + 0.11 * fi) + fi * 2.1;
    float s = -sin(ph) * (0.55 / (1.0 + fi * 0.45));
    hxx += s * k.x * k.x; hyy += s * k.y * k.y; hxy += s * k.x * k.y;
  }
  float det = (1.0 + hxx) * (1.0 + hyy) - hxy * hxy;
  return clamp(0.15 / (abs(det) + 0.13), 0.0, 3.0);
}

// Rayons de lumière dans l'eau. uv de 0 à 1 (origine en bas à gauche), aspect = largeur / hauteur.
// Ils partent du haut à gauche et descendent vers la droite, comme dans un tableau de la Renaissance.
float bp_shafts(vec2 uv, float aspect, float t){
  vec2 p = vec2(uv.x * aspect, uv.y);
  float ang = radians(21.0);
  vec2 dir = vec2(sin(ang), -cos(ang));
  vec2 prp = vec2(cos(ang), sin(ang));
  vec2 org = vec2(-0.10 * aspect, 1.10);
  vec2 q = p - org;
  float u = dot(q, prp);
  float v = max(dot(q, dir), 0.0);
  float f = clamp(aspect / 1.6, 0.34, 1.6);
  const float C[6] = float[6](0.20, 0.47, 0.66, 0.90, 1.22, 1.50);
  const float W[6] = float[6](0.040, 0.070, 0.175, 0.036, 0.080, 0.055);
  const float A[6] = float[6](0.34, 0.42, 1.55, 0.30, 0.36, 0.24);
  float s = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float c = C[i] * f + 0.025 * sin(t * 0.10 + fi * 2.3);
    float w = W[i] * (0.8 + 0.6 * f) * (1.0 + 0.50 * v);
    float d = (u - c) / w;
    s += A[i] * exp(-d * d);
  }
  float shimmer = 0.80 + 0.20 * bp_snoise(vec2(u * 8.0, v * 1.2 - t * 0.12));
  float fade = exp(-v * 0.55) * smoothstep(0.0, 0.10, v + 0.06);
  // sur un écran étroit, les rayons se serrent : on les adoucit pour garder l'en-tête lisible
  float narrow = mix(0.52, 1.0, smoothstep(0.55, 1.30, aspect));
  return s * shimmer * fade * narrow;
}

// Le décor : de l'eau profonde, un plafond lumineux, des rayons et un voile de particules.
// hero vaut 1 sur l'accueil (plafond visible), moins ailleurs. sc : défilement de 0 à 1.
vec3 bp_abyss(vec2 uv, float aspect, float t, float sc, float hero){
  float y = uv.y;
  vec3 deep = vec3(0.002, 0.008, 0.013);
  vec3 mid  = vec3(0.006, 0.034, 0.052);
  vec3 col = mix(deep, mid, smoothstep(0.0, 0.66, y));
  col = mix(col, vec3(0.020, 0.100, 0.135), smoothstep(0.55, 1.0, y) * (0.5 + 0.5 * hero));
  // l'eau est plus claire à gauche, là d'où viennent les rayons
  float glow = exp(-pow(length((uv - vec2(0.10, 1.04)) * vec2(0.85, 1.05)), 2.0) * 2.6);
  col += vec3(0.14, 0.42, 0.52) * glow * 0.55;
  // rayons
  float sh = bp_shafts(uv, aspect, t);
  vec3 shaftCol = mix(vec3(0.30, 0.64, 0.84), vec3(1.0, 0.88, 0.64), smoothstep(0.30, 1.15, sh));
  col += shaftCol * sh * (0.42 + 0.20 * hero);
  // caustiques : surtout dans la lumière, et plus près de la surface
  vec2 cp = vec2(uv.x * aspect, uv.y + sc * 0.5) * 9.4;
  float cau = bp_caustic(cp, t);
  col += vec3(0.62, 0.94, 1.0) * cau * (0.016 + 0.060 * smoothstep(0.1, 1.0, y)) * (0.10 + 1.15 * sh);
  // le plafond : la surface vue d'en dessous, qui scintille tout en haut
  float top = smoothstep(0.84, 1.0, y);
  float rip = bp_snoise(vec2(uv.x * aspect * 4.0 + t * 0.15, y * 16.0 - t * 0.28)) * 0.5 + 0.5;
  float glint = bp_caustic(vec2(uv.x * aspect * 11.0, y * 26.0 - t * 0.2), t * 0.7);
  col += vec3(0.40, 0.74, 0.88) * top * top * (0.25 + 0.75 * rip) * 0.30 * hero;
  col += vec3(0.9, 1.0, 1.0) * glint * top * top * 0.16 * hero;
  return col;
}
`;

const VERT = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uScroll;
out vec4 outColor;
${ABYSS_GLSL}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec3 c = bp_abyss(uv, aspect, uTime, uScroll, 0.0);
  // sur les pages intérieures, le fond reste sombre et calme pour que le texte respire
  c *= 0.62;
  c += (bp_hash(gl_FragCoord.xy + uTime) - 0.5) * 0.010;
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

/** Crée le canevas de l'abysse s'il n'existe pas et lance le dessin. Sans WebGL2, la page garde son dégradé CSS. */
export function initAbyss() {
  const root = document.documentElement;
  if (root.classList.contains('abyss-on')) return;
  let canvas = document.getElementById('abyss');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'abyss';
    canvas.className = 'abyss';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
  }
  let gl;
  try { gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch { gl = null; }
  if (!gl) { root.classList.add('no-webgl'); return; }
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('abyss', e); root.classList.add('no-webgl'); return; }
  gl.useProgram(prog);
  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uScroll = gl.getUniformLocation(prog, 'uScroll');
  gl.bindVertexArray(gl.createVertexArray());

  let skip = 0;
  onResize(() => {
    const k = Math.min(0.6, 1000 / Math.max(1, stage.w)) * stage.quality;
    canvas.width = Math.max(64, Math.round(stage.w * k));
    canvas.height = Math.max(48, Math.round(stage.h * k));
    gl.viewport(0, 0, canvas.width, canvas.height);
  });
  useFrame((s) => {
    if (!s.reduce && (skip ^= 1)) return;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, s.time);
    gl.uniform1f(uScroll, s.scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
  root.classList.add('abyss-on');
}
