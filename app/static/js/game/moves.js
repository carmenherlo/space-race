// Moving the tokens: the die, step by step, flying, swapping places.

import { sounds } from "../sounds.js";
import { renderTokens } from "./board.js";
import { lightTheSquare, lightTheTrail } from "./lights.js";
import { currentPlayer, elements, game, pack } from "./state.js";
import { DIE_NUMBER_MS, DIE_ROLL_MS, FLIGHT_MS, STEP_MS, TRAIL_STEP_MS, NEBULA_MS, TELEPORT_MS, TRIP_FLIGHT_MS, TRIP_TARGET_MS, WORMHOLE_MS, HOP_MS, animate, wait } from "./timing.js";

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
  const token = elements.tokens.children[game.players.indexOf(player)];
  sounds.fly();
  lightTheTrail(true);
  if (token) {
    token.dataset.trail = ""; // a slower, smooth glide (see game.css)
    for (const [x, y] of trail) {
      token.style.left = `${x}%`;
      token.style.top = `${y}%`;
      sparkle(x, y);
      await wait(TRAIL_STEP_MS);
    }
  }
  player.place = place;
  renderTokens();
  await wait(TRAIL_STEP_MS);
  lightTheTrail(false);
}

// A sparkle on the board, fading away.
function sparkle(x, y) {
  const star = document.createElement("span");
  star.className = "board-sparkle";
  star.textContent = "✨";
  star.style.left = `${x}%`;
  star.style.top = `${y}%`;
  elements.tokens.after(star);
  setTimeout(() => star.remove(), 1200);
}

// Several tokens jump `steps` squares at once (back for a negative number), one jump in an
// arc per square, never before the start nor past the Moon (the solar storm: a jump is
// easier to see than a step).
export async function hopAll(players, steps) {
  const LIFT = 7; // how high a jump goes, in % of the board's height
  for (let left = Math.abs(steps); left > 0; left -= 1) {
    const jumps = players
      .map((player) => ({ player, to: player.place + Math.sign(steps) }))
      .filter(({ to }) => to >= 0 && to <= pack.goal)
      .map((jump) => ({ ...jump, token: elements.tokens.children[game.players.indexOf(jump.player)] }))
      .filter(({ token }) => token);
    if (jumps.length === 0) {
      return;
    }
    for (const { token } of jumps) {
      token.dataset.trip = "hop"; // moved by hand (see game.css)
    }
    sounds.hop();
    await animate(HOP_MS, (t) => {
      for (const { player, to, token } of jumps) {
        const [x0, y0] = pack.places[player.place];
        const [x1, y1] = pack.places[to];
        put(token, [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - LIFT * 4 * t * (1 - t)]);
        token.style.scale = String(1 + 0.3 * Math.sin(Math.PI * t));
      }
    });
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
  const token = elements.tokens.children[game.players.indexOf(player)];
  if (token) {
    token.dataset.trip = trip; // over the others, moved by hand (see game.css)
    await TRIPS[trip](token, pack.places[player.place], pack.places[place]);
  }
  player.place = place;
  sounds.hop();
  renderTokens();
}

const TRIPS = {
  // Galaxies, the space hero: it takes off (bigger, as if nearer), flies there in an arc
  // leaving sparkles, and lands.
  async fly(token, [x0, y0], [x1, y1]) {
    sounds.fly();
    // The top of the arc: above the middle, higher the further it goes (y is in % of the
    // height, 9/16 of the width: the distance is in % of the width).
    const distance = Math.hypot(x1 - x0, ((y1 - y0) * 9) / 16);
    const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2 - distance * 0.35 * (16 / 9)];
    let frame = 0;
    await animate(TRIP_FLIGHT_MS, (t) => {
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // ease in and out
      const x = (1 - e) ** 2 * x0 + 2 * (1 - e) * e * cx + e ** 2 * x1;
      const y = (1 - e) ** 2 * y0 + 2 * (1 - e) * e * cy + e ** 2 * y1;
      put(token, [x, y]);
      token.style.scale = String(1 + 0.7 * Math.sin(Math.PI * t)); // biggest half way
      frame += 1;
      if (frame % 5 === 0 && t < 0.95) {
        sparkle(x, y);
      }
    });
  },

  // Wormholes, the black hole: a swirl opens under the token, which spins and shrinks into
  // it; then another one opens where it goes, and it spins out of it, growing.
  async wormhole(token, from, to) {
    sounds.fly();
    let hole = mark("swirl", from, "🌀");
    await animate(WORMHOLE_MS, (t) => {
      token.style.rotate = `${t * 720}deg`;
      token.style.scale = String(1 - t);
    });
    hole.remove();
    put(token, to);
    hole = mark("swirl", to, "🌀");
    sounds.fly();
    await animate(WORMHOLE_MS, (t) => {
      token.style.rotate = `${(1 - t) * 720}deg`;
      token.style.scale = String(t);
    });
    hole.remove();
  },

  // The UFOs: a beam of light comes down on the token, which goes up it and fades away;
  // then another beam where it goes, and it comes down it.
  async teleport(token, from, to) {
    const rise = token.offsetHeight * 1.5; // px: how high it goes up the beam
    sounds.fly();
    let beam = mark("beam", from);
    await animate(TELEPORT_MS, (t) => {
      token.style.translate = `0 ${-t * rise}px`;
      token.style.opacity = String(1 - t);
    });
    beam.remove();
    put(token, to);
    beam = mark("beam", to);
    sounds.fly();
    await animate(TELEPORT_MS, (t) => {
      token.style.translate = `0 ${-(1 - t) * rise}px`;
      token.style.opacity = String(t);
    });
    beam.remove();
  },

  // The nebula: a cloud covers the token, which blurs and fades away in it; then it comes
  // out of another cloud where it goes.
  async nebula(token, from, to) {
    let cloud = mark("cloud", from);
    await animate(NEBULA_MS, (t) => {
      token.style.filter = `blur(${t * 8}px)`;
      token.style.opacity = String(1 - t);
    });
    cloud.remove();
    put(token, to);
    cloud = mark("cloud", to);
    await animate(NEBULA_MS, (t) => {
      token.style.filter = `blur(${(1 - t) * 8}px)`;
      token.style.opacity = String(t);
    });
    cloud.remove();
  },
};

function put(token, [x, y]) {
  token.style.left = `${x}%`;
  token.style.top = `${y}%`;
}

// Something on the board under the tokens (a swirl, a beam, a cloud, a fire), until it is
// removed. Its look is in game.css (.board-mark[data-kind]).
export function mark(kind, [x, y], text = "") {
  const element = document.createElement("span");
  element.className = "board-mark";
  element.dataset.kind = kind;
  element.textContent = text;
  element.style.left = `${x}%`;
  element.style.top = `${y}%`;
  elements.tokens.before(element);
  return element;
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
