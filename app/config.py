"""Runtime settings (read from environment variables) and the value types the game packs use.

Two places, both overridable:
- content/ (in the repo): the games and their question banks, the same for everyone.
- /data (outside the repo, a Docker volume): what is local to one home, the avatars, the
  players' profiles and the voice's cache.
"""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

# The repo's content folder: content/games, content/questions.
CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"

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

# Colour as #rrggbb, e.g. "#ffd60a".
Color = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]


class StrictModel(BaseModel):
    """Base model that rejects unknown fields, so typos fail loudly."""

    model_config = ConfigDict(extra="forbid", frozen=True)


@dataclass(frozen=True)
class Settings:
    games_dir: Path = CONTENT_DIR / "games"  # one folder per game; question banks beside it
    avatars_dir: Path = Path("/data/avatars")  # the pictures players choose from (app/avatars.py)
    cache_dir: Path = Path("/data/cache")  # the voice's WAV files
    profiles_file: Path = Path("/data/profiles.yaml")  # the players' profiles (app/profiles.py)
    # The voice model (app/voice.py); the Docker image brings it. Optional.
    voice_model: Path = Path("/opt/voices/es_ES-sharvard-medium.onnx")

    @classmethod
    def from_env(cls) -> "Settings":
        default = cls()
        return cls(
            games_dir=Path(os.environ.get("SPACE_RACE_GAMES", default.games_dir)),
            avatars_dir=Path(os.environ.get("SPACE_RACE_AVATARS", default.avatars_dir)),
            cache_dir=Path(os.environ.get("SPACE_RACE_CACHE", default.cache_dir)),
            profiles_file=Path(os.environ.get("SPACE_RACE_PROFILES", default.profiles_file)),
            voice_model=Path(os.environ.get("SPACE_RACE_VOICE_MODEL", default.voice_model)),
        )
