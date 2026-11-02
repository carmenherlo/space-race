// Moving the tokens: the die, step by step, flying, swapping places.

import { mark as markOn, sparkle } from "../effects/layer.js";
import { fly, hop, nebula, teleport, wormhole } from "../effects/trips.js";
import { sounds } from "../sounds.js";
import { BOARD_ASPECT, over, renderTokens, tokenOf, under } from "./board.js";
import { lightTheSquare, lightTheTrail } from "./lights.js";
import { currentPlayer, elements, game, pack } from "./state.js";
import { DIE_NUMBER_MS, DIE_ROLL_MS, FLIGHT_MS, STEP_MS, TRAIL_STEP_MS, NEBULA_MS, TELEPORT_MS, TRIP_FLIGHT_MS, TRIP_TARGET_MS, WORMHOLE_MS, HOP_MS, clock, wait } from "./timing.js";

// Two tokens fly to each other's place at the same time.
export async function swapPlaces(player, other) {
  sounds.fly();
  [player.place, other.place] = [other.place, player.place];
  player.inRocket = other.inRocket = false; // out of the rocket of the start, if one was in it
  renderTokens({ flying: [player, other] });
  await wait(FLIGHT_MS);
}

// The die shows random numbers for a moment, then stops on the roll (1 to 6).
export function rollDie() {
  const roll = 1 + Math.floor(Math.random() * 6);
  sounds.dice();
  delete elements.tokens.dataset.calling; // the hops of the turn's start…
  elements.tokens.dataset.rolling = ""; // …give way to the hops while the die rolls
  elements.die.disabled = true;
  elements.die.dataset.rolling = "";
  const shuffle = setInterval(() => {
    elements.die.textContent = String(1 + Math.floor(Math.random() * 6));
  }, 80);
  return wait(DIE_ROLL_MS).then(async () => {
    clearInterval(shuffle);
    delete elements.die.dataset.rolling;
    delete elements.tokens.dataset.rolling;
    elements.die.textContent = String(roll);
    // So everybody sees what came out before the token moves: the number, big on the board
    // (the token is easy to find: its square is lit, and it pulses).
    const player = currentPlayer();
    elements.dieNumber.style.setProperty("--player-color", player.color);
    elements.dieNumber.textContent = String(roll);
    elements.dieNumber.hidden = false;
    await wait(DIE_NUMBER_MS);
    elements.dieNumber.hidden = true;
    return roll;
  });
}

// Glides a token along a trail ([x, y] points in % of the board, like the star trail to
// the Moon), leaving sparkles, and puts it on that place at the end.
export async function followTrail(player, trail, place) {
  const token = tokenOf(player);
  sounds.fly();
  lightTheTrail(true);
  if (token) {
    token.dataset.trail = ""; // a slower, smooth glide (see game.css)
    for (const [x, y] of trail) {
      token.style.left = `${x}%`;
      token.style.top = `${y}%`;
      sparkle(over, [x, y]);
      await wait(TRAIL_STEP_MS);
    }
  }
  player.place = place;
  renderTokens();
  await wait(TRAIL_STEP_MS);
  lightTheTrail(false);
}

// Several tokens jump `steps` squares at once (back for a negative number), one jump in an
// arc per square, never before the start nor past the Moon (the solar storm: a jump is
// easier to see than a step).
export async function hopAll(players, steps) {
  for (let left = Math.abs(steps); left > 0; left -= 1) {
    const jumps = players
      .map((player) => ({ player, to: player.place + Math.sign(steps) }))
      .filter(({ to }) => to >= 0 && to <= pack.goal)
      .map((jump) => ({ ...jump, element: tokenOf(jump.player) }))
      .filter(({ element }) => element);
    if (jumps.length === 0) {
      return;
    }
    sounds.hop();
    await hop(
      jumps.map(({ player, to, element }) => ({ element, from: pack.places[player.place], to: pack.places[to] })),
      { clock, ms: HOP_MS },
    );
    for (const { player, to } of jumps) {
      player.place = to;
    }
    renderTokens();
  }
}

// A trip to another square (go_to). With a `trip`, first the square it goes to lights up,
// so everybody sees where, and then the token gets there its way (TRIPS); without one, a
// quick flight (jumpTo).
export async function travel(player, place, trip) {
  if (!trip) {
    await jumpTo(player, place);
    return;
  }
  lightTheSquare(place);
  await wait(TRIP_TARGET_MS);
  const token = tokenOf(player);
  if (token) {
    const { effect, ms, sound } = TRIPS[trip];
    await effect(token, pack.places[player.place], pack.places[place], {
      clock,
      ms,
      under,
      over,
      aspect: BOARD_ASPECT,
      onLeg: sound ? () => sounds.fly() : undefined,
    });
  }
  player.place = place;
  sounds.hop();
  renderTokens();
}

// The ways of a trip (a square's `trip` in game.yaml): the effect, how long each leg
// takes, and whether a flying sound goes with each leg.
const TRIPS = {
  fly: { effect: fly, ms: TRIP_FLIGHT_MS, sound: true }, // galaxies, the space hero
  wormhole: { effect: wormhole, ms: WORMHOLE_MS, sound: true }, // wormholes, the black hole
  teleport: { effect: teleport, ms: TELEPORT_MS, sound: true }, // the UFOs
  nebula: { effect: nebula, ms: NEBULA_MS, sound: false }, // the nebula: silent
};

// Something on the board under the tokens (a swirl, a beam, a cloud, a fire), until it is
// removed (see markOn in effects/layer.js).
export function mark(kind, at, text = "") {
  return markOn(under, kind, at, text);
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
