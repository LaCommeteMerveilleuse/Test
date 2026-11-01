"""BlackPhage - convertit les PNG rendus (tools/renders/final/*.png) en WebP 1080 x 720 dans assets/img/gallery/.
Un très léger grain évite les bandes dans les dégradés lisses de ces images de synthèse (le WebP les accentuerait sinon).
Usage : python3 tools/renders/to_webp.py [dossier des PNG]"""
import os, sys
import numpy as np
from PIL import Image

src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'final')
dst = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'img', 'gallery')
os.makedirs(dst, exist_ok=True)
rng = np.random.default_rng(7)
for n in ['lab-tubes', 'dna-helix', 'petri-pipette', 'flasks-glow', 'desk-laptop', 'sticky-wall', 'idea-bulb', 'paper-plane']:
    f = os.path.join(src, n + '.png')
    if not os.path.exists(f):
        print('absent', f); continue
    a = np.asarray(Image.open(f).convert('RGB').resize((1080, 720), Image.LANCZOS), dtype=np.float32)
    a = np.clip(a + rng.normal(0, 0.9, a.shape[:2] + (1,)) + rng.normal(0, 0.35, a.shape), 0, 255).astype(np.uint8)
    out = os.path.join(dst, n + '.webp')
    Image.fromarray(a).save(out, 'WEBP', quality=88, method=6)
    print(n, os.path.getsize(out) // 1024, 'Ko')
