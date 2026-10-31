// The minigames of the last galaxy: whoever lands on it chooses one, and if they win, they
// fly straight to the Moon. ☄️ Cometas: dodge them (skill). 🎡 Ruleta: two slices of six
// are the Moon (luck). 🚀 Despegue: fill the rocket's tank, tapping fast (skill).
// Used by the game (js/game/squares.js, a square with "minigame") and its test page
// (galaxia.html). Their look is in css/minigames.css.

import { sounds } from "./sounds.js";

export const MINIGAMES = [
  { id: "comets", emoji: "☄️", title: "Cometas", hint: "Esquívalos hasta que se acabe el tiempo." },
  { id: "wheel", emoji: "🎡", title: "Ruleta", hint: "Gírala: ¿caerá en la Luna?" },
  { id: "rocket", emoji: "🚀", title: "Despegue", hint: "Toca rapidísimo para llenar el depósito." },
];
const PLAY = { comets: playComets, wheel: playWheel, rocket: playRocket };

const VOYAGE_MS = 2400; // as long as the flight in minigames.css (voyage-fly)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// In `host` (an empty box): the three minigames to choose from, then the chosen one. The
// player's `avatar` (an .avatar element, copied) is their token in the comets. Resolves
// true if they won; the box keeps showing how it ended.
export function playMinigame(host, avatar) {
  const message = document.createElement("p");
  message.className = "minigame__message";
  message.textContent = "Elige un minijuego: si ganas, ¡vas directo a la Luna!";
  const choices = document.createElement("div");
  choices.className = "minigame__choices";
  const stage = document.createElement("section");
  stage.className = "minigame__stage";
  stage.hidden = true;
  host.replaceChildren(choices, stage, message);
  const say = (text) => (message.textContent = text);
  return new Promise((resolve) => {
    for (const game of MINIGAMES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "minigame__choice";
      const emoji = document.createElement("span");
      emoji.className = "minigame__emoji";
      emoji.textContent = game.emoji;
      const title = document.createElement("b");
      title.textContent = game.title;
      const hint = document.createElement("small");
      hint.textContent = game.hint;
      button.append(emoji, title, hint);
      button.addEventListener("click", async () => {
        choices.hidden = true;
        stage.hidden = false;
        say("");
        const won = await PLAY[game.id](stage, say, avatar);
        await wait(700);
        say(won ? "🌕 ¡Directo a la Luna!" : "Esta vez no: te quedas en la galaxia.");
        if (!won) {
          sounds.bad();
        }
        resolve(won);
      });
      choices.append(button);
    }
  });
}

