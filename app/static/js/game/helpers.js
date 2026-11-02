// Small helpers: the voice, the status line.

import { say } from "../voice.js";
import { elementsOf } from "./dom.js";
import { pack } from "./state.js";

const dom = elementsOf({ status: "status" });

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
