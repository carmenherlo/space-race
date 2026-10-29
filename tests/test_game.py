"""The board games (app/game.py): one folder per game, and the API."""

import copy
import shutil
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest
import yaml
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.game import GAME_FILE, GamePack, load_game_pack, load_games, load_question_bank
from tests.conftest import GAMES

SPACE_RACE = GAMES / "space-race"  # the short board
EXPANDED = GAMES / "space-race-expanded"

ClientFor = Callable[[Path], TestClient]


def copy_games(tmp_path: Path) -> Path:
    """The games and their question banks, in tmp_path; returns the games folder."""
    shutil.copytree(GAMES.parent / "questions", tmp_path / "questions")
    return Path(shutil.copytree(GAMES, tmp_path / "games"))


@pytest.fixture
def raw() -> dict[str, Any]:
    """The short board's game.yaml, with every mode and its bank's questions in it."""
    data = yaml.safe_load((SPACE_RACE / GAME_FILE).read_text(encoding="utf-8"))
    data["questions"] = load_question_bank(GAMES.parent / "questions", data["questions"])
    data["modes"] = ["race", "challenges", "questions"]
    return data


def test_the_games_are_the_short_and_the_expanded_boards() -> None:
    games = load_games(GAMES)
    assert sorted(games.games) == ["space-race", "space-race-expanded"]
    assert games.available


def test_the_short_board_keeps_its_rules() -> None:
    pack = load_game_pack(SPACE_RACE)
    assert pack.goal == 29  # start, 28 squares, the Moon
    assert pack.squares[17].go_to == 0  # the black hole sends back to the start
    assert pack.squares[13].back_roll  # meteorites: roll and go back
    galaxies = [n for n, sq in pack.squares.items() if sq.emoji == "🌌"]
    assert [pack.squares[n].go_to for n in galaxies] == [10, 15, 20, 25, None]  # each to the next one
    assert not any(pack.squares[n].again for n in galaxies)  # no extra roll: no chains
    assert pack.waiting_place == (9, 22)  # at the start, the others wait on the rocket
    assert pack.squares[25].minigame  # the last galaxy: win a minigame, the Moon
    assert pack.squares[25].trail  # along the star trail
    assert pack.playable_modes() == ["race", "questions"]  # "Carrera" and "Sabelotodo"
    assert pack.exact_finish_in("race") is True  # overshooting bounces back
    assert pack.exact_finish_in("questions") is True  # in both modes
    assert (pack.backwards_counts, pack.voice) == (True, True)  # going back, the square counts
    assert len(pack.challenges) == 32  # "Retos locos", kept though not in the menu
    assert len(pack.questions) == 300  # the shared bank (see test_both_boards_share…)


def test_a_mode_sets_its_own_rules_over_the_games(raw: dict[str, Any]) -> None:
    raw.update(modes={"race": None, "questions": {"exact_finish": False}}, exact_finish=True)
    pack = GamePack.model_validate(raw)
    assert list(pack.modes) == ["race", "questions"]
    assert (pack.exact_finish_in("race"), pack.exact_finish_in("questions")) == (True, False)
    raw.update(modes=["race", "questions"], exact_finish=None)  # a list: the game's rules
    pack = GamePack.model_validate(raw)
    assert (pack.exact_finish_in("race"), pack.exact_finish_in("questions")) == (None, None)


def test_space_race_expanded_has_its_own_rules() -> None:
    pack = load_game_pack(EXPANDED)
    assert pack.goal == 69  # start, 68 squares, the Moon
    assert pack.playable_modes() == ["race", "questions"]  # "Carrera" and "Sabelotodo"
    assert (pack.exact_finish_in("race"), pack.exact_finish_in("questions")) == (True, True)
    assert (pack.backwards_counts, pack.voice) == (True, True)  # going back, the square counts
    assert pack.max_stars == 1  # one wildcard star at a time
    galaxies = [6, 11, 15, 20, 24, 29, 33, 38, 42, 47, 51, 56, 60, 65]
    assert [pack.squares[n].go_to for n in galaxies] == [*galaxies[1:], None]  # each to the next one
    assert pack.squares[65].minigame  # the last one: win a minigame, the Moon
    assert pack.squares[65].trail  # along the star trail
    assert all(pack.squares[n].again for n in galaxies[:-1])  # "y tiro porque me toca"
    assert (pack.squares[9].go_to, pack.squares[22].go_to) == (22, 9)  # the wormhole, both ways
    assert (pack.squares[26].go_to, pack.squares[57].go_to) == (57, 26)  # the UFOs, both ways
    assert not pack.squares[26].again  # dizzy from the trip
    assert pack.squares[13].star
    assert pack.squares[17].others_move == -1  # the solar storm
    assert (pack.squares[36].skip, pack.squares[52].skip) == (1, 2)
    assert sorted(n for n, sq in pack.squares.items() if sq.star_saves) == [23, 36, 44, 52, 57, 58]
    assert pack.squares[44].go_to == 30  # lost in the nebula
    assert pack.squares[49].swap  # the spy satellite


