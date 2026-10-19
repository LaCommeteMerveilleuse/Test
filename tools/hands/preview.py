"""Aperçu rapide : maillage grossier d'une pose, exporté en JSON simple pour la page d'aperçu."""
import sys, json, time, argparse
import numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from hand import hand_sdf, DEFAULT_POSE
from mesh import sample_grid, marching, gradient

ap = argparse.ArgumentParser()
ap.add_argument('--h', type=float, default=0.16)
ap.add_argument('--out', default='preview_mesh.json')
ap.add_argument('--pose', default='')
a = ap.parse_args()
pose = json.loads(a.pose) if a.pose else None
fn = lambda P: hand_sdf(P, pose)
t0 = time.time()
vol, lo = sample_grid(fn, (-28, -7.5, -9.0), (23, 7.5, 12.0), a.h)
print('grille', vol.shape, round(time.time() - t0, 1), 's')
V, F = marching(vol, lo, a.h)
N = gradient(fn, V)
print('sommets', len(V), 'faces', len(F), round(time.time() - t0, 1), 's')
json.dump({'v': np.round(V, 3).ravel().tolist(), 'n': np.round(N, 3).ravel().tolist(), 'f': F.ravel().tolist()}, open(a.out, 'w'))
