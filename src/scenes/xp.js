/* xp.js — 2006 · 早期網路《轉寄》(film 62.0–66.0 s)
 * A Taiwanese Windows XP desktop, 6:07 PM: Bliss wallpaper (2D gradients + p5.brush coloured-pencil grass & watercolour clouds, baked),
 * Luna windows, an Outlook Express chain letter "Fw: Fw: Fw:", an MSN Messenger 7.5 conversation where the pixel-doll display picture,
 * the MSN buddy display picture and a big yellow Wink smiley all do 67, nudges on every "seven", a mouse-drawn handwriting "67"
 * (p5.brush ink), and an XP error box that leaves the famous frozen-window trail.
 * All helpers are private to this IIFE.
 */
(function () {
  const W = 1920, H = 1080;
  const FUI = 'Tahoma, "LiSong Pro", "PingFang TC", sans-serif';
  const FT = '"Trebuchet MS", Tahoma, "LiSong Pro", "PingFang TC", sans-serif';
  const FKAI = 'BiauKaiTC, "Kaiti TC", serif';
  const FBLK = '"Arial Black", Impact, sans-serif';
  const K = 'ゞ阿凱の67☆';

  // ---------------------------------------------------------------- layout (screen px)
  const MSN = { x: 842, y: 46, w: 860, h: 770 };
  const OE = { x: 226, y: 296, w: 680, h: 610 };
  const DLG = { x: 244, y: 352, w: 600, h: 226 };
  const TBY = 1026, TBH = 54;
  // MSN-local layout
  const CP = { x: 16, y: 166, w: 606, h: 400 }; // chat history panel
  const IP = { x: 16, y: 614, w: 606, h: 120 }; // input panel
  const DP1 = { x: 636, y: 166, s: 208 }, DP2 = { x: 636, y: 526, s: 208 };
  const NUDGE_BTN = { x: 138, y: 574, s: 36 };
  const OK_BTN = { x: 225, y: 166, w: 150, h: 46 }; // dialog-local
  const HZ = { x: 92, y: 626 }; // handwriting zone origin (MSN-local)

  // ---------------------------------------------------------------- tiny 2D helpers
  function rr(c, x, y, w, h, r) {
    const [a, b, d, e] = Array.isArray(r) ? r : [r, r, r, r];
    c.beginPath();
    c.moveTo(x + a, y);
    c.lineTo(x + w - b, y);
    c.quadraticCurveTo(x + w, y, x + w, y + b);
    c.lineTo(x + w, y + h - d);
    c.quadraticCurveTo(x + w, y + h, x + w - d, y + h);
    c.lineTo(x + e, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - e);
    c.lineTo(x, y + a);
    c.quadraticCurveTo(x, y, x + a, y);
    c.closePath();
  }
  const lg = (c, x0, y0, x1, y1, st) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    st.forEach((s) => g.addColorStop(s[0], s[1]));
    return g;
  };
  const rg = (c, x0, y0, r0, x1, y1, r1, st) => {
    const g = c.createRadialGradient(x0, y0, r0, x1, y1, r1);
    st.forEach((s) => g.addColorStop(s[0], s[1]));
    return g;
  };
  const circ = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); };
  const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); };
  function T(c, s, x, y, size, o = {}) {
    c.save();
    c.font = `${o.italic ? 'italic ' : ''}${o.weight || 'normal'} ${size}px ${o.font || FUI}`;
    c.textAlign = o.align || 'left';
    c.textBaseline = o.base || 'alphabetic';
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.shadow) { c.shadowColor = o.shadow[0]; c.shadowOffsetX = o.shadow[1]; c.shadowOffsetY = o.shadow[2]; c.shadowBlur = o.shadow[3] || 0; }
    if (o.stroke) { c.lineJoin = 'round'; c.lineWidth = o.strokeW || 3; c.strokeStyle = o.stroke; c.strokeText(s, x, y); if (!o.shadowBoth) c.shadowColor = 'transparent'; }
    c.fillStyle = o.color || '#000';
    c.fillText(s, x, y);
    const w = c.measureText(s).width;
    c.restore();
    return w;
  }
  function TW(c, s, size, o = {}) {
    c.save();
    c.font = `${o.italic ? 'italic ' : ''}${o.weight || 'normal'} ${size}px ${o.font || FUI}`;
    const w = c.measureText(s).width;
    c.restore();
    return w;
  }
  function fit(c, s, size, maxW, o) {
    if (TW(c, s, size, o) <= maxW) return s;
    let k = s.length;
    while (k > 1 && TW(c, s.slice(0, k) + '…', size, o) > maxW) k--;
    return s.slice(0, k) + '…';
  }
  /** draw a 32-unit icon painter at (x,y) size s */
  function icon(c, fn, x, y, s, arg) {
    c.save();
    c.translate(x, y);
    c.scale(s / 32, s / 32);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    fn(c, arg);
    c.restore();
  }
  const cache = {};
  function canvasOnce(key, w, h, paint) {
    if (!cache[key]) {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      paint(cv.getContext('2d'));
      cache[key] = cv;
    }
    return cache[key];
  }

  // ---------------------------------------------------------------- icons (32-unit painters)
  const IC = {};
  const OUT = (c, col, lw = 1) => { c.strokeStyle = col; c.lineWidth = lw; c.stroke(); };
  IC.computer = (c) => {
    rr(c, 22, 8, 8.5, 20.5, 1.2);
    c.fillStyle = lg(c, 22, 0, 30.5, 0, [[0, '#f8f5ec'], [1, '#c4bea9']]); c.fill(); OUT(c, '#5f5a4c', 0.9);
    c.fillStyle = '#8d877a'; c.fillRect(23.6, 11, 5.4, 1); c.fillRect(23.6, 13.6, 5.4, 1);
    c.fillStyle = '#39d34a'; c.fillRect(25.6, 24.6, 1.8, 1.3);
    rr(c, 1.5, 3, 22, 18, 1.8);
    c.fillStyle = lg(c, 0, 3, 0, 21, [[0, '#faf7ee'], [1, '#c9c2ad']]); c.fill(); OUT(c, '#5f5a4c', 0.9);
    rr(c, 3.8, 5, 17.4, 12.6, 0.8);
    c.fillStyle = lg(c, 0, 5, 0, 17.6, [[0, '#5aa6f6'], [1, '#1d58c4']]); c.fill(); OUT(c, '#4a463b', 0.7);
    c.beginPath(); c.moveTo(3.9, 14.6); c.quadraticCurveTo(11, 10.4, 21.1, 13.3); c.lineTo(21.1, 17.5); c.lineTo(3.9, 17.5); c.closePath();
    c.fillStyle = '#5cb834'; c.fill();
    c.fillStyle = '#b4ad98'; c.fillRect(9.5, 21, 7, 2.4);
    rr(c, 6, 23.2, 14, 3.4, 1);
    c.fillStyle = lg(c, 0, 23, 0, 26.6, [[0, '#ece8db'], [1, '#bab39e']]); c.fill(); OUT(c, '#5f5a4c', 0.9);
  };
  IC.docs = (c) => {
    c.beginPath(); c.moveTo(3, 8); c.lineTo(11, 8); c.lineTo(13, 5.5); c.lineTo(28.5, 5.5); c.lineTo(28.5, 26); c.lineTo(3, 26); c.closePath();
    c.fillStyle = lg(c, 0, 5, 0, 26, [[0, '#f3c75a'], [1, '#d9a032']]); c.fill(); OUT(c, '#9a6d12', 0.9);
    c.fillStyle = '#fff'; c.fillRect(7.5, 3.5, 15, 17); c.strokeStyle = '#8b9bb4'; c.lineWidth = 0.7; c.strokeRect(7.5, 3.5, 15, 17);
    c.fillStyle = '#5b86d6'; for (let i = 0; i < 4; i++) c.fillRect(9.5, 7 + i * 2.6, 11, 0.9);
    c.beginPath(); c.moveTo(1.5, 12); c.lineTo(30.5, 12); c.lineTo(28.5, 28); c.lineTo(3.5, 28); c.closePath();
    c.fillStyle = lg(c, 0, 12, 0, 28, [[0, '#fff1a8'], [0.4, '#fbd767'], [1, '#eeb73b']]); c.fill(); OUT(c, '#a8790f', 0.9);
  };
  IC.recycle = (c) => {
    c.beginPath(); c.moveTo(6.5, 8); c.lineTo(25.5, 8); c.lineTo(23.5, 29); c.lineTo(8.5, 29); c.closePath();
    c.fillStyle = lg(c, 6, 0, 26, 0, [[0, '#cfe0ec'], [0.45, '#f7fbff'], [1, '#97b2c8']]); c.fill(); OUT(c, '#506c86', 0.9);
    c.strokeStyle = 'rgba(80,108,134,0.55)'; c.lineWidth = 0.7;
    for (let i = 1; i < 5; i++) { const x = 6.5 + i * 3.8; c.beginPath(); c.moveTo(x, 9.5); c.lineTo(x - (x - 16) * 0.1, 27.5); c.stroke(); }
    ell(c, 16, 8, 10, 2.6); c.fillStyle = '#eef6fc'; c.fill(); OUT(c, '#506c86', 0.9);
    ell(c, 16, 8.2, 7.6, 1.4); c.fillStyle = '#9fb7cb'; c.fill();
    // green recycle arrows
    c.strokeStyle = '#2f9a2a'; c.lineWidth = 2.1;
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + k * (Math.PI * 2 / 3);
      c.beginPath(); c.arc(16, 18.5, 5, a + 0.35, a + 1.65); c.stroke();
      const ax = 16 + Math.cos(a + 1.75) * 5, ay = 18.5 + Math.sin(a + 1.75) * 5;
      c.beginPath(); c.arc(ax, ay, 1.4, 0, 7); c.fillStyle = '#2f9a2a'; c.fill();
    }
  };
  IC.exe = (c) => {
    rr(c, 2.5, 5, 27, 23, 1.5); c.fillStyle = '#fbfbfb'; c.fill(); OUT(c, '#24459a', 1);
    rr(c, 2.5, 5, 27, 6.5, [1.5, 1.5, 0, 0]); c.fillStyle = lg(c, 0, 5, 0, 11.5, [[0, '#4d9bff'], [1, '#0a4fd8']]); c.fill();
    c.fillStyle = '#fff'; c.fillRect(24.5, 6.8, 3, 3);
    c.font = 'bold 15px Tahoma'; c.textAlign = 'center'; c.fillStyle = '#e01b1b'; c.fillText('67', 16, 25.5);
  };
  IC.wretch = (c) => { // an IE shortcut (with the little shortcut arrow) — 無名小站, 2006
    IC.ie(c);
    c.fillStyle = '#fff'; c.fillRect(1, 20, 11, 11); c.strokeStyle = '#555'; c.lineWidth = 0.8; c.strokeRect(1, 20, 11, 11);
    c.strokeStyle = '#000'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(3.5, 28.5); c.quadraticCurveTo(4, 23.5, 9, 23); c.stroke();
    c.beginPath(); c.moveTo(6.8, 21); c.lineTo(10, 23); c.lineTo(7, 25.4); c.closePath(); c.fillStyle = '#000'; c.fill();
  };
  IC.txt = (c) => {
    c.beginPath(); c.moveTo(6.5, 2.5); c.lineTo(21, 2.5); c.lineTo(26.5, 8); c.lineTo(26.5, 29.5); c.lineTo(6.5, 29.5); c.closePath();
    c.fillStyle = '#fff'; c.fill(); OUT(c, '#6b7a90', 0.9);
    c.beginPath(); c.moveTo(21, 2.5); c.lineTo(21, 8); c.lineTo(26.5, 8); c.closePath(); c.fillStyle = '#dde5ef'; c.fill(); OUT(c, '#6b7a90', 0.8);
    c.fillStyle = '#3d6fd1'; c.fillRect(6.5, 2.5, 3, 27);
    c.fillStyle = '#90a8cf'; for (let i = 0; i < 6; i++) c.fillRect(11.5, 11 + i * 3, 12, 0.9);
  };
  IC.ie = (c) => {
    c.strokeStyle = lg(c, 6, 6, 26, 28, [[0, '#7fd0ff'], [0.5, '#1f86e8'], [1, '#0b4fb3']]);
    c.lineWidth = 5.2; c.lineCap = 'butt';
    c.beginPath(); c.arc(16, 17, 8.2, 0.15 * Math.PI, 1.95 * Math.PI); c.stroke();
    c.beginPath(); c.moveTo(8.4, 17); c.lineTo(24.4, 17); c.stroke();
    c.save(); c.translate(16, 16); c.rotate(-0.55);
    c.strokeStyle = '#f2b41c'; c.lineWidth = 2.2; ell(c, 0, 0, 15, 5.4); c.stroke();
    c.restore();
  };
  IC.buddy = (c) => {
    // blue buddy (behind)
    c.beginPath(); c.moveTo(2, 28); c.quadraticCurveTo(2.5, 17, 11, 17.5); c.quadraticCurveTo(17, 18, 18, 24); c.lineTo(18, 28); c.closePath();
    c.fillStyle = lg(c, 0, 17, 0, 28, [[0, '#6fb3ff'], [1, '#1f5fd0']]); c.fill();
    circ(c, 10, 11, 5.4); c.fillStyle = rg(c, 8.4, 9.2, 0.5, 10, 11, 5.4, [[0, '#bfe0ff'], [0.5, '#4a97f2'], [1, '#1e5bc8']]); c.fill();
    // green buddy
    c.beginPath(); c.moveTo(9, 30); c.quadraticCurveTo(9.5, 18.5, 19.5, 18.5); c.quadraticCurveTo(29.5, 18.5, 30, 30); c.closePath();
    c.fillStyle = lg(c, 0, 18, 0, 30, [[0, '#8fe065'], [1, '#2c9418']]); c.fill(); OUT(c, '#1f6e10', 0.7);
    circ(c, 19.5, 11, 6.4); c.fillStyle = rg(c, 17.6, 8.8, 0.5, 19.5, 11, 6.4, [[0, '#d8ffb8'], [0.45, '#62c936'], [1, '#2a8a17']]); c.fill(); OUT(c, '#1f6e10', 0.7);
  };
  IC.oe = (c) => {
    rr(c, 3, 9, 24, 17, 1); c.fillStyle = lg(c, 0, 9, 0, 26, [[0, '#fffdf2'], [1, '#e6dfc4']]); c.fill(); OUT(c, '#7a6e4c', 0.9);
    c.beginPath(); c.moveTo(3.5, 9.5); c.lineTo(15, 19); c.lineTo(26.5, 9.5); OUT(c, '#7a6e4c', 0.9);
    c.strokeStyle = '#1d6fe0'; c.lineWidth = 2.4;
    c.beginPath(); c.arc(22, 10, 7, Math.PI * 0.9, Math.PI * 1.75); c.stroke();
    c.beginPath(); c.moveTo(25.5, 2.5); c.lineTo(28.4, 5.8); c.lineTo(24.2, 7.3); c.closePath(); c.fillStyle = '#1d6fe0'; c.fill();
  };
  IC.err = (c) => {
    circ(c, 16, 16, 14); c.fillStyle = rg(c, 11, 9, 1, 16, 16, 14, [[0, '#ff9a86'], [0.45, '#f0301a'], [1, '#a50e00']]); c.fill(); OUT(c, '#7d0b00', 1);
    ell(c, 14, 9.5, 8, 4.2, -0.35); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(10.5, 10.5); c.lineTo(21.5, 21.5); c.moveTo(21.5, 10.5); c.lineTo(10.5, 21.5); c.stroke();
  };
  IC.flag = (c) => {
    const q = (x, y, col) => {
      c.beginPath();
      c.moveTo(x, y + 1.6);
      c.quadraticCurveTo(x + 3.6, y - 0.9, x + 7.8, y + 0.7);
      c.lineTo(x + 6.6, y + 8.9);
      c.quadraticCurveTo(x + 2.6, y + 7.3, x - 1.2, y + 9.6);
      c.closePath();
      c.fillStyle = col; c.fill();
    };
    q(6.2, 4.4, '#f35325'); q(15.4, 4.2, '#81bc06'); q(4.9, 14.6, '#05a6f0'); q(14.1, 14.4, '#ffba08');
    c.fillStyle = 'rgba(243,83,37,0.55)'; c.fillRect(2.6, 6.6, 1.6, 1.6); c.fillRect(0.6, 8.6, 1.2, 1.2);
    c.fillStyle = 'rgba(5,166,240,0.55)'; c.fillRect(1.4, 17, 1.6, 1.6); c.fillRect(-0.4, 19, 1.2, 1.2);
  };
  IC.shield = (c) => {
    c.beginPath(); c.moveTo(16, 3); c.quadraticCurveTo(22, 6, 27, 5.5); c.quadraticCurveTo(28, 21, 16, 29); c.quadraticCurveTo(4, 21, 5, 5.5); c.quadraticCurveTo(10, 6, 16, 3); c.closePath();
    c.save(); c.clip();
    c.fillStyle = '#e8402a'; c.fillRect(0, 0, 16, 16); c.fillStyle = '#5bb52e'; c.fillRect(16, 0, 16, 16);
    c.fillStyle = '#2f7de0'; c.fillRect(0, 16, 16, 16); c.fillStyle = '#f7c21c'; c.fillRect(16, 16, 16, 16);
    c.restore(); OUT(c, '#26313f', 1.2);
  };
  IC.speaker = (c) => {
    c.beginPath(); c.moveTo(5, 12); c.lineTo(10, 12); c.lineTo(17, 6); c.lineTo(17, 26); c.lineTo(10, 20); c.lineTo(5, 20); c.closePath();
    c.fillStyle = lg(c, 0, 6, 0, 26, [[0, '#f2f2f2'], [1, '#a8a8a8']]); c.fill(); OUT(c, '#3b3b3b', 1);
    c.strokeStyle = '#fff'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(17, 16, 5, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(17, 16, 9, -0.8, 0.8); c.stroke();
  };
  IC.net = (c) => {
    const mon = (x, y) => { rr(c, x, y, 13, 10, 1); c.fillStyle = '#d9d5c8'; c.fill(); OUT(c, '#3c3c3c', 0.9); c.fillStyle = '#2f73d8'; c.fillRect(x + 2, y + 2, 9, 6); c.fillStyle = '#9d9789'; c.fillRect(x + 4, y + 10, 5, 2); };
    mon(2, 4); mon(17, 15);
  };
  IC.smile = (c, kind) => {
    circ(c, 16, 16, 13.5); c.fillStyle = rg(c, 11, 9, 1, 16, 16, 14, [[0, '#fffbd0'], [0.4, '#ffe34a'], [0.85, '#f6b400'], [1, '#e08d00']]); c.fill(); OUT(c, '#8a5600', 1.3);
    c.fillStyle = '#2a1a00';
    if (kind === 'wink') { ell(c, 11.5, 12.5, 1.8, 3); c.fill(); c.strokeStyle = '#2a1a00'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(18.5, 12.5); c.lineTo(23, 12.5); c.stroke(); }
    else { ell(c, 11.5, 12.5, 1.8, 3); c.fill(); ell(c, 20.5, 12.5, 1.8, 3); c.fill(); }
    c.beginPath();
    if (kind === 'grin') { c.moveTo(8.5, 18); c.quadraticCurveTo(16, 27, 23.5, 18); c.closePath(); c.fillStyle = '#7a2400'; c.fill(); c.fillStyle = '#fff'; c.fillRect(10.5, 18.3, 11, 2); }
    else { c.strokeStyle = '#3a1a00'; c.lineWidth = 1.5; c.moveTo(9.5, 19); c.quadraticCurveTo(16, 24.5, 22.5, 19); c.stroke(); }
    ell(c, 12, 7.8, 5, 2.4, -0.3); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill();
    if (kind === 'wink') { c.fillStyle = '#ffd400'; c.strokeStyle = '#a06a00'; c.lineWidth = 0.8; star(c, 26, 6, 5, 2.2); c.fill(); c.stroke(); }
  };
  function star(c, x, y, R, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r : R; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    c.closePath();
  }
  IC.nudge = (c) => {
    rr(c, 7, 8, 18, 15, 1.5); c.fillStyle = '#fff'; c.fill(); OUT(c, '#2d5fb8', 1.2);
    c.fillStyle = '#3a7ff0'; c.fillRect(7, 8, 18, 4);
    c.strokeStyle = '#e8562a'; c.lineWidth = 1.5;
    for (const s of [-1, 1]) {
      const x = s < 0 ? 4.5 : 27.5;
      c.beginPath(); c.moveTo(x, 9); c.lineTo(x + s * 2, 12); c.lineTo(x, 15); c.lineTo(x + s * 2, 18); c.lineTo(x, 21); c.stroke();
    }
  };
  IC.mic = (c) => {
    rr(c, 12, 4, 8, 15, 4); c.fillStyle = lg(c, 12, 0, 20, 0, [[0, '#d6d6d6'], [0.5, '#ffffff'], [1, '#8a8a8a']]); c.fill(); OUT(c, '#333', 1);
    c.strokeStyle = '#333'; c.lineWidth = 1.4; c.beginPath(); c.arc(16, 13, 7.5, 0.1, Math.PI - 0.1); c.stroke();
    c.beginPath(); c.moveTo(16, 20.5); c.lineTo(16, 26); c.moveTo(11, 26.5); c.lineTo(21, 26.5); c.stroke();
  };
  IC.font = (c) => {
    c.font = 'bold 22px "Times New Roman", serif'; c.textAlign = 'center'; c.fillStyle = '#1b2f6b'; c.fillText('A', 16, 23);
    c.fillStyle = '#e02020'; c.fillRect(6, 25, 20, 3);
  };
  IC.bgimg = (c) => {
    rr(c, 4, 6, 24, 20, 1.5); c.fillStyle = lg(c, 0, 6, 0, 26, [[0, '#8fc7ff'], [0.6, '#cfeaff'], [0.61, '#68b83c'], [1, '#3f8f22']]); c.fill(); OUT(c, '#3b4a66', 1);
    circ(c, 22, 11, 2.6); c.fillStyle = '#ffd84a'; c.fill();
  };
  IC.invite = (c) => {
    circ(c, 13, 10, 5.5); c.fillStyle = rg(c, 11.5, 8.5, 0.5, 13, 10, 5.5, [[0, '#c9f4a4'], [0.5, '#5cc531'], [1, '#2a8a17']]); c.fill(); OUT(c, '#1f6e10', 0.9);
    c.beginPath(); c.moveTo(3, 28); c.quadraticCurveTo(3.5, 17, 13, 17); c.quadraticCurveTo(22.5, 17, 23, 28); c.closePath();
    c.fillStyle = lg(c, 0, 17, 0, 28, [[0, '#8fe065'], [1, '#2c9418']]); c.fill(); OUT(c, '#1f6e10', 0.9);
    c.fillStyle = '#f39a1e'; c.fillRect(22, 7, 3.4, 11); c.fillRect(18.2, 10.8, 11, 3.4);
    c.strokeStyle = '#9a5a00'; c.lineWidth = 0.6; c.strokeRect(22, 7, 3.4, 11); c.strokeRect(18.2, 10.8, 11, 3.4);
  };
  IC.sendfile = (c) => {
    c.beginPath(); c.moveTo(5, 3); c.lineTo(18, 3); c.lineTo(23, 8); c.lineTo(23, 28); c.lineTo(5, 28); c.closePath(); c.fillStyle = '#fff'; c.fill(); OUT(c, '#5b6b84', 1);
    c.fillStyle = '#9fb3d6'; for (let i = 0; i < 5; i++) c.fillRect(8, 9 + i * 3.2, 11, 1);
    c.beginPath(); c.moveTo(14, 18); c.lineTo(24, 18); c.lineTo(24, 14); c.lineTo(31, 21); c.lineTo(24, 28); c.lineTo(24, 24); c.lineTo(14, 24); c.closePath();
    c.fillStyle = lg(c, 0, 14, 0, 28, [[0, '#8be06a'], [1, '#2a9a1e']]); c.fill(); OUT(c, '#1d6a12', 1);
  };
  IC.webcam = (c) => {
    c.fillStyle = '#7d7d7d'; c.fillRect(14.5, 20, 3, 6); rr(c, 8, 25, 16, 4, 2); c.fillStyle = '#9a9a9a'; c.fill(); OUT(c, '#404040', 0.9);
    circ(c, 16, 13, 10); c.fillStyle = rg(c, 12, 9, 1, 16, 13, 10, [[0, '#ffffff'], [0.6, '#d3d7de'], [1, '#8e939c']]); c.fill(); OUT(c, '#454a52', 1);
    circ(c, 16, 13, 5); c.fillStyle = rg(c, 14.5, 11.5, 0.5, 16, 13, 5, [[0, '#9fd8ff'], [0.5, '#1d5fc0'], [1, '#0a1f50']]); c.fill();
    circ(c, 14.6, 11.6, 1.3); c.fillStyle = '#fff'; c.fill();
  };
  IC.audio = (c) => {
    c.strokeStyle = '#2b2b2b'; c.lineWidth = 2.6; c.beginPath(); c.arc(16, 16, 11, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    rr(c, 2.5, 14, 7, 11, 3); c.fillStyle = lg(c, 0, 14, 0, 25, [[0, '#6a6a6a'], [1, '#1b1b1b']]); c.fill();
    rr(c, 22.5, 14, 7, 11, 3); c.fill();
    c.strokeStyle = '#2b2b2b'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(6, 25); c.quadraticCurveTo(8, 30, 15, 29); c.stroke();
    circ(c, 15.5, 29, 1.8); c.fillStyle = '#e04a2a'; c.fill();
  };
  IC.activity = (c) => {
    const cols = ['#ff5a3c', '#ffc51c', '#34b44a', '#2f86ea'];
    for (let k = 0; k < 4; k++) {
      c.save(); c.translate(16, 16); c.rotate(k * Math.PI / 2 + 0.3);
      ell(c, 0, -7, 5, 8); c.fillStyle = cols[k]; c.fill(); OUT(c, 'rgba(0,0,0,0.45)', 0.8);
      c.restore();
    }
    circ(c, 16, 16, 3.4); c.fillStyle = '#fff'; c.fill(); OUT(c, '#555', 0.8);
  };
  IC.games = (c) => {
    c.save(); c.translate(16, 17); c.rotate(-0.2);
    rr(c, -11, -11, 22, 22, 4); c.fillStyle = lg(c, 0, -11, 0, 11, [[0, '#ffffff'], [1, '#d6d6d6']]); c.fill(); OUT(c, '#444', 1.1);
    c.fillStyle = '#d42a2a'; circ(c, 0, 0, 2.6); c.fill();
    c.fillStyle = '#222'; for (const [a, b] of [[-6, -6], [6, 6], [-6, 6], [6, -6]]) { circ(c, a, b, 1.9); c.fill(); }
    c.restore();
  };
  // Outlook Express toolbar icons
  const paper = (c) => { c.beginPath(); c.moveTo(6, 4); c.lineTo(20, 4); c.lineTo(25, 9); c.lineTo(25, 28); c.lineTo(6, 28); c.closePath(); c.fillStyle = '#fff'; c.fill(); OUT(c, '#6b7a90', 1); c.fillStyle = '#b3c1d8'; for (let i = 0; i < 5; i++) c.fillRect(9, 11 + i * 3, 12, 1); };
  const arrowL = (c, x, y, col) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8, y - 7); c.lineTo(x + 8, y - 3); c.quadraticCurveTo(x + 17, y - 3, x + 19, y + 6); c.quadraticCurveTo(x + 15, y + 2, x + 8, y + 3); c.lineTo(x + 8, y + 7); c.closePath(); c.fillStyle = col; c.fill(); OUT(c, 'rgba(0,0,0,0.55)', 0.9); };
  IC.reply = (c) => { paper(c); arrowL(c, 1, 17, '#f2b01e'); };
  IC.replyall = (c) => { paper(c); arrowL(c, 4, 20, '#f2b01e'); arrowL(c, 0, 14, '#f7cc4e'); };
  IC.forward = (c) => { paper(c); c.save(); c.translate(32, 0); c.scale(-1, 1); arrowL(c, 1, 18, '#2f86ea'); c.restore(); };
  IC.print = (c) => {
    c.fillStyle = '#fff'; c.fillRect(9, 3, 14, 10); c.strokeStyle = '#666'; c.lineWidth = 0.9; c.strokeRect(9, 3, 14, 10);
    rr(c, 3, 12, 26, 11, 2); c.fillStyle = lg(c, 0, 12, 0, 23, [[0, '#e9e6dc'], [1, '#a9a495']]); c.fill(); OUT(c, '#4d4a40', 1);
    c.fillStyle = '#fff'; c.fillRect(9, 20, 14, 9); c.strokeRect(9, 20, 14, 9);
    c.fillStyle = '#3fc43f'; c.fillRect(24, 15, 2.5, 2);
  };
  IC.del = (c) => { c.strokeStyle = '#d0201a'; c.lineWidth = 5; c.beginPath(); c.moveTo(7, 7); c.lineTo(25, 25); c.moveTo(25, 7); c.lineTo(7, 25); c.stroke(); c.strokeStyle = '#ff8a7a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(7, 7); c.lineTo(25, 25); c.stroke(); };
  IC.up = (c) => { c.beginPath(); c.moveTo(16, 4); c.lineTo(28, 17); c.lineTo(21, 17); c.lineTo(21, 28); c.lineTo(11, 28); c.lineTo(11, 17); c.lineTo(4, 17); c.closePath(); c.fillStyle = lg(c, 0, 4, 0, 28, [[0, '#8fe36a'], [1, '#2a9a1e']]); c.fill(); OUT(c, '#1d6a12', 1); };
  IC.down = (c) => { c.save(); c.translate(0, 32); c.scale(1, -1); IC.up(c); c.restore(); };
  IC.book = (c) => { rr(c, 5, 3, 21, 26, 1.5); c.fillStyle = lg(c, 5, 0, 26, 0, [[0, '#2f5fb8'], [1, '#5d8fe6']]); c.fill(); OUT(c, '#1a3570', 1); c.fillStyle = '#fff'; c.fillRect(24, 5, 3, 22); circ(c, 15.5, 13, 3.4); c.fillStyle = '#ffd9b5'; c.fill(); c.beginPath(); c.moveTo(9.5, 23); c.quadraticCurveTo(15.5, 14, 21.5, 23); c.fill(); };
  IC.clip = (c) => { c.strokeStyle = '#555'; c.lineWidth = 2; c.beginPath(); c.moveTo(20, 8); c.lineTo(11, 20); c.quadraticCurveTo(8, 25, 12, 27); c.quadraticCurveTo(16, 29, 19, 24); c.lineTo(26, 13); c.quadraticCurveTo(28, 8, 24, 6); c.quadraticCurveTo(20, 4, 17, 9); c.lineTo(11, 18); c.stroke(); };
  IC.gif = (c) => { rr(c, 4, 6, 24, 20, 1.5); c.fillStyle = lg(c, 0, 6, 0, 26, [[0, '#ffd1e8'], [1, '#ff8cc6']]); c.fill(); OUT(c, '#7a2a52', 1); circ(c, 16, 14, 4); c.fillStyle = '#ffdcbc'; c.fill(); c.fillStyle = '#5a2d0c'; c.fillRect(12, 9.5, 8, 2.6); c.font = 'bold 7px Tahoma'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('GIF', 16, 25); };

  // ---------------------------------------------------------------- Luna chrome
  const TITLE_A = [[0, '#0997ff'], [0.08, '#0053ee'], [0.4, '#0050ee'], [0.88, '#0066ff'], [0.93, '#0066ff'], [0.95, '#005bff'], [0.96, '#003dd7'], [1, '#003dd7']];
  const TITLE_I = [[0, '#c6d5f6'], [0.08, '#9eb4ee'], [0.4, '#97adec'], [0.88, '#a9bdf2'], [0.93, '#a9bdf2'], [0.95, '#a0b4ee'], [0.96, '#8aa1e0'], [1, '#8aa1e0']];
  function capBtn(c, x, y, s, kind, act) {
    c.save();
    rr(c, x, y, s, s, 6);
    const st = kind === 'close'
      ? [[0, '#cc4600'], [0.55, '#dc6527'], [0.7, '#cd7546'], [0.9, '#ffccb2'], [1, '#ffffff']]
      : [[0, '#0054e9'], [0.55, '#2263d5'], [0.7, '#4479e4'], [0.9, '#a3bbec'], [1, '#ffffff']];
    c.fillStyle = rg(c, x + s * 0.9, y + s * 0.9, 0, x + s * 0.9, y + s * 0.9, s * 1.3, st);
    c.fill();
    if (!act) { c.fillStyle = 'rgba(200,215,245,0.45)'; c.fill(); }
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#fff'; c.fillStyle = '#fff';
    if (kind === 'close') {
      c.lineWidth = 4.2; c.lineCap = 'square';
      c.beginPath(); c.moveTo(x + s * 0.3, y + s * 0.3); c.lineTo(x + s * 0.7, y + s * 0.7); c.moveTo(x + s * 0.7, y + s * 0.3); c.lineTo(x + s * 0.3, y + s * 0.7); c.stroke();
    } else if (kind === 'min') {
      c.fillRect(x + s * 0.24, y + s * 0.64, s * 0.34, 5);
    } else {
      c.lineWidth = 2.4; c.strokeRect(x + s * 0.25, y + s * 0.25, s * 0.5, s * 0.48); c.fillRect(x + s * 0.25, y + s * 0.25, s * 0.5, 4.5);
    }
    c.restore();
  }
  function luna(c, x, y, w, h, o) {
    const th = o.th || 44, bw = 6, r = 14, act = o.active !== false;
    c.save();
    rr(c, x, y, w, h, [r, r, 2, 2]);
    c.fillStyle = act ? '#0831d9' : '#7d93d6';
    c.fill();
    c.save();
    rr(c, x + 1, y + 1, w - 2, h - 2, [r - 1, r - 1, 1, 1]);
    c.clip();
    c.fillStyle = act ? '#0855dd' : '#a2b5ea'; c.fillRect(x, y, w, h);
    c.fillStyle = act ? '#166aee' : '#bccaf2'; c.fillRect(x + 1, y + th, 2, h - th);
    c.fillStyle = act ? '#001ea0' : '#7487c9'; c.fillRect(x + w - 3, y + th, 2, h - th); c.fillRect(x, y + h - 3, w, 2);
    c.fillStyle = lg(c, 0, y, 0, y + th, act ? TITLE_A : TITLE_I); c.fillRect(x, y, w, th);
    c.fillStyle = lg(c, x, 0, x + Math.min(320, w * 0.4), 0, [[0, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(x, y, w, th);
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x, y + 1, w, 1.5);
    c.restore();
    c.fillStyle = o.client || '#ece9d8';
    c.fillRect(x + bw, y + th, w - 2 * bw, h - th - bw);
    let tx = x + 16;
    if (o.icon) { icon(c, o.icon, x + 12, y + (th - 30) / 2, 30); tx = x + 50; }
    const bs = 36, nb = o.buttons === 'close' ? 1 : 3;
    const tmax = w - (tx - x) - nb * (bs + 4) - 24;
    const title = fit(c, o.title, 25, tmax, { font: FT, weight: 'bold' });
    T(c, title, tx, y + th * 0.5 + 2, 25, { font: FT, weight: 'bold', color: act ? '#fff' : '#e8eefc', base: 'middle', shadow: act ? ['#0a1a8a', 2, 2, 0] : null });
    const by = y + (th - bs) / 2 + 1;
    let bx = x + w - 10 - bs;
    capBtn(c, bx, by, bs, 'close', act);
    if (nb === 3) { bx -= bs + 4; capBtn(c, bx, by, bs, 'max', act); bx -= bs + 4; capBtn(c, bx, by, bs, 'min', act); }
    c.restore();
  }
  function xpBtn(c, x, y, w, h, label, o = {}) {
    c.save();
    rr(c, x, y, w, h, 6);
    c.fillStyle = o.pressed ? lg(c, 0, y, 0, y + h, [[0, '#cdcac3'], [0.15, '#e3e2da'], [1, '#efeee9']]) : lg(c, 0, y, 0, y + h, [[0, '#ffffff'], [0.86, '#ecebe6'], [1, '#d6d0c5']]);
    c.fill();
    c.strokeStyle = '#003c74'; c.lineWidth = 2; c.stroke();
    if (o.focus && !o.pressed) {
      rr(c, x + 3, y + 3, w - 6, h - 6, 4); c.strokeStyle = '#98b8ea'; c.lineWidth = 3; c.stroke();
      c.fillStyle = 'rgba(206,231,255,0.9)'; c.fillRect(x + 6, y + 3, w - 12, 2);
    }
    T(c, label, x + w / 2 + (o.pressed ? 1 : 0), y + h / 2 + (o.pressed ? 3 : 2), o.size || 26, { align: 'center', base: 'middle', color: '#000' });
    if (o.focus) { c.setLineDash([2, 2]); c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 1; c.strokeRect(x + 8.5, y + 7.5, w - 17, h - 15); c.setLineDash([]); }
    c.restore();
  }

  // ---------------------------------------------------------------- Bliss wallpaper (baked)
  const CREST = [
    [[-30, 640], [240, 588], [520, 542], [770, 538]],
    [[770, 538], [1010, 534], [1250, 598], [1490, 660]],
    [[1490, 660], [1660, 704], [1800, 728], [1960, 742]],
  ];
  const BACK = [[[1180, 742], [1420, 662], [1680, 628], [1960, 640]]];
  const bz = (s, t) => {
    const u = 1 - t;
    return [u * u * u * s[0][0] + 3 * u * u * t * s[1][0] + 3 * u * t * t * s[2][0] + t * t * t * s[3][0], u * u * u * s[0][1] + 3 * u * u * t * s[1][1] + 3 * u * t * t * s[2][1] + t * t * t * s[3][1]];
  };
  const crestPts = [];
  CREST.forEach((s) => { for (let k = 0; k <= 60; k++) crestPts.push(bz(s, k / 60)); });
  function crestY(x) {
    for (let i = 1; i < crestPts.length; i++) {
      const a = crestPts[i - 1], b = crestPts[i];
      if (x >= a[0] && x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / Math.max(1e-6, b[0] - a[0]);
    }
    return x < 0 ? crestPts[0][1] : crestPts[crestPts.length - 1][1];
  }
  function hillPath(c, segs, bottom) {
    c.beginPath();
    c.moveTo(segs[0][0][0], segs[0][0][1]);
    segs.forEach((s) => c.bezierCurveTo(s[1][0], s[1][1], s[2][0], s[2][1], s[3][0], s[3][1]));
    const last = segs[segs.length - 1][3];
    c.lineTo(last[0], bottom); c.lineTo(segs[0][0][0], bottom); c.closePath();
  }
  // windows hide most of the wallpaper; skip brush work there (bake speed)
  const hidden = (x, y, m = 0) =>
    y > TBY + m || (x > OE.x + m && x < OE.x + OE.w - m && y > OE.y + m && y < OE.y + OE.h - m) || (x > MSN.x + m && x < MSN.x + MSN.w - m && y > MSN.y + m && y < MSN.y + MSN.h - m);

  function cloud(c, cx, cy, sx, sy, n, seed) {
    const r = V.rng(seed);
    const pf = (x, y, rx, ry, a) => { c.globalAlpha = a; ell(c, x, y, rx, ry); c.fill(); };
    c.save();
    c.filter = 'blur(18px)'; c.fillStyle = '#b8cdea';
    for (let i = 0; i < n; i++) pf(cx + (r() - 0.5) * sx, cy + sy * 0.22 + (r() - 0.5) * sy * 0.3, sx * (0.1 + 0.08 * r()), sy * (0.22 + 0.12 * r()), 0.55);
    c.filter = 'blur(11px)'; c.fillStyle = '#ffffff';
    for (let i = 0; i < n; i++) pf(cx + (r() - 0.5) * sx * 0.95, cy - sy * 0.06 + (r() - 0.5) * sy * 0.5, sx * (0.07 + 0.08 * r()), sy * (0.2 + 0.18 * r()), 0.8);
    c.filter = 'blur(4px)';
    for (let i = 0; i < n * 0.7; i++) pf(cx + (r() - 0.5) * sx * 0.8, cy - sy * 0.22 + (r() - 0.5) * sy * 0.3, sx * (0.03 + 0.05 * r()), sy * (0.1 + 0.1 * r()), 0.55);
    c.restore();
  }
  function cirrus(c, cx, cy, len, ang, n, seed) {
    const r = V.rng(seed);
    c.save();
    c.filter = 'blur(7px)'; c.fillStyle = '#ffffff';
    for (let i = 0; i < n; i++) {
      const d = (r() - 0.5) * len, off = (r() - 0.5) * len * 0.18;
      c.globalAlpha = 0.18 + r() * 0.3;
      ell(c, cx + Math.cos(ang) * d - Math.sin(ang) * off, cy + Math.sin(ang) * d + Math.cos(ang) * off, len * (0.12 + r() * 0.2), 3 + r() * 6, ang + (r() - 0.5) * 0.2);
      c.fill();
    }
    c.restore();
  }
  function blissBase(c) {
    c.fillStyle = lg(c, 0, 0, 0, 760, [[0, '#2358c6'], [0.3, '#3a7cdc'], [0.62, '#69a8ee'], [0.86, '#a9cff6'], [1, '#d8ebfc']]);
    c.fillRect(0, 0, W, H);
    c.fillStyle = lg(c, 0, 0, W, 0, [[0, 'rgba(255,255,255,0.08)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(8,30,120,0.12)']]);
    c.fillRect(0, 0, W, H);
    // sky clouds — a cumulus bank left of the MSN window, wisps up top, puffs on the right edge
    cirrus(c, 1500, 70, 760, -0.08, 26, 11);
    cirrus(c, 300, 300, 520, 0.05, 16, 12);
    cloud(c, 590, 230, 560, 150, 26, 21);
    cloud(c, 120, 470, 330, 110, 16, 22);
    cloud(c, 1830, 360, 300, 140, 16, 23);
    cloud(c, 1790, 560, 420, 90, 12, 24);
    cloud(c, 1180, 26, 700, 70, 18, 25);
    // far hill on the right (cooler, hazier)
    hillPath(c, BACK, 1100);
    c.fillStyle = lg(c, 0, 620, 0, 820, [[0, '#4f9139'], [1, '#2f6e22']]); c.fill();
    c.fillStyle = 'rgba(160,200,235,0.22)'; c.fill();
    // the hill
    hillPath(c, CREST, 1100);
    c.fillStyle = lg(c, 0, 530, 0, 1080, [[0, '#a8da5a'], [0.07, '#80c63c'], [0.28, '#5ba52d'], [0.62, '#418d23'], [1, '#2a6a16']]);
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = rg(c, 760, 600, 20, 760, 640, 820, [[0, 'rgba(225,255,150,0.38)'], [0.5, 'rgba(200,245,120,0.10)'], [1, 'rgba(0,0,0,0)']]);
    c.fillRect(0, 0, W, H);
    c.fillStyle = rg(c, 0, 1080, 40, 0, 1080, 900, [[0, 'rgba(10,40,5,0.45)'], [1, 'rgba(10,40,5,0)']]);
    c.fillRect(0, 0, W, H);
    // the faint lighter swath that runs across Bliss
    c.filter = 'blur(26px)';
    c.fillStyle = 'rgba(190,240,120,0.22)';
    c.beginPath(); c.moveTo(-50, 760); c.bezierCurveTo(400, 690, 900, 700, 1960, 860); c.lineTo(1960, 930); c.bezierCurveTo(900, 780, 400, 770, -50, 840); c.closePath(); c.fill();
    c.filter = 'none';
    c.restore();
    // bright rim right under the skyline
    c.save();
    c.strokeStyle = 'rgba(214,250,140,0.55)'; c.lineWidth = 5; c.filter = 'blur(2px)';
    c.beginPath(); c.moveTo(crestPts[0][0], crestPts[0][1] + 3); crestPts.forEach((p) => c.lineTo(p[0], p[1] + 3)); c.stroke();
    c.restore();
  }
  function blissBrush() {
    const r = V.rng(2006);
    // watercolour bloom inside the big cumulus (gives the "photo" cloud a soft body)
    [[590, 225, 230, 60], [1830, 350, 110, 50], [130, 470, 130, 40]].forEach(([x, y, rx, ry], i) => {
      V.fill(V.ellipsePts(x, y, rx, ry, 28), { color: '#ffffff', alpha: 0.32, flat: false, bleed: 0.3, tex: 0.5, border: 0.6, seed: 40 + i });
    });
    // coloured-pencil grass streaks that follow the curve of the hill
    let n = 0;
    for (let i = 0; i < 1400 && n < 520; i++) {
      const x = -40 + r() * (W + 80);
      const cy = crestY(x);
      const y = cy + 6 + Math.pow(r(), 1.25) * (TBY + 20 - cy);
      if (hidden(x, y, 40)) continue;
      n++;
      const depth = V.clamp((y - cy) / 420);
      const sl = (crestY(x + 20) - crestY(x - 20)) / 40;
      const ang = Math.atan(sl * (1 - depth * 0.7)) + (r() - 0.5) * 0.08;
      const len = 50 + r() * 170 * (0.5 + depth);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const bow = (r() - 0.5) * 8;
      const pts = [[x - ca * len * 0.5, y - sa * len * 0.5], [x - sa * bow, y + ca * bow], [x + ca * len * 0.5, y + sa * len * 0.5]];
      const light = r() < 0.48;
      V.ink(pts, {
        brush: r() < 0.5 ? 'cpencil' : '2H', smooth: true,
        color: light ? (depth < 0.3 ? '#c6ec7e' : '#94d052') : depth < 0.4 ? '#4f9a2a' : '#2a6a1c',
        alpha: (light ? 0.12 : 0.18) + r() * 0.2, w: 0.6 + r() * 0.9, wob: 0.8, wobLen: 120, seed: 300 + i, taper: [40, 40],
      });
    }
    // grass fuzz along the skyline
    for (let x = -10; x < W + 10; x += 4) {
      const y = crestY(x);
      if (hidden(x, y, 2)) continue;
      V.ink([[x, y + 5], [x + (r() - 0.5) * 3, y - 1 - r() * 4]], { brush: 'HB', color: r() < 0.5 ? '#9bd357' : '#5f9f32', w: 0.6, alpha: 0.75, wob: 0, seed: 900 + x, taper: [0, 3] });
    }
  }
  function blissFinish(c) {
    // a whisper of photographic softness: cool corner falloff
    c.fillStyle = rg(c, W * 0.45, H * 0.42, H * 0.35, W * 0.5, H * 0.5, W * 0.7, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(5,20,60,0.22)']]);
    c.fillRect(0, 0, W, H);
  }

  // ---------------------------------------------------------------- desktop icons
  const DESK = [
    { ic: IC.computer, label: '我的電腦', y: 300 },
    { ic: IC.wretch, label: '無名小站', y: 440 },
    { ic: IC.recycle, label: '資源回收筒', y: 580 },
    { ic: IC.exe, label: '67.exe', y: 720, sel: true },
    { ic: IC.txt, label: '轉寄.txt', y: 860 },
  ];
  function deskIcon(c, d) {
    const cx = 110, s = 72;
    // render at 32 px then blow up with nearest-neighbour: the chunky look of an XP icon on a big screen
    const sm = canvasOnce('xpicon_' + d.label, 32, 32, (k) => {
      icon(k, d.ic, 0, 0, 32);
      if (d.sel) { k.globalCompositeOperation = 'source-atop'; k.fillStyle = 'rgba(49,106,197,0.5)'; k.fillRect(0, 0, 32, 32); }
    });
    c.save();
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 0.35; c.filter = 'blur(1.5px)'; c.drawImage(sm, cx - s / 2 + 4, d.y + 5, s, s); // XP icon drop shadow
    c.filter = 'none'; c.globalAlpha = 1;
    c.drawImage(sm, cx - s / 2, d.y, s, s);
    c.restore();
    const ty = d.y + s + 30, size = 24;
    const tw = TW(c, d.label, size);
    if (d.sel) {
      c.fillStyle = '#316ac5'; c.fillRect(cx - tw / 2 - 6, ty - 24, tw + 12, 32);
      c.save(); c.setLineDash([2, 2]); c.strokeStyle = '#ffe9a6'; c.lineWidth = 1; c.strokeRect(cx - tw / 2 - 5.5, ty - 23.5, tw + 11, 31); c.restore();
      T(c, d.label, cx, ty, size, { align: 'center', color: '#fff' });
    } else {
      T(c, d.label, cx, ty, size, { align: 'center', color: '#fff', shadow: ['rgba(0,0,0,0.9)', 2, 2, 1] });
    }
  }

  // ---------------------------------------------------------------- Outlook Express (static, baked)
  function paintOE(c) {
    const { x, y, w, h } = OE;
    luna(c, x, y, w, h, { title: 'Fw: Fw: Fw: 這個手勢超神！！', icon: IC.oe, active: false });
    const L = x + 6, R = x + w - 6;
    // menu bar
    let mx = L + 12;
    ['檔案(F)', '編輯(E)', '檢視(V)', '工具(T)', '訊息(M)', '說明(H)'].forEach((s) => { mx += T(c, s, mx, y + 67, 20) + 20; });
    c.fillStyle = '#d4d0c3'; c.fillRect(L, y + 78, R - L, 1); c.fillStyle = '#fff'; c.fillRect(L, y + 79, R - L, 1);
    // toolbar
    c.fillStyle = lg(c, 0, y + 80, 0, y + 156, [[0, '#fbfaf6'], [1, '#e4e1d3']]); c.fillRect(L, y + 80, R - L, 76);
    c.fillStyle = '#c9c5b6'; c.fillRect(L, y + 156, R - L, 1);
    const tools = [['回覆', IC.reply], ['全部回覆', IC.replyall], ['轉寄', IC.forward], ['列印', IC.print], ['刪除', IC.del], ['上一封', IC.up], ['下一封', IC.down], ['通訊錄', IC.book]];
    tools.forEach(([s, ic], i) => {
      const bx = L + 8 + i * 84;
      icon(c, ic, bx + 22, y + 86, 40);
      T(c, s, bx + 42, y + 148, 19, { align: 'center' });
      if (i === 2 || i === 4 || i === 6) { c.fillStyle = '#c9c5b6'; c.fillRect(bx + 84 - 2, y + 90, 1, 56); c.fillStyle = '#fff'; c.fillRect(bx + 84 - 1, y + 90, 1, 56); }
    });
    // header pane
    const hy = y + 158;
    c.fillStyle = lg(c, 0, hy, 0, hy + 124, [[0, '#f7f6f0'], [1, '#e9e6d9']]); c.fillRect(L, hy, R - L, 124);
    c.fillStyle = '#aca899'; c.fillRect(L, hy + 124, R - L, 1);
    const rows = [['寄件者：', '小美 <mei0607@yahoo.com.tw>'], ['日期：', '2006年6月7日 下午 06:07'], ['收件者：', '阿凱; 小安; 阿華; 小明; 阿妹; 阿嬤; 班導; 表姊…'], ['主旨：', 'Fw: Fw: Fw: 這個手勢超神！！']];
    rows.forEach(([a, b], i) => {
      const by = hy + 26 + i * 24;
      T(c, a, L + 104, by, 20, { align: 'right', weight: 'bold' });
      T(c, b, L + 112, by, 20, { color: '#111' });
    });
    T(c, '附件：', L + 104, hy + 26 + 4 * 24, 20, { align: 'right', weight: 'bold' });
    icon(c, IC.gif, L + 112, hy + 26 + 4 * 24 - 19, 24);
    T(c, '67手勢.gif (67 KB)', L + 140, hy + 26 + 4 * 24, 20, { color: '#0033cc' });
    c.fillStyle = '#0033cc'; c.fillRect(L + 140, hy + 26 + 4 * 24 + 3, TW(c, '67手勢.gif (67 KB)', 20), 1.5);
    // body (white, sunken)
    const by0 = hy + 128, bh = h - 158 - 128 - 34;
    c.fillStyle = '#fff'; c.fillRect(L + 4, by0, R - L - 8, bh);
    c.strokeStyle = '#7f9db9'; c.lineWidth = 1; c.strokeRect(L + 4.5, by0 + 0.5, R - L - 9, bh - 1);
    const bx = L + 24;
    T(c, '>>> -----原始郵件-----', bx, by0 + 30, 19, { color: '#808080' });
    T(c, '>>> 寄件者: 阿華  收件者: 全班', bx, by0 + 54, 19, { color: '#808080' });
    T(c, '這是真的！！！', bx, by0 + 102, 34, { font: FKAI, weight: 'bold', color: '#0000ff' });
    T(c, '看到請轉寄給 67 個人', bx, by0 + 160, 40, { font: FKAI, weight: 'bold', color: '#ff0000' });
    c.fillStyle = '#ff0000'; c.fillRect(bx, by0 + 168, TW(c, '看到請轉寄給 67 個人', 40, { font: FKAI, weight: 'bold' }), 3);
    T(c, '願望就會實現！！', bx, by0 + 214, 34, { font: FKAI, weight: 'bold', color: '#9900cc' });
    T(c, '不轉的人會倒楣 67 年', bx, by0 + 262, 32, { font: FKAI, weight: 'bold', color: '#ff6600' });
    // status bar
    c.fillStyle = '#ece9d8'; c.fillRect(L, y + h - 34, R - L, 28);
    c.fillStyle = '#aca899'; c.fillRect(L, y + h - 34, R - L, 1);
    T(c, '附件 1 個 ‧ 已轉寄 66 次', L + 12, y + h - 13, 18, { color: '#333' });
  }
  const GIF = { x: OE.x + 472, y: OE.y + 300, s: 138 };

  // ---------------------------------------------------------------- taskbar (static part, baked)
  const TB_STOPS = [[0, '#1f2f86'], [0.03, '#3165c4'], [0.06, '#3682e5'], [0.1, '#4490e6'], [0.12, '#3883e5'], [0.15, '#2b71e0'], [0.18, '#2663da'], [0.2, '#235bd6'], [0.23, '#2258d5'], [0.38, '#2157d6'], [0.54, '#245ddb'], [0.86, '#2562df'], [0.89, '#245fdc'], [0.92, '#2158d9'], [0.95, '#1d4ec0'], [0.98, '#1941a5'], [1, '#1941a5']];
  const TRAY_X = 1650;
  function paintTaskbar(c) {
    const y = TBY, h = TBH;
    c.fillStyle = lg(c, 0, y, 0, y + h, TB_STOPS); c.fillRect(0, y, W, h);
    // start button
    c.save();
    rr(c, 0, y, 178, h, [0, 24, 24, 0]);
    c.fillStyle = lg(c, 0, y, 0, y + h, [[0, '#3c8f3c'], [0.08, '#8fd98a'], [0.2, '#5cba55'], [0.55, '#3d9a3a'], [0.85, '#368c34'], [1, '#2a722a']]);
    c.fill();
    c.clip();
    c.fillStyle = rg(c, 178, y + h / 2, 4, 178, y + h / 2, 60, [[0, 'rgba(0,40,0,0.45)'], [1, 'rgba(0,40,0,0)']]); c.fillRect(0, y, 178, h);
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, y, 178, 3);
    c.restore();
    icon(c, IC.flag, 14, y + 8, 38);
    T(c, '開始', 60, y + h / 2 + 3, 32, { italic: true, weight: 'bold', base: 'middle', color: '#fff', font: FT, shadow: ['rgba(20,60,20,0.9)', 2, 2, 2] });
    // quick launch
    c.fillStyle = 'rgba(10,30,90,0.6)'; for (let k = 0; k < 9; k++) c.fillRect(192, y + 8 + k * 4.4, 2, 2);
    icon(c, IC.ie, 202, y + 11, 32); icon(c, IC.computer, 242, y + 11, 32); icon(c, IC.buddy, 282, y + 11, 32);
    c.fillStyle = 'rgba(10,30,90,0.6)'; for (let k = 0; k < 9; k++) c.fillRect(324, y + 8 + k * 4.4, 2, 2);
    // tray
    c.fillStyle = lg(c, 0, y, 0, y + h, [[0, '#0c59b9'], [0.06, '#139ee9'], [0.1, '#18b5f2'], [0.14, '#139beb'], [0.19, '#1290e8'], [0.63, '#0d8dea'], [0.81, '#0d9ff1'], [0.88, '#0f9eed'], [0.91, '#119be9'], [0.94, '#1392e2'], [0.97, '#137ed7'], [1, '#095bc9']]);
    c.fillRect(TRAY_X, y, W - TRAY_X, h);
    c.fillStyle = '#1042af'; c.fillRect(TRAY_X, y, 2, h); c.fillStyle = '#18bbff'; c.fillRect(TRAY_X + 2, y, 1, h);
    icon(c, IC.shield, TRAY_X + 14, y + 13, 28); icon(c, IC.buddy, TRAY_X + 48, y + 13, 28); icon(c, IC.net, TRAY_X + 82, y + 13, 28); icon(c, IC.speaker, TRAY_X + 116, y + 13, 28);
  }

  // ---------------------------------------------------------------- MSN conversation window (chrome cached)
  function paintMSN(c, act) {
    const w = MSN.w, h = MSN.h;
    luna(c, 0, 0, w, h, { title: K + ' - 交談', icon: IC.buddy, active: act, client: '#dfe9f7' });
    // MSN 7.5 skin
    c.fillStyle = lg(c, 0, 44, 0, h, [[0, '#f5f9fe'], [0.15, '#e2ecf9'], [0.6, '#d3e2f5'], [1, '#c3d6ef']]);
    c.fillRect(6, 44, w - 12, h - 50);
    // toolbar band
    c.fillStyle = lg(c, 0, 44, 0, 124, [[0, '#ffffff'], [0.55, '#e8f0fb'], [1, '#c9daf2']]); c.fillRect(6, 44, w - 12, 80);
    c.fillStyle = '#9bb4dc'; c.fillRect(6, 124, w - 12, 1); c.fillStyle = '#fff'; c.fillRect(6, 125, w - 12, 1);
    const tools = [['邀請', IC.invite], ['傳送檔案', IC.sendfile], ['視訊', IC.webcam], ['語音', IC.audio], ['活動', IC.activity], ['遊戲', IC.games]];
    tools.forEach(([s, ic], i) => { const bx = 20 + i * 94; icon(c, ic, bx + 25, 50, 44); T(c, s, bx + 47, 117, 19, { align: 'center', color: '#1e3a6e' }); });
    // MSN wordmark
    icon(c, IC.buddy, 640, 56, 50);
    T(c, 'msn', 694, 92, 34, { font: FT, weight: 'bold', italic: true, color: '#1d4fa8' });
    T(c, 'Messenger', 694, 114, 19, { font: FT, color: '#4a6fae' });
    // To: line
    let tx = T(c, '收件者：', 20, 154, 21, { color: '#334' }) + 22;
    tx += T(c, K, tx, 154, 21, { weight: 'bold', color: '#000' });
    T(c, ' <akai_67@hotmail.com>', tx + 2, 154, 20, { color: '#556' });
    // chat history panel
    rr(c, CP.x, CP.y, CP.w, CP.h, 5); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#7f9db9'; c.lineWidth = 1.5; c.stroke();
    // formatting bar
    const fy = 572;
    c.fillStyle = lg(c, 0, fy, 0, fy + 40, [[0, '#f1f6fd'], [1, '#d6e3f5']]); rr(c, CP.x, fy, CP.w, 40, 4); c.fill();
    icon(c, IC.smile, 26, fy + 4, 32, 'smile'); T(c, '▾', 60, fy + 28, 14, { color: '#333' });
    icon(c, IC.smile, 78, fy + 4, 32, 'wink'); T(c, '▾', 112, fy + 28, 14, { color: '#333' });
    icon(c, IC.nudge, NUDGE_BTN.x + 2, fy + 4, 32);
    icon(c, IC.mic, 186, fy + 4, 32);
    c.fillStyle = '#a9bcd9'; c.fillRect(230, fy + 6, 1, 28);
    icon(c, IC.font, 244, fy + 4, 32); icon(c, IC.bgimg, 288, fy + 4, 32);
    // input panel
    rr(c, IP.x, IP.y, IP.w, IP.h, 5); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#7f9db9'; c.lineWidth = 1.5; c.stroke();
    // handwriting / typing tabs
    rr(c, IP.x + 8, IP.y + IP.h - 34, 30, 26, 3); c.fillStyle = '#eef3fb'; c.fill(); c.strokeStyle = '#9fb4d6'; c.lineWidth = 1; c.stroke();
    T(c, 'A', IP.x + 23, IP.y + IP.h - 14, 18, { align: 'center', weight: 'bold', color: '#333' });
    rr(c, IP.x + 8, IP.y + 8, 30, 26, 3); c.fillStyle = '#ffe9a8'; c.fill(); c.strokeStyle = '#e0a400'; c.stroke();
    c.strokeStyle = '#333'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(IP.x + 15, IP.y + 28); c.lineTo(IP.x + 30, IP.y + 13); c.stroke();
    c.fillStyle = '#d23'; c.fillRect(IP.x + 28, IP.y + 12, 3, 3);
    c.fillStyle = '#e3e9f3'; c.fillRect(IP.x + 46, IP.y + 10, 1, IP.h - 20);
    xpBtn(c, IP.x + IP.w - 104, IP.y + 10, 94, 52, '傳送(S)', { size: 22 });
    xpBtn(c, IP.x + IP.w - 104, IP.y + 68, 94, 42, '搜尋', { size: 20 });
    // display picture frames
    [DP1, DP2].forEach((d) => {
      c.save();
      c.shadowColor = 'rgba(30,60,120,0.35)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
      rr(c, d.x, d.y, d.s, d.s, 9); c.fillStyle = '#fff'; c.fill();
      c.restore();
      rr(c, d.x, d.y, d.s, d.s, 9); c.strokeStyle = '#8aa6cf'; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = '#b9cbe6'; c.lineWidth = 1; c.strokeRect(d.x + 11.5, d.y + 11.5, d.s - 23, d.s - 23);
      // little drop-down chevron
      rr(c, d.x + d.s - 28, d.y + d.s + 6, 26, 18, 3); c.fillStyle = '#eef3fb'; c.fill(); c.strokeStyle = '#9fb4d6'; c.stroke();
      T(c, '▾', d.x + d.s - 15, d.y + d.s + 21, 14, { align: 'center', color: '#335' });
    });
  }

  // ---------------------------------------------------------------- the error box (cached)
  function paintDlg(c) {
    luna(c, 0, 0, DLG.w, DLG.h, { title: '六七.exe', active: true, buttons: 'close' });
    icon(c, IC.err, 26, 66, 64);
    T(c, '六七.exe 發生問題，必須關閉。', 110, 100, 34);
    T(c, '很抱歉造成您的不便。', 112, 140, 24, { color: '#333' });
    xpBtn(c, OK_BTN.x, OK_BTN.y, OK_BTN.w, OK_BTN.h, '確定', { focus: true });
  }

  // ---------------------------------------------------------------- characters
  // (1) pixel doll (像素娃娃) — the MSN display picture & the GIF in the chain letter. 46x46 pixels, blown up with nearest-neighbour.
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  let PIX = null;
  function pixCtx() {
    if (!PIX) { PIX = document.createElement('canvas'); PIX.width = 46; PIX.height = 46; }
    const c = PIX.getContext('2d');
    c.imageSmoothingEnabled = false;
    return c;
  }
  const DIG = { 6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '001', '010', '010'] };
  function doll(t, o) {
    const N = 46, c = pixCtx();
    const bg = canvasOnce('xpdollbg_' + o.key, N, N, (k) => {
      for (let y = 0; y < N; y++) {
        const lv = (y / (N - 1)) * (o.bg.length - 1), b = Math.min(o.bg.length - 2, Math.floor(lv)), f = lv - b;
        for (let x = 0; x < N; x++) { k.fillStyle = BAYER[y & 3][x & 3] / 16 < f ? o.bg[b + 1] : o.bg[b]; k.fillRect(x, y, 1, 1); }
      }
      k.fillStyle = o.ground; k.fillRect(0, 42, N, 4);
      k.fillStyle = o.ground2; for (let x = 0; x < N; x += 2) k.fillRect(x + ((x / 2) & 1), 42, 1, 1);
    });
    c.clearRect(0, 0, N, N);
    c.drawImage(bg, 0, 0);
    const P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
    const line = (x0, y0, x1, y1, sz, col) => {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy, g = 0;
      const off = Math.floor(sz / 2);
      c.fillStyle = col;
      while (g++ < 200) {
        c.fillRect(x0 - off, y0 - off, sz, sz);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    };
    // twinkles (on twos)
    o.stars.forEach(([x, y], i) => {
      const on = (V.tick + i) % 3 !== 0;
      P(x, y, 1, 1, '#fff');
      if (on) { P(x - 1, y, 1, 1, o.starC); P(x + 1, y, 1, 1, o.starC); P(x, y - 1, 1, 1, o.starC); P(x, y + 1, 1, 1, o.starC); }
    });
    const OL = o.ol, by = V.G.pulse(t) > 0.42 ? 1 : 0;
    const tl = V.G.tilt(t), hx = tl < -0.012 ? -1 : tl > 0.012 ? 1 : 0;
    const aL = V.G.arm(t, 0).y, aR = V.G.arm(t, 1).y, say = V.G.say(t);
    P(15, 44, 16, 1, 'rgba(0,0,0,0.18)');
    // legs + shoes
    P(17, 37 + by, 5, 7 - by, OL); P(24, 37 + by, 5, 7 - by, OL);
    P(18, 37 + by, 3, 5 - by, o.pants); P(25, 37 + by, 3, 5 - by, o.pants);
    P(18, 42, 3, 1, o.shoe); P(25, 42, 3, 1, o.shoe);
    // arms: shoulder -> elbow (tucked at the side) -> palm-up hand out to the side
    const arm = (side, ay) => {
      const s = side ? 1 : -1;
      const S = [23 + s * 7, 29 + by], E = [23 + s * 10, 35 + by], Hh = [23 + s * 17, 34 + by - Math.round(ay * 5)];
      const Wr = [Hh[0] - s * 2, Hh[1] + 1];
      return { S, E, Hh, Wr, s };
    };
    const arms = [arm(0, aL), arm(1, aR)];
    arms.forEach((a) => { line(a.S[0], a.S[1], a.E[0], a.E[1], 4, OL); line(a.E[0], a.E[1], a.Wr[0], a.Wr[1], 4, OL); });
    // torso
    P(15, 27 + by, 17, 12, OL); P(16, 26 + by, 15, 1, OL);
    P(16, 27 + by, 15, 11, o.top); P(17, 26 + by, 13, 1, o.top);
    P(28, 28 + by, 3, 10, o.topD); P(16, 37 + by, 15, 1, o.topD);
    if (o.hood) { P(21, 28 + by, 1, 3, '#fff'); P(25, 28 + by, 1, 3, '#fff'); }
    // "67" on the chest
    [6, 7].forEach((d, j) => DIG[d].forEach((row, ry) => row.split('').forEach((b, rx) => { if (b === '1') P(19 + j * 5 + rx, 31 + by + ry, 1, 1, o.print); })));
    arms.forEach((a) => {
      line(a.S[0], a.S[1], a.E[0], a.E[1], 2, o.top);
      line(a.E[0], a.E[1], a.Wr[0], a.Wr[1], 2, o.sleeve || o.top);
      // palm-up hand: a little cup, fingertips & thumb turned up
      const [x, y] = a.Hh;
      P(x - 3, y - 1, 7, 3, OL); P(x - 3, y - 2, 1, 1, OL); P(x + 3, y - 2, 1, 1, OL);
      P(x - 2, y - 1, 5, 1, o.palm); P(x - 2, y, 5, 1, o.skin);
      P(x - 3, y - 1, 1, 1, o.skin); P(x + 3, y - 1, 1, 1, o.skin);
    });
    // head
    const fx = 14 + hx, fy = 8 + by, fw = 18, fh = 18;
    if (o.pig) { [-1, 1].forEach((s) => { const px = s < 0 ? fx - 5 : fx + fw + 1; P(px - 1, fy + 3, 6, 9, OL); P(px, fy + 4, 4, 7, o.hair); P(px + 1, fy + 5, 1, 2, o.hairH); P(px, fy + 2, 4, 2, o.bow); }); }
    P(fx - 1, fy + 1, fw + 2, fh - 2, OL); P(fx, fy, fw, fh, OL); P(fx + 1, fy - 1, fw - 2, fh + 2, OL);
    P(fx, fy + 1, fw, fh - 2, o.skin); P(fx + 1, fy, fw - 2, fh, o.skin);
    P(fx + fw - 2, fy + 4, 1, fh - 6, o.skinD); P(fx + 2, fy + fh - 1, fw - 4, 1, o.skinD);
    // hair cap + bangs
    P(fx - 1, fy - 3, fw + 2, 5, OL); P(fx, fy - 4, fw, 1, OL);
    P(fx, fy - 3, fw, 5, o.hair);
    for (let x = 0; x < fw; x++) { const d = o.pig ? (x < 9 ? 3 - (x % 3 === 1) : 3 - (x % 3 === 0)) : (x % 4 < 2 ? 4 : 2); P(fx + x, fy + 2, 1, d, o.hair); }
    P(fx - 1, fy + 1, 2, 8, o.hair); P(fx + fw - 1, fy + 1, 2, 8, o.hair);
    if (!o.pig) for (let i = 0; i < 5; i++) { P(fx + 1 + i * 4, fy - 5, 2, 2, o.hair); P(fx + 1 + i * 4, fy - 6, 2, 1, OL); P(fx + i * 4, fy - 5, 1, 2, OL); }
    else { P(fx + 8, fy - 5, 3, 2, o.bow); P(fx + 7, fy - 6, 5, 1, OL); }
    P(fx + 3, fy - 2, 5, 1, o.hairH); P(fx + 11, fy - 1, 3, 1, o.hairH);
    // face: wide deadpan eyes, brows up on the beat
    const brow = say.env > 0.5 ? 1 : 0;
    P(fx + 3, fy + 6 - brow, 4, 1, o.hair); P(fx + 11, fy + 6 - brow, 4, 1, o.hair);
    P(fx + 4, fy + 8, 2, 4, '#1a1010'); P(fx + 12, fy + 8, 2, 4, '#1a1010');
    P(fx + 4, fy + 8, 1, 1, '#fff'); P(fx + 12, fy + 8, 1, 1, '#fff');
    P(fx + 2, fy + 12, 2, 1, '#ff9aa6'); P(fx + 14, fy + 12, 2, 1, '#ff9aa6');
    if (say.env > 0.35) { P(fx + 7, fy + 13, 4, 3, '#5a1414'); P(fx + 8, fy + 15, 2, 1, '#ff8a9a'); }
    else P(fx + 8, fy + 14, 2, 1, '#7a2e22');
    return PIX;
  }
  const DOLL_BOY = {
    key: 'boy', bg: ['#8fd0ff', '#bfe6ff', '#e6f6ff', '#fff6d9'], ground: '#9ad66a', ground2: '#6fbf45', stars: [[5, 6], [40, 9], [7, 22], [39, 24], [33, 4]], starC: '#ffe46a',
    ol: '#2a1610', skin: '#ffd9b5', skinD: '#efb98f', palm: '#fff0e0', hair: '#2b1a10', hairH: '#5c3b22', top: '#e8433a', topD: '#b42a22', sleeve: '#e8433a', print: '#fff', pants: '#34509a', shoe: '#222', hood: true,
  };
  const DOLL_GIRL = {
    key: 'girl', bg: ['#ffb3d9', '#ffd1e8', '#ffe8f3', '#fff8fb'], ground: '#ffc1dc', ground2: '#ff9cc8', stars: [[5, 5], [40, 7], [6, 24], [40, 26], [24, 2]], starC: '#ff5fa8',
    ol: '#3a1426', skin: '#ffe0c4', skinD: '#f2bf9c', palm: '#fff3e6', hair: '#6b3416', hairH: '#9a5a2c', top: '#ffffff', topD: '#d8d0e8', sleeve: '#ffffff', print: '#ff3d8b', pants: '#ff6fae', shoe: '#c0306a', pig: true, bow: '#ff2d6f',
  };

  // (2) MSN buddy display picture (vector): the green Messenger man, now with arms
  function buddyPic(c, x, y, s, t) {
    c.save();
    rr(c, x, y, s, s, 3); c.clip();
    c.fillStyle = lg(c, 0, y, 0, y + s, [[0, '#7cc2ff'], [0.6, '#d9f0ff'], [1, '#f4fbff']]); c.fillRect(x, y, s, s);
    c.fillStyle = rg(c, x + s * 0.5, y + s * 1.25, 10, x + s * 0.5, y + s * 1.25, s * 0.75, [[0, '#8fdc5a'], [0.98, '#6cc23e'], [1, 'rgba(108,194,62,0)']]); c.fillRect(x, y, s, s);
    // sun rays (Flash-era wallpaper of every default display pic)
    c.save(); c.globalAlpha = 0.18; c.fillStyle = '#fff';
    for (let k = 0; k < 10; k++) { const a = k * 0.63 + 0.2; c.beginPath(); c.moveTo(x + s * 0.5, y + s * 0.42); c.arc(x + s * 0.5, y + s * 0.42, s, a, a + 0.28); c.closePath(); c.fill(); }
    c.restore();
    const pl = V.G.pulse(t), bob = pl * 5;
    const aL = V.G.arm(t, 0).y, aR = V.G.arm(t, 1).y;
    const cx = x + s * 0.54, base = y + s + 4;
    // blue buddy peeking behind (left)
    c.beginPath(); c.moveTo(x - 4, base); c.quadraticCurveTo(x - 2, y + 122 + bob * 0.5, x + 34, y + 120 + bob * 0.5); c.quadraticCurveTo(x + 70, y + 122, x + 72, base); c.closePath();
    c.fillStyle = lg(c, 0, y + 120, 0, base, [[0, '#7cbcff'], [1, '#1f5fd0']]); c.fill();
    circ(c, x + 34, y + 96 + bob * 0.5, 21); c.fillStyle = rg(c, x + 27, y + 87, 2, x + 34, y + 96, 21, [[0, '#d2ebff'], [0.5, '#4f9bf3'], [1, '#1d58c4']]); c.fill();
    // green buddy body (the Messenger swoosh-torso)
    const sy = y + 118 + bob;
    c.beginPath(); c.moveTo(cx - 46, base); c.quadraticCurveTo(cx - 46, sy, cx, sy - 2); c.quadraticCurveTo(cx + 46, sy, cx + 46, base); c.closePath();
    c.fillStyle = lg(c, 0, sy, 0, base, [[0, '#9fea72'], [0.5, '#4fb72a'], [1, '#2a8a17']]); c.fill(); c.strokeStyle = '#1f6a10'; c.lineWidth = 2; c.stroke();
    // arms: elbows tucked at the sides, forearms out, palms up, seesawing
    [[-1, aL], [1, aR]].forEach(([sd, ay]) => {
      const S = [cx + sd * 30, sy + 14], E = [cx + sd * 40, sy + 36], Hd = [cx + sd * 60, sy + 24 - ay * 21];
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = '#1f6a10'; c.lineWidth = 17;
      c.beginPath(); c.moveTo(S[0], S[1]); c.lineTo(E[0], E[1]); c.lineTo(Hd[0], Hd[1]); c.stroke();
      c.strokeStyle = '#5cc535'; c.lineWidth = 12; c.stroke();
      c.strokeStyle = 'rgba(220,255,190,0.55)'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(S[0], S[1] - 3); c.lineTo(E[0], E[1] - 3); c.lineTo(Hd[0], Hd[1] - 3); c.stroke();
      // mitten, palm up (cupped), thumb toward the body
      const mx = Hd[0] + sd * 7, my = Hd[1] - 1;
      ell(c, mx, my, 14, 7.5, sd * 0.1); c.fillStyle = '#5cc535'; c.fill(); c.strokeStyle = '#1f6a10'; c.lineWidth = 2.4; c.stroke();
      ell(c, mx, my - 2.5, 9.5, 3.4, sd * 0.1); c.fillStyle = '#d2f9b4'; c.fill();
      ell(c, mx + sd * 12, my - 5, 3.6, 4.4); c.fillStyle = '#5cc535'; c.fill(); c.strokeStyle = '#1f6a10'; c.lineWidth = 2; c.stroke();
      ell(c, Hd[0] - sd * 2, my - 7, 3.4, 4.4); c.fillStyle = '#5cc535'; c.fill(); c.stroke();
    });
    // head
    const hy = y + 84 + bob;
    circ(c, cx, hy, 29); c.fillStyle = rg(c, cx - 10, hy - 12, 2, cx, hy, 29, [[0, '#e2ffc8'], [0.4, '#6dd23e'], [1, '#2a8a17']]); c.fill();
    c.strokeStyle = '#1f6a10'; c.lineWidth = 2; c.stroke();
    ell(c, cx - 9, hy - 13, 11, 5.5, -0.5); c.fillStyle = 'rgba(255,255,255,0.65)'; c.fill();
    c.restore();
  }

  // (3) the yellow MSN Wink smiley, with arms
  function wink(c, cx, cy, R, t) {
    const pl = V.G.pulse(t), say = V.G.say(t);
    cy += pl * 6;
    const arms = [0, 1].map((side) => {
      const sd = side ? 1 : -1, a = V.G.arm(t, side);
      const S = [cx + sd * R * 0.78, cy + R * 0.52];
      const Hd = [cx + sd * (R + 38), cy + R * 0.3 - a.y * R * 0.62];
      const e = V.ik(S[0], S[1], Hd[0], Hd[1], R * 0.62, R * 0.62, sd > 0 ? 1 : -1);
      return { sd, S, e, a };
    });
    // soft Flash-style shadow on the "stage"
    ell(c, cx, cy + R * 1.18, R * 0.9, R * 0.16); c.fillStyle = 'rgba(40,70,140,0.13)'; c.fill();
    arms.forEach(({ sd, S, e }) => {
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = '#8a5200'; c.lineWidth = 19;
      c.beginPath(); c.moveTo(S[0], S[1]); c.lineTo(e.ex, e.ey); c.lineTo(e.hx, e.hy); c.stroke();
      c.strokeStyle = '#ffd21c'; c.lineWidth = 13; c.stroke();
      c.strokeStyle = 'rgba(255,250,200,0.8)'; c.lineWidth = 4; c.beginPath(); c.moveTo(S[0], S[1] - 3); c.lineTo(e.ex, e.ey - 3); c.lineTo(e.hx, e.hy - 3); c.stroke();
    });
    // face
    c.save();
    c.translate(cx, cy);
    c.scale(1 + pl * 0.04, 1 - pl * 0.05);
    circ(c, 0, 0, R);
    c.fillStyle = rg(c, -R * 0.35, -R * 0.42, R * 0.05, 0, 0, R, [[0, '#fffbd2'], [0.32, '#ffe94c'], [0.74, '#ffc400'], [1, '#ee9300']]);
    c.fill();
    c.strokeStyle = '#8a5200'; c.lineWidth = 4; c.stroke();
    // lower rim shade
    c.save(); circ(c, 0, 0, R - 2); c.clip();
    ell(c, R * 0.1, R * 1.05, R * 1.1, R * 0.5); c.fillStyle = 'rgba(214,120,0,0.28)'; c.fill();
    c.restore();
    // eyes: big, wide, deadpan
    const eo = say.env > 0.55 ? 1.12 : 1;
    [-1, 1].forEach((s) => {
      ell(c, s * R * 0.3, -R * 0.16, R * 0.17, R * 0.24 * eo); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#5a3300'; c.lineWidth = 2.5; c.stroke();
      ell(c, s * R * 0.3 + s * 1.5, -R * 0.12, R * 0.09, R * 0.13); c.fillStyle = '#1b1000'; c.fill();
      circ(c, s * R * 0.3 - 2, -R * 0.18, R * 0.035); c.fillStyle = '#fff'; c.fill();
    });
    // mouth: "six"/"seven" on the beat, flat line between
    if (say.env > 0.3) {
      const op = V.clamp((say.env - 0.3) / 0.7);
      ell(c, 0, R * 0.42, R * (say.n === 6 ? 0.16 : 0.24), R * (0.08 + 0.16 * op)); c.fillStyle = '#6a1e00'; c.fill(); c.strokeStyle = '#5a3300'; c.lineWidth = 2.5; c.stroke();
      ell(c, 0, R * (0.47 + 0.06 * op), R * 0.1, R * 0.05 * op + 0.5); c.fillStyle = '#ff7a6a'; c.fill();
    } else {
      c.strokeStyle = '#5a3300'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-R * 0.2, R * 0.44); c.lineTo(R * 0.2, R * 0.44); c.stroke();
    }
    // gloss
    ell(c, -R * 0.36, -R * 0.56, R * 0.34, R * 0.17, -0.45);
    c.fillStyle = lg(c, 0, -R * 0.75, 0, -R * 0.4, [[0, 'rgba(255,255,255,0.95)'], [1, 'rgba(255,255,255,0.15)']]); c.fill();
    c.restore();
    // hands in front of everything (palm up)
    arms.forEach(({ sd, e }) => {
      const hx = e.hx + sd * 8, hy = e.hy - 1;
      ell(c, hx, hy, 21, 11, sd * 0.1); c.fillStyle = '#ffd21c'; c.fill(); c.strokeStyle = '#8a5200'; c.lineWidth = 3; c.stroke();
      ell(c, hx + sd * 1, hy - 3, 14.5, 5, sd * 0.1); c.fillStyle = '#fff3a6'; c.fill();
      ell(c, e.hx - sd * 3, e.hy - 9, 5, 6.5); c.fillStyle = '#ffd21c'; c.fill(); c.strokeStyle = '#8a5200'; c.lineWidth = 2.5; c.stroke();
      ell(c, hx + sd * 17, hy - 6, 5, 6); c.fillStyle = '#ffd21c'; c.fill(); c.strokeStyle = '#8a5200'; c.lineWidth = 2.5; c.stroke();
    });
    // Flash pop: "6" over the left hand on six, "7" over the right hand on seven
    const side = say.n === 6 ? 0 : 1, A = arms[side];
    const pk = V.clamp(say.k / 0.2), fade = say.k < 0.7 ? 1 : 1 - (say.k - 0.7) / 0.3;
    const sc = V.E.outBack(pk, 2.4);
    c.save();
    c.translate(A.e.hx - A.sd * 6, A.e.hy - 64);
    c.rotate(A.sd * 0.12);
    c.scale(sc, sc);
    c.globalAlpha = V.clamp(fade);
    T(c, String(say.n), 0, 0, 66, { font: FBLK, align: 'center', base: 'middle', color: say.n === 6 ? '#ff7a00' : '#ff1f8e', stroke: '#fff', strokeW: 9, shadow: ['rgba(0,0,40,0.35)', 3, 4, 2], shadowBoth: true });
    c.restore();
  }

  // ---------------------------------------------------------------- chat
  const CHAT = [
    { hdr: '小安 說：', at: -99 },
    { s: '在嗎？', at: -99, col: '#000' },
    { hdr: K + ' 說：', at: -99 },
    { s: 'ㄎㄎ', at: -99, emo: 'grin' },
    { s: '6', at: 0.0 },
    { s: '7', at: 0.5 },
    { s: '轉寄給 67 個人，', at: 1.0 },
    { s: '願望就會實現 ^_^', at: 1.0 },
    { s: '不轉會倒楣 67 年', at: 2.0 },
  ];
  function chat(c, u) {
    c.save();
    rr(c, CP.x + 2, CP.y + 2, CP.w - 4, CP.h - 4, 4); c.clip();
    const vis = CHAT.filter((m) => u >= m.at);
    const total = vis.reduce((a, m) => a + (m.hdr ? 34 : 48), 0);
    let y = CP.y + 8 - Math.max(0, total - (CP.h - 14)); // MSN auto-scrolls to the newest line
    const X = CP.x + 16;
    vis.forEach((m) => {
      if (m.hdr) {
        y += 34;
        T(c, m.hdr, X, y - 8, 23, { color: '#6d6d6d' });
      } else {
        y += 48;
        const w = T(c, m.s, X + 24, y - 11, 36, { color: m.col || '#1b45b8' });
        if (m.emo) icon(c, IC.smile, X + 24 + w + 8, y - 43, 36, m.emo);
      }
    });
    c.restore();
  }

  // ---------------------------------------------------------------- timing
  const SEVENS = [0.5, 1.5, 2.5, 3.5];
  function nudge(u) {
    for (const s of SEVENS) {
      const k = Math.floor((u - s) * 24 + 1e-4);
      if (k >= 0 && k < 5) return [[-11, 10, -9, 7, -3][k], [3, -3, 2, -2, 1][k]];
    }
    return [0, 0];
  }
  // handwriting (MSN 7 手寫): mouse-drawn "6" then "7", MSN-local coordinates
  const HW = [
    { d: 'M 66 6 C 46 8 22 28 16 54 C 10 80 26 96 46 94 C 66 92 76 76 68 62 C 60 50 40 50 30 60 C 24 66 22 72 22 78', t0: 1.0, dur: 0.42 },
    { d: 'M 112 24 C 112 17 114 13 118 11 C 136 11 156 10 176 8 C 166 31 152 60 144 95', t0: 1.5, dur: 0.4 },
  ];
  HW.forEach((h) => {
    const pts = V.parsePath(h.d, 3)[0].pts.map((p) => [p[0] + HZ.x, p[1] + HZ.y]);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    h.pts = pts; h.cum = cum; h.L = cum[cum.length - 1];
  });
  const hwProg = (h, u) => V.clamp((u - h.t0) / h.dur);
  function hwAt(h, p) {
    const s = p * h.L;
    let j = 0;
    while (j < h.cum.length - 2 && h.cum[j + 1] < s) j++;
    const f = (s - h.cum[j]) / Math.max(1e-6, h.cum[j + 1] - h.cum[j]);
    return [h.pts[j][0] + (h.pts[j + 1][0] - h.pts[j][0]) * f, h.pts[j][1] + (h.pts[j + 1][1] - h.pts[j][1]) * f];
  }
  const ERR_T = 2.5, CLICK_OK = 3.0, TRAIL_T = 3.08;
  const trailN = (u) => (u < TRAIL_T ? 0 : Math.min(7, Math.floor((u - TRAIL_T) * 12) + 1));
  const trailOff = (k) => [-17 * k, 19 * k];
  // mouse cursor path (screen coords); returns [x, y, pressed]
  function cursor(u, dx, dy) {
    const nb = [MSN.x + NUDGE_BTN.x + NUDGE_BTN.s / 2 + 2, MSN.y + NUDGE_BTN.y + NUDGE_BTN.s / 2 + 4];
    const p6 = HW[0], p7 = HW[1];
    const s6 = [MSN.x + p6.pts[0][0], MSN.y + p6.pts[0][1]];
    const s7 = [MSN.x + p7.pts[0][0], MSN.y + p7.pts[0][1]];
    const ok = (k) => { const o = trailOff(k); return [DLG.x + OK_BTN.x + OK_BTN.w * 0.55 + o[0], DLG.y + OK_BTN.y + OK_BTN.h * 0.55 + o[1]]; };
    const mv = (a, b, t0, t1) => { const e = V.E.io2(V.clamp((u - t0) / (t1 - t0))); return [V.lerp(a[0], b[0], e), V.lerp(a[1], b[1], e)]; };
    const start = [1300, 330];
    if (u < 0.32) return [...mv(start, nb, -0.6, 0.32), false];
    if (u < 0.5) return [...nb, u > 0.37 && u < 0.47];
    if (u < 1.0) return [...mv(nb, s6, 0.5, 0.96), false];
    if (u < 1.5) {
      const p = hwProg(p6, u);
      if (p < 1) { const q = hwAt(p6, p); return [MSN.x + q[0] + dx, MSN.y + q[1] + dy, true]; }
      const e6 = hwAt(p6, 1);
      return [...mv([MSN.x + e6[0], MSN.y + e6[1]], s7, p6.t0 + p6.dur, 1.49), false];
    }
    if (u < 2.0) {
      const p = hwProg(p7, u);
      const q = hwAt(p7, p);
      return [MSN.x + q[0] + dx, MSN.y + q[1] + dy, p < 1];
    }
    const e7 = [MSN.x + hwAt(p7, 1)[0], MSN.y + hwAt(p7, 1)[1]];
    const idle = [760, 700];
    if (u < 2.55) return [...mv(e7, idle, 1.95, 2.45), false];
    if (u < TRAIL_T) return [...mv(idle, ok(0), 2.55, 2.94), u > CLICK_OK - 0.03 && u < TRAIL_T];
    return [...ok(trailN(u)), (u - TRAIL_T) * 12 % 1 < 0.5];
  }
  function drawCursor(c, x, y, busy) {
    const s = 2.3;
    if (busy) {
      c.save();
      c.translate(x + 13 * s, y + 13 * s); c.scale(s, s);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(9, 0); c.lineTo(9, 1.5); c.lineTo(5.6, 6); c.lineTo(9, 10.5); c.lineTo(9, 12); c.lineTo(0, 12); c.lineTo(0, 10.5); c.lineTo(3.4, 6); c.lineTo(0, 1.5); c.closePath();
      c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowOffsetX = 1.2; c.shadowOffsetY = 1.2;
      c.fillStyle = '#fff'; c.fill(); c.shadowColor = 'transparent';
      c.lineWidth = 0.9; c.strokeStyle = '#000'; c.stroke();
      c.fillStyle = '#d9a300'; c.beginPath(); c.moveTo(2, 2.2); c.lineTo(7, 2.2); c.lineTo(4.5, 5.4); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(4.5, 7.6); c.lineTo(7.4, 10.4); c.lineTo(1.6, 10.4); c.closePath(); c.fill();
      c.restore();
    }
    const P = [[0, 0], [0, 17], [4, 13.2], [7, 19.6], [9.6, 18.5], [6.8, 12.2], [12, 12.2]];
    c.save();
    c.translate(x, y); c.scale(s, s);
    c.beginPath(); P.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
    c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowOffsetX = 2.5; c.shadowOffsetY = 2.5; c.shadowBlur = 2;
    c.fillStyle = '#fff'; c.fill();
    c.shadowColor = 'transparent';
    c.lineWidth = 1.1; c.lineJoin = 'miter'; c.strokeStyle = '#000'; c.stroke();
    c.restore();
  }

  // ---------------------------------------------------------------- per-frame pieces
  function msnDynamic(c, t, u, dx, dy) {
    const act = u < ERR_T;
    const chrome = canvasOnce(act ? 'xpmsn_a' : 'xpmsn_i', MSN.w, MSN.h, (k) => paintMSN(k, act));
    const [px, py] = nudge(u - 1 / 24);
    if (px !== dx || py !== dy) { // motion smear of the shaking window (one frame behind)
      c.save(); c.globalAlpha = 0.28; c.drawImage(chrome, MSN.x + px, MSN.y + py); c.restore();
    }
    c.save();
    c.translate(MSN.x + dx, MSN.y + dy);
    c.drawImage(chrome, 0, 0);
    // nudge button pressed / hover
    const cur = cursor(u, dx, dy);
    const overNudge = u > 0.15 && u < 0.62;
    if (overNudge) {
      const pressed = cur[2];
      rr(c, NUDGE_BTN.x - 2, NUDGE_BTN.y, NUDGE_BTN.s + 4, NUDGE_BTN.s + 2, 4);
      c.fillStyle = pressed ? 'rgba(255,190,90,0.75)' : 'rgba(255,231,160,0.7)'; c.fill();
      c.strokeStyle = pressed ? '#c27a00' : '#e6b04a'; c.lineWidth = 1.5; c.stroke();
      icon(c, IC.nudge, NUDGE_BTN.x + 2 + (pressed ? 1 : 0), 572 + 4 + (pressed ? 1 : 0), 32);
    }
    chat(c, u);
    // the Wink plays over the lower right of the history
    c.save();
    rr(c, CP.x + 2, CP.y + 2, CP.w - 4, CP.h - 4, 4); c.clip();
    wink(c, CP.x + 480, CP.y + 258, 60, t);
    c.restore();
    // display pictures
    c.save();
    c.imageSmoothingEnabled = false;
    c.drawImage(doll(t, DOLL_BOY), DP1.x + 12, DP1.y + 12, 184, 184);
    c.restore();
    buddyPic(c, DP2.x + 12, DP2.y + 12, 184, t);
    // status bar: typing indicator
    const typing = (u >= -1 && u < 0) || (u >= 0.62 && u < 1.0) || (u >= 1.62 && u < 2.0);
    const sy = MSN.h - 14;
    if (typing) {
      c.save(); c.translate(20, sy - 18); c.strokeStyle = '#333'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(2, 16); c.lineTo(14, 4); c.stroke(); c.restore();
      T(c, K + ' 正在輸入訊息...', 44, sy, 20, { color: '#26364f' });
    } else {
      T(c, '最後一次收到訊息的時間：下午 06:07，2006/6/7。', 20, sy, 20, { color: '#4a5a75' });
    }
    c.restore();
  }
  function oeGif(c, t) {
    c.save();
    c.fillStyle = '#fff'; c.fillRect(GIF.x - 3, GIF.y - 3, GIF.s + 6, GIF.s + 6);
    c.strokeStyle = '#9a9a9a'; c.lineWidth = 1; c.strokeRect(GIF.x - 3.5, GIF.y - 3.5, GIF.s + 7, GIF.s + 7);
    c.imageSmoothingEnabled = false;
    c.drawImage(doll(t, DOLL_GIRL), GIF.x, GIF.y, GIF.s, GIF.s);
    c.restore();
  }
  function dialogs(c, u) {
    if (u < ERR_T) return;
    const dlg = canvasOnce('xpdlg', DLG.w, DLG.h, paintDlg);
    const n = trailN(u);
    for (let k = 0; k <= n; k++) {
      const [ox, oy] = trailOff(k);
      const x = DLG.x + ox, y = DLG.y + oy;
      if (k === 0) {
        const p = V.prog(u, ERR_T, 0.16);
        const s = 0.82 + 0.18 * V.E.outBack(p, 2.2);
        c.save();
        c.globalAlpha = V.clamp(p * 4);
        c.translate(x + DLG.w / 2, y + DLG.h / 2); c.scale(s, s);
        c.drawImage(dlg, -DLG.w / 2, -DLG.h / 2);
        c.restore();
      } else c.drawImage(dlg, x, y);
      const top = k === n;
      const pressed = top && ((n === 0 && u > CLICK_OK - 0.03 && u < TRAIL_T) || (n > 0 && (u - TRAIL_T) * 12 % 1 < 0.5));
      if (pressed) xpBtn(c, x + OK_BTN.x, y + OK_BTN.y, OK_BTN.w, OK_BTN.h, '確定', { pressed: true, focus: true });
    }
  }
  function taskbarDyn(c, t, u) {
    const errOn = u >= ERR_T;
    const btns = [[IC.buddy, K + ' - 交談', !errOn], [IC.oe, 'Fw: Fw: Fw: 這個手勢超神！！', false]];
    if (errOn) btns.push([IC.err, '六七.exe', true]);
    btns.forEach(([ic, label, active], i) => {
      const bx = 340 + i * 304, by = TBY + 5, bw = 296, bh = TBH - 9;
      const grow = i === 2 ? V.E.out3(V.prog(u, ERR_T, 0.2)) : 1;
      c.save();
      rr(c, bx, by, bw * grow, bh, 5);
      c.fillStyle = active ? lg(c, 0, by, 0, by + bh, [[0, '#1b46a6'], [0.15, '#1e52b7'], [1, '#1c4fb4']]) : lg(c, 0, by, 0, by + bh, [[0, '#6aa3ff'], [0.1, '#3f84f4'], [0.85, '#3a7ef0'], [1, '#2a62d2']]);
      c.fill();
      c.strokeStyle = active ? 'rgba(10,25,80,0.8)' : 'rgba(20,50,140,0.75)'; c.lineWidth = 1.5; c.stroke();
      if (active) { c.fillStyle = 'rgba(0,0,40,0.35)'; c.fillRect(bx + 2, by + 2, bw * grow - 4, 3); }
      c.clip();
      icon(c, ic, bx + 10, by + 8, 30);
      T(c, fit(c, label, 22, bw - 60), bx + 48, by + bh / 2 + 2, 22, { base: 'middle', color: '#fff', weight: active ? 'bold' : 'normal', shadow: ['rgba(0,0,40,0.6)', 1, 1, 0] });
      c.restore();
    });
    // clock "6:07 PM" — the colon blinks once a second
    const on = V.fract(t) < 0.5;
    const size = 27, cy = TBY + TBH / 2 + 2, xr = W - 18;
    const wPM = TW(c, ' PM', size), w07 = TW(c, '07', size), wc = TW(c, ':', size), w6 = TW(c, '6', size);
    let x = xr - wPM - w07 - wc - w6;
    const o = { base: 'middle', color: '#fff', shadow: ['rgba(0,0,60,0.5)', 1, 1, 0] };
    T(c, '6', x, cy, size, o); x += w6;
    if (on) T(c, ':', x, cy, size, o);
    x += wc;
    T(c, '07', x, cy, size, o); x += w07;
    T(c, ' PM', x, cy, size, o);
  }

  // ---------------------------------------------------------------- scene
  function draw(t, u, meta) {
    // static desktop (wallpaper, icons, the chain letter, taskbar) — baked once
    V.bake('xp_desktop', () => {
      V.with2d((c) => blissBase(c));
      blissBrush();
      V.grain({ amt: 0.07, anim: false, mode: 'multiply' });
      V.with2d((c) => {
        blissFinish(c);
        DESK.forEach((d) => deskIcon(c, d));
        paintOE(c);
        paintTaskbar(c);
      });
    });
    const [dx, dy] = nudge(u);
    V.with2d((c) => {
      oeGif(c, t);
      msnDynamic(c, t, u, dx, dy);
    });
    // mouse-drawn handwriting ink (p5.brush), shakes with the window
    V.push();
    V.translate(MSN.x + dx, MSN.y + dy);
    HW.forEach((h, i) => {
      const p = hwProg(h, u);
      if (p <= 0.01) return;
      V.ink(h.pts, { brush: 'ink', color: '#14141c', w: 1.3, reveal: p, wob: 1.9, wobLen: 11, seed: 67 + i, taper: [4, 8], step: 4, head: 1 });
    });
    V.pop();
    V.with2d((c) => {
      dialogs(c, u);
      taskbarDyn(c, t, u);
      const cur = cursor(u, dx, dy);
      drawCursor(c, cur[0], cur[1], u >= TRAIL_T);
    });
    // HUD drawn here (noHud) so the year reads "2006", not "2,006"
    const st = Object.assign({}, (meta && meta.hud) || {});
    V.hudYear(u, Object.assign({}, meta, { yearText: '2006' }), st);
    V.hudLabel(u, meta, st);
  }

  V.scenes.xp = { draw, noHud: true };
})();
