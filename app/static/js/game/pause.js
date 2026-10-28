// ⏸ and leaving: pause, restart, back to the menu, and the idle timer.

import { music } from "../sounds.js";
import { quiet } from "../voice.js";
import { GAME_ID, elements, game } from "./state.js";
import { IDLE_MS } from "./timing.js";

// ⏸ stops everything (the clock of the game, the music, the voice) and asks what to do.
export function pauseGame() {
  game.paused = true;
  music.pause();
  quiet();
  elements.pause.showModal();
}

export function resumeGame() {
  elements.pause.close();
  game.paused = false;
  music.follow(); // back on, unless the music is switched off
}

// A new game with the same players and mode: the page again, starting at once (the setup
// is remembered, see loadSetup), so nothing of this game is left half way.
export function restartGame() {
  window.location.replace(`game.html?game=${encodeURIComponent(GAME_ID)}&start=1`);
}

// Back to choosing who plays.
export function backToMenu() {
  window.location.replace(`game.html?game=${encodeURIComponent(GAME_ID)}`);
}

// Back to the games menu after a long time without touches.
let idleTimer = null;
export function restartIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => window.location.assign("./"), IDLE_MS);
}
