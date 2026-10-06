/* medieval.js — c.1250 Gothic Book of Hours page ("Venite" — Matins of the Hours of the Virgin).
 * Recto page close-up: a huge historiated initial V (ultramarine + vermilion on burnished gold, white filigree) whose counter holds a
 * haloed, tonsured monk doing the "67" in the orans pose; two columns of hand-ruled textura quadrata (procedural broad-nib minims,
 * rubrics, Lombard initials, line-fillers, show-through of the verso); bar-and-ivy border; drolleries in the margins: a hare balancing
 * a sword on its palms, an ape drumming the beat on a tabor, a goldfinch pecking on the beat, and the bas-de-page procession
 * dragon → knight → giant snail (eye-stalks) — all doing 67; gold-leaf numerals VI / VII flare on "six" / "seven".
 * Static page is baked once; figures, gold sheen, glints and the moving ivy leaves are drawn per frame.
 */
(function () {
  const P = {
    parch: '#efe0b4', ultra: '#1f3f8f', ultraD: '#142a63', ultraL: '#4f72c4', verm: '#c8321e', vermD: '#8e2214', rose: '#d0727a', roseD: '#9c3f4c',
    gold: '#d9ae3a', goldL: '#f4d77a', goldD: '#a77c22', green: '#3f7a5a', greenD: '#24513a', ink: '#1a1511', brown: '#2a1d14', white: '#fbf6e8',
  };
  // ------------------------------------------------------------------ layout (screen px)
  const MD = {
    edge: 1880, // fore-edge of the page
    base0: 326, pitch: 40, nLines: 13, xh: 16, // text baselines: base0 + i*pitch
    col: [[744, 1062], [1104, 1414]],
    panel: [70, 258, 684, 838], // initial V panel (x0,y0,x1,y1)
    barT: 259, barR: 1435, barB: 826, barW: 10,
  };
  MD.base = (i) => MD.base0 + i * MD.pitch;

  // ------------------------------------------------------------------ small helpers
  const mdPath = (ctx, pts, close = true) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    if (close) ctx.closePath();
  };
  const mdBez = (p0, p1, p2, p3, n = 24) => {
    const o = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return o;
  };

  // ================================================================== TEXTURA (broad-nib simulation, 2D)
  // glyph strokes in (pitch units, x-height units); y = 0 baseline, -1 = x-height, negative = up
  const mm = (c, top = -1, bot = 0) => [[c - 0.3, top], [c, top + 0.14], [c, bot - 0.14], [c + 0.3, bot]];
  const ARCH = (c) => [[c + 0.1, -0.8], [c + 0.55, -1.02], [c + 1, -0.86], [c + 1, -0.14], [c + 1.3, 0]];
  const BOWL_R = [[0.05, -0.86], [0.55, -1.04], [1, -0.86], [1, -0.14], [0.55, 0.04], [0.05, -0.14]];
  const BOWL_L = [[1, -0.86], [0.45, -1.04], [0, -0.86], [0, -0.14], [0.45, 0.04], [1, -0.14]];
  const ASC = [[-0.3, -1.62], [0, -1.48], [0, -0.14], [0.3, 0]];
  const GL = {
    i: { w: 1, s: [mm(0), [[0.02, -1.44], [0.26, -1.3]]] },
    j: { w: 1.2, s: [[[-0.3, -1], [0, -0.86], [0, 0.3], [-0.35, 0.6]], [[0.02, -1.44], [0.26, -1.3]]] },
    '⸗': { w: 1.0, s: [[[0, -0.66], [0.55, -0.76]], [[0, -0.4], [0.55, -0.5]]] },
    n: { w: 2, s: [mm(0), ARCH(0)] },
    m: { w: 3, s: [mm(0), ARCH(0), ARCH(1)] },
    u: { w: 2, s: [[[-0.3, -1], [0, -0.86], [0, -0.14], [0.3, 0], [0.9, -0.2]], mm(1)] },
    v: { w: 2, s: [[[-0.3, -1], [0, -0.86], [0, -0.14], [0.45, 0.03], [1, -0.3], [1, -0.86], [0.75, -1.04]]] },
    o: { w: 2, s: [[[0, -0.86], [0.45, -1.04], [1, -0.86], [1, -0.14], [0.55, 0.04], [0, -0.14], [0, -0.86]]] },
    e: { w: 1.9, s: [[[0.95, -0.6], [0.95, -0.86], [0.45, -1.04], [0, -0.86], [0, -0.14], [0.45, 0.04], [0.95, -0.16]], [[0.05, -0.5], [0.95, -0.66]]] },
    c: { w: 1.7, s: [[[0.92, -0.88], [0.45, -1.04], [0, -0.86], [0, -0.14], [0.45, 0.04], [0.95, -0.16]]] },
    a: { w: 2, s: [[[0.1, -0.88], [0.55, -1.04], [1, -0.86], [1, -0.14], [1.3, 0]], [[1, -0.58], [0.3, -0.52], [0, -0.36], [0, -0.14], [0.45, 0.04], [1, -0.2]]] },
    d: { w: 2, s: [BOWL_L, [[0.3, -1.6], [1, -1.08], [1, -0.14], [1.3, 0]]] },
    b: { w: 2, s: [ASC, BOWL_R] },
    h: { w: 2, s: [ASC, [[0.1, -0.8], [0.55, -1.02], [1, -0.86], [1, 0.25], [0.6, 0.5]]] },
    l: { w: 1, s: [ASC] },
    t: { w: 1.4, s: [[[0, -1.3], [0, -0.14], [0.3, 0], [0.85, -0.16]], [[-0.35, -0.96], [0.8, -1.0]]] },
    r: { w: 1.5, s: [mm(0), [[0.1, -0.8], [0.5, -1.04], [0.95, -0.9]]] },
    ſ: { w: 1.3, s: [[[0, 0], [0, -1.36], [0.35, -1.6], [0.95, -1.46]]] },
    s: { w: 1.6, s: [[[0.9, -0.9], [0.45, -1.04], [0, -0.86], [0, -0.62], [0.9, -0.4], [0.9, -0.14], [0.45, 0.04], [-0.05, -0.12]]] },
    f: { w: 1.4, s: [[[0, 0], [0, -1.36], [0.35, -1.6], [0.95, -1.46]], [[-0.35, -0.96], [0.8, -1.0]]] },
    p: { w: 2, s: [[[-0.3, -1], [0, -0.86], [0, 0.62]], BOWL_R] },
    q: { w: 2, s: [BOWL_L, [[0.8, -1.04], [1, -0.9], [1, 0.62]]] },
    g: { w: 2, s: [[[1, -0.86], [0.45, -1.04], [0, -0.86], [0, -0.32], [0.45, -0.14], [1, -0.32]], [[0.8, -1.04], [1, -0.9], [1, 0.3], [0.6, 0.56], [-0.05, 0.44]]] },
    x: { w: 1.7, s: [[[0, -1], [0.95, 0]], [[0.95, -1], [0, 0]]] },
    y: { w: 2, s: [[[-0.3, -1], [0, -0.86], [0, -0.14], [0.3, 0], [0.9, -0.2]], [[0.7, -1], [1, -0.86], [1, 0.36], [0.55, 0.62]]] },
    z: { w: 1.7, s: [[[0, -1], [0.95, -1], [0, 0], [0.95, 0]]] },
    k: { w: 1.8, s: [ASC, [[0.9, -0.95], [0.05, -0.5], [0.95, 0]]] },
    '⁊': { w: 1.4, s: [[[0, -1], [0.95, -1], [0.25, 0.55]]] },
    'ꝯ': { w: 1.4, s: [[[0.9, -0.9], [0.4, -1.04], [0, -0.7], [0.3, -0.4], [0.9, -0.2], [0.5, 0.4]]] },
    '.': { w: 0.9, s: [[[0, -0.52], [0.3, -0.38]]] },
    ':': { w: 0.9, s: [[[0, -0.82], [0.3, -0.68]], [[0, -0.22], [0.3, -0.08]]] },
    ' ': { w: 1.45, s: [] },
  };
  const NIB_A = (38 * Math.PI) / 180;
  function mdNib(ctx, pts, nib) {
    const nx = (Math.cos(NIB_A) * nib) / 2, ny = (-Math.sin(NIB_A) * nib) / 2;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      ctx.beginPath();
      ctx.moveTo(ax + nx, ay + ny); ctx.lineTo(bx + nx, by + ny); ctx.lineTo(bx - nx, by - ny); ctx.lineTo(ax - nx, ay - ny);
      ctx.closePath();
      ctx.fill();
    }
  }
  /** write textura on a 2D ctx at baseline y. returns end x. o: {p, h, nib, color, rng} */
  function mdWrite(ctx, str, x, y, o) {
    const p = o.p || 7.4, h = o.h || MD.xh, nib = o.nib || 4.7, r = o.rng;
    let cx = x, lastX = x;
    for (const ch of str) {
      if (ch === '¯') { // macron over previous glyph
        ctx.fillStyle = o.color;
        mdNib(ctx, [[lastX - 0.2 * p, y - 1.4 * h], [lastX + 1.3 * p, y - 1.46 * h]], nib * 0.55);
        continue;
      }
      const g = GL[ch] || GL[' '];
      ctx.fillStyle = o.color;
      ctx.globalAlpha = (o.alpha || 1) * (0.86 + 0.14 * r());
      const jx = (r() - 0.5) * 0.5, jy = (r() - 0.5) * 0.6;
      g.s.forEach((st) => mdNib(ctx, st.map(([u, v]) => [cx + u * p + jx, y + v * h + jy]), nib));
      lastX = cx;
      cx += g.w * p;
    }
    ctx.globalAlpha = 1;
    return cx;
  }
  const mdTW = (str, p = 7.4) => {
    let w = 0;
    for (const ch of str) if (ch !== '¯') w += (GL[ch] || GL[' ']).w * p;
    return w;
  };

  // the text: Psalm 94 "Venite" (opening of Matins) … then a rubric and Psalm 67 "Exurgat" (yes — the Vulgate's Psalm 67).
  // {L: Lombard initial letter, c: its colour, big: 2-line gold champ initial, rub: rubric line}
  const MD_COLS = [
    [
      { caps: 'ENITE EXVLTEMVS' },
      { t: 'domino iubilem9 deo ſalutari noſtro.' },
      { L: 'P', c: 0, t: 'reoccupem9 faciem ei9 in confeſſione: ⁊ in pſalmis iubilem9 ei.' },
      { L: 'Q', c: 1, t: 'uoniam de9 magn9 dn¯s ⁊ rex magn9 ſuper omnes deos: quoniam non repellet dn¯s plebem ſuam.' },
      { L: 'Q', c: 0, t: 'uia in manu ei9 ſunt omnes fines terre: ⁊ altitudines montium ipſe conſpicit.' },
      { L: 'Q', c: 1, t: 'uoniam ipſius eſt mare ⁊ ipſe fecit illud: ⁊ aridam fundauerunt man9 ei9 venite adorem9 ⁊ procidam9 ante deum ploremus coram dn¯o' },
    ],
    [
      { t: 'qui fecit nos quia ipſe eſt dn¯s de9 noſter: nos autem popul9 ei9 ⁊ oues paſcue ei9.' },
      { L: 'H', c: 0, t: 'odie ſi vocem ei9 audieritis: nolite obdurare corda veſtra.' },
      { rub: 'pſalm9 dauid .lxvij.' },
      { L: 'E', big: true, t: 'xurgat de9 ⁊ diſſipentur inimici ei9: ⁊ fugiant qui oderunt eum a facie ei9.' },
      { L: 'S', c: 1, t: 'icut deficit fum9 deficiant: ſicut fluit cera a facie ignis ſic pereant peccatores a facie dei.' },
      { L: 'E', c: 0, t: 't iuſti epulentur ⁊ exultent in conſpectu dei: ⁊ delectentur in leticia.' },
    ],
  ];
  const mdFix = (s) => s.replace(/9/g, 'ꝯ');
  const MD_LOMB = []; // filled by the text layout: Lombard initials {x,y,L,c,big}

  /** greedy line breaking with medieval word-splitting (⸗) and justification */
  function mdBreak(words, widths) {
    const p = 7.4, sp = 1.45 * p;
    const lines = [];
    let cur = [], w = 0, li = 0;
    const W = () => widths(li);
    const q = words.slice();
    while (q.length) {
      const wd = q[0], ww = mdTW(wd);
      const need = (cur.length ? sp : 0) + ww;
      if (w + need <= W()) { cur.push(wd); w += need; q.shift(); continue; }
      const rem = W() - w - (cur.length ? sp : 0) - mdTW('⸗');
      let cut = 0;
      for (let k = 2; k <= wd.length - 2; k++) if (mdTW(wd.slice(0, k)) <= rem && !/[¯]/.test(wd[k])) cut = k;
      if (cut >= 2 && rem > 3 * p) { cur.push(wd.slice(0, cut) + '⸗'); q[0] = wd.slice(cut); }
      if (!cur.length) { cur.push(wd); q.shift(); } // never stall
      lines.push({ words: cur, last: false });
      cur = []; w = 0; li++;
    }
    if (cur.length) lines.push({ words: cur, last: true });
    return lines;
  }

  function mdTextLayer() {
    return V.gfx('md_text', V.W, V.H, (ctx) => {
      const r = V.rng(67);
      const inkC = '#2b1e14', red = '#b8301c';
      MD_LOMB.length = 0;
      MD_COLS.forEach((paras, ci) => {
        const [x0, x1] = MD.col[ci];
        let li = 0;
        paras.forEach((pa) => {
          if (li >= MD.nLines) return;
          const y = MD.base(li);
          if (pa.caps) { // display capitals right after the giant initial, touched with yellow
            ctx.font = 'bold 27px Luminari';
            ctx.textBaseline = 'alphabetic';
            let cx = x0;
            for (const ch of pa.caps) {
              const w = ctx.measureText(ch).width;
              if (ch !== ' ') { ctx.fillStyle = 'rgba(222,178,48,0.42)'; ctx.fillRect(cx + 1, y - 19, w - 2, 18); }
              ctx.fillStyle = inkC;
              ctx.fillText(ch, cx, y + 3);
              cx += w + 1.6;
            }
            li++;
            return;
          }
          if (pa.rub) {
            const e = mdWrite(ctx, mdFix(pa.rub), x0, y, { color: red, rng: r });
            mdFiller(ctx, e + 10, x1, y, r, li);
            li++;
            return;
          }
          const ind = pa.L ? (pa.big ? 62 : 26) : 0;
          if (pa.L) MD_LOMB.push({ x: x0, y, L: pa.L, c: pa.c, big: !!pa.big, col: ci });
          const lines = mdBreak(mdFix(pa.t).split(' '), (k) => x1 - x0 - (k < (pa.big ? 2 : 1) ? ind : 0));
          lines.forEach((ln, k) => {
            if (li >= MD.nLines) return;
            const yy = MD.base(li);
            const xs = x0 + (k < (pa.big ? 2 : 1) ? ind : 0);
            const avail = x1 - xs;
            const ws = ln.words.map((s) => mdTW(s));
            const tot = ws.reduce((a, b) => a + b, 0);
            let gap = 1.45 * 7.4;
            if (!ln.last && ln.words.length > 1) gap = V.clamp((avail - tot) / (ln.words.length - 1), 6, 26);
            let cx = xs;
            ln.words.forEach((s, wi) => { cx = mdWrite(ctx, s, cx, yy, { color: inkC, rng: r }) + (wi < ln.words.length - 1 ? gap : 0); });
            if (ln.last && x1 - cx > 22) mdFiller(ctx, cx + 9, x1, yy, r, li);
            li++;
          });
        });
      });
    });
  }
  function mdFiller(ctx, x0, x1, y, r, k) {
    if (x1 - x0 < 18) return;
    const yT = y - MD.xh * 0.92, h = MD.xh * 0.86;
    ctx.globalAlpha = 1;
    const segs = Math.max(1, Math.round((x1 - x0) / 40));
    const sw = (x1 - x0) / segs;
    for (let s = 0; s < segs; s++) {
      ctx.fillStyle = (s + k) % 2 ? P.ultra : P.verm;
      ctx.fillRect(x0 + s * sw, yT + 2, sw - 2, h - 4);
      ctx.fillStyle = 'rgba(251,246,232,0.92)';
      ctx.beginPath();
      for (let d = x0 + s * sw + 5; d < x0 + (s + 1) * sw - 5; d += 6) { ctx.moveTo(d + 1.2, yT + h / 2); ctx.arc(d, yT + h / 2, 1.2, 0, 6.283); }
      ctx.fill();
      ctx.fillStyle = 'rgba(232,190,70,0.95)'; // tiny gold knot between segments
      if (s) ctx.fillRect(x0 + s * sw - 3, yT, 4, h);
    }
    ctx.strokeStyle = 'rgba(26,21,17,0.75)'; ctx.lineWidth = 1;
    ctx.strokeRect(x0, yT + 2, x1 - x0 - 2, h - 4);
  }

  // ================================================================== PARCHMENT
  function mdParchment() {
    return V.gfx('md_parch', V.W, V.H, (ctx) => {
      // low-frequency mottling at half res, scaled up
      const lw = 480, lh = 270;
      const low = document.createElement('canvas');
      low.width = lw; low.height = lh;
      const lc = low.getContext('2d');
      const img = lc.createImageData(lw, lh);
      const B = V.rgb(P.parch), D = V.rgb('#d9c48c'), Lc = V.rgb('#f6ebc6');
      for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
        const n = 0.5 * V.noise2(x / 70, y / 70) + 0.3 * V.noise2(x / 22 + 9, y / 22 + 3) + 0.2 * V.noise2(x / 7 + 31, y / 7 + 17);
        const k = (n - 0.5) * 2; // -1..1
        const c = k < 0 ? D : Lc, a = Math.min(1, Math.abs(k) * 0.9);
        const i = (y * lw + x) * 4;
        img.data[i] = B[0] + (c[0] - B[0]) * a; img.data[i + 1] = B[1] + (c[1] - B[1]) * a; img.data[i + 2] = B[2] + (c[2] - B[2]) * a; img.data[i + 3] = 255;
      }
      lc.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(low, 0, 0, V.W, V.H);
      const r = V.rng(1250);
      // hair follicles (hair side of calfskin): tiny dark triads
      for (let k = 0; k < 2600; k++) {
        const x = r() * V.W, y = r() * V.H;
        ctx.fillStyle = `rgba(120,88,48,${0.12 + r() * 0.2})`;
        for (let j = 0; j < 3; j++) {
          const s = 0.7 + r() * 1.1;
          ctx.beginPath(); ctx.arc(x + (r() - 0.5) * 5, y + (r() - 0.5) * 5, s, 0, 6.283); ctx.fill();
        }
      }
      // fibres / veins
      ctx.lineCap = 'round';
      for (let k = 0; k < 140; k++) {
        let x = r() * V.W, y = r() * V.H, a = r() * 6.28;
        ctx.strokeStyle = `rgba(${r() < 0.5 ? '150,120,70' : '255,250,230'},${0.05 + r() * 0.07})`;
        ctx.lineWidth = 0.6 + r() * 1.6;
        ctx.beginPath(); ctx.moveTo(x, y);
        const n = 8 + r() * 30;
        for (let j = 0; j < n; j++) { a += (r() - 0.5) * 0.5; x += Math.cos(a) * 9; y += Math.sin(a) * 9; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      // speckles / tiny ink spots
      for (let k = 0; k < 500; k++) {
        ctx.fillStyle = `rgba(70,50,30,${0.1 + r() * 0.35})`;
        ctx.beginPath(); ctx.arc(r() * V.W, r() * V.H, 0.4 + r() * 1.2, 0, 6.283); ctx.fill();
      }
      // gutter shadow (page curving into the binding, left) + soft top/bottom darkening
      let g = ctx.createLinearGradient(0, 0, 120, 0);
      g.addColorStop(0, 'rgba(70,45,20,0.62)'); g.addColorStop(0.35, 'rgba(110,80,40,0.22)'); g.addColorStop(1, 'rgba(110,80,40,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 120, V.H);
      g = ctx.createLinearGradient(0, 0, 0, V.H);
      g.addColorStop(0, 'rgba(120,85,40,0.16)'); g.addColorStop(0.12, 'rgba(120,85,40,0)'); g.addColorStop(0.9, 'rgba(120,85,40,0)'); g.addColorStop(1, 'rgba(120,85,40,0.2)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, V.W, V.H);
      // smoked / yellowed fore-edge
      g = ctx.createLinearGradient(MD.edge - 150, 0, MD.edge, 0);
      g.addColorStop(0, 'rgba(160,110,40,0)'); g.addColorStop(0.7, 'rgba(160,110,40,0.16)'); g.addColorStop(1, 'rgba(120,75,25,0.5)');
      ctx.fillStyle = g; ctx.fillRect(MD.edge - 150, 0, 150, V.H);
      // beyond the fore-edge: lower leaves of the book block, then the dark desk
      ctx.fillStyle = '#20150d'; ctx.fillRect(MD.edge, 0, V.W - MD.edge, V.H);
      for (let k = 0; k < 5; k++) {
        const ex = MD.edge + 4 + k * 5.5;
        const pts = [];
        for (let y = -10; y <= V.H + 10; y += 30) pts.push([ex + Math.sin(y * 0.013 + k) * 1.5 + (r() - 0.5) * 1.2, y]);
        ctx.strokeStyle = V.mix('#e2cf9a', '#6b5434', k / 5);
        ctx.lineWidth = 3.2 - k * 0.35;
        mdPath(ctx, pts, false); ctx.stroke();
      }
      g = ctx.createLinearGradient(MD.edge, 0, MD.edge + 26, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(MD.edge, 0, 26, V.H);
      // the deckled page edge itself (irregular, darker rim)
      ctx.fillStyle = P.parch;
      const edgePts = [[MD.edge - 30, -5]];
      for (let y = -5; y <= V.H + 5; y += 12) edgePts.push([MD.edge + (V.noise1(y * 0.05) - 0.5) * 4 + Math.sin(y * 0.004) * 2, y]);
      edgePts.push([MD.edge - 30, V.H + 5]);
      ctx.strokeStyle = 'rgba(95,60,25,0.85)'; ctx.lineWidth = 2.2;
      mdPath(ctx, edgePts.slice(1, -1), false); ctx.stroke();
      // worm holes
      [[1720, 118], [1530, 1006], [212, 1012], [1606, 214], [606, 214]].forEach(([x, y], i) => {
        const s = 3 + (i % 3) * 1.3;
        ctx.fillStyle = 'rgba(150,100,45,0.5)';
        ctx.beginPath(); ctx.ellipse(x, y, s + 2.6, s + 2.0, i, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#1c120a';
        ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.8, i, 0, 6.283); ctx.fill();
      });
    });
  }

  // ================================================================== GEOMETRY of letters & ornament
  /** Gothic (Lombardic) V in box: thick swelling left stroke, slimmer right stroke, wedge serifs. */
  function mdVGeom(x0, y0, x1, y1) {
    const W = x1 - x0, H = y1 - y0;
    const X = (f) => x0 + f * W, Y = (f) => y0 + f * H;
    const top = Y(0.075);
    const lo = mdBez([X(0.04), top], [X(-0.03), Y(0.36)], [X(0.27), Y(0.76)], [X(0.497), y1], 34);
    const li = mdBez([X(0.27), top], [X(0.26), Y(0.3)], [X(0.41), Y(0.62)], [X(0.5), Y(0.83)], 34);
    const ro = mdBez([X(0.97), top], [X(0.96), Y(0.34)], [X(0.71), Y(0.72)], [X(0.503), y1], 34);
    const ri = mdBez([X(0.83), top], [X(0.825), Y(0.3)], [X(0.6), Y(0.62)], [X(0.5), Y(0.83)], 34);
    const left = lo.concat(li.slice().reverse());
    const right = ro.concat(ri.slice().reverse());
    const counter = li.concat(ri.slice(0, -1).reverse());
    const cap = (a, b, dip) => { // wedge serif from x=a to x=b, concave underside, tips flicking down
      const yT = Y(0.035), yB = top + 1, sg = Math.sign(b - a);
      const o = [[a, yT + 4], [V.lerp(a, b, 0.5), yT], [b, yT + 4], [b + 14 * sg, yT + 7], [b + 3 * sg, yT + 13], [b - 2 * sg, yB]];
      mdBez([b - 2 * sg, yB], [V.lerp(a, b, 0.7), yB - dip], [V.lerp(a, b, 0.3), yB - dip], [a + 2 * sg, yB], 10).forEach((p) => o.push(p));
      o.push([a - 3 * sg, yT + 13], [a - 14 * sg, yT + 7]);
      return o;
    };
    const serL = cap(X(0.025), X(0.32), 6);
    const serR = cap(X(0.79), X(0.972), 6);
    const mid = (A, Bc) => A.map((p, i) => [(p[0] + Bc[i][0]) / 2, (p[1] + Bc[i][1]) / 2]);
    return { left, right, counter, lo, li, ro, ri, serL, serR, X, Y, top, midL: mid(lo, li), midR: mid(ro, ri) };
  }
  /** Lombardic I: waisted shaft with a knop in the middle and spreading feet. */
  function mdIGeom(cx, y0, y1, w) {
    const H = y1 - y0;
    const prof = [[0, 0.5], [0.07, 0.5], [0.1, 0.36], [0.17, 0.25], [0.3, 0.2], [0.44, 0.22], [0.47, 0.34], [0.5, 0.38], [0.53, 0.34], [0.56, 0.22], [0.7, 0.2], [0.83, 0.25], [0.9, 0.36], [0.93, 0.5], [1, 0.5]];
    const R = prof.map(([f, hw]) => [cx + hw * w, y0 + f * H]);
    const Lf = prof.slice().reverse().map(([f, hw]) => [cx - hw * w, y0 + f * H]);
    return R.concat(Lf);
  }
  const mdSpiral = (cx, cy, r0, r1, a0, turns, n = 60) => {
    const o = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n, a = a0 + s * turns * Math.PI * 2, r = V.lerp(r0, r1, s);
      o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return o;
  };
  /** foliate leaf (acanthus-like, scalloped, curling tip). base at (x,y), pointing along ang. */
  function mdLeaf(x, y, ang, len, wid, curl = 0.6, lobes = 3) {
    const n = 18, L = [], R = [];
    let px = 0, py = 0, a = 0;
    const spine = [[0, 0]];
    for (let i = 1; i <= n; i++) { a += (curl / n) * (i / n) * 2.2; px += Math.cos(a) * (len / n); py += Math.sin(a) * (len / n); spine.push([px, py]); }
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const w = wid * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.08)), 0.8) * (1 + 0.28 * Math.max(0, Math.sin(s * Math.PI * lobes * 2)));
      const [sx, sy] = spine[i], [tx, ty] = spine[Math.min(n, i + 1)], [ux, uy] = spine[Math.max(0, i - 1)];
      let nx = -(ty - uy), ny = tx - ux; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      L.push([sx + nx * w * 0.5, sy + ny * w * 0.5]); R.push([sx - nx * w * 0.5 * 0.75, sy - ny * w * 0.5 * 0.75]);
    }
    const co = Math.cos(ang), si = Math.sin(ang);
    const tr = (p) => [x + p[0] * co - p[1] * si, y + p[0] * si + p[1] * co];
    return { poly: L.concat(R.reverse()).map(tr), spine: spine.map(tr) };
  }
  /** three-lobed ivy leaf, base at (x,y) pointing along ang, size s */
  function mdIvy(x, y, ang, s) {
    // three pointed lobes (centre longest) with sharp sinuses — the Gothic ivy leaf
    const pol = [[Math.PI, 0.26], [-2.55, 0.32], [-2.0, 0.4], [-1.6, 0.5], [-1.32, 0.54], [-1.02, 0.36], [-0.7, 0.3], [-0.36, 0.5], [-0.12, 0.8], [0, 0.94], [0.12, 0.8], [0.36, 0.5], [0.7, 0.3], [1.02, 0.36], [1.32, 0.54], [1.6, 0.5], [2.0, 0.4], [2.55, 0.32]];
    const raw = pol.map(([a, r]) => [0.3 + Math.cos(a) * r, Math.sin(a) * r * 1.05]);
    const co = Math.cos(ang), si = Math.sin(ang);
    return V.smoothPts(raw.map(([u, v]) => [x + (u * co - v * si) * s, y + (u * si + v * co) * s]), true, 3);
  }

  // ================================================================== GOLD LEAF (2D)
  function mdGold(ctx, pts, o = {}) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    ctx.save();
    mdPath(ctx, pts); ctx.clip();
    const g = ctx.createLinearGradient(x0, y0, x1 + (y1 - y0) * 0.3, y1);
    g.addColorStop(0, '#a87a24'); g.addColorStop(0.28, '#d4a537'); g.addColorStop(0.5, '#ebc865'); g.addColorStop(0.72, '#c99a32'); g.addColorStop(1, '#9c7020');
    ctx.fillStyle = g; ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    const r = V.rng(o.seed || 5);
    const area = (x1 - x0) * (y1 - y0);
    for (let k = 0; k < Math.min(500, area / 260); k++) { // burnish mottling
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), s = 3 + r() * 16;
      ctx.fillStyle = r() < 0.5 ? `rgba(255,240,185,${0.05 + r() * 0.12})` : `rgba(110,72,18,${0.05 + r() * 0.12})`;
      ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.55, r() * 3, 0, 6.283); ctx.fill();
    }
    for (let k = 0; k < area / 900; k++) { // rubbed spots: red bole shows through
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
      ctx.fillStyle = `rgba(150,60,30,${0.18 + r() * 0.25})`;
      ctx.beginPath(); ctx.ellipse(x, y, 0.8 + r() * 2.2, 0.6 + r() * 1.4, r() * 3, 0, 6.283); ctx.fill();
    }
    if (o.punch) { // punched decoration: rosettes on a diagonal grid, ring-punches between
      const sp = o.punch;
      for (let yy = y0 - sp; yy < y1 + sp; yy += sp) for (let xx = x0 - sp; xx < x1 + sp; xx += sp) {
        const odd = Math.round((yy - y0) / sp) % 2;
        const px = xx + (odd ? sp / 2 : 0), py = yy;
        const ring = (cx, cy, rr) => {
          ctx.strokeStyle = 'rgba(95,60,12,0.55)'; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.283); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,246,200,0.55)'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(cx + 0.6, cy + 0.7, rr, 0.2, 2.2); ctx.stroke();
        };
        if ((Math.round((xx - x0) / sp) + Math.round((yy - y0) / sp)) % 2 === 0) {
          for (let k = 0; k < 6; k++) ring(px + Math.cos((k * Math.PI) / 3) * 5.2, py + Math.sin((k * Math.PI) / 3) * 5.2, 1.6);
          ring(px, py, 2.0);
        } else ring(px, py, 2.4);
      }
    }
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(95,58,10,0.32)'; // gesso relief: darker rim inside the edge
    mdPath(ctx, pts); ctx.stroke();
    ctx.restore();
  }

  // ================================================================== ILLUMINATION (baked)
  const MD_V = mdVGeom(84, 282, 670, 814); // the great initial
  const MD_NUM = (() => { // VI and VII panels in the top margin
    const y0 = 96, y1 = 238;
    const A = [826, y0, 1040, y1], B = [1118, y0, 1386, y1];
    const mk = (box, nI) => {
      const [x0, , x1] = box;
      const vw = 104, iw = 40, gap = 10;
      const total = vw + nI * (iw + gap);
      const sx = (x0 + x1) / 2 - total / 2;
      const v = mdVGeom(sx, y0 + 14, sx + vw, y1 - 14);
      const is = [];
      for (let k = 0; k < nI; k++) is.push(mdIGeom(sx + vw + gap + iw / 2 + k * (iw + gap), y0 + 18, y1 - 16, iw));
      return { box, v, is };
    };
    return [mk(A, 1), mk(B, 2)];
  })();

  function mdPaintBody(poly, base, dark, seed) {
    V.fill(poly, { color: base, flat: true, seed });
    V.fill(poly, { color: dark, alpha: 0.32, flat: false, bleed: 0.02, tex: 0.7, border: 0.5, seed: seed + 1 });
    V.with2d((ctx) => {
      ctx.save(); mdPath(ctx, poly); ctx.clip();
      ctx.filter = 'blur(4px)'; ctx.lineWidth = 10; ctx.strokeStyle = V.withAlpha(dark, 0.42);
      mdPath(ctx, poly); ctx.stroke();
      ctx.restore();
    });
  }
  /** white-lead filigree: hairline along the spine with pearl dots + tiny trefoils */
  function mdFiligree(spine, seed, o = {}) {
    V.ink(spine, { color: P.white, w: o.w || 0.3, seed, wob: 0.4, taper: [8, 8] });
    const pts = V.resample(spine, o.step || 26);
    V.with2d((ctx) => {
      ctx.fillStyle = 'rgba(251,246,232,0.95)';
      pts.forEach((p, i) => {
        if (i === 0 || i === pts.length - 1) return;
        const q = pts[i + 1], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l, ny = dx / l, side = i % 2 ? 1 : -1, d = o.off || 7;
        const cx = p[0] + nx * d * side, cy = p[1] + ny * d * side;
        [[0, 0], [nx * 3 * side, ny * 3 * side], [dx / l * 2.6, dy / l * 2.6]].forEach(([ox, oy], k) => { ctx.beginPath(); ctx.arc(cx + ox, cy + oy, k ? 1.2 : 1.6, 0, 6.283); ctx.fill(); });
      });
    });
  }
  function mdOutline(poly, seed, w = 0.5) {
    V.ink(poly, { color: P.ink, w, seed, wob: 0.5, closed: true, taper: [0, 0] });
  }

  /** the great historiated initial V (everything static; the monk is drawn live on top) */
  function mdInitial() {
    const [px0, py0, px1, py1] = MD.panel;
    const fr = 11; // coloured frame band
    // gold ground with punchwork
    V.with2d((ctx) => mdGold(ctx, V.rectPts(px0 + fr, py0 + fr, px1 - px0 - 2 * fr, py1 - py0 - 2 * fr), { punch: 26, seed: 31 }));
    // counter: vermilion-rose diaper (lozenges, white lattice, gold & white dots)
    V.with2d((ctx) => {
      const c = MD_V.counter;
      ctx.save(); mdPath(ctx, c); ctx.clip();
      ctx.fillStyle = '#b23a2e'; ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
      const s = 30;
      for (let y = py0 - s; y < py1 + s; y += s / 2) for (let x = px0 - s; x < px1 + s; x += s) {
        const odd = Math.round((y - py0) / (s / 2)) % 2, cx = x + (odd ? s / 2 : 0);
        ctx.fillStyle = odd ? '#c4493a' : '#a8322a';
        ctx.beginPath(); ctx.moveTo(cx, y - s / 2); ctx.lineTo(cx + s / 2, y); ctx.lineTo(cx, y + s / 2); ctx.lineTo(cx - s / 2, y); ctx.closePath(); ctx.fill();
        if (odd) { ctx.fillStyle = '#e4bf55'; ctx.beginPath(); ctx.arc(cx, y, 2.6, 0, 6.283); ctx.fill(); }
        else { ctx.fillStyle = 'rgba(251,246,232,0.85)'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(cx + Math.cos(k * 2.094 - 1.57) * 2.6, y + Math.sin(k * 2.094 - 1.57) * 2.6, 1.3, 0, 6.283); ctx.fill(); } }
      }
      ctx.strokeStyle = 'rgba(70,14,10,0.55)'; ctx.lineWidth = 1.6;
      for (let k = -40; k < 40; k++) {
        ctx.beginPath(); ctx.moveTo(px0 + k * s, py0); ctx.lineTo(px0 + k * s + (py1 - py0), py1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px0 + k * s, py0); ctx.lineTo(px0 + k * s - (py1 - py0), py1); ctx.stroke();
      }
      // soft inner shadow under the letter strokes
      ctx.filter = 'blur(8px)'; ctx.lineWidth = 22; ctx.strokeStyle = 'rgba(40,6,4,0.45)'; mdPath(ctx, c); ctx.stroke();
      ctx.restore();
    });
    // foliage scrolls in the gold spandrels (drawn before the letter so stems tuck under it)
    mdScrolls();
    // letter strokes: ultramarine left, vermilion right, serifs; white filigree; black contour
    mdVine(0, 'back'); mdVine(1, 'back');
    mdPaintBody(MD_V.left, P.ultra, P.ultraD, 41);
    mdPaintBody(MD_V.right, P.verm, P.vermD, 43);
    mdPaintBody(MD_V.serL, P.verm, P.vermD, 45);
    mdPaintBody(MD_V.serR, P.ultra, P.ultraD, 47);
    const inset = (A, M, d) => A.map((p, i) => { const m = M[i], l = Math.hypot(m[0] - p[0], m[1] - p[1]) || 1; return [p[0] + ((m[0] - p[0]) / l) * Math.min(d, l * 0.6), p[1] + ((m[1] - p[1]) / l) * Math.min(d, l * 0.6)]; });
    [[MD_V.lo, MD_V.midL], [MD_V.li, MD_V.midL], [MD_V.ro, MD_V.midR], [MD_V.ri, MD_V.midR]].forEach(([A, M], i) => {
      const pts = inset(A, M, 7).slice(1, -6);
      V.ink(pts, { color: P.white, w: 0.16, seed: 55 + i, wob: 0.2, taper: [10, 10], alpha: 0.9 });
      V.with2d((ctx) => { // pearls + little trefoils strung along the tracery
        ctx.fillStyle = 'rgba(251,246,232,0.9)';
        V.resample(inset(A, M, 13).slice(2, -7), 13).forEach((p, k) => { ctx.beginPath(); ctx.arc(p[0], p[1], k % 3 === 0 ? 1.7 : 1.0, 0, 6.283); ctx.fill(); });
      });
    });
    mdFiligree(MD_V.midL.slice(1, -3), 51, { off: 22, step: 30 });
    mdFiligree(MD_V.midR.slice(1, -3), 52, { off: 12, step: 30 });
    [MD_V.left, MD_V.right, MD_V.serL, MD_V.serR].forEach((p, i) => mdCraquelure(p, 70 + i));
    [MD_V.left, MD_V.right, MD_V.serL, MD_V.serR].forEach((p, i) => mdOutline(p, 60 + i, 0.55));
    mdVine(0, 'front'); mdVine(1, 'front');
    mdOutline(MD_V.counter, 64, 0.45);
    // frame band: segmented ultramarine / vermilion with white pearls, gold corner knots
    mdFrameBand(px0, py0, px1, py1, fr);
  }
  function mdFrameBand(x0, y0, x1, y1, fr) {
    mdBar(x0, y0, x1, y0 + fr, 'h', 1); mdBar(x0, y1 - fr, x1, y1, 'h', 2);
    mdBar(x0, y0, x0 + fr, y1, 'v', 3); mdBar(x1 - fr, y0, x1, y1, 'v', 4);
    V.with2d((ctx) => [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].forEach(([x, y], k) => mdGold(ctx, mdQuatrefoil(x + (x === x0 ? fr / 2 : -fr / 2), y + (y === y0 ? fr / 2 : -fr / 2), 17), { seed: 70 + k })));
    [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].forEach(([x, y], k) => mdOutline(mdQuatrefoil(x + (x === x0 ? fr / 2 : -fr / 2), y + (y === y0 ? fr / 2 : -fr / 2), 17), 80 + k, 0.4));
  }
  const mdQuatrefoil = (cx, cy, r) => {
    const o = [];
    for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; const rr = r * (0.62 + 0.38 * Math.abs(Math.cos(2 * a))); o.push([cx + Math.cos(a + Math.PI / 4) * rr, cy + Math.sin(a + Math.PI / 4) * rr]); }
    return o;
  };
  /** a bar of the border: counterchanged ultramarine / rose halves, white-lead zigzag + pearls, gold knots */
  function mdBar(x0, y0, x1, y1, dir, seed) {
    const len = dir === 'h' ? x1 - x0 : y1 - y0, n = Math.max(1, Math.round(len / 78)), sl = len / n;
    const th = dir === 'h' ? y1 - y0 : x1 - x0, ROSE = '#c25d6b';
    for (let k = 0; k < n; k++) {
      const a = k * sl, sw = (k + seed) % 2;
      const h1 = dir === 'h' ? V.rectPts(x0 + a, y0, sl, th / 2) : V.rectPts(x0, y0 + a, th / 2, sl);
      const h2 = dir === 'h' ? V.rectPts(x0 + a, y0 + th / 2, sl, th / 2) : V.rectPts(x0 + th / 2, y0 + a, th / 2, sl);
      V.fill(h1, { color: sw ? P.ultra : ROSE, flat: true, seed: seed * 10 + k });
      V.fill(h2, { color: sw ? ROSE : P.ultra, flat: true, seed: seed * 10 + k + 5 });
    }
    V.with2d((ctx) => {
      ctx.strokeStyle = 'rgba(251,246,232,0.92)'; ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let s = 0; s <= len; s += 3) {
        const o = (Math.abs(((s / 7) % 2) - 1) - 0.5) * th * 0.55;
        const x = dir === 'h' ? x0 + s : (x0 + x1) / 2 + o, y = dir === 'h' ? (y0 + y1) / 2 + o : y0 + s;
        s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(251,246,232,0.9)';
      for (let s = 7; s < len - 3; s += 14) {
        const x = dir === 'h' ? x0 + s : (x0 + x1) / 2, y = dir === 'h' ? (y0 + y1) / 2 : y0 + s;
        ctx.beginPath(); ctx.arc(x, y, 0.9, 0, 6.283); ctx.fill();
      }
      for (let k = 1; k < n; k++) {
        const a = k * sl, c = dir === 'h' ? [x0 + a, (y0 + y1) / 2] : [(x0 + x1) / 2, y0 + a];
        mdGold(ctx, mdQuatrefoil(c[0], c[1], th * 0.85), { seed: seed * 7 + k });
      }
    });
    V.ink(V.rectPts(x0, y0, x1 - x0, y1 - y0), { color: P.ink, w: 0.36, closed: true, seed: 90 + seed, wob: 0.3, taper: [0, 0] });
    for (let k = 1; k < n; k++) {
      const a = k * sl, c = dir === 'h' ? [x0 + a, (y0 + y1) / 2] : [(x0 + x1) / 2, y0 + a];
      V.ink(mdQuatrefoil(c[0], c[1], th * 0.85), { color: P.ink, w: 0.26, closed: true, seed: 95 + seed * 13 + k, taper: [0, 0] });
    }
  }

  /** foliage spirals filling the two gold spandrels below the arms of the V */
  function mdScrolls() {
    const S = [
      { c: [176, 712], r: [10, 80], a0: -0.55, turns: 1.15, col: P.verm, k: 17, side: 1 },
      { c: [584, 716], r: [10, 78], a0: Math.PI + 0.55, turns: -1.15, col: P.ultra, k: 17, side: -1 },
    ];
    S.forEach((s, i) => {
      const sp = mdSpiral(s.c[0], s.c[1], s.r[1], s.r[0], s.a0, s.turns, 60); // outer -> inner
      const A = i ? MD_V.ro : MD_V.lo, B = i ? MD_V.ri : MD_V.li;
      const from = A[s.k], nIn = [B[s.k][0] - from[0], B[s.k][1] - from[1]], nl = Math.hypot(nIn[0], nIn[1]);
      const out = [-nIn[0] / nl, -nIn[1] / nl];
      const t0 = [sp[1][0] - sp[0][0], sp[1][1] - sp[0][1]], tl = Math.hypot(t0[0], t0[1]);
      const stemIn = mdBez([from[0] - out[0] * 8, from[1] - out[1] * 8], [from[0] + out[0] * 60, from[1] + out[1] * 60 + 20], [sp[0][0] - (t0[0] / tl) * 50, sp[0][1] - (t0[1] / tl) * 50], sp[0], 16);
      const stem = stemIn.concat(sp.slice(1));
      V.ink(stem, { brush: 'gouache', w: 0.78, color: P.ink, seed: 118 + i, wob: 0.3, taper: [2, 30] });
      V.ink(stem, { brush: 'gouache', w: 0.6, color: s.col, seed: 120 + i, wob: 0.3, taper: [2, 30] });
      V.ink(stem.slice(4, -12), { color: P.white, w: 0.16, seed: 124 + i, wob: 0.2, taper: [10, 10] });
      // leaves sprouting off the spiral, curling with it
      const pts = V.resample(sp, 30);
      pts.forEach((p, k) => {
        if (k >= pts.length - 2) return;
        const q = pts[k + 1], ta = Math.atan2(q[1] - p[1], q[0] - p[0]);
        const outward = Math.atan2(p[1] - s.c[1], p[0] - s.c[0]);
        const big = k % 2 === 0, sc = V.lerp(1, 0.55, k / pts.length);
        const ang = k % 3 === 2 ? outward : V.lerp(ta, outward, 0.55);
        const lf = mdLeaf(p[0], p[1], ang, (big ? 60 : 42) * sc, (big ? 30 : 22) * sc, s.side * 1.3, 3);
        const lc = [P.green, P.rose, P.ultra, P.verm, P.green, '#e0a640'][(k + i * 2) % 6];
        V.fill(lf.poly, { color: lc, flat: true, seed: 140 + i * 30 + k });
        V.fill(lf.poly, { color: '#1a1008', alpha: 0.22, flat: false, bleed: 0.01, tex: 0.6, border: 0.7, seed: 160 + i * 30 + k });
        V.ink(lf.spine.slice(2, -4), { color: P.white, w: 0.22, seed: 180 + k, taper: [4, 8], wob: 0.2 });
        V.ink(lf.poly, { color: P.ink, w: 0.34, closed: true, seed: 200 + i * 30 + k, wob: 0.3, taper: [0, 0] });
      });
      V.with2d((ctx) => mdGold(ctx, V.ellipsePts(s.c[0], s.c[1], 11, 11, 24), { seed: 220 + i }));
      V.ink(V.ellipsePts(s.c[0], s.c[1], 11, 11, 24), { color: P.ink, w: 0.35, closed: true, seed: 230 + i, taper: [0, 0] });
    });
  }
  /** a contrasting vine twined around each arm of the V. layer 'back' is painted before the letter, 'front' after. */
  function mdVine(j, layer) {
    const A = j ? MD_V.ro : MD_V.lo, B = j ? MD_V.ri : MD_V.li;
    const k0 = 1.5, k1 = A.length - 9, turns = j ? 2.6 : 3.1;
    const P2 = [];
    for (let k = k0; k <= k1; k += 0.2) {
      const i = Math.floor(k), f = k - i;
      const a = [V.lerp(A[i][0], A[i + 1][0], f), V.lerp(A[i][1], A[i + 1][1], f)], b = [V.lerp(B[i][0], B[i + 1][0], f), V.lerp(B[i][1], B[i + 1][1], f)];
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], hw = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2, d = [(b[0] - a[0]) / (2 * hw), (b[1] - a[1]) / (2 * hw)];
      const s = (k - k0) / (k1 - k0), ph = s * turns * Math.PI * 2 + (j ? 1.2 : 0.3);
      const off = Math.sin(ph) * (hw + 9);
      P2.push({ p: [m[0] + d[0] * off, m[1] + d[1] * off], front: Math.cos(ph) > 0, ph, d, out: -Math.sign(Math.sin(ph)) });
    }
    const col = j ? '#2f5bb8' : '#d24a22';
    const runs = [];
    let cur = null;
    P2.forEach((q) => {
      if (!cur || cur.front !== q.front) { if (cur) cur.pts.push(q.p); cur = { front: q.front, pts: [] }; runs.push(cur); }
      cur.pts.push(q.p);
    });
    runs.forEach((r, k) => {
      if ((layer === 'front') !== r.front || r.pts.length < 2) return;
      V.ink(r.pts, { brush: 'gouache', w: 0.62, color: P.ink, seed: 600 + k + j * 40, wob: 0.2, taper: r.front ? [0, 0] : [0, 0] });
      V.ink(r.pts, { brush: 'gouache', w: 0.46, color: col, seed: 620 + k + j * 40, wob: 0.2, taper: [0, 0] });
      V.ink(r.pts, { color: P.white, w: 0.13, seed: 640 + k + j * 40, wob: 0.15, taper: [6, 6] });
    });
    if (layer === 'front') { // little trefoil leaves where the vine swings out over the gold
      P2.forEach((q, k) => {
        if (k % 1 || Math.abs(Math.sin(q.ph)) < 0.995) return;
        if (q.out !== (j ? -1 : 1) * -1) return;
        const ang = Math.atan2(-q.d[1] * Math.sign(Math.sin(q.ph)), -q.d[0] * Math.sign(Math.sin(q.ph)));
        const lf = mdIvy(q.p[0], q.p[1], ang, 22);
        V.fill(lf, { color: j ? P.ultra : P.verm, flat: true, seed: 660 + k });
        V.ink(lf, { color: P.ink, w: 0.3, closed: true, seed: 680 + k, taper: [0, 0] });
      });
    }
  }
  /** craquelure + tiny paint losses on an old tempera field (2D) */
  function mdCraquelure(poly, seed, o = {}) {
    V.with2d((ctx) => {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      poly.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      const r = V.rng(seed);
      ctx.save(); mdPath(ctx, poly); ctx.clip();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const n = ((x1 - x0) * (y1 - y0)) / (o.density || 700);
      for (let k = 0; k < n; k++) {
        let x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), a = r() * 6.283;
        ctx.strokeStyle = `rgba(20,12,8,${0.22 + r() * 0.22})`; ctx.lineWidth = 0.5 + r() * 0.6;
        ctx.beginPath(); ctx.moveTo(x, y);
        const m = 3 + r() * 5;
        for (let j = 0; j < m; j++) { a += (r() - 0.5) * 1.6; x += Math.cos(a) * (4 + r() * 6); y += Math.sin(a) * (4 + r() * 6); ctx.lineTo(x, y); }
        ctx.stroke();
      }
      for (let k = 0; k < n * 0.06; k++) { // flakes where the pigment has lifted
        const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
        ctx.fillStyle = `rgba(232,214,168,${0.6 + r() * 0.3})`;
        ctx.beginPath(); ctx.ellipse(x, y, 1 + r() * 2.6, 0.8 + r() * 1.8, r() * 3, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    });
  }

  /** Lombard initials (1-line, alternate blue/red with contrasting penwork; 2-line gold champ 'E') */
  function mdLombards() {
    MD_LOMB.forEach((L, i) => {
      if (L.big) {
        const x = L.x - 4, y = L.y - MD.xh - 5, s = 62;
        V.fill(V.rectPts(x, y, s / 2, s), { color: P.ultra, flat: true, seed: 300 + i });
        V.fill(V.rectPts(x + s / 2, y, s / 2, s), { color: P.verm, flat: true, seed: 301 + i });
        V.with2d((ctx) => {
          ctx.fillStyle = 'rgba(251,246,232,0.9)';
          for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(x + 5 + (k % 3) * 25, y + 6 + Math.floor(k / 3) * 24, 1.4, 0, 6.283); ctx.fill(); }
          ctx.save();
          ctx.font = 'bold 58px Luminari';
          ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.strokeText(L.L, x + s / 2, y + s - 9);
          const g = ctx.createLinearGradient(x, y, x + s, y + s);
          g.addColorStop(0, '#b8892a'); g.addColorStop(0.5, '#f1d273'); g.addColorStop(1, '#a87b22');
          ctx.fillStyle = g; ctx.fillText(L.L, x + s / 2, y + s - 9);
          ctx.restore();
        });
        V.ink(V.rectPts(x, y, s, s), { color: P.ink, w: 0.4, closed: true, seed: 310 + i, taper: [0, 0] });
        return;
      }
      const col = L.c ? P.verm : '#2a4ea6', pen = L.c ? '#2a4ea6' : P.verm;
      const x = L.x - 8, y = L.y + 4;
      // penwork flourish: hairline running down the column edge with curls
      const fx = L.x - 14;
      V.ink(V.smoothPts([[fx + 2, y - 54], [fx - 4, y - 30], [fx + 2, y - 8], [fx - 3, y + 24], [fx + 1, y + 52]], false, 8), { color: pen, w: 0.22, seed: 330 + i, taper: [10, 10], wob: 0.4 });
      V.ink(mdSpiral(fx - 8, y - 40, 2, 9, 0, 1.3, 20), { color: pen, w: 0.2, seed: 340 + i, taper: [4, 6] });
      V.ink(mdSpiral(fx - 8, y + 38, 2, 9, 3, -1.3, 20), { color: pen, w: 0.2, seed: 350 + i, taper: [4, 6] });
      V.text(L.L, x, y, 38, { font: 'Luminari', weight: 'bold', color: col });
      V.with2d((ctx) => { ctx.fillStyle = pen; [[-6, -14], [-6, -4], [30, -20]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + dx + 6, y + dy, 1.6, 0, 6.283); ctx.fill(); }); });
    });
  }

  /** VI / VII numeral panels (static part; the glow is live) */
  function mdNumerals() {
    MD_NUM.forEach((N, i) => {
      const [x0, y0, x1, y1] = N.box;
      const gcol = i ? P.verm : P.ultra, dk = i ? P.vermD : P.ultraD;
      V.fill(V.rectPts(x0, y0, x1 - x0, y1 - y0), { color: gcol, flat: true, seed: 400 + i });
      V.fill(V.rectPts(x0, y0, x1 - x0, y1 - y0), { color: dk, alpha: 0.3, flat: false, bleed: 0.01, tex: 0.6, border: 0.6, seed: 402 + i });
      // white filigree tendrils on the coloured ground
      for (let k = 0; k < 6; k++) {
        const cx = x0 + 18 + (k % 3) * ((x1 - x0 - 36) / 2), cy = k < 3 ? y0 + 20 : y1 - 20;
        V.ink(mdSpiral(cx, cy, 2, 11, k, k % 2 ? 1.3 : -1.3, 24), { color: P.white, w: 0.2, seed: 410 + k + i * 10, taper: [4, 6], wob: 0.2 });
      }
      V.with2d((ctx) => {
        ctx.fillStyle = 'rgba(251,246,232,0.9)';
        for (let x = x0 + 9; x < x1 - 6; x += 9) { ctx.beginPath(); ctx.arc(x, y0 + 7, 1.2, 0, 6.283); ctx.arc(x + 4, y1 - 7, 1.2, 0, 6.283); ctx.fill(); }
        mdGold(ctx, N.v.left.concat([]), { seed: 420 + i });
        mdGold(ctx, N.v.right, { seed: 421 + i });
        mdGold(ctx, N.v.serL, { seed: 422 + i });
        mdGold(ctx, N.v.serR, { seed: 423 + i });
        N.is.forEach((I, k) => mdGold(ctx, I, { seed: 424 + i * 3 + k }));
      });
      [N.v.left, N.v.right, N.v.serL, N.v.serR].concat(N.is).forEach((p, k) => mdOutline(p, 440 + i * 10 + k, 0.42));
      mdFrameBand(x0 - 9, y0 - 9, x1 + 9, y1 + 9, 9);
    });
  }

  // ================================================================== IVY SPRAYS (stems baked, leaves live)
  const MD_SPRAY_DEF = [
    { pts: [[684, 258], [674, 214], [636, 178], [578, 160], [534, 178], [532, 214], [560, 222]], n: 8, seed: 1, curl: 1 },
    { pts: [[1440, 264], [1468, 214], [1530, 182], [1612, 170], [1690, 150], [1760, 112], [1812, 124], [1812, 160], [1784, 160]], n: 13, seed: 2, curl: -1 },
    { pts: [[1530, 182], [1500, 140], [1500, 96], [1532, 76], [1556, 96], [1540, 112]], n: 4, seed: 3, curl: 1 },
    { pts: [[1446, 400], [1494, 398], [1532, 372], [1548, 330], [1530, 304], [1510, 318]], n: 5, seed: 4, curl: 1 },
    { pts: [[1446, 606], [1520, 612], [1600, 606], [1700, 602], [1780, 606], [1828, 632], [1826, 668], [1798, 666]], n: 7, seed: 5, curl: 1, thick: P.green, under: true },
    { pts: [[1446, 786], [1532, 792], [1612, 782], [1690, 776], [1762, 782], [1806, 806], [1806, 834], [1782, 832]], n: 6, seed: 6, curl: 1, thick: P.ultra, under: true },
    { pts: [[70, 838], [56, 892], [58, 950], [80, 994], [112, 1004], [122, 980], [104, 968]], n: 6, seed: 7, curl: -1 },
    { pts: [[684, 838], [692, 868], [718, 882], [742, 872], [736, 854]], n: 3, seed: 8, curl: 1 },
    { pts: [[1300, 838], [1310, 880], [1346, 906], [1398, 906], [1418, 882], [1398, 868]], n: 4, seed: 9, curl: -1 },
  ];
  let MD_SPRAYS = null;
  function mdSprays() {
    if (MD_SPRAYS) return MD_SPRAYS;
    MD_SPRAYS = MD_SPRAY_DEF.map((d) => {
      const stem = V.smoothPts(d.pts, false, 8);
      const rs = V.resample(stem, 6);
      const r = V.rng(700 + d.seed);
      const leaves = [], bez = [], curls = [];
      const L = rs.length;
      for (let k = 1; k <= d.n; k++) {
        const i = Math.floor(((k - 0.3) / (d.n + 0.4)) * (L - 4)) + 2;
        const p = rs[i], q = rs[Math.min(L - 1, i + 1)];
        const ta = Math.atan2(q[1] - p[1], q[0] - p[0]), side = (k % 2 ? 1 : -1) * (d.under && k % 3 === 0 ? -1 : 1);
        const na = ta + side * (Math.PI / 2 - 0.5);
        const stalkL = 9 + r() * 7;
        const b = [p[0] + Math.cos(na) * stalkL, p[1] + Math.sin(na) * stalkL];
        const kind = r();
        if (kind < 0.18) {
          bez.push({ stalk: [p, b], c: [b[0] + Math.cos(na) * 6, b[1] + Math.sin(na) * 6] });
        } else {
          const col = kind < 0.6 ? 'gold' : [P.ultra, P.verm, P.green][Math.floor(r() * 3)];
          leaves.push({ stalk: [p, b], x: b[0], y: b[1], a: na + (r() - 0.5) * 0.5, s: 30 + r() * 9, col, ph: r() * 6.28 });
        }
        if (r() < 0.4) { // hairline tendril curl
          const ca = ta - side * 1.1, cc = [p[0] + Math.cos(ca) * 18, p[1] + Math.sin(ca) * 18];
          curls.push(V.smoothPts([p, [V.lerp(p[0], cc[0], 0.6) + Math.cos(ta) * 6, V.lerp(p[1], cc[1], 0.6) + Math.sin(ta) * 6], cc], false, 5).concat(mdSpiral(cc[0] + Math.cos(ca) * 7, cc[1] + Math.sin(ca) * 7, 7, 1.5, ca + Math.PI, side * 1.15, 18).slice(1)));
        }
      }
      const e = stem[stem.length - 1];
      return { d, stem, leaves, bez, curls, end: e };
    });
    return MD_SPRAYS;
  }
  function mdSprayStems() {
    mdSprays().forEach((S, i) => {
      if (S.d.thick) {
        V.ink(S.stem, { brush: 'gouache', w: 0.85, color: P.ink, seed: 760 + i, wob: 0.4, taper: [0, 26] });
        V.ink(S.stem, { brush: 'gouache', w: 0.66, color: S.d.thick, seed: 762 + i, wob: 0.4, taper: [0, 26] });
        V.ink(S.stem, { color: P.white, w: 0.16, seed: 764 + i, wob: 0.3, taper: [20, 40], alpha: 0.85 });
      } else {
        V.ink(S.stem, { color: P.ink, w: 0.34, seed: 760 + i, wob: 0.5, taper: [2, 24] });
      }
      S.leaves.forEach((l, k) => V.ink(l.stalk, { color: P.ink, w: 0.24, seed: 780 + i * 20 + k, taper: [0, 3] }));
      S.curls.forEach((c, k) => V.ink(c, { color: P.ink, w: 0.2, seed: 800 + i * 20 + k, taper: [0, 6] }));
      S.bez.forEach((b, k) => {
        V.ink(b.stalk, { color: P.ink, w: 0.22, seed: 820 + i * 20 + k, taper: [0, 2] });
        const ba = Math.atan2(b.c[1] - b.stalk[0][1], b.c[0] - b.stalk[0][0]);
        [-0.7, 0, 0.7].forEach((da, q) => V.ink([[b.c[0] + Math.cos(ba + da) * 7, b.c[1] + Math.sin(ba + da) * 7], [b.c[0] + Math.cos(ba + da) * 15, b.c[1] + Math.sin(ba + da) * 15]], { color: P.ink, w: 0.16, seed: 830 + q + k * 3 + i * 40, taper: [0, 4] }));
      });
    });
    V.with2d((ctx) => mdSprays().forEach((S) => S.bez.forEach((b) => mdGold(ctx, V.ellipsePts(b.c[0], b.c[1], 5.5, 5.5, 14), { seed: 840 }))));
    mdSprays().forEach((S, i) => S.bez.forEach((b, k) => V.ink(V.ellipsePts(b.c[0], b.c[1], 5.5, 5.5, 14), { color: P.ink, w: 0.24, closed: true, seed: 850 + i * 9 + k, taper: [0, 0] })));
  }
  /** the ivy leaves (live: they stir a little and flutter on the beat) */
  function mdSprayLeaves(t, sheenAt) {
    const all = [];
    mdSprays().forEach((S) => S.leaves.forEach((l) => all.push(l)));
    const pu = V.G.pulse(t, 5);
    const poly = all.map((l) => mdIvy(l.x, l.y, l.a + 0.09 * Math.sin(t * 1.9 + l.ph) + 0.07 * pu * Math.sin(l.ph * 3), l.s));
    V.with2d((ctx) => {
      all.forEach((l, k) => {
        if (l.col !== 'gold') return;
        mdGold(ctx, poly[k], { seed: 860 + k, mask: false });
        const sh = sheenAt(l.x, l.y);
        if (sh > 0.01) { ctx.fillStyle = `rgba(255,232,160,${0.4 * sh})`; mdPath(ctx, poly[k]); ctx.fill(); }
      });
    });
    all.forEach((l, k) => { if (l.col !== 'gold') V.fill(poly[k], { color: l.col, flat: true, seed: 870 + k }); });
    all.forEach((l, k) => {
      V.ink(poly[k], { color: P.ink, w: 0.3, closed: true, seed: 880 + k, wob: 0.2, taper: [0, 0] });
      V.ink([[l.x + Math.cos(l.a) * l.s * 0.12, l.y + Math.sin(l.a) * l.s * 0.12], [l.x + Math.cos(l.a) * l.s * 0.78, l.y + Math.sin(l.a) * l.s * 0.78]], { color: l.col === 'gold' ? '#7a5414' : P.white, w: 0.13, seed: 890 + k, taper: [2, 5], alpha: l.col === 'gold' ? 0.6 : 0.9 });
    });
  }
  /** the green turf strip the knight and the snail stand on */
  function mdTurf() {
    const pts = [];
    for (let x = 150; x <= 1250; x += 22) pts.push([x, 1043 + Math.sin(x * 0.03) * 2.5]);
    for (let x = 1250; x >= 150; x -= 22) pts.push([x, 1056 + Math.sin(x * 0.05 + 1) * 2]);
    V.fill(pts, { color: '#4f8a5e', flat: true, seed: 900 });
    V.with2d((ctx) => { ctx.save(); mdPath(ctx, pts); ctx.clip(); const g = ctx.createLinearGradient(0, 1040, 0, 1060); g.addColorStop(0, 'rgba(120,170,110,0.5)'); g.addColorStop(1, 'rgba(20,60,35,0.55)'); ctx.fillStyle = g; ctx.fillRect(130, 1030, 1150, 40); ctx.restore(); });
    V.ink(pts, { color: P.ink, w: 0.3, closed: true, seed: 902, taper: [0, 0] });
    const r = V.rng(903);
    for (let k = 0; k < 57; k++) {
      const x = 162 + k * 19 + r() * 8, y = 1044;
      [-0.5, 0, 0.5].forEach((a, q) => V.ink([[x + q * 3, y], [x + q * 3 + Math.sin(a) * 9, y - 9 - r() * 6]], { color: q === 1 ? '#24513a' : '#3f7a5a', w: 0.2, seed: 904 + k * 3 + q, taper: [1, 4] }));
      if (k % 6 === 3) { V.dot(x + 4, y - 14, 3.2, k % 12 === 3 ? P.verm : P.white, { seed: 1050 + k }); V.dot(x + 4, y - 14, 1.2, '#e8c050', { seed: 1100 + k }); }
    }
  }

  // ================================================================== LIVE GOLD: sheen, numeral flare, glints
  let MD_MASK = null, MD_GOLDPTS = null;
  /** derive the gold mask from the baked page itself (pixels that ARE burnished gold), once */
  function mdBuildMask() {
    const x0 = 60, y0 = 60, w = 1400, h = 800;
    const img = get(x0, y0, w, h);
    img.loadPixels();
    const cv = document.createElement('canvas');
    cv.width = V.W; cv.height = V.H;
    const c = cv.getContext('2d');
    const id = c.createImageData(w, h), px = img.pixels, D = id.data;
    const r = V.rng(4242), pts = [];
    for (let i = 0; i < w * h; i++) {
      const R = px[i * 4], G = px[i * 4 + 1], B = px[i * 4 + 2];
      const gold = R > 140 && G > 92 && B < 118 && R - B > 72 && G - B > 38 && R >= G && G > R * 0.58;
      if (gold) {
        D[i * 4] = 255; D[i * 4 + 1] = 255; D[i * 4 + 2] = 255; D[i * 4 + 3] = 255;
        if (r() < 0.004) pts.push([x0 + (i % w), y0 + Math.floor(i / w)]);
      }
    }
    c.putImageData(id, x0, y0);
    MD_MASK = cv; MD_GOLDPTS = pts;
  }
  const MD_SWEEP = { per: 2.0, dir: [0.8, 0.6] };
  /** 0..1 sheen strength at a screen point (diagonal band sweeping once per bar) */
  function mdSheenAt(t) {
    const ph = V.fract((t - 30) / MD_SWEEP.per + 0.82);
    const along = V.lerp(-200, 2100, V.E.io2(V.clamp(ph / 0.8)));
    return (x, y) => {
      const s = x * MD_SWEEP.dir[0] + y * MD_SWEEP.dir[1];
      const d = (s - along) / 170;
      return Math.exp(-d * d);
    };
  }
  function mdSheen(t) {
    if (!MD_MASK) return;
    const ph = V.fract((t - 30) / MD_SWEEP.per + 0.82);
    const along = V.lerp(-200, 2100, V.E.io2(V.clamp(ph / 0.8)));
    V.with2d((ctx) => {
      ctx.drawImage(MD_MASK, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      const [dx, dy] = MD_SWEEP.dir;
      const g = ctx.createLinearGradient(dx * (along - 330), dy * (along - 330), dx * (along + 330), dy * (along + 330));
      g.addColorStop(0, 'rgba(255,214,120,0)'); g.addColorStop(0.4, 'rgba(255,214,120,0.38)'); g.addColorStop(0.5, 'rgba(255,240,190,0.8)'); g.addColorStop(0.6, 'rgba(255,214,120,0.38)'); g.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, V.W, V.H);
      // a gentle overall burnish lift so gold always reads as metal
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,220,130,0.08)'; ctx.fillRect(0, 0, V.W, V.H);
    }, { blend: 'add', alpha: 0.5 });
  }
  /** 4-point star glint */
  function mdStar(ctx, x, y, s, a = 1) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.9);
    g.addColorStop(0, 'rgba(255,255,240,0.95)'); g.addColorStop(0.3, 'rgba(255,230,150,0.45)'); g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 0.9, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,253,235,0.95)';
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s); ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s);
    ctx.fill();
    ctx.restore();
  }
  /** VI / VII take turns flaring with "six" / "seven"; gold dust sparkles on every beat */
  function mdNumeralFlare(t) {
    const say = V.G.say(t), act = say.n === 6 ? 0 : 1;
    const env = say.env, pre = Math.exp(-6 * Math.max(0, 1 - say.k)) * 0.35; // tiny anticipation before the next number
    V.with2d((ctx) => {
      MD_NUM.forEach((N, i) => {
        const on = i === act ? env : i !== act ? pre : 0;
        const [x0, y0, x1, y1] = N.box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        if (on > 0.02) {
          const b = ctx.createRadialGradient(cx, cy, 20, cx, cy, 220);
          b.addColorStop(0, `rgba(255,196,90,${0.3 * on})`); b.addColorStop(0.55, `rgba(255,170,60,${0.1 * on})`); b.addColorStop(1, 'rgba(255,170,60,0)');
          ctx.fillStyle = b; ctx.fillRect(cx - 230, cy - 230, 460, 460);
          const gg = ctx.createLinearGradient(x0, y0, x1, y1);
          gg.addColorStop(0, `rgba(255,170,40,${0.75 * on})`); gg.addColorStop(0.5, `rgba(255,236,150,${0.9 * on})`); gg.addColorStop(1, `rgba(255,170,40,${0.75 * on})`);
          ctx.fillStyle = gg;
          [N.v.left, N.v.right, N.v.serL, N.v.serR].concat(N.is).forEach((p) => { mdPath(ctx, p); ctx.fill(); });
        }
      });
    }, { blend: 'screen' });
    V.with2d((ctx) => { // white-hot core of the flare on the letters being "said"
      const N = MD_NUM[act];
      if (env < 0.03) return;
      ctx.filter = 'blur(3px)';
      ctx.fillStyle = `rgba(255,250,225,${0.38 * env})`;
      [N.v.left, N.v.right, N.v.serL, N.v.serR].concat(N.is).forEach((p) => { mdPath(ctx, p); ctx.fill(); });
      ctx.filter = 'blur(14px)';
      ctx.fillStyle = `rgba(255,200,90,${0.35 * env})`;
      [N.v.left, N.v.right].concat(N.is).forEach((p) => { mdPath(ctx, p); ctx.fill(); });
    }, { blend: 'add' });
    if (env > 0.08) { const N = MD_NUM[act]; [N.v.left, N.v.right, N.v.serL, N.v.serR].concat(N.is).forEach((p, k) => V.ink(p, { color: P.ink, w: 0.36, closed: true, seed: 470 + k, wob: 0.2, taper: [0, 0], alpha: Math.min(1, env * 1.4) })); }
    // gold-dust sparkles: around the active numeral, plus random glints on the gilding
    V.with2d((ctx) => {
      const N = MD_NUM[act], [x0, y0, x1, y1] = N.box;
      const r = V.rng(5000 + say.idx * 13);
      for (let k = 0; k < 14; k++) {
        const born = r() * 0.25, life = 0.35 + r() * 0.4, q = (say.k * 0.5 - born) / life;
        if (q < 0 || q > 1) { r(); r(); r(); continue; }
        const x = V.lerp(x0 - 20, x1 + 20, r()), y0p = V.lerp(y0 - 10, y1 + 10, r()), s = 7 + r() * 12;
        mdStar(ctx, x, y0p - q * 26, s * Math.sin(Math.PI * q), 1);
      }
      if (MD_GOLDPTS && MD_GOLDPTS.length) {
        const pu = V.G.pulse(t, 4.5);
        const rr = V.rng(7000 + say.idx * 31);
        for (let k = 0; k < 11; k++) {
          const p = MD_GOLDPTS[Math.floor(rr() * MD_GOLDPTS.length)], s = 6 + rr() * 10, dl = rr() * 0.3;
          const e = Math.max(0, Math.exp(-4.5 * Math.max(0, say.k - dl)) * (say.k >= dl ? 1 : 0));
          if (e > 0.03) mdStar(ctx, p[0], p[1], s * e, Math.min(1, e * 1.4));
        }
        void pu;
      }
    }, { blend: 'add' });
  }

  // ================================================================== BAKE (static page)
  function mdBakePage() {
    V.blit(mdParchment(), 0, 0, V.W, V.H);
    // water stains / grime (real p5.brush watercolour)
    V.fill(V.smoothPts([[1500, 30], [1700, 10], [1860, 60], [1870, 240], [1760, 300], [1640, 210], [1520, 160]], true, 6), { color: '#b08850', alpha: 0.16, flat: false, bleed: 0.25, tex: 0.6, border: 0.7, seed: 11 });
    V.fill(V.smoothPts([[1250, 900], [1500, 860], [1880, 880], [1880, 1080], [1300, 1080], [1180, 1010]], true, 6), { color: '#a07a44', alpha: 0.14, flat: false, bleed: 0.3, tex: 0.6, border: 0.8, seed: 12 });
    V.fill(V.smoothPts([[40, 960], [220, 900], [330, 990], [260, 1080], [40, 1080]], true, 6), { color: '#a88250', alpha: 0.12, flat: false, bleed: 0.3, tex: 0.5, border: 0.6, seed: 13 });
    // show-through: the verso's text, mirrored and faint, ghosting through the skin into the margins
    V.with2d((ctx) => {
      const g = mdTextLayer(), cv = g.elt || g.canvas;
      ctx.globalAlpha = 0.055;
      ctx.filter = 'blur(0.8px)';
      ctx.translate(2874, 14); ctx.scale(-1, 1);
      ctx.drawImage(cv, 0, 0);
    });
    // hand ruling in faint brown ink (lead/drypoint)
    for (let i = 0; i < MD.nLines + 1; i++) {
      const y = MD.base(i) - MD.xh - 1;
      V.ink([[MD.panel[0] - 30, y], [MD.edge - 20, y + 0.5]], { brush: '2H', w: 0.6, color: '#9a6a3c', alpha: 0.55, seed: 300 + i, wob: 0.3, taper: [0, 0] });
    }
    [MD.col[0][0] - 4, MD.col[0][1] + 4, MD.col[1][0] - 4, MD.col[1][1] + 4, MD.panel[0] - 4].forEach((x, i) =>
      V.ink([[x, 0], [x + 0.6, V.H]], { brush: '2H', w: 0.6, color: '#9a6a3c', alpha: 0.5, seed: 340 + i, wob: 0.3, taper: [0, 0] }));
    // prickings in the outer margin
    V.with2d((ctx) => {
      ctx.fillStyle = 'rgba(60,35,15,0.7)';
      for (let i = 0; i < MD.nLines + 1; i++) {
        const y = MD.base(i) - MD.xh - 1;
        ctx.beginPath(); ctx.ellipse(MD.edge - 22, y, 1.3, 2.4, 0.3, 0, 6.283); ctx.fill();
      }
    });
    V.blit(mdTextLayer(), 0, 0, V.W, V.H);
    // a scribe's ink blot and a few spatters (real watercolour bleed)
    V.fill(V.smoothPts([[1214, 871], [1232, 862], [1250, 872], [1246, 891], [1226, 896], [1210, 886]], true, 5), { color: '#5a4026', alpha: 0.28, flat: false, bleed: 0.15, tex: 0.4, border: 0.9, seed: 15 });
    V.fill(V.smoothPts([[1219, 874], [1232, 867], [1244, 875], [1241, 887], [1227, 890], [1217, 883]], true, 5), { color: '#24170e', alpha: 0.88, flat: true, seed: 14 });
    [[1258, 862, 3], [1206, 900, 2.2], [1262, 897, 1.6], [1190, 868, 1.4]].forEach(([x, y, r], i) => V.dot(x, y, r, '#2b1e14', { alpha: 0.7, seed: 16 + i }));
    V.fill(V.smoothPts([[542, 1006], [552, 1001], [560, 1009], [551, 1016]], true, 4), { color: '#2b1e14', alpha: 0.35, flat: false, bleed: 0.2, tex: 0.4, border: 0.9, seed: 21 });
    mdLombards();
    // border bars framing the text block from the initial
    const bw = MD.barW;
    mdBar(MD.panel[2], MD.barT, MD.barR + bw, MD.barT + bw, 'h', 5);
    mdBar(MD.barR, MD.barT, MD.barR + bw, MD.panel[3], 'v', 6);
    mdBar(MD.panel[2], MD.panel[3] - bw, MD.barR + bw, MD.panel[3], 'h', 7);
    V.with2d((ctx) => [[MD.barR + bw / 2, MD.barT + bw / 2], [MD.barR + bw / 2, MD.panel[3] - bw / 2]].forEach(([x, y], k) => mdGold(ctx, mdQuatrefoil(x, y, 19), { seed: 500 + k })));
    [[MD.barR + bw / 2, MD.barT + bw / 2], [MD.barR + bw / 2, MD.panel[3] - bw / 2]].forEach(([x, y], k) => mdOutline(mdQuatrefoil(x, y, 19), 510 + k, 0.4));
    mdInitial();
    mdNumerals();
    mdSprayStems();
    mdTurf();
  }

  // ================================================================== FIGURES (live, every frame)
  const FL = { base: '#ecd3ae', olive: '#c3b385', cheek: '#d9786a', line: '#3a2014' };
  function mdFI(poly, color, seed, o = {}) { // flat tempera field + black contour
    V.fill(poly, { color, flat: true, seed });
    if (o.shade) V.fill(poly, { color: o.shade, alpha: o.shadeA || 0.3, flat: false, bleed: 0.01, tex: 0.6, border: 0.7, seed: seed + 1 });
    if (o.ink !== false) V.ink(poly, { color: o.inkC || P.ink, w: o.w || 0.42, closed: true, seed: seed + 2, wob: 0.35, taper: [0, 0] });
  }
  const mdLine = (pts, color, w, seed, o = {}) => V.ink(pts, Object.assign({ color, w, seed, wob: 0.3, taper: [5, 7] }, o));
  /** 67 arm: shoulder S, upper-arm reach to elbow (ex,ey offsets), forearm length l2; side 0 = screen-left. */
  function mdArm(t, side, Sx, Sy, o) {
    const a = V.G.arm(t, side);
    const dir = side ? 1 : -1;
    const th = ((o.rest + o.amp * a.y) * Math.PI) / 180;
    const ex = Sx + dir * o.ex, ey = Sy + o.ey - a.y * (o.elbowLift || 4);
    const hx = ex + dir * Math.cos(th) * o.l2, hy = ey - Math.sin(th) * o.l2;
    return { ex, ey, hx, hy, th, dir, y: a.y };
  }
  /** palm-up hand at wrist (x,y), pointing outward (dir), fingertips curling up; size s. */
  function mdHand(x, y, dir, ang, s, seed, col = FL.base) {
    V.push(); V.translate(x, y); V.scale(dir * s, s); V.rotate(-ang * dir);
    const palm = V.smoothPts([[-2, -4], [10, -6], [20, -6.5], [29, -6], [34, -8.5], [35.5, -5], [32, 0.5], [22, 3.5], [10, 4.5], [-2, 4]], true, 4);
    const thumb = V.smoothPts([[6, -5], [10, -13], [15, -17.5], [18, -15], [15, -9], [14, -5.5]], true, 4);
    mdFI(thumb, col, seed, { w: 0.32 * s });
    mdFI(palm, col, seed + 3, { w: 0.34 * s });
    mdLine([[20, -3], [31, -4.6]], FL.line, 0.18, seed + 6, { taper: [3, 3] });
    mdLine([[17, -0.6], [30, -1.6]], FL.line, 0.18, seed + 7, { taper: [3, 3] });
    mdLine([[9, -1], [16, 1.6]], FL.cheek, 0.22, seed + 8, { taper: [3, 3], alpha: 0.6 });
    V.pop();
  }

  // ---------------------------------------------------------------- the monk in the counter of the V
  const edgeX = (pts, y) => {
    for (let i = 0; i < pts.length - 1; i++) if ((pts[i][1] - y) * (pts[i + 1][1] - y) <= 0) { const f = (y - pts[i][1]) / (pts[i + 1][1] - pts[i][1] || 1); return V.lerp(pts[i][0], pts[i + 1][0], f); }
    return pts[pts.length - 1][0];
  };
  /** a wide medieval sleeve on a 67 forearm (local frame: elbow origin, +x toward wrist, +y below the arm) + palm-up hand */
  function mdSleeveArm(A, len, k, cols, seed) {
    const { BL, BD, BH, LIN, LIND } = cols;
    const d = A.dir;
    V.push(); V.translate(A.ex, A.ey); V.scale(d * k, k); V.rotate(-A.th * d * d);
    // NB: after scale(d) the x axis points outward; rotate(-th) lifts the forearm
    const under = [V.tp(len * 0.3, 11), V.tp(len - 6, 17)];
    const tube = [[-6, -12], [len * 0.5, -13], [len - 4, -16], [len, -14], [len + 1, 15], [len - 6, 18], [len * 0.4, 13], [-6, 13]];
    V.pop();
    // hanging part of the bell sleeve (always hangs DOWN in screen space), lined with rose
    const dn = 46 * k;
    const tip = [V.lerp(under[0][0], under[1][0], 0.55) - d * 4 * k, Math.max(under[0][1], under[1][1]) + dn];
    const flap = V.smoothPts([under[0], [V.lerp(under[0][0], under[1][0], 0.5), V.lerp(under[0][1], under[1][1], 0.5)], under[1], [under[1][0] - d * 3 * k, under[1][1] + 18 * k], tip, [under[0][0] + d * 6 * k, under[0][1] + 20 * k]], true, 5);
    mdFI(flap, LIN, seed, { shade: LIND, shadeA: 0.35 });
    const flapOut = V.smoothPts([under[0], [under[0][0] + d * 2 * k, under[0][1] + 22 * k], tip, [under[1][0] - d * 8 * k, under[1][1] + 14 * k], under[1]], true, 5);
    mdFI(flapOut, BL, seed + 3, { shade: BD, shadeA: 0.3 });
    mdLine([[V.lerp(under[0][0], tip[0], 0.3), V.lerp(under[0][1], tip[1], 0.3)], [V.lerp(under[0][0], tip[0], 0.85), V.lerp(under[0][1], tip[1], 0.85)]], BD, 0.4, seed + 6);
    V.push(); V.translate(A.ex, A.ey); V.scale(d * k, k); V.rotate(-A.th);
    mdFI(tube, BL, seed + 8, { shade: BD, shadeA: 0.22 });
    mdLine([[4, -5], [len - 10, -7]], BH, 0.22, seed + 11, { alpha: 0.85 });
    mdLine([[8, 4], [len - 12, 6]], BD, 0.3, seed + 12);
    mdFI(V.ellipsePts(len - 1, 0.5, 4.5, 14.5, 20), LIN, seed + 14, { w: 0.3 }); // rose lining at the opening
    V.pop();
  }
  function mdMonk(t) {
    const k = 1.32, cx = 404, bob = V.G.pulse(t) * 3.2, tilt = V.G.tilt(t, 0.07);
    const H0 = [cx, 396 + bob * 0.6]; // head centre (screen)
    const L = (x, y) => [H0[0] + x * k, H0[1] + y * k];
    const BL = '#4069b8', BD = '#1d3a7a', BH = '#d3def5';
    const cols = { BL, BD, BH, LIN: '#d6747c', LIND: '#9c3f4c' };
    // halo (burnished gold, red ring, punched rim) — live because the head bobs
    const hc = L(0, -6), hr = 58 * k;
    V.with2d((ctx) => {
      mdGold(ctx, V.ellipsePts(hc[0], hc[1], hr, hr, 64), { seed: 900, mask: false });
      ctx.strokeStyle = '#b8301c'; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.arc(hc[0], hc[1], hr - 6, 0, 6.283); ctx.stroke();
      for (let q = 0; q < 44; q++) {
        const a = (q / 44) * 6.283;
        ctx.strokeStyle = 'rgba(95,60,12,0.6)'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(hc[0] + Math.cos(a) * (hr - 13), hc[1] + Math.sin(a) * (hr - 13), 2, 0, 6.283); ctx.stroke();
      }
    });
    V.ink(V.ellipsePts(hc[0], hc[1], hr, hr, 64), { color: P.ink, w: 0.45, closed: true, seed: 901, taper: [0, 0] });
    // robe (screen space, tapering into the point of the V, never crossing the counter's edges)
    const sy = L(0, 62)[1];
    const Ls = [], Rs = [];
    for (let y = sy + 16; y <= 718; y += 12) {
      const f = (y - sy) / (718 - sy);
      Ls.push([Math.max(edgeX(MD_V.li, y) + 3, V.lerp(cx - 84, 378, Math.pow(f, 1.1)) - 8 * Math.sin(f * 3.1)), y]);
      Rs.push([Math.min(edgeX(MD_V.ri, y) - 3, V.lerp(cx + 84, 384, Math.pow(f, 1.1)) + 8 * Math.sin(f * 3.1)), y]);
    }
    const robe = [L(-24, 50), L(-64, 64)].concat(Ls, Rs.slice().reverse(), [L(64, 64), L(24, 50)]);
    mdFI(robe, BL, 910, { shade: BD, shadeA: 0.28 });
    const wy = L(0, 168)[1];
    [[-40, -20], [-16, -7], [12, 6], [38, 18]].forEach(([dx, dx2], q) => {
      const p0 = L(dx * 0.75, 172), p1 = [cx + dx2 * 0.9, 650], p2 = [V.lerp(378, 384, 0.5) + dx2 * 0.35, 712];
      mdLine(V.smoothPts([p0, p1, p2], false, 6), BD, 0.66, 920 + q, { taper: [6, 18] });
      mdLine(V.smoothPts([[p0[0] + 7, p0[1] + 6], [p1[0] + 7, p1[1]], [p2[0] + 4, p2[1] - 12]], false, 6), BH, 0.22, 930 + q, { taper: [6, 14], alpha: 0.8 });
    });
    [[-46, 96, 18], [-38, 118, 22], [-30, 140, 18]].forEach(([w, y, dip], q) => { // looping catenary folds across the chest
      mdLine(V.smoothPts([L(w, y - 6), L(w * 0.45, y + dip * 0.8), L(0, y + dip), L(-w * 0.45, y + dip * 0.8), L(-w, y - 6)], false, 6), BD, 0.5, 940 + q, { taper: [8, 8] });
      mdLine(V.smoothPts([L(w * 0.8, y - 6), L(0, y + dip - 6), L(-w * 0.8, y - 6)], false, 6), BH, 0.17, 944 + q, { taper: [8, 8], alpha: 0.75 });
    });
    [[-52, -42], [50, 42]].forEach(([a0, a1], q) => mdLine(V.smoothPts([L(a0, 92), L(a1 * 1.05, 128), L(a1 * 0.95, 160)], false, 5), BD, 0.4, 948 + q, { taper: [6, 10] }));
    // girdle with hanging knotted cord
    const g0 = L(-56, 166), g1 = L(0, 172), g2 = L(54, 166);
    mdLine(V.smoothPts([g0, g1, g2], false, 6), '#efe6cf', 0.55, 950, { taper: [2, 2] });
    mdLine(V.smoothPts([g0, g1, g2], false, 6), P.ink, 0.15, 951, { taper: [2, 2] });
    mdLine(V.smoothPts([L(12, 171), L(16, 200), L(10, 232)], false, 6), '#efe6cf', 0.45, 952, { taper: [2, 6] });
    [200, 220].forEach((yy, q) => V.dot(L(15 - q * 2, yy)[0], L(15, yy)[1], 3.2, '#efe6cf', { seed: 953 + q }));
    // neck + cowl
    V.push(); V.translate(H0[0], H0[1]); V.scale(k);
    mdFI([[-10, 28], [10, 28], [12, 50], [-12, 50]], FL.olive, 955, { w: 0.3 });
    const cowl = V.smoothPts([[-40, 58], [-28, 40], [0, 36], [28, 40], [40, 58], [22, 76], [0, 80], [-22, 76]], true, 5);
    mdFI(cowl, '#2d509a', 956, { shade: BD, shadeA: 0.35 });
    mdLine(V.smoothPts([[-28, 56], [0, 68], [28, 56]], false, 6), BD, 0.4, 957);
    mdLine(V.smoothPts([[-22, 46], [0, 41], [22, 46]], false, 6), BH, 0.2, 958, { alpha: 0.7 });
    V.pop();
    // head (tonsured), tilting toward the hand that is up
    V.push(); V.translate(H0[0], H0[1]); V.scale(k); V.rotate(tilt);
    mdFI(V.ellipsePts(0, 0, 27, 36, 40), FL.olive, 960, { w: 0.42 });
    V.fill(V.ellipsePts(1.2, 3.5, 22.5, 30, 36), { color: FL.base, flat: true, seed: 962 });
    // shaven crown (corona) — a pale dome ringed by curls
    mdFI(V.smoothPts([[-21, -21], [-14, -33], [0, -37.5], [14, -33], [21, -21], [0, -24]], true, 5), '#f4e2c2', 963, { w: 0.3 });
    for (let q = 0; q < 11; q++) {
      const a = Math.PI * (1.02 + (q / 10) * 0.96), rx = 27.5, ry = 25;
      const p = [Math.cos(a) * rx, Math.sin(a) * ry - 2];
      mdFI(V.ellipsePts(p[0], p[1], 5.6, 5, 10), q % 2 ? '#5e3d22' : '#6c4628', 964 + q, { w: 0.26 });
      mdLine(V.arcPts(p[0] + 0.5, p[1] + 0.5, 2.8, 2.4, 0.4, 4.2, 6), '#2a170c', 0.13, 976 + q, { taper: [1, 1] });
    }
    [-1, 1].forEach((s) => mdFI(V.smoothPts([[s * 25.5, -3], [s * 31, -7], [s * 32.5, 3], [s * 26.5, 9]], true, 4), FL.base, 980 + s, { w: 0.28 }));
    [-1, 1].forEach((s, q) => {
      mdLine(V.smoothPts([[s * 3.5, -7], [s * 10, -11.5], [s * 18, -9]], false, 5), '#3a2014', 0.24, 985 + q, { taper: [3, 4] });
      V.fill(V.smoothPts([[s * 5, -0.5], [s * 10.5, -4.5], [s * 17, -1.2], [s * 10.5, 2.6]], true, 4), { color: '#f8f1df', flat: true, seed: 987 + q });
      mdLine(V.smoothPts([[s * 4.6, 0], [s * 10.5, -5], [s * 17.5, -1]], false, 5), '#1a1008', 0.26, 989 + q, { taper: [2, 3] });
      V.dot(s * 11, -0.8, 2.4, '#1a1008', { seed: 991 + q });
      V.dot(s * 14, 12, 6.2, FL.cheek, { alpha: 0.42, seed: 993 + q });
    });
    mdLine(V.smoothPts([[-2.5, -7], [-1.8, 5], [-1, 13], [2.6, 15.6], [5.6, 14.2]], false, 5), '#3a2014', 0.24, 995, { taper: [3, 3] });
    mdLine(V.smoothPts([[-6.5, 22.5], [0, 21.8], [6.5, 22.5]], false, 5), '#8a2c1c', 0.3, 996, { taper: [3, 3] });
    mdLine(V.smoothPts([[-4, 26.5], [0, 27.5], [4, 26.5]], false, 5), '#b06a52', 0.18, 997, { taper: [2, 2], alpha: 0.7 });
    V.pop();
    // arms: upper sleeve, then bell sleeve on the 67 forearm, palm-up hand
    [0, 1].forEach((side) => {
      const d = side ? 1 : -1;
      const S = L(d * 50, 70);
      const A = mdArm(t, side, S[0], S[1], { ex: 30 * k, ey: 58 * k, l2: 64 * k, rest: 26, amp: 31, elbowLift: 7 });
      mdFI([[S[0] - d * 14 * k, S[1] - 10 * k], [S[0] + d * 14 * k, S[1] - 4 * k], [A.ex + d * 13 * k, A.ey - 6 * k], [A.ex + d * 2 * k, A.ey + 13 * k], [A.ex - d * 14 * k, A.ey + 6 * k], [S[0] - d * 16 * k, S[1] + 30 * k]], BL, 1000 + side * 30, { shade: BD, shadeA: 0.3 });
      mdLine([[S[0] + d * 2 * k, S[1] + 4 * k], [A.ex - d * 2 * k, A.ey]], BD, 0.4, 1002 + side * 30);
      mdSleeveArm(A, 64, k, cols, 1004 + side * 30);
      const ca = Math.cos(A.th), sa = Math.sin(A.th);
      mdHand(A.hx + d * ca * 2 * k, A.hy - sa * 2 * k, d, A.th * 0.45, 1.35 * k / 1.32, 1024 + side * 30);
    });
  }

  // ---------------------------------------------------------------- marginal drolleries
  /** fur: short ink flicks along a contour band */
  function mdFur(cx, cy, rx, ry, a0, a1, n, seed, col = '#5a4632', len = 7) {
    for (let i = 0; i < n; i++) {
      const a = V.lerp(a0, a1, (i + 0.5) / n), x = cx + Math.cos(a) * rx * 0.86, y = cy + Math.sin(a) * ry * 0.86;
      mdLine([[x, y], [x - Math.cos(a) * len, y - Math.sin(a) * len]], col, 0.14, seed + i, { taper: [1, 3], wob: 0.1 });
    }
  }
  // rabbit balancing a sword on its upturned paws (right margin)
  function mdRabbit(t) {
    const bob = V.G.pulse(t) * 3, X0 = 1662, Y0 = 600;
    const FUR = '#cdbfa6', FURD = '#8f7d62', CREAM = '#f3ead6', PINK = '#e3a3a0';
    V.push(); V.translate(X0, Y0 + bob * 0.5);
    // ears (behind the head), tipping with the beat
    const tl = V.G.tilt(t, 0.12);
    [[-1, -14, -36, -300], [1, 12, 30, -296]].forEach(([s, bx, tx, ty], k) => {
      const tx2 = tx + tl * 120, base = [bx, -190 + bob];
      const ear = V.smoothPts([[base[0] - 10, base[1]], [V.lerp(base[0], tx2, 0.5) - 14 * s * 0 - 11, V.lerp(base[1], ty, 0.5)], [tx2, ty], [V.lerp(base[0], tx2, 0.5) + 11, V.lerp(base[1], ty, 0.5)], [base[0] + 10, base[1]]], true, 6);
      mdFI(ear, FUR, 1100 + k * 5, { shade: FURD, shadeA: 0.25 });
      mdFI(V.smoothPts([[base[0] - 4, base[1] - 6], [V.lerp(base[0], tx2, 0.5) - 5, V.lerp(base[1], ty, 0.5)], [V.lerp(base[0], tx2, 0.9), V.lerp(base[1], ty, 0.9)], [V.lerp(base[0], tx2, 0.5) + 5, V.lerp(base[1], ty, 0.5)], [base[0] + 4, base[1] - 6]], true, 6), PINK, 1102 + k * 5, { ink: false });
    });
    mdFI(V.ellipsePts(40, -46, 13, 12, 16), CREAM, 1110, { w: 0.3 }); // scut
    [-1, 1].forEach((s, k) => { // haunches + long hind feet
      mdFI(V.ellipsePts(s * 22, -38, 25, 32, 24), FUR, 1112 + k * 3, { shade: FURD, shadeA: 0.25 });
      mdFI(V.smoothPts([[s * 8, -8], [s * 26, -12], [s * 48, -8], [s * 50, -1], [s * 10, 1]], true, 4), FUR, 1118 + k * 3, { w: 0.36 });
      [0, 1, 2].forEach((q) => mdLine([[s * (38 + q * 4), -6], [s * (41 + q * 4), -2]], FURD, 0.12, 1124 + k * 5 + q));
    });
    mdFI(V.ellipsePts(0, -94 + bob * 0.2, 33, 62, 32), FUR, 1130, { shade: FURD, shadeA: 0.28, w: 0.36 });
    mdFI(V.ellipsePts(-4, -84, 19, 42, 24), CREAM, 1133, { ink: false });
    mdFur(0, -94, 33, 62, Math.PI * 0.62, Math.PI * 1.38, 12, 1140);
    mdFur(0, -94, 33, 62, -Math.PI * 0.38, Math.PI * 0.38, 12, 1150);
    mdFur(22, -38, 25, 32, -1.4, 1.2, 8, 1155);
    // head: a hare in three-quarter view, long snout, almond eye under a heavy lid (unimpressed)
    V.push(); V.translate(-2, -168 + bob * 0.3); V.rotate(tl);
    const head = V.smoothPts([[24, -6], [18, -22], [2, -28], [-16, -22], [-30, -10], [-40, 0], [-40, 7], [-30, 13], [-12, 20], [8, 20], [22, 10]], true, 5);
    mdFI(head, FUR, 1160, { shade: FURD, shadeA: 0.22, w: 0.36 });
    mdFI(V.smoothPts([[-38, 4], [-28, 12], [-12, 18], [-4, 10], [-20, 4]], true, 4), CREAM, 1163, { ink: false });
    mdFI(V.smoothPts([[-41, 0], [-37, -2], [-36, 3], [-40, 5]], true, 3), PINK, 1164, { w: 0.22 });
    mdLine(V.smoothPts([[-38, 6], [-34, 11], [-28, 12]], false, 4), P.ink, 0.18, 1165, { taper: [2, 2] });
    V.fill(V.smoothPts([[-20, -9], [-13, -14], [-5, -10], [-12, -6]], true, 4), { color: '#fbf6e8', flat: true, seed: 1166 });
    V.dot(-11.5, -9.6, 3, '#1a1008', { seed: 1167 });
    mdLine(V.smoothPts([[-21, -9], [-13, -15.5], [-4, -10.5]], false, 4), P.ink, 0.28, 1168, { taper: [2, 2] });
    mdLine(V.smoothPts([[-20, -8.2], [-12, -10.8], [-5, -9]], false, 4), FURD, 0.16, 1169, { taper: [2, 2] }); // the heavy lid
    V.dot(9, -10, 2.2, '#1a1008', { seed: 1170, alpha: 0.85 }); // far eye, foreshortened
    [-3, 1, 5].forEach((dy, q) => mdLine([[-30, 6 + dy * 0.3], [-58, 1 + dy * 1.8]], '#3a2a1a', 0.1, 1175 + q, { taper: [2, 4] }));
    for (let q = 0; q < 7; q++) mdLine([[2 + q * 3.2, -24 + q * 1.2], [6 + q * 3.2, -18 + q * 1.4]], FURD, 0.11, 1180 + q, { taper: [1, 2] });
    V.pop();
    // arms + paws (67) and the sword balanced across the paws
    const hands = [];
    [0, 1].forEach((side) => {
      const d = side ? 1 : -1;
      const S = [d * 26, -122 + bob * 0.3];
      const A = mdArm(t, side, S[0], S[1], { ex: 12, ey: 34, l2: 40, rest: 22, amp: 34, elbowLift: 5 });
      const arm = [[S[0] - d * 10, S[1] - 6], [S[0] + d * 10, S[1] + 2], [A.ex + d * 8, A.ey - 4], [A.hx + d * 2, A.hy - 6], [A.hx, A.hy + 7], [A.ex - d * 2, A.ey + 10], [S[0] - d * 10, S[1] + 22]];
      mdFI(V.smoothPts(arm, true, 3), FUR, 1190 + side * 10, { shade: FURD, shadeA: 0.25 });
      mdHand(A.hx, A.hy, d, A.th * 0.4, 0.82, 1196 + side * 10, FUR);
      const pp = V.tp(A.hx + d * 14 * 0.82, A.hy - 7 * 0.82);
      hands.push(pp);
    });
    V.pop();
    // sword: rests on both palms, so it see-saws with the 67
    const [pa, pb] = hands, dx = pb[0] - pa[0], dy = pb[1] - pa[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = uy, ny = -ux;
    const M = [(pa[0] + pb[0]) / 2 + nx * 5, (pa[1] + pb[1]) / 2 + ny * 5];
    const at = (s, o = 0) => [M[0] + ux * s + nx * o, M[1] + uy * s + ny * o];
    const blade = [at(-128, 0), at(-112, 5.5), at(40, 6.5), at(40, -6.5), at(-112, -5.5)];
    mdFI(blade, '#c3c8cf', 1220, { w: 0.36 });
    mdLine([at(-108, 0), at(36, 0)], '#7d848e', 0.22, 1221, { taper: [6, 2] });
    mdLine([at(-104, 2.8), at(36, 3.2)], '#ffffff', 0.16, 1222, { taper: [6, 2], alpha: 0.9 });
    const guard = [at(40, 20), at(48, 20), at(48, -20), at(40, -20)];
    const grip = [at(48, 4), at(80, 3.5), at(80, -3.5), at(48, -4)];
    V.with2d((ctx) => { mdGold(ctx, guard, { seed: 1224, mask: false }); });
    mdFI(grip, '#6b3a1e', 1226, { w: 0.3 });
    V.with2d((ctx) => { mdGold(ctx, V.ellipsePts(at(87)[0], at(87)[1], 8, 8, 16), { seed: 1228, mask: false }); });
    mdLine(guard.concat([guard[0]]), P.ink, 0.32, 1229, { taper: [0, 0] });
    mdLine(V.ellipsePts(at(87)[0], at(87)[1], 8, 8, 16).concat([at(87, 8)]), P.ink, 0.3, 1230, { taper: [0, 0] });
  }

  // monkey drummer on a curl of the border (keeps the beat for everybody)
  function mdMonkey(t) {
    const X0 = 1700, Y0 = 772, ph = V.fract(V.G.b(t)), hit = V.G.pulse(t, 9);
    const BR = '#8a5a32', BRD = '#4e2f16', FACE = '#e2c39c';
    V.push(); V.translate(X0, Y0 + hit * 2);
    // tail curling down around the stem
    const tail = V.smoothPts([[22, -14], [42, -2], [46, 30], [26, 52], [8, 40], [16, 24], [30, 30]], false, 8);
    V.ink(tail, { brush: 'gouache', w: 0.62, color: BRD, seed: 1300, taper: [2, 10], wob: 0.3 });
    V.ink(tail, { brush: 'gouache', w: 0.44, color: BR, seed: 1301, taper: [2, 10], wob: 0.3 });
    mdFI(V.ellipsePts(4, -40, 27, 36, 26), BR, 1302, { shade: BRD, shadeA: 0.3 });
    mdFur(4, -40, 27, 36, -1.2, 1.2, 9, 1305, '#3a220e', 6);
    mdFI(V.smoothPts([[-30, -14], [-4, -24], [16, -12], [10, 2], [-34, 2]], true, 4), BR, 1316, { shade: BRD, shadeA: 0.3 }); // folded leg
    mdFI(V.smoothPts([[-36, -4], [-24, -6], [-20, 2], [-40, 3]], true, 3), FACE, 1319, { w: 0.3 });
    // tabor (little drum) hanging at its side
    const dr = [-40, -52];
    mdFI([[dr[0] - 19, dr[1] - 4], [dr[0] + 19, dr[1] - 4], [dr[0] + 19, dr[1] + 20], [dr[0] - 19, dr[1] + 20]], P.verm, 1320, { shade: P.vermD, shadeA: 0.3 });
    for (let q = 0; q < 5; q++) mdLine([[dr[0] - 19 + q * 9.5, dr[1] - 3], [dr[0] - 14 + q * 9.5, dr[1] + 19]], '#f0d27a', 0.2, 1322 + q, { taper: [0, 0] });
    mdFI(V.ellipsePts(dr[0], dr[1] - 4, 19, 6.5, 20), '#efe3c4', 1328, { w: 0.34 });
    mdFI(V.ellipsePts(dr[0], dr[1] + 20, 19, 6.5, 20).slice(0, 11), P.verm, 1329, { ink: false });
    // head: profile ape looking left, pale face mask, small eye under a heavy brow
    V.push(); V.translate(-8, -88); V.rotate(-0.06 + hit * 0.07);
    mdFI(V.ellipsePts(10, -2, 8, 9, 12), FACE, 1330, { w: 0.28 });
    mdFI(V.smoothPts([[18, -6], [12, -20], [-4, -23], [-16, -16], [-22, -4], [-20, 10], [-6, 19], [12, 14], [20, 4]], true, 5), BR, 1332, { shade: BRD, shadeA: 0.3, w: 0.36 });
    const face = V.smoothPts([[-2, -14], [-14, -12], [-22, -4], [-30, 2], [-31, 8], [-24, 13], [-12, 15], [-4, 6]], true, 5);
    mdFI(face, FACE, 1334, { w: 0.3 });
    mdLine(V.smoothPts([[-6, -9], [-14, -10], [-22, -6]], false, 4), BRD, 0.32, 1335, { taper: [2, 3] }); // brow ridge
    V.dot(-14, -5, 2.3, '#1a1008', { seed: 1336 });
    mdLine([[-18, -6.5], [-10, -7]], P.ink, 0.14, 1337);
    V.dot(-29, 4, 1.1, P.ink, { seed: 1342 });
    mdLine(V.smoothPts([[-29, 9], [-22, 10 - hit * 2.5], [-15, 9]], false, 4), '#6a2416', 0.2, 1344, { taper: [2, 2] });
    for (let q = 0; q < 5; q++) mdLine([[6 + q * 3, -18 + q], [9 + q * 3, -12 + q]], '#3a220e', 0.11, 1345 + q, { taper: [1, 2] });
    V.pop();
    // left arm holds the drum, right arm swings the stick: lifts between beats, strikes ON the beat
    mdLine(V.smoothPts([[-14, -64], [-36, -48], [-48, -34]], false, 5), BR, 0.62, 1346, { brush: 'gouache', taper: [2, 2] });
    const lift = Math.pow(Math.sin(Math.PI * ph), 0.7);
    const sh = [10, -64], hd = [V.lerp(-10, -30, lift), V.lerp(-63, -76, lift)];
    const el = [(sh[0] + hd[0]) / 2 + 6, (sh[1] + hd[1]) / 2 + 16 - lift * 4];
    const sd = [V.lerp(-28, -18, lift), V.lerp(6, -30, lift)];
    const tip = [hd[0] + sd[0], hd[1] + sd[1]];
    mdLine([hd, tip], '#5a3418', 0.42, 1350, { taper: [1, 1] });
    V.dot(tip[0], tip[1], 3.6, '#3a220e', { seed: 1351 });
    mdLine(V.smoothPts([sh, el, hd], false, 5), BRD, 0.78, 1348, { brush: 'gouache', taper: [2, 2] });
    mdLine(V.smoothPts([sh, el, hd], false, 5), BR, 0.6, 1349, { brush: 'gouache', taper: [2, 2] });
    V.dot(hd[0], hd[1], 5.5, FACE, { seed: 1352 });
    if (hit > 0.4) [[-14, -16], [0, -22], [14, -16]].forEach(([dx, dy], q) => mdLine([[dr[0] + dx * 1.0, dr[1] - 10 + dy * 0.4], [dr[0] + dx * 1.5, dr[1] - 10 + dy * 0.9]], P.ink, 0.16 * hit, 1353 + q, { taper: [1, 1] }));
    V.pop();
  }

  // knight (great helm, mail, azure surcoat semé of gold lis) who has dropped his sword to do the 67 at a giant snail
  function mdKnight(t) {
    const X0 = 560, Y0 = 1046, k = 0.9, bob = V.G.pulse(t) * 3;
    const STEEL = '#a3a9b2', STEELD = '#5c636e', MAIL = '#8e949d', AZ = '#2f56a8', AZD = '#183570';
    V.push(); V.translate(X0, Y0); V.scale(k);
    const T = (x, y) => V.tp(x, y);
    // dropped sword pointing at the snail + shield leaning on the turf
    mdFI([[44, -4], [196, -10], [204, -7], [196, -3], [44, 3]], '#c3c8cf', 1400, { w: 0.32 });
    mdLine([[50, -2], [192, -7]], '#ffffff', 0.12, 1401);
    mdFI([[32, -10], [36, -10], [36, 6], [32, 6]], '#6b3a1e', 1403, { w: 0.24 });
    V.with2d((ctx) => {
      mdGold(ctx, [T(36, -18), T(44, -18), T(44, 14), T(36, 14)], { seed: 1402, mask: false });
      mdGold(ctx, V.ellipsePts(T(26, -2)[0], T(26, -2)[1], 6 * k, 6 * k, 12), { seed: 1405, mask: false });
    });
    mdLine([[36, -18], [44, -18], [44, 14], [36, 14], [36, -18]], P.ink, 0.28, 1406, { taper: [0, 0] });
    const shield = V.smoothPts([[-176, -98], [-114, -104], [-110, -54], [-128, -12], [-144, -2], [-160, -32]], true, 5);
    mdFI(shield, '#d9ae3a', 1404, { shade: '#a77c22', shadeA: 0.3 });
    mdFI([[-168, -52], [-140, -80], [-112, -60], [-114, -46], [-140, -66], [-162, -40]], P.verm, 1407, { w: 0.3 });
    // legs (mail chausses) in a gentle stance, gold prick spurs
    [[-13, -46, -24, -4], [12, -46, 20, -4]].forEach(([hx, hy, fx, fy], q) => {
      mdFI([[hx - 9, hy], [hx + 9, hy], [fx + 7, fy - 7], [fx - 7, fy - 7]], MAIL, 1410 + q * 6, { shade: STEELD, shadeA: 0.3 });
      mdFI(V.smoothPts([[fx - 9, fy - 11], [fx + 7, fy - 11], [fx + 24, fy - 2], [fx + 22, fy + 3], [fx - 9, fy + 3]], true, 3), MAIL, 1413 + q * 6, { w: 0.34 });
      mdLine([[fx - 9, fy - 5], [fx - 20, fy - 8]], '#d9ae3a', 0.34, 1415 + q * 6, { taper: [0, 0] });
    });
    const legZones = [[-23, -36, -6, -12], [3, -36, 26, -12]].map(([a, b2, c, d]) => [T(a, b2), T(c, d)]);
    V.translate(0, bob);
    // surcoat
    const sur = V.smoothPts([[-26, -154], [26, -154], [29, -122], [44, -40], [24, -34], [5, -37], [0, -70], [-5, -37], [-26, -34], [-46, -40], [-29, -122]], true, 3);
    mdFI(sur, AZ, 1430, { shade: AZD, shadeA: 0.3 });
    mdLine([[-14, -110], [-26, -42]], AZD, 0.42, 1433); mdLine([[14, -110], [27, -42]], AZD, 0.42, 1434); mdLine([[-30, -100], [-38, -44]], AZD, 0.3, 1438); mdLine([[-20, -40], [-8, -38]], '#a8b9e3', 0.16, 1439, { alpha: 0.7 });
    mdLine([[-14, -142], [-12, -120]], '#a8b9e3', 0.18, 1436, { alpha: 0.8 });
    mdLine([[-31, -118], [31, -114]], '#6b3a1e', 0.55, 1435, { taper: [0, 0] });
    mdLine([[-31, -118], [-36, -84]], '#6b3a1e', 0.36, 1437, { taper: [0, 0] }); // empty sword-belt strap
    const lis = [[-12, -138], [12, -138], [-18, -96], [16, -94], [0, -116], [-30, -62], [30, -60], [-14, -62], [16, -64]].map(([x, y]) => T(x, y));
    V.with2d((ctx) => {
      lis.forEach(([x, y], q) => {
        const s = k;
        const P2 = [[0, -8], [2.4, -2], [7, -4], [5, 1], [2, 2], [2, 6], [-2, 6], [-2, 2], [-5, 1], [-7, -4], [-2.4, -2]].map(([u, v]) => [x + u * s, y + v * s]);
        mdGold(ctx, P2, { seed: 1440 + q, mask: false });
        ctx.strokeStyle = 'rgba(26,21,17,0.85)'; ctx.lineWidth = 0.8; mdPath(ctx, P2); ctx.stroke();
      });
    });
    // mail coif collar + great helm turned toward the snail
    mdFI(V.smoothPts([[-31, -158], [-17, -172], [17, -172], [31, -158], [0, -150]], true, 4), MAIL, 1450, { w: 0.36 });
    const coifZone = [T(-26, -170), T(26, -154)];
    V.push(); V.translate(3, -196); V.rotate(V.G.tilt(t, 0.08));
    const helm = [[-20, -24], [22, -24], [24, -14], [24, 20], [17, 26], [-15, 26], [-22, 20], [-22, -14]];
    mdFI(helm, STEEL, 1452, { shade: STEELD, shadeA: 0.35 });
    mdFI([[-20, -24], [22, -24], [22, -19], [-20, -19]], '#c9ced5', 1455, { w: 0.25 });
    mdLine([[9, -22], [9, 25]], STEELD, 0.45, 1456, { taper: [0, 0] });
    mdLine([[-21, -4], [4, -4]], '#14100c', 0.75, 1457, { taper: [0, 0], brush: 'gouache' });
    mdLine([[13, -4], [23, -4]], '#14100c', 0.75, 1458, { taper: [0, 0], brush: 'gouache' });
    for (let q = 0; q < 6; q++) V.dot(15 + (q % 2) * 4.5, 6 + Math.floor(q / 2) * 5, 1.25, '#14100c', { seed: 1460 + q });
    mdLine([[-15, -17], [-15, 22]], '#e6eaee', 0.22, 1467, { taper: [3, 3], alpha: 0.85 });
    // a little vermilion crest-fan
    mdFI(V.smoothPts([[-10, -24], [-14, -40], [0, -48], [14, -40], [10, -24]], true, 4), P.verm, 1468, { w: 0.3 });
    [-8, 0, 8].forEach((dx, q) => mdLine([[dx * 0.5, -25], [dx, -44]], P.vermD, 0.16, 1469 + q));
    V.pop();
    // arms in mail with mitten gauntlets: the 67
    const armZones = [];
    [0, 1].forEach((side) => {
      const d = side ? 1 : -1, S = [d * 25, -148];
      const A = mdArm(t, side, S[0], S[1], { ex: 18, ey: 40, l2: 42, rest: 24, amp: 34, elbowLift: 5 });
      const ca = Math.cos(A.th), sa = Math.sin(A.th), n1 = [-d * sa, -ca];
      const up = [[S[0] - d * 8, S[1] - 6], [S[0] + d * 10, S[1]], [A.ex + d * 8, A.ey], [A.ex - d * 8, A.ey + 4], [S[0] - d * 10, S[1] + 16]];
      const fo = [[A.ex + n1[0] * 8, A.ey + n1[1] * 8], [A.hx + n1[0] * 6, A.hy + n1[1] * 6], [A.hx - n1[0] * 6, A.hy - n1[1] * 6], [A.ex - n1[0] * 8, A.ey - n1[1] * 8]];
      mdFI(up, MAIL, 1470 + side * 10, { shade: STEELD, shadeA: 0.3 });
      mdFI(fo, MAIL, 1474 + side * 10, { shade: STEELD, shadeA: 0.3 });
      armZones.push(up.map(([x, y]) => T(x, y)), fo.map(([x, y]) => T(x, y)));
      mdHand(A.hx, A.hy, d, A.th * 0.4, 0.9, 1478 + side * 10, '#9aa0a9');
    });
    V.pop();
    // mail rings (tiny scallops) clipped to the mail pieces
    V.with2d((ctx) => {
      ctx.strokeStyle = 'rgba(34,38,46,0.6)'; ctx.lineWidth = 0.85;
      const rings = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y += 4.2) for (let x = x0 + (Math.round(y / 4.2) % 2) * 2.4; x < x1; x += 4.8) { ctx.beginPath(); ctx.arc(x, y, 2.1, 0.2, Math.PI - 0.2); ctx.stroke(); } };
      legZones.forEach(([a2, b2]) => rings(a2[0], a2[1], b2[0], b2[1]));
      rings(coifZone[0][0], coifZone[0][1], coifZone[1][0], coifZone[1][1]);
      armZones.forEach((poly) => {
        ctx.save(); mdPath(ctx, poly); ctx.clip();
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; poly.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
        rings(x0, y0, x1, y1); ctx.restore();
      });
    });
  }

  // giant snail: its eye-stalks do the 67
  function mdSnail(t) {
    const X0 = 930, Y0 = 1046, bob = V.G.pulse(t) * 2;
    const BODY = '#a9a27a', BODYD = '#6b6644', SH = '#c99a55', SHD = '#7b5228';
    // slime trail
    mdLine([[X0 + 120, Y0 + 2], [X0 + 260, Y0 + 4]], '#cfd6d2', 0.6, 1500, { alpha: 0.5, taper: [2, 20] });
    V.push(); V.translate(X0, Y0);
    // eye-stalks behind the head first, then body
    const stalks = [0, 1].map((side) => {
      const a = V.G.arm(t, side);
      const base = [side ? -116 : -136, -60 + bob];
      const tip = [base[0] + (side ? 18 : -22), base[1] - 66 - a.y * 30];
      const mid = [V.lerp(base[0], tip[0], 0.5) + (side ? -6 : 6), V.lerp(base[1], tip[1], 0.5)];
      return { base, tip, mid, a };
    });
    stalks.forEach((s, k) => {
      V.ink(V.smoothPts([s.base, s.mid, s.tip], false, 8), { brush: 'gouache', w: 0.82, color: P.ink, seed: 1510 + k, taper: [0, 6] });
      V.ink(V.smoothPts([s.base, s.mid, s.tip], false, 8), { brush: 'gouache', w: 0.64, color: BODY, seed: 1512 + k, taper: [0, 6] });
    });
    const body = V.smoothPts([[150, -2], [100, -16], [20, -24], [-60, -30], [-108, -52], [-134, -70 + bob], [-160, -60 + bob], [-162, -34], [-146, -8], [-100, 0], [0, 2], [120, 2]], true, 6);
    mdFI(body, BODY, 1520, { shade: BODYD, shadeA: 0.3 });
    for (let q = 0; q < 10; q++) mdLine([[-120 + q * 24, -8], [-112 + q * 24, -2]], BODYD, 0.18, 1523 + q, { taper: [1, 1] });
    [[-140, -46], [-120, -38], [-96, -26], [-70, -20], [-150, -30], [-40, -14], [60, -8], [100, -6]].forEach(([x, y], q) => V.dot(x, y, 2.2 + (q % 3), BODYD, { alpha: 0.45, seed: 1580 + q }));
    mdLine(V.smoothPts([[-156, -56], [-130, -62], [-104, -48], [-60, -30], [0, -22]], false, 6), '#e9ecd6', 0.2, 1590, { taper: [6, 14], alpha: 0.8 });
    // shell: big spiral, banded, with growth lines and a white-lead highlight
    const sc = [12, -100 + bob * 0.4];
    mdFI(V.ellipsePts(sc[0], sc[1], 84, 80, 48), SH, 1540, { shade: SHD, shadeA: 0.3 });
    const spi = mdSpiral(sc[0] + 6, sc[1] + 4, 78, 4, 0.9, -2.75, 90);
    V.ink(spi, { brush: 'gouache', w: 0.5, color: SHD, seed: 1543, taper: [4, 10] });
    V.ink(mdSpiral(sc[0] + 6, sc[1] + 4, 70, 6, 0.9, -2.6, 90), { color: '#f1d49a', w: 0.22, seed: 1544, taper: [10, 10], alpha: 0.9 });
    for (let q = 0; q < 16; q++) { const a = 0.9 - (q / 16) * Math.PI * 2 * 0.95, r0 = 80 - q * 2.4; mdLine([[sc[0] + 6 + Math.cos(a) * r0, sc[1] + 4 + Math.sin(a) * r0], [sc[0] + 6 + Math.cos(a) * (r0 - 16), sc[1] + 4 + Math.sin(a) * (r0 - 16)]], SHD, 0.16, 1546 + q, { taper: [2, 2] }); }
    mdLine(V.arcPts(sc[0], sc[1], 70, 66, 3.6, 4.6, 12), '#fff6dc', 0.3, 1565, { alpha: 0.8 });
    // face: deadpan
    mdLine(V.smoothPts([[-160, -40], [-152, -37], [-144, -40]], false, 4), '#3a2a1a', 0.22, 1566, { taper: [2, 2] });
    mdLine([[-160, -30], [-172, -24]], P.ink, 0.3, 1567, { taper: [1, 4] });
    stalks.forEach((s, k) => {
      mdFI(V.ellipsePts(s.tip[0], s.tip[1], 9, 9, 16), BODY, 1570 + k, { w: 0.36 });
      V.fill(V.ellipsePts(s.tip[0] + (k ? 1.5 : -1.5), s.tip[1], 6, 6, 12), { color: '#fbf6e8', flat: true, seed: 1574 + k });
      V.dot(s.tip[0] + (k ? 2 : -2), s.tip[1] + 0.5, 3, '#1a1008', { seed: 1576 + k });
    });
    V.pop();
  }

  // a little wyvern-dragon on the turf behind the knight: its forelegs do the 67 too
  function mdDragon(t) {
    const X0 = 270, Y0 = 1044, bob = V.G.pulse(t) * 2.5;
    const GR = '#4f8a5e', GRD = '#24513a', BELLY = '#efe0b8', WING = '#d0727a', WINGD = '#9c3f4c';
    V.push(); V.translate(X0, Y0);
    // tail curling back to the left, ending in a trefoil barb
    const tail = V.smoothPts([[-18, -22], [-60, -10], [-104, -18], [-124, -46], [-110, -74], [-86, -72], [-84, -52], [-98, -46]], false, 8);
    V.ink(tail, { brush: 'gouache', w: 1.05, color: P.ink, seed: 1600, taper: [0, 28], wob: 0.3 });
    V.ink(tail, { brush: 'gouache', w: 0.86, color: GR, seed: 1601, taper: [0, 28], wob: 0.3 });
    mdFI(mdIvy(-96, -46, Math.PI * 0.9, 16), P.verm, 1602, { w: 0.3 });
    V.translate(0, bob);
    // wing (half-raised, behind the body)
    const wing = V.smoothPts([[-6, -92], [-30, -140], [-62, -168], [-58, -138], [-78, -146], [-66, -116], [-84, -116], [-60, -92], [-30, -76]], true, 3);
    mdFI(wing, WING, 1604, { shade: WINGD, shadeA: 0.3 });
    [[-58, -150], [-72, -134], [-74, -112]].forEach(([x, y], q) => mdLine([[-14, -92], [x, y]], WINGD, 0.26, 1607 + q));
    // haunch + clawed feet
    mdFI(V.ellipsePts(-6, -28, 28, 26, 24), GR, 1610, { shade: GRD, shadeA: 0.3 });
    [[-12, 0], [12, 0]].forEach(([fx, fy], q) => {
      mdFI(V.smoothPts([[fx - 10, fy - 10], [fx + 8, fy - 12], [fx + 16, fy - 2], [fx - 10, fy]], true, 3), GR, 1612 + q * 3, { w: 0.3 });
      [0, 1, 2].forEach((c) => mdLine([[fx + 8 + c * 3, fy - 3], [fx + 12 + c * 3, fy + 1]], P.ink, 0.16, 1614 + q * 3 + c));
    });
    // far foreleg (behind the body)
    const legs = [0, 1].map((side) => {
      const a = V.G.arm(t, side), th = ((20 + 34 * a.y) * Math.PI) / 180;
      const S = side ? [22, -84] : [12, -88];
      const E = [S[0] + 10, S[1] + 20 - a.y * 5], H = [E[0] + Math.cos(th) * 34, E[1] - Math.sin(th) * 34];
      return { S, E, H, th };
    });
    const leg = (L, k, col) => { V.ink(V.smoothPts([L.S, L.E, L.H], false, 4), { brush: 'gouache', w: 0.62, color: P.ink, seed: 1620 + k, taper: [0, 2] }); V.ink(V.smoothPts([L.S, L.E, L.H], false, 4), { brush: 'gouache', w: 0.46, color: col, seed: 1622 + k, taper: [0, 2] }); };
    leg(legs[0], 0, GRD);
    mdHand(legs[0].H[0], legs[0].H[1], 1, legs[0].th * 0.4, 0.7, 1626, GRD);
    [[-30, -50], [-30, -68], [-24, -86], [-14, -102], [0, -116]].forEach(([x, y], q) => mdFI([[x + 4, y + 6], [x - 12, y - 2], [x + 2, y - 8]], P.verm, 1660 + q, { w: 0.22 }));
    // body + scaled belly
    const body = V.smoothPts([[-30, -40], [-26, -84], [-6, -112], [16, -122], [30, -106], [30, -66], [18, -36], [-8, -26]], true, 5);
    mdFI(body, GR, 1630, { shade: GRD, shadeA: 0.3 });
    const belly = V.smoothPts([[10, -112], [26, -100], [26, -64], [14, -38], [4, -44], [10, -80]], true, 4);
    mdFI(belly, BELLY, 1633, { w: 0.26 });
    for (let q = 0; q < 7; q++) mdLine([[8 + q * 0.6, -104 + q * 10], [26 - q * 1.4, -100 + q * 9.5]], '#b89a6a', 0.14, 1635 + q, { taper: [1, 1] });
    [[-14, -60], [-4, -92], [-18, -84], [-6, -50]].forEach(([x, y], q) => mdLine(V.arcPts(x, y, 5, 4, 0.3, 2.8, 6), GRD, 0.14, 1645 + q, { taper: [1, 1] }));
    // neck + head (dragon in profile, looking at the knight, deadpan)
    V.push(); V.translate(26, -128); V.rotate(V.G.tilt(t, 0.1));
    mdFI(V.smoothPts([[-14, 10], [-8, -14], [10, -24], [34, -22], [52, -14], [54, -6], [36, -2], [24, 4], [8, 16]], true, 4), GR, 1650, { shade: GRD, shadeA: 0.3 });
    mdLine(V.smoothPts([[54, -6], [40, -4], [26, 0]], false, 4), P.ink, 0.22, 1653, { taper: [2, 2] });
    mdFI([[40, -4], [46, -5], [43, 3]], P.verm, 1654, { w: 0.18 }); // little tongue
    mdFI(V.smoothPts([[2, -20], [-6, -38], [8, -26]], true, 3), P.verm, 1655, { w: 0.24 }); // horn
    V.fill(V.smoothPts([[14, -16], [20, -19.5], [26, -16], [20, -13.5]], true, 3), { color: '#fbf6e8', flat: true, seed: 1656 });
    V.dot(21, -16.2, 2.1, '#1a1008', { seed: 1657 });
    mdLine([[13, -19], [27, -20]], P.ink, 0.22, 1658, { taper: [1, 1] });
    V.dot(50, -13, 1.1, P.ink, { seed: 1659 });
    V.pop();
    // near foreleg (in front)
    leg(legs[1], 1, GR);
    mdHand(legs[1].H[0], legs[1].H[1], 1, legs[1].th * 0.4, 0.75, 1628, GR);
    V.pop();
  }
  // a goldfinch on the top-right spray, pecking on every beat
  function mdBird(t) {
    const ph = V.fract(V.G.b(t)), peck = Math.exp(-10 * ph) * (ph < 0.5 ? 1 : 0);
    const X0 = 1660, Y0 = 166;
    V.push(); V.translate(X0, Y0); V.scale(1.75);
    mdLine([[-4, -2], [-6, 8]], '#6b4a2a', 0.2, 1700); mdLine([[4, -2], [3, 8]], '#6b4a2a', 0.2, 1701);
    mdFI(V.smoothPts([[22, -14], [40, -6], [44, -2], [30, -10]], true, 3), '#2a2420', 1702, { w: 0.24 }); // tail
    mdFI(V.ellipsePts(10, -16, 22, 13, 24), '#b98a52', 1703, { shade: '#6b4a2a', shadeA: 0.3, w: 0.34 });
    mdFI(V.smoothPts([[2, -22], [24, -20], [30, -12], [10, -10]], true, 4), '#2a2420', 1705, { w: 0.26 }); // black wing
    mdFI(V.smoothPts([[6, -18], [22, -16], [20, -13], [6, -14]], true, 3), '#f2c400', 1706, { ink: false }); // yellow bar
    mdFI(V.ellipsePts(6, -12, 13, 6, 14), '#f1e6cc', 1707, { ink: false });
    V.push(); V.translate(-10, -26 + peck * 6); V.rotate(-peck * 0.5);
    mdFI(V.ellipsePts(0, 0, 10, 9, 16), '#f1e6cc', 1708, { w: 0.3 });
    mdFI(V.smoothPts([[-10, -2], [-4, -7], [0, -2], [-4, 4]], true, 3), '#c8321e', 1709, { ink: false }); // red face
    mdFI(V.smoothPts([[2, -8], [8, -6], [6, 2], [2, 0]], true, 3), '#2a2420', 1710, { ink: false }); // black cap
    mdFI([[-10, -1], [-17, 1], [-10, 3]], '#d8c7a0', 1711, { w: 0.2 }); // beak
    V.dot(-3, -1.5, 1.6, '#1a1008', { seed: 1712 });
    V.pop();
    V.pop();
  }

  V.scenes.medieval = {
    init(meta) {
      if (meta) meta.yearText = '1250';
    },
    draw(t, u, meta) {
      V.bake('md_page', mdBakePage);
      if (!MD_MASK) mdBuildMask(); // once: derive the burnished-gold mask from the baked page
      mdSheen(t);
      mdSprayLeaves(t, mdSheenAt(t));
      mdMonk(t);
      mdRabbit(t);
      mdMonkey(t);
      mdBird(t);
      mdDragon(t);
      mdKnight(t);
      mdSnail(t);
      mdNumeralFlare(t);
      V.vignette({ amt: 0.3, color: '48,28,10', inner: 0.5 });
      V.grain({ amt: 0.07, anim: true });
    },
  };
})();
