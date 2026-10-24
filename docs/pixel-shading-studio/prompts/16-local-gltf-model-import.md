# PSS-16 — Import bounded local GLB and GLTF references

## A. Task identification

- **Task ID:** PSS-16
- **Title:** Import bounded local GLB and GLTF references
- **Milestone:** E — Advanced Rendering
- **Dependencies:** PSS-15
- **Intended outcome:** Local static mesh models use the existing framing, lighting, styling and resource lifecycle without a second rendering path.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R01/R13; architecture scene, shadow/import scope, persistence and risks.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: subject asset loader/runtime owner, local-file resolver/import UI, bounded fixtures and existing scene integration. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Extend the subject source from primitives to artist-provided reference geometry after the core rendering contract is established.

## D. Technical requirements

- Use the installed Three GLTFLoader addon for GLB and GLTF 2.0. Accept embedded data and locally selected companion files (.bin/textures) via LoadingManager URL remapping. Resolve only files explicitly selected by the user or embedded data; do not fetch remote resources/CDNs. Missing companions produce actionable messages, not network fallbacks.
- Establish documented initial caps such as 25 MiB selected bytes, 250,000 vertices and 250,000 triangles, with reasonable bounded scene traversal. Validate before/after parse as possible, report excess rather than freezing, and retain/release partial resources safely. Adjust caps only with evidence and record the chosen values.
- Support static mesh groups, authored normals or computed missing normals, stable centering/normalization by a parent and independent user transforms. Keep group relationships intact. Override imported appearance to use the application's geometry-derived reference/palette path. Ignore imported lights/cameras and do not activate animations.
- Explicitly reject unsupported required compression/extensions and unsupported skinned/morph/animated/deformed content with a clear explanation. Do not add decoder infrastructure merely because the loader has extension hooks. Static GLB and GLTF with selected companion buffers remain mandatory.
- Make import atomic and cancellable/revision-aware: the current subject remains usable until a valid new model is ready. A late import cannot replace a newer selection. On failure/cancel/switch dispose all owned geometry/materials/textures/bitmaps and revoke URLs, deduplicating shared resources.
- Connect import/loading/error/reselect UI, reset/reframe and primitive return. Imported models must work with smooth/flat modes, palettes, each dither algorithm, outlines and ground shadows. Their subject-mask bounds use the same fitter; do not create model-specific pixel scaling/export.
- Maintain a runtime asset handle plus serializable name/hash/descriptor. PSS-18 will persist settings and request file reselect on reload; do not put File, blob URL or mesh in JSON/localStorage here.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement local static model import and integration only. No remote asset browser, full PBR material/texture fidelity, animation playback, modeling, archive dependency, auto decoder downloads or permanent binary storage. Do not replace existing primitives or renderer.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. A small local GLB and a GLTF plus companion .bin load, normalize and render through the same native pipeline.
2. Imported scene transforms, camera, light, palette/dither/outline and shadows work without violating palette/alpha contracts.
3. Missing companions, malformed/oversized assets, remote references and unsupported required compression/deformation fail visibly while preserving the prior scene.
4. Cancellation/rapid replacement never publishes stale assets and resources/URLs stabilize after repeated imports and primitive switches.
5. Asset descriptors are serializable while runtime files/resources are excluded; model reselect requirements are documented.

## G. Verification

Add tiny self-authored static GLB/GLTF fixtures with companion, malformed/missing/unsupported cases and tests for local resolution, caps and atomic swap ownership. Run standard checks. In a real browser load both formats, style/reframe/rotate them, test failure/cancel and repeated replacement, inspect no unexpected network fetches, and check resource memory. Do not claim unsupported model classes were tested as working.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-16 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
