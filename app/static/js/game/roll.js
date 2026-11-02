// A roll, the same in every mode: the die, the move, what the square says. It says what
// comes next and turns.js does it (playRoll): the winner, the same player again ("roll
// again") or the next one. Each mode only decides when the die is the player's
// (game.mayRoll, see beginTurn in turns.js).

import { markTokens } from "./board.js";
import { showBounce } from "./cards.js";
import { moveBy, rollDie } from "./moves.js";
import { landOn } from "./squares.js";
import { game, pack } from "./state.js";
import { BOARD_LOOK_MS, LAND_PAUSE_MS, wait } from "./timing.js";

// `player` rolls and does what the square says. Resolves to "won" (they reached the Moon),
// "again" (they roll again) or "next" (the next player's turn).
export async function roll(player) {
  const bounced = await moveBy(player, await rollDie());
  if (player.place === pack.goal) {
    return "won";
  }
  let landed = true;
  if (bounced) {
    await wait(LAND_PAUSE_MS);
    await showBounce(bounced, player);
    landed = pack.backwardsCounts; // where the bounce leaves you may do nothing
  }
  if (landed) {
    const outcome = await landOn(player);
    if (player.place === pack.goal) {
      return "won";
    }
    if (outcome.again) {
      return "again";
    }
  }
  if (game.mode === "questions") {
    await lookAtTheBoard();
  }
  return "next";
}

// "Sabelotodo": a moment to see where everybody is before the next question covers the
// board: every token stands out.
async function lookAtTheBoard() {
  markTokens("look", true);
  await wait(BOARD_LOOK_MS);
  markTokens("look", false);
}
