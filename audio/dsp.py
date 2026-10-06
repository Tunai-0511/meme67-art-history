"""dsp.py — tiny numpy/scipy synth + effects kit for the 67 film (48 kHz)."""
import numpy as np
from scipy import signal

SR = 48000
RNG = np.random.default_rng(67)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def env_ad(n, a=0.005, d=0.2, curve=4.0):
    """attack/exponential-decay envelope of n samples"""
    e = np.exp(-curve * np.arange(n) / max(1, n * d / (n / SR if n else 1))) if False else None
    x = np.arange(n) / SR
    atk = np.minimum(1.0, x / max(a, 1e-4))
    dec = np.exp(-x / max(d, 1e-4))
    return atk * dec


def fade(x, a=0.004, b=0.01):
    n = len(x)
    fa, fb = int(a * SR), int(b * SR)
    if fa > 0 and n > fa:
        x[:fa] *= np.linspace(0, 1, fa)
    if fb > 0 and n > fb:
        x[-fb:] *= np.linspace(1, 0, fb)
    return x


# ------------------------------------------------------------------ filters
def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45) / (SR / 2), btype="low", output="sos")
    return signal.sosfilt(sos, x)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc / (SR / 2), btype="high", output="sos")
    return signal.sosfilt(sos, x)


def bp(x, f1, f2, order=2):
    sos = signal.butter(order, [f1 / (SR / 2), min(f2, SR * 0.45) / (SR / 2)], btype="band", output="sos")
    return signal.sosfilt(sos, x)


def resample(x, ratio):
    """change pitch+speed by ratio (>1 = higher/shorter)"""
    from fractions import Fraction
    fr = Fraction(ratio).limit_denominator(200)
    return signal.resample_poly(x, fr.denominator, fr.numerator)


def semis(n):
    return 2 ** (n / 12)


def reverb_ir(dur=1.5, decay=3.0, pre=0.01, bright=0.5, seed=1):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    x = r.standard_normal(n) * np.exp(-decay * np.arange(n) / SR * (6.9 / dur) * 0.5 / 1.0)
    x = lp(x, 2000 + 12000 * bright, 1)
    x[: int(pre * SR)] = 0
    x /= np.sqrt(np.sum(x ** 2)) + 1e-9
    return x.astype(np.float32)


def reverb(x, ir, wet=0.3):
    y = signal.fftconvolve(x, ir)[: len(x) + len(ir)]
    out = np.zeros(len(y))
    out[: len(x)] += x * (1 - wet)
    out += y * wet * 2.2
    return out


def echo(x, delay, fb=0.35, mix=0.4, n=4):
    d = int(delay * SR)
    y = np.zeros(len(x) + d * n)
    y[: len(x)] += x
    for k in range(1, n + 1):
        y[d * k: d * k + len(x)] += x * (fb ** k) * mix * 2
    return y


def bitcrush(x, bits=8, rate=8000):
    step = max(1, int(SR / rate))
    y = np.repeat(x[::step], step)[: len(x)]
    q = 2 ** (bits - 1)
    return np.round(y * q) / q


def saturate(x, drive=2.0):
    return np.tanh(x * drive) / np.tanh(drive)


def chorus(x, depth=0.003, rate=0.8, mix=0.5):
    n = len(x)
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for ph, r in ((0, rate), (2.1, rate * 1.31)):
        d = (depth * (1 + np.sin(2 * np.pi * r * tt + ph))) * SR
        idx = np.clip(np.arange(n) - d, 0, n - 1)
        out += np.interp(idx, np.arange(n), x)
    return x * (1 - mix) + out * 0.5 * mix


# -------------------------------------------------------------- instruments
def pluck(f, dur=0.8, damp=0.996, bright=0.5, seed=0):
    """Karplus-Strong via IIR comb (fast)."""
    n = int(dur * SR)
    P = max(2, int(SR / f))
    r = np.random.default_rng(seed + int(f))
    exc = r.uniform(-1, 1, P)
    exc = lp(exc, 800 + 9000 * bright, 1) if bright < 0.99 else exc
    x = np.zeros(n)
    x[:P] = exc
    a = np.zeros(P + 2)
    a[0] = 1
    a[P] = -damp / 2
    a[P + 1] = -damp / 2
    y = signal.lfilter([1.0], a, x)
    y /= np.max(np.abs(y)) + 1e-9
    return fade(y * 0.9, 0.001, 0.02)


