"""Compute sea routes between all ports on the real map and write them to routes.js.

1. Fetches Esri "World Light Gray Base" tiles (zoom 12) for the area with curl
   (only used locally to tell sea from land; the tiles are not stored in the repo).
2. Builds a sea/land mask, and a "distance from the coast" field.
3. For every port pair, finds the cheapest path through the sea (Dijkstra),
   preferring open water over hugging the coast.
4. Simplifies and smooths each path, checks it stays at sea, writes lat/lon polylines.

Usage: python3 scripts/build-routes.py [tile-cache-dir]
"""
import heapq, json, math, subprocess, sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '.tile-cache'
OUT = ROOT / 'routes.js'
Z, DS = 12, 3                      # tile zoom, downsample factor (cell ≈ 3 px ≈ 85 m)
LAT1, LON0, LAT0, LON1 = 43.62, 15.95, 42.85, 17.25
TILE = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'

# Same order as D in app.js
PORTS = [('Split Airport', 43.5355, 16.2985), ('Split', 43.5065, 16.4390), ('Hvar town', 43.1720, 16.4410),
         ('Vis', 43.0610, 16.1830), ('Bol', 43.2610, 16.6550), ('Korčula', 42.9610, 17.1360),
         ('Vela Luka', 42.9630, 16.7180), ('Komiža', 43.0430, 16.0900)]

