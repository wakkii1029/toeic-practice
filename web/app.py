"""TOEIC Practice App — FastAPI entry point."""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure project root is on sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from web.routers import practice, review, vocabulary, problems, settings as settings_router

WEB_DIR = Path(__file__).resolve().parent
AUDIO_DIR = ROOT / "data" / "audio"

app = FastAPI(title="TOEIC Practice")

# Static files
app.mount("/static", StaticFiles(directory=str(WEB_DIR / "static")), name="static")

# Audio files (generated TTS)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")

# Templates
templates = Jinja2Templates(directory=str(WEB_DIR / "templates"))

# Routers
app.include_router(practice.router)
app.include_router(review.router)
app.include_router(vocabulary.router)
app.include_router(problems.router)
app.include_router(settings_router.router)


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request=request, name="practice.html", context={"parts": {}})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "web.app:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[str(ROOT)],
        reload_excludes=[".*", "*.json", "*.mp3"],
    )
