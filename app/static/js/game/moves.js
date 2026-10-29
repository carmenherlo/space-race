// Moving the tokens: the die, step by step, flying, swapping places.

import { sounds } from "../sounds.js";
import { renderTokens } from "./board.js";
import { elements, game, pack } from "./state.js";
import { DIE_ROLL_MS, FLIGHT_MS, STEP_MS, wait } from "./timing.js";

// Two tokens fly to each other's place at the same time.
export async function swapPlaces(player, other) {
  sounds.fly();
  [player.place, other.place] = [other.place, player.place];
  renderTokens({ flying: [player, other] });
  await wait(FLIGHT_MS);
}

// The die shows random numbers for a moment, then stops on the roll (1 to 6).
export function rollDie() {
  const roll = 1 + Math.floor(Math.random() * 6);
  sounds.dice();
  delete elements.tokens.dataset.calling; // the token is about to move: no more jumping
  elements.die.disabled = true;
  elements.die.dataset.rolling = "";
  const shuffle = setInterval(() => {
    elements.die.textContent = String(1 + Math.floor(Math.random() * 6));
  }, 80);
  return wait(DIE_ROLL_MS).then(() => {
    clearInterval(shuffle);
    delete elements.die.dataset.rolling;
    elements.die.textContent = String(roll);
    return roll;
  });
}

// Flies a token straight to another square (UFOs, galaxies, the black hole…).
export async function jumpTo(player, place) {
  sounds.fly();
  player.place = place;
  renderTokens({ flying: player });
  await wait(FLIGHT_MS);
}

// Moves a token one square at a time (backwards for a negative number), never before
// the start. At the Moon it stops, or, with the exact finish, it bounces back what is
// left (like the Game of the Goose). Returns how many squares it bounced back (0 if none).
export async function moveBy(player, steps) {
  let direction = Math.sign(steps);
  let bounced = 0;
  for (let left = Math.abs(steps); left > 0; left -= 1) {
    if (direction > 0 && player.place === pack.goal) {
      if (!game.exactFinish) {
        break;
      }
      direction = -1;
      sounds.bounce();
    }
    if (direction < 0 && player.place === 0) {
      break;
    }
    player.place += direction;
    if (direction < 0 && steps > 0) {
      bounced += 1;
    }
    sounds.hop();
    renderTokens();
    await wait(STEP_MS);
  }
  return bounced;
}
