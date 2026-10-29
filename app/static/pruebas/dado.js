// The die (dado.html): a test page for ideas that make a roll easy to follow, on the short
// board with a random avatar. Each idea can be switched on and off:
//   1. the number, big in the middle of the board, before the token moves;
//   2. the token hops (where it is) before it starts walking;
//   3. slower steps, with a counter over the token: 1, 2, 3…
// Nothing here touches a game: it is only to try them out.

import { sounds } from "../js/sounds.js";
import { randomPlayers } from "./players.js";

const ROLL_MS = 900; // the die keeps changing (as DIE_ROLL_MS in the game)
const NUMBER_MS = 1100; // idea 1: the big number stays this long
const HOP_MS = 800; // idea 2: the hop before walking
const STEP_MS = 280; // a step, as in the game…
const SLOW_STEP_MS = 480; // …and slower, counting (idea 3)

const die = document.getElementById("die");
const board = document.getElementById("board");
const number = document.getElementById("number");
const ideas = {
  number: document.getElementById("idea-number"),
  hop: document.getElementById("idea-hop"),
  count: document.getElementById("idea-count"),
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let places = [];
let place = 0;
const token = document.createElement("span");
token.className = "dice-test__token";
const counter = document.createElement("span");
counter.className = "dice-test__counter";
counter.hidden = true;

start();

async function start() {
  const game = await (await fetch("../api/games/space-race", { cache: "no-store" })).json();
  document.getElementById("board-image").src = `../${game.image_url}`;
  places = game.places;
  const [{ avatar }] = await randomPlayers(["Tú"]);
  token.append(avatar, counter);
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
  if (ideas.hop.checked) {
    token.dataset.hop = "";
    sounds.hop();
    await wait(HOP_MS);
    delete token.dataset.hop;
  }
  const counting = ideas.count.checked;
  token.dataset.speed = counting ? "slow" : "usual";
  for (let step = 1; step <= rolled; step += 1) {
    place = (place + 1) % places.length; // after the Moon, back to the start
    put();
    sounds.hop();
    if (counting) {
      counter.textContent = String(step);
      counter.hidden = false;
      counter.dataset.pop = String(step % 2); // a new number pops each step
    }
    await wait(counting ? SLOW_STEP_MS : STEP_MS);
  }
  await wait(600);
  counter.hidden = true;
  die.textContent = "🎲";
  die.disabled = false;
}
