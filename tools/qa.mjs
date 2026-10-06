// usage: node tools/qa.mjs <id> [out.png]  -> contact sheet of 9 clean (no-transition) frames across a scene
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const id = process.argv[2];
const tl = JSON.parse(fs.readFileSync(new URL('../public/timeline.json', import.meta.url)));
const s = tl.scenes.find((x) => x.id === id);
if (!s) throw new Error('no scene ' + id);
const dur = s.t1 - s.t0;
const us = [0.15, 0.6, 1.0, 1.5, 2.0, 2.5, dur > 5 ? 4.0 : 3.0, dur - 0.6, dur - 0.2].filter((u) => u < dur);
const out = process.argv[3] || `out/qa_${id}.png`;
execFileSync('node', ['tools/sheet.mjs', out, ...us.map((u) => (s.t0 + u).toFixed(2))], { stdio: 'inherit', env: { ...process.env, Q: 'notrans=1' } });
