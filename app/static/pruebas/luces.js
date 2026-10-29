// Lights on the board (luces.html): a test page for lights on the board's own drawings, on
// the short board with a token (its die moves it; at the Moon only with the exact number,
// else it bounces back). Each light can be switched off:
//   Título      the title "SPACE RACE" glows, very softly, breathing slowly;
//   Start       "Start here" lights up and beats while the token is at the start;
//   Estela      the last galaxy (button): the star trail lights up towards the Moon, then
//               the Moon shines;
//   Luna llega  the Moon shines strongly when the token gets there (with no bounce);
//   Luna cerca  the Moon glows softly when the token is close, more the closer it is.
// The shapes come from the board picture itself: in an area, the pixels of that drawing (by
// their colour). Nothing here touches a game: it is only to try them out.

import { sounds } from "../js/sounds.js";
import { randomPlayers } from "./players.js";

const STEP_MS = 480; // a step, as in the game
const NEAR = 6; // "Luna cerca": from this many squares away
// The drawings, on the short board's picture (1920×1080): their area, and which of its
// pixels belong to them.
const MOON = { x: 1744, y: 903, radius: 152 };
const DRAWINGS = {
  title: { area: [370, 70, 1560, 215], is: (r, g, b) => (r + g + b) / 3 > 150 && g - r > 25 },
  start: { area: [80, 280, 300, 430], is: (r, g, b) => (r + g + b) / 3 > 150 && g - r > 25 },
  // The trail's stars: bluish, not on a square (squares picture) nor the Moon or its flags.
  trail: {
    area: [1300, 620, 1660, 920],
    is: (r, g, b, x, y, square) =>
      (r + g + b) / 3 > 140 && b - r > 12 && !square && (x - MOON.x) ** 2 + (y - MOON.y) ** 2 >= 160 ** 2 && !(x > 1570 && y < 780),
  },
  moon: {
    area: [MOON.x - MOON.radius, MOON.y - MOON.radius, MOON.x + MOON.radius, MOON.y + MOON.radius],
    is: (r, g, b, x, y) => (x - MOON.x) ** 2 + (y - MOON.y) ** 2 < MOON.radius ** 2,
  },
};

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
const lights = {}; // drawing → its light on the board
const token = document.createElement("span");
token.className = "dice-test__token";

start();

async function start() {
  const game = await (await fetch("../api/games/space-race", { cache: "no-store" })).json();
  const boardUrl = `../${game.image_url}`;
  document.getElementById("board-image").src = boardUrl;
  places = game.places;
  const boardPixels = await pixelsOf(boardUrl);
  const squaresPixels = game.squares_image_url ? await pixelsOf(`../${game.squares_image_url}`) : null;
  for (const [name, drawing] of Object.entries(DRAWINGS)) {
    lights[name] = light(name, shapeOf(drawing, boardPixels, squaresPixels), boardUrl);
    board.append(lights[name]);
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
  const near = switches.near.checked && place > 0 && away > 0 && away <= NEAR;
  lights.moon.toggleAttribute("data-near", near);
  // Closer, brighter: from a glimmer six squares away to a glow next to it.
  lights.moon.style.setProperty("--near", near ? String(0.25 + (0.6 * (NEAR - away)) / (NEAR - 1)) : "0");
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
  lights.moon.dataset.arrive = "";
  sounds.good();
  await wait(2600);
  delete lights.moon.dataset.arrive;
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
  lights.moon.dataset.arrive = "";
  sounds.good();
  await wait(2600);
  delete lights.moon.dataset.arrive;
  delete lights.trail.dataset.on;
  busy = false;
}

// A light: the board's own picture of a drawing, brighter, cut out with its shape; its
// glow comes from the wrapper (see luces.css).
function light(name, shape, boardUrl) {
  const piece = document.createElement("span");
  piece.className = "lights__piece";
  piece.dataset.kind = name;
  for (const side of ["left", "top", "width", "height"]) {
    piece.style[side] = `${shape[side]}%`;
  }
  const picture = document.createElement("span");
  picture.className = "lights__picture";
  picture.style.backgroundImage = `url("${boardUrl}")`;
  picture.style.backgroundSize = `${10000 / shape.width}% ${10000 / shape.height}%`;
  picture.style.backgroundPosition = `${(shape.left / (100 - shape.width)) * 100}% ${(shape.top / (100 - shape.height)) * 100}%`;
  picture.style.webkitMaskImage = `url("${shape.mask}")`;
  picture.style.maskImage = `url("${shape.mask}")`;
  piece.append(picture);
  return piece;
}

// A drawing's shape: in its area, its pixels; in % of the board, with a mask picture.
function shapeOf({ area: [left, top, right, bottom], is }, boardPixels, squaresPixels) {
  const { width, height, data } = boardPixels;
  const mask = document.createElement("canvas");
  mask.width = right - left;
  mask.height = bottom - top;
  const context = mask.getContext("2d");
  const shape = context.createImageData(mask.width, mask.height);
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const i = (y * width + x) * 4;
      const square = squaresPixels ? squaresPixels.data[i + 3] > 20 : false;
      if (is(data[i], data[i + 1], data[i + 2], x, y, square)) {
        shape.data[((y - top) * mask.width + (x - left)) * 4 + 3] = 255;
      }
    }
  }
  context.putImageData(shape, 0, 0);
  return {
    left: (left / width) * 100,
    top: (top / height) * 100,
    width: (mask.width / width) * 100,
    height: (mask.height / height) * 100,
    mask: mask.toDataURL(),
  };
}

async function pixelsOf(src) {
  const image = new Image();
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}
