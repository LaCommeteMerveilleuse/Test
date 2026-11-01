"""Les huit images du carrousel « là où la science rencontre l'esprit startup » : cinq natures mortes de laboratoire et trois de bureau de startup."""
import math, random, numpy as np
from lib import *
from cards import studio
from PIL import Image, ImageDraw, ImageFont

def bokeh(sc, n, seed, zr=(-9, -6), yr=(1.5, 7), xr=(-9, 9), rr=(0.22, 0.5), warm=0.6, k=7.0):
    r = random.Random(seed)
    for i in range(n):
        warmc = r.random() < warm
        sc['bk%d' % i] = sphere((r.uniform(*xr), r.uniform(*yr), r.uniform(*zr)), r.uniform(*rr), matte('#ffffff'), emit('#ffd9a0' if warmc else '#cfe3ff', k * r.uniform(0.6, 1.2)))

def tube_profile(R, H, n=10, lip=0.02):
    pts = [(R * math.sin(math.pi / 2 * i / n), R * (1 - math.cos(math.pi / 2 * i / n))) for i in range(n + 1)]
    pts += [(R, H), (R + lip, H + 0.02)]
    return pts

# --------------------------------------------------------------------------- 1. éprouvettes
def lab_tubes(w, h, spp):
    sc = studio(key=(-7, 8, 7), fill=(9, 3, 5), rim=(-2, 11, -7), ambient=0.8, ks=0.9)
    sc['floor'] = floor(0.0, plastic('#f7fafb', 0.04))
    sc['base'] = box((0, 0.08, 0), (2.9, 0.08, 0.6), plastic('#eef2f3', 0.1))
    sc['plate'] = box((0, 1.15, 0), (2.9, 0.06, 0.55), plastic('#eef2f3', 0.1))
    for i, x in enumerate((-2.85, 2.85)):
        sc['post%d' % i] = box((x, 0.6, 0), (0.07, 0.6, 0.5), plastic('#e3e9eb', 0.1))
    tints = ['#e8a24a', '#3a79a8', '#46b3a9', '#e47f95', None, '#7cc078', '#8a79c4']
    levels = [1.7, 2.2, 1.4, 1.9, 1.5, 2.4, 1.1]
    rs = random.Random(3)
    for i in range(7):
        x = -2.4 + 0.8 * i
        outer = tube_profile(0.27, 3.4)
        tilt = [('0,0,1'.split(',') and [0, 0, 1], rs.uniform(-1.5, 1.5))]
        ctr = (x, 0.16, rs.uniform(-0.05, 0.05))
        gl, inner = glass_vessel('tube%d' % i, outer, 0.04, 48, ctr, rot=[([0, 0, 1], rs.uniform(-1.2, 1.2))], bsdf=glass(1.5))
        sc['t%d' % i] = gl
        lq = liquid_for('liq%d' % i, inner, levels[i], 48, ctr, rot=None, bsdf=glass(1.34, tints[i]))
        if lq: sc['l%d' % i] = lq
    bokeh(sc, 16, 5)
    sc['sensor'] = camera((4.6, 2.7, 13.2), (-0.1, 1.95, 0), 30, w, h, spp, focus=13.6, aperture=0.08)
    sc['integrator'] = {'type': 'path', 'max_depth': 16}
    return sc

