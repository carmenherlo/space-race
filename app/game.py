"""The board games: a folder with one pack per game.

The games themselves run in the browser (app/static/js/game.js); this module only reads and
checks the packs, so a typo in a game.yaml only disables that game.

    data/games/
      space-race-expanded/       one folder per game; its name is the game's id
        game.yaml                where the squares are, what happens on them, the rules
        board.webp               the board picture
      …
    data/questions/
      space.yaml                 a question bank, shared by the games that name it

See examples/games/ and templates/ for every field.
"""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated, Literal

import yaml
from pydantic import Field, StringConstraints, ValidationError, field_validator, model_validator

from app.config import ImageName, StrictModel, Text

GAME_FILE = "game.yaml"
# The question banks, a folder next to the games folder (data/questions, next to data/games).
QUESTIONS_DIR = "questions"
# A question bank's name: its file in the questions folder, without ".yaml".
BANK_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]*")

# A place on the board picture: [x, y] in % of its width and height.
Percent = Annotated[float, Field(ge=0, le=100)]
Place = tuple[Percent, Percent]
Emoji = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=16)]

# How hard a question is, and which questions a player gets (mode "Sabelotodo"), from
# 1 to 3 stars: easy (true or false, the littlest ones), medium (kids who read), hard (adults).
Level = Literal["easy", "medium", "hard"]
# The two answers of an "easy" question, always in this order on the screen.
TRUE_FALSE = ("Verdadero", "Falso")
# What comes at the end of a turn: nothing ("Carrera"), a funny challenge ("Retos locos")
# or a question ("Sabelotodo").
Mode = Literal["race", "challenges", "questions"]


class Square(StrictModel):
    """What happens on a special square: at most one way to move (go_to, move, back_roll)."""

    kind: Literal["good", "bad"]  # the colour of the card
    emoji: Emoji
    title: Text
    text: Text
    go_to: int | None = Field(default=None, ge=0)  # jump to that square (0 = the start)
    move: int | None = None  # squares forward (+) or back (−)
    back_roll: bool = False  # roll the die and go back that many squares
    again: bool = False  # roll again (the challenge comes where the new roll lands)
    skip: int = Field(default=0, ge=0, le=5)  # turns to miss (true = 1)
    others_move: int | None = None  # every OTHER player goes forward (+) or back (−)
    star: bool = False  # the player gets a wildcard star ⭐
    star_saves: bool = False  # a player with a star can use it here: nothing happens
    swap: bool = False  # the player may swap places with another one of their choice

    @field_validator("skip", mode="before")
    @classmethod
    def skip_yes_or_no(cls, value: object) -> object:
        return int(value) if isinstance(value, bool) else value  # skip: true → 1 turn

    @model_validator(mode="after")
    def one_way_to_move(self) -> "Square":
        ways = [self.go_to is not None, self.move is not None, self.back_roll, self.swap]
        if sum(ways) > 1:
            raise ValueError('a square has only one of "go_to", "move", "back_roll" or "swap"')
        if self.move == 0 or self.others_move == 0:
            raise ValueError('a move of 0 does nothing: remove it')
        return self


class Challenge(StrictModel):
    """Something funny to do at the end of a turn (mode "Retos locos")."""

    emoji: Emoji
    text: Text


class Question(StrictModel):
    """A question at the end of a turn (mode "Sabelotodo"): four answers to choose from,
    shuffled each time; the right one, roll again. At level "easy" it is a sentence that
    is true or false: two answers, "Verdadero" and "Falso"."""

    emoji: Emoji
    text: Text
    answer: Text  # the right answer
    wrong: list[Text] = Field(min_length=1, max_length=3)  # three wrong answers (one if true/false)
    note: Text | None = None  # a curious fact, shown once answered
    level: Level

    @model_validator(mode="after")
    def answers_for_the_level(self) -> "Question":
        answers = [self.answer, *self.wrong]
        if self.level == "easy":
            if sorted(answers) != sorted(TRUE_FALSE):
                raise ValueError(
                    f"{self.text!r} is easy: its answers are {TRUE_FALSE[0]!r} and {TRUE_FALSE[1]!r}"
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
    # The start, squares 1, 2, … and the goal (the last one), in order.
    places: list[Place] = Field(min_length=3)
    squares: dict[int, Square] = Field(default_factory=dict)
    # The modes of this game, each with the rules it changes (see ModeRules), in the order
    # they are shown. A plain list ("modes: [race, questions]") changes nothing.
    modes: dict[Mode, ModeRules] = Field(
        default_factory=lambda: {mode: ModeRules() for mode in ("race", "challenges", "questions")},
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
    challenges: list[Challenge] = Field(default_factory=list)  # mode "challenges"
    questions: list[Question] = Field(default_factory=list)  # mode "questions"

    @field_validator("modes", mode="before")
    @classmethod
    def modes_as_a_list(cls, value: object) -> object:
        if isinstance(value, list):
            return {mode: {} for mode in value}
        if isinstance(value, dict):
            return {mode: {} if rules is None else rules for mode, rules in value.items()}
        return value

    # "squares:", "challenges:"… with nothing below is read by YAML as None.
    @field_validator("squares", mode="before")
    @classmethod
    def no_squares(cls, value: object) -> object:
        return {} if value is None else value

    @field_validator("challenges", "questions", mode="before")
    @classmethod
    def no_cards(cls, value: object) -> object:
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

    @model_validator(mode="after")
    def cards_for_the_modes(self) -> "GamePack":
        if "challenges" in self.modes and not self.challenges:
            raise ValueError('mode "challenges" needs some challenges (or remove the mode)')
        return self

    def playable_modes(self) -> list[Mode]:
        """The modes of this game; "questions" only if it has questions."""
        return [mode for mode in self.modes if mode != "questions" or self.questions]

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
    "questions: space" → questions/space.yaml, next to the games folder.

    Raises OSError (a missing file), yaml.YAMLError or pydantic.ValidationError.
    """
    data = read_yaml(folder / GAME_FILE)
    if isinstance(data, dict) and isinstance(data.get("questions"), str):
        data["questions"] = load_question_bank(folder.parent.parent / QUESTIONS_DIR, data["questions"])
    return GamePack.model_validate(data)


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
    except (OSError, yaml.YAMLError, ValidationError) as error:
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

