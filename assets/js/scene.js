// BlackPhage - l'œuvre de l'accueil. Un poisson combattant translucide traverse un monde moléculaire : à mesure qu'on descend la page,
// il nage de station en station (l'air libre des molécules, l'ADN, la boucle du moteur, une protéine cible et ses liants, une membrane
// et son récepteur, puis une vue d'ensemble), une station par section. La caméra le suit de profil, c'est le monde qui défile.
// Il reste à sa place à l'écran : un léger flottement, un corps qui ondule en nageant (plus largement quand on défile). Un clic sur lui
// lance une vague de bioluminescence sur son corps (le même geste est possible au clavier).
// Rendu three.js, organisé comme une scène react-three-fiber. Sans WebGL, une image fixe prend le relais (voir site.css).
import * as THREE from 'three';
import { stage, useFrame, onResize } from './stage.js';
import { buildFishGeometry, fishUniforms, fishMaterials, swimPoint } from './fish.js';
import { buildWorld, cameraRig, STATIONS } from './world.js';

const root = document.documentElement;
const canvas = document.getElementById('scene');
const BASE = root.dataset.base || '';

function webgl2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }
if (!canvas || !webgl2()) { root.classList.add('no-webgl'); } else { start().catch((e) => { console.warn('scene', e); root.classList.add('no-webgl'); }); }

const FOV = 30;
const FISH_SCALE = 100;         // longueur du corps du poisson (museau à base de queue 0,78), en unités du monde
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const UP = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------ étincelles de lumière (un clic sur le poisson)
const SPARK_VERT = `
attribute vec4 aData;   // x : taille, y : teinte, z : intensité
uniform float uPx;
varying float vA; varying float vH;
void main(){
  vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
  gl_PointSize = max(2.0, aData.x * uPx * 1500.0 / -mv.z);
  vA = aData.z; vH = aData.y;
  gl_Position = projectionMatrix * mv;
}`;
const SPARK_FRAG = `
varying float vA; varying float vH;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0) discard;
  float a = 1.0 - smoothstep(0.0, 1.0, r); a = a * a * vA;
  vec3 c = mix(vec3(1.0, 0.58, 0.28), vec3(1.0, 0.38, 0.64), vH);
  gl_FragColor = vec4(mix(c, vec3(1.0, 0.95, 0.85), smoothstep(0.7, 1.0, vA) * 0.7) * a * 1.7, a);
}`;

