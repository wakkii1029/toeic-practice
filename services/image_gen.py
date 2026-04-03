"""Image generation service using Stable Diffusion (diffusers)."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

IMAGES_DIR = Path(__file__).resolve().parent.parent / "data" / "images"

# Lazy-loaded model — only loaded when first image is requested
_pipe = None


def _get_pipe():
    """Load SD Turbo pipeline on first use (lazy init to save VRAM)."""
    global _pipe
    if _pipe is not None:
        return _pipe

    import torch
    from diffusers import AutoPipelineForText2Image

    _pipe = AutoPipelineForText2Image.from_pretrained(
        "stabilityai/sd-turbo",
        torch_dtype=torch.float16,
        variant="fp16",
    )
    _pipe = _pipe.to("cuda")
    # Enable memory optimizations
    _pipe.enable_attention_slicing()
    return _pipe


def generate_image(prompt: str, width: int = 512, height: int = 512) -> str:
    """Generate an image and return the relative URL path.

    Uses SD Turbo (1-step generation) for speed.
    Returns path like /images/{hash}.png
    """
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # Cache by prompt
    key = hashlib.md5(f"{prompt}:{width}:{height}".encode()).hexdigest()
    filename = f"{key}.png"
    filepath = IMAGES_DIR / filename

    if filepath.exists():
        return f"/images/{filename}"

    pipe = _get_pipe()
    result = pipe(
        prompt=prompt,
        num_inference_steps=4,
        guidance_scale=0.0,
        width=width,
        height=height,
    )
    image = result.images[0]
    image.save(str(filepath))

    return f"/images/{filename}"


def unload_model():
    """Free VRAM by unloading the SD model."""
    global _pipe
    if _pipe is not None:
        del _pipe
        _pipe = None
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
