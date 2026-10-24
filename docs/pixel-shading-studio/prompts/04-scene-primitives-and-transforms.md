# PSS-04 — Render primitives and independent object transforms

## A. Task identification

- **Task ID:** PSS-04
- **Title:** Render primitives and independent object transforms
- **Milestone:** B — Interactive 3D Reference
- **Dependencies:** PSS-03
- **Intended outcome:** All built-in primitives render in a real Three scene with working geometry and transform controls.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R01, R10, R14; architecture scene/controllers, scheduling and recovery.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: scene runtime/factory/lifecycle, object inspector and existing workspace mounting. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Introduce a usable interactive reference scene and establish explicit resource ownership before native pixel capture.

## D. Technical requirements

- Add one directly owned Three WebGLRenderer/context within the React workspace lifecycle. Keep renderer/scene/resources in runtime ownership rather than JSON/React pixel state. Reuse the domain store. Render a real lit subject using the current defaults, with a default orthographic camera; do not require the later native pixel task to make this increment usable.
- Implement sphere, cube, cylinder, cone, square pyramid, torus and plane. Use standard Three geometry where appropriate, including a four-sided cone/pyramid with documented orientation. Provide meaningful bounded radii, dimensions, heights, tube size and segment controls by shape, with valid normals and reset behavior.
- Wire X/Y/Z translation, rotation and scale to the subject parent, separate from normalization/geometry and camera. Nonuniform scales must use correct normals; reject zero/degenerate parameters. Fit/recenter a newly selected shape for a useful initial reference view without resetting unrelated settings.
- Introduce a minimal requestAnimationFrame invalidation path: coalesce changes and idle when unchanged. Do not create a perpetual animation loop for a static scene. Pixel capture/style dirtiness will extend this path in PSS-07.
- Rebuild geometry only when its parameters change. Dispose replaced geometry/materials, controls/listeners if present and renderer on final unmount. React StrictMode mount/unmount must not duplicate canvases or handlers.
- Handle unavailable WebGL2, renderer creation/allocation failure and context loss with visible status and disabled output actions. Establish context-restoration ownership or an explicit retry that reconstructs from settings; later tasks must extend this path rather than suppress errors.
- Keep helper/ground layers separate; ground shadows are PSS-15. The subject abstraction must accept a static group later without creating an import plugin system now.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement primitives, transform/geometry controls, real reference rendering and lifecycle management. Camera interaction/presets belong to PSS-05; light controls to PSS-06; native pixels/framing to PSS-07/08. Do not claim the reference canvas is pixel-perfect or export-ready.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. Every listed primitive appears correctly and its relevant parameters visibly affect geometry.
2. Translation, X/Y/Z rotation, nonuniform scale and reset work independently of camera settings.
3. Selecting/replacing shapes repeatedly does not accumulate resources/canvases/listeners.
4. Idle scenes do not continually render, and invalid geometry inputs never silently create broken frames.
5. A simulated no-context/loss path shows a usable status/retry instead of a blank unexplained canvas.

## G. Verification

Run standard checks and focused tests for geometry parameter bounds, shape dispatch and transform isolation where useful. In a real browser inspect all seven shapes, parameter changes and repeated selection, check console output, test StrictMode remount/retry and compare renderer memory counters before/after repeated replacements. Do not substitute mocked Three calls for visual rendering evidence.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-04 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
