"""Shared fixtures: an app on the example games, without a voice."""

from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

ROOT = Path(__file__).parent.parent
EXAMPLE_GAMES = ROOT / "examples" / "games"
EXAMPLE_AVATARS = ROOT / "examples" / "avatars"


@pytest.fixture
def client_for(tmp_path: Path) -> Callable[..., TestClient]:
    """An app on this games (and avatars) folder; use it with "with", which runs the startup."""

    def make(games_dir: Path, avatars_dir: Path = EXAMPLE_AVATARS) -> TestClient:
        settings = Settings(
            games_dir=games_dir,
            avatars_dir=avatars_dir,
            cache_dir=tmp_path / "cache",
            voice_model=tmp_path / "no-voice.onnx",  # no voice: tests never load a real model
        )
        return TestClient(create_app(settings))

    return make


@pytest.fixture
def client(client_for: Callable[..., TestClient]) -> Iterator[TestClient]:
    with client_for(EXAMPLE_GAMES) as client:
        yield client
