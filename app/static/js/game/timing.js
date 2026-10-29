// Timing: how long things take (behaviour the players like: keep them), and the game
// clock, which stops while paused.

import { game } from "./state.js";

export const DIE_ROLL_MS = 900; // the die keeps changing before it stops
export const DIE_NUMBER_MS = 1100; // then its number, big on the board, before the token moves
export const STEP_MS = 480; // a token hops one square (keep in sync with game.css)
export const FLIGHT_MS = 900; // a token flies to another square (keep in sync with game.css)
export const LAND_PAUSE_MS = 900; // the token rests on its square before a card shows, to see where
export const START_PAUSE_MS = 1500; // the board alone for a moment before the first turn
export const TURN_PAUSE_MS = 1100; // between two turns: the turn bar goes away, then comes back
export const TOKEN_CALL_MS = 1000; // a new turn: that player's token jumps (keep in sync with game.css)
export const TRAIL_STEP_MS = 380; // along the star trail to the Moon, from one point to the next (game.css)
export const MOON_ARRIVAL_MS = 1800; // the winner's token on the Moon, hopping for joy, before the celebration
export const BOARD_LOOK_MS = 2000; // "Sabelotodo", after a move: every token stands out, to see who is where
export const DRAW_SHUFFLES = 9; // who starts: the avatars change places this many times…
export const DRAW_SHUFFLE_MS = 140; // …this fast
export const DRAW_SHOW_MS = 2200; // then the order stays on the screen this long
export const IDLE_MS = 10 * 60 * 1000; // back to the home screen after 10 minutes untouched

// Waits `ms` of game time: while paused (⏸), the clock stops, so the whole game stops
// where it is (a token half way, the die rolling, the pause before a card…).
export function wait(ms) {
  return new Promise((resolve) => {
    let left = ms;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      if (!game.paused) {
        left -= now - last;
      }
      last = now;
      if (left <= 0) {
        resolve();
      } else {
        setTimeout(tick, Math.min(left, 50));
      }
    };
    setTimeout(tick, Math.min(ms, 50));
  });
}
