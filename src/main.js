/* main.js — page lifecycle, scene dispatcher, time-travel transitions. Rendering is a pure function of film time t:  window.renderAt(t)
 * A scene is  V.scenes.<id> = { init?(), draw(t, u, meta), noHud?, hudStyle?(u, meta) }
 *   t = film seconds, u = t - meta.t0 (scene-local). draw() may be called with u in [-0.35, dur+0.35] because transitions overlap neighbours.
 */
(function () {
  const HALF = 0.3; // transition = [B-0.3, B+0.3] around each scene boundary B
  V.TL = null;
  V.noTransitions = /notrans/.test(location.search); // index.html?notrans=1 -> never composite transitions (clean stills)

  function resetState() {
    V.resetBrush();
    V.mReset();
    V.pending = false;
    blendMode(BLEND);
    noTint();
    brush.noStroke();
  }

  function drawScene(i, t) {
    const meta = V.TL.scenes[i];
    const sc = V.scenes[meta.id];
    resetState();
    const u = t - meta.t0;
    background(0);
    if (sc && sc.draw) {
      sc.draw(t, u, meta);
    } else {
      V.bg('#2b2b33');
      V.text(`${meta.id}  (not built yet)`, 960, 540, 90, { color: '#fff', align: 'center', font: 'Menlo' });
    }
    V.flush();
    resetState();
    V.hud(u, meta);
    V.flush();
  }

  // copy the WEBGL canvas into a persistent 2D canvas (get() would leak a texture per call)
  const snaps = [];
  V.snapshot = function (i) {
    if (!snaps[i]) {
      const cv = document.createElement('canvas');
      cv.width = V.W; cv.height = V.H;
      snaps[i] = { canvas: cv };
    }
    const c = snaps[i].canvas.getContext('2d');
    c.clearRect(0, 0, V.W, V.H);
    c.drawImage(drawingContext.canvas, 0, 0, V.W, V.H);
    return snaps[i];
  };

  V.frame = function (t) {
    V.T = t;
    V.tick = Math.floor(t * 12);
    const sc = V.TL.scenes;
    let i = sc.findIndex((s) => t >= s.t0 && t < s.t1);
    if (i < 0) i = t < 0 ? 0 : sc.length - 1;
    let tr = null;
    if (i < sc.length - 1 && t >= sc[i].t1 - HALF) tr = { a: i, b: i + 1, p: (t - (sc[i].t1 - HALF)) / (2 * HALF) };
    else if (i > 0 && t < sc[i].t0 + HALF) tr = { a: i - 1, b: i, p: (t - (sc[i].t0 - HALF)) / (2 * HALF) };
    if (!tr || (V.noTransitions)) {
      drawScene(i, t);
      return;
    }
    drawScene(tr.a, t);
    const snapA = V.snapshot(0);
    drawScene(tr.b, t);
    const snapB = V.snapshot(1);
    V.transition(snapA, snapB, tr.p, sc[tr.a], sc[tr.b]);
    V.flush();
  };

  /** slat-slide time warp + year odometer. Both scenes are live (still animating) during the whole transition. */
  V.transition = function (A, B, p, mA, mB) {
    const N = 8, bh = V.H / N;
    V.with2d((ctx) => {
      ctx.fillStyle = '#07070b';
      ctx.fillRect(0, 0, V.W, V.H);
      for (let k = 0; k < N; k++) {
        const q = V.clamp(p * 1.4 - k * 0.04);
        const e = V.E.io3(q);
        const dir = k % 2 ? 1 : -1;
        const y = k * bh;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y, V.W, bh);
        ctx.clip();
        ctx.drawImage(A.canvas, 0, y, V.W, bh, dir * e * V.W, y, V.W, bh);
        ctx.drawImage(B.canvas, 0, y, V.W, bh, dir * e * V.W - dir * V.W, y, V.W, bh);
        ctx.restore();
      }
    });
    V.odometer(mA.year, mB.year, p);
  };

  async function loadScript(src) {
    await new Promise((res) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => res(); // missing scene file -> placeholder
      document.head.appendChild(s);
    });
  }

  async function setup() {
    pixelDensity(1);
    createCanvas(V.W, V.H, WEBGL).parent('stage');
    noLoop();
    V.initBrushes();
    V.TL = await (await fetch('timeline.json')).json();
    for (const s of V.TL.scenes) await loadScript(`/src/scenes/${s.id}.js`);
    for (const s of V.TL.scenes) if (V.scenes[s.id] && V.scenes[s.id].init) await V.scenes[s.id].init(s);
    window.__ready = true;
  }
  function draw() {
    translate(-width / 2, -height / 2);
    window.__lastError = null;
    try {
      V.frame(window.__T || 0);
    } catch (e) {
      window.__lastError = (e && e.stack) || String(e);
      console.error('frame error at t=' + (window.__T || 0) + ': ' + window.__lastError);
    }
  }
  window.setup = setup;
  window.draw = draw;
  // scenes may define async prepare(t, meta) (e.g. the finale preloads its tile images) — called for every scene visible at t (incl. transition overlap)
  async function prepareFor(t) {
    for (const m of V.TL.scenes) {
      if (t >= m.t0 - 0.45 && t <= m.t1 + 0.45) {
        const sc = V.scenes[m.id];
        if (sc && sc.prepare) await sc.prepare(t, m);
      }
    }
  }
  let warmed = false;
  window.renderAt = async (t) => {
    window.__T = t;
    await prepareFor(t);
    if (!warmed) {
      // p5.brush drops the very first fill of a page (lazy init) -> render one throw-away frame first
      warmed = true;
      await redraw();
    }
    await redraw();
  };
})();
