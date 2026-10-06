/* tiktok.js — 「67」藝術史 · 2025 Gen Alpha 短影音（66–72 s，3 小節）
 * 外圍：深紫黑底 + 青/洋紅徑向光暈 + 網點 + 故障條紋；左右巨大故障字「6」「7」隨 six/seven 交替亮起（TikTok 式青紅分色），
 *       SIX / SEVEN 貼紙字、留言串按拍上捲、愛心星星飄、籃球彈跳旋轉、霓虹手繪貼圖（p5.brush marker/crayon/pen，透明層擷取後加發光）。
 * 中央：直立手機（2D 向量平塗 + 顆粒陰影 + 逆光輪廓光），短影音＝夕陽室外籃球場，主角孩子連帽衫+書包面無表情做 67，背景兩個孩子同步；
 *       球場牆上「67」塗鴉是 p5.brush spray/gouache 噴的。TikTok UI：追蹤中｜為你推薦、愛心 67K→670K→6.7M、字幕條、♬ Doot Doot (6 7) 跑馬燈。
 * 第 3 小節（u≥4）：手機縮小、複製成 3×3 手機牆（全部同相）。
 * 後製：徑向色散（ADD 三色分離）、拍點震動、切片故障、低亮度白閃。
 */
(function () {
  const W = 1920, H = 1080;
  const SW = 536, SH = 972, BZ = 12, PW = SW + BZ * 2, PH = SH + BZ * 2, PM = 8; // phone screen / body / canvas margin
  const NAV = 78, VH = SH - NAV; // video area height (above the nav bar)
  const CELL = 320 / PH; // 3x3 wall phone scale
  const COL = { bg: '#0d0420', cy: '#25f4ee', red: '#fe2c55', yel: '#fffc00', org: '#ff7a1a', wh: '#ffffff' };
  const OL = '#1c0a30';
  const CJK = '"PingFang TC","Apple Color Emoji"';
  const AV = '"Avenir Next","Avenir","PingFang TC"';
  const F = (px, w = 'bold', fam = CJK, it = false) => `${it ? 'italic ' : ''}${w} ${px}px ${fam}`;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const A = (c, a) => V.withAlpha(c, a);
  const S = {}; // per-page caches of deterministic content

  // ---------------------------------------------------------------- small shape helpers (Canvas2D)
  function tk_heart(x, cx, cy, r) {
    x.beginPath();
    x.moveTo(cx, cy + r * 0.95);
    x.bezierCurveTo(cx - r * 1.75, cy - r * 0.1, cx - r * 0.95, cy - r * 1.45, cx, cy - r * 0.5);
    x.bezierCurveTo(cx + r * 0.95, cy - r * 1.45, cx + r * 1.75, cy - r * 0.1, cx, cy + r * 0.95);
    x.closePath();
  }
  function tk_star(x, cx, cy, r, rot = 0) {
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot - Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    x.closePath();
  }
  function tk_sparkle(x, cx, cy, r, rot, glow) {
    x.save();
    x.translate(cx, cy);
    x.rotate(rot);
    x.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2, b = ((i + 1) * Math.PI) / 2;
      if (i === 0) x.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      x.quadraticCurveTo(0, 0, Math.cos(b) * r, Math.sin(b) * r);
    }
    x.closePath();
    if (glow) { x.shadowColor = glow; x.shadowBlur = r * 0.9; }
    x.fillStyle = '#fff';
    x.fill();
    x.restore();
  }
  function tk_ball(x, cx, cy, r, rot, sq = 0, sticker = true) {
    x.save();
    x.translate(cx, cy);
    x.scale(1 + sq, 1 - sq);
    if (sticker) {
      x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 18; x.shadowOffsetY = 8;
      x.beginPath(); x.arc(0, 0, r + 7, 0, 7); x.fillStyle = '#fff'; x.fill();
      x.shadowColor = 'transparent';
    }
    const g = x.createRadialGradient(-r * 0.35, -r * 0.42, r * 0.08, 0, 0, r);
    g.addColorStop(0, '#ffc07a'); g.addColorStop(0.55, '#f2661c'); g.addColorStop(1, '#a3360c');
    x.beginPath(); x.arc(0, 0, r, 0, 7); x.fillStyle = g; x.fill();
    x.save();
    x.clip();
    // pebble grain
    const rr = V.rng(77);
    x.fillStyle = 'rgba(90,25,5,0.25)';
    for (let i = 0; i < 70; i++) { const a = rr() * 6.283, d = Math.sqrt(rr()) * r; x.fillRect(Math.cos(a) * d, Math.sin(a) * d, 2, 2); }
    x.rotate(rot);
    x.strokeStyle = '#2a0f0a'; x.lineWidth = Math.max(2, r * 0.075); x.lineCap = 'round';
    x.beginPath(); x.moveTo(0, -r); x.lineTo(0, r); x.moveTo(-r, 0); x.lineTo(r, 0); x.stroke();
    x.beginPath(); x.ellipse(-r * 1.08, 0, r * 0.66, r * 1.12, 0, -1.25, 1.25); x.stroke();
    x.beginPath(); x.ellipse(r * 1.08, 0, r * 0.66, r * 1.12, 0, Math.PI - 1.25, Math.PI + 1.25); x.stroke();
    x.restore();
    x.beginPath(); x.arc(0, 0, r, 0, 7); x.lineWidth = 2.5; x.strokeStyle = '#3a1206'; x.stroke();
    x.restore();
  }

  // ---------------------------------------------------------------- cached textures
  function tk_stipple() { // grain dots for "grain-brush" flat-vector shading
    if (S.stip) return S.stip;
    const c = mk(160, 160), x = c.getContext('2d'), r = V.rng(6767);
    x.fillStyle = '#25093f';
    for (let i = 0; i < 3200; i++) { const s = 0.8 + r() * 1.4; x.globalAlpha = 0.3 + r() * 0.7; x.fillRect(r() * 160, r() * 160, s, s); }
    return (S.stip = c);
  }
  function tk_noise(w, h, seed) {
    const c = mk(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), r = V.rng(seed);
    for (let i = 0; i < img.data.length; i += 4) { const v = 70 + r() * 150; img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0);
    return c;
  }
  function tk_halftone() {
    if (S.half) return S.half;
    const c = mk(W, H), x = c.getContext('2d'), sp = 18;
    for (let j = 0; j * sp * 0.866 < H + sp; j++) {
      const y = j * sp * 0.866;
      for (let i = 0; i * sp < W + sp; i++) {
        const xx = i * sp + (j % 2 ? sp / 2 : 0);
        let f = V.smooth(380, 960, Math.abs(xx - 960)) * (0.35 + 0.65 * V.noise2(xx / 240, y / 240));
        f *= 0.55 + 0.45 * V.smooth(80, 540, Math.abs(y - 540));
        // keep the two HUD corners quiet
        f *= 1 - 0.85 * V.smooth(260, 80, Math.max(xx - 560, y - 300, 0) + 80) * (xx < 700 && y < 330 ? 1 : 0);
        f *= 1 - 0.85 * (xx > 1380 && y > 820 ? 1 : 0);
        const r = 7.4 * f;
        if (r < 0.7) continue;
        x.fillStyle = xx < 960 ? 'rgba(37,244,238,0.5)' : 'rgba(254,44,85,0.55)';
        x.beginPath(); x.arc(xx, y, r, 0, 7); x.fill();
      }
    }
    return (S.half = c);
  }

  // ---------------------------------------------------------------- the court (static; baked once)
  const SUN = [292, 384];
  const HZ = 470; // fence base / far ground line (screen-local)
  function tk_graffitiBrush() {
    // spray-painted bubble "67" on the left handball wall + crown tag (p5.brush; captured on a transparent canvas)
    V.push();
    V.translate(16, 186);
    V.rotate(-0.07);
    const six = 'M60,14 C40,0 12,8 9,46 C6,82 16,106 38,106 C60,106 68,88 66,72 C64,54 48,46 34,50 C20,54 12,64 12,76';
    const sev = 'M84,12 L146,12 C132,42 120,72 112,106';
    [six, sev].forEach((p, i) => V.ink(p, { brush: 'spray', color: '#25f4ee', w: 0.75, seed: 40 + i, wob: 3, taper: [0, 0] }));
    [six, sev].forEach((p, i) => V.ink(p, { brush: 'gouache', color: '#1c0a30', w: 2.6, seed: 50 + i, wob: 1.2, taper: [3, 3] }));
    [six, sev].forEach((p, i) => V.ink(p, { brush: 'gouache', color: '#ff3d7f', w: 1.65, seed: 60 + i, wob: 1.2, taper: [3, 3] }));
    [six, sev].forEach((p, i) => V.ink(p, { brush: 'spray', color: '#fffc00', w: 0.22, seed: 70 + i, wob: 1, taper: [0, 0], reveal: 0.5 }));
    [[28, 112, 30], [50, 112, 20], [114, 112, 36], [104, 22, 16], [138, 22, 12]].forEach(([dx, dy, L], i) =>
      V.ink([[dx, dy], [dx + 1, dy + L]], { brush: 'gouache', color: '#ff3d7f', w: 0.42, seed: 80 + i, taper: [0, 8], wob: 0.3 }));
    V.ink('M42,-4 L50,-30 L64,-12 L78,-34 L90,-12 L104,-30 L110,-4 Z', { brush: 'pen', color: '#fffc00', w: 1.3, seed: 90, wob: 1 });
    V.ink([[20, 140], [60, 132], [100, 142], [140, 130]], { brush: 'crayon', color: '#ffffff', w: 0.7, seed: 95, wob: 2 });
    V.pop();
  }
  function tk_cloud(x, cx, cy, w, h) {
    const g = x.createLinearGradient(0, cy - h, 0, cy + h * 0.4);
    g.addColorStop(0, '#8a2f8c'); g.addColorStop(0.6, '#e5577d'); g.addColorStop(1, '#ffb070');
    x.fillStyle = g;
    x.beginPath();
    const n = Math.max(4, Math.round(w / 34));
    for (let i = 0; i < n; i++) {
      const px = cx - w / 2 + (w * (i + 0.5)) / n, k = Math.sin(((i + 0.5) / n) * Math.PI);
      const rr = h * (0.45 + 0.55 * k);
      x.moveTo(px + rr, cy);
      x.ellipse(px, cy - rr * 0.35, rr, rr * 0.75, 0, 0, Math.PI * 2);
    }
    x.fill();
    x.fillRect(cx - w / 2, cy - h * 0.3, w, h * 0.42);
    x.beginPath(); x.ellipse(cx, cy + h * 0.1, w / 2 + h * 0.2, h * 0.32, 0, 0, Math.PI * 2); x.fill();
  }
  function tk_palm(x, bx, by, ht, lean) {
    x.strokeStyle = '#2a0f43'; x.fillStyle = '#2a0f43'; x.lineCap = 'round';
    const tx = bx + lean, ty = by - ht;
    x.lineWidth = 7;
    x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx + lean * 0.2, by - ht * 0.55, tx, ty); x.stroke();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i - 3.5) * 0.42, L = 52 + (i % 2) * 14;
      const ex = tx + Math.cos(a) * L * 1.3, ey = ty + Math.sin(a) * L * 0.55 + 26;
      x.lineWidth = 5;
      x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(tx + Math.cos(a) * L * 0.7, ty + Math.sin(a) * L * 0.9 - 6, ex, ey); x.stroke();
      // leaflets
      for (let k = 1; k < 6; k++) {
        const q = k / 6, lx = tx + (ex - tx) * q, ly = ty + (ey - ty) * q - Math.sin(q * Math.PI) * 10;
        x.lineWidth = 2.2;
        x.beginPath(); x.moveTo(lx, ly); x.lineTo(lx + Math.cos(a + 1.3) * 10, ly + 10); x.moveTo(lx, ly); x.lineTo(lx + Math.cos(a - 1.3) * 10, ly + 10); x.stroke();
      }
    }
  }
  function tk_paintCourt(x, graf) {
    // sky
    let g = x.createLinearGradient(0, 0, 0, HZ + 20);
    [[0, '#1d0c46'], [0.2, '#3d1875'], [0.42, '#8c2a86'], [0.6, '#d83f72'], [0.75, '#ff6e3b'], [0.9, '#ffa44a'], [1, '#ffd27a']].forEach(([p, c]) => g.addColorStop(p, c));
    x.fillStyle = g; x.fillRect(0, 0, SW, HZ + 20);
    const r = V.rng(2025);
    x.fillStyle = 'rgba(255,240,255,0.8)';
    for (let i = 0; i < 26; i++) { const sx = r() * SW, sy = r() * 150, s = r() < 0.2 ? 2.2 : 1.3; x.fillRect(sx, sy, s, s); }
    // sun glow + disc + haze bands
    g = x.createRadialGradient(SUN[0], SUN[1], 8, SUN[0], SUN[1], 380);
    g.addColorStop(0, 'rgba(255,240,180,0.95)'); g.addColorStop(0.16, 'rgba(255,196,112,0.6)'); g.addColorStop(0.45, 'rgba(255,110,96,0.2)'); g.addColorStop(1, 'rgba(255,90,90,0)');
    x.fillStyle = g; x.fillRect(0, 0, SW, HZ + 20);
    x.fillStyle = '#fff2c4'; x.beginPath(); x.arc(SUN[0], SUN[1], 80, 0, 7); x.fill();
    x.save(); x.beginPath(); x.arc(SUN[0], SUN[1], 81, 0, 7); x.clip();
    g = x.createLinearGradient(0, SUN[1] - 80, 0, SUN[1] + 80); g.addColorStop(0, '#fff6d8'); g.addColorStop(1, '#ffc46a');
    x.fillStyle = g; x.fillRect(SUN[0] - 90, SUN[1] - 90, 180, 180);
    x.fillStyle = 'rgba(255,120,130,0.4)';
    [[SUN[1] + 6, 4], [SUN[1] + 22, 6], [SUN[1] + 40, 8], [SUN[1] + 58, 11]].forEach(([y, h]) => x.fillRect(SUN[0] - 90, y, 180, h));
    x.restore();
    // clouds (lit from below)
    tk_cloud(x, 110, 178, 210, 30);
    tk_cloud(x, 430, 120, 170, 24);
    tk_cloud(x, 300, 250, 250, 26);
    tk_cloud(x, 40, 318, 150, 16);
    tk_cloud(x, 500, 300, 120, 16);
    // power line + birds
    x.strokeStyle = 'rgba(30,8,50,0.85)'; x.lineWidth = 2;
    [[0, 92, 536, 140, 40], [0, 106, 536, 152, 36]].forEach(([x0, y0, x1, y1, sag]) => { x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1); x.stroke(); });
    x.fillStyle = 'rgba(30,8,50,0.9)';
    [[352, 133], [372, 135], [384, 135]].forEach(([bx, by]) => { x.beginPath(); x.ellipse(bx, by - 5, 4, 5, 0, 0, 7); x.fill(); });
    x.strokeStyle = 'rgba(40,10,60,0.75)'; x.lineWidth = 2;
    [[150, 60], [166, 70], [182, 56]].forEach(([bx, by]) => { x.beginPath(); x.moveTo(bx - 7, by - 3); x.quadraticCurveTo(bx - 3, by - 6, bx, by); x.quadraticCurveTo(bx + 3, by - 6, bx + 7, by - 3); x.stroke(); });
    // far skyline
    let bx = 150;
    while (bx < SW) {
      const bw = 18 + r() * 34, bh = 26 + r() * 96;
      x.fillStyle = '#5a2276';
      x.fillRect(bx, HZ - bh, bw, bh + 4);
      if (r() < 0.4) x.fillRect(bx + bw * 0.45, HZ - bh - 14, 2, 14);
      x.fillStyle = 'rgba(255,207,122,0.75)';
      for (let wy = HZ - bh + 8; wy < HZ - 6; wy += 9) for (let wx = bx + 4; wx < bx + bw - 4; wx += 7) if (r() < 0.16) x.fillRect(wx, wy, 3, 4);
      bx += bw + 2 + r() * 6;
    }
    // near tree line
    x.fillStyle = '#3a1555';
    for (let tx = 170; tx < SW + 20; tx += 26) { const tr = 16 + r() * 16; x.beginPath(); x.ellipse(tx, HZ - tr * 0.5, tr, tr * 0.85, 0, 0, 7); x.fill(); }
    x.fillRect(170, HZ - 12, SW - 170, 16);
    tk_palm(x, 448, HZ, 330, 18);
    tk_palm(x, 506, HZ, 268, -10);
    // floodlight pole
    x.fillStyle = '#20092f';
    x.fillRect(214, 120, 6, HZ - 120);
    x.fillRect(190, 108, 56, 18);
    x.fillStyle = 'rgba(255,240,200,0.55)';
    for (let i = 0; i < 4; i++) x.fillRect(194 + i * 13, 112, 9, 9);
    // left handball wall (concrete, sunset-lit top)
    x.save();
    x.beginPath(); x.moveTo(0, 150); x.lineTo(180, 160); x.lineTo(180, HZ + 22); x.lineTo(0, HZ + 22); x.closePath();
    g = x.createLinearGradient(0, 150, 0, HZ + 20); g.addColorStop(0, '#8d4f86'); g.addColorStop(1, '#4b2462');
    x.fillStyle = g; x.fill();
    x.clip();
    x.strokeStyle = 'rgba(30,8,50,0.22)'; x.lineWidth = 1.4;
    for (let y = 172, row = 0; y < HZ + 22; y += 26, row++) {
      x.beginPath(); x.moveTo(0, y); x.lineTo(180, y + 4); x.stroke();
      for (let vx = (row % 2) * 30; vx < 180; vx += 60) { x.beginPath(); x.moveTo(vx, y); x.lineTo(vx, y + 26); x.stroke(); }
    }
    g = x.createLinearGradient(0, 0, 180, 0); g.addColorStop(0, 'rgba(20,4,40,0.35)'); g.addColorStop(1, 'rgba(255,150,110,0.12)');
    x.fillStyle = g; x.fillRect(0, 140, 180, HZ);
    x.drawImage(graf, 0, 0);
    // paint sits IN the concrete: re-apply block texture lightly on top
    x.globalAlpha = 0.5;
    for (let y = 172; y < HZ + 22; y += 26) { x.beginPath(); x.moveTo(0, y); x.lineTo(180, y + 4); x.stroke(); }
    x.globalAlpha = 1;
    x.restore();
    x.strokeStyle = '#ffb07a'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, 151); x.lineTo(180, 161); x.stroke();
    x.fillStyle = '#2a1040'; x.fillRect(176, 158, 6, HZ - 136);
    // chain-link fence
    x.save();
    x.beginPath(); x.rect(182, 170, SW - 182, HZ + 20 - 170); x.clip();
    const mesh = (col, lw) => {
      x.strokeStyle = col; x.lineWidth = lw; x.beginPath();
      for (let d = -400; d < SW + 400; d += 15) { x.moveTo(d, 170); x.lineTo(d + 330, HZ + 20); x.moveTo(d, 170); x.lineTo(d - 330, HZ + 20); }
      x.stroke();
    };
    mesh('rgba(34,12,56,0.5)', 1.3);
    x.beginPath(); x.arc(SUN[0], SUN[1], 130, 0, 7); x.clip();
    mesh('rgba(255,214,150,0.55)', 1.1);
    x.restore();
    x.fillStyle = '#1f0a32';
    [300, 420, 532].forEach((px) => x.fillRect(px - 4, 166, 8, HZ + 22 - 166));
    x.fillRect(182, 164, SW - 182, 7);
    x.fillStyle = 'rgba(255,190,140,0.6)'; x.fillRect(182, 164, SW - 182, 2);
    x.fillStyle = '#2b1144'; x.fillRect(182, HZ - 6, SW - 182, 28);
    // ground: apron + court
    g = x.createLinearGradient(0, HZ + 20, 0, VH); g.addColorStop(0, '#34217a'); g.addColorStop(1, '#22134f');
    x.fillStyle = g; x.fillRect(0, HZ + 20, SW, VH - HZ - 20);
    g = x.createLinearGradient(0, 510, 0, VH); g.addColorStop(0, '#5a43b8'); g.addColorStop(0.5, '#4734a0'); g.addColorStop(1, '#33247f');
    x.fillStyle = g; x.fillRect(0, 510, SW, VH - 510);
    const VP = [268, 386], proj = (x0, y) => VP[0] + (x0 - VP[0]) * ((y - VP[1]) / (510 - VP[1]));
    // key (paint) under the hoop
    x.fillStyle = '#c93f78';
    x.beginPath(); x.moveTo(392, 510); x.lineTo(512, 510); x.lineTo(proj(512, 600), 600); x.lineTo(proj(392, 600), 600); x.closePath(); x.fill();
    // sun sheen on the court
    x.save(); x.translate(SUN[0], 548); x.scale(1, 0.16);
    g = x.createRadialGradient(0, 0, 0, 0, 0, 260); g.addColorStop(0, 'rgba(255,180,120,0.55)'); g.addColorStop(1, 'rgba(255,140,120,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 260, 0, 7); x.fill(); x.restore();
    // lines
    x.strokeStyle = 'rgba(246,236,255,0.9)'; x.lineWidth = 4; x.lineCap = 'butt';
    x.beginPath(); x.moveTo(0, 510); x.lineTo(SW, 510); x.stroke();
    x.beginPath(); x.moveTo(392, 510); x.lineTo(proj(392, 600), 600); x.lineTo(SW, 600); x.stroke();
    x.lineWidth = 3.5;
    x.beginPath(); x.ellipse(452, 514, 338, 104, 0, 0.06 * Math.PI, 0.995 * Math.PI); x.stroke();
    x.lineWidth = 5;
    x.beginPath(); x.moveTo(proj(-40, 510), 510); x.lineTo(proj(-40, VH), VH); x.stroke();
    // cracks + scuffs
    x.strokeStyle = 'rgba(20,6,40,0.35)'; x.lineWidth = 1.4;
    for (let i = 0; i < 9; i++) {
      let cx = r() * SW, cy = 530 + r() * (VH - 540);
      x.beginPath(); x.moveTo(cx, cy);
      for (let k = 0; k < 5; k++) { cx += (r() - 0.5) * 40; cy += (r() - 0.3) * 14; x.lineTo(cx, cy); }
      x.stroke();
    }
    // the hoop (pole behind the backboard)
    const HX = 452;
    x.fillStyle = '#241038'; x.fillRect(HX + 46, 236, 11, 278);
    x.fillStyle = '#3a6bd6'; x.fillRect(HX + 41, 440, 21, 74);
    x.fillStyle = '#241038'; x.fillRect(HX + 20, 250, 30, 7);
    g = x.createLinearGradient(HX - 62, 0, HX + 62, 0); g.addColorStop(0, '#efe6ff'); g.addColorStop(1, '#ffd7c0');
    x.fillStyle = g; x.strokeStyle = '#2b1640'; x.lineWidth = 3;
    x.beginPath(); x.roundRect(HX - 62, 210, 124, 80, 6); x.fill(); x.stroke();
    x.strokeStyle = '#ff5a1f'; x.lineWidth = 4; x.strokeRect(HX - 24, 246, 48, 36);
    x.fillStyle = '#2b1640'; x.fillRect(HX - 6, 288, 12, 8);
    // chain net
    x.strokeStyle = 'rgba(255,246,236,0.9)'; x.lineWidth = 1.6;
    const top = (a) => [HX + Math.cos(a) * 30, 299 + Math.sin(a) * 7], bot = (a) => [HX + Math.cos(a) * 17, 344 + Math.sin(a) * 4];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, b = ((i + 1) / 10) * Math.PI * 2;
      if (Math.sin(a) < -0.2 && Math.sin(b) < -0.2) continue;
      const p = top(a), q = bot(b), q2 = bot(a - 0.6);
      x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); x.moveTo(p[0], p[1]); x.lineTo(q2[0], q2[1]); x.stroke();
    }
    x.strokeStyle = '#ff5a1f'; x.lineWidth = 5;
    x.beginPath(); x.ellipse(HX, 299, 30, 7, 0, 0, 7); x.stroke();
    // a ball resting on the court + shadow
    x.fillStyle = 'rgba(20,6,40,0.45)'; x.beginPath(); x.ellipse(206, 664, 30, 7, 0, 0, 7); x.fill();
    tk_ball(x, 214, 646, 19, 0.6, 0, false);
    // grain + inner video vignette + warm grade
    x.save();
    x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.22;
    x.drawImage(tk_noise(SW, SH, 4242), 0, 0);
    x.restore();
    g = x.createRadialGradient(SW / 2, VH * 0.48, VH * 0.25, SW / 2, VH * 0.5, VH * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(18,4,36,0.5)');
    x.fillStyle = g; x.fillRect(0, 0, SW, VH);
  }
  function tk_court() {
    if (S.court) return S.court;
    clear();
    V.mReset();
    V.fill([[-80, -80], [-70, -80], [-70, -70]], { color: '#000' }); // guard: p5.brush may swallow a page's very first fill
    tk_graffitiBrush();
    V.flush();
    const graf = get(0, 0, SW, SH);
    clear();
    const c = mk(SW, SH);
    tk_paintCourt(c.getContext('2d'), graf.canvas);
    return (S.court = c);
  }

  // ---------------------------------------------------------------- kids (flat vector rig, 67 gesture)
  const KIDS = [
    { // tall kid in a #67 jersey (6'7"...), left, in front of the graffiti wall
      x: 104, y: 352, s: 0.4, hs: 1.45, type: 'jersey', jersey: '#ffd400', jerseyDk: '#d9a400', trim: '#5b2bd6', pants: '#5b2bd6',
      skin: '#6a4129', skinDk: '#4d2d1b', palm: '#b07a58', hair: '#140a07', hairLt: '#3a2418', legs: true, leg: 1.38, shoe: '#ffffff', sole: '#25f4ee', band: true,
    },
    { // pink-hoodie kid under the hoop, right
      x: 424, y: 418, s: 0.35, hs: 1.5, type: 'hoodie', hood: '#ff5d8f', hoodDk: '#c43a6c', hoodLt: '#ff9bbb', pants: '#2b2350',
      skin: '#f0c4a0', skinDk: '#cf9b78', palm: '#ffe0c8', hair: '#3a2014', hairLt: '#6b4128', legs: true, leg: 1, shoe: '#f4f1ff', sole: '#fe2c55', bag: '#ffd23f', bagDk: '#c99a12', strap: '#3a2a10', hairStyle: 'broccoli',
    },
    { // the main kid: mint hoodie, red backpack, AirPods, deadpan
      x: 228, y: 470, s: 0.82, hs: 1.14, type: 'hoodie', hood: '#35d0c4', hoodDk: '#1d8f97', hoodLt: '#8af3e6', pants: '#232044',
      skin: '#e9b38a', skinDk: '#c48763', palm: '#f8d3b4', hair: '#2b1711', hairLt: '#62392a', legs: true, leg: 1, shoe: '#f4f1ff', sole: '#25f4ee', bag: '#fe2c55', bagDk: '#b51438', strap: '#26123c', pods: true, hairStyle: 'broccoli', main: true,
    },
  ];
  const HAIR = [[-56, -128, 24], [-48, -152, 28], [-26, -170, 30], [0, -178, 31], [26, -172, 30], [48, -154, 28], [58, -130, 24], [-34, -146, 30], [0, -152, 32], [34, -148, 30],
    [-47, -127, 15], [-31, -123, 15], [-15, -121, 15], [1, -120, 15], [17, -121, 15], [33, -124, 15], [48, -128, 14], [-61, -110, 10], [61, -110, 10]];

  function tk_seg(x, a, b) { x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }
  // open hand, palm UP (like carrying a tray), fingers pointing outward. Local +x = outward.
  function tk_hand(x, Wp, sd, k, ang) {
    const hs = k.hs || 1;
    x.save();
    x.translate(Wp[0], Wp[1]);
    x.scale(sd * hs * 0.9, hs);
    x.rotate(ang);
    x.lineJoin = 'round'; x.lineCap = 'round';
    const cap = (x0, y0, x1, y1, w, col) => {
      x.strokeStyle = OL; x.lineWidth = w + 7; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
      x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    };
    // thumb (up, on the near edge)
    cap(10, -8, 22, -30, 12, k.skin);
    // fingers: far (top) to near (bottom), slightly fanned and curled up at the tips
    [[-9, 36, -0.16], [-3, 44, -0.05], [3, 46, 0.05], [9, 40, 0.15]].forEach(([dy, L, a]) => {
      const x0 = 34, y0 = dy, x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L - 5;
      cap(x0, y0, x1, y1, 10.5, k.skin);
      x.strokeStyle = k.palm; x.lineWidth = 4; x.beginPath(); x.moveTo(x0 + 4, y0 - 2.5); x.lineTo(x1 - 2, y1 - 2.5); x.stroke();
    });
    // palm block
    const pb = new Path2D('M-10,-15 L34,-16 Q46,-15 46,-2 Q46,13 34,15 L-10,14 Z');
    x.fillStyle = k.skin; x.fill(pb); x.strokeStyle = OL; x.lineWidth = 3.6; x.stroke(pb);
    const pm = new Path2D('M-4,-12 L32,-13 Q41,-12 41,-3 Q40,5 31,6 L-2,5 Z');
    x.fillStyle = k.palm; x.fill(pm);
    x.strokeStyle = k.skinDk; x.lineWidth = 2.2;
    x.beginPath(); x.moveTo(6, -4); x.quadraticCurveTo(20, 2, 34, -6); x.stroke();
    x.restore();
  }
  function tk_kidFlat(x, k, t) {
    const G = V.G, LW = 4.2;
    const by = 7 * G.pulse(t, 6);
    const tilt = G.tilt(t, 0.075);
    x.save();
    x.translate(k.x, k.y + by * k.s);
    x.scale(k.s, k.s);
    x.lineJoin = 'round'; x.lineCap = 'round';
    const out = (p, fill, lw = LW) => { x.fillStyle = fill; x.fill(p); x.strokeStyle = OL; x.lineWidth = lw; x.stroke(p); };
    const P = (d) => new Path2D(d);
    // ---- legs
    if (k.legs) {
      const L = 300 * k.leg, fy = 336 + L;
      if (k.type === 'jersey') {
        [-1, 1].forEach((sd) => {
          out(P(`M${sd * 40},330 L${sd * 46},${fy - 30} L${sd * 74},${fy - 30} L${sd * 96},330 Z`), k.skin);
          out(P(`M${sd * 44},${fy - 120} L${sd * 46},${fy - 30} L${sd * 76},${fy - 30} L${sd * 80},${fy - 120} Z`), '#ffffff', 3.5);
          x.fillStyle = k.trim; x.fillRect(Math.min(sd * 44, sd * 80), fy - 110, 36, 8);
        });
        out(P(`M-128,312 L128,312 L138,${336 + L * 0.36} L8,${336 + L * 0.36} L0,370 L-8,${336 + L * 0.36} L-138,${336 + L * 0.36} Z`), k.pants);
        x.strokeStyle = '#ffd400'; x.lineWidth = 6;
        x.beginPath(); x.moveTo(-132, 330); x.lineTo(-136, 336 + L * 0.34); x.moveTo(132, 330); x.lineTo(136, 336 + L * 0.34); x.stroke();
      } else {
        [-1, 1].forEach((sd) => out(P(`M${sd * 6},330 L${sd * 124},330 L${sd * 96},${fy - 26} L${sd * 30},${fy - 26} Z`), k.pants));
      }
      [-1, 1].forEach((sd) => {
        const cx = sd * (k.type === 'jersey' ? 62 : 64);
        out(P(`M${cx - 44},${fy - 6} C${cx - 46},${fy - 40} ${cx + 36},${fy - 42} ${cx + 44},${fy - 10} C${cx + 48},${fy + 6} ${cx - 44},${fy + 10} ${cx - 44},${fy - 6} Z`), k.shoe);
        x.fillStyle = k.sole; x.fillRect(cx - 42, fy - 4, 86, 8);
      });
    }
    // ---- backpack + hood behind
    if (k.bag) { const bp = new Path2D(); bp.roundRect(-108, -48, 216, 110, 34); out(bp, k.bag); x.strokeStyle = k.bagDk; x.lineWidth = 8; x.beginPath(); x.ellipse(0, -50, 26, 18, 0, Math.PI, Math.PI * 2); x.stroke(); }
    if (k.type === 'hoodie') out(P('M-86,8 Q-100,-52 -46,-64 L46,-64 Q100,-52 86,8 Z'), k.hoodDk);
    // ---- neck
    const nk = new Path2D(); nk.roundRect(-25, -46, 50, 60, 12); out(nk, k.skinDk, 3.5);
    // ---- torso
    if (k.type === 'jersey') {
      out(P('M-42,-8 Q-96,0 -116,26 Q-128,70 -118,150 L118,150 Q128,70 116,26 Q96,0 42,-8 Z'), k.skin);
      const tank = P('M-36,-8 L-72,-6 Q-74,78 -114,112 L-120,340 Q0,350 120,340 L114,112 Q74,78 72,-6 L36,-8 Q0,52 -36,-8 Z');
      out(tank, k.jersey);
      x.strokeStyle = k.trim; x.lineWidth = 8;
      x.beginPath(); x.moveTo(-36, -4); x.quadraticCurveTo(0, 50, 36, -4); x.moveTo(-72, -2); x.quadraticCurveTo(-74, 78, -112, 112); x.moveTo(72, -2); x.quadraticCurveTo(74, 78, 112, 112); x.stroke();
      x.font = F(118, '900', AV); x.textAlign = 'center'; x.lineWidth = 12; x.strokeStyle = '#ffffff';
      x.strokeText('67', 0, 210); x.fillStyle = k.trim; x.fillText('67', 0, 210);
    } else {
      const torso = P('M-42,-8 Q-94,0 -114,30 Q-126,60 -124,140 L-132,342 Q0,354 132,342 L124,140 Q126,60 114,30 Q94,0 42,-8 Q0,24 -42,-8 Z');
      out(torso, k.hood);
      out(P('M-132,318 Q0,330 132,318 L132,342 Q0,354 -132,342 Z'), k.hoodDk, 3.5);
      x.strokeStyle = A(OL, 0.35); x.lineWidth = 2;
      for (let i = -122; i <= 122; i += 12) { x.beginPath(); x.moveTo(i, 324 + Math.abs(i) * -0.05); x.lineTo(i, 344); x.stroke(); }
      out(P('M-74,228 L74,228 L96,316 L-96,316 Z'), k.hoodDk, 3.5);
      x.fillStyle = k.hood; x.fill(P('M-62,236 L62,236 L66,252 L-66,252 Z'));
      x.strokeStyle = '#f6f2ff'; x.lineWidth = 5;
      x.beginPath(); x.moveTo(-15, 4); x.quadraticCurveTo(-20, 60, -18, 112); x.moveTo(15, 4); x.quadraticCurveTo(22, 56, 20, 106); x.stroke();
      x.strokeStyle = OL; x.lineWidth = 8;
      x.beginPath(); x.moveTo(-18, 108); x.lineTo(-18, 120); x.moveTo(20, 102); x.lineTo(20, 114); x.stroke();
      if (k.bag) {
        [-1, 1].forEach((sd) => {
          out(P(`M${sd * 100},8 L${sd * 66},2 L${sd * 64},236 L${sd * 90},240 Z`), k.strap, 3.5);
          x.fillStyle = '#d6d0e6'; x.fillRect(sd > 0 ? 64 : -92, 146, 28, 14);
          x.strokeStyle = OL; x.lineWidth = 2.5; x.strokeRect(sd > 0 ? 64 : -92, 146, 28, 14);
        });
      }
    }
    // ---- head (tilts toward the hand that is up)
    x.save();
    x.translate(0, -34); x.rotate(tilt); x.translate(0, 34);
    [-1, 1].forEach((sd) => { const e = new Path2D(); e.ellipse(sd * 62, -100, 14, 18, 0, 0, 7); out(e, k.skin, 3.6); x.fillStyle = k.skinDk; x.beginPath(); x.ellipse(sd * 64, -100, 6, 9, 0, 0, 7); x.fill(); });
    const face = new Path2D(); face.ellipse(0, -104, 62, 76, 0, 0, 7); out(face, k.skin);
    // hair
    if (k.hairStyle === 'broccoli') {
      const hp = new Path2D();
      HAIR.forEach(([cx, cy, rr]) => { hp.moveTo(cx + rr, cy); hp.arc(cx, cy, rr, 0, Math.PI * 2); });
      x.strokeStyle = OL; x.lineWidth = LW * 2; x.stroke(hp);
      x.fillStyle = k.hair; x.fill(hp);
      x.fillStyle = k.hairLt;
      HAIR.forEach(([cx, cy, rr], i) => { if (i < 10) { x.beginPath(); x.ellipse(cx - rr * 0.25, cy - rr * 0.32, rr * 0.38, rr * 0.24, -0.5, 0, 7); x.fill(); } });
    } else {
      const hp = new Path2D(); hp.ellipse(0, -122, 64, 60, 0, Math.PI * 0.98, Math.PI * 2.02); hp.closePath();
      out(hp, k.hair, 3.5);
      if (k.band) {
        const bd = new Path2D(); bd.roundRect(-64, -140, 128, 20, 6); out(bd, '#ffffff', 3);
        x.fillStyle = COL.red; x.fillRect(-62, -133, 124, 6);
      }
    }
    // eyes (deadpan: flat, half-closed upper lids)
    [-1, 1].forEach((sd) => {
      const ex = sd * 23, ey = -93;
      const sc = new Path2D(); sc.ellipse(ex, ey, 12.5, 9, 0, 0, 7);
      x.fillStyle = '#ffffff'; x.fill(sc);
      x.save(); x.clip(sc);
      x.fillStyle = '#1a0f14'; x.beginPath(); x.arc(ex + sd * 1, ey + 1.5, 6.2, 0, 7); x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(ex + sd * 1 + 2.2, ey - 0.8, 1.8, 0, 7); x.fill();
      x.fillStyle = k.skin; x.fillRect(ex - 14, ey - 12, 28, 9.5);
      x.restore();
      x.strokeStyle = OL; x.lineWidth = 3.4;
      x.beginPath(); x.moveTo(ex - 13, ey - 2.5); x.lineTo(ex + 13, ey - 2.5); x.stroke();
      x.strokeStyle = A(k.skinDk, 0.9); x.lineWidth = 2;
      x.beginPath(); x.moveTo(ex - 8, ey + 13); x.quadraticCurveTo(ex, ey + 16, ex + 8, ey + 13); x.stroke();
      if (k.hairStyle !== 'broccoli') { x.fillStyle = OL; x.beginPath(); x.roundRect(ex - 12, ey - 22, 24, 5, 2.5); x.fill(); }
    });
    x.strokeStyle = k.skinDk; x.lineWidth = 3.2;
    x.beginPath(); x.moveTo(-2, -84); x.quadraticCurveTo(5, -74, -3, -71); x.stroke();
    x.strokeStyle = '#5a2430'; x.lineWidth = 4.2;
    x.beginPath(); x.moveTo(-13, -54); x.lineTo(13, -54); x.stroke();
    x.fillStyle = 'rgba(255,105,120,0.32)';
    [-1, 1].forEach((sd) => { x.beginPath(); x.ellipse(sd * 40, -70, 11, 6, 0, 0, 7); x.fill(); });
    if (k.pods) [-1, 1].forEach((sd) => {
      const pd = new Path2D(); pd.arc(sd * 64, -90, 7, 0, 7); pd.roundRect(sd * 64 - 3, -90, 6, 20, 3);
      x.fillStyle = '#ffffff'; x.fill(pd); x.strokeStyle = OL; x.lineWidth = 2.5; x.stroke(pd);
    });
    x.restore();
    // ---- arms: upper arm (sleeve) + forearm forward, palms up, alternating like a seesaw
    [0, 1].forEach((side) => {
      const sd = side ? 1 : -1;
      const a = G.arm(t, side);
      // forearm swings about the elbow like a seesaw lever: up on its "word", down on the other
      const th = 0.18 + 0.78 * a.y;
      const Sp = [sd * 104, 38], E = [sd * 134, 194];
      const Wp = [E[0] + sd * Math.cos(th) * 56, E[1] - Math.sin(th) * 108];
      const sleeve = k.type === 'jersey' ? k.skin : k.hood;
      const w1 = k.type === 'jersey' ? 40 : 54, w2 = k.type === 'jersey' ? 34 : 48;
      x.lineCap = 'round';
      x.strokeStyle = OL; x.lineWidth = w1 + LW * 2; tk_seg(x, Sp, E); x.lineWidth = w2 + LW * 2; tk_seg(x, E, Wp);
      x.strokeStyle = sleeve; x.lineWidth = w1; tk_seg(x, Sp, E); x.lineWidth = w2; tk_seg(x, E, Wp);
      const dx = Wp[0] - E[0], dy = Wp[1] - E[1], dl = Math.hypot(dx, dy) || 1;
      const cuff0 = [Wp[0] - (dx / dl) * 14, Wp[1] - (dy / dl) * 14];
      x.strokeStyle = k.type === 'jersey' ? '#ffffff' : k.hoodDk; x.lineWidth = w2 - 2; x.lineCap = 'butt'; tk_seg(x, cuff0, Wp); x.lineCap = 'round';
      if (k.type !== 'jersey') { // sleeve fold line at the elbow
        x.strokeStyle = A(OL, 0.5); x.lineWidth = 2.5;
        x.beginPath(); x.moveTo(E[0] - sd * 14, E[1] - 18); x.quadraticCurveTo(E[0], E[1] - 4, E[0] - sd * 6, E[1] + 16); x.stroke();
      }
      tk_hand(x, [Wp[0] + sd * 2, Wp[1]], sd, k, -0.22 * Math.sin(th));
    });
    x.restore();
  }
  function tk_kidShade(x, k) {
    // grain-brush shading + rim light from the sunset behind (upper right)
    const s = k.s;
    x.save();
    x.globalCompositeOperation = 'source-atop';
    let g = x.createLinearGradient(0, k.y - 190 * s, 0, k.y + 700 * s);
    g.addColorStop(0, 'rgba(40,8,70,0)'); g.addColorStop(0.35, 'rgba(40,8,70,0.12)'); g.addColorStop(1, 'rgba(30,6,60,0.42)');
    x.fillStyle = g; x.fillRect(0, 0, SW, SH);
    g = x.createLinearGradient(k.x - 150 * s, 0, k.x + 30 * s, 0);
    g.addColorStop(0, 'rgba(36,6,64,0.3)'); g.addColorStop(1, 'rgba(36,6,64,0)');
    x.fillStyle = g; x.fillRect(0, 0, SW, SH);
    if (!S.pat) S.pat = new Map();
    let pat = S.pat.get(x);
    if (!pat) { pat = x.createPattern(tk_stipple(), 'repeat'); S.pat.set(x, pat); }
    x.globalAlpha = 0.28; x.fillStyle = pat;
    x.fillRect(k.x - 220 * s, k.y + 60 * s, 160 * s, 900 * s);
    x.globalAlpha = 0.14; x.fillRect(0, 0, SW, SH);
    x.restore();
  }
  function tk_kid(dst, k, t) {
    const K = S.kc || (S.kc = mk(SW, SH)), R = S.rc || (S.rc = mk(SW, SH));
    const kx = K.getContext('2d'), rx = R.getContext('2d');
    kx.setTransform(1, 0, 0, 1, 0, 0); kx.globalCompositeOperation = 'source-over'; kx.globalAlpha = 1;
    kx.clearRect(0, 0, SW, SH);
    tk_kidFlat(kx, k, t);
    tk_kidShade(kx, k);
    // rim light = silhouette minus itself shifted away from the light
    const d = Math.max(2, 6 * k.s);
    rx.setTransform(1, 0, 0, 1, 0, 0); rx.globalCompositeOperation = 'source-over'; rx.globalAlpha = 1;
    rx.clearRect(0, 0, SW, SH);
    rx.drawImage(K, 0, 0);
    rx.globalCompositeOperation = 'destination-out';
    rx.drawImage(K, -d, d);
    rx.globalCompositeOperation = 'source-in';
    rx.fillStyle = 'rgba(255,186,120,0.95)'; rx.fillRect(0, 0, SW, SH);
    kx.globalCompositeOperation = 'source-atop';
    kx.drawImage(R, 0, 0);
    kx.globalCompositeOperation = 'source-over';
    dst.drawImage(K, 0, 0);
  }

  // ---------------------------------------------------------------- the TikTok video + UI (screen canvas)
  function tk_likes(u) {
    return u < 2 ? '67K' : u < 4 ? '670K' : '6.7M';
  }
  function tk_icons(x, t, u) {
    const G = V.G, pz = G.pulse(t, 8);
    const cx = 500;
    x.save();
    x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 6; x.shadowOffsetY = 1;
    x.textAlign = 'center';
    // avatar + follow badge
    x.save(); x.beginPath(); x.arc(cx, 470, 27, 0, 7); x.fillStyle = '#ffffff'; x.fill(); x.shadowColor = 'transparent';
    x.beginPath(); x.arc(cx, 470, 24.5, 0, 7); x.clip();
    let g = x.createLinearGradient(cx - 25, 445, cx + 25, 495); g.addColorStop(0, COL.cy); g.addColorStop(1, '#7a5cff'); x.fillStyle = g; x.fillRect(cx - 26, 444, 52, 52);
    x.fillStyle = '#e9b38a'; x.beginPath(); x.ellipse(cx, 480, 13, 15, 0, 0, 7); x.fill();
    x.fillStyle = '#2b1711'; x.beginPath(); x.ellipse(cx, 466, 16, 10, 0, 0, 7); x.fill();
    x.fillStyle = '#35d0c4'; x.fillRect(cx - 20, 492, 40, 6);
    x.restore();
    x.beginPath(); x.arc(cx, 497, 10, 0, 7); x.fillStyle = COL.red; x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 5, 497); x.lineTo(cx + 5, 497); x.moveTo(cx, 492); x.lineTo(cx, 502); x.stroke();
    // heart (liked) — bounces every beat, count jumps 67K → 670K → 6.7M on bar lines
    const jump = Math.max(u >= 2 ? Math.exp(-8 * (u - 2)) : 0, u >= 4 ? Math.exp(-8 * (u - 4)) : 0);
    const cnt = (str, yy) => { x.lineJoin = 'round'; x.lineWidth = 4; x.strokeStyle = 'rgba(10,0,20,0.6)'; x.strokeText(str, cx, yy); x.fillStyle = '#ffffff'; x.fillText(str, cx, yy); };
    const hs = 1 + 0.16 * pz + 0.35 * jump;
    x.save(); x.translate(cx, 562); x.scale(hs, hs);
    tk_heart(x, 0, 0, 21);
    g = x.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, '#ff5a7a'); g.addColorStop(1, COL.red); x.fillStyle = g; x.fill();
    x.restore();
    x.fillStyle = '#ffffff'; x.font = F(23, '800', AV);
    x.save(); x.translate(cx, 609); x.scale(1 + 0.3 * jump, 1 + 0.3 * jump); x.translate(-cx, 0); cnt(tk_likes(u), 0); x.restore();
    // comment bubble
    x.fillStyle = '#ffffff';
    x.beginPath(); x.ellipse(cx, 648, 22, 19, 0, 0, 7); x.moveTo(cx - 14, 660); x.lineTo(cx - 20, 674); x.lineTo(cx - 3, 666); x.fill();
    x.shadowColor = 'transparent';
    x.fillStyle = '#2a2a2a'; [-9, 0, 9].forEach((o) => { x.beginPath(); x.arc(cx + o, 648, 2.8, 0, 7); x.fill(); });
    x.shadowColor = 'rgba(0,0,0,0.45)';
    cnt('6,767', 696); x.fillStyle = '#ffffff';
    // bookmark
    x.beginPath(); x.moveTo(cx - 15, 714); x.lineTo(cx + 15, 714); x.lineTo(cx + 15, 750); x.lineTo(cx, 739); x.lineTo(cx - 15, 750); x.closePath(); x.fill();
    cnt('67K', 780); x.fillStyle = '#ffffff';
    // share arrow
    x.beginPath(); x.moveTo(cx - 20, 826); x.quadraticCurveTo(cx - 14, 802, cx + 3, 801); x.lineTo(cx + 3, 791); x.lineTo(cx + 22, 808); x.lineTo(cx + 3, 825); x.lineTo(cx + 3, 815); x.quadraticCurveTo(cx - 10, 814, cx - 20, 826); x.fill();
    cnt('6.7K', 852);
    x.restore();
    // spinning disc + floating notes
    x.save(); x.translate(cx, 874); x.rotate(t * 2.4);
    x.beginPath(); x.arc(0, 0, 25, 0, 7); x.fillStyle = '#161616'; x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 1; [20, 16, 12].forEach((rr) => { x.beginPath(); x.arc(0, 0, rr, 0, 7); x.stroke(); });
    g = x.createLinearGradient(-10, -10, 10, 10); g.addColorStop(0, COL.org); g.addColorStop(1, COL.red);
    x.beginPath(); x.arc(0, 0, 10, 0, 7); x.fillStyle = g; x.fill();
    x.fillStyle = '#fff'; x.font = F(10, '900', AV); x.textAlign = 'center'; x.fillText('67', 0, 4);
    x.restore();
    for (let i = 0; i < 2; i++) {
      const q = V.fract(t * 0.7 + i * 0.5);
      x.globalAlpha = Math.sin(q * Math.PI) * 0.9;
      x.fillStyle = '#ffffff'; x.font = F(20, 'bold', CJK); x.textAlign = 'center';
      x.fillText(i ? '♪' : '♫', cx - 18 - q * 26, 860 - q * 46);
    }
    x.globalAlpha = 1;
  }
  function tk_ui(x, t, u) {
    const G = V.G, sy = G.say(t);
    // top & bottom scrims
    let g = x.createLinearGradient(0, 0, 0, 170); g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, SW, 170);
    g = x.createLinearGradient(0, VH - 230, 0, VH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = g; x.fillRect(0, VH - 230, SW, 230);
    x.save();
    x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 5; x.shadowOffsetY = 1;
    // status bar
    x.fillStyle = '#fff'; x.font = F(24, '700', AV); x.textAlign = 'left';
    x.fillText('6:07', 48, 44);
    [0, 1, 2, 3].forEach((i) => x.fillRect(404 + i * 7, 40 - i * 4 - 4, 5, i * 4 + 4));
    x.strokeStyle = '#fff'; x.lineWidth = 2.6; x.lineCap = 'round';
    [12, 7].forEach((rr) => { x.beginPath(); x.arc(450, 42, rr, -2.4, -0.74); x.stroke(); });
    x.beginPath(); x.arc(450, 42, 2.4, 0, 7); x.fill();
    x.lineWidth = 2; x.globalAlpha = 0.6; x.beginPath(); x.roundRect(470, 28, 36, 17, 5); x.stroke(); x.globalAlpha = 1;
    x.fillRect(472.5, 30.5, 31 * 0.67, 12); x.fillRect(507, 33, 2.5, 7);
    // tabs 追蹤中｜為你推薦
    x.font = F(30, '700', CJK); x.textAlign = 'right'; x.globalAlpha = 0.68;
    x.fillText('追蹤中', 248, 108);
    x.globalAlpha = 0.5; x.fillRect(266, 86, 2.5, 24);
    x.globalAlpha = 1; x.textAlign = 'left'; x.font = F(32, '800', CJK);
    x.fillText('為你推薦', 286, 109);
    x.fillRect(325, 122, 46, 4.5);
    x.lineWidth = 2.6; x.beginPath(); x.roundRect(22, 84, 40, 30, 6); x.stroke();
    x.font = F(13, '900', AV); x.textAlign = 'center'; x.fillText('LIVE', 42, 104);
    x.lineWidth = 3.6; x.beginPath(); x.arc(500, 96, 11, 0, 7); x.stroke(); x.beginPath(); x.moveTo(508, 104); x.lineTo(518, 114); x.stroke();
    x.restore();
    // bar 2: "it's going viral" notification drops in (u 2.0 → 3.65)
    const nIn = V.E.outBack(V.prog(u, 2.0, 0.32), 1.6), nOut = V.E.in2(V.prog(u, 3.35, 0.3));
    if (nIn > 0 && nOut < 1) {
      const ny = -120 + (58 + 120) * nIn - 190 * nOut;
      x.save();
      x.shadowColor = 'rgba(0,0,0,0.4)'; x.shadowBlur = 18; x.shadowOffsetY = 6;
      x.fillStyle = 'rgba(246,244,252,0.985)'; x.beginPath(); x.roundRect(14, ny, SW - 28, 98, 26); x.fill();
      x.shadowColor = 'transparent';
      x.fillStyle = '#0b0b10'; x.beginPath(); x.roundRect(30, ny + 20, 58, 58, 14); x.fill();
      x.font = F(40, '900', AV); x.textAlign = 'center';
      [[COL.cy, -3, -2], [COL.red, 3, 2], ['#ffffff', 0, 0]].forEach(([c, dx, dy]) => { x.fillStyle = c; x.fillText('♪', 59 + dx, ny + 64 + dy); });
      x.textAlign = 'left'; x.fillStyle = '#16121e'; x.font = F(22, '800', CJK); x.fillText('短影音', 104, ny + 42);
      x.fillStyle = '#8a8496'; x.font = F(18, '600', CJK); x.textAlign = 'right'; x.fillText('現在', SW - 36, ny + 42);
      x.textAlign = 'left'; x.fillStyle = '#16121e'; x.font = F(21, '600', CJK); x.fillText('你的「67」爆紅了 🔥 670 萬次觀看', 104, ny + 74);
      x.restore();
    }
    // CapCut-style auto caption: the spoken word pops on every beat
    const pop = V.E.outBack(V.clamp(sy.k / 0.16), 2.4);
    const word = sy.n === 6 ? 'SIX' : 'SEVEN!';
    x.save();
    x.translate(312, 212);
    x.rotate(sy.n === 6 ? -0.06 : 0.05);
    x.scale(0.55 + 0.45 * pop, 0.55 + 0.45 * pop);
    x.font = F(62, '900', AV, true); x.textAlign = 'center'; x.lineJoin = 'round';
    x.lineWidth = 13; x.strokeStyle = '#000'; x.strokeText(word, 0, 0);
    x.fillStyle = sy.n === 6 ? COL.yel : '#ffffff'; x.fillText(word, 0, 0);
    x.restore();
    // double-tap hearts
    [[0.5, 404, 330, -0.3], [2.5, 330, 300, 0.26], [4.5, 404, 330, -0.2]].forEach(([t0, hx, hy, rot]) => {
      const q = (u - t0) / 0.75;
      if (q < 0 || q > 1) return;
      const sc = V.E.outBack(V.clamp(q / 0.22), 2.6) * (1 + 0.15 * q), al = 1 - V.smooth(0.55, 1, q);
      x.save(); x.globalAlpha = al; x.translate(hx, hy - 70 * V.E.in2(q)); x.rotate(rot); x.scale(sc, sc);
      x.shadowColor = 'rgba(254,44,85,0.6)'; x.shadowBlur = 24;
      tk_heart(x, 0, 0, 50);
      const hg = x.createLinearGradient(0, -50, 0, 50); hg.addColorStop(0, '#ff6b8a'); hg.addColorStop(1, '#f21e4e');
      x.fillStyle = hg; x.fill();
      x.restore();
      const bq = V.clamp((q - 0.04) / 0.3);
      if (bq <= 0 || bq >= 1) return;
      x.save(); x.globalAlpha = 1 - bq; x.strokeStyle = '#fff'; x.lineWidth = 4; x.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = rot + (i / 8) * 6.283, r0 = 50 + 44 * V.E.out2(bq), r1 = r0 + 16 * (1 - bq); x.beginPath(); x.moveTo(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0); x.lineTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1); x.stroke(); }
      x.restore();
    });
    // subtitle bar 「當有人說 6'7"」 (TikTok text sticker)
    x.save();
    x.font = F(38, '900', CJK);
    const cap = '當有人說 6\'7"';
    const cw = x.measureText(cap).width + 34;
    x.fillStyle = '#ffffff';
    x.beginPath(); x.roundRect(SW / 2 - 12 - cw / 2, 712, cw, 56, 12); x.fill();
    x.fillStyle = '#000000'; x.textAlign = 'center'; x.fillText(cap, SW / 2 - 12, 753);
    x.restore();
    tk_icons(x, t, u);
    // description + music marquee
    x.save();
    x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 5; x.shadowOffsetY = 1;
    x.fillStyle = '#ffffff'; x.textAlign = 'left';
    x.font = F(26, '800', CJK); x.fillText('@kai.sixseven', 22, 808);
    x.font = F(23, '600', CJK); x.fillText('停不下來 😐 #67 #sixseven #fyp', 22, 842);
    x.font = F(22, '700', CJK); x.fillText('♬', 22, 876);
    x.beginPath(); x.rect(48, 852, 300, 34); x.clip();
    const mq = 'Doot Doot (6 7) - Skrilla · 原聲      ';
    x.font = F(22, '600', CJK);
    const mw = x.measureText(mq).width, off = (u * 70) % mw;
    x.fillText(mq + mq, 52 - off, 876);
    x.restore();
    // progress bar
    x.fillStyle = 'rgba(255,255,255,0.28)'; x.fillRect(0, VH - 3, SW, 3);
    x.fillStyle = '#ffffff'; x.fillRect(0, VH - 3, SW * V.clamp(0.12 + (u + 0.35) / 7.2), 3);
    // nav bar
    x.fillStyle = '#000000'; x.fillRect(0, VH, SW, NAV);
    x.fillStyle = '#ffffff'; x.strokeStyle = '#ffffff'; x.lineWidth = 2.6; x.lineJoin = 'round';
    const ny = VH + 30, lab = (s, cx, a = 1) => { x.globalAlpha = a; x.font = F(15, '600', CJK); x.textAlign = 'center'; x.fillText(s, cx, VH + 64); x.globalAlpha = 1; };
    x.beginPath(); x.moveTo(42, ny - 12); x.lineTo(56, ny - 24); x.lineTo(70, ny - 12); x.lineTo(70, ny + 6); x.lineTo(42, ny + 6); x.closePath(); x.fill(); lab('首頁', 56);
    x.globalAlpha = 0.85; x.beginPath(); x.arc(150, ny - 14, 7, 0, 7); x.stroke(); x.beginPath(); x.arc(150, ny + 8, 12, Math.PI, 0); x.stroke();
    x.beginPath(); x.arc(162, ny - 10, 5, 0, 7); x.stroke(); lab('朋友', 154, 0.85);
    [[COL.cy, -4], [COL.red, 4], ['#ffffff', 0]].forEach(([c, o]) => { x.fillStyle = c; x.beginPath(); x.roundRect(SW / 2 - 28 + o, ny - 20, 56, 36, 10); x.fill(); });
    x.fillStyle = '#000'; x.fillRect(SW / 2 - 10, ny - 3.5, 20, 5); x.fillRect(SW / 2 - 2.5, ny - 11, 5, 20);
    x.fillStyle = '#fff'; x.globalAlpha = 0.85;
    x.beginPath(); x.roundRect(370, ny - 20, 34, 26, 6); x.stroke(); x.beginPath(); x.moveTo(378, ny + 6); x.lineTo(376, ny + 13); x.lineTo(386, ny + 6); x.stroke();
    x.globalAlpha = 1; x.fillStyle = COL.red; x.beginPath(); x.roundRect(392, ny - 30, 30, 20, 10); x.fill();
    x.fillStyle = '#fff'; x.font = F(14, '900', AV); x.textAlign = 'center'; x.fillText('67', 407, ny - 15);
    lab('收件匣', 387, 0.85);
    x.globalAlpha = 0.85; x.beginPath(); x.arc(478, ny - 12, 8, 0, 7); x.stroke(); x.beginPath(); x.arc(478, ny + 9, 14, Math.PI * 1.05, -Math.PI * 0.05); x.stroke(); lab('個人', 478, 0.85);
    x.globalAlpha = 1;
  }
  function tk_flare(x, t) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    // anamorphic streak through the sun
    x.save(); x.translate(SUN[0], SUN[1]); x.scale(1, 0.018);
    let g = x.createRadialGradient(0, 0, 0, 0, 0, 230); g.addColorStop(0, 'rgba(255,230,190,0.32)'); g.addColorStop(1, 'rgba(255,160,160,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 230, 0, 7); x.fill(); x.restore();
    // ghosts along the sun → frame-center axis
    const ax = SW * 0.62 - SUN[0], ay = VH * 0.8 - SUN[1];
    [[0.45, 16, '120,255,240', 0.13], [0.7, 30, '255,120,200', 0.1], [0.92, 11, '255,240,150', 0.2], [1.25, 46, '140,160,255', 0.08]].forEach(([k, r, c, a]) => {
      const gx = SUN[0] + ax * k, gy = SUN[1] + ay * k;
      g = x.createRadialGradient(gx, gy, r * 0.2, gx, gy, r);
      g.addColorStop(0, `rgba(${c},${a * 0.4})`); g.addColorStop(0.85, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`);
      x.fillStyle = g; x.beginPath(); x.arc(gx, gy, r, 0, 7); x.fill();
    });
    x.restore();
  }
  function tk_paintScreen(t, u) {
    const scr = S.scr || (S.scr = mk(SW, SH));
    const x = scr.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    x.drawImage(tk_court(), 0, 0);
    // long shadows of the background kids (sun behind them)
    x.save(); x.globalCompositeOperation = 'multiply';
    [[KIDS[0], 652], [KIDS[1], 646]].forEach(([k, fy]) => {
      x.fillStyle = 'rgba(40,14,80,0.55)';
      x.beginPath(); x.moveTo(k.x - 30 * k.s * 2, fy); x.lineTo(k.x + 30 * k.s * 2, fy); x.lineTo(k.x - 40, fy + 150); x.lineTo(k.x - 110, fy + 150); x.closePath(); x.fill();
    });
    x.restore();
    KIDS.forEach((k) => tk_kid(x, k, t));
    tk_flare(x, t);
    tk_ui(x, t, u);
    return scr;
  }
  function tk_paintPhone(scr) {
    const g = V.gfx('tiktok_phone', PW + PM * 2, PH + PM * 2, () => {});
    const x = g.drawingContext;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, PW + PM * 2, PH + PM * 2);
    x.save();
    x.translate(PM, PM);
    x.fillStyle = '#2b2440';
    [[-5, 196, 8, 44], [-5, 272, 8, 82], [-5, 368, 8, 82], [PW - 3, 300, 8, 126]].forEach(([bx, by, bw, bh]) => { x.beginPath(); x.roundRect(bx, by, bw, bh, 3); x.fill(); });
    let gr = x.createLinearGradient(0, 0, PW, 0);
    gr.addColorStop(0, '#4a4266'); gr.addColorStop(0.06, '#17131f'); gr.addColorStop(0.94, '#17131f'); gr.addColorStop(1, '#4a4266');
    x.beginPath(); x.roundRect(0, 0, PW, PH, 84); x.fillStyle = gr; x.fill();
    gr = x.createLinearGradient(0, 0, PW, PH);
    gr.addColorStop(0, 'rgba(37,244,238,0.85)'); gr.addColorStop(0.5, 'rgba(200,200,255,0.35)'); gr.addColorStop(1, 'rgba(254,44,85,0.85)');
    x.lineWidth = 3; x.strokeStyle = gr; x.beginPath(); x.roundRect(1.5, 1.5, PW - 3, PH - 3, 83); x.stroke();
    x.save();
    x.beginPath(); x.roundRect(BZ, BZ, SW, SH, 72); x.clip();
    x.drawImage(scr, BZ, BZ);
    // screen reflection: soft top-left sheen + one diagonal glass streak
    gr = x.createLinearGradient(BZ, BZ, BZ + SW * 0.9, BZ + SH * 0.55);
    gr.addColorStop(0, 'rgba(255,255,255,0.2)'); gr.addColorStop(0.28, 'rgba(255,255,255,0.04)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)');
    gr.addColorStop(0.555, 'rgba(255,255,255,0.11)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.03)'); gr.addColorStop(0.64, 'rgba(255,255,255,0.09)'); gr.addColorStop(0.67, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(BZ, BZ, SW, SH);
    x.restore();
    x.fillStyle = '#000'; x.beginPath(); x.roundRect(PW / 2 - 64, BZ + 14, 128, 38, 19); x.fill();
    x.fillStyle = '#1b1830'; x.beginPath(); x.arc(PW / 2 + 40, BZ + 33, 8, 0, 7); x.fill();
    x.fillStyle = 'rgba(90,110,255,0.5)'; x.beginPath(); x.arc(PW / 2 + 38, BZ + 31, 2.5, 0, 7); x.fill();
    x.restore();
    return g;
  }
  function tk_paintCell(phone, s) {
    const cw = Math.ceil((PW + PM * 2) * CELL * 1.04) + 2, ch = Math.ceil((PH + PM * 2) * CELL * 1.04) + 2;
    const g = V.gfx('tiktok_cell', cw, ch, () => {});
    const x = g.drawingContext;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cw, ch);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    const w = (PW + PM * 2) * s, h = (PH + PM * 2) * s;
    x.drawImage(phone.canvas || phone.elt, (cw - w) / 2, (ch - h) / 2, w, h);
    return { g, cw, ch };
  }

  // ---------------------------------------------------------------- layout of the phone(s)
  function tk_layout(t, u) {
    const pz = V.G.pulse(t, 7);
    const shrink = V.E.io3(V.prog(u, 4.0, 0.42));
    const zoom = 1 - 0.07 * V.E.io2(V.prog(u, 4.8, 1.6));
    const beat = 1 + 0.012 * pz;
    const P = [];
    if (u >= 4.0) {
      [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].forEach(([cx, cy], k) => {
        const p = V.prog(u, 4.26 + k * 0.035, 0.36);
        if (p <= 0) return;
        const e = V.E.outBack(p, 1.5);
        const hop = -9 * V.G.pulse(t - 0.045 * (cx + cy + 2), 8) * V.smooth(4.75, 4.95, u); // beat ripple across the wall
        P.push({ x: 960 + cx * 208 * e * zoom, y: 540 + cy * 346 * e * zoom + hop, s: CELL * zoom * beat, cell: true, gx: cx, gy: cy });
      });
    }
    const ms = V.lerp(1, CELL, shrink) * zoom * beat;
    P.push({ x: 960, y: 540 - 9 * V.G.pulse(t - 0.09, 8) * V.smooth(4.75, 4.95, u), s: ms, cell: shrink >= 1, main: true, gx: 0, gy: 0 });
    return P;
  }

  // ---------------------------------------------------------------- outside the phone
  const LEFT = [['小宇', '67'], ['kai.67', 'six seven 🤲🤲'], ['阿嬤🥹', '這是什麼', 1], ['user6767', '😭😭😭'], ['某國中生', '幫我數到67', 1], ['傑哥', '？'],
    ['Mia💅', 'SIX SEVENNN'], ['數學老師', '6+7=13 謝謝'], ['路人甲', '我弟每天都在講這個'], ['doot_doot', '67!!!', 1], ['小美', '💀💀💀'], ['ㄚ明', '到底什麼意思'], ['阿伯', '看不懂但 🤲🤲'], ['教練', '他有 6\'7" 嗎']];
  const RIGHT = [['nana', '六七六七'], ['tim', '67 🏀'], ['小胖', '笑死', 0], ['班導', '不要再67了', 1], ['reese', 'SIX… SEVEN!', 1], ['媽媽', '吃飯了'], ['ivy', '🤲🤲🤲'], ['kevin', '好洗腦'], ['阿翔', '上熱門了'], ['ella', '6️⃣7️⃣']];
  const AVC = [[COL.cy, '#7a5cff'], [COL.red, COL.org], [COL.yel, '#ff7a1a'], ['#7a5cff', COL.red], ['#36e08a', COL.cy], ['#ff9bd2', '#7a5cff']];
  const UCOL = ['#9ff7f3', '#ffd0dc', '#fff6a0', '#d7c8ff'];
  function tk_comments(x, t, list, x0, yNew, fadeTop, offBeat, seed, xMax) {
    const ROW = 70;
    const b = V.G.b(t) - offBeat, k = Math.floor(b), f = b - k;
    const step = V.E.out3(V.clamp(f / 0.32));
    for (let j = 0; j < 14; j++) {
      const idx = k - j;
      const y = yNew - (j - 1 + step) * ROW;
      if (y < fadeTop - ROW) break;
      let al = V.clamp((yNew + ROW - y) / ROW) * V.clamp((y - fadeTop) / (ROW * 1.4));
      if (al <= 0.01) continue;
      const it = list[((idx % list.length) + list.length) % list.length];
      const h1 = V.hash(idx * 3.17 + seed), cA = AVC[Math.floor(V.hash(idx * 1.3 + seed) * AVC.length)];
      x.font = F(27, '700', CJK); const uw = x.measureText(it[0]).width;
      x.font = F(40, '800', CJK); const tw = x.measureText(it[1]).width;
      const w = 66 + uw + 14 + tw + 26;
      const px = Math.min(x0 + h1 * 46, xMax - w);
      const sc = j === 0 ? 0.82 + 0.18 * step : 1;
      x.save();
      x.globalAlpha = al;
      x.translate(px, y); x.scale(sc, sc);
      x.fillStyle = 'rgba(14,4,34,0.66)'; x.beginPath(); x.roundRect(0, -31, w, 62, 31); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.14)'; x.lineWidth = 1.5; x.stroke();
      const ag = x.createLinearGradient(8, -22, 52, 22); ag.addColorStop(0, cA[0]); ag.addColorStop(1, cA[1]);
      x.fillStyle = ag; x.beginPath(); x.arc(31, 0, 23, 0, 7); x.fill();
      x.fillStyle = '#ffffff'; x.font = F(22, '900', CJK); x.textAlign = 'center'; x.fillText([...it[0]][0], 31, 8);
      x.textAlign = 'left';
      x.font = F(27, '700', CJK); x.fillStyle = UCOL[Math.floor(h1 * UCOL.length)]; x.fillText(it[0], 66, 10);
      x.font = F(40, '800', CJK); x.fillStyle = it[2] ? COL.yel : '#ffffff'; x.fillText(it[1], 66 + uw + 14, 14);
      x.restore();
    }
  }
  function tk_particles(x, t, u, ex, ey) {
    // TikTok-LIVE floating hearts + stars, rising up and to the right
    const L = 2.6, dt = 0.1;
    const j0 = Math.floor((u - L) / dt) - 1, j1 = Math.floor(u / dt);
    for (let j = j0; j <= j1; j++) {
      const q = (u - j * dt) / L;
      if (q < 0 || q > 1) continue;
      const h1 = V.hash(j * 1.7 + 3), h2 = V.hash(j * 2.9 + 5), h3 = V.hash(j * 4.1 + 7);
      const px = ex + 30 + (220 + 300 * h1) * q + 34 * Math.sin(6.283 * (q * 1.4 + h2));
      const py = ey - (360 + 380 * h2) * q;
      const sz = (14 + 20 * h3) * V.E.outBack(V.clamp(q / 0.12)) * (1 + 0.25 * q);
      const al = 1 - V.smooth(0.65, 1, q);
      x.save();
      x.globalAlpha = al;
      x.translate(px, py); x.rotate(0.35 * Math.sin(6.283 * (q + h1)));
      const kind = h3 < 0.22 ? 'star' : 'heart';
      const c = [COL.red, '#ff6b9a', COL.red, COL.yel, COL.cy, '#ffffff'][Math.floor(h2 * 6)];
      x.shadowColor = c; x.shadowBlur = 14;
      if (kind === 'heart') tk_heart(x, 0, 0, sz); else tk_star(x, 0, 0, sz * 1.15, h1);
      x.fillStyle = c; x.fill();
      x.shadowColor = 'transparent';
      x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,0.85)'; x.stroke();
      x.restore();
    }
  }
  function tk_numerals(x, t, u) {
    const sy = V.G.say(t);
    [[6, 330, 868, COL.cy, 'SIX'], [7, 1592, 712, COL.red, 'SEVEN']].forEach(([n, nx, ny, col]) => {
      const on = sy.n === n, e = on ? sy.env : 0;
      x.save();
      x.translate(nx, ny);
      x.font = F(780, '900', AV, true);
      x.textAlign = 'center';
      const s = String(n);
      if (!on) {
        x.lineWidth = 4; x.strokeStyle = A(col, 0.42); x.strokeText(s, 0, 0);
        x.fillStyle = A(col, 0.07); x.fillText(s, 0, 0);
      } else {
        const sc = 1 + 0.07 * e;
        x.scale(sc, sc);
        x.shadowColor = col; x.shadowBlur = 70; x.fillStyle = A(col, 0.55); x.fillText(s, 0, 0); x.shadowBlur = 0; x.shadowColor = 'transparent';
        const d = 9 + 20 * e;
        const r = V.rng(sy.idx * 97 + n);
        // RGB-split glyph rendered off-screen at integer coords (no seams), then sliced bands are cut & shifted
        const NC = S.numc || (S.numc = mk(1160, 880)), nx2 = NC.getContext('2d'), OX = 580, OY = 780;
        nx2.setTransform(1, 0, 0, 1, 0, 0); nx2.globalCompositeOperation = 'source-over'; nx2.clearRect(0, 0, 1160, 880);
        nx2.font = F(780, '900', AV, true); nx2.textAlign = 'center';
        const layers = [[COL.cy, -d, -d * 0.35], [COL.red, d, d * 0.35], ['#ffffff', 0, 0]];
        layers.forEach(([c, dx, dy]) => { nx2.fillStyle = c; nx2.fillText(s, OX + dx, OY + dy); });
        const bands = 9, top = OY - 600, hgt = 640;
        for (let b = 0; b < bands; b++) {
          const off = Math.round((r() - 0.5) * 140 * Math.pow(e, 1.6) * (r() < 0.55 ? 1 : 0));
          if (!off) continue;
          const by0 = Math.round(top + (hgt * b) / bands), bh = Math.round(top + (hgt * (b + 1)) / bands) - by0;
          nx2.clearRect(0, by0, 1160, bh);
          nx2.save(); nx2.beginPath(); nx2.rect(0, by0, 1160, bh); nx2.clip();
          layers.forEach(([c, dx, dy]) => { nx2.fillStyle = c; nx2.fillText(s, OX + off + dx, OY + dy); });
          nx2.restore();
        }
        x.drawImage(NC, -OX, -OY);
      }
      x.restore();
    });
  }
  function tk_stamp(x, t) {
    const sy = V.G.say(t);
    const six = sy.n === 6;
    const p = V.clamp(sy.k / 0.2), pop = V.E.outBack(p, 2.8);
    const [sx, sy0] = six ? [330, 548] : [1590, 486];
    const word = six ? 'SIX' : 'SEVEN';
    x.save();
    x.translate(sx, sy0); x.rotate(six ? -0.12 : -0.08); x.scale(0.3 + 0.7 * pop, 0.3 + 0.7 * pop);
    x.font = F(six ? 170 : 150, '900', AV, true); x.textAlign = 'center'; x.lineJoin = 'round';
    x.fillStyle = '#000'; x.fillText(word, 10, 12);
    x.lineWidth = 18; x.strokeStyle = '#000'; x.strokeText(word, 0, 0);
    x.fillStyle = COL.yel; x.fillText(word, 0, 0);
    x.restore();
  }
  function tk_beatSparkles(x, t, u) {
    const sy = V.G.say(t);
    for (let bi = sy.idx - 1; bi <= sy.idx; bi++) {
      const age = V.G.b(t) - bi;
      if (age < 0 || age > 1.4) continue;
      const r = V.rng(bi * 131 + 9);
      for (let i = 0; i < 6; i++) {
        let px = r() < 0.5 ? 560 + r() * 110 : 1250 + r() * 560, py = 90 + r() * 900;
        if (px < 700 && py < 330) py += 280;
        if (px > 1400 && py > 820) py -= 300;
        const q = age / 1.4, sz = (16 + r() * 26) * V.E.outBack(V.clamp(age / 0.18)) * (1 - V.E.in2(q));
        if (sz < 1) continue;
        tk_sparkle(x, px, py, sz, r() * 0.8 + age, r() < 0.5 ? COL.cy : COL.yel);
      }
    }
  }

  // ---------------------------------------------------------------- p5.brush neon doodles (drawn on a cleared canvas, captured, glowed)
  function tk_doodles(t, u) {
    clear();
    V.mReset();
    const rv = (a, d = 0.35) => V.E.out2(V.prog(u, a, d));
    const o = (seed, extra) => Object.assign({ seed, boil: true, wob: 1.4, taper: [6, 10] }, extra);
    // yellow sparkle crosses (marker), left-top and right-top of the phone
    [[612, 392, 32, 0.05], [584, 450, 17, 0.12], [1300, 214, 30, 0.18], [1328, 268, 16, 0.24]].forEach(([cx, cy, r, d], i) => {
      const k = 0.18 * r;
      V.ink(`M${cx},${cy - r} Q${cx + k},${cy - k} ${cx + r},${cy} Q${cx + k},${cy + k} ${cx},${cy + r} Q${cx - k},${cy + k} ${cx - r},${cy} Q${cx - k},${cy - k} ${cx},${cy - r}`,
        o(10 + i, { brush: 'marker', color: COL.yel, w: 0.75, reveal: rv(d, 0.3), taper: [2, 2] }));
    });
    // white emphasis ticks at the phone corners (crayon)
    [[[1276, 66], [1310, 36]], [[1288, 98], [1330, 84]], [[1264, 46], [1276, 14]], [[632, 1012], [600, 1044]], [[618, 990], [580, 998]], [[648, 1030], [642, 1066]]].forEach((p, i) =>
      V.ink(p, o(30 + i, { brush: 'marker', color: '#ffffff', w: 0.8, reveal: rv(0.1 + 0.04 * i, 0.2) })));
    // cyan zig-zag + magenta loop
    V.ink([[536, 296], [560, 278], [580, 300], [602, 280], [624, 302], [644, 284]], o(40, { brush: 'marker', color: COL.cy, w: 1.0, reveal: rv(0.2), smooth: true }));
    // the meme red circle around the kid's hands + arrow (only while the single phone is up)
    if (u < 4.0) {
      const cx = 960 - SW / 2 + 218, cy = 540 - SH / 2 + 614;
      const pts = [];
      for (let i = 0; i <= 44; i++) { const a = -2.6 + (i / 44) * 6.85, rr = 1 + 0.045 * Math.sin(i * 0.9) + 0.02 * i / 44; pts.push([cx + Math.cos(a) * 230 * rr, cy + Math.sin(a) * 92 * rr]); }
      V.ink(pts, o(50, { brush: 'gouache', color: '#ff1f3d', w: 0.62, reveal: rv(0.12, 0.5), smooth: true, wob: 2.2, taper: [4, 8] }));
      const ar = rv(0.55, 0.3);
      V.ink([[540, 800], [596, 730], [660, 694]], o(51, { brush: 'gouache', color: '#ff1f3d', w: 0.6, reveal: ar, smooth: true, taper: [4, 2] }));
      if (ar > 0.95) {
        V.ink([[662, 693], [628, 684]], o(52, { brush: 'gouache', color: '#ff1f3d', w: 0.6, taper: [2, 4] }));
        V.ink([[662, 693], [644, 724]], o(53, { brush: 'gouache', color: '#ff1f3d', w: 0.6, taper: [2, 4] }));
      }
    }
    V.flush();
    return get();
  }

  // ---------------------------------------------------------------- post: chromatic aberration, shake, slice glitch, strobe
  function tk_post(t, u) {
    const G = V.G, sy = G.say(t);
    const pz = G.pulse(t, 9);
    const hit = u >= 4 ? Math.exp(-7 * (u - 4)) : 0; // the bar-3 wall hit
    V.flush();
    const fr = get();
    const r = V.rng(sy.idx * 31 + 7);
    const amp = 5 * pz * (sy.idx % 4 === 0 ? 1.35 : 1) + 18 * hit;
    const an = r() * 6.283;
    const sx = Math.cos(an) * amp, syy = Math.sin(an) * amp * 0.7;
    const k = 0.002 + 0.0055 * pz + 0.014 * hit;
    const Z = (1 + (2.2 * Math.abs(amp)) / 1080) / (1 - k);
    V.native(() => {
      background(0);
      imageMode(CENTER);
      blendMode(ADD);
      tint(255, 0, 0); image(fr, 960 + sx, 540 + syy, W * Z * (1 + k), H * Z * (1 + k));
      tint(0, 255, 0); image(fr, 960 + sx, 540 + syy, W * Z, H * Z);
      tint(0, 0, 255); image(fr, 960 + sx, 540 + syy, W * Z * (1 - k), H * Z * (1 - k));
      blendMode(BLEND);
      noTint();
      imageMode(CORNER);
      const gl = V.clamp((pz - 0.45) / 0.55) + hit;
      if (gl > 0.03) {
        const n = 2 + Math.floor(r() * 3) + Math.floor(hit * 6);
        for (let i = 0; i < n; i++) {
          const y = r() * H, h = 4 + r() * 40, dx = (r() - 0.5) * 120 * gl;
          if (r() < 0.3) tint(r() < 0.5 ? 120 : 255, r() < 0.5 ? 255 : 120, 255);
          image(fr, dx, y, W, h, 0, y, W, h);
          noTint();
        }
      }
      const fl = (sy.idx % 4 === 0 ? 0.12 : 0.06) * Math.pow(G.pulse(t, 13), 1.5) + 0.14 * hit;
      if (fl > 0.003) { noStroke(); fill(255, 255, 255, 255 * fl); rect(0, 0, W, H); }
    });
  }

  // ---------------------------------------------------------------- scene
  V.scenes.tiktok = {
    draw(t, u, meta) {
      tk_court(); // bake once (clears the canvas itself)
      const dood = tk_doodles(t, u);
      const scr = tk_paintScreen(t, u);
      const phone = tk_paintPhone(scr);
      const lay = tk_layout(t, u);
      const cellS = lay.find((p) => p.cell) ? lay.find((p) => p.cell).s : CELL;
      const cell = lay.some((p) => p.cell) ? tk_paintCell(phone, cellS) : null;
      const G = V.G, sy = G.say(t), pz = G.pulse(t, 5);
      V.bg(COL.bg);
      // ---- layer 1: background light, halftone, rays, glitch bars, giant 6 / 7, phone glows
      V.with2d((x) => {
        const six = sy.n === 6 ? sy.env : 0, sev = sy.n === 7 ? sy.env : 0;
        const glow = (gx, gy, rr, c, a) => { const g = x.createRadialGradient(gx, gy, 0, gx, gy, rr); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); x.fillStyle = g; x.fillRect(0, 0, W, H); };
        glow(960, 560, 700, '110,30,190', 0.42);
        glow(320, 640, 820, '37,244,238', 0.2 + 0.2 * six);
        glow(1600, 440, 820, '254,44,85', 0.24 + 0.2 * sev);
        // slow light rays from the phone
        x.save(); x.translate(960, 540); x.rotate(t * 0.12);
        for (let i = 0; i < 18; i++) {
          x.fillStyle = i % 2 ? 'rgba(255,255,255,0.028)' : 'rgba(160,90,255,0.03)';
          x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 1400, (i / 18) * 6.283, ((i + 0.5) / 18) * 6.283); x.closePath(); x.fill();
        }
        x.restore();
        x.globalAlpha = 0.55 + 0.3 * pz; x.drawImage(tk_halftone(), 0, 0); x.globalAlpha = 1;
        // glitch bars on the beat
        const r = V.rng(sy.idx * 53 + 1);
        for (let i = 0; i < 7; i++) {
          const y = r() * H, h = 2 + r() * 12, x0 = r() * W * 0.7, w = 160 + r() * 900;
          x.fillStyle = [COL.cy, COL.red, '#ffffff', '#7a5cff'][Math.floor(r() * 4)];
          x.globalAlpha = (0.12 + 0.55 * pz) * (r() < 0.7 ? 1 : 0.4);
          x.fillRect(x0, y, w, h);
        }
        x.globalAlpha = 1;
        tk_numerals(x, t, u);
        // phone glows
        lay.forEach((p) => {
          const w = PW * p.s, h = PH * p.s;
          x.save();
          x.filter = `blur(${Math.round(18 + 30 * p.s)}px)`;
          const g = x.createLinearGradient(p.x - w / 2, 0, p.x + w / 2, 0);
          g.addColorStop(0, A(COL.cy, 0.7)); g.addColorStop(1, A(COL.red, 0.7));
          x.fillStyle = g; x.beginPath(); x.roundRect(p.x - w / 2 - 8, p.y - h / 2 - 8, w + 16, h + 16, 90 * p.s); x.fill();
          x.restore();
        });
      });
      // ---- phones (copies behind, the original on top)
      lay.forEach((p) => {
        if (p.cell && cell) V.blit(cell.g, Math.round(p.x - cell.cw / 2), Math.round(p.y - cell.ch / 2), cell.cw, cell.ch);
        else {
          const w = (PW + PM * 2) * p.s, h = (PH + PM * 2) * p.s;
          V.blit(phone, p.x - w / 2, p.y - h / 2, w, h);
        }
      });
      // ---- layer 2: balls, hearts, comments, doodles (glowing), stamps, sparkles
      V.with2d((x) => {
        const bt = V.fract(G.b(t)), hop = 1 - Math.pow(2 * bt - 1, 2), sq = Math.max(0, 0.12 - bt * 0.6) + Math.max(0, (bt - 0.9) * 0.9);
        tk_ball(x, 584, 196 - 52 * hop, 62, t * 4.2, sq);
        tk_ball(x, 1336, 950 - 40 * hop, 54, -t * 3.6 + 1, sq);
        const ex = lay.length > 1 ? 1272 : 1250;
        tk_particles(x, t, u, ex, 650);
        tk_comments(x, t, LEFT, 40, 1004, 690, 0, 11, 646);
        tk_comments(x, t, RIGHT, 1272, 812, 560, 0.5, 23, 1880);
        x.save();
        x.filter = 'blur(12px)'; x.globalAlpha = 0.95; x.globalCompositeOperation = 'lighter';
        x.drawImage(dood.canvas, 0, 0);
        x.restore();
        x.drawImage(dood.canvas, 0, 0);
        tk_stamp(x, t);
        tk_beatSparkles(x, t, u);
      });
      tk_post(t, u);
    },
  };
})();
