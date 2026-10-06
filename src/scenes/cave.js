/* cave.js — c. 40,000 BCE · Palaeolithic cave painting (film 4.0–10.0 s)
 * Torch-lit limestone wall (procedural height field + normal lighting), charcoal & ochre bison / horse / mammoth,
 * blown-pigment hand stencils, Levantine-style stick hunters — everyone (incl. the bison's front hooves) doing "67".
 */
(function () {
  const W = 1920, H = 1080;
  const C = {
    rockD: '#5e4a3b', rockL: '#8a6e56', char: '#17110d', ochre: '#a8432a', ochreD: '#8a3220', yellow: '#d79b3a',
    chalk: '#efe6d2', fire: '#ffb55a',
  };
  const DBG = typeof location !== 'undefined' && /cavedbg/.test(location.search);

  // ------------------------------------------------------------ noise (fast perlin, seeded)
  function cave_perlin(seed) {
    const r = V.rng(seed);
    const p = new Uint8Array(512);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = p[i]; p[i] = p[j]; p[j] = tmp; }
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];
    const gx = new Float32Array(8), gy = new Float32Array(8);
    for (let k = 0; k < 8; k++) { gx[k] = Math.cos((k * Math.PI) / 4 + 0.3); gy[k] = Math.sin((k * Math.PI) / 4 + 0.3); }
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const X = xi & 255, Y = yi & 255;
      const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
      const a = p[p[X] + Y] & 7, b = p[p[X + 1] + Y] & 7, c = p[p[X] + Y + 1] & 7, d = p[p[X + 1] + Y + 1] & 7;
      const n00 = gx[a] * xf + gy[a] * yf, n10 = gx[b] * (xf - 1) + gy[b] * yf;
      const n01 = gx[c] * xf + gy[c] * (yf - 1), n11 = gx[d] * (xf - 1) + gy[d] * (yf - 1);
      const x0 = n00 + (n10 - n00) * u, x1 = n01 + (n11 - n01) * u;
      return (x0 + (x1 - x0) * v) * 1.4; // ~ -1..1
    };
  }
  const N1 = cave_perlin(11), N2 = cave_perlin(23), N3 = cave_perlin(37), N4 = cave_perlin(51), N5 = cave_perlin(67);
  const fbm = (n, x, y, oct) => {
    let s = 0, a = 1, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += a * n(x * f + i * 7.3, y * f - i * 3.1); norm += a; a *= 0.5; f *= 2.03; }
    return s / norm;
  };
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function cave_field(w, h, cell, fn) {
    const f = new Float32Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) f[j * w + i] = fn((i + 0.5) * cell, (j + 0.5) * cell);
    return { f, w, h, cell };
  }
  function cave_samp(F, x, y) {
    let fx = x / F.cell - 0.5, fy = y / F.cell - 0.5;
    fx = Math.max(0, Math.min(F.w - 1.001, fx)); fy = Math.max(0, Math.min(F.h - 1.001, fy));
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, k = j * F.w + i;
    const a = F.f[k], b = F.f[k + 1], c = F.f[k + F.w], d = F.f[k + F.w + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // ------------------------------------------------------------ the wall
  const HUMP = { x: 1090, y: 420, r: 260 }; // natural swelling the painter turned into the bison's hump
  function cave_bigHeight(x, y) {
    const wx = x + 110 * N2(x / 420, y / 420), wy = y + 110 * N3(x / 420 + 4, y / 420);
    let h = 0.5 * fbm(N1, wx / 600, wy / 600, 3) + 0.18 * fbm(N4, wx / 210, wy / 210, 2);
    const dh = Math.hypot((x - HUMP.x) / 1.3, y - HUMP.y) / HUMP.r;
    h += 0.42 * Math.exp(-dh * dh * 1.6);
    h += 0.22 * Math.exp(-Math.pow(Math.hypot((x - 610) / 1.3, y - 440) / 260, 2));
    h -= 0.8 * sstep(880, 1080, y); // rolls away into the floor
    // folded ridges (flowstone crests): ridged noise gives sharp-ish crests
    const rg = 1 - Math.abs(N5(wx / 380 + 3, wy / 300));
    h += 0.05 * rg * rg * rg;
    return h;
  }
  // overhang edge (the ceiling lip) in screen y for a given x
  const cave_lip = (x) => 58 + 34 * N1(x / 260, 3.3) + 14 * N2(x / 70, 8.1) + 40 * sstep(1300, 1920, x) - 20 * sstep(700, 0, x);

  let WALL = null;
  function cave_buildWall() {
    if (WALL) return WALL;
    const t0 = performance.now();
    const LW = 480, LH = 270;
    const big = cave_field(LW, LH, 4, cave_bigHeight);
    const nx = new Float32Array(LW * LH), ny = new Float32Array(LW * LH), nz = new Float32Array(LW * LH);
    const HS = 420;
    for (let j = 0; j < LH; j++) for (let i = 0; i < LW; i++) {
      const k = j * LW + i;
      const hx = (big.f[j * LW + Math.min(LW - 1, i + 1)] - big.f[j * LW + Math.max(0, i - 1)]) * HS / 8;
      const hy = (big.f[Math.min(LH - 1, j + 1) * LW + i] - big.f[Math.max(0, j - 1) * LW + i]) * HS / 8;
      const l = Math.hypot(hx, hy, 1);
      nx[k] = -hx / l; ny[k] = -hy / l; nz[k] = 1 / l;
    }
    const mid = cave_field(960, 540, 2, (x, y) => {
      const m = fbm(N4, x / 150, y / 150, 2);
      const drape = fbm(N5, x / 46, y / 360, 2) * sstep(-0.1, 0.4, N2(x / 500 + 3, y / 500));
      return m * 0.55 + drape * 0.45;
    });
    const alb = cave_field(480, 270, 4, (x, y) => fbm(N1, x / 360 + 20, y / 360, 3));
    const veil = cave_field(480, 270, 4, (x, y) => {
      const e = Math.hypot((x - 930) / 820, (y - 560) / 420);
      return sstep(1.05, 0.5, e + 0.3 * N2(x / 280, y / 280));
    });
    const hF = new Float32Array(W * H), hD = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const fine = N1(x / 11, y / 11) * 0.6 + N2(x / 4, y / 4) * 0.4;
      const d = cave_samp(mid, x, y) * 0.09 + fine * 0.005;
      hD[y * W + x] = d;
      hF[y * W + x] = cave_samp(big, x, y) + d;
    }
    const blur = new Float32Array(W * H), tmp = new Float32Array(W * H), R = 6;
    for (let y = 0; y < H; y++) {
      let s = 0;
      for (let x = -R; x <= R; x++) s += hF[y * W + Math.max(0, Math.min(W - 1, x))];
      for (let x = 0; x < W; x++) {
        tmp[y * W + x] = s / (2 * R + 1);
        s += hF[y * W + Math.min(W - 1, x + R + 1)] - hF[y * W + Math.max(0, x - R)];
      }
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let y = -R; y <= R; y++) s += tmp[Math.max(0, Math.min(H - 1, y)) * W + x];
      for (let y = 0; y < H; y++) {
        blur[y * W + x] = s / (2 * R + 1);
        s += tmp[Math.min(H - 1, y + R + 1) * W + x] - tmp[Math.max(0, y - R) * W + x];
      }
    }
    const cD = V.rgb(C.rockD), cL = V.rgb(C.rockL), cV = V.rgb('#c4a079'), cIron = V.rgb('#94573a'), cMn = V.rgb('#2e221a'), cCal = V.rgb('#ece2cc');
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(W, H);
    const pits = document.createElement('canvas'); pits.width = W; pits.height = H;
    const pctx = pits.getContext('2d');
    const pimg = pctx.createImageData(W, H);
    const rel = document.createElement('canvas'); rel.width = W; rel.height = H;
    const rctx = rel.getContext('2d');
    const rimg = rctx.createImageData(W, H);
    const D = img.data, PD = pimg.data, RD = rimg.data;
    const Lx = 0.1, Ly = 0.42, Lz = 0.9, ll = Math.hypot(Lx, Ly, Lz);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = y * W + x;
        const hx = (hD[y * W + Math.min(W - 1, x + 1)] - hD[y * W + Math.max(0, x - 1)]) * 200;
        const hy = (hD[Math.min(H - 1, y + 1) * W + x] - hD[Math.max(0, y - 1) * W + x]) * 200;
        const l = Math.hypot(hx, hy, 1);
        const dot = (-hx * Lx - hy * Ly + Lz) / (l * ll);
        const cav = (hF[k] - blur[k]) * 30;
        const sh = Math.min(1, ((0.46 + 0.62 * Math.max(0, dot)) * Math.min(1.08, Math.max(0.62, 1 + cav))) / 1.06);
        const a0 = cave_samp(alb, x, y) * 0.5 + 0.5;
        let r = cD[0] + (cL[0] - cD[0]) * a0, g = cD[1] + (cL[1] - cD[1]) * a0, b = cD[2] + (cL[2] - cD[2]) * a0;
        const vv = cave_samp(veil, x, y) * 0.55;
        r += (cV[0] - r) * vv; g += (cV[1] - g) * vv; b += (cV[2] - b) * vv;
        // iron-oxide washes running down the wall
        const ir = sstep(0.2, 0.7, N3(x / 60, y / 420) + 0.35 * N5(x / 120, y / 120)) * 0.32;
        r += (cIron[0] - r) * ir; g += (cIron[1] - g) * ir; b += (cIron[2] - b) * ir;
        // manganese specks
        const mn = sstep(0.45, 0.65, N4(x / 4.5, y / 4.5)) * 0.5 * sstep(-0.1, 0.4, N1(x / 80, y / 80));
        r += (cMn[0] - r) * mn; g += (cMn[1] - g) * mn; b += (cMn[2] - b) * mn;
        // calcite crusts (white) in patches + tiny glinting crystals
        const cal = sstep(0.4, 0.58, N2(x / 34 + 5, y / 26) * 0.7 + N5(x / 8, y / 8) * 0.3) * sstep(0.05, 0.45, N3(x / 300 + 7, y / 300)) * 0.8;
        const gl = sstep(0.78, 0.9, N1(x / 2.1 + 40, y / 2.1)) * 0.35;
        const cc = Math.min(1, cal + gl);
        r += (cCal[0] - r) * cc; g += (cCal[1] - g) * cc; b += (cCal[2] - b) * cc;
        // soot band near the ceiling (centuries of torches)
        // a pale calcite panel the painter picked for the tally marks
        const pm = sstep(1.0, 0.55, Math.hypot((x - 1170) / 270, (y - 822) / 95) + 0.22 * N2(x / 70, y / 70));
        r += (196 - r) * pm * 0.55; g += (170 - g) * pm * 0.55; b += (134 - b) * pm * 0.55;
        const soot = sstep(230, 30, y + 70 * N2(x / 220, 3)) * 0.55 * (1 - 0.85 * pm);
        r *= 1 - soot; g *= 1 - soot; b *= 1 - soot * 0.95;
        // albedo only (relief is multiplied on top of wall AND paint every frame, so pigment sits IN the rock)
        D[k * 4] = r; D[k * 4 + 1] = g; D[k * 4 + 2] = b; D[k * 4 + 3] = 255;
        RD[k * 4] = RD[k * 4 + 1] = RD[k * 4 + 2] = 255 * sh; RD[k * 4 + 3] = 255;
        const pit = sstep(0.05, 0.5, -cav * 1.2 + 0.32 * N2(x / 2.2, y / 2.2) + 0.28 * N4(x / 6, y / 6) + 0.12 * N3(x / 14, y / 14));
        PD[k * 4] = r; PD[k * 4 + 1] = g; PD[k * 4 + 2] = b; PD[k * 4 + 3] = 255 * pit;
      }
    }
    ctx.putImageData(img, 0, 0);
    pctx.putImageData(pimg, 0, 0);
    rctx.putImageData(rimg, 0, 0);
    cave_paintFormations(ctx, pctx);
    WALL = { cv, pits, rel, nx, ny, nz, LW, LH, big, ms: performance.now() - t0 };
    if (/cavems/.test(location.search)) console.log('cave wall build ms', Math.round(WALL.ms));
    return WALL;
  }

  function cave_crack(ctx, pts, w) {
    const path = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.save(); ctx.translate(0.8, 1.8); path(); ctx.strokeStyle = 'rgba(235,205,160,0.28)'; ctx.lineWidth = w * 0.8; ctx.stroke(); ctx.restore();
    path(); ctx.strokeStyle = 'rgba(18,11,7,0.78)'; ctx.lineWidth = w; ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(18,11,7,0.25)'; ctx.lineWidth = w * 3; ctx.stroke();
  }
  function cave_jag(x0, y0, x1, y1, n, amp, seed) {
    const r = V.rng(seed), out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, j = i === 0 || i === n ? 0 : (r() - 0.5) * amp;
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy);
      out.push([x0 + dx * t - (dy / l) * j, y0 + dy * t + (dx / l) * j]);
    }
    return out;
  }
  function cave_paintFormations(ctx, pctx) {
    // a few genuine fractures (jagged) — not a web of veins
    [[[1480, 120, 1560, 520], 14, 26, 3], [[1560, 520, 1610, 760], 8, 20, 2.4], [[1520, 330, 1690, 380], 7, 14, 1.6], [[40, 640, 230, 1000], 12, 22, 2.6], [[60, 300, 210, 338], 6, 12, 1.5], [[700, 980, 1180, 1010], 12, 16, 2]].forEach(([s, n, amp, w], i) => {
      const pts = cave_jag(s[0], s[1], s[2], s[3], n, amp, 9100 + i);
      cave_crack(ctx, pts, w);
      cave_crack(pctx, pts, w);
    });
    // ceiling overhang: a dark lip with a warm rim where the torch catches its underside
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, cave_lip(x));
    ctx.lineTo(W, 0); ctx.closePath();
    const lg = ctx.createLinearGradient(0, 0, 0, 160);
    lg.addColorStop(0, 'rgba(8,5,3,1)'); lg.addColorStop(0.7, 'rgba(26,17,11,1)'); lg.addColorStop(1, 'rgba(60,40,28,1)');
    ctx.fillStyle = lg; ctx.fill();
    ctx.filter = 'blur(3px)';
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) (x ? ctx.lineTo(x, cave_lip(x) + 2) : ctx.moveTo(x, cave_lip(x) + 2));
    ctx.strokeStyle = 'rgba(20,12,8,0.6)'; ctx.lineWidth = 10; ctx.stroke();
    ctx.restore();
    // stalactite draperies: dark curtains of flowstone hanging from the lip, tips caught by the torch
    const r = V.rng(707);
    [[1000, 150, 60, 4], [1330, 260, 130, 6], [1640, 300, 190, 7]].forEach(([gx, gw, maxL, n]) => {
      const tips = [];
      for (let i = 0; i < n; i++) tips.push({ x: gx + (r() - 0.5) * gw * 0.9, l: maxL * (0.3 + 0.7 * r() * r()), w: 10 + r() * 16 });
      const bottom = (x) => {
        let y = cave_lip(x) + 6 + 8 * N2(x / 30, 4);
        tips.forEach((tp) => { const d = Math.abs(x - tp.x) / tp.w; if (d < 1) y = Math.max(y, cave_lip(tp.x) + tp.l * Math.pow(1 - d, 1.7)); });
        return y;
      };
      const x0 = gx - gw / 2 - 20, x1 = gx + gw / 2 + 20;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x0, cave_lip(x0) - 4);
      for (let x = x0; x <= x1; x += 2) ctx.lineTo(x, bottom(x));
      ctx.lineTo(x1, cave_lip(x1) - 4);
      for (let x = x1; x >= x0; x -= 12) ctx.lineTo(x, cave_lip(x) - 4);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 40, 0, 60 + maxL);
      g.addColorStop(0, 'rgba(12,8,5,1)'); g.addColorStop(1, 'rgba(40,27,18,1)');
      ctx.fillStyle = g; ctx.filter = 'blur(1.2px)'; ctx.fill(); ctx.filter = 'none';
      ctx.clip();
      ctx.strokeStyle = 'rgba(8,5,3,0.35)'; ctx.lineWidth = 2;
      for (let x = x0; x < x1; x += 7 + r() * 9) { ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x + (r() - 0.5) * 4, 70 + maxL); ctx.stroke(); }
      ctx.restore();
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) (x === x0 ? ctx.moveTo(x, bottom(x) - 1.5) : ctx.lineTo(x, bottom(x) - 1.5));
      ctx.strokeStyle = 'rgba(200,140,85,0.22)'; ctx.lineWidth = 2; ctx.stroke();
      tips.forEach((tp) => { ctx.fillStyle = 'rgba(250,222,180,0.75)'; ctx.beginPath(); ctx.arc(tp.x, cave_lip(tp.x) + tp.l + 2, 1.7, 0, Math.PI * 2); ctx.fill(); });
    });
    // foreground rock column at the right edge (silhouette with warm rim)
    ctx.save();
    ctx.beginPath(); ctx.moveTo(W, 0);
    const colX = (y) => 1846 + 26 * N1(y / 190, 5) + 10 * N2(y / 45, 9) - 34 * Math.exp(-Math.pow((y - 560) / 240, 2));
    for (let y = 0; y <= H; y += 10) ctx.lineTo(colX(y), y);
    ctx.lineTo(W, H); ctx.closePath();
    const g2 = ctx.createLinearGradient(1800, 0, 1920, 0);
    g2.addColorStop(0, 'rgba(62,44,31,1)'); g2.addColorStop(0.5, 'rgba(26,18,12,1)'); g2.addColorStop(1, 'rgba(8,5,3,1)');
    ctx.fillStyle = g2; ctx.fill();
    ctx.beginPath();
    for (let y = 0; y <= H; y += 10) (y ? ctx.lineTo(colX(y) + 2, y) : ctx.moveTo(colX(y) + 2, y));
    ctx.strokeStyle = 'rgba(210,150,95,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    // floor: rubble ledge
    const g3 = ctx.createLinearGradient(0, 950, 0, H);
    g3.addColorStop(0, 'rgba(22,15,10,0)'); g3.addColorStop(0.4, 'rgba(22,15,10,0.85)'); g3.addColorStop(1, 'rgba(6,4,3,1)');
    ctx.fillStyle = g3; ctx.fillRect(0, 930, W, 150);
  }

  // ------------------------------------------------------------ hand stencils
  function cave_handPath(ctx, s, left, seed) {
    const r = V.rng(seed);
    const m = left ? 1 : -1; // left hand pressed to the wall: thumb on screen-right
    const caps = (x0, y0, ang, len, wd) => {
      const dx = Math.sin(ang), dy = -Math.cos(ang);
      const x1 = x0 + dx * len, y1 = y0 + dy * len;
      const nx = -dy * wd / 2, ny = dx * wd / 2, tw = 0.82; // fingertips a little narrower
      ctx.beginPath();
      ctx.moveTo(x0 + nx, y0 + ny);
      ctx.lineTo(x1 + nx * tw, y1 + ny * tw);
      ctx.arc(x1, y1, (wd / 2) * tw, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, true);
      ctx.lineTo(x0 - nx, y0 - ny);
      ctx.closePath();
      ctx.fill();
    };
    ctx.beginPath();
    ctx.moveTo(-42 * s * m, -6 * s);
    ctx.bezierCurveTo(-47 * s * m, 30 * s, -40 * s * m, 64 * s, -32 * s * m, 92 * s);
    ctx.lineTo(-35 * s * m, 128 * s);
    ctx.quadraticCurveTo(0, 136 * s, 35 * s * m, 128 * s);
    ctx.lineTo(32 * s * m, 92 * s);
    ctx.bezierCurveTo(44 * s * m, 66 * s, 46 * s * m, 28 * s, 42 * s * m, -8 * s);
    ctx.closePath();
    ctx.fill();
    const spread = 0.8 + r() * 0.6;
    [[-30, -0.2, 70], [-10, -0.06, 82], [10, 0.06, 76], [29, 0.19, 60]].forEach(([fx, a, len]) =>
      caps(fx * s * m, 2 * s, a * spread * m, (len + r() * 6) * s, 21 * s));
    caps(40 * s * m, 46 * s, (0.95 + r() * 0.25) * m, 58 * s, 24 * s);
  }
  function cave_stencil(key, col, left, seed, scale, density = 1) {
    return V.gfx('cave_st_' + key, 360, 420, (ctx) => {
      const r = V.rng(seed);
      const cx = 180, cy = 180;
      const [R, G, B] = V.rgb(col);
      const hz = ctx.createRadialGradient(cx, cy + 25, 40, cx, cy + 25, 150);
      hz.addColorStop(0, `rgba(${R},${G},${B},${0.95 * density})`);
      hz.addColorStop(0.55, `rgba(${R},${G},${B},${0.6 * density})`);
      hz.addColorStop(1, `rgba(${R},${G},${B},0)`);
      ctx.fillStyle = hz;
      ctx.fillRect(0, 0, 360, 420);
      for (let i = 0; i < 11000 * density; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.abs((r() + r() + r() + r() - 2) * 105) + 30;
        const x = cx + Math.cos(a) * d * 0.92, y = cy + 25 + Math.sin(a) * d * 1.12;
        const rr = 0.4 + r() * r() * 1.8;
        const k = 0.7 + r() * 0.55;
        ctx.fillStyle = `rgba(${Math.min(255, R * k)},${Math.min(255, G * k)},${Math.min(255, B * k)},${0.3 + r() * 0.6})`;
        ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'destination-out';
      ctx.save();
      ctx.translate(cx, cy);
      ctx.filter = 'blur(1.6px)';
      ctx.fillStyle = 'rgba(0,0,0,0.95)';
      cave_handPath(ctx, scale * 1.03, left, seed + 1);
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      cave_handPath(ctx, scale * 0.98, left, seed + 1);
      ctx.restore();
      ctx.globalCompositeOperation = 'destination-in';
      const fo = ctx.createRadialGradient(cx, cy + 25, 95, cx, cy + 25, 178);
      fo.addColorStop(0, 'rgba(0,0,0,1)');
      fo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fo;
      ctx.fillRect(0, 0, 360, 420);
    });
  }
  // light inside the negative hand — used for the six/seven flash
  function cave_handGlow(key, left, seed, scale) {
    return V.gfx('cave_hg_' + key, 360, 420, (ctx) => {
      ctx.translate(180, 180);
      ctx.filter = 'blur(3px)';
      ctx.fillStyle = 'rgba(255,170,96,0.9)';
      cave_handPath(ctx, scale * 0.97, left, seed + 1);
    });
  }
  const ROW = [
    { x: 100, y: 470, left: true, s: 0.86, col: '#a73a1e' },
    { x: 208, y: 446, left: false, s: 0.9, col: '#b44424' },
    { x: 316, y: 474, left: true, s: 0.84, col: '#a83c1f' },
    { x: 422, y: 452, left: false, s: 0.88, col: '#b84826' },
  ];
  const EXTRA = [
    { key: 'k1', col: '#1d1510', x: 1700, y: 252, left: true, s: 0.66, den: 0.9 },
    { key: 'k2', col: '#1d1510', x: 1608, y: 300, left: false, s: 0.6, den: 0.8 },
    { key: 'w1', col: '#f2ead8', x: 1640, y: 620, left: false, s: 0.72, den: 1.25 },
  ];

  // ------------------------------------------------------------ static paintings
  const BIS = { px: 1385, py: 705, tilt: 0.07 };
  const BISON_BODY = [[834, 585], [826, 562], [836, 528], [852, 494], [878, 470], [912, 430], [952, 382], [996, 348], [1040, 332], [1086, 336], [1140, 352], [1210, 370], [1282, 384], [1342, 398], [1386, 412], [1414, 436], [1426, 470], [1428, 512], [1418, 556], [1404, 600], [1398, 648], [1394, 690], [1402, 708], [1372, 713], [1364, 698], [1360, 660], [1350, 622], [1330, 604], [1296, 616], [1238, 632], [1170, 640], [1100, 640], [1040, 636], [992, 640], [962, 648], [936, 652], [912, 656], [890, 636], [868, 612], [848, 598]];
  const BISON_HEAD = [[834, 585], [826, 562], [836, 528], [852, 494], [878, 470], [910, 440], [934, 470], [944, 520], [940, 570], [928, 616], [912, 656], [890, 636], [868, 612], [848, 598]];
  const BISON_MUZZLE = [[834, 586], [825, 562], [831, 538], [850, 546], [862, 572], [854, 597]];
  const BISON_BELLY = [[960, 600], [1060, 596], [1180, 600], [1300, 584], [1352, 610], [1296, 616], [1238, 632], [1170, 640], [1100, 640], [1040, 636], [992, 640], [962, 648]];
  const BISON_HIND_FAR = [[1318, 606], [1326, 650], [1330, 690], [1342, 708], [1318, 712], [1310, 696], [1300, 650], [1290, 618]];
  function cave_bisonFrame(dy) {
    V.translate(0, dy);
    V.translate(BIS.px, BIS.py);
    V.rotate(BIS.tilt);
    V.translate(-BIS.px, -BIS.py);
  }
  // charcoal hair strokes growing from a contour along its normal (dir +1 = to the curve's right-hand side)
  function cave_furAlong(pts, o) {
    const sm = V.resample(V.smoothPts(pts, false, 8), o.step || 14);
    const r = V.rng(o.seed || 1);
    for (let i = 1; i < sm.length - 1; i++) {
      const a = sm[i - 1], b = sm[i + 1];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      nx *= o.dir || 1; ny *= o.dir || 1;
      const len = (o.len || 30) * (0.45 + r() * 0.85);
      const p = sm[i];
      const lean = (o.lean || 0) + (r() - 0.5) * 0.35;
      const ex = p[0] + (nx * Math.cos(lean) - ny * Math.sin(lean)) * len;
      const ey = p[1] + (ny * Math.cos(lean) + nx * Math.sin(lean)) * len;
      V.ink([[p[0], p[1]], [ex, ey]], { brush: o.brush || 'charcoal', w: (o.w || 1) * (0.75 + r() * 0.5), color: o.color || C.char, alpha: o.alpha == null ? 1 : o.alpha, seed: (o.seed || 1) * 10 + i, taper: [2, len * 0.7] });
    }
  }
  function cave_paintBison() {
    V.push();
    cave_bisonFrame(0);
    const B = BISON_BODY;
    // far hind leg
    V.fill(BISON_HIND_FAR, { color: '#4a2418', alpha: 0.8, flat: true, seed: 3, smooth: true });
    V.ink(BISON_HIND_FAR, { brush: 'charcoal', w: 1.1, color: C.char, closed: true, smooth: true, seed: 4 });
    // ochre body: pad-dabbed base, watercolour mottling, darker underside for volume
    V.fill(B, { color: '#943a20', alpha: 0.8, flat: true, seed: 5, smooth: true });
    V.fill(B, { color: '#b8552e', alpha: 0.55, flat: false, bleed: 0.12, tex: 0.85, border: 0.7, seed: 6, smooth: true });
    V.fill(BISON_BELLY, { color: '#5e2214', alpha: 0.32, flat: false, bleed: 0.35, tex: 0.8, border: 0.15, seed: 7, smooth: true });
    V.fill([[1120, 392], [1250, 394], [1340, 412], [1384, 462], [1336, 522], [1206, 534], [1112, 502]], { color: '#cf7040', alpha: 0.4, flat: false, bleed: 0.3, tex: 0.6, border: 0.2, seed: 9, smooth: true });
    const r = V.rng(77);
    for (let i = 0; i < 26; i++) {
      const x = 1090 + r() * 280, y = 400 + r() * 150;
      V.ink([[x, y], [x + 26 + r() * 40, y + (r() - 0.5) * 20]], { brush: 'pastel', w: 0.8, color: i % 3 ? '#c9693c' : '#de9257', alpha: 0.75, seed: 100 + i, taper: [4, 4] });
    }
    // head: dark red-brown, charcoal-hatched, black muzzle
    V.fill(BISON_HEAD, { color: '#4a1d12', alpha: 0.7, flat: true, seed: 12, smooth: true });
    V.fill(BISON_HEAD, { color: '#3a160d', alpha: 0.45, flat: false, bleed: 0.25, tex: 0.6, border: 0.2, seed: 16, smooth: true });
    // the dark head melts into the red shoulder through hair, not a clean edge
    cave_furAlong([[912, 444], [936, 476], [946, 522], [940, 570], [926, 618]], { len: 40, dir: -1, lean: -0.15, w: 1.15, step: 5, seed: 17, color: '#26110a' });
    V.hatch(BISON_HEAD, { brush: 'charcoal', color: C.char, w: 0.45, dist: 10, angle: 65, rand: 0.7, seed: 13 });
    cave_furAlong([[838, 530], [852, 494], [880, 468], [910, 440]], { len: 30, dir: 1, lean: 0.2, w: 0.7, step: 9, seed: 15 });
    V.fill(BISON_MUZZLE, { color: '#120b08', alpha: 0.9, flat: true, seed: 14, smooth: true });
    // mane: hair strokes growing IN from the dorsal line, leaning back, fading into the red flank
    cave_furAlong([[880, 468], [912, 430], [952, 384], [996, 350], [1040, 334], [1086, 338], [1140, 354], [1190, 366]], { len: 86, dir: 1, lean: -0.55, w: 0.95, step: 6, seed: 20 });
    cave_furAlong([[930, 470], [970, 420], [1020, 384], [1070, 378], [1120, 392]], { len: 52, dir: 1, lean: -0.4, w: 0.75, step: 8, seed: 21 });
    // shoulder line + belly fringe
    V.ink([[1124, 372], [1092, 430], [1064, 500], [1050, 566], [1046, 628]], { brush: 'charcoal', w: 1.2, color: C.char, smooth: true, seed: 22, taper: [30, 40] });
    cave_furAlong([[1120, 380], [1088, 448], [1062, 520], [1050, 600]], { len: 22, dir: -1, lean: -0.3, w: 0.7, step: 12, seed: 23 });
    cave_furAlong([[968, 646], [1040, 636], [1110, 640], [1180, 640], [1250, 630], [1300, 615]], { len: 26, dir: 1, lean: 0.35, w: 0.85, step: 8, seed: 24 });
    // charcoal shading inside the rump and haunch for volume
    cave_furAlong([[1300, 392], [1360, 404], [1404, 428], [1424, 470], [1426, 520], [1414, 566]], { len: 36, dir: 1, lean: 0.25, w: 0.95, step: 8, seed: 25, color: '#2a140c' });
    // eye: reserved almond of bare rock + charcoal pupil and lid
    V.fill([[852, 512], [864, 504], [878, 510], [866, 518]], { color: '#cdb895', alpha: 0.9, flat: true, seed: 30, smooth: true });
    V.dot(866, 511, 3.2, '#0e0906', { seed: 31 });
    V.ink([[850, 512], [864, 501], [882, 509]], { brush: 'charcoal', w: 0.9, color: C.char, smooth: true, seed: 32, taper: [4, 6] });
    V.ink([[836, 568], [843, 574]], { brush: 'charcoal', w: 0.9, color: '#cdb895', seed: 33 });
    // horns: crescents rising clear of the head
    V.ink([[880, 470], [860, 446], [854, 416], [868, 390], [894, 376]], { brush: 'pastel', w: 1.4, color: '#dcc7a0', alpha: 0.6, smooth: true, seed: 38, taper: [4, 20] });
    V.ink([[884, 468], [864, 446], [858, 416], [872, 392], [896, 380]], { brush: 'charcoal', w: 2.1, color: C.char, smooth: true, seed: 34, taper: [2, 30] });
    V.ink([[906, 446], [900, 418], [910, 396], [932, 384]], { brush: 'charcoal', w: 1.6, color: '#2a1a12', smooth: true, seed: 35, taper: [2, 24] });
    // tail
    V.ink([[1418, 442], [1440, 470], [1448, 520], [1442, 566]], { brush: 'charcoal', w: 1.1, color: C.char, smooth: true, seed: 36, taper: [4, 4] });
    V.ink([[1442, 556], [1452, 588], [1440, 600], [1432, 580]], { brush: 'charcoal', w: 1.5, color: C.char, smooth: true, seed: 37 });
    // near hind leg: black from the hock down + small hoof
    V.fill([[1400, 632], [1396, 690], [1402, 708], [1372, 713], [1364, 698], [1360, 642]], { color: '#1a110c', alpha: 0.85, flat: true, seed: 43 });
    // contour: re-traced charcoal, heavy on the back and belly, lighter elsewhere, never one uniform loop
    V.ink(B.slice(3, 17), { brush: 'charcoal', w: 1.85, color: C.char, smooth: true, seed: 40, wob: 2.5, taper: [10, 30] });
    V.ink(B.slice(15, 25), { brush: 'charcoal', w: 1.3, color: C.char, smooth: true, seed: 47, wob: 2, taper: [20, 6] });
    V.ink(B.slice(24, 29), { brush: 'charcoal', w: 1.1, color: C.char, smooth: true, seed: 48, wob: 2, taper: [6, 10] });
    V.ink(B.slice(27, 36), { brush: 'charcoal', w: 1.6, color: C.char, smooth: true, seed: 49, wob: 2.5, taper: [10, 20] });
    V.ink(B.slice(35).concat(B.slice(0, 5)), { brush: 'charcoal', w: 1.15, color: C.char, smooth: true, seed: 50, wob: 1.5, taper: [8, 8] });
    V.push(); V.translate(-7, -6);
    V.ink(B.slice(5, 14), { brush: 'charcoal', w: 0.95, color: '#2a1c14', smooth: true, seed: 41, wob: 3, taper: [50, 60] });
    V.pop();
    V.push(); V.translate(4, 8);
    V.ink(B.slice(28, 34), { brush: 'charcoal', w: 0.9, color: '#2a1c14', smooth: true, seed: 42, wob: 3, taper: [50, 50] });
    V.pop();
    // engraved scratches exposing the paler rock beneath (Altamira bison are engraved as well as painted)
    V.push(); V.translate(-13, -12);
    V.ink(B.slice(6, 14), { brush: 'HB', w: 0.9, color: '#efe2c6', alpha: 0.65, smooth: true, seed: 45, taper: [30, 30] });
    V.pop();
    V.ink([[1300, 420], [1338, 470], [1356, 540]], { brush: 'HB', w: 0.8, color: '#ead9b8', alpha: 0.5, smooth: true, seed: 46, taper: [20, 20] });
    V.ink([[1150, 470], [1200, 452], [1260, 456]], { brush: 'HB', w: 0.7, color: '#ead9b8', alpha: 0.4, smooth: true, seed: 44, taper: [20, 20] });
    V.pop();
  }

  // Lascaux "Chinese horse": yellow ochre, black mane & legs, reserved pale belly — facing right
  const HORSE = [[484, 420], [510, 408], [570, 412], [630, 410], [662, 400], [700, 378], [730, 358], [748, 350], [749, 332], [756, 346], [762, 336], [766, 352], [776, 358], [790, 374], [804, 392], [811, 405], [803, 415], [785, 413], [768, 405], [752, 411], [734, 432], [718, 458], [708, 486], [700, 506], [668, 530], [620, 544], [570, 544], [528, 532], [500, 512], [486, 484], [480, 450]];
  const HORSE_HEAD = [[748, 350], [766, 352], [776, 358], [790, 374], [804, 392], [811, 405], [803, 415], [785, 413], [768, 405], [757, 386], [750, 366]];
  function cave_paintHorse() {
    V.fill(HORSE, { color: '#bd8034', alpha: 0.74, flat: true, smooth: true, seed: 50 });
    V.fill(HORSE, { color: '#dfa346', alpha: 0.5, flat: false, bleed: 0.18, tex: 0.85, border: 0.65, smooth: true, seed: 51 });
    const r = V.rng(5151);
    for (let i = 0; i < 34; i++) {
      const x = 500 + r() * 210, y = 420 + r() * 100;
      V.ink([[x, y], [x + 18 + r() * 24, y + (r() - 0.5) * 12]], { brush: 'pastel', w: 0.65, color: i % 3 ? '#e6b05a' : '#9e6229', alpha: 0.65, seed: 5200 + i, taper: [3, 3] });
    }
    // darker ochre modelling along the back, neck and haunch
    V.ink([[492, 424], [560, 420], [630, 416], [690, 390], [736, 362]], { brush: 'pastel', w: 1.2, color: '#86491f', alpha: 0.7, smooth: true, seed: 53, taper: [20, 20] });
    V.ink([[492, 440], [488, 480], [506, 512]], { brush: 'pastel', w: 1.0, color: '#86491f', alpha: 0.6, smooth: true, seed: 56, taper: [10, 10] });
    // subtle paler belly
    V.fill([[540, 528], [600, 536], [660, 526], [690, 510], [660, 534], [600, 542], [552, 538]], { color: '#dcc196', alpha: 0.4, flat: true, smooth: true, seed: 52 });
    // dark head (Lascaux horses carry a black muzzle/head)
    V.fill(HORSE_HEAD, { color: '#24170f', alpha: 0.8, flat: true, smooth: true, seed: 54 });
    cave_furAlong([[752, 352], [770, 356], [790, 374], [806, 396]], { len: 16, dir: 1, lean: 0.3, w: 0.6, step: 7, seed: 55 });
    // short black legs with little hooves
    [[[704, 500], [708, 540], [704, 574]], [[686, 514], [682, 548], [676, 578]], [[518, 526], [508, 554], [504, 580]], [[538, 536], [536, 562], [530, 584]]].forEach((lg, i) => {
      V.ink(lg, { brush: 'charcoal', w: i % 2 ? 1.5 : 1.8, color: i % 2 ? '#2a1c14' : C.char, smooth: true, seed: 60 + i, taper: [6, 2] });
      const e = lg[2];
      V.ink([[e[0] - 6, e[1] + 1], [e[0] + 8, e[1] + 3]], { brush: 'charcoal', w: 1.2, color: C.char, seed: 64 + i, taper: [2, 2] });
    });
    // stiff upright mane
    for (let i = 0; i < 20; i++) {
      const a = i / 19;
      const x = V.lerp(656, 748, a), y = V.lerp(402, 352, a);
      V.ink([[x + 2, y + 8], [x + 5, y - 14 - 4 * Math.sin(a * 3)]], { brush: 'charcoal', w: 1.0, color: C.char, seed: 70 + i, taper: [2, 5] });
    }
    // tail
    V.ink([[484, 422], [462, 440], [450, 478], [448, 522]], { brush: 'charcoal', w: 1.7, color: C.char, smooth: true, seed: 80, taper: [4, 14] });
    V.ink([[488, 428], [470, 452], [462, 498]], { brush: 'charcoal', w: 1.1, color: '#2a1d16', smooth: true, seed: 81, taper: [4, 14] });
    // contour, re-traced: heavier back and belly
    V.ink(HORSE.slice(0, 8), { brush: 'charcoal', w: 1.2, color: C.char, smooth: true, seed: 82, wob: 2, taper: [10, 10] });
    V.ink(HORSE.slice(19, 31), { brush: 'charcoal', w: 1.3, color: C.char, smooth: true, seed: 85, wob: 2, taper: [10, 10] });
    V.ink(HORSE.slice(7, 20), { brush: 'charcoal', w: 0.9, color: C.char, smooth: true, seed: 86, wob: 1, taper: [6, 6] });
    V.push(); V.translate(3, 6);
    V.ink(HORSE.slice(23, 29), { brush: 'charcoal', w: 0.8, color: '#2a1d16', smooth: true, seed: 83, wob: 2, taper: [30, 30] });
    V.pop();
    V.dot(780, 370, 3.4, '#e3d2b0', { alpha: 0.9, seed: 84 });
    V.dot(781, 370, 1.5, '#0e0906', { seed: 87 });
  }

  // older, faded mammoth in red outline (upper right), partly lost under calcite
  function cave_paintMammoth() {
    const col = '#b04a2a';
    const M = [[1262, 330], [1264, 272], [1290, 216], [1338, 184], [1392, 186], [1430, 208], [1480, 220], [1560, 228], [1628, 252], [1660, 300], [1668, 360], [1660, 410]];
    V.ink(M, { brush: 'charcoal', w: 1.5, color: col, alpha: 0.9, smooth: true, seed: 90, wob: 2 });
    V.push(); V.translate(-4, 5);
    V.ink(M.slice(1, 7), { brush: 'charcoal', w: 0.9, color: col, alpha: 0.6, smooth: true, seed: 91, wob: 2 });
    V.pop();
    V.ink([[1264, 282], [1244, 330], [1238, 392], [1252, 432], [1268, 426]], { brush: 'charcoal', w: 1.1, color: col, alpha: 0.75, smooth: true, seed: 92 });
    V.ink([[1288, 330], [1272, 372], [1302, 402], [1344, 386]], { brush: 'charcoal', w: 1.1, color: col, alpha: 0.65, smooth: true, seed: 93 });
    V.ink([[1330, 420], [1420, 432], [1520, 430], [1600, 420]], { brush: 'charcoal', w: 1.0, color: col, alpha: 0.6, smooth: true, seed: 94, taper: [40, 40] });
    V.ink([[1340, 420], [1338, 490], [1352, 520]], { brush: 'charcoal', w: 1.1, color: col, alpha: 0.55, smooth: true, seed: 95 });
    V.ink([[1610, 420], [1616, 490], [1600, 520]], { brush: 'charcoal', w: 1.1, color: col, alpha: 0.55, smooth: true, seed: 96 });
    V.ink([[1316, 236], [1328, 236]], { brush: 'charcoal', w: 1.1, color: col, alpha: 0.75, seed: 97 });
    for (let i = 0; i < 11; i++) {
      const x = 1376 + i * 24;
      V.ink([[x, 214 + i * 2], [x - 5, 240 + i * 2]], { brush: 'charcoal', w: 0.8, color: col, alpha: 0.55, seed: 98 + i, taper: [2, 4] });
    }
  }

  function cave_paintSigns() {
    const r = V.rng(4040);
    for (let i = 0; i < 8; i++) {
      const x = 960 + (i % 4) * 34 + r() * 10, y = 170 + Math.floor(i / 4) * 36 + r() * 10;
      V.dot(x, y, 9 + r() * 3, i % 3 ? '#a8432a' : '#8f3a24', { alpha: 0.85, seed: 500 + i });
      V.ink(V.ellipsePts(x, y, 10, 11, 10), { brush: 'pastel', w: 0.5, color: '#a8432a', closed: true, alpha: 0.6, seed: 520 + i });
    }
    V.ink([[1528, 470], [1530, 520], [1536, 556], [1550, 570], [1556, 550], [1542, 538]], { brush: 'charcoal', w: 1.4, color: '#9c3f27', alpha: 0.85, smooth: true, seed: 510 });
  }

  // ------------------------------------------------------------ animated pieces
  // closed outline around a polyline with per-point widths (a painted limb)
  function cave_limb(chain, widths) {
    const L = [], R = [];
    for (let i = 0; i < chain.length; i++) {
      const a = chain[Math.max(0, i - 1)], b = chain[Math.min(chain.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const w = widths[i] / 2;
      L.push([chain[i][0] + nx * w, chain[i][1] + ny * w]);
      R.push([chain[i][0] - nx * w, chain[i][1] - ny * w]);
    }
    return L.concat(R.reverse());
  }
  // the bison's front legs (screen coords): sitting up, forearms held out under the chin, hooves tipped up like
  // palms, see-sawing with V.G.arm (near leg = screen-left hand = "six")
  function cave_bisonLegs(t, bob) {
    const legs = [
      { side: 1, sx: 1046, sy: 612, kx: 996, ky: 698, l2: 92, top: '#6e2a17', low: '#24160f', sd: 600, s: 0.86 }, // far leg (behind)
      { side: 0, sx: 1000, sy: 620, kx: 950, ky: 706, l2: 102, top: '#943a20', low: '#0f0906', sd: 640, s: 1 }, // near leg
    ];
    legs.forEach((L) => {
      const y = V.G.arm(t, L.side).y;
      const sy = L.sy + bob;
      const kx = L.kx + 4 * y, ky = L.ky + bob - 9 * y;
      const ang = 0.38 * y; // forearm elevation (+ = hoof up)
      const ux = -Math.cos(ang), uy = -Math.sin(ang);
      const hx = kx + ux * L.l2, hy = ky + uy * L.l2;
      const px = uy, py = -ux; // perpendicular, pointing up
      const tip = [hx + (ux * 0.85 + px * 0.5) * 24 * L.s, hy + (uy * 0.85 + py * 0.5) * 24 * L.s];
      // the wall is scraped pale around the limb (as at Chauvet) so it reads against the dark chest
      V.ink([[kx + 6, ky], [hx, hy], tip], { brush: 'pastel', w: 1.9 * L.s, color: '#e4d1ac', alpha: 0.8, seed: L.sd, taper: [10, 6] });
      // muscular upper leg, growing out of the red chest and darkening toward the knee
      const mx = (L.sx + kx) / 2 - 6, my = (sy + ky) / 2;
      const up = cave_limb([[L.sx + 16, sy - 54], [L.sx, sy - 6], [mx, my], [kx, ky]], [52 * L.s, 50 * L.s, 38 * L.s, 25 * L.s]);
      V.fill(up, { color: L.top, alpha: 0.75, flat: true, seed: L.sd + 1, smooth: true });
      V.fill(up, { color: L.top, alpha: 0.45, flat: false, bleed: 0.12, tex: 0.6, border: 0.3, seed: L.sd + 9, smooth: true });
      cave_furAlong([up[1], up[2], up[3]], { len: 16, dir: -1, lean: 0.5, w: 0.7 * L.s, step: 8, seed: L.sd + 30 });
      const upLow = cave_limb([[mx + 2, my - 10], [kx, ky]], [36 * L.s, 25 * L.s]);
      V.fill(upLow, { color: '#1c0f09', alpha: 0.55, flat: false, bleed: 0.3, tex: 0.5, border: 0.2, seed: L.sd + 8 });
      V.ink([up[1], up[2], up[3]], { brush: 'charcoal', w: 1.1, color: C.char, seed: L.sd + 3, taper: [20, 4], wob: 1.5, smooth: true });
      // long "chaps" hair hanging behind the forearm (very bison)
      for (let k = 0; k < 6; k++) {
        const q = 0.3 + k * 0.12;
        const bx = L.sx + (kx - L.sx) * q + 14 * L.s, by = sy + (ky - sy) * q;
        V.ink([[bx, by], [bx + 6 + k * 2, by + 24 + (k % 2) * 9]], { brush: 'charcoal', w: 0.95 * L.s, color: C.char, seed: L.sd + 10 + k, taper: [2, 8] });
      }
      // black forearm (cannon) + hoof wedge
      const low = cave_limb([[kx, ky], [kx + ux * L.l2 * 0.5, ky + uy * L.l2 * 0.5], [hx, hy], tip], [26 * L.s, 17 * L.s, 16 * L.s, 7 * L.s]);
      V.fill(low, { color: L.low, alpha: 0.92, flat: true, seed: L.sd + 2 });
      const hoof = cave_limb([[hx - ux * 4, hy - uy * 4], [hx + (tip[0] - hx) * 0.5, hy + (tip[1] - hy) * 0.5], tip], [22 * L.s, 20 * L.s, 6 * L.s]);
      V.fill(hoof, { color: '#080504', alpha: 0.95, flat: true, seed: L.sd + 7 });
      V.ink(low, { brush: 'charcoal', w: 0.9, color: C.char, closed: true, seed: L.sd + 4, taper: [0, 0], wob: 1.2 });
      // cleft between the two toes
      V.ink([[hx + ux * 3, hy + uy * 3], [tip[0] - (tip[0] - hx) * 0.05, tip[1] - (tip[1] - hy) * 0.05]], { brush: 'charcoal', w: 0.5, color: '#d6c29c', seed: L.sd + 5, taper: [6, 1] });
    });
  }

  // Levantine stick hunter, frontal, doing 67
  function cave_hunter(t, o) {
    const pulse = V.G.pulse(t);
    const sink = 8 * pulse;
    V.push();
    V.translate(o.x, o.y);
    V.scale(o.s);
    const col = o.col, col2 = o.col2 || col, sd = o.seed;
    const bend = 7 * pulse;
    const hip = [0, -128 + sink];
    V.ink([hip, [-13 - bend, -64], [-24, 0]], { brush: 'charcoal', w: 1.6, color: col, seed: sd + 1, taper: [2, 5] });
    V.ink([hip, [15 + bend, -64], [26, 0]], { brush: 'charcoal', w: 1.6, color: col, seed: sd + 2, taper: [2, 5] });
    V.ink([[-24, 0], [-38, 3]], { brush: 'charcoal', w: 1.2, color: col, seed: sd + 3, taper: [1, 3] });
    V.ink([[26, 0], [40, 3]], { brush: 'charcoal', w: 1.2, color: col, seed: sd + 4, taper: [1, 3] });
    const sh = -238 + sink;
    V.fill([[-30, sh - 2], [30, sh - 2], [6, hip[1] + 6], [-6, hip[1] + 6]], { color: col2, alpha: 0.92, flat: true, seed: sd + 5 });
    V.ink([[-30, sh], [-5, hip[1] + 2]], { brush: 'charcoal', w: 1.1, color: col, seed: sd + 7, taper: [2, 12] });
    V.ink([[30, sh], [5, hip[1] + 2]], { brush: 'charcoal', w: 1.1, color: col, seed: sd + 8, taper: [2, 12] });
    V.ink([[-32, sh], [32, sh]], { brush: 'charcoal', w: 1.4, color: col, seed: sd + 9, taper: [3, 3] });
    V.ink([[-14, sh + 6], [-2, hip[1] - 8]], { brush: 'pastel', w: 0.45, color: o.tex || col, alpha: 0.7, seed: sd + 16, taper: [4, 4] });
    V.ink([[14, sh + 6], [2, hip[1] - 8]], { brush: 'pastel', w: 0.45, color: o.tex || col, alpha: 0.7, seed: sd + 17, taper: [4, 4] });
    V.ink([[-8, hip[1] - 2], [8, hip[1] - 2]], { brush: 'charcoal', w: 1.2, color: col, seed: sd + 15 });
    const tilt = V.G.tilt(t, 0.16);
    const hx = Math.sin(tilt) * 34, hy = sh - 30;
    V.ink([[0, sh], [hx * 0.5, sh - 14]], { brush: 'charcoal', w: 1.3, color: col, seed: sd + 10 });
    if (o.head === 'trap') {
      V.push(); V.translate(hx, hy); V.rotate(tilt);
      V.fill([[-10, 13], [10, 13], [16, -15], [-16, -15]], { color: col2, alpha: 0.95, flat: true, seed: sd + 11 });
      V.ink([[-10, 13], [10, 13], [16, -15], [-16, -15]], { brush: 'charcoal', w: 1.1, color: col, closed: true, seed: sd + 12, taper: [0, 0] });
      V.ink([[-13, -15], [-21, -34]], { brush: 'charcoal', w: 1.0, color: col, seed: sd + 13, taper: [1, 4] });
      V.ink([[13, -15], [21, -34]], { brush: 'charcoal', w: 1.0, color: col, seed: sd + 14, taper: [1, 4] });
      V.pop();
    } else {
      V.dot(hx, hy, 15, col2, { alpha: 0.95, seed: sd + 11 });
      V.ink(V.ellipsePts(hx, hy, 15, 16, 14), { brush: 'charcoal', w: 1.1, color: col, closed: true, seed: sd + 12, wob: 1.2, taper: [0, 0] });
    }
    [0, 1].forEach((side) => {
      const a = V.G.arm(t, side);
      const m = side === 0 ? -1 : 1;
      const S = [m * 29, sh + 4];
      const E = [m * 50, sh + 64 - 10 * a.y];
      const ang = 0.08 + 0.66 * a.y;
      const fl = 66;
      const Hd = [E[0] + m * Math.cos(ang) * fl, E[1] - Math.sin(ang) * fl];
      V.ink([S, E], { brush: 'charcoal', w: 1.75, color: col, seed: sd + 20 + side, taper: [2, 1] });
      V.ink([E, Hd], { brush: 'charcoal', w: 1.7, color: col, seed: sd + 30 + side, taper: [1, 2] });
      const pa = [Hd[0] + m * 16, Hd[1] - 4];
      V.ink([[Hd[0], Hd[1]], [Hd[0] + m * 8, Hd[1] + 5], pa], { brush: 'charcoal', w: 1.5, color: col, smooth: true, seed: sd + 22 + side, taper: [1, 2] });
      V.ink([pa, [pa[0] + m * 7, pa[1] - 11]], { brush: 'charcoal', w: 0.9, color: col, seed: sd + 24 + side, taper: [1, 3] });
      V.ink([[pa[0] - m * 5, pa[1] + 1], [pa[0] - m * 1, pa[1] - 12]], { brush: 'charcoal', w: 0.9, color: col, seed: sd + 26 + side, taper: [1, 3] });
      V.ink([[Hd[0] + m * 1, Hd[1] - 1], [Hd[0] - m * 4, Hd[1] - 10]], { brush: 'charcoal', w: 0.9, color: col, seed: sd + 28 + side, taper: [1, 3] });
    });
    V.pop();
  }
  const HUNTERS = [
    { x: 300, y: 950, s: 1.0, col: '#9c3a22', col2: '#a53f26', tex: '#c45c34', head: 'dot', seed: 700 },
    { x: 488, y: 932, s: 1.08, col: C.char, col2: '#22160f', tex: '#3a2a20', head: 'trap', seed: 760 },
    { x: 676, y: 956, s: 0.96, col: '#a33d23', col2: '#b04a2c', tex: '#cf6a3e', head: 'dot', seed: 820 },
  ];
  function cave_spear() {
    V.ink([[760, 960], [812, 700]], { brush: 'charcoal', w: 1.0, color: C.ochreD, seed: 880, taper: [4, 2] });
    V.ink([[812, 700], [804, 676], [822, 682], [812, 700]], { brush: 'charcoal', w: 1.0, color: C.ochreD, seed: 881 });
  }

  // tally marks: 6 (charcoal) and 7 (ochre); the one being "said" darkens & swells
  function cave_tallies(t) {
    const say = V.G.say(t);
    const groups = [
      { n: 6, x: 1000, y: 756, col: C.char, gap: 28 },
      { n: 7, x: 1206, y: 756, col: '#b84a2a', gap: 28 },
    ];
    groups.forEach((g) => {
      const on = say.n === g.n ? 1 : 0;
      const k = on * (0.6 + 0.4 * say.env);
      const sc = 1 + 0.08 * k;
      const cx = g.x + ((g.n - 1) * g.gap) / 2, cy = g.y + 100;
      V.push();
      V.translate(cx, cy); V.scale(sc); V.translate(-cx, -cy);
      for (let i = 0; i < g.n; i++) {
        const x = g.x + i * g.gap + Math.sin(i * 2.3) * 4;
        const top = g.y + Math.sin(i * 1.7) * 9, bot = g.y + 112 + Math.cos(i * 1.3) * 12;
        const lean = Math.sin(i * 3.1 + g.n) * 6;
        V.ink([[x, top], [x + lean * 0.5, (top + bot) / 2], [x + lean, bot]], { brush: 'charcoal', w: 1.45, color: on ? g.col : V.mix(g.col, '#a08062', 0.62), alpha: on ? 1 : 0.7, smooth: true, seed: 900 + g.n * 20 + i, taper: [6, 16] });
      }
      V.pop();
    });
  }

  // ------------------------------------------------------------ lighting
  const LUT = (() => {
    const lut = new Uint8ClampedArray(256 * 3);
    const stops = [[0, [0, 0, 0]], [0.12, [26, 9, 2]], [0.3, [108, 46, 14]], [0.52, [204, 118, 52]], [0.75, [250, 182, 108]], [1, [255, 222, 168]]];
    for (let i = 0; i < 256; i++) {
      const v = i / 255;
      let s = 0;
      while (s < stops.length - 2 && v > stops[s + 1][0]) s++;
      const [a, ca] = stops[s], [b, cb] = stops[s + 1];
      const q = V.clamp((v - a) / (b - a));
      for (let c = 0; c < 3; c++) lut[i * 3 + c] = ca[c] + (cb[c] - ca[c]) * q;
    }
    return lut;
  })();
  function cave_light(t) {
    const fl = 0.93 + 0.06 * (V.noise1(t * 2.1 + 3) - 0.5) * 2 + 0.03 * (V.noise1(t * 6.3 + 9) - 0.5) * 2;
    const lx = 840 + 110 * (V.noise1(t * 0.3 + 1.3) - 0.5) * 2 + 8 * (V.noise1(t * 5) - 0.5);
    const ly = 560 + 45 * (V.noise1(t * 0.26 + 7.1) - 0.5) * 2 + 6 * (V.noise1(t * 4.4 + 2) - 0.5);
    // a small fat-lamp burning low on the left (steadier, dimmer)
    const ef = 0.42 + 0.05 * (V.noise1(t * 3.3 + 17) - 0.5) * 2;
    return { fl, lx, ly, lz: 640, ex: 250, ey: 720, ef };
  }
  function cave_lightmap(t) {
    const Wl = WALL;
    const g = V.gfx('cave_lm', Wl.LW, Wl.LH, () => {});
    const ctx = g.drawingContext;
    const img = ctx.createImageData(Wl.LW, Wl.LH);
    const D = img.data;
    const L = cave_light(t);
    const R2 = 1150 * 1150;
    for (let j = 0; j < Wl.LH; j++) {
      const py = (j + 0.5) * 4;
      for (let i = 0; i < Wl.LW; i++) {
        const k = j * Wl.LW + i;
        const px = (i + 0.5) * 4;
        const dx = L.lx - px, dy = L.ly - py, dz = L.lz - Wl.big.f[k] * 90;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const ndl = Math.max(0, (Wl.nx[k] * dx + Wl.ny[k] * dy + Wl.nz[k] * dz) / d);
        const fall = 1 / Math.pow(1 + (dx * dx + dy * dy) / R2, 1.8);
        const ex = L.ex - px, ey = L.ey - py, ez = 300 - Wl.big.f[k] * 90;
        const ed = Math.sqrt(ex * ex + ey * ey + ez * ez);
        const endl = Math.max(0, (Wl.nx[k] * ex + Wl.ny[k] * ey + Wl.nz[k] * ez) / ed);
        const efall = 1 / Math.pow(1 + (ex * ex + ey * ey) / (520 * 520), 2);
        const I = Math.min(1, L.fl * fall * (0.62 + 0.48 * ndl) + L.ef * efall * (0.5 + 0.5 * endl));
        const q = Math.round(I * 255) * 3;
        D[k * 4] = LUT[q]; D[k * 4 + 1] = LUT[q + 1]; D[k * 4 + 2] = LUT[q + 2]; D[k * 4 + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return { g, L };
  }

  function cave_dust(t, L) {
    V.with2d((ctx) => {
      const r = V.rng(3131);
      for (let i = 0; i < 40; i++) {
        const bx = r() * W, by = r() * H, sp = 5 + r() * 12, ph = r() * 100, sz = 0.7 + r() * 1.8;
        const x = bx + 40 * Math.sin(t * 0.3 + ph) + t * sp * 0.5;
        const y = by - t * sp + 18 * Math.sin(t * 0.5 + ph * 1.3);
        const X = ((x % W) + W) % W, Y = ((y % H) + H) % H;
        const d = Math.hypot(X - L.lx, Y - L.ly);
        const a = V.clamp(1 - d / 760) * (0.3 + 0.45 * r()) * (0.6 + 0.4 * Math.sin(t * 2 + ph));
        if (a <= 0.01) continue;
        ctx.fillStyle = `rgba(255,214,160,${a})`;
        ctx.beginPath(); ctx.arc(X, Y, sz, 0, Math.PI * 2); ctx.fill();
      }
    }, { blend: 'screen' });
  }

  // ------------------------------------------------------------ static layers (baked once per page)
  let LAYERS = null;
  function cave_grab(fn) {
    clear();
    V.resetBrush();
    V.mReset();
    fn();
    V.flush();
    return get();
  }
  function cave_layers() {
    if (LAYERS) return LAYERS;
    const Wl = cave_buildWall();
    const wallCv = V.gfx('cave_wallcv', W, H, (ctx) => ctx.drawImage(Wl.cv, 0, 0));
    const wall = cave_grab(() => {
      V.bg('#000');
      // throw-away fill: p5.brush may swallow the first fill of a page if our bake happens to be the warm-up frame
      V.fill([[-60, -60], [-40, -60], [-40, -40]], { color: '#000000', seed: 1 });
      V.blit(wallCv, 0, 0, W, H);
      cave_paintMammoth();
      cave_paintSigns();
      EXTRA.forEach((e, i) => V.blit(cave_stencil(e.key, e.col, e.left, 1200 + i * 31, e.s, e.den), e.x - 180, e.y - 180, 360, 420, { alpha: 0.9 }));
      ROW.forEach((h, i) => V.blit(cave_stencil('r' + i, h.col, h.left, 1100 + i * 17, h.s), h.x - 180, h.y - 180, 360, 420, { alpha: 0.9 }));
      cave_paintHorse();
    });
    const combo = cave_grab(() => {
      V.bg('#000');
      V.blit(wall, 0, 0, W, H);
      cave_paintBison();
    });
    // cut the bison out by differencing (so it can bob on the beat without a transparent-layer halo)
    const bx = 740, by = 240, bw = 800, bh = 540;
    const A = wall.drawingContext.getImageData(bx, by, bw, bh).data;
    const B = combo.drawingContext.getImageData(bx, by, bw, bh).data;
    const bison = V.gfx('cave_bisoncut', bw, bh, (ctx) => {
      const im = ctx.createImageData(bw, bh);
      const O = im.data;
      for (let i = 0; i < O.length; i += 4) {
        const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
        O[i] = B[i]; O[i + 1] = B[i + 1]; O[i + 2] = B[i + 2];
        O[i + 3] = 255 * sstep(4, 36, d);
      }
      ctx.putImageData(im, 0, 0);
    });
    LAYERS = { wall, bison, bx, by, bw, bh };
    return LAYERS;
  }

  // ------------------------------------------------------------ scene
  V.scenes.cave = {
    init() {
      cave_buildWall();
    },
    draw(t, u) {
      const Ls = cave_layers();
      V.bg('#000');
      V.blit(Ls.wall, 0, 0, W, H);
      const bob = 5 * V.G.pulse(t);
      V.blit(Ls.bison, Ls.bx, Ls.by + bob, Ls.bw, Ls.bh);
      cave_bisonLegs(t, bob);
      cave_tallies(t);
      cave_spear();
      HUNTERS.forEach((h) => cave_hunter(t, h));
      // stencil row: left hands flare on "six", right hands on "seven"
      const say = V.G.say(t);
      const k = 0.55 + 0.45 * say.env;
      ROW.forEach((h, i) => {
        if ((say.n === 6) !== h.left) return;
        const sc = 1 + 0.035 * k;
        V.blit(cave_stencil('r' + i, h.col, h.left, 1100 + i * 17, h.s), h.x - 180 * sc, h.y - 180 * sc, 360 * sc, 420 * sc, { alpha: 0.85 * k });
      });
      // pigment skips the deepest pits of the rock, then the rock's relief shades wall and paint alike
      V.blit(V.gfx('cave_pits', W, H, (ctx) => ctx.drawImage(WALL.pits, 0, 0)), 0, 0, W, H, { alpha: 0.8 });
      V.blit(V.gfx('cave_rel', W, H, (ctx) => ctx.drawImage(WALL.rel, 0, 0)), 0, 0, W, H, { blend: 'multiply' });
      if (DBG) return;
      // torch light (normal-mapped, flickering, drifting)
      const { g, L } = cave_lightmap(t);
      V.blit(g, 0, 0, W, H, { blend: 'multiply' });
      V.with2d((ctx) => {
        const gr = ctx.createRadialGradient(L.lx, L.ly + 160, 60, L.lx, L.ly + 160, 820);
        gr.addColorStop(0, `rgba(255,140,50,${0.16 * L.fl})`);
        gr.addColorStop(1, 'rgba(255,140,50,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);
      }, { blend: 'screen' });
      // the negative hands light up on their word
      ROW.forEach((h, i) => {
        if ((say.n === 6) !== h.left) return;
        V.blit(cave_handGlow('r' + i, h.left, 1100 + i * 17, h.s), h.x - 180, h.y - 180, 360, 420, { blend: 'screen', alpha: 0.26 * k });
      });
      cave_dust(t, L);
      V.vignette({ amt: 0.22, inner: 0.45 });
      V.grain({ amt: 0.1 });
      void u;
    },
  };
})();
