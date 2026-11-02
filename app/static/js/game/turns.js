// The game from start to end: who starts, whose turn it is, missed turns.

import { music, sounds } from "../sounds.js";
import { createAvatar, markTokens, renderTokens, showRanking } from "./board.js";
import { showCard } from "./cards.js";
import { speak } from "./helpers.js";
import { askTurnQuestion } from "./questions.js";
import { bringFromTheRocket } from "./rocket.js";
import { shuffled } from "./rules.js";
import { chosenMode, closeSetup, exactFinish } from "./setup.js";
import { elementsOf } from "./dom.js";
import { currentPlayer, game, pack } from "./state.js";
import { DRAW_SHOW_MS, DRAW_SHUFFLES, DRAW_SHUFFLE_MS, START_PAUSE_MS, TOKEN_CALL_MS, TURN_CALL_MS, TURN_PAUSE_MS, TURN_START_MS, wait } from "./timing.js";
import { allowRoll, changingTurn, renderTurn, resetTurnBar, showTurnBar } from "./turn-bar.js";

const dom = elementsOf({
  draw: "draw",
  drawTitle: "draw-title",
  drawPlayers: "draw-players",
  turnCall: "turn-call",
  turnCallAvatar: "turn-call-avatar",
  turnCallTitle: "turn-call-title",
});

export async function startGame(players) {
  music.start(); // after a tap ("¡A jugar!"), so the browser allows it
  // In the order of the draw (see drawOrder), shown before the board.
  game.players = shuffled(players).map((person) => ({
    ...person,
    place: 0,
    stars: 0, // wildcard stars ⭐ (see useStar)
    skipTurns: 0, // turns still to miss
    skipSquare: null, // the square that made them miss turns
    inRocket: pack.rocket, // waiting in the rocket of the start, not on the board yet
  }));
  game.decks = {};
  game.mode = chosenMode();
  game.exactFinish = exactFinish();
  game.turn = 0;
  game.busy = false;
  closeSetup();
  resetTurnBar();
  game.mayRoll = false;
  game.busy = true; // nothing to tap yet
  if (game.players.length > 1) {
    await drawOrder(); // playing alone: nothing to decide
  }
  renderTokens();
  await wait(START_PAUSE_MS); // first, the board with everybody at the start (or in the rocket)
  await bringFromTheRocket(currentPlayer());
  game.busy = false;
  game.playing = true;
  showTurnBar(true);
  showRanking(true);
  beginFirstTurn();
}

// The first turn, once who starts is decided.
function beginFirstTurn() {
  callToken();
  renderTurn();
  beginTurn();
}

// The only thing the modes do differently: when the die is the player's. "Carrera": at once.
// "Sabelotodo": after a right answer (askTurnQuestion). The roll is the same (roll.js).
function beginTurn() {
  if (game.mode === "questions") {
    askTurnQuestion();
  } else {
    game.mayRoll = true;
    allowRoll(true);
  }
}

// The order of the turns, drawn by itself (game.players is already in that order): the
// avatars change places a few times, then stay in order, 1st, 2nd… Nobody taps anything.
async function drawOrder() {
  dom.drawTitle.textContent = "🎲 ¿Quién empieza?";
  dom.draw.show();
  for (let i = 0; i < DRAW_SHUFFLES; i += 1) {
    renderDraw(shuffled(game.players), false);
    sounds.hop();
    await wait(DRAW_SHUFFLE_MS);
  }
  renderDraw(game.players, true);
  dom.drawTitle.textContent = `¡Empieza ${game.players[0].name}!`;
  sounds.good();
  speak(dom.drawTitle.textContent);
  await wait(DRAW_SHOW_MS);
  dom.draw.close();
}

function renderDraw(players, final) {
  dom.drawPlayers.dataset.final = String(final);
  dom.drawPlayers.replaceChildren(
    ...players.map((player, index) => {
      const item = document.createElement("li");
      item.className = "draw__player";
      const number = document.createElement("span");
      number.className = "draw__number";
      number.textContent = final ? `${index + 1}º` : "?";
      const name = document.createElement("span");
      name.className = "draw__name";
      name.textContent = player.name;
      item.append(number, createAvatar(player), name);
      return item;
    }),
  );
}

export async function nextTurn() {
  await passTurnTo((game.turn + 1) % game.players.length);
  if (currentPlayer().skipTurns > 0) {
    missTurn(); // in every mode: no die, and no question either
  } else {
    beginTurn();
  }
}

// A player who must miss this turn (the party, the space station…): the card comes by
// itself, with the die off, and then it is the next player's turn. Nobody has to tap the
// die for nothing.
async function missTurn() {
  game.busy = true;
  allowRoll(false);
  const player = currentPlayer();
  player.skipTurns -= 1;
  const square = player.skipSquare;
  const left = player.skipTurns > 0 ? ` Le queda ${player.skipTurns} ${player.skipTurns === 1 ? "turno" : "turnos"} más.` : "";
  await wait(TURN_START_MS);
  await showCard({
    kind: "bad",
    emoji: square.emoji,
    title: square.title,
    text: `${player.name} sigue allí y pierde este turno.${left}`,
  });
  nextTurn();
}

// The turn passes in two beats, so it shows: the turn bar (and the glow) goes away for a
// moment, then comes back with that player's avatar.
async function passTurnTo(index) {
  game.busy = true;
  allowRoll(false);
  changingTurn(true);
  markTokens("changing", true);
  await wait(TURN_PAUSE_MS);
  game.turn = index;
  await bringFromTheRocket(currentPlayer());
  markTokens("changing", false);
  callToken();
  renderTurn();
  changingTurn(false);
  await callTurn(currentPlayer());
  game.busy = false;
}

// So nobody wonders whose turn it is: their avatar and "¡Te toca, …!", big, and the voice
// says it. Playing alone, it is always yours: nothing to say.
async function callTurn(player) {
  if (game.players.length === 1) {
    return;
  }
  dom.turnCall.style.setProperty("--player-color", player.color);
  dom.turnCallAvatar.replaceChildren(createAvatar(player));
  dom.turnCallTitle.textContent = `¡Te toca, ${player.name}!`;
  sounds.hop();
  speak(dom.turnCallTitle.textContent);
  dom.turnCall.show();
  await wait(TURN_CALL_MS);
  dom.turnCall.close();
}

// The token of the player whose turn it is jumps twice, so everybody sees whose it is.
function callToken() {
  markTokens("calling", true);
  setTimeout(() => markTokens("calling", false), TOKEN_CALL_MS);
}
