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

let sounds = null;

// real sound files when they're loaded, otherwise the beeps above
function play(key, config = {}) {
  if (!sounds || muted || !sounds.game.cache.audio.exists(key)) return false;
  sounds.play(key, { volume: 0.6, ...config });
  return true;
}

export const sfx = {
  use(soundManager) { sounds = soundManager; },
  unlock() { ac(); },
  get muted() { return muted; },
  toggleMute() {
    muted = !muted;
    if (sounds) sounds.mute = muted;
    return muted;
  },
  music() {
    if (!sounds || !sounds.game.cache.audio.exists('music')) return;
    const start = () => {
      if (!sounds.get('music')) sounds.add('music', { loop: true, volume: 0.3 }).play();
    };
    if (sounds.locked) sounds.once('unlocked', start);
    else start();
  },
  boing(spring = 1, charge = 0) {
    if (play('boing', { volume: 0.35, detune: (spring - 0.5) * 600 + charge * 300 })) return;
    tone({ type: 'sine', f0: 160 + 160 * spring, f1: 420 + 420 * spring + 400 * charge, dur: 0.16 + 0.1 * charge, vol: 0.07 });
  },
  stomp() {
    if (play('stomp')) return;
    tone({ type: 'square', f0: 300, f1: 900, dur: 0.12, vol: 0.08 });
    noise({ dur: 0.08, vol: 0.08, lowpass: 2500 });
  },
  pickup() {
    if (play('pickup')) return;
    [660, 880, 1320].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.09, vol: 0.08, delay: i * 0.06 }));
  },
  power() {
    if (play('power')) return;
    [440, 554, 659, 880, 1108].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.1, vol: 0.06, delay: i * 0.05 }));
  },
  hit() {
    if (play('hit')) return;
    tone({ type: 'sawtooth', f0: 220, f1: 70, dur: 0.25, vol: 0.09 });
    noise({ dur: 0.12, vol: 0.06 });
  },
  rock() {
    if (play('rock')) return;
    noise({ dur: 0.18, vol: 0.14, lowpass: 600 });
    tone({ type: 'square', f0: 120, f1: 60, dur: 0.12, vol: 0.05 });
  },
  slip() {
    if (play('slip', { volume: 0.4 })) return;
    tone({ type: 'sine', f0: 900, f1: 300, dur: 0.2, vol: 0.05 });
  },
  throwBall() { noise({ dur: 0.08, vol: 0.05, lowpass: 3000 }); },
  kick() {
    if (play('kick')) return;
    tone({ type: 'sine', f0: 120, f1: 40, dur: 0.35, vol: 0.25 });
    noise({ dur: 0.2, vol: 0.12, lowpass: 800 });
  },
  tick() { tone({ type: 'square', f0: 1200, dur: 0.03, vol: 0.03 }); },
  clink() {
    if (play('clink')) return;
    [2200, 2900].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f * 0.98, dur: 0.4, vol: 0.08, delay: i * 0.03 }));
  },
  fanfare() {
    if (play('fanfare')) return;
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.14, vol: 0.06, delay: i * 0.12 }));
  },
};