// ------------------------------------------------------------------ passe finale : halo lumineux, vignette, grain
const FIN_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FIN_FRAG = `
uniform sampler2D tScene; uniform vec2 uRes; uniform float uTime; uniform float uAspect; uniform float uLeft; uniform float uDim;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec2 keep(vec2 uv){ return clamp(uv, vec2(0.001), vec2(0.999)); }
void main(){
  vec3 col = texture2D(tScene, keep(vUv)).rgb;
  // un halo : la scène floue (mipmaps) rajoute de la lumière autour des parties les plus claires
  vec3 bloom = texture2D(tScene, keep(vUv), 3.0).rgb * 0.55 + texture2D(tScene, keep(vUv), 5.0).rgb * 0.45;
  col += max(bloom - 0.40, 0.0) * 0.60;
  // vignette, et un peu d'ombre à gauche, là où vit le texte
  vec2 vq = (vUv - vec2(0.60, 0.5)) * vec2(uAspect * 0.62, 1.0);
  col *= 1.0 - 0.30 * smoothstep(0.30, 1.05, length(vq));
  col *= mix(1.0, mix(0.80, 1.0, smoothstep(0.0, 0.72, vUv.x)), uLeft);
  col = col / (1.0 + col * 0.14) * 1.08;
  col *= uDim;
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.022;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// ------------------------------------------------------------------ scène
async function start() {
  const surface = await (await fetch(`${BASE}assets/data/surface.json`)).json();
  const urlU = new URLSearchParams(location.search).get('u');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x14183a, 1);
  const rt = new THREE.WebGLRenderTarget(4, 4, { samples: 4, depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  rt.texture.colorSpace = THREE.NoColorSpace;

  const world = buildWorld({ surface });
  const WU = world.uniforms;
  const scene = new THREE.Scene();
  scene.add(world.sky, world.group);

  // le poisson
  const fg = buildFishGeometry();
  const fu = fishUniforms();
  fu.uSeed.value = 3.7;
  const fm = fishMaterials(fu);
  const fish = new THREE.Group();
  fish.matrixAutoUpdate = false;
  const part = (geo, mat, order) => { const m = new THREE.Mesh(geo, mat); m.renderOrder = order; m.frustumCulled = false; fish.add(m); return m; };
  const mid = part(fg.mid, fm.fins, 11);
  const pecR = part(fg.right, fm.fins, 12);
  part(fg.body, fm.back, 13);
  part(fg.eyes, fm.eyesBack, 13.5);
  part(fg.body, fm.front, 14);
  const pecL = part(fg.left, fm.fins, 15);
  part(fg.eyes, fm.eyes, 16);
  scene.add(fish);

  // étincelles : un petit réservoir de particules animées sur le processeur
  const SP = 140;
  const spPos = new Float32Array(SP * 3); const spData = new Float32Array(SP * 4);
  const spVel = new Float32Array(SP * 3); const spLife = new Float32Array(SP).fill(1); const spAge = new Float32Array(SP).fill(9);
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3).setUsage(THREE.DynamicDrawUsage));
  spGeo.setAttribute('aData', new THREE.BufferAttribute(spData, 4).setUsage(THREE.DynamicDrawUsage));
  const sparkU = { uPx: { value: 1 } };
  const sparks = new THREE.Points(spGeo, new THREE.ShaderMaterial({ uniforms: sparkU, vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.frustumCulled = false; sparks.renderOrder = 20;
  scene.add(sparks);
  let spNext = 0;
  const emit = (p, n, speed, life) => {
    for (let i = 0; i < n; i++) {
      const k = spNext++ % SP;
      const a = Math.random() * Math.PI * 2; const b = (Math.random() - 0.3) * 1.2;
      const sp = speed * (0.35 + Math.random());
      spPos[k * 3] = p.x + (Math.random() - 0.5) * 8; spPos[k * 3 + 1] = p.y + (Math.random() - 0.5) * 8; spPos[k * 3 + 2] = p.z + (Math.random() - 0.5) * 8;
      spVel[k * 3] = Math.cos(a) * sp; spVel[k * 3 + 1] = Math.abs(Math.sin(b)) * sp * 0.8 + sp * 0.25; spVel[k * 3 + 2] = Math.sin(a) * sp * 0.5;
      spLife[k] = life * (0.6 + Math.random() * 0.8); spAge[k] = 0;
      spData[k * 4] = 1.2 + Math.random() * 2.2; spData[k * 4 + 1] = Math.random();
    }
  };

  // finale
  const finU = { tScene: { value: rt.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uAspect: { value: 1.6 }, uLeft: { value: 1 }, uDim: { value: 1 } };
  const fin = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: finU, vertexShader: FIN_VERT, fragmentShader: FIN_FRAG, depthTest: false, depthWrite: false }));
  fin.frustumCulled = false;
  const finScene = new THREE.Scene(); finScene.add(fin);
  const finCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const camera = new THREE.PerspectiveCamera(FOV, 1.6, 10, 12000);

  // ---------------------------------------------------------------- le défilement : une station par section repérée (data-station), la dernière au bas de la page
  let anchors = Array.from({ length: STATIONS }, (_, i) => i * 800);
  function measure() {
    const secs = [...document.querySelectorAll('main > section')];
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const a = [0];
    for (let i = 1; i < STATIONS - 1; i++) {
      const el = document.querySelector(`main > section[data-station="${i}"]`) || secs[Math.min(secs.length - 1, Math.round(i * (secs.length - 1) / (STATIONS - 1)))];
      if (!el || secs.length < 2) { a.push(maxScroll * i / (STATIONS - 1)); continue; }
      const r = el.getBoundingClientRect();
      a.push(r.top + scrollY + r.height * 0.5 - innerHeight * 0.5);
    }
    a.push(maxScroll);
    for (let i = 1; i < a.length; i++) a[i] = Math.max(a[i], a[i - 1] + 40);
    a[a.length - 1] = Math.max(a[a.length - 1], maxScroll);
    anchors = a;
  }
  addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  let lastH = 0;
  setInterval(() => { const h = document.documentElement.scrollHeight; if (h !== lastH) { lastH = h; measure(); } }, 1200);
  /** La station où l'on est, de 0 à 5, d'après le défilement. */
  const stationAt = (y) => {
    if (y <= anchors[0]) return 0;
    for (let i = 1; i < anchors.length; i++) if (y <= anchors[i]) return i - 1 + (y - anchors[i - 1]) / (anchors[i] - anchors[i - 1]);
    return STATIONS - 1;
  };

  onResize((s) => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75) * s.quality);
    renderer.setSize(s.w, s.h, false);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    // si l'appareil peine, on abandonne le lissage des bords : c'est ce qui coûte le plus
    const samples = s.quality < 0.99 ? 0 : 4;
    if (rt.samples !== samples) { rt.samples = samples; rt.dispose(); }
    rt.setSize(size.x, size.y);
    WU.uRes.value.copy(size); finU.uRes.value.copy(size);
    sparkU.uPx.value = size.y / 900;
    camera.aspect = s.w / s.h; camera.updateProjectionMatrix();
    world.setQuality(s.quality);
    measure();
  });

  // ---------------------------------------------------------------- le poisson : état, clics
  const F = {
    pos: new THREE.Vector3(), fwd: new THREE.Vector3(-1, 0, 0.2).normalize(), want: new THREE.Vector3(),
    lean: new THREE.Vector2(), phase: 0, fin: 0, amp: 0.085, bend: 0, roll: 0, energy: 0.1, hover: 0, lastYaw: 0, u: 0, du: 0, dv: 0,
  };
  const rig = {};
  const tmp = new THREE.Vector3(); const tmp2 = new THREE.Vector3(); const tmp3 = new THREE.Vector3();
  const sideV = new THREE.Vector3(); const upV = new THREE.Vector3(); const basis = new THREE.Matrix4();
  let waveN = 0;
  const waves = fu.uWave.value;
  function triggerWave(u0, v0, strength, t) {
    waves[waveN % 4].set(u0, t, strength, v0);
    waveN++;
    F.energy = Math.min(1.4, F.energy + 0.6 * strength);
  }

  // des disques qui couvrent le corps et les nageoires, pour savoir si le pointeur est sur le poisson
  // [x, y, rayon, abscisse de la vague (0 museau, 1 queue), côté (1 dos, -1 ventre)], dans le repère du poisson
  const spine = [
    [0.40, 0.00, 0.11, 0.12, 0.0], [0.27, 0.00, 0.13, 0.30, 0.0], [0.12, 0.00, 0.13, 0.50, 0.0], [-0.04, 0.00, 0.12, 0.70, 0.0], [-0.20, 0.00, 0.09, 0.95, 0.0],
    [-0.40, 0.00, 0.20, 1.00, 0.0], [-0.58, -0.04, 0.24, 1.00, 0.0], [-0.58, 0.26, 0.17, 1.00, 0.4], [-0.60, -0.32, 0.17, 1.00, -0.4],
    [0.02, 0.24, 0.14, 0.50, 1.0], [-0.18, 0.21, 0.11, 0.80, 1.0], [-0.10, -0.22, 0.13, 0.70, -1.0], [-0.24, -0.20, 0.10, 0.90, -1.0], [0.18, -0.30, 0.10, 0.35, -1.0],
  ];
  const proj = spine.map(() => ({ x: 0, y: 0, r: 0 }));
  /** Un point du poisson, dans le monde, avec la déformation de la nage (la même que dans le shader). */
  const bodyPoint = (x, y, z, out) => swimPoint(out.set(x, y, z), F.phase, F.amp, F.bend).applyMatrix4(fish.matrix);
  function updateProjection() {
    const pxPerUnit = stage.h / (rig.H || 262);
    for (let i = 0; i < spine.length; i++) {
      bodyPoint(spine[i][0], spine[i][1], 0, tmp).project(camera);
      proj[i].x = (tmp.x * 0.5 + 0.5) * stage.w; proj[i].y = (0.5 - tmp.y * 0.5) * stage.h;
      proj[i].r = spine[i][2] * FISH_SCALE * pxPerUnit;
    }
  }
  function hitFish(px, py) {
    let best = -1; let bd = 1e9;
    for (let i = 0; i < proj.length; i++) {
      const d = Math.hypot(px - proj[i].x, py - proj[i].y) - proj[i].r;
      if (d < bd) { bd = d; best = i; }
    }
    return bd < 0 ? best : -1;
  }
  // pour les tests : où est le milieu du corps à l'écran, et où l'on en est dans le monde
  window.__fishAt = () => { updateProjection(); return { x: proj[2].x, y: proj[2].y, r: proj[2].r, u: F.u }; };

  // ---------------------------------------------------------------- pointeur
  const ptr = { moved: -99, touch: false, over: false };
  const interactive = 'a, button, input, textarea, select, summary, label, [role="button"]';
  addEventListener('pointermove', (e) => {
    ptr.moved = stage.time; ptr.touch = e.pointerType === 'touch';
    ptr.over = !!(e.target.closest && e.target.closest(interactive));
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    ptr.moved = stage.time; ptr.touch = e.pointerType === 'touch';
    ptr.over = !!(e.target.closest && e.target.closest(interactive));
    if (ptr.over) return;
    updateProjection();
    const i = hitFish(e.clientX, e.clientY);
    if (i < 0) return;
    triggerWave(spine[i][3], spine[i][4], 1.0, stage.time);
    F.hover = 1;
    emit(bodyPoint(spine[i][0], spine[i][1], 0, tmp), 30, 60, 1.4);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.moved = -99; });

  // geste au clavier : un bouton caché, pour que tout le monde puisse toucher le poisson
  document.querySelectorAll('[data-fish-wave]').forEach((b) => b.addEventListener('click', () => {
    triggerWave(0.30, 0.0, 1.0, stage.time);
    emit(bodyPoint(0.1, 0, 0, tmp), 30, 60, 1.4);
  }));

  // ---------------------------------------------------------------- boucle
  let last = 0; let first = true; let lastVeil = -1;
  useFrame((s) => {
    const t = s.time;
    const dt = first ? 0.016 : clamp(t - last, 0.001, 0.05); last = t;
    const reduce = s.reduce;
    const aspect = s.w / s.h;

    // ---- où l'on est dans le monde : le défilement, lissé (figé sur le premier plan avec « réduire les animations »)
    const uTarget = reduce ? (urlU !== null ? clamp(+urlU, 0, STATIONS - 1) : 0) : stationAt(scrollY);
    const uPrev = F.u;
    F.u = first || reduce ? uTarget : F.u + (uTarget - F.u) * (1 - Math.exp(-3.2 * dt));
    const duDt = first || reduce ? 0 : (F.u - uPrev) / Math.max(dt, 1e-3);
    F.du += (Math.min(1, Math.abs(duDt) / 0.9) - F.du) * (1 - Math.exp(-4 * dt));
    const sp01 = reduce ? 0 : F.du;
    const tPath = F.u / (STATIONS - 1);

    // ---- la caméra de profil, qui suit le poisson ; le dernier plan recule pour la vue d'ensemble
    cameraRig(world.curve, tPath, aspect, rig, 1 + 0.38 * smooth(3.9, 5.0, F.u));
    const pointerOn = !reduce && !ptr.touch && s.pointer.px > -1e3 && (t - ptr.moved) < 6;
    const px = pointerOn ? s.pointer.x : 0; const py = pointerOn ? s.pointer.y : 0;
    camera.position.copy(rig.camPos).addScaledVector(rig.right, -px * 14).addScaledVector(UP, -py * 8);
    camera.lookAt(tmp.copy(rig.target).addScaledVector(rig.right, -px * 14).addScaledVector(UP, -py * 8));
    camera.updateMatrixWorld();

    // ---- le poisson : il flotte à sa place, à peine, et penche un peu vers le pointeur
    F.lean.x += ((pointerOn ? clamp(px * 22, -12, 12) : 0) - F.lean.x) * (1 - Math.exp(-1.4 * dt));
    F.lean.y += ((pointerOn ? clamp(-py * 14, -8, 8) : 0) - F.lean.y) * (1 - Math.exp(-1.4 * dt));
    const drift = reduce ? 0 : 1;
    // quand on défile, il se déplace un peu dans l'espace : une dérive qui suit l'avancée dans la page (nulle sur le premier écran),
    // et une poussée qui suit la vitesse (il file devant lui quand on descend, il recule un peu quand on remonte)
    F.dv += (clamp(duDt / 0.9, -1, 1) - F.dv) * (1 - Math.exp(-3 * dt));
    const au = F.u;
    const moveX = Math.sin(au * 1.55) * 9 + Math.sin(au * 3.1) * 3 - F.dv * 12;
    const moveY = Math.sin(au * 1.2) * 7 + Math.sin(au * 2.6) * 2.5 + F.dv * 3;
    const moveZ = Math.sin(au * 1.0) * 22;
    F.pos.copy(rig.fishPos)
      .addScaledVector(rig.right, F.lean.x + moveX + drift * (Math.sin(t * 0.27) * 3.5 + Math.sin(t * 0.71) * 1.2))
      .addScaledVector(UP, F.lean.y + moveY + drift * (Math.sin(t * 0.43) * 2.6 + Math.sin(t * 0.97) * 0.8))
      .addScaledVector(rig.B, moveZ + drift * Math.sin(t * 0.31) * 3);

    // le cap : le long du chemin, avec un peu de face pour garder le volume, et un léger virage qui suit l'avancée
    F.want.copy(rig.T); F.want.y = clamp(F.want.y + Math.sin(au * 0.9) * 0.05, -0.32, 0.32); F.want.normalize();
    F.want.multiplyScalar(Math.cos(0.22)).addScaledVector(rig.B, Math.sin(0.22) + Math.sin(au * 1.1) * 0.08).normalize();
    if (first || reduce) F.fwd.copy(F.want); else F.fwd.lerp(F.want, 1 - Math.exp(-3 * dt)).normalize();
    const yaw = Math.atan2(F.fwd.z, F.fwd.x);
    let dy = yaw - F.lastYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const yawRate = reduce || first ? 0 : dy / Math.max(dt, 1e-3);
    F.lastYaw = yaw;
    F.bend += (clamp(-yawRate * 0.04, -0.08, 0.08) - F.bend) * (1 - Math.exp(-3 * dt));
    F.roll += (clamp(-yawRate * 0.10, -0.25, 0.25) - F.roll) * (1 - Math.exp(-3 * dt));

    // ---- la nage : le corps ondule en douceur au repos, plus ample et plus vif quand on défile
    F.phase += dt * Math.PI * 2 * (0.55 + 0.70 * sp01);
    F.fin += dt * (1.20 + 1.3 * sp01);
    F.amp += ((0.085 + 0.045 * sp01) - F.amp) * (1 - Math.exp(-2.5 * dt));
    F.energy += ((0.10 + 0.45 * sp01) - F.energy) * (1 - Math.exp(-0.9 * dt));
    F.hover += (0 - F.hover) * (1 - Math.exp(-1.5 * dt));
    if (reduce) { F.phase = t * 3.0; F.fin = t * 1.6; F.amp = 0.095; F.bend = 0; F.roll = 0; F.energy = 0.35; }

    // la base du poisson : x = cap, y = haut, z = côté, avec un petit roulis autour du cap
    sideV.crossVectors(F.fwd, UP); if (sideV.lengthSq() < 1e-4) sideV.set(0, 0, 1); sideV.normalize();
    upV.crossVectors(sideV, F.fwd).normalize();
    const cr = Math.cos(F.roll); const sr = Math.sin(F.roll);
    tmp.copy(upV).multiplyScalar(cr).addScaledVector(sideV, sr);
    tmp2.copy(sideV).multiplyScalar(cr).addScaledVector(upV, -sr);
    basis.makeBasis(F.fwd, tmp, tmp2).scale(tmp3.setScalar(FISH_SCALE)).setPosition(F.pos);
    fish.matrix.copy(basis);
    fish.matrixWorldNeedsUpdate = true;

    fu.uTime.value = t;
    fu.uPhase.value = F.phase; fu.uSwimAmp.value = F.amp; fu.uBend.value = F.bend; fu.uEnergy.value = clamp(F.energy, 0, 1.3); fu.uHover.value = F.hover;
    fu.uFinPhase.value = F.fin; fu.uFlutter.value = 0.72 + 0.6 * sp01;
    fu.uCam.value.copy(camera.position);
    // la nageoire pectorale du côté caméra passe devant le corps
    pecL.renderOrder = sideV.dot(rig.B) > 0 ? 12 : 15; pecR.renderOrder = sideV.dot(rig.B) > 0 ? 15 : 12;
    mid.renderOrder = 11;
    // pour l'image fixe : une vague en cours sur le corps
    if (reduce) waves[0].set(0.0, t - 0.95, 0.9, 0.0);

    // ---- le monde : la lumière du poisson, la profondeur, la brume qui s'épaissit quand le texte passe dessus
    WU.uFishPos.value.copy(F.pos).addScaledVector(F.fwd, -FISH_SCALE * 0.1);
    WU.uGlow.value = clamp(0.34 + 0.50 * F.energy, 0, 1.5);
    WU.uDepth.value = tPath;
    WU.uDim.value = 1 - 0.34 * smooth(0.25, 1.0, F.u);
    const veil = smooth(0.25, 1.0, F.u);
    if (Math.abs(veil - lastVeil) > 0.01) { lastVeil = veil; root.style.setProperty('--veil', veil.toFixed(2)); }
    WU.uBind.value = smooth(2.5, 3.1, F.u) * (1 - smooth(4.5, 5.0, F.u)) + F.hover * 0.4 + 0.5 * clamp(F.energy - 0.3, 0, 1);
    tmp.copy(F.pos).project(camera);
    WU.uFishUV.value.set(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5);
    world.update(t, reduce ? 0 : dt, camera, tPath);
    finU.uTime.value = t; finU.uAspect.value = aspect;
    finU.uLeft.value = aspect >= 1.15 ? 1 - 0.45 * smooth(0.3, 1.0, F.u) : 0.0;

    // ---- les étincelles
    for (let i = 0; i < SP; i++) {
      if (spAge[i] >= spLife[i]) { spData[i * 4 + 2] = 0; continue; }
      spAge[i] += dt;
      const k = spAge[i] / spLife[i];
      spVel[i * 3] *= 1 - 0.8 * dt; spVel[i * 3 + 1] = spVel[i * 3 + 1] * (1 - 0.6 * dt) + 10 * dt; spVel[i * 3 + 2] *= 1 - 0.8 * dt;
      spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] += spVel[i * 3 + 1] * dt; spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
      spData[i * 4 + 2] = (1 - k) * smooth(0, 0.08, k) * (0.6 + 0.4 * Math.sin(t * 20 + i));
    }
    spGeo.attributes.position.needsUpdate = true; spGeo.attributes.aData.needsUpdate = true;

    // curseur : une main quand le pointeur est sur le poisson
    if (!reduce) { updateProjection(); root.classList.toggle('over-fish', !ptr.over && !ptr.touch && hitFish(s.pointer.px, s.pointer.py) >= 0); }

    first = false;
    // 1. la scène vers la cible
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    // 2. les finitions vers l'écran
    renderer.setRenderTarget(null);
    renderer.render(finScene, finCam);
  });
  root.classList.add('webgl-ready');
}