# --------------------------------------------------------------------------- 2. la double hélice d'ADN
def dna_helix(w, h, spp):
    sc = studio(key=(-6, 9, 7), fill=(9, 3, 6), rim=(2, 11, -7), ambient=0.8, ks=0.9)
    sc['floor'] = floor(-0.01, plastic('#f7fafb', 0.03))
    N = 100; turns = 3.4; R = 1.15; H = 10.0
    A = []; B = []
    for i in range(N + 1):
        t = i / N; a = 2 * math.pi * turns * t; y = 0.0 + H * t
        A.append((R * math.cos(a), y, R * math.sin(a))); B.append((R * math.cos(a + math.pi), y, R * math.sin(a + math.pi)))
    # le brin A en bleu, le brin B en ambre ; toute l'hélice est couchée en diagonale
    rot = T().translate([-3.6, 0.9, 0]).rotate([0, 0, 1], -63) @ T().translate([0, 0, 0])
    def tf(p): v = rot @ mi.ScalarPoint3f(*p); return (v.x, v.y, v.z)
    for i in range(N + 1):
        if i % 2 == 0:
            sc['sa%d' % i] = sphere(tf(A[i]), 0.2, plastic(CANYON, 0.03))
            sc['sb%d' % i] = sphere(tf(B[i]), 0.2, plastic(GLOW, 0.03))
        if i % 4 == 0 and 0 < i < N:
            sc['r%d' % i] = cyl(tf(A[i]), tf(B[i]), 0.05, plastic('#f4f7f8', 0.05))
    sc['bba'] = tube('bba', [tf(p) for p in A], 0.055, 12, bsdf=metal('Al', 0.12))
    sc['bbb'] = tube('bbb', [tf(p) for p in B], 0.055, 12, bsdf=metal('Al', 0.12))
    bokeh(sc, 12, 9, zr=(-9, -5), yr=(0.5, 7), k=6)
    sc['sensor'] = camera((2.0, 3.2, 14.5), (0.4, 3.4, 0), 30, w, h, spp, focus=14.6, aperture=0.1)
    sc['integrator'] = {'type': 'path', 'max_depth': 10}
    return sc

# --------------------------------------------------------------------------- 3. boîtes de Petri et pipette
def petri_pipette(w, h, spp):
    sc = studio(key=(-6, 8, 6), fill=(9, 3, 5), rim=(0, 11, -6), ambient=0.8, ks=0.9)
    sc['floor'] = floor(0.0, plastic('#f6f9fa', 0.05))
    rs = random.Random(5)
    dishes = [((-2.5, 0.0, 0.2), '#f0b866', 0.0), ((0.5, 0.0, -0.9), '#e69aa8', 8.0), ((2.2, 0.0, 1.4), '#8fd0b4', -6.0)]
    for i, (c, tint, rz) in enumerate(dishes):
        outer = [(0, 0.0), (1.5, 0.0), (1.52, 0.04), (1.52, 0.42)]
        gl, inner = glass_vessel('dish%d' % i, outer, 0.04, 80, c, bsdf=glass(1.5))
        sc['d%d' % i] = gl
        sc['a%d' % i] = revolve('agar%d' % i, [(0, 0.05), (1.46, 0.05), (1.46, 0.2), (0, 0.2)], 80, c, glass(1.36, tint))
        for k in range(26):
            a = rs.uniform(0, 6.28); r = 1.2 * math.sqrt(rs.random()); s = rs.uniform(0.03, 0.085)
            sc['c%d_%d' % (i, k)] = sphere((c[0] + r * math.cos(a), 0.215, c[2] + r * math.sin(a)), s, plastic('#f7ecd0', 0.2))
        if i == 1:   # un couvercle posé de travers
            sc['lid'] = revolve('lid', [(0, 0.0), (1.58, 0.0), (1.6, 0.04), (1.6, 0.34), (1.5, 0.38), (0, 0.38)], 80, (c[0] + 1.9, 0.52, c[2] + 0.6), glass(1.5), rot=[([0, 0, 1], 16)])
    # la micropipette, en diagonale au premier plan
    p0 = np.array([4.8, 3.9, 3.8]); p1 = np.array([1.1, 0.75, 1.0]); d = (p1 - p0) / np.linalg.norm(p1 - p0)
    def at(t): return tuple(p0 + (p1 - p0) * t)
    sc['pp1'] = cyl(at(0.0), at(0.12), 0.16, plastic('#f3f6f7', 0.1))
    sc['pp2'] = cyl(at(0.12), at(0.52), 0.24, plastic(CANYON, 0.08))
    sc['pp3'] = cyl(at(0.52), at(0.7), 0.2, plastic('#f3f6f7', 0.1))
    sc['pp4'] = cyl(at(0.7), at(0.86), 0.13, plastic('#d7dee0', 0.15))
    sc['pp5'] = cyl(at(0.86), at(1.0), 0.07, glass(1.45))
    bokeh(sc, 10, 3, zr=(-9, -5), yr=(1, 5), k=6)
    sc['sensor'] = camera((0.8, 5.2, 11.0), (0.1, 0.3, 0.2), 33, w, h, spp, focus=11.2, aperture=0.11)
    sc['integrator'] = {'type': 'path', 'max_depth': 14}
    return sc

