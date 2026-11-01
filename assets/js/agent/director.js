// BlackPhage - le chef d'orchestre de l'agent. Il lit la page (où sont les emplacements, où l'on en est dans les scènes épinglées)
// et règle à chaque image l'objet lisse de la section (smooth.js) et le nuage de petits cubes (agent.js) : au repos l'objet est lisse et réaliste ;
// quand on quitte la section, ou quand le curseur le touche, il se fractionne en cubes qui filent en traînée fine vers la forme suivante.
//
//   brain  (0)  le cerveau numérique, sous le titre
//   split  (1)  trois amas, un par famille de médicaments, sur les trois cartes
//   robot  (2)  le robot, à côté de « Meet NovaDiff »
//   ligand (3)  le ruban qui s'arrime dans la poche du récepteur
//   stream (4)  le flux du signal, qui descend la cascade
//   grid   (5)  la grille 1 x 1, 3 x 3, 9 x 9 ... puis la sphère, avec le bouton de contact
import * as THREE from 'three';
import { createAgent, GRID_HIGH, GRID_LOW, PALETTE } from './agent.js';
import { createSmooth } from './smooth.js';
import { loadShapes } from './shapes.js';
import { t, number, onLang } from '../i18n.js';

const VISIBLE = [20000, 18000, 20000, 4500, 5500];     // cubes des formes : cerveau, trois amas, robot, ruban, flux (de petits cubes, 59 049 seulement pour la sphère finale)
const VISIBLE_WEAK = [6561, 6561, 6561, 2400, 3000];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
const q = (s) => document.querySelector(s);

