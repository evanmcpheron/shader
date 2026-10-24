import gzip
import hashlib
import json
import math
from pathlib import Path

folder = Path(__file__).parent
evidence = json.loads(gzip.decompress((folder / 'pss13-browser-frames.json.gz').read_bytes()))
records = evidence['records']
gradients = json.loads(gzip.decompress((folder / 'pss13-gradient-frames.json.gz').read_bytes()))['gradients']
by_label = {row['label']: row for row in records}
checks = []
def check(name, passed):
    checks.append({'name': name, 'passed': bool(passed)})
    assert passed, name

def digest(rgba):
    return hashlib.sha256(bytes(rgba)).hexdigest()

def capture_key(settings):
    return json.dumps({key: settings[key] for key in ['subject', 'camera', 'canvas', 'framing']}, sort_keys=True)

masks = {capture_key(row['diagnostic']['settings']): row['original']['rgba'][3::4] for row in records if row['diagnostic']['settings']['background']['kind'] == 'transparent'}
seen = {}
originals = {}
for row in records:
    label = row['label']
    diagnostic = row['diagnostic']
    settings = diagnostic['settings']
    frame = row['frame']
    rgba = frame['rgba']
    original = row['original']['rgba']
    mask = masks[capture_key(settings)]
    palette = [tuple(bytes.fromhex(color[1:])) for color in settings['palette']['colors']]
    check(label + ': exact native dimensions', len(rgba) == frame['width'] * frame['height'] * 4 == len(original))
    check(label + ': saved hashes', digest(rgba) == row['hash'] and digest(original) == row['originalHash'])
    check(label + ': exact palette membership', all(tuple(rgba[p*4:p*4+3]) in palette for p, category in enumerate(mask) if category == 255))
    check(label + ': binary alpha', set(rgba[3::4]) <= {0,255})
    check(label + ': stable graphics resources', diagnostic['memory'] == {'geometries':1,'textures':1,'programs':1} and diagnostic['native']['targetLifecycle']['active'] == 1)
    check(label + ': latest published revision', frame['revision'] == diagnostic['revisions']['settings'] and frame['captureRevision'] == diagnostic['revisions']['capture'])
    if settings['background']['kind'] == 'transparent':
        check(label + ': mask and transparent zero RGB', rgba[3::4] == mask and all(rgba[p*4:p*4+4] == [0,0,0,0] for p,category in enumerate(mask) if category == 0))
    else:
        check(label + ': solid alpha', set(rgba[3::4]) == {255})
    key = json.dumps(settings, sort_keys=True)
    if key in seen:
        check(label + ': repeated whole frame identical', rgba == seen[key])
    seen[key] = rgba
    before_key = json.dumps({key:settings[key] for key in ['subject','camera','lighting','canvas','framing','background']} | {'baseColor':settings['shading']['baseColor'],'normals':settings['shading']['normals']}, sort_keys=True)
    if before_key in originals:
        check(label + ': Original untouched', original == originals[before_key])
    originals[before_key] = original

for tone, none_label in [('bands','ramp-none'),('palette','palette-none')]:
    for kind in ['2','4','8','blue-noise','floyd-steinberg']:
        check(f'{tone} {kind}: zero equals none', by_label[f'{tone}-{kind}-zero']['frame']['rgba'] == by_label[none_label]['frame']['rgba'])
    for kind in ['blue-noise','floyd-steinberg']:
        check(f'{tone} {kind}: full differs from Bayer 4', by_label[f'{tone}-{kind}-full']['frame']['rgba'] != by_label[f'{tone}-4-full']['frame']['rgba'])
        check(f'{tone} {kind}: repetition', by_label[f'{tone}-{kind}-full']['frame']['rgba'] == by_label[f'{tone}-{kind}-repeat']['frame']['rgba'])
check('Blue noise strength and width keep common interval semantics', by_label['bands-blue-width035']['hash'] == by_label['bands-blue-strength035']['hash'])
check('Blue noise native scale changes pattern', by_label['bands-blue-scale2']['hash'] != by_label['bands-blue-noise-full']['hash'])
check('FS error strength changes allocation', by_label['palette-fs-weak']['hash'] != by_label['palette-floyd-steinberg-full']['hash'])
for kind in ['fs','blue']:
    left = by_label[f'{kind}-view-baseline']
    right = by_label['fs-view-compare' if kind == 'fs' else 'blue-view-zoom']
    check(kind + ': view-only edits preserve bytes and processing', left['frame']['rgba'] == right['frame']['rgba'] and left['diagnostic']['native']['processes'] == right['diagnostic']['native']['processes'])
for policy in ['explicit','strict']:
    left = by_label[f'solid-{policy}-fs']['frame']['rgba']
    right = by_label[f'solid-{policy}-none']['frame']['rgba']
    mask = by_label['sphere256-palette-none']['original']['rgba'][3::4]
    check(policy + ': solid background untouched by diffusion', all(left[p*4:p*4+4] == right[p*4:p*4+4] for p,category in enumerate(mask) if category == 0))
