// BlackPhage - les objets lisses. Au repos, chaque section montre son objet en maillage lisse et réaliste : le cerveau, les trois amas, le robot
// et la sphère finale. Entre deux sections, l'objet se fractionne en petits cubes (le moteur de cubes, agent.js, prend le relais).
//
// Les maillages sont calculés dans un worker (mesh.worker.js) à partir des champs de distance des formes ; leurs couleurs, leurs matières et
// leurs phases d'impulsion viennent des cubes de la même forme. Un matériau physique (clearcoat, reflets d'un petit studio de lumière) éclaire
// le tout. Le fractionnement est un « dissolve » par cases cubiques : une case disparaît quand sa valeur de hachage passe sous le seuil, et ses bords
// brillent en Timber Glow, comme si le lisse se brisait en cubes.
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

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

/** Le matériau physique, avec la matière par sommet, le dissolve par cases, les impulsions du cerveau et l'éclat des bords brisés. */
function makeMaterial(THREE, env, opts = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.4, metalness: 0.3, clearcoat: opts.clearcoat ?? 0.5, clearcoatRoughness: 0.2,
    envMap: env, envMapIntensity: opts.envIntensity ?? 0.8,
  });
  const u = { uDis: { value: 0 }, uTime: { value: 0 }, uCell: { value: 0.04 }, uGlow: { value: new THREE.Color(0xe0a35c).convertSRGBToLinear() }, uPulse: { value: opts.pulse ? 1 : 0 } };
  mat.userData.u = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aMat; attribute float aPh; varying vec4 vMat; varying float vPh; varying vec3 vLoc;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = aMat; vPh = aPh; vLoc = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uDis; uniform float uTime; uniform float uCell; uniform vec3 uGlow; uniform float uPulse;
varying vec4 vMat; varying float vPh; varying vec3 vLoc;
float hash31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
float hh = hash31(floor(vLoc / uCell)) * 0.93;
if (uDis > 0.001 && hh < uDis) discard;
float rimGlow = uDis > 0.001 ? (1.0 - smoothstep(uDis, uDis + 0.08, hh)) * 1.8 : 0.0;`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vMat.x;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vMat.y;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float pulse = 0.0;
if (uPulse > 0.5 && vPh >= 0.0) {
  float px = fract(uTime * 0.24 - vPh);
  pulse = max(smoothstep(0.0, 0.02, px) * exp(-px * 30.0), 0.07 * smoothstep(0.0, 0.03, px) * exp(-px * 7.0));
}
totalEmissiveRadiance += uGlow * (vMat.z * 0.9 + pulse * 1.4 + rimGlow);`);
  };
  mat.customProgramCacheKey = () => 'bp-smooth' + (opts.pulse ? '-pulse' : '');
  return mat;
}

