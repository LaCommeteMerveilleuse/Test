#!/usr/bin/env python3
"""
Build assets/data/binder.json — the "generated binder" drawn on the site.

What this is, and what it is not
  * The TARGET is the real adenylate-kinase surface produced by build_protein.py (assets/data/adk.*).
  * The BINDER is an IDEALISED two-domain protein constructed here from textbook geometry:
    two ferredoxin-like domains (beta-alpha-beta-beta-alpha-beta, ideal alpha-helix and beta-strand
    coordinates) joined by a flexible linker. It is NOT the output of a design model.
  * Its placement on the target is a rigid-body search for shape complementarity (no clashes, many
    contacts) — NOT a validated docking and not a binding prediction.
  * The self-assembled ("aggregated") state is a packing of three copies that hides each domain's
    target-binding face inside the assembly; it is an illustration of the mechanism BlackPhage aims for.

Everything is expressed in the coordinate frame of the target mesh (Angstrom).

Usage
  python3 tools/build_binder.py --data assets/data --out assets/data/binder.json [--plot debug.png]
Requires numpy, scipy (and matplotlib for --plot).
"""
import argparse
import json
import math
import os
import sys

import numpy as np
from scipy.optimize import minimize
from scipy.spatial import cKDTree
from scipy.spatial.distance import cdist
from scipy.spatial.transform import Rotation as Rot

CA = 3.8                      # virtual CA-CA bond (A)
COIL, HELIX, STRAND = 0, 1, 2
N_COPIES = 3


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def unit(v):
    v = np.asarray(v, float)
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.where(n > 0, n, 1)


# --------------------------------------------------------------------------- target
class Target:
    def __init__(self, data_dir):
        meta = json.load(open(os.path.join(data_dir, 'adk.json')))
        buf = open(os.path.join(data_dir, 'adk.bin'), 'rb').read()

        def arr(name):
            d = meta['buffers'][name]
            a = np.frombuffer(buf, dtype=np.dtype(d['dtype']), count=d['count'] * d['item'], offset=d['offset'])
            return a.reshape(d['count'], d['item'])

        self.V = arr('position').astype(float)
        self.N = unit(arr('normal')[:, :3].astype(float) / 127.0)
        self.occ = 1.0 - arr('scalars')[:, 2].astype(float) / 255.0     # 0 = open, 1 = buried
        self.tree = cKDTree(self.V)
        self.centre = self.V.mean(0)
        self.radius = float(np.linalg.norm(self.V - self.centre, axis=1).max())

    def sdf(self, Q):
        Q = np.asarray(Q, float).reshape(-1, 3)
        d, i = self.tree.query(Q)
        s = np.einsum('ij,ij->i', Q - self.V[i], self.N[i])
        return np.where(s >= 0, d, -d)

    def normal(self, Q):
        _, i = self.tree.query(np.asarray(Q, float).reshape(-1, 3))
        return self.N[i]


# ------------------------------------------------------------------ chain relaxation
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


def resample(P, n):
    """n points equally spaced in arc length along polyline P (end points included)."""
    P = np.asarray(P, float)
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    t = np.linspace(0, s[-1], n)
    return np.stack([np.interp(t, s, P[:, k]) for k in range(3)], 1), s[-1]


# --------------------------------------------------------------------- the domain
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


