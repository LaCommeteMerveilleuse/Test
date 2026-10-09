#!/usr/bin/env python3
"""
Build the molecular-surface asset used by the BlackPhage site.

Input
  Two all-atom models of the same protein in two conformations (open / closed)
  and a PQR file with CHARMM partial charges for the open model. The site uses
  adenylate kinase from E. coli (PDB 4AKE open / 1AKE closed), as distributed in
  the MDAnalysis test data.

Output (assets/data/)
  adk.bin   binary vertex / index buffers
  adk.json  layout of adk.bin + every number the page displays

Everything the page shows is computed here, from those coordinates:
  * solvent-excluded surface of the open conformation (EDT method, probe 1.4 A)
  * rigid-domain motion open -> closed (screw parameters per domain)
  * screened-Coulomb electrostatic potential at the surface (distance-dependent
    dielectric), plus the extra term due to protonating the histidines
  * Kyte-Doolittle hydrophobicity
  * residues whose accessibility increases when the hinge opens (Shrake-Rupley)
  * ambient occlusion baked for each conformation

Usage
  python3 tools/build_protein.py --data DIR_WITH_adk_open.pdb --out assets/data
Requires numpy, scipy, scikit-image, trimesh, fast-simplification.
"""
import argparse
import json
import math
import os
import sys

import numpy as np
from scipy import ndimage, sparse
from scipy.spatial import cKDTree
from skimage import measure
import trimesh
import fast_simplification

PROBE = 1.4                   # solvent probe radius (A)
GRID_H = 0.5                  # grid spacing for the surface (A)
TARGET_VERTS = 46000          # vertices shipped to the browser
RADII = {'C': 1.70, 'N': 1.55, 'O': 1.52, 'S': 1.80}   # Bondi
BACKBONE = {'N', 'CA', 'C', 'O'}

# Domain decomposition of adenylate kinase (Beckstein et al., J Mol Biol 2009)
DOMAINS = {
    'CORE': list(range(1, 30)) + list(range(60, 122)) + list(range(160, 215)),
    'NMP': list(range(30, 60)),
    'LID': list(range(122, 160)),
}
DOMAIN_ORDER = ['CORE', 'NMP', 'LID']

KD = dict(A=1.8, R=-4.5, N=-3.5, D=-3.5, C=2.5, Q=-3.5, E=-3.5, G=-0.4, H=-3.2, I=4.5,
          L=3.8, K=-3.9, M=1.9, F=2.8, P=-1.6, S=-0.8, T=-0.7, W=-0.9, Y=-1.3, V=4.2)
THREE_TO_ONE = dict(ALA='A', ARG='R', ASN='N', ASP='D', CYS='C', GLN='Q', GLU='E', GLY='G',
                    HIS='H', HSD='H', HSE='H', HSP='H', ILE='I', LEU='L', LYS='K', MET='M',
                    PHE='F', PRO='P', SER='S', THR='T', TRP='W', TYR='Y', VAL='V')
# average residue masses (Da, residue within a chain) + water for the termini
MASS = dict(A=71.0788, R=156.1875, N=114.1038, D=115.0886, C=103.1388, Q=128.1307, E=129.1155,
            G=57.0519, H=137.1411, I=113.1594, L=113.1594, K=128.1741, M=131.1926, F=147.1766,
            P=97.1167, S=87.0782, T=101.1051, W=186.2132, Y=163.1760, V=99.1326)


def log(*a):
    print(*a, file=sys.stderr, flush=True)


# --------------------------------------------------------------------------- IO
def parse_pdb(path):
    names, resn, resi, xyz = [], [], [], []
    for line in open(path):
        if not line.startswith('ATOM'):
            continue
        names.append(line[12:16].strip())
        resn.append(line[17:21].strip())
        resi.append(int(line[22:26]))
        xyz.append((float(line[30:38]), float(line[38:46]), float(line[46:54])))
    names = np.array(names)
    elem = np.array([n.lstrip('0123456789')[0] for n in names])
    return dict(name=names, resn=np.array(resn), resi=np.array(resi), xyz=np.array(xyz), elem=elem)


def _pqr_names(path):
    return [line.split()[2] for line in open(path) if line.startswith('ATOM')]


def parse_pqr(path):
    xyz, q = [], []
    for line in open(path):
        if not line.startswith('ATOM'):
            continue
        t = line.split()
        xyz.append((float(t[-5]), float(t[-4]), float(t[-3])))
        q.append(float(t[-2]))
    return np.array(xyz), np.array(q)


