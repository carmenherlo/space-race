// The profiles page (profiles.html): every avatar with its name and its question level,
// to change them. Each change is saved on the server (js/profiles.js) as it is made.

import { LEVEL_NAMES, LEVEL_STARS, LEVELS } from "./levels.js";
import { loadProfiles, saveProfile } from "./profiles.js";

const DEFAULT_LEVEL = "medium"; // as an avatar without a profile in the game's setup

const elements = {
  status: document.getElementById("status"),
  list: document.getElementById("list"),
  template: document.getElementById("profile-template"),
};

function renderProfile(avatar, profile) {
  const node = elements.template.content.firstElementChild.cloneNode(true);
  const picture = node.querySelector(".profile__avatar");
  picture.className = "profile__avatar avatar";
  picture.style.setProperty("--avatar-color", avatar.color ?? "#d6e4f5");
  const img = document.createElement("img");
  img.className = "avatar__photo";
  img.alt = "";
  img.decoding = "async";
  img.src = avatar.url;
  picture.append(img);

  const name = node.querySelector(".profile__name");
  name.value = profile.name;
  name.placeholder = "Sin nombre";
  name.setAttribute("aria-label", "Nombre");
  name.addEventListener("input", () => {
    profile.name = name.value;
    saveProfile(avatar.id, profile, { later: true });
  });

  const level = node.querySelector(".profile__level");
  const showLevel = () => {
    level.querySelector(".profile__stars").textContent = LEVEL_STARS[profile.level];
    level.querySelector(".profile__level-name").textContent = LEVEL_NAMES[profile.level];
    level.setAttribute("aria-label", `Nivel: ${LEVEL_NAMES[profile.level]}`);
  };
  level.addEventListener("click", () => {
    profile.level = LEVELS[(LEVELS.indexOf(profile.level) + 1) % LEVELS.length];
    showLevel();
    saveProfile(avatar.id, profile);
  });
  showLevel();
  return node;
}

function showStatus(message, error) {
  if (error) {
    console.error(error);
  }
  elements.status.textContent = message ?? "";
  elements.status.hidden = !message;
}

async function init() {
  let avatars = [];
  try {
    const response = await fetch("api/avatars", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    avatars = await response.json();
  } catch (error) {
    showStatus("No se han podido cargar los avatares.", error);
    return;
  }
  if (avatars.length === 0) {
    showStatus("No hay avatares (se ponen en data/avatars).");
    return;
  }
  const profiles = await loadProfiles();
  if (profiles === null) {
    showStatus("No se han podido cargar los perfiles.");
    return;
  }
  elements.list.replaceChildren(
    ...avatars.map((avatar) => {
      const saved = profiles[avatar.id];
      const level = LEVELS.includes(saved?.level) ? saved.level : DEFAULT_LEVEL;
      return renderProfile(avatar, { name: saved?.name ?? "", level });
    }),
  );
}

init();
