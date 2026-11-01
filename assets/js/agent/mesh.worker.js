// BlackPhage - le worker des maillages lisses. Il reçoit { id, kind, cubes, palette, h } et rend la liste des morceaux de maillage.
// Les tableaux rendus sont transférés, pas copiés.
import { buildSmooth } from './smooth-build.js';

self.onmessage = async (e) => {
  const { id, kind, cubes, palette, h } = e.data;
  try {
    const t0 = performance.now();
    const parts = await buildSmooth(kind, cubes, palette, h);
    const transfer = [];
    const collect = (o) => { for (const v of Object.values(o)) { if (ArrayBuffer.isView(v)) transfer.push(v.buffer); else if (v && typeof v === 'object') collect(v); } };
    for (const p of parts) collect(p);
    self.postMessage({ id, kind, parts, ms: performance.now() - t0 }, transfer);
  } catch (err) {
    self.postMessage({ id, kind, error: String(err && err.message ? err.message : err) });
  }
};
