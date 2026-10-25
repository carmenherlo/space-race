"""Runtime settings (read from environment variables) and the value types the game packs use.

Defaults follow the container convention: persistent files live in /data.
"""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

# Human-readable text: surrounding whitespace is removed and it cannot be empty.
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

# Image file inside a folder, optionally in subfolders ("boards/space.webp").
# Every part must start with a letter or digit, so "..", hidden files and absolute paths
# are rejected and a path can never leave its folder. Web image formats only.
IMAGE_EXTENSIONS = ("png", "webp", "jpg", "jpeg", "gif", "svg")
_PATH_PART = r"[A-Za-z0-9][A-Za-z0-9._-]*"
ImageName = Annotated[
    str,
    StringConstraints(pattern=rf"^({_PATH_PART}/)*{_PATH_PART}\.({'|'.join(IMAGE_EXTENSIONS)})$"),
]


class StrictModel(BaseModel):
    """Base model that rejects unknown fields, so typos fail loudly."""

    model_config = ConfigDict(extra="forbid", frozen=True)


@dataclass(frozen=True)
class Settings:
    games_dir: Path = Path("/data/games")  # one folder per game, and players/ (the avatars)
    cache_dir: Path = Path("/data/cache")  # the voice's WAV files
    # The voice model (app/voice.py); the Docker image brings it. Optional.
    voice_model: Path = Path("/opt/voices/es_ES-sharvard-medium.onnx")

    @classmethod
    def from_env(cls) -> "Settings":
        default = cls()
        return cls(
            games_dir=Path(os.environ.get("SPACE_RACE_GAMES", default.games_dir)),
            cache_dir=Path(os.environ.get("SPACE_RACE_CACHE", default.cache_dir)),
            voice_model=Path(os.environ.get("SPACE_RACE_VOICE_MODEL", default.voice_model)),
        )
