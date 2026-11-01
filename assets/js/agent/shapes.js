// BlackPhage - les formes de l'agent. Chaque forme est un module qui exporte par défaut build(n, seed) et retourne
//   { pos: Float32Array(3 * n), tag: Uint8Array(n), cube: number, extent: [ex, ey, ez] }
// pos : les centres des n cubes, dans le repère de la forme (y vers le haut, z vers la caméra), la forme tient dans |x| <= ex, etc.
// tag : 0 gris clair, 1 gris moyen, 2 gris sombre, 3 Timber Glow (lumineux), 4 Deep Canyon Blue, 5 Shadow Pine, 6 blanc, 7 Cliff Mist
// cube : l'arête d'un cube dans ce repère, pour que les cubes voisins se touchent.
export const SHAPE_FILES = ['shape-brain.js', 'shape-split.js', 'shape-robot.js', 'shape-ligand.js', 'shape-stream.js'];
export const SHAPE_NAMES = ['brain', 'split', 'robot', 'ligand', 'stream'];

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/** Forme de secours : une sphère creuse de cubes. */
export function placeholder(n, seed = 1, k = 0) {
  const r = rng(seed + k);
  const pos = new Float32Array(3 * n); const tag = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1; const a = r() * Math.PI * 2; const q = Math.sqrt(1 - u * u);
    pos[i * 3] = q * Math.cos(a) * 0.9; pos[i * 3 + 1] = u * 0.9; pos[i * 3 + 2] = q * Math.sin(a) * 0.9;
    tag[i] = i % 11 === 0 ? 3 : (i % 5);
  }
  return { pos, tag, cube: Math.sqrt((4 * Math.PI * 0.81) / n) * 1.1, extent: [1, 1, 1] };
}

/** Complète une forme de M cubes jusqu'à n entrées. Les cubes en réserve (au centre de la forme, invisibles) ne naissent qu'en vol. */
export function padShape(sh, n, seed = 1) {
  const M = sh.tag.length;
  if (M >= n) return { ...sh, count: n };
  const pos = new Float32Array(3 * n); pos.set(sh.pos);
  const tag = new Uint8Array(n); tag.set(sh.tag);
  let cx = 0; let cy = 0; let cz = 0;
  for (let i = 0; i < M; i++) { cx += sh.pos[i * 3]; cy += sh.pos[i * 3 + 1]; cz += sh.pos[i * 3 + 2]; }
  cx /= M; cy /= M; cz /= M;
  const r = rng(seed * 7 + 3);
  for (let i = M; i < n; i++) { pos[i * 3] = cx + (r() - 0.5) * 0.2; pos[i * 3 + 1] = cy + (r() - 0.5) * 0.2; pos[i * 3 + 2] = cz + (r() - 0.5) * 0.2; }
  let phase;
  if (sh.phase) { phase = new Float32Array(n).fill(-1); phase.set(sh.phase); }
  return { ...sh, pos, tag, phase, count: M };
}

/**
 * Charge les cinq formes. Une forme qui manque ou qui échoue est remplacée par la forme de secours.
 * n : le nombre total de cubes du moteur ; M : combien en montrent les formes (de gros cubes), les autres restent en réserve.
 * overrides : { 0: '/chemin/vers/un-autre-module.js', ... } pour essayer une variante (labo).
 */
export async function loadShapes(n, seed = 1, overrides = {}, M = n) {
  const out = [];
  for (let k = 0; k < SHAPE_FILES.length; k++) {
    const Mk = Math.min(Array.isArray(M) ? M[k] : M, n);        // M peut être un tableau : un nombre de cubes visibles par forme
    let sh;
    try {
      const m = await import(overrides[k] || `./${SHAPE_FILES[k]}`);
      sh = m.default(Mk, seed + k);
      if (!sh || sh.pos.length !== 3 * Mk || sh.tag.length !== Mk) throw new Error('forme invalide');
    } catch (e) {
      console.warn('forme de secours pour', SHAPE_NAMES[k], e && e.message);
      sh = placeholder(Mk, seed, k);
    }
    out.push(padShape(sh, n, seed + k));
  }
  return out;
}
