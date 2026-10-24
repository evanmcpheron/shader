import gzip
import json
from pathlib import Path

import PIL
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
evidence = root / 'docs/pixel-shading-studio/evidence'
frames = json.loads(gzip.decompress((evidence / 'pss17-export-frames.json.gz').read_bytes()))
assert frames, 'No exported browser frames were recorded.'
checks = []
for item in frames:
    image = Image.open(evidence / 'pss17-png' / f"{item['name']}.png").convert('RGBA')
    matches = list(image.tobytes()) == item['frame']['rgba'] and image.size == (item['frame']['width'], item['frame']['height'])
    checks.append({'name': item['name'], 'matches': matches, 'dimensions': list(image.size)})
    assert matches, item['name']

chosen = ['s1-sphere', 's8-96x64-zoom8', 'transparent-4', 'transparent-blue-noise',
          'transparent-floyd-steinberg', 'solid-floyd-steinberg', 's5-outline-explicit',
          's5-outline-strict-blue-noise', 's5-outline-clipped', 'rectangular-plane',
          'import-glb-effects-fs', 'ground-shadows-outline-fs']
cell_width, cell_height = 350, 300
sheet = Image.new('RGB', (cell_width * 4, cell_height * 3), '#171b22')
draw = ImageDraw.Draw(sheet)
for index, name in enumerate(chosen):
    x, y = (index % 4) * cell_width, (index // 4) * cell_height
    draw.text((x + 10, y + 8), name, fill='#d6dfea')
    image = Image.open(evidence / 'pss17-png' / f'{name}.png').convert('RGBA')
    scale = min((cell_width - 20) // image.width, (cell_height - 32) // image.height)
    enlarged = image.resize((image.width * scale, image.height * scale), Image.Resampling.NEAREST)
    background = Image.new('RGBA', enlarged.size)
    grid = ImageDraw.Draw(background)
    for gy in range(0, background.height, 12):
        for gx in range(0, background.width, 12):
            grid.rectangle((gx, gy, gx + 11, gy + 11), fill='#363d49' if (gx // 12 + gy // 12) % 2 else '#272d38')
    background.alpha_composite(enlarged)
    sheet.paste(background.convert('RGB'), (x + (cell_width - background.width) // 2, y + 26))
sheet.save(evidence / 'pss17-native-contact-sheet.png')
(evidence / 'pss17-independent-decode.json').write_text(json.dumps({
    'decoder': f'Pillow {PIL.__version__} / actual downloaded PNG files', 'checks': checks,
}, indent=2) + '\n')
print(f'{len(checks)} independent Pillow {PIL.__version__} PNG decodes match all captured dimensions and RGBA bytes')