# ------------------------------------------------------------------- geometry
def kabsch(P, Q):
    """Rigid transform (R, t) minimising |R P + t - Q|."""
    pm, qm = P.mean(0), Q.mean(0)
    U, _, Vt = np.linalg.svd((P - pm).T @ (Q - qm))
    d = np.sign(np.linalg.det(U @ Vt))
    R = (U @ np.diag([1, 1, d]) @ Vt).T
    return R, qm - R @ pm


def screw(R, t):
    """x' = R x + t  ->  rotation about an axis through `pivot` plus a shift along it."""
    cos = np.clip((np.trace(R) - 1) / 2, -1, 1)
    angle = math.acos(cos)
    if angle < 1e-6:
        n = np.linalg.norm(t)
        return dict(axis=(t / n if n else np.array([0., 0., 1.])), angle=0.0,
                    pivot=np.zeros(3), shift=float(n))
    a = np.array([R[2, 1] - R[1, 2], R[0, 2] - R[2, 0], R[1, 0] - R[0, 1]]) / (2 * math.sin(angle))
    a /= np.linalg.norm(a)
    s = float(a @ t)
    pivot = np.linalg.pinv(np.eye(3) - R) @ (t - s * a)
    pivot -= a * (pivot @ a)
    return dict(axis=a, angle=angle, pivot=pivot, shift=s)


def rodrigues(axis, angle):
    K = np.array([[0, -axis[2], axis[1]], [axis[2], 0, -axis[0]], [-axis[1], axis[0], 0]])
    return np.eye(3) + math.sin(angle) * K + (1 - math.cos(angle)) * (K @ K)


def apply_screw(sp, u, X):
    R = rodrigues(sp['axis'], u * sp['angle'])
    return (X - sp['pivot']) @ R.T + sp['pivot'] + u * sp['shift'] * sp['axis']


# -------------------------------------------------------------------- surface
def occupancy(xyz, rad, lo, shape):
    """Boolean grid: True where the solvent-excluded volume is."""
    inside = np.zeros(shape, bool)
    for p, r in zip(xyz, rad):
        rr = r + PROBE
        i0 = np.maximum(np.floor((p - rr - lo) / GRID_H).astype(int), 0)
        i1 = np.minimum(np.ceil((p + rr - lo) / GRID_H).astype(int) + 1, shape)
        gx = lo[0] + GRID_H * np.arange(i0[0], i1[0])[:, None, None]
        gy = lo[1] + GRID_H * np.arange(i0[1], i1[1])[None, :, None]
        gz = lo[2] + GRID_H * np.arange(i0[2], i1[2])[None, None, :]
        d2 = (gx - p[0]) ** 2 + (gy - p[1]) ** 2 + (gz - p[2]) ** 2
        inside[i0[0]:i1[0], i0[1]:i1[1], i0[2]:i1[2]] |= d2 <= rr * rr
    lab, _ = ndimage.label(~inside)
    exterior = lab == lab[0, 0, 0]
    dist = ndimage.distance_transform_edt(~exterior) * GRID_H
    return dist


def surface_mesh(dist, lo):
    verts, faces, _, _ = measure.marching_cubes(dist, level=PROBE, spacing=(GRID_H,) * 3)
    m = trimesh.Trimesh(verts + lo, faces, process=True)
    parts = m.split(only_watertight=False)
    m = max(parts, key=lambda p: len(p.faces))
    trimesh.smoothing.filter_taubin(m, lamb=0.5, nu=-0.53, iterations=14)
    if m.volume < 0:
        m.invert()
    return m


def decimate(m, target):
    r = max(0.0, 1.0 - target * 1.0 / len(m.vertices))
    pts, faces = fast_simplification.simplify(m.vertices, m.faces, target_reduction=r)
    d = trimesh.Trimesh(pts, faces, process=True)
    trimesh.smoothing.filter_taubin(d, lamb=0.5, nu=-0.53, iterations=4)
    return d


def adjacency(m):
    e = m.edges_unique
    n = len(m.vertices)
    A = sparse.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n))
    A = (A + A.T).tocsr()
    d = np.asarray(A.sum(1)).ravel()
    return sparse.diags(1.0 / np.maximum(d, 1)) @ A


