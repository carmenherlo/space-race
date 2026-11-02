// The effects library's maths and clock (app/static/js/effects/). Run: node --test tests/js/

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createClock } from "../../app/static/js/effects/clock.js";
import { arcTop, curvePoint, easeInOut, easeOut, hopPoint, swell } from "../../app/static/js/effects/motion.js";

const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, message ?? `${actual} ≠ ${expected}`);

describe("motion", () => {
  test("easings start at 0 and end at 1", () => {
    for (const ease of [easeInOut, easeOut]) {
      close(ease(0), 0);
      close(ease(1), 1);
    }
    close(easeInOut(0.5), 0.5); // slow, fast, slow: half way at half the time
    assert.ok(easeOut(0.5) > 0.5); // fast first
  });

  test("swell: 1 at the ends, 1 + amount half way", () => {
    close(swell(0, 0.7), 1);
    close(swell(1, 0.7), 1);
    close(swell(0.5, 0.7), 1.7);
  });

  test("an arc's top is over the middle, higher the further it goes", () => {
    const [x, y] = arcTop([10, 50], [30, 50]);
    close(x, 20);
    assert.ok(y < 50); // up is a smaller y
    const [, farY] = arcTop([10, 50], [60, 50]);
    assert.ok(farY < y);
  });

  test("the aspect counts a distance the same whichever way it goes", () => {
    // On a 16:9 board, 16% of the width is as long as 16 / (9/16) % of the height: both
    // arcs rise the same over their middle.
    const aspect = 9 / 16;
    const across = 50 - arcTop([0, 50], [16, 50], { aspect })[1];
    const down = 16 / aspect;
    const up = (20 + down / 2) - arcTop([0, 20], [0, 20 + down], { aspect })[1];
    close(across, up);
  });

  test("a curve starts and ends where it should", () => {
    const from = [5, 80];
    const to = [70, 20];
    const top = arcTop(from, to);
    assert.deepEqual(curvePoint(from, top, to, 0), from);
    assert.deepEqual(curvePoint(from, top, to, 1), to);
  });

  test("a hop goes up `lift` half way and lands on its square", () => {
    assert.deepEqual(hopPoint([10, 50], [14, 50], 0, 7), [10, 50]);
    assert.deepEqual(hopPoint([10, 50], [14, 50], 1, 7), [14, 50]);
    const [x, y] = hopPoint([10, 50], [14, 50], 0.5, 7);
    close(x, 12);
    close(y, 43);
  });
});

describe("clock", () => {
  test("wait takes about that long", async () => {
    const clock = createClock();
    const start = performance.now();
    await clock.wait(120);
    const took = performance.now() - start;
    assert.ok(took >= 115 && took < 300, `took ${took} ms`);
  });

  test("while paused, a wait stops, and goes on after", async () => {
    let paused = false;
    const clock = createClock(() => paused);
    setTimeout(() => (paused = true), 30);
    setTimeout(() => (paused = false), 330);
    const start = performance.now();
    await clock.wait(120);
    const took = performance.now() - start;
    assert.ok(took >= 400, `took only ${took} ms: the pause did not stop it`);
  });

  test("animate goes from 0 to 1, always forward", async () => {
    const clock = createClock();
    const steps = [];
    await clock.animate(80, (t) => steps.push(t));
    assert.equal(steps[0], 0);
    assert.equal(steps.at(-1), 1);
    assert.ok(steps.every((t, i) => i === 0 || t >= steps[i - 1]));
  });
});
