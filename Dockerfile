FROM python:3.12-slim

# No .pyc files in the image; logs are written immediately.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    SPACE_RACE_GAMES=/data/games \
    SPACE_RACE_AVATARS=/data/avatars \
    SPACE_RACE_CACHE=/data/cache

WORKDIR /app

# Dependencies first: this layer is reused while only the app code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# The voice (app/voice.py): Piper's Spanish model, with a woman's and a man's voice. In its
# own layer, downloaded once: it is big (about 77 MB) and never changes.
ARG VOICE=es_ES-sharvard-medium
ARG VOICE_URL=https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/sharvard/medium
RUN mkdir -p /opt/voices && python -c "import urllib.request as u; \
[u.urlretrieve(f'${VOICE_URL}/${VOICE}{ext}?download=true', f'/opt/voices/${VOICE}{ext}') \
 for ext in ('.onnx', '.onnx.json')]"

COPY app/ app/

# /data: the games and the avatars (mounted from ./data, see docker-compose.yml).
EXPOSE 8000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
