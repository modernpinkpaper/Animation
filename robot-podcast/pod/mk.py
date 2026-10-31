import sys, os, wave, json, subprocess, importlib, numpy as np
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
sys.path.insert(0, BASE + 'pydeps3'); sys.path.insert(0, BASE + 'pod'); sys.path.insert(0, BASE + 'pod/eps')
from piper import PiperVoice
try: from piper import SynthesisConfig
except ImportError: SynthesisConfig = None
from voices_cfg import VOICE, NAMES
ep = sys.argv[1]; mod = importlib.import_module('e' + ep); META, L = mod.META, mod.L
SR = 44100; out_dir = BASE + f'pod/e{ep}'; os.makedirs(out_dir, exist_ok=True)
vc = {}
def voice(name):
    if name not in vc: vc[name] = PiperVoice.load(BASE + 'voices/' + name + '.onnx')
    return vc[name]
# ---- TTS
if '--notts' not in sys.argv:
    for i, row in enumerate(L):
        who, text = row[0], row[1]; vn, pitch, ls = VOICE[who]; v = voice(vn); raw = f'{out_dir}/r{i:02d}.wav'; fin = f'{out_dir}/l{i:02d}.wav'
        with wave.open(raw, 'wb') as w:
            if SynthesisConfig: v.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=ls))
            else: v.synthesize_wav(text, w)
        sr = v.config.sample_rate
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', f'asetrate={int(sr*pitch)},aresample={SR},atempo={1/pitch:.4f},highpass=f=90,aecho=0.8:0.9:5:0.18,loudnorm=I=-18:TP=-2', '-ac', '1', '-ar', str(SR), fin], check=True)
# ---- timeline
SEATX = {k: (-2.8 if i % 2 == 0 else 2.8) for i, k in enumerate(META['cast'])}
def load(i):
    w = wave.open(f'{out_dir}/l{i:02d}.wav'); return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768
cursor = 0.0; lines = []; clips = []
for i, row in enumerate(L):
    who, text, emo, gap = row[:4]; card = row[4] if len(row) > 4 else None
    x = load(i); idx = np.where(np.abs(x) > 0.02)[0]; lead = idx[0] / SR; tail = idx[-1] / SR
    onset = cursor + gap + (0.9 if i == 0 else 0); start = onset - lead; v0 = onset; v1 = start + tail
    hop = SR // 48; n = len(x) // hop
    env = np.array([np.sqrt((x[k*hop:(k+1)*hop] ** 2).mean()) for k in range(n)])
    ref = np.percentile(env[env > 0.01], 90) if (env > 0.01).any() else 1
    env = np.clip(env / ref, 0, 1); env = np.convolve(env, [0.25, 0.5, 0.25], 'same')
    d = dict(i=i, who=who, name=NAMES[who], role=META['roles'][who], text=text, emo=emo, start=round(start, 3), v0=round(v0, 3), v1=round(v1, 3), env=[round(float(e), 2) for e in env])
    if card: d['card'] = dict(t=card[0], b=card[1], c=card[2] if len(card) > 2 else None)
    lines.append(d); clips.append((start, x, who)); cursor = v1
END = cursor; onair = max(0.3, lines[0]['v0'] - 1.4); total = END + 7.0
js = dict(lines=lines, onair=round(onair, 3), end=round(END, 3), total=round(total, 3)); js.update({k: META[k] for k in ('cast', 'theme', 'intro', 'badge', 'titleCard', 'end1', 'end2')})
json.dump(js, open(BASE + f'anim/ep{ep}.json', 'w'))
print(f'ep{ep}: speech ends {END:.1f}s total {total:.1f}s frames {int(total*24)}')
# ---- audio
N = int(total * SR); voices = np.zeros((N, 2), dtype=np.float32)
for start, x, who in clips:
    pan = SEATX[who] / 7.0 * 0.35; a = int(start * SR); gl, gr = 1 - max(0, pan), 1 + min(0, pan); b = min(N, a + len(x))
    voices[a:b, 0] += x[:b-a] * gl * 0.95; voices[a:b, 1] += x[:b-a] * gr * 0.95
