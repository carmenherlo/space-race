// A piece going from one place to another, its way: flying in an arc, through a swirl, up
// and down a beam of light, lost in a cloud, or jumping. Each one moves an element from
// `from` to `to` ([x, y] in % of its surface) on a `clock` (see clock.js), in `ms` per
// leg, and resolves when it is there. While it moves, the element has data-fx-trip (no
// transitions, see css/effects.css). Options:
//   clock   { animate } of createClock
//   ms      how long each leg takes
//   under   insert(element) for the marks under the pieces (swirl, beam, cloud)
//   over    insert(element) for the sparkles over them
//   onLeg   called as each leg starts (to play a sound, say)

import { mark, put, sparkle } from "./layer.js";
import { arcTop, curvePoint, easeInOut, hopPoint, swell } from "./motion.js";

// Takes off (bigger, as if nearer), flies there in an arc leaving sparkles, and lands.
// `aspect`: the surface's height over its width (see arcTop).
export function fly(element, from, to, { clock, ms, over, aspect = 1, onLeg } = {}) {
  return moving(element, "fly", async () => {
    onLeg?.();
    const top = arcTop(from, to, { aspect });
    let frame = 0;
    await clock.animate(ms, (t) => {
      const at = curvePoint(from, top, to, easeInOut(t));
      put(element, at);
      element.style.scale = String(swell(t, 0.7)); // biggest half way
      frame += 1;
      if (over && frame % 5 === 0 && t < 0.95) {
        sparkle(over, at);
      }
    });
  });
}

// A swirl opens under it, and it spins and shrinks into it; then another one opens where
// it goes, and it spins out of it, growing.
export function wormhole(element, from, to, { clock, ms, under, onLeg } = {}) {
  return moving(element, "wormhole", async () => {
    await through(under, "swirl", from, "🌀", onLeg, () =>
      clock.animate(ms, (t) => {
        element.style.rotate = `${t * 720}deg`;
        element.style.scale = String(1 - t);
      }),
    );
    put(element, to);
    await through(under, "swirl", to, "🌀", onLeg, () =>
      clock.animate(ms, (t) => {
        element.style.rotate = `${(1 - t) * 720}deg`;
        element.style.scale = String(t);
      }),
    );
  });
}

// A beam of light comes down on it, and it goes up it, fading away; then another beam
// where it goes, and it comes down it. `rise`: how high it goes, in px.
export function teleport(element, from, to, { clock, ms, under, onLeg, rise = element.offsetHeight * 1.5 } = {}) {
  return moving(element, "teleport", async () => {
    await through(under, "beam", from, "", onLeg, () =>
      clock.animate(ms, (t) => {
        element.style.translate = `0 ${-t * rise}px`;
        element.style.opacity = String(1 - t);
      }),
    );
    put(element, to);
    await through(under, "beam", to, "", onLeg, () =>
      clock.animate(ms, (t) => {
        element.style.translate = `0 ${-(1 - t) * rise}px`;
        element.style.opacity = String(t);
      }),
    );
  });
}

// A cloud covers it, and it blurs and fades away in it; then it comes out of another
// cloud where it goes.
export function nebula(element, from, to, { clock, ms, under, onLeg } = {}) {
  return moving(element, "nebula", async () => {
    await through(under, "cloud", from, "", onLeg, () =>
      clock.animate(ms, (t) => {
        element.style.filter = `blur(${t * 8}px)`;
        element.style.opacity = String(1 - t);
      }),
    );
    put(element, to);
    await through(under, "cloud", to, "", onLeg, () =>
      clock.animate(ms, (t) => {
        element.style.filter = `blur(${(1 - t) * 8}px)`;
        element.style.opacity = String(t);
      }),
    );
  });
}

// Several pieces jump at once, each in an arc `lift` high (in % of the height), a little
// bigger half way. `jumps`: [{ element, from, to }].
export async function hop(jumps, { clock, ms, lift = 7 } = {}) {
  for (const { element } of jumps) {
    element.dataset.fxTrip = "hop";
  }
  await clock.animate(ms, (t) => {
    for (const { element, from, to } of jumps) {
      put(element, hopPoint(from, to, t, lift));
      element.style.scale = String(swell(t, 0.3));
    }
  });
  for (const { element } of jumps) {
    delete element.dataset.fxTrip;
  }
}

// One leg of a trip with a mark under it (a swirl, a beam, a cloud), there only meanwhile.
async function through(under, kind, at, text, onLeg, run) {
  onLeg?.();
  const placed = under ? mark(under, kind, at, text) : null;
  await run();
  placed?.remove();
}

// Runs a trip with the element marked as moved by hand.
async function moving(element, trip, run) {
  element.dataset.fxTrip = trip;
  await run();
  delete element.dataset.fxTrip;
}
