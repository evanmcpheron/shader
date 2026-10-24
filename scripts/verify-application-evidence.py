import gzip
import hashlib
import json
from pathlib import Path

import PIL
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'docs/pixel-shading-studio/evidence'
checks = []
for prefix, archive in [('pss20-application', 'frames'), ('pss20-export', 'export-frames'), ('pss20-presets', 'export-frames')]:
    frames = json.loads(gzip.decompress((root / f'{prefix}-{archive}.json.gz').read_bytes()))
    assert frames, f'No frames: {prefix}'
    for item in frames:
        frame = item['frame']
        image = Image.open(root / f'{prefix}-png' / f"{item['name']}.png").convert('RGBA')
        rgba = image.tobytes()
        assert image.size == (frame['width'], frame['height']), item['name']
        assert rgba == bytes(frame['rgba']), item['name']
        assert all(rgba[i] in (0, 255) for i in range(3, len(rgba), 4)), item['name']
        assert all(rgba[i] != 0 or rgba[i - 3:i] == b'\0\0\0' for i in range(3, len(rgba), 4)), item['name']
        checks.append({'suite': prefix, 'name': item['name'], 'dimensions': image.size,
                       'sha256': hashlib.sha256(rgba).hexdigest(), 'matches': True})
canonical = Image.open(root / 'pss20-application-png/s1-production.png').convert('RGBA')
subject = {(x, y) for y in range(canonical.height) for x in range(canonical.width) if canonical.getpixel((x, y))[3]}
ring = {(x + dx, y + dy) for x, y in subject for dx in range(-2, 3) for dy in range(-2, 3)} - subject
outline = Image.open(root / 'pss20-application-png/s5-production-outline.png').convert('RGBA')
for y in range(outline.height):
    for x in range(outline.width):
        expected = canonical.getpixel((x, y)) if (x, y) in subject else (255, 0, 127, 255) if (x, y) in ring else (0, 0, 0, 0)
        assert outline.getpixel((x, y)) == expected, (x, y)
checks.append({'name': 'Independent square-stamped 2px outline matches every decoded pixel', 'matches': True, 'ringPixels': len(ring)})
report = {'decoder': f'Pillow {PIL.__version__}', 'checks': checks}
(root / 'pss20-independent-decode.json').write_text(json.dumps(report, indent=2) + '\n')
print(f'{len(checks) - 1} actual PNGs independently decoded, plus exact outline morphology: exact dimensions/RGBA, binary alpha, zero hidden RGB')
