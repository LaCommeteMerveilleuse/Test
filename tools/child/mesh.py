"""Du champ de distance au maillage : échantillonnage par tranches, marching cubes, décimation, attributs par sommet."""
import numpy as np
from skimage import measure


def sample_grid(fn, lo, hi, h, chunk_x=24):
    lo = np.asarray(lo, np.float32); hi = np.asarray(hi, np.float32)
    nx, ny, nz = [int(np.ceil((hi[i] - lo[i]) / h)) + 1 for i in range(3)]
    ys = lo[1] + np.arange(ny, dtype=np.float32) * h
    zs = lo[2] + np.arange(nz, dtype=np.float32) * h
    vol = np.empty((nx, ny, nz), np.float32)
    YY, ZZ = np.meshgrid(ys, zs, indexing='ij')
    for i0 in range(0, nx, chunk_x):
        i1 = min(nx, i0 + chunk_x)
        xs = lo[0] + np.arange(i0, i1, dtype=np.float32) * h
        P = np.empty(((i1 - i0) * ny * nz, 3), np.float32)
        P[:, 0] = np.repeat(xs, ny * nz)
        P[:, 1] = np.tile(YY.ravel(), i1 - i0)
        P[:, 2] = np.tile(ZZ.ravel(), i1 - i0)
        vol[i0:i1] = fn(P).reshape(i1 - i0, ny, nz)
    return vol, lo


def marching(vol, lo, h):
    verts, faces, _n, _v = measure.marching_cubes(vol, level=0.0, spacing=(h, h, h))
    return (verts + lo).astype(np.float32), faces.astype(np.int32)


def gradient(fn, P, e=0.04):
    g = np.empty_like(P)
    for i in range(3):
        o = np.zeros(3, np.float32); o[i] = e
        g[:, i] = fn(P + o) - fn(P - o)
    n = np.linalg.norm(g, axis=1, keepdims=True)
    return g / np.maximum(n, 1e-8)


def ambient_occlusion(fn, P, N):
    """Occlusion ambiante par champ de distance : on regarde à quelle distance se trouve de la matière le long de la normale."""
    occ = np.zeros(len(P), np.float32)
    w = 1.0
    for k, hgt in enumerate((0.45, 0.9, 1.6, 2.8, 4.5)):
        d = fn(P + N * hgt)
        occ += w * np.clip((hgt - d) / hgt, 0, 1)
        w *= 0.62
    return np.clip(1.0 - occ * 0.55, 0, 1)


def thickness(fn, P, N):
    """Épaisseur approchée sous la surface : on s'enfonce le long de la normale inversée."""
    t = np.zeros(len(P), np.float32)
    for hgt in (0.3, 0.7, 1.3, 2.2, 3.4):
        t += np.clip(-fn(P - N * hgt), 0, 1.5) / 1.5
    return np.clip(t / 5.0, 0, 1)
