// BlackPhage - l'aurore. Un champ de couleur doux qui coule derrière toutes les pages, dans l'esprit de
// shadergradient : du bruit déformé par du bruit, quelques lignes de soie bleue, et un grain très léger.
// Le dessin est calculé en basse résolution puis étiré par le navigateur, donc il reste léger.
// La fonction GLSL est exportée pour que la protéine de l'accueil réfracte exactement le même champ.
import { stage, useFrame, onResize } from './stage.js';

export const AURORA_GLSL = /* glsl */ `
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

// uv entre 0 et 1 (origine en bas à gauche), t en secondes, sc le défilement de 0 à 1, aspect = largeur / hauteur.
// calm vaut 1 pour la pleine couleur et descend vers 0 pour une page presque blanche (zone du texte).
vec3 bp_aurora(vec2 uv, float t, float sc, float aspect, float calm){
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 1.2;
  p.y -= sc * 1.1;
  vec2 q = p + vec2(0.022 * t, -0.015 * t);
  float w1 = bp_snoise(q * 0.62 + vec2(1.7, 9.2));
  float w2 = bp_snoise(q * 0.62 + vec2(8.3, 2.8) + w1 * 0.55);
  vec2 r = q + vec2(w1, w2) * 0.36;
  float a = bp_snoise(r * 0.95 + vec2(0.013 * t, 0.0)) * 0.5 + 0.5;
  float b = bp_snoise(r * 1.45 - vec2(0.0, 0.019 * t) + 4.0) * 0.5 + 0.5;
  float s = 1.0 - abs(bp_snoise(r * vec2(0.75, 1.7) + vec2(0.0, 0.011 * t) + 11.0));
  s = s * s * s * s;

  vec3 ice    = vec3(0.905, 0.940, 1.000);
  vec3 peri   = vec3(0.690, 0.775, 1.000);
  vec3 lilac  = vec3(0.835, 0.795, 1.000);
  vec3 sky    = vec3(0.760, 0.925, 1.000);
  vec3 cobalt = vec3(0.330, 0.490, 0.985);

  vec3 c = vec3(1.0);
  c = mix(c, ice,   smoothstep(0.22, 0.78, a) * 0.95);
  c = mix(c, peri,  smoothstep(0.45, 0.90, b) * 0.70);
  c = mix(c, lilac, smoothstep(0.55, 0.95, a * b * 1.7) * 0.55);
  c = mix(c, sky,   smoothstep(0.62, 0.95, 1.0 - a) * 0.30);
  c = mix(c, cobalt, s * 0.26);
  return mix(vec3(1.0), c, calm);
}

// Le champ tel qu'il apparaît à l'écran : calme à gauche (le texte), pleine couleur à droite (l'objet).
vec3 bp_field(vec2 uv, float t, float sc, float aspect, float calmBase){
  float side = mix(calmBase, 1.0, smoothstep(0.18, 0.92, uv.x));
  return bp_aurora(uv, t, sc, aspect, side);
}
`;

const VERT = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uScroll; uniform float uCalm;
out vec4 outColor;
${AURORA_GLSL}
float bp_hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec3 c = bp_field(uv, uTime, uScroll, aspect, uCalm);
  c += (bp_hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;   // un peu de grain contre les bandes
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

/** Crée le canevas de l'aurore s'il n'existe pas et lance le dessin. Sans WebGL2, la page garde son dégradé CSS. */
export const calmFor = (w) => (w < 900 ? 0.45 : 0.28);

export function initAurora() {
  const root = document.documentElement;
  if (root.classList.contains('aurora-on')) return;
  let canvas = document.getElementById('aurora');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'aurora';
    canvas.className = 'aurora';
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
  } catch (e) { console.warn('aurora', e); root.classList.add('no-webgl'); return; }
  gl.useProgram(prog);
  const u = (n) => gl.getUniformLocation(prog, n);
  const uRes = u('uRes'); const uTime = u('uTime'); const uScroll = u('uScroll'); const uCalm = u('uCalm');
  gl.bindVertexArray(gl.createVertexArray());

  let skip = 0;
  onResize(() => {
    // le champ est très doux, une demi-résolution suffit (et moins si l'appareil est lent)
    const k = Math.min(0.5, 900 / Math.max(1, stage.w)) * stage.quality;
    canvas.width = Math.max(64, Math.round(stage.w * k));
    canvas.height = Math.max(48, Math.round(stage.h * k));
    gl.viewport(0, 0, canvas.width, canvas.height);
  });

  useFrame((s) => {
    if (!s.reduce && (skip ^= 1)) return;                     // 30 images par seconde suffisent pour un champ aussi lent
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, s.time);
    gl.uniform1f(uScroll, s.scroll);
    gl.uniform1f(uCalm, calmFor(s.w));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
  root.classList.add('aurora-on');
}