def build_domain():
    """Ferredoxin-like domain: b1 a1 b2 b3 a2 b4; sheet order 4-1-3-2, helices on one face."""
    rise, amp, ns, nh = 3.3, 0.94, 6, 12

    def bend(p):
        th = -0.045 * p[0]
        c, s = math.cos(th), math.sin(th)
        return np.array([c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]]), th

    def rot_y(v, th):
        c, s = math.cos(th), math.sin(th)
        return np.array([c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]])

    def strand(x, d):
        k = np.arange(ns)
        raw = np.stack([np.full(ns, x), d * (k * rise - (ns - 1) * rise / 2), amp * (-1.0) ** k], 1)
        P, O = [], []
        for p in raw:
            q, th = bend(p)
            P.append(q)
            O.append(rot_y(np.array([1.0, 0, 0]), th))
        return np.array(P), np.array(O), np.array([0, d, 0.0]), STRAND

    def helix(xc, d, phase):
        k = np.arange(nh)
        ang = np.deg2rad(100.0) * k + phase
        lift = 0.045 * xc * xc                      # height of the cupped sheet under the helix axis
        P = np.stack([xc + 2.3 * np.cos(ang), d * (k * 1.5 - (nh - 1) * 0.75), 10.5 + lift + 2.3 * np.sin(ang)], 1)
        return P, np.tile([0, d, 0.0], (nh, 1)), np.array([0, d, 0.0]), HELIX

    elems = [strand(-2.4, +1), helix(-4.6, -1, 0.3), strand(7.2, +1),
             strand(2.4, -1), helix(4.6, +1, 2.6), strand(-7.2, -1)]

    # first pass: elements only, then loops one by one, relaxed against everything else
    allP = [e[0] for e in elems]
    loops = []
    for i in range(len(elems) - 1):
        a_el, b_el = elems[i], elems[i + 1]
        a, b = a_el[0][-1], b_el[0][0]
        ta, tb = unit(a_el[2]), unit(b_el[2])
        hairpin = np.linalg.norm(b - a) < 6
        loops.append(hermite(a, ta, b, tb, scale=1.5 if not hairpin else 1.0, min_res=2 if hairpin else 1))

    for rnd in range(3):
        for i in range(len(loops)):
            others = [elems[j][0] for j in range(len(elems))] + [loops[j] for j in range(len(loops)) if j != i]
            obs = np.vstack(others)
            # exclude the two residues the loop is bonded to so they do not repel the loop ends
            a, b = elems[i][0][-1], elems[i + 1][0][0]
            X = np.vstack([a, loops[i], b])
            keep = ~(np.isclose(obs, a).all(1) | np.isclose(obs, b).all(1))
            X = relax_chain(X, fixed=(0, len(X) - 1), obstacles=obs[keep], iters=220, rep=4.4)
            loops[i] = X[1:-1]

    P, O, ss, seg = [], [], [], []
    for i, e in enumerate(elems):
        P.extend(e[0]); O.extend(e[1]); ss.extend([e[3]] * len(e[0])); seg.extend([f'e{i}'] * len(e[0]))
        if i < len(loops):
            L = loops[i]
            o_a, o_b = e[1][-1], elems[i + 1][1][0]
            for j in range(len(L)):
                f = (j + 1) / (len(L) + 1)
                v = (1 - f) * o_a + f * o_b
                O.append(unit(v)); P.append(L[j]); ss.append(COIL); seg.append(f'l{i}')
    P, O, ss = np.array(P), np.array(O), np.array(ss, dtype=int)

    d = np.linalg.norm(np.diff(P, axis=0), axis=1)
    D = cdist(P, P)
    iu = np.triu_indices(len(P), 3)
    log('domain: %d residues, CA-CA %.2f-%.2f (mean %.2f), closest non-bonded pair %.2f A'
        % (len(P), d.min(), d.max(), d.mean(), D[iu].min()))
    return P, O, ss


# ------------------------------------------------------------------------ docking
def solve_clash(Xc, R, t, n, target, clash, step=0.5, max_steps=80):
    for _ in range(max_steps):
        if target.sdf(Xc @ R.T + t).min() >= clash:
            return t
        t = t + n * step
    return t


