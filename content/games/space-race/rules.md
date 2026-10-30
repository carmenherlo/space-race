# 🚀 Space Race — Normas del tablero

Lo propio de este tablero. Las normas comunes a todos (turnos, viajes, estrella, Luna,
modos, Sabelotodo) están en `content/games/rules.md`.

## El tablero

- **28 casillas** y la **Luna (29)**, la meta.
- Llegada exacta a la Luna, en Carrera y en Sabelotodo.
- Al retroceder, la casilla en la que caes cuenta.
- Sin estrella comodín.

## Casillas especiales

| Casilla | Nombre | Qué pasa |
|---|---|---|
| 5, 10, 15, 20 | 🌌 **Galaxia** | *"De galaxia a galaxia… ¡y viajo con magia!"* Saltas a la siguiente galaxia. No vuelves a tirar (con galaxias cada 5, un 5 cruzaría el tablero de golpe). |
| 25 | 🌌 **La última galaxia** | Te reta a un minijuego. Si ganas, ¡a la Luna! |
| 7 → 11 | 🛸 **Abducción** | Los ovnis te sueltan en la casilla 11. |
| 11 → 7 | 👽 **Botón equivocado** | El ovni te devuelve a la casilla 7. |
| 18 → 21 | 🛰️ **Héroe espacial** | Arreglas un satélite y avanzas a la 21. |
| 13 | ☄️ **Zona de meteoritos** | Vuelves a tirar y retrocedes lo que saques. |
| 17 | 🕳️ **Agujero negro** | Vuelves a Start here. |
| 24 | 🥳 **Fiesta en la base** | Pierdes 1 turno. |
| 29 | 🌕 **Luna** | ¡Meta! |

## Retos locos 🎭

Este tablero tiene sus retos (en su `game.yaml`), para el modo Retos locos.

## Los dibujos

En `lights/`, cada uno con el nombre de su parte en `game.yaml`: `squares.png` (solo las
casillas), `title.png`, `start.png`, `trail.png`, `moon.png`, `moon_sign.png`,
`moon_flags.png`, `moon_stars.png`. `moon_full.png` (la Luna entera) se guarda para más
adelante: no se usa.
