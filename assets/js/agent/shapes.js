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

/**
 * Charge les cinq formes. Une forme qui manque ou qui échoue est remplacée par la forme de secours.
 * overrides : { 0: '/chemin/vers/un-autre-module.js', ... } pour essayer une variante (labo).
 */
export async function loadShapes(n, seed = 1, overrides = {}) {
  const out = [];
  for (let k = 0; k < SHAPE_FILES.length; k++) {
    try {
      const m = await import(overrides[k] || `./${SHAPE_FILES[k]}`);
      const sh = m.default(n, seed + k);
      if (!sh || sh.pos.length !== 3 * n || sh.tag.length !== n) throw new Error('forme invalide');
      out.push(sh);
    } catch (e) {
      console.warn('forme de secours pour', SHAPE_NAMES[k], e && e.message);
      out.push(placeholder(n, seed, k));
    }
  }
  return out;
}
