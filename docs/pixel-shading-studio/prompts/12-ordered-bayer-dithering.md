# PSS-12 — Implement native-grid Bayer dithering

## A. Task identification

- **Task ID:** PSS-12
- **Title:** Implement native-grid Bayer dithering
- **Milestone:** D — Pixel-Art Styling
- **Dependencies:** PSS-11
- **Intended outcome:** None and Bayer 2×2/4×4/8×8 integrate with ramp/palette selection and expose meaningful deterministic controls.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R07 and S3; architecture color/quantization and ordered pipeline.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: pure ordered-dither threshold/mapping functions, dither inspector and pipeline dispatch. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Deliver deliberate ordered dithering tied to actual output pixels, with an exact zero-strength equivalence and no post-quantization noise.

## D. Technical requirements

- Implement correct rank permutations for Bayer 2×2, 4×4 and 8×8 and normalized thresholds `(rank+0.5)/(N*N)`. Establish top-left output coordinates and pattern scale via floor(nativeCoordinate/scale); account for the capture row flip exactly once. Pattern origin is fixed to the output canvas, never CSS/DPR/world coordinates.
- Integrate threshold perturbation into the existing continuous ramp-coordinate mapper before rounding, using strength and transition width in shade intervals as architecture defines. For palette mode use a documented bounded linear-RGB threshold perturbation before nearest-color selection; derive amplitude from palette spacing with stable one-color/duplicate handling. Do not perturb final RGB after quantization.
- Add algorithm selection, strength 0–1, integer pattern scale 1–8 and ramp transition-width control where meaningful. Hide/describe irrelevant controls in continuous modes; dithering operates only when a quantizing mode is active. A zero strength or disabled algorithm dispatches to the identical undithered mapper, not a numerically similar path.
- Respect coverage/region masks. Dither subject color decisions only, never alpha/background; reserve region labeling for later ground effects. Output remains only permitted palette/ramp colors. Keep before/reference frame undithered.
- Reuse native lighting buffers; ordered settings dirty processing only, not GPU capture or framing. Preview zoom/pan/grid/fit changes never alter pattern or frame bytes. Preserve deterministic serialized parameters for PSS-18.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement only none/Bayer ordered quantization and its controls/tests. Blue noise and true diffusion belong to PSS-13. Do not fake ordered dithering with random overlays, add temporal jitter, or change pixel framing to improve patterns.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. Every Bayer matrix contains each rank exactly once with verified expected 2×2/4×4 ordering and 8×8 recursion/fixture.
2. Repeated runs are byte-identical; strength zero is exactly equal to none for all three matrices in ramp and palette modes.
3. Strength/transition width change shade-transition patterns while output color sets remain restricted.
4. Pattern scale changes cells in native pixels; viewport zoom/pan/DPR has no effect on frame hashes.
5. Alpha/background is unchanged and GPU geometry capture is reused for algorithm edits.

## G. Verification

Add explicit small gradient/mask golden fixtures, Bayer rank tests, zero-strength equivalence across sizes, palette membership, determinism, scale/origin and one-color cases. Run standard checks. In a real browser execute S3 on a sphere, compare zoom levels with native-frame hashes and visually inspect ordered transition structure at 8×/16× preview. Ensure all supported matrices visibly differ where expected.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-12 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
