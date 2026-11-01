// BlackPhage - le chef d'orchestre de l'agent. Il lit la page (où sont les emplacements, où l'on en est dans la scène épinglée) et règle à chaque image
// l'objet lisse de la section (smooth.js) et le moteur de petits cubes (agent.js). Le canevas est DERRIÈRE le texte : l'animation ne passe jamais au-dessus.
//
//   hero   le cerveau, grand, au centre : une animation 3D (les cubes arrivent en tourbillon et s'assemblent, puis le cerveau devient translucide
//          et ses impulsions courent à travers le cortex), puis le titre, seul
//   why    le cerveau se range à droite de « notre raison d'être »
//   agent  le cerveau se fractionne en cubes qui filent (une traînée fine) jusqu'au robot NovaDiff, lisse
//   story  le robot descend, se brise en cubes qui se replient en protéine, s'insère dans la poche du récepteur, puis le signal descend la cascade
//
// Tout ce qui dépend du défilement est lissé (amorti) : l'animation reste fluide même quand la molette avance par à-coups.
import * as THREE from 'three';
import { createAgent, GRID_HIGH, GRID_LOW, PALETTE } from './agent.js';
import { createSmooth } from './smooth.js';
import { loadShapes } from './shapes.js';

// cubes visibles par forme : cerveau, (amas : inutilisé), robot, ruban, flux. Plus il y en a, plus ils sont petits.
const VISIBLE = [40000, 600, 40000, 8000, 10000];
const VISIBLE_WEAK = [6561, 600, 6561, 2400, 3000];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const lerpA = (p, q, k) => ({ x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), scale: lerp(p.scale, q.scale, k), rx: lerp(p.rx, q.rx, k), ry: lerp(p.ry, q.ry, k), rz: lerp(p.rz || 0, q.rz || 0, k) });
const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const q = (s) => document.querySelector(s);

