// Before playing: who plays (avatars, names, levels), the mode and its rules, remembered
// on this device.

import { createAvatar } from "./board.js";
import { KIDS_LEVELS, LEVELS, LEVEL_NAMES, LEVEL_STARS, TRUE_FALSE_LEVELS } from "../levels.js";
import { OLD_LEVELS } from "./questions.js";
import { elements, game, pack } from "./state.js";

const MAX_PLAYERS = 6;
// Each seat's colour, for an avatar without its own (data/avatars/colors.yaml): the ring
// of their avatar, their token, their glow and their turn.
const PLAYER_COLORS = ["#c3a6ff", "#8fd3c7", "#ffb4a2", "#ffe08a", "#9cc7ff", "#f5a3d0"];
// The setup, remembered on this device for the next game (see saveSetup).
const SETUP_KEY = "space-race:setup";

export function showSetup() {
  renderChoices();
  renderSeats();
  elements.setup.showModal();
}

// The avatars still free, in full colour: a tap puts one in the game (it moves to the
// players, "2. Nombre y nivel"; a tap there takes it out). Without avatars, six coloured
// circles with a number instead.
function renderChoices() {
  const full = game.chosen.length >= MAX_PLAYERS;
  const buttons = choices().flatMap((avatar, index) => {
    if (game.chosen.includes(avatar.id)) {
      return [];
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "setup__choice";
    button.disabled = full;
    button.append(createAvatar(avatarPerson(avatar, index)));
    button.setAttribute("aria-label", `${avatarLabel(avatar.id)}: jugar`);
    button.addEventListener("click", () => choose(avatar.id));
    return [button];
  });
  elements.setupChoices.replaceChildren(...buttons);
  elements.start.disabled = game.chosen.length === 0;
}

// In the game, or out of it again.
function choose(id) {
  game.chosen = game.chosen.includes(id) ? game.chosen.filter((one) => one !== id) : [...game.chosen, id];
  saveSetup();
  renderChoices();
  renderSeats();
  renderSummary();
}

function avatarLabel(id) {
  return id.replace(/\.[^.]+$/, ""); // "pez-globo.png" → "pez-globo"
}

// What can be chosen: the avatars, or (without any) one numbered circle per seat.
export function choices() {
  if (pack.avatars.length > 0) {
    return pack.avatars;
  }
  return PLAYER_COLORS.map((color, index) => ({ id: `${index + 1}`, url: null, color }));
}

// One row per player, in turn order: their avatar (a tap takes it out of the game), their
// name (optional) and their stars.
function renderSeats() {
  const items = chosenPlayers().map((person, index) => {
    const id = game.chosen[index];
    const profile = profileOf(id);
    const node = elements.playerTemplate.content.firstElementChild.cloneNode(true);
    const avatar = node.querySelector(".setup__avatar");
    avatar.replaceChildren(createAvatar(person));
    avatar.setAttribute("aria-label", `${avatarLabel(id)}: no jugar`);
    avatar.addEventListener("click", () => choose(id));
    const name = node.querySelector(".setup__name");
    name.value = profile.name;
    name.placeholder = defaultName(index);
    name.setAttribute("aria-label", `Nombre del jugador ${index + 1}`);
    name.addEventListener("input", () => {
      profile.name = name.value;
      saveSetup();
    });
    const level = node.querySelector(".setup__level");
    renderLevel(level, person);
    level.addEventListener("click", () => {
      // ⭐ → ⭐⭐ → ⭐⭐⭐ → ⭐ …
      profile.level = LEVELS[(LEVELS.indexOf(profile.level) + 1) % LEVELS.length];
      saveSetup();
      renderLevel(level, chosenPlayers()[index]);
    });
    return node;
  });
  elements.setupPlayers.replaceChildren(...items);
}

function renderLevel(button, person) {
  button.textContent = LEVEL_STARS[person.level];
  button.setAttribute("aria-label", `Preguntas de nivel ${LEVEL_NAMES[person.level]} para ${person.name}`);
}

function defaultName(index) {
  return `Jugador ${index + 1}`;
}

function profileOf(id) {
  game.profiles[id] = game.profiles[id] ?? { name: "", level: "medium" };
  return game.profiles[id];
}

// An avatar as it looks before playing: its picture on its colour.
function avatarPerson(avatar, index) {
  return { name: avatar.id, color: avatar.color ?? PLAYER_COLORS[index % PLAYER_COLORS.length], photoUrl: avatar.url };
}

// Who plays, in turn order: their name (or "Jugador 2"), avatar, its colour, and level.
export function chosenPlayers() {
  const all = choices();
  return game.chosen.map((id, index) => {
    const avatar = all.find((one) => one.id === id);
    const profile = profileOf(id);
    return {
      id: `player-${index + 1}`,
      name: profile.name.trim() || defaultName(index),
      color: avatar.color ?? PLAYER_COLORS[index],
      photoUrl: avatar.url,
      level: profile.level,
    };
  });
}

// The last setup, checked so an old or broken one never stops the game: avatars that are
// gone are left out.
export function loadSetup() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(SETUP_KEY)) ?? {};
  } catch {
    saved = {}; // private mode or a broken value: start from nothing
  }
  const ids = choices().map((avatar) => avatar.id);
  const chosen = Array.isArray(saved.chosen) ? saved.chosen : [];
  game.chosen = [...new Set(chosen)].filter((id) => ids.includes(id)).slice(0, MAX_PLAYERS);
  const profiles = saved.profiles && typeof saved.profiles === "object" ? saved.profiles : {};
  game.profiles = {};
  for (const [id, profile] of Object.entries(profiles)) {
    const level = saved.levels ? profile?.level : OLD_LEVELS[profile?.level];
    game.profiles[id] = {
      name: typeof profile?.name === "string" ? profile.name.slice(0, 14) : "",
      level: LEVELS.includes(level) ? level : "medium",
    };
  }
  return { mode: saved.mode };
}

