# ChatMessage Component Analysis

_(Status: DRAFT - May 20, 2026)_

This document analyzes the `apps/web/src/lib/components/oracle/ChatMessage.svelte` component (659 lines), identifying its responsibilities, architectural issues, and proposing a structured refactoring path to improve maintainability and testability.

## Executive Summary

`ChatMessage.svelte` is the primary UI renderer for all interactions within the Oracle sidebar. It has grown into a "God File" because it attempts to handle the rendering, state management, and side-effect coordination for every possible message type and interaction flow.

While some logic has been extracted into helper files (`chat-message.helpers.ts`, `chat-message.actions.ts`), the component itself remains deeply coupled to global stores and relies on massive conditional blocks to route rendering logic.

## Current Responsibility Breakdown

The component currently owns or directly manages:

### 1. Message Type Routing (The Core Monolith)

It uses a large `{#if ...}` tree to render entirely different layouts based on message role and type:

- Wizard Messages (`ConnectionWizard`, `MergeWizard`)
- Image Messages (`ImageMessage`)
- Roll Messages (`RollMessage`)
- Rich Text Messages (Markdown parsing and HTML rendering)

### 2. State & Side Effects

- **HTML Parsing Lifecycle**: Manages an internal `htmlCache` and triggers async markdown parsing via `renderMessageHtml`.
- **Undo Event Listening**: Subscribes to the `appEventBus` to reset UI state (`isSaved = false`) when an undo occurs.
- **Copy to Clipboard**: Manages the transient `isCopied` state and coordinates between the raw markdown and parsed HTML for clipboard actions.
- **Entity Selection State**: Manages `isSelectingEntity` and `selectedEntityId` for autocomplete flows, directly triggering `oracle.updateMessageEntity`.
- **Discovery Proposals (Found Lore)**: Filters, deduplicates, and manages the expansion state of `DiscoveryChip` components.

### 3. Action Toolbars (Smart Apply, Create, etc.)

It renders a complex, context-aware action toolbar at the bottom of messages based on guest policies, message content length, and the availability of target entities. This includes:

- Smart Apply ("UPDATE")
- Create as Node ("CREATE")
- Copy to Chronicle / Lore
- Undo

## The Real Problem

`ChatMessage.svelte` is suffering from **Low Cohesion and High Coupling**.

- **Low Cohesion**: Rendering a dice roll has nothing to do with resolving a markdown chunk into an entity description, yet they live in the same file and share the same reactive scopes.
- **High Coupling**: The file is tightly bound to `vault`, `oracle`, `graph`, and multiple external services (`clipboardService`, `parserService`, `appEventBus`).

This makes the component incredibly fragile. Changing the layout of a "Found Lore" chip risks breaking the async markdown parser or the undo event listener.

## Proposed Way Forward

We must transition `ChatMessage.svelte` from a monolithic renderer into a **polymorphic composer**.

### Phase 1: Extract Controller Logic

Before splitting the markup, we need to extract the complex state management into a testable controller class, similar to `GraphViewController`.

1. Create `apps/web/src/lib/components/oracle/chat-message-controller.svelte.ts`.
2. Move the `htmlCache` logic, `copyToClipboard` flow, undo event subscription, and discovery proposal deduplication into this controller.
3. Inject dependencies (`oracle`, `vault`, `parserService`, `clipboardService`) via the constructor (Constitution Principle VIII).

### Phase 2: Decompose the Router into Specialized Renderers

Break the massive `{#if ...}` block into distinct, self-contained Svelte components that accept the `message` object and a controller instance as props.

1. **`SystemMessageRenderer.svelte`**: For wizards and system notices.
2. **`MediaMessageRenderer.svelte`**: For images and dice rolls.
3. **`ContentMessageRenderer.svelte`**: For standard rich-text AI/User messages.
4. **`MessageToolbar.svelte`**: Extract the bottom action buttons (Smart Apply, Create, Chronicle) and the Autocomplete logic into a dedicated component.

### Phase 3: Polymorphic Composition

Refactor the main `ChatMessage.svelte` to simply be the outer shell (the colored bubble and alignment) that delegates to the appropriate inner renderer based on the message type.

## Target End State

**`ChatMessage.svelte` (Target: <= 150 lines)**

- Responsible _only_ for the outer styling (bubble colors, alignment based on `role`).
- Instantiates the `ChatMessageController`.
- Uses a `{#switch}` or clean `{#if}` block to delegate rendering to specific sub-components (`SystemMessageRenderer`, `ContentMessageRenderer`, etc.).

**`chat-message-controller.svelte.ts`**

- Fully unit-tested (Constitution Principle II & X).
- Handles all asynchronous parsing, clipboard management, and undo listeners without touching the DOM directly.

## Conclusion

This decomposition aligns perfectly with the recent graph surface refactor and the `Codex-Arcana Constitution`. It will make the Oracle UI significantly easier to maintain, style, and extend with new message types in the future.
