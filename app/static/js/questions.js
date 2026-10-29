// The questions page (questions.html): every question of a game (api/games/<id>), to
// read and check them, filtered by level and topic. The game is ?game=<id>, else the
// first one that works. The filters are remembered on this device.

import { KIDS_LEVELS, LEVEL_NAMES, LEVEL_STARS, LEVELS, TOPIC_NAMES, TOPICS } from "./levels.js";

const FILTERS_KEY = "space-race:questions-filters";
const ADULT_LEVELS = LEVELS.filter((level) => !KIDS_LEVELS.includes(level));
// What the level buttons choose: everything, the kids', the grown-ups', or one level.
const LEVEL_GROUPS = [
  { id: "all", label: "Todas", levels: LEVELS },
  { id: "kids", label: "Niños", levels: KIDS_LEVELS },
  { id: "adults", label: "Adultos", levels: ADULT_LEVELS },
  ...LEVELS.map((level) => ({ id: level, label: LEVEL_STARS[level], title: LEVEL_NAMES[level], levels: [level] })),
];
// How they are shown: "Todas", then a block for the kids and one for the grown-ups.
const LEVEL_ROW = [["all"], ["kids", ...KIDS_LEVELS], ["adults", ...ADULT_LEVELS]];

const elements = {
  status: document.getElementById("status"),
  levels: document.getElementById("levels"),
  topics: document.getElementById("topics"),
  summary: document.getElementById("summary"),
  list: document.getElementById("list"),
  template: document.getElementById("question-template"),
};

let questions = [];
let filters = { level: "all", topic: "all" };

function loadFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(FILTERS_KEY) ?? "{}");
    if (LEVEL_GROUPS.some((group) => group.id === saved.level)) filters.level = saved.level;
    if (saved.topic === "all" || TOPICS.includes(saved.topic)) filters.topic = saved.topic;
  } catch {
    // private mode or a broken value: all of them
  }
}

function saveFilters() {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // private mode: nothing is remembered
  }
}

// A filter button, pressed when chosen.
function filterButton(choice, chosen, choose) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter";
  button.textContent = choice.label;
  button.setAttribute("aria-pressed", String(choice.id === chosen));
  if (choice.title) button.title = choice.title;
  button.addEventListener("click", () => choose(choice.id));
  return button;
}

function render() {
  const group = LEVEL_GROUPS.find((one) => one.id === filters.level);
  const ofLevel = questions.filter((question) => group.levels.includes(question.level));
  const shown = filters.topic === "all" ? ofLevel : ofLevel.filter((question) => question.topic === filters.topic);

  elements.levels.replaceChildren(
    ...LEVEL_ROW.map((ids) => {
      const block = document.createElement("span");
      block.className = "filters__block";
      block.append(
        ...ids.map((id) => filterButton(LEVEL_GROUPS.find((one) => one.id === id), filters.level, (level) => choose({ level }))),
      );
      return block;
    }),
  );
  const topics = [{ id: "all", label: "Todos los temas" }, ...TOPICS.map((topic) => ({ id: topic, label: TOPIC_NAMES[topic] }))];
  elements.topics.replaceChildren(...topics.map((topic) => filterButton(topic, filters.topic, (id) => choose({ topic: id }))));

  const trueOnes = shown.filter((question) => question.answer === "Verdadero").length;
  const falseOnes = shown.filter((question) => question.answer === "Falso").length;
  elements.summary.textContent =
    `${shown.length} preguntas` + (trueOnes + falseOnes ? ` · 👍 ${trueOnes} verdaderas · 👎 ${falseOnes} falsas` : "");

  elements.list.replaceChildren(...shown.map(renderQuestion));
}

function renderQuestion(question) {
  const node = elements.template.content.firstElementChild.cloneNode(true);
  node.querySelector(".question-item__emoji").textContent = question.emoji;
  node.querySelector(".question-item__text").textContent = question.text;
  const answers = node.querySelector(".question-item__answers");
  const right = document.createElement("span");
  right.className = "question-item__right";
  right.textContent = `✅ ${question.answer}`;
  answers.append(right, ...question.wrong.map((wrong) => `  ❌ ${wrong}`));
  if (question.note) {
    const note = node.querySelector(".question-item__note");
    note.textContent = `💡 ${question.note}`;
    note.hidden = false;
  }
  const tags = node.querySelector(".question-item__tags");
  tags.textContent = `${LEVEL_STARS[question.level]}  ${TOPIC_NAMES[question.topic]}`;
  tags.title = LEVEL_NAMES[question.level];
  return node;
}

function choose(change) {
  filters = { ...filters, ...change };
  saveFilters();
  render();
}

function showStatus(message, error) {
  if (error) {
    console.error(error);
  }
  elements.status.textContent = message ?? "";
  elements.status.hidden = !message;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function init() {
  loadFilters();
  try {
    let id = new URLSearchParams(location.search).get("game");
    if (!id) {
      const games = await fetchJson("api/games");
      id = games.find((game) => game.available)?.id;
    }
    if (!id) {
      showStatus("No hay ningún juego preparado.");
      return;
    }
    const pack = await fetchJson(`api/games/${encodeURIComponent(id)}`);
    questions = pack.questions;
    render();
  } catch (error) {
    showStatus("No se han podido cargar las preguntas.", error);
  }
}

init();