function saveSetup() {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify({ chosen: game.chosen, profiles: game.profiles, mode: chosenMode(), levels: LEVELS.length }));
  } catch {
    // private mode: nothing is remembered, the game still works
  }
}

// "ⓘ": every level, with who it is for ("Niños de 3 a 5 años", "Adultos, medio").
export function showLevelsInfo() {
  const rows = LEVELS.map((level) => {
    const row = document.createElement("li");
    const stars = document.createElement("span");
    stars.className = "levels-info__stars";
    stars.textContent = LEVEL_STARS[level];
    const name = LEVEL_NAMES[level];
    const who = KIDS_LEVELS.includes(level) ? name[0].toUpperCase() + name.slice(1) : `Adultos, ${name}`;
    const text = document.createElement("span");
    text.textContent = TRUE_FALSE_LEVELS.includes(level) ? `${who} · verdadero o falso` : who;
    row.append(stars, text);
    return row;
  });
  elements.levelsInfoList.replaceChildren(...rows);
  elements.levelsInfo.showModal();
}

export function chosenMode() {
  return document.querySelector('[data-mode][aria-checked="true"]')?.dataset.mode;
}

export function selectMode(chosen) {
  for (const mode of elements.modes) {
    mode.setAttribute("aria-checked", String(mode === chosen));
  }
  elements.setup.dataset.mode = chosen.dataset.mode; // the stars show only in "Sabelotodo"
  elements.exactOption.hidden = fixedExactFinish() !== null; // a switch only if not fixed
  renderSummary();
  saveSetup();
}

function optionIsOn(name) {
  const option = document.querySelector(`[data-option="${name}"]`);
  return option.getAttribute("aria-checked") === "true";
}

export function toggleOption(option) {
  const on = option.getAttribute("aria-checked") !== "true";
  option.setAttribute("aria-checked", String(on));
  renderSummary();
}

// How a turn goes, in a few words, with the mode and the rules chosen.
function renderSummary() {
  const mode = chosenMode();
  const moon = exactFinish()
    ? "🌕 Gana quien llega a la Luna con el número justo."
    : "🌕 Gana el primero que llega a la Luna.";
  const opening = game.chosen.length > 1 ? ["🎲 Primero, un sorteo decide el orden."] : [];
  if (mode === "questions") {
    elements.setupSummary.textContent = [
      ...opening,
      "🧠 En tu turno, una pregunta de tu nivel: si aciertas, tiras el dado y haces lo que dice tu casilla; si fallas, te quedas donde estás.",
      moon,
    ].join(" ");
    return;
  }
  const parts = [...opening];
  parts.push("🎲 Tiras y haces lo que dice tu casilla.");
  const squares = [...pack.squares.values()];
  parts.push(
    squares.some((square) => square.minigame)
      ? "🌌 Las galaxias te llevan a la siguiente galaxia, y la última te reta a un minijuego: si ganas, ¡a la Luna!"
      : squares.some((square) => square.goTo === pack.goal)
        ? "🌌 Las galaxias te llevan a la siguiente galaxia, y la última ¡a la Luna!"
        : "🌌 Las galaxias te llevan a la siguiente galaxia.",
  );
  if ([...pack.squares.values()].some((square) => square.star)) {
    parts.push("⭐ La estrella comodín te libra de una casilla mala.");
  }
  parts.push(moon);
  elements.setupSummary.textContent = parts.join(" ");
}

// The exact finish: fixed by the chosen mode (or the game), or chosen with its switch.
export function exactFinish() {
  return fixedExactFinish() ?? optionIsOn("exactFinish");
}

function fixedExactFinish() {
  return pack.modes.get(chosenMode())?.exactFinish ?? null;
}

// Only the modes and options of this game, starting with the mode chosen last time if this
// game has it. With a single mode and nothing to choose, the whole "3. Modo de juego"
// section goes away.
export function setUpRules(savedMode) {
  for (const mode of elements.modes) {
    mode.hidden = !pack.modes.has(mode.dataset.mode);
  }
  const visible = [...elements.modes].filter((mode) => !mode.hidden);
  selectMode(visible.find((mode) => mode.dataset.mode === savedMode) ?? visible.find((mode) => mode.dataset.mode === chosenMode()) ?? visible[0]);
  elements.modeSection.hidden = pack.modes.size === 1 && fixedExactFinish() !== null;
}
