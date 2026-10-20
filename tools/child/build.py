"""Construit l'enfant (maillage décimé, normales, occlusion ambiante, matières, poids de peau) et l'écrit dans assets/data/child.json.
Nécessite numpy, scikit-image et fast-simplification.
Usage : python tools/child/build.py --h 0.4 --faces 36000"""
import sys, json, time, base64, argparse, pathlib
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import fast_simplification as fs
import child as C
from mesh import sample_grid, marching, gradient, ambient_occlusion


def b64(a):
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--h', type=float, default=0.45)
    ap.add_argument('--faces', type=int, default=36000)
    ap.add_argument('--out', default=str(pathlib.Path(__file__).resolve().parents[2] / 'assets/data/child.json'))
    a = ap.parse_args()
    t0 = time.time()
    vol, lo = sample_grid(C.child_sdf, (-21.0, -1.0, -19.0), (24.0, 125.0, 19.0), a.h)
    V, F = marching(vol, lo, a.h)
    del vol
    print('grille', len(V), 'sommets', len(F), 'faces', round(time.time() - t0), 's')
    ratio = 1.0 - a.faces / len(F)
    V2, F2 = fs.simplify(V, F, target_reduction=max(0.0, min(0.97, ratio)))
    V2 = V2.astype(np.float32); F2 = F2.astype(np.int32)
    N = gradient(C.child_sdf, V2)
    AO = ambient_occlusion(C.child_sdf, V2, N)
    W = C.material_weights(V2)
    M = np.argmax(W, axis=1).astype(np.uint8)
    BI, BW = C.skin_weights(V2)
    print('final', len(V2), 'sommets', len(F2), 'faces', round(time.time() - t0), 's', 'matières', np.bincount(M, minlength=8).tolist())
    lo_b, hi_b = V2.min(0), V2.max(0)
    q = np.round((V2 - lo_b) / (hi_b - lo_b) * 65535 - 32768).astype(np.int16)
    wq = np.round(BW * 255).astype(np.uint8)
    # que la somme fasse bien 255 : on corrige le plus gros poids
    wq[np.arange(len(wq)), np.argmax(wq, axis=1)] += (255 - wq.sum(axis=1)).astype(np.uint8)
    out = {
        'n': int(len(V2)), 'min': lo_b.round(4).tolist(), 'max': hi_b.round(4).tolist(),
        'position': b64(q), 'normal': b64(np.round(N * 127).astype(np.int8)), 'ao': b64(np.round(AO * 255).astype(np.uint8)),
        'matW0': b64(np.round(W[:, :4] * 255).astype(np.uint8)), 'matW1': b64(np.round(W[:, 4:] * 255).astype(np.uint8)), 'boneIndex': b64(BI), 'boneWeight': b64(wq),
        'index': b64(F2.astype(np.uint16) if len(V2) < 65536 else F2.astype(np.uint32)), 'index32': bool(len(V2) >= 65536),
        'bones': C.BONES,
        'rig': {n: [list(map(float, p)) for p in C.JOINTS[n]] for n in C.BONES},
    }
    pathlib.Path(a.out).write_text(json.dumps(out))
    print('écrit', a.out, round(pathlib.Path(a.out).stat().st_size / 1024), 'Ko', round(time.time() - t0), 's')


if __name__ == '__main__':
    main()
