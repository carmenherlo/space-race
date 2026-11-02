// The shared data of a game: what the game is made of (pack) and what is going on (game).
// No page here: each part of the screen finds its own elements (see dom.js).

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
  playing: false, // the board is in play (the turn bar shows): the square of whose turn it is lights up
  // What was chosen before playing (the setup):
  mode: "race", // "race" ("Carrera") or "questions" ("Sabelotodo": a question every turn)
  exactFinish: false, // the Moon only with the exact number: overshooting bounces back
  // One shuffled deck of each for everybody (see drawFrom).
  decks: {}, // by name: "questions-easy", "questions-medium"… ({ cards, last })
  answered: null, // the question being asked: { right } once answered (see askQuestion)
};

export function currentPlayer() {
  return game.players[game.turn];
}
