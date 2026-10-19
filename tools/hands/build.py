"""Construit les deux mains de l'accueil (maillages décimés, avec occlusion ambiante et épaisseur)
et les écrit dans assets/data/hands.json. Nécessite numpy, scikit-image et fast-simplification.
Usage : python tools/hands/build.py --h 0.09 --faces 70000"""
import sys, json, time, base64, argparse, pathlib
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import fast_simplification as fs
from hand import hand_sdf, finger_points, FINGERS
from mesh import sample_grid, marching, gradient, ambient_occlusion, thickness

# deux poses : Adam, la main qui s'abandonne, et la main tendue qui cherche
POSES = {
    'adam': dict(index=(7, 5, 2, 3.0), middle=(20, 24, 12, 0.0), ring=(28, 34, 18, -2.0), pinky=(34, 40, 22, -6.0),
                 thumb=dict(abd=4.0, curl=0.1), wrist=14.0),
    'maker': dict(index=(0, 1, 0, 1.0), middle=(9, 11, 6, 0.0), ring=(22, 28, 16, -1.5), pinky=(28, 34, 20, -4.0),
                  thumb=dict(abd=-2.0, curl=0.0), wrist=-5.0),
}


def b64(a):
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()


def build(name, pose, h, faces, forearm):
    fn = lambda P: hand_sdf(P, pose, forearm)
    t0 = time.time()
    vol, lo = sample_grid(fn, (-forearm - 1.5, -8.0, -9.5), (23.5, 8.0, 12.0), h)
    V, F = marching(vol, lo, h)
    print(name, 'grille', vol.shape, 'sommets', len(V), 'faces', len(F), round(time.time() - t0), 's')
    del vol
    ratio = 1.0 - faces / len(F)
    V2, F2 = fs.simplify(V, F, target_reduction=max(0.0, min(0.97, ratio)))
    V2 = V2.astype(np.float32); F2 = F2.astype(np.int32)
    N = gradient(fn, V2)
    AO = ambient_occlusion(fn, V2, N)
    TH = thickness(fn, V2, N)
    # extrémité de l'index, pour les placer l'une en face de l'autre
    # le doigt subit la rotation du poignet : la géométrie tourne de -wrist, la pointe aussi
    J, _, _, _ = finger_points(FINGERS['index'], pose['index'][:3], pose['index'][3])
    a = np.radians(pose.get('wrist', 0.0))
    cx, sx = np.cos(-a), np.sin(-a)
    tip = np.array([J[3][0] * cx - J[3][1] * sx, J[3][0] * sx + J[3][1] * cx, J[3][2]])
    print(name, 'final', len(V2), 'sommets', len(F2), 'faces', round(time.time() - t0), 's', 'pointe de l\'index', tip.round(2))
    lo_b, hi_b = V2.min(0), V2.max(0)
    q = np.round((V2 - lo_b) / (hi_b - lo_b) * 65535 - 32768).astype(np.int16)
    return {
        'name': name, 'n': int(len(V2)), 'min': lo_b.round(4).tolist(), 'max': hi_b.round(4).tolist(),
        'tip': tip.round(3).tolist(),
        'position': b64(q), 'normal': b64(np.round(N * 127).astype(np.int8)),
        'ao': b64(np.round(AO * 255).astype(np.uint8)), 'thick': b64(np.round(TH * 255).astype(np.uint8)),
        'index': b64(F2.astype(np.uint16) if len(V2) < 65536 else F2.astype(np.uint32)),
        'index32': bool(len(V2) >= 65536),
    }


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--h', type=float, default=0.12)
    ap.add_argument('--faces', type=int, default=60000)
    ap.add_argument('--forearm', type=float, default=30.0)
    ap.add_argument('--out', default=str(pathlib.Path(__file__).resolve().parents[2] / 'assets/data/hands.json'))
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    out = {'hands': []}
    for name, pose in POSES.items():
        if a.only and a.only != name:
            continue
        out['hands'].append(build(name, pose, a.h, a.faces, a.forearm))
    pathlib.Path(a.out).write_text(json.dumps(out))
    print('écrit', a.out, round(pathlib.Path(a.out).stat().st_size / 1024), 'Ko')
