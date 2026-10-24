"""Recheck actual Chrome frame bytes independently of application code."""
import gzip
import json
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).parent
frames = json.loads(gzip.decompress((root / 'pss16-browser-frames.json.gz').read_bytes()))
checks = []
def check(name, passed):
    checks.append({'name': name, 'passed': bool(passed)})
    assert passed, name

for sample in frames:
    name, frame, settings = sample['name'], sample['frame'], sample['diagnostics']['settings']
    data, width, height = frame['rgba'], frame['width'], frame['height']
    pixels = [tuple(data[i:i+4]) for i in range(0, len(data), 4)]
    check(name + ' exact native length', len(data) == width * height * 4)
    check(name + ' binary alpha', all(p[3] in (0, 255) for p in pixels))
    check(name + ' zero hidden RGB', all(p[:3] == (0, 0, 0) for p in pixels if p[3] == 0))
    check(name + ' nonempty subject', any(p[3] for p in pixels))
    if settings['shading']['tone']['kind'] != 'continuous':
        allowed = {tuple(bytes.fromhex(color[1:])) for color in settings['palette']['colors']}
        check(name + ' exact palette', all(p[:3] in allowed for p in pixels if p[3]))
    if 'passes' in sample:
        passes = sample['passes']
        subject = passes['subject']
        occupied = [(i // 4 % width, i // 4 // width) for i in range(0, len(subject), 4) if subject[i+3] == 255]
        xs, ys = zip(*occupied)
        measured = {'x': min(xs), 'y': min(ys), 'width': max(xs)-min(xs)+1, 'height': max(ys)-min(ys)+1}
        check(name + ' subject-only fitter', frame['framing']['actual'] == measured)
        check(name + ' combined normal/visibility categories', passes['normals'][3::4] == passes['visibility'][3::4])
        check(name + ' receiver excluded from subject mask', 128 not in subject[3::4] and 128 in passes['normals'][3::4])
        ring = set()
        radius = frame['outline']['thickness']
        subject_set = set(occupied)
        for x, y in occupied:
            for dy in range(-radius, radius+1):
                for dx in range(-radius, radius+1):
                    if 0 <= x+dx < width and 0 <= y+dy < height and (x+dx,y+dy) not in subject_set:
                        ring.add((x+dx,y+dy))
        color = tuple(bytes.fromhex(frame['outline']['color'][1:])) + (255,)
        check(name + ' square-stamped outline count', len(ring) == frame['outline']['pixelCount'])
        check(name + ' exact outline above receiver', all(pixels[y*width+x] == color for x,y in ring))
        check(name + ' visible ground shadow pixels', any(passes['normals'][4*i+3] == 128 and pixels[i][3] == 255 and (i % width, i // width) not in ring for i in range(width*height)))

by_name = {item['name']: item for item in frames}
check('formats render identical native bytes', by_name['initial-glb']['frame']['rgba'] == by_name['initial-gltf']['frame']['rgba'])
check('authored smooth and flat normals produce distinct pixels', by_name['glb-smooth']['frame']['rgba'] != by_name['glb-flat']['frame']['rgba'])
for algorithm in ['none', '2', '4', '8', 'blue-noise', 'floyd-steinberg']:
    check(algorithm + ' deterministic across formats', by_name['glb-'+algorithm]['frame']['rgba'] == by_name['gltf-'+algorithm]['frame']['rgba'])

sheet = Image.new('RGB', (4*320, 380), '#20252D')
draw = ImageDraw.Draw(sheet)
for index, name in enumerate(['initial-glb', 'glb-smooth', 'glb-flat', 'styled-perspective']):
    frame = by_name[name]['frame']
    tile = Image.frombytes('RGBA', (frame['width'],frame['height']), bytes(frame['rgba'])).resize((320,320), Image.Resampling.NEAREST)
    sheet.paste(tile, (index*320, 32), tile)
    draw.text((index*320+12, 10), name, fill='#D8E5F3')
    draw.text((index*320+12, 360), '64 x 64 native pixels; nearest 5x', fill='#AFBDCC')
sheet.save(root / 'pss16-native-contact-sheet.png')
(root / 'pss16-native-checks.json').write_text(json.dumps({'checks': checks, 'passed': len(checks), 'frameSets': len(frames)}, indent=2)+'\n')
print(f'{len(checks)} independent checks passed across {len(frames)} real Chrome native frames')
