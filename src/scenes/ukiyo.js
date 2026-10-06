/* ukiyo.js — 1831 · 浮世繪《神奈川沖六七裏》 (Hokusai, Thirty-six Views of Mount Fuji, parody)
 * Woodblock print: flat colour "plates" (Canvas2D, slightly mis-registered) + carved key-block lines (p5.brush ink, segmented so the
 * width nicks and swells like a cut line) + baren mottling / wood grain / aged washi on top.
 * Static paper, sky bokashi, Fuji, far sea and cartouche are baked once; the waves, claws, spray, boats and 19 rowers are drawn per frame.
 */
(function () {
  const V = window.V;
  const W = 1920, H = 1080, HZ = 735, FR = 24;
  const C = {
    prus: '#1c3f7a', prusD: '#0f2a5a', prusL: '#3c6fb0', prusP: '#86a9d0', paper: '#efe2bf', foam: '#f7f2e4',
    boat: '#d9b46a', boatD: '#a9833f', rail: '#3b2a1c', ver: '#c23a2b', sumi: '#1a1a24', line: '#10244d',
    skin: '#f0d2a2', hair: '#16151b', indigo: '#24366b', apron: '#e9dbb8', band: '#3466ad',
  };
  const ukRA = (c, a) => { const [r, g, b] = V.rgb(c); return `rgba(${r},${g},${b},${a})`; };

  // ------------------------------------------------------------------ geometry helpers
  function ukPath(ctx, pts, close = true) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
  }
  function ukNorm(pts) {
    const n = pts.length, o = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l; ty /= l;
      o.push([tx, ty, -ty, tx]); // tangent, inward normal (right-hand side when y is down)
    }
    return o;
  }
  function ukCum(pts) {
    const c = [0];
    for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return c;
  }
  /** resample to exactly n points by arc length */
  function ukResN(pts, n) {
    const cum = ukCum(pts), L = cum[cum.length - 1], o = [];
    let j = 0;
    for (let k = 0; k < n; k++) {
      const s = (L * k) / (n - 1);
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const sg = cum[j + 1] - cum[j] || 1, f = (s - cum[j]) / sg;
      o.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]);
    }
    return o;
  }
  function ukSub(pts, f0, f1) {
    const n = pts.length;
    return pts.slice(Math.max(0, Math.floor(f0 * (n - 1))), Math.min(n, Math.ceil(f1 * (n - 1)) + 1));
  }
  const ukSm = (pts, per = 10) => V.smoothPts(pts, false, per);

  /** carved key-block line: the path is cut into chunks of varying weight, each tapered — the nicks/swells of a knife-cut line */
  function ukCarve(pts, o) {
    if (!pts || pts.length < 2) return;
    const r = V.rng((o.seed || 1) * 977);
    const cum = ukCum(pts), L = cum[cum.length - 1];
    let s = 0, k = 0;
    const seg = o.seg || 200;
    while (s < L - 3 && k < 60) {
      const len = seg * (0.55 + 0.9 * r());
      const s1 = Math.min(L, s + len);
      const ch = [];
      for (let i = 0; i < pts.length; i++) if (cum[i] >= s && cum[i] <= s1 + 5) ch.push(pts[i]);
      if (ch.length >= 2) {
        V.ink(ch, {
          w: o.w * (0.78 + 0.5 * r()), color: o.color || C.line, brush: o.brush || 'ink', alpha: o.alpha == null ? 1 : o.alpha,
          taper: o.taper || [9, 12], wob: o.wob == null ? 0.45 : o.wob, seed: (o.seed || 1) * 31 + k, step: o.step || 5,
        });
      }
      s = s1 - 3 + (o.gap ? r() * o.gap : 0);
      k++;
    }
  }

  // ------------------------------------------------------------------ claw (Hokusai "dragon finger")
  function ukClawShape(bx, by, a0, len, w0, curl, steps = 3, fat = false) {
    const n = Math.max(4, Math.round(len / steps));
    const c = [];
    let x = bx, y = by, a = a0;
    for (let i = 0; i <= n; i++) {
      c.push([x, y, a]);
      const f = i / n;
      a += curl * steps * (fat ? 0.6 + 1.2 * f * f : 0.35 + 1.95 * f * f);
      x += Math.cos(a) * steps;
      y += Math.sin(a) * steps;
    }
    const Lp = [], Rp = [], ws = [];
    for (let i = 0; i <= n; i++) {
      const [px, py, pa] = c[i];
      const f = i / n;
      // fingers stay fat then come to a point; toes taper into a hook
      const w = fat ? w0 * Math.pow(Math.max(0, 1 - Math.pow(f, 1.7)), 0.72) : w0 * Math.pow(1 - f, 0.85);
      ws.push(w);
      const nx = -Math.sin(pa), ny = Math.cos(pa);
      Lp.push([px + nx * w, py + ny * w]);
      Rp.push([px - nx * w, py - ny * w]);
    }
    return { c, Lp, Rp, ws, n };
  }
  /** a claw with talons splitting off its convex side */
  function ukClaw(bx, by, a0, len, w0, curl, seed, nt) {
    const m = ukClawShape(bx, by, a0, len, w0, curl, 3, nt >= 2);
    const r = V.rng(seed);
    const tal = [];
    // toes fan out from the convex side, like a dragon's foot
    const fs = nt >= 3 ? [0.3, 0.46, 0.62, 0.78] : nt === 2 ? [0.42, 0.66] : nt === 1 ? [0.6] : [];
    fs.forEach((f0, q) => {
      const i = Math.round(f0 * m.n);
      const [x, y, a] = m.c[i];
      const w = m.ws[i];
      const tb = [x + Math.sin(a) * w * 0.55, y - Math.cos(a) * w * 0.55];
      const ta = a - 0.95 - 0.2 * r() + 0.12 * q;
      const tl = len * (0.3 + 0.09 * r()) * (nt >= 3 ? 1 : 0.9);
      tal.push(ukClawShape(tb[0], tb[1], ta, tl, Math.max(3, w * 0.52), (2.3 + 0.5 * r()) / tl, 2));
    });
    return { m, tal };
  }
  /** one claw, painted and outlined in sequence so it properly covers the claws behind it */
  function ukClawDraw(ctx, cl, lw) {
    const part = (s, w) => {
      ctx.fillStyle = C.foam; ukPath(ctx, ukClawPoly(s)); ctx.fill();
      ctx.fillStyle = 'rgba(148,182,220,0.95)'; ukPath(ctx, ukClawShade(s)); ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = w; ukPath(ctx, ukClawEdge(s), false); ctx.stroke();
    };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    part(cl.m, lw);
    cl.tal.forEach((tl) => part(tl, lw * 0.78));
  }
  const ukClawShade = (s) => {
    const i0 = Math.round(s.n * 0.32);
    return s.Lp.slice(i0).concat(s.c.slice(i0).map((p, i) => [p[0] - Math.sin(p[2]) * s.ws[i + i0] * 0.12, p[1] + Math.cos(p[2]) * s.ws[i + i0] * 0.12]).reverse());
  };
  const ukClawPoly = (s) => s.Lp.concat(s.Rp.slice().reverse());
  const ukClawEdge = (s) => s.Lp.slice(1).concat(s.Rp.slice(1).reverse()); // open outline (base left open)

  // ------------------------------------------------------------------ the big wave
  const OUT_B = [[-110, 655], [30, 548], [190, 438], [370, 330], [550, 244], [720, 185], [870, 154], [1005, 152], [1112, 178], [1192, 228], [1246, 296], [1268, 368], [1254, 428], [1222, 460]];
  const IN_B = [[1222, 460], [1192, 463], [1152, 446], [1108, 421], [1060, 410], [1013, 417], [975, 440], [946, 478], [927, 532], [916, 596], [914, 664], [922, 736], [940, 806], [968, 868], [1004, 922], [1046, 970], [1092, 1012]];
  const CORE_B = [[-110, 1190], [150, 1040], [420, 880], [630, 735], [770, 660], [850, 690], [878, 790], [890, 930], [915, 1110]];
  // secondary wave (right) and the near swell under boat C
  const OUT_S = [[1110, 950], [1230, 894], [1350, 832], [1470, 762], [1574, 698], [1664, 646], [1740, 614], [1806, 604], [1862, 614], [1912, 640], [1970, 680]];
  const FG = [[-90, 982], [110, 986], [300, 981], [450, 972], [560, 956], [640, 922], [698, 880], [734, 858], [762, 862], [800, 884], [858, 916], [950, 936], [1080, 940], [1200, 940], [1310, 950], [1420, 1010], [1530, 1100]];
  const NS = [[1236, 960], [1300, 884], [1380, 838], [1520, 798], [1660, 758], [1800, 722], [1960, 688]];

  function ukWarp(t, amp = 1) {
    const br = Math.sin(Math.PI * t); // one breath per bar
    const pu = V.G.pulse(t, 6);
    return (p) => {
      const h = V.clamp((1010 - p[1]) / 860);
      const k = h * h;
      return [p[0] + amp * (9 * br + 4 * pu) * k, p[1] - amp * (9 * br * h + 3.5 * pu * k)];
    };
  }
  function ukBig(t) {
    const wp = ukWarp(t);
    let out = V.resample(ukSm(OUT_B, 12), 4);
    const n0 = ukNorm(out), N = out.length;
    // foam clumps on the crest: the outer edge is lumpy, not a compass arc
    out = out.map((p, i) => {
      const f = i / (N - 1), s = i * 4;
      const env = V.smooth(0.43, 0.56, f) * (1 - V.smooth(0.9, 1, f));
      const lump = env * (5 + 4 * V.hash(Math.floor(s / 58))) * Math.pow(Math.abs(Math.sin((Math.PI * s) / 58 + 0.7)), 0.55);
      return wp([p[0] - n0[i][2] * lump, p[1] - n0[i][3] * lump]);
    });
    const inn = V.resample(ukSm(IN_B, 12), 4).map(wp);
    const mass = out.concat(inn.slice(1), [[1092, 1200], [-110, 1200]]);
    const arch0 = ukResN(out.concat(inn.slice(1)), 420);
    const arch1 = ukResN(V.smoothPts(CORE_B, false, 10).map(wp), 420);
    const B = { out, inn, mass, nOut: ukNorm(out), nIn: ukNorm(inn), arch0, arch1 };
    const sc = ukScratch(), mp = ukPath2D(mass), n = arch0.length;
    B.bands = BANDS_B.map((b) => {
      const i0 = Math.floor(b.f0 * (n - 1)), i1 = Math.ceil(b.f1 * (n - 1));
      let seen = false, cut = i1;
      for (let i = i0; i <= i1; i += 2) {
        const x = V.lerp(arch0[i][0], arch1[i][0], b.va), y = V.lerp(arch0[i][1], arch1[i][1], b.va);
        const ins = sc.isPointInPath(mp, x, y);
        if (ins) seen = true;
        else if (seen) { cut = i - 3; break; }
      }
      return Object.assign({}, b, { f1: Math.max(b.f0 + 0.02, cut / (n - 1)) });
    });
    return B;
  }
  const BANDS_B = ukBandSet(11, 17, 0.05, 0.92, [0.02, 0.3], [0.6, 0.97], 0.012, 0.034);
  const BANDS_S = ukBandSet(12, 7, 0.06, 0.8, [0.0, 0.25], [0.7, 1.0], 0.02, 0.05);
  const BANDS_F = ukBandSet(13, 8, 0.05, 0.85, [0.0, 0.3], [0.65, 1.0], 0.025, 0.06);
  const BANDS_N = ukBandSet(14, 6, 0.06, 0.85, [0.0, 0.3], [0.7, 1.0], 0.03, 0.07);
  function ukSec(t) {
    const wp = ukWarp(t + 0.5, 0.6);
    const out = V.resample(ukSm(OUT_S, 12), 4).map(wp);
    const arch0 = ukResN(out, 260), arch1 = arch0.map((p) => [p[0] - 70, p[1] + 330]);
    return { out, nOut: ukNorm(out), mass: out.concat([[1960, 1200], [1110, 1200]]), arch0, arch1 };
  }
  const ukArch = (B, v) => B.arch0.map((p, i) => [V.lerp(p[0], B.arch1[i][0], v), V.lerp(p[1], B.arch1[i][1], v)]);

  /** white foam cap riding the crest: outer = contour, inner edge = rounded fingers that reach back down the wave */
  function ukFoamCap(out, nrm, f0, f1, o = {}) {
    const N = out.length;
    const i0 = Math.floor(f0 * (N - 1)), i1 = Math.floor(f1 * (N - 1));
    const inner = [];
    const per = o.per || 46;
    for (let i = i1; i >= i0; i--) {
      const s0 = (i - i0) * 4, f = (i - i0) / Math.max(1, i1 - i0);
      // irregular finger spacing (hand-cut, not a stamp)
      const s = s0 + per * 0.32 * Math.sin(s0 / (per * 1.9) + (o.seed || 0));
      const base = (o.base || 10) + (o.deep || 40) * V.smooth(0, 0.45, f) * (1 - V.smooth(o.fadeA || 0.86, 1, f) * 0.85);
      const kk = Math.floor(s / per), loc = s / per - kk;
      const x = (loc - 0.5) / 0.42;
      const prof = Math.abs(x) < 1 ? Math.pow(1 - x * x, 0.42) : 0;
      const ends = o.taperEnds ? V.smooth(0, 0.12, f) * V.smooth(1, 0.88, f) : o.taperStart ? V.smooth(0, o.taperStart, f) : 1;
      const A = ((o.amp || 26) * (0.25 + 0.75 * V.smooth(0, 0.3, f))) * (0.5 + 0.9 * V.hash(kk * 3.17 + (o.seed || 0))) * (1 - V.smooth(0.88, 1, f) * 0.75) * ends;
      const d = (base * (o.taperEnds || o.taperStart ? ends : 1)) + A * prof, back = A * prof * 0.55;
      inner.push([out[i][0] + nrm[i][2] * d - nrm[i][0] * back, out[i][1] + nrm[i][3] * d - nrm[i][1] * back]);
    }
    return { poly: out.slice(i0, i1 + 1).concat(inner), inner };
  }
  /** a band between two interpolated arches, tapering to points at both ends (one carved colour area) */
  function ukBandPts(A0, A1, va, vb, f0, f1) {
    const n = A0.length, i0 = Math.max(0, Math.floor(f0 * (n - 1))), i1 = Math.min(n - 1, Math.ceil(f1 * (n - 1)));
    const top = [], bot = [];
    for (let i = i0; i <= i1; i++) {
      const f = (i - i0) / Math.max(1, i1 - i0);
      const tw = Math.pow(Math.sin(Math.PI * f), 0.55);
      const v2 = va + (vb - va) * tw;
      top.push([V.lerp(A0[i][0], A1[i][0], va), V.lerp(A0[i][1], A1[i][1], va)]);
      bot.push([V.lerp(A0[i][0], A1[i][0], v2), V.lerp(A0[i][1], A1[i][1], v2)]);
    }
    return { top, poly: top.concat(bot.reverse()) };
  }
  /** deterministic band layout: [{va, vb, f0, f1, tone}] */
  function ukBandSet(seed, n, vMin, vMax, fA, fB, wMin, wMax) {
    const r = V.rng(seed), res = [];
    for (let k = 0; k < n; k++) {
      const va = vMin + ((vMax - vMin) * (k + 0.15 + 0.7 * r())) / n;
      const w = wMin + (wMax - wMin) * r();
      const f0 = fA[0] + (fA[1] - fA[0]) * r(), f1 = fB[0] + (fB[1] - fB[0]) * r();
      res.push({ va, vb: va + w, f0, f1, tone: r() < 0.22 ? 2 : r() < 0.4 ? 1 : 0, s: seed * 10 + k });
    }
    return res;
  }

  /** claw layout for the big wave (rest pose, follows contour each frame) */
  function ukBigClaws(B, t) {
    const out = B.out, nO = B.nOut;
    const inn = B.inn, nI = B.nIn;
    const pu = V.G.pulse(t, 5);
    const tk = V.tick;
    const res = [];
    const add = (pts, nn, f, len, w0, turn, nt, k, grp, lean, inset = 8) => {
      const i = Math.round(f * (pts.length - 1));
      const [tx, ty, nx, ny] = nn[i];
      const ta = Math.atan2(ty, tx);
      const jit = (V.hash(tk * 0.73 + k * 1.9) - 0.5) * 0.06;
      const a0 = ta - lean + jit - 0.06 * pu;
      const L = len * (1 + 0.05 * pu);
      const curl = (turn * (1 + 0.12 * pu)) / L;
      res.push({ k, grp, cl: ukClaw(pts[i][0] + nx * inset, pts[i][1] + ny * inset, a0, L, w0, curl, 400 + k * 13, nt) });
    };
    const h = (j, s) => V.hash(j * 2.31 + s);
    // little fingers breaking along the top of the crest (behind)
    [0.6, 0.636, 0.672, 0.706, 0.74, 0.772].forEach((f, j) => add(out, nO, f, 40 + 18 * h(j, 1) + 26 * V.smooth(0.6, 0.8, f), 10 + 3 * h(j, 7), 2.0, 2, j, 1, 0.85));
    // under the lip, hooking back toward the face (behind)
    [0.05, 0.15, 0.26].forEach((f, j) => add(inn, nI, f, 64 + 24 * h(j, 5), 13, 1.8, 2, 40 + j, 1, 1.4, 4));
    // the big "hands" at the front of the lip — back tier (smaller) then front tier (bigger)
    [0.79, 0.85, 0.905, 0.958].forEach((f, j) => add(out, nO, f, 74 + 22 * h(j, 13), 15, 1.9, 3, 20 + j, 1, 0.45));
    [0.822, 0.878, 0.932, 0.982].forEach((f, j) => add(out, nO, f, 100 + 30 * h(j, 3) - 18 * V.smooth(0.96, 1, f), 21 + 3 * h(j, 11), 1.85, 3, 30 + j, 2, 0.62, 12));
    return res;
  }
  // ------------------------------------------------------------------ rowers + boats
  const BOATS = [
    // x0,y0 = left end on the waterline, x1,y1 = right end; bowLeft; n rowers; figure scale
    { x0: 58, y0: 992, x1: 572, y1: 975, bowLeft: true, n: 6, s: 1.08, ph: 0.0 },
    { x0: 872, y0: 948, x1: 1300, y1: 944, bowLeft: true, n: 6, s: 0.9, ph: 0.9 },
    { x0: 1372, y0: 842, x1: 1748, y1: 736, bowLeft: false, n: 6, s: 0.74, ph: 1.7 },
  ];
  function ukBoatXf(b, t) {
    const bob = Math.sin(Math.PI * t + b.ph) * 5 + V.G.bob(t) * 1.2;
    const roll = Math.sin(Math.PI * t + b.ph + 0.8) * 0.018;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2 + bob;
    const ang = Math.atan2(b.y1 - b.y0, b.x1 - b.x0) + roll;
    const L = Math.hypot(b.x1 - b.x0, b.y1 - b.y0);
    return { cx, cy, ang, L };
  }
  function ukRowers(t) {
    const list = [];
    const pu = V.G.pulse(t, 6);
    const say = V.G.say(t);
    BOATS.forEach((b, bi) => {
      const X = ukBoatXf(b, t);
      const sp = (X.L - 70 * b.s) / b.n;
      for (let i = 0; i < b.n; i++) {
        const lx = -X.L / 2 + (b.bowLeft ? 52 : 26) * b.s + sp * (i + 0.5);
        const hv = V.hash(bi * 31 + i * 7.7);
        V.push();
        V.translate(X.cx, X.cy);
        V.rotate(X.ang);
        V.translate(lx, -26 * b.s + 2.2 * pu * b.s);
        V.rotate(-X.ang * 0.45 + V.G.tilt(t, 0.05) * 0.4 + (hv - 0.5) * 0.06);
        V.scale(b.s * (0.95 + 0.1 * hv));
        list.push({ m: { ...V.M }, bi, i, hv, a0: V.G.arm(t, 0).y, a1: V.G.arm(t, 1).y, tilt: V.G.tilt(t, 0.09) + (hv - 0.5) * 0.08, say, scarf: (i + bi) % 3 !== 1 });
        V.pop();
      }
    });
    return list;
  }
  // rower geometry in local units (origin = seat at the gunwale, y up is negative)
  function ukArmPts(side, y) {
    const sx = side ? 1 : -1;
    const S = [sx * 13.5, -44], E = [sx * 21, -23 - 2.5 * y], Hh = [sx * 32, -27 - 14 * y];
    return { S, E, H: Hh, sx };
  }
  function ukHeadXf(R) {
    // head rotates about the neck
    const a = R.tilt, cx = 0, cy = -52;
    return (x, y) => {
      const dx = x - cx, dy = y - cy;
      return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
    };
  }
  const TORSO = [[-16, -38], [-14.5, -46], [-6, -50], [6, -50], [14.5, -46], [16, -38], [15, 10], [-15, 10]];
  function ukRowerPaint(ctx, R) {
    const m = R.m;
    ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // upper arms (behind the forearms, beside the torso)
    const arms = [ukArmPts(0, R.a0), ukArmPts(1, R.a1)];
    arms.forEach((A) => {
      ctx.strokeStyle = C.sumi; ctx.lineWidth = 10.5;
      ctx.beginPath(); ctx.moveTo(A.S[0], A.S[1]); ctx.lineTo(A.E[0], A.E[1]); ctx.stroke();
      ctx.strokeStyle = C.indigo; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(A.S[0], A.S[1]); ctx.lineTo(A.E[0], A.E[1]); ctx.stroke();
    });
    // torso (indigo happi) + light apron + white collar
    ctx.fillStyle = C.indigo; ukPath(ctx, TORSO); ctx.fill();
    // shadow block on one side + kasuri (splashed-white) flecks on the indigo
    ctx.fillStyle = 'rgba(8,16,44,0.4)'; ukPath(ctx, [[5, -49], [14.5, -46], [16, -38], [15, 10], [7, 10]]); ctx.fill();
    const kr = V.rng(R.bi * 100 + R.i * 7 + 3);
    ctx.fillStyle = 'rgba(236,228,206,0.85)';
    for (let k = 0; k < 9; k++) {
      const fx = -14 + kr() * 28, fy = -47 + kr() * 15;
      if (Math.abs(fx) < 7 && fy < -36) continue;
      ctx.fillRect(fx, fy, 2.4, 1.1);
      ctx.fillRect(fx + 0.7, fy - 0.7, 1, 2.5);
    }
    ctx.fillStyle = C.apron; ukPath(ctx, [[-11, -31], [11, -31], [12, 10], [-12, 10]]); ctx.fill();
    ctx.fillStyle = '#f4ecd6'; ukPath(ctx, [[-6.5, -50], [0, -36], [6.5, -50]]); ctx.fill();
    ctx.fillStyle = C.skin; ukPath(ctx, [[-4, -50], [0, -42], [4, -50]]); ctx.fill();
    // apron tie + pattern (two indigo lines)
    ctx.strokeStyle = C.indigo; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-11, -27); ctx.lineTo(11, -27); ctx.stroke();
    // head
    const hx = ukHeadXf(R);
    const P = (x, y) => hx(x, y);
    ctx.fillStyle = C.skin; ctx.beginPath();
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; const p = P(Math.cos(a) * 10.5, -63 + Math.sin(a) * 12); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    ctx.closePath(); ctx.fill();
    // hair cap
    ctx.fillStyle = C.hair; ctx.beginPath();
    for (let k = 0; k <= 16; k++) { const a = Math.PI + (k / 16) * Math.PI; const p = P(Math.cos(a) * 11, -64 + Math.sin(a) * 13); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    [[9.5, -61], [7, -66], [-7, -66], [-9.5, -61]].forEach((q) => { const p = P(q[0], q[1]); ctx.lineTo(p[0], p[1]); });
    ctx.closePath(); ctx.fill();
    // topknot (chonmage) lying forward on the crown
    ctx.beginPath(); const tk = [P(-2.5, -76), P(3, -80.5), P(6.5, -78), P(1.5, -74.5)];
    ctx.moveTo(tk[0][0], tk[0][1]); tk.slice(1).forEach((p) => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    // hachimaki headband
    ctx.fillStyle = R.scarf ? C.band : '#efe6cf';
    ctx.beginPath(); const hb = [P(-11.2, -69), P(-4, -71.5), P(4, -71.5), P(11.2, -69), P(11, -65.5), P(4, -68), P(-4, -68), P(-11, -65.5)];
    ctx.moveTo(hb[0][0], hb[0][1]); hb.slice(1).forEach((p) => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    // knot tails
    const kn = P(10.5, -68);
    ctx.beginPath(); ctx.moveTo(kn[0], kn[1]); const t1 = P(17, -74 + R.hv * 3), t2 = P(18, -66);
    ctx.lineTo(t1[0], t1[1]); ctx.lineTo(kn[0] + 1, kn[1] + 1.5); ctx.lineTo(t2[0], t2[1]); ctx.closePath(); ctx.fill();
    if (!R.scarf) { ctx.strokeStyle = C.band; ctx.lineWidth = 1.1; const a = P(-10, -67.5), b = P(10, -67.5); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    // face: deadpan brows, eyes, nose, mouth (opens on the counted beat)
    ctx.strokeStyle = C.sumi; ctx.lineWidth = 1.5;
    const ln = (a, b) => { const p = P(a[0], a[1]), q = P(b[0], b[1]); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); };
    ctx.lineWidth = 1.7; ln([-7, -65.2], [-2.2, -64]); ln([2.2, -64], [7, -65.2]);
    ctx.lineWidth = 1.9; ln([-5.8, -62], [-2.4, -61]); ln([2.4, -61], [5.8, -62]);
    ctx.lineWidth = 1.1; ln([0.4, -61], [1.5, -57.4]); ln([1.5, -57.4], [-0.3, -57]);
    const open = R.say.env > 0.45;
    if (open) { const c = P(0, -54.5); ctx.fillStyle = '#5a1f1c'; ctx.beginPath(); ctx.ellipse(c[0], c[1], 1.9, 1.1 + 1.1 * R.say.env, R.tilt, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.lineWidth = 1.3; ln([-2.5, -54.5], [2.5, -54.5]); }
    // forearms + palm-up hands (in front of the torso)
    arms.forEach((A) => {
      ctx.strokeStyle = C.sumi; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(A.E[0], A.E[1]); ctx.lineTo(A.H[0], A.H[1]); ctx.stroke();
      ctx.strokeStyle = C.skin; ctx.lineWidth = 5.4;
      ctx.beginPath(); ctx.moveTo(A.E[0], A.E[1]); ctx.lineTo(A.H[0], A.H[1]); ctx.stroke();
      // sleeve cuff
      ctx.strokeStyle = C.indigo; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(A.E[0] - A.sx * 0.5, A.E[1] - 3.5); ctx.lineTo(A.E[0] + A.sx * 1.2, A.E[1] + 2.5); ctx.stroke();
      // palm (cupped dish, fingers to the outside, slight upturn)
      const hx0 = A.H[0], hy0 = A.H[1];
      ctx.save(); ctx.translate(hx0 + A.sx * 3.5, hy0 - 0.5); ctx.scale(A.sx, 1);
      ctx.beginPath(); ctx.moveTo(-5, -1.5); ctx.quadraticCurveTo(1, -3.2, 7.5, -4.2); ctx.quadraticCurveTo(10.5, -4.8, 10, -1.5);
      ctx.quadraticCurveTo(5, 3.6, -3.5, 3.2); ctx.quadraticCurveTo(-6.5, 1.5, -5, -1.5); ctx.closePath();
      ctx.fillStyle = C.skin; ctx.fill(); ctx.strokeStyle = C.sumi; ctx.lineWidth = 1.3; ctx.stroke();
      // thumb
      ctx.beginPath(); ctx.moveTo(-1.5, -2.2); ctx.quadraticCurveTo(1, -6.5, 4, -5.2); ctx.stroke();
      ctx.restore();
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function ukRowerLines(R) {
    V.push();
    Object.assign(V.M, R.m);
    const hx = ukHeadXf(R);
    const head = [];
    for (let k = 0; k <= 26; k++) { const a = (k / 26) * Math.PI * 2 - 0.6; head.push(hx(Math.cos(a) * 10.5, -63 + Math.sin(a) * 12)); }
    V.ink(head, { w: 0.52, color: C.sumi, taper: [3, 5], wob: 0.15, seed: 7 + R.i, step: 3 });
    V.ink([[-16, -37], [-14.5, -45.5], [-6, -49.6], [-1, -50]], { w: 0.52, color: C.sumi, taper: [2, 3], wob: 0.1, seed: 3 + R.i, step: 3 });
    V.ink([[1, -50], [6, -49.6], [14.5, -45.5], [16, -37]], { w: 0.52, color: C.sumi, taper: [2, 3], wob: 0.1, seed: 4 + R.i, step: 3 });
    V.ink([[-16, -37], [-15.5, -10], [-15, 6]], { w: 0.52, color: C.sumi, taper: [2, 6], wob: 0.1, seed: 5 + R.i, step: 3 });
    V.ink([[16, -37], [15.5, -10], [15, 6]], { w: 0.52, color: C.sumi, taper: [2, 6], wob: 0.1, seed: 6 + R.i, step: 3 });
    V.ink([[-6.5, -50], [0, -36], [6.5, -50]], { w: 0.34, color: C.sumi, taper: [2, 2], wob: 0.1, seed: 8 + R.i, step: 3 });
    V.pop();
  }

  const ukHullPts = (L) => {
    // local hull, bow at +x, waterline y=0
    const h = L / 2;
    const top = [];
    for (let k = 0; k <= 26; k++) {
      const x = -h + (k / 26) * (L - 16);
      const f = V.smooth(h - 120, h - 8, x);
      top.push([x, -31 - 3 * V.smooth(-h, -h + 40, -x) - 20 * f * f]);
    }
    top.push([h + 10, -58]);
    const tip = [[h + 24, -66], [h + 21, -56], [h + 6, -14], [h - 22, 16]];
    return { top, poly: [[-h - 4, 18], [-h - 6, -33]].concat(top, tip, [[-h + 20, 18]]) };
  };
  function ukBoatXfM(b, X, mirror) {
    V.push();
    V.translate(X.cx, X.cy);
    V.rotate(X.ang);
    V.scale(mirror ? -b.s : b.s, b.s);
    const m = { ...V.M };
    V.pop();
    return m;
  }
  function ukHullPaint(ctx, b, X) {
    const m = ukBoatXfM(b, X, b.bowLeft);
    const hp = ukHullPts(X.L / b.s);
    ctx.setTransform(m.a, m.b, m.c, m.d, m.e + 1.4, m.f - 1);
    ctx.fillStyle = C.boat; ukPath(ctx, hp.poly); ctx.fill();
    // bokashi toward the waterline
    const g = ctx.createLinearGradient(0, -26, 0, 14);
    g.addColorStop(0, ukRA(C.boatD, 0)); g.addColorStop(1, ukRA(C.boatD, 0.8));
    ctx.fillStyle = g; ukPath(ctx, hp.poly); ctx.fill();
    ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    // rail band
    ctx.strokeStyle = C.rail; ctx.lineWidth = 6.5; ctx.lineJoin = 'round';
    ukPath(ctx, hp.top.map((p) => [p[0], p[1] + 3.2]), false); ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return { m, hp, L: X.L / b.s };
  }
  function ukHullLines(b, X, hm) {
    V.push();
    Object.assign(V.M, hm.m);
    const hp = hm.hp, h = hm.L / 2;
    V.ink(hp.poly.slice(1).concat([hp.poly[hp.poly.length - 1]]), { w: 0.62, color: C.sumi, taper: [4, 6], wob: 0.3, seed: 77, step: 5 });
    V.ink(hp.top.map((p) => [p[0], p[1] + 6.8]), { w: 0.38, color: C.sumi, taper: [6, 6], wob: 0.25, seed: 78, step: 5 });
    V.ink([[-h + 4, -14], [h - 60, -15], [h - 8, -26]], { w: 0.3, color: C.sumi, alpha: 0.75, taper: [10, 10], wob: 0.4, seed: 79, step: 6 });
    V.ink([[-h + 10, 0], [h - 40, -1], [h + 2, -10]], { w: 0.3, color: C.sumi, alpha: 0.6, taper: [10, 10], wob: 0.4, seed: 80, step: 6 });
    // sculling oar at the stern, idle (everyone is busy)
    V.ink([[-h + 30, -54], [-h - 70, 34]], { w: 0.55, color: C.sumi, taper: [4, 8], wob: 0.2, seed: 81, step: 5 });
    V.pop();
  }
  // ------------------------------------------------------------------ static plate (bake)
  function ukFujiPts() {
    return [[962, HZ + 2], [1004, 716], [1040, 690], [1068, 664], [1088, 640], [1100, 621], [1108, 613], [1118, 615], [1127, 610], [1139, 614], [1150, 611], [1160, 617], [1172, 638], [1196, 664], [1228, 690], [1266, 714], [1306, HZ + 2]];
  }
  function ukSnowPts() {
    return [[1080, 650], [1100, 621], [1108, 613], [1118, 615], [1127, 610], [1139, 614], [1150, 611], [1160, 617], [1178, 646],
      [1172, 652], [1166, 674], [1158, 656], [1149, 683], [1140, 660], [1131, 688], [1122, 662], [1113, 681], [1105, 658], [1096, 676], [1088, 655]];
  }
  function ukBakeBg() {
    V.bake('ukiyo_bg_v2', () => {
      V.with2d((ctx) => {
        ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
        const r = V.rng(1831);
        for (let i = 0; i < 90; i++) {
          const x = r() * W, y = r() * H, rad = 60 + r() * 280, dark = r() < 0.55;
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
          g.addColorStop(0, dark ? 'rgba(168,136,84,0.075)' : 'rgba(255,251,238,0.12)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
        // kozo fibres
        for (let i = 0; i < 2600; i++) {
          const x = r() * W, y = r() * H, l = 5 + r() * 26, a = r() * Math.PI * 2, bend = (r() - 0.5) * 10;
          ctx.strokeStyle = r() < 0.5 ? `rgba(255,252,240,${0.25 + r() * 0.35})` : `rgba(150,120,72,${0.08 + r() * 0.16})`;
          ctx.lineWidth = 0.5 + r() * 0.9;
          ctx.beginPath(); ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 - Math.sin(a) * bend, y + Math.sin(a) * l * 0.5 + Math.cos(a) * bend, x + Math.cos(a) * l, y + Math.sin(a) * l);
          ctx.stroke();
        }
        // foxing
        for (let i = 0; i < 46; i++) {
          const x = r() * W, y = r() * H, rad = 1 + r() * r() * 9;
          ctx.fillStyle = `rgba(150,96,44,${0.12 + r() * 0.22})`;
          ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
        }
        // sky: top bokashi (grey-brown into peach), horizon bokashi (grey)
        let g = ctx.createLinearGradient(0, 0, 0, 330);
        g.addColorStop(0, 'rgba(92,80,70,0.86)'); g.addColorStop(0.28, 'rgba(126,106,92,0.55)');
        g.addColorStop(0.62, 'rgba(214,160,128,0.22)'); g.addColorStop(1, 'rgba(226,176,140,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, 330);
        g = ctx.createLinearGradient(0, 420, 0, HZ);
        g.addColorStop(0, 'rgba(120,112,104,0)'); g.addColorStop(0.55, 'rgba(118,110,104,0.32)'); g.addColorStop(1, 'rgba(96,92,92,0.62)');
        ctx.fillStyle = g; ctx.fillRect(0, 420, W, HZ - 420);
        // suyari-gasumi mist bands (rounded, bokashi on the top edge)
        const band = (x0, x1, y, h, a) => {
          const rr = h / 2;
          const gg = ctx.createLinearGradient(0, y, 0, y + h);
          gg.addColorStop(0, `rgba(196,150,128,${a})`); gg.addColorStop(0.45, `rgba(232,200,172,${a * 0.55})`); gg.addColorStop(1, `rgba(244,226,200,0)`);
          ctx.fillStyle = gg;
          ctx.beginPath(); ctx.moveTo(x0 + rr, y); ctx.lineTo(x1 - rr, y); ctx.arc(x1 - rr, y + rr, rr, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x0 + rr, y + h); ctx.arc(x0 + rr, y + rr, rr, Math.PI / 2, Math.PI * 1.5); ctx.fill();
        };
        band(1300, 1990, 396, 52, 0.32); band(1420, 1840, 470, 40, 0.26); band(1330, 1990, 540, 56, 0.3); band(1340, 1640, 150, 30, 0.16);
        // Fuji
        const fj = ukFujiPts();
        g = ctx.createLinearGradient(0, 640, 0, HZ);
        g.addColorStop(0, '#8496ad'); g.addColorStop(1, '#4b6488');
        ctx.fillStyle = g; ukPath(ctx, fj); ctx.fill();
        ctx.fillStyle = '#f6efdb'; ukPath(ctx, ukSnowPts().map((p) => [p[0] + 1.5, p[1] - 1])); ctx.fill();
        // far sea: bokashi from grey-blue at the horizon into prussian
        g = ctx.createLinearGradient(0, HZ, 0, H);
        g.addColorStop(0, '#93a4b4'); g.addColorStop(0.08, '#5d7fa9'); g.addColorStop(0.35, '#2f5a94'); g.addColorStop(1, '#173a72');
        ctx.fillStyle = g; ctx.fillRect(0, HZ, W, H - HZ);
      });
      // Fuji key lines + snow streaks
      ukCarve(ukFujiPts().map((p) => [p[0], p[1] - 0.5]), { w: 0.55, color: C.line, seed: 5, seg: 120 });
      ukCarve(ukSnowPts().slice(8), { w: 0.35, color: C.line, seed: 6, seg: 90, alpha: 0.8 });
      [[1112, 622, 1104, 652], [1124, 618, 1121, 650], [1136, 620, 1138, 655], [1148, 619, 1156, 648]].forEach((q, i) => V.ink([[q[0], q[1]], [q[2], q[3]]], { w: 0.25, color: C.line, alpha: 0.55, taper: [6, 6], seed: 60 + i }));
      // far-sea stripes (perspective spacing)
      const r = V.rng(77);
      for (let k = 0; k < 16; k++) {
        const y = HZ + 6 + Math.pow(k, 1.45) * 6.5;
        let x = -40 + r() * 80;
        while (x < W) {
          const l = 60 + r() * 220;
          V.ink([[x, y + (r() - 0.5) * 2], [x + l * 0.5, y + (r() - 0.5) * 3], [x + l, y + (r() - 0.5) * 2]], { w: 0.25 + k * 0.03, color: k % 3 === 2 ? C.foam : C.line, alpha: k % 3 === 2 ? 0.7 : 0.55, taper: [12, 12], seed: 900 + k * 40 + Math.round(x), wob: 0.8 });
          x += l + 18 + r() * 70;
        }
      }
      // cartouche + signature (the 六/七 flash and the seal are drawn per frame)
      ukCartouche();
    });
  }
  const CART = { x: 1652, y: 62, w: 200, h: 282 };
  const CART_COLS = [
    { s: '冨嶽三十六景', size: 38, cx: CART.x + CART.w - 38, y0: CART.y + 56 },
    { s: '神奈川沖', size: 52, cx: CART.x + CART.w - 98, y0: CART.y + 64 },
    { s: '六七裏', size: 52, cx: CART.x + 46, y0: CART.y + 64 },
  ];
  function ukCartouche() {
    V.with2d((ctx) => {
      ctx.fillStyle = '#f2e5c2';
      ctx.fillRect(CART.x, CART.y, CART.w, CART.h);
      ctx.fillStyle = 'rgba(200,170,110,0.14)';
      ctx.fillRect(CART.x, CART.y + CART.h * 0.55, CART.w, CART.h * 0.45);
    });
    const bx = CART.x, by = CART.y, bw = CART.w, bh = CART.h;
    ukCarve([[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh], [bx, by]], { w: 0.75, color: C.sumi, seed: 11, seg: 160, taper: [4, 4], wob: 0.3 });
    ukCarve([[bx + 7, by + 7], [bx + bw - 7, by + 7], [bx + bw - 7, by + bh - 7], [bx + 7, by + bh - 7], [bx + 7, by + 7]], { w: 0.32, color: C.sumi, seed: 12, seg: 160, taper: [4, 4], wob: 0.3 });
    CART_COLS.forEach((col) => {
      [...col.s].forEach((ch, k) => V.text(ch, col.cx, col.y0 + k * col.size * 1.04, col.size, { font: 'Hiragino Mincho ProN', weight: '600', color: C.sumi, align: 'center' }));
    });
    // separating rule between the series column and the title
    V.ink([[bx + bw - 66, by + 20], [bx + bw - 66, by + bh - 20]], { w: 0.25, color: C.sumi, alpha: 0.7, taper: [6, 6], seed: 13 });
    // signature 北齋改爲一筆 outside the cartouche
    [...'北齋改爲一筆'].forEach((ch, k) => V.text(ch, CART.x - 34, CART.y + 52 + k * 39, 37, { font: 'Hiragino Mincho ProN', weight: '300', color: '#2a2630', align: 'center' }));
  }

  // ------------------------------------------------------------------ overlays (cached 2D textures)
  function ukWoodTex() {
    return V.gfx('ukiyo_wood', 960, 540, (ctx) => {
      const img = ctx.createImageData(960, 540), d = img.data;
      for (let y = 0; y < 540; y++) {
        for (let x = 0; x < 960; x++) {
          const wv = V.noise2(x / 150, y / 34) * 7;
          const g = V.noise2(x / 230 + 3, (y + wv) / 1.7);
          const g2 = V.noise2(x / 26 + 9, (y + wv * 0.6) / 0.9);
          const m = V.noise2(x / 14 + 50, y / 14) * 0.6 + V.noise2(x / 70, y / 70) * 0.4;
          const v = 255 - g * 20 - g2 * 9 - m * 18;
          const i = (y * 960 + x) * 4;
          d[i] = v; d[i + 1] = v - 2; d[i + 2] = v - 6; d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    });
  }
  function ukSpeckTex() {
    return V.gfx('ukiyo_speck', 960, 540, (ctx) => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 960, 540);
      const r = V.rng(4242);
      for (let i = 0; i < 9000; i++) {
        const x = r() * 960, y = r() * 540, a = 0.25 + r() * 0.6;
        ctx.fillStyle = `rgba(240,232,208,${a})`;
        ctx.fillRect(x, y, 0.6 + r() * 1.2, 0.5 + r() * 0.8);
      }
      // baren swirl streaks (where pigment thinned)
      for (let i = 0; i < 260; i++) {
        const x = r() * 960, y = r() * 540, l = 8 + r() * 30;
        ctx.strokeStyle = `rgba(220,210,190,${0.08 + r() * 0.12})`;
        ctx.lineWidth = 0.6 + r();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + (r() - 0.5) * 3); ctx.stroke();
      }
    });
  }

  // ------------------------------------------------------------------ per-frame painting
  function ukBigPlates(ctx, B, cap) {
    ctx.save();
    ukPath(ctx, B.mass);
    ctx.fillStyle = C.prus; ctx.fill();
    ctx.clip();
    // darker high in the body, lighter at the foot of the wave
    let g = ctx.createLinearGradient(0, 300, 0, 1080);
    g.addColorStop(0, 'rgba(12,34,76,0.45)'); g.addColorStop(0.5, 'rgba(12,34,76,0)'); g.addColorStop(1, 'rgba(70,120,182,0.5)');
    ctx.fillStyle = g; ctx.fillRect(-120, 100, 1300, 1100);
    // inside of the barrel: soft bokashi along the face
    ctx.filter = 'blur(30px)';
    ctx.strokeStyle = ukRA(C.prusP, 0.85); ctx.lineWidth = 110;
    ukPath(ctx, B.inn, false); ctx.stroke();
    ctx.filter = 'none';
    // carved colour bands following the flow (each one tapers to a point at both ends)
    ctx.save();
    ctx.translate(1.6, -1.2); // the light-blue block is printed a hair off register
    B.bands.forEach((b) => {
      const bp = ukBandPts(B.arch0, B.arch1, b.va, b.vb, b.f0, b.f1);
      ctx.fillStyle = b.tone === 2 ? 'rgba(13,36,80,0.92)' : b.tone === 1 ? 'rgba(122,160,206,0.9)' : 'rgba(60,111,176,0.92)';
      ukPath(ctx, bp.poly); ctx.fill();
    });
    ctx.restore();
    ctx.restore();
    // foam cap (paper reserve), slightly mis-registered
    ctx.save();
    ctx.translate(-1.2, 1);
    ctx.fillStyle = C.foam; ukPath(ctx, cap.poly); ctx.fill();
    // faint blue shading along the cap's inner edge (second block)
    ctx.clip();
    ctx.strokeStyle = 'rgba(134,169,208,0.55)'; ctx.lineWidth = 9;
    ukPath(ctx, cap.inner, false); ctx.stroke();
    ctx.restore();
  }
  function ukBigLines(B, cap) {
    // key block: outer contour, lip underside + face, foam fingers
    ukCarve(B.out, { w: 1.0, seed: 21, seg: 170 });
    ukCarve(B.inn, { w: 0.9, seed: 22, seg: 150 });
    ukCarve(cap.inner, { w: 0.62, seed: 23, seg: 95 });
    // everything below is cut only where there is water (inside the wave, outside the foam cap)
    const sc = ukScratch();
    const mp = ukPath2D(B.mass), cp = ukPath2D(cap.poly);
    const inWater = (x, y) => sc.isPointInPath(mp, x, y) && !sc.isPointInPath(cp, x, y);
    const inFoam = (x, y) => sc.isPointInPath(cp, x, y);
    // two contour lines inside the foam cap
    [12, 24].forEach((d, j) => {
      const pts = B.out.map((p, i) => [p[0] + B.nOut[i][2] * d, p[1] + B.nOut[i][3] * d]);
      const r = V.rng(140 + j);
      let f = 0.47 + r() * 0.04;
      while (f < 0.86) {
        const f1 = Math.min(0.88, f + 0.04 + r() * 0.07);
        ukRuns(ukSub(pts, f, f1), inFoam, 4).forEach((run, q) => V.ink(run, { w: 0.32, color: C.line, alpha: 0.8, taper: [10, 12], wob: 0.4, seed: 150 + j * 30 + q + Math.round(f * 300), step: 5 }));
        f = f1 + 0.02 + r() * 0.04;
      }
    });
    // white veins on top of each band + dark rules on the dark bands
    B.bands.forEach((b, j) => {
      const bp = ukBandPts(B.arch0, B.arch1, b.va, b.vb, b.f0, b.f1);
      const L = bp.top.length;
      if (L < 6) return;
      const pts = bp.top.slice(Math.floor(L * 0.04), Math.ceil(L * 0.97));
      ukRuns(pts, inWater, 6).forEach((run, q) => {
        if (b.tone === 2) V.ink(run, { w: 0.4, color: C.line, alpha: 0.9, taper: [20, 26], wob: 0.5, seed: 600 + j * 7 + q, step: 6 });
        else V.ink(run, { w: 0.42 + 0.2 * V.hash(j), color: C.foam, alpha: 0.95, taper: [22, 30], wob: 0.5, seed: 600 + j * 7 + q, step: 6 });
      });
    });
    // face streaks: white lines running down the inside of the barrel
    [9, 20, 34, 52, 74].forEach((d, j) => {
      const pts = B.inn.map((p, i) => [p[0] + B.nIn[i][2] * d, p[1] + B.nIn[i][3] * d]);
      const f0 = 0.2 + j * 0.04, f1 = 0.88 - j * 0.06;
      ukRuns(ukSub(pts, f0, f1), inWater, 6).forEach((run, q) => V.ink(run, { w: 0.38, color: C.foam, alpha: 0.95, taper: [26, 34], wob: 0.5, seed: 700 + j * 5 + q, step: 6 }));
    });
  }
  let ukSC = null;
  function ukScratch() {
    if (!ukSC) { const cv = document.createElement('canvas'); cv.width = 4; cv.height = 4; ukSC = cv.getContext('2d'); }
    return ukSC;
  }
  function ukPath2D(pts) {
    const p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    p.closePath();
    return p;
  }
  function ukRuns(pts, test, minN = 3) {
    const runs = [];
    let cur = [];
    pts.forEach((p) => {
      if (test(p[0], p[1])) cur.push(p);
      else { if (cur.length >= minN) runs.push(cur); cur = []; }
    });
    if (cur.length >= minN) runs.push(cur);
    return runs;
  }
  function ukClawsPaint(ctx, claws) {
    claws.forEach((c) => ukClawDraw(ctx, c.cl, c.cl.m.ws[0] > 12 ? 2.9 : 2.3));
  }
  function ukClawsLines(claws) {
    // a thin carved rule inside the biggest fingers (the outlines themselves are cut with the fill, see ukClawDraw)
    claws.forEach((c) => {
      const m = c.cl.m, n = m.n;
      if (m.ws[0] < 15) return;
      const mid = m.c.slice(3, Math.round(n * 0.7)).map((p, i) => [p[0] - Math.sin(p[2]) * m.ws[i + 3] * 0.42, p[1] + Math.cos(p[2]) * m.ws[i + 3] * 0.42]);
      V.ink(mid, { w: 0.24, color: C.line, alpha: 0.8, taper: [8, 10], wob: 0.2, seed: 870 + c.k, step: 3 });
    });
  }
  function ukSpray(ctx, t, B, claws) {
    const tk = V.tick;
    const pu = V.G.pulse(t, 4);
    ctx.fillStyle = C.foam;
    const r = V.rng(5150);
    // around the claw tips, falling forward/down
    claws.forEach((c) => {
      const tip = c.cl.m.c[c.cl.m.n];
      const nn = c.grp === 1 ? 7 : 4;
      for (let k = 0; k < nn; k++) {
        const a = r() * Math.PI * 2, d = 8 + r() * 46;
        const x = tip[0] + Math.cos(a) * d + 10, y = tip[1] + Math.abs(Math.sin(a)) * d * 1.2;
        const j = V.hash(tk * 1.37 + c.k * 9.1 + k);
        const rad = (1.6 + r() * 3.2) * (0.8 + 0.35 * j + 0.25 * pu);
        ctx.beginPath(); ctx.arc(x + (j - 0.5) * 2.4, y + (V.hash(tk + k * 3.3) - 0.5) * 2.4, rad, 0, Math.PI * 2); ctx.fill();
      }
    });
    // a veil of spray under the curl, thinning toward Fuji
    const w = B.out[B.out.length - 1];
    for (let k = 0; k < 230; k++) {
      const u = r(), v = r();
      const x = 960 + u * 430 + (v * 60);
      const y = 300 + Math.pow(v, 1.6) * 420 + u * 40;
      const dens = 1 - V.smooth(0.25, 1, v);
      if (r() > dens * 0.95 + 0.05) continue;
      const j = V.hash(tk * 0.91 + k * 1.7);
      const rad = (1.2 + r() * r() * 4.2) * (0.75 + 0.45 * j + 0.2 * pu);
      ctx.beginPath(); ctx.arc(x + (j - 0.5) * 2, y + (V.hash(tk * 1.1 + k) - 0.5) * 2, rad, 0, Math.PI * 2); ctx.fill();
    }
    // spray over the back of the crest
    for (let k = 0; k < 70; k++) {
      const f = 0.45 + r() * 0.4;
      const i = Math.round(f * (B.out.length - 1));
      const p = B.out[i], n = B.nOut[i];
      const d = -6 - r() * 26;
      const j = V.hash(tk * 0.77 + k * 2.9);
      ctx.beginPath(); ctx.arc(p[0] + n[2] * d + (j - 0.5) * 2, p[1] + n[3] * d, (1 + r() * 2.4) * (0.8 + 0.4 * j), 0, Math.PI * 2); ctx.fill();
    }
    void w;
  }

  function ukSecPlates(ctx, S, cap) {
    ctx.save();
    ukPath(ctx, S.mass);
    ctx.fillStyle = C.prus; ctx.fill();
    ctx.clip();
    const g = ctx.createLinearGradient(0, 600, 0, 1000);
    g.addColorStop(0, 'rgba(12,34,76,0.35)'); g.addColorStop(0.5, 'rgba(60,111,176,0.2)'); g.addColorStop(1, 'rgba(12,34,76,0.45)');
    ctx.fillStyle = g; ctx.fillRect(1100, 580, 900, 620);
    ctx.translate(1.6, -1.2);
    BANDS_S.forEach((b) => {
      const bp = ukBandPts(S.arch0, S.arch1, b.va, b.vb, b.f0, b.f1);
      ctx.fillStyle = b.tone === 2 ? 'rgba(13,36,80,0.9)' : b.tone === 1 ? 'rgba(122,160,206,0.85)' : 'rgba(60,111,176,0.9)';
      ukPath(ctx, bp.poly); ctx.fill();
    });
    ctx.restore();
    ctx.save();
    ctx.translate(-1.2, 1);
    ctx.fillStyle = C.foam; ukPath(ctx, cap.poly); ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(134,169,208,0.55)'; ctx.lineWidth = 7;
    ukPath(ctx, cap.inner, false); ctx.stroke();
    ctx.restore();
  }
  function ukSecLines(S, cap) {
    ukCarve(S.out, { w: 0.85, seed: 31, seg: 150 });
    ukCarve(cap.inner, { w: 0.5, seed: 32, seg: 80 });
    BANDS_S.forEach((b, j) => {
      const bp = ukBandPts(S.arch0, S.arch1, b.va, b.vb, b.f0, b.f1);
      const L = bp.top.length;
      if (L < 6) return;
      V.ink(bp.top.slice(Math.floor(L * 0.05), Math.ceil(L * 0.96)), { w: 0.38, color: b.tone === 2 ? C.line : C.foam, alpha: 0.9, taper: [18, 22], wob: 0.5, seed: 330 + j, step: 6 });
    });
  }
  function ukSecClaws(S, t) {
    const out = S.out, nO = S.nOut;
    const pu = V.G.pulse(t, 5);
    const res = [];
    [0.6, 0.66, 0.72, 0.78, 0.84, 0.9, 0.95].forEach((f, j) => {
      const i = Math.round(f * (out.length - 1));
      const [tx, ty, nx, ny] = nO[i];
      const big = f > 0.75;
      const a0 = Math.atan2(ty, tx) - (big ? 0.5 : 0.85) + (V.hash(V.tick * 0.5 + j * 4.1) - 0.5) * 0.06 - 0.05 * pu;
      const len = (big ? 62 : 34) + 24 * V.hash(j * 2.2 + 9);
      res.push({ k: 60 + j, grp: 1, cl: ukClaw(out[i][0] + nx * 4, out[i][1] + ny * 4, a0, len, big ? 9 : 6, 2.2 / len, 470 + j, big ? 3 : 1) });
    });
    return res;
  }
  function ukFG(t) {
    const wp = ukWarp(t + 1.1, 0.35);
    const top = V.resample(ukSm(FG, 10), 4).map(wp);
    const arch0 = ukResN(top, 300), arch1 = arch0.map((p) => [p[0] - 30, p[1] + 230]);
    return { top, nT: ukNorm(top), poly: top.concat([[1530, 1200], [-90, 1200]]), arch0, arch1 };
  }
  function ukNS(t) {
    const wp = ukWarp(t + 0.3, 0.3);
    const top = V.resample(ukSm(NS, 10), 4).map(wp);
    const arch0 = ukResN(top, 200), arch1 = arch0.map((p) => [p[0], p[1] + 260]);
    return { top, nT: ukNorm(top), poly: top.concat([[1960, 1200], [1236, 1200]]), arch0, arch1 };
  }
  function ukWaterPaint(ctx, Wt, cols, bands) {
    ctx.save();
    ukPath(ctx, Wt.poly);
    const ys = Wt.top.reduce((m, p) => Math.min(m, p[1]), 2000);
    const g = ctx.createLinearGradient(0, ys, 0, ys + 220);
    g.addColorStop(0, cols[0]); g.addColorStop(0.35, cols[1]); g.addColorStop(1, cols[2]);
    ctx.fillStyle = g; ctx.fill();
    ctx.clip();
    ctx.translate(1.6, -1.2);
    bands.forEach((b) => {
      const bp = ukBandPts(Wt.arch0, Wt.arch1, b.va, b.vb, b.f0, b.f1);
      ctx.fillStyle = b.tone === 2 ? 'rgba(13,36,80,0.85)' : b.tone === 1 ? 'rgba(122,160,206,0.8)' : 'rgba(60,111,176,0.88)';
      ukPath(ctx, bp.poly); ctx.fill();
    });
    ctx.restore();
  }
  function ukWaterLines(Wt, seed, bands) {
    ukCarve(Wt.top, { w: 0.85, seed, seg: 150 });
    // a white crest line just under the surface, broken
    const pts = Wt.top.map((p, i) => [p[0] + Wt.nT[i][2] * 7, p[1] + Wt.nT[i][3] * 7]);
    const r = V.rng(seed * 3);
    let f = r() * 0.05;
    while (f < 0.97) {
      const f1 = Math.min(0.99, f + 0.05 + r() * 0.12);
      V.ink(ukSub(pts, f, f1), { w: 0.42, color: C.foam, alpha: 0.95, taper: [12, 16], wob: 0.5, seed: seed * 50 + Math.round(f * 90), step: 5 });
      f = f1 + 0.03 + r() * 0.05;
    }
    bands.forEach((b, j) => {
      const bp = ukBandPts(Wt.arch0, Wt.arch1, b.va, b.vb, b.f0, b.f1);
      const L = bp.top.length;
      if (L < 6) return;
      V.ink(bp.top.slice(Math.floor(L * 0.05), Math.ceil(L * 0.96)), { w: 0.38, color: b.tone === 2 ? C.line : C.foam, alpha: 0.9, taper: [18, 22], wob: 0.5, seed: seed * 7 + j, step: 6 });
    });
  }
  function ukFGcap(F) {
    // little mini-Fuji wave in the foreground: foam crown + 4 small claws curling right
    return ukFoamCap(F.top, F.nT, 0.36, 0.56, { base: 4, deep: 16, amp: 14, per: 22, seed: 7, fadeA: 0.7 });
  }
  function ukFGClaws(F, t) {
    const out = F.top, nO = F.nT, res = [];
    const pu = V.G.pulse(t, 5);
    [0.445, 0.468, 0.49, 0.512].forEach((f, j) => {
      const i = Math.round(f * (out.length - 1));
      const [tx, ty, nx, ny] = nO[i];
      const a0 = Math.atan2(ty, tx) - 0.75 + (V.hash(V.tick * 0.6 + j * 3.1) - 0.5) * 0.07 - 0.05 * pu;
      const len = 30 + 16 * V.hash(j * 1.7 + 2);
      res.push({ k: 80 + j, grp: 1, cl: ukClaw(out[i][0] + nx * 3, out[i][1] + ny * 3, a0, len, 5.5, 2.6 / len, 520 + j, 1) });
    });
    return res;
  }

  function ukSeal(u) {
    const p = V.prog(u, 0.32, 0.18);
    if (p <= 0) return;
    const e = V.E.out3(p);
    const s = 1.35 - 0.35 * e, a = V.clamp(p * 2.5);
    const cx = CART.x - 34, cy = CART.y + 52 + 6 * 39 + 34, hw = 42 * s;
    V.with2d((ctx) => {
      ctx.globalAlpha = 0.92 * a;
      const r = V.rng(67);
      ctx.fillStyle = C.ver;
      ctx.beginPath();
      const pts = [];
      for (let k = 0; k < 40; k++) {
        const side = Math.floor(k / 10), f = (k % 10) / 10;
        const j = (r() - 0.5) * 2.2 * s;
        const q = side === 0 ? [-hw + 2 * hw * f, -hw + j] : side === 1 ? [hw + j, -hw + 2 * hw * f] : side === 2 ? [hw - 2 * hw * f, hw + j] : [-hw + j, hw - 2 * hw * f];
        pts.push([cx + q[0], cy + q[1]]);
      }
      ukPath(ctx, pts); ctx.fill();
      // worn patches where the paste missed
      ctx.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 26; k++) { ctx.globalAlpha = 0.25 + r() * 0.4; ctx.beginPath(); ctx.arc(cx + (r() - 0.5) * hw * 1.9, cy + (r() - 0.5) * hw * 1.9, 0.6 + r() * 2.2, 0, Math.PI * 2); ctx.fill(); }
    });
    V.text('六', cx, cy - 5 * s, 37 * s, { font: 'Libian TC', weight: 'bold', color: '#f6ead0', align: 'center', alpha: a });
    V.text('七', cx, cy + 32 * s, 37 * s, { font: 'Libian TC', weight: 'bold', color: '#f6ead0', align: 'center', alpha: a });
  }
  function ukSayFlash(t) {
    const sy = V.G.say(t);
    const col = CART_COLS[2];
    const k = sy.n === 6 ? 0 : 1;
    const a = V.clamp(sy.env * 1.15);
    if (a < 0.03) return;
    V.text(col.s[k], col.cx, col.y0 + k * col.size * 1.04, col.size, { font: 'Hiragino Mincho ProN', weight: '600', color: C.ver, align: 'center', alpha: a });
  }

  function ukFrame(ctx) {
    ctx.fillStyle = '#f1e5c5';
    ctx.beginPath();
    ctx.rect(-10, -10, W + 20, H + 20);
    ctx.rect(FR, FR, W - 2 * FR, H - 2 * FR);
    ctx.fill('evenodd');
  }

  // ------------------------------------------------------------------ scene
  V.scenes.ukiyo = {
    noHud: true,
    draw(t, u, meta) {
      ukBakeBg();
      const B = ukBig(t), S = ukSec(t), F = ukFG(t), N = ukNS(t);
      const capB = ukFoamCap(B.out, B.nOut, 0.37, 1.0, { base: 8, deep: 44, amp: 30, per: 50, seed: 1, taperStart: 0.07 });
      const capS = ukFoamCap(S.out, S.nOut, 0.55, 1.0, { base: 5, deep: 22, amp: 16, per: 34, seed: 3 });
      const clawsB = ukBigClaws(B, t), clawsS = ukSecClaws(S, t);
      const rowers = ukRowers(t);
      const boatX = BOATS.map((b) => ukBoatXf(b, t));

      // --- secondary wave + its claws
      V.with2d((ctx) => { ukSecPlates(ctx, S, capS); ukClawsPaint(ctx, clawsS); });
      ukSecLines(S, capS);
      ukClawsLines(clawsS);
      // --- the great wave
      V.with2d((ctx) => ukBigPlates(ctx, B, capB));
      ukBigLines(B, capB);
      const back = clawsB.filter((c) => c.grp === 1), front = clawsB.filter((c) => c.grp === 2);
      V.with2d((ctx) => { ukClawsPaint(ctx, back); ukClawsPaint(ctx, front); });
      ukClawsLines(front);
      // --- far boat (C) on the second wave, then the near swell that swallows its keel
      const hm = [];
      const boatPass = (ids) => {
        const rs = rowers.filter((R) => ids.includes(R.bi));
        V.with2d((ctx) => rs.forEach((R) => ukRowerPaint(ctx, R)));
        rs.forEach((R) => ukRowerLines(R));
        V.with2d((ctx) => ids.forEach((i) => (hm[i] = ukHullPaint(ctx, BOATS[i], boatX[i]))));
        ids.forEach((i) => ukHullLines(BOATS[i], boatX[i], hm[i]));
      };
      boatPass([2]);
      V.with2d((ctx) => ukWaterPaint(ctx, N, ['#2f5f9f', '#22508f', '#173a72'], BANDS_N));
      ukWaterLines(N, 41, BANDS_N);
      // --- near boats (A, B), then the foreground water with its little mini-Fuji wave
      boatPass([0, 1]);
      const capF = ukFGcap(F), clawsF = ukFGClaws(F, t);
      const rimF = [[0.02, 0.1, 6, 2], [0.15, 0.29, 8, 4], [0.58, 0.7, 7, 6], [0.76, 0.9, 9, 8]].map(([a, b, amp, sd]) => ukFoamCap(F.top, F.nT, a, b, { base: 2.5, deep: 4, amp, per: 30, seed: sd, taperEnds: true }));
      V.with2d((ctx) => {
        ukWaterPaint(ctx, F, ['#2c5c9e', '#1f4b8a', '#122f62'], BANDS_F);
        ctx.fillStyle = C.foam; rimF.forEach((rm) => { ukPath(ctx, rm.poly); ctx.fill(); });
        ukPath(ctx, capF.poly); ctx.fill();
        ukClawsPaint(ctx, clawsF);
      });
      ukWaterLines(F, 43, BANDS_F);
      rimF.forEach((rm, j) => ukCarve(rm.inner, { w: 0.36, seed: 45 + j, seg: 70 }));
      ukCarve(capF.inner, { w: 0.42, seed: 44, seg: 80 });
      ukClawsLines(clawsF);
      // --- spray (paper reserve dots)
      V.with2d((ctx) => ukSpray(ctx, t, B, clawsB));
      // --- cartouche flash + seal
      ukSayFlash(t);
      ukSeal(u);
      // --- print margin + key-block border
      V.with2d((ctx) => ukFrame(ctx));
      V.ink([[FR, FR], [W - FR, FR], [W - FR, H - FR], [FR, H - FR], [FR, FR]], { w: 0.7, color: C.sumi, taper: [0, 0], wob: 0.4, seed: 99, step: 8 });
      // --- printing texture: wood grain + baren mottling (multiply), ink skips (screen), age
      V.blit(ukWoodTex(), 0, 0, W, H, { blend: 'multiply', alpha: 0.4 });
      V.blit(ukSpeckTex(), 0, 0, W, H, { blend: 'screen', alpha: 0.22 });
      V.with2d((ctx) => {
        ctx.fillStyle = '#efdcb4'; ctx.fillRect(0, 0, W, H);
      }, { blend: 'multiply', alpha: 0.13 });
      // faded pigment: lift the darkest Prussian a little toward the paper (old prints never reach full black)
      V.with2d((ctx) => {
        ctx.fillStyle = '#c9b48a'; ctx.fillRect(0, 0, W, H);
      }, { blend: 'screen', alpha: 0.1 });
      V.vignette({ amt: 0.22, color: '96,66,30', inner: 0.5 });
      // HUD drawn here (noHud) so the year reads 1831, not 1,831
      V.flush();
      V.mReset();
      V.hudYear(u, Object.assign({}, meta, { yearText: '1831' }), meta.hud);
      V.hudLabel(u, meta, meta.hud);
    },
  };
})();
