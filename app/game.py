"""The board games: a folder with one pack per game.

The games themselves run in the browser (app/static/js/game.js); this module only reads and
checks the packs, so a typo in a game.yaml only disables that game.

    content/games/
      space-race-expanded/       one folder per game; its name is the game's id
        game.yaml                where the squares are, what happens on them, the rules
        board.webp               the board picture
      …
    content/questions/
      general.yaml               a question bank, shared by the games that name it

Every field is explained in docs/game-yaml.md.
"""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated, Literal

import yaml
from pydantic import Field, StringConstraints, ValidationError, field_validator, model_validator

from app.config import ImageName, StrictModel, Text

GAME_FILE = "game.yaml"
# The types of special square, shared by every board: a file in the games folder.
SQUARE_TYPES_FILE = "square-types.yaml"
# The question banks, a folder next to the games folder (content/questions, next to content/games).
QUESTIONS_DIR = "questions"
# A question bank's name: its file in the questions folder, without ".yaml".
BANK_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]*")

# A place on the board picture: [x, y] in % of its width and height.
Percent = Annotated[float, Field(ge=0, le=100)]
Place = tuple[Percent, Percent]
Emoji = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=16)]

# How hard a question is, and which questions a player gets (mode "Sabelotodo"), from
# 1 to 3 chicks for kids: very_easy (🐣, 3 to 5 years, true or false, often silly), kids_medium
# (6 to 8), kids_hard (9 to 12); then 1 to 3 stars for grown-ups: easy (true or false), medium, hard.
Level = Literal["very_easy", "kids_medium", "kids_hard", "easy", "medium", "hard"]
# What a question is about (shown on the questions page, questions.html).
Topic = Literal["animals", "science", "geography", "history", "art", "general"]
# The levels whose questions are true or false.
TRUE_FALSE_LEVELS = ("very_easy", "easy")
# The two answers of a true-or-false question, always in this order on the screen.
TRUE_FALSE = ("Verdadero", "Falso")
# The modes: "Carrera" (roll and move) or "Sabelotodo" (a question every turn).
Mode = Literal["race", "questions"]


# The parts of a board that can light up (see GamePack.lights).
Light = Literal["title", "start", "trail", "moon", "moon_sign", "moon_flags", "moon_stars"]


class Square(StrictModel):
    """What happens on a special square: at most one way to move (go_to, move, back_roll,
    swap, minigame). In a game.yaml, a square usually names its type (square-types.yaml)
    and adds where to; see with_square_types."""

    kind: Literal["good", "bad"]  # the colour of the card
    emoji: Emoji
    title: Text
    text: Text
    go_to: int | None = Field(default=None, ge=0)  # jump to that square (0 = the start)
    # With go_to, how it gets there: that square lights up first, then "fly", the token flies
    # there in an arc, leaving sparkles; "wormhole", it spins into a swirl and out of another;
    # "teleport", up a beam of light and down another; "nebula", it fades in a cloud and comes
    # out of another; none, a quick flight.
    trip: Literal["fly", "wormhole", "teleport", "nebula"] | None = None
    move: int | None = None  # squares forward (+) or back (−)
    back_roll: bool = False  # roll the die and go back that many squares
    again: bool = False  # roll again
    skip: int = Field(default=0, ge=0, le=5)  # turns to miss (true = 1)
    others_move: int | None = None  # every OTHER player goes forward (+) or back (−)
    star: bool = False  # the player gets a wildcard star ⭐
    swap: bool = False  # the player may swap places with another one of their choice
    shine: bool = False  # the token shines when it lands here (the galaxies)
    minigame: bool = False  # the player chooses a minigame: win it, straight to the Moon
    trail: list[Place] | None = None  # with minigame: the way to the Moon, [x, y] in % of the picture

    @field_validator("skip", mode="before")
    @classmethod
    def skip_yes_or_no(cls, value: object) -> object:
        return int(value) if isinstance(value, bool) else value  # skip: true → 1 turn

    @model_validator(mode="before")
    @classmethod
    def card_text(cls, data: object) -> object:
        """The text of the card: {to} becomes the square it sends to, and the rule is added
        at the end ("¡Vuelve a tirar!", "Pierdes el próximo turno."), so it always matches."""
        if not isinstance(data, dict) or not isinstance(data.get("text"), str):
            return data
        text = data["text"]
        if data.get("go_to") is not None:
            text = text.replace("{to}", str(data["go_to"]))
        if data.get("again"):
            text += " ¡Vuelve a tirar!"
        skip = data.get("skip")
        if skip is True or skip == 1:
            text += " Pierdes el próximo turno."
        elif isinstance(skip, int) and skip > 1:
            text += f" Pierdes los próximos {skip} turnos."
        return {**data, "text": text}

    @model_validator(mode="after")
    def one_way_to_move(self) -> "Square":
        ways = [self.go_to is not None, self.move is not None, self.back_roll, self.swap, self.minigame]
        if sum(ways) > 1:
            raise ValueError('a square has only one of "go_to", "move", "back_roll", "swap" or "minigame"')
        if self.trail is not None and not self.minigame:
            raise ValueError('"trail" is the way to the Moon after a minigame: it needs "minigame"')
        if self.move == 0 or self.others_move == 0:
            raise ValueError('a move of 0 does nothing: remove it')
        if "{to}" in self.text:
            raise ValueError(f"{self.title!r}: its text says {{to}}, but the square has no go_to")
        return self



