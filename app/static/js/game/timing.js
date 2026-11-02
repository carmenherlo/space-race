// Timing: how long things take (behaviour the players like: keep them), and the game
// clock, which stops while paused.

import { createClock } from "../effects/clock.js";
import { game } from "./state.js";

export const DIE_ROLL_MS = 900; // the die keeps changing before it stops
export const DIE_NUMBER_MS = 1100; // then its number, big on the board, before the token moves
export const SHINE_MS = 1700; // a token shines (shine in board.js; game.css)
export const MOOD_MS = 1200; // a token's hop of joy or tremble (react in board.js; game.css)
export const MOON_SHINE_MS = 2600; // the Moon shining strongly (lights.js; board-light-shine in game.css)
export const STEP_MS = 480; // a token hops one square (keep in sync with game.css)
export const FLIGHT_MS = 900; // a token flies to another square (keep in sync with game.css)
export const TRIP_TARGET_MS = 1100; // a trip "fly": the square it goes to lit up, before the flight…
export const TRIP_FLIGHT_MS = 1600; // …then the flight there, in an arc
export const WORMHOLE_MS = 900; // a trip "wormhole": into the swirl, and the same out of the other one
export const TELEPORT_MS = 900; // a trip "teleport": up the beam, and the same down the other one
export const NEBULA_MS = 900; // a trip "nebula": lost in the cloud, and the same out of the other one
export const HOP_MS = 550; // the solar storm: each jump of the tokens it moves
export const STAR_MS = 1300; // a wildcard star flies to the token that gets it
export const LAND_PAUSE_MS = 900; // the token rests on its square before a card shows, to see where
export const START_PAUSE_MS = 1500; // the board alone for a moment before the first turn
export const TURN_PAUSE_MS = 1100; // between two turns: the turn bar goes away, then comes back
export const ROCKET_IN_MS = 1500; // the rocket of the start comes in, braking (rocket.js)…
export const ROCKET_WIGGLE_MS = 900; // …wiggles…
export const ROCKET_DROP_MS = 700; // …drops the token on the start…
export const ROCKET_LANDED_MS = 350; // …waits a moment…
export const ROCKET_OUT_MS = 1200; // …and flies away
export const TURN_START_MS = 700; // a new turn: a moment to see whose it is, before a question or a missed-turn card
export const TURN_CALL_MS = 1800; // a new turn: "¡Te toca, …!", big, before anything else
export const TOKEN_CALL_MS = 1000; // a new turn: that player's token jumps (keep in sync with game.css)
export const TRAIL_STEP_MS = 380; // along the star trail to the Moon, from one point to the next (game.css)
export const MINIGAME_WON_MS = 1500; // the last galaxy's minigame won: "¡Directo a la Luna!", before the trip
export const MOON_ARRIVAL_MS = 1800; // the winner's token on the Moon, hopping for joy, before the celebration
export const RIGHT_ANSWER_MS = 2000; // "Sabelotodo", right: the card closes by itself after this…
export const READ_CHAR_MS = 70; // …and this for each letter of "¡Correcto!" and its note (time to read or hear it)
export const BOARD_LOOK_MS = 2000; // "Sabelotodo", after a move: every token stands out, to see who is where
export const DRAW_SHUFFLES = 9; // who starts: the avatars change places this many times…
export const DRAW_SHUFFLE_MS = 140; // …this fast
export const DRAW_SHOW_MS = 2200; // then the order stays on the screen this long
export const IDLE_MS = 10 * 60 * 1000; // back to the home screen after 10 minutes untouched

// The game clock: while paused (⏸), it stops, so the whole game stops where it is (a
// token half way, the die rolling, the pause before a card…). wait(ms) waits on it;
// animate(ms, step) calls step(t) with t from 0 to 1 on it.
export const clock = createClock(() => game.paused);
export const { wait, animate } = clock;
