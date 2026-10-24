import gzip
import hashlib
import json
from pathlib import Path

folder = Path(__file__).parent
saved = json.loads(gzip.decompress((folder / 'pss14-browser-frames.json.gz').read_bytes()))
records = saved['records']
by_label = {row['label']: row for row in records}
checks = []


def check(name, passed):
    checks.append({'name': name, 'passed': bool(passed)})
    assert passed, name


def capture_key(settings):
    return json.dumps({key: settings[key] for key in ['subject', 'camera', 'canvas', 'framing']} | {'normals': settings['shading']['normals']}, sort_keys=True)


def bounds(points):
    if not points:
        return None
    xs, ys = zip(*points)
    return {'x': min(xs), 'y': min(ys), 'width': max(xs) - min(xs) + 1, 'height': max(ys) - min(ys) + 1}


def rgb(color):
    return list(bytes.fromhex(color[1:]))


def linear(color):
    return [v / 255 / 12.92 if v / 255 <= .04045 else ((v / 255 + .055) / 1.055) ** 2.4 for v in rgb(color)]


def effect_color(color, palette):
    if palette['effectPolicy'] == 'explicit':
        return color
    target = linear(color)
    return min(palette['colors'], key=lambda entry: sum((a - b) ** 2 for a, b in zip(linear(entry), target)))


