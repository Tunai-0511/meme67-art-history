/* rig67.js — the shared "67" gesture + beat clock. EVERY scene syncs to this so the whole film moves as one.
 *
 * The gesture (the meme): both hands out in front, palms UP, bobbing alternately up and down like a seesaw / weighing two things,
 * one hand rising while the other drops, small fast motion from the forearms, usually with a deadpan or wide-eyed face and a tiny head bob.
 * Spoken: "six ... seven!" — "six" lands when the screen-LEFT hand is at its TOP, "seven" when the screen-RIGHT hand is at its TOP.
 *
 * Tempo is fixed: 120 BPM -> 1 beat = 0.5 s, 1 bar = 4 beats = 2.0 s, one full seesaw cycle (L up, R up) = 2 beats = 1.0 s.
 * Scenes start on bar lines (t0 is a multiple of 2 s), so use FILM time t (not scene-local u) for the gesture and everything is in phase.
 */
(function () {
  const G = (V.G = {});
  G.BPM = 120;
  G.beat = 0.5;
  G.bar = 2;
  G.b = (t) => t / G.beat; // film time in beats

  /**
   * Hand height for one hand. side: 0 = screen-left hand, 1 = screen-right hand.
   * returns { y, v, top }: y in -1..1 (+1 = hand at its highest, -1 = lowest) with a slightly squared-off wave (the hand "snaps" to each end),
   * v = rising(+)/falling(-) speed sign-ish (-1..1), top = 0..1 pulse that is 1 at the instant this hand is at its top.
   * o.k: squareness (default 1.5; 0.01 = pure sine), o.off: phase offset in beats.
   */
  G.arm = function (t, side, o = {}) {
    const k = o.k == null ? 1.5 : o.k;
    const ph = Math.PI * (G.b(t) + (o.off || 0)) + (side ? Math.PI : 0);
    const c = Math.cos(ph);
    const y = k < 0.02 ? c : Math.tanh(k * c) / Math.tanh(k);
    return { y, v: -Math.sin(ph), top: Math.pow(Math.max(0, c), 6) };
  };
  /** beat pulse: 1 at each beat onset, decaying to 0. Use for body squash / bobbing / flashes. d = decay rate. */
  G.pulse = (t, d = 7) => Math.exp(-d * V.fract(G.b(t)));
  /** smooth bob (-1..1) once per beat, lowest at the beat onset. */
  G.bob = (t) => -Math.cos(2 * Math.PI * G.b(t));
  /** which number is being "said": {n: 6|7, word: 'six'|'seven', idx: beat index, k: 0..1 time inside the beat, env: decaying hit envelope} */
  G.say = function (t) {
    const idx = Math.floor(G.b(t) + 1e-9), k = V.fract(G.b(t));
    const six = idx % 2 === 0;
    return { n: six ? 6 : 7, word: six ? 'six' : 'seven', idx, k, env: Math.exp(-5 * k) };
  };
  G.barIndex = (t) => Math.floor(t / G.bar);
  /** head tilt (radians) toward the hand that is up, small. */
  G.tilt = (t, amp = 0.06) => (G.arm(t, 0).y - G.arm(t, 1).y) * 0.5 * amp * -1;
})();
