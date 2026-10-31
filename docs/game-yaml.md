# Cómo se escribe un juego (`game.yaml`)

Cada juego es una carpeta dentro de `content/games/`. El nombre de la carpeta es el id del juego:

```
content/
  games/
    general-rules.md las normas comunes a todos los tableros (una sola vez)
    square-types.yaml los tipos de casilla especial, para todos los tableros
    space-race/
      game.yaml      lo que lee el juego: las casillas, lo que pasa en ellas y las reglas
      rules.md       las normas de este tablero, para personas (misma plantilla en todos)
      board.webp     el dibujo del tablero (16:9, por ejemplo 1920x1080)
      lights/        opcional: las partes del tablero que se iluminan, del mismo tamaño
        squares.png    solo las casillas (squares_image)
        title.png, start.png, trail.png, moon.png, moon_sign.png, moon_flags.png, moon_stars.png
                       cada una con el nombre de su parte en lights
  questions/
    general.yaml     un banco de preguntas (cultura general), compartido por los juegos que lo nombran
```

Todos los juegos tienen la misma forma: lo que sabes de uno vale para todos.

- **`rules.md`** de cada juego: solo lo suyo (el tablero, sus casillas especiales y sus
  detalles), con la plantilla de `content/games/space-race/rules.md`. Lo que vale para todos
  los tableros va en `content/games/general-rules.md`, una sola vez.
- **Dibujos**: el tablero es `board.webp`; las luces, en `lights/`, con el nombre de su parte.

- Después de cambiar algo, hay que reiniciar la app (con Docker, `docker compose up -d --build`; con `bash dev.sh`, guardar un `.py` o reiniciarlo).
- Un error en un `game.yaml` solo desactiva ese juego: los demás siguen funcionando, y el menú lo marca como "Tiene un error".
- Si un campo no existe (por una errata), el juego no carga: así no pasan desapercibidas.
- Los textos van **entre comillas**: algunos llevan dos puntos (`:`), que YAML leería mal sin ellas.

Ejemplos completos: `content/games/space-race/game.yaml` (tablero corto) y
`content/games/space-race-expanded/game.yaml` (tablero largo).

---

## El juego

| Campo | Qué es |
|---|---|
| `title` | El nombre que sale en el menú. |
| `image` | El dibujo del tablero, en la carpeta del juego. Sin él, se dibuja un tablero sencillo de puntos numerados (se puede jugar igual). |
| `squares_image` | Opcional: el mismo dibujo con solo las casillas y la meta (lo demás transparente), del mismo tamaño. Sirve para iluminar la casilla de una ficha. |
| `lights` | Opcional: dibujos de partes del tablero que se iluminan, del mismo tamaño (lo demás transparente): `title`, `start`, `trail` (la estela), `moon`, `moon_sign` (el letrero), `moon_flags`, `moon_stars`. |
| `voice` | `true`: una voz lee las cartas y las preguntas (para quien aún no lee). El 🔊 la apaga. |
| `rocket` | Opcional: el cohete que trae cada ficha a la salida, dibujado donde se para, del mismo tamaño que el tablero (lo demás transparente). Mirando hacia arriba a la derecha, como el del tablero corto: el juego calcula su vuelo a partir del dibujo. |
| `waiting_place` | Opcional: `[x, y]` donde esperan las fichas en la salida mientras no es su turno; solo baja a la salida la que va a tirar. |
| `places` | Dónde está cada sitio en el dibujo: `[x, y]` en % del ancho y del alto. En orden: la salida, la casilla 1, 2, 3… y la meta (la Luna, el último). Otro tablero necesita los suyos. |

## Las reglas

Las reglas generales del juego valen para todos los modos; cada modo puede cambiar las suyas.

| Campo | Qué es |
|---|---|
| `modes` | Los modos que salen en el menú, en orden: `race` ("Carrera") y `questions` ("Sabelotodo"). Cada uno puede llevar sus reglas (ver abajo). |
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

Los **tipos de casilla** (galaxia, ovni, agujero negro…) están en un solo archivo para todos
los tableros: `content/games/square-types.yaml`. Cada tipo dice cómo es su carta y qué hace.
Cada tablero solo dice, por número de casilla, qué tipo hay y, si es un viaje, adónde lleva:

```yaml
squares:
  5:  { type: galaxy, go_to: 10 }
  16: { type: black_hole }
  52: { type: party, skip: 2 }   # lo que se escribe aquí manda sobre el tipo
```

