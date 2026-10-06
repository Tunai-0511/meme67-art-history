/* intro.js — 0–4 s. Deadpan documentary open: black, typed lines, then SIX / SEVEN slam in on 2.0 / 2.5 s (the first beats of bar 2). */
(function () {
  const INK = '#0b0b0e', PAPER = '#ece6d6';
  const SERIF = 'Songti TC';

  V.scenes.intro = {
    noHud: true,
    draw(t, u) {
      V.bg(INK);
      // dusty projector light
      V.with2d((ctx) => {
        const g = ctx.createRadialGradient(V.W / 2, V.H * 0.46, 40, V.W / 2, V.H * 0.46, 900);
        g.addColorStop(0, 'rgba(70,64,52,0.55)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, V.W, V.H);
      });
      const r = V.rng(7);
      V.with2d((ctx) => {
        for (let i = 0; i < 46; i++) {
          const x = (r() * V.W + t * (8 + r() * 12)) % V.W, y = (r() * V.H - t * (5 + r() * 9) + V.H * 2) % V.H;
          ctx.fillStyle = `rgba(236,230,214,${0.05 + r() * 0.12})`;
          ctx.beginPath(); ctx.arc(x, y, 0.8 + r() * 1.8, 0, 7); ctx.fill();
        }
      });

      // typed documentary lines
      const l1 = '考古學家發現：', l2 = '人類，一直都在做同一件事。';
      const fa = 1 - V.smooth(1.9, 2.0, t);
      if (fa > 0.01) {
        const w1 = V.textW(l1, 60, { font: SERIF, weight: 'bold' }), w2 = V.textW(l2, 60, { font: SERIF, weight: 'bold' });
        V.text(l1, V.W / 2 - w2 / 2, 470, 60, { font: SERIF, weight: 'bold', color: PAPER, alpha: fa, reveal: V.prog(t, 0.3, 0.5) });
        const rev = V.prog(t, 0.95, 0.9);
        V.text(l2, V.W / 2 - w2 / 2, 560, 60, { font: SERIF, weight: 'bold', color: PAPER, alpha: fa, reveal: rev });
        // blinking cursor
        if (t < 1.95) {
          const w = V.textW(rev < 1 ? l2.slice(0, Math.floor(l2.length * rev + 0.001)) : l2, 60, { font: SERIF, weight: 'bold' });
          const cur = V.textW(l2, 60, { font: SERIF, weight: 'bold' });
          if (Math.floor(t * 4) % 2 === 0 && t > 0.3) V.with2d((ctx) => { ctx.fillStyle = PAPER; ctx.globalAlpha = fa; ctx.fillRect(V.W / 2 - cur / 2 + w + 6, 512, 5, 56); });
        }
      }

      // the slam
      const slam = (t0, n, x, dir) => {
        const p = V.prog(t, t0, 0.18);
        if (p <= 0) return;
        const e = V.E.outBack(p, 3.2), s = 1.9 - 0.9 * e;
        const shake = Math.exp(-(t - t0) * 9) * 18;
        const dx = Math.sin((t - t0) * 90) * shake * dir, dy = Math.cos((t - t0) * 77) * shake * 0.6;
        V.push();
        const bob = t > t0 + 0.5 ? -V.G.arm(t, dir < 0 ? 0 : 1).y * 22 * V.smooth(t0 + 0.5, t0 + 1.0, t) : 0;
        V.translate(x + dx, 600 + dy + bob);
        V.scale(s);
        V.text(n, 0, 0, 640, { font: 'Bodoni 72', weight: 'bold', color: '#f4efe2', align: 'center', alpha: V.clamp(p * 4), shadow: { c: 'rgba(0,0,0,0.6)', x: 0, y: 14, b: 40 } });
        V.pop();
      };
      slam(2.0, '6', V.W / 2 - 215, -1);
      slam(2.5, '7', V.W / 2 + 215, 1);
      // white impact flashes
      const fl = Math.max(Math.exp(-(t - 2.0) * 22) * (t >= 2.0), Math.exp(-(t - 2.5) * 22) * (t >= 2.5)) * 0.55;
      if (fl > 0.01) V.with2d((ctx) => { ctx.fillStyle = `rgba(255,252,240,${fl})`; ctx.fillRect(0, 0, V.W, V.H); });

      // subtitle
      const sp = V.prog(t, 3.0, 0.5);
      V.text('一部藝術史', V.W / 2, 850, 64, { font: SERIF, weight: 'bold', color: PAPER, align: 'center', alpha: V.E.out3(sp) * (1 - V.smooth(3.75, 4.0, u)), track: 0.3 });
      V.text('A BRIEF HISTORY OF ART × SIX SEVEN', V.W / 2, 905, 26, { font: 'Menlo', weight: 'bold', color: '#8d8676', align: 'center', alpha: V.E.out3(V.prog(t, 3.2, 0.5)), track: 0.16 });
      V.vignette({ amt: 0.7 });
      V.grain({ amt: 0.22 });
    },
  };
})();
