/* greek.js — scene "greek" (film 16.0–22.0 s): c. 500 BCE, Attic black-figure amphora, after Exekias' "Achilles and Ajax playing a game" (Vatican 344).
 * The whole frame is the curved belly of the pot. Everything is designed in UNWRAPPED surface coords and projected onto a cylinder by W()
 * (bands curve, edges compress), then shaded (cylinder falloff + a slowly travelling glaze highlight).
 *   baked once : clay body + firing mottles, ornament bands (tongues, lotus-palmette chain, meander, rays), spears, shields, seats, legs, table,
 *                painted names  -> 'base';   each figure's torso/head  -> its own sprite (blitted per frame: warriors bow about the hip, bystanders dip)
 *   live       : all 8 arms doing 67 (palms up, seesaw on V.G.arm), helmet crests (flick on the beat), the spoken words ΕΞ / ΕΠΤΑ (light up on V.G.say)
 * Black-figure logic: silhouettes in black glaze, details INCISED (clay-coloured hairlines), added purple + white. Where a black limb overlaps a black
 * body its contour is incised (halo()), exactly as the vase painters did.
 */
(function () {
  const V = window.V, G = V.G;
  const C = { clay: '#cf7336', hi: '#dc8a45', lo: '#c0612b', glaze: '#17110d', purple: '#7b2d3a', white: '#efe3cf', inc: '#e09a5e' };
  const GROUND = 828;

  // ------------------------------------------------------------------ cylinder projection (unwrapped surface -> screen)
  const RAD = 2200, DIST = 5200, FOC = DIST - RAD, CX = 960, CY = 540;
  function W(x, y) {
    const th = (x - CX) / RAD, den = DIST - RAD * Math.cos(th);
    return [CX + (FOC * RAD * Math.sin(th)) / den, CY + (FOC * (y - CY)) / den];
  }
  function WP(pts, step, closed) {
    let p = pts;
    if (step) {
      p = V.resample(closed ? pts.concat([pts[0]]) : pts, step);
      if (closed) p.pop();
    }
    return p.map((q) => W(q[0], q[1]));
  }

  // ------------------------------------------------------------------ figure transform: local (facing right, y up = negative) -> unwrapped -> screen
  let XF = null;
  function setXF(o) {
    XF = Object.assign({ ox: 0, oy: GROUND, S: 1, dir: 1, rot: 0, px: 0, py: 0, dy: 0 }, o);
  }
  function TL(x, y) {
    if (XF.pre) [x, y] = XF.pre(x, y);
    if (XF.rot) {
      const c = Math.cos(XF.rot), s = Math.sin(XF.rot), dx = x - XF.px, dy = y - XF.py;
      x = XF.px + c * dx - s * dy;
      y = XF.py + s * dx + c * dy;
    }
    return W(XF.ox + XF.dir * XF.S * x, XF.oy + XF.dy + XF.S * y);
  }
  const TP = (pts) => pts.map((p) => TL(p[0], p[1]));
  const fillL = (pts, color, o = {}) => V.fill(TP(pts), { color: color || C.glaze, flat: true, seed: o.seed || 1, alpha: o.alpha == null ? 1 : o.alpha });
  const inkL = (pts, o = {}) => V.ink(TP(pts), Object.assign({ color: C.glaze, w: 1, wob: 0.3, taper: [6, 6], seed: 1, step: 4 }, o));
  const cutL = (pts, o = {}) => V.ink(TP(pts), Object.assign({ color: C.inc, w: 0.44, brush: 'ink', wob: 0.32, taper: [3, 3], seed: 2, step: 3 }, o));
  const dotL = (x, y, r, color, o = {}) => {
    const [X, Y] = TL(x, y);
    V.dot(X, Y, r * XF.S * 0.97, color, o);
  };

  // ------------------------------------------------------------------ geometry helpers
  function tubeD(spine, rads, o = {}) {
    const per = o.per || 6;
    let pts, rr;
    if (spine.length < 3) {
      const a = spine[0], b = spine[1], n = Math.max(3, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5));
      pts = [];
      rr = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push([V.lerp(a[0], b[0], t), V.lerp(a[1], b[1], t)]);
        rr.push([V.lerp(rads[0][0], rads[1][0], t), V.lerp(rads[0][1], rads[1][1], t)]);
      }
    } else {
      pts = V.smoothPts(spine, false, per);
      rr = pts.map((_, k) => {
        const s = Math.min(spine.length - 2, Math.floor(k / per));
        const t = V.clamp(k / per - s), e = t * t * (3 - 2 * t);
        return [V.lerp(rads[s][0], rads[s + 1][0], e), V.lerp(rads[s][1], rads[s + 1][1], e)];
      });
    }
    const N = pts.length, nrm = [], tg = [];
    for (let i = 0; i < N; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l; ty /= l;
      tg.push([tx, ty]);
      nrm.push([-ty, tx]);
    }
    return { pts, rr, nrm, tg };
  }
  function tubeOut(D, grow = 0) {
    const { pts, rr, nrm, tg } = D, N = pts.length, L = [], R = [];
    for (let i = 0; i < N; i++) {
      L.push([pts[i][0] + nrm[i][0] * (rr[i][0] + grow), pts[i][1] + nrm[i][1] * (rr[i][0] + grow)]);
      R.push([pts[i][0] - nrm[i][0] * (rr[i][1] + grow), pts[i][1] - nrm[i][1] * (rr[i][1] + grow)]);
    }
    const cap = (i, fwd) => {
      const [nx, ny] = nrm[i], [tx, ty] = tg[i], ra = rr[i][0] + grow, rb = rr[i][1] + grow, r = (ra + rb) / 2, off = (ra - rb) / 2;
      const cx = pts[i][0] + nx * off, cy = pts[i][1] + ny * off, out = [];
      for (let k = 1; k < 8; k++) {
        const ph = (k / 8) * Math.PI, c = Math.cos(ph), s = Math.sin(ph);
        if (fwd) out.push([cx + nx * c * r + tx * s * r, cy + ny * c * r + ty * s * r]);
        else out.push([cx - nx * c * r - tx * s * r, cy - ny * c * r - ty * s * r]);
      }
      return out;
    };
    return L.concat(cap(N - 1, true), R.reverse(), cap(0, false));
  }
  const tube = (spine, rads, grow = 0) => tubeOut(tubeD(spine, rads), grow);
  /** a polyline running along a tube at fraction f of its half-width (+1 = 'a' side edge, -1 = 'b' side edge), between params s0..s1 */
  function tubeLine(D, f, s0 = 0, s1 = 1) {
    const N = D.pts.length, out = [];
    for (let i = Math.round(s0 * (N - 1)); i <= Math.round(s1 * (N - 1)); i++) {
      const r = f >= 0 ? f * D.rr[i][0] : f * D.rr[i][1];
      out.push([D.pts[i][0] + D.nrm[i][0] * r, D.pts[i][1] + D.nrm[i][1] * r]);
    }
    return out;
  }
  /** a short curved line across a tube at param s (bow = sideways bulge along the tangent) */
  function across(D, s, k = 0.86, bow = 0) {
    const i = Math.round(V.clamp(s) * (D.pts.length - 1)), p = D.pts[i], n = D.nrm[i], t = D.tg[i], r = D.rr[i];
    const a = [p[0] + n[0] * r[0] * k, p[1] + n[1] * r[0] * k], b = [p[0] - n[0] * r[1] * k, p[1] - n[1] * r[1] * k];
    const m = [(a[0] + b[0]) / 2 + t[0] * bow, (a[1] + b[1]) / 2 + t[1] * bow];
    return [a, m, b];
  }
  function pip(x, y, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  const inAny = (p, polys) => polys.some((q) => pip(p[0], p[1], q));
  function inset(poly, d) {
    let A = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) A += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    const sgn = A > 0 ? 1 : -1, n = poly.length;
    return poly.map((p, i) => {
      const a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n];
      const n1 = [p[1] - a[1], -(p[0] - a[0])], n2 = [b[1] - p[1], -(b[0] - p[0])];
      const l1 = Math.hypot(n1[0], n1[1]) || 1, l2 = Math.hypot(n2[0], n2[1]) || 1;
      const nx = n1[0] / l1 + n2[0] / l2, ny = n1[1] / l1 + n2[1] / l2, l = Math.hypot(nx, ny) || 1;
      return [p[0] - (sgn * nx * d) / l, p[1] - (sgn * ny * d) / l];
    });
  }
  function clipSeg(a, b, poly) {
    const ts = [0, 1];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const p = poly[j], q = poly[i];
      const d = (b[0] - a[0]) * (q[1] - p[1]) - (b[1] - a[1]) * (q[0] - p[0]);
      if (Math.abs(d) < 1e-9) continue;
      const t = ((p[0] - a[0]) * (q[1] - p[1]) - (p[1] - a[1]) * (q[0] - p[0])) / d;
      const s = ((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / d;
      if (t > 0 && t < 1 && s >= 0 && s <= 1) ts.push(t);
    }
    ts.sort((x, y) => x - y);
    const out = [];
    for (let k = 0; k < ts.length - 1; k++) {
      if (ts[k + 1] - ts[k] < 1e-4) continue;
      const tm = (ts[k] + ts[k + 1]) / 2;
      if (pip(a[0] + (b[0] - a[0]) * tm, a[1] + (b[1] - a[1]) * tm, poly))
        out.push([[a[0] + (b[0] - a[0]) * ts[k], a[1] + (b[1] - a[1]) * ts[k]], [a[0] + (b[0] - a[0]) * ts[k + 1], a[1] + (b[1] - a[1]) * ts[k + 1]]]);
    }
    return out;
  }
  const sm = (pts, per = 5) => V.smoothPts(pts, true, per).slice(0, -1);
  const lerp2 = (a, b, t) => [V.lerp(a[0], b[0], t), V.lerp(a[1], b[1], t)];

  /** incised contour where `poly` lies over other black shapes (`under`): stroke only the runs of the outline that fall inside them. Call BEFORE filling poly. */
  function halo(poly, under, o = {}) {
    const pts = V.resample(poly.concat([poly[0]]), 3);
    const flags = pts.map((p) => inAny(p, under));
    const runs = [];
    let run = [];
    for (let i = 0; i < pts.length; i++) {
      if (flags[i]) run.push(pts[i]);
      else {
        if (run.length > 1) runs.push(run);
        run = [];
      }
    }
    if (run.length > 1) runs.push(run);
    if (runs.length > 1 && flags[0] && flags[pts.length - 1]) runs[0] = runs.pop().concat(runs[0]);
    runs.forEach((r, k) => cutL(r, { w: o.w || 0.85, taper: [2, 2], seed: (o.seed || 5) + k, wob: 0.2, step: 3 }));
  }

  /** Exekias-style woven cloak: incised grid, stars in the squares, alternate squares in added purple, incised border bands */
  function cloakPattern(poly, o = {}) {
    const cell = o.cell || 15, ang = o.ang || 0, seed = o.seed || 40;
    const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
    let cx = 0, cy = 0;
    poly.forEach((p) => { cx += p[0]; cy += p[1]; });
    cx /= poly.length; cy /= poly.length;
    cx += o.shift ? o.shift[0] : 0; cy += o.shift ? o.shift[1] : 0;
    const inner = inset(poly, o.border || 10);
    const G0 = (a, b) => [cx + ux * a * cell + vx * b * cell, cy + uy * a * cell + vy * b * cell];
    let sk = 0;
    for (let i = -16; i <= 16; i++)
      for (let j = -16; j <= 16; j++) {
        const cs = [G0(i, j), G0(i + 1, j), G0(i + 1, j + 1), G0(i, j + 1)];
        if (!cs.every((c) => pip(c[0], c[1], inner))) continue;
        const m = G0(i + 0.5, j + 0.5), q = o.mode === 'rows' ? (((j % 2) + 2) % 2 === 0 ? 0 : 1) : (((i + j) % 2) + 2) % 2;
        if (q === 0 && o.purple !== false) fillL(inset(cs, 2.4), C.purple, { seed: seed + sk++ });
        else {
          // incised cross-star with a dot of added white
          cutL([G0(i + 0.5, j + 0.2), G0(i + 0.5, j + 0.8)], { seed: seed + sk++, w: 0.36, taper: [1, 1] });
          cutL([G0(i + 0.2, j + 0.5), G0(i + 0.8, j + 0.5)], { seed: seed + sk++, w: 0.36, taper: [1, 1] });
          if (o.dots !== false) dotL(m[0], m[1], 1.3, C.white);
        }
      }
    const R = 600;
    for (let k = -16; k <= 16; k++) {
      const a1 = [cx + vx * k * cell - ux * R, cy + vy * k * cell - uy * R], b1 = [cx + vx * k * cell + ux * R, cy + vy * k * cell + uy * R];
      clipSeg(a1, b1, inner).forEach((s) => cutL(s, { seed: seed + sk++, w: 0.38, taper: [1, 1] }));
      const a2 = [cx + ux * k * cell - vx * R, cy + uy * k * cell - vy * R], b2 = [cx + ux * k * cell + vx * R, cy + uy * k * cell + vy * R];
      clipSeg(a2, b2, inner).forEach((s) => cutL(s, { seed: seed + sk++, w: 0.38, taper: [1, 1] }));
    }
    // border bands
    cutL(inset(poly, 3.5), { closed: true, seed: seed + 500, w: 0.42, taper: [0, 0] });
    cutL(inner, { closed: true, seed: seed + 501, w: 0.42, taper: [0, 0] });
    if (o.borderDots) {
      const ring = inset(poly, (3.5 + (o.border || 10)) / 2);
      V.resample(ring.concat([ring[0]]), 9).forEach((p) => dotL(p[0], p[1], 1.25, C.white));
    }
  }

  // ------------------------------------------------------------------ painted Greek letters (dipinti), stroke font in a unit box
  const GLY = {
    'Α': { w: 0.78, s: [[[0, 1], [0.39, 0], [0.78, 1]], [[0.17, 0.62], [0.62, 0.56]]] },
    'Ε': { w: 0.58, s: [[[0.58, 0.03], [0, 0], [0, 1], [0.58, 0.97]], [[0, 0.5], [0.46, 0.49]]] },
    'Ξ': { w: 0.7, s: [[[0, 0], [0.7, 0.01]], [[0.14, 0.5], [0.56, 0.5]], [[0, 1], [0.7, 0.99]]] },
    'Π': { w: 0.66, s: [[[0, 1], [0, 0], [0.66, 0.01], [0.66, 1]]] },
    'Τ': { w: 0.72, s: [[[0, 0.01], [0.72, 0]], [[0.36, 0], [0.37, 1]]] },
    'Χ': { w: 0.72, s: [[[0, 0], [0.72, 1]], [[0.72, 0], [0, 1]]] },
    'Ι': { w: 0.08, s: [[[0.04, 0], [0.04, 1]]] },
    'Λ': { w: 0.72, s: [[[0, 1], [0.36, 0], [0.72, 1]]] },
    'Ο': { w: 0.62, s: [] },
    'Σ': { w: 0.62, s: [[[0.62, 0.05], [0.02, 0], [0.4, 0.5], [0.02, 1], [0.62, 0.95]]] },
    'Ν': { w: 0.66, s: [[[0, 1], [0, 0], [0.66, 1], [0.66, 0]]] },
    'Κ': { w: 0.6, s: [[[0, 0], [0, 1]], [[0.58, 0], [0.02, 0.56]], [[0.22, 0.4], [0.6, 1]]] },
    'Ζ': { w: 0.62, s: [[[0, 0], [0.62, 0], [0, 1], [0.62, 1]]] },
    'ʹ': { w: 0.14, s: [[[0.0, 0.3], [0.14, -0.04]]] },
    'Γ': { w: 0.56, s: [[[0, 1], [0, 0], [0.56, 0.02]]] },
    'Ρ': { w: 0.56, s: [[[0, 1], [0, 0], [0.4, 0.02], [0.56, 0.14], [0.56, 0.32], [0.4, 0.45], [0, 0.47]]] },
    'Φ': { w: 0.72, s: [[[0.36, -0.06], [0.36, 1.04]]] },
    ' ': { w: 0.34, s: [] },
  };
  GLY['Ο'].s = [V.ellipsePts(0.31, 0.5, 0.31, 0.47, 20).concat([[0.62, 0.5]])];
  GLY['Φ'].s.push(V.ellipsePts(0.36, 0.48, 0.36, 0.27, 18).concat([[0.72, 0.48]]));
  /** letters along a straight baseline starting at (x,y) (unwrapped coords). retro = boustrophedon/right-to-left with mirrored letters (as on vases). */
  function greekStrokes(str, x, y, o = {}) {
    const size = o.size || 40, ang = o.ang || 0, retro = !!o.retro, gap = o.gap == null ? 0.36 : o.gap;
    const d = [Math.cos(ang), Math.sin(ang)], up = retro ? [-d[1], d[0]] : [d[1], -d[0]];
    let adv = 0;
    const out = [];
    for (const ch of str) {
      const g = GLY[ch] || GLY[' '];
      g.s.forEach((st) => out.push(st.map(([gx, gy]) => {
        const a = adv + gx * size, h = (1 - gy) * size;
        return [x + d[0] * a + up[0] * h, y + d[1] * a + up[1] * h];
      })));
      adv += (g.w + gap) * size;
    }
    return out;
  }
  const inkStrokes = (strokes, o) => strokes.forEach((s, k) => V.ink(WP(s, 0), Object.assign({ step: 3 }, o, { seed: (o.seed || 0) + k })));

  // ------------------------------------------------------------------ the cast
  const FIG = {
    athena: { key: 'athena', kind: 'goddess', ox: 196, S: 1.0, dir: 1, seed: 1000 },
    achil: { key: 'achil', kind: 'warrior', ox: 548, S: 1.25, dir: 1, seed: 2000, pellets: 6 },
    ajax: { key: 'ajax', kind: 'warrior', ox: 1372, S: 1.25, dir: -1, seed: 3000, pellets: 7 },
    amazon: { key: 'amazon', kind: 'amazon', ox: 1724, S: 1.0, dir: -1, seed: 4000 },
  };
  const ARM = {
    warrior: { shN: [106, -266], shF: [120, -276], wrist: [226, -214], farOff: [26, -6], amp: 36, l1: 92, l2: 86, r: [16.5, 12.5, 8.8], hand: 44 },
    goddess: { shN: [12, -378], shF: [21, -383], wrist: [100, -318], farOff: [26, -5], amp: 34, l1: 80, l2: 76, r: [11.5, 9.4, 6.6], hand: 37 },
  };
  ARM.amazon = ARM.goddess;

  // ---- seated warrior (Achilles / Ajax), local units, facing right, ground y = 0, hip pivot (0,-100)
  const WAR = (() => {
    const w = {};
    w.seat = [[-80, -88], [34, -88], [34, 0], [-80, 0]];
    w.slab = [[-88, -98], [42, -98], [42, -88], [-88, -88]];
    w.thighN_D = tubeD([[-14, -104], [58, -116], [122, -124]], [[24, 28], [21, 20], [17, 14]]);
    w.shinN_D = tubeD([[124, -126], [118, -84], [104, -20]], [[16, 13], [23, 11], [8, 7]]);
    w.footN = sm([[98, -30], [92, -10], [100, -1], [150, -1], [157, -5], [146, -11], [124, -16], [112, -26]], 3);
    w.thighF_D = tubeD([[-8, -112], [60, -132], [112, -140]], [[20, 20], [18, 18], [15, 14]]);
    w.shinF_D = tubeD([[112, -140], [88, -86], [62, -28]], [[15, 12], [21, 10], [8, 7]]);
    w.footF = sm([[56, -40], [48, -28], [70, -8], [100, -1], [105, -5], [90, -15], [74, -32]], 3);
    w.torso_D = tubeD([[-4, -128], [30, -172], [70, -230], [100, -272]], [[33, 32], [30, 31], [43, 34], [35, 28]]);
    w.neck_D = tubeD([[96, -278], [114, -296], [128, -308]], [[18, 18], [17, 17], [16, 16]]);
    ['thighN', 'shinN', 'thighF', 'shinF', 'torso', 'neck'].forEach((k) => (w[k] = tubeOut(w[k + '_D'])));
    // Corinthian helmet: dome, eye-hole notch, long nose guard, pointed cheek guards, flared neck guard
    w.helmet = sm([[102, -310], [95, -318], [99, -344], [110, -365], [128, -381], [150, -389], [172, -387], [189, -377], [199, -363], [203, -352], [197, -346], [204, -340], [208, -330], [210, -320], [202, -323], [199, -318], [204, -310], [201, -299], [190, -297], [176, -302], [166, -314], [154, -313], [130, -311]], 3);
    w.beard = sm([[148, -311], [168, -304], [186, -299], [201, -297], [205, -291], [198, -276], [184, -259], [172, -272], [160, -290]], 3);
    w.cloak = sm([[112, -300], [92, -306], [62, -292], [30, -256], [0, -212], [-26, -162], [-42, -114], [-48, -90], [-22, -92], [12, -102], [42, -124], [60, -160], [80, -202], [96, -240], [106, -272]], 4);
    w.pter = sm([[-30, -116], [4, -136], [36, -152], [62, -150], [66, -126], [46, -110], [14, -98], [-26, -92]], 3);
    w.stilt = [[144, -385], [157, -386], [154, -401], [147, -401]];
    w.shield = { c: [-118, -108], r: 94 };
    w.crestB = [150, -400];
    w.mouth = [200, -318];
    w.body = [w.torso, w.neck, w.cloak, w.helmet, w.pter];
    return w;
  })();
  // Ajax's bare head + the same helmet pushed up and back onto his crown (AJ.pre maps helmet-space -> body-space)
  const AJ = (() => {
    const a = {};
    a.face = sm([[132, -372], [160, -378], [184, -371], [190, -359], [196, -348], [204, -338], [197, -334], [198, -329], [194, -326], [198, -322], [196, -316], [186, -312], [166, -308], [150, -310], [130, -314], [114, -318], [108, -334], [114, -356]], 3);
    a.beard = sm([[150, -318], [166, -326], [184, -322], [196, -318], [199, -308], [192, -292], [182, -276], [172, -290], [160, -306]], 3);
    const ang = -0.5, c = Math.cos(ang), s = Math.sin(ang);
    a.pre = (x, y) => { const dx = x - 120, dy = y + 340; return [126 + c * dx - s * dy, -373 + s * dx + c * dy]; };
    a.helmU = WAR.helmet.map((p) => a.pre(p[0], p[1]));
    a.mouth = [196, -328];
    a.body = [WAR.torso, WAR.neck, WAR.cloak, a.face, a.helmU, WAR.pter];
    return a;
  })();

  // ---- standing women (Athena / Amazon), local units, facing right, ground y = 0
  const FEM = (() => {
    const f = {};
    f.face = sm([[14, -465], [38, -463], [42, -456], [47, -446], [52, -438], [45, -435], [46, -431], [41, -428], [45, -425], [44, -418], [38, -412], [26, -408], [12, -412], [8, -440]], 2);
    f.neck = sm([[10, -414], [24, -408], [22, -398], [28, -388], [4, -386], [2, -400]], 3);
    f.hair = sm([[16, -466], [0, -460], [-12, -444], [-22, -418], [-29, -388], [-33, -352], [-31, -322], [-22, -316], [-16, -344], [-8, -372], [4, -396], [10, -414], [12, -434], [14, -452]], 4);
    f.helmet = sm([[-6, -450], [-9, -463], [-2, -476], [10, -484], [26, -487], [40, -482], [48, -471], [53, -462], [44, -460], [36, -464], [22, -465], [12, -462], [2, -452]], 4);
    f.stilt = [[16, -484], [26, -486], [24, -500], [18, -500]];
    f.crestB = [21, -499];
    const wide = (pts, k) => pts.map(([x, y]) => [x * k, y]);
    f.peplos = sm(wide([[-46, -12], [46, -12], [41, -44], [35, -112], [37, -172], [40, -215], [36, -256], [28, -290], [34, -318], [40, -342], [40, -364], [33, -381], [20, -392], [2, -396], [-12, -391], [-20, -374], [-22, -344], [-18, -312], [-24, -280], [-32, -244], [-34, -198], [-34, -140], [-39, -76]], 1.14), 4);
    f.panel = wide([[14, -284], [28, -288], [35, -256], [39, -215], [36, -172], [34, -112], [40, -44], [45, -14], [22, -14], [18, -60], [15, -140], [13, -220]], 1.14);
    f.aegis = sm(wide([[-26, -306], [-22, -346], [-14, -384], [0, -396], [22, -393], [36, -381], [42, -362], [44, -336], [38, -317], [26, -311], [14, -318], [0, -307], [-12, -313]], 1.12), 4);
    f.chiton = sm(wide([[-36, -202], [40, -202], [33, -232], [28, -262], [24, -292], [32, -318], [40, -344], [40, -366], [32, -383], [16, -394], [-4, -396], [-16, -388], [-22, -360], [-20, -320], [-26, -280], [-33, -240]], 1.16), 4);
    f.quiver = [[-14, -396], [4, -392], [-34, -258], [-54, -264]];
    // archaic heads are big: head parts are drawn through a 1.16x scale about the nape
    f.headPre = (x, y) => [14 + (x - 14) * 1.16, -394 + (y + 394) * 1.16];
    return f;
  })();
  // crest: a tube along a centreline relative to its stilt-top B (plume streams back = -x)
  const CREST = (() => {
    // hugs the helmet: front starts just above the brow, crest rides 6-10 units over the dome, tail falls to the shoulders
    const D = tubeD([[47, 29], [31, 7], [3, -3], [-31, 3], [-53, 18], [-65, 46], [-69, 80]], [[4, 3], [13, 6], [21, 7], [21, 8], [17, 8], [12, 6], [5, 4]]);
    return { poly: tubeOut(D), lines: [tubeLine(D, 0.62, 0.08, 0.97), tubeLine(D, 0.22, 0.05, 1), tubeLine(D, -0.2, 0.06, 0.98)], stripe: tubeLine(D, -0.62, 0.04, 0.95) };
  })();

  // ------------------------------------------------------------------ clay body texture (2D, once)
  function clayTex() {
    return V.gfx('greekClay', V.W, V.H, (ctx) => {
      const lo = document.createElement('canvas');
      lo.width = 160; lo.height = 90;
      const lc = lo.getContext('2d'), id = lc.createImageData(160, 90);
      const A = V.rgb(C.lo), B = V.rgb(C.hi);
      for (let y = 0; y < 90; y++)
        for (let x = 0; x < 160; x++) {
          const n = 0.55 * V.noise2(x * 0.045, y * 0.06) + 0.3 * V.noise2(x * 0.13 + 7, y * 0.16 + 3) + 0.15 * V.noise2(x * 0.4 + 2, y * 0.4 + 9);
          const k = V.clamp(0.15 + n * 0.95), i = (y * 160 + x) * 4;
          id.data[i] = A[0] + (B[0] - A[0]) * k; id.data[i + 1] = A[1] + (B[1] - A[1]) * k; id.data[i + 2] = A[2] + (B[2] - A[2]) * k; id.data[i + 3] = 255;
        }
      lc.putImageData(id, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(lo, 0, 0, V.W, V.H);
      // fine body grain + specks
      const img = ctx.getImageData(0, 0, V.W, V.H), d = img.data, r = V.rng(677);
      for (let i = 0; i < d.length; i += 4) {
        const v = (r() - 0.5) * 12;
        d[i] += v; d[i + 1] += v * 0.86; d[i + 2] += v * 0.7;
      }
      ctx.putImageData(img, 0, 0);
      for (let k = 0; k < 1400; k++) {
        const x = r() * V.W, y = r() * V.H, big = r() < 0.08;
        ctx.fillStyle = r() < 0.78 ? `rgba(${40 + r() * 30},${18 + r() * 14},8,${0.35 + r() * 0.5})` : `rgba(250,${205 + r() * 30},${150 + r() * 40},${0.25 + r() * 0.35})`;
        ctx.beginPath();
        ctx.arc(x, y, big ? 1.2 + r() * 1.4 : 0.45 + r() * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      // wheel-burnish marks: faint horizontal streaks that follow the curvature
      for (let k = 0; k < 170; k++) {
        const yu = -60 + r() * 1200, x0 = -140 + r() * 2000, len = 200 + r() * 900;
        ctx.strokeStyle = r() < 0.5 ? `rgba(255,214,160,${0.03 + r() * 0.05})` : `rgba(110,48,18,${0.03 + r() * 0.05})`;
        ctx.lineWidth = 0.8 + r() * 2.2;
        ctx.beginPath();
        for (let x = x0; x <= x0 + len; x += 40) {
          const p = W(x, yu + Math.sin(x * 0.004 + k) * 2);
          if (x === x0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
      }
    });
  }
  function blobPts(cx, cy, rx, ry, seed) {
    const out = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, n = 0.7 + 0.6 * V.noise1(i * 0.7 + seed * 3.1);
      out.push([cx + Math.cos(a) * rx * n, cy + Math.sin(a) * ry * n]);
    }
    return out;
  }

  // ------------------------------------------------------------------ ornament bands
  function bandLine(y, w, seed, color = C.glaze) {
    V.ink(WP([[-220, y], [2140, y]], 14), { w, color, taper: [0, 0], wob: 0.35, wobLen: 140, seed });
  }
  function topBands() {
    // black neck + shoulder tongues (alternately black / added purple)
    V.fill(WP([[-260, -120], [2180, -120], [2180, 14], [-260, 14]], 14, true), { color: C.glaze, flat: true, seed: 11 });
    let k = 0;
    const tr = V.rng(55);
    for (let x0 = -200; x0 < 2140; x0 += 40, k++) {
      const x = x0 + (tr() - 0.5) * 2.5, hw = 16 + tr() * 1.4, by = 44 + (tr() - 0.5) * 4;
      const pts = [[x, 10], [x + 2 * hw, 10]];
      for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; pts.push([x + hw + Math.cos(a) * hw, by + Math.sin(a) * 17]); }
      V.fill(WP(pts, 5, true), { color: C.glaze, flat: true, seed: 20 + k });
      if (k % 2) {
        const q = [[x + 4, 14], [x + 2 * hw - 4, 14]];
        for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; q.push([x + hw + Math.cos(a) * (hw - 4), by + Math.sin(a) * 13]); }
        V.fill(WP(q, 5, true), { color: C.purple, flat: true, seed: 60 + k });
      }
    }
    bandLine(73, 1.0, 7);
    // lotus-palmette chain
    const P = 128;
    for (let j = -2; j < 19; j++) palmette(-120 + j * P, 150, 300 + j * 31, j);
    for (let j = -2; j < 19; j++) lotus(-120 + j * P + P / 2, 158, 900 + j * 17, j);
    bandLine(170, 1.3, 8);
    bandLine(178, 0.55, 9);
  }
  function palmette(cx, hy, seed, j) {
    // tendrils linking to the neighbouring lotus buds (drawn first, under the leaves)
    for (const s of [-1, 1]) {
      const path = [[cx + s * 10, hy + 7], [cx + s * 24, hy + 13], [cx + s * 40, hy + 12], [cx + s * 52, hy + 6], [cx + s * 58, hy + 2]];
      V.ink(WP(path, 0), { w: 0.75, smooth: true, taper: [2, 4], wob: 0.2, seed: seed + 40 + s });
      // volute
      const sp = [];
      for (let i = 0; i <= 18; i++) { const a = Math.PI * 0.5 + (s > 0 ? -1 : 1) * (i / 18) * Math.PI * 1.8, r = 8.5 * (1 - i / 26); sp.push([cx + s * 15 + Math.cos(a) * r * s, hy + 6 + Math.sin(a) * r]); }
      V.ink(WP(sp, 0), { w: 0.7, taper: [1, 6], wob: 0.1, seed: seed + 50 + s });
    }
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.335 + (V.hash(seed + i * 7) - 0.5) * 0.05, L = 62 - Math.abs(i - 4) * 5.2 + (V.hash(seed + i * 13) - 0.5) * 5;
      const b = a + (i - 4) * 0.02;
      const p0 = [cx + Math.cos(a) * 11, hy + Math.sin(a) * 11], p1 = [cx + Math.cos(b) * L * 0.55, hy + Math.sin(b) * L * 0.55], p2 = [cx + Math.cos(b) * L, hy + Math.sin(b) * L];
      V.ink(WP([p0, p1, p2], 0), { w: 2.65 - Math.abs(i - 4) * 0.1, color: (i + j) % 2 ? C.purple : C.glaze, smooth: true, taper: [L * 0.8, 2.5], wob: 0.15, seed: seed + i, step: 3 });
    }
    // heart
    const h = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; h.push([cx + Math.cos(a) * 10, hy + 3 + Math.sin(a) * 11]); }
    V.fill(WP(h, 0), { color: C.glaze, flat: true, seed: seed + 20 });
    const h2 = h.map((p) => [cx + (p[0] - cx) * 0.6, hy + 3 + (p[1] - hy - 3) * 0.6]);
    V.fill(WP(h2, 0), { color: C.purple, flat: true, seed: seed + 21 });
  }
  function lotus(cx, by, seed, j) {
    const bud = [[cx - 7, by - 4], [cx - 10, by - 20], [cx - 7, by - 38], [cx, by - 52], [cx + 7, by - 38], [cx + 10, by - 20], [cx + 7, by - 4]];
    V.fill(WP(V.smoothPts(bud, true, 4), 0), { color: C.glaze, flat: true, seed });
    const in2 = bud.map((p) => [cx + (p[0] - cx) * 0.55, by - 6 + (p[1] - by + 6) * 0.8]);
    V.fill(WP(V.smoothPts(in2, true, 4), 0), { color: j % 2 ? C.purple : C.glaze, flat: true, seed: seed + 1 });
    for (const s of [-1, 1]) {
      const sep = [[cx + s * 3, by - 2], [cx + s * 14, by - 12], [cx + s * 22, by - 30], [cx + s * 21, by - 42], [cx + s * 15, by - 40]];
      V.ink(WP(sep, 0), { w: 1.7, smooth: true, taper: [4, 8], wob: 0.15, seed: seed + 3 + s, step: 3 });
    }
    V.fill(WP(V.ellipsePts(cx, by, 11, 4.5, 16), 0), { color: C.glaze, flat: true, seed: seed + 5 });
  }
  function bottomBands() {
    bandLine(GROUND + 2, 1.7, 21);
    // running meander of hooks + saltire squares
    const y0 = 842, g = 12.5, P = 5 * g + 2;
    let k = 0;
    for (let x = -210; x < 2140; x += P, k++) {
      // each straight run is its own brush stroke, so the key keeps crisp square corners (a single spline would round them off)
      const segs = (pts, w, sd) => { for (let i = 0; i < pts.length - 1; i++) V.ink(WP([pts[i], pts[i + 1]], 4), { w, taper: [0, 0], wob: 0.15, seed: sd + i }); };
      if (k % 3 === 2) {
        const sq = [[x, y0], [x + 4 * g, y0], [x + 4 * g, y0 + 4 * g], [x, y0 + 4 * g], [x, y0]];
        segs(sq, 1.05, 70 + k * 9);
        V.ink(WP([[x + 6, y0 + 6], [x + 4 * g - 6, y0 + 4 * g - 6]], 4), { w: 0.9, taper: [2, 2], wob: 0.2, seed: 140 + k });
        V.ink(WP([[x + 4 * g - 6, y0 + 6], [x + 6, y0 + 4 * g - 6]], 4), { w: 0.9, taper: [2, 2], wob: 0.2, seed: 210 + k });
        for (const [a, b] of [[2, 0.9], [0.9, 2], [3.1, 2], [2, 3.1]]) V.dot(...W(x + a * g, y0 + b * g), 2.6, C.glaze, { seed: k });
      } else {
        const hook = [[x, y0 + 4 * g], [x, y0], [x + 4 * g, y0], [x + 4 * g, y0 + 3 * g], [x + g, y0 + 3 * g], [x + g, y0 + g], [x + 3 * g, y0 + g], [x + 3 * g, y0 + 2 * g], [x + 2 * g, y0 + 2 * g]];
        segs(hook, 1.05, 70 + k * 9);
      }
    }
    bandLine(y0 + 4 * g, 1.05, 22);
    bandLine(y0 + 4 * g + 12, 0.6, 23);
    // rays rising from the foot
    k = 0;
    const rr = V.rng(77);
    for (let c = -190; c < 2140; c += 74, k++) {
      // hand-painted rays: each a little different in height, width and lean
      const top = 936 + rr() * 16, hw = 31 + rr() * 5, lean = (rr() - 0.5) * 7, cc = c + (rr() - 0.5) * 4;
      const pts = [[cc - hw, 1170], [cc - hw * 0.6 + lean * 0.3, 1060], [cc - hw * 0.18 + lean * 0.7, 980], [cc + lean, top], [cc + hw * 0.18 + lean * 0.7, 980], [cc + hw * 0.6 + lean * 0.3, 1060], [cc + hw, 1170]];
      V.fill(WP(pts, 6, true), { color: C.glaze, flat: true, seed: 400 + k });
    }
    V.fill(WP([[-260, 1112], [2180, 1112], [2180, 1250], [-260, 1250]], 14, true), { color: C.glaze, flat: true, seed: 19 });
  }

  // ------------------------------------------------------------------ static scenery
  function spear(a, b, seed, o = {}) {
    inkL([a, b], { w: o.w || 1.25, taper: [0, 0], wob: 0.35, seed, step: 6 });
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
    const P = (s, w) => [b[0] + ux * s + nx * w, b[1] + uy * s + ny * w];
    fillL(sm([P(-4, 0), P(4, 5), P(16, 6.5), P(30, 3.5), P(42, 0), P(30, -3.5), P(16, -6.5), P(4, -5)], 3), C.glaze, { seed: seed + 1 });
    cutL([P(2, 0), P(36, 0)], { seed: seed + 2, w: 0.38 });
    const Q = (s, w) => [a[0] + ux * s + nx * w, a[1] + uy * s + ny * w];
    fillL([Q(16, 2.6), Q(16, -2.6), Q(-4, 0)], C.glaze, { seed: seed + 3 });
  }
  function shield(sh, pellets, seed) {
    const [cx, cy] = sh.c, r = sh.r;
    fillL(V.ellipsePts(cx, cy, r, r, 60), C.glaze, { seed });
    fillL(V.ellipsePts(cx, cy, r - 3.5, r - 3.5, 60), C.purple, { seed: seed + 1 });
    fillL(V.ellipsePts(cx, cy, r - 11, r - 11, 60), C.glaze, { seed: seed + 2 });
    cutL(V.ellipsePts(cx, cy, r - 11, r - 11, 60), { closed: true, seed: seed + 3, taper: [0, 0] });
    cutL(V.ellipsePts(cx, cy, r - 17, r - 17, 60), { closed: true, seed: seed + 4, taper: [0, 0] });
    if (pellets === 7) for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; dotL(cx + Math.cos(a) * (r - 7.2), cy + Math.sin(a) * (r - 7.2), 1.6, C.white, { seed: seed + 60 + k }); }
    // device: pellets — six on Achilles' shield, a seven-pellet rosette on Ajax's
    pelletPts(sh, pellets).forEach((p, k) => dotL(p[0], p[1], 6.2, C.white, { seed: seed + 10 + k }));
  }
  function pelletPts(sh, pellets) {
    const pc = [sh.c[0] - 34, sh.c[1] - 4];
    const pts = pellets === 6
      ? [[-11, -24], [11, -24], [-11, 0], [11, 0], [-11, 24], [11, 24]]
      : [[0, 0]].concat([0, 1, 2, 3, 4, 5].map((i) => [Math.cos((i * Math.PI) / 3 + Math.PI / 6) * 21, Math.sin((i * Math.PI) / 3 + Math.PI / 6) * 21]));
    return pts.map((p) => [pc[0] + p[0], pc[1] + p[1]]);
  }
  /** the shield devices count along: the six-pellet shield swells on "six", the seven-pellet rosette on "seven" */
  function drawPellets(t) {
    const s = G.say(t);
    [FIG.achil, FIG.ajax].forEach((F) => {
      if ((F.pellets === 6) !== (s.n === 6)) return;
      setXF({ ox: F.ox, S: F.S, dir: F.dir });
      const r = 6.2 * (1 + 0.32 * s.env);
      pelletPts(WAR.shield, F.pellets).forEach((p, k) => {
        dotL(p[0], p[1], r + 1.3, C.glaze, { seed: F.seed + 900 + k });
        dotL(p[0], p[1], r, C.white, { seed: F.seed + 920 + k });
      });
    });
  }
  function warriorStatic(F) {
    setXF({ ox: F.ox, S: F.S, dir: F.dir });
    const w = WAR, s = F.seed;
    spear([-196, 0], [146, -478], s + 1);
    spear([-172, 0], [170, -477], s + 6);
    shield(w.shield, F.pellets, s + 20);
    const shP = V.ellipsePts(w.shield.c[0], w.shield.c[1], w.shield.r, w.shield.r, 40);
    fillL(w.seat, C.glaze, { seed: s + 40 });
    halo(w.slab, [w.seat], { seed: s + 41 });
    fillL(w.slab, C.glaze, { seed: s + 42 });
    cutL(inset(w.seat, 7).slice(0), { closed: true, seed: s + 43, taper: [0, 0] });
    fillL([[-70, -60], [24, -60], [24, -49], [-70, -49]], C.purple, { seed: s + 44 });
    // far leg
    fillL(w.thighF, C.glaze, { seed: s + 50 });
    fillL(w.shinF, C.glaze, { seed: s + 51 });
    fillL(w.footF, C.glaze, { seed: s + 52 });
    cutL(across(w.shinF_D, 0.12, 0.9, -5), { seed: s + 53 });
    cutL(tubeLine(w.shinF_D, 0.55, 0.2, 0.85), { seed: s + 54, smooth: true });
    cutL(across(w.shinF_D, 0.9, 0.9, 3), { seed: s + 55 });
    // near leg over far leg / seat / shield: incised contour, then fill
    const under = [w.seat, w.slab, w.thighF, w.shinF, w.footF, shP];
    [w.thighN, w.shinN, w.footN].forEach((p, k) => halo(p, under, { seed: s + 60 + k }));
    fillL(w.thighN, C.glaze, { seed: s + 70 });
    fillL(w.shinN, C.glaze, { seed: s + 71 });
    fillL(w.footN, C.glaze, { seed: s + 72 });
    // thigh muscle, knee, greave (knee spiral, calf ridge), ankle, toes
    cutL(tubeLine(w.thighN_D, -0.35, 0.25, 0.8), { seed: s + 80, smooth: true });
    cutL(V.arcPts(120, -128, 11, 10, -0.3, 2.6, 12), { seed: s + 81 });
    cutL(across(w.shinN_D, 0.16, 0.92, -6), { seed: s + 82 });
    const sp = [];
    for (let i = 0; i <= 16; i++) { const a = -0.5 + (i / 16) * 5.4, r = 7.5 * (1 - i / 22); sp.push([121 + Math.cos(a) * r, -127 + Math.sin(a) * r]); }
    cutL(sp, { seed: s + 83, taper: [1, 1] });
    cutL(tubeLine(w.shinN_D, 0.5, 0.22, 0.86), { seed: s + 84, smooth: true });
    cutL(tubeLine(w.shinN_D, -0.3, 0.3, 0.8), { seed: s + 85, smooth: true });
    cutL(across(w.shinN_D, 0.9, 0.95, 4), { seed: s + 86 });
    cutL([[132, -9], [148, -6]], { seed: s + 87 });
    cutL([[128, -4], [144, -2]], { seed: s + 88 });
  }
  function femStatic(F) {
    setXF({ ox: F.ox, S: F.S, dir: F.dir });
    const s = F.seed;
    spear([-74, 0], [-8, -546], s + 1);
    const white = (p, k) => { fillL(p, C.white, { seed: s + k }); inkL(p, { closed: true, w: 0.55, taper: [0, 0], wob: 0.2, seed: s + k + 1 }); };
    if (F.kind === 'goddess') {
      white(sm([[-36, -14], [-38, -2], [-30, 0], [8, 0], [11, -4], [-4, -9], [-20, -14]], 3), 10);
      white(sm([[4, -14], [2, -2], [10, 0], [50, 0], [54, -4], [40, -8], [24, -14]], 3), 20);
    } else {
      // Amazon: striding bare white legs (strong archaic thighs/calves), black greaves with incised calf ridge
      const legs = [
        { th: [[-8, -238], [-14, -190], [-20, -142]], thr: [[18, 17], [16, 14], [12, 11]], sh: [[-20, -142], [-30, -96], [-42, -24]], ft: [[-50, -30], [-57, -6], [-49, 0], [-8, 0], [-3, -4], [-18, -11], [-34, -22]], k: 30 },
        { th: [[8, -238], [20, -190], [30, -142]], thr: [[19, 18], [16, 14], [12, 11]], sh: [[30, -142], [28, -96], [22, -22]], ft: [[14, -28], [8, -6], [16, 0], [60, 0], [65, -4], [50, -10], [32, -21]], k: 40 },
      ];
      legs.forEach((L) => {
        const th = tubeD(L.th, L.thr), shD = tubeD(L.sh, [[12, 11], [19, 9.5], [7.5, 6.5]]), ft = sm(L.ft, 3), k = L.k;
        [tubeOut(th, 1.9), tubeOut(shD, 1.9)].forEach((p, i) => fillL(p, C.glaze, { seed: s + k + i }));
        fillL(ft, C.white, { seed: s + k + 2 });
        inkL(ft, { closed: true, w: 0.55, taper: [0, 0], seed: s + k + 3 });
        fillL(tubeOut(th), C.white, { seed: s + k + 6 });
        fillL(tubeOut(shD), C.white, { seed: s + k + 7 });
        inkL(V.arcPts(L.th[2][0], L.th[2][1] + 2, 8, 7, 0.2, 2.8, 8), { w: 0.38, taper: [1, 1], wob: 0.1, seed: s + k + 8 });
        const P = (q) => lerp2(L.sh[0], L.sh[2], q);
        const gD = tubeD([P(0.12), [L.sh[1][0], L.sh[1][1]], P(0.86)], [[13.5, 12.5], [21, 11.5], [9.5, 8.5]]);
        fillL(tubeOut(gD), C.glaze, { seed: s + k + 10 });
        cutL(tubeLine(gD, 0.45, 0.15, 0.85), { seed: s + k + 11, smooth: true });
        cutL(tubeLine(gD, -0.4, 0.2, 0.8), { seed: s + k + 12, smooth: true });
        cutL(across(gD, 0.1, 0.8, -3), { seed: s + k + 13 });
        cutL(across(gD, 0.92, 0.8, 2), { seed: s + k + 14 });
      });
    }
  }
  function table() {
    // the "gaming table" as a little Doric block-altar: cornice, triglyph frieze with a purple metope, plinth
    setXF({ ox: 960, S: 1.25, dir: 1 });
    const body = [[-46, -98], [46, -98], [46, -8], [-46, -8]], cornice = sm([[-58, -112], [58, -112], [60, -106], [52, -98], [-52, -98], [-60, -106]], 2), plinth = [[-54, -9], [54, -9], [54, 0], [-54, 0]];
    fillL(body, C.glaze, { seed: 5001 });
    fillL(plinth, C.glaze, { seed: 5007 });
    cutL([[-54, -9], [54, -9]], { seed: 5008, taper: [0, 0] });
    halo(cornice, [body], { seed: 5002 });
    fillL(cornice, C.glaze, { seed: 5003 });
    cutL([[-58, -106], [58, -106]], { seed: 5009, taper: [0, 0] });
    fillL([[-24, -86], [24, -86], [24, -20], [-24, -20]], C.purple, { seed: 5004 });
    cutL([[-24, -86], [24, -86], [24, -20], [-24, -20]], { closed: true, seed: 5005, taper: [0, 0] });
    for (const sx of [-1, 1]) {
      for (const gx of [30, 37]) cutL([[sx * gx, -88], [sx * gx, -18]], { seed: 5020 + gx + sx, taper: [1, 1] });
      for (let i = 0; i < 3; i++) dotL(sx * (28.5 + i * 5.5), -93, 1.5, C.white, { seed: 5030 + i + sx });
    }
    for (let i = 0; i < 10; i++) dotL(-50 + i * 11.1, -109, 1.9, C.white, { seed: 5010 + i });
    // a pebble or two, left mid-game
    dotL(-12, -116, 3.4, C.white, { seed: 5040 });
    dotL(9, -116, 3.4, C.glaze, { seed: 5041 });
  }
  function inscriptions() {
    const o = { color: C.glaze, w: 0.72, taper: [3, 3], wob: 0.3, step: 3 };
    inkStrokes(greekStrokes('ΑΧΙΛΕΟΣ', 476, 302, { size: 36, ang: Math.PI / 2 }), Object.assign({ seed: 7001 }, o));
    inkStrokes(greekStrokes('ΑΙΑΝΤΟΣ', 1444, 302, { size: 36, ang: Math.PI / 2, retro: true }), Object.assign({ seed: 7101 }, o));
    inkStrokes(greekStrokes('ΞΖʹ ΚΑΛΟΣ', 1436, 238, { size: 36, ang: 0.01 }), Object.assign({ seed: 7201 }, o));
    // the painter's signature, as Exekias signed his pots: "Exekias painted (me)"
    inkStrokes(greekStrokes('ΕΧΣΕΚΙΑΣ ΕΓΡΑΦΣΕ', 46, 262, { size: 36, ang: Math.PI / 2, gap: 0.3 }), Object.assign({ seed: 7301 }, o));
  }

  // ------------------------------------------------------------------ figure bodies (sprites)
  function warriorBody(F) {
    setXF({ ox: F.ox, S: F.S, dir: F.dir });
    const w = WAR, s = F.seed + 100;
    fillL(w.torso, C.glaze, { seed: s });
    fillL(w.neck, C.glaze, { seed: s + 1 });
    // pteruges (leather flaps under the corslet), every other one purple
    halo(w.pter, [w.torso], { seed: s + 2 });
    fillL(w.pter, C.glaze, { seed: s + 3 });
    const T0 = [-30, -116], T1 = [64, -150], B0 = [-26, -92], B1 = [66, -126];
    for (let k = 1; k < 8; k++) {
      const a = lerp2(T0, T1, k / 8), b = lerp2(B0, B1, k / 8), a2 = lerp2(T0, T1, (k + 1) / 8), b2 = lerp2(B0, B1, (k + 1) / 8);
      if (k % 2 === 1 && k < 7) fillL([lerp2(a, b, 0.12), lerp2(a2, b2, 0.12), lerp2(a2, b2, 0.92), lerp2(a, b, 0.92)], C.purple, { seed: s + 10 + k });
      cutL([lerp2(a, b, 0.05), lerp2(a, b, 0.98)], { seed: s + 20 + k });
    }
    cutL([[-30, -116], [4, -136], [36, -152], [62, -150]], { seed: s + 30, smooth: true });
    // corslet: waist band, belly arc, chest spiral
    cutL(across(w.torso_D, 0.38, 0.9, -4), { seed: s + 31 });
    cutL(across(w.torso_D, 0.45, 0.9, -4), { seed: s + 32 });
    cutL(tubeLine(w.torso_D, 0.45, 0.48, 0.92), { seed: s + 33, smooth: true });
    const pc = [92, -238], sp = [];
    for (let i = 0; i <= 18; i++) { const a = 2.6 + (i / 18) * 5.6, r = 10 * (1 - i / 24); sp.push([pc[0] + Math.cos(a) * r, pc[1] + Math.sin(a) * r]); }
    cutL(sp, { seed: s + 34, taper: [1, 1] });
    // cloak with Exekias' woven pattern (Achilles: purple checker + white-dotted hem; Ajax: purple bands)
    halo(w.cloak, [w.torso, w.neck, w.pter], { seed: s + 40 });
    fillL(w.cloak, C.glaze, { seed: s + 41 });
    if (F.key === 'ajax') cloakPattern(w.cloak, { cell: 13, ang: -0.96, seed: s + 50, border: 12, mode: 'rows', shift: [4, 2] });
    else cloakPattern(w.cloak, { cell: 14.5, ang: -1.02, seed: s + 50, border: 11, borderDots: true });
    // long incised folds running down the drape (cut over the weave, as the painter scored them last)
    [[[84, -290], [56, -256], [26, -210], [2, -160], [-16, -112], [-24, -96]], [[98, -282], [76, -248], [48, -204], [24, -154], [8, -108]]].forEach((f, k) => {
      cutL(f, { seed: s + 190 + k, smooth: true, w: 0.62, taper: [10, 14], wob: 0.5 });
      cutL(f.map(([x, y]) => [x + 5, y + 2]), { seed: s + 194 + k, smooth: true, w: 0.34, taper: [14, 18], wob: 0.5 });
    });
    // long locks falling from the nape over the cloak
    [[[106, -318], [98, -296], [90, -272]], [[113, -316], [106, -293], [99, -268]], [[120, -314], [114, -291], [108, -266]]].forEach((sp, k) => {
      const D = tubeD(sp, [[4.2, 4.2], [3.6, 3.6], [2.4, 2.4]]), L = tubeOut(D);
      halo(L, [w.cloak, w.torso, w.neck], { seed: s + 200 + k * 3, w: 0.7 });
      fillL(L, C.glaze, { seed: s + 201 + k * 3 });
    });
    if (F.key === 'ajax') return ajaxHead(F, s);
    // helmet (Corinthian) + purple beard
    halo(w.helmet, [w.neck, w.cloak], { seed: s + 300 });
    fillL(w.helmet, C.glaze, { seed: s + 301 });
    fillL(w.stilt, C.glaze, { seed: s + 302 });
    halo(w.beard, [w.helmet, w.neck], { seed: s + 303 });
    fillL(w.beard, C.purple, { seed: s + 304 });
    for (let k = 0; k < 5; k++) cutL([[160 + k * 8, -306 + k * 1.5], [170 + k * 6.5, -293 + k], [178 + k * 3.5, -276 + k * 2]], { seed: s + 310 + k, smooth: true, w: 0.36, taper: [2, 5] });
    // eye-hole, eye, brow ridge, nose guard, mouth slit, cheek guard, spiral, neck guard, dome line
    cutL(sm([[175, -351], [188, -357], [199, -352], [195, -342], [181, -341]], 3), { closed: true, seed: s + 320 });
    cutL(sm([[180, -348.5], [187.5, -352.5], [195, -348.5], [187.5, -345.5]], 3), { closed: true, seed: s + 321, w: 0.34 });
    dotL(188, -349, 1.9, C.inc, { seed: s + 322 });
    cutL([[140, -370], [170, -363], [200, -354]], { seed: s + 323, smooth: true });
    cutL([[197, -343], [204, -334], [205, -323]], { seed: s + 324 });
    cutL([[200, -321], [186, -319]], { seed: s + 329 });
    cutL([[178, -341], [173, -326], [178, -310], [192, -300]], { seed: s + 325, smooth: true });
    const sp2 = [];
    for (let i = 0; i <= 18; i++) { const a = 3.4 + (i / 18) * 6, r = 9.5 * (1 - i / 24); sp2.push([156 + Math.cos(a) * r, -334 + Math.sin(a) * r]); }
    cutL(sp2, { seed: s + 326, taper: [1, 1] });
    cutL([[106, -318], [134, -322], [158, -318]], { seed: s + 327, smooth: true });
    cutL([[110, -352], [126, -374], [150, -384]], { seed: s + 328, smooth: true });
  }
  /** Ajax: bare-faced, his Corinthian helmet pushed up onto the crown (the empty eye-hole shows the clay through) */
  function ajaxHead(F, s) {
    const w = WAR;
    halo(AJ.face, [w.neck, w.cloak], { seed: s + 300 });
    fillL(AJ.face, C.glaze, { seed: s + 301 });
    // hair: incised waves over the skull, purple fillet, curls at the nape; ear; eye; brow; mouth & moustache
    for (let k = 0; k < 4; k++) cutL([[150 - k * 9, -374 + k * 3], [134 - k * 7, -356 + k * 2], [126 - k * 4, -334 + k], [118 - k * 2, -318]], { seed: s + 330 + k, smooth: true, w: 0.36 });
    fillL(sm([[128, -366], [150, -373], [176, -372], [177, -366], [150, -367], [130, -360]], 2), C.purple, { seed: s + 336 });
    cutL(V.arcPts(152, -340, 6.5, 9.5, Math.PI * 0.45, Math.PI * 1.55, 12), { seed: s + 337, w: 0.4 });
    cutL(V.arcPts(153, -340, 2.6, 4.2, Math.PI * 0.5, Math.PI * 1.5, 8), { seed: s + 338, w: 0.32 });
    cutL(sm([[172, -350], [180, -354], [189, -350.5], [180, -347]], 3), { closed: true, seed: s + 339, w: 0.36 });
    dotL(181, -350.5, 1.9, C.inc, { seed: s + 340 });
    cutL([[170, -358], [180, -361], [191, -357]], { seed: s + 341, smooth: true, w: 0.36 });
    cutL([[196, -328], [189, -328]], { seed: s + 342, w: 0.38 });
    halo(AJ.beard, [AJ.face, w.neck], { seed: s + 303 });
    fillL(AJ.beard, C.purple, { seed: s + 304 });
    for (let k = 0; k < 5; k++) cutL([[156 + k * 8, -316 + k * 0.5], [166 + k * 6, -302 + k], [174 + k * 3, -284 + k * 2]], { seed: s + 310 + k, smooth: true, w: 0.36, taper: [2, 5] });
    cutL([[185, -333], [194, -331], [199, -326]], { seed: s + 343, smooth: true, w: 0.36 });
    // the pushed-up helmet
    halo(AJ.helmU, [AJ.face], { seed: s + 350 });
    fillL(AJ.helmU, C.glaze, { seed: s + 351 });
    fillL(w.stilt.map((p) => AJ.pre(p[0], p[1])), C.glaze, { seed: s + 352 });
    XF.pre = AJ.pre;
    fillL(sm([[176, -350], [188, -356], [198, -352], [195, -343], [181, -342]], 3), C.clay, { seed: s + 353 });
    cutL([[140, -370], [170, -363], [200, -354]], { seed: s + 354, smooth: true });
    cutL([[197, -343], [204, -334], [205, -323]], { seed: s + 355 });
    cutL([[178, -341], [173, -326], [178, -310], [192, -300]], { seed: s + 356, smooth: true });
    const sp2 = [];
    for (let i = 0; i <= 18; i++) { const a = 3.4 + (i / 18) * 6, r = 9.5 * (1 - i / 24); sp2.push([156 + Math.cos(a) * r, -334 + Math.sin(a) * r]); }
    cutL(sp2, { seed: s + 357, taper: [1, 1] });
    cutL([[106, -318], [134, -322], [158, -318]], { seed: s + 358, smooth: true });
    cutL([[110, -352], [126, -374], [150, -384]], { seed: s + 359, smooth: true });
    XF.pre = null;
  }
  function femHead(F, s) {
    const f = FEM;
    XF.pre = f.headPre;
    fillL(f.hair, C.glaze, { seed: s });
    for (let k = 0; k < 4; k++) {
      const pts = [];
      for (let i = 0; i <= 10; i++) { const y = -446 + i * 12.6; pts.push([4 - k * 6 - i * 1.9 + Math.sin(i * 1.3 + k) * 2.2, y]); }
      cutL(pts, { seed: s + 1 + k, smooth: true, w: 0.36 });
    }
    fillL(f.neck, C.white, { seed: s + 10 });
    fillL(f.face, C.white, { seed: s + 11 });
    inkL([[38, -463], [42, -456], [47, -446], [52, -438], [45, -435], [46, -431], [41, -428], [45, -425], [44, -418], [38, -412], [26, -408]], { w: 0.5, taper: [2, 2], wob: 0.1, seed: s + 12, step: 2 });
    inkL([[12, -412], [22, -406], [24, -398], [28, -389]], { w: 0.45, taper: [2, 2], wob: 0.1, seed: s + 13, smooth: true });
    inkL(sm([[26.5, -447], [33, -451.5], [40.5, -447.5], [33, -444.5]], 3), { closed: true, w: 0.42, taper: [0, 0], wob: 0, seed: s + 14, step: 2 });
    dotL(34, -447.6, 2.0, C.glaze, { seed: s + 15 });
    inkL([[26, -455], [34, -458], [42, -455.5]], { w: 0.42, smooth: true, taper: [2, 2], wob: 0.1, seed: s + 16 });
    inkL([[41, -428], [35.5, -427.4]], { w: 0.4, taper: [1, 2], wob: 0.1, seed: s + 17 });
    // earring
    dotL(15, -430, 2.6, C.purple, { seed: s + 18 });
    // helmet
    halo(f.helmet, [f.hair], { seed: s + 20 });
    fillL(f.helmet, C.glaze, { seed: s + 21 });
    fillL(f.stilt, C.glaze, { seed: s + 22 });
    cutL([[-6, -456], [10, -466], [26, -469], [44, -466], [52, -462]], { seed: s + 23, smooth: true });
    fillL(sm([[-2, -470], [12, -478], [28, -480], [42, -476], [40, -471], [26, -474], [12, -473], [0, -466]], 3), C.purple, { seed: s + 24 });
    const sp = [];
    for (let i = 0; i <= 16; i++) { const a = 3.1 + (i / 16) * 5.6, r = 6.5 * (1 - i / 22); sp.push([8 + Math.cos(a) * r, -460 + Math.sin(a) * r]); }
    cutL(sp, { seed: s + 25, taper: [1, 1], w: 0.36 });
    XF.pre = null;
  }
  function athenaBody(F) {
    setXF({ ox: F.ox, S: F.S, dir: F.dir });
    const f = FEM, s = F.seed + 100;
    fillL(f.peplos, C.glaze, { seed: s });
    // decorated front panel: purple with a column of white dots + incised zigzag
    fillL(f.panel, C.purple, { seed: s + 1 });
    cutL(f.panel.slice(0, 8), { seed: s + 2, smooth: true });
    cutL(f.panel.slice(8).concat([f.panel[0]]), { seed: s + 3, smooth: true });
    for (let k = 0; k < 15; k++) {
      const y = -270 + k * 17;
      dotL(24 + (y + 270) * 0.035 + (k % 2) * 3, y, 2.2, C.white, { seed: s + 10 + k });
    }
    // incised folds on the skirt + hem bands
    for (let k = 0; k < 4; k++) cutL([[-26 + k * 10, -262], [-27 + k * 10.5, -160], [-30 + k * 11, -40], [-33 + k * 11.5, -22]], { seed: s + 30 + k, smooth: true, w: 0.4 });
    fillL([[-40, -40], [41, -40], [42, -30], [-41, -30]], C.purple, { seed: s + 40 });
    cutL([[-41, -24], [44, -24]], { seed: s + 41 });
    cutL([[-38, -48], [40, -48]], { seed: s + 42 });
    for (let k = 0; k < 9; k++) dotL(-34 + k * 9, -55, 1.8, C.white, { seed: s + 43 + k });
    fillL([[-22, -296], [28, -292], [29, -284], [-23, -288]], C.purple, { seed: s + 60 });
    // hair + aegis (scales, snakes) + head
    femHead(F, s + 200);
    halo(f.aegis, [f.peplos, f.hair], { seed: s + 70 });
    fillL(f.aegis, C.glaze, { seed: s + 71 });
    const inn = inset(f.aegis, 5);
    cutL(inn, { closed: true, seed: s + 72, taper: [0, 0] });
    let k = 0;
    for (let y = -384; y < -310; y += 8)
      for (let x = -24; x < 46; x += 9) {
        const cx = x + ((y / 8) % 2 ? 4.5 : 0);
        if (!pip(cx, y, inset(f.aegis, 7)) || !pip(cx, y + 5, inset(f.aegis, 7))) continue;
        cutL(V.arcPts(cx, y, 4.2, 4.2, 0.15, Math.PI - 0.15, 6), { seed: s + 80 + k++, w: 0.32, taper: [1, 1] });
      }
    // snakes on the aegis edge
    const snakes = [[49, -338, 1, 0.1], [45, -322, 1, 0.75], [31, -311, 0.35, 1], [12, -312, 0, 1], [-6, -309, -0.35, 1], [-25, -318, -1, 0.55], [-27, -346, -1, -0.1], [-22, -370, -1, -0.4]];
    snakes.forEach(([x, y, ox, oy], i) => {
      const l = Math.hypot(ox, oy), ux = ox / l, uy = oy / l, nx = -uy, ny = ux, fl = i % 2 ? 1 : -1;
      const P = (a, b) => [x + ux * a + nx * b * fl, y + uy * a + ny * b * fl];
      inkL([P(-2, 0), P(6, 4), P(13, -3.5), P(20, 1.5)], { w: 1.0, smooth: true, taper: [2, 1], wob: 0.1, seed: s + 200 + i });
      fillL(sm([P(18, 0), P(21, 3.6), P(27, 2.4), P(28, 0.6), P(22, -1.6)], 2), C.glaze, { seed: s + 220 + i });
    });
  }
  function amazonBody(F) {
    setXF({ ox: F.ox, S: F.S, dir: F.dir });
    const f = FEM, s = F.seed + 100;
    // quiver on her back
    fillL(f.quiver, C.glaze, { seed: s });
    fillL([lerp2(f.quiver[0], f.quiver[3], 0.18), lerp2(f.quiver[1], f.quiver[2], 0.18), lerp2(f.quiver[1], f.quiver[2], 0.26), lerp2(f.quiver[0], f.quiver[3], 0.26)], C.purple, { seed: s + 1 });
    for (const t of [0.5, 0.56, 0.8]) cutL([lerp2(f.quiver[0], f.quiver[3], t), lerp2(f.quiver[1], f.quiver[2], t)], { seed: s + 2 + t * 10 });
    fillL(sm([[-14, -392], [4, -388], [8, -400], [-6, -408], [-18, -402]], 3), C.glaze, { seed: s + 5 });
    halo(f.chiton, [f.quiver], { seed: s + 6 });
    fillL(f.chiton, C.glaze, { seed: s + 7 });
    cloakPattern(f.chiton, { cell: 13, ang: 0.0, seed: s + 10, border: 9, shift: [3, 0] });
    // hem band (purple with white dots) + belt
    fillL([[-34, -214], [35, -214], [36, -205], [-34, -205]], C.purple, { seed: s + 400 });
    for (let k = 0; k < 8; k++) dotL(-28 + k * 8.5, -219, 1.6, C.white, { seed: s + 401 + k });
    fillL([[-22, -298], [26, -294], [27, -286], [-23, -290]], C.purple, { seed: s + 420 });
    femHead(F, s + 500);
    // white-dotted rim on her helmet
    XF.pre = FEM.headPre;
    for (let k = 0; k < 7; k++) dotL(0 + k * 7, -468 - Math.sin((k / 6) * Math.PI) * 6, 1.4, C.white, { seed: s + 520 + k });
    XF.pre = null;
  }

  // ------------------------------------------------------------------ live parts: arms, crests
  function armGeo(F, t, which) {
    const A = ARM[F.kind];
    const side = (which === 'near') === (F.dir === 1) ? 0 : 1;
    const g = G.arm(t, side);
    const sh = which === 'near' ? A.shN : A.shF, off = which === 'near' ? [0, 0] : A.farOff;
    const e = V.ik(sh[0], sh[1], A.wrist[0] + off[0], A.wrist[1] + off[1] - A.amp * g.y, A.l1, A.l2, 1);
    const el = [e.ex, e.ey], wr = [e.hx, e.hy];
    const mid = lerp2(el, wr, 0.32);
    const upD = tubeD([sh, lerp2(sh, el, 0.45), el], [[A.r[0], A.r[0]], [A.r[0] * 0.98, A.r[0] * 1.06], [A.r[1], A.r[1]]]);
    const foD = tubeD([el, mid, wr], [[A.r[1], A.r[1]], [A.r[1] * 1.14, A.r[1] * 1.0], [A.r[2], A.r[2]]]);
    const fang = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
    const hang = fang * 0.28 - 0.06 * g.v;
    const hs = A.hand / 40, c = Math.cos(hang), s = Math.sin(hang);
    const H = (x, y) => [wr[0] + (c * x - s * y) * hs, wr[1] + (s * x + c * y) * hs];
    const hR = [[6.4, 6.4], [7.3, 6.6], [5.4, 4.6], [3.8, 3.3], [2.6, 2.4]].map((r) => [r[0] * hs, r[1] * hs]);
    const handD = tubeD([H(-2, 0), H(13, -0.5), H(27, -1.8), H(37, -4.8), H(42, -9)], hR);
    const thumbD = tubeD([H(7, -5), H(13, -11.5), H(18, -16)], [[3.4 * hs, 3.4 * hs], [2.9 * hs, 2.9 * hs], [2.2 * hs, 2.2 * hs]]);
    return { sh, el, wr, upD, foD, handD, thumbD, H, hs, g };
  }
  const armParts = (a, grow = 0) => [tubeOut(a.upD, grow), tubeOut(a.foD, grow), tubeOut(a.handD, grow), tubeOut(a.thumbD, grow)];
  function armBlack(a, near, under, seed) {
    const parts = armParts(a);
    if (near && under) parts.forEach((p, k) => halo(p, under, { seed: seed + k, w: 0.8 }));
    parts.forEach((p, k) => fillL(p, C.glaze, { seed: seed + 10 + k }));
    const H = a.H;
    cutL([H(14, -2.5), H(26, -3.6), H(35, -6)], { seed: seed + 20, w: 0.36, smooth: true });
    cutL([H(13, 1.6), H(25, 0.6), H(34, -2.5)], { seed: seed + 21, w: 0.36, smooth: true });
    if (near) {
      cutL(across(a.foD, 0.96, 0.95, -2), { seed: seed + 22, w: 0.4 });
      cutL(tubeLine(a.upD, -0.42, 0.3, 0.85), { seed: seed + 23, w: 0.4, smooth: true });
      cutL(tubeLine(a.foD, 0.45, 0.12, 0.6), { seed: seed + 24, w: 0.4, smooth: true });
    }
  }
  function armWhite(a, seed) {
    armParts(a, 1.9).forEach((p, k) => fillL(p, C.glaze, { seed: seed + k }));
    armParts(a).forEach((p, k) => fillL(p, C.white, { seed: seed + 10 + k }));
    const H = a.H, o = { color: C.glaze, w: 0.34, taper: [1, 2], wob: 0.1, smooth: true };
    inkL([H(15, -2.6), H(26, -3.6), H(35, -6.3)], Object.assign({ seed: seed + 20 }, o));
    inkL([H(14, 1.4), H(25, 0.5), H(34, -2.6)], Object.assign({ seed: seed + 21 }, o));
    inkL(across(a.foD, 0.97, 0.9, -1.5), Object.assign({ seed: seed + 22 }, o));
    inkL(tubeLine(a.upD, 0.5, 0.82, 1.0).concat(tubeLine(a.foD, 0.5, 0.0, 0.16)), Object.assign({ seed: seed + 23 }, o));
  }
  /** crest in helmet space (stilt-top B, scale cs, swing ang), optionally mapped through `pre` (head scale / pushed-up helmet) into body space */
  function drawCrest(B, cs, ang, under, seed, pre, o = {}) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const T0 = (q) => [B[0] + cs * (c * q[0] - s * q[1]), B[1] + cs * (s * q[0] + c * q[1])];
    const T = pre ? (q) => pre(...T0(q)) : T0;
    const poly = CREST.poly.map(T);
    halo(poly, under, { seed });
    fillL(poly, C.glaze, { seed: seed + 1 });
    const stripe = CREST.stripe.map(T);
    inkL(stripe, { color: C.purple, w: 1.25 * cs, taper: [6, 10], wob: 0.15, seed: seed + 2 });
    CREST.lines.forEach((l, k) => cutL(l.map(T), { seed: seed + 3 + k, w: 0.4, taper: [4, 8], smooth: true }));
    if (o.dots) V.resample(stripe, 9).slice(1, -1).forEach((p, k) => dotL(p[0], p[1], 1.45, C.white, { seed: seed + 20 + k }));
  }

  // ------------------------------------------------------------------ bakes (static base + one sprite per figure)
  const SPR = {};
  function ensureBakes() {
    if (SPR.ok) return;
    const job = (key, fn) => {
      clear();
      V.resetBrush();
      V.mReset();
      fn();
      V.flush();
      SPR[key] = get();
    };
    job('base', () => {
      V.blit(clayTex(), 0, 0, V.W, V.H);
      // firing mottles: big translucent watercolour blooms (p5.brush fill bleed/texture)
      const ms = [[300, 660, 430, 270, '#7e4628', 0.22], [1560, 300, 380, 220, '#a7582a', 0.18], [1180, 1000, 560, 170, '#5f4535', 0.2], [700, 280, 320, 200, '#eaa462', 0.2], [1250, 520, 260, 200, '#e8a060', 0.14], [1720, 760, 260, 320, '#7a4026', 0.18], [40, 220, 240, 320, '#54392b', 0.2], [980, 120, 380, 70, '#6a4a3a', 0.16]];
      ms.forEach(([x, y, rx, ry, col, a], i) => V.fill(blobPts(x, y, rx, ry, i), { color: col, alpha: a, flat: false, bleed: 0.25, tex: 0.7, border: 0.25, seed: 30 + i }));
      topBands();
      bottomBands();
      inscriptions();
      femStatic(FIG.athena);
      warriorStatic(FIG.achil);
      warriorStatic(FIG.ajax);
      femStatic(FIG.amazon);
      table();
      chips(320, 9100, [0, 0, V.W, V.H]);
    });
    const wbb = [-60, -400, 270, 320];
    job('athena', () => { athenaBody(FIG.athena); chipsL([FEM.peplos], 26, 9300, [-60, -400, 120, 400]); });
    job('achil', () => { warriorBody(FIG.achil); chipsL([WAR.torso, WAR.cloak, WAR.helmet], 34, 9400, wbb); });
    job('ajax', () => { warriorBody(FIG.ajax); chipsL([WAR.torso, WAR.cloak, AJ.face, AJ.helmU], 34, 9500, wbb); });
    job('amazon', () => { amazonBody(FIG.amazon); chipsL([FEM.chiton], 18, 9600, [-60, -400, 120, 200]); });
    clear();
    SPR.ok = true;
  }

  function drawWarrior(F, t) {
    const p = G.pulse(t, 6);
    const rot = 0.05 * p - 0.012;
    setXF({ ox: F.ox, S: F.S, dir: F.dir });
    const piv = TL(0, -100);
    setXF({ ox: F.ox, S: F.S, dir: F.dir, rot, px: 0, py: -100 });
    const far = armGeo(F, t, 'far'), near = armGeo(F, t, 'near');
    armBlack(far, false, null, F.seed + 600);
    V.blit(SPR[F.key], piv[0], piv[1], V.W, V.H, { rot: F.dir * rot, ox: piv[0], oy: piv[1] });
    const aj = F.key === 'ajax', body = aj ? AJ.body : WAR.body;
    drawCrest(WAR.crestB, 1.0, 0.085 * G.pulse(t - 0.05, 5) - 0.025 * G.bob(t), body, F.seed + 700, aj ? AJ.pre : null, { dots: aj });
    const farParts = armParts(far);
    armBlack(near, true, body.concat(farParts), F.seed + 650);
  }
  function drawFem(F, t) {
    const dy = 4.5 * G.pulse(t, 6);
    setXF({ ox: F.ox, S: F.S, dir: F.dir });
    const y0 = TL(0, -300)[1];
    setXF({ ox: F.ox, S: F.S, dir: F.dir, dy });
    const dys = TL(0, -300)[1] - y0;
    const far = armGeo(F, t, 'far'), near = armGeo(F, t, 'near');
    armWhite(far, F.seed + 600);
    V.blit(SPR[F.key], 0, dys, V.W, V.H);
    const under = [FEM.hair, FEM.helmet].map((p) => p.map((q) => FEM.headPre(q[0], q[1])));
    drawCrest(FEM.crestB, 0.8, 0.08 * G.pulse(t - 0.05, 5) - 0.025 * G.bob(t), under, F.seed + 700, FEM.headPre, { dots: F.kind === 'amazon' });
    armWhite(near, F.seed + 650);
  }
  /** warrior mouth in UNWRAPPED coords (follows the bow), so the spoken word stays attached to the speaker */
  function mouthU(F, t) {
    const rot = 0.05 * G.pulse(t, 6) - 0.012, [x0, y0] = F.key === 'ajax' ? AJ.mouth : WAR.mouth, py = -100;
    const c = Math.cos(rot), s = Math.sin(rot), dy = y0 - py;
    const x = c * x0 - s * dy, y = py + s * x0 + c * dy;
    return [F.ox + F.dir * F.S * x, GROUND + F.S * y];
  }
  function drawWords(t) {
    const s = G.say(t);
    const mA = mouthU(FIG.achil, t), mB = mouthU(FIG.ajax, t);
    const items = [
      // Achilles: ΕΞ runs from his lips down toward the board; Ajax: ΕΠΤΑ runs retrograde (right-to-left, mirrored letters) up from his lips — as on Exekias' vase
      { str: 'ΕΞ', x: mA[0] + 38, y: mA[1] + 2, ang: 0.3, retro: false, on: s.n === 6, k: 0 },
      { str: 'ΕΠΤΑ', x: mB[0] - 48, y: mB[1] + 6, ang: Math.PI + 0.44, retro: true, on: s.n === 7, k: 1 },
    ];
    items.forEach((it) => {
      const pop = it.on ? 1 + 0.14 * s.env : 1;
      const st = greekStrokes(it.str, it.x, it.y, { size: 42 * pop, ang: it.ang, retro: it.retro });
      if (it.on) {
        inkStrokes(st, { color: C.glaze, w: 2.3, taper: [1, 1], wob: 0.3, seed: 8000 + it.k * 50 });
        inkStrokes(st, { color: C.white, w: 1.25, taper: [3, 3], wob: 0.35, seed: 8100 + it.k * 50 });
      } else {
        inkStrokes(st, { color: C.glaze, w: 0.85, taper: [3, 3], wob: 0.3, seed: 8200 + it.k * 50 });
      }
    });
  }

  // ------------------------------------------------------------------ light: cylinder falloff + travelling glaze highlight
  function shadeTex() {
    return V.gfx('greekShade', V.W, V.H, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, V.W, 0);
      for (let i = 0; i <= 40; i++) {
        const x = i / 40, xn = (x * V.W - 880) / 1000;
        const b = V.clamp(1 - 0.66 * Math.pow(Math.abs(xn), 2.1), 0, 1);
        g.addColorStop(x, `rgb(${Math.round(255 * Math.pow(b, 0.8))},${Math.round(255 * Math.pow(b, 1.05))},${Math.round(255 * Math.pow(b, 1.3))})`);
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, V.W, V.H);
      ctx.globalCompositeOperation = 'multiply';
      const v = ctx.createLinearGradient(0, 0, 0, V.H);
      v.addColorStop(0, 'rgb(150,128,112)');
      v.addColorStop(0.1, 'rgb(225,214,204)');
      v.addColorStop(0.3, 'rgb(255,255,255)');
      v.addColorStop(0.72, 'rgb(255,255,255)');
      v.addColorStop(0.9, 'rgb(222,208,196)');
      v.addColorStop(1, 'rgb(160,138,120)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, V.W, V.H);
    });
  }
  function hiTex() {
    return V.gfx('greekHi', 600, 540, (ctx) => {
      const img = ctx.createImageData(600, 540), d = img.data;
      for (let y = 0; y < 540; y++) {
        const yy = (y - 280) / 300, vy = Math.exp(-yy * yy * 1.6);
        for (let x = 0; x < 600; x++) {
          const dx = x - 300 + (y - 270) * 0.02;
          const v = (0.26 * Math.exp(-(dx / 22) * (dx / 22)) + 0.13 * Math.exp(-(dx / 105) * (dx / 105)) + 0.07 * Math.exp(-((dx - 78) / 9) * ((dx - 78) / 9))) * vy;
          const i = (y * 600 + x) * 4;
          d[i] = 255 * v; d[i + 1] = 243 * v; d[i + 2] = 226 * v; d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    });
  }

  /** brush-streaked glaze sheen: faint warm streaks, screened -> only shows on the black glaze, barely on the clay */
  function sheenTex() {
    return V.gfx('greekSheen', 960, 540, (ctx) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 960, 540);
      ctx.filter = 'blur(1.5px)';
      const r = V.rng(4242);
      for (let k = 0; k < 520; k++) {
        const x = r() * 960, y = r() * 540, a = -0.9 + r() * 0.5 + (r() < 0.3 ? 1.6 : 0), L = 14 + r() * 50;
        ctx.strokeStyle = `rgba(${70 + r() * 40},${42 + r() * 22},${26 + r() * 12},${0.25 + r() * 0.4})`;
        ctx.lineWidth = 1.5 + r() * 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (r() - 0.5) * 8, y + Math.sin(a) * L * 0.5 + (r() - 0.5) * 8, x + Math.cos(a) * L, y + Math.sin(a) * L);
        ctx.stroke();
      }
    });
  }
  /** little chips where the glaze has flaked off over 2,500 years (clay-coloured flecks; invisible on the clay itself) */
  function chips(n, seed, box) {
    const r = V.rng(seed);
    for (let k = 0; k < n; k++) {
      const x = box[0] + r() * box[2], y = box[1] + r() * box[3], big = r() < 0.15;
      V.dot(x, y, big ? 1.6 + r() * 1.8 : 0.7 + r() * 0.9, r() < 0.5 ? C.clay : C.hi, { seed: seed + k });
    }
  }

  function chipsL(polys, n, seed, bb) {
    const r = V.rng(seed);
    let k = 0;
    for (let i = 0; i < n * 6 && k < n; i++) {
      const x = bb[0] + r() * bb[2], y = bb[1] + r() * bb[3], big = r() < 0.12, col = r() < 0.5 ? C.clay : C.hi;
      if (!inAny([x, y], polys)) continue;
      dotL(x, y, big ? 1.3 + r() * 1.2 : 0.55 + r() * 0.6, col, { seed: seed + k++ });
    }
  }

  V.scenes.greek = {
    draw(t, u) {
      ensureBakes();
      V.blit(SPR.base, 0, 0, V.W, V.H);
      drawPellets(t);
      drawFem(FIG.athena, t);
      drawWarrior(FIG.achil, t);
      drawWarrior(FIG.ajax, t);
      drawFem(FIG.amazon, t);
      drawWords(t);
      // light
      V.blit(sheenTex(), 0, 0, V.W, V.H, { blend: 'screen', alpha: 0.55 });
      V.blit(shadeTex(), 0, 0, V.W, V.H, { blend: 'multiply' });
      const hx = V.lerp(720, 1200, V.E.io2(V.clamp((u + 0.35) / 6.7)));
      V.blit(hiTex(), hx - 300, 0, 600, V.H, { blend: 'screen', alpha: 0.95 });
      V.blit(hiTex(), hx + 560 - 150, 60, 300, V.H - 120, { blend: 'screen', alpha: 0.3 });
      V.vignette({ amt: 0.28, color: '22,8,2', inner: 0.5 });
      V.grain({ amt: 0.05, anim: true });
    },
    hudStyle() {
      return { shadow: { c: 'rgba(226,146,78,0.95)', x: 0, y: 0, b: 16 }, labelBg: '#efe3cf', labelInk: '#1a120d', labelEdge: '#1a120d' };
    },
  };
})();
