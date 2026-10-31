#!/usr/bin/env python3
"""Video frames -> stacked vector layers (flat colours traced to polygons), one set per frame.

usage: trace.py <frames_dir> <out.js> [--k 32] [--scale 2] [--eps 1.4] [--min 12] [--ink-n 2] [--ink-eps 0.9]
                                      [--ink-min 3] [--mode 1] [--only 0,30] [--eval] [--jobs 4]
  frames_dir  PNG frames f_001.png ... (ffmpeg extract)
  out.js      `window.DriverTrace = { w, h, scale, palette, order, frames: [[[colourIndex, [ring, ...]], ...], ...] }`
Rings are flat int arrays in 1/scale pixel units, filled with the even-odd rule. Layers are stacked in `order`
(the darkest "ink" colours last): layer i covers every pixel whose colour order is >= i, so neighbours leave no seams.
The frame is quantised at `scale` x resolution from a smoothly enlarged copy, so edges and thin lines are sub-pixel.
"""
import sys, os, glob, json, argparse
import numpy as np
import cv2
from multiprocessing import Pool

ap = argparse.ArgumentParser()
ap.add_argument('frames'); ap.add_argument('out')
ap.add_argument('--k', type=int, default=32)
ap.add_argument('--scale', type=int, default=2)
ap.add_argument('--eps', type=float, default=1.4)
ap.add_argument('--min', type=int, default=12, help='min component area (output px) for non-ink colours')
ap.add_argument('--ink-min', type=int, default=3)
ap.add_argument('--ink-eps', type=float, default=0.9)
ap.add_argument('--ink-thresh', type=float, default=38.0, help='luma below this is ink (a crisp top layer)')
ap.add_argument('--mode', type=int, default=1, help='majority-filter passes (3x3) before tracing')
ap.add_argument('--smooth', type=float, default=1.2, help='gaussian sigma (at scale px) applied along each contour before simplifying')
ap.add_argument('--aa', type=int, default=3, help='radius (scaled px) of the anti-aliased fringe next to ink that takes the colour of the nearest clean pixel')
ap.add_argument('--ms', type=float, default=0.0, help='mean-shift radius used for COLOUR assignment only (ink stays on the unfiltered image)')
ap.add_argument('--sr', type=float, default=14.0)
ap.add_argument('--extra', type=int, default=5, help='palette slots reserved for rare colours poorly covered by k-means (red mouth, earbud...)')
ap.add_argument('--thin', type=float, default=26.0, help='black-hat contrast above which a thin dark line counts as ink (0 = off)')
ap.add_argument('--thin-max', type=float, default=95.0, help='...and only if its luma is below this')
ap.add_argument('--only', default='')
ap.add_argument('--eval', action='store_true')
ap.add_argument('--jobs', type=int, default=4)
a = ap.parse_args()

files = sorted(glob.glob(a.frames.rstrip('/') + '/f_*.png'))
if a.only:
    files = [files[int(x)] for x in a.only.split(',')]
S = a.scale
first = cv2.imread(files[0]); H, W = first.shape[:2]
print(f'{len(files)} frames {W}x{H} scale {S}', flush=True)

# ---- global Lab palette (k-1 colours from non-ink pixels) + one fixed ink colour ----
allf = sorted(glob.glob(a.frames.rstrip('/') + '/f_*.png'))[::2]
def luma(bgr): return 0.114 * bgr[..., 0] + 0.587 * bgr[..., 1] + 0.299 * bgr[..., 2]
samples, inkpix = [], []
for f in allf:
    im = cv2.imread(f)[::3, ::3]
    l = luma(im.astype(np.float32))
    samples.append(cv2.cvtColor(im, cv2.COLOR_BGR2LAB).reshape(-1, 3)[(l >= a.ink_thresh).ravel()])
    inkpix.append(im.reshape(-1, 3)[(l < a.ink_thresh).ravel()])
