// BlackPhage - le robot, variante 2 : « l'assistant de labo ».
// Mascotte élégante et mécanique : grosse tête carrée aux angles ronds et aux plaques en couches (bandeau, visière, mâchoire),
// large visière sombre avec deux yeux chauds et un sourire, antenne à perle lumineuse, oreilles et collier bleus, torse compact
// avec un cœur lumineux dans un panneau bleu, rotules aux épaules, mains qui flottent (l'une salue), tuyère qui laisse quelques
// braises, anneau fin en orbite avec ses satellites. Elle regarde +z, la tête légèrement penchée.
//
// Méthode : le robot est une réunion de pièces à distance signée (maths pures, aucune dépendance). On échantillonne un
// réseau de voxels de pas v (centres sur des multiples entiers de v) et on garde les n voxels les plus proches de la
// surface, vers l'intérieur : une coque de 3 à 5 voxels, pleine à l'œil (le moteur fait trembler chaque cube d'environ 0,012
// et varie sa taille de 10 %, la coque doit donc être assez épaisse pour qu'on ne voie jamais à travers). v est trouvé par
// itération pour que la coque contienne n voxels. Chaque pièce choisit aussi l'étiquette (la couleur) de ses voxels.
// Les détails fins (reflets dans les yeux, trappes, vents, sillons doubles) n'apparaissent qu'avec beaucoup de cubes.
// Repère : y vers le haut, +z vers la caméra, x vers la droite. Étiquettes : 0 gris clair, 1 gris moyen, 2 gris sombre,
// 3 Timber Glow (lumineux), 4 Deep Canyon Blue, 5 Shadow Pine, 6 blanc, 7 Cliff Mist.

const { abs, sqrt, max, min, sin, cos, floor, round, atan2, PI } = Math;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------- bruit ----------
function hash(ix, iy, iz, s) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(iz | 0, 1442695041) ^ Math.imul(s | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise3(x, y, z, s) {
  const ix = floor(x), iy = floor(y), iz = floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iy, iz, s), b = hash(ix + 1, iy, iz, s), c = hash(ix, iy + 1, iz, s), d = hash(ix + 1, iy + 1, iz, s);
  const e = hash(ix, iy, iz + 1, s), f = hash(ix + 1, iy, iz + 1, s), g = hash(ix, iy + 1, iz + 1, s), h = hash(ix + 1, iy + 1, iz + 1, s);
  const x0 = a + (b - a) * fx, x1 = c + (d - c) * fx, x2 = e + (f - e) * fx, x3 = g + (h - g) * fx;
  const y0 = x0 + (x1 - x0) * fy, y1 = x2 + (x3 - x2) * fy;
  return y0 + (y1 - y0) * fz;
}

// ---------- distances signées ----------
function sdBox(x, y, z, bx, by, bz, r) {
  const qx = abs(x) - bx + r, qy = abs(y) - by + r, qz = abs(z) - bz + r;
  const mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0, mz = qz > 0 ? qz : 0;
  const inner = qx > qy ? (qx > qz ? qx : qz) : (qy > qz ? qy : qz);
  return sqrt(mx * mx + my * my + mz * mz) + (inner < 0 ? inner : 0) - r;
}
function sdRR(x, y, bx, by, r) {
  const qx = abs(x) - bx + r, qy = abs(y) - by + r;
  const mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0;
  const inner = qx > qy ? qx : qy;
  return sqrt(mx * mx + my * my) + (inner < 0 ? inner : 0) - r;
}
function sdCap(x, y, z, ax, ay, az, bx, by, bz, r) {
  const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return sqrt(dx * dx + dy * dy + dz * dz) - r;
}
function sdCylY(x, y, z, rad, hh, rr) {          // cylindre arrondi, axe y
  const dx = sqrt(x * x + z * z) - rad + rr, dy = abs(y) - hh + rr;
  const mx = dx > 0 ? dx : 0, my = dy > 0 ? dy : 0;
  return sqrt(mx * mx + my * my) + min(max(dx, dy), 0) - rr;
}
function sdTorus(x, y, z, R, r) { const q = sqrt(x * x + z * z) - R; return sqrt(q * q + y * y) - r; }

