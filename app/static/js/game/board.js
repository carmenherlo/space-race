// The board: the turn bar, the tokens on their places, the avatars.

import { shine as shineOn, react as reactOn } from "../effects/pieces.js";
import { send } from "../effects/trips.js";
import { silvered } from "../moon.js";
import { music, sounds } from "../sounds.js";
import { nearTheMoon, showLights } from "./lights.js";
import { currentPlayer, elements, game, pack } from "./state.js";
import { MOOD_MS, SHINE_MS, STAR_MS, clock } from "./timing.js";

export const BOARD_ASPECT = 9 / 16; // the board is 16:9: its height over its width

// Where the effects put what they leave on the board: under the tokens (swirls, beams,
// clouds, fires) or over them (sparkles, a flying star).
export const under = (element) => elements.tokens.before(element);
export const over = (element) => elements.tokens.after(element);

// A player's token on the board (none while the tokens are not drawn).
export function tokenOf(player) {
  return elements.tokens.children[game.players.indexOf(player)];
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

export function renderTurn() {
  const player = currentPlayer();
  // A new avatar (with its little jump, see game.css) only when the player changes.
  if (elements.turnAvatar.dataset.player !== player.id) {
    elements.turnAvatar.dataset.player = player.id;
    elements.turnAvatar.replaceChildren(createAvatar(player));
  }
  elements.turnName.textContent = `Turno de ${player.name}`;
  elements.turnStars.textContent = "⭐".repeat(player.stars);
  elements.turnStars.hidden = player.stars === 0;
  elements.turn.style.setProperty("--player-color", player.color);
  elements.die.disabled = !game.mayRoll; // on (and calling them, game.css) only when it is theirs
  elements.die.textContent = "🎲";
  renderTokens();
}

// Every player's token on its place; tokens sharing a place spread out a little. `flying`:
// the player (or players) moving to another square in one go, with a slower move.
export function renderTokens({ flying = [] } = {}) {
  const flyingPlayers = [flying].flat();
  const byPlace = new Map();
  const tokens = game.players.map((player) => {
    const spot = player.place === 0 && pack.waitingPlace && player !== currentPlayer() ? "waiting" : player.place;
    const sharing = byPlace.get(spot) ?? 0;
    if (!player.inRocket) {
      byPlace.set(spot, sharing + 1);
    }
    // At the start, only whose turn it is is on the start; the others wait aside.
    const [x, y] = spot === "waiting" ? pack.waitingPlace : pack.places[player.place];
    const [dx, dy] = SHARED_SQUARE_OFFSETS[sharing % SHARED_SQUARE_OFFSETS.length];
    const token = document.createElement("span");
    token.className = "token";
    token.hidden = player.inRocket; // still in the rocket of the start (rocket.js)
    token.style.left = `${x}%`;
    token.style.top = `${y}%`;
    token.style.setProperty("--dx", String(dx));
    token.style.setProperty("--dy", String(dy));
    token.style.setProperty("--player-color", player.color);
    if (flyingPlayers.includes(player)) {
      token.dataset.flying = ""; // a slower, longer move (see game.css)
    }
    if (player === currentPlayer() && !game.players.some((p) => p.place === pack.goal)) {
      token.dataset.current = "";
    }
    if (nearTheMoon(player)) {
      token.dataset.near = "";
    }
    token.append(createAvatar(player));
    if (player.stars > 0) {
      const badge = document.createElement("span");
      badge.className = "token__stars";
      badge.textContent = player.stars > 1 ? `⭐${player.stars}` : "⭐";
      token.append(badge);
    }
    const stars = player.stars > 0 ? `, ${player.stars} ⭐` : "";
    token.setAttribute("aria-label", `${player.name}: ${placeName(player.place)}${stars}`);
    return token;
  });
  elements.tokens.replaceChildren(...tokens);
  renderRanking();
  showLights();
  music.tense(game.players.some(nearTheMoon));
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
function renderRanking() {
  const ranked = [...game.players].sort((a, b) => b.place - a.place); // a tie keeps the turn order
  const items = ranked.map((player) => {
    const item = document.createElement("li");
    item.className = "ranking__player";
    item.style.setProperty("--player-color", player.color);
    if (player === currentPlayer()) {
      item.dataset.current = "";
    }
    const position = document.createElement("span");
    position.className = "ranking__position";
    position.textContent = `${ranked.findIndex((other) => other.place === player.place) + 1}º`;
    const place = document.createElement("span");
    place.className = "ranking__place";
    place.replaceChildren(...silvered(player.place === 0 ? "🚀" : player.place === pack.goal ? "🌕" : String(player.place)));
    item.append(position, createAvatar(player), place);
    item.setAttribute("aria-label", `${player.name}: ${placeName(player.place)}`);
    return item;
  });
  elements.ranking.replaceChildren(...items);
}

// Without the board picture: a numbered dot on every place, so the game is still playable.
export function renderPlainBoard() {
  const marks = pack.places.map(([x, y], place) => {
    const mark = document.createElement("span");
    mark.className = "mark";
    mark.style.left = `${x}%`;
    mark.style.top = `${y}%`;
    mark.replaceChildren(...silvered(place === 0 ? "🚀" : place === pack.goal ? "🌕" : String(place)));
    return mark;
  });
  elements.marks.replaceChildren(...marks);
}

// Tokens as big as the squares of this board allow: a share of the usual distance between
// two squares (boards with more, smaller squares get smaller tokens), never above 4.2%.
export function sizeTokens() {
  const steps = pack.places.slice(1).map(([x, y], i) => {
    const [px, py] = pack.places[i];
    return Math.hypot(x - px, (y - py) * BOARD_ASPECT); // in % of the board's width
  });
  steps.sort((a, b) => a - b);
  const usual = steps[Math.floor(steps.length / 2)];
  const size = Math.min(TOKEN_MAX, usual * TOKEN_SHARE);
  elements.board.style.setProperty("--token", `calc(var(--board-width) * ${(size / 100).toFixed(4)})`);
}

export function placeName(place) {
  return place === 0 ? "en la salida" : place === pack.goal ? "en la Luna" : `casilla ${place}`;
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
