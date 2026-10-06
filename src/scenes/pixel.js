/* pixel.js — 1991 · 16 位元像素《街頭六七 II》 (film 58.0–62.0 s)
 * An arcade-resolution INDEXED framebuffer 384×216 (CPS-1 boards ran 384×224) blown up ×5 nearest-neighbour to 1920×1080.
 *  - one master palette (~36 colours, hue-shifted shared ramps), Bayer 4×4 ordered dither for skies / glows / shadows
 *  - custom 5×7 bitmap font (+ 1-px neon-tube skeleton variant), every glyph defined below
 *  - fighters are modelled from capsules/ellipses/polygons, cel-shaded into 3–4 tone ramps, then auto-outlined like a sprite rip
 *  - 4-frame 67 loop locked to V.G.arm + a 1–2 px knee sink on every beat; crowd, neon, flags animate on 2 frames
 * Pure function of t: static layers are rasterised once (deterministic) and cached, the rest is redrawn each frame.
 */
(function () {
  'use strict';
  const PW = 384, PH = 216, PS = 5, TR = 255;

  // ------------------------------------------------------------------ palette
  const HEX = {
    K0: '#100a19', K1: '#231736', K2: '#3a2552', K3: '#5a3266',
    M0: '#8a3868', M1: '#c4485a', O0: '#ec6c3e', O1: '#ff9c40', Y0: '#ffcb58', Y1: '#fff2a8',
    N0: '#4c2420', N1: '#8e4a30', N2: '#d0865a', N3: '#f2ba88', N4: '#ffe0be',
    B0: '#16204c', B1: '#2a489e', B2: '#4884e4', B3: '#9cc8ff',
    G0: '#46466c', G1: '#8686aa', G2: '#c4c4dc', G3: '#f6f6ff',
    R0: '#62101e', R1: '#c41c2c', R2: '#ff5c4a',
    P0: '#ff3a9c', P1: '#ffb6e2', C0: '#22d6ff', C1: '#c6faff',
    V0: '#283820', V1: '#52682e', V2: '#88a04a',
  };
  const NM = Object.keys(HEX);
  const P = {};
  NM.forEach((n, i) => (P[n] = i));
  const LUT = new Uint32Array(256);
  NM.forEach((n, i) => {
    const [r, g, b] = V.rgb(HEX[n]);
    LUT[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  });
  const mapOf = (pairs) => {
    const m = new Uint8Array(256);
    for (let i = 0; i < 256; i++) m[i] = i;
    pairs.split(' ').forEach((pr) => {
      const [a, b] = pr.split('>');
      m[P[a]] = P[b];
    });
    return m;
  };
  const LIT = mapOf('K0>K1 K1>K2 K2>K3 K3>M0 M0>M1 M1>O0 O0>O1 O1>Y0 Y0>Y1 N0>N1 N1>N2 N2>N3 N3>N4 B0>B1 B1>B2 B2>B3 B3>G3 G0>G1 G1>G2 G2>G3 R0>R1 R1>R2 R2>O1 P0>P1 P1>G3 C0>C1 C1>G3 V0>V1 V1>V2 V2>Y1');
  const DRK = mapOf('K1>K0 K2>K1 K3>K2 M0>K3 M1>M0 O0>M1 O1>O0 Y0>O1 Y1>Y0 N0>K1 N1>N0 N2>N1 N3>N2 N4>N3 B0>K1 B1>B0 B2>B1 B3>B2 G0>K2 G1>G0 G2>G1 G3>G2 R0>K1 R1>R0 R2>R1 P0>M0 P1>P0 C0>B1 C1>C0 V0>K1 V1>V0 V2>V1');
  const PNK = mapOf('K0>K2 K1>K3 K2>M0 K3>M0 G0>M0 B0>K3 N0>M0 N1>M1 V0>K3 M0>M1');
  const CYN = mapOf('K0>B0 K1>B0 K2>B1 K3>B1 G0>B2 B0>B1 B1>B2 N0>B0 M0>G1');
  const WRM = mapOf('K0>N0 K1>N0 K2>N1 K3>M0 G0>N1 B0>K3 N0>N1 N1>N2 M0>M1 V0>N0');

  const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => (BY[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
  const cl = V.clamp;

  // ------------------------------------------------------------------ framebuffer ops (index buffers)
  const ps = (b, x, y, c) => {
    if (x < 0 || y < 0 || x >= PW || y >= PH) return;
    b[y * PW + x] = c;
  };
  const pg = (b, x, y) => (x < 0 || y < 0 || x >= PW || y >= PH ? -1 : b[y * PW + x]);
  const rf = (b, x, y, w, h, c) => {
    for (let j = Math.max(0, y); j < Math.min(PH, y + h); j++) for (let i = Math.max(0, x); i < Math.min(PW, x + w); i++) b[j * PW + i] = c;
  };
  const hl = (b, x0, x1, y, c) => { for (let x = x0; x <= x1; x++) ps(b, x, y, c); };
  const vl = (b, x, y0, y1, c) => { for (let y = y0; y <= y1; y++) ps(b, x, y, c); };
  const mapPx = (b, x, y, m) => {
    if (x < 0 || y < 0 || x >= PW || y >= PH) return;
    const i = y * PW + x;
    if (b[i] !== TR) b[i] = m[b[i]];
  };
  function ln(b, x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let n = 0; n < 2000; n++) {
      ps(b, x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  /** dithered ellipse of a colour-map (glow / shadow). lev(d 0..1) -> coverage 0..1 */
  function mapEll(b, cx, cy, rx, ry, m, lev) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) continue;
        if (bay(x, y) < lev(d)) mapPx(b, x, y, m);
      }
  }

  // ------------------------------------------------------------------ 5×7 bitmap font
  const F = {};
  const defs = {
    A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.', C: '.###.|#...#|#....|#....|#....|#...#|.###.',
    D: '####.|#...#|#...#|#...#|#...#|#...#|####.', E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
    G: '.###.|#...#|#....|#.###|#...#|#...#|.####', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#', I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.',
    J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..', K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
    M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#', O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
    P: '####.|#...#|#...#|####.|#....|#....|#....', Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
    S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..', U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
    V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..', W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
    0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.', 2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
    3: '#####|...#.|..#..|...#.|....#|#...#|.###.', 4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
    6: '..##.|.#...|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...', 8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
    9: '.###.|#...#|#...#|.####|....#|...#.|.##..', '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..', '.': '.....|.....|.....|.....|.....|.##..|.##..',
    ':': '.....|.##..|.##..|.....|.##..|.##..|.....', '-': '.....|.....|.....|.###.|.....|.....|.....', ' ': '.....|.....|.....|.....|.....|.....|.....',
    '?': '.###.|#...#|....#|...#.|..#..|.....|..#..', "'": '..#..|..#..|.#...|.....|.....|.....|.....',
  };
  Object.keys(defs).forEach((k) => (F[k] = defs[k].split('|')));

  const mcache = new Map();
  /** solid text mask. sc = pixel scale, bold = extra px to the right, slant = 1 px shear per `slant` rows */
  function tmask(str, sc = 1, bold = 0, slant = 0, gap = 1) {
    const key = ['t', str, sc, bold, slant, gap].join('|');
    if (mcache.has(key)) return mcache.get(key);
    const adv = 5 * sc + bold + gap * sc, h = 7 * sc, sl = slant ? Math.ceil(h / slant) : 0;
    const w = str.length * adv - gap * sc + sl;
    const m = new Uint8Array(w * h);
    for (let k = 0; k < str.length; k++) {
      const gl = F[str[k]] || F[' '];
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 5; c++)
          if (gl[r][c] === '#')
            for (let yy = 0; yy < sc; yy++)
              for (let xx = 0; xx < sc + bold; xx++) {
                const y = r * sc + yy, x = k * adv + c * sc + xx + (slant ? Math.floor((h - 1 - y) / slant) : 0);
                if (x >= 0 && x < w) m[y * w + x] = 1;
              }
    }
    const M = { w, h, m };
    mcache.set(key, M);
    return M;
  }
  /** 1-px tube skeleton of the 5×7 glyphs, scaled (neon signs) */
  function skel(str, sc, gap) {
    const key = ['s', str, sc, gap].join('|');
    if (mcache.has(key)) return mcache.get(key);
    const gw = 4 * sc + 1, adv = gw + gap, h = 6 * sc + 1, w = str.length * adv - gap;
    const m = new Uint8Array(w * h);
    const put = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) m[y * w + x] = 1; };
    for (let k = 0; k < str.length; k++) {
      const gl = F[str[k]] || F[' '];
      const on = (r, c) => r >= 0 && r < 7 && c >= 0 && c < 5 && gl[r][c] === '#';
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 5; c++) {
          if (!on(r, c)) continue;
          const x0 = k * adv + c * sc, y0 = r * sc;
          put(x0, y0);
          if (on(r, c + 1)) for (let i = 1; i <= sc; i++) put(x0 + i, y0);
          if (on(r + 1, c)) for (let i = 1; i <= sc; i++) put(x0, y0 + i);
          if (on(r + 1, c + 1) && !on(r, c + 1) && !on(r + 1, c)) for (let i = 1; i <= sc; i++) put(x0 + i, y0 + i);
          if (on(r + 1, c - 1) && !on(r, c - 1) && !on(r + 1, c)) for (let i = 1; i <= sc; i++) put(x0 - i, y0 + i);
        }
    }
    const M = { w, h, m };
    mcache.set(key, M);
    return M;
  }
  /** hand-pixelled 16×16 kanji for the ramen light-box (a rasterised 麵 at this size is just a blob) */
  const KANJI = {
    拉: [
      '...#............',
      '...#.......#....',
      '...#........#...',
      '...#............',
      '######.#########',
      '...#............',
      '...#.....#....#.',
      '...#.....#....#.',
      '...#.#....#..#..',
      '...##.....#..#..',
      '..##......#.#...',
      '###.......#.#...',
      '...#............',
      '...#...#########',
      '...#............',
      '.###............',
    ],
    麵: [
      '...#............',
      '#######.########',
      '...#.......#....',
      '##.#.##...#.....',
      '.#.#.#..........',
      '...#....########',
      '#######.#.#..#.#',
      '..#.#...#.#..#.#',
      '.#...#..#.####.#',
      '#.###.#.#.#..#.#',
      '..#..#..#.#..#.#',
      '.#.##...#.####.#',
      '...##...#.#..#.#',
      '..#..#..#.#..#.#',
      '.#....#.#.#..#.#',
      '#.......########',
    ],
  };
  const kanji = (ch) => {
    const key = 'k|' + ch;
    if (mcache.has(key)) return mcache.get(key);
    const rows = KANJI[ch], w = rows[0].length, h = rows.length, m = new Uint8Array(w * h);
    rows.forEach((r, j) => { for (let i = 0; i < w; i++) m[j * w + i] = r[i] === '#' ? 1 : 0; });
    const M = { w, h, m };
    mcache.set(key, M);
    return M;
  };
  const mHas = (M, i, j) => i >= 0 && j >= 0 && i < M.w && j < M.h && M.m[j * M.w + i] === 1;
  function mNear(M, i, j, r) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (mHas(M, i + dx, j + dy)) return true;
    return false;
  }
  /** draw a mask: o.fill (index | fn(row,h,col)), o.ol outline, o.sh shadow (+shx,shy) */
  function drawMask(b, M, x, y, o) {
    const { w, h } = M;
    if (o.sh != null) {
      const sx = o.shx == null ? 1 : o.shx, sy = o.shy == null ? 1 : o.shy;
      for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) if (o.ol != null ? mNear(M, i, j, 1) : mHas(M, i, j)) ps(b, x + i + sx, y + j + sy, o.sh);
    }
    if (o.ol != null) for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) if (!mHas(M, i, j) && mNear(M, i, j, 1)) ps(b, x + i, y + j, o.ol);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (mHas(M, i, j)) ps(b, x + i, y + j, typeof o.fill === 'function' ? o.fill(j, h, i) : o.fill);
  }
  function text(b, str, x, y, o = {}) {
    const M = tmask(str, o.sc || 1, o.bold || 0, o.slant || 0, o.gap == null ? 1 : o.gap);
    const X = o.align === 'c' ? x - (M.w >> 1) : o.align === 'r' ? x - M.w : x;
    drawMask(b, M, X, y, o);
    return M.w;
  }
  /** neon tube: halo (dithered colour map), glow ring, bright core. state: 0 off, 1 sputter, 2 on */
  function neon(b, M, x, y, st, c) {
    const { w, h } = M;
    if (st >= 2) {
      for (let j = -3; j < h + 3; j++)
        for (let i = -3; i < w + 3; i++) {
          if (mNear(M, i, j, 1)) continue;
          const d2 = mNear(M, i, j, 2), d3 = !d2 && mNear(M, i, j, 3);
          if ((d2 && bay(x + i, y + j) < 0.75) || (d3 && bay(x + i, y + j) < 0.3)) mapPx(b, x + i, y + j, c.halo);
        }
    }
    for (let j = -1; j <= h; j++)
      for (let i = -1; i <= w; i++) {
        if (mHas(M, i, j)) ps(b, x + i, y + j, st >= 1 ? c.core : c.off);
        else if (st >= 1 && mNear(M, i, j, 1)) ps(b, x + i, y + j, st >= 2 ? c.glow : c.dim);
      }
  }
  const NEON = {
    pink: { core: P.P1, glow: P.P0, dim: P.M0, off: P.K3, halo: PNK },
    cyan: { core: P.C1, glow: P.C0, dim: P.B1, off: P.G0, halo: CYN },
    gold: { core: P.Y1, glow: P.O1, dim: P.N1, off: P.N0, halo: WRM },
  };

  // ------------------------------------------------------------------ sky + static stage (baked once)
  const SKY = ['K1', 'K2', 'K3', 'M0', 'M1', 'O0', 'O1', 'Y0', 'Y1'].map((n) => P[n]);
  const SUN = { x: 196, y: 116, r: 21 };
  function skyV(x, y) {
    let v = 7.0 * Math.pow(cl(y / 150), 1.35);
    const dx = x - SUN.x, dy = (y - SUN.y) * 1.7, d2 = dx * dx + dy * dy;
    v += 1.7 * Math.exp(-d2 / (2 * 62 * 62)) * cl(y / 150 + 0.25);
    return v;
  }
  function band(v, x, y, soft = 0.2) {
    const f = Math.floor(v), q = cl((v - f - (0.5 - soft)) / (2 * soft));
    return cl(f + (q > bay(x, y) ? 1 : 0), 0, SKY.length - 1);
  }

  function bakeSky(b) {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) b[y * PW + x] = SKY[band(skyV(x, y), x, y)];
    // the sun: hot core, pale rim, a soft dithered corona
    for (let y = SUN.y - SUN.r - 6; y <= SUN.y + SUN.r + 6; y++)
      for (let x = SUN.x - SUN.r - 6; x <= SUN.x + SUN.r + 6; x++) {
        const d = Math.hypot(x + 0.5 - SUN.x, y + 0.5 - SUN.y);
        if (d < SUN.r - 1.2) ps(b, x, y, P.Y1);
        else if (d < SUN.r) ps(b, x, y, P.Y0);
        else if (d < SUN.r + 4 && bay(x, y) < 0.5 * (1 - (d - SUN.r) / 4)) ps(b, x, y, P.Y0);
      }
    // sunset cloud banks: clusters of puffs with flattened bottoms, dark violet bodies, undersides lit by the sun below the horizon
    const CL = [
      // cx, bottom, length, height, seed
      [44, 24, 190, 13, 1], [222, 15, 150, 8, 2], [352, 36, 150, 12, 3], [118, 54, 150, 9, 4], [268, 60, 120, 7, 5],
      [14, 78, 96, 6, 6], [186, 78, 104, 6, 7], [306, 86, 80, 5, 8], [136, 96, 78, 4, 9], [252, 101, 84, 4, 10],
      [198, 110, 92, 3, 11], [168, 124, 70, 2, 12],
    ];
    const cm = new Int16Array(PW * PH).fill(-1);
    CL.forEach(([cx, yb, len, hh, sd], ci) => {
      const r = V.rng(500 + sd * 31);
      const n = Math.max(3, Math.round(len / 13));
      for (let k = 0; k < n; k++) {
        const tt = (k + 0.5) / n;
        const px = cx - len / 2 + tt * len + (r() - 0.5) * 8;
        const env = 1 - Math.pow(Math.abs(2 * tt - 1), 2) * 0.65;
        const ry = Math.max(1.4, hh * env * (0.6 + 0.4 * r()));
        const rx = ry * (1.8 + r() * 1.2);
        const py = yb - ry * (0.3 + 0.2 * r());
        for (let y = Math.floor(py - ry); y <= yb; y++)
          for (let x = Math.floor(px - rx); x <= Math.ceil(px + rx); x++) {
            if (x < 0 || x >= PW || y < 0) continue;
            const dx = (x + 0.5 - px) / rx, dy = (y + 0.5 - py) / ry;
            if (dx * dx + dy * dy <= 1) cm[y * PW + x] = ci;
          }
      }
    });
    for (let y = 0; y < PH; y++)
      for (let x = 0; x < PW; x++) {
        const ci = cm[y * PW + x];
        if (ci < 0) continue;
        let db = 0, dt = 0;
        while (y + db + 1 < PH && cm[(y + db + 1) * PW + x] === ci && db < 4) db++;
        while (y - dt - 1 >= 0 && cm[(y - dt - 1) * PW + x] === ci && dt < 4) dt++;
        const yb = CL[ci][1];
        const vi = Math.round(skyV(x, yb + 2));
        const near = Math.abs(x - SUN.x) < 60 ? 1 : 0;
        // high clouds glow (lighter than the dark zenith), low clouds go dark against the bright horizon
        const hi = vi <= 3;
        const body = hi ? SKY[cl(vi + 1, 0, 8)] : SKY[cl(vi - 2, 0, 8)];
        const rim = hi ? SKY[cl(vi, 0, 8)] : SKY[cl(vi - 1, 0, 8)];
        const lit = SKY[cl(vi + (hi ? 3 : 2) + near, 0, 8)], lit2 = SKY[cl(vi + (hi ? 2 : 1), 0, 8)];
        // clean bands (16-bit artists dithered skies, not cloud edges): lit lip, warm band, dark body, faint top rim
        let c = body;
        if (db === 0) c = lit;
        else if (db === 1) c = lit2;
        else if (db === 2 && near) c = bay(x, y) < 0.5 ? lit2 : body;
        else if (dt === 0 && db > 2) c = rim;
        b[y * PW + x] = c;
      }
  }

  function bakeTower(b, cx) {
    const col = P.K2, base = 150, deck = 104;
    const hw = (y) => (y >= deck ? 3 + 9 * Math.pow((y - deck) / (base - deck), 1.7) : 3 - 2 * ((deck - y) / 20));
    for (let y = deck - 20; y <= base; y++) {
      const w = hw(y);
      ps(b, Math.round(cx - w), y, col);
      ps(b, Math.round(cx + w), y, col);
    }
    for (let y0 = deck; y0 < base; y0 += 7) {
      const y1 = Math.min(base, y0 + 7);
      ln(b, Math.round(cx - hw(y0)), y0, Math.round(cx + hw(y1)), y1, col);
      ln(b, Math.round(cx + hw(y0)), y0, Math.round(cx - hw(y1)), y1, col);
      hl(b, Math.round(cx - hw(y0)), Math.round(cx + hw(y0)), y0, col);
    }
    for (let y0 = deck - 20; y0 < deck; y0 += 5) { ln(b, cx - 2, y0, cx + 2, y0 + 5, col); ln(b, cx + 2, y0, cx - 2, y0 + 5, col); }
    rf(b, cx - 6, deck - 3, 13, 4, col);
    hl(b, cx - 6, cx + 6, deck - 4, P.K3);
    for (let x = cx - 5; x <= cx + 5; x += 2) ps(b, x, deck - 2, P.O1);
    rf(b, cx - 3, deck - 23, 7, 3, col);
    vl(b, cx, deck - 44, deck - 23, col);
    vl(b, cx - 1, deck - 34, deck - 23, col);
  }

  function skyline(b, seed, yBase, hMin, hMax, body, rim, win, pLit, avoid) {
    const r = V.rng(seed);
    const m = new Uint8Array(PW * PH);
    const wins = [];
    let x = -6;
    while (x < PW) {
      const w = 9 + Math.floor(r() * 17);
      let h = hMin + Math.floor(r() * (hMax - hMin));
      const cx = x + w / 2;
      if (avoid && Math.abs(cx - avoid.x) < avoid.r) h = Math.min(h, avoid.h + Math.floor(r() * 4));
      const top = yBase - h;
      const mark = (xx, yy) => { if (xx >= 0 && yy >= 0 && xx < PW && yy < PH) m[yy * PW + xx] = 1; };
      for (let yy = top; yy < PH; yy++) for (let xx = x; xx < x + w; xx++) mark(xx, yy);
      const k = r();
      if (k < 0.22) { const ax = x + 2 + Math.floor(r() * (w - 4)); const ah = 4 + Math.floor(r() * 9); for (let i = 1; i <= ah; i++) mark(ax, top - i); }
      else if (k < 0.45) { for (let yy = top - 3; yy < top; yy++) for (let xx = x + 2; xx < x + w - 2; xx++) mark(xx, yy); }
      else if (k < 0.58) { const tx = x + 2 + Math.floor(r() * Math.max(1, w - 8)); for (let yy = top - 6; yy < top - 1; yy++) for (let xx = tx; xx < tx + 5; xx++) mark(xx, yy); mark(tx, top - 1); mark(tx + 4, top - 1); for (let xx = tx + 1; xx < tx + 4; xx++) mark(xx, top - 7); }
      for (let yy = top + 3; yy < yBase + 6; yy += 3)
        for (let xx = x + 2; xx < x + w - 2; xx += 2 + (w > 16 ? 1 : 0)) {
          const q = r();
          if (q < pLit) wins.push([xx, yy, q < pLit * 0.3 ? 1 : 0, Math.floor(r() * 1000)]);
        }
      x += w + (r() < 0.25 ? 1 : 0);
    }
    for (let y = 0; y < PH; y++)
      for (let x2 = 0; x2 < PW; x2++) {
        if (!m[y * PW + x2]) continue;
        const up = y > 0 ? m[(y - 1) * PW + x2] : 0;
        b[y * PW + x2] = up ? body : rim;
      }
    wins.forEach(([wx, wy, dim]) => ps(b, wx, wy, dim ? win[1] : win[0]));
    return wins;
  }

  function brick(b, x0, y0, x1, y1, base, hi, mortar, seed) {
    const r = V.rng(seed);
    for (let y = y0; y <= y1; y++) {
      const row = Math.floor((y - y0) / 3), off = (row & 1) * 4;
      for (let x = x0; x <= x1; x++) {
        const yy = (y - y0) % 3, bx = Math.floor((x + off) / 8);
        let c = base;
        if (yy === 2 || (x + off) % 8 === 7) c = mortar;
        else if (V.hash(bx * 13.1 + row * 7.7 + seed) < 0.18) c = hi;
        ps(b, x, y, c);
      }
    }
    return r;
  }

  function windowBox(b, x, y, w, h, kind) {
    rf(b, x - 1, y - 1, w + 2, h + 2, P.K0);
    rf(b, x, y, w, h, P.G0);
    const ix = x + 1, iy = y + 1, iw = w - 2, ih = h - 2;
    for (let j = 0; j < ih; j++)
      for (let i = 0; i < iw; i++) {
        let c;
        if (kind === 'lit') c = j < ih * 0.45 ? (bay(ix + i, iy + j) < 0.5 ? P.Y0 : P.O1) : P.O1;
        else if (kind === 'dim') c = j % 3 === 2 ? P.M0 : P.M1;
        else c = (i + j) % 9 < 2 ? P.B0 : P.K0;
        ps(b, ix + i, iy + j, c);
      }
    if (kind === 'lit') {
      // somebody at the window, also doing it
      const px = ix + Math.floor(iw * 0.55);
      rf(b, px - 1, iy + ih - 7, 3, 3, P.K3);
      rf(b, px - 3, iy + ih - 4, 7, 4, P.K3);
      ps(b, px - 4, iy + ih - 5, P.K3); ps(b, px + 4, iy + ih - 6, P.K3);
    }
    vl(b, x + (w >> 1), y, y + h - 1, P.K0);
    hl(b, x, x + w - 1, y + (h >> 1), P.K0);
    hl(b, x - 2, x + w + 1, y + h + 1, P.G1);
    hl(b, x - 2, x + w + 1, y + h + 2, P.K0);
  }

  function bakeLeftBuilding(b) {
    const X1 = 93, TOP = 63;
    // rooftop water tank (silhouette, sun rim on its right)
    const tx = 20, ty = TOP - 22;
    for (let y = ty; y < TOP - 5; y++) for (let x = tx; x < tx + 17; x++) ps(b, x, y, (x - tx) % 4 === 3 ? P.K0 : P.K1);
    hl(b, tx, tx + 16, ty + 4, P.K0); hl(b, tx, tx + 16, ty + 11, P.K0);
    for (let k = 0; k < 7; k++) hl(b, tx + k, tx + 16 - k, ty - 1 - k, P.K1);
    for (let k = 0; k < 7; k++) ps(b, tx + 16 - k, ty - 1 - k, P.M0);
    vl(b, tx + 16, ty, TOP - 6, P.M0);
    for (let y = TOP - 5; y < TOP; y++) { ps(b, tx + 1, y, P.K0); ps(b, tx + 15, y, P.K0); ps(b, tx + 8, y, P.K0); }
    ln(b, tx + 1, TOP - 1, tx + 8, TOP - 5, P.K0); ln(b, tx + 15, TOP - 1, tx + 8, TOP - 5, P.K0);
    // AC unit + pipe on the roof
    rf(b, 52, TOP - 6, 12, 6, P.K1); hl(b, 52, 63, TOP - 6, P.K3); for (let x = 54; x < 62; x += 2) vl(b, x, TOP - 4, TOP - 2, P.K0);
    vl(b, 74, TOP - 12, TOP, P.K1); hl(b, 72, 76, TOP - 12, P.K1);
    // facade
    brick(b, 0, TOP + 4, X1, 170, P.K1, P.K2, P.K0, 11);
    // cornice
    rf(b, 0, TOP, X1 + 2, 4, P.K2);
    hl(b, 0, X1 + 2, TOP, P.M0);
    hl(b, 0, X1 + 2, TOP + 1, P.K3);
    hl(b, 0, X1 + 2, TOP + 4, P.K0);
    for (let x = 2; x < X1; x += 6) ps(b, x, TOP + 3, P.K0);
    // corner rim (lit by the sky)
    vl(b, X1, TOP + 4, 170, P.K3);
    vl(b, X1 + 1, TOP + 1, 170, P.K0);
    // windows
    windowBox(b, 7, 71, 16, 15, 'lit');
    windowBox(b, 31, 71, 16, 15, 'dark');
    windowBox(b, 55, 71, 16, 15, 'dim');
    // AC box under the dark window
    rf(b, 33, 89, 12, 6, P.G0); hl(b, 33, 44, 89, P.G1); for (let x = 34; x < 44; x += 2) vl(b, x, 91, 93, P.K1); hl(b, 33, 44, 95, P.K0);
    // drain pipe
    vl(b, 2, TOP + 4, 170, P.G0); vl(b, 3, TOP + 4, 170, P.K0);
    for (let y = TOP + 10; y < 170; y += 14) hl(b, 1, 3, y, P.G1);
    // "SIX" sign board
    rf(b, 13, 98, 44, 18, P.K0);
    for (let x = 13; x < 57; x++) { ps(b, x, 98, P.G0); ps(b, x, 115, P.G0); }
    vl(b, 13, 98, 115, P.G0); vl(b, 56, 98, 115, P.G0);
    // awning (striped, scalloped)
    const AY = 120;
    for (let x = 0; x <= 80; x++) {
      const s = Math.floor(x / 6) & 1, xi = x % 6;
      const scal = xi === 0 || xi === 5 ? 1 : 0;
      for (let y = AY; y <= AY + 9 - scal; y++) {
        const k = y - AY;
        let c = s ? (k < 2 ? P.G3 : k < 7 ? P.G2 : P.G1) : k < 2 ? P.R2 : k < 7 ? P.R1 : P.R0;
        ps(b, x, y, c);
      }
      ps(b, x, AY + 10 - scal, P.K0);
    }
    hl(b, 0, 80, AY - 1, P.K0);
    // shop front under the awning: warm glow, noren curtain at the door
    for (let y = AY + 10; y < 170; y++)
      for (let x = 0; x <= 80; x++) {
        const c = y < AY + 13 ? P.K0 : bay(x, y) < 0.35 + (y - AY) * 0.01 ? P.O1 : P.Y0;
        ps(b, x, y, c);
      }
    for (let x = 0; x <= 80; x += 20) vl(b, x, AY + 10, 170, P.K0);
    for (let k = 0; k < 3; k++) {
      const nx = 34 + k * 7;
      rf(b, nx, AY + 13, 6, 14, P.B1);
      vl(b, nx, AY + 13, AY + 26, P.B0);
      hl(b, nx, nx + 5, AY + 13, P.B2);
      ps(b, nx + 3, AY + 18, P.G3); ps(b, nx + 2, AY + 19, P.G3); ps(b, nx + 3, AY + 20, P.G3);
    }
    // ramen shop interior: menu tags, bowl shelf, counter
    for (let k = 0; k < 7; k++) {
      const mx = 57 + k * 3;
      rf(b, mx, AY + 13, 2, 9, P.G3);
      ps(b, mx, AY + 15, P.K0); ps(b, mx + 1, AY + 17, P.K1); ps(b, mx, AY + 19, P.R1);
    }
    hl(b, 2, 28, AY + 17, P.N0);
    for (let x = 3; x < 28; x += 4) { hl(b, x, x + 2, AY + 16, P.G2); ps(b, x + 1, AY + 15, P.R1); }
    for (const [x0, x1] of [[0, 32], [56, 80]]) {
      rf(b, x0, AY + 22, x1 - x0 + 1, 8, P.N1);
      hl(b, x0, x1, AY + 22, P.N3);
      hl(b, x0, x1, AY + 23, P.N2);
      for (let x = x0 + 3; x < x1 - 3; x += 9) rf(b, x, AY + 25, 4, 2, P.N0);
    }
  }
  /** the ramen chef behind the counter — doing it too */
  function chef(b, fr) {
    const a = [1, 0, -1, 0][fr];
    const x = 15, y = 128;
    rf(b, x - 2, y - 3, 5, 3, P.G3); hl(b, x - 3, x + 3, y - 1, P.G2); hl(b, x - 2, x + 2, y - 4, P.G2);
    rf(b, x - 2, y, 5, 4, P.N2); ps(b, x - 1, y + 1, P.K0); ps(b, x + 1, y + 1, P.K0); hl(b, x - 1, x + 1, y + 3, P.N1);
    rf(b, x - 4, y + 5, 9, 9, P.G3); vl(b, x + 3, y + 5, y + 13, P.G2); vl(b, x + 4, y + 5, y + 13, P.G1);
    for (const d of [-1, 1]) {
      const ah = d < 0 ? a : -a;
      vl(b, x + d * 5, y + 5, y + 8, P.G2);
      ps(b, x + d * 6, y + 9 - ah, P.N2); ps(b, x + d * 7, y + 9 - 2 * ah, P.N2); ps(b, x + d * 8, y + 9 - 2 * ah, P.N3);
    }
  }

  function bakeRightBuilding(b) {
    const X0 = 296, TOP = 44;
    brick(b, X0, TOP + 4, PW - 1, 170, P.K1, P.K2, P.K0, 23);
    rf(b, X0 - 2, TOP, PW - X0 + 2, 4, P.K2);
    hl(b, X0 - 2, PW - 1, TOP, P.M0);
    hl(b, X0 - 2, PW - 1, TOP + 1, P.K3);
    hl(b, X0 - 2, PW - 1, TOP + 4, P.K0);
    for (let x = X0; x < PW; x += 6) ps(b, x, TOP + 3, P.K0);
    vl(b, X0, TOP + 4, 170, P.K3);
    vl(b, X0 - 1, TOP + 1, 170, P.K0);
    // billboard structure
    for (const px of [306, 366]) { vl(b, px, 34, TOP - 1, P.K0); vl(b, px + 1, 34, TOP - 1, P.K1); }
    ln(b, 306, TOP - 1, 366, 35, P.K1);
    ln(b, 306, 35, 366, TOP - 1, P.K1);
    rf(b, 298, 7, 82, 28, P.K0);
    rf(b, 300, 9, 78, 24, P.K1);
    for (let y = 10; y < 32; y += 2) hl(b, 301, 376, y, P.K0);
    hl(b, 298, 379, 6, P.K3);
    // windows
    windowBox(b, 303, 52, 14, 13, 'dark');
    windowBox(b, 328, 52, 14, 13, 'lit');
    windowBox(b, 353, 52, 14, 13, 'dark');
    windowBox(b, 375, 52, 14, 13, 'dim');
    // SEVEN board
    rf(b, 303, 74, 76, 20, P.K0);
    hl(b, 303, 378, 74, P.G0); hl(b, 303, 378, 93, P.G0); vl(b, 303, 74, 93, P.G0); vl(b, 378, 74, 93, P.G0);
    windowBox(b, 305, 100, 14, 12, 'dim');
    windowBox(b, 330, 100, 14, 12, 'dark');
    windowBox(b, 355, 100, 14, 12, 'lit');
    // shop: "67 MART" fascia, half-open shutter, a vending machine
    rf(b, X0 + 1, 120, PW - X0, 9, P.B1);
    hl(b, X0 + 1, PW - 1, 120, P.B2); hl(b, X0 + 1, PW - 1, 128, P.B0);
    text(b, '67 MART', 340, 121, { fill: P.Y1, align: 'c' });
    for (let y = 129; y < 170; y++)
      for (let x = X0 + 1; x < PW; x++) {
        let c = (y - 129) % 3 === 2 ? P.K0 : y < 140 ? P.G0 : P.K1;
        if (y >= 140 && x > 300 && x < 344) c = bay(x, y) < 0.4 ? P.O1 : P.Y0;
        ps(b, x, y, c);
      }
    hl(b, 301, 343, 140, P.K0);
    // store shelves full of product
    const pr = V.rng(67);
    for (const sy of [148, 156, 164]) {
      hl(b, 302, 342, sy, P.G0);
      hl(b, 302, 342, sy + 1, P.K1);
      for (let x = 303; x < 342; x += 2) {
        const c = [P.R1, P.Y0, P.B2, P.V2, P.P0, P.G3, P.O0][Math.floor(pr() * 7)];
        const h = 2 + Math.floor(pr() * 3);
        for (let k = 1; k <= h; k++) ps(b, x, sy - k, k === h ? LIT[c] : c);
      }
    }
    // vending machine
    rf(b, 350, 134, 18, 36, P.K0);
    rf(b, 351, 135, 16, 34, P.C0);
    rf(b, 353, 137, 12, 12, P.C1);
    for (let k = 0; k < 4; k++) { rf(b, 354 + k * 3, 139, 2, 4, [P.R1, P.Y0, P.B1, P.V2][k]); rf(b, 354 + k * 3, 144, 2, 4, [P.P0, P.G3, P.O0, P.R1][k]); }
    rf(b, 353, 151, 12, 3, P.B1);
    rf(b, 354, 160, 10, 4, P.K0);
    vl(b, 351, 135, 168, P.C1);
  }

  function bakeLamp(b, lx, gy) {
    vl(b, lx, 78, gy, P.K0); vl(b, lx + 1, 78, gy, P.G0); vl(b, lx + 2, 78, gy, P.K0);
    ln(b, lx + 1, 78, lx - 4, 73, P.K0); ln(b, lx, 78, lx - 5, 73, P.G0);
    hl(b, lx - 13, lx - 4, 72, P.K0); hl(b, lx - 12, lx - 5, 73, P.G0); hl(b, lx - 13, lx - 4, 74, P.K0);
    hl(b, lx - 11, lx - 6, 75, P.Y1); hl(b, lx - 10, lx - 7, 76, P.Y1);
    rf(b, lx - 1, gy - 6, 5, 6, P.K0); hl(b, lx - 1, lx + 3, gy - 6, P.G0);
  }

  function bakeBG() {
    const b = new Uint8Array(PW * PH);
    bakeSky(b);
    skyline(b, 41, 150, 22, 50, P.K3, P.M0, [P.O0, P.M1], 0.18, { x: SUN.x, r: 26, h: 18 });
    bakeTower(b, 154);
    const wins = skyline(b, 77, 156, 10, 32, P.K2, P.K3, [P.Y0, P.O1], 0.3, { x: SUN.x, r: 18, h: 13 });
    bakeLeftBuilding(b);
    bakeRightBuilding(b);
    bakeLamp(b, 290, 166);
    // lamp light on the right facade
    mapEll(b, 281, 80, 16, 12, LIT, (d) => 0.55 * (1 - d));
    return { b, wins };
  }

  // MID layer (in front of the crowd): ad boards, pavement, brick street, props
  function bakeMID() {
    const m = new Uint8Array(PW * PH).fill(TR);
    // advertising boards along the barrier
    const ADS = [
      [P.R1, P.G3, 'SIX'], [P.G3, P.R1, '67'], [P.B1, P.Y0, 'SEVEN'], [P.Y0, P.K0, '6 7'], [P.K0, P.C0, 'SIX'], [P.G3, P.B1, 'SEVEN'], [P.R1, P.Y1, '67'], [P.B1, P.G3, 'SIX'],
    ];
    const BY0 = 149, BH = 13;
    for (let k = 0; k < ADS.length; k++) {
      const x0 = 58 + k * 30, [bg, fg, s] = ADS[k];
      rf(m, x0, BY0, 29, BH, bg);
      hl(m, x0, x0 + 28, BY0, LIT[bg] === bg ? P.G3 : LIT[bg]);
      hl(m, x0, x0 + 28, BY0 + BH - 1, DRK[bg]);
      text(m, s, x0 + 15, BY0 + 3, { fill: fg, align: 'c' });
      vl(m, x0 + 29, BY0 - 1, BY0 + BH, P.K0);
      vl(m, x0 - 1, BY0 - 1, BY0 + BH, P.K0);
      hl(m, x0 - 1, x0 + 29, BY0 - 1, P.K0);
    }
    // pavement + curb
    for (let y = 162; y <= 170; y++)
      for (let x = 0; x < PW; x++) {
        let c = P.K3;
        if (y === 162) c = P.K1;
        else if (y === 163) c = P.K2;
        else if (y === 168) c = P.G1;
        else if (y >= 169) c = P.K2;
        else if ((x + (y > 165 ? 10 : 0)) % 22 === 0) c = P.K2;
        else if (V.hash(x * 3.1 + y * 17.3) < 0.08) c = P.M0;
        ps(m, x, y, c);
      }
    hl(m, 0, PW - 1, 171, P.K0);
    // perspective brick street, the wet bricks catch the sunset
    const rows = [[172, 4], [176, 4], [180, 5], [185, 5], [190, 6], [196, 6], [202, 7], [209, 7]];
    rows.forEach(([y0, h], ri) => {
      const s = h / 4, bw = 15 * s;
      const off = (ri & 1) * 0.5;
      for (let y = y0; y < y0 + h && y < PH; y++)
        for (let x = 0; x < PW; x++) {
          const u = (x + 0.5 - 192) / bw + off, k = Math.floor(u), fu = u - k;
          const jx = fu * bw < 1;
          const yy = y - y0;
          let c;
          if (yy === 0 || jx) c = P.K1;
          else {
            const dk = Math.abs(x - SUN.x);
            const hi = dk < 34 ? P.O0 : dk < 80 ? P.M1 : P.M0;
            const r = V.hash(k * 7.3 + ri * 31.7);
            c = yy === 1 ? hi : r < 0.25 ? P.K2 : P.K3;
            if (yy === 1 && r < 0.2) c = P.M0;
            if (yy === h - 1) c = P.K2;
          }
          ps(m, x, y, c);
        }
    });
    // oil drum
    const dx0 = 5, dy0 = 168, dw = 20, dh = 30;
    for (let y = dy0; y < dy0 + dh; y++)
      for (let x = dx0; x < dx0 + dw; x++) {
        const i = x - dx0;
        let c = i < 3 ? P.B0 : i < 7 ? P.B2 : i < 9 ? P.B3 : i < 15 ? P.B1 : P.B0;
        if (y - dy0 === 7 || y - dy0 === 20) c = i < 9 && i > 2 ? P.G1 : P.K0;
        if (V.noise2(x * 0.5, y * 0.4) > 0.68) c = i < 9 ? P.N1 : P.N0;
        ps(m, x, y, c);
      }
    for (let x = dx0; x < dx0 + dw; x++) { ps(m, x, dy0 - 1, P.G1); ps(m, x, dy0 - 2, P.K0); ps(m, x, dy0 + dh, P.K0); }
    vl(m, dx0 - 1, dy0 - 1, dy0 + dh - 1, P.K0); vl(m, dx0 + dw, dy0 - 1, dy0 + dh - 1, P.K0);
    // wooden crates
    crate(m, 27, 172, 32, 26, true);
    crate(m, 31, 150, 24, 21, false);
    return m;
  }
  function crate(m, x0, y0, w, h, stencil) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const i = x - x0, j = y - y0;
        let c = (j % 5 === 0) ? P.N2 : j % 5 === 4 ? P.N0 : P.N1;
        if (i < 2 || i >= w - 2 || j < 2 || j >= h - 2) c = (i === 0 || j === 0) ? P.N3 : P.N2;
        ps(m, x, y, c);
      }
    ln(m, x0 + 2, y0 + 2, x0 + w - 3, y0 + h - 3, P.N2);
    ln(m, x0 + 2, y0 + 3, x0 + w - 3, y0 + h - 2, P.N0);
    if (stencil) text(m, '67', x0 + (w >> 1) + 5, y0 + (h >> 1) - 3, { fill: P.N0, align: 'c' });
    for (const [a, c] of [[x0 + 1, y0 + 1], [x0 + w - 2, y0 + 1], [x0 + 1, y0 + h - 2], [x0 + w - 2, y0 + h - 2]]) ps(m, a, c, P.G2);
    hl(m, x0, x0 + w - 1, y0 - 1, P.K0); hl(m, x0, x0 + w - 1, y0 + h, P.K0); vl(m, x0 - 1, y0, y0 + h - 1, P.K0); vl(m, x0 + w, y0, y0 + h - 1, P.K0);
    // top face
    for (let k = 1; k <= 3; k++) hl(m, x0 + k, x0 + w - 1 - k + 2, y0 - 1 - k, k === 3 ? P.K0 : P.N3);
  }

  // ------------------------------------------------------------------ sprite modelling
  const L3 = (() => { const v = [-0.5, -0.66, 0.56], n = Math.hypot(...v); return v.map((x) => x / n); })();
  const TH = { 2: [0.32], 3: [0.12, 0.62], 4: [-0.02, 0.42, 0.8], 5: [-0.2, 0.15, 0.48, 0.8] };
  const shade = (ramp, s) => {
    const T = TH[ramp.length];
    let i = 0;
    while (i < ramp.length - 1 && s > T[i]) i++;
    return ramp[i];
  };
  function Spr(w, h, ox, oy) {
    this.w = w; this.h = h; this.ox = ox; this.oy = oy;
    this.c = new Int16Array(w * h).fill(-1);
    this.g = new Int16Array(w * h).fill(-1);
    this.z = new Float32Array(w * h).fill(-1e9);
    this.ln = new Uint8Array(w * h);
  }
  function rast(S, x0, y0, x1, y1, fn, o) {
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const r = fn(x + 0.5, y + 0.5);
        if (!r) continue;
        const bx = x + S.ox, by = y + S.oy;
        if (bx < 0 || by < 0 || bx >= S.w || by >= S.h) continue;
        const i = by * S.w + bx;
        if (o.z < S.z[i]) continue;
        let nx = r[0], ny = r[1];
        const l = nx * nx + ny * ny;
        if (l > 0.985) { const k = Math.sqrt(0.985 / l); nx *= k; ny *= k; }
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const s = nx * L3[0] + ny * L3[1] + nz * L3[2] + (o.bias || 0);
        S.c[i] = o.col != null ? o.col : shade(o.ramp, s);
        S.g[i] = o.g; S.z[i] = o.z; S.ln[i] = o.line === false ? 0 : 1;
      }
  }
  function cap(S, a, b2, ra, rb, o) {
    const ax = a[0], ay = a[1], bx = b2[0], by = b2[1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-6, r = Math.max(ra, rb);
    rast(S, Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.max(ax, bx) + r, Math.max(ay, by) + r, (x, y) => {
      const t = cl(((x - ax) * dx + (y - ay) * dy) / L2);
      const cx = ax + dx * t, cy = ay + dy * t, rr = ra + (rb - ra) * t;
      const ex = x - cx, ey = y - cy;
      if (ex * ex + ey * ey > rr * rr) return null;
      return [ex / rr, ey / rr];
    }, o);
  }
  function ell(S, cx, cy, rx, ry, o) {
    rast(S, cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => {
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      if (nx * nx + ny * ny > 1) return null;
      return o.nf ? o.nf(x, y) : [nx, ny];
    }, o);
  }
  function inPoly(pts, x, y) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function poly(S, pts, o) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 + 0.5, ry = (y1 - y0) / 2 + 0.5;
    rast(S, x0, y0, x1, y1, (x, y) => (inPoly(pts, x, y) ? (o.nf ? o.nf(x, y) : [(x - cx) / rx, (y - cy) / ry * 0.6]) : null), o);
  }
  /** set a decal pixel (only on an already painted pixel unless force) */
  function dp(S, x, y, c, force) {
    const bx = Math.floor(x) + S.ox, by = Math.floor(y) + S.oy;
    if (bx < 0 || by < 0 || bx >= S.w || by >= S.h) return;
    const i = by * S.w + bx;
    if (S.c[i] < 0 && !force) return;
    S.c[i] = c;
  }
  const dpg = (S, x, y, c, g) => {
    const bx = Math.floor(x) + S.ox, by = Math.floor(y) + S.oy;
    if (bx < 0 || by < 0 || bx >= S.w || by >= S.h) return;
    const i = by * S.w + bx;
    if (S.g[i] === g) S.c[i] = c;
  };
  function dline(S, x0, y0, x1, y1, c, g) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n;
      if (g == null) dp(S, x, y, c); else dpg(S, x, y, c, g);
    }
  }
  /** stamp a character map (rows of chars) with origin (x,y); dir = +1/-1 mirrors; map char->index */
  function stamp(S, x, y, rows, map, dir, o) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || map[ch] == null) continue;
        const px = Math.floor(x) + (dir > 0 ? i : -i), py = Math.floor(y) + j;
        const bx = px + S.ox, by = py + S.oy;
        if (bx < 0 || by < 0 || bx >= S.w || by >= S.h) continue;
        const k = by * S.w + bx;
        if (o.z < S.z[k]) continue;
        S.c[k] = map[ch]; S.g[k] = o.g; S.z[k] = o.z; S.ln[k] = 1;
      }
    });
  }
  /** sprite-rip finish: hard black silhouette outline + inner contour lines where a front part overlaps a back one */
  function outline(S) {
    const { w, h, c, g, z, ln: L } = S;
    const out = c.slice();
    const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (c[i] < 0) {
          for (const [dx, dy] of N) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            if (c[yy * w + xx] >= 0) { out[i] = P.K0; break; }
          }
        } else {
          for (const [dx, dy] of N) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const j = yy * w + xx;
            if (c[j] >= 0 && g[j] !== g[i] && z[j] > z[i] + 0.01 && L[j]) { out[i] = P.K0; break; }
          }
        }
      }
    S.c = out;
  }
  function blitSpr(b, S, X, Y, flip) {
    for (let y = 0; y < S.h; y++)
      for (let x = 0; x < S.w; x++) {
        const c = S.c[y * S.w + x];
        if (c < 0) continue;
        const lx = x - S.ox, ly = y - S.oy;
        ps(b, flip ? X - lx - 1 : X + lx, Y + ly, c);
      }
  }

  const SKIN = [P.N1, P.N2, P.N3, P.N4];
  const GI = [P.G0, P.G1, P.G2, P.G3];
  const RED = [P.R0, P.R1, P.R2];
  const HAIR = [P.K1, P.N0, P.N1];
  const BLK = [P.K0, P.K1, P.K2];
  const TANK = [P.B0, P.B1, P.B2, P.B3];
  const BLOND = [P.N1, P.O1, P.Y0, P.Y1];
  const CAMO = [P.V0, P.V1, P.V2];
  const HANDMAP = { 1: P.N1, 2: P.N2, 3: P.N3, 4: P.N4, k: P.K0 };
  // palm-up open hand, pointing +x from the wrist (row 0 = wrist row - 3)
  const HAND = [
    '...33....',
    '..3443...',
    '.234443.3',
    '1234443343',
    '1222333332',
    '.11222221.',
    '..1111....',
  ];
  function arm(S, sh, el, wr, dir, z, g, o) {
    const bias = o.bias || 0, R = o.R || 1;
    ell(S, sh[0] - dir * 0.6, sh[1] + 1.2, 5.3 * R, 5 * R, { ramp: SKIN, z, g, bias: bias + 0.05 });
    cap(S, sh, el, 4.5 * R, 3.6 * R, { ramp: SKIN, z, g, bias });
    const mx = (sh[0] + el[0]) / 2, my = (sh[1] + el[1]) / 2;
    ell(S, mx - dir * 1.4, my + 0.5, 3.3 * R, 5 * R, { ramp: SKIN, z: z + 0.02, g, bias: bias + 0.06 });
    ell(S, mx + dir * 1.2, my - 0.5, 2.6 * R, 4.4 * R, { ramp: SKIN, z: z + 0.01, g, bias: bias - 0.05 });
    const fx = el[0] + (wr[0] - el[0]) * 0.3, fy = el[1] + (wr[1] - el[1]) * 0.3;
    cap(S, el, wr, 3.8 * R, 2.7 * R, { ramp: SKIN, z: z + 0.03, g, bias });
    ell(S, fx, fy - 0.3, 3.7 * R, 3.4 * R, { ramp: SKIN, z: z + 0.04, g, bias: bias + 0.04 });
    if (o.wrap) cap(S, [wr[0] - dir * 2.2, wr[1]], [wr[0] - dir * 0.2, wr[1]], 2.9 * R, 2.8 * R, { ramp: o.wrap, z: z + 0.05, g: g + 50, bias });
    stamp(S, wr[0] + dir * 0.5, wr[1] - 3.5, HAND, HANDMAP, dir, { z: z + 0.06, g });
  }
  /** the 'six-seven' pose → hand offsets: hn = sprite -x hand (px up), hp = sprite +x hand */
  function poseOf(fr) { return [[8, -8], [1, -1], [-8, 8], [-1, 1]][fr]; }

  // P1 — white gi, red headband, bare feet. Built facing +x.
  function buildP1(hn, hp, s, fl) {
    const S = new Spr(112, 118, 56, 110);
    const hipB = [-7, -43 + s], hipF = [6, -43 + s], ankB = [-20, -6], ankF = [18, -6];
    const kB = V.ik(hipB[0], hipB[1], ankB[0], ankB[1], 22, 22.5, 1), kF = V.ik(hipF[0], hipF[1], ankF[0], ankF[1], 22, 22.5, -1);
    // bare feet
    poly(S, [[ankB[0] + 3, ankB[1] - 1], [ankB[0] - 3, ankB[1] - 1], [ankB[0] - 10, ankB[1] + 5.5], [ankB[0] + 4, ankB[1] + 5.5]], { ramp: SKIN, z: 0.5, g: 17 });
    poly(S, [[ankF[0] - 3, ankF[1] - 1], [ankF[0] + 3, ankF[1] - 1], [ankF[0] + 10, ankF[1] + 5.5], [ankF[0] - 4, ankF[1] + 5.5]], { ramp: SKIN, z: 0.6, g: 18 });
    // baggy gi trousers
    cap(S, hipB, [kB.ex, kB.ey], 8.2, 7.2, { ramp: GI, z: 2, g: 1, bias: -0.05 });
    cap(S, [kB.ex, kB.ey], ankB, 7.2, 5.6, { ramp: GI, z: 2, g: 1, bias: -0.08 });
    cap(S, hipF, [kF.ex, kF.ey], 8.2, 7.2, { ramp: GI, z: 1, g: 2, bias: -0.12 });
    cap(S, [kF.ex, kF.ey], ankF, 7.2, 5.6, { ramp: GI, z: 1, g: 2, bias: -0.15 });
    // trouser folds
    dline(S, hipB[0] + 3, hipB[1] + 6, kB.ex + 3, kB.ey - 1, P.G1, 1);
    dline(S, kB.ex + 1, kB.ey + 2, ankB[0] + 3, ankB[1] - 3, P.G1, 1);
    dline(S, hipF[0] - 2, hipF[1] + 7, kF.ex - 3, kF.ey, P.G0, 2);
    dline(S, kF.ex, kF.ey + 3, ankF[0] - 3, ankF[1] - 4, P.G0, 2);
    // gi jacket skirt + torso
    const cyT = -61 + s;
    const tn = (x, y) => [x / 18, (y - cyT) / 26];
    poly(S, [[-12.5, -48 + s], [12.5, -48 + s], [15.5, -36 + s], [5, -34.5 + s], [-4, -35.5 + s], [-15.5, -37 + s]], { ramp: GI, z: 4, g: 3, nf: (x, y) => [x / 17, -0.15] });
    poly(S, [[-15, -74 + s], [15, -74 + s], [17.5, -68 + s], [15.5, -58 + s], [13, -47 + s], [-13, -47 + s], [-15.5, -58 + s], [-17.5, -68 + s]], { ramp: GI, z: 4, g: 4, nf: tn });
    // open collar: pecs
    const pec = (x, y) => (x < 0.5 ? [(x + 4.5) / 6, (y - (-67 + s)) / 6] : [(x - 5) / 6, (y - (-67 + s)) / 6]);
    poly(S, [[-7.5, -74.5 + s], [8, -74.5 + s], [1, -55 + s]], { ramp: SKIN, z: 4.5, g: 6, nf: pec });
    dline(S, -3.5, -62.5 + s, 0, -61 + s, P.N1, 6);
    dline(S, 2, -61 + s, 5, -62.5 + s, P.N1, 6);
    cap(S, [-7.5, -74.5 + s], [0.5, -55.5 + s], 1.6, 1.4, { ramp: GI, z: 5, g: 7, bias: 0.05 });
    cap(S, [8, -74.5 + s], [1.5, -55.5 + s], 1.6, 1.4, { ramp: GI, z: 5.1, g: 7, bias: -0.1 });
    // belt + knot
    poly(S, [[-13, -50.5 + s], [13, -50.5 + s], [13, -46.5 + s], [-13, -46.5 + s]], { ramp: BLK, z: 6, g: 5, nf: (x, y) => [x / 15, (y + 48.5 - s) / 3] });
    ell(S, 3, -48.5 + s, 2.4, 2.2, { ramp: BLK, z: 6.4, g: 8 });
    cap(S, [2, -47 + s], [0, -38 + s + fl * 0.5], 1.3, 1.1, { ramp: BLK, z: 6.3, g: 8 });
    cap(S, [4, -47 + s], [6.5, -39 + s], 1.3, 1.1, { ramp: BLK, z: 6.3, g: 8 });
    // neck, head
    cap(S, [1.5, -72 + s], [2, -80 + s], 4.8, 4.6, { ramp: SKIN, z: 4.4, g: 9, bias: -0.3 });
    const HX = 2, HY = -88 + s;
    ell(S, HX, HY, 6.4, 8.2, { ramp: SKIN, z: 8, g: 10 });
    poly(S, [[HX - 3, HY + 2], [HX + 6.4, HY + 1], [HX + 6.2, HY + 4.6], [HX + 4.4, HY + 7.4], [HX + 1, HY + 8.2], [HX - 2, HY + 7.2]], { ramp: SKIN, z: 8, g: 10, bias: 0.1, nf: (x, y) => [(x - HX) / 9, (y - HY) / 12] });
    dp(S, HX + 6, HY + 1, P.N3, true); dp(S, HX + 6, HY + 2, P.N2, true);
    // headband tails (behind the head) — 2-frame flutter
    const kx = HX - 6.2, ky = HY - 4;
    const T1 = fl ? [[kx, ky], [kx - 6, ky - 2.5], [kx - 13, ky - 1]] : [[kx, ky], [kx - 6, ky - 1], [kx - 13, ky - 3.5]];
    const T2 = fl ? [[kx, ky + 1], [kx - 5, ky + 3], [kx - 11, ky + 6.5]] : [[kx, ky + 1], [kx - 5, ky + 2], [kx - 11, ky + 4]];
    [T1, T2].forEach((T, k) => { for (let i = 0; i < T.length - 1; i++) cap(S, T[i], T[i + 1], 1.3 - i * 0.15, 1.1 - i * 0.2, { ramp: RED, z: 7.5 - k * 0.1, g: 12 + k * 40 }); });
    // hair: back of the head, the cap, spikes
    ell(S, HX - 4.7, HY - 2, 3, 5.6, { ramp: HAIR, z: 9, g: 11 });
    ell(S, HX - 0.6, HY - 7.4, 7.3, 3.3, { ramp: HAIR, z: 9, g: 11 });
    const sp = [[[-7, -4.5], [-12.5, -7.5], [-6, -8.4]], [[-6, -8], [-8.5, -14], [-2, -10]], [[-2.5, -10.2], [0.5, -16], [3, -10.5]], [[2, -10.3], [7, -14.5], [6.4, -8.5]], [[5.6, -8.6], [10.5, -8.6], [7.6, -5.2]]];
    sp.forEach((tri) => poly(S, tri.map(([x, y]) => [HX + x, HY + y]), { ramp: HAIR, z: 9, g: 11, nf: (x, y) => [(x - HX) / 9, (y - HY + 8) / 8] }));
    // headband: two rows across the brow, knot at the back
    poly(S, [[HX - 6.4, HY - 5.2], [HX + 6.6, HY - 5], [HX + 6.7, HY - 3.1], [HX - 6.4, HY - 3.2]], { ramp: RED, z: 10, g: 14, nf: (x, y) => [(x - HX) / 7.5, (y - HY + 4.1) / 2.6] });
    ell(S, kx + 0.2, ky + 0.5, 1.9, 1.8, { ramp: RED, z: 10.1, g: 15 });
    // ear at the back (sits on the hair)
    ell(S, HX - 4.6, HY + 0.6, 1.4, 2.2, { ramp: SKIN, z: 9.5, g: 10, bias: -0.15 });
    dp(S, HX - 5, HY + 0, P.N1); dp(S, HX - 5, HY + 1, P.N1);
    faceP(S, HX, HY, 0);
    // arms: near (-x) and far (+x); both read beside the torso
    const shN = [-15.5, -69 + s], elN = [-21.5, -54 + s], wrN = [-30.5, -54.5 + s - hn];
    const shF = [15, -69.5 + s], elF = [21, -54.5 + s], wrF = [30, -55 + s - hp];
    arm(S, shF, elF, wrF, 1, 5.5, 20, { bias: -0.08, wrap: RED });
    arm(S, shN, elN, wrN, -1, 7, 21, { wrap: RED });
    // torn sleeves
    const sleeve = (sh, dir, z) => {
      const cx = sh[0] - dir * 0.3, cy = sh[1] + 0.2;
      rast(S, cx - 6.5, cy - 5.5, cx + 6.5, cy + 6, (x, y) => {
        const nx = (x - cx) / 6.3, ny = (y - cy) / 5.3;
        if (nx * nx + ny * ny > 1) return null;
        const jag = [0, 2, 1, 2.6, 0.4, 1.8][(Math.floor(x) + 60) % 6];
        if (y > cy + 1.2 + jag) return null;
        return [nx, ny];
      }, { ramp: GI, z, g: 30 + dir });
    };
    sleeve(shF, 1, 5.6);
    sleeve(shN, -1, 7.2);
    outline(S);
    rim(S, -40 + s);
    return S;
  }

  /** deadpan wide-eyed face, 3/4 view looking toward +x. kind 0 = P1, 1 = P2 (heavier brow, square jaw) */
  function faceP(S, HX, HY, kind) {
    const D = (x, y, c) => dp(S, HX + x, HY + y, c);
    const br = kind ? P.N0 : P.K0;
    // brows (stern, a touch lower at the inner ends)
    [-3, -2, -1].forEach((x) => D(x, -2, br)); D(0, -1, br);
    [3, 4, 5].forEach((x) => D(x, -2, br)); D(2, -1, P.N1);
    if (kind) { D(-2, -3, br); D(-1, -3, br); D(4, -3, br); D(5, -3, br); }
    // eyes: whites + pupils toward the opponent
    D(-2, 0, P.G3); D(-1, 0, P.G3); D(0, 0, P.K0);
    D(4, 0, P.G3); D(5, 0, P.K0);
    D(-2, 1, P.N2); D(-1, 1, P.N2); D(0, 1, P.N2); D(4, 1, P.N2);
    // nose: lit bridge, shadow side, nostril
    D(2, 0, P.N3); D(2, 1, P.N4); D(3, 1, P.N2); D(2, 2, P.N3); D(3, 2, P.N1); D(4, 2, P.N1); D(3, 3, P.N2);
    // mouth: one flat line
    D(0, 5, P.N1); D(1, 5, P.N0); D(2, 5, P.N0); D(3, 5, P.N0); D(4, 5, P.N1);
    D(1, 4, P.N2); D(2, 4, P.N2);
    // cheek / jaw shading
    D(5, 3, P.N1); D(5, 4, P.N1);
    if (kind) { D(5, 6, P.N1); D(4, 7, P.N1); D(0, 7, P.N2); D(-1, 6, P.N1); }
  }

  /** warm rim light from the sunset behind: silhouette pixels on the +x side catch the light */
  const RIM = mapOf('N1>N2 N2>N3 N3>N4 G0>G1 G1>G2 G2>G3 B0>B1 B1>B2 B2>B3 R0>R1 R1>R2 K1>K3 N0>N1 V0>V1 V1>V2');
  function rim(S, yMax) {
    const { w, h, c } = S;
    const out = c.slice();
    for (let y = 0; y < h; y++) {
      if (y - S.oy > yMax) break;
      for (let x = 0; x < w - 2; x++) {
        const i = y * w + x;
        if (c[i] < 0 || c[i] === P.K0) continue;
        if (c[i + 1] === P.K0 && c[i + 2] < 0) out[i] = RIM[c[i]];
      }
    }
    S.c = out;
  }

  // P2 — blue tank top, blond flat-top, camo trousers, boots. Built facing +x, drawn mirrored.
  function buildP2(hn, hp, s, fl) {
    const S = new Spr(116, 124, 58, 116);
    const hipB = [-8, -45 + s], hipF = [7, -45 + s], ankB = [-22, -9], ankF = [20, -9];
    const kB = V.ik(hipB[0], hipB[1], ankB[0], ankB[1], 22, 22, 1), kF = V.ik(hipF[0], hipF[1], ankF[0], ankF[1], 22, 22, -1);
    // boots
    const boot = (ank, d, z, g) => {
      cap(S, [ank[0], ank[1] - 6], [ank[0], ank[1] + 2], 5.4, 5, { ramp: BLK, z, g });
      poly(S, [[ank[0] - d * 5, ank[1] - 1], [ank[0] + d * 4, ank[1] - 1], [ank[0] + d * 11, ank[1] + 6], [ank[0] + d * 10, ank[1] + 9], [ank[0] - d * 6, ank[1] + 9]], { ramp: BLK, z: z + 0.1, g, nf: (x, y) => [d * 0.2, (y - ank[1] - 2) / 9] });
      for (let k = 0; k < 3; k++) dp(S, ank[0] + d * (1 + k), ank[1] - 4 + k * 2, P.G1);
    };
    boot(ankB, -1, 2.5, 17);
    boot(ankF, 1, 1.5, 18);
    // camo trousers
    cap(S, hipB, [kB.ex, kB.ey], 9, 7.8, { ramp: CAMO, z: 2, g: 1, bias: 0.05 });
    cap(S, [kB.ex, kB.ey], [ankB[0], ankB[1] - 6], 7.8, 6.6, { ramp: CAMO, z: 2, g: 1 });
    cap(S, hipF, [kF.ex, kF.ey], 9, 7.8, { ramp: CAMO, z: 1, g: 2, bias: -0.05 });
    cap(S, [kF.ex, kF.ey], [ankF[0], ankF[1] - 6], 7.8, 6.6, { ramp: CAMO, z: 1, g: 2, bias: -0.05 });
    for (let y = -46; y < 0; y++)
      for (let x = -32; x < 32; x++) {
        const n = V.noise2(x * 0.32 + 4, y * 0.26 + 9);
        if (n > 0.66) { dpg(S, x, y, P.N0, 1); dpg(S, x, y, P.N0, 2); }
        else if (n < 0.24) { dpg(S, x, y, P.V0, 1); dpg(S, x, y, P.V0, 2); }
      }
    // tank top torso with pecs/abs under the cloth
    const pecY = -68 + s;
    const tn = (x, y) => (y < pecY + 6 ? [(x - (x < 0 ? -6.5 : 6.5)) / 8, (y - pecY) / 7.5] : [x / 16, (y - (-56 + s)) / 13]);
    poly(S, [[-10, -80 + s], [10, -80 + s], [12, -73 + s], [0, -70 + s], [-12, -73 + s]], { ramp: SKIN, z: 4.3, g: 6, nf: (x, y) => [x / 14, (y + 76 - s) / 7] });
    poly(S, [[-15.5, -75 + s], [-10.5, -79.5 + s], [-7, -73 + s], [0, -69.5 + s], [7, -73 + s], [10.5, -79.5 + s], [15.5, -75 + s], [18, -66 + s], [15.5, -57 + s], [13.5, -48 + s], [-13.5, -48 + s], [-15.5, -57 + s], [-18, -66 + s]], { ramp: TANK, z: 4.5, g: 4, nf: tn });
    dline(S, -12, -61.5 + s, -2, -60.5 + s, P.B0, 4);
    dline(S, 2, -60.5 + s, 12, -61.5 + s, P.B0, 4);
    dline(S, 0, -59 + s, 0, -50 + s, P.B0, 4);
    // dog tags
    dline(S, -7, -79 + s, -1, -69 + s, P.G1, 6);
    dline(S, 7, -79 + s, 1, -69 + s, P.G1, 6);
    dline(S, -1, -69 + s, 0, -69 + s, P.G1, 4);
    dp(S, 0, -68 + s, P.G3); dp(S, 0, -67 + s, P.G2); dp(S, 1, -68 + s, P.G2); dp(S, 1, -67 + s, P.G1);
    // belt + buckle
    poly(S, [[-14, -50 + s], [14, -50 + s], [14, -46 + s], [-14, -46 + s]], { ramp: BLK, z: 6, g: 5, nf: (x, y) => [x / 16, (y + 48 - s) / 3] });
    ell(S, 1, -48 + s, 2.6, 2.1, { col: P.G2, z: 6.5, g: 8 });
    dp(S, 1, -48 + s, P.G3); dp(S, 2, -47 + s, P.G1);
    // neck + head
    cap(S, [1, -76 + s], [2, -84 + s], 6, 5.6, { ramp: SKIN, z: 4.2, g: 9, bias: -0.25 });
    const HX = 2, HY = -93 + s;
    ell(S, HX, HY, 6.7, 8.2, { ramp: SKIN, z: 8, g: 10 });
    poly(S, [[HX - 4.5, HY + 1], [HX + 7, HY + 1], [HX + 7, HY + 5.5], [HX + 5.5, HY + 8.6], [HX - 1.5, HY + 8.8], [HX - 5, HY + 5]], { ramp: SKIN, z: 8, g: 10, nf: (x, y) => [(x - HX) / 9, (y - HY) / 9.5] });
    dp(S, HX + 7, HY + 1, P.N3, true); dp(S, HX + 7, HY + 2, P.N2, true);
    // flat-top: flat lit deck, combed front, darker back; shaved sides with stubble
    const ft = (x, y) => {
      if (y < HY - 15.6) return [-0.1, -0.98];
      const fx2 = (x - HX - 1) / 8;
      return [fx2, -0.05 + (y - HY + 11) / 26];
    };
    poly(S, [[HX - 5.8, HY - 5], [HX + 6.8, HY - 5], [HX + 7.6, HY - 15], [HX + 6.6, HY - 17.4], [HX - 6.6, HY - 17.4], [HX - 7.2, HY - 15.5]], { ramp: BLOND, z: 9, g: 11, nf: ft, bias: 0.12 });
    for (let x = HX - 1; x <= HX + 6; x += 2) dline(S, x, HY - 14.5, x + 0.4, HY - 7.5, P.O1, 11);
    for (let x = HX - 5; x <= HX - 3; x += 2) dline(S, x, HY - 15, x, HY - 7, P.O1, 11);
    dline(S, HX - 7, HY - 15, HX - 6, HY - 6, P.N1, 11);
    for (let x = HX - 6; x <= HX + 7; x++) { dpg(S, x, HY - 6, P.O1, 11); dpg(S, x, HY - 5, P.N1, 11); }
    for (let x = HX - 5; x <= HX + 6; x++) dpg(S, x, HY - 16, P.Y1, 11);
    for (let y = HY - 5; y <= HY + 1; y++) for (let x = HX - 6; x <= HX - 3; x++) if ((x + y) & 1) dpg(S, x, y, P.N1, 10);
    // ear
    ell(S, HX - 4.6, HY + 0.8, 1.5, 2.3, { ramp: SKIN, z: 9.5, g: 10, bias: -0.1 });
    dp(S, HX - 5, HY + 0, P.N1); dp(S, HX - 5, HY + 1, P.N1);
    faceP(S, HX, HY, 1);
    // arms (bigger)
    const shN = [-17.5, -72 + s], elN = [-23.5, -56 + s], wrN = [-33, -56.5 + s - hn];
    const shF = [17, -72.5 + s], elF = [23, -56.5 + s], wrF = [32.5, -57 + s - hp];
    arm(S, shF, elF, wrF, 1, 5.5, 20, { bias: -0.08, R: 1.12 });
    arm(S, shN, elN, wrN, -1, 7, 21, { R: 1.12 });
    // tank straps over the shoulders
    cap(S, [-10.5, -79.5 + s], [-12.5, -74 + s], 1.5, 1.5, { ramp: TANK, z: 7.5, g: 4 });
    cap(S, [10.5, -79.5 + s], [12.5, -74 + s], 1.5, 1.5, { ramp: TANK, z: 5.6, g: 4 });
    outline(S);
    rim(S, -44 + s);
    return S;
  }

  // ------------------------------------------------------------------ crowd (all doing 67, row bouncing in phase)
  const CROWD = (() => {
    const r = V.rng(616);
    const front = [], back = [];
    for (let x = 97; x < 300; x += 13 + Math.floor(r() * 3)) front.push({ x, dy: Math.floor(r() * 3), hair: Math.floor(r() * 6), shirt: Math.floor(r() * 7), skin: Math.floor(r() * 3) });
    for (let x = 92; x < 304; x += 8 + Math.floor(r() * 5)) back.push({ x: x + 4, dy: Math.floor(r() * 6) - 1, cap: r() < 0.3 });
    return { front, back };
  })();
  const SHIRT = [[P.R0, P.R1], [P.B0, P.B1], [P.V0, P.V1], [P.K2, P.K3], [P.G0, P.G1], [P.M0, P.M1], [P.N0, P.N1]];
  const SKINS = [[P.N1, P.N2], [P.N0, P.N1], [P.N2, P.N3]];
  /** one spectator: head, shoulders, and both forearms doing 67 (a = +1 screen-left hand up) */
  function fan(L, x, y, a, o) {
    const [sk0, sk1] = o.skin, [sh0, sh1] = o.shirt;
    const rs = x < SUN.x ? 1 : -1; // the side that faces the sun gets the rim light
    // torso: sloped shoulders, slight taper, shaded away from the sun
    hl(L, x - 2, x + 2, y + 6, sh1);
    hl(L, x - 3, x + 3, y + 7, sh1);
    for (let j = 8; j < 26; j++) {
      const hw = j < 14 ? 4 : 3;
      for (let i = -hw; i <= hw; i++) ps(L, x + i, y + j, i * rs <= -hw + 1 ? sh0 : sh1);
      ps(L, x + rs * hw, y + j, j < 16 ? o.rim : sh1);
    }
    ps(L, x + rs * 3, y + 7, o.rim); ps(L, x + rs * 2, y + 6, o.rim);
    // round head + neck
    hl(L, x - 1, x + 1, y, sk1);
    for (let j = 1; j <= 3; j++) hl(L, x - 2, x + 2, y + j, sk1);
    hl(L, x - 1, x + 1, y + 4, sk1);
    ps(L, x - 2 * rs, y + 2, sk0); ps(L, x - 2 * rs, y + 3, sk0); ps(L, x - rs, y + 4, sk0);
    ps(L, x, y + 5, sk0);
    if (o.eyes) { ps(L, x - 1, y + 2, P.K0); ps(L, x + 1, y + 2, P.K0); }
    // hair styles
    const hc = o.hairC;
    if (o.hair === 0) { hl(L, x - 1, x + 1, y - 1, hc); hl(L, x - 2, x + 2, y, hc); ps(L, x - 2, y + 1, hc); ps(L, x + 2, y + 1, hc); }
    else if (o.hair === 1) { hl(L, x - 2, x + 2, y - 1, hc); hl(L, x - 3, x + 3, y, hc); for (let j = 1; j < 6; j++) { ps(L, x - 3, y + j, hc); ps(L, x + 3, y + j, hc); } }
    else if (o.hair === 2) { hl(L, x - 3, x + 3, y + 1, P.R0); hl(L, x - 2, x + 2, y, P.R1); hl(L, x - 1, x + 1, y - 1, P.R1); ps(L, x + 3 * rs, y + 1, P.R1); }
    else if (o.hair === 3) { hl(L, x - 2, x + 2, y - 2, hc); hl(L, x - 3, x + 3, y - 1, hc); hl(L, x - 3, x + 3, y, hc); ps(L, x - 3, y + 1, hc); ps(L, x + 3, y + 1, hc); }
    else if (o.hair === 4) { hl(L, x - 3, x + 3, y + 1, P.B0); hl(L, x - 2, x + 2, y, P.B1); hl(L, x - 1, x + 1, y - 1, P.B1); }
    else { hl(L, x - 1, x + 1, y - 1, hc); hl(L, x - 2, x + 2, y, hc); }
    const top = o.hair === 3 ? y - 3 : o.hair === 5 ? y - 2 : y - 2;
    ps(L, x + rs, top + 1, o.rim);
    // arms: upper arm down the side, forearm out, palm up, alternating
    for (const d of [-1, 1]) {
      const ah = d < 0 ? a : -a;
      for (let j = 7; j <= 11; j++) { ps(L, x + d * 5, y + j, j < 9 ? sh1 : sk0); ps(L, x + d * 4, y + j + 1, j < 9 ? sh0 : sk0); }
      ps(L, x + d * 6, y + 11 - ah, sk0); ps(L, x + d * 6, y + 12 - ah, sk0);
      ps(L, x + d * 7, y + 11 - 2 * ah, sk0); ps(L, x + d * 7, y + 12 - 2 * ah, sk0);
      ps(L, x + d * 8, y + 11 - 3 * ah, sk1); ps(L, x + d * 9, y + 11 - 3 * ah, sk1); ps(L, x + d * 8, y + 12 - 3 * ah, sk0);
      if (d === rs) ps(L, x + d * 9, y + 11 - 3 * ah, o.rim);
    }
  }
  function crowd(b, fr, up) {
    const a = [1, 0, -1, 0][fr];
    const L = new Uint8Array(PW * PH).fill(TR);
    // back row: rim-lit silhouettes against the sunset
    CROWD.back.forEach((p) => {
      fan(L, p.x, 117 + p.dy - up, a, { skin: [P.K2, P.K3], shirt: [P.K1, P.K2], hair: p.cap ? 3 : 5, hairC: P.K1, rim: P.M1, eyes: false });
    });
    // front row: coloured, backlit by the sun
    CROWD.front.forEach((p) => {
      const hc = [P.K0, P.N0, P.K1, P.N1, P.K0, P.R0][p.hair];
      fan(L, p.x, 124 + p.dy - up, a, { skin: SKINS[p.skin], shirt: SHIRT[p.shirt], hair: p.hair, hairC: hc, rim: P.Y0, eyes: true });
    });
    // outline the crowd layer, then composite
    for (let y = 110; y < 160; y++)
      for (let x = 80; x < 312; x++) {
        const i = y * PW + x;
        if (L[i] !== TR) { b[i] = L[i]; continue; }
        if ((L[i - 1] !== TR) || (L[i + 1] !== TR) || (L[i - PW] !== TR)) b[i] = P.K0;
      }
  }

  // ------------------------------------------------------------------ cached statics
  let STAT = null;
  const ensure = () => {
    if (STAT) return STAT;
    const bg = bakeBG();
    STAT = { BG: bg.b, wins: bg.wins, MID: bakeMID(), FB: new Uint8Array(PW * PH), IMG: new ImageData(PW, PH) };
    STAT.U32 = new Uint32Array(STAT.IMG.data.buffer);
    return STAT;
  };

  function armFrame(t) {
    const a = V.G.arm(t, 0);
    if (a.y > 0.45) return 0;
    if (a.y < -0.45) return 2;
    return a.v < 0 ? 1 : 3;
  }

  // ------------------------------------------------------------------ game HUD + messages
  const grad = (cols) => (j, h) => cols[Math.min(cols.length - 1, Math.floor((j / h) * cols.length))];
  function gameHud(b, t, u) {
    // score line
    text(b, '1P 000067', 98, 1, { fill: P.G3, ol: P.K0 });
    text(b, 'HI 676767', 192, 1, { fill: P.Y0, ol: P.K0, align: 'c' });
    text(b, '2P 000067', 286, 1, { fill: P.G3, ol: P.K0, align: 'r' });
    // health bars (full, and they stay full)
    const bar = (x0, x1) => {
      rf(b, x0 - 1, 10, x1 - x0 + 3, 11, P.K0);
      rf(b, x0, 11, x1 - x0 + 1, 9, P.G2);
      rf(b, x0 + 1, 12, x1 - x0 - 1, 7, P.R1);
      for (let x = x0 + 1; x < x1; x++) {
        ps(b, x, 12, P.Y1); ps(b, x, 13, P.Y1);
        for (let y = 14; y < 18; y++) ps(b, x, y, P.Y0);
        ps(b, x, 18, P.O1);
      }
    };
    bar(98, 180);
    bar(204, 286);
    // KO badge
    rf(b, 183, 9, 19, 13, P.K0);
    rf(b, 184, 10, 17, 11, P.G2);
    rf(b, 185, 11, 15, 9, P.R0);
    text(b, 'KO', 192, 12, { fill: grad([P.Y1, P.Y0, P.O1, P.O0, P.R2]), align: 'c' });
    // timer: always 67
    text(b, '67', 192, 24, { sc: 2, bold: 1, fill: grad([P.Y1, P.Y1, P.Y0, P.Y0, P.O1, P.O0, P.O0]), ol: P.K0, sh: P.R0, align: 'c' });
    // names + win marks
    text(b, 'SIX', 98, 24, { fill: P.G3, ol: P.K0, sh: P.B0 });
    text(b, 'SEVEN', 286, 24, { fill: P.G3, ol: P.K0, sh: P.B0, align: 'r' });
    const won = u > 3.0 && Math.floor(t * 8) % 2 === 0;
    for (const [x, side] of [[160, 0], [168, 0], [216, 1], [224, 1]]) {
      rf(b, x - 2, 24, 5, 5, P.K0);
      rf(b, x - 1, 25, 3, 3, P.G0);
      if (won && (x === 168 || x === 216)) { rf(b, x - 1, 25, 3, 3, P.Y0); ps(b, x - 1, 25, P.Y1); }
    }
  }

  function messages(b, t, u) {
    const fr = Math.floor(t * 24);
    // ROUND 67
    if (u >= 0.3 && u < 0.98) {
      const k = u - 0.3, flash = k < 0.09;
      const sc = k < 0.045 ? 3 : 2;
      text(b, 'ROUND 67', 192, 60 - (sc - 2) * 3, { sc, bold: 1, fill: flash ? P.G3 : grad([P.G3, P.G3, P.G2, P.G2, P.B3, P.B2, P.B2]), ol: P.K0, sh: P.B0, shx: 2, shy: 2, align: 'c' });
    }
    // FIGHT!
    if (u >= 1.0 && u < 1.62) {
      const k = u - 1.0;
      const sc = k < 0.045 ? 5 : k < 0.09 ? 4 : 3;
      const hot = fr % 4 < 2;
      const fill = k < 0.09 ? P.G3 : hot ? grad([P.Y1, P.Y1, P.Y0, P.Y0, P.O1, P.O1, P.O0, P.R2, P.R1]) : grad([P.Y0, P.Y0, P.O1, P.O1, P.O0, P.O0, P.R2, P.R1, P.R1]);
      text(b, 'FIGHT!', 194, 58 - (sc - 3) * 6, { sc, bold: 1, slant: 3, fill, ol: P.K0, sh: P.R0, shx: 2, shy: 2, align: 'c' });
    }
    // final bar: nobody attacked
    if (u >= 2.0) {
      const s = 'NO ONE ATTACKED';
      const n = Math.min(s.length, Math.floor((u - 2.0) * 24 * 0.9) + 1);
      text(b, s.slice(0, n), 192 - (tmask(s, 2, 1).w >> 1), 45, { sc: 2, bold: 1, fill: grad([P.G3, P.G3, P.G2, P.G2, P.G1, P.G1, P.G1]), ol: P.K0, sh: P.B0, shx: 2, shy: 2 });
    }
    if (u >= 3.0) {
      const k = u - 3.0;
      const sc = k < 0.045 ? 5 : k < 0.09 ? 4 : 3;
      const flash = fr % 6 < 2;
      text(b, '67 WINS', 194, 66 - (sc - 3) * 6, { sc, bold: 1, slant: 3, fill: flash ? grad([P.G3, P.Y1, P.Y1, P.Y0, P.Y0, P.O1, P.O1]) : grad([P.Y1, P.Y0, P.Y0, P.O1, P.O1, P.O0, P.R2]), ol: P.K0, sh: P.R0, shx: 2, shy: 2, align: 'c' });
    }
  }

  // ------------------------------------------------------------------ per-frame stage animation
  function animStage(b, t, u, say) {
    const st = STAT;
    const f2 = Math.floor(t * 6) & 1;
    // window blinks in the skyline
    st.wins.forEach(([x, y, dim, id]) => {
      if (id % 11 === 0 && ((Math.floor(t * 1.5 + id) & 3) === 0)) ps(b, x, y, P.K2);
    });
    // tower beacon
    if (Math.floor(t * 2) & 1) { ps(b, 154, 59, P.R2); ps(b, 153, 59, P.R1); ps(b, 155, 59, P.R1); ps(b, 154, 58, P.R1); }
    // neon: SIX lights on "six", SEVEN on "seven" (a 1-frame sputter at each switch-on)
    const k = say.k * 0.5; // seconds into the beat
    const stOf = (on) => (on ? (k < 0.042 ? 1 : 2) : 0);
    neon(b, skel('SIX', 2, 3), 19, 101, stOf(say.n === 6), NEON.cyan);
    neon(b, skel('SEVEN', 2, 3), 313, 78, stOf(say.n === 7), NEON.pink);
    // rooftop 67 billboard: chaser bulbs + the digit being said burns brighter
    const ch = Math.floor(t * 8) & 1;
    for (let x = 300; x <= 377; x += 3) { ps(b, x, 8, ((x / 3) & 1) === ch ? P.Y1 : P.N1); ps(b, x, 33, ((x / 3) & 1) !== ch ? P.Y1 : P.N1); }
    for (let y = 11; y <= 30; y += 3) { ps(b, 299, y, ((y / 3) & 1) === ch ? P.Y1 : P.N1); ps(b, 378, y, ((y / 3) & 1) !== ch ? P.Y1 : P.N1); }
    neon(b, skel('6', 3, 0), 323, 11, say.n === 6 ? 2 : 1, NEON.gold);
    neon(b, skel('7', 3, 0), 343, 11, say.n === 7 ? 2 : 1, NEON.gold);
    // ramen light-box sign (hangs off the left building)
    const flick = Math.floor(t * 24) % 37 < 2;
    const sx = 77, sy = 66;
    mapEll(b, sx + 11, sy + 22, 30, 34, WRM, (d) => (d < 0.5 ? 0 : 0.4 * (1 - d)));
    rf(b, sx + 18, sy + 4, 4, 2, P.K0); rf(b, sx + 18, sy + 36, 4, 2, P.K0);
    rf(b, sx, sy, 22, 44, P.K0);
    rf(b, sx + 1, sy + 1, 20, 42, P.R1);
    hl(b, sx + 1, sx + 20, sy + 1, P.R2);
    for (let y = sy + 3; y < sy + 41; y++) for (let x = sx + 3; x < sx + 19; x++) ps(b, x, y, flick && y > sy + 21 ? P.O1 : bay(x, y) < 0.12 + (x - sx) * 0.01 ? P.Y0 : P.Y1);
    drawMask(b, kanji('拉'), sx + 3, sy + 4, { fill: P.R1 });
    drawMask(b, kanji('麵'), sx + 3, sy + 23, { fill: flick ? P.N1 : P.R1 });
    for (let y = sy + 2; y < sy + 43; y += 3) { ps(b, sx + 1, y, (y + Math.floor(t * 8)) % 6 < 3 ? P.Y1 : P.R0); ps(b, sx + 20, y, (y + Math.floor(t * 8)) % 6 < 3 ? P.Y1 : P.R0); }
    // pennants on the billboard poles
    for (const [px, d] of [[300, -1], [377, 1]]) {
      vl(b, px, 0, 7, P.G1);
      const fl = f2 ? [[1, 0], [2, 0], [3, 1], [1, 1], [2, 1], [1, 2]] : [[1, 0], [2, 1], [3, 1], [1, 1], [2, 2], [1, 2]];
      fl.forEach(([fx, fy]) => ps(b, px + d * fx, fy + 1, d < 0 ? P.R1 : P.C0));
    }
  }

  /** a rain puddle mirroring the sky: darker than the sky, a broken sun streak, rippling on 2 frames */
  function puddle(b, t) {
    const E3 = [[192, 207, 22, 3.3], [212, 205.6, 13, 2.4], [176, 208.6, 12, 2.1]];
    const inside = (x, y) => E3.some(([cx, cy, rx, ry]) => { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; return dx * dx + dy * dy <= 1; });
    const sh = Math.floor(t * 6) & 1;
    for (let y = 202; y <= 211; y++)
      for (let x = 160; x <= 228; x++) {
        if (!inside(x, y)) continue;
        if (!inside(x, y + 1)) { ps(b, x, y, P.K1); continue; }
        // mirror: the far edge reflects the horizon, the near edge reflects the higher (darker) sky
        const sy2 = 146 - (y - 202) * 11;
        let c = DRK[SKY[band(skyV(x, sy2), x + sh, y)]];
        if (y > 206) c = DRK[c];
        const sw = 5 - Math.abs(y - 205);
        if (Math.abs(x - SUN.x - (y & 1 ? sh : -sh)) < sw && (y + sh) % 2 === 0) c = y < 205 ? P.Y1 : P.Y0;
        else if ((y + sh) % 3 === 0 && V.hash(x * 0.37 + y) < 0.5) c = LIT[c];
        ps(b, x, y, c);
      }
  }

  function shadows(b, X, w) {
    for (let y = 196; y <= 204; y++)
      for (let x = X - w; x <= X + w; x++) {
        const dx = (x + 0.5 - X) / w, dy = (y + 0.5 - 200) / 4;
        if (dx * dx + dy * dy > 1) continue;
        if ((x + y) & 1) ps(b, x, y, P.K0);
        else mapPx(b, x, y, DRK);
      }
  }

  // ------------------------------------------------------------------ frame
  function render(t, u) {
    const st = ensure();
    const b = st.FB;
    b.set(st.BG);
    const say = V.G.say(t);
    const fr = armFrame(t);
    const [hl1, hr1] = poseOf(fr);
    const pu = V.G.pulse(t, 4);
    const sink = pu > 0.55 ? 2 : pu > 0.22 ? 1 : 0;
    const up = Math.round((1 + V.G.bob(t)) * 0.5 * 2);
    const fl = Math.floor(t * 8) & 1;
    animStage(b, t, u, say);
    chef(b, fr);
    crowd(b, fr, up);
    const M = st.MID;
    for (let i = 0; i < M.length; i++) if (M[i] !== TR) b[i] = M[i];
    puddle(b, t);
    shadows(b, 120, 26);
    shadows(b, 264, 28);
    // P1 (not mirrored): screen-left hand = sprite -x hand
    blitSpr(b, buildP1(hl1, hr1, sink, fl), 120, 201, false);
    // P2 (mirrored): screen-left hand = sprite +x hand
    blitSpr(b, buildP2(hr1, hl1, sink, fl), 264, 201, true);
    gameHud(b, t, u);
    messages(b, t, u);
    const U = st.U32;
    for (let i = 0; i < b.length; i++) U[i] = LUT[b[i]];
    return st.IMG;
  }

  V.scenes.pixel = {
    draw(t, u) {
      drawStage(t, u);
    },
  };
  function drawStage(t, u) {
    {
      const img = render(t, u);
      const low = V.gfx('pixel_low', PW, PH, () => {});
      low.drawingContext.putImageData(img, 0, 0);
      const cv = low.elt || low.canvas;
      V.with2d((ctx) => {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(cv, 0, 0, PW * PS, PH * PS);
        // CRT: scanlines (multiply) + darker corners — no blur, no smoothing
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(0,0,0,0.13)';
        for (let r = 0; r < PH; r++) ctx.fillRect(0, r * PS + 3, V.W, 2);
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createRadialGradient(V.W / 2, V.H / 2, V.H * 0.5, V.W / 2, V.H / 2, V.W * 0.62);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.42)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, V.W, V.H);
      });
    }
  }
})();
