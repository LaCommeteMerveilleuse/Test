// BlackPhage - la fabrique des objets lisses. À partir du champ de distance d'une forme et des cubes de cette même forme, elle sort un ou
// plusieurs maillages lisses (positions dans le repère de la forme, normales, couleurs, matières, phases d'impulsion). Maths pures :
// elle tourne dans un worker (mesh.worker.js), jamais sur le fil principal.
import { meshSDF, smoothMesh, vertexNormals, transferFromCubes, smoothAttr } from './mesher.js';

function part(name, pos, index, cubes, pitch, palette, baseTags = null) {
  const t = transferFromCubes(pos, cubes, pitch, palette, baseTags);
  const nv = pos.length / 3;
  smoothAttr(index, t.col, 3, nv, 1, 0.5);                      // les marches de la grille de cubes s'adoucissent sur le maillage
  smoothAttr(index, t.mat, 3, nv, 1, 0.5);
  return { name, pos, nrm: vertexNormals(pos, index), index, col: t.col, mat: t.mat, phase: t.phase };
}

/**
 * kind : 'brain' | 'robot' | 'split'. cubes : { pos, tag, phase?, cube, frame } (les cubes visibles de la forme, dans son repère final).
 * palette : un tableau [r, g, b] (sRGB 0..1) par étiquette. h : le pas du maillage.
 */
export async function buildSmooth(kind, cubes, palette, h) {
  if (kind === 'brain') {
    const m = await import('./shape-brain.js');
    const f = m.field();
    const mesh = meshSDF(f.sdf, f.bbox, h);
    smoothMesh(mesh.pos, mesh.index, 2, 0.5);
    const { cx, cy, cz, sc } = cubes.frame;
    const p = mesh.pos;
    const nv = p.length / 3; const baseTags = new Uint8Array(nv);
    for (let i = 0; i < nv; i++) baseTags[i] = f.tagAt(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);          // les lobes, exacts et nets, d'après le champ lui-même
    for (let i = 0; i < p.length; i += 3) { p[i] = (p[i] - cx) * sc; p[i + 1] = (p[i + 1] - cy) * sc; p[i + 2] = (p[i + 2] - cz) * sc; }
    return [part('brain', p, mesh.index, cubes, cubes.cube, palette, baseTags)];
  }
  if (kind === 'robot') {
    const m = await import('./shape-robot.js');
    const f = m.field(0.0125);
    const mesh = meshSDF(f.sdf, f.bbox, h);
    smoothMesh(mesh.pos, mesh.index, 1, 0.45);
    const yc = cubes.frame.yc;
    const p = mesh.pos;
    for (let i = 0; i < p.length; i += 3) p[i + 1] -= yc;
    return [part('robot', p, mesh.index, cubes, cubes.cube, palette)];
  }
  if (kind === 'split') {
    const m = await import('./shape-split.js');
    const K = cubes.frame.K;
    const out = [];
    for (const f of m.fields()) {
      const mesh = meshSDF(f.sdf, f.bbox, h);
      smoothMesh(mesh.pos, mesh.index, 2, 0.5);
      const p = mesh.pos;
      for (let i = 0; i < p.length; i += 3) { p[i] = f.cx + p[i] * K; p[i + 1] *= K; p[i + 2] *= K; }
      out.push(part(f.name, p, mesh.index, cubes, cubes.cube, palette));
    }
    return out;
  }
  throw new Error('forme lisse inconnue ' + kind);
}
