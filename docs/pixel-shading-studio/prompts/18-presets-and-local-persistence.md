# PSS-18 — Save presets and restore complete local configurations

## A. Task identification

- **Task ID:** PSS-18
- **Title:** Save presets and restore complete local configurations
- **Milestone:** F — Export and Persistence
- **Dependencies:** PSS-17
- **Intended outcome:** Named local presets and current-session persistence restore validated scene configurations without backend infrastructure.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R12/R13 and S7; architecture state, persistence/tests and risk handling.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: pure preset serialization/validation, storage adapter, toolbar/preset UI and asset reselect integration. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Make artist setups reusable and reproducible across reloads, including explicit handling of unavailable storage and imported assets.

## D. Technical requirements

- Serialize every required scene field from the current actual model: subject/transforms/parameters, camera pose/target/roll/projection/zoom/FOV, lights/shadows/receiver, canvas/framing/alignment/padding, shading/thresholds/ramp/palette, dither settings, outlines and background. Export dimensions are the canvas fields. Exclude runtime resources, frame bytes, URLs/files, revision counters and purely transient UI state.
- Add schema version, pure validation/deserialization, stable defaults for documented optional fields and a migration mechanism only for versions actually supported. Unknown future or corrupt data must not silently replace the current/last-good state. Preserve unrecognized saved data for recovery where practical; no fake historical migration just to satisfy a test.
- Implement named save, restore, overwrite and delete; include complete factory presets such as canonical blue sphere, directional cube and a dithered limited-color scene. Use atomic store restore and invalidate one latest render, avoiding partially applied fields and autosave-while-loading races.
- Persist current settings with a bounded debounce/commit; save changes on appropriate lifecycle where safe. Handle localStorage unavailable, SecurityError, quota and malformed JSON with a concise notice while keeping in-memory editing/export working. Do not silently lose the user's current configuration after a failed save.
- Respect reset boundaries: section reset, palette reset and full-scene reset. Prevent accidental preset deletion/overwrite through clear explicit UI; no permission prompts outside normal app affordances. Do not erase all localStorage keys owned by unrelated applications.
- Imported model presets store a descriptive asset identifier/hash and settings only. After reload, show a pending-reselect state, preserve settings, validate the reselected file and offer explicit built-in fallback. Do not pretend a missing File/blob URL survived. Built-in scene restore must reproduce settled final pixels on the same browser/GPU.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement browser-local settings/presets and truthful asset reselect. No accounts/backend/database, cloud sharing, binary IndexedDB asset library or expanded image formats. Do not duplicate store settings or rewrite existing validated actions.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. A configured built-in scene with nondefault values in every persisted category saves, reloads and restores equal validated settings and settled frame pixels.
2. Save/overwrite/delete and factory presets function with distinct reset boundaries.
3. Corrupt/unknown-version/invalid/quota/unavailable-storage cases preserve usable in-memory work and show actionable status.
4. Restores apply atomically with no intermediate render/autosave overwriting the intended scene.
5. Imported model restore clearly requests matching file reselect; no runtime objects or URLs appear in saved JSON.

## G. Verification

Test complete round-trip, version rejection/real migration if applicable, malformed values, storage exceptions, reset isolation and atomic restore/autosave ordering. Run standard checks. In a real browser execute S7 with a fully configured built-in scene, reload and compare settings plus native frame hash/export, then test unavailable storage and missing-import reselect/fallback. Record tested schema version and any GPU/environment assumptions.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-18 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