class Question(StrictModel):
    """A question at the end of a turn (mode "Sabelotodo"): four answers to choose from,
    shuffled each time; the right one, roll again. At levels "very_easy" and "easy" it is a sentence that
    is true or false: two answers, "Verdadero" and "Falso"."""

    emoji: Emoji
    text: Text
    answer: Text  # the right answer
    wrong: list[Text] = Field(min_length=1, max_length=3)  # three wrong answers (one if true/false)
    note: Text | None = None  # a curious fact, shown once answered
    level: Level
    topic: Topic

    @model_validator(mode="after")
    def answers_for_the_level(self) -> "Question":
        answers = [self.answer, *self.wrong]
        if self.level in TRUE_FALSE_LEVELS:
            if sorted(answers) != sorted(TRUE_FALSE):
                raise ValueError(
                    f"{self.text!r} is true or false: its answers are {TRUE_FALSE[0]!r} and {TRUE_FALSE[1]!r}"
                )
        elif len(self.wrong) != 3 or len({answer.lower() for answer in answers}) != 4:
            raise ValueError(f"the four answers to {self.text!r} must all be different")
        return self


class ModeRules(StrictModel):
    """The rules a mode sets for itself, over the game's own (see GamePack)."""

    # The goal only with the exact number: true or false; without it, as the game says.
    exact_finish: bool | None = None


class GamePack(StrictModel):
    title: Text = "Space Race"
    image: ImageName | None = None  # the board picture, in the game's folder
    # Optional: the same picture with only its squares (the rest see-through), to light up
    # the square a token is on.
    squares_image: ImageName | None = None
    # Optional: pictures of parts of the board (the same size, the rest see-through), to
    # light them up: the title, the start, the trail to the Moon, the Moon…
    lights: dict[Light, ImageName] = Field(default_factory=dict)
    # Optional: the rocket that brings each token to the start, drawn where it stops (the
    # same size as the board, the rest see-through).
    rocket: ImageName | None = None
    # The start, squares 1, 2, … and the goal (the last one), in order.
    places: list[Place] = Field(min_length=3)
    # Optional: where the tokens at the start wait while it is not their turn (only whose
    # turn it is stands on the start).
    waiting_place: Place | None = None
    squares: dict[int, Square] = Field(default_factory=dict)
    # The modes of this game, each with the rules it changes (see ModeRules), in the order
    # they are shown. A plain list ("modes: [race, questions]") changes nothing.
    modes: dict[Mode, ModeRules] = Field(
        default_factory=lambda: {mode: ModeRules() for mode in ("race", "questions")},
        min_length=1,
    )
    # The rules of this game, for every mode that does not set its own:
    # The goal only with the exact number (overshooting bounces back): true or false;
    # without it, the players choose before playing.
    exact_finish: bool | None = None
    # Going back (the meteorites, someone else's move, the bounce at the goal) lands on a
    # square that counts (true), or you just stay there (false).
    backwards_counts: bool = True
    # How many wildcard stars a player can keep at once; without it, as many as they get.
    max_stars: int | None = Field(default=None, ge=1)
    # A voice reads the cards aloud (the tablet's own voice, in Spanish), for those who
    # cannot read yet. The sound switch turns it off too.
    voice: bool = False
    questions: list[Question] = Field(default_factory=list)  # mode "questions"

    @field_validator("modes", mode="before")
    @classmethod
    def modes_as_a_list(cls, value: object) -> object:
        if isinstance(value, list):
            return {mode: {} for mode in value}
        if isinstance(value, dict):
            return {mode: {} if rules is None else rules for mode, rules in value.items()}
        return value

    # "squares:", "questions:"… with nothing below is read by YAML as None.
    @field_validator("squares", mode="before")
    @classmethod
    def no_squares(cls, value: object) -> object:
        return {} if value is None else value

    @field_validator("questions", mode="before")
    @classmethod
    def no_questions(cls, value: object) -> object:
        return [] if value is None else value

    @property
    def goal(self) -> int:
        """The last place: reaching it wins."""
        return len(self.places) - 1

    @model_validator(mode="after")
    def squares_exist(self) -> "GamePack":
        for number, square in self.squares.items():
            if not 1 <= number < self.goal:
                raise ValueError(
                    f"square {number} is not on the board (squares go from 1 to {self.goal - 1})"
                )
            if square.go_to is not None and square.go_to > self.goal:
                raise ValueError(
                    f"square {number} sends to {square.go_to}, past the goal ({self.goal})"
                )
        return self

    def playable_modes(self) -> list[Mode]:
        """The modes of this game; "questions" only if it has questions."""
        return [mode for mode in self.modes if mode != "questions" or self.questions]

    def pictures(self) -> set[str]:
        """Every picture of the board (the only files of its folder that are served)."""
        return {name for name in (self.image, self.squares_image, self.rocket, *self.lights.values()) if name}

    def exact_finish_in(self, mode: Mode) -> bool | None:
        """The exact finish in that mode: its own, else the game's (None: the players choose)."""
        own = self.modes[mode].exact_finish
        return self.exact_finish if own is None else own


