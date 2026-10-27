// Synthesized sound effects (WebAudio, no audio files).
// Try autoplay when allowed; otherwise the first user gesture unlocks the context.
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
// True while a gesture's resume() is pending: sounds scheduled now play once it lands, so the
// very click that unlocks audio is heard too
let resuming = false;
const lastPlayed = {};

function createContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  // The sounds are synthesized quietly, so they go through a compressor that evens them out, a
  // makeup gain that brings them up to a normal listening level, and a limiter on the end so
  // overlapping hits can't clip
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  const makeup = ctx.createGain();
  makeup.gain.value = 2.6;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.1;
  out = ctx.createGain();
  out.gain.value = 1;
  out.connect(comp).connect(makeup).connect(limiter).connect(ctx.destination);
  // One second of white noise, reused by every noisy sound
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  void loadSamples();
  return ctx;
}

// A few recorded blade sounds (Kenney RPG Audio, CC0) layered under the synth, which can't fake
// the grain of real steel. Until they've loaded (or if they fail) the synth plays alone.
const SAMPLE_FILES = { draw: ["blade-draw-1", "blade-draw-2"], slice: ["blade-slice-1", "blade-slice-2"] };
const samples = {};
let samplesLoading = null;

function loadSamples() {
  if (samplesLoading) return samplesLoading;
  const loadOne = async (file) => {
    const res = await fetch(`${process.env.BASE_URL}sfx/${file}.m4a`);
    if (!res.ok) throw new Error(file);
    return ctx.decodeAudioData(await res.arrayBuffer());
  };
  samplesLoading = Promise.all(
    Object.entries(SAMPLE_FILES).map(async ([group, files]) => {
      const buffers = await Promise.allSettled(files.map(loadOne));
      samples[group] = buffers.filter((r) => r.status === "fulfilled").map((r) => r.value);
    }),
  );
  return samplesLoading;
}

const unlock = async () => {
  try {
    const needsStart = !ctx || ctx.state !== "running";
    if (!ctx || ctx.state === "closed") {
      createContext();
      Object.keys(lastPlayed).forEach((name) => delete lastPlayed[name]);
    }
    if (!ctx) return false;
    if (needsStart) {
      // Start a source before yielding to resume(), including during a gesture retry.
      // This primes WebKit's audio output as well as resuming the context.
      const resumed = ctx.resume();
      const primer = ctx.createBufferSource();
      primer.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      primer.connect(out);
      primer.onended = () => primer.disconnect();
      primer.start(0);
      resuming = true;
      try {
        await resumed;
      } finally {
        resuming = false;
      }
    }
    return ctx.state === "running";
  } catch {
    return false;
  }
};
// Never await this during page rendering: browsers can leave resume() pending
// until a user gesture when autoplay isn't permitted.
export function initializeAudio() {
  return muted.value ? Promise.resolve(false) : unlock();
}

// First interaction enables audio if autoplay was blocked.
// Later gestures also recover Safari audio after an interruption.
// Browsers only allow audio after a real gesture (a press, a tap or a key); moving the pointer
// or scrolling doesn't count, so the earliest moment is the first press anywhere.
["pointerdown", "click", "touchend", "keydown"].forEach((event) =>
  window.addEventListener(event, () => {
    if (!muted.value && (!ctx || ctx.state !== "running")) void unlock();
  }, { capture: true, passive: true }),
);

// ---------- building blocks ----------
// One of a group's recordings, picked at random and nudged in pitch so repeats don't sound
// identical. False when none is loaded, so the caller can fall back to pure synth.
function sample(t, group, { peak = 0.5, rate = 1 } = {}) {
  const list = samples[group];
  if (!list || !list.length) return false;
  const src = ctx.createBufferSource();
  src.buffer = list[Math.floor(Math.random() * list.length)];
  src.playbackRate.value = vary(rate, 0.06);
  const gain = ctx.createGain();
  gain.gain.value = vary(peak, 0.1);
  src.connect(gain).connect(out);
  src.onended = () => gain.disconnect();
  src.start(t);
  return true;
}

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

