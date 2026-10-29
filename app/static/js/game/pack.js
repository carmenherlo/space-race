// Loading the game pack: api/games/<id> into `pack`, and the board picture.

import { renderPlainBoard, sizeTokens } from "./board.js";
import { setUpLights } from "./lights.js";
import { GAME_ID, elements, pack } from "./state.js";

// Fills `pack` from api/games/<id> and shows the board picture (or a plain board without one).
export async function loadPack() {
  const response = await fetch(`api/games/${encodeURIComponent(GAME_ID)}`, { cache: "no-store" });
  if (!response.ok) {
    const reason =
      response.status === 404
        ? `No existe el juego "${GAME_ID}" (falta content/games/${GAME_ID}/game.yaml).`
        : response.status === 503
          ? `El juego tiene un error en content/games/${GAME_ID}/game.yaml (los detalles salen en el registro del servidor).`
          : "No se ha podido cargar el juego.";
    throw new Error(reason);
  }
  const content = await response.json();
  pack.title = content.title;
  pack.places = content.places;
  pack.waitingPlace = content.waiting_place ?? null; // at the start, everybody but whose turn it is
  pack.goal = content.places.length - 1;
  sizeTokens();
  pack.squares = new Map(
    Object.entries(content.squares).map(([number, square]) => [
      Number(number),
      {
        kind: square.kind,
        emoji: square.emoji,
        title: square.title,
        text: square.text,
        goTo: square.go_to ?? undefined,
        move: square.move ?? undefined,
        backRoll: square.back_roll,
        again: square.again,
        skip: square.skip, // turns to miss
        othersMove: square.others_move ?? undefined,
        star: square.star,
        starSaves: square.star_saves,
        swap: square.swap,
        minigame: square.minigame,
        shine: square.shine,
        trail: square.trail ?? null,
      },
    ]),
  );
  pack.modes = new Map(content.modes.map((mode) => [mode.id, { exactFinish: mode.exact_finish }]));
  pack.backwardsCounts = content.backwards_counts;
  pack.maxStars = content.max_stars ?? Infinity;
  pack.voice = content.voice;
  pack.challenges = content.challenges.map((challenge) => ({ kind: "challenge", ...challenge }));
  pack.questions = content.questions.map((question) => ({ kind: "question", ...question }));

  document.title = pack.title;
  elements.setupTitle.textContent = `🚀 ${pack.title}`;
  if (content.image_url) {
    elements.boardImage.addEventListener("error", () => {
      elements.boardImage.hidden = true;
      renderPlainBoard();
    });
    elements.boardImage.src = content.image_url;
    elements.boardImage.hidden = false;
    await setUpLights(content);
  } else {
    renderPlainBoard();
  }
}
