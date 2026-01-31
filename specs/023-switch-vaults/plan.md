# Implementation Plan: Vault Detachment and Switching

**Branch**: `023-switch-vaults` | **Date**: 2026-01-30 | **Spec**: [/specs/023-switch-vaults/spec.md](./spec.md)

## Summary
Implement an explicit "Close Vault" mechanism that wipes all sensitive campaign data from the application's memory and persistent storage. This enables users to switch between multiple campaign directories without requiring a full page reload or risk of data bleed.

## Technical Context
- **Language/Version**: TypeScript 5.x / Node.js 20+
- **Frontend**: Svelte 5 (UI Framework)
- **State Management**: Svelte Stores (`VaultStore`)
- **Search Engine**: FlexSearch (SearchService)
- **Sync Engine**: WorkerBridge (Web Workers)
- **Persistence**: File System Access API + IndexedDB

## Constitution Check
1. **Local-First Sovereignty**: PASSED.
2. **Relational-First Navigation**: PASSED.
3. **Sub-100ms Performance Mandate**: PASSED.
4. **Atomic Worldbuilding**: PASSED.
5. **System-Agnostic Core**: PASSED.
6. **Pure Functional Core**: PASSED.
7. **Verifiable Reality**: PASSED.
8. **Test-First PWA Integrity**: PASSED.

## Phase 0: Outline & Research
- [x] Research termination of File System Access API handlers. (Result: Removal from IDB is sufficient to prevent auto-reauthorization).
- [x] Research disposing of Google Drive sync workers. (Result: `WorkerBridge.destroy()` handles termination).
- [x] Consolidate findings in `research.md`.

## Phase 1: Design & Contracts
- [x] Define state transition model in `data-model.md`.
- [x] Create `VaultStore.close()` method contract in `contracts/vault-store.md`.
- [x] Update agent context (`GEMINI.md`).

## Phase 2: Implementation Tasks
*(Handed off to speckit.tasks)*