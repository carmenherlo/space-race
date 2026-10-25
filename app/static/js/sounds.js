// Sound effects, made by the browser itself (Web Audio): no sound files, no licences,
// works offline. Retro "8-bit" style, with background music. Used by the game (game.js).
//
//   import { sounds, music, isOff, setOff } from "./sounds.js";
//   sounds.dice();
//   music.start();
//
// Browsers only allow sound after a tap, so the first sound starts the audio engine.
// Three channels, each with its volume and an on/off switch, remembered on this device:
// the music, the voice (voice.js) and the sound effects. The sound panel
// (sound-panel.js) changes them.

const SETTINGS_KEY = "space-race:sound";
export const CHANNELS = ["music", "voice", "effects"];
// How loud each channel is at its full level; the usual level (0.8) is as loud as the
// sounds always were. The tablet's own volume does the rest.
const LOUDNESS = { music: 0.275, voice: 1.6, effects: 0.75 }; // the voice, after its compressor
const USUAL_LEVEL = 0.8;
export const VOICE_KINDS = ["natural", "robot"];

let audio = null; // the AudioContext, created on the first sound
let settings = readSettings();
const listeners = new Set();

// The slider's position, 0 to 1 (also while switched off).
export function level(channel) {
  return settings[channel].level;
}

// Switched off, or at zero.
export function isOff(channel) {
  return settings[channel].off || settings[channel].level === 0;
}

// The loudness to play that channel at (0 when it is off).
export function volume(channel) {
  return isOff(channel) ? 0 : LOUDNESS[channel] * settings[channel].level;
}

// Moving the slider; moving it up also switches the channel back on.
export function setLevel(channel, value) {
  settings[channel].level = Math.min(1, Math.max(0, value));
  if (value > 0) {
    settings[channel].off = false;
  }
  changed();
}

// The channel's icon: switch it off (crossed out) or back on, at its level (or the usual
// one, if it was at zero).
export function setOff(channel, off) {
  settings[channel].off = off;
  if (!off && settings[channel].level === 0) {
    settings[channel].level = USUAL_LEVEL;
  }
  changed();
}

// Who reads the cards: "natural" or "robot" (see voice.js).
export function voiceKind() {
  return settings.voiceKind;
}

export function setVoiceKind(kind) {
  settings.voiceKind = kind;
  changed();
}

// Calls `listener` after any change (the voice and the panel follow them).
export function onSoundChange(listener) {
  listeners.add(listener);
}

function changed() {
  remember(settings);
  music.follow();
  for (const listener of listeners) {
    listener();
  }
}

function readSettings() {
  const fresh = { voiceKind: "natural" };
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") ?? {};
  } catch {
    // storage blocked or broken: the usual settings
  }
  for (const channel of CHANNELS) {
    const one = saved[channel] ?? {};
    fresh[channel] = {
      level: typeof one.level === "number" ? one.level : USUAL_LEVEL,
      off: typeof one.off === "boolean" ? one.off : false,
    };
  }
  if (VOICE_KINDS.includes(saved.voiceKind)) {
    fresh.voiceKind = saved.voiceKind;
  }
  return fresh;
}

// Saved on this device; storage may be blocked, then it lasts until the page is reloaded.
function remember(value) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
  } catch {
    // nothing to do
  }
}

// ---------- The sounds ----------

export const sounds = {
  // The die rattling: quick clicks at random pitches for a moment.
  dice() {
    play((ctx, out, now) => {
      for (let i = 0; i < 11; i += 1) {
        blip(ctx, out, { at: now + i * 0.075, freq: 300 + Math.random() * 500, length: 0.04, type: "square", volume: 0.5 });
      }
    });
  },

  // A token hops to the next square.
  hop() {
    play((ctx, out, now) => {
      blip(ctx, out, { at: now, freq: 420, to: 720, length: 0.09, type: "sine", volume: 0.7 });
    });
  },

  // "¡Qué suerte!": a rising arpeggio of little bells.
  good() {
    play((ctx, out, now) => {
      [523, 659, 784, 1047].forEach((freq, i) => {
        blip(ctx, out, { at: now + i * 0.09, freq, length: 0.35, type: "triangle", volume: 0.8 });
      });
    });
  },

  // "¡Oh, no!": three sad notes going down, "wah, wah, waaah".
  bad() {
    play((ctx, out, now) => {
      [[392, 370], [370, 349], [349, 262]].forEach(([from, to], i) => {
        const last = i === 2;
        blip(ctx, out, { at: now + i * 0.28, freq: from, to, length: last ? 0.6 : 0.24, type: "sawtooth", volume: 0.35 });
      });
    });
  },

  // "¡Reto!": a little drum roll and a "ta-dá".
  challenge() {
    play((ctx, out, now) => {
      for (let i = 0; i < 8; i += 1) {
        noise(ctx, out, { at: now + i * 0.045, length: 0.04, volume: 0.25 + i * 0.04 });
      }
      blip(ctx, out, { at: now + 0.4, freq: 523, length: 0.15, type: "square", volume: 0.4 });
      blip(ctx, out, { at: now + 0.55, freq: 784, length: 0.45, type: "square", volume: 0.4 });
    });
  },

  // Flying to another square (UFOs, galaxies, the black hole): a "zuuum" up and down.
  fly() {
    play((ctx, out, now) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.45);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.9);
      envelope(gain, now, 0.9, 0.6);
      osc.connect(gain).connect(out);
      osc.start(now);
      osc.stop(now + 0.95);
    });
  },

  // Bouncing back from the Moon: a wobbly "boing".
  bounce() {
    play((ctx, out, now) => {
      const osc = ctx.createOscillator();
      const wobble = ctx.createOscillator();
      const wobbleDepth = ctx.createGain();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.5);
      wobble.frequency.value = 14;
      wobbleDepth.gain.value = 40;
      wobble.connect(wobbleDepth).connect(osc.frequency);
      envelope(gain, now, 0.55, 0.9);
      osc.connect(gain).connect(out);
      osc.start(now);
      wobble.start(now);
      osc.stop(now + 0.6);
      wobble.stop(now + 0.6);
    });
  },

  // Someone reached the Moon: a fanfare.
  win() {
    play((ctx, out, now) => {
      const notes = [
        [523, 0, 0.14],
        [523, 0.15, 0.14],
        [523, 0.3, 0.14],
        [659, 0.45, 0.3],
        [587, 0.78, 0.14],
        [659, 0.93, 0.14],
        [784, 1.08, 0.7],
      ];
      for (const [freq, at, length] of notes) {
        blip(ctx, out, { at: now + at, freq, length, type: "square", volume: 0.35 });
        blip(ctx, out, { at: now + at, freq: freq / 2, length, type: "triangle", volume: 0.5 });
      }
    });
  },
};

