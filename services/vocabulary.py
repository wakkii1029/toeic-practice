"""Vocabulary book service."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from services.llm import chat_json

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
VOCAB_PATH = DATA_DIR / "vocabulary.json"


def _load() -> list[dict]:
    if VOCAB_PATH.exists():
        with open(VOCAB_PATH, encoding="utf-8") as f:
            return json.load(f)
    return []


def _save(data: list[dict]) -> None:
    VOCAB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(VOCAB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_all() -> list[dict]:
    return _load()


def add_word(word: str, context_sentence: str = "") -> dict[str, Any]:
    # Generate explanation via LLM
    messages = [
        {"role": "system", "content": "あなたは英語教師です。TOEIC学習者向けに単語の解説を日本語で行ってください。JSON形式で返答してください。"},
        {"role": "user", "content": f"""\
以下の英単語について、TOEIC学習者向けの詳しい解説を生成してください。

単語: {word}
文脈（出題文）: {context_sentence}

JSON形式:
{{
  "word": "{word}",
  "pronunciation": "発音記号",
  "part_of_speech": "品詞",
  "meaning": "日本語の意味（主要な意味を2-3個）",
  "example_sentences": [
    {{"en": "英語例文1", "ja": "和訳1"}},
    {{"en": "英語例文2", "ja": "和訳2"}}
  ],
  "synonyms": ["類義語1", "類義語2"],
  "toeic_tips": "TOEICでの出題傾向やポイント"
}}"""},
    ]
    explanation = chat_json(messages, temperature=0.3)

    entry = {
        "id": str(uuid.uuid4()),
        "word": word,
        "context_sentence": context_sentence,
        "explanation": explanation,
        "user_notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "mastered": False,
    }
    vocab = _load()
    vocab.append(entry)
    _save(vocab)
    return entry


def update_word(word_id: str, updates: dict[str, Any]) -> dict | None:
    vocab = _load()
    for entry in vocab:
        if entry["id"] == word_id:
            entry.update(updates)
            _save(vocab)
            return entry
    return None


def delete_word(word_id: str) -> bool:
    vocab = _load()
    new_vocab = [e for e in vocab if e["id"] != word_id]
    if len(new_vocab) < len(vocab):
        _save(new_vocab)
        return True
    return False