// A plucked string (Karplus–Strong): a burst of noise fed round a delay line the length of one
// period, softened a little on every pass. Rendered once per pitch and reused.
const pluckCache = new Map();
function pluckBuffer(freq) {
  const key = `${ctx.sampleRate}:${Math.round(freq * 10)}`;
  if (pluckCache.has(key)) return pluckCache.get(key);
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.floor(rate * 2.4), rate);
  const data = buffer.getChannelData(0);
  const period = Math.max(2, Math.round(rate / freq));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
  for (let i = 0; i < data.length; i++) {
    const k = i % period;
    data[i] = ring[k];
    ring[k] = 0.996 * 0.5 * (ring[k] + ring[(k + 1) % period]);
  }
  pluckCache.set(key, buffer);
  return buffer;
}
function pluck(t, freq, peak) {
  const src = ctx.createBufferSource();
  src.buffer = pluckBuffer(freq);
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 3200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
  src.connect(tone).connect(gain).connect(out);
  src.start(t);
  src.stop(t + 2.4);
}
// Open chords, low string to high (Hz)
const CHORDS = [
  [98, 123.47, 146.83, 196, 246.94, 392], // G
  [130.81, 164.81, 196, 261.63, 329.63], // C
  [146.83, 220, 293.66, 369.99], // D
  [82.41, 123.47, 164.81, 196, 246.94, 329.63], // Em
];
let chordIndex = 0;
// The groove's tempo (seconds per beat): exported so the speakers can pump in time
export const GROOVE_BEAT = 0.2;

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
  // Paper sliding over paper: a soft, breathy "shff" with a little grain in it
  slide(t, { duration = 0.26, up = true } = {}) {
    noise(t, { freq: up ? 2200 : 3800, to: up ? 3800 : 2200, q: 0.7, attack: duration * 0.4, peak: 0.13, decay: duration * 0.6 });
    for (let at = t + duration * 0.15; at < t + duration * 0.8; at += 0.03 + Math.random() * 0.04) {
      noise(at, { filter: "highpass", freq: vary(5000, 0.2), q: 0.6, attack: 0.002, peak: 0.025, decay: 0.012 });
    }
  },
  // A cardboard folder cover landing flat: a dull flop pushing a puff of air out
  flop(t, { strength = 1 } = {}) {
    noise(t, { filter: "lowpass", freq: 900, to: 180, attack: 0.004, peak: 0.3 * strength, decay: 0.13 });
    tone(t, { freq: vary(95), to: 60, peak: 0.22 * strength, decay: 0.11 });
  },
  // A filing drawer rolling on its runners, ending in a soft clunk against the stop
  drawer(t, { duration = 0.6 } = {}) {
    for (let at = t; at < t + duration; at += 0.022 + Math.random() * 0.018) {
      const swell = Math.sin(Math.PI * ((at - t) / duration));
      noise(at, { filter: "lowpass", freq: vary(260, 0.25), attack: 0.004, peak: 0.04 + 0.08 * swell, decay: 0.03 });
    }
    tone(t + duration, { freq: 150, to: 85, peak: 0.32, decay: 0.08 });
    noise(t + duration, { filter: "highpass", freq: 2400, attack: 0.001, peak: 0.08, decay: 0.02 });
  },
  // A folder knocking into place among the others: a short, hollow cardboard tap
  knock(t, { strength = 1 } = {}) {
    tone(t, { type: "triangle", freq: vary(210, 0.05), to: 150, peak: 0.18 * strength, decay: 0.06 });
    noise(t, { freq: 800, q: 1.2, attack: 0.002, peak: 0.12 * strength, decay: 0.04 });
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
  // Sipping a hot drink: air pulled in over the liquid (a rising hiss the liquid breaks into
  // a flutter, with little bubbles in it), a gulp, then a soft "ahh"
  slurp(t, { duration = 0.7 } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.4;
    band.frequency.setValueAtTime(800, t);
    band.frequency.exponentialRampToValueAtTime(2400, t + duration);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.32, t + 0.08);
    env.gain.setValueAtTime(0.32, t + duration - 0.12);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    // Flutter: the liquid keeps breaking the airflow up
    const flutter = ctx.createGain();
    flutter.gain.value = 0.55;
    const lfo = ctx.createOscillator();
    lfo.type = "triangle";
    lfo.frequency.setValueAtTime(18, t);
    lfo.frequency.linearRampToValueAtTime(34, t + duration);
    const depth = ctx.createGain();
    depth.gain.value = 0.45;
    lfo.connect(depth).connect(flutter.gain);
    src.connect(band).connect(env).connect(flutter).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + duration + 0.05);
    lfo.start(t);
    lfo.stop(t + duration + 0.05);
    // Bubbles: tiny rising chirps scattered through it
    for (let at = t + 0.05; at < t + duration - 0.05; at += 0.03 + Math.random() * 0.06) {
      tone(at, { freq: vary(450, 0.3), to: vary(1300, 0.3), peak: 0.05 + Math.random() * 0.06, decay: 0.025 });
    }
    // Gulp, then the "ahh"
    const gulp = t + duration + 0.12;
    tone(gulp, { freq: 230, to: 85, peak: 0.4, decay: 0.12 });
    noise(gulp, { filter: "lowpass", freq: 380, peak: 0.25, decay: 0.08 });
    noise(gulp + 0.22, { freq: 1100, to: 650, q: 0.8, attack: 0.06, peak: 0.07, decay: 0.35 });
  },
  // Leaves brushing together: a soft airy swish with a few gentle flutters, no paper crackle
  leaves(t, { duration = 0.6 } = {}) {
    noise(t, { freq: 2200, to: 1400, q: 0.5, attack: 0.08, peak: 0.1, decay: duration });
    for (let i = 0; i < 6; i++) {
      const at = t + 0.04 + i * (duration / 7) + Math.random() * 0.03;
      noise(at, { freq: vary(3600, 0.25), q: 1.2, attack: 0.02, peak: 0.05 + Math.random() * 0.03, decay: 0.08 + Math.random() * 0.05 });
    }
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
  // A downstrum on the guitar, one chord after another round the progression
  strum(t) {
    const chord = CHORDS[chordIndex++ % CHORDS.length];
    chord.forEach((freq, i) => pluck(t + i * 0.022 + Math.random() * 0.006, freq, 0.32 - i * 0.025));
  },
  // Luffy's laugh, "shi-shi-shi": three hissed syllables climbing in pitch, each with a little
  // voiced bounce under it
  shishishi(t) {
    for (let i = 0; i < 3; i++) {
      const at = t + i * 0.13;
      noise(at, { filter: "highpass", freq: vary(4200 + i * 500, 0.05), q: 1.2, attack: 0.008, peak: 0.22, decay: 0.07 });
      tone(at + 0.01, { type: "triangle", freq: vary(330 + i * 40, 0.03), to: 290 + i * 40, attack: 0.01, peak: 0.12, decay: 0.07 });
    }
  },
  // A small bird: two quick rising whistles
  chirp(t, { volume = 1 } = {}) {
    tone(t, { freq: vary(2600, 0.06), to: 3700, attack: 0.004, peak: 0.12 * volume, decay: 0.05 });
    tone(t + 0.09, { freq: vary(2900, 0.06), to: 4000, attack: 0.004, peak: 0.1 * volume, decay: 0.06 });
  },
  // Sparkle for a shooting star: a bright falling glint over a soft shimmer
  sparkle(t, { volume = 1 } = {}) {
    tone(t, { freq: 2800, to: 1600, attack: 0.005, peak: 0.12 * volume, decay: 0.5 });
    [0, 0.07, 0.15, 0.24].forEach((d, i) => tone(t + d, { type: "triangle", freq: 2093 * (1 + i * 0.25), peak: 0.07 * volume, decay: 0.18 }));
  },
  // The speakers coming on: a two-bar groove (kick, hats, a bass line and a bright riff).
  // Beat i lands at t + i * GROOVE_BEAT, so visuals can pulse in time.
  groove(t) {
    const beat = GROOVE_BEAT;
    const bass = [65.41, 65.41, 98, 87.31, 65.41, 65.41, 116.54, 98];
    const riff = [523.25, 659.25, 783.99, 659.25, 880, 783.99, 659.25, 1046.5];
    for (let i = 0; i < 8; i++) {
      const at = t + i * beat;
      if (i % 2 === 0) tone(at, { freq: 150, to: 45, peak: 0.7, decay: 0.16 });
      noise(at + beat / 2, { filter: "highpass", freq: 7000, peak: 0.12, decay: 0.03 });
      if (i % 4 === 2) noise(at, { freq: 1800, q: 0.8, peak: 0.3, decay: 0.09 });
      tone(at, { type: "sawtooth", freq: bass[i], peak: 0.12, decay: beat * 0.8 });
      tone(at + beat / 2, { type: "square", freq: riff[i], peak: 0.06, decay: beat * 0.4 });
    }
    tone(t + 8 * beat, { type: "triangle", freq: 1046.5, peak: 0.12, decay: 0.5 });
    tone(t + 8 * beat, { type: "triangle", freq: 1318.5, peak: 0.08, decay: 0.5 });
  },
  // The speakers switching off: a tape-stop slide down and a soft thump
  powerDown(t) {
    tone(t, { type: "sawtooth", freq: 440, to: 55, attack: 0.01, peak: 0.16, decay: 0.45 });
    tone(t + 0.45, { freq: 90, to: 40, peak: 0.4, decay: 0.12 });
  },
  // A cartoon mouse: two high squeaks
  squeak(t) {
    tone(t, { freq: vary(2400, 0.05), to: 3300, attack: 0.01, peak: 0.13, decay: 0.07 });
    tone(t + 0.1, { freq: vary(2700, 0.05), to: 3600, attack: 0.01, peak: 0.11, decay: 0.08 });
  },
  // Little feet scampering over the desk
  patter(t, { duration = 0.6, volume = 1 } = {}) {
    for (let at = t; at < t + duration; at += 0.05 + Math.random() * 0.03) {
      noise(at, { freq: vary(2500, 0.3), q: 2, attack: 0.002, peak: 0.06 * volume, decay: 0.012 });
    }
  },
  // A cat: a nasal rise and fall through a vowel-ish band (higher and shorter for a "mrrp")
  meow(t, { short = false } = {}) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    const f = vary(short ? 640 : 520, 0.08);
    const len = short ? 0.22 : 0.55;
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.linearRampToValueAtTime(f * 1.55, t + len * 0.35);
    osc.frequency.linearRampToValueAtTime(f * 1.05, t + len);
    const formant = ctx.createBiquadFilter();
    formant.type = "bandpass";
    formant.Q.value = 3;
    formant.frequency.setValueAtTime(900, t);
    formant.frequency.linearRampToValueAtTime(1600, t + len * 0.4);
    formant.frequency.linearRampToValueAtTime(1000, t + len);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
    gain.gain.setValueAtTime(0.35, t + len * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(formant).connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + len + 0.05);
  },
  // A purr: a low rumble pulsing about 25 times a second
  purr(t, { duration = 1.6 } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 180;
    const pulse = ctx.createGain();
    pulse.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 24;
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(pulse.gain);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.25);
    gain.gain.setValueAtTime(0.5, t + duration - 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(low).connect(pulse).connect(gain).connect(out);
    src.start(t);
    lfo.start(t);
    src.stop(t + duration + 0.05);
    lfo.stop(t + duration + 0.05);
  },
  // A flower popping open: a soft rising pluck
  bloom(t, { pitch = 1 } = {}) {
    tone(t, { type: "triangle", freq: 520 * pitch, to: 1040 * pitch, attack: 0.01, peak: 0.18, decay: 0.18 });
    tone(t + 0.05, { freq: 1560 * pitch, peak: 0.06, decay: 0.25 });
  },
  // A wall clock striking: a bell "ding-dong" with a soft metallic shimmer
  // A wall clock striking: a soft, low gong per stroke (the hour's count, up to `count`), each
  // with the little wooden clack of its hammer
  clockStrike(t, { count = 3 } = {}) {
    for (let i = 0; i < count; i++) {
      const at = t + i * 0.62;
      noise(at, { filter: "bandpass", freq: 2600, q: 2, peak: 0.12, decay: 0.03 });
      tone(at, { freq: 174.6, peak: 0.2, decay: 1.5 });
      tone(at, { freq: 174.6 * 2.76, peak: 0.05, decay: 0.7 });
      tone(at, { freq: 174.6 * 5.4, peak: 0.02, decay: 0.25 });
    }
  },
  // An office chair's gas lift letting go: a short pneumatic "pssht"
  hiss(t) {
    noise(t, { filter: "highpass", freq: 4200, to: 1800, q: 0.7, attack: 0.01, peak: 0.25, decay: 0.32 });
    tone(t, { freq: 120, to: 70, peak: 0.12, decay: 0.12 });
  },
  // A chair swivelling: a few dry creaks of the base, dropping in pitch as it slows
  creak(t) {
    for (let i = 0; i < 4; i++) {
      tone(t + i * 0.16 + i * i * 0.03, { type: "sawtooth", freq: vary(260 - i * 30, 0.08), to: 200 - i * 25, attack: 0.01, peak: 0.05, decay: 0.08 });
    }
  },
  // A dumbbell set down: a bright metallic clink over a heavy thump
  clank(t, { strength = 1 } = {}) {
    tone(t, { type: "triangle", freq: vary(1250, 0.04), peak: 0.16 * strength, decay: 0.22 });
    tone(t + 0.004, { type: "triangle", freq: vary(1870, 0.04), peak: 0.1 * strength, decay: 0.16 });
    tone(t, { freq: 95, to: 50, peak: 0.6 * strength, decay: 0.14 });
    noise(t, { filter: "lowpass", freq: 700, peak: 0.25 * strength, decay: 0.05 });
  },
  // A katana drawn: steel sliding out along the saya's wooden mouth, a dry "shhk" that rises,
  // ending in a low, short hum of the freed blade (no bright bell ring)
  shing(t) {
    // With the recording carrying the scrape, the synth scrape drops to a thin layer of air
    const real = sample(t, "draw", { peak: 0.45 });
    const layer = real ? 0.35 : 1;
    noise(t, { filter: "bandpass", freq: 900, to: 3800, q: 2.2, attack: 0.05, peak: 0.22 * layer, decay: 0.32 });
    noise(t + 0.02, { filter: "highpass", freq: 2500, to: 5200, q: 0.7, attack: 0.04, peak: 0.07 * layer, decay: 0.3 });
    tone(t + 0.3, { type: "triangle", freq: 620, to: 590, attack: 0.01, peak: 0.05, decay: 0.35 });
  },
  // The cut itself: a recorded blade slicing through, over a short falling rush of air (just the
  // old synth whoosh when the recording isn't there)
  slash(t) {
    const real = sample(t, "slice", { peak: 0.4 });
    noise(t, { filter: "bandpass", freq: 2200, to: 500, q: 1.2, attack: 0.02, peak: real ? 0.12 : 0.3, decay: 0.25 });
  },
  // Sheathed: the scrape going home, falling in pitch, then the dull wooden "tak" of the guard
  // seating against the saya's mouth
  sheathe(t) {
    noise(t, { filter: "bandpass", freq: 3200, to: 1000, q: 2, attack: 0.03, peak: 0.16, decay: 0.24 });
    noise(t + 0.27, { filter: "bandpass", freq: 900, q: 3, attack: 0.001, peak: 0.42, decay: 0.045 });
    tone(t + 0.27, { type: "triangle", freq: 320, to: 180, attack: 0.001, peak: 0.28, decay: 0.08 });
  },
  // A flying slash leaving: a whoosh that drops in pitch and fades as it goes
  whooshAway(t) {
    noise(t, { filter: "bandpass", freq: 2600, to: 280, q: 1.8, attack: 0.03, peak: 0.32, decay: 0.95 });
  },
  // The Infinity Stones powering up: a low hum climbing in pitch with a shimmer over it
  power(t, { duration = 1.4 } = {}) {
    tone(t, { type: "sawtooth", freq: 70, to: 280, attack: duration * 0.8, peak: 0.12, decay: duration * 0.3 });
    tone(t, { freq: 140, to: 560, attack: duration * 0.8, peak: 0.1, decay: duration * 0.3 });
    for (let i = 0; i < 6; i++) tone(t + i * (duration / 6), { type: "triangle", freq: 880 * (1 + i * 0.18), peak: 0.05, decay: 0.25 });
  },
  // The breath before the snap: a hiss swelling up to the moment
  riser(t, { duration = 0.5 } = {}) {
    noise(t, { freq: 400, to: 3200, q: 0.9, attack: duration, peak: 0.22, decay: 0.04 });
    tone(t, { type: "sawtooth", freq: 110, to: 220, attack: duration, peak: 0.05, decay: 0.04 });
  },
  // THE snap: a hard crack, a deep shock-wave boom under it, the crack echoing off into the
  // distance, and a cosmic shimmer falling away
  snap(t) {
    const crack = (at, peak, freq) => {
      noise(at, { filter: "highpass", freq, attack: 0.001, peak, decay: 0.035 });
      noise(at, { freq: freq * 0.55, q: 1.4, attack: 0.001, peak: peak * 0.6, decay: 0.07 });
    };
    crack(t, 0.95, 2600);
    tone(t, { freq: 360, to: 160, peak: 0.4, decay: 0.06 });
    [[0.14, 0.38, 2000], [0.3, 0.2, 1600], [0.5, 0.1, 1300]].forEach(([d, peak, freq]) => crack(t + d, peak, freq));
    tone(t + 0.01, { freq: 95, to: 26, attack: 0.006, peak: 0.95, decay: 1.5 });
    noise(t + 0.01, { filter: "lowpass", freq: 260, to: 60, attack: 0.01, peak: 0.45, decay: 0.8 });
    for (let i = 0; i < 9; i++) {
      tone(t + 0.06 + i * 0.07, { type: "triangle", freq: 2600 * (1 - i * 0.07), peak: 0.06, decay: 0.7 });
    }
  },
  // Things turning to dust: a long, soft, sandy hiss drifting down
  dust(t, { duration = 1.6 } = {}) {
    noise(t, { filter: "bandpass", freq: 3200, to: 900, q: 0.6, attack: 0.15, peak: 0.16, decay: duration });
    for (let at = t; at < t + duration; at += 0.03 + Math.random() * 0.05) {
      noise(at, { filter: "highpass", freq: vary(6000, 0.3), attack: 0.002, peak: 0.02 + Math.random() * 0.03, decay: 0.02 });
    }
  },
  // Sandai Kitetsu stirring: a low, uneasy growl that wavers, as if the blade wants to cut
  growl(t, { duration = 0.7 } = {}) {
    for (let i = 0; i < 6; i++) {
      const at = t + (i / 6) * duration;
      tone(at, { type: "sawtooth", freq: vary(62 + (i % 2) * 9, 0.05), to: 55, attack: 0.03, peak: 0.09, decay: duration / 5 });
    }
    noise(t, { filter: "lowpass", freq: 320, to: 180, attack: duration * 0.4, peak: 0.12, decay: duration * 0.6 });
  },
  // Enma's hellfire: a low roar of flame billowing up and dying away
  roar(t, { duration = 0.9 } = {}) {
    noise(t, { filter: "lowpass", freq: 180, to: 900, attack: 0.12, peak: 0.32, decay: duration });
    noise(t + 0.05, { filter: "bandpass", freq: 600, to: 1500, q: 0.7, attack: 0.1, peak: 0.12, decay: duration * 0.8 });
  },
  // Black lightning: a sharp crack and a rumble rolling off under it
  thunder(t) {
    noise(t, { filter: "highpass", freq: 1800, attack: 0.001, peak: 0.5, decay: 0.05 });
    noise(t + 0.03, { freq: 900, q: 1.2, attack: 0.002, peak: 0.3, decay: 0.12 });
    noise(t + 0.06, { filter: "lowpass", freq: 220, to: 70, attack: 0.04, peak: 0.45, decay: 1.1 });
    tone(t + 0.02, { freq: 70, to: 32, attack: 0.01, peak: 0.4, decay: 0.8 });
  },
  // Three overlapping cartoon voices shape an ee-to-ah "yeah!", through the normal mute bus.
  cheer(t) {
    [165, 205, 250].forEach((pitch, i) => {
      const at = t + i * 0.07;
      const voice = ctx.createOscillator();
      voice.type = "sawtooth";
      voice.frequency.setValueAtTime(pitch, at);
      voice.frequency.linearRampToValueAtTime(pitch * 1.3, at + 0.22);
      voice.frequency.linearRampToValueAtTime(pitch * 1.08, at + 1.05);
      [[320, 780, 0.12], [2300, 1550, 0.07]].forEach(([start, end, level]) => {
        const vowel = ctx.createBiquadFilter();
        vowel.type = "bandpass";
        vowel.Q.value = 5;
        vowel.frequency.setValueAtTime(start, at);
        vowel.frequency.exponentialRampToValueAtTime(end, at + 0.22);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(level, at + 0.07);
        gain.gain.setValueAtTime(level, at + 0.65);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
        voice.connect(vowel).connect(gain).connect(out);
      });
      voice.start(at);
      voice.stop(at + 1.15);
    });
  },
  // Loose, overlapping palm transients, with a short room reflection and a gentle fade.
  applause(t) {
    for (let i = 0; i < 28; i++) {
      const at = t + i * 0.085 + Math.random() * 0.04;
      const level = 0.12 * Math.min(1, (i + 2) / 5, (30 - i) / 8);
      noise(at, { filter: "bandpass", freq: vary(1250, 0.3), q: 0.7, attack: 0.001, peak: level, decay: 0.07 });
      noise(at + 0.012, { filter: "highpass", freq: 1700, attack: 0.001, peak: level * 0.5, decay: 0.045 });
      noise(at + 0.055, { freq: 900, q: 0.6, attack: 0.004, peak: level * 0.2, decay: 0.1 });
    }
  },
  // Plain UI click
  click(t) {
    tone(t, { freq: 900, to: 550, peak: 0.2, decay: 0.03 });
  },
};

