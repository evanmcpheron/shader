# PSS-02 — Define validated scene settings and state transitions

## A. Task identification

- **Task ID:** PSS-02
- **Title:** Define validated scene settings and state transitions
- **Milestone:** A — Foundation
- **Dependencies:** PSS-01
- **Intended outcome:** One typed, serializable settings model and small Zustand store define the studio without duplicating runtime resources.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R01–R09, R11–R14; architecture modules and ownership, scheduling, persistence.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: domain/defaults/validation and the small app store, using actual structure chosen after inspection. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Create a stable domain contract so later controls, geometry, processing, export and persistence can share settings and defaults without rebuilding state ownership.

## D. Technical requirements

- Model subject primitive/import descriptor, transforms, camera pose/target/roll/projection/FOV/zoom, directional/ambient light, canvas/framing, shading/ramps/palette, dither, outline, ground/shadow, and background. Follow specification ranges and semantics. It is acceptable to model later feature fields now; do not expose nonfunctional controls.
- Use discriminated unions for shape parameters and algorithm/mode-specific settings. Keep all persisted fields plain JSON data, finite numbers and opaque sRGB colors. Avoid any, optional bags of unrelated properties, functions/Three objects/files in settings, and separate copies of output dimensions for export.
- Define canonical defaults: orthographic smooth sphere, canvas 64×64, requested subject box 32×32, center alignment, the specified four cool-blue colors, dither/outline/shadows off, transparent background, upper-right light. Rendering tasks will establish exact pixels later.
- Implement bounded actions for numeric changes, geometry selection, section reset and whole-scene reset. A camera action must not mutate object transforms. A palette reset must not reset lighting. Apply a complete settings restore atomically. Define dirty revisions for capture, lighting/style, shadow and view-only changes without persisting these revisions.
- Separate transient preview/tool/status state from serializable scene settings. Keep numeric draft strings local in future UI. Runtime frame buffers and Three resources stay outside the store's serialized settings.
- Provide pure validation/normalization helpers usable by controls and future imports/persistence. Reject NaN/infinity, invalid colors/direction, zero scales, invalid threshold order and impossible padding. A valid one-color palette and minimum canvas must work. Treat custom bounds as declared constraints, not silent arbitrary truncation.
- Document reset and schema semantics in architecture if actual names differ. Choose small focused modules, not a generic command/event/plugin framework.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement domain types, defaults, validators and state actions only. Do not create scene rendering, UI panels, storage writes, migrations for imaginary historical schemas, image export or an undo system.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. Defaults pass validation and contain every field required for a complete built-in scene.
2. JSON round-trip of validated settings loses no configuration; transient/resource fields are excluded.
3. Camera, object, lighting, palette and preview actions obey reset/isolation boundaries and correct dirty categories.
4. Invalid dimensions, colors, thresholds, scales and zero-length light direction have deterministic tested handling.
5. Atomic restore causes one coherent settings transition; preview zoom never changes output dimensions or capture dirtiness.

## G. Verification

Run pure tests for defaults/round-trip, boundary dimensions including rectangular canvases, NaN/infinity, one-color palettes, reset isolation, dirty-category transitions and atomic restore. Run the standard quality commands from PSS-01. The starter should still run; no browser rendering claims are required for this domain-only task.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-02 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
