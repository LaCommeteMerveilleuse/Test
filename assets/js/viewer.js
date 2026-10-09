// BlackPhage — interactive "Smart Binder" demonstration: pH control, readouts, chart, labels.
//
// The only physical-chemistry model here is Henderson–Hasselbalch for a histidine (pKa set to 6.5, a
// typical value inside proteins): it gives the fraction of protonated histidines at a given pH. The step
// from "protonated histidines" to "the assembly dissociates and the domains bind the target" is the
// mechanism BlackPhage wants to design — it is shown here as intent, not as a measured result.
import { protonated, COMPARTMENTS, HIS_PKA, fmt0, fmt1 } from './chem.js';

const SVG = 'http://www.w3.org/2000/svg';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Aggregation of the binder (1 = self-assembled, 0 = free monomers bound to the target). */
export function aggregationFromProtonation(f) {
  return 1 - smooth(0.2, 0.8, f);
}

export function initViewer({ binder, mol }) {
  const slider = $('ph');
  if (!slider) return null;

  const el = {
    value: $('ph-value'),
    his: $('m-his'), hisSub: $('m-his-sub'),
    state: $('m-state'), stateSub: $('m-state-sub'),
    sites: $('m-sites'), sitesSub: $('m-sites-sub'),
    gen: $('gen'), genBar: $('gen-bar'), genLabel: $('gen-label'),
    replay: $('replay'),
    scale: $('scalebar'), scaleLabel: $('scalebar-label'),
    legendElec: document.querySelector('[data-legend="elec"]'),
  };
  const tags = {};
  document.querySelectorAll('.tag[data-tag]').forEach((t) => { tags[t.dataset.tag] = t; });

  const state = { ph: parseFloat(slider.value), u: 1, f: 0 };
  let anim = 0;
  let replayCb = null;

  /* ---- chart: protonated fraction vs pH ------------------------------------ */
  const chart = $('chart');
  const C = { x0: 44, x1: 468, y0: 14, y1: 168, pmin: 4.5, pmax: 9.0 };
  const X = (p) => C.x0 + ((p - C.pmin) / (C.pmax - C.pmin)) * (C.x1 - C.x0);
  const Y = (f) => C.y1 - f * (C.y1 - C.y0);
  let marker; let markerLine; let markerLabel;
  if (chart) {
    const add = (name, attrs, text) => {
      const n = document.createElementNS(SVG, name);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      if (text != null) n.textContent = text;
      chart.appendChild(n);
      return n;
    };
    for (const c of COMPARTMENTS) {
      add('rect', { x: X(c.from), y: C.y0, width: Math.max(2, X(c.to) - X(c.from)), height: C.y1 - C.y0, class: `zone zone--${c.id}` });
    }
    for (const f of [0, 0.5, 1]) {
      add('line', { x1: C.x0, x2: C.x1, y1: Y(f), y2: Y(f), class: f === 0.5 ? 'axis axis--zero' : 'grid' });
      add('text', { x: C.x0 - 8, y: Y(f) + 4, class: 'tick', 'text-anchor': 'end' }, `${fmt0(f * 100)} %`);
    }
    for (let p = 5; p <= 9; p += 1) add('text', { x: X(p), y: C.y1 + 18, class: 'tick', 'text-anchor': 'middle' }, String(p));
    add('text', { x: C.x1, y: C.y1 + 34, class: 'tick tick--title', 'text-anchor': 'end' }, 'pH');
    let d = '';
    for (let p = C.pmin; p <= C.pmax + 1e-9; p += 0.05) d += `${d ? 'L' : 'M'}${X(p).toFixed(1)} ${Y(protonated(p, HIS_PKA)).toFixed(1)}`;
    add('path', { d, class: 'curve' });
    add('text', { x: X(HIS_PKA) - 8, y: Y(0.5) - 8, class: 'tick', 'text-anchor': 'end' }, `pKa ${fmt1(HIS_PKA)}`);
    markerLine = add('line', { y1: C.y0, y2: C.y1, class: 'marker-line' });
    marker = add('circle', { r: 5, class: 'marker' });
    markerLabel = add('text', { class: 'marker-label', 'text-anchor': 'middle' });
  }

  /* ---- state -> UI -------------------------------------------------------- */
  function describe(u) {
    const bound = (u <= 0.30 ? 1 : 0) + (u <= 0.10 ? 1 : 0);
    const st = u > 0.85 ? ['Auto-associée', 'sites de liaison masqués', 'closed']
      : u > 0.15 ? ['En dissociation', 'monomères libérés', 'mid']
        : ['Monomère actif', 'sites de liaison accessibles', 'open'];
    const sitesSub = ['cible non reconnue', 'une extrémité fixée', 'cible prise en pince'][bound];
    return { bound, st, sitesSub };
  }

  function setPh(v) {
    state.ph = v;
    state.f = protonated(v, HIS_PKA);
    state.u = aggregationFromProtonation(state.f);
    const { bound, st, sitesSub } = describe(state.u);

    slider.value = String(v);
    slider.setAttribute('aria-valuetext', `pH ${fmt1(v)} — ${st[0].toLowerCase()}, ${bound} site${bound > 1 ? 's' : ''} sur 2 lié${bound > 1 ? 's' : ''}`);
    el.value.textContent = fmt1(v);
    el.his.textContent = `${fmt0(state.f * 100)} %`;
    el.hisSub.textContent = `des histidines d'interface · pKa ${fmt1(HIS_PKA)}`;
    el.state.textContent = st[0];
    el.state.dataset.state = st[2];
    el.stateSub.textContent = st[1];
    el.sites.textContent = `${bound} / 2`;
    el.sites.dataset.state = bound === 2 ? 'open' : bound === 1 ? 'mid' : 'closed';
    el.sitesSub.textContent = sitesSub;

    if (marker) {
      const cx = X(Math.min(C.pmax, Math.max(C.pmin, v)));
      marker.setAttribute('cx', cx);
      marker.setAttribute('cy', Y(state.f));
      markerLine.setAttribute('x1', cx);
      markerLine.setAttribute('x2', cx);
      markerLabel.setAttribute('x', cx);
      markerLabel.setAttribute('y', Y(state.f) - 11);
      markerLabel.textContent = `${fmt0(state.f * 100)} %`;
    }
  }

  function animateTo(target, ms = 1500) {
    cancelAnimationFrame(anim);
    if (reduceMotion) { setPh(target); return; }
    const from = state.ph;
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      setPh(from + (target - from) * e);
      if (k < 1) anim = requestAnimationFrame(tick);
    };
    anim = requestAnimationFrame(tick);
  }

  slider.addEventListener('input', () => { cancelAnimationFrame(anim); setPh(parseFloat(slider.value)); });

  /* ---- scroll-driven story ---------------------------------------------- */
  const steps = [...document.querySelectorAll('.sb-step')];
  if (steps.length && 'IntersectionObserver' in window) {
    const so = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        steps.forEach((s) => s.classList.toggle('is-active', s === e.target));
        animateTo(parseFloat(e.target.dataset.ph));
      }
    }, { rootMargin: '-40% 0px -40% 0px' });
    steps.forEach((s) => so.observe(s));
  }
  steps.forEach((s) => s.addEventListener('click', () => {
    steps.forEach((x) => x.classList.toggle('is-active', x === s));
    animateTo(parseFloat(s.dataset.ph));
  }));
  steps.forEach((s) => s.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.click(); }
  }));

  /* ---- target colouring ----------------------------------------------- */
  const modes = [...document.querySelectorAll('[data-mode]')];
  const setMode = (m) => {
    if (mol) mol.setMode(m);
    modes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    if (el.legendElec) el.legendElec.hidden = m !== 'elec';
  };
  modes.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  setMode('neutral');

  if (el.replay) {
    if (!binder || reduceMotion) el.replay.hidden = true;
    el.replay.addEventListener('click', () => replayCb && replayCb());
  }
  if (!binder) {
    document.querySelectorAll('[data-needs-3d]').forEach((n) => { n.hidden = true; });
  }

  setPh(state.ph);

  let lastGen = -2;
  return {
    get aggregation() { return state.u; },
    get protonation() { return state.f; },
    onReplay(cb) { replayCb = cb; },

    /** progress of the generation animation, or null when idle */
    setGeneration(g) {
      if (!el.gen) return;
      const key = g === null ? -1 : Math.round(g * 100);
      if (key === lastGen) return;
      lastGen = key;
      el.gen.hidden = g === null;
      if (g !== null) {
        const noise = Math.round((1 - g) * 100);
        el.genBar.style.width = `${Math.round(g * 100)}%`;
        el.genLabel.textContent = g < 0.35 ? `Bruit gaussien · ${noise} %`
          : g < 0.8 ? `Débruitage · ${noise} % de bruit` : `Structure émergente · ${noise} %`;
      }
    },

    /** Called every frame while the demonstration is on screen. */
    overlay({ a, b, cluster, target, u, k, pxPerAngstrom }) {
      const box = (tags.a || tags.target)?.parentElement?.getBoundingClientRect();
      if (!box) return;
      const put = (name, p, opacity) => {
        const t = tags[name];
        if (!t) return;
        t.style.opacity = opacity.toFixed(2);
        t.style.transform = `translate(${(p.x - box.left).toFixed(1)}px, ${(p.y - box.top).toFixed(1)}px)`;
      };
      put('a', a, 1 - smooth(0.25, 0.55, u));
      put('b', b, 1 - smooth(0.12, 0.40, u));
      put('cluster', cluster, smooth(0.8, 0.97, u));
      put('target', target, 0.9);
      if (el.scale) {
        el.scale.style.width = `${(20 * pxPerAngstrom).toFixed(1)}px`;
        el.scaleLabel.textContent = '2 nm';
      }
    },
  };
}
