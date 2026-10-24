# PSS-05 — Implement camera orbit, roll and projection controls

## A. Task identification

- **Task ID:** PSS-05
- **Title:** Implement camera orbit, roll and projection controls
- **Milestone:** B — Interactive 3D Reference
- **Dependencies:** PSS-04
- **Intended outcome:** Camera interaction, projections, roll and standard views work independently of object transforms.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R02 and S2; architecture camera controllers and subject fit.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: camera controller, scene render-camera selection and camera inspector. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Make the 3D reference useful for sprite viewpoints while establishing a camera controller compatible with later pixel framing.

## D. Technical requirements

- Integrate the installed Three OrbitControls addon with the current single renderer and scene. Support orbit, camera zoom/dolly, pan, numeric pose/target controls, reset, and front/back/left/right/top/bottom/isometric view presets. Default remains orthographic.
- Support perspective mode and bounded FOV; switching projection preserves orientation/target and approximate apparent size. Validate near/far, distance/orthographic extent and pole cases, including exact top/bottom presets. Do not conflate object rotation with camera movement.
- Implement explicit roll using an unrolled orbit pose and derived render camera, or a demonstrably equivalent simple controller. OrbitControls alone maintains an up vector and will not preserve arbitrary applied roll. Verify roll survives subsequent orbit, reset, projection switch and future serialization. Never store two conflicting copies of camera state.
- Publish control changes through the existing validated store/revision scheme without render→store→controls feedback loops. When applying numeric values/presets, update controls and camera coherently. Use demand invalidation; disable damping or settle it correctly before idle/export.
- Keep camera gesture binding separate from future preview pan/light drag. A visible tool label communicates camera movement. Numeric inputs are accessible alternatives. Native-output and preview zoom controls are not introduced here.
- Replace the earlier runtime-only reference fit with manual world-space camera settings. Reframe reference is an explicit validated camera-only action; shape/parameter/object resets retain camera settings, while Reset scene restores its canonical camera. Preserve useful tiny/large reference reframing with documented camera-only bounds if necessary.
- This task implements manual camera projection. PSS-08 adds pixel-fit derivation and its explicit zoom/pan lock; leave the controller able to derive a fit render camera without mutating its orbit source. Do not silently cancel camera zoom through an early auto-fit loop.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement camera controls, projections, roll, view presets and reset. No pixel-size fitting, preview-only zoom, light dragging, export or persistence. Preserve primitives and object transforms.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. Orbit/pan/zoom and all standard views work, including top and bottom without NaN/flips.
2. Camera gestures and view presets leave object transforms byte-identical.
3. Nonzero roll remains present through orbit and orthographic/perspective switching.
4. Projection switching is coherent, FOV affects perspective, and reset affects camera only.
5. Idle rendering stops and control listeners are removed on unmount/recreation.

## G. Verification

Test pose/projection derivation and reset/isolation boundaries. Run standard checks. In a real browser rotate a cube with the camera, rotate the object separately, pan/zoom, roll by 30 degrees then orbit, switch projections, exercise every preset and inspect console/state for feedback loops. Record approximate framing behavior during projection switching.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-05 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