# --------------------------------------------------------------------------- 4. fioles qui brillent
def flasks_glow(w, h, spp):
    sc = studio(key=(-7, 8, 7), fill=(9, 3, 5), rim=(1, 11, -6), ambient=0.7, ks=0.85)
    sc['floor'] = floor(0.0, plastic('#f6f9fa', 0.03))
    def erlen(R, Hn):
        pts = [(0, 0), (R * 0.92, 0), (R, 0.06 * R)]
        for k in range(1, 15):
            t = k / 15; pts.append((R + (0.26 * R - R) * t ** 0.9, 0.06 * R + 1.9 * R * t))
        pts += [(0.26 * R, 1.96 * R), (0.26 * R, 1.96 * R + Hn), (0.31 * R, 1.98 * R + Hn)]
        return pts
    flasks = [((-1.9, 0, 0.0), 1.3, 0.9, '#3a79a8', 1.0, '#7fb8e8'), ((1.3, 0, 0.7), 1.0, 0.7, '#e8a24a', 0.95, '#ffb35a'), ((3.8, 0, -0.5), 0.8, 0.55, '#46b3a9', 0.85, '#8be0d4')]
    for i, (c, R, Hn, tint, lv, glow) in enumerate(flasks):
        outer = erlen(R, Hn)
        gl, inner = glass_vessel('fl%d' % i, outer, 0.045 * R, 72, c, bsdf=glass(1.5))
        sc['fl%d' % i] = gl
        level = 0.06 * R + 1.9 * R * 0.46 * lv
        lq = liquid_for('lq%d' % i, inner, level, 72, c, bsdf=glass(1.34, tint))
        sc['lq%d' % i] = lq
        sc['gl%d' % i] = sphere((c[0], 0.45 * R, c[2]), 0.38 * R, matte('#ffffff'), emit(glow, 3.2))
    # un bécher et une fiole ronde
    outer = [(0, 0), (0.95, 0), (0.98, 0.05), (0.98, 2.4), (1.03, 2.45)]
    gl, inner = glass_vessel('beaker', outer, 0.05, 72, (-4.4, 0, 0.9), bsdf=glass(1.5))
    sc['bk'] = gl
    sc['bkl'] = liquid_for('bkl', inner, 1.5, 72, (-4.4, 0, 0.9), bsdf=glass(1.34, '#e47f95'))
    sc['bkg'] = sphere((-4.4, 0.5, 0.9), 0.3, matte('#ffffff'), emit('#ff9db3', 3))
    bokeh(sc, 10, 12, zr=(-9, -5), yr=(1, 6), k=5)
    sc['sensor'] = camera((0.6, 2.6, 18.5), (-0.3, 1.9, 0), 30, w, h, spp, focus=18.6, aperture=0.11)
    sc['integrator'] = {'type': 'path', 'max_depth': 16}
    return sc

