import gzip
import json
from pathlib import Path

import PIL
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
evidence = root / 'docs/pixel-shading-studio/evidence'
frames = json.loads(gzip.decompress((evidence / 'pss18-export-frames.json.gz').read_bytes()))
assert frames, 'No preset verification exports recorded.'
checks = []
sheet = Image.new('RGB', (1200, ((len(frames) + 2) // 3) * 360), '#171b22')
draw = ImageDraw.Draw(sheet)
for index, item in enumerate(frames):
    image = Image.open(evidence / 'pss18-png' / f"{item['name']}.png").convert('RGBA')
    matches = list(image.tobytes()) == item['frame']['rgba'] and image.size == (item['frame']['width'], item['frame']['height'])
    checks.append({'name': item['name'], 'matches': matches, 'dimensions': list(image.size), 'sha256': item['sha256']})
    assert matches, item['name']
    x, y = (index % 3) * 400, (index // 3) * 360
    draw.text((x + 10, y + 8), item['name'], fill='#d6dfea')
    scale = min(380 // image.width, 320 // image.height)
    enlarged = image.resize((image.width * scale, image.height * scale), Image.Resampling.NEAREST)
    background = Image.new('RGBA', enlarged.size, '#303743')
    background.alpha_composite(enlarged)
    sheet.paste(background.convert('RGB'), (x + (400 - background.width) // 2, y + 28))
sheet.save(evidence / 'pss18-native-contact-sheet.png')
(evidence / 'pss18-independent-decode.json').write_text(json.dumps({
    'decoder': f'Pillow {PIL.__version__} / actual downloaded PNG files', 'checks': checks,
}, indent=2) + '\n')
print(f'{len(checks)} independent Pillow {PIL.__version__} decodes match all native dimensions and RGBA bytes')
