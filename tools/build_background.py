#!/usr/bin/env python3
"""
Données du fond animé de l'accueil : une petite molécule (la biotine) entourée d'un faisceau de six hélices,
comme une protéine générée autour d'elle. C'est une illustration décorative.

Sortie : assets/data/pocket.json (squelette de la protéine et atomes de la molécule, en Angstroms).
Usage  : python3 tools/build_background.py [--out assets/data/pocket.json] [--rdkit-path ...]
Dépend de numpy, scipy et rdkit. Les fonctions de géométrie (hélice idéale, boucles, relaxation) sont
reprises de l'ancien générateur, passé en argument avec --helpers.
"""
import argparse, json, math, sys, os
import numpy as np
from scipy.spatial import cKDTree

ap = argparse.ArgumentParser()
ap.add_argument('--out', default='assets/data/pocket.json')
ap.add_argument('--helpers', default=os.path.join(os.path.dirname(__file__), 'geometry_helpers.py'))
args = ap.parse_args()
sys.path.insert(0, os.path.dirname(os.path.abspath(args.helpers)))
from geometry_helpers import hermite, relax_chain, unit, CA   # noqa: E402

from rdkit import Chem
from rdkit.Chem import AllChem

COIL, HELIX = 0, 1

# ---- la molécule
mol = Chem.AddHs(Chem.MolFromSmiles('O=C(O)CCCC[C@@H]1SC[C@@H]2NC(=O)N[C@H]12'))
AllChem.EmbedMolecule(mol, randomSeed=7)
AllChem.MMFFOptimizeMolecule(mol)
heavy = [a.GetIdx() for a in mol.GetAtoms() if a.GetAtomicNum() > 1]
pos = np.array(mol.GetConformer().GetPositions())[heavy]
pos -= pos.mean(0)
u, s, vt = np.linalg.svd(pos, full_matrices=False)
pos = pos @ vt.T                                   # axe principal le long de x
pos = pos @ np.array([[0, 0, 1], [1, 0, 0], [0, 1, 0]]).T   # le long de z, comme le faisceau
remap = {old: new for new, old in enumerate(heavy)}
bonds = [[remap[b.GetBeginAtomIdx()], remap[b.GetEndAtomIdx()], int(b.GetBondTypeAsDouble())]
         for b in mol.GetBonds() if b.GetBeginAtom().GetAtomicNum() > 1 and b.GetEndAtom().GetAtomicNum() > 1]
elements = [mol.GetAtomWithIdx(i).GetSymbol() for i in heavy]
print(len(heavy), 'atomes lourds, extension', np.round(np.ptp(pos, axis=0), 1))

# ---- les hélices autour de la molécule
N_H, N_RES, R = 6, 18, 12.4
helices = []
for k in range(N_H):
    th = 2 * math.pi * k / N_H + 0.35
    radial = np.array([math.cos(th), math.sin(th), 0.0])
    tang = np.array([-math.sin(th), math.cos(th), 0.0])
    d = 1 if k % 2 == 0 else -1
    axis = unit(math.cos(math.radians(14)) * np.array([0, 0, d]) + math.sin(math.radians(14)) * tang * d)
    perp1 = unit(np.cross(axis, radial)); perp2 = np.cross(axis, perp1)
    centre = radial * R
    idx = np.arange(N_RES)
    ang = np.deg2rad(100.0) * idx + k * 1.1
    pts = (centre + axis * (idx[:, None] * 1.5 - (N_RES - 1) * 0.75)
           + 2.3 * (np.cos(ang)[:, None] * perp1 + np.sin(ang)[:, None] * perp2))
    helices.append((pts, axis))

lig_tree = cKDTree(pos)
chain, ss, orient = [], [], []
loops = []

def add_helix(h):
    pts, axis = h
    chain.extend(pts); ss.extend([HELIX] * len(pts)); orient.extend([axis] * len(pts))

# extrémité N terminale libre
start = helices[0][0][0]
nterm = [start + unit(start - np.array([0, 0, 0]) + np.array([0, 0, -1.2])) * CA * (3 - i) for i in range(3)]
chain.extend(nterm); ss.extend([COIL] * 3); orient.extend([helices[0][1]] * 3)
add_helix(helices[0])
for k in range(N_H - 1):
    a, b = helices[k][0][-1], helices[k + 1][0][0]
    ta, tb = unit(helices[k][1]) , unit(helices[k + 1][1])
    obstacles = np.vstack([h[0] for h in helices] + [pos])
    keep = ~(np.isclose(obstacles, a).all(1) | np.isclose(obstacles, b).all(1))
    L = hermite(a, ta, b, tb, scale=1.4, min_res=2)
    X = relax_chain(np.vstack([a, L, b]), fixed=(0, len(L) + 1), obstacles=obstacles[keep], iters=300, rep=4.4)
    inner = X[1:-1]
    chain.extend(inner); ss.extend([COIL] * len(inner)); orient.extend([unit(0.5 * (helices[k][1] + helices[k + 1][1]))] * len(inner))
    add_helix(helices[k + 1])
end = helices[-1][0][-1]
cterm = [end + unit(end * 0.3 + np.array([0, 0, 1.0 if helices[-1][1][2] > 0 else -1.0])) * CA * (i + 1) for i in range(3)]
chain.extend(cterm); ss.extend([COIL] * 3); orient.extend([helices[-1][1]] * 3)

P = np.array(chain); O = np.array(orient); SS = np.array(ss)
d = np.linalg.norm(np.diff(P, axis=0), axis=1)
D = np.linalg.norm(P[:, None] - P[None], axis=2)
iu = np.triu_indices(len(P), 3)
print(len(P), 'résidus, liaisons', round(d.min(), 2), '-', round(d.max(), 2), ', contact le plus proche', round(D[iu].min(), 2),
      ', distance minimale à la molécule', round(lig_tree.query(P)[0].min(), 2))

t = np.linspace(0, 1, len(P))
out = dict(
    n=int(len(P)),
    ca=[[round(float(v), 2) for v in x] for x in P],
    o=[[round(float(v), 3) for v in x] for x in O],
    ss=[int(x) for x in SS],
    t=[round(float(x), 3) for x in t],
    ligand=dict(el=elements, xyz=[[round(float(v), 2) for v in x] for x in pos], bonds=bonds),
    radius=round(float(np.linalg.norm(P, axis=1).max()), 1),
)
json.dump(out, open(args.out, 'w'), separators=(',', ':'))
print('écrit', args.out, round(os.path.getsize(args.out) / 1024, 1), 'Ko')
