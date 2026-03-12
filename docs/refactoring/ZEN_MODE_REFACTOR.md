# Deep Analysis: ZenModeModal.svelte Refactoring Strategy

## Current Responsibilities (The "God File" Symptoms)

`ZenModeModal.svelte` (~1,000 lines) is the primary full-screen interaction layer for entity management. It currently handles:

1.  **Modal Lifecycle**: Visibility state, focus management, and escape-to-close logic.
2.  **View/Edit Mode Toggling**: Managing separate states for reading lore and editing entity metadata.
3.  **Entity State Management**: Local copies of entity fields (`editTitle`, `editContent`, etc.) for buffering changes.
4.  **Tab Management**: Navigation between "Overview", "Inventory", and "Map" views.
5.  **Image Handling**: Image resolution, lightbox triggering, and focus trapping.
6.  **Complex "Copy to Clipboard" Logic**: Manually constructing HTML/Markdown/Plain-text documents, including image-to-canvas processing.
7.  **Interaction logic**: Custom keyboard navigation for scrolling and tab switching.
8.  **CRUD Operations**: Calling `vault.updateEntity` and `vault.deleteEntity`.

---

## 1. Extraction Candidate: Componentization (UI)

### A. `ZenHeader.svelte`

- **Extract**: The category icon, type selector, title input/heading, and the primary action buttons (Copy, Edit, Save, Cancel, Close).
- **Props**: `entity`, `isEditing`, `isSaving`, `callbacks`.
- **Impact**: -150 lines.

### B. `ZenSidebar.svelte`

- **Extract**: The label badges, entity image (with zoom/draw logic), and connection list.
- **Props**: `entity`, `isEditing`, `allConnections`.
- **Impact**: -200 lines.

### C. `ZenContent.svelte`

- **Extract**: The temporal editor/view, and the two Markdown editors (Chronicle and Deep Lore).
- **Props**: `entity`, `isEditing`, `editState`.
- **Impact**: -150 lines.

### D. `ZenImageLightbox.svelte`

- **Extract**: The fixed-position image viewer, backdrop, and focus trap logic.
- **Props**: `show`, `imageUrl`, `title`, `onClose`.
- **Impact**: -100 lines.

---

## 2. Extraction Candidate: Logic (Services & Hooks)

### A. `useZenModeActions.ts` (Svelte Hook)

- **Extract**: `handleDelete`, `saveChanges`, and `handleClose` (with confirmation logic).
- **Goal**: Separate data-modifying logic from the component structure.

### B. `ClipboardService.ts`

- **Extract**: The massive `handleCopy` function.
- **Goal**: This logic is complex (canvas processing, multi-mime-type blobs) and has no dependency on Svelte UI. It should be a standalone utility.
- **Impact**: -100 lines.

### C. `useEditState.ts` (Svelte Hook)

- **Extract**: The buffering of entity data (`editTitle`, `editContent`, etc.) and the `startEditing`/`cancelEditing` resets.
- **Goal**: Use a dedicated state manager for the complex edit buffer.

---

## 3. The "Pure Container" Goal

After refactoring, `ZenModeModal.svelte` should look like this:

```svelte
<script>
  // Logic & State Hooks
  const { entity, activeTab, isEditing } = useZenModeContext();
  const { editBuffer, startEdit, save, cancel } = useEditState(entity);
  const actions = useZenModeActions(entity, { onSave: save, onCancel: cancel });
  const clipboard = new ClipboardService();
</script>

{#if show}
  <div class="zen-container">
    <ZenHeader {entity} {isEditing} onCopy={clipboard.copy} />
    <ZenTabs bind:active={uiStore.zenModeActiveTab} />

    <main>
      {#if activeTab === "overview"}
        <ZenSidebar {entity} {isEditing} />
        <ZenContent {entity} {isEditing} {editBuffer} />
      {:else if activeTab === "map"}
        <DetailMapTab {entity} />
      {/if}
    </main>

    <ZenImageLightbox />
  </div>
{/if}
```

---

## 4. Proposed Phased Plan

### Phase 1: Service Extraction (High Impact)

- Extract `handleCopy` into `ClipboardService.ts`.
- Extract lightbox into `ZenImageLightbox.svelte`.
- _Outcome_: Removes the most "noisy" logic and complex DOM from the bottom of the file.

### Phase 2: State & Action Decoupling

- Move CRUD and confirmation logic to `useZenModeActions`.
- Implement `useEditState` to manage the massive block of `$state` variables.
- _Outcome_: The `<script>` block becomes significantly more readable.

### Phase 3: Layout Decomposition

- Extract `ZenHeader` and `ZenTabs`.
- Extract `ZenSidebar` and `ZenContent`.
- _Outcome_: The main file becomes a structural orchestrator with minimal implementation details.