# --------------------------------------------------------------------------- 5. bureau de startup : ordinateur, café, carnet
def ui_texture():
    W, H = 1024, 640
    im = Image.new('RGB', (W, H), (245, 248, 250)); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 54], fill=(255, 255, 255)); d.ellipse([22, 17, 42, 37], fill=(224, 163, 92)); d.rectangle([60, 22, 200, 32], fill=(205, 212, 216))
    d.rectangle([0, 54, 170, H], fill=(236, 241, 243))
    for k in range(7): d.rectangle([24, 90 + k * 52, 140, 108 + k * 52], fill=(205, 212, 216) if k else (42, 95, 134))
    for k, c in enumerate([(42, 95, 134), (224, 163, 92), (39, 70, 61)]):
        x = 200 + k * 270; d.rounded_rectangle([x, 84, x + 250, 196], 14, fill=(255, 255, 255)); d.rectangle([x + 20, 104, x + 120, 116], fill=(205, 212, 216)); d.rectangle([x + 20, 140, x + 80 + 40 * k, 170], fill=c)
    d.rounded_rectangle([200, 220, 560, 600], 14, fill=(255, 255, 255))
    bars = [0.4, 0.6, 0.5, 0.8, 0.7, 0.95, 0.85, 1.0]
    for k, b in enumerate(bars):
        x = 226 + k * 40; d.rectangle([x, 580 - 330 * b, x + 26, 580], fill=(42, 95, 134) if k % 3 else (224, 163, 92))
    d.rounded_rectangle([580, 220, 1000, 600], 14, fill=(255, 255, 255))
    pts = [(610 + k * 36, 560 - 40 * math.sin(k / 2.2) - k * 18 - 20 * (k % 3)) for k in range(11)]
    d.line(pts, fill=(224, 163, 92), width=6); d.line([(x, y + 40) for x, y in pts], fill=(42, 95, 134), width=5)
    arr = np.asarray(im).astype(np.float32) / 255.0
    lin_ = np.where(arr <= 0.04045, arr / 12.92, ((arr + 0.055) / 1.055) ** 2.4) * 5.0
    p = os.path.join(TEX, 'ui.exr'); mi.Bitmap(lin_.astype(np.float32)).write(p); return p

def wood_texture():
    W, H = 1024, 1024
    y = np.arange(H)[:, None] / H; x = np.arange(W)[None, :] / W
    g = 0.5 + 0.5 * np.sin(2 * math.pi * (y * 9 + 0.35 * np.sin(x * 5.0) + 0.08 * np.sin(x * 23 + y * 3)))
    g2 = 0.5 + 0.5 * np.sin(2 * math.pi * (y * 41 + 0.5 * np.sin(x * 9.0)))
    t = 0.55 * g + 0.25 * g2
    base = np.array([0.78, 0.62, 0.43]); dark = np.array([0.60, 0.43, 0.27])
    img = dark[None, None, :] * (1 - t[..., None]) + base[None, None, :] * t[..., None]
    return save_tex('wood', img)

