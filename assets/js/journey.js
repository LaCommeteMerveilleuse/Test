// BlackPhage — "Our Goals" diagram.
// A Smart Binder is administered, travels through the organism in its folded,
// inactive form, then reaches a tissue whose microenvironment differs (here,
// more acidic): it changes conformation, lights up, and engages the pathogen
// present on site. Illustrative schematic — not experimental data.
const canvas = document.getElementById('journey');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const DESIGN = { w: 1000, h: 660 };

  // Vessel path through the organism, in design space.
  const PATH = [
    [112, 96], [168, 170], [196, 268], [268, 338], [370, 316], [452, 372],
    [540, 430], [634, 410], [700, 336], [768, 300], [838, 348],
  ];
  const TARGET = PATH[PATH.length - 1];

  const STATIONS = [
    { at: PATH[0], label: '01 · ADMINISTRATION', align: 'left', dy: -24 },
    { at: PATH[5], label: '02 · CIRCULATION', align: 'center', dy: 42 },
    { at: TARGET, label: '03 · SITE CIBLE · pH ACIDE', align: 'right', dy: -104 },
  ];

  const pathogens = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 + 0.6;
    return { x: TARGET[0] + Math.cos(a) * 50, y: TARGET[1] + Math.sin(a) * 38, a };
  });

  function catmull(points, t) {
    const n = points.length - 1;
    t = Math.min(Math.max(t, 0), 1);
    const i = Math.min(Math.floor(t * n), n - 1);
    const lt = t * n - i;
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, n)];
    const t2 = lt * lt;
    const t3 = t2 * lt;
    const f = (a, b, c, d) =>
      0.5 * ((2 * b) + (-a + c) * lt + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
  }

  let dpr = 1;
  let scale = 1;
  let offX = 0;
  let offY = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    scale = Math.min(rect.width / DESIGN.w, rect.height / DESIGN.h);
    offX = (rect.width - DESIGN.w * scale) / 2;
    offY = (rect.height - DESIGN.h * scale) / 2;
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const X = (x) => offX + x * scale;
  const Y = (y) => offY + y * scale;
  const S = (v) => Math.max(0.6, v * scale);
  const ease = (v) => { const c = Math.min(1, Math.max(0, v)); return c * c * (3 - 2 * c); };

  let t0 = null;
  let running = true;
  new IntersectionObserver((e) => { running = e[0].isIntersecting; }).observe(canvas);

  function organism(time) {
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const k = 1 + 0.014 * Math.sin(a * 3 + time * 0.0004) + 0.009 * Math.cos(a * 2 - time * 0.0003);
      ctx[i ? 'lineTo' : 'moveTo'](X(500 + Math.cos(a) * 432 * k), Y(300 + Math.sin(a) * 248 * k));
    }
    ctx.closePath();
  }

  // The binder: compact when closed, with an opening cleft once activated.
  function drawBinder(px, py, r, open, glow, time) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.sin(time * 0.0006) * 0.35);
    if (glow > 0.01) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 7);
      g.addColorStop(0, 'rgba(56, 242, 208, ' + (0.45 * glow) + ')');
      g.addColorStop(0.5, 'rgba(56, 242, 208, ' + (0.12 * glow) + ')');
      g.addColorStop(1, 'rgba(56, 242, 208, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const lobes = 1 + 0.1 * Math.sin(a * 3 + time * 0.0012);
      const da = Math.atan2(Math.sin(a), Math.cos(a));
      const cleft = 1 - open * 0.55 * Math.exp(-da * da * 4);
      const rr = r * lobes * cleft;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    const fill = ctx.createLinearGradient(-r, -r, r, r);
    fill.addColorStop(0, 'rgba(126, 140, 255, 0.95)');
    fill.addColorStop(1, glow > 0.3 ? 'rgba(56, 242, 208, 0.98)' : 'rgba(176, 190, 255, 0.85)');
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = S(1.4);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + 0.55 * glow) + ')';
    ctx.stroke();
    ctx.restore();
  }

  function label(text, x, y, align, color, size) {
    ctx.font = Math.max(8.5, (size || 11) * scale) + "px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (t0 === null) t0 = now;
    const cycle = reduce ? 26000 : 15000;
    if (!running) { t0 = now - Math.max(0, (now - t0) % cycle); return; }

    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const prog = (Math.max(0, now - t0) % cycle) / cycle;
    const travel = Math.min(1, Math.max(0, (prog - 0.10) / 0.38));
    const dwell = prog < 0.48 ? 0
      : prog < 0.86 ? Math.min(1, (prog - 0.48) / 0.08)
        : Math.max(0, 1 - (prog - 0.86) / 0.06);
    const alive = prog < 0.06 ? prog / 0.06 : prog > 0.95 ? (1 - prog) / 0.05 : 1;

    // --- organism boundary
    organism(now);
    const body = ctx.createRadialGradient(X(430), Y(280), 0, X(500), Y(300), 440 * scale);
    body.addColorStop(0, 'rgba(109, 123, 255, 0.06)');
    body.addColorStop(1, 'rgba(109, 123, 255, 0.012)');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.setLineDash([S(5), S(8)]);
    ctx.lineWidth = S(1);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.stroke();
    ctx.setLineDash([]);
    label('ORGANISME', X(500), Y(600), 'center', 'rgba(255,255,255,0.28)', 10.5);

    // --- vessel
    const pts = [];
    for (let i = 0; i <= 300; i++) pts.push(catmull(PATH, i / 300));
    ctx.lineCap = 'round';
    ctx.lineWidth = S(6);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    pts.forEach(function (pt, i) { ctx[i ? 'lineTo' : 'moveTo'](X(pt[0]), Y(pt[1])); });
    ctx.stroke();
    ctx.lineWidth = S(1.1);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.stroke();

    // travelled portion
    const grad = ctx.createLinearGradient(X(PATH[0][0]), Y(PATH[0][1]), X(TARGET[0]), Y(TARGET[1]));
    grad.addColorStop(0, 'rgba(109, 123, 255, 0.9)');
    grad.addColorStop(1, 'rgba(56, 242, 208, 0.9)');
    ctx.lineWidth = S(2);
    ctx.strokeStyle = grad;
    ctx.globalAlpha = alive;
    ctx.beginPath();
    const seg = Math.max(1, Math.round(travel * 300));
    for (let i = 0; i <= seg; i++) ctx[i ? 'lineTo' : 'moveTo'](X(pts[i][0]), Y(pts[i][1]));
    ctx.stroke();
    ctx.globalAlpha = 1;

    // flow ticks
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (let k = 0; k < 28; k++) {
      const tt = ((k / 28) + ((now * 0.00004) % 1)) % 1;
      const pt = catmull(PATH, tt);
      ctx.beginPath();
      ctx.arc(X(pt[0]), Y(pt[1]), S(1.3), 0, Math.PI * 2);
      ctx.fill();
    }

    // --- ingestion arrow
    const ex = X(PATH[0][0]);
    const ey = Y(PATH[0][1]);
    ctx.strokeStyle = 'rgba(176, 190, 255, 0.4)';
    ctx.lineWidth = S(1.2);
    ctx.setLineDash([S(4), S(5)]);
    ctx.beginPath();
    ctx.moveTo(X(24), Y(24));
    ctx.lineTo(ex - S(11), ey - S(11));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(ex, ey, S(4.5), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(176, 190, 255, 0.85)';
    ctx.fill();

    // --- target microenvironment
    const tx = X(TARGET[0]);
    const ty = Y(TARGET[1]);
    const zr = 94 * scale * (1 + 0.025 * Math.sin(now * 0.0012));
    const zg = ctx.createRadialGradient(tx, ty, 0, tx, ty, zr);
    zg.addColorStop(0, 'rgba(255, 90, 138, ' + (0.2 + 0.14 * dwell) + ')');
    zg.addColorStop(1, 'rgba(255, 90, 138, 0)');
    ctx.fillStyle = zg;
    ctx.beginPath();
    ctx.arc(tx, ty, zr, 0, Math.PI * 2);
    ctx.fill();
    ctx.setLineDash([S(4), S(6)]);
    ctx.lineWidth = S(1);
    ctx.strokeStyle = 'rgba(255, 90, 138, ' + (0.32 + 0.3 * dwell) + ')';
    ctx.beginPath();
    ctx.arc(tx, ty, zr * 0.74, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (dwell > 0.2) {
      const pr = (now * 0.00035) % 1;
      ctx.strokeStyle = 'rgba(56, 242, 208, ' + ((1 - pr) * 0.5 * dwell) + ')';
      ctx.lineWidth = S(1.4);
      ctx.beginPath();
      ctx.arc(tx, ty, zr * 0.3 + pr * zr * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- pathogens on site
    pathogens.forEach(function (p, i) {
      const engaged = ease((dwell - 0.25 - i * 0.12) / 0.3);
      const px = X(p.x + Math.cos(now * 0.0006 + p.a) * 6);
      const py = Y(p.y + Math.sin(now * 0.0005 + p.a * 1.7) * 6);
      const r = S(8) * (1 - 0.72 * engaged);
      ctx.lineWidth = S(1);
      ctx.strokeStyle = 'rgba(255, 120, 160, ' + (0.55 * (1 - engaged) + 0.08) + ')';
      for (let s = 0; s < 7; s++) {
        const a = (s / 7) * Math.PI * 2 + now * 0.0004;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * r, py + Math.sin(a) * r);
        ctx.lineTo(px + Math.cos(a) * r * 1.65, py + Math.sin(a) * r * 1.65);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 90, 138, ' + (0.3 * (1 - engaged) + 0.05) + ')';
      ctx.fill();
      ctx.stroke();
    });

    // --- stations
    STATIONS.forEach(function (st, i) {
      const sx = X(st.at[0]);
      const sy = Y(st.at[1]);
      const reached = i === 0 ? alive : i === 1 ? Math.min(1, travel / 0.55) : dwell;
      ctx.beginPath();
      ctx.arc(sx, sy, S(3.5), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.5 * reached) + ')';
      ctx.fill();
      label(st.label, sx, sy + st.dy * scale, st.align,
        i === 2 ? 'rgba(255, 150, 180, ' + (0.45 + 0.45 * reached) + ')'
          : 'rgba(255,255,255,' + (0.3 + 0.4 * reached) + ')');
    });

    // --- state caption
    label(travel < 0.98 ? 'FORME REPLIÉE · SITE DE LIAISON MASQUÉ'
      : 'CHANGEMENT DE CONFORMATION · SITE EXPOSÉ',
      X(500), Y(44), 'center',
      travel < 0.98 ? 'rgba(176, 190, 255, 0.55)' : 'rgba(56, 242, 208, 0.85)', 11);

    // --- the binder
    const b = catmull(PATH, travel);
    ctx.globalAlpha = alive;
    drawBinder(X(b[0]), Y(b[1]), S(17), ease(dwell), dwell, now);
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(frame);
}
