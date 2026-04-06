# Codex-Cryptica Agent Instructions

This file is the Codex-facing instruction layer for this repository.

## Source Of Truth

- The Speckit command definitions in [`.gemini/commands`](./.gemini/commands) are the canonical command source for this repo.
- [`.codex/commands`](./.codex/commands) is a shared mirror for Codex CLI compatibility.
- Keep command behavior synchronized in the canonical Speckit files first, then mirror any Codex-specific guidance here.
- If these instructions ever conflict with [`.specify/memory/constitution.md`](./.specify/memory/constitution.md), the constitution wins.

## How Codex Should Work Here

- Treat `speckit` commands as workflow steps, not as built-in Codex features.
- For spec-driven work, use the existing `.specify` scripts and artifacts:
  - `.specify/scripts/bash/check-prerequisites.sh`
  - `.specify/scripts/bash/create-new-feature.sh`
  - `.specify/scripts/bash/setup-plan.sh`
  - `.specify/scripts/bash/update-agent-context.sh`
- Read the relevant files before editing:
  - `spec.md`
  - `plan.md`
  - `tasks.md`
  - `checklists/requirements.md`
  - `.specify/memory/constitution.md`

## Repository Rules

- Follow the constitution's library-first, TDD, privacy, DI, and documentation principles.
- Do not commit implementation changes without tests for the affected behavior.
- Use constructor-based dependency injection for services and stores.
- Prefer local-first and client-side solutions when the architecture allows it.
- Keep user-facing language clear and plain.
- Create a new branch for code changes, fixes, or refactors.
- Prefer the GitHub app/MCP tools for structured GitHub work such as PR metadata, comments, labels, reviews, file patches, and PR edits.
- Prefer `gh` for CI and Actions debugging, raw check/log inspection, or other terminal-native GitHub workflows.
- Use `gh` as the fallback when the connector does not expose the needed GitHub action cleanly.

## Maintenance Rule

- If Speckit command behavior changes, update the command files in [`.gemini/commands`](./.gemini/commands) first, then refresh the Codex mirror at [`.codex/commands`](./.codex/commands).
- Then update this file only for Codex-specific behavior or repository-wide guidance.
- Avoid duplicating long command scripts here; link back to the canonical files instead.
