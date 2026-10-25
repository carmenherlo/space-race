// Space Race: a board game for family and friends, on its own page (game.html).
// Everybody plays on this tablet, taking turns. The first one to reach the Moon wins.
// "Carrera" (and "Retos locos"): roll the die and do what your square says (UFOs, galaxies,
// a black hole…); in "Retos locos", a turn that ends further on brings a funny challenge.
// "Sabelotodo": first a question of your level; right, roll and move (the squares do
// nothing); wrong, you stay where you are.
// Nothing is saved on the server: a game lasts while the page is open. Only the setup (how
// many play, their avatars, names and levels, the mode) is remembered on this device.
//
// This file is only the engine: turns, the die, moving the tokens and showing the cards.
// What each game is made of comes from its folder (data/games/<id>/game.yaml, served by
// api/games/<id>, checked by app/game.py): the board picture, where the places are, what
// happens on the special squares, its rules and cards. The game comes in the address
// (game.html?game=space-race-expanded, from games.html); the avatars, from api/avatars.

import { setUpSoundPanel } from "./sound-panel.js";
import { music, sounds } from "./sounds.js";
import { quiet, say } from "./voice.js";

// ---------- The game pack ----------

const GAME_ID = new URLSearchParams(window.location.search).get("game");

const pack = {
  title: "Space Race",
  places: [], // [x, y] in % of the board picture: the start, squares 1, 2, … and the goal
  goal: 0, // the last place: reaching it wins
  // square number → { kind, emoji, title, text, goTo, move, backRoll, again, skip,
  //                   othersMove, star, starSaves, swap } (see app/game.py, Square)
  squares: new Map(),
  modes: [], // "race", "challenges", "questions": the ones this game has
  exactFinish: null, // true or false: fixed by the game; null: the players choose
  backwardsCounts: true, // going back lands on a square that counts (false: you just stay)
  voice: false, // a voice reads the cards aloud (see speak)
  challenges: [], // funny things to do (mode "Retos locos"): { kind, emoji, text }
  questions: [], // space questions (mode "Sabelotodo"): { kind, emoji, text, answer, wrong, note }
  avatars: [], // the pictures players choose from: { id, url } (data/games/players)
};

// ---------- Players ----------

const MAX_PLAYERS = 6;
// Each seat's colour (the ring of their avatar, their token and turn), in turn order.
const PLAYER_COLORS = ["#c3a6ff", "#8fd3c7", "#ffb4a2", "#ffe08a", "#9cc7ff", "#f5a3d0"];
// The setup, remembered on this device for the next game (see saveSetup).
const SETUP_KEY = "space-race:setup";

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

// ---------- Cards ----------

// Levels of the questions (mode "Sabelotodo"), shown as stars.
const LEVELS = ["very_easy", "easy", "medium", "hard"];
const LEVEL_STARS = { very_easy: "⭐", easy: "⭐⭐", medium: "⭐⭐⭐", hard: "⭐⭐⭐⭐" };
const LEVEL_NAMES = { very_easy: "muy fácil", easy: "fácil", medium: "medio", hard: "difícil" };
// "very_easy" questions are true or false: these two answers, in this order, with a hand
// for those who cannot read yet.
const TRUE_FALSE = [
  { answer: "Verdadero", icon: "👍" },
  { answer: "Falso", icon: "👎" },
];

const CARD_TITLES = { good: "¡Qué suerte!", bad: "¡Oh, no!", challenge: "¡Reto!" };
const CARD_BUTTONS = { good: "¡Bien!", bad: "Vale…", challenge: "¡Hecho!" };

// ---------- Timing ----------

const DIE_ROLL_MS = 900; // the die keeps changing before it stops
const STEP_MS = 280; // a token hops one square
const FLIGHT_MS = 900; // a token flies to another square (keep in sync with game.css)
const LAND_PAUSE_MS = 900; // the token rests on its square before a card shows, to see where
const IDLE_MS = 10 * 60 * 1000; // back to the home screen after 10 minutes untouched

// ---------- State ----------

const game = {
  count: 2, // how many play (1 to MAX_PLAYERS)
  // Every seat, also those not playing now, so their choices come back: { avatar, name, level }
  seats: [],
  // who plays this game, in turn order: { ...person, place, stars, skipTurns, skipSquare }
  players: [],
  turn: 0, // index in players
  busy: false, // a roll, a move or a card is in progress
  // Before the first turn, who starts: each player in `rolling` (indexes in players) taps
  // the die; the highest starts, ties roll again (see rollForStart). null once decided.
  opening: null, // { rolling, rolls: Map index → roll }
  mayRoll: false, // "Sabelotodo": the question was right, the die is the player's
  // What was chosen before playing (the setup):
  mode: "challenges", // the end of each turn: "race" (nothing), "challenges" or "questions"
  exactFinish: false, // the Moon only with the exact number: overshooting bounces back
  // One shuffled deck of each for everybody (see drawFrom).
  decks: {}, // by name: "challenges", "questions-easy", "questions-medium"… ({ cards, last })
  answered: null, // the question being asked: { right } once answered (see askQuestion)
};

