// The die (dado.html): a test page for what makes a roll easy to follow, on the short
// board with a random avatar. Each idea can be switched off:
//   1. the number, big in the middle of the board, before the token moves;
//   2. then, so everybody finds the token before it moves, one of: two little hops (as at
//      the start of a turn in the game), or a shine (a little bigger, its ring thicker,
//      and a glowing reflection goes round the ring, like a gold ring turned in the light);
//      a short pause, and it moves;
//   3. slower steps.
// "Casilla": the square the token is on lights up, with its real shape (from the board's
// squares picture, squares_image in game.yaml): whiter and brighter, glowing from its edges.
// While the die rolls, the token can hop twice (as in the game when the die is tapped as
// soon as the turn starts).
// And, as in the game all through a turn, the glowing pulse behind the token (it can be
// switched off, to see the ideas with and without it; "Latido al brillar" keeps it while
// the token shines, else it fades away meanwhile).
// Nothing here touches a game: it is only to try them out.

import { sounds } from "../js/sounds.js";
import { randomPlayers } from "./players.js";

const ROLL_MS = 900; // the die keeps changing (as DIE_ROLL_MS in the game)
const NUMBER_MS = 1100; // idea 1: the big number stays this long (DIE_NUMBER_MS in the game)
const SHINE_MS = 1700; // idea 2: the token shines (as long as in dado.css)…
const HOPS_MS = 1000; // or two little hops (as TOKEN_CALL_MS in the game)
const FIND_PAUSE_MS = 400; // then a short pause before moving
const STEP_MS = 280; // a step, as it was…
const SLOW_STEP_MS = 480; // …and slower (idea 3, STEP_MS in the game)

