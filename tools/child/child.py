"""Un petit garçon d'environ 7 ans, façon Petit Prince, modélisé par champs de distance (SDF), avec son squelette.
Cheveux blonds en mèches, grande écharpe dorée (le noeud est ici, les deux pans flottants sont animés dans le navigateur),
tunique verte à ceinture, pantalon, bottes, manchettes claires.
Repère : l'enfant regarde vers +x, y est la verticale, +z se tourne vers la caméra. Unité : le centimètre. Les pieds sont à y = 0.
Le corps est découpé en matières (tunique, peau, cheveux, bottes, écharpe, manchettes, pantalon, ceinture) pour que le shader
les distingue, et en os (bassin, buste, tête, bras, jambes) pour l'animation : chaque sommet reçoit jusqu'à quatre poids.
"""
import numpy as np
from sdf import smin, smax, sphere, round_cone, ellipsoid, oriented_ellipsoid, length

# ------------------------------------------------------------------ squelette de repos
# Les bras pendent, un peu écartés vers l'avant (pose d'attache qui limite la déformation quand on les tend).
ARM_DIR = np.array([0.50, -0.86, 0.0])


L_UP, L_FORE, L_HAND = 18.5, 16.5, 10.5


def arm(side):
    s = np.array([0.5, 82.0, 9.2 * side])
    d = ARM_DIR * np.array([1, 1, 1]) + np.array([0, 0, 0.10 * side])
    d = d / np.linalg.norm(d)
    e = s + d * L_UP
    w = e + d * L_FORE
    f = w + d * L_HAND
    return s, e, w, f


def leg(side):
    h = np.array([0.2, 51.0, 5.0 * side])
    k = np.array([1.0, 28.0, 5.2 * side])
    a = np.array([0.6, 5.5, 5.4 * side])
    t = np.array([8.5, 2.2, 5.4 * side])
    return h, k, a, t


JOINTS = {
    'pelvis': ((0.0, 45.0, 0.0), (0.0, 57.0, 0.0)),
    'chest': ((0.3, 57.0, 0.0), (0.8, 84.0, 0.0)),
    'head': ((1.0, 84.0, 0.0), (2.4, 108.0, 0.0)),
}
for name, side in (('N', 1), ('F', -1)):
    s, e, w, f = arm(side)
    JOINTS[f'arm{name}_u'] = (tuple(s), tuple(e))
    JOINTS[f'arm{name}_f'] = (tuple(e), tuple(w))
    JOINTS[f'arm{name}_h'] = (tuple(w), tuple(f))
    h, k, a, t = leg(side)
    JOINTS[f'leg{name}_u'] = (tuple(h), tuple(k))
    JOINTS[f'leg{name}_l'] = (tuple(k), tuple(a))
BONES = list(JOINTS.keys())

# rayon typique autour de chaque os : sert à départager les os voisins pour les poids
RADIUS = {'pelvis': 8.5, 'chest': 9.5, 'head': 9.0,
          'armN_u': 4.3, 'armN_f': 3.9, 'armN_h': 2.6, 'armF_u': 4.3, 'armF_f': 3.9, 'armF_h': 2.6,
          'legN_u': 6.0, 'legN_l': 5.0, 'legF_u': 6.0, 'legF_l': 5.0}


# ------------------------------------------------------------------ matières
TUNIC, SKIN, HAIR, BOOT, SCARF, TRIM, PANTS, BELT = range(8)
HEAD_C = np.array([2.4, 98.8, 0.0], np.float32)
HEAD_R = np.array([9.2, 10.2, 8.6], np.float32)


def unit(v):
    v = np.asarray(v, np.float32)
    return v / np.linalg.norm(v)


def torus(P, c, big, small, squash=(1.0, 1.0)):
    """Tore d'axe vertical. big : rayon du cercle médian, small : rayon du tube, squash : étirement en x et en z."""
    q = P - np.asarray(c, np.float32)
    ring = np.sqrt((q[:, 0] * squash[0]) ** 2 + (q[:, 2] * squash[1]) ** 2) - big
    return np.sqrt(ring * ring + q[:, 1] * q[:, 1]) - small


