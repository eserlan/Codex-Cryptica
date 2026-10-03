# Maintaining Spec Kit

This repository uses the **Spec Kit 1.1.0** release, from upstream commit
`f1d3a4f8337ebbd3ae22760a9c12e3352b93a175`.

Run a pinned CLI without changing the machine's installed tools:

```bash
uvx --from git+https://github.com/github/spec-kit.git@v1.1.0 specify integration status
```

For direct Bash command execution with installed presets, install the pinned CLI:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.1.0
```

Preset composition requires Python and PyYAML. The Bash resolver uses the
installed `specify` executable's Python interpreter, which includes PyYAML,
when available. `SPECKIT_PYTHON_EXECUTABLE` remains the first-choice override.
This small local resolver adaptation must be preserved during future upgrades.

## Managed integration and compatibility copies

Gemini is the managed integration and `.gemini/commands/speckit.*.toml` contains
the canonical command definitions. The previous installation recorded
Antigravity as the default, despite the repository's Gemini-first maintenance
rules. Spec Kit 1.1.0 does not permit Antigravity alongside another managed
integration, so only Gemini is registered.

After changing a canonical command, synchronise its Markdown counterpart in
`.gemini/commands`, its `.codex/commands` counterpart, the corresponding
`.agents/skills/speckit-*/SKILL.md`, and any existing `.agent/workflows/sdd-*.md`
entrypoint. Existing Claude Git skills are compatibility copies too. Decode the
TOML prompt before copying it: TOML string escapes must not become literal
Markdown escapes. Replace Gemini's `{{args}}` with `$ARGUMENTS` in Markdown;
skill invocations use `/speckit-<name>` instead of `/speckit.<name>`.

The bundled `constitution-sync` preset preserves the repository's constitution
propagation workflow. Keep its composed command when upgrading; the core command
alone intentionally does not propagate amendments into templates.

## Local policy and preserved state

- `.specify/templates/` retains the repository's discovery and bounded
  responsibility gates. These are local overrides, not pristine upstream assets.
- Task generation requires tests for changed behaviour, including success and a
  meaningful failure or cancellation path. Implementation requires Bun and
  impacted-only validation. These command customisations intentionally differ
  from the upstream manifests and must be merged into future upgrades.
- Git hooks and `.specify/extensions/git/git-config.yml` retain the existing
  sequential numbering and disabled automatic commits.
- Planning retains the repository's legacy agent context updater. Its Git
  diagnostics are adapted to the new feature-state contract; keep that local
  compatibility change when upgrading.
- `.specify/memory/constitution.md`, specifications, plans, and the active
  `.specify/feature.json` are preserved during this migration.

The active feature directory now resolves from `SPECIFY_FEATURE_DIRECTORY`, or
from `.specify/feature.json`, rather than being inferred from the checked-out Git
branch. Set the directory explicitly when resuming a different feature:

```bash
SPECIFY_FEATURE_DIRECTORY=specs/3615-help-registry-expansion \
  bash .specify/scripts/bash/check-prerequisites.sh --json --paths-only
```

`--paths-only` does not persist the override. For other commands,
`SPECIFY_FEATURE_NO_PERSIST=1` suppresses persistence when needed.

The Git extension now creates branches through `create-new-feature-branch.sh`;
core `create-new-feature.sh` creates feature files separately. Existing legacy
scripts remain available, but current commands use the new entrypoints.

## Future upgrades

1. Create a branch and inspect the pinned upstream release and upgrade guide.
2. Run `specify integration status` and review local modifications. Expected
   warnings identify preserved templates and repository policy overrides.
3. Prefer `specify integration upgrade gemini` and `specify extension update git`.
   Do not use `--force` until local customisations have been reviewed and saved.
4. Merge changes into the canonical Gemini commands first, then synchronise all
   compatibility copies. Preserve the constitution-sync composition.
5. Run `bun test scripts/speckit-upgrade.test.ts`, changed-file lint and tests,
   affected-workspace validation, and the repository review and Fallow gates.

The tracked manifests retain upstream template hashes, so future upgrades can
detect local overrides. Do not replace those hashes with custom template hashes
merely to silence the warnings. The constitution command hash records its
installed preset composition.

Upstream shared resolvers and feature/branch creation scripts exceed the constitution's size review
threshold. Their single responsibility is resolving project state and composed
templates, or creating one feature/branch in the shared command runtime. They are retained as upstream units
to keep future release merges reviewable; no application behaviour is added.

PowerShell scripts are refreshed from the same release. Bash is the configured
runtime; PowerShell execution needs verification on a machine with `pwsh`.

`/speckit.taskstoissues` remains available in 1.1.0. Its future move into the
bundled GitHub extension does not require installing that extension now.

Upstream references: [release](https://github.com/github/spec-kit/releases/tag/v1.1.0)
and [upgrade guide](https://github.com/github/spec-kit/blob/v1.1.0/docs/upgrade.md).