def desk_laptop(w, h, spp):
    sc = studio(key=(-8, 7, 5), fill=(9, 4, 6), rim=(0, 11, -6), ambient=0.75, ks=0.85)
    sc['back'] = quad((0, 4, -9), (0, 4, 0), (60, 30), bsdf=matte('#eaf0f2'))
    sc['desk'] = {'type': 'rectangle', 'to_world': T().rotate([1, 0, 0], -90).scale([14, 8, 1]), 'bsdf': {'type': 'roughplastic', 'diffuse_reflectance': bitmap(wood_texture(), (2, 1.2)), 'alpha': 0.12}}
    # l'ordinateur
    sc['base'] = box((0, 0.07, 0.3), (2.0, 0.07, 1.35), metal('Al', 0.07))
    sc['kb'] = box((0, 0.145, 0.45), (1.75, 0.012, 0.8), plastic('#1c2428', 0.2))
    sc['tp'] = box((0, 0.145, 1.1), (0.55, 0.012, 0.32), metal('Al', 0.12))
    ang = -15.0
    pivot = np.array([0, 0.14, -1.05])
    ctr = pivot + np.array([0, 1.3 * math.cos(math.radians(15)), -1.3 * math.sin(math.radians(15))])
    sc['lid'] = box(ctr, (2.0, 1.3, 0.04), metal('Al', 0.07), rot=[([1, 0, 0], ang)])
    n = np.array([0, math.sin(math.radians(15)), math.cos(math.radians(15))])
    sc['screen'] = {'type': 'rectangle', 'to_world': T().translate(list(ctr + n * 0.05)).rotate([1, 0, 0], ang).scale([1.88, 1.17, 1]),
                    'emitter': {'type': 'area', 'radiance': {'type': 'bitmap', 'filename': ui_texture(), 'raw': True}}}
    # le café
    cx, cz = 3.3, 1.2
    sc['saucer'] = revolve('saucer', [(0, 0), (1.15, 0), (1.2, 0.05), (0.7, 0.1), (0, 0.1)], 64, (cx, 0, cz), plastic('#f7f9fa', 0.05))
    cup, inner = glass_vessel('cup', [(0, 0.1), (0.55, 0.1), (0.7, 0.2), (0.78, 0.95), (0.8, 1.0)], 0.06, 64, (cx, 0, cz), bsdf=plastic('#f9fbfb', 0.04))
    sc['cup'] = cup
    sc['coffee'] = revolve('coffee', [(0, 0.82), (0.72, 0.82), (0.72, 0.84), (0, 0.84)], 64, (cx, 0, cz), plastic('#3b2a20', 0.3))
    arcp = [(cx + 0.78 + 0.46 * math.sin(a), 0.55 + 0.34 * math.cos(a), cz) for a in np.linspace(-math.pi * 0.95, math.pi * 0.95, 20)]
    sc['handle'] = tube('handle', arcp, 0.075, 12, bsdf=plastic('#f9fbfb', 0.04))
    # le carnet et le stylo
    sc['nb'] = box((-3.4, 0.09, 1.7), (1.15, 0.09, 0.85), plastic(PINE, 0.18), rot=[([0, 1, 0], 18)])
    sc['pg'] = box((-3.4, 0.2, 1.7), (1.08, 0.025, 0.78), matte('#fbfcfc'), rot=[([0, 1, 0], 18)])
    sc['pen'] = cyl((-4.6, 0.22, 2.9), (-2.2, 0.22, 2.55), 0.07, plastic(CANYON, 0.05))
    # une petite plante
    sc['pot'] = revolve('pot', [(0, 0), (0.42, 0), (0.55, 0.62), (0.58, 0.68), (0, 0.68)], 48, (-2.6, 0, -1.6), plastic('#eef2f3', 0.1))
    rs = random.Random(2)
    for k in range(9):
        a = rs.uniform(0, 360); t = rs.uniform(25, 60)
        leaf = revolve('leaf%d' % k, [(0, 0), (0.18, 0.4), (0.22, 0.9), (0.12, 1.5), (0, 1.8)], 20, (-2.6, 0.68, -1.6), plastic('#4f8a62', 0.25), rot=[([0, 1, 0], a), ([1, 0, 0], t)], scale=0.9)
        sc['lf%d' % k] = leaf
    bokeh(sc, 8, 21, zr=(-9, -6), yr=(2.5, 7), xr=(-8, 8), k=5)
    sc['sensor'] = camera((-3.4, 4.6, 11.8), (0.3, 1.0, 0.2), 33, w, h, spp, focus=12.2, aperture=0.08)
    sc['integrator'] = {'type': 'path', 'max_depth': 10}
    return sc

