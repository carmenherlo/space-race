// Space Race: a board game for family and friends, on its own page (game.html).
// Everybody plays on this tablet, taking turns. The first one to reach the Moon wins.
// "Carrera": roll the die and do what your square says (UFOs, galaxies, a black hole…).
// "Sabelotodo": first a question of your level; right, roll and do what your square says;
// wrong, you stay where you are. In both, a draw decides the order of the turns.
// Nothing is saved on the server: a game lasts while the page is open. Only the setup (how
// many play, their avatars, names and levels, the mode) is remembered on this device.
//
// This file only starts the page. The engine is in game/, one module per part:
//   state.js     the shared data: pack (the game), game (what is going on)
//   pack.js      loading the game pack        setup.js   before playing: players, mode
//   turns.js     start, turn order, next turn roll.js    a roll, the same in every mode
//   questions.js "Sabelotodo": its questions  squares.js what the special squares do
//   moves.js     the die and the tokens       cards.js   cards, star, satellite, winner
//   board.js     drawing the board            turn-bar.js whose turn it is, the die
//   lights.js    the board's lights           rocket.js  the rocket of the start
//   pause.js     ⏸, restart, menu, idle timer timing.js  how long things take (keep)
//   helpers.js   voice, shuffle, status       dom.js     finding a part's elements
// Each part of the screen finds only its own elements (dom.js) and sets up its own buttons.
// What each game is made of comes from its folder (content/games/<id>/game.yaml, served by
// api/games/<id>, checked by app/game.py): the board picture, where the places are, what
// happens on the special squares, its rules and cards. The game comes in the address
// (game.html?game=space-race-expanded, from games.html); the avatars, from api/avatars.

import { setUpFullscreen } from "./fullscreen.js";
import { setUpSoundPanel } from "./sound-panel.js";
import { music } from "./sounds.js";
import { quiet } from "./voice.js";
import { setUpCards } from "./game/cards.js";
import { elementsOf } from "./game/dom.js";
import { showStatus } from "./game/helpers.js";
import { loadPack } from "./game/pack.js";
import { restartIdleTimer, setUpPause } from "./game/pause.js";
import { setUpQuestions } from "./game/questions.js";
import { chosenPlayers, loadSetup, loadSharedProfiles, setUpRules, setUpSetupScreen, showSetup } from "./game/setup.js";
import { GAME_ID, game, pack } from "./game/state.js";
import { roll } from "./game/roll.js";
import { setUpTurnBar } from "./game/turn-bar.js";
import { startGame } from "./game/turns.js";

const dom = elementsOf({ sound: "sound", soundPanel: "sound-panel", fullscreen: "fullscreen" });

async function init() {
  setUpTurnBar({ onRoll: roll });
  setUpSetupScreen({ onStart: startGame });
  setUpQuestions();
  setUpCards();
  setUpPause();
  window.addEventListener("pagehide", quiet); // the voice stops when leaving the page
  // The music from the menu on. Browsers allow sound only after a tap: some count the tap
  // that chose the game (it plays now); others wait for the first tap on this page.
  music.start();
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
  setUpSoundPanel(dom.sound, dom.soundPanel, { voice: pack.voice });
  setUpFullscreen(dom.fullscreen);

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
  await loadSharedProfiles();
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
