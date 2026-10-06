/* roman.js — 79 CE · Pompeian floor mosaic ("CAVE LXVII").
 * Technique: every frame a flat "cartoon" (the design the mosaicist would have traced) is painted on a low-res offscreen canvas,
 * quantised to a 12-colour stone palette, then re-laid as thousands of irregular tesserae. Near every colour edge the tiles are
 * re-oriented and snapped into rows that follow the contour (andamento), far from edges they sit on the straight grid (opus tessellatum).
 * Field between the panels = Pompeian opus signinum (crushed-terracotta mortar with an inlaid lattice of white tesserae).
 * p5.brush: baked weathering layer (watercolour stains, dry-ink cracks, spray ash), multiplied over the stone.
 */
(function () {
  const V = window.V;
  const W = 1920, H = 1080, SS = 3, SW = 640, SH = 360;

  // ------------------------------------------------------------------ palette (stone colours)
  const PAL = [
    ['cream', '#e6dbc1'], ['white', '#f4eee0'], ['black', '#1b1612'], ['char', '#4a4239'],
    ['grey', '#9a9384'], ['lgrey', '#c8bfaa'], ['red', '#a5442b'], ['dred', '#6a2617'],
    ['flesh', '#cf8a62'], ['ochre', '#cf9a45'], ['dochre', '#8c6227'], ['green', '#5d8a7f'],
  ];
  const C = {};
  const PR = [], PG = [], PB = [];
  PAL.forEach(([k, v], i) => { C[k] = v; const c = V.rgb(v); PR.push(c[0]); PG.push(c[1]); PB.push(c[2]); });
  const NP = PAL.length, NONE = 255, SENT = '#ff00ff';
  const SAFE = [0, 1, 2, 3, 4, 6, 9];
  // how strongly a colour claims a tile it only partly covers (cream ground / black body lowest, bright accents highest)
  const PRI = [0, 4, 0, 1, 3, 2, 4, 3, 5, 4, 3, 4];

  // per-colour stone variants (natural variation of cut marble / limestone / glass)
  const NV = 8;
  const VAR = PAL.map(([k, v], ci) => {
    const out = [];
    const [r, g, b] = V.rgb(v);
    for (let q = 0; q < NV; q++) {
      const f = (k === 'black' ? 0.82 : 0.9) + (q / (NV - 1)) * (k === 'black' ? 0.55 : 0.17);
      const w = (q % 3) - 1; // warm / neutral / cool
      out.push(V.hex(r * f * (1 + 0.025 * w), g * f, b * f * (1 - 0.03 * w)));
    }
    return out;
  });

  // ------------------------------------------------------------------ hashing
  const hh = (a, b, c) => {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2246822519)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  // ------------------------------------------------------------------ layout (all tile grids are 9 px)
  const REG = [
    { id: 0, name: 'emb', x: 577, y: 50, nx: 85, ny: 109, s: 9 },
    { id: 1, name: 'pl', x: 72, y: 270, nx: 52, ny: 62, s: 9 },
    { id: 2, name: 'pr', x: 1380, y: 270, nx: 52, ny: 62, s: 9 },
    { id: 3, name: 'ves', x: 1380, y: 32, nx: 52, ny: 24, s: 9 },
    { id: 4, name: 'sal', x: 72, y: 866, nx: 52, ny: 18, s: 9 },
  ];
  REG.forEach((r) => { r.w = r.nx * r.s; r.h = r.ny * r.s; });
  // portrait interiors: finer tesserae (opus vermiculatum), cut out of the coarser border grid
  [[R0 => R0.name === 'pl', 'plf', 5, 7], [R0 => R0.name === 'pr', 'prf', 6, 7], [R0 => R0.name === 'ves', 'vesf', 7, 2]].forEach(([f, name, id, k]) => {
    const o = REG.find(f);
    const hx = o.x + k * o.s, hy = o.y + k * o.s, hw = o.w - 2 * k * o.s, hh2 = o.h - 2 * k * o.s;
    o.hole = [hx, hy, hw, hh2];
    REG.push({ id, name, x: hx, y: hy, nx: Math.round(hw / 6), ny: Math.round(hh2 / 6), s: 6, w: hw, h: hh2 });
  });
  const R = {};
  REG.forEach((r) => (R[r.name] = r));

  // missing-tile patches (lacunae) — wear, kept away from the figures
  const LAC = [
    { x: 596, y: 1012, r: 44 }, { x: 1330, y: 66, r: 30 }, { x: 88, y: 812, r: 40 },
    { x: 1836, y: 300, r: 30 }, { x: 528, y: 1014, r: 30 }, { x: 1392, y: 236, r: 22 }, { x: 1338, y: 640, r: 18 },
  ];
  const lacAt = (x, y) => {
    for (const l of LAC) {
      const d = Math.hypot(x - l.x, y - l.y);
      if (d < l.r * (0.62 + 0.62 * V.noise2(x / 23 + l.x, y / 23))) return true;
    }
    return false;
  };

  // ------------------------------------------------------------------ offscreen "cartoon" + buffers
  let SRC = null, sctx = null;
  const lab = new Uint8Array(SW * SH), lab2 = new Uint8Array(SW * SH), DF = new Float32Array(SW * SH);
  const qcache = new Map();
  function ensureSrc() {
    if (SRC) return;
    SRC = document.createElement('canvas');
    SRC.width = SW; SRC.height = SH;
    sctx = SRC.getContext('2d', { willReadFrequently: true });
  }
  function quant(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    let v = qcache.get(key);
    if (v !== undefined) return v;
    if (r > 235 && g < 40 && b > 235) v = NONE;
    else {
      let best = 0, bd = 1e9;
      for (let i = 0; i < NP; i++) {
        const dr = r - PR[i], dg = g - PG[i], db = b - PB[i];
        const d = dr * dr * 0.9 + dg * dg * 1.2 + db * db * 0.7;
        if (d < bd) { bd = d; best = i; }
      }
      v = best;
      // an anti-aliased blend (far from every stone colour) must not invent accent colours (green / flesh) at edges
      if (bd > 420) {
        bd = 1e9;
        for (const i of SAFE) {
          const dr = r - PR[i], dg = g - PG[i], db = b - PB[i];
          const d = dr * dr * 0.9 + dg * dg * 1.2 + db * db * 0.7;
          if (d < bd) { bd = d; v = i; }
        }
      }
      // anti-aliased blends with the sentinel colour belong to nobody
      if (Math.abs(r - b) < 40 && r > 150 && g < 120) v = NONE;
    }
    if (qcache.size < 200000) qcache.set(key, v);
    return v;
  }
  function buildLabels() {
    const d = sctx.getImageData(0, 0, SW, SH).data;
    for (let i = 0, p = 0; i < SW * SH; i++, p += 4) lab2[i] = quant(d[p], d[p + 1], d[p + 2]);
    // remove 1-px slivers (anti-aliasing seams) — real features are ≥ 1 tile = 3 src px wide
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const i = y * SW + x, c = lab2[i];
        let o = c;
        if (x > 0 && x < SW - 1) {
          const l = lab2[i - 1], r = lab2[i + 1];
          if (l !== c && r !== c) o = l;
        }
        if (o === c && y > 0 && y < SH - 1) {
          const u = lab2[i - SW], dn = lab2[i + SW];
          if (u !== c && dn !== c) o = u;
        }
        lab[i] = o;
      }
    }
  }
  function distField() {
    const INF = 1e6;
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const i = y * SW + x, c = lab[i];
        const e = (x < SW - 1 && lab[i + 1] !== c) || (x > 0 && lab[i - 1] !== c) || (y < SH - 1 && lab[i + SW] !== c) || (y > 0 && lab[i - SW] !== c);
        DF[i] = e ? 0 : INF;
      }
    }
    const A = 1, B = 1.4142;
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const i = y * SW + x;
        let v = DF[i];
        if (v === 0) continue;
        if (x > 0) v = Math.min(v, DF[i - 1] + A);
        if (y > 0) {
          v = Math.min(v, DF[i - SW] + A);
          if (x > 0) v = Math.min(v, DF[i - SW - 1] + B);
          if (x < SW - 1) v = Math.min(v, DF[i - SW + 1] + B);
        }
        DF[i] = v;
      }
    }
    for (let y = SH - 1; y >= 0; y--) {
      for (let x = SW - 1; x >= 0; x--) {
        const i = y * SW + x;
        let v = DF[i];
        if (v === 0) continue;
        if (x < SW - 1) v = Math.min(v, DF[i + 1] + A);
        if (y < SH - 1) {
          v = Math.min(v, DF[i + SW] + A);
          if (x < SW - 1) v = Math.min(v, DF[i + SW + 1] + B);
          if (x > 0) v = Math.min(v, DF[i + SW - 1] + B);
        }
        DF[i] = v;
      }
    }
  }
  const dAt = (sx, sy) => {
    const x = V.clamp(sx, 0, SW - 1.001), y = V.clamp(sy, 0, SH - 1.001);
    const xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, i = yi * SW + xi;
    const a = DF[i], b = DF[Math.min(i + 1, SW * SH - 1)], c = DF[Math.min(i + SW, SW * SH - 1)], d = DF[Math.min(i + SW + 1, SW * SH - 1)];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };
  const labAt = (x, y) => {
    const sx = V.clamp(Math.floor(x / SS), 0, SW - 1), sy = V.clamp(Math.floor(y / SS), 0, SH - 1);
    return lab[sy * SW + sx];
  };

  // ------------------------------------------------------------------ cartoon painting helpers (screen coords; ctx is pre-scaled)
  let X = null; // current source ctx
  const fillP = (d, col) => { X.fillStyle = col; X.fill(typeof d === 'string' ? new Path2D(d) : d); };
  const strokeP = (d, col, w, cap = 'round') => { X.strokeStyle = col; X.lineWidth = w; X.lineCap = cap; X.lineJoin = 'round'; X.stroke(typeof d === 'string' ? new Path2D(d) : d); };
  const rectF = (x, y, w, h, col) => { X.fillStyle = col; X.fillRect(x, y, w, h); };
  const ellF = (cx, cy, rx, ry, col, rot = 0) => { X.fillStyle = col; X.beginPath(); X.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); X.fill(); };
  const polyF = (pts, col) => { X.fillStyle = col; X.beginPath(); pts.forEach((p, i) => (i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1]))); X.closePath(); X.fill(); };
  const lineS = (pts, col, w, cap = 'round') => { X.strokeStyle = col; X.lineWidth = w; X.lineCap = cap; X.lineJoin = 'round'; X.beginPath(); pts.forEach((p, i) => (i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1]))); X.stroke(); };
  const curveS = (pts, col, w) => lineS(V.smoothPts(pts, false, 8), col, w);
  const curveF = (pts, col) => polyF(V.smoothPts(pts, true, 8), col);
  // tile-aligned frame ring: inset k tiles, thickness n tiles
  const ring = (r, k, n, col) => {
    const s = r.s;
    X.fillStyle = col;
    X.beginPath();
    X.rect(r.x + k * s, r.y + k * s, r.w - 2 * k * s, r.h - 2 * k * s);
    X.rect(r.x + (k + n) * s, r.y + (k + n) * s, r.w - 2 * (k + n) * s, r.h - 2 * (k + n) * s);
    X.fill('evenodd');
  };
  const inner = (r, k) => [r.x + k * r.s, r.y + k * r.s, r.w - 2 * k * r.s, r.h - 2 * k * r.s];

  // ------------------------------------------------------------------ the cartoon (one frame)
  function paintCartoon(t, u) {
    X = sctx;
    X.setTransform(1, 0, 0, 1, 0, 0);
    X.fillStyle = SENT;
    X.fillRect(0, 0, SW, SH);
    X.setTransform(1 / SS, 0, 0, 1 / SS, 0, 0);
    paintEmblema(t, u);
    paintPanel(R.pl, t, u, false);
    paintPanel(R.pr, t, u, true);
    paintVesuvius(t, u);
    paintSalve(t, u);
  }

  // ------------------------------------------------------------------ guilloche (two-strand braid) along a band
  // horizontal band from x0..x1 centred on cy (or vertical when vert=true: then x0..x1 are y-range, cy is the x centre)
  function guilloche(x0, x1, cy, vert, n, amp, colA, colB) {
    const P = (x1 - x0) / n;
    const pt = (s, sgn) => {
      const y = cy + sgn * amp * Math.sin((2 * Math.PI * (s - x0)) / P);
      return vert ? [y, s] : [s, y];
    };
    const strand = (sgn, a, b) => {
      const pts = [];
      for (let s = a; s <= b + 0.01; s += 3) pts.push(pt(Math.min(s, b), sgn));
      return pts;
    };
    const drawS = (sgn, a, b, col) => {
      const pts = strand(sgn, a, b);
      lineS(pts, C.black, 25, 'butt');
      lineS(pts, col, 9, 'butt');
    };
    drawS(1, x0, x1, colA);
    drawS(-1, x0, x1, colB);
    // over/under at each crossing (crossings at s = x0 + k*P/2)
    for (let k = 1; k < 2 * n; k++) {
      const xc = x0 + (k * P) / 2;
      const top = k % 2 ? 1 : -1;
      drawS(top, xc - P * 0.2, xc + P * 0.2, top > 0 ? colA : colB);
    }
    // eyes of the braid
    for (let k = 0; k < 2 * n; k++) {
      const xc = x0 + ((k + 0.5) * P) / 2;
      const p = vert ? [cy, xc] : [xc, cy];
      ellF(p[0], p[1], 4.6, 4.6, C.white);
    }
  }

  // ------------------------------------------------------------------ Roman capitals, laid as single-stroke tesserae lines
  const GLY = {
    C: { w: 50, d: (X0, h) => { X.beginPath(); X.arc(X0 + 27, h / 2, h / 2 - 3, Math.PI * 0.27, Math.PI * 1.73); return 'arc'; } },
    A: { w: 54, s: [[[0, 64], [27, 0], [54, 64]], [[12, 42], [42, 42]]] },
    V: { w: 52, s: [[[0, 0], [26, 64], [52, 0]]] },
    E: { w: 40, s: [[[38, 0], [3, 0], [3, 64], [40, 64]], [[3, 32], [30, 32]]] },
    L: { w: 38, s: [[[3, 0], [3, 64], [38, 64]]] },
    X: { w: 48, s: [[[0, 0], [48, 64]], [[48, 0], [0, 64]]] },
    I: { w: 12, s: [[[6, 0], [6, 64]]] },
    S: { w: 42, d: () => { X.beginPath(); const p = new Path2D('M38 9 C30 -1 6 -1 6 16 C6 31 38 31 38 48 C38 66 10 66 2 54'); X.stroke(p); return 'path'; }, pre: true },
  };
  function glyph(ch, x, y, col, sw = 13) {
    const g = GLY[ch];
    if (!g) return 0;
    X.save();
    X.translate(x, y);
    if (g.d) {
      X.strokeStyle = col; X.lineWidth = sw; X.lineCap = 'butt';
      if (g.d(0, 64) === 'arc') X.stroke();
    } else {
      g.s.forEach((st) => (g.smooth ? curveS(st, col, sw) : lineS(st, col, sw, 'square')));
      // serifs on the free stem ends
      if ('AVXIL'.includes(ch)) {
        const ends = ch === 'A' ? [[0, 64], [54, 64]] : ch === 'V' ? [[0, 0], [52, 0]] : ch === 'X' ? [[0, 0], [48, 0], [0, 64], [48, 64]] : ch === 'I' ? [[6, 0], [6, 64]] : [[3, 0]];
        ends.forEach(([ex, ey]) => lineS([[ex - 9, ey], [ex + 9, ey]], col, 7, 'butt'));
      }
    }
    X.restore();
    return g.w;
  }
  function wordW(str, gap = 14) {
    let w = 0;
    for (const ch of str) w += ch === ' ' ? 30 : GLY[ch].w + gap;
    return w - gap;
  }

  // ------------------------------------------------------------------ the guard dog (frontal, sitting up, paws "palms up")
  function paintDog(t, u) {
    const G = V.G;
    const pl = G.pulse(t, 6);
    const by = 6 * pl; // sits into each beat
    const tilt = G.tilt(t, 0.1);
    const aL = G.arm(t, 0).y, aR = G.arm(t, 1).y;
    const say = G.say(t);
    X.save();
    X.translate(960, 0);
    // ground shadow
    ellF(10, 908, 250, 30, C.lgrey);
    ellF(4, 903, 196, 20, C.grey);
    // wall ring + chain (chained to the wall at upper left)
    const ringX = -244, ringY = 318;
    rectF(ringX - 14, ringY - 14, 28, 28, C.char);
    X.beginPath(); X.arc(ringX, ringY + 20, 12, 0, Math.PI * 2); X.strokeStyle = C.ochre; X.lineWidth = 8; X.stroke();
    const sag = 58 + 18 * pl + 6 * Math.sin(t * Math.PI * 2);
    const c0 = [ringX + 2, ringY + 32], c1 = [-34, 484 + by];
    const chain = [];
    for (let k = 0; k <= 40; k++) {
      const q = k / 40;
      chain.push([V.lerp(c0[0], c1[0], q), V.lerp(c0[1], c1[1], q) + sag * Math.sin(Math.PI * q)]);
    }
    const links = V.resample(chain, 19);
    for (let k = 0; k < links.length - 1; k++) {
      const a = links[k], b = links[k + 1];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (k % 2 === 0) {
        X.beginPath(); X.ellipse(mx, my, 13, 8, ang, 0, Math.PI * 2);
        X.strokeStyle = C.black; X.lineWidth = 7; X.stroke();
      } else lineS([[mx - Math.cos(ang) * 11, my - Math.sin(ang) * 11], [mx + Math.cos(ang) * 11, my + Math.sin(ang) * 11]], C.grey, 9);
    }
    // tail, out to the right and wagging on the beat
    const wag = Math.sin(Math.PI * G.b(t) * 2);
    const tail = [[70, 872 + by]];
    for (let k = 1; k <= 7; k++) {
      const q = k / 7;
      const ang = -0.05 - q * (1.25 + 0.45 * wag);
      const p = tail[k - 1];
      tail.push([p[0] + Math.cos(ang) * 24, p[1] + Math.sin(ang) * 24]);
    }
    curveS(tail, C.black, 26);
    curveS(tail.slice(1, 7).map((p) => [p[0] - 3, p[1] - 8]), C.grey, 9);
    // haunches + hind paws
    [-1, 1].forEach((sd) => {
      ellF(sd * 78, 812 + by, 74, 84, C.black, sd * -0.18);
      ellF(sd * 106, 894, 48, 19, C.black);
      lineS([[sd * 88, 888], [sd * 88, 904]], C.grey, 9, 'butt');
      lineS([[sd * 116, 886], [sd * 116, 904]], C.grey, 9, 'butt');
    });
    ellF(0, 842 + by, 92, 52, C.black);
    // torso
    const tor = [[-54, 458], [-70, 520], [-80, 600], [-76, 680], [-66, 760], [0, 790], [66, 760], [76, 680], [80, 600], [70, 520], [54, 458]];
    curveF(tor.map((p) => [p[0], p[1] + by * (p[1] > 600 ? 1 : 0.6)]), C.black);
    // light contour rows (Cave Canem style)
    [-1, 1].forEach((sd) => {
      curveS([[sd * 28, 768 + by], [sd * 70, 742 + by], [sd * 118, 770 + by], [sd * 146, 830 + by]], C.grey, 10);
      for (let k = 0; k < 3; k++) curveS([[sd * 22, 610 + k * 30 + by], [sd * 46, 618 + k * 30 + by], [sd * 60, 636 + k * 30 + by]], C.char, 10);
    });
    curveS([[0, 520 + by], [-5, 590 + by], [0, 660 + by]], C.grey, 10);
    // forelegs: fixed elbow at the flank, forearm pivots — the 67
    const leg = (sd, ay) => {
      const sx = sd * 50, sy = 530 + by * 0.7;
      const ex = sd * 92, ey = 614 + by;
      const th = -(0.04 + 0.46 * ay);
      const L2 = 80;
      const hx = ex + sd * Math.cos(th) * L2, hy = ey + Math.sin(th) * L2;
      lineS([[sx, sy], [ex, ey]], C.black, 56);
      lineS([[ex, ey], [hx, hy]], C.black, 42);
      // light contour along the outer edge of the leg
      lineS([[sx + sd * 24, sy - 8], [ex + sd * 22, ey - 6]], C.grey, 10);
      const nx = Math.sin(th), ny = -Math.cos(th);
      lineS([[ex + sd * 8 + nx * 14, ey + ny * 14], [hx - sd * 12 + nx * 13, hy + ny * 13]], C.grey, 10);
      // paw turned up: pads on top
      const ca = Math.cos(th), sa = Math.sin(th);
      const px = hx + sd * ca * 16, py = hy + sa * 16;
      ellF(px, py, 40, 25, C.black, sd > 0 ? th : -th);
      ellF(px - sd * ca * 2, py - 5 + sa * -2, 15, 10, C.red, sd > 0 ? th : -th);
      for (let q = 0; q < 4; q++) {
        const off = (q - 1.5) * 11;
        const tx = px + sd * ca * 24 + sa * off * sd, ty = py + sa * 24 - ca * off - 6;
        ellF(tx, ty, 6.5, 6.5, C.flesh);
      }
    };
    leg(-1, aL);
    leg(1, aR);
    // neck
    curveF([[-58, 480 + by], [-62, 420], [0, 404], [62, 420], [58, 480 + by], [0, 492 + by]], C.black);
    // red collar with studs + bronze ring
    const col = [];
    for (let k = 0; k <= 16; k++) { const q = k / 16; col.push([V.lerp(-62, 62, q), 468 + by * 0.6 + 13 * Math.sin(Math.PI * q)]); }
    lineS(col, C.red, 24, 'butt');
    for (let k = 3; k < 16; k += 3) ellF(col[k][0], col[k][1], 5.5, 5.5, C.white);
    X.beginPath(); X.arc(-34, 492 + by, 10, 0, Math.PI * 2); X.strokeStyle = C.ochre; X.lineWidth = 7; X.stroke();
    // head (tilts toward the high paw), enlarged so each feature spans whole tesserae
    X.save();
    X.translate(0, 452 + by * 0.5);
    X.rotate(tilt);
    X.scale(1.2, 1.2);
    X.translate(0, -452);
    const flap = 0.2 * pl;
    ellF(0, 342, 62, 58, C.black);
    ellF(0, 390, 56, 42, C.black);
    // brows + eyes (deadpan stare)
    const blink = u > 2.86 && u < 2.98;
    [-1, 1].forEach((sd) => {
      lineS([[sd * 12, 312], [sd * 46, 309]], C.grey, 8);
      if (blink) lineS([[sd * 12, 337], [sd * 48, 337]], C.grey, 8);
      else {
        ellF(sd * 29, 336, 20, 13.5, C.white);
        ellF(sd * 29, 337, 7.5, 7.5, C.black);
      }
    });
    // nose + mouth + tongue (longer on "seven")
    // greying muzzle (old guard dog) so the snout reads against the black head
    curveF([[-30, 372], [-38, 404], [-28, 432], [0, 440], [28, 432], [38, 404], [30, 372], [0, 364]], C.grey);
    ellF(0, 392, 21, 13, C.black);
    ellF(-7, 387, 6, 4, C.white);
    lineS([[0, 404], [0, 420]], C.black, 7);
    curveS([[-26, 424], [-12, 430], [0, 420], [12, 430], [26, 424]], C.black, 7);
    const tl = say.n === 7 ? 30 + 10 * say.env : 20;
    curveF([[-13, 432], [-15, 432 + tl * 0.7], [0, 436 + tl], [15, 432 + tl * 0.7], [13, 432]], C.red);
    ellF(-20, 427, 4.5, 6, C.white);
    ellF(20, 427, 4.5, 6, C.white);
    // floppy ears hanging beside the face, inner edge picked out in a light contour row
    [-1, 1].forEach((sd) => {
      X.save();
      X.translate(sd * 40, 296);
      X.rotate(sd * flap);
      X.translate(-sd * 40, -296);
      curveF([[sd * 30, 292], [sd * 64, 284], [sd * 96, 316], [sd * 116, 370], [sd * 112, 406], [sd * 88, 398], [sd * 70, 352], [sd * 44, 318]], C.black);
      curveS([[sd * 46, 314], [sd * 72, 348], [sd * 90, 392]], C.grey, 8);
      X.restore();
    });
    X.restore();
    X.restore();
  }

  function paintEmblema(t, u) {
    const r = R.emb, s = r.s;
    rectF(r.x, r.y, r.w, r.h, C.black);
    ring(r, 1, 1, C.cream);
    // braid band (tiles 2..7)
    const [bx, by, bw, bh] = inner(r, 2);
    rectF(bx, by, bw, bh, C.cream);
    const [ix, iy, iw, ih] = inner(r, 8);
    rectF(ix, iy, iw, ih, C.black);
    X.save();
    X.beginPath(); X.rect(bx, by, bw, bh); X.rect(ix, iy, iw, ih); X.clip('evenodd');
    const cH = by + 3 * s, cB = by + bh - 3 * s, cL = bx + 3 * s, cR = bx + bw - 3 * s;
    guilloche(bx + 6 * s, bx + bw - 6 * s, cH, false, 9, 15, C.red, C.ochre);
    guilloche(bx + 6 * s, bx + bw - 6 * s, cB, false, 9, 15, C.red, C.ochre);
    guilloche(by + 6 * s, by + bh - 6 * s, cL, true, 12, 15, C.red, C.ochre);
    guilloche(by + 6 * s, by + bh - 6 * s, cR, true, 12, 15, C.red, C.ochre);
    // corner blocks
    [[bx, by], [bx + bw - 6 * s, by], [bx, by + bh - 6 * s], [bx + bw - 6 * s, by + bh - 6 * s]].forEach(([x, y]) => {
      rectF(x, y, 6 * s, 6 * s, C.black);
      rectF(x + s, y + s, 4 * s, 4 * s, C.red);
      rectF(x + 2 * s, y + 2 * s, 2 * s, 2 * s, C.ochre);
    });
    X.restore();
    // picture field
    const [px, py, pw, ph] = inner(r, 9);
    rectF(px, py, pw, ph, C.cream);
    X.save();
    X.beginPath(); X.rect(px, py, pw, ph); X.clip();
    // inscription CAVE · LXVII  (VI lights on "six", VII on "seven")
    const say = V.G.say(t);
    const lit = say.k < 0.8 ? (say.n === 6 ? [2, 3] : [2, 3, 4]) : [];
    const total = wordW('CAVE') + 56 + wordW('LXVII');
    let x = 960 - total / 2;
    const ty = 168;
    for (const ch of 'CAVE') x += glyph(ch, x, ty, C.black) + 14;
    x += 21;
    polyF([[x, ty + 26], [x + 14, ty + 33], [x, ty + 40]], C.red);
    x += 35;
    [...'LXVII'].forEach((ch, i) => { x += glyph(ch, x, ty, lit.includes(i) ? C.red : C.black) + 14; });
    paintDog(t, u);
    X.restore();
  }
  function paintPanel(r, t, u, flip) {
    const s = r.s;
    rectF(r.x, r.y, r.w, r.h, C.black);
    const [bx, by, bw, bh] = inner(r, 1);
    rectF(bx, by, bw, bh, C.cream);
    meander(r, 1);
    ring(r, 6, 1, C.red);
    const [ix, iy, iw, ih] = inner(r, 7);
    rectF(ix, iy, iw, ih, C.cream);
    X.save();
    X.beginPath(); X.rect(ix, iy, iw, ih); X.clip();
    if (flip) { X.translate(ix + iw, iy); X.scale(-1, 1); } else X.translate(ix, iy);
    paintCitizen(t, u, flip);
    X.restore();
  }

  // running Greek key in a 5-tile ring band starting at tile inset k0 (black on cream), with corner blocks
  function meander(r, k0) {
    const s = r.s;
    const unit = [[[0, 0], [0, 4]], [[0, 0], [4, 0]], [[4, 0], [4, 2]], [[4, 2], [2, 2]], [[2, 2], [2, 4]], [[2, 4], [6, 4]]];
    const side = (len, map) => {
      const n = Math.floor(len / 6), off = Math.floor((len - n * 6) / 2);
      for (let k = 0; k < n; k++) unit.forEach(([a, b]) => lineS([map(off + k * 6 + a[0], a[1]), map(off + k * 6 + b[0], b[1])], C.black, s, 'square'));
      lineS([map(off + n * 6, 0), map(off + n * 6, 4)], C.black, s, 'square');
    };
    const c0 = k0 + 5;
    const lenX = r.nx - 2 * c0, lenY = r.ny - 2 * c0;
    const tc = (i, j) => [r.x + (i + 0.5) * s, r.y + (j + 0.5) * s];
    side(lenX, (a, b) => tc(c0 + a, k0 + b));
    side(lenX, (a, b) => tc(r.nx - 1 - c0 - a, r.ny - 1 - k0 - b));
    side(lenY, (a, b) => tc(k0 + b, r.ny - 1 - c0 - a));
    side(lenY, (a, b) => tc(r.nx - 1 - k0 - b, c0 + a));
    [[k0, k0], [r.nx - k0 - 5, k0], [k0, r.ny - k0 - 5], [r.nx - k0 - 5, r.ny - k0 - 5]].forEach(([i, j]) => {
      rectF(r.x + i * s, r.y + j * s, 5 * s, 5 * s, C.black);
      rectF(r.x + (i + 1) * s, r.y + (j + 1) * s, 3 * s, 3 * s, C.cream);
      rectF(r.x + (i + 2) * s, r.y + (j + 2) * s, s, s, C.red);
    });
  }

  // ------------------------------------------------------------------ Pompeian citizens in toga praetexta (profile, facing the dog)
  // local coords: panel interior 342 x 432, figure faces +x. old=true -> mirrored (right panel), older bearded man with laurel.
  function paintCitizen(t, u, old) {
    const G = V.G;
    const pl = G.pulse(t, 6);
    const by = 5 * pl;
    // screen-left hand: left figure -> far hand, right (mirrored) figure -> near hand
    const yFar = G.arm(t, old ? 1 : 0).y, yNear = G.arm(t, old ? 0 : 1).y;
    const say = G.say(t);
    const torso = [[132, 212], [78, 246], [52, 320], [44, 372], [248, 372], [242, 300], [222, 246], [184, 214]];
    X.save();
    X.translate(-16, 0);
    // wall shadow (light from upper left)
    X.save();
    X.translate(18, 12 + by);
    ellF(150, 128, 54, 60, C.lgrey);
    polyF(torso, C.lgrey);
    X.restore();
    X.save();
    X.translate(0, by);
    const forearm = (ex, ey, yy, back) => {
      const th = -(0.04 + 0.5 * yy);
      const L = 92;
      const hx = ex + Math.cos(th) * L, hy = ey + Math.sin(th) * L;
      lineS([[ex, ey], [hx, hy]], C.dred, 30);
      lineS([[ex, ey], [hx, hy]], back ? C.dred : C.red, 18);
      if (!back) lineS([[ex + 10, ey - 6], [hx - 8, hy - 6]], C.flesh, 6);
      // open hand, palm up: cupped palm, fingers curling up at the tips, thumb raised
      const ca = Math.cos(th), sa = Math.sin(th);
      const px = hx + ca * 12, py = hy + sa * 12;
      ellF(px, py, 22, 12, C.dred, th);
      ellF(px - sa * 3, py - 4, 17, 7, back ? C.red : C.flesh, th);
      lineS([[px + ca * 16, py + sa * 16], [px + ca * 30 + sa * 1, py + sa * 30 - 2], [px + ca * 37 + sa * 6, py + sa * 37 - 12]], C.dred, 10);
      lineS([[px - ca * 6, py - sa * 6 - 7], [px - ca * 2, py - sa * 2 - 20]], C.dred, 8);
    };
    forearm(198, 322, yFar, true);
    // toga
    polyF(torso, C.white);
    polyF([[132, 212], [78, 246], [52, 320], [44, 372], [100, 372], [96, 300], [112, 236]], C.lgrey);
    lineS(torso.concat([torso[0]]), C.char, 7);
    curveS([[92, 252], [150, 312], [222, 354]], C.grey, 7);
    curveS([[62, 316], [118, 348], [168, 372]], C.grey, 7);
    curveS([[160, 236], [200, 250], [230, 264]], C.grey, 7);
    curveS([[126, 226], [182, 270], [244, 312]], C.red, 14);
    // near upper arm in a fold of the toga
    polyF([[166, 250], [210, 256], [222, 334], [186, 340]], C.white);
    lineS([[166, 250], [186, 340], [222, 334], [210, 256]], C.char, 7);
    curveS([[184, 272], [194, 304], [200, 330]], C.grey, 7);
    forearm(212, 334, yNear, false);
    // neck + head (nods toward the high hand)
    polyF([[132, 176], [180, 180], [184, 222], [134, 222]], C.red);
    lineS([[136, 186], [136, 220]], C.dred, 7);
    X.save();
    X.translate(156, 206);
    X.rotate(G.tilt(t, 0.09) * (old ? -1 : 1));
    X.translate(-156, -206);
    ellF(150, 128, 52, 58, C.red);
    const face = [[150, 70], [186, 76], [202, 106], [199, 116], [218, 146], [204, 154], [205, 162], [199, 166], [204, 172], [196, 188], [168, 196], [140, 184]];
    polyF(face, C.red);
    ellF(186, 90, 13, 9, C.flesh);
    ellF(180, 142, 15, 10, C.flesh);
    lineS([[204, 116], [214, 142]], C.flesh, 6);
    lineS(face.slice(1), C.dred, 7);
    // eye: wide open, deadpan
    ellF(191, 117, 11, 7.5, C.white);
    ellF(196, 117, 5, 5.5, C.black);
    lineS([[176, 103], [201, 102]], C.dred, 7);
    lineS([[193, 166], [203, 166]], C.dred, 5);
    // ear
    ellF(146, 128, 11, 16, C.red);
    curveS([[142, 117], [153, 126], [146, 140]], C.dred, 6);
    if (old) {
      polyF([[98, 142], [100, 96], [120, 70], [152, 60], [184, 64], [204, 82], [190, 88], [172, 82], [158, 94], [146, 116], [138, 152], [122, 168], [104, 162]], C.grey);
      for (let k = 0; k < 4; k++) curveS([[112 + k * 13, 86 + (k % 2) * 6], [118 + k * 13, 98], [112 + k * 13, 110]], C.char, 6);
      polyF([[140, 180], [166, 200], [196, 196], [202, 180], [190, 172], [164, 172]], C.char);
      // laurel wreath
      curveS([[100, 116], [118, 82], [156, 66], [196, 72]], C.dochre, 6);
      for (let k = 0; k < 7; k++) {
        const a = -2.75 + k * 0.32;
        ellF(150 + Math.cos(a) * 54, 126 + Math.sin(a) * 58, 9, 5, C.green, a + 1.35);
      }
    } else {
      polyF([[98, 142], [100, 96], [118, 70], [150, 58], [184, 62], [206, 80], [192, 90], [172, 84], [160, 96], [148, 120], [140, 152], [124, 168], [104, 162]], C.black);
      for (let k = 0; k < 4; k++) curveS([[114 + k * 14, 76 + (k % 2) * 6], [121 + k * 14, 88], [114 + k * 14, 100]], C.char, 6);
    }
    X.restore();
    X.restore();
    X.restore();
    // parapet in front (foreground)
    rectF(0, 366, 342, 80, C.ochre);
    rectF(0, 366, 342, 7, C.white);
    rectF(0, 373, 342, 6, C.dochre);
    rectF(0, 420, 342, 12, C.dochre);
    // "VI" / "VII" scratched on the parapet like graffiti, flashing with the count
    if (say.k < 0.7) {
      const word = say.n === 6 ? 'VI' : 'VII';
      X.save();
      if (old) { X.translate(342, 0); X.scale(-1, 1); }
      const sc = 0.5;
      const ww = wordW(word, 12) * sc;
      X.translate(old ? 342 - 40 - ww : 40, 384);
      X.scale(sc, sc);
      let xx = 0;
      for (const ch of word) xx += glyph(ch, xx, 0, C.dred, 15) + 12;
      X.restore();
    }
  }

  function paintVesuvius(t, u) {
    const r = R.ves, s = r.s;
    rectF(r.x, r.y, r.w, r.h, C.black);
    ring(r, 1, 1, C.red);
    const [ix, iy, iw, ih] = inner(r, 2);
    rectF(ix, iy, iw, ih, C.cream);
    X.save();
    X.beginPath(); X.rect(ix, iy, iw, ih); X.clip();
    X.translate(ix, iy);
    const G = V.G;
    // sea (bay of Naples) with drifting wave tesserae
    rectF(0, 156, iw, 40, C.green);
    for (let k = -1; k < 12; k++) {
      const x = k * 40 + ((t * 18) % 40);
      lineS([[x, 168], [x + 14, 165]], C.white, 6);
    }
    // smoke: a column rising from the crater and drifting right with the wind; the two leading billows bob in 67 rhythm
    const puffs = [];
    for (let k = 0; k < 7; k++) {
      const q = V.fract(k / 7 + t * 0.22);
      puffs.push([212 + q * q * 120 + 4 * Math.sin(q * 9 + t * 2), 40 - q * 28 + 4 * q * q, 8 + q * 13]);
    }
    puffs.sort((a, b) => a[2] - b[2]).forEach(([px, py, pr], k) => {
      ellF(px, py, pr + 5, pr * 0.8 + 5, C.char);
      ellF(px - 2, py - 2, pr, pr * 0.8, C.grey);
      ellF(px - 5, py - 4, pr * 0.55, pr * 0.4, C.lgrey);
    });
    [[0, 330], [1, 386]].forEach(([sd, px]) => {
      const py = 22 - 7 * G.arm(t, sd).y;
      ellF(px, py, 30, 17, C.char);
      ellF(px - 3, py - 3, 24, 12, C.grey);
      ellF(px - 8, py - 6, 12, 5, C.lgrey);
    });
    // the mountain: dark volcanic rock, vine-clad lower slopes, glowing crater
    const mt = [[40, 162], [128, 114], [184, 54], [240, 54], [296, 114], [392, 162]];
    polyF(mt, C.black);
    polyF([[70, 162], [120, 128], [306, 128], [366, 162]], C.green);
    for (let k = 0; k < 12; k++) ellF(112 + k * 18, 142 + (k % 2) * 8, 3.8, 3.8, C.black);
    curveS([[184, 64], [152, 98], [126, 124]], C.grey, 7);
    curveS([[240, 64], [262, 92]], C.char, 7);
    rectF(192, 46, 40, 9, C.red);
    ellF(212, 44, 11, 4, C.ochre);
    // far headland on the left
    polyF([[0, 160], [0, 128], [40, 136], [90, 160]], C.lgrey);
    // little Pompeii on the shore
    [[304, 140], [328, 144], [352, 139], [376, 144]].forEach(([x, y]) => {
      rectF(x, y, 18, 10, C.white);
      polyF([[x - 2, y], [x + 9, y - 7], [x + 20, y]], C.red);
    });
    X.restore();
  }

  function paintSalve(t, u) {
    const r = R.sal, s = r.s;
    rectF(r.x, r.y, r.w, r.h, C.black);
    const [x, y, w, h] = inner(r, 1);
    rectF(x, y, w, h, C.cream);
    // tabula ansata
    const tx = r.x + 9 * s, ty = r.y + 3 * s, tw = r.w - 18 * s, th = r.h - 6 * s, cy = ty + th / 2;
    polyF([[tx, cy - 22], [tx - 54, cy - 46], [tx - 54, cy + 46], [tx, cy + 22]], C.red);
    polyF([[tx + tw, cy - 22], [tx + tw + 54, cy - 46], [tx + tw + 54, cy + 46], [tx + tw, cy + 22]], C.red);
    rectF(tx, ty, tw, th, C.black);
    rectF(tx + s, ty + s, tw - 2 * s, th - 2 * s, C.cream);
    const ww = wordW('SALVE');
    let xx = r.x + r.w / 2 - ww / 2;
    for (const ch of 'SALVE') xx += glyph(ch, xx, cy - 32, C.black) + 14;
  }

  // ------------------------------------------------------------------ tessellation
  // returns batches: col[key] = [x0,y0,x1,y1,x2,y2,x3,y3, ...]
  const BATCH = [];
  for (let i = 0; i < NP * NV; i++) BATCH.push([]);
  let IMPR = [], GLINT = [[], [], []];
  function sweepAt(x, y, u) {
    // diagonal band of raking light travelling across the floor
    const pos = V.lerp(-500, 2700, V.clamp((u + 0.35) / 4.7));
    const d = (x * 0.89 + y * 0.46) - pos;
    return Math.exp(-(d * d) / (2 * 150 * 150));
  }
  function layTiles(u) {
    for (const b of BATCH) b.length = 0;
    IMPR = [];
    GLINT = [[], [], []];
    for (const r of REG) {
      const s = r.s, g = s > 7 ? 1.05 : 0.85;
      for (let j = 0; j < r.ny; j++) {
        const rowOff = (hh(j, r.id, 91) - 0.5) * 1.6;
        for (let i = 0; i < r.nx; i++) {
          const h1 = hh(i, j, r.id * 16 + 1), h2 = hh(i, j, r.id * 16 + 2), h3 = hh(i, j, r.id * 16 + 3), h4 = hh(i, j, r.id * 16 + 4);
          let cx = r.x + (i + 0.5) * s, cy = r.y + (j + 0.5) * s;
          if (r.hole && cx > r.hole[0] && cx < r.hole[0] + r.hole[2] && cy > r.hole[1] && cy < r.hole[1] + r.hole[3]) continue;
          const jit = s / 9;
          cx += ((h1 - 0.5) * 1.3 + rowOff) * jit;
          cy += (h2 - 0.5) * 1.3 * jit;
          let th = (h3 - 0.5) * 0.09;
          const sx = cx / SS, sy = cy / SS;
          const d = (dAt(sx, sy) + 0.5) * SS;
          // keep the outermost ring on the straight grid
          const edgeRing = i < 1 || j < 1 || i >= r.nx - 1 || j >= r.ny - 1;
          if (!edgeRing && d < 2.6 * s) {
            const gx = dAt(sx + 1, sy) - dAt(sx - 1, sy), gy = dAt(sx, sy + 1) - dAt(sx, sy - 1);
            const gl = Math.hypot(gx, gy);
            if (gl > 0.7) {
              const nx = gx / gl, ny = gy / gl;
              const k = Math.floor(d / s), tgt = (k + 0.5) * s;
              const mv = V.clamp(tgt - d, -s * 0.5, s * 0.5);
              cx += nx * mv; cy += ny * mv;
              const a = Math.atan2(ny, nx);
              const wgt = V.smooth(2.6 * s, 1.6 * s, d);
              // rotate toward the contour (mod 90°)
              let da = a - Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
              th += da * wgt;
            }
          }
          let L = labAt(cx, cy);
          if (L === NONE) continue;
          // priority probe: a 1-tile accent line (eye white, contour row, tongue) must win the tile it crosses
          {
            const o = s * 0.32;
            const cand = [labAt(cx - o, cy), labAt(cx + o, cy), labAt(cx, cy - o), labAt(cx, cy + o)];
            let best = L;
            for (const c of cand) if (c !== NONE && PRI[c] >= PRI[L] + 2 && PRI[c] > PRI[best]) best = c;
            L = best;
          }
          const a = s * 0.5 - g, hw = a * (0.86 + 0.16 * h4), hv = a * (0.86 + 0.16 * hh(i, j, r.id * 16 + 5));
          const co = Math.cos(th), si = Math.sin(th);
          const q = [];
          const corners = [[-hw, -hv], [hw, -hv], [hw, hv], [-hw, hv]];
          for (let c = 0; c < 4; c++) {
            const jx = (hh(i, j, r.id * 16 + 6 + c) - 0.5) * 1.3 * jit, jy = (hh(i, j, r.id * 16 + 10 + c) - 0.5) * 1.3 * jit;
            const px = corners[c][0] + jx, py = corners[c][1] + jy;
            q.push(cx + px * co - py * si, cy + px * si + py * co);
          }
          if (lacAt(cx, cy)) { IMPR.push(q); continue; }
          const vi = Math.floor(hh(i, j, r.id * 16 + 14) * NV);
          const arr = BATCH[L * NV + vi];
          for (let c = 0; c < 8; c++) arr.push(q[c]);
          const sw = sweepAt(cx, cy, u);
          if (sw > 0.05) {
            const f = Math.pow(hh(i, j, r.id * 16 + 15), 2.2) * sw;
            if (f > 0.14) GLINT[f > 0.55 ? 2 : f > 0.3 ? 1 : 0].push(q);
          }
        }
      }
    }
  }
  const quadPath = (ctx, arr, ox = 0, oy = 0) => {
    for (let k = 0; k < arr.length; k += 8) {
      ctx.moveTo(arr[k] + ox, arr[k + 1] + oy);
      ctx.lineTo(arr[k + 2] + ox, arr[k + 3] + oy);
      ctx.lineTo(arr[k + 4] + ox, arr[k + 5] + oy);
      ctx.lineTo(arr[k + 6] + ox, arr[k + 7] + oy);
      ctx.closePath();
    }
  };
  const quadPathQ = (ctx, list) => {
    for (const q of list) {
      ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.lineTo(q[4], q[5]); ctx.lineTo(q[6], q[7]); ctx.closePath();
    }
  };

  // ------------------------------------------------------------------ static field: opus signinum (cached)
  function fieldGfx() {
    return V.gfx('roman_field', W, H, (ctx) => {
      const r = V.rng(7907);
      ctx.fillStyle = '#7c3524';
      ctx.fillRect(0, 0, W, H);
      // large mottling of the mortar
      for (let k = 0; k < 90; k++) {
        const x = r() * W, y = r() * H, rr = 60 + r() * 220;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
        const c = r() < 0.5 ? '150,70,44' : '86,34,22';
        g.addColorStop(0, `rgba(${c},${0.12 + r() * 0.14})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      // crushed terracotta chips + lime grains
      const chips = ['#94452d', '#6c2c1c', '#a65538', '#5c2417', '#8a3b26', '#b0644a'];
      for (let k = 0; k < 26000; k++) {
        const x = r() * W, y = r() * H, sz = 1.2 + r() * r() * 6;
        ctx.fillStyle = chips[(r() * chips.length) | 0];
        ctx.beginPath();
        const n = 4 + ((r() * 3) | 0), a0 = r() * 6.28;
        for (let q = 0; q < n; q++) {
          const a = a0 + (q / n) * 6.28, rr = sz * (0.6 + r() * 0.6);
          q ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.fill();
      }
      for (let k = 0; k < 5000; k++) {
        ctx.fillStyle = r() < 0.7 ? 'rgba(226,212,184,0.55)' : 'rgba(40,20,14,0.5)';
        const sz = 0.8 + r() * 1.6;
        ctx.fillRect(r() * W, r() * H, sz, sz);
      }
      // inlaid white tesserae: lozenge lattice (punteggiato a reticolo) + border fillet
      const tess = (x, y, rot) => {
        const s = 3.3 + r() * 0.7;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot + (r() - 0.5) * 0.25);
        ctx.fillStyle = 'rgba(30,12,8,0.45)';
        ctx.fillRect(-s + 1.2, -s + 1.4, s * 2, s * 2);
        const v = 0.8 + r() * 0.12;
        ctx.fillStyle = V.hex(236 * v, 222 * v, 198 * v);
        ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(-s, -s, s * 2, 1.3);
        ctx.restore();
      };
      const P = 150, st = 25;
      for (let c = -H; c < W + H; c += P) {
        for (let k = 0; k < 140; k++) {
          const x1 = c + k * st * 0.7071, y1 = k * st * 0.7071;
          if (x1 > -10 && x1 < W + 10 && y1 < H + 10) tess(x1, y1, Math.PI / 4);
          const x2 = c - k * st * 0.7071 + H, y2 = k * st * 0.7071;
          if (x2 > -10 && x2 < W + 10 && y2 < H + 10) tess(x2, y2, Math.PI / 4);
        }
      }
      // fillet line of white tesserae framing the room
      for (let x = 22; x < W - 14; x += 10.5) { tess(x, 18, 0); tess(x, H - 18, 0); }
      for (let y = 28; y < H - 14; y += 10.5) { tess(18, y, 0); tess(W - 18, y, 0); }
    });
  }

  // ------------------------------------------------------------------ camera (slow documentary push-in)
  const cam = (u) => {
    const k = 1 + 0.03 * V.E.io2(V.clamp((u + 0.35) / 4.7));
    return { k, ox: 960 * (1 - k), oy: 560 * (1 - k) };
  };

  // ------------------------------------------------------------------ draw the stone
  function drawMosaic(u) {
    const cm = cam(u);
    V.with2d((ctx) => {
      ctx.setTransform(cm.k, 0, 0, cm.k, cm.ox, cm.oy);
      ctx.drawImage(fieldGfx().canvas || fieldGfx().elt, 0, 0);
      // mortar bed of each panel
      for (const r of REG) {
        ctx.fillStyle = '#a69c86';
        ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      }
      // lacunae: exposed setting bed
      for (const l of LAC) {
        ctx.fillStyle = '#9c8f76';
        ctx.beginPath();
        for (let a = 0; a < 40; a++) {
          const an = (a / 40) * Math.PI * 2, rr = l.r * (0.55 + 0.55 * V.noise2(Math.cos(an) * 2 + l.x, Math.sin(an) * 2 + l.y));
          a ? ctx.lineTo(l.x + Math.cos(an) * rr, l.y + Math.sin(an) * rr) : ctx.moveTo(l.x + Math.cos(an) * rr, l.y + Math.sin(an) * rr);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(178,165,138,0.55)';
      ctx.beginPath();
      quadPathQ(ctx, IMPR);
      ctx.fill();
      // cast shadow of each tessera into the grout
      ctx.fillStyle = 'rgba(28,18,10,0.55)';
      ctx.beginPath();
      for (const b of BATCH) quadPath(ctx, b, 1.1, 1.3);
      ctx.fill();
      // stones
      for (let L = 0; L < NP; L++) {
        for (let v = 0; v < NV; v++) {
          const b = BATCH[L * NV + v];
          if (!b.length) continue;
          ctx.fillStyle = VAR[L][v];
          ctx.beginPath();
          quadPath(ctx, b);
          ctx.fill();
        }
      }
      // polished top edge catching the light
      ctx.strokeStyle = 'rgba(255,248,230,0.2)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (const b of BATCH) {
        for (let k = 0; k < b.length; k += 8) { ctx.moveTo(b[k + 6], b[k + 7]); ctx.lineTo(b[k], b[k + 1]); ctx.lineTo(b[k + 2], b[k + 3]); }
      }
      ctx.stroke();
      // glints under the raking light
      ctx.globalCompositeOperation = 'lighter';
      [0.1, 0.22, 0.36].forEach((a, lv) => {
        ctx.fillStyle = `rgba(255,236,200,${a})`;
        ctx.beginPath();
        quadPathQ(ctx, GLINT[lv]);
        ctx.fill();
      });
    });
  }

  function lightPass(u) {
    const pos = V.lerp(-500, 2700, V.clamp((u + 0.35) / 4.7));
    V.with2d((ctx) => {
      // band along the direction (0.89, 0.46)
      const nx = 0.89, ny = 0.46;
      const g = ctx.createLinearGradient(nx * (pos - 420), ny * (pos - 420), nx * (pos + 420), ny * (pos + 420));
      g.addColorStop(0, 'rgba(255,230,190,0)');
      g.addColorStop(0.5, 'rgba(255,232,196,0.07)');
      g.addColorStop(1, 'rgba(255,230,190,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }, { blend: 'screen' });
  }

  // ------------------------------------------------------------------ weathering, painted once with p5.brush, multiplied over the stone
  let WEAR = null;
  function ensureWear() {
    if (WEAR) return;
    V.flush();
    V.mReset();
    background(255);
    const r = V.rng(4242);
    const blob = (x, y, rx, ry, n = 18) => {
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2, q = 0.7 + 0.5 * r();
        pts.push([x + Math.cos(a) * rx * q, y + Math.sin(a) * ry * q]);
      }
      return pts;
    };
    // centuries of dirt and damp: soft watercolour stains (bleeding edges)
    const stains = [[300, 980, 260, 90], [1060, 1000, 280, 70], [1700, 620, 140, 220], [180, 520, 150, 260], [960, 120, 300, 70], [1560, 1040, 300, 60], [700, 760, 120, 160], [1250, 420, 110, 150]];
    stains.forEach(([x, y, rx, ry], k) => V.fill(blob(x, y, rx, ry), { color: k % 3 ? '#9a8466' : '#7d6a55', alpha: 0.2, flat: false, bleed: 0.3, tex: 0.7, border: 0.7, seed: 11 + k }));
    // lime bloom rings (darker edges of evaporated water)
    [[480, 420, 90, 70], [1500, 900, 120, 60]].forEach(([x, y, rx, ry], k) => V.fill(blob(x, y, rx, ry, 22), { color: '#a99577', alpha: 0.16, flat: false, bleed: 0.15, tex: 0.3, border: 1, seed: 31 + k }));
    // cracks in the bedding: dry ink, branching
    const crack = (x, y, ang, len, seed, w) => {
      const pts = [[x, y]];
      const rr = V.rng(seed);
      for (let k = 0; k < len; k++) {
        ang += (rr() - 0.5) * 0.7;
        const st = 10 + rr() * 14;
        x += Math.cos(ang) * st; y += Math.sin(ang) * st;
        pts.push([x, y]);
        if (rr() < 0.08 && w > 0.25) crack(x, y, ang + (rr() < 0.5 ? 0.9 : -0.9), (len - k) * 0.4, seed + k * 7, w * 0.6);
      }
      V.ink(pts, { brush: 'inkDry', w: w * 0.8, color: '#3a2b20', alpha: 0.55, seed, taper: [20, 40], wob: 1.2 });
      V.ink(pts.map((p) => [p[0] + 1.6, p[1] + 1.8]), { brush: 'HB', w: w * 0.6, color: '#b3a58c', alpha: 0.35, seed: seed + 1, taper: [20, 40] });
    };
    crack(30, 700, 0.35, 30, 501, 0.55);
    crack(1300, 870, 2.2, 14, 502, 0.45);
    crack(640, 30, 1.9, 9, 504, 0.35);
    // fine ash drifting in from the volcano side (top right) — spray
    for (let k = 0; k < 7; k++) {
      const y = 30 + k * 40;
      V.ink([[1300 + k * 30, y], [1700, y + 30], [1910, y + 10]], { brush: 'spray', w: 1.6, color: '#5d5751', alpha: 0.25, seed: 70 + k, taper: [80, 40] });
    }
    // soot / grime creeping along the bottom edge
    V.ink([[20, 1060], [700, 1050], [1300, 1064], [1900, 1052]], { brush: 'charcoal', w: 2.2, color: '#5a4836', alpha: 0.2, seed: 90, taper: [60, 60] });
    V.flush();
    WEAR = get();
  }

  V.scenes.roman = {
    draw(t, u, meta) {
      ensureWear();
      ensureSrc();
      paintCartoon(t, u);
      buildLabels();
      distField();
      layTiles(u);
      V.bg('#2a1a12');
      drawMosaic(u);
      const cm = cam(u);
      V.blit(WEAR, cm.ox, cm.oy, W * cm.k, H * cm.k, { blend: 'multiply' });
      lightPass(u);
      V.vignette({ amt: 0.42, color: '24,10,4', inner: 0.5 });
      V.grain({ amt: 0.1, anim: true });
    },
  };
})();
