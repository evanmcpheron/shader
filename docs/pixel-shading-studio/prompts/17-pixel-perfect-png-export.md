# PSS-17 — Export the authoritative native frame as PNG

## A. Task identification

- **Task ID:** PSS-17
- **Title:** Export the authoritative native frame as PNG
- **Milestone:** F — Export and Persistence
- **Dependencies:** PSS-16
- **Intended outcome:** PNG export exactly matches the latest final frame, dimensions, colors and transparency.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R11, S1/S5/S6/S8; architecture preview/PNG export and scheduling.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: PNG encoder/download adapter, export action/status, frame snapshot integration and browser verification helpers. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Deliver actual sprite files from processed pixels and prove export fidelity independently of UI screenshots or CSS rendering.

## D. Technical requirements

- Add a real export action using the authoritative final RGBA frame at canvas W×H; canvas dimensions are export dimensions. No second render approximation, screenshot, DPI/DPR multiplication, upscaling or standard downsampling. Export all mandatory styling/import paths through the same processing implementation.
- Snapshot validated settings/revision and pin required runtime resources on click, then await its complete final frame with stable ownership/copy of bytes. Serialize this one pinned capture/processing job before newer preview jobs so later edits cannot cancel the clicked revision or dispose its resources. Later state edits remain queued for the newest preview; do not publish the pinned frame over newer visible state. Disable repeat export clicks while busy. Never substitute an older frame or a different post-click configuration; show retryable errors and release pins on success/failure. A frame invalidated by context loss is not exportable.
- Write ImageData to a clean sRGB native canvas with no overlays/smoothing/transforms and encode image/png via toBlob or equivalent browser API. Handle null Blob, exceptions and download failures. Release object URLs only after download is safely initiated. No backend or export-format dependency is required.
- Transparent/solid background must match the final preview's active setting. Preserve exact opaque palette/effect RGB and binary alpha; canonical zero hidden RGB. Checkerboard, grid, handles, reference view and sidebars are excluded. Include a sanitized descriptive filename with subject, W×H and relevant style/dither information.
- Add a browser-verifiable decoder check: load exported PNG to native ImageData and compare width/height/opaque RGB/alpha to the captured authoritative frame; compare decoded pixels, not compressed PNG bytes or screenshots. Keep any browser helper focused and documented, not a public debug framework.
- Cover the canonical sphere, rectangular subject/canvas, outlines, each dither algorithm, transparent/solid backgrounds and imported geometry. Update UI help so output size and preview zoom cannot be confused.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement native PNG download and fidelity verification only. Do not add JPEG/SVG/GIF, image scaling, sprite sheets, cloud uploads or preset persistence. Do not rebuild the renderer or claim export readiness from a MIME type/filename check.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. S1 exports a 64×64 PNG, subject exactly x/y=16..47, only the specified four blue RGB entries among opaque subject pixels.
2. S8 exports 96×64 with a 32×32 sphere at x=32..63/y=16..47 regardless of preview zoom.
3. Decoded PNG pixels match the authoritative frame for transparent/solid, Bayer/blue-noise/FS and outline examples.
4. Background alpha is zero when transparent, subject/outline edges have no partial alpha, and effects match preview without UI overlays.
5. Rapid edit→export produces the clicked configuration's complete revision; encoding/context errors are visible and URLs are cleaned.

## G. Verification

Test filename sanitization, frame revision/ownership, failure paths and dimension invariants where pure/DOM tests are meaningful. Run standard checks. In a real browser download/decode actual PNGs for S1/S5/S6/S8, compare pixels to final frames, test immediate export during edits and repeated clicks, and inspect solid/transparent and all dither outputs. Record exact decoded dimensions/color sets/alpha observations. If browser export cannot be verified, this task is incomplete; mocks cannot establish PNG fidelity.

Verify package.json still exposes the commands established by PSS-01, then run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`. Use `npm run dev -- --host 127.0.0.1` for development browser checks unless the task asks for production preview. If prerequisites changed these commands, inspect and document the actual equivalents before using them; never invent or claim an unavailable command. Do not silently pass an empty suite, suppress errors, or treat mocked canvas/WebGL as pixel evidence.

Use focused tests that establish observable behavior or algorithm invariants; do not mirror implementation or add a large framework for trivial assertions. Record browser/manual checks actually performed with environment and observations. If tools prevent required verification, describe it accurately and leave the corresponding acceptance item open. Never claim tests were run without running them.

## H. Completion report

Report all of the following:

1. Summary of implementation and resulting behavior.
2. Files changed, grouped by purpose.
3. Important technical decisions, dependency/configuration adjustments and why they were necessary.
4. Exact commands executed and their results, including browser environment and visual/behavioral evidence.
5. Acceptance criteria satisfied, with evidence; distinguish automated, browser/manual, failed and unrun checks.
6. Remaining limitations, unresolved issues and whether they block this task or later work.

## I. Progress tracking

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-17 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