sample = np.concatenate(samples).astype(np.float32)
inkc = np.concatenate(inkpix).astype(np.float32).mean(0)
crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.5)
cv2.setRNGSeed(7)
nmain = a.k - 1 - a.extra
_, _, cen = cv2.kmeans(sample, nmain, None, crit, 3, cv2.KMEANS_PP_CENTERS)
if a.extra > 0:
    dmin = ((sample[:, None, :] - cen[None]) ** 2).sum(2).min(1)
    far = sample[dmin > 500]
    print('far pixels', len(far), flush=True)
    if len(far) > a.extra * 20:
        _, _, cen2 = cv2.kmeans(far, a.extra, None, crit, 3, cv2.KMEANS_PP_CENTERS)
        cen = np.vstack([cen, cen2])
    else:
        cen = np.vstack([cen, cen[:a.extra]])
ink_lab = cv2.cvtColor(np.uint8(inkc.reshape(1, 1, 3).round()), cv2.COLOR_BGR2LAB).reshape(3).astype(np.float32)
centers = np.vstack([cen.astype(np.float32), ink_lab[None]])
INK = a.k - 1
ink = {INK}
pal_bgr = cv2.cvtColor(np.uint8(centers.reshape(1, -1, 3).round().clip(0, 255)), cv2.COLOR_LAB2BGR).reshape(-1, 3)
print('ink colour BGR', pal_bgr[INK].tolist(), 'threshold', a.ink_thresh, flush=True)


def quantize(img):
    up = cv2.resize(img, (W * S, H * S), interpolation=cv2.INTER_CUBIC) if S > 1 else img
    colsrc = up
    if a.ms > 0:
        colsrc = cv2.resize(cv2.pyrMeanShiftFiltering(img, a.ms, a.sr, 1), (W * S, H * S), interpolation=cv2.INTER_CUBIC)
    lab = cv2.cvtColor(colsrc, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    best = np.full(lab.shape[0], 1e18, np.float32); idx = np.zeros(lab.shape[0], np.uint8)
    for c in range(a.k - 1):
        d = ((lab - centers[c]) ** 2).sum(1)
        m = d < best; best[m] = d[m]; idx[m] = c
    L = luma(up.astype(np.float32))
    inkm = L < a.ink_thresh
    if a.thin > 0:
        k_ = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * S * 2 + 1, 2 * S * 2 + 1))
        bh = cv2.morphologyEx(L, cv2.MORPH_CLOSE, k_) - L
        inkm |= (bh > a.thin) & (L < a.thin_max)
    idx[inkm.ravel()] = INK
    return idx.reshape(H * S, W * S)


# ---- stacking order: by area on a few sample frames, ink last ----
cnt = np.zeros(a.k)
for f in allf[::12]:
    cnt += np.bincount(quantize(cv2.imread(f)).ravel(), minlength=a.k)
order = [int(c) for c in np.argsort(-cnt) if int(c) != INK] + [INK]
rank = np.zeros(a.k, np.int32)
for r, c in enumerate(order): rank[c] = r


def majority(lab, passes):
    for _ in range(passes):
        best = np.full(lab.shape, -1.0, np.float32); out = lab.copy()
        for c in np.unique(lab):
            m = cv2.boxFilter((lab == c).astype(np.float32), -1, (3, 3))
            u = m > best; best[u] = m[u]; out[u] = c
        lab = out
    return lab


