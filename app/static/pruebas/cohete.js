// The rocket of the start (cohete.html): a test page. Each time a new token is going to
// roll for the first time, a rocket comes in from the left, stops over "Start here",
// wiggles, drops the token on the start (by square 1) and flies away, with its sounds.
// "Siguiente ficha" sends the token on the start a few squares on, then the next one comes.
// Nothing here touches a game: it is only to try it out.

import { sounds } from "../js/sounds.js";
import { randomPlayers } from "./players.js";

const IN_MS = 1500; // the rocket comes in, braking
const WIGGLE_MS = 900; // it wiggles
const DROP_MS = 700; // the token falls to the start
const LANDED_MS = 350; // a pause before the rocket leaves
const OUT_MS = 1200; // the rocket flies away, faster and faster
// Where the rocket comes from and goes to, in % of the board (along its nose).
const FROM = [-24, 13];
const TO = [48, -26];
const BELLY = [11.5, 18]; // where the token comes out, in % of the board
const NAMES = ["Ana", "Leo", "Mía", "Teo"];
const STEP_MS = 480;

const board = document.getElementById("board");
const rocket = document.getElementById("rocket");
const next = document.getElementById("next");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let places = [];
let tokens = [];
let current = -1; // the token on the start (whose turn it is), -1 before the first
let busy = false;

start();

async function start() {
  const game = await (await fetch("../api/games/space-race", { cache: "no-store" })).json();
  document.getElementById("board-image").src = `../${game.image_url}`;
  rocket.src = `../${game.rocket_url}`;
  places = game.places;
  next.addEventListener("click", nextToken);
  document.getElementById("reset").addEventListener("click", reset);
  await reset();
}

async function reset() {
  if (busy) {
    return;
  }
  tokens.forEach((token) => token.remove());
  const players = await randomPlayers(NAMES);
  tokens = players.map(({ avatar }) => {
    const token = document.createElement("span");
    token.className = "rocket-test__token";
    token.style.setProperty("--player-color", avatar.style.getPropertyValue("--avatar-color"));
    token.append(avatar);
    token.hidden = true; // still in the rocket
    return token;
  });
  current = -1;
  next.disabled = false;
}

async function nextToken() {
  if (busy) {
    return;
  }
  busy = true;
  next.disabled = true;
  if (current >= 0) {
    await walk(tokens[current], 1 + Math.floor(Math.random() * 6));
    tokens[current].removeAttribute("data-current");
  }
  current += 1;
  await bring(tokens[current]);
  tokens[current].toggleAttribute("data-current", true);
  busy = false;
  next.disabled = current === tokens.length - 1;
}

// The token on the start walks to a square, step by step (as in the game).
async function walk(token, squares) {
  for (let place = 1; place <= squares; place += 1) {
    put(token, places[place]);
    sounds.hop();
    await wait(STEP_MS);
  }
}

function put(token, [x, y]) {
  token.style.left = `${x}%`;
  token.style.top = `${y}%`;
}

// The rocket comes, wiggles, drops the token on the start and leaves.
async function bring(token) {
  rocket.hidden = false;
  sounds.rocketIn(IN_MS / 1000);
  await rocket.animate(
    [{ transform: `translate(${FROM[0]}%, ${FROM[1]}%)` }, { transform: "translate(0, 0)" }],
    { duration: IN_MS, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
  ).finished;

  sounds.rocketWiggle(WIGGLE_MS / 1000);
  await rocket.animate(
    [
      { transform: "rotate(0)" },
      { transform: "rotate(-5deg) translateY(-0.4%)" },
      { transform: "rotate(4deg)" },
      { transform: "rotate(-4deg) translateY(-0.3%)" },
      { transform: "rotate(3deg)" },
      { transform: "rotate(-2deg)" },
      { transform: "rotate(0)" },
    ],
    { duration: WIGGLE_MS, easing: "ease-in-out" },
  ).finished;

  // The token falls out of its belly to the start, growing, and bounces a little.
  const [x, y] = places[0];
  token.style.transition = "none";
  put(token, places[0]);
  token.hidden = false;
  board.append(token);
  sounds.rocketDrop(DROP_MS / 1000);
  await token.animate(
    [
      { left: `${BELLY[0]}%`, top: `${BELLY[1]}%`, scale: 0.2, offset: 0, easing: "ease-in" },
      { left: `${x}%`, top: `${y}%`, scale: 1, offset: 0.8, easing: "ease-out" },
      { left: `${x}%`, top: `${y - 1.5}%`, scale: 1, offset: 0.9, easing: "ease-in" },
      { left: `${x}%`, top: `${y}%`, scale: 1, offset: 1 },
    ],
    { duration: DROP_MS },
  ).finished;
  token.style.transition = "";
  await wait(LANDED_MS);

  sounds.rocketOut(OUT_MS / 1000);
  await rocket.animate(
    [{ transform: "translate(0, 0)" }, { transform: `translate(${TO[0]}%, ${TO[1]}%)` }],
    { duration: OUT_MS, easing: "cubic-bezier(0.6, 0, 0.9, 0.6)" },
  ).finished;
  rocket.hidden = true;
}
