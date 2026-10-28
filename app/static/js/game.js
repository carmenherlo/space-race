// Space Race: a board game for family and friends, on its own page (game.html).
// Everybody plays on this tablet, taking turns. The first one to reach the Moon wins.
// "Carrera" (and "Retos locos"): roll the die and do what your square says (UFOs, galaxies,
// a black hole…); in "Retos locos", a turn that ends further on brings a funny challenge.
// "Sabelotodo": first a question of your level; right, roll and move (the squares do
// nothing); wrong, you stay where you are. In both, a draw decides the order of the turns.
// Nothing is saved on the server: a game lasts while the page is open. Only the setup (how
// many play, their avatars, names and levels, the mode) is remembered on this device.
//
// This file only starts the page. The engine is in game/, one module per part:
//   state.js     the shared state: pack (the game), game (what is going on), elements
//   pack.js      loading the game pack        setup.js   before playing: players, mode
//   turns.js     start, turn order, next turn race.js    a turn in "Carrera"/"Retos locos"
//   questions.js "Sabelotodo" and its turn    squares.js what the special squares do
//   moves.js     the die and the tokens       cards.js   cards, star, satellite, winner
//   board.js     drawing the board            pause.js   ⏸, restart, menu, idle timer
//   timing.js    how long things take (keep)  helpers.js voice, shuffle, status
// What each game is made of comes from its folder (data/games/<id>/game.yaml, served by
// api/games/<id>, checked by app/game.py): the board picture, where the places are, what
// happens on the special squares, its rules and cards. The game comes in the address
// (game.html?game=space-race-expanded, from games.html); the avatars, from api/avatars.

import { setUpSoundPanel } from "./sound-panel.js";
import { music } from "./sounds.js";
import { quiet } from "./voice.js";
import { showStatus } from "./game/helpers.js";
import { loadPack } from "./game/pack.js";
import { backToMenu, pauseGame, restartGame, restartIdleTimer, resumeGame } from "./game/pause.js";
import { chosenPlayers, loadSetup, selectMode, setUpRules, showSetup, toggleOption } from "./game/setup.js";
import { GAME_ID, elements, game, pack } from "./game/state.js";
import { startGame, tapDie } from "./game/turns.js";

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
  elements.again.addEventListener("click", () => startGame(game.players));
  elements.cardOk.addEventListener("click", () => elements.card.close());
  elements.starUse.addEventListener("click", () => elements.starOffer.close("use"));
  elements.starKeep.addEventListener("click", () => elements.starOffer.close("keep"));
  elements.swapNone.addEventListener("click", () => elements.swap.close(""));
  elements.pauseButton.addEventListener("click", pauseGame);
  elements.pauseResume.addEventListener("click", resumeGame);
  elements.pauseRestart.addEventListener("click", restartGame);
  elements.pauseMenu.addEventListener("click", backToMenu);
  elements.pause.addEventListener("cancel", (event) => {
    event.preventDefault();
    resumeGame(); // Escape: go on playing
  });
  // The voice stops with its card, and when leaving the page.
  for (const dialog of [elements.card, elements.question, elements.starOffer, elements.swap, elements.winner]) {
    dialog.addEventListener("close", quiet);
  }
  window.addEventListener("pagehide", quiet);

  // The setup and the cards wait for their button: Escape does not skip them.
  for (const dialog of [elements.setup, elements.card, elements.question, elements.winner, elements.starOffer, elements.swap]) {
    dialog.addEventListener("cancel", (event) => event.preventDefault());
  }
  // The music from the menu on: browsers only allow sound after a first tap.
  document.addEventListener("pointerdown", () => music.start(), { once: true });
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
  const saved = loadSetup();
  setUpRules(saved.mode);
  const params = new URLSearchParams(window.location.search);
  if (params.has("start") && game.chosen.length > 0) {
    // "Empezar de nuevo": the same players, straight to the board.
    params.delete("start");
    history.replaceState(null, "", `game.html?${params}`);
    startGame(chosenPlayers());
    return;
  }
  showSetup();
}

init();
