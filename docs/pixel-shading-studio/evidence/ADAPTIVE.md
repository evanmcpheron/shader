# Adaptive workspace QA — 2026-10-24

Implementation is delivered; **verification remains incomplete** where listed below. This is an interaction/layout change using the existing renderer, store, scheduler and native pixel pipeline. It includes the pre-existing uncommitted shadow-default correction and its audit evidence without reverting it.

## Observed layouts

Actual Chrome extension browser, CSS viewport overrides, DPR 1, existing Vite localhost server bound to `::1:5173`. The isolated `http://[::1]:5173` origin avoided changing the owner's existing localhost storage. These are browser viewport checks with real rendering/pointer input, not physical phone/tablet tests or mobile-browser emulation.

| CSS viewport | Arrangement | Preview closed | Preview editing | Compact primary target / center hit checks |
| --- | --- | ---: | ---: | --- |
| 320×568 | Phone bottom dock | 222.5px | 114.1px | Pass |
| 360×740 | Phone bottom dock | 394.5px | 153.4px | Pass |
| 390×844 | Phone bottom dock | 498.5px | 213.7px | Pass |
| 430×932 | Phone bottom dock | 586.5px | 264.8px | Pass |
| 844×390 | Short landscape side dock | 181px | 181px | Pass |
| 768×1024 | Tablet side dock | 765px | 765px | Pass |
| 1024×768 | Tablet side dock | 509px | 509px | Pass |
| 1440×900 | Desktop | 550px | 550px | Reachable; fine-pointer desktop retains compact controls |

Each compact primary control measured at least 44×44px and its center hit the intended control. Header, mode/tool/navigation buttons, activity, inspector close/expand and section selector were included. No horizontal document overflow was observed. This does not claim every scrolled inspector control was hit-tested. Screenshots were captured at all eight sizes with settings closed/open; phone, landscape and tablet screenshots were visually inspected. Desktop screenshot uses one open inspector; desktop continues to support both simultaneously.

The 390px baseline measured a 156.5px toolbar and 160px preview. New phone editing reserves separate preview and settings rows, eliminating preview/inspector intersection. Smaller phones deliberately trade preview height for scrollable editing. More space expands the dock. The additional ≤500px phone editing arrangement reserves a 64px live preview, removes redundant workspace chrome while editing, and gives the rest to settings; this last refinement needs a browser recheck.

## Workflow evidence

| Check | Observation / status |
| --- | --- |
| Shape and light controls | Actual pointer/keyboard changed Sphere→Cube, directional intensity to 1.3 and light X to −3 while the live preview remained visible |
| Direct light / orbit / pan | Actual pointer drags: one completed light gesture, 97 camera change events, preview pan (26,18), zoom 6; UI diagnostic evidence retained |
| Settings scrolling / orientation | Phone→844×390→768×1024→1440×900→phone plus panel switching/scrolling preserved complete settings, preview state and camera changes |
| Runtime ownership | Created/disposed/active counts unchanged across transitions: 2/1/1 (development StrictMode). No additional native capture. `adaptive-runtime-isolation.json` has all six checks true |
| Boundaries / dither / palette | Actual UI rejected Threshold 1 = 0.9, restored valid value by button, then accepted 0.18; Bayer 4×4 / strength 0.6 and palette entry #231840 were edited |
| Native / Fit / zoom / pan | Fit and zoom controls and actual pan drag exercised. Native behavior covered by the connected App regression; narrow comparison visuals and full options interaction still need final browser verification |
| Presets | Saved Phone practice, confirmed overwrite in 390×430 constrained space, restored factory sphere and named scene, canceled overwrite. Recovery JSON and retry actions remained in the dialog |
| Modal layering | Outside hit-testing returned DIALOG, confirming the preview could not receive the interaction. Native top-layer semantics used |
| Focus | Found and fixed focus falling to body after confirmation. Browser verified focus returns to scene-preset after Cancel and to Presets after closing. Explicit Tab endpoint handling was added after a browser observation exposed native Shift+Tab leaving the dialog; its focused regression passes, but final browser recheck is unrun |
| Native pixel isolation | Before/after native arrays match all 16,384 RGBA bytes at 64×64. Tuned boundaries remain [0.22,0.5,0.75] |
| PNG | Actual default-scene download independently decoded by Pillow; exact 64×64 dimensions and every RGBA byte equal the pre-redesign baseline. One earlier download used a different camera pose and was excluded as baseline evidence. Repeated encoded-PNG comparison across layouts is unrun |
| Local model import / recovery | File chooser automation could not select files because extension file-URL permission is off. Native picker fallback selected malformed.glb, but the browser origin approval gate then declined further access. Successful import/reload/reselect/error recovery is **unverified in this run**; existing import and persistence tests pass |
| Saving failures / long messages | Existing storage failure/recovery tests pass; transient currentError metadata now preserves actionable compact status. Full browser failure-message/recovery checks remain unrun |
| Production | Strict production and `/shader/` Pages builds pass. Final production browser smoke is unrun because further browser access was denied |