// Minimum gap between two plays of the same sound, so fast loops don't machine-gun
const MIN_GAP = { cheer: 2, applause: 3, meow: 0.3, purr: 1.5, slide: 0.08, drawer: 0.4, knock: 0.05, tear: 0.2, riffle: 0.3, key: 0.035, talk: 0.06, blip: 0.07, tick: 0.03, paper: 0.04, scribble: 0.3, printer: 0.5, rustle: 0.3, strum: 0.15, shishishi: 0.4, chirp: 0.12, sparkle: 0.6, groove: 1.6, powerDown: 0.6, squeak: 0.2, patter: 0.4, clockStrike: 1.2, hiss: 0.4, creak: 0.8, clank: 0.12, shing: 0.5, slash: 0.15, sheathe: 0.4, whooshAway: 0.4, power: 1.4, snap: 0.2, dust: 1, riser: 0.5, growl: 0.8, roar: 0.6, thunder: 0.3 };

function play(name, options = {}) {
  if (muted.value || hushDepth > 0 || !ctx || (ctx.state !== "running" && !resuming) || document.hidden) return;
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

// Rain against the window: a looping hiss whose level follows the weather (0–1). It goes
// quiet while muted, and the loop is only built once there's rain to hear.
let rainLoop = null;
export function setRainLevel(level) {
  const target = muted.value || !ctx || document.hidden ? 0 : level;
  if (!rainLoop && target <= 0.01) return;
  if (!rainLoop) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const high = ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 700;
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 5200;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(high).connect(low).connect(gain).connect(out);
    src.start();
    rainLoop = { src, gain, ctx };
  }
  if (rainLoop.ctx !== ctx) {
    rainLoop = null;
    return setRainLevel(level);
  }
  rainLoop.gain.gain.setTargetAtTime(target * 0.01, ctx.currentTime, 0.6);
}

// The live context and the master bus, for music that should share the sfx chain (the
// compressor and limiter); null until a gesture has created the context
export const audioBus = () => (ctx && out && ctx.state !== "closed" ? { ctx, out, noiseBuffer } : null);

// Run something (e.g. fast-forwarding a timeline) without any of its sounds
export function hush(fn) {
  hushDepth++;
  try {
    return fn();
  } finally {
    hushDepth--;
  }
}

export async function setSoundEnabled(enabled) {
  if (enabled && !(await unlock())) return false;
  muted.value = !enabled;
  try {
    localStorage.setItem(STORAGE_KEY, muted.value ? "1" : "0");
  } catch {
    // The choice still applies for this visit when storage is unavailable.
  }
  return true;
}

export function useSfx() {
  const toggleMute = async () => {
    if (await setSoundEnabled(muted.value)) play("click");
  };
  return { muted, toggleMute };
}
