/* renaissance.js — 1498 · 文藝復興《最後的晚餐（六七版）》   film 34.0–38.0 s
 * Leonardo-style tempera-on-plaster mural: one-point perspective refectory (coffered ceiling, tapestried side walls, three windows on a
 * hazy landscape), long table with white linen, 13 figures in 3-3-(1)-3-3 groups. Everybody does the 67 seesaw on the table, phase-delayed
 * left→right (a "human wave"); Christ sits exactly on the master clock and is the only one not looking at the viewer.
 * Static parts (room, table, each figure's torso+head) are painted once with p5.brush + Canvas2D and cached; arms/hands, light, dust are per frame.
 * Surface ageing: craquelure network, paint losses showing plaster, stains, varnish + vignette, plaster grain.
 */
(function () {
  const W = 1920, H = 1080;
  const VX = 960, VY = 458; // vanishing point = Christ's right temple
  const BK = { x0: 600, x1: 1320, y0: 270, y1: 726 }; // back wall
  const TB = { xb0: 198, xb1: 1722, yb: 654, xf0: 134, xf1: 1786, yf: 714, yc: 848 }; // table
  const MF = 3.6; // farthest perspective multiplier we ever need (front of room, off-frame)
  const PT = (xb, yb, m) => [VX + (xb - VX) * m, VY + (yb - VY) * m];
  const MZ = (z) => 1 / (1 - z);
  const TAU = Math.PI * 2;
  const dk = (c, k) => V.mix(c, '#120a05', k);
  const lt = (c, k) => V.mix(c, '#f6e9cc', k);
  const ra = (c, a) => V.withAlpha(c, a);
  const fbm = (x, y) => V.noise2(x, y) * 0.55 + V.noise2(x * 2.07 + 5.3, y * 2.07 + 1.7) * 0.3 + V.noise2(x * 4.3 + 9.1, y * 4.3 + 3.3) * 0.15;

  function pth(ctx, pts, close = true) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
  }
  const spth = (ctx, pts, closed = true, per = 8) => pth(ctx, V.smoothPts(pts, closed, per), closed);
  const lin = (ctx, x0, y0, x1, y1, st) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    st.forEach(([p, c]) => g.addColorStop(p, c));
    return g;
  };
  const rad = (ctx, x0, y0, r0, x1, y1, r1, st) => {
    const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    st.forEach(([p, c]) => g.addColorStop(p, c));
    return g;
  };
  function inPoly(x, y, P) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      if (P[i][1] > y !== P[j][1] > y && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
    }
    return c;
  }

  // ------------------------------------------------------------------ zoom (slow documentary push-in about the vanishing point)
  let Z = 1;
  const zx = (x) => VX + (x - VX) * Z;
  const zy = (y) => VY + (y - VY) * Z;
  const zctx = (ctx) => ctx.setTransform(Z, 0, 0, Z, VX * (1 - Z), VY * (1 - Z));
  const zblit = (g, x, y, w, h, o) => V.blit(g, zx(x), zy(y), w * Z, h * Z, o || {});
  const zpush = () => {
    V.push();
    V.translate(VX * (1 - Z), VY * (1 - Z));
    V.scale(Z);
  };

  // ================================================================== ROOM
  const WIN = [
    { x0: 872, x1: 1048, y0: 356, y1: 770, c: true },
    { x0: 688, x1: 792, y0: 384, y1: 770 },
    { x0: 1128, x1: 1232, y0: 384, y1: 770 },
  ];
  const winInner = (w, k = 0.935) => ({ x0: VX + (w.x0 - VX) * k, x1: VX + (w.x1 - VX) * k, y0: VY + (w.y0 - VY) * k, y1: VY + (w.y1 - VY) * k });

  function landscape(ctx) {
    const X0 = BK.x0, X1 = BK.x1;
    ctx.fillStyle = lin(ctx, 0, BK.y0 + 60, 0, 600, [[0, '#b2c8c8'], [0.4, '#cbd9d3'], [0.75, '#e2e2cc'], [1, '#e6dcc0']]);
    ctx.fillRect(X0, BK.y0, X1 - X0, 520);
    // thin cirrus
    ctx.save();
    ctx.filter = 'blur(5px)';
    const r = V.rng(31);
    for (let k = 0; k < 9; k++) {
      ctx.fillStyle = `rgba(250,248,236,${0.25 + r() * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(X0 + r() * (X1 - X0), 380 + r() * 90, 40 + r() * 70, 4 + r() * 5, (r() - 0.5) * 0.1, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    const ridge = (base, amp, freq, seed, col, step = 5) => {
      ctx.beginPath();
      ctx.moveTo(X0, 800);
      for (let x = X0; x <= X1 + step; x += step) ctx.lineTo(x, base - amp * Math.pow(fbm(x / freq + seed, seed * 0.7), 1.4));
      ctx.lineTo(X1, 800);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    };
    ridge(556, 120, 120, 3.1, 'rgba(160,182,186,0.75)');
    ridge(566, 80, 75, 7.7, 'rgba(128,154,150,0.85)');
    // a far hill town (white tower + roofs) in the right window, a bend of river in the left
    ctx.fillStyle = 'rgba(232,228,212,0.85)';
    ctx.fillRect(1170, 520, 5, 18);
    ctx.fillRect(1180, 528, 14, 10);
    ctx.fillStyle = 'rgba(150,80,60,0.55)';
    ctx.fillRect(1180, 526, 14, 3);
    ridge(578, 42, 46, 12.3, 'rgba(92,118,94,0.95)', 4);
    ctx.fillStyle = 'rgba(214,226,224,0.7)';
    ctx.beginPath();
    ctx.ellipse(735, 590, 46, 4, -0.05, 0, TAU);
    ctx.fill();
    // tree clumps
    const rt = V.rng(57);
    for (let k = 0; k < 70; k++) {
      const x = X0 + rt() * (X1 - X0), y = 570 + rt() * 40;
      const s = 4 + rt() * 7;
      ctx.fillStyle = `rgba(${52 + rt() * 20},${74 + rt() * 22},${52 + rt() * 14},0.9)`;
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.7, s, 0, 0, TAU);
      ctx.fill();
    }
  }

  function windowFrame(ctx, w) {
    const iw = winInner(w);
    // jambs (deep reveal) — left jamb faces right (shadow), right jamb faces left (lit), soffit dark
    pth(ctx, [[w.x0, w.y0], [iw.x0, iw.y0], [iw.x0, iw.y1], [w.x0, w.y1]]);
    ctx.fillStyle = lin(ctx, w.x0, 0, iw.x0, 0, [[0, '#7a6a52'], [1, '#5e4f3b']]);
    ctx.fill();
    pth(ctx, [[w.x1, w.y0], [iw.x1, iw.y0], [iw.x1, iw.y1], [w.x1, w.y1]]);
    ctx.fillStyle = lin(ctx, w.x1, 0, iw.x1, 0, [[0, '#c9b896'], [1, '#e0d2b2']]);
    ctx.fill();
    pth(ctx, [[w.x0, w.y0], [w.x1, w.y0], [iw.x1, iw.y0], [iw.x0, iw.y0]]);
    ctx.fillStyle = '#5a4b38';
    ctx.fill();
    // light spilling on the inner reveal edges
    ctx.strokeStyle = 'rgba(255,248,226,0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(iw.x0 + 0.5, iw.y0 + 0.5, iw.x1 - iw.x0 - 1, iw.y1 - iw.y0);
    // stone frame
    ctx.strokeStyle = '#d7cab0';
    ctx.lineWidth = 6;
    ctx.strokeRect(w.x0 - 3, w.y0 - 3, w.x1 - w.x0 + 6, w.y1 - w.y0 + 6);
    ctx.strokeStyle = 'rgba(70,52,34,0.75)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w.x0 - 7, w.y0 - 7, w.x1 - w.x0 + 14, w.y1 - w.y0 + 14);
    ctx.fillStyle = 'rgba(60,42,26,0.35)';
    ctx.fillRect(w.x0 - 6, w.y0 + 3, 3, w.y1 - w.y0);
  }

  function tapestry(ctx, side, za, zb, ti) {
    const xw = side < 0 ? BK.x0 : BK.x1;
    const yt = 318, ybm = 680;
    const mp = (u, v) => PT(xw, yt + (ybm - yt) * v, MZ(za + (zb - za) * u));
    const quad = (u0, v0, u1, v1) => [mp(u0, v0), mp(u1, v0), mp(u1, v1), mp(u0, v1)];
    const lit = side > 0;
    pth(ctx, quad(0, 0, 1, 1));
    ctx.fillStyle = lit ? '#806c49' : '#3f3322';
    ctx.fill();
    // border pattern: little lozenges
    const r = V.rng(500 + ti * 17 + (lit ? 100 : 0));
    for (let k = 0; k < 26; k++) {
      const v = 0.06 + (k / 25) * 0.9;
      for (const u of [0.035, 0.965]) {
        const p = mp(u, v), m = MZ(za + (zb - za) * u);
        ctx.fillStyle = k % 2 ? (lit ? '#b49a62' : '#6a5838') : lit ? '#7a3424' : '#4a2216';
        ctx.beginPath();
        ctx.ellipse(p[0], p[1], 1.2 * m, 3.4 * m, 0, 0, TAU);
        ctx.fill();
      }
    }
    const fq = quad(0.075, 0.1, 0.925, 0.975);
    pth(ctx, fq);
    ctx.fillStyle = lit ? '#2f3727' : '#191d14';
    ctx.fill();
    // valance stripes
    for (let k = 0; k < 4; k++) {
      pth(ctx, quad(0, k * 0.022, 1, k * 0.022 + 0.013));
      ctx.fillStyle = k % 2 ? (lit ? '#8e3c27' : '#4e2014') : lit ? '#b09a62' : '#5e5032';
      ctx.fill();
    }
    // millefleur ground
    ctx.save();
    pth(ctx, fq);
    ctx.clip();
    const NU = 6, NV = 20;
    for (let iu = 0; iu < NU; iu++) {
      for (let iv = 0; iv < NV; iv++) {
        const u = 0.12 + ((iu + (iv % 2) * 0.5) / NU) * 0.8, v = 0.13 + (iv / NV) * 0.84;
        if (u > 0.9) continue;
        const p = mp(u + (r() - 0.5) * 0.03, v + (r() - 0.5) * 0.01);
        const m = MZ(za + (zb - za) * u);
        const sz = (1.5 + r() * 0.8) * m;
        ctx.fillStyle = lit ? 'rgba(96,128,78,0.85)' : 'rgba(46,66,38,0.85)';
        ctx.beginPath();
        ctx.ellipse(p[0] - sz * 0.6, p[1] + sz * 1.4, sz * 0.32, sz * 0.9, 0.5, 0, TAU);
        ctx.ellipse(p[0] + sz * 0.6, p[1] + sz * 1.5, sz * 0.32, sz * 0.9, -0.5, 0, TAU);
        ctx.fill();
        const cols = lit ? ['#c4a864', '#a84c30', '#d6ccaa', '#6688a0'] : ['#7c6838', '#6a2c1c', '#857c64', '#34485a'];
        ctx.fillStyle = cols[Math.floor(r() * 4)];
        for (let pe = 0; pe < 5; pe++) {
          const a = (pe * TAU) / 5 + 0.3;
          ctx.beginPath();
          ctx.ellipse(p[0] + Math.cos(a) * sz * 0.35, p[1] + Math.sin(a) * sz * 0.7, sz * 0.3, sz * 0.55, 0, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = lit ? '#e8d890' : '#9a8a50';
        ctx.beginPath();
        ctx.arc(p[0], p[1], sz * 0.22, 0, TAU);
        ctx.fill();
      }
    }
    // fold shading (vertical hanging folds) + darker toward the bottom
    for (let k = 0; k < 7; k++) {
      const u = 0.1 + k * 0.13;
      const a = mp(u, 0), b = mp(u, 1);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2.5 * MZ(za + (zb - za) * u);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintRoom() {
    V.bg('#2a1f15');
    const fl = [[BK.x0, BK.y1], [BK.x1, BK.y1], PT(BK.x1, BK.y1, MF), PT(BK.x0, BK.y1, MF)];
    const lw = [[BK.x0, BK.y0], PT(BK.x0, BK.y0, MF), PT(BK.x0, BK.y1, MF), [BK.x0, BK.y1]];
    const rw = [[BK.x1, BK.y0], PT(BK.x1, BK.y0, MF), PT(BK.x1, BK.y1, MF), [BK.x1, BK.y1]];
    const cl = [[BK.x0, BK.y0], [BK.x1, BK.y0], PT(BK.x1, BK.y0, MF), PT(BK.x0, BK.y0, MF)];
    const bw = [[BK.x0, BK.y0], [BK.x1, BK.y0], [BK.x1, BK.y1], [BK.x0, BK.y1]];
    V.with2d((ctx) => {
      // ---- floor (terracotta tiles in shadow)
      pth(ctx, fl);
      ctx.fillStyle = lin(ctx, 0, BK.y1, 0, H, [[0, '#4e3c29'], [1, '#22170e']]);
      ctx.fill();
      ctx.save();
      pth(ctx, fl);
      ctx.clip();
      ctx.strokeStyle = 'rgba(18,10,4,0.4)';
      ctx.lineWidth = 1.4;
      for (let xb = BK.x0; xb <= BK.x1 + 1; xb += 60) {
        const a = PT(xb, BK.y1, 1), b = PT(xb, BK.y1, MF);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      for (let z = 0.06; z < 0.75; z += 0.06) {
        const y = PT(0, BK.y1, MZ(z))[1];
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.restore();
      // ---- side walls
      pth(ctx, lw);
      ctx.fillStyle = lin(ctx, BK.x0, 0, 0, 0, [[0, '#6c5a42'], [0.45, '#4c3d2b'], [1, '#261c12']]);
      ctx.fill();
      pth(ctx, rw);
      ctx.fillStyle = lin(ctx, BK.x1, 0, W, 0, [[0, '#bba987'], [0.55, '#a48f6c'], [1, '#7c684a']]);
      ctx.fill();
      // ---- ceiling with coffers
      pth(ctx, cl);
      ctx.fillStyle = lin(ctx, 0, BK.y0, 0, 0, [[0, '#5e503e'], [1, '#261e16']]);
      ctx.fill();
      ctx.save();
      pth(ctx, cl);
      ctx.clip();
      const NC = 8, cw = (BK.x1 - BK.x0) / NC, dz = 0.072;
      const q = (x0_, x1_, za, zb, yy) => [PT(x0_, yy, MZ(za)), PT(x1_, yy, MZ(za)), PT(x1_, yy, MZ(zb)), PT(x0_, yy, MZ(zb))];
      for (let j = 0; j < 14; j++) {
        const z0 = j * dz, z1 = z0 + dz;
        if (MZ(z0) > MF) break;
        const dK = V.clamp((MZ(z0) - 1) / 1.6);
        for (let k = 0; k < NC; k++) {
          const xa = BK.x0 + k * cw, xb = xa + cw;
          const bx = cw * 0.15, bz = dz * 0.15;
          const o = q(xa + bx, xb - bx, z0 + bz, z1 - bz, BK.y0);
          const inn = q(xa + bx + cw * 0.05, xb - bx - cw * 0.05, z0 + bz + dz * 0.05, z1 - bz - dz * 0.05, BK.y0 - 8);
          ctx.save();
          pth(ctx, o);
          ctx.fillStyle = V.mix('#3e342a', '#211a13', dK);
          ctx.fill();
          ctx.clip();
          pth(ctx, [o[0], o[1], inn[1], inn[0]]);
          ctx.fillStyle = V.mix('#6e5e48', '#3c3126', dK);
          ctx.fill();
          pth(ctx, inn);
          ctx.fillStyle = lin(ctx, 0, inn[0][1], 0, inn[2][1], [[0, V.mix('#3a3e44', '#25272b', dK)], [1, V.mix('#2a2d32', '#17181b', dK)]]);
          ctx.fill();
          const c = PT((xa + xb) / 2, BK.y0 - 8, MZ((z0 + z1) / 2));
          const rr = 3.4 * MZ((z0 + z1) / 2);
          ctx.fillStyle = 'rgba(176,146,84,0.75)';
          ctx.beginPath();
          ctx.ellipse(c[0], c[1], rr, rr * 0.55, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();
      // ceiling/wall cornice bands
      const band = (xw, side) => {
        pth(ctx, [[xw, BK.y0], PT(xw, BK.y0, MF), PT(xw, BK.y0 + 18, MF), [xw, BK.y0 + 18]]);
        ctx.fillStyle = side < 0 ? '#5e4d38' : '#d2c2a0';
        ctx.fill();
        pth(ctx, [[xw, BK.y0 + 18], PT(xw, BK.y0 + 18, MF), PT(xw, BK.y0 + 26, MF), [xw, BK.y0 + 26]]);
        ctx.fillStyle = side < 0 ? 'rgba(20,12,6,0.55)' : 'rgba(70,52,30,0.45)';
        ctx.fill();
      };
      band(BK.x0, -1);
      band(BK.x1, 1);
      // tapestries
      [[0.035, 0.16], [0.2, 0.33], [0.37, 0.5], [0.54, 0.68]].forEach(([za, zb], ti) => {
        tapestry(ctx, -1, za, zb, ti);
        tapestry(ctx, 1, za, zb, ti);
      });
      // ---- back wall
      pth(ctx, bw);
      ctx.fillStyle = lin(ctx, 0, BK.y0, 0, BK.y1, [[0, '#9a896c'], [0.22, '#bcab8c'], [1, '#a59476']]);
      ctx.fill();
      ctx.fillStyle = lin(ctx, BK.x0, 0, BK.x1, 0, [[0, 'rgba(40,25,12,0.32)'], [0.28, 'rgba(40,25,12,0)'], [1, 'rgba(255,240,210,0.06)']]);
      ctx.fillRect(BK.x0, BK.y0, BK.x1 - BK.x0, BK.y1 - BK.y0);
      // landscape through the three openings
      ctx.save();
      ctx.beginPath();
      for (const w of WIN) {
        const iw = winInner(w);
        ctx.rect(iw.x0, iw.y0, iw.x1 - iw.x0, iw.y1 - iw.y0);
      }
      ctx.clip();
      landscape(ctx);
      ctx.restore();
      for (const w of WIN) windowFrame(ctx, w);
      // segmental pediment over the central window
      const cxp = 960, chordY = 342, half = 114, rise = 34;
      const R = (half * half + rise * rise) / (2 * rise), cyp = chordY - rise + R, a0 = Math.asin(half / R);
      ctx.beginPath();
      ctx.arc(cxp, cyp, R + 15, -Math.PI / 2 - a0 - 0.035, -Math.PI / 2 + a0 + 0.035);
      ctx.arc(cxp, cyp, R, -Math.PI / 2 + a0, -Math.PI / 2 - a0, true);
      ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, chordY - rise - 15, 0, chordY, [[0, '#ddd0b4'], [1, '#a8987a']]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,44,28,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#cdbf9f';
      ctx.fillRect(cxp - half - 14, chordY - 3, 2 * half + 28, 9);
      ctx.fillStyle = 'rgba(50,34,18,0.45)';
      ctx.fillRect(cxp - half - 14, chordY + 6, 2 * half + 28, 4);
      // back-wall cornice
      ctx.fillStyle = lin(ctx, 0, BK.y0, 0, BK.y0 + 20, [[0, '#a99878'], [0.5, '#dccfb2'], [1, '#bfae8e']]);
      ctx.fillRect(BK.x0, BK.y0, BK.x1 - BK.x0, 20);
      ctx.fillStyle = lin(ctx, 0, BK.y0 + 20, 0, BK.y0 + 34, [[0, 'rgba(40,26,12,0.5)'], [1, 'rgba(40,26,12,0)']]);
      ctx.fillRect(BK.x0, BK.y0 + 20, BK.x1 - BK.x0, 14);
      // room corners: soft occlusion
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(30,20,10,0.28)';
      ctx.beginPath();
      ctx.moveTo(BK.x0, BK.y0);
      ctx.lineTo(BK.x0, BK.y1);
      ctx.moveTo(BK.x1, BK.y0);
      ctx.lineTo(BK.x1, BK.y1);
      ctx.stroke();
    });
    // ---- brush texture (grainy built-ins only: they read as tempera granulation, never as opaque slashes)
    const winEx = WIN.map((w) => V.rectPts(w.x0 - 9, w.y0 - 9, w.x1 - w.x0 + 18, w.y1 - w.y0 + 18));
    // damp patches / uneven lime wash on the back wall (watercolour fills with darker rims)
    const rm = V.rng(77);
    for (let k = 0; k < 22; k++) {
      const x = BK.x0 + 20 + rm() * (BK.x1 - BK.x0 - 40), y = BK.y0 + 40 + rm() * 300;
      if (winEx.some((E) => inPoly(x, y, E)) || winEx.some((E) => inPoly(x + 40, y, E)) || winEx.some((E) => inPoly(x - 40, y, E))) continue;
      V.fill(V.ellipsePts(x, y, 22 + rm() * 40, 16 + rm() * 30, 22), { color: rm() < 0.6 ? '#8e7c5e' : '#d2c3a2', alpha: 0.3, flat: false, seed: 300 + k, bleed: 0.3, tex: 0.7, border: 0.7 });
    }
    // plaster granulation: sprayed speckle in light & dark plaster tones
    const rs = V.rng(91);
    for (let k = 0; k < 26; k++) {
      const x = BK.x0 + rs() * (BK.x1 - BK.x0), y = BK.y0 + 30 + rs() * 380;
      if (winEx.some((E) => inPoly(x, y, E))) continue;
      V.ink([[x, y], [x + 20 + rs() * 30, y + (rs() - 0.5) * 20]], { brush: 'spray', w: 0.18, color: k % 2 ? '#d6c8a8' : '#7a6a50', seed: 900 + k, taper: [0, 0] });
    }
    // charcoal hatching in the coffered ceiling and the shadowed left wall (the cartoon's under-drawing showing through)
    V.hatch(cl, { dist: 7, angle: 72, color: '#2a2018', brush: 'charcoal', w: 0.22, seed: 41, rand: 0.15 });
    V.hatch(lw, { dist: 8, angle: 100, color: '#1e160e', brush: 'charcoal', w: 0.25, seed: 42, rand: 0.15 });
    V.hatch(rw, { dist: 9, angle: 80, color: '#7e6a4c', brush: 'crayon', w: 0.3, seed: 43, rand: 0.15 });
    V.hatch(fl, { dist: 6, angle: 4, color: '#1a120a', brush: 'crayon', w: 0.35, seed: 44, rand: 0.1 });
    // soft shade the seated figures throw on the wall behind them (light from the upper left)
    V.with2d((ctx) => {
      ctx.filter = 'blur(14px)';
      ctx.fillStyle = 'rgba(16,8,3,0.2)';
      for (const f of FIG) {
        ctx.save();
        ctx.translate(12 * f.s, 6 * f.s);
        spth(ctx, torsoPts(f), true, 6);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(f.hx, f.hy + 6 * f.s, 34 * f.s, 46 * f.s, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  // ================================================================== TABLE
  const hemY = (x) => TB.yc + 5 * Math.sin(x / 31) + 7 * (fbm(x / 47, 2.3) - 0.5);

  function bread(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(70,50,30,0.35)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + r * 0.35, r * 1.05, r * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rad(ctx, x - r * 0.4, y - r * 0.5, 1, x, y, r * 1.2, [[0, '#e0bc7c'], [0.5, '#b8884a'], [1, '#6e4a22']]);
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.15, r, r * 0.62, 0, Math.PI, 0);
    ctx.ellipse(x, y - r * 0.15, r, r * 0.38, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,56,24,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, y - r * 0.55);
    ctx.quadraticCurveTo(x, y - r * 0.35, x + r * 0.45, y - r * 0.5);
    ctx.stroke();
  }
  function glass(ctx, x, y, h) {
    const w = h * 0.3;
    ctx.fillStyle = 'rgba(60,50,40,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 1, w * 1.1, w * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(206,214,206,0.35)';
    pth(ctx, [[x - w, y - h], [x + w, y - h], [x + w * 0.8, y], [x - w * 0.8, y]]);
    ctx.fill();
    ctx.fillStyle = 'rgba(112,26,22,0.8)';
    pth(ctx, [[x - w * 0.92, y - h * 0.55], [x + w * 0.92, y - h * 0.55], [x + w * 0.8, y], [x - w * 0.8, y]]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,250,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y - h, w, w * 0.28, 0, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - w * 0.6, y - h * 0.9);
    ctx.lineTo(x - w * 0.5, y - h * 0.1);
    ctx.stroke();
  }
  function plate(ctx, x, y, r, food) {
    ctx.fillStyle = 'rgba(70,58,44,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 2, r * 1.02, r * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = lin(ctx, x - r, 0, x + r, 0, [[0, '#c6c4b8'], [0.5, '#8e8c82'], [1, '#6a685f']]);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(60,58,52,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, y + 0.5, r * 0.62, r * 0.11, 0, 0, TAU);
    ctx.fill();
    if (food === 'fish') {
      ctx.fillStyle = lin(ctx, 0, y - 6, 0, y + 2, [[0, '#b4aa94'], [1, '#6a6052']]);
      ctx.beginPath();
      ctx.ellipse(x - 3, y - 2, r * 0.55, 3.2, 0.03, 0, TAU);
      ctx.fill();
      pth(ctx, [[x + r * 0.5, y - 2], [x + r * 0.78, y - 6], [x + r * 0.74, y + 2]]);
      ctx.fill();
    } else if (food === 'fruit') {
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k === 1 ? '#a8501e' : '#c06a24';
        ctx.beginPath();
        ctx.arc(x - 8 + k * 8, y - 4, 4.5, 0, TAU);
        ctx.fill();
      }
    }
  }

  function paintTable() {
    V.with2d((ctx) => {
      // shadow beneath the table on the floor, dim feet
      ctx.fillStyle = lin(ctx, 0, TB.yc - 30, 0, TB.yc + 120, [[0, 'rgba(10,6,3,0.85)'], [1, 'rgba(10,6,3,0)']]);
      ctx.fillRect(TB.xf0 + 4, TB.yc - 30, TB.xf1 - TB.xf0 - 8, 150);
      const rf = V.rng(808);
      for (let k = 0; k < 0; k++) {
        const x = 230 + k * 146 + (rf() - 0.5) * 30;
        if (Math.abs(x - 960) < 70) continue;
        ctx.fillStyle = `rgba(${120 + rf() * 20},${80 + rf() * 14},${56},0.38)`;
        ctx.beginPath();
        ctx.ellipse(x, TB.yc + 22 + rf() * 6, 13, 5, (rf() - 0.5) * 0.4, 0, TAU);
        ctx.ellipse(x + 26, TB.yc + 24 + rf() * 6, 13, 5, (rf() - 0.5) * 0.4, 0, TAU);
        ctx.fill();
      }
      // ends of the cloth (receding)
      const le = [[TB.xb0, TB.yb], [TB.xf0, TB.yf], [TB.xf0, hemY(TB.xf0)], [TB.xb0 + 6, TB.yb + (TB.yc - TB.yf) * 0.82]];
      pth(ctx, le);
      ctx.fillStyle = lin(ctx, TB.xb0, 0, TB.xf0, 0, [[0, '#d7cdb6'], [1, '#f3eddc']]);
      ctx.fill();
      const re = [[TB.xb1, TB.yb], [TB.xf1, TB.yf], [TB.xf1, hemY(TB.xf1)], [TB.xb1 - 6, TB.yb + (TB.yc - TB.yf) * 0.82]];
      pth(ctx, re);
      ctx.fillStyle = lin(ctx, TB.xb1, 0, TB.xf1, 0, [[0, '#9c927b'], [1, '#bdb39c']]);
      ctx.fill();
      // front drape
      const fr = [[TB.xf0, TB.yf], [TB.xf1, TB.yf]];
      for (let x = TB.xf1; x >= TB.xf0; x -= 6) fr.push([x, hemY(x)]);
      pth(ctx, fr);
      ctx.fillStyle = lin(ctx, 0, TB.yf, 0, TB.yc, [[0, '#f1ebdc'], [0.45, '#e3dac6'], [1, '#c6bba2']]);
      ctx.fill();
      ctx.save();
      pth(ctx, fr);
      ctx.clip();
      // hanging folds
      const r = V.rng(77);
      for (let x = TB.xf0 + 26; x < TB.xf1; x += 52 + r() * 44) {
        const w = 16 + r() * 22;
        ctx.fillStyle = lin(ctx, x - w, 0, x + w, 0, [[0, 'rgba(255,252,242,0)'], [0.32, 'rgba(255,252,242,0.42)'], [0.58, 'rgba(104,84,56,0.26)'], [1, 'rgba(104,84,56,0)']]);
        ctx.fillRect(x - w, TB.yf, w * 2, TB.yc - TB.yf + 20);
      }
      // the linen's ironed fold lines (horizontal crease)
      ctx.fillStyle = 'rgba(110,92,64,0.18)';
      ctx.fillRect(TB.xf0, TB.yf + 52, TB.xf1 - TB.xf0, 2);
      ctx.fillStyle = 'rgba(255,255,248,0.4)';
      ctx.fillRect(TB.xf0, TB.yf + 54, TB.xf1 - TB.xf0, 2);
      // woven blue borders near both ends + along the hem
      for (const x0 of [TB.xf0 + 22, TB.xf1 - 22 - 86]) {
        for (let k = 0; k < 5; k++) {
          ctx.fillStyle = k % 2 ? 'rgba(52,78,118,0.55)' : 'rgba(52,78,118,0.8)';
          ctx.fillRect(x0 + k * 18, TB.yf + 6, k % 2 ? 3 : 6, TB.yc - TB.yf - 16);
        }
        for (let y = TB.yf + 16; y < TB.yc - 16; y += 18) {
          ctx.fillStyle = 'rgba(52,78,118,0.6)';
          ctx.beginPath();
          ctx.moveTo(x0 + 43, y);
          ctx.lineTo(x0 + 49, y + 7);
          ctx.lineTo(x0 + 43, y + 14);
          ctx.lineTo(x0 + 37, y + 7);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(52,78,118,0.45)';
      for (let x = TB.xf0; x < TB.xf1; x += 6) ctx.fillRect(x, hemY(x) - 12, 3, 4);
      // shadow under the table edge
      ctx.fillStyle = lin(ctx, 0, TB.yf, 0, TB.yf + 16, [[0, 'rgba(80,64,44,0.3)'], [1, 'rgba(80,64,44,0)']]);
      ctx.fillRect(TB.xf0, TB.yf, TB.xf1 - TB.xf0, 16);
      ctx.restore();
      // top surface
      const top = [[TB.xb0, TB.yb], [TB.xb1, TB.yb], [TB.xf1, TB.yf], [TB.xf0, TB.yf]];
      pth(ctx, top);
      ctx.fillStyle = lin(ctx, 0, TB.yb, 0, TB.yf, [[0, '#ada28a'], [0.35, '#d6cdb9'], [1, '#f0eadb']]);
      ctx.fill();
      ctx.save();
      pth(ctx, top);
      ctx.clip();
      // ironed creases converging to the vanishing point
      for (let k = 0; k < 9; k++) {
        const xf = TB.xf0 + ((k + 0.5) / 9) * (TB.xf1 - TB.xf0);
        const kk = (TB.yb - VY) / (TB.yf - VY);
        ctx.strokeStyle = 'rgba(120,100,70,0.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xf, TB.yf);
        ctx.lineTo(VX + (xf - VX) * kk, TB.yb);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,248,0.35)';
        ctx.beginPath();
        ctx.moveTo(xf + 2, TB.yf);
        ctx.lineTo(VX + (xf + 2 - VX) * kk, TB.yb);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,252,244,0.95)';
      ctx.fillRect(TB.xf0, TB.yf - 2, TB.xf1 - TB.xf0, 3);
      // ---- things on the table (kept to the front strip, between the hands)
      const xs = FIG.map((f) => f.x);
      for (let i = 0; i < xs.length - 1; i++) {
        const mx = (xs[i] + xs[i + 1]) / 2;
        if (i === 5 || i === 6) continue;
        bread(ctx, mx + (i % 2 ? 8 : -8), 706, 10 + (i % 3));
        glass(ctx, mx + (i % 2 ? -12 : 12), 698, 20);
      }
      [[190, 'fruit'], [406, null], [648, 'fish'], [1272, 'fruit'], [1514, null], [1730, 'fish']].forEach(([x, food]) => plate(ctx, x, 708, 21, food));
      plate(ctx, 960, 706, 30, 'fish');
      bread(ctx, 870, 704, 11);
      glass(ctx, 1052, 698, 21);
      bread(ctx, 1090, 708, 10);
      glass(ctx, 838, 700, 19);
      // the famous spilled salt (by Judas)
      ctx.fillStyle = 'rgba(160,150,130,0.9)';
      ctx.beginPath();
      ctx.ellipse(512, 704, 7, 4, 0.9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,250,0.85)';
      for (let k = 0; k < 14; k++) ctx.fillRect(516 + k * 2.1 + Math.sin(k * 3) * 2, 703 + Math.cos(k * 1.7) * 2.5, 1.6, 1.6);
    });
    V.with2d((ctx) => {
      const x0 = 868, x1 = 1052, yT = 902, cx = (x0 + x1) / 2, R = (x1 - x0) / 2;
      const rough = [];
      for (let k = 0; k <= 40; k++) {
        const a = Math.PI + (k / 40) * Math.PI;
        const j = (V.noise1(k * 0.7 + 3) - 0.5) * 10;
        rough.push([cx + Math.cos(a) * (R + j), yT + R + Math.sin(a) * (R + j)]);
      }
      rough.push([x1 + 6, H + 10], [x0 - 6, H + 10]);
      ctx.save();
      ctx.shadowColor = 'rgba(20,10,4,0.6)';
      ctx.shadowBlur = 6;
      pth(ctx, rough);
      ctx.fillStyle = '#b6a688';
      ctx.fill();
      ctx.restore();
      ctx.save();
      pth(ctx, rough);
      ctx.clip();
      ctx.fillStyle = lin(ctx, 0, yT, 0, H, [[0, '#c4b596'], [1, '#9a8a6c']]);
      ctx.fillRect(x0 - 20, yT - 20, x1 - x0 + 40, H - yT + 40);
      // brick courses of the later infill, half-hidden under lime
      ctx.strokeStyle = 'rgba(120,80,56,0.28)';
      ctx.lineWidth = 1.2;
      for (let y = yT + 12, row = 0; y < H; y += 15, row++) {
        ctx.beginPath();
        ctx.moveTo(x0 - 10, y);
        ctx.lineTo(x1 + 10, y);
        for (let x = x0 - 10 + (row % 2) * 22; x < x1 + 10; x += 44) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 15);
        }
        ctx.stroke();
      }
      ctx.restore();
    });
    // brush: linen weave (vertical pastel striations), fold troughs in charcoal, grain on the table top
    const fr = [[TB.xf0, TB.yf + 3], [TB.xf1, TB.yf + 3], [TB.xf1, TB.yc - 8], [TB.xf0, TB.yc - 8]];
    V.hatch(fr, { dist: 5, angle: 90, color: '#fffbf2', brush: 'pastel', w: 0.5, seed: 51, rand: 0.05 });
    V.hatch(fr, { dist: 11, angle: 88, color: '#8a7a5c', brush: 'crayon', w: 0.3, seed: 52, rand: 0.2 });
    const top = [[TB.xb0, TB.yb + 2], [TB.xb1, TB.yb + 2], [TB.xf1, TB.yf - 4], [TB.xf0, TB.yf - 4]];
    V.hatch(top, { dist: 5, angle: 2, color: '#a89c82', brush: 'crayon', w: 0.25, seed: 53, rand: 0.1 });
    const rr = V.rng(61);
    for (let x = TB.xf0 + 40; x < TB.xf1 - 20; x += 60 + rr() * 50) {
      V.ink([[x, TB.yf + 8], [x + (rr() - 0.5) * 6, (TB.yf + TB.yc) / 2], [x + (rr() - 0.5) * 10, TB.yc - 14]], { brush: 'charcoal', w: 0.35, color: '#9c8c6c', seed: 700 + Math.round(x), taper: [20, 20] });
    }
  }

  // ================================================================== FIGURES
  // turn: -1..1 (+ = face turned toward screen-right). lean: px the upper body leans. z: paint order (low = further back).
  const FIG = [
    { id: 'bart', bare: true, x: 192, hy: 430, s: 1.22, lean: 20, tilt: 0.1, turn: 0.7, robe: '#5e6c48', mantle: null, hair: '#2a1c12', hairT: 'curly', beard: 'none', skin: '#c99a72', expr: 'O', brow: 'up', z: 2, stand: true },
    { id: 'jmin', x: 302, hy: 470, s: 1.2, lean: 12, tilt: 0.07, turn: 0.45, robe: '#a2874e', mantle: '#536d5c', mSide: 1, lining: '#c4a868', hair: '#5a3a22', hairT: 'long', beard: 'short', beardC: '#563820', skin: '#c8986e', expr: 'open', brow: 'up', z: 0 },
    { id: 'andr', bare: true, x: 410, hy: 462, s: 1.24, lean: -4, tilt: -0.03, turn: 0.12, robe: '#4b6b45', mantle: '#a67a3c', mSide: -1, lining: '#6a8a5a', hair: '#d2c9b6', hairT: 'short', beard: 'long', beardC: '#dad1bf', skin: '#c08e68', expr: 'O', brow: 'up', z: 1, old: true },
    { id: 'juda', bare: true, x: 548, hy: 488, s: 1.24, lean: -14, tilt: -0.1, turn: 0.86, robe: '#3d5862', mantle: '#7c5a2a', mSide: 1, lining: '#a8884a', hair: '#1c120a', hairT: 'short', beard: 'short', beardC: '#1c120a', skin: '#a8764e', expr: 'flat', brow: 'down', z: 2, dark: 0.3 },
    { id: 'pete', bare: true, x: 650, hy: 452, s: 1.22, lean: 24, tilt: 0.18, turn: 0.75, robe: '#2f4f78', mantle: '#a67a3c', mSide: -1, lining: '#c8a868', hair: '#dcd4c4', hairT: 'short', beard: 'short', beardC: '#e0d8c8', skin: '#c4926a', expr: 'whisper', brow: 'down', z: 0, old: true },
    { id: 'john', x: 730, hy: 490, s: 1.2, lean: -18, tilt: -0.24, turn: -0.3, robe: '#4e6a6a', mantle: '#8c2f25', mSide: 1, lining: '#3c5a58', hair: '#8a5a30', hairT: 'long', beard: 'none', skin: '#d6a87e', expr: 'sad', brow: 'sad', eyes: 'half', z: 1 },
    { id: 'chri', x: 960, hy: 474, s: 1.34, lean: -2, tilt: -0.08, turn: -0.06, robe: '#8c2f25', mantle: '#2f4f78', mSide: 1, lining: '#a89448', hair: '#5a3a20', hairT: 'long', beard: 'short', beardC: '#5a3a20', skin: '#cf9e74', expr: 'calm', brow: 'calm', eyes: 'down', z: 3 },
    { id: 'thom', x: 1186, hy: 446, s: 1.18, lean: -14, tilt: -0.08, turn: -0.5, robe: '#4c6670', mantle: null, hair: '#4a3020', hairT: 'short', beard: 'short', beardC: '#4a3020', skin: '#c4946a', expr: 'flat', brow: 'skeptic', z: 0 },
    { id: 'jmaj', bare: true, x: 1280, hy: 474, s: 1.26, lean: -6, tilt: -0.05, turn: -0.35, robe: '#566b45', mantle: '#9a4a2e', mSide: -1, lining: '#c09050', hair: '#4a3020', hairT: 'long', beard: 'long', beardC: '#4a3020', skin: '#c4946a', expr: 'O', brow: 'up', z: 1 },
    { id: 'phil', x: 1378, hy: 432, s: 1.22, lean: -16, tilt: -0.12, turn: -0.55, robe: '#8a6070', mantle: '#3f5878', mSide: 1, lining: '#b08a9a', hair: '#a07a48', hairT: 'short', beard: 'none', skin: '#d2a27a', expr: 'me', brow: 'up', z: 2, stand: true, chest: true },
    { id: 'matt', bare: true, x: 1514, hy: 468, s: 1.24, lean: 8, tilt: 0.06, turn: 0.6, robe: '#3a5a80', mantle: null, hair: '#2e2016', hairT: 'curly', beard: 'none', skin: '#c8986e', expr: 'open', brow: 'up', z: 1 },
    { id: 'thad', x: 1622, hy: 462, s: 1.22, lean: 14, tilt: 0.12, turn: 0.55, robe: '#8a7440', mantle: '#4b6b45', mSide: 1, lining: '#9aa070', hair: '#7a6a58', hairT: 'short', beard: 'short', beardC: '#8a7a68', skin: '#c4926a', expr: 'whisper', brow: 'skeptic', z: 0, old: true },
    { id: 'simo', x: 1728, hy: 474, s: 1.26, lean: -10, tilt: -0.05, turn: -0.8, robe: '#7a5a78', mantle: '#d0c6b4', mSide: -1, lining: '#9a7a96', hair: '#d8d0c0', hairT: 'bald', beard: 'long', beardC: '#ddd4c4', skin: '#c0906a', expr: 'flat', brow: 'up', z: 2, old: true },
  ];
  const PIVY = 770; // sway pivot (hips, hidden behind the table)

  FIG.forEach((f, i) => {
    const s = f.s;
    f.i = i;
    f.off = (6 - i) * 0.1; // human wave: left side leads, right side lags, Christ exactly on the beat
    f.ysh = f.hy + 53 * s;
    f.sw = 51 * s;
    f.nx = f.x + f.lean;
    f.hx = f.x + f.lean * 1.12;
    f.rx0 = Math.round(f.x - 175);
    f.ry0 = Math.round(f.hy - 118 * s);
    f.rw = 350;
    f.rh = 792 - f.ry0;
    f.col = [f.mantle && f.mSide < 0 ? f.mantle : f.robe, f.mantle && f.mSide > 0 ? f.mantle : f.robe];
    if (f.id === 'chri') f.g = { ex: 112, ey: 650, w0: [174, 684], w1: [160, 614] };
    else if (f.chest) f.g = { ex: 46 * s, ey: f.ysh + 92 * s, w0: [19 * s, f.ysh + 96 * s], w1: [16 * s, f.ysh + 46 * s] };
    else if (f.stand) f.g = { ex: 46 * s, ey: 648, w0: [31 * s, 680], w1: [38 * s, 606] };
    else f.g = { ex: 52 * s, ey: 652, w0: [31 * s, 680], w1: [38 * s, 606] };
  });
  const ORDER = FIG.slice().sort((a, b) => a.z - b.z || a.i - b.i);

  function torsoPts(f) {
    const s = f.s, L = f.lean, cx = f.x, nx = f.nx, ysh = f.ysh, sw = f.sw, yb = 792;
    return [
      [nx - 14 * s, ysh - 8 * s],
      [nx - sw * 0.58, ysh - 4 * s],
      [nx - sw * 0.92, ysh + 8 * s],
      [nx - sw * 1.06, ysh + 34 * s],
      [cx + L * 0.45 - sw * 1.08, ysh + 88 * s],
      [cx - sw * 1.12, yb],
      [cx + sw * 1.12, yb],
      [cx + L * 0.45 + sw * 1.08, ysh + 88 * s],
      [nx + sw * 1.06, ysh + 34 * s],
      [nx + sw * 0.92, ysh + 8 * s],
      [nx + sw * 0.58, ysh - 4 * s],
      [nx + 14 * s, ysh - 8 * s],
      [nx + 6 * s, ysh + 7 * s],
      [nx - 6 * s, ysh + 7 * s],
    ];
  }
  function mantlePts(f) {
    const s = f.s, L = f.lean, cx = f.x, nx = f.nx, ysh = f.ysh, sw = f.sw, yb = 792, k = f.mSide;
    return [
      [nx + k * 3 * s, ysh - 7 * s],
      [nx + k * sw * 0.6, ysh - 4 * s],
      [nx + k * sw * 0.97, ysh + 9 * s],
      [nx + k * sw * 1.1, ysh + 40 * s],
      [cx + k * sw * 1.16, yb],
      [cx - k * sw * 0.3, yb],
      [cx + L * 0.45 - k * sw * 0.08, ysh + 98 * s],
      [nx + k * 2 * s, ysh + 46 * s],
    ];
  }

  // a sfumato-modelled drapery region: base, broad light from the upper left, soft fold troughs and ridges, occlusion toward the table
  function drape(ctx, f, P, col, seed, kind) {
    const s = f.s;
    spth(ctx, P, true, 6);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.save();
    spth(ctx, P, true, 6);
    ctx.clip();
    const x0 = f.nx - f.sw * 1.25, x1 = f.nx + f.sw * 1.25;
    ctx.fillStyle = lin(ctx, x0, 0, x1, 0, [[0, ra(lt(col, 0.6), 0.55)], [0.25, ra(lt(col, 0.3), 0.22)], [0.48, 'rgba(0,0,0,0)'], [0.72, ra(dk(col, 0.62), 0.5)], [1, ra(dk(col, 0.8), 0.78)]]);
    ctx.fillRect(x0 - 60, f.ysh - 60, x1 - x0 + 120, 900);
    const r = V.rng(seed);
    ctx.lineCap = 'round';
    ctx.filter = `blur(${(2.6 * s).toFixed(1)}px)`;
    const folds = [];
    if (kind === 'mantle') {
      const k = f.mSide;
      for (let j = 0; j < 4; j++) {
        const a = [f.nx + k * (6 + j * 11) * s, f.ysh + (2 + j * 7) * s];
        const b = [f.x + k * (f.sw * 0.95 - j * 17 * s) + (r() - 0.5) * 8, 792];
        folds.push([a, [V.lerp(a[0], b[0], 0.45) - k * (10 + r() * 8) * s, V.lerp(a[1], b[1], 0.45)], b]);
      }
    } else {
      for (let j = 0; j < 6; j++) {
        const u = (j + 0.5) / 6 - 0.5;
        const a = [f.nx + u * f.sw * 1.3, f.ysh + (12 + Math.abs(u) * 30 + r() * 10) * s];
        const b = [f.x + u * f.sw * 2.1 + (r() - 0.5) * 12, 792];
        folds.push([a, [V.lerp(a[0], b[0], 0.5) + (r() - 0.5) * 10, V.lerp(a[1], b[1], 0.4)], b]);
      }
    }
    for (const [a, c, b] of folds) {
      ctx.strokeStyle = ra(dk(col, 0.65), 0.5);
      ctx.lineWidth = (6 + r() * 6) * s;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]);
      ctx.stroke();
      ctx.strokeStyle = ra(lt(col, 0.5), 0.42);
      ctx.lineWidth = (3 + r() * 3) * s;
      ctx.beginPath();
      ctx.moveTo(a[0] - 7 * s, a[1] + 4 * s);
      ctx.quadraticCurveTo(c[0] - 8 * s, c[1], b[0] - 9 * s, b[1]);
      ctx.stroke();
    }
    ctx.filter = 'none';
    ctx.fillStyle = lin(ctx, 0, f.ysh, 0, 740, [[0, 'rgba(255,240,210,0.1)'], [0.35, 'rgba(0,0,0,0)'], [1, 'rgba(14,7,3,0.55)']]);
    ctx.fillRect(x0 - 60, f.ysh - 60, x1 - x0 + 120, 900);
    ctx.fillStyle = rad(ctx, f.nx + 4 * s, f.ysh + 2 * s, 1, f.nx + 4 * s, f.ysh + 8 * s, 34 * s, [[0, 'rgba(20,8,3,0.5)'], [1, 'rgba(20,8,3,0)']]);
    ctx.fillRect(x0 - 60, f.ysh - 60, x1 - x0 + 120, 900);
    ctx.restore();
    return folds;
  }

  function paintTorso(f) {
    const s = f.s;
    const T = torsoPts(f), M = f.mantle ? mantlePts(f) : null;
    let robeFolds = [], mantleFolds = [];
    V.with2d((ctx) => {
      // neck
      const nb = [f.nx, f.ysh + 4 * s], nt = [f.hx, f.hy + 12 * s];
      ctx.lineCap = 'round';
      ctx.strokeStyle = lin(ctx, nb[0] - 14 * s, 0, nb[0] + 14 * s, 0, [[0, lt(f.skin, 0.1)], [0.5, dk(f.skin, 0.14)], [1, dk(f.skin, 0.55)]]);
      ctx.lineWidth = 26 * s;
      ctx.beginPath();
      ctx.moveTo(nt[0], nt[1]);
      ctx.lineTo(nb[0], nb[1]);
      ctx.stroke();
      ctx.fillStyle = 'rgba(60,25,10,0.45)';
      ctx.beginPath();
      ctx.ellipse(f.hx + 2 * s, f.hy + 31 * s, 12 * s, 7 * s, 0, 0, TAU);
      ctx.fill();
      robeFolds = drape(ctx, f, T, f.robe, 100 + f.i, 'robe');
      ctx.save();
      ctx.filter = `blur(${(2.2 * s).toFixed(1)}px)`;
      ctx.strokeStyle = ra(dk(f.robe, 0.7), 0.55);
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(f.nx - 15 * s, f.ysh - 4 * s);
      ctx.quadraticCurveTo(f.nx, f.ysh + 15 * s, f.nx + 15 * s, f.ysh - 4 * s);
      ctx.stroke();
      ctx.restore();
      if (M) {
        ctx.save();
        ctx.shadowColor = 'rgba(15,8,3,0.55)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = f.mSide * 3;
        ctx.shadowOffsetY = 2;
        spth(ctx, M, true, 6);
        ctx.fillStyle = f.mantle;
        ctx.fill();
        ctx.restore();
        mantleFolds = drape(ctx, f, M, f.mantle, 200 + f.i, 'mantle');
        // the turned-over lining along the mantle's inner edge
        ctx.save();
        spth(ctx, M, true, 6);
        ctx.clip();
        ctx.strokeStyle = f.lining || lt(f.mantle, 0.4);
        ctx.lineWidth = 8 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(M[7][0], M[7][1] - 30 * s);
        ctx.quadraticCurveTo(M[6][0], M[6][1], M[5][0], M[5][1]);
        ctx.stroke();
        ctx.strokeStyle = ra(lt(f.lining || f.mantle, 0.5), 0.6);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    });
    // brush: crayon hatching in the shadows (tempera is built up in hatched strokes), pastel in the lights, charcoal fold accents
    const shadowClip = [f.nx + f.sw * 0.12, f.ysh - 40, 240, 380];
    const lightClip = [f.nx - 240, f.ysh - 40, 240 - f.sw * 0.35, 380];
    V.hatch(T, { dist: 3.6, angle: 58, color: dk(f.robe, 0.5), brush: 'HB', w: 0.32, seed: 60 + f.i, clip: shadowClip, rand: 0.1 });
    V.hatch(T, { dist: 6, angle: 116, color: lt(f.robe, 0.5), brush: 'pastel', w: 0.42, seed: 80 + f.i, clip: lightClip, rand: 0.12 });
    if (M) V.hatch(M, { dist: 3.6, angle: 56, color: dk(f.mantle, 0.5), brush: 'HB', w: 0.3, seed: 90 + f.i, clip: shadowClip, rand: 0.1 });
    robeFolds.concat(mantleFolds).forEach(([a, c, b], k) => {
      if (k % 2) return;
      V.ink([a, c, [V.lerp(c[0], b[0], 0.6), V.lerp(c[1], b[1], 0.6)]], { brush: 'charcoal', w: 0.32, color: dk(k < robeFolds.length ? f.robe : f.mantle, 0.7), seed: 7700 + f.i * 20 + k, taper: [18, 24], smooth: true });
    });
  }

  // ---- heads
  function headPaint(f) {
    const s = f.s, rx = 21.5 * s, ry = 29 * s;
    const th = f.turn * 0.95, sn = Math.sin(th), cs = Math.cos(th);
    const sg = sn >= 0 ? 1 : -1;
    const fcx = sn * 2.5 * s;
    const frx = rx * (1 - 0.06 * Math.abs(sn));
    const tx = (x) => x * (0.32 + 0.68 * cs) + sn * frx * 0.5; // front-view x → turned x
    const skin = f.skin, hair = f.hair;
    const ct = Math.cos(f.tilt), st = Math.sin(f.tilt);
    const hp = (x, y) => [f.hx + x * ct - y * st, f.hy + x * st + y * ct];
    const eyeY = -2 * s;
    const eyes = [-1, 1].map((k) => {
      const a = k * 0.43 + th;
      return { k, x: Math.sin(a) * frx * 0.98 + fcx * 0.4, w: Math.cos(a) };
    });
    const nX = Math.sin(th) * frx * 0.95 + fcx * 0.3;
    const mX = Math.sin(th) * frx * 0.88 + fcx * 0.3;
    const my = 19.5 * s;
    const pale = (c) => V.rgb(c).reduce((a, b) => a + b, 0) > 560;
    const browC = pale(f.hair) ? dk(f.hair, 0.38) : dk(f.hair, 0.2);
    const hairPathLong = () => {
      const P = [[0, -ry - 7 * s], [frx + 5 * s, -ry * 0.62], [frx + 8 * s, -2 * s], [frx + 9 * s, 22 * s], [frx + 7 * s, 46 * s], [frx - 3 * s, 54 * s], [frx - 7 * s, 30 * s], [-frx + 7 * s, 30 * s], [-frx + 3 * s, 54 * s], [-frx - 7 * s, 46 * s], [-frx - 9 * s, 22 * s], [-frx - 8 * s, -2 * s], [-frx - 5 * s, -ry * 0.62]];
      return P.map(([x, y]) => [x + fcx - sn * 4 * s, y]);
    };
    V.with2d((ctx) => {
      ctx.translate(f.hx, f.hy);
      ctx.rotate(f.tilt);
      // ---------- hair, back mass (soft-edged)
      const hg = lin(ctx, -frx - 10 * s, -ry, frx + 10 * s, ry * 0.4, [[0, lt(hair, 0.25)], [0.45, hair], [1, dk(hair, 0.55)]]);
      ctx.fillStyle = hg;
      ctx.filter = 'blur(0.8px)';
      if (f.hairT === 'long') {
        const HP = V.smoothPts(hairPathLong(), true, 8).map(([x, y], i, arr) => {
          const dx = x - fcx, dy = y - 10 * s, d = Math.hypot(dx, dy) || 1;
          const w = (V.noise1(i * 0.45 + f.i * 5.3) - 0.5) * 6 * s * V.smooth(-10 * s, 20 * s, y);
          return [x + (dx / d) * w, y + (dy / d) * w];
        });
        pth(ctx, HP);
        ctx.fill();
      } else if (f.hairT === 'bald') {
        ctx.beginPath();
        ctx.ellipse(fcx - sn * 7 * s, 4 * s, frx + 4 * s, ry * 0.78, 0, 0, TAU);
        ctx.fill();
      } else {
        const HB = [];
        for (let k = 0; k < 28; k++) {
          const a = (k / 28) * TAU, j = (V.noise1(k * 0.8 + f.i * 2.3) - 0.5) * 5 * s;
          HB.push([fcx - sn * 5 * s + Math.cos(a) * (frx + 5 * s + j), -5 * s + Math.sin(a) * (ry + 4 * s + j)]);
        }
        spth(ctx, HB, true, 4);
        ctx.fill();
        if (f.hairT === 'curly') {
          const rc = V.rng(70 + f.i);
          for (let k = 0; k < 24; k++) {
            const a = Math.PI * (0.9 + (k / 23) * 1.2);
            ctx.fillStyle = k % 3 ? hair : lt(hair, 0.2);
            ctx.beginPath();
            ctx.arc(fcx - sn * 5 * s + Math.cos(a) * (frx + 5 * s), -5 * s + Math.sin(a) * (ry + 4 * s), (4 + rc() * 2.5) * s, 0, TAU);
            ctx.fill();
          }
        }
      }
      ctx.filter = 'none';
      // ---------- ear (cropped hair only), on the side the head turns away from
      if (f.hairT !== 'long' && Math.abs(sn) > 0.2) {
        const ex = fcx - sg * frx * 0.9;
        ctx.fillStyle = dk(skin, 0.12);
        ctx.beginPath();
        ctx.ellipse(ex, 3 * s, 4.5 * s, 8 * s, -sg * 0.15, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(80,32,14,0.45)';
        ctx.beginPath();
        ctx.ellipse(ex + sg * 1 * s, 3 * s, 2 * s, 4.5 * s, 0, 0, TAU);
        ctx.fill();
      }
      // ---------- face
      const FACE = [[0, -1], [0.55, -0.94], [0.88, -0.63], [0.99, -0.16], [0.95, 0.26], [0.82, 0.56], [0.56, 0.83], [0.26, 0.98], [0, 1.01], [-0.26, 0.98], [-0.56, 0.83], [-0.82, 0.56], [-0.95, 0.26], [-0.99, -0.16], [-0.88, -0.63], [-0.55, -0.94]];
      const facePts = V.smoothPts(FACE.map(([kx, ky]) => {
        const far = Math.sign(kx) === sg ? 1 - 0.1 * Math.abs(sn) : 1;
        return [fcx + kx * frx * far + sn * 5 * s * Math.max(0, ky), ky * ry];
      }), true, 6);
      const faceClip = () => {
        pth(ctx, facePts);
        if (Math.abs(sn) > 0.5) {
          const ex = fcx + sg * frx * 0.93;
          ctx.moveTo(ex, -8 * s);
          ctx.lineTo(ex + sg * 5.5 * s, 7.5 * s);
          ctx.lineTo(ex + sg * 1.5 * s, 10.5 * s);
          ctx.lineTo(ex - sg * 3 * s, 11 * s);
          ctx.lineTo(ex - sg * 3 * s, -8 * s);
          ctx.closePath();
        }
      };
      faceClip();
      ctx.fillStyle = skin;
      ctx.fill('nonzero');
      ctx.save();
      faceClip();
      ctx.clip('nonzero');
      ctx.fillStyle = rad(ctx, fcx - frx * 0.5, -ry * 0.38, 1, fcx - frx * 0.15, -ry * 0.08, ry * 1.32, [[0, 'rgba(255,240,212,0.6)'], [0.42, 'rgba(255,232,200,0.1)'], [0.76, 'rgba(96,42,18,0.25)'], [1, 'rgba(52,20,8,0.62)']]);
      ctx.fillRect(-60 * s, -60 * s, 120 * s, 120 * s);
      ctx.fillStyle = lin(ctx, fcx - frx, 0, fcx + frx + 6 * s, 0, [[0, 'rgba(60,25,10,0)'], [0.48, 'rgba(60,25,10,0)'], [0.8, 'rgba(56,22,8,0.32)'], [1, 'rgba(46,18,6,0.66)']]);
      ctx.fillRect(-60 * s, -60 * s, 120 * s, 120 * s);
      ctx.fillStyle = lin(ctx, 0, ry * 0.4, 0, ry, [[0, 'rgba(60,25,10,0)'], [1, 'rgba(60,25,10,0.4)']]);
      ctx.fillRect(-60 * s, -60 * s, 120 * s, 120 * s);
      for (const e of eyes) {
        if (e.w < 0.25) continue;
        ctx.fillStyle = rad(ctx, e.x, 9 * s, 0, e.x, 9 * s, 9 * s, [[0, 'rgba(196,84,60,0.24)'], [1, 'rgba(196,84,60,0)']]);
        ctx.fillRect(e.x - 10 * s, -1 * s, 20 * s, 20 * s);
      }
      for (const e of eyes) {
        if (e.w < 0.15) continue;
        ctx.fillStyle = rad(ctx, e.x, eyeY - 1 * s, 0, e.x, eyeY - 1 * s, 8.5 * s, [[0, 'rgba(70,32,14,0.45)'], [0.6, 'rgba(70,32,14,0.2)'], [1, 'rgba(70,32,14,0)']]);
        ctx.fillRect(e.x - 10 * s, eyeY - 10 * s, 20 * s, 18 * s);
      }
      // nasolabial folds & forehead lines for the elders
      ctx.lineCap = 'round';
      if (f.old) {
        ctx.strokeStyle = 'rgba(80,34,14,0.32)';
        ctx.lineWidth = 1.3 * s;
        for (const k of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(nX + k * 5 * s, 10 * s);
          ctx.quadraticCurveTo(nX + k * 9 * s, 16 * s, mX + k * 8 * s, 23 * s);
          ctx.stroke();
        }
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(fcx - 9 * s + sn * 4 * s, (-17 - k * 3.2) * s);
          ctx.quadraticCurveTo(fcx + sn * 6 * s, (-18.5 - k * 3.2) * s, fcx + 9 * s + sn * 6 * s, (-17 - k * 3.2) * s);
          ctx.stroke();
        }
      }
      ctx.restore();
      // ---------- beard
      if (f.beard !== 'none') {
        const long = f.beard === 'long';
        const B = [[-0.98, 1], [-0.95, 15], [-0.72, 29], [-0.38, long ? 48 : 37], [0, long ? 62 : 41], [0.38, long ? 48 : 37], [0.72, 29], [0.95, 15], [0.98, 1], [0.68, 9], [0.42, 15], [0.2, 14.5], [0, 13.5], [-0.2, 14.5], [-0.42, 15], [-0.68, 9]].map(([kx, y]) => [tx(kx * frx) + fcx * 0.3, y * s]);
        ctx.save();
        ctx.filter = 'blur(0.7px)';
        ctx.fillStyle = lin(ctx, -frx, 0, frx, 0, [[0, lt(f.beardC, 0.25)], [0.5, f.beardC], [1, dk(f.beardC, 0.55)]]);
        spth(ctx, B, true, 6);
        ctx.fill();
        ctx.filter = 'none';
        ctx.fillStyle = lin(ctx, 0, 10 * s, 0, (long ? 62 : 42) * s, [[0, 'rgba(30,14,6,0)'], [1, 'rgba(30,14,6,0.4)']]);
        spth(ctx, B, true, 6);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = dk(f.beardC, 0.12);
        ctx.lineWidth = 3.2 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(mX - 8.5 * s * (0.5 + 0.5 * cs), 18.5 * s);
        ctx.quadraticCurveTo(mX, 13.5 * s, mX + 8.5 * s * (0.5 + 0.5 * cs), 18.5 * s);
        ctx.stroke();
      }
      // ---------- eyes
      const wide = f.brow === 'up';
      for (const e of eyes) {
        if (e.w < 0.2) continue;
        const ew = 4.3 * s * Math.max(0.35, e.w), eh = (wide ? 2.9 : 2.3) * s;
        const look = -sn * ew * 0.42;
        // lid crease
        ctx.strokeStyle = 'rgba(80,36,16,0.38)';
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.ellipse(e.x, eyeY - 0.6 * s, ew * 1.1, eh * 1.75, 0, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        if (f.eyes === 'down' || f.eyes === 'half') {
          const down = f.eyes === 'down';
          // big smooth upper lid (lit), then the lash line curving down; a sliver of iris under it for 'half'
          ctx.fillStyle = ra(lt(skin, 0.12), 0.8);
          ctx.beginPath();
          ctx.ellipse(e.x, eyeY - 0.4 * s, ew * 1.05, 2.6 * s, 0, 0, TAU);
          ctx.fill();
          if (!down) {
            ctx.fillStyle = '#d8c8ae';
            ctx.beginPath();
            ctx.ellipse(e.x, eyeY + 1.0 * s, ew * 0.95, 1.7 * s, 0, 0, Math.PI);
            ctx.fill();
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(e.x, eyeY + 1.0 * s, ew * 0.95, 1.7 * s, 0, 0, Math.PI);
            ctx.clip();
            ctx.fillStyle = '#2a1a10';
            ctx.beginPath();
            ctx.arc(e.x + look, eyeY + 1.4 * s, 2.2 * s, 0, TAU);
            ctx.fill();
            ctx.restore();
          }
          ctx.strokeStyle = 'rgba(46,18,8,0.95)';
          ctx.lineWidth = 1.7 * s;
          ctx.beginPath();
          ctx.moveTo(e.x - ew * 1.05, eyeY + 0.4 * s);
          ctx.quadraticCurveTo(e.x, eyeY + (down ? 3.2 : 2.0) * s, e.x + ew * 1.05, eyeY + 0.4 * s);
          ctx.stroke();
          ctx.strokeStyle = ra(dk(skin, 0.4), 0.6);
          ctx.lineWidth = 1.1 * s;
          ctx.beginPath();
          ctx.ellipse(e.x, eyeY - 0.6 * s, ew * 1.05, 2.8 * s, 0, Math.PI * 1.12, Math.PI * 1.88);
          ctx.stroke();
        } else {
          ctx.fillStyle = lin(ctx, e.x - ew, 0, e.x + ew, 0, [[0, '#d6c6a8'], [1, '#b49e80']]);
          ctx.beginPath();
          ctx.ellipse(e.x, eyeY, ew, eh, 0, 0, TAU);
          ctx.fill();
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(e.x, eyeY, ew, eh, 0, 0, TAU);
          ctx.clip();
          ctx.fillStyle = '#4a3020';
          ctx.beginPath();
          ctx.arc(e.x + look, eyeY + 0.2 * s, 2.15 * s, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#150b05';
          ctx.beginPath();
          ctx.arc(e.x + look, eyeY + 0.2 * s, 1.35 * s, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(70,32,14,0.45)';
          ctx.fillRect(e.x - ew, eyeY - eh, ew * 2, eh * 0.85);
          ctx.restore();
          ctx.fillStyle = 'rgba(255,250,236,0.92)';
          ctx.fillRect(e.x + look - 1.3 * s, eyeY - 1.2 * s, 1.1 * s, 1.1 * s);
          ctx.strokeStyle = 'rgba(46,18,8,0.95)';
          ctx.lineWidth = 1.6 * s;
          ctx.beginPath();
          ctx.ellipse(e.x, eyeY + 0.4 * s, ew * 1.08, eh * 1.2, 0, Math.PI * 1.04, Math.PI * 1.96);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(80,36,16,0.38)';
          ctx.lineWidth = 1 * s;
          ctx.beginPath();
          ctx.ellipse(e.x, eyeY - 0.2 * s, ew * 0.95, eh * 1.1, 0, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();
        }
      }
      // ---------- brows
      for (const e of eyes) {
        if (e.w < 0.2) continue;
        const half = 5.8 * s * Math.max(0.45, e.w);
        let type = f.brow;
        if (type === 'skeptic') type = e.k < 0 ? 'up' : 'down';
        const inner = e.k < 0 ? 1 : -1;
        const yy = { up: [-13.5, -16, -12.5], down: [-8.6, -10.2, -11], sad: [-13, -11.6, -9.4], calm: [-10.2, -11.4, -10] }[type] || [-10, -11, -10];
        const xi = e.x + inner * half, xo = e.x - inner * half;
        ctx.strokeStyle = browC;
        ctx.lineWidth = 2.3 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(xi, yy[0] * s);
        ctx.quadraticCurveTo(e.x, yy[1] * s, xo, yy[2] * s);
        ctx.stroke();
      }
      // ---------- nose
      ctx.strokeStyle = 'rgba(86,38,16,0.52)';
      ctx.lineWidth = 2.3 * s;
      ctx.beginPath();
      ctx.moveTo(nX + 2 * s, -5 * s);
      ctx.quadraticCurveTo(nX + (2.6 + sn * 2) * s, 3 * s, nX + (2.8 + sn * 3) * s, 9 * s);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,236,206,0.55)';
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(nX - 0.8 * s, -6 * s);
      ctx.lineTo(nX - 0.4 * s + sn * 2 * s, 7 * s);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,215,0.5)';
      ctx.beginPath();
      ctx.arc(nX + sn * 3 * s, 8.2 * s, 1.5 * s, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(72,30,12,0.62)';
      ctx.beginPath();
      ctx.ellipse(nX + sn * 3.5 * s + 1 * s, 10.8 * s, 3.1 * s, 1.25 * s, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(86,38,16,0.4)';
      ctx.lineWidth = 1.1 * s;
      ctx.beginPath();
      ctx.arc(nX + sn * 3 * s + 4.5 * s, 9.5 * s, 2.2 * s, -1.2, 1.4);
      ctx.stroke();
      // ---------- mouth
      const lip = 'rgba(140,56,40,0.78)';
      if (f.expr === 'O' || f.expr === 'me') {
        const k = f.expr === 'me' ? 0.75 : 1;
        ctx.fillStyle = '#2e0f0a';
        ctx.beginPath();
        ctx.ellipse(mX, my + 1 * s, 3.5 * s * k, 5 * s * k, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = lip;
        ctx.lineWidth = 1.4 * s;
        ctx.stroke();
      } else if (f.expr === 'open') {
        ctx.fillStyle = '#2e0f0a';
        ctx.beginPath();
        ctx.ellipse(mX, my + 0.5 * s, 5.4 * s, 3.3 * s, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(232,222,200,0.85)';
        ctx.fillRect(mX - 3.6 * s, my - 2.4 * s, 7.2 * s, 1.4 * s);
        ctx.strokeStyle = lip;
        ctx.lineWidth = 1.3 * s;
        ctx.beginPath();
        ctx.ellipse(mX, my + 0.5 * s, 5.4 * s, 3.3 * s, 0, 0, TAU);
        ctx.stroke();
      } else if (f.expr === 'whisper') {
        ctx.fillStyle = '#2e0f0a';
        ctx.beginPath();
        ctx.ellipse(mX + sg * 2.5 * s, my, 2.5 * s, 2.3 * s, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = lip;
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();
      } else {
        const curve = f.expr === 'sad' ? 1.6 : f.expr === 'calm' ? 0.6 : 0;
        ctx.fillStyle = 'rgba(150,62,44,0.55)';
        ctx.beginPath();
        ctx.ellipse(mX, my + 2.2 * s, 4.2 * s * (0.6 + 0.4 * cs), 1.6 * s, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(78,28,16,0.88)';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(mX - 5.6 * s * (0.6 + 0.4 * cs), my + curve * s);
        ctx.quadraticCurveTo(mX, my - curve * 0.5 * s, mX + 5.6 * s * (0.6 + 0.4 * cs), my + curve * s);
        ctx.stroke();
      }
      if (f.beard === 'none') {
        ctx.fillStyle = 'rgba(70,30,12,0.22)';
        ctx.beginPath();
        ctx.ellipse(mX, my + 7 * s, 5 * s, 1.6 * s, 0, 0, TAU);
        ctx.fill();
      }
      // ---------- hair, front cap
      if (f.hairT !== 'bald') {
        const hl = f.hairT === 'long' ? [-0.3, -0.62, -0.58] : [-0.4, -0.7, -0.66];
        const C = [];
        for (let k = 0; k <= 16; k++) {
          const a = Math.PI + (k / 16) * Math.PI;
          const j = (V.noise1(k * 0.9 + f.i * 3.7) - 0.5) * 4 * s;
          C.push([fcx - sn * 2 * s + Math.cos(a) * (frx + 2.5 * s + j), -2 * s + Math.sin(a) * (ry + 3 * s + j)]);
        }
        C.push([tx(frx * 0.82) + fcx * 0.3, hl[0] * ry]);
        C.push([tx(frx * 0.4) + fcx * 0.3, hl[1] * ry]);
        C.push([tx(0) + fcx * 0.3 + sg * 2 * s, hl[2] * ry]);
        C.push([tx(-frx * 0.4) + fcx * 0.3, hl[1] * ry]);
        C.push([tx(-frx * 0.82) + fcx * 0.3, hl[0] * ry]);
        ctx.fillStyle = hg;
        spth(ctx, C, true, 5);
        ctx.fill();
        ctx.fillStyle = lin(ctx, 0, -ry - 4 * s, 0, -ry * 0.35, [[0, ra(lt(hair, 0.4), 0.55)], [1, ra(hair, 0)]]);
        spth(ctx, C, true, 5);
        ctx.fill();
        if (f.hairT === 'long') {
          // locks falling past the temples and cheeks, parted in the middle
          for (const k of [-1, 1]) {
            const vis = k * sn > 0.35 ? 0.55 : 1; // the far side lock is mostly hidden by the turned cheek
            const ox = fcx + k * frx;
            const L = [[fcx + k * frx * 0.15 + sg * 2 * s, -ry * 0.62], [ox + k * 3 * s, -ry * 0.45], [ox + k * 5 * s, 0], [ox + k * 6 * s, 24 * s], [ox + k * 3 * s, 40 * s], [ox - k * 3 * s * vis, 26 * s], [ox - k * 4.5 * s * vis, 4 * s], [ox - k * 6 * s * vis, -ry * 0.35]];
            ctx.fillStyle = k < 0 ? lin(ctx, ox - 6 * s, 0, ox + 6 * s, 0, [[0, lt(hair, 0.25)], [1, hair]]) : lin(ctx, ox - 6 * s, 0, ox + 6 * s, 0, [[0, hair], [1, dk(hair, 0.5)]]);
            spth(ctx, L, true, 6);
            ctx.fill();
          }
          ctx.strokeStyle = ra(dk(hair, 0.5), 0.8);
          ctx.lineWidth = 1.4 * s;
          ctx.beginPath();
          ctx.moveTo(fcx + sg * 2 * s, -ry - 2 * s);
          ctx.lineTo(fcx + sg * 2 * s + sn * 3 * s, -ry * 0.62);
          ctx.stroke();
        }
        // shadow the hair casts on the forehead
        ctx.save();
        faceClip();
        ctx.clip('nonzero');
        ctx.filter = `blur(${(2 * s).toFixed(1)}px)`;
        ctx.strokeStyle = 'rgba(60,25,10,0.35)';
        ctx.lineWidth = 4 * s;
        ctx.beginPath();
        ctx.moveTo(C[17][0], C[17][1] + 2 * s);
        for (let k = 18; k < C.length; k++) ctx.lineTo(C[k][0], C[k][1] + 2 * s);
        ctx.stroke();
        ctx.restore();
        if (f.hairT === 'curly') {
          const rc = V.rng(170 + f.i);
          for (let k = 0; k < 9; k++) {
            const x = tx(V.lerp(-frx * 0.8, frx * 0.8, k / 8)) + fcx * 0.3, y = hl[1] * ry - 2 * s + rc() * 3 * s;
            ctx.fillStyle = k % 2 ? lt(hair, 0.15) : dk(hair, 0.2);
            ctx.beginPath();
            ctx.arc(x, y, 3.5 * s, 0, TAU);
            ctx.fill();
          }
        }
      } else {
        ctx.fillStyle = rad(ctx, fcx - frx * 0.3, -ry * 0.75, 0, fcx - frx * 0.3, -ry * 0.75, 12 * s, [[0, 'rgba(255,240,215,0.5)'], [1, 'rgba(255,240,215,0)']]);
        ctx.fillRect(fcx - frx, -ry - 5 * s, frx * 2, 24 * s);
      }
      if (f.dark) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = `rgba(28,14,6,${f.dark})`;
        ctx.fillRect(-90 * s, -90 * s, 180 * s, 180 * s);
        ctx.globalCompositeOperation = 'source-over';
      }
    });
    // ---- brush: hair & beard strands (fine liner in near-hair tones), never across the mouth
    const r = V.rng(5000 + f.i * 13);
    const hl = lt(hair, pale(hair) ? 0.25 : 0.3), hd = pale(hair) ? dk(hair, 0.25) : lt(hair, 0.08);
    const strand = (pts, col, w, k) => V.ink(pts.map(([x, y]) => hp(x, y)), { brush: 'ren_hair', w, color: col, seed: 6000 + f.i * 100 + k, taper: [6, 10], wob: 0.4, smooth: true, step: 3 });
    if (f.hairT === 'long') {
      for (let k = 0; k < 18; k++) {
        const side = k < 9 ? -1 : 1, j = (k % 9) / 8;
        const x0 = fcx + (j - 0.5) * frx * 0.5 * side + side * frx * 0.15;
        strand([[x0, -ry - 3 * s], [fcx + side * (frx + (3 + j * 4) * s), -ry * 0.25], [fcx + side * (frx + (5 + j * 3) * s) - sn * 4 * s, (24 + r() * 22) * s]], side < 0 ? hl : hd, 0.5 + r() * 0.35, k);
      }
    } else if (f.hairT === 'short' || f.hairT === 'curly') {
      for (let k = 0; k < 13; k++) {
        const x0 = fcx + (k / 12 - 0.5) * frx * 1.6;
        strand([[x0 * 0.5, -ry - 3 * s], [x0 * 0.95, -ry * 0.82], [x0 * 1.1 + (r() - 0.5) * 3, -ry * 0.58]], x0 < fcx ? hl : hd, 0.45 + r() * 0.3, k);
      }
    } else {
      for (let k = 0; k < 8; k++) {
        const side = k < 4 ? -1 : 1;
        const y0 = -6 * s + (k % 4) * 4 * s;
        strand([[fcx + side * (frx - 1 * s), y0], [fcx + side * (frx + 3 * s), y0 + 8 * s], [fcx + side * (frx + 1 * s), y0 + 16 * s]], side < 0 ? hl : hd, 0.55, k);
      }
    }
    if (f.beard !== 'none') {
      const long = f.beard === 'long';
      const bl = lt(f.beardC, 0.32), bd = pale(f.beardC) ? dk(f.beardC, 0.22) : lt(f.beardC, 0.12);
      for (let k = 0; k < 14; k++) {
        const kx = (k / 13 - 0.5) * 1.8;
        if (Math.abs(kx) < 0.5) {
          // under the lower lip only
          const x0 = tx(kx * frx * 0.6) + fcx * 0.3;
          strand([[x0, my + 6 * s], [x0 + (r() - 0.5) * 4 * s, my + 14 * s], [x0 * 0.9 + (r() - 0.5) * 3 * s, (long ? 56 : 37) * s]], kx < 0 ? bl : bd, 0.32 + r() * 0.15, 40 + k);
        } else {
          const x0 = tx(kx * frx * 0.98) + fcx * 0.3, x1 = tx(kx * frx * 0.45) + fcx * 0.3;
          strand([[x0, (6 + Math.abs(kx) * 2) * s], [V.lerp(x0, x1, 0.4) + (r() - 0.5) * 4 * s, (24 + (long ? 10 : 2)) * s], [x1, (long ? 52 : 34) * s]], kx < 0 ? bl : bd, 0.32 + r() * 0.15, 40 + k);
        }
      }
    }
  }

  function paintFigure(f) {
    paintTorso(f);
    headPaint(f);
  }

  // ================================================================== AGEING LAYERS (pure Canvas2D, made once)
  function makeAgeing() {
    S.crack = V.gfx('ren_crack', W, H, (ctx) => {
      const r = V.rng(4242);
      const sp = 17, nx = Math.ceil(W / sp) + 2, ny = Math.ceil(H / sp) + 2;
      const P = [];
      for (let j = 0; j < ny; j++) {
        P.push([]);
        for (let i = 0; i < nx; i++) P[j].push([(i - 0.5) * sp + (r() - 0.5) * sp * 1.05, (j - 0.5) * sp + (r() - 0.5) * sp * 1.05]);
      }
      const dark = [], light = [];
      const seg = (a, b) => {
        const den = V.clamp((fbm(a[0] / 260 + 4.2, a[1] / 260 + 1.3) - 0.28) * 1.7);
        let al = 0.05 + 0.3 * den;
        if (a[1] > 400 && a[1] < 720) al *= 0.6; // keep faces/hands readable
        const mx = (a[0] + b[0]) / 2 + (r() - 0.5) * 4.5, my = (a[1] + b[1]) / 2 + (r() - 0.5) * 4.5;
        const bucket = Math.min(5, Math.floor(al * 12));
        (dark[bucket] = dark[bucket] || []).push([a, [mx, my], b]);
        (light[bucket] = light[bucket] || []).push([a, [mx, my], b]);
      };
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const p = P[j][i];
          if (i + 1 < nx && r() < 0.78) seg(p, P[j][i + 1]);
          if (j + 1 < ny && r() < 0.78) seg(p, P[j + 1][i]);
          if (i + 1 < nx && j + 1 < ny && r() < 0.12) seg(p, P[j + 1][i + 1]);
        }
      }
      for (let b = 0; b < 6; b++) {
        if (!dark[b]) continue;
        const al = (b + 0.5) / 12;
        ctx.strokeStyle = `rgba(255,244,222,${al * 0.38})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (const [a, m, c] of light[b]) {
          ctx.moveTo(a[0] + 1, a[1] + 1.2);
          ctx.lineTo(m[0] + 1, m[1] + 1.2);
          ctx.lineTo(c[0] + 1, c[1] + 1.2);
        }
        ctx.stroke();
        ctx.strokeStyle = `rgba(30,17,6,${al})`;
        ctx.lineWidth = 0.95;
        ctx.beginPath();
        for (const [a, m, c] of dark[b]) {
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(m[0], m[1]);
          ctx.lineTo(c[0], c[1]);
        }
        ctx.stroke();
      }
    });
    S.loss = V.gfx('ren_loss', 960, 540, (ctx) => {
      const img = ctx.createImageData(960, 540), d = img.data, r = V.rng(99);
      for (let y = 0; y < 540; y++) {
        for (let x = 0; x < 960; x++) {
          const X = x * 2, Y = y * 2;
          const n = fbm(X / 60 + 3.1, Y / 60 + 7.7) * 0.6 + V.noise2(X / 9 + 1.1, Y / 9 + 2.2) * 0.25 + V.noise2(X / 3.5, Y / 3.5) * 0.15;
          let thr = 0.75;
          thr -= 0.05 * V.smooth(840, 1080, Y);
          thr -= 0.05 * V.smooth(500, 960, Math.abs(X - 960));
          if (Y > 400 && Y < 720) thr += 0.1;
          if (Y < 300 && X < 700) thr += 0.06; // keep the year corner calm
          const i = (y * 960 + x) * 4;
          if (n > thr) {
            const k = V.smooth(thr, thr + 0.014, n);
            const v = V.noise2(X / 4.5, Y / 4.5);
            d[i] = 196 + v * 26;
            d[i + 1] = 184 + v * 22;
            d[i + 2] = 156 + v * 18;
            d[i + 3] = 255 * 0.82 * k;
          } else if (n > thr - 0.02) {
            d[i] = 58;
            d[i + 1] = 38;
            d[i + 2] = 20;
            d[i + 3] = 255 * 0.32 * V.smooth(thr - 0.02, thr, n);
          }
          if (r() < 0.0022 && !(Y > 400 && Y < 720)) {
            d[i] = 214; d[i + 1] = 203; d[i + 2] = 178; d[i + 3] = 190;
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    });
    S.stain = V.gfx('ren_stain', 480, 270, (ctx) => {
      const img = ctx.createImageData(480, 270), d = img.data;
      for (let y = 0; y < 270; y++) {
        for (let x = 0; x < 480; x++) {
          const X = x * 4, Y = y * 4;
          const n = fbm(X / 420 + 1.3, Y / 420 + 5.1);
          const v = 255 - 62 * V.smooth(0.5, 0.78, n) - 26 * V.noise2(X / 70, Y / 70);
          const i = (y * 480 + x) * 4;
          d[i] = v; d[i + 1] = v * 0.96; d[i + 2] = v * 0.88; d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    });
    // varnish tint x vignette (one multiply layer)
    S.tone = V.gfx('ren_tone', 480, 270, (ctx) => {
      ctx.fillStyle = '#f2e2c0';
      ctx.fillRect(0, 0, 480, 270);
      const g = ctx.createRadialGradient(240, 128, 70, 240, 140, 290);
      g.addColorStop(0, 'rgba(36,20,8,0)');
      g.addColorStop(0.55, 'rgba(36,20,8,0.12)');
      g.addColorStop(1, 'rgba(36,20,8,0.7)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 480, 270);
    });
    S.haze = V.gfx('ren_haze', 8, 8, (ctx) => {
      ctx.fillStyle = '#b8a888';
      ctx.fillRect(0, 0, 8, 8);
    });
  }

  // ================================================================== PER-FRAME PARTS
  function figState(f, t) {
    const aL = V.G.arm(t, 0, { off: f.off }), aR = V.G.arm(t, 1, { off: f.off });
    const pulse = V.G.pulse(t + f.off * V.G.beat);
    const ang = (aL.y - aR.y) * -0.5 * (f.chest ? 0.03 : 0.024);
    const dy = 3.5 * pulse;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const T = (x, y) => {
      const dx = x - f.x, dyy = y - PIVY;
      return [f.x + dx * ca - dyy * sa, PIVY + dx * sa + dyy * ca + dy];
    };
    const sides = [aL, aR].map((a, side) => {
      const sg = side ? 1 : -1;
      const h = (a.y + 1) / 2;
      const g = f.g;
      const S0 = T(f.nx + sg * f.sw * 0.72, f.ysh + 21 * f.s);
      const E = [f.x + sg * g.ex, g.ey + (f.chest ? dy : 0)];
      const Wr = [f.x + sg * V.lerp(g.w0[0], g.w1[0], h), V.lerp(g.w0[1], g.w1[1], h)];
      return { side, sg, h, S: S0, E, Wr, col: f.col[side] };
    });
    return { ang, dy, sides };
  }

  // a cloth sleeve: sampled along its length, width swells where the cloth gathers, edges wobble a little; lit from the upper left
  function sleeve(ctx, A, B, wa, wb, col, seed, bulge = 0.14, plain = false) {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    let nx = -uy, ny = ux;
    if (nx * -0.6 + ny * -0.8 < 0) { nx = -nx; ny = -ny; } // +n = lit side
    const N = 10, left = [], right = [];
    for (let i = 0; i <= N; i++) {
      const q = i / N;
      const w = V.lerp(wa, wb, q) * (1 + bulge * Math.sin(Math.PI * q)) * 0.5;
      const wl = w * (1 + 0.07 * (V.noise1(seed + q * 3.1) - 0.5)), wr = w * (1 + 0.1 * (V.noise1(seed + 17 + q * 2.7) - 0.5));
      const px = A[0] + dx * q, py = A[1] + dy * q;
      left.push([px + nx * wl, py + ny * wl]);
      right.push([px - nx * wr, py - ny * wr]);
    }
    const P = left.slice();
    for (let k = 1; k < 9; k++) {
      const an = (k / 9) * Math.PI, c = Math.cos(an), sn = Math.sin(an);
      P.push([B[0] + ((nx * c + ux * sn) * wb) / 2, B[1] + ((ny * c + uy * sn) * wb) / 2]);
    }
    for (let i = N; i >= 0; i--) P.push(right[i]);
    for (let k = 1; k < 9; k++) {
      const an = (k / 9) * Math.PI, c = Math.cos(an), sn = Math.sin(an);
      P.push([A[0] + ((-nx * c - ux * sn) * wa) / 2, A[1] + ((-ny * c - uy * sn) * wa) / 2]);
    }
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, wm = ((wa + wb) / 2) * 1.07;
    pth(ctx, P);
    ctx.fillStyle = lin(ctx, mx + (nx * wm) / 2, my + (ny * wm) / 2, mx - (nx * wm) / 2, my - (ny * wm) / 2, [[0, lt(col, 0.45)], [0.2, lt(col, 0.16)], [0.5, col], [0.82, dk(col, 0.5)], [1, dk(col, 0.68)]]);
    ctx.filter = 'blur(0.6px)'; // sfumato: no hard vector edge on the cloth
    ctx.fill();
    ctx.filter = 'none';
    // soft fold troughs running along the sleeve + Leonardo's left-handed hatching in the shade
    ctx.save();
    pth(ctx, P);
    ctx.clip();
    if (S.hatchPat) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(A[0] - nx * wa, A[1] - ny * wa);
      ctx.lineTo(B[0] - nx * wb, B[1] - ny * wb);
      ctx.lineTo(B[0] + nx * wb * 0.05 + ux * wb, B[1] + ny * wb * 0.05 + uy * wb);
      ctx.lineTo(A[0] + nx * wa * 0.05 - ux * wa, A[1] + ny * wa * 0.05 - uy * wa);
      ctx.closePath();
      ctx.clip();
      ctx.globalAlpha = plain ? 0.2 : 0.34;
      ctx.fillStyle = S.hatchPat;
      ctx.fillRect(Math.min(A[0], B[0]) - 40, Math.min(A[1], B[1]) - 40, Math.abs(dx) + 80, Math.abs(dy) + 80);
      ctx.restore();
    }
    if (plain) {
      ctx.restore();
      return { nx, ny, ux, uy };
    }
    const f0 = ctx.filter;
    ctx.filter = 'blur(1.5px)';
    ctx.strokeStyle = ra(dk(col, 0.6), 0.45);
    ctx.lineWidth = Math.max(2, wm * 0.12);
    ctx.beginPath();
    ctx.moveTo(A[0] - nx * wa * 0.12, A[1] - ny * wa * 0.12);
    ctx.quadraticCurveTo(mx - nx * wm * 0.02 + ux * 4, my - ny * wm * 0.02 + uy * 4, B[0] - nx * wb * 0.18, B[1] - ny * wb * 0.18);
    ctx.stroke();
    ctx.strokeStyle = ra(lt(col, 0.5), 0.35);
    ctx.lineWidth = Math.max(1.5, wm * 0.08);
    ctx.beginPath();
    ctx.moveTo(A[0] + nx * wa * 0.22, A[1] + ny * wa * 0.22);
    ctx.quadraticCurveTo(mx + nx * wm * 0.3, my + ny * wm * 0.3, B[0] + nx * wb * 0.2, B[1] + ny * wb * 0.2);
    ctx.stroke();
    ctx.filter = f0;
    ctx.restore();
    ctx.strokeStyle = ra(dk(col, 0.75), 0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(right[0][0], right[0][1]);
    for (let i = 1; i <= N; i++) ctx.lineTo(right[i][0], right[i][1]);
    ctx.stroke();
    return { nx, ny, ux, uy };
  }

  // palm-up open hand seen from the front & above: fingers fan toward the viewer, thumb out to the side (x: thumb side = +)
  const FING = [[-7.2, 9.5, 106, 9.5], [-2.8, 11.2, 98, 11.5], [1.8, 11.6, 89, 12.2], [6.2, 10.4, 78, 11]];
  const PALM = [[-8.5, -1], [7.5, -1], [10.5, 3.5], [9.2, 10.4], [2, 12.6], [-5, 12.2], [-9.6, 9], [-10, 3]];
  function hand(ctx, W0, sg, s, skin) {
    const k = 1.04 * s;
    const X = (x) => W0[0] + x * sg * k, Y = (y) => W0[1] + y * k;
    const edge = 'rgba(84,36,16,0.78)';
    ctx.lineCap = 'round';
    const digit = (bx, by, ang, len, w) => {
      const an = (ang * Math.PI) / 180, ex = bx + Math.cos(an) * len, ey = by + Math.sin(an) * len;
      ctx.strokeStyle = edge;
      ctx.lineWidth = (w + 1.3) * k;
      ctx.beginPath();
      ctx.moveTo(X(bx), Y(by));
      ctx.lineTo(X(ex), Y(ey));
      ctx.stroke();
      ctx.strokeStyle = lin(ctx, 0, Y(by), 0, Y(ey), [[0, lt(skin, 0.2)], [1, dk(skin, 0.12)]]);
      ctx.lineWidth = w * k;
      ctx.beginPath();
      ctx.moveTo(X(bx), Y(by));
      ctx.lineTo(X(ex), Y(ey));
      ctx.stroke();
      ctx.fillStyle = ra(lt(skin, 0.45), 0.7);
      ctx.beginPath();
      ctx.arc(X(ex - Math.cos(an) * 1.2 - 0.5), Y(ey - Math.sin(an) * 1.2), 1.1 * k, 0, TAU);
      ctx.fill();
    };
    for (const [bx, by, ang, len] of FING) digit(bx, by, ang, len, 3.7);
    digit(8.5, 3.5, -24, 10.5, 4.4); // thumb
    pth(ctx, PALM.map(([x, y]) => [X(x), Y(y)]));
    ctx.fillStyle = lin(ctx, 0, Y(-2), 0, Y(13), [[0, lt(skin, 0.24)], [0.6, skin], [1, dk(skin, 0.18)]]);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const i of [0, 7, 6, 5]) ctx.lineTo(X(PALM[i][0]), Y(PALM[i][1]));
    ctx.stroke();
    // the cupped palm catches the light
    ctx.fillStyle = rad(ctx, X(0), Y(5), 0, X(0), Y(5.5), 10 * k, [[0, ra(lt(skin, 0.62), 0.95)], [1, ra(lt(skin, 0.3), 0)]]);
    ctx.beginPath();
    ctx.ellipse(X(0.5), Y(5.5), 8.5 * k, 5.2 * k, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,56,30,0.55)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(X(-7), Y(7.5));
    ctx.quadraticCurveTo(X(0), Y(4.6), X(8.5), Y(7));
    ctx.moveTo(X(5), Y(1));
    ctx.quadraticCurveTo(X(2.5), Y(6), X(4), Y(10.5));
    ctx.stroke();
  }

  // table silhouette (top + front drape + ends): figures are hidden only where the table is
  function tableClip(ctx) {
    ctx.beginPath();
    ctx.rect(-300, -300, W + 600, H + 600);
    ctx.moveTo(TB.xb0, TB.yb);
    ctx.lineTo(TB.xb1, TB.yb);
    ctx.lineTo(TB.xf1, TB.yf);
    for (let x = TB.xf1; x >= TB.xf0; x -= 12) ctx.lineTo(x, hemY(x));
    ctx.lineTo(TB.xf0, hemY(TB.xf0));
    ctx.lineTo(TB.xf0, TB.yf);
    ctx.closePath();
    ctx.clip('evenodd');
  }

  function armsOf(ctx, grp, st) {
    // cast shadows: arms on the torsos, hands & forearms on the linen
    ctx.filter = 'blur(5px)';
    ctx.lineCap = 'round';
    for (const f of grp) {
      for (const sd of st[f.i].sides) {
        ctx.strokeStyle = 'rgba(16,8,3,0.32)';
        ctx.lineWidth = 24 * f.s;
        ctx.beginPath();
        ctx.moveTo(sd.S[0] - sd.sg * 6 * f.s + 8, sd.S[1] + 6);
        ctx.lineTo(sd.E[0] - sd.sg * 6 * f.s + 8, sd.E[1] - 10);
        ctx.stroke();
        if (f.chest) continue;
        const h = sd.h, yT = f.g.w0[1] + 10 * f.s;
        ctx.fillStyle = `rgba(70,50,30,${0.45 - 0.2 * h})`;
        ctx.beginPath();
        ctx.ellipse(sd.Wr[0] + 6 + 14 * h, yT, (17 + 7 * h) * f.s, (4.5 + 2 * h) * f.s, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(70,50,30,0.25)';
        ctx.beginPath();
        ctx.ellipse(sd.E[0] + 6, sd.E[1] + 12, 17 * f.s, 5 * f.s, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.filter = 'none';
    for (const f of grp) {
      const s = f.s;
      for (const sd of st[f.i].sides) {
        const { S: S0, E, Wr } = sd;
        sleeve(ctx, S0, E, 29 * s, 23 * s, sd.col, f.i * 7 + sd.side * 3, 0.08);
        const dx = Wr[0] - E[0], dy = Wr[1] - E[1], L = Math.hypot(dx, dy) || 1;
        const C = [Wr[0] - (dx / L) * 2 * s, Wr[1] - (dy / L) * 2 * s - 3 * s];
        let o;
        if (f.bare) {
          const M = [V.lerp(E[0], C[0], 0.3), V.lerp(E[1], C[1], 0.3)];
          sleeve(ctx, M, C, 15 * s, 12 * s, f.skin, f.i * 7 + sd.side * 3 + 90, 0.06, true);
          o = sleeve(ctx, E, M, 22 * s, 25 * s, sd.col, f.i * 7 + sd.side * 3 + 50, 0.2);
          ctx.strokeStyle = lt(sd.col, 0.25);
          ctx.lineWidth = 5 * s;
          ctx.beginPath();
          ctx.moveTo(M[0] - o.nx * 12 * s, M[1] - o.ny * 12 * s);
          ctx.lineTo(M[0] + o.nx * 12 * s, M[1] + o.ny * 12 * s);
          ctx.stroke();
          ctx.strokeStyle = ra(dk(sd.col, 0.6), 0.7);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          o = sleeve(ctx, E, C, 21 * s, 21 * s, sd.col, f.i * 7 + sd.side * 3 + 50, 0.16);
        }
        ctx.strokeStyle = ra(dk(sd.col, 0.6), 0.55);
        ctx.lineWidth = 1.6 * s;
        for (let k = 0; k < 2; k++) {
          const q = 0.18 + k * 0.16, px = V.lerp(E[0], C[0], q), py = V.lerp(E[1], C[1], q);
          ctx.beginPath();
          ctx.moveTo(px + o.nx * 9 * s, py + o.ny * 9 * s);
          ctx.quadraticCurveTo(px + o.ux * 5 * s, py + o.uy * 5 * s, px - o.nx * 10 * s, py - o.ny * 10 * s);
          ctx.stroke();
        }
        if (!f.bare) {
          ctx.strokeStyle = '#dcd2bd';
          ctx.lineWidth = 4.5 * s;
          ctx.beginPath();
          ctx.moveTo(C[0] - o.nx * 9.5 * s, C[1] - o.ny * 9.5 * s);
          ctx.lineTo(C[0] + o.nx * 9.5 * s, C[1] + o.ny * 9.5 * s);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(120,100,70,0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        hand(ctx, [Wr[0], Wr[1] + 1 * s], sd.sg, s, f.skin);
      }
    }
    ctx.filter = 'none';
  }

  // figures painted back-to-front in depth groups: each group = torsos/heads (cut by the table) + its arms; then that group's brush highlights
  function drawGroups(t) {
    const st = FIG.map((f) => figState(f, t));
    for (const z of [0, 1, 2, 3]) {
      const grp = ORDER.filter((f) => f.z === z);
      V.with2d((ctx) => {
        if (!S.hatchPat && S.tile) S.hatchPat = ctx.createPattern(S.tile.canvas, 'repeat');
        zctx(ctx);
        ctx.save();
        tableClip(ctx);
        for (const f of grp) {
          ctx.save();
          ctx.translate(f.x, PIVY + st[f.i].dy);
          ctx.rotate(st[f.i].ang);
          ctx.drawImage(f.spr.drawingContext.canvas, f.rx0 - f.x, f.ry0 - PIVY);
          ctx.restore();
        }
        ctx.restore();
        armsOf(ctx, grp, st);
      });
      zpush();
      for (const f of grp) {
        for (const sd of st[f.i].sides) {
          const { S: S0, E, Wr } = sd;
          const lx = -0.6 * 7 * f.s, ly = -0.8 * 7 * f.s;
          V.ink([[S0[0] + lx, S0[1] + ly + 8], [E[0] + lx, E[1] + ly - 4]], { brush: 'pastel', w: 0.6, color: lt(sd.col, 0.6), seed: 7000 + f.i * 4 + sd.side, taper: [8, 8], wob: 0.4 });
          V.ink([[E[0] + lx * 0.7, E[1] + ly * 0.7], [V.lerp(E[0], Wr[0], 0.8) + lx * 0.7, V.lerp(E[1], Wr[1], 0.8) + ly * 0.7]], { brush: 'pastel', w: 0.5, color: lt(sd.col, 0.65), seed: 7100 + f.i * 4 + sd.side, taper: [6, 6], wob: 0.3 });
        }
      }
      V.pop();
    }
  }

  function windowGlow(t, a) {
    const br = 0.5 + 0.5 * Math.sin((TAU * (t - 34)) / 4 - Math.PI / 2); // one slow breath per scene
    V.with2d((ctx) => {
      zctx(ctx);
      // broad window bloom, breathing
      ctx.fillStyle = rad(ctx, 960, 452, 10, 960, 470, 320, [[0, `rgba(255,250,230,${a * (0.35 + 0.45 * br)})`], [0.35, `rgba(255,244,214,${a * (0.12 + 0.2 * br)})`], [1, 'rgba(255,240,210,0)']]);
      ctx.fillRect(560, 120, 800, 680);
      // the natural "halo": the brightest sky sits right behind Christ's head (no gold ring)
      ctx.fillStyle = rad(ctx, 958, 462, 0, 958, 462, 120, [[0, `rgba(255,252,238,${a * (0.3 + 0.35 * br)})`], [0.6, `rgba(255,248,226,${a * (0.12 + 0.16 * br)})`], [1, 'rgba(255,246,220,0)']]);
      ctx.fillRect(820, 330, 280, 280);
    }, { blend: 'screen' });
  }

  const SHAFT = { ang: 0.9, list: [{ p: [250, -80], w: 150, a: 0.2 }, { p: [520, -80], w: 85, a: 0.14 }] };
  function shaftI(x, y) {
    const d = [Math.cos(SHAFT.ang), Math.sin(SHAFT.ang)], n = [-d[1], d[0]];
    let I = 0;
    for (const sh of SHAFT.list) {
      const px = x - sh.p[0], py = y - sh.p[1];
      const across = Math.abs(px * n[0] + py * n[1]) / sh.w, along = px * d[0] + py * d[1];
      I += Math.max(0, 1 - across) * (sh.a / 0.085) * V.clamp(1.15 - along / 1500);
    }
    return I;
  }
  function lightAndDust(t) {
    V.with2d((ctx) => {
      zctx(ctx);
      const d = [Math.cos(SHAFT.ang), Math.sin(SHAFT.ang)], n = [-d[1], d[0]];
      for (const sh of SHAFT.list) {
        const a = [sh.p[0] - n[0] * sh.w, sh.p[1] - n[1] * sh.w], b = [sh.p[0] + n[0] * sh.w, sh.p[1] + n[1] * sh.w];
        ctx.fillStyle = lin(ctx, a[0], a[1], b[0], b[1], [[0, 'rgba(255,236,196,0)'], [0.5, `rgba(255,236,196,${sh.a})`], [1, 'rgba(255,236,196,0)']]);
        pth(ctx, [a, b, [b[0] + d[0] * 1800, b[1] + d[1] * 1800], [a[0] + d[0] * 1800, a[1] + d[1] * 1800]]);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = lin(ctx, 0, 0, 1500, 1100, [[0, 'rgba(0,0,0,1)'], [0.7, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]);
      ctx.fillRect(-200, -200, W + 400, H + 400);
      ctx.globalCompositeOperation = 'source-over';
      // dust motes drifting through the beams
      const r = V.rng(2024);
      for (let k = 0; k < 130; k++) {
        const along = r() * 1300, across = (r() - 0.5) * 1.6;
        const sh = SHAFT.list[k % 2];
        let x = sh.p[0] + d[0] * along + n[0] * across * sh.w, y = sh.p[1] + d[1] * along + n[1] * across * sh.w;
        const ph = r() * 100, sp = 0.4 + r() * 0.8;
        x += (V.noise1(t * 0.35 * sp + ph) - 0.5) * 60 + t * 3;
        y += (V.noise1(t * 0.3 * sp + ph + 50) - 0.5) * 50 + ((t * 6 * sp) % 40) - 20;
        const I = shaftI(x, y);
        if (I < 0.05) continue;
        const tw = 0.35 + 0.65 * V.noise1(t * 1.7 + ph * 3);
        const rr = 1.1 + r() * 2.2;
        ctx.fillStyle = `rgba(255,246,222,${V.clamp(I * tw * 1.5)})`;
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, TAU);
        ctx.fill();
      }
    }, { blend: 'screen' });
  }

  // illusionistic cartellino on the floor, in Leonardo's mirror script; the word being "said" darkens & swells on its beat
  function cartellino(t) {
    const say = V.G.say(t);
    V.with2d((ctx) => {
      zctx(ctx);
      ctx.translate(250, 958);
      ctx.rotate(-0.035);
      const w = 330, h = 104;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 6;
      pth(ctx, [[-w / 2, -h / 2], [w / 2 - 4, -h / 2 + 2], [w / 2, h / 2 - 3], [-w / 2 + 6, h / 2]]);
      ctx.fillStyle = '#ddd0b0';
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = lin(ctx, -w / 2, 0, w / 2, 0, [[0, 'rgba(255,248,226,0.35)'], [0.6, 'rgba(255,248,226,0)'], [1, 'rgba(90,60,30,0.25)']]);
      pth(ctx, [[-w / 2, -h / 2], [w / 2 - 4, -h / 2 + 2], [w / 2, h / 2 - 3], [-w / 2 + 6, h / 2]]);
      ctx.fill();
      // curled corner
      pth(ctx, [[w / 2 - 4, -h / 2 + 2], [w / 2 - 24, -h / 2 + 2], [w / 2 - 6, -h / 2 + 18]]);
      ctx.fillStyle = '#b8a888';
      ctx.fill();
      ctx.scale(-1, 1); // mirror writing
      const fnt = (px) => `italic ${px}px "Apple Chancery", "Snell Roundhand", serif`;
      ctx.font = fnt(50);
      const wSei = ctx.measureText('sei').width, wDot = ctx.measureText(' · ').width, wSet = ctx.measureText('sette').width;
      const tw = wSei + wDot + wSet;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const word = (str, cx, active) => {
        const k = active ? 1 + 0.16 * say.env : 1;
        ctx.save();
        ctx.translate(cx, 4);
        ctx.scale(k, k);
        ctx.font = fnt(50);
        ctx.fillStyle = active ? `rgba(52,26,10,${0.75 + 0.25 * say.env})` : 'rgba(70,42,20,0.42)';
        ctx.fillText(str, 0, 0);
        ctx.restore();
      };
      word('sei', -tw / 2 + wSei / 2, say.n === 6);
      ctx.fillStyle = 'rgba(70,42,20,0.5)';
      ctx.fillText('·', -tw / 2 + wSei + wDot / 2, 4);
      word('sette', -tw / 2 + wSei + wDot + wSet / 2, say.n === 7);
      ctx.strokeStyle = 'rgba(70,42,20,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-tw / 2, 34);
      ctx.quadraticCurveTo(0, 30, tw / 2, 36);
      ctx.stroke();
    });
  }

  // ================================================================== BUILD + DRAW
  const S = { built: false };
  function cap(fn, x, y, w, h) {
    clear();
    V.mReset();
    V.resetBrush();
    fn();
    V.flush();
    return get(x, y, w, h);
  }
  // keep only the figure's silhouette (grainy hatch strokes spill a few px past their polygons)
  function maskSprite(img, f) {
    const s = f.s;
    const g = createGraphics(f.rw, f.rh);
    g.pixelDensity(1);
    const ctx = g.drawingContext;
    ctx.filter = 'blur(0.7px)';
    ctx.drawImage(img.canvas, 0, 0, f.rw, f.rh);
    ctx.filter = 'none';
    const m = document.createElement('canvas');
    m.width = f.rw;
    m.height = f.rh;
    const mc = m.getContext('2d');
    mc.translate(-f.rx0, -f.ry0);
    mc.fillStyle = '#000';
    mc.strokeStyle = '#000';
    mc.lineWidth = 2;
    spth(mc, torsoPts(f), true, 6);
    mc.fill();
    mc.stroke();
    if (f.mantle) {
      spth(mc, mantlePts(f), true, 6);
      mc.fill();
      mc.stroke();
    }
    mc.lineCap = 'round';
    mc.lineWidth = 28 * s;
    mc.beginPath();
    mc.moveTo(f.hx, f.hy + 12 * s);
    mc.lineTo(f.nx, f.ysh + 4 * s);
    mc.stroke();
    mc.save();
    mc.translate(f.hx, f.hy);
    mc.rotate(f.tilt);
    const bot = f.beard === 'long' ? 66 : f.hairT === 'long' ? 58 : f.beard === 'short' ? 46 : 40;
    mc.beginPath();
    mc.ellipse(0, (bot - 39) * 0.5 * s, 37 * s, (bot + 39) * 0.5 * s, 0, 0, TAU);
    mc.fill();
    mc.restore();
    if (f.stand || f.id === 'simo') {
      mc.globalCompositeOperation = 'destination-out';
      mc.fillStyle = lin(mc, 0, 700, 0, 790, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
      mc.fillRect(f.rx0, 700, f.rw, 100);
    }
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(m, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    return g;
  }
  function build() {
    if (S.built) return;
    V.once('ren_brushes', () => {
      brush.add('ren_hair', { type: 'default', weight: 2.2, scatter: 0.15, sharpness: 0.8, grain: 14, opacity: 150, spacing: 0.06, pressure: [0.5, 1, 0.4], rotate: 'none', noise: 0.1 });
      return true;
    });
    clear();
    V.fill([[-60, -60], [-40, -60], [-50, -40]], { color: '#000000' }); // p5.brush swallows the first fill of a page
    V.flush();
    S.room = cap(paintRoom, 0, 0, W, H);
    S.table = cap(paintTable, 0, 0, W, H);
    for (const f of FIG) f.spr = maskSprite(cap(() => paintFigure(f), f.rx0, f.ry0, f.rw, f.rh), f);
    makeAgeing();
    const tile = cap(() => V.hatch(V.rectPts(-20, -20, 300, 300), { dist: 3.6, angle: 58, color: '#140a04', brush: 'HB', w: 0.34, rand: 0.1, seed: 5 }), 0, 0, 256, 256);
    S.tile = tile;
    clear();
    V.mReset();
    V.resetBrush();
    S.built = true;
  }

  V.scenes.renaissance = {
    draw(t, u, meta) {
      build();
      Z = 1 + 0.034 * V.E.io2(V.clamp((u + 0.35) / 4.7));
      V.bg('#1a120b');
      zblit(S.room, 0, 0, W, H);
      windowGlow(t, 1);
      zblit(S.table, 0, 0, W, H);
      drawGroups(t);
      windowGlow(t, 0.16);
      cartellino(t);
      lightAndDust(t);
      // ageing: losses + craquelure + stains on the painted surface, then varnish/vignette, haze, plaster grain
      zblit(S.loss, 0, 0, W, H);
      zblit(S.crack, 0, 0, W, H);
      zblit(S.stain, 0, 0, W, H, { blend: 'multiply', alpha: 0.55 });
      V.blit(S.tone, 0, 0, W, H, { blend: 'multiply' });
      V.blit(S.haze, 0, 0, W, H, { blend: 'screen', alpha: 0.1 });
      V.grain({ amt: 0.09, anim: false, mode: 'multiply' });
      // HUD (year top-left on the dark coffers, label card bottom-right on the floor) is drawn by main.js
    },
  };
})();
