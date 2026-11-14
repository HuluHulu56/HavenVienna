let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ type = 'square', f0, f1 = f0, dur = 0.15, vol = 0.1, delay = 0 }) {
  const a = ac();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise({ dur = 0.15, vol = 0.12, delay = 0, lowpass = 1200 }) {
  const a = ac();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  unlock() { ac(); },
  get muted() { return muted; },
  toggleMute() { muted = !muted; return muted; },
  boing(spring = 1, charge = 0) {
    tone({ type: 'sine', f0: 160 + 160 * spring, f1: 420 + 420 * spring + 400 * charge, dur: 0.16 + 0.1 * charge, vol: 0.07 });
  },
  stomp() {
    tone({ type: 'square', f0: 300, f1: 900, dur: 0.12, vol: 0.08 });
    noise({ dur: 0.08, vol: 0.08, lowpass: 2500 });
  },
  pickup() {
    [660, 880, 1320].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.09, vol: 0.08, delay: i * 0.06 }));
  },
  power() {
    [440, 554, 659, 880, 1108].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.1, vol: 0.06, delay: i * 0.05 }));
  },
  hit() {
    tone({ type: 'sawtooth', f0: 220, f1: 70, dur: 0.25, vol: 0.09 });
    noise({ dur: 0.12, vol: 0.06 });
  },
  rock() {
    noise({ dur: 0.18, vol: 0.14, lowpass: 600 });
    tone({ type: 'square', f0: 120, f1: 60, dur: 0.12, vol: 0.05 });
  },
  slip() { tone({ type: 'sine', f0: 900, f1: 300, dur: 0.2, vol: 0.05 }); },
  throwBall() { noise({ dur: 0.08, vol: 0.05, lowpass: 3000 }); },
  kick() {
    tone({ type: 'sine', f0: 120, f1: 40, dur: 0.35, vol: 0.25 });
    noise({ dur: 0.2, vol: 0.12, lowpass: 800 });
  },
  tick() { tone({ type: 'square', f0: 1200, dur: 0.03, vol: 0.03 }); },
  clink() {
    [2200, 2900].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f * 0.98, dur: 0.4, vol: 0.08, delay: i * 0.03 }));
  },
  fanfare() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.14, vol: 0.06, delay: i * 0.12 }));
  },
};
