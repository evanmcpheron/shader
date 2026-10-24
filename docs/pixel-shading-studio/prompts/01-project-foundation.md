# PSS-01 — Preserve the project and establish strict tooling

## A. Task identification

- **Task ID:** PSS-01
- **Title:** Preserve the project and establish strict tooling
- **Milestone:** A — Foundation
- **Dependencies:** None; first implementation task after planning
- **Intended outcome:** The existing app still runs with a compatible graphics/state/test toolchain and explicit quality commands.

Implement this task only in the existing repository. This prompt is intended for a fresh Codex conversation; the repository is the source of truth.

## B. Repository context

1. Read applicable AGENTS.md/instructions, the current README, package.json/lockfile and relevant configuration. The supplied governing comment rule is: a comment should exist only when reading code with it requires less mental effort than without it. Prefer clear code and preserve useful comments.
2. Read `docs/pixel-shading-studio/SPECIFICATION.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`. Focused references: Architecture: confirmed state, dependency decisions, persistence and tests; specification: technical constraints and R14.
3. Verify dependency task completion and evidence in PROGRESS.md, then inspect the actual corresponding implementation before editing. If a prerequisite is absent/broken, record the concrete blocker and do not fabricate its functionality. If this task is already implemented, assess remaining acceptance gaps instead of regenerating it.
4. Inspect existing applicable code and changes made by the user. Expected areas: package.json/lockfile, root Vite/TS/ESLint/test config, README, and a narrowly scoped starter interaction test. These are responsibilities, not mandatory filenames/APIs; follow the structure established by earlier tasks and adjust documentation when justified.
5. The initial repository was an npm React/TypeScript Vite starter with CSS, no graphics features and no .git directory. Preserve its package manager and working functionality; recheck current state rather than relying on these historical facts or past conversations. Do not initialize/replace the project.

## C. Objective

Prepare the existing project for the studio without implementing product features. Establish reproducible strict checks before state and rendering work begins.

## D. Technical requirements

- Verify package.json, package-lock.json, Vite/ESLint/TS configuration and installed versions. Baseline inspection found React 19.3.1, Vite 8.3.5, TypeScript 6.0.3, ESLint 10.13.0 and npm lockfile v3. Reinspect instead of assuming these remain unchanged.
- Preserve npm, the current Vite app, entry point and scripts. Choose and install compatible versions of three, its type declarations if needed, Zustand, Vitest, jsdom and React Testing Library (including user-event only if used). Check peer/engine compatibility with the actual locked framework/tool versions. Do not blindly install latest or downgrade the existing stack. Record exact versions and rationale.
- Enable TypeScript strict mode in applicable app/node configs; fix only resulting baseline errors. Retain useful unused checks and the ESM configuration. Maintain concise code style and the existing comment rule.
- Add `typecheck` with `tsc -b --noEmit`, `test` with `vitest run`, and optionally `test:watch` with Vitest watch. Preserve dev/build/lint/preview. Configure a Node default for pure tests and a scoped jsdom environment for UI tests so future native-array tests do not need DOM simulation.
- Verify the test integration with one real baseline counter interaction in the current starter (render, click its accessible button, observe increment), not a dummy arithmetic assertion. PSS-03 will replace this with a real studio-shell interaction when the starter is removed. Keep tests compatible with React StrictMode and clean up after render.
- Document npm setup, supported Node version based on selected packages, commands, and the proposed direct-Three approach. No empty feature modules, giant folder trees, or renderer scaffold is needed here.

Apply Clean Code and SOLID where they materially help: descriptive names, explicit types and logic, focused functions/components, no unjustified `any`, and DRY without forced abstractions. Handle relevant error/boundary cases and integrate with actual existing state/render lifecycles. No placeholders presented as complete functionality, silent rendering failures, unhandled runtime warnings, disconnected controls or graphics-resource leaks.

## E. Scope boundaries

Implement dependencies, strict configuration, explicit checks, and minimal test wiring only. Do not replace App with the studio, write scene/state/image-processing features, add Tailwind/shadcn/R3F/Drei, or introduce a browser runner/backend. Keep the starter behavior working. Do not initialize another project or initialize Git merely because this directory initially lacks .git.

Implement only this task and necessary integration fixes. Do not start later tasks, refactor unrelated code, silently replace working behavior, add speculative infrastructure or automatically execute another roadmap prompt. Leave a coherent working increment. Dependencies may be changed only when this task requires them, through npm with rationale and lockfile consistency.

## F. Acceptance criteria

1. The existing app starts and its counter still works.
2. npm remains authoritative; only justified dependencies and lockfile changes appear.
3. Both TypeScript projects use strict checking and the new scripts execute their stated commands.
4. The real baseline interaction test passes; no empty suite is presented as meaningful coverage.
5. README and progress record exact added versions, scripts, engine constraints, and any compatibility adjustment.

## G. Verification

Run the existing `npm run lint` and `npm run build` before changes if feasible, then run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`. Start `npm run dev -- --host 127.0.0.1` and verify the counter in a real browser, reporting whether that check was actually performed. Confirm no engine/peer warning is ignored without explanation. These commands must be added before they are used; do not invoke a nonexistent test script or let npx fetch an unplanned runner.

This task establishes the validation commands used by every subsequent prompt. Record baseline and post-change results separately.

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

Update `docs/pixel-shading-studio/PROGRESS.md` in this same session. Record PSS-01 status, implementation summary, affected areas, decisions, exact verification results/evidence and open issues. Mark **Complete** only after every task acceptance criterion is verified. Use **In progress** or **Blocked** accurately for incomplete/unverified work, with a concrete reason; do not mark future tasks complete or remove requirements. Update current implementation state and next executable task based on verified dependencies. If changing a proposed architecture detail, reconcile ARCHITECTURE.md and the relevant roadmap/prompt references rather than leaving contradictory instructions. Stop after reporting this task.
