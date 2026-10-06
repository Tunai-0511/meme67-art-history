/* vangogh.js — 1889 · Post-Impressionism · "The Starry Night (67)"
 * Swirling impasto sky painted with thousands of short strokes that follow a custom p5.brush vector field (two interlocking
 * vortices + a great wave + concentric moon/star halos). The static painting is baked in NV versions whose strokes are shifted
 * along the flow (each stroke with its own phase) -> cycling them at 12 Hz makes the sky "flow" like a hand-painted animation.
 * Per frame: pulsing star halos (even stars on "six", odd on "seven"), flickering windows, the cypress's two arm-branches and
 * three peasants doing the 67.
 */
(function () {
  const W = 1920, H = 1080;
  const NV = 4; // baked versions of the painting (cycled on V.tick)
  const FRES = 19.2, FOX = 960, FOY = 540; // p5.brush field grid here: col = (x + 960) / 19.2, row = (y + 540) / 19.2

  // ------------------------------------------------------------------ layout
  const MOON = { x: 1708, y: 168, r: 60, R: 196 };
  const VORT = [
    { x: 800, y: 300, R: 205, s: 1, k: 3.4 },
    { x: 1150, y: 372, R: 140, s: -1, k: 3.2 },
  ];
  // 11 stars (x, y, halo radius). index parity: even -> flare on "six", odd -> on "seven"
  const STARS = [
    [560, 118, 40],
    [1012, 92, 34],
    [1318, 160, 42],
    [1500, 62, 30],
    [1528, 338, 44],
    [1838, 410, 34],
    [1366, 470, 30],
    [600, 452, 50], // Venus beside the cypress
    [748, 62, 28],
    [1196, 50, 26],
    [960, 520, 28],
  ].map(([x, y, r], i) => ({ x, y, r, i }));

  const hillY = (x) => 606 - 78 * (x / 1920) + 18 * Math.sin(x / 170 + 1.3) + 8 * Math.sin(x / 61 + 0.4);
  const ridgeY = (x) => hillY(x) + 44 + 14 * Math.sin(x / 115 + 2.6) + 6 * Math.sin(x / 47);
  const meadowY = (x) => 806 + 18 * Math.sin(x / 260 + 0.6) + 0.012 * (x - 900);

  // ------------------------------------------------------------------ helpers
  const sm = V.smooth, cl = V.clamp, lerp = V.lerp;
  const gB = (y) => Math.exp(-Math.pow((y - 360) / 175, 2));
  const psi0 = (x, y) => y - 52 * Math.sin(x / 205 + 0.4) * gB(y) - 18 * Math.sin(x / 95 - y / 140) * (0.4 + 0.6 * gB(y)) - 16 * Math.sin(x / 120 + y / 75) * (1 - V.smooth(380, 760, x));
  const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];

  /** flow direction (radians, screen y-down) of the night sky at (x,y). */
  function dirAt(x, y) {
    const e = 2;
    const gx = (psi0(x + e, y) - psi0(x - e, y)) / (2 * e), gy = (psi0(x, y + e) - psi0(x, y - e)) / (2 * e);
    const bl = Math.hypot(gx, gy) || 1;
    let vx = gy / bl, vy = -gx / bl;
    // near the hills the air hugs the ridge line
    const dh = hillY(x) - y;
    if (dh < 120) {
      const sl = (hillY(x + 4) - hillY(x - 4)) / 8, wh = 1.4 * sm(120, 10, dh), n = Math.hypot(1, sl);
      vx += wh / n; vy += (wh * sl) / n;
    }
    for (const v of VORT) {
      const dx = x - v.x, dy = y - v.y, r = Math.hypot(dx, dy) + 1e-3;
      const w = 3.4 * Math.exp(-Math.pow(r / v.R, 2) * 1.15);
      const b = 0.27, tx = (-dy / r) * v.s, ty = (dx / r) * v.s;
      vx += w * (tx * Math.cos(b) - (dx / r) * Math.sin(b));
      vy += w * (ty * Math.cos(b) - (dy / r) * Math.sin(b));
    }
    {
      const dx = x - MOON.x, dy = y - MOON.y, r = Math.hypot(dx, dy) + 1e-3;
      const w = 6 * Math.exp(-Math.pow(r / (MOON.R * 1.05), 2) * 1.3);
      vx += (w * -dy) / r; vy += (w * dx) / r;
    }
    for (const s of STARS) {
      const dx = x - s.x, dy = y - s.y, r = Math.hypot(dx, dy) + 1e-3;
      const w = 2.6 * Math.exp(-Math.pow(r / (s.r * 1.9), 2));
      vx += (w * -dy) / r; vy += (w * dx) / r;
    }
    return Math.atan2(vy, vx);
  }
  /** walk d px along the flow (d may be negative) */
  function advance(x, y, d) {
    const n = Math.ceil(Math.abs(d) / 4), st = d / Math.max(1, n);
    for (let i = 0; i < n; i++) {
      const a = dirAt(x, y);
      x += Math.cos(a) * st; y += Math.sin(a) * st;
    }
    return [x, y];
  }

  // value ramp for the blue sky (0 = deepest, 1 = palest)
  const BLUES = [
    [0.0, '#0a1444'], [0.16, '#16267a'], [0.3, '#1d3591'], [0.42, '#2a4fa8'], [0.54, '#3f6cbd'],
    [0.66, '#5f95cf'], [0.77, '#8cbcd0'], [0.87, '#b9d6cd'], [0.95, '#e0e8d6'], [1.0, '#f6f2dc'],
  ];
  function ramp(stops, v) {
    v = cl(v);
    for (let i = 1; i < stops.length; i++) {
      if (v <= stops[i][0]) {
        const a = stops[i - 1], b = stops[i];
        return V.mix(a[1], b[1], (v - a[0]) / (b[0] - a[0] || 1));
      }
    }
    return stops[stops.length - 1][1];
  }
  /** sky "value" field: stripes along the flow, the great wave, spiral bands, horizon glow */
  function skyV(x, y) {
    const p = psi0(x, y);
    let v = 0.3 + 0.2 * sm(120, 640, y);
    v += 0.1 * Math.sin(p / 17 + 2.2 * V.noise2(x / 150, y / 150));
    // the great wave: a pale river of light flowing left -> right through the middle of the sky
    const wm = sm(330, 620, x) * (1 - sm(1380, 1680, x));
    v += 0.38 * Math.exp(-Math.pow((p - 398) / 36, 2)) * wm;
    v += 0.18 * Math.exp(-Math.pow((p - 452) / 22, 2)) * wm;
    v += 0.16 * Math.exp(-Math.pow((p - 228) / 26, 2)) * sm(500, 900, x) * (1 - sm(1300, 1550, x));
    // pale glow along the horizon (stronger on the right)
    const dh = hillY(x) - y;
    v += 0.42 * Math.exp(-Math.pow((dh - 22) / 48, 2)) * (0.35 + 0.65 * sm(700, 1700, x));
    for (const vt of VORT) {
      const dx = x - vt.x, dy = y - vt.y, r = Math.hypot(dx, dy) + 1e-3;
      const w = Math.exp(-Math.pow(r / vt.R, 2) * 1.7);
      const ph = Math.atan2(dy, dx) * vt.s + Math.log(r) * vt.k;
      let vv = 0.28 + 0.62 * (0.5 + 0.5 * Math.cos(ph));
      vv = lerp(vv, 0.92, sm(0.2, 0.06, r / vt.R));
      v = lerp(v, vv, w * 0.92);
    }
    return v;
  }

  const WARM = ['#f2d24a', '#f7e58a', '#e9b44c', '#fff1a8', '#f0c74a', '#e7a43a'];
  const STARC = ['#f8f4dc', '#f3e48c', '#c9e0e4', '#f6eba8', '#a9cbd8'];

  /** colour for a sky stroke at (x,y); lift shifts the value (+ = lighter); r = rng */
  function skyCol(x, y, lift, r) {
    const dm = Math.hypot(x - MOON.x, y - MOON.y);
    if (dm < MOON.R * 1.02) {
      const ring = dm / 15 + V.noise2(x / 40, y / 40) * 1.2;
      let c = WARM[Math.floor(ring + r() * 1.4) % WARM.length];
      const edge = sm(MOON.R * 0.72, MOON.R * 1.02, dm);
      if (edge > 0) c = V.mix(c, r() < 0.5 ? '#c9d48a' : '#9ec7c0', edge * 0.85);
      return c;
    }
    for (const s of STARS) {
      const d = Math.hypot(x - s.x, y - s.y);
      if (d < s.r * 1.25) {
        if (d < s.r * 0.95) return STARC[Math.floor(d / 9 + r() * 1.5) % STARC.length];
        return ramp(BLUES, 0.5 + r() * 0.2);
      }
    }
    const v = skyV(x, y) + lift + (r() - 0.5) * 0.16;
    let c = ramp(BLUES, v);
    // Van Gogh sprinkles: odd greenish / yellowish dabs in the paler passages
    if (v > 0.62 && r() < 0.07) c = r() < 0.5 ? '#c8cf7a' : '#e9dd8a';
    return c;
  }

  // ------------------------------------------------------------------ brushes + field
  function vgSetup() {
    V.once('vg_setup', () => {
      // flat, opaque, slightly ragged impasto dab (weight 1 ≈ 12 px)
      brush.add('vgDab', { type: 'marker', weight: 12, scatter: 0.25, opacity: 255, spacing: 0.09, pressure: [0.8, 1, 0.75], rotate: 'natural', noise: 0.08, markerTip: false });
      brush.addField('vgSky', (t, field) => {
        for (let c = 0; c < field.length; c++) {
          const x = c * FRES - FOX;
          for (let r = 0; r < field[0].length; r++) {
            const y = r * FRES - FOY;
            field[c][r] = x < -200 || x > W + 200 || y < -200 || y > H + 200 ? 0 : (dirAt(x, y) * 180) / Math.PI;
          }
        }
        return field;
      });
      return 1;
    });
  }

  // ------------------------------------------------------------------ the static painting (baked per version)
  function stroke(x, y, len, col, br, w, seed, dir = 0) {
    randomSeed(seed);
    brush.set(br, col, w);
    brush.flowLine(x, y, len, dir);
  }

  function paintSky(k) {
    // underpainting
    V.with2d((ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 640);
      g.addColorStop(0, '#0c1752');
      g.addColorStop(0.45, '#1a2f8c');
      g.addColorStop(0.8, '#2c55a8');
      g.addColorStop(1, '#5d8fc6');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, 760);
      // warm grounds under the moon's halo and the stars (p5.brush mixes pigments spectrally: yellow over blue would turn green)
      const m = ctx.createRadialGradient(MOON.x, MOON.y, 0, MOON.x, MOON.y, MOON.R * 1.04);
      m.addColorStop(0, '#f2b833');
      m.addColorStop(0.72, '#f0cc48');
      m.addColorStop(0.9, 'rgba(226,214,120,0.85)');
      m.addColorStop(1, 'rgba(160,190,170,0)');
      ctx.fillStyle = m;
      ctx.fillRect(MOON.x - MOON.R * 1.1, MOON.y - MOON.R * 1.1, MOON.R * 2.2, MOON.R * 2.2);
      STARS.forEach((s) => {
        const q = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 1.05);
        q.addColorStop(0, '#fbf3cc');
        q.addColorStop(0.75, 'rgba(240,226,150,0.9)');
        q.addColorStop(1, 'rgba(190,210,220,0)');
        ctx.fillStyle = q;
        ctx.fillRect(s.x - s.r * 1.1, s.y - s.r * 1.1, s.r * 2.2, s.r * 2.2);
      });
    });
    brush.field('vgSky');
    const D = 16; // flow travel per cycle (px)
    const shift = (x, y, ph) => advance(x, y, (((k / NV + ph) % 1) - 0.5) * D);
    // L0 broad underlayer
    let r = V.rng(7001);
    for (let i = 0; i < 950; i++) {
      const x = -40 + r() * (W + 80), y = -20 + r() * 700, len = 60 + r() * 70, w = 1.4 + r() * 0.6, ph = r();
      if (y > hillY(x) + 30) continue;
      const c = skyCol(x, y, -0.1, r);
      const [sx, sy] = shift(x, y, ph);
      stroke(sx, sy, len, c, 'vgDab', w, 11 + i * 3 + k * 7);
    }
    // L1 main strokes on a jittered grid
    r = V.rng(7002);
    let n = 0;
    for (let gy = -10; gy < 690; gy += 14) {
      for (let gx = -30; gx < W + 30; gx += 25) {
        const x = gx + (r() - 0.5) * 26, y = gy + (r() - 0.5) * 16, len = 22 + r() * 44, w = 0.75 + r() * 0.5, ph = r(), jd = (r() - 0.5) * 0.22;
        n++;
        if (y > hillY(x) + 18) continue;
        const c = skyCol(x, y, 0, r);
        const [sx, sy] = shift(x, y, ph);
        stroke(sx, sy, len, c, 'vgDab', w, 5000 + n * 3 + k * 13, jd);
      }
    }
    // L2 pale highlights where the sky is already light
    r = V.rng(7003);
    for (let i = 0; i < 2000; i++) {
      const x = r() * W, y = r() * 650, len = 16 + r() * 26, w = 0.5 + r() * 0.35, ph = r();
      if (y > hillY(x) + 6) continue;
      const v = skyV(x, y);
      const dm = Math.hypot(x - MOON.x, y - MOON.y);
      if (v < 0.5 && dm > MOON.R * 1.05) { r(); r(); continue; }
      const c = dm < MOON.R * 1.05 ? (r() < 0.5 ? '#fff6c4' : '#f6dc5a') : skyCol(x, y, 0.2, r);
      const [sx, sy] = shift(x, y, ph);
      stroke(sx, sy, len, c, 'vgDab', w, 20000 + i * 5 + k * 17);
    }
    // L3 dark separating dashes in the deep passages (gives the "rope" its twist)
    r = V.rng(7004);
    for (let i = 0; i < 900; i++) {
      const x = r() * W, y = r() * 640, len = 22 + r() * 30, w = 0.45 + r() * 0.3, ph = r();
      if (y > hillY(x) - 4) continue;
      const v = skyV(x, y);
      if (v > 0.48 || Math.hypot(x - MOON.x, y - MOON.y) < MOON.R * 1.1 || STARS.some((st) => Math.hypot(x - st.x, y - st.y) < st.r * 1.5)) continue;
      const c = r() < 0.6 ? '#0d1a5c' : '#16267a';
      const [sx, sy] = shift(x, y, ph);
      stroke(sx, sy, len, c, 'vgDab', w, 40000 + i * 7 + k * 19);
    }
    brush.noField();
    V.pending = true;
  }

  function arcPts(cx, cy, rad, a0, a1, step = 6) {
    const n = Math.max(3, Math.ceil((Math.abs(a1 - a0) * rad) / step));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    return out;
  }

  const HALO = ['#f2c62a', '#f8da48', '#ffe873', '#eab02a', '#f6d23c', '#e09a22', '#fff2a6'];
  function paintMoon(k) {
    const r = V.rng(8100);
    // halo rings (each arc drifts a little per version -> the halo slowly turns)
    for (let rad = 70; rad < MOON.R; rad += 8) {
      const nA = 3 + Math.floor(r() * 3);
      for (let j = 0; j < nA; j++) {
        const a0 = r() * Math.PI * 2 + (((k / NV + r()) % 1) - 0.5) * 0.14, len = 0.6 + r() * 1.3, w = 0.75 + r() * 0.4;
        const t = rad / MOON.R;
        let c = pick(HALO, r);
        if (t > 0.86) c = V.mix(c, r() < 0.5 ? '#b8cf7a' : '#9ec7c0', (t - 0.86) * 4);
        V.ink(arcPts(MOON.x, MOON.y, rad + (r() - 0.5) * 4, a0, a0 + len), { brush: 'vgDab', color: c, w, seed: 81 + j + rad * 3 + k, taper: [6, 8], wob: 1.2 });
      }
    }
    // the moon: a fat lemon-white crescent; the rest of the disc glows orange
    const M = MOON;
    V.fill(V.ellipsePts(M.x, M.y, M.r + 4, M.r + 4, 44), { color: '#e8901e', flat: true, seed: 3 });
    // the unlit part: warm orange dabs turning around the disc
    for (let j = 0; j < 9; j++) {
      const a0 = 1.7 + j * 0.36 + r() * 0.2, rr = M.r * (0.35 + 0.45 * r());
      V.ink(arcPts(M.x - 6, M.y, rr, a0, a0 + 0.7 + r() * 0.5, 4), { brush: 'vgDab', color: ['#f2a62c', '#e0861e', '#f6b840', '#e8942a', '#d77a1c'][j % 5], w: 0.55, seed: 820 + j + k, taper: [5, 5], wob: 0.6 });
    }
    const cres = [];
    for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + (Math.PI * i) / 24; cres.push([M.x + Math.cos(a) * (M.r + 3), M.y + Math.sin(a) * (M.r + 3)]); }
    for (let i = 24; i >= 0; i--) { const a = -Math.PI / 2 + (Math.PI * i) / 24; cres.push([M.x - 8 + Math.cos(a) * (M.r * 0.42), M.y + Math.sin(a) * (M.r + 2)]); }
    V.fill(cres, { color: '#ffd93a', flat: true, seed: 9 });
    for (let j = 0; j < 6; j++) {
      const f = 0.5 + j * 0.09, span = 1.45 - j * 0.04;
      const pts = [];
      for (let i = 0; i <= 16; i++) { const a = -span + (2 * span * i) / 16; pts.push([M.x - 4 + Math.cos(a) * M.r * f, M.y + Math.sin(a) * M.r * 0.97]); }
      V.ink(pts, { brush: 'vgDab', color: j > 3 ? '#fff4b0' : j > 1 ? '#ffe46a' : '#ffd23a', w: 0.6, seed: 840 + j + k, taper: [12, 12], wob: 0.6 });
    }
    V.ink(arcPts(M.x, M.y, M.r + 6, -1.9, 1.9), { brush: 'vgDab', color: '#d0782a', w: 0.38, seed: 860 + k, taper: [12, 12], wob: 1 });
  }

  // ---- land
  function polyBelow(fy, x0, x1, yb, step = 16) {
    const pts = [];
    for (let x = x0; x <= x1; x += step) pts.push([x, fy(x)]);
    pts.push([x1, yb], [x0, yb]);
    return pts;
  }
  /** a ridge outline made of short overlapping dabs (never one line across the canvas) */
  function ridgeDabs(fy, dy, cols, w, seed, r) {
    let x = -30 - r() * 30, j = 0;
    while (x < W + 20) {
      const len = 38 + r() * 60, x1 = x + len, o = (r() - 0.5) * 3;
      const pts = [];
      for (let xx = x; xx <= x1; xx += 8) pts.push([xx, fy(xx) + dy + o]);
      V.ink(pts, { brush: 'vgDab', color: pick(cols, r), w: w * (0.7 + r() * 0.6), seed: seed * 100 + j++, taper: [8, 10], wob: 1.2 });
      x = x1 - 6 - r() * 14 + (r() < 0.15 ? 18 : 0);
    }
  }
  function paintLand() {
    const r = V.rng(9100);
    // far hills (the Alpilles): violet-blue, strokes follow the slope
    V.fill(polyBelow(hillY, -20, W + 20, 900), { color: '#2b3a7a', flat: true, seed: 5 });
    for (let i = 0; i < 560; i++) {
      const x = r() * W, t = r();
      const y = lerp(hillY(x) + 4, ridgeY(x) + 30, t);
      const sl = (hillY(x + 6) - hillY(x - 6)) / 12;
      const len = 30 + r() * 50, a = Math.atan(sl) + (r() - 0.5) * 0.25;
      const c = t < 0.18 ? (r() < 0.5 ? '#6f86c4' : '#8aa0cf') : pick(['#33468e', '#2a3a7c', '#465a9e', '#3a3f86', '#55509a'], r);
      V.ink([[x, y], [x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5 + (r() - 0.5) * 6], [x + Math.cos(a) * len, y + Math.sin(a) * len]], { brush: 'vgDab', color: c, w: 0.7 + r() * 0.4, seed: 900 + i, taper: [5, 8], wob: 1.5, smooth: true });
    }
    ridgeDabs(hillY, 2, ['#8fa6d6', '#a9bde0', '#7a92c8', '#c3d0e4'], 0.5, 77, r);
    ridgeDabs(hillY, 9, ['#1a2560', '#222e6c', '#151d50'], 0.4, 78, r);
    // nearer ridge: deep blue-green, with olive-grove dabs
    V.fill(polyBelow(ridgeY, -20, W + 20, 920), { color: '#1b2d50', flat: true, seed: 6 });
    for (let i = 0; i < 460; i++) {
      const x = r() * W, t = r();
      const y = lerp(ridgeY(x) + 4, 830, t);
      const sl = (ridgeY(x + 6) - ridgeY(x - 6)) / 12;
      const len = 24 + r() * 38, a = Math.atan(sl) * (1 - t) + (r() - 0.5) * 0.35;
      V.ink([[x, y], [x + Math.cos(a) * len, y + Math.sin(a) * len]], { brush: 'vgDab', color: pick(['#24406a', '#1c3456', '#2f5068', '#203a5e', '#355a72', '#1a2a4c'], r), w: 0.65 + r() * 0.4, seed: 1500 + i, taper: [5, 8], wob: 1.5 });
    }
    ridgeDabs(ridgeY, 1, ['#4f74a0', '#5f86b0', '#3e6290'], 0.4, 79, r);
  }

  // ---- village
  const HOUSES = (() => {
    const r = V.rng(4247), out = [];
    const rows = [
      { y: 714, x0: 640, gap: [-14, 34], wr: [30, 58], hr: [20, 30], tilt: 0.03 },
      { y: 750, x0: 610, gap: [-10, 46], wr: [38, 78], hr: [26, 40], tilt: 0.04 },
      { y: 792, x0: 660, gap: [6, 84], wr: [50, 104], hr: [30, 48], tilt: 0.05 },
    ];
    rows.forEach((R, row) => {
      let x = R.x0 + r() * 30;
      while (x < W + 30) {
        const w = lerp(R.wr[0], R.wr[1], r()), h = lerp(R.hr[0], R.hr[1], r());
        const base = R.y + Math.sin(x / 150 + row * 2) * 8 + r() * 6;
        const gable = r() < 0.5;
        const hs = { x, w, h, base, row, gable, roof: 12 + r() * 16, rs: r(), tilt: (r() - 0.5) * 2 * R.tilt, chim: r() < 0.4, win: Math.floor(r() * 2.6) + (row === 2 ? 1 : 0), shade: r(), side: row > 0 && r() < 0.6 ? (r() < 0.5 ? -1 : 1) : 0 };
        if (!(x + w > 1112 && x < 1222)) out.push(hs);
        x += w + lerp(R.gap[0], R.gap[1], r());
      }
    });
    return out;
  })();
  const CHURCH = { x: 1128, base: 798, w: 84, h: 62, tw: 28, tTop: 628, spire: 470 };
  const WINDOWS = [];
  HOUSES.forEach((hs, i) => {
    for (let j = 0; j < hs.win; j++) {
      const fx = hs.win === 1 ? 0.3 + 0.4 * hs.rs : 0.25 + (0.5 * j) / (hs.win - 1);
      WINDOWS.push({ x: hs.x + hs.w * fx, y: hs.base - hs.h * (0.42 + 0.16 * ((i + j) % 2)), w: 6 + (i % 3), h: 8 + ((i + j) % 2) * 3, i: WINDOWS.length, tilt: hs.tilt, hx: hs.x + hs.w / 2, hy: hs.base });
    }
  });
  WINDOWS.push({ x: CHURCH.x + 18, y: CHURCH.base - 28, w: 7, h: 14, i: WINDOWS.length, tilt: 0, hx: 0, hy: 0 });
  WINDOWS.push({ x: CHURCH.x + 66, y: CHURCH.base - 28, w: 7, h: 14, i: WINDOWS.length, tilt: 0, hx: 0, hy: 0 });
  const rotP = (x, y, cx, cy, a) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];

  function treeClump(x, y, rx, ry, seed, dark) {
    const r = V.rng(seed);
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, f = 0.82 + 0.3 * r();
      pts.push([x + Math.cos(a) * rx * f, y + Math.sin(a) * ry * f * (Math.sin(a) > 0 ? 0.7 : 1)]);
    }
    V.fill(pts, { color: dark ? '#0f2030' : '#152a38', flat: true, seed });
    for (let j = 0; j < 7; j++) {
      const a = r() * Math.PI * 2, q = r() * 0.65;
      const px = x + Math.cos(a) * rx * q, py = y + Math.sin(a) * ry * q;
      V.ink([[px - 9, py + 5], [px, py - 7], [px + 9, py + 3]], { brush: 'vgDab', color: pick(['#24453f', '#2c5248', '#1b3436', '#3a5c4a', '#203c50'], r), w: 0.5, seed: seed * 3 + j, taper: [4, 4], smooth: true, wob: 1 });
    }
  }

  function paintVillage() {
    const r = V.rng(5151);
    const outline = (pts, seed, w = 0.3) => V.ink(pts, { brush: 'vgDab', color: '#081030', w, seed, closed: true, taper: [0, 0], wob: 1.4 });
    // olive groves on the ridge, dark trees behind the houses
    for (let i = 0; i < 26; i++) treeClump(r() * 640, ridgeY(0) + 30 + r() * 80, 18 + r() * 24, 12 + r() * 12, 1600 + i, true);
    for (let i = 0; i < 40; i++) treeClump(600 + r() * 1340, 676 + r() * 80, 18 + r() * 26, 13 + r() * 16, 60 + i, r() < 0.6);
    // church nave, tower and spire (painted before the front row)
    const C = CHURCH;
    const tx = C.x + C.w * 0.5 - C.tw / 2;
    const body = [[C.x, C.base], [C.x, C.base - C.h], [C.x + C.w, C.base - C.h], [C.x + C.w, C.base]];
    const roof = [[C.x - 6, C.base - C.h + 2], [C.x + 10, C.base - C.h - 24], [C.x + C.w - 10, C.base - C.h - 24], [C.x + C.w + 6, C.base - C.h + 2]];
    const tower = [[tx, C.base - C.h], [tx + 1, C.tTop], [tx + C.tw - 1, C.tTop], [tx + C.tw, C.base - C.h]];
    const spire = [[tx - 4, C.tTop + 3], [tx + C.tw / 2 + 1, C.spire], [tx + C.tw + 4, C.tTop + 3]];
    V.fill(body, { color: '#34477e', flat: true, seed: 71 });
    V.fill(tower, { color: '#3e528a', flat: true, seed: 73 });
    for (let j = 0; j < 7; j++) {
      const f = (j + 0.5) / 7;
      V.ink([[tx + 3 + f * (C.tw - 6), C.base - C.h], [tx + 3 + f * (C.tw - 6), C.tTop + 4]], { brush: 'vgDab', color: j > 4 ? '#7086bd' : j % 2 ? '#4a5e98' : '#2f3f74', w: 0.3, seed: 700 + j, taper: [4, 4], wob: 0.8 });
    }
    for (let j = 0; j < 5; j++) {
      const f = (j + 0.5) / 5;
      V.ink([[C.x + f * C.w, C.base - 2], [C.x + f * C.w + 2, C.base - C.h + 4]], { brush: 'vgDab', color: j > 2 ? '#5c70a8' : '#2c3c70', w: 0.45, seed: 720 + j, taper: [3, 3] });
    }
    V.fill(roof, { color: '#1a2650', flat: true, seed: 72 });
    V.ink([[C.x + 10, C.base - C.h - 24], [C.x + C.w - 10, C.base - C.h - 24]], { brush: 'vgDab', color: '#6d88bd', w: 0.3, seed: 730, taper: [3, 3] });
    V.fill(spire, { color: '#1e2c5a', flat: true, seed: 74 });
    V.ink([[tx + C.tw + 2, C.tTop + 2], [tx + C.tw / 2 + 2, C.spire + 10]], { brush: 'vgDab', color: '#6f88c0', w: 0.28, seed: 731, taper: [3, 14] });
    V.ink([[tx + C.tw / 2, C.tTop + 2], [tx + C.tw / 2 + 1, C.spire + 18]], { brush: 'vgDab', color: '#2c3e74', w: 0.3, seed: 732, taper: [3, 14] });
    outline(body, 75); outline(roof, 76); outline(tower, 77); outline(spire, 78, 0.26);
    // houses, back to front
    HOUSES.forEach((hs, i) => {
      const cx = hs.x + hs.w / 2, cy = hs.base, a = hs.tilt;
      const R = (pts) => pts.map(([x, y]) => rotP(x, y, cx, cy, a));
      const x = hs.x, b = hs.base, top = b - hs.h;
      const wall = R([[x, b], [x, top], [x + hs.w, top], [x + hs.w, b]]);
      let roofP;
      if (hs.gable) roofP = R([[x - 4, top + 2], [x + hs.w / 2, top - hs.roof - 6], [x + hs.w + 4, top + 2]]);
      else { const ins = hs.w * (0.12 + 0.15 * hs.rs); roofP = R([[x - 5, top + 2], [x + ins, top - hs.roof], [x + hs.w - ins * 0.6, top - hs.roof], [x + hs.w + 5, top + 2]]); }
      const dk = hs.row === 0 ? 0.3 : hs.row === 1 ? 0.14 : 0;
      const wc = V.mix(pick(['#3a4c86', '#45558c', '#2f3f74', '#56669a', '#7488b8', '#4b5a80', '#5d6a8a', '#66708e'], () => hs.shade), '#0e1638', dk);
      if (hs.side) {
        const sw = hs.w * 0.32, sx = hs.side < 0 ? x : x + hs.w;
        const sideP = R([[sx, b], [sx, top], [sx + hs.side * sw, top - 6], [sx + hs.side * sw, b - 5]]);
        V.fill(sideP, { color: V.mix(wc, '#0a1030', 0.45), flat: true, seed: 150 + i });
        contour(sideP, 160 + i, 0.24, '#081030');
      }
      V.fill(wall, { color: wc, flat: true, seed: 100 + i });
      // moonlit facade strokes (right side lighter), shadow on the left
      const ns = Math.max(3, Math.round(hs.w / 13));
      for (let j = 0; j < ns; j++) {
        const f = (j + 0.5) / ns;
        const c = f > 0.62 ? V.mix(wc, '#9fb2d8', 0.45 - dk) : f < 0.3 ? V.mix(wc, '#0c1430', 0.4) : V.mix(wc, '#6a7cb0', 0.2);
        const p = R([[x + f * hs.w, b - 2], [x + f * hs.w + (r() - 0.5) * 3, top + 3]]);
        V.ink(p, { brush: 'vgDab', color: c, w: 0.42, seed: 200 + i * 7 + j, taper: [2, 2], wob: 0.6 });
      }
      const rc = V.mix(pick(['#16224a', '#1a2e48', '#202c58', '#14283e', '#2a2850'], () => hs.rs), '#070c22', dk);
      V.fill(roofP, { color: rc, flat: true, seed: 300 + i });
      // roof strokes along the slope + moonlit edge
      for (let j = 0; j < 3; j++) {
        const q = (j + 1) / 4;
        const p0 = [lerp(roofP[0][0], roofP[1][0], q), lerp(roofP[0][1], roofP[1][1], q)];
        const p1 = [lerp(roofP[roofP.length - 1][0], roofP[roofP.length - 2][0], q), lerp(roofP[roofP.length - 1][1], roofP[roofP.length - 2][1], q)];
        V.ink([p0, p1], { brush: 'vgDab', color: V.mix(rc, '#3a5684', 0.5), w: 0.32, seed: 350 + i * 3 + j, taper: [3, 3] });
      }
      V.ink(roofP.slice(1), { brush: 'vgDab', color: '#6c8cc2', w: 0.26, seed: 400 + i, taper: [3, 3], wob: 0.8 });
      if (hs.chim) {
        const chx = x + hs.w * (0.65 + 0.15 * hs.rs);
        V.ink(R([[chx, top - hs.roof * 0.5], [chx, top - hs.roof - 10]]), { brush: 'vgDab', color: '#1a2448', w: 0.55, seed: 450 + i, taper: [1, 1], wob: 0 });
      }
      contour(wall, 500 + i, 0.3, '#081030');
      contour(roofP, 550 + i, 0.24, '#081030');
    });
    // windows (painted state; flicker added per frame)
    WINDOWS.forEach((w, i) => {
      const pts = V.rectPts(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h).map(([x, y]) => (w.tilt ? rotP(x, y, w.hx, w.hy, w.tilt) : [x, y]));
      V.fill(pts, { color: i % 3 ? '#f2c548' : '#f7dc6a', flat: true, seed: 900 + i });
    });
    // front trees/bushes overlapping the lower village edge
    for (let i = 0; i < 14; i++) treeClump(620 + r() * 1320, 800 + r() * 14, 22 + r() * 28, 13 + r() * 10, 160 + i, false);
  }

  function paintMeadow() {
    const r = V.rng(6161);
    V.fill(polyBelow(meadowY, -20, W + 20, H + 20), { color: '#3c4a3a', flat: true, seed: 8 });
    // moonlit wheat: value is highest in the middle distance, darker in the near foreground
    const MID = ['#8f7f3e', '#a08a44', '#b39a4c', '#7d7038', '#c2a856', '#6f7a3c'];
    const NEAR = ['#5c6438', '#4a5a40', '#2e4a4c', '#3c5866', '#6a6a36', '#7d7038', '#26404a'];
    for (let i = 0; i < 1700; i++) {
      const x = -20 + r() * (W + 40), t = Math.pow(r(), 0.8);
      const y = lerp(meadowY(x) + 3, H + 12, t);
      const len = 12 + t * 40 + r() * 10, lean = -0.4 + 0.28 * Math.sin(x / 90 + t * 3) + (r() - 0.5) * 0.4;
      const a = -Math.PI / 2 + lean;
      let c = t < 0.07 ? pick(['#22383c', '#2a4048', '#1e3238'], r) : t < 0.55 ? pick(MID, r) : pick(NEAR, r);
      if (t > 0.55 && r() < 0.18) c = pick(MID, r);
      V.ink([[x, y], [x + Math.cos(a) * len * 0.5 + 2, y + Math.sin(a) * len * 0.5], [x + Math.cos(a) * len, y + Math.sin(a) * len]], { brush: 'vgDab', color: c, w: 0.4 + t * 0.6 + r() * 0.2, seed: 3000 + i, taper: [3, 7], wob: 1, smooth: true });
    }
    // a pale path winding up toward the village
    const path = V.smoothPts([[960, H + 10], [968, 1010], [1010, 950], [1048, 892], [1080, 846], [1098, 812]], false, 12);
    const PC = ['#9a8f68', '#b3a576', '#8a8160', '#c2b07a', '#7e7a62', '#a89a6c'];
    for (let j = 0; j < 9; j++) {
      const off = (j - 4) * 9;
      const lane = path.map(([x, y], i) => [x + off * (1 - i / (path.length - 1)) * 2.3, y]);
      let i = Math.floor(r() * 3);
      while (i < lane.length - 2) {
        const n = 3 + Math.floor(r() * 4);
        const seg = lane.slice(i, Math.min(lane.length, i + n + 1));
        const far = i / lane.length;
        if (seg.length > 1) V.ink(seg, { brush: 'vgDab', color: pick(PC, r), w: (0.78 - far * 0.45) * (0.8 + r() * 0.3), seed: 7700 + j * 50 + i, taper: [4, 6], smooth: true, wob: 1.5 });
        i += n - (r() < 0.5 ? 1 : 0);
      }
    }
  }

  // ---- the cypress: one dark flame of sinuous strokes; its two big side-flames are the "arms" (per frame)
  const CY = { b: 1100, t: 112 };
  const cyS = (y) => cl((CY.b - y) / (CY.b - CY.t));
  const cyX = (y) => { const s = cyS(y); return 392 + s * 58 + 18 * Math.sin(s * 5.2 + 0.3); };
  const cyHW = (y) => { const s = cyS(y); return (150 * Math.pow(1 - s, 0.78) * (1 - 0.15 * s) + 3) * (1 + 0.07 * Math.sin(s * 37 + 1) + 0.04 * Math.sin(s * 83)); };
  const CORE = (() => {
    const L = [], R = [];
    for (let y = CY.b; y >= CY.t; y -= 5) {
      const xc = cyX(y), hw = cyHW(y);
      L.push([xc - hw, y]);
      R.push([xc + hw * 1.04, y]);
    }
    return L.concat([[cyX(CY.t) + 3, CY.t - 22]], R.reverse());
  })();
  function inPoly(x, y, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function bez(P0, P1, P2, P3, t) {
    const u = 1 - t;
    return [u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]];
  }
  /** a flame lick: cubic spine B->T (control points P1,P2) with a tapering width -> {spine, wid, nor, n, poly} */
  function lick(B, P1, P2, T, W0, n = 22, pw = 0.62) {
    const spine = [], wid = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      spine.push(bez(B, P1, P2, T, s));
      wid.push(W0 * Math.pow(1 - s, pw) * (0.86 + 0.14 * Math.sin(s * 8 + W0)) + 1.5);
    }
    const nor = spine.map((p, i) => {
      const q0 = spine[Math.max(0, i - 1)], q1 = spine[Math.min(n, i + 1)];
      const dx = q1[0] - q0[0], dy = q1[1] - q0[1], l = Math.hypot(dx, dy) || 1;
      return [-dy / l, dx / l];
    });
    const edge = (f) => spine.map((p, i) => [p[0] + nor[i][0] * wid[i] * f, p[1] + nor[i][1] * wid[i] * f]);
    return { spine, wid, nor, n, edge, poly: edge(0.5).concat(edge(-0.5).reverse()) };
  }
  // side licks of the cypress: [side, s at base, rise (as s), reach (x hw), width (x hw)]
  const LICKS = [
    [-1, 0.03, 0.2, 0.32, 0.5], [-1, 0.19, 0.16, 0.3, 0.46], [-1, 0.6, 0.14, 0.36, 0.55], [-1, 0.75, 0.11, 0.42, 0.6],
    [1, 0.08, 0.2, 0.3, 0.46], [1, 0.24, 0.13, 0.26, 0.4], [1, 0.62, 0.14, 0.36, 0.55], [1, 0.79, 0.1, 0.44, 0.62],
  ].map(([sg, sb, rise, reach, wd]) => {
    const H = CY.b - CY.t, yb = CY.b - sb * H, yt = yb - rise * H, hb = cyHW(yb);
    const B = [cyX(yb) + sg * hb * 0.35, yb];
    const T = [cyX(yt) + sg * (cyHW(yt) + hb * reach), yt];
    const P1 = [B[0] + sg * hb * 0.55, B[1] - rise * H * 0.25];
    const P2 = [T[0] + sg * hb * 0.12, T[1] + rise * H * 0.55];
    return lick(B, P1, P2, T, hb * wd);
  });
  const cyFlow = (x, y) => {
    const xc = cyX(y), hw = Math.max(10, cyHW(y)), rel = (x - xc) / hw;
    const vx = 0.45 * Math.sin(y / 46 + 1.3 * Math.sin(x / 31)) + rel * 0.3;
    return Math.atan2(-1, vx);
  };
  const CYP_DARK = ['#0b1711', '#0f2018', '#142b1f', '#183424', '#0c1520', '#112619', '#1b3b29', '#0a1214', '#1f2f1c', '#162a2c'];
  const CYP_LIGHT = ['#33502c', '#3c5a30', '#465f2e', '#4f5f2a', '#26403a', '#1e3448', '#3a4a26'];
  function lickStrokes(tg, seed, o = {}) {
    const r = V.rng(seed);
    const ns = o.n || Math.max(4, Math.round(tg.wid[0] / 10));
    for (let j = 0; j < ns; j++) {
      const off = (j / Math.max(1, ns - 1) - 0.5) * 0.86 + (r() - 0.5) * 0.06;
      const cut = 0.3 + r() * 0.35;
      [[r() * 0.15, cut + 0.04], [cut - 0.04, 0.72 + r() * 0.28]].forEach(([s0, s1], h) => {
        const pts = [];
        for (let i = 0; i <= tg.n; i++) {
          const s = i / tg.n;
          if (s < s0 || s > s1) continue;
          pts.push([tg.spine[i][0] + tg.nor[i][0] * tg.wid[i] * off, tg.spine[i][1] + tg.nor[i][1] * tg.wid[i] * off]);
        }
        if (pts.length < 3) return;
        const light = r() < (o.lightP || 0.14);
        V.ink(pts, { brush: 'vgDab', color: light ? pick(CYP_LIGHT, r) : pick(CYP_DARK, r), w: (o.w || 0.62) * (0.8 + r() * 0.45), seed: seed * 5 + j * 2 + h, taper: [5, 14], smooth: true, wob: 1.2 });
      });
    }
  }

  function paintCypress() {
    const r = V.rng(3030);
    LICKS.forEach((tg, i) => V.fill(tg.poly, { color: '#0b1611', flat: true, seed: 40 + i }));
    V.fill(CORE, { color: '#0b1611', flat: true, seed: 31 });
    LICKS.forEach((tg, i) => lickStrokes(tg, 3300 + i * 11));
    // sinuous upward strokes inside the core
    for (let i = 0; i < 720; i++) {
      const y0 = lerp(CY.b + 6, CY.t + 24, Math.pow(r(), 0.8));
      let x = cyX(y0) + (r() * 2 - 1) * cyHW(y0) * 1.05, y = y0;
      const L = 28 + r() * 80, light = r() < 0.13;
      if (!inPoly(x, y, CORE)) continue;
      const pts = [[x, y]];
      for (let d = 0; d < L; d += 7) {
        const a = cyFlow(x, y);
        x += Math.cos(a) * 7; y += Math.sin(a) * 7;
        if (!inPoly(x, y, CORE)) break;
        pts.push([x, y]);
      }
      if (pts.length < 3) continue;
      V.ink(pts, { brush: 'vgDab', color: light ? pick(CYP_LIGHT, r) : pick(CYP_DARK, r), w: (light ? 0.42 : 0.6) + r() * 0.38, seed: 3100 + i, taper: [6, 16], smooth: true, wob: 1.5 });
    }
    // small curling hooks (the tree's flicker)
    for (let i = 0; i < 16; i++) {
      const y = lerp(CY.b - 40, CY.t + 120, r()), x = cyX(y) + (r() * 2 - 1) * cyHW(y) * 0.6;
      const rad = 8 + r() * 10, a0 = r() * Math.PI * 2, s = r() < 0.5 ? 1 : -1;
      V.ink(arcPts(x, y, rad, a0, a0 + s * (1.6 + r() * 1.2), 4), { brush: 'vgDab', color: pick(['#2c4428', '#33502c', '#1f3a30'], r), w: 0.34, seed: 3600 + i, taper: [4, 10], wob: 0.6 });
    }
    // moonlit flicks along the right-hand edges, near-black on the left
    for (let i = 0; i < CORE.length - 6; i += 4) {
      const seg = CORE.slice(i, i + 7);
      const right = seg[0][0] > cyX(seg[0][1]);
      if (r() < 0.3) continue;
      V.ink(seg, { brush: 'vgDab', color: right && r() < 0.5 ? '#40602f' : '#050b08', w: 0.3 + r() * 0.2, seed: 3800 + i, taper: [6, 6], smooth: true, wob: 1 });
    }
    LICKS.forEach((tg, i) => {
      const sg = tg.spine[tg.n][0] > tg.spine[0][0] ? 1 : -1;
      V.ink(tg.edge(sg > 0 ? -0.45 : 0.45).slice(4), { brush: 'vgDab', color: sg > 0 ? '#44643a' : '#050b08', w: 0.28, seed: 3900 + i, taper: [6, 18], smooth: true, wob: 1 });
    });
  }

  // ---- post: impasto relief (light from the upper left) — makes every stroke edge catch light like thick paint
  // p5.brush darkens fully-loaded stroke masks (pigment*(1-b) - 0.5b, b≈0.15): strokes top out at ~78% brightness.
  // This pass (1) restores the highlights with a tone curve, (2) lifts saturation a touch, (3) adds the impasto relief.
  const TONE = (() => {
    const t = new Float32Array(256);
    for (let L = 0; L < 256; L++) t[L] = 1 + 0.3 * V.smooth(135, 198, L);
    return t;
  })();
  function relief(img) {
    const ctx = img.drawingContext;
    const id = ctx.getImageData(0, 0, W, H), d = id.data;
    const L = new Float32Array(W * H);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) L[j] = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        const j = y * W + x, i = j * 4, l = L[j];
        let s = L[j + W + 1] + 0.5 * L[j + 2 * W + 2] - (L[j - W - 1] + 0.5 * L[j - 2 * W - 2]);
        s = Math.max(-40, Math.min(40, s * 0.55));
        const g = TONE[l | 0];
        d[i] = (l + (d[i] - l) * 1.1) * g + s;
        d[i + 1] = (l + (d[i + 1] - l) * 1.1) * g + s;
        d[i + 2] = (l + (d[i + 2] - l) * 1.1) * g + s * 0.9;
      }
    }
    for (let i = 3; i < d.length; i += 4) d[i] = 255;
    ctx.putImageData(id, 0, 0);
  }
  function weave() {
    return V.gfx('vg_weave', W, H, (ctx) => {
      const img = ctx.createImageData(W, H), d = img.data;
      const rr = V.rng(31337);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const a = Math.sin(x * 2.09) * Math.sin(y * 0.69 + (x % 6 < 3 ? 0 : 1.5));
          const b = Math.sin(y * 2.09) * Math.sin(x * 0.69 + (y % 6 < 3 ? 0 : 1.5));
          const v = 214 + 22 * (x % 6 < 3 ? a : b) + (rr() - 0.5) * 26;
          d[i] = v; d[i + 1] = v * 0.985; d[i + 2] = v * 0.95; d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    });
  }

  function paintStatic(k) {
    V.fill([[-500, -500], [-480, -500], [-480, -480]], { color: '#000', flat: true }); // sacrificial first fill (p5.brush lazy init)
    V.resetBrush();
    paintSky(k);
    paintMoon(k);
    paintLand();
    paintVillage();
    paintMeadow();
    paintCypress();
    V.flush();
  }

  // ------------------------------------------------------------------ per-frame layers
  function starRings(t) {
    const say = V.G.say(t);
    V.with2d((ctx) => {
      STARS.forEach((s) => {
        const p = (s.i % 2 === 0) === (say.n === 6) ? Math.exp(-4.2 * say.k) : 0;
        const R = s.r * (0.86 + 0.34 * p);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R * 1.6);
        g.addColorStop(0, `rgba(255,250,220,${0.5 + 0.4 * p})`);
        g.addColorStop(0.35, `rgba(240,230,160,${0.14 + 0.22 * p})`);
        g.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(s.x - R * 2, s.y - R * 2, R * 4, R * 4);
      });
      const g = ctx.createRadialGradient(MOON.x, MOON.y, MOON.r * 0.8, MOON.x, MOON.y, MOON.R * 1.15);
      g.addColorStop(0, 'rgba(255,200,60,0.16)');
      g.addColorStop(1, 'rgba(255,200,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(MOON.x - 260, MOON.y - 260, 520, 520);
    }, { blend: 'screen' });
    STARS.forEach((s) => {
      const p = (s.i % 2 === 0) === (say.n === 6) ? Math.exp(-4.2 * say.k) : 0;
      const R = s.r * (0.86 + 0.34 * p);
      const r = V.rng(500 + s.i * 31);
      // concentric rings of thick paint: white core ring, cadmium yellow, pale lemon, a cool blue-green rim
      const RINGS = [[0.42, ['#fffdf2', '#fff6cc'], 0.5], [0.62, ['#f7d23a', '#f2c02a'], 0.5], [0.8, ['#fff1a0', '#f9e27a'], 0.44], [0.98, ['#a9d0cc', '#cfe2c8'], 0.34]];
      RINGS.forEach(([f, cols, w], ri) => {
        const n = 2 + (ri > 1 ? 1 : 0);
        const a00 = r() * Math.PI * 2;
        for (let j = 0; j < n; j++) {
          const a0 = a00 + (j * Math.PI * 2) / n + r() * 0.2, len = ((Math.PI * 2) / n) * (0.78 + r() * 0.16);
          V.ink(arcPts(s.x, s.y, R * f, a0, a0 + len, 4), { brush: 'vgDab', color: cols[j % 2], w: w + 0.12 * p, seed: s.i * 50 + ri * 7 + j, taper: [4, 6], wob: 0.4 });
        }
      });
      V.dot(s.x, s.y, R * (0.3 + 0.05 * p), '#fffdf0', { seed: s.i });
      V.dot(s.x + 1, s.y - 1, R * 0.16, '#ffffff', { seed: s.i + 3 });
    });
  }

  function windowsGlow(t) {
    V.with2d((ctx) => {
      WINDOWS.forEach((w) => {
        const f = 0.55 + 0.45 * V.noise1(t * 3.1 + w.i * 7.3);
        const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, 24);
        g.addColorStop(0, `rgba(255,215,90,${0.42 * f})`);
        g.addColorStop(1, 'rgba(255,190,60,0)');
        ctx.fillStyle = g;
        ctx.fillRect(w.x - 26, w.y - 26, 52, 52);
        ctx.fillStyle = `rgba(255,${200 + 40 * f},${90 + 60 * f},${0.4 + 0.5 * f})`;
        ctx.fillRect(w.x - w.w / 2 + 1, w.y - w.h / 2 + 1, w.w - 2, w.h - 2);
      });
    }, { blend: 'screen' });
  }

  /** the cypress's two big side-flames, held out like arms; the flame tips curl up like open palms */
  function cypressArms(t) {
    [0, 1].forEach((side) => {
      const a = V.G.arm(t, side).y;
      const sg = side ? 1 : -1;
      const yb = side ? 678 : 694;
      const B = [cyX(yb) + sg * cyHW(yb) * 0.3, yb];
      const tip = [B[0] + sg * (190 - 14 * Math.abs(a)), B[1] - 58 - 82 * a];
      const P1 = [B[0] + sg * 92, B[1] + 10 - 28 * a];
      const P2 = [tip[0] - sg * 10, tip[1] + 64];
      const arm = lick(B, P1, P2, tip, 66, 24, 0.5);
      // two finger-flames rising from the hand end (palm up)
      const fingers = [0.62, 0.78].map((s0, j) => {
        const i0 = Math.round(s0 * arm.n), p = arm.spine[i0], w = arm.wid[i0];
        const f = sg > 0 ? -0.3 : 0.3, up = [p[0] + arm.nor[i0][0] * w * f, p[1] + arm.nor[i0][1] * w * f];
        const T = [up[0] + sg * (6 + j * 4), up[1] - 34 - j * 6];
        return lick(up, [up[0] + sg * 8, up[1] - 8], [T[0] - sg * 2, T[1] + 14], T, w * 0.62, 12, 0.6);
      });
      [arm, ...fingers].forEach((tg, j) => V.fill(tg.poly, { color: '#0b1611', flat: true, seed: 990 + side * 5 + j }));
      lickStrokes(arm, 991 + side * 7, { n: 9, w: 0.64, lightP: 0.22 });
      fingers.forEach((tg, j) => lickStrokes(tg, 1200 + side * 7 + j, { n: 3, w: 0.42, lightP: 0.3 }));
      // little flame flickers licking up from the branch's top edge
      const top = arm.edge(sg > 0 ? -0.42 : 0.42);
      [0.22, 0.4, 0.55].forEach((s0, j) => {
        const i0 = Math.round(s0 * arm.n), p = top[i0];
        V.ink([p, [p[0] + sg * 6, p[1] - 12], [p[0] + sg * 4, p[1] - 22 - j * 3]], { brush: 'vgDab', color: j === 1 ? '#3c5a30' : '#10221a', w: 0.42, seed: 1150 + side * 9 + j, taper: [3, 8], smooth: true, wob: 0.5 });
      });
      // dark underside + moonlit upper edge
      V.ink(arm.edge(sg > 0 ? 0.47 : -0.47).slice(2), { brush: 'vgDab', color: '#050b08', w: 0.3, seed: 1090 + side, taper: [6, 24], smooth: true, wob: 1 });
      V.ink(arm.edge(sg > 0 ? -0.46 : 0.46).slice(3), { brush: 'vgDab', color: '#58783e', w: 0.3, seed: 1095 + side, taper: [6, 24], smooth: true, wob: 1 });
    });
  }

  // ---- peasants (Van Gogh's working figures: blue smocks, straw hat, white bonnet, dark broken contour lines)
  const DARK = '#0a1028';
  const quadP = (q, u, v) => {
    const top = [lerp(q[0][0], q[1][0], u), lerp(q[0][1], q[1][1], u)], bot = [lerp(q[3][0], q[2][0], u), lerp(q[3][1], q[2][1], u)];
    return [lerp(top[0], bot[0], v), lerp(top[1], bot[1], v)];
  };
  /** broken painterly contour: segments of the closed outline with gaps */
  function contour(pts, seed, w, col = DARK) {
    const r = V.rng(seed);
    const loop = V.resample(pts.concat([pts[0]]), 5);
    const n = loop.length;
    let i = Math.floor(r() * 6);
    while (i < n - 3) {
      const len = 6 + Math.floor(r() * 12);
      V.ink(loop.slice(i, Math.min(n, i + len)), { brush: 'vgDab', color: col, w: w * (0.75 + r() * 0.5), seed: seed + i, taper: [3, 5], wob: 0.7 });
      i += len + (r() < 0.6 ? 1 : 2);
    }
  }
  /** a garment painted as a quad [tl,tr,br,bl]: flat base, then short form-following dabs (shadow left, moonlight right) */
  function cloth(q, base, hi, lo, n, seed, S, cw = 0.3, shape = null) {
    const r = V.rng(seed);
    V.fill(shape || q, { color: base, flat: true, seed });
    for (let j = 0; j < n * 1.6; j++) {
      const u = ((j % n) + r() * 0.9) / n, v0 = r() * 0.72, dv = 0.16 + r() * 0.3, du = (r() - 0.5) * 0.14 + (u - 0.5) * 0.1;
      const a = quadP(q, cl(u, 0.04, 0.96), v0), b = quadP(q, cl(u + du, 0.04, 0.96), Math.min(0.97, v0 + dv));
      const c = u > 0.66 ? (r() < 0.7 ? hi : V.mix(base, hi, 0.5)) : u < 0.34 ? (r() < 0.7 ? lo : base) : r() < 0.5 ? base : V.mix(base, r() < 0.5 ? hi : lo, 0.4);
      V.ink([a, [(a[0] + b[0]) / 2 + (r() - 0.5) * 3, (a[1] + b[1]) / 2], b], { brush: 'vgDab', color: c, w: (0.36 + r() * 0.22) * S, seed: seed + 10 + j, taper: [3, 4], smooth: true, wob: 0.6 });
    }
    contour(shape || q, seed + 77, cw);
  }
  /** a limb as paint: body stroke, a broken dark contour on the shadow (lower) side, a moonlit stroke on top */
  function limb(a, b, col, hi, w, seed) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l, ny = dx / l;
    if (ny < 0 || (Math.abs(ny) < 0.2 && nx > 0)) { nx = -nx; ny = -ny; } // n points to the shadow side (down / left)
    const o = w * 5.2;
    V.ink([a, b], { brush: 'vgDab', color: col, w, seed: seed + 1, taper: [1, 2], wob: 0.5 });
    V.ink([[a[0] + nx * o + dx * 0.05, a[1] + ny * o + dy * 0.05], [b[0] + nx * o - dx * 0.08, b[1] + ny * o - dy * 0.08]], { brush: 'vgDab', color: DARK, w: 0.22, seed, taper: [3, 4], wob: 0.6 });
    if (hi) V.ink([[a[0] - nx * o * 0.55 + dx * 0.18, a[1] - ny * o * 0.55 + dy * 0.18], [b[0] - nx * o * 0.55 - dx * 0.12, b[1] - ny * o * 0.55 - dy * 0.12]], { brush: 'vgDab', color: hi, w: w * 0.38, seed: seed + 2, taper: [3, 3], wob: 0.4 });
  }
  function peasant(cx, fy, S, kind, t, idx) {
    const pulse = V.G.pulse(t, 6);
    const bob = 4.5 * pulse * S;
    const tilt = V.G.tilt(t, 0.1) * (idx === 1 ? -1 : 1);
    const P = (x, y) => [cx + x * S, fy + y * S + (y < -30 ? bob : 0)];
    const coat = kind === 'woman' ? '#2b2a5e' : kind === 'boy' ? '#2e56a0' : '#22438f';
    const coatHi = kind === 'woman' ? '#5458a6' : kind === 'boy' ? '#6a94d4' : '#5a86cf';
    const coatLo = V.mix(coat, '#050a20', 0.5);
    const skin = '#c99e78';
    const sd = 7000 + idx * 300;
    // ground shadow (two soft dabs, cast toward the lower left, away from the moon)
    V.ink([P(-44, 3), P(-14, 1)], { brush: 'vgDab', color: '#2a3a36', w: 0.55 * S, seed: sd - 1, taper: [8, 6], wob: 1 });
    V.ink([P(-30, 6), P(8, 4)], { brush: 'vgDab', color: '#24343a', w: 0.4 * S, seed: sd - 2, taper: [8, 6], wob: 1 });
    // legs / skirt
    if (kind === 'woman') {
      cloth([P(-25, -88), P(25, -88), P(38, -3), P(-38, -3)], '#24204e', '#43418a', '#121130', 9, sd, S);
      cloth([P(-15, -90), P(15, -90), P(19, -22), P(-19, -22)], '#8193b8', '#c3cfe2', '#6f80a8', 5, sd + 100, S, 0.18);
    } else {
      limb(P(-11, -84), P(-15, -8), '#161e40', '#2c3c6e', 1.3 * S, sd + 4);
      limb(P(11, -84), P(15, -8), '#1e2852', '#46589a', 1.3 * S, sd + 6);
      V.ink([P(-27, -4), P(-8, -5)], { brush: 'vgDab', color: '#0c0c14', w: 0.95 * S, seed: sd + 8, taper: [2, 2] });
      V.ink([P(8, -5), P(27, -4)], { brush: 'vgDab', color: '#0c0c14', w: 0.95 * S, seed: sd + 9, taper: [2, 2] });
    }
    // smock / bodice (flares at the hem)
    const torso = kind === 'woman' ? [P(-20, -150), P(20, -150), P(25, -86), P(-25, -86)] : [P(-24, -152), P(24, -152), P(34, -76), P(-34, -76)];
    const shape = kind === 'woman'
      ? [P(-8, -158), P(8, -158), P(19, -151), P(22, -140), P(25, -86), P(-25, -86), P(-22, -140), P(-19, -151)]
      : [P(-9, -160), P(9, -160), P(22, -153), P(27, -140), P(34, -76), P(-34, -76), P(-27, -140), P(-22, -153)];
    cloth(torso, coat, coatHi, coatLo, kind === 'boy' ? 9 : 12, sd + 30, S, 0.3, shape);
    V.ink([P(-21, -137), P(0, -131), P(21, -137)], { brush: 'vgDab', color: coatLo, w: 0.26 * S, seed: sd + 48, taper: [3, 3], smooth: true }); // yoke seam
    if (kind === 'woman') V.ink([P(-18, -146), P(0, -134), P(18, -146)], { brush: 'vgDab', color: '#cfd6e0', w: 0.3 * S, seed: sd + 47, taper: [3, 3], smooth: true }); // fichu
    // arms: upper arm hangs to the elbow at the waist, forearm held out to the side, palm up — the 67 seesaw
    [0, 1].forEach((side) => {
      const sg = side ? 1 : -1;
      const a = V.G.arm(t, side).y;
      const sh = P(sg * (kind === 'woman' ? 18 : 22), -146);
      const el = P(sg * (kind === 'woman' ? 27 : 31), -106 + 3 * a);
      const hd = P(sg * (kind === 'woman' ? 60 : 66), -112 - 30 * a);
      limb(sh, el, side ? V.mix(coat, coatHi, 0.5) : coatLo, null, 0.92 * S, sd + 80 + side * 10);
      limb(el, hd, side ? V.mix(coat, coatHi, 0.6) : coat, coatHi, 0.8 * S, sd + 84 + side * 10);
      // palm-up hand: flat palm continuing the forearm, fingers curling up at the far end, thumb on top
      const dx = hd[0] - el[0], dy = hd[1] - el[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
      const p0 = [hd[0] - ux * 2 * S, hd[1] - uy * 2 * S];
      const p1 = [hd[0] + ux * 13 * S, hd[1] + uy * 13 * S];
      const fu = [p1[0] + ux * 2 * S, p1[1] - 7 * S];
      V.ink([p0, p1, fu], { brush: 'vgDab', color: DARK, w: 0.78 * S, seed: sd + 90 + side, taper: [1, 3], wob: 0, smooth: true });
      V.ink([p0, p1, fu], { brush: 'vgDab', color: skin, w: 0.5 * S, seed: sd + 92 + side, taper: [1, 3], wob: 0, smooth: true });
      V.ink([[hd[0] + ux * 3 * S, hd[1] + uy * 3 * S - 1], [hd[0] + ux * 7 * S, hd[1] + uy * 7 * S - 5 * S]], { brush: 'vgDab', color: '#f0d2a0', w: 0.24 * S, seed: sd + 94 + side, taper: [1, 2], wob: 0 });
    });
    // neck + head (tilting a little toward the high hand)
    const hc = P(0, -170);
    V.ink([P(0, -150), P(0, -160)], { brush: 'vgDab', color: '#b08a5a', w: 0.7 * S, seed: sd + 49, taper: [0, 0] });
    V.push();
    V.translate(hc[0], hc[1]);
    V.rotate(tilt);
    V.scale(S);
    V.fill(V.ellipsePts(0, 0, 12.5, 15, 20), { color: skin, flat: true, seed: sd + 50 });
    V.ink([[-6, -12], [-3, 2], [-6, 12]], { brush: 'vgDab', color: '#c4995e', w: 0.42, seed: sd + 69, taper: [3, 3], smooth: true });
    V.ink([[3, -12], [5, 0], [2, 12]], { brush: 'vgDab', color: '#e6c48c', w: 0.4, seed: sd + 70, taper: [3, 3], smooth: true });
    V.ink([[-7, -10], [-10, 1], [-6, 11]], { brush: 'vgDab', color: '#8f8a58', w: 0.34, seed: sd + 51, taper: [3, 3], smooth: true }); // green-ochre shadow side
    V.ink([[6, -10], [8, -2]], { brush: 'vgDab', color: '#f2d6a2', w: 0.25, seed: sd + 59, taper: [2, 2] });
    V.ink([[0.5, -1], [1.5, 4.5], [-1, 5]], { brush: 'vgDab', color: '#a8784a', w: 0.14, seed: sd + 58, taper: [1, 1], wob: 0 });
    V.ink([[5, 3], [9, 5]], { brush: 'vgDab', color: '#d9905e', w: 0.2, seed: sd + 68, taper: [2, 2], wob: 0 });
    contour(V.ellipsePts(0, 0, 12.5, 15, 20), sd + 52, 0.2);
    // wide, deadpan eyes
    V.dot(-4.6, -2, 2.7, '#f4efe0', { seed: sd + 53 });
    V.dot(4.6, -2, 2.7, '#f4efe0', { seed: sd + 54 });
    V.dot(-4.6, -1.5, 1.5, '#101018', { seed: sd + 55 });
    V.dot(4.6, -1.5, 1.5, '#101018', { seed: sd + 56 });
    V.ink([[-4, 8], [4, 8]], { brush: 'vgDab', color: '#6a3a2a', w: 0.16, seed: sd + 57, taper: [1, 1], wob: 0 });
    if (kind === 'man') {
      // a certain painter's ginger hair and beard
      V.ink([[-12, -6], [-13, 4]], { brush: 'vgDab', color: '#c8642a', w: 0.42, seed: sd + 71, taper: [2, 3] });
      V.ink([[12, -6], [13, 4]], { brush: 'vgDab', color: '#d8762e', w: 0.42, seed: sd + 72, taper: [2, 3] });
      V.ink([[-11, 4], [-8, 13], [0, 17], [8, 13], [11, 4]], { brush: 'vgDab', color: '#d06a28', w: 0.5, seed: sd + 73, taper: [3, 3], smooth: true });
      V.ink([[-7, 9], [0, 15], [7, 9]], { brush: 'vgDab', color: '#e8903a', w: 0.3, seed: sd + 74, taper: [2, 2], smooth: true });
      V.ink([[-5, 6.5], [0, 5.5], [5, 6.5]], { brush: 'vgDab', color: '#b4521e', w: 0.2, seed: sd + 75, taper: [1, 1], smooth: true });
      // straw hat
      V.fill(V.ellipsePts(0, -11, 31, 6.5, 22), { color: '#c9993a', flat: true, seed: sd + 60 });
      V.fill([[-14, -12], [-12, -27], [12, -27], [14, -12]], { color: '#d9ad44', flat: true, seed: sd + 61 });
      V.ink([[-29, -11], [0, -7], [29, -11]], { brush: 'vgDab', color: '#f0cf62', w: 0.3, seed: sd + 62, taper: [3, 3], smooth: true });
      V.ink([[-10, -24], [-11, -14]], { brush: 'vgDab', color: '#f3d878', w: 0.25, seed: sd + 65, taper: [2, 2] });
      V.ink([[4, -25], [6, -14]], { brush: 'vgDab', color: '#b8862e', w: 0.22, seed: sd + 67, taper: [2, 2] });
      V.ink([[-13, -15], [13, -15]], { brush: 'vgDab', color: '#7a4e1e', w: 0.25, seed: sd + 63, taper: [2, 2] });
      contour(V.ellipsePts(0, -11, 31, 6.5, 22), sd + 64, 0.18);
    } else if (kind === 'woman') {
      // white bonnet
      const bon = [[-15, 7], [-16, -12], [-8, -21], [8, -21], [16, -12], [15, 7], [10, -8], [-10, -8]];
      V.fill(bon, { color: '#dfe2e2', flat: true, seed: sd + 60 });
      V.ink([[-14, 4], [-13, -14], [0, -21], [13, -14], [14, 4]], { brush: 'vgDab', color: '#b4c2d6', w: 0.3, seed: sd + 61, taper: [3, 3], smooth: true });
      V.ink([[4, -18], [12, -10]], { brush: 'vgDab', color: '#ffffff', w: 0.22, seed: sd + 63, taper: [2, 2] });
      contour(bon, sd + 62, 0.15, '#2a3460');
    } else {
      V.ink([[-12, -6], [-12, 3]], { brush: 'vgDab', color: '#5a3a1e', w: 0.38, seed: sd + 71, taper: [2, 3] });
      V.ink([[12, -6], [12, 3]], { brush: 'vgDab', color: '#6a4422', w: 0.38, seed: sd + 72, taper: [2, 3] });
      // boy's cap
      V.fill([[-14, -8], [-13, -18], [0, -22], [13, -18], [21, -9]], { color: '#1a2140', flat: true, seed: sd + 60 });
      V.ink([[-12, -9], [23, -9]], { brush: 'vgDab', color: '#0c1022', w: 0.3, seed: sd + 61, taper: [2, 2] });
      V.ink([[-8, -18], [6, -20]], { brush: 'vgDab', color: '#3a4a7a', w: 0.2, seed: sd + 63, taper: [2, 2] });
    }
    V.pop();
  }

  // ------------------------------------------------------------------ scene
  function draw(t) {
    vgSetup();
    V.resetBrush();
    const k = ((V.tick % NV) + NV) % NV;
    V.bake('vg_starry_' + k, () => paintStatic(k));
    V.resetBrush();
    starRings(t);
    windowsGlow(t);
    cypressArms(t);
    // three peasants by the path (left -> right): a man in a straw hat, a boy, a woman in a white bonnet
    peasant(666, 1036, 1.16, 'man', t, 0);
    peasant(838, 1044, 0.85, 'boy', t, 1);
    peasant(1002, 1032, 1.1, 'woman', t, 2);
    // impasto relief + highlight tone curve over the whole painted frame (static + moving strokes alike).
    // One persistent buffer (no per-frame p5.Image -> no WEBGL texture-cache growth).
    V.flush();
    const rb = V.gfx('vg_relief', W, H, () => {});
    const main = document.querySelector('#stage canvas') || drawingContext.canvas;
    rb.drawingContext.globalCompositeOperation = 'copy';
    rb.drawingContext.drawImage(main, 0, 0, W, H);
    rb.drawingContext.globalCompositeOperation = 'source-over';
    relief(rb);
    V.blit(rb, 0, 0, W, H);
    V.blit(weave(), 0, 0, W, H, { blend: 'multiply', alpha: 0.3 });
    V.vignette({ amt: 0.3, color: '8,10,30', inner: 0.5 });
  }

  V.scenes.vangogh = {
    init(meta) {
      if (meta && !meta.yearText) meta.yearText = String(meta.year); // "1889", not "1,889"
    },
    draw(t) {
      draw(t);
    },
  };
})();
