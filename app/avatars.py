"""The avatars players choose from: the pictures in the avatars folder, each with its colour.

    data/avatars/
      pollito.png        one picture each (any names); subfolders are ignored
      colors.yaml        optional: each picture's colour, e.g.  pollito.png: "#ffd60a"
                         (its order is the order of the avatars in the menu)

The colour is the player's: the ring of their avatar, their token, their glow on their
turn. A picture without one gets its seat's colour (in the browser, js/game.js).
Read on every call, so new pictures show up without a restart.
"""

import logging
from dataclasses import dataclass
from pathlib import Path

import yaml
from pydantic import TypeAdapter, ValidationError

from app.config import IMAGE_EXTENSIONS, Color

COLORS_FILE = "colors.yaml"

logger = logging.getLogger(__name__)

_COLORS = TypeAdapter(dict[str, Color])


@dataclass(frozen=True)
class Avatar:
    name: str  # its file name, also its id
    color: str | None


def list_avatars(avatars_dir: Path) -> list[Avatar]:
    """The image files right in the avatars folder, with their colours: first those in
    colors.yaml, in its order, then the rest in name order."""
    if not avatars_dir.is_dir():
        return []
    colors = load_colors(avatars_dir)
    order = {name: place for place, name in enumerate(colors)}
    names = sorted(
        (
            path.name
            for path in avatars_dir.iterdir()
            if path.is_file()
            and not path.name.startswith(".")
            and path.suffix.lower().lstrip(".") in IMAGE_EXTENSIONS
        ),
        key=lambda name: (order.get(name, len(order)), name),
    )
    return [Avatar(name, colors.get(name)) for name in names]


def load_colors(avatars_dir: Path) -> dict[str, str]:
    """colors.yaml, or no colours if it is missing; a broken one is logged and ignored."""
    path = avatars_dir / COLORS_FILE
    try:
        return _COLORS.validate_python(yaml.safe_load(path.read_text(encoding="utf-8")) or {})
    except FileNotFoundError:
        return {}
    except (yaml.YAMLError, ValidationError) as error:
        logger.error("%s is not valid, the avatars have no colours:\n%s", path, error)
        return {}
