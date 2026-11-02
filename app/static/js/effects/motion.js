// The maths of the effects, with no page: easings, arcs and jumps. Points are [x, y] in %
// of whatever the effects move on; t goes from 0 to 1.

// Slow, fast, slow.
export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

// Fast, then slower as it arrives.
export function easeOut(t) {
  return 1 - (1 - t) ** 3;
}

// 1 at the ends, 1 + amount half way: something that grows and shrinks back.
export function swell(t, amount) {
  return 1 + amount * Math.sin(Math.PI * t);
}

// The top of an arc from one point to another: above the middle, higher the further it
// goes (`height`: a share of the distance). `aspect` is the height of the space over its
// width (9 / 16 for a 16:9 board), so a distance is the same whichever way it goes.
export function arcTop([x0, y0], [x1, y1], { height = 0.35, aspect = 1 } = {}) {
  const distance = Math.hypot(x1 - x0, (y1 - y0) * aspect); // in % of the width
  return [(x0 + x1) / 2, (y0 + y1) / 2 - (distance * height) / aspect];
}

// A point of the curve from `from` to `to` pulled towards `top` (a quadratic Bézier).
export function curvePoint([x0, y0], [cx, cy], [x1, y1], t) {
  const [a, b, c] = [(1 - t) ** 2, 2 * (1 - t) * t, t ** 2];
  return [a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1];
}

// A point of a jump from `from` to `to`, `lift` high half way (in % of the height).
export function hopPoint([x0, y0], [x1, y1], t, lift) {
  return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - lift * 4 * t * (1 - t)];
}
