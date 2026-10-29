// Ways to celebrate the winner, over the whole screen, to try out (celebracion.html) before
// one goes into the game. ✨ Podio y Luna: the podium with fireworks; the winner, jumping,
// rises, the podium goes down and the Moon comes down behind them, and the party goes on
// there, Valencian style: a traca around the Moon, a boom, and a great finale of fireworks
// in three layers (far, behind the Moon; middle; near, over everything). On the podium only
// confetti: no fireworks before the end of the traca.
// 🌕 Luna brillante: the winner on a big shining Moon, fireworks around it. 🎆 Fuegos artificiales: the winner in the middle, fireworks all over and a
// rain of stars. 🏆 Podio: the winner on top, the others below, confetti falling.
// Their look is in css/celebrations.css.

import { party } from "./sounds.js";

export const CELEBRATIONS = [
  { id: "rise", title: "✨ Podio y Luna" },
  { id: "moon", title: "🌕 Luna brillante" },
  { id: "fireworks", title: "🎆 Fuegos artificiales" },
  { id: "podium", title: "🏆 Podio" },
];

const COLORS = ["#ffd60a", "#ff6fa8", "#1abc9c", "#1e90ff", "#b57edc", "#ff8c1a", "#ffffff"];
const BURST_PIECES = 18;
const SKY_STARS = 110;
const PODIUM_MS = 2000; // "Podio y Luna": the podium, before the winner rises
const RISE_MS = 2600; // the rise (as long as its transitions in celebrations.css)
const TRACA_BANGERS = 40; // around the Moon, faster and faster
const FINALE_MS = 7000; // the great finale, before the calmer fireworks
// The layers of a firework: how far its sparks fly (vmin) and how loud it sounds.
const LAYERS = {
  far: { reach: [5, 8], loud: 0.4 },
  middle: { reach: [11, 17], loud: 0.8 },
  near: { reach: [22, 32], loud: 1.3 },
};

