# Quickstart: Testing Node Merging

**Feature Branch**: `041-node-merging`

## Prerequisites

1.  Open the web app (`apps/web`).
2.  Ensure you have at least 3 nodes in your vault. If not, create them:
    - `Node A`: Description A, Tag #A.
    - `Node B`: Description B, Tag #B.
    - `Node C`: References `[[Node A]]` or `[[Node B]]`.

## Testing Steps

### 1. Manual Merge (Concatenation)

1.  In the Graph or List view, hold `Shift` (or toggle selection mode) and select `Node A` and `Node B`.
2.  Right-click (or use context menu) -> select "Merge Nodes".
3.  In the dialog, verify both nodes are listed.
4.  Choose "Concatenate" (if manual option available) or observe the default AI generation.
5.  If using AI, wait for the suggestion.
6.  Edit the merged content if desired.
7.  Click "Confirm Merge".
8.  **Verify**:
    - `Node A` and `Node B` are gone.
    - Only one node remains (e.g., `Node A` if it was the target).
    - Its content contains text from both original nodes.
    - `Node C` now references the merged node.

### 2. AI-Assisted Merge

1.  Repeat steps 1-3 with new nodes.
2.  Ensure AI service is configured (API Key set).
3.  Select "Merge with AI".
4.  Observe the generated description combining facts.
5.  Confirm.
6.  **Verify**: The result is a coherent summary, not just concatenation.

## Troubleshooting

- **AI Timeout**: If the merge takes too long (> 10s), check network/API limits.
- **Broken Links**: If `Node C` still points to a deleted node, check the console for "Link update failed" warnings.
- **Data Loss**: The original files are deleted. Use `Undo` (if implemented) or check backups if testing critically.