def torso(P):
    d = ellipsoid(P, (0.4, 68.0, 0.0), (8.2, 15.5, 9.8))
    d = smin(d, ellipsoid(P, (0.6, 75.0, 0.0), (8.4, 8.6, 10.4)), 3.0)
    d = smin(d, round_cone(P, (0.5, 81.4, -8.4), (0.5, 81.4, 8.4), 4.6, 4.6), 2.5)       # la ligne des épaules
    d = smin(d, ellipsoid(P, (0.2, 54.0, 0.0), (8.7, 5.6, 9.9)), 3.0)                     # le bas de la tunique, qui s'évase un peu
    d = smin(d, ellipsoid(P, (0.0, 50.0, 0.0), (7.2, 6.4, 8.8)), 3.5)                     # le bassin
    return d


def sleeve(P, side):
    s, e, w, f = arm(side)
    d = round_cone(P, s, e, 4.9, 4.2)                                                     # l'épaule un peu bouffante
    d = smin(d, round_cone(P, e, w, 4.2, 3.6), 2.0)
    return d


def cuff(P, side):
    """La manchette claire au poignet."""
    s, e, w, f = arm(side)
    u = (w - e) / L_FORE
    return round_cone(P, w - u * 1.6, w + u * 0.5, 3.75, 3.95)


def pants(P, side):
    h, k, a, t = leg(side)
    d = round_cone(P, h, k, 6.2, 5.0)
    d = smin(d, round_cone(P, k, a + np.array([0.0, 6.0, 0.0]), 5.0, 4.6), 2.5)
    return d


def boot(P, side):
    h, k, a, t = leg(side)
    d = ellipsoid(P, (a[0] + 3.2, 2.9, a[2]), (9.2, 3.4, 4.4))                            # le pied
    d = smin(d, ellipsoid(P, (a[0] + 9.2, 2.5, a[2]), (4.2, 2.6, 3.8)), 1.5)              # le bout
    d = smin(d, round_cone(P, a + np.array([0.0, -0.5, 0.0]), a + np.array([0.3, 12.5, 0.0]), 5.0, 5.4), 1.8)   # la tige
    d = smin(d, round_cone(P, a + np.array([0.3, 12.0, 0.0]), a + np.array([0.3, 13.2, 0.0]), 5.6, 5.7), 0.6)   # le revers
    return d


def belt(P, tor):
    """La ceinture : une bande un peu en relief sur la tunique."""
    return smax(tor - 0.65, np.abs(P[:, 1] - 61.5) - 1.5, 0.3)


def hand(P, side):
    s, e, w, f = arm(side)
    u = (f - w) / np.linalg.norm(f - w)
    perp = np.cross(u, np.array([0, 0, 1.0])); perp = perp / np.linalg.norm(perp)
    c = w + u * 4.2
    d = oriented_ellipsoid(P, c, (4.4, 2.6, 1.9), u, up_hint=perp)                       # la paume et les doigts repliés
    d = smin(d, round_cone(P, w + u * 5.6 + perp * 0.8, w + u * (L_HAND - 0.1) + perp * 0.8, 1.0, 0.75), 0.9)   # l'index tendu
    d = smin(d, round_cone(P, w + u * 2.2 - perp * 1.4 + np.array([0, 0, 0.6 * side]), w + u * 6.0 - perp * 1.6 + np.array([0, 0, 0.9 * side]), 1.1, 0.9), 0.8)   # le pouce
    return d


def head(P):
    c = HEAD_C
    d = ellipsoid(P, c, HEAD_R)
    d = smin(d, ellipsoid(P, c + np.array([1.7, -4.6, 0.0]), (6.6, 5.0, 6.6)), 3.0)       # la mâchoire, petite : un visage rond
    for z in (-1, 1):
        d = smin(d, sphere(P, c + np.array([5.6, -3.4, 5.0 * z]), 2.7), 2.6)              # les joues
    d = smin(d, sphere(P, c + np.array([9.3, -2.3, 0.0]), 1.25), 1.1)                     # le nez
    for z in (-1, 1):
        d = smin(d, ellipsoid(P, c + np.array([-0.6, 0.4, 8.2 * z]), (1.8, 3.0, 1.0)), 1.0)    # les oreilles
    d = smin(d, round_cone(P, (1.0, 83.5, 0.0), (2.0, 92.0, 0.0), 3.6, 3.4), 3.0)         # le cou
    return d


