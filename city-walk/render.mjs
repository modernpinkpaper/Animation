// Renders the scene frame by frame in headless Chromium (software WebGL via SwiftShader)
// and pipes PNG frames into ffmpeg to produce a 10 s, 30 fps, 9:16 H.264 MP4.
//   node render.mjs [out.mp4] [width] [height] [fps]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(process.env.NPM_GLOBAL || '/opt/node22/lib/node_modules', 'playwright'))); }

const [out = 'city-walk.mp4', W = '720', H = '1280', FPS = '30'] = process.argv.slice(2);
const width = +W, height = +H, fps = +FPS, duration = 10, frames = duration * fps;
const framesDir = process.env.SAVE_FRAMES; // optional: also keep PNGs here
if (framesDir) fs.mkdirSync(framesDir, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = http.createServer((req, res) => {
  const f = path.join(here, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(here) || !fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', e => console.error('page error:', e.message));
page.on('console', m => m.type() === 'error' && console.error('console:', m.text()));
await page.goto(`http://localhost:${port}/index.html?export=1&w=${width}&h=${height}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
console.log('renderer:', await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const e = gl.getExtension('WEBGL_debug_renderer_info');
  return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
}));

const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-vf', 'format=yuv420p', '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart', '-an', out], { stdio: ['pipe', 'inherit', 'inherit'] });

const canvas = page.locator('#c');
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate(t => window.renderAt(t), i / fps);
  const png = await canvas.screenshot({ type: 'png' });
  if (framesDir) fs.writeFileSync(path.join(framesDir, `f${String(i).padStart(3, '0')}.png`), png);
  if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 30 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close(); server.close();
console.log('wrote', out);
