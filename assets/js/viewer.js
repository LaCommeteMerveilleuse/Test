// BlackPhage — interactive "Smart Binder" demonstration: pH control, readouts, chart, overlays.
import { protonated, netCharge, closingFromPh, COMPARTMENTS, HIS_PKA, fmt0, fmt1 } from './chem.js';

const SVG = 'http://www.w3.org/2000/svg';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

export function initViewer(mol) {
  const slider = $('ph');
  if (!slider) return null;

  const meta = mol.meta;
  const lid = meta.domains.find((d) => d.name === 'LID');
  const nHis = meta.histidines.length;
  const el = {
    value: $('ph-value'), his: $('m-his'), hisSub: $('m-his-sub'), charge: $('m-charge'),
    lid: $('m-lid'), lidSub: $('m-lid-sub'), site: $('m-site'), siteSub: $('m-site-sub'),
    tag: $('site-tag'), scale: $('scalebar'), scaleLabel: $('scalebar-label'),
  };

  const state = { ph: parseFloat(slider.value), closing: 0, protonation: 0 };
  let anim = 0;

  /* ---- chart: net charge vs pH ---------------------------------------- */
  const chart = $('chart');
  const C = { x0: 44, x1: 468, y0: 14, y1: 168, pmin: 4.5, pmax: 9.0 };
  let marker; let markerLine; let markerLabel;
  const curve = [];
  for (let p = C.pmin; p <= C.pmax + 1e-9; p += 0.1) curve.push([p, netCharge(p, meta.composition)]);
  const qmin = Math.floor(Math.min(...curve.map((c) => c[1])) / 2) * 2;
  const qmax = Math.ceil(Math.max(...curve.map((c) => c[1])) / 2) * 2;
  const X = (p) => C.x0 + ((p - C.pmin) / (C.pmax - C.pmin)) * (C.x1 - C.x0);
  const Y = (q) => C.y1 - ((q - qmin) / (qmax - qmin)) * (C.y1 - C.y0);

  if (chart) {
    const add = (name, attrs, parent = chart, text) => {
      const n = document.createElementNS(SVG, name);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      if (text != null) n.textContent = text;
      parent.appendChild(n);
      return n;
    };
    for (const c of COMPARTMENTS) {
      add('rect', { x: X(c.from), y: C.y0, width: Math.max(2, X(c.to) - X(c.from)), height: C.y1 - C.y0, class: `zone zone--${c.id}` });
    }
    for (let q = qmin; q <= qmax; q += 2) {
      add('line', { x1: C.x0, x2: C.x1, y1: Y(q), y2: Y(q), class: q === 0 ? 'axis axis--zero' : 'grid' });
      add('text', { x: C.x0 - 8, y: Y(q) + 4, class: 'tick', 'text-anchor': 'end' }, chart, fmt0(q));
    }
    for (let p = 5; p <= 9; p += 1) {
      add('text', { x: X(p), y: C.y1 + 18, class: 'tick', 'text-anchor': 'middle' }, chart, String(p));
    }
    add('text', { x: C.x1, y: C.y1 + 34, class: 'tick tick--title', 'text-anchor': 'end' }, chart, 'pH');
    add('text', { x: C.x0 - 8, y: C.y0 - 3, class: 'tick tick--title', 'text-anchor': 'end' }, chart, 'e');
    add('path', { d: curve.map(([p, q], i) => `${i ? 'L' : 'M'}${X(p).toFixed(1)} ${Y(q).toFixed(1)}`).join(''), class: 'curve' });
    markerLine = add('line', { y1: C.y0, y2: C.y1, class: 'marker-line' });
    marker = add('circle', { r: 5, class: 'marker' });
    markerLabel = add('text', { class: 'marker-label', 'text-anchor': 'middle' });
  }

  /* ---- state -> UI -------------------------------------------------------- */
  function siteState(u) {
    if (u <= 0.22) return ['Accessible', 'charnière ouverte'];
    if (u <= 0.62) return ['Partiellement exposé', 'charnière en mouvement'];
    return ['Masqué', 'charnière fermée'];
  }

  function setPh(v) {
    state.ph = v;
    state.protonation = protonated(v, HIS_PKA);
    state.closing = closingFromPh(v);
    const q = netCharge(v, meta.composition);
    const [site, siteSub] = siteState(state.closing);

    slider.value = String(v);
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    slider.style.setProperty('--pos', `${((v - min) / (max - min)) * 100}%`);
    slider.setAttribute('aria-valuetext', `pH ${fmt1(v)} — site de liaison ${site.toLowerCase()}`);

    el.value.textContent = fmt1(v);
    el.his.textContent = `${fmt0(state.protonation * 100)} %`;
    el.hisSub.textContent = `des ${nHis} histidines · pKa ${fmt1(HIS_PKA)}`;
    el.charge.textContent = `${fmt1(q)} e`;
    el.lid.textContent = `${fmt0(state.closing * lid.angleDeg)}°`;
    el.lidSub.textContent = `sur ${fmt0(lid.angleDeg)}° de fermeture complète`;
    el.site.textContent = site;
    el.siteSub.textContent = siteSub;
    el.site.dataset.state = state.closing <= 0.22 ? 'open' : state.closing <= 0.62 ? 'mid' : 'closed';

    if (marker) {
      const cx = X(Math.min(C.pmax, Math.max(C.pmin, v)));
      marker.setAttribute('cx', cx);
      marker.setAttribute('cy', Y(q));
      markerLine.setAttribute('x1', cx);
      markerLine.setAttribute('x2', cx);
      markerLabel.setAttribute('x', cx);
      markerLabel.setAttribute('y', Y(q) - 11);
      markerLabel.textContent = `${fmt1(q)} e`;
    }
  }

  function animateTo(target, ms = 1300) {
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
    steps.forEach((s) => s.addEventListener('click', () => {
      steps.forEach((x) => x.classList.toggle('is-active', x === s));
      animateTo(parseFloat(s.dataset.ph));
    }));
  }

  /* ---- colouring modes -------------------------------------------------- */
  const modes = [...document.querySelectorAll('[data-mode]')];
  const legends = [...document.querySelectorAll('[data-legend]')];
  const setMode = (m) => {
    mol.setMode(m);
    modes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    legends.forEach((l) => { l.hidden = l.dataset.legend !== m; });
  };
  modes.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  setMode('elec');

  setPh(state.ph);

  return {
    get closing() { return state.closing; },
    get protonation() { return state.protonation; },
    /** Called every frame while the viewer is on screen. */
    overlay(_rect, sx, sy, facing, pxPerAngstrom) {
      if (el.tag) {
        const rect = el.tag.parentElement.getBoundingClientRect();
        const show = Math.max(0, Math.min(1, (1 - state.closing) * 2.4 - 0.25)) * (facing > 0.1 ? 1 : 0);
        el.tag.style.opacity = show.toFixed(2);
        el.tag.style.transform = `translate(${(sx - rect.left).toFixed(1)}px, ${(sy - rect.top).toFixed(1)}px)`;
      }
      if (el.scale) {
        el.scale.style.width = `${(20 * pxPerAngstrom).toFixed(1)}px`;
        el.scaleLabel.textContent = '2 nm';
      }
    },
  };
}
