# PSS-13 — Implement blue noise and Floyd–Steinberg diffusion

## A. Task identification

- **Task ID:** PSS-13
- **Title:** Implement blue noise and Floyd–Steinberg diffusion
- **Milestone:** E — Advanced Rendering
- **Dependencies:** PSS-12
- **Intended outcome:** All mandatory dither algorithms work deterministically, including actual sequential error diffusion.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R07 and S3/S4; architecture blue noise, diffusion, scheduling and risks.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: pure dither processors/dispatch, a minimal local blue-noise data asset with provenance, dither controls. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Complete the core dithering system while preserving palette, alpha and export determinism and distinguishing threshold masks from propagated quantization error.

## D. Technical requirements

- Bundle a fixed 64×64 single-channel blue-noise tile with verified source/license/provenance/hash. The architecture links the author's CC0 database. Choose one tile and extract threshold bytes deterministically without display color conversion. If obtaining it is impossible, generate a reproducible void-and-cluster rank tile offline and document method/seed. Do not substitute a seeded white-noise hash or per-frame random texture.
- Integrate blue-noise thresholds through the same quantization stage as ordered dithering. Strength, native integer scale and ramp transition controls retain the established semantics. Use a fixed tile/origin; no temporal changes. Test decoded tile range/distribution/tiling and inspect its non-Bayer structure visually, with a documented spectrum/provenance check rather than claiming randomness proves blue noise.
- Implement genuine Floyd–Steinberg, left-to-right and top-to-bottom: 7/16 right, 3/16 down-left, 5/16 down, 1/16 down-right. Work in continuous ramp-coordinate space for ramps and linear RGB for palette mode. Quantize each pixel with the existing deterministic mapper, compute error in that same domain, scale propagated error by strength and write only original permitted colors.
- Reuse bounded floating current/next error rows. Transparent/different-category neighbors receive no error; drop rather than renormalize their weights. Source/target errors must not jump across adjacent background gaps via masked pixels. Do not diffuse alpha or allow background/outline colors into palette matching. Handle 1px-wide/tall, all-transparent and one-color images.
- Zero strength must immediately use the exact common none path before selecting algorithm. Disable/hide pattern scale and ordered transition controls for diffusion with explanatory labels; error strength is meaningful. Keep the original before-frame untouched and processing revision-aware.
- Measure basic processing timings at 64×64 and 256×256; do not promise FPS or add a worker by default. Preserve a clean pure function boundary so PSS-19 can move measured heavy work without rewriting algorithms.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement blue-noise and Floyd–Steinberg algorithms, asset provenance and controls. Do not change previous Bayer semantics, add arbitrary algorithms, create a shader approximation of error diffusion, or build generic worker infrastructure.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. Blue noise is locally available, deterministic and backed by a real blue-noise source/generation record.
2. A hand-calculated small FS fixture matches exact expected output and scan/weight behavior.
3. Repeated FS results are byte-identical and use only allowed colors; a selected nontrivial fixture differs from Bayer 4×4.
4. For every mode, strength zero equals none byte-for-byte; masks/transparent RGB remain valid.
5. UI exposes all six required mode choices, with applicable controls only; 256×256 completes without a silent stall/failure.

## G. Verification

Add independent scalar/RGB diffusion fixtures, border/mask holes, 1×N/N×1, zero-strength, palette membership, deterministic repetition and blue-noise asset tests. Run standard checks. In a real browser execute S4, compare Bayer/blue-noise/FS on a ramp and sphere, inspect transparency boundaries and record per-stage processing observations at 256×256. An image that merely looks noisy is insufficient evidence of the algorithm.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-13 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
