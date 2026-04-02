"""TOEIC problem generation & explanation service."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from services.llm import chat_json, chat, load_config

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
PROBLEMS_PATH = DATA_DIR / "problems.json"
HISTORY_PATH = DATA_DIR / "history.json"

# ── TOEIC Part definitions ──────────────────────────────────────────
PARTS = {
    1: {"name": "Part 1", "title": "写真描写問題", "section": "Listening",
        "description": "写真を見て、4つの説明文の中から最も適切なものを選ぶ"},
    2: {"name": "Part 2", "title": "応答問題", "section": "Listening",
        "description": "質問または発言を聞き、3つの応答の中から最も適切なものを選ぶ"},
    3: {"name": "Part 3", "title": "会話問題", "section": "Listening",
        "description": "会話を聞き、設問に対する最も適切な答えを選ぶ"},
    4: {"name": "Part 4", "title": "説明文問題", "section": "Listening",
        "description": "説明文を聞き、設問に対する最も適切な答えを選ぶ"},
    5: {"name": "Part 5", "title": "短文穴埋め問題", "section": "Reading",
        "description": "文中の空所に入る最も適切な語句を選ぶ"},
    6: {"name": "Part 6", "title": "長文穴埋め問題", "section": "Reading",
        "description": "文章中の空所に入る最も適切な語句または文を選ぶ"},
    7: {"name": "Part 7", "title": "読解問題", "section": "Reading",
        "description": "文章を読み、設問に対する最も適切な答えを選ぶ"},
}

# ── Prompt templates per part ────────────────────────────────────────

_SYSTEM_PROMPT = """\
あなたはTOEIC問題作成の専門家です。本番のTOEICテストに忠実な問題を生成してください。
回答はJSON形式で返してください。"""

_GENERATE_PROMPTS: dict[int, str] = {
    1: """\
TOEIC Part 1（写真描写問題）を1問生成してください。
写真の代わりに、場面の詳細な英語描写（scene_description）を提供してください。
4つの選択肢 (A)-(D) を作成し、正解は1つだけにしてください。

JSON形式:
{{
  "scene_description": "場面の英語描写",
  "choices": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
  "answer": "A",
  "audio_text": "選択肢を読み上げるための英文テキスト（Look at the picture. (A) ... (B) ... (C) ... (D) ...）"
}}""",
    2: """\
TOEIC Part 2（応答問題）を1問生成してください。
質問または発言文と、3つの応答選択肢 (A)-(C) を作成してください。

JSON形式:
{{
  "question": "英語の質問・発言文",
  "choices": {{"A": "...", "B": "...", "C": "..."}},
  "answer": "A",
  "audio_text": "読み上げ用テキスト（質問文。(A) ... (B) ... (C) ...）"
}}""",
    3: """\
TOEIC Part 3（会話問題）を生成してください。
2〜3人の会話と、それに関する設問を2問作成してください。

JSON形式:
{{
  "conversation": "英語の会話文（話者名付き）",
  "questions": [
    {{
      "question": "設問1の英文",
      "choices": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "answer": "A"
    }},
    {{
      "question": "設問2の英文",
      "choices": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "answer": "B"
    }}
  ],
  "audio_text": "会話全体の読み上げ用テキスト"
}}""",
    4: """\
TOEIC Part 4（説明文問題）を生成してください。
アナウンスやスピーチなどの説明文と、それに関する設問を2問作成してください。

JSON形式:
{{
  "talk": "英語の説明文・アナウンス",
  "questions": [
    {{
      "question": "設問1の英文",
      "choices": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "answer": "A"
    }},
    {{
      "question": "設問2の英文",
      "choices": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "answer": "B"
    }}
  ],
  "audio_text": "説明文全体の読み上げ用テキスト"
}}""",
    5: """\
TOEIC Part 5（短文穴埋め問題）を1問生成してください。
文中に ______ （空所）を含む英文と、4つの選択肢を作成してください。

JSON形式:
{{
  "sentence": "The company ______ its new policy last week.",
  "choices": {{"A": "announce", "B": "announced", "C": "announcing", "D": "announcement"}},
  "answer": "B"
}}""",
    6: """\
