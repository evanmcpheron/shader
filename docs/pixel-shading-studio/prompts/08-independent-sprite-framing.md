# PSS-08 — Implement independent canvas and subject pixel framing

## A. Task identification

- **Task ID:** PSS-08
- **Title:** Implement independent canvas and subject pixel framing
- **Milestone:** C — Pixel-Perfect Rendering
- **Dependencies:** PSS-07
- **Intended outcome:** Artists control a separate subject fit box, alignment and padding with measured native occupied bounds.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R02/R04, S1/S8; architecture subject fit versus canvas versus preview.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: framing math, derived render projection, subject-mask measurement, canvas/object framing inspector. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

PSS-07 integration: `scene/nativeCapture.ts` owns native camera derivation, target/normal cache and canonical frame publication inside the existing `ReferenceRuntime`. At the PSS-07 baseline it configured the manual saved camera at native W/H aspect. PSS-08 now extends this boundary through `scene/pixelFraming.ts`; consult PROGRESS.md for verified implementation/evidence before editing. Extend this boundary for fitting and preserve capture caching, synchronous readback, generation/revision publication guards and explicit Retry ownership. `pixels/nativeFrame.ts` consumes top-left category bytes; fit measures subject alpha 255, never display background alpha.

## C. Objective

Deliver the defining 32×32 sphere inside a 64×64 image and rectangular variants without distorting geometry or conflating camera and preview zoom.

## D. Technical requirements

- Extend the PSS-05 camera controller and its derived render-camera boundary. Its explicit Reframe reference action commits manual camera settings; native pixel fitting must derive its own render projection without mutating that unrolled source or adding another authoritative pose.

- Add subject box width/height, pixel-fit/manual mode, nine alignments, integer offsets and per-edge padding backed by validated state. Canvas size remains independent. Explicitly clamp an oversized requested box to the drawable padded area with a notice; reject empty areas. Use documented floor rounding for leading margins.
- Derive a render projection from actual projected geometry vertex extents and the orbit pose. Preserve aspect ratio and transform data. Do not use world Box3 corners as exact rotated silhouette bounds, scale geometry nonuniformly to meet requested dimensions, or resample a completed image.
- Rasterize directly at native resolution and measure only subject category pixels. Perform a bounded cached correction of scale/grid phase as needed. Require the canonical default orthographic sphere to occupy exactly 32×32 at x/y=16..47 on 64×64; also exactly x=32..63,y=16..47 on 96×64. Establish a finite iteration cap, convergence/error behavior and a reported actual result. Do not claim arbitrary shapes can fill both axes.
- Pixel-fit mode recomputes fit on geometry/camera orientation/canvas/framing changes and keeps a stable result across light/palette edits. Fit uses a derived camera, never writes the orbit camera or object transforms. Position still affects world relationships but fit recenters; alignment/offsets place the subject in image space.
- In pixel-fit mode disable camera pan/zoom with concise help and an explicit manual-framing switch. In manual mode camera pan/zoom changes occupied size/placement; retain requested fit values and report actual bounds and clipping. Preview-only zoom remains separate for PSS-09.
- Handle empty/thin/edge-on geometry, extreme perspective/FOV, objects crossing near plane, rotations and nonuniform scales. Show a clear nonconvergence/clipping notice and retain usable manual framing; no infinite render loop or silently fabricated dimensions.
- Exclude ground/helpers and future outlines/shadows from subject measurements. Report effect extents separately when later features land. Provide framing reset without resetting object/light/palette.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement native subject fit and framing controls/measurement only. Do not implement image scaling as a fit shortcut, auto-expand export dimensions, add modeling features, or implement later outlines/shadows/export. Preserve manual camera interaction.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. Both canonical 32×32 sphere cases meet exact measured coordinates in a real native mask.
2. Rectangular canvas, fit box and camera/manual scale remain independently configurable.
3. Fit preserves projected aspect and displays achieved dimensions for a non-square shape; requested values are never mislabeled as measured bounds.
4. Center/edges/corners, odd margins, offsets and asymmetric padding match documented integer rules.
5. Light-only changes leave fit unchanged; camera rotation refits; switching modes does not mutate object transforms.
6. Invalid/empty/near-plane fits terminate with a useful state instead of hanging or silently clipping.

## G. Verification

Test dimension arithmetic, odd rounding, padding, fit-aspect calculations and bounded correction/termination with independent fixtures. Run standard checks. In a real browser measure actual native masks for 64×64 and 96×64 sphere cases, rotate cube/torus/plane in both projections, test manual zoom/pan, alignment/padding/edge clipping and invalid limits. Record requested versus achieved bounds. PNG export is not yet implemented, so record native-frame evidence and defer decoded export confirmation to PSS-17.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-08 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