def defringe(lab):
    """Pixels right next to ink are anti-aliasing blends: give them the colour of the nearest clean non-ink pixel."""
    if a.aa <= 0: return lab
    inkm = (lab == INK).astype(np.uint8)
    zone = cv2.dilate(inkm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * a.aa + 1, 2 * a.aa + 1))) & (1 - inkm)
    src = 1 - cv2.dilate(inkm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * a.aa + 1, 2 * a.aa + 1)))  # clean non-ink
    if not src.any() or not zone.any(): return lab
    _, idx = cv2.distanceTransformWithLabels(1 - src, cv2.DIST_L2, 3, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(src)
    lut = np.zeros(idx.max() + 1, np.uint8); lut[idx[ys, xs]] = lab[ys, xs]
    return np.where(zone == 1, lut[idx], lab)


def cleanup(lab):
    keep = np.ones(lab.shape, np.uint8)
    for c in np.unique(lab):
        n, cc, st, _ = cv2.connectedComponentsWithStats((lab == c).astype(np.uint8), connectivity=4)
        lim = (a.ink_min if int(c) in ink else a.min) * S * S
        small = np.nonzero(st[1:, cv2.CC_STAT_AREA] < lim)[0] + 1
        if len(small):
            keep[np.isin(cc, small)] = 0
    if keep.all():
        return lab
    _, idx = cv2.distanceTransformWithLabels(keep, cv2.DIST_L2, 3, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(keep)
    lut = np.zeros(idx.max() + 1, np.uint8); lut[idx[ys, xs]] = lab[ys, xs]
    return np.where(keep == 1, lab, lut[idx])


def trace_frame(args):
    fi, f = args
    img = cv2.imread(f)
    lab = cleanup(majority(defringe(majority(quantize(img), 1)), max(0, a.mode - 1)))
    r = rank[lab]
    layers = []
    for ri in range(1, a.k):
        mask = (r >= ri).astype(np.uint8)
        if not mask.any(): continue
        cs, _ = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        eps = a.ink_eps if order[ri] in ink else a.eps
        rings = []
        for c in cs:
            if len(c) < 4: continue
            c = c.reshape(-1, 2).astype(np.float32)
            if a.smooth > 0 and len(c) >= 12:
                r_ = int(a.smooth * 3) + 1
                k_ = np.exp(-0.5 * (np.arange(-r_, r_ + 1) / a.smooth) ** 2); k_ /= k_.sum()
                pad = np.pad(c, ((r_, r_), (0, 0)), mode='wrap')
                c = np.stack([np.convolve(pad[:, 0], k_, 'valid'), np.convolve(pad[:, 1], k_, 'valid')], 1).astype(np.float32)
            p = cv2.approxPolyDP(c.reshape(-1, 1, 2), eps, True).reshape(-1, 2)
            if len(p) >= 3: rings.append(np.rint(p * 2).astype(int).ravel().tolist())
        if rings: layers.append([order[ri], rings])
    msg = ''
    if a.eval:
        canvas = np.zeros((H * S, W * S, 3), np.uint8); canvas[:] = pal_bgr[order[0]]
        for ci, rings in layers:
            m = np.zeros((H * S, W * S), np.uint8); m2 = np.zeros_like(m)
            for ring in rings:
                m2[:] = 0
                cv2.fillPoly(m2, [np.rint(np.array(ring, np.float32).reshape(-1, 1, 2) / 2).astype(np.int32)], 1)
                m ^= m2
            canvas[m == 1] = pal_bgr[ci]
        rec = cv2.resize(canvas, (W, H), interpolation=cv2.INTER_AREA)
        d = np.abs(rec.astype(int) - img.astype(int)).max(2)
        cv2.imwrite(f'private/rec_{fi:03d}.png', rec)
        msg = f'colour-match tol24 {(d <= 24).mean()*100:.1f}%  tol12 {(d <= 12).mean()*100:.1f}%'
    pts = sum(len(r) // 2 for _, rs in layers for r in rs)
    return fi, layers, pts, msg


if __name__ == '__main__':
    with Pool(a.jobs) as p:
        res = []
        for fi, layers, pts, msg in p.imap(trace_frame, list(enumerate(files))):
            res.append(layers)
            if a.eval or fi % 10 == 0: print(f'frame {fi}: pts {pts} {msg}', flush=True)
    pal_hex = ['#%02x%02x%02x' % (int(c[2]), int(c[1]), int(c[0])) for c in pal_bgr]
    data = {'w': W, 'h': H, 'scale': S * 2, 'palette': pal_hex, 'base': order[0], 'frames': res}
    with open(a.out, 'w') as fh:
        fh.write('window.DriverTrace=')
        json.dump(data, fh, separators=(',', ':'))
        fh.write(';')
    print('bytes', os.path.getsize(a.out))
