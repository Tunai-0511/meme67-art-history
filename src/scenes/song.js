/* song.js — 約 1000 CE · 北宋水墨山水 (after Fan Kuan 范寬《谿山行旅圖》). Scene 26.0–30.0 s (4 s).
 * Layers (bottom → top):
 *   silk (2D gfx, opaque)  ×  ink composite (multiply): [far ranges + flanking peaks + main peak] → waterfall → mist veils
 *   → [middle ground: grove, temple, low hills] → low mist → [foreground: boulders, road, stream, big trees]
 *   → live swaying leaf clusters → travellers (scholar, mule, porter) doing 67 → inscription + seals → silk patina.
 * Heavy ink work (tens of thousands of p5.brush raindrop dabs, recursive trees) is baked ONCE onto white and composited
 * with multiply (ink on silk). Only the moving parts are painted per frame.
 */
(function () {
  const INK = '#1a1612';
  const VERM = '#b0281c';
  const W = 1920, H = 1080;
  const clamp = V.clamp, lerp = V.lerp, sm = V.smooth;

  // ================================================================== helpers
  const BK = {};
  /** bake brush work onto a WHITE canvas once; returns the p5.Image (use .canvas in 2D). */
  function song_bake(key, fn) {
    if (!BK[key]) {
      V.flush();
      blendMode(BLEND);
      noTint();
      clear();
      background(255);
      V.mReset();
      V.resetBrush();
      fn();
      V.flush();
      V.resetBrush();
      BK[key] = get();
    }
    return BK[key];
  }
  const song_cv = (g) => (g.canvas instanceof HTMLCanvasElement ? g.canvas : g.elt);
  const song_pip = (P, x, y) => {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  /** sorted x where the horizontal line y crosses closed polygon P */
  const song_scanX = (P, y) => {
    const xs = [];
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if (yi > y !== yj > y) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
    }
    return xs.sort((a, b) => a - b);
  };
  /** smallest y where the vertical line x crosses closed polygon P (its top) */
  const song_topOf = (P, x) => {
    let best = 1e9;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if (xi > x !== xj > x) best = Math.min(best, yi + ((x - xi) * (yj - yi)) / (xj - xi));
    }
    return best;
  };
  /** x of a polyline (sorted by y) at y — clamped at the ends */
  const song_xAt = (P, y) => {
    if (y <= P[0][1]) return P[0][0];
    for (let i = 1; i < P.length; i++) if (y <= P[i][1]) { const a = P[i - 1], b = P[i]; return lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1] || 1)); }
    return P[P.length - 1][0];
  };
  /** y of a polyline (sorted by x) at x */
  const song_yAt = (P, x) => {
    if (x <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const a = P[i - 1], b = P[i]; return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0] || 1)); }
    return P[P.length - 1][1];
  };
  /** distance from (x,y) to closed polygon boundary */
  const song_dEdge = (P, x, y) => {
    let d = 1e9;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const ax = P[j][0], ay = P[j][1], bx = P[i][0], by = P[i][1];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2);
      d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
    return d;
  };
  const song_bbox = (P) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    P.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    return [x0, y0, x1, y1];
  };
  const song_path2d = (ctx, P) => {
    ctx.beginPath();
    ctx.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
    ctx.closePath();
  };
  const song_fbm = (x, y) => 0.55 * V.noise2(x, y) + 0.3 * V.noise2(x * 2.1 + 7, y * 2.1 + 3) + 0.15 * V.noise2(x * 4.3 + 1, y * 4.3 + 9);
  const song_smoothP = (P, closed) => V.smoothPts(P, closed, 5);

  /** one brush dab / short stroke */
  function song_dab(x, y, dx, dy, w, color, br = 'bristle', seed = 0) {
    randomSeed(seed);
    brush.set(br, color, w);
    brush.line(x, y, x + dx, y + dy);
    V.pending = true;
  }
  /** broken, pressure-varied contour: splits a long path into overlapping strokes (never one line all the way). */
  function song_contour(P, o = {}) {
    const op = Object.assign({ w: 1, brush: 'inkDry', color: INK, seg: 140, gap: 0.15, seed: 1, alpha: 1, wob: 1.2, taper: [10, 22], smooth: true, wv: 0.7 }, o);
    const pts = V.resample(op.smooth ? song_smoothP(P, false) : P, 4);
    let L = 0;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push((L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])));
    const r = V.rng(op.seed * 77 + 3);
    let s = 0, k = 0;
    while (s < L - 6) {
      const len = op.seg * (0.6 + r() * 0.8);
      const e = Math.min(L, s + len);
      const seg = pts.filter((p, i) => cum[i] >= s && cum[i] <= e);
      if (seg.length > 1) {
        const ww = op.w * (1 - op.wv / 2 + r() * op.wv);
        V.ink(seg, { w: ww, brush: op.brush, color: op.color, alpha: op.alpha * (0.75 + r() * 0.25), seed: op.seed * 31 + k, wob: op.wob, taper: op.taper, step: 4 });
      }
      s = e - (r() < op.gap ? -len * 0.12 : len * 0.12); // overlap, sometimes a small dry gap
      k++;
    }
  }
  /** paint polygon pure white in the bake (occludes ink behind it — multiply space) */
  function song_occlude(P) {
    V.with2d((ctx) => {
      song_path2d(ctx, P);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
  }

  // ================================================================== geometry (1920×1080)
  const MAIN = [
    [596, 790], [610, 700], [622, 620], [633, 540], [644, 465], [656, 400], [670, 345], [690, 300], [712, 266], [734, 240], [752, 222],
    [766, 206], [780, 194], [798, 176], [816, 154], [838, 134], [864, 118], [894, 106], [926, 97], [958, 88], [990, 81], [1022, 75],
    [1052, 72], [1082, 76], [1112, 84], [1140, 90], [1166, 100], [1190, 114], [1212, 132], [1232, 156], [1248, 184], [1262, 220],
    [1276, 262], [1290, 310], [1302, 365], [1314, 425], [1326, 490], [1338, 560], [1352, 640], [1368, 720], [1384, 790],
  ].map(([x, y], i) => (y < 230 ? [x, y + (V.noise1(i * 0.9 + 4) - 0.5) * 8] : [x, y]));
  const song_mainSpan = (y) => { const xs = song_scanX(MAIN, y); return xs.length ? [xs[0], xs[xs.length - 1]] : [1000, 1000]; };
  const song_mainTop = (x) => song_topOf(MAIN, x);
  // crevices: [strength, polyline sorted by y]
  const CREV = [
    [1.0, [[774, 192], [768, 280], [758, 380], [748, 480], [742, 600], [738, 760]]],
    [0.5, [[838, 136], [843, 230], [834, 330], [828, 420]]],
    [0.85, [[906, 103], [912, 200], [904, 310], [896, 430], [890, 560], [886, 720]]],
    [0.4, [[960, 90], [963, 180], [960, 262]]],
    [1.0, [[1014, 76], [1021, 180], [1027, 300], [1019, 420], [1011, 560], [1006, 720]]],
    [0.5, [[1070, 75], [1074, 170], [1079, 262], [1075, 360]]],
    [0.85, [[1130, 89], [1135, 200], [1141, 320], [1135, 450], [1129, 590], [1124, 720]]],
    [1.0, [[1213, 133], [1219, 230], [1225, 340], [1231, 460], [1235, 590], [1240, 720]]],
    [0.45, [[1262, 222], [1271, 320], [1283, 430]]],
  ];
  const PILLARS = CREV.filter((c) => c[1].length >= 6).map((c) => c[1]);
  const FALL_X = (y) => song_xAt(CREV[7][1], y) + 4; // waterfall runs down the right-hand cleft
  const LPEAK0 = [[300, 800], [330, 700], [360, 620], [392, 560], [420, 512], [446, 482], [468, 450], [486, 428], [508, 410], [526, 386], [546, 366], [566, 354], [586, 358], [604, 374], [622, 396], [642, 410], [662, 430], [684, 456], [700, 520], [706, 640], [700, 800]];
  const RPEAK0 = [[1300, 800], [1318, 560], [1336, 500], [1360, 452], [1388, 416], [1416, 390], [1440, 374], [1462, 368], [1482, 376], [1500, 394], [1520, 404], [1546, 414], [1572, 434], [1600, 462], [1630, 496], [1664, 530], [1700, 562], [1740, 592], [1790, 618], [1850, 636], [1940, 652], [1940, 800]];
  const song_jag = (P, amp, seed, below = 9999) => {
    const out = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      out.push(a);
      if (i === P.length - 1) break;
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14));
      for (let k = 1; k < n; k++) {
        const f = k / n, x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f);
        const j = y < below ? (V.noise1(x * 0.05 + seed) - 0.5) * amp + (V.hash(x * 0.37 + seed) - 0.5) * amp * 0.35 : 0;
        out.push([x, y + j]);
      }
    }
    return out;
  };
  const LPEAK = song_jag(LPEAK0, 16, 3, 600);
  const RPEAK = song_jag(RPEAK0, 14, 9, 600);
  const FARL = [[-20, 800], [-20, 520], [50, 494], [120, 476], [180, 470], [240, 486], [300, 512], [350, 540], [400, 580], [430, 800]];
  const FARR = [[1560, 800], [1600, 600], [1660, 570], [1720, 556], [1780, 548], [1850, 556], [1940, 578], [1940, 800]];
  const FARM = [[1240, 520], [1290, 470], [1330, 436], [1370, 450], [1400, 480], [1420, 560], [1250, 560]]; // pale peak glimpsed past the main shoulder

  // ================================================================== silk
  function song_silkGfx() {
    return V.gfx('song_silk', W, H, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#cbb888');
      g.addColorStop(0.18, '#d4c394');
      g.addColorStop(0.55, '#d7c69a');
      g.addColorStop(1, '#c4af7e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // low-frequency mottling (age, uneven sizing of the silk)
      const lw = 240, lh = 135;
      const c = document.createElement('canvas');
      c.width = lw; c.height = lh;
      const cx = c.getContext('2d');
      const img = cx.createImageData(lw, lh);
      for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
        const n = song_fbm(x / 26, y / 20) - 0.5, n2 = V.noise2(x / 7 + 40, y / 6) - 0.5;
        const i = (y * lw + x) * 4;
        const d = n * 26 + n2 * 8;
        img.data[i] = 120 - d; img.data[i + 1] = 92 - d; img.data[i + 2] = 52 - d * 0.6;
        img.data[i + 3] = clamp(Math.abs(n) * 2.2 + 0.05, 0, 1) * 70;
      }
      cx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(c, 0, 0, W, H);
      ctx.globalAlpha = 1;
      // three joined widths of silk: slight tone shift per panel + seams
      ctx.fillStyle = 'rgba(120,96,58,0.035)';
      ctx.fillRect(0, 0, 652, H);
      ctx.fillStyle = 'rgba(255,245,215,0.025)';
      ctx.fillRect(1290, 0, W - 1290, H);
      [652, 1290].forEach((sx, k) => {
        for (let y = 0; y < H; y += 3) {
          const dx = (V.noise1(y / 90 + k * 9) - 0.5) * 3;
          ctx.fillStyle = 'rgba(80,60,30,0.10)';
          ctx.fillRect(sx + dx, y, 1, 3);
          ctx.fillStyle = 'rgba(255,248,225,0.10)';
          ctx.fillRect(sx + dx + 1.5, y, 1, 3);
        }
      });
    });
  }
  /** multiply overlay: weave, slubs, stains, foxing, cracks, smoked edges (sits on top of the ink too). */
  const CRACKS = (() => {
    const rs = V.rng(191), out = [];
    for (let k = 0; k < 15; k++) out.push({ y0: 40 + rs() * (H - 80), x0: rs() * W * 0.5, len: 300 + rs() * 1300, a: 0.1 + rs() * 0.12, w: 0.8 + rs() * 0.9, k });
    return out;
  })();
  const crackPath = (ctx, c, dy) => {
    ctx.beginPath();
    for (let x = c.x0; x < Math.min(W, c.x0 + c.len); x += 6) {
      const y = c.y0 + dy + (V.noise1(x / 140 + c.k * 13) - 0.5) * 10;
      x === c.x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  };
  function song_patinaGfx() {
    return V.gfx('song_patina', W, H, (ctx) => {
      const img = ctx.createImageData(W, H);
      const d = img.data;
      const r = V.rng(77);
      const colV = new Float32Array(W), rowV = new Float32Array(H);
      for (let x = 0; x < W; x++) colV[x] = r() * 7 + (r() < 0.03 ? 10 : 0);
      for (let y = 0; y < H; y++) rowV[y] = r() * 7 + (r() < 0.03 ? 12 : 0);
      for (let y = 0; y < H; y++) {
        const fy = y % 3 === 0 ? 1 : 0;
        for (let x = 0; x < W; x++) {
          const fx = x % 3 === 0 ? 1 : 0;
          const v = 255 - (fx * 0.55 + fy * 0.45) * 9 - (colV[x] + rowV[y]) * 0.55 - r() * 9;
          const i = (y * W + x) * 4;
          d[i] = v; d[i + 1] = v - 1; d[i + 2] = v - 4; d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      const rs = V.rng(91);
      for (let k = 0; k < 9; k++) {
        const cx = rs() * W, cy = rs() * H, R = 40 + rs() * 140;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.55 + rs() * 0.6);
        ctx.beginPath();
        for (let a = 0; a <= 64; a++) {
          const th = (a / 64) * Math.PI * 2, rr = R * (0.8 + 0.35 * V.noise1(a * 0.25 + k * 7));
          a ? ctx.lineTo(Math.cos(th) * rr, Math.sin(th) * rr) : ctx.moveTo(Math.cos(th) * rr, Math.sin(th) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(150,120,80,0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(110,80,45,0.13)';
        ctx.lineWidth = 2.2;
        ctx.filter = 'blur(1.2px)';
        ctx.stroke();
        ctx.filter = 'none';
        ctx.restore();
      }
      for (let k = 0; k < 260; k++) {
        const x = rs() * W, y = rs() * H, R = rs() < 0.85 ? 0.6 + rs() * 1.4 : 2 + rs() * 4;
        ctx.fillStyle = `rgba(${90 + rs() * 50},${60 + rs() * 30},30,${0.12 + rs() * 0.25})`;
        ctx.beginPath();
        ctx.ellipse(x, y, R, R * (0.6 + rs() * 0.5), rs() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      CRACKS.forEach((c) => {
        crackPath(ctx, c, 0);
        ctx.strokeStyle = `rgba(70,50,25,${c.a})`;
        ctx.lineWidth = c.w;
        ctx.stroke();
      });
      const vg = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.42, W / 2, H / 2, W * 0.64);
      vg.addColorStop(0, 'rgba(110,80,45,0)');
      vg.addColorStop(0.7, 'rgba(110,80,45,0.12)');
      vg.addColorStop(1, 'rgba(70,45,20,0.42)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      const tb = ctx.createLinearGradient(0, 0, 0, H);
      tb.addColorStop(0, 'rgba(90,62,30,0.20)');
      tb.addColorStop(0.07, 'rgba(90,62,30,0)');
      tb.addColorStop(0.93, 'rgba(90,62,30,0)');
      tb.addColorStop(1, 'rgba(90,62,30,0.24)');
      ctx.fillStyle = tb;
      ctx.fillRect(0, 0, W, H);
    });
  }
  /** screen overlay: crack highlights + abraded silk (lighter than the silk) */
  function song_wearGfx() {
    return V.gfx('song_wear', W, H, (ctx) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      CRACKS.forEach((c) => {
        crackPath(ctx, c, 1.6);
        ctx.strokeStyle = 'rgba(150,140,110,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      const rs = V.rng(92);
      for (let k = 0; k < 40; k++) {
        const x = rs() * W, y = rs() * H;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rs() - 0.5) * 0.3);
        ctx.fillStyle = `rgba(120,110,85,${0.15 + rs() * 0.2})`;
        ctx.filter = 'blur(1.5px)';
        ctx.fillRect(-10 - rs() * 30, -1.5, 20 + rs() * 60, 2 + rs() * 3);
        ctx.restore();
      }
    });
  }

  // ================================================================== ink primitives (bake)
  /** 2D tonal wash from a tone function, clipped to polygon P, painted into the current bake. */
  function song_wash(P, toneFn, o = {}) {
    const op = Object.assign({ res: 4, alpha: 0.42, blur: 3, color: [26, 22, 18] }, o);
    const [x0, y0, x1, y1] = song_bbox(P);
    const bw = Math.ceil((x1 - x0) / op.res) + 2, bh = Math.ceil((y1 - y0) / op.res) + 2;
    const c = document.createElement('canvas');
    c.width = bw; c.height = bh;
    const cx = c.getContext('2d');
    const img = cx.createImageData(bw, bh);
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
      const T = toneFn(x0 + i * op.res, y0 + j * op.res);
      const k = (j * bw + i) * 4;
      img.data[k] = op.color[0]; img.data[k + 1] = op.color[1]; img.data[k + 2] = op.color[2];
      img.data[k + 3] = 255 * clamp(T) * op.alpha;
    }
    cx.putImageData(img, 0, 0);
    V.with2d((ctx) => {
      ctx.save();
      song_path2d(ctx, P);
      ctx.clip();
      ctx.filter = `blur(${op.blur}px)`;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(c, x0, y0, bw * op.res, bh * op.res);
      ctx.restore();
    });
  }
  /** raindrop texture (雨點皴): sample points in P, accept by tone, short vertical bristle dabs. */
  const BRUSH_K = { bristle: 1, charcoal: 1, inkDry: 2.4, ink: 3.2 };
  function song_raindrops(P, toneFn, o = {}) {
    const op = Object.assign({ n: 6000, seed: 1, pow: 1.4, dens: 0.85, wMin: 0.08, wMax: 0.17, lenMin: 2, lenMax: 4.6, angFn: null, color: INK, brushes: ['bristle', 'bristle', 'charcoal'], alpha: [0.3, 0.85] }, o);
    const [x0, y0, x1, y1] = song_bbox(P);
    const r = V.rng(op.seed);
    for (let k = 0; k < op.n; k++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
      const q = r(), rw = r(), rl = r(), rb = r(), ra = r(), rx = r();
      if (!song_pip(P, x, y)) continue;
      const T = toneFn(x, y);
      if (q > Math.pow(T, op.pow) * op.dens) continue;
      const len = lerp(op.lenMin, op.lenMax, rl) * (0.75 + 0.45 * T);
      const ang = (op.angFn ? op.angFn(x, y) : 0) + (rx - 0.5) * 0.4;
      const br = op.brushes[Math.floor(rb * op.brushes.length)];
      const w = lerp(op.wMin, op.wMax, rw) * (BRUSH_K[br] || 1) * (0.8 + 0.35 * T);
      const a = lerp(op.alpha[0], op.alpha[1], ra) * (0.5 + 0.5 * T);
      song_dab(x, y, Math.sin(ang) * len, Math.cos(ang) * len, w, V.withAlpha(op.color, a), br, op.seed * 7 + k);
    }
  }
  /** 2D micro-dot fabric under the brush dabs (fine, dense, cheap) */
  function song_microdots(P, toneFn, o = {}) {
    const op = Object.assign({ n: 20000, seed: 5, a: 0.34, s: 1 }, o);
    const [x0, y0, x1, y1] = song_bbox(P);
    V.with2d((ctx) => {
      const r = V.rng(op.seed);
      ctx.save();
      song_path2d(ctx, P);
      ctx.clip();
      for (let k = 0; k < op.n; k++) {
        const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), q = r(), s = r(), rot = r();
        const T = toneFn(x, y);
        if (q > T * 0.95) continue;
        ctx.fillStyle = `rgba(26,22,18,${op.a * (0.4 + 0.6 * T) * (0.5 + s * 0.6)})`;
        ctx.beginPath();
        ctx.ellipse(x, y, (0.5 + s * 0.7) * op.s, (1.2 + s * 1.8) * op.s, (rot - 0.5) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }
  /** long thin dry texture strokes (長條皴) concentrated where tone is dark */
  function song_streaks(P, toneFn, o = {}) {
    const op = Object.assign({ n: 60, seed: 9, lenMin: 30, lenMax: 140, w: [0.15, 0.32], alpha: [0.3, 0.6], tries: 600 }, o);
    const [x0, y0, x1, y1] = song_bbox(P);
    const r = V.rng(op.seed);
    let made = 0;
    for (let k = 0; k < op.tries && made < op.n; k++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), q = r(), rl = r(), rw = r(), ra = r(), rc = r();
      if (!song_pip(P, x, y) || q > toneFn(x, y)) continue;
      const len = lerp(op.lenMin, op.lenMax, rl);
      const bend = (rc - 0.5) * len * 0.12;
      const pts = [[x, y], [x + bend, y + len * 0.5], [x + bend * 0.4, y + len]];
      if (!song_pip(P, pts[2][0], pts[2][1])) continue;
      V.ink(pts, { w: lerp(op.w[0], op.w[1], rw), brush: 'inkDry', color: INK, alpha: lerp(op.alpha[0], op.alpha[1], ra), seed: op.seed * 13 + k, smooth: true, taper: [6, len * 0.5], wob: 0.6 });
      made++;
    }
  }

  // ---------------------------------------------------------------- foliage
  /** leaf cluster. type: 'dot' (胡椒點 vertical dots), 'jie' (介字點), 'pine' (fan of needles), 'shrub' (tiny crown blobs) */
  function song_cluster(x, y, R, type, seed, dark = 1, o = {}) {
    const r = V.rng(seed);
    const col = (a) => V.withAlpha(INK, clamp(a * dark));
    if (type === 'pine') {
      const fans = Math.max(2, Math.round(R / 5));
      for (let f = 0; f < fans; f++) {
        const fx = x + (r() - 0.5) * R * 1.6, fy = y + (r() - 0.5) * R * 0.5;
        const L = 7 + r() * 5;
        for (let q = 0; q < 9; q++) {
          const a = Math.PI * (1.08 + (q / 8) * 0.84) + (r() - 0.5) * 0.12;
          song_dab(fx, fy, Math.cos(a) * L, Math.sin(a) * L * 0.75, 0.035 + r() * 0.02, col(0.75 + r() * 0.25), 'ink', seed * 31 + f * 11 + q);
        }
        song_dab(fx - L * 0.8, fy + 0.5, L * 1.6, 0, 0.05, col(0.7), 'inkDry', seed * 37 + f);
      }
      return;
    }
    const n = Math.floor((type === 'jie' ? 8 : 16) + R * (type === 'jie' ? 0.45 : 1.1));
    if (type !== 'shrub' && R > 5 && UNDER) UNDER.push([x, y, R * 1.15, R * 0.62, 0.2 * dark]); // soft ink underlay (flushed in 2D)
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * R;
      const px = x + Math.cos(a) * d * 1.3, py = y + Math.sin(a) * d * 0.65 - (o.up ? d * 0.2 : 0);
      const edge = d / R; // lighter on the rim → round, airy clusters
      const al = (0.95 - 0.45 * edge) * (0.7 + r() * 0.3);
      if (type === 'dot') {
        song_dab(px, py, (r() - 0.5) * 1.5, 2 + r() * 3, 0.1 + r() * 0.1, col(al), 'bristle', seed * 3 + k);
      } else if (type === 'shrub') {
        song_dab(px, py, (r() - 0.5) * 1.2, 1.5 + r() * 2.5, 0.08 + r() * 0.08, col(al), 'bristle', seed * 3 + k);
      } else {
        // 介字點: two splayed strokes from a shared tip, each mark turned a little differently
        const s = 2.4 + r() * 2.6, rot = (r() - 0.5) * 0.9, sp = 0.55 + r() * 0.35;
        const a1 = Math.PI / 2 + sp + rot, a2 = Math.PI / 2 - sp + rot, l2 = s * (0.7 + r() * 0.5);
        song_dab(px, py - s * 0.6, Math.cos(a1) * s * 1.3, Math.sin(a1) * s * 1.3, 0.045, col(al), 'inkDry', seed * 3 + k);
        song_dab(px, py - s * 0.6, Math.cos(a2) * l2 * 1.3, Math.sin(a2) * l2 * 1.3, 0.045, col(al), 'inkDry', seed * 5 + k);
      }
    }
  }
  /** soft blurred ink underlays for foliage masses (collected by song_cluster, painted in one 2D pass) */
  let UNDER = null;
  function song_underFlush(blur = 2.5) {
    if (!UNDER || !UNDER.length) return;
    const U = UNDER;
    UNDER = [];
    V.with2d((ctx) => {
      ctx.filter = `blur(${blur}px)`;
      U.forEach(([x, y, rx, ry, a]) => {
        ctx.fillStyle = `rgba(26,22,18,${a})`;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }
  /** tiny tree for ridges / crowns: a stick + a little cluster */
  function song_shrub(x, y, h, seed, dark = 1) {
    const r = V.rng(seed);
    const lean = (r() - 0.5) * 0.3;
    song_dab(x, y, lean * h, -h * 0.8, 0.05 + r() * 0.04, V.withAlpha(INK, 0.85 * dark), 'inkDry', seed);
    song_cluster(x + lean * h * 0.8, y - h * 0.75, h * 0.36, 'shrub', seed * 7, dark);
  }
  /** recursive angular branch; ends collect twig tips */
  function song_branch(x, y, ang, len, w, depth, r, seed, ends) {
    let a = ang, px = x, py = y;
    const pts = [[x, y]];
    const n = 3;
    for (let s = 0; s < n; s++) {
      a += (r() - 0.5) * 0.65;
      px += (Math.cos(a) * len) / n;
      py += (Math.sin(a) * len) / n;
      pts.push([px, py]);
    }
    V.ink(pts, { w, brush: 'inkDry', seed, taper: [2, len * 0.55], wob: 0.5, step: 4 });
    if (depth > 0) {
      const kids = 2 + (r() < 0.45 ? 1 : 0);
      for (let k = 0; k < kids; k++) {
        const i = 1 + Math.floor(r() * n);
        const da = (k % 2 ? 1 : -1) * (0.3 + r() * 0.55);
        song_branch(pts[i][0], pts[i][1], a + da, len * (0.5 + r() * 0.2), w * 0.62, depth - 1, r, seed * 3 + k + 1, ends);
      }
    } else {
      // crab-claw (蟹爪) twig: a hooked flick
      const side = Math.cos(a) >= 0 ? 1 : -1;
      V.ink([[px, py], [px + side * len * 0.25, py - len * 0.12], [px + side * len * 0.38, py + len * 0.05]], { w: w * 0.7, brush: 'inkDry', seed: seed + 99, smooth: true, taper: [1, 6], wob: 0.2 });
      ends.push([px, py, a]);
    }
  }
  /** Song tree: gnarled double-contour trunk, angular recursive branches, leaf clusters at twig tips. */
  function song_tree(x, y, h, o = {}) {
    const op = Object.assign({ lean: 0, seed: 1, leaf: 'dot', dark: 1, wTrunk: 0.05, depth: 2, nb: 5, liveOut: null, liveAbove: -1, bare: false, clusterR: 0.1, roots: true }, o);
    UNDER = [];
    const ret = song_treeBody(x, y, h, op);
    song_underFlush();
    UNDER = null;
    return ret;
  }
  function song_treeBody(x, y, h, op) {
    const r = V.rng(op.seed);
    const kink = [0, 0.22, 0.45, 0.68, 0.86, 1].map((f, i) => [x + op.lean * h * f + (i ? (r() - 0.5) * h * 0.07 : 0), y - h * f]);
    const sp = V.smoothPts(kink, false, 6);
    const wAt = (f) => h * op.wTrunk * (1 - 0.72 * f) + 1.2;
    const left = [], right = [];
    sp.forEach((p, i) => {
      const f = i / (sp.length - 1);
      const q = sp[Math.min(sp.length - 1, i + 1)], pp = sp[Math.max(0, i - 1)];
      let nx = -(q[1] - pp[1]), ny = q[0] - pp[0];
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl; ny /= nl;
      const wv = wAt(f) * (1 + 0.18 * Math.sin(f * 19 + op.seed));
      left.push([p[0] + nx * wv, p[1] + ny * wv]);
      right.push([p[0] - nx * wv, p[1] - ny * wv]);
    });
    song_occlude(left.concat(right.slice().reverse()));
    V.fill(left.concat(right.slice().reverse()), { color: INK, alpha: 0.1 * op.dark, flat: true, seed: op.seed });
    // shadow side wash (soft bristle) + contours (shadow side heavier, lit side broken)
    V.ink(sp.map(([px, py], i) => [px - wAt(i / (sp.length - 1)) * 0.4, py]), { w: (h * op.wTrunk) / 36, brush: 'bristle', color: INK, alpha: 0.3 * op.dark, seed: op.seed + 3, taper: [2, h * 0.5] });
    song_contour(left, { w: 0.6 * op.dark + 0.2, seg: h * 0.22, seed: op.seed, taper: [5, 16], gap: 0.25 });
    song_contour(right, { w: 0.38 * op.dark + 0.12, seg: h * 0.18, seed: op.seed + 9, alpha: 0.8, taper: [5, 16], gap: 0.45 });
    // bark: curved strokes across the trunk, a few wrinkle lines, one or two dark knots
    for (let k = 0; k < Math.floor(h / 30); k++) {
      const f = 0.04 + r() * 0.72, i = Math.floor(f * (sp.length - 1)), p = sp[i], ww = wAt(f);
      const L = left[i], R = right[i];
      if (op.leaf === 'pine') {
        // pine scales (鱗皴): small open arcs
        const cx = lerp(L[0], R[0], 0.2 + r() * 0.6), cy = p[1] + (r() - 0.5) * 6;
        V.ink(V.arcPts(cx, cy, ww * 0.28, ww * 0.18, 0.2, Math.PI - 0.2, 5), { w: 0.14, brush: 'inkDry', seed: op.seed * 5 + k, alpha: 0.75, taper: [1, 2] });
      } else {
        V.ink([[lerp(L[0], R[0], 0.05), L[1] + 2], [lerp(L[0], R[0], 0.3), p[1] + 3 + r() * 3], [lerp(L[0], R[0], 0.45 + r() * 0.15), p[1] + 2]], { w: 0.14, brush: 'inkDry', seed: op.seed * 5 + k, alpha: 0.6, smooth: true, taper: [2, 6] });
      }
    }
    for (let k = 0; k < 3; k++) {
      const f = 0.1 + k * 0.25 + r() * 0.1, i = Math.floor(f * (sp.length - 1)), L = left[i], R = right[i];
      const sx = lerp(L[0], R[0], 0.3 + r() * 0.2);
      V.ink([[sx, L[1] - h * 0.04], [sx + (r() - 0.5) * 3, L[1]], [sx + (r() - 0.5) * 3, L[1] + h * 0.06]], { w: 0.12, brush: 'inkDry', seed: op.seed * 6 + k, alpha: 0.6, smooth: true, taper: [3, 8] });
    }
    if (h > 150) {
      const f = 0.3 + r() * 0.3, i = Math.floor(f * (sp.length - 1)), p = sp[i], ww = wAt(f);
      V.dot(p[0] + ww * 0.15, p[1], ww * 0.22, INK, { seed: op.seed + 11, alpha: 0.85 });
      V.ink(V.ellipsePts(p[0] + ww * 0.15, p[1], ww * 0.42, ww * 0.55, 10).concat([[p[0] + ww * 0.57, p[1]]]), { w: 0.18, brush: 'inkDry', seed: op.seed * 5 + 99, taper: [0, 0], alpha: 0.8 });
    }
    // roots gripping the rock
    if (op.roots) for (let k = 0; k < 3; k++) {
      const d = k - 1;
      V.ink([[x + d * wAt(0) * 0.5, y - 4], [x + d * wAt(0) * 1.6, y + 3], [x + d * wAt(0) * 2.6 + (r() - 0.5) * 6, y + 8]], { w: 0.5, brush: 'inkDry', seed: op.seed * 7 + k, smooth: true, taper: [2, 10] });
    }
    // branches
    const ends = [];
    for (let b = 0; b < op.nb; b++) {
      const f = 0.4 + (b / op.nb) * 0.55 + r() * 0.05;
      const p = sp[Math.floor(f * (sp.length - 1))];
      const side = b % 2 ? 1 : -1;
      const L = h * (0.2 + r() * 0.16) * (1.1 - f * 0.45);
      song_branch(p[0], p[1], -Math.PI / 2 + side * (0.55 + r() * 0.65), L, wAt(f) / 7.5 + 0.1, op.depth, r, op.seed * 100 + b, ends);
    }
    // crown leader
    const tp = sp[sp.length - 1];
    song_branch(tp[0], tp[1], -Math.PI / 2 + op.lean * 0.6, h * 0.14, 0.3, 1, r, op.seed * 100 + 77, ends);
    if (op.bare) return ends;
    const R = h * op.clusterR;
    ends.forEach(([ex, ey], i) => {
      if (op.liveOut && ey < op.liveAbove) op.liveOut.push({ x: ex, y: ey, R, type: op.leaf, seed: op.seed * 1000 + i, dark: op.dark, h });
      else song_cluster(ex, ey, R * (0.75 + r() * 0.5), op.leaf, op.seed * 1000 + i, op.dark);
    });
    // a few inner clusters along the main branches for mass
    for (let k = 0; k < Math.floor(ends.length * 0.6); k++) {
      const f = 0.55 + r() * 0.4, p = sp[Math.floor(f * (sp.length - 1))];
      song_cluster(p[0] + (r() - 0.5) * h * 0.3, p[1] + (r() - 0.5) * h * 0.1, R * 0.9, op.leaf, op.seed * 2000 + k, op.dark * 0.85);
    }
    return ends;
  }

  /** middle-distance grove tree: a trunk stroke + a crown of stacked clusters (round) or tiers of needle plates (pine) */
  function song_gtree(x, y, h, kind, seed, dark) {
    const r = V.rng(seed);
    const lean = (r() - 0.5) * 0.14, tx = x + lean * h;
    V.ink([[x, y], [x + lean * h * 0.5 + (r() - 0.5) * 3, y - h * 0.5], [tx, y - h * 0.9]], { w: 0.3 + h / 380, brush: 'inkDry', seed, smooth: true, taper: [2, h * 0.35], alpha: 0.9 * dark, wob: 0.6 });
    if (kind === 'pine') {
      // tiers of needle plates, widest low, the whole crown filling the upper two thirds
      const tiers = 4 + Math.floor(r() * 2);
      for (let i = 0; i < tiers; i++) {
        const f = 0.36 + (i / (tiers - 1)) * 0.6, cy = y - h * f, cx = x + lean * h * f;
        const w = h * (0.34 - i * 0.045) * (0.85 + r() * 0.3), side = i % 2 ? 1 : -1;
        V.ink([[cx - side * w * 0.3, cy + 1], [cx + side * w * 0.7, cy - 2 - r() * 3]], { w: 0.16, brush: 'inkDry', seed: seed * 3 + i, taper: [1, 6], alpha: dark });
        song_cluster(cx + side * w * 0.2, cy - 2, w * 0.62, 'pine', seed * 7 + i, dark);
      }
    } else {
      // a second, thinner trunk for some
      if (r() < 0.4) V.ink([[x + 3, y], [x + 8 + lean * h * 0.4, y - h * 0.45], [tx + 10, y - h * 0.7]], { w: 0.22 + h / 600, brush: 'inkDry', seed: seed + 5, smooth: true, taper: [2, h * 0.3], alpha: 0.8 * dark });
      const n = 5 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r(), cx = tx + Math.cos(a) * h * 0.19, cy = y - h * (0.7 + 0.15 * Math.sin(a));
        song_cluster(cx, cy, h * (0.16 + r() * 0.07), kind, seed * 11 + i, dark);
      }
      song_cluster(tx, y - h * 0.72, h * 0.16, kind, seed * 13, dark);
    }
  }

  /** rock/boulder: occlude → tonal wash (dark rim + dark base, lit top) → raindrops → broken heavy contour → facet folds → moss */
  function song_rock(P, o = {}) {
    const op = Object.assign({ seed: 1, dark: 1, n: 1500, lightX: -1, folds: 2, moss: 10, w: 1.4, micro: 0 }, o);
    const [x0, y0, x1, y1] = song_bbox(P);
    song_occlude(P);
    const yb = Math.min(y1, 1080);
    const tone = (x, y) => {
      const top = song_topOf(P, x);
      const v = clamp((y - top) / (yb - top + 1)), hu = clamp((x - x0) / (x1 - x0 + 1));
      const sh = op.lightX < 0 ? hu : 1 - hu; // 0 = lit side, 1 = shadow side
      const n = song_fbm(x / 34 + op.seed, y / 40);
      const rim = Math.exp(-Math.pow(song_dEdge(P, x, y) / 26, 2));
      return clamp((0.55 * rim * (0.45 + 0.55 * sh) + 0.42 * Math.pow(v, 1.3) + 0.3 * sh * v + (n - 0.5) * 0.5 - 0.06) * op.dark);
    };
    song_wash(P, tone, { alpha: 0.44 * op.dark, blur: 2.5, res: 4 });
    if (op.micro) song_microdots(P, tone, { n: op.micro, seed: op.seed + 3 });
    song_raindrops(P, tone, { n: op.n, seed: op.seed, pow: 1.25, lenMin: 3, lenMax: 7 });
    song_contour(P.concat([P[0]]), { w: op.w, seed: op.seed, seg: 80 });
    const r = V.rng(op.seed + 5);
    // planes: broken inner contours that echo the upper silhouette (shrunk toward the centre and dropped)
    const cxm = (x0 + x1) / 2;
    const topRun = [];
    for (let x = x0 + 8; x < x1 - 8; x += 10) topRun.push([x, song_topOf(P, x)]);
    for (let f = 0; f < op.folds; f++) {
      const k = 0.16 + f * 0.13 + r() * 0.05;
      const a0 = Math.floor(r() * topRun.length * 0.5), a1 = Math.min(topRun.length, a0 + 4 + Math.floor(r() * topRun.length * 0.45));
      const pts = topRun.slice(a0, a1).map(([x, y]) => [lerp(x, cxm, k), y + (yb - y) * k * 0.55 + 6]);
      const ok = pts.filter(([x, y]) => song_pip(P, x, y) && song_dEdge(P, x, y) > 10);
      if (ok.length < 3) continue;
      song_contour(ok, { w: 0.45 + r() * 0.3, seed: op.seed * 9 + f, seg: 60, alpha: 0.7, gap: 0.35, taper: [4, 18] });
    }
    // 焦墨 accents: a few very dark short strokes hugging the outline on the shadow side
    for (let k = 0; k < op.moss * 2; k++) {
      const i = Math.floor(r() * P.length), p = P[i];
      if (p[1] > 1075 || (op.lightX < 0 ? p[0] < (x0 + x1) / 2 : p[0] > (x0 + x1) / 2)) continue;
      const q = [lerp(p[0], (x0 + x1) / 2, 0.04), lerp(p[1], (y0 + y1) / 2, 0.04)];
      if (!song_pip(P, q[0], q[1])) continue;
      song_dab(q[0], q[1], (r() - 0.5) * 4, 4 + r() * 6, 0.2 + r() * 0.12, V.withAlpha(INK, 0.95), 'bristle', op.seed * 31 + k);
    }
    for (let k = 0; k < op.moss; k++) {
      const i = Math.floor(r() * P.length), p = P[i];
      if (p[1] > lerp(y0, y1, 0.5)) continue;
      for (let q = 0; q < 2 + Math.floor(r() * 3); q++) song_dab(p[0] + (r() - 0.5) * 14, p[1] + 3 + r() * 7, 3 + r() * 3, (r() - 0.5) * 1.5, 0.16, V.withAlpha(INK, 0.9), 'bristle', op.seed * 21 + k * 7 + q);
    }
  }

  // ================================================================== tones
  function song_mainTone(x, y) {
    if (y > 660) return 0;
    const top = Math.min(song_mainTop(x), 560);
    const v = clamp((y - top) / Math.max(60, 650 - top));
    const [xl, xr] = song_mainSpan(y);
    const bx = [xl, ...PILLARS.map((c) => song_xAt(c, y)), xr];
    let i = 0;
    while (i < bx.length - 2 && x > bx[i + 1]) i++;
    const s = clamp((x - bx[i]) / Math.max(8, bx[i + 1] - bx[i]));
    const edge = Math.pow(1 - Math.sin(Math.PI * s), 2.4);
    let loc = 0;
    CREV.forEach(([st, C]) => {
      if (C.length >= 6) return;
      if (y < C[0][1] - 10 || y > C[C.length - 1][1] + 30) return;
      loc += st * 0.5 * Math.exp(-Math.pow((x - song_xAt(C, y)) / 12, 2));
    });
    const rim = Math.exp(-Math.pow(Math.min(x - xl, xr - x) / 26, 2));
    const n = song_fbm(x / 70, y / 110), n2 = V.noise2(x / 16, y / 30), n3 = V.noise2(x / 11 + 300, y / 170);
    let T = 0.44 * Math.pow(1 - v, 1.25) + 0.46 * edge * (1 - 0.45 * v) + 0.12 * s * (1 - v) + loc + 0.22 * rim + (n - 0.5) * 0.4 + (n2 - 0.5) * 0.1 + (n3 - 0.5) * 0.34 * (1 - v * 0.5) - 0.04;
    if (x > 1185 && x < 1262) T += 0.1 * (1 - v);
    T *= 1 - sm(0.58, 1.0, v);
    T *= 1 - sm(560, 660, y);
    return clamp(T);
  }
  function song_peakTone(P, darkTop, crevs) {
    return (x, y) => {
      if (y > 660) return 0;
      const top = Math.min(song_topOf(P, x), 600);
      const v = clamp((y - top) / Math.max(60, 660 - top));
      const n = song_fbm(x / 55, y / 80);
      let c = 0;
      crevs.forEach(([cx, cy, cl]) => { if (y > cy && y < cy + cl) c += 0.35 * Math.exp(-Math.pow((x - cx - (y - cy) * 0.12) / 10, 2)); });
      const rim = Math.exp(-Math.pow((y - top) / 20, 2));
      let T = darkTop * Math.pow(1 - v, 1.3) + c + 0.25 * rim + (n - 0.5) * 0.45 + 0.08;
      T *= 1 - sm(0.45, 1.0, v);
      T *= 1 - sm(560, 660, y);
      return clamp(T);
    };
  }

  // ================================================================== bake: mountains (behind the mist)
  function song_bakeMountains() {
    // far ranges, pale ink
    [FARL, FARR, FARM].forEach((P, k) => {
      const tone = (x, y) => clamp(0.55 - (y - song_topOf(P, x)) / 160 + (song_fbm(x / 80, y / 60) - 0.5) * 0.5);
      song_wash(P, tone, { alpha: 0.22, blur: 4 });
      song_raindrops(P, tone, { n: 2500, seed: 300 + k, dens: 0.55, alpha: [0.2, 0.4] });
      song_contour(P.slice(1, -1), { w: 0.35, seed: 40 + k, alpha: 0.35, seg: 60, gap: 0.55, taper: [10, 20] });
    });
    // flanking peaks
    [[LPEAK, 0.62, 11, [[470, 450, 160], [546, 370, 220], [610, 390, 200]]], [RPEAK, 0.5, 12, [[1404, 392, 180], [1470, 372, 220], [1560, 420, 150]]]].forEach(([P, dk, sd, crevs]) => {
      song_occlude(P);
      const tone = song_peakTone(P, dk, crevs);
      song_wash(P, tone, { alpha: 0.42, blur: 3 });
      song_microdots(P, tone, { n: 16000, seed: sd });
      song_raindrops(P, tone, { n: 9000, seed: sd * 3, dens: 0.95 });
      song_streaks(P, tone, { n: 18, seed: sd * 5, lenMax: 90 });
      crevs.forEach(([cx, cy, cl], k) => song_contour([[cx, cy], [cx + cl * 0.05, cy + cl * 0.5], [cx + cl * 0.12, cy + cl]], { w: 0.7, seed: sd * 7 + k, seg: 60, alpha: 0.75 }));
      song_contour(P.slice(1, -1).filter(([x, y]) => y < 620), { w: 1.1, seed: sd, seg: 90 });
      const r = V.rng(sd);
      for (let k = 0; k < 70; k++) {
        const i = 1 + Math.floor(r() * (P.length - 3)), a = P[i], b = P[i + 1], f = r();
        const sx = lerp(a[0], b[0], f), sy = lerp(a[1], b[1], f);
        if (sy > 560) continue;
        song_shrub(sx, sy + 3, 6 + r() * 8, sd * 100 + k, 0.9);
      }
    });
    // ---- the main peak
    song_occlude(MAIN);
    song_wash(MAIN, song_mainTone, { alpha: 0.6, blur: 3, res: 3 });
    song_microdots(MAIN, song_mainTone, { n: 110000, seed: 21, a: 0.34, s: 0.85 });
    const angFn = (x) => (x - 1000) / 2200;
    song_raindrops(MAIN, song_mainTone, { n: 110000, seed: 22, angFn, pow: 1.25, dens: 0.95 });
    song_streaks(MAIN, song_mainTone, { n: 34, seed: 23, tries: 3000, lenMin: 20, lenMax: 70, w: [0.12, 0.22], alpha: [0.2, 0.42] });
    // crevices: overlapping broken dry strokes, heavier near the top, dissolving downward
    CREV.forEach(([st, C], k) => {
      const cut = C.filter(([x, y]) => y < 560);
      if (cut.length < 2) return;
      song_contour(cut, { w: 0.4 + 0.5 * st, seed: 60 + k, seg: 60, alpha: 0.75, gap: 0.4, taper: [6, 30] });
    });
    // silhouette: wavering contour, darker on the shadowed left
    const leftEdge = MAIN.slice(1, 22).filter(([x, y]) => y < 600), rightEdge = MAIN.slice(22, 40).filter(([x, y]) => y < 600);
    song_contour(leftEdge, { w: 1.3, seed: 5, seg: 100, gap: 0.3 });
    song_contour(rightEdge, { w: 1.0, seed: 7, seg: 100, gap: 0.35 });
    // a few short ledges, each with a tuft of shrubs
    const rl = V.rng(44);
    for (let k = 0; k < 14; k++) {
      const y = 200 + rl() * 300, [xa, xb] = song_mainSpan(y);
      const x = lerp(xa + 40, xb - 80, rl()), len = 16 + rl() * 26;
      for (let s = 0; s < Math.floor(len / 9); s++) song_shrub(x + s * 9 + rl() * 5, y - 1 + rl() * 4, 4 + rl() * 5, 700 + k * 20 + s, 0.7);
    }
    // crown forest: rows of small trees along the summit — the dark fuzzy crest of Fan Kuan's peak
    const rc = V.rng(55);
    UNDER = [];
    // clumps of dense trees sitting on the summit (Fan Kuan's dark, woolly crown)
    [[748, 222], [790, 182], [842, 136], [905, 104], [968, 88], [1030, 76], [1094, 82], [1150, 96], [1200, 122], [1240, 160], [1268, 214]].forEach(([cx, cy], k) => {
      for (let q = 0; q < 3; q++) song_cluster(cx + (q - 1) * 14 + rc() * 6, cy + 6 + rc() * 8 - q * 2, 12 + rc() * 8, 'dot', 880 + k * 5 + q, 1);
    });
    for (let x = 700; x < 1286; x += 2.8) {
      const ty = song_mainTop(x);
      for (let l = 0; l < 4; l++) {
        if (l >= 2 && (x < 780 || x > 1250)) continue;
        song_shrub(x + rc() * 3, ty + 2 + l * 9 + rc() * 6, 10 + rc() * 16 - l * 2, 900 + Math.floor(x * 3) * 4 + l, 1 - l * 0.1);
      }
    }
    song_underFlush(2);
    UNDER = null;
    for (let k = 0; k < 140; k++) {
      const side = rc() < 0.5;
      const y = 150 + rc() * 260, [xl, xr] = song_mainSpan(y);
      const x = side ? xl + 3 + rc() * 12 : xr - 3 - rc() * 12;
      song_shrub(x, y, 5 + rc() * 9, 1500 + k, 0.95);
    }
    // the waterfall cleft walls (the falling water itself is cut per frame); rock lips hide it in places
    const fp = [];
    for (let y = 160; y <= 560; y += 10) fp.push([FALL_X(y), y]);
    song_contour(fp.map(([x, y]) => [x - 5, y]), { w: 0.75, seed: 91, seg: 60, gap: 0.35 });
    song_contour(fp.map(([x, y]) => [x + 5, y]), { w: 0.5, seed: 92, seg: 50, alpha: 0.8, gap: 0.4 });
    song_fallLips();

  }
  const FALL_HIDE = [[252, 268], [372, 384], [455, 470]]; // y-ranges where a rock lip / shrub hides the fall
  function song_fallLips() {
    FALL_HIDE.forEach(([a, b], k) => {
      const y = (a + b) / 2, x = FALL_X(y);
      V.ink([[x - 10, y - 3], [x - 2, y + 1], [x + 9, y - 2]], { w: 0.9, brush: 'inkDry', seed: 960 + k, smooth: true, taper: [3, 6] });
      for (let s = 0; s < 3; s++) song_shrub(x - 8 + s * 7, y - 2, 6 + s * 2, 970 + k * 5 + s, 0.95);
    });
  }

  // ================================================================== bake: middle ground
  const MIDR = [[1110, 930], [1150, 860], [1196, 806], [1250, 760], [1306, 726], [1366, 702], [1432, 688], [1510, 682], [1600, 688], [1700, 700], [1800, 708], [1940, 712], [1940, 930]];
  const MIDL = [[-20, 870], [-20, 724], [80, 710], [180, 704], [280, 716], [380, 740], [470, 772], [540, 820], [560, 870]];
  const MIDC = [[520, 880], [570, 806], [650, 772], [760, 752], [870, 748], [980, 756], [1080, 776], [1160, 812], [1220, 880]];
  function song_bakeMid() {
    // pale low hill in the middle distance, emerging from the mist behind the travellers
    // tree tops floating in the mist at the foot of the great peak (three loose groups, then veiled with white so their feet dissolve)
    UNDER = [];
    const rt = V.rng(48);
    [[700, 6], [930, 5], [1150, 6]].forEach(([gx, n], g) => {
      for (let k = 0; k < n; k++) {
        const x = gx + k * 16 + rt() * 14, y = 662 + rt() * 14;
        song_gtree(x, y, 34 + rt() * 26, rt() < 0.3 ? 'pine' : 'dot', 4800 + g * 20 + k, 0.8);
      }
    });
    song_underFlush(3);
    UNDER = null;
    V.with2d((ctx) => {
      const g = ctx.createLinearGradient(0, 600, 0, 690);
      g.addColorStop(0, 'rgba(255,255,255,0.42)');
      g.addColorStop(0.65, 'rgba(255,255,255,0.7)');
      g.addColorStop(1, 'rgba(255,255,255,0.97)');
      ctx.fillStyle = g;
      ctx.fillRect(640, 560, 680, 140);
    });
    // a very faint far ridge in the mist (平遠), then the low hill
    const FR = [[560, 760], [620, 720], [700, 700], [790, 694], [880, 702], [960, 690], [1060, 698], [1150, 716], [1220, 760]];
    const toneF = (x, y) => clamp(0.45 - (y - song_topOf(FR, x)) / 50 + (song_fbm(x / 40, y / 40) - 0.5) * 0.4);
    song_wash(FR, toneF, { alpha: 0.2, blur: 5 });
    song_raindrops(FR, toneF, { n: 2200, seed: 50, dens: 0.4, alpha: [0.15, 0.32] });
    UNDER = [];
    const rf = V.rng(49);
    for (let k = 0; k < 22; k++) {
      const x = 600 + rf() * 600, y = song_topOf(FR, x) + 4;
      if (rf() < 0.5) song_cluster(x, y - 4, 5 + rf() * 5, 'shrub', 4900 + k, 0.25);
    }
    song_underFlush(3);
    UNDER = null;
    // the far ridge sits deep in the mist: veil it
    V.with2d((ctx) => {
      const g = ctx.createLinearGradient(0, 660, 0, 780);
      g.addColorStop(0, 'rgba(255,255,255,0.62)');
      g.addColorStop(1, 'rgba(255,255,255,0.4)');
      ctx.fillStyle = g;
      ctx.fillRect(540, 660, 700, 120);
    });
    const toneC = (x, y) => clamp(0.55 - (y - song_topOf(MIDC, x)) / 90 + (song_fbm(x / 40, y / 40) - 0.5) * 0.5);
    song_wash(MIDC, toneC, { alpha: 0.2, blur: 4 });
    song_raindrops(MIDC, toneC, { n: 3200, seed: 51, dens: 0.5, alpha: [0.2, 0.45] });
    UNDER = [];
    const rm = V.rng(52);
    for (let k = 0; k < 16; k++) {
      // soft, mist-veiled tree tops in loose groups (not a row of lollipops)
      const g = Math.floor(k / 4), x = 620 + g * 150 + rm() * 70, y = song_topOf(MIDC, x) + 8 + rm() * 6;
      const hh = 14 + rm() * 16;
      song_cluster(x, y - hh * 0.3, 7 + rm() * 8, rm() < 0.5 ? 'dot' : 'shrub', 5300 + k, 0.3);
    }
    song_underFlush(3);
    UNDER = null;
    // soften the low hill's crest so it stays behind the travellers
    V.with2d((ctx) => {
      const g = ctx.createLinearGradient(0, 720, 0, 810);
      g.addColorStop(0, 'rgba(255,255,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0.15)');
      ctx.fillStyle = g;
      ctx.fillRect(560, 720, 640, 90);
    });
    // left bank
    const toneL = (x, y) => clamp(0.55 - (y - song_topOf(MIDL, x)) / 160 + (song_fbm(x / 45, y / 55) - 0.5) * 0.5);
    song_occlude(MIDL);
    song_wash(MIDL, toneL, { alpha: 0.3, blur: 3 });
    song_raindrops(MIDL, toneL, { n: 5000, seed: 81, dens: 0.8 });
    song_contour(MIDL.slice(1, -1), { w: 0.9, seed: 82, seg: 90 });
    const rb = V.rng(83);
    for (let k = 0; k < 14; k++) {
      const x = 30 + rb() * 470, y = song_topOf(MIDL, x) + 8;
      song_tree(x, y, 46 + rb() * 40, { seed: 840 + k, leaf: rb() < 0.5 ? 'dot' : 'jie', dark: 0.7, wTrunk: 0.04, depth: 1, nb: 4, clusterR: 0.16, roots: false });
    }
    // right plateau: cliff toward the road, a grove on top with a temple half hidden
    const toneR = (x, y) => {
      const top = song_topOf(MIDR, x);
      const v = clamp((y - top) / 220);
      const n = song_fbm(x / 50, y / 60);
      const rim = Math.exp(-Math.pow((y - top) / 18, 2));
      return clamp((0.5 - 0.42 * v + 0.2 * rim + (n - 0.5) * 0.55) * (x < 1300 ? 0.8 : 1));
    };
    song_occlude(MIDR);
    song_wash(MIDR, toneR, { alpha: 0.36, blur: 3 });
    song_microdots(MIDR, toneR, { n: 9000, seed: 60 });
    song_raindrops(MIDR, toneR, { n: 11000, seed: 61, dens: 0.85 });
    song_contour(MIDR.slice(1, 8), { w: 1.1, seed: 62, seg: 80, gap: 0.3 });
    // grove: dense round-crowned trees with a few pines rising above; back row paler; temple roofs between the rows
    const rg = V.rng(64);
    for (let row = 0; row < 2; row++) {
      const n = row ? 14 : 11;
      UNDER = [];
      for (let k = 0; k < n; k++) {
        const x = 1205 + ((k + rg() * 0.8) / n) * 720, y = song_topOf(MIDR, x) + 8 + row * 22;
        const kind = rg();
        const lf = row && kind < 0.2 ? 'pine' : kind < 0.45 ? 'jie' : 'dot';
        const hh = (lf === 'pine' ? 120 + rg() * 40 : 70 + rg() * 40) * (row ? 1 : 1.05) * (x > 1680 ? 0.8 : 1);
        song_gtree(x, y, hh, lf, 640 + row * 40 + k, row ? 1 : 0.45);
      }
      song_underFlush(2);
      UNDER = null;
      if (row === 0) {
        [[1452, 712, 78], [1566, 706, 60], [1388, 728, 46]].forEach(([x, y, w], k) => {
          const roof = [[x - w / 2 - 9, y + 2], [x - w / 2 + 4, y - 5], [x - w * 0.28, y - 17], [x + w * 0.28, y - 17], [x + w / 2 - 4, y - 5], [x + w / 2 + 9, y + 2], [x + w / 2 - 6, y + 7], [x - w / 2 + 6, y + 7]];
          song_occlude(roof.concat([[x + w * 0.38, y + 26], [x - w * 0.38, y + 26]]));
          V.fill(roof, { color: INK, alpha: 0.5, flat: true, seed: 670 + k });
          V.ink([[x - w / 2 - 9, y + 1], [x - w / 2 + 6, y - 6], [x - w * 0.28, y - 17], [x + w * 0.28, y - 17], [x + w / 2 - 6, y - 6], [x + w / 2 + 9, y + 1]], { w: 0.6, brush: 'ink', seed: 680 + k, taper: [2, 2] });
          V.ink([[x - w * 0.32, y - 18], [x + w * 0.32, y - 18]], { w: 0.85, brush: 'ink', seed: 690 + k });
          for (let q = 0; q < 7; q++) song_dab(x - w * 0.36 + q * w * 0.12, y - 14, (q - 3) * 1.5, 18, 0.035, V.withAlpha(INK, 0.55), 'ink', 720 + k * 10 + q);
          V.ink([[x - w * 0.38, y + 8], [x - w * 0.38, y + 26]], { w: 0.4, seed: 700 + k });
          V.ink([[x + w * 0.38, y + 8], [x + w * 0.38, y + 26]], { w: 0.4, seed: 710 + k });
          V.ink([[x - w * 0.1, y + 8], [x - w * 0.1, y + 26]], { w: 0.3, seed: 715 + k });
        });
      }
    }
  }

  // ================================================================== bake: foreground
  const ROAD_U = [[380, 912], [600, 918], [800, 926], [1000, 932], [1200, 936], [1400, 932], [1600, 924], [1940, 916]];
  const ROAD_L = [[350, 988], [600, 992], [800, 996], [1000, 1000], [1200, 1002], [1400, 998], [1600, 992], [1940, 988]];
  const BOULDERS = [
    [[-30, 1100], [-30, 756], [20, 720], [80, 700], [150, 694], [220, 704], [278, 734], [316, 780], [334, 836], [320, 880], [260, 900], [190, 950], [120, 1100]],
    [[60, 1100], [92, 1004], [150, 934], [230, 894], [310, 876], [366, 892], [398, 938], [396, 1010], [372, 1100]],
    [[270, 1100], [300, 1004], [356, 962], [432, 944], [508, 952], [566, 994], [590, 1100]],
    [[560, 1100], [588, 1042], [646, 1016], [728, 1012], [790, 1034], [812, 1100]],
    [[1040, 1100], [1066, 1046], [1126, 1028], [1200, 1034], [1244, 1070], [1252, 1100]],
  ];
  const SLOPE = [[540, 922], [590, 886], [690, 856], [810, 842], [950, 850], [1070, 870], [1130, 902], [1140, 930], [540, 930]];
  const LIVE = []; // live (swaying) leaf clusters of the big foreground trees
  function song_bakeFront() {
    const toneS = (x, y) => clamp(0.22 + (song_fbm(x / 30, y / 30) - 0.5) * 0.6 - (y - 846) / 420);
    song_occlude(SLOPE);
    song_wash(SLOPE, toneS, { alpha: 0.16, blur: 3 });
    song_raindrops(SLOPE, toneS, { n: 2200, seed: 101, dens: 0.55, lenMin: 2.5, lenMax: 5, alpha: [0.3, 0.6] });
    // the slope's brow: two short separate strokes away from the travellers' heads
    [[[1090, 880], [1124, 898]]].forEach((P, k) => V.ink(P, { w: 0.4, brush: 'inkDry', seed: 1020 + k, alpha: 0.55, taper: [6, 10] }));
    const rg = V.rng(103);
    // the road (blank silk) with faint dry-brush ruts, pebbles, grass tufts at its edges
    song_occlude(ROAD_U.concat(ROAD_L.slice().reverse()));
    for (let k = 0; k < 30; k++) {
      const x = 420 + rg() * 1450, y = lerp(song_yAt(ROAD_U, x), song_yAt(ROAD_L, x), 0.25 + rg() * 0.6);
      V.ink([[x, y], [x + 30 + rg() * 60, y + (rg() - 0.5) * 3]], { w: 0.3, brush: 'charcoal', color: INK, alpha: 0.2, seed: 1200 + k, taper: [8, 8] });
      song_dab(x + rg() * 40, y + 6, 2.5, 0, 0.12, V.withAlpha(INK, 0.55), 'bristle', 1300 + k);
    }
    for (let k = 0; k < 110; k++) {
      const up = rg() < 0.55;
      const x = 380 + rg() * 1560, y = (up ? song_yAt(ROAD_U, x) : song_yAt(ROAD_L, x)) + (up ? -1 : 2);
      for (let q = 0; q < 3; q++) song_dab(x + q * 2.5, y, (rg() - 0.5) * 5 + (q - 1) * 2, -(4 + rg() * 7), 0.045, V.withAlpha(INK, 0.75), 'inkDry', 1100 + k * 5 + q);
    }
    // stream (谿) at the bottom: water lines between the rocks
    for (let k = 0; k < 18; k++) {
      const y = 1014 + k * 4 + rg() * 3, x = 360 + rg() * 900;
      V.ink([[x, y], [x + 40, y - 2], [x + 90, y + 1], [x + 140, y - 1]], { w: 0.22, brush: 'ink', alpha: 0.4, seed: 1400 + k, smooth: true, taper: [20, 20] });
    }
    // boulders
    BOULDERS.forEach((P, k) => song_rock(P, { seed: 140 + k, n: k < 2 ? 10000 : 4000, micro: k < 2 ? 9000 : 3000, dark: k < 2 ? 1.0 : 0.9, folds: k < 2 ? 4 : 2, moss: k < 2 ? 22 : 10, w: k < 2 ? 1.8 : 1.3, lightX: k === 1 ? 1 : -1 }));
    // big trees on the left boulder: a pine, a leafy tree, a bare crab-claw tree (寒林), a small one
    song_tree(236, 712, 300, { lean: -0.08, seed: 152, leaf: 'pine', wTrunk: 0.055, depth: 1, nb: 7, clusterR: 0.09, liveOut: LIVE, liveAbove: 520 });
    song_tree(112, 700, 380, { lean: 0.14, seed: 151, leaf: 'dot', wTrunk: 0.055, depth: 2, nb: 6, clusterR: 0.075, liveOut: LIVE, liveAbove: 470 });
    song_tree(318, 790, 240, { lean: 0.18, seed: 153, leaf: 'jie', wTrunk: 0.045, depth: 2, nb: 5, clusterR: 0.08, dark: 0.75 });
    song_tree(40, 726, 200, { lean: -0.06, seed: 154, leaf: 'jie', wTrunk: 0.05, depth: 1, nb: 4, clusterR: 0.1 });
    for (let k = 0; k < 10; k++) {
      const x = 1160 + rg() * 280, y = song_yAt(ROAD_U, x) - 3;
      song_shrub(x, y, 10 + rg() * 12, 1500 + k, 0.6);
    }
  }

  // ================================================================== mist (white = blank silk in multiply space)
  function song_mistGfx(key, w, h, seed, blobs) {
    return V.gfx(key, w, h, (ctx) => {
      const r = V.rng(seed);
      const core = ctx.createLinearGradient(0, 0, 0, h);
      core.addColorStop(0, 'rgba(255,255,255,0)');
      core.addColorStop(0.4, 'rgba(255,255,255,0.7)');
      core.addColorStop(0.6, 'rgba(255,255,255,0.7)');
      core.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, w, h);
      for (let k = 0; k < blobs; k++) {
        const x = r() * w, y = h * (0.28 + r() * 0.44), rx = 110 + r() * 300, ry = 16 + r() * 40;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, 'rgba(255,255,255,0.85)');
        g.addColorStop(0.55, 'rgba(255,255,255,0.45)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(rx, ry);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  // ================================================================== travellers (live, ink brushwork)
  const SKIN = '#e9d8ad';
  const PALE = '#e4d8b6';
  /** palm-up hand: pale palm, ink cup line curling up at the fingertips, thumb tick */
  function song_hand(hx, hy, side, s, seed) {
    const d = side ? 1 : -1;
    const P = (x, y) => [hx + d * x * s, hy + y * s];
    // open palm facing up: a shallow cup, fingertips curling up at the far end, thumb raised at the near end
    V.fill([P(-6, -2), P(-2, 3.5), P(6, 5), P(13, 2.5), P(16, -4), P(10, -2.5), P(2, -3)], { color: SKIN, alpha: 1, flat: true, seed, smooth: true });
    V.ink([P(-6, -1.5), P(-1, 3.8), P(7, 5.2), P(13, 2.8), P(16.5, -4.5)], { w: 0.65 * s, brush: 'ink', seed, smooth: true, taper: [2, 4], wob: 0.15 });
    V.ink([P(1, -2.5), P(4, -6.5)], { w: 0.45 * s, brush: 'ink', seed: seed + 1, taper: [1, 3], wob: 0.1 }); // thumb
    V.ink([P(8, 0.5), P(12.5, -0.5)], { w: 0.2 * s, brush: 'ink', seed: seed + 2, alpha: 0.6, taper: [1, 2], wob: 0.05 }); // a palm crease
  }
  function song_hat(cx, cy, rw, hgt, rot, s, seed) {
    V.push();
    V.translate(cx, cy);
    V.rotate(rot);
    const pts = [[-rw, 2], [-rw * 0.55, -hgt * 0.38], [-rw * 0.1, -hgt * 0.92], [0, -hgt], [rw * 0.1, -hgt * 0.92], [rw * 0.55, -hgt * 0.38], [rw, 2], [rw * 0.5, 5.5], [-rw * 0.5, 5.5]];
    V.fill(pts, { color: '#6b604f', alpha: 0.6, flat: true, seed, smooth: false });
    song_wc(pts, '#1f1a15', 0.7, seed + 3, false);
    V.ink([[-rw - 2, 3], [-rw * 0.5, -hgt * 0.4], [0, -hgt]], { w: 1.0 * s, brush: 'inkDry', seed: seed + 1, smooth: true, taper: [2, 6] });
    V.ink([[0, -hgt], [rw * 0.5, -hgt * 0.4], [rw + 2, 3]], { w: 0.75 * s, brush: 'inkDry', seed: seed + 4, smooth: true, taper: [6, 3] });
    V.ink([[-rw - 1, 3], [0, 6.5], [rw + 1, 3]], { w: 0.55 * s, brush: 'ink', seed: seed + 2, smooth: true, taper: [3, 3] });
    for (let k = 0; k < 3; k++) V.ink([[-rw * 0.55 + k * rw * 0.55, 1], [0, -hgt + 4]], { w: 0.18 * s, color: '#e0d2a8', alpha: 0.45, seed: seed + 5 + k, taper: [2, 2] });
    V.pop();
  }
  /** pigment mottling texture for live ink washes (painted once) */
  function song_mottleGfx() {
    return V.gfx('song_mottle', 512, 512, (ctx) => {
      const r = V.rng(4242);
      ctx.filter = 'blur(2px)';
      for (let k = 0; k < 900; k++) {
        const x = r() * 512, y = r() * 512, R = 2 + r() * 9;
        ctx.fillStyle = `rgba(26,22,18,${0.08 + r() * 0.22})`;
        ctx.beginPath();
        ctx.ellipse(x, y, R, R * (0.6 + r() * 0.8), r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.filter = 'none';
      for (let k = 0; k < 2500; k++) {
        ctx.fillStyle = `rgba(26,22,18,${0.1 + r() * 0.3})`;
        ctx.fillRect(r() * 512, r() * 512, 1 + r() * 1.5, 1 + r() * 2.5);
      }
    });
  }
  /** wet ink block, painted live in 2D (p5.brush watercolour fills bleach the silk underneath, so not used per frame):
   *  translucent pigment + mottling + a darker wet edge, in the current V matrix */
  function song_wc(P, color, alpha, seed, smooth = true) {
    const pts = (smooth ? V.smoothPts(P, true, 4) : P).map(([x, y]) => V.tp(x, y));
    const [r, g, b] = V.rgb(color);
    const [x0, y0, x1, y1] = song_bbox(pts);
    const tex = song_cv(song_mottleGfx());
    const bw = Math.min(500, x1 - x0 + 8), bh = Math.min(500, y1 - y0 + 8);
    V.with2d((ctx) => {
      ctx.save();
      song_path2d(ctx, pts);
      ctx.clip();
      ctx.filter = 'blur(0.6px)';
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.8})`;
      ctx.fillRect(x0 - 4, y0 - 4, bw, bh);
      ctx.filter = 'none';
      ctx.globalAlpha = Math.min(1, alpha * 1.1);
      const ox = (seed * 37) % (512 - bw), oy = (seed * 53) % (512 - bh);
      ctx.drawImage(tex, Math.abs(ox), Math.abs(oy), bw, bh, x0 - 4, y0 - 4, bw, bh);
      ctx.globalAlpha = 1;
      ctx.filter = 'blur(1px)';
      ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(1, alpha * 0.75)})`;
      ctx.lineWidth = 2.4;
      song_path2d(ctx, pts);
      ctx.stroke();
      ctx.restore();
    });
  }
  /** 釘頭鼠尾 drapery line: blunt start, long thin tail */
  const song_fold = (pts, w, seed, alpha = 1) => V.ink(pts, { w, brush: 'inkDry', seed, smooth: true, taper: [2, 26], wob: 0.5, alpha });

  function song_scholar(t, x, y, s) {
    const aL = V.G.arm(t, 0), aR = V.G.arm(t, 1);
    const p = V.G.pulse(t), tilt = V.G.tilt(t, 0.09);
    const dy = 3 * p;
    const AMP = 22;
    V.push();
    V.translate(x, y);
    V.scale(s);
    V.fill(V.ellipsePts(-10, -2, 8, 3.5, 10), { color: INK, alpha: 0.9, flat: true, seed: 2001 });
    V.fill(V.ellipsePts(10, -1.5, 8, 3.5, 10), { color: INK, alpha: 0.9, flat: true, seed: 2002 });
    V.translate(0, dy);
    // robe in 寫意 ink blocks: a pale ground, a wet light-ink wash, a darker wash on the shadow side; only a few lines
    const robe = [[-21, -128], [-25, -100], [-29, -60], [-34, -8], [-14, -4], [0, -6], [16, -4], [34, -9], [28, -60], [24, -100], [21, -128], [0, -134]];
    V.fill(robe, { color: PALE, alpha: 0.85, flat: true, seed: 2003, smooth: true });
    song_wc(robe, '#4a4136', 0.1, 2004);
    song_wc([[8, -126], [21, -127], [24, -100], [28, -60], [34, -9], [18, -5], [12, -40], [14, -90]], '#2a241e', 0.42, 2008, false);
    song_fold([[-21, -128], [-25, -100], [-29, -60], [-34, -8]], 1.1, 2005);
    song_fold([[22, -126], [25, -98], [27, -76]], 0.8, 2006);
    V.ink([[-34, -8], [-18, -4]], { w: 0.65, brush: 'inkDry', seed: 2007, taper: [3, 8] });
    V.ink([[14, -4], [34, -9]], { w: 0.55, brush: 'inkDry', seed: 2009, taper: [6, 3] });
    song_fold([[-10, -84], [-13, -50], [-16, -18]], 0.55, 2010);
    song_fold([[7, -84], [9, -50], [10, -22]], 0.5, 2011, 0.85);
    song_wc([[-23, -93], [0, -91], [23, -93], [23, -86], [0, -84], [-23, -86]], '#1a1612', 0.8, 2015, false);
    V.ink([[2, -86], [0, -72], [3, -56]], { w: 0.55, brush: 'ink', seed: 2016, smooth: true, taper: [2, 12] });
    V.ink([[-9, -132], [5, -108]], { w: 0.7, brush: 'ink', seed: 2017, taper: [2, 6] });
    V.ink([[9, -132], [-1, -116]], { w: 0.5, brush: 'ink', seed: 2018, taper: [2, 6] });
    // arms: wide sleeves hang from the forearms; the hands come out of the cuffs palm-up
    [[aL, 0], [aR, 1]].forEach(([a, side]) => {
      const d = side ? 1 : -1;
      const sx = d * 19, sy = -124;
      const ex = d * 32, ey = -95 - a.y * 4;
      const hx = d * 62, hy = -101 - a.y * AMP;
      const ux = hx - ex, uy = hy - ey, ul = Math.hypot(ux, uy) || 1, nx = ux / ul, ny = uy / ul;
      const wx = hx - nx * 7, wy = hy - ny * 7; // cuff
      const droop = [lerp(ex, wx, 0.55) + d * 2, Math.max(ey, wy) + 24];
      const sleeve = [[sx, sy - 5], [ex + d * 3, ey - 9], [wx, wy - 7], [wx + d * 2, wy + 5], droop, [ex - d * 4, ey + 16], [d * 16, -102]];
      V.fill(sleeve, { color: PALE, alpha: 0.88, flat: true, seed: 2020 + side, smooth: true });
      song_wc(sleeve, '#4a4136', 0.1, 2021 + side * 3);
      song_wc([[wx + d * 2, wy + 3], droop, [ex - d * 4, ey + 16], [lerp(ex, wx, 0.5), lerp(ey, wy, 0.5) + 6]], '#2a241e', 0.45, 2022 + side, false);
      V.ink([[sx, sy - 5], [ex + d * 3, ey - 9], [wx, wy - 7]], { w: 0.85, brush: 'inkDry', seed: 2024 + side, smooth: true, taper: [2, 6] });
      V.ink([[wx, wy - 7], [wx + d * 2, wy + 5], droop], { w: 0.75, brush: 'inkDry', seed: 2026 + side, smooth: true, taper: [2, 16] });
      song_hand(hx, hy, side, 1.05, 2030 + side * 3);
    });
    V.push();
    V.translate(0, -134);
    V.rotate(tilt);
    V.fill(V.ellipsePts(0, -11, 7.5, 9.5, 14), { color: SKIN, alpha: 1, flat: true, seed: 2040 });
    V.ink(V.arcPts(0, -11, 7.5, 9.5, -0.2, Math.PI + 0.2, 10), { w: 0.42, brush: 'ink', seed: 2041, taper: [2, 2] });
    V.ink([[0, -1], [-1, 7]], { w: 0.35, seed: 2042, taper: [1, 4] });
    song_hat(0, -17, 32, 22, tilt * 0.8 + 0.05 * Math.sin(t * Math.PI * 4) * p, 1, 2045);
    V.pop();
    V.pop();
  }

  function song_porter(t, x, y, s) {
    const aL = V.G.arm(t, 0), aR = V.G.arm(t, 1);
    const p = V.G.pulse(t), tilt = V.G.tilt(t, 0.1);
    const dy = 3.5 * p;
    const AMP = 21;
    V.push();
    V.translate(x, y);
    V.scale(s);
    [[-12, -1], [12, 1]].forEach(([lx, k], i) => {
      V.ink([[lx, -50 + dy], [lx + k * 2 - 1 * k * p, -27], [lx, -4]], { w: 1.2, brush: 'inkDry', seed: 2100 + i, smooth: true, taper: [2, 4] });
      V.ink([[lx + 2.5 * k, -46 + dy], [lx + k * 4.5, -28], [lx + 2.5 * k, -6]], { w: 0.45, brush: 'ink', seed: 2104 + i, smooth: true, alpha: 0.7, taper: [4, 4] });
      V.fill(V.ellipsePts(lx - 2, -1.5, 7, 3, 10), { color: INK, alpha: 0.8, flat: true, seed: 2102 + i });
    });
    V.translate(0, dy);
    const trou = [[-20, -74], [-23, -48], [-4, -46], [0, -60], [4, -46], [23, -48], [20, -74]];
    V.fill(trou, { color: PALE, alpha: 0.96, flat: true, seed: 2105 });
    V.ink([[-20, -74], [-23, -48], [-4, -46], [0, -60]], { w: 0.6, brush: 'inkDry', seed: 2106, taper: [2, 2] });
    V.ink([[0, -60], [4, -46], [23, -48], [20, -74]], { w: 0.5, brush: 'inkDry', seed: 2107, taper: [2, 2] });
    V.ink([[-22, -50], [-5, -48]], { w: 0.25, brush: 'bristle', color: INK, alpha: 0.35, seed: 2108, taper: [2, 2] });
    V.ink([[5, -48], [22, -50]], { w: 0.25, brush: 'bristle', color: INK, alpha: 0.35, seed: 2109, taper: [2, 2] });
    const jack = [[-17, -118], [-24, -100], [-25, -70], [0, -66], [25, -70], [24, -100], [17, -118], [0, -122]];
    V.fill(jack, { color: '#8a8070', alpha: 0.5, flat: true, seed: 2110, smooth: true });
    song_wc(jack, '#1f1a15', 0.55, 2109);
    song_wc([[-17, -118], [-24, -100], [-25, -70], [-8, -68], [-10, -110]], '#1f1a15', 0.4, 2111, false);
    song_fold([[-17, -118], [-24, -100], [-25, -72]], 0.8, 2112);
    song_fold([[17, -118], [24, -100], [25, -72]], 0.7, 2113);
    song_fold([[-6, -118], [-4, -96], [-6, -72]], 0.4, 2114, 0.8);
    V.ink([[-25, -76], [0, -71], [25, -76]], { w: 1.0, brush: 'ink', seed: 2115, smooth: true, taper: [2, 2] });
    // shoulder pole (扁擔) seesaws with the hands — a literal balance
    const tiltP = (aL.y - aR.y) * 0.5 * 0.16;
    const pc = [0, -121];
    const pe = (d) => [pc[0] + Math.cos(tiltP) * 86 * d, pc[1] - Math.sin(tiltP) * 86 * d];
    const [lx0, ly0] = pe(-1), [rx0, ry0] = pe(1);
    V.ink([[lx0, ly0], [rx0, ry0]], { w: 1.15, brush: 'inkDry', seed: 2120, taper: [4, 4], wob: 0.3 });
    [[lx0, ly0, aL, 0], [rx0, ry0, aR, 1]].forEach(([ex0, ey0, a, side]) => {
      const sw = -a.v * 0.09;
      const bx = ex0 + Math.sin(sw) * 24, by = ey0 + 24;
      V.ink([[ex0 - 3, ey0], [bx - 8, by]], { w: 0.25, seed: 2122 + side * 2, taper: [1, 1], wob: 0.1 });
      V.ink([[ex0 + 3, ey0], [bx + 8, by]], { w: 0.25, seed: 2123 + side * 2, taper: [1, 1], wob: 0.1 });
      const bun = [[bx - 9, by], [bx - 16, by + 10], [bx - 15, by + 24], [bx, by + 29], [bx + 15, by + 24], [bx + 16, by + 10], [bx + 9, by]];
      V.fill(bun, { color: '#6b604f', alpha: 0.55, flat: true, seed: 2126 + side, smooth: true });
      V.ink([[bx - 13, by + 20], [bx + 2, by + 26], [bx + 14, by + 16]], { w: 0.6, brush: 'bristle', color: INK, alpha: 0.4, seed: 2127 + side, smooth: true, taper: [4, 8] });
      V.ink(bun, { w: 0.6, brush: 'inkDry', seed: 2128 + side, smooth: true, taper: [2, 2] });
      V.ink([[bx - 8, by + 2], [bx + 8, by + 2]], { w: 0.5, brush: 'ink', seed: 2130 + side, taper: [2, 2] });
    });
    [[aL, 0], [aR, 1]].forEach(([a, side]) => {
      const d = side ? 1 : -1;
      const sx = d * 20, sy = -112;
      const ex = d * 31, ey = -84 - a.y * 4;
      const hx = d * 58, hy = -92 - a.y * AMP;
      V.ink([[sx, sy], [ex, ey]], { w: 2.4, brush: 'ink', color: '#3d362d', seed: 2140 + side, taper: [2, 2], wob: 0.2 });
      V.ink([[sx - d * 3, sy + 2], [ex - d * 3, ey + 2]], { w: 0.6, brush: 'bristle', color: INK, alpha: 0.6, seed: 2141 + side, taper: [2, 4] });
      const ux = hx - ex, uy = hy - ey, ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul;
      const fa = [ex + nx * 3.2, ey + ny * 3.2], fb = [hx - (ux / ul) * 3 + nx * 2.4, hy - (uy / ul) * 3 + ny * 2.4];
      const fc = [hx - (ux / ul) * 3 - nx * 2.4, hy - (uy / ul) * 3 - ny * 2.4], fd = [ex - nx * 3.2, ey - ny * 3.2];
      V.fill([fa, fb, fc, fd], { color: SKIN, alpha: 1, flat: true, seed: 2142 + side });
      V.ink([fa, fb], { w: 0.45, brush: 'ink', seed: 2144 + side, taper: [2, 2], wob: 0.1 });
      V.ink([fd, fc], { w: 0.4, brush: 'ink', seed: 2146 + side, taper: [2, 2], wob: 0.1, alpha: 0.8 });
      song_hand(hx, hy, side, 1, 2150 + side * 3);
    });
    V.push();
    V.translate(0, -122);
    V.rotate(tilt);
    V.fill(V.ellipsePts(0, -9, 7, 8.5, 14), { color: SKIN, alpha: 1, flat: true, seed: 2160 });
    V.ink(V.arcPts(0, -9, 7, 8.5, -0.2, Math.PI + 0.2, 10), { w: 0.42, seed: 2161, taper: [2, 2] });
    song_hat(0, -14, 36, 18, tilt * 0.9 - 0.05 * Math.sin(t * Math.PI * 4) * p, 1, 2165);
    V.pop();
    V.pop();
  }

  function song_mule(t, x, y, s) {
    const aL = V.G.arm(t, 0), aR = V.G.arm(t, 1);
    const p = V.G.pulse(t), bob = V.G.bob(t);
    const dy = 2.5 * p;
    V.push();
    V.translate(x, y);
    V.scale(s);
    const legs = [
      { hip: [32, -66], a: null, k: 0, far: true },
      { hip: [-22, -64], a: aR, k: 1, far: true },
      { hip: [44, -66], a: null, k: 2, far: false },
      { hip: [-40, -64], a: aL, k: 3, far: false },
    ];
    legs.forEach((L) => {
      const col = L.far ? '#4a4239' : INK;
      const hip = [L.hip[0], L.hip[1] + dy];
      let hoof;
      if (!L.a) {
        const knee = [hip[0] + 7, -34];
        hoof = [hip[0] + 2, -3];
        V.ink([hip, knee, [hip[0] + 3, -14], hoof], { w: 1.25, brush: 'inkDry', color: col, seed: 2200 + L.k, smooth: true, taper: [2, 2] });
      } else {
        // front legs rise in turn with the 67 — the mule paws the air, knee forward, hoof tucked, like weighing it
        const e = V.E.io2((L.a.y + 1) / 2);
        const knee = [hip[0] + lerp(-2, -26, e), lerp(-33, -52, e)];
        hoof = [knee[0] + lerp(1, -5, e), lerp(-3, -31, e)];
        V.ink([hip, knee, hoof], { w: 1.25, brush: 'inkDry', color: col, seed: 2200 + L.k, taper: [2, 2] });
      }
      V.fill(V.ellipsePts(hoof[0] - 1, hoof[1], 4.2, 2.6, 8), { color: INK, alpha: 0.95, flat: true, seed: 2204 + L.k });
    });
    V.translate(0, dy);
    const neckTop = [-66, -126];
    const sil = [[-48, -66], [-30, -58], [10, -56], [46, -60], [58, -72], [56, -88], [34, -98], [0, -100], [-30, -98], [-50, -110], [-62, -126], [-74, -120], [-58, -84]];
    // boneless (沒骨) ink washes: a pale body, a darker wash along the back and neck — translucent, with wet edges
    V.fill(sil, { color: '#8a8070', alpha: 0.5, flat: true, seed: 2220, smooth: true });
    song_wc(sil, '#2a241e', 0.62, 2219);
    song_wc([[-50, -84], [-30, -97], [0, -100], [34, -98], [56, -88], [52, -80], [20, -86], [-20, -86], [-44, -78], [-60, -100], [-66, -124], [-58, -116]], '#1f1a15', 0.55, 2221);
    V.ink([[-30, -98], [0, -100], [34, -98], [56, -88], [58, -72], [46, -60]], { w: 0.75, brush: 'inkDry', seed: 2224, smooth: true, taper: [4, 8] });
    V.ink([[46, -60], [10, -56], [-30, -58], [-48, -66]], { w: 0.55, brush: 'inkDry', seed: 2225, smooth: true, taper: [4, 8], alpha: 0.85 });
    V.ink([[-50, -110], [-62, -126]], { w: 0.6, brush: 'inkDry', seed: 2226, taper: [3, 3] });
    for (let k = 0; k < 6; k++) V.ink([[-50 - k * 2.4, -108 - k * 3], [-46 - k * 2.4, -112 - k * 3]], { w: 0.45, brush: 'bristle', color: INK, seed: 2227 + k, taper: [1, 4] });
    V.ink([[56, -86], [63, -70], [61, -52]], { w: 0.5, brush: 'inkDry', seed: 2234, smooth: true, taper: [2, 2] });
    V.ink([[61, -54], [62, -40]], { w: 0.9, brush: 'bristle', color: INK, seed: 2235, taper: [2, 8] });
    V.fill([[-16, -101], [30, -101], [34, -72], [-20, -72]], { color: '#2f2924', alpha: 0.7, flat: true, seed: 2236 });
    V.ink([[-18, -99], [-20, -72]], { w: 0.5, brush: 'inkDry', seed: 2237, taper: [2, 2] });
    V.ink([[31, -99], [34, -72]], { w: 0.5, brush: 'inkDry', seed: 2238, taper: [2, 2] });
    const b2 = [[8, -101], [9, -114], [16, -120], [28, -118], [34, -110], [33, -101]];
    const b1 = [[-18, -101], [-17, -116], [-8, -124], [6, -123], [14, -114], [14, -101]];
    V.fill(b2, { color: '#b9ad92', alpha: 0.85, flat: true, seed: 2239, smooth: true });
    song_wc(b2, '#4a4136', 0.35, 2240);
    V.ink([[9, -112], [16, -120], [28, -118], [34, -110]], { w: 0.5, brush: 'inkDry', seed: 2240, smooth: true, taper: [2, 6] });
    V.fill(b1, { color: '#cfc3a6', alpha: 0.9, flat: true, seed: 2241, smooth: true });
    song_wc(b1, '#4a4136', 0.22, 2242);
    V.ink([[-17, -114], [-8, -124], [6, -123], [14, -114]], { w: 0.6, brush: 'inkDry', seed: 2242, smooth: true, taper: [2, 6] });
    V.ink([[-6, -123], [-3, -112], [-5, -101]], { w: 0.3, brush: 'ink', seed: 2243, smooth: true, taper: [1, 1] });
    V.ink([[-18, -108], [34, -106]], { w: 0.3, brush: 'ink', seed: 2244, alpha: 0.85, taper: [1, 1] });
    V.push();
    V.translate(neckTop[0], neckTop[1]);
    V.rotate(-0.07 * bob - 0.06 * p);
    const head = [[2, -6], [10, 4], [-8, 26], [-26, 36], [-34, 30], [-28, 18], [-12, 0]];
    V.fill(head, { color: '#8a8070', alpha: 0.5, flat: true, seed: 2250, smooth: true });
    song_wc(head, '#2a241e', 0.66, 2249);
    V.fill(V.ellipsePts(-27, 30, 7, 5.5, 10), { color: PALE, alpha: 0.85, flat: true, seed: 2252 });
    V.ink([[2, -6], [-12, 0], [-28, 18], [-34, 30], [-26, 37], [-8, 26], [10, 4]], { w: 0.65, brush: 'inkDry', seed: 2253, smooth: true, taper: [3, 3] });
    V.dot(-14, 10, 1.7, INK, { seed: 2254 });
    V.dot(-31, 30, 1.0, INK, { seed: 2255 });
    [[aL, -4, 0], [aR, 2, 1]].forEach(([a, ex, k]) => {
      const lift = (a.y + 1) / 2;
      const ang = -1.35 + k * 0.32 - lift * 0.4;
      const len = 27;
      const bx = ex, by = -4;
      const tx = bx + Math.cos(ang) * len, ty = by + Math.sin(ang) * len;
      const ear = [[bx - 3.2, by], [lerp(bx, tx, 0.5) - 3.4, lerp(by, ty, 0.5)], [tx, ty], [lerp(bx, tx, 0.5) + 3.4, lerp(by, ty, 0.5)], [bx + 3.2, by]];
      V.fill(ear, { color: k ? '#3e372f' : '#5e564b', alpha: 0.85, flat: true, seed: 2256 + k, smooth: true });
      V.ink([[bx - 3, by], [lerp(bx, tx, 0.5) - 3.4, lerp(by, ty, 0.5)], [tx, ty]], { w: 0.5, brush: 'inkDry', seed: 2258 + k, smooth: true, taper: [2, 2] });
    });
    V.pop();
    V.pop();
  }

  // ================================================================== seals & inscription
  function song_sealGfx() {
    // 白文 square seal 「六七」 in seal-script strokes: carved white on vermilion, uneven paste, a chipped corner
    return V.gfx('song_seal', 140, 140, (ctx) => {
      const r = V.rng(707);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 140, 140);
      ctx.beginPath();
      const pts = [[12, 13], [128, 11], [129, 128], [11, 129]];
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 0; k < 4; k++) {
        const a = pts[k], b = pts[(k + 1) % 4];
        for (let q = 1; q <= 12; q++) ctx.lineTo(lerp(a[0], b[0], q / 12) + (r() - 0.5) * 2.2, lerp(a[1], b[1], q / 12) + (r() - 0.5) * 2.2);
      }
      ctx.closePath();
      ctx.fillStyle = VERM;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 9;
      const L = (P) => { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); P.slice(1).forEach((p) => ctx.lineTo(p[0], p[1])); ctx.stroke(); };
      // right column 六 (small seal: a head stroke, a wide roof, two splayed legs) — seals read right → left
      L([[97, 24], [97, 36]]);
      L([[75, 56], [75, 45], [119, 45], [119, 56]]);
      L([[90, 64], [83, 88], [77, 116]]);
      L([[104, 64], [111, 88], [117, 116]]);
      // left column 七 (a cross whose upright bends right at the foot)
      L([[22, 60], [62, 56]]);
      L([[40, 24], [40, 98], [46, 112], [62, 114]]);
      for (let k = 0; k < 520; k++) {
        const x = 12 + r() * 116, y = 12 + r() * 116, R = 0.4 + r() * 1.6;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`;
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(128, 100); ctx.lineTo(131, 131); ctx.lineTo(104, 130); ctx.lineTo(118, 122); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(9, 9); ctx.lineTo(26, 10); ctx.lineTo(10, 22); ctx.closePath();
      ctx.fill();
      const gr = ctx.createLinearGradient(0, 0, 140, 140);
      gr.addColorStop(0, 'rgba(255,255,255,0.0)');
      gr.addColorStop(0.7, 'rgba(255,255,255,0.0)');
      gr.addColorStop(1, 'rgba(255,255,255,0.35)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 140, 140);
    });
  }
  function song_seal67Gfx() {
    // 朱文 collector's seal: "67" folded into a square like 九疊篆, red lines on silk
    return V.gfx('song_seal67', 110, 110, (ctx) => {
      const r = V.rng(808);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 110, 110);
      ctx.strokeStyle = VERM;
      ctx.lineWidth = 6;
      ctx.strokeRect(9, 9, 92, 92);
      ctx.lineWidth = 7;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      const L = (P) => { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); P.slice(1).forEach((p) => ctx.lineTo(p[0], p[1])); ctx.stroke(); };
      L([[49, 22], [22, 22], [22, 88], [49, 88], [49, 55], [22, 55]]); // 6
      L([[60, 22], [89, 22], [89, 42], [74, 60], [74, 90]]); // 7
      for (let k = 0; k < 260; k++) {
        ctx.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`;
        ctx.beginPath();
        ctx.arc(8 + r() * 94, 8 + r() * 94, 0.4 + r() * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  const INSCR = '谿山行旅六七圖';
  const INS_X = 1812, INS_Y = 92, INS_STEP = 58, INS_SIZE = 50;
  const SIG_X = 1756, SIG_Y = 388, SEAL_C = [1756, 498], SEAL_S = 64;
  function song_inscription(t) {
    const say = V.G.say(t);
    for (let i = 0; i < INSCR.length; i++) {
      const ch = INSCR[i];
      let sc = 1, a = 0.86;
      if ((ch === '六' && say.n === 6) || (ch === '七' && say.n === 7)) {
        sc = 1 + 0.14 * say.env;
        a = 0.86 + 0.14 * say.env;
      }
      const sz = INS_SIZE * sc;
      V.text(ch, INS_X, INS_Y + i * INS_STEP + INS_SIZE * 0.86 + (sz - INS_SIZE) * 0.45, sz, { font: 'Xingkai TC, Kaiti TC', color: '#1e1813', align: 'center', alpha: a, blend: 'multiply' });
    }
    // the painter's signature, a smaller column to the left, his seal stamped beneath it
    ['范', '寬'].forEach((ch, i) => V.text(ch, SIG_X, SIG_Y + i * 38 + 30, 34, { font: 'Kaiti TC', color: '#2a231c', align: 'center', alpha: 0.78, blend: 'multiply' }));
  }


  // ================================================================== scene
  /** all one-time work: three brush bakes + silk/patina/mist textures. Runs in init() (page setup) so no film frame pays for it;
   *  draw() calls it again as a no-op safety net. */
  let SONG_L = null;
  function song_prepare() {
    if (SONG_L) return SONG_L;
    const T0 = performance.now();
    const mtn = song_bake('song_mtn', song_bakeMountains);
    const T1 = performance.now();
    const mid = song_bake('song_mid', song_bakeMid);
    const T2 = performance.now();
    const fg = song_bake('song_fg', song_bakeFront);
    const T3 = performance.now();
    SONG_L = {
      mtn, mid, fg,
      silk: song_silkGfx(), patina: song_patinaGfx(), wear: song_wearGfx(),
      mistA: song_cv(song_mistGfx('song_mistA', 2600, 300, 31, 26)),
      mistB: song_cv(song_mistGfx('song_mistB', 2600, 150, 32, 18)),
      mistC: song_cv(song_mistGfx('song_mistC', 2600, 190, 33, 20)),
    };
    song_sealGfx(); song_seal67Gfx(); song_mottleGfx();
    console.log('song prepare ms', Math.round(performance.now() - T0));
    return SONG_L;
  }

  V.scenes.song = {
    init() {
      try {
        push();
        translate(-width / 2, -height / 2); // same screen-space origin main.js sets up in draw()
        song_prepare();
        pop();
        clear();
        V.mReset();
        V.resetBrush();
        V.pending = false;
      } catch (e) {
        console.error('song init bake failed, will bake on first frame: ' + e);
        SONG_L = null;
        Object.keys(BK).forEach((k) => delete BK[k]);
      }
    },
    hudStyle() {
      return { color: '#26201a', stroke: '', strokeW: 0, font: 'Kaiti TC', weight: 'bold', pill: { bg: '#a02a1c', fg: '#f6ead2' } };
    },
    draw(t, u) {
      // everything heavy was baked in init(); if not (e.g. init failed), this bakes now — before any painting, since bakes clear the canvas
      const { mtn, mid, fg, silk, patina, wear, mistA, mistB, mistC } = song_prepare();
      V.mReset();
      V.resetBrush();

      // 1. silk
      V.blit(silk, 0, 0, W, H);
      // 2. ink composite in multiply space (white = untouched silk)
      const uu = u + 0.35;
      V.with2d((ctx) => {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(mtn.canvas, 0, 0);
        // waterfall: a thread of blank silk cut into the dark cleft, with falling streaks
        ctx.save();
        ctx.lineCap = 'round';
        const hidden = (y) => FALL_HIDE.some(([a, b]) => y > a && y < b);
        const fall = (w, a, dx) => {
          ctx.beginPath();
          let pen = false;
          for (let y = 176; y <= 620; y += 3) {
            const x = FALL_X(y) + dx + Math.sin(y / 37) * 0.6;
            if (hidden(y)) { pen = false; continue; }
            pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            pen = true;
          }
          ctx.strokeStyle = `rgba(255,255,255,${a})`;
          ctx.lineWidth = w;
          ctx.stroke();
        };
        fall(5.5, 0.4, 0);
        fall(2.6, 0.95, 0);
        for (let k = 0; k < 16; k++) {
          const ph = V.fract(k * 0.618 + t * 0.85);
          const yy = 176 + ph * 420, xx = FALL_X(yy) + ((k % 3) - 1) * 1.2;
          if (hidden(yy)) continue;
          ctx.strokeStyle = 'rgba(60,54,46,0.25)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(xx, yy);
          ctx.lineTo(xx + 0.3, yy + 14);
          ctx.stroke();
        }
        ctx.restore();
        // mist: a thin strap across the peak's waist + the great belt hiding its foot
        ctx.globalAlpha = 0.5;
        ctx.drawImage(mistB, -380 + uu * 9, 420);
        ctx.globalAlpha = 1;
        ctx.drawImage(mistA, -300 - uu * 14, 500);
        ctx.drawImage(mistA, -900 - uu * 8, 560, 2600, 220);
        // waterfall spray where it vanishes into the cloud
        for (let k = 0; k < 5; k++) {
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
          g.addColorStop(0, 'rgba(255,255,255,0.7)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.save();
          ctx.translate(FALL_X(560) + Math.sin(t * 1.3 + k * 2) * 10 + (k - 2) * 12, 552 - k * 8 + Math.cos(t * 1.7 + k) * 4);
          ctx.scale(40 + k * 6, 16);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // middle ground, then a low veil at its foot
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(mid.canvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.8;
        ctx.drawImage(mistC, -500 + uu * 11, 770);
        ctx.globalAlpha = 1;
        // foreground
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(fg.canvas, 0, 0);
      }, { blend: 'multiply' });

      // 3. live leaf clusters at the tips of the big foreground trees (they sway in the valley wind)
      UNDER = [];
      LIVE.forEach((c, i) => {
        const sw = Math.sin(t * 1.5 + c.x * 0.02) * 0.6 + Math.sin(t * 2.6 + i) * 0.3;
        const k = clamp((520 - c.y) / 300, 0.3, 1);
        song_cluster(c.x + sw * 3.4 * k, c.y + Math.abs(sw) * 0.8 * k, c.R, c.type, c.seed, c.dark);
      });
      song_underFlush();
      UNDER = null;

      // 4. the travellers stop on the road and do the 67
      song_scholar(t, 812, 958, 1.0);
      song_mule(t, 1052, 964, 1.0);
      song_porter(t, 1262, 966, 1.0);

      // grass tufts in front of their feet tie them to the road
      [[792, 960], [826, 962], [1010, 966], [1088, 968], [1240, 969], [1284, 970]].forEach(([gx, gy], i) => {
        const r = V.rng(3300 + i);
        for (let q = 0; q < 4; q++) song_dab(gx + q * 3 - 4, gy + 2, (r() - 0.5) * 6 + (q - 1.5) * 1.5, -(5 + r() * 7), 0.045, V.withAlpha(INK, 0.8), 'inkDry', 3310 + i * 7 + q);
      });

      // 5. inscription + seals
      song_inscription(t);
      V.blit(song_seal67Gfx(), 476, 104, 66, 66, { blend: 'multiply', alpha: 0.9 });
      const ps = V.prog(u, 0.72, 0.28);
      if (ps > 0) {
        const land = V.E.in2(ps);
        const after = u - 1.0;
        let sc = lerp(1.8, 1, land);
        if (after > 0) sc = 1 - 0.05 * Math.exp(-after * 16) * Math.cos(after * 38);
        const S = SEAL_S * sc, cx = SEAL_C[0], cy = SEAL_C[1];
        if (after < 0) {
          V.with2d((ctx) => {
            ctx.fillStyle = `rgba(40,25,15,${0.28 * land})`;
            ctx.filter = `blur(${9 * (1 - land) + 1}px)`;
            ctx.fillRect(cx - SEAL_S / 2 + 8 * (1 - land), cy - SEAL_S / 2 + 12 * (1 - land), SEAL_S, SEAL_S);
          });
        }
        V.blit(song_sealGfx(), cx - S / 2, cy - S / 2, S, S, { blend: 'multiply', alpha: after > 0 ? 0.95 : clamp(ps * 2.4) * 0.95 });
      }

      // 6. silk patina over everything
      V.blit(patina, 0, 0, W, H, { blend: 'multiply' });
      V.blit(wear, 0, 0, W, H, { blend: 'screen', alpha: 0.5 });
    },
  };
})();
