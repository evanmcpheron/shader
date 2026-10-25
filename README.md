# Pixel Shading Studio

A browser-local pixel shading tool built incrementally on the existing npm, React, TypeScript, and Vite project. The root route (`/`) displays a dark workspace with a real lit Three reference, seven editable primitives, independent object transforms, camera orbit/roll/projection controls, directional/ambient lighting controls and a draggable light handle, scene/pixel inspectors, native-resolution smooth/flat lighting, exact cel/discrete ramps and signal controls, explicit transparent/solid output backgrounds and isolated resets. Use final-only, native continuous-original-only or synchronized side-by-side views with independent preview zoom/pan and view-only overlays. Independent native subject fitting and measured bounds are active. Exact palette editing, nearest-color matching, local palette JSON/hex interchange and native-grid Bayer/blue-noise thresholds, sequential Floyd–Steinberg diffusion and opaque native silhouette outlines, directional self/ground shadows and bounded local static GLB/glTF references are active; Native PNG export and complete browser-local presets/autosave are active, with recovery notices and matching imported-file reselect. Product implementation is tracked in [the roadmap](docs/pixel-shading-studio/ROADMAP.md) and verified task status in [the progress record](docs/pixel-shading-studio/PROGRESS.md).

## Setup

Use npm and the existing `package-lock.json` (lockfile v3). Node 24 LTS, version **24.15.0 or newer**, is recommended. The supported engine range is `^22.22.2 || ^24.15.0 || >=26.0.0`, required by the selected jsdom release and compatible with Vitest and the existing stack. Verification used Node **24.22.1** and npm **11.19.1**.

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Use the URL printed by Vite; it selects another port when the default port is occupied. Reproducible installation can also enforce compatibility explicitly with `npm ci --engine-strict --strict-peer-deps`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite with HMR |
| `npm run typecheck` | Check both strict TypeScript projects with `tsc -b --noEmit` |
| `npm run lint` | Run the existing ESLint flat configuration |
| `npm run test` | Run Vitest once with `vitest run` |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run build` | Run `tsc -b && vite build`; write the production bundle to `dist/` |
| `npm run preview` | Serve the production build locally |

Both TypeScript projects retain ESM, unused checks, and no-emit settings. No baseline source fixes were necessary when enabling strict mode.

## GitHub Pages

The hosted app is at [evanmcpheron.github.io/shader](https://evanmcpheron.github.io/shader/), with source in [evanmcpheron/shader](https://github.com/evanmcpheron/shader). The explicit GitHub Pages deployment request supersedes the earlier local-only publishing restriction for this static application. Imported models, presets, autosave, and exports remain in the browser; there is no backend or upload service. The hosted origin has its own browser storage, so existing localhost presets can be transferred through the app's local JSON export/import.

Push to `main` to run lint, tests, and the production build, then deploy `dist/` through [.github/workflows/deploy.yml](.github/workflows/deploy.yml). The workflow can also be started manually from GitHub Actions. Pages uses **GitHub Actions** as its publishing source.

The Pages build sets Vite's base to `/shader/` as described in the [Vite deployment guide](https://vite.dev/guide/static-deploy.html#github-pages). Ordinary local development and builds retain their existing root path. To reproduce the hosted build locally:

```sh
npm run build -- --base=/shader/
npm run preview -- --host 127.0.0.1 --base=/shader/
```

Open `http://127.0.0.1:4173/shader/` (or the port printed by Vite). Only the built static app is deployed; source documentation, verification evidence, logs, and fixtures are not included in the Pages artifact.

## Implementation task runner

PSS-01–20 are complete. The final audit and compatibility limits are recorded in [PSS-20 QA evidence](docs/pixel-shading-studio/evidence/PSS-20.md). No implementation prompt remains to run. The existing runner is retained for explicitly requested task reruns; consult PROGRESS.md before choosing `--from`:

```sh
npm run prompts:run -- --from 20
```

Each invocation of `codex exec` starts a new conversation and waits until it finishes before the next begins. All conversations work in this directory, so source changes and `PROGRESS.md` carry forward. The runner uses your saved CLI login and configured model; run `codex login` first if needed. It allows workspace edits and network access and disables interactive approval requests. It supports this project's current directory without requiring Git. This uses the [official Codex non-interactive workflow](https://learn.chatgpt.com/docs/non-interactive-mode).

Every prompt also includes [the project instructions](AGENTS.md): make decisions without waiting for user answers, favor a robust experience for learning to draw professional-quality pixel art, and keep the application and its data local. Development and verification use localhost; deployment, publishing, cloud services, and uploads of personal content are excluded. Network access remains available for development documentation and package installation. Consequential decisions are recorded in the progress entry for later review.

Preview the sequence or restart from a particular task:

```sh
npm run prompts:run -- --dry-run
npm run prompts:run -- --from 20
npm run prompts:run -- --from 04 --to 06
```

Optional `--model MODEL` and `--profile NAME` select a different CLI model or profile. Use `--help` for all options. You can also run `bash /path/to/shader/scripts/run-prompts.sh` from another directory.

The runner checks each preceding task is **Complete** and stops on a CLI/logging failure or when the current task is not marked **Complete** in the progress table. Required browser checks that cannot run remain blockers. Resolve the issue and restart with `--from` for that task; existing work is retained and the prompt directs Codex to assess remaining gaps. Each attempt saves the exact prompt, a combined live log, and the final response under `logs/prompt-runs/<timestamp>.<unique-id>/`. Those logs are already ignored by `.gitignore`. Press **Ctrl+C** to interrupt the sequence. Keep one runner active in this workspace at a time.

## Dependencies and compatibility

The preserved locked versions are React/react-dom **19.3.1**, Vite **8.3.5**, `@vitejs/plugin-react` **6.1.2**, TypeScript **6.0.3**, ESLint **10.13.0**, and typescript-eslint **8.72.0**. All pre-existing locked package versions are preserved. New direct dependencies are pinned exactly:

