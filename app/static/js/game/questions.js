// "Sabelotodo": the levels, the questions, and the question that starts each turn.

import { LEVEL_NAMES, LEVEL_STARS, TOPIC_NAMES, TRUE_FALSE_LEVELS } from "../levels.js";
import { silvered } from "../moon.js";
import { sounds } from "../sounds.js";
import { quiet } from "../voice.js";
import { createAvatar, react } from "./board.js";
import { drawFrom } from "./cards.js";
import { shuffled, speak } from "./helpers.js";
import { elementsOf } from "./dom.js";
import { currentPlayer, game, pack } from "./state.js";
import { READ_CHAR_MS, RIGHT_ANSWER_MS, TURN_START_MS, wait } from "./timing.js";
import { allowRoll, renderTurn } from "./turn-bar.js";
import { nextTurn } from "./turns.js";

const dom = elementsOf({
  question: "question",
  questionEmoji: "question-emoji",
  questionText: "question-text",
  questionLevel: "question-level",
  questionTopic: "question-topic",
  questionWho: "question-who",
  questionQuiet: "question-quiet",
  questionAnswers: "question-answers",
  questionResult: "question-result",
  questionNext: "question-next",
});

// A setup remembered from before levels were saved (it had 4 others): each old level, as one of these.
export const OLD_LEVELS = { very_easy: "easy", easy: "medium", medium: "medium", hard: "hard" };
// True-or-false questions: these two answers, in this order, with a hand
// for those who cannot read yet.
const TRUE_FALSE = [
  { answer: "Verdadero", icon: "👍", tone: "true" }, // green
  { answer: "Falso", icon: "👎", tone: "false" }, // red
];

// The question's buttons ("Vale", and 🔇 to stop the voice). The voice stops when it
// closes; Escape does not skip it: it waits for its answer.
export function setUpQuestions() {
  dom.questionNext.addEventListener("click", () => dom.question.close());
  dom.questionQuiet.addEventListener("click", quiet);
  dom.question.addEventListener("close", quiet);
  dom.question.addEventListener("cancel", (event) => event.preventDefault());
}

// The turn starts with a question of the player's level, by itself (see beginTurn in
// turns.js). Right: the die is theirs, they tap it (see roll.js); it is always the die that
// rolls, never a button on a card. Wrong: they stay where they are, next player.
export async function askTurnQuestion() {
  game.busy = true;
  allowRoll(false);
  await wait(TURN_START_MS);
  const player = currentPlayer();
  const right = await askQuestion(drawQuestion(player.level));
  if (!right) {
    await react(player, "bad"); // a tremble, still with its pulse, then the next one
    nextTurn();
    return;
  }
  react(player, "good");
  game.mayRoll = true;
  game.busy = false;
  renderTurn(); // the die on: tap it
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
  dom.questionLevel.textContent = LEVEL_STARS[question.level];
  dom.questionLevel.setAttribute("aria-label", `Nivel ${LEVEL_NAMES[question.level]}`);
  dom.questionTopic.textContent = TOPIC_NAMES[question.topic];
  const player = currentPlayer();
  const name = document.createElement("span");
  name.textContent = player.name;
  dom.question.style.setProperty("--player-color", player.color); // its border and who answers
  dom.questionWho.replaceChildren(createAvatar(player), name);
  dom.questionEmoji.replaceChildren(...silvered(question.emoji));
  dom.questionText.textContent = question.text;
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
  dom.questionAnswers.replaceChildren(...answers);
  dom.questionAnswers.dataset.kind = trueFalse ? "true-false" : "choice";
  dom.questionResult.hidden = true;
  dom.questionNext.hidden = true;
  delete dom.question.dataset.result; // nothing answered yet
  dom.questionQuiet.hidden = !pack.voice; // 🔇 only in a game with a voice
  sounds.quiz();
  dom.question.show();
  // The question, then each answer in the order they are on the screen, with a pause
  // between them.
  speak(trueFalse ? [question.text, "¿Verdadero o falso?"] : [question.text, ...options.map(({ answer }) => answer)]);
  return new Promise((resolve) => {
    dom.question.addEventListener(
      "close",
      () => resolve(dom.question.dataset.result === "right"),
      { once: true },
    );
  });
}

// Right: the card closes by itself (longer with a note to read), so the next tap is the die.
// Wrong: "Vale", once they have seen the right answer.
async function chooseAnswer(question, chosen) {
  const right = chosen.dataset.answer === question.answer;
  for (const button of dom.questionAnswers.children) {
    button.disabled = true; // one try
    if (button.dataset.answer === question.answer) {
      button.dataset.result = "right";
    }
  }
  if (!right) {
    chosen.dataset.result = "wrong";
  }
  chosen.dataset.chosen = ""; // the one they tapped stands out
  dom.question.dataset.result = right ? "right" : "wrong";
  const verdict = right ? "¡Correcto! 🎉" : `¡Casi! Era: ${question.answer}.`;
  dom.questionResult.textContent = question.note ? `${verdict} ${question.note}` : verdict;
  dom.questionResult.hidden = false;
  dom.questionNext.textContent = "Vale";
  dom.questionNext.hidden = right;
  speak(question.note ? [verdict, question.note] : verdict);
  if (!right) {
    sounds.bad();
    return;
  }
  sounds.good();
  await wait(RIGHT_ANSWER_MS + dom.questionResult.textContent.length * READ_CHAR_MS);
  if (chosen.isConnected && dom.question.open) { // still this question (not a new game)
    dom.question.close();
  }
}
