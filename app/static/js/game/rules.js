// The game's rules that need no page, no clock and no shared state: data in, the answer
// out. Whoever plays them (moves.js, board.js, turns.js…) shows them on the screen.

export const NEAR_MOON = 6; // squares: the Moon glows, the token glows, the music speeds up

// A move of `steps` squares from `place` (back for a negative number), one at a time,
// never before the start. At the goal it stops or, with the exact finish, bounces back
// what is left (like the Game of the Goose). Returns the squares it steps on, in order
// ({ place, bounce }: bounce on the first step back from the goal), and how many squares
// it bounced back.
export function walk(place, steps, goal, exactFinish) {
  const path = [];
  let direction = Math.sign(steps);
  let bounced = 0;
  for (let left = Math.abs(steps); left > 0; left -= 1) {
    let bounce = false;
    if (direction > 0 && place === goal) {
      if (!exactFinish) {
        break;
      }
      direction = -1;
      bounce = true;
    }
    if (direction < 0 && place === 0) {
      break;
    }
    place += direction;
    if (direction < 0 && steps > 0) {
      bounced += 1;
    }
    path.push({ place, bounce });
  }
  return { path, bounced };
}

// The final stretch: the last NEAR_MOON squares before the Moon, and the Moon.
export function isNearTheMoon(place, goal) {
  return place > 0 && goal - place <= NEAR_MOON;
}

export function placeName(place, goal) {
  return place === 0 ? "en la salida" : place === goal ? "en la Luna" : `casilla ${place}`;
}

// Everybody from the furthest on, each with their position (1, 2…); a tie shares it and
// keeps the turn order.
export function ranking(players) {
  const ranked = [...players].sort((a, b) => b.place - a.place);
  return ranked.map((player) => ({
    player,
    position: ranked.findIndex((other) => other.place === player.place) + 1,
  }));
}

// A shuffled copy of a list (Fisher–Yates: every order equally likely).
export function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// The next card of a deck everybody shares (`decks`: by name, { cards, last }): none
// repeats until all have come out. An empty deck is shuffled again, never starting with
// the card that just came out.
export function drawFrom(decks, name, cards) {
  decks[name] = decks[name] ?? { cards: [], last: null };
  const deck = decks[name];
  if (deck.cards.length === 0) {
    deck.cards = shuffled(cards);
    if (deck.cards.length > 1 && deck.cards[0] === deck.last) {
      deck.cards.push(deck.cards.shift());
    }
  }
  deck.last = deck.cards.shift();
  return deck.last;
}

// Which deck a question of `level` comes from: that level's, or all the questions if
// there are none of that level. Returns { name, cards }.
export function questionDeck(questions, level) {
  const ofLevel = questions.filter((question) => question.level === level);
  return ofLevel.length
    ? { name: `questions-${level}`, cards: ofLevel }
    : { name: "questions-any", cards: questions };
}
