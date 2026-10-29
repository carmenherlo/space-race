"""The avatars (app/avatars.py): the pictures right in the avatars folder, with their colours."""

from collections.abc import Callable
from pathlib import Path

from fastapi.testclient import TestClient

from app.avatars import COLORS_FILE, Avatar, list_avatars
from tests.conftest import EXAMPLE_GAMES


def avatars_folder(tmp_path: Path, colors: str | None = None) -> Path:
    """Two pictures, a subfolder with a photo, a hidden picture and a file that is not one."""
    folder = tmp_path / "avatars"
    (folder / "private").mkdir(parents=True)
    (folder / "oso.png").write_bytes(b"\x89PNG")
    (folder / "Gato 2.webp").write_bytes(b"RIFF....WEBP")
    (folder / "notes.txt").write_text("not a picture", encoding="utf-8")
    (folder / ".hidden.png").write_bytes(b"\x89PNG")
    (folder / "private" / "photo.jpg").write_bytes(b"\xff\xd8")
    if colors is not None:
        (folder / COLORS_FILE).write_text(colors, encoding="utf-8")
    return folder


def test_avatars_are_only_the_pictures_right_in_the_folder(tmp_path: Path) -> None:
    assert list_avatars(avatars_folder(tmp_path)) == [Avatar("Gato 2.webp", None), Avatar("oso.png", None)]
    assert list_avatars(tmp_path / "none") == []


def test_each_avatar_has_its_colour(tmp_path: Path) -> None:
    folder = avatars_folder(tmp_path, 'oso.png: "#bfefff"\nmissing.png: "#000000"\n')
    assert list_avatars(folder) == [Avatar("oso.png", "#bfefff"), Avatar("Gato 2.webp", None)]


def test_the_avatars_come_in_the_order_of_their_colours(tmp_path: Path) -> None:
    folder = avatars_folder(tmp_path, 'oso.png: "#bfefff"\nGato 2.webp: "#ff8c1a"\n')
    (folder / "abeja.png").write_bytes(b"\x89PNG")  # no colour: last
    assert [avatar.name for avatar in list_avatars(folder)] == ["oso.png", "Gato 2.webp", "abeja.png"]


def test_broken_colours_leave_the_avatars_without_colours(tmp_path: Path) -> None:
    folder = avatars_folder(tmp_path, 'oso.png: "white"\n')
    assert list_avatars(folder) == [Avatar("Gato 2.webp", None), Avatar("oso.png", None)]
    (folder / COLORS_FILE).write_text("oso.png: [\n", encoding="utf-8")
    assert [avatar.color for avatar in list_avatars(folder)] == [None, None]


def test_api_serves_the_avatars_and_nothing_else(tmp_path: Path, client_for: Callable[..., TestClient]) -> None:
    folder = avatars_folder(tmp_path, 'oso.png: "#bfefff"\n')
    with client_for(EXAMPLE_GAMES, folder) as client:
        assert client.get("/api/avatars").json() == [
            {"id": "oso.png", "url": "avatars/oso.png", "color": "#bfefff"},
            {"id": "Gato 2.webp", "url": "avatars/Gato%202.webp", "color": None},
        ]
        assert client.get("/avatars/oso.png").status_code == 200
        assert client.get("/avatars/Gato%202.webp").status_code == 200
        for hidden in ("private/photo.jpg", "notes.txt", ".hidden.png", COLORS_FILE, "..%2Fx.png"):
            assert client.get(f"/avatars/{hidden}").status_code == 404, hidden


def test_no_avatars_folder_no_avatars(tmp_path: Path, client_for: Callable[..., TestClient]) -> None:
    with client_for(EXAMPLE_GAMES, tmp_path / "none") as client:
        assert client.get("/api/avatars").json() == []
