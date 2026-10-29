// Celebration (celebracion.html): a test page for the ways to celebrate the winner
// (js/celebrations.js), with three random avatars as the players.

import { CELEBRATIONS, celebrate } from "./celebrations.js";

const choices = document.getElementById("choices");
const NAMES = ["Ana", "Leo", "Mía"];

for (const { id, title } of CELEBRATIONS) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "galaxy__button";
  button.textContent = title;
  button.addEventListener("click", async () => {
    const [winner, ...others] = await randomPlayers();
    await celebrate(id, winner, others, "Cerrar");
  });
  choices.append(button);
}

// Three players with random avatars from api/avatars (initials if there are none).
async function randomPlayers() {
  let avatars = [];
  try {
    avatars = await (await fetch("api/avatars", { cache: "no-store" })).json();
  } catch {
    // no avatars: initials
  }
  const shuffled = [...avatars].sort(() => Math.random() - 0.5);
  return NAMES.map((name, index) => ({ name, avatar: avatarOf(shuffled[index], name) }));
}

function avatarOf(avatar, name) {
  const circle = document.createElement("span");
  circle.className = "avatar";
  circle.style.setProperty("--avatar-color", avatar?.color ?? "#c3a6ff");
  circle.style.setProperty("--avatar-inside", "#ffffff");
  if (avatar) {
    const img = document.createElement("img");
    img.className = "avatar__photo";
    img.alt = "";
    img.src = avatar.url;
    circle.append(img);
  } else {
    circle.textContent = name.charAt(0);
  }
  return circle;
}
