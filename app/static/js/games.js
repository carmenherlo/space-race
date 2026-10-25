// The games page (games.html): one card per board game in data/games (api/games, see
// app/game.py). A tap opens that game (game.html?game=its-id). A game whose game.yaml has
// a mistake is shown greyed out, so it is clear why it does not open.

const elements = {
  status: document.getElementById("status"),
  games: document.getElementById("games"),
  gameTemplate: document.getElementById("game-template"),
};

function renderGames(games) {
  const items = games.map((game) => {
    const node = elements.gameTemplate.content.firstElementChild.cloneNode(true);
    const card = node.querySelector(".game-card");
    node.querySelector(".game-card__title").textContent = game.title;
    const picture = node.querySelector(".game-card__picture");
    if (game.image_url) {
      const img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.src = game.image_url;
      picture.append(img);
    } else {
      picture.textContent = "🎲"; // a game without a board picture
    }
    if (game.available) {
      card.href = `game.html?game=${encodeURIComponent(game.id)}`;
    } else {
      card.setAttribute("aria-disabled", "true");
      node.querySelector(".game-card__problem").hidden = false;
    }
    return node;
  });
  elements.games.replaceChildren(...items);
}

function showStatus(message, error) {
  if (error) {
    console.error(error);
  }
  elements.status.textContent = message ?? "";
  elements.status.hidden = !message;
}

async function init() {
  try {
    const response = await fetch("api/games", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const games = await response.json();
    if (games.length === 0) {
      showStatus("No hay ningún juego preparado (falta la carpeta data/games).");
      return;
    }
    renderGames(games);
  } catch (error) {
    showStatus("No se han podido cargar los juegos.", error);
  }
}

init();
