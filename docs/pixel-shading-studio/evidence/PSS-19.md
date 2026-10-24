# PSS-19 — Measured usability, performance and recovery

Measured 2026-10-24 on macOS 27.0 (26A428), MacBook Pro / Apple M2 Max (12 CPU cores), 32 GB RAM. Node 24.22.1, npm 11.19.1; real headless Chrome 155.0.8059.86, WebGL2 ANGLE Metal / Apple M2 Max, DPR 1. No software/mock WebGL or simulated pixel evidence.

## Method and workload

`npm run dev -- --host 127.0.0.1`, then `PSS_PROFILE_LABEL=final node scripts/verify-performance.mjs`. Fresh temporary Chrome profile; 1440×900; sphere with smooth-normal four-color bands, half-canvas fit box, 2px silhouette, finite 4×4 visible receiver and self/ground directional shadows with maximum radius-4 softness. Actual CDP camera-orbit / amber-handle drags: four warm-up moves followed by eight measured moves per combination. 32/64/128/256 native sizes × None/Bayer4/blue-noise/FS × orbit/light; additional 256px effects-off and hard-shadow comparisons. 48 gesture profiles, 384 measured moves; 74 checks passed.

Raw records: [baseline](pss19-baseline.json), [filter-only change](pss19-optimized.json), [final](pss19-final.json). Baseline/filter-only diagnostics retained the last capture timing during light edits; their capture counters show capture reuse. Final diagnostics zero skipped stages, avoiding that ambiguity. Initial harness attempts rejected an incorrect fit-field path and read diagnostics before React committed; these supplied no accepted samples. A stale Vite transform was detected by curl; the owned server was restarted and the optimized profile repeated on verified fresh source.

Capture includes bounded subject-fit rasterizations and its readback/row flip. Visibility includes GPU shadow/receiver work and effect readback. Readback is synchronous and includes waiting for GPU work; these nested timings must **not** be added twice. Original/Final are separate CPU passes. Publication is the owned RGBA copy; presentation covers view/helper work. Native putImageData upload and metadata publication are included in the whole callback, not timed separately. Whole callback also includes preparation. Browser paint and later React work are outside that callback. Round trips deliberately wait 25ms then read diagnostics through CDP/React and are not frame rates or pure input latency.

## Final stage medians (ms)

Each row pools 32 measured moves (four dither choices) with maximum soft shadows.

| Size / drag | Capture (readback) | Visibility (readback) | Filter | Original / Final CPU | Compose / publish | Presentation | Render callback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 32² / camera | 2.65 (1.75) | 2.05 (1.70) | 0.60 | 0.10 / 0.10 | 0.00 / 0.00 | 0.00 | 5.90 |
| 32² / light | 0.00 (0.00) | 1.50 (1.20) | 0.60 | 0.10 / 0.10 | 0.00 / 0.00 | 0.20 | 2.90 |
| 64² / camera | 2.60 (1.70) | 1.90 (1.65) | 2.40 | 0.20 / 0.20 | 0.10 / 0.00 | 0.00 | 7.75 |
| 64² / light | 0.00 (0.00) | 1.40 (1.20) | 2.40 | 0.20 / 0.20 | 0.00 / 0.00 | 0.10 | 4.70 |
| 128² / camera | 2.70 (1.80) | 2.00 (1.80) | 9.40 | 0.60 / 0.60 | 0.10 / 0.00 | 0.00 | 15.65 |
| 128² / light | 0.00 (0.00) | 1.40 (1.15) | 9.40 | 0.60 / 0.60 | 0.00 / 0.00 | 0.20 | 12.70 |
| 256² / camera | 3.10 (2.00) | 2.20 (2.00) | 35.40 | 2.30 / 2.30 | 0.40 / 0.00 | 0.00 | 46.30 |
| 256² / light | 0.00 (0.00) | 1.50 (1.25) | 35.15 | 2.30 / 2.30 | 0.10 / 0.00 | 0.10 | 42.00 |

Zero publication values mean below this browser timer’s useful precision, not zero work. Light drags perform no subject-normal capture.

| 256² effects / algorithm | Render callback median / maximum (ms) | Original + Final CPU median (ms) |
| --- | --- | --- |
| off / none | 5.40 / 7.90 | 3.60 |
| off / bayer | 5.65 / 7.90 | 3.65 |
| off / blue-noise | 5.90 / 8.00 | 3.80 |
| off / floyd-steinberg | 6.15 / 8.10 | 3.80 |
| hard / none | 9.50 / 12.30 | 5.20 |
| hard / bayer | 9.90 / 12.90 | 5.40 |
| hard / blue-noise | 9.60 / 12.20 | 5.25 |
| hard / floyd-steinberg | 9.45 / 12.30 | 5.55 |
| soft / none | 43.30 / 47.30 | 4.50 |
| soft / bayer | 42.30 / 47.40 | 4.70 |
| soft / blue-noise | 41.90 / 47.70 | 4.60 |
| soft / floyd-steinberg | 42.05 / 46.90 | 4.70 |

## Measured decisions and limits

