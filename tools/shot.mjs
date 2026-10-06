// Usage: node tools/shot.mjs <page.html> <out.png> [t0 t1 t2 ...]
// Opens public/<page> in headless Chrome, waits for window.__ready, calls window.renderAt(t) for each t,
// and saves PNGs (out.png, or out-<i>.png when several times are given).
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };

const [page, out, ...times] = process.argv.slice(2);
const ts = times.length ? times.map(Number) : [0];

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const base = u.startsWith('/src/') ? root : pub;
  const f = path.join(base, u === '/' ? 'index.html' : u);
  if (!f.startsWith(base) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('nf'); }
  res.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--hide-scrollbars', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
const pg = await browser.newPage();
pg.on('console', (m) => console.log('[page]', m.text()));
pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
await pg.goto(`http://localhost:${port}/${page}`);
await pg.waitForFunction('window.__ready === true', { timeout: 240000 });
for (let i = 0; i < ts.length; i++) {
  const t0 = Date.now();
  await pg.evaluate(async (t) => { await window.renderAt(t); }, ts[i]);
  const shot = await pg.screenshot({ type: 'png' });
  const name = ts.length > 1 ? out.replace(/\.png$/, `-${i}.png`) : out;
  fs.writeFileSync(name, shot);
  console.log(`t=${ts[i]} -> ${name} (${Date.now() - t0}ms)`);
}
await browser.close();
server.close();
