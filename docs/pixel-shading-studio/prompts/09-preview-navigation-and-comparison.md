# PSS-09 — Add precise preview navigation and before/after views

## A. Task identification

- **Task ID:** PSS-09
- **Title:** Add precise preview navigation and before/after views
- **Milestone:** C — Pixel-Perfect Rendering
- **Dependencies:** PSS-08
- **Intended outcome:** Final/reference comparison, zoom, pan, pixel grid and checkerboard operate without changing native pixels.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R04/R10, S3/S8; architecture preview and scheduling.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: workspace preview components/view transform, view-state actions, before-frame cache and handle coordinate mapping. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Make the generated image understandable at tiny resolutions while keeping view presentation entirely separate from output and camera transforms.

## D. Technical requirements

- Provide final-only, original/reference-only and synchronized side-by-side comparison. The authoritative before-image is a native continuous-shaded frame using the active smooth/flat normal treatment and the same light/framing before band/palette/dither/outline styling. Reuse one renderer/scene; do not allocate a WebGL context per panel. A larger reference view is optional if it adds no conflicting output path.
- Add integer zoom steps, numeric zoom, fit-to-viewport, 100%/native preview and independent 2D pan. Define native as one output pixel per CSS pixel at 100% browser zoom, not guaranteed physical device pixels. Default to integer zoom for crisp uniform blocks. If fractional fit is supported, keep nearest sampling and explain unequal display pixel widths.
- Render grid and checkerboard as view-only layers using the exact output rectangle and pan/zoom transform. Suppress unreadable grid at low zoom. Transparent and solid output backgrounds remain scene settings, separate from checkerboard visibility.
- Extend PSS-06 `scene/lightHandle.ts` screen mapping and `LightController` gesture ownership to the displayed image rectangle. Its direction proxy/arcball preserves source distance and target, and helper descendants remain excluded from native capture. Idle Move light currently allows empty-space camera orbit; preserve explicit noncompeting ownership when adding preview navigation.
- Maintain image-coordinate mapping for pointer/hover/light handles under zoom, pan, comparison letterboxing, camera roll and DPR. Make camera orbit, light manipulation and 2D pan explicit tools with noncompeting pointer ownership. Wheel semantics are preview zoom here; camera dolly remains a clearly labeled tool/control in manual framing.
- Read final-frame metadata/buffers without pushing per-pixel updates through React. Pan/zoom/grid/checkerboard/sidebar resize must not dirty geometry, rerun quantization, refit the subject or change native frame bytes.
- Provide accessible controls and visible canvas/subject/zoom readouts. Keep error/loading status and keyboard ways to reset/fit/pan reachable. Fit view on initial valid frame, not on every render that would disrupt an artist's navigation.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement view modes, before-frame caching, presentation navigation and overlays. No new shading/palette/dither/outlines/export features. Do not regenerate existing camera or framing systems, or screenshot the UI into the native buffer.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. At 100%, 2×, 8× and fit, underlying final native bytes and measured subject dimensions remain unchanged.
2. Pixel grid/checkerboard/selection helpers never appear in the final frame.
3. Before/after views share scene pose, native dimensions and aligned presentation while staying visually distinguishable.
4. Pan/zoom/light/camera tools have clear gesture ownership; light drag maps correctly after preview zoom/pan and in comparison mode.
5. Sidebar resize, DPR and browser zoom preserve native W/H; interaction remains usable at small sizes.

## G. Verification

Test coordinate conversions and view-only dirty-state behavior with rectangular/letterboxed examples. Run standard checks. In a real browser capture native-frame hashes before/after zoom/pan/grid/resize, compare 32×32 subject bounds, exercise all three tools, native/fit/compare, and verify grid lines follow native boundaries. Inspect nearest-neighbor blocks visually; jsdom cannot prove sampling quality.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-09 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.

PSS-09 implementation note: the verified native comparison replaces the former beauty-canvas presentation; both 2D panels share the exact fitted native camera/rectangle under the original renderer lifetime. Extend `PreviewPresentation`/`viewTransform` and the independently owned `NativeCapture` before/final caches rather than adding another renderer or capture path. Mesh topology is a separate optional view overlay; manual camera dolly/zoom uses middle-drag/numeric controls while wheel always zooms the preview. See ARCHITECTURE.md and the PSS-09 progress record.