// The trip to the Moon, on the whole screen: the avatar flies in a curve, leaving sparkles,
// and lands on a big Moon, with a fanfare. Resolves when the player taps "¡Bien!".
export async function flyToTheMoon(avatar) {
  const sky = document.createElement("div");
  sky.className = "voyage";
  const moon = document.createElement("span");
  moon.className = "voyage__moon";
  moon.textContent = "🌕";
  const traveller = document.createElement("span");
  traveller.className = "voyage__token";
  traveller.append(avatar?.cloneNode(true) ?? "🚀");
  const title = document.createElement("p");
  title.className = "voyage__title";
  title.textContent = "¡Directo a la Luna!";
  const ok = document.createElement("button");
  ok.type = "button";
  ok.className = "voyage__ok";
  ok.textContent = "¡Bien!";
  ok.hidden = true;
  sky.append(moon, traveller, title, ok);
  document.body.append(sky);

  // From where the token starts to the middle of the Moon.
  const from = traveller.getBoundingClientRect();
  const to = moon.getBoundingClientRect();
  sky.style.setProperty("--dx", `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
  sky.style.setProperty("--dy", `${to.top + to.height / 2 - (from.top + from.height / 2)}px`);
  await wait(400);
  sky.dataset.flying = "";
  sounds.fly();
  const sparkles = setInterval(() => sparkle(sky, traveller), 90);
  await wait(VOYAGE_MS / 2);
  sounds.fly();
  await wait(VOYAGE_MS / 2);
  clearInterval(sparkles);
  sky.dataset.landed = "";
  sounds.win();
  await wait(1200);
  ok.hidden = false;
  await new Promise((resolve) => ok.addEventListener("click", resolve, { once: true }));
  sky.remove();
}

// A sparkle where the flying token is now, fading away.
function sparkle(sky, traveller) {
  const where = traveller.getBoundingClientRect();
  const star = document.createElement("span");
  star.className = "voyage__sparkle";
  star.textContent = Math.random() < 0.5 ? "✨" : "⭐";
  star.style.left = `${where.left + where.width * Math.random()}px`;
  star.style.top = `${where.top + where.height * Math.random()}px`;
  sky.append(star);
  setTimeout(() => star.remove(), 1000);
}

// ☄️ Dodge the comets: tap a lane to move your token there. Slow at first, then fast, and
// then a surprise: crazy comets that swerve to the next lane. Last until the bar runs out.
const DODGE_MS = 10000; // how long to last
const FAST_AT = 4000; // from here, faster and more of them
const SURPRISE_AT = 7000; // from here, some swerve
const LANES = 3;

function playComets(stage, say, avatar) {
  say("¡Esquiva los cometas! Toca un carril para moverte");
  let lane = 1;
  const place = (element, at) => (element.style.left = `${((at + 0.5) * 100) / LANES}%`);
  const player = document.createElement("span");
  player.className = "dodge__token";
  player.append(avatar?.cloneNode(true) ?? "🚀");
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
      comet.speed = time >= FAST_AT ? 65 : 40; // % of the stage per second
      if (time >= SURPRISE_AT && Math.random() < 0.3) {
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
        say("¡Lo has conseguido!");
        sounds.good();
        finish(true);
        return;
      }
      if (time >= FAST_AT && news === 0) {
        news = 1;
        say("¡Más rápido!");
        sounds.hop();
      }
      if (time >= SURPRISE_AT && news === 1) {
        news = 2;
        say("¡Sorpresa: cometas locos!");
        sounds.quiz();
      }
      if (time >= nextComet && time < DODGE_MS - 1000) {
        spawn(time);
        nextComet = time + (time >= FAST_AT ? 800 : 1100);
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
function playWheel(stage, say) {
  say("");
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

const WHEEL_MS = 6000; // as long as the wheel's transition in minigames.css

// 🚀 Fill the rocket's tank: tap it as fast as you can before the time runs out; it leaks,
// so stopping empties it. A full tank, straight to the Moon; half a tank, half the way…
// and back down. Harder: more taps, less time or a bigger leak.
const FUEL_MS = 5000; // time to fill it, from the first tap
const FUEL_TAPS = 21; // taps for a full tank
const LEAK_PER_SECOND = 1.5; // taps' worth of fuel lost each second

function playRocket(stage, say) {
  say("¡Toca muy rápido para llenar el depósito!");
  const goal = document.createElement("span");
  goal.className = "launch__moon";
  goal.textContent = "🌕";
  const tank = document.createElement("span");
  tank.className = "launch__tank";
  const fuelLevel = document.createElement("span");
  fuelLevel.className = "launch__fuel";
  tank.append(fuelLevel);
  const rocket = document.createElement("span");
  rocket.className = "launch__rocket";
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
  // Taps anywhere in the box count, not only on the rocket.
  const pad = document.createElement("button");
  pad.type = "button";
  pad.className = "launch__pad";
  pad.setAttribute("aria-label", "Llenar el depósito");
  stage.replaceChildren(goal, tank, count, rocket, time, pad);

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

    pad.addEventListener("pointerdown", () => {
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
        say("¡Depósito lleno!");
        sounds.good();
      }
    });

    async function launch() {
      filling = false;
      pad.disabled = true;
      ship.style.marginLeft = "0";
      say("");
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
        say("¡Sin gasolina!");
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
