/* cover.js — still cover image for the film (1920x1080). p5 (WEBGL) + p5.brush rays/underline + a 2D-canvas collage clipped to a giant "67".
 * node tools/shot.mjs cover.html out/cover.png 0 */
(function () {
  const ORDER = ['cave', 'egypt', 'greek', 'roman', 'song', 'medieval', 'renaissance', 'ukiyo', 'vangogh', 'surreal', 'pop', 'synth', 'pixel', 'xp', 'tiktok', 'tiktok2'];
  // focal point (fraction of the 1920x1080 frame) + zoom (fraction of the frame width shown in a cell) per era
  const FOCUS = {
    cave: [0.52, 0.45, 0.62], egypt: [0.5, 0.42, 0.5], greek: [0.5, 0.5, 0.5], roman: [0.5, 0.36, 0.34], song: [0.48, 0.38, 0.55],
    medieval: [0.17, 0.5, 0.42], renaissance: [0.5, 0.5, 0.5], ukiyo: [0.36, 0.4, 0.55], vangogh: [0.5, 0.38, 0.55], surreal: [0.52, 0.55, 0.5],
    pop: [0.3, 0.4, 0.5], synth: [0.45, 0.5, 0.55], pixel: [0.5, 0.62, 0.5], xp: [0.76, 0.52, 0.34], tiktok: [0.5, 0.45, 0.42], tiktok2: [0.16, 0.55, 0.36],
  };
  const PAPER = '#f4efe2', INK = '#09090c', CLAY = '#d97757';
  const imgs = {};

  function loadImg(id) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = `cover_src/${id === 'tiktok2' ? 'tiktok' : id}.jpg`;
      imgs[id] = im;
    });
  }

  function draw() {
    translate(-width / 2, -height / 2);
    window.__lastError = null;
    try {
      V.mReset(); V.pending = false; V.tick = 3;
      V.bg(INK);
      // warm glow behind the numerals
      V.with2d((ctx) => {
        const g = ctx.createRadialGradient(960, 520, 60, 960, 520, 1000);
        g.addColorStop(0, 'rgba(120,76,52,0.55)'); g.addColorStop(0.5, 'rgba(48,30,28,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
      });
      // brush sunburst rays (gouache + charcoal) radiating from behind the numerals
      const r = V.rng(67);
      randomSeed(67);
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * Math.PI * 2 + (r() - 0.5) * 0.06;
        const r0 = 330 + r() * 80, r1 = 760 + r() * 520;
        const cx = 960, cy = 500;
        const col = i % 3 === 0 ? CLAY : i % 3 === 1 ? '#8b6a4a' : '#5d4636';
        V.ink([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.78], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.78]], { brush: 'gouache', color: col, alpha: i % 3 === 0 ? 0.75 : 0.55, w: 0.55 + r() * 0.5, taper: [30, 120], wob: 2, step: 40, seed: i + 5 });
      }
      V.flush();

      // collage clipped to the (fattened) glyphs: the 6 holds eras 1-8, the 7 holds eras 9-15 + the intro frame
      V.with2d((ctx) => {
        const SIZE = 860, FONT = `bold ${SIZE}px "Bodoni 72", "Didot", serif`, FAT = 62;
        ctx.font = FONT; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        const w6 = ctx.measureText('6').width, w7 = ctx.measureText('7').width;
        const gap = -40; // tuck the two numerals together
        const x6 = 960 - (w6 + w7 + gap) / 2, x7 = x6 + w6 + gap, ty = 826;
        const box = (ch, x) => { const m = ctx.measureText(ch); return [x - m.actualBoundingBoxLeft - FAT / 2, ty - m.actualBoundingBoxAscent - FAT / 2, x + m.actualBoundingBoxRight + FAT / 2, ty + m.actualBoundingBoxDescent + FAT / 2]; };
        const off = document.createElement('canvas'); off.width = 1920; off.height = 1080;
        const o = off.getContext('2d');
        const place = (bx, ids) => {
          const cols = 2, rows = 4, gw = (bx[2] - bx[0]) / cols, gh = (bx[3] - bx[1]) / rows;
          ids.forEach((id, k) => {
            const c = k % cols, rr = Math.floor(k / cols), x = bx[0] + c * gw, y = bx[1] + rr * gh, im = imgs[id];
            if (!im) return;
            const [fx, fy, z] = FOCUS[id];
            const sw = 1920 * z * 0.85, sh = sw * (gh / gw);
            const sx = V.clamp(fx * 1920 - sw / 2, 0, 1920 - sw), sy = V.clamp(fy * 1080 - sh / 2, 0, 1080 - sh);
            o.drawImage(im, sx, sy, sw, sh, x + 1.5, y + 1.5, gw - 3, gh - 3);
          });
        };
        place(box('6', x6), ORDER.slice(0, 8));
        place(box('7', x7), ORDER.slice(8, 16));
        const glyph = (c, kind) => {
          [['6', x6], ['7', x7]].forEach(([ch, x]) => { if (kind === 'fill') { c.fillText(ch, x, ty); c.strokeText(ch, x, ty); } else c.strokeText(ch, x, ty); });
        };
        // mask the collage by the fattened glyphs
        const mk = document.createElement('canvas'); mk.width = 1920; mk.height = 1080;
        const mc = mk.getContext('2d');
        mc.font = FONT; mc.textAlign = 'left'; mc.textBaseline = 'alphabetic'; mc.fillStyle = '#000'; mc.strokeStyle = '#000'; mc.lineJoin = 'round'; mc.lineWidth = FAT;
        glyph(mc, 'fill');
        o.globalCompositeOperation = 'destination-in';
        o.drawImage(mk, 0, 0);
        // shadow + paper outline + ink hairline, then the collage on top
        ctx.save();
        ctx.font = FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 56; ctx.shadowOffsetY = 22;
        ctx.lineWidth = FAT + 34; ctx.strokeStyle = PAPER; glyph(ctx, 'stroke');
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = FAT + 40; ctx.strokeStyle = INK; ctx.globalCompositeOperation = 'destination-over';
        ctx.restore();
        ctx.drawImage(off, 0, 0);
        ctx.save();
        ctx.font = FONT; ctx.textAlign = 'left'; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        // inner highlight along the collage edge
        ctx.restore();
      });

      // headline
      V.text('人類四萬年來，一直都在', 960, 150, 82, { font: 'Songti TC', weight: 'bold', color: PAPER, align: 'center', shadow: { c: 'rgba(0,0,0,0.7)', x: 0, y: 6, b: 18 }, track: 0.04 });
      // brush underline under 一直都在
      V.ink([[1010, 180], [1230, 186], [1440, 176]], { brush: 'gouache', color: CLAY, w: 0.8, taper: [20, 60], wob: 3, smooth: true, seed: 11 });
      V.ink([[1030, 198], [1290, 202], [1430, 194]], { brush: 'gouache', color: CLAY, alpha: 0.7, w: 0.45, taper: [20, 60], wob: 3, smooth: true, seed: 12 });
      V.flush();

      // era pill + museum label
      V.with2d((ctx) => {
        // pill top-left
        ctx.fillStyle = CLAY;
        const px = 70, py = 62, pw = 270, ph = 56, rr = 28;
        ctx.beginPath(); ctx.moveTo(px + rr, py); ctx.lineTo(px + pw - rr, py); ctx.quadraticCurveTo(px + pw, py, px + pw, py + rr); ctx.lineTo(px + pw, py + ph - rr);
        ctx.quadraticCurveTo(px + pw, py + ph, px + pw - rr, py + ph); ctx.lineTo(px + rr, py + ph); ctx.quadraticCurveTo(px, py + ph, px, py + ph - rr); ctx.lineTo(px, py + rr); ctx.quadraticCurveTo(px, py, px + rr, py); ctx.fill();
      });
      V.text('一部藝術史', 70 + 135, 62 + 40, 36, { font: 'PingFang TC', weight: 'bold', color: '#fff', align: 'center', track: 0.18 });

      // bottom: subtitle + timeline of 15 eras
      V.text('從洞穴壁畫，到 TikTok', 960, 962, 60, { font: 'Songti TC', weight: 'bold', color: PAPER, align: 'center', track: 0.12, shadow: { c: 'rgba(0,0,0,0.8)', x: 0, y: 4, b: 14 } });
      const years = ['40,000 BCE', '1300 BCE', '500 BCE', '79', '1000', '1250', '1498', '1831', '1889', '1931', '1962', '1985', '1991', '2006', '2025'];
      const x0 = 150, x1 = 1770, ty0 = 1022;
      V.with2d((ctx) => {
        ctx.strokeStyle = 'rgba(244,239,226,0.5)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x0, ty0); ctx.lineTo(x1, ty0); ctx.stroke();
        years.forEach((y, i) => {
          const x = x0 + ((x1 - x0) * i) / (years.length - 1);
          ctx.fillStyle = i === 0 || i === years.length - 1 ? CLAY : PAPER;
          ctx.beginPath(); ctx.arc(x, ty0, i === 0 || i === years.length - 1 ? 9 : 6, 0, 7); ctx.fill();
        });
      });
      V.text('40,000 BCE', x0, ty0 + 40, 26, { font: 'Menlo', weight: 'bold', color: CLAY, align: 'center', track: 0.06 });
      V.text('2026', x1, ty0 + 40, 26, { font: 'Menlo', weight: 'bold', color: CLAY, align: 'center', track: 0.06 });

      // museum label (top right)
      const lx = 1470, ly = 760, lw = 400, lh = 132;
      V.with2d((ctx) => {
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
        ctx.fillStyle = '#f3eee2'; ctx.fillRect(lx, ly, lw, lh);
        ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#26221d'; ctx.lineWidth = 3; ctx.strokeRect(lx + 0.5, ly + 0.5, lw - 1, lh - 1);
        ctx.lineWidth = 1; ctx.strokeRect(lx + 8.5, ly + 8.5, lw - 17, lh - 17);
      });
      V.text('NO. 67-00', lx + 24, ly + 36, 19, { font: 'Menlo', weight: 'bold', color: '#8a8173', track: 0.12 });
      V.text('《六七》', lx + 24, ly + 76, 36, { font: 'Songti TC', weight: 'bold', color: '#26221d' });
      V.text('15 個年代・全員同步', lx + 24, ly + 112, 26, { font: 'Songti TC', weight: 'bold', color: '#a6401f' });

      V.vignette({ amt: 0.55 });
      V.grain({ amt: 0.13, anim: false });
      V.flush();
    } catch (e) {
      window.__lastError = e.stack || String(e);
      console.error(window.__lastError);
    }
  }
  async function setup() {
    pixelDensity(1);
    createCanvas(V.W, V.H, WEBGL).parent('stage');
    noLoop();
    V.initBrushes();
    await Promise.all(ORDER.map(loadImg));
    window.__ready = true;
  }
  window.setup = setup;
  window.draw = draw;
  window.renderAt = async () => { await redraw(); await redraw(); };
})();
