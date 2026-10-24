# PSS-20 — Audit and verify the complete application

## A. Task identification

- **Task ID:** PSS-20
- **Title:** Audit and verify the complete application
- **Milestone:** G — Polish and Verification
- **Dependencies:** PSS-19
- **Intended outcome:** Every mandatory requirement and S1–S9 has explicit evidence or a documented acceptance-blocking defect.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Entire specification, all architecture decisions, full roadmap traceability and S1–S9.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: whole application review, targeted integration fixes/tests, README/architecture/progress and final QA evidence document. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Perform a dedicated integration and quality audit against the original specification, fixing integration defects and documenting product readiness honestly.

## D. Technical requirements

- Read the entire SPECIFICATION.md, ARCHITECTURE.md, ROADMAP.md traceability and all completion/evidence records. Inspect the actual implementation; do not trust checkmarks, prior conversations or a successful build as proof. Audit every R01–R14 requirement and each traceability row, not just the nine scenarios.
- Create/update a focused QA evidence document with requirement/scenario, settings/fixture, method, environment, expected result, observed result, pass/fail/unrun, evidence location and issue severity. A significant unrun browser check is not a pass. Record whether each unresolved defect blocks acceptance.
- Execute S1 basic sphere with exact blue palette and 64×64/32×32 measured bounds; S2 independent camera/object/light with cube and bands; S3 Bayer strength/determinism/zoom; S4 real FS palette/determinism/difference; S5 integer outline; S6 transparent alpha/edge artifacts; S7 complete built-in preset reload; S8 rectangular independent dimensions; S9 complete desktop workflow.
- Decode actual exported PNGs and compare pixels/dimensions/alpha to authoritative final frames for canonical, rectangular, outline, transparent/solid, imported-model and all dither cases. Check rapid edits/export, background/effect palette exceptions, strict-effects mapping and no UI overlays. Compare decoded content rather than screenshot or PNG compressed bytes.
- Inspect all primitives/geometry parameters, camera roll/top/bottom/projections/FOV/zoom and fit-mode lock, light drag/color/ambient, thresholds/palette imports, shadows/receiver/softness, GLB+GLTF local companions/failure/cancel, reset boundaries, preset corruption/storage failure, no-WebGL/context restoration and memory/resource behavior.
- Review duplication/architecture only where it obscures or breaks integration. Fix within-scope defects with targeted regression tests and rerun affected scenarios/checks. Preserve requirements; do not remove controls, weaken palette/size/alpha checks, lower output resolution or change the specification simply to make acceptance pass.
- Run all available automated tests/typecheck/lint/production build and actual production-preview behavior. Inspect console/runtime warnings and representative performance evidence at 256×256. Add a missing focused regression test only when it verifies a meaningful defect or uncovered invariant.
- Reconcile implementation docs with reality: dependencies/scripts, pipeline/data formats, actual state schema, resource/import limits, UI instructions, optional/deferred features, remaining risks and next steps. If a major missing system cannot be safely repaired within integration scope, record the concrete follow-up and keep PSS-20 incomplete instead of silently broadening or claiming success.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Audit the complete product and repair integration/acceptance defects. Do not add optional internal outlines, accounts, modeling, additional formats or broad rewrites. Do not silently waive mandatory requirements. Report partial/unverified results honestly and leave completion open when acceptance is blocked.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. Every mandatory traceability row has observed verification evidence or an explicit acceptance blocker; no disconnected controls remain.
2. All S1–S9 pass through behavioral/visual verification, including decoded native PNG fidelity and preset reproduction.
3. Existing automated tests, strict typecheck, lint and production build pass after repairs; warnings/failures are resolved or clearly recorded as blockers.
4. Required common/256×256 interactions are usable, resources stabilize and final output remains deterministic within the declared environment.
5. Architecture/README/progress/QA evidence reflect reality; PSS-20 is marked complete only if no significant acceptance-blocking defect or required unrun check remains.

## G. Verification

First discover actual scripts, then run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` and `npm run preview -- --host 127.0.0.1`. Execute S1–S9 in a real browser and inspect downloaded PNG data, actual state reload, rendering behavior and memory/performance observations. Use a second available desktop browser for a representative transparency/palette/export smoke check; if unavailable, record the compatibility limitation without claiming that check. Repeat only affected checks after fixes. Include exact environment and evidence, not assertions that a clean console/build means correct art.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-20 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