@dataclass(frozen=True)
class GameLoad:
    """A game, or why it cannot be played. Never stops the app: only that game."""

    id: str  # its folder's name
    pack: GamePack | None
    error: str | None = None  # set when its game.yaml cannot be used

    @property
    def available(self) -> bool:
        return self.pack is not None


@dataclass(frozen=True)
class Games:
    """Every game in the games folder, by id."""

    games: dict[str, GameLoad]

    @property
    def available(self) -> bool:
        return any(game.available for game in self.games.values())


def load_game_pack(folder: Path) -> GamePack:
    """Read and check folder/game.yaml. Its questions can be its own (a list) or a bank's:
    "questions: general" → questions/general.yaml, next to the games folder.

    Raises OSError (a missing file), yaml.YAMLError or pydantic.ValidationError.
    """
    data = read_yaml(folder / GAME_FILE)
    if isinstance(data, dict) and isinstance(data.get("squares"), dict):
        data["squares"] = with_square_types(data["squares"], load_square_types(folder.parent))
    if isinstance(data, dict) and isinstance(data.get("questions"), str):
        data["questions"] = load_question_bank(folder.parent.parent / QUESTIONS_DIR, data["questions"])
    return GamePack.model_validate(data)


def load_square_types(games_dir: Path) -> dict[str, dict]:
    """The types of special square (games_dir/square-types.yaml), each one checked as a
    square; none if there is no such file."""
    path = games_dir / SQUARE_TYPES_FILE
    types = read_yaml(path) if path.is_file() else {}
    if not isinstance(types, dict):
        raise ValueError(f"{path} must be a list of types (name: what it does)")
    for name, fields in types.items():
        try:
            # A trip's type says {to} but not where to: each square adds it (try with 1).
            needs_to = isinstance(fields, dict) and "{to}" in str(fields.get("text")) and "go_to" not in fields
            Square.model_validate({**fields, "go_to": 1} if needs_to else fields)
        except ValidationError as error:
            raise ValueError(f"square type {name!r} in {path} is not valid:\n{error}") from error
    return types


def with_square_types(squares: dict, types: dict[str, dict]) -> dict:
    """Each square with "type: <name>" becomes that type's fields plus its own (its own win)."""
    result = {}
    for number, square in squares.items():
        if isinstance(square, dict) and "type" in square:
            fields = {key: value for key, value in square.items() if key != "type"}
            if square["type"] not in types:
                raise ValueError(f"square {number}: there is no square type {square['type']!r}")
            square = {**types[square["type"]], **fields}
        result[number] = square
    return result


def load_question_bank(questions_dir: Path, name: str) -> object:
    """The questions of the bank questions_dir/<name>.yaml (checked with the game)."""
    if not BANK_NAME.fullmatch(name):
        raise FileNotFoundError(f"{name!r} is not a question bank name (letters, digits, - and _)")
    data = read_yaml(questions_dir / f"{name}.yaml")
    return data.get("questions") if isinstance(data, dict) else data


def read_yaml(path: Path) -> object:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def load_game(folder: Path) -> GameLoad:
    """The game in this folder (its game.yaml)."""
    try:
        return GameLoad(folder.name, load_game_pack(folder))
    except (OSError, ValueError, yaml.YAMLError) as error:  # ValidationError is a ValueError
        return GameLoad(folder.name, None, f"{folder / GAME_FILE} is not valid:\n{error}")


def load_games(games_dir: Path) -> Games:
    """Every folder with a game.yaml in the games folder, in name order. No folder, no games
    (and no error)."""
    folders = sorted(games_dir.iterdir()) if games_dir.is_dir() else []
    return Games({
        folder.name: load_game(folder)
        for folder in folders
        if (folder / GAME_FILE).is_file() and not folder.name.startswith(".")
    })

