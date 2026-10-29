// The die (dado.html): a test page for what makes a roll easy to follow (as in the game,
// js/game/moves.js), on the short board with a random avatar. Each can be switched off:
//   1. the number, big in the middle of the board, before the token moves;
//   2. the number flies into the token: it pops a little and sends out one soft wave of its
//      colour, so the eye goes from the number to the token; a short pause, and it moves;
//   3. slower steps.
// Nothing here touches a game: it is only to try them out.

import { sounds } from "../js/sounds.js";
import { randomPlayers } from "./players.js";

const ROLL_MS = 900; // the die keeps changing (as DIE_ROLL_MS in the game)
const NUMBER_MS = 1100; // idea 1: the big number stays this long (DIE_NUMBER_MS in the game)
const FLY_MS = 600; // idea 2: the number flies into the token…
const ARRIVE_MS = 800; // …which pops and sends out a wave (as long as in dado.css)…
const ARRIVE_PAUSE_MS = 250; // …and a short pause before moving
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
  token.style.setProperty("--ring-color", avatar.style.getPropertyValue("--avatar-color"));
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
    if (ideas.ring.checked) {
      await flyIntoTheToken();
    }
    number.hidden = true;
    number.style.transition = "";
    number.style.transform = "";
    number.style.opacity = "";
  }
  if (ideas.ring.checked) {
    token.dataset.arrive = "";
    sounds.hop();
    await wait(ARRIVE_MS);
    delete token.dataset.arrive;
    await wait(ARRIVE_PAUSE_MS);
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

// Idea 2: the big number shrinks and flies to the token, as if dropping into it.
async function flyIntoTheToken() {
  const from = number.getBoundingClientRect();
  const to = token.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  number.style.transition = `transform ${FLY_MS}ms cubic-bezier(0.5, 0, 0.7, 0.4), opacity ${FLY_MS}ms ease-in`;
  number.style.transform = `translate(${dx}px, ${dy}px) scale(${to.width / from.width})`;
  number.style.opacity = "0.4";
  await wait(FLY_MS);
}
