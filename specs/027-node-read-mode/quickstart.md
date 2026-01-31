# Quickstart: Node Read Mode

**Feature**: Node Read Mode (027)

## Overview

The Node Read Mode provides a distraction-free, read-only view of any entity in your vault. It includes easy navigation to related nodes and a rich-text copy feature.

## Usage

1.  **Open Read Mode**:
    *   Select an entity in the Graph or Search.
    *   In the **Entity Detail Panel** (right sidebar), click the **"Read Mode"** button (book icon) in the header.
2.  **Navigation**:
    *   Inside the modal, click any linked node in the "Connections" section to instantly switch the view to that node.
3.  **Copy Content**:
    *   Click the **"Copy"** button in the modal header.
    *   This copies the rendered content to your clipboard. You can paste it into Google Docs, Word, or other rich-text editors with formatting preserved.
4.  **Close**:
    *   Click the **"X"** button, press `Escape`, or click outside the modal to close it.

## Development

### UI Store

The modal visibility is controlled by the `ui` store.

```typescript
import { ui } from "$lib/stores/ui.svelte";

// Open modal
ui.openReadMode("node-id");

// Close modal
ui.closeReadMode();
```