export async function startAgent({ canvas, low = false, frozen = null, onTitle = () => {} }) {
  const weak = low || innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 2;
  const n = weak ? GRID_LOW * GRID_LOW : 40000;
  const M = weak ? VISIBLE_WEAK : VISIBLE;
  const shapes = await loadShapes(n, 7, {}, M);
  const agent = createAgent({ canvas, n, shapes });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || frozen !== null;
  let dpr = Math.min(devicePixelRatio || 1, weak ? 1.25 : 2);

  // les objets lisses : leurs maillages se calculent dans un worker, le temps que l'affiche (le même cerveau, lisse) reste à l'écran
  let sm = null; let firstMesh = null;
  try {
    firstMesh = new Promise((res) => { sm = createSmooth(THREE, agent, shapes, { palette: PALETTE, weak, onReady: (k) => { if (k === 0) res(); } }); });
  } catch (e) { console.warn('objets lisses absents', e && e.message); sm = null; }
  const reveal = { 0: 0, 2: 0 };                          // chaque maillage apparaît en douceur quand il est prêt : les cubes se fondent en lisse

  // la scène du récepteur et celle du signal (des modules à part : s'ils manquent, l'agent fonctionne seul)
  const frame = new THREE.Group();
  frame.visible = false;
  agent.scene.add(frame);
  let receptor = null; let signal = null;
  try { const m = await import('./receptor.js'); receptor = m.createReceptorScene(THREE, { quality: weak ? 0.5 : 1 }); frame.add(receptor.group); } catch (e) { console.warn('récepteur absent', e && e.message); }
  try { const m = await import('./signal.js'); signal = m.createSignalScene(THREE, { quality: weak ? 0.5 : 1 }); frame.add(signal.group); } catch (e) { console.warn('signal absent', e && e.message); }

  const el = {
    brain: q('[data-slot="brain"]'), brain2: q('[data-slot="brain2"]'), robot: q('[data-slot="robot"]'), story: q('[data-slot="story"]'), storySec: q('[data-story]'),
    caps: [...document.querySelectorAll('.cap')], dots: [...document.querySelectorAll('.rail__dot')], rail: q('.rail'),
  };

  function resize() { agent.resize(innerWidth, innerHeight, dpr); }
  resize(); addEventListener('resize', resize);

  const ptr = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0, in: false };
  addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.nx = (e.clientX / innerWidth) * 2 - 1; ptr.ny = (e.clientY / innerHeight) * 2 - 1; ptr.in = true; }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.in = false; });
  addEventListener('pointerdown', (e) => { S.click = { x: e.clientX, y: e.clientY }; }, { passive: true });

  const ext = shapes.map((s) => s.extent || [1, 1, 1]);
  const rectOf = (e) => (e ? e.getBoundingClientRect() : null);
  const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const fit = (r, k, f = 0.95) => Math.min((r.width / 2) / ext[k][0], (r.height / 2) / ext[k][1]) * f;

  // l'état amorti
  const S = { disperse: 0, look: { x: 0, y: 0 }, P: null, u: null, time: 0, vy: 0, py: null, spinT: 9, burst: 0, hover: 0, click: null };
  let last = performance.now();
  let introStart = null; let titleShown = false;
  const dbg = { a: 0, b: 0, mix: 0, u: 0, P: 0, disperse: 0, anchor: null, n, intro: 0 };

  function frameLoop(now) {
    const raw = (now - last) / 1000; const dt = Math.min(0.05, raw); last = now;
    if (!document.hidden) tick(dt, Math.min(0.5, raw));
    requestAnimationFrame(frameLoop);
  }

  function tick(dt, rawDt = dt) {
    const vh = innerHeight; const vw = innerWidth;
    const sy = scrollY;
    if (!reduce) S.time += dt;
    const time = frozen !== null ? frozen : (window.__timeOverride !== undefined ? window.__timeOverride : S.time);     // __timeOverride : pour les captures d'écran
    const introT = reduce ? 99 : (window.__introFreeze !== undefined ? window.__introFreeze : introStart === null ? 0 : (performance.now() - introStart) / 1000);     // __introFreeze : pour les captures d'écran
    if (!titleShown && (introT >= 2.5 || reduce)) { titleShown = true; onTitle(); }

    // le regard : le cerveau et le robot suivent un peu le curseur
    S.look.x = damp(S.look.x, ptr.in ? ptr.nx : 0, 4, dt); S.look.y = damp(S.look.y, ptr.in ? ptr.ny : 0, 4, dt);
    const lookY = reduce ? 0 : S.look.x; const lookX = reduce ? 0 : S.look.y;
    const bob = (sc) => (reduce ? 0 : Math.sin(time * 1.1) * sc * 0.02);

    // les emplacements
    const rBrain = rectOf(el.brain); const rBrain2 = rectOf(el.brain2); const rRobot = rectOf(el.robot); const rStory = rectOf(el.story);
    const secStory = rectOf(el.storySec);
    const anchors = {};
    const introK = smooth(0, 3.4, introT);
    if (rBrain) {
      const c = center(rBrain); const sc = fit(rBrain, 0, 0.78);
      anchors.b1 = { x: c.x, y: c.y + bob(sc) + (1 - introK) * sc * 0.06, scale: sc * lerp(0.92, 1, introK), rx: 0.1 + lookX * 0.08, ry: -0.5 + (1 - introK) * -1.3 + lookY * 0.3 + (reduce ? 0 : Math.sin(time * 0.22) * 0.1) };
    }
    if (rBrain2) { const c = center(rBrain2); const sc = fit(rBrain2, 0, 0.92); anchors.b2 = { x: c.x, y: c.y + bob(sc), scale: sc, rx: 0.1 + lookX * 0.1, ry: -0.5 + lookY * 0.3 + (reduce ? 0 : Math.sin(time * 0.22) * 0.1) }; }
    // la danse du robot : il flotte, pivote doucement, se penche quand on défile ; en arrivant il fait un tour sur lui-même, et un clic le fait tourner et saluer
    S.vy = damp(S.vy, S.py === null ? 0 : (sy - S.py) / Math.max(dt, 1e-3), 8, dt); S.py = sy;
    S.spinT += dt;
    const Pprev = S.P === null ? 0 : S.P;
    const arriveYaw = reduce ? 0 : (1 - smooth(0.78, 1.0, Pprev - 1)) * -Math.PI * 2;
    const spinYaw = reduce || S.spinT > 1.25 ? 0 : easeIO(S.spinT / 1.25) * Math.PI * 2;
    const lean = reduce ? 0 : clamp(S.vy / 2600, -1, 1);
    if (rRobot) {
      const c = center(rRobot); const sc = fit(rRobot, 2, 0.92);
      anchors.robot = {
        x: c.x, y: c.y + (reduce ? 0 : Math.sin(time * 1.15) * sc * 0.03), scale: sc,
        rx: 0.08 + lookX * 0.1 + (reduce ? 0 : Math.sin(time * 0.9 + 1.0) * 0.025 + lean * 0.05),
        ry: 0.15 + lookY * 0.3 + (reduce ? 0 : Math.sin(time * 0.45) * 0.16) + arriveYaw + spinYaw,
        rz: reduce ? 0 : Math.sin(time * 0.7) * 0.03 - lean * 0.1,
      };
    }

    // la scène du récepteur, épinglée : u va de 0 à 1 pendant qu'on défile (amorti)
    let uRaw = 0;
    if (secStory) uRaw = clamp((-secStory.top) / Math.max(1, secStory.height - vh));
    S.u = S.u === null ? uRaw : damp(S.u, uRaw, 7, rawDt);
    const u = S.u;
    const storyActive = secStory && secStory.top < vh * 0.9 && secStory.bottom > -vh * 0.2;
    const pitch = u < 0.16 ? lerp(0.56, 0.4, smooth(0, 0.16, u)) : u < 0.46 ? lerp(0.4, 0.2, smooth(0.16, 0.46, u)) : u < 0.58 ? lerp(0.2, 0.0, smooth(0.46, 0.58, u)) : lerp(0.0, -0.24, smooth(0.58, 0.72, u));
    const yaw = lerp(0.5, -0.12, smooth(0, 1, u)) + (reduce ? 0 : lookY * 0.08);
    const focus = u < 0.46 ? 1.0 : u < 0.62 ? lerp(1.0, -1.2, smooth(0.46, 0.62, u)) : lerp(-1.2, -3.6, smooth(0.62, 0.95, u)) - 0.6 * smooth(0.95, 1, u);
    const storyScale = Math.min(vw * (vw < 960 ? 0.24 : 0.17), vh * 0.215);
    if (rStory) {
      const c = center(rStory);
      anchors[3] = { x: c.x, y: c.y + focus * storyScale, scale: storyScale, rx: pitch, ry: yaw };
      anchors[4] = anchors[3];
      // le ruban de cubes se forme au-dessus de la poche (1,05 unité le long de son axe) puis glisse dedans : on le voit s'insérer
      const hov = 1.05 * (1 - smooth(0.28, 0.44, u)) * storyScale;
      anchors.ligand = { ...anchors[3], x: anchors[3].x + hov * Math.sin(pitch) * Math.sin(yaw), y: anchors[3].y - hov * Math.cos(pitch) };
    }
    // le robot, au-dessus de la scène, d'où l'agent descend
    if (anchors[3] && anchors.robot) {
      const enter = secStory ? smooth(vh * 0.9, 0, secStory.top) : 0;       // 0 : la section est loin, 1 : elle arrive en haut de l'écran
      const above = { x: anchors[3].x, y: anchors[3].y - 0.78 * vh, scale: anchors.robot.scale, rx: 0.1, ry: 0.2 };
      anchors.robotAbove = lerpA(anchors.robot, above, enter);
    }

    // où l'on en est dans la suite des emplacements : 0 le cerveau du héros, 1 le cerveau de la raison d'être, 2 le robot (amorti)
    const C = sy + vh / 2;
    const page = (r) => (r ? r.top + sy + r.height / 2 : 0);
    const yHero = rBrain ? page(rBrain) : 0; const yWhy = rBrain2 ? page(rBrain2) : yHero + vh; const yRobot = rRobot ? page(rRobot) : yWhy + vh;
    let Pt;
    if (C <= yHero) Pt = 0; else if (C <= yWhy) Pt = (C - yHero) / Math.max(1, yWhy - yHero); else if (C <= yRobot) Pt = 1 + (C - yWhy) / Math.max(1, yRobot - yWhy); else Pt = 2;
    S.P = S.P === null ? Pt : damp(S.P, Pt, 8, rawDt);
    const P = S.P;

    // la forme de départ, celle d'arrivée et le passage de l'une à l'autre
    let a; let b; let mix = 0; let A; let B; const dust = 1;
    const storyTop = secStory ? secStory.top + sy : 1e9;
    const storyEnd = secStory ? secStory.bottom + sy - vh : 1e9;       // la valeur de scrollY où la scène finit
    let off = false;
    if (sy < storyTop - vh * 0.1) {
      if (P < 1) { a = b = 0; A = B = lerpA(anchors.b1 || anchors.b2, anchors.b2 || anchors.b1, smooth(0, 1, P)); }
      else if (P < 2) { a = 0; b = 2; mix = smooth(0.1, 0.9, P - 1); A = anchors.b2 || anchors.b1; B = anchors.robot || A; }
      else { a = b = 2; A = B = anchors.robotAbove || anchors.robot; }
    } else if (sy < storyEnd) {
      // la scène du récepteur
      A = anchors.robotAbove || anchors.robot; B = anchors.ligand || anchors[3];
      if (u < 0.52) { a = 2; b = 3; mix = smooth(0.06, 0.4, u); } else { a = 3; b = 4; mix = smooth(0.6, 0.92, u); A = anchors[3]; B = anchors[4]; }     // le ruban s'est posé : la suite part de la poche
      if (u < 0.06) { a = b = 2; mix = 0; A = B = anchors.robotAbove || anchors.robot; }
    } else {
      a = b = 4; A = B = anchors[4]; off = sy > storyEnd + vh * 1.15;     // la scène remonte avec la page ; plus rien à dessiner une fois sortie
    }
    if (!A) A = anchors.b1 || { x: vw / 2, y: vh / 2, scale: 200, rx: 0, ry: 0 };
    if (!B) B = A;
    canvas.style.visibility = off ? 'hidden' : '';

    // les paramètres de la scène du récepteur
    let rec = { show: 0, dock: 0, active: 0 }; let sig = { show: 0, active: 0, cascade: 0 };
    if (storyActive) {
      rec = { show: smooth(0.0, 0.12, u) * (1 - smooth(0.93, 1.0, u)), dock: smooth(0.4, 0.46, u), active: smooth(0.5, 0.62, u) };
      sig = { show: smooth(0.5, 0.62, u) * (1 - smooth(0.94, 1.0, u)), active: smooth(0.58, 0.7, u), cascade: smooth(0.66, 0.92, u) };
      if (u < 0.0001) { rec.show = 0; sig.show = 0; }
      if (sy > storyEnd) { rec.show = 0; sig.show = 0; }
    }

    // le curseur : un petit rayon autour de lui brise l'objet lisse en cubes qui s'écartent, puis se reforment
    const main = mix < 0.5 ? A : B; const mk = mix < 0.5 ? a : b;
    const reach = Math.max(ext[mk][0], ext[mk][1]) * 0.78 * main.scale;
    const inside = ptr.in && !off && Math.hypot(ptr.x - main.x, ptr.y - main.y) < reach && !reduce && !(a === 3 || (a === 2 && b === 3 && mix > 0.4));
    window.__agentHot = inside;
    S.disperse = damp(S.disperse, inside ? 1 : 0, inside ? 9 : 2.6, dt);
    const hoverR = clamp(main.scale * 0.13, 22, 44);
    // le salut du robot : régulier (quelques secondes toutes les sept secondes), plus franc quand le curseur s'approche, à l'arrivée et après un clic
    if (S.click) { const c = S.click; S.click = null; if (!reduce && !off && mk === 2 && Math.hypot(c.x - main.x, c.y - main.y) < reach) { S.spinT = 0; S.burst = 1; } }
    if (!reduce && Pprev < 1.97 && P >= 1.97) S.burst = 1;
    S.burst = Math.max(0, S.burst - dt / 3.0);
    S.hover = damp(S.hover, inside && mk === 2 ? 1 : 0, 3, dt);
    const ph = ((time % 7) + 7) % 7;
    const wave = window.__waveOverride !== undefined ? window.__waveOverride : reduce ? 0 : Math.max(smooth(0.35, 0.8, ph) * (1 - smooth(2.9, 3.4, ph)), S.hover * 0.85, Math.min(1, S.burst * 1.6));

    // le fractionnement : 0 l'objet lisse est entier, 1 il est tout en cubes. Lisse au repos, en cubes pendant le voyage.
    for (const k of [0, 2]) if (sm && sm.ready(k)) reveal[k] = reduce ? 1 : Math.min(1, reveal[k] + rawDt / 1.4);
    const rv = (k) => smooth(0, 1, reveal[k]);
    const introDis = 1 - smooth(1.9, 3.6, introT);                       // l'assemblage en cubes puis le fondu vers le cerveau lisse
    const rest = (k) => (k === 0 ? Math.max(introDis, sm ? 1 - rv(0) : 1) : k === 2 ? (sm ? 1 - rv(2) : 1) : 1);
    let dA = a === b ? rest(a) : Math.max(rest(a), smooth(0, 0.07, mix));
    let dB = a === b ? rest(a) : Math.max(rest(b), 1 - smooth(0.93, 1.0, mix));
    if (b === 3) dB = 1 - smooth(0.42, 0.5, u);                           // le maillage du ruban prend le relais des cubes
    if (b === 4 && a === 3) dB = 1 - smooth(0.9, 1.0, mix);
    if (a === 3) dA = smooth(0.0, 0.1, mix);
    if (sm) {
      sm.place(a, A); if (b !== a) sm.place(b, B);
      for (const k of [0, 2]) {
        let vis = false; let dis = 1;
        if (k === a) { vis = true; dis = dA; } else if (k === b) { vis = true; dis = dB; }
        sm.set(k, { visible: vis, dissolve: dis, time, look: reduce ? null : S.look, wave: k === 2 ? wave : 0 });
      }
    }
    agent.set({ a, b, mix, dust, fade: 1, time, anchorA: A, anchorB: B, level: 0, bend: 0, disperse: S.disperse, hit: { x: ptr.x, y: ptr.y }, radius: hoverR, glow: 0,
      disA: dA, disB: dB, intro: smooth(0, 2.4, introT) });

    // la scène du récepteur : un repère commun (ancre 3) pour la membrane, le récepteur et le signal
    const an = anchors[3];
    frame.visible = !!an && storyActive && !off && (rec.show > 0.001 || sig.show > 0.001);
    if (frame.visible) {
      const [wx, wy] = agent.toWorld(an.x, an.y);
      const sw = an.scale * agent.pxw;
      frame.position.set(wx, wy, 0); frame.scale.setScalar(sw); frame.rotation.set(an.rx, an.ry, 0, 'YXZ');
      if (receptor) {
        receptor.setPose({ ...rec, time });
        // le ruban en maillage prend le relais des cubes : il apparaît quand ils s'effacent, posé dans la poche
        const lg = smooth(0.43, 0.51, u);
        receptor.ligand.visible = lg > 0.003;
        receptor.ligand.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = Math.min(o.material.opacity, lg); } });
      }
      signal && signal.setPose({ ...sig, time });
    }

    if (!off) agent.render();

    // l'habillage HTML de la scène épinglée
    if (secStory) {
      const idx = u < 0.26 ? 1 : u < 0.52 ? 2 : u < 0.8 ? 3 : 4;
      el.caps.forEach((c, i) => { c.classList.toggle('is-on', i + 1 === idx); c.classList.toggle('is-past', i + 1 < idx); });
      el.dots.forEach((d, i) => d.classList.toggle('on', i + 1 <= idx));
      el.rail && el.rail.style.setProperty('--sp', u.toFixed(3));
    }
    Object.assign(dbg, { a, b, mix, u, P, disperse: S.disperse, anchor: main, inside, sy, frame: (dbg.frame || 0) + 1, reveal: [reveal[0], reveal[2]], dis: [dA, dB], intro: introT, spin: S.spinT, wave, robot: anchors.robot ? { ry: anchors.robot.ry, rz: anchors.robot.rz } : null });
  }

  requestAnimationFrame(frameLoop);
  window.__agent = { state: () => ({ ...dbg }), agent, n, ready: true, smooth: sm };
  // l'affiche (le cerveau, lisse) reste à l'écran tant que le premier maillage n'est pas prêt, au plus 7 secondes ; l'animation d'ouverture commence alors
  if (firstMesh) await Promise.race([firstMesh, new Promise((r) => setTimeout(r, 7000))]);
  introStart = performance.now();
  return window.__agent;
}
