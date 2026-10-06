"""build_audio.py — procedural soundtrack for the 67 film. Run: <venv>/bin/python audio/build_audio.py  -> audio/mix.wav (48 kHz stereo)
Every era plays the SAME two-note "six / seven" motif on its own period instruments, with a Kokoro voice chanting six (even beats) / seven (odd beats)
on the shared 120-BPM grid, treated per era (cave reverb, 8-bit crush, telephone band-limit, ...). Transitions = odometer ticks + whoosh; HUD = soft stamp.
"""
import json, os, sys
import numpy as np
import soundfile as sf
from scipy import signal
from dsp import *

ROOT = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(ROOT, "..", "public", "timeline.json")))
SC = {s["id"]: s for s in TL["scenes"]}
TOTAL = TL["duration"]
BEAT = 0.5
MASTER = Bus(TOTAL + 1.0)
CUES = {}
cf = os.path.join(ROOT, "cues.json")
if os.path.exists(cf):
    CUES = json.load(open(cf))  # optional extra hits: {"scene": [{"u":1.2,"name":"thud","gain":1}]}

# ------------------------------------------------------------------ voices
_wcache = {}


def word(voice, w, style="bang"):
    key = (voice, w, style)
    if key in _wcache:
        return _wcache[key]
    f = os.path.join(ROOT, "words_fast", f"{voice}_{w}_{style}.wav")
    a, sr = sf.read(f)
    a = a.astype(np.float64)
    if a.ndim > 1:
        a = a.mean(1)
    a = signal.resample_poly(a, SR // sr, 1)
    a = a / (np.max(np.abs(a)) + 1e-9) * 0.85
    # anchor = loudest 10 ms window in the first 300 ms (the vowel) so it lands ON the beat
    env = np.convolve(np.abs(a[: int(0.3 * SR)]), np.ones(int(0.01 * SR)) / int(0.01 * SR), mode="same")
    lead = int(np.argmax(env))
    _wcache[key] = (a, lead / SR)
    return _wcache[key]


def vfx(a, fx):
    if fx == "clean":
        return a
    if fx == "cave":
        a = resample(a, semis(-5)); a = lp(a, 3200); return a * 1.1
    if fx == "deep":
        return lp(resample(a, semis(-3)), 5000)
    if fx == "telephone":
        return saturate(bp(a, 320, 3300), 1.8) * 0.9
    if fx == "crush8":
        a = hp(a, 250); a = bitcrush(a, 5, 7000); return a * 0.8
    if fx == "kid":
        a = resample(a, semis(4.5)); return hp(a, 200) * 1.0
    if fx == "radio60":
        return saturate(bp(a, 250, 5200), 2.2) * 0.8
    if fx == "mp3":
        return lp(a, 7500) * 0.95
    if fx == "wobble":
        n = len(a); tt = np.arange(n) / SR
        idx = np.clip(np.arange(n) + 0.004 * SR * np.sin(2 * np.pi * 4.0 * tt), 0, n - 1)
        return np.interp(idx, np.arange(n), a)
    return a


def chant(S, t0, t1, voices, fx="clean", gain=0.9, send=0.3, pans=None, accent=1.25, flip=False, jitter=0.0, first_beat=0):
    k = first_beat
    t = t0
    while t < t1 - 0.02:
        beat_idx = int(round((SC_T0[S.id] + t) / BEAT))
        w = "six" if beat_idx % 2 == (1 if flip else 0) else "seven"
        for vi, v in enumerate(voices):
            a, lead = word(v, w, "bang" if w == "six" or True else "dot")
            a = vfx(a, fx)
            g = gain * (accent if (beat_idx % 4 == 0) else 1.0) / (len(voices) ** 0.5)
            p = (pans[vi] if pans else 0.0)
            tj = (np.random.default_rng(beat_idx * 7 + vi).uniform(-1, 1) * jitter) if jitter else 0.0
            S.hit(a, t - lead * (1 if fx != "cave" else 1.2) + tj, g, p, send)
        t += BEAT
        k += 1


SC_T0 = {s["id"]: s["t0"] for s in TL["scenes"]}


class Scene:
    def __init__(self, sid, tail=1.6, ir=None, wetgain=0.5):
        self.id = sid
        s = SC[sid]
        self.t0 = s["t0"]
        self.dur = s["t1"] - s["t0"]
        self.dry = Bus(self.dur + tail)
        self.wet = Bus(self.dur + tail)
        self.ir = ir
        self.wetgain = wetgain

    def hit(self, buf, tl, gain=1.0, pan=0.0, send=0.0):
        self.dry.add(buf, tl, gain, pan)
        if send:
            self.wet.add(buf, tl, gain * send, pan)

    def finish(self):
        L, R = self.dry.L.copy(), self.dry.R.copy()
        if self.ir is not None:
            wl = signal.fftconvolve(self.wet.L, self.ir)[: len(L)]
            wr = signal.fftconvolve(self.wet.R, self.ir[::-1] * 0.98)[: len(R)]
            L += wl * self.wetgain
            R += wr * self.wetgain
        n = min(len(L), MASTER.n - int(self.t0 * SR))
        i = int(self.t0 * SR)
        MASTER.L[i:i + n] += L[:n]
        MASTER.R[i:i + n] += R[:n]


def beats(S, bars=None):
    n = int(round(S.dur / BEAT))
    return [(k, k * BEAT) for k in range(n)]


IR_CAVE = reverb_ir(2.8, 1.0, 0.02, 0.2, 1)
IR_HALL = reverb_ir(1.8, 1.6, 0.012, 0.5, 2)
IR_CATH = reverb_ir(3.4, 0.9, 0.03, 0.35, 3)
IR_ROOM = reverb_ir(0.7, 2.6, 0.006, 0.6, 4)
IR_PLATE = reverb_ir(1.3, 2.0, 0.004, 0.9, 5)
IR_80S = reverb_ir(1.1, 2.0, 0.008, 0.8, 6)

# ----------------------------------------------------------------- scenes


def scene_intro():
    S = Scene("intro", 1.2, IR_HALL, 0.6)
    # room tone: low pad that swells
    S.hit(pad(midi(38), 4.0, 1.4, 0.5, 900) * 0.35, 0.0, 1, 0, 0.4)
    # typewriter ticks while the deadpan text types in (0.3 – 1.9 s)
    r = np.random.default_rng(3)
    for t in np.arange(0.35, 1.85, 0.075):
        S.hit(clack(0.05, 1600 + 600 * r.random()), t, 0.35, r.uniform(-0.3, 0.3), 0.1)
    # the slam: six at 2.0, seven at 2.5
    a, lead = word("am_adam", "six"); S.hit(vfx(a, "deep") * 1.1, 2.0 - lead, 1.2, -0.1, 0.8)
    S.hit(thud(0.7, 48), 2.0, 1.0, 0, 0.3); S.hit(whoosh(0.35, 800, 5000), 1.75, 0.4)
    a, lead = word("am_adam", "seven"); S.hit(vfx(a, "deep") * 1.1, 2.5 - lead, 1.2, 0.1, 0.8)
    S.hit(thud(0.7, 52), 2.5, 1.0, 0, 0.3)
    S.hit(bell(midi(74), 1.6, decay=0.9) * 0.4, 2.52, 1, 0, 0.8)
    S.hit(riser(1.0, 300, 7000) * 0.5, 3.0, 1)
    S.finish()


def scene_cave():
    S = Scene("cave", 2.4, IR_CAVE, 0.9)
    for k, tl in beats(S):
        hi = k % 2
        S.hit(tom(120 if hi else 72, 0.55, 0.2) * 1.0, tl, 1.0, -0.3 if hi else 0.3, 0.5)
        if k % 4 == 2:
            S.hit(tom(60, 0.8, 0.3) * 0.8, tl, 1, 0, 0.5)
        S.hit(clack(0.09, 1500 + 500 * hi), tl + 0.25, 0.5, 0.5 - hi, 0.4)   # bone clacks on the off-beat
    S.hit(pad(midi(26), S.dur + 1, 1.0, 1.0, 400) * 0.5, 0, 1, 0, 0.5)
    # breathy bone flute: two sliding notes per bar
    for b in range(int(S.dur // 2)):
        fl = mb(noise_burst(1.2, 700, 1800, 0.5) * 0.15, theremin(midi(69), midi(70 if b % 2 else 69), 1.2) * 0.12)
        S.hit(fl, b * 2 + 0.0, 1, 0.2, 0.7)
    chant(S, 0.0, S.dur, ["bm_george"], "cave", 1.0, 0.7)
    S.finish()


def scene_egypt():
    S = Scene("egypt", 2.0, IR_HALL, 0.8)
    for k, tl in beats(S):
        # doumbek: dum on 0,2 ; tek on 1,3 and 'ka' on the &
        if k % 2 == 0:
            S.hit(tom(95, 0.35, 0.1, 0.1), tl, 1.0, 0, 0.3)
        else:
            S.hit(clack(0.07, 2400) * 0.9, tl, 0.8, 0.2, 0.3)
        S.hit(clack(0.06, 3000) * 0.5, tl + 0.25, 0.5, -0.2, 0.3)
        S.hit(tambourine(0.14) * 0.35, tl + 0.25, 1, 0.4, 0.2)    # sistrum
        n = midi(64) if k % 2 == 0 else midi(65)
        S.hit(pluck(n * 1.0, 1.0, 0.997, 0.75), tl, 0.7, -0.2, 0.6)
        if k % 2 == 1:
            S.hit(pluck(midi(68), 0.6, 0.995, 0.7), tl + 0.25, 0.45, 0.3, 0.6)
    S.hit(pad(midi(40), S.dur + 1, 0.8, 0.8, 700) * 0.45, 0, 1, 0, 0.5)
    chant(S, 0.0, S.dur, ["am_michael", "bm_george"], "deep", 0.95, 0.5, [-0.2, 0.2])
    S.finish()


def scene_greek():
    S = Scene("greek", 2.0, IR_HALL, 0.8)
    for k, tl in beats(S):
        n = midi(62) if k % 2 == 0 else midi(64)
        S.hit(pluck(n, 0.9, 0.996, 0.55, 3), tl, 0.8, -0.3, 0.5)
        S.hit(pluck(n * 2 if k % 4 == 3 else n * 1.5, 0.5, 0.994, 0.6, 5), tl + 0.25, 0.4, 0.3, 0.5)
        if k % 2 == 0:
            S.hit(tom(140, 0.3, 0.08, 0.2), tl, 0.7, 0.3, 0.3)       # frame drum
        else:
            S.hit(tambourine(0.1) * 0.5, tl, 0.8, -0.2, 0.2)
    # aulos drone (two nasal reeds)
    for b in range(int(S.dur // 2)):
        a = saw(midi(50), 2.2, 0.15, 0.3, 1800, 0.006, 3)
        S.hit(bp(a, 350, 2200) * 1.2, b * 2, 0.5, 0.1, 0.5)
    chant(S, 0.0, S.dur, ["am_adam"], "clean", 1.0, 0.5)
    S.finish()


def scene_roman():
    S = Scene("roman", 1.6, IR_HALL, 0.7)
    for k, tl in beats(S):
        root = midi(48) if k % 2 == 0 else midi(55)
        S.hit(brass(root, 0.42, 0.03, 1700), tl, 0.9, -0.1, 0.35)
        S.hit(tambourine(0.12) * 0.6, tl + 0.25, 1, 0.3, 0.2)
        if k % 2 == 0:
            S.hit(tom(80, 0.4, 0.12), tl, 0.9, 0, 0.25)
        if k % 4 == 3:
            for j in range(4):
                S.hit(snare(0.1, 220, 0.04) * 0.5, tl + 0.5 - 0.5 + j * 0.0625 + 0.125, 0.5, 0)
    chant(S, 0.0, S.dur, ["am_adam", "am_michael"], "deep", 1.0, 0.45, [-0.15, 0.15])
    S.finish()


def scene_song():
    S = Scene("song", 1.8, IR_HALL, 0.6)
    pent = [62, 64, 67, 69, 71, 74]
    for k, tl in beats(S):
        n = pent[0] if k % 2 == 0 else pent[1]
        S.hit(pluck(midi(n + 12), 1.2, 0.998, 0.8, 7), tl, 0.8, -0.2, 0.5)
        # glissando "scrape": quick run before the beat
        run = [pent[(k * 2 + j) % 6] + 12 for j in range(3)]
        for j, nn in enumerate(run):
            S.hit(pluck(midi(nn), 0.5, 0.993, 0.8, 9 + j), tl + 0.25 + j * 0.05, 0.28, 0.3, 0.5)
        S.hit(woodblock(780 if k % 2 else 980), tl, 0.7, 0.3, 0.2)       # wooden fish
        if k % 2 == 0:
            S.hit(tom(70, 0.5, 0.2), tl, 0.9, 0, 0.3)
    chant(S, 0.0, S.dur, ["af_heart"], "radio60", 0.95, 0.4)
    S.finish()


def scene_medieval():
    S = Scene("medieval", 3.4, IR_CATH, 1.1)
    for b in range(int(S.dur // 2)):
        S.hit(organ(midi(50), 2.1, (1, .6, .3, .15), 4.5, 0.05, 0.3) * 0.5, b * 2, 1, -0.1, 0.8)
        S.hit(organ(midi(57), 2.1, (1, .6, .3, .15), 4.2, 0.05, 0.3) * 0.4, b * 2, 1, 0.1, 0.8)
        S.hit(organ(midi(62), 2.1, (1, .4, .2), 4.8, 0.06, 0.3) * 0.25, b * 2, 1, 0.0, 0.8)
    for k, tl in beats(S):
        S.hit(bell(midi(81 if k % 2 == 0 else 86), 1.8, decay=1.0) * 0.5, tl, 1, 0.3 if k % 2 else -0.3, 0.9)
    chant(S, 0.0, S.dur, ["bm_george", "am_michael"], "deep", 0.95, 0.9, [-0.2, 0.2])
    # a high 'choir' fifth above
    chant(S, 0.0, S.dur, ["af_heart"], "clean", 0.3, 1.0, [0.0], flip=False)
    S.finish()


def scene_renaissance():
    S = Scene("renaissance", 2.0, IR_HALL, 0.8)
    for k, tl in beats(S):
        n = 67 if k % 2 == 0 else 69
        S.hit(pluck(midi(n), 0.45, 0.99, 0.95, 11), tl, 0.7, -0.3, 0.35)           # harpsichord
        S.hit(pluck(midi(n - 12), 0.6, 0.996, 0.5, 13), tl + 0.25, 0.5, 0.3, 0.35)  # lute answer
        S.hit(pluck(midi(n + 4), 0.4, 0.99, 0.95, 15), tl + 0.125, 0.3, 0.1, 0.35)
    for b in range(int(S.dur // 2)):
        S.hit(organ(midi(43), 2.0, (1, .4, .15), 4, 0.1, 0.4) * 0.35, b * 2, 1, 0, 0.8)
    chant(S, 0.0, S.dur, ["bm_george", "bf_emma", "am_michael"], "clean", 1.05, 0.7, [-0.4, 0, 0.4], jitter=0.012)
    S.finish()


def scene_ukiyo():
    S = Scene("ukiyo", 1.6, IR_ROOM, 0.5)
    hira = [57, 59, 60, 64, 65]
    for k, tl in beats(S):
        n = hira[0] if k % 2 == 0 else hira[1]
        a = mb(pluck(midi(n), 0.6, 0.994, 0.45, 17), noise_burst(0.04, 1500, 6000, 0.01) * 0.6)
        S.hit(a, tl, 0.9, -0.2, 0.3)
        S.hit(pluck(midi(hira[(k + 2) % 5] + 12), 0.4, 0.99, 0.7, 19), tl + 0.25, 0.4, 0.3, 0.3)
        if k % 2 == 0:
            S.hit(tom(55, 0.8, 0.35, 0.5), tl, 1.2, 0, 0.3)      # taiko
        else:
            S.hit(clack(0.1, 1300), tl, 0.7, 0.4)                # rim
        if k % 4 == 3:
            S.hit(tom(65, 0.5, 0.15, 0.4), tl + 0.25, 0.9, 0, 0.3)
    chant(S, 0.0, S.dur, ["af_heart"], "clean", 0.95, 0.35)
    S.finish()


def scene_vangogh():
    S = Scene("vangogh", 2.2, IR_PLATE, 0.8)
    arp = [74, 77, 81, 77]
    for k, tl in beats(S):
        S.hit(musicbox(midi(arp[k % 4]), 1.2), tl, 0.7, -0.2 + 0.1 * (k % 4), 0.7)
        S.hit(musicbox(midi(arp[(k + 1) % 4] + 12), 0.8), tl + 0.25, 0.3, 0.3, 0.7)
    for b in range(int(S.dur // 2)):
        for n in (50, 57, 65):
            S.hit(pad(midi(n), 2.4, 0.6, 0.7, 1500) * 0.3, b * 2, 1, 0, 0.6)
    chant(S, 0.0, S.dur, ["af_sky"], "clean", 0.7, 0.9)
    S.finish()


def scene_surreal():
    S = Scene("surreal", 2.4, IR_CATH, 1.0)
    for k, tl in beats(S):
        f0, f1 = (midi(66), midi(72)) if k % 2 == 0 else (midi(72), midi(66))
        S.hit(theremin(f0, f1, 0.55) * 0.9, tl, 0.8, -0.4 + 0.8 * (k % 2), 0.8)
        S.hit(woodblock(1100 if k % 2 == 0 else 760, 0.1), tl, 0.7, 0.0, 0.15)     # tick - tock
        if k % 4 == 0:
            S.hit(bell(midi(78), 2.0, (1, 2.4, 4.7), (1, .5, .3), 1.2) * 0.5, tl, 1, 0.4, 0.9)
    S.hit(riser(S.dur, 300, 5000) * 0.25, 0, 1, 0, 0.2)
    chant(S, 0.0, S.dur, ["bf_emma"], "wobble", 0.9, 0.9)
    S.finish()


def scene_pop():
    S = Scene("pop", 1.4, IR_PLATE, 0.4)
    for k, tl in beats(S):
        n = 64 if k % 2 == 0 else 67
        S.hit(organ(midi(n + 12), 0.4, (1, 0, .6, 0, .35), 6, 0.01, 0.05) * 0.6, tl, 0.7, 0.2, 0.3)
        S.hit(organ(midi(n), 0.25, (1, 0, .6, 0, .35), 6, 0.01, 0.05) * 0.5, tl + 0.25, 0.5, -0.2, 0.3)
        S.hit(tambourine(0.14) * 0.6, tl, 1, 0.3, 0.1)
        S.hit(tambourine(0.1) * 0.4, tl + 0.25, 1, 0.3, 0.1)
        if k % 2 == 1:
            S.hit(snare(0.22, 200, 0.1) * 1.0, tl, 1.0, 0, 0.3)
        else:
            S.hit(kick(0.3, 110, 50, 0.1) * 0.9, tl, 1.0, 0, 0)
        S.hit(sub808(midi(40) if k % 4 < 2 else midi(43), 0.45) * 0.55, tl, 1, 0, 0)
    chant(S, 0.0, S.dur, ["am_adam"], "radio60", 1.0, 0.3)
    S.finish()


def scene_synth():
    S = Scene("synth", 1.6, IR_80S, 0.8)
    for k, tl in beats(S):
        S.hit(kick(0.3, 150, 46, 0.14), tl, 1.0, 0, 0.1)
        if k % 2 == 1:
            S.hit(snare(0.3, 180, 0.14) * 1.0, tl, 1.0, 0, 0.8)
            S.hit(clap(0.2) * 0.7, tl, 1, 0, 0.8)
        for j in range(4):
            S.hit(hat(0.07, j == 2) * (0.5 if j % 2 else 0.8), tl + j * 0.125, 0.8, 0.2)
        root = [33, 33, 36, 31][(k // 2) % 4] if False else [33, 33, 36, 31][k % 4]
        for j in range(4):
            S.hit(saw(midi(root + (12 if j % 2 else 0)), 0.11, 0.003, 0.03, 900 + 400 * j, 0.004, 2), tl + j * 0.125, 0.8, 0.0, 0.1)
    for b in range(int(S.dur // 2)):
        for n in (57, 60, 64, 69):
            S.hit(chorus(saw(midi(n), 1.4, 0.01, 0.4, 2600, 0.006, 3)) * 0.35, b * 2, 1, 0, 0.7)
    chant(S, 0.0, S.dur, ["af_nicole", "am_michael"], "mp3", 0.95, 0.9, [-0.3, 0.3])
    S.finish()


def scene_pixel():
    S = Scene("pixel", 1.0, IR_ROOM, 0.1)
    # arcade fanfare "FIGHT!"
    for j, n in enumerate((60, 64, 67, 72)):
        S.hit(pulse(midi(n), 0.14, 0.25, d=0.1, sus=0.5), 0.3 + j * 0.1, 0.5, 0, 0)
    for k, tl in beats(S):
        n = 72 if k % 2 == 0 else 76
        S.hit(pulse(midi(n), 0.2, 0.25, d=0.08, sus=0.6), tl, 0.5, -0.2, 0)
        S.hit(pulse(midi(n + 7), 0.1, 0.125, d=0.05, sus=0.5), tl + 0.25, 0.35, 0.2, 0)
        S.hit(tri(midi(36 if k % 4 < 2 else 31), 0.45, 0.003, 0.3), tl, 0.9, 0, 0)
        S.hit(bitcrush(hat(0.05), 3, 6000), tl, 0.6, 0.3, 0)
        S.hit(bitcrush(hat(0.05), 3, 6000), tl + 0.25, 0.4, 0.3, 0)
        if k % 2 == 1:
            S.hit(bitcrush(snare(0.12, 210, 0.05), 4, 9000) * 0.9, tl, 0.9, 0, 0)
        else:
            S.hit(bitcrush(kick(0.2, 120, 50, 0.07), 4, 9000), tl, 0.9, 0, 0)
    chant(S, 0.0, S.dur, ["am_adam"], "crush8", 0.95, 0.05)
    S.finish()


def scene_xp():
    S = Scene("xp", 1.0, IR_ROOM, 0.2)
    # dial-up squeal for the first second (very low) — the sound of "being online"
    n = int(1.1 * SR); x = np.arange(n) / SR
    f = 1400 + 900 * np.sin(2 * np.pi * 7 * x) + 600 * np.sign(np.sin(2 * np.pi * 13 * x))
    dial = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 * np.minimum(1, x / 0.05) * np.minimum(1, (1.1 - x) / 0.2)
    S.hit(bp(dial, 400, 3500), 0.0, 0.6, 0, 0.1)
    scale = [72, 74, 76, 79, 81]
    for k, tl in beats(S):
        S.hit(marimba(midi(scale[0] if k % 2 == 0 else scale[2]), 0.5), tl, 0.8, -0.2, 0.2)
        S.hit(marimba(midi(scale[(k + 1) % 5] + 12), 0.4), tl + 0.25, 0.4, 0.3, 0.2)
        S.hit(epiano(midi(48 + (0 if k % 4 < 2 else 5)), 0.6), tl, 0.6, 0, 0.2)
        if k % 2 == 1:    # MSN "nudge" buzz on every "seven"
            nn = int(0.22 * SR); xx = np.arange(nn) / SR
            buz = (np.sign(np.sin(2 * np.pi * 95 * xx)) * 0.5 + np.sin(2 * np.pi * 1900 * xx) * 0.2) * np.exp(-xx / 0.12)
            S.hit(bp(buz, 150, 2600) * 0.9, tl, 0.7, 0, 0.1)
        S.hit(tick(5200, 0.02) * 0.5, tl + 0.25, 0.5, 0.2)
    chant(S, 0.0, S.dur, ["af_bella"], "telephone", 1.0, 0.2)
    S.finish()


def scene_tiktok():
    S = Scene("tiktok", 2.0, IR_PLATE, 0.6)
    drop = 4.0
    for k, tl in beats(S):
        big = tl >= drop
        # kick pattern: 0, 0.75 ; snare on beat 2 (half-time)
        if k % 4 == 0 or (k % 4 == 2 and big):
            S.hit(kick(0.35, 160, 44, 0.16) * 1.0, tl, 1, 0, 0.05)
        if k % 4 == 2:
            S.hit(snare(0.3, 190, 0.12) * 1.0, tl, 1, 0, 0.5)
            S.hit(clap(0.2) * 0.8, tl, 1, 0, 0.5)
        n = 36 if (k // 4) % 2 == 0 else 34
        if k % 4 in (0, 3) or big:
            S.hit(sub808(midi(n), 0.8, -0.04 if k % 4 == 3 else 0.0, 2.2) * 0.9, tl, 1, 0, 0)
        # trap hats: 8ths, rolls
        for j in range(2):
            S.hit(hat(0.05) * 0.6, tl + j * 0.25, 0.6, 0.2)
        if k % 4 == 3:
            for j in range(6):
                S.hit(hat(0.04) * 0.5, tl + 0.25 + j * 0.04, 0.5, -0.2)
        # kid vocal-chop lead
        S.hit(pulse(midi(79 if k % 2 == 0 else 82), 0.18, 0.5, d=0.1, sus=0.4, vib=0.01) * 0.6, tl + 0.25, 0.4, 0.3, 0.3)
    S.hit(riser(drop, 200, 9000) * 0.5, 0.0, 0.8)
    S.hit(thud(1.0, 45), drop, 1.2)
    chant(S, 0.0, S.dur, ["af_nicole"], "kid", 1.0, 0.4)
    chant(S, drop, S.dur, ["af_bella", "af_sky"], "kid", 0.9, 0.5, [-0.5, 0.5])
    S.finish()


# --------------------------------------------------------------- finale
def scene_finale():
    S = Scene("finale", 2.2, IR_HALL, 0.9)
    order = ["cave", "egypt", "greek", "roman", "song", "medieval", "renaissance", "ukiyo", "vangogh", "surreal", "pop", "synth", "pixel", "xp", "tiktok"]
    sig = {  # each tile pop = that era's instrument on a rising C-major-pentatonic ladder
        "cave": lambda f: tom(f / 2.2, 0.4, 0.15), "egypt": lambda f: pluck(f, 0.7, 0.997, 0.7), "greek": lambda f: pluck(f, 0.7, 0.996, 0.55, 3),
        "roman": lambda f: brass(f, 0.35, 0.03, 1700), "song": lambda f: pluck(f, 0.8, 0.998, 0.85, 7), "medieval": lambda f: bell(f, 1.0),
        "renaissance": lambda f: pluck(f, 0.4, 0.99, 0.95, 11), "ukiyo": lambda f: mb(pluck(f, 0.6, 0.994, 0.45, 17), noise_burst(0.03, 1500, 6000, 0.01) * 0.5),
        "vangogh": lambda f: musicbox(f, 0.9), "surreal": lambda f: theremin(f * 0.94, f, 0.4), "pop": lambda f: organ(f, 0.3, (1, 0, .6, 0, .35), 6, 0.01, 0.05),
        "synth": lambda f: saw(f, 0.3, 0.005, 0.1, 2800, 0.006, 3), "pixel": lambda f: pulse(f, 0.2, 0.25, d=0.1), "xp": lambda f: marimba(f, 0.5), "tiktok": lambda f: mb(sub808(f / 4, 0.6), pulse(f, 0.15, 0.5) * 0.4),
    }
    lad = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93]
    for k, sid in enumerate(order):
        tl = 0.5 + k * 0.25
        S.hit(sig[sid](midi(lad[k])), tl, 0.85, -0.7 + 1.4 * k / 14, 0.5)
        S.hit(noise_burst(0.05, 800, 5000, 0.02) * 0.4, tl, 0.5, 0)
    S.hit(riser(3.6, 250, 9000) * 0.45, 0.2, 1)
    # groove from 4.0 (film 76.0) to 8.0 (80.0)
    for k in range(8, 16):
        tl = k * BEAT
        S.hit(kick(0.35, 150, 46, 0.14), tl, 1, 0, 0.05)
        if k % 2 == 1:
            S.hit(clap(0.2) * 0.9, tl, 1, 0, 0.5); S.hit(snare(0.3, 190, 0.12) * 0.8, tl, 1, 0, 0.5)
        for j in range(2):
            S.hit(hat(0.06) * 0.7, tl + j * 0.25, 0.7, 0.2)
        S.hit(sub808(midi(36 if k % 4 < 2 else 31), 0.7) * 0.8, tl, 1, 0, 0)
        for n in ((60, 64, 67) if k % 4 < 2 else (59, 62, 67)):
            S.hit(brass(midi(n + 12), 0.4, 0.02, 2600) * 0.45, tl, 1, 0, 0.5)
    S.hit(thud(1.2, 50), 4.0, 1.4)
    S.hit(pad(midi(48), 4.2, 0.5, 0.5, 2200) * 0.4, 4.0, 1, 0, 0.7)
    # crowd chant: 8 voices, spread, each slightly off
    voices = ["af_heart", "af_bella", "am_adam", "am_michael", "bf_emma", "bm_george", "af_sky", "af_nicole"]
    chant(S, 4.0, 8.0, voices, "clean", 1.5, 0.9, list(np.linspace(-0.8, 0.8, 8)), jitter=0.018)
    chant(S, 2.2, 4.0, voices[:4], "clean", 0.9, 0.9, [-0.5, -0.15, 0.15, 0.5], jitter=0.015)
    # 8.0 : the hit, then silence
    S.hit(thud(1.5, 42), 8.0, 1.5)
    S.hit(bell(midi(72), 3.0, decay=1.4) * 0.5, 8.0, 1, 0, 0.9)
    # end card: two small music-box notes (the doot-doot), then a lone deadpan voice
    S.hit(musicbox(midi(79), 1.2) * 0.6, 8.5, 1, -0.2, 0.8)
    S.hit(musicbox(midi(76), 1.4) * 0.6, 8.95, 1, 0.2, 0.8)
    a, lead = word("am_adam", "six", "dot"); S.hit(a * 0.55, 8.9 - lead, 1, 0, 0.7)
    a, lead = word("am_adam", "seven", "dot"); S.hit(a * 0.55, 9.55 - lead, 1, 0, 0.7)
    S.finish()


def transitions_and_hud():
    sc = TL["scenes"]
    for i in range(len(sc) - 1):
        B = sc[i]["t1"]
        # whoosh across the whole 0.6 s window, odometer ticks across the middle 76 %
        MASTER.add(whoosh(0.6, 250, 5200) * 0.55, B - 0.3, 0.8, 0)
        N = 22
        for j in range(N):
            x = (j + 0.5) / N
            u = 0.5 + np.sign(x - 0.5) * abs(2 * x - 1) ** (1 / 3) / 2
            t = B - 0.3 + 0.6 * (0.12 + 0.76 * u)
            MASTER.add(tick(2200 + 900 * (j % 3), 0.025) * 0.5, t, 0.5, 0.0)
        MASTER.add(thud(0.4, 70) * 0.7, B, 0.7, 0)
    for s in sc:
        if s.get("hud") is False:
            continue
        MASTER.add(thud(0.35, 90) * 0.6, s["t0"] + 0.15, 0.5, -0.2)
        MASTER.add(noise_burst(0.07, 1200, 7000, 0.015) * 0.7, s["t0"] + 0.9, 0.4, 0.4)


def extra_cues():
    for sid, lst in CUES.items():
        t0 = SC[sid]["t0"]
        for c in lst:
            nm = c.get("name", "thud"); t = t0 + c["u"]; g = c.get("gain", 1.0); p = c.get("pan", 0.0)
            f = {"thud": lambda: thud(0.4, 60), "pop": lambda: noise_burst(0.08, 700, 4000, 0.03), "ding": lambda: bell(midi(84), 1.0), "whoosh": lambda: whoosh(0.4),
                 "stamp": lambda: thud(0.3, 110), "click": lambda: tick(), "boing": lambda: theremin(midi(60), midi(72), 0.25), "impact": lambda: mb(thud(1.0, 45), noise_burst(0.3, 100, 2000, 0.12) * 0.5)}.get(nm, lambda: thud())()
            MASTER.add(f * 0.8, t, g, p)


if __name__ == "__main__":
    only = set(sys.argv[1:])
    scenes = [("intro", scene_intro), ("cave", scene_cave), ("egypt", scene_egypt), ("greek", scene_greek), ("roman", scene_roman), ("song", scene_song),
              ("medieval", scene_medieval), ("renaissance", scene_renaissance), ("ukiyo", scene_ukiyo), ("vangogh", scene_vangogh), ("surreal", scene_surreal),
              ("pop", scene_pop), ("synth", scene_synth), ("pixel", scene_pixel), ("xp", scene_xp), ("tiktok", scene_tiktok), ("finale", scene_finale)]
    for sid, fn in scenes:
        if only and sid not in only:
            continue
        fn()
        print("built", sid, flush=True)
    transitions_and_hud()
    extra_cues()
    n = int(TOTAL * SR)
    L, R = MASTER.L[:n], MASTER.R[:n]
    # master chain: DC/rumble filter, gentle bus compression-ish via soft clip, normalise to -1.5 dBFS
    L, R = hp(L, 28, 2), hp(R, 28, 2)
    pk = max(np.max(np.abs(L)), np.max(np.abs(R))) + 1e-9
    L, R = saturate(L / pk * 1.6, 1.25), saturate(R / pk * 1.6, 1.25)
    pk = max(np.max(np.abs(L)), np.max(np.abs(R)))
    g = 0.84 / pk
    L, R = L * g, R * g
    f = int(0.06 * SR)
    L[-f:] *= np.linspace(1, 0, f); R[-f:] *= np.linspace(1, 0, f)
    out = np.stack([L, R], 1).astype(np.float32)
    sf.write(os.path.join(ROOT, "mix.wav"), out, SR, subtype="PCM_16")
    rms = [float(np.sqrt(np.mean(out[i * SR:(i + 1) * SR] ** 2))) for i in range(int(TOTAL))]
    print("wrote mix.wav", out.shape, "peak", round(float(np.abs(out).max()), 3), "rms/s", [round(x, 2) for x in rms[::6]])
