// BlackPhage - le worker des maillages lisses. Il reçoit { id, kind, cubes, palette, h } et rend la liste des morceaux de maillage.
// Les tableaux rendus sont transférés, pas copiés.
import { buildSmooth } from './smooth-build.js';

self.onmessage = async (e) => {
  const { id, kind, cubes, palette, h } = e.data;
  try {
    const t0 = performance.now();
    const parts = await buildSmooth(kind, cubes, palette, h);
    const transfer = [];
    for (const p of parts) transfer.push(p.pos.buffer, p.nrm.buffer, p.index.buffer, p.col.buffer, p.mat.buffer, p.phase.buffer);
    self.postMessage({ id, kind, parts, ms: performance.now() - t0 }, transfer);
  } catch (err) {
    self.postMessage({ id, kind, error: String(err && err.message ? err.message : err) });
  }
};