t = np.arange(N) / SR
def follow(sig, win=0.12): k = int(win * SR); return np.convolve(np.abs(sig), np.ones(k) / k, 'same')
duck = 1 - 0.62 * np.clip(follow(voices.mean(1)) * 14, 0, 1)
bpm, prog = META.get('music', (84, 0)); beat = 60 / bpm; bar = 4 * beat
PROGS = [[[57,60,64,67],[50,57,60,65],[55,59,62,65],[48,55,59,64]], [[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,65]], [[52,55,59,62],[57,60,64,67],[50,54,57,60],[55,59,62,66]], [[53,57,60,64],[55,58,62,65],[57,60,64,67],[50,53,57,60]]]
chords = PROGS[prog % 4]; music = np.zeros(N)
midi = lambda m: 440 * 2 ** ((m - 69) / 12)
for b in range(int(total / bar) + 2):
    ch = chords[b % 4]; t0 = b * bar
    for j, m in enumerate(ch):
        for rep in range(2):
            ts = t0 + rep * 2 * beat + j * 0.03; a = int(ts * SR)
            if a >= N: continue
            tt = np.arange(min(int(1.7 * SR), N - a)) / SR
            s = (np.sin(2*np.pi*midi(m)*tt) + 0.35*np.sin(2*np.pi*midi(m)*2*tt) + 0.12*np.sin(2*np.pi*midi(m)*3*tt)) * np.exp(-tt * 2.6); music[a:a+len(s)] += s * 0.045
    for q in range(4):
        a = int((t0 + q * beat) * SR)
        if a >= N: continue
        tt = np.arange(min(int(0.9 * beat * SR), N - a)) / SR; music[a:a+len(tt)] += np.sin(2*np.pi*midi(ch[0]-12)*tt) * np.exp(-tt * 3.5) * 0.10 * (1 if q % 2 == 0 else 0.6)
    r = np.random.default_rng(b)
    for q in range(8):
        a = int((t0 + q * beat / 2) * SR)
        if a >= N: continue
        tt = np.arange(min(int(0.06 * SR), N - a)) / SR; music[a:a+len(tt)] += r.standard_normal(len(tt)) * np.exp(-tt * 90) * 0.02 * (1.4 if q % 2 else 0.8)
        if q % 4 == 0:
            tt = np.arange(min(int(0.25 * SR), N - a)) / SR; music[a:a+len(tt)] += np.sin(2*np.pi*(60 + 80*np.exp(-tt*30))*tt) * np.exp(-tt*14) * 0.12
live = np.clip((t - onair) / 1.0, 0, 1); sm = np.convolve(music, np.ones(40) / 40, 'same'); mg = 0.18 + 0.82 * live
musicS = (music * live + sm * (1 - live)) * mg * duck
sfx = np.zeros((N, 2))
def ding(ts, f=1320, g=0.16):
    a = int(ts * SR); tt = np.arange(int(0.7 * SR)) / SR; s = (np.sin(2*np.pi*f*tt) + 0.5*np.sin(2*np.pi*f*1.5*tt)) * np.exp(-tt*7) * g; b = min(N, a + len(s)); sfx[a:b, 0] += s[:b-a]; sfx[a:b, 1] += s[:b-a]
def whoosh(ts, d=0.5, g=0.12):
    a = int(ts * SR); n = int(d * SR); r = np.random.default_rng(int(ts*10)).standard_normal(n); tt = np.arange(n) / n; k = np.convolve(r, np.ones(24)/24, 'same') * np.sin(np.pi*tt)**2 * g; b = min(N, a+n); sfx[a:b, 0] += k[:b-a]; sfx[a:b, 1] += k[:b-a]
for j, f in enumerate([523, 659, 784, 1047, 1319]): ding(onair + j * 0.09, f, 0.14)
whoosh(onair - 0.1, 0.6, 0.18)
for i in META['intro']: ding(lines[i]['v0'] - 0.15, 1760, 0.08)
for i, l in enumerate(lines):
    if 'card' in l: ding(l['v0'] + 0.2, 1568, 0.07)
for j, f in enumerate([784, 988, 1175, 1568]): ding(END + 1.0 + j * 0.11, f, 0.14)
room = np.random.default_rng(1).standard_normal(N) * 0.0025
mix = np.zeros((N, 2)); mix[:, 0] = voices[:, 0] + musicS * 0.9 + sfx[:, 0] + room; mix[:, 1] = voices[:, 1] + musicS * 0.9 + sfx[:, 1] + room
mix *= np.clip(np.minimum(t / 0.4, (total - t) / 1.5), 0, 1)[:, None]; mix = np.tanh(mix * 0.9); mix = mix / np.abs(mix).max() * 0.9
with wave.open(BASE + f'pod/e{ep}_raw.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('audio ok')