def bell(f, dur=1.2, ratios=(1, 2.76, 5.4, 8.93), amps=(1, 0.6, 0.35, 0.2), decay=0.5):
    x = t_(dur)
    y = np.zeros_like(x)
    for r, a in zip(ratios, amps):
        y += a * np.sin(2 * np.pi * f * r * x) * np.exp(-x / (decay / (1 + 0.4 * (r - 1))))
    y *= np.minimum(1, x / 0.002)
    return y / (np.max(np.abs(y)) + 1e-9) * 0.9


def organ(f, dur=1.0, harm=(1, 0.5, 0.35, 0.2, 0.12), trem=5.5, a=0.02, r=0.12):
    x = t_(dur)
    y = np.zeros_like(x)
    for k, h in enumerate(harm, 1):
        y += h * np.sin(2 * np.pi * f * k * x)
    y *= 1 + 0.08 * np.sin(2 * np.pi * trem * x)
    e = np.minimum(1, x / a) * np.minimum(1, (dur - x) / r)
    return y * e / (np.max(np.abs(y)) + 1e-9) * 0.7


def pulse(f, dur=0.3, duty=0.5, a=0.002, d=0.15, sus=0.6, vib=0.0, slide=0.0):
    n = int(dur * SR)
    x = np.arange(n) / SR
    fi = f * (1 + vib * np.sin(2 * np.pi * 6 * x)) * (1 + slide * x)
    ph = np.cumsum(fi) / SR
    y = np.where((ph % 1.0) < duty, 1.0, -1.0)
    e = np.minimum(1, x / a) * (sus + (1 - sus) * np.exp(-x / d)) * np.minimum(1, (dur - x) / 0.01)
    return y * e * 0.5


def tri(f, dur=0.3, a=0.003, d=0.4):
    n = int(dur * SR)
    x = np.arange(n) / SR
    y = signal.sawtooth(2 * np.pi * f * x, 0.5)
    return y * np.minimum(1, x / a) * np.minimum(1, (dur - x) / 0.01) * (0.6 + 0.4 * np.exp(-x / d)) * 0.8


def saw(f, dur=0.3, a=0.005, r=0.08, cutoff=3000, detune=0.004, voices=2):
    x = t_(dur)
    y = np.zeros_like(x)
    for v in range(voices):
        df = f * (1 + (v - (voices - 1) / 2) * detune * 2)
        y += signal.sawtooth(2 * np.pi * df * x + v)
    y = lp(y / voices, cutoff, 2)
    e = np.minimum(1, x / a) * np.minimum(1, (dur - x) / r)
    return y * e * 0.6


def theremin(f0, f1, dur=0.6):
    x = t_(dur)
    f = f0 + (f1 - f0) * (x / dur) ** 0.7
    f = f * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * x))
    ph = np.cumsum(f) / SR
    y = np.sin(2 * np.pi * ph) + 0.25 * np.sin(4 * np.pi * ph)
    e = np.minimum(1, x / 0.08) * np.minimum(1, (dur - x) / 0.12)
    return y * e * 0.5


def marimba(f, dur=0.5):
    x = t_(dur)
    y = np.sin(2 * np.pi * f * x) * np.exp(-x / 0.12) + 0.4 * np.sin(2 * np.pi * f * 3.9 * x) * np.exp(-x / 0.04)
    return fade(y * 0.8, 0.001, 0.01)


def epiano(f, dur=0.8):
    x = t_(dur)
    y = np.sin(2 * np.pi * f * x + 1.5 * np.sin(2 * np.pi * f * x) * np.exp(-x / 0.15)) * np.exp(-x / 0.5)
    y += 0.3 * np.sin(2 * np.pi * f * 2 * x) * np.exp(-x / 0.2)
    return fade(y * 0.6, 0.001, 0.02)


