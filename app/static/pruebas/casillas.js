// Each special square's effect (casillas.html): a test page, with the game's own engine. A
// button per square: its token goes there, and the effect plays as in a game (the trips,
// the solar storm, the wildcard star), with no card and no die. Two more tokens stand a few
// squares behind, for the storm. Nothing here touches a game: it is only to try them out.

import { flyStar, renderTokens } from "../js/game/board.js";
import { travel } from "../js/game/moves.js";
import { NEAR_MOON } from "../js/game/rules.js";
import { silvered } from "../js/moon.js";
import { loadPack } from "../js/game/pack.js";
import { moveOthers } from "../js/game/squares.js";
import { game, pack } from "../js/game/state.js";
import { wait } from "../js/game/timing.js";

const COLORS = ["#ff8c42", "#4cc9f0", "#90e05a"];

if (!new URLSearchParams(location.search).get("game")) {
  location.replace("pruebas/casillas.html?game=space-race");
} else {
  start();
}

async function start() {
  await loadPack();
  game.players = await players();
  game.turn = 0;
  game.playing = true; // as in a game: the square of whose turn it is lights up
  renderTokens();
  const buttons = [];
  for (const [number, square] of pack.squares) {
    const effect = effectOf(square);
    if (effect) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "galaxy__button";
      button.textContent = `${square.emoji} ${number}${square.goTo !== undefined ? ` → ${square.goTo}` : ""}`;
      button.title = square.title;
      button.addEventListener("click", () => play(number, effect));
      buttons.push(button);
    }
  }
  // The final stretch: everybody near the Moon, to see their glow and the Moon's.
  const near = document.createElement("button");
  near.type = "button";
  near.className = "galaxy__button";
  near.replaceChildren(...silvered(`🌙 Cerca de la Luna (${pack.goal - NEAR_MOON}+)`));
  near.addEventListener("click", () => {
    game.players.forEach((player, index) => (player.place = pack.goal - NEAR_MOON + 2 * index));
    renderTokens();
  });
  buttons.push(near);
  document.getElementById("effects").replaceChildren(...buttons);
}

// What a square does that has an effect to see, or null.
function effectOf(square) {
  if (square.goTo !== undefined && square.trip) {
    return (player) => travel(player, square.goTo, square.trip);
  }
  if (square.othersMove) {
    return (player) => moveOthers(player, square.othersMove);
  }
  if (square.star) {
    return async (player) => {
      await flyStar(player);
      player.stars = 1;
      renderTokens();
    };
  }
  return null;
}

// The token goes to the square (the others a few squares on), then the effect.
async function play(number, effect) {
  if (game.busy) {
    return;
  }
  game.busy = true;
  const [player, ...others] = game.players;
  player.place = number;
  player.stars = 0;
  // The others a few squares behind (ahead, near the Moon, their tokens would glow).
  others.forEach((other, index) => (other.place = Math.max(1, number - 3 - 2 * index)));
  renderTokens();
  await wait(700);
  await effect(player);
  game.busy = false;
}

// Three players with random avatars (or initials, without avatars), like the game's.
async function players() {
  let avatars = [];
  try {
    avatars = await (await fetch("api/avatars", { cache: "no-store" })).json();
  } catch {
    // no avatars: initials
  }
  const shuffled = [...avatars].sort(() => Math.random() - 0.5);
  return ["Ana", "Leo", "Mía"].map((name, index) => ({
    id: String(index),
    name,
    color: shuffled[index]?.color ?? COLORS[index],
    photoUrl: shuffled[index]?.url,
    place: 0,
    stars: 0,
    skipTurns: 0,
    inRocket: false,
  }));
}
