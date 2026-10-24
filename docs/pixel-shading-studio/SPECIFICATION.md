# Pixel Shading Studio — Product Specification

Status: planning baseline for implementation; no application features have been implemented by this planning activity. The repository and verified completion records take precedence over assumptions in a new Codex conversation.

## Purpose and boundaries

Build a production-quality, browser-local shading reference tool for pixel artists, sprite artists, and 2D game developers. Artists arrange geometry, camera, and lighting, then produce deliberate pixel shading with exact dimensions, palettes, dithering, outlines, and PNG output. Interaction must remain understandable and responsive during scene changes.

[Shading Reference](https://shadingreference.com/) describes adjustable shapes, angle, lighting, colors, and cel shading. It provides product inspiration only. Do not copy its implementation, branding, or assets. The requirements below define this application's behavior independently.

Implementation preserves the existing Vite project and npm workflow. No backend, accounts, authentication, cloud storage, full modeling tools, sculpting, texture painting, animation editor, sprite sheet export, video, additional image formats, collaboration, or plugin framework. Imported models provide shape references, not full material or animation authoring. Optional features are identified explicitly and cannot replace mandatory work.

## Primary workflow

1. Choose a built-in shape, or later import a local GLB/GLTF reference.
2. Set object transforms and camera orientation independently; start in orthographic projection.
3. Position a directional light, adjust ambient light, and inspect the shading.
4. Set output canvas width/height and a separate subject fit box in actual pixels.
5. Choose lighting/shading mode, edit a color ramp or palette, and configure dithering.
6. Add optional outlines and ground shadows; inspect measured subject and effect bounds.
7. Zoom or pan the preview without changing output. Compare the unprocessed reference and final pixels.
8. Export the displayed final native-resolution image as PNG. Save a local preset for later reuse.

## Normative rendering contract

- Output pixels are image pixels, independent of CSS size, browser zoom, and devicePixelRatio (DPR).
- Rasterize geometry directly into a target of the configured output width and height. Never create the sprite by interpolating a larger scene image down to size.
- Disable MSAA, temporal jitter, FXAA, smoothing, mipmaps, and interpolation in the native image path. The optional reference view is not the authoritative output.
- Use geometry normals and configured lighting to drive shading; changing light direction changes shaded surfaces. Posterizing a screenshot alone does not satisfy this contract.
- A single published final RGBA frame supplies both the preview and export. Preview overlays, checkerboard, gizmos, and comparison UI never enter that frame.
- Palette modes write original palette RGB bytes. Transparent pixels have RGBA zero. Subject coverage and outlines use alpha 0 or 255. Soft shadows use opaque, palette-quantized pixel patterns by default; fractional-alpha shadows are outside initial scope.
- Palette guarantees apply to opaque subject pixels. Background, explicit outline color, and shadow/receiver colors are separately listed effect colors. A strict all-effects palette option maps those colors into the active palette. With all effects off and transparency on, an N-color ramp yields at most those N RGB colors. A scene need not visibly use every ramp color.
- For fixed native input data and validated settings, processing is deterministic. Repeated settled renders of one scene on one supported browser/GPU must match. Universal bitwise equality of GPU rasterization across vendors is not promised; CPU fixture results are exact across supported environments.

## R01 — Geometry and object transforms

Provide sphere, cube, cylinder, cone, square-based pyramid, torus, and plane. The plane can be a selected reference object or an optional independent ground receiver. Only one subject is selected; the ground is not a modeling hierarchy.

Support X/Y/Z position, rotation, and scale, reset transforms, stable centering, and consistent initial framing. Geometry parameters include appropriate radii, dimensions, height, torus tube radius, and bounded segment counts. Validate finite numbers and positive dimensions, prevent degenerate scales, and avoid rebuilding geometry for light or camera edits. Changing geometry retains intentional scene settings and offers a documented reframe action. Show units and numerical inputs alongside useful sliders.

## R02 — Camera

Default to orthographic. Provide orbit, pan and zoom when compatible with the active framing mode, explicit roll, perspective projection with FOV, reset, and front/back/left/right/top/bottom/isometric presets. Object transforms never mutate during camera gestures. Preserve the view target/orientation and approximate apparent size when switching projection; report expected perspective changes.

Orbit changes the subject silhouette and shading view. Roll rotates the render camera without being undone by orbit controls. In pixel-fit mode, fitting controls subject size and placement: camera zoom/pan are disabled with an explanation and an explicit switch to manual framing. In manual mode, camera zoom/pan affect the rendered subject and measured bounds; fit settings are retained for later reuse. Preview zoom/pan always affect presentation only. Reset camera does not reset object, light, or palette.

## R03 — Lighting

Provide one directional source plus ambient illumination. Configure directional position and target/direction, RGB color, intensity, and ambient intensity. A draggable viewport light handle and precise numeric inputs edit the same state. Direction is derived from position and target with a documented sign convention. Reject a zero-length direction. Helpers never appear in output. Include upper-right, upper-left, overhead, side, and flat-ambient presets and a lighting-only reset. Colored light affects smooth rendering and palette quantization; fixed ramp colors stay unchanged while linear-light luminance controls ramp placement. Explain this in mode-specific help.

## R04 — Canvas, subject fit, and alignment

Resolution presets: 8×8, 16×16, 24×24, 32×32, 48×48, 64×64, 96×96, 128×128, and 256×256. Provide independent custom integer width and height. Initial safety range is 1–1024 per axis and at most 1,048,576 total pixels, additionally bounded by GPU capability and allocation success. This is a resource limit, not an export scaling setting; common resolutions through 256×256 are required.

Canvas size, subject fit-box size, and preview zoom are independent. Pixel-fit mode preserves projected aspect ratio and contains the subject inside its requested box. Do not distort an arbitrary object to claim both requested bounds are exact. Display requested box and actual occupied subject-mask bounds separately. Fit excludes outline and ground shadow. Support center and eight edge/corner alignments, integer X/Y offsets, and nonnegative per-edge padding. Define odd remainder rounding toward the lower/right margin using floor for the leading offset. Clamp an oversized box to the padded drawable area with a visible notice; reject padding that leaves no drawable area. Manual framing allows intentional clipping and reports it.

The canonical orthographic, smooth-normal sphere at default object rotation must occupy exactly 32×32 mask pixels centered at x=16..47, y=16..47 on a 64×64 canvas, without effects. A measured native-mask calibration may refine the projection by a bounded amount. Preserve geometry aspect ratio. For arbitrary perspectives, thin geometry, or unattainable pairs of dimensions, show achieved bounds and an explanation; never silently report requested bounds as achieved. Empty/clipped/degenerate subjects are handled without an infinite fit loop.

Changing camera orientation refits in pixel-fit mode. World position still affects light/ground relationships; fit recenters the projected subject, so canvas placement uses alignment/offsets. Manual framing exposes world translation directly. Changing the canvas or fit box does not change object transforms. Outline/shadow clipping is reported; effect padding is never silently added to export dimensions.

## R05 — Shading modes

Separate normal treatment from tone mapping so flat face normals and smooth interpolated normals have clear behavior. Expose usable named modes: smooth reference, flat shading, cel shading, discrete pixel-art bands, and palette-constrained shading. Cel/band modes use geometry-derived illumination with configurable count and monotonic thresholds. Offer base, shadow, and highlight colors, editable ordered custom ramps, brightness, contrast, and shade-distribution control.

Use a finite normalized illumination domain; document saturation for intense light. Threshold equality, endpoints, and one-color palettes must be deterministic. Brightness/contrast/distribution modify the continuous shading signal before quantization, never mutate a finished exact-color frame. A four-color ramp uses exactly its stored colors at selected pixels, even after dithering. Smooth/flat modes may use continuous RGB; the UI makes the active palette guarantee clear. Ramp endpoints and palette ordering are controlled by the artist, not silently resorted by luminance.

## R06 — Palette management and color

Support manual color picking and hex entry, adding/removing/reordering colors, ordered shading ramps, size limits of 1–32 colors, custom palettes, reset, and palette data import/export as a simple documented JSON or hex-list format. Palette data export is configuration interchange, not another image export format. Validate import atomically and preserve the current palette on failure.

Built-ins have explicit opaque sRGB bytes, in dark-to-light order:

| Preset | Colors |
| --- | --- |
| Grayscale | `#202020 #686868 #B0B0B0 #F0F0F0` |
| Game Boy-inspired | `#0F380F #306230 #8BAC0F #9BBC0F` |
| NES-inspired | `#1C1C1C #2038EC #38B4FC #FCFCFC` |
| Warm monochrome | `#301B28 #78404A #C47761 #F4D7A1` |
| Cool monochrome/default | `#172038 #304878 #5C88B8 #B8D8F0` |

Inspired names are aesthetic choices, not hardware accuracy claims. User colors are opaque sRGB. Lighting math and nearest-color distances use decoded linear-sRGB; selected output colors use original sRGB bytes with no second conversion. Nearest-color ties choose the lowest palette index. No HDR, wide-gamut UI, or display color matching is required.

## R07 — Dithering

Dithering is mandatory. Modes: none, Bayer 2×2, Bayer 4×4, Bayer 8×8, blue noise, and Floyd–Steinberg. Provide strength 0–1, ordered/blue-noise integer pattern scale 1–8, and a transition-width or threshold control for ramp transitions. Hide or disable irrelevant controls with a concise reason. A strength of zero must take the exact disabled path in every mode.

Ordered modes use correct Bayer rank matrices and native canvas coordinates with a fixed top-left origin. Blue noise uses a fixed, locally bundled tile with recorded provenance or a reproducibly generated rank tile; no per-frame randomness or white-noise substitute. Repeating the same settings yields identical pixels. Preview zoom, panning, and DPR never change patterns. Object/camera movement can change which surfaces receive those fixed canvas samples.

Ramp dithering selects between neighboring ramp shades in transition regions. Palette mode dithers continuous linear RGB before final nearest-color selection. Floyd–Steinberg is a real left-to-right, top-to-bottom error-diffusion pass using 7/16 right, 3/16 down-left, 5/16 down, 1/16 down-right weights. Diffuse scalar error for ramp coordinates and RGB error for palette mode; scale propagated error by strength. Transparent pixels neither emit nor receive error; dropped mask/border neighbors are not renormalized. Ground and subject are separate diffusion regions. Background and outline pixels are excluded. No noise overlay after quantization.

## R08 — Outlines

Provide none or silhouette outline with integer thickness 1–8 and explicit color. Use native-grid mask dilation minus the subject mask, with a documented square/Chebyshev neighborhood. Do not fill holes as an accidental side effect. Outlines extend outward and do not count toward requested subject size. Handle edge clipping with a notice. Strict-palette mode selects an allowed outline color; explicit custom color adds a clearly shown effect color. Internal depth/normal edge outlines are optional future work, not necessary for acceptance.

## R09 — Ground and shadows

Provide toggleable self/ground directional shadows, receiver visibility, shadow strength, hard and pixel-stylized soft treatment, and reset behavior. Shadow maps provide visibility before shading quantization. Attenuate directional illumination while preserving ambient contribution. A ground receiver can be visible or shadow-only; a shadow-only receiver is transparent where unshadowed and uses deterministic binary coverage/quantized colors in shadow. Expose a bounded pixel softness radius (0–4) or discrete shadow bands, with an explanation of its artistic rather than physical meaning. A visible receiver and shadow are excluded from subject measurement and silhouette outlines. Avoid acne, detached shadows, and uncontrolled shadow map allocations.

## R10 — Workspace and UI

Desktop-first creative workspace: top toolbar for presets, resets, view mode, export; left for object/camera/light; center for output; right for dimensions/shading/palette/dither/outline. Dark neutral surfaces, restrained accents, reusable controls, compact sections, and accessible labels. No decorative disconnected controls. Show only controls backed by working capabilities as tasks land.

Central workspace provides live pixels, reference-only view, final-only view, synchronized side-by-side before/after comparison, zoom, 2D pan, pixel grid, checkerboard, transparent/solid backgrounds, fit-to-view, and native/100% preview. Integer zoom steps are the crisp default; fit can use nearest-neighbor fractional presentation with a notice about unequal screen pixel widths. Native/100% means one output pixel per CSS pixel at 100% browser zoom; DPR and browser zoom may change physical screen pixel size, never image data. Grid is view-only and suppressed when too dense. Include separate camera-orbit, light-move, and 2D-preview-pan interaction modes so gestures do not compete. Numeric controls remain available without a pointer.

Sidebars scroll independently. At narrower widths they collapse into accessible panels while keeping the workspace usable. Keyboard focus, input errors, busy/error status, import cancellation, no-WebGL guidance, context restoration, and export availability must work. No excessive animation or UI framework is required.

## R11 — Export

PNG only, exactly canvas width × height. Transparent or solid background uses the same setting shown in the final preview; no second export dimension independent of canvas, screenshots, DPI scaling, or hidden enlargement. Meaningful filename such as `sphere-64x64-bayer4.png`. Snapshot the current settings/revision, await the matching final processed frame, and encode those bytes. Do not export an older in-flight render after a recent edit. Busy/error states handle encoding failure and repeated clicks. Release download URLs. Decode exported PNGs in browser verification and compare width, height, opaque RGB, and alpha to the authoritative final frame.

## R12 — Presets and browser-local persistence

Save, name, restore, overwrite, and delete local presets; autosave the current configuration. Serialize shape/transforms, camera including roll/target/projection, lights/shadows, canvas and framing, shading/palette, dithering, outline, background, and output dimensions. Store a schema version, validate/migrate supported versions, handle malformed/unknown future data and quota/private-storage failures visibly, and apply restores atomically. Reset section, restore default palette, and reset whole scene have clear boundaries. Include complete factory scene presets, including the canonical blue sphere.

Do not put Three objects, typed frame buffers, files, object URLs, or functions in JSON. Initial model persistence stores a descriptive asset reference/hash and settings, not the imported bytes. After reload, explain when a file must be reselected; restore built-in scenes byte-identically on the same browser/GPU. If a model is missing, preserve its settings pending reselect and offer an explicit built-in fallback rather than silently claiming full restoration.

## R13 — Import later, without replacing the renderer

Support local GLB and GLTF 2.0 with embedded data or a user-selected bundle of companion files resolved locally. Render supported static mesh geometry through the same normal/lighting/palette path. Center/normalize via a parent transform without destroying mesh relationships. Preserve authored normals where present and compute missing normals when safe. Do not use imported cameras/lights or material colors to bypass the reference shading.

Reject unsupported required compression/extensions, missing companion files, malformed/oversized models, non-mesh-only content, and unsupported deformed geometry with an actionable message. Initial skinned/morph/animated scenes may be rejected explicitly; static mesh import remains mandatory. Use file/vertex/triangle caps documented in the UI and tested. Failed/cancelled import leaves the previous subject intact. Never fetch arbitrary remote model resources. Revoke URLs and dispose replaced model resources, including unused imported textures.

## R14 — Performance, failure recovery, and verification

Coalesce rendering on invalidation; idle scenes do not run a needless continuous loop. Keep frame buffers outside React state, reuse allocations, and skip geometry capture for palette-only changes. Common sprite sizes and 256×256 remain usable under orbit/light edits; record measured timings and memory, not promised frame rates. Expensive processing can coalesce intermediate edits or move to a worker only after measurement, while never reducing native output resolution or changing final algorithms. Always publish/export the latest complete revision.

Clean up geometries/materials/textures/targets, controls, listeners, observers, pending work, and URLs under replacement, unmount, context loss, and React StrictMode remounts. Show explicit failures instead of a silent black frame. Resource limits and optional enhancements must be documented.

## Required end-to-end scenarios

| Scenario | Procedure and required observations | Primary verification |
| --- | --- | --- |
| S1 Basic sphere | Sphere, orthographic, 64×64 canvas, 32×32 subject, centered, default four blue bytes, dither/shadow/outline off, transparent; measure x/y=16..47 and only ramp RGB among opaque pixels; export 64×64 | PSS-08/11/17, repeated PSS-20 |
| S2 Lighting | Cube; orbit camera, then rotate object separately; move directional light and observe face/band changes; camera gestures preserve object state | PSS-05/06/10, PSS-20 |
| S3 Ordered | Sphere, Bayer 4×4; repeated settings match, strength changes pixels, zero equals none, preview zoom changes no frame bytes | PSS-12, PSS-20 |
| S4 Diffusion | Restricted palette and smooth gradient/sphere; Floyd–Steinberg uses only palette RGB, deterministic, differs from Bayer on a nontrivial fixture | PSS-13, PSS-20 |
| S5 Outline | Integer thickness and custom/strict-palette color; mask dilation matches expected pixels; export matches preview, including clipping behavior | PSS-14/17, PSS-20 |
| S6 Transparency | Transparent background, dither and outline toggles; decoded PNG has alpha zero outside effects and no partial subject/outline edge alpha or RGB halos | PSS-07/14/17, PSS-20 |
| S7 Presets | Configure a built-in scene covering all persisted fields, save, reload, restore; same settings and same settled pixels on one browser/GPU | PSS-18, PSS-20 |
| S8 Independent sizes | 96×64 canvas, centered 32×32 sphere; measure x=32..63/y=16..47; vary preview zoom/DPR without frame change; export 96×64 | PSS-08/09/17, PSS-20 |
| S9 Complete application | Exercise every major control and reset, imports/errors, preview modes, export, reload/presets; no console/render failures; all checks/build pass and desktop workflow is usable | PSS-19/20 |

Unit tests cover math, validation, state transitions, shading boundary cases, quantization ties, every dither algorithm, alpha/masks, deterministic fixtures, and serialization. Browser tests/checklists establish actual WebGL behavior, interaction, decoded export fidelity, visual quality, and resource stability. A passing build alone never establishes product acceptance.
