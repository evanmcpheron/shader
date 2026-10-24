# Pixel Shading Studio — Implementation Roadmap

This is an execution plan, not completed application work. Run one prompt in a fresh Codex conversation at a time, in numerical order. Start with [PSS-01](prompts/01-project-foundation.md). Every prompt includes the complete A–I instructions for execution, repository inspection, scope, acceptance, verification and progress reporting. Do not execute future prompts automatically.

The repository is the source of truth. Read [SPECIFICATION.md](SPECIFICATION.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [PROGRESS.md](PROGRESS.md) before each task. Inspect the actual earlier implementation instead of recreating a proposed API. If required prior behavior is absent or unverified, record the blocker before dependent work. Adjust proposed structure to existing code; preserve the npm Vite project.

## Dependency and milestone policy

The supported execution path is deliberately sequential. Each task depends on the previous verified increment, so its transitive chain includes all earlier tasks. This reduces integration ambiguity across separate conversations; it is not a request for parallel implementation. Complexity is relative engineering effort/risk, not a time estimate or token budget.

| Milestone | Tasks | Exit gate |
| --- | --- | --- |
| A — Foundation | PSS-01–03 | Strict compatible tooling, validated state, accessible workspace shell |
| B — Interactive 3D Reference | PSS-04–06 | Real primitives, independent camera/roll/projection, controllable light and handle |
| C — Pixel-Perfect Rendering | PSS-07–09 | Native frames, independent subject fit, measured masks, presentation-only navigation |
| D — Pixel-Art Styling | PSS-10–12 | Geometry-aware modes, exact palettes/ramps and Bayer quantization |
| E — Advanced Rendering | PSS-13–16 | Mandatory blue-noise/FS, native outlines, stylized shadows, bounded local model import |
| F — Export and Persistence | PSS-17–18 | Decoded PNG fidelity and complete validated local presets |
| G — Polish and Verification | PSS-19–20 | Measured responsiveness/recovery and evidence-backed full requirements acceptance |

Blue noise and Floyd–Steinberg appear in milestone E to keep tasks focused; they remain mandatory core features. Model import follows core rendering so it cannot dictate a competing pipeline. PNG export follows the complete effects/import path so one task can verify the real final frame. Earlier tasks verify native buffers and explicitly defer PNG-specific claims until PSS-17.

## Ordered tasks

| Task | Title / standalone prompt | Direct dependency | Deliverable | Completion criterion | Complexity |
| --- | --- | --- | --- | --- | --- |
| PSS-01 | [Preserve the project and establish strict tooling](prompts/01-project-foundation.md) | None | The existing app still runs with a compatible graphics/state/test toolchain and explicit quality commands. | Starter works; strict commands, compatible npm additions and real interaction test verified. | Medium |
| PSS-02 | [Define validated scene settings and state transitions](prompts/02-domain-state-and-defaults.md) | PSS-01 | One typed, serializable settings model and small Zustand store define the studio without duplicating runtime resources. | All settings serialize/validate; actions, resets and dirty revisions have isolation tests. | Medium |
| PSS-03 | [Build the accessible creative workspace shell](prompts/03-creative-workspace-shell.md) | PSS-02 | A responsive dark studio layout and reusable connected controls replace the Vite starter coherently. | Dark labeled responsive workspace and real shell controls work without fake feature controls. | Medium |
| PSS-04 | [Render primitives and independent object transforms](prompts/04-scene-primitives-and-transforms.md) | PSS-03 | All built-in primitives render in one owned Three reference scene with working geometry and transform controls; explicit retry reconstructs from settings. | Seven shapes, parameters and transforms render; lifecycle/error paths verified. | High |
| PSS-05 | [Implement camera orbit, roll and projection controls](prompts/05-camera-controls-and-presets.md) | PSS-04 | Camera interaction, projections, roll and standard views work independently of object transforms. | Orbit/pan/zoom, roll, both projections/FOV and standard views preserve object state; explicit reference reframe commits only camera settings. | High |
| PSS-06 | [Implement controllable lighting and viewport light movement](prompts/06-lighting-controls-and-manipulation.md) | PSS-05 | One directional light plus ambient light respond to numeric controls, presets and an interactive handle. | Shared Lambert math, numeric/arcball light changes and reference-only helper layers verified; presets/reset preserve other settings and cancellation restores camera interaction. | High |
| PSS-07 | [Capture native pixels and publish one authoritative frame](prompts/07-native-resolution-rendering.md) | PSS-06 | Native-resolution geometry capture, basic geometry-driven pixel lighting and a final RGBA frame work without interpolation. | Native W×H normal data produces oriented lit RGBA with correct alpha and latest revision. | High |
| PSS-08 | [Implement independent canvas and subject pixel framing](prompts/08-independent-sprite-framing.md) | PSS-07 | Artists control a separate subject fit box, alignment and padding with measured native occupied bounds. | Exact canonical 32×32 masks in 64×64 and 96×64; alignment/manual fit and achieved bounds verified. | High |
| PSS-09 | [Add precise preview navigation and before/after views](prompts/09-preview-navigation-and-comparison.md) | PSS-08 | Final/reference comparison, zoom, pan, pixel grid and checkerboard operate without changing native pixels. | Zoom/pan/grid/checkerboard/compare do not change native frame hashes. | Medium |
| PSS-10 | [Implement flat, cel and discrete shading modes](prompts/10-geometry-driven-shading.md) | PSS-09 | Smooth, flat, cel and discrete band shading respond to geometry/light with editable levels and thresholds. | Normal/tone modes and level/threshold/signal controls change geometry-driven shading correctly. | High |
| PSS-11 | [Implement exact palettes, editable ramps and color quantization](prompts/11-palettes-and-color-quantization.md) | PSS-10 | Custom/preset palettes, editable ramps, palette interchange and predictable exact-color mapping are complete. | Explicit bytes, editable presets/ramps/interchange and linear-space matching pass color tests. | High |
| PSS-12 | [Implement native-grid Bayer dithering](prompts/12-ordered-bayer-dithering.md) | PSS-11 | None and Bayer 2×2/4×4/8×8 integrate with ramp/palette selection and expose meaningful deterministic controls. | Bayer ranks, zero strength, native origin/scale and deterministic color constraints verified. | High |
| PSS-13 | [Implement blue noise and Floyd–Steinberg diffusion](prompts/13-blue-noise-and-error-diffusion.md) | PSS-12 | All mandatory dither algorithms work deterministically, including actual sequential error diffusion. | Real blue noise and FS fixtures, masks, color guarantees and deterministic differences verified. | High |
| PSS-14 | [Implement native silhouette outlines and palette policy](prompts/14-pixel-aligned-outlines.md) | PSS-13 | Silhouette outlines have exact native thickness, color, compositing and clipping behavior. | Exact morphology, integer thickness, effect bounds and palette/alpha behavior verified. | Medium |
| PSS-15 | [Add directional shadows and a controlled ground receiver](prompts/15-stylized-shadows-and-ground.md) | PSS-14 | Self/ground shadows and pixel-stylized softness integrate before quantization with explicit receiver behavior. | Self/ground shadows precede quantization; receiver/softness/ambient/mask behavior verified. | High |
| PSS-16 | [Import bounded local GLB and GLTF references](prompts/16-local-gltf-model-import.md) | PSS-15 | Local static mesh models use the existing framing, lighting, styling and resource lifecycle without a second rendering path. | Static local GLB/GLTF share the pipeline; caps, atomic failures and resource cleanup verified. | High |
| PSS-17 | [Export the authoritative native frame as PNG](prompts/17-pixel-perfect-png-export.md) | PSS-16 | PNG export exactly matches the latest final frame, dimensions, colors and transparency. | Decoded PNG matches latest final dimensions, RGB and alpha, including S1/S5/S6/S8. | High |
| PSS-18 | [Save presets and restore complete local configurations](prompts/18-presets-and-local-persistence.md) | PSS-17 | Named local presets and current-session persistence restore validated scene configurations without backend infrastructure. | Complete built-in reload reproduces settings/pixels; storage errors and asset reselect handled. | High |
| PSS-19 | [Polish usability and measure rendering performance](prompts/19-usability-performance-and-recovery.md) | PSS-18 | The complete studio is accessible, responsive and resource-stable at required resolutions, with measured bottlenecks addressed. | Common/256px stage measurements, accessibility and resource/context recovery have evidence. | High |
| PSS-20 | [Audit and verify the complete application](prompts/20-final-integration-quality-audit.md) | PSS-19 | Every mandatory requirement and S1–S9 has explicit evidence or a documented acceptance-blocking defect. | All mandatory requirements and S1–S9 have evidence with no significant acceptance blocker. | High |

## Requirements-to-task traceability

Rows expand R01–R14 into individual mandatory behaviors. “Implement” owns delivery; “Verify” identifies focused proof. PSS-20 audits every row again. Exact acceptance resides in the specification and prompt. Optional internal edges, larger original view, and workers cannot replace mandatory work. Numbers below are PSS task suffixes.

| Requirement | Mandatory behavior / invariant | Implement | Verify |
| --- | --- | --- | --- |
| Project | Existing Vite/npm/lockfile preserved, minimal compatible additions | 01; all | 01; 20 config audit |
| Engineering | Strict TS, lint/build/test, focused modules, purposeful comments, scoped work | 01–20 | Every prompt G/H; 20 |
| R01 primitives | Sphere, cube, cylinder, cone, square pyramid, torus, plane | 04 | All-shape browser checklist 04; 20 |
| R01 parameters | Selection, meaningful geometry parameters, bounded segments, centering/reset | 04 | Parameter/selection/resource checks 04; 20 |
| R01 transforms | X/Y/Z position/rotation/scale, normalization independence, reset | 02/04 | Store isolation 02; real scene 04/05; 20 |
| R02 camera | Orbit, pan, zoom, camera/object independence | 05/08/09 | S2 05/06; manual/fit lock 08; 20 |
| R02 roll/views | Roll, camera-only reset, six axial/isometric views | 05 | Roll-after-orbit and pole tests 05; 20 |
| R02 projections | Orthographic default, perspective/FOV, coherent switching and fit | 02/05/08 | Projection/fit browser checks 05/08; 20 |
| R03 directional | Position/target/direction/color/intensity, presets/reset | 06 | Math and face lighting 06/10; 20 |
| R03 ambient | Ambient intensity and ambient-only preset, additive preservation | 06/07/15 | Lighting fixtures 07; shadow math 15; 20 |
| R03 manipulation | Draggable handle plus synchronized numerical input | 06/09 | Cancellation 06; zoom/roll mapping 09; 20 |
| R03/R09 shadows | Configurable self/ground shadows, strength, stylized softness | 15 | Native visibility, acne/bias/softness 15; 20 |
| R04 canvas | All nine specified square presets, independent custom W/H, resource validation | 02/07 | Dimensions/limits/browser 07; decoded PNG 17; 20 |
| R04 subject size | Independent subject box and aspect-preserving fit, exact sphere | 08 | S1/S8 native masks 08; decoded PNG 17; 20 |
| R04 placement | Alignment/padding/offsets/rounding, requested vs achieved, clipping | 08/14/15 | Math and clipping fixtures/browser 08/14/15; 20 |
| R04 pixels | Actual image pixels; no CSS/DPR/interpolated downsample dependency | 07/09/17 | Native resize/hash 07/09; PNG decode 17; 20 |
| R04 background | Transparent/solid output, checkerboard view-only | 07/09 | Alpha/overlay fixtures 07/09; S6 PNG 17; 20 |
| R05 modes | Smooth, flat, cel, discrete bands, palette-constrained | 10/11 | Normal/mode/band fixtures and browser 10/11; 20 |
| R05 controls | Levels/thresholds/base/highlight/shadow/contrast/brightness/distribution | 10/11 | Boundary/signal/connected control checks 10/11; 20 |
| R05 ramps | Generated and custom editable ramps, artist ordering | 10/11 | Generation/edit/order/import/reset 11; 20 |
| R05 shading | Light changes geometry-derived received shades | 07/10 | Lambert fixtures and cube face S2 10; 20 |
| R06 palettes | Manual/custom limited palettes, explicit named presets, reset/reorder | 11 | Byte sets, one-color/duplicate and UI checks 11; 20 |
| R06 interchange | Practical palette import/export, atomic validation | 11 | Valid/invalid/count/color fixtures 11; 20 |
| R06 color space | Linear math/nearest distance, original sRGB output, no double conversion | 07/11 | Transfer/tie/color fixtures 11; PNG pixels 17; 20 |
| R06 exact colors | N-color subject; disclosed effect additions and strict-effect policy | 11/14/15 | Color sets 11/14/15; S1 PNG 17; 20 |
| R07 ordered | None and Bayer 2×2/4×4/8×8 | 12 | Ranks/gradient fixtures, S3 12; 20 |
| R07 blue noise | Real fixed blue-noise tile/provenance, deterministic output | 13 | Asset/hash/provenance and visual structure 13; 20 |
| R07 diffusion | Real scalar/RGB Floyd–Steinberg and standard weights | 13 | Independent fixtures, S4 difference from Bayer 13; 20 |
| R07 controls | Algorithm/strength/meaningful transition threshold/integer scale | 12/13 | Connected controls, zero/scale fixtures 12/13; 20 |
| R07 integration | Quantization-stage dithering, masks/regions, zero equals none | 12/13/15 | Zero/membership/border/mask/repeat fixtures 12/13/15; 20 |
| R07 grid | Pattern fixed to output pixels through preview zoom/pan/DPR | 09/12/13 | Hash/visual S3 12/13; 20 |
| R08 outline | None/silhouette, integer thickness/color, native morphology | 14 | Mask/hole/diagonal/color fixtures 14; S5 PNG 17; 20 |
| R08 interactions | Alpha/palette/ground mask/clipping, subject size unchanged | 14/15 | Compositing fixtures 14/15; S5/S6 PNG 17; 20 |
| Pipeline capture | Native targets/normals/categories/filtering/MSAA/data color rules | 07 | Real scene, orientation, RGBA invariants 07; 20 |
| Pipeline order | Lighting/shadow → signal → dither+quantization → outline → background | 07/10–15 | Focused delivery tests; cross-effects 20 |
| Pipeline scheduling | Capture/style/view dirtiness, latest revision, no stale publication | 02/07/09/19 | State/scheduler fixtures 02/07; hashes 09; profile 19; 20 |
| Pipeline lifetime | Disposal, StrictMode, context loss/recovery, explicit errors | 04/07/15/16/19 | Replacement/remount/context/memory browser checks; 20 |
| R10 workspace | Live pixels, original/reference, synchronized before/after | 03/04/07/09 | Mode/alignment browser checks 09; 20 |
| R10 navigation | Zoom/pan/grid/checkerboard, fit/native view, view vs output sizes | 09 | Coordinate/view-only tests/browser 09; 20 |
| R10 design | Toolbar/inspectors, dark hierarchy, dense reusable restrained controls | 03/19 | Desktop/narrow layout checks 03/19; 20 |
| R10 accessibility | Labels, numeric/sliders, focus/keyboard, responsive panels | 03; feature UI; 19 | Focused UI tests and keyboard/browser 19; 20 |
| R10 states | Empty/loading/error/invalid drafts/import/export/storage status | 03/04/16–19 | Delivery failure paths; integrated 20 |
| R11 dimensions | Exact native PNG canvas size and descriptive filename | 17 | S1/S8 decoded PNG/file check 17; 20 |
| R11 fidelity | Same processed frame/RGB/alpha, no UI/smoothing/stale data | 17 | Decoded frames S1/S5/S6/S8, rapid export 17; 20 |
| R12 serialization | All subject/camera/light/output/ramp/effects/background settings | 02/18 | Complete round-trip, S7 reload/frame match 18; 20 |
| R12 presets | Named save/restore/overwrite/delete, autosave/factory/reset boundaries | 18 | State/storage/UI and real reload 18; 20 |
| R12 resilience | Version/validation/migration path, corrupt/quota/private storage | 18 | Failure fixtures/browser in-memory fallback 18; 20 |
| R13 formats | GLB and GLTF with selected companions, static mesh support | 16 | Both format fixtures/native browser results 16; 20 |
| R13 integration | Normalization/same styles/caps/errors/cancel/local resources/cleanup | 16 | Failed/stale/repeat import and no remote fetch 16; 20 |
| R13 persistence | Serializable descriptor, truthful missing-file reselect | 16/18 | Stored JSON and reselect/fallback browser 18; 20 |
| R14 responsiveness | Interactive common/256px scenes; avoid wasteful rerenders/transfers | 07/09/19 | Stage profiling/capture reuse 19; S9 20 |
| R14 memory | Bounded buffers/resources and URL cleanup | 04/07/15–19 | Repeat import/resize/export plateau 19; 20 |
| R14 determinism | Exact CPU fixtures; repeated settled same-environment scene/export | 07/10–18 | Native hashes/PNG pixels S3/S4/S7; 20 |
| Final quality | Audit every mandatory behavior, correct integration, docs match reality | 20 | QA evidence and no significant acceptance blockers |

## Acceptance scenarios and gates

| Scenario | First focused proof | Final image/state proof | Audit |
| --- | --- | --- | --- |
| S1 sphere | 08 exact mask; 11 exact ramp | 17 decoded 64×64 PNG | 20 |
| S2 light/camera/object | 05/06 independence; 10 bands | 10 real scene | 20 |
| S3 Bayer | 12 fixtures/zero/zoom | 17 decoded dither frame | 20 |
| S4 Floyd–Steinberg | 13 true diffusion fixtures | 17 decoded restricted-color frame | 20 |
| S5 outline | 14 native morphology | 17 decoded outline PNG | 20 |
| S6 transparency | 07 alpha; 14/15 effects | 17 decoded alpha/edge checks | 20 |
| S7 presets | 18 complete serialized round-trip | 18 real reload and settled frame | 20 |
| S8 rectangular sizes | 08 mask; 09 zoom isolation | 17 decoded 96×64 PNG | 20 |
| S9 complete application | 19 usability/profile/recovery | 20 production preview/build/all controls | 20 |

PSS-07 integration note: the verified native path is `scene/nativeCapture.ts` plus `pixels/nativeFrame.ts`, owned by the existing `ReferenceRuntime` and generation-aware `InvalidationScheduler`. Synchronous byte readback has no pending async target lifetime. PSS-08 extends this derived-camera boundary with vertex-based uniform projection fit, bounded native-mask calibration and category-only framing metadata. Manual mode retains W/H source projection. Extend these owners and their published frame rather than adding a second capture/scheduler; fitting/preview/export must keep one pose and one authoritative native frame.

## Verification and progress protocol

Existing scripts at planning time: `npm run dev`, `npm run lint`, `npm run build`, `npm run preview`. Baseline lint/build passed. PSS-01 introduces `npm run typecheck` (`tsc -b --noEmit`) and `npm run test` (`vitest run`); document optional watch commands. Later tasks verify package.json before running scripts. Do not assume uninstalled npx runners or imaginary CI commands.

Each task runs strict check, lint, meaningful tests and build. Real browser evidence establishes rendering/pointer/layout/export acceptance. Record environment, settings, observed masks/color counts/pixels and errors. Unit tests prove CPU algorithms; jsdom cannot prove WebGL/PNG fidelity. Use available browser tools/manual workflow; required unrun checks leave a task incomplete, not passed.

PSS-19 records measured performance/memory. PSS-20 creates a QA evidence record, audits every table row and fixes integration defects. Build success is insufficient. A representative second-browser smoke check is useful compatibility evidence, recorded as a limitation if unavailable; required primary-browser S1–S9 are never waived.

After each task update PROGRESS.md with status, files/areas, decisions, exact commands/results and browser evidence. Complete requires every acceptance item. In progress includes implemented-but-unverified work. Blocked names a concrete prerequisite/capability and recovery action. Initially every implementation task is Not started.

If implementation reveals a better scoped design, inspect dependencies, document the reason and reconcile ARCHITECTURE.md plus affected future prompts while preserving every requirement. Do not force hypothetical filenames or duplicate state/render paths. Do not mark later tasks complete merely because adjacent code was touched.

PSS-09 integration note: final/original/compare now use `scene/previewPresentation.ts` and `viewTransform.ts` under the same runtime/scheduler. `NativeCapture.getBeforeFrame(revision)` owns continuous native bytes independently of `getFrame(revision)`; PSS-10 and later styling must preserve that stage and modify final only. `getCamera()` retains the fitted capture camera for light-handle mapping. Presentation has no capture/style work. Wheel is preview zoom; manual middle-drag/numeric camera controls provide camera dolly/zoom. The earlier beauty presentation is replaced by the required aligned native reference; optional larger beauty rendering is not a dependency of later tasks.

PSS-10 integration note: `domain/shading.ts` supplies normalized linear-luminance signal, ordered half-integer ramp coordinates, exact-byte ramp selection and explicit linear-RGB generation. `ShadingInspector` and store actions stage level changes, preserve retained colors/boundaries, and expose independent normal treatment for cel/bands. `NativeCapture` applies styling only after copying continuous Original, with one derivative/interpolated-normal shader and no geometry rebuild on modes. PSS-11 extends these owners with entry editing/presets/nearest-color matching; preserve the formula, exact byte writes and current reference/capture reuse contract.


PSS-11 integration note: `domain/shading.ts` now caches decoded entries and original bytes with `preparePalette`, selects squared-linear-RGB nearest colors through `nearestColorIndex` (stable first-index ties), and explicitly resamples ordered ramps. `PaletteInspector`/store provide exact edits/presets/atomic palette interchange and active explicit/strict background policy. Ordinary PSS-10 Apply levels remains retain/append behavior. Later dithering must perturb continuous input before the existing mapper, never final bytes; later effects must honor `palette.effectPolicy` before writing. No dither, outline, ground or PNG algorithm landed with PSS-11.


PSS-12 integration note: `domain/orderedDither.ts` supplies Bayer midpoint thresholds and prepared ramp/palette quantizers, integrated before selection in `pixels/nativeFrame.ts`. Ramp width follows the specified shade-interval formula. Palette amplitude is the minimum positive distinct linear-RGB distance / √3; duplicates are ignored for spacing, one/duplicate-only palettes have zero amplitude, and nearest-mode width is inactive. Existing version-1 dither fields and style-only invalidation are unchanged. `DitherInspector` exposes implemented algorithms only. PSS-13 should extend this dispatch/threshold source with actual blue noise and sequential diffusion, preserving exact disabled paths, native top-left mask/region handling, palette bytes, Original and capture reuse. See ARCHITECTURE.md's implemented ordered contract and PSS-12's CPU/browser evidence; no requirement or next-task scope changed.


PSS-13 integration note: blue noise now uses the fixed raw-decoded CC0 64×64 tile in `assets/blue-noise`, documented with source/hash/spectrum evidence. `domain/errorDiffusion.ts` supplies true scan-owned scalar ramp-coordinate and linear-RGB nearest quantizers with two reusable float rows and category/border weight drops. `pixels/nativeFrame.ts` dispatches zero strength to None before selecting an algorithm; all six choices are connected. Later effects must preserve subject-only matching, continuous Original, exact stored bytes and existing guarded publication. Receiver processing must use separate eligible category labels; background and outlines never propagate or receive subject error. No worker or architecture substitution was required. See the implemented PSS-13 contract and completion record; next task remains PSS-14 only after PSS-13 is verified Complete.


PSS-14 integration note: `pixels/silhouetteOutline.ts` derives a square/Chebyshev ring exclusively from original category 255, using separate horizontal/ring byte buffers. `NativeCapture` composites exact resolved effect bytes after quantization, caches styled/Original pixels and reuses ring geometry by capture/thickness. `NativeFrame.outline` and transient revision-keyed `nativeOutline` report subject-plus-effect extents, visible bounds, ring count and clipping independently of subject framing. `OutlineInspector` connects validated thickness/color, explicit/strict policy disclosure and isolated reset; comparison keeps Original unoutlined. The conservative store revisions and one scheduler remain intact. PSS-15 must place receiver pixels beneath the outline and keep category 128/shadows out of subject fitting, ring generation and subject error diffusion. PSS-17 still owns decoded S5/S6 PNG proof. See the implemented architecture and PSS-14 evidence; no later task was executed.


PSS-15 integration note: `scene/directionalShadows.ts` derives native visibility/depth from installed Three `ShaderLib.shadow` and reuses the existing directional light, renderer and native target. `scene/groundReceiver.ts` owns finite layer-2 geometry and conservative effect bounds including soft radius; `pixels/shadowVisibility.ts` performs category/normal/depth/connected-sample filtering before the unchanged lighting/quantization path. Receiver colors use exact explicit/strict bytes and deterministic binary coverage; subject-only fitting/outline masks and FS regions remain separate. `GroundShadowInspector` exposes all validated fields plus optional backward-compatible 0–2-texel bias. NativeCapture caches combined normals and visibility through existing revisions and disposes the retained single map. Mesh-edge preview remains SVG-only so it cannot turn caster depth into wireframe. See the PSS-15 architecture/progress evidence. This replaces the proposed Lambert-derived visibility material with Three's purpose-built shadow shader library; requirements and task scope are unchanged. PSS-16 is next only after PSS-15 is verified Complete; no later task was executed here.


PSS-16 integration note: installed GLTFLoader consumes a preflighted geometry-only document with LoadingManager remapping selected local buffers. Imported images are validated/hashed but never decoded because appearance is studio-derived. Initial bounds are 25 MiB selected/decoded buffers, 64 files, 250,000 vertices/triangles, 2,048 nodes/expanded mesh parts, depth 64 and 4,096 accessors/views. Dense static triangles are supported; required compression, skins, morphs, animations, sparse accessors and non-triangle modes fail explicitly. Ref-counted runtime assets remain separate from the existing serializable descriptor; parent normalization and the native fitter/effects renderer are shared. PSS-18 must request file reselect when restoring a descriptor without its runtime asset. See PSS-16 architecture/progress for support boundaries and verification; this does not change later task requirements.

PSS-17 integration note: native PNG download now uses `ReferenceRuntime.exportPng`, the existing scheduler's pinned job, `NativeCapture.update` and `export/pngExport.ts`. Clicked validated settings/revisions and imported resources are retained; owned completed bytes encode on a clean W×H sRGB canvas while newer preview work resumes. Context loss invalidates the transaction. `scripts/verify-png-export.mjs` compares decoded completed downloads against the exact capture through the focused `export/verifyPng.ts` helper. This implements the existing scheduling/export proposal without a second renderer or new dependency. PSS-18 must preserve this ownership path when applying restored settings; persistence itself remains unimplemented.


PSS-18 integration note: current scene and named presets now persist through `persistence/localPersistence.ts` and the existing scene validator/atomic restore; both schemas are version 1 only. Autosave is bounded (400 ms / 2 s), unreadable data is protected until explicitly backed up and replaced, and failed storage keeps in-memory editing/export available. Missing imported descriptors require matching file/bundle reselect or explicit geometry-only sphere fallback. The existing PSS-17 pinned export owner is unchanged. Future work must preserve these lifecycle/reset boundaries; PSS-19 remains a separate task.


PSS-19 integration note: measured main-thread shadow filtering now caches shared kernel surface checks without changing results. NativeCapture caches GPU visibility independently of shadow appearance/radius and reports only current-update timings. Preview checkerboards are separate cached 2D backdrops; five owned canvases still use one WebGL renderer/context. Runtime layout-effect cleanup fixes the measured OrbitControls document-listener leak under React detachment. Existing demand scheduling, revisions, pinned export and explicit Retry remain authoritative; no worker was justified/added. PSS-20 must preserve these boundaries and perform its separate final audit; PSS-19 evidence does not mark PSS-20 complete.

PSS-20 verification note: the final integrated audit is recorded in [evidence/PSS-20.md](evidence/PSS-20.md), with all 54 mandatory rows, S1–S9, 90 actual browser-decoded PNGs (56 independently decoded), production controls, performance/lifetime observations and explicit second-browser limitation. No specification, algorithm, schema, task requirement or architecture owner was changed. All twenty tasks are verified Complete; no next prompt is scheduled or authorized automatically.