// ---------- repères ----------
// R = Rz * Ry * Rx (local -> monde). On garde la transposée pour passer du monde au local.
function rotation(rx, ry, rz) {
  const a = cos(rx), b = sin(rx), c = cos(ry), d = sin(ry), e = cos(rz), f = sin(rz);
  return [e * c, e * d * b - f * a, e * d * a + f * b, f * c, f * d * b + e * a, f * d * a - e * b, -d, c * b, c * a];
}
function frame(ox, oy, oz, rx, ry, rz) {
  const R = rotation(rx, ry, rz);
  return { ox, oy, oz, R, m: [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]] };
}
// repère dont l'origine locale est à `off` (en local) d'un pivot donné dans le monde
function frameAround(px, py, pz, off, rx, ry, rz) {
  const R = rotation(rx, ry, rz);
  const f = frame(0, 0, 0, rx, ry, rz);
  f.ox = px + R[0] * off[0] + R[1] * off[1] + R[2] * off[2];
  f.oy = py + R[3] * off[0] + R[4] * off[1] + R[5] * off[2];
  f.oz = pz + R[6] * off[0] + R[7] * off[1] + R[8] * off[2];
  return f;
}
let LX = 0, LY = 0, LZ = 0, TAG = 0;
function toLocal(F, x, y, z) {
  const dx = x - F.ox, dy = y - F.oy, dz = z - F.oz, m = F.m;
  LX = m[0] * dx + m[1] * dy + m[2] * dz; LY = m[3] * dx + m[4] * dy + m[5] * dz; LZ = m[6] * dx + m[7] * dy + m[8] * dz;
}

