/** 음원 파일 없이 WebAudio 로 만드는 짧은 효과음 */
let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** 첫 터치 때 호출해서 브라우저의 소리 잠금을 푼다 */
export function unlockAudio() {
  ac();
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.25, slideTo?: number) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/** 나무 말을 판에 "딱" 놓는 소리 */
function knock(start = 0, vol = 0.5) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const len = Math.floor(a.sampleRate * 0.06);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1400;
  f.Q.value = 1.2;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
  tone(180, start, 0.08, 'sine', 0.25, 90);
}

export const sfx = {
  select: () => tone(660, 0, 0.09, 'triangle', 0.12, 880),
  move: () => knock(0.44),
  capture: () => {
    knock(0.44, 0.6);
    tone(520, 0.42, 0.12, 'square', 0.06, 260);
    tone(780, 0.5, 0.2, 'triangle', 0.12, 1200);
  },
  check: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35 + i * 0.09, 0.22, 'triangle', 0.2));
  },
  defend: () => {
    [784, 659].forEach((f, i) => tone(f, 0.35 + i * 0.1, 0.2, 'triangle', 0.16));
  },
  wrong: () => tone(220, 0, 0.15, 'square', 0.06, 160),
  win: () => {
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.4 + i * 0.12, 0.3, 'triangle', 0.2));
  },
};
