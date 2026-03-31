/**
 * Sound system using Web Audio API synthesis.
 * All sounds are generated procedurally — no external files needed.
 * AudioContext is created on first user interaction to comply with browser autoplay policies.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = false;
let volume = 0.3;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(audioCtx.destination);
    const saved = localStorage.getItem('cg_sound_muted');
    if (saved === 'true') { isMuted = true; masterGain.gain.value = 0; }
    const savedVol = localStorage.getItem('cg_sound_volume');
    if (savedVol) { volume = parseFloat(savedVol); if (!isMuted) masterGain.gain.value = volume; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function getMaster(): GainNode {
  getContext();
  return masterGain!;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.2, delay = 0) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.05);
}

function playNoise(duration: number, gainVal = 0.1, delay = 0, filterFreq = 2000) {
  const ctx = getContext();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainVal, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(getMaster());
  source.start(ctx.currentTime + delay);
}

function playSweep(fromFreq: number, toFreq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.15, delay = 0) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, ctx.currentTime + delay);
  osc.frequency.exponentialRampToValueAtTime(toFreq, ctx.currentTime + delay + duration);
  gain.gain.setValueAtTime(gainVal, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.05);
}

export const sounds = {
  playDiceRoll() {
    for (let i = 0; i < 15; i++) playNoise(0.03, 0.08, i * 0.05, 800 - i * 30);
  },
  playDiceLand() {
    playTone(80, 0.15, 'sine', 0.25);
    playNoise(0.08, 0.12, 0.02, 300);
  },
  playCardFlip() { playSweep(1200, 400, 0.15, 'triangle', 0.1); },
  playBallPass() { playSweep(300, 600, 0.4, 'sine', 0.15); },
  playBallDrop() {
    playSweep(500, 100, 0.3, 'sine', 0.15);
    playTone(80, 0.12, 'sine', 0.2, 0.3);
    playNoise(0.05, 0.1, 0.3, 200);
    playTone(80, 0.08, 'sine', 0.1, 0.55);
    playTone(80, 0.05, 'sine', 0.05, 0.7);
  },
  playGoalScore() {
    playTone(400, 0.15, 'sine', 0.2);
    playTone(500, 0.15, 'sine', 0.2, 0.12);
    playTone(600, 0.15, 'sine', 0.2, 0.24);
    playTone(400, 0.6, 'sine', 0.1, 0.4);
    playTone(500, 0.6, 'sine', 0.1, 0.4);
    playTone(600, 0.6, 'sine', 0.1, 0.4);
  },
  playGoalMiss() { playSweep(600, 200, 0.5, 'sawtooth', 0.08); },
  playTokenGain() {
    playTone(800, 0.1, 'sine', 0.15);
    playTone(900, 0.1, 'sine', 0.12, 0.05);
  },
  playTokenLoss() {
    playSweep(400, 200, 0.15, 'sine', 0.12);
    playNoise(0.05, 0.04, 0.05, 500);
  },
  playNegativeEvent() {
    playTone(60, 0.5, 'sine', 0.15);
    playNoise(0.3, 0.06, 0.1, 200);
  },
  playPositiveEvent() { playTone(600, 0.8, 'triangle', 0.12); },
  playChainBonus() {
    playTone(400, 0.08, 'sine', 0.15);
    playTone(500, 0.08, 'sine', 0.15, 0.08);
    playTone(600, 0.08, 'sine', 0.15, 0.16);
    playTone(800, 0.08, 'sine', 0.2, 0.24);
  },
  playTransformation() {
    playTone(300, 2.5, 'sine', 0.08);
    playTone(450, 2.5, 'sine', 0.06, 0.3);
    playTone(600, 2.5, 'sine', 0.05, 0.6);
  },
  playCelebration() {
    for (let i = 0; i < 3; i++) {
      const base = 400 + i * 100;
      playTone(base, 0.15, 'sine', 0.15, i * 0.5);
      playTone(base + 100, 0.15, 'sine', 0.15, i * 0.5 + 0.1);
      playTone(base + 200, i === 2 ? 1.0 : 0.15, 'sine', 0.15, i * 0.5 + 0.2);
    }
  },
  playButtonClick() { playTone(1000, 0.02, 'square', 0.05); },
  playTimerTick() { playTone(600, 0.05, 'sine', 0.1); },
  playTimerWarning() { playTone(800, 0.05, 'sine', 0.15); },
  setVolume(v: number) {
    volume = Math.max(0, Math.min(1, v));
    localStorage.setItem('cg_sound_volume', String(volume));
    if (masterGain && !isMuted) masterGain.gain.value = volume;
  },
  mute() {
    isMuted = true;
    localStorage.setItem('cg_sound_muted', 'true');
    if (masterGain) masterGain.gain.value = 0;
  },
  unmute() {
    isMuted = false;
    localStorage.setItem('cg_sound_muted', 'false');
    if (masterGain) masterGain.gain.value = volume;
  },
  getIsMuted(): boolean { return isMuted; },
  getVolume(): number { return volume; },
};

export function useSounds() { return sounds; }
