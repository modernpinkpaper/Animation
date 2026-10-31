import cv2, numpy as np, json
R = '/tmp/claude-0/-home-user-Animation/b66cac53-6ad5-55fe-a61c-683b1be77c2d/scratchpad/ref'
KEY = {12:(205,358),13:(215,360),16:(215,354),19:(200,365),22:(195,397),25:(190,422),28:(225,435),31:(285,437),33:(315,442),35:(327,442),37:(322,442),39:(305,437),41:(277,427),43:(252,415)}
ks = sorted(KEY)
def expected(f):
    if f <= ks[0]: return KEY[ks[0]]
    for a, b in zip(ks, ks[1:]):
        if a <= f <= b:
            u = (f - a) / (b - a); return (KEY[a][0] + (KEY[b][0] - KEY[a][0]) * u, KEY[a][1] + (KEY[b][1] - KEY[a][1]) * u)
    return None
def cands_of(img):
    b, g, r = [img[..., i].astype(int) for i in range(3)]
    skin = ((r > 190) & (g > 120) & (g < 220) & (b > 60) & (b < 185) & (r > g + 20) & (g > b + 10)).astype(np.uint8)
    red = ((r > 120) & (r > g + 50) & (r > b + 30) & (skin == 0)).astype(np.uint8)
    luma = 0.114 * b + 0.587 * g + 0.299 * r
    dark = ((luma < 105) | (red == 1)).astype(np.uint8)
    n, cc, st, cen = cv2.connectedComponentsWithStats(dark, connectivity=8)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
    out = []
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a < 6 or a > 1800 or w > 110: continue
        m = (cc == i).astype(np.uint8)
        ring = cv2.dilate(m, k) & (1 - cv2.dilate(m, np.ones((3, 3), np.uint8)))
        if skin[ring == 1].mean() < 0.72: continue
        out.append((x, y, w, h, a, cen[i][0], cen[i][1]))
    return out
res, sheet = {}, []
for fi in range(12, 70):
    img = cv2.imread(f'{R}/f_{fi+1:03d}.png')
    cs = cands_of(img)
    e = expected(fi)
    if e is None:  # beyond the keyframes: take the lowest plausible candidate in the lower face
        pool = [c for c in cs if 110 < c[5] < 330 and 330 < c[6] < 470]
        sel = [max(pool, key=lambda c: c[6])] if pool else []
    else:
        sel = [c for c in cs if abs(c[5] - e[0]) < 38 and abs(c[6] - e[1]) < 26]
    if sel:
        x0 = min(c[0] for c in sel); y0 = min(c[1] for c in sel); x1 = max(c[0] + c[2] for c in sel); y1 = max(c[1] + c[3] for c in sel)
        res[fi] = dict(x=int(x0), y=int(y0), w=int(x1 - x0), h=int(y1 - y0), cx=(x0 + x1) / 2, cy=(y0 + y1) / 2)
    else:
        res[fi] = None
    vis = img.copy()
    if res[fi]:
        m = res[fi]; cv2.rectangle(vis, (m['x'], m['y']), (m['x'] + m['w'], m['y'] + m['h']), (0, 255, 0), 1)
    crop = vis[230:530, 90:390]
    cv2.putText(crop, str(fi), (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
    sheet.append(cv2.resize(crop, (170, 170)))
json.dump(res, open('mouth_raw.json', 'w'))
rows = []
for i in range(0, len(sheet), 12):
    row = sheet[i:i + 12]
    while len(row) < 12: row.append(np.zeros_like(sheet[0]))
    rows.append(np.hstack(row))
cv2.imwrite('mouth_sheet2.png', np.vstack(rows))
print('missing', [f for f, v in res.items() if v is None])
