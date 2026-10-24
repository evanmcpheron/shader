# PSS-15 — Add directional shadows and a controlled ground receiver

## A. Task identification

- **Task ID:** PSS-15
- **Title:** Add directional shadows and a controlled ground receiver
- **Milestone:** E — Advanced Rendering
- **Dependencies:** PSS-14
- **Intended outcome:** Self/ground shadows and pixel-stylized softness integrate before quantization with explicit receiver behavior.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R03/R09 and S6; architecture shadow/import scope and ordered pipeline.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: ground/receiver scene resources, shadow map/visibility capture, CPU shadow stylization and lighting inspector. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Complete artist-controllable lighting/shadows without introducing PBR complexity or violating palette/transparency constraints.

## D. Technical requirements

- Add an optional independent ground plane distinct from the plane subject. Support visible receiver, shadow-only receiver, off, directional self/ground shadow toggles, strength, hard/pixel-stylized soft treatment and lighting/shadow reset. Use existing domain fields and single renderer.
- Use one bounded directional shadow map with fitted light frustum, sensible resolution/bias limits and explicit disposal. Integrate native visibility capture with installed Three shadow shader chunks/material support. A custom normal material does not automatically receive shadow maps: prove a separate native visibility pass or equivalent correct integration rather than assuming it works.
- Keep visibility pass projection/depth/category coordinates aligned to native normal data. Attenuate directional illumination before shading/dithering and preserve ambient. Ground uses category 128, subject 255 and background 0; do not leak raw category alpha to final RGBA.
- Implement documented integer softness radius 0–4 or equivalent discrete stylized visibility bands before quantization. Keep visibility filtering within valid samples of the same subject/receiver category, preventing background and unrelated-surface bleeding. Shadow-only ground is transparent where unshadowed and deterministic binary covered/colored where shadowed. No fractional-alpha blending that silently adds colors; use palette-constrained pixel coverage for softer boundaries. Keep subject and receiver diffusion regions separate.
- Respect effect color policy: receiver/shadow colors are explicit additions or strict palette entries. Outlines derive from subject only and composite above receiver. Ground/shadows do not enter subject fitting, and their clipping/extents are reported without enlarging the canvas.
- Wire all controls and presets to observable behavior. Reuse normal capture where appropriate; shadow visibility invalidates on light/geometry/ground/shadow changes, not preview-only edits. Handle light direction near ground, self-shadow acne, detached bias and disabled-shadow resource reuse honestly.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement one directional shadow system, ground and stylization. No multi-light environment/PBR, ambient occlusion, physically accurate area lights, temporal filters, fractional-alpha shadows or other image effects. Do not change palette or dither algorithms to hide shadow bugs.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. A cube casts a ground shadow that moves with the light; self-shadow visibility affects direct illumination while ambient stays present.
2. Visible/shadow-only/off receiver states behave distinctly and correctly with transparent background.
3. Hard/soft/strength controls change actual native output with no unauthorized palette colors in strict mode.
4. Ground/shadows never affect the subject's 32×32 fit or silhouette outline, and clipped effects are reported.
5. Native passes align, repeated settings are deterministic, and resource counters stabilize after repeated toggles/resolution changes.

## G. Verification

Test visibility-to-illumination math, binary shadow coverage, mask categories, palette policy and no-diffusion-across-region fixtures. Run standard checks. In a real browser inspect cube/cone/torus self/ground shadows, move light, vary bias within exposed limits, test ambient-only, transparent shadow-only and outlined objects, inspect palette/alpha, and compare native pass alignment. Record visual acne/detachment findings; a working shadow checkbox is insufficient.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-15 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
