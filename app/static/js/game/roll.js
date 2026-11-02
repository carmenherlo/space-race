// A roll, the same in every mode: the die, the move, what the square says; then the same
// player again ("roll again") or the next one. Each mode only decides when the die is the
// player's (game.mayRoll, see beginTurn in turns.js).

import { markTokens } from "./board.js";
import { showBounce, showWinner } from "./cards.js";
import { moveBy, rollDie } from "./moves.js";
import { landOn } from "./squares.js";
import { currentPlayer, game, pack } from "./state.js";
import { BOARD_LOOK_MS, LAND_PAUSE_MS, wait } from "./timing.js";
import { renderTurn, showTurnBar } from "./turn-bar.js";
import { nextTurn, startGame } from "./turns.js";

export async function roll() {
  if (game.busy || !game.mayRoll) {
    return;
  }
  game.busy = true;
  game.mayRoll = false;
  const player = currentPlayer();
  const bounced = await moveBy(player, await rollDie());
  if (player.place === pack.goal) {
    win(player);
    return;
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
      win(player);
      return;
    }
    if (outcome.again) {
      game.mayRoll = true; // same player, a new roll ("Sabelotodo": with no question, the prize of that square)
      game.busy = false;
      renderTurn();
      return;
    }
  }
  if (game.mode === "questions") {
    await lookAtTheBoard();
  }
  nextTurn();
}

// Someone reached the Moon: the game ends (no turn bar, no lit square), the winner is
// celebrated, and "¡Otra partida!" starts a new one with the same players.
async function win(player) {
  game.playing = false;
  showTurnBar(false);
  await showWinner(player);
  startGame(game.players);
}

// "Sabelotodo": a moment to see where everybody is before the next question covers the
// board: every token stands out.
async function lookAtTheBoard() {
  markTokens("look", true);
  await wait(BOARD_LOOK_MS);
  markTokens("look", false);
}
