// The board: its picture, the tokens on their places, the positions, the avatars.

import { shine as shineOn, react as reactOn } from "../effects/pieces.js";
import { send } from "../effects/trips.js";
import { silvered } from "../moon.js";
import { music, sounds } from "../sounds.js";
import { showLights } from "./lights.js";
import { isNearTheMoon, placeName, ranking } from "./rules.js";
import { elementsOf } from "./dom.js";
import { currentPlayer, game, pack } from "./state.js";
import { MOOD_MS, SHINE_MS, STAR_MS, clock } from "./timing.js";

const dom = elementsOf({
  board: "board",
  image: "board-image",
  marks: "marks",
  tokens: "tokens",
  rolled: "die-number",
  ranking: "ranking",
});

export const BOARD_ASPECT = 9 / 16; // the board is 16:9: its height over its width

// Where the effects put what they leave on the board: under the tokens (swirls, beams,
// clouds, fires) or over them (sparkles, a flying star).
export const under = (element) => dom.tokens.before(element);
export const over = (element) => dom.tokens.after(element);

// A player's token on the board (none while the tokens are not drawn).
export function tokenOf(player) {
  return dom.tokens.children[game.players.indexOf(player)];
}

// Where each token sits when several share a square, in token sizes from the centre.
const TOKEN_MAX = 4.2; // % of the board's width
const TOKEN_SHARE = 0.65; // of the usual distance between two squares (see sizeTokens)
const SHARED_SQUARE_OFFSETS = [
  [0, 0],
  [-0.45, -0.35],
  [0.45, -0.35],
  [-0.45, 0.35],
  [0.45, 0.35],
  [0, 0.8],
];

// The board's picture; if it cannot be loaded, a plain board with these places instead
// (renderPlainBoard).
export function showBoardPicture(url, places) {
  dom.image.addEventListener("error", () => {
    dom.image.hidden = true;
    renderPlainBoard(places);
  });
  dom.image.src = url;
  dom.image.hidden = false;
}

// Something more on the board, over everything (the rocket of the start).
export function addToBoard(element) {
  dom.board.append(element);
}

// The tokens in a moment of the game (see game.css): "calling" (whose turn it is jumps),
// "rolling" (the same while the die rolls), "changing" (between two turns: no halo),
// "look" ("Sabelotodo": everybody stands out).
export function markTokens(moment, on) {
  dom.tokens.toggleAttribute(`data-${moment}`, on);
}

// The number the die gave, big in the middle of the board, in the player's colour; null
// hides it.
export function showRolled(number, color) {
  if (number === null) {
    dom.rolled.hidden = true;
    return;
  }
  dom.rolled.style.setProperty("--player-color", color);
  dom.rolled.textContent = String(number);
  dom.rolled.hidden = false;
}

export function showRanking(shown) {
  dom.ranking.hidden = !shown;
}

// After anything moves: every token on its place, the positions, the board's lights and
// the music (tenser near the Moon). `flying`: the player (or players) moving to another
// square in one go, with a slower move.
export function renderTokens({ flying = [] } = {}) {
  const current = currentPlayer();
  const someoneWon = game.players.some((player) => player.place === pack.goal);
  drawTokens(game.players, {
    places: pack.places,
    goal: pack.goal,
    waitingPlace: pack.waitingPlace,
    current,
    halo: someoneWon ? null : current,
    flying: [flying].flat(),
  });
  drawRanking(game.players, { current, goal: pack.goal });
  showLights();
  music.tense(game.players.some((player) => isNearTheMoon(player.place, pack.goal)));
}

// Draws the tokens from what it is given, nothing else. `places`, `goal`, `waitingPlace`:
// the board's; `current`: who is on the start (the others there wait aside, at
// waitingPlace); `halo`: who has the turn's halo (or null); `flying`: who moves slowly.
// Tokens sharing a place spread out a little.
function drawTokens(players, { places, goal, waitingPlace, current, halo, flying }) {
  const byPlace = new Map();
  const tokens = players.map((player) => {
    const spot = player.place === 0 && waitingPlace && player !== current ? "waiting" : player.place;
    const sharing = byPlace.get(spot) ?? 0;
    if (!player.inRocket) {
      byPlace.set(spot, sharing + 1);
    }
    // At the start, only whose turn it is is on the start; the others wait aside.
    const [x, y] = spot === "waiting" ? waitingPlace : places[player.place];
    const [dx, dy] = SHARED_SQUARE_OFFSETS[sharing % SHARED_SQUARE_OFFSETS.length];
    const token = document.createElement("span");
    token.className = "token fx-piece";
    token.hidden = player.inRocket; // still in the rocket of the start (rocket.js)
    token.style.left = `${x}%`;
    token.style.top = `${y}%`;
    token.style.setProperty("--dx", String(dx));
    token.style.setProperty("--dy", String(dy));
    token.style.setProperty("--player-color", player.color);
    if (flying.includes(player)) {
      token.dataset.flying = ""; // a slower, longer move (see game.css)
    }
    if (player === halo) {
      token.dataset.fxHalo = ""; // whose turn it is (states.css)
    }
    if (isNearTheMoon(player.place, goal)) {
      token.dataset.fxAura = ""; // near the Moon (states.css)
    }
    const body = createAvatar(player);
    body.classList.add("fx-body"); // what grows or squashes in the effects (effects.css)
    token.append(body);
    if (player.stars > 0) {
      const badge = document.createElement("span");
      badge.className = "token__stars";
      badge.textContent = player.stars > 1 ? `⭐${player.stars}` : "⭐";
      token.append(badge);
    }
    const stars = player.stars > 0 ? `, ${player.stars} ⭐` : "";
    token.setAttribute("aria-label", `${player.name}: ${placeName(player.place, goal)}${stars}`);
    return token;
  });
  dom.tokens.replaceChildren(...tokens);
}

