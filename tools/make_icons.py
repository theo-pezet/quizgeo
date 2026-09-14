#!/usr/bin/env python3
"""Génère l'icône de l'app et ses déclinaisons (Pillow, police Nunito du projet).

    python3 tools/make_icons.py assets/images

Motif : un sentier blanc qui monte en zigzag, trois étapes rondes, la
dernière dorée avec une étoile, sur un dégradé orange → corail. C'est le
parcours de l'app, reconnaissable en 48 px comme en 512 px.

Fichiers : icon.png (1024, coins carrés), android-icon-foreground.png (1024,
transparent, zone sûre 66 %), android-icon-background.png (1024, dégradé),
android-icon-monochrome.png (1024, silhouette blanche), splash-icon.png (512,
transparent), favicon.png (64), notification-icon.png (96, silhouette blanche).
"""

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ORANGE = (249, 115, 22)
CORAL = (232, 86, 43)
INK = (31, 27, 46)
GOLD = (242, 183, 5)
WHITE = (255, 255, 255)
SS = 4  # sur-échantillonnage pour l'anticrénelage
FONT = "node_modules/@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf"


def gradient(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size), ORANGE)
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x * 0.4 + y * 0.6) / size
            px[x, y] = tuple(int(ORANGE[i] * (1 - t) + CORAL[i] * t) for i in range(3))
    return img


def star(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, color):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    draw.polygon(pts, fill=color)


def trail(size: int, scale: float = 1.0, mono: bool = False, shadow: bool = True) -> Image.Image:
    """Le motif, transparent, centré ; `scale` réduit le motif (zone sûre adaptative)."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    u = s * scale  # unité : le motif occupe un carré de côté u, centré
    ox, oy = (s - u) / 2, (s - u) / 2
    nodes = [(0.24, 0.76), (0.50, 0.50), (0.76, 0.26)]
    pts = [(ox + x * u, oy + y * u) for x, y in nodes]
    w = u * 0.11
    r = u * 0.12
    if shadow and not mono:
        sh = (0, 0, 0, 60)
        off = u * 0.03
        d.line([(x, y + off) for x, y in pts], fill=sh, width=int(w), joint="curve")
        for x, y in pts:
            d.ellipse([x - r, y - r + off, x + r, y + r + off], fill=sh)
    d.line(pts, fill=WHITE, width=int(w), joint="curve")
    for i, (x, y) in enumerate(pts):
        d.ellipse([x - r, y - r, x + r, y + r], fill=WHITE)
        inner = r * 0.55
        if i == 2:
            if mono:
                d.ellipse([x - inner, y - inner, x + inner, y + inner], fill=(0, 0, 0, 0))
            else:
                d.ellipse([x - r, y - r, x + r, y + r], fill=GOLD)
                star(d, x, y, r * 0.62, WHITE)
        else:
            d.ellipse([x - inner, y - inner, x + inner, y + inner], fill=(0, 0, 0, 0) if mono else (CORAL if i == 0 else ORANGE))
    return img.resize((size, size), Image.LANCZOS)


def main(out_dir: str) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    icon = gradient(1024).convert("RGBA")
    icon.alpha_composite(trail(1024, 0.78))
    icon.convert("RGB").save(out / "icon.png")

    gradient(1024).save(out / "android-icon-background.png")
    trail(1024, 0.56).save(out / "android-icon-foreground.png")
    trail(1024, 0.56, mono=True, shadow=False).save(out / "android-icon-monochrome.png")
    trail(512, 0.9).save(out / "splash-icon.png")
    trail(96, 0.95, mono=True, shadow=False).save(out / "notification-icon.png")
    fav = gradient(64).convert("RGBA")
    fav.alpha_composite(trail(64, 0.85, shadow=False))
    fav.convert("RGB").save(out / "favicon.png")

    # Bannière Play Store (1024 × 500) : logo + nom + promesse.
    banner = Image.new("RGB", (1024, 500), (251, 248, 242))
    b = ImageDraw.Draw(banner)
    logo = gradient(300).convert("RGBA")
    logo.alpha_composite(trail(300, 0.78))
    mask = Image.new("L", (300, 300), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, 299, 299], radius=64, fill=255)
    banner.paste(logo.convert("RGB"), (72, 100), mask)
    title_font = ImageFont.truetype(FONT, 86)
    sub_font = ImageFont.truetype(FONT, 34)
    name = sys.argv[2] if len(sys.argv) > 2 else "Skilltrail"
    b.text((420, 150), name, font=title_font, fill=INK)
    b.text((424, 262), "Marketing digital, IA, Python, web", font=sub_font, fill=(111, 106, 126))
    b.text((424, 312), "5 minutes par jour, façon jeu.", font=sub_font, fill=CORAL)
    banner.save(Path("docs/play-store/feature-graphic.png"))

    for f in sorted(out.glob("*.png")):
        print(f.name, Image.open(f).size)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "assets/images")
