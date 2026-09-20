let ctx: AudioContext | null = null;
let activeAudio: HTMLAudioElement | null = null;
const activeOscillators = new Set<OscillatorNode>();

export function stopAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }

  for (const oscillator of activeOscillators) {
    try { oscillator.stop(); } catch {}
  }
  activeOscillators.clear();

  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function playSound(src: string, volume = 0.6) {
  if (typeof window === "undefined") return;
  stopAudio();
  const audio = new Audio(src);
  audio.volume = volume;
  activeAudio = audio;
  audio.onended = () => {
    if (activeAudio === audio) activeAudio = null;
  };
  audio.play().catch(() => {
    if (activeAudio === audio) activeAudio = null;
  });
}

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

export function tick(freq = 800, dur = 0.05) {
  const c = getCtx(); if (!c) return;
  stopAudio();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square"; o.frequency.value = freq;
  g.gain.value = 0.05;
  o.connect(g); g.connect(c.destination);
  activeOscillators.add(o);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.stop(c.currentTime + dur);
  o.onended = () => activeOscillators.delete(o);
}

export function explode() {
  const c = getCtx(); if (!c) return;
  stopAudio();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(180, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.6);
  g.gain.value = 0.4;
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
  o.connect(g); g.connect(c.destination);
  activeOscillators.add(o);
  o.start(); o.stop(c.currentTime + 0.7);
  o.onended = () => activeOscillators.delete(o);
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

export function speak(text: string, lang = "id-ID") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  stopAudio();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95; u.pitch = 0.9;
  window.speechSynthesis.speak(u);
}

export function crack() {
  playSound("/bullet.mp3", 0.5);
}

export function seerSound() {
  playSound("/seer.mp3", 0.4);
}

export function win() {
  playSound("/WIN.mp3");
}

export function victory() {
  playSound("/victory.mp3");
}

export function failed() {
  playSound("/FAILED.mp3");
}

export function howlSound() {
  playSound("/howl.mp3");
}

export function roosterSound() {
  playSound("/ayam.mp3");
}

export function stopSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}