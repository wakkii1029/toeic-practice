"""Review router — review wrong answers."""

from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path

from services.toeic import get_wrong_answers, get_history, PARTS

router = APIRouter()
templates = Jinja2Templates(
    directory=str(Path(__file__).resolve().parent.parent / "templates")
)


@router.get("/review")
async def review_page(request: Request):
    return templates.TemplateResponse(request=request, name="review.html", context={"parts": PARTS})


@router.get("/api/wrong-answers")
async def api_wrong_answers():
    wrong = get_wrong_answers()
    return JSONResponse(wrong)


@router.get("/api/history")
async def api_history():
    history = get_history()
    return JSONResponse(history)
