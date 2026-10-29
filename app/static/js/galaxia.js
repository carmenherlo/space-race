// The last galaxy (galaxia.html): a test page for its little games. Whoever lands on the
// last galaxy chooses one; if they win, their token flies straight to the Moon. The comets
// are a game of skill (dodge them), and so is the rocket (fill its tank, tapping fast); the
// wheel (two slices of six) is luck. Nothing here touches a game: it is only to try them out.

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

// ☄️ Dodge the comets: tap a lane to move your token there. Slow at first, then fast, and
// then a surprise: crazy comets that swerve to the next lane. Last until the bar runs out.
const DODGE_MS = 12000; // how long to last
const FAST_AT = 4500; // from here, faster and more of them
const SURPRISE_AT = 8000; // from here, some swerve
const LANES = 3;

function playComets() {
  result.textContent = "¡Esquiva los cometas! Toca un carril para moverte";
  let lane = 1;
  const place = (element, at) => (element.style.left = `${((at + 0.5) * 100) / LANES}%`);
  const player = document.createElement("span");
  player.className = "dodge__token";
  player.append(token.firstElementChild?.cloneNode(true) ?? "🚀");
  place(player, lane);
  const lanes = Array.from({ length: LANES }, (_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dodge__lane";
    button.style.left = `${(index * 100) / LANES}%`;
    button.setAttribute("aria-label", `Carril ${index + 1}`);
    button.addEventListener("pointerdown", () => {
      lane = index;
      place(player, lane);
    });
    return button;
  });
  const keys = (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (step) {
      lane = Math.min(LANES - 1, Math.max(0, lane + step));
      place(player, lane);
    }
  };
  document.addEventListener("keydown", keys);
  const bar = document.createElement("span");
  bar.className = "dodge__bar";
  stage.replaceChildren(...lanes, player, bar);

  return new Promise((resolve) => {
    const comets = [];
    let started = null;
    let last = null;
    let nextComet = 0;
    let news = 0; // what has been announced: 1 "faster", 2 "surprise"

    const spawn = (time) => {
      const comet = { lane: Math.floor(Math.random() * LANES), y: -15, element: document.createElement("span") };
      comet.speed = time >= FAST_AT ? 95 : 42; // % of the stage per second
      if (time >= SURPRISE_AT && Math.random() < 0.5) {
        comet.swerve = comet.lane === 0 ? 1 : comet.lane === LANES - 1 ? LANES - 2 : comet.lane + (Math.random() < 0.5 ? -1 : 1);
        comet.element.dataset.crazy = "";
      }
      comet.element.className = "dodge__comet";
      comet.element.textContent = "☄️";
      place(comet.element, comet.lane);
      stage.append(comet.element);
      comets.push(comet);
    };

    const finish = (won, hit) => {
      document.removeEventListener("keydown", keys);
      for (const button of lanes) {
        button.disabled = true;
      }
      if (hit) {
        hit.element.textContent = "💥";
        hit.element.dataset.hit = "";
      }
      resolve(won);
    };

    const frame = (now) => {
      started ??= now;
      const time = now - started;
      const seconds = last === null ? 0 : (now - last) / 1000;
      last = now;
      bar.style.width = `${100 * Math.max(0, 1 - time / DODGE_MS)}%`;
      if (time >= DODGE_MS) {
        result.textContent = "¡Lo has conseguido!";
        sounds.good();
        finish(true);
        return;
      }
      if (time >= FAST_AT && news === 0) {
        news = 1;
        result.textContent = "¡Más rápido!";
        sounds.hop();
      }
      if (time >= SURPRISE_AT && news === 1) {
        news = 2;
        result.textContent = "¡Sorpresa: cometas locos!";
        sounds.challenge();
      }
      if (time >= nextComet && time < DODGE_MS - 1000) {
        spawn(time);
        nextComet = time + (time >= FAST_AT ? 520 : 1100);
      }
      const you = player.getBoundingClientRect();
      for (const comet of [...comets]) {
        comet.y += comet.speed * seconds;
        if (comet.swerve !== undefined && comet.y > 30) {
          comet.lane = comet.swerve;
          delete comet.swerve;
          place(comet.element, comet.lane);
        }
        comet.element.style.top = `${comet.y}%`;
        if (comet.lane === lane && touching(comet.element.getBoundingClientRect(), you)) {
          finish(false, comet);
          return;
        }
        if (comet.y > 110) {
          comet.element.remove();
          comets.splice(comets.indexOf(comet), 1);
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

// Two boxes overlap, forgiving the edges a little.
function touching(a, b) {
  const margin = Math.min(b.width, b.height) * 0.2;
  return a.bottom - margin > b.top && a.top + margin < b.bottom;
}

// 🎡 A wheel of six slices, two of them the Moon. Tap the middle: it spins very fast, then
// slows down until it stops.
function playWheel() {
  result.textContent = "";
  const slices = ["🌕", "💫", "🪐", "🌕", "💫", "🪐"];
  const box = document.createElement("div");
  box.className = "wheel-box";
  const wheel = document.createElement("div");
  wheel.className = "wheel";
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
  const spin = document.createElement("button");
  spin.type = "button";
  spin.className = "wheel__spin";
  spin.textContent = "Toca para girar";
  box.append(wheel, arrow, spin);
  stage.replaceChildren(box);
  return new Promise((resolve) => {
    spin.addEventListener("click", async () => {
      spin.disabled = true;
      spin.textContent = "…";
      const landing = Math.floor(Math.random() * slices.length);
      // Many turns, then the middle of that slice under the arrow.
      wheel.style.transform = `rotate(${14 * 360 - (landing * 60 + 30)}deg)`;
      // A tick for each slice going by: quick at first, slower and slower.
      let at = 0;
      for (let tick = 0; at < WHEEL_MS - 600; tick += 1) {
        setTimeout(sounds.hop, at);
        at += 45 + tick * tick * 0.9;
      }
      await wait(WHEEL_MS + 200);
      const won = slices[landing] === "🌕";
      spin.textContent = slices[landing];
      (won ? sounds.good : sounds.bad)();
      resolve(won);
    }, { once: true });
  });
}

const WHEEL_MS = 6000; // as long as the wheel's transition in galaxia.css

// 🚀 Fill the rocket's tank: tap it as fast as you can before the time runs out; it leaks,
// so stopping empties it. A full tank, straight to the Moon; half a tank, half the way…
// and back down. Harder: more taps, less time or a bigger leak.
const FUEL_MS = 5000; // time to fill it, from the first tap
const FUEL_TAPS = 18; // taps for a full tank
const LEAK_PER_SECOND = 3; // taps' worth of fuel lost each second

function playRocket() {
  result.textContent = "¡Toca el cohete muy rápido para llenar el depósito!";
  const goal = document.createElement("span");
  goal.className = "launch__moon";
  goal.textContent = "🌕";
  const tank = document.createElement("span");
  tank.className = "launch__tank";
  const fuelLevel = document.createElement("span");
  fuelLevel.className = "launch__fuel";
  tank.append(fuelLevel);
  const rocket = document.createElement("button");
  rocket.type = "button";
  rocket.className = "launch__rocket";
  rocket.setAttribute("aria-label", "Llenar el depósito");
  const ship = document.createElement("span");
  ship.className = "launch__ship";
  ship.textContent = "🚀";
  const flame = document.createElement("span");
  flame.className = "launch__flame";
  flame.textContent = "🔥";
  rocket.append(ship, flame);
  const count = document.createElement("span");
  count.className = "launch__count";
  const time = document.createElement("span");
  time.className = "launch__time";
  stage.replaceChildren(goal, tank, count, rocket, time);

  return new Promise((resolve) => {
    let fuel = 0;
    let started = null;
    let filling = true;
    const full = () => fuel >= FUEL_TAPS;

    let last = null;
    const showFuel = () => {
      fuelLevel.style.height = `${(100 * fuel) / FUEL_TAPS}%`;
      flame.style.transform = `rotate(180deg) scale(${0.4 + (1.2 * fuel) / FUEL_TAPS})`;
    };

    // The time left, and the leak (none once it is full).
    const timeLeft = (now) => {
      time.style.width = `${100 * Math.max(0, 1 - (now - started) / FUEL_MS)}%`;
      if (last !== null && !full()) {
        fuel = Math.max(0, fuel - (LEAK_PER_SECOND * (now - last)) / 1000);
        showFuel();
      }
      last = now;
      if (filling) {
        requestAnimationFrame(timeLeft);
      }
    };

    rocket.addEventListener("pointerdown", () => {
      if (!filling || full()) {
        return;
      }
      if (started === null) {
        started = performance.now();
        requestAnimationFrame(timeLeft);
        setTimeout(launch, FUEL_MS);
      }
      fuel = Math.min(FUEL_TAPS, fuel + 1);
      sounds.hop();
      showFuel();
      ship.style.marginLeft = `${Math.random() * 8 - 4}px`; // it shakes
      if (full()) {
        tank.dataset.full = "";
        result.textContent = "¡Depósito lleno!";
        sounds.good();
      }
    });

    async function launch() {
      filling = false;
      rocket.disabled = true;
      ship.style.marginLeft = "0";
      result.textContent = "";
      for (const number of ["3", "2", "1"]) {
        count.textContent = number;
        sounds.hop();
        await wait(700);
      }
      count.textContent = "";
      const top = stage.clientHeight - rocket.offsetHeight - goal.offsetHeight;
      const won = full();
      // Not full: as far as its fuel takes it (never quite to the Moon).
      sounds.fly();
      rocket.style.transform = `translateY(${-top * (won ? 1 : (0.9 * fuel) / FUEL_TAPS)}px)`;
      await wait(2300);
      if (won) {
        sounds.good();
      } else {
        result.textContent = "¡Sin gasolina!";
        rocket.dataset.wobble = "";
        await wait(800);
        sounds.bounce();
        rocket.style.transition = "transform 1s ease-in";
        rocket.style.transform = "translateY(0) rotate(180deg)";
        await wait(1000);
      }
      resolve(won);
    }
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