check('256 sphere fills intended 224px box', by_label['sphere256-palette-floyd-steinberg']['frame']['framing']['actual'] == {'x':16,'y':16,'width':224,'height':224})
check('Torus interior is transparent', by_label['torus-fs']['frame']['rgba'][(128*256+128)*4:(128*256+128)*4+4] == [0,0,0,0])
check('All six UI choices visible', evidence['uiChecks']['options'] == ['None','Bayer 2×2','Bayer 4×4','Bayer 8×8','Blue noise','Floyd–Steinberg'])
check('Diffusion controls applicable', all(evidence['uiChecks'][key] for key in ['diffusionScaleHidden','diffusionWidthHidden','strengthEnabled']))
check('Both actual browser tabs have no warnings/errors', evidence['console'] == evidence['gradientConsole'] == [])

# Independent reference uses a full image of residuals, not production's two-row mapper.
def reference_fs(size, domain, colors):
    palette = [[int(color[i:i+2],16) for i in [1,3,5]] for color in colors]
    def decode(byte):
        value = byte / 255
        return value / 12.92 if value <= 0.04045 else ((value+0.055)/1.055)**2.4
    linear = [[decode(byte) for byte in color] for color in palette]
    channels = 1 if domain == 'ramp' else 3
    errors = [[0.0] * channels for _ in range(size*size)]
    output = [0] * (size*size*4)
    def eligible(x,y):
        return 0 < x < size-1 and 0 < y < size-1 and not (x == size//2 and y < size*0.75)
    knots = [(0,0),(.25,.5),(.5,1.5),(.75,2.5),(1,3)]
    for y in range(size):
        for x in range(size):
            if not eligible(x,y):
                continue
            p = y*size+x
            signal = x/(size-1)
            if domain == 'ramp':
                coordinate = next(aq+(bq-aq)*(signal-a)/(b-a) for (a,aq),(b,bq) in zip(knots,knots[1:]) if signal <= b)
                adjusted = coordinate+errors[p][0]
                index = max(0,min(3,math.floor(adjusted+0.5)))
                residual = [adjusted-index]
            else:
                adjusted = [value+error for value,error in zip([signal,signal*.8,signal*.6],errors[p])]
                index = min(range(len(palette)),key=lambda i:sum((value-target)**2 for value,target in zip(adjusted,linear[i])))
                residual = [value-target for value,target in zip(adjusted,linear[index])]
            output[p*4:p*4+4] = palette[index]+[255]
            for dx,dy,weight in [(1,0,7),(-1,1,3),(0,1,5),(1,1,1)]:
                nx,ny = x+dx,y+dy
                if eligible(nx,ny):
                    for channel in range(channels):
                        errors[ny*size+nx][channel] += residual[channel]/16*weight
    return output

groups = {}
for row in gradients:
    name = f'{row["domain"]} {row["width"]} {row["kind"]} run {row["attempt"]}'
    rgba = row['rgba']
    size = row['width']
    colors = {tuple(bytes.fromhex(color[1:])) for color in row['colors']}
    check(name + ': hash and dimensions', digest(rgba) == row['hash'] and len(rgba) == size*size*4)
    check(name + ': exact colors and zero RGB', all(tuple(rgba[i:i+3]) in colors if rgba[i+3] else rgba[i:i+4] == [0,0,0,0] for i in range(0,len(rgba),4)))
    key = (row['domain'],size,row['kind'])
    if key in groups:
        check(name + ': repeated native bytes identical', rgba == groups[key])
    elif row['kind'] == 'floyd-steinberg':
        check(name + ': independent full-image FS reference', rgba == reference_fs(size,row['domain'],row['colors']))
    groups[key] = rgba
for domain in ['ramp','palette']:
    for size in [64,256]:
        check(f'{domain} {size}: all three patterns differ', len({digest(groups[(domain,size,kind)]) for kind in ['bayer','blue-noise','floyd-steinberg']}) == 3)
summary = {'environment':evidence['environment'],'sphereFrames':len(records),'gradientFrames':len(gradients),'passed':len(checks),'checks':checks,'processingTimings':[{ 'label':row['label'],**row['diagnostic']['native']['timings']} for row in records if 'sphere256' in row['label'] or row['label'].endswith('-full')], 'gradientTimings':[{key:row[key] for key in ['kind','domain','width','attempt','processMs','hash']} for row in gradients]}
(folder / 'pss13-native-checks.json').write_text(json.dumps(summary,indent=2)+'\n')
print(f'{len(checks)}/{len(checks)} checks passed; {len(records)} actual sphere/torus frame pairs, {len(gradients)} gradient frames; four full-frame independent FS comparisons.')
