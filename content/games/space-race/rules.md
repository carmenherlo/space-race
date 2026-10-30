# 🚀 Space Race — Normas del tablero

Lo propio de este tablero. Las normas comunes a todos (turnos, viajes, estrella, Luna,
modos, Sabelotodo) están en `content/games/general-rules.md`.

## El tablero

- **28 casillas** y la **Luna (29)**, la meta.
- Llegada exacta a la Luna, en Carrera y en Sabelotodo.
- Al retroceder, la casilla en la que caes cuenta.
- Una **estrella comodín** a la vez.

## Casillas especiales

| Casilla | Nombre | Qué pasa |
|---|---|---|
| 2 | 🚀 **Propulsores** | Vuelves a tirar. |
| 4 ↔ 12 | 🌀 **Agujero de gusano** | Saltas al otro agujero (de la 4 a la 12 o de la 12 a la 4) y vuelves a tirar. |
| 5, 10, 15, 20 | 🌌 **Galaxia** | *"De galaxia a galaxia… ¡y acelero con magia!"* Saltas a la siguiente galaxia. No vuelves a tirar (con galaxias cada 5, un 5 cruzaría el tablero de golpe). |
| 7 ↔ 11 | 🛸 **Abducción** | El ovni te lleva al otro ovni: de la 7 a la 11 o de la 11 a la 7. **No vuelves a tirar**. |
| 13 | ☄️ **Zona de meteoritos** | Vuelves a tirar y retrocedes lo que saques. |
| 14 | ⭐ **Estrella comodín** | Coges una estrella, si no tienes ya una. |
| 16 | 🕳️ **Agujero negro** | Vuelves a Start here. |
| 17 | 🔭 **Satélite espía** | Si quieres, cambias tu posición con el jugador que elijas. |
| 18 → 21 | 🛰️ **Héroe espacial** | Arreglas un satélite y avanzas a la 21. |
| 22 | ☀️ **Tormenta solar** | Todos los demás retroceden 1 casilla (sin que su casilla cuente). |
| 23 | 🌫️ **Perdido en la nebulosa** | Vuelves a la casilla 19. |
| 24 | 🥳 **Fiesta en la base** | Pierdes 1 turno. |
| 25 | 🌌 **La última galaxia** | Te reta a un minijuego. Si ganas, ¡a la Luna! |
| 29 | 🌕 **Luna** | ¡Meta! |

## La estrella comodín ⭐

Te libra de **todas las casillas malas**: agujero de gusano hacia atrás (12), ovni hacia atrás
(11), meteoritos (13), agujero negro (16), nebulosa (23) y fiesta (24).

## Los dibujos

En `lights/`, cada uno con el nombre de su parte en `game.yaml`: `squares.png` (solo las
casillas), `title.png`, `start.png`, `trail.png`, `moon.png`, `moon_sign.png`,
`moon_flags.png`, `moon_stars.png`. `moon_full.png` (la Luna entera) se guarda para más
adelante: no se usa.
