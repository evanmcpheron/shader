"""Verify saved, real-browser native frames independently of the TypeScript processor."""
import gzip
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).parent
source = ROOT / 'pss15-browser-frames.json.gz'
data = json.loads(gzip.decompress(source.read_bytes()))
records = {record['label']: record for record in data['records']}
checks = []


def check(name, passed):
    checks.append({'name': name, 'passed': bool(passed)})
    if not passed:
        raise AssertionError(name)


def rgb(color):
    return tuple(int(color[index:index + 2], 16) for index in (1, 3, 5))


def linear(color):
    return tuple(value / 255 / 12.92 if value / 255 <= 0.04045 else ((value / 255 + 0.055) / 1.055) ** 2.4 for value in rgb(color))


def clamp(value):
    return min(1, max(0, value))


def encode(value):
    value = clamp(value)
    return math.floor((12.92 * value if value <= 0.0031308 else 1.055 * value ** (1 / 2.4) - 0.055) * 255 + 0.5)


def effect(color, settings):
    palette = settings['palette']
    if palette['effectPolicy'] == 'explicit':
        return rgb(color)
    requested = linear(color)
    return rgb(min(palette['colors'], key=lambda entry: sum((a - b) ** 2 for a, b in zip(linear(entry), requested))))


def lighting(record):
    settings = record['diagnostics']['settings']['lighting']
    direct = settings['directional']
    direction = [direct['position'][axis] - direct['target'][axis] for axis in 'xyz']
    size = math.hypot(*direction)
    direction = [value / size for value in direction]
    view = record['passes']['view']
    direction = [sum(view[column * 4 + row] * direction[column] for column in range(3)) for row in range(3)]
    size = math.hypot(*direction)
    direction = [value / size for value in direction]
    energies = [[value * settings[kind]['intensity'] for value in linear(settings[kind]['color'])] for kind in ('directional', 'ambient')]
    return direction, *energies


