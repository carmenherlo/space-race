// The last galaxy (galaxia.html): a test page for its minigames (js/minigames.js), with a
// random avatar as the token. Nothing here touches a game: it is only to try them out.

import { flyToTheMoon, playMinigame } from "./minigames.js";

const host = document.getElementById("minigame");
const again = document.getElementById("again");
let avatar = null;

again.addEventListener("click", play);
start();

async function start() {
  avatar = await randomAvatar();
  play();
}

async function play() {
  again.hidden = true;
  if (await playMinigame(host, avatar)) {
    await flyToTheMoon(avatar);
  }
  again.hidden = false;
}

// A random avatar from api/avatars (or none: a rocket instead).
async function randomAvatar() {
  try {
    const avatars = await (await fetch("api/avatars", { cache: "no-store" })).json();
    const chosen = avatars[Math.floor(Math.random() * avatars.length)];
    const circle = document.createElement("span");
    circle.className = "avatar";
    circle.style.setProperty("--avatar-color", chosen.color ?? "#d6e4f5");
    circle.style.setProperty("--avatar-inside", "transparent");
    const img = document.createElement("img");
    img.className = "avatar__photo";
    img.alt = "";
    img.src = chosen.url;
    circle.append(img);
    return circle;
  } catch {
    return null;
  }
}
