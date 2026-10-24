import hashlib
import json
from pathlib import Path

directory = Path(__file__).parent
evidence = json.loads((directory / 'pss12-browser-frames.json').read_text())
records = evidence['records']
by_label = {record['label']: record for record in records}
checks = []


def check(name, condition):
    checks.append({'name': name, 'passed': bool(condition)})
    assert condition, name


def digest(rgba):
    return hashlib.sha256(bytes(rgba)).hexdigest()


def same(left, right):
    return by_label[left]['frame']['rgba'] == by_label[right]['frame']['rgba']


mask = by_label['ramp-none']['frame']['rgba'][3::4]
check('Canonical mask has 812 subject pixels', mask.count(255) == 812)
seen_settings = {}
for record in records:
    label = record['label']
    frame = record['frame']
    rgba = frame['rgba']
    original = record['original']['rgba']
    settings = record['settings']
    colors = {tuple(bytes.fromhex(color[1:])) for color in settings['palette']['colors']}
    check(f'{label}: exact native dimensions', len(rgba) == frame['width'] * frame['height'] * 4 == 16384)
    check(f'{label}: stored SHA-256', digest(rgba) == record['hash'] and digest(original) == record['originalHash'])
    check(f'{label}: capture and geometry reused', record['captures'] == 1 and record['geometryBuilds'] == 1 and frame['captureRevision'] == 0)
    check(f'{label}: resource counts stable', record['memory'] == {'geometries': 1, 'textures': 1, 'programs': 1})
    check(f'{label}: subject bounds unchanged', frame['framing']['actual'] == {'x': 16, 'y': 16, 'width': 32, 'height': 32})
    check(f'{label}: binary alpha', set(rgba[3::4]) <= {0, 255})
    if settings['shading']['tone']['kind'] != 'continuous':
        check(f'{label}: exact subject palette membership', all(tuple(rgba[i:i + 3]) in colors for i in range(0, len(rgba), 4) if mask[i // 4] == 255))
    if settings['background']['kind'] == 'transparent':
        check(f'{label}: coverage and zero transparent RGB', rgba[3::4] == mask and all(rgba[i:i + 4] == [0, 0, 0, 0] for i in range(0, len(rgba), 4) if mask[i // 4] == 0))
        check(f'{label}: Original undithered', original == by_label['ramp-none']['original']['rgba'])
    key = json.dumps(settings, sort_keys=True)
    if key in seen_settings:
        check(f'{label}: repeated settings byte-identical', rgba == seen_settings[key])
    seen_settings[key] = rgba

for mode in ['ramp', 'palette']:
    for size in [2, 4, 8]:
        check(f'{mode} Bayer {size} zero equals None', same(f'{mode}-bayer{size}-zero', f'{mode}-none'))
        check(f'{mode} Bayer {size} changes shade decisions', not same(f'{mode}-bayer{size}-full', f'{mode}-none'))
    check(f'{mode} matrices all differ', len({by_label[f'{mode}-bayer{size}-full']['hash'] for size in [2, 4, 8]}) == 3)

check('Strength and width act in shade intervals', same('ramp-strength035', 'ramp-width035'))
check('Narrower transitions change pixels', not same('ramp-strength035', 'ramp-bayer4-full'))
check('Zero width equals None', same('ramp-width-zero', 'ramp-none'))
check('Ramp native scale changes cells', not same('ramp-scale2', 'ramp-bayer4-full'))
check('Palette native scale changes cells', not same('palette-scale2', 'palette-bayer8-full'))
check('Palette strength changes pixels', not same('palette-strength03', 'palette-bayer8-full'))
check('Palette repeated render identical', same('palette-bayer8-repeat', 'palette-bayer8-full'))
check('Continuous mode ignores dither', same('continuous-none', 'continuous-bayer-inactive'))
check('One-color and duplicate-only palettes identical', same('palette-one-color', 'palette-duplicates'))

view_labels = ['ramp-zoom8', 'ramp-zoom16', 'ramp-pan-grid-checker', 'ramp-fit']
for label in view_labels:
    check(f'{label}: view changes no frame bytes', same(label, 'ramp-bayer4-full'))
    check(f'{label}: no processing or capture', by_label[label]['processes'] == by_label['ramp-zoom8']['processes'] and by_label[label]['captures'] == 1)

for label in ['dpr-native-zoom', 'dpr-native-125', 'dpr-restored', 'compare-zoom8', 'final-code-compare', 'final-code-dpr125', 'final-code-restored']:
    check(f'{label}: DPR/compare changes no bytes', same(label, 'dpr-baseline'))
    check(f'{label}: no processing or capture', by_label[label]['processes'] == by_label['dpr-baseline']['processes'] and by_label[label]['captures'] == 1)
check('Actual native Chrome DPR changed and restored', [by_label[label]['devicePixelRatio'] for label in ['dpr-baseline', 'dpr-native-zoom', 'dpr-native-125', 'dpr-restored']] == [2, 2.200000047683716, 2.5, 2])
check('Final code DPR checked again after presentation experiments were reverted', [by_label[label]['devicePixelRatio'] for label in ['final-code-compare', 'final-code-dpr125', 'final-code-restored']] == [2, 2.5, 2])

for policy in ['', 'strict-']:
    bayer = by_label[f'palette-{policy}solid-bayer']['frame']['rgba']
    plain = by_label[f'palette-{policy}solid-none']['frame']['rgba']
    check(f'{policy or "explicit-"}solid background unchanged', all(bayer[i:i + 4] == plain[i:i + 4] for i in range(0, len(bayer), 4) if mask[i // 4] == 0))
    check(f'{policy or "explicit-"}solid alpha unchanged', bayer[3::4] == plain[3::4] == [255] * len(mask))

check('No browser warnings/errors', evidence['console'] == [])
summary = {'environment': evidence['environment'], 'frames': len(records), 'passed': len(checks), 'checks': checks, 'hashes': {label: record['hash'] for label, record in by_label.items()}}
(directory / 'pss12-native-checks.json').write_text(json.dumps(summary, indent=2) + '\n')
print(f'{len(checks)}/{len(checks)} assertions passed across {len(records)} real-browser frame pairs.')