function geometryFrom(THREE, p) {
  const g = new THREE.BufferGeometry();
  const nv = p.pos.length / 3;
  const col = new Float32Array(nv * 3);
  for (let i = 0; i < col.length; i++) col[i] = srgbToLinear(p.col[i] * 0.9);
  const mat4 = new Float32Array(nv * 4);
  for (let i = 0; i < nv; i++) { mat4[i * 4] = p.mat[i * 3]; mat4[i * 4 + 1] = p.mat[i * 3 + 1]; mat4[i * 4 + 2] = p.mat[i * 3 + 2]; mat4[i * 4 + 3] = 0; }
  g.setAttribute('position', new THREE.BufferAttribute(p.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(p.nrm, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aMat', new THREE.BufferAttribute(mat4, 4));
  g.setAttribute('aPh', new THREE.BufferAttribute(p.phase, 1));
  g.setIndex(new THREE.BufferAttribute(p.index, 1));
  g.computeBoundingSphere();
  return g;
}

/**
 * agent : celui de createAgent (scene, renderer, toWorld, pxw). shapes : les cinq formes (pour les cubes qui donnent couleurs et matières).
 * Rend tout de suite { group, ready, place, setDissolve, setVisible, update } ; les maillages arrivent plus tard, forme après forme (ready[k]).
 */
export function createSmooth(THREE, agent, shapes, { palette, weak = false, onReady = () => {} }) {
  const group = new THREE.Group(); group.name = 'smooth';
  agent.scene.add(group);
  const env = studioEnv(THREE, agent.renderer);
  const rgb = palette.map((h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; });     // sRGB 0..1 (setStyle sans conversion de l'espace de travail)
  const rgbSRGB = palette.map((h) => { const c = new THREE.Color().setStyle(h, THREE.SRGBColorSpace); const o = {}; c.getRGB(o, THREE.SRGBColorSpace); return [o.r, o.g, o.b]; });
  void rgb;

  const slots = [0, 1, 2, 5].map((k) => ({ k, group: new THREE.Group(), meshes: [], ready: false, cell: 0.04 }));
  const byK = {}; for (const s of slots) { s.group.visible = false; group.add(s.group); byK[s.k] = s; }

  // la sphère finale : un objet simple, tout de suite prêt
  {
    const sphere = new THREE.SphereGeometry(1, 160, 110);
    const nv = sphere.attributes.position.count;
    const col = new Float32Array(nv * 3); const mat4 = new Float32Array(nv * 4); const ph = new Float32Array(nv).fill(-1);
    const top = rgbSRGB[7]; const low = rgbSRGB[4]; const warm = rgbSRGB[3]; const white = rgbSRGB[6];
    for (let i = 0; i < nv; i++) {
      const x = sphere.attributes.position.getX(i); const y = sphere.attributes.position.getY(i); const z = sphere.attributes.position.getZ(i);
      const k = clamp(0.5 - 0.5 * y); const w = clamp(0.35 + 0.65 * Math.max(0, z * 0.7 - x * 0.35 + y * 0.4));
      const r = (1 - k) * top[0] + k * low[0]; const g = (1 - k) * top[1] + k * low[1]; const b = (1 - k) * top[2] + k * low[2];
      const hot = Math.pow(clamp(-x * 0.55 - y * 0.2 + z * 0.8), 6) * 0.35;
      col[i * 3] = srgbToLinear(clamp(r * (1 - 0.25 * w) + white[0] * 0.25 * w + warm[0] * hot));
      col[i * 3 + 1] = srgbToLinear(clamp(g * (1 - 0.25 * w) + white[1] * 0.25 * w + warm[1] * hot));
      col[i * 3 + 2] = srgbToLinear(clamp(b * (1 - 0.25 * w) + white[2] * 0.25 * w + warm[2] * hot));
      mat4[i * 4] = 0.78; mat4[i * 4 + 1] = 0.2; mat4[i * 4 + 2] = hot * 0.6;
    }
    sphere.setAttribute('color', new THREE.BufferAttribute(col, 3));
    sphere.setAttribute('aMat', new THREE.BufferAttribute(mat4, 4));
    sphere.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
    const m = new THREE.Mesh(sphere, makeMaterial(THREE, env, { clearcoat: 1, envIntensity: 1.3 }));
    m.material.userData.u.uCell.value = 0.03;
    byK[5].group.add(m); byK[5].meshes.push(m); byK[5].cell = 0.03; byK[5].ready = true;
  }

  // les maillages, calculés dans un worker (sinon, en dernier recours, sur le fil principal, un objet à la fois)
  const stats = { ms: {}, where: 'worker' };
  const hFor = { brain: weak ? 0.02 : 0.015, robot: weak ? 0.018 : 0.0125, split: weak ? 0.018 : 0.0125 };
  const order = [[0, 'brain'], [2, 'robot'], [1, 'split']];
  const cubesOf = (k) => {
    const sh = shapes[k]; const m = sh.count === undefined ? sh.tag.length : sh.count;
    byK[k].cell = sh.cube * 1.6;
    return { pos: sh.pos.slice(0, m * 3), tag: sh.tag.slice(0, m), phase: sh.phase ? sh.phase.slice(0, m) : undefined, cube: sh.cube, frame: sh.frame };
  };
  const addParts = (k, kind, parts, ms) => {
    const slot = byK[k]; stats.ms[kind] = Math.round(ms);
    for (const p of parts) {
      const mesh = new THREE.Mesh(geometryFrom(THREE, p), makeMaterial(THREE, env, kind === 'brain' ? { pulse: true, clearcoat: 0.35, envIntensity: 0.75 } : kind === 'robot' ? { clearcoat: 0.9, envIntensity: 0.95 } : { clearcoat: 0.7, envIntensity: 0.9 }));
      mesh.frustumCulled = false;
      mesh.material.userData.u.uCell.value = slot.cell;
      slot.group.add(mesh); slot.meshes.push(mesh);
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
  const set = (k, { visible, dissolve = 0, time = 0 }) => {
    const s = byK[k]; if (!s) return;
    const show = !!visible && s.ready && dissolve < 0.999;
    s.group.visible = show;
    if (!show) return;
    for (const m of s.meshes) { const u = m.material.userData.u; u.uDis.value = dissolve; u.uTime.value = time; }
  };

  return { group, place, set, ready: (k) => !!(byK[k] && byK[k].ready), stats, dispose() { worker && worker.terminate(); env.dispose && env.dispose(); } };
}
