// BlackPhage - verre liquide pour l'interface, dans l'esprit de liquidglass.js.
// 1. La lumière du bord suit le pointeur avec un peu d'inertie (variables CSS --gx et --gy).
// 2. Dans les navigateurs Chromium, les éléments .glass--lens réfractent ce qu'ils recouvrent : une carte de
//    déplacement (comme une goutte de verre bombée sur les bords) alimente un filtre SVG appliqué en backdrop-filter.
// Ailleurs, le verre reste dépoli et lumineux. Rien n'est obligatoire : sans ce script, le CSS suffit.
import { stage, onResize } from './stage.js';

const lerp = (a, b, k) => a + (b - a) * k;
const items = new Map();   // élément -> état
let raf = 0;

// ------------------------------------------------------------- lumière du bord
function aim(el, st) {
  const r = el.getBoundingClientRect();
  const { px, py } = stage.pointer;
  const near = px > r.left - 220 && px < r.right + 220 && py > r.top - 220 && py < r.bottom + 220;
  if (near) { st.tx = px - r.left; st.ty = py - r.top; st.tl = 1; } else { st.tx = r.width * 0.5; st.ty = -r.height * 0.6; st.tl = 0; }
}

function step() {
  raf = 0;
  let moving = false;
  items.forEach((st, el) => {
    aim(el, st);
    const k = 0.16;
    st.x = lerp(st.x, st.tx, k); st.y = lerp(st.y, st.ty, k); st.l = lerp(st.l, st.tl, 0.12);
    el.style.setProperty('--gx', `${st.x.toFixed(1)}px`);
    el.style.setProperty('--gy', `${st.y.toFixed(1)}px`);
    el.style.setProperty('--gl', st.l.toFixed(3));
    if (Math.abs(st.x - st.tx) > 0.4 || Math.abs(st.y - st.ty) > 0.4 || Math.abs(st.l - st.tl) > 0.01) moving = true;
  });
  if (moving) raf = requestAnimationFrame(step);
}
const wake = () => { if (!raf && !stage.reduce) raf = requestAnimationFrame(step); };
addEventListener('pointermove', wake, { passive: true });
addEventListener('scroll', wake, { passive: true });

// ------------------------------------------------------------- réfraction
// Si l'appareil peine (la scène baisse sa qualité), on retire les réfractions et on garde le verre dépoli.
onResize(() => {
  if (!document.documentElement.classList.contains('perf-low')) return;
  items.forEach((st, el) => { el.style.backdropFilter = ''; });
});
const chromium = /Chrome\/\d+/.test(navigator.userAgent) && !/Firefox|FxiOS|CriOS/.test(navigator.userAgent);
let defs = null;
let nextId = 0;

function ensureDefs() {
  if (defs) return defs;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;pointer-events:none';
  defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);
  return defs;
}

/** Carte de déplacement d'un rectangle arrondi : neutre au centre, poussée vers l'intérieur sur le bord. */
function lensMap(w, h, radius, bezel) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const hx = w / 2; const hy = h / 2;
  const rr = Math.min(radius, hx, hy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hx; const py = y + 0.5 - hy;
      const qx = Math.abs(px) - (hx - rr); const qy = Math.abs(py) - (hy - rr);
      const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;   // négatif à l'intérieur
      const d = -sd;
      let dx = 0; let dy = 0;
      if (d < bezel) {
        const t = Math.max(0, d) / bezel;             // 0 au bord, 1 en bas de la pente
        const mag = Math.pow(1 - t, 2.2);              // pente d'une goutte bombée
        let nx; let ny;
        if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = Math.sign(px) * qx / l; ny = Math.sign(py) * qy / l; }
        else if (qx > qy) { nx = Math.sign(px); ny = 0; } else { nx = 0; ny = Math.sign(py); }
        dx = -nx * mag; dy = -ny * mag;                // vers l'intérieur
      }
      const i = (y * w + x) * 4;
      img.data[i] = Math.round(255 * (0.5 + 0.5 * dx));
      img.data[i + 1] = Math.round(255 * (0.5 + 0.5 * dy));
      img.data[i + 2] = 128; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

function applyLens(el, st) {
  if (!chromium || stage.reduce || document.documentElement.classList.contains('perf-low')) { el.style.backdropFilter = ''; return; }
  const r = el.getBoundingClientRect();
  const w = Math.round(r.width); const h = Math.round(r.height);
  if (w < 40 || h < 24 || w * h > 700000) return;
  if (st.lensW === w && st.lensH === h) return;
  st.lensW = w; st.lensH = h;
  const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16;
  const bezel = Math.min(28, h * 0.46);
  const scale = Math.round(Math.min(30, bezel * 1.1));
  const id = st.id || (st.id = `bp-lens-${nextId++}`);
  let f = document.getElementById(id);
  if (!f) {
    f = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    f.id = id;
    f.setAttribute('filterUnits', 'userSpaceOnUse');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.innerHTML = '<feImage result="map" preserveAspectRatio="none"/><feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G"/>';
    ensureDefs().appendChild(f);
  }
  f.setAttribute('x', '0'); f.setAttribute('y', '0'); f.setAttribute('width', String(w)); f.setAttribute('height', String(h));
  const im = f.querySelector('feImage');
  im.setAttribute('x', '0'); im.setAttribute('y', '0'); im.setAttribute('width', String(w)); im.setAttribute('height', String(h));
  im.setAttribute('href', lensMap(w, h, radius, bezel));
  f.querySelector('feDisplacementMap').setAttribute('scale', String(scale));
  el.style.backdropFilter = `url(#${id}) blur(${el.dataset.blur || 7}px) saturate(1.7)`;
}

let ro = null;
function observe(el, st) {
  if (!el.classList.contains('glass--lens') || !chromium) return;
  if (!ro) {
    let t = 0;
    ro = new ResizeObserver((entries) => {
      clearTimeout(t);
      t = setTimeout(() => entries.forEach((e) => { const s = items.get(e.target); if (s) applyLens(e.target, s); }), 120);
    });
  }
  ro.observe(el);
  applyLens(el, st);
}

/** Enregistre les éléments .glass d'une zone. */
export function initGlass(scope = document) {
  scope.querySelectorAll('.glass').forEach((el) => {
    if (items.has(el)) return;
    const st = { x: 0, y: 0, tx: 0, ty: 0, l: 0, tl: 0 };
    items.set(el, st);
    aim(el, st);
    st.x = st.tx; st.y = st.ty;
    el.style.setProperty('--gx', `${st.x}px`); el.style.setProperty('--gy', `${st.y}px`); el.style.setProperty('--gl', '0');
    observe(el, st);
  });
  wake();
}
