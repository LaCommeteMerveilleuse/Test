// BlackPhage - la brume. Le décor de tout le site : un ciel d'indigo qui s'éclaircit vers l'horizon, de grandes nappes
// de lumière qui dérivent, et quelques poussières lumineuses qui montent. Sur les pages intérieures, un petit rendu
// WebGL2 sans bibliothèque. Sur l'accueil, la scène (scene.js) réutilise les mêmes fonctions GLSL.
import { stage, useFrame, onResize } from './stage.js';

export const MIST_GLSL = /* glsl */ `
float bp_hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float bp_hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float bp_vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(bp_hash3(i), bp_hash3(i + vec3(1,0,0)), f.x), mix(bp_hash3(i + vec3(0,1,0)), bp_hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(bp_hash3(i + vec3(0,0,1)), bp_hash3(i + vec3(1,0,1)), f.x), mix(bp_hash3(i + vec3(0,1,1)), bp_hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float bp_fbm(vec3 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++) { s += a * bp_vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }

// Des poussières lumineuses qui montent et scintillent, sur une grille de cellules.
float bp_motes(vec2 uv, float aspect, float t){
  vec2 g = vec2(uv.x * aspect, uv.y) * 13.0;
  g.y -= t * 0.22;
  vec2 id = floor(g); vec2 f = fract(g) - 0.5;
  float h = bp_hash(id);
  vec2 o = (vec2(bp_hash(id + 1.7), bp_hash(id + 9.1)) - 0.5) * 0.7;
  float r = length(f - o);
  float size = 0.040 + 0.070 * bp_hash(id + 4.3);
  float tw = 0.5 + 0.5 * sin(t * (0.5 + h * 1.6) + h * 40.0);
  return step(0.86, h) * pow(1.0 - smoothstep(0.0, size, r), 1.6) * tw;
}

// Le ciel de l'accueil et le fond des pages. hero vaut 1 sur l'accueil (horizon lumineux), moins ailleurs.
// uv de 0 à 1, origine en bas à gauche. H : hauteur de l'horizon. sc : défilement.
vec3 bp_mist(vec2 uv, float aspect, float t, float sc, float hero, float H){
  float y = uv.y;
  vec3 top = vec3(0.125, 0.150, 0.310);
  vec3 mid = vec3(0.250, 0.310, 0.545);
  vec3 low = vec3(0.095, 0.115, 0.240);
  vec3 col = mix(low, mid, smoothstep(0.0, 0.55, y));
  col = mix(col, top, smoothstep(0.55, 1.05, y));
  vec2 p = vec2(uv.x * aspect, y);
  float n = bp_fbm(vec3(p * 1.15, t * 0.018 + sc * 0.6));
  col += vec3(0.20, 0.25, 0.50) * smoothstep(0.42, 0.85, n) * 0.18;
  float n2 = bp_fbm(vec3(p * 2.2 + 7.0, t * 0.026));
  col += vec3(0.60, 0.34, 0.52) * smoothstep(0.60, 0.90, n2) * 0.07;           // un soupçon de rose corail
  // l'horizon : une lueur de brume pâle, plus forte à droite, là où jouent l'enfant et le poisson
  float hz = exp(-pow((y - H) / 0.13, 2.0));
  float side = 0.55 + 0.75 * exp(-pow((uv.x - 0.66) / 0.42, 2.0));
  col += vec3(0.34, 0.41, 0.62) * hz * side * (0.50 * hero + 0.12);
  col += vec3(0.20, 0.26, 0.48) * (1.0 - smoothstep(H, H + 0.25, y)) * smoothstep(H - 0.2, H, y) * 0.10 * hero;
  // la gauche, où vit le texte, reste plus sombre
  col *= mix(1.0, mix(0.80, 1.0, smoothstep(0.0, 0.72, uv.x)), hero);
  // poussières lumineuses
  float m = bp_motes(uv, aspect, t);
  col += mix(vec3(0.70, 0.78, 1.0), vec3(1.0, 0.72, 0.60), bp_hash(floor(vec2(uv.x * aspect, uv.y) * 13.0))) * m * (0.20 + 0.10 * hero);
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
${MIST_GLSL}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec3 c = bp_mist(uv, aspect, uTime, uScroll, 0.0, 0.2);
  c += (bp_hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

/** Crée le canevas de la brume s'il n'existe pas et lance le dessin. Sans WebGL2, la page garde son dégradé CSS. */
export function initMist() {
  const root = document.documentElement;
  if (root.classList.contains('mist-on')) return;
  let canvas = document.getElementById('mist');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'mist';
    canvas.className = 'mist';
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
  } catch (e) { console.warn('mist', e); root.classList.add('no-webgl'); return; }
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
  root.classList.add('mist-on');
}
