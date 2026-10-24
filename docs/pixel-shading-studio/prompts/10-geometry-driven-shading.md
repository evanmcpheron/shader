# PSS-10 — Implement flat, cel and discrete shading modes

## A. Task identification

- **Task ID:** PSS-10
- **Title:** Implement flat, cel and discrete shading modes
- **Milestone:** D — Pixel-Art Styling
- **Dependencies:** PSS-09
- **Intended outcome:** Smooth, flat, cel and discrete band shading respond to geometry/light with editable levels and thresholds.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R03/R05, S2; architecture capture lighting and color/quantization.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: normal capture variants, pure illumination/ramp mapping, shading inspector and mode-specific UI help. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Expand the existing basic Lambert pixel processor into deliberate shading modes without substituting screenshot posterization for geometry-aware illumination.

## D. Technical requirements

- Preserve the native normal/lighting contract. Separate face-normal versus smooth-normal treatment from tone mapping so named modes are comprehensible. Implement smooth reference, flat shading, cel and discrete pixel-art bands. PSS-11 supplies complete palette-constrained mapping and ramp management.
- For flat shading, capture true face normals using supported derivative/nonindexed geometry treatment with explicit ownership, including correct nonuniform scale and imported-static-mesh compatibility. Smooth mode retains interpolated normals. Avoid rebuilding all geometry on every mode change when a material/owned cached variant suffices.
- Implement level count, strictly monotonic shading thresholds, base/shadow/highlight colors, contrast, brightness and shade-distribution controls. Begin with the domain ramp data and generated explicit ramps; PSS-11 extends editing/presets. Define illumination normalization/saturation, threshold equality and endpoints exactly as architecture specifies.
- Apply signal adjustments before band/color selection. A pure ramp-coordinate mapper handles nonuniform thresholds, one level and boundary equality. Do not modify selected exact RGB bytes afterward. Colored lights affect continuous RGB; scalar ramp placement uses linear illumination luminance and keeps ramp colors fixed.
- Connect all visible controls to the processor and update mode-specific descriptions/availability. Level changes should preserve deliberate data unless explicit regeneration is requested; show any invalid threshold edit without corrupting the store. Use existing number/range/color primitives.
- Keep before/reference frame continuous, preserve palette/dither fields for later work without exposing inactive options. Mode switches should dirty normal capture only when normal treatment changes; threshold/brightness changes reuse geometry data.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement normal treatment and geometry-driven smooth/flat/cel/discrete tone mapping. Complete palette editor/nearest-color mode is PSS-11; all dithering is PSS-12/13. No random overlays, imported textures, shadows or unrelated renderer rewrite.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. A cube under moved light changes illuminated faces and selected bands while object/camera remain independent.
2. Smooth sphere and flat-normal low-segment geometry have visibly distinct correct shading.
3. Counts/thresholds/brightness/contrast/distribution alter shade placement with deterministic endpoints and no invalid threshold state.
4. Fixed-ramp output uses only existing ramp entries; colored light does not unexpectedly tint these stored bytes.
5. Reference comparison remains unprocessed and mode changes do not introduce stale frames or leaks.

## G. Verification

Test Lambert scalar math, one-level/equal-boundary behavior, monotonic thresholds, generated ramp endpoints and signal-control ordering with small known fixtures. Run standard checks. In a real browser inspect cube face changes, smooth versus flat sphere/cone, extreme valid lighting, all named modes, level count and threshold changes. Compare frame bytes/color sets and capture reuse; do not infer success from a working slider alone.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-10 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.

PSS-09 integration baseline: `NativeCapture` now publishes a separately owned `getBeforeFrame(revision)` continuous native reference before final publication. Preserve active smooth/flat normals, light, fitted camera, native dimensions and background in that reference while applying tone/signal styling only to final. `PreviewPresentation` consumes both caches without React pixel state; presentation zoom/pan/grid/compare and wheel zoom must continue to skip capture/style processing. The native reference replaces the earlier beauty view; no second reference renderer is needed.

PSS-10 implementation note: the initial generator and non-resampling level action are implemented in this task, ahead of PSS-11's complete editor/presets/resampling. See ARCHITECTURE.md's implemented shading contract for the exact saturation/signal formula, piecewise half-integer mapper, explicit level application and shared cel/bands behavior. Smooth/flat apply to every shape, including pyramid.
