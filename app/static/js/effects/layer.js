// Putting things on a surface, at [x, y] in % of it. Where a new thing goes in the page
// is up to whoever uses the effects: they pass an `insert(element)` function (under the
// pieces, over them…). The look is in css/effects.css.

const SPARKLE_MS = 1200; // as long as its fading (.fx-sparkle)

export function put(element, [x, y]) {
  element.style.left = `${x}%`;
  element.style.top = `${y}%`;
}

// Something on the surface (a swirl, a beam, a cloud, a fire…) until it is removed:
// its look is .fx-mark[data-kind].
export function mark(insert, kind, at, text = "") {
  const element = document.createElement("span");
  element.className = "fx-mark";
  element.dataset.kind = kind;
  element.textContent = text;
  put(element, at);
  insert(element);
  return element;
}

// A sparkle that fades away by itself.
export function sparkle(insert, at) {
  const star = document.createElement("span");
  star.className = "fx-sparkle";
  star.textContent = "✨";
  put(star, at);
  insert(star);
  setTimeout(() => star.remove(), SPARKLE_MS);
}