// Shows one: `winner` and `others` (2nd, 3rd…) are { name, avatar } (an .avatar element).
// Resolves when the button is tapped (`button`: its text); `exit`: an ✕ to that page.
export function celebrate(id, winner, others = [], button = "¡Otra partida!", { exit = null } = {}) {
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
  const every = (ms, action) => {
    const timer = setInterval(action, ms);
    timers.push(timer);
    return timer;
  };
  const later = (ms, action) => timers.push(setTimeout(action, ms));
  // Around the Moon, one burst after another.
  const aroundTheMoon = () => every(650, () => {
    const angle = Math.random() * Math.PI * 2;
    burst(screen, 50 + Math.cos(angle) * 34, 42 + Math.sin(angle) * 34);
  });
  starrySky(screen);
  if (id === "rise") {
    const moon = silverMoon();
    const flyer = seat(winner, "party__winner party__winner--rise");
    screen.append(moon, podium(winner, others, { apart: true }), flyer);
    screen.dataset.phase = "podium";
    title.hidden = true;
    // On the podium, only confetti: the fireworks wait for the end of the traca.
    const confetti = every(70, () => fall(screen, "party__confetti", ""));
    later(PODIUM_MS, () => {
      clearInterval(confetti);
      screen.dataset.phase = "rise"; // the podium goes down, the Moon comes down
      flyer.style.left = "50%";
      flyer.style.top = "42%";
    });
    later(PODIUM_MS + RISE_MS, () => {
      screen.dataset.phase = "moon";
      title.hidden = false;
      const end = traca(screen, moon, later);
      later(end, () => {
        // The great finale, a frenzy: fireworks one after another, far, middle and near,
        // and every now and then a volley of several at once.
        const finale = every(110, () => firework(screen));
        const volleys = every(1300, () => {
          for (let i = 0; i < 4; i += 1) {
            firework(screen);
          }
        });
        later(FINALE_MS, () => {
          clearInterval(finale);
          clearInterval(volleys);
          every(900, () => firework(screen));
        });
      });
    });
  } else if (id === "moon") {
    const moon = silverMoon();
    moon.dataset.shown = "";
    screen.append(moon, seat(winner, "party__winner"));
    aroundTheMoon();
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
  if (exit) {
    const close = document.createElement("a");
    close.className = "close-x party__exit";
    close.href = exit;
    close.setAttribute("aria-label", "Salir");
    close.textContent = "✕";
    screen.append(close);
  }
  document.body.append(screen);
  if (id === "rise") {
    // The winner starts where their place on the podium is.
    const place = screen.querySelector(".podium__column[data-place='1'] .podium__avatar").getBoundingClientRect();
    const flyer = screen.querySelector(".party__winner--rise");
    flyer.style.left = `${place.left + place.width / 2}px`;
    flyer.style.top = `${place.top + place.height / 2}px`;
  }
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

// 🧨 A traca around the Moon: bangers one after another, faster and faster, each a flash
// and a puff of smoke; at the end, a boom that shakes the screen. Returns how long it lasts.
function traca(screen, moon, later) {
  const box = moon.getBoundingClientRect();
  const centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  const radius = box.width / 2 + 12;
  let at = 0;
  for (let i = 0; i < TRACA_BANGERS; i += 1) {
    const angle = -Math.PI / 2 + (i / TRACA_BANGERS) * Math.PI * 2; // from the top, clockwise
    later(at, () => {
      const flash = document.createElement("span");
      flash.className = "traca__flash";
      flash.style.left = `${centre.x + Math.cos(angle) * radius}px`;
      flash.style.top = `${centre.y + Math.sin(angle) * radius}px`;
      screen.append(flash);
      party.crack();
      setTimeout(() => flash.remove(), 1200);
    });
    at += 25 + 110 * (1 - i / TRACA_BANGERS) ** 1.5;
  }
  later(at + 150, () => {
    party.boom();
    screen.dataset.shake = "";
    setTimeout(() => delete screen.dataset.shake, 700);
  });
  return at + 400;
}

// One firework of the finale, anywhere: far, middle or near, of one colour, of many, or a
// golden willow.
function firework(screen) {
  const layer = ["far", "far", "middle", "middle", "middle", "near"][Math.floor(Math.random() * 6)];
  const kind = Math.random();
  burst(screen, 8 + Math.random() * 84, 6 + Math.random() * 60, {
    layer,
    multi: kind < 0.3,
    willow: kind > 0.8,
  });
}

// The Moon of the board: silver, with a light blue glow and some craters.
function silverMoon() {
  const moon = document.createElement("span");
  moon.className = "party__silver";
  for (const [x, y, size] of [[28, 30, 18], [60, 22, 11], [55, 58, 22], [25, 65, 10], [75, 45, 8]]) {
    const crater = document.createElement("span");
    crater.className = "party__crater";
    crater.style.left = `${x}%`;
    crater.style.top = `${y}%`;
    crater.style.width = `${size}%`;
    crater.style.height = `${size}%`;
    moon.append(crater);
  }
  return moon;
}

// A subtle starry sky: small stars here and there, some twinkling.
function starrySky(screen) {
  for (let i = 0; i < SKY_STARS; i += 1) {
    const star = document.createElement("span");
    star.className = "party__sky-star";
    const size = 1 + Math.random() * 2;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.opacity = String(0.25 + Math.random() * 0.55);
    if (Math.random() < 0.3) {
      star.style.animationDelay = `${-Math.random() * 3}s`;
      star.dataset.twinkle = "";
    }
    screen.append(star);
  }
}

// 🏆 The winner on the highest step; the 2nd on their left, the 3rd on their right. Apart:
// the winner's place is kept empty (they are drawn on their own, to fly).
function podium(winner, others, { apart = false } = {}) {
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
      const avatar = seat(player, "podium__avatar");
      if (apart && place === 1) {
        avatar.style.visibility = "hidden";
      }
      column.append(avatar);
    }
    const step = document.createElement("span");
    step.className = "podium__step";
    step.textContent = `${place}º`;
    column.append(step);
    box.append(column);
  }
  return box;
}

// A firework at x%, y% of the screen: sparks flying out in two rings. Its layer (far,
// behind the Moon; middle; near, over everything) sets its size and how loud it is; `multi`:
// every spark its own colour; `willow`: golden sparks falling slowly, like a willow.
function burst(screen, x, y, { layer = "middle", multi = false, willow = false } = {}) {
  const { reach: [least, most], loud } = LAYERS[layer];
  const reach = least + Math.random() * (most - least);
  const color = willow ? "#ffd27a" : COLORS[Math.floor(Math.random() * COLORS.length)];
  const spot = document.createElement("span");
  spot.className = "burst";
  spot.dataset.layer = layer;
  if (willow) {
    spot.dataset.willow = "";
  }
  spot.style.left = `${x}%`;
  spot.style.top = `${y}%`;
  // Two rings: a wide one and a smaller one, a little turned.
  for (const [distance, turn] of [[reach, 0], [reach * 0.55, 0.5]]) {
    for (let i = 0; i < BURST_PIECES; i += 1) {
      const angle = ((i + turn) / BURST_PIECES) * Math.PI * 2;
      const spark = document.createElement("span");
      const sparkColor = multi ? COLORS[Math.floor(Math.random() * COLORS.length)] : color;
      spark.className = "burst__spark";
      spark.style.background = sparkColor;
      spark.style.color = sparkColor; // its glow
      spark.style.setProperty("--tx", `${Math.cos(angle) * distance}vmin`);
      spark.style.setProperty("--ty", `${Math.sin(angle) * distance}vmin`);
      spot.append(spark);
    }
  }
  screen.append(spot);
  party.pop(loud);
  setTimeout(() => spot.remove(), willow ? 2800 : 1500);
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