def test_both_boards_share_the_general_questions_of_every_level() -> None:
    pack = load_game_pack(EXPANDED)
    assert load_game_pack(SPACE_RACE).questions == pack.questions
    assert all(len(q.wrong) == 3 for q in pack.questions if q.level not in ("very_easy", "easy"))
    by_level = {level: sum(q.level == level for q in pack.questions) for level in ("very_easy", "kids_medium", "kids_hard", "easy", "medium", "hard")}
    assert by_level == {"very_easy": 50, "kids_medium": 50, "kids_hard": 50, "easy": 50, "medium": 50, "hard": 50}
    true_false = [q for q in pack.questions if q.level in ("very_easy", "easy")]
    assert all(sorted([q.answer, *q.wrong]) == ["Falso", "Verdadero"] for q in true_false)


def test_a_missing_question_bank_only_disables_that_game(tmp_path: Path) -> None:
    copy_games(tmp_path)
    game_file = tmp_path / "games" / "space-race" / GAME_FILE
    game_file.write_text(game_file.read_text(encoding="utf-8").replace("questions: general", "questions: nope"), encoding="utf-8")
    games = load_games(tmp_path / "games")
    assert not games.games["space-race"].available
    assert "nope.yaml" in games.games["space-race"].error
    assert games.games["space-race-expanded"].available


INVALID: dict[str, Callable[[dict[str, Any]], None]] = {
    "square past the board": lambda d: d["squares"].update({40: d["squares"][7]}),
    "square 0 is the start": lambda d: d["squares"].update({0: d["squares"][7]}),
    "jump past the goal": lambda d: d["squares"][7].update(go_to=99),
    "go_to and move": lambda d: d["squares"][7].update(move=2),
    "go_to and back_roll": lambda d: d["squares"][7].update(back_roll=True),
    "go_to and swap": lambda d: d["squares"][7].update(swap=True),
    "go_to and minigame": lambda d: d["squares"][7].update(minigame=True),
    "trail without minigame": lambda d: d["squares"][7].update(go_to=None, trail=[[50, 50]]),
    "trail outside the picture": lambda d: d["squares"][7].update(go_to=None, minigame=True, trail=[[150, 50]]),
    "move of 0": lambda d: d["squares"][18].update(go_to=None, move=0),
    "others_move of 0": lambda d: d["squares"][7].update(others_move=0),
    "negative skip": lambda d: d["squares"][7].update(skip=-1),
    "unknown kind": lambda d: d["squares"][7].update(kind="great"),
    "card without text": lambda d: d["squares"][7].update(text="  "),
    "unknown field": lambda d: d["squares"][7].update(goto=11),
    "challenges mode without challenges": lambda d: d.update(challenges=[]),
    "unknown mode": lambda d: d.update(modes=["race", "chess"]),
    "no modes": lambda d: d.update(modes=[]),
    "unknown rule in a mode": lambda d: d.update(modes={"race": {"bounce": True}}),
    "max_stars of 0": lambda d: d.update(max_stars=0),
    "place outside the picture": lambda d: d["places"].__setitem__(3, [120, 40]),
    "too few places": lambda d: d.update(places=[[1, 1], [2, 2]]),
    "question with two wrong answers": lambda d: d["questions"][0].update(wrong=["A", "B"]),
    "question repeating an answer": lambda d: d["questions"][0].update(wrong=["la tierra", "B", "C"]),
    "question without answer": lambda d: d["questions"][0].pop("answer"),
    "question level unknown": lambda d: d["questions"][0].update(level="expert"),
    "question topic unknown": lambda d: d["questions"][0].update(topic="sports"),
    "true or false with other answers": lambda d: d["questions"][0].update(answer="Sí", wrong=["No"], level="easy"),
    "true or false with four answers": lambda d: d["questions"][0].update(answer="Verdadero", wrong=["Falso", "Quizá", "Nunca"], level="easy"),
    "only one wrong answer, not true or false": lambda d: d["questions"][0].update(wrong=["Falso"], level="medium"),
    "players are chosen before playing": lambda d: d.update(parents=[]),
}