- **Un tipo nuevo** se añade en `square-types.yaml`. Si en un tablero algo funciona distinto,
  se crea otro tipo (como `galaxy` y `galaxy_again`) o, si es un solo detalle, se escribe en
  esa casilla.
- **En el texto**, `{to}` es la casilla a la que lleva. La regla la añade el juego al final:
  "¡Vuelve a tirar!" (`again`) o "Pierdes el próximo turno." (`skip`), así que los textos no
  la dicen.

Los campos de un tipo (o de una casilla):

| Campo | Qué es |
|---|---|
| `type` | Solo en el tablero: el tipo de la casilla, de `square-types.yaml`. |
| `kind` | `good` o `bad`: el color de la carta. De una casilla mala (`bad`) te libra la estrella comodín. |
| `emoji`, `title`, `text` | Lo que enseña la carta (y lee la voz). |
| `go_to` | Salta a esa casilla (0 = la salida; la meta = ganas). |
| `trip` | Con `go_to`, cómo llega. Primero se ilumina la casilla de destino y luego: `fly`, la ficha vuela allí en arco dejando chispas (galaxias, héroe espacial); `wormhole`, se hunde girando en un remolino y sale girando por otro (agujeros de gusano, agujero negro); `teleport`, sube por un rayo de luz y baja por otro (abducciones); `nebula`, se difumina en una nube y sale de otra (nebulosa). Sin él, un vuelo rápido. |
| `move` | Avanza (+) o retrocede (−) esas casillas. |
| `back_roll` | `true`: tira el dado y retrocede lo que salga. |
| `swap` | `true`: puede cambiarse de sitio con el jugador que elija. |
| `minigame` | `true`: elige un minijuego (cometas, ruleta o despegue); si gana, ¡directo a la Luna! |
| `trail` | Con `minigame`: el camino a la Luna al ganar, puntos `[x, y]` en % del dibujo (como `places`). La ficha lo recorre dejando brillitos; sin él, vuela recta. |
| `again` | `true`: vuelve a tirar. |
| `skip` | Pierde turnos: `true` = 1, o un número (`skip: 2`). |
| `others_move` | Todos los DEMÁS avanzan (+) o retroceden (−) esas casillas. |
| `shine` | `true`: la ficha brilla al caer aquí (el aro como un anillo de oro). En las galaxias. |
| `star` | `true`: coge una estrella comodín ⭐. |

- Una casilla tiene como mucho una forma de moverte: `go_to`, `move`, `back_roll`, `swap` o `minigame`.
- Solo cuenta la casilla a la que llegas **con el dado**: a donde te manda un viaje (ovni, galaxia…) no hace nada, así nunca hay bucles.
- En "Sabelotodo" también cuentan, después de acertar la pregunta. "Vuelve a tirar" es tirar sin pregunta; quien pierde turnos tampoco tiene pregunta.

## Las preguntas (`questions`, modo "Sabelotodo")

Hay dos formas de dar las preguntas a un juego:

1. **El nombre de un banco compartido** (`content/questions/<nombre>.yaml`). Es lo que usan los
   dos tableros:

   ```yaml
   questions: general
   ```

   Para usar otro banco, se añade su archivo en `content/questions/` y se cambia esa línea.

2. **Sus propias preguntas**, en una lista con los mismos campos que un banco:

| Campo | Qué es |
|---|---|
| `emoji`, `text` | La pregunta. |
| `answer` | La respuesta correcta. |
| `wrong` | Tres respuestas incorrectas (en `very_easy` y `easy`, solo la otra de "Verdadero"/"Falso"). |
| `note` | Opcional: un dato curioso que sale al contestar. |
| `topic` | El tema: `animals` · `science` · `geography` · `history` · `art` · `general` (cultura general). |
| `level` | Niños: `very_easy` 🐣 (3 a 5 años; verdadero o falso, muchas de risa) · `kids_medium` 🐣🐣 (6 a 8 años) · `kids_hard` 🐣🐣🐣 (9 a 12 años). Adultos: `easy` ⭐ (verdadero o falso) · `medium` ⭐⭐ · `hard` ⭐⭐⭐. |

Cada jugador elige su nivel en el menú. Cada nivel tiene su mazo, compartido por todos: no se
repite ninguna pregunta hasta que han salido todas. Las preguntas, para leerlas
cómodamente y filtrarlas por nivel y tema: la página "Preguntas" del menú (`questions.html`).
