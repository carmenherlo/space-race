// Small helpers: the voice, shuffling, the status line.

import { say } from "../voice.js";
import { elementsOf } from "./dom.js";
import { pack } from "./state.js";

const dom = elementsOf({ status: "status" });

// A shuffled copy of a list (Fisher–Yates: every order equally likely).
export function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Reads a text aloud, or its parts with a pause between them (see voice.js), in the games
// that have a voice (game.yaml "voice"). It stops when the card closes (see init) or the
// sound is turned off.
export function speak(text) {
  if (pack.voice) {
    say(text);
  }
}

export function showStatus(message, error) {
  if (error) {
    console.error(error);
  }
  dom.status.textContent = message ?? "";
  dom.status.hidden = !message;
}