# --------------------------------------------------------------------------- 6. mur de notes adhésives
def sticky_wall(w, h, spp):
    sc = {'env': {'type': 'constant', 'radiance': col(HAZE, 0.9)},
          'key': quad((-9, 8, 5), (0, 3, 0), (8, 6), emitter=emit('#fff1de', 22)),
          'fill': quad((9, 4, 7), (0, 3, 0), (8, 6), emitter=emit('#e8f1ff', 5)),
          'wall': quad((0, 3, 0), (0, 3, 5), (40, 20), bsdf=matte('#f3f5f5'))}
    rs = random.Random(8)
    cols = ['#f4c27a', '#bcd6e8', '#c4e4d3', '#f8edd0', '#f4c2c9', '#ffffff', '#f1b45e']
    for c in range(7):
        for r in range(4):
            if rs.random() < 0.12: continue
            x = -6.0 + 2.0 * c + rs.uniform(-0.12, 0.12); y = 0.9 + 1.7 * r + rs.uniform(-0.1, 0.1)
            sc['n%d_%d' % (c, r)] = box((x, y, 0.02), (0.74, 0.74, 0.012), plastic(rs.choice(cols), 0.4), rot=[([0, 0, 1], rs.uniform(-4, 4))])
            sc['s%d_%d' % (c, r)] = box((x + 0.02, y + 0.55, 0.03), (0.7, 0.14, 0.004), matte('#000000', 0.0), rot=[([0, 0, 1], 0)]) if False else None
            sc.pop('s%d_%d' % (c, r))
    for c in range(7):
        sc['hd%d' % c] = box((-6.0 + 2.0 * c, 7.65, 0.02), (0.85, 0.2, 0.012), plastic([CANYON, PINE, GLOW][c % 3], 0.3))
    for k in range(5):
        sc['ln%d' % k] = box((-5 + 2.4 * k, 6.5 - 0.15 * k, 0.015), (0.9, 0.018, 0.008), matte(CANYON))
    sc['sensor'] = camera((2.6, 4.3, 20.5), (0.3, 4.2, 0), 30, w, h, spp, focus=20.6, aperture=0.24)
    sc['integrator'] = {'type': 'path', 'max_depth': 6}
    return sc

# --------------------------------------------------------------------------- 7. l'ampoule d'une idée, au filament en hélice
def idea_bulb(w, h, spp):
    sc = studio(key=(-7, 8, 7), fill=(9, 3, 6), rim=(1, 11, -6), ambient=0.65, ks=0.75)
    sc['floor'] = floor(0.0, plastic('#f6f9fa', 0.03))
    prof = [(0.0, 1.2), (0.62, 1.2), (0.66, 1.55)]
    for a in np.linspace(-62, 90, 40):
        r = 1.6 * math.cos(math.radians(a)); y = 3.35 + 1.6 * math.sin(math.radians(a))
        if y > 1.6: prof.append((max(r, 0.0), y))
    gl, inner = glass_vessel('bulb', prof, 0.045, 96, (0, 0, 0), bsdf=glass(1.5))
    sc['bulb'] = gl
    # le culot à vis
    base = [(0.0, 0.35), (0.5, 0.35), (0.56, 0.5)]
    for k in range(7):
        y0 = 0.5 + k * 0.1; base += [(0.64, y0 + 0.03), (0.58, y0 + 0.08)]
    base += [(0.66, 1.22), (0.0, 1.22)]
    sc['base'] = revolve('base', base, 64, (0, 0, 0), metal('Al', 0.15))
    sc['tip'] = revolve('tip', [(0, 0.22), (0.2, 0.22), (0.24, 0.36), (0, 0.36)], 32, (0, 0, 0), plastic('#232b30', 0.2))
    # le filament : une hélice incandescente
    pts = []
    turns = 11; N = 220
    for i in range(N + 1):
        t = i / N; a = 2 * math.pi * turns * t
        pts.append((0.3 * math.cos(a), 2.4 + 1.3 * t, 0.3 * math.sin(a)))
    legs = [(0.3, 1.25, 0.0), (0.3, 2.4, 0.0)] + pts + [(0.3 * math.cos(2 * math.pi * turns), 3.7, 0.3 * math.sin(2 * math.pi * turns)), (0.3, 3.7, 0.0)]
    sc['fil'] = tube('fil', pts, 0.035, 10, bsdf=matte('#ffffff'))
    sc['fil']['emitter'] = emit('#ffab45', 26)
    sc['w1'] = cyl((0.3, 1.25, 0.0), (0.3, 2.4, 0.0), 0.03, metal('Cu', 0.1))
    sc['w2'] = cyl((0.3 * math.cos(2 * math.pi * turns), 3.7, 0.3 * math.sin(2 * math.pi * turns)), (-0.25, 1.25, 0.05), 0.03, metal('Cu', 0.1))
    bokeh(sc, 12, 4, zr=(-9, -5), yr=(0.5, 7.5), xr=(-8, 8), k=6, warm=0.8)
    sc['sensor'] = camera((0.0, 3.0, 16.5), (0.0, 2.45, 0), 29, w, h, spp, focus=16.5, aperture=0.07)
    sc['integrator'] = {'type': 'path', 'max_depth': 14}
    return sc

