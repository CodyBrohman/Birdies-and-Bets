# Wraps raw 402x778@2x app captures in an iPhone screen: status bar (9:41), Dynamic Island, home indicator,
# rounded corners. Output 640x1391 PNGs like the website's existing screenshots.
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
OUT = os.path.join(HERE, 'framed')
os.makedirs(OUT, exist_ok=True)
FONT = os.path.join(HERE, '..', '..', 'node_modules', '@expo-google-fonts', 'inter', '600SemiBold', 'Inter_600SemiBold.ttf')

S = 4  # supersample: 402x874pt drawn at 4x, then scaled to 640 wide
W, H = 402 * S, 874 * S
TOP, BOTTOM = 62, 34
CREAM = (245, 244, 236)
INK = (16, 20, 18)


def status_bar(d):
    f = ImageFont.truetype(FONT, 17 * S)
    d.text((64 * S, 33 * S), '9:41', font=f, fill=INK, anchor='mm')
    # Signal bars
    x0 = 292 * S
    for i, h in enumerate([5, 7.5, 10, 12.5]):
        x = x0 + i * 5.5 * S
        d.rounded_rectangle((x, (38 - h) * S, x + 3.6 * S, 38 * S), radius=1 * S, fill=INK)
    # Wifi: three arcs and a dot
    cx, cy = 324 * S, 38.5 * S
    for r in (11, 7.4, 3.8):
        d.arc((cx - r * S, cy - r * S - 1 * S, cx + r * S, cy + r * S - 1 * S), start=225, end=315, fill=INK, width=int(2.2 * S))
    # Battery
    bx, by = 343 * S, 28 * S
    d.rounded_rectangle((bx, by, bx + 25 * S, by + 12 * S), radius=3.5 * S, outline=(150, 152, 148), width=int(1 * S))
    d.rounded_rectangle((bx + 2 * S, by + 2 * S, bx + 23 * S, by + 10 * S), radius=2 * S, fill=INK)
    d.rounded_rectangle((bx + 26.2 * S, by + 4 * S, bx + 27.6 * S, by + 8 * S), radius=1 * S, fill=(150, 152, 148))


def frame(name):
    raw = Image.open(os.path.join(RAW, name + '.png')).convert('RGB').resize((402 * S, 778 * S), Image.LANCZOS)
    canvas = Image.new('RGB', (W, H), CREAM)
    canvas.paste(raw, (0, TOP * S))
    d = ImageDraw.Draw(canvas)
    status_bar(d)
    # Dynamic Island
    d.rounded_rectangle((201 * S - 63 * S, 11 * S, 201 * S + 63 * S, 48 * S), radius=19 * S, fill=(0, 0, 0))
    # Home indicator over the tab bar's bottom padding
    d.rounded_rectangle((201 * S - 70 * S, H - 13 * S, 201 * S + 70 * S, H - 8 * S), radius=3 * S, fill=INK)
    # Rounded screen corners
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), radius=55 * S, fill=255)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.paste(canvas, (0, 0), mask)
    out.resize((640, 1391), Image.LANCZOS).save(os.path.join(OUT, name + '.png'), optimize=True)
    print('framed', name)


for n in sorted(os.listdir(RAW)):
    frame(n[:-4])
