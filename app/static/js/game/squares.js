// The special squares: what each one does (the rules come from the game's game.yaml).

import { flyStar, react, shine } from "./board.js";
import { chooseSwap, offerStar, playMinigameFor, showCard } from "./cards.js";
import { followTrail, hopAll, jumpTo, mark, moveBy, rollDie, swapPlaces, travel } from "./moves.js";
import { game, pack } from "./state.js";
import { LAND_PAUSE_MS, wait } from "./timing.js";
import { renderTurn } from "./turn-bar.js";

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
    await flyStar(player);
    player.stars += 1;
    renderTurn();
  }
  if (square.skip > 0) {
    player.skipTurns = square.skip;
    player.skipSquare = square;
  }
  if (square.othersMove) {
    await moveOthers(player, square.othersMove);
  }
  if (square.minigame) {
    if (await playMinigameFor(player)) {
      // Won: to the Moon, along the star trail if the board has one.
      await (square.trail ? followTrail(player, square.trail, pack.goal) : jumpTo(player, pack.goal));
    }
  } else if (square.goTo !== undefined) {
    await travel(player, square.goTo, square.trip);
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

// The solar storm: everybody but `player` at once. Their squares burn while their tokens
// shake (back) or hop (forward), then they all jump there together. Not a die landing:
// their squares do nothing.
export async function moveOthers(player, steps) {
  const moved = game.players.filter((other) => other !== player && !other.inRocket);
  const back = steps < 0;
  const fires = back ? moved.map((other) => mark("fire", pack.places[other.place])) : [];
  await Promise.all(moved.map((other) => react(other, back ? "bad" : "good")));
  fires.forEach((fire) => fire.remove());
  await hopAll(moved, steps);
}
