// The last galaxy (galaxia.html): a test page for its minigames (js/minigames.js), with a
// random avatar as the token. Nothing here touches a game: it is only to try them out.

import { flyToTheMoon, playMinigame } from "../js/minigames.js";
import { randomPlayers } from "./players.js";

const host = document.getElementById("minigame");
const again = document.getElementById("again");
let avatar = null;

again.addEventListener("click", play);
start();

async function start() {
  [{ avatar }] = await randomPlayers(["Tú"]);
  play();
}

async function play() {
  again.hidden = true;
  if (await playMinigame(host, avatar)) {
    await flyToTheMoon(avatar);
  }
  again.hidden = false;
}