# ------------------------------------------------------------------ cheveux : un volume rond, et beaucoup de mèches en flammes qui se rabattent en arrière
HAIR_C = np.array([2.0, 101.0, 0.0], np.float32)
HAIR_R = np.array([10.3, 10.6, 9.5], np.float32)
WIND = unit((-0.80, 0.45, 0.0))             # le sens général des mèches


def make_locks():
    """Les mèches : quelques grandes flammes sur le dessus, des mèches plus courtes sur les côtés, une frange sur le front."""
    out = []
    # azimut (° depuis +x vers +z), élévation (°), longueur, rayon à la racine, poids du vent, direction ajoutée, courbure
    for phi, psi, L, r0, w in ((0, 84, 14.0, 4.2, 0.50), (58, 78, 13.0, 4.0, 0.55), (-58, 78, 13.0, 4.0, 0.55), (118, 76, 14.5, 4.1, 0.66),
                               (-118, 76, 14.5, 4.1, 0.66), (180, 74, 15.5, 4.2, 0.72), (28, 66, 11.0, 3.6, 0.45), (-28, 66, 11.0, 3.6, 0.45)):
        side = 1.0 if phi >= 0 else -1.0
        out.append((phi, psi, L, r0, w, (0.0, 0.1, 0.30 * side * (abs(phi) < 150)), (-1.9, -0.2, 0.35 * side * (abs(phi) < 150))))
    for phi, psi, L, r0, w in ((130, 50, 10.5, 3.5, 0.74), (-130, 50, 10.5, 3.5, 0.74), (180, 44, 11.5, 3.5, 0.78)):
        side = 1.0 if phi >= 0 else -1.0
        out.append((phi, psi, L, r0, w, (0.0, 0.0, 0.12 * side * (abs(phi) < 150)), (-1.4, -0.5, 0.2 * side * (abs(phi) < 150))))
    for phi, psi, L, r0, w in ((108, 28, 7.0, 3.0, 0.30), (-108, 28, 7.0, 3.0, 0.30), (160, 26, 8.5, 3.0, 0.70), (-160, 26, 8.5, 3.0, 0.70)):
        side = 1.0 if phi >= 0 else -1.0
        out.append((phi, psi, L, r0, w, (0.0, -0.3, 0.8 * side * (abs(phi) < 130)), (-0.8, -0.6, 0.3 * side * (abs(phi) < 130))))
    return out


SPIKES = make_locks()


def cap_point(phi, psi):
    p, s = np.radians(phi), np.radians(psi)
    n = np.array([np.cos(s) * np.cos(p), np.sin(s), np.cos(s) * np.sin(p)], np.float32)
    return HAIR_C + n * HAIR_R * 0.86, unit(n / HAIR_R)


def lock(P, root, d, L, r0, curl, r1=0.30, n=4):
    """Une mèche en flamme : n segments effilés dont la direction tourne peu à peu vers la courbure."""
    cur = root
    acc = None
    for i in range(n):
        t0, t1 = i / n, (i + 1) / n
        dd = unit(d + np.asarray(curl, np.float32) * ((t0 + t1) * 0.5) ** 1.3)
        nxt = cur + dd * (L / n)
        ra = r0 * (1 - t0) ** 0.85 + r1 * t0
        rb = r0 * (1 - t1) ** 0.85 + r1 * t1
        seg = round_cone(P, cur, nxt, ra, rb)
        acc = seg if acc is None else smin(acc, seg, 0.5)
        cur = nxt
    return acc


def hair(P):
    # on ne calcule les mèches que près de la tête
    lo = np.array([-22.0, 86.0, -17.0], np.float32); hi = np.array([22.0, 128.0, 17.0], np.float32)
    inside = np.all((P > lo) & (P < hi), axis=1)
    out = np.full(len(P), 1e3, np.float32)
    if not inside.any():
        return out
    Q = P[inside]
    d = ellipsoid(Q, HAIR_C, HAIR_R)
    # la ligne des cheveux : au-dessus d'une droite qui va du front à la nuque
    tri = np.abs((Q[:, 2] / 3.3) % 1.0 - 0.5) * 2.0          # des pointes : la frange tombe plus bas par endroits
    front = np.clip((Q[:, 0] - 3.0) / 6.0, 0.0, 1.0)
    line_y = 102.4 + 0.80 * (Q[:, 0] - 6.5) + 2.4 * front * (tri - 0.5)
    plane = (line_y - Q[:, 1]) * 0.78                  # négatif au-dessus de la ligne
    d = smax(d, plane, 0.9)
    for phi, psi, L, r0, w, extra, curl in SPIKES:
        root, n = cap_point(phi, psi)
        dirv = unit(n * (1.0 - w) + WIND * w + np.asarray(extra, np.float32))
        d = smin(d, lock(Q, root, dirv, L, r0, curl), 1.4)
    out[inside] = d
    return out