const elements = {
  status: document.getElementById("status"),
  board: document.getElementById("board"),
  boardImage: document.getElementById("board-image"),
  marks: document.getElementById("marks"),
  tokens: document.getElementById("tokens"),
  turn: document.getElementById("turn"),
  turnAvatar: document.getElementById("turn-avatar"),
  turnName: document.getElementById("turn-name"),
  die: document.getElementById("die"),
  setup: document.getElementById("setup"),
  setupTitle: document.getElementById("setup-title"),
  setupCount: document.getElementById("setup-count"),
  setupPlayers: document.getElementById("setup-players"),
  avatars: document.getElementById("avatars"),
  avatarsList: document.getElementById("avatars-list"),
  avatarsClose: document.getElementById("avatars-close"),
  start: document.getElementById("start"),
  options: document.querySelectorAll("[data-option]"),
  modes: document.querySelectorAll("[data-mode]"),
  question: document.getElementById("question"),
  questionEmoji: document.getElementById("question-emoji"),
  questionText: document.getElementById("question-text"),
  questionLevel: document.getElementById("question-level"),
  questionAnswers: document.getElementById("question-answers"),
  questionResult: document.getElementById("question-result"),
  questionNext: document.getElementById("question-next"),
  setupSummary: document.getElementById("setup-summary"),
  card: document.getElementById("card"),
  cardEmoji: document.getElementById("card-emoji"),
  cardTitle: document.getElementById("card-title"),
  cardText: document.getElementById("card-text"),
  cardOk: document.getElementById("card-ok"),
  winner: document.getElementById("winner"),
  winnerAvatar: document.getElementById("winner-avatar"),
  winnerTitle: document.getElementById("winner-title"),
  turnStars: document.getElementById("turn-stars"),
  starOffer: document.getElementById("star-offer"),
  starOfferEmoji: document.getElementById("star-offer-emoji"),
  starOfferTitle: document.getElementById("star-offer-title"),
  starOfferText: document.getElementById("star-offer-text"),
  starOfferStars: document.getElementById("star-offer-stars"),
  starUse: document.getElementById("star-use"),
  starKeep: document.getElementById("star-keep"),
  modeSection: document.getElementById("setup-mode"),
  swap: document.getElementById("swap"),
  swapEmoji: document.getElementById("swap-emoji"),
  swapTitle: document.getElementById("swap-title"),
  swapText: document.getElementById("swap-text"),
  swapPlayers: document.getElementById("swap-players"),
  swapNone: document.getElementById("swap-none"),
  exactOption: document.querySelector('[data-option="exactFinish"]'),
  again: document.getElementById("again"),
  exit: document.getElementById("exit"),
  leave: document.getElementById("leave"),
  leaveStay: document.getElementById("leave-stay"),
  sound: document.getElementById("sound"),
  soundPanel: document.getElementById("sound-panel"),
  playerTemplate: document.getElementById("player-template"),
};

// ---------- Setup: who plays ----------

function showSetup() {
  renderCount();
  renderSeats();
  elements.setup.showModal();
}

// 1 to 6 buttons: how many play.
function renderCount() {
  const buttons = Array.from({ length: MAX_PLAYERS }, (_, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "setup__number";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(i + 1 === game.count));
    button.textContent = String(i + 1);
    button.addEventListener("click", () => {
      game.count = i + 1;
      giveAvatars();
      saveSetup();
      renderCount();
      renderSeats();
      renderSummary();
    });
    return button;
  });
  elements.setupCount.replaceChildren(...buttons);
}

// One row per player: their avatar (a tap changes it), their name (optional) and their stars.
function renderSeats() {
  const items = game.seats.slice(0, game.count).map((seat, index) => {
    const person = seatPerson(index);
    const node = elements.playerTemplate.content.firstElementChild.cloneNode(true);
    const button = node.querySelector(".setup__player");
    button.setAttribute("aria-label", `Elegir el avatar de ${person.name}`);
    button.disabled = pack.avatars.length === 0;
    node.querySelector(".setup__avatar").replaceChildren(createAvatar(person));
    button.addEventListener("click", () => chooseAvatar(index));
    const name = node.querySelector(".setup__name");
    name.value = seat.name;
    name.placeholder = defaultName(index);
    name.setAttribute("aria-label", `Nombre del jugador ${index + 1}`);
    name.addEventListener("input", () => {
      seat.name = name.value;
      saveSetup();
    });
    const level = node.querySelector(".setup__level");
    renderLevel(level, person);
    level.addEventListener("click", () => {
      // ⭐ → ⭐⭐ → ⭐⭐⭐ → ⭐⭐⭐⭐ → ⭐ …
      seat.level = LEVELS[(LEVELS.indexOf(seat.level) + 1) % LEVELS.length];
      saveSetup();
      renderLevel(level, seatPerson(index));
    });
    return node;
  });
  elements.setupPlayers.replaceChildren(...items);
}

function renderLevel(button, person) {
  button.textContent = LEVEL_STARS[person.level];
  button.setAttribute("aria-label", `Preguntas de nivel ${LEVEL_NAMES[person.level]} para ${person.name}`);
}