def musicbox(f, dur=1.0):
    x = t_(dur)
    y = (np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * f * 2.0 * x) * np.exp(-x / 0.3) + 0.25 * np.sin(2 * np.pi * f * 4.1 * x) * np.exp(-x / 0.15)) * np.exp(-x / 0.35)
    return fade(y * 0.6, 0.0008, 0.02)


def pad(f, dur=2.0, a=0.35, r=0.5, cutoff=1800):
    x = t_(dur)
    y = np.zeros_like(x)
    for d in (-0.006, 0.0, 0.007):
        y += signal.sawtooth(2 * np.pi * f * (1 + d) * x + d * 40)
    y = lp(y / 3, cutoff, 2)
    return y * np.minimum(1, x / a) * np.minimum(1, (dur - x) / r) * 0.5


def brass(f, dur=0.5, a=0.04, cutoff=1400):
    x = t_(dur)
    y = signal.sawtooth(2 * np.pi * f * x) + 0.5 * signal.sawtooth(2 * np.pi * f * 1.005 * x)
    e = np.minimum(1, x / a) * np.minimum(1, (dur - x) / 0.08)
    cf = cutoff * (0.3 + 0.7 * np.minimum(1, x / 0.12))
    out = np.zeros_like(y)
    seg = 512
    # time-varying lowpass in blocks
    zi = None
    for i in range(0, len(y), seg):
        sos = signal.butter(2, min(cf[min(i, len(cf) - 1)], 20000) / (SR / 2), output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        out[i:i + seg], zi = signal.sosfilt(sos, y[i:i + seg], zi=zi)
    return out * e * 0.5


# ------------------------------------------------------------------ drums
def kick(dur=0.35, f0=130, f1=42, d=0.12):
    x = t_(dur)
    f = f1 + (f0 - f1) * np.exp(-x / 0.03)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / d)
    y += 0.3 * RNG.standard_normal(len(x)) * np.exp(-x / 0.004)
    return fade(saturate(y, 1.6), 0.0005, 0.01) * 0.95


def tom(f=90, dur=0.5, d=0.16, click=0.3):
    x = t_(dur)
    fr = f * (1 + 0.6 * np.exp(-x / 0.04))
    y = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-x / d) + click * RNG.standard_normal(len(x)) * np.exp(-x / 0.006)
    return fade(y * 0.9, 0.0005, 0.02)


def snare(dur=0.25, tone=190, d=0.09, noise=0.9):
    x = t_(dur)
    y = np.sin(2 * np.pi * tone * x) * np.exp(-x / 0.05) * 0.6 + hp(RNG.standard_normal(len(x)), 1500) * np.exp(-x / d) * noise
    return fade(y * 0.8, 0.0005, 0.01)


def hat(dur=0.08, open_=False):
    n = int(dur * SR) if not open_ else int(0.3 * SR)
    x = np.arange(n) / SR
    y = hp(RNG.standard_normal(n), 7000) * np.exp(-x / (0.03 if open_ else 0.012))
    return fade(y * 0.5, 0.0003, 0.005)


def clap(dur=0.2):
    n = int(dur * SR)
    x = np.arange(n) / SR
    y = np.zeros(n)
    for o in (0, 0.012, 0.024):
        k = int(o * SR)
        y[k:] += bp(RNG.standard_normal(n - k), 900, 3500) * np.exp(-np.arange(n - k) / SR / 0.02)
    y += bp(RNG.standard_normal(n), 900, 3500) * np.exp(-x / 0.08) * 0.5
    return fade(y * 0.7, 0.0005, 0.01)


def clack(dur=0.1, f=1800):
    x = t_(dur)
    y = np.sin(2 * np.pi * f * x) * np.exp(-x / 0.01) + 0.3 * bp(RNG.standard_normal(len(x)), 1000, 5000) * np.exp(-x / 0.008)
    return fade(y * 0.8, 0.0003, 0.005)


