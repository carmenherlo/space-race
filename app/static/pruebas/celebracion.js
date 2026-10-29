// Celebration (celebracion.html): a test page for the ways to celebrate the winner
// (js/celebrations.js), with three players and random avatars.

import { CELEBRATIONS, celebrate } from "../js/celebrations.js";
import { randomPlayers } from "./players.js";

const choices = document.getElementById("choices");

for (const { id, title } of CELEBRATIONS) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "galaxy__button";
  button.textContent = title;
  button.addEventListener("click", async () => {
    const [winner, ...others] = await randomPlayers(["Ana", "Leo", "Mía"]);
    await celebrate(id, winner, others, "Cerrar");
  });
  choices.append(button);
}
