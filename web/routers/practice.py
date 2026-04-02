"""Practice router — generate & answer TOEIC problems."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path

from services.toeic import (
    PARTS, generate_problem, generate_explanation, save_answer,
)
from services.tts import generate_audio

router = APIRouter()
templates = Jinja2Templates(
    directory=str(Path(__file__).resolve().parent.parent / "templates")
)


@router.get("/practice")
async def practice_page(request: Request):
    return templates.TemplateResponse(request=request, name="practice.html", context={"parts": PARTS})


@router.post("/api/generate")
async def api_generate(request: Request):
    body = await request.json()
    part = int(body.get("part", 5))
    if part not in PARTS:
        return JSONResponse({"error": f"Invalid part: {part}"}, status_code=400)
    try:
        problem = await asyncio.to_thread(generate_problem, part)
        return JSONResponse(problem)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/answer")
async def api_answer(request: Request):
    body = await request.json()
    problem_id = body.get("problem_id")
    part = int(body.get("part", 5))
    user_answers = body.get("user_answers", {})
    problem_data = body.get("problem_data", {})

    # Build results
    data = problem_data
    results = []

    if part in (1, 2, 5):
        correct = data.get("answer", "")
        ua = user_answers.get("q0", "")
        results.append({"is_correct": ua == correct, "correct_answer": correct, "user_answer": ua})
    elif part in (3, 4, 7):
        for i, q in enumerate(data.get("questions", [])):
            correct = q.get("answer", "")
            ua = user_answers.get(f"q{i}", "")
            results.append({"is_correct": ua == correct, "correct_answer": correct, "user_answer": ua})
    elif part == 6:
        for i, q in enumerate(data.get("questions", [])):
            correct = q.get("answer", "")
            ua = user_answers.get(f"q{i}", "")
            results.append({"is_correct": ua == correct, "correct_answer": correct, "user_answer": ua})

    record = save_answer(problem_id, part, user_answers, results, problem_data)

    # Generate explanation
    problem_obj = {"part": part, "data": problem_data}
    try:
        explanation = await asyncio.to_thread(generate_explanation, problem_obj, user_answers)
    except Exception:
        explanation = {"error": "解説の生成に失敗しました"}

    return JSONResponse({
        "results": results,
        "explanation": explanation,
        "record_id": record["id"],
    })


@router.post("/api/tts")
async def api_tts(request: Request):
    body = await request.json()
    text = body.get("text", "").strip()
    if not text:
        return JSONResponse({"error": "No text provided"}, status_code=400)
    try:
        url = await asyncio.to_thread(generate_audio, text)
        return JSONResponse({"url": url})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
