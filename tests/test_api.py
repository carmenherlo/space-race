"""The rest of the app (app/main.py): health, the voice and the web page."""

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok"}


def test_without_a_voice_model_the_voice_says_so(client: TestClient) -> None:
    # 503: the browser then uses the tablet's own voice.
    assert client.get("/api/voice", params={"text": "Hola"}).status_code == 503


def test_the_voice_checks_its_text(client: TestClient) -> None:
    assert client.get("/api/voice", params={"text": ""}).status_code == 422
    assert client.get("/api/voice", params={"text": "x" * 601}).status_code == 422
    assert client.get("/api/voice", params={"text": "Hola", "who": "alien"}).status_code == 422


def test_home_is_the_games_menu(client: TestClient) -> None:
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "games.html"
    assert "Juegos" in client.get("/").text


def test_the_pages_are_served_and_always_checked(client: TestClient) -> None:
    for page in ("games.html", "game.html", "js/game.js", "css/game.css"):
        response = client.get(f"/{page}")
        assert response.status_code == 200, page
        assert response.headers["cache-control"] == "no-cache"


def test_nothing_from_missionboard_is_left(client: TestClient) -> None:
    for path in ("/api/people", "/api/board", "/api/shop", "/api/meals", "/media/x.png"):
        assert client.get(path).status_code == 404, path
