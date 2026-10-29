# Space Race

Juego de mesa espacial para jugar en una tablet o un ordenador, de 1 a 6 jugadores.
Cada jugador elige su avatar, su nombre y la dificultad de sus preguntas. El juego lo
recuerda para la próxima partida en ese mismo dispositivo.

Dos tableros: **Space Race** (28 casillas) y **Space Race Expanded** (68 casillas).
Modos: **Carrera** (dado y casillas especiales) y **Sabelotodo** (una pregunta de tu nivel;
si aciertas, tiras el dado y cuentan las casillas especiales). Una voz lee las cartas en voz alta.

## Ponerlo en marcha (Docker)

```bash
cp -r examples/games examples/questions examples/avatars data/   # la primera vez
docker compose up -d --build         # → http://localhost:8100
```

- **Tablero:** copia la imagen a `data/games/<juego>/board.webp` y quita el `#` de
  `image: board.webp` en su `game.yaml`. Sin imagen se juega sobre un tablero de puntos.
- **Avatares:** pon las fotos o dibujos (png, webp, jpg…) en `data/avatars/`, y el color de
  cada uno en `data/avatars/colors.yaml`. Las subcarpetas nunca se muestran ni se sirven.

Tras cambiar un `game.yaml` o las preguntas: `docker compose restart`. Cómo se escribe un
juego: [docs/game-yaml.md](docs/game-yaml.md).

## Desarrollo

Con el entorno de conda `missionboard` activo:

```bash
bash dev.sh            # tus datos de data/       → http://localhost:8101
bash dev.sh --example  # los ejemplos             → http://localhost:8102
python -m pytest
```

Para tener voz en desarrollo, el modelo de Piper va en `data/voices/`
(`es_ES-sharvard-medium.onnx` y su `.onnx.json`). Sin él, se usa la voz del navegador.

## Estructura

```
app/            servidor (FastAPI): main.py rutas · game.py lee los game.yaml · voice.py voz
app/static/     la web: games.html (menú) · game.html + js/game.js y js/game/ (el juego)
examples/       ejemplo de data/: games/ (los dos tableros), questions/ y avatars/colors.yaml
docs/           reglas, preguntas y cómo se escribe un game.yaml
data/           lo real: games/, questions/, avatars/, personal/, voices/ (fuera del repo)
```
