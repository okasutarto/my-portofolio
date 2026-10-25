// Synthesized sound effects (WebAudio, no audio files).
// Browsers only allow audio after a user gesture, so the context is created on the first
// click/key/touch; anything played before that is silently skipped.
import { ref } from "vue";

const STORAGE_KEY = "sfx-muted";
const readMuted = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const muted = ref(readMuted());
let ctx = null;
let out = null;
let noiseBuffer = null;
let hushDepth = 0;
const lastPlayed = {};

function createContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  // A gentle compressor keeps overlapping hits from clipping
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  out = ctx.createGain();
  out.gain.value = 0.55;
  out.connect(comp).connect(ctx.destination);
  // One second of white noise, reused by every noisy sound
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

const unlock = () => {
  if (!ctx) createContext();
  if (ctx && ctx.state === "suspended") ctx.resume();
};
// Safari only lets audio start from click/touchend/key events (not pointerdown), so listen
// to all of them; Chrome is happy with the earliest one
["pointerdown", "pointerup", "click", "touchend", "keydown"].forEach((ev) =>
  window.addEventListener(ev, unlock, { capture: true, passive: true }),
);

// ---------- building blocks ----------
// Attack/decay envelope on a gain node
function envelope(gain, t, { attack = 0.005, peak = 0.5, decay = 0.15 }) {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(t, { type = "sine", freq = 440, to, attack, peak, decay = 0.15 }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + (attack || 0.005) + decay);
  envelope(gain, t, { attack, peak, decay });
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + (attack || 0.005) + decay + 0.05);
}

function noise(t, { filter = "bandpass", freq = 1500, to, q = 1, attack, peak, decay = 0.15 }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const biquad = ctx.createBiquadFilter();
  biquad.type = filter;
  biquad.frequency.setValueAtTime(freq, t);
  if (to) biquad.frequency.exponentialRampToValueAtTime(to, t + (attack || 0.005) + decay);
  biquad.Q.value = q;
  const gain = ctx.createGain();
  envelope(gain, t, { attack, peak, decay });
  src.connect(biquad).connect(gain).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + (attack || 0.005) + decay + 0.05);
}

const vary = (n, spread = 0.08) => n * (1 + (Math.random() * 2 - 1) * spread);