// The avatars to choose from: the ones another player has are greyed out.
function chooseAvatar(index) {
  const taken = new Set(game.seats.slice(0, game.count).map((seat) => seat.avatar));
  const buttons = pack.avatars.map((avatar) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "avatars__option";
    button.setAttribute("aria-pressed", String(avatar.id === game.seats[index].avatar));
    button.disabled = taken.has(avatar.id) && avatar.id !== game.seats[index].avatar;
    button.append(createAvatar({ name: avatar.id, color: PLAYER_COLORS[index], photoUrl: avatar.url }));
    button.addEventListener("click", () => {
      game.seats[index].avatar = avatar.id;
      saveSetup();
      elements.avatars.close();
      renderSeats();
    });
    return button;
  });
  elements.avatarsList.replaceChildren(...buttons);
  elements.avatars.showModal();
}

function defaultName(index) {
  return `Jugador ${index + 1}`;
}

// A seat as a player: their name (or "Jugador 2"), colour, avatar and level.
function seatPerson(index) {
  const seat = game.seats[index];
  return {
    id: `player-${index + 1}`,
    name: seat.name.trim() || defaultName(index),
    color: PLAYER_COLORS[index],
    photoUrl: pack.avatars.find((avatar) => avatar.id === seat.avatar)?.url ?? null,
    level: seat.level,
  };
}

// Every playing seat without an avatar (or with one that is gone) gets the first one nobody
// has. With more players than avatars, the rest show their initial on their colour.
function giveAvatars() {
  const ids = pack.avatars.map((avatar) => avatar.id);
  const playing = game.seats.slice(0, game.count);
  const used = new Set();
  for (const seat of playing) {
    if (!ids.includes(seat.avatar) || used.has(seat.avatar)) {
      seat.avatar = null;
    }
    used.add(seat.avatar);
  }
  for (const seat of playing.filter((s) => s.avatar === null)) {
    seat.avatar = ids.find((id) => !used.has(id)) ?? null;
    used.add(seat.avatar);
  }
}

// ---------- Setup: remembered on this device ----------

// The last setup (or the usual one: 2 players, easy questions), checked so an old or
// broken one never stops the game.
function loadSetup() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(SETUP_KEY)) ?? {};
  } catch {
    saved = {}; // private mode or a broken value: start from the usual one
  }
  const count = Number(saved.count);
  game.count = Number.isInteger(count) && count >= 1 && count <= MAX_PLAYERS ? count : 2;
  const seats = Array.isArray(saved.seats) ? saved.seats : [];
  game.seats = Array.from({ length: MAX_PLAYERS }, (_, i) => ({
    avatar: typeof seats[i]?.avatar === "string" ? seats[i].avatar : null,
    name: typeof seats[i]?.name === "string" ? seats[i].name.slice(0, 14) : "",
    level: LEVELS.includes(seats[i]?.level) ? seats[i].level : "easy",
  }));
  return { mode: saved.mode };
}

function saveSetup() {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify({ count: game.count, seats: game.seats, mode: chosenMode() }));
  } catch {
    // private mode: nothing is remembered, the game still works
  }
}

// ---------- Setup: the mode and the rules ----------

function chosenMode() {
  return document.querySelector('[data-mode][aria-checked="true"]')?.dataset.mode;
}

function selectMode(chosen) {
  for (const mode of elements.modes) {
    mode.setAttribute("aria-checked", String(mode === chosen));
  }
  elements.setup.dataset.mode = chosen.dataset.mode; // the stars show only in "Sabelotodo"
  renderSummary();
  saveSetup();
}

function optionIsOn(name) {
  const option = document.querySelector(`[data-option="${name}"]`);
  return option.getAttribute("aria-checked") === "true";
}

function toggleOption(option) {
  const on = option.getAttribute("aria-checked") !== "true";
  option.setAttribute("aria-checked", String(on));
  renderSummary();
}

// How a turn goes, in a few words, with the mode and the rules chosen.
function renderSummary() {
  const mode = chosenMode();
  const moon = exactFinish()
    ? "🌕 Gana quien llega a la Luna con el número justo."
    : "🌕 Gana el primero que llega a la Luna.";
  if (mode === "questions") {
    elements.setupSummary.textContent = [
      "🧠 En tu turno, una pregunta de tu nivel: si aciertas, tiras el dado y avanzas; si fallas, te quedas donde estás.",
      "Las casillas especiales no hacen nada.",
      moon,
    ].join(" ");
    return;
  }
  const parts = game.count > 1 ? ["🎲 Primero, todos tiran: empieza quien saque más."] : [];
  parts.push("🎲 Tiras y haces lo que dice tu casilla.");
  if (mode === "challenges") {
    parts.push("🎭 Si acabas más adelante de donde empezaste, ¡reto!");
  }
  const toTheMoon = [...pack.squares.values()].some((square) => square.goTo === pack.goal);
  parts.push(
    toTheMoon
      ? "🌌 Las galaxias te llevan a la siguiente galaxia, y la última ¡a la Luna!"
      : "🌌 Las galaxias te llevan a la siguiente galaxia.",
  );
  if ([...pack.squares.values()].some((square) => square.star)) {
    parts.push("⭐ La estrella comodín te libra de una casilla mala.");
  }
  parts.push(moon);
  elements.setupSummary.textContent = parts.join(" ");
}

