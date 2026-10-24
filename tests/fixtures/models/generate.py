"""Generate tiny original geometry; no external artwork or textures."""
import base64
import copy
import json
import math
from pathlib import Path
import struct

root = Path(__file__).parent
# A smooth octahedron shared by two offset child meshes, including nested transforms.
positions = [(0, 2, 0), (0, -2, 0), (2, 0, 0), (0, 0, 2), (-2, 0, 0), (0, 0, -2)]
indices = [0, 3, 2, 0, 4, 3, 0, 5, 4, 0, 2, 5, 1, 2, 3, 1, 3, 4, 1, 4, 5, 1, 5, 2]
normals = [tuple(v / math.sqrt(sum(x*x for x in p)) for v in p) for p in positions]
binary = struct.pack('<18f18f24H', *(x for p in positions for x in p), *(x for p in normals for x in p), *indices)
doc = {
    'asset': {'version': '2.0', 'generator': 'Pixel Shading Studio original fixture'},
    'scene': 0, 'scenes': [{'nodes': [0, 3, 4]}],
    'nodes': [
        {'translation': [10, 3, -4], 'children': [1, 2]},
        {'mesh': 0, 'translation': [-2, 0, 0]},
        {'mesh': 0, 'translation': [2, 1, 0], 'scale': [0.5, 0.5, 0.5]},
        {'camera': 0}, {'extensions': {'KHR_lights_punctual': {'light': 0}}},
    ],
    'cameras': [{'type': 'perspective', 'perspective': {'yfov': 0.5, 'znear': 0.1}}],
    'extensionsUsed': ['KHR_lights_punctual'],
    'extensions': {'KHR_lights_punctual': {'lights': [{'type': 'point', 'intensity': 1000}]}},
    'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1}, 'indices': 2, 'material': 0}]}],
    'materials': [{'pbrMetallicRoughness': {'baseColorFactor': [1, 0, 0, 0.1]}, 'alphaMode': 'BLEND', 'doubleSided': True}],
    'accessors': [
        {'bufferView': 0, 'componentType': 5126, 'count': 6, 'type': 'VEC3', 'min': [-2, -2, -2], 'max': [2, 2, 2]},
        {'bufferView': 1, 'componentType': 5126, 'count': 6, 'type': 'VEC3'},
        {'bufferView': 2, 'componentType': 5123, 'count': 24, 'type': 'SCALAR'},
    ],
    'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': 72}, {'buffer': 0, 'byteOffset': 72, 'byteLength': 72}, {'buffer': 0, 'byteOffset': 144, 'byteLength': 48}],
    'buffers': [{'byteLength': len(binary), 'uri': 'group.bin'}],
}
(root / 'group.bin').write_bytes(binary)
def save(name, value):
    (root / name).write_text(json.dumps(value, indent=2) + '\n')
save('group.gltf', doc)
glb = copy.deepcopy(doc)
del glb['buffers'][0]['uri']
payload = json.dumps(glb, separators=(',', ':')).encode()
payload += b' ' * (-len(payload) % 4)
(root / 'group.glb').write_bytes(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(payload) + 8 + len(binary)) + struct.pack('<II', len(payload), 0x4E4F534A) + payload + struct.pack('<II', len(binary), 0x004E4942) + binary)
missing = copy.deepcopy(doc)
missing['buffers'][0]['uri'] = 'missing.bin'
save('missing.gltf', missing)
remote = copy.deepcopy(doc)
remote['buffers'][0]['uri'] = 'https://example.invalid/reference.bin'
save('remote.gltf', remote)
unsupported = copy.deepcopy(doc)
unsupported['extensionsRequired'] = ['KHR_draco_mesh_compression']
save('compressed.gltf', unsupported)
morph = copy.deepcopy(doc)
morph['meshes'][0]['primitives'][0]['targets'] = [{'POSITION': 0}]
save('morph.gltf', morph)
animated = copy.deepcopy(doc)
animated['animations'] = [{'channels': [], 'samplers': []}]
save('animated.gltf', animated)
(root / 'malformed.glb').write_bytes(b'not a GLB')

embedded = copy.deepcopy(doc)
embedded['buffers'][0]['uri'] = 'data:application/octet-stream;base64,' + base64.b64encode(binary).decode()
del embedded['meshes'][0]['primitives'][0]['attributes']['NORMAL']
save('embedded.gltf', embedded)