def place_domain(Xc, target, p, n, extra=None, n_rot=2200, hill=450, seed=0, contact=7.8, clash=3.9):
    rng = np.random.default_rng(seed)
    Rm = Rot.random(n_rot, random_state=seed).as_matrix()
    PR = np.einsum('kij,mj->kmi', Rm, Xc)
    lo, hi = np.zeros(n_rot), np.full(n_rot, 70.0)
    for _ in range(14):
        mid = (lo + hi) / 2
        s = target.sdf((p + mid[:, None, None] * n + PR).reshape(-1, 3)).reshape(n_rot, -1)
        ok = s.min(1) >= clash
        hi, lo = np.where(ok, mid, hi), np.where(ok, lo, mid)
    pts = p + hi[:, None, None] * n + PR
    s = target.sdf(pts.reshape(-1, 3)).reshape(n_rot, -1)
    score = (s < contact).sum(1).astype(float)
    if extra is not None:
        score = score + extra(pts)
    best_idx = np.argsort(-score)[:6]

    def evaluate(R, t):
        pts_ = Xc @ R.T + t
        sc = float((target.sdf(pts_) < contact).sum())
        return sc + (float(extra(pts_[None])[0]) if extra is not None else 0.0)

    best = None
    for k in best_idx:
        R, t = Rm[k], p + hi[k] * n
        sc = evaluate(R, t)
        for _ in range(hill):
            R2 = Rot.from_rotvec(rng.normal(size=3) * 0.09).as_matrix() @ R
            t2 = t + rng.normal(size=3) * 1.4
            t2 = solve_clash(Xc, R2, t2, n, target, clash)
            sc2 = evaluate(R2, t2)
            if sc2 >= sc:
                R, t, sc = R2, t2, sc2
        if best is None or sc > best[2]:
            best = (R, t, sc)
    R, t, sc = best
    s = target.sdf(Xc @ R.T + t)
    log('  placement: score %.1f, contacts %d / %d, min clearance %.2f A' % (sc, (s < contact).sum(), len(s), s.min()))
    face = unit(Xc[s < contact].mean(0)) if (s < contact).any() else np.array([0, 0, 1.0])
    return R, t, face


# -------------------------------------------------------------- states & export
def quat(R):
    return [round(float(x), 5) for x in Rot.from_matrix(R).as_quat()]     # x, y, z, w


def vec(v):
    return [round(float(x), 2) for x in v]


