"""Petite bibliothèque de scènes Mitsuba 3 : verre, liquides, tubes, surfaces de révolution, textures procédurales, tonalité et débruitage."""
import os, math, json, numpy as np
import mitsuba as mi
mi.set_variant('scalar_rgb')
from PIL import Image

T = mi.ScalarTransform4f
OUT = os.path.dirname(os.path.abspath(__file__))
GEO = os.path.join(OUT, 'geo'); os.makedirs(GEO, exist_ok=True)
TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)

# ------------------------------------------------------------------ couleurs
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
def col(h, k=1.0): return {'type': 'rgb', 'value': [v * k for v in lin(h)]}
HAZE, MIST, GLOW, CANYON, PINE = '#e7eef0', '#c8d1d3', '#e0a35c', '#2a5f86', '#27463d'

# ------------------------------------------------------------------ matières
def matte(h, k=1.0): return {'type': 'diffuse', 'reflectance': col(h, k)}
def plastic(h, a=0.0): return ({'type': 'roughplastic', 'diffuse_reflectance': col(h), 'alpha': a, 'int_ior': 1.49} if a > 0 else {'type': 'plastic', 'diffuse_reflectance': col(h), 'int_ior': 1.49})
def metal(mat='Al', a=0.08): return {'type': 'roughconductor', 'material': mat, 'alpha': a}
def glass(ior=1.5, tint=None, a=0.0):
    d = {'type': 'roughdielectric' if a > 0 else 'dielectric', 'int_ior': ior}
    if a > 0: d['alpha'] = a
    if tint: d['specular_transmittance'] = col(tint)
    return d
def emit(h, k): return {'type': 'area', 'radiance': col(h, k)}

# ------------------------------------------------------------------ formes simples
def sphere(c, r, bsdf=None, emitter=None):
    d = {'type': 'sphere', 'center': list(c), 'radius': r}
    if bsdf: d['bsdf'] = bsdf
    if emitter: d['emitter'] = emitter
    return d
def cyl(p0, p1, r, bsdf):
    return {'type': 'cylinder', 'p0': list(p0), 'p1': list(p1), 'radius': r, 'bsdf': bsdf}
def box(c, half, bsdf, rot=None):
    t = T().translate(list(c))
    if rot:
        for ax, ang in rot: t = t @ T().rotate(ax, ang)
    t = t @ T().scale(list(half))
    return {'type': 'cube', 'to_world': t, 'bsdf': bsdf}
def quad(origin, target, size, bsdf=None, emitter=None, up=(0, 1, 0)):
    d = {'type': 'rectangle', 'to_world': T().look_at(origin=list(origin), target=list(target), up=list(up)).scale([size[0] / 2, size[1] / 2, 1])}
    if bsdf: d['bsdf'] = bsdf
    if emitter: d['emitter'] = emitter
    return d
def floor(y=0.0, bsdf=None, size=60):
    return {'type': 'rectangle', 'to_world': T().translate([0, y, 0]).rotate([1, 0, 0], -90).scale(size), 'bsdf': bsdf or plastic('#f3f6f7', 0.06)}

# ------------------------------------------------------------------ maillages : OBJ écrits à la main
def write_obj(name, V, F, N=None, UV=None):
    path = os.path.join(GEO, name + '.obj')
    with open(path, 'w') as f:
        for v in V: f.write('v %.6f %.6f %.6f\n' % tuple(v))
        if N is not None:
            for n in N: f.write('vn %.6f %.6f %.6f\n' % tuple(n))
        if UV is not None:
            for u in UV: f.write('vt %.6f %.6f\n' % tuple(u))
        for fc in F:
            if N is not None and UV is not None: f.write('f ' + ' '.join('%d/%d/%d' % (i + 1, i + 1, i + 1) for i in fc) + '\n')
            elif N is not None: f.write('f ' + ' '.join('%d//%d' % (i + 1, i + 1) for i in fc) + '\n')
            else: f.write('f ' + ' '.join('%d' % (i + 1) for i in fc) + '\n')
    return path

def smooth_normals(V, F):
    N = np.zeros_like(V)
    a, b, c = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    fn = np.cross(b - a, c - a)
    for k in range(3): np.add.at(N, F[:, k], fn)
    l = np.linalg.norm(N, axis=1, keepdims=True)
    bad = (l[:, 0] < 1e-12)
    N[bad] = [0.0, 1.0, 0.0]; l[bad] = 1.0
    return N / l

