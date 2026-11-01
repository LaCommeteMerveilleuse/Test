// BlackPhage - la fabrique des objets lisses. À partir du champ de distance d'une forme et des cubes de cette même forme, elle sort un ou
// plusieurs maillages lisses (positions dans le repère de la forme, normales, couleurs, matières, phases d'impulsion). Maths pures :
// elle tourne dans un worker (mesh.worker.js), jamais sur le fil principal.
import { meshSDF, smoothMesh, vertexNormals, transferFromCubes, smoothAttr } from './mesher.js';
import { pickSources, makeFibers } from './brain-fibers.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
// les teintes du tissu, par lobe (clair sur les crêtes, plus foncé dans les sillons) : discrètes, réalistes
const BRAIN_TINT = { 6: '#e8ecee', 7: '#cfd3d8', 8: '#d3d9e3', 9: '#aeb9c9', 10: '#e8d9c8', 11: '#c8b199', 12: '#d0ddd3', 13: '#a8bdaf', 14: '#d2e0df', 15: '#a4c0be', 16: '#e8d7b5', 17: '#c4ab82' };

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
    const weak = h >= 0.019;
    const mesh = meshSDF(f.sdf, f.bbox, h);
    smoothMesh(mesh.pos, mesh.index, 2, 0.5);
    const p = mesh.pos; const nv = p.length / 3;
    const nrm = vertexNormals(p, mesh.index);
    const col = new Float32Array(nv * 3); const ao = new Float32Array(nv);
    const ds = [0.02, 0.05, 0.1]; const ws = [0.5, 0.3, 0.2];
    for (let i = 0; i < nv; i++) {
      const x = p[i * 3]; const y = p[i * 3 + 1]; const z = p[i * 3 + 2];
      const c = hexRgb(BRAIN_TINT[f.tagAt(x, y, z)] || '#d8d2d0');
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      let occ = 0;
      for (let q = 0; q < 3; q++) occ += ws[q] * clamp01((ds[q] - f.sdf(x + nrm[i * 3] * ds[q], y + nrm[i * 3 + 1] * ds[q], z + nrm[i * 3 + 2] * ds[q])) / ds[q]);
      ao[i] = 1 - clamp01(occ * 1.15);
    }
    const src = pickSources(p);
    const fibers = makeFibers({ pos: p, nrm, sdf: f.sdf, src }, 5, weak ? 0.5 : 1);
    // dans le repère final de la forme (le même que celui des cubes)
    const { cx, cy, cz, sc } = cubes.frame;
    for (let i = 0; i < p.length; i += 3) { p[i] = (p[i] - cx) * sc; p[i + 1] = (p[i + 1] - cy) * sc; p[i + 2] = (p[i + 2] - cz) * sc; }
    const sg = fibers.seg;
    for (let k = 0; k < fibers.count; k++) {
      for (const o of [0, 3]) { sg[k * 8 + o] = (sg[k * 8 + o] - cx) * sc; sg[k * 8 + o + 1] = (sg[k * 8 + o + 1] - cy) * sc; sg[k * 8 + o + 2] = (sg[k * 8 + o + 2] - cz) * sc; }
    }
    for (let k = 0; k < 6; k++) { src.pos[k * 3] = (src.pos[k * 3] - cx) * sc; src.pos[k * 3 + 1] = (src.pos[k * 3 + 1] - cy) * sc; src.pos[k * 3 + 2] = (src.pos[k * 3 + 2] - cz) * sc; }
    return [{ name: 'brain', pos: p, nrm, index: mesh.index, col, ao, fibers, src }];
  }
  if (kind === 'robot') {
    const m = await import('./shape-robot.js');
    const { refineBoundaries } = await import('./refine.js');
    const model = m.smoothModel();
    const sdf = model.sdf;
    const mesh = meshSDF(sdf, model.bbox, h);
    smoothMesh(mesh.pos, mesh.index, 1, 0.45);
    const nBase = mesh.pos.length / 3;
    const nrm0 = vertexNormals(mesh.pos, mesh.index);
    // la normale exacte : le gradient du champ de distance (sans les marbrures de la grille), les fins liserés métalliques restent nets
    const gradN = (x, y, z, e, out, o) => {
      const gx = sdf(x + e, y, z) - sdf(x - e, y, z); const gy = sdf(x, y + e, z) - sdf(x, y - e, z); const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
      const gl = Math.hypot(gx, gy, gz);
      if (gl < 1e-9) return false;
      out[o] = gx / gl; out[o + 1] = gy / gl; out[o + 2] = gz / gl; return true;
    };
    // les frontières entre deux matières : les triangles qui les touchent sont recoupés une fois (le pas local y est deux fois plus fin)
    const tmp = [0, 0, 0]; const tn = new Float32Array(3);
    const pure = new Int16Array(nBase).fill(-1);                    // la matière des sommets d'origine qui ne touchent aucune frontière
    const touches = (i, pp, hl) => {
      const x = pp[i * 3]; const y = pp[i * 3 + 1]; const z = pp[i * 3 + 2];
      if (i < nBase) { tn[0] = nrm0[i * 3]; tn[1] = nrm0[i * 3 + 1]; tn[2] = nrm0[i * 3 + 2]; } else if (!gradN(x, y, z, 0.3 * hl, tn, 0)) { tn[0] = 0; tn[1] = 1; tn[2] = 0; }
      model.blendAt(x, y, z, tn[0], tn[1], tn[2], 1.2 * hl, tmp);
      if (tmp[2] > 0) return true;
      if (i < nBase) pure[i] = tmp[0];
      return false;
    };
    const ref = refineBoundaries(mesh.pos, mesh.index, sdf, h, touches, 1);
    const p = ref.pos; const nv = p.length / 3; const level = ref.level;
    const nrm = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {
      if (!gradN(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], 0.3 * h / (1 << level[i]), nrm, i * 3)) { if (i < nBase) { nrm[i * 3] = nrm0[i * 3]; nrm[i * 3 + 1] = nrm0[i * 3 + 1]; nrm[i * 3 + 2] = nrm0[i * 3 + 2]; } else nrm[i * 3 + 1] = 1; }
    }
    const F = model.features.map((f) => ({ rgb: hexRgb(f.color), metal: f.metal, rough: f.rough, em: f.emissive, coat: f.coat === undefined ? 1 : f.coat }));
    const col = new Float32Array(nv * 3); const mat4 = new Float32Array(nv * 4); const part = new Float32Array(nv); const glow = new Float32Array(nv);
    for (let i = 0; i < nv; i++) {
      const x = p[i * 3]; const y = p[i * 3 + 1]; const z = p[i * 3 + 2]; const nx = nrm[i * 3]; const ny = nrm[i * 3 + 1]; const nz = nrm[i * 3 + 2];
      if (i < nBase && pure[i] >= 0) { tmp[0] = pure[i]; tmp[1] = pure[i]; tmp[2] = 0; }
      else model.blendAt(x, y, z, nx, ny, nz, h / (1 << level[i]), tmp);   // la matière, au pas local : des bords nets, sans escalier
      const A = F[tmp[0]] || F[0]; const B = F[tmp[1]] || A; const t = tmp[2]; const s0 = 1 - t;
      const em = A.em * s0 + B.em * t;
      const ao = model.aoAt(x, y, z, nx, ny, nz);
      const aoF = 1 - 0.8 * (1 - ao) * (1 - Math.min(1, em));          // l'occlusion assombrit les creux, pas ce qui brille
      for (let c = 0; c < 3; c++) col[i * 3 + c] = (A.rgb[c] * s0 + B.rgb[c] * t) * aoF;
      mat4[i * 4] = A.metal * s0 + B.metal * t; mat4[i * 4 + 1] = A.rough * s0 + B.rough * t; mat4[i * 4 + 2] = em; mat4[i * 4 + 3] = A.coat * s0 + B.coat * t;
      part[i] = model.partAt(x, y, z);
      glow[i] = model.glowAt(x, y, z);
    }
    return [{ name: 'robot', pos: p, nrm, index: ref.index, col, mat4, part, glow, parts: model.parts, refined: nv - nBase }];
  }
  throw new Error('forme lisse inconnue ' + kind);
}
