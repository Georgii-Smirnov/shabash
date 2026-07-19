#!/usr/bin/env python3
"""Optimize images for Shabash landing page.

Strategy:
- Re-encode in place (overwrite originals) for images that don't need lightbox zoom.
- Create thumbs/ copies for images used in sliders where lightbox needs original.
- Keep quality high (q78–85) as requested.
"""
import os
from pathlib import Path
from PIL import Image

ROOT = Path("img")
THUMBS = ROOT / "thumbs"

# Ensure thumbs dirs exist
(THUMBS / "docs").mkdir(parents=True, exist_ok=True)


def save_webp(src: Path, dest: Path, quality: int, max_size: tuple | None = None):
    img = Image.open(src)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGBA")
    else:
        img = img.convert("RGB")
    if max_size:
        img.thumbnail(max_size, Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=quality, method=6)
    print(f"  {src} -> {dest} ({os.path.getsize(dest)//1024} KiB)")


# 1. Hero: re-encode q78 same dims, also mobile version
print("Hero:")
save_webp(ROOT / "hero.webp", ROOT / "hero.webp", quality=78)
save_webp(ROOT / "hero.webp", ROOT / "hero-768.webp", quality=78, max_size=(768, 768))

# 2. Logo: resize to 300px wide, q85
print("Logo:")
save_webp(ROOT / "logo.webp", ROOT / "logo.webp", quality=85, max_size=(300, 300))

# 3. Specialist portraits: resize to 900px wide (portrait), q80
portraits = [
    ROOT / "julia" / "Julia.webp",
    ROOT / "julia" / "julia-1.webp",
    ROOT / "julia" / "julia-2.webp",
    ROOT / "ruslana" / "ruslana-1.webp",
    ROOT / "ruslana" / "ruslana-2.webp",
    ROOT / "ruslana" / "ruslana-3.webp",
    ROOT / "anna" / "anna-1.webp",
    ROOT / "anna" / "anna-2.webp",
    ROOT / "anna" / "anna-3.webp",
    ROOT / "anna" / "anna-4.webp",
]
print("Portraits (resize in place to 900w, q80):")
for p in portraits:
    save_webp(p, p, quality=80, max_size=(900, 900))

# 4. Decorative side images in specialist panels (no lightbox zoom)
print("Decorative side images (resize in place to 900w, q80):")
for name in ("hair-tools.webp", "nails.webp"):
    p = ROOT / name
    save_webp(p, p, quality=80, max_size=(900, 900))

# 5. Thumbs for docs + slider images (keep originals for lightbox)
print("Thumbs for docs & slider (800w, q80):")
doc_files = [
    ROOT / "docs" / f"yulia-{i:02d}.webp" for i in range(1, 6)
] + [
    ROOT / "docs" / f"ruslana-{i:02d}.webp" for i in range(1, 8)
]
for p in doc_files:
    save_webp(p, THUMBS / "docs" / p.name, quality=80, max_size=(800, 800))

other_thumbs = [
    ROOT / "spa.webp",
    ROOT / "candles-modern.webp",
    ROOT / "candles-sage.webp",
    ROOT / "about.webp",
    ROOT / "mood-wheat.webp",
    ROOT / "textures.webp",
]
print("Thumbs for other slider/location images (800w, q80):")
for p in other_thumbs:
    save_webp(p, THUMBS / p.name, quality=80, max_size=(800, 800))

print("\nDone.")