## Commands

`adaptive-commands.txt` records final `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npm run build -- --base=/shader/`. All pass: **474 tests / 29 files**. Existing >500kB bundle advisory remains. No dependency/lockfile changes. Local Node is 24.10.0 (below the package's declared 24.15 minimum on this release line); the existing installed dependencies completed all checks. Deployment CI uses Node 24.

Regression additions cover touch recovery of invalid numeric drafts, focus through phone docks and dialogs, navigation preservation, dialog Tab endpoints, 48px touch light acquisition without widening mouse ownership, and current-save error clearing. The earlier preset and preview tests were updated to use the actual modal control flow. jsdom dialog/layout stubs are not pixel/layout proof.

## Evidence files

- `adaptive-before-390.jpg`, `adaptive-before-390-scene.jpg`: original rendered phone workspace.
- `adaptive-after-<width>x<height>.jpg`, `adaptive-after-<width>x<height>-scene.jpg`: eight requested viewport pairs.
- `adaptive-layout-checks.json`: dimensions and individual actual center-hit results.
- `adaptive-baseline-pixels.json`, `adaptive-after-pixels.json`: exact native RGBA data.
- `adaptive-runtime-isolation.json`: scene/navigation/runtime/capture invariants across real resizing and pointer workflows.
- `adaptive-phone-native.png`, `adaptive-png-decode.json`: actual export and independent full-byte decode.
- `adaptive-keyboard-preset.jpg`: 390×430 viewport with an active preset workflow; reduced-height simulation, no physical software keyboard.

## Explicit limits

Physical touch gestures, actual iOS/Android software keyboards, safe-area devices/changing browser chrome, second-engine behavior, final short-phone refinement, final Tab wrap and narrow comparison visuals, successful local import/reselect/recovery, long failure-message flows and final production browser smoke remain unverified. The browser gate denied further access to the local origin; no alternate browser surface or lower-level protocol was used to bypass it. The pending picker was canceled and viewport override reset. No application rendering failure was observed in completed checks. This task must not be marked fully verified until required unrun checks are completed.


The upload tool reported this Chrome guidance: To enable file upload, open chrome://extensions, click Details under the ChatGPT browser extension, and enable "Allow access to file URLs." See [here](https://developers.openai.com/codex/app/chrome-extension#upload-files) for details. No extension permissions were changed. This is distinct from the subsequent origin approval denial; broader file access alone would not authorize continuing after that denial.

## Publication

All 61 prepared files were published to remote main as [e5ac685](https://github.com/evanmcpheron/shader/commit/e5ac685bca0962058b8c727464c217c50f593935) using the authorized GitHub connector. [Pages CI](https://github.com/evanmcpheron/shader/actions/runs/40107279223) completed strict installation, lint, tests, build and deployment successfully. The app is at [evanmcpheron.github.io/shader](https://evanmcpheron.github.io/shader/); [adaptive-deployment.json](adaptive-deployment.json) retains the receipt. A follow-up documentation commit records this result. Local Git index writes are denied, so local main remains at a9dcb7e and the delivered working files remain uncommitted. The browser verification limits above remain in effect.

Final independent public HTTP smoke was unavailable: the web fetch tool could not access the Pages URL and sandboxed curl failed DNS resolution. The GitHub Pages deploy job itself completed successfully; no final hosted-browser/HTTP-render claim is made.

The final keyboard refinement derives constrained editing from VisualViewport.height, including when the CSS layout viewport stays tall on iOS. Dialog placement follows VisualViewport.offsetTop and safe-area insets; its scroll region fits the available height. The new height/offset/focus/state regression passes (474 total tests). These final changes still need physical-device and rendered browser rechecks. Earlier deployment receipts identify their exact revision; the final revision's CI result is linked in the delivery response.

Invalid numeric Escape also cancels the native default close action: it restores the value while keeping Preview options open. The focused regression verifies both behavior and default prevention. All final local commands pass after the safe-area and Escape changes.
