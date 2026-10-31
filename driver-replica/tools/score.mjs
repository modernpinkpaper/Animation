// Score a render against the reference: mean SSIM over all frames, whole frame + grid + named regions.
// usage: node score.mjs [render.mp4] [--grid 4x6] [--frames a-b]
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const ref = path.join(here, 'out/reference.mp4');
const arg = process.argv.slice(2);
const mine = arg.find((a) => a.endsWith('.mp4')) || path.join(here, 'out/2026-10-31-driver-replica.mp4');
const gridArg = (arg[arg.indexOf('--grid') + 1] || '4x6').split('x').map(Number);
const W = 464, H = 832;

const REGIONS = {
    head: [120, 150, 260, 300],
    face: [140, 220, 200, 190],
    hair_tail: [60, 330, 200, 300],
    window: [0, 140, 140, 300],
    ceiling: [0, 0, 464, 150],
    seat: [250, 250, 214, 582],
    torso: [120, 430, 300, 400],
    wheel_hand: [0, 560, 300, 272],
    left_arm_zone: [0, 260, 200, 300],
};

const tmp = mkdtempSync(path.join(tmpdir(), 'score-'));
function ssim(crop, label) {
    const f = path.join(tmp, label.replace(/\W/g, '_') + '.log');
    const [x, y, w, h] = crop;
    const c = `crop=${w}:${h}:${x}:${y}`;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mine, '-i', ref, '-lavfi',
        `[0:v]scale=${W}:${H}:flags=bicubic,${c}[a];[1:v]${c}[b];[a][b]ssim=stats_file=${f}`, '-f', 'null', '-']);
    const rows = readFileSync(f, 'utf8').trim().split('\n').map((l) => parseFloat(/All:([\d.]+)/.exec(l)[1]));
    return { mean: rows.reduce((a, b) => a + b, 0) / rows.length, rows };
}

const whole = ssim([0, 0, W, H], 'whole');
console.log(`WHOLE  mean SSIM ${(whole.mean * 100).toFixed(2)}%  min-frame ${(Math.min(...whole.rows) * 100).toFixed(1)}%  (frames ${whole.rows.length})`);
const seg = [0, 25, 50, 75, 100, 125];
for (let i = 0; i < seg.length - 1; i++) {
    const s = whole.rows.slice(seg[i], seg[i + 1]);
    if (s.length) console.log(`  frames ${seg[i]}-${seg[i + 1]}: ${(s.reduce((a, b) => a + b, 0) / s.length * 100).toFixed(1)}%`);
}
console.log('REGIONS');
for (const [k, r] of Object.entries(REGIONS)) console.log(`  ${k.padEnd(14)} ${(ssim(r, k).mean * 100).toFixed(1)}%`);
const [gc, gr] = gridArg;
console.log(`GRID ${gc}x${gr} (row = y band, col = x band)`);
for (let j = 0; j < gr; j++) {
    const line = [];
    for (let i = 0; i < gc; i++) {
        const w = Math.floor(W / gc), h = Math.floor(H / gr);
        line.push((ssim([i * w, j * h, w, h], `g${i}_${j}`).mean * 100).toFixed(1).padStart(5));
    }
    console.log('  ' + line.join(' '));
}