TOEIC Part 6（長文穴埋め問題）を生成してください。
メールやお知らせなどの文章（150〜200語）に2つの空所を設け、各空所に4つの選択肢を作成してください。

JSON形式:
{{
  "passage": "英語の文章（空所は [1], [2] で表記）",
  "questions": [
    {{
      "blank": 1,
      "choices": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "answer": "A"
    }},
    {{
      "blank": 2,
      "choices": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "answer": "C"
    }}
  ]
}}""",
    7: """\
TOEIC Part 7（読解問題）を生成してください。
メール、広告、記事などの文章（200〜300語）と、それに関する設問を2問作成してください。

JSON形式:
{{
  "passage": "英語の文章",
  "questions": [
    {{
      "question": "設問1の英文",
      "choices": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "answer": "A"
    }},
    {{
      "question": "設問2の英文",
      "choices": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "answer": "B"
    }}
  ]
}}""",
}


def _load_json(path: Path) -> list[dict]:
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_json(path: Path, data: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Generate ─────────────────────────────────────────────────────────

def generate_problem(part: int) -> dict[str, Any]:
    prompt = _GENERATE_PROMPTS[part]
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]
    data = chat_json(messages, temperature=0.8)
    problem = {
        "id": str(uuid.uuid4()),
        "part": part,
        "data": data,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "llm",
    }
    # persist
    problems = _load_json(PROBLEMS_PATH)
    problems.append(problem)
    _save_json(PROBLEMS_PATH, problems)
    return problem


# ── Explanation ──────────────────────────────────────────────────────

_EXPLAIN_SYSTEM = """\
あなたはTOEIC講師です。問題の解説を日本語で丁寧に行ってください。
英文には和訳を付けてください。なぜその答えが正しいのか、他の選択肢がなぜ間違いなのかを説明してください。
回答はJSON形式で返してください。"""


def generate_explanation(problem: dict[str, Any], user_answers: dict[str, str]) -> dict[str, Any]:
    messages = [
        {"role": "system", "content": _EXPLAIN_SYSTEM},
        {"role": "user", "content": f"""\
以下のTOEIC Part {problem['part']} の問題について、和訳込みの詳しい解説を生成してください。

問題データ:
{json.dumps(problem['data'], ensure_ascii=False, indent=2)}

ユーザーの回答:
{json.dumps(user_answers, ensure_ascii=False)}

JSON形式で返してください:
{{
  "overall_translation": "問題文全体の和訳",
  "explanations": [
    {{
      "question_text": "設問の英文（該当部分）",
      "translation": "設問の和訳",
      "correct_answer": "正解の選択肢記号",
      "user_answer": "ユーザーの回答",
      "is_correct": true/false,
      "explanation": "なぜこの答えが正しいのか、他の選択肢がなぜ間違いなのかの解説"
    }}
  ],
  "key_vocabulary": [
    {{"word": "英単語", "meaning": "意味", "example": "例文"}}
  ],
  "grammar_points": ["文法ポイントの解説"]
}}"""},
    ]
    return chat_json(messages, temperature=0.3)


# ── History ──────────────────────────────────────────────────────────

def save_answer(
    problem_id: str,
    part: int,
    user_answers: dict[str, str],
    results: list[dict],
    problem_data: dict,
) -> dict:
    record = {
        "id": str(uuid.uuid4()),
        "problem_id": problem_id,
        "part": part,
        "user_answers": user_answers,
        "results": results,
        "problem_data": problem_data,
        "answered_at": datetime.now(timezone.utc).isoformat(),
    }
    history = _load_json(HISTORY_PATH)
    history.append(record)
    _save_json(HISTORY_PATH, history)
    return record


def get_history() -> list[dict]:
    return _load_json(HISTORY_PATH)


def get_wrong_answers() -> list[dict]:
    history = get_history()
    wrong = []
    for rec in history:
        has_wrong = any(not r.get("is_correct", True) for r in rec.get("results", []))
        if has_wrong:
            wrong.append(rec)
    return wrong


def get_problems() -> list[dict]:
    return _load_json(PROBLEMS_PATH)


def get_problem_by_id(problem_id: str) -> dict | None:
    for p in _load_json(PROBLEMS_PATH):
        if p["id"] == problem_id:
            return p
    return None
