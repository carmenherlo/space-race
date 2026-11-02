// A clock that can be paused: every wait and animation made with it stops while
// isPaused() is true, and goes on from where it was. It knows nothing of who pauses it.

const TICK_MS = 50; // how often a wait checks the pause
const FRAME_MS = 16; // one animation frame

export function createClock(isPaused = () => false) {
  // Waits `ms` of clock time (paused time does not count).
  function wait(ms) {
    return new Promise((resolve) => {
      let left = ms;
      let last = performance.now();
      const tick = () => {
        const now = performance.now();
        if (!isPaused()) {
          left -= now - last;
        }
        last = now;
        if (left <= 0) {
          resolve();
        } else {
          setTimeout(tick, Math.min(left, TICK_MS));
        }
      };
      setTimeout(tick, Math.min(ms, TICK_MS));
    });
  }

  // Calls step(t) with t from 0 to 1 for `ms` of clock time, and step(1) at the end.
  async function animate(ms, step) {
    for (let time = 0; time < ms; time += FRAME_MS) {
      step(time / ms);
      await wait(FRAME_MS);
    }
    step(1);
  }

  return { wait, animate };
}
