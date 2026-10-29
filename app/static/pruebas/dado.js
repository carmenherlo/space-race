// The die (dado.html): a test page for what makes a roll easy to follow (as in the game,
// js/game/moves.js), on the short board with a random avatar. Each can be switched off:
//   1. the number, big in the middle of the board, before the token moves;
//   2. then a glint runs around the ring of the token, like a ring catching the light, and
//      after a short pause it moves;
//   3. slower steps.
// Nothing here touches a game: it is only to try them out.

import { sounds } from "../js/sounds.js";
import { randomPlayers } from "./players.js";

const ROLL_MS = 900; // the die keeps changing (as DIE_ROLL_MS in the game)
const NUMBER_MS = 1100; // idea 1: the big number stays this long (DIE_NUMBER_MS in the game)
const SHINE_MS = 1300; // idea 2: the glint around the ring (as long as in dado.css)…
const SHINE_PAUSE_MS = 450; // …then a short pause before moving
const STEP_MS = 280; // a step, as it was…
const SLOW_STEP_MS = 480; // …and slower (idea 3, STEP_MS in the game)

const die = document.getElementById("die");
const board = document.getElementById("board");
const number = document.getElementById("number");
const ideas = {
  number: document.getElementById("idea-number"),
  ring: document.getElementById("idea-ring"),
  slow: document.getElementById("idea-slow"),
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let places = [];
let place = 0;
const token = document.createElement("span");
token.className = "dice-test__token";

start();

async function start() {
  const game = await (await fetch("../api/games/space-race", { cache: "no-store" })).json();
  document.getElementById("board-image").src = `../${game.image_url}`;
  places = game.places;
  const [{ avatar }] = await randomPlayers(["Tú"]);
  token.append(avatar);
  board.append(token);
  put();
  die.addEventListener("click", roll);
}

function put() {
  const [x, y] = places[place];
  token.style.left = `${x}%`;
  token.style.top = `${y}%`;
}

async function roll() {
  die.disabled = true;
  const rolled = 1 + Math.floor(Math.random() * 6);
  sounds.dice();
  const shuffle = setInterval(() => (die.textContent = String(1 + Math.floor(Math.random() * 6))), 80);
  await wait(ROLL_MS);
  clearInterval(shuffle);
  die.textContent = String(rolled);

  if (ideas.number.checked) {
    number.textContent = String(rolled);
    number.hidden = false;
    await wait(NUMBER_MS);
    number.hidden = true;
  }
  if (ideas.ring.checked) {
    token.dataset.shine = "";
    await wait(SHINE_MS);
    delete token.dataset.shine;
    await wait(SHINE_PAUSE_MS);
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
