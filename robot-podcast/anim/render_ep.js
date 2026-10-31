const { chromium } = require('playwright');
const [ep, a, b] = process.argv.slice(2).map(Number);
(async () => {
  const br = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await br.newPage({ viewport: { width: 576, height: 1024 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(`http://localhost:8765/index_pod3.html?ep=${ep}`);
  await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  for (let i = a; i < b; i++) {
    await p.evaluate(t => window.renderFrame(t), i / 24);
    await p.screenshot({ path: `frames_ep${ep}/f_${String(i).padStart(4,'0')}.jpg`, type: 'jpeg', quality: 90 });
  }
  await br.close();
  console.log(`[${ep}:${a}-${b}] done`);
})();
