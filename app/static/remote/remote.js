// TV remote (e.g. a Fire TV running the Home Assistant app): the arrows move a highlight
// from one button to the nearest one in that direction, the centre button presses it.
// Kept apart from the game: app.html adds this script to each page it opens, and nothing
// else knows about it. Touch and mouse keep working as before.

// Pages where the remote is on (more are added one at a time, once tried on the TV).
const PAGES = ["games.html", "game.html", "pruebas/galaxia.html"];

const DIRECTIONS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

// The button most likely pressed next (e.g. "Vale" on a card, the die on the board): the
// highlight goes there by itself when it appears, while the remote is in use.
const PRIMARY = [
  ".game-button:not(.game-button--quiet)",
  ".game-button",
  ".minigame__choice", // the minigames (js/minigames.js)…
  ".wheel__spin",
  ".launch__pad",
  ".voyage__ok", // …and the trip to the Moon
  ".galaxy__button", // "Otra vez" on the minigames test page
  "#die",
];
// While these are on screen the arrows belong to the page (the comets minigame moves the
// rocket with them), not to the remote.
const OWN_ARROWS = ".dodge__lane:not([disabled])";
// Buttons that answer to a touch, not to a click: the centre button touches them.
const TOUCHED = ".launch__pad, .dodge__lane";
// Never highlighted by themselves: closing or silencing buttons.
const NOT_FIRST = ".close-x, .question__quiet";
// Windows that start on their first button (the setup: the avatars come first).
const STARTS_AT_TOP = "#setup";
// The remote is in use from the first arrow until a tap or a click (kept between pages).
const IN_USE_KEY = "space-race:remote";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

function visible(element) {
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== "hidden";
}

// Where the arrows look: the window on top (an open modal dialog, e.g. the game's setup),
// else the whole page. What is behind a modal dialog cannot be pressed.
function scope() {
  let modals = [];
  try {
    modals = document.querySelectorAll("dialog:modal");
  } catch {
    modals = document.querySelectorAll("dialog[open]"); // an older browser without :modal
  }
  return modals[modals.length - 1] ?? document;
}

function candidates() {
  return [...scope().querySelectorAll(FOCUSABLE)].filter(visible);
}

// Where the highlight was last, so a button that is redrawn when pressed (e.g. a setup
// avatar) does not lose the place.
let lastPoint = null;

function centre(element) {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

// The nearest element in that direction, favouring the ones straight ahead.
function nearest(from, [dx, dy]) {
  const start = centre(from);
  let best = null;
  let bestScore = Infinity;
  for (const element of candidates()) {
    if (element === from) {
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

// The closest element to a point (where the highlight was), else the first one.
function closest(point) {
  const elements = candidates();
  if (!point) {
    return elements[0] ?? null;
  }
  const distance = (element) => {
    const { x, y } = centre(element);
    return Math.hypot(x - point.x, y - point.y);
  };
  return elements.reduce((best, element) => (best && distance(best) <= distance(element) ? best : element), null);
}

// A text box: the TV opens its keyboard itself when the centre button is pressed on it.
function isTextBox(element) {
  return element.matches("input:not([type]), input[type='text'], input[type='search'], textarea");
}

function highlight(element) {
  document.querySelector(".remote-focus")?.classList.remove("remote-focus");
  element.classList.add("remote-focus");
  lastPoint = centre(element);
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

function current() {
  const element = document.querySelector(".remote-focus");
  return element && visible(element) && scope().contains(element) ? element : null;
}

// After a press the page may redraw: the highlight goes back to where it was.
function keepPlace() {
  requestAnimationFrame(() => {
    if (!current()) {
      const element = closest(lastPoint);
      if (element) {
        highlight(element);
      }
    }
  });
}

function onKey(event) {
  const direction = DIRECTIONS[event.key];
  const from = current();
  if (direction && [...document.querySelectorAll(OWN_ARROWS)].some(visible)) {
    from?.classList.remove("remote-focus");
    return;
  }
  if (direction) {
    // A slider (e.g. the volume): left and right move it.
    if (from?.matches("input[type='range']") && direction[1] === 0) {
      return;
    }
    event.preventDefault();
    setInUse(true);
    const to = from ? nearest(from, direction) : closest(lastPoint);
    if (to) {
      highlight(to);
    }
  } else if (event.key === "Enter" && from) {
    if (isTextBox(from)) {
      return; // the TV's own centre button opens its keyboard
    }
    event.preventDefault();
    if (from.matches(TOUCHED)) {
      from.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    } else {
      from.click();
    }
    keepPlace();
  }
}

function inUse() {
  try {
    return sessionStorage.getItem(IN_USE_KEY) === "1";
  } catch {
    return usingRemote;
  }
}

function setInUse(value) {
  usingRemote = value;
  try {
    sessionStorage.setItem(IN_USE_KEY, value ? "1" : "0");
  } catch {
    // no storage (e.g. a private window): only this page remembers
  }
}

let usingRemote = false;

// The button to start on in the window on top, or null.
function primary() {
  const area = scope();
  const elements = candidates();
  if (area !== document && area.matches(STARTS_AT_TOP)) {
    return elements[0] ?? null;
  }
  for (const selector of PRIMARY) {
    const element = elements.find((candidate) => candidate.matches(selector));
    if (element) {
      return element;
    }
  }
  return area === document ? null : (elements.find((element) => !element.matches(NOT_FIRST)) ?? null);
}

// A window opens or a button appears: when the remote is in use and the button to start on
// is a new one, the highlight goes there.
let lastPrimary = null;
let checking = false;

function checkPrimary() {
  if (checking) {
    return;
  }
  checking = true;
  requestAnimationFrame(() => {
    checking = false;
    const element = primary();
    // In a window that starts at the top, only its opening counts (its buttons are redrawn).
    const area = scope();
    const key = area !== document && area.matches(STARTS_AT_TOP) ? area : element;
    if (key !== lastPrimary) {
      lastPrimary = key;
      if (element && inUse()) {
        highlight(element);
      }
    }
  });
}

// A tap or a click: the highlight goes away until the next arrow.
function onPointer(event) {
  if (!event.isTrusted) {
    return; // the remote's own touch (TOUCHED)
  }
  setInUse(false);
  document.querySelector(".remote-focus")?.classList.remove("remote-focus");
}

if (PAGES.some((page) => location.pathname.endsWith(`/${page}`))) {
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = new URL("remote.css", import.meta.url).href;
  document.head.append(style);
  document.addEventListener("keydown", onKey);
  document.addEventListener("pointerdown", onPointer);
  new MutationObserver(checkPrimary).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["open", "hidden", "disabled"],
  });
  checkPrimary();
}
