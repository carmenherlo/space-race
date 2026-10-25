"""The voice: texts read aloud with Piper (a natural-sounding voice, made on this server,
no internet needed). The browser plays it (app/static/js/voice.js); the "robot" one is the
same voice with an effect added there.

The voice model is a Piper .onnx file (with its .onnx.json): es_ES-sharvard-medium, which
has two speakers, a woman (F) and a man (M). The Docker image brings it; for development
it is in data/voices (see dev.sh). Without it, or without Piper, there is no voice here and
the browser falls back to the tablet's own.

Each text, once said, is kept as a WAV file in the cache folder: cards repeat a lot.
"""

import hashlib
import io
import logging
import threading
import wave
from pathlib import Path
from typing import Literal

logger = logging.getLogger(__name__)

# Who says it, and how: the speaker of the model for each voice of the game, and its style.
# Piper's usual style (noise_scale 0.667, noise_w 0.8, length 1) reads rather flat: more
# noise_scale gives a livelier intonation, more noise_w a less even rhythm, and a length
# under 1 reads faster, which sounds more excited. The robot, on purpose, reads flatter.
Who = Literal["natural", "robot"]
SPEAKERS: dict[str, str] = {"natural": "F", "robot": "M"}
STYLES: dict[str, dict[str, float]] = {
    "natural": {"noise_scale": 0.9, "noise_w_scale": 1.0, "length_scale": 0.88},
    "robot": {"noise_scale": 0.4, "noise_w_scale": 0.5, "length_scale": 1.05},
}
MAX_TEXT = 600  # characters; a card is far shorter


class VoiceUnavailableError(RuntimeError):
    """No voice model, or Piper is not installed."""


class Voice:
    def __init__(self, model_path: Path, cache_dir: Path) -> None:
        self.model_path = model_path
        self.cache_dir = cache_dir
        self._piper = None  # the loaded model (loading takes a couple of seconds)
        self._lock = threading.Lock()  # one synthesis at a time

    @property
    def available(self) -> bool:
        return self.model_path.is_file()

    def load(self) -> None:
        """Load the model now (at startup, in the background), so the first card is quick."""
        try:
            with self._lock:
                self._load()
        except VoiceUnavailableError as error:
            logger.warning("No voice: %s", error)

    def speak(self, text: str, who: Who) -> bytes:
        """The text said by that voice, as a WAV file (from the cache when it was said before)."""
        style = STYLES[who]
        key = hashlib.sha256(f"{self.model_path.name}|{who}|{sorted(style.items())}|{text}".encode()).hexdigest()
        cached = self.cache_dir / f"{key}.wav"
        if cached.is_file():
            return cached.read_bytes()
        with self._lock:
            piper = self._load()
            from piper import SynthesisConfig

            speaker = piper.config.speaker_id_map.get(SPEAKERS[who])
            buffer = io.BytesIO()
            with wave.open(buffer, "wb") as wav:
                piper.synthesize_wav(text, wav, syn_config=SynthesisConfig(speaker_id=speaker, **style))
        audio = buffer.getvalue()
        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            cached.write_bytes(audio)
        except OSError as error:  # a full or read-only disk: it still talks, just not cached
            logger.warning("Voice cache not written: %s", error)
        return audio

    def _load(self):
        if self._piper is None:
            if not self.available:
                raise VoiceUnavailableError(f"no voice model at {self.model_path}")
            try:
                from piper import PiperVoice
            except ImportError as error:
                raise VoiceUnavailableError("Piper is not installed (pip install piper-tts)") from error
            self._piper = PiperVoice.load(self.model_path)
        return self._piper