// The token of a player shines for a moment (landing on a galaxy): see shine in
// effects/pieces.js. Its pulse grows with it (game.css).
export async function shine(player) {
  const token = tokenOf(player);
  if (token) {
    await shineOn(token, { clock, ms: SHINE_MS });
  }
}

// A wildcard star: a big star comes from the middle of the board, spinning, to the token
// that gets it; it shines, and the star stays as its little ⭐.
export async function flyStar(player) {
  sounds.fly();
  await send("⭐", [50, 50], pack.places[player.place], { clock, ms: STAR_MS, over });
  sounds.good();
  await shine(player);
}

// A token that reacts: a hop of joy ("good") or a tremble ("bad"). Resolves when it is over.
export async function react(player, mood) {
  const token = tokenOf(player);
  if (token) {
    await reactOn(token, mood, { clock, ms: MOOD_MS });
  }
}

// Everybody in order, from the furthest on: their position (a tie shares it), avatar and
// square. The player whose turn it is stands out.
function drawRanking(players, { current, goal }) {
  const items = ranking(players).map(({ player, position: number }) => {
    const item = document.createElement("li");
    item.className = "ranking__player";
    item.style.setProperty("--player-color", player.color);
    if (player === current) {
      item.dataset.current = "";
    }
    const position = document.createElement("span");
    position.className = "ranking__position";
    position.textContent = `${number}º`;
    const place = document.createElement("span");
    place.className = "ranking__place";
    place.replaceChildren(...silvered(player.place === 0 ? "🚀" : player.place === goal ? "🌕" : String(player.place)));
    item.append(position, createAvatar(player), place);
    item.setAttribute("aria-label", `${player.name}: ${placeName(player.place, goal)}`);
    return item;
  });
  dom.ranking.replaceChildren(...items);
}

// Without the board picture: a numbered dot on every place ([x, y] in %; the last one is
// the Moon), so the game is still playable.
export function renderPlainBoard(places) {
  const goal = places.length - 1;
  const marks = places.map(([x, y], place) => {
    const mark = document.createElement("span");
    mark.className = "mark";
    mark.style.left = `${x}%`;
    mark.style.top = `${y}%`;
    mark.replaceChildren(...silvered(place === 0 ? "🚀" : place === goal ? "🌕" : String(place)));
    return mark;
  });
  dom.marks.replaceChildren(...marks);
}

// Tokens as big as the squares of this board allow: a share of the usual distance between
// two squares (boards with more, smaller squares get smaller tokens), never above 4.2%.
export function sizeTokens(places) {
  const steps = places.slice(1).map(([x, y], i) => {
    const [px, py] = places[i];
    return Math.hypot(x - px, (y - py) * BOARD_ASPECT); // in % of the board's width
  });
  steps.sort((a, b) => a - b);
  const usual = steps[Math.floor(steps.length / 2)];
  const size = Math.min(TOKEN_MAX, usual * TOKEN_SHARE);
  dom.board.style.setProperty("--token", `calc(var(--board-width) * ${(size / 100).toFixed(4)})`);
}

// A player's avatar picture, or their initial (or emoji) on their colour.
export function createAvatar(person) {
  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.setAttribute("aria-hidden", "true");
  const color = person.color ?? "#d6e4f5";
  avatar.style.setProperty("--avatar-color", color);
  // A picture: nothing behind it (see-through drawings look best); an initial: its colour, light.
  avatar.style.setProperty("--avatar-inside", person.photoUrl ? "transparent" : lighter(color));
  const initial = person.emoji ?? person.name.charAt(0).toUpperCase();
  avatar.textContent = initial;
  if (person.photoUrl) {
    const img = document.createElement("img");
    img.className = "avatar__photo";
    img.alt = "";
    img.decoding = "async";
    // A missing picture: the emoji or initial instead.
    img.addEventListener("error", () => (avatar.textContent = initial));
    img.src = person.photoUrl;
    avatar.replaceChildren(img); // drawings may be see-through: no initial behind them
  }
  return avatar;
}

// A colour (#rrggbb) mixed with white: 22% of it, the rest white.
function lighter(color) {
  const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
  return `rgb(${channels.map((value) => Math.round(255 - (255 - value) * 0.22)).join(", ")})`;
}