def smooth_field(A, f, iters=2):
    for _ in range(iters):
        f = 0.5 * f + 0.5 * (A @ f)
    return f


# ----------------------------------------------------------------- SASA & AO
def fibonacci_sphere(n):
    i = np.arange(n) + 0.5
    phi = math.pi * (3 - math.sqrt(5)) * i
    z = 1 - 2 * i / n
    r = np.sqrt(1 - z * z)
    return np.stack([r * np.cos(phi), r * np.sin(phi), z], 1)


def sasa_per_atom(xyz, rad, n_pts=200):
    pts = fibonacci_sphere(n_pts)
    tree = cKDTree(xyz)
    out = np.zeros(len(xyz))
    rmax = rad.max()
    for i, (p, r) in enumerate(zip(xyz, rad)):
        nb = [j for j in tree.query_ball_point(p, r + rmax + 2 * PROBE) if j != i]
        sp = p + (r + PROBE) * pts
        free = np.ones(n_pts, bool)
        for j in nb:
            free &= np.sum((sp - xyz[j]) ** 2, 1) >= (rad[j] + PROBE) ** 2
        out[i] = free.mean() * 4 * math.pi * (r + PROBE) ** 2
    return out


def hemisphere_dirs(n):
    """Cosine-weighted directions in the +z hemisphere."""
    i = np.arange(n) + 0.5
    phi = math.pi * (3 - math.sqrt(5)) * i
    cz = np.sqrt(1 - i / n)
    sr = np.sqrt(1 - cz * cz)
    return np.stack([sr * np.cos(phi), sr * np.sin(phi), cz], 1)


def ambient_occlusion(points, normals, solid, lo, n_dirs=56, max_d=22.0, step=1.0):
    local = hemisphere_dirs(n_dirs)
    up = np.where(np.abs(normals[:, 2:3]) < 0.9, np.array([[0, 0, 1.0]]), np.array([[1.0, 0, 0]]))
    t1 = np.cross(normals, up)
    t1 /= np.linalg.norm(t1, axis=1, keepdims=True)
    t2 = np.cross(normals, t1)
    shape = np.array(solid.shape)
    ss = np.arange(1.6, max_d, step)
    out = np.zeros(len(points))
    for c in range(0, len(points), 2500):
        sl = slice(c, c + 2500)
        n, a, b, p = normals[sl], t1[sl], t2[sl], points[sl]
        dirs = (local[None, :, 0:1] * a[:, None, :] + local[None, :, 1:2] * b[:, None, :]
                + local[None, :, 2:3] * n[:, None, :])                     # (v, k, 3)
        pos = p[:, None, None, :] + dirs[:, :, None, :] * ss[None, None, :, None]
        idx = np.floor((pos - lo) / GRID_H).astype(int)
        ok = np.all((idx >= 0) & (idx < shape), axis=-1)
        idx = np.clip(idx, 0, shape - 1)
        hit = solid[idx[..., 0], idx[..., 1], idx[..., 2]] & ok               # (v, k, s)
        first = np.where(hit.any(-1), hit.argmax(-1), len(ss))
        d = np.where(first < len(ss), ss[np.minimum(first, len(ss) - 1)], np.inf)
        occl = np.clip(1 - d / max_d, 0, 1)
        out[sl] = occl.mean(1)
    return out


def potential(points, qxyz, q, kappa=0.1, slope=4.0, rmin=1.5):
    """Screened Coulomb potential, distance-dependent dielectric eps = slope * r."""
    out = np.zeros(len(points))
    for c in range(0, len(points), 1200):
        d = np.linalg.norm(points[c:c + 1200, None, :] - qxyz[None, :, :], axis=-1)
        d = np.maximum(d, rmin)
        out[c:c + 1200] = (332.0636 * q[None, :] * np.exp(-kappa * d) / (slope * d * d)).sum(1)
    return out


