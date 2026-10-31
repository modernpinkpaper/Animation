#!/usr/bin/env python3
"""Build the voice track and the per-frame plan for the 'say a line' animation.

Writes: say_final.wav (voice), data.js (window.SayData: for every output frame the source frame of the traced clip,
how open the mouth is, where the mouth is). Needs mouth_raw.json (findmouth2.py) and the extracted reference frames.
"""
import wave, io, json, math
import numpy as np, cv2
from piper import PiperVoice, SynthesisConfig

V = '/tmp/claude-0/-home-user-Animation/b66cac53-6ad5-55fe-a61c-683b1be77c2d/scratchpad/voice/'
R = '/tmp/claude-0/-home-user-Animation/b66cac53-6ad5-55fe-a61c-683b1be77c2d/scratchpad/ref'
FPS = 24
LEAD = 7 / FPS      # seconds of silence before the groan
GAP = 0.25          # pause between the groan and the sentence
TAIL = 0.55

voice = PiperVoice.load(V + 'en_US-amy-medium.onnx')
def synth(text, ls, ns=0.8, nw=0.9):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        voice.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=ls, noise_scale=ns, noise_w_scale=nw))
    buf.seek(0)
    with wave.open(buf) as w:
        return w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), np.int16)
def trim(x, sr, thr=0.02):
    a = np.abs(x.astype(np.float32) / 32768); idx = np.nonzero(a > thr * a.max())[0]
    return x[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.04 * sr)]

sr, ugh = synth('Ugh!', 2.5); ugh = trim(ugh, sr)
sr, sent = synth("I'm so frustrated today!", 1.05); sent = trim(sent, sr)
z = lambda s: np.zeros(int(s * sr), np.int16)
wav = np.concatenate([z(LEAD), ugh, z(GAP), sent, z(TAIL)])
with wave.open('say_final.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(wav.tobytes())
dur = len(wav) / sr
N = math.ceil(dur * FPS)
print('audio', round(dur, 2), 's ->', N, 'frames; ugh at', round(LEAD, 2), 'sentence at', round(LEAD + len(ugh) / sr + GAP, 2))

# ---- per-frame audio features ----
f = wav.astype(np.float32) / 32768; hop = sr / FPS
rms = np.array([np.sqrt(np.mean(f[int(i * hop):int((i + 1) * hop)] ** 2) + 1e-12) for i in range(N)])
zcr = np.array([np.mean(np.abs(np.diff(np.sign(f[int(i * hop):int((i + 1) * hop)]))) > 0) if len(f[int(i * hop):int((i + 1) * hop)]) > 2 else 0 for i in range(N)])
p95 = np.percentile(rms, 95)
op = np.clip((rms / p95) ** 0.8, 0, 1.1)
op[rms < 0.02 * p95] = 0
sm = op.copy()
for i in range(N):
    sm[i] = 0.25 * op[max(0, i - 1)] + 0.5 * op[i] + 0.25 * op[min(N - 1, i + 1)]
sm = np.concatenate([sm[1:], [0]])            # mouth leads the sound by one frame
teeth = (zcr > 0.30) & (rms > 0.12 * p95)
teeth = np.concatenate([teeth[1:], [False]])

# ---- which source frame of the traced clip to show on each output frame ----
def linear(a, b, n): return [round(a + (b - a) * i / max(1, n - 1)) for i in range(n)]
def hold(a, b, n):
    seq, i, d = [], a, 1
    for _ in range(n):
        seq.append(i)
        if i + d > b or i + d < a: d = -d
        i += d
    return seq
path = (linear(19, 24, 6) + linear(25, 32, 8) + hold(33, 39, 14) + linear(40, 43, 4) + linear(44, 61, 18)
        + hold(55, 61, 31) + linear(62, 66, 5))
path += hold(65, 66, max(0, N - len(path)))
path = path[:N]
print('path length', len(path), 'of', N)

# ---- mouth geometry + local skin colour per source frame ----
raw = json.load(open('mouth_raw.json'))
def skin_of(fi, m):
    img = cv2.imread(f'{R}/f_{fi + 1:03d}.png')
    x0, y0, x1, y1 = m['x'] - 12, m['y'] - 12, m['x'] + m['w'] + 12, m['y'] + m['h'] + 12
    c = img[max(0, y0):y1, max(0, x0):x1].reshape(-1, 3).astype(int)
    b, g, r = c[:, 0], c[:, 1], c[:, 2]
    ok = (r > 200) & (g > 130) & (g < 215) & (b > 70) & (b < 175) & (r > g + 25)
    col = np.median(c[ok], 0) if ok.any() else np.array([132, 185, 252])
    return '#%02x%02x%02x' % (int(col[2]), int(col[1]), int(col[0]))
def angle_of(fi):  # mouth axis tilt (rad, clockwise) while the head is turned; level afterwards
    return 0.35 if fi <= 18 else 0.20 if fi == 19 else 0.1 if fi == 20 else 0.0
items = []
for i in range(N):
    s = path[i]; m = raw[str(s)]
    items.append(dict(src=s, open=round(float(sm[i]), 3), teeth=bool(teeth[i]), cx=round(m['cx'], 1), cy=round(m['cy'], 1),
                      w=m['w'], h=m['h'], x=m['x'], y=m['y'], skin=skin_of(s, m), ang=angle_of(s)))
open('data.js', 'w').write('window.SayData=' + json.dumps(dict(fps=FPS, n=N, items=items), separators=(',', ':')) + ';')
print('open (per frame):', ' '.join(f'{x:.1f}' for x in sm))
