# PSS-07 — Capture native pixels and publish one authoritative frame

## A. Task identification

- **Task ID:** PSS-07
- **Title:** Capture native pixels and publish one authoritative frame
- **Milestone:** C — Pixel-Perfect Rendering
- **Dependencies:** PSS-06
- **Intended outcome:** Native-resolution geometry capture, basic geometry-driven pixel lighting and a final RGBA frame work without interpolation.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification rendering contract, R04/R14 and S6; architecture native pipeline, color and scheduling.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: native capture material/targets, pure basic pixel processor, scheduler/frame owner, canvas controls and native presentation. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Establish the rendering contract that all styling and export tasks will extend, without depending on later palette or framing features.

## D. Technical requirements

- Render directly to an integer W×H native target with validated square presets and custom width/height. Implement specification limits (1–1024 each, total at most 1,048,576), GPU-capability checks and recoverable allocation failures. Do not render a larger image and scale it down.
- Implement native view-space normal/category capture as designed: unsigned-byte RGBA, RGB encodes normals, alpha 255 subject/0 background (reserve 128 for the later receiver). Use a non-color target with no output conversion, tone mapping, blending, MSAA, mipmaps or interpolation. Depth testing and correct normal matrix are required.
- Reuse PSS-06 `domain/lighting.ts` derivation, sRGB decoding and Lambert illumination contract; transform its unit surface-to-light direction into capture-normal space. The reference adapter cancels Three's 1/PI BRDF factor; CPU illumination has no PI factor. Extend `ReferenceRuntime.invalidateLighting()` and existing style/shadow/capture revisions rather than adding competing light state.
- Read native bytes and flip rows once into top-left CPU layout. Reconstruct/normalize normals and compute simple continuous Lambert lighting on CPU using the existing directional/ambient settings and decoded base color. This increment must produce a usable lit native image now; PSS-10 expands tone modes later. Shader data must never be mistaken for display RGB or premultiplied color.
- Write a canonical final RGBA buffer with sRGB display conversion once, alpha 0/255 and RGB zero on transparent pixels. Compose transparent/solid backgrounds with explicit setting; default remains transparent. Publish width/height/revision and buffer outside high-frequency React state.
- Display this native ImageData using a W×H backing canvas and nearest-neighbor presentation. Keep current reference view available by mode switch. Helpers are excluded from capture.
- Extend one invalidation scheduler with geometry/camera/canvas capture dirtiness versus light/style processing dirtiness versus presentation-only changes. Reuse buffers and targets; do not recapture normals for a simple light-color edit. Guard in-flight readback revision/ownership so stale work never publishes. If async readback is chosen, provide/test a sync fallback and safe disposal.
- Preserve and restore renderer target, viewport, scissor, clear values and scene/material overrides around capture. Extend the existing PSS-04 runtime and explicit Retry renderer reconstruction owner for context loss, errors, resizing and StrictMode unmount; discard stale frames and disable dependent actions on failure. Do not create a second renderer or suppress the reference runtime's failure status.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement direct native capture, basic smooth geometry-aware lighting, alpha/background and native frame publication. Exact subject fitting belongs to PSS-08; advanced preview to PSS-09; bands/palettes/dither/outlines/shadows/export remain later. Do not introduce duplicate renderers or assume a later task will fix black/incorrectly lit output.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. Choosing 8×8, 64×64, 256×256 and rectangular custom sizes creates exactly those native frame dimensions and buffer lengths.
2. A lit cube/sphere responds to light direction; native output contains no helper geometry or unintended partial coverage alpha.
3. Background alpha is zero with RGB zero; solid background uses its explicit color.
4. CSS viewport resize, browser DPR and display scale do not resize native backing pixels.
5. Readback orientation is correct and camera/light edits cannot publish stale revisions; palette-independent light edits reuse normal capture.
6. Target/resources are cleaned on size changes, context recovery and unmount.

## G. Verification

Add fixtures for row orientation, normal decode/lighting, output dimension/byte calculations, alpha/background rules and scheduler stale-revision rejection. Run standard checks. In a real browser inspect 8/32/64/256 and 96×64, top/bottom lighting orientation, transparent edges, resize/DPR emulation and repeated rapid edits. Inspect actual native RGBA metadata, not a screenshot's CSS size. Record capture/readback behavior and errors.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-07 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
