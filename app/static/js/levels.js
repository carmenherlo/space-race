// The levels and topics of the questions (mode "Sabelotodo"), as app/game.py has them:
// chicks for kids, stars for grown-ups. Used by the game and by the questions page.

export const LEVELS = ["very_easy", "kids_medium", "kids_hard", "easy", "medium", "hard"];
export const LEVEL_STARS = {
  very_easy: "🐣",
  kids_medium: "🐣🐣",
  kids_hard: "🐣🐣🐣",
  easy: "⭐",
  medium: "⭐⭐",
  hard: "⭐⭐⭐",
};
export const LEVEL_NAMES = {
  very_easy: "niños de 3 a 5 años",
  kids_medium: "niños de 6 a 8 años",
  kids_hard: "niños de 9 a 12 años",
  easy: "fácil",
  medium: "medio",
  hard: "difícil",
};
export const KIDS_LEVELS = ["very_easy", "kids_medium", "kids_hard"];
// The levels whose questions are true or false.
export const TRUE_FALSE_LEVELS = ["very_easy", "easy"];

export const TOPICS = ["animals", "science", "geography", "history", "art", "general"];
export const TOPIC_NAMES = {
  animals: "🐾 Animales",
  science: "🔬 Ciencia",
  geography: "🌍 Geografía",
  history: "🏛️ Historia",
  art: "🎨 Arte",
  general: "💡 Cultura general",
};
