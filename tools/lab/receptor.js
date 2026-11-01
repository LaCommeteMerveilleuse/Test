// Viewer of the receptor scene (assets/js/agent/receptor.js), in the style of lab.html: white page, full-window canvas, PerspectiveCamera fov 28.
// ?yaw=0&pitch=20     camera orbit around the target, in DEGREES (pitch 0 = side view, > 0 looks down, < 0 looks up from below)
// ?dock=1&active=0&show=1     the pose of the scene, all 0..1
// ?t=3                freezes the time (seconds) and draws once; without t the scene animates in real time
// ?d=14&ty=0.6&tx=0   camera distance and the point looked at (frame units; the membrane is 6.8 wide, the receptor spans y = -1..1)
// ?q=1                quality of the scene (lipid density);  ?cut=0|1 forces the cross-section of the bilayer (default: automatic from the camera elevation)
// ?cubes=1[&n=low]    also draws the cube cloud of shape-ligand.js (flat gray cubes, amber edges), ?mesh=0 hides the smooth ribbon
// ?lip=0              hides the lipids (to look at the receptor alone), ?rec=0 keeps only the ligand (the binder alone)
// ?gs=1&gx=0&gy=0&gry=0&grx=0   transform of the group, as a host would do (scale, x, y, rotation about y and x in radians)
// ?precompile=1       calls scene.precompile(renderer, camera) instead of initEnvironment
// ?lazyenv=1          lets the scene build its studio environment by itself on the first render instead of calling initEnvironment(renderer)
// tuning: ?hemi= ?key= ?fill= ?rim= light intensities, ?env= factor on envMapIntensity, ?cc= ?rough= clearcoat and roughness of the helices, ?dpr=
// window.__ready = true when the frame is drawn.
import * as THREE from 'three';
import { createReceptorScene } from '../../assets/js/agent/receptor.js';

const query = new URLSearchParams(location.search);
const num = (k, d) => (query.has(k) ? +query.get(k) : d);
const canvas = document.getElementById('c'); const hud = document.getElementById('hud');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setClearColor(0xffffff, 1);
const dpr = Math.min(devicePixelRatio, num('dpr', 1.5));
renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, innerWidth / innerHeight, 0.1, 120);

const t0 = performance.now();
const rs = createReceptorScene(THREE, { quality: num('q', 1) });
const tBuild = performance.now() - t0;
scene.add(rs.group);
// the host owns the group transform: ?gs= scale, ?gx= ?gy= position, ?gry= rotation about y (radians), ?grx= about x
rs.group.scale.setScalar(num('gs', 1)); rs.group.position.set(num('gx', 0), num('gy', 0), 0); rs.group.rotation.set(num('grx', 0), num('gry', 0), 0);
if (num('precompile', 0) === 1) rs.precompile(renderer, camera); else if (num('lazyenv', 0) !== 1) rs.initEnvironment(renderer);
// tuning (for the lab only): ?hemi= ?key= ?fill= ?rim= light intensities, ?env= envMapIntensity factor
for (const k of ['hemi', 'key', 'fill', 'rim']) if (query.has(k)) rs.lightRig[k].intensity = num(k, 1);
if (query.has('env')) for (const [m, base] of rs.lit) m.envMapIntensity = base * num('env', 1);
{ const rm = rs.receptor.material; if (query.has('cc')) rm.clearcoat = num('cc', 0); if (query.has('rough')) rm.roughness = num('rough', 0.3); }
if (num('lip', 1) === 0) { rs.lipids.heads.visible = false; rs.lipids.tails.visible = false; }
if (num('mesh', 1) === 0) rs.ligand.visible = false;
// ?rec=0 keeps only the ligand (to look at the binder alone)
if (num('rec', 1) === 0) for (const nm of ['receptor-helices', 'pocket-wall', 'pocket-floor', 'rim-ring', 'rim-ring-core', 'rim-halo', 'cytoplasmic-glow', 'lipid-heads', 'lipid-tails']) { const o = rs.group.getObjectByName(nm); if (o) o.removeFromParent(); }

// the cubes of the ligand shape, drawn as plain boxes in the same frame
let cubeInfo = '';
if (num('cubes', 0) === 1) {
  const mod = await import('../../assets/js/agent/shape-ligand.js');
  const n = query.get('n') === 'low' ? 6561 : 59049;
  const c0 = performance.now(); const sh = mod.default(n, 1); const ms = performance.now() - c0;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const colors = [0xcdd4d7, 0xa0abb1, 0x6a757c, 0xe0a35c];
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const im = new THREE.InstancedMesh(geo, mat, n); const m = new THREE.Matrix4(); const col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    m.makeScale(sh.cube * 0.98, sh.cube * 0.98, sh.cube * 0.98); m.setPosition(sh.pos[3 * i], sh.pos[3 * i + 1], sh.pos[3 * i + 2]);
    im.setMatrixAt(i, m); col.setHex(colors[sh.tag[i]] || 0xff00ff); im.setColorAt(i, col);
  }
  im.frustumCulled = false; scene.add(im);
  cubeInfo = `\ncubes ${n} (${ms.toFixed(0)} ms) cube ${sh.cube.toFixed(4)} min ${sh.min.map((v) => v.toFixed(2))} max ${sh.max.map((v) => v.toFixed(2))}`;
}

const target = new THREE.Vector3(num('tx', 0), num('ty', 0.6), 0);
function placeCamera() {
  const yaw = num('yaw', 0) * Math.PI / 180; const pitch = num('pitch', 0) * Math.PI / 180; const d = num('d', 14);
  camera.position.set(target.x + d * Math.sin(yaw) * Math.cos(pitch), target.y + d * Math.sin(pitch), target.z + d * Math.cos(yaw) * Math.cos(pitch));
  camera.lookAt(target); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
const pose = (time) => ({ show: num('show', 1), dock: num('dock', 1), active: num('active', 0), time, cut: query.has('cut') ? num('cut', 0) : undefined });
const frozen = query.has('t');
function draw(time) {
  placeCamera(); rs.setPose(pose(time)); renderer.render(scene, camera);
}
function loop(now) { draw(now / 1000); requestAnimationFrame(loop); window.__ready = true; }
if (frozen) { draw(num('t', 3)); draw(num('t', 3)); window.__ready = true; } else requestAnimationFrame(loop);
const st = rs.stats;
hud.textContent = `receptor scene  build ${tBuild.toFixed(0)} ms  lipids ${st.lipids}  triangles ${st.triangles} + instanced ${st.instancedTriangles}\n`
  + `yaw ${num('yaw', 0)} pitch ${num('pitch', 0)}  show ${num('show', 1)} dock ${num('dock', 1)} active ${num('active', 0)}` + cubeInfo;
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); if (frozen) draw(num('t', 3)); });
window.__rs = rs;
