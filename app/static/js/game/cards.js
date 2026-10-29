// The cards: what happens on a square, the wildcard star, the spy satellite, the shared
// decks, and the winner.

import { flyToTheMoon, playMinigame } from "../minigames.js";
import { sounds } from "../sounds.js";
import { createAvatar, placeName, renderTurn } from "./board.js";
import { shuffled, speak } from "./helpers.js";
import { elements, game, pack } from "./state.js";

// The confetti of the winner's screen: their colour and these.
const CONFETTI_COLORS = ["#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#c3a6ff", "#ffffff"];
const CONFETTI_PIECES = 90;

const CARD_TITLES = { good: "¡Qué suerte!", bad: "¡Oh, no!", challenge: "¡Reto!" };
const CARD_BUTTONS = { good: "¡Bien!", bad: "Vale…", challenge: "¡Hecho!" };

export function showBounce(bounced) {
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
  elements.minigameNext.hidden = true;
  elements.minigame.show();
  const won = await playMinigame(elements.minigameHost, createAvatar(player));
  elements.minigameNext.textContent = won ? "¡A la Luna!" : "Vale…";
  elements.minigameNext.hidden = false;
  await new Promise((resolve) => elements.minigameNext.addEventListener("click", resolve, { once: true }));
  elements.minigame.close();
  if (won) {
    await flyToTheMoon(createAvatar(player));
  }
  return won;
}

// A player with a wildcard star landed on a square it saves them from: they choose.
// Resolves to true if they used it (one star less, and nothing happens).
export function offerStar(player, square) {
  elements.starOfferEmoji.textContent = square.emoji;
  elements.starOfferTitle.textContent = square.title;
  elements.starOfferText.textContent = square.text;
  elements.starOfferStars.textContent = `${player.name}, tienes ${"⭐".repeat(player.stars)}. ¿Usas una estrella para librarte?`;
  sounds.bad();
  elements.starOffer.show();
  const stars = player.stars === 1 ? "una estrella" : `${player.stars} estrellas`;
  speak([square.title, square.text, `${player.name}, tienes ${stars}. ¿Usas una para librarte?`]);
  return new Promise((resolve) => {
    elements.starOffer.addEventListener(
      "close",
      () => {
        const used = elements.starOffer.returnValue === "use";
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
  elements.swapEmoji.textContent = square.emoji;
  elements.swapTitle.textContent = square.title;
  elements.swapText.textContent = square.text;
  const buttons = others.map((other) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swap__player";
    const name = document.createElement("span");
    name.className = "swap__name";
    name.textContent = other.name;
    const place = document.createElement("span");
    place.className = "swap__place";
    place.textContent = placeName(other.place);
    button.append(createAvatar(other), name, place);
    button.addEventListener("click", () => {
      elements.swap.returnValue = other.id;
      elements.swap.close(other.id);
    });
    return button;
  });
  elements.swapPlayers.replaceChildren(...buttons);
  sounds.good();
  elements.swap.returnValue = "";
  elements.swap.show();
  speak([square.title, square.text, "¿Con quién te cambias?"]);
  return new Promise((resolve) => {
    elements.swap.addEventListener(
      "close",
      () => resolve(others.find((other) => other.id === elements.swap.returnValue) ?? null),
      { once: true },
    );
  });
}

// The next card of a deck everybody shares ("challenges" or "questions"): none repeats
// until all have come out. An empty deck is shuffled again, never starting with the card
// that just came out.
export function drawFrom(name, cards = pack[name]) {
  game.decks[name] = game.decks[name] ?? { cards: [], last: null };
  const deck = game.decks[name];
  if (deck.cards.length === 0) {
    deck.cards = shuffled(cards);
    if (deck.cards.length > 1 && deck.cards[0] === deck.last) {
      deck.cards.push(deck.cards.shift());
    }
  }
  deck.last = deck.cards.shift();
  return deck.last;
}

export function showCard(card) {
  elements.card.dataset.kind = card.kind;
  elements.cardEmoji.textContent = card.emoji;
  elements.cardTitle.textContent = card.title ?? CARD_TITLES[card.kind];
  elements.cardText.textContent = card.text;
  elements.cardOk.textContent = card.button ?? CARD_BUTTONS[card.kind];
  sounds[card.kind](); // good, bad or challenge
  elements.card.show();
  speak([elements.cardTitle.textContent, card.text]);
  return new Promise((resolve) => {
    elements.card.addEventListener("close", resolve, { once: true });
  });
}

export function showWinner(player) {
  elements.turn.hidden = true;
  elements.winner.style.setProperty("--player-color", player.color);
  dropConfetti(player.color);
  elements.winnerAvatar.replaceChildren(createAvatar(player));
  elements.winnerTitle.textContent = `¡${player.name} ha llegado a la Luna! 🌕`;
  sounds.win();
  elements.winner.showModal();
  speak(elements.winnerTitle.textContent);
}

// Confetti in the winner's colour and others, each piece at its own place, pace and spin.
function dropConfetti(color) {
  const colors = [color, color, ...CONFETTI_COLORS];
  const pieces = Array.from({ length: CONFETTI_PIECES }, () => {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--fall", `${2.5 + Math.random() * 2.5}s`);
    piece.style.setProperty("--delay", `${-Math.random() * 5}s`); // already falling at the start
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 20}vw`);
    piece.style.setProperty("--spin", `${(Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720)}deg`);
    return piece;
  });
  elements.winnerConfetti.replaceChildren(...pieces);
}
