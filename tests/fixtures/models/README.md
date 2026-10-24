# Local model import fixtures

All geometry and files here are original, generated deterministically by `python3 tests/fixtures/models/generate.py`. No downloaded artwork, third-party models or hosted assets are used.

- `group.glb`: two differently transformed child meshes sharing one smooth octahedron (6 vertices, 8 triangles), under an offset parent. Includes an ignored camera/light and a translucent red material to verify studio appearance overrides.
- `group.gltf` + `group.bin`: the same reference with a selected local companion buffer.
- `embedded.gltf`: the same reference with base64 data and missing normals, computed on import.
- `missing.gltf`, `remote.gltf`, `compressed.gltf`, `morph.gltf`, `animated.gltf`, `malformed.glb`: deliberate failures. They are never claimed as supported models.

The unit suite additionally creates excessive counts/bytes/depth, cycles, skinning, invalid accessors/coordinates/indices, remote image references, ambiguous companions and repeated mesh instances. The Chrome script selects the actual files through the browser file input. Its cancellation/race checks add a 350 ms delay only to GLB `File.arrayBuffer`; graphics rendering is real WebGL2 throughout.
