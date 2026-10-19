"""Une main humaine paramétrique, en champ de distance signée.
Repère local : x vers les doigts, y vers le dos de la main, z vers le pouce (main droite). Unités : cm."""
import numpy as np
from sdf import sphere, round_cone, ellipsoid, oriented_ellipsoid, smin, smax

X = np.array([1.0, 0, 0]); Y = np.array([0, 1.0, 0]); Z = np.array([0, 0, 1.0])


def rodrigues(v, k, ang):
    k = k / np.linalg.norm(k)
    return v * np.cos(ang) + np.cross(k, v) * np.sin(ang) + k * np.dot(k, v) * (1 - np.cos(ang))


# base des doigts : position de l'articulation (MCP), longueurs des phalanges, rayons aux 4 jointures,
# abduction de repos (degrés, positif vers le pouce), base du métacarpien
FINGERS = {
    'index':  dict(mcp=(10.05, 0.05, 3.30), L=(4.15, 2.40, 1.95), r=(1.02, 0.94, 0.84, 0.72), base=(3.5, 0.0, 2.25), abd=5.0),
    'middle': dict(mcp=(10.40, 0.05, 1.12), L=(4.55, 2.85, 2.05), r=(1.06, 0.97, 0.86, 0.73), base=(3.2, 0.0, 0.85), abd=0.5),
    'ring':   dict(mcp=(9.85, 0.05, -1.08), L=(4.25, 2.65, 1.98), r=(1.00, 0.91, 0.81, 0.69), base=(3.1, 0.0, -0.60), abd=-3.5),
    'pinky':  dict(mcp=(8.75, 0.05, -3.05), L=(3.35, 1.95, 1.68), r=(0.90, 0.80, 0.71, 0.60), base=(3.2, 0.0, -2.05), abd=-9.0),
}

DEFAULT_POSE = dict(
    index=(8, 8, 4, 0.0), middle=(18, 22, 12, 0.0), ring=(24, 30, 16, 0.0), pinky=(30, 36, 20, 0.0),
    thumb=dict(abd=0.0, curl=0.0),
)


FAT = 1.07   # épaisseur des doigts, pour une main plus sculpturale


def finger_points(spec, flex, abd_extra=0.0):
    """Positions des quatre jointures d'un doigt pour des angles de flexion donnés (MCP, PIP, DIP, ...)."""
    d0 = rodrigues(X, Y, -np.radians(spec['abd'] + abd_extra))
    k = np.cross(Y, d0); k = k / np.linalg.norm(k)
    f1, f2, f3 = np.radians(flex[0]), np.radians(flex[1]), np.radians(flex[2])
    d1 = rodrigues(d0, k, f1); d2 = rodrigues(d0, k, f1 + f2); d3 = rodrigues(d0, k, f1 + f2 + f3)
    J0 = np.array(spec['mcp'], float)
    J1 = J0 + spec['L'][0] * d1
    J2 = J1 + spec['L'][1] * d2
    J3 = J2 + spec['L'][2] * d3
    u3 = np.cross(d3, k); u3 /= np.linalg.norm(u3)
    u2 = np.cross(d2, k); u2 /= np.linalg.norm(u2)
    return [J0, J1, J2, J3], (d1, d2, d3), k, (u2, u3)


def finger_sdf(P, spec, flex, abd_extra=0.0, nails=True):
    J, (d1, d2, d3), k, (u2, u3) = finger_points(spec, flex, abd_extra)
    r = [x * FAT for x in spec['r']]
    d = round_cone(P, J[0], J[1], r[0], r[1])
    d = smin(d, round_cone(P, J[1], J[2], r[1], r[2]), 0.10)
    d = smin(d, round_cone(P, J[2], J[3], r[2], r[3]), 0.10)
    # articulations légèrement noueuses sur le dos du doigt
    d = smin(d, sphere(P, J[1] + u2 * 0.10, r[1] * 1.04), 0.18)
    d = smin(d, sphere(P, J[2] + u3 * 0.06, r[2] * 1.03), 0.16)
    # pulpe du doigt, côté paume
    pad_c = J[2] + (J[3] - J[2]) * 0.80 - u3 * 0.08
    d = smin(d, oriented_ellipsoid(P, pad_c, (0.95 * spec['L'][2] * 0.62, r[3] * 0.96, r[3] * 0.98), d3, u3), 0.22)
    if nails:
        nc = J[2] + (J[3] - J[2]) * 0.66 + u3 * (r[3] * 0.80)
        nail = oriented_ellipsoid(P, nc, (0.50 * spec['L'][2] * 0.78, 0.10, r[3] * 0.62), d3, u3)
        d = smin(d, nail, 0.12)
    return d


