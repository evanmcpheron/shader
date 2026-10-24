# PSS-19 — Polish usability and measure rendering performance

## A. Task identification

- **Task ID:** PSS-19
- **Title:** Polish usability and measure rendering performance
- **Milestone:** G — Polish and Verification
- **Dependencies:** PSS-18
- **Intended outcome:** The complete studio is accessible, responsive and resource-stable at required resolutions, with measured bottlenecks addressed.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R10/R14 and S9; architecture scheduling/performance/recovery and risks.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: actual UI/runtime hot spots, scheduler/resource ownership, optional measured worker and operational documentation. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Resolve usability and runtime issues revealed by the integrated feature set before the final requirements audit, without speculative optimization.

## D. Technical requirements

- Audit actual connected controls for labels, help, focus, invalid numeric drafts, mode-specific availability, reset boundaries and clear separation of canvas size, subject fit and preview zoom. Ensure factory/current/custom preset status and import/export error states are comprehensible. Complete dark desktop/narrow-panel layouts and remove stale template content.
- Exercise gestures under roll, perspective, preview pan/zoom, comparison and collapsed panels. Numeric controls remain usable while rendering; no pointer capture leak or accidental simultaneous camera/light movement. Check keyboard-only workflow, contrast and status announcement where appropriate.
- Profile real stage timings for 32×32, 64×64, 128×128 and 256×256 during camera orbit and light drag with none/Bayer/blue-noise/FS, outlines and shadows. Record browser/OS/hardware, workload, capture/readback/CPU/publish timings and observed responsiveness; do not promise universal FPS.
- Verify dirty categories: view navigation does no image work; palette/dither changes avoid normal capture; light changes recapture shadows only when necessary. Coalesce edits and guarantee the latest settled revision. Inspect React rerenders and allocation hot spots only when measurements show a problem.
- Fix measured stalls with focused buffer reuse/scheduling first. Add a dedicated pixel-processing worker only if measurements justify it; keep identical pure algorithm/results, explicit transferable buffer ownership and stale-result cancellation. Never lower native resolution, disable required algorithms or substitute preview output silently. Expensive cases can skip intermediate revisions with honest busy status.
- Verify repeated primitive/model replacement, canvas resize, effect toggles, export, component remount and context loss/recovery. Pending jobs cannot publish after disposal. Inspect renderer memory/heap plateaus and clean up targets, materials, textures/bitmaps, controls/listeners/observers and URLs. Retain explicit recovery when storage/import/encoding fails.
- Update README and architecture with actual controls, resource limits, timings and any justified worker strategy. Keep a concise measured evidence record under docs/pixel-shading-studio; no invented benchmarks or broad infrastructure.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement measured performance fixes, accessibility/usability polish and recovery/resource defects. No new optional feature families or broad architecture rewrite. Final requirement-by-requirement acceptance is PSS-20; do not mark it complete here.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. All major workflows are reachable by labeled controls at desktop sizes and usable through narrow-panel navigation.
2. Required 256×256 workloads finish, input remains usable, settled output is correct and latest-revision export is reliable.
3. Stage measurements identify actual costs and document any remaining limitations without fabricated FPS claims.
4. Repeated resource replacement/remount/context restoration shows a plateau, no duplicated listeners/canvases and no stale output.
5. Any optional worker/optimization preserves deterministic CPU fixtures and decoded preview/export pixel equality.

## G. Verification

Run standard checks, relevant regression tests for changed scheduling/resource paths and a production preview via `npm run preview -- --host 127.0.0.1`. Profile representative workloads in a real browser; record method and results. Check keyboard/focus/layout at roughly 1440×900, 1024×768 and 768px width, console warnings, memory plateau and forced context recovery. Unrun profiling/visual checks remain open acceptance items.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-19 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
