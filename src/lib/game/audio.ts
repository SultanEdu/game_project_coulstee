let ctx: AudioContext | null = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

export function tick(freq = 800, dur = 0.05) {
  const c = getCtx(); if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square"; o.frequency.value = freq;
  g.gain.value = 0.05;
  o.connect(g); g.connect(c.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.stop(c.currentTime + dur);
}

export function explode() {
  const c = getCtx(); if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(180, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.6);
  g.gain.value = 0.4;
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.7);
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

export function speak(text: string, lang = "id-ID") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95; u.pitch = 0.9;
  window.speechSynthesis.speak(u);
}

export function crack() {
  if (typeof window === "undefined") return;
  const audio = new Audio("/bullet.mp3");
  audio.volume = 0.5;
  audio.play().catch(() => {});
}

export function seerSound() {
  if (typeof window === "undefined") return;
  const audio = new Audio("/seer.mp3");
  audio.volume = 0.4;
  audio.play().catch(() => {});
}

export function win() {
  if (typeof window === "undefined") return;
  const audio = new Audio("/WIN.mp3");
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

export function victory() {
  if (typeof window === "undefined") return;
  const audio = new Audio("/victory.mp3");
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

export function failed() {
  if (typeof window === "undefined") return;
  const audio = new Audio("/FAILED.mp3");
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

export function howlSound() {
  if (typeof window === "undefined") return;
  const audio = new Audio("/howl.mp3");
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

export function roosterSound() {
  if (typeof window === "undefined") return;
  const audio = new Audio("/ayam.mp3");
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

export function stopSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}