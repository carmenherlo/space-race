// The special squares: what each one does (the rules come from the game's game.yaml).

import { react, renderTurn, shine } from "./board.js";
import { chooseSwap, offerStar, playMinigameFor, showCard } from "./cards.js";
import { followTrail, jumpTo, moveBy, rollDie, swapPlaces } from "./moves.js";
import { game, pack } from "./state.js";
import { LAND_PAUSE_MS, wait } from "./timing.js";

// Does what the square a player has just reached WITH THE DIE says. Only die landings count:
// where a trip sends you (UFOs, galaxies, the satellite) does nothing, so they never loop.
// The meteorites make you roll the die again (backwards); the square that roll lands on
// counts too, unless the game says going back does nothing (backwardsCounts). Returns
// { again } (roll again).
export async function landOn(player) {
  const square = pack.squares.get(player.place);
  if (!square) {
    return { again: false };
  }
  await wait(LAND_PAUSE_MS); // first see where the token landed
  // A galaxy: the token shines (its ring like a gold ring in the light); else a hop of joy,
  // or a tremble.
  await (square.shine ? shine(player) : react(player, square.kind));
  const others = game.players.filter((p) => p !== player);
  if (square.kind === "bad" && player.stars > 0) { // a star saves you from any bad square
    if (await offerStar(player, square)) {
      return { again: false }; // saved: you stay here and the turn ends
    }
  } else if (square.star && player.stars >= pack.maxStars) {
    // Already as many stars as allowed: nothing happens here.
    await showCard({
      kind: "good",
      emoji: square.emoji,
      title: square.title,
      text: pack.maxStars === 1
        ? "Ya tienes una estrella: solo se puede llevar una."
        : `Ya tienes ${pack.maxStars} estrellas: no se pueden llevar más.`,
    });
    return { again: false };
  } else if (square.swap && others.length > 0) {
    const other = await chooseSwap(player, square, others);
    if (other) {
      await swapPlaces(player, other); // where they land does nothing, for either of them
    }
    return { again: square.again };
  } else {
    await showCard(square);
  }
  const outcome = { again: square.again };
  if (square.star) {
    player.stars += 1;
    renderTurn();
  }
  if (square.skip > 0) {
    player.skipTurns = square.skip;
    player.skipSquare = square;
  }
  if (square.othersMove) {
    for (const other of game.players.filter((p) => p !== player)) {
      await moveBy(other, square.othersMove); // not a die landing: their squares do nothing
    }
  }
  if (square.minigame) {
    if (await playMinigameFor(player)) {
      // Won: to the Moon, along the star trail if the board has one.
      await (square.trail ? followTrail(player, square.trail, pack.goal) : jumpTo(player, pack.goal));
    }
  } else if (square.goTo !== undefined) {
    await jumpTo(player, square.goTo);
  } else if (square.move) {
    await moveBy(player, square.move);
  } else if (square.backRoll) {
    await moveBy(player, -(await rollDie()));
    if (pack.backwardsCounts) {
      const next = await landOn(player); // a die landing: its square counts
      outcome.again = outcome.again || next.again;
    }
  }
  return outcome;
}
