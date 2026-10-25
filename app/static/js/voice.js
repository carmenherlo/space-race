// A voice that reads texts aloud, for those who cannot read yet. Two of them, chosen in the
// sound panel (sound-panel.js): "natural" and "robot". Both come from the server
// (api/voice, Piper: app/voice.py); the robot is a man's voice with a metallic effect made
// here. Without a voice on the server, the tablet's own voice reads (the Web Speech API).
// Its volume and on/off are the "voice" channel of sounds.js.

import { audioContext, isOff, onSoundChange, voiceKind, volume } from "./sounds.js";

const START_DELAY_MS = 350; // after the card's sound, not on top of it
const PAUSE_S = 0.7; // silence between the parts of a text (a question and each answer…)
const ROBOT_HZ = 55; // the "ring" that makes the voice metallic
const ROBOT_CLEAN = 0.4; // how much of the clean voice stays, so it is easy to understand
const NATURAL_BRIGHTER = 1.05; // the natural voice a touch higher and quicker: more cheerful
const TABLET_LANGUAGE = "es-ES";

let saying = 0; // which say() is the latest: older ones stop (see quiet)
let playing = null; // what is being said: { stop, gain }

// Says a text, or a list of parts with a short silence between them (a question, then
// each of its answers), so they do not run into each other. Whatever was being said stops.
// Emojis are left out: some voices would read their names ("estrella brillante…").
export async function say(text) {
  quiet();
  const parts = [text]
    .flat()
    .map((part) => part.replace(/\p{Extended_Pictographic}|\uFE0F/gu, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (parts.length === 0 || isOff("voice")) {
    return;
  }
  const mine = saying;
  await wait(START_DELAY_MS);
  try {
    const ctx = audioContext();
    const sounds = await Promise.all(parts.map((part) => fetchVoice(ctx, part))); // all at once
    if (mine === saying) {
      playing = play(ctx, sounds);
    }
  } catch (error) {
    if (mine === saying) {
      console.warn("Server voice unavailable, using the tablet's", error);
      playing = sayWithTablet(parts);
    }
  }
}

// One part, said by the server's voice, ready to play.
async function fetchVoice(ctx, part) {
  const query = new URLSearchParams({ text: part, who: voiceKind() });
  const response = await fetch(`api/voice?${query}`);
  if (!response.ok) {
    throw new Error(`api/voice: ${response.status}`);
  }
  return ctx.decodeAudioData(await response.arrayBuffer());
}

// Stops talking (a card closed, the voice was switched off…).
export function quiet() {
  saying += 1;
  playing?.stop();
  playing = null;
}

// Louder, softer or off while talking.
onSoundChange(() => {
  if (isOff("voice")) {
    quiet();
  } else {
    playing?.setVolume(volume("voice"));
  }
});

// The voice from the server, natural or with the robot effect: the parts one after the
// other, with a silence between them. A compressor evens it out (the soft parts come up),
// so it sounds fuller and can be louder without distorting.
function play(ctx, sounds) {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -28;
  compressor.knee.value = 12;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.2;
  const gain = ctx.createGain();
  gain.gain.value = volume("voice");
  compressor.connect(gain).connect(ctx.destination);
  const input = ctx.createGain(); // where every part goes in
  const isRobot = voiceKind() === "robot";
  const stopRobot = isRobot ? robot(ctx, input, compressor) : (input.connect(compressor), null);
  const rate = isRobot ? 1 : NATURAL_BRIGHTER;
  const sources = [];
  let at = ctx.currentTime + 0.05;
  for (const sound of sounds) {
    const source = ctx.createBufferSource();
    source.buffer = sound;
    source.playbackRate.value = rate;
    source.connect(input);
    source.start(at);
    sources.push(source);
    at += sound.duration / rate + PAUSE_S;
  }
  sources[sources.length - 1].addEventListener("ended", () => stopRobot?.());
  return {
    stop: () => {
      for (const source of sources) {
        try {
          source.stop();
        } catch {
          // already over
        }
      }
      stopRobot?.();
    },
    setVolume: (value) => gain.gain.setTargetAtTime(value, ctx.currentTime, 0.05),
  };
}

// The robot: the voice "ring modulated" (multiplied by a low hum, like the robots in old
// films), a bit of the clean voice so the words are clear, and a very short echo that
// sounds like a tin can. Returns how to stop the hum.
function robot(ctx, input, output) {
  const ring = ctx.createGain();
  ring.gain.value = 0;
  const hum = ctx.createOscillator();
  hum.frequency.value = ROBOT_HZ;
  hum.connect(ring.gain);
  input.connect(ring).connect(output);

  const clean = ctx.createGain();
  clean.gain.value = ROBOT_CLEAN;
  input.connect(clean).connect(output);

  const echo = ctx.createDelay();
  echo.delayTime.value = 0.012;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.45;
  ring.connect(echo).connect(feedback).connect(echo);
  echo.connect(output);

  hum.start();
  return () => {
    try {
      hum.stop();
    } catch {
      // already stopped
    }
  };
}

// Without the server's voice: the tablet's own (each tablet has its voices; in Android,
// Settings → Language → Text-to-speech), one part after another. The robot just talks
// lower and slower.
function sayWithTablet(parts) {
  const speech = window.speechSynthesis;
  if (!speech) {
    return null;
  }
  const spanish = speech.getVoices().filter((v) => v.lang.toLowerCase().startsWith("es"));
  const isRobot = voiceKind() === "robot";
  for (const part of parts) {
    const utterance = new SpeechSynthesisUtterance(part);
    utterance.voice = spanish.find((v) => v.lang === TABLET_LANGUAGE) ?? spanish[0] ?? null;
    utterance.lang = utterance.voice?.lang ?? TABLET_LANGUAGE;
    utterance.volume = Math.min(1, volume("voice"));
    utterance.pitch = isRobot ? 0.3 : 1.05;
    utterance.rate = isRobot ? 0.85 : 0.95;
    speech.speak(utterance); // the tablet says them one after the other
  }
  return {
    stop: () => speech.cancel(),
    setVolume: () => {}, // the tablet's voice keeps its volume until the next text
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
