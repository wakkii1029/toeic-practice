"""Problems router — list and manage saved problems."""

from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path

from services.toeic import get_problems, get_history, delete_problem, PARTS

router = APIRouter()
templates = Jinja2Templates(
    directory=str(Path(__file__).resolve().parent.parent / "templates")
)


@router.get("/problems")
async def problems_page(request: Request):
    return templates.TemplateResponse(request=request, name="problems.html", context={"parts": PARTS})


@router.get("/api/problems")
async def api_get_problems():
    problems = get_problems()
    history = get_history()

    # Build a lookup: problem_id -> answer stats
    stats: dict[str, dict] = {}
    for h in history:
        pid = h.get("problem_id")
        if pid not in stats:
            stats[pid] = {"attempts": 0, "correct": 0, "wrong": 0}
        stats[pid]["attempts"] += 1
        for r in h.get("results", []):
            if r.get("is_correct"):
                stats[pid]["correct"] += 1
            else:
                stats[pid]["wrong"] += 1

    # Attach stats to each problem
    for p in problems:
        p["stats"] = stats.get(p["id"], {"attempts": 0, "correct": 0, "wrong": 0})

    return JSONResponse(problems)


@router.delete("/api/problems/{problem_id}")
async def api_delete_problem(problem_id: str):
    if delete_problem(problem_id):
        return JSONResponse({"ok": True})
    return JSONResponse({"error": "Not found"}, status_code=404)