// ---------- le robot ----------
// v : le pas des voxels ; lod : le pas attendu (sert à choisir le niveau de détail, constant pendant la recherche de v)
function makeParts(v, lod, seed) {
  const parts = [];
  const fine = lod < 0.03;                                    // beaucoup de voxels : on peut graver des détails fins
  const mg = 5.4 * v + 0.06;                                  // marge des boîtes englobantes : épaisseur de coque + reliefs
  const S = (nom, k) => (nom > k * v ? nom : k * v);          // une taille, mais d'au moins k voxels
  const dmax = 5.4 * v + 0.05;                                // au-delà, inutile de calculer les étiquettes
  const vh = (x, y, z, s) => hash(round(x / v), round(y / v), round(z / v), seed * 7 + s);   // un nombre par voxel
  const add = (F, lo, hi, ev) => {
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let c = 0; c < 8; c++) {
      const lx = c & 1 ? hi[0] : lo[0], ly = c & 2 ? hi[1] : lo[1], lz = c & 4 ? hi[2] : lo[2];
      let wx = lx, wy = ly, wz = lz;
      if (F) { const R = F.R; wx = F.ox + R[0] * lx + R[1] * ly + R[2] * lz; wy = F.oy + R[3] * lx + R[4] * ly + R[5] * lz; wz = F.oz + R[6] * lx + R[7] * ly + R[8] * lz; }
      if (wx < x0) x0 = wx; if (wx > x1) x1 = wx; if (wy < y0) y0 = wy; if (wy > y1) y1 = wy; if (wz < z0) z0 = wz; if (wz > z1) z1 = wz;
    }
    parts.push({ x0: x0 - mg, x1: x1 + mg, y0: y0 - mg, y1: y1 + mg, z0: z0 - mg, z1: z1 + mg, ev });
  };

  // teinte des plaques claires (6 blanc, 0 gris clair, 7 brume) : un dégradé doux, un peu de bruit, un tramage fin
  const plate = (x, y, z, a, off, k) => {
    const nz = noise3(x * 2.6 + 11, y * 2.6, z * 2.6, seed + k);
    const s = 0.5 + a + off + 0.16 * (nz - 0.5) + 0.08 * (vh(x, y, z, k) - 0.5);
    return s > 0.56 ? 6 : s > 0.26 ? 0 : 7;
  };

  // ===== la tête =====
  const HX = 0.56, HY = 0.46, HZ = 0.43, HR = 0.25;           // demi-dimensions et rayon des angles
  const FH = frameAround(0, -0.08, 0, [0, HY, 0], 0.035, -0.07, 0.14);   // inclinaison charmante : tangage, lacet, roulis
  const step = (fine ? 2 : 1) * v;                            // le recouvrement des plaques
  const lipUp = 0.215, lipLo = -0.335;                        // arêtes du bandeau et de la mâchoire
  const lowF = sstep(0.03, 0.062, lod);
  const EAX = HX + 0.012, EAY = -0.06, ERAD = 0.2, ELEN = 0.09;      // les oreilles
  const BROW = 4, BEZ = 2;                                    // couleur du liseré au-dessus de la visière (4 bleu ; 1 pour un gris discret), du cadre de la visière
  const SW = (fine ? 0.95 : 0.5) * v;                         // demi-largeur d'un sillon : deux voxels, ou un seul
  const VY = -0.065, VW = 0.46, VH = 0.228 + 0.01 * lowF, VR = 0.17;   // la visière
  const BZ = fine ? S(0.04, 1.2) : 1.05 * v;                  // l'épaisseur du cadre de la visière
  const EW = fine ? 0.105 : 0.092, EH = fine ? 0.135 : 0.128, EXC = fine ? 0.245 : 0.26, EY = VY + (fine ? 0.04 : 0.012);   // les yeux
  const MW = fine ? 0.105 : 1.5 * v, MT = fine ? max(0.014, 1.1 * v) : 0.5 * v, MK = fine ? 7.5 : 1 / v;
  const mouthY = fine ? VY - 0.13 : EY - 1.9 * v;             // beaucoup de cubes : un sourire sous les yeux ; peu de cubes : entre les yeux
  // à basse résolution, la bouche est posée sur le réseau du monde : une petite coupe de trois voxels, nette malgré l'inclinaison
  const mw = (() => { const R = FH.R, oy = mouthY, oz = HZ; return [FH.ox + R[1] * oy + R[2] * oz, FH.oy + R[4] * oy + R[5] * oz]; })();
  const MXW = round(mw[0] / v) * v, MYW = round(mw[1] / v) * v;
  add(FH, [-HX - 0.1, -HY - 0.1, -HZ - 0.1], [HX + 0.1, HY + 0.1, HZ + 0.1], (x, y, z) => {
    toLocal(FH, x, y, z);
    const lx = LX, ly = LY, lz = LZ;
    let d = sdBox(lx, ly, lz, HX, HY, HZ, HR);
    let sect = ly > lipUp ? 0 : ly < lipLo ? 2 : 1;
    if (step > 0) {
      const big = sdBox(lx, ly, lz, HX + step, HY + step, HZ + step, HR + step);
      const dc = max(big, lipUp - ly), dj = max(big, ly - lipLo);
      if (dc < d) { d = dc; sect = 0; }
      if (dj < d) { d = dj; sect = 2; }
    }
    if (d > 0.07 || d < -dmax) { TAG = 0; return d; }
    let t = -1, rel = 0;
    if (lz > 0.05) {
      const rr = sdRR(lx, ly - VY, VW, VH, VR);
      if (rr < 0) {
        if (rr > -BZ) { t = BEZ; rel = step > 0 ? step : v; }
        else {
          t = 5;
          const sx = lx - (lx > 0 ? EXC : -EXC), sy = ly - EY;
          if (sdRR(sx, sy, EW, EH, EW * 0.92) < 0) {
            t = 3;
            if (fine && sx > -0.72 * EW && sx < -0.12 * EW && sy > 0.1 * EH && sy < 0.7 * EH) t = 6;      // un reflet dans l'œil
          } else if (fine ? (abs(lx) < MW && abs(ly - (mouthY + MK * lx * lx)) < MT * (0.8 + 0.5 * (1 - (lx * lx) / (MW * MW)))) : (abs(x - MXW) < 1.5 * v && (abs(x - MXW) > 0.5 * v ? (y - MYW > -0.5 * v && y - MYW < 1.5 * v) : abs(y - MYW) < 0.5 * v))) t = 3;
        }
      }
    } else if (lz < -0.12 && fine) {
      // le dos de la tête : une trappe gravée avec des fentes
      const rr = sdRR(lx, ly - 0.02, 0.27, 0.2, 0.07);
      if (abs(rr) < 0.55 * v) t = 2;
      else if (rr < -0.04 && abs(lx) < 0.19 && abs(ly - 0.02 - 0.06 * round((ly - 0.02) / 0.06)) < 0.55 * v && abs(ly - 0.02) < 0.1) t = 2;
    }
    if (t < 0 && fine) {
      // le couvercle du dessus : un panneau en relief, coupé en deux par la couture centrale
      if (ly > HY * 0.8) {
        const rr = sdRR(lx, lz - 0.01, 0.33, 0.22, 0.11);
        if (abs(rr) < SW) t = 1;
        else if (rr < 0 && abs(lx) > SW) { t = 6; rel = v; }
      }
      // une couronne gravée autour de chaque oreille
      if (t < 0 && abs(lx) > HX - 0.07) {
        const ay = ly - EAY, rad = sqrt(ay * ay + lz * lz);
        if (abs(rad - (ERAD + 0.045)) < SW) t = 1;
      }
    }
    if (t < 0) {
      // sillons entre les plaques
      if (ly >= lipUp && ly < lipUp + 2 * SW && sect === 0) t = BROW;
      else if (ly < lipUp && ly > lipUp - SW * 1.1) t = 2;
      else if (ly > lipLo && ly < lipLo + 2 * SW) t = 1;
      else if (abs(lx) < SW && ly > lipUp + 0.6 * v) t = 1;         // la couture centrale du dessus
      else if (fine && abs(lz + 0.29) < 0.55 * v && ly > lipLo) t = 1;   // la couture de la coque arrière
      else {
        const off = sect === 0 ? 0.26 : sect === 2 ? 0.08 : 0.03;
        t = plate(lx, ly, lz, 0.18 * (ly / HY) - 0.10 * (lx / HX) + 0.22 * (lz / HZ), off, 1);
      }
    }
    TAG = t;
    return d - rel;
  });

  // les oreilles : des modules bleus sur les côtés de la tête
  for (const sg of [-1, 1]) {
    add(FH, [sg > 0 ? EAX - 0.12 : -EAX - 0.12, EAY - 0.22, -0.22], [sg > 0 ? EAX + 0.12 : -EAX + 0.12, EAY + 0.22, 0.22], (x, y, z) => {
      toLocal(FH, x, y, z);
      const ax = sg * LX - EAX, ay = LY - EAY, az = LZ;
      const rad = sqrt(ay * ay + az * az);
      const rr = 0.05;
      const dx = rad - ERAD + rr, dy = abs(ax) - ELEN + rr;
      const d = sqrt(max(dx, 0) ** 2 + max(dy, 0) ** 2) + min(max(dx, dy), 0) - rr;
      if (d > 0.06 || d < -dmax) { TAG = 4; return d; }
      let t = 4;
      if (ax > ELEN - 2.4 * v) {                                // la face extérieure
        if (rad < S(0.045, 1.0)) t = fine ? 3 : 0;
        else if (rad < S(0.1, 2.0)) t = 0;
        else if (rad < S(0.13, 2.7)) t = 2;
      }
      TAG = t;
      return d;
    });
  }

  // l'antenne : un col sombre, une tige fine, une perle lumineuse
  const ABY = HY + step - 0.01;
  add(FH, [-0.12, ABY - 0.05, -0.12], [0.12, ABY + 0.4, 0.12], (x, y, z) => {
    toLocal(FH, x, y, z);
    const ly = LY - ABY;
    const rs = S(0.041, 0.9), rb = S(0.088, 1.9), rp = S(0.078, 1.3);
    const dCol = sdCylY(LX, ly - 0.012, LZ, rb, 0.02, 0.012);
    const dStem = sdCap(LX, ly, LZ, 0, 0.0, 0, 0, 0.17, 0, rs);
    const dBead = sqrt(LX * LX + (ly - 0.235) ** 2 + LZ * LZ) - rp;
    let d = dCol, t = 2;
    if (dStem < d) { d = dStem; t = 1; }
    if (dBead < d) {
      d = dBead; t = 3;
      // un reflet blanc sur la perle, comme dans les yeux
      if (fine) { const bx = LX / rp, by = (ly - 0.235) / rp, bz = LZ / rp; if (-0.45 * bx + 0.55 * by + 0.7 * bz > 0.8) t = 6; }
    }
    TAG = t;
    return d;
  });

  // le cou et son anneau
  add(null, [-0.3, -0.34, -0.3], [0.3, -0.06, 0.3], (x, y, z) => {
    const dNeck = sdCylY(x, y + 0.2, z, 0.135, 0.1, 0.02);
    const dRing = sdTorus(x, y + 0.18, z, 0.18, S(0.034, 1.0));
    let d = dNeck, t = 2;
    if (dRing < d) { d = dRing; t = 4; }
    TAG = t;
    return d;
  });

  // ===== le torse =====
  const TT = -0.22, TB = -0.75, TC = (TT + TB) / 2, TH = (TT - TB) / 2;
  const BX = 0.385, BZ2 = 0.31, BR = 0.17;
  const CY = -0.45;                                           // le centre du panneau de poitrine
  const PW = 0.2, PH = 0.15;
  const CR = S(0.088, 1.45);
  const belt = TB + 0.115;
  add(null, [-0.5, TB - 0.05, -0.4], [0.5, TT + 0.05, 0.4], (x, y, z) => {
    const t01 = clamp((TT - y) / (TT - TB), 0, 1);
    const f = 1 - 0.26 * t01;
    const d = sdBox(x / f, y - TC, z / f, BX, TH, BZ2, BR) * f;
    if (d > 0.07 || d < -dmax) { TAG = 0; return d; }
    let t = -1, rel = 0;
    const py = y - CY;
    if (z > 0.06) {
      const rr = sdRR(x, py, PW, PH, 0.07);
      if (rr < 0) {
        rel = v;
        if (rr > -S(0.022, 1.0)) t = 1;
        else {
          const cr = sqrt(x * x + py * py);
          if (cr < CR) t = 3;
          else if (cr < CR + S(0.03, 1.2)) t = fine ? 6 : 4;
          else t = 4;
        }
      }
    } else if (z < -0.1 && fine) {
      // le dos : un bloc batterie en relief avec des fentes
      const rr = sdRR(x, py + 0.01, 0.2, 0.15, 0.05);
      if (rr < 0) { rel = v; t = rr > -1.1 * v ? 2 : (abs(x) < 0.13 && abs(py + 0.01 - 0.06 * round((py + 0.01) / 0.06)) < 0.55 * v && abs(py + 0.01) < 0.1 ? 2 : 7); }
    }
    if (t < 0) {
      if (abs(y - belt) < SW) t = 1;
      else if (fine && abs(abs(x) / f - 0.3) < 0.55 * v && y > belt && y < TT - 0.07) t = 1;
      else if (y > TT - 0.075 && y < TT - 0.075 + 2 * SW) t = 1;
      else t = plate(x, y, z, 0.24 * ((y - TC) / TH) - 0.10 * (x / 0.35) + 0.12 * (z / 0.3), y < belt ? -0.02 : 0.06, 2);
    }
    TAG = t;
    return d - rel;
  });

  // les épaules : de petites rotules
  for (const sg of [-1, 1]) {
    const SX = 0.4, SYc = -0.3, SR = S(0.105, 1.6);
    add(null, [sg * SX - 0.17, SYc - 0.17, -0.17], [sg * SX + 0.17, SYc + 0.17, 0.17], (x, y, z) => {
      const ax = (x - sg * SX) * sg, ay = y - SYc;
      const d = sqrt(ax * ax + ay * ay + z * z) - SR;
      TAG = ax > SR * 0.55 ? 1 : (ay > SR * 0.35 ? 6 : 0);
      return d;
    });
  }

  // la tuyère et sa flamme
  add(null, [-0.2, -1.15, -0.2], [0.2, TB + 0.02, 0.2], (x, y, z) => {
    const yc = TB - 0.04;
    const rad = 0.13 - 0.04 * clamp((TB - y) / 0.08, 0, 1);
    const dN = max(sqrt(x * x + z * z) - rad, abs(y - yc) - 0.045);
    // flamme : goutte qui s'affine vers le bas
    const top = TB - 0.08, len = 0.23;
    const s = clamp((top - y) / len, 0, 1);
    const fr = S(0.092, 1.4) * (1 - s) ** 0.7;
    const dF = max(sqrt(x * x + z * z) - fr, max(top - len - y, y - top - 0.02));
    let d = dN, t = 2;
    if (abs(y - (TB - 0.005)) < 0.8 * v) t = 1;
    if (dF < d) { d = dF; t = 3; }
    // deux braises qui flottent
    for (let k = 0; k < 2; k++) {
      const by = top - len - 0.035 - k * 0.042, bx = k === 0 ? 0.02 : -0.018;
      const h = S(0.017, 0.62) * (1 - 0.2 * k);
      const dB = max(abs(x - bx) - h, max(abs(y - by) - h, abs(z) - h));
      if (dB < d) { d = dB; t = 3; }
    }
    TAG = t;
    return d;
  });

  // ===== les mains : elles flottent, loin des épaules =====
  // la main de droite (à l'écran) salue, celle de gauche reste détendue
  const poses = [
    { x: -0.8, y: -0.47, z: 0.12, rx: 0.0, ry: 0.3, rz: -0.38, thumb: 1 },
    { x: 0.8, y: -0.2, z: 0.2, rx: 0.0, ry: -0.12, rz: PI - 0.36, thumb: 1 },
  ];
  for (const ps of poses) {
    const FHand = frame(ps.x, ps.y, ps.z, ps.rx, ps.ry, ps.rz);
    const k = 1.08 + 0.14 * lowF;
    const pw = 0.1 * k, ph = 0.08 * k, pd = 0.06 * k;
    const fr = S(0.034 * k, 0.85);
    const nf = lod < 0.032 ? 3 : 2;                               // trois doigts, ou deux quand les cubes sont gros
    const fx0 = 2.04 * fr, fx1 = 2 * fr + 0.042;                  // écart des doigts à la racine et au bout : ils s'ouvrent en éventail
    add(FHand, [-0.25, -0.34, -0.14], [0.25, 0.3, 0.14], (x, y, z) => {
      toLocal(FHand, x, y, z);
      const lx = LX, ly = LY, lz = LZ;
      let d = sdBox(lx, ly, lz, pw, ph, pd, 0.045 * k), t = -1;
      const dCuff = sdCylY(lx, ly - (ph + 0.018 * k), lz, 0.075 * k, 0.022 * k, 0.012);
      if (dCuff < d) { d = dCuff; t = 4; }
      for (let i = 0; i < nf; i++) {
        const u = nf === 3 ? i - 1 : i - 0.5;
        const ln = (nf === 3 && i === 1 ? 0.125 : 0.108) * k;
        const dF = sdCap(lx, ly, lz, u * fx0, -ph * 0.6, 0.0, u * fx1, -ph - ln + fr * 0.4, 0.016 * k, fr);
        if (dF < d) { d = dF; t = 0; }
      }
      const dT = sdCap(lx, ly, lz, ps.thumb * pw * 0.85, -ph * 0.1, 0.0, ps.thumb * (pw + 0.065 * k), -ph * 0.8, 0.02 * k, fr * 1.1);
      if (dT < d) { d = dT; t = 0; }
      if (d > 0.06 || d < -dmax) { TAG = 6; return d; }
      if (t < 0) t = ly > ph - 0.03 * k ? 0 : 6;
      else if (t === 0 && ly < -ph - 0.07 * k) t = 7;
      TAG = t;
      return d;
    });
  }

  // ===== l'anneau en orbite et ses satellites =====
  const RR = 0.54, RT = S(0.034, 1.0);
  const FR = frame(0, -0.53, 0.0, 0.12, 0.0, 0.06);
  const sat = [[0.62, 4], [2.52, 4], [4.7, 3]];                 // angles et étiquettes des satellites
  add(FR, [-RR - 0.12, -0.12, -RR - 0.12], [RR + 0.12, 0.12, RR + 0.12], (x, y, z) => {
    toLocal(FR, x, y, z);
    const lx = LX, ly = LY, lz = LZ;
    let d = sdTorus(lx, ly, lz, RR, RT), t = 0;
    const ph = atan2(lz, lx);
    if (d < dmax) t = (floor((ph + PI) / (PI / 6)) & 1) ? 1 : 0;
    for (let i = 0; i < sat.length; i++) {
      const a = sat[i][0], sx = RR * cos(a), sz = RR * sin(a);
      const hs = S(0.055, 1.4);
      const c = cos(a), s2 = sin(a);
      const ux = (lx - sx) * s2 - (lz - sz) * c, uz = (lx - sx) * c + (lz - sz) * s2;
      const dS = sdBox(ux, ly, uz, hs, hs * 0.9, hs, 0.012);
      if (dS < d) { d = dS; t = sat[i][1]; }
    }
    TAG = t;
    return d;
  });

  return parts;
}

