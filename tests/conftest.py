"""Shared fixtures: an app on the repo's games (content/), without a voice."""

from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import CONTENT_DIR, Settings
from app.main import create_app

GAMES = CONTENT_DIR / "games"


@pytest.fixture
def client_for(tmp_path: Path) -> Callable[..., TestClient]:
    """An app on this games (and avatars) folder; use it with "with", which runs the startup."""

    def make(games_dir: Path, avatars_dir: Path | None = None) -> TestClient:
        settings = Settings(
            games_dir=games_dir,
            avatars_dir=avatars_dir or tmp_path / "no-avatars",
            cache_dir=tmp_path / "cache",
            voice_model=tmp_path / "no-voice.onnx",  # no voice: tests never load a real model
        )
        return TestClient(create_app(settings))

    return make


@pytest.fixture
def client(client_for: Callable[..., TestClient]) -> Iterator[TestClient]:
    with client_for(GAMES) as client:
        yield client