def revolve(name, profile, segs=96, center=(0, 0, 0), bsdf=None, rot=None, scale=1.0):
    """Surface de révolution autour de l'axe y. profile : liste de (r, y) du bas vers le haut. Les sommets sont partagés autour de l'axe (normales lisses)."""
    P0 = np.array(profile, dtype=float)
    keep = [0]
    for i in range(1, len(P0)):
        if np.linalg.norm(P0[i] - P0[keep[-1]]) > 1e-7: keep.append(i)
    P = P0[keep]
    m = len(P)
    V = []; 
    for (r, y) in P:
        for j in range(segs):
            th = 2 * math.pi * j / segs
            V.append([r * math.cos(th), y, r * math.sin(th)])
    V = np.array(V)
    F = []
    for i in range(m - 1):
        for j in range(segs):
            a = i * segs + j; b = i * segs + (j + 1) % segs; c = (i + 1) * segs + j; d = (i + 1) * segs + (j + 1) % segs
            F.append([a, c, b]); F.append([b, c, d])
    F = np.array(F)
    N = smooth_normals(V, F)
    path = write_obj(name, V, F, N)
    t = T().translate(list(center))
    if rot:
        for ax, ang in rot: t = t @ T().rotate(ax, ang)
    t = t @ T().scale(scale)
    d = {'type': 'obj', 'filename': path, 'to_world': t}
    if bsdf: d['bsdf'] = bsdf
    return d

def arc(p0, p1, n=24, bulge=0.0):
    """Petit utilitaire pour construire des profils lisses : n points entre deux points avec un renflement."""
    t = np.linspace(0, 1, n)
    return [(p0[0] + (p1[0] - p0[0]) * u + bulge * math.sin(math.pi * u), p0[1] + (p1[1] - p0[1]) * u) for u in t]

def glass_vessel(name, outer, wall, segs=96, center=(0, 0, 0), rot=None, scale=1.0, bsdf=None):
    """Un récipient en verre à deux parois : outer est le profil extérieur (r, y) du bas vers le haut, wall l'épaisseur. Retourne (dict verre, profil intérieur)."""
    O = np.array(outer, dtype=float)
    I = []
    for (r, y) in O[::-1]:
        I.append((max(r - wall, 0.0), y - wall if y == O[0][1] else y))
    # fond intérieur remonté de wall
    I = [(max(r - wall, 0.0), y + (wall if abs(y - O[0][1]) < 1e-6 else 0.0)) for (r, y) in O[::-1]]
    I = I[::-1]
    # le profil complet : paroi extérieure du bas vers le haut, lèvre, paroi intérieure du haut vers le bas
    prof = [tuple(p) for p in O] + [(O[-1][0] - wall * 0.5, O[-1][1] + wall * 0.3)] + [tuple(p) for p in I[::-1]]
    return revolve(name, prof, segs, center, bsdf or glass(1.5), rot, scale), I

def liquid_for(name, inner, level, segs=96, center=(0, 0, 0), rot=None, scale=1.0, bsdf=None, shrink=0.004):
    """Le liquide qui remplit la paroi intérieure jusqu'à la hauteur level (profil intérieur I du bas vers le haut)."""
    pts = [(max(r - shrink, 0.0), y + shrink) for (r, y) in inner if y <= level]
    if not pts: return None
    if pts[-1][1] < level:
        pts.append((pts[-1][0], level))
    pts.append((0.0, level))
    pts = [(0.0, pts[0][1])] + pts
    return revolve(name, pts, segs, center, bsdf or glass(1.33), rot, scale)

