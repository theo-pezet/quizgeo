#!/usr/bin/env python3
"""Génère l'icône de l'app et ses déclinaisons (Pillow, sans asset externe).

    python3 tools/make_icons.py assets/images

Motif : une couronne blanche à trois gemmes sur un dégradé violet, et le
mot « GEO ». Fichiers produits : icon.png (1024, coins carrés, Android et
web), android-icon-foreground.png (1024, transparent, zone sûre 66 %),
android-icon-background.png (1024, dégradé), android-icon-monochrome.png
(1024, silhouette blanche), splash-icon.png (512, transparent), favicon.png (64).
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PRIMARY = (91, 75, 255)
PRIMARY_DARK = (76, 29, 149)
GOLD = (245, 179, 1)
ORANGE = (255, 107, 53)
WHITE = (255, 255, 255)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def gradient(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size), PRIMARY)
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = tuple(int(PRIMARY[i] * (1 - t) + PRIMARY_DARK[i] * t) for i in range(3))
    return img


def crown(draw: ImageDraw.ImageDraw, cx: float, cy: float, w: float, color, gems=True):
    """Couronne centrée en (cx, cy), largeur w."""
    h = w * 0.62
    left, right = cx - w / 2, cx + w / 2
    top, bottom = cy - h / 2, cy + h / 2
    base_h = h * 0.28
    # corps : trois pointes
    pts = [
        (left, bottom - base_h),
        (left, top + h * 0.25),
        (cx - w * 0.25, bottom - base_h - h * 0.12),
        (cx, top),
        (cx + w * 0.25, bottom - base_h - h * 0.12),
        (right, top + h * 0.25),
        (right, bottom - base_h),
    ]
    draw.polygon(pts, fill=color)
    draw.rounded_rectangle([left, bottom - base_h, right, bottom], radius=base_h * 0.35, fill=color)
    if gems:
        r = w * 0.055
        for gx, gy, c in ((left + w * 0.02, top + h * 0.25, ORANGE), (cx, top, GOLD), (right - w * 0.02, top + h * 0.25, ORANGE)):
            draw.ellipse([gx - r, gy - r, gx + r, gy + r], fill=c)
        for gx in (cx - w * 0.25, cx + w * 0.25):
            gy = bottom - base_h / 2
            draw.ellipse([gx - r * 0.7, gy - r * 0.7, gx + r * 0.7, gy + r * 0.7], fill=GOLD)


def wordmark(draw: ImageDraw.ImageDraw, cx: float, cy: float, size: int, color):
    font = ImageFont.truetype(FONT, size)
    text = "GEO"
    box = draw.textbbox((0, 0), text, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    draw.text((cx - w / 2 - box[0], cy - h / 2 - box[1]), text, font=font, fill=color)


def glyph(size: int, color, gems: bool, scale: float = 1.0, with_text: bool = True) -> Image.Image:
    """Couronne + GEO sur fond transparent, occupant `scale` de la taille."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w = size * 0.56 * scale
    if with_text:
        crown(d, size / 2, size * 0.42, w, color, gems)
        wordmark(d, size / 2, size * 0.74, int(size * 0.2 * scale), color)
    else:
        crown(d, size / 2, size / 2, w, color, gems)
    return img


def main(out_dir: str) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    S = 1024

    icon = gradient(S).convert("RGBA")
    icon.alpha_composite(glyph(S, WHITE, True))
    icon.save(out / "icon.png")

    gradient(S).save(out / "android-icon-background.png")
    # Zone sûre de l'icône adaptative : les 66 % centraux.
    glyph(S, WHITE, True, scale=0.62).save(out / "android-icon-foreground.png")
    glyph(S, WHITE, False, scale=0.62).save(out / "android-icon-monochrome.png")
    glyph(512, WHITE, True, scale=0.9, with_text=False).save(out / "splash-icon.png")
    icon.resize((64, 64), Image.LANCZOS).save(out / "favicon.png")

    # Icône de notification Android : silhouette blanche, 96 px.
    glyph(96, WHITE, False, scale=0.9, with_text=False).save(out / "notification-icon.png")
    for f in sorted(out.glob("*.png")):
        print(f.name, Image.open(f).size)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "assets/images")
