"""Settings router — LLM configuration."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path

from services.llm import load_config, save_config, list_ollama_models

router = APIRouter()
templates = Jinja2Templates(
    directory=str(Path(__file__).resolve().parent.parent / "templates")
)


@router.get("/settings")
async def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="settings.html")


@router.get("/api/settings")
async def api_get_settings():
    return JSONResponse(load_config())


@router.post("/api/settings")
async def api_save_settings(request: Request):
    body = await request.json()
    cfg = load_config()
    cfg.update(body)
    save_config(cfg)
    return JSONResponse({"ok": True})


@router.get("/api/ollama-models")
async def api_ollama_models():
    cfg = load_config()
    models = await asyncio.to_thread(
        list_ollama_models, cfg.get("ollama_base_url", "http://localhost:11434")
    )
    return JSONResponse(models)