// ---------- la voxelisation ----------
function voxelize(parts, v, depthMax) {
  const NB = 4;
  const XM = 1.15, YM = 1.28, ZM = 0.85;
  const ix0 = -floor(XM / v), ix1 = floor(XM / v), iy0 = -floor(YM / v), iy1 = floor(YM / v), iz0 = -floor(ZM / v), iz1 = floor(ZM / v);
  const NP = parts.length;
  let bt = 0;
  const field = (x, y, z) => {
    let best = 1e9;
    for (let i = 0; i < NP; i++) {
      const P = parts[i];
      if (x < P.x0 || x > P.x1 || y < P.y0 || y > P.y1 || z < P.z0 || z > P.z1) continue;
      const d = P.ev(x, y, z);
      if (d < best) { best = d; bt = TAG; }
    }
    return best;
  };
  let cap = 200000;
  let X = new Float32Array(cap), Y = new Float32Array(cap), Z = new Float32Array(cap), D = new Float32Array(cap), T = new Uint8Array(cap);
  let m = 0;
  const grow = () => {
    cap *= 2;
    const nx = new Float32Array(cap); nx.set(X); X = nx;
    const ny = new Float32Array(cap); ny.set(Y); Y = ny;
    const nz = new Float32Array(cap); nz.set(Z); Z = nz;
    const nd = new Float32Array(cap); nd.set(D); D = nd;
    const nt = new Uint8Array(cap); nt.set(T); T = nt;
  };
  const R = 0.8660254 * NB * v * 0.5 * 1.25 + 0.06;               // rayon d'un bloc, avec une marge
  for (let bk = iz0; bk <= iz1; bk += NB) {
    for (let bj = iy0; bj <= iy1; bj += NB) {
      for (let bi = ix0; bi <= ix1; bi += NB) {
        const cx = (bi + (NB - 1) / 2) * v, cy = (bj + (NB - 1) / 2) * v, cz = (bk + (NB - 1) / 2) * v;
        const dc = field(cx, cy, cz);
        if (dc > R || dc < -R - depthMax) continue;
        for (let k = bk; k < bk + NB; k++) for (let j = bj; j < bj + NB; j++) for (let i = bi; i < bi + NB; i++) {
          const x = i * v, y = j * v, z = k * v;
          const d = field(x, y, z);
          if (d > 0 || d < -depthMax) continue;
          if (m === cap) grow();
          X[m] = x; Y[m] = y; Z[m] = z; D[m] = -d; T[m] = bt; m++;
        }
      }
    }
  }
  return { X, Y, Z, D, T, m };
}

