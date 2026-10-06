/* egypt.js — 約 1300 BCE · 古埃及墓室壁畫 (film 10.0–16.0 s)
 * Nefertari-tomb / Book-of-the-Dead pastiche: lime-plaster wall, kheker frieze + block borders, two registers.
 * Main register: recumbent Anubis on his gilded shrine · Pharaoh (nemes) ▸ offering table + cartouche ◂ Hathor ◂ Horus.
 * Lower register: banquet guests with perfume cones, doing 67 as a ripple.
 * Layers:  BG (baked once: wall, borders, text columns, shrine, table, legs)  →  UP sprite (torsos/heads, bobs with the beat)
 *          → live arms (V.G.arm)  →  TOP sprite (collars/lappets)  →  live cartouche numerals + gold glints → wall texture (multiply).
 */
(function () {
  'use strict';
  const W = 1920, H = 1080;
  const GL = 786; // main register ground line
  const GL2 = 994; // lower register ground line
  const C = {
    plaster: '#e8d7a6', plasterL: '#efe2bc', plasterD: '#d6c290',
    red: '#b5523a', redD: '#8e3b28', yel: '#e2b04a', yelD: '#c08f2c',
    lapis: '#1d4e89', lapisD: '#163a68', blue: '#2f6fb0', turq: '#3b8fa3',
    green: '#2d8a6a', greenD: '#226650',
    gold: '#e0b030', goldD: '#b88a22', goldL: '#f2d266',
    ink: '#2a1a10', white: '#f6efe0', linen: '#f1e8d2', black: '#1d1713', crimson: '#a8321e',
    wood: '#7b4a26', ochre: '#c98a3c', purple: '#5b3a6e',
  };

  // ------------------------------------------------------------------ frame helpers (unit coords → screen)
  let F = { x: 0, y: 0, g: 30, d: 1, lw: 0.62 };
  let SEED = 1;
  let GOLD = null; // gold polygons collected during bakes: {p:[[x,y]..], grp:'bg'|'up'|'top'}
  let GOLDGRP = 'bg';
  const egF = (x, y, g, d, lw) => { F = { x, y, g, d, lw: lw == null ? 0.62 : lw }; };
  const P = (pts) => pts.map((p) => [F.x + F.d * p[0] * F.g, F.y + p[1] * F.g]);
  const PT = (x, y) => [F.x + F.d * x * F.g, F.y + y * F.g];
  function egGold(sp) { if (GOLD) GOLD.push({ p: sp, grp: GOLDGRP }); }
  function fl(pts, color, o = {}) {
    const sp = P(pts);
    V.fill(sp, { color, flat: true, alpha: o.alpha == null ? 1 : o.alpha, smooth: !!o.smooth, seed: SEED++, step: o.step || 3 });
    if (o.gold) egGold(o.smooth ? V.smoothPts(sp, true, 6) : sp);
  }
  function ln(pts, o = {}) {
    V.ink(P(pts), {
      w: F.lw * (o.w || 1), color: o.color || C.ink, alpha: o.alpha == null ? 1 : o.alpha, closed: !!o.closed, smooth: !!o.smooth,
      wob: o.wob == null ? 0.2 : o.wob, taper: o.taper || (o.closed ? [0, 0] : [3, 4]), step: o.step || 3, seed: SEED++, brush: o.brush || 'ink',
    });
  }
  function sh(pts, color, o = {}) {
    fl(pts, color, o);
    ln(pts, { closed: true, smooth: !!o.smooth, w: o.lw || 1, color: o.lc || C.ink });
  }
  // brush-mark texture inside a painted area (p5.brush hatch with a soft marker, a shade darker)
  function streak(pts, color, ang, o = {}) {
    let sp = P(o.smooth ? V.smoothPts(pts, true, 5) : pts);
    // inset the polygon a little: the marker tips overshoot the hatch boundary
    let cx = 0, cy = 0;
    sp.forEach(([x, y]) => { cx += x; cy += y; });
    cx /= sp.length; cy /= sp.length;
    const ins = F.g < 15 ? 1.5 : 4;
    sp = sp.map(([x, y]) => { const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1, k = Math.min(ins, d * 0.2) / d; return [x + dx * k, y + dy * k]; });
    V.hatch(sp, { dist: (o.dist || 6) * (F.g / 30 > 0.5 ? 1 : 0.6), angle: F.d > 0 ? ang : 180 - ang, color: V.mix(color, o.to || '#3a1608', o.k == null ? 0.12 : o.k), brush: o.brush || 'marker', w: (o.w || 0.45) * (F.g < 15 ? 0.6 : 1), rand: 0.35, seed: SEED++ });
  }
  const dt = (x, y, r, color) => { const [X, Y] = PT(x, y); V.dot(X, Y, r * F.g, color, { seed: SEED++ }); };
  const ell = (cx, cy, rx, ry, n = 28) => V.ellipsePts(cx, cy, rx, ry, n);
  const arcU = (cx, cy, rx, ry, a0, a1, n = 24) => V.arcPts(cx, cy, rx, ry, a0, a1, n);
  // offset outline around a bone chain (unit coords) → closed polygon
  function egLimb(pts, hw) {
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const nx = -ty, ny = tx;
      let m = 1;
      if (i > 0 && i < pts.length - 1) {
        const ax = p[0] - a[0], ay = p[1] - a[1], al = Math.hypot(ax, ay) || 1;
        m = 1 / Math.max(0.6, nx * (-ay / al) + ny * (ax / al));
      }
      L.push([p[0] + nx * hw[i] * m, p[1] + ny * hw[i] * m]);
      R.push([p[0] - nx * hw[i] * m, p[1] - ny * hw[i] * m]);
    }
    return L.concat(R.reverse());
  }
  // a band between two concentric elliptical arcs
  function egArcBand(cx, cy, rx0, ry0, rx1, ry1, a0, a1, n = 26) {
    return V.arcPts(cx, cy, rx1, ry1, a0, a1, n).concat(V.arcPts(cx, cy, rx0, ry0, a1, a0, n));
  }

  // ------------------------------------------------------------------ sprite bake
  const SP = {};
  function egBake(key, grp, fn) {
    if (SP[key]) return SP[key];
    V.mReset();
    V.resetBrush();
    clear();
    if (!SP.__warm) {
      // p5.brush may swallow the very first fill of a page: burn one off-canvas
      V.fill(V.rectPts(-60, -60, 20, 20), { color: '#000', flat: true });
      V.fill(V.rectPts(-60, -60, 20, 20), { color: '#000', flat: false });
      V.flush();
      SP.__warm = true;
    }
    GOLDGRP = grp;
    fn();
    V.flush();
    SP[key] = get();
    return SP[key];
  }
  // punch little paint losses into a baked sprite (they reveal the wall below)
  function egFlake(img, seed, boxes, n) {
    const ctx = img.drawingContext;
    if (!ctx) return;
    const r = V.rng(seed);
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    for (const [bx, by, bw, bh, k] of boxes) {
      const m = Math.round(n * (k || 1));
      for (let i = 0; i < m; i++) {
        const x = bx + r() * bw, y = by + r() * bh, s = 0.9 + Math.pow(r(), 4) * 7;
        const v = r();
        ctx.fillStyle = v < 0.75 ? `rgba(234,219,180,${0.75 + r() * 0.25})` : `rgba(206,186,146,${0.6 + r() * 0.3})`;
        ctx.beginPath();
        const nv = 5 + Math.floor(r() * 4);
        for (let j = 0; j < nv; j++) {
          const a = (j / nv) * Math.PI * 2, rr = s * (0.5 + r() * 0.7);
          const px = x + Math.cos(a) * rr * 1.4, py = y + Math.sin(a) * rr;
          if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    if (img.setModified) img.setModified(true);
  }

  // =================================================================== WALL TEXTURE (multiply map, near-white)
  function egTexMap() {
    return V.gfx('egTex', W, H, (ctx) => {
      const lw = 320, lh = 180;
      const lc = document.createElement('canvas');
      lc.width = lw; lc.height = lh;
      const lx = lc.getContext('2d');
      const id = lx.createImageData(lw, lh);
      for (let y = 0; y < lh; y++) {
        for (let x = 0; x < lw; x++) {
          const n = 0.5 * V.noise2(x / 22, y / 22) + 0.3 * V.noise2(x / 7 + 40, y / 7 + 9) + 0.2 * V.noise2(x / 2.6 + 7, y / 2.6 + 3);
          const ex = Math.min(x, lw - 1 - x) / lw, ey = Math.min(y, lh - 1 - y) / lh;
          const edge = V.smooth(0, 0.1, Math.min(ex * 1.1, ey * 1.6));
          let v = 0.88 + 0.12 * n;
          v *= 0.86 + 0.14 * edge;
          v *= 1 - 0.07 * V.smooth(0.72, 1, y / lh) * V.noise2(x / 11, 3.3 + y / 30);
          const i = (y * lw + x) * 4;
          id.data[i] = 255 * v; id.data[i + 1] = 255 * v * 0.982; id.data[i + 2] = 255 * v * 0.95; id.data[i + 3] = 255;
        }
      }
      lx.putImageData(id, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(lc, 0, 0, W, H);
      const r = V.rng(77);
      // water stains with tide lines
      for (let s = 0; s < 9; s++) {
        const cx = r() * W, cy = r() < 0.6 ? H * (0.55 + r() * 0.45) : r() * H, rad = 60 + r() * 190;
        ctx.beginPath();
        const N = 40;
        for (let j = 0; j <= N; j++) {
          const a = (j / N) * Math.PI * 2, rr = rad * (0.7 + 0.5 * V.noise1(j * 0.35 + s * 9));
          const px = cx + Math.cos(a) * rr * 1.3, py = cy + Math.sin(a) * rr * 0.8;
          if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(170,135,90,0.07)';
        ctx.fill();
        ctx.filter = 'blur(1.5px)';
        ctx.strokeStyle = 'rgba(140,100,60,0.16)';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.filter = 'none';
      }
      // straw fibres in the mud plaster
      ctx.lineCap = 'round';
      for (let i = 0; i < 2600; i++) {
        const x = r() * W, y = r() * H, a = r() * Math.PI, L = 4 + r() * 14;
        ctx.strokeStyle = `rgba(${110 + r() * 40},${80 + r() * 30},${45},${0.08 + r() * 0.12})`;
        ctx.lineWidth = 0.7 + r() * 0.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (r() - 0.5) * 3, y + Math.sin(a) * L * 0.5 + (r() - 0.5) * 3, x + Math.cos(a) * L, y + Math.sin(a) * L);
        ctx.stroke();
      }
      // pits
      for (let i = 0; i < 3800; i++) {
        const x = r() * W, y = r() * H, s = 0.6 + Math.pow(r(), 4) * 3;
        ctx.fillStyle = `rgba(90,60,35,${0.12 + r() * 0.25})`;
        ctx.beginPath();
        ctx.ellipse(x, y, s * 1.2, s, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // fine grain
      const img = ctx.getImageData(0, 0, W, H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const k = 0.935 + r() * 0.065;
        d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
      }
      ctx.putImageData(img, 0, 0);
      // cracks
      const crack = (x, y, a, len, wd, depth) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        const pts = [[x, y]];
        for (let s = 0; s < len; s += 6) {
          a += (r() - 0.5) * 0.7;
          x += Math.cos(a) * 6; y += Math.sin(a) * 6;
          ctx.lineTo(x, y);
          pts.push([x, y]);
        }
        ctx.strokeStyle = `rgba(70,45,25,${0.45 + 0.2 * r()})`;
        ctx.lineWidth = wd;
        ctx.stroke();
        if (depth > 0) {
          const nb = 1 + Math.floor(r() * 2);
          for (let b = 0; b < nb; b++) {
            const p = pts[Math.floor(r() * pts.length)];
            crack(p[0], p[1], a + (r() < 0.5 ? 1 : -1) * (0.6 + r() * 0.8), len * (0.3 + r() * 0.3), wd * 0.65, depth - 1);
          }
        }
      };
      const cs = [[1500, 0, 1.9, 220], [60, 1080, -1.2, 260], [960, 1080, -1.75, 150], [1920, 640, 3.0, 200], [0, 300, 0.25, 160], [700, 0, 1.5, 120], [1240, 1080, -1.4, 180]];
      cs.forEach(([x, y, a, L]) => crack(x, y, a, L, 1.5, 2));
    });
  }

  // abrasion: the painted surface is rubbed back towards bare lime in soft patches (normal-blend, plaster colour)
  function egFadeMap() {
    return V.gfx('egFade', W, H, (ctx) => {
      const lw = 320, lh = 180;
      const lc = document.createElement('canvas');
      lc.width = lw; lc.height = lh;
      const lx = lc.getContext('2d');
      const id = lx.createImageData(lw, lh);
      for (let y = 0; y < lh; y++) {
        for (let x = 0; x < lw; x++) {
          const n = 0.6 * V.noise2(x / 15 + 11, y / 15 + 5) + 0.4 * V.noise2(x / 5 + 3, y / 5 + 8);
          let a = V.smooth(0.55, 0.88, n) * 0.28;
          a += V.smooth(0.82, 1.0, y / lh) * 0.16 * V.noise2(x / 8, 7.7);
          a += (1 - V.smooth(0, 0.05, Math.min(x / lw, 1 - x / lw))) * 0.12;
          const i = (y * lw + x) * 4;
          id.data[i] = 236; id.data[i + 1] = 222; id.data[i + 2] = 184; id.data[i + 3] = 255 * Math.min(0.38, a);
        }
      }
      lx.putImageData(id, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(lc, 0, 0, W, H);
      // horizontal rubbing streaks
      const r = V.rng(515);
      ctx.filter = 'blur(3px)';
      for (let i = 0; i < 30; i++) {
        const x = r() * W, y = 90 + r() * (H - 120), w = 50 + r() * 220, h = 2 + r() * 6;
        ctx.fillStyle = `rgba(238,225,190,${0.03 + r() * 0.06})`;
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, (r() - 0.5) * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.filter = 'none';
    });
  }
  // the painters' red-ochre canon grid, showing where the final lime wash has worn off
  function egRedGrid(x0, x1, y0, y1, ox, oy, step, seed) {
    // snapped red-ochre cord lines, drawn with a coloured-pencil brush, surviving only in patches
    const vis = (x, y) => V.smooth(0.45, 0.78, V.noise2(x / 140 + seed, y / 140 + seed * 0.7)) * 0.34;
    const seg = 24;
    for (let x = ox - Math.ceil((ox - x0) / step) * step; x <= x1; x += step) {
      for (let y = y0; y < y1; y += seg) {
        const a = vis(x, y + seg / 2);
        if (a < 0.04) continue;
        V.ink([[x, y], [x + 0.6, Math.min(y1, y + seg)]], { w: 0.26, brush: 'inkDry', color: V.mix('#e3cfa0', '#b0452a', a), taper: [0, 0], wob: 0.4, step: 6, seed: SEED++ });
      }
    }
    for (let y = oy - Math.ceil((oy - y0) / step) * step; y <= y1; y += step) {
      for (let x = x0; x < x1; x += seg) {
        const a = vis(x + seg / 2, y);
        if (a < 0.04) continue;
        V.ink([[x, y], [Math.min(x1, x + seg), y + 0.6]], { w: 0.26, brush: 'inkDry', color: V.mix('#e3cfa0', '#b0452a', a), taper: [0, 0], wob: 0.4, step: 6, seed: SEED++ });
      }
    }
  }
  // the draughtsman's red preliminary contour, left showing beside the final black line
  function egPentimento(fig, pts, dx, dy2) {
    egF(fig.x, fig.gy, fig.g, fig.d, fig.lw);
    ln(pts.map(([x, y]) => [x + dx, y + dy2]), { w: 0.75, brush: 'inkDry', color: '#b4472a', alpha: 0.6, smooth: true, taper: [10, 10], wob: 0.6 });
  }

  // =================================================================== HIEROGLYPHS
  function egBox(x, y, w, h, flip) {
    const M = (p) => [x + (flip ? 1 - p[0] : p[0]) * w, y + p[1] * h];
    const MP = (pts) => pts.map(M);
    const s = Math.min(w, h);
    return {
      f: (pts, col, o = {}) => {
        V.fill(MP(pts), { color: col, flat: true, seed: SEED++, step: 2, smooth: !!o.smooth });
        if (!o.noLine) V.ink(MP(pts), { w: 0.36, color: C.ink, closed: true, taper: [0, 0], wob: 0.12, step: 2, smooth: !!o.smooth, seed: SEED++ });
      },
      l: (pts, o = {}) => V.ink(MP(pts), { w: o.w || 0.36, color: o.color || C.ink, taper: o.taper || [2, 2], wob: 0.12, step: 2, smooth: !!o.smooth, closed: !!o.closed, seed: SEED++ }),
      d: (px, py, r, col) => { const [X, Y] = M([px, py]); V.dot(X, Y, r * s, col, { seed: SEED++ }); },
      e: (cx, cy, rx, ry, n = 20) => V.ellipsePts(cx, cy, rx, ry, n),
    };
  }
  const GLY = {
    // ---------------------------------------------------- square signs
    vulture: { c: 'sq', f: (b) => {
      b.f([[0.04, 0.8], [0.2, 0.62], [0.4, 0.44], [0.54, 0.36], [0.6, 0.2], [0.66, 0.1], [0.78, 0.07], [0.88, 0.11], [0.95, 0.18], [0.9, 0.22], [0.83, 0.2], [0.79, 0.26], [0.78, 0.38], [0.82, 0.52], [0.78, 0.68], [0.62, 0.78], [0.38, 0.8]], C.blue, { smooth: true });
      b.f([[0.2, 0.64], [0.4, 0.5], [0.6, 0.52], [0.66, 0.64], [0.52, 0.74], [0.28, 0.75]], C.green, { smooth: true });
      b.l([[0.3, 0.7], [0.5, 0.66]]);
      b.l([[0.55, 0.78], [0.53, 0.96], [0.42, 0.97]]);
      b.l([[0.65, 0.78], [0.68, 0.96], [0.8, 0.97]]);
      b.f([[0.88, 0.11], [0.98, 0.17], [0.95, 0.23], [0.9, 0.19]], C.crimson);
      b.d(0.8, 0.14, 0.03, C.ink);
    } },
    owl: { c: 'sq', f: (b) => {
      b.f([[0.12, 0.96], [0.26, 0.8], [0.24, 0.62], [0.3, 0.45], [0.42, 0.36], [0.62, 0.36], [0.74, 0.5], [0.76, 0.7], [0.68, 0.88], [0.5, 0.94]], C.yel, { smooth: true });
      b.f([[0.33, 0.12], [0.38, 0.03], [0.44, 0.1], [0.56, 0.1], [0.62, 0.03], [0.67, 0.12], [0.7, 0.26], [0.62, 0.38], [0.38, 0.38], [0.3, 0.26]], C.yel, { smooth: false });
      b.d(0.43, 0.21, 0.06, C.white); b.d(0.57, 0.21, 0.06, C.white);
      b.d(0.43, 0.21, 0.03, C.ink); b.d(0.57, 0.21, 0.03, C.ink);
      b.f([[0.48, 0.26], [0.52, 0.26], [0.5, 0.33]], C.crimson, { noLine: true });
      b.l([[0.36, 0.55], [0.5, 0.62], [0.66, 0.56]]); b.l([[0.36, 0.68], [0.5, 0.75], [0.66, 0.69]]);
      b.l([[0.48, 0.94], [0.46, 0.99]]); b.l([[0.58, 0.93], [0.6, 0.99]]);
    } },
    chick: { c: 'sq', f: (b) => {
      b.f([[0.16, 0.6], [0.3, 0.42], [0.5, 0.36], [0.6, 0.26], [0.64, 0.14], [0.74, 0.08], [0.84, 0.12], [0.88, 0.2], [0.8, 0.26], [0.76, 0.36], [0.8, 0.55], [0.7, 0.72], [0.46, 0.76], [0.24, 0.72]], C.yel, { smooth: true });
      b.f([[0.36, 0.5], [0.56, 0.46], [0.6, 0.6], [0.42, 0.64]], C.red, { smooth: true });
      b.f([[0.86, 0.15], [0.96, 0.2], [0.87, 0.23]], C.crimson, { noLine: true });
      b.d(0.76, 0.15, 0.03, C.ink);
      b.l([[0.48, 0.75], [0.44, 0.97], [0.34, 0.97]]); b.l([[0.6, 0.73], [0.64, 0.97], [0.76, 0.97]]);
    } },
    falcon: { c: 'sq', f: (b) => {
      b.f([[0.28, 0.95], [0.36, 0.72], [0.4, 0.48], [0.5, 0.32], [0.54, 0.16], [0.64, 0.07], [0.76, 0.08], [0.86, 0.16], [0.82, 0.24], [0.74, 0.26], [0.72, 0.4], [0.78, 0.56], [0.72, 0.74], [0.56, 0.82], [0.44, 0.95]], C.green, { smooth: true });
      b.f([[0.42, 0.48], [0.6, 0.42], [0.66, 0.6], [0.52, 0.84], [0.4, 0.86]], C.blue, { smooth: true });
      b.d(0.72, 0.15, 0.035, C.ink);
      b.l([[0.7, 0.19], [0.66, 0.3]], { w: 0.5 });
      b.l([[0.6, 0.82], [0.62, 0.97], [0.72, 0.97]]);
    } },
    // ---------------------------------------------------- flat signs (≈ 2.4 : 1 box)
    water: { c: 'fl', f: (b) => {
      const z = [];
      for (let i = 0; i <= 12; i++) z.push([0.03 + (i / 12) * 0.94, i % 2 ? 0.3 : 0.7]);
      b.l(z, { w: 1.05, color: C.blue, taper: [3, 3] });
    } },
    loaf: { c: 'fl', f: (b) => b.f([[0.26, 0.86], [0.28, 0.55], [0.38, 0.26], [0.5, 0.18], [0.62, 0.26], [0.72, 0.55], [0.74, 0.86]], C.blue, { smooth: true }) },
    mouth: { c: 'fl', f: (b) => b.f([[0.14, 0.5], [0.32, 0.26], [0.68, 0.26], [0.86, 0.5], [0.68, 0.74], [0.32, 0.74]], C.crimson, { smooth: true }) },
    basket: { c: 'fl', f: (b) => {
      b.f([[0.12, 0.18], [0.88, 0.18], [0.82, 0.55], [0.64, 0.84], [0.36, 0.84], [0.18, 0.55]], C.green, { smooth: false });
      b.l([[0.3, 0.2], [0.55, 0.8]], { w: 0.25 }); b.l([[0.7, 0.2], [0.45, 0.8]], { w: 0.25 });
    } },
    arm: { c: 'fl', f: (b) => b.f([[0.02, 0.36], [0.55, 0.32], [0.6, 0.08], [0.68, 0.06], [0.7, 0.3], [0.94, 0.4], [0.98, 0.56], [0.62, 0.7], [0.02, 0.7]], C.red) },
    hand: { c: 'fl', f: (b) => b.f([[0.12, 0.44], [0.56, 0.36], [0.62, 0.1], [0.72, 0.12], [0.7, 0.38], [0.92, 0.46], [0.92, 0.64], [0.12, 0.68]], C.red) },
    viper: { c: 'fl', f: (b) => {
      b.f([[0.02, 0.8], [0.22, 0.66], [0.48, 0.55], [0.6, 0.34], [0.7, 0.26], [0.84, 0.28], [0.95, 0.4], [0.9, 0.52], [0.74, 0.54], [0.62, 0.68], [0.36, 0.84], [0.04, 0.92]], C.yel, { smooth: true });
      b.l([[0.76, 0.27], [0.74, 0.08]], { w: 0.4 }); b.l([[0.82, 0.28], [0.84, 0.1]], { w: 0.4 });
      b.d(0.86, 0.36, 0.06, C.ink);
      [0.2, 0.36, 0.5, 0.64].forEach((x, i) => b.d(x, 0.78 - i * 0.07 - (i > 2 ? 0.15 : 0), 0.06, C.redD));
    } },
    sky: { c: 'fl', f: (b) => b.f([[0.02, 0.24], [0.98, 0.24], [0.98, 0.82], [0.88, 0.82], [0.88, 0.52], [0.12, 0.52], [0.12, 0.82], [0.02, 0.82]], C.blue) },
    house: { c: 'fl', f: (b) => {
      b.l([[0.56, 0.86], [0.86, 0.86], [0.86, 0.16], [0.14, 0.16], [0.14, 0.86], [0.4, 0.86]], { w: 1.3, color: C.blue, taper: [0, 0] });
    } },
    eye: { c: 'fl', f: (b) => {
      b.f([[0.12, 0.56], [0.3, 0.36], [0.56, 0.32], [0.82, 0.46], [0.9, 0.56], [0.6, 0.72], [0.32, 0.72]], C.white, { smooth: true });
      b.d(0.52, 0.52, 0.17, C.ink);
      b.l([[0.12, 0.22], [0.45, 0.08], [0.88, 0.2]], { w: 0.75, color: C.lapis, smooth: true });
      b.l([[0.88, 0.5], [0.99, 0.44]], { w: 0.6 });
    } },
    cobra: { c: 'fl', f: (b) => b.f([[0.02, 0.84], [0.32, 0.8], [0.56, 0.84], [0.68, 0.66], [0.66, 0.4], [0.73, 0.16], [0.84, 0.1], [0.94, 0.18], [0.9, 0.34], [0.8, 0.42], [0.83, 0.66], [0.7, 0.94], [0.4, 0.96], [0.04, 0.96]], C.green, { smooth: true }) },
    goose: { c: 'fl', f: (b) => {
      b.f([[0.04, 0.6], [0.24, 0.42], [0.52, 0.4], [0.68, 0.3], [0.74, 0.1], [0.84, 0.04], [0.94, 0.12], [0.86, 0.18], [0.82, 0.32], [0.82, 0.52], [0.7, 0.76], [0.4, 0.82], [0.14, 0.72]], C.blue, { smooth: true });
      b.f([[0.22, 0.52], [0.5, 0.48], [0.62, 0.62], [0.44, 0.72], [0.2, 0.64]], C.green, { smooth: true });
      b.l([[0.48, 0.8], [0.46, 0.98]]); b.l([[0.56, 0.8], [0.6, 0.98]]);
      b.d(0.84, 0.1, 0.06, C.ink);
    } },
    // ---------------------------------------------------- tall signs (≈ 1 : 2.2 box)
    reed: { c: 'tl', f: (b) => {
      b.f([[0.5, 0.99], [0.3, 0.76], [0.24, 0.46], [0.3, 0.2], [0.5, 0.04], [0.74, 0.0], [0.62, 0.1], [0.56, 0.3], [0.64, 0.56], [0.7, 0.78]], C.green, { smooth: true });
      b.l([[0.5, 0.95], [0.44, 0.6], [0.46, 0.25]], { w: 0.25, smooth: true });
    } },
    ankh: { c: 'tl', f: (b) => {
      b.l(b.e(0.5, 0.19, 0.24, 0.16, 22), { w: 1.25, color: C.blue, closed: true, taper: [0, 0] });
      b.f([[0.08, 0.37], [0.92, 0.37], [0.92, 0.46], [0.08, 0.46]], C.blue);
      b.f([[0.4, 0.46], [0.6, 0.46], [0.68, 0.99], [0.32, 0.99]], C.blue);
    } },
    djed: { c: 'tl', f: (b) => {
      b.f([[0.34, 0.3], [0.66, 0.3], [0.7, 0.99], [0.3, 0.99]], C.green);
      [0.04, 0.11, 0.18, 0.25].forEach((y, i) => b.f([[0.1, y], [0.9, y], [0.9, y + 0.05], [0.1, y + 0.05]], i % 2 ? C.blue : C.gold));
    } },
    feather: { c: 'tl', f: (b) => {
      b.f([[0.44, 0.99], [0.36, 0.62], [0.34, 0.32], [0.42, 0.12], [0.58, 0.02], [0.8, 0.03], [0.68, 0.12], [0.62, 0.32], [0.62, 0.64], [0.56, 0.99]], C.green, { smooth: true });
      b.l([[0.38, 0.45], [0.62, 0.42]], { w: 0.6, color: C.blue }); b.l([[0.37, 0.65], [0.62, 0.62]], { w: 0.6, color: C.blue });
      b.l([[0.5, 0.99], [0.48, 0.3], [0.56, 0.08]], { w: 0.25, smooth: true });
    } },
    nefer: { c: 'tl', f: (b) => {
      b.l([[0.5, 0.62], [0.5, 0.02]], { w: 0.9, color: C.ink, taper: [0, 0] });
      b.l([[0.3, 0.2], [0.7, 0.2]], { w: 0.6 }); b.l([[0.3, 0.3], [0.7, 0.3]], { w: 0.6 });
      b.f([[0.5, 0.99], [0.22, 0.86], [0.18, 0.68], [0.3, 0.56], [0.7, 0.56], [0.82, 0.68], [0.78, 0.86]], C.crimson, { smooth: true });
    } },
    was: { c: 'tl', f: (b) => {
      b.l([[0.48, 0.93], [0.48, 0.14]], { w: 0.85, color: C.blue, taper: [0, 0] });
      b.f([[0.44, 0.15], [0.44, 0.06], [0.74, 0.0], [0.8, 0.06], [0.58, 0.14]], C.blue);
      b.l([[0.48, 0.92], [0.34, 0.99]], { w: 0.6, color: C.blue }); b.l([[0.48, 0.92], [0.62, 0.99]], { w: 0.6, color: C.blue });
    } },
    wick: { c: 'tl', f: (b) => {
      const s1 = [], s2 = [];
      for (let i = 0; i <= 16; i++) { const y = 0.03 + (i / 16) * 0.94; s1.push([0.5 + 0.2 * Math.sin(y * Math.PI * 4.5), y]); s2.push([0.5 - 0.2 * Math.sin(y * Math.PI * 4.5), y]); }
      b.l(s1, { w: 0.85, color: C.green }); b.l(s2, { w: 0.85, color: C.green });
    } },
    cloth: { c: 'tl', f: (b) => {
      b.f([[0.36, 0.04], [0.64, 0.04], [0.62, 0.56], [0.76, 0.96], [0.24, 0.96], [0.38, 0.56]], C.yel);
      b.l([[0.5, 0.06], [0.5, 0.56]], { w: 0.25 });
    } },
    foot: { c: 'tl', f: (b) => b.f([[0.3, 0.02], [0.58, 0.02], [0.6, 0.72], [0.94, 0.86], [0.94, 0.98], [0.22, 0.98], [0.28, 0.76]], C.red) },
    // ---------------------------------------------------- small signs (square, half size)
    sun: { c: 'sm', f: (b) => { b.f(b.e(0.5, 0.5, 0.4, 0.4, 20), C.crimson); b.d(0.5, 0.5, 0.08, C.ink); } },
    stool: { c: 'sm', f: (b) => { b.f([[0.1, 0.28], [0.9, 0.28], [0.9, 0.72], [0.1, 0.72]], C.blue); } },
    shen: { c: 'sm', f: (b) => { b.l(b.e(0.5, 0.42, 0.3, 0.3, 20), { w: 1.0, color: C.goldD, closed: true, taper: [0, 0] }); b.f([[0.18, 0.74], [0.82, 0.74], [0.82, 0.88], [0.18, 0.88]], C.gold); } },
  };
  const GCAT = { sq: [], fl: [], tl: [], sm: [] };
  Object.keys(GLY).forEach((k) => GCAT[GLY[k].c].push(k));
  function egGlyph(name, x, y, w, h, flip) { GLY[name].f(egBox(x, y, w, h, flip)); }

  /** a group of hieroglyph columns. x0,y0 top-left, ncol columns of width cw, height hgt. flip=true → signs face left */
  function egColumns(x0, y0, ncol, cw, hgt, flip, seed, o = {}) {
    const r = V.rng(seed);
    const pick = (cat) => GCAT[cat][Math.floor(r() * GCAT[cat].length)];
    const qh = cw * (o.qr || 0.92), pad = cw * 0.1;
    for (let c = 0; c < ncol; c++) {
      const cx = x0 + c * cw;
      let y = y0 + pad * 0.6;
      const skip = o.skip ? o.skip(c) : null;
      while (y + qh <= y0 + hgt + 1) {
        if (skip && y > skip[0] && y < skip[1]) { y += qh; continue; }
        const q = r();
        const iw = cw - 2 * pad, ih = qh - 2 * pad;
        if (q < 0.3) {
          egGlyph(pick('sq'), cx + pad, y + pad, iw, ih, flip);
        } else if (q < 0.62) {
          const hh = (ih - pad * 0.6) / 2;
          egGlyph(pick('fl'), cx + pad, y + pad, iw, hh, flip);
          egGlyph(pick('fl'), cx + pad, y + pad + hh + pad * 0.6, iw, hh, flip);
        } else if (q < 0.86) {
          const ww = (iw - pad * 0.6) / 2;
          egGlyph(pick('tl'), cx + pad, y + pad, ww, ih, flip);
          egGlyph(pick('tl'), cx + pad + ww + pad * 0.6, y + pad, ww, ih, flip);
        } else {
          const s = ih * 0.46;
          egGlyph(pick('sm'), cx + pad + (iw - s) / 2, y + pad, s, s, flip);
          egGlyph(pick('fl'), cx + pad, y + pad + s + pad * 0.4, iw, ih - s - pad * 0.4, flip);
        }
        y += qh;
      }
    }
    // column rules
    for (let c = 0; c <= ncol; c++) V.ink([[x0 + c * cw, y0], [x0 + c * cw, y0 + hgt]], { w: 0.45, color: C.ink, alpha: 0.85, taper: [0, 0], wob: 0.3, step: 6, seed: SEED++ });
    V.ink([[x0, y0], [x0 + ncol * cw, y0]], { w: 0.45, color: C.ink, alpha: 0.85, taper: [0, 0], wob: 0.3, step: 6, seed: SEED++ });
  }

  // =================================================================== BORDERS / FRIEZE
  const BCOL = [C.blue, C.crimson, C.green, C.gold];
  function egBlockBorderH(x0, x1, y0, h, phase) {
    V.fill(V.rectPts(x0, y0, x1 - x0, h), { color: C.linen, flat: true, seed: SEED++ });
    const bw = 30, sep = 7;
    let k = phase || 0;
    for (let x = x0 + 3; x < x1 - 4; x += bw + sep) {
      const w = Math.min(bw, x1 - 3 - x);
      if (w < 6) break;
      V.fill(V.rectPts(x, y0 + 3.5, w, h - 7), { color: BCOL[k++ % 4], flat: true, seed: SEED++ });
    }
    V.ink([[x0, y0], [x1, y0]], { w: 0.55, taper: [0, 0], wob: 0.3, step: 8, color: C.ink, seed: SEED++ });
    V.ink([[x0, y0 + h], [x1, y0 + h]], { w: 0.55, taper: [0, 0], wob: 0.3, step: 8, color: C.ink, seed: SEED++ });
  }
  function egBlockBorderV(x0, w, y0, y1, phase) {
    V.fill(V.rectPts(x0, y0, w, y1 - y0), { color: C.linen, flat: true, seed: SEED++ });
    const bh = 30, sep = 7;
    let k = phase || 0;
    for (let y = y0 + 3; y < y1 - 4; y += bh + sep) {
      const h = Math.min(bh, y1 - 3 - y);
      if (h < 6) break;
      V.fill(V.rectPts(x0 + 3.5, y, w - 7, h), { color: BCOL[k++ % 4], flat: true, seed: SEED++ });
    }
    V.ink([[x0, y0], [x0, y1]], { w: 0.55, taper: [0, 0], wob: 0.3, step: 8, color: C.ink, seed: SEED++ });
    V.ink([[x0 + w, y0], [x0 + w, y1]], { w: 0.55, taper: [0, 0], wob: 0.3, step: 8, color: C.ink, seed: SEED++ });
  }
  // the starry sky band (yellow five-armed stars on lapis) under the kheker frieze
  function egStarBand(y0, h) {
    const band = V.rectPts(0, y0, W, h);
    V.fill(band, { color: C.lapis, flat: true, seed: SEED++ });
    V.hatch(band, { dist: 9, angle: 4, color: '#18406f', brush: 'marker', w: 0.5, rand: 0.4, seed: SEED++ });
    const R = h * 0.36, r = R * 0.3;
    for (let i = 0, x = 22; x < W; i++, x += 40) {
      const cx = x + (i % 2 ? 4 : 0), cy = y0 + h / 2 + (i % 2 ? 1 : -1);
      const st = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5 + (i % 3) * 0.08;
        const rr = k % 2 ? r : R;
        st.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      V.fill(st, { color: '#f0c64e', flat: true, seed: SEED++ });
      V.dot(cx, cy, 1.6, C.crimson, { seed: SEED++ });
    }
    V.ink([[0, y0], [W, y0]], { w: 0.55, taper: [0, 0], wob: 0.3, step: 8, color: C.ink, seed: SEED++ });
    V.ink([[0, y0 + h], [W, y0 + h]], { w: 0.55, taper: [0, 0], wob: 0.3, step: 8, color: C.ink, seed: SEED++ });
  }
  function egKheker(y0, h) {
    const cw = 30;
    const cols = [C.green, C.blue, C.crimson];
    for (let i = 0, x = 0; x < W; i++, x += cw) {
      const B = cols[i % 3], A = B === C.crimson ? C.blue : C.crimson;
      const s = h / 56;
      const T = (pts) => pts.map(([px, py]) => [x + px, y0 + py * s]);
      const body = T([[10, 25], [7.5, 38], [6, 50], [24, 50], [22.5, 38], [20, 25]]);
      V.fill(body, { color: B, flat: true, seed: SEED++ });
      V.ink(body, { w: 0.38, closed: true, taper: [0, 0], wob: 0.15, step: 3, color: C.ink, seed: SEED++ });
      const neck = T([[11, 17], [19, 17], [19.5, 25], [10.5, 25]]);
      V.fill(neck, { color: C.gold, flat: true, seed: SEED++ });
      V.ink(T([[11, 19.5], [19, 19.5]]), { w: 0.3, taper: [0, 0], step: 3, color: C.ink, seed: SEED++ });
      V.ink(T([[11, 22.5], [19, 22.5]]), { w: 0.3, taper: [0, 0], step: 3, color: C.ink, seed: SEED++ });
      V.ink(neck, { w: 0.35, closed: true, taper: [0, 0], wob: 0.1, step: 3, color: C.ink, seed: SEED++ });
      const knob = V.ellipsePts(x + 15, y0 + 10 * s, 5.5, 7.5 * s, 16);
      V.fill(knob, { color: A, flat: true, seed: SEED++ });
      V.ink(knob, { w: 0.35, closed: true, taper: [0, 0], wob: 0.1, step: 3, color: C.ink, seed: SEED++ });
      V.ink(T([[15, 27], [15, 48]]), { w: 0.28, taper: [2, 2], step: 3, color: C.ink, alpha: 0.8, seed: SEED++ });
      V.ink(T([[11.5, 29], [9.5, 48]]), { w: 0.22, taper: [2, 2], step: 3, color: C.ink, alpha: 0.6, seed: SEED++ });
      V.ink(T([[18.5, 29], [20.5, 48]]), { w: 0.22, taper: [2, 2], step: 3, color: C.ink, alpha: 0.6, seed: SEED++ });
      V.fill(T([[5, 50], [25, 50], [25, 56], [5, 56]]), { color: C.gold, flat: true, seed: SEED++ });
    }
  }

  // =================================================================== FIGURE PARTS (unit coords, facing right, sole at y=0, up = -y)
  const M_TORSO = [[-0.5, -16.75], [-0.55, -16.2], [-1.7, -16.02], [-2.6, -15.88], [-2.95, -15.55], [-2.9, -15.05], [-2.45, -14.5], [-2.0, -13.6], [-1.7, -12.5], [-1.55, -11.4], [-1.8, -10.2], [-1.9, -9.0], [-1.75, -7.4],
    [1.55, -7.4], [1.5, -9.2], [1.45, -10.5], [1.3, -11.4], [1.38, -12.3], [1.62, -13.1], [1.95, -13.75], [2.2, -14.35], [2.7, -14.85], [2.95, -15.3], [2.85, -15.7], [2.5, -15.9], [1.6, -16.02], [0.85, -16.2], [0.8, -16.75]];
  const F_TORSO = [[-0.45, -16.75], [-0.5, -16.2], [-1.4, -16.02], [-2.2, -15.88], [-2.5, -15.55], [-2.42, -15.05], [-2.05, -14.5], [-1.65, -13.6], [-1.4, -12.5], [-1.25, -11.5], [-1.5, -10.3], [-1.72, -9.2], [-1.65, -7.6],
    [1.35, -7.6], [1.45, -9.0], [1.3, -10.3], [1.05, -11.3], [1.1, -12.4], [1.3, -12.95], [1.75, -13.25], [1.95, -13.55], [1.85, -13.9], [1.6, -14.2], [1.85, -14.55], [2.25, -14.95], [2.5, -15.35], [2.42, -15.7], [2.15, -15.9], [1.3, -16.02], [0.7, -16.2], [0.68, -16.75]];
  const M_LEG_B = [[-1.55, -7.8], [-1.4, -6.6], [-1.2, -5.7], [-1.32, -4.4], [-1.12, -2.6], [-0.9, -1.1], [-1.22, -0.55], [-1.4, -0.08], [1.4, -0.06], [1.45, -0.32], [0.65, -0.62], [0.08, -1.05], [0.0, -2.6], [0.12, -4.8], [0.28, -5.7], [0.5, -6.6], [0.6, -7.8]];
  const M_LEG_F = [[0.0, -7.8], [0.55, -6.6], [0.98, -5.75], [0.85, -4.4], [1.08, -2.6], [1.32, -1.1], [1.05, -0.55], [0.95, -0.08], [4.2, -0.06], [4.25, -0.32], [2.95, -0.66], [2.32, -1.05], [2.22, -2.6], [2.32, -4.8], [2.18, -5.75], [2.05, -6.8], [1.85, -7.8]];
  const F_LEG_B = [[-1.35, -7.8], [-1.2, -6.6], [-1.02, -5.7], [-1.12, -4.4], [-0.95, -2.6], [-0.76, -1.1], [-1.05, -0.55], [-1.18, -0.08], [1.3, -0.06], [1.34, -0.3], [0.62, -0.58], [0.1, -1.0], [0.02, -2.6], [0.12, -4.8], [0.24, -5.7], [0.42, -6.6], [0.5, -7.8]];
  const F_LEG_F = [[-0.1, -7.8], [0.35, -6.6], [0.62, -5.75], [0.52, -4.4], [0.7, -2.6], [0.88, -1.1], [0.62, -0.55], [0.52, -0.08], [3.25, -0.06], [3.28, -0.3], [2.3, -0.6], [1.75, -1.0], [1.65, -2.6], [1.78, -4.8], [1.68, -5.75], [1.55, -6.8], [1.4, -7.8]];
  const M_FACE = [[-0.55, -16.75], [-0.6, -17.4], [-0.72, -18.2], [-0.4, -18.9], [0.4, -19.15], [1.1, -19.0], [1.55, -18.6], [1.68, -18.3], [1.78, -18.05], [1.76, -17.92], [2.1, -17.48], [2.06, -17.4], [1.84, -17.36], [1.82, -17.27], [1.86, -17.18], [1.74, -17.1], [1.82, -17.02], [1.7, -16.92], [1.72, -16.78], [1.5, -16.62], [0.95, -16.55], [0.8, -16.45]];
  const F_FACE = [[-0.45, -16.75], [-0.5, -17.4], [-0.6, -18.2], [-0.3, -18.9], [0.4, -19.15], [1.05, -19.0], [1.45, -18.65], [1.6, -18.3], [1.68, -18.05], [1.66, -17.93], [1.96, -17.52], [1.93, -17.44], [1.73, -17.38], [1.72, -17.3], [1.76, -17.22], [1.64, -17.15], [1.73, -17.07], [1.62, -16.96], [1.62, -16.82], [1.38, -16.66], [0.9, -16.56], [0.7, -16.45]];

  // the frontal "Egyptian" eye at (ex,ey) in unit coords, size k
  function egEye(ex, ey, k, o = {}) {
    const E = [[ex - 0.33 * k, ey + 0.02 * k], [ex - 0.16 * k, ey - 0.09 * k], [ex + 0.08 * k, ey - 0.11 * k], [ex + 0.27 * k, ey - 0.04 * k], [ex + 0.33 * k, ey + 0.01 * k], [ex + 0.16 * k, ey + 0.07 * k], [ex - 0.08 * k, ey + 0.08 * k], [ex - 0.25 * k, ey + 0.06 * k]];
    fl(E, o.white || C.white, { smooth: true });
    dt(ex + 0.04 * k, ey - 0.01 * k, 0.085 * k, C.black);
    // kohl: upper lid, extended back
    ln([[ex + 0.34 * k, ey + 0.01 * k], [ex + 0.18 * k, ey - 0.08 * k], [ex - 0.08 * k, ey - 0.11 * k], [ex - 0.3 * k, ey - 0.03 * k], [ex - 0.66 * k, ey + 0.04 * k]], { w: (o.lw || 1.5), color: C.black, smooth: true, taper: [2, 5] });
    ln([[ex - 0.3 * k, ey + 0.05 * k], [ex + 0.0 * k, ey + 0.09 * k], [ex + 0.3 * k, ey + 0.03 * k]], { w: 0.7, color: C.black, smooth: true, taper: [2, 2] });
    // brow
    if (o.brow !== false) ln([[ex + 0.36 * k, ey - 0.2 * k], [ex + 0.05 * k, ey - 0.31 * k], [ex - 0.3 * k, ey - 0.26 * k], [ex - 0.62 * k, ey - 0.18 * k]], { w: (o.lw || 1.5) * 1.05, color: o.browC || C.black, smooth: true, taper: [3, 6] });
  }

  // broad usekh collar about neck base (cx,cy); sc scales radii
  function egCollar(cx, cy, sc, cols, o = {}) {
    const a0 = -0.06, a1 = Math.PI + 0.06;
    const rx = [0.82, 1.2, 1.6, 2.0, 2.4].map((v) => v * sc), ry = [0.4, 0.62, 0.86, 1.1, 1.36].map((v) => v * sc);
    for (let i = 0; i < rx.length - 1; i++) {
      const band = egArcBand(cx, cy, rx[i], ry[i], rx[i + 1], ry[i + 1], a0, a1, 26);
      fl(band, cols[i % cols.length], { gold: cols[i % cols.length] === C.gold });
    }
    // bead stripes on bands
    for (let i = 0; i < rx.length - 1; i++) {
      if (cols[i % cols.length] === C.gold) continue;
      const n = Math.round(14 * sc);
      for (let k = 1; k < n; k++) {
        const a = a0 + ((a1 - a0) * k) / n;
        ln([[cx + Math.cos(a) * rx[i], cy + Math.sin(a) * ry[i]], [cx + Math.cos(a) * rx[i + 1], cy + Math.sin(a) * ry[i + 1]]], { w: 0.35, alpha: 0.55, taper: [0, 0] });
      }
    }
    // drops
    const nd = o.drops || Math.round(16 * sc);
    const R1x = rx[rx.length - 1], R1y = ry[ry.length - 1];
    for (let k = 0; k < nd; k++) {
      const a = a0 + 0.08 + ((a1 - a0 - 0.16) * (k + 0.5)) / nd;
      const ca = Math.cos(a), sa = Math.sin(a);
      const bx = cx + ca * R1x, by = cy + sa * R1y;
      const L = 0.42 * sc, wd = 0.13 * sc;
      const nx = ca * R1y, ny = sa * R1x, nl = Math.hypot(nx, ny);
      const ux = nx / nl, uy = ny / nl, vx = -uy, vy = ux;
      const drop = [[bx + vx * wd, by + vy * wd], [bx + ux * L * 0.6 + vx * wd * 1.2, by + uy * L * 0.6 + vy * wd * 1.2], [bx + ux * L, by + uy * L], [bx + ux * L * 0.6 - vx * wd * 1.2, by + uy * L * 0.6 - vy * wd * 1.2], [bx - vx * wd, by - vy * wd]];
      fl(drop, k % 2 ? C.blue : C.green, { smooth: true });
      ln(drop, { closed: true, smooth: true, w: 0.45 });
    }
    for (let i = 0; i < rx.length; i++) ln(V.arcPts(cx, cy, rx[i], ry[i], a0, a1, 26), { w: i === 0 || i === rx.length - 1 ? 0.8 : 0.5, taper: [0, 0] });
  }

  // ------------------------------------------------------------------ bodies (layer: 'legs' | 'up' | 'top')
  function egMale(layer, o) {
    const skin = o.skin || C.red;
    if (layer === 'legs') {
      fl(M_LEG_B, skin, { smooth: true }); streak(M_LEG_B, skin, 84, { smooth: true }); ln(M_LEG_B, { closed: true, smooth: true });
      fl(M_LEG_F, skin, { smooth: true }); streak(M_LEG_F, skin, 82, { smooth: true }); ln(M_LEG_F, { closed: true, smooth: true });
      ln([[2.22, -5.95], [2.05, -5.6], [2.15, -5.25]], { w: 0.6, smooth: true });
      ln([[0.3, -5.9], [0.14, -5.55], [0.24, -5.2]], { w: 0.6, smooth: true });
      ln([[3.3, -0.1], [3.7, -0.32]], { w: 0.5 });
      ln([[0.6, -0.1], [0.95, -0.3]], { w: 0.5 });
      if (o.anklet) {
        fl(egLimb([[0.25, -1.3], [-1.0, -1.3]], [0.11, 0.11]), C.gold, { gold: true });
        fl(egLimb([[2.4, -1.3], [1.2, -1.3]], [0.11, 0.11]), C.gold, { gold: true });
      }
      return;
    }
    if (layer === 'up') {
      if (o.tail) sh([[-1.72, -11.2], [-2.15, -10.2], [-2.38, -8.2], [-2.32, -5.6], [-2.12, -5.55], [-2.12, -8.2], [-1.9, -10.0]], C.goldD, { smooth: true });
      fl(M_TORSO, skin, { smooth: true }); streak(M_TORSO, skin, 78, { smooth: true }); ln(M_TORSO, { closed: true, smooth: true });
      dt(1.9, -13.68, 0.07, C.redD);
      // kilt
      const KILT = o.apron
        ? [[-1.72, -11.5], [1.38, -11.5], [1.5, -10.8], [1.82, -9.9], [3.35, -7.25], [3.05, -6.98], [1.55, -6.95], [-0.2, -7.1], [-1.98, -7.35], [-2.02, -8.6], [-1.86, -10.3]]
        : [[-1.72, -11.5], [1.38, -11.5], [1.55, -10.4], [1.85, -8.6], [2.05, -7.3], [0.2, -7.05], [-1.98, -7.35], [-2.0, -8.8], [-1.86, -10.3]];
      fl(KILT, o.kiltC || C.linen); streak(KILT, o.kiltC || C.linen, 96, { to: '#8a7650', k: 0.16, dist: 7 }); ln(KILT, { closed: true });
      for (let k = 0; k < 6; k++) ln([[-1.6 + k * 0.55, -10.9], [-1.85 + k * 0.62, -7.45]], { w: 0.35, alpha: 0.45, taper: [2, 2] });
      if (o.apron) {
        const AP = [[1.25, -10.95], [1.82, -9.9], [3.35, -7.25], [3.05, -6.98], [1.55, -6.95], [0.95, -9.4]];
        sh(AP, C.white, {});
        for (let k = 1; k < 5; k++) ln([[1.15 + k * 0.12, -10.6], [1.45 + k * 0.38, -7.05]], { w: 0.3, alpha: 0.55, taper: [2, 2] });
        ln([[1.82, -9.9], [3.35, -7.25]], { w: 1.3, color: C.gold });
        ln([[3.05, -6.98], [1.55, -6.95]], { w: 1.1, color: C.gold });
      }
      // belt
      const BELT = [[-1.74, -11.68], [1.4, -11.68], [1.4, -11.08], [-1.74, -11.08]];
      fl(BELT, C.gold, { gold: true });
      for (let k = 0; k < 9; k++) {
        const x = -1.6 + k * 0.34;
        fl([[x, -11.6], [x + 0.17, -11.6], [x + 0.17, -11.16], [x, -11.16]], k % 2 ? C.crimson : C.blue);
      }
      ln(BELT, { closed: true, w: 0.7 });
      if (o.sash) sh([[1.3, -11.1], [1.6, -11.1], [1.9, -8.9], [1.6, -8.85]], C.crimson, {});
      return;
    }
  }

  function egFemale(layer, o) {
    const skin = o.skin || C.yel;
    if (layer === 'legs') {
      fl(F_LEG_B, skin, { smooth: true }); streak(F_LEG_B, skin, 84, { smooth: true, to: '#5a3008' }); ln(F_LEG_B, { closed: true, smooth: true });
      fl(F_LEG_F, skin, { smooth: true }); streak(F_LEG_F, skin, 82, { smooth: true, to: '#5a3008' }); ln(F_LEG_F, { closed: true, smooth: true });
      ln([[1.68, -5.95], [1.52, -5.6], [1.6, -5.25]], { w: 0.5, smooth: true });
      if (o.anklet) {
        fl(egLimb([[0.2, -1.25], [-0.85, -1.25]], [0.1, 0.1]), C.gold, { gold: true });
        fl(egLimb([[1.85, -1.25], [0.8, -1.25]], [0.1, 0.1]), C.gold, { gold: true });
      }
      return;
    }
    if (layer === 'up') {
      fl(F_TORSO, skin, { smooth: true }); streak(F_TORSO, skin, 78, { smooth: true, to: '#5a3008' }); ln(F_TORSO, { closed: true, smooth: true });
      dt(1.9, -13.52, 0.07, C.yelD);
      // sheath dress (semi-opaque linen shows the leg beneath)
      const DR = [[-1.42, -13.0], [1.32, -13.18], [1.1, -12.3], [1.06, -11.3], [1.32, -10.2], [1.52, -8.8], [1.62, -7.0], [1.42, -5.6], [1.3, -3.6], [1.4, -1.8], [1.66, -0.72], [-1.18, -0.72], [-1.02, -1.8], [-1.25, -3.8], [-1.46, -5.6], [-1.74, -7.6], [-1.78, -9.4], [-1.52, -10.5], [-1.3, -11.5], [-1.36, -12.4]];
      fl(DR, o.dressC || C.white, { alpha: 0.86, smooth: false });
      streak(DR, o.dressC || C.white, 92, { to: '#8a7650', k: 0.14, dist: 8 });
      for (let k = 0; k < 7; k++) ln([[-1.1 + k * 0.38, -12.6], [-1.0 + k * 0.4, -1.0]], { w: 0.3, alpha: 0.28, taper: [6, 6] });
      ln(DR, { closed: true, w: 0.85 });
      // straps
      sh([[0.55, -13.12], [0.9, -13.14], [1.45, -15.92], [1.1, -15.95]], o.dressC || C.white, {});
      sh([[-1.15, -13.02], [-0.85, -13.04], [-1.25, -15.95], [-1.6, -15.92]], o.dressC || C.white, {});
      // dress hem band + top band
      fl(egLimb([[-1.36, -12.95], [1.3, -13.13]], [0.13, 0.13]), C.crimson);
      // red sash
      sh([[0.9, -11.45], [1.25, -11.45], [1.7, -6.6], [1.38, -6.5]], C.crimson, {});
      sh([[-1.3, -11.6], [1.08, -11.6], [1.06, -11.2], [-1.3, -11.2]], C.crimson, {});
      return;
    }
  }

  // ------------------------------------------------------------------ live arms (the 67)
  const HAND = [[0, -0.27], [0.55, -0.31], [1.15, -0.27], [1.62, -0.18], [1.9, -0.07], [1.97, 0.03], [1.88, 0.1], [1.58, 0.09], [1.18, 0.1], [0.86, 0.14], [0.98, 0.33], [1.14, 0.5], [1.18, 0.61], [1.08, 0.66], [0.88, 0.52], [0.62, 0.34], [0.34, 0.28], [0, 0.26]];
  function egArm(fig, which, t, dyU) {
    const side = (which === 'back') === (fig.d > 0) ? 0 : 1;
    const A = V.G.arm(t, side, { off: fig.off || 0 });
    const y = A.y;
    const S0 = which === 'back' ? fig.Sb : fig.Sf;
    const E0 = which === 'back' ? fig.Eb : fig.Ef;
    const S = [S0[0], S0[1] + dyU];
    const E = [E0[0] + 0.05 * y, E0[1] - 0.36 * y + dyU];
    const th = y * (fig.th || 0.42);
    const fx0 = Math.cos(th), fy0 = -Math.sin(th);
    const FL = fig.FL || 3.15;
    const Wr = [E[0] + fx0 * FL, E[1] + fy0 * FL];
    const um = [V.lerp(S[0], E[0], 0.5), V.lerp(S[1], E[1], 0.5)];
    const fm = [V.lerp(E[0], Wr[0], 0.5), V.lerp(E[1], Wr[1], 0.5)];
    const lim = egLimb([S, um, E, fm, Wr], [0.5, 0.46, 0.43, 0.36, 0.28].map((v) => v * (fig.aw || 1)));
    fl(lim, fig.skin, { smooth: true });
    ln(lim, { closed: true, smooth: true, w: 1 });
    // hand (palm up) — the wrist keeps the palm nearly level, like the real gesture
    const ph = th * 0.3;
    const fx = Math.cos(ph), fy = -Math.sin(ph);
    const nx = fy, ny = -fx; // "up" normal (unit coords, y down)
    const hs = fig.hs || 1;
    const hp = HAND.map(([a, b]) => [Wr[0] + (fx * a + nx * b) * hs - fx0 * 0.08, Wr[1] + (fy * a + ny * b) * hs - fy0 * 0.08]);
    fl(hp, fig.skin, { smooth: true });
    ln(hp, { closed: true, smooth: true, w: 0.95 });
    if (!fig.small) {
      // a few paint losses that belong to this arm (they move with it)
      for (let k = 0; k < 4; k++) {
        const hk = V.hash(fig.x * 0.37 + k * 7.1 + (which === 'back' ? 3 : 0));
        const q = 0.12 + 0.76 * V.hash(fig.x * 0.11 + k * 3.3 + (which === 'back' ? 9 : 0));
        const onFore = k < 3;
        const A0 = onFore ? E : S, A1 = onFore ? Wr : E;
        const px = V.lerp(A0[0], A1[0], q), py = V.lerp(A0[1], A1[1], q);
        const tx = A1[0] - A0[0], ty = A1[1] - A0[1], tl = Math.hypot(tx, ty) || 1;
        const off = (hk - 0.5) * 0.45;
        const [X, Y] = PT(px - (ty / tl) * off, py + (tx / tl) * off);
        V.dot(X, Y, 0.9 + hk * 1.9, '#eadcb4', { seed: 500 + k });
      }
    }
    if (!fig.small) {
      ln([[Wr[0] + (fx * 1.02 + nx * 0.0) * hs, Wr[1] + (fy * 1.02 + ny * 0.0) * hs], [Wr[0] + (fx * 1.78 + nx * -0.04) * hs, Wr[1] + (fy * 1.78 + ny * -0.04) * hs]], { w: 0.4, alpha: 0.6, taper: [2, 2] });
      ln([[Wr[0] + (fx * 1.0 + nx * -0.14) * hs, Wr[1] + (fy * 1.0 + ny * -0.14) * hs], [Wr[0] + (fx * 1.6 + nx * -0.13) * hs, Wr[1] + (fy * 1.6 + ny * -0.13) * hs]], { w: 0.35, alpha: 0.45, taper: [2, 2] });
    }
    // bracelet + armlet
    if (fig.bracelet) {
      const bw = 0.34 * (fig.aw || 1);
      const qx = fx0, qy = fy0, rx = qy, ry = -qx;
      const bc = [[Wr[0] - qx * 0.62 + rx * bw * 1.18, Wr[1] - qy * 0.62 + ry * bw * 1.18], [Wr[0] - qx * 0.2 + rx * bw, Wr[1] - qy * 0.2 + ry * bw], [Wr[0] - qx * 0.2 - rx * bw, Wr[1] - qy * 0.2 - ry * bw], [Wr[0] - qx * 0.62 - rx * bw * 1.18, Wr[1] - qy * 0.62 - ry * bw * 1.18]];
      fl(bc, C.gold);
      const mid = [[V.lerp(bc[0][0], bc[1][0], 0.5), V.lerp(bc[0][1], bc[1][1], 0.5)], [V.lerp(bc[3][0], bc[2][0], 0.5), V.lerp(bc[3][1], bc[2][1], 0.5)]];
      ln(mid, { w: 1.1, color: fig.bracelet, taper: [0, 0] });
      ln(bc, { closed: true, w: 0.7 });
    }
    if (fig.bracelet && which === 'front') {
      // armlet on the upper arm
      const ux = E[0] - S[0], uy = E[1] - S[1], ul = Math.hypot(ux, uy);
      const ax = ux / ul, ay = uy / ul, px = -ay, py = ax;
      const c0 = [S[0] + ux * 0.3, S[1] + uy * 0.3], c1 = [S[0] + ux * 0.42, S[1] + uy * 0.42];
      const aw = 0.47 * (fig.aw || 1);
      const am = [[c0[0] + px * aw, c0[1] + py * aw], [c1[0] + px * aw, c1[1] + py * aw], [c1[0] - px * aw, c1[1] - py * aw], [c0[0] - px * aw, c0[1] - py * aw]];
      fl(am, C.gold);
      ln([[V.lerp(c0[0], c1[0], 0.5) + px * aw, V.lerp(c0[1], c1[1], 0.5) + py * aw], [V.lerp(c0[0], c1[0], 0.5) - px * aw, V.lerp(c0[1], c1[1], 0.5) - py * aw]], { w: 0.9, color: fig.bracelet, taper: [0, 0] });
      ln(am, { closed: true, w: 0.6 });
    }
    return { y, Wr };
  }
  // which = 'back' (drawn BEFORE the torso sprite: the far arm passes behind the body) | 'front' (after it)
  function egArms(fig, t, dy, which) {
    egF(fig.x, fig.gy, fig.g, fig.d, fig.lw);
    egArm(fig, which, t, dy / fig.g);
  }

  // =================================================================== CAST
  const MALE_ARMS = { Sb: [-2.1, -15.25], Sf: [2.5, -15.3], Eb: [0.35, -12.4], Ef: [2.95, -12.3], FL: 3.1 };
  const FEM_ARMS = { Sb: [-1.8, -15.25], Sf: [2.1, -15.3], Eb: [0.3, -12.45], Ef: [2.5, -12.35], FL: 2.95, aw: 0.88, hs: 0.93 };
  const PHARAOH = Object.assign({ x: 762, gy: GL, g: 30, d: 1, skin: C.red, bracelet: C.lapis, lw: 0.62 }, MALE_ARMS);
  const HATHOR = Object.assign({ x: 1372, gy: GL, g: 30, d: -1, skin: C.yel, bracelet: C.green, lw: 0.62 }, FEM_ARMS);
  const HORUS = Object.assign({ x: 1748, gy: GL, g: 30, d: -1, skin: C.red, bracelet: C.crimson, lw: 0.62 }, MALE_ARMS);
  const GUESTS = [];
  for (let i = 0; i < 9; i++) {
    const fem = i % 2 === 1;
    GUESTS.push(Object.assign({}, fem ? FEM_ARMS : MALE_ARMS, { x: 100 + i * 124, gy: GL2, g: 8.5, d: 1, skin: fem ? C.yel : C.red, lw: 0.42, small: true, fem, off: -0.055 * i, aw: fem ? 1.12 : 1.2, hs: 1.3, th: 0.48, i }));
  }

  // sacred baboon on a plinth at the end of the banquet row (baboons greet the sun with raised hands — this one does 67)
  const BAB_X = 1262, BAB_Y = GL2 - 13, BK = 1.22;
  const BABOON = { x: BAB_X, gy: BAB_Y, g: 6 * BK, d: 1, skin: '#7d5f43', lw: 0.42, small: true, off: 0, Sb: [0.4, -13.2], Sf: [1.8, -13.0], Eb: [1.6, -8.6], Ef: [3.0, -8.35], FL: 4.3, aw: 1.6, hs: 1.3, th: 0.36 };
  function egBaboon(layer) {
    const B = (pts) => pts.map(([x, y]) => [BAB_X + x * BK, BAB_Y + y * BK]);
    const S = (pts, col, o = {}) => { const q = B(pts); V.fill(q, { color: col, flat: true, smooth: o.smooth !== false, seed: SEED++ }); V.ink(q, { w: 0.42, closed: true, smooth: o.smooth !== false, taper: [0, 0], step: 2, color: C.ink, seed: SEED++ }); };
    const L = (pts, o = {}) => V.ink(B(pts), { w: o.w || 0.35, color: o.color || C.ink, alpha: o.alpha == null ? 1 : o.alpha, smooth: true, taper: [2, 2], step: 2, seed: SEED++ });
    if (layer === 'legs') {
      const pl = [[BAB_X - 50, BAB_Y], [BAB_X + 56, BAB_Y], [BAB_X + 56, GL2], [BAB_X - 50, GL2]];
      V.fill(pl, { color: C.lapis, flat: true, seed: SEED++ });
      V.fill([[BAB_X - 53, BAB_Y - 3], [BAB_X + 59, BAB_Y - 3], [BAB_X + 59, BAB_Y + 2], [BAB_X - 53, BAB_Y + 2]], { color: C.gold, flat: true, seed: SEED++ });
      for (let x = -42; x < 52; x += 12) V.fill([[BAB_X + x, BAB_Y + 4], [BAB_X + x + 5, BAB_Y + 4], [BAB_X + x + 5, GL2 - 2], [BAB_X + x, GL2 - 2]], { color: C.gold, flat: true, seed: SEED++ });
      V.ink(pl, { w: 0.45, closed: true, taper: [0, 0], step: 3, color: C.ink, seed: SEED++ });
      return;
    }
    if (layer !== 'up') return;
    const fur = '#7d5f43', furD = '#644a33', mane = '#a8875f';
    S([[-22, -6], [-40, -5], [-54, -10], [-58, -19], [-52, -21], [-41, -14], [-24, -15]], fur);
    S([[-24, -2], [-28, -20], [-22, -40], [-6, -48], [12, -46], [20, -30], [22, -12], [18, -2]], fur);
    // drawn-up leg + foot
    S([[-4, -37], [19, -41], [26, -34], [24, -7], [15, -7], [15, -28], [-2, -27]], furD, { smooth: false });
    S([[11, -1], [15, -8], [31, -8], [34, -1]], furD);
    // shaggy mane: a hood round the back of the head and a cape with a zigzag hem
    const hem = [];
    for (let k = 0; k <= 8; k++) hem.push([18 - k * 5.4, -46 + (k % 2 ? 8 : 0) - k * 1.0]);
    S([[20, -88], [24, -66], ...hem, [-30, -62], [-30, -84], [-20, -102], [-4, -112], [12, -112], [20, -104]], mane, { smooth: false });
    for (let k = 0; k < 8; k++) L([[-22 + k * 5.5, -100 + k * 1.5], [-26 + k * 5.6, -56 + k * 0.6]], { w: 0.3, color: furD, alpha: 0.85 });
    // long, straight dog-like muzzle (bare skin) under a heavy brow
    S([[12, -104], [26, -102.5], [40, -98], [51, -93], [57, -89.5], [56, -85], [47, -81.5], [35, -79.5], [24, -79.5], [16, -83], [12, -92]], '#5e4535', { smooth: false });
    L([[11, -101.5], [21, -104.5], [32, -101]], { w: 0.85 });
    V.dot(BAB_X + 23 * BK, BAB_Y - 97 * BK, 2.6, C.gold, { seed: SEED++ });
    V.dot(BAB_X + 23 * BK, BAB_Y - 97 * BK, 1.5, C.black, { seed: SEED++ });
    V.dot(BAB_X + 55.5 * BK, BAB_Y - 88.5 * BK, 1.3, C.ink, { seed: SEED++ });
    L([[30, -81.5], [44, -82.5]], { w: 0.3, alpha: 0.6, color: '#2a1a10' });
    L([[16, -96], [24, -92], [34, -92]], { w: 0.3, alpha: 0.5, color: '#a8875f' });
  }

  // ------------------------------------------------------------------ heads
  function egPharaohHead(layer) {
    if (layer === 'up') {
      sh(M_FACE, C.red, { smooth: true });
      // ear
      sh(ell(0.28, -17.72, 0.22, 0.36, 14), C.red, {});
      ln([[0.34, -17.95], [0.22, -17.75], [0.32, -17.52]], { w: 0.45, smooth: true });
      egEye(1.24, -17.98, 1);
      ln([[1.74, -17.1], [1.62, -17.1]], { w: 0.5 });
      // nemes
      const NEM = [[1.7, -18.36], [1.72, -18.62], [1.45, -19.05], [0.85, -19.4], [0.0, -19.42], [-0.75, -19.12], [-1.25, -18.55], [-1.55, -17.7], [-1.85, -16.85], [-2.08, -16.12], [-1.2, -15.98], [-0.48, -16.22], [-0.02, -16.85], [0.04, -17.35], [0.06, -17.75], [0.3, -18.12], [0.75, -18.28], [1.2, -18.34]];
      fl(NEM, C.goldL, { smooth: true, gold: true });
      V.hatch(P(V.smoothPts(NEM, true, 6)), { dist: 0.36 * F.g, angle: -6, color: C.lapis, brush: 'ink', w: 1.25, rand: 0.02, seed: SEED++ });
      ln(NEM, { closed: true, smooth: true, w: 1 });
      // brow band
      const BAND = egLimb([[1.72, -18.48], [1.2, -18.44], [0.6, -18.3], [0.2, -18.02], [0.06, -17.7]], [0.1, 0.1, 0.1, 0.1, 0.1]);
      sh(BAND, C.gold, { smooth: true, gold: true });
      // uraeus
      sh([[1.6, -18.56], [1.72, -18.92], [1.86, -19.18], [1.98, -19.12], [1.92, -18.95], [1.86, -18.82], [1.84, -18.5]], C.gold, { smooth: true, gold: true });
      dt(1.9, -19.07, 0.04, C.ink);
      ln([[1.62, -18.8], [1.0, -19.2], [0.4, -19.3]], { w: 0.6, smooth: true, color: C.goldD });
      // false beard + strap
      sh([[1.26, -16.7], [1.56, -16.72], [1.62, -15.72], [1.34, -15.68]], C.lapis, {});
      for (let k = 1; k < 5; k++) ln([[1.28 + k * 0.012, -16.7 + k * 0.2], [1.58 + k * 0.012, -16.7 + k * 0.2]], { w: 0.35, color: C.goldL, taper: [0, 0] });
      ln([[1.3, -16.66], [0.85, -16.98], [0.42, -17.42]], { w: 0.55, smooth: true });
      return;
    }
    if (layer === 'top') {
      const LAP = [[-0.02, -17.38], [0.5, -17.22], [0.72, -16.4], [0.92, -15.0], [0.12, -14.96], [-0.08, -16.2]];
      fl(LAP, C.goldL, { gold: true });
      V.hatch(P(LAP), { dist: 0.34 * F.g, angle: 0, color: C.lapis, brush: 'ink', w: 1.2, rand: 0.02, seed: SEED++ });
      ln(LAP, { closed: true, w: 1 });
      fl([[0.12, -15.2], [0.92, -15.2], [0.92, -14.96], [0.12, -14.96]], C.gold, { gold: true });
    }
  }

  function egHathorHead(layer) {
    if (layer === 'up') {
      // wig back mass
      const WIG = [[1.45, -18.5], [1.35, -19.0], [0.8, -19.42], [0.0, -19.5], [-0.8, -19.26], [-1.35, -18.7], [-1.62, -17.8], [-1.78, -16.6], [-1.84, -15.2], [-1.7, -14.3], [-0.85, -14.25], [-0.55, -15.6], [-0.38, -16.6], [-0.12, -17.3], [0.2, -17.86], [0.65, -18.2], [1.2, -18.3]];
      sh(F_FACE, C.yel, { smooth: true });
      egEye(1.18, -17.98, 0.95);
      ln([[1.66, -17.15], [1.56, -17.15]], { w: 0.5 });
      fl([[1.73, -17.22], [1.64, -17.16], [1.73, -17.08], [1.68, -17.16]], C.crimson);
      fl(WIG, C.lapis, { smooth: true });
      V.hatch(P(V.smoothPts(WIG, true, 6)), { dist: 0.2 * F.g, angle: 90, color: C.lapisD, brush: 'ink', w: 0.55, rand: 0.05, seed: SEED++ });
      ln(WIG, { closed: true, smooth: true, w: 1 });
      // fillet / headband with lotus knot
      const FIL = egLimb([[1.5, -18.48], [0.8, -18.6], [0.0, -18.72], [-0.9, -18.5], [-1.45, -18.0]], [0.11, 0.11, 0.11, 0.11, 0.11]);
      sh(FIL, C.crimson, { smooth: true });
      // modius
      sh([[-0.45, -19.4], [0.85, -19.4], [0.95, -19.95], [-0.55, -19.95]], C.gold, { gold: true });
      for (let k = 0; k < 6; k++) ln([[-0.35 + k * 0.24, -19.48], [-0.35 + k * 0.24, -19.88]], { w: 0.4, color: C.crimson, taper: [0, 0] });
      // sun disk between cow horns
      const DISK = ell(0.2, -21.15, 1.02, 1.02, 30);
      fl(ell(0.2, -21.15, 1.12, 1.12, 30), C.gold, { gold: true });
      sh(DISK, '#c2381f', {});
      const HL = [[-0.2, -19.92], [-0.95, -20.25], [-1.35, -20.95], [-1.3, -21.8], [-1.05, -22.35], [-0.92, -22.25], [-1.08, -21.75], [-1.08, -21.0], [-0.75, -20.48], [-0.12, -20.18]];
      const HR = HL.map(([x, y]) => [0.4 - x, y]);
      sh(HL, C.black, { smooth: true, lc: C.ink });
      sh(HR, C.black, { smooth: true, lc: C.ink });
      // uraeus on the disk
      sh([[1.0, -20.0], [1.12, -20.55], [1.28, -20.9], [1.42, -20.82], [1.34, -20.6], [1.26, -20.4], [1.24, -20.0]], C.gold, { smooth: true, gold: true });
      dt(1.33, -20.78, 0.045, C.ink);
      return;
    }
    if (layer === 'top') {
      const LAP = [[0.12, -17.9], [0.62, -17.66], [0.86, -15.8], [1.02, -14.05], [0.2, -13.98], [0.02, -15.5], [-0.06, -17.0]];
      fl(LAP, C.lapis, { smooth: true });
      V.hatch(P(V.smoothPts(LAP, true, 6)), { dist: 0.2 * F.g, angle: 85, color: C.lapisD, brush: 'ink', w: 0.55, rand: 0.05, seed: SEED++ });
      ln(LAP, { closed: true, smooth: true, w: 1 });
      sh([[0.16, -14.42], [1.0, -14.45], [1.02, -14.12], [0.18, -14.1]], C.gold, { gold: true });
      // big round earring peeking under the wig
      sh(ell(0.02, -16.95, 0.2, 0.2, 14), C.gold, { gold: true });
    }
  }

  function egHorusHead(layer) {
    if (layer === 'up') {
      // wig back mass
      const WIG = [[0.7, -18.92], [0.1, -19.25], [-0.62, -19.05], [-1.12, -18.45], [-1.38, -17.4], [-1.5, -16.2], [-1.45, -14.6], [-0.62, -14.55], [-0.38, -15.9], [-0.25, -16.8], [0.06, -17.6], [0.45, -18.3]];
      fl(WIG, C.lapis, { smooth: true });
      V.hatch(P(V.smoothPts(WIG, true, 6)), { dist: 0.2 * F.g, angle: 90, color: C.lapisD, brush: 'ink', w: 0.55, rand: 0.05, seed: SEED++ });
      ln(WIG, { closed: true, smooth: true, w: 1 });
      // falcon head
      const HEAD = [[-0.42, -16.72], [-0.55, -17.5], [-0.6, -18.35], [-0.28, -19.0], [0.35, -19.25], [1.0, -19.08], [1.45, -18.72], [1.7, -18.4], [1.95, -18.24], [2.28, -18.04], [2.46, -17.72], [2.44, -17.36], [2.3, -17.24], [2.28, -17.44], [2.14, -17.54], [1.95, -17.5], [1.7, -17.4], [1.45, -17.05], [1.15, -16.76], [0.72, -16.56]];
      sh(HEAD, '#2c6464', { smooth: true });
      // pale cheek
      fl([[1.55, -17.86], [1.36, -17.48], [1.5, -17.15], [1.15, -16.82], [0.55, -16.75], [0.4, -17.2], [0.75, -17.55], [1.05, -17.72]], C.plasterL, { smooth: true });
      // feather scallops on crown
      for (let k = 0; k < 5; k++) ln(arcU(-0.1 + k * 0.32, -18.55 + (k % 2) * 0.18, 0.16, 0.12, 0.2, Math.PI - 0.2, 6), { w: 0.4, color: '#173c3c', taper: [1, 1] });
      // beak + cere
      sh([[1.7, -18.4], [1.95, -18.24], [2.28, -18.04], [2.46, -17.72], [2.44, -17.36], [2.3, -17.24], [2.28, -17.44], [2.14, -17.54], [1.95, -17.5], [1.78, -17.72]], '#36475a', { smooth: true });
      sh([[1.62, -18.42], [1.86, -18.3], [1.84, -17.8], [1.68, -17.82]], C.yel, {});
      // eye with gold ring + falcon "tear" mark
      fl(ell(1.2, -18.0, 0.27, 0.25, 16), C.gold);
      dt(1.22, -18.0, 0.15, C.black);
      dt(1.26, -18.04, 0.04, C.white);
      ln(ell(1.2, -18.0, 0.27, 0.25, 16), { closed: true, w: 0.9 });
      ln([[0.95, -18.02], [0.6, -18.08]], { w: 1.2, color: C.black, taper: [1, 4] });
      ln([[1.16, -17.76], [1.05, -17.4], [0.92, -17.0]], { w: 1.6, color: '#173030', smooth: true, taper: [2, 4] });
      // double crown (pschent): red deshret behind, white hedjet in front, red cap rim over its base
      const DESH = [[-0.85, -18.62], [1.52, -18.62], [1.48, -19.75], [-0.3, -19.75], [-0.3, -22.25], [-0.95, -22.25], [-0.95, -19.0]];
      sh(DESH, '#b8332a', {});
      const HED = [[-0.22, -19.6], [1.3, -19.6], [1.2, -20.55], [0.98, -21.5], [0.8, -22.3], [0.5, -22.72], [0.2, -22.45], [0.06, -21.7], [-0.12, -20.6]];
      sh(HED, '#f3ecd8', { smooth: true });
      ln([[0.5, -22.72], [0.5, -22.95]], { w: 1.4, color: C.ink, taper: [0, 0] });
      sh([[-0.85, -18.62], [1.52, -18.62], [1.5, -19.42], [-0.9, -19.42]], '#b8332a', {});
      ln([[1.3, -19.38], [1.72, -19.78], [2.02, -20.36], [1.98, -20.78], [1.76, -20.82], [1.7, -20.58], [1.86, -20.5]], { w: 0.95, color: '#b8332a', smooth: true, taper: [0, 3] });
      sh([[1.36, -18.75], [1.5, -19.25], [1.66, -19.5], [1.78, -19.42], [1.7, -19.2], [1.62, -18.7]], C.gold, { smooth: true, gold: true });
      return;
    }
    if (layer === 'top') {
      const LAP = [[0.15, -17.62], [0.68, -17.32], [0.86, -15.6], [1.0, -14.25], [0.2, -14.2], [0.02, -15.6]];
      fl(LAP, C.lapis, { smooth: true });
      V.hatch(P(V.smoothPts(LAP, true, 6)), { dist: 0.2 * F.g, angle: 85, color: C.lapisD, brush: 'ink', w: 0.55, rand: 0.05, seed: SEED++ });
      ln(LAP, { closed: true, smooth: true, w: 1 });
      sh([[0.18, -14.6], [0.98, -14.62], [1.0, -14.25], [0.2, -14.22]], C.gold, { gold: true });
    }
  }

  // small banquet guests
  function egGuest(G, layer) {
    egF(G.x, G.gy, G.g, G.d, G.lw);
    if (!G.fem) {
      if (layer === 'legs') return egMale('legs', { skin: C.red });
      if (layer === 'up') {
        egMale('up', { skin: C.red });
        sh(M_FACE, C.red, { smooth: true });
        // short round wig (leaves forehead, eye and cheek free)
        const WG = [[1.52, -18.55], [1.28, -19.22], [0.4, -19.58], [-0.5, -19.38], [-1.08, -18.78], [-1.22, -17.7], [-1.06, -16.72], [-0.45, -16.58], [-0.05, -17.1], [0.22, -17.62], [0.5, -18.2], [1.1, -18.44]];
        sh(WG, G.i % 4 === 0 ? C.black : '#22262e', { smooth: true, lc: C.ink });
        for (let k = 0; k < 5; k++) ln([[-0.9 + k * 0.4, -19.2 + k * 0.05], [-1.0 + k * 0.42, -17.0]], { w: 0.5, color: '#4a4a52', alpha: 0.7, taper: [2, 2] });
        fl(ell(1.24, -17.98, 0.32, 0.15, 12), C.white);
        dt(1.3, -17.98, 0.12, C.black);
        ln([[1.56, -17.98], [1.2, -18.1], [0.85, -17.96]], { w: 1.0, color: C.black, taper: [1, 2] });
        ln([[1.55, -18.26], [1.15, -18.36], [0.85, -18.24]], { w: 1.0, color: C.black, taper: [1, 2] });
        // perfume cone
        sh([[-0.3, -19.4], [0.85, -19.45], [0.45, -20.75], [0.15, -20.8]], '#f0e2b0', {});
        ln([[0.2, -19.5], [0.38, -20.5]], { w: 0.8, color: C.ochre });
        return;
      }
      if (layer === 'top') { egCollar(0.15, -16.05, 1, [C.blue, C.gold, C.green, C.crimson]); return; }
    } else {
      if (layer === 'legs') return egFemale('legs', { skin: C.yel });
      if (layer === 'up') {
        egFemale('up', { skin: C.yel });
        sh(F_FACE, C.yel, { smooth: true });
        const WG = [[1.44, -18.55], [1.3, -19.02], [0.75, -19.46], [0.0, -19.54], [-0.8, -19.28], [-1.35, -18.72], [-1.6, -17.8], [-1.78, -16.6], [-1.85, -15.0], [-1.7, -13.9], [-0.8, -13.9], [-0.5, -15.5], [-0.32, -16.6], [-0.06, -17.3], [0.22, -17.85], [0.55, -18.3], [1.1, -18.46]];
        sh(WG, C.black, { smooth: true, lc: C.ink });
        for (let k = 0; k < 6; k++) ln([[-1.2 + k * 0.32, -19.0], [-1.5 + k * 0.3, -14.2]], { w: 0.5, color: '#4a4a52', alpha: 0.7, taper: [2, 2] });
        fl(ell(1.18, -17.98, 0.3, 0.14, 12), C.white);
        dt(1.24, -17.98, 0.11, C.black);
        ln([[1.48, -17.98], [1.15, -18.1], [0.8, -17.96]], { w: 1.0, color: C.black, taper: [1, 2] });
        ln([[1.48, -18.26], [1.1, -18.36], [0.82, -18.24]], { w: 0.9, color: C.black, taper: [1, 2] });
        fl([[1.72, -17.22], [1.62, -17.15], [1.72, -17.07]], C.crimson);
        // fillet + lotus bud over the brow
        fl(egLimb([[1.45, -18.5], [0.4, -18.72], [-0.9, -18.5], [-1.5, -17.9]], [0.14, 0.14, 0.14, 0.14]), C.crimson, { smooth: true });
        sh([[1.3, -18.6], [1.55, -18.75], [1.9, -18.55], [1.75, -18.2], [1.45, -18.3]], C.blue, { smooth: true });
        // perfume cone
        sh([[-0.35, -19.4], [0.8, -19.45], [0.4, -20.75], [0.1, -20.8]], '#f0e2b0', {});
        ln([[0.15, -19.5], [0.33, -20.5]], { w: 0.8, color: C.ochre });
        return;
      }
      if (layer === 'top') {
        egCollar(0.12, -16.05, 0.88, [C.green, C.gold, C.blue, C.crimson]);
        const LAP = [[0.1, -17.9], [0.6, -17.66], [0.85, -15.8], [1.0, -14.3], [0.2, -14.25], [0.0, -15.5], [-0.06, -17.0]];
        sh(LAP, C.black, { smooth: true, lc: C.ink });
        return;
      }
    }
  }

  // =================================================================== ANUBIS ON HIS SHRINE (static parts)
  const AX = 118, AY = 606; // top of the cornice
  const JK = (pts) => pts.map(([x, y]) => [AX + x, AY + y]);
  function egShrine() {
    // sledge runner
    const run = [[86, GL], [552, GL], [566, GL - 6], [574, GL - 18], [566, GL - 20], [556, GL - 12], [86, GL - 12]];
    V.fill(run, { color: C.wood, flat: true, seed: SEED++ });
    V.ink(run, { w: 0.6, closed: true, taper: [0, 0], wob: 0.2, step: 4, color: C.ink, seed: SEED++ });
    for (let x = 130; x < 540; x += 82) {
      const r = V.rectPts(x, GL - 18, 14, 6);
      V.fill(r, { color: '#5c3519', flat: true, seed: SEED++ });
    }
    // chest
    const chest = V.rectPts(108, 650, 426, GL - 12 - 650);
    V.fill(chest, { color: C.gold, flat: true, seed: SEED++ });
    V.hatch(chest, { dist: 5, angle: 88, color: '#c9971f', brush: 'marker', w: 0.45, rand: 0.4, seed: SEED++ });
    egGold(chest);
    V.fill(V.rectPts(108, 650, 426, 8), { color: C.lapis, flat: true, seed: SEED++ });
    V.fill(V.rectPts(108, GL - 20, 426, 8), { color: C.lapis, flat: true, seed: SEED++ });
    const np = 9, pw = 426 / np;
    for (let i = 0; i < np; i++) {
      const x = 108 + i * pw;
      V.ink([[x, 658], [x, GL - 20]], { w: 0.45, taper: [0, 0], step: 4, color: C.ink, seed: SEED++ });
      const cx = x + pw / 2, top = 668, bot = GL - 28;
      if (i % 2 === 0) {
        // djed
        V.fill([[cx - 6, top + 22], [cx + 6, top + 22], [cx + 7, bot], [cx - 7, bot]], { color: C.lapis, flat: true, seed: SEED++ });
        for (let k = 0; k < 4; k++) V.fill(V.rectPts(cx - 15, top + k * 5.5, 30, 3.2), { color: C.lapis, flat: true, seed: SEED++ });
      } else {
        // tyet (knot of Isis)
        V.ink(V.ellipsePts(cx, top + 12, 8, 11, 16), { w: 1.1, color: C.crimson, closed: true, taper: [0, 0], step: 2, seed: SEED++ });
        V.fill([[cx - 16, top + 24], [cx + 16, top + 24], [cx + 16, top + 29], [cx - 16, top + 29]], { color: C.crimson, flat: true, seed: SEED++ });
        V.fill([[cx - 4, top + 29], [cx + 4, top + 29], [cx + 9, bot], [cx - 9, bot]], { color: C.crimson, flat: true, seed: SEED++ });
      }
    }
    V.ink(chest, { w: 0.7, closed: true, taper: [0, 0], wob: 0.2, step: 4, color: C.ink, seed: SEED++ });
    // torus moulding
    const tor = V.rectPts(104, 640, 434, 10);
    V.fill(tor, { color: C.gold, flat: true, seed: SEED++ });
    for (let x = 108; x < 536; x += 9) V.ink([[x, 650], [x + 6, 640]], { w: 0.7, color: C.lapis, taper: [0, 0], step: 3, seed: SEED++ });
    V.ink(tor, { w: 0.55, closed: true, taper: [0, 0], step: 4, color: C.ink, seed: SEED++ });
    // cavetto cornice with tongues
    const cor = [[98, AY], [544, AY], [540, 618], [536, 640], [106, 640], [102, 618]];
    V.fill(cor, { color: C.gold, flat: true, seed: SEED++ });
    egGold(cor);
    const tc = [C.lapis, C.green, C.crimson];
    let k = 0;
    for (let x = 104; x < 536; x += 14) {
      V.fill([[x + 2, AY + 3], [x + 11, AY + 3], [x + 10.5, 637], [x + 2.5, 637]], { color: tc[k++ % 3], flat: true, seed: SEED++ });
    }
    V.ink(cor, { w: 0.7, closed: true, taper: [0, 0], step: 4, color: C.ink, seed: SEED++ });
    // winged sun disk on the cornice
    const cx = 321, cy = 622;
    const wing = (s) => {
      const pts = [[cx + s * 12, cy - 6], [cx + s * 50, cy - 11], [cx + s * 96, cy - 9], [cx + s * 104, cy - 4], [cx + s * 80, cy + 2], [cx + s * 40, cy + 8], [cx + s * 12, cy + 7]];
      V.fill(pts, { color: C.lapis, flat: true, seed: SEED++ });
      V.fill([[cx + s * 14, cy - 1], [cx + s * 60, cy - 2], [cx + s * 92, cy - 3], [cx + s * 60, cy + 4], [cx + s * 14, cy + 5]], { color: C.green, flat: true, seed: SEED++ });
      for (let f = 1; f < 9; f++) V.ink([[cx + s * (14 + f * 10), cy - 8], [cx + s * (12 + f * 9), cy + 6]], { w: 0.3, color: C.ink, taper: [0, 0], step: 2, seed: SEED++ });
      V.ink(pts, { w: 0.5, closed: true, taper: [0, 0], step: 3, color: C.ink, seed: SEED++ });
    };
    wing(-1); wing(1);
    V.fill(V.ellipsePts(cx, cy - 1, 11, 11, 18), { color: '#c2381f', flat: true, seed: SEED++ });
    V.ink(V.ellipsePts(cx, cy - 1, 11, 11, 18), { w: 0.55, closed: true, taper: [0, 0], step: 2, color: C.ink, seed: SEED++ });
    // ---- the jackal (body, head, ears, tail; forelegs are live)
    const tail = JK([[24, -44], [8, -26], [0, 10], [2, 60], [10, 92], [18, 64], [18, 12], [30, -24]]);
    V.fill(tail, { color: C.black, flat: true, smooth: true, seed: SEED++ });
    V.ink(tail, { w: 0.4, color: '#5b4a3c', closed: true, smooth: true, taper: [0, 0], step: 3, seed: SEED++ });
    const body = JK([[24, -6], [16, -30], [22, -56], [44, -80], [84, -94], [130, -90], [178, -82], [222, -84], [256, -94], [280, -116], [294, -150], [304, -182], [316, -200], [338, -209], [360, -204], [376, -194], [404, -181], [428, -170], [442, -163], [440, -156], [428, -153], [398, -151], [370, -149], [352, -143], [338, -126], [328, -100], [326, -70], [318, -42], [306, -22], [290, -8], [250, -3], [190, -2], [110, -2], [60, -3]]);
    V.fill(body, { color: C.black, flat: true, smooth: true, seed: SEED++ });
    V.hatch(V.smoothPts(body, true, 5), { dist: 6, angle: 8, color: '#2c2622', brush: 'marker', w: 0.5, rand: 0.4, seed: SEED++ });
    // hind leg + paw
    const hind = JK([[112, -13], [158, -15], [180, -11], [183, -2], [112, -2]]);
    V.fill(hind, { color: C.black, flat: true, smooth: true, seed: SEED++ });
    V.ink(JK([[40, -72], [80, -80], [122, -62], [144, -34], [154, -12]]), { w: 0.6, color: '#5b4a3c', smooth: true, taper: [6, 6], step: 3, seed: SEED++ });
    V.ink(JK([[118, -13], [160, -15], [181, -10]]), { w: 0.4, color: '#5b4a3c', smooth: true, step: 2, seed: SEED++ });
    V.ink(JK([[168, -7], [176, -4]]), { w: 0.35, color: C.goldD, step: 2, seed: SEED++ });
    V.ink(JK([[160, -8], [168, -4]]), { w: 0.35, color: C.goldD, step: 2, seed: SEED++ });
    // ears
    const earB = JK([[314, -198], [310, -246], [318, -270], [330, -238], [336, -204]]);
    const earF = JK([[330, -206], [334, -252], [346, -274], [354, -240], [358, -204]]);
    V.fill(earB, { color: C.black, flat: true, smooth: true, seed: SEED++ });
    V.fill(earF, { color: C.black, flat: true, smooth: true, seed: SEED++ });
    V.fill(JK([[338, -212], [342, -246], [346, -260], [350, -238], [352, -212]]), { color: C.gold, flat: true, smooth: true, seed: SEED++ });
    V.ink(earF, { w: 0.4, color: '#6a5848', closed: true, smooth: true, taper: [0, 0], step: 2, seed: SEED++ });
    // eye + brow in gold
    const eye = JK([[364, -192], [372, -197], [382, -195], [386, -190], [376, -188], [367, -189]]);
    V.fill(eye, { color: C.white, flat: true, smooth: true, seed: SEED++ });
    V.ink(eye, { w: 0.55, color: C.gold, closed: true, smooth: true, taper: [0, 0], step: 2, seed: SEED++ });
    V.dot(AX + 376, AY - 192, 2.4, C.black);
    V.ink(JK([[386, -201], [372, -205], [356, -200]]), { w: 0.6, color: C.gold, smooth: true, taper: [2, 3], step: 2, seed: SEED++ });
    V.ink(JK([[364, -190], [350, -186]]), { w: 0.55, color: C.gold, taper: [1, 3], step: 2, seed: SEED++ });
    V.ink(JK([[436, -158], [420, -158], [398, -160]]), { w: 0.35, color: '#6a5848', taper: [2, 3], step: 2, seed: SEED++ });
    // sheen on the black coat
    V.ink(JK([[60, -84], [140, -78], [230, -82], [270, -96]]), { w: 0.6, color: '#4a4e5a', alpha: 0.8, smooth: true, taper: [20, 20], step: 4, seed: SEED++ });
    V.ink(JK([[300, -150], [310, -186], [326, -204]]), { w: 0.45, color: '#4a4e5a', alpha: 0.8, smooth: true, taper: [8, 8], step: 3, seed: SEED++ });
    // red ribbon collar with gold bands
    const col = JK([[290, -132], [312, -140], [338, -142], [346, -130], [336, -114], [298, -110]]);
    V.fill(col, { color: C.crimson, flat: true, smooth: true, seed: SEED++ });
    V.ink(JK([[292, -122], [316, -128], [342, -128]]), { w: 0.8, color: C.gold, smooth: true, taper: [0, 0], step: 2, seed: SEED++ });
    V.ink(col, { w: 0.5, color: C.gold, closed: true, smooth: true, taper: [0, 0], step: 2, seed: SEED++ });
    V.ink(JK([[338, -116], [344, -92], [340, -70]]), { w: 0.9, color: C.crimson, smooth: true, taper: [0, 3], step: 2, seed: SEED++ });
    V.ink(JK([[332, -116], [332, -94], [326, -78]]), { w: 0.9, color: C.crimson, smooth: true, taper: [0, 3], step: 2, seed: SEED++ });
  }
  // live jackal forelegs (paws do the 67)
  function egJackalLegs(t) {
    // paw rests flat on the cornice when "down" and lifts (up to ~35°) when "up"
    const leg = (side, ex, len, shade, sd) => {
      const A = V.G.arm(t, side);
      const lift = (A.y + 1) / 2;
      const th = lift * 0.62;
      const fx = Math.cos(th), fy = -Math.sin(th);
      const E = [AX + ex, AY - 13];
      const Wr = [E[0] + fx * len, E[1] + fy * len];
      const S = [AX + ex - 22, AY - 62];
      const K = 30;
      const lim = egLimb([[S[0] / K, S[1] / K], [(S[0] + E[0]) / (2 * K), (S[1] + E[1]) / (2 * K) + 0.1], [E[0] / K, E[1] / K], [(E[0] + Wr[0]) / (2 * K), (E[1] + Wr[1]) / (2 * K)], [Wr[0] / K, Wr[1] / K]], [0.72, 0.6, 0.42, 0.34, 0.3]).map(([x, y]) => [x * K, y * K]);
      V.fill(lim, { color: shade, flat: true, smooth: true, seed: sd });
      V.ink(lim, { w: 0.45, color: '#6a5848', closed: true, smooth: true, taper: [0, 0], step: 3, seed: sd + 1 });
      // sheen along the top of the foreleg
      V.ink([[E[0] + fx * 10 - fy * -7, E[1] + fy * 10 - fx * 7], [E[0] + fx * (len - 8) - fy * -6, E[1] + fy * (len - 8) - fx * 6]], { w: 0.45, color: '#4c505c', alpha: 0.9, taper: [6, 6], step: 3, seed: sd + 2 });
      const nx = fy, ny = -fx;
      const PAW = [[-6, -10], [12, -11], [26, -8], [35, -1], [33, 7], [18, 9.5], [-6, 9.5]];
      const pp = PAW.map(([a, b]) => [Wr[0] + fx * a + nx * -b, Wr[1] + fy * a + ny * -b]);
      V.fill(pp, { color: shade, flat: true, smooth: true, seed: sd + 3 });
      V.ink(pp, { w: 0.45, color: '#6a5848', closed: true, smooth: true, taper: [0, 0], step: 2, seed: sd + 4 });
      for (let k = 0; k < 3; k++) {
        const a = 16 + k * 7;
        V.ink([[Wr[0] + fx * a - nx * 8, Wr[1] + fy * a - ny * 8], [Wr[0] + fx * (a + 3) + nx * 1, Wr[1] + fy * (a + 3) + ny * 1]], { w: 0.32, color: C.goldD, taper: [0, 0], step: 2, seed: sd + 5 + k });
      }
      V.ink([[Wr[0] - fx * 8 + nx * 11, Wr[1] - fy * 8 + ny * 11], [Wr[0] - fx * 8 - nx * 11, Wr[1] - fy * 8 - ny * 11]], { w: 1.1, color: C.gold, taper: [0, 0], step: 2, seed: sd + 9 });
    };
    // far leg first (its paw sits a little further forward), then the near leg
    leg(1, 312, 106, '#2b2521', 900);
    leg(0, 294, 98, C.black, 920);
  }

  // =================================================================== OFFERING TABLE (static)
  // blue lotus, side view. (x,y) = flower base, s = size px, ang = tilt (rad, 0 = up)
  function egLotus(x, y, s, ang, o = {}) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const T = (pts) => pts.map(([u, v]) => [x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s]);
    // a petal leaving the base at angle a (0 = straight up), length L, half-width w
    const petal = (a, L, w, bx = 0) => {
      const c = Math.cos(a), sn = Math.sin(a);
      const R = (u, v) => [bx + u * c - v * sn, -(u * sn + v * c)];
      return [R(-w * 0.55, 0.05), R(-w, L * 0.45), R(-w * 0.45, L * 0.85), R(0, L), R(w * 0.45, L * 0.85), R(w, L * 0.45), R(w * 0.55, 0.05)];
    };
    const draw = (pts, col) => { const q = T(pts); V.fill(q, { color: col, flat: true, smooth: true, seed: SEED++ }); V.ink(q, { w: 0.35, closed: true, smooth: true, taper: [0, 0], step: 2, color: C.ink, seed: SEED++ }); };
    draw(petal(-0.62, 0.8, 0.16, -0.06), C.green);
    draw(petal(0.62, 0.8, 0.16, 0.06), C.green);
    draw(petal(-0.42, 0.98, 0.17, -0.04), '#6f97cf');
    draw(petal(0.42, 0.98, 0.17, 0.04), '#6f97cf');
    if (!o.bud) {
      draw(petal(-0.18, 1.08, 0.17), C.blue);
      draw(petal(0.18, 1.08, 0.17), C.blue);
      draw(petal(0, 1.15, 0.16), C.lapis);
    }
    const cup = T([[-0.22, -0.14], [0.22, -0.14], [0.1, 0.1], [-0.1, 0.1]]);
    V.fill(cup, { color: C.greenD, flat: true, seed: SEED++ });
    V.ink(cup, { w: 0.35, closed: true, taper: [0, 0], step: 2, color: C.ink, seed: SEED++ });
  }
  function egOfferings() {
    const cx = 1070;
    // stand
    const stand = [[cx - 30, GL], [cx + 30, GL], [cx + 15, GL - 16], [cx + 9, GL - 100], [cx + 38, GL - 114], [cx - 38, GL - 114], [cx - 9, GL - 100], [cx - 15, GL - 16]];
    V.fill(stand, { color: C.crimson, flat: true, seed: SEED++ });
    [GL - 34, GL - 58, GL - 82].forEach((y) => { V.fill(V.rectPts(cx - 9.5, y, 19, 7), { color: C.lapis, flat: true, seed: SEED++ }); V.fill(V.rectPts(cx - 9.5, y + 7, 19, 3), { color: C.gold, flat: true, seed: SEED++ }); });
    V.fill([[cx - 30, GL], [cx + 30, GL], [cx + 15, GL - 16], [cx - 15, GL - 16]], { color: C.gold, flat: true, seed: SEED++ });
    V.ink(stand, { w: 0.6, closed: true, taper: [0, 0], step: 3, color: C.ink, seed: SEED++ });
    // reed mat
    const mat = [[cx - 88, GL - 114], [cx + 88, GL - 114], [cx + 82, GL - 127], [cx - 82, GL - 127]];
    V.fill(mat, { color: C.green, flat: true, seed: SEED++ });
    for (let x = cx - 80; x < cx + 82; x += 7) V.ink([[x, GL - 126], [x, GL - 115]], { w: 0.3, color: C.ink, taper: [0, 0], step: 2, seed: SEED++ });
    V.ink(mat, { w: 0.55, closed: true, taper: [0, 0], step: 3, color: C.ink, seed: SEED++ });
    const Y = GL - 127;
    // standing lettuces at the back
    [[-56, -98, -14], [-24, -128, -5], [24, -124, 6], [58, -96, 14]].forEach(([dx, h, lean], i) => {
      const lf = [[cx + dx - 12, Y], [cx + dx - 15 + lean * 0.5, Y + h * 0.55], [cx + dx + lean, Y + h], [cx + dx + 15 + lean * 0.5, Y + h * 0.55], [cx + dx + 12, Y]];
      V.fill(lf, { color: i % 2 ? C.greenD : C.green, flat: true, smooth: true, seed: SEED++ });
      V.ink(lf, { w: 0.45, closed: true, smooth: true, taper: [0, 0], step: 3, color: C.ink, seed: SEED++ });
      V.ink([[cx + dx, Y - 2], [cx + dx + lean * 0.8, Y + h * 0.86]], { w: 0.3, color: C.ink, step: 3, seed: SEED++ });
      for (let k = 1; k < 4; k++) V.ink([[cx + dx + lean * 0.2 * k, Y + h * 0.22 * k], [cx + dx + lean * 0.2 * k + 7, Y + h * 0.22 * k - 8]], { w: 0.25, color: C.ink, alpha: 0.7, step: 2, seed: SEED++ });
    });
    const loaf = (x, y, rx, ry, col, o = {}) => {
      const p = o.pts || V.ellipsePts(x, y, rx, ry, 22);
      V.fill(p, { color: col, flat: true, smooth: !!o.smooth, seed: SEED++ });
      V.ink(p, { w: 0.5, closed: true, smooth: !!o.smooth, taper: [0, 0], step: 2, color: C.ink, seed: SEED++ });
      if (o.slash) V.ink([[x - rx * 0.4, y - ry * 0.2], [x + rx * 0.3, y - ry * 0.5]], { w: 0.35, color: C.ink, alpha: 0.7, step: 2, seed: SEED++ });
    };
    // round loaves
    loaf(cx - 56, Y - 14, 26, 14, C.ochre, { slash: true });
    loaf(cx + 56, Y - 14, 26, 14, C.ochre, { slash: true });
    // conical loaves standing up behind the duck
    loaf(cx - 26, 0, 0, 0, '#ecd4a0', { pts: [[cx - 42, Y - 18], [cx - 30, Y - 88], [cx - 22, Y - 88], [cx - 10, Y - 18]], smooth: true });
    loaf(cx + 26, 0, 0, 0, '#ecd4a0', { pts: [[cx + 10, Y - 18], [cx + 22, Y - 84], [cx + 30, Y - 84], [cx + 42, Y - 18]], smooth: true });
    loaf(cx, Y - 15, 28, 15, '#b8782f', { slash: true });
    // plucked, trussed goose lying on the loaves: body, wing line, neck and head hanging over the right
    const duck = [[cx - 40, Y - 40], [cx - 30, Y - 56], [cx - 4, Y - 62], [cx + 24, Y - 58], [cx + 38, Y - 46], [cx + 30, Y - 32], [cx - 6, Y - 28], [cx - 32, Y - 30]];
    V.ink([[cx + 32, Y - 46], [cx + 50, Y - 46], [cx + 60, Y - 34], [cx + 62, Y - 18]], { w: 1.8, color: '#e6d3a6', smooth: true, taper: [0, 3], step: 2, seed: SEED++ });
    V.ink([[cx + 32, Y - 50], [cx + 52, Y - 50], [cx + 64, Y - 36], [cx + 66, Y - 18]], { w: 0.4, color: C.ink, smooth: true, step: 2, seed: SEED++ });
    const head = [[cx + 56, Y - 22], [cx + 66, Y - 24], [cx + 70, Y - 12], [cx + 64, Y - 4], [cx + 58, Y - 10]];
    V.fill(head, { color: '#e6d3a6', flat: true, smooth: true, seed: SEED++ });
    V.ink(head, { w: 0.4, closed: true, smooth: true, taper: [0, 0], step: 2, color: C.ink, seed: SEED++ });
    V.fill([[cx + 62, Y - 6], [cx + 68, Y - 6], [cx + 66, Y + 4]], { color: C.ochre, flat: true, seed: SEED++ });
    V.fill(duck, { color: '#efe0bd', flat: true, smooth: true, seed: SEED++ });
    V.ink(duck, { w: 0.5, closed: true, smooth: true, taper: [0, 0], step: 2, color: C.ink, seed: SEED++ });
    V.ink([[cx - 28, Y - 44], [cx - 4, Y - 50], [cx + 22, Y - 44]], { w: 0.35, color: C.ink, alpha: 0.7, smooth: true, step: 2, seed: SEED++ });
    for (let k = 0; k < 7; k++) V.dot(cx - 22 + k * 7, Y - 38 + (k % 2) * 4, 1.1, '#b89a6a', { seed: SEED++ });
    // tied legs sticking up
    V.ink([[cx - 22, Y - 56], [cx - 34, Y - 76], [cx - 26, Y - 80]], { w: 0.75, color: C.ochre, step: 2, seed: SEED++ });
    V.ink([[cx - 12, Y - 60], [cx - 18, Y - 82], [cx - 10, Y - 84]], { w: 0.75, color: C.ochre, step: 2, seed: SEED++ });
    V.ink([[cx - 30, Y - 66], [cx - 16, Y - 68]], { w: 0.5, color: C.crimson, step: 2, seed: SEED++ });
    // grapes hanging over the left edge + figs on the right
    for (let i = 0; i < 19; i++) {
      const row = Math.floor(i / 4), col = i % 4;
      if (row === 4 && col > 2) continue;
      const gx = cx - 96 + col * 6.2 + (row % 2) * 3 + row * 0.6, gy = Y + 2 + row * 6.4;
      V.dot(gx, gy, 3.8, C.purple, { seed: 300 + i });
    }
    V.ink([[cx - 86, Y - 2], [cx - 80, Y - 12]], { w: 0.5, color: C.greenD, step: 2, seed: SEED++ });
    [[cx + 84, Y + 6], [cx + 94, Y + 10], [cx + 88, Y + 16]].forEach(([x, y]) => loaf(x, y, 6, 6, '#6b3a5a'));
    // lotus garland: two flowers draped down the sides on long stems, one crowning the heap
    V.ink([[cx - 4, Y - 74], [cx - 50, Y - 104], [cx - 84, Y - 70], [cx - 98, Y - 30]], { w: 0.75, color: C.greenD, smooth: true, taper: [0, 0], step: 3, seed: SEED++ });
    V.ink([[cx + 4, Y - 74], [cx + 50, Y - 102], [cx + 86, Y - 66], [cx + 100, Y - 26]], { w: 0.75, color: C.greenD, smooth: true, taper: [0, 0], step: 3, seed: SEED++ });
    egLotus(cx - 98, Y - 28, 26, Math.PI * 0.9);
    egLotus(cx + 100, Y - 24, 26, -Math.PI * 0.9);
    V.ink([[cx, Y - 72], [cx, Y - 112]], { w: 0.8, color: C.greenD, taper: [0, 0], step: 3, seed: SEED++ });
    V.ink([[cx - 2, Y - 76], [cx - 14, Y - 88], [cx - 21, Y - 96]], { w: 0.6, color: C.greenD, smooth: true, taper: [0, 0], step: 2, seed: SEED++ });
    V.ink([[cx + 2, Y - 76], [cx + 14, Y - 88], [cx + 21, Y - 96]], { w: 0.6, color: C.greenD, smooth: true, taper: [0, 0], step: 2, seed: SEED++ });
    egLotus(cx, Y - 110, 32, 0);
    egLotus(cx - 22, Y - 96, 20, -0.5, { bud: true });
    egLotus(cx + 22, Y - 96, 20, 0.5, { bud: true });
  }
  // tall wine jar in a ring stand, lotus garland round its shoulder (between Hathor and Horus)
  function egWineJar(x) {
    const ring = [[x - 24, GL], [x + 24, GL], [x + 15, GL - 12], [x + 20, GL - 24], [x - 20, GL - 24], [x - 15, GL - 12]];
    V.fill(ring, { color: C.crimson, flat: true, seed: SEED++ });
    V.ink(ring, { w: 0.5, closed: true, taper: [0, 0], step: 2, color: C.ink, seed: SEED++ });
    const jar = [[x, GL - 10], [x - 14, GL - 40], [x - 30, GL - 100], [x - 34, GL - 140], [x - 26, GL - 168], [x - 12, GL - 178], [x - 12, GL - 196], [x - 17, GL - 202], [x + 17, GL - 202], [x + 12, GL - 196], [x + 12, GL - 178], [x + 26, GL - 168], [x + 34, GL - 140], [x + 30, GL - 100], [x + 14, GL - 40]];
    V.fill(jar, { color: '#c27a4a', flat: true, smooth: true, seed: SEED++ });
    V.fill([[x - 32, GL - 128], [x + 32, GL - 128], [x + 31, GL - 120], [x - 31, GL - 120]], { color: C.lapis, flat: true, seed: SEED++ });
    for (let k = -3; k <= 3; k++) {
      const px = x + k * 9;
      const petal = [[px - 4.5, GL - 120], [px, GL - 98 + Math.abs(k) * 2], [px + 4.5, GL - 120]];
      V.fill(petal, { color: k % 2 ? C.blue : C.green, flat: true, seed: SEED++ });
      V.ink(petal, { w: 0.3, closed: true, taper: [0, 0], step: 2, color: C.ink, seed: SEED++ });
    }
    V.ink(jar, { w: 0.6, closed: true, smooth: true, taper: [0, 0], step: 3, color: C.ink, seed: SEED++ });
    // mud stopper
    const st = [[x - 18, GL - 202], [x + 18, GL - 202], [x + 10, GL - 220], [x - 10, GL - 220]];
    V.fill(st, { color: '#8d7d66', flat: true, smooth: true, seed: SEED++ });
    V.ink(st, { w: 0.5, closed: true, smooth: true, taper: [0, 0], step: 2, color: C.ink, seed: SEED++ });
    // a lotus tied round the neck, flower hanging down the front
    V.ink([[x - 13, GL - 186], [x + 13, GL - 184]], { w: 0.9, color: C.greenD, taper: [0, 0], step: 2, seed: SEED++ });
    V.ink([[x + 12, GL - 185], [x + 34, GL - 170], [x + 44, GL - 146]], { w: 0.65, color: C.greenD, smooth: true, taper: [0, 0], step: 2, seed: SEED++ });
    egLotus(x + 44, GL - 144, 24, Math.PI * 0.9);
  }

  // =================================================================== CARTOUCHE (frame static, numerals live)
  const CX = 1070, CT = 206, CB = 352, CWD = 36;
  function egCartoucheFrame() {
    // ostrich plumes + sun disk crowning the cartouche
    const plume = (x0, dir) => {
      const p = [[x0, CT - 22], [x0 + dir * 2, CT - 80], [x0 + dir * 8, CT - 112], [x0 + dir * 14, CT - 114], [x0 + dir * 13, CT - 80], [x0 + dir * 12, CT - 22]];
      V.fill(p, { color: C.white, flat: true, smooth: true, seed: SEED++ });
      for (let k = 0; k < 4; k++) {
        const y = CT - 34 - k * 20;
        V.fill([[x0 + dir * 1, y], [x0 + dir * 12.5, y], [x0 + dir * 12.5, y - 7], [x0 + dir * 1.5, y - 7]], { color: k % 2 ? C.green : C.blue, flat: true, seed: SEED++ });
      }
      V.ink(p, { w: 0.5, closed: true, smooth: true, taper: [0, 0], step: 2, color: C.ink, seed: SEED++ });
    };
    plume(CX - 15, 1);
    plume(CX + 15, -1);
    const disk = V.ellipsePts(CX, CT - 14, 15, 15, 22);
    V.fill(V.ellipsePts(CX, CT - 14, 17, 17, 22), { color: C.gold, flat: true, seed: SEED++ });
    V.fill(disk, { color: '#c2381f', flat: true, seed: SEED++ });
    V.ink(disk, { w: 0.5, closed: true, taper: [0, 0], step: 2, color: C.ink, seed: SEED++ });
    // the ring (stadium)
    const R = [];
    const rr = CWD;
    for (let i = 0; i <= 14; i++) { const a = Math.PI + (i / 14) * Math.PI; R.push([CX + Math.cos(a) * rr, CT + rr + Math.sin(a) * rr]); }
    for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI; R.push([CX + Math.cos(a) * rr, CB - rr + Math.sin(a) * rr]); }
    V.fill(R, { color: '#f4e3a4', flat: true, seed: SEED++ });
    egGold(R);
    V.ink(R, { w: 1.7, closed: true, taper: [0, 0], wob: 0.2, step: 3, color: C.crimson, seed: SEED++ });
    V.ink(R, { w: 0.5, closed: true, taper: [0, 0], wob: 0.3, step: 3, color: C.ink, seed: SEED++ });
    const Ri = R.map(([x, y]) => [CX + (x - CX) * 0.84, (CT + CB) / 2 + (y - (CT + CB) / 2) * 0.9]);
    V.ink(Ri, { w: 0.4, closed: true, taper: [0, 0], wob: 0.3, step: 3, color: C.ink, seed: SEED++ });
    const bar = V.rectPts(CX - 40, CB - 1, 80, 9);
    V.fill(bar, { color: C.crimson, flat: true, seed: SEED++ });
    V.ink(bar, { w: 0.5, closed: true, taper: [0, 0], step: 3, color: C.ink, seed: SEED++ });
    // numerals (unlit state)
    egNumerals(0, 0);
  }
  // six = two rows of three strokes, seven = four over three (Egyptian numerals)
  function egNumeralStrokes(n) {
    const rows = n === 6 ? [3, 3] : [4, 3];
    const y0 = n === 6 ? 230 : 290;
    const out = [];
    rows.forEach((cnt, ri) => {
      const sp = 11;
      for (let k = 0; k < cnt; k++) {
        const x = CX + (k - (cnt - 1) / 2) * sp;
        const y = y0 + ri * 27;
        out.push([[x, y], [x, y + 21]]);
      }
    });
    return out;
  }
  function egNumerals(lit6, lit7) {
    [6, 7].forEach((n) => {
      const L = n === 6 ? lit6 : lit7;
      if (L <= 0 && (lit6 > 0 || lit7 > 0)) return;
      const cy = n === 6 ? 254 : 314;
      const k = 1 + 0.06 * L;
      if (L > 0) {
        // the spoken number turns into a lapis-and-gold inlay (like Tutankhamun's cartouche boxes)
        const pw = 27 * k, ph = 31 * k, rr = 9;
        const panel = [];
        [[CX + pw - rr, cy - ph + rr, -Math.PI / 2, 0], [CX + pw - rr, cy + ph - rr, 0, Math.PI / 2], [CX - pw + rr, cy + ph - rr, Math.PI / 2, Math.PI], [CX - pw + rr, cy - ph + rr, Math.PI, Math.PI * 1.5]].forEach(([x, y, a0, a1]) => panel.push(...V.arcPts(x, y, rr, rr, a0, a1, 5)));
        V.fill(panel, { color: C.lapis, alpha: 0.35 + 0.65 * L, flat: true, seed: 690 + n });
        V.ink(panel, { w: 0.55, color: C.goldD, alpha: L, closed: true, taper: [0, 0], step: 2, seed: 695 + n });
      }
      egNumeralStrokes(n).forEach((s, i) => {
        const p = s.map(([x, y]) => [CX + (x - CX) * k, cy + (y - cy) * k]);
        if (L > 0) V.ink(p, { w: 1.55, color: V.mix('#f2c230', '#ffe68e', L * 0.8), taper: [2, 2], wob: 0.15, step: 2, seed: 760 + n * 10 + i });
        else V.ink(p, { w: 1.5, color: '#7a2414', taper: [2, 2], wob: 0.2, step: 2, seed: 700 + n * 10 + i });
      });
    });
  }

  // =================================================================== DAMAGE
  function egLacuna(pts, seed) {
    // plaster lost down to the coarse mud render and the limestone behind it
    V.with2d((ctx) => {
      const r = V.rng(seed);
      const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      ctx.save();
      path();
      ctx.clip();
      // coarse mud render (straw-tempered, brownish)
      ctx.fillStyle = '#a88d68';
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 40; i++) {
        const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), s = 0.8 + Math.pow(r(), 3) * 5;
        const v = 110 + r() * 80;
        ctx.fillStyle = `rgba(${v + 25},${v + 5},${v - 30},${0.3 + r() * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(x, y, s * 1.6, s, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(90,65,35,0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 900; i++) {
        const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), a = r() * Math.PI, L = 5 + r() * 12;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke();
      }
      // deeper pockets where the render itself fell out (grey limestone)
      for (let k = 0; k < 3; k++) {
        const cx = x0 + (0.25 + r() * 0.5) * (x1 - x0), cy = y0 + (0.3 + r() * 0.45) * (y1 - y0), rx = (x1 - x0) * (0.08 + r() * 0.1), ry = (y1 - y0) * (0.12 + r() * 0.12);
        ctx.beginPath();
        for (let j = 0; j < 18; j++) { const a = (j / 18) * Math.PI * 2, q = 0.7 + r() * 0.5; const px = cx + Math.cos(a) * rx * q, py = cy + Math.sin(a) * ry * q; if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.closePath();
        ctx.fillStyle = '#b9ae98';
        ctx.fill();
        ctx.strokeStyle = 'rgba(70,50,30,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // shadow cast by the broken plaster lip (light from the upper left)
      ctx.shadowColor = 'rgba(40,24,10,0.75)';
      ctx.shadowBlur = 9;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 6;
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(40,24,10,0.6)';
      path();
      ctx.stroke();
      ctx.restore();
      // the lime layer's broken edge
      path();
      ctx.strokeStyle = 'rgba(246,236,208,0.95)';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,90,55,0.45)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
  }
  function egNoisyPoly(cx, cy, rx, ry, seed, n = 40, amp = 0.35) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 1 + amp * (V.noise1(i * 0.45 + seed) - 0.5) * 2 + 0.12 * (V.hash(i + seed) - 0.5);
      out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return out;
  }
  function egPaintFlakes(seed, boxes) {
    V.with2d((ctx) => {
      const r = V.rng(seed);
      boxes.forEach(([bx, by, bw, bh, n]) => {
        for (let i = 0; i < n; i++) {
          const x = bx + r() * bw, y = by + r() * bh, s = 1 + Math.pow(r(), 4) * 8;
          ctx.fillStyle = r() < 0.7 ? `rgba(236,222,182,${0.6 + r() * 0.4})` : `rgba(205,185,145,${0.5 + r() * 0.4})`;
          ctx.beginPath();
          const v = 5 + Math.floor(r() * 3);
          for (let j = 0; j < v; j++) {
            const a = (j / v) * Math.PI * 2, rr = s * (0.5 + r() * 0.7);
            const px = x + Math.cos(a) * rr * 1.4, py = y + Math.sin(a) * rr;
            if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
      });
    });
  }

  // =================================================================== BAKES
  function egBakeBG() {
    V.bg(C.plaster);
    // tonal variation of the lime wash
    V.with2d((ctx) => {
      const r = V.rng(11);
      for (let i = 0; i < 70; i++) {
        const x = r() * W, y = r() * H, rad = 60 + r() * 280;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        const c = r() < 0.5 ? '160,120,70' : '255,247,222';
        g.addColorStop(0, `rgba(${c},${0.04 + r() * 0.07})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    });
    // lime-wash brushwork over the whole wall
    V.hatch(V.rectPts(0, 0, W, H), { dist: 15, angle: 7, color: '#dccb98', brush: 'marker', w: 0.9, rand: 0.6, seed: SEED++ });
    V.hatch(V.rectPts(0, 0, W, H), { dist: 23, angle: -5, color: '#efe2bd', brush: 'crayon', w: 0.8, rand: 0.6, seed: SEED++ });
    // top frieze + borders
    egKheker(0, 54);
    egStarBand(54, 26);
    egBlockBorderV(0, 20, 80, 1014, 1);
    egBlockBorderV(W - 20, 20, 80, 1014, 3);
    egBlockBorderH(20, W - 20, GL, 22, 2);
    egBlockBorderH(0, W, 994, 20, 1);
    // dado
    V.fill(V.rectPts(0, 1014, W, 8), { color: C.gold, flat: true, seed: SEED++ });
    V.fill(V.rectPts(0, 1022, W, 9), { color: C.crimson, flat: true, seed: SEED++ });
    V.fill(V.rectPts(0, 1031, W, 49), { color: '#2b231d', flat: true, seed: SEED++ });
    V.hatch(V.rectPts(0, 1031, W, 49), { dist: 6, angle: 3, color: '#3d3128', brush: 'crayon', w: 0.6, rand: 0.5, seed: SEED++ });
    V.ink([[0, 1031], [W, 1031]], { w: 0.5, taper: [0, 0], step: 8, color: C.ink, seed: SEED++ });
    // faint canon grid (18 squares to the hairline) behind Horus and around the wine jar
    egRedGrid(1430, 1898, 80, GL, HORUS.x, GL, 30, 3.7);
    egRedGrid(24, 600, GL + 24, 992, 104, GL2, 8.5 * 2, 9.1);
    // text columns
    egColumns(862, 82, 3, 56, 248, false, 101);
    egColumns(1110, 82, 3, 56, 248, true, 202);
    egColumns(1474, 82, 3, 56, 248, true, 303);
    egColumns(86, 288, 6, 56, 206, false, 404);
    egColumns(600, 82, 1, 56, 294, false, 505);
    // cartouche
    egCartoucheFrame();
    // shrine with Anubis
    egShrine();
    // offerings
    egOfferings();
    egWineJar(1500);
    // legs of the standing figures (static)
    egF(PHARAOH.x, GL, 30, 1); egMale('legs', { anklet: true });
    egF(HATHOR.x, GL, 30, -1); egFemale('legs', { anklet: true });
    egF(HORUS.x, GL, 30, -1); egMale('legs', { anklet: true });
    GUESTS.forEach((G) => egGuest(G, 'legs'));
    egBaboon('legs');
    egPentimento(PHARAOH, [[2.05, -6.6], [2.32, -5.6], [2.48, -4.6], [2.36, -2.6], [2.46, -1.3]], 0.14, 0);
    egPentimento(PHARAOH, [[-2.0, -9.6], [-2.15, -8.4], [-2.05, -7.2]], -0.12, 0);
    egPentimento(HORUS, [[-1.25, -5.6], [-1.48, -4.4], [-1.3, -2.8], [-1.05, -1.2]], -0.14, 0);
    egPentimento(HATHOR, [[-1.85, -9.2], [-1.62, -7.0], [-1.45, -4.6], [-1.3, -2.0]], -0.16, 0);
    egPentimento(HORUS, [[2.6, -15.2], [2.95, -15.0], [3.12, -14.6]], 0.1, -0.08);
    // age: flakes, lacunae
    egPaintFlakes(31, [[0, 0, W, 76, 320], [0, GL, W, 30, 200], [0, 990, W, 90, 320], [86, 600, 470, 186, 200], [820, 76, 500, 280, 140], [0, 76, W, 920, 700], [600, 600, 1300, 186, 260], [0, 76, 24, 940, 80], [W - 24, 76, 24, 940, 80]]);
    egLacuna(egNoisyPoly(1690, 918, 205, 82, 7, 46, 0.3), 17);
    egLacuna(egNoisyPoly(1790, 26, 58, 28, 3, 26, 0.35), 19);
    egLacuna(egNoisyPoly(250, 1062, 110, 28, 5, 28, 0.35), 23);
  }

  function egBakeUp() {
    egF(PHARAOH.x, GL, 30, 1); egMale('up', { apron: true, tail: true }); egPharaohHead('up');
    egF(HATHOR.x, GL, 30, -1); egFemale('up', {}); egHathorHead('up');
    egF(HORUS.x, GL, 30, -1); egMale('up', { tail: true }); egHorusHead('up');
    GUESTS.forEach((G) => egGuest(G, 'up'));
    egBaboon('up');
  }
  function egBakeTop() {
    egF(PHARAOH.x, GL, 30, 1); egCollar(0.15, -16.05, 1.15, [C.gold, C.lapis, C.gold, C.crimson]); egPharaohHead('top');
    egF(HATHOR.x, GL, 30, -1); egCollar(0.12, -16.05, 1.0, [C.gold, C.green, C.gold, C.lapis]); egHathorHead('top');
    egF(HORUS.x, GL, 30, -1); egCollar(0.15, -16.05, 1.12, [C.gold, C.green, C.gold, C.crimson]); egHorusHead('top');
    GUESTS.forEach((G) => egGuest(G, 'top'));
  }

  // =================================================================== LIVE OVERLAYS
  function egGoldSweep(u, dy) {
    if (!GOLD || !GOLD.length) return;
    const ph = V.fract((u + 0.35) / 2.4);
    const bx = -400 + ph * (W + 800);
    V.with2d((ctx) => {
      ctx.beginPath();
      GOLD.forEach((g) => {
        const oy = g.grp === 'bg' ? 0 : dy;
        g.p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + oy) : ctx.moveTo(x, y + oy)));
        ctx.closePath();
      });
      ctx.clip();
      ctx.setTransform(1, 0, -0.5, 1, 0, 0); // slanted band
      const gr = ctx.createLinearGradient(bx - 150, 0, bx + 150, 0);
      gr.addColorStop(0, 'rgba(120,90,30,0)');
      gr.addColorStop(0.42, 'rgba(150,115,45,0.55)');
      gr.addColorStop(0.5, 'rgba(255,230,160,0.95)');
      gr.addColorStop(0.58, 'rgba(150,115,45,0.55)');
      gr.addColorStop(1, 'rgba(120,90,30,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(-W, 0, W * 3, H);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // a few twinkling glints of leaf
      const r = V.rng(3000 + V.tick);
      ctx.fillStyle = 'rgba(255,248,215,1)';
      for (let i = 0; i < 28; i++) {
        const g = GOLD[Math.floor(r() * GOLD.length)], p = g.p[Math.floor(r() * g.p.length)];
        ctx.globalAlpha = r() * 0.8;
        const x = p[0] + (r() - 0.5) * 10, y = p[1] + (g.grp === 'bg' ? 0 : dy) + (r() - 0.5) * 10;
        ctx.fillRect(x - 0.8, y - 2.5, 1.6, 5);
        ctx.fillRect(x - 2.5, y - 0.8, 5, 1.6);
      }
    }, { blend: 'add', alpha: 0.55 });
  }
  function egCartoucheLive(t) {
    const s = V.G.say(t);
    const lit = 0.55 + 0.45 * s.env;
    const y = s.n === 6 ? 254 : 314;
    V.with2d((ctx) => {
      // warm halo around the whole cartouche on every beat
      const g0 = ctx.createRadialGradient(CX, (CT + CB) / 2, 30, CX, (CT + CB) / 2, 135);
      g0.addColorStop(0, `rgba(236,170,40,${0.2 * s.env})`);
      g0.addColorStop(1, 'rgba(236,170,40,0)');
      ctx.fillStyle = g0;
      ctx.fillRect(CX - 150, CT - 100, 300, CB - CT + 200);
      // the spoken number's group glows gold inside the ring
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(CX, (CT + CB) / 2, CWD - 6, (CB - CT) / 2 - 6, 0, 0, Math.PI * 2);
      ctx.clip();
      const g = ctx.createRadialGradient(CX, y, 2, CX, y, 44);
      g.addColorStop(0, `rgba(250,190,40,${0.35 * lit})`);
      g.addColorStop(0.55, `rgba(245,180,40,${0.22 * lit})`);
      g.addColorStop(1, 'rgba(245,180,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(CX - 50, y - 50, 100, 100);
      ctx.restore();
    });
    V.with2d((ctx) => {
      const g = ctx.createRadialGradient(CX, y, 2, CX, y, 60);
      g.addColorStop(0, `rgba(255,240,190,${0.7 * lit})`);
      g.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = g;
      ctx.fillRect(CX - 70, y - 70, 140, 140);
    }, { blend: 'screen' });
    egNumerals(s.n === 6 ? lit : 0, s.n === 7 ? lit : 0);
    // tiny gold rays flicking out of the ring on the hit (Amarna-style sun rays)
    if (s.env > 0.3) {
      for (let k = 0; k < 6; k++) {
        const side = k < 3 ? -1 : 1, kk = k % 3;
        const yy = y - 16 + kk * 16, x0 = CX + side * (CWD + 6), L = 6 + 14 * s.env;
        V.ink([[x0, yy], [x0 + side * L, yy + (kk - 1) * 6 * s.env]], { w: 0.6, color: '#d99a1a', alpha: Math.min(1, (s.env - 0.3) * 2.2), taper: [0, 4], step: 2, seed: 980 + k });
      }
    }
  }

  // =================================================================== SCENE
  V.scenes.egypt = {
    draw(t, u, meta) {
      if (!GOLD) GOLD = [];
      const bg = egBake('egBG', 'bg', egBakeBG);
      const up = egBake('egUP', 'up', egBakeUp);
      const top = egBake('egTOP', 'top', egBakeTop);
      if (!SP.__flaked) {
        SP.__flaked = true;
        egFlake(up, 41, [[560, 90, 1340, 700, 1], [600, 520, 1300, 270, 0.8], [60, 800, 1300, 200, 0.7]], 520);
        egFlake(top, 43, [[560, 300, 1340, 260, 1]], 160);
      }
      const tex = egTexMap();
      V.mReset();
      V.resetBrush();
      V.blit(bg, 0, 0, W, H);
      const dy = Math.round(V.G.pulse(t, 6) * 4);
      // the 67: far arms pass behind the bodies, near arms in front, collars on top
      egJackalLegs(t);
      const CAST = [PHARAOH, HATHOR, HORUS, BABOON].concat(GUESTS);
      CAST.forEach((fg) => egArms(fg, t, dy, 'back'));
      V.blit(up, 0, dy, W, H);
      CAST.forEach((fg) => egArms(fg, t, dy, 'front'));
      V.blit(top, 0, dy, W, H);
      V.blit(egFadeMap(), 0, 0, W, H);
      egCartoucheLive(t);
      egGoldSweep(u, dy);
      V.blit(tex, 0, 0, W, H, { blend: 'multiply' });
      V.vignette({ amt: 0.32, color: '70,40,15', inner: 0.5 });
    },
  };
})();
