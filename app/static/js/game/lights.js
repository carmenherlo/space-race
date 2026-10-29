// The board's lights, on its own pictures (squares_image and lights in game.yaml; a board
// without them simply has none):
//   - the square of the player whose turn it is lights up, with its real shape: whiter and
//     brighter where it is bare (what is drawn over it is not lit), glowing from its edges;
//   - the title glows very softly, breathing;
//   - "Start here" beats while the player whose turn it is is at the start;
//   - close to the Moon (or on it), the Moon glows softly, more the closer, and its sign beats;
//   - the trail lights up on the way to the Moon after the last galaxy;
//   - the Moon shines strongly, with its sign, flags and the stars behind it, when someone
//     gets there.
// Their look is in game.css (.board-light).

import { currentPlayer, elements, game, pack } from "./state.js";
import { MOON_SHINE_MS, wait } from "./timing.js";

export const NEAR_MOON = 6; // squares: the Moon glows, the token glows, the music speeds up
const MOON_PARTS = ["moon", "moon_sign", "moon_flags", "moon_stars"];

const lights = {}; // part of the board (title, start, trail, moon…) → its light
let squareShapes = new Map(); // square number → { left, top, width, height (in %), mask }
let litSquare = null; // the lit square: { place, element }

// Gets the lights ready (after the pack is loaded): one picture each, and each square's shape.
export async function setUpLights(content) {
  for (const [part, url] of Object.entries(content.lights ?? {})) {
    const picture = document.createElement("img");
    picture.className = "board-light";
    picture.dataset.kind = part;
    picture.alt = "";
    picture.src = url;
    lights[part] = picture;
    elements.lights.append(picture);
  }
  if (content.squares_image_url && content.image_url) {
    try {
      squareShapes = await shapesOfTheSquares(content.squares_image_url, content.image_url);
    } catch (error) {
      console.error("The squares picture could not be read: no lit squares.", error);
    }
  }
}

export function nearTheMoon(player) {
  return player.place > 0 && pack.goal - player.place <= NEAR_MOON;
}

// After every move: the lights that depend on where the tokens are.
export function showLights() {
  const player = currentPlayer();
  const playing = game.players.length > 0 && !elements.turn.hidden;
  lightTheSquare(playing && player ? player.place : null);
  lights.title?.toggleAttribute("data-on", true);
  lights.start?.toggleAttribute("data-on", playing && player?.place === 0);
  // The closest of everybody: the Moon glows more the closer (a glimmer six squares away).
  const away = Math.min(...game.players.filter(nearTheMoon).map((one) => pack.goal - one.place));
  const near = Number.isFinite(away);
  lights.moon?.toggleAttribute("data-near", near);
  lights.moon?.style.setProperty("--near", near ? String(Math.min(1, 0.25 + (0.6 * (NEAR_MOON - away)) / (NEAR_MOON - 1))) : "0");
  lights.moon_sign?.toggleAttribute("data-on", near);
}

// The Moon shining strongly, with its sign, its flags and the stars behind it.
export async function moonShines() {
  for (const part of MOON_PARTS) {
    lights[part]?.setAttribute("data-shine", "");
  }
  await wait(MOON_SHINE_MS);
  for (const part of MOON_PARTS) {
    lights[part]?.removeAttribute("data-shine");
  }
}

// The star trail to the Moon, lit (on the way after the last galaxy) or not.
export function lightTheTrail(on) {
  lights.trail?.toggleAttribute("data-on", on);
}