// ---------- Background music ----------
// A calm, spacey tune in a loop: soft arpeggios over a bass, with a twinkle now and
// then (C · Am · F · G). Notes are scheduled a little ahead, so it never stutters.

const BEAT = 60 / 92 / 2; // seconds per note (eighth notes at 92 bpm)
const CHORDS = [
  [262, 330, 392, 523], // C
  [220, 262, 330, 440], // Am
  [175, 220, 262, 349], // F
  [196, 247, 294, 392], // G
];
const ARPEGGIO = [0, 1, 2, 3, 2, 1, 2, 1]; // which note of the chord on each of the 8 beats

export const music = {
  wanted: false, // the page asked for music (it plays unless its channel is off)
  playing: false,
  step: 0, // eighth note in the loop (4 bars of 8)
  nextAt: 0, // when the next note starts (audio clock)
  timer: null,
  output: null,

  // Starts the loop (unless the music is off). Call it after a tap.
  start() {
    this.wanted = true;
    if (isOff("music") || this.playing) {
      return;
    }
    const ctx = context();
    if (!ctx) {
      return;
    }
    this.output = ctx.createGain();
    this.output.gain.value = volume("music");
    this.output.connect(ctx.destination);
    this.playing = true;
    this.step = 0;
    this.nextAt = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(ctx), 50);
  },

  // Stops the music for good (the page no longer wants it).
  stop() {
    this.wanted = false;
    this.pause();
  },

  // After a change of the settings: louder, softer, off, or back on.
  follow() {
    if (isOff("music")) {
      this.pause();
    } else if (this.wanted && !this.playing) {
      this.start();
    } else if (this.output) {
      this.output.gain.setTargetAtTime(volume("music"), this.output.context.currentTime, 0.05);
    }
  },

  // Silences it for now; start() or switching it back on brings it back.
  pause() {
    clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
    this.output?.disconnect();
    this.output = null;
  },

  schedule(ctx) {
    while (this.nextAt < ctx.currentTime + 0.25) {
      const bar = Math.floor(this.step / 8) % CHORDS.length;
      const beat = this.step % 8;
      const chord = CHORDS[bar];
      blip(ctx, this.output, { at: this.nextAt, freq: chord[ARPEGGIO[beat]], length: BEAT * 1.8, type: "triangle", volume: 0.6 });
      if (beat === 0) {
        blip(ctx, this.output, { at: this.nextAt, freq: chord[0] / 2, length: BEAT * 7.5, type: "sine", volume: 0.9 });
      }
      if (beat === 4 && bar % 2 === 1) {
        blip(ctx, this.output, { at: this.nextAt, freq: chord[3] * 2, length: BEAT * 2, type: "sine", volume: 0.35 });
      }
      this.nextAt += BEAT;
      this.step = (this.step + 1) % (8 * CHORDS.length);
    }
  },
};

// ---------- Building blocks ----------

// Runs `draw(ctx, output, now)` unless the effects are off, starting the audio engine if
// needed.
function play(draw) {
  if (isOff("effects")) {
    return;
  }
  const ctx = context();
  if (!ctx) {
    return; // no Web Audio in this browser: the game just stays silent
  }
  const output = ctx.createGain();
  output.gain.value = volume("effects");
  output.connect(ctx.destination);
  draw(ctx, output, ctx.currentTime + 0.01);
}

// The audio engine, shared with the voice (voice.js). Null without Web Audio.
export function audioContext() {
  return context();
}

function context() {
  if (!audio) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return null;
    }
    audio = new AudioContext();
  }
  if (audio.state === "suspended") {
    audio.resume();
  }
  return audio;
}

// One short note, optionally sliding to another pitch (`to`).
function blip(ctx, out, { at, freq, to = null, length, type, volume }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to) {
    osc.frequency.exponentialRampToValueAtTime(to, at + length);
  }
  envelope(gain, at, length, volume);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

// A short burst of noise (a drum hit).
function noise(ctx, out, { at, length, volume }) {
  const samples = Math.floor(ctx.sampleRate * length);
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  envelope(gain, at, length, volume);
  source.connect(gain).connect(out);
  source.start(at);
}

// Quick fade in and out, so notes never click.
function envelope(gain, at, length, volume) {
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
}