def thumb_points(pose):
    abd = np.radians(pose.get('abd', 0.0)); curl = np.radians(pose.get('curl', 0.0))
    T0 = np.array([2.3, -0.80, 2.75])
    m = np.array([0.80, -0.30, 0.52]); m /= np.linalg.norm(m)
    m = rodrigues(m, Y, -abd)
    T1 = T0 + 4.55 * m
    k = np.cross(m, Y); k /= np.linalg.norm(k)
    p = rodrigues(m, np.array([0.3, 0.6, -0.7]), -0.30 + curl * 0.6)
    T2 = T1 + 3.25 * p
    q = rodrigues(p, np.array([0.3, 0.6, -0.7]), -0.22 + curl * 0.9)
    T3 = T2 + 2.70 * q
    return [T0, T1, T2, T3], (m, p, q)


def thumb_sdf(P, pose):
    T, (m, p, q) = thumb_points(pose)
    d = round_cone(P, T[0], T[1], 1.55, 1.12)
    d = smin(d, round_cone(P, T[1], T[2], 1.12, 0.98), 0.18)
    d = smin(d, round_cone(P, T[2], T[3], 0.98, 0.76), 0.14)
    # ongle et pulpe
    up = np.cross(q, np.cross(Y, q)); up /= np.linalg.norm(up)
    nc = T[2] + (T[3] - T[2]) * 0.68 + up * 0.70
    d = smin(d, oriented_ellipsoid(P, nc, (0.95, 0.10, 0.52), q, up), 0.12)
    return d


def wrist_rotate(P, deg):
    """Fait fléchir la main autour du poignet (positif : vers la paume)."""
    a = np.radians(deg); c, s = np.cos(a), np.sin(a)
    Q = P.copy()
    Q[:, 0] = P[:, 0] * c - P[:, 1] * s
    Q[:, 1] = P[:, 0] * s + P[:, 1] * c
    return Q


def hand_sdf(P, pose=None, forearm=26.0):
    pose = {**DEFAULT_POSE, **(pose or {})}
    P0 = P.astype(np.float32)
    P = wrist_rotate(P0, pose.get('wrist', 0.0))      # main : palette, doigts, pouce
    # paume : quatre métacarpiens fondus, remplissage côté paume, éminences du pouce et du petit doigt
    d = None
    for name, spec in FINGERS.items():
        c = round_cone(P, spec['base'], (spec['mcp'][0] - 0.25, spec['mcp'][1], spec['mcp'][2]), 1.12, 1.04)
        d = c if d is None else smin(d, c, 0.55)
    d = smin(d, ellipsoid(P, (6.1, -0.55, 0.15), (4.35, 1.55, 4.10)), 0.9)
    d = smin(d, ellipsoid(P, (4.1, -0.95, 2.55), (3.1, 1.55, 2.0)), 1.0)       # éminence thénar
    d = smin(d, ellipsoid(P, (4.7, -0.55, -2.85), (2.9, 1.25, 1.15)), 0.8)     # éminence hypothénar
    # tendons sur le dos de la main
    for name, spec in FINGERS.items():
        a = (1.2, 1.05, spec['base'][2] * 0.78)
        b = (spec['mcp'][0] - 0.65, 1.12, spec['mcp'][2])
        d = smin(d, round_cone(P, a, b, 0.30, 0.26), 0.35)
    # poignet et avant-bras (section ovale, plus large que haute), eux ne bougent pas
    d = smin(d, ellipsoid(P, (1.2, 0.0, 0.0), (3.1, 2.0, 3.05)), 1.1)
    Q = P0.copy(); Q[:, 1] *= 1.28
    d = smin(d, round_cone(Q, (0.2, 0.0, 0.0), (-forearm, 0.0, 0.0), 2.85, 3.75), 1.2)
    d = smin(d, sphere(P0, (-0.4, 0.95, -2.55), 0.62), 0.5)                       # styloïde cubitale
    # doigts
    for name, spec in FINGERS.items():
        fl = pose[name]
        d = smin(d, finger_sdf(P, spec, fl[:3], fl[3] if len(fl) > 3 else 0.0), 0.28)
    d = smin(d, thumb_sdf(P, pose['thumb']), 0.7)
    return d