const die = document.getElementById("die");
const board = document.getElementById("board");
const number = document.getElementById("number");
const ideas = {
  number: document.getElementById("idea-number"),
  find: document.getElementById("idea-find"),
  slow: document.getElementById("idea-slow"),
  pulse: document.getElementById("idea-pulse"),
  square: document.getElementById("idea-square"),
  rollHops: document.getElementById("idea-roll-hops"),
  pulseShine: document.getElementById("idea-pulse-shine"),
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let places = [];
let boardUrl = "";
let squareShapes = new Map(); // square number → { left, top, width, height (in %), mask }
let lit = null; // the lit square on the board
let place = 0;
const token = document.createElement("span");
token.className = "dice-test__token";

start();

async function start() {
  const game = await (await fetch("../api/games/space-race", { cache: "no-store" })).json();
  boardUrl = `../${game.image_url}`;
  document.getElementById("board-image").src = boardUrl;
  places = game.places;
  if (game.squares_image_url) {
    squareShapes = await shapesOfTheSquares(`../${game.squares_image_url}`);
  }
  ideas.square.addEventListener("change", lightUp);
  const [{ avatar }] = await randomPlayers(["Tú"]);
  // The glow of the reflection: a blurred copy of it (blurred as a whole, so the glow spills
  // out of the ring; see dado.css).
  const glow = document.createElement("span");
  glow.className = "dice-test__glow";
  glow.append(document.createElement("span"));
  token.append(avatar, glow);
  token.style.setProperty("--player-color", avatar.style.getPropertyValue("--avatar-color"));
  showPulse();
  ideas.pulse.addEventListener("change", showPulse);
  board.append(token);
  put();
  die.addEventListener("click", roll);
}

// The pulse of the player whose turn it is (as .token[data-current] in game.css).
function showPulse() {
  token.toggleAttribute("data-current", ideas.pulse.checked);
}

function put() {
  const [x, y] = places[place];
  token.style.left = `${x}%`;
  token.style.top = `${y}%`;
  lightUp();
}

// The square the token is on, lit up (the previous one fades out).
function lightUp() {
  if (lit) {
    const old = lit;
    old.dataset.off = "";
    setTimeout(() => old.remove(), 400);
    lit = null;
  }
  const shape = squareShapes.get(place);
  if (!shape || !ideas.square.checked) {
    return;
  }
  // The board's own picture of that square, brighter, cut out with its shape; the glow
  // comes from its wrapper (see dado.css).
  lit = document.createElement("span");
  lit.className = "dice-test__lit";
  for (const side of ["left", "top", "width", "height"]) {
    lit.style[side] = `${shape[side]}%`;
  }
  const picture = document.createElement("span");
  picture.className = "dice-test__lit-picture";
  picture.style.backgroundImage = `url("${boardUrl}")`;
  picture.style.backgroundSize = `${10000 / shape.width}% ${10000 / shape.height}%`;
  picture.style.backgroundPosition = `${(shape.left / (100 - shape.width)) * 100}% ${(shape.top / (100 - shape.height)) * 100}%`;
  picture.style.webkitMaskImage = `url("${shape.mask}")`;
  picture.style.maskImage = `url("${shape.mask}")`;
  lit.append(picture);
  token.before(lit);
}

// Each square's shape, from the squares picture: from the middle of each square (its place),
// everything of it that is not see-through (the numbers' holes too). In % of the board,
// with a mask picture of the shape.
async function shapesOfTheSquares(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  const { naturalWidth: width, naturalHeight: height } = image;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const alpha = context.getImageData(0, 0, width, height).data;
  const solid = (x, y) => alpha[(y * width + x) * 4 + 3] > 127;
  const taken = new Uint8Array(width * height);
  const shapes = new Map();
  for (let number = 1; number < places.length - 1; number += 1) {
    const x = Math.round((places[number][0] * width) / 100);
    const y = Math.round((places[number][1] * height) / 100);
    if (!solid(x, y) || taken[y * width + x]) {
      continue;
    }
    // Fill from the middle to the edges.
    const pixels = [];
    const stack = [[x, y]];
    taken[y * width + x] = 1;
    while (stack.length) {
      const [px, py] = stack.pop();
      pixels.push(px, py);
      for (const [nx, ny] of [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]]) {
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && !taken[ny * width + nx] && solid(nx, ny)) {
          taken[ny * width + nx] = 1;
          stack.push([nx, ny]);
        }
      }
    }
    let [left, top, right, bottom] = [width, height, 0, 0];
    for (let i = 0; i < pixels.length; i += 2) {
      left = Math.min(left, pixels[i]);
      right = Math.max(right, pixels[i]);
      top = Math.min(top, pixels[i + 1]);
      bottom = Math.max(bottom, pixels[i + 1]);
    }
    const mask = document.createElement("canvas");
    mask.width = right - left + 1;
    mask.height = bottom - top + 1;
    const maskContext = mask.getContext("2d");
    maskContext.fillStyle = "#000";
    for (let i = 0; i < pixels.length; i += 2) {
      maskContext.fillRect(pixels[i] - left, pixels[i + 1] - top, 1, 1);
    }
    shapes.set(number, {
      left: (left / width) * 100,
      top: (top / height) * 100,
      width: (mask.width / width) * 100,
      height: (mask.height / height) * 100,
      mask: mask.toDataURL(),
    });
  }
  return shapes;
}

async function roll() {
  die.disabled = true;
  const rolled = 1 + Math.floor(Math.random() * 6);
  sounds.dice();
  const shuffle = setInterval(() => (die.textContent = String(1 + Math.floor(Math.random() * 6))), 80);
  if (ideas.rollHops.checked) {
    token.dataset.hops = ""; // while the die rolls
  }
  await wait(ROLL_MS);
  clearInterval(shuffle);
  delete token.dataset.hops;
  die.textContent = String(rolled);

  if (ideas.number.checked) {
    number.textContent = String(rolled);
    number.hidden = false;
    await wait(NUMBER_MS);
    number.hidden = true;
  }
  const find = ideas.find.value;
  if (find !== "none") {
    token.dataset[find] = "";
    token.toggleAttribute("data-calm", !ideas.pulseShine.checked); // no pulse while it shines
    await wait(find === "shine" ? SHINE_MS : HOPS_MS);
    delete token.dataset[find];
    await wait(FIND_PAUSE_MS);
  }
  const slow = ideas.slow.checked;
  token.dataset.speed = slow ? "slow" : "usual";
  for (let step = 1; step <= rolled; step += 1) {
    place = (place + 1) % places.length; // after the Moon, back to the start
    put();
    sounds.hop();
    await wait(slow ? SLOW_STEP_MS : STEP_MS);
  }
  await wait(600);
  die.textContent = "🎲";
  die.disabled = false;
}
