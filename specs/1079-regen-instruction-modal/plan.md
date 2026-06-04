# Implementation Plan: Regen Instruction Modal

**Branch**: `1079-regen-instruction-modal` | **Date**: 2026-06-01 | **Spec**: [spec.md](file:///home/espen/proj/Codex-Cryptica-v2/specs/1079-regen-instruction-modal/spec.md)
**Input**: Feature specification from `/specs/1079-regen-instruction-modal/spec.md`

## Summary

We will add a modal dialog that prompts the user for optional high-priority instructions or corrections when they click a regeneration button in the entity panel or Zen Mode. These instructions will be passed through the regeneration service, the action manager, the regenerate executor, and finally injected into the LLM prompt.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes  
**Primary Dependencies**: Tailwind 4, Lucide Iconify  
**Storage**: Transient (in-memory state in stores)  
**Testing**: Vitest  
**Target Platform**: Browser  
**Project Type**: SvelteKit Web App + Workspace Packages  
**Performance Goals**: Modal load time < 50ms  
**Constraints**: App Chrome style (must use neutral `--color-chrome-*` design elements, no world/campaign-themed styles)

## Constitution Check

- **Library-First**: UI components should be clean and decoupled from business logic.
- **Dependency Injection**: Use existing stores and services.
- **Style Guide**: Ensure the modal uses app chrome styling (since it is a utility dialog in the chrome) and uses the Iconify pattern for icons.

## Proposed Changes

### 1. Store Updates

- **File**: `apps/web/src/lib/stores/ui/modal-ui.svelte.ts`
  - Add state field:
    ```ts
    regenDialog = $state<{
      open: boolean;
      entityId: string | null;
      instructions: string;
    }>({
      open: false,
      entityId: null,
      instructions: "",
    });
    ```
  - Add methods:
    ```ts
    openRegenDialog(entityId: string) {
      this.regenDialog = { open: true, entityId, instructions: "" };
    }
    closeRegenDialog() {
      this.regenDialog = { open: false, entityId: null, instructions: "" };
    }
    ```
  - Update `get isAnyModalOpen()` getter to include `this.regenDialog.open`.

### 2. UI Component

- **File**: `apps/web/src/lib/components/modals/RegenInstructionModal.svelte`
  - Create a modal using Svelte 5 runes.
  - Implement full-screen backdrop, central panel using neutral app chrome styles (`bg-chrome-surface`, `border-chrome-border`, etc.).
  - Textarea binding to `modalUIStore.regenDialog.instructions`.
  - Focus the textarea on mount.
  - Keyboard handlers: `Escape` closes the modal; `Ctrl+Enter` or `Cmd+Enter` triggers the action.
  - Clicking "Generate" calls `regenerationService.regenerate(entityId, instructions)` and closes the modal.

### 3. Mount in Provider

- **File**: `apps/web/src/lib/components/modals/GlobalModalProvider.svelte`
  - Render `RegenInstructionModal` conditionally when `modalUIStore.regenDialog.open` is true.

### 4. Service and Store Integration

- **File**: `apps/web/src/lib/services/RegenerationService.svelte.ts`
  - Update `regenerate(entityId: string, instructions?: string)` to accept `instructions`.
  - Pass it to `oracle.regenerate(entityId, callback, instructions)`.
- **File**: `apps/web/src/lib/stores/oracle/action-manager.svelte.ts`
  - Update `regenerate(entityId: string, onPartial?: (partial: string) => void, instructions?: string)` to accept `instructions`.
  - Pass it to `this.store.executor.execute({ type: "regenerate", entityId, instructions }, ...)`.
- **File**: `packages/oracle-engine/src/types.ts`
  - Add optional `instructions?: string` to `OracleIntent` interface.
- **File**: `packages/oracle-engine/src/executors/regenerate-executor.ts`
  - Pass `intent.instructions` to `generator.generateRegenerationResponse(entityId, context, handlePartial, intent.instructions)`.
- **File**: `packages/oracle-engine/src/oracle-generator.ts`
  - Update `generateRegenerationResponse` to accept `instructions?: string` and pass to `buildRegenerationPrompt`.
  - Update `buildRegenerationPrompt` to append the instructions:
    ```
    USER DIRECTIVE (HIGHEST PRIORITY): <instructions>
    ```

### 5. Trigger Buttons

- **Files**:
  - `apps/web/src/lib/components/entity/SidepanelRegenButton.svelte`
  - `apps/web/src/lib/components/entity/ZenModeRegenAction.svelte`
  - `apps/web/src/lib/components/canvas/CanvasContextMenu.svelte`
  - `apps/web/src/lib/components/graph/graph-context-menu-controller.svelte.ts`
  - Modify their click handlers to open the dialog (`modalUIStore.openRegenDialog(...)`) instead of calling the regeneration service directly.
