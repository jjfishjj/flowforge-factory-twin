#!/usr/bin/env python3
"""Render transparent subtitle cards for FFmpeg builds without libass."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


CAPTIONS = [
    "This is FlowForge, a browser-based digital factory twin built around OpenUSD.",
    "It connects facility layout decisions to capacity, WIP and material-flow KPIs.",
    "The traffic model compares FIFO, nearest-job and zone-based AGV dispatch strategies.",
    "Under equal conditions, the U-cell layout reduces travel from 86 to 52 meters per unit.",
    "Live motion and congestion heatmaps make the operational trade-off visible.",
    "The same stations are authored as reusable OpenUSD references with payloads and MES metadata.",
    "Both layout variants pass OpenUSD validation and remain Composer-ready.",
    "The complete demo, source and RTX validation checklist are available on GitHub.",
]


def wrap(draw, text, font, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def main():
    output = Path(__file__).resolve().parents[1] / "docs" / "demo-video" / "caption-cards"
    output.mkdir(parents=True, exist_ok=True)
    font_path = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
    font = ImageFont.truetype(str(font_path), 38)
    for index, caption in enumerate(CAPTIONS, 1):
        image = Image.new("RGBA", (1920, 170), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        lines = wrap(draw, caption, font, 1480)
        line_height = 48
        box_height = len(lines) * line_height + 30
        top = (170 - box_height) // 2
        draw.rounded_rectangle((165, top, 1755, top + box_height), radius=16, fill=(0, 0, 0, 205))
        y = top + 12
        for line in lines:
            bounds = draw.textbbox((0, 0), line, font=font)
            x = (1920 - (bounds[2] - bounds[0])) // 2
            draw.text((x, y), line, font=font, fill=(255, 255, 255, 255))
            y += line_height
        image.save(output / f"caption-{index:02d}.png")


if __name__ == "__main__":
    main()