# ------------------------------------------------------------------ l'écharpe : le tour du cou et le noeud (les deux pans sont animés à part)
KNOT = np.array([-3.2, 85.2, 4.6], np.float32)


def scarf(P):
    d = torus(P, (1.2, 85.6, 0.0), 5.7, 2.55, squash=(0.98, 0.92))
    d = smin(d, torus(P, (1.0, 84.0, 0.0), 6.2, 1.9, squash=(0.98, 0.92)), 1.2)           # un second tour, plus bas
    d = smin(d, sphere(P, KNOT, 3.0), 1.5)                                                # le noeud
    d = smin(d, sphere(P, KNOT * np.array([1, 1, -0.35], np.float32) + np.array([-1.2, -0.5, 0]), 2.3), 1.2)
    return d


# ------------------------------------------------------------------ champ complet
def groups(P):
    tor = torso(P)
    cloth = tor
    for side in (1, -1):
        cloth = smin(cloth, sleeve(P, side), 2.2)
    pant = smin(pants(P, 1), pants(P, -1), 0.5)
    skin = head(P)
    for side in (1, -1):
        skin = smin(skin, hand(P, side), 0.5)
    trim = smin(cuff(P, 1), cuff(P, -1), 0.0)
    return {
        TUNIC: cloth, SKIN: skin, HAIR: hair(P), BOOT: smin(boot(P, 1), boot(P, -1), 0.0),
        SCARF: scarf(P), TRIM: trim, PANTS: pant, BELT: belt(P, tor),
    }


def child_sdf(P):
    g = groups(P)
    d = smin(g[TUNIC], g[PANTS], 2.5)
    d = smin(d, g[SKIN], 1.6)
    d = smin(d, g[TRIM], 0.6)
    d = smin(d, g[HAIR], 0.9)
    d = smin(d, g[SCARF], 1.0)
    d = smin(d, g[BOOT], 1.4)
    return d


BIAS = {TUNIC: 0.0, SKIN: 0.0, HAIR: -0.4, BOOT: 0.0, SCARF: -0.5, TRIM: -0.35, PANTS: 0.25, BELT: -0.45}


def material_weights(P, tau=0.28):
    """Part de chaque matière en chaque point (huit poids qui somment à 1). Le shader les interpole : plus de bords en dents de scie."""
    g = groups(P)
    stack = np.stack([g[k] + BIAS[k] for k in range(8)], axis=1)
    w = np.exp(-(stack - stack.min(axis=1, keepdims=True)) / tau)
    return (w / w.sum(axis=1, keepdims=True)).astype(np.float32)


def material(P):
    """Matière dominante de chaque point."""
    return np.argmax(material_weights(P), axis=1).astype(np.uint8)


# ------------------------------------------------------------------ poids de peau
def segment_distance(P, a, b):
    a = np.asarray(a, np.float32); b = np.asarray(b, np.float32)
    ab = b - a
    t = np.clip(((P - a) @ ab) / float(ab @ ab), 0.0, 1.0)
    q = a + np.outer(t, ab)
    return np.linalg.norm(P - q, axis=1)


def skin_weights(P, tau=1.5):
    """Quatre os au plus par sommet. Le score est la distance à l'os, moins son rayon typique."""
    scores = np.stack([segment_distance(P, *JOINTS[n]) - RADIUS[n] for n in BONES], axis=1)
    idx = np.argsort(scores, axis=1)[:, :4]
    sc = np.take_along_axis(scores, idx, axis=1)
    w = np.exp(-(sc - sc[:, :1]) / tau)
    w = w / w.sum(axis=1, keepdims=True)
    return idx.astype(np.uint8), w.astype(np.float32)
