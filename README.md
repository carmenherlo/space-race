# Space Race

Juego de mesa espacial para jugar en una tablet o un ordenador, de 1 a 6 jugadores.
Cada jugador elige su avatar, su nombre y la dificultad de sus preguntas. El juego lo
recuerda para la próxima partida en ese mismo dispositivo.

Dos tableros: **Space Race** (28 casillas) y **Space Race Expanded** (68 casillas).
Modos: **Carrera** (dado y casillas especiales) y **Sabelotodo** (una pregunta de tu nivel;
si aciertas, tiras el dado y cuentan las casillas especiales). Una voz lee las cartas en voz alta.

## Ponerlo en marcha (Docker)

```bash
docker compose up -d --build         # → http://localhost:8100
```

Los juegos y las preguntas ya vienen con la app. Solo falta lo tuyo:

- **Avatares:** pon los dibujos o fotos (png, webp, jpg…) en `data/avatars/`. Las subcarpetas
  nunca se muestran ni se sirven. El color de cada uno, opcional, en `data/avatars/colors.yaml`:
  ```yaml
  pollito.png: "#ffd60a"
  delfin.png: "#1e90ff"
  ```

Tras cambiar un `game.yaml` o las preguntas: `docker compose up -d --build` (van dentro de
la imagen). Cómo se escribe un juego: [docs/game-yaml.md](docs/game-yaml.md).

## Desarrollo

Con el entorno de conda `missionboard` activo:

```bash
bash dev.sh            # → http://localhost:8101
python -m pytest
```

Para tener voz en desarrollo, el modelo de Piper va en `data/voices/`
(`es_ES-sharvard-medium.onnx` y su `.onnx.json`). Sin él, se usa la voz del navegador.

## Dónde está cada cosa

| Carpeta | Qué hay | ¿En git? |
|---|---|---|
| `app/` | El servidor (Python): `main.py` las rutas · `game.py` lee y comprueba los `game.yaml` · `avatars.py` · `profiles.py` los perfiles · `voice.py` la voz | Sí |
| `app/static/` | La web: `games.html` (menú) · `profiles.html` (perfiles) · `game.html` + `js/game.js` y `js/game/` (el juego, un módulo por parte) · `css/` | Sí |
| `content/games/` | `general-rules.md` (las normas comunes a todos los tableros) y `square-types.yaml` (los tipos de casilla especial) | Sí |
| `content/games/<juego>/` | Cada juego, todos con la misma forma: `game.yaml` (lo que lee el juego), `rules.md` (sus normas), `board.webp` (el tablero) y `lights/` (lo que se ilumina) | Sí |
| `content/questions/` | Los bancos de preguntas que usan los juegos (`general.yaml`; se leen en la página "Preguntas" del menú) | Sí |
| `docs/` | Cómo se escribe un juego (`game-yaml.md`) · el mando de la tele (`mando-tv.md`) | Sí |
| `tests/` | Las pruebas automáticas (`python -m pytest`) | Sí |
| `data/avatars/` | Tus avatares y sus colores | **No** |
| `data/profiles.yaml` | Los perfiles: el nombre y el nivel de cada avatar (los escribe el juego) | **No** |
| `data/voices/` | El modelo de voz, para desarrollo (Docker lo trae solo) | **No** |
| `data/personal/` | Tus notas: la app no lo lee | **No** |

Regla sencilla: **lo que es igual para todos va en `content/`; lo de tu casa, en `data/`**.
