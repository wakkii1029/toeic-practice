"""Vocabulary router — word book management."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path

from services.vocabulary import get_all, add_word, update_word, delete_word

router = APIRouter()
templates = Jinja2Templates(
    directory=str(Path(__file__).resolve().parent.parent / "templates")
)


@router.get("/vocabulary")
async def vocabulary_page(request: Request):
    return templates.TemplateResponse(request=request, name="vocabulary.html")


@router.get("/api/vocabulary")
async def api_get_vocabulary():
    return JSONResponse(get_all())


@router.post("/api/vocabulary")
async def api_add_word(request: Request):
    body = await request.json()
    word = body.get("word", "").strip()
    context = body.get("context_sentence", "")
    if not word:
        return JSONResponse({"error": "No word provided"}, status_code=400)
    try:
        entry = await asyncio.to_thread(add_word, word, context)
        return JSONResponse(entry)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.put("/api/vocabulary/{word_id}")
async def api_update_word(word_id: str, request: Request):
    body = await request.json()
    updated = update_word(word_id, body)
    if updated:
        return JSONResponse(updated)
    return JSONResponse({"error": "Not found"}, status_code=404)


@router.delete("/api/vocabulary/{word_id}")
async def api_delete_word(word_id: str):
    if delete_word(word_id):
        return JSONResponse({"ok": True})
    return JSONResponse({"error": "Not found"}, status_code=404)
