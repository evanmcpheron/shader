# Pixel Shading Studio — Persistent Progress

## Planning activity

Planning completed on 2026-10-23: existing project inspected; specification, architecture, dependency-ordered roadmap and 20 standalone prompts generated. This documentation activity is distinct from implementation completion. No implementation prompt has been executed by this planning session.

Read SPECIFICATION.md and ARCHITECTURE.md before implementing. Execute one prompt at a time, in order, with the current repository as the source of truth.

## GitHub repository and Pages — 2026-10-24

- **Status:** Complete. Created the public repository [evanmcpheron/shader](https://github.com/evanmcpheron/shader), initialized the local `main` branch, added its SSH `origin`, and deployed [the live application](https://evanmcpheron.github.io/shader/).
- **Authorization and decisions:** The owner's explicit request to create `shader` and deploy it to GitHub Pages supersedes the earlier no-publishing restriction for the static application. Public repository visibility supports public Pages hosting. Browser-selected models/artwork, browser storage, and personal exports are not collected or uploaded; existing generated QA evidence and original synthetic test fixtures accompany the source. Logs, dependencies, build output, local environment files, and credentials are excluded. A credential-pattern scan of publishable files found no matches.
- **Implementation:** `.github/workflows/deploy.yml` installs the lockfile on Node 24, runs lint and all tests, builds with `--base=/shader/`, and uploads only `dist/` to the Pages deployment job. Pushes to `main` and manual dispatch trigger deployment. Local development/build defaults retain `/`. No runtime service, remote asset dependency, or application feature changed. README documents the hosted URL, local reproduction, and independent localhost/hosted browser storage.
- **Local verification:** `npm run lint`, all **470 tests in 29 files**, and `npm run build -- --base=/shader/` pass. The existing Three bundle-size advisory remains non-blocking. A preview bound to `127.0.0.1:4173` passed **15 real Chrome checks** at `/shader/`: resolved asset paths, no development diagnostics, exact 64×64 four-color sphere/812 opaque pixels, comparison and preset controls, native PNG download with every decoded RGBA byte matching the canvas, browser-local autosave after a scene change, reload, layout, and no external service requests or JavaScript/HTTP/console errors. Autosave intentionally begins after settings change, not from an untouched default scene. Evidence: [checks](evidence/github-pages-local.json), [screenshot](evidence/github-pages-local.png).
- **Hosted verification:** Pages is configured for workflow publishing with HTTPS enforced. [The initial deployment](https://github.com/evanmcpheron/shader/actions/runs/40101973518) passed dependency installation, lint, all 470 tests, production build, artifact upload, and deployment. Public HTML, JavaScript, CSS, and favicon match the locally verified production bytes. All **15 real Chrome checks** also pass at `https://evanmcpheron.github.io/shader/`, including exact rendering, controls, downloaded PNG bytes, browser-local autosave/reload, and zero page/HTTP/console errors or external service requests. Evidence: [live checks](evidence/github-pages-live.json), [live screenshot](evidence/github-pages-live.png). The initial smoke harness incorrectly expected an untouched default scene to autosave; it was corrected to make a real settings change. A standalone Python HTTP check encountered its local missing CA trust setup; the asset comparison was repeated successfully using normal TLS-verified curl. Neither recovery changed the application or weakened TLS verification.

## Current implementation state

- npm React + TypeScript Vite application with a full-window dark studio shell at `/`; unused Vite/React/hero starter assets have been removed (PSS-19).
- React 19.3.1; Vite locked 8.3.5; TypeScript 6.0.3; ESLint 10.13.0. Strict mode is enabled in both TypeScript projects; unused checks and ESM are preserved.
- PSS-02 provides a version-1 serializable scene model, canonical defaults, limits, validation and a Zustand store with isolated resets/revisions. PSS-04 reuses it for primitive/transform editors and transient reference status/wireframe presentation. Settings JSON still contains no graphics resources. PSS-07 adds native continuous pixel lighting, PSS-08 adds independent measured subject framing and PSS-09 adds synchronized native comparison/navigation, PSS-10 adds smooth/flat normals, exact cel/bands and signal/ramp controls, and PSS-11 adds exact palette editing/interchange/nearest-color mapping, and PSS-12 adds native-grid Bayer dithering and PSS-13 completes fixed blue noise and sequential error diffusion, and PSS-14 adds exact native silhouette outlines; PSS-15 adds directional shadows and a controlled receiver; PSS-16 adds bounded static local GLB/glTF import through that same pipeline. PSS-17 adds authoritative native PNG export; PSS-18 adds complete local presets/current autosave, protected recovery and matching imported-file reselect.
- Dedicated `typecheck` (`tsc -b --noEmit`), `test` (`vitest run`) and `test:watch` (`vitest --watch`) scripts remain available. Typecheck, lint, **470 tests across twenty-nine files** and build pass. Real Chrome WebGL2 rendering, resource/lifecycle checks and screenshots supplement Node/jsdom tests. Build emits a documented non-blocking 500 kB chunk-size advisory for the local Three bundle.
- Implementation began without Git. The explicit GitHub repository and Pages request on 2026-10-24 authorizes initializing Git and publishing the static app; see the deployment entry below.
- PSS-01 is complete: compatible exact dependency additions, strict tooling, shared Vite/Vitest configuration and one focused interaction test are verified. Every pre-existing source/asset and locked package version is preserved. Added runtime packages: Three 0.186.1 and Zustand 5.0.16; test/type packages and Node constraints are documented in README and the completion record. Verification regenerated normal `dist/` and TypeScript cache artifacts.
- PSS-02 is complete: domain and state behavior is covered by pure Node tests. Its completion record retains historical starter-test evidence; the shell now replaces that starter.
- PSS-03 is complete: toolbar, independent/compact inspectors, read-only stored-settings summaries, truthful no-renderer workspace, tool selection, isolated resets and status/help disclosures. Required desktop/narrow layouts, keyboard behavior, independent scrolling and focus recovery are verified in Chrome; no dependency/configuration change was necessary. See the completion record and screenshots below.
- PSS-04 is complete: one owned WebGL2 renderer draws all seven lit primitives, with validated geometry/transform editors, independent resets, explicit resource disposal and usable failure/retry. PSS-05 extends its camera owner and replaces temporary reference-only fitting with explicit camera reframing. Historical PSS-04 evidence remains below.
- PSS-05 is complete: independent OrbitControls orbit/pan/zoom/dolly, exact axial/isometric views, explicit roll, coherent orthographic/perspective switching/FOV and numeric camera controls/reset. One unrolled settings source derives rolled render cameras without fitting feedback. All five acceptance criteria have automated and real-Chrome evidence below; no dependencies/configuration changed.
- PSS-06 is complete: validated directional position/target/color/intensity and ambient color/intensity controls, five lighting-only presets/reset, shared linear Lambert math and a reference-only arcball direction handle. Numeric/drag synchronization, rolled perspective mapping, native Escape cancellation/camera recovery, helper exclusion, geometry reuse and lifecycle/idle checks have evidence below. Existing settings schema/revisions, package scripts, dependencies and configuration are preserved.

- PSS-07 is complete: direct native normal/category capture, synchronous top-left readback, shared continuous linear Lambert processing, canonical sRGB RGBA publication, validated canvas/background controls and nearest native canvas/reference switching. One renderer/scheduler/Retry owner is retained.
- PSS-08 is complete: independent subject box/canvas, nine alignments, offsets/padding, native vertex-based uniform projection fitting with finite category-mask calibration, requested/effective/measured bounds, manual mode and camera pan/zoom lock. All six acceptance criteria have automated and real Chrome evidence below.
- PSS-09 is complete: cached native original/final/compare, precise view-only navigation and overlays, fitted-camera light mapping and explicit gesture ownership. All five acceptance criteria have automated, actual Chrome WebGL/pointer, native browser-zoom and screenshot pixel evidence below. PSS-10 and subsequent completed styling tasks extend it below.

- PSS-10 is complete: independent normal/tone modes, exact-byte cel/discrete shading, validated boundaries, explicit level application/ramp generation and pre-selection signal controls. All five acceptance criteria have automated and actual Chrome/GPU evidence below; Original remains continuous and view navigation skips processing.

- PSS-11 is complete: exact 1–32-color editing/presets/order, explicit linear resampling, atomic local palette data interchange and cached linear-sRGB nearest matching. All five acceptance criteria have automated and real Chrome text/native-frame evidence below; native browser file-selection/download gates were unavailable, documented separately.

- PSS-12 is complete: None/Bayer 2×2/4×4/8×8, pre-selection ramp/palette perturbation, connected validated controls, native mask/origin/scale, exact disabled paths and deterministic serialized settings. All five acceptance criteria have CPU and actual Chrome evidence below. PSS-13 extends this verified foundation below.

- PSS-13 is complete: all six required dither choices, fixed raw-decoded CC0 tile with hashes/spectrum, genuine scalar/RGB Floyd–Steinberg, exact disabled path, mask/background/reference isolation and bounded error rows. Typecheck/lint/357 tests/build, 52 Chrome frame pairs, 24 gradient frames and 521 saved-byte/reference checks pass. Its completion evidence is retained below; PSS-14 now extends this verified foundation.

- PSS-14 is complete: exact square/Chebyshev native rings, thickness 1–8, explicit/strict bytes, connected reset/comparison and revision-guarded effect/clipping metadata. Outline-only edits reuse captured normals, lighting/styled pixels and fitting. Typecheck/lint/373 tests/build and 455 independent saved-byte checks across 39 actual Chrome frame pairs pass. PSS-15 extends that verified foundation below.

- PSS-15 is complete: one fitted directional map, aligned native visibility/depth, independent visible/shadow-only/off receiver, guarded native softness and exact binary effect coverage. All five acceptance criteria have automated and real Chrome evidence: typecheck/lint/387 tests/build and 661 independent checks across 55 frame/pass sets. Resource reuse, bias/horizon behavior, strict palette/alpha, fitting/outline isolation, soft effect bounds and context recovery are verified below. PSS-16 and subsequent completed tasks extend it below.

- PSS-16 is complete: bounded local static GLB/glTF/companion import, isolated runtime ownership, atomic revision-aware loading/cancel/errors, parent normalization and the shared native renderer/fitter/styles/effects. All five acceptance criteria have automated and real Chrome evidence below. PSS-17 extends that verified foundation below.

- PSS-17 is complete: click-pinned validated revisions/resources, shared native capture/processor, owned RGBA, clean sRGB W×H PNG download, visible busy/retry/error handling and delayed URL cleanup. All five criteria pass: 429 tests, 238 real Chrome checks across 38 downloaded/decoded PNGs, plus 38 independent Pillow decodes. PSS-18 extends that verified foundation below.

- PSS-18 is complete: version-1 named presets/factories, bounded autosave before React mount, storage failure/recovery notices and matching imported-file reselect/fallback. All five criteria pass: 467 automated tests, 66 real Chrome checks, 9 downloaded PNG comparisons and 9 independent Pillow decodes. PSS-19 extends that verified foundation below.

- PSS-19 is complete: measured native stages, exact soft-shadow surface-check caching and visibility reuse, clear preset/palette status, cached preview checkerboards, pre-detachment runtime cleanup, 32-cycle listener/heap/GPU plateau and production preview are verified. No worker or dependency/configuration change. PSS-20 final integration audit is recorded below.

## Ordered implementation tasks

| Task | Title / prompt | Dependency | Status | Evidence |
| --- | --- | --- | --- | --- |
| PSS-01 | [Preserve the project and establish strict tooling](prompts/01-project-foundation.md) | None | Complete | Strict-engine/peer `npm ci`; typecheck/lint/real StrictMode counter test/build pass; fresh server starts; user confirms Chrome counter 0→1; initial agent browser screenshot retained |
| PSS-02 | [Define validated scene settings and state transitions](prompts/02-domain-state-and-defaults.md) | PSS-01 | Complete | Defaults/nondefault JSON round trips, boundaries, reset isolation, revision categories and atomic restore verified; typecheck/lint/test/build pass; dev-server HTTP smoke check |
| PSS-03 | [Build the accessible creative workspace shell](prompts/03-creative-workspace-shell.md) | PSS-02 | Complete | 138 tests/typecheck/lint/build pass; Chrome 1440×900, 1024×768, 768×768 and 390×844 screenshots; keyboard panels/tools/resets/help, independent scrolling and focus recovery verified |
| PSS-04 | [Render primitives and independent object transforms](prompts/04-scene-primitives-and-transforms.md) | PSS-03 | Complete | 160 tests/typecheck/lint/build pass; Chrome renders seven shapes/all parameters/transforms; 70 replacements retain 1 geometry/0 textures/1 program/1 canvas; 135.7 s idle; StrictMode remounts and context/no-context/allocation retry verified |
| PSS-05 | [Implement camera orbit, roll and projection controls](prompts/05-camera-controls-and-presets.md) | PSS-04 | Complete | 175 tests/typecheck/lint/build pass; real Chrome orbit/object isolation, pan/zoom/dolly, 30° roll, both projections/FOV/all views/poles, isolated resets, 115.548 s idle, five StrictMode remounts and loss/retry verified |
| PSS-06 | [Implement controllable lighting and viewport light movement](prompts/06-lighting-controls-and-manipulation.md) | PSS-05 | Complete | 203 tests/typecheck/lint/build pass; Chrome cube face/color/ambient evidence, synchronized numeric/arcball controls, 45° roll/perspective/native Escape recovery, helper layer exclusion, no geometry rebuilds, five stable remounts, 88.967 s idle and no console warnings/errors |
| PSS-07 | [Capture native pixels and publish one authoritative frame](prompts/07-native-resolution-rendering.md) | PSS-06 | Complete | 228 tests/typecheck/lint/build pass; 42 real Chrome checks: nine native presets + 96×64 + 1/1024 boundaries, exact RGBA/canvas bytes, orientation/rolled light, binary alpha, resize/DPR hashes, cached capture, latest rapid revisions and target/context/StrictMode cleanup/retry |
| PSS-08 | [Implement independent canvas and subject pixel framing](prompts/08-independent-sprite-framing.md) | PSS-07 | Complete | 248 tests/typecheck/lint/build pass; 51 real Chrome records, exact 32×32 masks at 16..47/16..47 on 64×64 and 32..63/16..47 on 96×64, all nine odd/padded alignments, aspect/manual/cache/clipping/failure/Retry and resource/idle evidence |
| PSS-09 | [Add precise preview navigation and before/after views](prompts/09-preview-navigation-and-comparison.md) | PSS-08 | Complete | 259 tests/typecheck/lint/build pass; 46 real Chrome checks, 96×64 native SHA-256/32×32 bounds unchanged through 1×/2×/8×/fit/pan/grid/checkerboard/compare/resize/DPR; native Chrome 125% zoom hash; rolled-perspective light drags in both panels; exact screenshot blocks/grid; context/remount recovery |
| PSS-10 | [Implement flat, cel and discrete shading modes](prompts/10-geometry-driven-shading.md) | PSS-09 | Complete | Typecheck/lint/274 tests/build pass; 34 real Chrome checks + 8 GPU fixtures: exact ramp bytes, cube light/pose independence, smooth/flat sphere/cone, nested mirrored/nonuniform static meshes, thresholds/levels/signals, continuous Original/capture reuse, 32 mode switches, wheel/view isolation and context/remount recovery |
| PSS-11 | [Implement exact palettes, editable ramps and color quantization](prompts/11-palettes-and-color-quantization.md) | PSS-10 | Complete | Typecheck/lint/305 tests/build pass; 42 Chrome records, 26 actual native frames and 52 saved-byte assertions verify S1/presets/order/import rejection/signals/one-color/duplicates/resampling/effects/cache reuse; native file-picker/download tool gates unavailable (text/file component paths verified) |
| PSS-12 | [Implement native-grid Bayer dithering](prompts/12-ordered-bayer-dithering.md) | PSS-11 | Complete | Typecheck/lint/334 tests/build pass; exact Bayer/gradient/mask fixtures; 46 Chrome native-frame pairs and 475 saved-byte assertions verify all sizes/zero/repeat/membership/strength/width/scale, 8×/16× visuals, view/DPR 2→2.2→2.5 isolation, unchanged Original/alpha/background and one cached capture |
| PSS-13 | [Implement blue noise and Floyd–Steinberg diffusion](prompts/13-blue-noise-and-error-diffusion.md) | PSS-12 | Complete | Typecheck/lint/357 tests/build; pinned CC0 raw tile/histogram/DFT; hand-calculated scalar/RGB/weight/mask fixtures; 52 Chrome frame pairs + 24 gradients and 521 saved-byte assertions including four independent full-frame FS references; six controls and 256px stages verified |
| PSS-14 | [Implement native silhouette outlines and palette policy](prompts/14-pixel-aligned-outlines.md) | PSS-13 | Complete | Typecheck/lint/373 tests/build; exact radius 1/2/8, holes/diagonal/corner/category/compositing fixtures; 39 real Chrome frame pairs + 455 independent saved-byte checks, 16/64px multi-zoom screenshots, strict/custom/background/dither switches, unchanged subject/Original and cached capture/style/remount ownership |
| PSS-15 | [Add directional shadows and a controlled ground receiver](prompts/15-stylized-shadows-and-ground.md) | PSS-14 | Complete | Typecheck/lint/387 tests/build; 55 real Chrome native frame/pass sets + 661 independent checks; cube/cone/torus, self/ground/receiver modes, strength/radius/bias/horizon, strict bytes/binary alpha, unchanged 32×32 fit/outline, soft clipping bounds, warmed resources/toggles/sizes/remounts/context recovery |
| PSS-16 | [Import bounded local GLB and GLTF references](prompts/16-local-gltf-model-import.md) | PSS-15 | Complete | Typecheck/lint/417 tests/build pass; 74 real Chrome file-input/WebGL checks and 110 independent checks across 20 native frames; both formats, styles/effects, local-only errors, cancellation/stale completion, 12 resource-stable replacement cycles, remount/retry/reselect; descriptor-only JSON |
| PSS-17 | [Export the authoritative native frame as PNG](prompts/17-pixel-perfect-png-export.md) | PSS-16 | Complete | Typecheck/lint/429 tests/build pass; 238 real Chrome checks across 38 completed downloads, every decoded RGBA byte matches; 38 independent Pillow checks; S1/S5/S6/S8, all dither/backgrounds, imported geometry, pinned edit races, failure/retry/context invalidation and URL cleanup |
| PSS-18 | [Save presets and restore complete local configurations](prompts/18-presets-and-local-persistence.md) | PSS-17 | Complete | Typecheck/lint/467 tests/build pass; 66 real Chrome checks, 9 downloaded PNGs plus 9 independent decodes; complete schema-1 S7 settings/pixels, named/factory/reset controls, atomic autosave ordering, corrupt/future/quota/unavailable storage and matching import reselect/fallback |
| PSS-19 | [Polish usability and measure rendering performance](prompts/19-usability-performance-and-recovery.md) | PSS-18 | Complete | Typecheck/lint/470 tests/build; 74 profile checks across 48 gestures, 204 integrated Chrome checks/32 stable resource cycles, 4 production checks, 238 PNG regression checks/38 independent decodes; exact filter/cache behavior and listener-leak fix |
| PSS-20 | [Audit and verify the complete application](prompts/20-final-integration-quality-audit.md) | PSS-19 | Complete | [54 mandatory rows and S1–S9](evidence/PSS-20.md); typecheck/lint/470 tests/build; 126 production + 238 export + 66 preset + 74 import + 204 polish + 74 performance checks; 90 browser-decoded PNGs, 56 independent decodes; no acceptance blockers; unavailable Safari smoke recorded |

## Completed implementation work

PSS-01 — strict compatible tooling, exact npm dependency additions, real counter interaction coverage, clean installation and browser/manual starter verification.

PSS-02 — validated complete scene settings, canonical defaults, domain helpers, bounded state actions, independent resets, transient view state and dirty revisions.

PSS-03 — responsive accessible studio shell, connected tool selection and independent resets, reusable native controls, keyboard/focus behavior and truthful stored summaries.

PSS-04 — owned lit Three reference, all seven primitives and their parameter controls, independent XYZ object transforms, explicit reference reframe, bounded invalidation/lifecycle and failure/retry ownership. See the completion record below.

PSS-05 — independent manual camera, installed OrbitControls, derived roll, both projections/FOV, seven views, numeric pose/target/distance/zoom controls, camera-only reset and explicit reframe. See the completion record below.

PSS-06 — controllable directional/ambient lighting, shared linear Lambert contract, five isolated lighting presets/reset and a synchronized reference-only viewport direction handle with explicit gesture ownership/cancellation. See the completion record below.

PSS-07 — direct native normal/category capture, shared basic CPU lighting, canonical RGBA publication, canvas/background controls and nearest presentation through the existing runtime/retry owner. Subsequent verified fitting, presentation and shading increments are recorded below.

PSS-08 — vertex-derived native fitting, bounded category-mask calibration, independent canvas/subject controls, measured bounds, manual fallback and pan/zoom ownership, with automated and real-browser evidence below.

PSS-09 — synchronized native original/final presentation, one-time initial fit, numeric/integer/wheel zoom, image-only pan, precise pixel/grid/checkerboard overlays and fitted native-camera light mapping; verified below.

PSS-10 — geometry-driven smooth/flat/cel/discrete modes, exact ramp selection, validated thresholds, signal controls and explicit level/ramp actions, with continuous Original and capture/resource isolation; verified below.

PSS-11 — exact palette/ramp editor, named presets, linear nearest-color quantization and explicit resampling, atomic palette JSON/hex interchange, active effect policy and native-byte verification; recorded below.

PSS-12 — native-grid Bayer thresholds integrated before ramp/nearest selection, meaningful validated controls, exact disabled dispatch, mask/reference/cache isolation and deterministic CPU/browser evidence; recorded below.

PSS-13 — fixed blue-noise thresholds and real sequential scalar/RGB Floyd–Steinberg, all six connected modes, exact color/alpha/None paths, provenance/spectrum and measured browser/reference evidence; recorded below.

PSS-14 — native binary silhouette morphology and compositing, shared strict effect-color resolution, connected inspector/reset, independent effect bounds/clipping, cached Original/styled/ring ownership and real Chrome evidence; recorded below.

PSS-15 — fitted directional map and aligned native visibility/depth, independent receiver modes, direct-only shadow attenuation, guarded native softness, exact binary effect coverage, exposed bias/reset and conservative clipping metadata; verified below.

PSS-18 — complete browser-local scene presets/autosave, explicit protected recovery, atomic restore and matching missing-model reselect with geometry-only fallback; verified below.

## Known issues and limitations

- PSS-20 is Complete: no significant product acceptance defect was found in the integration audit. Every mandatory row and S1–S9 has current observed evidence in [evidence/PSS-20.md](evidence/PSS-20.md). Historical dated records below preserve earlier limitations and their later resolutions.
- Verified environment: Chrome 155.0.8059.86, macOS 27.0 (26A428), WebGL2 ANGLE Metal / Apple M2 Max. Safari is installed but computer-use access was denied; the second-engine smoke remains unrun, without a compatibility pass. The task explicitly permits this recorded limitation.
- Maximum-softness 256² callbacks measured median 48.95ms orbit / 44.05ms light, maximum 51.4/47.5ms; a whole-page task reached 72ms. Common/256 interactions and concurrent numeric typing pass; 1024² and maximum-complexity imports have no latency guarantee. No worker or algorithm/resolution substitution was made.
- Current production JS 1,053.27kB (291.13kB gzip), CSS 13.39kB (3.56kB gzip). Vite's >500kB advisory stays visible and non-blocking.
- PSS-19 resolved the comparison checkerboard and OrbitControls listener leak. PSS-20 confirms clean checkerboards, 400 stable listeners, five canvases, one runtime/target, warmed heap 18.533–18.814MiB and zero retained import resources over 32 cycles. Actual palette file selection and JSON download now pass in production, resolving the older PSS-11 plumbing gap.
- Static dense-triangle local GLB/glTF only, bounded by documented resource caps. Imported appearance is discarded; model bytes require matching reselect after reload. Schema1 only; unknown/corrupt data is preserved. No additional format, animation, modeling, full scene-file import or cloud persistence is claimed.
- GPU-vendor bitwise equality, worst-case physical allocation pressure, actual OS quota exhaustion and a full screen-reader audit are not claimed. Exact CPU fixtures, bounded fault injection, actual context loss and same-environment deterministic reload/export pass. Optional internal outlines/larger beauty view/workers remain deferred.

## Outstanding decisions / implementation checkpoints

PSS-01 compatibility, PSS-02 settings/state, PSS-03 shell and PSS-04 reference/lifecycle decisions are verified below. No product clarification or foundation recovery action remains. ARCHITECTURE.md documents the implemented camera/lighting/retry/native owners and PSS-08 derived-camera fitting, correction, placement and measurement rules.

| Checkpoint | Owner | Proposed resolution | State |
| --- | --- | --- | --- |
| Package/test/engine compatibility | PSS-01 | Preserve React/Vite/npm; select compatible Three/Zustand/Vitest/jsdom/RTL | Complete: exact versions and supported Node range in README; strict clean install and all checks pass |
| Native fit correction/tolerance | PSS-08 | 12 calibration samples + final capture, ±12.5% uniform scale/quarter-pixel phases, parity-aware initial phase; exact canonical masks and honest achieved bounds | Complete: CPU invariants and real Chrome evidence below |
| Shading signal and normal contract | PSS-10 | Unit-domain linear illumination luminance; centered contrast→brightness→clamp→exponent; one derivative-normal shader and exact-byte mapper | Complete: documented math, CPU/DOM tests and real GPU/static-transform evidence below |
| Blue-noise tile | PSS-13 | Fixed local 64×64 CC0 tile with provenance/hash | Complete: Peters Data/64_64/LDR_LLL1_0.png, raw decoded channel pinned and spectrum verified |
| Shadow capture | PSS-15 | Installed-version visibility/depth aligned to native normals; fitted bounded map and native filtering | Verified: 55 Chrome frame/pass sets, 661 saved-byte checks and 387 tests; see PSS-15 |
| Import caps | PSS-16 | 25 MiB selected/decoded buffers; 250k vertices/triangles; bounded nodes/parts/accessors/depth | Complete: selected limits, static support boundaries and real import/resource evidence below |
| Worker need | PSS-19 | Main thread unless real measurements justify focused processing worker | Complete: PSS-19 optimization retained exact algorithms; PSS-20 repeats all required sizes and records maximum-softness limits; no worker required |

## Next executable task

None. All twenty implementation tasks are verified Complete. Use the local application; a future compatibility check or scoped fix requires a new explicit task. Do not start the runner or additional work automatically.

## Completion record format

Append/update a record for each attempted task with:

- ID, date, status, implementation summary and affected files/areas.
- Important decisions and reconciled architecture/roadmap changes.
- Exact commands/results; browser environment/actions/evidence and evidence paths.
- Acceptance passed/failed/unrun, concrete issues and whether they block task/product acceptance.
- Next executable task or recovery action.

Statuses: Not started, In progress, Blocked, Complete. Complete requires every task acceptance criterion verified. Rendering needs behavioral/visual proof in addition to build. Do not mark incomplete/unverified work complete or silently weaken requirements.

## Planning verification record

- Baseline `npm run lint`: passed.
- Baseline `npm run build`: passed (TypeScript project build and Vite production bundle).
- The document audit is recorded in [PLANNING-AUDIT.md](PLANNING-AUDIT.md); it changes no implementation status.

## Initial PSS-01 attempt — 2026-10-23 (historical; resolved)

**Status at the time: Blocked.** The first tool session could edit locally and check installed tools, but could not install all required dependencies or launch a dev server. The following preserves those actual attempts; the final completion record supersedes its open items.

### Implemented and affected files

- `tsconfig.app.json`, `tsconfig.node.json`: enable `strict`, preserving no-emit, unused checks, module settings and existing useful comments. No application changes were necessary.
- `package.json`: add `typecheck: tsc -b --noEmit` and `engines.node: ^20.19.0 || ^22.13.0 || >=24.0.0`; preserve every original script/dependency.
- `package-lock.json`: synchronize root engine metadata using npm in offline lockfile-only mode. Lockfile v3 and all resolved package entries are unchanged.
- `README.md`: describe actual setup/commands, preserved exact versions, current Node constraints, direct-Three proposal and incomplete dependency/test setup.
- This progress record and `evidence/pss01-counter.png`: status and browser proof.

### Decisions and compatibility evidence

- Preserved npm 11.19.1, Node 24.22.1, React/react-dom 19.3.1, Vite 8.3.5, plugin-react 6.1.2, TypeScript 6.0.3, ESLint 10.13.0 and typescript-eslint 8.72.0. No upgrades, downgrades, new libraries, overrides or peer bypasses.
- Locked ESLint requires Node `^20.19.0 || ^22.13.0 || >=24`; Vite/plugin-react require `^20.19.0 || >=22.12.0`. The added root engine range reflects their intersection. typescript-eslint accepts ESLint 10 and TypeScript `>=4.8.4 <6.1.0`; installed versions satisfy these constraints. The final engine range must be reassessed when the remaining libraries are selected.
- Added versions: **none**. Three, type declarations, Zustand, Vitest, jsdom and React Testing Library remain uninstalled. Cache inventory contained some test tarballs, but no complete installable set; offline registry metadata requests also failed. No incomplete package declarations, runner configuration or unresolved test imports were added.
- No architecture change: direct Three with explicit resource lifetime and one native frame remains proposed. Node-default/scoped-jsdom testing remains required; it has not been configured.
- No Git repository exists. File preservation was checked against a temporary pre-task snapshot, without initializing Git. All `src/` hashes match; comparison of parsed lockfiles finds only the root package engine metadata changed. Temporary snapshot: `/private/tmp/pss01-before-u3z02br9` (not a durable project artifact).

### Baseline verification (before edits)

- `node --version`: `v24.22.1`; `npm --version`: `11.19.1`.
- `npm ls --depth=0`: passed, installed baseline versions reported without invalid peers.
- `npm run lint && npm run build`: passed, including TypeScript project build and Vite production output (20 transformed modules). Repeated before edits while inspecting tool output; both invocations passed.

### Environment/install attempts

- `npm view three dist-tags version engines types --json` began the initial sequential registry inspection but stalled and was interrupted before results. The initial default npm log directory was not writable.
- `npm view three version engines types --json --fetch-retries=0 --fetch-timeout=10000`: failed with `ENOTFOUND registry.npmjs.org`. No packages changed.
- Request to run `npm view three version engines types --json --fetch-retries=0 --fetch-timeout=10000 --cache=/private/tmp/pss01-npm-cache` outside the sandbox: rejected by the permission policy, which disallows sandbox escalation. No approval was granted; no alternative network route was used.
- `npm cache ls three zustand vitest jsdom @testing-library/react @testing-library/dom @types/three`: inspected the local cache; required graphics/state packages were absent. Read-only cache index inspection confirmed the limitation.
- `npm view three version engines types --json --offline --logs-dir=/private/tmp/pss01-npm-logs`: failed with `ENOTCACHED`.
- `npm view '<package>' version engines peerDependencies peerDependenciesMeta dependencies --json --offline --logs-dir=/private/tmp/pss01-npm-logs`, separately for `vitest@4.0.18`, `jsdom@26.1.0`, `@testing-library/react@16.3.2`, `@testing-library/dom@10.4.2`: all failed with `ENOTCACHED`. These were cache candidates, not selected or installed versions.
- `npm install --dry-run --offline --ignore-scripts --no-audit --no-fund --logs-dir=/private/tmp/pss01-npm-logs three@0.186.1`: failed with `ENOTCACHED`; the exact release was checked on the official registry via the web tool, but was not available locally. No installation or package mutation occurred.
- `npm install --package-lock-only --offline --ignore-scripts --no-audit --no-fund --logs-dir=/private/tmp/pss01-npm-logs`: passed (`up to date`); root engine metadata synchronized without changing resolved packages. No engine/peer warning occurred.

### Post-change verification

- `npm run typecheck && npm run lint && npm run build`: all passed. Typecheck ran `tsc -b --noEmit`; build ran `tsc -b && vite build` (20 modules; main JS 222.44 kB, gzip 69.28 kB). No engine, peer, compilation or lint warning was ignored.
- `npm ls --depth=0`: passed; same installed direct versions as baseline.
- `npm run dev -- --host 127.0.0.1`: failed with `listen EPERM: operation not permitted 127.0.0.1:5173`. No new dev server was started. The already running server was used for browser verification; its process was left intact.
- `npm run test`: **unrun**. Vitest and the test script do not exist yet; no unplanned npx runner was invoked. `npm ci` and `npm run preview` were not run.
- Real browser: Google Chrome **155.0.8059.86** on macOS, existing tab at `http://localhost:5173/`. Observed starter heading, logos, documentation links and `Count is 0`; clicked the accessible button and observed `Count is 1`; pressed Space on the focused button and observed `Count is 2`. Visible focus outline remained present. Captured browser warning/error log entries: none. Screenshot: [counter after pointer and keyboard activation](evidence/pss01-counter.png). This proves the starter interaction in a real browser, not successful fresh-server startup or automated test integration.

### Acceptance and recovery

| Criterion | Result and evidence |
| --- | --- |
| 1. Existing app starts and counter works | Partial: existing server and real Chrome counter verified; requested fresh-server startup denied by sandbox |
| 2. npm and justified dependency/lock changes | npm/lock preserved and no resolved versions changed; required additions remain blocked |
| 3. Strict projects and new commands | Both strict projects and exact typecheck command pass; required `test` command pending runner installation |
| 4. Real baseline interaction test | Open: browser interaction passed, but the required automated test is not implemented/run |
| 5. README/progress versions, engines, adjustments | Current versions/constraints/partial changes documented; exact added versions and full compatibility selection still pending |

Resume PSS-01 in a network-enabled environment that can start the dev server. Check peers/engines against the unchanged installed stack, install the requested packages with npm and lockfile consistency, add Node-default/scoped-jsdom tests, verify StrictMode render/click/increment/cleanup, document exact installed versions, then rerun typecheck/lint/test/build and the dev-server browser check. PSS-01 must stay incomplete until those checks pass; PSS-02 and every later task remain Not started.

### Retry after the user enabled YOLO mode

The user requested full completion and reported enabling YOLO mode during this active session. Retried `npm view three version engines types --json --fetch-retries=0 --fetch-timeout=10000 --cache=/private/tmp/pss01-npm-cache`: still failed with `ENOTFOUND`. Retried `npm run dev -- --host 127.0.0.1`: still failed with `listen EPERM`. A new request for the same registry query outside the sandbox was again rejected: the tool still reported `sandbox_approval: false` and refused escalation. The reported setting change did not remove the restrictions observed by these tool calls. No required test or dependency check was relabeled as passed. At that point PSS-01 remained Blocked; later permission changes and dependency installation resolved the blocker, as recorded below.

## PSS-01 completion record — 2026-10-23 (America/New_York)

**Status: Complete.** The npm starter is preserved, strict tooling and a real interaction test are implemented, and every PSS-01 acceptance criterion has evidence. PSS-02 remains Not started.

### Final implementation and affected areas

- `package.json` / `package-lock.json`: exact compatible runtime/test/type additions; original dev/build/lint/preview scripts retained; `typecheck: tsc -b --noEmit`, `test: vitest run`, `test:watch: vitest --watch`; supported Node engine `^22.22.2 || ^24.15.0 || >=26.0.0`.
- `tsconfig.app.json` / `tsconfig.node.json`: strict checking enabled with existing unused checks, ESM and no-emit behavior retained. No baseline source fix required.
- `vite.config.ts`: use Vitest's typed `defineConfig` to share the actual React/Vite transform and explicitly set the default test environment to Node. No separate renderer or feature scaffolding.
- `src/App.test.tsx`: opt into jsdom using the scoped file directive, render the actual App in StrictMode, find `Count is 0` by accessible role/name, click, and assert that the same button is now accessible as `Count is 1`. Explicit `afterEach(cleanup)` handles unmounting without global test hooks. No dummy tests or GPU mocks.
- `README.md`: setup, exact additions, engines/peer rationale, actual quality commands, scoped test environments and proposed direct-Three approach. `ARCHITECTURE.md` now explicitly labels its original repository table as the historical planning baseline and links to current progress/README. Product architecture and roadmap requirements are unchanged.
- `docs/pixel-shading-studio/PROGRESS.md` and the initial `evidence/pss01-counter.png`: implementation and verification record. Every pre-existing `src/` file/asset remains byte-identical; only the new interaction test was added. No Git repository was initialized.

### Dependency selection and installation

The agent checked exact versions against official registry metadata, verified them in an npm dry run, supplied the commands, and the user ran the actual pinned installations. The final installed tree and lockfile were re-inspected rather than assuming success.

| Added package | Exact version | Reason / compatibility |
| --- | --- | --- |
| `three` | 0.186.1 | Direct rendering API for later native-capture work; no runtime type declarations bundled |
| `zustand` | 5.0.16 | Small typed store for later tasks; React peer `>=18` accepts React 19.3.1 |
| `@types/three` | 0.186.0 | Declarations aligned to Three release 186 |
| `vitest` | 5.0.5 | Vite peer `^6.4.0 || ^7.0.0 || ^8.0.0` accepts locked Vite 8.3.5 |
| `jsdom` | 30.1.3 | UI-only DOM environment; Node engine `^22.22.2 || ^24.15.0 || >=26.0.0` determines the tighter project engine range |
| `@testing-library/react` | 16.3.3 | Peers accept React/react-dom 19 and their installed type declarations |
| `@testing-library/dom` | 10.4.2 | Explicit required `^10.0.0` React Testing Library peer |

No user-event dependency was installed: the single baseline interaction uses `fireEvent.click`. Zustand integrations and jsdom's canvas peer are optional and unused. No peer bypasses, overrides or baseline downgrades were introduced. Comparing the parsed final lockfile against the pre-task snapshot finds **zero pre-existing package version changes**, with 73 additional package entries. npm lockfile v3 remains authoritative and all root dependencies/devDependencies/engines match package.json.

Preserved core versions: React/react-dom 19.3.1, Vite 8.3.5, plugin-react 6.1.2, TypeScript 6.0.3, ESLint 10.13.0 and typescript-eslint 8.72.0. Runtime: Node 24.22.1, npm 11.19.1. Installed package engine checks found zero incompatibilities. The selected Node range also satisfies the preserved stack; Node 20 is no longer supported by the selected test packages.

### Exact installation and verification commands / results

- `npm view '<package>' version engines peerDependencies peerDependenciesMeta dependencies.vite dependencies --json --fetch-retries=0 --fetch-timeout=10000`: registry inspection passed for Three, types, Zustand, Vitest, jsdom and Testing Library packages (user-event was inspected but not selected).
- `npm install --dry-run --ignore-scripts --no-audit --no-fund three@0.186.1 zustand@5.0.16 @types/three@0.186.0 vitest@5.0.5 jsdom@30.1.3 @testing-library/react@16.3.3 @testing-library/dom@10.4.2`: passed before the user installed the pinned packages.
- User executed: `npm pkg set 'engines.node=^22.22.2 || ^24.15.0 || >=26.0.0'`; `npm install --save-exact three@0.186.1 zustand@5.0.16`; `npm install --save-dev --save-exact @types/three@0.186.0 vitest@5.0.5 jsdom@30.1.3 @testing-library/react@16.3.3 @testing-library/dom@10.4.2`. User reported completion; installed manifests/lockfile confirm the exact results. Their console output was not supplied.
- `npm ls --depth=0`: passed and reported every expected exact direct version. `npm ls --all --json > /private/tmp/pss01-dependency-tree.json`: passed, no invalid peer tree. Parsed lockfile checks found matching root metadata, no baseline version changes and zero installed Node-engine failures.
- `npm run lint && npm run build`: passed at resumption. Original pre-change lint/build results are recorded separately in the historical attempt above.
- `npm run typecheck && npm run lint && npm run test && npm run build`: passed after test wiring. Vitest 5.0.5 ran **1 file / 1 real counter interaction test**; Vite built 20 modules.
- `npm ci --engine-strict --strict-peer-deps --no-audit --no-fund`: passed, installing 234 packages from the lockfile. No engine/peer warning. npm emitted one install-script inventory notice for optional macOS `fsevents@2.3.3`; reviewed with `npm install-scripts ls --json`, `npm ls fsevents`, its installed manifest/files and `npm install-scripts deny fsevents --dry-run --json` (dry run only; no policy change). The package includes its native binary and has no install lifecycle script in the installed manifest. No script approval was needed; subsequent dev/test/watch checks worked. This notice is recorded rather than ignored.
- After that clean installation, `npm run typecheck && npm run lint && npm run test && npm run build`: all passed again. Vitest: 1 file, 1 test, 1.27 s. Vite: 20 modules; main JS 222.44 kB / gzip 69.28 kB, unchanged from baseline. No lint, type, runtime-test or build warning.
- Watch adjustment: the initial `test:watch: vitest` smoke invocation exited after its passing test in this execution environment, so the script was made explicit as `vitest --watch`. `npm run test:watch` then passed 1 file / 1 test and displayed `PASS Waiting for file changes...`; exited normally with `q`. No new dependency was needed.
- `npm run dev -- --host 127.0.0.1`: successfully started Vite 8.3.5 in 135 ms at `http://127.0.0.1:5173/`. The fresh process was kept available for the user's final browser check.

### Real-browser and manual evidence

- Initial agent verification: Google Chrome 155.0.8059.86 on macOS at the existing `http://localhost:5173/` server. Pointer activation changed 0→1; Space changed 1→2 with a visible focus outline. Captured warning/error entries were empty. Screenshot: [initial counter check](evidence/pss01-counter.png). All original product source/assets remain unchanged since that observation.
- Final agent browser access to the freshly started `http://127.0.0.1:5173/` server was denied by the browser origin gate. After the user explicitly allowed the check, a retry was still denied by a saved permission setting. The agent did not bypass that policy or claim a new automated browser observation.
- Final manual check: the user was asked to open the exact fresh-server URL in Chrome, click `Count is 0` and verify `Count is 1`. The user explicitly replied **“Counter changes from 0 to 1”**. This supplies the final post-install live-browser behavior evidence. No final screenshot or console inspection was supplied by the user; neither is claimed.

### Acceptance results and remaining scope

| Criterion | Verified evidence |
| --- | --- |
| 1. Existing app starts and counter works | Fresh Vite startup succeeded; user confirmed final Chrome counter 0→1; initial agent browser pointer/keyboard screenshot also retained |
| 2. npm preserved; justified additions/lock changes | Exact requested additions only; strict clean npm install passed; original locked versions unchanged; root lock metadata matches package.json |
| 3. Both strict projects and exact scripts | `strict: true` in app/node projects; exact typecheck/test commands passed; original scripts retained; explicit watch mode verified |
| 4. Real baseline interaction test | Actual App, accessible counter, click/increment assertion, StrictMode and explicit cleanup; 1 test passed after clean install |
| 5. README/progress versions, scripts, engines and rationale | Exact versions, Node range, Vite/React peer compatibility, scoped environments and direct-Three plan documented |

No PSS-01 acceptance blocker remains. Agent automation for the final origin is still unavailable, but the user supplied the required manual browser observation. No product rendering, store or studio controls were implemented; those remain future roadmap work. Production preview was not run because PSS-01 required dev-server verification and production build, both covered. Next executable task: PSS-02, only on a new user request.

## PSS-02 completion record — 2026-10-23 (America/New_York)

**Status: Complete.** All five domain/state acceptance criteria are verified by automated tests. The existing starter still works; PSS-03 remains Not started. No browser rendering claim is made by this domain-only task.

### Implementation and affected files

- `src/domain/settings.ts`: readonly, version-1 JSON contract for primitive/import descriptors, transforms, orthographic/perspective camera, lights, canvas/fit, normal/tone treatment, palette, all dither modes, outline, independent receiver, shadows and background. Mode-specific settings are discriminated unions; there are no runtime-resource fields or separate export dimensions.
- `src/domain/defaults.ts`: independent default factories for all seven primitives and transforms, canonical orthographic smooth-normal blue sphere, all five specified opaque-sRGB palette presets, nine canvas presets and uniform threshold helpers. Defaults select discrete bands with smooth normals, ready for the later four-color renderer; exact raster coverage remains PSS-08.
- `src/domain/constraints.ts`, `src/domain/validation.ts`: declared inclusive limits, exact field/mode guards, finite-number and opaque-color checks, detached normalized settings, reusable number/color/light-direction helpers and effective-fit-box reporting. Invalid data returns a deterministic field path. Oversized requested fit boxes are retained with an explicit notice; impossible padding is rejected.
- `src/app/studioStore.ts`: small vanilla Zustand factory and shared instance; validated section/numeric edits, geometry selection, palette changes, transform/section/full/preview resets and one-commit complete restore. Readonly public API omits direct `setState`. Unchanged section references are preserved. Preview/tool/status state and settings/capture/style/shadow/view counters live outside settings.
- `src/domain/settings.test.ts`, `src/app/studioStore.test.ts`: meaningful pure Node coverage of JSON/configuration invariants, every built-in shape and dither variant, numeric/color/geometry boundaries, minimal/rectangular/maximum canvases, palette cardinality, reset/selection isolation, revision dependencies, atomic restore, detached inputs and invalid/no-op transactions.
- `README.md`, `ARCHITECTURE.md`, this progress record: actual implemented modules, schema/units/limits/reset/revision semantics, verification and next task. Existing application source/CSS/assets, baseline interaction test, dependency manifests, lockfile and configuration were not edited. Build regenerated the normal `dist/` and TypeScript cache outputs. The directory still has no Git repository; no Git diff/commit is claimed.

### Decisions and integration boundaries

- Used the installed Zustand 5.0.16 vanilla API, with a shared store consumable by React's `useStore` in PSS-03 and isolated factories for tests. No new dependency, package/configuration change, renderer, UI panel, persistence write, schema migration, export or undo system was needed.
- Schema 1 requires every modeled field, rejects unknown fields/versions and preserves original palette order/duplicates. Normalization only canonicalizes hex/hash casing and negative zero. Imported settings store a filename/format/SHA-256 descriptor, never file bytes or resource URLs.
- Numeric actions reject values outside declared bounds rather than silently truncating. Signed scale has a minimum nonzero magnitude. Camera/light endpoints cannot coincide. Surface-to-light direction is derived from source minus target, never persisted twice. Units and all chosen world/camera/signal limits are documented in architecture.
- Palette colors are the single ordered ramp/nearest-color list. An explicit palette-count change or palette reset rebuilds the active ramp's thresholds atomically; same-size edits preserve custom thresholds. Shading reset derives its threshold count from the retained palette. Section resets otherwise remain isolated and reject cross-section violations; full-scene reset preserves transient preview/status state.
- Each changed settings commit increments settings/style once, then capture/shadow only for documented dependencies. Preview/tool changes increment view alone; status increments no pixel revision. Initial counters are zero; a later runtime must schedule an initial capture on mounting. Palette and preview edits never force geometry capture. No-op and invalid edits publish no transition.

### Exact verification commands and results

Environment: macOS, zsh, Node **v24.22.1**, npm **11.19.1**. Applicable supplied comment instructions, repository documentation, configuration, package/lockfile and actual PSS-01 starter/test implementation were inspected first. No on-disk applicable AGENTS.md was found. PSS-01 completion evidence was checked against the actual tooling.

- `node --version`, `npm --version`: reported the versions above.
- Before implementation, `npm run typecheck && npm run lint && npm run test`: passed; **1 file / 1** actual StrictMode counter interaction test.
- Initial `npm run typecheck`: failed on an overly narrow inferred bounds-parameter type in the new vector validator; corrected to explicit `NumericBounds`. Subsequent early `npm run typecheck && npm run test` and `npm run typecheck && npm run test && npm run lint` attempts stopped at new test-table tuple typing errors; corrected the table's tuple annotations. These were implementation-time compilation failures, not waived checks.
- `npm run typecheck && npm run test && npm run lint`: passed with **3 files / 122 tests** after those corrections.
- `npm run typecheck && npm run lint && npm run test && npm run build`: passed with **3 files / 133 tests** after adding geometry/camera/import boundary coverage.
- Final `npm run typecheck && npm run lint && npm run test && npm run build`: **all passed**, after additionally handling missing/invalid preview pan without partial updates. Vitest 5.0.5: **3 files / 134 tests**, 1.10 s; 133 pure domain/store tests plus the preserved jsdom interaction. Build: `tsc -b && vite build`, Vite 8.3.5, 20 modules, 93 ms; main JS 222.44 kB / gzip 69.28 kB. No type, lint, test or build warning remained.
- `npm run dev -- --host 127.0.0.1`: passed, Vite ready in 91 ms at **http://127.0.0.1:5174/** because 5173 was already occupied. `curl --fail --silent --show-error http://127.0.0.1:5174/`: passed and returned the expected Vite HTML, root mount and `/src/main.tsx` entry. Stopped only this session's server with Ctrl-C after the check (expected exit 130); the pre-existing server was left running.
- Browser/manual rendering checks: **not run**, and not required for PSS-02's domain-only acceptance. The HTTP check proves startup/serving, not browser execution or pixels; the actual starter click/increment behavior is verified in jsdom/StrictMode by the preserved test. Prior PSS-01 browser evidence remains historical. No canvas/WebGL mocks or visual-output claims were used. `npm run preview`, storage round-trip, GPU fitting and PNG checks were not run because they belong to later tasks.

### Acceptance evidence

| PSS-02 criterion | Verified result |
| --- | --- |
| 1. Complete valid defaults | Canonical settings validate, preserve all required fields, and every primitive/palette default passes pure tests |
| 2. Lossless settings JSON | Default and fully configured nondefault scenes round-trip exactly; all dither modes/projections/effect variants are covered; settings exclude preview/status/revisions/actions/resources and duplicate export dimensions |
| 3. Actions, resets and dirty categories | Camera/object/light/palette/geometry/preview/reset isolation, palette-count/threshold consistency, unchanged references, capture/style/shadow dependency table and view-only actions pass |
| 4. Deterministic invalid/boundary handling | Minimum 1×1, both rectangular orientations, 1024 axes, NaN/infinity, invalid colors/threshold order, signed/zero scales, zero light direction, geometry bounds and impossible padding have explicit passing cases |
| 5. Atomic restore and independent preview | Subscription observes exactly one coherent restored settings/revision transition; invalid/equivalent input emits none; preview zoom/pan/tool changes retain settings dimensions and all capture/style/shadow counters |

No PSS-02 acceptance blocker remains. The schema models future feature configuration; it does not claim those feature algorithms or UI are implemented. Exact native 32×32 coverage, mode rendering, fitting/notice UI, storage/reselect behavior and export remain assigned to their roadmap tasks. Next executable task: **PSS-03**, only on user request.

## PSS-03 completion record — 2026-10-23 (America/New_York)

**Status: Complete.** All five task acceptance criteria have automated and/or real-browser evidence. PSS-04 remains Not started.

### Implementation and affected files

- Shell and responsive styling: `src/App.tsx`, `src/App.css`, `src/index.css`. Full-window toolbar, scene inspector, central no-renderer state, pixel inspector and status/help area; compact neutral tokens, readable labels, visible focus, skip link and independent scrolling. Summaries subscribe to the existing settings store and are explicitly read-only stored values.
- Controls and focus: new `src/components/controls.tsx`, `src/components/Inspector.tsx`, `src/app/useCompactLayout.ts`. Reusable native disclosure/toggle/select controls, stable select label/description IDs, one compact inspector at a time, Escape/close/breakpoint focus recovery and cleaned-up media-query subscriptions.
- Product identity: `index.html`, `public/favicon.svg` replace the template title/icon with the studio title, description, theme color and small pixel mark. Unused template source assets were preserved.
- Behavior coverage: `src/App.test.tsx` replaces the single counter test with five connected StrictMode tests using fresh stores and scoped media-query stubs. Existing domain/store tests are unchanged.
- Documentation and evidence: `README.md`, `ARCHITECTURE.md`, this progress record, and five screenshots in `evidence/pss03-*.png`. Build regenerated normal `dist/` and TypeScript cache artifacts. No Git repository exists; no diff/commit is claimed.

### Decisions and scope

The existing npm project, package/lockfile, strict configuration and domain/store contract are unchanged. No dependency or framework was added. The shell stays at `/`; the pre-existing `http://localhost:5173/` tab updated through Vite HMR and was verified directly.

Panel visibility is local UI state. At up to 880 CSS pixels both panels initially close and share one active-panel choice; desktop toggles remain independent. Closed panels stay mounted and hidden so section state is retained, with focus returned to their toolbar opener whenever closing hides a focused descendant. Help uses a native disclosure and remains reachable independently of inspector visibility. Both sidebar content regions use independent vertical scrolling; the workspace and status region handle their own constrained overflow.

Tool selection updates only the existing validated `preview.tool` and view revision. The UI reports that viewport gestures are unavailable. Reset scene uses canonical domain defaults and retains the view; reset view restores preview/tool defaults and retains the scene. Read-only scene/output summaries and palette swatches do not claim rendered results. No fake canvas, geometry/effect sliders, presets or export were added. Number/range/color editors are deferred under the prompt's “only as used” rule because there is no working rendering feature for them yet; future feature tasks retain finite validation, local invalid drafts and accessible error requirements. No architecture requirement or roadmap task boundary changed.

### Exact command verification

Environment: macOS, zsh, Node **v24.22.1**, npm **11.19.1**. Applicable supplied instructions, docs, package/lockfile/configuration and the actual PSS-02 implementation were inspected before editing; no applicable on-disk AGENTS.md was found.

- `node --version`, `npm --version`: versions above.
- `git status --short`: expected failure, `fatal: not a git repository`; Git was not initialized.
- Baseline `npm run typecheck && npm run lint && npm run test`: passed, **3 files / 134 tests**.
- Early `npm run typecheck && npm run lint`: passed after shell implementation.
- `npm run test`: passed after replacing the starter test, **3 files / 138 tests**.
- First full `npm run typecheck && npm run lint && npm run test && npm run build`: stopped at typecheck because three new Testing Library role queries used Playwright's unsupported `exact` option. Removed those options (Testing Library name strings already match exactly); no failure was suppressed.
- Final `npm run typecheck && npm run lint && npm run test && npm run build`: **all passed**. Vitest **5.0.5**, **3 files / 138 tests**, **1.32 s**; Vite **8.3.5**, **28 modules**, production build **99 ms**, JS **248.26 kB / 77.62 kB gzip**, CSS **7.57 kB / 2.28 kB gzip**. No remaining type/lint/test/build warning.
- `npm run dev -- --host 127.0.0.1`: Vite ready in **213 ms**, selected **http://127.0.0.1:5174/** because 5173 was occupied. This fresh server supplied the browser layout checks. Stopped only this session's server after verification; the existing localhost:5173 server was preserved.
- `/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' '/Applications/Google Chrome.app/Contents/Info.plist'`: **155.0.8059.86**.
- No install, dependency update, production-preview run, renderer/WebGL/PNG test or future-task implementation was performed.

### Real-browser observations and evidence

Google Chrome **155.0.8059.86** on macOS with explicit CSS viewport overrides for responsive checks. Browser controls read rendered DOM/AX state, computed layout and screenshots; no jsdom layout assertion, canvas mock or hidden-state mutation was used. Temporary viewport overrides were reset afterward.

| Viewport | Observed result | Evidence |
| --- | --- | --- |
| 1440×900 | Full hierarchy, both panels open, 900px central workspace; document scroll width 1440; no horizontal overflow | [Desktop](evidence/pss03-desktop.png) |
| 1024×768 | Both panels and toolbar remain usable, 546px workspace; document 1024×768. Scene content 686px inside 576px region; Tab reaches/selects the tool and scrolls only the inspector (scrollTop 110.5), page stays at 0 | [1024px layout](evidence/pss03-1024.png) |
| 768×768 | Panels initially hidden; full 768px workspace, document 768×768; resizing while the tool had focus moved focus to Scene. Scene/Pixel toggles work by Space/Enter and open one at a time; Escape in Pixel closes it and focuses Pixels | [Narrow](evidence/pss03-768.png), [Pixel panel open](evidence/pss03-768-panel.png) |
| 390×844 | Toolbar wraps, workspace/footer readable, document exactly 390×844; controls remain reachable without horizontal overflow | [Phone width](evidence/pss03-390.png) |
| 1024×480 | Additional scroll check: scene and pixel content each constrained to 288px; scrolling Pixel moved its scrollTop 0→142 while Scene stayed 84.5 and document scrollTop stayed 0 | DOM/AX observations; no additional screenshot retained |

Keyboard checks on the fresh server: Space closes Scene with a solid visible focus outline; Enter reopens it; Escape from its select closes it and focuses Scene. Tab traverses toolbar, close button, section summaries and tool select. Space/Enter close/reopen Subject; help opens/closes by keyboard and exposes keyboard/reset instructions. Reset scene by Enter preserves the selected Move light tool; Reset view by Space changes it back to Camera orbit with the correct live feedback. Tool selection was also checked with the browser's native-select API.

The browser bridge did not drive the OS-native select popup with synthetic arrow presses, so an actual native Chrome keyboard check was performed on the existing `http://localhost:5173/` tab: opened Selected tool, pressed Down then Return, observed **Move light** in the select, workspace label and status; Escape closed the inspector and focused Scene; Tab three times reached Reset view; Space restored **Camera orbit**. Reopened Scene afterward. This also confirms the existing root-route tab displays the completed shell.

Captured browser warning/error log entries on the fresh-server tab: **none**. The app's status selector was scoped to `#root` because the browser bridge injects a second empty status region; no application error was involved. Numeric invalid-draft entry was **not applicable**: this shell exposes no numeric input. Tests still verify existing domain validation; feature tasks must add draft UI and browser cases when those editors land.

### Acceptance and remaining limitations

| PSS-03 criterion | Result and evidence |
| --- | --- |
| 1. Window-sized toolbar/inspectors/workspace/status | Passed: actual desktop/medium/narrow Chrome screenshots and DOM measurements |
| 2. Labeled keyboard controls update intended store state | Passed: five StrictMode UI tests, native Chrome tool selection, Space/Enter/Escape/Tab checks, isolated scene/view resets and stable accessible select description |
| 3. No false renderer/export/effect capability | Passed: explicit no-renderer/no-frame copy, read-only stored summaries, absent canvas/number/range/export/preset controls; automated and visual inspection |
| 4. Required responsive widths | Passed: 1440×900, 1024×768 and 768×768 screenshots/overflow measurements, panel reachability and independent scrolling; additional phone/short-window checks |
| 5. Meaningful studio tests and no conflicting template styles | Passed: counter test replaced by five behavior tests; 138 total passing; template CSS replaced; actual browser hierarchy verified |

No PSS-03 acceptance blocker or unresolved defect remains. Rendering, scene/style editing, preview gestures, native pixels, import, persistence and export remain intentionally unimplemented. No browser/manual check required for this shell is left open; numerical draft and graphics/export checks belong to later feature tasks. Next executable task: **PSS-04**, only on user request.

## PSS-04 completion record — 2026-10-23 (America/New_York)

**Status: Complete.** All five acceptance criteria have automated and real Chrome evidence. PSS-03's completion and actual store/shell implementation were inspected before editing. PSS-05 and later tasks remain Not started.

### Implementation and affected files

- Graphics: new `src/scene/primitives.ts`, `subject.ts`, `referenceCamera.ts`, `referenceRuntime.ts`, `invalidation.ts`. One directly owned WebGL2 canvas/renderer/context, real Three scene and Lambert material, seven primitive factories, independent user/normalization roots, reference camera fitting, invalidation scheduler, resource replacement/cleanup and explicit retry ownership.
- UI: new `src/components/SubjectInspector.tsx`, `NumericField.tsx`, `ReferenceViewport.tsx`; updated `src/App.tsx`, `App.css`, `index.css`. Connected shape/dimension/segment and nine transform editors, numeric/range controls, independent geometry/transform resets, mesh-edge presentation, reference status/retry/reframe and responsive canvas. Invalid drafts preserve the last valid scene and have accessible errors. Escape restores an invalid draft; subsequent Escape closes the inspector and restores focus. Reset buttons retain focus.
- Shared state: `src/app/studioStore.ts` adds transient `referenceStatus` and validated view-only `referenceWireframe`. They are outside scene JSON; wireframe increments only the view revision and resets with Reset view. All prior settings/schema/actions are preserved.
- Coverage: updated `src/App.test.tsx` (seven connected StrictMode tests), new `src/scene/primitives.test.ts` (17 tests using actual Three objects) and `invalidation.test.ts` (three tests). Existing 133 domain/store tests remain unchanged. Total: **160**.
- Documentation/evidence: `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `prompts/07-native-resolution-rendering.md`, this record, `evidence/pss04-*.jpg` and the structured [browser check snapshots](evidence/pss04-browser-checks.json). Build regenerated normal ignored `dist/` and TypeScript caches. No Git repository was initialized.

### Decisions and scope

- Used already installed Three **0.186.1**, its matching types and Zustand. **No npm install, package/lockfile change, configuration change, extra UI/graphics framework, hosting, external asset or runtime service.** The application remains browser-local.
- Primitive descriptors come from the validated store. Three constructors supply sphere, box, cylinder, cone, torus and XY plane geometry. A closed four-sided cone with radius `baseSize / sqrt(2)` and Y rotation 45° gives an axis-aligned XZ square base and +Y apex. The pyramid has flat faces; the plane renders both sides. Mesh edges make otherwise invisible planar subdivisions inspectable, with emissive edges for readable contrast.
- A user-transform parent contains a centering-only normalization group and owned content (`Object3D` plus disposer), which can accept a static group later. XYZ degrees convert at the boundary. Standard Three inverse-transpose normals handle signed/nonuniform scales; user transforms never modify geometry or saved camera state. Geometry keys compare descriptor values, so transform/light/camera edits reuse geometry. Every replaced geometry/material is disposed.
- Initial mount, kind selection and explicit Reframe reference fit the transformed vertex bounds. Geometry/transform edits keep that fit so changes remain visible; geometry/scene resets also request a fit. The reference camera derives direction, roll and projection from settings and scales span/distance relative to default sphere bounds, without changing saved camera/subject settings. A browser boundary check exposed tiny valid objects remaining invisible under an initial minimum-span fit; the final fit and relative near/far planes fix this at world radii from 0.000001 through 1,000,000. This is reference presentation, **not PSS-08 native pixel fitting**.
- The reference uses current base color and directional/ambient defaults in smooth Lambert rendering (flat pyramid), with orthographic default camera. Stored bands/palette/framing summaries are not presented as processed output. Reference MSAA and capped display DPR are allowed; the later native target must disable MSAA and preserve exact dimensions. The reference cap is 4,194,304 display pixels, DPR at most 2 and GPU axis limits.
- One RAF scheduler coalesces edits and stops after drawing. It is canceled on disposal. The runtime owns its resize observer, subscription, context listeners, scene/cameras/lights and GPU resources. Helpers and future ground have separate layers; neither ground nor shadows is rendered. There are no OrbitControls or competing handlers yet.
- Missing WebGL2, allocation/shader/driver failures and actual context loss show explicit guidance. Loss releases the old runtime/canvas and leaves settings editable. Retry mounts a fresh StrictMode session from current settings; discarded contexts are not automatically restored. General notices cannot hide the live graphics error. PSS-07 must extend this renderer/scheduler/reconstruction owner, not create another one; architecture, roadmap and its prompt were reconciled accordingly.
- Development-only `?scene-checks` exposes manual counter refresh, real `WEBGL_lose_context` loss, missing-context/allocation simulations and keyed remount. It does not poll and is absent from normal-route and production UI. No output/export actions exist to enable during failure; Reframe is disabled until a reference is ready.

### Exact commands and results

Environment: macOS/zsh, Node **v24.22.1**, npm **11.19.1**, Chrome **155.0.8059.86**. Package scripts and lockfile v3 were inspected; PSS-01's commands remain unchanged.

| Command | Result |
| --- | --- |
| `node --version`, `npm --version` | Versions above |
| `npm run typecheck` | Passed after initial runtime/editor integration |
| `npm run lint` | Passed; no lint warning |
| `npm run test` (initial integration) | 137/138 passed; the old shell test still expected “No renderer connected.” Updated it to exercise the actual no-WebGL2 retry/status path; no graphics mock was added |
| `npm run typecheck && npm run test` (new geometry coverage) | Typecheck passed; 157/158 tests passed. A centering fixture incorrectly expected bounds from an empty Group; replaced it with a Group containing real geometry and owned disposal |
| `npm run typecheck && npm run lint && npm run test && npm run build` (intermediate) | Passed at 159 tests, then 160 after small/large-fit coverage. Build emitted the size advisory described below |
| Same full chain while adding numeric Escape/focus coverage | 159/160 tests passed because the synthetic keyboard fixture had never focused the input. Added explicit focus, matching the real browser interaction; production focus handling was retained |
| **Final `npm run typecheck && npm run lint && npm run test && npm run build`** | **All passed**: Vitest 5.0.5, **5 files / 160 tests**, **1.34 s**; Vite 8.3.5, **38 modules**, **152 ms** build. JS **796.78 kB / 215.37 kB gzip**, CSS **9.36 kB / 2.63 kB gzip** |
| `npm run dev -- --host 127.0.0.1` | Served **http://127.0.0.1:5173/**; initial start 350 ms, final start 104 ms. Restarted owned instances after edits because file-watch invalidation was unreliable here; browser reloaded fresh source. Final server stopped after checks |
| `curl -s http://127.0.0.1:5173/src/scene/invalidation.ts` and `curl -s 'http://127.0.0.1:5173/src/scene/invalidation.ts?t=9999999999999' \| head -12` | Diagnosed stale compiled source during development; restart resolved it |
| `/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' '/Applications/Google Chrome.app/Contents/Info.plist'` | Chrome version above |

An early real-browser run exposed an unbound native RAF invocation (“Illegal invocation”). The wrapper was corrected and a receiver regression test added; the final browser has no such error. No failure was suppressed. Vite's **500 kB chunk-size advisory** remains for the Three-containing bundle; it is a build advisory, not an unhandled runtime warning. No limit suppression or speculative bundler configuration was introduced. No production-preview server, second-browser/GPU run, physical GPU out-of-memory stress or PNG/native-pixel verification was run; none is claimed by this reference-only task.

### Real-browser evidence

Chrome on macOS, actual WebGL2 rendering via the normal React StrictMode entry point. Browser automation operated real visible controls, read DOM/diagnostic snapshots and took screenshots. No mocked Three calls/canvas or jsdom pixel assertions were used. Main final viewport **1728×907 CSS px**, plus **768×768** and **390×844**; temporary overrides were reset. Details and complete snapshots are in [pss04-browser-checks.json](evidence/pss04-browser-checks.json).

| Check | Observations / evidence |
| --- | --- |
| Seven real lit shapes | Sphere, cube, cylinder, cone, square pyramid, torus and plane inspected at object rotations X=20°, Y=30°. Closed caps, pyramid flat faces, torus hole and double-sided plane appear correctly. All geometry/topology screenshots were refreshed after the final camera-fit correction: `pss04-{shape}-angled.jpg` and `pss04-{shape}-parameters.jpg` |
| Every parameter | Sphere radius 1.3 / segments 8×4; cube 2.8×1.4×0.8; cylinder radius 0.7 / height 2.6 / segments 8×3; cone radius 0.8 / height 2.7 / segments 6×4; pyramid base 2.8 / height 1.4; torus major 1 / tube 0.15 / segments 6×12; plane 2.8×1.4 / segments 4×3. Dimension/silhouette changes and actual subdivisions were visible; resets restored defaults |
| All transforms / isolation | Position (0.4, −0.3, 0.6), rotation (25°, 40°, 15°), scale (1.4, 0.65, 1.2) produced the expected rotated/stretched/translated cube. Saved camera JSON was identical before/after. Geometry builds stayed **39→39**, memory **1 geometry / 0 textures / 1 program**, canvas count 1. [Transforms](evidence/pss04-transforms.jpg) |
| Signed nonuniform normals | Sphere scale (−1.6, 0.55, 0.8) produced a correctly lit smooth ellipsoid; no inverted/invalid frame. Reset transforms restored position/rotation zero and unit scale while retaining camera. [Nonuniform](evidence/pss04-nonuniform.jpg) |
| Validation / keyboard | Radius 0/empty, segments 129/3.5, scale 0/0.0005 all showed accessible errors. Settings and frame count stayed unchanged (**63→63**). Torus tube equal to major radius was rejected. Escape cleared the draft, then another Escape closed the panel and focused Scene. Geometry reset cleared invalid drafts and retained button focus |
| Reframe extremes | Radius 0.001 with all scales 0.001 (world radius 0.000001), and radius 1000 with all scales 1000 (world radius 1,000,000), both rendered usefully after Reframe with valid depth. [Small fit](evidence/pss04-small-fit.jpg) |
| Repeated replacement | **70 separately rendered kind replacements**: builds **40→110**, frames **64→134**. Ten samples each stayed at **1 geometry / 0 textures / 1 program / 1 canvas / 1 active runtime**. After final camera changes, another 14 replacements again kept the same memory/lifecycle plateau |
| Idle | Frame count **134→134** and builds **110→110** over **135.681 seconds**, with diagnostics held open and no scene changes. Refresh itself does not schedule drawing |
| StrictMode / subscriptions | Initial created/disposed/active counts **2/1/1**. Five keyed remounts each performed two StrictMode constructions and left one runtime/canvas, one geometry and one program. Counts ended **18/17/1**; one subsequent edit changed frames **4→5**, builds **1→2**, showing one live rendering subscription |
| Actual context loss | `WEBGL_lose_context` produced visible loss guidance and Retry, removed the canvas, disabled Reframe and released resources: **2 created / 2 disposed / 0 active**, **0 geometries / 0 textures / 0 programs**. Retry reconstructed the same complete settings with **1 active runtime / 1 geometry / 1 program**. [Loss state](evidence/pss04-context-loss.jpg) |
| Missing context / allocation | Simulated missing WebGL2 and creation-time allocation failure each showed actionable status and zero canvases. Retry succeeded. A tube edit to 0.3 made while unavailable survived reconstruction. [No-context state](evidence/pss04-no-context.jpg). Final loss smoke check also verified the live error remained present alongside an earlier reset notice |
| Responsive / final route | At 768×768 the collapsed panel opened by Enter/Space; numeric error recovery and Escape/focus worked. At 390×844 the reference remained visible. Document scroll widths matched viewport widths (768 and 390), each with one canvas. [768 panel](evidence/pss04-768-panel.jpg), [390 layout](evidence/pss04-390.jpg). Normal `/` had one ready canvas, no diagnostics panel and no export/capture/download buttons |
| Console | Final captured warning/error entries: **none**. Intentional context loss may log Three's informational context-loss notice; no application/WebGL/shader warning or error was left unresolved |

The final regular workspace is shown in [pss04-workspace.jpg](evidence/pss04-workspace.jpg); the canonical default reference is [pss04-sphere.jpg](evidence/pss04-sphere.jpg). Screenshots are reference evidence, not native image/export evidence. Temporary viewport overrides and verification tabs were cleaned up and the owned dev server was stopped.

### Acceptance and remaining limitations

| PSS-04 criterion | Result |
| --- | --- |
| 1. Seven primitives and relevant parameters | **Passed**: real Chrome lit/topology images and all parameter edits; actual Three dispatch/normals/bounds tests |
| 2. XYZ translation/rotation/nonuniform scale/reset independent of camera | **Passed**: all nine live editors, mirrored ellipsoid, reset checks, unchanged camera JSON, pure normal/transform/reference-camera invariants |
| 3. Stable resources/canvases/listeners across replacement | **Passed**: 70 rendered replacements, final 14-replacement smoke, five StrictMode remounts, one live subscription and actual disposal counters/events |
| 4. Idle rendering and invalid-input safety | **Passed**: 135.681 s idle plateau, three scheduler tests, invalid browser drafts preserve settings/frames, full boundary validation coverage |
| 5. Usable no-context/loss status and retry | **Passed**: real extension-induced loss plus simulated missing context/allocation failure, zero-canvas failure states, disabled dependent action and settings-preserving retry |

No required PSS-04 acceptance check is unrun or open. The bundle-size advisory is non-blocking. Secondary browsers/GPU vendors and physical allocation pressure were not tested. Native pixels/fit-box masks, camera/light controls/gestures, shadows, import, persistence and PNG remain their later tasks; the reference is explicitly not pixel-perfect or export-ready. **Next executable task: PSS-05. Stop here; do not start its prompt or the runner in this session.**


## PSS-05 completion record — 2026-10-23

**Status: Complete.** PSS-04 was verified Complete in the table and its actual single-renderer/subject/store/scheduler/retry implementation inspected before editing. No prerequisite functionality was fabricated. No later task or sequential runner was executed.

### Implementation and affected files

- Camera math/ownership: `src/scene/referenceCamera.ts` now provides pure view/distance/projection/reframe helpers, deterministic unrolled pole poses and derived rolled render cameras. New `src/scene/cameraController.ts` owns installed OrbitControls, projection source/render cameras, synchronous store application, validated gesture publication, tool gating, keyboard input and disposal. `src/scene/referenceRuntime.ts` integrates that controller into the existing renderer/scene/scheduler, derives depth bounds and exposes development diagnostics.
- Controls/UI: new `src/components/CameraInspector.tsx` provides projection, bounded FOV/span/zoom, roll, XYZ pose/target, distance, seven view buttons and camera-only reset. `src/App.tsx` connects it, updates visible tool/help text and preserves exact Reset scene defaults. `src/components/SubjectInspector.tsx` preserves camera across selection/geometry reset; `src/App.css` adds compact wrapping view buttons.
- Validation: `src/domain/constraints.ts` and `validation.ts` add camera-only axis/span bounds, preserving geometry/object/light limits and the version-1 JSON shape.
- Tests: new `src/scene/referenceCamera.test.ts` and `cameraController.test.ts`; `src/App.test.tsx` adds connected camera/isolation/error/reset coverage and current tool copy. Two obsolete runtime-fit tests in `primitives.test.ts` were replaced with broader explicit reframe/derivation coverage in the camera tests; geometry/normal/disposal tests remain.
- Documentation/evidence: README, ARCHITECTURE, ROADMAP, this progress record, PSS-05/PSS-08 prompt integration notes and `evidence/pss05-*`. `package.json`, lockfile and tool configuration remain unchanged; normal build/cache artifacts were regenerated. No Git repository was initialized.

### Decisions and assumptions

1. `settings.camera` remains the only authoritative pose/target/roll/projection. OrbitControls operates on an unrolled runtime source; render derivation copies it and applies local-Z roll. Source/render cameras are caches, not competing saved poses. Screen pan displacement rotates into the displayed rolled axes. Exact top/bottom keep target-aligned X/Z and deterministic +X right, with −Z/+Z up; controls' pole epsilon is confined to subsequent gestures.
2. Damping/autorotation are off. External camera edits apply under an event-publication guard; gestures validate/commit once per change and restore the validated source. Render/resize never commit camera settings. Existing revisions and demand scheduling remain authoritative. Invalid movement preserves settings and shows guidance.
3. PSS-04's runtime-only reframe center/scale would cancel manual target/pan/zoom. It was replaced with an explicit **Reframe reference** camera-only commit, retaining orientation/roll. Shape/geometry/object edits preserve camera; Reset scene restores the exact canonical camera. There is no automatic fit loop. This consequential behavior change is visible in help/README and reconciled in architecture, roadmap and PSS-05/PSS-08 prompt references.
4. Camera axes now support ±100,000,000 and orthographic span 1e−8–100,000,000. This camera-only expansion preserves useful framing of PSS-04's world-radius 1e−6/1e6 examples after removing runtime scaling. Object/light axes remain ±10,000 and geometry dimensions 0.001–1000. FOV remains 1–179°, zoom 0.01–100, endpoint separation at least 1e−6. Singular/out-of-domain inputs or conversions reject atomically rather than silently clipping values. Render near/far are derived, finite and ordered; manual subject clipping is allowed.
5. Orthographic→perspective uses 50° FOV/zoom 1 and adjusts distance to match target-plane vertical scale. Perspective→orthographic derives that scale into bounded span/zoom. Target/direction/roll remain fixed; perspective foreshortening may change occupied bounds. Reset camera intentionally resets roll to zero; Reset view and object resets preserve camera/roll.
6. Only Camera orbit enables camera gestures. Focused-reference arrows pan and Shift+arrows orbit; all camera numeric controls remain available under other tools. No native/output zoom, preview-pan, light drag, pixel-fit lock, export or persistence was added. Existing stored pixel-fit settings are explicitly inactive for this manual reference; PSS-08 derives fit without mutating the orbit source.
7. No dependency/configuration changes: the installed Three addon supplies controls. Its installed source and official OrbitControls documentation were inspected for up-vector, gestures, damping, events and cleanup behavior.

### Exact commands and results

Environment: Node **v24.22.1**, npm **11.19.1**, Vitest **5.0.5**, Vite **8.3.5**, macOS; scripts rechecked against `package.json` before invocation.

| Command | Result |
| --- | --- |
| `node --version` / `npm --version` | Versions above |
| `npm run typecheck` (initial integration) | Failed on obsolete `updateReferenceCamera` test import and camera-union `copy` typing. Replaced old fit tests with current behavior tests and narrowed projection types explicitly |
| `npm run typecheck && npm run lint && npm run test` (initial coverage) | Typecheck first caught an unsupported Testing Library `exact` argument and unused test import; corrected both. Next run reached tests: 173/174 passed. A disposal assertion read an inactive camera selected from the now-reset store; diagnostics now inspect the actual controls-owned source, establishing listener isolation correctly |
| `npm run typecheck && npm run lint && npm run test && npm run build` (intermediate) | All passed at 174 tests, then 175 with camera-bound/extreme-reframe coverage. Adding keyboard pan and cleanup assertions retained 175 passing tests |
| **Final `npm run typecheck && npm run lint && npm run test && npm run build`** | **All passed**: **7 files / 175 tests**, **1.87 s**; Vite **41 modules**, **166 ms** build. JS **825.40 kB / 222.15 kB gzip**, CSS **9.51 kB / 2.66 kB gzip** |
| `npm run dev -- --host 127.0.0.1` | Started successfully at **http://127.0.0.1:5173/**. Owned server restarted after source edits to avoid this environment's previously observed stale-transform behavior; final restart ready in **153 ms**. Stopped after verification |
| `/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' '/Applications/Google Chrome.app/Contents/Info.plist'` | **155.0.8059.86** |
| `python3 - <<'PY' … PY` (Pillow screenshot analysis) | Read saved ortho/perspective/FOV screenshots, measured colored-subject bounds inside the known canvas rectangle: **271×295**, **267×303**, **176×177 display pixels** respectively. No native-output/pixel-fit claim |
| `python3 - <<'PY' … PY` (saved evidence audit) | Verified object/camera isolation, all view matrices finite, stable idle revisions/frames and empty final console list. Relative source/render quaternion angles equal **30°** after rolled orbit, zoom, pan, projection/FOV, dolly and pole recovery |

Early browser development exposed duplicate sibling React keys on the two inspectors; namespaced keys fixed the warning. Final fresh-source Chrome checks have **no warnings/errors**. The existing **500 kB Vite chunk-size advisory** remains visible and unsuppressed; it is non-blocking for this local application. No package installation, production-preview server, deployment or runner execution occurred.

### Real-browser checks and evidence

**Google Chrome 155.0.8059.86 on macOS, 1728×963 CSS pixels**, real WebGL2 through React StrictMode, local dev server. Actual visible controls/native pointer drags, wheel scrolling and focused keyboard events were used. Diagnostics are the development panel's published snapshots; no hidden store mutation, mocked WebGL or simulated canvas pixels were used. Complete settings/counters/quaternions are retained in [pss05-browser-checks.json](evidence/pss05-browser-checks.json).

| Check | Observed evidence |
| --- | --- |
| Camera/object separation (camera portion of S2) | Real left-drag rotated a cube's view while full subject JSON remained byte-identical. Separate object rotations X=20°/Y=35° changed mesh orientation while camera JSON stayed identical. Geometry was reused during camera edits |
| Roll, orbit and zoom | Set roll **30°**, then pointer-orbited. Source/render relative rotation stayed 30°. Wheel changed orthographic zoom **1→0.8207130231** without an automatic fit cancelling it; object state stayed identical. [Rolled orbit](evidence/pss05-roll-orbit.png) |
| Pan | Focused-reference Right/Right/Up arrows changed target to approximately **(0.08540, 0.12595, 0.10234)**, translating pose/target coherently while retaining roll/object state. Real OrbitControls wheel/key behavior and rolled screen-axis pan direction also have a focused DOM test |
| Projection/FOV/dolly | Rolled isometric ortho→perspective retained target/direction/30° roll and changed distance approximately **5→5.226**. Screenshot bounds **271×295→267×303** (~−1.5% width/+2.7% height); this is expected depth foreshortening. FOV **50→75°** reduced bounds to **176×177**. Wheel then moved perspective position closer while retaining roll. Return to orthographic retained roll. [Ortho](evidence/pss05-orthographic.png), [perspective](evidence/pss05-perspective.png), [75° FOV](evidence/pss05-fov75.png) |
| All views/poles | Exercised front/back/left/right/top/bottom/isometric in **both** projections. Every snapshot retained subject JSON and 30° roll, with finite projection/quaternion/depth. Top/bottom were exact target-aligned X/Z poses; dragging away from both produced valid views without NaN/flips. [Top](evidence/pss05-top.png), [bottom](evidence/pss05-bottom.png) |
| Tool/reset/error boundaries | Move light disabled pointer/wheel/key camera movement and retained all settings. Numeric roll still worked while paused. Reset view retained roll **40°** and reenabled Camera orbit. Distance 0 displayed an accessible error and left settings/frames unchanged (**84→84**). Escape restored the draft. Reset camera restored position (0,0,5), target origin, roll 0, ortho span 4/zoom 1; every other scene section stayed byte-identical |
| Idle/feedback | **115.548 seconds**, frames **3→3**, settings revision **84→84**, all revisions unchanged, control changes **0→0**. Refresh diagnostics itself caused no rendering. Automated tests also establish one validated revision per real controls wheel change and zero render/resize commits |
| StrictMode/remount/disposal | Five keyed remounts each left **1 active runtime / 1 canvas / 1 geometry / 0 textures / 1 program**, retained exact settings and ended at lifecycle **12 created / 11 disposed / 1 active**. One later roll edit produced exactly **1 revision / 1 frame** (**2→3**). Automated disposal checks match removed wheel/pointer/key/document listener identities, suppress later detached-canvas gestures and detach the store subscription |
| Tiny/large explicit reframe | Sphere radius 0.001/scales 0.001 (world radius 1e−6), then radius 1000/scales 1000 (world radius 1e6), both remained usefully visible after explicit Reframe with roll 31°. Tiny near/far **1e−8/2e−5**; large near/far approximately **5196/10,392,305**. [Tiny](evidence/pss05-tiny-reframe.png), [large](evidence/pss05-large-reframe.png) |
| Context loss/retry | Actual `WEBGL_lose_context` removed the canvas and showed guidance. Retry preserved all settings including 30° roll and restored working wheel zoom. Lifecycle ended **14/13/1**, with one canvas and no warning/error |
| Normal route/console | `/` displayed one ready canvas, working camera controls and zero diagnostic panels. Final captured warnings/errors **none**. [Completed workspace](evidence/pss05-workspace.png) |

### Acceptance and remaining limitations

| PSS-05 criterion | Result |
| --- | --- |
| 1. Orbit/pan/zoom/all standard views including poles | **Passed**: real Chrome pointer orbit, keyboard pan, wheel zoom/dolly, all views in both projections, exact pole/recovery snapshots; pure projection/depth/pole tests |
| 2. Camera gestures/presets preserve object transforms | **Passed**: byte-identical full subject snapshots across gestures/presets, separate object rotation preserves camera; connected reset/isolation tests |
| 3. Roll survives orbit/projection switching | **Passed**: 30° relative quaternion throughout browser gestures/projections/views and pure derivation tests; complete JSON serialization/restore reproduces rolled pose. Reset view preserves roll; camera reset intentionally clears it |
| 4. Coherent projections/FOV/camera-only reset | **Passed**: exact target-plane automated projection match, approximate browser occupied bounds above, visible FOV/dolly change, byte-identical non-camera sections on camera reset |
| 5. Idle rendering/cleanup on unmount/recreation | **Passed**: 115.548 s idle, five StrictMode remount/resource plateau, single subsequent update, actual loss/retry and focused real-Controls listener/subscription disposal assertions |

No required PSS-05 acceptance item remains failed/unrun. Pan was exercised through the addon's focused keyboard path; right-drag/Shift-drag and multitouch were not separately automated. Secondary browsers/GPU vendors, narrow-layout repetition and production-preview checks were not run in this task; none replaces the required primary-browser evidence. Existing chunk-size advisory remains non-blocking. Native fitting/its pan-zoom lock, lighting, preview navigation, exports and persistence remain future tasks. **Next executable task: PSS-06. Stop here.**


## PSS-06 completion record — 2026-10-23

**Status: Complete.** PSS-05 was verified Complete in the ordered table and its actual camera/roll/projection controller, subject lifecycle, store validation/revisions and demand renderer inspected before editing. All five acceptance criteria now have automated and real Chrome evidence. No subsequent task or sequential runner was executed.

### Implementation and affected files

- **Lighting contract:** new `src/domain/lighting.ts` and `lighting.test.ts`; `src/domain/validation.ts` exports the existing section validator for reuse. Pure derivation validates endpoints/colors/intensities, decodes sRGB and provides the Lambert illumination function and five presets. The settings schema, canonical defaults and store revision rules remain unchanged.
- **Scene and interaction:** new `src/scene/referenceLighting.ts`, `lightHandle.ts`, `lightController.ts` and `lightController.test.ts`. `referenceRuntime.ts` integrates them into the one scene/renderer/retry owner and adds the lighting invalidation hook and diagnostic snapshots. `cameraController.ts` adds temporary light ownership gating; `cameraController.test.ts` retains the unavailable preview-pan tool's pause check. Helpers are separate from `SceneSubject` and all descendants use layer 1.
- **Controls and help:** new `src/components/LightInspector.tsx` and `ColorField.tsx`; `CameraInspector.tsx`, `src/App.tsx`, `App.css` and `App.test.tsx` connect controls, isolated resets/presets, derived direction readout, bounded invalid drafts and current tool/help/status copy.
- **Documentation/evidence:** README, ARCHITECTURE, ROADMAP, this record, integration guidance in PSS-07/PSS-09 prompts, `evidence/pss06-browser-checks.json`, `pss06-display-samples.json` and screenshots `pss06-*.png`. Package/lockfile/configuration/scripts are unchanged; normal build/cache artifacts were regenerated. There is still no Git repository, and none was initialized.

### Decisions and assumptions

1. Position and target remain the single authoritative directional state. Surface-to-source `L = normalize(position − target)`; normals and L must share a coordinate space. Reject separation below 1e−6, nonfinite/out-of-bounds coordinates, invalid RGB and intensities outside 0–10. There is no independent direction editor/state. Distance affects the handle's retained orbit radius, not directional brightness. Existing brightness bounds remain finite/bounded for later tone processing; no premature tone control was added.
2. Continuous reference light is linear-sRGB `base * (ambientColor * ambientIntensity + directionalColor * directionalIntensity * max(dot(N,L),0))`. Keep energy unclamped until display saturation or later normalized tone processing. The installed Three r186 Lambert shader divides both light contributions by PI; the adapter cancels this with runtime intensity PI and shared derived linear energies. This intentional reference-brightness adjustment makes unit intensity match the future CPU contract without replacing the material, introducing an environment map or using tone mapping. No state defaults were changed. PSS-07 must transform L to capture-normal space and reuse this math, without the adapter's PI factor.
3. Five presets replace lighting alone with canonical world-space positions/target, white source/fill and documented intensities. +X is right, +Y up and +Z front, independent of camera roll. Flat Ambient retains a valid source pose with zero directional and unit ambient intensity. Presets/reset preserve every other scene section and clear stale local drafts. Ambient color is editable because it already belongs to the validated scene contract.
4. A direction proxy keeps the handle usable when the actual source lies outside the viewport. The helper ring radius is 32% of the shorter CSS viewport axis at target depth (perspective world radius capped at 45% of target depth), marker radius 9 CSS pixels, hit radius 18 CSS pixels. Its target-centered screen arcball rotates the original source offset while retaining target/distance. Outside-circle points map to the equator; drag start is relative, without snapping to a canonical hemisphere. The displayed rolled render camera and canvas rectangle handle workspace offsets, both projections and roll. Helpers are explicitly reference-only, depth-independent, disposed at their owner, and excluded from subject bounds/layer 0. Offscreen/depth-clipped targets remain numerically editable; this behavior is explained in the UI.
5. Move light must be explicitly selected to hit the handle. Its capture-phase handler prevents OrbitControls from receiving an owned pointerdown. Camera controls disable only while that gesture owns the pointer; empty-space Move light drags continue to orbit. Pointerup commits; Escape/pointercancel/lost capture/blur restore the starting light position and release ownership/capture. Tool/camera/external lighting edits, resize or disposal finish without overwriting newer settings. Preview-pan remains paused/unimplemented. This updates PSS-05's temporary whole-tool pause behavior; architecture, README, UI copy and future mapping guidance now agree.
6. Existing `style` revisions handle light changes, with source/target changes also incrementing `shadow`; `capture` stays unchanged. `ReferenceRuntime.invalidateLighting()` is the explicit hook for PSS-07 to specialize into cached-normal processing. It currently coalesces one display redraw. Geometry descriptors/build counts remain unchanged on light-only edits. No extra revision system, GPU readback, native frame, palette mapping, export or shadows were introduced.
7. No dependencies, npm scripts or configuration were changed. The installed Three shader source and official material/color-management documentation were consulted; runtime code and shader math, rather than assumed material appearance, define the adapter.

### Exact verification commands and results

Environment: macOS, Node **v24.22.1**, npm **11.19.1**, Vitest **5.0.5**, Vite **8.3.5**. Package scripts and lockfile v3 were inspected before invocation.

| Command | Result |
| --- | --- |
| `node -v` / `npm -v` | Versions above |
| `npm run typecheck && npm run lint` | Passed at initial integration |
| `npm run typecheck && npm run lint && npm run test` | Passed: 9 files / 202 tests before adding translated-target coverage |
| `npm run build` | Passed intermediate build; existing 500 kB chunk advisory remained visible |
| **Final `npm run typecheck && npm run lint && npm run test && npm run build`** | **All passed: 9 files / 203 tests, 2.13 s**. Vite 47 modules / 166 ms; JS **840.83 kB / 226.40 kB gzip**, CSS **9.76 kB / 2.71 kB gzip** |
| `npm run dev -- --host 127.0.0.1` | Started at **http://127.0.0.1:5173/**, ready in 172 ms. Owned server restarted after final source edits, ready in 115 ms; fresh-page verification repeated. Stopped after verification |
| `/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' '/Applications/Google Chrome.app/Contents/Info.plist'` | **155.0.8059.86** |
| `python3` inline Pillow/JSON evidence audit | Passed assertions for preset isolation, source-radius preservation, camera/capture/geometry stability, Escape restoration, camera recovery, five stable remounts, idle counters and empty console. Sampled saved screenshots at fixed face coordinates and wrote `pss06-display-samples.json` |

All standard commands passed on their first executed check runs; no errors were suppressed or empty suite accepted. The unsuppressed Vite **500 kB bundle advisory** is non-blocking. No package installation, production-preview server, deployment, hosted assets or external content upload occurred.

### Automated evidence

- Pure math checks establish surface-to-source sign, target translation/distance invariance, back/perpendicular normals, sRGB transfer boundaries, colored directional/ambient energy, intensity endpoints/high bounded energy, and flat-ambient normal independence. Zero/near-zero/nonfinite source vectors and invalid intensities reject atomically; the exact 1e−6 direction boundary is valid.
- Every preset and lighting reset preserve camera/object/palette and capture revisions. The reference adapter's PI normalization is checked against shared energy values.
- Real Three camera projection/roll math is used in handle tests with a nonzero workspace rectangle. Both projections and 90° roll map screen axes correctly; drags preserve target/radius, including a translated target. Every helper descendant excludes subject layer 0 and all six geometry/material disposals occur exactly once.
- jsdom event tests use actual OrbitControls/controller listeners, with pointer-capture bookkeeping because jsdom has no native pointer capture. Pointerup/cancel/lost capture/Escape/blur/dispose, unrelated pointers, explicit-tool/hit gating, capture failure and external tool/pose/numeric edits release ownership correctly. Camera wheel input is blocked while light-owned and restored afterward. These tests establish transitions, not GPU pixels.
- The actual StrictMode app verifies synchronized connected lighting controls, hex normalization, rejected color/intensity/zero-vector drafts, preset/reset isolation and absence of an enabled shadow control. Existing geometry, camera, state and failure-path tests remain passing.

### Real-browser evidence

**Google Chrome 155.0.8059.86 on macOS, 1728×963 CSS pixels**, real WebGL2 and React StrictMode. Reference drawing buffer is 2× its CSS dimensions. Visible labeled controls, native pointer drags and native keyboard input were used. Diagnostics were read from the published development panel; no hidden store mutation or mocked rendering was used. Complete snapshots: [browser evidence](evidence/pss06-browser-checks.json).

| Check | Observed result |
| --- | --- |
| Cube/light movement and continuous face shading | Actual handle drag changed source from (3,4,5) to approximately (−4.709,4.980,1.739), with camera/object unchanged. Independent empty-space orbit changed camera only. Fixed-camera preset screenshots show different illuminated faces. Upper-right/upper-left right-face display samples change **(80,108,147) → (46,62,85)**. [Upper right](evidence/pss06-upper-right.png), [Upper left](evidence/pss06-upper-left.png) |
| Overhead/side/ambient | Overhead lights the top; Side lights +X. The bright face sample is **(111,147,197)** while perpendicular faces show **(46,62,85)**. Flat Ambient makes all three sampled faces exactly **(102,135,180)**. [Overhead](evidence/pss06-overhead.png), [Side](evidence/pss06-side.png), [Flat ambient](evidence/pss06-flat-ambient.png) |
| Color/intensities | `#FF5020` visibly warms the blue cube. Directional 0.25→2 brightens the front-face display sample **(41,34,42) → (103,60,54)**. Ambient 0.05→0.8 fills shaded faces; front becomes **(134,130,165)**. Camera/object/capture/build count remain unchanged. [Colored](evidence/pss06-colored.png), [Dim](evidence/pss06-dim.png), [Bright](evidence/pss06-bright.png), [Ambient fill](evidence/pss06-ambient-fill.png) |
| Rolled perspective mapping | With **45° roll**, perspective **65° FOV**, actual right/left/above handle drags each changed light position while retaining radius sqrt(50), target, camera/object and capture revision. Build count stayed **2** throughout. [Rolled perspective](evidence/pss06-rolled-perspective.png) |
| Numeric synchronization/bounds | After native drag, XYZ input numbers exactly equaled published source coordinates **(2.6687521655430175, 6.1834421609365515, 3.412155465576231)**. Numeric X=−4 moved the handle. Intensity 11 showed `aria-invalid=true`; Escape restored 1 |
| Native cancellation and camera recovery | Escape during an in-flight native drag incremented cancellation count, restored the complete starting light settings and preserved camera. Subsequent empty-space native drag orbited while light remained unchanged. Final fresh-source settled-frame drag and Escape repeat also passed with unchanged camera/object/build count. [Final verified state](evidence/pss06-final-verified.png) |
| Presets/reset isolation and geometry reuse | Full snapshots for all presets, color/intensity edits and lighting reset preserve every non-light scene section. Cube build count stays **2**, native-capture revision stays unchanged by lighting and only lighting invalidations/style (plus pose-shadow) revisions advance. Helper masks are **2** for ring/arm/marker; none are subject meshes |
| Lifecycle/idle | Five StrictMode keyed remounts each settle at **1 active renderer, 4 geometries (subject + 3 helpers), 0 textures, 4 programs, 1 subject build**. Across **88.967 s** idle, frames stay **2→2**, revisions/memory unchanged |
| Normal route/console | `/` has one ready canvas, functioning lighting controls/handle and zero development diagnostic panels. Smooth sphere reference is visible. Final captured console warnings/errors **none**, including the final fresh-source page. [Completed workspace](evidence/pss06-workspace.png) |

The sample bytes above come from browser/display screenshots, including display color conversion. They establish contrast/color behavior, **not** native output, palette-byte fidelity or export correctness. Coordinates and complete samples are recorded in [display evidence](evidence/pss06-display-samples.json).

Two browser test-setup issues were resolved and retained honestly in evidence: a timed held-click completed before Escape, so cancellation was retested successfully during an actual in-flight drag; opening diagnostics resized the canvas after an early snapshot, so stale test coordinates hit empty space and orbited. The final test re-read the settled displayed handle and verified successful ownership/cancellation **without resetting camera or object**. A read-only browser environment query could not expose navigator; browser version was obtained from the installed Chrome plist and viewport from saved screenshots. No application rendering failure was observed.

### Acceptance and remaining limitations

| PSS-06 acceptance criterion | Result / evidence |
| --- | --- |
| 1. Moving light changes cube faces; ambient-only removes directional contrast | **Verified**, pure direction/ambient tests and fixed-camera real-WebGL screenshots/display samples |
| 2. Color, intensity and ambient visibly update reference | **Verified**, linear-energy tests, actual controls and distinct saved color/brightness/fill screenshots |
| 3. Handle and numeric inputs share state; light drags never accidentally orbit | **Verified**, controller tests plus exact Chrome input/snapshot match and camera-invariant owned drags under orthographic and rolled perspective views |
| 4. Lighting reset/presets preserve object/camera; cancellation restores camera interaction | **Verified**, store/UI tests, complete Chrome snapshot isolation, native in-flight Escape restoration and subsequent camera orbit |
| 5. Helpers are reference-only and never subject meshes | **Verified**, every helper descendant has only layer 1, separate ownership/disposal, subject-only bounds and published Chrome layer masks |

No required acceptance item remains failed or unrun. Physical multitouch, native pointercancel/lost-capture generation, secondary browsers/GPU vendors, repeated narrow layouts and production-preview rendering were not separately exercised; pointer transition tests cover cancel/lost capture, while Chrome native Escape proves cancellation/recovery in the real renderer. Native capture and actual helper exclusion from captured pixels remain PSS-07; advanced preview mapping remains PSS-09; shadows remain honestly unavailable until PSS-15. No limitation blocks PSS-06. **Next executable task: PSS-07. Stop here.**


## PSS-07 completion record — 2026-10-24 (America/New_York)

**Status: Complete.** Work began 2026-10-23 and finished after local midnight. PSS-06's Complete status and evidence were checked against the actual lighting derivation/PI adapter, controllers, capture/style/shadow revisions, renderer/scheduler and explicit Retry lifecycle before editing. The existing repository was extended; no project or Git repository was initialized. All six task acceptance criteria now have passing evidence. No later task/runner was executed.

### Implementation and affected files

- **Native pipeline:** new `src/scene/nativeCapture.ts` owns a byte RGBA normal/category target, capture shader, derived native cameras/view matrix, reused raw/top-left/work buffers, synchronous capture/readback, CPU processing and stable canonical frame publication. `src/pixels/nativeFrame.ts` supplies pure dimension/byte validation, one row flip, signed-normal reconstruction/normalization, single linear→sRGB conversion and transparent/solid compositing.
- **Runtime/scheduling:** `src/scene/referenceRuntime.ts` integrates the pipeline and exact native 2D canvas into its existing renderer, store subscription, resize observer, diagnostics, context/error handling and disposal. `src/scene/invalidation.ts` extends the existing demand scheduler with coalesced capture/style/presentation work and generation validity. No second renderer/light state/revision system was added. A mode switch ends an owned light gesture without overwriting newer settings.
- **Controls/presentation:** new `src/components/CanvasInspector.tsx` connects all nine square presets, custom axes and explicit output background/color using existing validators/fields. `src/components/ReferenceViewport.tsx`, `src/App.tsx` and `src/App.css` add native/reference switching, nearest integer display sizing, view-only checkerboard and truthful continuous/manual-camera help. Existing reference gestures remain available through the reference mode.
- **Tests:** new `src/pixels/nativeFrame.test.ts` and `src/scene/nativeCapture.test.ts`; extended `src/scene/invalidation.test.ts` and `src/App.test.tsx`. Tests cover algorithm fixtures, ownership, restoration on success/error, stale generation/disposal rejection, cache reuse, target replacement and connected validated controls. Renderer test doubles establish control-flow/resource invariants only; real Chrome supplies all GPU/pixel evidence.
- **Documentation/evidence:** README, ARCHITECTURE, ROADMAP, the PSS-08 integration note, this progress record and `evidence/pss07-*`. `package.json`, `package-lock.json`, domain schema/defaults/store revisions, dependencies and configuration remain unchanged. Build/cache artifacts were regenerated normally.

### Decisions and contract

1. Native dimensions are the requested integer W×H, validated at 1–1024/axis and at most 1,048,576 pixels, then bounded by GPU texture, renderbuffer and viewport capabilities. Allocation/framebuffer/GL/readback/2D failures stop the shared runtime, discard frames and expose Retry with current settings retained. There is no downsampled capture. Current [Three render-target](https://threejs.org/docs/pages/WebGLRenderTarget.html) and [shader-material](https://threejs.org/docs/pages/ShaderMaterial.html) APIs and installed types/source were checked.
2. Capture RGB encodes view-space normals as signed data; category alpha is 255 subject / 0 background, reserving 128 for the later receiver. Correct normal matrices, fragment normalization, depth testing, double-sided plane normal reversal and flat pyramid faces are retained. The target uses unsigned-byte RGBA, NoColorSpace, nearest filters, samples=0 and no mipmaps. The shader has no color/tone/premultiplication chunks or blending; native GL dithering is disabled. Helpers stay on their reference-only layer. `finally` restores render target/face/mip, viewport, scissor/test, clear color/alpha, auto-clear, tone mapping, GL dithering and scene material/background overrides.
3. Readback is deliberately synchronous at this increment; no asynchronous readback/fallback path or pending target lifetime exists. Rows flip exactly once into top-left CPU order. Shared `deriveLighting`/`decodeSrgb`/`lambertIllumination` provide lighting; the unit source direction transforms through the captured view matrix. CPU illumination has no PI factor; the reference adapter remains unchanged. Base reflectance and lights are linear-sRGB; finished continuous RGB saturates/converts once to display sRGB. Transparent pixels are exactly `(0,0,0,0)` and subject alpha 255; solid backgrounds preserve their exact opaque RGB bytes.
4. Published `{width,height,rgba,revision,captureRevision}` lives in the pipeline, outside React/Zustand/scene JSON. Each publication owns a copied finished buffer; work/input arrays and GPU targets are reused until size changes. Retained frames cannot be mutated by later processing. `getFrame(revision)` returns only a matching settings revision. Capture/processing check scheduler generation, current settings revision and disposal before publication. Settings edits hide the previous native canvas until the current frame is complete; failures remove both canvases and disable dependent inspection/reframe actions.
5. Existing capture revisions control cached normals. `invalidateLighting()` schedules style processing without recapture; background/style also reuse normals. Preview/mode/CSS resize only schedule presentation. Reference geometry remains shared. One RAF coalesces edits and idles when settled. Canvas backing pixels remain W×H; ImageData uses sRGB, smoothing is false and integer CSS enlargement uses pixelated sampling. The checkerboard never enters frame bytes.
6. Native projection intentionally uses the saved **manual camera at native aspect**, independent of CSS/DPR. Stored pixel-fit and tone/palette settings are explicitly inactive until their scoped tasks. The default sphere incidentally measures 32×32 under the existing span; this does not claim PSS-08's general fit/alignment/calibration work. ARCHITECTURE, ROADMAP, README and PSS-08 guidance now describe the actual integration boundary. No advanced preview, tone modes, palettes, dither, outlines, shadows, imports, export or persistence was implemented.

### Exact verification commands and results

Environment: macOS, Node **v24.22.1**, npm **11.19.1**, Vitest **5.0.5**, Vite **8.3.5**. PSS-01 commands and npm lockfile v3 were rechecked before use.

| Command | Result |
| --- | --- |
| `node -v` / `npm -v` | Versions above |
| `git status --short` | Confirmed no Git repository; no Git initialization attempted |
| `npm run typecheck` | Passed initial integration |
| `npm run typecheck && npm run lint && npm run test` | Initial run: typecheck/lint passed, 223/224 tests passed. An older unscoped combobox assertion failed because the new pixel inspector now contains selects; scoped it to Selected tool. Subsequent runs passed 225 and then 228 tests after focused ownership/restoration coverage |
| `npm run typecheck && npm run lint && npm run test && npm run build` | Passed intermediate 225-test and 228-test runs. **Final completed-source run: all passed, 11 files / 228 tests, 2.58 s; 50 Vite modules, 150 ms build. JS 852.80 kB / 230.26 kB gzip; CSS 10.40 kB / 2.88 kB gzip** |
| `npm run dev -- --host 127.0.0.1` | Started at **http://127.0.0.1:5173/**, ready in **112 ms**. Used for all browser checks and stopped after verification |
| `/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' '/Applications/Google Chrome.app/Contents/Info.plist'` | **155.0.8059.86** |
| `node /tmp/pss07-browser.mjs` | Scratch Chrome DevTools-pipe verification against localhost. Initial sandboxed browser launch could not provide DevTools and timed out; the allowed local browser launch succeeded. Initial full run passed 36 checks; expanded final run passed **42/42**. An intermediate expanded harness compared light reuse across its own two camera-roll edits; corrected that test baseline and reran successfully. No application rendering failure occurred |
| `python3 - <<'PY' … PY` (inline saved-JSON audit) | Asserted all 42 browser checks passed and exception/warning/error lists are empty; read actual dimensions, byte lengths, hashes, stage timings, revisions and resource counters from the saved evidence |

The final browser suite ran again after the last source edits and saved fresh evidence. No empty suite, suppressed error, mocked GPU pixel result, dependency installation, production-preview server, hosting/deployment or remote content upload was used. Vite's existing **500 kB chunk advisory** remains visible and non-blocking.

### Real-browser evidence

**Chrome 155.0.8059.86, headless real WebGL2 on macOS/Apple M2 Max, ANGLE Metal renderer**, default 1500×1000 CSS/DPR 1. Browser version/GPU/caps, all settings/revisions/counters and native summaries are saved in [pss07-browser-checks.json](evidence/pss07-browser-checks.json). The harness exercised actual labeled DOM controls/buttons, read the development panel's canonical RGBA snapshots, and separately read the native canvas's real `getImageData`. It did not mutate the store or mock rendering. Screenshots were visually inspected for native presentation; actual bytes/metadata/hashes establish native size/fidelity.

| Check | Observed evidence |
| --- | --- |
| Presets and custom dimensions | Every specified square preset **8/16/24/32/48/64/96/128/256** produced exact W/H, W×H×4 bytes, matching native target/backing canvas, nonempty subject/background, alpha only 0/255 and no transparent RGB. **96×64 = 24,576 bytes**, SHA-256 `94da1e9faf2fd52b7e6439d5d1233de41cb3ff05185e9f39d8452e6bc1c9359a`. Browser boundary allocations **1×1=4 bytes** and **1024×1024=4,194,304 bytes** also passed |
| Sphere/cube and normal-space orientation | Overhead illumination gave upper/lower hemisphere mean RGB sums **322.44 / 190**; underlight reverses them. Keeping overhead light but rolling camera **180°** produces the same reversed image/hash as underlight. Cube Upper Right/Upper Left produce distinct native hashes and lit faces. Rolled perspective remains usable. All seven pre-existing shapes produce nonempty lit binary-alpha native images |
| Alpha/background | Transparent frame: only 0/255 alpha, zero hidden RGB/partial coverage at all tested presets. Unit flat ambient emits exact base bytes **(92,136,184,255)** on every subject sample. Explicit solid **#123ABC** emits background **(18,58,188,255)**; switching back restores zero RGBA outside subject. Active light helpers and reference wireframe leave the canonical native hash unchanged |
| CSS/DPR/display isolation | Changed **1500×1000/DPR 1 → 1100×850/DPR 2**. The 96×64 canvas stays 96×64, identical SHA-256, identical capture/process counters; its CSS display changes **768×512 → 384×256**. Explicit **777×518 CSS** scaling also leaves native bytes unchanged |
| Latest publication/cache reuse | Light pose/color/intensity/ambient changes retain capture count; only processing advances. A burst of **80 light+camera edit pairs plus final values** coalesces to **one** additional capture and publishes the final settings/capture revisions. A later camera roll away/back reproduces the identical native SHA-256. Separate native-canvas `getImageData` bytes exactly match canonical RGBA |
| Target/resource lifecycle | Five keyed **StrictMode** remounts each leave **1 active WebGL runtime, 1 native target, 1 texture**, matching settings revision. Visible helpers settle at **4 geometries / 5 programs**. Six alternating 64/256 size changes retain one target/texture and exactly sized arrays. Actual **WEBGL_lose_context** removes both canvases and disables RGBA inspection; Retry preserves settings/rebuilds current pixels. Simulated native allocation failure shares the visible failure status and Retry; released target counters remain balanced with one active target afterward |
| Idle and measured stages | No captures/processes/display frames across a settled **1-second** interval. Final 256×256 sample: capture **0.4 ms**, synchronous readback+row flip **2.6 ms**, CPU processing **1.9 ms**. 1024×1024: **0.5 / 8.6 / 29.5 ms**. These are recorded samples, not frame-rate guarantees or GPU-only timestamps; broad profiling remains PSS-19 |
| Normal route / errors | `/` shows native 64×64 output, one WebGL canvas plus one 2D canvas, and zero development panels. Final browser exception/warning/error lists are **empty**. Mode switching keeps the interactive reference available. [Workspace](evidence/pss07-workspace.png), [8px](evidence/pss07-8.png), [32px](evidence/pss07-32.png), [64px](evidence/pss07-64.png), [256px](evidence/pss07-256.png), [96×64](evidence/pss07-96x64.png), [overhead](evidence/pss07-overhead.png), [cube right](evidence/pss07-cube-right.png), [cube left](evidence/pss07-cube-left.png), [rolled perspective](evidence/pss07-rolled-perspective.png), [reference](evidence/pss07-reference.png) |

### Acceptance and remaining limitations

| PSS-07 acceptance criterion | Result / evidence |
| --- | --- |
| 1. 8/64/256 and rectangular exact dimensions/lengths | **Passed**, pure dimension/limit fixtures, all nine browser presets + 96×64 + boundary allocations; actual target/frame/canvas metadata and byte counts |
| 2. Cube/sphere respond to direction; no helpers/partial alpha | **Passed**, pure normal/Lambert fixtures, native sphere/cube/roll comparisons, active-helper/wireframe identical hashes, zero partial alpha |
| 3. Transparent zero RGB/alpha; explicit solid color | **Passed**, exact CPU background fixtures and real native RGBA/solid-byte checks |
| 4. CSS resize/DPR/display scale preserve native backing pixels | **Passed**, native dimensions/hash/capture/process isolation across real browser emulation and explicit display scaling |
| 5. Correct orientation/latest revisions/cached lighting | **Passed**, asymmetric CPU row fixture, top/bottom and rolled-camera native images, generation/ownership fixtures, rapid browser edits and capture reuse |
| 6. Cleanup on size/context/unmount | **Passed**, idempotent disposal/state-restoration fixtures, target replacements, five StrictMode remounts, six native resize cycles and actual context loss/explicit retry |

No required acceptance check remains failed or unrun. Secondary browsers/GPU vendors, deliberate real hardware OOM and a production-preview run were not performed; allocation simulation/resource-cap tests and actual context-loss recovery establish the required failure path. Large-frame responsiveness and broader profiling remain PSS-19. No asynchronous readback was implemented or claimed. Exact subject fit, full preview navigation/comparison, tone/palette/effects and PNG/persistence are later work, not PSS-07 blockers. **Next executable task: PSS-08. Stop here.**


## PSS-08 completion record — 2026-10-24

**Status: Complete.** PSS-07's Complete row and prior real-browser evidence were verified, then its actual `NativeCapture`, native array processing, runtime/retry/scheduler, camera controller and validated state were inspected before editing. No prerequisite recovery or fabricated functionality was needed. There is still no Git repository; no Git state or diff is claimed. Only PSS-08 and necessary integration/documentation changes were implemented.

### Implementation and affected files

- Projection/calibration: new `src/scene/pixelFraming.ts` measures visible subject mesh vertices through matrixWorld and the rolled camera, derives an aspect-preserving native crop, calibrates against real native masks, places the measured subject and reports fit/depth/clipping failures. `src/scene/nativeCapture.ts` integrates this inside the existing render-state `finally` and target/cache owner. `src/scene/referenceRuntime.ts` publishes capture-keyed measurement metadata only after current-generation frame publication and clears it on disposal/failure.
- Native metadata: new `src/pixels/subjectBounds.ts` measures only category 255 into inclusive integer bounds or null. `src/pixels/nativeFrame.ts` carries the report with the canonical bytes. `src/app/studioStore.ts` adds only transient `nativeFraming` metadata; version-1 scene JSON, validated framing schema and dirty-revision ownership are preserved.
- Controls/interaction: new `src/components/FramingInspector.tsx` provides modes, requested width/height, all nine alignments, integer offsets, per-edge padding, clamping and measured/empty/clipping notices, plus isolated reset. `CameraInspector.tsx`, `NumericField.tsx`, `CanvasInspector.tsx`, `ReferenceViewport.tsx`, `src/App.tsx` and `scene/cameraController.ts` connect the controls and camera lock/help/caption. Pan/zoom gestures and camera pose/scale inputs lock in pixel-fit mode; orbit/roll and the explicit manual switch remain available.
- Tests: new `scene/pixelFraming.test.ts`; updates to `scene/nativeCapture.test.ts`, `scene/cameraController.test.ts`, `scene/lightController.test.ts` and `src/App.test.tsx`. Existing zoom-dependent gesture tests now explicitly choose manual mode, preserving their original input-ownership assertions under the activated default pixel-fit mode. New assertions cover mode locks/isolation and palette/light capture reuse.
- Documentation/evidence: updated README, ARCHITECTURE, ROADMAP, this progress record and the PSS-08 prompt's baseline integration note. Added `evidence/pss08-browser-checks.json`, `pss08-native-spheres.json`, `pss08-64x64.png`, `pss08-96x64.png` and `pss08-near-plane.png`. No package, lockfile, configuration or dependency changes.

### Decisions and boundaries

1. Fit box means maximum occupied size, independent of canvas. Alignment applies directly to the measured subject inside the padded drawable canvas. Left/top center margins use `floor((drawable − measured) / 2)`; odd remainder goes right/bottom. Integer offsets are added last (+X right/+Y down) and may intentionally clip. Oversized requested values remain stored; effective box clamps each axis with a visible notice. Existing validation rejects empty padded areas and invalid/noninteger input atomically.
2. Actual projected vertices, never rotated world Box3 corners, define the analytic estimate. A uniform projection multiplier/crop preserves geometry, normal space and perspective foreshortening. Fitting writes no orbit settings or object/normalization transforms. Explicit Reframe reference still commits manual camera settings. Reference display remains the saved projection; native fit is separate from that reference and from future preview-only zoom.
3. Calibration searches uniform scale within [0.875, 1.125] of the analytic estimate, at most **12 native samples**, alternating zero/±0.25-pixel phase shifts around a parity-aware initial center. It accepts a nonempty mask contained by both box axes and filling at least one. It restores the best sampled projection and performs **one final native placement capture**: maximum **13 rasterizations** per fit. Arbitrary shapes are never promised to fill both axes. A conservative projected-vertex guard detects a calibration clipped by the finite target. Failed calibration displays measured best/empty output and a notice, without scheduling a follow-up loop.
4. Edge-on/degenerate projected axes (relative threshold 1e−8) or near/far crossings use the saved manual projection with guidance. Nonfinite projections at a depth crossing preserve the specific depth reason. Users can switch to manual mode and recover camera distance/placement. Manual/offscreen/intentional clipping reports visible occupied bounds, not imaginary full dimensions. Helpers/receiver/background/effects are excluded from subject measurements. Later effects must provide separate extents.
5. Native normal/category buffers, projection/view cache and report survive light/palette edits under existing capture revisions. Geometry/camera orientation/canvas/framing changes recapture. Generation/revision guards, synchronous readback, target reuse, resource disposal and explicit Retry ownership remain in place. No renderer, scheduler, authoritative pose, cloud dependency, export implementation or later feature was added.

### Commands and automated verification actually executed

Environment: Node **v24.22.1**, npm **11.19.1**. Existing npm scripts/lockfile v3 and strict Vite/TypeScript/ESLint setup were checked. No install was necessary.

- `npm run dev -- --host 127.0.0.1` — Vite 8.3.5 served **http://127.0.0.1:5173/**. The owned server was restarted after source changes because this environment can retain stale Vite transforms. Final math/failure evidence used a freshly restarted server and reloaded page. The owned development server was stopped after verification. No public binding, deployment, upload or runner execution.
- `npm run typecheck` — pass (`tsc -b --noEmit`).
- `npm run lint` — pass, zero lint errors/warnings.
- `npm run test` — pass, **248 tests across 12 files**. Pure fixtures cover category-only inclusive bounds, all nine alignments/odd margins/asymmetric padding/offsets, clamping and empty validation, projected aspect, a rotated three-vertex triangle that differs from fictitious Box3 corners, transformed/signed/nonuniform geometry, extreme perspective projection, near-plane singular vertices, bounded correction and empty/impossible termination. StrictMode UI and installed OrbitControls tests cover camera locks, retained requests, rejected drafts, manual switches and isolated reset. Native control-flow fixtures cover palette/light reuse, publication guards and resource restoration; these test doubles are not pixel evidence.
- `npm run build` — pass (`tsc -b && vite build`), 53 modules; JS **862.05 kB / 233.43 kB gzip**, CSS **10.40 kB / 2.88 kB gzip**. Existing non-blocking Vite >500 kB chunk advisory remains visible and unsuppressed.
- Checks were run as `npm run typecheck && npm run lint && npm run test && npm run build`, then repeated after the final implementation/test changes. Initial integration runs exposed six old light-gesture tests assuming unlocked default zoom and one missing required select description; the UI description and explicit manual-mode test setup corrected those failures. No failing check remains.
- `node --version` and `npm --version` confirmed the versions above. A local `python3` independent read of saved canonical native RGBA arrays recomputed the exact coordinates and binary alpha, counted 812 subject pixels in each, and checked all stored transparent-frame bounds against their reports. It also confirmed 51 browser evidence records and zero application console warning/error entries. These are native-frame bytes, not decoded PNG export evidence.

### Real-browser evidence actually performed

Connected **Google Chrome on macOS**, real WebGL2 in the existing renderer, local `/?scene-checks`, viewport **1728×963**. Current browser-version/GPU strings were not asserted: the browser tool blocks `chrome://version`. This metadata restriction did not prevent actual rendering, UI input, synchronous mask readback, screenshots or any acceptance check. No canvas/WebGL mocks supplied pixel evidence. `pss08-browser-checks.json` contains **51** records; `pss08-native-spheres.json` contains the full canonical native arrays.

| Check | Requested / setup | Observed native result |
| --- | --- | --- |
| Canonical S1 mask | 64×64 canvas, 32×32 box, default ortho sphere | **x=16..47, y=16..47, 32×32, 812 subject pixels**, 2 total samples |
| Canonical S8 mask | 96×64 canvas, same 32×32 box | **x=32..63, y=16..47, 32×32, 812 subject pixels**, 2 total samples |
| Rectangular box | 96×64 canvas, 48×24 box, sphere | **24×24**, x=36..59/y=20..43; requested 48×24 clearly separate |
| Non-square aspect | 3:1 plane, 48×24 box | **48×16**, x=24..71/y=24..39; transforms preserved |
| Nine alignments / odd margins | 71×56; left/right/top/bottom padding 3/7/2/5; measured 32×32 | X leading positions **3 / 17 / 32**, Y **2 / 10 / 19** for all nine combinations |
| Offsets / clipping | Center offset −4,+6; then bottom-right and offscreen offset | Visible **x=13..44/y=16..47**; partial **32×31** reports clipped; fully offscreen reports null/clipped |
| Clamped request | 64×64, requested 32×32, left padding 60 | Effective **4×32**, sphere **4×4**, x=60..63/y=30..33; visible clamping notice |
| Geometry/projections | Cube/torus/plane, object rotations 25°/35°/15°, ortho and perspective | Ortho **31×32 / 29×32 / 25×32**; perspective **30×32 / 29×32 / 26×32**, all contained, measured and converged |
| Nonuniform mirror / FOV | Perspective plane scale X=−2/Y=0.5; FOV 1° and 179° | **32×24** for both extreme FOVs, without distortion or errors |
| Lighting cache | Intensity and Upper Left preset | Capture/raster counts unchanged (**46/92** in the initial broader check); processing advances; current final record also compares the complete before/after cache metadata |
| World placement / camera rotation | Subject position +9/−7; then Isometric view | Fit recenters to 32×32; orientation changes recapture; object data remains intact |
| Manual camera / mode isolation | Zoom 2; pan camera/target X=1; switch back to fit | Manual **64×64**, then **32×32 at x=0..31/y=16..47**; fit recenters and preserves saved camera/object state |
| Real keyboard/wheel | Reference arrows, Shift+arrow, native wheel | Fit blocks arrow-pan/wheel; Shift+arrow orbits. Manual arrow pans; wheel zoom **1→1.28014994** changes measured size **32×32→41×40**. Controller code is unchanged between these checks and final math extraction |
| Solid background exclusion | Solid display alpha covers 64×64 | Subject report stays **32×32 at 16..47**; display alpha bounds are separately 64×64 |
| Empty/thin/depth | 90° edge-on plane; scale 0.001×1000 and 1×1 box; perspective camera distance 0.5 inside sphere | Edge-on fallback **1** sample/null; thin failure **13** total samples/null; depth fallback **1** sample/null with explicit near/far and clipping notice. Manual distance 5 recovers visible output |
| Limits / reset | Width 0/1025, empty padding, 1×1 and 1024×64 native, framing reset | Invalid drafts rejected with state retained; 1×1 sphere occupies one pixel; 1024×64 keeps **32×32 at x=496..527/y=16..47**. Reset preserves subject/camera/light/palette/canvas |
| Idle / lifecycle / Retry | 29.577 s idle; 5 remounts; context loss then explicit Retry | Frames **107→107**, captures **86→86**. Each remount: 1 active runtime, 1 target, 1 geometry/1 texture/2 programs. Context loss clears measurement/canvases; Retry restores canonical 32×32. Zero application console warnings/errors |

Screenshots: [64×64](evidence/pss08-64x64.png), [96×64](evidence/pss08-96x64.png), [depth fallback](evidence/pss08-near-plane.png). Raw data: [native spheres](evidence/pss08-native-spheres.json), [browser records](evidence/pss08-browser-checks.json).

### Acceptance and remaining work

All **six PSS-08 acceptance criteria are satisfied**: (1) exact real native canonical masks; (2) independent canvas/box/manual scale; (3) aspect-preserved non-square output with honest achieved bounds; (4) nine alignments, odd floor rules, offsets/padding/clipping; (5) light cache stability, orientation refit and mode transform isolation; (6) invalid/empty/thin/near-plane termination and useful recovery. Automated invariants and actual browser results are distinguished above.

No PSS-08 blocker or failed/unrun required acceptance check remains. Calibration intentionally reports unattainable/empty results rather than promising both axes for arbitrary geometry. Projected-vertex clipping is conservative and reports visible occupied dimensions. GPU-vendor bitwise equivalence is not promised. PNG export/decoded confirmation remains **PSS-17**; palette guarantees remain PSS-11 and preview navigation remains PSS-09. Effects are still unimplemented and therefore have no extent report yet. The documented bundle advisory remains non-blocking. Stop here; **PSS-09 is next executable**, with no later task or runner started.


## PSS-09 completion record — 2026-10-24

**Status: Complete.** PSS-08's completion/evidence and actual native capture, bounded fitting, frame ownership, revisions/scheduler, OrbitControls and PSS-06 handle/controller were inspected first. No prerequisite was missing. Applicable AGENTS.md, README, npm manifest/lock v3, strict configuration, specification R04/R10 and S3/S8, architecture, roadmap and progress were read. This directory still has no Git repository (`git status --short` reports that fact); no Git initialization or clean-diff claim. Work is limited to PSS-09 and its integration/documentation.

### Implementation and files by purpose

- Presentation/mapping: new `src/scene/previewPresentation.ts`, `viewTransform.ts` and `previewTopology.ts`. Two exact W×H sRGB canvases consume cached native frame bytes. Separate image-space checker/grid and panel SVG light/topology helpers never enter those canvases. Rectangles include pan, zoom, letterboxing, title/readout areas and the comparison border. Hover reports top-left native pixel coordinates.
- Capture/lifetime/input integration: `scene/nativeCapture.ts` publishes owned continuous-before bytes independently of final and retains its exact fitted native camera. `referenceRuntime.ts` keeps the single hidden WebGL renderer/scene/target/scheduler/Retry owner, publishes both frames, fits the view only on the first valid frame and draws presentation for view-only work. `lightController.ts` selects the handle frame from the hit panel and ends stale ownership on view edits; `cameraController.ts` accepts the shared interaction host. PSS-06 `LightHandle.update`/arcball math now receives the actual displayed native image rectangle and fitted rolled camera. No second scene, renderer, editable camera pose or capture path.
- Controls/help/layout: `components/ReferenceViewport.tsx`, `NumericField.tsx` (optional slider for compact numeric zoom), `CameraInspector.tsx`, `SubjectInspector.tsx`, `src/App.tsx`, `App.css`. Final only / Original only / Compare, integer steps/numeric %, Fit, Native, Center, grid/checker toggles, canvas/subject/zoom/pan readouts, keyboard shortcuts and explicit tool instructions. Existing mesh-edge control remains useful as a view-only topology overlay; help discloses hidden faces. Development diagnostics add original bytes and actual view rectangles; fixed open-panel height prevents diagnostic output from moving the image while being inspected.
- Tests: new `scene/viewTransform.test.ts`; extended `scene/nativeCapture.test.ts`, `scene/lightController.test.ts`, `src/App.test.tsx`. Existing controller/normal/fit tests remain. Eleven added cases bring the suite to **259 tests in 13 files**.
- Documentation/evidence: README, ARCHITECTURE, ROADMAP, this record, PSS-09 baseline note and PSS-10 integration note (documentation only). `evidence/pss09-browser-checks.json`, `pss09-browser-zoom.json`, `pss09-screenshot-checks.json`, and compare/8× grid/8× nearest/small/final/native-browser-zoom screenshots. Existing evidence and user assets are retained. No package, lockfile, configuration or dependency adjustment.

### Decisions and boundaries

1. The required authoritative original is the **native continuous** frame with active smooth/flat normals, same light, native dimensions, crop/pose and background. It replaces the earlier high-resolution beauty presentation so both panels align exactly. They currently match because styling has not been implemented; distinct labels/colors and concise UI help state this honestly. PSS-10+ must preserve before before applying styling to final. A larger beauty view is optional and deferred, with no competing output path.
2. The shared presentation transform rounds its origin to CSS pixels, then adds independent CSS-pixel pan. Default steps are integers; fit chooses an integer when ≥1× fits, otherwise a bounded fractional nearest view with an unequal-display-width notice. Native/100% means one output pixel per CSS pixel at 100% browser zoom, not physical device pixels. Zoom range and pan validation reuse existing domain limits and view revisions. Fit is initial-once or explicit, never tied to every frame, scene edit or resize. Mode/layout changes preserve navigation; Fit recenters it on demand.
3. Pan preview owns primary drag/arrows; Shift+arrows moves 64 instead of 16 CSS px. Escape/cancel/lost capture/blur restores starting pan. F fits, N selects centered native, 0 resets view, +/− step zoom. Camera/Move light retain OrbitControls except during an owned light drag. A capture-phase wheel listener always changes preview zoom, anchored to the pointer; manual middle-drag and labeled camera distance/zoom controls provide camera dolly/zoom. Pixel-fit camera pan/zoom remains locked. Idle Move light still orbits from empty space.
4. Every helper is outside native buffers. Grid is suppressed below 4×; checkerboard follows the image rectangle with native-aligned cells independently of transparent/solid scene backgrounds. PSS-06 helpers retain helper-only scene layers; their SVG screen proxies use the fitted native camera, camera roll and panel-specific CSS rectangle without multiplying input by DPR. Light drags preserve distance/target and never move camera/subject. Explicit Reframe uses native aspect, matching the displayed crop.
5. Publication writes ImageData only for current settings frames. View, overlay, panel, DPR and resize work never calls `NativeCapture.update`, capture/calibration or CPU pixel processing. Original/final own separate stable byte arrays; no typed buffers enter React/store/JSON. All DOM listeners, pointer captures, canvases, subscriptions and native resources use the existing disposable renderer lifetime.

### Exact commands and automated results

Environment: **Node v24.22.1**, npm **11.19.1**, macOS. Existing package scripts and locked versions were checked; no installation was needed.

- `npm run dev -- --host 127.0.0.1` — Vite 8.3.5 at **http://127.0.0.1:5173/**. The owned server was restarted after edits to clear this environment's stale Vite transforms, then browser verification used freshly loaded source. Local only; stopped after verification.
- `npm run typecheck` — pass (`tsc -b --noEmit`).
- `npm run lint` — pass, zero ESLint errors/warnings.
- `npm run test` — pass, **259 tests / 13 files**. Rectangle/native coordinate round trips at 1/2/8/0.625×; rectangular comparison/letterbox/client origins; bounded zoom/fit/pointer anchoring; settings/capture/style/shadow isolation; stable independently owned before cache/current revisions/disposal; rolled orthographic/perspective handle translation; stale view-gesture termination; connected accessible controls/invalid drafts. Existing real Three invariants and scheduler tests pass. Canvas test doubles remain control-flow evidence only.
- `npm run build` — pass (`tsc -b && vite build`). The existing Vite >500 kB advisory is visible and unsuppressed; no build/runtime failure. Final measured bundle size is recorded in current limitations above.
- `node /tmp/pss09-probe.mjs` — initial sandboxed Chrome launch timed out; rerun outside the filesystem sandbox rendered correctly but its temporary-profile cleanup raced Chrome shutdown. The full script waits for shutdown/retries cleanup and passes. These were harness/environment failures, not accepted application evidence.
- `node /tmp/pss09-browser.mjs` — final pass, **46/46 real-browser checks**, no browser exceptions/console warnings/errors. Early runs corrected a harness variable redeclaration, stale served transforms and the actual comparison-border rectangle offset before final passing evidence. Final source was checked after restarting the owned dev server.
- `python3 - <<'PY' ... PY` and final `python3 /tmp/pss09-screenshot-checks.py` — Pillow analysis of actual Chrome screenshots (not mocked rendering), **51,968 opaque display samples** and **21,120 grid samples**, zero mismatches. Saved exact method/counts in `pss09-screenshot-checks.json`.
- Native Chrome browser zoom additionally exercised through CUA/Chrome **Command+0, Command+plus twice**, UI Compare/Fit/Inspect actions, followed by **Command+0** to restore. No injected frame/store mutation for that check. Saved before/after dimensions/bounds/SHA-256 and screenshot in `pss09-browser-zoom.*`.

Intermediate suites found two outdated UI-label expectations and one over-strict exact float comparison (sub-1e−15 arcball differences); expectations now reflect current labels and a 12-decimal numeric invariant. The final complete commands pass; no errors or tests were suppressed.

### Real-browser and visual evidence actually performed

**Chrome 155.0.8059.86**, real WebGL2, **ANGLE Metal / Apple M2 Max**, React StrictMode. Headless Chrome via local DevTools pipe at **1500×1000/DPR 1**, **1100×800/DPR 2**, **390×844/DPR 2**, plus page-scale emulation. Separate headed native Chrome at real **125% browser zoom**, DPR **2 → 2.5 → 2** after restore. Browser diagnostics and native input events established the following:

- Canonical **96×64**, **32×32** subject at **x=32..63/y=16..47**; final/native SHA-256 **`94da1e9faf2fd52b7e6439d5d1233de41cb3ff05185e9f39d8452e6bc1c9359a`** is unchanged at 100/200/800%, explicit fit/native, pointer/keyboard pan, grid/checker toggles, compare/original/final, sidebar toggles, viewport resize, DPR 2 and page scaling. Capture/process/geometry counters remain unchanged through each view-only operation. The separate native-browser-125% check retains the same hash, W/H and bounds.
- Comparison panels have identical scale/top edge; actual DOM image rectangles equal mapping diagnostics including the 1px divider. Before/final dimensions, coverage and current hashes match. Active flat-normal setup via the validated store action changes the original hash while preserving bounds and equality to the currently continuous final; this setup is explicitly separate from UI interaction evidence because normal-treatment UI belongs to PSS-10.
- Native pointer drags in **both panels**, **perspective + 37° roll**, after **2× zoom and pan (17, −9)** move light without camera/subject changes or normal recapture. Distance stays within 1e−9; target stays identical. Escape restores light and camera ownership. Empty-space Move light orbits, camera tool orbits independently, Pan preview changes no scene settings, and manual middle-drag changes camera zoom/distance while wheel changes only preview zoom.
- Grid visibly follows 8× boundaries; screenshot analysis verifies all **812 opaque native pixels × 64 display samples** equal exact canonical RGB. With grid enabled, changed screenshot samples occur **only** on the top/left boundary of each 8×8 block, with zero differences in the other block samples. Grid suppression below 4× and fractional-zoom notice were checked. Nearest blocks and aligned before/after panels were visually inspected in saved screenshots, including the 390px compact layout. Small layout has no horizontal document overflow; Fit/Native/Compare/inputs remain reachable.
- Three StrictMode remounts each retain **one active renderer, one native target, one uploaded geometry and one texture**. Real context loss removes all canvases; explicit Retry restores the current revision and one target. Zero browser console warnings/errors/exceptions in the final 46-check run. The separate native Chrome zoom screenshot verifies readable controls at 125%; browser zoom was restored afterward.

### Acceptance and remaining limitations

All **five PSS-09 criteria are satisfied**: (1) native bytes and measured dimensions invariant at 1×/2×/8×/fit, plus resize/DPR/native browser zoom; (2) grid/checker/light/topology helpers excluded from final bytes; (3) aligned native original/final poses/dimensions with distinct labeling and current-normal behavior; (4) exclusive pan/light/camera ownership and exact panel/roll/zoom/pan mapping; (5) sidebars, narrow layout, DPR and actual browser zoom preserve W/H with usable controls. Pure/DOM tests, actual browser behavior, screenshot sampling and native-browser checks are distinguished above.

No PSS-09 blocker, failed required check or unrun required acceptance item remains. Styling and PNG export remain PSS-10+ and PSS-17; no palette/dither/outline/export functionality was added. The optional larger beauty view is deferred. Offscreen proxy handles remain recoverable with Fit/Center/numeric controls. Grid is intentionally suppressed when too dense, and fractional nearest presentation can have unequal physical block widths. No second-engine browser compatibility claim or GPU-vendor bitwise-equivalence claim is made; neither is a PSS-09 acceptance requirement. The existing bundle advisory remains non-blocking. **Next executable task: PSS-10. Stop here.** No later prompt or sequential runner was executed.


## PSS-10 completion record — 2026-10-24

**Status: Complete.** PSS-09's completed row, browser evidence and actual `NativeCapture.getBeforeFrame`/presentation/invalidation owners were inspected before implementation. All five PSS-10 acceptance criteria now have the evidence below. No later implementation task or sequential runner was executed.

### Implementation and affected files

- **Math and pixels:** new `src/domain/shading.ts` provides unit-domain illumination luminance, signal adjustments, piecewise ramp coordinates/index, original RGB-byte extraction and linear-RGB ramp generation. `src/pixels/nativeFrame.ts` maps continuous or exact cel/bands after shared Lambert math. Selected ramp bytes bypass all later conversion/adjustment; transparent/solid backgrounds preserve their existing contract.
- **Capture and state:** `src/scene/nativeCapture.ts` copies continuous Original before styling Final, retaining independent publication ownership/revision guards. Its existing shader uniform chooses smooth versus true derivative face normals; the double-sided flat back-face flip is corrected. `src/app/studioStore.ts` adds validated atomic level and explicit generation actions while preserving existing settings schema/reset/dirty contracts.
- **UI:** new `src/components/ShadingInspector.tsx`; integrated through `src/App.tsx`. Existing number/range/color/select primitives serve all implemented controls, errors and reset. Level count is staged until Apply; trailing removal is disclosed; generation is explicit. Normal treatment is independent in cel/bands. `CanvasInspector.tsx` and `ReferenceViewport.tsx` replace obsolete continuous-only/comparison copy; app help and read-only stored ramp copy describe current behavior.
- **Focused tests:** new `src/domain/shading.test.ts`; extended `src/pixels/nativeFrame.test.ts`, `src/scene/nativeCapture.test.ts`, `src/app/studioStore.test.ts` and `src/App.test.tsx`. Fifteen new tests bring the suite to **274 in 14 files**. Existing renderer test doubles remain lifetime/control-flow evidence only; GPU fixtures establish real pixels.
- **Docs and evidence:** README, ARCHITECTURE, ROADMAP, this progress record, integration notes in PSS-10/PSS-11 prompts. New `evidence/pss10-browser-checks.json`, `pss10-webgl-checks.json`, reproducible `pss10-webgl.html`, and final/generated-ramp/smooth-sphere/flat-sphere/flat-cone/WebGL PNGs. Standard build/cache outputs regenerated. `package.json`, lockfile, dependencies and configuration are unchanged; no Git repository was initialized.

### Consequential decisions

1. Scalar ramp placement uses **clamp01(0.2126·I.r + 0.7152·I.g + 0.0722·I.b)** from linear Lambert illumination before base reflectance. Unit white maps to 1; intense light saturates without renormalizing against current light strength. Colored light tints continuous RGB but cannot alter selected stored ramp bytes.
2. Signal order is **clamp input → centered contrast → brightness → clamp → distribution exponent**, before selection. Continuous mode applies this to linear base×illumination channels. Original bypasses all tone/signal adjustments while sharing normals, base reflectance, light, fitted camera, W/H and background. Two synchronous CPU passes use the existing work buffer; publications each own their bytes.
3. The pure mapper interpolates knots `(0,0)`, `(threshold[i],i+0.5)`, `(1,N−1)`. `floor(q+0.5)` selects the higher artist index at equality. One color always selects index 0; endpoints are deterministic. Monotonic thresholds remain validated atomically; bad drafts show errors and retain settings/frame revisions.
4. Cel and discrete bands share this mapper and existing ordered entries; no silent palette/count reset occurs when selecting a mode. Smooth/flat are continuous with corresponding normals. Cel/bands retain independent normal treatment. The mounted inspector remembers prior band thresholds during a continuous-mode visit; version-1 continuous JSON has no inactive threshold field. Persistent inactive-mode memory is outside this schema/task.
5. Level changes require **Apply levels**, keep retained colors/boundaries, append highlight bytes for growth and split only the remaining upper interval. Shrink explicitly removes trailing entries after the notice. **Generate ramp from colors** replaces all entries only on request, sampling shadow→base→highlight in linear RGB with base at 0.5; one color is base, two are shadow/highlight. PSS-11 extends editing/presets/resampling; none was implemented here.
6. One capture-owned derivative/interpolated-normal shader avoids cloned/nonindexed geometry and handles nested static-mesh model-view transforms. Screen derivatives already face the visible side; only interpolated normals need back-face reversal. Every shape, including pyramid, now obeys explicit normal treatment instead of forcing pyramid flat while settings say smooth. Real static-mesh fixtures verify nested nonuniform and mirrored transforms without implementing import. File import remains PSS-16.
7. Normal changes alone dirty capture; tone, thresholds, levels, colors, light and signal edits reuse normals. Presentation remains unchanged. The architecture and next-task integration notes now specify the exact formula and actions rather than leaving normalization/resizing ambiguous. No dependency or configuration adjustment was necessary.

### Commands and results

Environment: **Node v24.22.1**, **npm 11.19.1**, installed Three **0.186.1**. Commands established by PSS-01 remain present in `package.json`.

| Executed command | Actual result |
| --- | --- |
| `git status --short` during initial inspection | No `.git` repository, as documented; no Git state/diff claim made |
| `node --version && npm --version` | v24.22.1 / 11.19.1 |
| `npm run dev -- --host 127.0.0.1` | Vite 8.3.5 ready on local port 5173; no public binding/deployment. Restarted the owned server once to clear stale Vite transforms, then reloaded Chrome |
| Initial `npm run typecheck`, `npm run lint`, `npm run test` | Lint passed. Typecheck caught an inferred `string[]` ramp return; explicit `SrgbColor` return fixed it. 258/259 tests passed; the historical Before=Final assertion correctly failed after real styling. Replaced it with exact distinct before/final expectations and signal/capture invariants |
| `npm run test > /tmp/pss10-tests.log 2>&1; tail -60 /tmp/pss10-tests.log` | After fixes/new coverage: **274/274 tests**, **14/14 files**, 3.25 s |
| `npm run typecheck` | Passed after ramp return fix |
| Final `npm run typecheck && npm run lint && npm run test && npm run build` | All passed; **274/274 tests**, **14/14 files**, 3.65 s. Production JS **880.87 kB / 238.96 kB gzip**, CSS **11.75 kB / 3.21 kB gzip**; Vite 500 kB advisory remains visible and unsuppressed |

No unavailable script, empty suite, mocked WebGL pixel claim or unrun-check pass was substituted. Development HTTP/source inspection also identified stale Vite-transformed help copy; restarting the server served current source. An initial standalone GPU fixture imported a second Three instance, producing a warning; switching its import to the same Vite-resolved `three` module fixed it. The final refreshed app/fixture run has **zero warning/error console entries**. The first tab navigation preceded server startup and showed connection refused; after starting the authorized local server, reload succeeded.

### Real-browser and GPU evidence

Actual Chrome tab at **`http://127.0.0.1:5173/?scene-checks`**, reported UA **Chrome/154.0.0.0**, macOS, **DPR 2**, **ANGLE Metal / Apple M2 Max**. Screenshots were inspected visually in the actual browser; all numerical checks read the authoritative frame/diagnostics through visible development controls. `pss10-browser-checks.json` records **34 passing checks**; `pss10-webgl-checks.json` records **8 passing real-GPU fixtures**.

- **Canonical frame:** 64×64, measured subject x/y=16..47, 812 covered pixels. Final contains exactly the four stored blues, allocated **140 shadow / 115 lower-mid / 154 upper-mid / 403 highlight**; Original has **189 continuous RGB colors**. Original/final bytes differ while mask, dimensions and framing agree.
- **Cube/moved light:** isometric cube changes **224 face pixels** from upper-mid to shadow under Upper Right→Upper Left. Object/camera settings are identical; normal-capture count stays **3**. Continuous red light visibly changes RGB; banded red light emits only stored blues. Intensity 10 directional + 10 ambient selects highlight; zero/zero selects shadow. Brightness −1/+1 independently selects exact endpoints.
- **Smooth/flat surfaces:** actual low-segment sphere **8×4** has **187 smooth colors versus 12 flat colors**, identical coverage, one normal recapture and no geometry rebuild. Mirrored cone with 6 radial segments, scale **(−2, 0.5, 1.4)** has **46 smooth versus 2 flat colors**, matching masks and unchanged geometry-build count. Screenshots show continuous/faceted appearance. Flat-normal cel keeps its flat continuous Original byte-identical while Final selects ramp bytes.
- **Controls:** brightness, contrast and distribution each change shade allocation. Original remains byte-identical through signal edits. Equal threshold draft is visibly invalid and changes neither settings revision nor frame. A custom 0.1 first boundary changes pixels without capture; mode round trip retains it. Levels 1 and 32 work; single-level output uses the first stored byte and no thresholds; 32 entries have strictly increasing boundaries. Staged count does not remove entries before Apply. Explicit generation from custom shadow/base/highlight is verified both in stored entries and across all four visible regions: **#301B28 #A56453 #D6A07B #F4D7A1**.
- **Scheduling/lifetime:** 32 named-mode switches retain **one geometry / one texture / one program / one native target**, no geometry rebuild, and latest revision publication. Zoom/pan/grid/checkerboard/compare keep both complete byte arrays and capture/process counts unchanged. Actual native wheel **8×→7×** keeps counts **2/2** and identical frame bytes. Three StrictMode remounts each retain one renderer/target/geometry/texture. Real context loss removes output and offers Retry; Retry restores the matching revision and exact prior bytes.
- **Independent real GPU fixtures:** nested static triangle with rotation/nonuniform scale matches independently transformed face illumination at **239/239/239**; mirrored nested variant matches **230/230/230**. Input vertex buffers stay unchanged. Back-facing double-sided planes are correct in both normal modes (**255/255/255** with source behind). Independent 8×4 sphere has **141 smooth / 12 flat colors**, identical mask. All **6 created native targets are disposed**, with **0 remaining geometries/textures** in the fixture renderer after cleanup. This fixture uses real WebGL, not the native-capture control-flow test double.

### Acceptance and remaining limitations

| PSS-10 acceptance item | Evidence / result |
| --- | --- |
| 1. Cube responds to moved light with independent object/camera | **Satisfied:** actual Chrome face-byte changes, unchanged poses, capture reuse; existing camera/light isolation tests retained |
| 2. Correct distinct smooth and flat geometry shading | **Satisfied:** real sphere/cone images and color counts; independently calculated nonuniform/mirrored/static-mesh and back-plane GPU fixtures |
| 3. Counts/thresholds/signals have deterministic valid behavior | **Satisfied:** CPU endpoints/equality/order/generation/validation fixtures; connected DOM drafts/Apply/reset test; real browser signal/threshold/1–32 level changes |
| 4. Fixed ramp uses only stored entries under colored light | **Satisfied:** exact CPU byte fixtures and actual browser color-set checks, including generated ramp with every entry visible |
| 5. Continuous comparison, no stale publication/leaks | **Satisfied:** independent before-byte ownership tests; real original isolation, tone-only reuse, latest revisions, 32 switches, view/wheel skip, remount and context/Retry checks |

No required criterion, failed check or unrun required browser item remains. Byte-normal capture has finite GPU precision near sharp boundaries; universal cross-GPU raster equality is not claimed. Full palette entry editing/presets/interchange/nearest-color mode remain PSS-11, dithering PSS-12/13, import PSS-16 and PNG PSS-17. Secondary browsers/GPU vendors, production preview and later-task functionality were not exercised here; none substitutes for a required PSS-10 check. Existing bundle-size advisory is non-blocking. **Next executable task: PSS-11. Stop here.**


## PSS-11 completion record — 2026-10-24

**Status: Complete.** PSS-10's completed row, acceptance/GPU evidence and actual shading/native-frame/capture/store/inspector implementation were inspected first. All five PSS-11 acceptance criteria are verified below. No later task or sequential runner was executed. No Git repository was present or initialized.

### Implementation and affected files

- **Color/pixels/state:** `src/domain/shading.ts` extends the existing owner with cached decoded colors/original bytes, squared-linear-RGB nearest selection and explicit ordered resampling, sharing interpolation with the existing generator. `src/domain/validation.ts` exports the existing palette validator. New `src/domain/paletteInterchange.ts` implements bounded palette-only JSON/hex parsing/serialization. `src/pixels/nativeFrame.ts` activates palette mode and strict background mapping; `src/app/studioStore.ts` adds atomic import/resample actions and shares list replacement logic. Original/capture owners are unchanged.
- **Editor/UI:** new `src/components/PaletteInspector.tsx`; `ShadingInspector.tsx` exposes nearest mode and independent normals; `ColorField.tsx` supports live picker input plus final change. `src/App.tsx` replaces read-only swatches with the editor and updates help; `src/App.css` styles entry actions/text interchange. Add/remove/move/hex/picker/preset/reset/resample controls are connected to validated state. File reading stages text for review and aborts on replacement/edit/unmount. Data-URL configuration downloads require no object-URL lifetime.
- **Tests:** new `src/domain/palette.test.ts`, extended `src/pixels/nativeFrame.test.ts` and `src/App.test.tsx`. **31 new tests**, **305 total in 15 files**. They cover documented preset bytes, transfer knees/endpoints, independently calculated distance/ties, duplicates/cache/counts, ordered resampling, import/serialization/boundaries, exact output/effects and real component interactions/FileReader/download payloads. No canvas/WebGL test double is used as pixel evidence.
- **Documentation/evidence:** README, ARCHITECTURE, ROADMAP, this record; `evidence/pss11-browser-checks.json`, `pss11-native-frames.json`, `pss11-native-checks.json`, `pss11-verify-native.py`, `pss11-final.png`. Normal dist/cache artifacts were regenerated. No package, lockfile, dependency, settings-schema or configuration change was needed.

### Consequential decisions

1. Keep one artist-ordered list for ramps and nearest palettes. No sorting or deduplication. Built-in bytes were already correct and are unchanged. Inspired names explicitly avoid historical hardware claims. Same-count edits/moves keep boundaries. Add uses PSS-10 retain/append behavior; remove and explicit count-changing list replacement reset active boundaries evenly, as disclosed. Ordinary Apply levels retains its exact previous behavior.
2. Palette input is adjusted continuous linear base×illumination, using the established clamp→centered contrast→brightness→clamp→distribution signal order. Distance is unweighted squared Euclidean linear-sRGB RGB, not perceptual distance. Strictly smaller comparisons preserve lowest-index exact ties. Selected stored bytes bypass encoding and all later adjustments. WeakMap caching follows immutable validated color-list identity, reused across light/signal edits without retention leaks.
3. Saturation means clipping linear energy/signal to [0,1], not HSV/HSL saturation editing. Smooth/flat encode once; fixed ramps and nearest matches write original bytes. Generated/resampled entries interpolate linear RGB then store converted bytes once. Resample follows the existing ordered piecewise color path; exact knots/endpoints remain unchanged, N=1 keeps the first entry, and growth from one entry repeats it. Generation still follows shadow/base/highlight instead. All replacements are explicit and disclosed.
4. JSON is exactly `{schemaVersion:1,colors:["#RRGGBB"],effectPolicy:"explicit"|"strict"}`; all fields required, unknown fields/versions rejected. Hex lists allow whitespace/commas and optional #, retaining the current policy. Both retain duplicates/order and normalize case. Limit is 1–32 entries and 16 KiB input. Palette interchange intentionally excludes tone/thresholds/complete scene/image data. Imports validate before one store commit; bad imports do not alter settings, revisions or pixels.
5. Subject is restricted only in cel/bands/palette modes; transparent alpha is excluded. Explicit policy permits separately configured background and future outline/ground/shadow colors. Strict policy currently maps solid background by the same nearest metric before byte writing, independent of subject signal controls. Future effects must honor the same policy; continuous subject and Original remain explicitly unrestricted. No later effect algorithm was added.
6. Browser automation exposed stale Vite transforms: served source lacked recent optional-# parsing/picker-input changes even after filesystem edits. Restarting only the owned server and reloading served current source. Final records were taken after the restart. Live picker input is now handled as well as final change, and valid duplicate events do not increment revisions twice.

### Exact commands and results

Environment: **Node v24.22.1**, **npm 11.19.1**; `package.json` still exposes every established PSS-01 command. Installed Google Chrome plist reports **155.0.8059.86**, macOS reports **27.0**. No dependency installation was required.

| Executed command | Result |
| --- | --- |
| `git status --short` | Expected failure: no Git repository; no clean-diff/commit claim |
| `node --version && npm --version` | v24.22.1 / 11.19.1 |
| `npm run dev -- --host 127.0.0.1` | Vite 8.3.5 on http://127.0.0.1:5173; owned server restarted once to clear stale transforms. Local only |
| Initial `npm run typecheck` | Pass |
| `npm run lint && npm run test` | Pass, baseline **274/274** tests after initial implementation |
| `npm run typecheck && npm run test` with new fixtures | Typecheck passed; **301/302** tests passed. Optional-# hex-list test exposed mismatch with advertised format; parser corrected |
| `npm run typecheck && npm run lint && npm run test` | All pass, **305/305 tests, 15/15 files**, 4.16 s |
| Final `npm run typecheck && npm run lint && npm run test && npm run build` | All pass, **305/305 tests, 15/15 files**, 4.19 s. Vite production build: 60 modules, JS **889.56 kB / 241.87 kB gzip**, CSS **12.41 kB / 3.34 kB gzip**. Existing chunk advisory remains visible |
| `python3 docs/pixel-shading-studio/evidence/pss11-verify-native.py` | **52/52 saved native-frame assertions**, 26 actual browser frames; writes membership/alpha/equality/revision checks and SHA-256 hashes |
| `plutil -extract CFBundleShortVersionString raw -o - '/Applications/Google Chrome.app/Contents/Info.plist' && sw_vers -productVersion` | Chrome 155.0.8059.86 / macOS 27.0 |

Read-only source/HTTP inspection compared the stale Vite transform with current files before restart. A browser evidence-helper variable reset caused one inspection-script error; the final fresh-tab run uses a single stable evidence container and persisted records. An initial selector used the native AX checkbox role for Compare; the DOM identifies it as a button, corrected before the screenshot. Neither was an application rendering failure. Final console has **zero warnings/errors**.

### Browser/manual and native-byte evidence

Actual connected **Google Chrome**, macOS, **1728×963** screenshot viewport, real WebGL2 at `http://127.0.0.1:5173/?scene-checks`. GPU vendor/DPR were not asserted. Visible development Inspect native/original RGBA controls supplied the authoritative frame arrays. **42 records**, **26 raw frames**, and **52 independently rerunnable saved-array assertions** are retained in evidence; records include blocked file-plumbing checks and must not be described as 42 passing assertions. The screenshot was visually inspected: continuous Original and four-band sphere align, checkerboard stays outside the data, editor labels/pickers/order actions are visible in the scrolling inspector.

- **S1:** 64×64 native, bounds **x/y=16..47**, 32×32 subject, **812 opaque pixels**. Exact final allocation: **#172038:140, #304878:115, #5C88B8:154, #B8D8F0:403**. Original/continuous has **189 RGB colors**. All transparent pixels are zero RGBA. Cel/bands match exactly; nearest mode emits only stored blues (three happen to be used), with capture revision unchanged.
- **Presets/editor:** every preset displays and renders exactly its four documented RGB entries. Hex `#1279AB`, picker `#ABCDEF`, then Move entry 2 earlier yields **#ABCDEF #1279AB #5C88B8 #B8D8F0**. Add/remove retains remaining artist order. A valid mixed-case/optional-# list imports as **#FFFFFF #000000 #1279AB #1279AB**, retaining duplicates. JSON import applies its strict policy. One entry disables Remove; 32 entries disable Add; staged counts do not apply until requested.
- **Atomic failures:** malformed JSON `{`, 33 entries and invalid hex each show a useful error and preserve the complete native byte array, settings export and frame revision. Pure tests additionally cover unknown versions/fields, wrong types, missing/invalid policy, empty input, alpha hex and oversized text. Actual FileReader component tests establish staged review/apply and oversized-file rejection without WebGL mocking.
- **Nearest allocation:** default nearest blues allocate **131 shadow / 234 mid / 447 base**; brightness +0.25 yields **466 base / 346 highlight**; contrast 2 then yields **202 shadow / 161 mid / 449 base**; red directional light yields **812 shadow**. Each changes allocation without unauthorized subject colors. One/duplicate `#1279AB` palettes remain exact under varied settings. Under unit ambient, continuous Original and palette Final both equal **#1279AB at all 812 subject pixels**, with complete frame-byte equality proving no double conversion.
- **Resampling/effects:** explicit 3→5 resample of white→black→red produces **#FFFFFF #BCBCBC #000000 #BC0000 #FF0000** in that order; staged entries remain unchanged before Apply. Explicit background **#FEDCBA** appears at 3,284 non-subject pixels; strict maps those to exact **#BCBCBC**. Transparent mode returns those pixels to zero RGBA.
- **Reuse:** the entire final browser sequence retains **1 capture, capture revision 0, 1 geometry build, 1 geometry / 1 texture / 1 program**. Source/UI inspection and unit tests establish cached palette preparation. No new graphics owner, continuous loop, external service or object URL was introduced.

### Acceptance and remaining limitations

| PSS-11 acceptance item | Evidence / result |
| --- | --- |
| 1. Canonical blue sphere exact membership | **Satisfied:** actual S1 bytes, four precise colors/counts, correct native mask/bounds; saved-array assertion |
| 2. Built-in bytes and custom order | **Satisfied:** independent documented-byte tests; actual preset frame arrays and UI hex/picker/move/add/remove/export order |
| 3. Nearest fixtures/ties/one-color/duplicates/transfer endpoints | **Satisfied:** independently calculated CPU distance fixtures, transfer-knee/endpoints/all-byte round trips; actual one/duplicate/native conversion checks |
| 4. Atomic valid/invalid import | **Satisfied:** real browser JSON/hex text imports and whole-frame/revision preservation on failure; shared validator/store and actual FileReader component tests |
| 5. Lighting/signal allocation without unauthorized subject RGB | **Satisfied:** exact native brightness/contrast/red-light allocations and pure process membership/endpoint tests |

**Unrun extra checks:** native browser file selection and downloaded-file round trip could not complete because the browser tool's upload/download permission services were unavailable/dismissed. Both errors were recorded; neither gate was bypassed or counted as a pass. The mandatory browser import checks use the supported text path; exact configuration payloads and real FileReader review/apply are also covered by component tests. No listed acceptance item remains open, but no native OS file-dialog/download integration pass is claimed. PNG export is PSS-17, saved scenes PSS-18; no later functionality was started. Secondary browsers/GPU vendors and production preview were not exercised. Existing bundle advisory is non-blocking. **Next executable task: PSS-12. Stop here.**


## PSS-12 completion record — 2026-10-24

**Status: Complete.** Verified the PSS-11 completed row, evidence, actual cached linear nearest/ramp mapper, signal order, exact byte writes, palette controls, native capture/row orientation and current scheduling before editing. PSS-12 was absent. All five acceptance criteria are satisfied with the evidence below. No later prompt or runner was executed; no Git repository was present or initialized.

### Implementation and affected files

- **Algorithm/pipeline:** new `src/domain/orderedDither.ts` provides frozen recursive Bayer ranks, midpoint thresholds, floor-scaled native lookup, prepared ramp/nearest quantizers and cached palette spacing. `src/pixels/nativeFrame.ts` accepts existing settings' dither/canvas metadata and selects subject colors before writing stored bytes. NativeCapture's existing full-settings call automatically supplies both fields; its capture/shader/framing code and lifecycle are unchanged.
- **Controls/diagnostics:** new `src/components/DitherInspector.tsx` exposes implemented algorithms, strength, native pattern scale, ramp-only width, inactive-mode help and isolated reset using existing validated actions/controls. `src/App.tsx` mounts it and updates help. `src/scene/referenceRuntime.ts` adds actual DPR to existing development diagnostics for browser-zoom proof.
- **Tests:** new `src/domain/orderedDither.test.ts` and `src/pixels/orderedPixels.test.ts`; extended `src/App.test.tsx` and `src/scene/nativeCapture.test.ts`. **29 new tests, 334 total in 17 files.** Exact 2/4/8 fixtures/permutations, midpoint normalization, scale 1/2/8 and origin/repetition, gradient/width/strength goldens, asymmetric 4×3 mask/receiver/row-flip goldens, all-size cel/bands/palette zero equivalence, membership, continuous bypass, bad dimensions, one/duplicate colors, connected controls/serialization/reset and cached capture/Original ownership are covered. Renderer test doubles establish control flow only; browser bytes provide actual pixel evidence.
- **Documentation/evidence:** README, ARCHITECTURE, ROADMAP, this record; `evidence/pss12-browser-frames.json` (46 complete Final/Original frame pairs, settings, hashes, preview and resource counters), `pss12-verify-native.py`, `pss12-native-checks.json`, `pss12-ramp-8x.png`, `pss12-ramp-16x.png`, `pss12-bayer2-8x.png`, `pss12-bayer8-8x.png`, `pss12-final.png`. Normal dist/TypeScript cache artifacts were regenerated. No package, lockfile, dependency, schema/default, store revision, configuration or permanent presentation-style change was made.

### Consequential decisions

1. Bayer expansion uses `[4B,4B+2;4B+3,4B+1]` from `[0,2;3,1]`. Threshold is `(rank+0.5)/N²` at `floor(x/scale),floor(y/scale)` modulo N. Coordinates come from the actual top-left row-major native buffer and explicit width. NativeCapture performs the existing single GPU row flip. Mask holes and reserved receiver category 128 do not restart or shift the pattern.
2. Ramps use the specified **`q + strength*(0.5-t)*transitionWidth`**, then existing half-up selection bounded to valid indices. None/zero strength returns the original mapper before threshold math; zero width and one shade also return it. Cel/bands share this mapper and keep artist order. No perturbation occurs after color selection.
3. Palette amplitude is **minimum positive pairwise Euclidean linear-RGB distance / √3**, capped at 1; no positive pair gives zero. Duplicates do not affect spacing, order or lowest-index ties. Each adjusted continuous channel receives **`strength*(0.5-t)*amplitude`**, clamps to [0,1], then enters existing nearest selection. The displacement vector is less than half the smallest distinct spacing at full strength. This intentionally conservative neutral-axis shift can be weak with near-duplicate colors and is not perceptually optimized. A weak cache follows existing prepared-palette identity and allocates no graphics resources. Ramp width is retained but irrelevant in nearest mode.
4. New Bayer settings default to strength=1, width=1, scale=1; switching sizes keeps those values. A mounted inspector remembers settings across None toggles; None JSON still contains only kind. Continuous modes retain active dither data, explain inactivity and hide numeric controls. Reset dithering restores None without touching shading/palette. Existing finite/integer validation and version-1 serialization stay intact. Unsupported future nonzero algorithms report an explicit runtime error until implemented; they are not offered as working choices.
5. Only subject category 255 enters the quantizer. Alpha, transparent zero RGB, strict/explicit background selection and reserved regions preserve their existing behavior. Original is still generated before styling, bypassing signal and dither. Dither edits dirty style only, reuse captured normals/target/framing and never rebuild geometry. View changes do not process again. No temporal/random input, resampling, worker, new scheduler, cloud service or hosted asset was added.
6. Initial browser source was stale after edits, as already documented in PSS-11. Restarting only the owned localhost server and reloading served current source. Required DPR checks used actual native Chrome zoom rather than a mocked devicePixelRatio. Native tab key shortcuts initially had no measured effect; activating the owned tab through Chrome and using native keys produced measured DPR changes. Two read-only browser inspection attempts failed (generic-role selector and unavailable navigator in the DOM evaluator); full pre text and local application metadata supplied the correct evidence. No application warning/error was hidden.
7. Compare's existing checkerboard sometimes appeared as stripes/solid fills after browser zoom, despite correct native alpha and unchanged bytes. Linear-gradient and bundled-SVG experiments also reproduced it; both were reverted, including the temporary asset. The final code retains the prior checkerboard implementation. This is a **non-blocking presentation issue for PSS-19**, not native dither noise, coverage changes or a new regression. Final comparison screenshot has checkerboard off; final-only 8×/16× ordered visuals were also inspected with checkerboard on.

### Exact verification commands and results

Environment: **Node v24.22.1, npm 11.19.1; Google Chrome 155.0.8059.86 on macOS 27.0**, connected real WebGL2, screenshot viewport **1728×963** at 100% browser zoom. Actual DPR measured **2 → 2.200000047683716 → 2.5 → 2**, and repeated **2 → 2.5 → 2** with the final code. GPU vendor was not asserted. Package.json still exposes every PSS-01 quality/dev command.

| Executed command | Result |
| --- | --- |
| `node --version && npm --version` | v24.22.1 / 11.19.1 |
| `git status --short` | Expected failure: not a Git repository; no Git status/diff claim |
| `plutil -extract CFBundleShortVersionString raw -o - '/Applications/Google Chrome.app/Contents/Info.plist' && sw_vers -productVersion` | Chrome 155.0.8059.86 / macOS 27.0 |
| `npm run dev -- --host 127.0.0.1` | Vite 8.3.5 at http://127.0.0.1:5173; six owned starts/five source-change restarts, local only. Browser used `/?scene-checks`; owned server stopped with Ctrl+C after verification |
| `npm run typecheck && npm run test` | Initial integration pass, existing 305/305 tests, 15/15 files, 4.07 s |
| `npm run test -- src/domain/orderedDither.test.ts src/pixels/orderedPixels.test.ts` | Initial fixture run: 26/27 passed. A chosen 4×4 gradient happened to give identical Bayer-4/8 selections; corrected the test to use a hand-calculated near-endpoint sample distinguishing their actual thresholds. No algorithm was changed to force a fixture |
| `npm run typecheck && npm run lint && npm run test && npm run build` | Four runs passed after fixture/UI coverage, diagnostic addition, presentation experiment and final revert respectively; each **334/334 tests, 17/17 files**. Final tests **4.73 s**. Final Vite **62 modules**, JS **894.69 kB / 243.50 kB gzip**, CSS **12.41 kB / 3.34 kB gzip**, build 180 ms. Existing >500 kB advisory remains visible |
| `python3 docs/pixel-shading-studio/evidence/pss12-verify-native.py` | First 418/418 assertions on 41 frame pairs; after final source/DPR checks **475/475 assertions on 46 real-browser Final/Original pairs**. Independently rerunnable membership, alpha/background, equality, hashes, bounds, resource/capture/view/DPR assertions |

Read-only source/configuration/lockfile inspection used rg/cat/sed and preserved the existing npm project. Browser interaction used actual UI selectors and native Chrome keys; native arrays came from the visible development Inspect actions. No mocked WebGL/canvas supplied pixel evidence. No install, publish, deployment or runner command was executed.

### Actual browser observations and acceptance

- **S3 sphere:** canonical 64×64 output, 32×32 subject at x/y=16..47, **812 subject pixels**, transparent zero RGBA elsewhere. None hash **f1ee8e1f…6641**; full Bayer-2 **2f9c659c…8d4c**, Bayer-4 **c2ffa99d…60d3**, Bayer-8 **f716e62c…9f14**. Each zero-strength matrix equals the complete None byte array. Re-entered Bayer-4 settings match earlier captures exactly.
- **Transition behavior:** strength 0.35 and width 0.35 produce identical ramp bytes **154eebf0…ef46**, different from full strength/width. Zero width equals None. Scale 2 gives **150a66e1…93cd0**, different from scale 1. Independent native fixtures verify cell expansion and fixed origin rather than merely checking different hashes.
- **Nearest palette:** None **3ea7deba…54c4**; full Bayer-2/4/8 hashes are pairwise distinct. Every zero matrix equals None. Strength 0.3 and scale 2 change allocation. Returning to Bayer-8 full settings reproduces the earlier whole frame. One `#1279AB` entry and duplicate-only `#1279AB` both emit that exact RGB at all 812 subject pixels. All ramp/nearest subject colors remain permitted stored bytes.
- **Presentation:** actual final-only 8× and 16× screenshots show crisp, ordered interleaving near shade boundaries with solid interiors. Bayer-2's coarser repeated distribution and Bayer-4/8 transition differences were visually compared and saved. 8×/16×, image-only arrow pan, grid/checker toggle, Fit and Compare preserve the full native hash. Measured native Chrome DPR 2/2.2/2.5 and return preserve the same Bayer-4 hash/revision, **1 capture and 2 processes** within that run. Chrome zoom was restored to 100%.
- **Isolation/resources:** the long editor sequence retains **1 capture, capture revision 0, 1 geometry build, 1 geometry / 1 texture / 1 program**. Every style-only scene retains the same framing and Original bytes (except intended solid-background changes). Original's transparent-scene hash remains **72c05ead…ad26** across algorithm, strength, palette and view changes. Strict and explicit solid-background bytes and alpha remain unchanged when toggling Bayer. Continuous mode matches None exactly and hides numeric dither controls. Final console has **zero warnings/errors**.

| PSS-12 acceptance item | Evidence / result |
| --- | --- |
| 1. Correct Bayer permutations/order/8×8 fixture | **Satisfied, automated:** exact independent matrices, complete rank sets and midpoint thresholds; actual distinct sphere patterns supplement fixtures |
| 2. Determinism and exact zero equivalence for all sizes/modes | **Satisfied, automated + Chrome:** cel/bands/nearest complete arrays, repeated settings and saved-byte verifier |
| 3. Strength/width change transitions with restricted colors | **Satisfied, automated + Chrome/manual:** explicit gradient/mask goldens; sphere allocation/hash changes, exact membership and 8×/16× visuals |
| 4. Native scale/origin and view/DPR independence | **Satisfied, automated + Chrome:** floor/repetition/asymmetric row-flip goldens, scale-2 sphere, full hash and unchanged processing counts through zoom/pan/grid/fit/Compare and actual DPR changes |
| 5. Alpha/background and GPU capture reuse | **Satisfied, automated + Chrome:** category/mask/strict/explicit fixtures, complete frame assertions, continuous Original and unchanged capture/resource/framing counters |

**Remaining limitations:** no PSS-12 acceptance blocker, failed required check or unrun required browser item remains. Compare checkerboard presentation artifact is recorded above for later polish; its CSS is unchanged and native output is unaffected. Secondary browsers/GPU vendors and production preview were not exercised. The palette shift is deliberately conservative rather than perceptually optimized; native byte-normal/GPU precision limits still apply. Blue noise/Floyd–Steinberg remain PSS-13, effects/import/export/persistence remain their own tasks. Existing bundle-size advisory is non-blocking. **Next executable task: PSS-13. Stop here; do not start its prompt or the runner.**


## PSS-13 completion record — 2026-10-24

**Status: Complete.** Verified the PSS-12 completed row, its CPU/browser evidence and actual Bayer/quantization/native capture implementation before editing. Baseline typecheck and all 334 existing tests passed. This task was absent. All five acceptance items and required primary-browser checks now pass. No future prompt, runner, deployment, Git initialization or upload of user content occurred.

### Implementation and affected files

- **Algorithms and integration:** new `src/domain/blueNoise.ts` decodes the fixed single-channel data; `orderedDither.ts` shares Bayer/blue threshold selection without changing Bayer semantics. New `src/domain/errorDiffusion.ts` implements sequential scalar/RGB quantizers with two floating rows. `shading.ts` extracts common coordinate rounding; `pixels/nativeFrame.ts` normalizes disabled settings before algorithm dispatch and selects the appropriate mapper within its existing native scan.
- **Local asset and provenance tooling:** new `src/assets/blue-noise/{source.png,thresholds.hex,README.md}` and `scripts/check-blue-noise.py`. The source PNG is provenance only; the runtime imports raw hex thresholds. No external runtime fetch, display color conversion, generated white noise or temporal input exists.
- **Controls/observations:** `components/DitherInspector.tsx`, `App.tsx` expose all six modes, error-strength help, hidden irrelevant controls and remembered threshold parameters. `scene/nativeCapture.ts` retains its owner/scheduler/Original/revision behavior and adds separate original/style/publication timings to existing diagnostics.
- **Tests:** new `domain/{blueNoise,errorDiffusion}.test.ts`, `pixels/advancedDither.test.ts`; extended `App.test.tsx` and `scene/nativeCapture.test.ts`. **23 new tests; 357 total in twenty files.** Tests cover exact SHA-256/byte distribution/floor scale/tiling/formulas, hand-calculated scalar and RGB scans, all four isolated neighbor weights, nonuniform ramp-coordinate error, independent channels/linear matching/ties/unclipped residuals, border/holes/categories/entire skipped rows, 1×N/N×1/1×1, zero-strength bypass, one/duplicate colors, all-transparent masks, strict/explicit backgrounds, repetition, capture reuse and stale publication.
- **Documentation/evidence:** README, ARCHITECTURE, ROADMAP and this record. `evidence/pss13-dither.html` is a local development gradient harness importing the production quantizers. `pss13-browser-frames.json.gz` retains **52 complete actual Final/Original pairs**, settings/revisions/resources/timings; `pss13-gradient-frames.json.gz` retains **24 actual production-quantizer gradient frames**. Lossless gzip keeps these arrays under 1 MiB together. `pss13-verify-native.py`, `pss13-native-checks.json`, `pss13-blue-noise-spectrum.{json,png}`, `pss13-gradient-{ramp,palette}-{64,256}.png`, `pss13-sphere-{4,blue-noise,floyd-steinberg}.png`, `pss13-sphere256.png`, `pss13-torus-mask.png` and `pss13-final.png` retain rerunnable and visually inspected evidence. Normal dist/TypeScript cache outputs were regenerated.

### Consequential decisions

1. Selected Christoph Peters' CC0 database member **`Data/64_64/LDR_LLL1_0.png`** from the author's archive. [Author's publication/licensing](https://momentsingraphics.de/BlueNoise.html) and [CC0 dedication](https://creativecommons.org/publicdomain/zero/1.0/) were verified. Archive SHA-256 **4279ad66ec851a8cbf37025816ef5187bf1c1c001d46afb8edfa6d3c8e44c644**, source PNG **140c55bd97c21b9b22008d7054b492333fec67fbfc1a1b266e5b0209b647eed4**, decoded channel **fe602dd3f05c3d79ef1ff01533923c45a9eede45531251901818250445fbe4b1**. The PNG has R=G=B, opaque A and no gamma/ICC metadata. Pillow 12.3.0 extracts stored R bytes without conversion; each value 0–255 occurs 16 times. Threshold `(byte+0.5)/256` retains midpoint/mean semantics, fixed origin and native integer scale. The 40 MiB archive stays in temporary storage, outside the app/repository.
2. Raw and 10%/25%/50% binary tile spectra were checked with a periodic, mean-subtracted direct DFT; DC excluded. Mean power ratio at radii (0,8) versus [16,32) is **0.000214 / 0.034155 / 0.015703 / 0.012350** respectively. The inspected image shows a low-frequency dark center, broad high-frequency energy and irregular distributed dots without a small Bayer lattice. Source/method/spectrum support the claim; a histogram or noisy appearance alone does not. NumPy was unavailable, so the small separable direct DFT uses Python's standard library; Pillow was already installed. No package/configuration change was necessary.
3. Floyd–Steinberg uses **left-to-right, top-to-bottom** scans and exact outgoing weights **7/16, 3/16, 5/16, 1/16**, multiplied by strength. Ramps add residuals to continuous q and subtract the selected artist index; palette mode adds/subtracts continuous linear RGB through the existing stable nearest mapper. Accumulated error is not clipped, because that would discard residual energy. The preexisting base signal adjustment stays bounded. All selected output bytes are original palette entries; no alpha/effect color enters matching.
4. Each scan owns two `Float64Array(width*channels)` error rows, reused across its rows. At width 256 they total **4 KiB scalar / 12 KiB RGB**. Every target is checked for source-category equality and bounds; missing neighbors drop their weights without renormalization. Empty rows still advance/clear error storage, preventing stale errors from crossing skipped gaps. Integration invokes only category 255; receiver 128/background remain excluded. One-color mapping has a constant-result shortcut; rows do not survive a processing call. No full-frame float residual buffer, worker, new renderer or scheduler was added.
5. The processing entry discards None, continuous and exact zero-strength requests before choosing an algorithm or checking active native dimensions. Common None mapping is byte-identical, including all three Bayer sizes and both new algorithms in continuous/cel/bands/palette fixtures. Blue noise shares the established ramp width and conservative palette-spacing amplitude. Scale and ordered width are hidden for diffusion with an explicit reason; strength scales propagated error. Mounted controls retain threshold scale/width through diffusion/None visits. Existing version-1 unions, defaults, validators and dirty revisions already supported these algorithms and were preserved.
6. Continuous Original is copied first and untouched by styling. Final publication retains the existing generation/settings guard and owned byte copies. Style changes reuse capture/target/framing; view changes do no processing. Diagnostics separate Original, Final style and publication costs. Capture/readback timings remain the latest **capture** measurements and are not paid again on each style edit; capture includes calibration/readback. Browser timing granularity can report zero for very short publication work. No FPS claim is made.
7. Existing Vite stale-transform behavior recurred: initial diagnostics omitted newly added timing fields after a reload. Restarting only the owned server resolved it. Three owned localhost starts/two restarts were used, with a final fresh-source smoke frame matching the earlier FS hash exactly. No app/runtime workaround or unrelated CSS change was introduced. All runtime warnings/errors in the two verification tabs are empty. Existing Compare checkerboard presentation and bundle advisory remain separately documented, non-blocking limitations.

### Exact verification commands and results

Environment: **Node v24.22.1, npm 11.19.1; Google Chrome 155.0.8059.86, macOS 27.0**, real WebGL2, **1728×963** screenshots, reported DPR **2**. GPU vendor was not asserted. Browser checks ran at `http://127.0.0.1:5173/?scene-checks` plus the local evidence harness; no mocked canvas/WebGL supplied pixel evidence.

| Executed command | Result |
| --- | --- |
| `node --version && npm --version` | v24.22.1 / 11.19.1 |
| `git status --short` | Expected failure: not a Git repository; none initialized and no clean-diff claim |
| `npm run typecheck && npm run test` (baseline) | Pass, **334/334 tests**, 17/17 files, **4.63 s** |
| `curl -L --fail --silent https://momentsingraphics.de/BlueNoise.html -o /tmp/pss13-blue-source.html` | Author's publication and archive/license links inspected |
| `curl -L --fail --silent --show-error https://momentsingraphics.de/Media/BlueNoise/FreeBlueNoiseTextures.zip -o /tmp/pss13-blue-noise.zip` | Download succeeded; archive/member inspected with unzip and SHA-256 checked with shasum/Python |
| `npm run dev -- --host 127.0.0.1` | Vite 8.3.5 at **127.0.0.1:5173**; three owned starts/two restarts, local only; stopped after verification |
| `npm run typecheck && npm run test` (initial implementation) | Failed typecheck on parameter properties under `erasableSyntaxOnly`; replaced with explicit members/assignments |
| `npm run test -- src/domain/errorDiffusion.test.ts` | Pass, **11/11 focused tests**, 354 ms |
| `npm run typecheck && npm run lint && npm run test` (new coverage) | Two typecheck failures: Node-only imports unavailable under app's configured type set, then a test-union shape. Hash test now uses built-in Web Crypto; test objects use correctly narrowed unions. Configuration was preserved; no errors suppressed |
| `npm run typecheck && npm run lint && npm run test && npm run build` | Two full runs pass: **357/357 tests, 20/20 files**, **4.91 s**, then final **4.72 s**. Final Vite **65 modules**, JS **906.08 kB / 250.54 kB gzip**, CSS **12.41 kB / 3.34 kB gzip**, build **185 ms**. Existing >500 kB advisory remains visible |
| `python3 scripts/check-blue-noise.py /tmp/pss13-blue-noise.zip` | Twice pass: archive/member/source/raw hash equivalence, exact histogram and all four spectral ratios; saves JSON/PNG evidence |
| `python3 docs/pixel-shading-studio/evidence/pss13-verify-native.py` | Initial **512/512** assertions on 51 frame pairs + 24 gradients; final **521/521** on **52 frame pairs + 24 gradients**, including **four independent full-frame FS comparisons** |
| `plutil -extract CFBundleShortVersionString raw -o - '/Applications/Google Chrome.app/Contents/Info.plist' && sw_vers -productVersion` | Chrome **155.0.8059.86** / macOS **27.0** |

Read-only repository inspection used rg/cat/sed and actual package/config/lockfile metadata. Package.json still exposes every PSS-01 quality/dev command. No npm install, lockfile/schema/configuration/dependency change, remote runtime asset, deploy/publish or runner command was needed. Tests are nonempty and failures above were corrected before the final full pass.

### Actual browser observations and measured stages

- **S4 sphere:** default 64×64, 32×32 occupied mask x/y=16..47, **812 subject pixels**. Ramp Bayer-4 **c2ffa99d…60d3**, blue noise **d44914db…3411**, FS **80b5f61c…e94af**. Nearest Bayer-4 **fa943046…ab60**, blue **0035119f…3b58**, FS **212f16a7…7b80**. The selected nontrivial outputs differ; both advanced modes repeat byte-for-byte. Final reset and fresh-source FS repeat the full hash, not merely appearance. Original remains **72c05ead…ad26** across all style edits for this capture.
- **Disabled/controls:** all five enabled algorithms at zero equal their corresponding None whole frame in bands and palette modes. Pure fixtures additionally cover cel/continuous with invalid/unneeded native metadata to prove early bypass. The browser shows all six choices; FS retains an enabled strength field and hides scale/width with a reason. Blue strength .35 and width .35 give the same frame; scale 2 changes cells. FS strength .35 changes allocation. Exact palette RGB, binary alpha and zero transparent RGB hold throughout.
- **Visual comparison:** saved 8× sphere screenshots distinguish Bayer's regular repeated lattice, blue noise's irregular threshold distribution and FS's scan-dependent interleaving. The 64/256 scalar and RGB gradient page renders all three side by side from the production quantizers, with a transparent border and vertical gap. Every pair of repeated gradients is byte-identical; the independent full-image Python reference reproduces FS's complete 64/256 scalar/RGB arrays exactly. This is algorithm evidence beyond a noisy-looking image. The 256 torus has a clean transparent internal hole and no RGB halos; its center is exactly zero RGBA.
- **View/masks/background:** zoom/grid/Compare changes preserve blue/FS full native arrays and processing counts. Strict/explicit solid-background samples remain byte-identical through FS/None toggles. A 256×256 sphere occupies **224×224** at x/y=16..239. No silent stall/failure occurs. Style-only work retains a single target/capture; actual diagnostic memory stays **1 geometry / 1 texture / 1 program**, including shape replacements. Capture changes only for size/box/shape/reset as expected. Native frames match latest settings/capture revisions.

Representative **single-run style measurements in milliseconds**, with four colors. These are observations, including cold/JIT variation, not a responsiveness/FPS guarantee:

| Native canvas / domain | None | Bayer 4 | Blue noise | Floyd–Steinberg |
| --- | --- | --- | --- | --- |
| 64×64 / ramp, 32px sphere | 0.5 | 0.3 | 0.4 | 1.6 (later repeat 0.2) |
| 64×64 / RGB, 32px sphere | 1.0 | 0.2 | 0.4 | 0.9 |
| 256×256 / ramp, 224px sphere | 3.7 | 4.7 | 4.1 | 5.2 |
| 256×256 / RGB, 224px sphere | 5.8 | 5.3 | 8.1 | 7.5 |

For the 256 FS ramp/RGB observations, Original took **4.2 / 5.1 ms**, aggregate Original+style **9.4 / 12.6 ms**, and publication **0 ms at timer precision**. The latest 256 capture took **5.7 ms including 2.1 ms readback**, reused by those style edits. Gradient-only 256 quantization/allocation observations were **4.8–5.5 ms scalar FS** and **7.6–8.4 ms RGB FS** across two runs; these omit scene lighting/capture and must not be equated with the complete app pipeline. Raw per-stage values are retained in the native-check summary. Broader profiling remains PSS-19; no worker was justified by this task's basic measurements.

### Acceptance and remaining limitations

| PSS-13 acceptance item | Evidence / result |
| --- | --- |
| 1. Real local deterministic blue noise | **Satisfied, automated + source/manual:** fixed CC0 member; archive/PNG/raw hashes; raw byte equality/distribution/tiling; inspected non-Bayer spectrum/threshold views |
| 2. Hand-calculated exact FS fixture | **Satisfied, automated:** 3×2 scalar and RGB expected indices; adjusted coordinates 0, .4, .515 / .525, .22625, .452421875; independent isolated 7/3/5/1 weight probes and nonuniform ramp fixture |
| 3. Byte-identical repetition, allowed colors, differs from Bayer | **Satisfied, automated + actual Chrome:** repeated arrays in both domains; palette membership; distinct sphere/gradient frames; four independent full-image FS reference matches |
| 4. Every mode zero equals None; valid masks/transparent RGB | **Satisfied, automated + actual Chrome:** all Bayer sizes plus blue/FS, cel/bands/palette/continuous, one-pixel/border/category/empty-row/one-color/all-transparent fixtures; sphere/torus/gradient/strict/explicit background saved arrays |
| 5. Six choices, applicable controls, 256 completes | **Satisfied, component + actual Chrome/manual:** connected six-option UI and retained settings; FS strength-only explanation; real 256 sphere and gradients, native bytes/revisions/timings and zero console warnings/errors |

**No failed or unrun required PSS-13 acceptance check remains.** Secondary browsers/GPU vendors, native browser DPR changes specifically for the new algorithms, production preview and 1024/32-color performance profiles were not exercised here; PSS-12 retains actual DPR evidence for the unchanged native-grid/presentation contract, and PSS-13 pure lookup tests establish its fixed coordinate/scale. These are verification/performance limits, not waived required checks. The existing Compare checkerboard issue and bundle advisory remain non-blocking. Outlines/ground/import/PNG/persistence stay in their assigned later tasks; no export-completion claim is made. **Next executable task: PSS-14. Stop here; do not execute it or the runner.**


## PSS-14 completion record — 2026-10-24

**Status: Complete.** Verified prerequisite PSS-13's Complete row, source/provenance/diffusion evidence, actual native processor and UI/runtime lifecycle before editing. The baseline passed 357 tests and typecheck. The outline settings union/limits/reset already existed; this task implemented its missing morphology, compositor and controls. No prerequisite was fabricated, later task executed, repository initialized, or package/configuration/lockfile changed.

### Implementation and files by purpose

- **Native algorithms/palette:** new `src/pixels/silhouetteOutline.ts`; `src/pixels/nativeFrame.ts`; `src/domain/shading.ts`. Two bounded separable mask passes implement dilation minus subject at integer radius 1–8. Shared effect resolution preserves explicit bytes or selects nearest linear-RGB palette entry with first-entry ties. Composition selects subject over outline over receiver/background. Final alpha stays 0/255 and transparent RGB stays zero.
- **Runtime/state:** `src/scene/nativeCapture.ts`, `src/scene/referenceRuntime.ts`, `src/app/studioStore.ts`. Reused styled RGBA, horizontal scratch and binary ring buffers; captured normals/fit remain unchanged for outline edits. Current frame carries effect metadata; only revision-keyed metadata enters the transient store, cleared on disposal/failure. Published arrays retain ownership; superseded style work invalidates its cache before writing. Diagnostics separate processing/composition counts and timings.
- **Connected controls/presentation:** new `src/components/OutlineInspector.tsx`; `src/components/PaletteInspector.tsx`, `src/components/ReferenceViewport.tsx`, `src/App.tsx`. None/Silhouette, integer numeric/slider thickness, validated hex/picker, resolved policy disclosure, isolated reset, effect bounds and clipping notices. Original remains continuous without outlines. Workspace help describes the hole rule, palette behavior and reset.
- **Automated coverage:** new `src/pixels/silhouetteOutline.test.ts` (14 tests); extended `src/scene/nativeCapture.test.ts` and `src/App.test.tsx` (one focused test each). Coverage includes hand-written radius 1/2/8 rings, holes, diagonals, concave corners, edge/corner clipping, empty/full one-pixel masks, category exclusion, invalid/aliased work buffers, layering, strict/explicit ties, all six dither choices in ramp/RGB modes, cache/ownership/superseded work and connected controls/reset/stale metadata.
- **Docs/evidence:** `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, this progress file; `evidence/pss14-browser-frames.json.gz` (39 full actual native Final/Original pairs plus diagnostics), `pss14-verify-native.py`, `pss14-native-checks.json` (455 checks plus hashes/counters), and five PNG screenshots: `pss14-compare64.png`, `pss14-torus64.png`, `pss14-sphere16.png`, `pss14-clipped16.png`, `pss14-final.png`. Normal build/TypeScript caches were regenerated under ignored output locations.

### Decisions and constraints

Square/Chebyshev radius includes diagonal neighbors. Dilation is not hole filling: inner hole edges grow by the same radius; small holes may close deliberately, while sufficiently large centers remain empty. Help and exact tests declare this behavior. Only captured category 255 seeds the ring; category 128, helpers and any future shadow mask are excluded. Effect extents include subject plus dilation and are independent of requested/measured subject dimensions. Their unclipped bounds describe the captured mask's dilation, not invisible off-canvas geometry. Canvas clipping is explicit and never adds padding or changes export dimensions.

The initial outline color is the default dark palette entry `#172038`, thickness 1. None remains the saved default. Mounted local controls remember prior color/thickness across disable/enable; Reset outline and Reset scene restore defaults. Strict policy retains the requested color and displays its nearest active palette entry, allowing reversible policy switching. Explicit mode discloses at most one additional outline color when outside the subject palette.

The existing conservative store style revision/scheduler remains intact. The runtime compares shared unchanged style sections and capture revision to reuse continuous Original/styled pixels for outline-only commits. Thickness changes rebuild mask/composition; color changes reuse the ring too. Policy changes conservatively rerun styling because the same policy affects background. One extra RGBA cache and two one-byte mask arrays add 24 KiB at 64×64 or 6 MiB at 1024×1024; no GPU allocation/context is added. All release with NativeCapture. Background initialization in the cached underlay followed by binary ring selection is equivalent to subject → outline → receiver/background precedence. Future receiver rendering must preserve category and compositing contracts; none was implemented here.

### Exact verification commands and results

Environment: **Node v24.22.1 / npm 11.19.1; Google Chrome 155.0.8059.86 on macOS 27.0**, real WebGL2 at `http://127.0.0.1:5173/?scene-checks`, **1728×963** screenshots and reported DPR **2**. GPU vendor was not asserted. Package.json retains all PSS-01 scripts (`dev`, `typecheck`, `lint`, `test`, `test:watch`, `build`, `preview`); no equivalent command was invented.

| Executed command | Actual result |
| --- | --- |
| `git status --short` | Expected failure: directory is not a Git repository; none initialized |
| `node --version && npm --version` | v24.22.1 / 11.19.1 |
| `npm run typecheck && npm run test` (baseline) | Pass, 357/357 tests, 20/20 files, 4.68 s |
| `npm run typecheck && npm run test -- src/pixels/silhouetteOutline.test.ts src/scene/nativeCapture.test.ts src/App.test.tsx` (first attempt) | Failed typecheck: new Testing Library calls included unsupported `exact` options; removed those test-only options |
| Same focused command (second attempt) | Typecheck passes; 38/39 focused tests pass. UI test retained a detached thickness input after mode toggling; reacquired the current input. Production behavior was unchanged |
| `npm run typecheck && npm run lint && npm run test && npm run build` | Two full passes: 373/373 tests, 21/21 files, 4.79 s then final 4.89 s. Final Vite: 67 modules, build 182 ms, JS 912.77 kB / 252.38 kB gzip, CSS 12.41 kB / 3.34 kB gzip. Existing >500 kB advisory remains visible |
| `npm run dev -- --host 127.0.0.1` | Two owned local starts at 127.0.0.1:5173; restarted once for fresh-source confirmation; stopped after checks |
| `python3 docs/pixel-shading-studio/evidence/pss14-verify-native.py` | Twice pass: **455/455** independent checks across **39** actual Chrome Final/Original frame pairs |
| `plutil -extract CFBundleShortVersionString raw -o - '/Applications/Google Chrome.app/Contents/Info.plist' && sw_vers -productVersion` | Chrome 155.0.8059.86 / macOS 27.0 |

Read-only repository inspection used rg/cat/sed and actual package/lockfile/configuration files. Browser automation changed real controls and read the development native-frame/diagnostic UI. The independent verifier stamps a complete square around each source pixel into a set, subtracts original coverage, clips and compares every effect pixel; it does not call the production separable morphology. Its own sRGB/linear nearest-color reference verifies policy output. NativeCapture's scoped renderer test double is control-flow/ownership evidence only.

Two optional browser read attempts were unsupported by the browser tool's read-only DOM representation: canvas `getContext` and `navigator.userAgent`. They supplied no evidence and were not bypassed. Environment versions came from the commands above. Native arrays/metadata came from the application's explicit diagnostic actions, complemented by actual screenshots. Vite initially retained transforms after the final timing-only edit; restarting the owned server and reloading produced `compositeMs` in fresh diagnostics and identical full-frame custom-outline bytes. No application or configuration workaround was introduced. Actual browser warning/error logs are empty. A final inline Python progress/script consistency check initially included historical tables and failed its row-count assertion; scoped to the Ordered implementation tasks table, it passes: all 20 rows retain their five columns, PSS-14 is Complete, PSS-15–20 remain Not started, required package scripts exist and the saved report has 455 passes/zero failures.

### Browser observations and acceptance evidence

| Criterion | Result and evidence |
| --- | --- |
| 1. Exact radius 1/2/upper-bound dilation | **Satisfied — automated + real browser.** Hand-written 7×7 radius 1/2 and 19×19 radius 8 fixtures; independent corner/edge distance fixtures. All actual sphere/torus rings match the separate square-stamping reference pixel-for-pixel |
| 2. Subject bounds unchanged; integer effect growth and clipping | **Satisfied — automated + browser/manual.** Default 64×64 sphere stays 32×32 at x/y=16..47 (812 subject pixels). Radius 1/2/8 produces 34/36/48 extents with 132/272/1280 ring pixels. On 16×16, subject stays 8×8 at 4..11; radius 1/2 produces 10/12 extents and 36/80 ring pixels. Radius 8 reports 24×24 unclipped / 16×16 visible with 204 ring pixels. Top-left subject stays 8×8 at 0..7; radius 2 reports x/y=−2..9, 12×12 extent, 10×10 visible and 45 ring pixels; notice is visible in both inspector and workspace |
| 3. Exact explicit/strict outline bytes | **Satisfied — automated + browser.** Custom `#01FE80` and `#FEDCBA` remain exact; strict maps `#FEDCBA` to active `#B8D8F0`. Explicit restoration recovers the request. Independent reference verifies every ring and background byte; pure tests cover stable ties, duplicates and one-color palettes |
| 4. Binary alpha/no halos; dither isolation | **Satisfied — automated + actual native arrays/manual.** All 39 frames have only 0/255 alpha and zero hidden RGB. All six real dither off/on pairs preserve every subject byte and exact ring color; solid strict/explicit background combinations pass full outside-effect comparisons. Torus 1/2px hole centers remain zero RGBA. Native 64px views at 4×/8× and 16px at 16×/32× show sharp square blocks with no edge halos |
| 5. Comparison and color-only capture reuse | **Satisfied — automated + browser/manual.** Compare screenshots show continuous unoutlined Original beside styled outlined Final. Original arrays are unchanged by outline/style edits; view zoom preserves full arrays and processing counts. Initial 64px radius/color edits keep captures=1, rasterizations=2, processes=1 while composites increment. Fresh-source recolor repeats that result. Runtime remount reproduces exact bytes and leaves one renderer/target/geometry/texture/program active; previous target disposed. Section/full resets are verified |

Visual evidence: [64px Compare](evidence/pss14-compare64.png), [torus hole](evidence/pss14-torus64.png), [16px at 32×](evidence/pss14-sphere16.png), [clipping notice](evidence/pss14-clipped16.png), [fresh-source final Compare](evidence/pss14-final.png). Saved numeric evidence: [455-check report](evidence/pss14-native-checks.json), [independent verifier](evidence/pss14-verify-native.py).

**No failed or unrun required PSS-14 acceptance check remains.** Decoded S5/S6 PNG proof remains PSS-17; no image-export completion is claimed. Ground/real shadow interaction remains PSS-15; layering/category fixtures already establish this task's boundary. Secondary browsers/GPU vendors, native DPR changes for this increment, production preview and 1024px performance profiling were not run; these are verification limits, not waived required checks. Existing Compare checkerboard presentation issues remain tracked for PSS-19; comparison screenshots used checkerboard off. The build advisory remains non-blocking. **Next executable task: PSS-15, only in a new run. Stop here; do not execute it or the runner.**


## PSS-15 completion record — 2026-10-24

**Status: Complete.** Read the governing instructions, README, npm manifest/lock/configuration, specification R03/R09/S6, architecture and roadmap. Verified PSS-14's Complete row and evidence against its actual native capture, subject-only morphology, compositor, revision cache and inspector before editing. Baseline typecheck and all 373 tests passed. Ground/shadow domain unions and revision fields existed, but receiver geometry, shadow visibility, CPU integration and controls were absent. Only PSS-15 and necessary integration fixes were implemented. No repository initialization, dependency/configuration/lockfile change, deployment, upload, later prompt or runner execution occurred.

### Implementation and affected files

| Purpose | Files and resulting behavior |
| --- | --- |
| Graphics resources and passes | New `src/scene/directionalShadows.ts`, `groundReceiver.ts`, `nativeRender.ts`; changed `nativeCapture.ts`, `referenceRuntime.ts`. One independent finite layer-2 receiver, one fitted 1024² directional map, installed Three shadow-library native visibility/depth pass, restored renderer state, cached subject/combined normals, reusable visibility/float buffers, explicit disposal, counters and timings. Fitting and original subject outline masks remain isolated |
| CPU math and effect policy | New `src/pixels/shadowVisibility.ts`; changed `pixels/nativeFrame.ts`, `domain/lighting.ts`. Directional-only attenuation before existing signal/dither/quantization, category/depth/normal/connected-sample softness, exact receiver/shadow bytes with native binary coverage, no receiver/subject diffusion, subject-only outline precedence |
| Domain/state | Changed `domain/settings.ts`, `constraints.ts`, `validation.ts`, `app/studioStore.ts`. Optional backward-compatible bias from 0–2 map texels and small revision-keyed ground/shadow extent metadata, cleared on disposal. Existing schema/revision/reset contract is preserved |
| Controls/presentation | New `components/GroundShadowInspector.tsx`; changed `LightInspector.tsx`, `PaletteInspector.tsx`, `ReferenceViewport.tsx`, `App.tsx`, `App.css`. Visible/Shadow only/Off; receiver position/size/color; directional/self/ground toggles; strength, Hard/Soft, radius 0–4, bias and shadow color; explicit/strict disclosure, isolated reset, conservative bounds/clipping, development pass inspection. Mesh edges stay a preview SVG rather than changing caster depth |
| Focused tests | New `pixels/shadowVisibility.test.ts` (10 tests) and `scene/groundReceiver.test.ts` (3); changed `App.test.tsx` (one additional control/reset test plus updated pre-PSS-15 absence assertion). Fixtures cover direct/ambient math, exact coverage endpoints, category alignment, invalid softness/bias, holes/normal/depth rejection, strict/explicit colors, actual processor receiver states, FS region isolation, ground ownership/disposal, soft bounds and horizon behavior |
| Docs/evidence | README, ARCHITECTURE, ROADMAP and this progress file. `evidence/pss15-browser-frames.json.gz`, `pss15-verify-native.py`, `pss15-native-checks.json`, `pss15-native-contact-sheet.png`, `pss15-torus-soft.png`, `pss15-final-workspace.png`. The saved data contain complete actual native Final/Original/normal/subject/visibility/filtered arrays, settings, matrices and counters, not screenshots substituted for pixel data |

### Decisions and boundaries

- Canonical ground/shadows remain Off. Enabling the independent receiver starts at (0, −1, 0), width/depth 6; Visible uses `#5C88B8`, shadow uses `#172038`, strength 1, self/ground enabled and Hard treatment. Mounted controls retain disabled settings; Reset ground & shadows restores Off and keeps lighting. Lighting presets/reset keep shadow/receiver settings. Full scene reset retains its original boundaries.
- Used installed Three **`ShaderLib.shadow` with cloned light uniforms and `lights=true`**, rather than the architecture's proposed Lambert-derived material. Its native shadow chunks already expose `getShadowMask()`, avoiding unrelated Lambert color math. ARCHITECTURE's ordered pipeline and ROADMAP integration note now describe this implementation. The task prompt's installed-shader integration requirement remains unchanged. The normal shader itself still does not receive shadows.
- The visibility pass shares native projection, world transforms, front-side subject/double-sided Plane/ground culling, depth testing and top-left coordinates with the normal pass. R is raw visibility, GB is bounded 16-bit view depth, and alpha is 255/128/0 subject/receiver/background. The same native GPU target is reused sequentially; independent CPU arrays preserve the data. Actual saved categories match at every coordinate. Final and Original use only 0/255 alpha, with zero hidden RGB.
- Light-space XY fits only caster bounds plus margin; receiver depth extends near/far. This keeps one bounded 1024² map useful when ground size grows. A normal bias of `(bias ?? 0.5)*worldUnitsPerMapTexel` is bounded to 0–2 map texels, plus fixed −0.00001 depth bias. Optional `bias` preserves existing version-1 JSON without adding a migration. No other required field becomes optional. Ground receiving pauses at normalized light Y ≤ 0.01; self shadows continue. UI and metadata explain the pause.
- Softness is a native square radius 0–4, not physical area-light blur. It accepts matching category, normal cosine ≥0.85, bounded depth difference and every intervening category/surface sample, preventing jumps across holes and unrelated faces. Radius 0 is exactly Hard. It may truncate at surface/receiver boundaries. Visibility attenuates **only** directional energy before existing shading/dithering. No palette/dither algorithm was changed.
- Visible ground chooses exact receiver or shadow color; shadow-only chooses exact shadow or transparent zero. Covered density is the normalized loss of illumination after preserving ambient, tested against fixed Bayer 4×4 midpoint thresholds. Thus strength, ambient fill and soft edges produce binary pixel patterns rather than blended extra colors. Strict resolves colors to active entries; explicit discloses its at-most-two additions. Receiver never enters subject FS quantizers/error rows. Original shares the same lighting/receiver while bypassing subject tone/signal/outline styling.
- Fitting retains the original subject-only normal mask, even when ground is enabled. The combined depth pass can occlude an intersecting subject, so help advises placing ground below it. Outline generation uses only the preserved subject mask and composites above receiver. Conservative receiver and caster-box footprint extents include the soft radius; clipping checks canvas, depth and finite receiver. Bounds are potential effect bounds rather than exact opaque-shadow bounds, and can overreport clipping. Canvas size never grows. The final review added radius expansion and a projected receiver containment check, with dedicated tests and fresh Chrome captures.
- Existing revisions conservatively recapture visibility for all shadow-setting changes, including strength/radius/color; light direction does likewise. Subject/receiver normals are reused. Intensity, ambient, palette, outline and preview edits reuse visibility as appropriate. The map is retained while disabled and explicitly released on teardown/context recovery; disabled shadows skip rendering it. A necessary integration fix stopped the now-SVG-only mesh-edge preview from changing caster material wireframe, which would otherwise alter a later light-triggered map.

### Exact verification commands and actual results

Environment: **Node v24.22.1, npm 11.19.1; Google Chrome 155.0.8059.86, macOS 27.0 (26A428)**. Browser URL **`http://127.0.0.1:5173/?scene-checks`**, screenshots **1728×963**, reported DPR **2**, real WebGL2. GPU vendor/model was not asserted for this run. Files and data stayed local.

| Executed command / check | Result |
| --- | --- |
| `node --version && npm --version` | v24.22.1 / 11.19.1 |
| `npm run typecheck && npm run test` before editing | Pass; 373/373 tests in 21/21 files, 4.92 s |
| `npm run typecheck` during initial implementation | Initially rejected TypeScript parameter properties under `erasableSyntaxOnly`; replaced them with explicit fields |
| `npm run typecheck && npm run test` after initial UI integration | Typecheck passed; 372/373 tests passed. The sole failure was the older assertion that no shadow checkbox existed; updated it to assert disabled defaults |
| `npm run typecheck && npm run test -- src/pixels/shadowVisibility.test.ts` | First typecheck exposed an overly broad test-fixture union; narrowed the fixture type. Repeated command passed all 10 focused tests |
| `npm run typecheck && npm run lint && npm run test && npm run build` (final source, including bounds fix) | **All pass: 387/387 tests, 23/23 files, 5.19 s**. Typecheck/lint clean. Build transformed 72 modules, emitted local CSS 12.48 kB and JS 931.77 kB (257.67 kB gzip). Existing non-blocking >500 kB chunk advisory remains; no suppression |
| `npm run dev -- --host 127.0.0.1` | Starts Vite 8.3.5 at 127.0.0.1:5173. File-watcher caching was observed during development, so the owned server was restarted and Chrome explicitly reloaded before final-source verification. No public binding/hosting |
| `python3 docs/pixel-shading-studio/evidence/pss15-verify-native.py` | **661 independent checks pass across 55 actual Chrome native frame/pass sets.** An initial verifier-only assumption checked Final receiver alpha without excluding overlaid outline pixels; corrected that no-shadow check to use unoutlined Original. Full reference ground composition still checks Final outline precedence |
| `npm ls --depth=0` | Pass; installed versions agree with preserved direct dependencies/lockfile, including Three 0.186.1, Zustand 5.0.16, Vite 8.3.5 and Vitest 5.0.5 |
| `git status --short` | Expected failure: not a Git repository; none initialized |
| `/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' '/Applications/Google Chrome.app/Contents/Info.plist'`; `sw_vers` | Chrome 155.0.8059.86; macOS 27.0 / 26A428 |

All PSS-01 scripts remain exposed: dev, typecheck, lint, test, test:watch, build and preview. No empty suite, canvas mock or simulated WebGL was used as pixel evidence. Existing scoped renderer doubles continue to test restoration/control flow only.

### Acceptance evidence

| Criterion | Result and evidence |
| --- | --- |
| 1. Cube ground shadow moves; self visibility affects direct light with ambient retained | **Satisfied — automated + browser/manual.** Receiver coverage changes from 30 pixels with centroid (47.37,29.77) under Upper Right to 217 at (51.81,38.01) under Upper Left, independently of unchanged category/fit. Rotated low-lit torus self toggle changes 146 Original and 40 Final pixels; repeated settings match. Every saved subject Original byte matches an independent linear direct×visibility + ambient reference. Colored-ambient unit math verifies exact preservation |
| 2. Visible/shadow-only/off with transparency | **Satisfied — CPU + actual browser.** Visible covers all 1220 receiver samples; shadow-only covers only the selected shadow pattern; Off removes category 128. Strength zero, disabled ground shadows, ambient-only and horizontal/below-ground light leave unoutlined shadow-only receiver samples zero RGBA. Exact references verify every ground/outline pixel and no raw category alpha |
| 3. Hard/soft/strength affect native output without strict-palette violations | **Satisfied — CPU + browser/manual.** Hard/soft2/soft4 and strength 1/0.4/0 differ; strength 0 equals disabled and radius 0 equals Hard exactly. The cube has 217/90/0 covered receiver pixels at strengths 1/0.4/0. Explicit `#FECCAB`/`#09FE71` stay exact; strict maps both to original palette entries. Every saved opaque Final pixel belongs to its permitted palette/effect set; alpha is binary and hidden RGB zero. Real FS+outline+ground and region-isolation fixtures pass |
| 4. Ground/shadow excluded from 32×32 subject fit and outline; clipping reported | **Satisfied — automated + browser/manual.** Front sphere remains x/y=16..47, 32×32, ground on/off. Isometric cube stays 28×32 within its aspect-preserving 32×32 maximum through receiver/light/style changes. Plane subject and independent XZ receiver coexist. Independent square-stamped outlines use only original subject and cover receiver. Small receiver and canvas/depth clipping report without resizing. Fresh final hard footprint 56×21 becomes 64×29 at radius 4, shifted −4 each axis, while the receiver stays 84×49 and canvas 64×64 |
| 5. Native alignment, determinism and stable resources | **Satisfied — actual GPU arrays + automated invariants.** Normal/visibility categories agree at every native coordinate, including rolled 30° perspective. Hard map visibility is binary. Repeated Hard, zero paths, returned 64px settings, 12 disable/enable cycles, three remounts and context-loss/Retry reproduce exact frame bytes. Warmed repeated 32/64/96/128 sizes plus 256→64 keep 2 geometries, 3 textures, one native target/map and one active renderer; program count plateaus (6 after fresh remount; up to 7 warmed variants in the longer multi-shape session). Palette/outline reuse visibility; light/shadow changes reuse normal captures. Mesh-edge preview followed by a light change/return reproduces exact native output. No browser console warnings/errors remain |

Manual visuals: cube under both source directions and Hard/Soft; cone bias 0/0.5/2; vertical and rotated torus self/ground shadows; ambient-only; visible and transparent shadow-only; strict outline above receiver; independent Plane subject; orthographic and rolled perspective; 32/64/96/128/256 native dimensions. Native pixel data, not browser screenshots, drive the 661-check report. The contact sheet is generated from captured native bytes at nearest scale. The first 52 frame sets verify the stable pixel pipeline and final preview isolation; three latest captures additionally verify final soft-bound expansion, unchanged Hard/Soft bytes and the current bounds notice.

**Acne/detachment findings:** at bias 0 the cone has 148 falsely occluded samples among 370 front-lit samples (N·L>0.1), visibly speckled. At 0.5 and 2 that count is zero. Default cube also has zero front-lit false shadow samples. Bias 2 shifts some shadow samples but showed no obvious detached contact gap at the inspected 64px scale; no claim of universal acne-free or detach-free rendering is made. Defaults avoid visible acne/gaps on these tested scenes, and UI exposes the tradeoff. See [native contact sheet](evidence/pss15-native-contact-sheet.png), [torus softness](evidence/pss15-torus-soft.png) and [final workspace](evidence/pss15-final-workspace.png).

**Measured performance/resources:** 64px cube filtering measured 0.3 ms Hard, 6.5 ms radius 2, 15.0 ms radius 4 in initial samples and 5.8 ms warmed radius 4. One 256px cube/128px subject/radius-4 sample measured visibility 2.5 ms, filtering **119.9 ms**, Original+Final processing 5.6 ms and publication 0.1 ms. These are individual browser samples, not FPS guarantees; retained capture timings are not repeated style costs. Radius-4 processing at larger native sizes remains a main-thread cost for later PSS-19 profiling. Memory counters plateau and typed arrays/targets are reused; disabled shadows retain the allocated map honestly.

### Remaining limits / next task

No failed or unrun **required PSS-15** acceptance item remains. Bounds are conservative, the fitted single map can lose fidelity at extreme valid geometry/receiver scale ratios, softness truncates at valid-surface boundaries, and bias cannot solve every geometry/light combination. Near-horizontal ground receiving intentionally pauses with a visible explanation. Other browsers/GPU vendors, native DPR changes, production preview and 1024px performance were not tested in this increment. PNG encoding/decoded S6 export remains PSS-17; saved evidence PNGs do not constitute an implemented image export. Existing comparison/checkerboard presentation work remains deferred to PSS-19; Compare screenshots use checkerboard off. No additional feature work or worker infrastructure was started.

These are documented limits, not blockers to this task. **Next executable task: PSS-16 in a new conversation. Stop here; do not execute that prompt or the sequential runner.**


## PSS-16 completion record — 2026-10-24

**Status: Complete.** Read the applicable AGENTS.md, current README, package/lock/configuration, specification R01/R13, architecture, roadmap, progress and task prompt. Verified PSS-15's Complete row and evidence against actual subject ownership, normal capture, fitted framing, directional visibility, receiver/outline composition and controls. Baseline typecheck and 387 tests passed. The existing imported descriptor was serializable and validated, but import machinery was absent and ReferenceRuntime explicitly rejected imported subjects. Implemented only PSS-16 and necessary lifecycle/UI integration. No Git repository was present or initialized; no deployment/upload, package installation, dependency/lock/configuration change, later prompt or runner execution occurred.

### Implementation / affected files

| Purpose | Files and behavior |
| --- | --- |
| Local preflight/resolution | New `src/import/localFiles.ts`, `modelDocument.ts`: bounded file selection, GLB/JSON validation, explicit companion remapping, required-extension/static-content checks, accessor spans, graph/count bounds, geometry-only sanitized selected scene |
| Runtime ownership/import transaction | New `src/import/modelAsset.ts`, `importController.ts`: installed GLTFLoader, tracked dependencies, abort/revision guards, postparse validation, computed missing normals, bundle SHA-256, deduplicated resource disposal, reference-counted runtime handle and atomic descriptor publication |
| Existing scene/state integration | Changed `src/app/studioStore.ts`, `src/scene/subject.ts`, `referenceRuntime.ts`, `src/App.tsx`: transient status/runtime owner outside settings, independent normalization, content clones, primitive return/reset/unmount cleanup, retained assets across renderer retry, missing-asset guidance and diagnostics. Same native pipeline, fitter and resource owner |
| Controls | Changed `src/components/SubjectInspector.tsx`: real multiple-file selection, bounds/static/local guidance, loading/error/cancel/reselect, descriptor display and unchanged transform/primitive controls |
| Tests/fixtures | New `src/import/modelImport.test.ts` (29 cases), changed `src/App.test.tsx` (one additional connected-file/error test). New original tiny assets and deterministic generator under `tests/fixtures/models/`: shared two-mesh octahedron GLB, glTF+192-byte .bin, embedded/missing-normal glTF, malformed/missing/remote/compressed/morph/animated failures and README |
| Browser/evidence/docs | New `scripts/verify-model-import.mjs`; `evidence/pss16-browser-checks.json`, `pss16-browser-frames.json.gz`, `pss16-imported-workspace.png`, `pss16-verify-native.py`, `pss16-native-checks.json`, `pss16-native-contact-sheet.png`. Updated README, ARCHITECTURE, ROADMAP and this progress record. Normal build/cache output regenerated |

### Consequential decisions and limits

- Preserve the installed Three **0.186.1 GLTFLoader addon** and LoadingManager; add no decoder, archive, framework, backend or remote dependency. URL resolution allows embedded base64 data or selected local files only. Exact relative paths precede a unique-basename fallback because ordinary multiple-file selection omits directory information. Ambiguous/missing/remote/absolute/traversal references fail visibly before parsing, including ignored image references.
- Initial limits: **25 MiB selected bytes, 25 MiB decoded buffer declarations, 64 files, 250,000 vertices, 250,000 triangles, 2,048 declared nodes, 2,048 expanded mesh parts, 64 hierarchy levels, 4,096 accessors/views**. Vertex/triangle/mesh-part accounting conservatively includes all declared mesh nodes/instances. A separate expanded-part cap prevents many tiny instances from constructing excessive Object3Ds while below the vertex limit. Only the selected scene is parsed. Counts/spans/layouts are checked before parse; actual coordinates, indices, normals, nonsingular transforms and bounds afterward.
- Support dense static triangle meshes with FLOAT positions/normals and unsigned indices, groups/nested transforms and authored or computed normals. Reject required extensions except safely ignored material-unlit/punctual-light, compression, sparse accessors, points/lines/strips, skins/skin attributes, morph/deformed nodes, GPU-instancing extensions and any animation. These supported-scope restrictions have actionable export guidance; no unsupported model class is presented as working.
- **Appearance decision:** validate/hash selected texture companions but strip images/materials/appearance extensions before loader parsing. The studio ignores imported appearance, so decoding would add unused texture/bitmap allocation and image-decompression risk. Parsed minimal materials are tracked/disposed and replaced by one studio material. No imported texture fidelity is claimed, and no texture/bitmap is created for imported appearance. Defensive resource cleanup deduplicates texture/bitmap sources as well as materials/geometries.
- A normalization parent translates by `-center * scale` with uniform `scale=2/longestAxis`; primitive sizes retain prior behavior. Child relationships and independent user transforms remain intact. No model-specific scaling of pixels, export, canvas or finished frames exists. Default imported culling follows the existing front-side subject path. Cameras/lights are ignored, including required punctual-light metadata.
- The controller retains a runtime asset reference; active scene content retains another while needed. A valid latest model publishes its descriptor only after parsing/validation. Old runtime content stays alive until replacement releases it. Cancel/new selection/primitive/reset/unmount invalidate stale work, with partial dependency settlement and blob revocation. JavaScript parsing is synchronous and cannot be preempted mid-call; caps bound it, AbortSignal/revision checks discard cancelled results. File-read/loader work has cancellation boundaries.
- Settings contain only the existing `{kind:'imported',asset:{fileName,format,sha256}}` descriptor and ordinary scene settings. SHA-256 covers sorted selected paths/content. No File, blob URL, mesh, binary storage or localStorage write is introduced. Runtime retry/remount retains assets. A descriptor restored without runtime resources explicitly asks for file reselect or built-in selection; PSS-18 still owns actual persistence/reload flows.

### Exact verification commands / outcomes

Environment: **Node v24.22.1, npm 11.19.1, macOS 27.0 (26A428), real Google Chrome 155.0.8059.86 headless, WebGL2 via ANGLE Metal / Apple M2 Max**, 1500×1100 viewport, DPR 1. Browser URL **`http://127.0.0.1:5173/?scene-checks`**. Browser assets/data stayed local. Chrome's sandboxed launch aborted, so browser verification ran with the approved local process escalation; no automatic approval rejection occurred.

| Executed command/check | Actual result |
| --- | --- |
| `git status --short` | Expected “not a git repository”; no initialization or clean-diff claim |
| `npm run typecheck && npm run test` (baseline) | Pass: 387/387 tests, 23/23 files, 5.38 s |
| `python3 tests/fixtures/models/generate.py` | Pass; deterministic original bounded fixtures generated |
| `npm run typecheck`; `npm run typecheck && npm run lint && npm run test` (integration) | Initial TypeScript narrowing/literal-cap issues and four lint issues corrected. Existing atomic-store assertions initially exposed status notifications during release; moved release status into the coherent transition. All original 387 tests then passed |
| `npm run typecheck && npm run test -- src/import/modelImport.test.ts`; `npm run test -- src/import/modelImport.test.ts && npm run lint` | Explicit Node test types added using installed declarations. Initial fixture attempted to assign read-only File.size; replaced with a real bounded File. Repeated focused run passed all then-current 26 cases; final suite includes three further cap/cancellation cases |
| `npm run typecheck && npm run lint && npm run test && npm run build` (final source) | **All pass: 417/417 tests, 24/24 files, 5.21 s**; clean typecheck/lint. Build transformed 79 modules; CSS 12.48 kB, JS 1,029.66 kB (284.03 kB gzip). Existing >500 kB chunk advisory remains unsuppressed and non-blocking |
| `npm run dev -- --host 127.0.0.1` | Vite 8.3.5 starts on **127.0.0.1:5173**. Owned server explicitly restarted after changes because this environment retained stale transformed modules |
| `node /tmp/pss16-probe.mjs` | Initial sandbox launch SIGABRT supplied no evidence. Approved outside-sandbox probe loaded GLB and printed actual native/resource diagnostics; its first temporary-profile cleanup raced Chrome exit (ENOTEMPTY). Final maintained harness waits for browser exit and cleans up successfully |
| `node scripts/verify-model-import.mjs` (final source, after fresh server restart) | **74/74 checks pass, exit 0**, 20 actual native frame sets saved. Earlier harness runs stopped on a stale diagnostic module and then an invalid top-level asynchronous restore expression; corrected/restarted, not counted as application passes. Final page console warnings/errors and uncaught exceptions: **0** |
| `python3 docs/pixel-shading-studio/evidence/pss16-verify-native.py` | **110 independent checks pass across 20 actual Chrome native frames**. Verifies lengths, binary alpha, zero hidden RGB, palette membership, identical format bytes, smooth/flat differences, six cross-format dither comparisons, subject-only bounds, normal/visibility category alignment, independent square-stamped outline precedence/count and visible ground shadow pixels. Generates native contact sheet |
| `node --version && npm --version`; `sw_vers`; `npm ls --depth=0` | Versions above; installed dependencies/lock agree. Manifest still exposes dev, typecheck, lint, test, test:watch, build and preview |

Browser evidence uses actual file-input selection via Chrome DOM.setFileInputFiles, application controls, the existing development diagnostics, native RGBA/pass arrays and screenshots. A 350 ms file-read-only delay makes Cancel and rapid replacement reproducible; no canvas/WebGL mock or fake pixel frame is involved. Headless Chrome emitted host-level macOS display-link/allocator/GCM stderr messages; those are retained separately from the empty application console/error lists. The page's **90 resource requests** are exclusively localhost, local blob or embedded data; malicious fixture URLs are never requested.

### Acceptance evidence

| Criterion | Result and evidence |
| --- | --- |
| 1. Small GLB and glTF+companion load/normalize through the native pipeline | **Satisfied — automated + real browser.** Actual fixtures use two transformed children sharing one octahedron under an offset parent, plus ignored camera/light/material metadata. Both formats produce identical native bytes and **32×18** subject bounds inside the aspect-preserving 32×32 maximum on a 64×64 canvas. Unit bounds are centered with longest world axis 2, authored normals/child offsets intact. Embedded data with computed missing normals also renders |
| 2. Transforms, camera, lighting, palette/dither/outline/shadows preserve contracts | **Satisfied — automated + browser/native bytes.** Independent Y rotation/nonuniform X scale, isometric/rolled perspective, reframe and light preset work without geometry rebuild on light changes. Both formats exercise smooth/flat and all six dither choices. Warm nearest palette, strict effects, FS, silhouette outline and soft ground shadows share existing passes/fitter. Native verifier confirms exact allowed RGB, binary alpha/zero hidden RGB, receiver exclusion and outline precedence. Screenshot/contact sheet visually inspected |
| 3. Missing, malformed, oversized, remote, unsupported assets fail while prior scene remains | **Satisfied — automated + browser.** Missing companions, model-only glTF, remote URI, required Draco, morph, animation, malformed GLB and >25 MiB selection produce visible errors with byte-identical prior frames and one retained asset. Pure/real-loader tests additionally cover count/expanded-part/depth caps, cycles, skinning, meshopt, invalid spans/indices/coordinates, ambiguity and remote images. Unsupported classes were rejection tests only |
| 4. Cancel/rapid replacement and stable resources/URLs | **Satisfied — automated + browser.** Deferred loader tests publish only newest success and dispose late/cancelled results. Real loader file-read abort leaves no resources. Browser Cancel preserves prior frame; delayed older GLB cannot replace newer glTF. **12 import/primitive cycles** plateau at **2 GPU geometries / 3 textures / 7 programs** with ground/native targets active, one context, one imported geometry/material and zero retained URLs. Every primitive return releases model ownership; final model counters are all zero. Renderer remount and context loss/Retry reproduce exact native bytes while retaining the asset. Shared geometry final disposal occurs once in tests |
| 5. Serializable descriptors and explicit model reselect | **Satisfied — automated + browser/docs.** Settings JSON contains name/format/64-digit SHA-256 only. Runtime files/resources remain outside settings; no persistence added. A deliberate descriptor-only restore displays reselect guidance; selecting the matching embedded model restores the reference. README/architecture explain reload requirements and PSS-18 responsibilities |

### Remaining limits / next task

No failed or unrun required PSS-16 acceptance check remains. Initial dense-triangle/static caps and synchronous bounded parsing are intentional; no decoder, animation, sparse accessor, strip/line/point or material/texture-fidelity support is claimed. Other browsers/GPU vendors, production preview and large-model latency profiling were not run; GPU counters establish resource plateaus rather than total JavaScript heap reclamation. The native unit loader uses a scoped ProgressEvent shim because Node lacks that browser event class; it supplies no graphics evidence. Build advisory and previously tracked Compare/checkerboard polish remain non-blocking. PNG export and actual settings/preset persistence remain PSS-17/PSS-18 and were not implemented or claimed complete.

Final inline Python consistency check passed: all 20 ordered rows retain five columns, only PSS-01–16 are Complete, required manifest scripts remain exposed, and the 74/110-check evidence agrees with this record. The owned localhost server was stopped with Ctrl+C after verification (expected server exit 130).

**Next executable task: PSS-17 in a new conversation. Stop here; do not execute it or the sequential runner.**


## PSS-17 completion record — 2026-10-24

**Status: Complete.** Read applicable AGENTS.md, README, package/lock/configuration, specification R11/S1/S5/S6/S8, architecture preview/export/scheduling, roadmap, progress and task prompt. Verified PSS-16's Complete row and 74 browser/110 native-check evidence against actual ImportController/ModelAsset/SceneSubject ownership, ReferenceRuntime scheduler/recovery, NativeCapture framing/styles/effects and owned NativeFrame bytes. Baseline typecheck and all 417 tests passed. No Git repository was present or initialized. Implemented only PSS-17 and necessary integration; no dependency, lockfile, configuration, hosting, remote asset, persistence or later task changes.

### Implementation / files grouped by purpose

| Purpose | Affected files |
| --- | --- |
| Native PNG adapter and invariant boundary | New `src/export/pngExport.ts`: sanitized descriptive names, exact revision/capture revision/dimensions, binary alpha/zero hidden RGB checks, owned RGBA copy, clean native sRGB ImageData/toBlob, retryable null/exception/cancellation failures, anchor download and delayed URL revocation |
| Capture/resource scheduling | Changed `src/scene/invalidation.ts`, `referenceRuntime.ts`, `src/import/modelAsset.ts`: one pinned job before latest preview, detached validated settings/revisions, explicit asset retain/release, shared prepareSubject/NativeCapture pipeline, context/lifetime cancellation through encoding, synchronous repeat guard, development-only last-successful capture inspection |
| Connected action/status/help | Changed `src/App.tsx`, `src/components/ReferenceViewport.tsx`, `CanvasInspector.tsx`: real toolbar action, repeat disabled while busy, visible success/error/retry guidance, explicit PNG W×H versus preview zoom and overlay exclusion |
| Focused automated tests | New `src/export/pngExport.test.ts`, `pngAdapter.test.ts`; changed `src/scene/invalidation.test.ts`, `src/import/modelImport.test.ts`, `src/App.test.tsx`. Twelve additional tests cover filenames, revisions/dimensions/alpha/ownership, pin priority/cancellation/repeated requests/errors, retained imported resources and encoding/download/URL failure paths. DOM doubles test control flow only |
| Actual-browser fidelity and evidence | New `src/export/verifyPng.ts`, `scripts/verify-png-export.mjs`, `scripts/verify-png-files.py`, `evidence/pss17-browser-checks.json`, `pss17-export-frames.json.gz`, `pss17-independent-decode.json`, `pss17-png/` (38 actual downloaded PNGs), `pss17-native-contact-sheet.png`, `pss17-final-workspace.png` |
| Documentation | README, ARCHITECTURE, ROADMAP and this progress record; normal build/cache artifacts regenerated |

### Decisions and ownership contract

- Keep the existing **single renderer, demand scheduler, native target, fitter and pixel processor**. The new scheduler pin is one synchronous capture/processing job at the next scheduled frame, ahead of the coalesced newest preview. Later store edits may advance generations but cannot cancel it. No second render approximation, resampling, DPR scaling, screenshot, worker, backend or format dependency exists.
- On click, validate into a detached settings snapshot, copy all dirty revisions and retain the matching imported ModelAsset. Capture uses these settings/resources even if the owner selects a primitive or replaces the model before RAF. Compare exact settings/capture revision and native W/H, then copy finished bytes. The pinned job never publishes preview metadata or canvas pixels. The normal newest preview runs immediately afterward. Encoding continues against its owned CPU copy, while settings stay editable; the asset pin releases in finally on every outcome.
- A renderer-lifetime AbortSignal rejects queued/in-progress export when disposed/context-lost, even if toBlob has already received complete bytes. Check actual WebGL context health before capture, after capture and before download. A lost context's frame is never downloaded; retry rebuilds through the existing owner. Invalid framing/dimensions/partial alpha/hidden RGB produce explicit failures rather than silently repairing or substituting bytes.
- Clean exact-size sRGB canvas, direct ImageData/putImageData, smoothing disabled, image/png encoding. No drawing of preview DOM or secondary styled scene. Success means download **started**, because the anchor API cannot report a user's eventual save/cancel. The local verification harness separately observes Chrome download completion. Blob URLs survive a full second after click and revoke immediately on thrown navigation failure. Scratch canvases/links release on all paths.
- Filenames normalize/sanitize imported names to bounded ASCII slugs and include subject, W×H, tone/active dither and optional outline thickness. Inactive dither is labeled None. Preview/output help uses explicit PNG/canvas dimensions.
- The narrow decoder helper is imported by the local browser harness only; it is not an application debug service. `/?scene-checks` retains the last successful export capture only in development, outside React/settings. The harness reloads **actual completed downloaded file bytes** using ImageBitmap/native sRGB ImageData and compares every byte to this exact capture; settled scenarios also compare the capture to the pre-click authoritative native frame. Compressed PNG bytes and UI screenshots are never the fidelity oracle.

### Exact commands / results

Environment: **Node v24.22.1, npm 11.19.1, macOS 27.0 (26A428), Google Chrome 155.0.8059.86 headless, actual WebGL2 via ANGLE Metal / Apple M2 Max**, 1500×1100 viewport, DPR 1 and 2. Development URL **`http://127.0.0.1:5173/?scene-checks`**. All page requests stay localhost, local blob or embedded data. No uploads/public servers were used.

| Executed command/check | Actual result |
| --- | --- |
| `git status --short`; package/lock/config/source reads | Expected “not a git repository”; no initialization or clean-diff claim. Required dev/typecheck/lint/test/test:watch/build/preview commands still present |
| `npm run typecheck && npm run test` (baseline) | Pass: **417/417 tests, 24 files**, 5.29 s |
| `npm run typecheck && npm run lint` (initial integration) | Pass |
| `npm run typecheck && npm run test -- src/scene/invalidation.test.ts src/export/pngExport.test.ts` | Initial test fixture used an inaccurate FramingReport field; typecheck caught it and it was corrected |
| `npm run typecheck && npm run test -- src/scene/invalidation.test.ts src/export && npm run lint` | Typecheck and **16 focused tests pass**; lint caught a test-only this alias, corrected without suppression |
| `npm run typecheck && npm run lint && npm run test` | Pass: **429/429 tests, 26 files**, 5.39 s |
| `npm run typecheck && npm run lint && npm run test && npm run build` (final application source) | **All pass**, 429/429 tests, 26 files, 6.11 s; 80 modules built. JS **1,035.36 kB / 285.73 kB gzip**, CSS **12.48 kB / 3.36 kB gzip**. Existing >500 kB advisory remains unsuppressed and non-blocking |
| `npm run dev -- --host 127.0.0.1`; `curl -I http://127.0.0.1:5173/` | Vite 8.3.5 ready on **127.0.0.1:5173**; HTTP 200. A pre-existing separate ::1 server was left untouched |
| `node scripts/verify-png-export.mjs` (initial sandbox attempt) | Chrome SIGABRT before page/checks; **0 checks**, no evidence counted. Retried through approved local process escalation; no automatic approval rejection |
| `node scripts/verify-png-export.mjs` (browser harness development) | First live run passed 135 checks/21 decoded downloads then stopped on an incorrect harness-only Outline color label. Corrected selection; the next full run passed 238 checks/38 downloads. Explicit CDP stream cleanup was then added to ensure process teardown, with no application changes |
| `node scripts/verify-png-export.mjs` (final maintained harness, approved escalation) | **Exit 0, 238/238 checks, 38 actual downloaded PNGs decoded**, every differingBytes count **0**. Page console warnings/errors **0**, uncaught exceptions **0**. All **78** page requests local. Temporary Chrome profile/download directory removed; final live URL count **0** |
| `python3 scripts/verify-png-files.py` | **Exit 0, 38/38 independent Pillow 12.3.0 file decodes**, exact captured W/H and every RGBA byte. Generates contact sheet and independent JSON evidence. An initial inline Python check also passed all 38 files; maintained script corrects its decoder-version metadata |
| `node --version && npm --version`; `sw_vers` | Versions/environment above |
| Local `view_image` of final workspace and native contact sheet | Visually inspected actual export toolbar/help/readout, crisp native sprites, transparent/solid, three nontrivial dither examples, explicit/strict/clipped outlines, rectangular plane and imported/ground effects. Screenshots are presentation evidence only |

### Acceptance evidence

| Criterion | Result and exact evidence |
| --- | --- |
| 1. S1 canonical 64×64 sphere | **Satisfied — automated + actual downloaded/browser-decoded file.** Width/height **64×64**, opaque bounds **x/y=16..47**, **812 opaque subject pixels**, exactly `#172038`, `#304878`, `#5C88B8`, `#B8D8F0`. Alpha set **[0,255]**, zero hidden RGB and zero RGBA differences versus revision 0. Saved `pss17-png/s1-sphere.png` |
| 2. S8 independent rectangle/zoom | **Satisfied — actual downloaded/browser-decoded files.** **96×64**, sphere **32×32**, opaque bounds **x=32..63/y=16..47**. Byte-identical pixels at preview 800%, 100%, 125%, 1600% and DPR 1/2. A separate **96×64** plane export preserves **48×16** subject occupancy within a 48×24 maximum. No resizing/downsampling |
| 3. Dither/background/outline fidelity | **Satisfied — browser + independent file decoder.** None, Bayer **2/4/8**, blue noise and FS each decoded on transparent and solid backgrounds; smooth/flat/cel/nearest palette, explicit/strict/clipped outlines, soft ground/self shadows and GLB/glTF+companion scenes also match captured authoritative RGBA exactly. **38/38** exports have zero differing bytes; imported effects share the same capture/processor |
| 4. Alpha/effects/overlay exclusion | **Satisfied — browser/native decoded pixels.** All transparent examples have alpha **[0,255]**, zero hidden RGB, no partial edges. Solid examples have **[255]** and exactly the four palette colors plus background **#20232B**. Explicit 2px outline adds only **#FF007F**, with bounds **14..49** on both axes; strict outline stays in the four-color palette. Clipped outline remains 64×64. Grid/checkerboard/mesh edges/light handle/Compare on versus off produce identical exported pixels; Original/sidebar are excluded |
| 5. Click revision, errors and cleanup | **Satisfied — pure/DOM + real browser.** Edit canvas→export→edit canvas/palette in one JS task exports clicked **revision 46, 96×64** while newer **revision 48, 80×48** stays visible. Double click creates one download; button stays disabled through delayed actual encoding. A palette edit during encoding cannot mutate the four-color capture. Imported GLB export survives immediate primitive selection and releases its asset afterward. Null Blob, thrown encoder and thrown download show retryable errors and subsequent real exports pass. Real WEBGL_lose_context both before queued capture and during delayed encoding produces visible export failure/no download; Retry renderer then exports identical current pixels. Every created URL is revoked, asset pins release, one healthy context remains |

### Remaining limits / next task

No required PSS-17 acceptance item remains failed, unrun or open. Browser/GPU evidence is one Chrome/Metal environment; other engines/vendors, production-preview browser operation and maximum-size latency were not tested, and no cross-GPU bitwise promise is made. The app truthfully reports download initiation rather than browser save completion. Existing bundle advisory, comparison checkerboard presentation issue and larger-frame/main-thread performance remain tracked for PSS-19; they do not affect exported bytes. Pillow is verification-only and was already available; no runtime/development dependency was installed. Persistence/presets remain **unimplemented PSS-18**.

Final inline Python consistency check passed: all 20 ordered rows retain five columns, only PSS-01–17 are Complete, required manifest commands remain exposed, and the 238 browser checks/38 completed downloads/38 independent decodes agree with this record. The owned 127.0.0.1 Vite server was stopped with Ctrl+C after verification (expected exit 130); the pre-existing ::1 server was left untouched.

**Next executable task: PSS-18 in a new conversation. Stop here; do not execute its prompt or the sequential runner.**


## PSS-18 — Local presets and current configurations (2026-10-24)

Status: **Complete**. PSS-17 was verified Complete and its actual pinned export, native capture and scheduler were inspected before editing. All five PSS-18 acceptance criteria have automated and real-browser evidence. No later prompt or runner was executed.

### Implementation / files changed

- Persistence: new `src/persistence/sceneCodec.ts`, `factoryPresets.ts`, `localPersistence.ts` and their two test files. Pure complete-scene/library codecs, schema rejection/bounds, three complete factory scenes, named save/restore/overwrite/delete, current autosave, protected raw recovery, lifecycle flush and retry retain usable work on failure.
- UI/lifecycle: new `src/components/PresetManager.tsx`, `LocalSaveStatus.tsx`; updated `src/App.tsx`, `App.css`, `App.test.tsx`, `main.tsx`, `components/SubjectInspector.tsx`, `ReferenceViewport.tsx`. Toolbar preset panel, explicit overwrite/delete/recovery confirmations, always-visible save issues, recovery JSON download, pending-file reselect and explicit geometry-only sphere fallback. Preset restore remounts editors to discard old drafts/inactive-mode caches. Narrow panel stays in viewport.
- Integration: `src/app/studioStore.ts` validates restored input before cancelling a stale import, then uses the existing single commit. `src/import/importController.ts` adds optional expected-descriptor matching with staged-resource cleanup; `modelImport.test.ts` proves mismatch/match and stale completion behavior. Existing graphics/export owners and reset actions remain in use.
- Verification/docs: new complete nondefault `tests/fixtures/scenes/complete-v1.json`, `scripts/verify-presets.mjs`, `scripts/verify-preset-pngs.py`, and `evidence/pss18-*` (JSON checks, captured-frame archive, nine actual PNG files, independent decoder report, workspace/pending/preset/narrow screenshots and native contact sheet). Updated README, ARCHITECTURE persistence section and ROADMAP integration note. Package manifest, npm lockfile, configurations and dependencies were unchanged; normal dist/TypeScript caches regenerated. No Git repository exists, so no clean-diff claim is made.

### Decisions / persistence contract

1. Scene schema **1** and named-library schema **1** only. Existing pure scene validation owns every active field, color/numeric constraints and cross-section rules. Version 0/future versions and unknown fields are rejected; no fake migration exists. Existing optional shadow bias omission round-trips without alteration and consistently means 0.5 shadow-map texels in the renderer. A future migration must target an actual supported prior format and end through validation.
2. Keys: `pixel-shading-studio:current` and `pixel-shading-studio:presets`; no unrelated key clearing. Library cap 100, unique case-insensitive trimmed names 1–80 non-control characters, bounded 2,000,000-character reads, distinct UUIDs and reserved factory IDs. Presets retain complete settings snapshots without duplicating the editable scene store. Preview/tool/transient revisions, runtime assets/files/URLs and RGBA bytes remain excluded. Canvas W/H are the only export dimensions.
3. Hydrate synchronously in `main.tsx` before React/runtime mount, then subscribe to changed settings identity. No initialization write, preview-only write or failed-restore autosave. Current edits debounce **400 ms**, with a non-renewing **2 s** maximum; pagehide/visibility-hidden/disposal synchronously commit latest state. Named changes commit immediately. Restore uses one validated store transition; pending autosave reads that latest complete scene.
4. Failed reads protect unread keys until retry. Failed writes retain dirty work and session presets; notices recommend keeping the tab open, retry or local JSON download. Retry after initially blocked reads preserves session edits and merges earlier names, retaining both on conflicts. Malformed/future data stays untouched in its original key. Explicit replacement first archives raw data under a unique app-owned `:recovery:<uuid>` key; backup failure keeps the original protected and reports quota/storage failure. Recovery JSON is a backup for inspection/manual recovery, not a new scene-file import format.
5. Imported presets retain filename/format/bundle SHA-256 only. Pending restore validates reselected model/companions through PSS-16 and requires matching hash/format; names are part of that existing bundle hash. Mismatch releases staged resources and preserves settings. Explicit sphere fallback changes geometry only. Same-session matching assets may be reused. Missing assets are not represented as surviving File/blob resources.

### Commands / actual verification

Environment: **macOS 27.0 (26A428)**, Node **24.22.1**, npm **11.19.1**, real headless **Chrome 155.0.8059.86**, WebGL2 **ANGLE Metal / Apple M2 Max**, DPR 1. Desktop 1500×1100 and narrow 390×844. Schema versions tested: scene 1 / library 1; 0 and future scene/library versions rejected. No mocked canvas/WebGL supplies pixel evidence.

| Command / check | Actual result |
| --- | --- |
| `node --version && npm --version`; `sw_vers` | Environment above |
| `npm run typecheck` (initial iterations) | Caught unused imports/test binding and unsupported Testing Library `exact` option; corrected |
| `npm run typecheck && npm run test -- src/persistence && npm run lint` (initial focused run) | 31/32 tests passed; a new assertion incorrectly expected materialized optional shadow bias. Corrected it to test actual existing omission/round-trip contract; no rendering behavior changed |
| `npm run typecheck && npm run test -- src/persistence src/import/modelImport.test.ts src/App.test.tsx && npm run lint` (initial UI integration) | Three old single-status queries caught an unconditional extra status element in isolated non-persistent apps. Scoped the added live status to actual persistence; errors resolved |
| `npm run typecheck && npm run lint && npm run test && npm run build` (initial full run) | Lint initially caught a test-only unused destructure and control-character regex. Both fixed without suppression; subsequent full run passed 464 tests |
| `npm run typecheck && npm run test -- src/persistence src/App.test.tsx` | **54/54 pass**, before three additional boundary/retry tests |
| `npm run typecheck && npm run lint && npm run test && npm run build` (final application source) | **All pass**, **467/467 tests in 28 files**, 6.51 s. Build 85 modules, 189 ms; JS **1,050.20 kB / 290.06 kB gzip**, CSS **13.40 kB / 3.59 kB gzip**. Existing >500 kB advisory remains visible/non-blocking |
| `npm run dev -- --host 127.0.0.1`; `curl -I http://127.0.0.1:5173/` | Vite 8.3.5 on **127.0.0.1:5173**, HTTP 200. Owned server restarted once because Vite served stale transformed source/CSS after sandbox edits; fresh response verified latest narrow style. Pre-existing ::1 server left untouched |
| `node scripts/verify-presets.mjs` (sandbox attempt) | Chrome SIGABRT before page/checks: **0 checks**, no evidence counted. Local process escalation then approved; no automatic approval rejection |
| `node scripts/verify-presets.mjs` (harness iterations) | Corrected JSON property-order equality, distinguished native capture/process from view-only resize draws, and avoided CDP serialization of Window. A 62/63 run exposed the stale narrow CSS response; server restart fixed served source. Intermediate runs were incomplete, not accepted |
| `node scripts/verify-presets.mjs` (final fresh-source run, approved escalation) | **Exit 0, 66/66 checks, 9 completed downloads decoded**, every PNG differing-byte count **0**. **0 console warnings/errors, 0 uncaught exceptions**, all **636 page requests local**. Temporary profile/download directory removed; one healthy runtime remains and imported asset/URL/geometry/material counts return to **0** |
| `python3 scripts/verify-preset-pngs.py` | **Exit 0, 9/9 independent Pillow 12.3.0 decodes**, exact native dimensions and every RGBA byte; generated decoder JSON and contact sheet |
| Local `view_image` of preset panel, pending model, narrow panel and native contact sheet | Visually inspected working controls, explicit missing-file message/fallback, contained narrow menu and identical S7/import sprite pairs. Screenshots are presentation evidence; hashes/downloads establish exact pixels |

### Acceptance evidence

| Criterion | Result and evidence |
| --- | --- |
| 1. Complete built-in settings and pixels across save/reload/restore | **Satisfied — automated + real browser.** Fixture makes every persisted section nondefault: transformed torus, rolled perspective/FOV/zoom/target, colored lights, 96×80 canvas, padded/aligned/offset fit, flat/custom bands/signals/palette, Bayer 8/scale/strength/width, outline, visible receiver/soft self/ground shadow and solid background. Equal validated settings before/reload/preset restore; native SHA-256 **51697f56155ca1ec7f9d474db24612b10f99046be94e3da881f0c28c509e53e1** in all three cases. Three actual PNG downloads and independent decodes match all bytes |
| 2. Named/factory operations and reset boundaries | **Satisfied — state/DOM + browser.** Named save, duplicate prevention, cancelled/confirmed overwrite, confirmed delete and all three complete factory scenes exercised. Palette reset keeps camera/subject/dither; section/full reset keeps named snapshots; restore keeps view/tool. DOM test verifies Escape focus recovery; narrow panel bounds x16..374, y128..634 at 390×844 |
| 3. Corrupt/future/invalid/quota/unavailable storage | **Satisfied — automated + real browser.** Malformed JSON, future version and invalid camera preserve original key through edits/autosave, recovery JSON includes raw/current work, and confirmed replacement archives raw first. Future library remains intact while new names are held in memory. Failed backup preserves original and actionable quota notice. Quota and SecurityError during editing still export decoded PNGs; blocked storage during startup remains usable and retry merges earlier names while saving latest work. Unrelated key survives every recovery |
| 4. Atomic restore/autosave ordering | **Satisfied — pure state/timer + real browser.** One complete settings transition, one current autosave of only intended settings; native captures **2→3**, native processes **4→5** for restore, with one additional presentation-only draw from status-area resize and no recapture. Invalid restore publishes/writes nothing. Fake timers prove debounce/max-wait and lifecycle latest flush. Older import completion cannot overwrite restored scene |
| 5. Truthful imported restore/reselect/fallback | **Satisfied — actual file input/WebGL + unit tests.** Reloaded `group.glb` has equal settings and no live asset; UI requests matching file. Wrong `embedded.gltf` rejected without settings change; matching `group.glb` reselect reproduces native SHA-256 **e9ea27131f97c4bdfd8cd30c8fd9c597a07d03607f01616a1e9a34d5cc29cdd3** and exact downloaded PNG. Descriptor-only JSON checked. Explicit sphere fallback preserves transform/all other sections and exports through the same owner |

### Limits / next task

No required PSS-18 criterion remains failed, unrun or open. Browser/GPU equality is verified on this single Chrome/Metal environment, not across vendors/engines. Production-preview operation, abrupt OS/process termination before lifecycle save, real physical quota pressure (DOMException injection used), full scene-file JSON import and binary asset persistence are not claimed. Existing chunk advisory, Compare/checkerboard presentation and large-frame performance remain non-blocking PSS-19 concerns. Storage is browser/profile/origin/port local, as intended. Schema 0/future versions remain deliberately unsupported and preserved.

Final inline Python consistency check passed: all 20 ordered rows retain five columns; only PSS-01–18 are Complete; required package scripts remain exposed; 66 passing browser checks, nine completed PNGs, equal S7 hashes and nine independent decodes agree with this record. The owned 127.0.0.1 Vite server was stopped with Ctrl+C after verification (expected exit 130); the pre-existing ::1 server was left untouched.

**Next executable task: PSS-19 in a new conversation. Stop here; do not execute another prompt or the runner.**


## PSS-19 — Usability and measured rendering performance (2026-10-24)

Status: **Complete**. Verified PSS-18's completed row, 66-check browser/PNG evidence and actual persistence/restore, import ownership, pinned PNG export, demand scheduler, native fitter/shadow/pixel pipeline and UI before editing. All five PSS-19 acceptance criteria now have evidence. No Git repository was initialized. No later prompt or sequential runner was executed; PSS-20 remains Not started.

### Implementation / affected files

- **Measured runtime fixes:** `src/pixels/shadowVisibility.ts`, `src/scene/nativeCapture.ts`, `src/scene/referenceRuntime.ts`. Fixed kernel rays and an 81-byte eligibility scratch cache remove repeated surface checks without changing the filter. GPU visibility caches independently of shadow color/strength/radius; radius alone re-filters. Allocation invalidates all effect keys. Diagnostics zero skipped stages, distinguish effect readback and report preparation/presentation/whole callback; existing status reports pending render work and clears on completion/missing-model/disposal.
- **Usability / lifetime:** `src/components/ReferenceViewport.tsx`, `PresetManager.tsx`, `PaletteInspector.tsx`, `src/scene/previewPresentation.ts`, `src/App.tsx`, `App.css`. Current factory/saved/custom scene and actual factory/custom palette status are separate from a selected preset proposal; factory normalization is memoized. Existing labels/help/validation/resets/navigation remain connected. Preview checkerboards now have two native-size 2D backdrop canvases, separate from clean image/export bytes, allocated on first publication/resize and released on teardown. Runtime ownership uses a layout effect so controls detach while their host is still in its document.
- **Focused regressions:** `src/pixels/shadowVisibility.test.ts` adds an independent direct-filter oracle for every radius with holes/categories/normals/depths. `src/components/ReferenceViewport.test.tsx` uses real OrbitControls and a scoped non-graphics runtime substitute to verify pre-detachment cleanup under StrictMode/keyed remount/unmount. `src/App.test.tsx` proves current/selected factory/named/custom status and actual palette status.
- **Verification / docs:** new `scripts/verify-performance.mjs`, `scripts/verify-studio-polish.mjs`, `evidence/PSS-19.md` and `pss19-*` JSON, screenshots and PNG regression artifacts. Updated README/ARCHITECTURE/ROADMAP and this record. Removed confirmed unreferenced starter files `src/assets/hero.png`, `react.svg`, `vite.svg`. Package manifest, npm lockfile, configs and dependencies unchanged; ordinary dist/TS caches regenerated.

### Consequential decisions / measured findings

1. Preserve one renderer/scheduler, exact native resolution, deterministic algorithms, immutable publication copies and PSS-17 pinned export. The actual bottleneck was radius-4 visibility filtering, not FS. At 256² its baseline medians were **57.45ms orbit / 57.05ms light**, reduced to **35.40 / 35.15ms** in the final workload. Direct-oracle fixtures preserve exact Float32 results, mask/depth/normal/connected-ray rules and accumulation order. No worker, approximation, lower resolution, extra backend or dependency was justified.
2. Final 256² maximum-softness render callbacks measured median **46.30ms orbit / 42.00ms light**, maximum **47.7ms**; Original and Final each about **2.3ms**. Effects-off/hard callback maxima were **8.1 / 12.9ms**. Occasional complete page tasks still reached **50–64ms**; busy status/coalescing remain honest, and real numeric typing during light updates succeeded. No universal FPS/latency claim or maximum 1024²/dense-import performance claim is made. Exact workload, nested timing meanings, hardware, every sample and table are in [evidence/PSS-19.md](evidence/PSS-19.md).
3. Keep conservative store dirty revisions and refine runtime caches. View navigation performs no native work; coalesced palette/dither edits process once without normals; ambient/intensity/color edits reuse visibility; shadow appearance/radius skip GPU capture, with only radius rebuilding filtering. Disabled shadow changes render no visibility map. Settled/clicked revisions remain authoritative.
4. A real leak was measured: document keydown listeners grew **401→412** over twelve remount cycles. Installed OrbitControls disconnect queries `host.getRootNode()`; passive cleanup after React detachment removed from the wrong root. Layout-effect cleanup fixes it. The 32-cycle final run held **400 listeners, 2,176 nodes, one geometry/texture/program, one live runtime/target and five canvases** every cycle, with zero retained imported assets/materials/geometries/URLs. Warmed cycles 16–31 settled at **18.527–18.802 MiB** post-GC heap, ending **18.796 MiB**. This establishes the tested plateau, not a universal bound. The harness avoids compiling full RGBA literals per download so the measurement is not dominated by inspector script retention.
5. Current factory comparison must normalize its JSON field order; an initial UI regression test caught a false Custom label. Factories are serialized once through the existing codec and memoized. No duplicate editable/persisted scene state was added.
6. The tracked checkerboard presentation concern is now backed by explicit native backdrop ownership. Screenshots at 1440×900, 1024×768, 768×900 and enlarged crops were inspected; **7,168** transparent-background screenshot samples exactly matched the expected 2× checker pattern. Representative enabled theme text contrast is **6.27:1 or greater**, focus ring on controls **8.14:1**. Full assistive-technology/WCAG audit remains distinct from these checks.

### Exact verification commands / results

Environment: macOS **27.0 (26A428)**, MacBook Pro **Apple M2 Max**, 12 CPU cores, **32 GB RAM**; Node **24.22.1**, npm **11.19.1**; real headless **Chrome 155.0.8059.86**, WebGL2 **ANGLE Metal / Apple M2 Max**, DPR 1. Development 127.0.0.1:5173; production preview 127.0.0.1:4173. No canvas/WebGL mock supplies pixel evidence.

| Command / check | Actual result |
| --- | --- |
| `node --version && npm --version`; `sw_vers`; `system_profiler SPHardwareDataType` | Environment above; only relevant non-identifying hardware is recorded |
| `npm run typecheck && npm run test` (baseline) | Pass, **467/467** tests in 28 files |
| `npm run test -- src/pixels/shadowVisibility.test.ts` | Pass, **11/11**, including exact direct-filter oracle |
| `npm run typecheck && npm run test -- src/pixels/shadowVisibility.test.ts src/scene/nativeCapture.test.ts src/App.test.tsx` | Pass **39/39** before two later regression tests |
| `npm run test -- src/App.test.tsx src/scene/nativeCapture.test.ts src/pixels/shadowVisibility.test.ts` (intermediate) | One new current-factory assertion failed because JSON property order differed; normalized factory keys corrected; no renderer substitution |
| `npm run typecheck && npm run test -- src/App.test.tsx` | Pass **23/23**, including current/selected preset status |
| `npm run typecheck && npm run test -- src/components/ReferenceViewport.test.tsx` | Pass **1/1** actual OrbitControls cleanup regression. Initial duplicate import and erasable-only parameter-property errors were corrected, without suppression |
| `npm run typecheck && npm run lint && npm run test && npm run build` (final application source) | **All pass**, **470/470 tests in 29 files**, 6.42s. Production build 85 modules, 216ms; JS **1,053.27kB / 291.13kB gzip**, CSS **13.39kB / 3.56kB gzip**. Existing >500kB advisory remains visible and non-blocking |
| `npm run dev -- --host 127.0.0.1`; `curl` of native/filter/session modules | Local Vite 8.3.5 HTTP source verified. Owned server restarted after edits because filesystem changes were not always invalidating Vite's transformed cache; existing ::1 server untouched. One polling-env launch was tried, then ordinary fresh-source launches used |
| `node scripts/verify-performance.mjs` | Initial sandbox Chrome SIGABRT before checks; approved local-process escalation recovered. Initial harness schema/React-read mistakes produced no accepted profile; corrected |
| `node scripts/verify-performance.mjs`; `PSS_PROFILE_LABEL=optimized node scripts/verify-performance.mjs`; `PSS_PROFILE_LABEL=final node scripts/verify-performance.mjs` | Accepted baseline/filter-only runs **50/50** each, **32** gestures each. Final **74/74**, **48 gesture profiles / 384 measured moves**, required sizes/dithers, soft/hard/off, latest settled revisions; zero app warnings/errors/exceptions, local page requests only |
| `node scripts/verify-studio-polish.mjs` (final) | **204/204 checks**, **32** full resource cycles, **34** completed/decoded PNGs equal every preview/export byte, **34/34 URLs revoked**. Actual keyboard/numeric input, AX names, layouts, roll/perspective/zoom/pan/compare/collapse ownership, dirty counters, idle, model replacement and forced context loss/Retry passed. Zero console warnings/errors/uncaught exceptions; local requests only |
| `node /tmp/pss19-export-regression.mjs` | Exact copy of existing `scripts/verify-png-export.mjs`, changing only evidence prefix pss17→pss19-export to retain history: **238/238 checks, 38 completed PNG downloads decoded**, all RGBA/dimensions equal; races, failure/retry and context invalidation passed |
| `python3 /tmp/pss19-verify-png-files.py` | Existing `scripts/verify-png-files.py` with cwd/evidence prefix adjusted: **38/38 independent Pillow 12.3.0 decodes pass**, every RGBA byte; contact sheet generated |
| `npm run preview -- --host 127.0.0.1`; `PSS_PREVIEW=1 node scripts/verify-studio-polish.mjs` | Actual production bundle on **127.0.0.1:4173**, **4/4 checks**; Compare/Fit/Presets render, layout contained, development diagnostics absent, zero app warnings/errors/exceptions and local requests only |
| `node --check scripts/verify-performance.mjs && node --check scripts/verify-studio-polish.mjs` | Pass after removing unused harness imports |
| Local `view_image`, independent Pillow screenshot samples and inline relative-luminance calculation | Three requested layouts, comparison, enlarged crop and production preset panel inspected; checker samples **7,168/7,168** exact; representative contrast values saved in `pss19-contrast.json` |

Intermediate browser harness fixes awaited actual keyboard activation/React updates, used the clicked export capture when preview had not settled, and waited for the intentional one-second download URL delay. The listener-growth run was a genuine product failure, traced and fixed as above. The accepted final runs contain no failed check. Native Chrome stderr display-link/service diagnostics are not application console warnings; raw records retain them. There was no automatic approval rejection or request for user testing.

### Acceptance criteria

| Criterion | Verified evidence |
| --- | --- |
| 1. Labeled desktop/narrow workflows | **Satisfied — existing/focused DOM tests + actual browser.** Accessibility-tree names at all three sizes, keyboard panel/focus/draft/preview flow, actual numeric typing during rendering, correct current/selected preset status, mode help, independent sizes/resets and visible recovery; screenshots/contrast inspected |
| 2. Required 256² completion/input/latest export | **Satisfied — browser.** All four requested dither workloads under orbit/light with outline/soft/hard/off effects finish; latest canvas revision always matches; numeric input works during updates; rapid-edit export and later-preview races match the clicked authoritative revision and every decoded byte |
| 3. Actual costs/limitations | **Satisfied — measured browser stages.** 32/64/128/256² capture/readback/visibility/filter/CPU/compose/publication/presentation/total tables and raw samples, browser/OS/hardware/method, before/after bottleneck, long-task limits and justified no-worker decision |
| 4. Resource/remount/recovery plateau | **Satisfied — focused regression + actual browser.** Real listener defect fixed, 32 model/primitive/resize/effect/export/remount cycles retain stable listener/node/GPU/canvas counts and warmed heap plateau; context loss removes old canvases, explicit Retry reconstructs once; scheduler/export tests reject disposed/stale publication and URLs all release |
| 5. Optimization determinism/preview-export equality | **Satisfied — CPU + decoded browser/Pillow.** Exact direct-filter oracle across radii, all 470 deterministic fixtures/regressions pass; 34 integrated plus 38 regression downloads match native previews/captures; 38 independent full-byte decodes. No worker or transferable-buffer strategy was introduced |

### Limits / next executable task

No required PSS-19 criterion remains failed, open or unrun. The tested hardware/browser is one Chrome/Metal environment; other browsers/vendors, real screen-reader software and worst-case 1024²/maximum-complexity imports were not profiled. Whole-page maximum-softness tasks can still pause the main thread for 50–64ms. The existing bundle advisory remains non-blocking. Those are explicit scope/performance limits, not invented guarantees or waived required verification. PSS-20's final requirement-by-requirement audit has not been started or marked complete.

**Next executable task: PSS-20 in a fresh conversation. Stop here; do not execute its prompt or the sequential runner.**

Final consistency audit passed: all twenty ordered task rows retain five columns; only PSS-01–19 are Complete; required npm commands, 74/204/4 accepted profile/UI/production checks and the 32-cycle counters agree with this record. The first audit selector included historical acceptance-table headers; narrowing it to numbered task rows corrected the selector without changing any task status. Owned development/production-preview servers stopped with Ctrl+C (expected exit 130); the pre-existing ::1 server was left untouched.


## PSS-20 — Complete application audit (2026-10-24)

Status: **Complete**. Read applicable AGENTS.md/instructions, README, package/lock/configuration, the complete specification, architecture, roadmap traceability and all progress/completion records. Verified PSS-19's completed row and actual caching/cleanup/checkerboard/runtime/persistence/export/import implementation before editing. Audited every R01–R14 behavior and all **54** mandatory roadmap rows. No major missing system, disconnected control, graphics leak or acceptance-blocking integration defect was found. No later prompt or sequential runner was executed.

### Implementation and files by purpose

- **Production verification:** new `scripts/verify-application.mjs` runs actual production DOM controls, native pointer orbit, real selected palette files and completed downloads. It covers all seven primitives/24 geometry parameters, XYZ transforms, rolled axial/projection/FOV/manual/fit camera behavior, light controls/presets, all canvas sizes/placement, threshold/signal/palette/dither/effect paths, S7 complete named scene reload/restore, actual context loss and missing-WebGL recovery. It uses temporary Chrome profiles and no production store/debug/source imports. Unavailable-browser pipe errors terminate with a useful failure rather than an unhandled stream error.
- **Independent verification:** new `scripts/verify-application-evidence.py` decodes 56 actual PNG downloads with Pillow, compares every dimension/RGBA byte to retained final frames, rejects partial alpha/hidden RGB and independently square-stamps the decoded 2px silhouette ring. Existing export, preset, import, polish and performance scripts were rerun from exact temporary copies changing only evidence prefixes; independent import verifier checks 110 invariants across 20 fresh native frames. No new test framework or trivial duplicated unit tests were added.
- **QA artifacts:** new `evidence/PSS-20.md` provides explicit requirement/scenario, fixture, method/environment, expected/observed result, pass, evidence and severity/blocking status for all mandatory rows and S1–S9. `evidence/pss20-*` retains raw JSON/native-frame archives, actual PNGs, downloaded palette JSON, independent reports, measured profiles/resource records, screenshots/contact sheets and final command output. Existing `pss19-production-checks.json`/`pss19-production.png` were refreshed by the initial maintained production-smoke rerun. Native exported sprites, seven edited primitive images, layouts and actual production workspace were visually inspected locally.
- **Documentation:** README, ARCHITECTURE, ROADMAP and this progress document now describe verified completion, actual current owners/schema/limits, resolved palette file/checker/listener gaps, correct bundle/performance limits and no next executable task. Historical dated records remain. No application source, specification, dependency, package/lockfile, configuration, algorithm, resolution or palette/alpha requirement changed.

### Decisions and scope

Keep the existing single renderer/scheduler, native W×H capture/CPU pipeline, exact-byte palette/effect policy, stable frame ownership and pinned export. The audit found documentation drift and coverage gaps, so those were corrected without rewriting working systems. Production tests use actual clean canvas bytes; development tests separately compare the underlying authoritative frame to actual decoded exports. Screenshots never substitute for those pixel comparisons. Main-thread maximum softness remains an explicit measured limitation; no new worker or approximate algorithm was justified.

Safari exists, but `cua.getApp('com.apple.Safari')` returned **“Computer Use was not approved to use Safari.”** The representative second-engine transparency/palette/export smoke is **Unrun**, with no compatibility claim or workaround. The prompt explicitly permits this recorded limitation if a second browser is unavailable. No significant required primary-browser check remains unrun.

### Exact verification and observations

Environment: Node **24.22.1**, npm **11.19.1**, macOS **27.0 (26A428)**, real headless Chrome **155.0.8059.86**, WebGL2 **ANGLE Metal / Apple M2 Max**. Production 1500×1100/DPR1 and rectangular DPR2; development/layout/performance sizes and exact fixtures are listed in [QA evidence](evidence/PSS-20.md). No mocked canvas/WebGL supplied pixel evidence. All page requests remained localhost/blob/data.

| Command / observation | Result |
| --- | --- |
| `node --version && npm --version`; `sw_vers`; `npm ls --depth=0`; parsed package/lock metadata | Versions above; installed tree valid; lockfile v3 root dependencies/devDependencies equal manifest; all PSS-01 commands preserved |
| Baseline `npm run typecheck && npm run lint && npm run test && npm run build` | All pass, **470 tests / 29 files**, 6.07s; build 85 modules / 236ms |
| `npm run dev -- --host 127.0.0.1` | Vite ready 100ms at 127.0.0.1:5173 |
| `npm run preview -- --host 127.0.0.1` | Production preview at 127.0.0.1:4173 |
| `node scripts/verify-application.mjs` (final maintained source) | **126/126**, **9** actual production downloads decoded; no page exceptions/warnings/errors |
| `node /tmp/pss20-verify-png-export.mjs` | **238/238**, **38** actual PNGs decoded; latest clicked revisions, all dither/background/effects/import cases, races/failures/retries and URL cleanup pass |
| `node /tmp/pss20-verify-presets.mjs` | **66/66**, **9** actual PNGs decoded; complete settings/pixels reload, named/factory operations, corrupt/future/quota/unavailable storage and model reselect pass |
| `node /tmp/pss20-verify-model-import.mjs` | **74/74**, **20** native frame sets; both formats/companions, caps/failures/cancel/resources pass |
| `node /tmp/pss20-verify-studio-polish.mjs` | **204/204**, **32** resource cycles, **34** additional downloaded/decoded PNGs; keyboard/layout/gesture/counter/idle/recovery/URL checks pass |
| `PSS_PROFILE_LABEL=audit node /tmp/pss20-verify-performance.mjs` | **74/74**, **48 profiles /384 measured moves**; 32/64/128/256, four dither algorithms, hard/soft/off, every settled revision current |
| `PSS_PREVIEW=1 node scripts/verify-studio-polish.mjs` | **4/4** production smoke, no diagnostics panel/overflow/warnings/errors |
| `python3 /tmp/pss20-verify-png-files.py`; `python3 /tmp/pss20-verify-preset-pngs.py` | **38/38** and **9/9** independent file decodes, contact sheets generated |
| `python3 /tmp/pss20-pss16-verify-native.py` | **110/110** independent imported-frame checks |
| `python3 scripts/verify-application-evidence.py` | **56/56** independent Pillow 12.3.0 file decodes, exact dimensions/RGBA/binary alpha/zero hidden RGB, plus exact square-stamped **272-pixel** 2px outline |
| `node --check scripts/verify-application.mjs` | Pass |
| Final `(npm run typecheck && npm run lint && npm run test && npm run build) 2>&1 | tee docs/pixel-shading-studio/evidence/pss20-commands.txt` with pipefail | **All pass**, **470/470**, 29 files, **6.05s**, build 85 modules/182ms. JS 1,053.27kB/291.13kB gzip; CSS 13.39kB/3.56kB gzip; unsuppressed existing >500kB advisory |

The first sandboxed Chrome launch aborted before checks (EPIPE); approved local process execution recovered. New audit harness iterations corrected wrong label/preset selectors and a nested-textarea label lookup. A temporary independent verifier initially resolved its /tmp directory rather than repository evidence; correcting the root produced 110/110. These were incomplete verification attempts, never product passes. Final accepted reports have zero failed assertions and no application console warnings/errors. Chrome host/service stderr remains separate. No automatic approval rejection, user testing request, upload, public bind or deployment occurred.

S1 production measures exactly **812 pixels**, **32×32 at 16,16**, only the four mandated blues. S8 measures 32×32 at 32,16 on 96×64; zoom/DPR preserve complete bytes and PNG dimensions. S3 strength0=None and repeated Bayer frames match; S4 real scalar/RGB FS fixtures pass and production FS repeats/differs from Bayer within the palette. S5 exact morphology, custom/strict and clipping pass. S6 every independently decoded alpha/edge matches. S7 all nondefault fixture fields and settled pixels survive actual reload and named restore in production. S9 full desktop/import/error/reset/keyboard/resource workflow and checks pass. The QA document gives per-scenario artifacts and settings.

256² maximum-softness callback median/max: **48.95/51.4ms orbit**, **44.05/47.5ms light**; whole-page maximum 72ms. Real numeric input during repeated rendering succeeds. Warmed 32-cycle post-GC heap **18.533–18.814MiB**, **400 stable listeners**, **one geometry/texture/program**, **one runtime/target**, **five canvases**, **zero import resources/URLs**. All 34 polish download URLs revoke; idle frames stop. These are recorded samples/plateaus, not universal latency or zero-allocation claims.

### Acceptance and remaining limits

1. **Satisfied:** all 54 mandatory roadmap rows and R01–R14 have observed evidence, with none blocked.
2. **Satisfied:** S1–S9 behavioral/visual checks pass;90 browser-decoded downloads,56 also independently decoded; complete preset reproduction and native dimensions/colors/alpha verified.
3. **Satisfied:** strict typecheck/lint/470 tests/production build pass; only the documented non-blocking chunk advisory remains.
4. **Satisfied:** required common/256 interactions, deterministic final/clicked revision and resource plateaus verified.
5. **Satisfied:** implementation docs and progress match reality. No significant acceptance-blocking defect or required unrun primary check remains.

Non-blocking limits: unavailable second-engine smoke; cross-GPU raster equality unpromised; maximum-softness main-thread pauses; worst-case 1024²/dense-import latency, full screen-reader conformance and physical OOM/quota pressure not claimed. Static import/schema1 boundaries and optional deferred features remain documented. No next implementation task exists. Stop here; do not execute another prompt or the sequential runner.

Final documentation/evidence consistency check passed: exactly twenty five-column task rows, all Complete; all 54 roadmap requirement names/behaviors copied unchanged into 54 nine-column QA rows; every local documentation/evidence link resolves; final raw browser reports have no failures. Final independent 56-file decode/morphology and maintained harness syntax checks pass. Both session-owned localhost servers were stopped with Ctrl+C (expected exit 130); the pre-existing server was preserved.
