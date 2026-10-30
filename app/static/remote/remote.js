// TV remote (e.g. a Fire TV running the Home Assistant app): the arrows move a highlight
// from one button to the nearest one in that direction, the centre button presses it.
// Kept apart from the game: app.html adds this script to each page it opens, and nothing
// else knows about it. Touch and mouse keep working as before.

// Pages where the remote is on (more are added one at a time, once tried on the TV).
const PAGES = ["games.html", "game.html"];

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

// A text box: highlighted without focus, so the TV keyboard only opens on the centre button.
function isTextBox(element) {
  return element.matches("input:not([type]), input[type='text'], input[type='search'], textarea");
}

function highlight(element) {
  document.querySelector(".remote-focus")?.classList.remove("remote-focus");
  element.classList.add("remote-focus");
  lastPoint = centre(element);
  if (isTextBox(element)) {
    document.activeElement?.blur();
  } else {
    element.focus({ preventScroll: true });
  }
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
  if (direction) {
    // A slider (e.g. the volume): left and right move it.
    if (from?.matches("input[type='range']") && direction[1] === 0) {
      return;
    }
    event.preventDefault();
    const to = from ? nearest(from, direction) : closest(lastPoint);
    if (to) {
      highlight(to);
    }
  } else if (event.key === "Enter" && from) {
    event.preventDefault();
    if (isTextBox(from)) {
      // In a text box: the centre button opens the keyboard, and pressed again closes it.
      if (document.activeElement === from) {
        from.blur();
      } else {
        from.focus();
      }
      return;
    }
    from.click();
    keepPlace();
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
