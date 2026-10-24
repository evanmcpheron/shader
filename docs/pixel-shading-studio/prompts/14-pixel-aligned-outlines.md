# PSS-14 — Implement native silhouette outlines and palette policy

## A. Task identification

- **Task ID:** PSS-14
- **Title:** Implement native silhouette outlines and palette policy
- **Milestone:** E — Advanced Rendering
- **Dependencies:** PSS-13
- **Intended outcome:** Silhouette outlines have exact native thickness, color, compositing and clipping behavior.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R08, S5/S6; architecture ordered pipeline and subject bounds.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: pure mask morphology/compositing, outline inspector, effect bounds/status integration. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Provide deliberate pixel-aligned contours without altering requested subject dimensions, introducing edge alpha, or breaking palette guarantees.

## D. Technical requirements

- Add none/silhouette, integer thickness 1–8 and explicit color using existing settings/controls. Implement square/Chebyshev native binary mask dilation minus the original subject mask. Use typed arrays and bounded neighborhoods; avoid CSS filters, geometry expansion, antialiasing or subpixel kernels.
- Derive outline exclusively from the subject category mask before background/ground compositing. Preserve holes according to the declared dilation rule and test diagonal/edge shapes. Never outline helpers or future ground shadows. Changing outline thickness does not reframe or rescale the subject.
- Composite outline behind subject and over receiver/background. Final outline pixels are fully opaque chosen bytes, and fully transparent pixels retain RGB zero. Clip to canvas bounds, report effect extents/clipping, and do not silently resize export or add padding.
- Complete the already established explicit-effect versus strict-all-effects palette policy for outlines. Custom outline color can add one disclosed effect color; strict mode maps/selects an active palette entry. Ensure dither never changes outline color or diffuses across it.
- Connect reset behavior and before/after comparison. Outline-only changes reuse captured normals/lighting where safe, invalidating only compositing; avoid redoing geometry fit. Runtime buffers have clear ownership.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement silhouette outline and its palette/compositing integration. Internal normal/depth edges remain optional future work and should not consume this task. Do not add vector export, antialiased contours, geometry-outline passes or a new renderer.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. Known binary shapes produce the exact expected dilation ring for thicknesses 1, 2 and an upper-bound case.
2. Subject occupied bounds stay unchanged while effect bounds grow by integer pixels and clipping is reported.
3. Outline color matches the chosen explicit/strict palette policy byte-for-byte.
4. Transparent and outlined edges have only alpha 0/255, with no halos; dither does not affect outlines.
5. Before/after view reflects the effect and no geometry recapture occurs for color-only outline edits.

## G. Verification

Test ring masks, holes, diagonals, corners, edge clipping, strict/custom colors and compositing order with independent native-array fixtures. Run standard checks. In a real browser execute S5 through native preview (PNG confirmation follows PSS-17), inspect multiple zooms and thicknesses at 16/64px, switch dither/background/palette policy, and verify mask/color/alpha metadata.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-14 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