def tube(name, points, radius, segs=18, uv_per_unit=None, round_ends=0.0, bsdf=None):
    """Un tube le long d'une ligne brisée (repère de transport parallèle). radius : nombre ou tableau. UV : u autour, v le long (en unités de longueur / uv_per_unit)."""
    P = np.array(points, dtype=float); n = len(P)
    R = np.full(n, radius, dtype=float) if np.isscalar(radius) else np.array(radius, dtype=float)
    tang = np.zeros_like(P)
    tang[1:-1] = P[2:] - P[:-2]; tang[0] = P[1] - P[0]; tang[-1] = P[-1] - P[-2]
    tang /= np.linalg.norm(tang, axis=1, keepdims=True)
    ref = np.array([0.0, 1.0, 0.0]) if abs(tang[0][1]) < 0.9 else np.array([1.0, 0.0, 0.0])
    nrm = np.cross(tang[0], ref); nrm /= np.linalg.norm(nrm)
    frames = []
    for i in range(n):
        if i:
            b = np.cross(tang[i - 1], tang[i])
            if np.linalg.norm(b) > 1e-8:
                b /= np.linalg.norm(b); ang = math.acos(np.clip(np.dot(tang[i - 1], tang[i]), -1, 1))
                c, s = math.cos(ang), math.sin(ang)
                nrm = nrm * c + np.cross(b, nrm) * s + b * np.dot(b, nrm) * (1 - c)
        nrm = nrm - tang[i] * np.dot(nrm, tang[i]); nrm /= np.linalg.norm(nrm)
        frames.append((nrm.copy(), np.cross(tang[i], nrm)))
    # arc-length
    L = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    if round_ends > 0:
        s = L / L[-1]
        e = round_ends / L[-1]
        k = np.ones(n)
        k = np.where(s < e, np.sqrt(np.clip(1 - ((e - s) / e) ** 2, 0, 1)), k)
        k = np.where(s > 1 - e, np.sqrt(np.clip(1 - ((s - (1 - e)) / e) ** 2, 0, 1)), k)
        R = R * np.maximum(k, 0.02)
    V = []; Nn = []; UV = []
    for i in range(n):
        a, b = frames[i]
        for j in range(segs + 1):
            th = 2 * math.pi * j / segs
            d = a * math.cos(th) + b * math.sin(th)
            V.append(P[i] + d * R[i]); Nn.append(d)
            UV.append([j / segs, (L[i] / uv_per_unit) if uv_per_unit else L[i]])
    V = np.array(V); Nn = np.array(Nn); UV = np.array(UV)
    F = []
    w = segs + 1
    for i in range(n - 1):
        for j in range(segs):
            a = i * w + j; b = i * w + j + 1; c = (i + 1) * w + j; d = (i + 1) * w + j + 1
            F.append([a, c, b]); F.append([b, c, d])
    path = write_obj(name, V, np.array(F), Nn, UV)
    d = {'type': 'obj', 'filename': path}
    if bsdf: d['bsdf'] = bsdf
    return d

# ------------------------------------------------------------------ textures procédurales
def save_tex(name, arr):
    p = os.path.join(TEX, name + '.png')
    Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8)).save(p)
    return p
def bitmap(path, scale=(1, 1), raw=False):
    return {'type': 'bitmap', 'filename': path, 'to_uv': T().scale([scale[0], scale[1], 1]), 'filter_type': 'bilinear', 'wrap_mode': 'repeat', 'raw': raw}

# ------------------------------------------------------------------ rendu
def render(scene_dict, spp, w, h, out_exr):
    sc = mi.load_dict(scene_dict)
    img = mi.render(sc, spp=spp)
    arr = np.array(img)
    np.save(out_exr, arr.astype(np.float32))
    return arr

def camera(origin, target, fov, w, h, spp, focus=None, aperture=0.0, up=(0, 1, 0)):
    s = {'to_world': T().look_at(origin=list(origin), target=list(target), up=list(up)), 'fov': fov,
         'film': {'type': 'hdrfilm', 'width': w, 'height': h, 'rfilter': {'type': 'gaussian'}},
         'sampler': {'type': 'independent', 'sample_count': spp}}
    if aperture > 0 and focus:
        s['type'] = 'thinlens'; s['aperture_radius'] = aperture; s['focus_distance'] = focus
    else:
        s['type'] = 'perspective'
    return s

def tonemap(arr, exposure=1.0, contrast=1.06, sat=1.06, vignette=0.12, lift=0.0, white=4.0):
    x = np.maximum(arr[..., :3] * exposure, 0)
    x = x * (1 + x / (white * white)) / (1 + x)                    # Reinhard étendu
    x = np.power(np.clip(x, 0, 1), 1 / 2.2)
    x = (x - 0.5) * contrast + 0.5 + lift
    g = x.mean(axis=2, keepdims=True)
    x = g + (x - g) * sat
    h, w = x.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    x = x * (1 - vignette * np.clip(r - 0.5, 0, 1) ** 1.5)[..., None]
    return np.clip(x, 0, 1)

def denoise(x8, strength=6):
    try:
        import cv2
        return cv2.fastNlMeansDenoisingColored(x8, None, strength, strength, 5, 15)
    except Exception:
        return x8

def finish(arr, out_png, exposure=1.0, den=6, **kw):
    x = tonemap(arr, exposure, **kw)
    x8 = (x * 255 + 0.5).astype(np.uint8)
    if den: x8 = denoise(x8, den)
    Image.fromarray(x8).save(out_png)
    return out_png