def woodblock(f=900, dur=0.12):
    x = t_(dur)
    y = (np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * f * 1.5 * x)) * np.exp(-x / 0.025)
    return fade(y * 0.7, 0.0003, 0.005)


def tambourine(dur=0.18):
    n = int(dur * SR)
    x = np.arange(n) / SR
    y = hp(RNG.standard_normal(n), 5000) * np.exp(-x / 0.05) * (1 + 0.5 * np.sin(2 * np.pi * 70 * x))
    return fade(y * 0.5, 0.0005, 0.01)


def sub808(f=48, dur=0.7, glide=0.0, drive=2.0):
    x = t_(dur)
    fr = f * (1 + glide * (x / dur))
    y = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-x / 0.5)
    y = saturate(y * 1.2, drive)
    return fade(y * 0.9, 0.001, 0.03)


def whoosh(dur=0.6, f0=300, f1=6000, up=True):
    n = int(dur * SR)
    x = np.arange(n) / SR
    nz = RNG.standard_normal(n)
    out = np.zeros(n)
    seg = 480
    zi = None
    for i in range(0, n, seg):
        p = i / n
        fc = f0 * (f1 / f0) ** (p if up else 1 - p)
        sos = signal.butter(2, [max(80, fc * 0.6) / (SR / 2), min(fc * 1.6, 20000) / (SR / 2)], btype="band", output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        out[i:i + seg], zi = signal.sosfilt(sos, nz[i:i + seg], zi=zi)
    e = np.sin(np.pi * np.arange(n) / n) ** 1.5
    return out * e * 0.9


def tick(f=2400, dur=0.03):
    x = t_(dur)
    return fade(np.sin(2 * np.pi * f * x) * np.exp(-x / 0.006) * 0.8, 0.0002, 0.003)


def thud(dur=0.4, f=60):
    x = t_(dur)
    y = np.sin(2 * np.pi * f * (1 + 1.5 * np.exp(-x / 0.05)) * x) * np.exp(-x / 0.1)
    y += 0.4 * bp(RNG.standard_normal(len(x)), 100, 1200) * np.exp(-x / 0.03)
    return fade(saturate(y, 1.5), 0.0005, 0.02)


def riser(dur=2.0, f0=200, f1=8000):
    n = int(dur * SR)
    x = np.arange(n) / SR
    nz = RNG.standard_normal(n)
    out = np.zeros(n)
    seg = 480
    zi = None
    for i in range(0, n, seg):
        p = i / n
        fc = f0 * (f1 / f0) ** p
        sos = signal.butter(2, [fc * 0.7 / (SR / 2), min(fc * 1.4, 22000) / (SR / 2)], btype="band", output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        out[i:i + seg], zi = signal.sosfilt(sos, nz[i:i + seg], zi=zi)
    return out * (np.arange(n) / n) ** 2 * 1.2


def noise_burst(dur=0.1, lo=500, hi=6000, d=0.03):
    n = int(dur * SR)
    x = np.arange(n) / SR
    return fade(bp(RNG.standard_normal(n), lo, hi) * np.exp(-x / d), 0.0005, 0.005)


# ------------------------------------------------------------------ mixing
def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


class Bus:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.L = np.zeros(self.n, dtype=np.float64)
        self.R = np.zeros(self.n, dtype=np.float64)

    def add(self, x, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= self.n or len(x) == 0:
            return
        if i < 0:
            x = x[-i:]
            i = 0
        m = min(len(x), self.n - i)
        gl = np.cos((pan + 1) * np.pi / 4) * gain
        gr = np.sin((pan + 1) * np.pi / 4) * gain
        self.L[i:i + m] += x[:m] * gl
        self.R[i:i + m] += x[:m] * gr

    def mono(self):
        return (self.L + self.R) * 0.5


def mb(*xs):
    """sum buffers of different lengths"""
    n = max(len(x) for x in xs)
    y = np.zeros(n)
    for x in xs:
        y[: len(x)] += x
    return y
