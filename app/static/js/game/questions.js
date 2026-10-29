// "Sabelotodo": the levels, the questions, and a turn (a question first; right, roll).

import { LEVEL_NAMES, LEVEL_STARS, TRUE_FALSE_LEVELS } from "../levels.js";
import { sounds } from "../sounds.js";
import { react, renderTurn } from "./board.js";
import { drawFrom, showBounce, showWinner } from "./cards.js";
import { shuffled, speak } from "./helpers.js";
import { moveBy, rollDie } from "./moves.js";
import { landOn } from "./squares.js";
import { currentPlayer, elements, game, pack } from "./state.js";
import { BOARD_LOOK_MS, LAND_PAUSE_MS, wait } from "./timing.js";
import { nextTurn } from "./turns.js";

// A setup remembered from before levels were saved (it had 4 others): each old level, as one of these.
export const OLD_LEVELS = { very_easy: "easy", easy: "medium", medium: "medium", hard: "hard" };
// True-or-false questions: these two answers, in this order, with a hand
// for those who cannot read yet.
const TRUE_FALSE = [
  { answer: "Verdadero", icon: "👍", tone: "true" }, // green
  { answer: "Falso", icon: "👎", tone: "false" }, // red
];

// The turn starts with a question of the player's level, by itself. Right: "¡A tirar el
// dado!" rolls it at once (see rollAfterQuestion). Wrong: they stay where they are, next
// player. A player who must miss turns (the party) gets no question (see nextTurn).
export async function askTurnQuestion() {
  game.busy = true;
  elements.die.disabled = true;
  await wait(700); // a moment to see whose turn it is
  const player = currentPlayer();
  const right = await askQuestion(drawQuestion(player.level));
  react(player, right ? "good" : "bad");
  if (!right) {
    nextTurn();
    return;
  }
  game.mayRoll = true;
  game.busy = false;
  rollAfterQuestion();
}

// Roll and move, and the square does what it says, as in "Carrera". "Roll again" (the
// galaxies): the die again, with no question (the prize of that square).
export async function rollAfterQuestion() {
  if (game.busy || !game.mayRoll) {
    return;
  }
  game.busy = true;
  game.mayRoll = false;
  const player = currentPlayer();
  const bounced = await moveBy(player, await rollDie());
  if (player.place === pack.goal) {
    showWinner(player);
    return;
  }
  let landed = true;
  if (bounced) {
    await wait(LAND_PAUSE_MS);
    await showBounce(bounced, player);
    landed = pack.backwardsCounts; // where the bounce leaves you may do nothing
  }
  if (landed) {
    const outcome = await landOn(player);
    if (player.place === pack.goal) {
      showWinner(player);
      return;
    }
    if (outcome.again) {
      game.mayRoll = true; // same player: tap the die
      game.busy = false;
      renderTurn();
      return;
    }
  }
  await lookAtTheBoard();
  nextTurn();
}

// A moment to see where everybody is before the next question: every token stands out.
async function lookAtTheBoard() {
  elements.tokens.dataset.look = "";
  await wait(BOARD_LOOK_MS);
  delete elements.tokens.dataset.look;
}

// A question of the player's level, from that level's deck (all the questions if the pack
// has none of that level).
function drawQuestion(level) {
  const ofLevel = pack.questions.filter((question) => question.level === level);
  return ofLevel.length
    ? drawFrom(`questions-${level}`, ofLevel)
    : drawFrom("questions-any", pack.questions);
}

// A question with its four answers in a new order each time. The player taps one; the game
// marks it (and the right one) and waits for "continue". Resolves to true if it was right.
function askQuestion(question) {
  elements.questionLevel.textContent = LEVEL_STARS[question.level];
  elements.questionLevel.setAttribute("aria-label", `Nivel ${LEVEL_NAMES[question.level]}`);
  elements.questionEmoji.textContent = question.emoji;
  elements.questionText.textContent = question.text;
  // True or false: always "Verdadero", "Falso". The others: four answers, shuffled.
  const trueFalse = TRUE_FALSE_LEVELS.includes(question.level);
  const options = trueFalse
    ? TRUE_FALSE
    : shuffled([question.answer, ...question.wrong]).map((answer) => ({ answer }));
  const answers = options.map(({ answer, icon, tone }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer";
    button.dataset.answer = answer;
    if (tone) {
      button.dataset.tone = tone;
    }
    button.textContent = icon ? `${icon} ${answer}` : answer;
    button.addEventListener("click", () => chooseAnswer(question, button));
    return button;
  });
  elements.questionAnswers.replaceChildren(...answers);
  elements.questionAnswers.dataset.kind = trueFalse ? "true-false" : "choice";
  elements.questionResult.hidden = true;
  elements.questionNext.hidden = true;
  delete elements.question.dataset.result; // nothing answered yet
  sounds.challenge();
  elements.question.show();
  // The question, then each answer in the order they are on the screen, with a pause
  // between them.
  speak(trueFalse ? [question.text, "¿Verdadero o falso?"] : [question.text, ...options.map(({ answer }) => answer)]);
  return new Promise((resolve) => {
    elements.question.addEventListener(
      "close",
      () => resolve(elements.question.dataset.result === "right"),
      { once: true },
    );
  });
}

function chooseAnswer(question, chosen) {
  const right = chosen.dataset.answer === question.answer;
  for (const button of elements.questionAnswers.children) {
    button.disabled = true; // one try
    if (button.dataset.answer === question.answer) {
      button.dataset.result = "right";
    }
  }
  if (!right) {
    chosen.dataset.result = "wrong";
  }
  chosen.dataset.chosen = ""; // the one they tapped stands out
  elements.question.dataset.result = right ? "right" : "wrong";
  const verdict = right ? "¡Correcto! 🎉" : `¡Casi! Era: ${question.answer}.`;
  elements.questionResult.textContent = question.note ? `${verdict} ${question.note}` : verdict;
  elements.questionResult.hidden = false;
  elements.questionNext.textContent = right ? "¡A tirar el dado!" : "Vale";
  elements.questionNext.hidden = false;
  speak(question.note ? [verdict, question.note] : verdict);
  if (right) {
    sounds.good();
  } else {
    sounds.bad();
  }
}
