"""Géométrie de squelette : relaxation de chaîne et boucles de Hermite (utilisées par build_background.py)."""
import math
import numpy as np
from scipy.spatial import cKDTree

CA = 3.8


def unit(v):
    v = np.asarray(v, float)
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.where(n > 0, n, 1)


def relax_chain(X, fixed=(), obstacles=None, target=None, iters=500, rep=4.8, surf=4.6,
                i2=(5.3, 7.6), selfd=4.6, smooth=0.06):
    """Position-based relaxation of a CA chain: fixed bonds, no kinks, no clashes."""
    X = np.array(X, float)
    n = len(X)
    w = np.array([0.0 if i in set(fixed) else 1.0 for i in range(n)])
    tree = cKDTree(obstacles) if obstacles is not None and len(obstacles) else None
    obstacles = None if tree is None else np.asarray(obstacles, float)
    pi, pj = np.triu_indices(n, 3)

    def bonds():
        for i in range(n - 1):
            d = X[i + 1] - X[i]
            l = np.linalg.norm(d)
            wi, wj = w[i], w[i + 1]
            if l < 1e-9 or wi + wj == 0:
                continue
            c = (l - CA) / l * d
            X[i] += c * wi / (wi + wj)
            X[i + 1] -= c * wj / (wi + wj)

    for _ in range(iters):
        bonds()
        for i in range(n - 2):
            d = X[i + 2] - X[i]
            l = np.linalg.norm(d) + 1e-9
            t = min(max(l, i2[0]), i2[1])
            if t != l and w[i] + w[i + 2] > 0:
                c = (l - t) / l * d * 0.5
                X[i] += c * w[i] / (w[i] + w[i + 2])
                X[i + 2] -= c * w[i + 2] / (w[i] + w[i + 2])
        if len(pi):
            D = X[pi] - X[pj]
            l = np.linalg.norm(D, axis=1)
            for a, b, dv, ll in zip(pi[l < selfd], pj[l < selfd], D[l < selfd], l[l < selfd]):
                push = (selfd - ll) / (ll + 1e-9) * 0.5 * dv
                X[a] += push * w[a]
                X[b] -= push * w[b]
        if tree is not None:
            d, k = tree.query(X)
            bad = (d < rep) & (w > 0)
            if bad.any():
                dv = X[bad] - obstacles[k[bad]]
                dv /= np.linalg.norm(dv, axis=1, keepdims=True) + 1e-9
                X[bad] += dv * (rep - d[bad])[:, None] * 0.6
        if target is not None:
            s = target.sdf(X)
            bad = (s < surf) & (w > 0)
            if bad.any():
                X[bad] += target.normal(X[bad]) * (surf - s[bad])[:, None] * 0.6
        if smooth > 0 and n > 2:
            lap = np.zeros_like(X)
            lap[1:-1] = 0.5 * (X[:-2] + X[2:]) - X[1:-1]
            X += smooth * lap * w[:, None]
    for _ in range(40):
        bonds()
    return X


def hermite(a, ta, b, tb, scale=1.3, min_res=0):
    a, b = np.asarray(a, float), np.asarray(b, float)
    k = max(np.linalg.norm(b - a), 6.0) * scale
    t = np.linspace(0, 1, 400)[:, None]
    C = ((2 * t**3 - 3 * t**2 + 1) * a + (t**3 - 2 * t**2 + t) * ta * k
         + (-2 * t**3 + 3 * t**2) * b + (t**3 - t**2) * tb * k)
    seg = np.linalg.norm(np.diff(C, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    m = max(min_res, int(round(s[-1] / CA)) - 1)
    q = s[-1] * np.arange(1, m + 1) / (m + 1)
    return np.stack([np.interp(q, s, C[:, j]) for j in range(3)], 1)


