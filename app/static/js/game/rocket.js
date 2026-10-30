// The rocket of the start (rocket in game.yaml): at the start every token waits in it; when
// it is the turn of a token still in the rocket, the rocket comes in from the left, stops
// over "Start here", wiggles, drops the token on the start and flies away. A board without
// it simply has none (its tokens wait at waiting_place).

import { sounds } from "../sounds.js";
import { renderTokens } from "./board.js";
import { elements, game, pack } from "./state.js";
import { ROCKET_DROP_MS, ROCKET_IN_MS, ROCKET_LANDED_MS, ROCKET_OUT_MS, ROCKET_WIGGLE_MS, wait } from "./timing.js";

// For the rocket of the short board's picture: where it comes from and goes to (along its
// nose), and where the token comes out, in % of the board. Its middle is in game.css.
const FROM = [-24, 13];
const TO = [48, -26];
const BELLY = [11.5, 18];

let rocket = null;

// Gets the rocket ready (after the pack is loaded), hidden until it is needed.
export function setUpRocket(url) {
  rocket = document.createElement("img");
  rocket.className = "board-rocket__picture";
  rocket.alt = "";
  rocket.src = url;
  const sky = document.createElement("div"); // so it does not show outside the board
  sky.className = "board-rocket";
  sky.setAttribute("aria-hidden", "true");
  sky.hidden = true;
  sky.append(rocket);
  elements.board.append(sky);
  pack.rocket = true;
}

// Brings `player` to the start, if they are still in the rocket.
export async function bringFromTheRocket(player) {
  if (!player.inRocket) {
    return;
  }
  rocket.parentElement.hidden = false;
  sounds.rocketIn(ROCKET_IN_MS / 1000);
  await play(rocket, [{ translate: `${FROM[0]}% ${FROM[1]}%` }, { translate: "0 0" }], {
    duration: ROCKET_IN_MS,
    easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
  });

  sounds.rocketWiggle(ROCKET_WIGGLE_MS / 1000);
  await play(
    rocket,
    [
      { rotate: "0deg", translate: "0 0" },
      { rotate: "-5deg", translate: "0 -0.4%" },
      { rotate: "4deg", translate: "0 0" },
      { rotate: "-4deg", translate: "0 -0.3%" },
      { rotate: "3deg", translate: "0 0" },
      { rotate: "-2deg", translate: "0 0" },
      { rotate: "0deg", translate: "0 0" },
    ],
    { duration: ROCKET_WIGGLE_MS, easing: "ease-in-out" },
  );

  // The token falls out of its belly to the start, growing, and bounces a little.
  player.inRocket = false;
  renderTokens();
  const token = elements.tokens.children[game.players.indexOf(player)];
  const [x, y] = pack.places[0];
  sounds.rocketDrop(ROCKET_DROP_MS / 1000);
  await play(
    token,
    [
      { left: `${BELLY[0]}%`, top: `${BELLY[1]}%`, scale: 0.2, offset: 0, easing: "ease-in" },
      { left: `${x}%`, top: `${y}%`, scale: 1, offset: 0.8, easing: "ease-out" },
      { left: `${x}%`, top: `${y - 1.5}%`, scale: 1, offset: 0.9, easing: "ease-in" },
      { left: `${x}%`, top: `${y}%`, scale: 1, offset: 1 },
    ],
    { duration: ROCKET_DROP_MS },
  );
  await wait(ROCKET_LANDED_MS);

  sounds.rocketOut(ROCKET_OUT_MS / 1000);
  await play(rocket, [{ translate: "0 0" }, { translate: `${TO[0]}% ${TO[1]}%` }], {
    duration: ROCKET_OUT_MS,
    easing: "cubic-bezier(0.6, 0, 0.9, 0.6)",
  });
  rocket.parentElement.hidden = true;
}

// Runs an animation to its end, stopping while the game is paused (⏸).
async function play(element, keyframes, options) {
  const animation = element.animate(keyframes, options);
  const pause = setInterval(() => {
    if (animation.playState !== "finished") {
      game.paused ? animation.pause() : animation.play();
    }
  }, 50);
  await animation.finished;
  clearInterval(pause);
}