// The exact finish: fixed by the game, or chosen with its switch.
function exactFinish() {
  return pack.exactFinish ?? optionIsOn("exactFinish");
}

// Only the modes and options of this game, starting with the mode chosen last time if this
// game has it. With a single mode and nothing to choose, the whole "3. Modo de juego"
// section goes away.
function setUpRules(savedMode) {
  for (const mode of elements.modes) {
    mode.hidden = !pack.modes.includes(mode.dataset.mode);
  }
  const visible = [...elements.modes].filter((mode) => !mode.hidden);
  selectMode(visible.find((mode) => mode.dataset.mode === savedMode) ?? visible.find((mode) => mode.dataset.mode === chosenMode()) ?? visible[0]);
  elements.exactOption.hidden = pack.exactFinish !== null;
  elements.modeSection.hidden = pack.modes.length === 1 && pack.exactFinish !== null;
  renderSummary();
}

function chosenPlayers() {
  return game.seats.slice(0, game.count).map((_, index) => seatPerson(index));
}

function startGame(players) {
  music.start(); // after a tap ("¡A jugar!"), so the browser allows it
  game.players = players.map((person) => ({
    ...person,
    place: 0,
    stars: 0, // wildcard stars ⭐ (see useStar)
    skipTurns: 0, // turns still to miss
    skipSquare: null, // the square that made them miss turns
  }));
  game.decks = {};
  game.mode = chosenMode();
  game.exactFinish = exactFinish();
  game.turn = 0;
  game.busy = false;
  elements.setup.close();
  elements.winner.close();
  elements.turn.hidden = false;
  game.opening = null;
  game.mayRoll = false;
  renderTokens();
  if (game.mode === "questions") {
    renderTurn(); // the first player starts
    askTurnQuestion();
  } else if (game.players.length > 1) {
    startOpening(game.players.map((_, index) => index));
  } else {
    renderTurn(); // playing alone: nothing to decide
  }
}

// ---------- Who starts ----------

function startOpening(rolling) {
  game.opening = { rolling, rolls: new Map() };
  showOpeningTurn(rolling[0]);
}

// The die is this player's, to roll for who starts.
function showOpeningTurn(index) {
  game.turn = index;
  game.busy = false;
  renderTurn();
  elements.turnName.textContent = `${currentPlayer().name}: tira para ver quién empieza`;
}

// One roll for who starts. When everybody in this round has rolled: the highest starts;
// a tie at the top, only those tied roll again.
async function rollForStart() {
  if (game.busy) {
    return;
  }
  game.busy = true;
  const { rolling, rolls } = game.opening;
  rolls.set(game.turn, await rollDie());
  await wait(LAND_PAUSE_MS); // first see the number
  const next = rolling.find((index) => !rolls.has(index));
  if (next !== undefined) {
    showOpeningTurn(next);
    return;
  }
  const best = Math.max(...rolls.values());
  const tied = rolling.filter((index) => rolls.get(index) === best);
  const results = rolling.map((index) => `${game.players[index].name} ha sacado un ${rolls.get(index)}.`).join(" ");
  if (tied.length > 1) {
    await showCard({
      kind: "challenge",
      emoji: "🎲",
      title: "¡Empate!",
      text: `${results} ${listOfNames(tied)} volvéis a tirar.`,
      button: "¡Otra vez!",
    });
    startOpening(tied);
    return;
  }
  const first = game.players[tied[0]];
  await showCard({ kind: "good", emoji: "🚀", title: `¡Empieza ${first.name}!`, text: results, button: "¡Vamos!" });
  game.opening = null;
  game.turn = tied[0];
  game.busy = false;
  renderTurn();
}

