# Quickstart: Using Fuzzy Search

## Overview
The Fuzzy Search feature provides a global command palette (Cmd+K) to search note titles and content. It uses `FlexSearch` running in a Web Worker to ensure UI responsiveness.

## Usage (Developer)

### 1. Indexing Content
The `SearchService` (wrapper around the worker) needs to be fed data.
Typically, this happens when the `Vault` initializes or files change.

```typescript
import { searchService } from '$lib/services/search';

// On file save
await searchService.index({
  id: 'note-123',
  title: 'My Note',
  content: '# Hello World...',
  path: '/My Note.md',
  updatedAt: Date.now()
});
```

### 2. Performing a Search

```typescript
import { searchService } from '$lib/services/search';

const results = await searchService.search('hello');
console.log(results);
// [
//   { id: 'note-123', title: 'My Note', matchType: 'content', ... }
// ]
```

### 3. UI Component
The `SearchModal.svelte` component handles the UI. It listens for the global hotkey.

## Architecture

```mermaid
graph TD
    UI[SearchModal (Main Thread)] -->|Message| Bridge[WorkerBridge]
    Bridge -->|postMessage| Worker[Search Worker]
    Worker -->|FlexSearch| Index[FlexSearch Index]
```
