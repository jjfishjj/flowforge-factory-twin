#!/usr/bin/env python3
"""Generate 16:9 FlowForge title cards for the hackathon demo."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH, HEIGHT = 1920, 1080
BACKGROUND = "#07110d"
LIME = "#b8f536"
MINT = "#91e8bb"
WHITE = "#edf5f0"
MUTED = "#91aa9d"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
OUTPUT = Path(__file__).resolve().parents[1] / "docs" / "demo-video" / "cards"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def base_card() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    for x in range(0, WIDTH, 64):
        draw.line((x, 0, x, HEIGHT), fill="#0b1b14", width=1)
    for y in range(0, HEIGHT, 64):
        draw.line((0, y, WIDTH, y), fill="#0b1b14", width=1)
    draw.rectangle((140, 170, 152, 900), fill=LIME)
    draw.text((190, 185), "FLOWFORGE EDGETWIN AI", font=font(34, True), fill=LIME)
    return image, draw


def transition_card() -> Image.Image:
    image, draw = base_card()
    draw.text((190, 335), "PHYSICAL AI", font=font(110, True), fill=WHITE)
    draw.text((190, 465), "CONTROL LOOP", font=font(110, True), fill=WHITE)
    draw.text((195, 650), "NVIDIA NEMOTRON  |  NEBIUS TOKEN FACTORY", font=font(32), fill=MINT)
    draw.text((195, 730), "SENSE  >  FILTER  >  REASON  >  HUMAN APPROVAL  >  ACT", font=font(27), fill=MUTED)
    return image


def end_card() -> Image.Image:
    image, draw = base_card()
    draw.text((190, 320), "FROM FACTORY SIGNALS", font=font(72, True), fill=WHITE)
    draw.text((190, 410), "TO HUMAN-APPROVED ACTIONS", font=font(72, True), fill=WHITE)
    draw.text((195, 580), "Live NVIDIA Nemotron reasoning on Nebius Token Factory", font=font(31), fill=MINT)
    draw.text((195, 690), "DEMO", font=font(23, True), fill=LIME)
    draw.text((195, 730), "jjfishjj.github.io/flowforge-factory-twin", font=font(29), fill=WHITE)
    draw.text((195, 800), "SOURCE", font=font(23, True), fill=LIME)
    draw.text((195, 840), "github.com/jjfishjj/flowforge-factory-twin", font=font(29), fill=WHITE)
    return image


OUTPUT.mkdir(parents=True, exist_ok=True)
transition_card().save(OUTPUT / "physical-ai-transition.png", optimize=True)
end_card().save(OUTPUT / "physical-ai-end.png", optimize=True)
