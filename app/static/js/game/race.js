// A turn in "Carrera": roll, move, do what the square says.

import { renderTurn } from "./board.js";
import { showBounce, showWinner } from "./cards.js";
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

  const roll = await rollDie();
  const bounced = await moveBy(player, roll);
  if (player.place === pack.goal) {
    showWinner(player);
    return;
  }
  if (bounced) {
    await wait(LAND_PAUSE_MS);
    await showBounce(bounced, player);
    if (!pack.backwardsCounts) {
      nextTurn(); // where the bounce leaves you does nothing
      return;
    }
  }

  // The square the die landed on.
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
  nextTurn();
}
