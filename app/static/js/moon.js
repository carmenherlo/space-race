// The Moon's emojis (🌕 🌙) are yellow, but the board's Moon is silver: silvered(text) gives
// the text as nodes, with each Moon in a span.silver-moon (css/base.css), to put in an
// element with replaceChildren(...silvered(text)).

const MOONS = /(🌕|🌙)/u;

export function silvered(text) {
  return String(text)
    .split(MOONS)
    .filter(Boolean)
    .map((part) => {
      if (!MOONS.test(part)) {
        return part;
      }
      const moon = document.createElement("span");
      moon.className = "silver-moon";
      moon.textContent = part;
      return moon;
    });
}