def bulge_path(a, b, n_res, away):
    """Parabolic arc from a to b whose arc length matches n_res bonds of 3.8 A."""
    d = np.linalg.norm(b - a)
    s = CA * (n_res + 1)
    h = math.sqrt(max(0.0, 3 * d * (s - d) / 8)) if s > d * 1.02 else 0.0
    ch = unit(b - a)
    away = away - ch * (away @ ch)
    away = unit(away) if np.linalg.norm(away) > 1e-6 else unit(np.cross(ch, [0.3, 0.8, 0.5]))
    t = np.linspace(0, 1, n_res + 2)[:, None]
    return a * (1 - t) + b * t + away * h * 4 * t * (1 - t)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default='assets/data')
    ap.add_argument('--out', default='assets/data/binder.json')
    ap.add_argument('--plot', default=None)
    args = ap.parse_args()

    tg = Target(args.data)
    log('target: %d vertices, radius %.1f A' % (len(tg.V), tg.radius))

    P, O, ss = build_domain()
    cen = P.mean(0)
    Xc = P - cen                                        # local, centred coordinates
    Oc = O.copy()
    nd = len(Xc)
    NT, CT = 0, nd - 1                                   # N- and C-terminal residue indices

    # ---- the two target patches (deep, broad concavities on opposite sides)
    sub = np.arange(0, len(tg.V), 7)
    st = cKDTree(tg.V[sub])
    occ_s = np.array([tg.occ[sub][ix].mean() for ix in st.query_ball_point(tg.V[sub], 11.0)])
    c0 = tg.centre
    # two sites at the opposite ends of the target's long axis, each at the deepest nearby concavity
    Vs = tg.V[sub] - c0
    axis = np.linalg.svd(Vs - Vs.mean(0), full_matrices=False)[2][0]
    proj = Vs @ axis
    hi_m, lo_m = proj >= 0.5 * proj.max(), proj <= 0.5 * proj.min()
    i1 = int(np.where(hi_m)[0][np.argmax(occ_s[hi_m])])
    i2 = int(np.where(lo_m)[0][np.argmax(occ_s[lo_m])])
    d1v = unit(Vs[i1])
    log('long axis extent %.0f A; sites at %.0f / %.0f A from the centre'
        % (np.ptp(proj), np.linalg.norm(Vs[i1]), np.linalg.norm(Vs[i2])))
    patches = []
    for i in (i1, i2):
        p = tg.V[sub[i]]
        nb = tg.tree.query_ball_point(p, 7.0)
        patches.append((p, unit(tg.N[nb].mean(0))))
    log('patches %.0f A apart, %.0f deg about the centre' %
        (np.linalg.norm(patches[0][0] - patches[1][0]),
         math.degrees(math.acos(np.clip(unit(patches[0][0] - c0) @ unit(patches[1][0] - c0), -1, 1)))))

    log('placing domain 1')
    R1, t1, face1 = place_domain(Xc, tg, patches[0][0], patches[0][1],
                                 extra=lambda pts: 0.6 * np.minimum(tg.sdf(pts[..., CT, :].reshape(-1, 3)).reshape(pts.shape[:-2]), 9.0),
                                 seed=1)
    cterm1 = Xc[CT] @ R1.T + t1

    log('placing domain 2')
    def exposed(pts, idx):
        q = pts[..., idx, :]
        return 0.6 * np.minimum(tg.sdf(q.reshape(-1, 3)).reshape(q.shape[:-1]), 9.0)
    extra = lambda pts: -0.12 * np.linalg.norm(pts[..., NT, :] - cterm1, axis=-1) + exposed(pts, NT)
    R2, t2, face2 = place_domain(Xc, tg, patches[1][0], patches[1][1], extra=extra, seed=2)
    nterm2 = Xc[NT] @ R2.T + t2
    pose1 = (R1, t1)
    pose2 = (R2, t2)

    # ---- the linker in the bound state: wrap over the front of the target
    zv = unit(np.cross(t1 - c0, t2 - c0))
    da, db = unit(cterm1 - c0), unit(nterm2 - c0)
    ts = np.linspace(0, 1, 70)
    ang = math.acos(np.clip(da @ db, -1, 1))
    dirs = []
    for t in ts:
        v = (math.sin((1 - t) * ang) * da + math.sin(t * ang) * db) / max(math.sin(ang), 1e-6)
        dirs.append(unit(v + zv * math.sin(math.pi * t) * 0.9))
    path = []
    rr = np.arange(2.0, 130.0, 0.5)
    for k, d in enumerate(dirs):
        s = tg.sdf(c0 + d[None, :] * rr[:, None])
        inside = np.where(s < 5.4)[0]
        r = rr[inside.max()] + 1.0 if len(inside) else 40.0
        path.append(c0 + d * r)
    path = np.array(path)
    path[0], path[-1] = cterm1, nterm2
    for _ in range(6):
        path[1:-1] = 0.5 * path[1:-1] + 0.25 * (path[:-2] + path[2:])
    plen = np.linalg.norm(np.diff(path, axis=0), axis=1).sum()
    L = max(10, int(math.ceil(plen * 1.04 / CA)) - 1)
    log('surface path %.0f A -> linker of %d residues' % (plen, L))

    world1 = Xc @ R1.T + t1
    world2 = Xc @ R2.T + t2
    init, _ = resample(path, L + 2)
    obstacles = np.vstack([world1[:-1], world2[1:]])
    link_bound = relax_chain(init, fixed=(0, L + 1), obstacles=obstacles, target=tg, iters=600)[1:-1]
    sb = tg.sdf(link_bound)
    log('bound linker: min clearance to target %.2f A, to domains %.2f A' %
        (sb.min(), cKDTree(obstacles).query(link_bound)[0].min()))

    # ---- view basis (x: domain 1 -> domain 2, z: towards the viewer, linker in front)
    xv = unit(t2 - t1)
    if np.dot(link_bound.mean(0) - c0, zv) < 0:
        zv = -zv
    yv = unit(np.cross(zv, xv))
    xv = unit(np.cross(yv, zv))
    B = np.stack([xv, yv, zv])                                   # rows = view axes

    def to_world(a, b, c=0.0):
        return c0 + xv * a + yv * b + zv * c

    # ---- the aggregated state: three copies, binding faces hidden in the assembly
    log('packing the assembly')
    faces = [face1, face2]
    linker_len = CA * (L + 1)
    rng = np.random.default_rng(11)

    def cluster_loss(v):
        V = v.reshape(2 * N_COPIES, 6)
        Rm = [Rot.from_rotvec(x[3:]).as_matrix() for x in V]
        T = V[:, :3]
        pts = [Xc @ Rm[j].T + T[j] for j in range(len(V))]
        loss = 0.0
        for a in range(len(V)):
            for b in range(a + 1, len(V)):
                d = cdist(pts[a], pts[b])
                loss += (np.clip(6.4 - d, 0, None) ** 2).sum()
        cen_ = T.mean(0)
        loss += 0.006 * ((T - cen_) ** 2).sum()
        for c in range(N_COPIES):
            j1, j2 = 2 * c, 2 * c + 1
            loss += 0.6 * max(0.0, np.linalg.norm(T[j1] - T[j2]) - 30.0) ** 2
            e = np.linalg.norm(pts[j1][CT] - pts[j2][NT])
            loss += 0.2 * max(0.0, e - 0.62 * linker_len) ** 2
        for j in range(len(V)):
            inward = unit(cen_ - T[j])
            loss += 9.0 * (1 - float((Rm[j] @ faces[j % 2]) @ inward))
        return loss

    best = None
    for rest in range(3):
        v0 = []
        for c in range(N_COPIES):
            th = 2 * math.pi * c / N_COPIES + rng.normal() * 0.1
            for z in (+13.0, -13.0):
                v0 += [16 * math.cos(th), 16 * math.sin(th), z, *Rot.random(random_state=int(rng.integers(1e6))).as_rotvec()]
        r = minimize(cluster_loss, np.array(v0), method='L-BFGS-B', options=dict(maxiter=160, maxfun=40000))
        log('  restart %d: loss %.1f' % (rest, r.fun))
        if best is None or r.fun < best.fun:
            best = r
    V = best.x.reshape(2 * N_COPIES, 6)
    cl_R = [Rot.from_rotvec(x[3:]).as_matrix() for x in V]
    cl_T = V[:, :3] - V[:, :3].mean(0)
    cl_pts = [Xc @ cl_R[j].T + cl_T[j] for j in range(2 * N_COPIES)]
    mind = min(cdist(cl_pts[a], cl_pts[b]).min() for a in range(6) for b in range(a + 1, 6))
    log('assembly: closest inter-domain CA pair %.2f A, radius %.1f A' %
        (mind, max(np.linalg.norm(p_, axis=1).max() for p_ in cl_pts)))

    cluster_centre = to_world(*CLUSTER_VIEW)
    cl_T = cl_T + cluster_centre
    cl_pts = [Xc @ cl_R[j].T + cl_T[j] for j in range(2 * N_COPIES)]
    all_cluster = np.vstack(cl_pts)

    # ---- dispersed monomers (copies 1 and 2): two domains apart, linker hanging free
    disp_view = {                                # offsets from the assembly's position, in view axes
        1: [(-50.0, 2.0, 10.0), (-55.0, -30.0, -8.0)],
        2: [(51.0, -2.0, -8.0), (46.0, -32.0, 10.0)],
    }
    states = []                                # states[copy][state] ; state 0 = active, 1 = assembled
    for c in range(N_COPIES):
        if c == 0:
            act = dict(d1=(R1, t1), d2=(R2, t2), linker=link_bound)
        else:
            (a1, b1, c1), (a2, b2, c2) = disp_view[c]
            Ra = Rot.random(random_state=100 + c).as_matrix()
            Rb = Rot.random(random_state=200 + c).as_matrix()
            ta_ = to_world(a1 + CLUSTER_VIEW[0], b1 + CLUSTER_VIEW[1], c1)
            tb_ = to_world(a2 + CLUSTER_VIEW[0], b2 + CLUSTER_VIEW[1], c2)
            ea, eb = Xc[CT] @ Ra.T + ta_, Xc[NT] @ Rb.T + tb_
            mid = (ea + eb) / 2
            init = bulge_path(ea, eb, L, unit(mid - c0) + 0.3 * zv)
            obs = np.vstack([Xc[:-1] @ Ra.T + ta_, Xc[1:] @ Rb.T + tb_])
            lk = relax_chain(init, fixed=(0, L + 1), obstacles=obs, iters=500)[1:-1]
            act = dict(d1=(Ra, ta_), d2=(Rb, tb_), linker=lk)
        j1, j2 = 2 * c, 2 * c + 1
        ea, eb = cl_pts[j1][CT], cl_pts[j2][NT]
        obs_all = np.vstack([cl_pts[j][1:-1] if j in (j1, j2) else cl_pts[j] for j in range(6)])
        away = unit((ea + eb) / 2 - cluster_centre)
        init = bulge_path(ea, eb, L, away)
        lk = relax_chain(init, fixed=(0, L + 1), obstacles=obs_all, iters=700, rep=5.2)[1:-1]
        agg = dict(d1=(cl_R[j1], cl_T[j1]), d2=(cl_R[j2], cl_T[j2]), linker=lk)
        states.append([act, agg])
        mc = cKDTree(obs_all).query(lk)[0].min()
        log('copy %d: assembled linker clearance %.2f A' % (c, mc))

    # ---- extents in view coordinates (for fitting the camera)
    def view_pts(state_idx, copies):
        pts = []
        for c in copies:
            s = states[c][state_idx]
            for key in ('d1', 'd2'):
                R, t = s[key]
                pts.append(Xc @ R.T + t)
            pts.append(s['linker'])
        return np.vstack(pts)

    def extent(binder_pts):
        pts = np.vstack([tg.V[::6], binder_pts]) - c0
        a, b = pts @ xv, pts @ yv
        return dict(x=[round(float(a.min()), 1), round(float(a.max()), 1)],
                    y=[round(float(b.min()), 1), round(float(b.max()), 1)])

    ext_bound = extent(view_pts(0, [0]))
    ext_all = extent(np.vstack([view_pts(0, range(N_COPIES)), view_pts(1, range(N_COPIES))]))
    log('extent bound', ext_bound, '| all', ext_all)

    # anchors for on-screen labels
    behind = tg.V[np.argmax((tg.V - c0) @ -yv)]
    anchors = dict(target=vec(behind), cluster=vec(cluster_centre))

    out = dict(
        note=('Idealised two-domain binder (ferredoxin-like beta-alpha-beta-beta-alpha-beta, twice) built by '
              'tools/build_binder.py. Placement on the target is a geometric search, not a validated docking.'),
        domain=dict(
            n=int(nd), ss=[int(x) for x in ss],
            ca=[vec(x) for x in Xc], o=[[round(float(v), 3) for v in x] for x in Oc],
            nterm=NT, cterm=CT,
            segments=dict(strands=int((ss == STRAND).sum()), helices=int((ss == HELIX).sum()),
                          coil=int((ss == COIL).sum())),
        ),
        linker=dict(n=int(L), contour=round(linker_len, 1)),
        copies=[[dict(
            d1=dict(q=quat(s['d1'][0]), t=vec(s['d1'][1])),
            d2=dict(q=quat(s['d2'][0]), t=vec(s['d2'][1])),
            linker=[vec(x) for x in s['linker']],
        ) for s in cs] for cs in states],
        view=dict(x=[round(float(v), 5) for v in xv], y=[round(float(v), 5) for v in yv],
                  z=[round(float(v), 5) for v in zv]),
        centre=vec(c0), radius=round(tg.radius, 1),
        extent=dict(bound=ext_bound, all=ext_all),
        anchors=anchors,
        faces=dict(d1=[round(float(v), 3) for v in face1], d2=[round(float(v), 3) for v in face2]),
    )
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    log('wrote %s (%.1f KB)' % (args.out, os.path.getsize(args.out) / 1024))

    if args.plot:
        plot(args.plot, tg, Xc, states, B, c0, ss)


