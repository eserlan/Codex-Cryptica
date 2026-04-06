# Tasks: Rich Text Formatting Controls

**Feature**: Rich Text Formatting Controls (030-rich-text-formatting)
**Status**: Draft

## Phase 1: Setup

- [x] T001 Install Tiptap bubble menu extension if not present (`npm install @tiptap/extension-bubble-menu`)
- [x] T002 ~~Install Tiptap floating menu extension if not present (`npm install @tiptap/extension-floating-menu`)~~ (Not required for current scope)
- [x] T003 Install Tiptap Link extension if not present (`npm install @tiptap/extension-link`)

## Phase 2: Foundational Components

- [x] T004 [P] Create `apps/web/src/lib/components/editor/icons/` directory and add Lucide icon wrappers if needed (or verify usage of existing `icon-[...]` classes)
- [x] T005 [P] Create `apps/web/src/lib/components/editor/EditorToolbar.svelte` with basic layout and props (accepts `editor` instance)
- [x] T006 [P] Create `apps/web/src/lib/components/editor/EditorBubbleMenu.svelte` with basic layout and props (accepts `editor` instance)

## Phase 3: User Story 1 - Apply Formatting in Detail Panel

**Goal**: As an editor, I want to format my text (bold, italic, lists) using visible controls in the Detail Panel.

- [x] T007 [US1] Update `apps/web/src/lib/components/MarkdownEditor.svelte` to import and initialize required Tiptap extensions (Link, BubbleMenu)
- [x] T008 [P] [US1] Implement "Bold", "Italic", "Strike", "Code" buttons in `EditorToolbar.svelte` with active state highlighting
- [x] T009 [P] [US1] Implement Heading buttons (H1, H2, H3) in `EditorToolbar.svelte`
- [x] T010 [P] [US1] Implement List buttons (Bullet, Ordered) and Blockquote button in `EditorToolbar.svelte`
- [x] T011 [US1] Integrate `EditorToolbar` into `MarkdownEditor.svelte`, placing it above the editor content area
- [x] T012 [US1] Implement `EditorBubbleMenu.svelte` with core formatting options (Bold, Italic, Link) for text selection
- [x] T013 [US1] Add Link handling UI (simple prompt or popover) when Link button is clicked in toolbar or bubble menu

## Phase 4: User Story 2 - Apply Formatting in Zen Mode

**Goal**: As an editor, I want formatting controls available in Zen Mode (distraction-free writing).

- [x] T014 [US2] Add "Zen Mode" toggle button to `EditorToolbar.svelte` (expand icon)
- [x] T015 [US2] Implement Zen Mode state in `MarkdownEditor.svelte` (toggle class `fixed inset-0 z-50` on container)
- [x] T016 [US2] Ensure `EditorToolbar` styles adapt to Zen Mode (e.g., sticking to top of viewport)
- [x] T017 [US2] Add "Exit Zen Mode" button to `EditorToolbar` (compress icon) visible only in Zen Mode
- [x] T018 [US2] Handle `Esc` key to exit Zen Mode (implemented in `EditorToolbar.svelte`)

## Phase 5: User Story 3 - Keyboard Shortcuts

**Goal**: As a power user, I want standard keyboard shortcuts to work alongside visual controls.

- [x] T019 [US3] Verify standard Tiptap shortcuts (Cmd+B, Cmd+I, etc.) are working (usually default in StarterKit)
- [x] T020 [US3] Add keyboard shortcut for toggling Zen Mode (`Cmd+Shift+F` and `Esc`) in `EditorToolbar.svelte`

## Phase 6: Polish & Verification

- [x] T021 Ensure toolbar icons match project's cyberpunk aesthetic (green/black/terminal style)
- [x] T022 Verify mobile responsiveness of the toolbar (wrap or scroll)
- [x] T023 Manual Test: Check interaction between Detail Panel closing and Zen Mode (should exit Zen Mode or prevent closing)
- [x] T024 Create Playwright E2E test `tests/rich-text.spec.ts` verifying toolbar buttons apply correct Markdown syntax
- [x] T025 [P] Verify Offline Functionality: Ensure toolbar works without network and changes persist to OPFS
- [x] T026 Verify focus returns to editor after clicking toolbar buttons (FR-007)

## Dependencies

- Phase 2 depends on Phase 1
- Phase 3 depends on Phase 2
- Phase 4 depends on Phase 3 (extends the toolbar created in US1)
- Phase 5 can be done in parallel with 3 or 4

## Implementation Strategy

1.  **MVP**: Implement the fixed toolbar in the Detail Panel first (US1). This delivers the core value of "rich text controls".
2.  **Enhancement**: Add the Zen Mode overlay (US2) leveraging the existing editor and toolbar components.
3.  **Refinement**: Verify and add shortcuts (US3).
