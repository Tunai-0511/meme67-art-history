/* synth.js — 1985 · 合成器浪潮《夜駛六七》 (film 54.0–58.0 s)
 * An outrun / synthwave poster played back off a worn VHS tape:
 *   airbrushed sunset sky (p5.brush marker + spray), slit sun whose cuts crawl upward, hidden-line wireframe mountains,
 *   a glowing perspective grid that advances one line per beat, brush-painted palm silhouettes, a chrome "67" standing on the
 *   horizon with neon tubes (6 / 7 light up with V.G.say) and a floor reflection, two rim-lit 80s silhouettes doing the 67,
 *   then a full-frame VHS pass (RGB split, bloom, tracking band, head-switch noise, scanlines) + VCR on-screen display.
 */
(function () {
  const W = 1920, H = 1080, HZ = 600, VX = 860;
  const SUN = { x: 860, y: 560, r: 300 };
  const PINK = '#ff3ec9', CYAN = '#27e9ff';
  const TAU = Math.PI * 2;

  const synthCv = (g) => g.drawingContext.canvas;
  /** a persistent offscreen 2D canvas, cleared and reset on every call */
  function synthScratch(key, w = W, h = H) {
    const g = V.gfx('synth_' + key, w, h, () => {});
    const c = g.drawingContext;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.filter = 'none';
    c.shadowColor = 'transparent';
    c.shadowBlur = 0;
    c.clearRect(0, 0, w, h);
    return c;
  }

  // ------------------------------------------------------------------ static backdrop (baked once)
  function synthBackdrop() {
    V.with2d((ctx) => {
      // sky
      let g = ctx.createLinearGradient(0, 0, 0, HZ);
      g.addColorStop(0, '#12062e');
      g.addColorStop(0.34, '#3b0a6b');
      g.addColorStop(0.7, '#c2185b');
      g.addColorStop(1, '#ff6a3d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, HZ + 2);
      // star field (denser up high, fading into the glow)
      const r = V.rng(1985);
      for (let i = 0; i < 640; i++) {
        const x = r() * W, y = Math.pow(r(), 1.7) * (HZ - 110);
        const big = r() < 0.07;
        const a = (1 - y / (HZ - 90)) * (0.3 + 0.7 * r());
        ctx.fillStyle = `rgba(255,${(215 + r() * 40) | 0},${(230 + r() * 25) | 0},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, big ? 1.5 + r() * 1.3 : 0.55 + r() * 0.75, 0, TAU);
        ctx.fill();
      }
      // sun halo
      ctx.globalCompositeOperation = 'lighter';
      g = ctx.createRadialGradient(SUN.x, SUN.y, SUN.r * 0.8, SUN.x, SUN.y, SUN.r * 2.3);
      g.addColorStop(0, 'rgba(255,70,140,0.5)');
      g.addColorStop(0.35, 'rgba(230,40,150,0.2)');
      g.addColorStop(1, 'rgba(200,30,160,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, HZ);
      // horizon heat band
      g = ctx.createLinearGradient(0, HZ - 140, 0, HZ);
      g.addColorStop(0, 'rgba(255,120,60,0)');
      g.addColorStop(1, 'rgba(255,140,80,0.35)');
      ctx.fillStyle = g;
      ctx.fillRect(0, HZ - 140, W, 140);
      ctx.globalCompositeOperation = 'source-over';
      // sun disk (lower edge hidden by the horizon)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, HZ);
      ctx.clip();
      g = ctx.createLinearGradient(0, SUN.y - SUN.r, 0, HZ);
      g.addColorStop(0, '#fff7c2');
      g.addColorStop(0.16, '#ffe14a');
      g.addColorStop(0.45, '#ff9a3c');
      g.addColorStop(0.72, '#ff4a78');
      g.addColorStop(1, '#ff2bb8');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(SUN.x, SUN.y, SUN.r, 0, TAU);
      ctx.fill();
      ctx.restore();
      // floor
      g = ctx.createLinearGradient(0, HZ, 0, H);
      g.addColorStop(0, '#2c0742');
      g.addColorStop(0.1, '#14042e');
      g.addColorStop(0.5, '#0a0220');
      g.addColorStop(1, '#050012');
      ctx.fillStyle = g;
      ctx.fillRect(0, HZ, W, H - HZ);
      // sun reflection pooled on the glossy floor
      ctx.globalCompositeOperation = 'lighter';
      ctx.save();
      ctx.translate(SUN.x, HZ + 6);
      ctx.scale(1, 0.5);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, 420);
      g.addColorStop(0, 'rgba(255,60,170,0.42)');
      g.addColorStop(0.5, 'rgba(160,30,170,0.14)');
      g.addColorStop(1, 'rgba(120,20,160,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-420, 0, 840, 420);
      ctx.restore();
    });

    // airbrushed cloud streaks (p5.brush 'marker' = soft translucent airbrush band), lit pink from below
    const streaks = [
      [[40, 236], [380, 228], [700, 240], [980, 236]],
      [[520, 318], [760, 312], [1040, 318], [1290, 326]],
      [[640, 368], [880, 364], [1130, 370]],
      [[1180, 150], [1500, 140], [1920, 152]],
      [[1380, 220], [1640, 214], [1920, 222]],
      [[0, 132], [260, 126], [520, 134]],
    ];
    // wispy cirrus combed along a p5.brush flow field (mostly horizontal, gently undulating)
    V.once('synth_field', () => brush.addField('synthCirrus', (tt, field) => {
      for (let c = 0; c < field.length; c++) {
        for (let r = 0; r < field[0].length; r++) field[c][r] = 7 * Math.sin(c * 0.045 + r * 0.09) + 9 * (V.noise2(c * 0.035, r * 0.05) - 0.5);
      }
      return field;
    }));
    brush.field('synthCirrus');
    const rc = V.rng(4242);
    for (let i = 0; i < 46; i++) {
      const band = i % 3; // three cloud decks
      const y = [96, 176, 300][band] + (rc() - 0.5) * [60, 50, 40][band];
      const x = -120 + rc() * 2000;
      const dark = rc() < 0.62;
      randomSeed(900 + i);
      brush.set('marker', dark ? '#2a0a4a' : '#ff6fb0', (dark ? 0.9 : 0.35) + rc() * (dark ? 1.4 : 0.4));
      brush.stroke(V.withAlpha(dark ? '#2a0a4a' : '#ff6fb0', dark ? 0.32 + 0.3 * rc() : 0.28 + 0.25 * rc()));
      brush.flowLine(x, y, 180 + rc() * 420, 0);
    }
    brush.noField();
    V.pending = true;
    streaks.forEach((s, i) => {
      V.ink(s, { brush: 'marker', w: i === 1 ? 2.6 : 1.7, color: '#2a0a4a', alpha: i === 1 || i === 2 ? 0.9 : 0.7, smooth: true, taper: [160, 160], wob: 3, seed: 40 + i });
      V.ink(s.map((p) => [p[0] + 30, p[1] + 10]), { brush: 'marker', w: 0.5, color: '#ff7ab8', alpha: 0.65, smooth: true, taper: [200, 200], wob: 2, seed: 60 + i });
    });
    // airbrush stardust (p5.brush 'spray') — a faint milky band across the top
    V.ink([[-40, 120], [500, 60], [1100, 40], [1960, 90]], { brush: 'spray', w: 7, color: '#c7a8ff', alpha: 0.18, smooth: true, taper: [0, 0], wob: 10, seed: 5 });
    V.ink([[200, 30], [900, 110], [1500, 60]], { brush: 'spray', w: 4, color: '#ffb6e6', alpha: 0.12, smooth: true, taper: [0, 0], wob: 10, seed: 6 });
    // golden spray corona hugging the sun's rim
    V.ink(V.arcPts(SUN.x, SUN.y, SUN.r + 14, SUN.r + 14, Math.PI * 1.06, Math.PI * 1.94, 40), { brush: 'spray', w: 2.2, color: '#ffd23f', alpha: 0.35, taper: [60, 60], wob: 2, seed: 7 });
  }

  // ------------------------------------------------------------------ sun slits that crawl upward
  function synthSlits(t) {
    V.with2d((ctx) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(SUN.x, SUN.y, SUN.r + 1, 0, TAU);
      ctx.clip();
      const top = SUN.y - SUN.r; // visible top of the disk
      const y0 = top + (HZ - top) * 0.36; // slits live in the lower 64 %
      const N = 8, ph = V.fract(t * 0.55);
      const g = ctx.createLinearGradient(0, y0, 0, HZ);
      g.addColorStop(0, '#2a0b4f');
      g.addColorStop(1, '#0d0322');
      ctx.fillStyle = g;
      for (let k = 0; k <= N; k++) {
        const s = (k + 1 - ph) / N; // 0 (top) .. 1 (horizon); moves toward 0 => upward
        if (s <= 0 || s > 1.08) continue;
        const yc = y0 + (HZ - y0) * s;
        const th = 1.2 + 30 * Math.pow(s, 1.55);
        ctx.fillRect(SUN.x - SUN.r - 4, yc - th / 2, SUN.r * 2 + 8, th);
      }
      ctx.restore();
    });
  }

  // ------------------------------------------------------------------ hidden-line wireframe mountains (cached 2D)
  function synthMountains() {
    return V.gfx('synth_mtn', W, 360, (ctx) => {
      const OY = HZ - 300; // layer covers y = 300..660
      const F = 480, ch = 1;
      const P = (x, h, z) => [VX + (F * x) / z, HZ + (F * (ch - h)) / z - OY];
      const hgt = (x, z) => {
        const side = x < 0 ? 0 : 1;
        const ax = Math.abs(x);
        const m = V.smooth(side ? 22 : 18, side ? 52 : 46, ax);
        const n1 = V.noise2(x * 0.055 + side * 9.3, z * 0.06 + 2);
        const ridge = 1 - Math.abs(n1 * 2 - 1);
        const big = 0.5 + V.noise2(x * 0.022 + 3, z * 0.035 + side * 5);
        const h = m * (Math.pow(ridge, 1.7) * 24 * big + V.noise2(x * 0.18, z * 0.21) * 2.6);
        return h * V.smooth(23, 33, z);
      };
      const xs = [], zs = [];
      for (let x = -156; x <= 204; x += 5) xs.push(x);
      for (let z = 86; z >= 22; z -= 6.4) zs.push(z);
      const lines = document.createElement('canvas');
      lines.width = W; lines.height = 360;
      const lc = lines.getContext('2d');
      lc.lineJoin = 'round';
      for (let j = 0; j < zs.length - 1; j++) {
        const za = zs[j], zb = zs[j + 1];
        const depth = j / (zs.length - 2); // 0 far .. 1 near
        for (let i = 0; i < xs.length - 1; i++) {
          const xa = xs[i], xb = xs[i + 1];
          const h1 = hgt(xa, za), h2 = hgt(xb, za), h3 = hgt(xb, zb), h4 = hgt(xa, zb);
          if (h1 + h2 + h3 + h4 < 0.6) continue;
          const q = [P(xa, h1, za), P(xb, h2, za), P(xb, h3, zb), P(xa, h4, zb)];
          lc.beginPath();
          lc.moveTo(q[0][0], q[0][1]);
          for (let k = 1; k < 4; k++) lc.lineTo(q[k][0], q[k][1]);
          lc.closePath();
          const hm = (h1 + h2 + h3 + h4) / 4;
          lc.fillStyle = V.mix('#1a0430', '#43105e', V.clamp(hm / 16));
          lc.fill();
          lc.strokeStyle = `rgba(255,${(62 + 80 * depth) | 0},201,${(0.55 + 0.45 * depth).toFixed(3)})`;
          lc.lineWidth = 1 + 0.8 * depth;
          lc.stroke();
        }
      }
      ctx.save();
      ctx.filter = 'blur(5px)';
      ctx.drawImage(lines, 0, 0);
      ctx.restore();
      ctx.drawImage(lines, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45;
      ctx.drawImage(lines, 0, 0);
    });
  }

  // ------------------------------------------------------------------ the grid floor (advances one line per beat)
  function synthGrid(t) {
    const gc = synthScratch('grid');
    const K = 480; // focal * camera height
    const ph = V.fract(V.G.b(t)); // one line spacing per beat
    const dz = 0.42;
    // horizontal lines
    for (let k = 0; k < 90; k++) {
      const z = 0.55 + (k - ph) * dz;
      if (z <= 0.2) continue;
      const y = HZ + K / z;
      if (y > H + 10) continue;
      if (y < HZ + 2) break;
      const near = V.clamp((y - HZ) / (H - HZ));
      const w = 0.6 + 4.2 * near;
      gc.fillStyle = V.mix('#ff3ec9', '#27e9ff', V.smooth(0.05, 0.6, near));
      gc.globalAlpha = 0.35 + 0.65 * V.smooth(0, 0.18, near);
      gc.fillRect(0, y - w / 2, W, w);
    }
    // vertical lines converge on the vanishing point
    const span = 150; // spacing at the bottom edge
    gc.globalAlpha = 1;
    const g = gc.createLinearGradient(0, HZ, 0, H);
    g.addColorStop(0, 'rgba(255,62,201,0.55)');
    g.addColorStop(0.35, '#ff3ec9');
    g.addColorStop(1, '#27e9ff');
    gc.fillStyle = g;
    for (let j = -32; j <= 40; j++) {
      const xb = VX + j * span;
      const wb = 4.2, wt = 0.4;
      gc.beginPath();
      gc.moveTo(VX - wt / 2, HZ + 1);
      gc.lineTo(VX + wt / 2, HZ + 1);
      gc.lineTo(xb + wb / 2, H);
      gc.lineTo(xb - wb / 2, H);
      gc.closePath();
      gc.fill();
    }
    V.with2d((ctx) => {
      const src = gc.canvas;
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'blur(10px)';
      ctx.globalAlpha = 0.85;
      ctx.drawImage(src, 0, 0);
      ctx.filter = 'blur(3px)';
      ctx.globalAlpha = 0.8;
      ctx.drawImage(src, 0, 0);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.drawImage(src, 0, 0);
      // hot white core on near lines
      ctx.globalAlpha = 0.35;
      ctx.filter = 'brightness(1.8) saturate(0.4)';
      ctx.drawImage(src, 0, 0);
      ctx.filter = 'none';
      // horizon haze swallowing the far lines
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const hg = ctx.createLinearGradient(0, HZ - 30, 0, HZ + 90);
      hg.addColorStop(0, 'rgba(255,90,170,0)');
      hg.addColorStop(0.3, 'rgba(255,90,170,0.5)');
      hg.addColorStop(0.5, 'rgba(120,20,120,0.5)');
      hg.addColorStop(1, 'rgba(40,6,70,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(0, HZ - 30, W, 120);
      // the horizon line itself
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'blur(6px)';
      ctx.fillStyle = 'rgba(255,80,190,0.9)';
      ctx.fillRect(0, HZ - 3, W, 6);
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(255,220,245,0.9)';
      ctx.fillRect(0, HZ - 1, W, 2);
    });
  }

  // ------------------------------------------------------------------ palm trees (p5.brush washes + ink rim light)
  function synthFrond(top, ang, L, droop, sc, seed, sway) {
    const N = 12, r = V.rng(seed);
    const a = ang + sway;
    const sp = [], tg = [], nm = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      sp.push([top[0] + Math.cos(a) * L * s, top[1] + Math.sin(a) * L * s + droop * L * s * s]);
    }
    for (let i = 0; i <= N; i++) {
      const p0 = sp[Math.max(0, i - 1)], p1 = sp[Math.min(N, i + 1)];
      let tx = p1[0] - p0[0], ty = p1[1] - p0[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      let nx = -ty, ny = tx;
      if (ny < 0 || (Math.abs(ny) < 0.05 && nx < 0)) { nx = -nx; ny = -ny; } // "down" side
      tg.push([tx, ty]);
      nm.push([nx, ny]);
    }
    const at = (fi) => {
      const i = V.clamp(fi, 0, N - 1e-6), k = Math.floor(i), f = i - k;
      return [V.lerp(sp[k][0], sp[k + 1][0], f), V.lerp(sp[k][1], sp[k + 1][1], f), k];
    };
    const th = (i) => ((1 - i / N) * 5.5 + 1.3) * sc;
    const poly = [];
    // upper edge base -> tip, with short leaflets that arch up then point to the tip
    for (let i = 0; i < N; i++) {
      const n = nm[i], tt = tg[i], p = sp[i], w = th(i);
      poly.push([p[0] - n[0] * w, p[1] - n[1] * w]);
      if (i >= 2 && i <= N - 2) {
        const s = i / N;
        const len = L * 0.2 * Math.sin(Math.PI * s) * (0.8 + 0.4 * r());
        let dx = -n[0] * 0.55 + tt[0] * 0.85, dy = -n[1] * 0.55 + tt[1] * 0.85 + 0.12;
        const dl = Math.hypot(dx, dy);
        const b0 = at(i + 0.1), b1 = at(i + 0.5);
        poly.push([b0[0] - n[0] * w, b0[1] - n[1] * w]);
        poly.push([b0[0] + (dx / dl) * len, b0[1] + (dy / dl) * len]);
        poly.push([b1[0] - n[0] * w, b1[1] - n[1] * w]);
      }
    }
    poly.push(sp[N].slice());
    // lower edge tip -> base: long drooping leaflets (sawtooth)
    for (let i = N - 1; i >= 1; i--) {
      const s = i / N, n = nm[i], tt = tg[i], w = th(i) * 0.7;
      const len = L * 0.42 * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * s)), 0.6) * (0.85 + 0.3 * r());
      let dx = n[0] * 0.72 + tt[0] * 0.66, dy = n[1] * 0.72 + tt[1] * 0.66 + 0.35;
      const dl = Math.hypot(dx, dy);
      const b1 = at(i + 0.46), b0 = at(i - 0.38);
      poly.push([b1[0] + n[0] * w, b1[1] + n[1] * w]);
      poly.push([sp[i][0] + (dx / dl) * len, sp[i][1] + (dy / dl) * len]);
      poly.push([b0[0] + n[0] * w, b0[1] + n[1] * w]);
    }
    poly.push([sp[0][0] + nm[0][0] * th(0), sp[0][1] + nm[0][1] * th(0)]);
    return { poly, spine: sp };
  }

  function synthPalm(o, t) {
    const { bx, by, tx, ty, lean, sc, seed } = o;
    const r = V.rng(seed);
    const cx = (bx + tx) / 2 + lean, cy = (by + ty) / 2;
    const at = (s) => [
      (1 - s) * (1 - s) * bx + 2 * (1 - s) * s * cx + s * s * tx,
      (1 - s) * (1 - s) * by + 2 * (1 - s) * s * cy + s * s * ty,
    ];
    const L = [], R = [];
    const M = 30;
    for (let i = 0; i <= M; i++) {
      const s = i / M;
      const q = at(Math.min(1, s + 0.01)), p0 = at(Math.max(0, s - 0.01)), p = at(s);
      let dx = q[0] - p0[0], dy = q[1] - p0[1];
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      const w = (V.lerp(25, 12, s) + 16 * Math.pow(1 - s, 8)) * sc;
      L.push([p[0] + dy * w, p[1] - dx * w]);
      R.push([p[0] - dy * w, p[1] + dx * w]);
    }
    const ink = '#06010d';
    V.fill(L.concat(R.reverse()), { color: ink, flat: true, seed });
    // trunk rings caught by the sunset on the sun-facing side
    const sunSide = tx < SUN.x ? 1 : -1;
    for (let i = 2; i < 34; i++) {
      const s = i / 36;
      const p = at(s), q = at(s + 0.01);
      let dx = q[0] - p[0], dy = q[1] - p[1];
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      const w = V.lerp(25, 12, s) * sc;
      const nx = -dy * sunSide, ny = dx * sunSide;
      const e = [p[0] - nx * w * 0.98, p[1] - ny * w * 0.98];
      const inn = [p[0] - nx * w * 0.35, p[1] - ny * w * 0.35 + 3 * sc];
      V.ink([e, inn], { brush: 'ink', w: 0.42 * sc, color: '#ff4fa3', alpha: 0.55 + 0.3 * r(), taper: [0, 8], wob: 0.3, seed: seed * 10 + i });
    }
    // crown (fronds nod on the beat)
    const top = [tx, ty];
    const beatSway = V.G.pulse(t, 5) * 0.03;
    o.fronds.forEach((f, k) => {
      const side = Math.cos((f[0] * Math.PI) / 180) < 0 ? -1 : 1;
      const sway = (V.noise1(t * 0.7 + k * 3.1 + seed) - 0.5) * 0.05 - beatSway * side;
      const fr = synthFrond(top, (f[0] * Math.PI) / 180, f[1] * sc, f[2], sc, seed * 31 + k, sway);
      V.fill(fr.poly, { color: ink, flat: true, seed: seed + k });
      V.ink(fr.spine.slice(1), { brush: 'ink', w: 0.34 * sc, color: k % 2 ? '#ff6a9a' : '#ff3ec9', alpha: 0.65, taper: [6, 30], wob: 0.2, seed: seed + 50 + k });
    });
    // coconuts
    for (let k = 0; k < 4; k++) V.dot(tx + (k - 1.5) * 9 * sc, ty + 10 * sc + (k % 2) * 6 * sc, 8 * sc, ink, { seed: seed + k });
  }

  const synthPalms = [
    { bx: 175, by: 1110, tx: 262, ty: 440, lean: 110, sc: 1.0, seed: 11,
      fronds: [[-172, 210, 0.55], [-150, 230, 0.75], [-122, 200, 1.05], [-92, 170, 1.25], [-62, 205, 1.0], [-32, 235, 0.72], [-8, 225, 0.55], [22, 170, 0.5], [158, 180, 0.55], [104, 120, 0.15], [74, 110, 0.15]] },
    { bx: 60, by: 1110, tx: 40, ty: 640, lean: -40, sc: 0.72, seed: 23,
      fronds: [[-165, 200, 0.6], [-135, 210, 0.9], [-100, 180, 1.2], [-70, 200, 1.0], [-38, 220, 0.75], [-10, 220, 0.55], [18, 170, 0.45], [100, 120, 0.15]] },
    { bx: 1900, by: 1110, tx: 1838, ty: 250, lean: -100, sc: 1.05, seed: 37,
      fronds: [[-176, 190, 0.6], [-152, 200, 0.85], [-124, 190, 1.1], [-94, 170, 1.3], [-62, 210, 1.0], [-30, 230, 0.7], [-4, 220, 0.55], [170, 160, 0.5], [110, 120, 0.15], [80, 120, 0.15]] },
  ];

  // ------------------------------------------------------------------ chrome "67" standing on the horizon
  const LOGO = { x: 1292, base: HZ - 8, size: 366, skew: -0.24 };
  function synthGlyphs(ctx, fn) {
    // draws "6" and "7" through fn(ch, x, y, idx) (caller sets font + skew)
    ctx.font = `bold ${LOGO.size}px Futura`;
    const w6 = ctx.measureText('6').width;
    fn('6', 0, 0, 0);
    fn('7', w6 * 0.95, 0, 1);
  }
  function synthLogoChrome() {
    return V.gfx('synth_logo', 640, 420, (ctx) => {
      ctx.translate(40, 360); // baseline origin inside the cache
      ctx.transform(1, 0, LOGO.skew, 1, 0, 0);
      ctx.lineJoin = 'round';
      const capH = LOGO.size * 0.71;
      // dark gap that sits inside the neon tube
      ctx.strokeStyle = '#0d0322';
      ctx.lineWidth = 30;
      synthGlyphs(ctx, (c, x, y) => ctx.strokeText(c, x, y));
      // extrusion (depth) toward lower right
      for (let i = 16; i >= 1; i--) {
        ctx.fillStyle = V.mix('#12021f', '#6a1a7a', 1 - i / 16);
        synthGlyphs(ctx, (c, x, y) => ctx.fillText(c, x + i * 0.85, y + i * 0.85));
      }
      // chrome face: sky above a hard horizon, ground glow below
      const g = ctx.createLinearGradient(0, -capH, 0, 0);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.18, '#d8f4ff');
      g.addColorStop(0.4, '#5aa8ff');
      g.addColorStop(0.53, '#1b2b8f');
      g.addColorStop(0.545, '#0a0a2a');
      g.addColorStop(0.6, '#3a1458');
      g.addColorStop(0.8, '#ff7a3a');
      g.addColorStop(1, '#ffe39a');
      ctx.fillStyle = g;
      synthGlyphs(ctx, (c, x, y) => ctx.fillText(c, x, y));
      // bevel: bright inner edge + dark outline
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2.5;
      synthGlyphs(ctx, (c, x, y) => ctx.strokeText(c, x - 1, y - 1));
      ctx.strokeStyle = '#1a0630';
      ctx.lineWidth = 3;
      synthGlyphs(ctx, (c, x, y) => ctx.strokeText(c, x, y));
      // horizontal chrome reflection streaks
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      [0.12, 0.2, 0.26].forEach((f, k) => ctx.fillRect(-60, -capH * (1 - f), 800, 3 - k));
      ctx.fillStyle = 'rgba(255,240,200,0.5)';
      ctx.fillRect(-60, -capH * 0.3, 800, 2);
    });
  }
  /** neon tubes around each digit; brightness per digit follows V.G.say (six -> the 6, seven -> the 7) */
  function synthLogo(ctx, t, am = 1) {
    const say = V.G.say(t);
    ctx.save();
    ctx.translate(LOGO.x, LOGO.base);
    ctx.transform(1, 0, LOGO.skew, 1, 0, 0);
    ctx.lineJoin = 'round';
    synthGlyphs(ctx, (c, x, y, i) => {
      const on = say.n === (i ? 7 : 6);
      const lvl = on ? 0.75 + 0.25 * say.env : 0.22;
      const col = i ? CYAN : PINK;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = col;
      ctx.globalAlpha = (on ? 0.9 : 0.35) * lvl * am;
      ctx.filter = 'blur(20px)';
      ctx.lineWidth = 64;
      ctx.strokeText(c, x, y);
      ctx.filter = 'blur(1.5px)';
      ctx.globalAlpha = lvl * am;
      ctx.lineWidth = 48;
      ctx.strokeText(c, x, y);
      ctx.strokeStyle = on ? '#fff4fd' : col;
      ctx.globalAlpha = (on ? 0.85 : 0.3) * am;
      ctx.lineWidth = 41;
      ctx.strokeText(c, x, y);
      ctx.strokeStyle = col;
      ctx.globalAlpha = lvl * am;
      ctx.lineWidth = 37;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeText(c, x, y);
      ctx.filter = 'none';
    });
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = am;
    ctx.filter = 'none';
    ctx.drawImage(synthCv(synthLogoChrome()), LOGO.x - 40, LOGO.base - 360);
    // airbrushed star glints on the chrome, flaring on six / seven
    if (am >= 1) {
      [[LOGO.x + 86, LOGO.base - 238, 6], [LOGO.x + 452, LOGO.base - 252, 7]].forEach(([x, y, n]) => {
        const k = (say.n === n ? 0.55 + 0.45 * say.env : 0.25) * am;
        synthGlint(ctx, x, y, 70 * k + 14, k);
      });
    }
    ctx.globalAlpha = 1;
  }
  function synthGlint(ctx, x, y, R, a) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.45);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,230,250,0.6)');
    g.addColorStop(1, 'rgba(255,120,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
    ctx.fillStyle = '#fff';
    [[1, 0.035], [0.55, 0.03]].forEach(([len, w], k) => {
      ctx.beginPath();
      ctx.moveTo(x - R * len, y);
      ctx.lineTo(x, y - R * w);
      ctx.lineTo(x + R * len, y);
      ctx.lineTo(x, y + R * w);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y - R * len * (k ? 1 : 0.7));
      ctx.lineTo(x + R * w, y);
      ctx.lineTo(x, y + R * len * (k ? 1 : 0.7));
      ctx.lineTo(x - R * w, y);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  /** "Night Drive" in neon script tubing across the chrome */
  function synthScript(ctx, t) {
    const fl = 0.82 + 0.18 * V.noise1(t * 11) - (V.hash(V.tick * 3.3) < 0.06 ? 0.3 : 0);
    ctx.save();
    ctx.translate(1556, 614);
    ctx.rotate(-0.1);
    ctx.font = 'italic 112px "Brush Script MT"';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a0533';
    ctx.lineWidth = 14;
    ctx.strokeText('Night Drive', 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.8 * fl;
    ctx.filter = 'blur(12px)';
    ctx.strokeStyle = PINK;
    ctx.lineWidth = 12;
    ctx.strokeText('Night Drive', 0, 0);
    ctx.filter = 'blur(2px)';
    ctx.globalAlpha = fl;
    ctx.lineWidth = 7;
    ctx.strokeText('Night Drive', 0, 0);
    ctx.filter = 'none';
    ctx.fillStyle = '#ffe2f7';
    ctx.fillText('Night Drive', 0, 0);
    ctx.restore();
  }

  // ------------------------------------------------------------------ figure primitives (mask drawing)
  function synthPoly(c, pts) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    c.fill();
  }
  function synthEll(c, x, y, rx, ry, rot = 0) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, rot, 0, TAU);
    c.fill();
  }
  /** tapered capsule (limb) */
  function synthCap(c, x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1e-3;
    const nx = -dy / d, ny = dx / d;
    synthPoly(c, [[x1 + nx * r1, y1 + ny * r1], [x2 + nx * r2, y2 + ny * r2], [x2 - nx * r2, y2 - ny * r2], [x1 - nx * r1, y1 - ny * r1]]);
    synthEll(c, x1, y1, r1, r1);
    synthEll(c, x2, y2, r2, r2);
  }
  /** palm-up hand. (wx,wy) wrist, dir = -1 points screen-left / +1 right, ang = tilt (rad), s = scale */
  function synthHand(c, wx, wy, dir, ang, s) {
    const pts = [[-4, -8], [8, -10], [12, -21], [17, -26], [22, -24], [21, -13], [33, -10], [47, -11], [57, -16], [63, -17], [65, -12], [60, -5], [47, 3], [26, 8], [6, 9], [-4, 8]];
    const co = Math.cos(ang), si = Math.sin(ang);
    synthPoly(c, pts.map(([x, y]) => {
      const X = x * dir * s, Y = y * s;
      return [wx + X * co - Y * si * dir, wy + X * si * dir + Y * co];
    }));
  }
  /** 2-bone leg: IK knee, but only part of the bend goes sideways (the rest reads as the knee coming toward camera) */
  function synthLeg(hp, an, l1, l2, d, lat) {
    const k = V.ik(hp[0], hp[1], an[0], an[1], l1, l2, d < 0 ? 1 : -1);
    const f = l1 / (l1 + l2);
    const mx = V.lerp(hp[0], k.hx, f), my = V.lerp(hp[1], k.hy, f);
    return { ex: mx + (k.ex - mx) * lat, ey: my + (k.ey - my) * lat, hx: k.hx, hy: k.hy };
  }
  /** the 67 arm: shoulder -> elbow (tucked near the ribs) -> forearm swung out, rising/falling with V.G.arm */
  function synthArm(t, side, sh, s, o) {
    const a = V.G.arm(t, side);
    const d = side ? 1 : -1;
    const ex = sh[0] + d * o.elbowOut * s, ey = sh[1] + (o.elbowDown - a.y * 10) * s;
    const wx = ex + d * o.fore * s, wy = ey - (14 + a.y * o.amp) * s;
    const fa = Math.atan2(wy - ey, (wx - ex) * d);
    return { sx: sh[0], sy: sh[1], ex, ey, wx, wy, d, tilt: fa * 0.3, y: a.y };
  }

  /** the guy: perfecto leather jacket, popped collar, gelled spikes + mullet, straight jeans, high-tops */
  function synthHero(c, t, x0, yF, s) {
    const pz = V.G.pulse(t, 6), b = V.G.b(t);
    const dip = (2 + pz * 8) * s;
    const sway = Math.sin(Math.PI * b) * 6 * s;
    const P = (x, y) => [x0 + x * s, yF + y * s];
    const U = (x, y) => [x0 + sway + x * s, yF + y * s + dip];
    const tilt = V.G.tilt(t, 0.1);
    // legs (IK; knees pop outward on each beat)
    const legs = [[-1, U(-32, -335), P(-60, -26)], [1, U(32, -335), P(60, -26)]].map(([d, hp, an]) => {
      const k = synthLeg(hp, an, 157 * s, 154 * s, d, 0.6);
      synthCap(c, hp[0], hp[1], 31 * s, k.ex, k.ey, 22 * s);
      synthCap(c, k.ex, k.ey, 21 * s, k.hx, k.hy, 17 * s);
      // high-top sneaker, toe turned out
      synthCap(c, k.hx, k.hy - 4 * s, 20 * s, k.hx, k.hy + 8 * s, 20 * s);
      synthEll(c, k.hx + d * 10 * s, k.hy + 22 * s, 32 * s, 14 * s, d * 0.1);
      synthEll(c, k.hx + d * 28 * s, k.hy + 25 * s, 17 * s, 10 * s, 0);
      return { d, hp, k };
    });
    // belt / seat of the jeans
    synthPoly(c, [U(-66, -380), U(66, -380), U(64, -322), U(30, -300), U(-30, -300), U(-64, -322)]);
    // jacket body (structured: padded shoulders, popped collar points beside the jaw, cropped hem)
    synthPoly(c, [U(-100, -544), U(-92, -566), U(-50, -578), U(-56, -616), U(-30, -594), U(30, -594), U(56, -616), U(50, -578), U(92, -566), U(100, -544),
      U(90, -470), U(68, -406), U(76, -360), U(-76, -360), U(-68, -406), U(-90, -470)]);
    // head (tilts toward the hand that is up)
    const nb = U(0, -578);
    const co = Math.cos(tilt), si = Math.sin(tilt);
    const Hd = (x, y) => { const X = x * s, Y = (y + 578) * s; return [nb[0] + X * co - Y * si, nb[1] + X * si + Y * co]; };
    const nk0 = Hd(0, -572), nk1 = Hd(0, -608);
    synthCap(c, nk0[0], nk0[1], 19 * s, nk1[0], nk1[1], 18 * s);
    const hc = Hd(0, -646);
    synthEll(c, hc[0], hc[1], 42 * s, 50 * s, tilt);
    synthPoly(c, [Hd(-40, -646), Hd(40, -646), Hd(32, -606), Hd(14, -592), Hd(-14, -592), Hd(-32, -606)]);
    [-1, 1].forEach((d) => { const e = Hd(d * 43, -640); synthEll(c, e[0], e[1], 7 * s, 13 * s, tilt); });
    synthPoly(c, [Hd(-42, -644), Hd(42, -644), Hd(50, -598), Hd(36, -582), Hd(-36, -582), Hd(-50, -598)]); // mullet at the nape
    const cap = Hd(0, -668);
    synthEll(c, cap[0], cap[1], 45 * s, 31 * s, tilt);
    const lens = [30, 42, 50, 54, 52, 54, 48, 40, 28];
    for (let k = 0; k < 9; k++) {
      const th = ((196 + k * 18.5) * Math.PI) / 180;
      const bxp = Math.cos(th) * 42, byp = -670 + Math.sin(th) * 28;
      const ta = th + (k - 4) * 0.05 + 0.12;
      const nx = -Math.sin(th) * 13, ny = Math.cos(th) * 13;
      synthPoly(c, [Hd(bxp - nx, byp - ny), Hd(bxp + Math.cos(ta) * lens[k], byp + Math.sin(ta) * lens[k]), Hd(bxp + nx, byp + ny)]);
    }
    // arms
    const arms = [0, 1].map((side) => {
      const a = synthArm(t, side, U(side ? 86 : -86, -540), s, { elbowOut: 32, elbowDown: 126, fore: 80, amp: 60 });
      synthCap(c, a.sx, a.sy, 27 * s, a.ex, a.ey, 21 * s);
      synthCap(c, a.ex, a.ey, 22 * s, a.wx - a.d * 6 * s, a.wy, 17 * s);
      synthCap(c, a.wx - a.d * 18 * s, a.wy, 19 * s, a.wx - a.d * 8 * s, a.wy, 19 * s); // zip cuff
      synthHand(c, a.wx, a.wy, a.d, a.tilt, 1.4 * s);
      return a;
    });
    return { hc, tilt, arms, U, Hd, s, legs };
  }

  /** the girl: teased permed big hair, hoop earrings, shoulder-pad blazer with peplum, pencil mini skirt, pumps */
  function synthDiva(c, t, x0, yF, s) {
    const pz = V.G.pulse(t, 6), b = V.G.b(t);
    const dip = (2 + pz * 8) * s;
    const sway = -Math.sin(Math.PI * b) * 8 * s;
    const P = (x, y) => [x0 + x * s, yF + y * s];
    const U = (x, y) => [x0 + sway + x * s, yF + y * s + dip];
    const tilt = V.G.tilt(t, 0.12);
    const legs = [[-1, U(-24, -338), P(-36, -24)], [1, U(24, -338), P(42, -24)]].map(([d, hp, an]) => {
      const k = synthLeg(hp, an, 158 * s, 155 * s, d, 0.5);
      synthCap(c, hp[0], hp[1], 25 * s, k.ex, k.ey, 15 * s);
      const cx = V.lerp(k.ex, k.hx, 0.33), cy = V.lerp(k.ey, k.hy, 0.33);
      synthCap(c, k.ex, k.ey, 14 * s, cx + d * 2 * s, cy, 15 * s); // calf
      synthCap(c, cx + d * 2 * s, cy, 14 * s, k.hx, k.hy, 8 * s);
      // pointed pump with stiletto
      const ax = k.hx, ay = k.hy;
      synthPoly(c, [[ax - d * 9 * s, ay - 6 * s], [ax + d * 9 * s, ay - 6 * s], [ax + d * 30 * s, ay + 13 * s], [ax + d * 36 * s, ay + 21 * s], [ax + d * 4 * s, ay + 19 * s],
        [ax - d * 6 * s, ay + 12 * s], [ax - d * 9 * s, ay + 26 * s], [ax - d * 13 * s, ay + 26 * s], [ax - d * 13 * s, ay + 4 * s]]);
      return { d, hp, k };
    });
    // pencil mini skirt
    synthPoly(c, V.smoothPts([U(-58, -416), U(58, -416), U(70, -340), U(66, -262), U(-66, -262), U(-70, -340)], true, 5));
    // blazer: huge square shoulder pads, cinched waist, peplum
    synthPoly(c, [U(-112, -546), U(-110, -568), U(-42, -574), U(-16, -562), U(16, -562), U(42, -574), U(110, -568), U(112, -546),
      U(100, -474), U(62, -426), U(86, -384), U(-86, -384), U(-62, -426), U(-100, -474)]);
    // head
    const nb = U(0, -566);
    const co = Math.cos(tilt), si = Math.sin(tilt);
    const Hd = (x, y) => { const X = x * s, Y = (y + 566) * s; return [nb[0] + X * co - Y * si, nb[1] + X * si + Y * co]; };
    const nk0 = Hd(0, -560), nk1 = Hd(0, -594);
    synthCap(c, nk0[0], nk0[1], 15 * s, nk1[0], nk1[1], 14 * s);
    const hc = Hd(0, -626);
    synthEll(c, hc[0], hc[1], 35 * s, 43 * s, tilt);
    synthPoly(c, [Hd(-33, -626), Hd(33, -626), Hd(24, -594), Hd(10, -583), Hd(-10, -583), Hd(-24, -594)]);
    // 80s hair: teased crown, curled-up "mall bangs" crest, crimped side ponytail in a scrunchie (it bounces on the beat)
    const crown = Hd(0, -650);
    synthEll(c, crown[0], crown[1], 54 * s, 52 * s, tilt);
    synthPoly(c, V.smoothPts([[-48, -652], [-60, -694], [-48, -738], [-16, -764], [22, -760], [46, -734], [54, -694], [48, -652]], true, 6).map((p) => Hd(p[0], p[1])));
    [-1, 1].forEach((d) => synthPoly(c, V.smoothPts([[d * 52, -660], [d * 60, -620], [d * 54, -588], [d * 44, -578], [d * 38, -604], [d * 36, -644]], true, 4).map((p) => Hd(p[0], p[1]))));
    const bounce = V.G.pulse(t, 5) * 0.28 + V.G.bob(t) * 0.05;
    const tl = [];
    let px = 50, py = -694;
    for (let i = 0; i <= 16; i++) {
      const q = i / 16;
      tl.push([px, py, q]);
      const th = -0.8 + 1.95 * Math.pow(q, 0.75) + bounce * q;
      px += Math.cos(th) * 13;
      py += Math.sin(th) * 13;
    }
    const Lp = [], Rp = [];
    tl.forEach(([x, y, q], i) => {
      const a = tl[Math.max(0, i - 1)], b = tl[Math.min(tl.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tn = Math.hypot(tx, ty) || 1;
      tx /= tn; ty /= tn;
      const w = (12 + 18 * Math.sin(Math.PI * Math.min(1, q * 1.1))) * (1 - 0.5 * q) * (1 + 0.16 * Math.sin(q * 38)) + 4 * q;
      Lp.push(Hd(x - ty * w, y + tx * w));
      Rp.push(Hd(x + ty * w * 1.1, y - tx * w * 1.1));
    });
    synthPoly(c, Lp.concat(Rp.reverse()));
    const tip = tl[tl.length - 1], tipP = Hd(tip[0], tip[1]);
    synthEll(c, tipP[0], tipP[1], 9 * s, 9 * s); // rounded, frizzy end
    const sc0 = Hd(50, -694);
    synthEll(c, sc0[0], sc0[1], 15 * s, 13 * s, tilt + 0.6); // scrunchie
    const arms = [0, 1].map((side) => {
      const a = synthArm(t, side, U(side ? 98 : -98, -538), s, { elbowOut: 28, elbowDown: 122, fore: 78, amp: 58 });
      synthCap(c, a.sx, a.sy, 27 * s, a.ex, a.ey, 19 * s);
      synthCap(c, a.ex, a.ey, 20 * s, a.ex + a.d * 14 * s, a.ey - (a.ey - a.wy) * 0.16, 18 * s); // pushed-up sleeve
      synthCap(c, a.ex, a.ey, 12 * s, a.wx - a.d * 4 * s, a.wy, 9 * s);
      synthHand(c, a.wx, a.wy, a.d, a.tilt, 1.2 * s);
      return a;
    });
    return { hc, tilt, arms, U, Hd, s, legs, sc0 };
  }

  /** render a silhouette (built by fn on a mask) with back-glow, near-black body and two-tone rim light */
  function synthFigure(ctx, key, box, fn, rimW, sheen) {
    const [bx, by, bw, bh] = box;
    const m = synthScratch(key + 'm', bw, bh);
    m.translate(-bx, -by);
    m.fillStyle = '#fff';
    m.strokeStyle = '#fff';
    const info = fn(m);
    const mc = m.canvas;
    const r = synthScratch(key + 'r', bw, bh);
    const tint = (col) => {
      r.globalCompositeOperation = 'source-over';
      r.clearRect(0, 0, bw, bh);
      r.drawImage(mc, 0, 0);
      r.globalCompositeOperation = 'source-in';
      r.fillStyle = col;
      r.fillRect(0, 0, bw, bh);
      r.globalCompositeOperation = 'source-over';
    };
    const rim = (col, dx, dy) => {
      tint(col);
      r.globalCompositeOperation = 'destination-out';
      r.drawImage(mc, dx, dy);
      r.globalCompositeOperation = 'source-over';
    };
    // halo of sunset light spilling around the figure
    tint('#ff3e9a');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(26px)';
    ctx.globalAlpha = 0.45;
    ctx.drawImage(r.canvas, bx, by);
    ctx.restore();
    // body
    const g = r.createLinearGradient(0, 0, 0, bh);
    g.addColorStop(0, '#0b0318');
    g.addColorStop(0.7, '#0d0420');
    g.addColorStop(1, '#1c0636');
    tint(g);
    if (sheen) {
      // airbrushed neon sheen on leather / nylons / hair, clipped to the silhouette
      r.save();
      r.globalCompositeOperation = 'source-atop';
      r.translate(-bx, -by);
      r.filter = 'blur(5px)';
      r.lineCap = 'round';
      sheen(r, info);
      r.restore();
    }
    ctx.drawImage(r.canvas, bx, by);
    // rims: pink from screen-left, cyan from screen-right, warm sun on top
    const rims = [[PINK, rimW, rimW * 0.35, 1], [CYAN, -rimW, rimW * 0.35, 1], ['#ffc27a', 0, rimW * 1.1, 0.75]];
    rims.forEach(([col, dx, dy, a]) => {
      rim(col, dx, dy);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.85 * a;
      ctx.filter = 'blur(7px)';
      ctx.drawImage(r.canvas, bx, by);
      ctx.filter = 'none';
      ctx.globalAlpha = a;
      ctx.drawImage(r.canvas, bx, by);
      ctx.restore();
    });
    return info;
  }

  function synthStroke(c, pts, col, w, a) {
    c.globalAlpha = Math.min(1, a * 1.6);
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }
  function synthHeroSheen(c, f) {
    const { U, s } = f;
    f.arms.forEach((a) => {
      const col = a.d < 0 ? PINK : CYAN;
      synthStroke(c, [[a.sx + a.d * 16 * s, a.sy + 6 * s], [a.ex + a.d * 12 * s, a.ey - 6 * s]], col, 7 * s, 0.55);
      synthStroke(c, [[a.ex + a.d * 4 * s, a.ey - 14 * s], [a.wx - a.d * 22 * s, a.wy - 12 * s]], col, 5 * s, 0.5);
    });
    synthStroke(c, [U(-96, -552), U(-74, -566), U(-54, -572)], PINK, 7 * s, 0.55);
    synthStroke(c, [U(96, -552), U(74, -566), U(54, -572)], CYAN, 7 * s, 0.55);
    synthStroke(c, [U(-54, -530), U(-62, -470), U(-58, -400)], PINK, 12 * s, 0.22);
    synthStroke(c, [U(56, -530), U(64, -470), U(60, -400)], CYAN, 12 * s, 0.22);
    f.legs.forEach(({ d, hp, k }) => {
      synthStroke(c, [[hp[0] + d * 20 * s, hp[1] + 20 * s], [k.ex + d * 14 * s, k.ey]], d < 0 ? PINK : CYAN, 6 * s, 0.3);
      synthStroke(c, [[k.ex + d * 12 * s, k.ey + 10 * s], [k.hx + d * 10 * s, k.hy - 14 * s]], d < 0 ? PINK : CYAN, 5 * s, 0.25);
    });
  }
  function synthDivaSheen(c, f) {
    const { U, s, Hd } = f;
    f.legs.forEach(({ d, k }) => {
      synthStroke(c, [[k.ex + d * 7 * s, k.ey + 8 * s], [V.lerp(k.ex, k.hx, 0.4) + d * 9 * s, V.lerp(k.ey, k.hy, 0.4)], [k.hx + d * 4 * s, k.hy - 10 * s]], d < 0 ? PINK : CYAN, 3.2 * s, 0.7);
    });
    synthStroke(c, [U(-106, -556), U(-74, -566), U(-44, -568)], PINK, 6 * s, 0.6);
    synthStroke(c, [U(106, -556), U(74, -566), U(44, -568)], CYAN, 6 * s, 0.6);
    const arc = (a0, a1, col) => {
      const pts = [];
      for (let i = 0; i <= 8; i++) { const a = a0 + ((a1 - a0) * i) / 8; pts.push(Hd(Math.cos(a) * 42, -652 + Math.sin(a) * 42)); }
      synthStroke(c, pts, col, 6 * s, 0.55);
    };
    arc(Math.PI * 1.08, Math.PI * 1.45, PINK);
    arc(Math.PI * 1.58, Math.PI * 1.85, CYAN);
    f.arms.forEach((a) => synthStroke(c, [[a.ex + a.d * 4 * s, a.ey - 8 * s], [a.wx - a.d * 12 * s, a.wy - 6 * s]], a.d < 0 ? PINK : CYAN, 3 * s, 0.55));
  }

  /** a soft dark contact shadow on the grid under a foot */
  function synthContact(ctx, x, y, rx) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.22);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(4,0,12,0.85)');
    g.addColorStop(1, 'rgba(4,0,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }

  /** sunglasses with the sunset reflected in them */
  function synthShades(ctx, p, s, tilt, round) {
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.rotate(tilt);
    const g = ctx.createLinearGradient(0, -11 * s, 0, 10 * s);
    g.addColorStop(0, '#ff3ec9');
    g.addColorStop(0.42, '#ffb04a');
    g.addColorStop(0.5, '#1a0630');
    g.addColorStop(1, '#27e9ff');
    ctx.fillStyle = g;
    ctx.beginPath();
    [-1, 1].forEach((d) => {
      if (round) {
        ctx.moveTo(d * 17 * s + 15 * s, 0);
        ctx.ellipse(d * 17 * s, 0, 15 * s, 12 * s, 0, 0, TAU);
      } else {
        ctx.moveTo(d * 4 * s, -9 * s);
        ctx.lineTo(d * 34 * s, -12 * s);
        ctx.lineTo(d * 31 * s, 6 * s);
        ctx.lineTo(d * 9 * s, 9 * s);
        ctx.closePath();
      }
    });
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(-28 * s, -6 * s, 10 * s, 2.4 * s);
    ctx.fillRect(9 * s, -7 * s, 10 * s, 2.4 * s);
    ctx.restore();
  }
  /** seams, zip, buckle, jewellery: thin details over the silhouettes */
  function synthDetails(ctx, f, kind) {
    const { U, s } = f;
    const line = (pts, col, w, a = 1) => {
      ctx.globalAlpha = a;
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    };
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (kind === 'hero') {
      line([U(-30, -592), U(-8, -540), U(26, -508), U(30, -362)], '#3a1660', 2.2 * s, 0.9); // asymmetric zip
      line([U(-30, -592), U(-62, -540), U(-46, -500)], '#3a1660', 2 * s, 0.8); // lapel
      line([U(30, -592), U(58, -544), U(40, -508)], '#3a1660', 2 * s, 0.8);
      line([U(-84, -362), U(84, -362)], '#2a0d48', 3 * s, 0.9); // hem
      ctx.globalCompositeOperation = 'lighter';
      line([U(-6, -536), U(24, -510)], CYAN, 1.6 * s, 0.6); // zip glint
      ctx.fillStyle = '#ffd23f';
      ctx.globalAlpha = 0.9;
      const bk = U(0, -350);
      ctx.fillRect(bk[0] - 9 * s, bk[1] - 6 * s, 18 * s, 12 * s);
    } else {
      line([U(-16, -562), U(-2, -450), U(0, -428)], '#3a1660', 2 * s, 0.9); // lapels
      line([U(16, -562), U(2, -450)], '#3a1660', 2 * s, 0.9);
      ctx.globalCompositeOperation = 'lighter';
      line([U(-60, -426), U(60, -426)], '#ffd23f', 2.4 * s, 0.75); // gold belt
      // hoop earrings + bangles catch the neon
      [-1, 1].forEach((d) => {
        const e = f.Hd(d * 37, -598);
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 3 * s;
        ctx.shadowColor = '#ff9a3c';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(e[0], e[1] + 12 * s, 12 * s, 0, TAU);
        ctx.stroke();
      });
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = PINK;
      ctx.lineWidth = 3 * s;
      ctx.shadowColor = PINK;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(f.sc0[0], f.sc0[1], 13 * s, 11 * s, f.tilt + 0.6, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
      f.arms.forEach((a) => {
        ctx.strokeStyle = a.d < 0 ? PINK : CYAN;
        ctx.lineWidth = 2.6 * s;
        ctx.beginPath();
        ctx.ellipse(a.wx - a.d * 8 * s, a.wy + 1, 4 * s, 10 * s, a.tilt * a.d, 0, TAU);
        ctx.stroke();
      });
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ year block (own draw: italic neon Futura, no thousands comma)
  function synthYear(u, meta) {
    const p = V.prog(u, 0.1, 0.5);
    if (p <= 0) return;
    const pop = V.E.outBack(p, 2.2), a = V.clamp(p * 3);
    const S = 150, x0 = 56, y0 = 56;
    V.push();
    V.translate(x0, y0);
    V.scale(0.55 + 0.45 * pop);
    V.rotate((1 - pop) * -0.08);
    V.translate(-x0, -y0);
    const era = meta.era || '合成器浪潮';
    const ew = V.textW(era, 34, { font: 'PingFang TC', weight: 'bold', track: 0.08 }) + 36;
    const c0 = V.tp(x0, y0), c1 = V.tp(x0 + ew, y0 + 42);
    V.with2d((ctx) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = '#1e0b45';
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 2;
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 14;
      const w = c1[0] - c0[0], h = c1[1] - c0[1], rr = h / 2;
      ctx.beginPath();
      ctx.moveTo(c0[0] + rr, c0[1]);
      ctx.arcTo(c0[0] + w, c0[1], c0[0] + w, c0[1] + h, rr);
      ctx.arcTo(c0[0] + w, c0[1] + h, c0[0], c0[1] + h, rr);
      ctx.arcTo(c0[0], c0[1] + h, c0[0], c0[1], rr);
      ctx.arcTo(c0[0], c0[1], c0[0] + w, c0[1], rr);
      ctx.fill();
      ctx.stroke();
    });
    V.text(era, x0 + 18, y0 + 32, 34, { font: 'PingFang TC', weight: 'bold', color: CYAN, alpha: a, track: 0.08 });
    const base = y0 + 56 + S * 0.82;
    V.text('1985', x0 - 4, base, S, { font: 'Futura', weight: 'bold', italic: true, color: '#ff59d6', stroke: '#2a0b4f', strokeW: 8, alpha: a, shadow: { c: CYAN, x: 0, y: 0, b: 24 } });
    V.pop();
  }

  // ------------------------------------------------------------------ VHS playback pass
  function synthVHS(t, u) {
    V.flush();
    const snap = get();
    const src = snap.canvas;
    const tmp = synthScratch('tmp');
    V.with2d((ctx) => {
      // RGB split: G in place, R pushed right, B pushed left
      ctx.drawImage(src, 0, 0);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      [[2.5, '#ff0000'], [-2, '#0000ff']].forEach(([dx, col]) => {
        tmp.globalCompositeOperation = 'source-over';
        tmp.fillStyle = '#000';
        tmp.fillRect(0, 0, W, H);
        tmp.drawImage(src, dx, 0);
        tmp.globalCompositeOperation = 'multiply';
        tmp.fillStyle = col;
        tmp.fillRect(0, 0, W, H);
        ctx.drawImage(tmp.canvas, 0, 0);
      });
      // CRT bloom of the hot neon
      tmp.globalCompositeOperation = 'source-over';
      tmp.clearRect(0, 0, W, H);
      tmp.filter = 'brightness(0.9) contrast(2.2) blur(20px)';
      tmp.drawImage(src, 0, 0);
      tmp.filter = 'none';
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.4;
      ctx.drawImage(tmp.canvas, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // tracking-noise band drifting down the picture
      const me = ctx.canvas;
      const yb = V.lerp(70, 1010, V.clamp((u + 0.35) / 4.7));
      const tk = V.tick;
      for (let y = Math.floor(yb - 38); y < yb + 38; y += 2) {
        const prof = Math.pow(1 - Math.abs(y - yb) / 38, 1.6);
        const off = (V.hash(y * 0.37 + tk * 13.1) - 0.35) * 30 * prof;
        if (Math.abs(off) > 0.5) ctx.drawImage(me, 0, y, W, 2, off, y, W, 2);
      }
      const r = V.rng(tk * 97 + 3);
      for (let i = 0; i < 70; i++) {
        const y = yb + (r() - 0.5) * 70;
        const prof = 1 - Math.abs(y - yb) / 38;
        if (prof <= 0) continue;
        ctx.fillStyle = `rgba(255,255,255,${(0.15 + 0.6 * r() * prof).toFixed(3)})`;
        ctx.fillRect(r() * W, y, 8 + r() * 150 * prof, 1 + (r() < 0.3 ? 1 : 0));
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(120,120,160,0.07)';
      ctx.fillRect(0, yb - 30, W, 60);
      ctx.globalCompositeOperation = 'source-over';
      // head-switching noise along the bottom edge
      for (let y = H - 16; y < H; y += 2) {
        const off = 14 + V.hash(y + tk * 7.7) * 34;
        ctx.drawImage(me, 0, y, W, 2, off, y, W, 2);
      }
      ctx.fillStyle = 'rgba(10,0,20,0.55)';
      ctx.fillRect(0, H - 16, 46, 16);
      // scanlines
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = ctx.createPattern(synthCv(V.gfx('synth_scan', 4, 3, (c) => {
        c.fillStyle = '#fff'; c.fillRect(0, 0, 4, 3);
        c.fillStyle = '#b0a6bd'; c.fillRect(0, 2, 4, 1);
      })), 'repeat');
      ctx.fillRect(0, 0, W, H);
      // vignette / tube falloff
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.64);
      v.addColorStop(0, 'rgba(255,255,255,1)');
      v.addColorStop(1, 'rgba(70,40,90,1)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    });
  }

  function synthOSD(t, u) {
    const sh = { c: 'rgba(0,0,0,0.75)', x: 3, y: 3, b: 0 };
    V.text('PLAY ►', 1858, 108, 46, { font: 'Menlo', weight: 'bold', color: '#f4f4f4', align: 'right', shadow: sh, track: 0.06 });
    V.text('SP', 1858, 160, 36, { font: 'Menlo', weight: 'bold', color: '#f4f4f4', align: 'right', shadow: sh });
    const sec = 54 + Math.floor(Math.max(0, u) + 0.0001);
    V.text(`PM 11:59:${String(Math.min(59, sec)).padStart(2, '0')}`, 70, 952, 40, { font: 'Menlo', weight: 'bold', color: '#ffd23f', shadow: sh, track: 0.04 });
    V.text('OCT. 4 1985', 70, 1000, 40, { font: 'Menlo', weight: 'bold', color: '#ffd23f', shadow: sh, track: 0.04 });
  }

  // ------------------------------------------------------------------ scene
  V.scenes.synth = {
    noHud: true,
    draw(t, u, meta) {
      V.bake('synth_backdrop', synthBackdrop);
      synthSlits(t);
      V.blit(synthMountains(), 0, HZ - 300, W, 360);
      synthGrid(t);
      // chrome logo mirrored in the glossy floor
      V.with2d((ctx) => {
        ctx.save();
        ctx.translate(0, 2 * HZ + 4);
        ctx.scale(1, -1);
        synthLogo(ctx, t, 0.3);
        ctx.restore();
        ctx.globalCompositeOperation = 'destination-out';
        const g = ctx.createLinearGradient(0, HZ, 0, HZ + 280);
        g.addColorStop(0, 'rgba(0,0,0,0.15)');
        g.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = g;
        ctx.fillRect(0, HZ, W, H - HZ);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, HZ);
      });
      synthPalms.forEach((p) => synthPalm(p, t));
      V.with2d((ctx) => synthLogo(ctx, t, 1));
      // neon script across the chrome
      V.with2d((ctx) => synthScript(ctx, t));
      // the dancers
      V.with2d((ctx) => {
        [[1062, 976, 64], [1134, 976, 64], [490, 1036, 84], [610, 1036, 84]].forEach(([x, y, rx]) => synthContact(ctx, x, y, rx));
        const d = synthFigure(ctx, 'diva', [830, 290, 540, 720], (c) => synthDiva(c, t, 1098, 978, 0.85), 3.3, synthDivaSheen);
        synthShades(ctx, d.Hd(0, -634), 0.85, d.tilt, true);
        synthDetails(ctx, d, 'diva');
        const h = synthFigure(ctx, 'hero', [220, 290, 660, 790], (c) => synthHero(c, t, 550, 1040, 1.0), 4, synthHeroSheen);
        synthShades(ctx, h.Hd(0, -650), 1.0, h.tilt, false);
        synthDetails(ctx, h, 'hero');
      });
      synthVHS(t, u);
      synthOSD(t, u);
      synthYear(u, meta);
      V.hudLabel(u, meta, meta.hud);
    },
  };
})();