- The initial radius-4 filter medians at 256² were 57.45ms orbit / 57.05ms light. Cached shared-ray surface checks reduced these to 35.40 / 35.15ms in the final run (about 38%); the separate filter-only run measured 34.65 / 34.10ms. Same surface/depth/hole rules and summation order are retained, with exact Float32 oracle fixtures at radii 0–4.
- Maximum final render callback was 47.7ms; expensive soft-shadow whole-page tasks occasionally reached 50–64ms. Those remain brief main-thread delays, recorded honestly. Effects-off/hard profiles had no recorded long tasks in the measured moves. The highest soft-shadow event/diagnostic round trip includes deliberate waits and scheduling; inspect raw samples instead of inferring FPS.
- Four-color bands/FS CPU work is small compared with filtering. Buffer reuse and visibility-cache fixes are sufficient for the verified workflows, so no worker, algorithm substitution or smaller native target was introduced. A worker for larger/dense scenes is a future measurement decision, not claimed functionality. The 1024² safety cap and 250k-triangle import cap are not guarantees of interactive worst-case latency; those maxima were not profiled here.
- Shadow appearance/strength reuse GPU visibility and filtering; changing softness re-filters cached visibility. Ambient/intensity/colors, palettes and dither skip normal capture; preview navigation skips capture, processing and composition. Browser counters verify these categories and one settled process for coalesced palette/dither edits.

## Usability, pixels and resource evidence

See [browser checks](pss19-browser-checks.json), [production smoke](pss19-production-checks.json), [pre-fix listener evidence](pss19-listener-before.json) and the `pss19-layout-*` / `pss19-comparison-checkerboard.png` screenshots. Accessible-name checks use the actual Chrome accessibility tree at 1440×900, 1024×768 and 768×900. Keyboard checks use real CDP keys: inspector Escape/focus return/reopen/Tab, invalid draft cancellation and preview navigation. Rolled perspective light drags in all three view modes preserve camera state, Escape restores the light and capture ownership releases. Preview pan cancellation preserves settings/pixels. Current factory/custom status, busy/error markup, separate dimension/fit/zoom help and deep inspector controls remain connected. [Representative theme contrast](pss19-contrast.json) measured 6.27:1 or higher for enabled text samples and 8.14:1 for the accent focus ring on controls. This is not a screen-reader-software or full WCAG conformance audit.

A real lifecycle defect was measured: one document keydown listener remained after each passive-effect renderer cleanup because OrbitControls queried the detached host’s root. Layout-effect cleanup now disposes controls before detachment. The new component regression test exercises real OrbitControls under StrictMode/keyed remount/unmount. **204/204 integrated checks passed**, including actual numeric typing during light updates and capture release when panels collapse. **32** browser replacement cycles combine both GLB/glTF formats, primitive replacement, four native sizes, repeated effects, PNG export and remount, followed by forced context loss and explicit Retry. Every cycle ended with **400 listeners, 2,176 DOM nodes, one geometry/texture/program, one live runtime/target and five canvases**, with zero imported assets/materials/geometries/URLs. Warmed cycles 16–31 measured **18.527–18.802 MiB** post-GC heap, finishing at **18.796 MiB**; this is a measured plateau, not a universal memory bound. All **34/34** integrated downloads matched both settled preview and decoded bytes; all 34 blob URLs were revoked after their intentional delayed release. The harness compares against a browser-held frame rather than compiling full RGBA literals into repeated CDP scripts to avoid distorting the heap measurement. Pending/disposed publication and export cancellation also retain scheduler/unit and PNG regression coverage.

The checkerboard is drawn in two separate cached native backdrop canvases; clean Original/Final bytes and PNG remain separate. Two 128×28 screenshot background strips (7,168 CSS pixels total) matched the expected checker colors exactly in the inspected 2× comparison screenshot. Enlarged crops and all three layouts were visually inspected.

Existing PNG regression suite was run through `/tmp/pss19-export-regression.mjs`, an unchanged copy of `scripts/verify-png-export.mjs` with only `pss17` evidence names replaced by `pss19-export`, preserving historical evidence. **238/238 browser checks, 38 completed PNGs decoded with every RGBA byte equal**; rapid edits, pinned exports across later edits/model replacement, all dithers, effects, failure/retry and context invalidation passed. `/tmp/pss19-verify-png-files.py` is the existing Pillow verifier with cwd/evidence prefix adjusted: **38/38 independent decodes passed**. Saved downloads/archive and [browser regression checks](pss19-export-browser-checks.json) are under `pss19-export-*`.

Only localhost assets/files were requested. **4/4 production-preview checks passed** on `npm run preview -- --host 127.0.0.1` / port 4173: real renderer, Compare/Fit view/Presets, contained layout and no development diagnostics. Fresh browser profiles/download directories were removed after checks. Browser stderr contains headless macOS display-link / Chrome service diagnostics; application console warnings/errors and uncaught exceptions were zero in the accepted runs. No second browser/GPU vendor, real assistive-technology session or maximum-size/maximum-mesh performance claim is made. PSS-20 remains a separate unstarted requirements audit.
