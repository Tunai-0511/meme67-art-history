// Generates public/timeline.json (single source of truth for scene order, timing, year, labels, HUD style).  node tools/mktimeline.mjs
import fs from 'node:fs';
const S = [];
let t = 0;
const add = (o, dur) => { S.push({ ...o, t0: t, t1: t + dur }); t += dur; };
add({ id: 'intro', hud: false, year: 2026 }, 4);
add({ id: 'cave', year: -40000, prefix: '約', suffix: 'BCE', era: '洞穴壁畫', label: { title: '《無題（六七）》', medium: '赭石、木炭、岩壁', note: '據信比語言更早出現' },
  hud: { font: 'Chalkduster', weight: 'bold', color: '#f0b560', stroke: '#2a160c', strokeW: 10, size: 140, pill: { bg: '#2a160c', fg: '#f0c98a' } } }, 6);
add({ id: 'egypt', year: -1300, prefix: '約', suffix: 'BCE', era: '古埃及墓室壁畫', label: { title: '《法老與女神・六七》', medium: '礦物顏料、石灰泥', note: '象形文字裡，六和七各有專屬符號' },
  hud: { font: 'Papyrus', weight: 'bold', color: '#f6d36b', stroke: '#2a1408', strokeW: 9, size: 140, pill: { bg: '#1d4e89', fg: '#f6e7b4' } } }, 6);
add({ id: 'greek', year: -500, prefix: '約', suffix: 'BCE', era: '希臘黑像式陶瓶', label: { title: '《競技者與六七》', medium: '陶土、黑釉', note: '六是完全數，七是幸運數，合起來沒人敢問' },
  hud: { font: 'Herculanum', weight: 'normal', color: '#1a120d', stroke: '#e8a35e', strokeW: 8, size: 150, pill: { bg: '#1a120d', fg: '#e8a35e' } } }, 6);
add({ id: 'roman', year: 79, prefix: '', suffix: 'CE', era: '龐貝馬賽克', label: { title: '《小心六七》', medium: '大理石碎片、石灰', note: '火山爆發前一天，大家還在六七' },
  hud: { font: 'Copperplate', weight: 'bold', color: '#f3e8d0', stroke: '#3b2415', strokeW: 8, size: 140, pill: { bg: '#7a2e1d', fg: '#f3e8d0' } } }, 4);
add({ id: 'song', year: 1000, prefix: '約', suffix: '', era: '北宋水墨山水', label: { title: '《谿山行旅六七圖》', medium: '絹本水墨', note: '走了六七里路，手還在動' },
  hud: { font: 'Kaiti TC', weight: 'bold', color: '#26201a', stroke: '', strokeW: 0, size: 140, pill: { bg: '#a02a1c', fg: '#f6ead2' } } }, 4);
add({ id: 'medieval', year: 1250, prefix: '約', suffix: '', era: '中世紀泥金手抄本', label: { title: '《時禱書・頁緣六七》', medium: '羊皮紙、金箔、群青', note: '修士趁沒人時偷偷畫的' },
  hud: { font: 'Luminari', weight: 'normal', color: '#7a1c1c', stroke: '#f2d58a', strokeW: 8, size: 150, pill: { bg: '#1f3f8f', fg: '#f6e3a1' } } }, 4);
add({ id: 'renaissance', year: 1498, prefix: '', suffix: '', era: '文藝復興', label: { title: '《最後的晚餐（六七版）》', medium: '蛋彩、灰泥', note: '十三個人，零個人願意解釋' },
  hud: { font: 'Cochin', weight: 'bold', color: '#ecd9b0', stroke: '#1a0f08', strokeW: 6, size: 140, shadow: { c: 'rgba(0,0,0,0.6)', x: 3, y: 4, b: 8 }, pill: { bg: '#3a2413', fg: '#ecd9b0' } } }, 4);
add({ id: 'ukiyo', year: 1831, prefix: '', suffix: '', era: '浮世繪', label: { title: '《神奈川沖六七裏》', medium: '彩色木版畫', note: '浪很大，手還是不能停' },
  hud: { font: 'Hiragino Mincho ProN', weight: '700', color: '#14264f', stroke: '#f3e6c4', strokeW: 8, size: 140, pill: { bg: '#c23a2b', fg: '#fbeed0' } } }, 4);
