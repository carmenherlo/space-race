// Ways to celebrate the winner, over the whole screen, to try out (celebracion.html) before
// one goes into the game. 🌕 Luna brillante: the winner on a big shining Moon, fireworks
// around it. 🎆 Fuegos artificiales: the winner in the middle, fireworks all over and a
// rain of stars. 🏆 Podio: the winner on top, the others below, confetti falling.
// Their look is in css/celebrations.css.

import { party } from "./sounds.js";

export const CELEBRATIONS = [
  { id: "moon", title: "🌕 Luna brillante" },
  { id: "fireworks", title: "🎆 Fuegos artificiales" },
  { id: "podium", title: "🏆 Podio" },
];

const COLORS = ["#ffd60a", "#ff6fa8", "#1abc9c", "#1e90ff", "#b57edc", "#ff8c1a", "#ffffff"];
const BURST_PIECES = 18;

// Shows one: `winner` and `others` (2nd, 3rd…) are { name, avatar } (an .avatar element).
// Resolves when the button is tapped (`button`: its text).
export function celebrate(id, winner, others = [], button = "¡Otra partida!") {
  const screen = document.createElement("div");
  screen.className = "party";
  screen.dataset.kind = id;
  const title = document.createElement("p");
  title.className = "party__title";
  title.textContent = `¡${winner.name} ha llegado a la Luna!`;
  const ok = document.createElement("button");
  ok.type = "button";
  ok.className = "party__ok";
  ok.textContent = button;

  const timers = [];
  const every = (ms, action) => timers.push(setInterval(action, ms));
  if (id === "moon") {
    const moon = document.createElement("span");
    moon.className = "party__moon";
    moon.textContent = "🌕";
    screen.append(moon, seat(winner, "party__winner"));
    // Around the Moon, one burst after another.
    every(650, () => {
      const angle = Math.random() * Math.PI * 2;
      burst(screen, 50 + Math.cos(angle) * 34, 42 + Math.sin(angle) * 34);
    });
  } else if (id === "fireworks") {
    screen.append(seat(winner, "party__winner"));
    every(450, () => burst(screen, 10 + Math.random() * 80, 8 + Math.random() * 55));
    every(160, () => fall(screen, "party__star", Math.random() < 0.5 ? "⭐" : "✨"));
  } else {
    screen.append(podium(winner, others));
    every(70, () => fall(screen, "party__confetti", ""));
    every(1100, () => burst(screen, 20 + Math.random() * 60, 12 + Math.random() * 20));
  }
  screen.append(title, ok);
  document.body.append(screen);
  party.tune();
  timers.push(setInterval(() => party.tune(), 4500)); // again and again, while it lasts

  return new Promise((resolve) => {
    ok.addEventListener("click", () => {
      timers.forEach(clearInterval);
      screen.remove();
      resolve();
    }, { once: true });
  });
}

// A player's avatar, in a box of this class.
function seat(player, className) {
  const box = document.createElement("span");
  box.className = className;
  box.append(player.avatar.cloneNode(true));
  return box;
}

// 🏆 The winner on the highest step; the 2nd on their left, the 3rd on their right.
function podium(winner, others) {
  const box = document.createElement("div");
  box.className = "podium";
  const places = [
    { player: others[0], place: 2 },
    { player: winner, place: 1 },
    { player: others[1], place: 3 },
  ];
  for (const { player, place } of places) {
    const column = document.createElement("div");
    column.className = "podium__column";
    column.dataset.place = String(place);
    if (player) {
      column.append(seat(player, "podium__avatar"));
    }
    const step = document.createElement("span");
    step.className = "podium__step";
    step.textContent = `${place}º`;
    column.append(step);
    box.append(column);
  }
  return box;
}

// A firework at x%, y% of the screen: coloured sparks flying out in a circle.
function burst(screen, x, y) {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const spot = document.createElement("span");
  spot.className = "burst";
  spot.style.left = `${x}%`;
  spot.style.top = `${y}%`;
  // Two rings: a wide one and a smaller one, a little turned.
  for (const [reach, turn] of [[16, 0], [9, 0.5]]) {
    for (let i = 0; i < BURST_PIECES; i += 1) {
      const angle = ((i + turn) / BURST_PIECES) * Math.PI * 2;
      const spark = document.createElement("span");
      spark.className = "burst__spark";
      spark.style.background = color;
      spark.style.color = color; // its glow
      spark.style.setProperty("--tx", `${Math.cos(angle) * reach}vmin`);
      spark.style.setProperty("--ty", `${Math.sin(angle) * reach}vmin`);
      spot.append(spark);
    }
  }
  screen.append(spot);
  party.pop();
  setTimeout(() => spot.remove(), 1300);
}

// Something falling from the top (a star, a piece of confetti), at a random place.
function fall(screen, className, text) {
  const piece = document.createElement("span");
  piece.className = className;
  piece.textContent = text;
  piece.style.left = `${Math.random() * 100}%`;
  piece.style.background = text ? "" : COLORS[Math.floor(Math.random() * COLORS.length)];
  piece.style.animationDuration = `${2.5 + Math.random() * 2}s`;
  screen.append(piece);
  setTimeout(() => piece.remove(), 5000);
}
