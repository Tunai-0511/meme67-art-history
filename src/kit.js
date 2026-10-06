/* kit.js — shared drawing kit for the "67 through art history" film.
 * p5.js 2.x (WEBGL canvas) + p5.brush 2.x.  EVERYTHING on screen is drawn by code, frame by frame. No images, no external assets.
 *
 * Coordinates: 1920x1080, origin top-left, y down (main.js translates p5's WEBGL origin for us).
 * A tiny 2D matrix stack (V.push/translate/rotate/scale/pop) transforms *points* (not p5 state) so brush weights stay in screen px.
 * Never call p5's translate/rotate/scale yourself outside V.native().
 *
 * THREE ways to draw (mix freely, paint order = call order):
 *   1. p5.brush strokes/fills/hatches  — V.ink / V.fill / V.shape / V.hatch / V.dot   (or call `brush.*` directly, then V.pending = true)
 *   2. a full-frame 2D canvas layer    — V.with2d(ctx => {...})   raw Canvas2D: gradients, blur filters, pixel art, halftone, compositing
 *   3. native p5 calls                 — V.native(() => { rect(...) })  (screen coordinates, y down)
 * Brush strokes are queued by p5.brush and only composited when the brush colour changes or at frame end; V.with2d/V.text/V.native/V.blit
 * call V.flush() first so they land ON TOP of earlier strokes. Strokes issued AFTER a 2D layer land on top of that layer.
 */
