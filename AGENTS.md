# Project instructions

## Purpose and user preferences

This is a personal, single-user tool for its owner to learn how to draw
professional-quality pixel art. Use that learning goal to guide decisions
within the specification and the current implementation task.

- The user is unavailable during automated runs. Do not ask questions, request
  choices, or wait for a response. Resolve ambiguity using your judgment and
  choose the option that provides the most robust, coherent user experience.
- Favor accurate and useful pixel-art references, clear controls, sensible
  defaults, reversible adjustments, reliable local saving/export, and concise
  help that makes artistic choices understandable.
- Keep implementation within the current task. Avoid unrelated features or
  infrastructure that does not help this single user learn and practice.
- Record consequential assumptions and decisions in the task's progress entry
  so the user can review them afterward.

## Local operation

- Run and verify the application locally. Bind development and preview servers
  to `127.0.0.1` or `localhost`.
- Do not deploy, publish, set up hosting, or expose the application publicly.
- Keep application assets, imported models/artwork, settings, presets, and
  exports local. Do not upload the user's content to external services.
- Do not introduce cloud backends, accounts, multi-user features, analytics,
  or runtime dependencies on remote services or hosted assets.
- Network access for development documentation and dependency installation is
  allowed when needed; the resulting application must work locally.

## Unattended verification

Resolve recoverable problems autonomously with the available local tools.
Do not substitute a request for user testing for checks you can perform.
Preserve the acceptance criteria and report verification honestly. If a real
blocker remains, document it and leave the task incomplete so the runner stops
before executing dependent tasks.

## Code comments

A comment should exist only when reading the code with the comment requires
less mental effort than reading the code without it.

- Prefer self-explanatory code over comments.
- Explain non-obvious intent, reasoning, constraints, edge cases, or behavior
  that cannot be expressed clearly through the code itself.
- Do not restate obvious code or add comments merely because code changed.
- Keep comments proportional to the complexity they explain and easy to scan.
- If simple code needs a lengthy explanation, first make the code clearer.
- Preserve useful existing comments unless they are inaccurate, redundant,
  or no longer necessary.
