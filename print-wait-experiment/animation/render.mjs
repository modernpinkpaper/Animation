// Headless render: opens the Motion Canvas editor in the preinstalled Chromium, clicks RENDER,
// waits for the PNG sequence, and leaves frames in output/print-wait/. No GPU, no network.
import {chromium} from 'playwright-core';
import {readdirSync} from 'node:fs';

const OUT = 'output/print-wait';
const browser = await chromium.launch({executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 1600, height: 900}});
page.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 200)));
await page.goto('http://localhost:9000/');
await page.waitForTimeout(4000);
await page.locator('button', {hasText: /^render$/i}).first().click();
let last = -1, same = 0;
for (let i = 0; i < 900; i++) {
  await page.waitForTimeout(1000);
  let n = 0; try { n = readdirSync(OUT).filter((f) => f.endsWith('.png')).length; } catch {}
  if (i % 10 === 0) console.log('frames', n);
  if (n > 0 && n === last) { if (++same >= 6) break; } else same = 0;
  last = n;
}
console.log('done, frames:', last);
await browser.close();
