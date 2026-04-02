"""Text-to-Speech service using edge-tts for listening practice."""

from __future__ import annotations

import asyncio
import hashlib
from pathlib import Path

from services.llm import load_config

AUDIO_DIR = Path(__file__).resolve().parent.parent / "data" / "audio"


async def _generate(text: str, voice: str, rate: str, output: Path) -> None:
    import edge_tts
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(str(output))


def generate_audio(text: str) -> str:
    """Generate audio file and return relative URL path."""
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    cfg = load_config()
    voice = cfg.get("tts_voice", "en-US-AriaNeural")
    rate = cfg.get("tts_rate", "-10%")

    # Use hash for caching
    key = hashlib.md5(f"{text}:{voice}:{rate}".encode()).hexdigest()
    filename = f"{key}.mp3"
    filepath = AUDIO_DIR / filename

    if not filepath.exists():
        asyncio.run(_generate(text, voice, rate, filepath))

    return f"/audio/{filename}"
