# Cómo se escribe un juego (`game.yaml`)

Cada juego es una carpeta dentro de `data/games/`. El nombre de la carpeta es el id del juego:

```
data/
  games/
    space-race/
      game.yaml      las casillas, lo que pasa en ellas y las reglas
      board.webp     el dibujo del tablero (16:9, por ejemplo 1920x1080)
  questions/
    general.yaml     un banco de preguntas (cultura general), compartido por los juegos que lo nombran
    space.yaml       otro banco (preguntas del espacio), ahora sin usar
```

- Después de cambiar algo, hay que reiniciar la app (`docker compose restart`; con `bash dev.sh`, guardar un `.py` o reiniciarlo).
- Un error en un `game.yaml` solo desactiva ese juego: los demás siguen funcionando, y el menú lo marca como "Tiene un error".
- Si un campo no existe (por una errata), el juego no carga: así no pasan desapercibidas.
- Los textos van **entre comillas**: algunos llevan dos puntos (`:`), que YAML leería mal sin ellas.

Ejemplos completos: `examples/games/space-race/game.yaml` (tablero corto) y
`examples/games/space-race-expanded/game.yaml` (tablero largo).

---

## El juego

| Campo | Qué es |
|---|---|
| `title` | El nombre que sale en el menú. |
| `image` | El dibujo del tablero, en la carpeta del juego. Sin él, se dibuja un tablero sencillo de puntos numerados (se puede jugar igual). |
| `voice` | `true`: una voz lee las cartas y las preguntas (para quien aún no lee). El 🔊 la apaga. |
| `places` | Dónde está cada sitio en el dibujo: `[x, y]` en % del ancho y del alto. En orden: la salida, la casilla 1, 2, 3… y la meta (la Luna, el último). Otro tablero necesita los suyos. |

## Las reglas

Las reglas generales del juego valen para todos los modos; cada modo puede cambiar las suyas.

| Campo | Qué es |
|---|---|
| `modes` | Los modos que salen en el menú, en orden: `race` ("Carrera"), `questions` ("Sabelotodo") y `challenges` ("Retos locos"). Cada uno puede llevar sus reglas (ver abajo). |
| `exact_finish` | `true`: a la Luna solo con el número justo; si te pasas, rebotas. `false`: si te pasas, llegas igual. Sin él, se elige en el menú con el interruptor "Llegada exacta". |
| `backwards_counts` | Al retroceder (meteoritos, tormenta, rebote…): `true`, la casilla donde caes cuenta; `false`, te quedas ahí y ya está. |
| `max_stars` | Cuántas estrellas comodín puede llevar un jugador a la vez. Sin él, todas las que coja. |

Reglas de un modo, que mandan sobre las generales (de momento, `exact_finish`):

```yaml
modes:
  race:              # Carrera: con rebote
    exact_finish: true
  questions:         # Sabelotodo: sin rebote
    exact_finish: false
```

Si ningún modo cambia nada, vale la forma corta: `modes: [race, questions]`.

## Las casillas especiales (`squares`)

Por número de casilla. Lo que hace cada una:

| Campo | Qué es |
|---|---|
| `kind` | `good` o `bad`: el color de la carta. |
| `emoji`, `title`, `text` | Lo que enseña la carta (y lee la voz). |
| `go_to` | Salta a esa casilla (0 = la salida; la meta = ganas). |
| `move` | Avanza (+) o retrocede (−) esas casillas. |
| `back_roll` | `true`: tira el dado y retrocede lo que salga. |
| `swap` | `true`: puede cambiarse de sitio con el jugador que elija. |
| `again` | `true`: vuelve a tirar. |
| `skip` | Pierde turnos: `true` = 1, o un número (`skip: 2`). |
| `others_move` | Todos los DEMÁS avanzan (+) o retroceden (−) esas casillas. |
| `star` | `true`: coge una estrella comodín ⭐. |
| `star_saves` | `true`: con una estrella, puede usarla aquí y no le pasa nada. |

- Una casilla tiene como mucho una forma de moverte: `go_to`, `move`, `back_roll` o `swap`.
- Solo cuenta la casilla a la que llegas **con el dado**: a donde te manda un viaje (ovni, galaxia…) no hace nada, así nunca hay bucles.
- En "Sabelotodo" las casillas especiales no hacen nada.

## Los retos (`challenges`, modo "Retos locos")

Al final de un turno que acaba más adelante de donde empezó, un reto gracioso para hacer
delante de todos. Salen de un mazo barajado para todos: no se repite ninguno hasta que han
salido todos.

```yaml
challenges:
  - { emoji: "🥬", text: "Pon cara de lechuga hasta que alguien se ría." }
```

## Las preguntas (`questions`, modo "Sabelotodo")

O el nombre de un banco de preguntas compartido (`data/questions/<nombre>.yaml`):

```yaml
questions: general
```

Los dos tableros usan `general`. Para volver a las del espacio, cambia esa línea por
`questions: space` en su `game.yaml` (`data/games/space-race/` y `data/games/space-race-expanded/`)
y reinicia la app.

o las preguntas del propio juego, en una lista con los mismos campos que el banco:

| Campo | Qué es |
|---|---|
| `emoji`, `text` | La pregunta. |
| `answer` | La respuesta correcta. |
| `wrong` | Tres respuestas incorrectas (en `easy`, solo la otra de "Verdadero"/"Falso"). |
| `note` | Opcional: un dato curioso que sale al contestar. |
| `level` | `easy` ⭐ (verdadero o falso, los más pequeños) · `medium` ⭐⭐ (los que ya leen) · `hard` ⭐⭐⭐ (adultos). |

Cada jugador elige su nivel en el menú. Cada nivel tiene su mazo, compartido por todos: no se
repite ninguna pregunta hasta que han salido todas. Las preguntas, para leerlas cómodamente:
`docs/questions-general.md` (las que se usan) y `docs/questions.md` (las del espacio).