// The square at `place` lit up (null: none); the one left behind fades out.
function lightTheSquare(place) {
  if (litSquare?.place === place) {
    return;
  }
  if (litSquare) {
    const old = litSquare.element;
    old.dataset.off = "";
    setTimeout(() => old.remove(), 400);
    litSquare = null;
  }
  const shape = squareShapes.get(place);
  if (!shape) {
    return;
  }
  // The board's own picture of that square, brighter, cut out with its shape; the glow
  // comes from its wrapper (see game.css).
  const element = document.createElement("span");
  element.className = "board-light board-light--square";
  for (const side of ["left", "top", "width", "height"]) {
    element.style[side] = `${shape[side]}%`;
  }
  const picture = document.createElement("span");
  picture.className = "board-light__picture";
  picture.style.backgroundImage = `url("${elements.boardImage.src}")`;
  picture.style.backgroundSize = `${10000 / shape.width}% ${10000 / shape.height}%`;
  picture.style.backgroundPosition = `${(shape.left / (100 - shape.width)) * 100}% ${(shape.top / (100 - shape.height)) * 100}%`;
  picture.style.webkitMaskImage = `url("${shape.mask}")`;
  picture.style.maskImage = `url("${shape.mask}")`;
  element.append(picture);
  elements.lights.append(element);
  litSquare = { place, element };
}

// Each square's shape (and the Moon's), from the squares picture: from the middle of each
// place, everything of it that is not see-through. In % of the board, with a mask picture
// of the shape: only where the board shows the square itself, so what is drawn over it (a
// galaxy, stars, its number) is not lit, and is never cut at the square's edge.
async function shapesOfTheSquares(squaresUrl, boardUrl) {
  const squaresPicture = await pixelsOf(squaresUrl);
  const { width, height } = squaresPicture;
  const square = squaresPicture.data;
  const board = (await pixelsOf(boardUrl)).data;
  // How much of a pixel is the square itself: 1 where the board has the square's colour,
  // fading to 0 where something else is drawn over it.
  const bare = (x, y) => {
    const i = (y * width + x) * 4;
    const difference = Math.abs(board[i] - square[i]) + Math.abs(board[i + 1] - square[i + 1]) + Math.abs(board[i + 2] - square[i + 2]);
    return Math.max(0, Math.min(1, (150 - difference) / 90));
  };
  const solid = (x, y) => square[(y * width + x) * 4 + 3] > 127;
  const taken = new Uint8Array(width * height);
  const shapes = new Map();
  pack.places.forEach(([px, py], number) => {
    const x = Math.round((px * width) / 100);
    const y = Math.round((py * height) / 100);
    if (!solid(x, y) || taken[y * width + x]) {
      return; // not drawn on the squares picture (the start, often)
    }
    // Fill from the middle to the edges.
    const pixels = [];
    const stack = [[x, y]];
    taken[y * width + x] = 1;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      pixels.push(cx, cy);
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && !taken[ny * width + nx] && solid(nx, ny)) {
          taken[ny * width + nx] = 1;
          stack.push([nx, ny]);
        }
      }
    }
    let [left, top, right, bottom] = [width, height, 0, 0];
    let matching = 0;
    for (let i = 0; i < pixels.length; i += 2) {
      left = Math.min(left, pixels[i]);
      right = Math.max(right, pixels[i]);
      top = Math.min(top, pixels[i + 1]);
      bottom = Math.max(bottom, pixels[i + 1]);
      matching += bare(pixels[i], pixels[i + 1]);
    }
    // A shape that hardly matches the board (the Moon: a plain circle over a drawing) is lit
    // whole; a square, only where it is bare.
    const whole = matching / (pixels.length / 2) < 0.5;
    const mask = document.createElement("canvas");
    mask.width = right - left + 1;
    mask.height = bottom - top + 1;
    const context = mask.getContext("2d");
    const shape = context.createImageData(mask.width, mask.height);
    for (let i = 0; i < pixels.length; i += 2) {
      const lit = whole ? 1 : bare(pixels[i], pixels[i + 1]);
      shape.data[((pixels[i + 1] - top) * mask.width + (pixels[i] - left)) * 4 + 3] = Math.round(255 * lit);
    }
    context.putImageData(shape, 0, 0);
    shapes.set(number, {
      left: (left / width) * 100,
      top: (top / height) * 100,
      width: (mask.width / width) * 100,
      height: (mask.height / height) * 100,
      mask: mask.toDataURL(),
    });
  });
  return shapes;
}

async function pixelsOf(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}
