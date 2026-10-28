// The board: the turn bar, the tokens on their places, the avatars.

import { currentPlayer, elements, game, pack } from "./state.js";

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
  elements.die.disabled = false;
  elements.die.textContent = "🎲";
  renderTokens();
}

// Every player's token on its place; tokens sharing a place spread out a little. `flying`:
// the player (or players) moving to another square in one go, with a slower move.
export function renderTokens({ flying = [] } = {}) {
  const flyingPlayers = [flying].flat();
  const byPlace = new Map();
  const tokens = game.players.map((player) => {
    const sharing = byPlace.get(player.place) ?? 0;
    byPlace.set(player.place, sharing + 1);
    const [x, y] = pack.places[player.place];
    const [dx, dy] = SHARED_SQUARE_OFFSETS[sharing % SHARED_SQUARE_OFFSETS.length];
    const token = document.createElement("span");
    token.className = "token";
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
}

// Without the board picture: a numbered dot on every place, so the game is still playable.
export function renderPlainBoard() {
  const marks = pack.places.map(([x, y], place) => {
    const mark = document.createElement("span");
    mark.className = "mark";
    mark.style.left = `${x}%`;
    mark.style.top = `${y}%`;
    mark.textContent = place === 0 ? "🚀" : place === pack.goal ? "🌕" : String(place);
    return mark;
  });
  elements.marks.replaceChildren(...marks);
}

// Tokens as big as the squares of this board allow: a share of the usual distance between
// two squares (boards with more, smaller squares get smaller tokens), never above 4.2%.
export function sizeTokens() {
  const steps = pack.places.slice(1).map(([x, y], i) => {
    const [px, py] = pack.places[i];
    return Math.hypot(x - px, ((y - py) * 9) / 16); // in % of the board's width
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
  avatar.style.setProperty("--avatar-color", person.color ?? "#d6e4f5");
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