/** n cubes, exactly. Deterministic from seed. */
export default function build(n, seed = 1) {
  // épaisseur de coque visée, en voxels : plus fine quand il y a peu de cubes (le tremblement du moteur pèse moins)
  const T = 3.0 + 2.0 * clamp(Math.log(n / 6561) / Math.log(9), 0, 1);
  const AREA = 5.4;                                             // surface approximative du robot (mesurée)
  const lod = sqrt(AREA * T / n);                               // le pas attendu
  let v = lod, vu = lod, vox = null;
  for (let it = 0; it < 14; it++) {
    vu = v;
    vox = voxelize(makeParts(vu, lod, seed), vu, (T + 1.2) * vu);
    let c = 0;
    for (let i = 0; i < vox.m; i++) if (vox.D[i] <= T * vu) c++;
    const ratio = c / n;
    if (vox.m >= n && ((ratio >= 0.92 && ratio <= 1.12) || it >= 8)) break;
    v = vu * Math.pow(clamp(ratio, 0.4, 2.5), 1 / 2.1) * (vox.m < n ? 0.98 : 1);
  }
  v = vu;                                                       // le pas avec lequel les voxels ont vraiment été échantillonnés
  // les n voxels les plus proches de la surface
  const m = vox.m;
  const key = new Float64Array(m);
  for (let i = 0; i < m; i++) key[i] = vox.D[i] + 0.004 * v * hash(round(vox.X[i] / v), round(vox.Y[i] / v), round(vox.Z[i] / v), seed + 99);
  const idx = new Uint32Array(m);
  for (let i = 0; i < m; i++) idx[i] = i;
  idx.sort((a, b) => key[a] - key[b]);
  const pos = new Float32Array(3 * n), tag = new Uint8Array(n);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let k = 0; k < n; k++) {
    const i = idx[k % m];
    const x = vox.X[i], y = vox.Y[i], z = vox.Z[i];
    pos[3 * k] = x; pos[3 * k + 1] = y; pos[3 * k + 2] = z; tag[k] = vox.T[i];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  // centre en y (z reste sur l'axe du corps), puis échelle pour tenir dans [1.0, 1.1, 0.75]
  const yc = (y0 + y1) / 2;
  const h = v / 2;
  const ex = max(abs(x0), abs(x1)) + h, ey = (y1 - y0) / 2 + h, ez = max(abs(z0), abs(z1)) + h;
  const sc = min(0.99 / ex, 1.09 / ey, 0.745 / ez);
  for (let k = 0; k < n; k++) { pos[3 * k] *= sc; pos[3 * k + 1] = (pos[3 * k + 1] - yc) * sc; pos[3 * k + 2] *= sc; }
  return { pos, tag, cube: v * sc, extent: [ex * sc, ey * sc, ez * sc] };
}
