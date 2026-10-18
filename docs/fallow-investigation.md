# Fallow Codebase Intelligence & PR Audit Investigation (PoC)

**Issue**: [#3167](https://github.com/eserlan/Codex-Cryptica/issues/3167)  
**Date**: September 2026  
**Status**: PoC Implemented & Evaluated  
**Tool**: [Fallow](https://github.com/fallow-rs/fallow) v3.27.0

---

## Executive Summary

Fallow was evaluated as a deterministic codebase-intelligence and static-analysis layer for Codex-Cryptica. The primary goals were to determine whether Fallow can:

1. Provide fast, deterministic dependency-graph and reachability queries for coding agents (via CLI and MCP).
2. Serve as a reliable, fast PR-level audit that catches regressions without false-positive blocking on pre-existing technical debt.
3. Enforce architecture boundaries (e.g., preventing public generator landing pages from coupling to Vault internals, keeping shared packages independent of web application code).
4. Detect actionable circular dependencies, dead code, duplication, and complexity hotspots with high signal-to-noise ratio.

### Key Takeaways

- **Performance**: Full whole-repository analysis across 2,894 files and 34,532 functions runs in **~2.5 to 5.2 seconds**. Incremental PR audit runs in **< 1.0 second**.
- **Agent Value**: Reachability queries (`fallow trace --path <from> <to>`) and symbol inspection (`fallow inspect --file <path>`) execute in **0.4 to 0.5 seconds**, giving agents instant blast-radius awareness without needing ad-hoc grep pipelines.
- **PR Safety (`gate: new-only`)**: Fallow's base-snapshot attribution accurately isolates newly introduced issues from historical debt, allowing PR audits to run with 0 false-alarm blocks on existing issues.
- **Architecture Boundaries**: Declarative boundary rules in `.fallowrc.json` immediately flag forbidden cross-zone imports (e.g. `packages/` importing from `apps/`, public generators importing runtime `vault` stores).
- **Zero Runtime Disruption**: Adding Fallow as a devDependency adds zero runtime dependencies or client bundle overhead.

---

## 1. Toolchain & Configuration Setup

### 1.1 Dependency & Binaries

- Added `fallow: "^3.27.0"` to root `devDependencies`.
- Binaries provided by the package:
  - `fallow` (CLI analysis and audit engine)
  - `fallow-mcp` (Model Context Protocol stdio server)
  - `fallow-lsp` (Language Server Protocol)

### 1.2 Monorepo Configuration (`.fallowrc.json`)

A clean root configuration was authored:

- Configures 31 monorepo workspace packages (`apps/*`, `apps/workers/*`, `packages/*`).
- Establishes canonical entry points across SvelteKit routes, workers, and package libraries.
- Sets PR audit mode to `"gate": "new-only"`.
- Declares initial architectural zones and access rules.

### 1.3 NPM Scripts

Added standard convenience commands to root `package.json`:

- `bun run fallow:doctor`: Validates project readiness and configuration integrity.
- `bun run fallow:audit`: Runs incremental audit against `origin/staging`.
- `bun run fallow:review`: Renders an advisory review brief of changed code.
- `bun run fallow:summary`: Runs whole-repo summary across dead code, duplication, and complexity.

---

## 2. Architecture Boundaries Evaluation

Fallow provides first-class architecture boundary enforcement via `.fallowrc.json` `boundaries.zones` and `boundaries.rules`. Six initial architectural zones were codified:

```json
{
  "boundaries": {
    "zones": [
      { "name": "schema", "patterns": ["packages/schema/**"] },
      {
        "name": "packages",
        "patterns": ["packages/**", "!packages/schema/**"]
      },
      { "name": "workers", "patterns": ["apps/workers/**"] },
      {
        "name": "public-generators",
        "patterns": [
          "apps/web/src/routes/(marketing)/generators/**",
          "apps/web/src/lib/content/generators/**"
        ]
      },
      {
        "name": "vault-internals",
        "patterns": [
          "apps/web/src/lib/stores/vault/**",
          "apps/web/src/lib/stores/vault.svelte.ts"
        ]
      },
      { "name": "web-app", "patterns": ["apps/web/**"] }
    ],
    "rules": [
      { "from": "schema", "allow": [] },
      { "from": "packages", "allow": ["schema", "packages"] },
      { "from": "workers", "allow": ["schema"] },
      {
        "from": "public-generators",
        "allow": ["web-app", "packages", "schema"],
        "allowTypeOnly": ["vault-internals"]
      }
    ]
  }
}
```

### Verification & Behavior

- `fallow guard <path>` instantly returns the active zone, permitted target zones, and violation severities.
- A public marketing generator that attempts to import runtime singletons from `apps/web/src/lib/stores/vault.svelte.ts` is blocked with a `boundary-violation` error, while TypeScript type imports remain permitted via `allowTypeOnly`.
- Standalone packages in `packages/*` are prevented from accidentally importing application code from `apps/web`.

---

## 3. Agent & MCP Integration

### 3.1 Coding Agent Workflow

- **Task Map**: Added standard Fallow task map block to `AGENTS.md` and created matching skill in `.agent/skills/fallow/` and `.agents/skills/fallow/`.
- **Pre-flight Guidance**: Before making changes, agents can run:
  - `fallow trace --path <from> <to>`: Verify whether a module reaches another, and in how many hops.
  - `fallow inspect --file <path>`: View fan-in (`imported_by_count`), fan-out, dead-code status, and complexity of a target file.
  - `fallow guard <path>`: Confirm architectural permissions before adding new imports.
  - `fallow audit`: Check changed-file risk before committing.

### 3.2 MCP Server (`fallow-mcp`)

- Configured `.codex/config.toml` with `[mcp_servers.fallow]`. A local `.mcp.json` is not
  committed because the repository ignores that file.
- Exposes 24 specialized tools:
  - `trace_import_path`: Hop-by-hop resolution.
  - `inspect_target`: Unified evidence bundle (complexity, duplication, dead code, imports).
  - `guard`: Architectural boundary checks.
  - `audit`: Combined PR-level risk analysis.
  - `code_execute`: Sandboxed read-only composition of multiple graph queries.

---

## 4. Benchmark Analysis Across Common Codex Areas

| Area                        | Representative Path                               | Fan-In / Importers | Observed Architecture / Characteristics                                                                                                               |
| :-------------------------- | :------------------------------------------------ | :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vault Core**              | `apps/web/src/lib/stores/vault.svelte.ts`         | 287 files          | Critical core singleton; high fan-in, cooling churn. Multiple circular cycles identified with `vault/family-mutations.ts` and `oracle.svelte.ts`.     |
| **Generators Engine**       | `packages/generator-engine`                       | 14 files           | High cohesion, isolated domain logic. Internal cycle detected between `campaign-council-vote-generation.ts` and `campaign-generator-service.ts`.      |
| **Public Generators**       | `apps/web/src/routes/(marketing)/generators`      | 0 (entry points)   | Cleanly isolated from Vault runtime internals. Reaches `generator-engine` and `random-source-engine`.                                                 |
| **Session Hub**             | `apps/web/src/lib/stores/session-hub.svelte.ts`   | 6 files            | Clean unidirectional flow; handles ephemeral handoff without coupling back to core app layouts.                                                       |
| **Entity Explorer / Graph** | `apps/web/src/lib/stores/graph.svelte.ts`         | 19 files           | Moderate fan-in. Circular dependency identified in `packages/graph-engine/src/LayoutManager.ts` importing from its own package barrel `index.ts`.     |
| **Presentation Renderer**   | `apps/web/src/lib/components/stats/presentation/` | 7 files            | Refactoring target: `PresentationRenderer.svelte` participates in a tight cycle with its node components (`BlockquoteNode`, `CardNode`, `GroupNode`). |

---

## 5. Signal vs. Noise Assessment

A baseline whole-repo analysis identified the following categories:

| Category                  |     Finding Count | Signal Assessment                 | Noise / Actionability                                                                                                                                                                                                 |
| :------------------------ | ----------------: | :-------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Circular Dependencies** |         31 cycles | **High Signal (100% actionable)** | All 31 detected cycles are real, concrete module cycles (e.g. `oracle` ↔ `proposer`, `vault` ↔ `lifecycle`, barrel `index.ts` cycles). These are prime causes of runtime Svelte runes initialization ordering issues. |
| **Unused Dependencies**   |    9 dependencies | **High Signal**                   | Correctly identified dependencies listed in `package.json` that are never imported (e.g. unused capacitor plugins, `markdown-it-task-lists`, or misplaced workspace dependencies).                                    |
| **Unused Files**          |          39 files | **High Signal**                   | Identified orphan scratch scripts (`test-purify.js`, `verify-init.mjs`) and obsolete, unreferenced settings components in `apps/web/src/lib/components/settings/`.                                                    |
| **Duplication**           | 4.8% (409 groups) | **Medium-High Signal**            | Accurately flagged large copy-paste blocks between `ZenContent.svelte` and `ZenSidebar.svelte` (181 lines), and repeated form fields across generator components.                                                     |
| **Complexity Hotspots**   |     862 functions | **Medium Signal**                 | High cyclomatic/cognitive complexity flagged on long test files and large template blocks (`SEOGeneratorLayout.svelte`). Useful for ranking refactoring candidates via quick-win ROI (`fallow health --targets`).     |

---

## 6. PR Audit Evaluation (`fallow audit`)

### Performance

- Local CLI execution: **2.5 to 5.2 seconds** for full git-diff attribution against `origin/staging`.
- On clean changes: **0.05 seconds**.

### Non-Blocking CI Integration

- Created `.github/workflows/fallow-audit.yml`.
- Runs on every pull request targeting `staging` or `main`.
- Set to `continue-on-error: true` for the initial PoC evaluation phase.
- Emits both GitHub PR annotations (`--format github-annotations`) and rich Step Summaries (`--format github-summary`).

---

## 7. Next Steps & Recommendations

1. **Keep Fallow in Toolchain**: The CLI, configuration, and task map provide immediate value to coding agents and developers.
2. **Observe Non-Blocking PR Audits**: Monitor the `fallow-audit` CI workflow across the next 10 PRs to observe performance in GitHub Actions and check for unexpected false positives.
3. **Targeted Cycle Cleanup**: Use `fallow dead-code --circular-deps` to eliminate the 31 known module cycles during routine feature work, starting with package barrel import loops.
4. **Refine Architecture Boundaries**: As new features land (such as standalone generators or solo adventure modules), expand `.fallowrc.json` rules to enforce clean layering.
