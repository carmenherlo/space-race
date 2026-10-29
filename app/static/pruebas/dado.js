// The die (dado.html): a test page for what makes a roll easy to follow, on the short
// board with a random avatar. Each idea can be switched off:
//   1. the number, big in the middle of the board, before the token moves;
//   2. then, so everybody finds the token before it moves, one of: two little hops (as at
//      the start of a turn in the game), or a shine (a little bigger, its ring thicker,
//      and a glowing reflection goes round the ring, like a gold ring turned in the light);
//      a short pause, and it moves;
//   3. slower steps.
// While the die rolls, the token can hop twice (as in the game when the die is tapped as
// soon as the turn starts).
// And, as in the game all through a turn, the glowing pulse behind the token (it can be
// switched off, to see the ideas with and without it).
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
  rollHops: document.getElementById("idea-roll-hops"),
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