export async function startAgent({ canvas, low = false, frozen = null }) {
  const weak = low || innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 2;
  const G = weak ? GRID_LOW : GRID_HIGH;
  const n = G * G;
  const M = weak ? VISIBLE_WEAK : VISIBLE;               // les formes n'utilisent que de gros cubes ; le reste du moteur est en réserve pour la sphère
  const shapes = await loadShapes(n, 7, {}, M);
  const agent = createAgent({ canvas, n, shapes });
  // les objets lisses : leurs maillages se calculent dans un worker, le temps que l'affiche (le même objet, lisse) reste à l'écran
  let sm = null; let firstMesh = null;
  try {
    firstMesh = new Promise((res) => { sm = createSmooth(THREE, agent, shapes, { palette: PALETTE, weak, onReady: (k) => { if (k === 0) res(); } }); });
  } catch (e) { console.warn('objets lisses absents', e && e.message); sm = null; }
  const reveal = { 0: 0, 1: 0, 2: 0, 5: 1 };            // chaque maillage apparaît en douceur quand il est prêt : les cubes se fondent en lisse
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || frozen !== null;
  let dpr = Math.min(devicePixelRatio || 1, weak ? 1.25 : 1.6);

  // la scène du récepteur et celle du signal (des modules à part : s'ils manquent, l'agent fonctionne seul)
  const frame = new THREE.Group();
  frame.visible = false;
  agent.scene.add(frame);
  let receptor = null; let signal = null;
  try { const m = await import('./receptor.js'); receptor = m.createReceptorScene(THREE, { quality: weak ? 0.5 : 1 }); frame.add(receptor.group); } catch (e) { console.warn('récepteur absent', e && e.message); }
  try { const m = await import('./signal.js'); signal = m.createSignalScene(THREE, { quality: weak ? 0.5 : 1 }); frame.add(signal.group); } catch (e) { console.warn('signal absent', e && e.message); }

  const el = {
    brain: q('[data-slot="brain"]'), split: q('[data-slot="split"]'), robot: q('[data-slot="robot"]'), story: q('[data-slot="story"]'),
    storySec: q('[data-story]'), grid: q('[data-slot="grid"]'), gridSec: q('[data-grid]'),
    icons: [...document.querySelectorAll('[data-split-icon]')], caps: [...document.querySelectorAll('.cap')], dots: [...document.querySelectorAll('.rail__dot')],
    rail: q('.rail'), lv: q('.grid__lv'), cnt: q('.grid__n'), btn: q('.grid__btn'), gridHead: q('.grid__head'), hint: q('.grid__hint'),
  };

  function resize() { agent.resize(innerWidth, innerHeight, dpr); }
  resize(); addEventListener('resize', resize);

  const ptr = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0, in: false };
  addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.nx = (e.clientX / innerWidth) * 2 - 1; ptr.ny = (e.clientY / innerHeight) * 2 - 1; ptr.in = true; }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.in = false; });

  const ext = shapes.map((s) => s.extent || [1, 1, 1]);
  const rectOf = (e) => (e ? e.getBoundingClientRect() : null);
  const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const fit = (r, k, f = 0.95) => Math.min((r.width / 2) / ext[k][0], (r.height / 2) / ext[k][1]) * f;

  // l'état lissé
  const S = { disperse: 0, level: 0, look: { x: 0, y: 0 }, mix: 0, a: 0, b: 0, fade: 1, u: 0, g: 0, time: 0 };
  let last = performance.now();
  const dbg = { a: 0, b: 0, mix: 0, u: 0, g: 0, level: 0, bend: 0, disperse: 0, anchor: null, n };

  function frameLoop(now) {
    const raw = (now - last) / 1000; const dt = Math.min(0.05, raw); last = now;
    if (!document.hidden) tick(dt, Math.min(0.5, raw));
    requestAnimationFrame(frameLoop);
  }

  function tick(dt, rawDt = dt) {
    const vh = innerHeight; const vw = innerWidth;
    const sy = scrollY;
    if (!reduce) S.time += dt;
    const time = frozen !== null ? frozen : S.time;

    // le regard : le robot et le cerveau suivent un peu le curseur
    S.look.x += ((ptr.in ? ptr.nx : 0) - S.look.x) * (1 - Math.exp(-dt * 4));
    S.look.y += ((ptr.in ? ptr.ny : 0) - S.look.y) * (1 - Math.exp(-dt * 4));
    const lookY = reduce ? 0 : S.look.x; const lookX = reduce ? 0 : S.look.y;
    const bob = (sc) => (reduce ? 0 : Math.sin(time * 1.1) * sc * 0.025);

    // les emplacements
    const rBrain = rectOf(el.brain); const rRobot = rectOf(el.robot); const rGrid = rectOf(el.grid); const rStory = rectOf(el.story);
    const icons = el.icons.map(rectOf);
    const secStory = rectOf(el.storySec); const secGrid = rectOf(el.gridSec);

    const anchors = {};
    if (rBrain) { const c = center(rBrain); const sc = fit(rBrain, 0, 0.92); anchors[0] = { x: c.x, y: c.y + bob(sc), scale: sc, rx: 0.1 + lookX * 0.1, ry: -0.5 + lookY * 0.3 }; }
    if (icons.length === 3 && icons[0]) {
      const c0 = center(icons[0]); const c1 = center(icons[1]); const c2 = center(icons[2]);
      const spacing = (c2.x - c0.x) / 2; const sc = spacing / 1.7;
      anchors[1] = { x: c1.x, y: (c0.y + c1.y + c2.y) / 3 + bob(sc), scale: sc, rx: 0.08, ry: lookY * 0.2 };
    }
    if (rRobot) { const c = center(rRobot); const sc = fit(rRobot, 2, 0.92); anchors[2] = { x: c.x, y: c.y + bob(sc), scale: sc, rx: 0.08 + lookX * 0.18, ry: 0.15 + lookY * 0.45 }; }

    // la scène du récepteur, épinglée : u va de 0 à 1 pendant qu'on défile
    let u = 0; let uPin = false;
    if (secStory) { u = clamp((-secStory.top) / Math.max(1, secStory.height - vh)); uPin = secStory.top < vh && secStory.bottom > 0; }
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
    if (anchors[3] && anchors[2]) {
      const enter = secStory ? smooth(vh * 0.9, 0, secStory.top) : 0;       // 0 : la section est loin, 1 : elle arrive en haut de l'écran
      const above = { x: anchors[3].x, y: anchors[3].y - 0.78 * vh - focus * 0, scale: anchors[2].scale * 1.0, rx: 0.1, ry: 0.2 };
      anchors.robotAbove = { x: lerp(anchors[2].x, above.x, enter), y: lerp(anchors[2].y, above.y, enter), scale: lerp(anchors[2].scale, above.scale, enter), rx: lerp(anchors[2].rx, above.rx, enter), ry: lerp(anchors[2].ry, above.ry, enter) };
    }

    // la sphère
    let g = 0;
    if (secGrid) g = clamp((-secGrid.top) / Math.max(1, secGrid.height - vh));
    if (rGrid) {
      const c = center(rGrid); const sc = rGrid.width * 0.5 * 0.95;
      const bendP = smooth(0.70, 0.88, g);
      anchors[5] = { x: c.x, y: c.y + bob(sc) * 0.4, scale: sc, rx: lerp(0.0, -0.22, bendP) + lookX * 0.12 * bendP, ry: lerp(0.0, -0.3, bendP) + (reduce ? 0 : (g - 0.7) * 2.2 * bendP) + lookY * 0.3 * bendP };
    }

    // quelle forme, vers quelle forme, et où en est le passage
    const C = sy + vh / 2;     // le milieu de l'écran, en coordonnées de la page
    const page = (r) => (r ? r.top + sy + r.height / 2 : 0);
    const yBrain = rBrain ? page(rBrain) : 0; const yEng = icons[1] ? page(icons[1]) : yBrain + vh; const yRobot = rRobot ? page(rRobot) : yEng + vh;
    let a; let b; let mix; let A; let B; let dust = 1; let level = 0; let bend = 0; let fade = 1;
    let rec = { show: 0, dock: 0, active: 0 }; let sig = { show: 0, active: 0, cascade: 0 };
    const storyTop = secStory ? secStory.top + sy : 1e9;
    const storyEnd = secStory ? secStory.bottom + sy - vh : 1e9;       // la valeur de scrollY où la scène finit
    const gridTop = secGrid ? secGrid.top + sy : 1e9;

    if (sy < storyTop - vh * 0.1) {
      if (C <= yBrain) { a = b = 0; mix = 0; A = B = anchors[0]; }
      else if (C <= yEng) { a = 0; b = 1; mix = smooth(0.18, 0.82, (C - yBrain) / (yEng - yBrain)); A = anchors[0]; B = anchors[1]; }
      else if (C <= yRobot) { a = 1; b = 2; mix = smooth(0.12, 0.88, (C - yEng) / (yRobot - yEng)); A = anchors[1]; B = anchors[2]; }
      else { a = b = 2; mix = 0; A = B = anchors.robotAbove || anchors[2]; }     // quand la scène du récepteur approche, le robot monte au-dessus d'elle, d'où il descendra
      fade = 1;
    } else if (sy < storyEnd) {
      // la scène du récepteur
      A = anchors.robotAbove || anchors[2]; B = anchors.ligand || anchors[3];
      if (u < 0.52) { a = 2; b = 3; mix = smooth(0.06, 0.4, u); } else { a = 3; b = 4; mix = smooth(0.6, 0.92, u); A = anchors[3]; B = anchors[4]; }     // le ruban s'est posé : la suite part de la poche
      fade = 1;
      if (u < 0.06) { a = b = 2; mix = 0; A = B = anchors.robotAbove || anchors[2]; }
    } else if (sy < gridTop) {
      // du récepteur à la sphère : le flux traverse les articles en poussière fine
      a = 4; b = 5; A = anchors[4]; B = anchors[5];
      mix = smooth(0.15, 0.95, (sy - storyEnd) / Math.max(1, gridTop - storyEnd));
      fade = 1;
      level = 0; bend = 0;
    } else {
      a = b = 5; mix = 0; A = B = anchors[5];
    }
    if (!A) A = anchors[0] || { x: vw / 2, y: vh / 2, scale: 200, rx: 0, ry: 0 };
    if (!B) B = A;

    // les paramètres de la scène du récepteur
    if (storyActive) {
      rec = { show: smooth(0.0, 0.12, u) * (1 - smooth(0.93, 1.0, u)), dock: smooth(0.4, 0.46, u), active: smooth(0.5, 0.62, u) };
      sig = { show: smooth(0.5, 0.62, u) * (1 - smooth(0.94, 1.0, u)), active: smooth(0.58, 0.7, u), cascade: smooth(0.66, 0.92, u) };
      if (u < 0.0001) { rec.show = 0; sig.show = 0; }
    }

    // la grille, ses niveaux (1, 3, 9, 27, 81, 243) et la sphère
    if (a === 5 || b === 5) {
      const l = clamp((g - 0.06) / 0.58) * agent.L;
      const fl = Math.floor(l);
      level = Math.min(agent.L, fl + smooth(0.28, 0.72, l - fl));
      if (l >= agent.L) level = agent.L;
      bend = smooth(0.70, 0.88, g);
      if (a === 4 && b === 5) { level = 0; bend = 0; }
    }

    // le curseur disperse l'agent
    const main = mix < 0.5 ? A : B; const mk = mix < 0.5 ? a : b;
    const reach = (mk === 5 ? 1.0 : Math.max(ext[mk][0], ext[mk][1]) * 0.78) * main.scale;
    const dx = ptr.x - main.x; const dy = ptr.y - main.y;
    const inside = ptr.in && Math.hypot(dx, dy) < reach && !reduce && !(a === 3 || (a === 2 && b === 3 && mix > 0.4));
    window.__agentHot = inside;
    const target = inside ? 1 : 0;
    S.disperse += (target - S.disperse) * (1 - Math.exp(-dt * (target > S.disperse ? 9 : 2.6)));

    // le fractionnement : 0 l'objet lisse est entier, 1 il est tout en cubes. Lisse au repos, en cubes pendant le voyage ou sous le curseur.
    const hv = reduce ? 0 : smooth(0.05, 0.4, S.disperse);
    for (const k of [0, 1, 2]) if (sm && sm.ready(k)) reveal[k] = reduce ? 1 : Math.min(1, reveal[k] + rawDt / 1.4);       // en temps réel, même quand l'écran rame
    const rv = (k) => smooth(0, 1, reveal[k]);               // 0 : le maillage vient d'arriver, 1 : il est entier
    let dA = smooth(0.0, 0.07, mix); let dB = 1 - smooth(0.93, 1.0, mix);
    if (mix < 0.5) dA = Math.max(dA, hv); else dB = Math.max(dB, hv);
    if (a === b) dB = dA;
    if (sm) {
      if (a <= 2 || a === 5) dA = Math.max(dA, 1 - rv(a));        // pas encore de maillage lisse : les cubes tiennent la place
      if (b <= 2 || b === 5) dB = Math.max(dB, 1 - rv(b));
    } else { dA = 1; dB = 1; }
    if (a === 3 || a === 4) dA = (a === 3) ? smooth(0.0, 0.1, mix) : smooth(0.0, 0.07, mix);       // le ruban et le flux n'ont pas d'objet lisse ici : le maillage du récepteur et du signal les remplace
    if (b === 3) dB = 1 - smooth(0.42, 0.5, u);
    if (b === 4) dB = (a === 3) ? 1 - smooth(0.9, 1.0, mix) : 1;
    if (a === 5 || b === 5) {
      // les cases de la grille, puis la sphère lisse qui prend leur place
      const sa = (a === 5 && b === 5) ? smooth(0.9, 0.975, g) : 0;
      if (a === 5) dA = 1 - sa; if (b === 5) dB = 1 - sa;
    }
    if (sm) {
      const place = (k, anc) => { sm.place(k, anc); };
      place(a, A); if (b !== a) place(b, B);
      for (const k of [0, 1, 2, 5]) {
        let vis = false; let dis = 1;
        if (k === a) { vis = true; dis = dA; } else if (k === b) { vis = true; dis = dB; }
        sm.set(k, { visible: vis, dissolve: dis, time });
      }
    }
    agent.set({ a, b, mix, dust, fade, time, anchorA: A, anchorB: B, level, bend, disperse: S.disperse, hit: { x: ptr.x, y: ptr.y }, radius: Math.max(70, main.scale * 0.55), glow: 0, disA: dA, disB: dB });

    // la scène du récepteur : un repère commun (ancre 3) pour la membrane, le récepteur et le signal
    const an = anchors[3];
    frame.visible = !!an && storyActive && (rec.show > 0.001 || sig.show > 0.001);
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

    agent.render();

    // l'habillage HTML de la scène épinglée et de la sphère
    if (secStory) {
      const idx = u < 0.26 ? 1 : u < 0.52 ? 2 : u < 0.8 ? 3 : 4;
      el.caps.forEach((c, i) => { c.classList.toggle('is-on', i + 1 === idx); c.classList.toggle('is-past', i + 1 < idx); });
      el.dots.forEach((d, i) => d.classList.toggle('on', i + 1 <= idx));
      el.rail && el.rail.style.setProperty('--sp', u.toFixed(3));
    }
    if (secGrid && el.lv) {
      const k = Math.round(level);
      const m = Math.pow(3, k);
      const showSphere = bend > 0.5;
      const shown = a === 5 || b === 5 ? (showSphere ? n : m * m) : 1;
      el.lv.textContent = showSphere ? `${number(G)} × ${number(G)}` : `${number(m)} × ${number(m)}`;
      el.cnt.textContent = `${number(shown)} ${t('grid_cubes')}`;
      if (el.btn) {
        el.btn.classList.toggle('is-on', g > 0.9);
        const an5 = anchors[5];
        if (an5) { el.btn.style.setProperty('--bx', `${an5.x.toFixed(1)}px`); el.btn.style.setProperty('--by', `${(an5.y + an5.scale * 0.04).toFixed(1)}px`); }   // sur la sphère, qui suit le défilement
      }
      el.hint && (el.hint.style.opacity = g > 0.02 && g < 0.9 ? '0' : g >= 0.9 ? '0' : '1');
    }
    Object.assign(dbg, { a, b, mix, u, g, level, bend, disperse: S.disperse, anchor: main, inside, sy, frame: (dbg.frame || 0) + 1, reveal: [reveal[0], reveal[1], reveal[2]], dis: [dA, dB] });
  }

  requestAnimationFrame(frameLoop);
  window.__agent = { state: () => ({ ...dbg }), agent, n, ready: true, smooth: sm };
  // l'affiche (le cerveau lisse) reste à l'écran tant que le premier maillage n'est pas prêt, au plus 7 secondes
  if (firstMesh) {
    canvas.style.opacity = '0'; canvas.style.transition = 'opacity 0.8s';
    await Promise.race([firstMesh, new Promise((r) => setTimeout(r, 7000))]);
    canvas.style.opacity = '1';
  }
  onLang(() => { /* les textes de la grille se recalculent à l'image suivante */ });
  return window.__agent;
}
