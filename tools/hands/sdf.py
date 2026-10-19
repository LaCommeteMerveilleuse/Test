"""Primitives de champ de distance signée (SDF), vectorisées avec numpy.
Les points P ont la forme (N, 3). Toutes les unités sont des centimètres."""
import numpy as np


def length(v):
    return np.sqrt(np.einsum('ij,ij->i', v, v))


def smin(a, b, k):
    """Union douce de deux champs (polynomiale)."""
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    """Soustraction douce : garde a et creuse b."""
    return -smin(-a, -b, k)


def sphere(P, c, r):
    return length(P - np.asarray(c, np.float32)) - r


def round_cone(P, a, b, r1, r2):
    """Cône arrondi (capsule effilée) entre a et b, de rayons r1 et r2 (Inigo Quilez)."""
    a = np.asarray(a, np.float32); b = np.asarray(b, np.float32)
    ba = b - a
    l2 = float(ba @ ba)
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pa = P - a
    y = pa @ ba
    z = y - l2
    w = pa * l2 - np.outer(y, ba)
    x2 = np.einsum('ij,ij->i', w, w)
    y2 = y * y * l2
    z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    d_end = np.sqrt(np.maximum(x2 + z2, 0)) * il2 - r2
    d_start = np.sqrt(np.maximum(x2 + y2, 0)) * il2 - r1
    d_mid = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
    return np.where(np.sign(z) * a2 * z2 > k, d_end, np.where(np.sign(y) * a2 * y2 < k, d_start, d_mid))


def ellipsoid(P, c, radii):
    """Ellipsoïde alignée sur les axes (approximation de Quilez)."""
    q = (P - np.asarray(c, np.float32)) / np.asarray(radii, np.float32)
    k0 = length(q)
    k1 = length(q / np.asarray(radii, np.float32))
    return np.where(k1 > 1e-6, k0 * (k0 - 1.0) / np.maximum(k1, 1e-6), -np.min(radii))


def frame(axis, up_hint):
    """Repère orthonormé (x le long de axis, y proche de up_hint, z latéral)."""
    x = np.asarray(axis, float); x = x / np.linalg.norm(x)
    z = np.cross(x, up_hint); z = z / np.linalg.norm(z)
    y = np.cross(z, x)
    return np.stack([x, y, z]).astype(np.float32)   # lignes = axes


def oriented_ellipsoid(P, c, radii, axis, up_hint=(0, 1, 0)):
    """Ellipsoïde dont le premier rayon suit axis."""
    R = frame(axis, np.asarray(up_hint, float))
    Q = (P - np.asarray(c, np.float32)) @ R.T
    return ellipsoid(Q, (0, 0, 0), radii)
