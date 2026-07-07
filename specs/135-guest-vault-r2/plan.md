# Implementation Plan: Published Guest Vault Snapshots via Cloudflare R2

**Branch**: `135-guest-vault-r2` | **Date**: 2026-06-22 | **Spec**: [spec.md](file:///home/espen/proj/Codex-Cryptica-v2/specs/135-guest-vault-r2/spec.md)
**Input**: Feature specification from `specs/135-guest-vault-r2/spec.md`

## Summary

Implement a secure, opt-in publishing flow that lets vault hosts export a sanitized, player-safe read-only snapshot of their local campaign lore to Cloudflare R2 via the Cloudflare Worker proxy, keeping their active authoring database local-first and player secrets safe. Support background service uploads, orphan asset cleanup, host dashboard controls, and guest history navigation.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: Cloudflare Worker runtime (wrangler), FlexSearch, Svelte 5, Lucide-iconify utility  
**Storage**: Cloudflare R2 bucket (`codex-cryptica-statics`) for hosted files, IndexedDB (`PublishRegistry`) for local host settings, `localStorage` (`GuestHistory`) for guest browser history  
**Testing**: Vitest (`bun run test`) for unit/integration tests, Playwright (`bun run test:e2e`) for UI validation  
**Target Platform**: WASM / Modern Browser, Cloudflare Workers  
**Project Type**: Web Application + Serverless Worker Proxy  
**Performance Goals**: Exporter compiles 500 entities in <2 seconds. Worker handles R2 requests in <100ms. Guest shell loads in <2s on mobile.  
**Constraints**: Zero-database architecture (Worker relies strictly on R2 object `customMetadata` for token authorization). Client-side filtration must be physically absolute (no GM secrets uploaded).

## Constitution Check

| Principle                 | Status | Direct Application in Design                                                                                                                                                                                                      |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Library-First**      | Passed | Sanitization and guest bundle compilation logic will be placed in a new class inside `packages/vault-engine/src/services/GuestExporter.ts` rather than bloating the Svelte UI.                                                    |
| **II. TDD**               | Passed | We will write comprehensive unit tests for `GuestExporter` verifying that GM-only entities, private notes, and dangling relationships are properly excluded. We will also mock R2 responses and test the Worker's route handlers. |
| **V. Privacy**            | Passed | 100% client-side filtration: secrets are physically deleted from the export object in the user's browser before the network request is initiated.                                                                                 |
| **VIII. DI**              | Passed | The client-side publishing service `PublishingService` will use constructor-based dependency injection to allow mocking fetch and IndexedDB registry stores during unit tests.                                                    |
| **XII. Labels over Tags** | Passed | Exporter schema explicitly groups, manages, and outputs metadata as `labels` to prevent user-facing confusion.                                                                                                                    |

## Project Structure

### Documentation (this feature)

```text
specs/135-guest-vault-r2/
├── plan.md              # This file
├── research.md          # Research findings
├── data-model.md        # Storage layouts and schemas
├── quickstart.md        # Setup and verification guide
├── contracts/
│   └── api.yaml         # OpenAPI API contract
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code Layout

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   └── settings/
│   │       └── PublishingSettings.svelte   # Central host publishing settings page
│   ├── services/
│   │   └── publishing/
│   │       └── PublishingService.svelte.ts # Handles registry, background tasks, API calls
│   └── stores/
│       └── guest-vault.svelte.ts           # Svelte store representing fetched guest vault
└── routes/(app)/
    └── guest/
        └── [publishId]/
            ├── +page.svelte                 # Guest viewer container (SPA router fallback)
            └── +page.ts                     # Pre-fetches bundle on route loading

apps/workers/oracle-proxy/
├── wrangler.toml                            # Cloudflare Worker configuration (add R2 binding)
└── src/
    ├── index.ts                             # Extends routing multiplexer to support GET/DELETE/POST for R2
    └── publish.ts                           # R2 publisher logic (PUT, GET, DELETE, manifest retrieval)

packages/vault-engine/src/
└── services/
    ├── GuestExporter.ts                     # Sanitizes entities, relationships, active theme, [Redacted] dangling links
    └── GuestExporter.test.ts                # Tests exclusion and sanitation rules
```

**Structure Decision**:
We extend `apps/workers/oracle-proxy` with an R2 binding to serve as our unified serverless backend. Client-side compilation is isolated inside `packages/vault-engine` to maintain the **Library-First** principle, while UI elements are integrated cleanly into SvelteKit routes. Background tasks use async Web Worker or asynchronous loop queues on the client to allow closing the window or using the app during upload.