add({ id: 'vangogh', year: 1889, prefix: '', suffix: '', era: '後印象派', label: { title: '《星夜（六七）》', medium: '油彩、畫布', note: '當年沒人看得懂，現在人人看得懂' },
  hud: { font: 'Marker Felt', weight: 'bold', color: '#fbe36a', stroke: '#16246b', strokeW: 9, size: 140, pill: { bg: '#16246b', fg: '#fbe36a' } } }, 4);
add({ id: 'surreal', year: 1931, prefix: '', suffix: '', era: '超現實主義', label: { title: '《六點七分的永恆》', medium: '油彩、畫布', note: '所有時鐘都停在 6:07' },
  hud: { font: 'Didot', weight: 'bold', color: '#f6e2b0', stroke: '#2b1608', strokeW: 6, size: 140, shadow: { c: 'rgba(0,0,0,0.5)', x: 3, y: 4, b: 10 }, pill: { bg: '#2b1608', fg: '#f6e2b0' } } }, 4);
add({ id: 'pop', year: 1962, prefix: '', suffix: '', era: '普普藝術', label: { title: '《六七罐頭湯 ×32》', medium: '網版印刷', note: '大量複製，正是它的本質' },
  hud: { font: 'Impact', weight: 'normal', color: '#ffe600', stroke: '#000', strokeW: 12, size: 150, pill: { bg: '#e8112d', fg: '#fff' } } }, 4);
add({ id: 'synth', year: 1985, prefix: '', suffix: '', era: '合成器浪潮', label: { title: '《夜駛六七》', medium: '霓虹、鉻、錄影帶雜訊', note: '倒帶的時候，手還在動' },
  hud: { font: 'Futura', weight: 'bold', italic: true, color: '#ff59d6', stroke: '#2a0b4f', strokeW: 8, size: 150, shadow: { c: '#27e9ff', x: 0, y: 0, b: 24 }, pill: { bg: '#1e0b45', fg: '#27e9ff' } } }, 4);
add({ id: 'pixel', year: 1991, prefix: '', suffix: '', era: '16 位元像素', label: { title: '《街頭六七 II》', medium: '16 位元、256 色', note: '這一局，沒人出招' },
  hud: { font: 'Menlo', weight: 'bold', color: '#ffffff', stroke: '#000', strokeW: 10, size: 130, pill: { bg: '#d6221e', fg: '#fff' } } }, 4);
add({ id: 'xp', year: 2006, prefix: '', suffix: '', era: '早期網路', label: { title: '《轉寄：請轉給 67 個人》', medium: 'Windows XP、MSN 表情符號', note: '當年叫「轉寄」，現在叫「迷因」' },
  hud: { font: 'Trebuchet MS', weight: 'bold', color: '#fff', stroke: '#0a3a9c', strokeW: 8, size: 140, shadow: { c: 'rgba(0,0,0,0.45)', x: 3, y: 4, b: 6 }, pill: { bg: '#2a8a2a', fg: '#fff' } } }, 4);
add({ id: 'tiktok', year: 2025, prefix: '', suffix: '', era: 'Gen Alpha 短影音', label: { title: '《六七》', medium: '短影音、洗腦節奏、手勢', note: 'Dictionary.com 2025 年度詞彙' },
  hud: { font: 'Avenir Next', weight: '900', color: '#fff', stroke: '#000', strokeW: 8, size: 150, shadow: { c: '#25f4ee', x: 6, y: 5, b: 0 }, pill: { bg: '#fe2c55', fg: '#fff' } } }, 6);
add({ id: 'finale', hud: false, year: 2026 }, 10);
S.forEach((s, i) => { s.idx = i; if (s.label) s.accession = `NO. 67-${String(i).padStart(2, '0')}`; });
fs.writeFileSync(new URL('../public/timeline.json', import.meta.url), JSON.stringify({ fps: 24, bpm: 120, duration: t, scenes: S }, null, 1));
console.log('timeline.json written, duration', t, 's,', S.length, 'scenes');
