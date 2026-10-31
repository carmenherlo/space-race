// The shared state of a game: what the game is made of (pack), what is going on
// (game) and the page's elements.

export const GAME_ID = new URLSearchParams(window.location.search).get("game");

export const pack = {
  title: "Space Race",
  places: [], // [x, y] in % of the board picture: the start, squares 1, 2, … and the goal
  goal: 0, // the last place: reaching it wins
  rocket: false, // a rocket brings each token to the start (rocket.js)
  // square number → { kind, emoji, title, text, goTo, move, backRoll, again, skip,
  //                   othersMove, star, swap } (see app/game.py, Square)
  squares: new Map(),
  // The modes this game has ("race", "questions"), in order, each with its
  // rules: id → { exactFinish } (true or false: fixed; null: the players choose)
  modes: new Map(),
  backwardsCounts: true, // going back lands on a square that counts (false: you just stay)
  maxStars: Infinity, // wildcard stars a player can keep at once
  voice: false, // a voice reads the cards aloud (see speak)
  questions: [], // the questions (mode "Sabelotodo"): { emoji, text, answer, wrong, note, level, topic }
  avatars: [], // the pictures players choose from: { id, url, color } (data/avatars)
};

export const game = {
  chosen: [], // the avatars (ids) that play, in turn order: the order they were tapped
  // Each avatar's name and level, also of those not playing now, so they come back next
  // time: avatar id → { name, level }
  profiles: {},
  // who plays this game, in turn order: { ...person, place, stars, skipTurns, skipSquare,
  // inRocket }
  players: [],
  turn: 0, // index in players
  busy: false, // a roll, a move or a card is in progress
  mayRoll: false, // the die is the player's (in "Sabelotodo", once the question was right)
  paused: false, // ⏸: every wait stops (see wait) until "Seguir jugando"
  // What was chosen before playing (the setup):
  mode: "race", // "race" ("Carrera") or "questions" ("Sabelotodo": a question every turn)
  exactFinish: false, // the Moon only with the exact number: overshooting bounces back
  // One shuffled deck of each for everybody (see drawFrom).
  decks: {}, // by name: "questions-easy", "questions-medium"… ({ cards, last })
  answered: null, // the question being asked: { right } once answered (see askQuestion)
};

export const elements = {
  status: document.getElementById("status"),
  board: document.getElementById("board"),
  boardImage: document.getElementById("board-image"),
  marks: document.getElementById("marks"),
  tokens: document.getElementById("tokens"),
  lights: document.getElementById("lights"),
  dieNumber: document.getElementById("die-number"),
  ranking: document.getElementById("ranking"),
  turn: document.getElementById("turn"),
  turnAvatar: document.getElementById("turn-avatar"),
  turnName: document.getElementById("turn-name"),
  die: document.getElementById("die"),
  setup: document.getElementById("setup"),
  setupTitle: document.getElementById("setup-title"),
  setupChoices: document.getElementById("setup-choices"),
  setupPlayers: document.getElementById("setup-players"),
  start: document.getElementById("start"),
  options: document.querySelectorAll("[data-option]"),
  modes: document.querySelectorAll("[data-mode]"),
  question: document.getElementById("question"),
  questionEmoji: document.getElementById("question-emoji"),
  questionText: document.getElementById("question-text"),
  questionLevel: document.getElementById("question-level"),
  questionTopic: document.getElementById("question-topic"),
  questionWho: document.getElementById("question-who"),
  questionQuiet: document.getElementById("question-quiet"),
  questionAnswers: document.getElementById("question-answers"),
  questionResult: document.getElementById("question-result"),
  questionNext: document.getElementById("question-next"),
  setupSummary: document.getElementById("setup-summary"),
  levelsInfo: document.getElementById("levels-info"),
  levelsInfoOpen: document.getElementById("levels-info-open"),
  levelsInfoClose: document.getElementById("levels-info-close"),
  levelsInfoList: document.getElementById("levels-info-list"),
  card: document.getElementById("card"),
  cardEmoji: document.getElementById("card-emoji"),
  cardTitle: document.getElementById("card-title"),
  cardText: document.getElementById("card-text"),
  cardOk: document.getElementById("card-ok"),
  turnCall: document.getElementById("turn-call"),
  turnCallAvatar: document.getElementById("turn-call-avatar"),
  turnCallTitle: document.getElementById("turn-call-title"),
  draw: document.getElementById("draw"),
  drawTitle: document.getElementById("draw-title"),
  drawPlayers: document.getElementById("draw-players"),
  minigame: document.getElementById("minigame"),
  minigameHost: document.getElementById("minigame-host"),
  minigameNext: document.getElementById("minigame-next"),
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
  pauseButton: document.getElementById("pause-button"),
  pause: document.getElementById("pause"),
  pauseResume: document.getElementById("pause-resume"),
  pauseRestart: document.getElementById("pause-restart"),
  pauseMenu: document.getElementById("pause-menu"),
  sound: document.getElementById("sound"),
  soundPanel: document.getElementById("sound-panel"),
  fullscreen: document.getElementById("fullscreen"),
  playerTemplate: document.getElementById("player-template"),
};

export function currentPlayer() {
  return game.players[game.turn];
}
