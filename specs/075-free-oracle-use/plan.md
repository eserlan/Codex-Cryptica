# Implementation Plan: Free Oracle Use

**Branch**: `075-free-oracle-use` | **Date**: 2026-03-20 | **Spec**: [specs/075-free-oracle-use/spec.md](specs/075-free-oracle-use/spec.md)
**Input**: Feature specification from `/specs/075-free-oracle-use/spec.md`

## Summary

Implement a dual-path fetch service for the Lore Oracle that allows immediate "Free for now" access to Advanced Tier capabilities via a system proxy, while maintaining a "Custom API Key" option for users who provide their own API keys.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Svelte 5 (Runes)
**Primary Dependencies**: SvelteKit, `@google/generative-ai`, Dexie 4.x
**Storage**: Dexie (`appSettings` table)
**Testing**: Vitest, Playwright
**Target Platform**: Web + Cloudflare Worker
**Project Type**: Web Application
**Performance Goals**: <200ms overhead for proxy calls
**Constraints**: System API key MUST remain hidden from client.

## Constitution Check

| Principle            | Check                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| Library-First        | Logic integrated into `packages/oracle-engine`.                       |
| TDD                  | Unit tests for dual-path logic and E2E for UI status.                 |
| Simplicity & YAGNI   | Removed credit tracking as requested; focused on simple proxy switch. |
| AI-First Extraction  | Advanced model used by default for better extraction.                 |
| Privacy              | Custom API Key mode ensures data sovereignty for power users.         |
| Clean Implementation | Svelte 5 Runes for status tracking.                                   |
| User Documentation   | Status badges clarify connection type + help content updates.         |
| Dependency Injection | Services remain mockable for testing.                                 |
| Quality & Coverage   | Target 70% coverage for new logic.                                    |

## Project Structure

### Documentation

```text
specs/075-free-oracle-use/
├── spec.md              # Feature Spec
├── plan.md              # This file
├── research.md          # Research findings
├── data-model.md        # State definitions
└── quickstart.md        # Testing instructions
```

### Source Code

```text
packages/oracle-engine/src/
├── oracle-settings.svelte.ts   # Update effectiveApiKey and tier logic
├── oracle-executor.ts          # Support for status reporting
└── types.ts                    # NEW: ConnectionMode type definition

apps/web/src/lib/services/ai/
├── text-generation.service.ts  # Implement proxy switch
├── image-generation.service.ts # Implement proxy switch
└── client-manager.ts           # NEW: Manage dual-path connection logic

apps/web/src/lib/components/oracle/
└── OracleStatus.svelte         # NEW component for connection status

apps/workers/oracle-proxy/
└── src/
    ├── index.ts          # NEW: Cloudflare Worker entry point
    └── index.test.ts     # NEW: Worker tests
```

**Structure Decision**: Integrated into existing `oracle-engine` package and `web` AI services to ensure architectural consistency.

## Complexity Tracking

No violations.
