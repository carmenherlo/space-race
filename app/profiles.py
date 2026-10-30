"""The players' profiles: each avatar remembers who plays with it, a name and a question level.

    data/profiles.yaml
      oso.png: {name: Ana, level: medium}
      Gato 2.webp: {name: "", level: very_easy}

One profile per avatar (its file name, see app/avatars.py). They are shared by every device
that opens the game, and written by the game itself (api/profiles in app/main.py).

An avatar without a profile takes its name, if it has one, from the avatars folder:

    data/avatars/names.yaml
      oso.png: "Keko"
"""

import logging
import os
import threading
from pathlib import Path
from typing import Annotated

import yaml
from pydantic import StringConstraints, TypeAdapter, ValidationError

from app.config import StrictModel
from app.game import Level

MAX_NAME = 14  # as the name box in the game's setup (game.html)
NAMES_FILE = "names.yaml"  # in the avatars folder: each avatar's name before it has a profile
DEFAULT_LEVEL = "very_easy"  # of a profile that comes from names.yaml

logger = logging.getLogger(__name__)


class Profile(StrictModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=MAX_NAME)] = ""
    level: Level = "easy"


_PROFILES = TypeAdapter(dict[str, Profile])
_NAMES = TypeAdapter(dict[str, Annotated[str, StringConstraints(strip_whitespace=True, max_length=MAX_NAME)]])
_lock = threading.Lock()


def load_profiles(path: Path) -> dict[str, Profile]:
    """The profiles, or none if the file is missing; a broken one is logged and ignored."""
    try:
        return _PROFILES.validate_python(yaml.safe_load(path.read_text(encoding="utf-8")) or {})
    except FileNotFoundError:
        return {}
    except (yaml.YAMLError, ValidationError) as error:
        logger.error("%s is not valid, there are no profiles:\n%s", path, error)
        return {}


def profiles_with_names(path: Path, avatars_dir: Path, avatars: set[str]) -> dict[str, Profile]:
    """The saved profiles and, for the avatars without one, their name from names.yaml."""
    profiles = load_profiles(path)
    for avatar, name in load_names(avatars_dir).items():
        if avatar in avatars and avatar not in profiles:
            profiles[avatar] = Profile(name=name, level=DEFAULT_LEVEL)
    return profiles


def load_names(avatars_dir: Path) -> dict[str, str]:
    """names.yaml, or no names if it is missing; a broken one is logged and ignored."""
    path = avatars_dir / NAMES_FILE
    try:
        return _NAMES.validate_python(yaml.safe_load(path.read_text(encoding="utf-8")) or {})
    except FileNotFoundError:
        return {}
    except (yaml.YAMLError, ValidationError) as error:
        logger.error("%s is not valid, the avatars have no names:\n%s", path, error)
        return {}


def save_profile(path: Path, avatar: str, profile: Profile | None) -> dict[str, Profile]:
    """Saves (or, with None, deletes) one avatar's profile; returns them all."""
    with _lock:
        profiles = load_profiles(path)
        if profile is None:
            profiles.pop(avatar, None)
        else:
            profiles[avatar] = profile
        path.parent.mkdir(parents=True, exist_ok=True)
        # Written beside it, then swapped in: a cut halfway never leaves half a file.
        draft = path.with_name(f".{path.name}.tmp")
        content = {name: one.model_dump() for name, one in profiles.items()}
        draft.write_text(yaml.safe_dump(content, allow_unicode=True, sort_keys=False), encoding="utf-8")
        os.replace(draft, path)
        return profiles
