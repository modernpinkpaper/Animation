// Strict score: colour match (share of pixels within tolerance) + edge match (F1 of outlines within 2 px), per region.
// usage: node score2.mjs [render.mp4] [--frames a-b] [--grid 4x6] [--tol 24] [--region x,y,w,h]
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const ref = path.join(here, 'out/reference.mp4');
const arg = process.argv.slice(2);
const opt = (k, d) => (arg.includes(k) ? arg[arg.indexOf(k) + 1] : d);
const mine = arg.find((a) => a.endsWith('.mp4')) || path.join(here, 'out/2026-10-31-driver-replica.mp4');
const W = 464, H = 832, N = W * H;
const [gc, gr] = opt('--grid', '4x6').split('x').map(Number);
const TOL = +opt('--tol', 24);
const [fa, fb] = opt('--frames', '0-121').split('-').map(Number);

function raw(file) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H}:flags=bicubic`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
        { maxBuffer: 1 << 30 });
    if (r.status) throw new Error(String(r.stderr));
    return r.stdout;
}
const A = raw(mine), B = raw(ref);
const nf = Math.min(A.length, B.length) / (N * 3);

function edges(buf, off) {
    const gray = new Float32Array(N), e = new Uint8Array(N);
    for (let i = 0; i < N; i++) gray[i] = 0.3 * buf[off + i * 3] + 0.59 * buf[off + i * 3 + 1] + 0.11 * buf[off + i * 3 + 2];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const gx = gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1] - gray[i - W - 1] - 2 * gray[i - 1] - gray[i + W - 1];
        const gy = gray[i + W - 1] + 2 * gray[i + W] + gray[i + W + 1] - gray[i - W - 1] - 2 * gray[i - W] - gray[i - W + 1];
        e[i] = Math.hypot(gx, gy) > 70 ? 1 : 0;
    }
    return e;
}
function dilate(e, r) {
    const t = new Uint8Array(N), o = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let v = 0;
        for (let k = -r; k <= r && !v; k++) { const xx = x + k; if (xx >= 0 && xx < W && e[y * W + xx]) v = 1; }
        t[y * W + x] = v;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let v = 0;
        for (let k = -r; k <= r && !v; k++) { const yy = y + k; if (yy >= 0 && yy < H && t[yy * W + x]) v = 1; }
        o[y * W + x] = v;
    }
    return o;
}

const regions = {
    ALL: [0, 0, W, H], head: [120, 150, 260, 300], face: [140, 220, 200, 190], hair_tail: [60, 330, 200, 300],
    window: [0, 140, 140, 300], ceiling: [0, 0, 464, 150], seat: [250, 250, 214, 582], torso: [120, 430, 300, 400],
    wheel_hand: [0, 560, 300, 272], left_arm_zone: [0, 260, 200, 300],
};
const custom = opt('--region', null);
if (custom) regions.CUSTOM = custom.split(',').map(Number);
for (let j = 0; j < gr; j++) for (let i = 0; i < gc; i++) {
    const w = Math.floor(W / gc), h = Math.floor(H / gr);
    regions[`g${i}${j}`] = [i * w, j * h, w, h];
}
const acc = {};
for (const k in regions) acc[k] = { ok: 0, tot: 0, tp: 0, fp: 0, fn: 0 };

for (let f = fa; f <= Math.min(fb, nf - 1); f++) {
    const o = f * N * 3;
    const ea = edges(A, o), eb = edges(B, o), da = dilate(ea, 2), db = dilate(eb, 2);
    for (const [k, [x0, y0, w, h]] of Object.entries(regions)) {
        const a = acc[k];
        for (let y = y0; y < Math.min(H, y0 + h); y++) for (let x = x0; x < Math.min(W, x0 + w); x++) {
            const i = y * W + x, p = o + i * 3;
            const d = Math.max(Math.abs(A[p] - B[p]), Math.abs(A[p + 1] - B[p + 1]), Math.abs(A[p + 2] - B[p + 2]));
            a.tot++; if (d <= TOL) a.ok++;
            if (ea[i]) { if (db[i]) a.tp++; else a.fp++; }
            if (eb[i] && !da[i]) a.fn++;
        }
    }
}
const stat = (a) => {
    const color = a.ok / a.tot;
    const prec = a.tp / Math.max(1, a.tp + a.fp), rec = (a.tot ? (a.tp) / Math.max(1, a.tp + a.fn) : 0);
    const f1 = prec + rec ? (2 * prec * rec) / (prec + rec) : 0;
    return { color, f1, prec, rec };
};
const fmt = (x) => (x * 100).toFixed(1).padStart(5);
const s = stat(acc.ALL);
console.log(`ALL   colour-match ${fmt(s.color)}%   edge-F1 ${fmt(s.f1)}%  (edge precision ${fmt(s.prec)}% recall ${fmt(s.rec)}%)  tol=${TOL}  frames ${fa}-${Math.min(fb, nf - 1)}`);
console.log('REGION          colour  edgeF1  prec   rec');
for (const k of Object.keys(regions).filter((k) => !/^g\d/.test(k) && k !== 'ALL')) {
    const r = stat(acc[k]);
    console.log(`  ${k.padEnd(14)} ${fmt(r.color)} ${fmt(r.f1)} ${fmt(r.prec)} ${fmt(r.rec)}`);
}
console.log(`GRID ${gc}x${gr}   colour% / edgeF1%`);
for (let j = 0; j < gr; j++) {
    const line = [];
    for (let i = 0; i < gc; i++) { const r = stat(acc[`g${i}${j}`]); line.push(`${(r.color * 100).toFixed(0).padStart(3)}/${(r.f1 * 100).toFixed(0).padStart(3)}`); }
    console.log('  ' + line.join('  '));
}