CLUSTER_VIEW = (0.0, -68.0, 0.0)


def plot(path, tg, Xc, states, B, c0, ss):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(2, 2, figsize=(13, 12))
    cols = ['#e0479e', '#b44be0']
    for r, (si, title) in enumerate([(0, 'active (bound / dispersed)'), (1, 'assembled')]):
        for cidx, (a, b) in enumerate([(0, 1), (0, 2)]):
            A = ax[r, cidx]
            T = (tg.V[::9] - c0) @ B.T
            A.scatter(T[:, a], T[:, b], s=2, c='#9bb', alpha=0.5)
            for c, cs in enumerate(states):
                s = cs[si]
                for k, key in enumerate(('d1', 'd2')):
                    R, t = s[key]
                    X = (Xc @ R.T + t - c0) @ B.T
                    A.plot(X[:, a], X[:, b], '-', c=cols[k], lw=1.2 if c == 0 else 0.8, alpha=1 if c == 0 else 0.6)
                L = (s['linker'] - c0) @ B.T
                A.plot(L[:, a], L[:, b], '.-', c='#e8a050', lw=1)
            A.set_aspect('equal')
            A.set_title(title + (' — view plane' if cidx == 0 else ' — side'))
    fig.savefig(path, dpi=80)


if __name__ == '__main__':
    main()
