import sys, time, importlib, numpy as np
from lib import *
mod, name, spp, w, h, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
m = importlib.import_module(mod)
fn, kw = m.SCENES[name]
t0 = time.time()
scene = fn(w, h, spp)
sensor = scene['sensor']
arr = render(scene, spp, w, h, out + '.npy')
print(name, 'rendu', round(time.time() - t0, 1), 's')
extra = dict(kw)
exposure = extra.pop('exposure', 1.0)
finish(arr, out + '.png', exposure=exposure, den=int(sys.argv[7]) if len(sys.argv) > 7 else 5, **extra)
print('ok', out + '.png')
