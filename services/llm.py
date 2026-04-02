"""LLM service — Ollama / OpenAI-compatible / HuggingFace local models."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from openai import OpenAI

CONFIG_PATH = Path(__file__).resolve().parent.parent / "data" / "config.json"

DEFAULT_CONFIG: dict[str, Any] = {
    "provider": "ollama",
    "ollama_base_url": "http://localhost:11434",
    "ollama_model": "gemma3:4b",
    "openai_base_url": "https://api.openai.com/v1",
    "openai_api_key": "",
    "openai_model": "gpt-4o-mini",
    "tts_voice": "ja-JP-NanamiNeural",
    "tts_rate": "-10%",
}


def load_config() -> dict[str, Any]:
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, encoding="utf-8") as f:
            saved = json.load(f)
        merged = {**DEFAULT_CONFIG, **saved}
        return merged
    return dict(DEFAULT_CONFIG)


def save_config(cfg: dict[str, Any]) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


def _client(cfg: dict[str, Any] | None = None) -> tuple[OpenAI, str]:
    cfg = cfg or load_config()
    provider = cfg.get("provider", "ollama")
    if provider == "ollama":
        return (
            OpenAI(base_url=f"{cfg['ollama_base_url']}/v1", api_key="ollama"),
            cfg["ollama_model"],
        )
    else:
        return (
            OpenAI(base_url=cfg["openai_base_url"], api_key=cfg["openai_api_key"]),
            cfg["openai_model"],
        )


def chat(
    messages: list[dict[str, str]],
    *,
    cfg: dict[str, Any] | None = None,
    temperature: float = 0.7,
    json_mode: bool = False,
) -> str:
    client, model = _client(cfg)
    kwargs: dict[str, Any] = dict(
        model=model,
        messages=messages,
        temperature=temperature,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    resp = client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""


def chat_json(
    messages: list[dict[str, str]],
    *,
    cfg: dict[str, Any] | None = None,
    temperature: float = 0.4,
) -> dict[str, Any]:
    raw = chat(messages, cfg=cfg, temperature=temperature, json_mode=True)
    raw = raw.strip()
    # Try to extract JSON from markdown code blocks if present
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if m:
        raw = m.group(1).strip()
    return json.loads(raw)


def list_ollama_models(base_url: str = "http://localhost:11434") -> list[str]:
    import httpx
    try:
        r = httpx.get(f"{base_url}/api/tags", timeout=5)
        r.raise_for_status()
        return [m["name"] for m in r.json().get("models", [])]
    except Exception:
        return []