// "Ana", "Ana y Luis", "Ana, Luis y Sara".
function listOfNames(indexes) {
  const names = indexes.map((index) => game.players[index].name);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names.at(-1)}` : names[0];
}

function tapDie() {
  if (game.opening) {
    rollForStart();
  } else if (game.mode === "questions") {
    rollAfterQuestion();
  } else {
    playTurn();
  }
}

// ---------- A turn in "Sabelotodo" ----------

// The turn starts with a question of the player's level, by itself. Right: the die is
// theirs (see rollAfterQuestion). Wrong: they stay where they are, next player.
async function askTurnQuestion() {
  game.busy = true;
  elements.die.disabled = true;
  await wait(700); // a moment to see whose turn it is
  const player = currentPlayer();
  if (!(await askQuestion(drawQuestion(player.level)))) {
    nextTurn();
    return;
  }
  game.mayRoll = true;
  game.busy = false;
  elements.die.disabled = false;
  elements.turnName.textContent = `${player.name}: ¡tira el dado!`;
}

// Roll and move; the squares do nothing here (only the exact finish at the Moon).
async function rollAfterQuestion() {
  if (game.busy || !game.mayRoll) {
    return;
  }
  game.busy = true;
  game.mayRoll = false;
  const player = currentPlayer();
  const bounced = await moveBy(player, await rollDie());
  if (player.place === pack.goal) {
    showWinner(player);
    return;
  }
  if (bounced) {
    await wait(LAND_PAUSE_MS);
    await showBounce(bounced);
  }
  nextTurn();
}

// ---------- A turn ----------

async function playTurn() {
  if (game.busy) {
    return;
  }
  game.busy = true;
  const player = currentPlayer();

  const startedAt = player.place; // the challenge depends on where the turn ends up
  const roll = await rollDie();
  const bounced = await moveBy(player, roll);
  if (player.place === pack.goal) {
    showWinner(player);
    return;
  }
  if (bounced) {
    await wait(LAND_PAUSE_MS);
    await showBounce(bounced);
    if (!pack.backwardsCounts) {
      nextTurn(); // where the bounce leaves you does nothing
      return;
    }
  }

  // 1. The square the die landed on.
  const outcome = await landOn(player);
  if (player.place === pack.goal) {
    showWinner(player);
    return;
  }
  if (outcome.again) {
    game.busy = false; // same player, a new roll
    renderTurn();
    return;
  }
  // A turn that ends level or further back, or a punishment: no challenge.
  if (player.place <= startedAt || outcome.punished) {
    nextTurn();
    return;
  }

  // 2. The end of the turn: a challenge in "Retos locos" (nothing after a punishment).
  if (game.mode === "challenges") {
    await wait(LAND_PAUSE_MS); // first see where the turn ended
    await showCard(drawFrom("challenges"));
  }
  nextTurn();
}

function showBounce(bounced) {
  return showCard({
    kind: "bad",
    emoji: "🌕",
    title: "¡Rebote lunar!",
    text: `¡Casi! Te has pasado de la Luna y rebotas ${bounced} ${bounced === 1 ? "casilla" : "casillas"} hacia atrás. Hay que llegar con el número justo.`,
  });
}

// Does what the square a player has just reached WITH THE DIE says. Only die landings count:
// where a trip sends you (UFOs, galaxies, the satellite) does nothing, so they never loop.
// The meteorites make you roll the die again (backwards); the square that roll lands on
// counts too, unless the game says going back does nothing (backwardsCounts). Returns
// { again, punished } (roll again; a punishment or a star used: no challenge after it).
async function landOn(player) {
  const square = pack.squares.get(player.place);
  if (!square) {
    return { again: false, punished: false };
  }
  await wait(LAND_PAUSE_MS); // first see where the token landed
  const others = game.players.filter((p) => p !== player);
  if (square.starSaves && player.stars > 0) {
    if (await offerStar(player, square)) {
      return { again: false, punished: true }; // saved: you stay here and the turn ends
    }
  } else if (square.swap && others.length > 0) {
    const other = await chooseSwap(player, square, others);
    if (other) {
      await swapPlaces(player, other); // where they land does nothing, for either of them
    }
    return { again: square.again, punished: false };
  } else {
    await showCard(square);
  }
  const outcome = { again: square.again, punished: square.skip > 0 };
  if (square.star) {
    player.stars += 1;
    renderTurn();
  }
  if (square.skip > 0) {
    player.skipTurns = square.skip;
    player.skipSquare = square;
  }
  if (square.othersMove) {
    for (const other of game.players.filter((p) => p !== player)) {
      await moveBy(other, square.othersMove); // not a die landing: their squares do nothing
    }
  }
  if (square.goTo !== undefined) {
    await jumpTo(player, square.goTo);
  } else if (square.move) {
    await moveBy(player, square.move);
  } else if (square.backRoll) {
    await moveBy(player, -(await rollDie()));
    if (pack.backwardsCounts) {
      const next = await landOn(player); // a die landing: its square counts
      outcome.again = outcome.again || next.again;
      outcome.punished = outcome.punished || next.punished;
    }
  }
  return outcome;
}

// A player with a wildcard star landed on a square it saves them from: they choose.
// Resolves to true if they used it (one star less, and nothing happens).
function offerStar(player, square) {
  elements.starOfferEmoji.textContent = square.emoji;
  elements.starOfferTitle.textContent = square.title;
  elements.starOfferText.textContent = square.text;
  elements.starOfferStars.textContent = `${player.name}, tienes ${"⭐".repeat(player.stars)}. ¿Usas una estrella para librarte?`;
  sounds.bad();
  elements.starOffer.showModal();
  const stars = player.stars === 1 ? "una estrella" : `${player.stars} estrellas`;
  speak([square.title, square.text, `${player.name}, tienes ${stars}. ¿Usas una para librarte?`]);
  return new Promise((resolve) => {
    elements.starOffer.addEventListener(
      "close",
      () => {
        const used = elements.starOffer.returnValue === "use";
        if (used) {
          player.stars -= 1;
          sounds.good();
          renderTurn();
        }
        resolve(used);
      },
      { once: true },
    );
  });
}

// The spy satellite: the player sees where everybody is and taps who to swap places with,
// or stays. Resolves to the chosen player, or null.
function chooseSwap(player, square, others) {
  elements.swapEmoji.textContent = square.emoji;
  elements.swapTitle.textContent = square.title;
  elements.swapText.textContent = square.text;
  const buttons = others.map((other) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swap__player";
    const name = document.createElement("span");
    name.className = "swap__name";
    name.textContent = other.name;
    const place = document.createElement("span");
    place.className = "swap__place";
    place.textContent = placeName(other.place);
    button.append(createAvatar(other), name, place);
    button.addEventListener("click", () => {
      elements.swap.returnValue = other.id;
      elements.swap.close(other.id);
    });
    return button;
  });
  elements.swapPlayers.replaceChildren(...buttons);
  sounds.good();
  elements.swap.returnValue = "";
  elements.swap.showModal();
  speak([square.title, square.text, "¿Con quién te cambias?"]);
  return new Promise((resolve) => {
    elements.swap.addEventListener(
      "close",
      () => resolve(others.find((other) => other.id === elements.swap.returnValue) ?? null),
      { once: true },
    );
  });
}

// Two tokens fly to each other's place at the same time.
async function swapPlaces(player, other) {
  sounds.fly();
  [player.place, other.place] = [other.place, player.place];
  renderTokens({ flying: [player, other] });
  await wait(FLIGHT_MS);
}

function nextTurn() {
  game.turn = (game.turn + 1) % game.players.length;
  game.busy = false;
  renderTurn();
  if (game.mode === "questions") {
    askTurnQuestion();
  } else if (currentPlayer().skipTurns > 0) {
    missTurn();
  }
}

// A player who must miss this turn (the party, the space station…): the card comes by
// itself, with the die off, and then it is the next player's turn. Nobody has to tap the
// die for nothing.
async function missTurn() {
  game.busy = true;
  elements.die.disabled = true;
  const player = currentPlayer();
  player.skipTurns -= 1;
  const square = player.skipSquare;
  const left = player.skipTurns > 0 ? ` Le queda ${player.skipTurns} ${player.skipTurns === 1 ? "turno" : "turnos"} más.` : "";
  await wait(700); // a moment to see whose turn it is
  await showCard({
    kind: "bad",
    emoji: square.emoji,
    title: square.title,
    text: `${player.name} sigue allí y pierde este turno.${left}`,
  });
  nextTurn();
}

function currentPlayer() {
  return game.players[game.turn];
}

// The die shows random numbers for a moment, then stops on the roll (1 to 6).
function rollDie() {
  const roll = 1 + Math.floor(Math.random() * 6);
  sounds.dice();
  elements.die.disabled = true;
  elements.die.dataset.rolling = "";
  const shuffle = setInterval(() => {
    elements.die.textContent = String(1 + Math.floor(Math.random() * 6));
  }, 80);
  return new Promise((resolve) => {
    setTimeout(() => {
      clearInterval(shuffle);
      delete elements.die.dataset.rolling;
      elements.die.textContent = String(roll);
      resolve(roll);
    }, DIE_ROLL_MS);
  });
}

// Flies a token straight to another square (UFOs, galaxies, the black hole…).
async function jumpTo(player, place) {
  sounds.fly();
  player.place = place;
  renderTokens({ flying: player });
  await wait(FLIGHT_MS);
}

// The next card of a deck everybody shares ("challenges" or "questions"): none repeats
// until all have come out. An empty deck is shuffled again, never starting with the card
// that just came out.
function drawFrom(name, cards = pack[name]) {
  game.decks[name] = game.decks[name] ?? { cards: [], last: null };
  const deck = game.decks[name];
  if (deck.cards.length === 0) {
    deck.cards = shuffled(cards);
    if (deck.cards.length > 1 && deck.cards[0] === deck.last) {
      deck.cards.push(deck.cards.shift());
    }
  }
  deck.last = deck.cards.shift();
  return deck.last;
}

// A shuffled copy of a list (Fisher–Yates: every order equally likely).
function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Moves a token one square at a time (backwards for a negative number), never before
// the start. At the Moon it stops, or, with the exact finish, it bounces back what is
// left (like the Game of the Goose). Returns how many squares it bounced back (0 if none).
async function moveBy(player, steps) {
  let direction = Math.sign(steps);
  let bounced = 0;
  for (let left = Math.abs(steps); left > 0; left -= 1) {
    if (direction > 0 && player.place === pack.goal) {
      if (!game.exactFinish) {
        break;
      }
      direction = -1;
      sounds.bounce();
    }
    if (direction < 0 && player.place === 0) {
      break;
    }
    player.place += direction;
    if (direction < 0 && steps > 0) {
      bounced += 1;
    }
    sounds.hop();
    renderTokens();
    await wait(STEP_MS);
  }
  return bounced;
}

// ---------- Cards and the winner ----------

function showCard(card) {
  elements.card.dataset.kind = card.kind;
  elements.cardEmoji.textContent = card.emoji;
  elements.cardTitle.textContent = card.title ?? CARD_TITLES[card.kind];
  elements.cardText.textContent = card.text;
  elements.cardOk.textContent = card.button ?? CARD_BUTTONS[card.kind];
  sounds[card.kind](); // good, bad or challenge
  elements.card.showModal();
  speak([elements.cardTitle.textContent, card.text]);
  return new Promise((resolve) => {
    elements.card.addEventListener("close", resolve, { once: true });
  });
}

// A question of the player's level, from that level's deck (all the questions if the pack
// has none of that level).
function drawQuestion(level) {
  const ofLevel = pack.questions.filter((question) => question.level === level);
  return ofLevel.length
    ? drawFrom(`questions-${level}`, ofLevel)
    : drawFrom("questions-any", pack.questions);
}

// A question with its four answers in a new order each time. The player taps one; the game
// marks it (and the right one) and waits for "continue". Resolves to true if it was right.
function askQuestion(question) {
  elements.questionLevel.textContent = LEVEL_STARS[question.level];
  elements.questionLevel.setAttribute("aria-label", `Nivel ${LEVEL_NAMES[question.level]}`);
  elements.questionEmoji.textContent = question.emoji;
  elements.questionText.textContent = question.text;
  // True or false: always "Verdadero", "Falso". The others: four answers, shuffled.
  const trueFalse = question.level === "very_easy";
  const options = trueFalse
    ? TRUE_FALSE
    : shuffled([question.answer, ...question.wrong]).map((answer) => ({ answer }));
  const answers = options.map(({ answer, icon }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer";
    button.dataset.answer = answer;
    button.textContent = icon ? `${icon} ${answer}` : answer;
    button.addEventListener("click", () => chooseAnswer(question, button));
    return button;
  });
  elements.questionAnswers.replaceChildren(...answers);
  elements.questionAnswers.dataset.kind = trueFalse ? "true-false" : "choice";
  elements.questionResult.hidden = true;
  elements.questionNext.hidden = true;
  delete elements.question.dataset.result; // nothing answered yet
  sounds.challenge();
  elements.question.showModal();
  // The question, then each answer in the order they are on the screen, with a pause
  // between them.
  speak(trueFalse ? [question.text, "¿Verdadero o falso?"] : [question.text, ...options.map(({ answer }) => answer)]);
  return new Promise((resolve) => {
    elements.question.addEventListener(
      "close",
      () => resolve(elements.question.dataset.result === "right"),
      { once: true },
    );
  });
}

function chooseAnswer(question, chosen) {
  const right = chosen.dataset.answer === question.answer;
  for (const button of elements.questionAnswers.children) {
    button.disabled = true; // one try
    if (button.dataset.answer === question.answer) {
      button.dataset.result = "right";
    }
  }
  if (!right) {
    chosen.dataset.result = "wrong";
  }
  elements.question.dataset.result = right ? "right" : "wrong";
  const verdict = right ? "¡Correcto! 🎉" : `¡Casi! Era: ${question.answer}.`;
  elements.questionResult.textContent = question.note ? `${verdict} ${question.note}` : verdict;
  elements.questionResult.hidden = false;
  elements.questionNext.textContent = right ? "¡A tirar el dado!" : "Vale";
  elements.questionNext.hidden = false;
  speak(question.note ? [verdict, question.note] : verdict);
  if (right) {
    sounds.good();
  } else {
    sounds.bad();
  }
}

function showWinner(player) {
  elements.turn.hidden = true;
  elements.winnerAvatar.replaceChildren(createAvatar(player));
  elements.winnerTitle.textContent = `¡${player.name} ha llegado a la Luna! 🌕`;
  sounds.win();
  elements.winner.showModal();
  speak(elements.winnerTitle.textContent);
}

// ---------- Rendering ----------

function renderTurn() {
  const player = currentPlayer();
  elements.turnAvatar.replaceChildren(createAvatar(player));
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
function renderTokens({ flying = [] } = {}) {
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
function renderPlainBoard() {
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
function sizeTokens() {
  const steps = pack.places.slice(1).map(([x, y], i) => {
    const [px, py] = pack.places[i];
    return Math.hypot(x - px, ((y - py) * 9) / 16); // in % of the board's width
  });
  steps.sort((a, b) => a - b);
  const usual = steps[Math.floor(steps.length / 2)];
  const size = Math.min(TOKEN_MAX, usual * TOKEN_SHARE);
  elements.board.style.setProperty("--token", `calc(var(--board-width) * ${(size / 100).toFixed(4)})`);
}

function placeName(place) {
  return place === 0 ? "en la salida" : place === pack.goal ? "en la Luna" : `casilla ${place}`;
}

// A player's avatar picture, or their initial (or emoji) on their colour.
function createAvatar(person) {
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

// ---------- Leaving ----------

// In the middle of a game, 🏠 asks first: the game is not saved. Before it starts or
// once someone has reached the Moon, it just leaves.
function tapExit(event) {
  const playing = game.players.length > 0 && !game.players.some((p) => p.place === pack.goal);
  if (playing) {
    event.preventDefault();
    elements.leave.showModal();
  }
}

// ---------- Small helpers ----------

// Reads a text aloud, or its parts with a pause between them (see voice.js), in the games
// that have a voice (game.yaml "voice"). It stops when the card closes (see init) or the
// sound is turned off.
function speak(text) {
  if (pack.voice) {
    say(text);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showStatus(message, error) {
  if (error) {
    console.error(error);
  }
  elements.status.textContent = message ?? "";
  elements.status.hidden = !message;
}

// Back to the games menu after a long time without touches.
let idleTimer = null;
function restartIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => window.location.assign("./"), IDLE_MS);
}

// ---------- Loading the game pack ----------

// Fills `pack` from api/games/<id> and shows the board picture (or a plain board without one).
async function loadPack() {
  const response = await fetch(`api/games/${encodeURIComponent(GAME_ID)}`, { cache: "no-store" });
  if (!response.ok) {
    const reason =
      response.status === 404
        ? `No existe el juego "${GAME_ID}" (falta data/games/${GAME_ID}/game.yaml).`
        : response.status === 503
          ? `El juego tiene un error en data/games/${GAME_ID}/game.yaml (los detalles salen en el registro del servidor).`
          : "No se ha podido cargar el juego.";
    throw new Error(reason);
  }
  const content = await response.json();
  pack.title = content.title;
  pack.places = content.places;
  pack.goal = content.places.length - 1;
  sizeTokens();
  pack.squares = new Map(
    Object.entries(content.squares).map(([number, square]) => [
      Number(number),
      {
        kind: square.kind,
        emoji: square.emoji,
        title: square.title,
        text: square.text,
        goTo: square.go_to ?? undefined,
        move: square.move ?? undefined,
        backRoll: square.back_roll,
        again: square.again,
        skip: square.skip, // turns to miss
        othersMove: square.others_move ?? undefined,
        star: square.star,
        starSaves: square.star_saves,
        swap: square.swap,
      },
    ]),
  );
  pack.modes = content.modes;
  pack.exactFinish = content.exact_finish;
  pack.backwardsCounts = content.backwards_counts;
  pack.voice = content.voice;
  pack.challenges = content.challenges.map((challenge) => ({ kind: "challenge", ...challenge }));
  pack.questions = content.questions.map((question) => ({ kind: "question", ...question }));

  document.title = pack.title;
  elements.setupTitle.textContent = `🚀 ${pack.title}`;
  if (content.image_url) {
    elements.boardImage.addEventListener("error", () => {
      elements.boardImage.hidden = true;
      renderPlainBoard();
    });
    elements.boardImage.src = content.image_url;
    elements.boardImage.hidden = false;
  } else {
    renderPlainBoard();
  }
}

// ---------- Start ----------

async function init() {
  elements.die.addEventListener("click", tapDie);
  elements.start.addEventListener("click", () => startGame(chosenPlayers()));
  for (const option of elements.options) {
    option.addEventListener("click", () => toggleOption(option));
  }
  for (const mode of elements.modes) {
    mode.addEventListener("click", () => selectMode(mode));
  }
  elements.questionNext.addEventListener("click", () => elements.question.close());
  elements.avatarsClose.addEventListener("click", () => elements.avatars.close());
  elements.again.addEventListener("click", () => startGame(game.players));
  elements.cardOk.addEventListener("click", () => elements.card.close());
  elements.starUse.addEventListener("click", () => elements.starOffer.close("use"));
  elements.starKeep.addEventListener("click", () => elements.starOffer.close("keep"));
  elements.swapNone.addEventListener("click", () => elements.swap.close(""));
  elements.exit.addEventListener("click", tapExit);
  elements.leaveStay.addEventListener("click", () => elements.leave.close());
  // The voice stops with its card, and when leaving the page.
  for (const dialog of [elements.card, elements.question, elements.starOffer, elements.swap, elements.winner]) {
    dialog.addEventListener("close", quiet);
  }
  window.addEventListener("pagehide", quiet);

  // The setup and the cards wait for their button: Escape does not skip them.
  for (const dialog of [elements.setup, elements.card, elements.question, elements.winner, elements.starOffer, elements.swap]) {
    dialog.addEventListener("cancel", (event) => event.preventDefault());
  }
  for (const type of ["pointerdown", "keydown"]) {
    document.addEventListener(type, restartIdleTimer, { capture: true, passive: true });
  }
  restartIdleTimer();

  if (!GAME_ID) {
    window.location.replace("games.html"); // no game chosen: choose one
    return;
  }
  try {
    await loadPack();
  } catch (error) {
    showStatus(error.message, error);
    return;
  }
  const saved = loadSetup();
  setUpRules(saved.mode);
  // 🔊: music, effects and, in a game with a voice, the voice (see sound-panel.js).
  setUpSoundPanel(elements.sound, elements.soundPanel, { voice: pack.voice });

  try {
    const response = await fetch("api/avatars", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    pack.avatars = await response.json();
  } catch (error) {
    showStatus("No se han podido cargar los avatares.", error);
  }
  giveAvatars();
  showSetup();
}

init();