| Package | Version | Purpose and compatibility |
| --- | --- | --- |
| `three` | 0.186.1 | Native geometry/capture and local static-model loading |
| `zustand` | 5.0.16 | Shared settings/view store; React peer accepts the installed React 19 |
| `@types/three` | 0.186.0 | Type declarations matching Three release 186; the runtime package does not bundle them |
| `vitest` | 5.0.5 | Vite-integrated test runner; its Vite peer range includes Vite 8 |
| `jsdom` | 30.1.3 | DOM environment scoped to UI tests; sets the stricter project Node range |
| `@testing-library/react` | 16.3.3 | Real component interactions; supports React/react-dom 19 and their type declarations |
| `@testing-library/dom` | 10.4.2 | Explicitly satisfies React Testing Library's required `^10.0.0` peer |

Zustand's unused integrations and jsdom's native canvas peer are optional and are not installed. Studio interaction tests use Testing Library's `fireEvent`; no user-event or custom matcher dependency is needed. PSS-03 added no dependencies or configuration changes.

## Tests

`vite.config.ts` shares the existing React transform with Vitest and explicitly defaults tests to **Node**. Pure state and native-array tests can run without a simulated DOM. UI tests opt into jsdom with the file directive `// @vitest-environment jsdom`; `src/App.test.tsx` is the current example.

Studio interaction tests render the actual app under React StrictMode with an isolated store. They cover tool selection, focus recovery, independent resets, responsive panels, help/status, validated geometry/transform/camera/light drafts, camera presets/projections/reset isolation, native dimensions/backgrounds/mode switches, and retry with unavailable WebGL2. A scoped `matchMedia` stub tests breakpoint behavior, not CSS layout. Cleanup unmounts the app and restores globals after every test. The complete suite has **474 tests** across twenty-nine files, including real Three geometry/normal/disposal invariants, light math, gesture cancellation, native row orientation/normal decoding/display conversion, frame ownership, state restoration and invalidation scheduling. jsdom has no WebGL2 and verifies the visible failure path without mocked graphics. Native resource/renderer-state tests use a scoped test double for control flow, never as pixel evidence. Real Chrome rendering, lifecycle and resource-counter evidence are recorded in the PSS-04/05/06/07/08/09/10/11/12/13/14/15 progress entries.

Pure Node tests also cover complete scene JSON round trips, numeric/color/geometry boundaries, algorithm-specific settings, independent resets, dirty revisions, preview isolation and atomic restore. No graphics resources or storage mocks are needed for these tests.

## Scene settings and state

`src/domain/` defines the version-1 JSON settings contract, canonical blue-sphere defaults, declared numeric limits, and pure validators. `validateSceneSettings(unknown)` returns normalized settings and fit-box notices, or a deterministic field-specific error. All sections and active fields are required, except optional directional-shadow bias (default 0.5 map texels for older version-1 scenes); unknown fields and schema versions are rejected. Colors normalize to opaque uppercase `#RRGGBB`; numeric values outside declared bounds are rejected without truncation.

`src/app/studioStore.ts` provides the shared `studioStore` and an isolated `createStudioStore` factory. Use its validated actions and small selectors through Zustand's `useStore`. Serialize only `store.getState().settings`. Preview/tool/status state, actions and capture/style/shadow/view revisions are separate and never belong in scene JSON. Complete restore uses one state transition; failed restores preserve the current scene. PSS-18 adds browser-local current/named persistence through `src/persistence/`; schema version 1 is the only supported version, so no historical migration is claimed. Initialization validates before React mounts; failed reads/writes preserve in-memory work and unreadable originals.

