/* surreal.js — 1931 · 超現實主義《六點七分的永恆》
 * A deadpan pastiche of Dalí's "The Persistence of Memory" (1931): airbrush-smooth oil glazes (Canvas2D gradients, soft blurred
 * shadows, hard dream light, one long shadow direction), with p5.brush HB / 2H / 2B / pen for the micro detail
 * (bark grain, finger & palm creases, eyelashes, rock strata, sea streaks).
 * 67: two giant hands rise from the plain, palms up, each balancing a melting pocket watch like a pair of scales (V.G.arm);
 *     the dead olive tree on the plinth does the same with its two branches. Every dial reads 6:07.
 */
(function () {
  'use strict';
  const W = 1920, H = 1080;
  const HOR = 500;        // far sea edge
  const SHORE = 552;      // beach line
  const GY = 884;         // ground line where the forearms emerge
  const LT = [-0.79, -0.61]; // unit vector pointing TOWARD the light (upper-left)
  const SHK = 1.5, SHY = -0.07; // cast shadows: per px of height -> long to the right, slightly back
  const SKIN = [[0, '#fcefe2'], [0.12, '#f1d5bb'], [0.4, '#dcb091'], [0.7, '#a7765f'], [0.86, '#7d5646'], [1, '#a8806c']];
  const FING = [[0, '#fdeee2'], [0.18, '#f3d3ba'], [0.5, '#dba88a'], [0.8, '#a26e58'], [1, '#b98a74']];
  const BARK = [[0, '#8c7863'], [0.22, '#5f4c3b'], [0.62, '#30251b'], [1, '#4a3b2f']];
  const sr = {};

  // ------------------------------------------------------------------ geometry helpers
  sr.path = function (ctx, pts, close = true) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    }
    if (close) ctx.closePath();
  };
  sr.bbox = function (pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(([x, y]) => { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; });
    return [x0, y0, x1, y1];
  };
  /** tube polygon around a (screen) axis polyline; rad(t 0..1) radius; round tip (default) / round base (o.base) */
  sr.capsule = function (axis, rad, o = {}) {
    const A = V.resample(V.smoothPts(axis, false, 8), 3);
    const n = A.length;
    if (n < 2) return [];
    const rf = typeof rad === 'function' ? rad : () => rad;
    const Lp = [], Rp = [];
    for (let i = 0; i < n; i++) {
      const a = A[Math.max(0, i - 1)], b = A[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      const r = rf(i / (n - 1));
      Lp.push([A[i][0] - dy * r, A[i][1] + dx * r]);
      Rp.push([A[i][0] + dy * r, A[i][1] - dx * r]);
    }
    const cap = (p, q, r) => {
      const ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
      const out = [];
      for (let k = 1; k < 12; k++) {
        const a = ang + Math.PI / 2 - (Math.PI * k) / 12;
        out.push([p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r]);
      }
      return out;
    };
    let poly = Lp.slice();
    if (o.tip !== false) poly = poly.concat(cap(A[n - 1], A[n - 2], rf(1)));
    poly = poly.concat(Rp.reverse());
    if (o.base) poly = poly.concat(cap(A[0], A[1], rf(0)));
    return poly;
  };
  /** linear gradient across a tube, lit side = side facing LT */
  sr.cross = function (ctx, axis, rmax, stops) {
    const a = axis[0], b = axis[axis.length - 1];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    let nx = -dy, ny = dx;
    if (nx * LT[0] + ny * LT[1] < 0) { nx = -nx; ny = -ny; }
    const g = ctx.createLinearGradient(mx + nx * rmax, my + ny * rmax, mx - nx * rmax, my - ny * rmax);
    stops.forEach(([p, c]) => g.addColorStop(p, c));
    return g;
  };
  sr.lin = function (ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([p, c]) => g.addColorStop(V.clamp(p), c));
    return g;
  };
  sr.rad = function (ctx, x, y, r0, r1, stops) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([p, c]) => g.addColorStop(V.clamp(p), c));
    return g;
  };
  /** soft round tint spot */
  sr.spot = function (ctx, x, y, r, col, a) {
    ctx.fillStyle = sr.rad(ctx, x, y, 0, r, [[0, `rgba(${col},${a})`], [1, `rgba(${col},0)`]]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // ------------------------------------------------------------------ the soft watch
  /**
   * Drape map: clock frame (cx -> 3 o'clock, cy -> 6 o'clock, unit disc) -> screen.
   * The disc lies on a support (direction ang, foreshortened by f) up to the fold u = e, wraps over the edge and hangs straight down,
   * stretching (st), slightly tapering (tp), the hem waving (wob), with one longer melting lobe (drip at v = dv).
   */
  sr.drape = function (c) {
    const R = c.R, f = c.f, e = c.e, ca = Math.cos(c.ang || 0), sa = Math.sin(c.ang || 0);
    const cr = Math.cos(c.rot || 0), cs = Math.sin(c.rot || 0);
    const bend = c.bend || 0.2, st = c.st || 1, tp = c.tp || 0, hx = c.hx || 0, sw = c.sw || 0;
    const drip = c.drip || 0, dv = c.dv || 0, wav = c.wav || 0, seed = c.seed || 0, wob = c.wob == null ? 0.05 : c.wob;
    return function (cx, cy) {
      const v = cx * cr - cy * cs, u = cx * cs + cy * cr;
      if (u <= e) {
        const ww = wav * Math.sin(v * 3.3 + seed) * (e - u);
        const lx = v * R, ly = u * f * R + ww * R;
        return [c.x + lx * ca - ly * sa, c.y + lx * sa + ly * ca];
      }
      const dk = 1 + drip * Math.exp(-((v - dv) * (v - dv)) / 0.3);
      const s = (u - e) * st * dk;
      const sy = f * s + (1 - f) * (s < bend ? (s * s) / (2 * bend) : s - bend / 2);
      const tap = 1 - tp * V.smooth(0, 1.3, s) + 0.05 * Math.sin(Math.PI * V.clamp(s / 1.2));
      const lx = v * R * tap, ly = e * f * R;
      const wv = wob * Math.sin(v * 5.2 + seed * 1.7) * s * s;
      return [c.x + lx * ca - ly * sa + (hx * sy + sw * sy * sy) * R, c.y + lx * sa + ly * ca + sy * R + wv * R];
    };
  };
  const CLK_H = ((6 + 7 / 60) / 12) * Math.PI * 2; // hour hand at 6:07
  const CLK_M = (7 / 60) * Math.PI * 2;            // minute hand at 6:07
  sr.drapeOutline = function (c, r = 1, n = 120) {
    const M = sr.drape(c);
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push(M(Math.cos(a) * r, Math.sin(a) * r));
    }
    return out;
  };
  sr.watch = function (ctx, c) {
    const M = sr.drape(c);
    const R = c.R;
    const outer = sr.drapeOutline(c, 1), inner = sr.drapeOutline(c, 0.85);
    const [x0, y0, x1, y1] = sr.bbox(outer);
    // fold crest (support u = e) in clock coords
    const cr = Math.cos(c.rot || 0), cs = Math.sin(c.rot || 0);
    const toClk = (v, u) => [v * cr + u * cs, -v * cs + u * cr];
    const crest = [];
    for (let i = 0; i <= 30; i++) {
      const v = -1 + (2 * i) / 30, uu = c.e + 0.03;
      if (v * v + uu * uu > 0.7) continue;
      crest.push(M(...toClk(v, uu)));
    }
    const cP = M(...toClk(0, c.e));
    const cyF = V.clamp((cP[1] - y0) / Math.max(1, y1 - y0));
    const gold = c.silver ? ['#8e9aa3', '#c9d3d8', '#f4f8f6', '#b9c6cb', '#5f6c74', '#aab7bd', '#46525a'] : ['#9a6c1c', '#dfb244', '#fff2bc', '#e4b646', '#7c500e', '#d4a238', '#5a3a08'];
    const shA = c.shA == null ? 0.38 : c.shA;
    if (shA > 0) {
      ctx.save();
      ctx.filter = `blur(${Math.max(1.5, R * 0.07).toFixed(1)}px)`;
      ctx.fillStyle = `rgba(38,18,6,${shA})`;
      ctx.translate(R * 0.09, R * 0.1);
      sr.path(ctx, outer);
      ctx.fill();
      ctx.restore();
    }
    // case thickness (the soft metal has a rolled edge)
    ctx.save();
    ctx.translate(R * 0.01, R * 0.05);
    sr.path(ctx, outer);
    ctx.fillStyle = c.silver ? '#3f4a52' : '#4a2f08';
    ctx.fill();
    ctx.restore();
    // bezel
    sr.path(ctx, outer);
    ctx.fillStyle = sr.lin(ctx, x0, y0, x0 + (x1 - x0) * 0.3, y1, [[0, gold[0]], [cyF - 0.16, gold[1]], [cyF - 0.02, gold[2]], [cyF + 0.08, gold[3]], [cyF + 0.34, gold[4]], [cyF + 0.58, gold[5]], [0.94, gold[6]], [1, gold[4]]]);
    ctx.fill();
    ctx.save();
    sr.path(ctx, outer);
    ctx.clip();
    sr.spot(ctx, x0 + (x1 - x0) * 0.22, cP[1] + R * 0.25, R * 0.45, '255,250,215', 0.35);
    ctx.restore();
    // face
    sr.path(ctx, inner);
    ctx.fillStyle = c.face || '#f1e6c4';
    ctx.fill();
    ctx.save();
    sr.path(ctx, inner);
    ctx.clip();
    ctx.fillStyle = sr.lin(ctx, 0, y0, 0, y1, [[0, 'rgba(255,252,240,0.4)'], [cyF, 'rgba(255,252,240,0)'], [cyF + 0.08, 'rgba(120,88,40,0.03)'], [1, 'rgba(100,70,30,0.32)']]);
    ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    ctx.fillStyle = sr.lin(ctx, x0, 0, x1, 0, [[0, 'rgba(255,250,235,0.18)'], [0.5, 'rgba(255,250,235,0)'], [1, 'rgba(110,80,35,0.16)']]);
    ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    ctx.filter = `blur(${Math.max(1, R * 0.05).toFixed(1)}px)`;
    ctx.lineWidth = R * 0.14;
    ctx.strokeStyle = 'rgba(105,74,28,0.3)';
    sr.path(ctx, inner);
    ctx.stroke();
    if (crest.length > 1) {
      ctx.filter = `blur(${Math.max(1, R * 0.03).toFixed(1)}px)`;
      ctx.lineWidth = R * 0.055;
      ctx.strokeStyle = 'rgba(255,255,250,0.55)';
      sr.path(ctx, crest, false);
      ctx.stroke();
      ctx.lineWidth = R * 0.08;
      ctx.strokeStyle = 'rgba(120,85,35,0.2)';
      ctx.translate(0, R * 0.1);
      sr.path(ctx, crest, false);
      ctx.stroke();
    }
    ctx.restore();
    ctx.filter = 'none';
    // minute track
    ctx.strokeStyle = '#2a1e12';
    ctx.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
      const r0 = big ? 0.73 : 0.785, r1 = 0.83;
      const p = M(Math.sin(a) * r0, -Math.cos(a) * r0), q = M(Math.sin(a) * r1, -Math.cos(a) * r1);
      ctx.lineWidth = Math.max(0.5, R * (big ? 0.016 : 0.007));
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
    }
    // numerals ride the local Jacobian of the drape, so they bend and stretch with the metal
    if (R > 30) {
      const FS = 40, sz = c.num || 0.2, eps = 0.02;
      ctx.fillStyle = '#1d150c';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${FS}px Didot, "Bodoni 72", serif`;
      for (let n = 1; n <= 12; n++) {
        const a = (n / 12) * Math.PI * 2;
        const px = Math.sin(a) * 0.63, py = -Math.cos(a) * 0.63;
        const p = M(px, py), qx = M(px + eps, py), qy = M(px, py + eps);
        // "six ... seven!": the spoken numeral blushes vermilion on its beat
        const hot = c.say && c.say.n === n ? c.say.env : 0;
        const k = (sz / FS / eps) * (1 + 0.35 * hot);
        ctx.setTransform((qx[0] - p[0]) * k, (qx[1] - p[1]) * k, (qy[0] - p[0]) * k, (qy[1] - p[1]) * k, p[0], p[1]);
        ctx.fillStyle = hot > 0.02 ? V.mix('#1d150c', '#c0281a', Math.min(1, hot * 1.4)) : '#1d150c';
        ctx.fillText(String(n), 0, 0);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // the hands: 6:07, always
    const handPoly = (ang, prof) => {
      const d = [Math.sin(ang), -Math.cos(ang)], pn = [Math.cos(ang), Math.sin(ang)];
      const L = [], Rr = [];
      prof.forEach(([s, w]) => {
        L.push(M(d[0] * s + pn[0] * w, d[1] * s + pn[1] * w));
        Rr.push(M(d[0] * s - pn[0] * w, d[1] * s - pn[1] * w));
      });
      return L.concat(Rr.reverse());
    };
    ctx.fillStyle = '#16100a';
    sr.path(ctx, handPoly(CLK_M, [[-0.13, 0.022], [0, 0.03], [0.3, 0.02], [0.55, 0.012], [0.74, 0.002]]));
    ctx.fill();
    sr.path(ctx, handPoly(CLK_H, [[-0.1, 0.026], [0, 0.036], [0.22, 0.024], [0.3, 0.05], [0.36, 0.044], [0.4, 0.014], [0.47, 0.002]]));
    ctx.fill();
    const hub = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; hub.push(M(Math.cos(a) * 0.045, Math.sin(a) * 0.045)); }
    sr.path(ctx, hub);
    ctx.fillStyle = '#c9982e';
    ctx.fill();
    ctx.lineWidth = Math.max(0.6, R * 0.008);
    ctx.strokeStyle = 'rgba(80,50,12,0.75)';
    sr.path(ctx, inner);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.8, R * 0.012);
    ctx.strokeStyle = 'rgba(52,30,6,0.85)';
    sr.path(ctx, outer);
    ctx.stroke();
    // crown + bow at 12 o'clock
    const p1 = M(0, -1), p2 = M(0, -1.06);
    let dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;
    const sq = V.clamp(dl / (0.06 * R), 0.32, 1);
    ctx.save();
    ctx.translate(p1[0], p1[1]);
    ctx.rotate(Math.atan2(dy, dx) + Math.PI / 2);
    ctx.fillStyle = sr.lin(ctx, -R * 0.06, 0, R * 0.06, 0, [[0, gold[2]], [0.5, gold[1]], [1, gold[4]]]);
    ctx.fillRect(-R * 0.035, -R * 0.08 * sq, R * 0.07, R * 0.08 * sq);
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.1 * sq, R * 0.07, R * 0.045 * sq, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = R * 0.028;
    ctx.strokeStyle = gold[1];
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.2 * sq, R * 0.11, R * 0.08 * sq, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.6, R * 0.008);
    ctx.strokeStyle = 'rgba(52,30,6,0.7)';
    ctx.stroke();
    ctx.restore();
    return { M, outer };
  };

  // ------------------------------------------------------------------ Cap de Creus (static geometry + relief texture)
  const CL = { x0: 1380, x1: 1940, base: 536, tx0: 1270, ty0: 250 };
  sr.cliff = function () {
    return V.once('sr_cliff', () => {
      const topAt = (x) => {
        const t = V.clamp((x - CL.x0) / (CL.x1 - CL.x0));
        const n = (V.noise1(x * 0.016 + 5) - 0.5) * 46 + (V.noise1(x * 0.05 + 9) - 0.5) * 16 + (V.noise1(x * 0.16 + 2) - 0.5) * 5;
        return Math.min(CL.base - 6, CL.base - 22 - Math.pow(t, 0.55) * 226 + n * V.smooth(CL.x0, CL.x0 + 70, x));
      };
      const sil = [[CL.x0 - 26, CL.base]];
      for (let x = CL.x0 - 26; x <= CL.x1; x += 4) sil.push([x, x < CL.x0 ? CL.base - 4 - (x - CL.x0 + 26) * 0.7 : topAt(x)]);
      sil.push([CL.x1, CL.base]);
      // two small islets off the point
      const islets = [sr_islet(1318, 534, 26, 12, 3), sr_islet(1352, 536, 14, 7, 8)];
      return { sil, topAt, islets };
    });
  };
  function sr_islet(x, y, rx, ry, seed) {
    const out = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI + (i / 16) * Math.PI;
      const k = 1 + (V.noise1(seed + i * 0.7) - 0.5) * 0.5;
      out.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry * k]);
    }
    return out;
  }
  /** per-pixel shaded relief of the headland (fBm height field, ridged fissures, lit from the upper left). Painted once. */
  sr.cliffTex = function () {
    return V.once('sr_cliftex', () => {
      const X0 = CL.tx0, Y0 = CL.ty0, CW = W - X0, CH = CL.base + 8 - Y0;
      const fbm = (x, y, oct) => {
        let a = 0.5, f = 1, s = 0;
        for (let i = 0; i < oct; i++) { s += a * V.noise2(x * f + i * 17.3, y * f - i * 9.1); f *= 2.03; a *= 0.5; }
        return s;
      };
      const hf = new Float32Array(CW * CH);
      for (let y = 0; y < CH; y++) {
        for (let x = 0; x < CW; x++) {
          const X = X0 + x, Y = Y0 + y;
          // big wind-rounded masses, terraced into ledges (schist strata), cut by a few deep fissures
          let h = fbm(X * 0.0052, Y * 0.0088, 4);
          const tq = h * 8, fq = tq - Math.floor(tq);
          h = V.lerp(h, (Math.floor(tq) + V.smooth(0.2, 0.8, fq)) / 8, 0.45);
          const rg = 1 - Math.abs(2 * fbm(X * 0.0095 + 3, Y * 0.014 + 7, 3) - 1);
          h -= Math.pow(rg, 8) * 0.26;
          h += (V.noise2(X * 0.055, Y * 0.013) - 0.5) * 0.03;
          h += (V.noise2(X * 0.14, Y * 0.14) - 0.5) * 0.01;
          hf[y * CW + x] = h;
        }
      }
      // box-blurred copy for a cheap ambient occlusion
      const bl = new Float32Array(CW * CH), tmp = new Float32Array(CW * CH), R = 9;
      for (let y = 0; y < CH; y++) {
        let acc = 0;
        for (let x = -R; x <= R; x++) acc += hf[y * CW + V.clamp(x, 0, CW - 1)];
        for (let x = 0; x < CW; x++) {
          tmp[y * CW + x] = acc / (2 * R + 1);
          acc += hf[y * CW + Math.min(CW - 1, x + R + 1)] - hf[y * CW + Math.max(0, x - R)];
        }
      }
      for (let x = 0; x < CW; x++) {
        let acc = 0;
        for (let y = -R; y <= R; y++) acc += tmp[V.clamp(y, 0, CH - 1) * CW + x];
        for (let y = 0; y < CH; y++) {
          bl[y * CW + x] = acc / (2 * R + 1);
          acc += tmp[Math.min(CH - 1, y + R + 1) * CW + x] - tmp[Math.max(0, y - R) * CW + x];
        }
      }
      const ramp = [[0, [56, 24, 8]], [0.28, [112, 60, 24]], [0.5, [182, 114, 46]], [0.68, [228, 162, 70]], [0.84, [248, 204, 114]], [1, [255, 238, 188]]];
      const col = (v) => {
        v = V.clamp(v);
        for (let i = 1; i < ramp.length; i++) {
          if (v <= ramp[i][0]) {
            const a = ramp[i - 1], b = ramp[i], t = (v - a[0]) / (b[0] - a[0]);
            return [a[1][0] + (b[1][0] - a[1][0]) * t, a[1][1] + (b[1][1] - a[1][1]) * t, a[1][2] + (b[1][2] - a[1][2]) * t];
          }
        }
        return ramp[ramp.length - 1][1];
      };
      const topAt = sr.cliff().topAt;
      const Lx = -0.74, Ly = -0.4, Lz = 0.54, S = 84;
      const cv = document.createElement('canvas');
      cv.width = CW; cv.height = CH;
      const c2 = cv.getContext('2d');
      const img = c2.createImageData(CW, CH);
      for (let y = 1; y < CH - 1; y++) {
        for (let x = 1; x < CW - 1; x++) {
          const i = y * CW + x;
          const hx = hf[i + 1] - hf[i - 1], hy = hf[i + CW] - hf[i - CW];
          let nx = -hx * S, ny = -hy * S, nz = 1;
          const nl = Math.hypot(nx, ny, nz);
          nx /= nl; ny /= nl; nz /= nl;
          const d = Math.max(0, nx * Lx + ny * Ly + nz * Lz);
          const ao = V.clamp(0.72 + (hf[i] - bl[i]) * 5, 0.3, 1.12);
          const X = CL.tx0 + x, Y = CL.ty0 + y;
          const dist = Y - (X < CL.x0 ? CL.base - 20 : topAt(X));
          const rim = Math.exp(-Math.max(0, dist) / 14) * 0.26;
          const foot = 0.68 + 0.32 * V.smooth(CL.base, CL.base - 120, Y);
          const c = col((0.04 + d * 1.08 * ao + rim) * foot);
          img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255;
        }
      }
      c2.putImageData(img, 0, 0);
      return cv;
    });
  };

  // block (plinth) geometry
  const BLK = { fl: -10, fr: 430, ft: 690, fb: 905, bx: 562, bt: 642, bb: 804 };
  const OW = { x: 112, y: 664 }; // the orange watch

  sr.bakeBG = function () {
    const CLF = sr.cliff();
    V.with2d((ctx) => {
      // ---- sky
      ctx.fillStyle = sr.lin(ctx, 0, 0, 0, HOR, [[0, '#0f2e48'], [0.2, '#1e4a6e'], [0.46, '#3c7391'], [0.66, '#7ea5ab'], [0.8, '#c2c29e'], [0.91, '#e8c07a'], [1, '#f0b45a']]);
      ctx.fillRect(0, 0, W, HOR + 4);
      ctx.fillStyle = sr.rad(ctx, 260, HOR + 40, 0, 1000, [[0, 'rgba(255,216,150,0.5)'], [0.5, 'rgba(255,200,130,0.14)'], [1, 'rgba(255,200,130,0)']]);
      ctx.fillRect(0, 0, W, HOR + 4);
      ctx.save();
      ctx.filter = 'blur(9px)';
      const rc = V.rng(77);
      for (let i = 0; i < 10; i++) {
        const y = 340 + rc() * 130, x = rc() * W, w = 240 + rc() * 520, h = 4 + rc() * 7;
        ctx.fillStyle = `rgba(255,236,200,${0.1 + rc() * 0.14})`;
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // ---- distant headland (left)
      ctx.fillStyle = sr.lin(ctx, 0, 470, 0, HOR, [[0, '#9a8e88'], [1, '#7a8890']]);
      sr.path(ctx, V.smoothPts([[-20, HOR + 2], [-20, 474], [70, 470], [160, 476], [260, 482], [380, 489], [520, 495], [640, HOR], [640, HOR + 2]], false, 6));
      ctx.fill();
      // ---- sea, glassy and still
      ctx.fillStyle = sr.lin(ctx, 0, HOR, 0, SHORE, [[0, '#a2c0b8'], [0.25, '#6c9da3'], [0.6, '#558b97'], [1, '#6e9fa2']]);
      ctx.fillRect(0, HOR, W, SHORE - HOR);
      ctx.fillStyle = sr.lin(ctx, 0, 0, W, 0, [[0, 'rgba(255,205,140,0.25)'], [0.45, 'rgba(255,205,140,0.05)'], [1, 'rgba(255,205,140,0)']]);
      ctx.fillRect(0, HOR, W, SHORE - HOR);
      const rs = V.rng(5);
      ctx.save();
      ctx.filter = 'blur(0.8px)';
      for (let i = 0; i < 34; i++) {
        const y = HOR + 3 + Math.pow(rs(), 1.3) * (SHORE - HOR - 6);
        const x = rs() * W, w = 40 + rs() * 300;
        ctx.fillStyle = rs() < 0.6 ? `rgba(225,240,232,${0.08 + rs() * 0.12})` : `rgba(40,80,95,${0.08 + rs() * 0.1})`;
        ctx.fillRect(x, y, w, 1.5);
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,250,230,0.55)';
      ctx.fillRect(0, HOR, W, 1.5);
      // reflection of the headland in the water
      ctx.save();
      ctx.filter = 'blur(3px)';
      ctx.fillStyle = 'rgba(110,62,30,0.5)';
      ctx.fillRect(CL.x0 - 20, CL.base, W, SHORE - CL.base);
      ctx.fillStyle = 'rgba(110,62,30,0.35)';
      ctx.fillRect(1290, CL.base, 90, SHORE - CL.base);
      ctx.restore();
      // ---- Cap de Creus: shaded relief, clipped to the headland + islets
      const clipCliff = () => {
        ctx.beginPath();
        [CLF.sil].concat(CLF.islets).forEach((poly) => {
          poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.closePath();
        });
      };
      ctx.save();
      clipCliff();
      ctx.clip();
      ctx.drawImage(sr.cliffTex(), CL.tx0, CL.ty0);
      // haze: the headland is far away; warm reflected light from the sea at its foot
      ctx.fillStyle = sr.lin(ctx, 0, 280, 0, CL.base, [[0, 'rgba(150,178,196,0.15)'], [0.55, 'rgba(240,200,140,0.04)'], [1, 'rgba(120,160,170,0.16)']]);
      ctx.fillRect(CL.tx0, CL.ty0, W - CL.tx0, CL.base - CL.ty0 + 8);
      ctx.restore();
      // the rim where rock meets sky: a hair of light
      ctx.save();
      ctx.strokeStyle = 'rgba(255,236,190,0.45)';
      ctx.lineWidth = 1.2;
      sr.path(ctx, CLF.sil.slice(1, -1), false);
      ctx.stroke();
      ctx.restore();
      // ---- the plain
      ctx.fillStyle = sr.lin(ctx, 0, SHORE, 0, H, [[0, '#e3b066'], [0.08, '#d09752'], [0.28, '#bc7e43'], [0.5, '#a26838'], [0.72, '#7c4e29'], [1, '#4a2c15']]);
      ctx.fillRect(0, SHORE, W, H - SHORE);
      ctx.fillStyle = 'rgba(255,238,200,0.6)';
      ctx.fillRect(0, SHORE, W, 2);
      ctx.fillStyle = 'rgba(120,80,45,0.25)';
      ctx.fillRect(0, SHORE + 2, W, 4);
      ctx.save();
      ctx.filter = 'blur(26px)';
      const ru = V.rng(11);
      for (let i = 0; i < 18; i++) {
        const y = 580 + ru() * 420, x = ru() * W, w = 140 + ru() * 380, h = 10 + ru() * 26;
        ctx.fillStyle = ru() < 0.5 ? `rgba(255,214,150,${0.08 + ru() * 0.1})` : `rgba(70,38,16,${0.08 + ru() * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // the far "mirror" slab: a flat polished plane reflecting the sky
      sr.path(ctx, [[1520, 600], [1840, 600], [1886, 616], [1484, 616]]);
      ctx.fillStyle = sr.lin(ctx, 0, 600, 0, 616, [[0, '#d2d9c8'], [0.5, '#a4c0bf'], [1, '#e7c88f']]);
      ctx.fill();
      ctx.fillStyle = '#4a2a12';
      ctx.fillRect(1484, 616, 402, 5);
      ctx.save();
      ctx.filter = 'blur(4px)';
      ctx.fillStyle = 'rgba(50,25,8,0.35)';
      sr.path(ctx, [[1886, 616], [1886, 621], [1960, 618], [1960, 610]]);
      ctx.fill();
      ctx.restore();
      // the long foreground shadow (cast by something we never see)
      ctx.save();
      ctx.filter = 'blur(34px)';
      ctx.fillStyle = 'rgba(36,18,6,0.55)';
      sr.path(ctx, [[-60, 770], [420, 815], [900, 885], [1350, 928], [1980, 942], [1980, 1140], [-60, 1140]]);
      ctx.fill();
      ctx.restore();
      // pebbles with their long shadows
      const rp = V.rng(23);
      for (let i = 0; i < 26; i++) {
        const x = 640 + rp() * 1260, y = 590 + Math.pow(rp(), 1.6) * 290;
        if (x > 1460 && y > 594 && y < 626) continue;
        const r = (1.5 + rp() * 4) * (0.6 + (y - 560) / 300);
        ctx.fillStyle = 'rgba(60,30,10,0.35)';
        ctx.beginPath();
        ctx.ellipse(x + r * 2.2, y + r * 0.2, r * 2.4, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = sr.rad(ctx, x - r * 0.4, y - r * 0.4, 0, r * 1.3, [[0, '#f0c890'], [1, '#7a4a24']]);
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // ---- the plinth and its shadow
      ctx.save();
      ctx.filter = 'blur(6px)';
      ctx.fillStyle = 'rgba(40,20,6,0.5)';
      const hF = BLK.fb - BLK.ft, hB = BLK.bb - BLK.bt;
      sr.path(ctx, [[BLK.fr, BLK.fb], [BLK.bx, BLK.bb], [BLK.bx + hB * SHK, BLK.bb + hB * SHY], [BLK.fr + hF * SHK, BLK.fb + hF * SHY]]);
      ctx.fill();
      ctx.restore();
      sr.path(ctx, [[BLK.fl, BLK.ft], [BLK.fr, BLK.ft], [BLK.fr, BLK.fb], [BLK.fl, BLK.fb]]);
      ctx.fillStyle = sr.lin(ctx, 0, BLK.ft, BLK.fr, BLK.fb, [[0, '#7c5232'], [0.5, '#5c3b20'], [1, '#3c2412']]);
      ctx.fill();
      ctx.save();
      sr.path(ctx, [[BLK.fl, BLK.ft], [BLK.fr, BLK.ft], [BLK.fr, BLK.fb], [BLK.fl, BLK.fb]]);
      ctx.clip();
      ctx.filter = 'blur(18px)';
      const rb = V.rng(31);
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = rb() < 0.5 ? 'rgba(150,100,60,0.18)' : 'rgba(30,15,5,0.2)';
        ctx.beginPath();
        ctx.ellipse(rb() * 430, 700 + rb() * 200, 30 + rb() * 70, 10 + rb() * 30, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      sr.path(ctx, [[BLK.fl, BLK.bt], [BLK.bx, BLK.bt], [BLK.fr, BLK.ft], [BLK.fl, BLK.ft]]);
      ctx.fillStyle = sr.lin(ctx, 0, BLK.bt, 0, BLK.ft, [[0, '#a2703e'], [0.6, '#bd8850'], [1, '#d7a266']]);
      ctx.fill();
      sr.path(ctx, [[BLK.fr, BLK.ft], [BLK.bx, BLK.bt], [BLK.bx, BLK.bb], [BLK.fr, BLK.fb]]);
      ctx.fillStyle = sr.lin(ctx, BLK.fr, 0, BLK.bx, 0, [[0, '#3a2311'], [1, '#26160a']]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,226,170,0.6)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(BLK.fl, BLK.ft); ctx.lineTo(BLK.fr, BLK.ft); ctx.lineTo(BLK.bx, BLK.bt);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(30,14,4,0.6)';
      ctx.beginPath();
      ctx.moveTo(BLK.fr, BLK.ft + 1); ctx.lineTo(BLK.fr, BLK.fb);
      ctx.stroke();
      ctx.save();
      ctx.filter = 'blur(5px)';
      ctx.fillStyle = 'rgba(30,14,4,0.6)';
      ctx.fillRect(BLK.fl, BLK.fb - 4, BLK.fr - BLK.fl, 10);
      ctx.restore();
      // ---- tree trunk (static part) + its shadow on the plinth
      ctx.save();
      ctx.filter = 'blur(3px)';
      ctx.fillStyle = 'rgba(50,25,8,0.45)';
      sr.path(ctx, [[226, 658], [250, 654], [372, 640], [360, 648]]);
      ctx.fill();
      ctx.restore();
      const tr = sr.tree();
      [tr.stub, tr.upL, tr.upR, tr.trunk].forEach((p) => {
        sr.path(ctx, p.poly);
        ctx.fillStyle = sr.cross(ctx, p.axis, p.r, BARK);
        ctx.fill();
      });
      ctx.fillStyle = sr.lin(ctx, 206, 0, 270, 0, [[0, '#8a7660'], [0.45, '#54422f'], [1, '#33271c']]);
      sr.path(ctx, V.smoothPts([[204, 662], [222, 642], [228, 612], [252, 614], [254, 640], [274, 660], [240, 664]], true, 6));
      ctx.fill();
      // knots
      [[236, 590, 4], [242, 528, 3.4]].forEach(([x, y, r]) => {
        ctx.fillStyle = '#2a1f16';
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(200,180,150,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, y, r + 1.5, r * 1.5 + 2, 0, 2.2, 4.4);
        ctx.stroke();
      });
      // ---- the hard orange watch (ants arrive per frame)
      const ox = OW.x, oy = OW.y;
      ctx.save();
      ctx.filter = 'blur(3px)';
      ctx.fillStyle = 'rgba(40,18,4,0.5)';
      ctx.beginPath();
      ctx.ellipse(ox + 26, oy + 5, 64, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#6a2a0c';
      ctx.beginPath();
      ctx.ellipse(ox, oy + 8, 58, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sr.lin(ctx, ox - 58, 0, ox + 58, 0, [[0, '#d9a64a'], [0.5, '#8a5e18'], [1, '#5e3a0a']]);
      ctx.fillRect(ox - 58, oy, 116, 8);
      ctx.beginPath();
      ctx.ellipse(ox, oy, 58, 18, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#c99a3a';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(ox, oy, 53.5, 16, 0, 0, Math.PI * 2);
      ctx.fillStyle = sr.rad(ctx, ox - 18, oy - 6, 0, 60, [[0, '#ffb070'], [0.35, '#e8742c'], [0.8, '#b8461a'], [1, '#8a3010']]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,220,0.55)';
      ctx.beginPath();
      ctx.ellipse(ox - 24, oy - 7, 12, 3, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d7a640';
      ctx.fillRect(ox - 4, oy - 23, 8, 7);
      ctx.strokeStyle = '#c99a3a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(ox, oy - 28, 11, 5.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    // ---- brush: rock strata, sea streaks, bark grain, plinth edge
    // glassy sea: long faint 2H drags
    const rs = V.rng(8);
    for (let i = 0; i < 22; i++) {
      const y = HOR + 4 + rs() * (SHORE - HOR - 8), x = rs() * 1300, w = 80 + rs() * 320;
      V.ink([[x, y], [x + w, y + (rs() - 0.5) * 1.2]], { brush: '2H', w: 0.5, color: rs() < 0.5 ? '#e8f2ea' : '#2f6070', alpha: 0.35, seed: 200 + i, wob: 0.3, taper: [40, 40] });
    }
    const tr = sr.tree();
    [tr.trunk, tr.upL, tr.upR, tr.stub].forEach((p, j) => {
      for (let k = 0; k < 4; k++) {
        const off = (k / 3 - 0.5) * p.r * 1.3;
        const pts = p.axis.map((q, i2) => {
          const a = p.axis[Math.max(0, i2 - 1)], b = p.axis[Math.min(p.axis.length - 1, i2 + 1)];
          const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
          return [q[0] - (dy / l) * off, q[1] + (dx / l) * off];
        });
        V.ink(pts, { brush: k % 2 ? 'HB' : '2H', w: 0.6, color: k === 0 ? '#cdbfa8' : '#1c140d', alpha: 0.65, seed: 300 + j * 10 + k, wob: 1.6, wobLen: 25, taper: [8, 8] });
      }
    });
    V.ink([[BLK.fl, BLK.ft + 2], [BLK.fr, BLK.ft + 2]], { brush: 'HB', w: 0.5, color: '#2a1608', alpha: 0.5, seed: 7, wob: 0.4 });
    // a hairline crack in the plinth
    V.ink([[120, 905], [128, 862], [118, 830], [132, 790], [126, 760]], { brush: 'HB', w: 0.5, color: '#24130a', alpha: 0.55, seed: 9, wob: 1.2 });
    // the soft watch melting over the plinth edge (with its fly)
    V.with2d((ctx) => {
      sr.watch(ctx, { x: 302, y: BLK.ft + 0.22 * 0.32 * 92, R: 92, f: 0.32, e: -0.22, st: 1.12, tp: 0.05, drip: 0.32, dv: 0.42, seed: 3, wav: 0.03, wob: 0.05, shA: 0.45 });
      sr.fly(ctx, 272, 760, 0.3);
    });
  };

  sr.fly = function (ctx, x, y, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(40,25,10,0.35)';
    ctx.beginPath();
    ctx.ellipse(3, 4, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#120c08';
    ctx.lineWidth = 0.8;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * 2.5, 0); ctx.lineTo(i * 3.5 - 1, -6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * 2.5, 0); ctx.lineTo(i * 3.5 - 1, 6); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200,215,225,0.55)';
    ctx.beginPath(); ctx.ellipse(3, -4, 7, 3.2, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3, 4, 7, 3.2, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#17100a';
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-6.5, 0, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a1c10';
    ctx.beginPath(); ctx.arc(-7.4, -1.3, 1.1, 0, Math.PI * 2); ctx.arc(-7.4, 1.3, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  // ------------------------------------------------------------------ the dead olive tree (static trunk + two 67 branches)
  sr.tree = function () {
    return V.once('sr_tree', () => {
      const mk = (axis, r0, r1) => {
        const rf = (t) => V.lerp(r0, r1, t);
        return { axis: V.resample(V.smoothPts(axis, false, 8), 6), r: r0, poly: sr.capsule(axis, rf, { tip: false }) };
      };
      return {
        trunk: mk([[238, 660], [228, 612], [244, 562], [234, 512], [248, 474]], 16, 10),
        upL: mk([[248, 476], [216, 458], [182, 448]], 10, 7.5),
        upR: mk([[248, 476], [284, 460], [320, 450]], 10, 7.5),
        stub: mk([[236, 560], [214, 548], [204, 536]], 6, 3),
      };
    });
  };
  sr.treeArm = function (t, side) {
    const A = V.G.arm(t, side);
    const E = side ? [320, 450] : [182, 448];
    const phi = 0.42 + 0.4 * A.y;
    const L = 84;
    const dir = side ? [Math.cos(phi), -Math.sin(phi)] : [-Math.cos(phi), -Math.sin(phi)];
    const nrm = side ? [dir[1], -dir[0]] : [-dir[1], dir[0]];
    const tip = [E[0] + dir[0] * L, E[1] + dir[1] * L];
    const mid = [E[0] + dir[0] * L * 0.5 + nrm[0] * 5, E[1] + dir[1] * L * 0.5 + nrm[1] * 5];
    let lag = 0, ws = 0;
    for (let j = 1; j <= 6; j++) {
      const w = Math.exp(-j / 2.5);
      lag += w * (A.y - V.G.arm(t - j * 0.035, side).y);
      ws += w;
    }
    lag /= ws;
    return { A, E, tip, mid, dir, phi, lag, axis: [E, mid, tip], side };
  };

  // ------------------------------------------------------------------ the giant hands
  sr.handGeom = function (o) {
    const s = o.s, k = o.k;
    const c = Math.cos(o.rot), si = Math.sin(o.rot);
    const Th = (x, y) => { const X = x * s * k, Y = y * k; return [o.x + X * c - Y * si, o.y + X * si + Y * c]; };
    const Tf = (x, y) => [o.x + x * s * k, o.y + y * k];
    const g = { Th, Tf, s, k, o };
    const below = (o.gy - o.y) / k;
    g.armAxis = [Tf(0, below + 6), Tf(0, below * 0.5), Tf(0, -8)];
    // narrow wrist, muscular forearm lower down; the outer contour flares into the back of the hand, the inner one into the heel
    const rAt = (y) => 48 + 15 * V.smooth(10, 230, y + 8) + 2 * Math.sin((y + 8) * 0.02);
    g.armR = (tt) => k * rAt(V.lerp(below, -8, tt));
    const inner = [], outer = [];
    for (let i = 0; i <= 28; i++) {
      const y = V.lerp(below + 6, -12, i / 28);
      const r = rAt(y);
      const fl = 26 * Math.pow(V.smooth(40, -10, y), 2.2);
      const hb = 7 * Math.pow(V.smooth(34, -8, y), 1.5);
      outer.push(Tf(r + fl, y));
      inner.push(Tf(-(r + hb), y));
    }
    g.arm = outer.concat(inner.reverse());
    const N = [[-56, -20], [-46, -42], [-18, -53], [24, -56], [84, -55], [150, -51], [200, -46]];
    const F = [[-40, -54], [-6, -70], [62, -79], [136, -81], [196, -78]];
    const B = [[226, -16], [214, 1], [176, 8], [120, 10], [90, 9], [74, 6], [62, 0], [30, -6], [-20, -8], [-54, -10]];
    const TT = (pts) => pts.map((p) => Th(p[0], p[1]));
    g.N = V.smoothPts(TT(N), false, 6);
    g.side = V.smoothPts(TT(N.concat(B)), true, 6);
    g.top = V.smoothPts(TT(N.concat(F.slice().reverse())), true, 6);
    g.palmC = Th(80, -68);
    const fing = (ax, r0, r1, rm) => {
      const axis = TT(ax);
      const rf = (tt) => k * (V.lerp(r0, r1, tt) + (rm || 0) * Math.sin(Math.PI * V.clamp((tt - 0.3) / 0.5)));
      return { axis, r: r0 * k, rf, poly: sr.capsule(axis, rf, { base: true }) };
    };
    g.fingers = [
      fing([[186, -76], [244, -80], [296, -90]], 11, 9.5, 0.8), // little
      fing([[190, -66], [262, -68], [326, -78]], 12.5, 11, 1), // ring
      fing([[194, -55], [276, -54], [346, -62]], 13.5, 12, 1.2), // middle
      fing([[198, -39], [272, -35], [338, -42]], 15, 12.5, 1.2), // index
    ];
    g.thumb = fing([[-2, -26], [48, -22], [98, -26], [140, -38]], 23, 15, 1.5);
    g.nailA = Math.atan2(Th(140, -38)[1] - Th(98, -26)[1], Th(140, -38)[0] - Th(98, -26)[0]);
    g.nail = Th(128, -36);
    g.tips = g.fingers.map((f) => f.axis[f.axis.length - 1]);
    return g;
  };
  sr.handShadow = function (ctx, g, wcOutline) {
    const proj = (p) => { const h = Math.max(0, GY - p[1]); return [p[0] + h * SHK, GY + h * SHY]; };
    const parts = [g.arm, g.side, g.top, g.thumb.poly, wcOutline].concat(g.fingers.map((f) => f.poly));
    ctx.save();
    ctx.filter = 'blur(4px)';
    ctx.fillStyle = 'rgba(46,20,4,0.5)';
    ctx.beginPath();
    parts.forEach((poly) => {
      poly.forEach((p, i) => { const q = proj(p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
    });
    ctx.fill('nonzero');
    ctx.restore();
  };
  /** sand swelling where the forearm breaks the surface (back half drawn before the arm, the front lip after) */
  sr.mound = function (ctx, x, hw, front) {
    const rx = hw * 2.1, ry = hw * 0.36, hy = GY - 6;
    const sand = (a) => sr.lin(ctx, x - rx, GY - ry, x + rx * 0.8, GY + ry, [[0, `rgba(196,140,82,${a})`], [0.4, `rgba(160,104,56,${a})`], [1, `rgba(92,56,28,${a})`]]);
    if (!front) {
      // a low swelling of disturbed sand, then the dark mouth of the hole
      ctx.save();
      ctx.filter = 'blur(7px)';
      ctx.beginPath();
      ctx.ellipse(x, GY, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = sand(0.9);
      ctx.fill();
      ctx.filter = 'blur(2.5px)';
      ctx.fillStyle = 'rgba(48,22,8,0.8)';
      ctx.beginPath();
      ctx.ellipse(x + 4, hy, hw * 1.12, hw * 0.21, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const pts = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI;
      pts.push([x + Math.cos(a) * rx * 0.8, GY + 2 + Math.sin(a) * ry * 0.72]);
    }
    for (let i = 32; i >= 0; i--) {
      const a = (i / 32) * Math.PI;
      pts.push([x + Math.cos(a) * hw * 1.1, hy + Math.sin(a) * hw * 0.21]);
    }
    ctx.save();
    ctx.filter = 'blur(2px)';
    sr.path(ctx, pts);
    ctx.fillStyle = sand(1);
    ctx.fill();
    // the lip catches the light on the left, the arm's own shadow falls on the right
    ctx.filter = 'blur(2px)';
    ctx.strokeStyle = 'rgba(232,184,120,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, hy + 3, hw * 1.16, hw * 0.24, 0, 1.75, Math.PI - 0.1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,26,8,0.65)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, hy + 1, hw * 1.08, hw * 0.21, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.restore();
    // grains
    const r = V.rng(Math.round(x));
    for (let i = 0; i < 50; i++) {
      const a = r() * Math.PI, rr = 1.15 + r() * 0.65;
      const gx = x + Math.cos(a) * hw * rr, gy = GY + Math.sin(a) * hw * 0.22 * rr - 1;
      ctx.fillStyle = r() < 0.45 ? 'rgba(236,196,140,0.6)' : 'rgba(64,32,12,0.55)';
      ctx.fillRect(gx, gy, 1.5, 1.1);
    }
  };
  sr.drawHandBody = function (ctx, g) {
    const k = g.k;
    const [bx0, by0, bx1, by1] = sr.bbox(g.arm);
    // forearm
    sr.path(ctx, g.arm);
    ctx.fillStyle = sr.cross(ctx, g.armAxis, g.armR(0.5), SKIN);
    ctx.fill();
    ctx.save();
    sr.path(ctx, g.arm);
    ctx.clip();
    ctx.fillStyle = sr.lin(ctx, 0, by0, 0, GY, [[0, 'rgba(80,36,16,0)'], [0.55, 'rgba(80,36,16,0)'], [1, 'rgba(62,28,10,0.6)']]);
    ctx.fillRect(bx0 - 2, by0 - 2, bx1 - bx0 + 4, by1 - by0 + 4);
    const w = g.Tf(0, -6);
    sr.spot(ctx, w[0] + g.s * 44 * k, w[1] + 18, 90 * k, '86,40,22', 0.55);
    sr.spot(ctx, w[0] - g.s * 30 * k, w[1] + 4, 40 * k, '255,236,220', 0.35);
    // tendons + a faint vein
    ctx.filter = 'blur(5px)';
    ctx.strokeStyle = 'rgba(255,242,228,0.4)';
    ctx.lineWidth = 8 * k;
    let t0 = g.Tf(-24, 6), t1 = g.Tf(-34, (GY - g.o.y) / k);
    ctx.beginPath(); ctx.moveTo(t0[0], t0[1]); ctx.lineTo(t1[0], t1[1]); ctx.stroke();
    ctx.filter = 'blur(2px)';
    ctx.strokeStyle = 'rgba(110,120,150,0.22)';
    ctx.lineWidth = 3.5 * k;
    t0 = g.Tf(-6, 30); t1 = g.Tf(4, 120);
    const t2 = g.Tf(-10, 220);
    ctx.beginPath(); ctx.moveTo(t0[0], t0[1]); ctx.quadraticCurveTo(t1[0], t1[1], t2[0], t2[1]); ctx.stroke();
    ctx.restore();
    // side face of the hand (thumb side, facing us)
    const [sx0, sy0, sx1, sy1] = sr.bbox(g.side);
    sr.path(ctx, g.side);
    ctx.fillStyle = sr.lin(ctx, 0, sy0, 0, sy1, [[0, '#efcdb0'], [0.45, '#d2a080'], [1, '#8e604c']]);
    ctx.fill();
    ctx.save();
    sr.path(ctx, g.side);
    ctx.clip();
    ctx.fillStyle = sr.lin(ctx, sx0, 0, sx1, 0, [[0, 'rgba(255,236,214,0.22)'], [1, 'rgba(90,45,25,0.16)']]);
    ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
    const mcp = g.Th(212, -14);
    sr.spot(ctx, mcp[0], mcp[1], 26 * k, '214,120,100', 0.35);
    ctx.restore();
    // palm (top face): pink, cupped, a fleshy heel
    const [tx0, ty0, tx1, ty1] = sr.bbox(g.top);
    sr.path(ctx, g.top);
    ctx.fillStyle = '#eec0a6';
    ctx.fill();
    ctx.save();
    sr.path(ctx, g.top);
    ctx.clip();
    const heel = g.Th(-8, -56);
    sr.spot(ctx, heel[0], heel[1], 90 * k, '255,238,224', 0.75);
    sr.spot(ctx, g.palmC[0], g.palmC[1], 70 * k, '160,84,64', 0.32);
    const fb = g.Th(176, -70);
    sr.spot(ctx, fb[0], fb[1], 40 * k, '255,226,210', 0.45);
    ctx.restore();
    // the rounded edge between palm and side catches the light
    ctx.save();
    ctx.filter = 'blur(2px)';
    ctx.strokeStyle = 'rgba(255,240,226,0.6)';
    ctx.lineWidth = 4 * k;
    sr.path(ctx, g.N, false);
    ctx.stroke();
    ctx.restore();
    // fingers, back to front, each with a soft contact shadow, pink tips, knuckle flush
    g.fingers.forEach((f) => {
      ctx.save();
      ctx.filter = 'blur(2.5px)';
      ctx.translate(1.5, 4);
      sr.path(ctx, f.poly);
      ctx.fillStyle = 'rgba(105,46,28,0.45)';
      ctx.fill();
      ctx.restore();
      sr.path(ctx, f.poly);
      ctx.fillStyle = sr.cross(ctx, f.axis, f.r, FING);
      ctx.fill();
      ctx.save();
      sr.path(ctx, f.poly);
      ctx.clip();
      const tp = f.axis[f.axis.length - 1];
      sr.spot(ctx, tp[0], tp[1], f.r * 1.6, '226,128,108', 0.35);
      const hi = [tp[0] - g.s * f.r * 0.6, tp[1] - f.r * 0.45];
      sr.spot(ctx, hi[0], hi[1], f.r * 0.7, '255,250,244', 0.55);
      const j = f.axis[Math.floor(f.axis.length * 0.55)];
      sr.spot(ctx, j[0], j[1] - f.r * 0.3, f.r * 1.1, '255,244,232', 0.25);
      ctx.restore();
    });
  };
  sr.drawThumb = function (ctx, g) {
    const f = g.thumb, k = g.k;
    ctx.save();
    ctx.filter = 'blur(4px)';
    ctx.translate(4, 7);
    sr.path(ctx, f.poly);
    ctx.fillStyle = 'rgba(80,40,20,0.45)';
    ctx.fill();
    ctx.restore();
    sr.path(ctx, f.poly);
    ctx.fillStyle = sr.cross(ctx, f.axis, f.r, FING);
    ctx.fill();
    ctx.save();
    sr.path(ctx, f.poly);
    ctx.clip();
    const tp = f.axis[f.axis.length - 1];
    sr.spot(ctx, tp[0], tp[1], 30 * k, '222,124,104', 0.3);
    const base = f.axis[0];
    sr.spot(ctx, base[0], base[1] - 8, 40 * k, '255,240,226', 0.35);
    ctx.restore();
    // nail
    ctx.save();
    ctx.translate(g.nail[0], g.nail[1]);
    ctx.rotate(g.nailA);
    ctx.fillStyle = sr.lin(ctx, -13 * k * g.s, 0, 13 * k * g.s, 0, [[0, '#dcaa98'], [0.72, '#f6dccd'], [1, '#fff6ee']]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 13 * k, 8.5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(-4 * g.s * k, -3 * k, 5 * k, 2 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  sr.handBrush = function (g, seed) {
    const Th = g.Th;
    const L = (pts, o) => V.ink(pts.map((p) => Th(p[0], p[1])), Object.assign({ brush: 'HB', w: 0.55, color: '#7a4232', alpha: 0.55, wob: 0.6, taper: [10, 10], seed }, o));
    // palm lines (foreshortened)
    L([[140, -54], [92, -58], [40, -64], [0, -62], [-26, -54]], { smooth: true, seed: seed + 1 });
    L([[186, -74], [140, -77], [84, -79], [40, -72]], { smooth: true, seed: seed + 2, alpha: 0.45 });
    L([[164, -63], [116, -68], [60, -70]], { smooth: true, seed: seed + 3, alpha: 0.4 });
    // wrist folds (back of the wrist, outer corner)
    L([[49, -4], [60, 4], [76, 9]], { seed: seed + 4, alpha: 0.6, w: 0.7 });
    L([[44, 4], [56, 12], [70, 16]], { seed: seed + 5, alpha: 0.45 });
    // inner wrist crease
    L([[-48, -18], [-34, -24], [-18, -26]], { seed: seed + 6, alpha: 0.4 });
    // knuckle wrinkles on the index finger (its side faces us) + joint creases on the others
    [[282, -36], [318, -39]].forEach((p, i) => {
      L([[p[0] - 4, p[1] - 11], [p[0] + 2, p[1] - 1], [p[0] - 2, p[1] + 9]], { seed: seed + 10 + i, alpha: 0.6, w: 0.6 });
      L([[p[0] + 6, p[1] - 9], [p[0] + 9, p[1]], [p[0] + 6, p[1] + 7]], { seed: seed + 12 + i, alpha: 0.35, w: 0.45 });
    });
    [[292, -56], [326, -59], [276, -68], [306, -72], [256, -80], [280, -84]].forEach((p, i) => {
      L([[p[0], p[1] - 8], [p[0] + 2, p[1]], [p[0], p[1] + 7]], { seed: seed + 20 + i, alpha: 0.4, w: 0.42 });
    });
    // painted under-contour of the hand (dark sienna)
    L([[226, -16], [214, 1], [176, 8], [118, 10], [76, 7]], { seed: seed + 30, color: '#5a2c1c', alpha: 0.5, w: 0.6, smooth: true });
  };
  sr.thumbBrush = function (g, seed) {
    const Th = g.Th, k = g.k;
    V.ink([[96, -44], [100, -32], [96, -18]].map((p) => Th(p[0], p[1])), { brush: 'HB', w: 0.55, color: '#7a4232', alpha: 0.55, seed, taper: [8, 8] });
    V.ink([[104, -42], [107, -32], [104, -22]].map((p) => Th(p[0], p[1])), { brush: 'HB', w: 0.4, color: '#7a4232', alpha: 0.35, seed: seed + 2, taper: [8, 8] });
    const c = g.nail, a = g.nailA;
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const t = (i / 20) * Math.PI * 2;
      const lx = Math.cos(t) * 13 * k, ly = Math.sin(t) * 8.5 * k;
      pts.push([c[0] + lx * Math.cos(a) - ly * Math.sin(a), c[1] + lx * Math.sin(a) + ly * Math.cos(a)]);
    }
    V.ink(pts, { brush: 'HB', w: 0.45, color: '#8a4c3a', alpha: 0.6, seed: seed + 1, closed: true, taper: [0, 0] });
  };

  // ------------------------------------------------------------------ the soft self-portrait (sleeping profile, breathing on the beat)
  sr.creature = function (t) {
    const X = 330, Y = 972, S = 1.06;
    const b = 0.5 - 0.5 * V.G.bob(t);              // 1 just after each beat... inhale/exhale once per beat
    const sy = S * (1 + 0.07 * b), sx = S * (1 - 0.015 * b);
    const T = (x, y) => [X + x * sx, Y + y * sy];
    const body = [[-2, -4], [-14, -14], [-18, -30], [-10, -46], [6, -60], [26, -84], [56, -108], [98, -126], [148, -134], [200, -128], [244, -114], [290, -92], [340, -68], [392, -46], [440, -28], [482, -13], [508, -4], [512, 2], [470, 6], [380, 7], [260, 8], [150, 7], [74, 6], [44, 3], [30, -6], [18, -10], [8, -6]];
    return { T, b, body: V.smoothPts(body.map((p) => T(p[0], p[1])), true, 6), X, Y, sy };
  };
  sr.drawCreature = function (ctx, cr) {
    const [x0, y0, x1, y1] = sr.bbox(cr.body);
    ctx.save();
    ctx.filter = 'blur(8px)';
    ctx.fillStyle = 'rgba(30,14,4,0.6)';
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2 + 60, cr.Y + 2, (x1 - x0) * 0.62, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    sr.path(ctx, cr.body);
    const hl = cr.T(140, -150);
    ctx.fillStyle = sr.rad(ctx, hl[0], hl[1], 0, 360, [[0, '#fbf3e6'], [0.25, '#ecdcc6'], [0.5, '#cdb39c'], [0.75, '#9f8574'], [1, '#6c5448']]);
    ctx.fill();
    ctx.save();
    sr.path(ctx, cr.body);
    ctx.clip();
    ctx.fillStyle = sr.lin(ctx, 0, cr.Y - 70, 0, cr.Y + 4, [[0, 'rgba(70,45,35,0)'], [1, 'rgba(56,32,22,0.65)']]);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0 + 6);
    const P = (x, y) => cr.T(x, y);
    let p = P(96, -68); sr.spot(ctx, p[0], p[1], 64, '128,86,78', 0.4);   // eye socket
    p = P(92, -86); sr.spot(ctx, p[0], p[1], 36, '255,246,236', 0.75);    // eyelid bulge
    p = P(-4, -34); sr.spot(ctx, p[0], p[1], 28, '255,244,232', 0.6);     // nose bridge
    p = P(-8, -14); sr.spot(ctx, p[0], p[1], 22, '214,140,120', 0.45);    // nose tip flush
    p = P(60, -116); sr.spot(ctx, p[0], p[1], 60, '255,248,236', 0.45);   // forehead
    p = P(26, -30); sr.spot(ctx, p[0], p[1], 34, '110,72,60', 0.4);       // under the nose / cheek hollow
    p = P(230, -64); sr.spot(ctx, p[0], p[1], 120, '236,192,132', 0.22);  // warm flesh in the half-tone
    p = P(400, -18); sr.spot(ctx, p[0], p[1], 90, '96,64,50', 0.3);       // the trailing body turns away
    p = P(160, -6); sr.spot(ctx, p[0], p[1], 80, '214,150,90', 0.2);      // sand-bounce under the cheek
    ctx.restore();
    ctx.save();
    ctx.filter = 'blur(1px)';
    ctx.strokeStyle = 'rgba(70,46,36,0.55)';
    ctx.lineWidth = 1.6;
    sr.path(ctx, cr.body);
    ctx.stroke();
    ctx.restore();
  };
  sr.creatureBrush = function (cr) {
    const P = (pts) => pts.map((p) => cr.T(p[0], p[1]));
    V.ink(P([[50, -66], [74, -58], [100, -55], [126, -59], [144, -68]]), { brush: 'HB', w: 1.1, color: '#2c180f', alpha: 0.9, smooth: true, seed: 501, taper: [12, 12] });
    V.ink(P([[56, -78], [82, -90], [116, -90], [142, -80]]), { brush: 'HB', w: 0.6, color: '#7a5a4a', alpha: 0.55, smooth: true, seed: 502 });
    V.ink(P([[36, -96], [70, -112], [114, -116], [154, -104]]), { brush: '2H', w: 0.8, color: '#6a4a3c', alpha: 0.5, smooth: true, seed: 503 });
    // very long lashes, curling down and back over the cheek
    for (let i = 0; i < 12; i++) {
      const tt = (i + (V.hash(i * 3.1) - 0.5) * 0.5) / 11;
      const bx = 52 + tt * 90, by = -63 + Math.sin(tt * Math.PI) * 8 - (tt > 0.8 ? (tt - 0.8) * 22 : 0);
      const L = (38 + Math.sin(tt * Math.PI) * 22) * (0.85 + V.hash(i * 7.7) * 0.3);
      const lean = -0.75 + tt * 0.45;
      // long lashes droop over the cheek in a soft curve
      V.ink(P([[bx, by], [bx + lean * L * 0.2, by + L * 0.42], [bx + lean * L * 0.55 - 2, by + L * 0.76], [bx + lean * L * 0.95 - 6, by + L * 0.98]]), { brush: 'ink', w: 0.36, color: '#1a0e08', alpha: 0.88, smooth: true, seed: 520 + i, taper: [2, 24], wob: 0.4 });
    }
    V.ink(P([[6, -18], [18, -26], [28, -18], [26, -10]]), { brush: 'HB', w: 0.8, color: '#5a3a2e', alpha: 0.75, smooth: true, seed: 540 });
    V.ink(P([[-16, -32], [-10, -46], [4, -60]]), { brush: '2H', w: 0.6, color: '#8a6a5a', alpha: 0.5, smooth: true, seed: 541 });
    [[260, -104], [312, -80], [364, -58]].forEach((p, i) => V.ink(P([[p[0], p[1] + 4], [p[0] + 14, p[1] + 26], [p[0] + 16, p[1] + 52]]), { brush: '2H', w: 0.6, color: '#8a7062', alpha: 0.45, smooth: true, seed: 550 + i }));
  };

  sr.ants = function (ctx, t) {
    const r = V.rng(612);
    const ox = OW.x, oy = OW.y;
    ctx.fillStyle = '#120a05';
    ctx.strokeStyle = '#120a05';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 38; i++) {
      const a0 = r() * Math.PI * 2, rr = 0.2 + Math.sqrt(r()) * 0.72;
      const ph = r() * 50;
      // slow wandering on the lid (the ants are the only thing in this painting that is not in a hurry)
      const wx = (V.noise1(t * 0.7 + ph) - 0.5) * 9, wy = (V.noise1(t * 0.7 + ph + 30) - 0.5) * 2.6;
      const x = ox + Math.cos(a0) * 44 * rr + wx, y = oy + Math.sin(a0) * 12 * rr + wy;
      const hd = a0 + Math.PI / 2 + (V.noise1(t * 0.5 + ph + 9) - 0.5) * 1.8;
      const hx = Math.cos(hd), hy = Math.sin(hd) * 0.45;
      const seg = (d, rad) => { ctx.beginPath(); ctx.ellipse(x + hx * d, y + hy * d, rad * 1.3, rad * 0.75, Math.atan2(hy, hx), 0, Math.PI * 2); ctx.fill(); };
      seg(-2.7, 1.5);
      seg(0, 0.85);
      seg(2.1, 1.05);
      const step = Math.sin(t * 18 + ph) * 0.7;
      for (let l = -1; l <= 1; l++) {
        const lx = x + hx * l * 0.9, ly = y + hy * l * 0.9, sp = l * 1.3 + (l === 0 ? step : -step);
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - hy * 3.4 + hx * sp, ly + hx * 1.4 + 0.8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + hy * 3.4 + hx * sp, ly - hx * 1.4 + 0.8); ctx.stroke();
      }
    }
  };

  // ------------------------------------------------------------------ a tiny far-off figure (Dalí's habit), also doing 67
  sr.figure = function (ctx, t) {
    const x = 1612, gy = 650, Hh = 66;
    const yl = V.G.arm(t, 0).y, yr = V.G.arm(t, 1).y, dip = 1.5 * V.G.pulse(t);
    const top = gy - Hh + dip;
    // long shadow, same direction as everything else
    ctx.save();
    ctx.filter = 'blur(1.5px)';
    ctx.fillStyle = 'rgba(46,20,4,0.5)';
    sr.path(ctx, [[x - 6, gy], [x + 6, gy], [x + 6 + Hh * SHK, gy + Hh * SHY + 2], [x - 2 + Hh * SHK, gy + Hh * SHY - 2]]);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + Hh * SHK + 4, gy + Hh * SHY, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    [[-1, yl], [1, yr]].forEach(([sd, y]) => {
      const hy = Hh * 0.46 + 7 * y;
      ctx.fillRect(x + hy * SHK + sd * 12, gy + hy * SHY - 1.5, 10, 3);
    });
    ctx.restore();
    // legs + long dark coat
    ctx.fillStyle = '#2a170b';
    ctx.fillRect(x - 5, gy - 16, 3.5, 16);
    ctx.fillRect(x + 1.5, gy - 16, 3.5, 16);
    sr.path(ctx, [[x - 8, top + 15], [x + 8, top + 15], [x + 10, gy - 14], [x - 10, gy - 14]]);
    ctx.fillStyle = sr.lin(ctx, x - 10, 0, x + 10, 0, [[0, '#9a6236'], [0.3, '#3a2312'], [1, '#1e1108']]);
    ctx.fill();
    // head
    ctx.fillStyle = sr.lin(ctx, x - 5, 0, x + 5, 0, [[0, '#e8b88a'], [1, '#6a3c20']]);
    ctx.beginPath();
    ctx.arc(x, top + 8, 5.4, 0, Math.PI * 2);
    ctx.fill();
    // arms: elbows at the waist, forearms out, palms up, see-sawing
    ctx.strokeStyle = '#2a170b';
    ctx.lineCap = 'round';
    [[-1, yl], [1, yr]].forEach(([sd, y]) => {
      const sx = x + sd * 7, sy = top + 17;
      const ex = x + sd * 10, ey = top + 30 + dip * 0.3;
      const hx = x + sd * 21, hy = top + 29 - 8 * y;
      ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = '#d9a274';
      ctx.beginPath();
      ctx.ellipse(hx + sd * 2.5, hy - 0.5, 3.4, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // ------------------------------------------------------------------ overlays
  sr.canvasTex = function () {
    return V.gfx('sr_canvas', 960, 540, (ctx) => {
      const img = ctx.createImageData(960, 540);
      const r = V.rng(67);
      for (let y = 0; y < 540; y++) {
        for (let x = 0; x < 960; x++) {
          const wx = Math.sin(x * 2.4 + Math.sin(y * 0.31) * 0.8), wy = Math.sin(y * 2.4 + Math.sin(x * 0.27) * 0.8);
          const v = 222 + 14 * (((x + y) & 1) ? wx : wy) + (r() - 0.5) * 18;
          const i = (y * 960 + x) * 4;
          img.data[i] = v; img.data[i + 1] = v * 0.985; img.data[i + 2] = v * 0.95; img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    });
  };

  // ------------------------------------------------------------------ per-frame model
  sr.model = function (t) {
    const hands = [0, 1].map((side) => {
      const A = V.G.arm(t, side);
      const y = 592 - 98 * A.y + 4 * V.G.pulse(t);
      const s = side ? 1 : -1;
      let lag = 0, ws = 0;
      for (let j = 1; j <= 6; j++) {
        const w = Math.exp(-j / 2.5);
        lag += w * (A.y - V.G.arm(t - j * 0.035, side).y);
        ws += w;
      }
      lag /= ws; // >0: the hand has just been rising -> the watch hangs longer
      const rot = -0.05 * A.v * s;
      const g = sr.handGeom({ x: side ? 1150 : 922, y, s, k: 1, rot, gy: GY });
      const wp = g.Th(186, -52);
      const R = 96;
      const wc = { x: wp[0], y: wp[1] + 0.1 * 0.34 * R, R, f: 0.34, e: -0.1, st: V.clamp(1.1 + lag * 0.85, 0.85, 1.6), tp: 0.05, drip: 0.3, dv: side ? 0.4 : -0.35, hx: 0.04 * s - lag * 0.05 * s, sw: 0.015 * s, ang: rot * 0.6, seed: 10 + side * 3, wav: 0.04, wob: 0.06, say: V.G.say(t) };
      return { side, A, g, wc, outline: sr.drapeOutline(wc, 1, 48) };
    });
    return { hands, arms: [0, 1].map((side) => sr.treeArm(t, side)), cr: sr.creature(t) };
  };

  // ------------------------------------------------------------------ scene
  V.scenes.surreal = {
    noHud: true,
    draw(t, u, meta) {
      V.bake('surreal_bg', sr.bakeBG);
      const md = sr.model(t);
      const { hands, arms, cr } = md;

      // ---- slowly travelling light on the cliffs
      const lu = V.clamp((u + 0.35) / 4.7);
      V.with2d((ctx) => {
        sr.path(ctx, sr.cliff().sil);
        ctx.clip();
        const lx = 1440 + lu * 360, ly = 400 + lu * 16;
        ctx.fillStyle = sr.rad(ctx, lx, ly, 0, 240, [[0, 'rgba(255,214,140,0.5)'], [0.5, 'rgba(255,190,110,0.18)'], [1, 'rgba(255,190,110,0)']]);
        ctx.fillRect(1250, 200, 700, 400);
      }, { blend: 'screen' });

      // ---- 2D: shadows, forearms, hand bodies, creature, tree branches
      V.with2d((ctx) => {
        sr.figure(ctx, t);
        hands.forEach((h) => sr.handShadow(ctx, h.g, h.outline));
        hands.forEach((h) => {
          sr.mound(ctx, h.g.o.x, 62, false);
          sr.drawHandBody(ctx, h.g);
          sr.mound(ctx, h.g.o.x, 62, true);
        });
        sr.drawCreature(ctx, cr);
        arms.forEach((a) => {
          ctx.save();
          ctx.filter = 'blur(2px)';
          ctx.translate(3, 5);
          sr.path(ctx, sr.capsule(a.axis, (tt) => V.lerp(8, 4.5, tt), { base: true }));
          ctx.fillStyle = 'rgba(40,20,8,0.25)';
          ctx.fill();
          ctx.restore();
          sr.path(ctx, sr.capsule(a.axis, (tt) => V.lerp(8, 4.5, tt), { base: true }));
          ctx.fillStyle = sr.cross(ctx, a.axis, 7.5, BARK);
          ctx.fill();
          ctx.fillStyle = sr.rad(ctx, a.E[0] - 2, a.E[1] - 3, 0, 12, [[0, '#94806a'], [0.6, '#5e4c3c'], [1, '#382b20']]);
          ctx.beginPath();
          ctx.ellipse(a.E[0], a.E[1], 10, 9, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // ---- brush micro-detail (under the watches)
      hands.forEach((h, i) => sr.handBrush(h.g, 700 + i * 50));
      sr.creatureBrush(cr);
      arms.forEach((a, i) => {
        const sgn = a.side ? 1 : -1;
        for (let k = 0; k < 3; k++) {
          const off = (k - 1) * 3.2;
          V.ink(a.axis.map((p) => [p[0] - a.dir[1] * off * sgn, p[1] + a.dir[0] * off * sgn]), { brush: k === 0 ? '2H' : 'HB', w: 0.5, color: k === 0 ? '#cfc1aa' : '#1f150d', alpha: 0.6, seed: 900 + i * 5 + k, wob: 0.8, taper: [6, 6] });
        }
        // three twig fingers, splayed upward like an open palm
        const base = a.tip;
        [-0.95, -0.4, 0.2].forEach((da, j) => {
          const ang = Math.atan2(a.dir[1], a.dir[0]) + da * (a.side ? 1 : -1);
          const L = 15 + j * 3;
          V.ink([[base[0], base[1]], [base[0] + Math.cos(ang) * L * 0.6, base[1] + Math.sin(ang) * L * 0.6 - 2], [base[0] + Math.cos(ang) * L, base[1] + Math.sin(ang) * L - 6]], { brush: 'ink', w: 0.75, color: '#33261b', alpha: 0.95, seed: 950 + i * 7 + j, taper: [2, 10], wob: 0.4 });
        });
      });

      // ---- 2D: the soft watches (branches, creature, hands)
      V.with2d((ctx) => {
        arms.forEach((a, i) => {
          const along = a.side ? -a.phi : a.phi;
          const p = [a.tip[0] - a.dir[0] * 20, a.tip[1] - a.dir[1] * 20];
          const R = 40;
          sr.watch(ctx, { x: p[0], y: p[1] + 0.45 * 0.3 * R - 6, R, f: 0.3, e: -0.45, st: V.clamp(1.05 - a.lag * 0.55, 0.8, 1.45), tp: 0.08, drip: 0.4, dv: i ? 0.3 : -0.3, ang: along * 0.55, rot: along * 0.2, seed: 30 + i, shA: 0.3, hx: 0.02 * (i ? 1 : -1), wob: 0.05 });
        });
        const wcr = cr.T(272, -106);
        sr.watch(ctx, { x: wcr[0], y: wcr[1], R: 70, f: 0.34, e: -0.3, st: 0.95 * (1 + 0.03 * cr.b), tp: 0.04, drip: 0.3, dv: -0.4, ang: 0.42, rot: 0.2, seed: 41, shA: 0.4, wob: 0.04, say: V.G.say(t) });
        hands.forEach((h) => sr.watch(ctx, h.wc));
      });

      // ---- thumbs pin the watches; ants swarm the orange watch
      V.with2d((ctx) => {
        hands.forEach((h) => sr.drawThumb(ctx, h.g));
        sr.ants(ctx, t);
      });
      hands.forEach((h, i) => sr.thumbBrush(h.g, 800 + i * 9));

      // ---- varnish, canvas weave, vignette, grain
      V.with2d((ctx) => {
        ctx.fillStyle = '#fbe8c6';
        ctx.fillRect(0, 0, W, H);
      }, { blend: 'multiply', alpha: 0.3 });
      V.blit(sr.canvasTex(), 0, 0, W, H, { blend: 'multiply', alpha: 0.35 });
      V.vignette({ amt: 0.42, color: '30,14,4', inner: 0.42 });
      V.grain({ amt: 0.06, anim: true });

      // ---- HUD (self-drawn so the year reads "1931", not "1,931")
      V.flush();
      V.resetBrush();
      V.mReset();
      const st = meta.hud || {};
      V.hudYear(u, Object.assign({}, meta, { yearText: '1931' }), st);
      V.hudLabel(u, meta, st);
    },
  };
})();
