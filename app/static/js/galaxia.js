// The last galaxy (galaxia.html): a test page for its games of chance. Whoever lands on the
// last galaxy chooses one; if they win, their token flies straight to the Moon. Each game
// wins one time in three: one comet of three, two slices of six, one launch in three.
// Nothing here touches a game: it is only to try them out.

import { sounds } from "./sounds.js";

const stage = document.getElementById("stage");
const result = document.getElementById("result");
const choices = document.getElementById("choices");
const again = document.getElementById("again");
const trip = document.getElementById("trip");
const token = document.getElementById("token");
const moon = document.getElementById("moon");

const GAMES = { comets: playComets, wheel: playWheel, rocket: playRocket };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (const button of choices.querySelectorAll("button")) {
  button.addEventListener("click", () => play(button.dataset.game));
}
again.addEventListener("click", reset);
showToken();

async function play(name) {
  choices.hidden = true;
  stage.hidden = false;
  result.textContent = "";
  const won = await GAMES[name]();
  await wait(700);
  if (won) {
    result.textContent = "🌕 ¡Directo a la Luna!";
    trip.style.setProperty("--to-moon", `${moon.offsetLeft - token.offsetLeft}px`);
    trip.dataset.won = "";
    sounds.fly();
    await wait(1300);
    sounds.win();
  } else {
    result.textContent = "Esta vez no: te quedas en la galaxia.";
    trip.dataset.lost = "";
    sounds.bad();
  }
  again.hidden = false;
}

function reset() {
  delete trip.dataset.won;
  delete trip.dataset.lost;
  stage.hidden = true;
  stage.replaceChildren();
  result.textContent = "";
  again.hidden = true;
  choices.hidden = false;
}

// ☄️ Three comets drift across the sky; one carries a star. Tap one.
function playComets() {
  result.textContent = "Toca un cometa";
  const lucky = Math.floor(Math.random() * 3);
  return new Promise((resolve) => {
    const comets = [0, 1, 2].map((index) => {
      const comet = document.createElement("button");
      comet.type = "button";
      comet.className = "comet";
      comet.textContent = "☄️";
      comet.style.top = `${10 + index * 28}%`;
      comet.style.setProperty("--across", `${stage.clientWidth * 1.15}px`);
      comet.style.animationDuration = `${5 + index * 1.3}s`;
      comet.style.animationDelay = `${-index * 2.1}s`;
      comet.setAttribute("aria-label", `Cometa ${index + 1}`);
      comet.addEventListener("click", async () => {
        for (const one of comets) {
          one.disabled = true;
        }
        sounds.hop();
        open(comet, index === lucky);
        const won = index === lucky;
        (won ? sounds.good : sounds.bad)();
        await wait(1200);
        comets.forEach((one, i) => i !== index && open(one, i === lucky)); // and what the others had
        resolve(won);
      });
      return comet;
    });
    stage.replaceChildren(...comets);
  });
}

function open(comet, star) {
  comet.dataset.open = star ? "star" : "smoke";
  comet.textContent = star ? "⭐" : "💨";
}

// 🎡 A wheel of six slices, two of them the Moon. Tap to spin.
function playWheel() {
  result.textContent = "Toca la ruleta para girarla";
  const slices = ["🌕", "💫", "🪐", "🌕", "💫", "🪐"];
  const wheel = document.createElement("button");
  wheel.type = "button";
  wheel.className = "wheel";
  wheel.setAttribute("aria-label", "Girar la ruleta");
  slices.forEach((emoji, index) => {
    const slice = document.createElement("span");
    slice.className = "wheel__slice";
    slice.textContent = emoji;
    slice.style.transform = `rotate(${index * 60 + 30}deg)`;
    wheel.append(slice);
  });
  const arrow = document.createElement("span");
  arrow.className = "wheel__arrow";
  arrow.textContent = "🔻";
  stage.replaceChildren(arrow, wheel);
  return new Promise((resolve) => {
    wheel.addEventListener("click", async () => {
      wheel.disabled = true;
      result.textContent = "";
      const landing = Math.floor(Math.random() * slices.length);
      // Five turns, then the middle of that slice under the arrow.
      wheel.style.transform = `rotate(${5 * 360 - (landing * 60 + 30)}deg)`;
      sounds.dice();
      await wait(1500);
      sounds.dice();
      await wait(3200);
      const won = slices[landing] === "🌕";
      (won ? sounds.good : sounds.bad)();
      resolve(won);
    }, { once: true });
  });
}

// 🚀 Light the rocket: 3, 2, 1… it flies up. Will it reach the Moon?
function playRocket() {
  result.textContent = "Toca el cohete para encenderlo";
  const goal = document.createElement("span");
  goal.className = "launch__moon";
  goal.textContent = "🌕";
  const rocket = document.createElement("button");
  rocket.type = "button";
  rocket.className = "launch__rocket";
  rocket.textContent = "🚀";
  rocket.setAttribute("aria-label", "Encender el cohete");
  const count = document.createElement("span");
  count.className = "launch__count";
  stage.replaceChildren(goal, count, rocket);
  return new Promise((resolve) => {
    rocket.addEventListener("click", async () => {
      rocket.disabled = true;
      result.textContent = "";
      for (const number of ["3", "2", "1"]) {
        count.textContent = number;
        sounds.hop();
        await wait(700);
      }
      count.textContent = "";
      const won = Math.random() < 1 / 3;
      const top = stage.clientHeight - rocket.offsetHeight - goal.offsetHeight;
      // Not far enough: it stops somewhere between a third and three quarters of the way.
      const height = won ? top : top * (0.35 + Math.random() * 0.4);
      sounds.fly();
      rocket.style.transform = `translateY(${-height}px) rotate(-45deg)`;
      await wait(2300);
      if (won) {
        sounds.good();
      } else {
        rocket.dataset.wobble = "";
        await wait(800);
        sounds.bounce();
        rocket.style.transition = "transform 1s ease-in";
        rocket.style.transform = "translateY(0) rotate(135deg)";
        await wait(1000);
      }
      resolve(won);
    }, { once: true });
  });
}

// The token: a random avatar (or a rocket, if there are none).
async function showToken() {
  try {
    const avatars = await (await fetch("api/avatars", { cache: "no-store" })).json();
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
    const circle = document.createElement("span");
    circle.className = "avatar";
    circle.style.setProperty("--avatar-color", avatar.color ?? "#d6e4f5");
    circle.style.setProperty("--avatar-inside", "#ffffff");
    const img = document.createElement("img");
    img.className = "avatar__photo";
    img.alt = "";
    img.src = avatar.url;
    circle.append(img);
    token.replaceChildren(circle);
  } catch {
    token.textContent = "🚀";
  }
}
