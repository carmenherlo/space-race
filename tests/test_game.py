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

from app.game import GAME_FILE, GamePack, load_game_pack, load_games
from tests.conftest import EXAMPLE_GAMES, TEMPLATES

SPACE_RACE = TEMPLATES / "space-race"  # the original board: a template, not in the menu
EXPANDED = EXAMPLE_GAMES / "space-race-expanded"

ClientFor = Callable[[Path], TestClient]


@pytest.fixture
def raw() -> dict[str, Any]:
    return yaml.safe_load((SPACE_RACE / GAME_FILE).read_text(encoding="utf-8"))


def test_only_expanded_is_in_the_examples() -> None:
    games = load_games(EXAMPLE_GAMES)
    assert list(games.games) == ["space-race-expanded"]
    assert games.available


def test_the_space_race_template_keeps_its_rules() -> None:
    pack = load_game_pack(SPACE_RACE)
    assert pack.goal == 29  # start, 28 squares, the Moon
    assert pack.squares[17].go_to == 0  # the black hole sends back to the start
    assert pack.squares[13].back_roll  # meteorites: roll and go back
    galaxies = [n for n, sq in pack.squares.items() if sq.emoji == "🌌"]
    assert [pack.squares[n].go_to for n in galaxies] == [10, 15, 20, 25]  # each to the next one
    assert not any(pack.squares[n].again for n in galaxies)  # no extra roll: no chains
    assert pack.squares[25].go_to is None  # the last galaxy is asleep: the Moon, on foot
    assert pack.playable_modes() == ["race", "challenges", "questions"]
    assert (pack.exact_finish, pack.backwards_counts, pack.voice) == (None, True, True)  # chosen; counts
    assert len(pack.challenges) == 32


def test_space_race_expanded_has_its_own_rules() -> None:
    pack = load_game_pack(EXPANDED)
    assert pack.goal == 69  # start, 68 squares, the Moon
    assert pack.playable_modes() == ["race", "questions"]  # "Carrera" and "Sabelotodo"
    assert (pack.exact_finish, pack.backwards_counts, pack.voice) == (True, False, True)
    assert pack.max_stars == 1  # one wildcard star at a time
    galaxies = [6, 11, 15, 20, 24, 29, 33, 38, 42, 47, 51, 56, 60, 65]
    assert [pack.squares[n].go_to for n in galaxies] == [*galaxies[1:], 69]  # the last one: the Moon
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


def test_expanded_has_questions_of_every_level() -> None:
    pack = load_game_pack(EXPANDED)
    assert all(len(q.wrong) == 3 for q in pack.questions if q.level != "very_easy")
    levels = ("very_easy", "easy", "medium", "hard")
    by_level = {level: sum(q.level == level for q in pack.questions) for level in levels}
    assert by_level == {"very_easy": 32, "easy": 34, "medium": 36, "hard": 49}
    true_false = [q for q in pack.questions if q.level == "very_easy"]
    assert all(sorted([q.answer, *q.wrong]) == ["Falso", "Verdadero"] for q in true_false)


INVALID: dict[str, Callable[[dict[str, Any]], None]] = {
    "square past the board": lambda d: d["squares"].update({40: d["squares"][7]}),
    "square 0 is the start": lambda d: d["squares"].update({0: d["squares"][7]}),
    "jump past the goal": lambda d: d["squares"][7].update(go_to=99),
    "go_to and move": lambda d: d["squares"][7].update(move=2),
    "go_to and back_roll": lambda d: d["squares"][7].update(back_roll=True),
    "go_to and swap": lambda d: d["squares"][7].update(swap=True),
    "move of 0": lambda d: d["squares"][18].update(go_to=None, move=0),
    "others_move of 0": lambda d: d["squares"][7].update(others_move=0),
    "negative skip": lambda d: d["squares"][7].update(skip=-1),
    "unknown kind": lambda d: d["squares"][7].update(kind="great"),
    "card without text": lambda d: d["squares"][7].update(text="  "),
    "unknown field": lambda d: d["squares"][7].update(goto=11),
    "challenges mode without challenges": lambda d: d.update(challenges=[]),
    "unknown mode": lambda d: d.update(modes=["race", "chess"]),
    "no modes": lambda d: d.update(modes=[]),
    "max_stars of 0": lambda d: d.update(max_stars=0),
    "place outside the picture": lambda d: d["places"].__setitem__(3, [120, 40]),
    "too few places": lambda d: d.update(places=[[1, 1], [2, 2]]),
    "question with two wrong answers": lambda d: d["questions"][0].update(wrong=["A", "B"]),
    "question repeating an answer": lambda d: d["questions"][0].update(wrong=["la tierra", "B", "C"]),
    "question without answer": lambda d: d["questions"][0].pop("answer"),
    "question level unknown": lambda d: d["questions"][0].update(level="expert"),
    "true or false with other answers": lambda d: d["questions"][0].update(answer="Sí", wrong=["No"], level="very_easy"),
    "true or false with four answers": lambda d: d["questions"][0].update(answer="Verdadero", wrong=["Falso", "Quizá", "Nunca"], level="very_easy"),
    "only one wrong answer, not true or false": lambda d: d["questions"][0].update(wrong=["Falso"], level="easy"),
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
    shutil.copytree(EXAMPLE_GAMES, tmp_path / "games")
    (tmp_path / "games" / "broken").mkdir()
    (tmp_path / "games" / "broken" / GAME_FILE).write_text("places: [[1, 1]]\n", encoding="utf-8")
    games = load_games(tmp_path / "games")
    assert not games.games["broken"].available
    assert "game.yaml is not valid" in games.games["broken"].error
    assert games.games["space-race-expanded"].available and games.available


# ---------- API ----------

def test_api_lists_the_games(client: TestClient) -> None:
    assert client.get("/api/games").json() == [
        {"id": "space-race-expanded", "title": "Space Race Expanded", "image_url": None, "available": True},
    ]


def test_api_serves_a_game(client: TestClient) -> None:
    game = client.get("/api/games/space-race-expanded").json()
    assert game["title"] == "Space Race Expanded"
    assert (game["modes"], game["exact_finish"], game["backwards_counts"]) == (["race", "questions"], True, False)
    assert game["image_url"] is None  # the example has no picture
    assert "parents" not in game and "levels" not in game


def test_api_serves_the_board_picture_and_nothing_else(tmp_path: Path, client_for: ClientFor) -> None:
    games_dir = tmp_path / "games"
    shutil.copytree(EXAMPLE_GAMES, games_dir)
    game_file = games_dir / "space-race-expanded" / GAME_FILE
    text = game_file.read_text(encoding="utf-8")
    game_file.write_text(text.replace("# image: board.webp", "image: board.webp"), encoding="utf-8")
    (games_dir / "space-race-expanded" / "board.webp").write_bytes(b"RIFF....WEBP")
    with client_for(games_dir) as client:
        url = "games-pack/space-race-expanded/board.webp"
        assert client.get("/api/games/space-race-expanded").json()["image_url"] == url
        assert client.get("/api/games").json()[0]["image_url"] == url
        assert client.get(f"/{url}").status_code == 200
        assert client.get("/games-pack/space-race-expanded/game.yaml").status_code == 404


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
    assert questions[0]["answer"] == "Verdadero"  # the first ones are true or false
    question = next(q for q in questions if q["level"] == "easy")
    assert question["answer"] == "La Tierra"
    assert len(question["wrong"]) == 3
