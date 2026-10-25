# Prompt de inicio para Claude Code

Abrir una sesión nueva de Claude Code en esta carpeta (`games/space-race`) y decirle:
**"Lee `docs/prompt-inicio.md` y haz lo que pide."**

---

## Qué es este proyecto

Independizar el **juego de mesa Space Race** de `../../missionboard`, donde nació como
una parte más. `../../missionboard` es la **maqueta**: se consulta, **nunca se modifica**.

En esta carpeta ya están copiadas, idénticas, las piezas del juego: `app/game.py`,
`app/voice.py`, `app/static/` (game, games, sonidos, voz, panel de sonido),
`data/games/`, `examples/games/` y `tests/test_game.py`. Pero `app/main.py`,
`app/config.py`, `app/settings.py`, `tests/conftest.py` y el `Dockerfile` siguen siendo
los de missionboard entero: importan módulos que aquí no existen y no arrancan. Todavía
no es un repositorio git.

## Lo que hay que conservar (me gusta cómo funciona)

El movimiento de las fichas, las pausas entre voces y turnos, el menú, los sonidos y la
voz. Eso es lo que funciona y se queda tal cual.

## Cómo quiero el código

- **Estructura limpia y flexible:** que se entienda, que sea fácil de cambiar (sobre
  todo las reglas) y que admita más juegos o tableros en el futuro.
- **Puedes cambiar archivos, estructura y arquitectura** si hace falta para eso. No
  hay que conservar la forma de missionboard, solo el comportamiento que me gusta
  (arriba). Si el cambio es grande, explícamelo en corto antes de hacerlo.
- **Librerías:** puedes usar el entorno de conda `missionboard`, que ya tiene lo
  necesario (FastAPI, Piper, pytest…). Si hiciera falta alguna librería nueva,
  pregúntame antes de instalarla.

## Datos personales y `.gitignore`

- `data/` es lo real y **no va al repo**. En el repo, solo ejemplos (`examples/`).
- `data/games/players/personal/` tiene **fotos personales** (mamá, papá): nunca al repo
  ni en ejemplos, capturas o tests.
- En `data/games/players/` hay, de momento, dos dibujos (`oso-hola.png`,
  `oso-enfadado.png`). Te daré más: son los avatares entre los que cada jugador elegirá.
- El `.gitignore` tiene que cubrir lo que proceda: `data/` (y en especial
  `data/games/players/personal/`), entornos y cachés de Python, la base de datos local,
  `.env`, archivos del editor y del sistema, y cualquier otra cosa personal o generada.
  **Se crea antes que nada**, antes del primer `git add`.

## El plan (un paso cada vez)

1. **Que arranque solo, tal cual se juega hoy.**
   - Primero el `.gitignore` y luego `git init`. Antes de que yo haga el primer commit,
     enséñame `git status` para comprobar que no aparece nada personal.
   - Servidor mínimo: listar juegos, cargar un juego, la voz, los archivos estáticos y
     `/api/health`. Fuera todo lo de missionboard (misiones, estrellas, tienda, comidas,
     rutinas, padres…).
   - Configuración, Docker, `docker-compose.yml`, `.dockerignore`, un script de
     desarrollo y tests propios.
   - Prueba: se juega exactamente igual que en missionboard.
2. **Solo el juego Expanded.** El Space Race original pasa a una carpeta de plantillas
   (por ejemplo `templates/space-race/`): no sale en el menú, pero se puede recuperar.
3. **Jugadores sin missionboard.** Al empezar, la pantalla pregunta "¿Cuántos jugáis?"
   (máximo 6), y cada jugador elige su avatar entre los dibujos de
   `data/games/players/` (nunca los de `personal/`) y, si quiere, un nombre. Fuera
   `players.yaml` tal como está y la llamada a `api/people`.
4. **Reglas nuevas.** Las escribiré yo en `docs/reglas.md`, en lenguaje normal. Se
   programan a partir de ese documento, una regla cada vez. Si una regla no está clara,
   pregúntame antes de programarla.

## Lo que te pido ahora

Solo el **paso 1**, y antes de tocar nada: dime en corto qué archivos quitas, cuáles
reduces, cuáles creas y qué estructura propones. Espera mi visto bueno.

## Reglas para que no se convierta en un caos

- **Solo lo pedido.** Si se te ocurre algo más, apúntalo y pregúntame; no lo hagas.
- **Un paso cada vez.** Al acabar, resumen corto de qué ha cambiado y cómo probarlo, y
  el commit sugerido. No empiezas el siguiente hasta que yo haga el commit y te diga
  que sigues.
- **Probar de verdad:** cada paso se prueba jugando, no solo con los tests.
- **Ante la duda, pregunta.**
- **Respuestas cortas:** tengo pocos tokens.

## Mis reglas de trabajo

- Tú escribes el código; yo reviso y hago los commits. Sugiéreme commits en
  Conventional Commits, minimalistas y **sin firmar**: nada de "Co-Authored-By" ni
  "Generated with Claude Code".
- Sin datos privados en el repo: ni fotos ni nombres reales. Lo real vive en `data/`,
  fuera del repo; en el repo, solo ejemplos.
- Conda: entorno `missionboard`; no crees entornos ni instales nada sin preguntar.
- Hablamos en español; el código, los comentarios y los commits en inglés.
- No soy profesional: explícame las decisiones en corto y claro.

## Pendiente de decidir (te lo diré)

- Si se puede jugar con 1 jugador (práctica) o el mínimo es 2.

## Después del paso 1 (para mí)

Cuando el proyecto ya arranque solo y esté el primer commit: ejecutar `/init` para que
cree el `CLAUDE.md` describiendo el proyecto real, y pedirle que añada a ese archivo
"Mis reglas de trabajo", "Cómo quiero el código", "Datos personales" y "Reglas para que
no se convierta en un caos". Así no hará falta repetirlas en cada sesión.
