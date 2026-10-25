// The sound panel: 🔊 opens it, under the button. One row per channel of sounds.js —
// 🎵 music, 🔔 effects, 🗣️ voice — with its slider; tapping the icon crosses it out
// (off) or brings it back, and a slider at zero is off too. Below, who reads the cards:
// 🙂 natural or 🤖 robot (voice.js). Everything is remembered on this tablet.
//
// The markup is in the page (game.html, .sound-panel); setUpSoundPanel brings it to life.

import { isOff, level, onSoundChange, setLevel, setOff, setVoiceKind, sounds, voiceKind } from "./sounds.js";
import { say } from "./voice.js";

const NAMES = { music: "la música", voice: "la voz", effects: "los efectos" };
const SAMPLE = { natural: "¡Hola! Así sueno yo.", robot: "Hola. Soy un robot. Bip, bup." };

// `button`: the 🔊 that opens it; `panel`: the .sound-panel; `voice`: whether this page
// has a voice (without it, the voice rows are hidden).
export function setUpSoundPanel(button, panel, { voice }) {
  const rows = [...panel.querySelectorAll("[data-channel]")];
  for (const row of rows) {
    const channel = row.dataset.channel;
    row.hidden = channel === "voice" && !voice;
    row.querySelector(".sound-row__icon").addEventListener("click", () => setOff(channel, !isOff(channel)));
    const slider = row.querySelector(".sound-row__slider");
    slider.addEventListener("input", () => setLevel(channel, Number(slider.value) / 100));
    slider.addEventListener("change", () => preview(channel)); // when the finger lifts
  }
  const kinds = panel.querySelector(".sound-voices");
  kinds.hidden = !voice;
  for (const option of kinds.querySelectorAll("[data-voice]")) {
    option.addEventListener("click", () => {
      setVoiceKind(option.dataset.voice);
      say(SAMPLE[option.dataset.voice]);
    });
  }

  button.addEventListener("click", () => toggle(button, panel));
  // A tap anywhere else, or Escape, closes it.
  document.addEventListener("pointerdown", (event) => {
    if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) {
      close(button, panel);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close(button, panel);
    }
  });

  const render = () => {
    for (const row of rows) {
      const channel = row.dataset.channel;
      const off = isOff(channel);
      const icon = row.querySelector(".sound-row__icon");
      icon.setAttribute("aria-pressed", String(!off));
      icon.setAttribute("aria-label", off ? `Activar ${NAMES[channel]}` : `Quitar ${NAMES[channel]}`);
      row.querySelector(".sound-row__slider").value = String(Math.round(level(channel) * 100));
      row.dataset.off = String(off);
    }
    for (const option of kinds.querySelectorAll("[data-voice]")) {
      option.setAttribute("aria-checked", String(option.dataset.voice === voiceKind()));
    }
    const shown = rows.filter((row) => !row.hidden).map((row) => row.dataset.channel);
    const allOff = shown.every(isOff);
    button.textContent = allOff ? "🔇" : "🔊";
  };
  onSoundChange(render);
  render();
}

function toggle(button, panel) {
  if (panel.hidden) {
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
  } else {
    close(button, panel);
  }
}

function close(button, panel) {
  panel.hidden = true;
  button.setAttribute("aria-expanded", "false");
}

// How it sounds now: a hop for the effects, a sentence for the voice (the music is
// already playing).
function preview(channel) {
  if (channel === "effects") {
    sounds.hop();
  } else if (channel === "voice") {
    say(SAMPLE[voiceKind()]);
  }
}
