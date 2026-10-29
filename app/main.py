"""FastAPI application: the games, the avatars, the voice and the web page.

Run locally with:  bash dev.sh
"""

import logging
import threading
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.config import Settings
from app.avatars import list_avatars
from app.game import load_games
from app.voice import MAX_TEXT, Voice, VoiceUnavailableError, Who

STATIC_DIR = Path(__file__).parent / "static"

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the application. Tests pass their own settings."""
    resolved = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        # Runs once at startup: a broken game.yaml only disables that game.
        app.state.games = load_games(resolved.games_dir)
        for game in app.state.games.games.values():
            if game.error:
                logger.error("Game %s disabled. %s", game.id, game.error)
        # The voice (app/voice.py): its model loads in the background, it takes a moment.
        app.state.voice = Voice(resolved.voice_model, resolved.cache_dir / "voice")
        threading.Thread(target=app.state.voice.load, daemon=True).start()
        yield

    app = FastAPI(title="Space Race", lifespan=lifespan)

    @app.middleware("http")
    async def always_revalidate(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # The tablet keeps the page open for days: make the browser check every file on
        # each load instead of using a stale copy. Unchanged files get a cheap "304".
        response = await call_next(request)
        response.headers.setdefault("Cache-Control", "no-cache")
        return response

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/voice")
    def voice(
        request: Request,
        text: str = Query(..., min_length=1, max_length=MAX_TEXT),
        who: Who = "natural",
    ) -> Response:
        """The text read aloud (WAV), by the natural or the robot voice; 503 without a voice
        here (the browser then uses the tablet's own)."""
        try:
            audio = request.app.state.voice.speak(text, who)
        except VoiceUnavailableError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
        # The same text always sounds the same: the browser may keep it.
        return Response(audio, media_type="audio/wav", headers={"Cache-Control": "max-age=31536000"})

    @app.get("/api/games")
    def games_list(request: Request) -> list[dict]:
        """Every board game (app/game.py), to choose one: those with a mistake in their
        game.yaml are listed too, as not available."""
        return [
            {
                "id": game.id,
                "title": game.pack.title if game.pack else game.id,
                "image_url": games_url(f"{game.id}/{game.pack.image}") if game.pack and game.pack.image else None,
                "available": game.available,
            }
            for game in request.app.state.games.games.values()
        ]

    @app.get("/api/games/{game_id}")
    def game_pack(game_id: str, request: Request) -> dict:
        """One board game: 404 if there is no such game, 503 if its game.yaml is wrong."""
        game = request.app.state.games.games.get(game_id)
        if game is None:
            raise HTTPException(status_code=404, detail=f"there is no game {game_id!r}")
        if game.error:
            raise HTTPException(status_code=503, detail=game.error)
        content = game.pack.model_dump()
        # Each mode with its rules worked out (its own, else the game's).
        content["modes"] = [
            {"id": mode, "exact_finish": game.pack.exact_finish_in(mode)} for mode in game.pack.playable_modes()
        ]
        del content["exact_finish"]
        content["image_url"] = games_url(f"{game.id}/{game.pack.image}") if game.pack.image else None
        squares = game.pack.squares_image
        content["squares_image_url"] = games_url(f"{game.id}/{squares}") if squares else None
        content["lights"] = {part: games_url(f"{game.id}/{name}") for part, name in game.pack.lights.items()}
        return content

    @app.get("/api/avatars")
    def avatars() -> list[dict[str, str | None]]:
        """The pictures players choose from, with their colours (app/avatars.py)."""
        return [
            {"id": avatar.name, "url": f"avatars/{quote(avatar.name)}", "color": avatar.color}
            for avatar in list_avatars(resolved.avatars_dir)
        ]

    # Only the files the game needs: the avatars and each game's board picture. Nothing
    # else (subfolders, colors.yaml, a game's rules…) is ever served.
    @app.get("/avatars/{name}")
    def avatar_file(name: str) -> FileResponse:
        if name not in {avatar.name for avatar in list_avatars(resolved.avatars_dir)}:
            raise HTTPException(status_code=404)
        return FileResponse(resolved.avatars_dir / name)

    @app.get("/games-pack/{game_id}/{name:path}")
    def board_picture(game_id: str, name: str, request: Request) -> FileResponse:
        game = request.app.state.games.games.get(game_id)
        if game is None or game.pack is None or name not in game.pack.pictures():
            raise HTTPException(status_code=404)
        path = resolved.games_dir / game_id / name
        if not path.is_file():
            raise HTTPException(status_code=404)
        return FileResponse(path)

    # The home screen is the games menu.
    @app.get("/", include_in_schema=False)
    def home() -> RedirectResponse:
        return RedirectResponse("games.html")

    # The web page, last so it never hides the routes above.
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")

    return app


def games_url(file_name: str) -> str:
    """Relative URL of a file in the games folder (see the /games-pack routes)."""
    return f"games-pack/{quote(file_name)}"


app = create_app()
