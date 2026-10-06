/* finale.js — 72–82 s. "Everyone, in every era, has been doing 67": a 5×3 mosaic of all 15 eras (the actual rendered scene frames, looped on the shared
 * bar so every hand seesaws in sync), popping in chronologically on the beat, then an end card.
 * Tile frames come from public/tiles/<id>/NNN.jpg (48 frames = one 2-second bar each; made by tools/mktiles.sh from clean (notrans) renders).
 */
(function () {
  const ORDER = ['cave', 'egypt', 'greek', 'roman', 'song', 'medieval', 'renaissance', 'ukiyo', 'vangogh', 'surreal', 'pop', 'synth', 'pixel', 'xp', 'tiktok'];
  const COLS = 5, ROWS = 3, TW = 380, TH = 214, GAP = 5;
  const GX = (V.W - (COLS * TW + (COLS - 1) * GAP)) / 2, GY = (V.H - (ROWS * TH + (ROWS - 1) * GAP)) / 2;
  const NF = 48;
  let imgs = null, loading = null;
  const SERIF = 'Songti TC';

  async function load() {
    if (imgs) return;
    if (!loading) {
      loading = (async () => {
        const m = {};
        const jobs = [];
        for (const id of ORDER) {
          m[id] = [];
          for (let i = 0; i < NF; i++) {
            const im = new Image();
            im.src = `tiles/${id}/${String(i + 1).padStart(3, '0')}.jpg`;
            m[id].push(im);
            jobs.push(im.decode().catch(() => {}));
          }
        }
        await Promise.all(jobs);
        imgs = m;
      })();
    }
    await loading;
  }

  V.scenes.finale = {
    noHud: true,
    prepare: load,
    draw(t, u, meta) {
      V.bg('#050507');
      const pulse = V.G.pulse(t, 8);
      const say = V.G.say(t);
      const endp = V.smooth(8.0, 8.5, u); // grid -> end card
      const gridA = 1 - endp;
      const zoom = 1 + 0.012 * pulse * V.smooth(4.0, 4.2, u) + 0.035 * V.smooth(4.0, 8.0, u) - 0.12 * endp;
      const frame = Math.floor(V.fract(t / 2) * NF) % NF;

      if (gridA > 0.01) {
        V.with2d((ctx) => {
          ctx.save();
          ctx.globalAlpha = gridA;
          ctx.translate(V.W / 2, V.H / 2);
          ctx.scale(zoom, zoom);
          ctx.translate(-V.W / 2, -V.H / 2);
          ORDER.forEach((id, k) => {
            const c = k % COLS, r = Math.floor(k / COLS);
            const x = GX + c * (TW + GAP), y = GY + r * (TH + GAP);
            const p = V.prog(u, 0.5 + k * 0.25, 0.36);
            ctx.fillStyle = '#0d0d12';
            ctx.fillRect(x, y, TW, TH);
            if (p <= 0) return;
            const e = V.E.outBack(p, 2.4);
            const sc = 0.15 + 0.85 * e;
            ctx.save();
            ctx.translate(x + TW / 2, y + TH / 2);
            ctx.scale(sc, sc);
            ctx.beginPath();
            ctx.rect(-TW / 2, -TH / 2, TW, TH);
            ctx.clip();
            const im = imgs && imgs[id] && imgs[id][frame];
            if (im && im.complete && im.naturalWidth) ctx.drawImage(im, -TW / 2, -TH / 2, TW, TH);
            else { ctx.fillStyle = '#222'; ctx.fillRect(-TW / 2, -TH / 2, TW, TH); }
            // checkerboard flash on the beat: the whole wall seesaws
            if (u > 4.0 && (c + r) % 2 === say.idx % 2) { ctx.fillStyle = `rgba(255,255,255,${0.22 * say.env})`; ctx.fillRect(-TW / 2, -TH / 2, TW, TH); }
            // pop flash
            const fl = Math.max(0, 1 - p * 2.2) * 0.6;
            if (fl > 0.01) { ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(-TW / 2, -TH / 2, TW, TH); }
            ctx.restore();
          });
          ctx.restore();
        });
      }

      // headline above / below the wall
      const ta = 1 - endp;
      if (ta > 0.01) {
        const l1 = '結論：人類四萬年來，一直都在 67。';
        V.text(l1, V.W / 2, 150, 72, { font: SERIF, weight: 'bold', color: '#f1ead9', align: 'center', alpha: ta * V.E.out3(V.prog(u, 0.8, 0.5)), reveal: V.prog(u, 0.9, 1.6) });
        V.text('沒有人知道為什麼。', V.W / 2, 940, 56, { font: SERIF, weight: 'bold', color: '#c9c2af', align: 'center', alpha: ta * V.E.out3(V.prog(u, 4.6, 0.4)) });
        V.text('也沒有人敢問。', V.W / 2, 1010, 56, { font: SERIF, weight: 'bold', color: '#d97757', align: 'center', alpha: ta * V.E.out3(V.prog(u, 6.0, 0.4)) });
      }

      // end card
      if (endp > 0.01) {
        const k = V.E.out3(V.smooth(8.0, 8.7, u));
        V.push();
        V.translate(V.W / 2, 520);
        V.scale(0.8 + 0.2 * k);
        V.text('67', 0, 0, 560, { font: 'Bodoni 72', weight: 'bold', color: '#f4efe2', align: 'center', alpha: k, shadow: { c: 'rgba(0,0,0,0.6)', x: 0, y: 14, b: 40 } });
        V.pop();
        V.text('（沒有人知道它是什麼意思）', V.W / 2, 700, 46, { font: SERIF, weight: 'bold', color: '#c9c2af', align: 'center', alpha: V.E.out3(V.prog(u, 8.9, 0.5)) });
        V.text('p5.js × p5.brush · 全部由程式逐幀畫出', V.W / 2, 1000, 26, { font: 'Menlo', weight: 'bold', color: '#6f695c', align: 'center', alpha: V.E.out3(V.prog(u, 9.2, 0.5)), track: 0.08 });
        // the little hands of the last beat: two dots seesawing on either side (a final deadpan 67)
        if (u > 9.0) {
          for (const side of [0, 1]) {
            const a = V.G.arm(t, side);
            V.dot(V.W / 2 + (side ? 300 : -300), 860 - a.y * 22, 9, '#f4efe2', { alpha: V.E.out3(V.prog(u, 9.0, 0.4)) });
          }
        }
      }
      V.vignette({ amt: 0.6 });
      V.grain({ amt: 0.16 });
      const fo = V.smooth(9.75, 10.0, u);
      if (fo > 0) V.with2d((ctx) => { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, V.W, V.H); });
    },
  };
})();
