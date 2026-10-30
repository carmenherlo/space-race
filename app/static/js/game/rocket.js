// The rocket of the start (rocket in game.yaml): at the start every token waits in it; when
// it is the turn of a token still in the rocket, the rocket comes in from the left, stops
// over "Start here", wiggles, drops the token on the start and flies away. A board without
// it simply has none (its tokens wait at waiting_place).

import { sounds } from "../sounds.js";
import { renderTokens } from "./board.js";
import { elements, game, pack } from "./state.js";
import { ROCKET_DROP_MS, ROCKET_IN_MS, ROCKET_LANDED_MS, ROCKET_OUT_MS, ROCKET_WIGGLE_MS, wait } from "./timing.js";

// The rocket flies along its nose, up and to the right: this much down for each step right
// (in % of the board's height for each % of its width).
const SLOPE = 0.54;

let rocket = null;
// Worked out from the picture (see measure), in % of the board: where it comes from and
// goes to, and where the token comes out.
let from = [-24, 13];
let to = [48, -26];
let belly = [11.5, 18];

// Gets the rocket ready (after the pack is loaded), hidden until it is needed.
export async function setUpRocket(url) {
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
  try {
    await rocket.decode();
    measure();
  } catch (error) {
    console.error("The rocket's picture could not be read: it flies as on the short board.", error);
  }
}

// Where the rocket is drawn (the box of its see-through picture), and from it: coming from
// the left until it is out of the board, leaving to the top right until it is out too,
// wiggling round its middle, the token coming out a little under it.
function measure() {
  const width = 192; // a small copy is enough
  const height = 108;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(rocket, 0, 0, width, height);
  const alpha = context.getImageData(0, 0, width, height).data;
  let [left, top, right, bottom] = [width, height, 0, 0];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alpha[(y * width + x) * 4 + 3] > 40) {
        [left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x + 1), Math.max(bottom, y + 1)];
      }
    }
  }
  if (right <= left) {
    return; // nothing drawn
  }
  [left, right] = [(100 * left) / width, (100 * right) / width];
  [top, bottom] = [(100 * top) / height, (100 * bottom) / height];
  const middle = [(left + right) / 2, (top + bottom) / 2];
  const away = right + 5;
  from = [-away, away * SLOPE];
  const up = bottom + 3;
  to = [up / SLOPE, -up];
  belly = [middle[0] + 1.5, middle[1] + 4];
  rocket.style.transformOrigin = `${middle[0]}% ${middle[1]}%`;
}

// Brings `player` to the start, if they are still in the rocket.
export async function bringFromTheRocket(player) {
  if (!player.inRocket) {
    return;
  }
  rocket.parentElement.hidden = false;
  sounds.rocketIn(ROCKET_IN_MS / 1000);
  await play(rocket, [{ translate: `${from[0]}% ${from[1]}%` }, { translate: "0 0" }], {
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
      { left: `${belly[0]}%`, top: `${belly[1]}%`, scale: 0.2, offset: 0, easing: "ease-in" },
      { left: `${x}%`, top: `${y}%`, scale: 1, offset: 0.8, easing: "ease-out" },
      { left: `${x}%`, top: `${y - 1.5}%`, scale: 1, offset: 0.9, easing: "ease-in" },
      { left: `${x}%`, top: `${y}%`, scale: 1, offset: 1 },
    ],
    { duration: ROCKET_DROP_MS },
  );
  await wait(ROCKET_LANDED_MS);

  sounds.rocketOut(ROCKET_OUT_MS / 1000);
  await play(rocket, [{ translate: "0 0" }, { translate: `${to[0]}% ${to[1]}%` }], {
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
