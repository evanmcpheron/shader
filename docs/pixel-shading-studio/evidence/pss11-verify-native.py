import hashlib
import json
from pathlib import Path

folder = Path(__file__).resolve().parent
frames = json.loads((folder / 'pss11-native-frames.json').read_text())
checks = []


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append({'name': name, 'pass': True})


def colors(name):
    data = frames[name]['rgba']
    return {tuple(data[i:i + 3]) for i in range(0, len(data), 4) if data[i + 3] == 255}


def rgb_set(hex_list):
    return {tuple(bytes.fromhex(color)) for color in hex_list.split()}


blues = rgb_set('172038 304878 5C88B8 B8D8F0')
check('S1 exact four RGB entries', colors('S1 bands') == blues)
frame = frames['S1 bands']
check('S1 exact size and bounds', (frame['width'], frame['height']) == (64, 64)
      and frame['framing']['actual'] == {'x': 16, 'y': 16, 'width': 32, 'height': 32})
check('S1 812 opaque pixels', sum(frame['rgba'][i] == 255 for i in range(3, len(frame['rgba']), 4)) == 812)
check('continuous exactly equals Original', frames['mode smooth']['rgba'] == frames['S1 original']['rgba'])
check('cel and bands share exact mapper', frames['mode cel']['rgba'] == frames['mode bands']['rgba'])
for name, entries in {
    'grayscale': '202020 686868 B0B0B0 F0F0F0',
    'gameBoy': '0F380F 306230 8BAC0F 9BBC0F',
    'nes': '1C1C1C 2038EC 38B4FC FCFCFC',
    'warm': '301B28 78404A C47761 F4D7A1',
    'cool': '172038 304878 5C88B8 B8D8F0',
}.items():
    check(name + ' exact documented RGB', colors('preset ' + name) == rgb_set(entries))
for name in ['mode palette', 'nearest blue', 'nearest brightness', 'nearest contrast', 'nearest red light']:
    check(name + ' allowed RGB only', colors(name) <= blues)
for before, after in [('nearest blue', 'nearest brightness'), ('nearest brightness', 'nearest contrast'),
                      ('nearest contrast', 'nearest red light')]:
    check(after + ' changes allocation', frames[before]['rgba'] != frames[after]['rgba'])
for name, frame in frames.items():
    data = frame['rgba']
    check(name + ' binary alpha and zero hidden RGB',
          all(data[i + 3] == 255 or data[i:i + 4] == [0, 0, 0, 0] for i in range(0, len(data), 4)))
    if name.startswith('invalid '):
        check(name + ' unchanged pixels/revision', data == frames['valid hex import']['rgba']
              and frame['revision'] == frames['valid hex import']['revision'])
check('single/duplicate exact stored byte output', colors('one color') == colors('duplicate colors') == {(18, 121, 171)})
check('no double conversion', frames['one color']['rgba'] == frames['unit ambient original']['rgba'])
check('explicit background preserves configured bytes', colors('explicit background') == {(254, 220, 186), (0, 0, 0)})
check('strict background selects exact ramp byte', colors('strict background') == {(188, 188, 188), (0, 0, 0)})
check('palette changes do not recapture', all(frame['captureRevision'] == 0 for frame in frames.values()))
result = {
    'source': 'Actual browser Inspect native/original RGBA controls; no graphics mocks',
    'checks': checks,
    'sha256': {name: hashlib.sha256(bytes(frame['rgba'])).hexdigest() for name, frame in frames.items()},
}
(folder / 'pss11-native-checks.json').write_text(json.dumps(result, indent=2) + '\n')
print(f'{len(checks)} saved native-frame assertions passed across {len(frames)} real browser frames.')