(function () {
  const V = (window.V = window.V || {});
  V.W = 1920;
  V.H = 1080;
  V.FPS = 24;
  V.scenes = V.scenes || {};

  // ------------------------------------------------------------------ math
  V.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  V.lerp = (a, b, t) => a + (b - a) * t;
  V.smooth = (a, b, x) => {
    const t = V.clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  V.prog = (t, t0, d) => V.clamp((t - t0) / d); // 0..1 progress of a window starting at t0 lasting d
  V.map = (x, a, b, c, d) => c + ((x - a) / (b - a)) * (d - c);
  V.fract = (x) => x - Math.floor(x);
  V.E = {
    lin: (t) => t,
    in2: (t) => t * t,
    in3: (t) => t * t * t,
    out2: (t) => 1 - (1 - t) * (1 - t),
    out3: (t) => 1 - Math.pow(1 - t, 3),
    out4: (t) => 1 - Math.pow(1 - t, 4),
    io2: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: (t, s = 1.70158) => {
      const c = s + 1;
      return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
    },
    inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
    outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1),
    outBounce: (t) => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
  };
  V.hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  V.noise1 = (x) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return V.hash(i) * (1 - u) + V.hash(i + 1) * u;
  };
  /** seeded PRNG: const r = V.rng(7); r() -> 0..1 */
  V.rng = (seed) => {
    let s = seed | 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  /** 2D value noise (smooth), deterministic. */
  V.noise2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const h = (a, b) => V.hash(a * 57.31 + b * 113.77);
    return V.lerp(V.lerp(h(xi, yi), h(xi + 1, yi), u), V.lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
  };
  /** colour helpers: V.rgb('#d97757') -> [r,g,b]; V.mix(a,b,t) -> '#rrggbb' */
  V.rgb = (c) => {
    if (Array.isArray(c)) return c;
    const h = c.replace('#', '');
    const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
    return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
  };
  V.hex = (r, g, b) => '#' + [r, g, b].map((x) => Math.round(V.clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('');
  V.mix = (a, b, t) => {
    const A = V.rgb(a), B = V.rgb(b);
    return V.hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };

  // ------------------------------------------------------------ matrix stack
  const M = (V.M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  const stack = [];
  V.mReset = () => {
    Object.assign(M, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    stack.length = 0;
  };
  V.push = () => stack.push({ ...M });
  V.pop = () => Object.assign(M, stack.pop());
  V.translate = (x, y) => {
    M.e += M.a * x + M.c * y;
    M.f += M.b * x + M.d * y;
  };
  V.rotate = (r) => {
    const co = Math.cos(r), si = Math.sin(r);
    const a = M.a * co + M.c * si, b = M.b * co + M.d * si;
    const c = M.c * co - M.a * si, d = M.d * co - M.b * si;
    M.a = a; M.b = b; M.c = c; M.d = d;
  };
  V.scale = (sx, sy = sx) => {
    M.a *= sx; M.b *= sx; M.c *= sy; M.d *= sy;
  };
  V.tp = (x, y) => [M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f]; // local -> screen
  V.msc = () => Math.sqrt(Math.abs(M.a * M.d - M.b * M.c)) || 1;
  V.mang = () => Math.atan2(M.b, M.a);

  // ---------------------------------------------------------- global frame state
  V.tick = 0; // "boil" tick = floor(t*12): strokes re-seed when it changes (animation on twos). Use a constant seed for things that must NOT shimmer.
  V.T = 0; // current film time (seconds)
  V.lineMul = 1;
  V.pending = false;
  const onceKeys = {};
  /** run fn exactly once per page (per worker) — for brush.add(), pre-baked textures, etc. */
  V.once = (key, fn) => {
    if (key in onceKeys) return onceKeys[key];
    return (onceKeys[key] = fn());
  };

  // ---------------------------------------------------------------- brushes
  V.initBrushes = function () {
    brush.scaleBrushes(5); // built-ins: pen, rotring, 2B, HB, 2H, cpencil, charcoal, marker, marker2, spray, hatch_brush
    // clean ink pen (weight 1 ≈ 4px)
    brush.add('ink', { type: 'default', weight: 4, scatter: 0.08, sharpness: 1, grain: 20, opacity: 255, spacing: 0.05, pressure: [1, 1, 1], rotate: 'none', noise: 0.04 });
    // dry ink: rougher edge
    brush.add('inkDry', { type: 'default', weight: 4, scatter: 0.5, sharpness: 0.75, grain: 12, opacity: 235, spacing: 0.05, pressure: [1, 1, 1], rotate: 'none', noise: 0.18 });
    // soft graphite
    brush.add('lead', { type: 'default', weight: 3, scatter: 0.9, sharpness: 0.45, grain: 7, opacity: 110, spacing: 0.1, pressure: [0.6, 1, 0.6], rotate: 'none', noise: 0.4 });
    // opaque flat gouache/oil stroke (marker-type tip, hard edge, slight scatter) — weight 1 ≈ 12px
    brush.add('gouache', { type: 'marker', weight: 12, scatter: 0.3, opacity: 255, spacing: 0.12, pressure: [0.9, 1, 0.8], rotate: 'natural', noise: 0.05, markerTip: false });
    // bristle/impasto: wide, textured, streaky stroke — weight 1 ≈ 18px
    brush.add('bristle', { type: 'default', weight: 18, scatter: 1.4, sharpness: 0.8, grain: 6, opacity: 235, spacing: 0.06, pressure: [0.7, 1, 0.6], rotate: 'natural', noise: 0.22 });
  };

  V.resetBrush = function () {
    brush.noFill();
    brush.noHatch();
    brush.noWash();
    brush.noField();
    brush.noClip();
  };

  /** Force queued brush strokes to composite now, so 2D/native drawing lands on top of them. */
  let fk = 0;
  V.flush = function () {
    if (!V.pending) return;
    fk = (fk + 1) % 10;
    brush.set('ink', '#faf7f' + fk, 0.02);
    brush.line(-300, -300, -299, -300); // off-canvas, so it never shows
    V.pending = false;
  };
  /** raw p5 drawing in SCREEN coordinates (y down). Strokes drawn before are flushed first. */
  V.native = (fn) => {
    V.flush();
    push();
    fn();
    pop();
  };

  // ------------------------------------------------------------------ paths
  V.parsePath = function (d, step = 6) {
    const toks = d.match(/[MmLlHhVvCcSsQqTtZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
    let i = 0, cmd = '', cx = 0, cy = 0, sx = 0, sy = 0, lcx = 0, lcy = 0, lqx = 0, lqy = 0;
    const subs = [];
    let cur = null;
    const num = () => parseFloat(toks[i++]);
    const start = (x, y) => {
      cur = { pts: [[x, y]], closed: false };
      subs.push(cur);
    };
    const bez = (p0, p1, p2, p3) => {
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
      const n = Math.max(2, Math.ceil(len / step));
      for (let k = 1; k <= n; k++) {
        const t = k / n, u = 1 - t;
        cur.pts.push([
          u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ]);
      }
    };
    while (i < toks.length) {
      if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++];
      const rel = cmd === cmd.toLowerCase();
      const C = cmd.toUpperCase();
      if (C === 'Z') {
        if (cur) { cur.closed = true; cx = sx; cy = sy; }
        continue;
      }
      if (C === 'M') {
        let x = num(), y = num();
        if (rel) { x += cx; y += cy; }
        cx = sx = x; cy = sy = y; start(x, y);
        cmd = rel ? 'l' : 'L';
      } else if (C === 'L') {
        let x = num(), y = num();
        if (rel) { x += cx; y += cy; }
        if (!cur) start(cx, cy);
        const len = Math.hypot(x - cx, y - cy), n = Math.max(1, Math.ceil(len / step));
        for (let k = 1; k <= n; k++) cur.pts.push([cx + ((x - cx) * k) / n, cy + ((y - cy) * k) / n]);
        cx = x; cy = y;
      } else if (C === 'H') {
        let x = num(); if (rel) x += cx;
        const len = Math.abs(x - cx), n = Math.max(1, Math.ceil(len / step));
        for (let k = 1; k <= n; k++) cur.pts.push([cx + ((x - cx) * k) / n, cy]);
        cx = x;
      } else if (C === 'V') {
        let y = num(); if (rel) y += cy;
        const len = Math.abs(y - cy), n = Math.max(1, Math.ceil(len / step));
        for (let k = 1; k <= n; k++) cur.pts.push([cx, cy + ((y - cy) * k) / n]);
        cy = y;
      } else if (C === 'C') {
        let x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
        if (rel) { x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy; }
        bez([cx, cy], [x1, y1], [x2, y2], [x, y]);
        lcx = x2; lcy = y2; cx = x; cy = y;
      } else if (C === 'S') {
        let x2 = num(), y2 = num(), x = num(), y = num();
        if (rel) { x2 += cx; y2 += cy; x += cx; y += cy; }
        const x1 = /[CS]/i.test(cmd) ? 2 * cx - lcx : cx, y1 = /[CS]/i.test(cmd) ? 2 * cy - lcy : cy;
        bez([cx, cy], [x1, y1], [x2, y2], [x, y]);
        lcx = x2; lcy = y2; cx = x; cy = y;
      } else if (C === 'Q') {
        let x1 = num(), y1 = num(), x = num(), y = num();
        if (rel) { x1 += cx; y1 += cy; x += cx; y += cy; }
        bez([cx, cy], [cx + (2 / 3) * (x1 - cx), cy + (2 / 3) * (y1 - cy)], [x + (2 / 3) * (x1 - x), y + (2 / 3) * (y1 - y)], [x, y]);
        lqx = x1; lqy = y1; cx = x; cy = y;
      } else if (C === 'T') {
        let x = num(), y = num();
        if (rel) { x += cx; y += cy; }
        const x1 = 2 * cx - lqx, y1 = 2 * cy - lqy;
        bez([cx, cy], [cx + (2 / 3) * (x1 - cx), cy + (2 / 3) * (y1 - cy)], [x + (2 / 3) * (x1 - x), y + (2 / 3) * (y1 - y)], [x, y]);
        lqx = x1; lqy = y1; cx = x; cy = y;
      } else {
        i++;
      }
    }
    return subs;
  };

  /** Catmull-Rom through points -> dense polyline */
  V.smoothPts = function (pts, closed = false, per = 10) {
    const n = pts.length;
    if (n < 3) return pts.slice();
    const out = [];
    const get = (k) => (closed ? pts[(k + n) % n] : pts[Math.max(0, Math.min(n - 1, k))]);
    const segs = closed ? n : n - 1;
    for (let s = 0; s < segs; s++) {
      const p0 = get(s - 1), p1 = get(s), p2 = get(s + 1), p3 = get(s + 2);
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    out.push(closed ? out[0].slice() : pts[n - 1].slice());
    return out;
  };
  V.arcPts = function (cx, cy, rx, ry, a0, a1, n = 24) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return out;
  };
  V.ellipsePts = (cx, cy, rx, ry, n = 32) => V.arcPts(cx, cy, rx, ry, 0, Math.PI * 2, n).slice(0, n);
  V.rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  V.resample = function (pts, step) {
    if (pts.length < 2) return pts.slice();
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1];
    if (L < 1e-6) return [pts[0].slice()];
    const n = Math.max(1, Math.round(L / step));
    const out = [];
    let j = 0;
    for (let k = 0; k <= n; k++) {
      const s = (L * k) / n;
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const seg = cum[j + 1] - cum[j] || 1;
      const t = (s - cum[j]) / seg;
      out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t]);
    }
    return out;
  };
  V.subpaths = function (src, o = {}) {
    let subs;
    if (typeof src === 'string') subs = V.parsePath(src, o.parseStep || 5);
    else subs = [{ pts: src, closed: !!o.closed }];
    if (o.smooth) subs = subs.map((s) => ({ pts: V.smoothPts(s.pts, s.closed, o.per || 10), closed: s.closed }));
    return subs;
  };
  /** two-bone IK: shoulder S, target H, bone lengths l1,l2; dir = +1/-1 picks the elbow side. Returns {ex,ey,hx,hy} (hand clamped if out of reach). */
  V.ik = (sx, sy, hx, hy, l1, l2, dir = 1) => {
    let dx = hx - sx, dy = hy - sy;
    let d = Math.hypot(dx, dy) || 1e-6;
    const dmax = (l1 + l2) * 0.999, dmin = Math.abs(l1 - l2) + 0.001;
    const dd = V.clamp(d, dmin, dmax);
    if (dd !== d) { hx = sx + (dx / d) * dd; hy = sy + (dy / d) * dd; dx = hx - sx; dy = hy - sy; d = dd; }
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const mx = sx + (dx / d) * a, my = sy + (dy / d) * a;
    return { ex: mx + (-dy / d) * h * dir, ey: my + (dx / d) * h * dir, hx, hy };
  };

  // --------------------------------------------------------------- inking
  const taper = (x, len) => (len <= 0 ? 1 : 0.16 + 0.84 * V.smooth(0, len, x));

  /**
   * Stroke a path with a brush. src = SVG path string (no arcs) or [[x,y],...] (local coords).
   * o: w (weight multiplier; 'ink' 1 ≈ 4px), brush (any registered brush name), color, alpha (0..1), reveal (0..1 draw-on),
   *    from (0..1 erase from start), seed, wob (px wobble), taper [in,out] px, smooth (Catmull-Rom), closed, step, press, boil (re-wobble at 12Hz; default FALSE here)
   */
  V.ink = function (src, o = {}) {
    const op = { w: 1, brush: 'ink', color: '#15110e', alpha: 1, reveal: 1, from: 0, seed: 0, wob: 0.6, wobLen: 70, taper: [14, 20], step: 8, press: 1, boil: false, per: 10, head: 1 };
    Object.assign(op, o);
    const subs = V.subpaths(src, op);
    const wm = op.w * V.lineMul * Math.pow(V.msc(), 0.6);
    subs.forEach((sp, si) => {
      let pts = sp.pts.map((p) => V.tp(p[0], p[1]));
      if (sp.closed && pts.length > 2) pts.push(pts[0].slice());
      pts = V.resample(pts, op.step);
      if (pts.length < 2) return;
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = cum[cum.length - 1];
      if (L < 0.5) return;
      const s0 = op.from * L, s1 = Math.min(1, op.reveal) * L;
      if (s1 - s0 < 1.5) return;
      const seedBase = op.seed * 131 + si * 17 + (op.boil ? V.tick * 29 : 0);
      const out = [];
      const posAt = (s) => {
        let j = 0;
        while (j < cum.length - 2 && cum[j + 1] < s) j++;
        const seg = cum[j + 1] - cum[j] || 1, t = (s - cum[j]) / seg;
        return [pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t, j];
      };
      const done = op.reveal >= 0.999;
      const emit = (s) => {
        const [x, y, j] = posAt(s);
        const a = pts[j], b = pts[Math.min(pts.length - 1, j + 1)];
        let nx = -(b[1] - a[1]), ny = b[0] - a[0];
        const nl = Math.hypot(nx, ny) || 1;
        nx /= nl; ny /= nl;
        let off = (V.noise1(s / op.wobLen + seedBase * 0.37) - 0.5) * 2 * op.wob;
        if (sp.closed) off *= V.smooth(0, 26, s) * V.smooth(0, 26, L - s);
        const pIn = taper(s - s0, op.taper[0]);
        const pOut = done ? taper(L - s, op.taper[1]) : op.head;
        out.push([x + nx * off, y + ny * off, Math.max(0.05, pIn * pOut * op.press)]);
      };
      emit(s0);
      for (let i = 0; i < pts.length; i++) if (cum[i] > s0 + 2 && cum[i] < s1 - 2) emit(cum[i]);
      emit(s1);
      if (out.length < 2) return;
      randomSeed(seedBase);
      brush.set(op.brush, op.color, wm);
      if (op.alpha < 1) brush.stroke(V.withAlpha(op.color, op.alpha));
      brush.spline(out, 1);
      V.pending = true;
    });
  };
  V.withAlpha = (c, a) => {
    const [r, g, b] = V.rgb(c);
    return `rgba(${r},${g},${b},${a})`;
  };

  // ------------------------------------------------------------- filling
  /**
   * Fill a closed shape (local coords). o: color, alpha (0..1), flat (true = opaque-ish wash, fast; false = watercolour with bleed/texture),
   * bleed (0..1), tex (0..1), border (0..1), seed.
   */
  V.fill = function (src, o = {}) {
    const op = { color: '#d97757', alpha: 1, flat: true, bleed: 0.12, tex: 0.25, border: 0.25, seed: 1, smooth: false, per: 10, step: 7 };
    Object.assign(op, o);
    if (op.alpha <= 0.002) return;
    const subs = V.subpaths(src, Object.assign({}, op, { closed: true }));
    subs.forEach((sp, si) => {
      let pts = sp.pts.map((p) => V.tp(p[0], p[1]));
      if (pts.length < 3) return;
      pts = V.resample(pts.concat([pts[0].slice()]), op.step);
      pts.pop();
      if (pts.length < 3) return;
      randomSeed(op.seed * 101 + si);
      brush.noStroke();
      brush.noHatch();
      if (op.flat) {
        brush.noFill();
        brush.wash(op.color, Math.round(255 * op.alpha));
      } else {
        brush.noWash();
        brush.fill(op.color, Math.round(255 * op.alpha));
        brush.fillBleed(op.bleed);
        brush.fillTexture(op.tex, op.border);
      }
      brush.beginShape(0);
      pts.forEach((p) => brush.vertex(p[0], p[1]));
      brush.endShape(true);
      brush.noWash();
      brush.noFill();
      V.pending = true;
    });
  };

  /** Convenience: flat fill (+ optional watercolour mottling + optional brush outline) in the right paint order. */
  V.shape = function (src, o = {}) {
    const op = { fill: null, alpha: 1, water: false, ink: false, w: 1, seed: 1, reveal: 1, taper: [0, 0], wob: 0.6, smooth: false, closed: true };
    Object.assign(op, o);
    if (op.fill && op.alpha > 0.01) {
      V.fill(src, { color: op.fill, alpha: op.alpha, flat: true, seed: op.seed, smooth: op.smooth });
      if (op.water) V.fill(src, { color: op.fillShade || op.fill, alpha: 0.28 * op.alpha, flat: false, seed: op.seed + 7, smooth: op.smooth, bleed: 0.2, tex: 0.5, border: 0.5 });
    }
    if (op.ink) V.ink(src, { w: op.w, seed: op.seed, reveal: op.reveal, taper: op.taper, wob: op.wob, smooth: op.smooth, closed: op.closed, color: op.inkColor || '#15110e', brush: op.brush || 'ink' });
  };

  /** solid disc of colour (brush wash). */
  V.dot = function (x, y, r, color = '#15110e', o = {}) {
    const [X, Y] = V.tp(x, y);
    const R = r * V.msc();
    randomSeed((o.seed || 1) * 7 + (o.boil ? V.tick : 0));
    brush.noStroke();
    brush.noFill();
    brush.wash(color, Math.round(255 * (o.alpha == null ? 1 : o.alpha)));
    brush.circle(X, Y, R);
    brush.noWash();
    V.pending = true;
  };

  /** Hatching inside a closed polygon. o: dist, angle(deg), color, brush, w, rand, clip:[x,y,w,h], seed, boil */
  V.hatch = function (src, o = {}) {
    const op = { dist: 9, angle: 45, color: '#15110e', brush: 'ink', w: 0.5, rand: 0.08, seed: 3, smooth: false };
    Object.assign(op, o);
    const subs = V.subpaths(src, Object.assign({}, op, { closed: true }));
    subs.forEach((sp, si) => {
      let pts = sp.pts.map((p) => V.tp(p[0], p[1]));
      if (pts.length < 3) return;
      randomSeed(op.seed * 53 + si + (op.boil ? V.tick * 3 : 0));
      brush.noStroke();
      brush.noFill();
      if (op.clip) {
        const a = V.tp(op.clip[0], op.clip[1]), b = V.tp(op.clip[0] + op.clip[2], op.clip[1] + op.clip[3]);
        brush.clip([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]);
      }
      brush.hatch(op.dist * V.msc(), (op.angle * Math.PI) / 180, { rand: op.rand });
      brush.hatchStyle(op.brush, op.color, op.w * V.lineMul * Math.pow(V.msc(), 0.6));
      brush.polygon(pts);
      brush.noHatch();
      if (op.clip) brush.noClip();
      V.pending = true;
    });
  };

  // ------------------------------------------------------- 2D layer / native
  let L2 = null;
  const ensureL2 = () => {
    if (!L2) {
      L2 = createGraphics(V.W, V.H);
      L2.pixelDensity(1);
    }
    return L2;
  };
  /**
   * Draw with the raw Canvas2D API on a transparent full-frame layer, then composite it onto the frame (on top of everything drawn so far).
   *   V.with2d((ctx, g) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080); }, {alpha: 1, blend: 'multiply'|'screen'|null})
   * ctx is in SCREEN coordinates (y down).
   */
  V.with2d = function (fn, o = {}) {
    V.flush();
    const g = ensureL2();
    const ctx = g.drawingContext;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, V.W, V.H);
    ctx.save();
    fn(ctx, g);
    ctx.restore();
    V.blit(g, 0, 0, V.W, V.H, o);
  };
  /** composite a p5.Graphics / p5.Image / canvas-backed graphic at SCREEN position. o: alpha, blend('multiply'|'screen'|'add'), rot (rad, about x,y), ox/oy origin offset, smooth */
  V.blit = function (g, x, y, w, h, o = {}) {
    V.flush();
    push();
    if (o.blend) {
      const B = { multiply: MULTIPLY, screen: SCREEN, add: ADD, darkest: DARKEST, lightest: LIGHTEST, difference: DIFFERENCE, exclusion: EXCLUSION }[o.blend];
      if (B) blendMode(B);
    }
    if (o.alpha != null && o.alpha < 1) tint(255, 255 * o.alpha);
    imageMode(CORNER);
    if (o.rot) {
      translate(x, y);
      rotate(o.rot);
      image(g, -(o.ox || 0), -(o.oy || 0), w, h);
    } else {
      image(g, x, y, w, h);
    }
    pop();
  };
  /** create + cache a 2D p5.Graphics once: V.gfx('key', w, h, ctx => {...paint...}) -> graphics (paint runs once per page) */
  const gfxCache = {};
  V.gfx = function (key, w, h, paint) {
    if (gfxCache[key]) return gfxCache[key];
    const g = createGraphics(w, h);
    g.pixelDensity(1);
    paint(g.drawingContext, g);
    gfxCache[key] = g;
    return g;
  };
  /**
   * Bake a static layer ONCE per page: fn() draws it with brush/V.* calls onto a cleared canvas; the result is cached as an image and
   * re-blitted on later frames. Use for heavy static backgrounds (big washes, wall textures). Call it at the START of the scene (it clears the canvas on the first call).
   */
  const bakes = {};
  V.bake = function (key, fn) {
    if (!bakes[key]) {
      clear();
      fn();
      V.flush();
      bakes[key] = get();
    }
    V.blit(bakes[key], 0, 0, V.W, V.H);
  };

  /** solid background colour (opaque) */
  V.bg = (c) => {
    V.flush();
    background(c);
  };
  /** vertical/diagonal gradient background via 2D layer. stops: [[0,'#fff'],[1,'#000']], angle in degrees (90 = top->bottom) */
  V.gradient = function (stops, angle = 90, rect = [0, 0, V.W, V.H]) {
    V.with2d((ctx) => {
      const a = (angle * Math.PI) / 180, cx = rect[0] + rect[2] / 2, cy = rect[1] + rect[3] / 2;
      const R = Math.abs(Math.cos(a)) * rect[2] / 2 + Math.abs(Math.sin(a)) * rect[3] / 2;
      const g = ctx.createLinearGradient(cx - Math.cos(a) * R, cy - Math.sin(a) * R, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      stops.forEach(([p, c]) => g.addColorStop(p, c));
      ctx.fillStyle = g;
      ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
    });
  };

  // ------------------------------------------------------------------ text
  // System fonts (installed on this Mac) work: 'Papyrus', 'Herculanum', 'Luminari', 'Copperplate', 'Didot', 'Bodoni 72', 'Futura', 'Impact', 'Chalkduster',
  // 'Phosphate', 'Zapfino', 'Snell Roundhand', 'Apple Chancery', 'Trattatello', 'Marker Felt', 'Courier New', 'Menlo', 'Silom', 'DIN Condensed',
  // CJK: 'PingFang TC', 'Songti TC', 'Kaiti TC', 'Xingkai TC', 'Libian TC' (隸書), 'Weibei TC' (魏碑), 'Wawati TC', 'Yuppy TC', 'Hannotate TC', 'HanziPen TC', 'BiauKaiTC', 'Baoli TC', 'Hiragino Mincho ProN'.
  const tcache = new Map();
  let scratch = null;
  const sctx = () => (scratch || (scratch = document.createElement('canvas').getContext('2d')));
  const fontStr = (o, size) => `${o.italic ? 'italic ' : ''}${o.weight || 'normal'} ${size}px ${o.font.split(',').map((f) => (/^[\w-]+$/.test(f.trim()) ? f.trim() : `"${f.trim().replace(/"/g, '')}"`)).join(',')}`;
  V.textW = function (str, size, o = {}) {
    const op = Object.assign({ font: 'PingFang TC', track: 0 }, o);
    const c = sctx();
    c.font = fontStr(op, size);
    if ('letterSpacing' in c) c.letterSpacing = (op.track || 0) * size + 'px';
    return c.measureText(str).width;
  };
  /**
   * Text at LOCAL (x,y). o: font (css family list), weight ('bold'|'900'...), italic, color, align ('left'|'center'|'right'), baseline ('alphabetic'|'middle'|'top'),
   * alpha, stroke (outline colour), strokeW (px), shadow:{c,x,y,b}, track (letter-spacing in em), reveal (0..1 chars), rot (rad), blend
   * Returns the text width in px (unscaled).
   */
  V.text = function (str, x, y, size, o = {}) {
    const op = Object.assign({ font: 'PingFang TC', color: '#15110e', align: 'left', baseline: 'alphabetic', alpha: 1, reveal: 1, rot: 0, track: 0, strokeW: 0 }, o);
    if (op.alpha <= 0.01 || op.reveal <= 0 || size < 1) return 0;
    const s = op.reveal >= 1 ? str : str.slice(0, Math.floor(str.length * op.reveal + 0.001));
    if (!s) return 0;
    const sc = Math.max(0.25, Math.ceil(V.msc() * 4) / 4); // raster scale, quantised for caching
    const key = [s, op.font, op.weight, op.italic, size, op.color, op.stroke, op.strokeW, op.track, op.baseline, op.shadow && JSON.stringify(op.shadow), sc].join('|');
    let ent = tcache.get(key);
    if (!ent) {
      const c = document.createElement('canvas').getContext('2d');
      const px = size * sc;
      c.font = fontStr(op, px);
      if ('letterSpacing' in c) c.letterSpacing = op.track * px + 'px';
      const w = c.measureText(s).width;
      const padd = Math.ceil(px * 0.5 + (op.strokeW || 0) * sc + (op.shadow ? (op.shadow.b || 0) + Math.abs(op.shadow.x || 0) + Math.abs(op.shadow.y || 0) : 0) + 4);
      const cw = Math.ceil(w + padd * 2), ch = Math.ceil(px * 1.6 + padd * 2);
      const cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const cx = cv.getContext('2d');
      cx.font = fontStr(op, px);
      if ('letterSpacing' in cx) cx.letterSpacing = op.track * px + 'px';
      cx.textBaseline = op.baseline;
      cx.textAlign = 'left';
      const by = op.baseline === 'middle' ? ch / 2 : op.baseline === 'top' ? padd : padd + px * 1.05;
      if (op.shadow) {
        cx.shadowColor = op.shadow.c || 'rgba(0,0,0,0.5)';
        cx.shadowOffsetX = (op.shadow.x || 0) * sc;
        cx.shadowOffsetY = (op.shadow.y || 0) * sc;
        cx.shadowBlur = (op.shadow.b || 0) * sc;
      }
      if (op.strokeW && op.stroke) {
        cx.lineJoin = 'round';
        cx.lineWidth = op.strokeW * sc;
        cx.strokeStyle = op.stroke;
        cx.strokeText(s, padd, by);
      }
      cx.fillStyle = op.color;
      cx.fillText(s, padd, by);
      const g = createGraphics(cw, ch);
      g.pixelDensity(1);
      g.drawingContext.drawImage(cv, 0, 0);
      ent = { g, w: w / sc, padd: padd / sc, cw: cw / sc, ch: ch / sc, by: by / sc };
      if (tcache.size > 400) tcache.delete(tcache.keys().next().value);
      tcache.set(key, ent);
    }
    V.flush();
    const [X, Y] = V.tp(x, y);
    const ang = V.mang() + op.rot, k = V.msc();
    const ox = op.align === 'center' ? ent.w / 2 : op.align === 'right' ? ent.w : 0;
    push();
    if (op.blend) {
      const B = { multiply: MULTIPLY, screen: SCREEN, add: ADD }[op.blend];
      if (B) blendMode(B);
    }
    if (op.alpha < 1) tint(255, 255 * op.alpha);
    translate(X, Y);
    rotate(ang);
    imageMode(CORNER);
    image(ent.g, (-ox - ent.padd) * k, -ent.by * k, ent.cw * k, ent.ch * k);
    pop();
    return ent.w;
  };

  // ------------------------------------------------------- grain / vignette
  /** film/paper grain over the whole frame. o: amt (0..1), anim (re-randomise every frame on twos), mode 'multiply'|'screen'|'overlay-ish' (default multiply) */
  V.grain = function (o = {}) {
    const op = Object.assign({ amt: 0.18, anim: true, mode: 'multiply', size: 1 }, o);
    const k = op.anim ? V.tick % 4 : 0;
    const g = V.gfx('grain' + k + '_' + op.size, 960, 540, (ctx) => {
      const img = ctx.createImageData(960, 540);
      const r = V.rng(9000 + k * 77 + op.size);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 150 + r() * 105 - (r() < 0.02 ? 70 : 0);
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    });
    V.blit(g, 0, 0, V.W, V.H, { alpha: op.amt, blend: op.mode });
  };
  /** darkened corners. o: amt (0..1), color */
  V.vignette = function (o = {}) {
    const op = Object.assign({ amt: 0.5, color: '0,0,0', inner: 0.45 }, o);
    V.with2d((ctx) => {
      const g = ctx.createRadialGradient(V.W / 2, V.H / 2, V.H * op.inner, V.W / 2, V.H / 2, V.W * 0.62);
      g.addColorStop(0, `rgba(${op.color},0)`);
      g.addColorStop(1, `rgba(${op.color},${op.amt})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, V.W, V.H);
    });
  };
})();
