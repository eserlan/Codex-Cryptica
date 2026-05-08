# Quickstart: Adjustable Sidebars

## Overview

This feature allows users to dynamically resize the left and right sidebars to suit their workspace needs. The widths are automatically saved to `localStorage` and restored across sessions.

## Testing the Resizers

### Left Sidebar

1. Open the application.
2. Hover over the right edge of the **Left Sidebar** (Entity Explorer / Tools).
3. Verify the cursor changes to a horizontal resize icon (`col-resize`).
4. Click and drag left or right.
5. Verify the sidebar stops shrinking at the minimum width (~240px).
6. Verify the sidebar stops expanding at the maximum width (e.g., 40% of the screen width).

### Right Sidebar

1. Select an entity to open the **Right Sidebar** (Entity Detail Panel).
2. Hover over the left edge of the sidebar.
3. Verify the cursor changes.
4. Click and drag left or right.
5. Verify the sidebar stops shrinking at its minimum width (~320px).
6. Verify the sidebar stops expanding at its maximum width.

### Persistence

1. Resize both sidebars to noticeably different widths than default.
2. Refresh the browser page.
3. Verify that both sidebars restore to the exact widths you set before refreshing.
4. Collapse the left sidebar (e.g., by clicking the active tool icon).
5. Expand it again. Verify it returns to your custom width.
