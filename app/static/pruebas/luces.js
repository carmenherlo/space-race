// Lights on the board (luces.html): a test page for lights on the board's own drawings, on
// the short board with a token (its die moves it; at the Moon only with the exact number,
// else it bounces back). Each light can be switched off:
//   Título      the title "SPACE RACE" glows, very softly, breathing slowly;
//   Start       "Start here" lights up and beats while the token is at the start;
//   Estela      the last galaxy (button): the star trail lights up towards the Moon, then
//               the Moon shines;
//   Luna llega  the Moon shines strongly when the token gets there (with no bounce);
//   Luna cerca  the Moon glows softly when the token is close, more the closer it is.
// "MOON" (the sign) lights up like the start whenever the Moon shines, and the silver stars
// behind the Moon twinkle when it shines strongly. The lights are the board's own pictures
// of those parts (lights in game.yaml), brighter and glowing.
// Nothing here touches a game: it is only to try them out.

import { sounds } from "../js/sounds.js";
import { randomPlayers } from "./players.js";

const STEP_MS = 480; // a step, as in the game
const NEAR = 6; // "Luna cerca": from this many squares away
const board = document.getElementById("board");
const die = document.getElementById("die");
const switches = {
  title: document.getElementById("light-title"),
  start: document.getElementById("light-start"),
  trail: document.getElementById("light-trail"),
  arrive: document.getElementById("light-arrive"),
  near: document.getElementById("light-near"),
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let places = [];
let place = 0;
let busy = false;
const lights = {}; // part of the board (title, start…) → its light
const token = document.createElement("span");
token.className = "dice-test__token";

start();

async function start() {
  const game = await (await fetch("../api/games/space-race", { cache: "no-store" })).json();
  document.getElementById("board-image").src = `../${game.image_url}`;
  places = game.places;
  for (const [part, url] of Object.entries(game.lights ?? {})) {
    const picture = document.createElement("img");
    picture.className = "lights__piece";
    picture.dataset.kind = part;
    picture.alt = "";
    picture.src = `../${url}`;
    lights[part] = picture;
    board.append(picture);
  }
  const [{ avatar }] = await randomPlayers(["Tú"]);
  token.append(avatar);
  token.style.setProperty("--player-color", avatar.style.getPropertyValue("--avatar-color"));
  token.dataset.current = "";
  board.append(token); // over the lights
  put();
  die.addEventListener("click", roll);
  document.getElementById("galaxy").addEventListener("click", lastGalaxy);
  document.getElementById("reset").addEventListener("click", () => {
    place = 0;
    put();
  });
  for (const box of Object.values(switches)) {
    box.addEventListener("change", showLights);
  }
}

// Where the token is, and the lights that depend on it.
function put() {
  const [x, y] = places[place];
  token.style.left = `${x}%`;
  token.style.top = `${y}%`;
  showLights();
}

function showLights() {
  const goal = places.length - 1;
  lights.title.toggleAttribute("data-on", switches.title.checked);
  lights.start.toggleAttribute("data-on", switches.start.checked && place === 0);
  const away = goal - place;
  // On the Moon too (touching it on a bounce, or there for good): it stays lit.
  const near = switches.near.checked && place > 0 && away <= NEAR;
  lights.moon.toggleAttribute("data-near", near);
  // Closer, brighter: from a glimmer six squares away to a glow next to it.
  lights.moon.style.setProperty("--near", near ? String(Math.min(1, 0.25 + (0.6 * (NEAR - away)) / (NEAR - 1))) : "0");
  lights.moon_sign.toggleAttribute("data-on", near);
}

// The Moon shining strongly, with its sign, its flags and the stars behind it.
async function moonShines() {
  for (const part of ["moon", "moon_sign", "moon_flags", "moon_stars"]) {
    lights[part].dataset.shine = "";
  }
  sounds.good();
  await wait(2600);
  for (const part of ["moon", "moon_sign", "moon_flags", "moon_stars"]) {
    delete lights[part].dataset.shine;
  }
}

async function roll() {
  if (busy) {
    return;
  }
  busy = true;
  die.disabled = true;
  const rolled = 1 + Math.floor(Math.random() * 6);
  sounds.dice();
  const shuffle = setInterval(() => (die.textContent = String(1 + Math.floor(Math.random() * 6))), 80);
  await wait(900);
  clearInterval(shuffle);
  die.textContent = String(rolled);
  const goal = places.length - 1;
  let direction = 1;
  for (let step = 0; step < rolled; step += 1) {
    if (place === goal) {
      direction = -1; // too far: back from the Moon
      sounds.bounce();
    }
    place += direction;
    put();
    sounds.hop();
    await wait(STEP_MS);
  }
  if (place === goal) {
    await arrive();
  }
  die.textContent = "🎲";
  die.disabled = false;
  busy = false;
}

// At the Moon for good: it shines strongly (before the celebration, in the game).
async function arrive() {
  if (!switches.arrive.checked) {
    return;
  }
  await moonShines();
}

// The last galaxy: the token on it, the trail lights up towards the Moon, then the Moon.
async function lastGalaxy() {
  if (busy || !switches.trail.checked) {
    return;
  }
  busy = true;
  place = 25;
  put();
  await wait(600);
  sounds.fly();
  lights.trail.dataset.on = "";
  await wait(1400);
  await moonShines();
  delete lights.trail.dataset.on;
  busy = false;
}
