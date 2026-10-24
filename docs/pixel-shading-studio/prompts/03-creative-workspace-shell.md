# PSS-03 — Build the accessible creative workspace shell

## A. Task identification

- **Task ID:** PSS-03
- **Title:** Build the accessible creative workspace shell
- **Milestone:** A — Foundation
- **Dependencies:** PSS-02
- **Intended outcome:** A responsive dark studio layout and reusable connected controls replace the Vite starter coherently.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Specification R10; architecture modules and ownership, UI composition.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: app composition, current App/index CSS, shared control components and focused UI tests. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Establish the graphics-tool workspace and control conventions before scene features are added, while showing only working interactions.

## D. Technical requirements

- Replace only the confirmed starter screen with top toolbar, left scene inspector, central workspace, right pixel inspector and status area. Reinspect for user changes first and preserve any new working functionality. Remove template layout assumptions such as centered max-width/root text alignment only where they conflict with the studio.
- Use existing CSS with small semantic tokens for surfaces, borders, text, spacing and restrained accent. Keep typography readable and panels compact; no gradients, gratuitous animation or UI-framework installation.
- Create focused reusable labeled number/range, select, toggle, color input and section/disclosure controls only as used. Support keyboard access, visible focus, stable IDs, accessible descriptions, finite-number validation and an invalid draft without corrupting stored settings.
- Connect shell-only interactions such as inspector collapse, help/status disclosure, preview tool selection and reset-to-domain-defaults. Scene/style controls belong to their feature tasks; do not present inactive sliders or fake canvas content as functioning rendering. Show a truthful initial no-renderer workspace state until PSS-04 supplies the scene. Do not create export/preset buttons that pretend to work.
- Make sidebars independently scrollable and preserve the central workspace at normal desktop widths. At narrow widths expose accessible panel toggles rather than horizontal page overflow. Avoid focus traps when a panel closes.
- Replace the baseline counter interaction test with a meaningful studio test covering keyboard-operated panel toggle and/or a real reset action. Keep the store wiring and accessibility behavior tested, not CSS implementation details.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement layout, tokens, reusable controls and genuine shell state interactions. No 3D scene, native pixel pipeline, image effects, import, persistence or export. Do not prebuild every future form or introduce routing/design-system infrastructure.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. The studio occupies the window and has the specified toolbar/inspectors/workspace/status hierarchy.
2. Existing connected interactions are keyboard usable, labeled, and update the intended store state.
3. No visible control falsely claims an unimplemented renderer/export/effect works.
4. At approximately 1440×900, 1024×768 and a narrow 768px width, panels remain reachable and the page does not become an unusable fixed-width dashboard.
5. The starter interaction test is replaced with meaningful studio behavior coverage; template styles no longer break the workspace.

## G. Verification

Run the standard quality commands. In a real browser inspect desktop and narrow layouts, tab through controls, enter invalid numeric drafts in any exposed numeric control, collapse/reopen inspectors and exercise reset. Report screenshots or specific observations where tools allow. Do not call a jsdom layout assertion visual verification.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-03 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
