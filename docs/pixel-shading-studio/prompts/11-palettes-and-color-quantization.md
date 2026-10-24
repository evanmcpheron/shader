# PSS-11 — Implement exact palettes, editable ramps and color quantization

## A. Task identification

- **Task ID:** PSS-11
- **Title:** Implement exact palettes, editable ramps and color quantization
- **Milestone:** D — Pixel-Art Styling
- **Dependencies:** PSS-10
- **Intended outcome:** Custom/preset palettes, editable ramps, palette interchange and predictable exact-color mapping are complete.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R05/R06 and S1; architecture color and quantization.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: palette/ramp editor and interchange, pure color/quantization modules, existing shading integration. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Make restricted-color output trustworthy by preserving input sRGB bytes while doing lighting and nearest-color calculations in a declared linear space.

## D. Technical requirements

- Implement manual picker/hex editing, add/remove/reorder, 1–32-color limits, ordered custom shading ramps and palette reset. Use the exact named preset colors in SPECIFICATION.md; label hardware-inspired palettes honestly. Distinguish palette mode (nearest-color matching) from ordered ramp mode (illumination index), while sharing explicit color entries where useful.
- Add palette-constrained shading mode using squared Euclidean distance in decoded linear-sRGB, stable lowest-index ties, and original stored sRGB byte output. No extra gamma/tone mapping follows quantization. Cache decoded colors and handle duplicate colors, one-color palettes and valid count changes without NaN or accidental resorting.
- Use proper sRGB transfer functions with endpoint tests. Smooth shading converts linear result exactly once; fixed-ramp colors bypass that conversion on final write. Brightness/contrast/light color affect the continuous input, never the resulting palette bytes. Document the meaning of color distance and saturation.
- Support simple versioned JSON/hex-list palette import and configuration export using local files/text. Validate format, count and colors atomically; malformed import leaves the old palette intact with a useful error. This is palette data interchange, not a second image export format.
- Provide explicit regenerate/resample ramp behavior for count changes and preserve artist order. Generated shadow/base/highlight ramps interpolate in linear RGB, convert once to stored bytes, and become editable entries. Avoid unsignaled destruction of custom ramps.
- Define an effect palette policy now: subject strict by mode; transparent alpha excluded; separately configured background/outline/ground colors allowed and disclosed; strict all-effects mapping available for later effects. Do not let future effects silently weaken the current N-color invariant.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement palette/ramp UI, data interchange, color conversion and quantization. Dithering, outlines, shadows, image PNG export and saved scene presets remain later. Do not add broad color-science libraries, historical accuracy claims, HDR or wide-gamut support.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. Canonical four-blue-color sphere with no effects/dither contains only the four specified RGB entries among opaque pixels.
2. Every built-in palette has exactly its documented bytes; custom reordering is preserved.
3. Nearest-color fixtures, tie breaking, one-color/duplicate cases and sRGB round-trip endpoints pass.
4. Valid palette import updates atomically; malformed/excessive/invalid input leaves settings and image unchanged.
5. Brightness/contrast/light adjustments move shade allocation without creating unauthorized final subject colors.

## G. Verification

Test transfer functions, nearest-color ties with independently calculated expected values, ramp generation/order, color-set membership, one-color palettes and import validation. Run standard checks. In a real browser run S1 through native-frame inspection (export follows PSS-17), edit/reorder/import palettes, switch continuous/ramp/palette modes and inspect exact resulting RGB bytes. Check that there is no double-conversion color shift.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-11 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.

PSS-10 integration baseline: extend `domain/shading.ts`, `pixels/nativeFrame.ts`, `ShadingInspector` and existing store actions. Initial explicit ramp generation, exact-byte cel/bands, staged level application preserving retained entries/boundaries, and the continuous Original are already implemented. Preserve the documented signal order, linear-illumination luminance, threshold equality and reference/capture reuse. Add full entry editing/presets/interchange and nearest-color mapping here; do not duplicate the mapper/generator or replace retained colors on an ordinary level change.
