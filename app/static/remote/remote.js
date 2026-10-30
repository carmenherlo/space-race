// TV remote (e.g. a Fire TV running the Home Assistant app): the arrows move a highlight
// from one button to the nearest one in that direction, the centre button presses it.
// Kept apart from the game: app.html adds this script to each page it opens, and nothing
// else knows about it. Touch and mouse keep working as before.

// Pages where the remote is on (more are added one at a time, once tried on the TV).
const PAGES = ["games.html"];

const DIRECTIONS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

function visible(element) {
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== "hidden";
}

function centre(element) {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

// The nearest element in that direction, favouring the ones straight ahead.
function nearest(from, [dx, dy]) {
  const start = centre(from);
  let best = null;
  let bestScore = Infinity;
  for (const element of document.querySelectorAll(FOCUSABLE)) {
    if (element === from || !visible(element)) {
      continue;
    }
    const point = centre(element);
    const ahead = (point.x - start.x) * dx + (point.y - start.y) * dy;
    const aside = Math.abs((point.x - start.x) * dy + (point.y - start.y) * dx);
    if (ahead <= 1) {
      continue;
    }
    const score = ahead + aside * 3;
    if (score < bestScore) {
      best = element;
      bestScore = score;
    }
  }
  return best;
}

function first() {
  return [...document.querySelectorAll(FOCUSABLE)].find(visible) ?? null;
}

function highlight(element) {
  document.querySelector(".remote-focus")?.classList.remove("remote-focus");
  element.classList.add("remote-focus");
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

function current() {
  const element = document.querySelector(".remote-focus");
  return element && visible(element) ? element : null;
}

function onKey(event) {
  const direction = DIRECTIONS[event.key];
  if (direction) {
    event.preventDefault();
    const from = current();
    const to = from ? nearest(from, direction) : first();
    if (to) {
      highlight(to);
    }
  } else if (event.key === "Enter" && current()) {
    event.preventDefault();
    current().click();
  }
}

// A tap or a click: the highlight goes away until the next arrow.
function onPointer() {
  document.querySelector(".remote-focus")?.classList.remove("remote-focus");
}

if (PAGES.some((page) => location.pathname.endsWith(`/${page}`))) {
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = new URL("remote.css", import.meta.url).href;
  document.head.append(style);
  document.addEventListener("keydown", onKey);
  document.addEventListener("pointerdown", onPointer);
}
