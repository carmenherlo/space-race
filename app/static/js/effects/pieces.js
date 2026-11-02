// A piece that stands out for a moment, where it is: it shines, or it reacts (a hop of joy,
// a tremble). Each one resolves when it is over, on a `clock` (see clock.js).

// It shines: a little bigger, its ring thicker and glowing, and a reflection goes round the
// ring with a comet of light, like a gold ring turned in the light.
export async function shine(element, { clock, ms }) {
  const reflection = document.createElement("span");
  reflection.className = "fx-reflection";
  const glow = document.createElement("span");
  glow.className = "fx-glow";
  glow.append(document.createElement("span"));
  element.append(reflection, glow);
  element.dataset.fxShine = "";
  await clock.wait(ms);
  delete element.dataset.fxShine;
  reflection.remove();
  glow.remove();
}

// It reacts: a hop of joy ("good") or a tremble ("bad").
export async function react(element, mood, { clock, ms }) {
  element.dataset.fxMood = mood;
  await clock.wait(ms);
  delete element.dataset.fxMood;
}
