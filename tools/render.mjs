// Frame-by-frame renderer: every frame is drawn from scratch by the page (p5.js + p5.brush) at film time t = frame / fps.
//   node tools/render.mjs [--from 0] [--to N] [--workers 4] [--dir frames] [--resume] [--every 1]
// Output: <dir>/f00000.png ...   (lossless PNG screenshots of the 1920x1080 page, incl. paper-grain overlay)
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => {
  if (x.startsWith('--')) a.push([x.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return a;
}, []));
const tl = JSON.parse(fs.readFileSync(path.join(pub, 'timeline.json'), 'utf8'));
const FPS = tl.fps, TOTAL = Math.round(tl.duration * FPS);
const from = +(args.from ?? 0), to = Math.min(TOTAL - 1, +(args.to ?? TOTAL - 1));
const workers = +(args.workers ?? 4), every = +(args.every ?? 1);
const dir = path.resolve(root, args.dir ?? 'frames');
fs.mkdirSync(dir, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const base = u.startsWith('/src/') ? root : pub;
  const f = path.join(base, u === '/' ? 'index.html' : u);
  if (!f.startsWith(base) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('nf'); }
  res.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream');
  res.setHeader('cache-control', 'no-store');
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const frames = [];
for (let i = from; i <= to; i += every) {
  if (args.resume && fs.existsSync(path.join(dir, `f${String(i).padStart(5, '0')}.png`))) continue;
  frames.push(i);
}
console.log(`rendering ${frames.length} frames (${from}..${to}, every ${every}) with ${workers} workers -> ${dir}`);
let done = 0, failed = [], errFrames = [];
const t0 = Date.now();

async function worker(k) {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--hide-scrollbars', '--force-device-scale-factor=1', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log(`[w${k} pageerror]`, e.message));
  await page.goto(`http://localhost:${port}/index.html${args.query ? '?' + args.query : ''}`);
  await page.waitForFunction('window.__ready === true', { timeout: 240000 });
  for (let n = k; n < frames.length; n += workers) {
    const i = frames[n];
    const file = path.join(dir, `f${String(i).padStart(5, '0')}.png`);
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        await page.evaluate(async (t) => { await window.renderAt(t); }, i / FPS);
        const err = await page.evaluate(() => window.__lastError);
        if (err) { console.log(`[w${k}] frame ${i} (t=${(i / FPS).toFixed(2)}) scene error: ${err}`); errFrames.push(i); }
        fs.writeFileSync(file, await page.screenshot({ type: 'png' }));
        ok = true;
      } catch (e) {
        console.log(`[w${k}] frame ${i} attempt ${attempt} failed: ${e.message.split('\n')[0]}`);
      }
    }
    if (!ok) failed.push(i);
    done++;
    if (done % 50 === 0 || done === frames.length) {
      const el = (Date.now() - t0) / 1000, rate = done / el;
      console.log(`${done}/${frames.length}  ${rate.toFixed(2)} fps  eta ${Math.round((frames.length - done) / rate)}s`);
    }
  }
  await browser.close();
}
await Promise.all(Array.from({ length: workers }, (_, k) => worker(k)));
server.close();
// fill any missing frames by repeating the previous one so the encode never has gaps
let filled = 0;
for (let i = 0; i < TOTAL; i++) {
  const f = path.join(dir, `f${String(i).padStart(5, '0')}.png`);
  if (!fs.existsSync(f) && i > 0 && every === 1 && from === 0 && to === TOTAL - 1) { fs.copyFileSync(path.join(dir, `f${String(i - 1).padStart(5, '0')}.png`), f); filled++; }
}
console.log(`done in ${Math.round((Date.now() - t0) / 1000)}s; failed: ${failed.length ? failed.join(',') : 'none'}; scene errors on ${errFrames.length} frames${errFrames.length ? ': ' + errFrames.slice(0, 30).join(',') : ''}; filled ${filled}`);

process.exit(0);
