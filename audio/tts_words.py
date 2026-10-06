"""Generate raw 'six' / 'seven' chant samples with Kokoro (local mlx-audio) for several voices. -> audio/words/<voice>_<word>_<style>.wav (24 kHz)"""
import os, sys, time
import numpy as np, soundfile as sf
from mlx_audio.tts.utils import load_model
root = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(root, "words"); os.makedirs(out, exist_ok=True)
model = load_model("mlx-community/Kokoro-82M-bf16")
SR = 24000
voices = ["af_heart", "af_bella", "af_nicole", "am_adam", "am_michael", "bf_emma", "bm_george", "af_sky"]
texts = {"six_bang": "Six!", "seven_bang": "Seven!", "six_dot": "Six.", "seven_dot": "Seven.", "six_q": "Six?", "seven_q": "Seven?", "both": "Six... seven!"}
def trim(a, thr_db=-45.0, pad=0.02):
    thr = 10 ** (thr_db / 20); idx = np.where(np.abs(a) > thr)[0]
    if idx.size == 0: return a
    return a[max(0, idx[0] - int(pad * SR)): min(len(a), idx[-1] + int(pad * SR))]
for v in voices:
    for k, txt in texts.items():
        path = os.path.join(out, f"{v}_{k}.wav")
        if os.path.exists(path): continue
        t0 = time.time(); ch = []
        try:
            for r in model.generate(text=txt, voice=v, speed=1.0, lang_code="b" if v.startswith("b") else "a"):
                ch.append(np.array(r.audio, dtype=np.float32).reshape(-1))
        except Exception as e:
            print("fail", v, k, e); continue
        a = trim(np.concatenate(ch)) if ch else np.zeros(1, np.float32)
        f = int(0.006 * SR); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
        sf.write(path, a, SR)
        print(f"{v} {k}: {len(a)/SR:.2f}s ({time.time()-t0:.1f}s)", flush=True)
