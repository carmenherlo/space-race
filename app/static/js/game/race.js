// A turn in "Carrera" and "Retos locos": roll, move, do what the square says.

import { renderTurn } from "./board.js";
import { drawFrom, showBounce, showCard, showWinner } from "./cards.js";
import { moveBy, rollDie } from "./moves.js";
import { landOn } from "./squares.js";
import { currentPlayer, game, pack } from "./state.js";
import { LAND_PAUSE_MS, wait } from "./timing.js";
import { nextTurn } from "./turns.js";

export async function playTurn() {
  if (game.busy) {
    return;
  }
  game.busy = true;
  const player = currentPlayer();

  const startedAt = player.place; // the challenge depends on where the turn ends up
  const roll = await rollDie();
  const bounced = await moveBy(player, roll);
  if (player.place === pack.goal) {
    showWinner(player);
    return;
  }
  if (bounced) {
    await wait(LAND_PAUSE_MS);
    await showBounce(bounced);
    if (!pack.backwardsCounts) {
      nextTurn(); // where the bounce leaves you does nothing
      return;
    }
  }

  // 1. The square the die landed on.
  const outcome = await landOn(player);
  if (player.place === pack.goal) {
    showWinner(player);
    return;
  }
  if (outcome.again) {
    game.busy = false; // same player, a new roll
    renderTurn();
    return;
  }
  // A turn that ends level or further back, or a punishment: no challenge.
  if (player.place <= startedAt || outcome.punished) {
    nextTurn();
    return;
  }

  // 2. The end of the turn: a challenge in "Retos locos" (nothing after a punishment).
  if (game.mode === "challenges") {
    await wait(LAND_PAUSE_MS); // first see where the turn ended
    await showCard(drawFrom("challenges"));
  }
  nextTurn();
}
