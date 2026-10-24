# PSS-06 — Implement controllable lighting and viewport light movement

## A. Task identification

- **Task ID:** PSS-06
- **Title:** Implement controllable lighting and viewport light movement
- **Milestone:** B — Interactive 3D Reference
- **Dependencies:** PSS-05
- **Intended outcome:** One directional light plus ambient light respond to numeric controls, presets and an interactive handle.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R03, R10 and S2; architecture scene/controllers and capture lighting.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: light derivation/controller, light inspector, interaction ownership and reference helpers. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Provide comprehensible artist-controlled illumination and a single consistent light state before pixel shading modes.

## D. Technical requirements

- Wire directional position and target/direction, RGB color and intensity, ambient intensity, lighting presets and section reset. Derive a single surface-to-light direction from position/target with a documented convention; avoid competing position and direction state. Reject zero-length vectors and nonfinite values.
- Render with simple Lambert-style diffuse plus ambient illumination, avoiding PBR environment maps/tone mapping complexity. Colored light visibly affects continuous reference colors. The CPU native pipeline in PSS-07 will use the same mathematical contract; write reusable light derivation/math rather than relying on undocumented material appearance.
- Add a viewport light handle with explicit light-move tool selection and drag behavior on a documented plane/arcball about the target. Disable camera controls only while light manipulation owns the gesture and restore them on pointerup/cancel/lost capture. Numeric inputs and handle stay synchronized.
- Put handles/gizmos/helpers on excluded reference layers so later native capture never includes them. Handle screen-coordinate conversion correctly for workspace offsets and camera roll/projection; PSS-09 will extend mapping for preview zoom/pan.
- Provide upper-right, upper-left, overhead, side and flat-ambient presets and lighting reset. Presets alter lighting only, not object/camera/palette. Brightness and intensity limits avoid NaN/unbounded shader input.
- Keep shadows honestly unavailable until PSS-15; do not add an enabled shadow switch without effect. Light-only changes invalidate lighting rather than rebuilding geometry. Define the invalidation hook later capture tasks can specialize.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement real light controls, presets and handle interaction. No shadow mapping, multiple lights, PBR/material editor, palette mapping, dithering or export. Do not reset camera/object to make a light test pass.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. Moving light around a cube changes illuminated faces and continuous shading; ambient-only light removes directional contrast.
2. Color/intensity and ambient intensity visibly update the reference.
3. Handle drag and numeric controls reflect the same state and never accidentally orbit the camera.
4. Lighting reset/presets preserve object and camera, and cancelled drags restore camera interaction.
5. Helpers are identified as reference-only and do not become subject meshes.

## G. Verification

Test direction math/sign, zero-vector rejection, preset/reset boundaries and gesture state transitions. Run standard checks. In a real browser orbit a cube, drag the light above/right/left, change color/intensities, try roll/perspective during subsequent drags and cancel a drag. Confirm no geometry replacement occurs on light-only edits and no console warnings appear.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-06 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
