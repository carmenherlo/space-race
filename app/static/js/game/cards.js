// The cards: what happens on a square, the wildcard star, the spy satellite, the shared
// decks, and the winner.

import { celebrate } from "../celebrations.js";
import { flyToTheMoon, playMinigame } from "../minigames.js";
import { silvered } from "../moon.js";
import { music, sounds } from "../sounds.js";
import { quiet } from "../voice.js";
import { createAvatar, react, renderTokens } from "./board.js";
import { speak } from "./helpers.js";
import { elementsOf } from "./dom.js";
import { placeName } from "./rules.js";
import { game, pack } from "./state.js";
import { moonShines } from "./lights.js";
import { MOON_ARRIVAL_MS, wait } from "./timing.js";
import { renderTurn } from "./turn-bar.js";

const dom = elementsOf({
  card: "card",
  cardEmoji: "card-emoji",
  cardTitle: "card-title",
  cardText: "card-text",
  cardOk: "card-ok",
  minigame: "minigame",
  minigameHost: "minigame-host",
  minigameNext: "minigame-next",
  starOffer: "star-offer",
  starOfferEmoji: "star-offer-emoji",
  starOfferTitle: "star-offer-title",
  starOfferText: "star-offer-text",
  starOfferStars: "star-offer-stars",
  starUse: "star-use",
  starKeep: "star-keep",
  swap: "swap",
  swapEmoji: "swap-emoji",
  swapTitle: "swap-title",
  swapText: "swap-text",
  swapPlayers: "swap-players",
  swapNone: "swap-none",
});

// The cards' buttons. The voice stops when a card closes; Escape does not skip a card: it
// waits for its button.
export function setUpCards() {
  dom.cardOk.addEventListener("click", () => dom.card.close());
  dom.starUse.addEventListener("click", () => dom.starOffer.close("use"));
  dom.starKeep.addEventListener("click", () => dom.starOffer.close("keep"));
  dom.swapNone.addEventListener("click", () => dom.swap.close(""));
  for (const dialog of [dom.card, dom.starOffer, dom.swap]) {
    dialog.addEventListener("close", quiet);
    dialog.addEventListener("cancel", (event) => event.preventDefault());
  }
}

const CARD_TITLES = { good: "¡Qué suerte!", bad: "¡Oh, no!" };
const CARD_BUTTONS = { good: "¡Bien!", bad: "Vale…" };

export function showBounce(bounced, player) {
  react(player, "bad");
  return showCard({
    kind: "bad",
    emoji: "🌕",
    title: "¡Rebote lunar!",
    text: `¡Casi! Te has pasado de la Luna y rebotas ${bounced} ${bounced === 1 ? "casilla" : "casillas"} hacia atrás. Hay que llegar con el número justo.`,
  });
}

// The last galaxy: the player chooses a minigame and plays it; won, the trip to the Moon on
// the whole screen. Resolves to true if they won (the token is not moved here).
export async function playMinigameFor(player) {
  dom.minigameNext.hidden = true;
  dom.minigame.show();
  const won = await playMinigame(dom.minigameHost, createAvatar(player));
  dom.minigameNext.textContent = won ? "¡A la Luna!" : "Vale…";
  dom.minigameNext.hidden = false;
  await new Promise((resolve) => dom.minigameNext.addEventListener("click", resolve, { once: true }));
  dom.minigame.close();
  if (won) {
    await flyToTheMoon(createAvatar(player));
  }
  return won;
}

// A player with a wildcard star landed on a square it saves them from: they choose.
// Resolves to true if they used it (one star less, and nothing happens).
export function offerStar(player, square) {
  dom.starOfferEmoji.textContent = square.emoji;
  dom.starOfferTitle.textContent = square.title;
  dom.starOfferText.textContent = square.text;
  dom.starOfferStars.textContent = `${player.name}, tienes ${"⭐".repeat(player.stars)}. ¿Usas una estrella para librarte?`;
  sounds.bad();
  dom.starOffer.show();
  const stars = player.stars === 1 ? "una estrella" : `${player.stars} estrellas`;
  speak([square.title, square.text, `${player.name}, tienes ${stars}. ¿Usas una para librarte?`]);
  return new Promise((resolve) => {
    dom.starOffer.addEventListener(
      "close",
      () => {
        const used = dom.starOffer.returnValue === "use";
        if (used) {
          player.stars -= 1;
          sounds.good();
          renderTurn();
        }
        resolve(used);
      },
      { once: true },
    );
  });
}

// The spy satellite: the player sees where everybody is and taps who to swap places with,
// or stays. Resolves to the chosen player, or null.
export function chooseSwap(player, square, others) {
  dom.swapEmoji.textContent = square.emoji;
  dom.swapTitle.textContent = square.title;
  dom.swapText.textContent = square.text;
  const buttons = others.map((other) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swap__player";
    const name = document.createElement("span");
    name.className = "swap__name";
    name.textContent = other.name;
    const place = document.createElement("span");
    place.className = "swap__place";
    place.textContent = placeName(other.place, pack.goal);
    button.append(createAvatar(other), name, place);
    button.addEventListener("click", () => {
      dom.swap.returnValue = other.id;
      dom.swap.close(other.id);
    });
    return button;
  });
  dom.swapPlayers.replaceChildren(...buttons);
  sounds.good();
  dom.swap.returnValue = "";
  dom.swap.show();
  speak([square.title, square.text, "¿Con quién te cambias?"]);
  return new Promise((resolve) => {
    dom.swap.addEventListener(
      "close",
      () => resolve(others.find((other) => other.id === dom.swap.returnValue) ?? null),
      { once: true },
    );
  });
}

export function showCard(card) {
  dom.card.dataset.kind = card.kind;
  dom.cardEmoji.replaceChildren(...silvered(card.emoji));
  dom.cardTitle.textContent = card.title ?? CARD_TITLES[card.kind];
  dom.cardText.textContent = card.text;
  dom.cardOk.textContent = card.button ?? CARD_BUTTONS[card.kind];
  sounds[card.kind](); // good or bad
  dom.card.show();
  speak([dom.cardTitle.textContent, card.text]);
  return new Promise((resolve) => {
    dom.card.addEventListener("close", resolve, { once: true });
  });
}

// Someone reached the Moon: first everybody sees their token there, hopping for joy, then
// the celebration (js/celebrations.js: the podium, up to the Moon, the traca, fireworks).
// Resolves when they tap "¡Otra partida!".
export async function showWinner(player) {
  renderTokens();
  react(player, "good");
  sounds.good();
  await Promise.all([wait(MOON_ARRIVAL_MS), moonShines()]); // the Moon shines with them
  music.pause(); // the celebration has its own tune
  const others = game.players
    .filter((other) => other !== player)
    .sort((a, b) => b.place - a.place)
    .map((other) => ({ name: other.name, avatar: createAvatar(other) }));
  const title = `¡${player.name} ha llegado a la Luna!`;
  speak(title);
  await celebrate("rise", { name: player.name, avatar: createAvatar(player) }, others, "¡Otra partida!", { exit: "games.html" });
}