// ---------- the sounds ----------
const SOUNDS = {
  // Something heavy landing on a desk
  thud(t, { strength = 1 } = {}) {
    tone(t, { freq: vary(130), to: 45, peak: 0.9 * strength, decay: 0.22 });
    noise(t, { filter: "lowpass", freq: 500, peak: 0.45 * strength, decay: 0.08 });
  },
  // A sheet of paper flicked: a few tiny bright crackles plus the soft air under the sheet
  paper(t) {
    const crackles = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < crackles; i++) {
      const at = t + i * 0.018 + Math.random() * 0.01;
      noise(at, { filter: "highpass", freq: vary(3000, 0.3), q: 0.7, attack: 0.002, peak: 0.28 * (1 - i * 0.18), decay: 0.02 + Math.random() * 0.015 });
    }
    noise(t, { freq: 1800, q: 0.6, attack: 0.01, peak: 0.12, decay: 0.09 });
  },
  // Thumbing through a stack of pages: soft swishes in quick succession over a breath of air
  riffle(t, { count = 6, duration = 0.4 } = {}) {
    noise(t, { filter: "lowpass", freq: 900, attack: 0.03, peak: 0.13, decay: duration });
    for (let i = 0; i < count; i++) {
      const at = t + (duration / count) * i + Math.random() * 0.015;
      noise(at, { freq: vary(2000, 0.3), q: 0.9, attack: 0.006, peak: 0.16 + Math.random() * 0.06, decay: 0.05 + Math.random() * 0.03 });
    }
  },
  // A cover or a big sheet moving: a crinkle of many short crackles that swells and fades
  rustle(t, { duration = 0.6 } = {}) {
    for (let at = t; at < t + duration; at += 0.012 + Math.random() * 0.03) {
      const swell = Math.sin(Math.PI * ((at - t) / duration));
      noise(at, { filter: "highpass", freq: vary(2400, 0.4), q: 0.8, attack: 0.002, peak: 0.05 + 0.2 * swell, decay: 0.012 + Math.random() * 0.02 });
    }
    noise(t, { freq: 1200, q: 0.5, attack: duration * 0.4, peak: 0.06, decay: duration * 0.6 });
  },
  // Paper torn along a perforation: fibres snapping faster and faster over the rip itself
  tear(t, { duration = 0.32 } = {}) {
    for (let at = t; at < t + duration; at += 0.006 + Math.random() * 0.012) {
      const p = (at - t) / duration;
      noise(at, { filter: "highpass", freq: vary(2600 - 1000 * p, 0.3), q: 0.9, attack: 0.001, peak: 0.12 + 0.18 * Math.sin(Math.PI * p), decay: 0.01 + Math.random() * 0.012 });
    }
    noise(t, { freq: 2200, to: 900, q: 0.7, attack: 0.02, peak: 0.22, decay: duration });
  },
  // Air rushing past something thrown
  whoosh(t, { duration = 0.45, up = true } = {}) {
    noise(t, { freq: up ? 350 : 2600, to: up ? 2600 : 350, q: 1.4, attack: duration * 0.5, peak: 0.35, decay: duration * 0.5 });
  },
  // Rubber stamp: thump plus a sharp click
  stamp(t) {
    tone(t, { freq: 170, to: 55, peak: 0.9, decay: 0.14 });
    noise(t, { filter: "highpass", freq: 3000, peak: 0.5, decay: 0.035 });
    noise(t, { filter: "lowpass", freq: 900, peak: 0.4, decay: 0.09 });
  },
  // Card slapped flat onto a surface
  slap(t) {
    noise(t, { freq: vary(1300), q: 0.7, peak: 0.7, decay: 0.08 });
    tone(t, { freq: 150, to: 70, peak: 0.45, decay: 0.1 });
  },
  // Small check-mark tick
  tick(t, { pitch = 1 } = {}) {
    tone(t, { type: "triangle", freq: vary(1700 * pitch, 0.03), peak: 0.22, decay: 0.045 });
  },
  // Bubbly pop for things appearing
  pop(t, { pitch = 1 } = {}) {
    tone(t, { freq: vary(320 * pitch), to: 950 * pitch, peak: 0.35, decay: 0.11 });
  },
  // Notification chime
  ping(t) {
    tone(t, { freq: 1318, peak: 0.25, decay: 0.5 });
    tone(t + 0.09, { freq: 1976, peak: 0.22, decay: 0.6 });
  },
  // Receipt printer: a run of motor clicks
  printer(t, { duration = 1, steps = 18 } = {}) {
    for (let i = 0; i < steps; i++) {
      const at = t + (duration / steps) * i;
      noise(at, { filter: "highpass", freq: 2200, peak: 0.28, decay: 0.018 });
      tone(at, { type: "square", freq: 110, peak: 0.05, decay: 0.025 });
    }
  },
  // Pen scratching on paper
  scribble(t, { duration = 0.45 } = {}) {
    for (let at = t; at < t + duration; at += 0.035 + Math.random() * 0.05) {
      noise(at, { freq: vary(3800, 0.25), q: 2.5, attack: 0.01, peak: 0.12, decay: 0.03 + Math.random() * 0.03 });
    }
  },
  // Mechanical keyboard key: a sharp click, then the low "thock" of the keycap bottoming out
  key(t) {
    noise(t, { freq: vary(1800, 0.2), q: 1.2, attack: 0.001, peak: 0.25, decay: 0.012 });
    noise(t + 0.008, { filter: "lowpass", freq: 600, attack: 0.002, peak: 0.18, decay: 0.03 });
    tone(t, { freq: vary(140, 0.15), to: 90, peak: 0.08, decay: 0.035 });
  },
  // Cartoon "speech": a short voiced syllable at a random pitch, for talking speech bubbles
  talk(t) {
    const notes = [220, 247, 262, 294, 330];
    const base = notes[Math.floor(Math.random() * notes.length)];
    tone(t, { type: "triangle", freq: base * 1.15, to: base, attack: 0.008, peak: 0.16, decay: 0.07 });
    tone(t, { freq: base * 2.02, to: base * 1.9, attack: 0.008, peak: 0.06, decay: 0.06 });
  },
  // Robot chatter
  blip(t) {
    const notes = [523, 587, 659, 784, 880];
    tone(t, { type: "square", freq: notes[Math.floor(Math.random() * notes.length)], peak: 0.07, decay: 0.05 });
  },
  // Something went wrong
  buzz(t) {
    tone(t, { type: "sawtooth", freq: 110, peak: 0.16, decay: 0.2 });
    tone(t + 0.02, { type: "sawtooth", freq: 116, peak: 0.12, decay: 0.18 });
  },
  // Plain UI click
  click(t) {
    tone(t, { freq: 900, to: 550, peak: 0.2, decay: 0.03 });
  },
};

// Minimum gap between two plays of the same sound, so fast loops don't machine-gun
const MIN_GAP = { tear: 0.2, riffle: 0.3, key: 0.035, talk: 0.06, blip: 0.07, tick: 0.03, paper: 0.04, scribble: 0.3, printer: 0.5, rustle: 0.3 };

function play(name, options = {}) {
  if (muted.value || hushDepth > 0 || !ctx || ctx.state !== "running" || document.hidden) return;
  const now = ctx.currentTime;
  const at = now + (options.delay || 0);
  const gap = MIN_GAP[name] ?? 0.02;
  if (lastPlayed[name] !== undefined && at - lastPlayed[name] < gap) return;
  lastPlayed[name] = at;
  SOUNDS[name](at, options);
}

// sfx.thud(), sfx.paper({ delay: 0.1 }), ...
export const sfx = Object.fromEntries(Object.keys(SOUNDS).map((name) => [name, (options) => play(name, options)]));

// True when sounds would actually be heard: not muted and unlocked by a user gesture.
// Lets an intro wait for a click instead of playing silently.
export const audioReady = () => muted.value || (!!ctx && ctx.state === "running");

// Run something (e.g. fast-forwarding a timeline) without any of its sounds
export function hush(fn) {
  hushDepth++;
  try {
    return fn();
  } finally {
    hushDepth--;
  }
}

export function useSfx() {
  const toggleMute = () => {
    muted.value = !muted.value;
    try {
      localStorage.setItem(STORAGE_KEY, muted.value ? "1" : "0");
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit
    }
    if (!muted.value) {
      unlock();
      play("click");
    }
  };
  return { muted, toggleMute };
}