# ------------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True, help='directory with adk_open.pdb, adk_closed.pdb, adk_open.pqr')
    ap.add_argument('--out', default='assets/data')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    op = parse_pdb(os.path.join(args.data, 'adk_open.pdb'))
    cl = parse_pdb(os.path.join(args.data, 'adk_closed.pdb'))
    qxyz, qval = parse_pqr(os.path.join(args.data, 'adk_open.pqr'))
    assert len(op['xyz']) == len(cl['xyz'])
    assert np.all(op['name'] == cl['name']) and np.all(op['resi'] == cl['resi'])

    # charges: PDB2PQR re-places hydrogens, so only the heavy atoms must coincide with the PDB model;
    # the potential is then computed from the PQR sites themselves.
    pqr_heavy = np.array([n[0] != 'H' for n in _pqr_names(os.path.join(args.data, 'adk_open.pqr'))])
    dd, _ = cKDTree(op['xyz'][op['elem'] != 'H']).query(qxyz[pqr_heavy])
    assert dd.max() < 0.02, 'PQR heavy atoms differ from the PDB model: %.3f' % dd.max()
    q = qval
    log('total charge (PQR) = %.2f e' % q.sum())

    heavy = op['elem'] != 'H'
    hx_open = op['xyz'][heavy]
    names, resn, resi, elem = op['name'][heavy], op['resn'][heavy], op['resi'][heavy], op['elem'][heavy]
    rad = np.array([RADII[e] for e in elem])
    n_res = int(op['resi'].max())

    # --- align the closed model onto the open one using the rigid core
    dom_of_res = np.zeros(n_res + 1, int)
    for k, name in enumerate(DOMAIN_ORDER):
        for r in DOMAINS[name]:
            dom_of_res[r] = k
    bb = np.isin(op['name'], list(BACKBONE))
    core_bb = bb & (dom_of_res[op['resi']] == 0)
    R0, t0 = kabsch(cl['xyz'][core_bb], op['xyz'][core_bb])
    cl_xyz = cl['xyz'] @ R0.T + t0
    rms = np.sqrt(((cl_xyz[core_bb] - op['xyz'][core_bb]) ** 2).sum(1).mean())
    log('core backbone RMSD after alignment: %.2f A' % rms)

    # --- rigid-body motion of each mobile domain, as a screw about its hinge
    transforms = {}
    for k, name in enumerate(DOMAIN_ORDER):
        sel = bb & (dom_of_res[op['resi']] == k)
        R, t = kabsch(op['xyz'][sel], cl_xyz[sel])
        transforms[name] = (R, t)
    T = [dict(axis=np.array([0., 0., 1.]), angle=0.0, pivot=np.zeros(3), shift=0.0)]
    for name in DOMAIN_ORDER[1:]:
        sp = screw(*transforms[name])
        chk = apply_screw(sp, 1.0, op['xyz'][bb]) - (op['xyz'][bb] @ transforms[name][0].T + transforms[name][1])
        assert np.abs(chk).max() < 1e-6, 'screw decomposition failed'
        T.append(sp)
        log('%s: rotation %.1f deg about hinge, shift %.2f A' % (name, math.degrees(sp['angle']), sp['shift']))

    # --- solvent-excluded surfaces of both conformations (shared grid)
    cl_heavy = cl_xyz[heavy]
    allp = np.vstack([hx_open, cl_heavy])
    lo = allp.min(0) - 10.0
    shape = np.ceil((allp.max(0) + 10.0 - lo) / GRID_H).astype(int) + 1
    log('grid', tuple(shape))
    dist_o = occupancy(hx_open, rad, lo, tuple(shape))
    dist_c = occupancy(cl_heavy, rad, lo, tuple(shape))
    mesh_o, mesh_c = surface_mesh(dist_o, lo), surface_mesh(dist_c, lo)
    solid_o, solid_c = dist_o > PROBE, dist_c > PROBE
    log('open  SES: %d verts, area %.0f A2, volume %.0f A3' % (len(mesh_o.vertices), mesh_o.area, mesh_o.volume))
    log('closed SES: %d verts, area %.0f A2, volume %.0f A3' % (len(mesh_c.vertices), mesh_c.area, mesh_c.volume))

    mesh = decimate(mesh_o, TARGET_VERTS)
    V = mesh.vertices.copy()
    N = mesh.vertex_normals.copy()
    nV = len(V)
    log('shipped mesh: %d vertices, %d triangles' % (nV, len(mesh.faces)))
    A = adjacency(mesh)

    # --- nearest-atom weights
    tree = cKDTree(hx_open)
    kd, ki = tree.query(V, k=18)
    def gauss(sig):
        w = np.exp(-(kd / sig) ** 2)
        return w / np.maximum(w.sum(1, keepdims=True), 1e-9)
    w_dom = gauss(2.0)
    wdom = np.zeros((nV, 3))
    for k in range(3):
        wdom[:, k] = (w_dom * (dom_of_res[resi[ki]] == k)).sum(1)
    for k in range(3):
        wdom[:, k] = smooth_field(A, wdom[:, k], 2)
    wdom /= wdom.sum(1, keepdims=True)

    # --- skinning at u = 1 and residual to the true atomic displacement
    lbs1 = np.zeros_like(V)
    for k in range(3):
        lbs1 += wdom[:, k:k + 1] * apply_screw(T[k], 1.0, V)
    disp_atoms = cl_heavy - hx_open
    target = V + (gauss(2.5)[:, :, None] * disp_atoms[ki]).sum(1)
    residual = target - lbs1
    rn = np.linalg.norm(residual, axis=1)
    log('residual after rigid skinning: mean %.2f, p95 %.2f, max %.2f A' % (rn.mean(), np.percentile(rn, 95), rn.max()))

    # quality: distance from the deformed surface to the true closed surface
    dtrue, _ = cKDTree(mesh_c.vertices).query(target)
    log('deformed open -> true closed surface: mean %.2f A, p95 %.2f A' % (dtrue.mean(), np.percentile(dtrue, 95)))

    # --- accessibility gain on opening -> the binding region hidden when closed
    sasa_o = sasa_per_atom(hx_open, rad)
    sasa_c = sasa_per_atom(cl_heavy, rad)
    res_ids = np.arange(1, n_res + 1)
    gain = np.array([sasa_o[resi == r].sum() - sasa_c[resi == r].sum() for r in res_ids])
    sasa_res_open = np.array([sasa_o[resi == r].sum() for r in res_ids])
    log('residues gaining > 20 A2 on opening: %d' % int((gain > 20).sum()))
    site_res = np.clip((gain - 8.0) / 45.0, 0, 1)
    site_atom = site_res[resi - 1]
    site = smooth_field(A, (gauss(2.2) * site_atom[ki]).sum(1), 4)
    site = np.clip(site / max(np.percentile(site, 99.5), 1e-6), 0, 1)

    # --- hydrophobicity
    seq1 = {}
    for r, n in zip(op['resi'], op['resn']):
        seq1[int(r)] = THREE_TO_ONE[n]
    seq = ''.join(seq1[r] for r in range(1, n_res + 1))
    hyd_atom = np.array([KD[seq1[int(r)]] / 4.5 for r in resi])
    hyd = smooth_field(A, (gauss(2.2) * hyd_atom[ki]).sum(1), 3)
    hyd = np.clip(hyd, -1, 1)

    # --- electrostatics (evaluated at the solvent-accessible surface)
    P = V + N * PROBE
    pot = potential(P, qxyz, q)
    his_res = sorted({int(r) for r, n in zip(op['resi'], op['resn']) if THREE_TO_ONE[n] == 'H'})
    ring = ['CG', 'ND1', 'CE1', 'NE2', 'CD2']
    cents = []
    for r in his_res:
        sel = (op['resi'] == r) & np.isin(op['name'], ring)
        cents.append(op['xyz'][sel].mean(0))
    cents = np.array(cents)
    dpot = potential(P, cents, np.ones(len(cents)), rmin=2.0)
    S = float(np.percentile(np.abs(pot), 93))
    pot8 = np.round(np.clip(pot / (2 * S), -1, 1) * 127).astype(np.int8)
    dpot8 = np.round(np.clip(dpot / (2 * S), -1, 1) * 127).astype(np.int8)
    log('potential scale S = %.2f ; pos frac %.2f ; extra(+His) mean %.2f S' % (S, (pot > 0).mean(), dpot.mean() / S))

    # --- ambient occlusion per conformation
    ao_o = ambient_occlusion(V + N * 1.0, N, solid_o, lo)
    # closed state: normals rotated with the blended domain rotations
    Nc = np.zeros_like(N)
    for k in range(3):
        Nc += wdom[:, k:k + 1] * (N @ rodrigues(T[k]['axis'], T[k]['angle']).T)
    Nc /= np.linalg.norm(Nc, axis=1, keepdims=True)
    ao_c = ambient_occlusion(target + Nc * 1.0, Nc, solid_c, lo)
    def vis(ao):
        return np.clip(1.0 - 1.45 * ao, 0.0, 1.0)
    log('AO open mean %.2f / closed mean %.2f' % (vis(ao_o).mean(), vis(ao_c).mean()))

    # --- site anchor (for the on-screen label): most representative site vertex
    cand = np.where(site > 0.85)[0]
    cen = V[cand].mean(0) if len(cand) else V[np.argmax(site)]
    anchor = int(cand[np.argmin(np.linalg.norm(V[cand] - cen, axis=1))]) if len(cand) else int(np.argmax(site))

    # --- recentre everything on the open surface
    centre = (V.min(0) + V.max(0)) / 2
    V -= centre
    for sp in T:
        sp['pivot'] = sp['pivot'] - centre
    cents -= centre
    radius = float(np.linalg.norm(V, axis=1).max())

    # --- composition & mass
    comp = {a: seq.count(a) for a in sorted(set(seq))}
    mass = sum(MASS[a] * n for a, n in comp.items()) + 18.015

    # --- binary layout
    blobs, layout = [], {}
    offset = 0
    def add(name, arr, item):
        nonlocal offset
        arr = np.ascontiguousarray(arr)
        pad = (-offset) % 4
        if pad:
            blobs.append(b'\0' * pad)
            offset += pad
        blobs.append(arr.tobytes())
        layout[name] = dict(offset=offset, count=int(arr.size // item), item=item, dtype=str(arr.dtype))
        offset += arr.nbytes

    rscale = float(np.abs(residual).max() / 32767)
    pad4 = lambda a, fill=0: np.hstack([a, np.full((len(a), 4 - a.shape[1]), fill, a.dtype)])
    add('position', V.astype(np.float32), 3)
    add('normal', pad4(np.round(N * 127).astype(np.int8)), 4)
    add('residual', pad4(np.round(residual / rscale).astype(np.int16)), 4)
    add('weights', pad4(np.round(wdom * 255).astype(np.uint8)), 4)
    add('scalars', np.stack([np.round(site * 255), np.round((hyd * 0.5 + 0.5) * 255),
                             np.round(vis(ao_o) * 255), np.round(vis(ao_c) * 255)], 1).astype(np.uint8), 4)
    add('potential', pad4(np.stack([pot8, dpot8], 1)), 4)
    add('index', mesh.faces.astype(np.uint32), 3)

    with open(os.path.join(args.out, 'adk.bin'), 'wb') as f:
        for b in blobs:
            f.write(b)

    def vec(a):
        return [round(float(x), 5) for x in a]
    meta = dict(
        source=dict(
            protein='Adénylate kinase (Escherichia coli)',
            open='PDB 4AKE', closed='PDB 1AKE',
            note='Modèles tout-atome distribués avec les données de test de MDAnalysis',
        ),
        vertices=int(nV), triangles=int(len(mesh.faces)), radius=round(radius, 3),
        residualScale=rscale, potentialScale=2.0,
        domains=[dict(name=n, residues=[min(DOMAINS[n]), max(DOMAINS[n])] if n != 'CORE' else '1–29, 60–121, 160–214',
                      axis=vec(sp['axis']), angle=round(sp['angle'], 6), angleDeg=round(math.degrees(sp['angle']), 1),
                      pivot=vec(sp['pivot']), shift=round(sp['shift'], 4))
                 for n, sp in zip(DOMAIN_ORDER, T)],
        anchor=anchor,
        histidines=[dict(residue=r, centroid=vec(c)) for r, c in zip(his_res, cents)],
        composition=comp, residues=n_res, heavyAtoms=int(heavy.sum()), massDa=round(mass, 1),
        netChargeNeutralHis=round(float(qval.sum()), 2),
        surface=dict(openArea=round(float(mesh_o.area)), closedArea=round(float(mesh_c.area)),
                     openVolume=round(float(mesh_o.volume)), closedVolume=round(float(mesh_c.volume))),
        quality=dict(coreRmsd=round(float(rms), 2), meanResidual=round(float(rn.mean()), 2),
                     meanErrorToClosedSurface=round(float(dtrue.mean()), 2),
                     p95ErrorToClosedSurface=round(float(np.percentile(dtrue, 95)), 2)),
        siteResidues=[int(r) for r in res_ids[gain > 20]],
        buffers=layout,
    )
    with open(os.path.join(args.out, 'adk.json'), 'w') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    log('wrote %s (%.2f MB)' % (os.path.join(args.out, 'adk.bin'), offset / 1e6))


if __name__ == '__main__':
    main()
