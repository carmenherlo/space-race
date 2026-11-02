// ⏸ and leaving: pause, restart, back to the menu, and the idle timer.

import { music } from "../sounds.js";
import { quiet } from "../voice.js";
import { pauseBoard } from "./board.js";
import { elementsOf } from "./dom.js";
import { GAME_ID, game } from "./state.js";
import { IDLE_MS } from "./timing.js";
import { pauseTurnBar } from "./turn-bar.js";

const dom = elementsOf({
  button: "pause-button",
  pause: "pause",
  resume: "pause-resume",
  restart: "pause-restart",
  menu: "pause-menu",
});

// The ⏸ button and the pause's own buttons. Escape goes on playing.
export function setUpPause() {
  dom.button.addEventListener("click", pauseGame);
  dom.resume.addEventListener("click", resumeGame);
  dom.restart.addEventListener("click", restartGame);
  dom.menu.addEventListener("click", backToMenu);
  dom.pause.addEventListener("cancel", (event) => {
    event.preventDefault();
    resumeGame();
  });
}

// ⏸ stops everything (the clock of the game, what moves on the board, the music, the
// voice) and asks what to do.
export function pauseGame() {
  game.paused = true;
  pauseBoard(true);
  pauseTurnBar(true);
  music.pause();
  quiet();
  dom.pause.showModal();
}

export function resumeGame() {
  dom.pause.close();
  game.paused = false;
  pauseBoard(false);
  pauseTurnBar(false);
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