masks = {capture_key(row['diagnostics']['settings']): row['original']['rgba'][3::4] for row in records if row['diagnostics']['settings']['background']['kind'] == 'transparent'}
originals = {}
summary = []
for row in records:
    label = row['label']
    frame = row['final']
    original = row['original']
    diagnostic = row['diagnostics']
    settings = diagnostic['settings']
    width, height = frame['width'], frame['height']
    mask = masks[capture_key(settings)]
    subject = {(i % width, i // width) for i, category in enumerate(mask) if category == 255}
    outline = settings['outline']
    ring = set()
    extent = None
    resolved = None
    clipped = False
    if outline['kind'] == 'silhouette':
        radius = outline['thickness']
        # Independent reference stamps one full square at each source pixel, then subtracts the source set.
        dilated = {(x, y) for sx, sy in subject for x in range(sx - radius, sx + radius + 1) for y in range(sy - radius, sy + radius + 1)}
        unclipped = bounds(dilated)
        clipped = any(x < 0 or y < 0 or x >= width or y >= height for x, y in dilated)
        visible = {(x, y) for x, y in dilated if 0 <= x < width and 0 <= y < height}
        ring = visible - subject
        extent = bounds(visible)
        resolved = effect_color(outline['color'], settings['palette'])
        check(label + ': exact effect metadata', frame['outline'] == {'extent': unclipped, 'visible': extent, 'pixelCount': len(ring), 'color': resolved, 'thickness': radius, 'clipped': clipped})
    else:
        check(label + ': disabled metadata', frame['outline'] is None)
    rgba = frame['rgba']
    background = settings['background']
    background_bytes = [0, 0, 0, 0] if background['kind'] == 'transparent' else rgb(effect_color(background['color'], settings['palette'])) + [255]
    check(label + ': original has no outline', original['outline'] is None)
    check(label + ': requested dimensions retained', (width, height) == (settings['canvas']['width'], settings['canvas']['height']) and len(rgba) == width * height * 4)
    check(label + ': subject measurement unchanged', frame['framing'] == original['framing'] and frame['framing']['actual'] == bounds(subject))
    check(label + ': exact full ring color bytes', all(rgba[(y * width + x) * 4:(y * width + x) * 4 + 4] == rgb(resolved) + [255] for x, y in ring))
    check(label + ': exact background outside subject and ring', all(rgba[i * 4:i * 4 + 4] == background_bytes for i in range(width * height) if (i % width, i // width) not in ring | subject))
    check(label + ': subject alpha and palette membership', all(rgba[(y * width + x) * 4 + 3] == 255 and rgba[(y * width + x) * 4:(y * width + x) * 4 + 3] in [rgb(color) for color in settings['palette']['colors']] for x, y in subject))
    check(label + ': binary alpha and zero hidden RGB', set(rgba[3::4]) <= {0, 255} and all(rgba[i:i + 4] == [0, 0, 0, 0] for i in range(0, len(rgba), 4) if rgba[i + 3] == 0))
    check(label + ': latest revision', frame['revision'] == diagnostic['revisions']['settings'] and frame['captureRevision'] == diagnostic['revisions']['capture'])
    check(label + ': stable resource ownership', diagnostic['memory'] == {'geometries': 1, 'textures': 1, 'programs': 1} and diagnostic['native']['targetLifecycle']['active'] == 1 and diagnostic['lifecycle']['active'] == 1)
    before_key = json.dumps({key: settings[key] for key in ['subject', 'camera', 'lighting', 'canvas', 'framing', 'background']} | {'baseColor': settings['shading']['baseColor'], 'normals': settings['shading']['normals']}, sort_keys=True)
    if before_key in originals:
        check(label + ': Original unchanged through styling', original['rgba'] == originals[before_key])
    originals[before_key] = original['rgba']
    summary.append({'label': label, 'sha256': hashlib.sha256(bytes(rgba)).hexdigest(), 'subjectPixels': len(subject), 'outlinePixels': len(ring), 'outline': frame['outline'], 'captures': diagnostic['native']['captures'], 'rasterizations': diagnostic['native']['rasterizations'], 'processes': diagnostic['native']['processes'], 'composites': diagnostic['native']['composites'], 'timings': diagnostic['native']['timings']})

for kind in ['none', '2', '4', '8', 'blue-noise', 'floyd-steinberg']:
    off = by_label['dither64-' + kind + '-off']
    on = by_label['dither64-' + kind + '-on']
    mask = off['original']['rgba'][3::4]
    check(kind + ': outlining leaves every subject byte unchanged', all(off['final']['rgba'][i * 4:i * 4 + 4] == on['final']['rgba'][i * 4:i * 4 + 4] for i, category in enumerate(mask) if category == 255))
    check(kind + ': on/off skips capture, fit and styling', all(off['diagnostics']['native'][key] == on['diagnostics']['native'][key] for key in ['captures', 'rasterizations', 'processes']) and off['diagnostics']['geometryBuilds'] == on['diagnostics']['geometryBuilds'])

for left, right in [('sphere64-none', 'sphere64-custom-t1'), ('sphere64-custom-t1', 'sphere64-custom-t2'), ('sphere64-custom-t2', 'sphere64-custom-t8'), ('sphere64-custom-t8', 'sphere64-recolor-t8'), ('fresh-sphere64-none', 'fresh-sphere64-custom-t2'), ('fresh-sphere64-custom-t2', 'fresh-sphere64-recolor-t2'), ('torus64-t1', 'torus64-t2'), ('sphere16-t1-16x', 'sphere16-t2-16x'), ('sphere16-t2-16x', 'sphere16-t8-clipped')]:
    a, b = by_label[left], by_label[right]
    check(right + ': outline-only compositing retains capture, fit, lighting and styling', all(a['diagnostics']['native'][key] == b['diagnostics']['native'][key] for key in ['captures', 'rasterizations', 'processes']) and a['final']['framing'] == b['final']['framing'] and a['diagnostics']['geometryBuilds'] == b['diagnostics']['geometryBuilds'])

for left, right in [('sphere64-compare-blue-t2-8x', 'sphere64-compare-blue-t2-4x'), ('sphere16-t2-16x', 'sphere16-t2-32x')]:
    a, b = by_label[left], by_label[right]
    check(right + ': zoom preserves native bytes and processing', a['final']['rgba'] == b['final']['rgba'] and a['diagnostics']['native']['composites'] == b['diagnostics']['native']['composites'])
check('fresh source reproduces full custom outline frame', by_label['fresh-sphere64-custom-t2']['final']['rgba'] == by_label['sphere64-custom-t2']['final']['rgba'])
check('remount reproduces exact bytes', by_label['fresh-remount-t2']['final']['rgba'] == by_label['fresh-sphere64-recolor-t2']['final']['rgba'])
check('remount disposes previous target', by_label['fresh-remount-t2']['diagnostics']['native']['targetLifecycle'] == {'created': 2, 'disposed': 1, 'active': 1})
check('section reset preserves subject, canvas and styling', by_label['sphere16-outline-reset']['final']['framing'] == by_label['sphere16-top-left-clipped']['final']['framing'] and by_label['sphere16-outline-reset']['diagnostics']['native']['processes'] == by_label['sphere16-top-left-clipped']['diagnostics']['native']['processes'])
check('whole scene reset restores canonical bytes', by_label['sphere64-scene-reset']['final']['rgba'] == by_label['sphere64-none']['final']['rgba'])
for label in ['torus64-t1', 'torus64-t2']:
    check(label + ': hole center survives dilation', by_label[label]['final']['rgba'][(32 * 64 + 32) * 4:(32 * 64 + 32) * 4 + 4] == [0, 0, 0, 0])
check('no Chrome warnings or errors', saved['console'] == [])
result = {'environment': saved['environment'], 'records': len(records), 'passed': len(checks), 'failed': 0, 'checks': checks, 'frames': summary, 'console': saved['console']}
(folder / 'pss14-native-checks.json').write_text(json.dumps(result, indent=2) + '\n')
print(f'{len(checks)}/{len(checks)} checks passed across {len(records)} actual Chrome frame pairs.')