@pytest.mark.parametrize("mutate", INVALID.values(), ids=INVALID.keys())
def test_invalid_pack_is_rejected(raw: dict[str, Any], mutate: Callable[[dict[str, Any]], None]) -> None:
    data = copy.deepcopy(raw)
    mutate(data)
    with pytest.raises(ValidationError):
        GamePack.model_validate(data)


def test_skip_true_is_one_turn(raw: dict[str, Any]) -> None:
    data = copy.deepcopy(raw)
    data["squares"][7]["skip"] = True
    assert GamePack.model_validate(data).squares[7].skip == 1


def test_a_race_only_game_needs_no_cards(raw: dict[str, Any]) -> None:
    data = copy.deepcopy(raw)
    data.update(modes=["race"], challenges=None)
    del data["questions"]
    assert GamePack.model_validate(data).playable_modes() == ["race"]


def test_no_questions_no_questions_mode(raw: dict[str, Any]) -> None:
    data = copy.deepcopy(raw)
    del data["questions"]
    assert GamePack.model_validate(data).playable_modes() == ["race", "challenges"]


def test_empty_sections_are_allowed(raw: dict[str, Any]) -> None:
    data = copy.deepcopy(raw)
    data.update(squares=None)
    assert GamePack.model_validate(data).squares == {}


def test_no_games_folder_is_not_an_error(tmp_path: Path) -> None:
    games = load_games(tmp_path / "none")
    assert (games.games, games.available) == ({}, False)


def test_a_broken_game_is_reported_and_the_others_still_work(tmp_path: Path) -> None:
    copy_games(tmp_path)
    (tmp_path / "games" / "broken").mkdir()
    (tmp_path / "games" / "broken" / GAME_FILE).write_text("places: [[1, 1]]\n", encoding="utf-8")
    games = load_games(tmp_path / "games")
    assert not games.games["broken"].available
    assert "game.yaml is not valid" in games.games["broken"].error
    assert games.games["space-race-expanded"].available and games.available


# ---------- API ----------

def test_api_lists_the_games(client: TestClient) -> None:
    assert client.get("/api/games").json() == [
        {"id": "space-race", "title": "Space Race",
         "image_url": "games-pack/space-race/board.webp", "available": True},
        {"id": "space-race-expanded", "title": "Space Race Expanded",
         "image_url": "games-pack/space-race-expanded/board.webp", "available": True},
    ]


def test_api_serves_a_game(client: TestClient) -> None:
    game = client.get("/api/games/space-race-expanded").json()
    assert game["title"] == "Space Race Expanded"
    assert game["modes"] == [{"id": "race", "exact_finish": True}, {"id": "questions", "exact_finish": True}]
    assert game["backwards_counts"] is True
    assert game["image_url"] == "games-pack/space-race-expanded/board.webp"
    assert "parents" not in game and "levels" not in game


def test_api_serves_the_board_picture_and_nothing_else(client: TestClient) -> None:
    assert client.get("/games-pack/space-race-expanded/board.webp").status_code == 200
    assert client.get("/games-pack/space-race-expanded/game.yaml").status_code == 404
    short = client.get("/api/games/space-race").json()
    assert short["squares_image_url"] == "games-pack/space-race/space-race-squares.png"
    assert short["lights"]["title"] == "games-pack/space-race/space-race-title.png"
    for picture in ("space-race-squares.png", "space-race-title.png", "space-race-moon-sign.png"):
        assert client.get(f"/games-pack/space-race/{picture}").status_code == 200, picture


def test_without_games_there_is_no_game(tmp_path: Path, client_for: ClientFor) -> None:
    with client_for(tmp_path / "none") as client:
        assert client.get("/api/games").json() == []
        assert client.get("/api/games/space-race-expanded").status_code == 404


def test_a_broken_game_is_listed_as_not_available(tmp_path: Path, client_for: ClientFor) -> None:
    games_dir = tmp_path / "games"
    (games_dir / "broken").mkdir(parents=True)
    (games_dir / "broken" / GAME_FILE).write_text("challenges: []\n", encoding="utf-8")
    with client_for(games_dir) as client:
        assert client.get("/api/games").json() == [
            {"id": "broken", "title": "broken", "image_url": None, "available": False}
        ]
        response = client.get("/api/games/broken")
        assert response.status_code == 503
        assert "game.yaml is not valid" in response.json()["detail"]


def test_api_serves_the_questions(client: TestClient) -> None:
    questions = client.get("/api/games/space-race-expanded").json()["questions"]
    assert questions[0]["answer"] in ("Verdadero", "Falso")  # the first ones are true or false
    question = next(q for q in questions if q["level"] == "medium")
    assert question["answer"] == "El Aconcagua"
    assert len(question["wrong"]) == 3
