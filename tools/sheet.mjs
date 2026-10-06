// Usage: node tools/sheet.mjs <out.png> <t0> <t1> ...   -> contact sheet (3 columns, 640x360 tiles, labelled with film time)
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf' };
const [out, ...times] = process.argv.slice(2);
const ts = times.map(Number);
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const base = u.startsWith('/src/') ? root : pub;
  const f = path.join(base, u === '/' ? 'index.html' : u);
  if (!f.startsWith(base) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('nf'); }
  res.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--hide-scrollbars', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
const pg = await browser.newPage();
pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
pg.on('console', (m) => { const t = m.text(); if (!/404|Failed to load resource/.test(t)) console.log('[page]', t); });
await pg.goto(`http://localhost:${server.address().port}/index.html${process.env.Q ? '?' + process.env.Q : ''}`);
await pg.waitForFunction('window.__ready === true', { timeout: 240000 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sheet-'));
for (let i = 0; i < ts.length; i++) {
  const t0 = Date.now();
  await pg.evaluate(async (t) => { await window.renderAt(t); }, ts[i]);
  fs.writeFileSync(path.join(tmp, String(i).padStart(3, '0') + '.png'), await pg.screenshot({ type: 'png' }));
  console.log(`t=${ts[i]} (${Date.now() - t0}ms)`);
}
await browser.close(); server.close();
const font = '/System/Library/Fonts/Supplemental/Arial.ttf';
const cols = Math.min(3, ts.length), rows = Math.ceil(ts.length / cols);
const inputs = ts.flatMap((_, i) => ['-i', path.join(tmp, String(i).padStart(3, '0') + '.png')]);
let fg = ts.map((t, i) => `[${i}:v]scale=640:360,drawtext=fontfile=${font}:text='t=${t}':x=8:y=8:fontsize=22:fontcolor=black:box=1:boxcolor=white@0.75:boxborderw=4[v${i}]`).join(';');
fg += ';' + ts.map((_, i) => `[v${i}]`).join('') + `concat=n=${ts.length}:v=1:a=0,tile=${cols}x${rows}[o]`;
execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', fg, '-map', '[o]', '-frames:v', '1', out]);
console.log('wrote', out);