def merc(lat, lon):
    n = 2 ** Z
    return ((lon + 180) / 360 * n * 256,
            (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n * 256)

def unmerc(x, y):
    n = 2 ** Z * 256
    lon = x / n * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    return lat, lon

gx0, gy0 = merc(LAT1, LON0); gx1, gy1 = merc(LAT0, LON1)
tx0, ty0, tx1, ty1 = int(gx0 // 256), int(gy0 // 256), int(gx1 // 256), int(gy1 // 256)

# 1. tiles -> mosaic
CACHE.mkdir(exist_ok=True)
mos = Image.new('L', ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
for x in range(tx0, tx1 + 1):
    for y in range(ty0, ty1 + 1):
        f = CACHE / f'{Z}_{x}_{y}.jpg'
        if not f.exists() or f.stat().st_size < 500:
            subprocess.run(['curl', '-s', '-m', '30', '-A', 'sea-transfers-routes/1.0', '-o', str(f),
                            TILE.format(z=Z, x=x, y=y)], check=True)
        mos.paste(Image.open(f).convert('L'), ((x - tx0) * 256, (y - ty0) * 256))
OX, OY = tx0 * 256, ty0 * 256

# 2. mask (sea ≈ 208, land ≈ 240) and coast distance (in cells)
small = mos.resize((mos.width // DS, mos.height // DS), Image.BOX)
sea = np.asarray(small) < 224
H, W = sea.shape
dist = np.full((H, W), 10 ** 6, np.int32)
from collections import deque
q = deque()
for y, x in zip(*np.nonzero(~sea)):
    dist[y, x] = 0; q.append((y, x))
while q:
    y, x = q.popleft(); d = dist[y, x] + 1
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        yy, xx = y + dy, x + dx
        if 0 <= yy < H and 0 <= xx < W and dist[yy, xx] > d:
            dist[yy, xx] = d; q.append((yy, xx))

def cell(lat, lon):
    x, y = merc(lat, lon)
    return int((y - OY) / DS), int((x - OX) / DS)

def snap(c):
    # nearest sea cell with a bit of room around it (piers sit on the coast)
    y0, x0 = c
    for r in range(0, 40):
        best = None
        for y in range(y0 - r, y0 + r + 1):
            for x in range(x0 - r, x0 + r + 1):
                if 0 <= y < H and 0 <= x < W and sea[y, x] and dist[y, x] >= 2:
                    d = (y - y0) ** 2 + (x - x0) ** 2
                    if best is None or d < best[0]: best = (d, (y, x))
        if best: return best[1]
    raise SystemExit(f'no sea near {c}')

NB = [(dy, dx, math.hypot(dy, dx)) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx]
cost_field = 1 + 6 / (1 + np.minimum(dist, 12).astype(np.float64))   # prefer open water

def dijkstra(src, targets):
    D = {src: 0.0}; prev = {}; todo = set(targets); h = [(0.0, src)]
    while h and todo:
        d, u = heapq.heappop(h)
        if d > D.get(u, 1e18): continue
        todo.discard(u)
        y, x = u
        for dy, dx, w in NB:
            yy, xx = y + dy, x + dx
            if not (0 <= yy < H and 0 <= xx < W) or not sea[yy, xx]: continue
            nd = d + w * (cost_field[y, x] + cost_field[yy, xx]) / 2
            if nd < D.get((yy, xx), 1e18):
                D[(yy, xx)] = nd; prev[(yy, xx)] = u; heapq.heappush(h, (nd, (yy, xx)))
    return prev

def dp(pts, tol):
    pts = np.asarray(pts, float); keep = np.zeros(len(pts), bool); keep[[0, -1]] = True; st = [(0, len(pts) - 1)]
    while st:
        i, j = st.pop()
        if j <= i + 1: continue
        p, q_ = pts[i], pts[j]; s = q_ - p; L = np.hypot(*s); r = pts[i + 1:j] - p
        dd = np.abs(s[0] * r[:, 1] - s[1] * r[:, 0]) / L if L else np.hypot(r[:, 0], r[:, 1])
        m = int(np.argmax(dd))
        if dd[m] > tol: keep[i + 1 + m] = True; st += [(i, i + 1 + m), (i + 1 + m, j)]
    return pts[keep]

def chaikin(p, it=2):
    for _ in range(it):
        q_ = [p[0]]
        for a, b in zip(p[:-1], p[1:]): q_ += [a * .75 + b * .25, a * .25 + b * .75]
        q_.append(p[-1]); p = np.asarray(q_)
    return p

def at_sea(p, skip=3):
    # every sample along the line is sea, except right next to the two piers
    bad = 0
    for i, (a, b) in enumerate(zip(p[:-1], p[1:])):
        n = int(np.hypot(*(b - a)) * 2) + 1
        for t in np.linspace(0, 1, n):
            y, x = a + (b - a) * t
            if not sea[int(round(y)), int(round(x))]:
                near_end = min(np.hypot(*(np.array([y, x]) - p[0])), np.hypot(*(np.array([y, x]) - p[-1]))) < skip
                bad += 0 if near_end else 1
    return bad

def clear(a, b, ends):
    # straight segment a->b stays at sea, at least CLEAR cells off the coast (relaxed near the piers)
    n = int(np.hypot(*(b - a)) * 2) + 1
    for t in np.linspace(0, 1, n):
        y, x = a + (b - a) * t
        yy, xx = int(round(y)), int(round(x))
        need = 1 if min(np.hypot(y - ends[0][0], x - ends[0][1]), np.hypot(y - ends[1][0], x - ends[1][1])) < 8 else CLEAR
        if dist[yy, xx] < need: return False
    return True

def pull(p):
    # string-pulling: replace the grid zig-zag with the longest straight hops that stay clear of land
    ends = (p[0], p[-1]); out = [p[0]]; i = 0
    while i < len(p) - 1:
        j = min(i + 1, len(p) - 1)
        while j + 3 < len(p) and clear(p[i], p[j + 3], ends): j += 3
        while j + 1 < len(p) and clear(p[i], p[j + 1], ends): j += 1
        out.append(p[j]); i = j
    return np.asarray(out)

CLEAR = 3
cells = [snap(cell(la, lo)) for _, la, lo in PORTS]
routes = {}
for i, src in enumerate(cells):
    others = [c for j, c in enumerate(cells) if j > i]
    if not others: break
    prev = dijkstra(src, others)
    for j in range(i + 1, len(cells)):
        path, c = [], cells[j]
        while c != src: path.append(c); c = prev[c]
        path.append(src); path.reverse()
        p = pull(np.asarray(path, float))
        for it in (2, 1, 0):
            sm = chaikin(p, it)
            if at_sea(sm) == 0: break
        # cell -> lat/lon; start and end at the real pier position
        ll = [unmerc(OX + (x + .5) * DS, OY + (y + .5) * DS) for y, x in sm]
        ll = [(PORTS[i][1], PORTS[i][2])] + ll + [(PORTS[j][1], PORTS[j][2])]
        km = sum(6371 * math.hypot(math.radians(b[0] - a[0]), math.radians(b[1] - a[1]) * math.cos(math.radians(a[0])))
                 for a, b in zip(ll[:-1], ll[1:]))
        routes[f'{i}-{j}'] = {'km': round(km, 1), 'path': [[round(a, 5), round(b, 5)] for a, b in ll]}
        print(f'{PORTS[i][0]} -> {PORTS[j][0]}: {km:.1f} km, {len(ll)} pts', file=sys.stderr)

OUT.write_text('// Generated by scripts/build-routes.py: sea routes between ports, [lat, lon], key "i-j" (i < j, port order as in app.js)\n'
               'window.SEA_ROUTES = ' + json.dumps(routes, separators=(',', ':'), ensure_ascii=False) + ';\n')
print(f'wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB)', file=sys.stderr)
