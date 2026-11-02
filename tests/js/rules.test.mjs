// The game's pure rules (app/static/js/game/rules.js). Run: node --test tests/js/

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  NEAR_MOON,
  drawFrom,
  isNearTheMoon,
  placeName,
  questionDeck,
  ranking,
  shuffled,
  walk,
} from "../../app/static/js/game/rules.js";

const GOAL = 29;
const places = ({ path }) => path.map((step) => step.place);

describe("walk", () => {
  test("goes forward one square at a time", () => {
    const result = walk(3, 4, GOAL, false);
    assert.deepEqual(places(result), [4, 5, 6, 7]);
    assert.equal(result.bounced, 0);
    assert.ok(result.path.every((step) => !step.bounce));
  });

  test("goes back, never before the start", () => {
    assert.deepEqual(places(walk(5, -3, GOAL, false)), [4, 3, 2]);
    assert.deepEqual(places(walk(2, -5, GOAL, false)), [1, 0]);
    assert.deepEqual(places(walk(0, -2, GOAL, false)), []);
  });

  test("going back is not a bounce", () => {
    assert.equal(walk(10, -4, GOAL, true).bounced, 0);
  });

  test("without the exact finish, it stops at the Moon", () => {
    const result = walk(GOAL - 2, 5, GOAL, false);
    assert.deepEqual(places(result), [GOAL - 1, GOAL]);
    assert.equal(result.bounced, 0);
  });

  test("with the exact finish, it bounces back what is left", () => {
    const result = walk(GOAL - 2, 5, GOAL, true);
    assert.deepEqual(places(result), [GOAL - 1, GOAL, GOAL - 1, GOAL - 2, GOAL - 3]);
    assert.equal(result.bounced, 3);
    // The bounce sound goes with the first step back from the Moon, only.
    assert.deepEqual(result.path.map((step) => step.bounce), [false, false, true, false, false]);
  });

  test("the exact number reaches the Moon", () => {
    const result = walk(GOAL - 3, 3, GOAL, true);
    assert.equal(result.path.at(-1).place, GOAL);
    assert.equal(result.bounced, 0);
  });

  test("no steps, no move", () => {
    assert.deepEqual(walk(7, 0, GOAL, true), { path: [], bounced: 0 });
  });
});

test("near the Moon: the last NEAR_MOON squares and the Moon, never the start", () => {
  assert.equal(isNearTheMoon(GOAL - NEAR_MOON - 1, GOAL), false);
  assert.equal(isNearTheMoon(GOAL - NEAR_MOON, GOAL), true);
  assert.equal(isNearTheMoon(GOAL, GOAL), true);
  assert.equal(isNearTheMoon(0, 4), false); // a tiny board: the start never counts
});

test("place names", () => {
  assert.equal(placeName(0, GOAL), "en la salida");
  assert.equal(placeName(GOAL, GOAL), "en la Luna");
  assert.equal(placeName(12, GOAL), "casilla 12");
});

test("ranking: furthest first; a tie shares the position and keeps the turn order", () => {
  const [ana, leo, mia, eva] = [
    { name: "Ana", place: 3 },
    { name: "Leo", place: 7 },
    { name: "Mía", place: 3 },
    { name: "Eva", place: 1 },
  ];
  const ranked = ranking([ana, leo, mia, eva]);
  assert.deepEqual(
    ranked.map(({ player, position }) => [player.name, position]),
    [["Leo", 1], ["Ana", 2], ["Mía", 2], ["Eva", 4]],
  );
});

test("shuffled: the same cards, and the list itself is left alone", () => {
  const list = [1, 2, 3, 4, 5, 6];
  const copy = shuffled(list);
  assert.deepEqual(list, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...copy].sort(), list);
});

describe("drawFrom", () => {
  test("every card comes out once before any repeats", () => {
    const decks = {};
    const cards = ["a", "b", "c", "d"];
    const firstRound = cards.map(() => drawFrom(decks, "deck", cards));
    assert.deepEqual([...firstRound].sort(), cards);
  });

  test("a new round never starts with the card that just came out", () => {
    for (let tries = 0; tries < 200; tries += 1) {
      const decks = {};
      const drawn = Array.from({ length: 9 }, () => drawFrom(decks, "deck", [1, 2, 3]));
      drawn.forEach((card, i) => i > 0 && assert.notEqual(card, drawn[i - 1]));
    }
  });

  test("each deck goes on by itself", () => {
    const decks = {};
    drawFrom(decks, "easy", [1]);
    drawFrom(decks, "hard", [2]);
    assert.deepEqual(Object.keys(decks), ["easy", "hard"]);
  });
});

test("questionDeck: that level's questions, or all of them if there are none", () => {
  const questions = [{ level: "easy" }, { level: "easy" }, { level: "hard" }];
  assert.deepEqual(questionDeck(questions, "easy"), { name: "questions-easy", cards: questions.slice(0, 2) });
  assert.deepEqual(questionDeck(questions, "medium"), { name: "questions-any", cards: questions });
});