The [architecture's implemented contract](docs/pixel-shading-studio/ARCHITECTURE.md#implemented-settings-contract-pss-02) documents units, limits, palette/threshold behavior and section/full/preview reset boundaries. The shell consumes these actions directly through small Zustand selectors.

## Workspace shell

Use **Scene** and **Pixels** to open settings. Phones (under 600 CSS pixels wide) use a bottom settings dock with **More space** / **Less** and section navigation. Tablets use one side dock; short wide viewports use the landscape side arrangement. Desktop starts with both inspectors visible when at least 1200×600 CSS pixels are available. Docks scroll independently and keep the live renderer mounted. Escape closes an inspector and returns focus to its toggle.

**Orbit**, **Light** and **Pan** select one-finger / pointer gestures beside the preview. Light drags the amber dot; Pan moves only the displayed image. **+**, **−**, **Fit view** and **Native** are visible alternatives to wheel and keyboard controls. Tap the percentage / ellipsis button for **Preview options**, including precise zoom, overlays, centering, reframe and pixel readouts. Final and Original share framing; comparison stacks when the narrow preview is tall enough, using two columns in shorter workspaces. Opening settings or rotating never changes deliberate zoom/pan.

**Presets**, **Preview options** and **Activity & help** use modal dialogs with independent scrolling, Escape/Done dismissal and focus recovery. Routine local-save status stays compact; full messages, help and compact-layout resets are in Activity & help. Presets retains save retry and recovery JSON. Native viewport height, safe-area insets and editable 16px compact inputs accommodate small screens; signed fields retain access to a full keyboard. Browser viewport checks and remaining physical-device/import/deployment limitations are recorded in [adaptive QA](docs/pixel-shading-studio/evidence/ADAPTIVE.md).

**Reset scene** restores all stored scene settings while retaining view/tool state. **Reset view** restores presentation/tool defaults while retaining the scene. Tool selection changes only `preview.tool`; Camera orbit enables camera gestures. Move light gives the handle ownership during a drag and permits camera orbit from empty space. Pan preview owns image-only drag/arrow navigation and pauses camera gestures. Wheel always zooms the preview; manual camera dolly/zoom uses middle-drag or numeric controls. The current scene autosaves locally after a pause and restores on reload when browser storage is available. Subject, camera, lighting, native canvas dimensions and backgrounds are editable. Palette & ramp provides exact entry editing, reordering, presets and local interchange. The subject editor has numeric inputs and sliders backed by the shared renderer; native outlines are editable; ground and directional shadows are editable; PNG export is active; complete named presets and factory scenes are available from Presets.

## Lit reference and graphics ownership

Choose Sphere, Cube, Cylinder, Cone, Square pyramid, Torus or Plane in Subject. Dimensions use world units and rotations use XYZ Euler degrees. Numeric inputs accept the documented domain bounds; sliders cover common sizes and angles. Invalid drafts show errors and keep the last valid reference; Escape restores the field. Scales may be signed/nonuniform but must have magnitude at least 0.001. Reset geometry and Reset transforms are independent. Show mesh edges overlays triangle topology, including hidden faces and flat-surface subdivisions; Reset view turns it off.

Shape selection, geometry reset and object edits preserve the manual camera. Use **Reframe reference** to explicitly center/size the camera if the object grows or moves outside the view. Reframe updates only validated camera settings; it never runs automatically or changes object transforms/the native fit box. The pyramid has an axis-aligned XZ square base and +Y apex; the plane lies in XY and is visible on both sides.

One directly owned WebGL2 renderer/context draws a Lambert-lit subject using current base color and directional/ambient settings with an orthographic default camera. It renders only when invalidated, reuses geometry across transform edits and disposes resources on replacement/unmount. Context loss or creation/allocation failure displays guidance and **Retry renderer**, which reconstructs from current settings. Native-frame capture shares the same failure/retry owner; a failed runtime discards frames and removes all five owned canvases. Export PNG is available only with a healthy renderer. The displayed original now uses the same native continuous frame and active normals as final, before styling. A hidden WebGL canvas retains the single capture context; two exact W×H 2D canvases present cached original/final bytes. Camera and light tools operate on either visible panel.

In development, `/?scene-checks` adds a folded verification panel with explicit counter refresh, keyed StrictMode remount and failure simulations. It is absent from production UI and does not poll or animate. The current production bundle includes Three and triggers Vite's 500 kB chunk-size advisory; it remains entirely local with no hosted dependencies. No chunk-limit suppression or extra framework was added.

React owns UI, Zustand owns settings, and `src/scene/` owns graphics resources. The same renderer/scheduler/retry owner also captures native normals and publishes the authoritative CPU pixel frame; see [the architecture](docs/pixel-shading-studio/ARCHITECTURE.md).

## Native pixels

Choose **Final only**, **Original only**, or **Compare**. Final applies the selected smooth, flat, cel, discrete-band or nearest-palette mode. Original stays continuous with the same active normals, base reflectance, light and framing, before signal controls and ramp selection. Camera gestures and the light handle work in all three modes. Native canvas presets are 8, 16, 24, 32, 48, 64, 96, 128 and 256 square pixels; independent width/height support 1–1024 with a 1,048,576-pixel cap and GPU/allocation checks. Canvas edits never scale or downsample a larger render. Pixel-fit mode derives an aspect-preserving crop from actual transformed mesh vertices and the saved orbit orientation. Manual mode uses the saved camera at output aspect. Cel/band and nearest-color shading write exact stored palette bytes.

The normal/category target is byte RGBA data with nearest filtering, no MSAA/mipmaps/output conversion, depth testing and no blending. Synchronous readback flips rows once. `src/pixels/nativeFrame.ts` processes top-left normals with the shared linear Lambert contract and one sRGB display conversion. Transparent output has RGB=0/alpha=0; subject coverage is alpha=255. Solid background uses exact chosen RGB bytes. The checkerboard is display only.

The final frame owns stable `{width,height,rgba,revision,captureRevision}` bytes outside React/store state. Work buffers and the GPU target are reused by size; each publication copies its finished work bytes so later edits cannot mutate a retained frame. Native ImageData is written to an exact W×H sRGB 2D canvas, with smoothing disabled and integer nearest display scaling. CSS size and DPR never change those pixels. Preview navigation/comparison is active; Export PNG encodes those exact final bytes at canvas W×H.

Geometry/camera/canvas revisions recapture normals; lighting/background/style edits reuse them; view changes only redraw presentation. One demand scheduler coalesces work and rejects superseded/disposed generations. Context loss/allocation/readback errors use the existing explicit **Retry renderer** path, preserving settings and clearing stale frames. Development diagnostics expose actual frame/target dimensions, byte lengths, revisions, timings, resource counts and an explicit **Inspect native RGBA** action.

PSS-07 verification used real Chrome 155 WebGL2 on Apple M2 Max/ANGLE Metal. All nine presets plus 96×64, row/light orientation, binary alpha/zero hidden RGB, exact canvas bytes, resize/DPR isolation, rapid edits, capture reuse and resource recovery passed. Detailed evidence and limitations are in [PROGRESS.md](docs/pixel-shading-studio/PROGRESS.md).

## Subject framing

**Subject framing** separates the maximum subject box from canvas dimensions. The default sphere occupies exactly 32×32 mask pixels at x/y=16..47 on 64×64; a 96×64 canvas keeps it 32×32 at x=32..63, y=16..47. Requested box, padded effective maximum and actual occupied native bounds have distinct labels. A 3:1 plane in a 48×24 box measures 48×16; fitting never stretches geometry or resamples a finished image.

Choose one of nine alignments, integer offsets (+X right/+Y down), and per-edge padding. Alignment places the **measured subject** inside the padded canvas. Center floors the spare left/top margin, leaving an odd extra pixel right/bottom; offsets apply afterward and can intentionally clip. An oversized request is retained and visibly clamped to the padded area. Padding that leaves no drawable pixel is rejected. Reset framing preserves canvas, object, camera, lights and palette.

Fitting uses at most **12 native calibration samples plus one final placement capture**, with uniform scale correction bounded to ±12.5% of the analytic fit and quarter-pixel phase trials. A parity-aware starting phase keeps even occupied dimensions stable on odd canvases. The settled projection/mask is cached across light/palette edits. Orientation, geometry, canvas and framing changes invalidate it. No saved pose or object transform is written by fitting. World translation still exists for lighting/ground relationships; pixel fitting recenters the projected subject.

Near/far-plane crossings, empty/edge-on silhouettes and failed calibration show measured results and useful guidance. Depth/area failures show the saved manual projection; switch to manual framing to move the camera. Failed calibration displays the best sampled projection, including an honest empty result. Clipping reports visible bounds only; conservative projected-vertex checks also report camera/frustum limits. Ground/helpers and effects are excluded from subject measurements; outlines, receiver and shadows report separate conservative extents. PNG/decoded export verification remains PSS-17.

## Camera controls

Select **Camera orbit**: drag to orbit. In manual framing, middle-drag to zoom or dolly (wheel always zooms the preview), right-drag or Shift-drag to pan. Focus the reference and use arrows to pan or Shift+arrows to orbit. Numeric camera position, target, distance, zoom/span, FOV and roll controls work independently of the selected tool. Touch uses one finger to orbit and two fingers to pan/zoom. Camera gestures and presets keep object/light settings intact.

With visible or shadow-only ground enabled, orbit stops at the horizon and the camera stays above the ground's actual height. Camera views, numeric edits and restored scenes follow the same limit while the renderer is active. Turn ground off for unrestricted views. Object and ground transforms stay independent.

Front/back/left/right/top/bottom/isometric views retain target, distance and roll. Roll is applied to a derived render camera, so later orbit/zoom/projection switches retain it. **Reset camera** restores front-facing orthographic defaults and zero roll; Reset view and object resets keep the camera. Settings JSON contains a single camera pose and roll; complete presets and autosave preserve it.

Switching projections matches scale at the target plane while retaining direction, target and roll. Perspective adds foreshortening, so overall bounds can change. FOV is bounded to 1–179° and zoom to 0.01–100. Camera-only axis/span limits are wider than geometry limits so explicit Reframe still handles world radii from 0.000001 to 1,000,000; invalid/singular or unrepresentable adjustments keep the last valid camera and show an error. Original and final share the fitted native projection. Pixel fit derives that projection without modifying the saved manual camera, locks pan/zoom gestures and numeric pose/scale controls, and keeps orbit/roll available. Switch to manual framing to edit camera placement and size; switching retains the saved pose and fit values.

PSS-05 verification includes real Chrome orbit, separate object rotation, wheel zoom/dolly, rolled keyboard pan, both projections/FOV, every view including exact poles, reset/tool isolation, five StrictMode remounts and idle counters. See [the PSS-05 progress record](docs/pixel-shading-studio/PROGRESS.md) and its saved browser evidence. No dependencies or package scripts changed.

## Lighting controls

Directional position and target use world units; surface-to-light direction is normalized **position − target**. There is no independent saved direction. Directional and ambient colors have a color picker and precise opaque RGB hex entry. Intensities accept 0–10; sliders cover common values. Invalid or coincident endpoints keep the last valid reference. Upper Right, Upper Left, Overhead, Side and Flat Ambient presets use world axes; lighting reset/presets preserve object, camera and palette. Flat Ambient has zero directional intensity and unit ambient fill. Ground & shadows adds directional self/ground visibility before quantization; ambient remains present.

Select **Move light** and drag the amber marker. Its reference-only ring/arm show direction at a convenient radius around the target, rather than the source's actual distance. A screen arcball rotates the position around the unchanged target while retaining that distance. Camera gestures are suspended only while the handle owns the pointer. Empty-space drags still orbit. Escape, pointer cancellation, lost capture and window blur cancel the light drag and restore its starting position. Tool changes, numeric edits and resize end the gesture while retaining the latest valid settings. Inputs and handle share the same state. If the target/handle is outside the view, adjust target or camera numerically to bring it back.

The continuous reference uses linear-sRGB `base × (ambientColor × ambientIntensity + directionalColor × directionalIntensity × max(dot(N,L),0))`, with one final sRGB display conversion and saturation. No tone mapping or environment map is used. `src/domain/lighting.ts` supplies derivation/math shared by reference and native processing; the Three Lambert adapter compensates its installed shader's `1/PI` factor so unit light has the same meaning. Light-only edits request lighting invalidation and reuse geometry/capture revisions. Helpers use layer 1; subject meshes remain layer 0. Display screenshots are reference evidence, not native output.

## Preview navigation and comparison

**Final only**, **Original only** and **Compare** use one native scene/camera and separate owned frame bytes. Original means continuous Lambert shading with the active smooth/flat normals, same lighting/framing/background, before signal, band, palette, dithering and outline processing. At neutral signal settings continuous Final matches Original; cel/bands style Final while Original stays continuous. No second renderer or context is created.

Use integer **−/+** steps, a precise numeric zoom percentage, **Fit view**, **100% / native**, or **Center view**. Wheel zoom anchors to the pointer in either panel. Fit runs on the first valid frame and explicit requests; changing the scene, layout or canvas dimensions preserves navigation. Fit uses integers when possible; a below-100% fit uses nearest sampling with a notice about unequal display block widths. Native means one output pixel per CSS pixel at 100% browser zoom, independent of physical screen DPR.

**Pan preview**: drag or arrows move only the presentation; Shift+arrows moves farther. Escape cancels an active pan or light drag. Focus the image and press **F** to fit, **N** for native/center, **0** to reset view, or **+/−** to zoom. Camera orbit and Move light retain exclusive ownership; empty space still orbits with Move light. Manual framing provides labeled camera distance/zoom inputs and middle-drag for camera dolly/zoom. Grid is hidden below 4×. Grid, checkerboard, light markers and optional topology overlay never enter frame bytes. The checkerboard follows the output rectangle and remains separate from transparent/solid output backgrounds.

Canvas size, measured subject size, preview zoom/pan and hovered native pixel coordinates are visible. `/?scene-checks` exposes both cached RGBA frames and actual panel/image rectangles for local verification. PSS-09 evidence includes 46 Chrome checks, real native browser zoom at 125%, and exact 8× screenshot/grid samples; see PROGRESS.md.

## Shading

**Smooth reference** interpolates vertex normals; **Flat shading** uses true triangle normals without rebuilding geometry. Both use continuous linear base reflectance × light with one sRGB conversion. Cel and Discrete pixel-art bands select exact stored ramp bytes using geometry-derived linear illumination luminance. They share the boundary mapper; choose fewer levels for broad cel regions. Their separate normal selector controls smooth versus faceted surfaces. Colored light tints continuous RGB and moves ramp placement while retaining exact ramp RGB.

Brightness, centered contrast and shade-distribution exponent apply before color selection; Original bypasses them. Illumination saturates to 0–1 before contrast, then brightness, clamp and exponent. Thresholds must increase strictly inside 0–1; equality selects the higher artist index. Invalid drafts keep the last valid frame.

The default four-color ramp uses boundaries 0.22, 0.5 and 0.75. The narrower deepest-shadow band leaves more room for the lighter dark tone while keeping both visible above the default 0.2 ambient floor. Reset shading restores these boundaries for four-color ramps and evenly spaced boundaries for other counts. Saved scenes retain their stored boundaries.

Set **Levels**, review the removal notice, then **Apply levels**. Existing retained entries/boundaries stay unchanged; added levels append highlight bytes and split the remaining upper interval. **Generate ramp from colors** explicitly replaces entries using linear-RGB shadow→base→highlight interpolation, keeping boundaries. One level generates base; two generate shadow/highlight. Reset shading keeps stored colors. Palette & ramp provides entry editing, named presets, explicit resampling, interchange and nearest-color mapping, described below.

PSS-10 verification includes 274 automated tests, actual Chrome WebGL cube/light and smooth/flat sphere/cone checks, exact frame-byte/color-set comparisons, capture reuse, mode/remount/context recovery, and nested mirrored/nonuniform static-mesh GPU fixtures. See the detailed [progress evidence](docs/pixel-shading-studio/PROGRESS.md).


## Exact palettes and ordered ramps

**Palette & ramp** holds 1–32 opaque sRGB colors, shared by cel/bands and palette-constrained shading. Edit each picker or #RRGGBB field, add/remove entries, and move entries earlier/later. Artist order and duplicates are preserved. Apply a named preset explicitly; Game Boy-inspired and NES-inspired are aesthetic labels, not hardware accuracy claims. Reset palette restores the documented four blues and explicit effect policy while retaining other shading/light settings.

**Palette-constrained shading** chooses the smallest squared Euclidean distance `Δr² + Δg² + Δb²` in decoded linear-sRGB. This is a linear-light RGB metric, not a perceptual color-difference measure. Exact ties select the lowest artist index. Decoded entries are cached by immutable color-list identity. Base × colored light passes through the established signal controls before matching. Final writes original entry bytes; no gamma, tone adjustment or display conversion follows selection. Continuous smooth/flat encode once. Saturation here means clipping linear energy/signal to 0–1, not changing HSV/HSL color saturation; intensities above that range can select the same endpoint repeatedly.

Ordinary **Apply levels** retains entries/boundaries. **Resample ordered ramp** explicitly samples the existing ordered path in linear RGB at a new count and stores the converted bytes once. Endpoints remain exact; one entry keeps the first existing color. **Generate ramp from colors** samples shadow→base→highlight instead. Both produce editable entries. Same-count edits/reordering preserve boundaries. Remove, preset/import count changes and explicit resampling reset active boundaries evenly, as disclosed before applying.

**Palette interchange** accepts local files or pasted text up to 16 KiB. File reading stages text for review; Import applies the complete validated palette atomically. Errors retain settings/revisions/pixels. JSON accepts exactly:

```json
{"schemaVersion":1,"colors":["#172038","#304878","#5C88B8","#B8D8F0"],"effectPolicy":"explicit"}
```

Hex lists contain 1–32 six-digit colors separated by whitespace or commas, with optional #; order/duplicates remain intact and the current effect policy is kept. Export text and local JSON/hex downloads contain palette configuration only. They do not export images, ramp thresholds or complete scenes. Hex export omits policy; JSON retains it.

Subject colors are restricted in cel/bands/palette modes. Transparent pixels are excluded from color counts. **Allow separate effect colors** retains separately configured background, outline, receiver and ground shadow colors; these may add colors outside the subject palette. **Strict · map all effect colors** maps solid background, outline, receiver and shadow colors with the same nearest-color metric before writing bytes. Continuous subject modes remain unrestricted, and Original retains its continuous colors/exact configured background for comparison.

PSS-11 automated and real Chrome native-frame evidence is in [PROGRESS.md](docs/pixel-shading-studio/PROGRESS.md). PSS-20 additionally verifies actual local palette file selection, staged review, atomic apply, and an exact downloaded palette JSON round trip in the production build. Oversize/rejected file and text paths remain covered by focused component tests.


## Native-grid dithering

**Dithering** offers None, Bayer 2×2, 4×4, 8×8, Blue noise and Floyd–Steinberg for cel, discrete bands and palette-constrained shading. Strength is 0–1; zero dispatches to the exact None mapper. Pattern scale is an integer 1–8 native pixels per threshold cell. Threshold patterns start at output (0,0), repeat every tile-size × scale pixels and stay fixed through preview zoom/pan/grid/fit and browser DPR changes. Original stays undithered. Continuous smooth/flat modes retain settings with a clear inactive notice and hide irrelevant numeric controls.

For Bayer and blue noise, ramp transition width is 0–1 shade intervals: the continuous ramp coordinate receives `strength × (0.5 − threshold) × width` before rounding. Zero width preserves hard bands. Palette mode hides width and instead shifts each continuous linear-RGB channel by `strength × (0.5 − threshold) × amplitude`, clamping to [0,1] before nearest selection. Amplitude is the smallest positive Euclidean distance between distinct linear palette colors divided by √3 (at most 1). One color or duplicate-only colors give zero amplitude; duplicates never bias spacing. This conservative neutral shift is deterministic rather than perceptually optimized. Both paths write only original palette bytes, with no post-selection noise.

Reset dithering restores None while preserving shading and palette. Switching algorithms keeps strength; a mounted editor retains threshold scale/width through diffusion and None toggles. The existing version-1 settings union serializes every active parameter without view state. Only category-255 subject pixels are processed; alpha, reserved receiver/background and explicit/strict effect mapping stay independent. Edits reuse native capture, target and framing. Blue noise uses one fixed 64×64 CC0 tile from Christoph Peters, decoded as raw threshold bytes without display conversion. [Provenance, hashes and spectrum verification](src/assets/blue-noise/README.md) are bundled locally. Floyd–Steinberg scans left to right, top to bottom with exact 7/16, 3/16, 5/16 and 1/16 weights. Ramps propagate continuous ramp-coordinate error; nearest mode propagates linear-RGB error. Only same-category, in-bounds neighbors receive strength-scaled error; masked shares drop without renormalization. Two floating rows are reused within each scan. Scale/ordered width are hidden for diffusion with an explanation; error strength remains active. Background/outline colors never enter subject matching.

PSS-12 evidence includes 29 new automated tests, explicit gradient/mask goldens, 46 actual Chrome native-frame pairs, 475 saved-byte assertions and 8×/16× screenshots. Measured DPR 2→2.2→2.5→2 changes neither hashes nor capture/processing counts. See [the progress record](docs/pixel-shading-studio/PROGRESS.md) and run `python3 docs/pixel-shading-studio/evidence/pss12-verify-native.py` to recheck the saved browser bytes.

PSS-13 verification includes independent scalar/RGB fixtures, one-pixel axes and mask gaps, 52 actual Chrome sphere/torus frame pairs, repeated 64/256 gradient fixtures, native-byte reference checks, and separate capture/readback/original/style/publication observations. The browser gradient harness at `docs/pixel-shading-studio/evidence/pss13-dither.html` imports production quantizers directly; it is a development evidence page, outside the application entry/build. Recheck saved evidence with `python3 docs/pixel-shading-studio/evidence/pss13-verify-native.py` and tile evidence with `python3 scripts/check-blue-noise.py`. Frame arrays are losslessly compressed JSON to keep evidence small; neither verifier is a runtime dependency. Exact measurements and acceptance results live in PROGRESS.md.


## Native silhouette outlines

Outline offers None or Silhouette, thickness 1–8 native pixels and an opaque hex color. The square/Chebyshev neighborhood extends diagonally as well as along axes. The ring is the dilated subject category mask minus the original subject: it grows outward and inward along hole edges, so small holes can close at larger radii. Helpers and ground categories never contribute. Subject fitting, requested dimensions and canvas dimensions stay fixed.

Final composites the ring after dithering, behind subject and over the background. Explicit policy discloses the chosen effect color and whether it adds a color outside the palette. Strict policy maps the retained request to the nearest active linear-RGB entry and shows the actual output color. Original has no outline. Reset outline changes only that section; disabling/re-enabling retains the mounted editor's thickness/color until reset.

The inspector and workspace report effect extents and clipping without adding padding or resizing. Extents derive from the captured subject mask; they cannot reconstruct subject pixels already outside the canvas. Color-only edits reuse the captured normals, fitted camera, continuous Original, styled pixels and ring. Thickness edits rebuild only the ring and composition. Runtime arrays stay outside React/store/JSON and release with the existing renderer owner. PSS-14 verification includes exact fixtures, 39 real Chrome frame pairs, 455 independent saved-byte checks and screenshots in [PROGRESS.md](docs/pixel-shading-studio/PROGRESS.md). Decoded PNG confirmation remains PSS-17.


## Ground and directional shadows

**Ground & shadows** in Scene offers an independent finite XZ receiver: Off, Visible receiver or Shadow only. Its initial position is (0, −1, 0), width/depth 6. Visible defaults to `#5C88B8`, shadow to `#172038`; ground and shadows remain off in the canonical scene. Place the plane below the subject to avoid depth occlusion. Receiver geometry and shadows do not enlarge the subject fit or canvas; the workspace reports separate conservative receiver/shadow extents and clipping, including the soft radius.

Enable one directional source's self and ground shadows independently. Strength attenuates only direct illumination, preserving ambient. Hard uses native visibility; Pixel stylized soft filters radius 0–4 on the native grid (0 equals Hard), rejecting different categories, depth/normal discontinuities and holes. Receiver pixels use only exact receiver/shadow colors: partial strength, ambient fill and soft edges choose deterministic opaque coverage. Shadow only selects transparency outside covered shadow; no fractional-alpha colors are introduced. Strict palette maps both effect colors to active entries. Subject diffusion never passes error to ground, and subject-only outlines composite above it.

A single fitted 1024² nearest shadow map and installed Three shadow-chunk visibility/depth pass share the existing renderer and fitted native camera. Subject is category 255, receiver 128, background 0; these labels never become final alpha. The optional bias is a normal offset of 0–2 map texels (default 0.5); zero can cause acne, larger offsets can detach contact shadows. Ground shadows pause below or within 0.57° of the ground. The map stays allocated while disabled and is explicitly disposed on teardown/retry; disabled shadows do not render it. Lighting presets/reset keep ground and shadows; **Reset ground & shadows** keeps lighting.

Light/shadow edits reuse subject/receiver normals, palette/outline edits reuse visibility, and preview-only changes skip native work. Mesh edges remain an SVG overlay and never alter caster material wireframe. Local Chrome evidence includes exact palette/alpha/pass alignment, cube/cone/torus, bias, horizon, transparent/visible receivers, repeated sizes/toggles/remounts and context recovery. PSS-19 profiles the complete workload and caches repeated surface tests without changing the shadow algorithm; see the [measured evidence](docs/pixel-shading-studio/evidence/PSS-19.md) for current timings and limits. Decoded PNG export is verified in PSS-17.


## Local reference models

In **Subject**, select one **GLB** or **glTF 2.0** together with all its `.bin` and texture companions. Relative paths resolve only to explicitly selected files (exact path, then an unambiguous basename); embedded base64 buffers are supported. Missing files show their required names. Remote/absolute/traversal paths are rejected before parsing, with no network fallback.

Initial limits are **25 MiB selected bytes**, **25 MiB decoded buffers**, **64 files**, **250,000 vertices**, **250,000 triangles**, **2,048 nodes**, **2,048 mesh parts including instances**, **64 hierarchy levels** and **4,096 accessors/buffer views**. Mesh/vertex/triangle totals conservatively include all declared mesh nodes. Use dense uncompressed FLOAT positions/normals and ordinary triangle meshes. Required extensions other than ignored `KHR_materials_unlit` / `KHR_lights_punctual`, compressed geometry, sparse accessors, points/lines/strips, skins, morphs, instancing extensions and animations fail with export guidance. No decoders are installed.

A parent centers the selected scene and uniformly sizes its longest axis to **2 world units**, preserving child relationships and authored normals (missing normals are computed). User transforms stay independent. Camera, lighting, smooth/flat normals, palettes, all dithering, outlines, ground and shadows use the existing renderer and native fitter. Use **Reset transforms**, **Reframe reference**, or choose a built-in shape to return. Imported material colors, textures, cameras and lights do not control the reference. Image companions are validated/hashed but discarded before Three parses materials, so textures/bitmaps are never decoded or uploaded.

Loading is atomic: the previous subject stays usable during selection, failure and cancellation. **Cancel import**, a newer import, shape selection and teardown invalidate older work. Shared geometry/material ownership survives renderer retry and releases on replacement/unmount; blob URLs are revoked after loading. Development diagnostics include model resource counts.

Only `{kind:"imported",asset:{fileName,format,sha256}}` enters scene settings. SHA-256 identifies the selected bundle's names/content; files, meshes and URLs remain runtime-only. Reload preserves the complete saved settings and asks for matching model files to be reselected. A missing runtime asset explicitly requests its files or a built-in selection.

Verification: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`; with `npm run dev -- --host 127.0.0.1` running, `node scripts/verify-model-import.mjs` exercises real local Chrome file input/WebGL2 (macOS Chrome path), saving network/resource/native-frame evidence. `python3 docs/pixel-shading-studio/evidence/pss16-verify-native.py` independently checks those bytes and generates a nearest-neighbor contact sheet (Pillow, verification only). See PROGRESS.md for the actual environment/results and [fixture notes](tests/fixtures/models/README.md).

## Native PNG export

**Export PNG** downloads Final at exactly the canvas width × height. Preview zoom, browser zoom, DPR, grid, checkerboard, handles, mesh edges and the Original panel never enter the file. The active transparent/solid background, palette, dithering, outline, receiver and shadow effects do. A sanitized filename describes the subject, dimensions, tone, active dither and outline thickness.

The click validates and snapshots settings/revisions, retains any imported asset, and queues one pinned job ahead of preview work in the existing demand scheduler. It uses the same NativeCapture/processor, copies completed bytes and resumes the newest preview without publishing the pinned frame over later edits. Repeat clicks are disabled through encoding; failures remain visible and retryable. Context loss/unmount cancels pending encoding and releases pins. A clean native sRGB canvas receives ImageData directly and encodes PNG; download URLs are revoked after navigation has started. Success reports that the download started; the browser chooses the destination and controls final saving.

To reproduce real-browser PNG fidelity checks on macOS with Chrome installed, start `npm run dev -- --host 127.0.0.1` on port 5173, then run `node scripts/verify-png-export.mjs`. The focused local CDP harness downloads actual files, waits for browser completion, reloads those file bytes into native ImageData with `src/export/verifyPng.ts`, and compares every RGBA byte to the captured authoritative frame. It writes decoded dimensions/colors/alpha and scenarios under `docs/pixel-shading-studio/evidence/pss17-*`. The `/?scene-checks` development panel's **Inspect exported RGBA** retains only the last successful export for this check; production retains no diagnostic export pixels. Failure injection changes only encoding/download control flow, never WebGL or frame pixels.

An independent local file decoder/contact sheet check is available with `python3 scripts/verify-png-files.py` after the browser harness (Pillow, verification only).

## Local scenes and recovery

**Presets** saves a complete scene, restores a factory or named scene, and explicitly confirms overwrites/deletes. Names are unique ignoring case, 1–80 characters; the local library supports 100 scenes. The factory scenes are Canonical blue sphere, Directional cube and Dithered limited colors. Section/palette/full-scene resets retain named presets; preview zoom, overlays and tools stay outside scene JSON.

Current settings use a 400 ms autosave debounce with a 2 s maximum wait, plus pagehide/hidden-page commits. Only `pixel-shading-studio:current` and `pixel-shading-studio:presets` are normal storage keys. Both scene and library schema versions are **1**; unknown versions/fields or malformed values are rejected atomically. The optional version-1 shadow bias retains the renderer’s stable 0.5-texel default when omitted. No historical versions or migrations are invented. Storage is tied to this browser profile and localhost origin/port.

Storage failures show a persistent notice; editing and PNG export continue in memory. Keep the tab open, use **Retry local save**, or **Download settings & recovery JSON**. Unreadable originals stay untouched. **Replace unreadable data…** requires confirmation and successfully archives each original under a separate app-owned recovery key before replacement; a failed backup leaves it protected. The recovery download is a local backup for inspection/manual recovery, not a new scene-file import format. No unrelated localStorage keys are cleared.

Imported presets save only filename, format and the SHA-256 bundle identifier. After reload, **Reselect saved model files** requires the same model and companion-file names/bytes, using existing import validation. A mismatch preserves every scene setting and releases staged resources. **Use built-in sphere instead** explicitly changes geometry while retaining transforms and the rest of the scene. Same-session presets can reuse their matching live asset. No model bytes, files, URLs, frames or transient revisions are persisted.

`node scripts/verify-presets.mjs` checks real Chrome on localhost, including S7 settings/native hashes, decoded downloads, persistence errors and imported reselect/fallback. `python3 scripts/verify-preset-pngs.py` independently verifies the downloaded files and builds a native contact sheet. See PROGRESS.md and `evidence/pss18-*` for actual results and environment limits.


## Measured responsiveness and usability

Canvas W/H controls set PNG dimensions; **Subject framing** sets the aspect-preserving subject box; **Preview zoom** and **Fit view** change only presentation. Each inspector scrolls independently. At 768px width, Scene/Pixels open one panel at a time; Escape returns focus to its toolbar button. Invalid numeric drafts preserve the valid image, expose their error through the label/description, and Escape restores the value. Camera pan/dolly are available in manual framing; numeric camera/light fields provide the keyboard alternative to dragging. Focus the preview for F/N/0, zoom and pan shortcuts.

Presets distinguishes the **current** factory/saved/custom scene from the scene selected for a later Restore action. Factory scenes are read-only. Palette & ramp similarly identifies current factory/custom colors; choosing a preset requires Apply. Render work reports a polite busy status while edits coalesce. Import, encoding, renderer and local-save failures retain explicit cancellation/retry/reselect/recovery controls.

The renderer remains demand-driven and uses synchronous native readback and CPU processing. PSS-19 measures the actual 32/64/128/256px pipeline in local Chrome on Apple M2 Max rather than promising a frame rate. Palette/dither changes skip normals and shadow visibility; light color/intensity reuse visibility; shadow strength/color reuse both visibility and its filtered buffer; radius changes filter the cached visibility. Light direction recaptures visibility only with enabled self/ground shadows. Native resolution and algorithms are preserved. No worker or dependency was added. Larger canvases (up to the existing 1024² safety cap), dense imported meshes, complex fitting and maximum softness can delay the main thread; the latest settled revision and clicked-revision PNG remain exact.

The checkerboard is now two cached native-size backdrop canvases, separate from the clean Original/Final canvases and export. A healthy viewport owns five canvases including the hidden WebGL capture canvas. Backdrops allocate only on native resize and release on disposal. Runtime cleanup runs before React detaches the viewport so OrbitControls removes its document listeners correctly. Repeated real import/resize/effect/export/remount cycles, post-GC memory, forced context loss and explicit Retry are recorded in [PSS-19 evidence](docs/pixel-shading-studio/evidence/PSS-19.md).

Reproduce focused checks on macOS with installed Chrome and the development server on 127.0.0.1:5173:

```sh
PSS_PROFILE_LABEL=local node scripts/verify-performance.mjs
node scripts/verify-studio-polish.mjs
npm run build
npm run preview -- --host 127.0.0.1
PSS_PREVIEW=1 node scripts/verify-studio-polish.mjs
```

These local CDP scripts use temporary browser profiles, local model fixtures and completed PNG downloads; they close Chrome and remove temporary profiles/downloads. No user artwork is uploaded. Timings include native capture/readback, GPU visibility/readback, filtering, Original/Final CPU processing, publication and presentation; the evidence explains nested stages and browser-harness overhead. Production has no diagnostics panel, worker, telemetry or remote runtime dependency.

## Final verification

[PSS-20 QA evidence](docs/pixel-shading-studio/evidence/PSS-20.md) maps every one of the 54 mandatory roadmap rows and S1–S9 to observed results. The final application passes 470 tests, strict typecheck, lint and production build. Real Chrome WebGL2 verification covers production controls, geometry/camera/light independence, all dither/effect/import paths, complete preset reload, storage/renderer failures, native PNG fidelity, performance and resource plateaus. No application-code repair or dependency/configuration change was required by the final audit.

With the production preview on 127.0.0.1:4173, `node scripts/verify-application.mjs` runs 126 production checks and saves nine actual PNG downloads. After the accompanying PSS-20 export/preset suites (reproduction instructions in the QA record), `python3 scripts/verify-application-evidence.py` independently checks all 56 retained PNGs with Pillow and an every-pixel outline oracle. Browser scripts require installed macOS Chrome and use temporary profiles; they do not touch the owner's browser-local scenes.

Verification covers Chrome 155 / macOS 27 / ANGLE Metal on Apple M2 Max. Safari control was unavailable, so second-engine transparency/palette/export remains unrun. Maximum-softness 256² render callbacks measured median 48.95 ms orbit / 44.05 ms light, with a 72 ms maximum whole-page task. Larger/custom canvases and dense imports have no latency guarantee. Warmed 32-cycle resources/listeners/heap stabilized. The visible Vite bundle-size advisory is non-blocking; optional internal outlines, larger beauty view and workers remain deferred.
