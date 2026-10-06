/* hud.js — the per-scene year display + museum label card, and the time-travel odometer used in transitions.
 * main.js calls V.hud(u, meta) automatically after each scene's draw(). Scenes just keep the two HUD corners relatively clear.
 *   year block  : default anchor top-left   (~620 x 230 px)   — era-styled numerals + a small Chinese era pill
 *   label card  : default anchor bottom-right (~560 x 170 px) — a museum wall label with deadpan text
 * Per-scene style comes from timeline.json (meta.hud). A scene may override with  V.scenes.x.hudStyle = (u, meta) => ({...}) ,
 * or turn it off with  V.scenes.x.noHud = true  and call V.hudYear / V.hudLabel itself.
 */
(function () {
  const E = V.E;
  const fmt = (n) => (Math.abs(n) >= 10000 ? String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(Math.abs(Math.round(n)))); // thousands comma only for 5+ digit years (40,000) — never '2,006'

  function anchorXY(anchor, w, h, m = 56) {
    const x = anchor.includes('l') ? m : anchor.includes('r') ? V.W - m - w : (V.W - w) / 2;
    const y = anchor.includes('t') ? m : anchor.includes('b') ? V.H - m - h : (V.H - h) / 2;
    return [x, y];
  }

  /** the year block. h = meta.hud style object. u = scene-local time. */
  V.hudYear = function (u, meta, h) {
    const st = Object.assign({ font: 'Futura', weight: 'bold', color: '#fff', stroke: '#000', strokeW: 0, size: 150, anchor: 'tl', shadow: null, pill: { bg: '#000', fg: '#fff' }, delay: 0.1 }, h || {});
    const p = V.prog(u, st.delay, 0.5);
    if (p <= 0) return;
    const pop = E.outBack(p, 2.2), a = V.clamp(p * 3);
    const S = st.size;
    const num = meta.yearText || fmt(meta.year);
    const pre = meta.prefix || '', suf = meta.suffix || '';
    const wn = V.textW(num, S, { font: st.font, weight: st.weight, italic: st.italic });
    const wp = pre ? V.textW(pre, S * 0.3, { font: 'PingFang TC', weight: 'bold' }) + 12 : 0;
    const ws = suf ? V.textW(suf, S * 0.36, { font: st.font, weight: st.weight, italic: st.italic }) + 14 : 0;
    const W = wp + wn + ws, H = S * 0.95 + (meta.era ? 56 : 0);
    const [x0, y0] = anchorXY(st.anchor, W, H);
    // transform: pop-in about the block's anchor corner
    V.push();
    const ox = st.anchor.includes('r') ? x0 + W : x0, oy = st.anchor.includes('b') ? y0 + H : y0;
    V.translate(ox, oy);
    V.scale(0.55 + 0.45 * pop);
    V.rotate((1 - pop) * (st.anchor.includes('r') ? 0.08 : -0.08));
    V.translate(-ox, -oy);
    let y = y0;
    if (meta.era) {
      const ew = V.textW(meta.era, 34, { font: 'PingFang TC', weight: 'bold', track: 0.08 }) + 36;
      const pill = st.pill || {};
      V.with2d((ctx) => {
        ctx.globalAlpha = a;
        ctx.fillStyle = pill.bg || '#000';
        const r = 20, px = x0, py = y, ph = 42;
        ctx.beginPath();
        ctx.moveTo(px + r, py); ctx.lineTo(px + ew - r, py); ctx.quadraticCurveTo(px + ew, py, px + ew, py + r);
        ctx.lineTo(px + ew, py + ph - r); ctx.quadraticCurveTo(px + ew, py + ph, px + ew - r, py + ph);
        ctx.lineTo(px + r, py + ph); ctx.quadraticCurveTo(px, py + ph, px, py + ph - r);
        ctx.lineTo(px, py + r); ctx.quadraticCurveTo(px, py, px + r, py);
        ctx.fill();
        if (pill.stroke) { ctx.strokeStyle = pill.stroke; ctx.lineWidth = 2; ctx.stroke(); }
      });
      V.text(meta.era, x0 + 18, y + 32, 34, { font: 'PingFang TC', weight: 'bold', color: pill.fg || '#fff', alpha: a, track: 0.08 });
      y += 56;
    }
    const base = y + S * 0.82;
    if (pre) V.text(pre, x0, base - S * 0.5, S * 0.3, { font: 'PingFang TC', weight: 'bold', color: st.color, stroke: st.stroke, strokeW: st.strokeW * 0.4, alpha: a, shadow: st.shadow });
    V.text(num, x0 + wp, base, S, { font: st.font, weight: st.weight, italic: st.italic, color: st.color, stroke: st.stroke, strokeW: st.strokeW, alpha: a, shadow: st.shadow });
    if (suf) V.text(suf, x0 + wp + wn + 14, base, S * 0.36, { font: st.font, weight: st.weight, italic: st.italic, color: st.color, stroke: st.stroke, strokeW: st.strokeW * 0.5, alpha: a, shadow: st.shadow });
    V.pop();
  };

  /** the museum wall label. meta.label = {title, medium, note}; meta.accession = 'NO. 67-03' */
  V.hudLabel = function (u, meta, h) {
    const L = meta.label;
    if (!L) return;
    const st = Object.assign({ labelAnchor: 'br', labelDelay: 0.9, labelBg: '#f3eee2', labelInk: '#26221d', labelEdge: '#26221d' }, h || {});
    const p = V.prog(u, st.labelDelay, 0.45);
    if (p <= 0) return;
    const e = E.out3(p), a = V.clamp(p * 3);
    const lines = [{ s: meta.accession || '', size: 20, font: 'Menlo', weight: 'bold', color: '#8a8173', track: 0.12 }, { s: L.title, size: 36, font: 'Songti TC', weight: 'bold', color: st.labelInk }];
    if (L.medium) lines.push({ s: L.medium, size: 25, font: 'Songti TC', weight: 'normal', color: '#5a5348' });
    if (L.note) lines.push({ s: L.note, size: 26, font: 'Songti TC', weight: 'bold', color: '#a6401f' });
    let wmax = 0;
    lines.forEach((l) => { l.w = l.s ? V.textW(l.s, l.size, { font: l.font, weight: l.weight, track: l.track || 0 }) : 0; wmax = Math.max(wmax, l.w); });
    const pad = 26, gap = 9;
    const W = Math.min(900, wmax + pad * 2), H = lines.reduce((s, l) => s + (l.s ? l.size + gap : 0), 0) + pad * 2 - gap;
    const [x0, y0] = anchorXY(st.labelAnchor, W, H, 52);
    const dy = (1 - e) * 46 * (st.labelAnchor.includes('t') ? -1 : 1);
    V.with2d((ctx) => {
      ctx.globalAlpha = a;
      ctx.shadowColor = 'rgba(0,0,0,0.38)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
      ctx.fillStyle = st.labelBg;
      ctx.fillRect(x0, y0 + dy, W, H);
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = st.labelEdge; ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 0.5, y0 + dy + 0.5, W - 1, H - 1);
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 8.5, y0 + dy + 8.5, W - 17, H - 17);
    });
    let y = y0 + dy + pad;
    lines.forEach((l) => {
      if (!l.s) return;
      y += l.size;
      V.text(l.s, x0 + pad, y - l.size * 0.14, l.size, { font: l.font, weight: l.weight, color: l.color, alpha: a, track: l.track || 0 });
      y += gap;
    });
  };

  V.hud = function (u, meta) {
    if (!meta || meta.hud === false) return;
    const sc = V.scenes[meta.id] || {};
    if (sc.noHud) return;
    let st = meta.hud || {};
    if (sc.hudStyle) st = Object.assign({}, st, sc.hudStyle(u, meta));
    V.hudYear(u, meta, st);
    V.hudLabel(u, meta, st);
  };

  /** transition readout: years scroll like an odometer. yA,yB numbers (negative = BCE). p 0..1 of the transition. */
  V.odometer = function (yA, yB, p) {
    const q = V.clamp((p - 0.12) / 0.76);
    const a = E.out2(V.clamp(p / 0.2)) * (1 - E.in2(V.clamp((p - 0.82) / 0.18)));
    if (a <= 0.01) return;
    const y = yA + (yB - yA) * E.io3(q);
    let yr = Math.round(y);
    if (yr === 0) yr = 1;
    const bce = yr < 0;
    const txt = fmt(yr);
    const cy = V.H / 2;
    V.with2d((ctx) => {
      ctx.globalAlpha = 0.82 * a;
      ctx.fillStyle = '#07070b';
      ctx.fillRect(0, cy - 120, V.W, 240);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#d97757';
      ctx.fillRect(0, cy - 124, V.W, 4);
      ctx.fillRect(0, cy + 120, V.W, 4);
      // ticks that scroll with the year
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      const off = (y * 0.9) % 60;
      for (let x = -60; x < V.W + 60; x += 60) ctx.fillRect(x - off, cy + 96, 3, 16);
    });
    V.text(bce ? '西元前' : '西元', V.W / 2 - 4, cy - 62, 40, { font: 'PingFang TC', weight: 'bold', color: '#d97757', align: 'center', alpha: a, track: 0.2 });
    V.text(txt, V.W / 2, cy + 62, 150, { font: 'DIN Condensed, Futura', weight: 'bold', color: '#fff', align: 'center', alpha: a, shadow: { c: 'rgba(217,119,87,0.55)', x: 0, y: 0, b: 26 } });
  };
})();
