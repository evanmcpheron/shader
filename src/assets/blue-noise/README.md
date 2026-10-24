# Fixed blue-noise thresholds

Christoph Peters, **Free blue noise textures**, published 2016-12-22 (updated 2017-01-31): [author's publication and CC0 declaration](https://momentsingraphics.de/BlueNoise.html), [original database archive](https://momentsingraphics.de/Media/BlueNoise/FreeBlueNoiseTextures.zip), [CC0 1.0 dedication](https://creativecommons.org/publicdomain/zero/1.0/).

Downloaded 2026-10-24. Selected archive member: `Data/64_64/LDR_LLL1_0.png`. The author's database uses tileable void-and-cluster textures; only this fixed tile is used. No temporal offsets, regeneration or per-frame random values occur.

| Data | SHA-256 |
| --- | --- |
| Original archive (40 MiB; not bundled) | `4279ad66ec851a8cbf37025816ef5187bf1c1c001d46afb8edfa6d3c8e44c644` |
| Unmodified source.png (7,115 bytes) | `140c55bd97c21b9b22008d7054b492333fec67fbfc1a1b266e5b0209b647eed4` |
| Decoded 4,096 single-channel bytes | `fe602dd3f05c3d79ef1ff01533923c45a9eede45531251901818250445fbe4b1` |

`source.png` is retained as provenance. It is 64×64 RGBA, R=G=B and A=255, with no gamma/ICC metadata. Pillow 12.3.0's `Image.open(...).split()[0].tobytes()` extracts the stored R samples in top-left row order. No `convert`, gamma, ICC, sRGB transfer or display canvas is involved. `thresholds.hex` encodes these same bytes as 64 lines of lowercase hex (128 characters per row); whitespace has no semantic meaning. The app imports only the hex asset, decodes once and freezes the values. It does not load or color-convert the PNG.

Values 0–255 each occur exactly 16 times. Runtime thresholds are `(byte+0.5)/256`, strictly within (0,1), with mean 0.5. Lookup uses `floor(nativeCoordinate/patternScale) mod 64`, fixed at the canvas top-left. Ramp width, strength and palette amplitude use the established Bayer formulas.

Reverify locally with `python3 scripts/check-blue-noise.py`. Optionally pass the downloaded archive path to also verify its hash and selected member: `python3 scripts/check-blue-noise.py /tmp/pss13-blue-noise.zip`. The script requires Pillow only for PNG decoding and evidence images; it is development tooling, not an application dependency. It does not fetch data or alter the runtime asset.

The script computes a mean-subtracted separable direct 64×64 DFT without a window on this periodic tile. It writes spectrum JSON/PNG under `docs/pixel-shading-studio/evidence/pss13-blue-noise-spectrum.*`. Mean spectral power at radii (0,8) divided by [16,32) is **0.000214** for raw bytes; binary thresholds 0.1/0.25/0.5 give **0.034155 / 0.015703 / 0.012350**. DC is excluded. The inspected spectrum shows a dark center and broad high-frequency energy; the threshold views show irregular distributed dots and no small repeating Bayer lattice. These measurements and source provenance support the blue-noise claim; a uniform histogram or noisy appearance alone would not establish it. Finite tiling and directional variation remain visible on sufficiently large/repeated views.
