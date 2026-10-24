import cmath
import hashlib
import io
import json
import math
import sys
from pathlib import Path
from zipfile import ZipFile
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
assets = root / 'src/assets/blue-noise'
evidence = root / 'docs/pixel-shading-studio/evidence'
source_hash = '140c55bd97c21b9b22008d7054b492333fec67fbfc1a1b266e5b0209b647eed4'
byte_hash = 'fe602dd3f05c3d79ef1ff01533923c45a9eede45531251901818250445fbe4b1'
archive_hash = '4279ad66ec851a8cbf37025816ef5187bf1c1c001d46afb8edfa6d3c8e44c644'
entry = 'Data/64_64/LDR_LLL1_0.png'
if len(sys.argv) == 2:
    archive = Path(sys.argv[1]).read_bytes()
    assert hashlib.sha256(archive).hexdigest() == archive_hash
    assert ZipFile(io.BytesIO(archive)).read(entry) == (assets / 'source.png').read_bytes()
source = (assets / 'source.png').read_bytes()
assert hashlib.sha256(source).hexdigest() == source_hash
image = Image.open(io.BytesIO(source))
assert image.size == (64, 64) and image.mode == 'RGBA'
r, g, b, a = image.split()
values = r.tobytes()
assert values == g.tobytes() == b.tobytes() and set(a.tobytes()) == {255}
assert hashlib.sha256(values).hexdigest() == byte_hash
assert bytes.fromhex((assets / 'thresholds.hex').read_text()) == values
assert [values.count(i) for i in range(256)] == [16] * 256

# Separable direct DFT avoids a NumPy dependency for this small verification asset.
size = 64
waves = [[cmath.exp(-2j * math.pi * k * x / size) for x in range(size)] for k in range(size)]
def spectrum(samples):
    average = sum(samples) / len(samples)
    rows = [[sum((samples[y * size + x] - average) * waves[k][x] for x in range(size)) for k in range(size)] for y in range(size)]
    return [[abs(sum(rows[y][kx] * waves[ky][y] for y in range(size))) ** 2 for kx in range(size)] for ky in range(size)]

reports = []
report_image = Image.new('RGB', (1024, 275), '#202020')
draw = ImageDraw.Draw(report_image)
for panel, cutoff in enumerate([None, 0.1, 0.25, 0.5]):
    samples = list(values) if cutoff is None else [int((v + 0.5) / 256 < cutoff) for v in values]
    power = spectrum(samples)
    bins = [[] for _ in range(46)]
    for y in range(size):
        for x in range(size):
            radius = math.hypot(min(x, size-x), min(y, size-y))
            if radius:
                bins[int(radius)].append(power[y][x])
    radial = [sum(bucket) / len(bucket) if bucket else 0 for bucket in bins]
    low = [power[y][x] for y in range(size) for x in range(size) if 0 < math.hypot(min(x, size-x), min(y, size-y)) < 8]
    high = [power[y][x] for y in range(size) for x in range(size) if 16 <= math.hypot(min(x, size-x), min(y, size-y)) < 32]
    ratio = (sum(low) / len(low)) / (sum(high) / len(high))
    assert ratio < 0.08, (cutoff, ratio)
    reports.append({'threshold': cutoff, 'lowRadius': '(0,8)', 'highRadius': '[16,32)', 'meanPowerLowOverHigh': ratio, 'radialMeanPower': radial})
    tile = Image.frombytes('L', (size, size), bytes(samples if cutoff is None else [v*255 for v in samples]))
    display = tile.resize((128, 128), Image.Resampling.NEAREST)
    report_image.paste(display, (panel*256, 24))
    max_log = math.log1p(max(map(max, power)))
    spectral = bytes(round(255 * math.log1p(power[(y+32)%64][(x+32)%64]) / max_log) for y in range(size) for x in range(size))
    report_image.paste(Image.frombytes('L',(64,64),spectral).resize((128,128),Image.Resampling.NEAREST), (panel*256+128,24))
    draw.text((panel*256+4, 5), f'Tile / power: {cutoff if cutoff else "raw bytes"}', fill='white')
    draw.text((panel*256+4, 160), f'low/high power = {ratio:.5f}', fill='white')
    peak = max(radial)
    for i in range(1,44):
        draw.line((panel*256+(i-1)*5,260-70*radial[i-1]/peak,panel*256+i*5,260-70*radial[i]/peak), fill='#8dd9ee')
report_image.save(evidence / 'pss13-blue-noise-spectrum.png')
(evidence / 'pss13-blue-noise-spectrum.json').write_text(json.dumps({'sourcePngSha256':source_hash,'decodedSha256':byte_hash,'archiveSha256':archive_hash,'histogram':'each byte 0..255 exactly 16 times','method':'mean-subtracted 64x64 separable direct DFT; power = squared magnitude; DC excluded; no window on periodic tile','reports':reports}, indent=2)+'\n')
print('Source, archive (when supplied), raw decode and histogram verified.')
for report in reports:
    print(f'threshold={report["threshold"]}: low/high mean spectral power={report["meanPowerLowOverHigh"]:.6f}')
