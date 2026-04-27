# Research: Approve Draft Entities

## Context

Implementation of draft approval flows for AI-generated entities (Issue #706). Requires adding UI actions to Explorer List, Detail Panel, and Zen Mode header.

## Findings

### Tech Stack Integration

- **Decision**: Use Svelte 5 Runes and existing `vault.updateEntity` / `vault.deleteEntity` methods.
- **Rationale**: Stays consistent with the rest of the Codex-Cryptica application.
- **Alternatives considered**: Calling backend APIs (rejected, app is local-first/client-side).

### Iconography

- **Decision**: Use `icon-[lucide--check]` for approve and `icon-[lucide--trash-2]` for reject.
- **Rationale**: The constitution mandates using the Iconify utility pattern (`class="icon-[lucide--name] h-4 w-4"`) instead of importing `lucide-svelte` components directly.
- **Alternatives considered**: Importing lucide components directly (violates Constitution VI.1).

### Animation and Feedback

- **Decision**: Do not add confirmation dialogs to rejection; make deletion immediate.
- **Rationale**: Directly requested in out-of-scope for the feature spec to speed up batch review.
- **Alternatives considered**: Confirm dialogs (rejected based on spec).
