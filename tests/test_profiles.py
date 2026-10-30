"""The players' profiles (app/profiles.py): one per avatar, saved in profiles.yaml."""

from collections.abc import Callable
from pathlib import Path

from fastapi.testclient import TestClient

from app.profiles import Profile, load_profiles
from tests.conftest import GAMES


def avatars(tmp_path: Path) -> Path:
    folder = tmp_path / "avatars"
    folder.mkdir()
    (folder / "oso.png").write_bytes(b"\x89PNG")
    (folder / "Gato 2.webp").write_bytes(b"RIFF....WEBP")
    return folder


def test_a_saved_profile_is_there_next_time(tmp_path: Path, client_for: Callable[..., TestClient]) -> None:
    with client_for(GAMES, avatars(tmp_path)) as client:
        assert client.get("/api/profiles").json() == {}
        client.put("/api/profiles/oso.png", json={"name": "  Ana ", "level": "medium"}).raise_for_status()
        client.put("/api/profiles/Gato 2.webp", json={"level": "very_easy"}).raise_for_status()
        assert client.get("/api/profiles").json() == {
            "oso.png": {"name": "Ana", "level": "medium"},
            "Gato 2.webp": {"name": "", "level": "very_easy"},
        }
    assert load_profiles(tmp_path / "profiles.yaml")["oso.png"] == Profile(name="Ana", level="medium")


def test_a_profile_can_be_deleted(tmp_path: Path, client_for: Callable[..., TestClient]) -> None:
    with client_for(GAMES, avatars(tmp_path)) as client:
        client.put("/api/profiles/oso.png", json={"name": "Ana", "level": "hard"}).raise_for_status()
        assert client.delete("/api/profiles/oso.png").json() == {}
        assert client.get("/api/profiles").json() == {}


def test_only_real_avatars_and_good_values_are_saved(tmp_path: Path, client_for: Callable[..., TestClient]) -> None:
    with client_for(GAMES, avatars(tmp_path)) as client:
        assert client.put("/api/profiles/nadie.png", json={"name": "Ana"}).status_code == 404
        assert client.put("/api/profiles/oso.png", json={"level": "imposible"}).status_code == 422
        assert client.put("/api/profiles/oso.png", json={"name": "x" * 15}).status_code == 422
        assert client.put("/api/profiles/oso.png", json={"name": "Ana", "age": 9}).status_code == 422
        assert client.get("/api/profiles").json() == {}


def test_a_broken_profiles_file_means_no_profiles(tmp_path: Path) -> None:
    path = tmp_path / "profiles.yaml"
    path.write_text("oso.png: {level: imposible}\n", encoding="utf-8")
    assert load_profiles(path) == {}


def test_an_avatar_without_a_profile_has_its_name_from_names_yaml(
    tmp_path: Path, client_for: Callable[..., TestClient]
) -> None:
    folder = avatars(tmp_path)
    (folder / "names.yaml").write_text('oso.png: "Keko"\nGato 2.webp: "Pumuki"\nnadie.png: "Nadie"\n', encoding="utf-8")
    with client_for(GAMES, folder) as client:
        client.put("/api/profiles/oso.png", json={"name": "Ana", "level": "hard"}).raise_for_status()
        assert client.get("/api/profiles").json() == {
            "oso.png": {"name": "Ana", "level": "hard"},  # its own profile comes first
            "Gato 2.webp": {"name": "Pumuki", "level": "very_easy"},
        }