# --------------------------------------------------------------------------- 8. un avion en papier qui décolle
def paper_plane_mesh(name, scale=1.0):
    V = np.array([[0, 0.0, 3.0], [-1.7, 0.7, -1.8], [1.7, 0.7, -1.8], [0, 0.25, -1.8], [0, -0.75, -1.8], [0, -0.1, 3.0]], dtype=float) * scale
    F = np.array([[0, 1, 3], [0, 3, 2], [0, 3, 4]])
    N = smooth_normals(V, F)
    return write_obj(name, V, F)
def paper_plane(w, h, spp):
    sc = {'env': {'type': 'constant', 'radiance': col('#dbe7f1', 0.8)},
          'key': quad((-7, 9, 6), (0, 0.5, 0), (8, 6), emitter=emit('#fff1de', 20)),
          'fill': quad((9, 3, 6), (0, 0.5, 0), (8, 6), emitter=emit('#e8f1ff', 6)),
          'back': quad((0, 4, -10), (0, 4, 0), (70, 40), bsdf=matte('#8fb4d3'))}
    sc['floor'] = floor(-2.6, plastic('#b9cfe2', 0.25))
    def plane(key, c, s, rot, color):
        d = {'type': 'obj', 'filename': paper_plane_mesh(key, 1.0), 'to_world': T().translate(list(c)) @ T().rotate([0, 1, 0], rot[0]) @ T().rotate([1, 0, 0], rot[1]) @ T().rotate([0, 0, 1], rot[2]) @ T().scale(s),
             'bsdf': {'type': 'twosided', 'bsdf': {'type': 'roughplastic', 'diffuse_reflectance': col(color), 'alpha': 0.35}}}
        return d
    sc['p1'] = plane('pp1', (0.2, 0.9, 0), 0.95, (-52, -14, 8), '#fbfcfd')
    sc['p2'] = plane('pp2', (-4.8, 2.9, -5.5), 0.55, (-58, -10, 10), '#f1b45e')
    sc['p3'] = plane('pp3', (5.2, 3.4, -7.0), 0.42, (-70, -12, 6), '#cfe0ee')
    # une traînée de petites perles ambrées derrière l'avion
    rs = random.Random(6)
    for i in range(34):
        t = i / 33.0
        sc['tr%d' % i] = sphere((-2.2 - 4.8 * t + rs.uniform(-0.1, 0.1), 0.25 - 1.4 * t + 0.3 * math.sin(t * 9) + rs.uniform(-0.1, 0.1), 1.8 + 2.6 * t), 0.12 * (1 - 0.8 * t) + 0.02, matte('#ffffff'), emit('#ffb35a', 3.0 * (1 - 0.6 * t)))
    bokeh(sc, 8, 14, zr=(-9, -4), yr=(1.0, 7), xr=(-7, 7), k=4, warm=0.7)
    sc['sensor'] = camera((6.0, 2.0, 12.6), (-0.4, 0.6, 0), 30, w, h, spp, focus=13.4, aperture=0.1)
    sc['integrator'] = {'type': 'path', 'max_depth': 8}
    return sc

SCENES = {'lab-tubes': (lab_tubes, dict(exposure=1.0)), 'dna-helix': (dna_helix, dict(exposure=1.0)), 'petri-pipette': (petri_pipette, dict(exposure=1.0)),
          'flasks-glow': (flasks_glow, dict(exposure=1.0)), 'desk-laptop': (desk_laptop, dict(exposure=1.0)), 'sticky-wall': (sticky_wall, dict(exposure=1.0)),
          'idea-bulb': (idea_bulb, dict(exposure=1.0)), 'paper-plane': (paper_plane, dict(exposure=1.0))}
