/* pop.js — 1962 · 普普藝術《六七罐頭湯 ×32》(film 50.0–54.0 s)
 * A Warhol-style 4×3 silkscreen grid: Lichtenstein comic girls + "Sixseven's" soup cans, every panel the SAME black key screen
 * printed over a different garish colourway (each colour its own screen, misregistered a few px), Ben-Day dot screens, and a
 * giant comic shout balloon "SIX—SEVEN!" over an explosion field (the two centre panels).  Neighbouring panels seesaw in opposite
 * phase (checkerboard), the colourways are re-pulled with a squeegee sweep on the bar line (u≈2), the balloon thumps every beat.
 * Black key art is inked ONCE with p5.brush into a sprite sheet (+ an ink-starved copy) and re-printed per panel; arms/hands,
 * bobbing marks, balloon/burst outlines and explosion rays are inked per frame. The HUD is drawn here (noHud) so the year reads
 * "1962" (hud.js formats it as "1,962").
 */
(function () {
  const V = window.V;
  const CW = 480, CH = 360, GUT = 5;
  const P = '#ff3ea5', Y = '#ffe600', C = '#00c2ff', O = '#ff7a00', U = '#7a2cff', Gn = '#39d353', R = '#e8112d', K = '#111111', W = '#ffffff';
  const PAPER = '#f4efe2';
  const INK = '#121012';
  // panel types: c = soup can, g = comic girl, x = explosion field behind the balloon
  const TYPES = [
    ['c', 'g', 'g', 'c'],
    ['g', 'x', 'x', 'g'],
    ['c', 'g', 'g', 'c'],
  ];
  // Warhol colourways. girl: bg/skin/hair/eyeshadow/lips/dress ; can: top band/bottom band/lettering/gold/metal
  const CWS = [
    { bg: P, bgDot: '#c40f6c', skin: '#ffd6bf', skinDot: null, hair: Y, eyeSh: C, iris: '#1688ff', lips: R, dress: C, dressDot: W,
      top: R, topInk: W, bot: W, botInk: R, gold: '#f3b31b', metal: '#e4e6ea', rim: '#f3b31b', glove: W },
    { bg: C, bgDot: '#0b6fc0', skin: '#ffc1dd', skinDot: '#ff3ea5', hair: O, eyeSh: Gn, iris: '#1fae3c', lips: R, dress: Y, dressDot: R,
      top: P, topInk: W, bot: Y, botInk: U, gold: O, metal: '#fff1f8', rim: U, glove: Y },
    { bg: Y, bgDot: O, skin: W, skinDot: '#ff4d5e', hair: '#1f4fe0', eyeSh: C, iris: '#1f4fe0', lips: R, dress: R, dressDot: W,
      top: C, topInk: W, bot: W, botInk: U, gold: O, metal: '#e8f7ff', rim: C, glove: W },
    { bg: O, bgDot: '#d2350e', skin: '#fff09a', skinDot: null, hair: P, eyeSh: C, iris: '#00a0e0', lips: R, dress: U, dressDot: Y,
      top: U, topInk: Y, bot: P, botInk: W, gold: Y, metal: '#f3e9ff', rim: Y, glove: Y },
    { bg: U, bgDot: '#4b12b8', skin: '#ffd6bf', skinDot: '#ff6a8a', hair: Y, eyeSh: Gn, iris: '#14a84a', lips: P, dress: O, dressDot: Y,
      top: Y, topInk: R, bot: W, botInk: U, gold: O, metal: '#fffbd6', rim: O, glove: W },
    { bg: Gn, bgDot: '#14963a', skin: '#ffc1dd', skinDot: null, hair: Y, eyeSh: U, iris: U, lips: R, dress: P, dressDot: Y,
      top: O, topInk: W, bot: W, botInk: R, gold: Y, metal: '#eafff0', rim: R, glove: W },
    { bg: R, bgDot: '#9e0718', skin: '#ffd6bf', skinDot: '#ff3ea5', hair: Y, eyeSh: C, iris: '#1688ff', lips: P, dress: W, dressDot: R,
      top: C, topInk: Y, bot: Y, botInk: R, gold: P, metal: '#e8f7ff', rim: P, glove: W },
    { bg: '#cfd3d9', bgDot: '#8e959f', skin: '#ffb0d3', skinDot: null, hair: Y, eyeSh: C, iris: '#1688ff', lips: R, dress: K, dressDot: P,
      top: K, topInk: W, bot: W, botInk: K, gold: '#f3b31b', metal: '#f2f3f5', rim: '#f3b31b', glove: W },
  ];
  const NCW = CWS.length;
  // which panels came out of the press over-inked / ink-starved, per colour pull
  const PULLS = [
    { heavy: ['2,0', '0,2'], worn: ['3,1', '1,2'] },
    { heavy: ['3,1', '2,2'], worn: ['1,0', '0,1'] },
  ];

  // ------------------------------------------------------------- girl geometry (local: x centred, y from panel top)
  const HAIR_BACK = 'M 0,14 C 46,12 76,42 76,92 C 76,122 70,142 64,154 C 74,162 90,160 98,146 C 102,172 82,192 58,186 C 47,183 43,175 45,164 C 42,156 38,150 34,146 L -34,146 C -38,150 -42,156 -45,164 C -43,175 -47,183 -58,186 C -82,192 -102,172 -98,146 C -90,160 -74,162 -64,154 C -70,142 -76,122 -76,92 C -76,42 -46,12 0,14 Z';
  const HAIR_INK = 'M 36,148 C 39,152 42,157 45,164 C 43,175 47,183 58,186 C 82,192 102,172 98,146 C 90,160 74,162 64,154 C 70,142 76,122 76,92 C 76,42 46,12 0,14 C -46,12 -76,42 -76,92 C -76,122 -70,142 -64,154 C -74,162 -90,160 -98,146 C -102,172 -82,192 -58,186 C -47,183 -43,175 -45,164 C -42,157 -39,152 -36,148';
  const FACE = 'M -44,98 C -44,66 -26,50 0,50 C 26,50 44,66 44,98 C 44,130 37,152 22,165 C 12,173 -12,173 -22,165 C -37,152 -44,130 -44,98 Z';
  const BANGS = 'M -50,100 C -56,58 -26,30 8,32 C 40,34 56,58 50,92 C 46,76 36,66 22,62 C 6,58 -12,62 -26,70 C -36,76 -45,86 -50,100 Z';
  const NECK = 'M -15,146 C -15,166 -16,184 -22,200 L 22,200 C 16,184 15,166 15,146 Z';
  const CHEST = 'M -22,196 C -50,198 -84,204 -98,218 C -106,228 -104,262 -100,300 L -98,362 L 98,362 L 100,300 C 104,262 106,228 98,218 C 84,204 50,198 22,196 Z';
  const DRESS = 'M -103,238 C -72,248 -42,256 0,256 C 42,256 72,248 103,238 C 103,262 102,282 100,300 L 98,364 L -98,364 L -100,300 C -102,282 -103,262 -103,238 Z';
  // eyes: s = -1 (screen-left eye) / +1; "ex - 15s" is the inner corner, "ex + 16s" the outer one. Wide open, deadpan stare.
  const EX = 20, EY = 106;
  const ep = (s, dx, dy) => `${s * EX + dx * s},${EY + dy}`;
  const LID = (s) => `M ${ep(s, -15, 1)} C ${ep(s, -11, -12)} ${ep(s, 9, -13)} ${ep(s, 16, -3)}`;
  const eyeWhite = (s) => `${LID(s)} C ${ep(s, 12, 9)} ${ep(s, -8, 12)} ${ep(s, -15, 1)} Z`;
  const eyeShadow = (s) => `${LID(s)} L ${ep(s, 19, -7)} C ${ep(s, 11, -19)} ${ep(s, -9, -20)} ${ep(s, -16, -4)} Z`;

  // ------------------------------------------------------------- can geometry
  const RX = 86, RY = 15, YT = 46, YB = 318, YBAND = 160, YLOW = 296;
  const MED = [0, 160, 27];

  // ------------------------------------------------------------- per-panel state
  const cellType = (c, r) => TYPES[r][c];
  const cwIndex = (c, r, shift) => (c * 3 + r * 5 + shift * 4 + 8) % NCW;
  const misreg = (c, r, shift) => {
    const h1 = V.hash(c * 17.3 + r * 41.9 + shift * 7.7), h2 = V.hash(c * 9.1 + r * 3.3 + shift * 13.9 + 2);
    const a = (h1 < 0.5 ? -0.6 : 2.5) + (h1 % 0.5) * 1.6;
    const m = 4.5 + 3 * h2;
    return [Math.cos(a) * m, Math.sin(a) * m * 0.8];
  };
  const phaseOff = (c, r) => ((c + r) % 2 ? 1 : 0);

  // ------------------------------------------------------------- 2D helpers
  const p2 = {};
  const path2d = (d) => p2[d] || (p2[d] = new Path2D(d));
  function polyPath(pts) {
    const p = new Path2D();
    pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
    p.closePath();
    return p;
  }
  /** Ben-Day dot screen over a rect (screen space), rotated lattice, radius from rFn(x,y). Call inside a clip. */
  function dots(ctx, x0, y0, w, h, sp, angDeg, rFn, color) {
    // lattice anchored at the screen origin, so neighbouring shapes share one continuous screen
    const a = (angDeg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    let i0 = 1e9, i1 = -1e9, j0 = 1e9, j1 = -1e9;
    [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]].forEach(([x, y]) => {
      const i = (x * ca + y * sa) / sp, j = (-x * sa + y * ca) / sp;
      i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j);
    });
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = Math.floor(i0); i <= Math.ceil(i1); i++)
      for (let j = Math.floor(j0); j <= Math.ceil(j1); j++) {
        const x = (i * ca - j * sa) * sp, y = (i * sa + j * ca) * sp;
        if (x < x0 - sp || x > x0 + w + sp || y < y0 - sp || y > y0 + h + sp) continue;
        const r = rFn(x, y);
        if (r < 0.35) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
    ctx.fill();
  }
  // can band region between two front arcs
  function bandPath(y1, y2, rx = RX, ry = RY) {
    const p = new Path2D();
    p.moveTo(-rx, y1);
    p.ellipse(0, y1, rx, ry, 0, Math.PI, 0, true);
    p.lineTo(rx, y2);
    p.ellipse(0, y2, rx, ry, 0, 0, Math.PI, false);
    p.closePath();
    return p;
  }

  // ------------------------------------------------------------- arms (pose from the shared rig)
  function girlArm(t, side, off) {
    const s = side ? 1 : -1;
    const a = V.G.arm(t, side, { off });
    const S = [s * 98, 230], E = [s * 112, 298];
    const ang = ((24 + 40 * a.y) * Math.PI) / 180;
    const L = 62;
    const Wr = [E[0] + s * Math.cos(ang) * L, E[1] - Math.sin(ang) * L];
    const pts = V.smoothPts([S, [s * 106, 264], E, [(E[0] + Wr[0]) / 2, (E[1] + Wr[1]) / 2], Wr], false, 8);
    return { s, S, E, Wr, ang, pts, y: a.y, v: a.v };
  }
  function canArm(t, side, off) {
    const s = side ? 1 : -1;
    const a = V.G.arm(t, side, { off });
    const S = [s * (RX - 4), 236];
    const Wr = [s * 166, 240 - 46 * a.y];
    const Cc = [s * 132, 300 - 10 * a.y];
    const pts = [];
    for (let k = 0; k <= 16; k++) {
      const q = k / 16, iq = 1 - q;
      pts.push([iq * iq * S[0] + 2 * iq * q * Cc[0] + q * q * Wr[0], iq * iq * S[1] + 2 * iq * q * Cc[1] + q * q * Wr[1]]);
    }
    const d = pts[16], e = pts[14];
    const ang = Math.atan2(-(d[1] - e[1]), s * (d[0] - e[0]));
    return { s, S, Wr, pts, ang: ang * 0.45 + 0.12, y: a.y, v: a.v };
  }
  function tube(pts, w0, w1) {
    const n = pts.length, A = [], B = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const w = V.lerp(w0, w1, i / (n - 1));
      A.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
      B.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
    }
    return { A, B, poly: A.concat(B.slice().reverse()) };
  }
  // hand (palm up), wrist at origin, fingers toward +x
  const HK = 1.18, GK = 1.28;
  const HAND = 'M -3,-8 C 4,-10 9,-11 13,-12 C 12,-20 16,-27 21,-27 C 26,-27 26,-21 24,-16 C 23,-13 22,-12 23,-10 C 31,-10 39,-12 45,-14 C 50,-16 55,-13 53,-9 C 52,-6 49,-5 46,-4 C 51,-3 52,2 48,4 C 41,9 22,11 10,10 C 4,9 0,8 -3,8 Z';
  const HAND_LINES = ['M 22,-9 C 29,-6 37,-6 44,-8', 'M 16,-3 C 24,1 33,2 42,0'];
  const CUFF = 'M -9,-15 C -4,-5 -4,5 -9,15 L 6,11 C 9,4 9,-4 6,-11 Z';
  const GLOVE = 'M 5,-10 C 7,-22 13,-31 21,-29 C 28,-27 27,-19 25,-14 C 31,-16 38,-19 43,-16 C 48,-13 47,-8 43,-6 C 51,-7 56,-2 53,3 C 51,8 45,9 41,8 C 34,15 18,16 10,12 C 7,10 5,6 5,3 Z';
  const GLOVE_LINES = ['M 26,-13 C 33,-10 39,-9 44,-6', 'M 14,-4 C 22,0 32,1 40,0', 'M -5,-9 C -2,-3 -2,3 -5,9'];
  const handXf = (ctx, Wr, s, ang, k = 1) => {
    ctx.translate(Wr[0], Wr[1]);
    ctx.scale(s * k, k);
    ctx.rotate(-ang);
  };
  const handXfV = (Wr, s, ang, k = 1) => {
    V.translate(Wr[0], Wr[1]);
    V.scale(s * k, k);
    V.rotate(-ang);
  };

  // ------------------------------------------------------------- the black key screens (inked once, re-printed per panel)
  let SPR = null, SPR_W = null; // p5.Image sprite sheet: [girl body | girl head | can] each 480x360 at y=0 (+ worn copy)
  const SPX = { body: 0, head: 480, can: 960 };
  const HEAD_PIVOT = 168;
  function inkGirlBody() {
    const o = { brush: 'ink', color: INK };
    // neck + shoulders + chest
    V.ink('M -16,168 C -16,178 -17,188 -22,198', { ...o, w: 1.3, seed: 1, taper: [4, 8] });
    V.ink('M 16,168 C 16,178 17,188 22,198', { ...o, w: 1.3, seed: 2, taper: [4, 8] });
    V.ink('M -22,198 C -50,200 -84,206 -98,218 C -106,228 -104,262 -100,300 L -98,360', { ...o, w: 1.8, seed: 3, taper: [6, 0] });
    V.ink('M 22,198 C 50,200 84,206 98,218 C 106,228 104,262 100,300 L 98,360', { ...o, w: 1.8, seed: 4, taper: [6, 0] });
    // collarbones
    V.ink('M -46,214 C -36,220 -22,220 -12,216', { ...o, w: 0.8, seed: 5, taper: [8, 8] });
    V.ink('M 46,214 C 36,220 22,220 12,216', { ...o, w: 0.8, seed: 6, taper: [8, 8] });
    // chin shadow on the neck (solid black, Lichtenstein style)
    V.fill('M -16,171 C -6,178 8,178 17,169 L 17,174 C 8,185 -6,186 -16,177 Z', { color: INK, flat: true, seed: 7 });
    // dress neckline + folds
    V.ink('M -103,238 C -72,248 -42,256 0,256 C 42,256 72,248 103,238', { ...o, w: 1.9, seed: 8, taper: [2, 2] });
    V.ink('M -56,302 C -50,322 -48,340 -50,360', { ...o, w: 0.9, seed: 9, taper: [10, 4] });
    V.ink('M 54,298 C 48,318 46,340 48,360', { ...o, w: 0.9, seed: 10, taper: [10, 4] });
    V.ink('M -8,270 C -4,300 -6,330 -10,360', { ...o, w: 0.7, seed: 11, taper: [14, 4] });
  }
  function inkGirlHead() {
    const o = { brush: 'ink', color: INK };
    // hair silhouette
    V.ink(HAIR_INK, { ...o, w: 2.0, seed: 21, taper: [6, 6], wob: 0.8 });
    // hair locks (bold comic strokes)
    const locks = [
      'M -20,24 C -50,40 -66,80 -64,128', 'M -36,36 C -58,62 -62,104 -54,146', 'M 26,22 C 54,38 68,78 66,124', 'M 44,40 C 62,64 64,104 56,144',
      'M -62,156 C -74,166 -88,164 -96,150', 'M 62,156 C 74,166 88,164 96,150', 'M -70,174 C -64,178 -54,180 -50,174', 'M 70,174 C 64,178 54,180 50,174',
      'M -8,20 C -30,30 -44,48 -48,70',
    ];
    locks.forEach((d, i) => V.ink(d, { ...o, w: 1.25, seed: 30 + i, taper: [16, 22] }));
    // bangs edge + locks
    V.ink('M 50,92 C 46,76 36,66 22,62 C 6,58 -12,62 -26,70 C -36,76 -45,86 -50,100', { ...o, w: 1.7, seed: 40, taper: [4, 10] });
    V.ink('M 40,44 C 28,46 10,52 -6,62', { ...o, w: 1.0, seed: 41, taper: [14, 14] });
    V.ink('M 30,36 C 10,38 -16,50 -34,74', { ...o, w: 1.0, seed: 42, taper: [14, 18] });
    // jaw
    V.ink('M -44,102 C -44,128 -38,150 -24,164 C -16,171 -8,173 -2,173', { ...o, w: 1.35, seed: 43, taper: [12, 16] });
    V.ink('M 44,102 C 44,128 38,150 24,164 C 16,171 8,173 2,173', { ...o, w: 1.35, seed: 44, taper: [12, 16] });
    // eyes
    [-1, 1].forEach((s, k) => {
      // heavy upper lash line with a flick at the outer corner
      V.ink(`${LID(s)} L ${ep(s, 22, -7)}`, { ...o, w: 2.1, seed: 50 + k, taper: [5, 9] });
      V.ink(`M ${ep(s, -13, 5)} C ${ep(s, -6, 12)} ${ep(s, 8, 11)} ${ep(s, 15, 0)}`, { ...o, w: 0.75, seed: 52 + k, taper: [6, 6] });
      // lashes on the outer half
      for (let j = 0; j < 4; j++) {
        const q = 0.45 + j * 0.17;
        const bx = s * EX + s * V.lerp(-2, 16, q), by = EY - 10 + j * 2.4;
        V.ink(`M ${bx},${by} L ${bx + s * (3 + j * 1.3)},${by - 7 + j * 0.6}`, { ...o, w: 0.8, seed: 54 + k * 4 + j, taper: [0, 4], wob: 0 });
      }
      // brow: thin, high arch (deadpan surprise)
      V.ink(`M ${ep(s, -14, -21)} C ${ep(s, -5, -31)} ${ep(s, 9, -32)} ${ep(s, 20, -23)}`, { ...o, w: 1.1, seed: 62 + k, taper: [6, 12] });
      // lid crease
      V.ink(`M ${ep(s, -12, -9)} C ${ep(s, -4, -17)} ${ep(s, 9, -17)} ${ep(s, 17, -8)}`, { ...o, w: 0.55, seed: 64 + k, taper: [6, 6] });
    });
    // nose
    V.ink('M 4,116 C 7,124 8,130 4,135', { ...o, w: 0.9, seed: 70, taper: [8, 4] });
    V.ink('M -5,136 C -2,138 2,138 5,135', { ...o, w: 0.8, seed: 71, taper: [3, 3] });
    // earrings (pearls peeking under the flip)
    V.ink(V.ellipsePts(-47, 166, 4.5, 5, 12), { ...o, w: 0.7, seed: 72, closed: true, taper: [0, 0] });
    V.ink(V.ellipsePts(47, 166, 4.5, 5, 12), { ...o, w: 0.7, seed: 73, closed: true, taper: [0, 0] });
  }
  function inkCan() {
    const o = { brush: 'ink', color: INK };
    // lid
    V.ink(V.ellipsePts(0, YT, RX, RY, 40), { ...o, w: 1.6, seed: 80, closed: true, taper: [0, 0], wob: 0.4 });
    V.ink(V.ellipsePts(0, YT + 1, RX - 9, RY - 4, 36), { ...o, w: 0.8, seed: 81, closed: true, taper: [0, 0], wob: 0.3 });
    V.ink(V.arcPts(0, YT + 2, RX - 16, RY - 6, Math.PI * 1.1, Math.PI * 1.9, 14), { ...o, w: 0.55, seed: 82, taper: [8, 8] });
    // sides + bottom
    V.ink([[-RX, YT], [-RX, YB]], { ...o, w: 1.9, seed: 83, taper: [0, 0], wob: 0.3 });
    V.ink([[RX, YT], [RX, YB]], { ...o, w: 1.9, seed: 84, taper: [0, 0], wob: 0.3 });
    V.ink(V.arcPts(0, YB, RX, RY, Math.PI, 0, 30), { ...o, w: 1.9, seed: 85, taper: [0, 0], wob: 0.3 });
    // label edges
    V.ink(V.arcPts(0, YT + 12, RX, RY, Math.PI, 0, 30), { ...o, w: 1.0, seed: 86, taper: [0, 0], wob: 0.3 });
    V.ink(V.arcPts(0, YBAND, RX, RY, Math.PI, 0, 30), { ...o, w: 1.1, seed: 87, taper: [0, 0], wob: 0.3 });
    V.ink(V.arcPts(0, YLOW, RX, RY, Math.PI, 0, 30), { ...o, w: 0.9, seed: 88, taper: [0, 0], wob: 0.3 });
    V.ink(V.arcPts(0, YLOW + 14, RX, RY, Math.PI, 0, 30), { ...o, w: 0.8, seed: 89, taper: [0, 0], wob: 0.3 });
    // medallion
    V.ink(V.ellipsePts(MED[0], MED[1], MED[2], MED[2], 30), { ...o, w: 1.3, seed: 90, closed: true, taper: [0, 0] });
    V.ink(V.ellipsePts(MED[0], MED[1], MED[2] - 7, MED[2] - 7, 26), { ...o, w: 0.6, seed: 91, closed: true, taper: [0, 0] });
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      const r1 = MED[2] - 5, r2 = MED[2] - 2;
      V.ink([[Math.cos(a) * r1, MED[1] + Math.sin(a) * r1], [Math.cos(a) * r2, MED[1] + Math.sin(a) * r2]], { ...o, w: 0.45, seed: 92 + k, taper: [0, 0], wob: 0 });
    }
    // fleur-de-lis band marks
    for (let k = -5; k <= 5; k++) {
      const x = k * 15, f = Math.sqrt(Math.max(0, 1 - (x / RX) * (x / RX)));
      const y = YLOW + 7 + RY * f;
      V.ink([[x, y - 4], [x, y + 4]], { ...o, w: 0.6, seed: 120 + k, taper: [2, 2], wob: 0 });
      V.ink([[x - 3, y - 1], [x + 3, y - 1]], { ...o, w: 0.45, seed: 140 + k, taper: [1, 1], wob: 0 });
    }
  }
  function bakeSprites() {
    clear();
    V.mReset();
    V.push(); V.translate(SPX.body + 240, 0); inkGirlBody(); V.pop();
    V.push(); V.translate(SPX.head + 240, 0); inkGirlHead(); V.pop();
    V.push(); V.translate(SPX.can + 240, 0); inkCan(); V.pop();
    V.flush();
    SPR = get(0, 0, 1440, CH);
    clear();
    // a worn copy of the key screens: ink-starved blotches + pinholes (used for the "tired" pulls)
    SPR_W = createGraphics(1440, CH);
    SPR_W.pixelDensity(1);
    const g = SPR_W.drawingContext;
    g.drawImage(SPR.canvas || SPR.elt, 0, 0);
    const img = g.getImageData(0, 0, 1440, CH);
    const r = V.rng(1962);
    for (let y = 0; y < CH; y++)
      for (let x = 0; x < 1440; x++) {
        const i = (y * 1440 + x) * 4;
        if (!img.data[i + 3]) continue;
        const n = V.noise2(x / 23, y / 17) * 0.65 + V.noise2(x / 6, y / 5) * 0.35;
        let keep = 1 - V.clamp((n - 0.5) * 3.2);
        if (r() < 0.05) keep *= 0.25;
        img.data[i + 3] = Math.round(img.data[i + 3] * V.clamp(keep, 0.22, 1));
      }
    g.putImageData(img, 0, 0);
  }
  // print one sprite region at a screen position (optionally rotated about a pivot given in sprite-local px)
  function printSprite(sx, X, Y, rot = 0, pvx = 240, pvy = 0, alpha = 1, worn = false) {
    V.native(() => {
      imageMode(CORNER);
      if (alpha < 1) tint(255, 255 * alpha);
      translate(X + pvx, Y + pvy);
      if (rot) rotate(rot);
      image(worn && SPR_W ? SPR_W : SPR, -pvx, -pvy, CW, CH, sx, 0, CW, CH);
    });
  }

  // ------------------------------------------------------------- colour pass (2D)
  // every colour is its own screen and lands slightly off the black key (Warhol's famous offset lips / eyeshadow)
  const rot2 = (v, a, k) => [(v[0] * Math.cos(a) - v[1] * Math.sin(a)) * k, (v[0] * Math.sin(a) + v[1] * Math.cos(a)) * k];
  function layerOffsets(mis) {
    return {
      bg: rot2(mis, 0, 0.6), skin: rot2(mis, 0.3, 0.3), hair: rot2(mis, 0.8, 1.0), dress: rot2(mis, -0.9, 0.85),
      shadow: rot2(mis, 2.4, 0.6), lips: rot2(mis, 1.2, 0.85), eye: rot2(mis, 0, 0.1),
      metal: rot2(mis, 0.4, 0.3), top: rot2(mis, 0.2, 0.8), bot: rot2(mis, -0.8, 0.45), gold: rot2(mis, 2.0, 0.95),
      letter: rot2(mis, 0.9, 0.55), glove: rot2(mis, -1.5, 0.9),
    };
  }
  const lay = (ctx, o, fn) => {
    ctx.save();
    ctx.translate(o[0], o[1]);
    fn();
    ctx.restore();
  };
  // screen-space dots inside the current clip; (ox,oy) = where local (0,0) lands
  const screenDots = (ctx, x, y, w, h, sp, ang, r, col) => {
    const m = ctx.getTransform();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    dots(ctx, m.e + x, m.f + y, w, h, sp, ang, typeof r === 'function' ? r : () => r, col);
    ctx.setTransform(m);
  };

  function panelColor(ctx, k, cw, mis, t) {
    const { c, r, ty } = k;
    const x0 = c * CW, y0 = r * CH;
    const L = layerOffsets(mis);
    // background ink: a misregistered rectangle (paper shows along one edge)
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 + GUT, y0 + GUT, CW - 2 * GUT, CH - 2 * GUT);
    ctx.clip();
    ctx.fillStyle = cw.bg;
    ctx.fillRect(x0 + GUT + L.bg[0], y0 + GUT + L.bg[1], CW - 2 * GUT, CH - 2 * GUT);
    // Ben-Day screen on the ground: dots swell toward one corner and breathe gently
    const big = ty === 'x' || (c + r * 2) % 3 === 0;
    const sp = big ? 22 : 13;
    const gx = x0 + (c % 2 ? CW : 0), gy = y0 + (r % 2 ? CH : 0);
    const wav = t * 2.2;
    dots(ctx, x0 + GUT, y0 + GUT, CW - 2 * GUT, CH - 2 * GUT, sp, big ? 15 : 45, (x, y) => {
      const d = Math.hypot(x - gx, y - gy) / 560;
      const kk = V.clamp(1.05 - d) * (0.86 + 0.14 * Math.sin(wav + x * 0.012 + y * 0.009));
      return sp * 0.46 * kk;
    }, cw.bgDot);
    ctx.restore();
    if (ty === 'x') return;
    ctx.save();
    ctx.translate(x0 + CW / 2, y0 + k.bounce);
    if (ty === 'g') girlColor(ctx, cw, L, k);
    else canColor(ctx, cw, L);
    ctx.restore();
  }

  function girlColor(ctx, cw, L, k) {
    const { tilt, gaze, say } = k;
    lay(ctx, L.skin, () => {
      ctx.fillStyle = cw.skin;
      ctx.fill(path2d(CHEST));
      ctx.fill(path2d(NECK));
      if (cw.skinDot) {
        ctx.save();
        const cl = new Path2D();
        cl.addPath(path2d(CHEST));
        cl.addPath(path2d(NECK));
        ctx.clip(cl);
        screenDots(ctx, -120, 140, 240, 225, 7, 45, 2.1, cw.skinDot);
        ctx.restore();
      }
    });
    lay(ctx, L.dress, () => {
      ctx.fillStyle = cw.dress;
      ctx.fill(path2d(DRESS));
      ctx.save();
      ctx.clip(path2d(DRESS));
      ctx.fillStyle = cw.dressDot;
      ctx.beginPath();
      for (let j = 0; j < 6; j++)
        for (let i = -6; i <= 6; i++) {
          const x = i * 26 + (j % 2) * 13, y = 244 + j * 24;
          ctx.moveTo(x + 6.5, y);
          ctx.arc(x, y, 6.5, 0, Math.PI * 2);
        }
      ctx.fill();
      ctx.restore();
    });
    // head (tilts about the neck)
    ctx.save();
    ctx.translate(0, HEAD_PIVOT);
    ctx.rotate(tilt);
    ctx.translate(0, -HEAD_PIVOT);
    lay(ctx, L.hair, () => {
      ctx.fillStyle = cw.hair;
      ctx.fill(path2d(HAIR_BACK));
    });
    lay(ctx, L.skin, () => {
      ctx.fillStyle = cw.skin;
      ctx.fill(path2d(FACE));
      ctx.save();
      ctx.clip(path2d(FACE));
      if (cw.skinDot) {
        screenDots(ctx, -50, 40, 100, 140, 7, 45, (x, y) => 2.1, cw.skinDot);
        ctx.fillStyle = cw.skinDot;
        ctx.globalAlpha = 0.25;
        [-1, 1].forEach((s) => {
          ctx.beginPath();
          ctx.ellipse(s * 27, 132, 11, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();
    });
    lay(ctx, L.hair, () => {
      ctx.fillStyle = cw.hair;
      ctx.fill(path2d(BANGS));
      // printed highlight streaks in the hair (paper white)
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineCap = 'round';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-40, 44); ctx.bezierCurveTo(-30, 34, -14, 28, 2, 28);
      ctx.moveTo(-62, 92); ctx.bezierCurveTo(-64, 76, -60, 62, -52, 52);
      ctx.moveTo(60, 104); ctx.bezierCurveTo(64, 88, 62, 72, 56, 60);
      ctx.moveTo(72, 172); ctx.bezierCurveTo(80, 172, 86, 168, 90, 162);
      ctx.stroke();
    });
    lay(ctx, L.shadow, () => {
      ctx.fillStyle = cw.eyeSh;
      [-1, 1].forEach((s) => ctx.fill(path2d(eyeShadow(s))));
    });
    lay(ctx, L.eye, () => {
      [-1, 1].forEach((s) => {
        ctx.fillStyle = W;
        ctx.fill(path2d(eyeWhite(s)));
        ctx.save();
        ctx.clip(path2d(eyeWhite(s)));
        const ix = s * EX + gaze * 3, iy = EY;
        ctx.fillStyle = cw.iris;
        ctx.beginPath();
        ctx.arc(ix, iy, 8.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(ix, iy, 3.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = W;
        ctx.beginPath();
        ctx.arc(ix + 2.4, iy - 2.6, 1.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    });
    const m = mouthShape(say);
    lay(ctx, L.lips, () => lipsColor(ctx, cw, m));
    mouthKey(ctx, m);
    ctx.restore();
  }
  // lips say "six" (wide, teeth) / "seven" (rounder)
  const mouthShape = (say) => ({ open: 1.5 + 6.5 * say.env, wide: say.n === 6 ? 15 + 2 * say.env : 13 - 2.5 * say.env, y: 149 });
  function lipsColor(ctx, cw, m) {
    const { open, wide, y } = m;
    ctx.fillStyle = cw.lips;
    ctx.beginPath();
    ctx.moveTo(-wide, y);
    ctx.bezierCurveTo(-wide * 0.6, y - 7, -4, y - 8, 0, y - 5);
    ctx.bezierCurveTo(4, y - 8, wide * 0.6, y - 7, wide, y);
    ctx.bezierCurveTo(wide * 0.5, y + open + 9, -wide * 0.5, y + open + 9, -wide, y);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(-wide * 0.35, y + open + 3.5, 3.2, 1.4, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  function mouthKey(ctx, m) {
    const { open, wide, y } = m;
    ctx.fillStyle = '#3a0610';
    ctx.beginPath();
    ctx.moveTo(-wide * 0.82, y + 0.5);
    ctx.bezierCurveTo(-wide * 0.4, y - 1.5, wide * 0.4, y - 1.5, wide * 0.82, y + 0.5);
    ctx.bezierCurveTo(wide * 0.4, y + open, -wide * 0.4, y + open, -wide * 0.82, y + 0.5);
    ctx.fill();
    if (open > 3) {
      ctx.fillStyle = W;
      ctx.beginPath();
      ctx.moveTo(-wide * 0.6, y + 0.4);
      ctx.bezierCurveTo(-wide * 0.3, y - 0.6, wide * 0.3, y - 0.6, wide * 0.6, y + 0.4);
      ctx.lineTo(wide * 0.55, y + Math.min(3.5, open * 0.4));
      ctx.lineTo(-wide * 0.55, y + Math.min(3.5, open * 0.4));
      ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-wide * 0.86, y + 0.5);
    ctx.bezierCurveTo(-wide * 0.4, y - 1.5, wide * 0.4, y - 1.5, wide * 0.86, y + 0.5);
    ctx.stroke();
  }

  function canColor(ctx, cw, L) {
    const body = new Path2D();
    body.moveTo(-RX, YT);
    body.lineTo(-RX, YB);
    body.ellipse(0, YB, RX, RY, 0, Math.PI, 0, true);
    body.lineTo(RX, YT);
    body.closePath();
    lay(ctx, L.metal, () => {
      ctx.fillStyle = cw.metal;
      ctx.fill(body);
      ctx.beginPath();
      ctx.ellipse(0, YT, RX, RY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.beginPath();
      ctx.ellipse(0, YT + 1, RX - 9, RY - 4, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    lay(ctx, L.top, () => {
      ctx.fillStyle = cw.top;
      ctx.fill(bandPath(YT + 12, YBAND));
    });
    lay(ctx, L.bot, () => {
      ctx.fillStyle = cw.bot;
      ctx.fill(bandPath(YBAND, YLOW));
    });
    lay(ctx, L.gold, () => {
      ctx.fillStyle = cw.rim;
      ctx.fill(bandPath(YLOW, YLOW + 14));
    });
    // cylinder: printed highlight on the left, halftone shade on the right
    ctx.save();
    ctx.clip(body);
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fillRect(-RX + 12, YT, 12, YB - YT + RY);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-RX + 28, YT, 5, YB - YT + RY);
    const m0 = ctx.getTransform();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    dots(ctx, m0.e + RX - 36, m0.f + YT, 38, YB - YT + RY, 6, 45, (x) => V.clamp((x - (m0.e + RX - 36)) / 36) * 2.7, 'rgba(0,0,0,0.3)');
    ctx.setTransform(m0);
    ctx.restore();
    // lettering (its own screen)
    lay(ctx, L.letter, () => {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = cw.topInk;
      ctx.font = 'bold 15px "Futura"';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
      ctx.fillText('CONDENSED', 2, YT + 40);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.font = 'bold 44px "Snell Roundhand"';
      const sw = ctx.measureText('Sixseven’s').width;
      ctx.save();
      ctx.translate(0, YT + 92);
      ctx.scale(Math.min(1, 156 / sw), 1);
      ctx.fillText('Sixseven’s', 0, 0);
      ctx.restore();
      ctx.fillStyle = cw.botInk;
      ctx.font = 'bold 22px "Bodoni 72"';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
      ctx.fillText('TOMATO', 2, YBAND + 50);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.font = 'bold 78px "Bodoni 72"';
      ctx.fillText('6-7', 0, YLOW - 8);
    });
    lay(ctx, L.gold, () => {
      ctx.fillStyle = cw.gold;
      ctx.beginPath();
      ctx.arc(MED[0], MED[1], MED[2], 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px "Bodoni 72"';
    ctx.fillText('67', 0, MED[1] + 8);
  }

  // ------------------------------------------------------------- per-frame arms
  const girlHandAng = (a) => a.ang * 0.35 + 0.08;
  function armsPass(t, cells) {
    const figs = cells.filter((k) => k.ty !== 'x');
    // 1) colour (2D): girl arms + hands on the skin screen
    V.with2d((ctx) => {
      figs.forEach((k) => {
        if (k.ty !== 'g') return;
        const L = layerOffsets(k.mis);
        ctx.save();
        ctx.translate(k.X + CW / 2 + L.skin[0], k.Y + L.skin[1] + k.bounce);
        k.arms.forEach((a) => {
          const tb = tube(a.pts, 15, 10);
          const armP = polyPath(tb.poly);
          ctx.fillStyle = k.cw.skin;
          ctx.fill(armP);
          ctx.save();
          handXf(ctx, a.Wr, a.s, girlHandAng(a), HK);
          ctx.fill(path2d(HAND));
          if (k.cw.skinDot) {
            ctx.save();
            ctx.clip(path2d(HAND));
            screenDots(ctx, -10, -40, 80, 60, 7, 45, 2.1, k.cw.skinDot);
            ctx.restore();
          }
          ctx.restore();
          if (k.cw.skinDot) {
            ctx.save();
            ctx.clip(armP);
            const xs = a.pts.map((q) => q[0]), ys = a.pts.map((q) => q[1]);
            const bx = Math.min(...xs) - 16, by = Math.min(...ys) - 16;
            screenDots(ctx, bx, by, Math.max(...xs) - bx + 16, Math.max(...ys) - by + 16, 7, 45, 2.1, k.cw.skinDot);
            ctx.restore();
          }
        });
        ctx.restore();
      });
    });
    // 2) key (brush ink): arm contours, hands, can hoses
    figs.forEach((k) => {
      V.push();
      V.translate(k.X + CW / 2, k.Y + k.bounce);
      const br = k.worn ? 'inkDry' : 'ink', al = k.worn ? 0.82 : 1;
      k.arms.forEach((a, i) => {
        const sd = 300 + i * 7;
        if (k.ty === 'g') {
          const tb = tube(a.pts, 15, 10);
          V.ink(tb.A.slice(1, -1), { w: 1.3, brush: br, alpha: al, color: INK, seed: sd, taper: [10, 2], wob: 0.4 });
          V.ink(tb.B.slice(3, -1), { w: 1.3, brush: br, alpha: al, color: INK, seed: sd + 1, taper: [10, 2], wob: 0.4 });
          V.push();
          handXfV(a.Wr, a.s, girlHandAng(a), HK);
          V.ink(HAND, { w: 1.3, brush: br, alpha: al, color: INK, seed: sd + 2, taper: [0, 0], wob: 0.3 });
          HAND_LINES.forEach((d, j) => V.ink(d, { w: 0.6, brush: br, alpha: al, color: INK, seed: sd + 3 + j, taper: [6, 6], wob: 0 }));
          V.pop();
        } else {
          V.ink(a.pts, { w: 3.4, brush: br, alpha: al, color: INK, seed: sd, taper: [0, 0], wob: 0.3 });
        }
        motionMarks(a, k, i);
      });
      V.pop();
    });
    // 3) gloves over the hose ends (cans), on their own screen
    const cans = figs.filter((k) => k.ty === 'c');
    if (!cans.length) return;
    V.with2d((ctx) => {
      cans.forEach((k) => {
        const L = layerOffsets(k.mis);
        ctx.save();
        ctx.translate(k.X + CW / 2 + L.glove[0], k.Y + L.glove[1] + k.bounce);
        k.arms.forEach((a) => {
          ctx.save();
          handXf(ctx, a.Wr, a.s, a.ang, GK);
          ctx.fillStyle = k.cw.glove;
          ctx.fill(path2d(GLOVE));
          ctx.fill(path2d(CUFF));
          ctx.restore();
        });
        ctx.restore();
      });
    });
    cans.forEach((k) => {
      V.push();
      V.translate(k.X + CW / 2, k.Y + k.bounce);
      k.arms.forEach((a, i) => {
        V.push();
        handXfV(a.Wr, a.s, a.ang, GK);
        V.ink(GLOVE, { w: 1.3, color: INK, seed: 400 + i, taper: [0, 0], wob: 0.3 });
        V.ink(CUFF, { w: 1.1, color: INK, seed: 410 + i, taper: [0, 0], wob: 0.2 });
        GLOVE_LINES.forEach((d, j) => V.ink(d, { w: 0.6, color: INK, seed: 420 + i * 5 + j, taper: [5, 5], wob: 0 }));
        V.pop();
      });
      V.pop();
    });
  }
  /** comic "bobbing" marks: little stacked arcs trailing the moving hand (above it while it drops, below while it rises) */
  function motionMarks(a, k, i) {
    const sp = Math.abs(a.v);
    if (sp < 0.3) return;
    const dir = a.v > 0 ? 1 : -1; // rising -> marks below the hand
    const hx = a.Wr[0] + a.s * (k.ty === 'g' ? 30 : 34), hy = a.Wr[1] - (k.ty === 'g' ? 4 : 2);
    const al = V.smooth(0.3, 0.75, sp);
    for (let j = 0; j < 2; j++) {
      const y = hy + dir * (26 + j * 10), half = 15 - j * 4;
      V.ink([[hx - half, y - dir * 3], [hx, y + dir * 1.5], [hx + half, y - dir * 3]], { w: 0.85, color: INK, alpha: al, seed: 600 + i * 3 + j, taper: [5, 5], wob: 0, smooth: true });
    }
  }
  /** explosion rays behind the balloon (fill the two centre panels the balloon covers) */
  function balloonRays() {
    const cx = 960, cy = 528, x0 = 480 + GUT + 4, x1 = 1440 - GUT - 4, y0 = 360 + GUT + 4, y1 = 720 - GUT - 4;
    const r = V.rng(909);
    for (let k = 0; k < 44; k++) {
      const a = (k / 44) * Math.PI * 2 + (r() - 0.5) * 0.05;
      const dx = Math.cos(a), dy = Math.sin(a);
      let tt = 1e9;
      if (dx > 0) tt = Math.min(tt, (x1 - cx) / dx);
      if (dx < 0) tt = Math.min(tt, (x0 - cx) / dx);
      if (dy > 0) tt = Math.min(tt, (y1 - cy) / dy);
      if (dy < 0) tt = Math.min(tt, (y0 - cy) / dy);
      const t0 = Math.hypot(380 * dx, 140 * dy) * 0.9;
      if (tt <= t0 + 10) continue;
      V.ink([[cx + dx * t0, cy + dy * t0], [cx + dx * tt, cy + dy * tt]], { w: 1.6 + 1.6 * r(), color: INK, seed: 900 + k, taper: [0, 60], wob: 0 });
    }
  }

  // ------------------------------------------------------------- the shout balloon
  /** jagged "shout" balloon around an ellipse: spikes stick out along the ellipse normal by an absolute length (so the long ends
   *  don't grow giant spikes); the spike nearest to `tip` becomes the pointer. Local coords about the centre. */
  function balloonPts(rx, ry, tip, seed) {
    const r = V.rng(seed);
    const n = 30, pts = [];
    const tipAng = Math.atan2(tip[1] / ry, tip[0] / rx);
    const ell = (a, d) => {
      let nx = Math.cos(a) / rx, ny = Math.sin(a) / ry;
      const nl = Math.hypot(nx, ny);
      nx /= nl; ny /= nl;
      return [rx * Math.cos(a) + nx * d, ry * Math.sin(a) + ny * d];
    };
    let best = 0, bd = 9;
    for (let k = 0; k < n; k++) {
      const av = (k / n) * Math.PI * 2 + (r() - 0.5) * 0.06;
      const ap = av + Math.PI / n + (r() - 0.5) * 0.09;
      pts.push(ell(av, -10 - 8 * r()));
      const big = r();
      pts.push(ell(ap, 20 + 26 * big * big + (k % 5 === 1 ? 14 : 0)));
      const da = Math.abs(Math.atan2(Math.sin(ap - tipAng), Math.cos(ap - tipAng)));
      if (da < bd) { bd = da; best = pts.length - 1; }
    }
    pts[best] = [tip[0], tip[1]];
    return pts;
  }
  function starPts(cx, cy, r0, r1, n, seed, rot = 0) {
    const r = V.rng(seed), pts = [];
    for (let k = 0; k < n * 2; k++) {
      const a = rot + (k / (n * 2)) * Math.PI * 2;
      const rr = k % 2 ? r0 * (0.9 + 0.2 * r()) : r1 * (0.85 + 0.3 * r());
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return pts;
  }

  const punch = (u, t0, amt) => {
    const q = (u - t0) / 0.55;
    return q < 0 || q > 1 ? 0 : amt * Math.exp(-5 * q) * Math.cos(q * 10);
  };
  function drawBalloon(t, u) {
    const pin = 1 + punch(u, 0.18, 0.2);
    const pl = V.G.pulse(t, 6);
    const say = V.G.say(t);
    const cx = 960, cy = 528;
    const sc = pin * (1 + 0.045 * pl);
    const tipL = [1148, 742];
    const local = balloonPts(392, 150, [(tipL[0] - cx), (tipL[1] - cy)], 67);
    V.push();
    V.translate(cx, cy);
    V.rotate(-0.035);
    V.scale(sc);
    const scr = local.map((p) => V.tp(p[0], p[1]));
    V.pop();
    // shadow print (offset black), yellow ink, dot screen
    V.with2d((ctx) => {
      ctx.fillStyle = INK;
      ctx.save();
      ctx.translate(12, 12);
      ctx.fill(polyPath(scr));
      ctx.restore();
      ctx.fillStyle = Y;
      const pp = polyPath(scr);
      ctx.fill(pp);
      ctx.save();
      ctx.clip(pp);
      dots(ctx, cx - 520, cy - 260, 1040, 520, 15, 30, (x, y) => {
        const d = Math.hypot((x - cx) / 430, (y - cy) / 175);
        return V.clamp((d - 0.62) * 1.9) * 5.6;
      }, '#ff7a00');
      ctx.restore();
    });
    V.ink(scr, { w: 2.6, closed: true, color: INK, seed: 500, taper: [0, 0], wob: 0.5, brush: 'ink' });
    // lettering: SIX — SEVEN!  (the word being said thumps and turns red)
    const sixK = say.n === 6 ? say.env : 0, sevK = say.n === 7 ? say.env : 0;
    const FS = 136, ft = { font: 'Impact' };
    const wS = V.textW('SIX', FS, ft), wE = V.textW('SEVEN!', FS, ft), wD = 74, gap = 16;
    const tot = wS + gap + wD + gap + wE;
    const x0 = -tot / 2, base = 46, mid = base - FS * 0.36;
    V.push();
    V.translate(cx, cy);
    V.rotate(-0.035);
    V.scale(sc);
    const word = (str, xc, k) => {
      V.push();
      V.translate(xc, mid);
      V.scale(1 + 0.15 * k);
      V.rotate(-0.04 * k);
      V.text(str, 0, base - mid, FS, { font: 'Impact', align: 'center', color: k > 0.3 ? R : INK });
      V.pop();
    };
    word('SIX', x0 + wS / 2, sixK);
    word('SEVEN!', x0 + wS + gap + wD + gap + wE / 2, sevK);
    const dx = x0 + wS + gap;
    const d0 = V.tp(dx, mid - 7), d1 = V.tp(dx + wD, mid - 13), d2 = V.tp(dx + wD, mid + 9), d3 = V.tp(dx, mid + 11);
    V.pop();
    V.with2d((ctx) => {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.moveTo(d0[0], d0[1]); ctx.lineTo(d1[0], d1[1]); ctx.lineTo(d2[0], d2[1]); ctx.lineTo(d3[0], d3[1]);
      ctx.closePath();
      ctx.fill();
    });
  }
  function drawBursts(t, u) {
    const items = [
      { x: 540, y: 418, r: 72, word: 'POW!', fill: R, ink: Y, d: 0.42, n: 6, rot: -0.2, seed: 701 },
      { x: 1348, y: 666, r: 70, word: '67!', fill: C, ink: Y, d: 0.62, n: 7, rot: 0.16, seed: 702 },
    ];
    items.forEach((it, i) => {
      const pin = 1 + punch(u, it.d, 0.35);
      const say = V.G.say(t);
      const hit = say.n === it.n ? say.env : 0;
      const s = pin * (1 + 0.14 * hit);
      const pts = starPts(0, 0, it.r * 0.62, it.r, 11, it.seed, it.rot).map((p) => [it.x + p[0] * s, it.y + p[1] * s]);
      V.with2d((ctx) => {
        ctx.fillStyle = INK;
        ctx.save();
        ctx.translate(7, 7);
        ctx.fill(polyPath(pts));
        ctx.restore();
        ctx.fillStyle = it.fill;
        ctx.fill(polyPath(pts));
      });
      V.ink(pts, { w: 1.8, closed: true, color: INK, seed: it.seed, taper: [0, 0], wob: 0.4 });
      V.text(it.word, it.x, it.y + 16 * s, 50 * s, { font: 'Impact', color: it.ink, align: 'center', stroke: INK, strokeW: 7, rot: it.rot });
    });
  }

  // ------------------------------------------------------------- print texture (ink starvation speckle + squeegee streaks)
  function inkTexture() {
    return V.gfx('pop_inktex', 960, 540, (ctx) => {
      const r = V.rng(6767);
      const img = ctx.createImageData(960, 540);
      for (let y = 0; y < 540; y++)
        for (let x = 0; x < 960; x++) {
          const n = V.noise2(x / 70, y / 46) * 0.6 + V.noise2(x / 17 + 40, y / 13) * 0.3 + V.noise2(x / 4, y / 3) * 0.1;
          const streak = V.noise2(x / 400, y / 2.2) * 0.5;
          let a = V.clamp((n + streak * 0.35 - 0.58) * 1.8) * 0.5;
          if (r() < 0.012 * V.clamp(n * 1.6 - 0.4)) a = 0.55 + 0.3 * r();
          const i = (y * 960 + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
          img.data[i + 3] = Math.round(255 * a);
        }
      ctx.putImageData(img, 0, 0);
    });
  }
  /** canvas weave (the prints are acrylic + silkscreen on linen) */
  function weave() {
    return V.gfx('pop_weave', 960, 540, (ctx) => {
      const img = ctx.createImageData(960, 540);
      const r = V.rng(4242);
      const rowJ = Array.from({ length: 540 }, () => r()), colJ = Array.from({ length: 960 }, () => r());
      for (let y = 0; y < 540; y++)
        for (let x = 0; x < 960; x++) {
          const wx = 0.5 + 0.5 * Math.sin((x + rowJ[y] * 0.8) * 2.1), wy = 0.5 + 0.5 * Math.sin((y + colJ[x] * 0.8) * 2.1);
          const over = ((x >> 1) + (y >> 1)) % 2 ? wx : wy;
          const v = 255 - Math.round(26 * over + 14 * (rowJ[y] * 0.5 + colJ[x] * 0.5));
          const i = (y * 960 + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
      ctx.putImageData(img, 0, 0);
    });
  }
  function inkPool() {
    return V.gfx('pop_inkpool', 960, 540, (ctx) => {
      const img = ctx.createImageData(960, 540);
      for (let y = 0; y < 540; y++)
        for (let x = 0; x < 960; x++) {
          const n = V.noise2(x / 55 + 9, y / 38 + 3) * 0.7 + V.noise2(x / 11, y / 9) * 0.3;
          const v = 255 - Math.round(V.clamp((n - 0.5) * 2.2) * 90);
          const i = (y * 960 + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
      ctx.putImageData(img, 0, 0);
    });
  }

  // ------------------------------------------------------------- scene
  const hudSt = (meta) => Object.assign({}, meta.hud || {}, { shadow: { c: C, x: 9, y: 8, b: 0 } });
  V.scenes.pop = {
    noHud: true, // we call the HUD ourselves: hud.js would print the year as "1,962"
    hudStyle(u, meta) {
      return hudSt(meta);
    },
    draw(t, u, meta) {
      if (!SPR) bakeSprites();
      V.bg(PAPER);
      // colourway pull: the second bar is re-printed with a squeegee sweep (left -> right)
      const sweep = V.prog(u, 1.96, 0.3);
      const sweepX = -60 + V.E.io2(sweep) * (V.W + 120);
      const cells = [];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 4; c++) {
          const off = phaseOff(c, r);
          const ty = cellType(c, r);
          const X = c * CW, Y = r * CH;
          const shift = sweep > 0 && X + CW / 2 < sweepX ? 1 : 0;
          const cw = CWS[cwIndex(c, r, shift)];
          const mis = misreg(c, r, shift);
          const bounce = 4 * V.G.pulse(t + off * 0.5, 7);
          const a0 = V.G.arm(t, 0, { off }), a1 = V.G.arm(t, 1, { off });
          const tilt = ((a0.y - a1.y) * 0.5 * -0.07);
          const gaze = (a1.y - a0.y) * 0.5;
          const sayK = V.G.say(t + off * 0.5);
          const arms = ty === 'g' ? [girlArm(t, 0, off), girlArm(t, 1, off)] : ty === 'c' ? [canArm(t, 0, off), canArm(t, 1, off)] : [];
          const key = c + ',' + r;
          const heavy = PULLS[shift].heavy.includes(key) ? 1 : 0, worn = PULLS[shift].worn.includes(key);
          cells.push({ c, r, X, Y, ty, cw, mis, bounce, tilt, gaze, say: sayK, arms, off, shift, heavy, worn });
        }
      // ---- colour pass (all panels, one 2D layer). During the sweep the new colourway is clipped to the swept area.
      V.with2d((ctx) => {
        cells.forEach((k) => {
          if (sweep > 0 && sweep < 1) {
            panelColor(ctx, k, CWS[cwIndex(k.c, k.r, 0)], misreg(k.c, k.r, 0), t);
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, sweepX, V.H);
            ctx.clip();
            panelColor(ctx, k, CWS[cwIndex(k.c, k.r, 1)], misreg(k.c, k.r, 1), t);
            ctx.restore();
          } else {
            const sh = sweep >= 1 ? 1 : 0;
            panelColor(ctx, k, CWS[cwIndex(k.c, k.r, sh)], misreg(k.c, k.r, sh), t);
          }
        });
        // squeegee: a wet ink ridge riding the sweep front
        if (sweep > 0 && sweep < 1) {
          const g = ctx.createLinearGradient(sweepX - 40, 0, sweepX + 6, 0);
          g.addColorStop(0, 'rgba(20,16,18,0)');
          g.addColorStop(0.8, 'rgba(20,16,18,0.22)');
          g.addColorStop(1, 'rgba(20,16,18,0)');
          ctx.fillStyle = g;
          ctx.fillRect(sweepX - 40, 0, 46, V.H);
        }
      });
      // ---- key pass: re-print the inked screens
      cells.forEach((k) => {
        const hh = V.hash(k.c * 3 + k.r * 7 + 1 + k.shift * 5);
        const inkA = 0.9 + 0.1 * hh;
        const heavy = k.heavy, worn = k.worn; // over-inked (printed twice, a hair apart) / ink-starved pulls
        for (let p = 0; p <= heavy; p++) {
          const ox = p * 1.6, oy = p * 1.1;
          if (k.ty === 'g') {
            printSprite(SPX.body, k.X + ox, k.Y + k.bounce + oy, 0, 240, 0, inkA, worn);
            printSprite(SPX.head, k.X + ox, k.Y + k.bounce + oy, k.tilt, 240, HEAD_PIVOT, inkA, worn);
          } else if (k.ty === 'c') {
            printSprite(SPX.can, k.X + ox, k.Y + k.bounce + oy, 0, 240, 0, inkA, worn);
          }
        }
      });
      balloonRays();
      // ---- arms (per frame)
      armsPass(t, cells);
      // ---- gutters (paper) so the panels read as separate pulls
      V.with2d((ctx) => {
        ctx.fillStyle = PAPER;
        for (let c = 1; c < 4; c++) ctx.fillRect(c * CW - GUT, 0, GUT * 2, V.H);
        for (let r = 1; r < 3; r++) ctx.fillRect(0, r * CH - GUT, V.W, GUT * 2);
        ctx.fillRect(0, 0, V.W, GUT);
        ctx.fillRect(0, V.H - GUT, V.W, GUT);
        ctx.fillRect(0, 0, GUT, V.H);
        ctx.fillRect(V.W - GUT, 0, GUT, V.H);
      });
      // ---- comic layer
      drawBalloon(t, u);
      drawBursts(t, u);
      // ---- print texture
      V.blit(inkPool(), 0, 0, V.W, V.H, { alpha: 0.16, blend: 'multiply' });
      V.blit(weave(), 0, 0, V.W, V.H, { alpha: 0.5, blend: 'multiply' });
      V.blit(inkTexture(), 0, 0, V.W, V.H, { alpha: 0.55 });
      V.grain({ amt: 0.1, anim: true });
      // HUD (year block + museum label)
      if (meta) {
        V.flush();
        V.mReset();
        V.resetBrush();
        const st = hudSt(meta);
        V.hudYear(u, Object.assign({}, meta, { yearText: meta.yearText || String(meta.year) }), st);
        V.hudLabel(u, meta, st);
      }
    },
  };
})();
