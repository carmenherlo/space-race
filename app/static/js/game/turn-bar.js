// The turn bar (top left): whose turn it is, their stars, and the die.

import { createAvatar, renderTokens } from "./board.js";
import { elementsOf } from "./dom.js";
import { currentPlayer, game } from "./state.js";

const dom = elementsOf({
  turn: "turn",
  avatar: "turn-avatar",
  name: "turn-name",
  stars: "turn-stars",
  die: "die",
});

// A tap on the die calls onRoll.
export function setUpTurnBar({ onRoll }) {
  dom.die.addEventListener("click", onRoll);
}

// Whose turn it is, and the tokens (whose turn it is stands out).
export function renderTurn() {
  drawTurn(currentPlayer(), { mayRoll: game.mayRoll });
  renderTokens();
}

// Draws the bar from what it is given: the player and whether the die is theirs.
function drawTurn(player, { mayRoll }) {
  // A new avatar (with its little jump, see game.css) only when the player changes.
  if (dom.avatar.dataset.player !== player.id) {
    dom.avatar.dataset.player = player.id;
    dom.avatar.replaceChildren(createAvatar(player));
  }
  dom.name.textContent = `Turno de ${player.name}`;
  dom.stars.textContent = "⭐".repeat(player.stars);
  dom.stars.hidden = player.stars === 0;
  dom.turn.style.setProperty("--player-color", player.color);
  dom.die.disabled = !mayRoll; // on (and calling them, states.css) only when it is theirs
  dom.die.textContent = "🎲";
}

export function showTurnBar(shown) {
  dom.turn.hidden = !shown;
}

// A new game: same ids, new players, so the avatar is drawn again.
export function resetTurnBar() {
  delete dom.avatar.dataset.player;
}

// Between two turns the bar slides away for a moment (see game.css).
export function changingTurn(on) {
  dom.turn.toggleAttribute("data-changing", on);
}

// The die can be tapped (and calls the player, states.css) or not.
export function allowRoll(on) {
  dom.die.disabled = !on;
}

// The die shaking while it rolls (game.css), and what it shows.
export function rollingDie(on) {
  dom.die.toggleAttribute("data-rolling", on);
}

export function showDieFace(text) {
  dom.die.textContent = text;
}