bayer4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
summary = []
for label, record in records.items():
    frame = record['frame']
    original = record['original']
    passes = record['passes']
    settings = record['diagnostics']['settings']
    width, height = frame['width'], frame['height']
    normals, subject, visibility = (passes[key] for key in ('normals', 'subject', 'visibility'))
    categories = normals[3::4]
    pixels = [tuple(frame['rgba'][offset:offset + 4]) for offset in range(0, width * height * 4, 4)]
    check(label + ': exact native dimensions', len(frame['rgba']) == len(original['rgba']) == len(normals) == len(subject) == len(visibility) == width * height * 4)
    check(label + ': category contract', set(categories) <= {0, 128, 255} and set(subject[3::4]) <= {0, 255})
    if record['diagnostics']['native']['shadow']['active']:
        check(label + ': normal/visibility category coordinates match', visibility[3::4] == categories)
        check(label + ': hard map emits binary visibility', all(visibility[pixel * 4] in (0, 255) for pixel in range(width * height) if categories[pixel]))
    for name, raw in [('final', frame['rgba']), ('original', original['rgba'])]:
        check(label + ': ' + name + ' binary alpha and zero hidden RGB', all(raw[i + 3] in (0, 255) and (raw[i + 3] or raw[i:i + 3] == [0, 0, 0]) for i in range(0, len(raw), 4)))
    positions = [(index % width, index // width) for index, category in enumerate(subject[3::4]) if category == 255]
    bounds = None if not positions else {'x': min(x for x, _ in positions), 'y': min(y for _, y in positions), 'width': max(x for x, _ in positions) - min(x for x, _ in positions) + 1, 'height': max(y for _, y in positions) - min(y for _, y in positions) + 1}
    check(label + ': fitting uses only original subject', bounds == frame['framing']['actual'])
    allowed = {rgb(color) for color in settings['palette']['colors']}
    if settings['outline']['kind'] != 'none':
        allowed.add(effect(settings['outline']['color'], settings))
    ground = settings['ground']
    shadows = settings['shadows']
    if ground['kind'] == 'receiver' and ground['appearance']['kind'] == 'visible':
        allowed.add(effect(ground['appearance']['color'], settings))
    if shadows['kind'] == 'directional':
        allowed.add(effect(shadows['color'], settings))
    check(label + ': palette/effect membership', all(pixel[3] == 0 or pixel[:3] in allowed for pixel in pixels))
    outline = set()
    if settings['outline']['kind'] == 'silhouette':
        radius = settings['outline']['thickness']
        for x, y in positions:
            outline.update((sx, sy) for sx in range(max(0, x - radius), min(width, x + radius + 1)) for sy in range(max(0, y - radius), min(height, y + radius + 1)))
        outline.difference_update(positions)
        check(label + ': outline excludes ground and overlays receiver', all(pixels[y * width + x] == (*effect(settings['outline']['color'], settings), 255) for x, y in outline))
    direction, direct, ambient = lighting(record)
    base = linear(settings['shading']['baseColor'])
    original_matches = True
    ground_matches = True
    for pixel, category in enumerate(categories):
        if not category:
            continue
        normal = [value * 2 / 255 - 1 for value in normals[pixel * 4:pixel * 4 + 3]]
        size = math.hypot(*normal)
        cosine = clamp(sum(n * l for n, l in zip(normal, direction)) / size)
        attenuation = 1
        if shadows['kind'] == 'directional' and shadows['self' if category == 255 else 'ground']:
            attenuation -= shadows['strength'] * (1 - passes['filtered'][pixel])
        illumination = [a + d * cosine * attenuation for a, d in zip(ambient, direct)]
        if category == 255:
            expected = tuple(encode(b * value) for b, value in zip(base, illumination))
            original_matches &= tuple(original['rgba'][pixel * 4:pixel * 4 + 3]) == expected
        elif (pixel % width, pixel // width) not in outline:
            unshadowed = clamp(sum(weight * (a + d * cosine) for weight, a, d in zip((0.2126, 0.7152, 0.0722), ambient, direct)))
            shadowed = clamp(sum(weight * value for weight, value in zip((0.2126, 0.7152, 0.0722), illumination)))
            coverage = 1 - shadowed / unshadowed if unshadowed else 0
            covered = shadows['kind'] == 'directional' and coverage > (bayer4[((pixel // width) % 4) * 4 + pixel % width % 4] + 0.5) / 16
            if covered:
                expected = (*effect(shadows['color'], settings), 255)
            elif ground['appearance']['kind'] == 'visible':
                expected = (*effect(ground['appearance']['color'], settings), 255)
            else:
                expected = (0, 0, 0, 0)
            ground_matches &= pixels[pixel] == expected
    check(label + ': original equals visibility-weighted direct plus preserved ambient', original_matches)
    check(label + ': exact binary receiver coverage and colors', ground_matches)
    native = record['diagnostics']['native']
    check(label + ': one live renderer, native target and directional map', record['diagnostics']['lifecycle']['active'] == native['targetLifecycle']['active'] == native['shadow']['allocatedMaps'] == 1)
    summary.append({'label': label, 'sha256': hashlib.sha256(bytes(frame['rgba'])).hexdigest(), 'bounds': bounds, 'opaque': sum(pixel[3] == 255 for pixel in pixels), 'memory': record['diagnostics']['memory'], 'timings': native['timings']})


def same(a, b, kind='frame'):
    return records[a][kind]['rgba'] == records[b][kind]['rgba']


for label in ('cube-hard-repeat', 'cube-soft0'):
    check(label + ': exactly hard', same('cube-left', label))
for label in ('cube-soft2', 'cube-soft4', 'cube-strength04', 'cube-right'):
    check(label + ': observable native change', not same('cube-left', label))
check('zero strength equals disabled', same('cube-strength0', 'cube-shadow-disabled'))
for label in ('cube-after12-toggles', 'cube64-return', 'cube-remount-0', 'cube-remount-1', 'cube-remount-2', 'cube-preview-only', 'cube-resolution-64'):
    check(label + ': deterministic output', same('cube-resource-baseline', label))
check('context recovery reproduces outlined receiver bytes', same('cube-final-compare', 'cube-context-recovered'))
check('concave self-shadow attenuates real output', not same('torus-concave-self', 'torus-concave-self-off', 'original') and not same('torus-concave-self', 'torus-concave-self-off'))
check('concave repeated settings deterministic', same('torus-concave-self', 'torus-concave-repeat'))
check('canonical 32x32 subject unchanged by ground', records['sphere-front-ground']['frame']['framing']['actual'] == records['sphere-front-ground-off']['frame']['framing']['actual'] == {'x': 16, 'y': 16, 'width': 32, 'height': 32})
check('small receiver reports shadow clipping', records['cube-small-receiver']['frame']['ground']['shadowClipped'])
for label in ('cube-ambient-shadow-only', 'cube-ground-shadows-off', 'cone-horizontal-light', 'cone-below-light'):
    record = records[label]
    check(label + ': no receiver shadow coverage', all(record['original']['rgba'][pixel * 4 + 3] == 0 for pixel, category in enumerate(record['passes']['normals'][3::4]) if category == 128))
for label in ('cube-left', 'cube-soft2', 'cube-soft4', 'cube-strength04', 'cube-visible-strict', 'cube-outline-strict'):
    check(label + ': reuses subject and receiver normals', records[label]['diagnostics']['native']['captures'] == records['cube-right']['diagnostics']['native']['captures'] and records[label]['diagnostics']['native']['receiverCaptures'] == 1)
check('palette and outline reuse visibility', records['cube-visible-explicit']['diagnostics']['native']['visibilityCaptures'] == records['cube-visible-strict']['diagnostics']['native']['visibilityCaptures'] == records['cube-outline-strict']['diagnostics']['native']['visibilityCaptures'])
for label in ('cube-preview-only', 'cube-resolution-96', 'cube-resolution-32', 'cube-resolution-128', 'cube-resolution-64', 'plane-subject-independent-ground'):
    check(label + ': stable warmed resources', records[label]['diagnostics']['memory'] == {'geometries': 2, 'textures': 3, 'programs': 6})

for label in ('final-wireframe-preview', 'final-wireframe-light-return', 'final-preview-only'):
    check(label + ': presentation topology never enters shadow depth', same('final-cube-visible-default', label))
check('wireframe preview reuses visibility', records['final-cube-visible-default']['diagnostics']['native']['visibilityCaptures'] == records['final-wireframe-preview']['diagnostics']['native']['visibilityCaptures'])
check('comparison/checkerboard reuse visibility', records['final-wireframe-light-return']['diagnostics']['native']['visibilityCaptures'] == records['final-preview-only']['diagnostics']['native']['visibilityCaptures'])
check('browser console has no warnings or errors', not data.get('logs'))

check('final bounds correction preserves Hard native output', same('cube-left', 'final-bounds-hard'))
check('final bounds correction preserves Soft4 native output', same('cube-soft4', 'final-bounds-soft4'))
hard = records['final-bounds-hard']['frame']['ground']['shadowExtent']
soft = records['final-bounds-soft4']['frame']['ground']['shadowExtent']
check('reported soft bounds include the full integer radius', soft == {'x': hard['x'] - 4, 'y': hard['y'] - 4, 'width': hard['width'] + 8, 'height': hard['height'] + 8})
receiver_positions = lambda label: {(i % records[label]['frame']['width'], i // records[label]['frame']['width']) for i, category in enumerate(records[label]['passes']['normals'][3::4]) if category == 128 and records[label]['frame']['rgba'][i * 4 + 3] == 255}
check('cube shadow coverage moves on receiver with light', receiver_positions('cube-right') != receiver_positions('cube-left') and bool(receiver_positions('cube-right')) and bool(receiver_positions('cube-left')))

report = {'frames': len(records), 'checks': len(checks), 'passed': all(check['passed'] for check in checks), 'results': checks, 'framesSummary': summary, 'recovery': data.get('recovery'), 'console': data.get('logs')}
(ROOT / 'pss15-native-checks.json').write_text(json.dumps(report, indent=2) + '\n')
print(f"{len(checks)} checks passed across {len(records)} real Chrome frame/pass sets")
